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
  Write-Step 'Node.jsを確認しています'
  $Node = Find-Command @('node.exe','node')
  $Npm = Find-Command @('npm.cmd','npm')
  if (-not $Node -or -not $Npm) {
    throw 'Node.js 20以上が必要です。https://nodejs.org/ のLTS版をインストールしてから、もう一度実行してください。'
  }

  $NodeVersion = (& $Node --version).Trim()
  $Major = 0
  if ($NodeVersion -match '^v(\d+)') { $Major = [int]$Matches[1] }
  if ($Major -lt 20) {
    throw "Node.js 20以上が必要です。現在: $NodeVersion"
  }
  Write-Step "Node.js $NodeVersion"

  if (-not (Test-Path (Join-Path $Root 'node_modules\ws\package.json'))) {
    Write-Step '初回セットアップ: WebSocket依存関係をインストールしています'
    & $Npm install --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm installに失敗しました。' }
  }

  $Cloudflared = Find-Command @('cloudflared.exe','cloudflared')
  if (-not $Cloudflared) {
    $Cloudflared = Join-Path $Tools 'cloudflared.exe'
    if (-not (Test-Path $Cloudflared)) {
      if ($NoDownload) {
        throw 'cloudflaredが見つかりません。-NoDownloadを外すか、cloudflaredをPATHへ追加してください。'
      }
      Write-Step '初回セットアップ: Cloudflare公式cloudflaredを取得しています'
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

  Write-Step "共有サーバーを起動しています (port $Port)"
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
      throw "共有サーバーが終了しました。`n$(Read-Log $ServerErr)"
    }
    try {
      $Health = Invoke-RestMethod -UseBasicParsing -Uri $HealthUrl -TimeoutSec 2
      if ($Health.ok) { $Healthy = $true; break }
    } catch {}
    Start-Sleep -Milliseconds 250
  }
  if (-not $Healthy) {
    throw "共有サーバーの起動確認に失敗しました。`n$(Read-Log $ServerErr)"
  }

  $ConfigCandidates = @(
    (Join-Path $env:USERPROFILE '.cloudflared\config.yml'),
    (Join-Path $env:USERPROFILE '.cloudflared\config.yaml')
  ) | Where-Object { $_ -and (Test-Path $_) }
  if ($ConfigCandidates.Count -gt 0) {
    Write-Host '注意: ~/.cloudflared/config.yml があるとQuick Tunnelが失敗する場合があります。失敗時は一時的に名前を変更してください。' -ForegroundColor Yellow
  }

  Write-Step 'Cloudflare Quick Tunnelを起動しています'
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
      throw "Cloudflare Tunnelが終了しました。`n$(Read-Log $TunnelErr)"
    }
    $Combined = (Read-Log $TunnelOut) + "`n" + (Read-Log $TunnelErr)
    if ($Combined -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
      $TunnelBase = $Matches[0]
      break
    }
    Start-Sleep -Milliseconds 250
  }
  if (-not $TunnelBase) {
    throw "公開URLを取得できませんでした。`n$(Read-Log $TunnelErr)"
  }

  $EncodedMachine = [Uri]::EscapeDataString($Machine)
  $PublicUrl = "$TunnelBase/?machine=$EncodedMachine"
  Set-Content -LiteralPath $PublicUrlFile -Value $PublicUrl -Encoding UTF8
  try { Set-Clipboard -Value $PublicUrl } catch {}

  Write-Host ''
  Write-Host '============================================================' -ForegroundColor Green
  Write-Host ' SWEETS LINK 共有抽選サーバー 起動完了' -ForegroundColor Green
  Write-Host '============================================================' -ForegroundColor Green
  Write-Host $PublicUrl -ForegroundColor Yellow
  Write-Host ''
  Write-Host 'このURLを同じ抽選機を共有する端末で開いてください。' -ForegroundColor White
  Write-Host 'URLはクリップボードにもコピーしました。' -ForegroundColor White
  Write-Host 'このウィンドウを閉じると公開は終了します。' -ForegroundColor White
  Write-Host 'ラウンド状態は .runtime\shared-machine.json に保存されます。' -ForegroundColor DarkGray
  Write-Host ''

  if (-not $NoBrowser) {
    try { Start-Process $PublicUrl | Out-Null } catch {}
  }

  while (-not $ServerProcess.HasExited -and -not $TunnelProcess.HasExited) {
    Start-Sleep -Seconds 1
  }

  if ($ServerProcess.HasExited) {
    throw "共有サーバーが停止しました。`n$(Read-Log $ServerErr)"
  }
  if ($TunnelProcess.HasExited) {
    throw "Cloudflare Tunnelが停止しました。`n$(Read-Log $TunnelErr)"
  }
}
catch {
  Write-Host ''
  Write-Host "起動に失敗しました: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host ''
  Write-Host "ログ: $Runtime" -ForegroundColor DarkGray
  exit 1
}
finally {
  Stop-Child $TunnelProcess
  Stop-Child $ServerProcess
}
