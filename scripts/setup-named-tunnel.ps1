[CmdletBinding()]
param(
  [string]$PublicHost = ''
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Runtime = Join-Path $Root '.runtime'
$HostFile = Join-Path $Runtime 'named-tunnel-host.txt'
$EndpointFile = Join-Path $Root 'shared-endpoint.json'

New-Item -ItemType Directory -Force -Path $Runtime | Out-Null

function Normalize-PublicHost([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  $Value = $Value.Trim()
  $Uri = $null
  if ([Uri]::TryCreate($Value,[UriKind]::Absolute,[ref]$Uri)) {
    if (($Uri.Scheme -eq 'https' -or $Uri.Scheme -eq 'http') -and -not [string]::IsNullOrWhiteSpace($Uri.DnsSafeHost)) {
      return $Uri.DnsSafeHost.Trim().ToLowerInvariant()
    }
  }
  $Value = $Value.TrimEnd('/')
  return $Value.ToLowerInvariant()
}

function Read-EndpointHost {
  if (-not (Test-Path $EndpointFile)) { return '' }
  try {
    $Data = Get-Content -Raw -LiteralPath $EndpointFile | ConvertFrom-Json
    return Normalize-PublicHost ([string]$Data.server)
  } catch {
    return ''
  }
}

Write-Host ''
Write-Host 'SWEETS LINK Named Tunnel setup' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Cloudflare steps required before this setup:' -ForegroundColor White
Write-Host '  1. Create the Tunnel in Cloudflare.' -ForegroundColor White
Write-Host '  2. On the Install and Run page, run cloudflared.exe service install <TOKEN> as Administrator.' -ForegroundColor White
Write-Host '  3. Wait for Connection Status to become connected, then click Continue.' -ForegroundColor White
Write-Host '  4. Add a Published application: fixed hostname -> http://localhost:3000.' -ForegroundColor White
Write-Host ''
Write-Host 'This script only stores that fixed public hostname for SWEETS LINK.' -ForegroundColor White
Write-Host ''

$PublicHost = Normalize-PublicHost $PublicHost
if ([string]::IsNullOrWhiteSpace($PublicHost)) {
  $PublicHost = Read-EndpointHost
  if (-not [string]::IsNullOrWhiteSpace($PublicHost)) {
    Write-Host "Using hostname from shared-endpoint.json: $PublicHost" -ForegroundColor Green
  }
}
if ([string]::IsNullOrWhiteSpace($PublicHost)) {
  $PublicHost = Normalize-PublicHost (Read-Host 'Fixed public hostname (example: sweets.example.com)')
}
if ([string]::IsNullOrWhiteSpace($PublicHost) -or $PublicHost -notmatch '^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?

[IO.File]::WriteAllText($HostFile,$PublicHost + [Environment]::NewLine,(New-Object Text.UTF8Encoding($false)))

$Service = Get-Service -Name 'cloudflared' -ErrorAction SilentlyContinue
Write-Host ''
if ($null -eq $Service) {
  Write-Host 'WARNING: cloudflared Windows service was not found.' -ForegroundColor Yellow
  Write-Host 'Return to the Cloudflare Install and Run page and run its service install command as Administrator.' -ForegroundColor Yellow
} else {
  Write-Host ("cloudflared service: " + $Service.Status) -ForegroundColor Green
}
Write-Host "Saved hostname: https://$PublicHost/" -ForegroundColor Green
Write-Host "Host file: $HostFile" -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Now run start-shared-machine-tunnel.cmd.' -ForegroundColor Cyan
 -or $PublicHost -notmatch '\.') {
  throw "Invalid public hostname: $PublicHost"
}

[IO.File]::WriteAllText($HostFile,$PublicHost + [Environment]::NewLine,(New-Object Text.UTF8Encoding($false)))

$Service = Get-Service -Name 'cloudflared' -ErrorAction SilentlyContinue
Write-Host ''
if ($null -eq $Service) {
  Write-Host 'WARNING: cloudflared Windows service was not found.' -ForegroundColor Yellow
  Write-Host 'Return to the Cloudflare Install and Run page and run its service install command as Administrator.' -ForegroundColor Yellow
} else {
  Write-Host ("cloudflared service: " + $Service.Status) -ForegroundColor Green
}
Write-Host "Saved hostname: https://$PublicHost/" -ForegroundColor Green
Write-Host "Host file: $HostFile" -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Now run start-shared-machine-tunnel.cmd.' -ForegroundColor Cyan
