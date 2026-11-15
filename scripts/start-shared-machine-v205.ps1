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
$Root = Split-Path -Parent $PSScriptRoot
$Runtime = Join-Path $Root '.runtime'
$UrlFile = Join-Path $Runtime 'shared-url.txt'
$Legacy = Join-Path $PSScriptRoot 'start-shared-machine-tunnel.ps1'
$BrowserHelper = Join-Path $PSScriptRoot 'launch-host-browser-v205.ps1'

New-Item -ItemType Directory -Force -Path $Runtime | Out-Null
Remove-Item -Force -ErrorAction SilentlyContinue $UrlFile

if (-not $NoBrowser) {
  $HelperArgs = @(
    '-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden',
    '-File',$BrowserHelper,
    '-UrlFile',$UrlFile,
    '-Port',[string]$Port,
    '-Root',$Root
  )
  Start-Process -FilePath 'powershell.exe' -ArgumentList $HelperArgs -WindowStyle Hidden | Out-Null
}

& $Legacy `
  -Port $Port `
  -Machine $Machine `
  -PublicHost $PublicHost `
  -QuickTunnel:$QuickTunnel `
  -NoBrowser `
  -NoDownload:$NoDownload `
  -AllowedEmail $AllowedEmail
exit $LASTEXITCODE
