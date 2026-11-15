[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [string]$UrlFile,
  [ValidateRange(1024,65535)]
  [int]$Port = 3000,
  [Parameter(Mandatory=$true)]
  [string]$Root
)

$ErrorActionPreference = 'SilentlyContinue'
$Deadline = [DateTime]::UtcNow.AddMinutes(3)
while ([DateTime]::UtcNow -lt $Deadline -and -not (Test-Path $UrlFile)) {
  Start-Sleep -Milliseconds 250
}
if (-not (Test-Path $UrlFile)) { exit 0 }

$PublicUrl = (Get-Content -Raw -LiteralPath $UrlFile).Trim()
if ([string]::IsNullOrWhiteSpace($PublicUrl)) { exit 0 }
$PublicUri = $null
if (-not [Uri]::TryCreate($PublicUrl,[UriKind]::Absolute,[ref]$PublicUri)) { exit 0 }

$LocalBase = "http://127.0.0.1:$Port"
$LocalUrl = $LocalBase + '/monitor.html' + $PublicUri.Query
$HealthUrl = $LocalBase + '/api/health'
for ($i=0; $i -lt 160; $i++) {
  try {
    $Health = Invoke-RestMethod -UseBasicParsing -Uri $HealthUrl -TimeoutSec 2
    if ($Health.ok) { break }
  } catch {}
  Start-Sleep -Milliseconds 250
}

function Find-Browser {
  foreach ($Name in @('msedge.exe','chrome.exe')) {
    $Command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -ne $Command) { return $Command.Source }
  }
  $Candidates = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  )
  foreach ($Candidate in $Candidates) {
    if (-not [string]::IsNullOrWhiteSpace($Candidate) -and (Test-Path $Candidate)) { return $Candidate }
  }
  return $null
}

$Browser = Find-Browser
if ([string]::IsNullOrWhiteSpace($Browser)) {
  Start-Process $LocalUrl | Out-Null
  exit 0
}

$Runtime = Join-Path $Root '.runtime'
$Profile = Join-Path $Runtime ('host-browser-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $Profile | Out-Null
$Arguments = @(
  "--user-data-dir=$Profile",
  "--app=$LocalUrl",
  '--new-window',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-session-crashed-bubble',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes',
  '--autoplay-policy=no-user-gesture-required',
  '--enable-gpu-rasterization',
  '--use-angle=d3d11',
  '--window-size=1500,980'
)
$Process = Start-Process -FilePath $Browser -ArgumentList $Arguments -PassThru
Start-Sleep -Milliseconds 700
try { $Process.PriorityClass = 'AboveNormal' } catch {}
