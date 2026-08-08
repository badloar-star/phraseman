param(
  [string]$Workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$ConfigPath = (Join-Path $HOME '.phraseman\agent-manager-runner.json')
)

$ErrorActionPreference = 'Stop'
$runner = Join-Path $Workspace 'scripts\agent_manager_codex_runner.cjs'
$bridge = Join-Path $Workspace 'scripts\agent_manager_pairing_bridge.cjs'
$endpointRoot = 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/'
$endpoints = @{
  exchangeUrl = "${endpointRoot}agentManagerLocalRunnerExchangePairing"
  claimUrl = "${endpointRoot}agentManagerLocalRunnerClaim"
  submitUrl = "${endpointRoot}agentManagerLocalRunnerSubmit"
}

function Get-PairingPayload {
  try {
    $raw = Get-Clipboard -Raw -ErrorAction Stop
    $payload = $raw | ConvertFrom-Json -ErrorAction Stop
    $expectedProperties = @('claimUrl', 'exchangeUrl', 'expiresAtMs', 'pairingCode', 'pairingId', 'submitUrl')
    $actualProperties = @($payload.PSObject.Properties.Name | Sort-Object)
    if ($actualProperties.Count -ne $expectedProperties.Count -or ($actualProperties -join '|') -ne ($expectedProperties -join '|')) { return $null }
    if ($payload.pairingId -isnot [string] -or $payload.pairingCode -isnot [string] -or $payload.pairingId -notmatch '^[A-Za-z][A-Za-z0-9._:-]{2,159}$' -or $payload.pairingCode -notmatch '^[A-Za-z0-9_-]{8,160}$') { return $null }
    if ($payload.expiresAtMs -isnot [long] -and $payload.expiresAtMs -isnot [int]) { return $null }
    foreach ($name in $endpoints.Keys) {
      if ([string]$payload.$name -ne [string]$endpoints[$name]) { return $null }
    }
    $nowMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    if ([int64]$payload.expiresAtMs -le $nowMs -or [int64]$payload.expiresAtMs -gt ($nowMs + 600000)) { return $null }
    return $payload
  } catch { return $null }
}

if (-not (Test-Path -LiteralPath $runner)) { throw 'Local Codex runner script is missing.' }
if (-not (Test-Path -LiteralPath $bridge)) { throw 'Local pairing bridge script is missing.' }

$bridgeProcess = $null
if (-not (Test-Path -LiteralPath $ConfigPath)) {
  $bridgeProcess = Start-Process -FilePath 'node' -ArgumentList @($bridge, '--config', $ConfigPath) -WindowStyle Hidden -PassThru
}
while (-not (Test-Path -LiteralPath $ConfigPath)) {
  $pairing = Get-PairingPayload
  if ($null -ne $pairing) {
    & node $runner pair --config $ConfigPath --exchange-url $endpoints.exchangeUrl --claim-url $endpoints.claimUrl --submit-url $endpoints.submitUrl --pairing-id ([string]$pairing.pairingId) --pairing-code ([string]$pairing.pairingCode) *> $null
    if ($LASTEXITCODE -eq 0) { break }
  }
  Start-Sleep -Seconds 2
}

if ($null -ne $bridgeProcess -and -not $bridgeProcess.HasExited) {
  Stop-Process -Id $bridgeProcess.Id -ErrorAction SilentlyContinue
}
& node $runner run --config $ConfigPath --workspace $Workspace
exit $LASTEXITCODE
