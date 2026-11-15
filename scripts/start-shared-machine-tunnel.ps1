[CmdletBinding()]
param(
  [ValidateRange(1024,65535)]
  [int]$Port = 3000,

  [ValidatePattern('^[A-Za-z0-9_-]{1,64}$')]
  [string]$Machine = 'public-01',

  [switch]$NoBrowser,
  [switch]$NoDownload,

  [string[]]$AllowedEmail = @()
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent $PSScriptRoot
$Runtime = Join-Path $Root '.runtime'
$Tools = Join-Path $Root '.tools'
$ServerOut = Join-Path $Runtime 'shared-server.out.log'
$ServerErr = Join-Path $Runtime 'shared-server.err.log'
$TunnelOut = Join-Path $Runtime 'cloudflared.out.log'
$TunnelErr = Join-Path $Runtime 'cloudflared.err.log'
$PublicUrlFile = Join-Path $Runtime 'shared-url.txt'
$DataFile = Join-Path $Runtime 'shared-machine.json'

New-Item -ItemType Directory -Force -Path $Runtime,$Tools | Out-Null
Set-Location $Root

function Write-Step([string]$Text) {
  Write-Host "[SWEETS LINK] $Text" -ForegroundColor Cyan
}

function Read-Log([string]$Path) {
  if (Test-Path $Path) {
    return Get-Content -Raw -LiteralPath $Path -ErrorAction SilentlyContinue
  }
  return ''
}

function Stop-Child($Process) {
  if ($null -eq $Process) { return }
  try {
    if (-not $Process.HasExited) {
      Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
      $Process.WaitForExit(3000) | Out-Null
    }
  } catch {}
}

function Find-Command([string[]]$Names) {
  foreach ($Name in $Names) {
    $Command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -ne $Command) { return $Command.Source }
  }
  return $null
}

$ServerProcess = $null
$TunnelProcess = $null

try {
  Write-Step 'Checking Node.js'
  $Node = Find-Command @('node.exe','node')
  $Npm = Find-Command @('npm.cmd','npm')
  if (-not $Node -or -not $Npm) {
    throw 'Node.js 20 or newer is required. Install the LTS release from https://nodejs.org/ and run this launcher again.'
  }

  $NodeVersion = (& $Node --version).Trim()
  $Major = 0
  if ($NodeVersion -match '^v(\d+)') { $Major = [int]$Matches[1] }
  if ($Major -lt 20) {
    throw "Node.js 20 or newer is required. Current version: $NodeVersion"
  }
  Write-Step "Node.js $NodeVersion"

  if (-not (Test-Path (Join-Path $Root 'node_modules\ws\package.json'))) {
    Write-Step 'First setup: installing WebSocket dependency'
    & $Npm install --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
  }

  $Cloudflared = Find-Command @('cloudflared.exe','cloudflared')
  if (-not $Cloudflared) {
    $Cloudflared = Join-Path $Tools 'cloudflared.exe'
    if (-not (Test-Path $Cloudflared)) {
      if ($NoDownload) {
        throw 'cloudflared was not found. Remove -NoDownload or add cloudflared to PATH.'
      }
      Write-Step 'First setup: downloading official Cloudflare cloudflared'
      $Download = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
      $Temporary = "$Cloudflared.download"
      Remove-Item -Force -ErrorAction SilentlyContinue $Temporary
      Invoke-WebRequest -UseBasicParsing -Uri $Download -OutFile $Temporary
      Move-Item -Force $Temporary $Cloudflared
    }
  }

  $CloudflaredVersion = (& $Cloudflared --version 2>&1 | Select-Object -First 1)
  Write-Step "cloudflared: $CloudflaredVersion"

  foreach ($Log in @($ServerOut,$ServerErr,$TunnelOut,$TunnelErr)) {
    Remove-Item -Force -ErrorAction SilentlyContinue $Log
  }

  Write-Step "Starting shared server (port $Port)"
  $OldPort = $env:PORT
  $OldData = $env:SWEETS_DATA_FILE
  $env:PORT = [string]$Port
  $env:SWEETS_DATA_FILE = $DataFile
  try {
    $ServerProcess = Start-Process -FilePath $Node -ArgumentList @('server.mjs') -WorkingDirectory $Root -PassThru -NoNewWindow -RedirectStandardOutput $ServerOut -RedirectStandardError $ServerErr
  } finally {
    $env:PORT = $OldPort
    $env:SWEETS_DATA_FILE = $OldData
  }

  $HealthUrl = "http://127.0.0.1:$Port/api/health"
  $Healthy = $false
  for ($i=0; $i -lt 120; $i++) {
    if ($ServerProcess.HasExited) {
      throw "Shared server exited unexpectedly.`n$(Read-Log $ServerErr)"
    }
    try {
      $Health = Invoke-RestMethod -UseBasicParsing -Uri $HealthUrl -TimeoutSec 2
      if ($Health.ok) { $Healthy = $true; break }
    } catch {}
    Start-Sleep -Milliseconds 250
  }
  if (-not $Healthy) {
    throw "Shared server health check failed.`n$(Read-Log $ServerErr)"
  }

  $ConfigCandidates = @(
    (Join-Path $env:USERPROFILE '.cloudflared\config.yml'),
    (Join-Path $env:USERPROFILE '.cloudflared\config.yaml')
  ) | Where-Object { $_ -and (Test-Path $_) }
  if ($ConfigCandidates.Count -gt 0) {
    Write-Host 'Note: an existing ~/.cloudflared/config.yml can interfere with Quick Tunnel. Rename it temporarily if tunnel startup fails.' -ForegroundColor Yellow
  }

  Write-Step 'Starting Cloudflare Quick Tunnel'
  $TunnelArguments = @('tunnel','--url',"http://127.0.0.1:$Port")
  foreach ($Email in $AllowedEmail) {
    if (-not [string]::IsNullOrWhiteSpace($Email)) {
      $TunnelArguments += @('--allowed-mail',$Email.Trim())
    }
  }
  $TunnelProcess = Start-Process -FilePath $Cloudflared -ArgumentList $TunnelArguments -WorkingDirectory $Root -PassThru -NoNewWindow -RedirectStandardOutput $TunnelOut -RedirectStandardError $TunnelErr

  $TunnelBase = $null
  for ($i=0; $i -lt 180; $i++) {
    if ($TunnelProcess.HasExited) {
      throw "Cloudflare Tunnel exited unexpectedly.`n$(Read-Log $TunnelErr)"
    }
    $Combined = (Read-Log $TunnelOut) + "`n" + (Read-Log $TunnelErr)
    if ($Combined -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
      $TunnelBase = $Matches[0]
      break
    }
    Start-Sleep -Milliseconds 250
  }
  if (-not $TunnelBase) {
    throw "Could not obtain the public Quick Tunnel URL.`n$(Read-Log $TunnelErr)"
  }

  $EncodedMachine = [Uri]::EscapeDataString($Machine)
  $PublicUrl = "$TunnelBase/?machine=$EncodedMachine"
  Set-Content -LiteralPath $PublicUrlFile -Value $PublicUrl -Encoding UTF8
  try { Set-Clipboard -Value $PublicUrl } catch {}

  Write-Host ''
  Write-Host '============================================================' -ForegroundColor Green
  Write-Host ' SWEETS LINK SHARED MACHINE READY' -ForegroundColor Green
  Write-Host '============================================================' -ForegroundColor Green
  Write-Host $PublicUrl -ForegroundColor Yellow
  Write-Host ''
  Write-Host 'Open this URL on every device that will share the same machine.' -ForegroundColor White
  Write-Host 'The URL was also copied to the clipboard.' -ForegroundColor White
  Write-Host 'Keep this window open. Closing it stops the shared server and tunnel.' -ForegroundColor White
  Write-Host 'Round state is saved in .runtime\shared-machine.json.' -ForegroundColor DarkGray
  Write-Host ''

  if (-not $NoBrowser) {
    try { Start-Process $PublicUrl | Out-Null } catch {}
  }

  while (-not $ServerProcess.HasExited -and -not $TunnelProcess.HasExited) {
    Start-Sleep -Seconds 1
  }

  if ($ServerProcess.HasExited) {
    throw "Shared server stopped.`n$(Read-Log $ServerErr)"
  }
  if ($TunnelProcess.HasExited) {
    throw "Cloudflare Tunnel stopped.`n$(Read-Log $TunnelErr)"
  }
}
catch {
  Write-Host ''
  Write-Host "Startup failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host ''
  Write-Host "Logs: $Runtime" -ForegroundColor DarkGray
  exit 1
}
finally {
  Stop-Child $TunnelProcess
  Stop-Child $ServerProcess
}
