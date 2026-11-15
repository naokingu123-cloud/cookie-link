[CmdletBinding()]
param(
  [ValidateRange(1024,65535)]
  [int]$Port = 3000,

  [ValidatePattern('^[A-Za-z0-9_-]{1,64}$')]
  [string]$Machine = 'public-01',

  [string]$PublicHost = '',
  [switch]$QuickTunnel,
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
$NamedHostFile = Join-Path $Runtime 'named-tunnel-host.txt'
$AdminToken = [guid]::NewGuid().ToString('N')

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

function Save-Utf8NoBom([string]$Path,[string]$Value) {
  [IO.File]::WriteAllText($Path,$Value + [Environment]::NewLine,(New-Object Text.UTF8Encoding($false)))
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

  if (-not $QuickTunnel) {
    if (-not [string]::IsNullOrWhiteSpace($PublicHost)) {
      $PublicHost = $PublicHost.Trim().ToLowerInvariant()
      Save-Utf8NoBom $NamedHostFile $PublicHost
    } elseif (Test-Path $NamedHostFile) {
      $PublicHost = (Get-Content -Raw -LiteralPath $NamedHostFile).Trim().ToLowerInvariant()
    }


    if ([string]::IsNullOrWhiteSpace($PublicHost)) {
      throw 'Named Tunnel hostname is not configured. Run setup-named-tunnel.cmd once, then run this launcher again.'
    }
    if ($PublicHost -notmatch '^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$' -or $PublicHost -notmatch '\.') {
      throw "Invalid PublicHost: $PublicHost"
    }
  }

  foreach ($Log in @($ServerOut,$ServerErr,$TunnelOut,$TunnelErr)) {
    Remove-Item -Force -ErrorAction SilentlyContinue $Log
  }

  Write-Step "Starting shared server (port $Port)"
  $OldPort = $env:PORT
  $OldData = $env:SWEETS_DATA_FILE
  $OldAdmin = $env:SWEETS_ADMIN_TOKEN
  $env:PORT = [string]$Port
  $env:SWEETS_DATA_FILE = $DataFile
  $env:SWEETS_ADMIN_TOKEN = $AdminToken
  try {
    $ServerProcess = Start-Process -FilePath $Node -ArgumentList @('server.mjs') -WorkingDirectory $Root -PassThru -NoNewWindow -RedirectStandardOutput $ServerOut -RedirectStandardError $ServerErr
  } finally {
    $env:PORT = $OldPort
    $env:SWEETS_DATA_FILE = $OldData
    $env:SWEETS_ADMIN_TOKEN = $OldAdmin
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

  if ($QuickTunnel) {
    Write-Step 'Starting Cloudflare Quick Tunnel fallback'
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
        throw "Cloudflare Quick Tunnel exited unexpectedly.`n$(Read-Log $TunnelErr)"
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
  } else {
    Write-Step "Using installed Cloudflare Named Tunnel service ($PublicHost)"
    $Service = Get-Service -Name 'cloudflared' -ErrorAction SilentlyContinue
    if ($null -eq $Service) {
      throw 'Cloudflare Named Tunnel service is not installed. In the Cloudflare tunnel setup page, run the displayed cloudflared.exe service install <TOKEN> command as Administrator.'
    }
    if ($Service.Status -ne 'Running') {
      try { Start-Service -Name 'cloudflared' -ErrorAction Stop } catch {
        throw 'The cloudflared Windows service exists but could not be started. Start it as Administrator or reinstall it from the Cloudflare tunnel setup page.'
      }
    }
    $TunnelBase = "https://$PublicHost"
  }

  Write-Step 'Checking public tunnel reachability'
  $PublicHealth = "$TunnelBase/api/health"
  $PublicReady = $false
  for ($i=0; $i -lt 120; $i++) {
    if ($QuickTunnel -and $TunnelProcess.HasExited) {
      throw "Cloudflare Tunnel exited before public health check completed.`n$(Read-Log $TunnelErr)"
    }
    try {
      $Health = Invoke-RestMethod -UseBasicParsing -Uri $PublicHealth -TimeoutSec 4
      if ($Health.ok -eq $true -and $Health.source -eq 'physical-host') {
        $PublicReady = $true
        break
      }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  if (-not $PublicReady) {
    if ($QuickTunnel) {
      throw "Quick Tunnel exists but /api/health is not reachable: $PublicHealth`n$(Read-Log $TunnelErr)"
    }
    throw "Named Tunnel hostname is not reaching this server: $PublicHealth`nCheck the Cloudflare Published application route: $PublicHost -> http://localhost:$Port`n$(Read-Log $TunnelErr)"
  }

  $EncodedMachine = [Uri]::EscapeDataString($Machine)
  $EncodedTunnel = [Uri]::EscapeDataString($TunnelBase)
  $PlayerApp = 'https://naokingu123-cloud.github.io/cookie-link/'

  if ($QuickTunnel) {
    $ClientUrl = "${PlayerApp}?machine=$EncodedMachine&sharedServer=$EncodedTunnel"
  } elseif ($Machine -eq 'public-01') {
    $ClientUrl = "$TunnelBase/"
  } else {
    $ClientUrl = "$TunnelBase/?machine=$EncodedMachine"
  }

  $ServerManageUrl = "$TunnelBase/?machine=$EncodedMachine&adminToken=$AdminToken"
  $LocalMonitorUrl = "http://127.0.0.1:$Port/monitor.html?machine=$EncodedMachine&adminToken=$AdminToken"
  Set-Content -LiteralPath $PublicUrlFile -Value $ServerManageUrl -Encoding UTF8
  try { Set-Clipboard -Value $ClientUrl } catch {}

  Write-Host ''
  Write-Host '============================================================' -ForegroundColor Green
  Write-Host ' SWEETS LINK SHARED MACHINE READY' -ForegroundColor Green
  Write-Host '============================================================' -ForegroundColor Green
  Write-Host 'SERVER MANAGEMENT (open on this PC):' -ForegroundColor White
  Write-Host $ServerManageUrl -ForegroundColor Yellow
  Write-Host ''
  Write-Host 'PLAYER GAME URL:' -ForegroundColor White
  Write-Host $ClientUrl -ForegroundColor Cyan
  Write-Host ''
  if ($QuickTunnel) {
    Write-Host 'Quick Tunnel fallback is temporary. The client URL changes on restart.' -ForegroundColor Yellow
  } else {
    Write-Host 'Named Tunnel is active. This PLAYER GAME URL is stable.' -ForegroundColor White
    Write-Host 'Players only open the game URL; no sharedServer parameter or setup is needed.' -ForegroundColor White
  }
  Write-Host 'The PLAYER GAME URL was copied to the clipboard.' -ForegroundColor White
  Write-Host "Local monitor fallback: $LocalMonitorUrl" -ForegroundColor DarkGray
  Write-Host "Public health: $PublicHealth" -ForegroundColor DarkGray
  Write-Host 'Keep this window open. Closing it stops the shared server and tunnel.' -ForegroundColor White
  Write-Host 'Round state is saved in .runtime\shared-machine.json.' -ForegroundColor DarkGray
  Write-Host ''

  if (-not $NoBrowser) {
    try { Start-Process $ServerManageUrl | Out-Null } catch {
      try { Start-Process $LocalMonitorUrl | Out-Null } catch {}
    }
  }

  if ($QuickTunnel) {
    while (-not $ServerProcess.HasExited -and -not $TunnelProcess.HasExited) {
      Start-Sleep -Seconds 1
    }
  } else {
    while (-not $ServerProcess.HasExited) {
      Start-Sleep -Seconds 1
    }
  }

  if ($ServerProcess.HasExited) {
    throw "Shared server stopped.`n$(Read-Log $ServerErr)"
  }
  if ($QuickTunnel -and $TunnelProcess.HasExited) {
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
