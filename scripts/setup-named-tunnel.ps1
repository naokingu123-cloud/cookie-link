[CmdletBinding()]
param(
  [string]$PublicHost = '',
  [string]$TunnelToken = ''
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Runtime = Join-Path $Root '.runtime'
$HostFile = Join-Path $Runtime 'named-tunnel-host.txt'
$TokenFile = Join-Path $Runtime 'named-tunnel-token.txt'

New-Item -ItemType Directory -Force -Path $Runtime | Out-Null

Write-Host ''
Write-Host 'SWEETS LINK Named Tunnel setup' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Before continuing, create a remotely-managed Cloudflare Tunnel and add a Published application:' -ForegroundColor White
Write-Host '  Public hostname: your fixed hostname, for example sweets.example.com' -ForegroundColor White
Write-Host '  Service URL:     http://localhost:3000' -ForegroundColor White
Write-Host ''
Write-Host 'Then copy the tunnel token from the cloudflared install/run command.' -ForegroundColor White
Write-Host ''

if ([string]::IsNullOrWhiteSpace($PublicHost)) {
  $PublicHost = (Read-Host 'Fixed public hostname').Trim().ToLowerInvariant()
}
if ($PublicHost -notmatch '^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$' -or $PublicHost -notmatch '\.') {
  throw "Invalid public hostname: $PublicHost"
}

if ([string]::IsNullOrWhiteSpace($TunnelToken)) {
  $Secure = Read-Host 'Tunnel token (input is hidden)' -AsSecureString
  $Ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    $TunnelToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Ptr)
  }
}
$TunnelToken = $TunnelToken.Trim()
if ($TunnelToken.Length -lt 20) {
  throw 'Tunnel token looks too short.'
}

[IO.File]::WriteAllText($HostFile,$PublicHost + [Environment]::NewLine,(New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText($TokenFile,$TunnelToken + [Environment]::NewLine,(New-Object Text.UTF8Encoding($false)))

Write-Host ''
Write-Host 'Saved Named Tunnel configuration.' -ForegroundColor Green
Write-Host "Public host: https://$PublicHost/" -ForegroundColor Green
Write-Host "Host file:   $HostFile" -ForegroundColor DarkGray
Write-Host "Token file:  $TokenFile" -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Now run start-shared-machine-tunnel.cmd.' -ForegroundColor Cyan
