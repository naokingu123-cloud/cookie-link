$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Scripts = @(
  'scripts/start-shared-machine-tunnel.ps1',
  'scripts/start-shared-machine-v205.ps1',
  'scripts/launch-host-browser-v205.ps1',
  'scripts/download-readiness-v255.ps1',
  'scripts/setup-named-tunnel.ps1'
)
foreach ($Name in $Scripts) {
  $File = Join-Path $Root $Name
  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($File,[ref]$Tokens,[ref]$Errors) | Out-Null
  if ($Errors.Count -gt 0) { throw ($Name + ': ' + ($Errors.Message -join '; ')) }
  if (@([IO.File]::ReadAllBytes($File) | Where-Object { $_ -gt 127 }).Count) { throw ($Name + ' must be ASCII for Windows PowerShell 5.1.') }
}
. (Join-Path $Root 'scripts/download-readiness-v255.ps1')
function Assert-True($Value,[string]$Message) { if (-not $Value) { throw $Message } }
$Waiting = Get-SweetsDownloadStartupState ([pscustomobject]@{ok=$true;serverEdition='download';download=[pscustomobject]@{enabled=$true;ready=$false;error=$null}})
Assert-True (-not $Waiting.Ready -and $Waiting.Error -eq '') 'A running HTTP server must not be declared ready before its recorder.'
$Missing = Get-SweetsDownloadStartupState ([pscustomobject]@{ok=$true;serverEdition='download';download=[pscustomobject]@{enabled=$true;ready=$false;error='browser_missing'}})
Assert-True (-not $Missing.Ready -and $Missing.Error -eq 'browser_missing') 'A missing browser must fail with its recorder error.'
$Streaming = Get-SweetsDownloadStartupState ([pscustomobject]@{ok=$true;source='physical-host';serverEdition='streaming';download=[pscustomobject]@{enabled=$true;ready=$true}})
Assert-True (-not $Streaming.Ready) 'Download-only startup must reject a different server edition.'
$Ready = Get-SweetsDownloadStartupState ([pscustomobject]@{ok=$true;serverEdition='download';download=[pscustomobject]@{enabled=$true;ready=$true;error=$null}})
Assert-True $Ready.Ready 'The actual ready Download recorder must be accepted.'

# Execute the shipped wrapper with an isolated legacy target. Start-Process is
# captured so this regression never opens a browser or starts a public server.
$Temp = Join-Path ([IO.Path]::GetTempPath()) ('sweets-launcher-v255-' + [guid]::NewGuid().ToString('N'))
$TestScripts = Join-Path $Temp 'scripts'
$PreviousCapture = $env:SWEETS_LAUNCHER_TEST_CAPTURE
$global:SweetsLauncherV255Starts = @()
function Start-Process {
  param($FilePath,$ArgumentList,$WindowStyle)
  $global:SweetsLauncherV255Starts += [pscustomobject]@{FilePath=$FilePath;Arguments=$ArgumentList;WindowStyle=$WindowStyle}
}
try {
  New-Item -ItemType Directory -Force -Path $TestScripts | Out-Null
  Copy-Item (Join-Path $Root 'scripts/start-shared-machine-v205.ps1') $TestScripts
  $Legacy = @'
param($Port,$Machine,$PublicHost,$Edition,[switch]$QuickTunnel,[switch]$NoBrowser,[switch]$NoDownload,[string[]]$AllowedEmail)
[IO.File]::WriteAllText($env:SWEETS_LAUNCHER_TEST_CAPTURE,(@{Edition=$Edition;Port=$Port;Machine=$Machine;NoBrowser=[bool]$NoBrowser} | ConvertTo-Json))
exit 0
'@
  [IO.File]::WriteAllText((Join-Path $TestScripts 'start-shared-machine-tunnel.ps1'),$Legacy)
  $env:SWEETS_LAUNCHER_TEST_CAPTURE = Join-Path $Temp 'captured.json'
  & (Join-Path $TestScripts 'start-shared-machine-v205.ps1') -Edition Download -Port 3123 -Machine 'qa-download'
  $Captured = Get-Content -Raw $env:SWEETS_LAUNCHER_TEST_CAPTURE | ConvertFrom-Json
  Assert-True ($global:SweetsLauncherV255Starts.Count -eq 0) 'Download startup must not spawn the visible host browser helper.'
  Assert-True ($Captured.Edition -eq 'Download' -and $Captured.NoBrowser -and $Captured.Port -eq 3123 -and $Captured.Machine -eq 'qa-download') 'Download arguments must reach the server launcher.'
  & (Join-Path $TestScripts 'start-shared-machine-v205.ps1')
  $Captured = Get-Content -Raw $env:SWEETS_LAUNCHER_TEST_CAPTURE | ConvertFrom-Json
  Assert-True ($global:SweetsLauncherV255Starts.Count -eq 1 -and $Captured.Edition -eq 'Streaming') 'The existing launcher must still default to Streaming and its host helper.'
  & (Join-Path $TestScripts 'start-shared-machine-v205.ps1') -NoBrowser
  Assert-True ($global:SweetsLauncherV255Starts.Count -eq 1) 'Explicit NoBrowser must continue to suppress the Streaming helper.'
  Write-Output 'DOWNLOAD_V255_LAUNCHER_PASS'
} finally {
  $env:SWEETS_LAUNCHER_TEST_CAPTURE = $PreviousCapture
  Remove-Variable -Name SweetsLauncherV255Starts -Scope Global -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $Temp -ErrorAction SilentlyContinue
}
