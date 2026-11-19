function Get-SweetsDownloadStartupState {
  param([object]$Health)
  if ($null -eq $Health -or $Health.ok -ne $true) {
    return [pscustomobject]@{ Ready = $false; Error = '' }
  }
  if ($Health.serverEdition -ne 'download' -or $null -eq $Health.download -or $Health.download.enabled -ne $true) {
    return [pscustomobject]@{ Ready = $false; Error = 'This server did not enable the Download edition.' }
  }
  if ($Health.download.ready -eq $true) {
    return [pscustomobject]@{ Ready = $true; Error = '' }
  }
  return [pscustomobject]@{ Ready = $false; Error = [string]$Health.download.error }
}
