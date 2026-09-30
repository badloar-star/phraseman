[CmdletBinding(DefaultParameterSetName = 'Device')]
param(
  [Parameter(ParameterSetName = 'Library', Mandatory = $true)]
  [switch]$LibraryMode,
  [Parameter(ParameterSetName = 'Library', Mandatory = $true)]
  [ValidateSet('ContendedCheckpoint', 'KilledWaiterBoundary', 'StaleLockEvidence', 'Timeline', 'PhaseTranscript', 'CleanupModel', 'OwnedRepositorySnapshot', 'CampaignIntegrityMatrix', 'ActivatedNativeProvenance', 'ApkDexSurface', 'ApkDexSurfacePath', 'MergedDebugManifest', 'Materialization', 'PackageRecovery', 'SourceTrust', 'EvidencePublication', 'RuntimeMarkerBinding', 'AdbTransport', 'DiagnosticReducer', 'FailureEnvelope', 'HostGateReceipt')]
  [string]$ValidationKind,
  [Parameter(ParameterSetName = 'Library', Mandatory = $true)]
  [string]$ValidationPayloadBase64,
  [Parameter(ParameterSetName = 'Device', Mandatory = $true)]
  [string]$Serial,
  [Parameter(ParameterSetName = 'Device', Mandatory = $true)]
  [string]$EvidenceDirectory,
  [Parameter(ParameterSetName = 'Device', Mandatory = $true)]
  [string]$PacketPath,
  [Parameter(ParameterSetName = 'Device', Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{64}$')]
  [string]$PacketSha256,
  [Parameter(ParameterSetName = 'Device')]
  [string]$ReviewedReceiptPath,
  [Parameter(ParameterSetName = 'Device')]
  [ValidatePattern('^$|^[0-9a-f]{64}$')]
  [string]$ReviewedReceiptSha256
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:Repo = 'C:\appsprojects\phraseman'
$script:PackageName = 'app.phraseman'
$script:RemoteComponent = 'app.phraseman/.AccountV2ProbeActivity'
$script:PrimaryProcess = 'app.phraseman'
$script:RemoteProcess = 'app.phraseman:account_v2_probe'
$script:PacketExpectedSha256 = 'dfbc8043b425198b038a59a5b75f8cf1c4ebae3321da5f5a0f5b084d2131d260'
$script:SevenPaths = @(
  'runtime-probes/android-account-provision-lock/android/AccountV2ProbeActivity.kt',
  'runtime-probes/android-account-provision-lock/android/AndroidManifest.fragment.xml',
  'runtime-probes/android-account-provision-lock/probe.ts',
  'runtime-probes/android-account-provision-lock/index.js',
  'runtime-probes/android-account-provision-lock/run-proof.ps1',
  'tests/account_provision_lock_android_runtime_probe.test.ts',
  'tests/account_provision_lock_android_runtime_entrypoint.test.ts'
)
$script:CriticalInputs = @(
  'patches/expo-sqlite+16.0.10.patch',
  'package-lock.json',
  'app.json',
  'app.config.js'
)
$script:ActivatedNativeInputs = @(
  'node_modules/expo-sqlite/android/src/main/java/expo/modules/sqlite/SQLiteModule.kt',
  'node_modules/expo-sqlite/package.json'
)
$script:ActivatedNativeExpected = @(
  [pscustomobject][ordered]@{
    name = 'node_modules/expo-sqlite/android/src/main/java/expo/modules/sqlite/SQLiteModule.kt'
    kind = 'file'
    length = [long]45622
    sha256 = '72b5bdf41fb352b2f4e86ab698d65fa29c11a57a9f0d51d38067583205590fd5'
  },
  [pscustomobject][ordered]@{
    name = 'node_modules/expo-sqlite/package.json'
    kind = 'file'
    length = [long]1861
    sha256 = '562b2c516c8401c318758c9ccb5b641fff768f3c38792c2087294e351e849600'
  }
)
$script:ActivatedNativeExpectedVersion = '16.0.10'
$script:PhaseNames = @(
  'primary-holder-secondary-waiter',
  'secondary-holder-primary-waiter',
  'holder-death',
  'waiter-death',
  'independent-identities',
  'stale-file'
)
$timeoutIsCancellation = $false
$script:OwnedReverse = $false
$script:OwnedMetroPid = $null
$script:OwnedMetroStartedUtc = $null
$script:CampaignTemp = $null
$script:HeldSourceHandles = @()
$script:HeldActivatedNativeHandles = @()
$script:ReviewedReceiptHandle = $null
$script:DeviceMaterializationContext = $null
$script:PackageEntrypointState = $null
$script:PreserveAll = $false
$script:BuiltApkPath = $null
$script:BuiltApkSha256 = $null
$script:ApkInstallState = 'not_attempted'
$script:PhaseEvidence = @()
$script:GeneratedTargetFactsBefore = $null
$script:GeneratedTargetFactsAfter = $null
$script:RepositoryBefore = $null
$script:RepositoryAfter = $null
$script:RepositoryAfterPublication = $null
$script:SourceBefore = $null
$script:SourceAfter = $null
$script:CleanupApkObservation = $null
$script:GateReceipts = $null
$script:CleanupReceipt = $null
$script:NativeInputHashes = $null
$script:MaterializedInputHashes = $null
$script:ReviewedSourceReceipt = $null
$script:ActivatedNativeProvenance = $null
$script:ActivatedNativeAfterBuild = $null
$script:ApkDexSurfaceFact = $null
$script:MergedDebugManifestFact = $null
$script:PublishedEvidencePath = $null
$script:ObservedJsFailureCode = 'account_provision_lock_runtime_failed'
$script:ObservedDatabaseRootDiagnostic = [pscustomobject][ordered]@{
  schemaVersion = 1
  category = 'unobserved'
}
$script:DatabaseRootDiagnosticCategories = @(
  'android_ce_user_zero', 'android_ce_user_nonzero', 'file_uri', 'legacy_alias', 'other', 'non_string'
)
$script:CleanupFailureOrder = @(
  'app-stop', 'reverse-remove', 'metro-stop', 'package-restore', 'android-restore',
  'apk-recheck', 'temp-delete', 'repository-check', 'source-check', 'evidence-finalize'
)
$script:SafeJsFailureCodes = @(
  'account_provision_lock_request_invalid',
  'account_provision_lock_identity_invalid',
  'account_provision_lock_duplicate_role',
  'account_provision_lock_native_unsupported',
  'account_provision_lock_database_root_invalid',
  'account_provision_lock_acquire_failed',
  'account_provision_lock_handle_invalid',
  'account_provision_lock_control_invalid',
  'account_provision_lock_release_failed',
  'account_provision_lock_duplicate_release',
  'account_provision_lock_post_release_use',
  'account_provision_lock_emit_failed',
  'account_provision_lock_probe_failed'
)
$script:SafeHostFailureCodes = @(
  'reviewed_source_trust_root_missing',
  'reviewed_source_trust_root_invalid',
  'source_tracking_precondition_failed',
  'packet_hash_invalid',
  'emulator_identity_invalid',
  'android_build_unavailable',
  'android_build_failed',
  'activated_native_provenance_invalid',
  'activated_native_package_version_invalid',
  'activated_native_provenance_build_drift',
  'apk_dex_surface_invalid',
  'merged_debug_manifest_invalid',
  'apk_hash_invalid',
  'apk_install_failed',
  'installed_apk_hash_failed',
  'metro_start_failed',
  'metro_ownership_invalid',
  'metro_stop_failed',
  'reverse_start_failed',
  'primary_start_failed',
  'primary_launch_failed',
  'secondary_start_failed',
  'process_binding_failed',
  'proc_observation_failed',
  'marker_observation_failed',
  'runtime_launch_acknowledgement_deadline',
  'runtime_marker_binding_invalid',
  'marker_order_invalid',
  'marker_observation_deadline',
  'runtime_control_acknowledgement_invalid',
  'runtime_control_acknowledgement_deadline',
  'control_release_failed',
  'ownership_checkpoint_invalid',
  'stale_lstat_failed',
  'account_provision_lock_stale_file_invalid',
  'holder_kill_failed',
  'waiter_kill_failed',
  'killed_waiter_control_rejection_invalid',
  'pid_reuse_detected',
  'materialization_preserve_all_stop',
  'package_recovery_preserve_all_stop',
  'host_gate_definition_invalid',
  'host_gate_override_forbidden',
  'host_gate_semaphore_unavailable',
  'host_gate_semaphore_release_failed',
  'host_gate_red_probe_exit_failed',
  'host_gate_red_probe_harness_failed',
  'host_gate_red_probe_receipt_invalid',
  'host_gate_red_entrypoint_exit_failed',
  'host_gate_red_entrypoint_harness_failed',
  'host_gate_red_entrypoint_receipt_invalid',
  'host_gate_green_probe_exit_failed',
  'host_gate_green_probe_harness_failed',
  'host_gate_green_probe_receipt_invalid',
  'host_gate_green_entrypoint_exit_failed',
  'host_gate_green_entrypoint_harness_failed',
  'host_gate_green_entrypoint_receipt_invalid',
  'host_gate_green_sqlite_lease_exit_failed',
  'host_gate_green_sqlite_lease_harness_failed',
  'host_gate_green_sqlite_lease_receipt_invalid',
  'host_gate_typescript_exit_failed',
  'host_gate_typescript_harness_failed',
  'host_gate_typescript_receipt_invalid',
  'host_gate_eslint_exit_failed',
  'host_gate_eslint_harness_failed',
  'host_gate_eslint_receipt_invalid',
  'powershell_parser_gate_failed',
  'diff_check_failed',
  'cleanup_incomplete',
  'campaign_incomplete',
  'evidence_publication_failed',
  'post_publication_repository_snapshot_failed',
  'source_custody_close_failed'
)
$script:FailureStages = @(
  'android-account-provision-lock-campaign',
  'android-account-provision-lock-cleanup',
  'android-account-provision-lock-publication',
  'android-account-provision-lock-source-custody'
)

function Get-Sha256([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'source_missing' }
  $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
  $hasher = [Security.Cryptography.SHA256]::Create()
  try {
    return (($hasher.ComputeHash($stream) | ForEach-Object { $_.ToString('x2') }) -join '')
  } finally {
    $hasher.Dispose()
    $stream.Dispose()
  }
}

function Get-BytesSha256([byte[]]$Bytes) {
  $hasher = [Security.Cryptography.SHA256]::Create()
  try {
    return (($hasher.ComputeHash($Bytes) | ForEach-Object { $_.ToString('x2') }) -join '')
  } finally {
    $hasher.Dispose()
  }
}

function Get-FailureCorrelation([string]$PreReceiptSha256) {
  if ($PreReceiptSha256 -cnotmatch '^[0-9a-f]{64}$') { throw 'failure_correlation_invalid' }
  $input = [Text.UTF8Encoding]::new($false).GetBytes(
    "account-provision-lock-failure-v1|$PreReceiptSha256"
  )
  return Get-BytesSha256 $input
}

function Get-AllowlistedHostFailureCode([object]$CandidateCode) {
  if ($CandidateCode -is [string] -and $script:SafeHostFailureCodes -ccontains $CandidateCode) {
    return [string]$CandidateCode
  }
  return 'account_provision_lock_runtime_failed'
}

function Get-SanitizedFailureCode(
  [object]$CandidateCode,
  [object]$ObservedJsFailureCode
) {
  if ($ObservedJsFailureCode -is [string] -and
      $script:SafeJsFailureCodes -ccontains $ObservedJsFailureCode) {
    return [string]$ObservedJsFailureCode
  }
  $hostCode = Get-AllowlistedHostFailureCode $CandidateCode
  if ($hostCode -cne 'account_provision_lock_runtime_failed') { return $hostCode }
  return 'account_provision_lock_runtime_failed'
}

function New-UnobservedDatabaseRootDiagnostic {
  return [pscustomobject][ordered]@{ schemaVersion = 1; category = 'unobserved' }
}

function Get-SanitizedDatabaseRootDiagnostic([object]$Candidate, [string]$FailureCode) {
  $unobserved = New-UnobservedDatabaseRootDiagnostic
  if ($FailureCode -cne 'account_provision_lock_database_root_invalid' -or
      $null -eq $Candidate -or $Candidate.GetType().Name -ne 'PSCustomObject') {
    return $unobserved
  }
  $keys = @($Candidate.PSObject.Properties.Name)
  if ($keys.Count -ne 2 -or $keys[0] -cne 'schemaVersion' -or $keys[1] -cne 'category' -or
      $Candidate.schemaVersion -ne 1 -or $Candidate.category -isnot [string] -or
      $script:DatabaseRootDiagnosticCategories -cnotcontains $Candidate.category) {
    return $unobserved
  }
  return [pscustomobject][ordered]@{
    schemaVersion = 1
    category = [string]$Candidate.category
  }
}

function Get-SanitizedCleanupFailures([object]$CleanupReceipt, [bool]$CleanupFailed) {
  if (-not $CleanupFailed) { return }
  if ($null -eq $CleanupReceipt -or $null -eq $CleanupReceipt.PSObject.Properties['failures']) {
    return 'unknown'
  }
  $candidate = @($CleanupReceipt.failures)
  if ($candidate.Count -eq 0 -or $candidate.Count -gt 32) { return 'unknown' }
  $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  foreach ($failure in $candidate) {
    if ($failure -isnot [string] -or $script:CleanupFailureOrder -cnotcontains $failure) {
      return 'unknown'
    }
    $seen.Add([string]$failure) | Out-Null
  }
  foreach ($allowed in $script:CleanupFailureOrder) {
    if ($seen.Contains($allowed)) { $allowed }
  }
}

function New-SanitizedFailureEnvelope(
  [object]$CandidateCode,
  [object]$ObservedJsFailureCode,
  [object]$ObservedDatabaseRootDiagnostic,
  [string]$Stage,
  [bool]$CleanupComplete,
  [object]$CleanupReceipt,
  [string]$PreReceiptSha256
) {
  $safeStage = if ($script:FailureStages -ccontains $Stage) {
    $Stage
  } else {
    'android-account-provision-lock-campaign'
  }
  $failureCode = Get-SanitizedFailureCode $CandidateCode $ObservedJsFailureCode
  $cleanupFailed = -not $CleanupComplete
  return [pscustomobject][ordered]@{
    schemaVersion = 1
    status = 'failure'
    failureCode = $failureCode
    stage = $safeStage
    cleanupFailed = $cleanupFailed
    cleanupFailures = @(Get-SanitizedCleanupFailures $CleanupReceipt $cleanupFailed)
    databaseRootDiagnostic = Get-SanitizedDatabaseRootDiagnostic $ObservedDatabaseRootDiagnostic $failureCode
    correlation = Get-FailureCorrelation $PreReceiptSha256
  }
}

function Write-CanonicalFailureEnvelope(
  [object]$CandidateCode,
  [object]$ObservedJsFailureCode,
  [object]$ObservedDatabaseRootDiagnostic,
  [string]$Stage,
  [bool]$CleanupComplete,
  [object]$CleanupReceipt,
  [string]$PreReceiptSha256
) {
  $envelope = New-SanitizedFailureEnvelope `
    $CandidateCode $ObservedJsFailureCode $ObservedDatabaseRootDiagnostic `
    $Stage $CleanupComplete $CleanupReceipt $PreReceiptSha256
  [Console]::Error.WriteLine(($envelope | ConvertTo-Json -Compress))
}

function Get-SanitizedJsDiagnosticCode([object[]]$Lines) {
  $observed = $null
  foreach ($line in $Lines) {
    if ($line -isnot [string]) { return 'account_provision_lock_runtime_failed' }
    $match = [regex]::Match([string]$line, '(?<code>account_provision_lock_[a-z0-9_]+)\s*$')
    if (-not $match.Success) { continue }
    $candidate = $match.Groups['code'].Value
    if ($script:SafeJsFailureCodes -cnotcontains $candidate) {
      return 'account_provision_lock_runtime_failed'
    }
    if ($null -ne $observed -and $observed -cne $candidate) {
      return 'account_provision_lock_runtime_failed'
    }
    $observed = $candidate
  }
  if ($null -eq $observed) { return 'account_provision_lock_runtime_failed' }
  return $observed
}

function Get-SanitizedDatabaseRootDiagnosticFromLines(
  [object[]]$Lines,
  [object]$Binding,
  [string]$FailureCode
) {
  $unobserved = New-UnobservedDatabaseRootDiagnostic
  if ($FailureCode -cne 'account_provision_lock_database_root_invalid') { return $unobserved }
  $marker = 'account_provision_lock_database_root_diagnostic'
  $candidate = $null
  foreach ($line in $Lines) {
    if ($line -isnot [string]) { return $unobserved }
    if (-not ([string]$line).Contains($marker)) { continue }
    $match = [regex]::Match(
      [string]$line,
      '(?<payload>account_provision_lock_database_root_diagnostic(?:\|[a-z0-9_.:-]+){8})\s*$'
    )
    if (-not $match.Success -or $null -ne $candidate) { return $unobserved }
    $candidate = $match.Groups['payload'].Value
  }
  if ($null -eq $candidate) { return $unobserved }
  $fields = @($candidate.Split('|'))
  if ($fields.Count -ne 9 -or $fields[0] -cne $marker -or $fields[1] -cne '1' -or
      $script:DatabaseRootDiagnosticCategories -cnotcontains $fields[2]) {
    return $unobserved
  }
  $expected = @(
    $script:PackageName, [string]$Binding.processName, [string]$Binding.pid,
    [string]$Binding.starttime, [string]$Binding.launchNonce, [string]$Binding.runtimeIdentity
  )
  for ($index = 0; $index -lt $expected.Count; $index += 1) {
    if ($fields[$index + 3] -cne $expected[$index]) { return $unobserved }
  }
  return [pscustomobject][ordered]@{ schemaVersion = 1; category = $fields[2] }
}

function ConvertTo-PosixShellLiteral([string]$Value) {
  if ($null -eq $Value) { throw 'adb_transport_invalid' }
  return "'" + $Value.Replace("'", "'`"'`"'") + "'"
}

function ConvertTo-AdbTransportArguments([string[]]$Arguments) {
  if ($Arguments.Count -eq 0) { throw 'adb_transport_invalid' }
  if ($Arguments[0] -cne 'shell') { return @($Arguments) }
  if ($Arguments.Count -eq 1) { throw 'adb_transport_invalid' }
  $remote = @(
    $Arguments[1..($Arguments.Count - 1)] | ForEach-Object { ConvertTo-PosixShellLiteral $_ }
  ) -join ' '
  return @('shell', $remote)
}

function Get-FileBytes([string]$Path, [string]$Code) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw $Code }
  $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
  try {
    if ($stream.Length -gt 1048576 -or $stream.Length -gt [int]::MaxValue) { throw $Code }
    $bytes = [byte[]]::new([int]$stream.Length)
    $offset = 0
    while ($offset -lt $bytes.Length) {
      $read = $stream.Read($bytes, $offset, $bytes.Length - $offset)
      if ($read -le 0) { throw $Code }
      $offset += $read
    }
    return $bytes
  } finally {
    $stream.Dispose()
  }
}

function Write-DurableNewBytes([string]$Path, [byte[]]$Bytes, [string]$Code) {
  $parent = [IO.Path]::GetDirectoryName($Path)
  if (-not (Test-Path -LiteralPath $parent -PathType Container)) {
    [IO.Directory]::CreateDirectory($parent) | Out-Null
  }
  $stream = $null
  try {
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    $stream.Write($Bytes, 0, $Bytes.Length)
    $stream.Flush($true)
  } catch {
    throw $Code
  } finally {
    if ($null -ne $stream) { $stream.Dispose() }
  }
}

function Move-AtomicReplace([string]$Source, [string]$Target, [string]$Code) {
  if ($null -eq ('AccountProvisionLockAtomicFile' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AccountProvisionLockAtomicFile {
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool MoveFileEx(string existingPath, string newPath, int flags);
}
'@
  }
  if (-not [AccountProvisionLockAtomicFile]::MoveFileEx($Source, $Target, 9)) { throw $Code }
}

function Write-DurableJson([string]$Path, [object]$Value, [bool]$CreateNew, [string]$Fault = 'none') {
  $json = $Value | ConvertTo-Json -Depth 20 -Compress
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes($json)
  if ($CreateNew) {
    Write-DurableNewBytes $Path $bytes 'materialization_journal_write_failed'
    return
  }
  $temporary = "$Path.update.tmp"
  $displaced = "$Path.update.backup"
  if ((Test-Path -LiteralPath $temporary) -or (Test-Path -LiteralPath $displaced)) { throw 'materialization_preserve_all_stop' }
  Write-DurableNewBytes $temporary $bytes 'materialization_journal_write_failed'
  Invoke-InjectedFault $Fault 'after_journal_update_temp'
  try {
    [IO.File]::Replace($temporary, $Path, $displaced, $true)
    Invoke-InjectedFault $Fault 'after_journal_update_replace'
    [IO.File]::Delete($displaced)
  } catch {
    if ($_.Exception.Message -ceq 'account_provision_lock_injected_crash') { throw }
    throw 'materialization_journal_write_failed'
  }
}

function Assert-DescendantPath([string]$Root, [string]$Candidate, [string]$Code) {
  $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
  $candidateFull = [IO.Path]::GetFullPath($Candidate)
  $prefix = $rootFull + [IO.Path]::DirectorySeparatorChar
  if (-not $candidateFull.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw $Code }
  return $candidateFull
}

function Assert-PathOutsideRepository([string]$Candidate, [string]$Code) {
  if ([string]::IsNullOrWhiteSpace($Candidate)) { throw $Code }
  $repoFull = [IO.Path]::GetFullPath($script:Repo).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
  $candidateFull = [IO.Path]::GetFullPath($Candidate).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
  $prefix = $repoFull + [IO.Path]::DirectorySeparatorChar
  if ($candidateFull.Equals($repoFull, [StringComparison]::OrdinalIgnoreCase) -or
      $candidateFull.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw $Code }
  return $candidateFull
}

function Assert-CampaignGitPathsTracked {
  foreach ($relative in @($script:SevenPaths) + @($script:CriticalInputs)) {
    # Exact fail-closed precondition: git ls-files --error-unmatch -- <path>
    $result = @(& git -C $script:Repo 'ls-files' '--error-unmatch' '--' $relative 2>$null)
    if ($LASTEXITCODE -ne 0 -or $result.Count -ne 1 -or $result[0].Replace('\', '/') -cne $relative) {
      throw 'source_tracking_precondition_failed'
    }
  }
}

function Assert-ExternalReviewedReceipt {
  if ([string]::IsNullOrWhiteSpace($ReviewedReceiptPath) -or
      [string]::IsNullOrWhiteSpace($ReviewedReceiptSha256)) { throw 'reviewed_source_trust_root_missing' }
  $receiptPath = Assert-PathOutsideRepository $ReviewedReceiptPath 'reviewed_source_trust_root_invalid'
  $script:ReviewedReceiptHandle = [IO.File]::Open(
    $receiptPath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read
  )
  if ((Get-Sha256 $receiptPath) -cne $ReviewedReceiptSha256) { throw 'reviewed_source_trust_root_invalid' }
  $rawBytes = Get-FileBytes $receiptPath 'reviewed_source_trust_root_invalid'
  try {
    $raw = [Text.UTF8Encoding]::new($false, $true).GetString($rawBytes)
    $receipt = $raw | ConvertFrom-Json
    if ($raw -cne ($receipt | ConvertTo-Json -Depth 20 -Compress)) { throw 'reviewed_source_trust_root_invalid' }
  } catch { throw 'reviewed_source_trust_root_invalid' }
  Assert-ExactKeys $receipt @(
    'schemaVersion', 'owner', 'packetSha256', 'launcherSha256', 'runnerSha256', 'receiptNonce', 'seven'
  ) 'reviewed_source_trust_root_invalid'
  if ($receipt.schemaVersion -ne 1 -or $receipt.owner -cne 'account-provision-lock-reviewed-source-v1' -or
      $receipt.packetSha256 -cne $PacketSha256) { throw 'reviewed_source_trust_root_invalid' }
  Assert-Hex64 $receipt.launcherSha256 'reviewed_source_trust_root_invalid'
  Assert-Hex64 $receipt.runnerSha256 'reviewed_source_trust_root_invalid'
  Assert-Hex32 $receipt.receiptNonce 'reviewed_source_trust_root_invalid'
  $runnerPath = Join-Path $script:Repo 'runtime-probes/android-account-provision-lock/run-proof.ps1'
  if ($receipt.runnerSha256 -cne (Get-Sha256 $runnerPath)) { throw 'reviewed_source_trust_root_invalid' }
  $reviewed = @($receipt.seven)
  if ($reviewed.Count -ne $script:SevenPaths.Count) { throw 'reviewed_source_trust_root_invalid' }
  for ($index = 0; $index -lt $script:SevenPaths.Count; $index += 1) {
    Assert-ExactKeys $reviewed[$index] @('path', 'sha256') 'reviewed_source_trust_root_invalid'
    if ($reviewed[$index].path -cne $script:SevenPaths[$index]) { throw 'reviewed_source_trust_root_invalid' }
    Assert-Hex64 $reviewed[$index].sha256 'reviewed_source_trust_root_invalid'
    if ($reviewed[$index].sha256 -cne $script:SourceBefore[$index].sha256) { throw 'reviewed_source_trust_root_invalid' }
  }
  $script:ReviewedSourceReceipt = [pscustomobject][ordered]@{
    receiptSha256 = $ReviewedReceiptSha256
    receiptPathSha256 = Get-BytesSha256 ([Text.UTF8Encoding]::new($false).GetBytes($receiptPath))
    launcherSha256 = $receipt.launcherSha256
    runnerSha256 = $receipt.runnerSha256
    receiptNonceSha256 = Get-BytesSha256 ([Text.UTF8Encoding]::new($false).GetBytes([string]$receipt.receiptNonce))
  }
}

function Get-TargetFact([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return [pscustomobject][ordered]@{ path = $Path; kind = 'absent'; length = 0; sha256 = $null }
  }
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'materialization_target_kind_invalid' }
  $item = Get-Item -LiteralPath $Path
  if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'materialization_target_kind_invalid' }
  return [pscustomobject][ordered]@{
    path = $Path
    kind = 'file'
    length = [long]$item.Length
    sha256 = Get-Sha256 $Path
  }
}

function New-ManifestDesiredBytes([byte[]]$Original, [byte[]]$Fragment) {
  $utf8 = [Text.UTF8Encoding]::new($false, $true)
  try {
    $originalText = $utf8.GetString($Original)
    $fragmentText = $utf8.GetString($Fragment).TrimEnd("`r", "`n")
  } catch {
    throw 'materialization_fixture_invalid'
  }
  $matches = [regex]::Matches($originalText, '<application(?<attributes>[^<>]*?)/>')
  if ($matches.Count -ne 1) { throw 'materialization_fixture_invalid' }
  $match = $matches[0]
  $replacement = '<application' + $match.Groups['attributes'].Value + ">`n" +
    (($fragmentText -split "`r?`n") | ForEach-Object { "        $_" }) -join "`n"
  $replacement += "`n    </application>"
  $desired = $originalText.Substring(0, $match.Index) + $replacement +
    $originalText.Substring($match.Index + $match.Length)
  return [Text.UTF8Encoding]::new($false).GetBytes($desired)
}

function Invoke-CasWrite([string]$Target, [byte[]]$Expected, [byte[]]$Desired, [string]$WorkRoot) {
  $current = Get-FileBytes $Target 'materialization_preserve_all_stop'
  if ((Get-BytesSha256 $current) -cne (Get-BytesSha256 $Expected)) { throw 'materialization_preserve_all_stop' }
  $token = [Guid]::NewGuid().ToString('N')
  $temporary = Join-Path $WorkRoot "$token.new"
  $displaced = Join-Path $WorkRoot "$token.displaced"
  Write-DurableNewBytes $temporary $Desired 'materialization_write_failed'
  try {
    [IO.File]::Replace($temporary, $Target, $displaced, $true)
    if ((Get-Sha256 $displaced) -cne (Get-BytesSha256 $Expected)) {
      [IO.File]::Replace($displaced, $Target, $temporary, $true)
      throw 'materialization_preserve_all_stop'
    }
    [IO.File]::Delete($displaced)
  } catch {
    if ($_.Exception.Message -ceq 'materialization_preserve_all_stop') { throw }
    throw 'materialization_write_failed'
  }
}

function Invoke-CasCreate([string]$Target, [byte[]]$Desired, [string]$WorkRoot) {
  if (Test-Path -LiteralPath $Target) { throw 'materialization_preserve_all_stop' }
  $parent = [IO.Path]::GetDirectoryName($Target)
  if (-not (Test-Path -LiteralPath $parent -PathType Container)) { [IO.Directory]::CreateDirectory($parent) | Out-Null }
  $temporary = Join-Path $WorkRoot "$([Guid]::NewGuid().ToString('N')).new"
  Write-DurableNewBytes $temporary $Desired 'materialization_write_failed'
  try {
    [IO.File]::Move($temporary, $Target)
  } catch {
    throw 'materialization_preserve_all_stop'
  }
}

function Invoke-CasDelete([string]$Target, [byte[]]$Expected, [string]$WorkRoot) {
  $current = Get-FileBytes $Target 'materialization_preserve_all_stop'
  if ((Get-BytesSha256 $current) -cne (Get-BytesSha256 $Expected)) { throw 'materialization_preserve_all_stop' }
  $displaced = Join-Path $WorkRoot "$([Guid]::NewGuid().ToString('N')).deleted"
  try {
    [IO.File]::Move($Target, $displaced)
    if ((Get-Sha256 $displaced) -cne (Get-BytesSha256 $Expected)) {
      [IO.File]::Move($displaced, $Target)
      throw 'materialization_preserve_all_stop'
    }
    [IO.File]::Delete($displaced)
  } catch {
    if ($_.Exception.Message -ceq 'materialization_preserve_all_stop') { throw }
    throw 'materialization_write_failed'
  }
}

function Get-Property([object]$Value, [string]$Name, [string]$Code) {
  if ($null -eq $Value -or $Value.GetType().Name -ne 'PSCustomObject') { throw $Code }
  $property = $Value.PSObject.Properties[$Name]
  if ($null -eq $property) { throw $Code }
  return $property.Value
}

function Assert-ExactKeys([object]$Value, [string[]]$Keys, [string]$Code) {
  if ($null -eq $Value -or $Value.GetType().Name -ne 'PSCustomObject') { throw $Code }
  $actual = @($Value.PSObject.Properties.Name)
  if ($actual.Count -ne $Keys.Count) { throw $Code }
  foreach ($key in $Keys) { if ($actual -cnotcontains $key) { throw $Code } }
}

function Assert-Decimal([object]$Value, [string]$Code) {
  if ($Value -isnot [string] -or $Value -cnotmatch '^[1-9][0-9]*$') { throw $Code }
}

function Assert-Hex32([object]$Value, [string]$Code) {
  if ($Value -isnot [string] -or $Value -cnotmatch '^[0-9a-f]{32}$') { throw $Code }
}

function Assert-Hex64([object]$Value, [string]$Code) {
  if ($Value -isnot [string] -or $Value -cnotmatch '^[0-9a-f]{64}$') { throw $Code }
}

function Assert-Binding([object]$Value, [string]$Code) {
  Assert-ExactKeys $Value @('pid', 'starttime', 'processName', 'launchNonce', 'runtimeIdentity') $Code
  $processId = Get-Property $Value 'pid' $Code
  if (($processId -isnot [int] -and $processId -isnot [long]) -or $processId -le 0) { throw $Code }
  Assert-Decimal (Get-Property $Value 'starttime' $Code) $Code
  $processName = Get-Property $Value 'processName' $Code
  if ($processName -cne $script:PrimaryProcess -and $processName -cne $script:RemoteProcess) { throw $Code }
  Assert-Hex32 (Get-Property $Value 'launchNonce' $Code) $Code
  Assert-Hex32 (Get-Property $Value 'runtimeIdentity' $Code) $Code
}

function Assert-DistinctBindings([object]$Owner, [object]$Waiter, [string]$Code) {
  Assert-Binding $Owner $Code
  Assert-Binding $Waiter $Code
  foreach ($key in @('pid', 'starttime', 'processName', 'launchNonce', 'runtimeIdentity')) {
    if ((Get-Property $Owner $key $Code) -ceq (Get-Property $Waiter $key $Code)) { throw $Code }
  }
}

function Assert-FreshRelaunch([object]$Previous, [object]$Fresh, [string]$Code) {
  Assert-Binding $Previous $Code
  Assert-Binding $Fresh $Code
  if ((Get-Property $Previous 'processName' $Code) -cne (Get-Property $Fresh 'processName' $Code)) { throw $Code }
  foreach ($key in @('pid', 'starttime', 'launchNonce', 'runtimeIdentity')) {
    if ((Get-Property $Previous $key $Code) -ceq (Get-Property $Fresh $key $Code)) { throw $Code }
  }
}

function Test-SameBinding([object]$Left, [object]$Right, [string]$Code) {
  Assert-Binding $Left $Code
  Assert-Binding $Right $Code
  foreach ($key in @('pid', 'starttime', 'processName', 'launchNonce', 'runtimeIdentity')) {
    if ((Get-Property $Left $key $Code) -cne (Get-Property $Right $key $Code)) { return $false }
  }
  return $true
}

function Assert-ContendedCheckpoint([object]$Payload) {
  $code = 'account_provision_lock_checkpoint_invalid'
  Assert-ExactKeys $Payload @('owner', 'waiter', 'observations', 'events') $code
  $owner = Get-Property $Payload 'owner' $code
  $waiter = Get-Property $Payload 'waiter' $code
  Assert-DistinctBindings $owner $waiter $code
  $observations = @(Get-Property $Payload 'observations' $code)
  if ($observations.Count -ne 2) { throw $code }
  $lastSequence = [double]::NegativeInfinity
  $lastTimestamp = [double]::NegativeInfinity
  foreach ($observation in $observations) {
    Assert-ExactKeys $observation @(
      'sequence', 'timestamp', 'ownerPid', 'ownerStarttime', 'waiterPid', 'waiterStarttime',
      'ownerOwned', 'waiterAcquired', 'ownershipToken'
    ) $code
    Assert-Hex32 (Get-Property $observation 'ownershipToken' $code) $code
    $sequence = [double](Get-Property $observation 'sequence' $code)
    $timestamp = [double](Get-Property $observation 'timestamp' $code)
    if ([double]::IsNaN($sequence) -or [double]::IsInfinity($sequence) -or
        [double]::IsNaN($timestamp) -or [double]::IsInfinity($timestamp) -or
        $sequence -le $lastSequence -or $timestamp -le $lastTimestamp) { throw $code }
    if ((Get-Property $observation 'ownerPid' $code) -ne $owner.pid -or
        (Get-Property $observation 'ownerStarttime' $code) -cne $owner.starttime -or
        (Get-Property $observation 'waiterPid' $code) -ne $waiter.pid -or
        (Get-Property $observation 'waiterStarttime' $code) -cne $waiter.starttime -or
        (Get-Property $observation 'ownerOwned' $code) -ne $true -or
        (Get-Property $observation 'waiterAcquired' $code) -ne $false) { throw $code }
    $lastSequence = $sequence
    $lastTimestamp = $timestamp
  }
  foreach ($event in @(Get-Property $Payload 'events' $code)) {
    Assert-ExactKeys $event @('kind', 'sequence', 'actor') $code
    $kind = Get-Property $event 'kind' $code
    $sequence = [double](Get-Property $event 'sequence' $code)
    $actor = Get-Property $event 'actor' $code
    if ($sequence -le $lastSequence -and (($kind -ceq 'acquired' -and $actor -ceq 'waiter') -or (($kind -ceq 'release_requested' -or $kind -ceq 'control_release') -and $actor -ceq 'owner'))) { throw $code }
  }
  return [pscustomobject][ordered]@{ status = 'pass'; observationCount = 2 }
}

function Assert-KilledWaiterBoundary([object]$Payload) {
  $code = 'account_provision_lock_killed_waiter_invalid'
  Assert-ExactKeys $Payload @('owner', 'waiter', 'events') $code
  $owner = Get-Property $Payload 'owner' $code
  $waiter = Get-Property $Payload 'waiter' $code
  Assert-DistinctBindings $owner $waiter $code
  $disappearance = $null
  $ownerLiveOwned = $null
  $last = [double]::NegativeInfinity
  foreach ($event in @(Get-Property $Payload 'events' $code)) {
    $kind = Get-Property $event 'kind' $code
    if ($kind -ceq 'owner_live_owned') {
      Assert-ExactKeys $event @('kind', 'sequence', 'binding', 'live', 'owns', 'ownershipToken') $code
      Assert-Hex32 (Get-Property $event 'ownershipToken' $code) $code
    } else {
      Assert-ExactKeys $event @('kind', 'sequence', 'binding') $code
    }
    $sequence = [double](Get-Property $event 'sequence' $code)
    if ($sequence -le $last) { throw $code }
    $last = $sequence
    $binding = Get-Property $event 'binding' $code
    if ($kind -ceq 'proc_disappeared' -and (Test-SameBinding $binding $waiter $code)) {
      if ($null -ne $disappearance) { throw $code }
      $disappearance = $sequence
      continue
    }
    if ($null -ne $disappearance -and (Test-SameBinding $binding $waiter $code)) { throw $code }
    if ($kind -ceq 'owner_live_owned') {
      if ($null -eq $disappearance -or $null -ne $ownerLiveOwned -or
          -not (Test-SameBinding $binding $owner $code) -or
          (Get-Property $event 'live' $code) -ne $true -or
          (Get-Property $event 'owns' $code) -ne $true) { throw $code }
      $ownerLiveOwned = $sequence
      continue
    }
    if (($kind -ceq 'release_requested' -or $kind -ceq 'released' -or
         $kind -ceq 'control_release' -or $kind -ceq 'relaunch') -and
        ($null -eq $disappearance -or $null -eq $ownerLiveOwned)) { throw $code }
  }
  if ($null -eq $disappearance -or $null -eq $ownerLiveOwned) { throw $code }
  return [pscustomobject][ordered]@{
    status = 'pass'
    procDisappearanceSequence = $disappearance
    ownerLiveOwnedSequence = $ownerLiveOwned
  }
}

function Assert-StaleLockEvidence([object]$Payload) {
  $code = 'account_provision_lock_stale_file_invalid'
  Assert-ExactKeys $Payload @('staleLockFilePresent', 'identity', 'noBackupFilesDir', 'acquisitionSequence', 'facts') $code
  if ((Get-Property $Payload 'staleLockFilePresent' $code) -ne $true) { throw $code }
  $identity = Get-Property $Payload 'identity' $code
  $noBackupFilesDir = Get-Property $Payload 'noBackupFilesDir' $code
  if ($identity -cne 'x' -or $noBackupFilesDir -cne '/data/user/0/app.phraseman/no_backup') { throw $code }
  $databaseName = 'accounts-v2-g-' + ('a' * 64) + '.db'
  $expectedPath = "$noBackupFilesDir/account-sqlite-provision-locks/$databaseName.provision.lock"
  $expectedPathHash = Get-BytesSha256 ([Text.Encoding]::UTF8.GetBytes($expectedPath))
  $acquisition = [double](Get-Property $Payload 'acquisitionSequence' $code)
  $facts = @(Get-Property $Payload 'facts' $code)
  if ($facts.Count -ne 2) { throw $code }
  $expected = @('before_acquire', 'while_acquired')
  $pathHash = $null
  $sequences = @()
  for ($index = 0; $index -lt 2; $index += 1) {
    $fact = $facts[$index]
    Assert-ExactKeys $fact @('checkpoint', 'sequence', 'identity', 'pathHash', 'exists', 'kind', 'symlink') $code
    if ((Get-Property $fact 'checkpoint' $code) -cne $expected[$index] -or
        (Get-Property $fact 'identity' $code) -cne $identity -or
        (Get-Property $fact 'exists' $code) -ne $true -or
        (Get-Property $fact 'kind' $code) -cne 'regular' -or
        (Get-Property $fact 'symlink' $code) -ne $false) { throw $code }
    $currentHash = Get-Property $fact 'pathHash' $code
    Assert-Hex64 $currentHash $code
    if ($currentHash -cne $expectedPathHash) { throw $code }
    if ($null -ne $pathHash -and $pathHash -cne $currentHash) { throw $code }
    $pathHash = $currentHash
    $sequences += [double](Get-Property $fact 'sequence' $code)
  }
  if ($sequences[0] -ge $acquisition -or $acquisition -ge $sequences[1]) { throw $code }
  return [pscustomobject][ordered]@{ status = 'pass'; staleLockFilePresent = $true; pathHash = $pathHash }
}

function Assert-Timeline([object]$Payload) {
  $code = 'account_provision_lock_timeline_invalid'
  Assert-ExactKeys $Payload @('events') $code
  $owners = @{}
  $last = [double]::NegativeInfinity
  foreach ($event in @(Get-Property $Payload 'events' $code)) {
    Assert-ExactKeys $event @('kind', 'sequence', 'identity', 'ownerKey') $code
    $sequence = [double](Get-Property $event 'sequence' $code)
    if ($sequence -le $last) { throw $code }
    $last = $sequence
    $identity = Get-Property $event 'identity' $code
    if ($identity -cne 'x' -and $identity -cne 'y') { throw $code }
    $kind = Get-Property $event 'kind' $code
    $ownerKey = Get-Property $event 'ownerKey' $code
    if ($kind -ceq 'acquired') {
      if ($owners.ContainsKey($identity) -and $owners[$identity] -cne $ownerKey) { throw 'account_provision_lock_overlap' }
      $owners[$identity] = $ownerKey
    } elseif (($kind -ceq 'released' -or $kind -ceq 'proc_disappeared') -and $owners[$identity] -ceq $ownerKey) {
      $owners.Remove($identity)
    }
  }
  return [pscustomobject][ordered]@{ status = 'pass' }
}

function Assert-PhaseSimpleEvent([object]$Event, [string]$Kind, [object]$Binding, [string]$Identity, [string]$Code) {
  Assert-ExactKeys $Event @('kind', 'sequence', 'timestamp', 'identity', 'binding') $Code
  if ((Get-Property $Event 'kind' $Code) -cne $Kind -or
      (Get-Property $Event 'identity' $Code) -cne $Identity -or
      -not (Test-SameBinding (Get-Property $Event 'binding' $Code) $Binding $Code)) { throw $Code }
}

function Assert-PhaseObservation([object]$Event, [object]$Owner, [object]$Waiter, [string]$Code) {
  Assert-ExactKeys $Event @(
    'kind', 'sequence', 'timestamp', 'identity', 'binding', 'waiter',
    'ownerLive', 'ownerReportsOwnership', 'waiterLive', 'waiterAcquired', 'ownershipToken'
  ) $Code
  Assert-Hex32 (Get-Property $Event 'ownershipToken' $Code) $Code
  if ((Get-Property $Event 'kind' $Code) -cne 'contended_observation' -or
      (Get-Property $Event 'identity' $Code) -cne 'x' -or
      -not (Test-SameBinding (Get-Property $Event 'binding' $Code) $Owner $Code) -or
      -not (Test-SameBinding (Get-Property $Event 'waiter' $Code) $Waiter $Code) -or
      (Get-Property $Event 'ownerLive' $Code) -ne $true -or
      (Get-Property $Event 'ownerReportsOwnership' $Code) -ne $true -or
      (Get-Property $Event 'waiterLive' $Code) -ne $true -or
      (Get-Property $Event 'waiterAcquired' $Code) -ne $false) { throw $Code }
}

function Assert-PhaseOwnershipEvent([object]$Event, [object]$Owner, [string]$Code) {
  Assert-ExactKeys $Event @('kind', 'sequence', 'timestamp', 'identity', 'binding', 'live', 'owns', 'ownershipToken') $Code
  Assert-Hex32 (Get-Property $Event 'ownershipToken' $Code) $Code
  if ((Get-Property $Event 'kind' $Code) -cne 'owner_live_owned' -or
      (Get-Property $Event 'identity' $Code) -cne 'x' -or
      -not (Test-SameBinding (Get-Property $Event 'binding' $Code) $Owner $Code) -or
      (Get-Property $Event 'live' $Code) -ne $true -or (Get-Property $Event 'owns' $Code) -ne $true) { throw $Code }
}

function Assert-PhaseTranscript([object]$Payload) {
  $code = 'account_provision_lock_phase_invalid'
  Assert-ExactKeys $Payload @('phase', 'events') $code
  $phase = Get-Property $Payload 'phase' $code
  if ($script:PhaseNames -cnotcontains $phase) { throw $code }
  $events = @(Get-Property $Payload 'events' $code)
  if ($events.Count -eq 0) { throw $code }
  $knownKinds = @(
    'attempted', 'acquired', 'release_requested', 'released', 'pass',
    'control_release', 'sigkill_sent', 'proc_disappeared', 'owner_live_owned',
    'contended_observation', 'killed_waiter_control_rejected', 'relaunch',
    'stale_lstat_before', 'stale_lstat_while_owned'
  )
  $lastSequence = [double]::NegativeInfinity
  $lastTimestamp = [double]::NegativeInfinity
  foreach ($event in $events) {
    $kind = Get-Property $event 'kind' $code
    if ($knownKinds -cnotcontains $kind) { throw $code }
    $sequence = [double](Get-Property $event 'sequence' $code)
    $timestamp = [double](Get-Property $event 'timestamp' $code)
    if ([double]::IsNaN($sequence) -or [double]::IsInfinity($sequence) -or
        [double]::IsNaN($timestamp) -or [double]::IsInfinity($timestamp) -or
        $sequence -le $lastSequence -or $timestamp -le $lastTimestamp) { throw $code }
    $identity = Get-Property $event 'identity' $code
    if ($identity -cne 'x' -and $identity -cne 'y') { throw $code }
    Assert-Binding (Get-Property $event 'binding' $code) $code
    $lastSequence = $sequence
    $lastTimestamp = $timestamp
  }
  $owner = Get-Property $events[0] 'binding' $code
  $attemptedAfterOwner = @($events | Select-Object -Skip 1 | Where-Object { (Get-Property $_ 'kind' $code) -ceq 'attempted' })
  if ($attemptedAfterOwner.Count -eq 0) { throw $code }
  $waiter = Get-Property $attemptedAfterOwner[0] 'binding' $code
  if ($phase -cne 'stale-file') { Assert-DistinctBindings $owner $waiter $code }

  if ($phase -ceq 'primary-holder-secondary-waiter' -or $phase -ceq 'secondary-holder-primary-waiter') {
    if ($events.Count -ne 13) { throw $code }
    $expectedOwnerProcess = if ($phase -ceq 'primary-holder-secondary-waiter') { $script:PrimaryProcess } else { $script:RemoteProcess }
    $expectedWaiterProcess = if ($phase -ceq 'primary-holder-secondary-waiter') { $script:RemoteProcess } else { $script:PrimaryProcess }
    if ($owner.processName -cne $expectedOwnerProcess -or $waiter.processName -cne $expectedWaiterProcess) { throw $code }
    Assert-PhaseSimpleEvent $events[0] 'attempted' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[1] 'acquired' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[2] 'attempted' $waiter 'x' $code
    Assert-PhaseObservation $events[3] $owner $waiter $code
    Assert-PhaseObservation $events[4] $owner $waiter $code
    Assert-PhaseSimpleEvent $events[5] 'control_release' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[6] 'release_requested' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[7] 'released' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[8] 'pass' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[9] 'acquired' $waiter 'x' $code
    Assert-PhaseSimpleEvent $events[10] 'release_requested' $waiter 'x' $code
    Assert-PhaseSimpleEvent $events[11] 'released' $waiter 'x' $code
    Assert-PhaseSimpleEvent $events[12] 'pass' $waiter 'x' $code
  } elseif ($phase -ceq 'holder-death') {
    if ($events.Count -ne 10) { throw $code }
    Assert-PhaseSimpleEvent $events[0] 'attempted' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[1] 'acquired' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[2] 'attempted' $waiter 'x' $code
    Assert-PhaseOwnershipEvent $events[3] $owner $code
    $kinds = @('sigkill_sent', 'proc_disappeared', 'acquired', 'release_requested', 'released', 'pass')
    $actors = @($owner, $owner, $waiter, $waiter, $waiter, $waiter)
    for ($index = 0; $index -lt $kinds.Count; $index += 1) {
      Assert-PhaseSimpleEvent $events[$index + 4] $kinds[$index] $actors[$index] 'x' $code
    }
  } elseif ($phase -ceq 'waiter-death') {
    if ($events.Count -ne 19) { throw $code }
    Assert-PhaseSimpleEvent $events[0] 'attempted' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[1] 'acquired' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[2] 'attempted' $waiter 'x' $code
    Assert-PhaseObservation $events[3] $owner $waiter $code
    Assert-PhaseObservation $events[4] $owner $waiter $code
    Assert-PhaseSimpleEvent $events[5] 'sigkill_sent' $waiter 'x' $code
    Assert-PhaseSimpleEvent $events[6] 'proc_disappeared' $waiter 'x' $code
    Assert-PhaseOwnershipEvent $events[7] $owner $code
    Assert-PhaseSimpleEvent $events[8] 'killed_waiter_control_rejected' $waiter 'x' $code
    Assert-PhaseSimpleEvent $events[9] 'control_release' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[10] 'release_requested' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[11] 'released' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[12] 'pass' $owner 'x' $code
    $fresh = Get-Property $events[13] 'binding' $code
    Assert-DistinctBindings $owner $fresh $code
    Assert-FreshRelaunch $waiter $fresh $code
    Assert-PhaseSimpleEvent $events[13] 'relaunch' $fresh 'x' $code
    $freshKinds = @('attempted', 'acquired', 'release_requested', 'released', 'pass')
    for ($index = 0; $index -lt $freshKinds.Count; $index += 1) {
      Assert-PhaseSimpleEvent $events[$index + 14] $freshKinds[$index] $fresh 'x' $code
    }
  } elseif ($phase -ceq 'independent-identities') {
    if ($events.Count -ne 12) { throw $code }
    $spec = @(
      @('attempted', $owner, 'x'), @('acquired', $owner, 'x'),
      @('attempted', $waiter, 'y'), @('acquired', $waiter, 'y'),
      @('release_requested', $waiter, 'y'), @('released', $waiter, 'y'), @('pass', $waiter, 'y')
    )
    for ($index = 0; $index -lt $spec.Count; $index += 1) {
      Assert-PhaseSimpleEvent $events[$index] $spec[$index][0] $spec[$index][1] $spec[$index][2] $code
    }
    Assert-PhaseOwnershipEvent $events[7] $owner $code
    $tail = @(
      @('control_release', $owner, 'x'), @('release_requested', $owner, 'x'),
      @('released', $owner, 'x'), @('pass', $owner, 'x')
    )
    for ($index = 0; $index -lt $tail.Count; $index += 1) {
      Assert-PhaseSimpleEvent $events[$index + 8] $tail[$index][0] $tail[$index][1] $tail[$index][2] $code
    }
  } else {
    if ($events.Count -ne 15) { throw $code }
    $databaseName = 'accounts-v2-g-' + ('a' * 64) + '.db'
    $expectedPath = "/data/user/0/app.phraseman/no_backup/account-sqlite-provision-locks/$databaseName.provision.lock"
    $expectedHash = Get-BytesSha256 ([Text.Encoding]::UTF8.GetBytes($expectedPath))
    Assert-PhaseSimpleEvent $events[0] 'attempted' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[1] 'acquired' $owner 'x' $code
    Assert-PhaseOwnershipEvent $events[2] $owner $code
    Assert-PhaseSimpleEvent $events[3] 'sigkill_sent' $owner 'x' $code
    Assert-PhaseSimpleEvent $events[4] 'proc_disappeared' $owner 'x' $code
    Assert-ExactKeys $events[5] @('kind', 'sequence', 'timestamp', 'identity', 'binding', 'pathHash', 'exists', 'fileKind', 'symlink') $code
    if ((Get-Property $events[5] 'kind' $code) -cne 'stale_lstat_before' -or
        (Get-Property $events[5] 'pathHash' $code) -cne $expectedHash -or
        (Get-Property $events[5] 'exists' $code) -ne $true -or (Get-Property $events[5] 'fileKind' $code) -cne 'regular' -or
        (Get-Property $events[5] 'symlink' $code) -ne $false) { throw $code }
    $fresh = Get-Property $events[6] 'binding' $code
    Assert-FreshRelaunch $owner $fresh $code
    Assert-PhaseSimpleEvent $events[6] 'relaunch' $fresh 'x' $code
    Assert-PhaseSimpleEvent $events[7] 'attempted' $fresh 'x' $code
    Assert-PhaseSimpleEvent $events[8] 'acquired' $fresh 'x' $code
    Assert-ExactKeys $events[9] @('kind', 'sequence', 'timestamp', 'identity', 'binding', 'pathHash', 'exists', 'fileKind', 'symlink') $code
    if ((Get-Property $events[9] 'kind' $code) -cne 'stale_lstat_while_owned' -or
        -not (Test-SameBinding (Get-Property $events[9] 'binding' $code) $fresh $code) -or
        (Get-Property $events[9] 'pathHash' $code) -cne $expectedHash -or
        (Get-Property $events[9] 'exists' $code) -ne $true -or (Get-Property $events[9] 'fileKind' $code) -cne 'regular' -or
        (Get-Property $events[9] 'symlink' $code) -ne $false) { throw $code }
    Assert-PhaseOwnershipEvent $events[10] $fresh $code
    $tailKinds = @('control_release', 'release_requested', 'released', 'pass')
    for ($index = 0; $index -lt $tailKinds.Count; $index += 1) {
      Assert-PhaseSimpleEvent $events[$index + 11] $tailKinds[$index] $fresh 'x' $code
    }
  }
  return [pscustomobject][ordered]@{ status = 'pass'; phase = $phase; eventCount = $events.Count }
}

function Test-ApkCleanupRecheckRequired([object]$InstallState) {
  return $InstallState -isnot [string] -or $InstallState -cne 'not_attempted'
}

function Assert-CleanupModel([object]$Payload) {
  Assert-ExactKeys $Payload @('failures', 'apkInstallState') 'cleanup_model_invalid'
  $failures = @(Get-Property $Payload 'failures' 'cleanup_model_invalid')
  $apkInstallState = Get-Property $Payload 'apkInstallState' 'cleanup_model_invalid'
  if ($apkInstallState -isnot [string]) { throw 'cleanup_model_invalid' }
  $attempted = @(
    'app-stop', 'reverse-remove', 'metro-stop', 'package-restore', 'android-restore',
    'apk-recheck', 'temp-delete', 'repository-check', 'source-check', 'evidence-finalize'
  )
  foreach ($failure in $failures) { if ($attempted -cnotcontains $failure) { throw 'cleanup_model_invalid' } }
  return [pscustomobject][ordered]@{
    status = 'pass'
    attempted = $attempted
    cleanupPassed = $failures.Count -eq 0
    failures = $failures
    apkRecheckRequired = Test-ApkCleanupRecheckRequired $apkInstallState
  }
}

function Get-OwnedPathFacts(
  [string]$Root,
  [object[]]$RelativePaths,
  [string]$Code
) {
  $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd(
    [IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar
  )
  if (-not (Test-Path -LiteralPath $rootFull -PathType Container) -or
      $RelativePaths.Count -eq 0 -or $RelativePaths.Count -gt 32) { throw $Code }
  $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $facts = @()
  foreach ($candidate in $RelativePaths) {
    if ($candidate -isnot [string] -or [string]::IsNullOrWhiteSpace($candidate) -or
        [IO.Path]::IsPathRooted($candidate) -or $candidate.Contains('\') -or
        $candidate -cnotmatch '^[A-Za-z0-9._+/-]+$') { throw $Code }
    $segments = @($candidate.Split('/'))
    if ($segments.Count -eq 0 -or @($segments | Where-Object { $_ -ceq '' -or $_ -ceq '.' -or $_ -ceq '..' }).Count -ne 0 -or
        -not $seen.Add($candidate)) { throw $Code }
    $full = Assert-DescendantPath $rootFull (Join-Path $rootFull $candidate) $Code
    if (-not (Test-Path -LiteralPath $full)) {
      $facts += [pscustomobject][ordered]@{ name = $candidate; kind = 'absent'; length = [long]0; sha256 = $null }
      continue
    }
    $item = Get-Item -LiteralPath $full -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw $Code }
    if ($item.PSIsContainer) {
      $facts += [pscustomobject][ordered]@{ name = $candidate; kind = 'directory'; length = [long]0; sha256 = $null }
      continue
    }
    $facts += [pscustomobject][ordered]@{
      name = $candidate; kind = 'file'; length = [long]$item.Length; sha256 = Get-Sha256 $full
    }
  }
  return $facts
}

function Assert-OwnedPathFactsEqual([object[]]$Expected, [object[]]$Actual, [string]$Code) {
  if (($Expected | ConvertTo-Json -Depth 6 -Compress) -cne
      ($Actual | ConvertTo-Json -Depth 6 -Compress)) { throw $Code }
}

function Assert-PlainDescendantFile(
  [string]$Root,
  [string]$RelativePath,
  [string]$Code
) {
  $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd(
    [IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar
  )
  $full = Assert-DescendantPath $rootFull (Join-Path $rootFull $RelativePath) $Code
  if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw $Code }
  $item = Get-Item -LiteralPath $full -Force
  if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw $Code }
  $directory = $item.Directory
  while ($null -ne $directory) {
    if (($directory.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw $Code }
    if ($directory.FullName.TrimEnd(
        [IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar
      ).Equals($rootFull, [StringComparison]::OrdinalIgnoreCase)) { return $full }
    $directory = $directory.Parent
  }
  throw $Code
}

function Get-ActivatedNativeProvenanceFacts(
  [string]$Root,
  [string]$Code,
  [string]$VersionCode
) {
  $facts = @()
  foreach ($relative in $script:ActivatedNativeInputs) {
    $full = Assert-PlainDescendantFile $Root $relative $Code
    $item = Get-Item -LiteralPath $full -Force
    $facts += [pscustomobject][ordered]@{
      name = $relative
      kind = 'file'
      length = [long]$item.Length
      sha256 = Get-Sha256 $full
    }
  }
  $packagePath = Join-Path $Root $script:ActivatedNativeInputs[1]
  $packageBytes = Get-FileBytes $packagePath $Code
  try {
    $packageRaw = [Text.UTF8Encoding]::new($false, $true).GetString($packageBytes)
    $package = $packageRaw | ConvertFrom-Json
  } catch { throw $VersionCode }
  if ($null -eq $package -or $package.GetType().Name -ne 'PSCustomObject' -or
      $null -eq $package.PSObject.Properties['version'] -or
      $package.version -isnot [string] -or $package.version -cne $script:ActivatedNativeExpectedVersion) {
    throw $VersionCode
  }
  return [pscustomobject][ordered]@{
    schemaVersion = 1
    packageVersion = [string]$package.version
    inputs = @($facts)
  }
}

function Assert-ActivatedNativeProvenanceCandidate([object]$Facts, [string]$Code) {
  if ($null -eq $Facts -or $Facts.GetType().Name -ne 'PSCustomObject') { throw $Code }
  Assert-ExactKeys $Facts @('schemaVersion', 'packageVersion', 'inputs') $Code
  if ($Facts.schemaVersion -ne 1 -or $Facts.packageVersion -cne $script:ActivatedNativeExpectedVersion) { throw $Code }
  Assert-OwnedPathFactsEqual @($script:ActivatedNativeExpected) @($Facts.inputs) $Code
}

function Assert-ActivatedNativeProvenanceEqual([object]$Expected, [object]$Actual, [string]$Code) {
  if (($Expected | ConvertTo-Json -Depth 8 -Compress) -cne
      ($Actual | ConvertTo-Json -Depth 8 -Compress)) { throw $Code }
}

function Assert-ActivatedNativeProvenanceModel([object]$Payload) {
  $modelCode = 'activated_native_provenance_model_invalid'
  Assert-ExactKeys $Payload @('sandboxRoot', 'expectedFacts', 'stage') $modelCode
  $root = [string](Get-Property $Payload 'sandboxRoot' $modelCode)
  $stage = Get-Property $Payload 'stage' $modelCode
  $expected = Get-Property $Payload 'expectedFacts' $modelCode
  if ($stage -ceq 'preflight') {
    if ($null -ne $expected) { throw $modelCode }
    $facts = Get-ActivatedNativeProvenanceFacts `
      $root 'activated_native_provenance_invalid' 'activated_native_package_version_invalid'
    Assert-ActivatedNativeProvenanceCandidate $facts 'activated_native_provenance_invalid'
  } else {
    $failureCode = switch ($stage) {
      'build' { 'activated_native_provenance_build_drift' }
      'cleanup' { 'repository_drift' }
      'post-publication' { 'post_publication_repository_snapshot_failed' }
      default { throw $modelCode }
    }
    if ($null -eq $expected) { throw $modelCode }
    $facts = Get-ActivatedNativeProvenanceFacts $root $failureCode $failureCode
    Assert-ActivatedNativeProvenanceEqual $expected $facts $failureCode
  }
  return [pscustomobject][ordered]@{ status = 'pass'; facts = $facts }
}

function Assert-ExactStringCollection([object[]]$Actual, [string[]]$Expected, [string]$Code) {
  $values = @($Actual)
  if ($values.Count -ne $Expected.Count) { throw $Code }
  $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  foreach ($value in $values) {
    if ($value -isnot [string] -or -not $seen.Add([string]$value)) { throw $Code }
  }
  foreach ($value in $Expected) { if (-not $seen.Contains($value)) { throw $Code } }
}

function Assert-ApkDexSurfaceModel([object]$Payload) {
  $code = 'apk_dex_surface_invalid'
  Assert-ExactKeys $Payload @('dexEntries') $code
  $entries = @(Get-Property $Payload 'dexEntries' $code)
  if ($entries.Count -eq 0 -or $entries.Count -gt 64) { throw $code }
  $names = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $bindingNames = @()
  foreach ($entry in $entries) {
    Assert-ExactKeys $entry @('name', 'valid', 'strings', 'classDescriptors', 'methods') $code
    $name = Get-Property $entry 'name' $code
    if ($name -isnot [string] -or $name -cnotmatch '^classes(?:[2-9]|[1-9][0-9]+)?\.dex$' -or
        -not $names.Add([string]$name) -or (Get-Property $entry 'valid' $code) -ne $true) { throw $code }
    $strings = @(Get-Property $entry 'strings' $code)
    $classes = @(Get-Property $entry 'classDescriptors' $code)
    $methods = @(Get-Property $entry 'methods' $code)
    $isBinding = $strings.Count -eq 2 -and $classes.Count -eq 2 -and $methods.Count -eq 1
    if ($isBinding) {
      Assert-ExactStringCollection $strings @('acquireAccountProvisionLockAsync', 'releaseAsync') $code
      Assert-ExactStringCollection $classes @(
        'Lexpo/modules/sqlite/SQLiteModule;',
        'Lexpo/modules/sqlite/NativeAccountProvisionLock;'
      ) $code
      Assert-ExactStringCollection $methods @(
        'Lexpo/modules/sqlite/SQLiteModule;->acquireAccountProvisionLock(Ljava/lang/String;)' +
          'Lexpo/modules/sqlite/NativeAccountProvisionLock;'
      ) $code
      $bindingNames += [string]$name
    } elseif ($strings.Count -gt 0 -or $classes.Count -gt 0 -or $methods.Count -gt 0) { throw $code }
  }
  if (-not $names.Contains('classes.dex') -or $bindingNames.Count -ne 1) { throw $code }
  return [pscustomobject][ordered]@{
    schemaVersion = 1
    status = 'pass'
    dexEntryCount = $entries.Count
    bindingDexName = $bindingNames[0]
    acquireSurface = $true
    nativeHandleClass = $true
    releaseSurface = $true
    sqliteModuleImplementation = $true
  }
}

function Get-DexUInt16([byte[]]$Bytes, [int]$Offset, [string]$Code) {
  if ($Offset -lt 0 -or ([long]$Offset + 2) -gt $Bytes.LongLength) { throw $Code }
  return [BitConverter]::ToUInt16($Bytes, $Offset)
}

function Get-DexUInt32([byte[]]$Bytes, [int]$Offset, [string]$Code) {
  if ($Offset -lt 0 -or ([long]$Offset + 4) -gt $Bytes.LongLength) { throw $Code }
  return [BitConverter]::ToUInt32($Bytes, $Offset)
}

function Assert-DexTableRange(
  [byte[]]$Bytes,
  [uint32]$Count,
  [uint32]$Offset,
  [int]$Width,
  [string]$Code
) {
  if ($Count -eq 0) {
    if ($Offset -ne 0) { throw $Code }
    return
  }
  if ($Offset -lt 112 -or ([long]$Offset + ([long]$Count * $Width)) -gt $Bytes.LongLength) { throw $Code }
}

function Get-DexAsciiString([byte[]]$Bytes, [uint32]$Offset, [string]$Code) {
  if ($Offset -ge $Bytes.Length) { throw $Code }
  $cursor = [int]$Offset
  $ulebComplete = $false
  for ($index = 0; $index -lt 5; $index += 1) {
    if ($cursor -ge $Bytes.Length) { throw $Code }
    $current = $Bytes[$cursor]
    $cursor += 1
    if (($current -band 0x80) -eq 0) { $ulebComplete = $true; break }
  }
  if (-not $ulebComplete) { throw $Code }
  $start = $cursor
  $ascii = $true
  while ($cursor -lt $Bytes.Length -and ([long]$cursor - $start) -le 1048576) {
    $current = $Bytes[$cursor]
    if ($current -eq 0) {
      if (-not $ascii) { return $null }
      return [Text.Encoding]::ASCII.GetString($Bytes, $start, $cursor - $start)
    }
    if ($current -gt 127) { $ascii = $false }
    $cursor += 1
  }
  throw $Code
}

function Read-DexUleb128([byte[]]$Bytes, [int]$Offset, [string]$Code) {
  if ($Offset -lt 0 -or $Offset -ge $Bytes.Length) { throw $Code }
  [uint64]$value = 0
  $cursor = $Offset
  for ($index = 0; $index -lt 5; $index += 1) {
    if ($cursor -ge $Bytes.Length) { throw $Code }
    [uint64]$current = $Bytes[$cursor]
    $cursor += 1
    $value = $value -bor (($current -band 0x7f) -shl (7 * $index))
    if (($current -band 0x80) -eq 0) {
      if ($value -gt [uint32]::MaxValue) { throw $Code }
      return [pscustomobject][ordered]@{ value = [uint32]$value; next = $cursor }
    }
  }
  throw $Code
}

function Assert-DexIntegrity([byte[]]$Bytes, [string]$Code) {
  if ($null -eq ('AccountProvisionLockDexIntegrity' -as [type])) {
    try {
      Add-Type -TypeDefinition @'
using System;
using System.Security.Cryptography;

public static class AccountProvisionLockDexIntegrity {
  public static bool IsValid(byte[] bytes) {
    if (bytes == null || bytes.Length < 112) return false;
    using (SHA1 sha1 = SHA1.Create()) {
      byte[] signature = sha1.ComputeHash(bytes, 32, bytes.Length - 32);
      for (int index = 0; index < signature.Length; index += 1) {
        if (bytes[12 + index] != signature[index]) return false;
      }
    }
    uint a = 1;
    uint b = 0;
    for (int index = 12; index < bytes.Length; index += 1) {
      a = (a + bytes[index]) % 65521;
      b = (b + a) % 65521;
    }
    uint expected = (uint)(bytes[8] | (bytes[9] << 8) | (bytes[10] << 16) | (bytes[11] << 24));
    return expected == ((b << 16) | a);
  }
}
'@ -ErrorAction Stop
    } catch { throw $Code }
  }
  if (-not [AccountProvisionLockDexIntegrity]::IsValid($Bytes)) { throw $Code }
}

function Read-DexSleb128([byte[]]$Bytes, [int]$Offset, [string]$Code) {
  if ($Offset -lt 0 -or $Offset -ge $Bytes.Length) { throw $Code }
  [int64]$value = 0
  $cursor = $Offset
  $shift = 0
  for ($index = 0; $index -lt 5; $index += 1) {
    if ($cursor -ge $Bytes.Length) { throw $Code }
    [int64]$current = $Bytes[$cursor]
    $cursor += 1
    $value = $value -bor (($current -band 0x7f) -shl $shift)
    $shift += 7
    if (($current -band 0x80) -eq 0) {
      if (($current -band 0x40) -ne 0) { $value = $value -bor (-1L -shl $shift) }
      if ($value -lt [int32]::MinValue -or $value -gt [int32]::MaxValue) { throw $Code }
      return [pscustomobject][ordered]@{ value = [int32]$value; next = $cursor }
    }
  }
  throw $Code
}

function Assert-DexMapSection(
  [object]$MapInfo,
  [int]$Type,
  [uint32]$Count,
  [uint32]$Offset,
  [int]$Width,
  [string]$Code
) {
  $present = $MapInfo.entries.ContainsKey($Type)
  if ($Count -eq 0) {
    if ($Offset -ne 0 -or $present) { throw $Code }
    return
  }
  if (-not $present) { throw $Code }
  $entry = $MapInfo.entries[$Type]
  if ($entry.size -ne $Count -or $entry.offset -ne $Offset -or
      ([uint64]$Offset + ([uint64]$Count * $Width)) -gt [uint64]$MapInfo.bytesLength) { throw $Code }
}

function Get-DexMapInfo([byte[]]$Bytes, [string]$Code) {
  $mapOffset = Get-DexUInt32 $Bytes 52 $Code
  $dataSize = Get-DexUInt32 $Bytes 104 $Code
  $dataOffset = Get-DexUInt32 $Bytes 108 $Code
  if ($mapOffset -lt 112 -or ($mapOffset -band 3) -ne 0 -or
      $dataOffset -lt 112 -or ($dataOffset -band 3) -ne 0 -or $dataSize -eq 0 -or
      ([uint64]$dataOffset + $dataSize) -ne [uint64]$Bytes.LongLength -or
      $mapOffset -lt $dataOffset -or ([uint64]$mapOffset + 4) -gt [uint64]$Bytes.LongLength) { throw $Code }
  $mapCount = Get-DexUInt32 $Bytes ([int]$mapOffset) $Code
  [uint64]$mapListEnd = [uint64]$mapOffset + 4 + ([uint64]$mapCount * 12)
  if ($mapCount -eq 0 -or $mapCount -gt 65536 -or
      $mapListEnd -gt [uint64]$Bytes.LongLength) { throw $Code }

  $entries = [Collections.Generic.Dictionary[int,object]]::new()
  $items = [Collections.Generic.List[object]]::new()
  [int64]$priorOffset = -1
  [uint64]$priorMinimumEnd = 0
  $knownTypes = @(
    0x0000, 0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007, 0x0008,
    0x1000, 0x1001, 0x1002, 0x1003,
    0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0xf000
  )
  for ($index = 0; $index -lt $mapCount; $index += 1) {
    $itemOffset = [int]($mapOffset + 4 + ($index * 12))
    $type = [int](Get-DexUInt16 $Bytes $itemOffset $Code)
    $unused = Get-DexUInt16 $Bytes ($itemOffset + 2) $Code
    $size = Get-DexUInt32 $Bytes ($itemOffset + 4) $Code
    $offset = Get-DexUInt32 $Bytes ($itemOffset + 8) $Code
    if ($knownTypes -notcontains $type -or $unused -ne 0 -or $size -eq 0 -or
        $entries.ContainsKey($type) -or $offset -ge $Bytes.Length -or
        [int64]$offset -le $priorOffset -or [uint64]$offset -lt $priorMinimumEnd) { throw $Code }
    $alignment = if ($type -in @(0x2000, 0x2002, 0x2003, 0x2004, 0x2005, 0xf000)) { 1 } else { 4 }
    if (($offset % $alignment) -ne 0) { throw $Code }
    $minimumWidth = switch ($type) {
      0x0000 { 112 }
      0x0001 { 4 }
      0x0002 { 4 }
      0x0003 { 12 }
      0x0004 { 8 }
      0x0005 { 8 }
      0x0006 { 32 }
      0x0007 { 4 }
      0x0008 { 8 }
      0x1000 { 0 }
      0x1001 { 4 }
      0x1002 { 4 }
      0x1003 { 4 }
      0x2000 { 4 }
      0x2001 { 16 }
      0x2002 { 2 }
      0x2003 { 3 }
      0x2004 { 3 }
      0x2005 { 1 }
      0x2006 { 16 }
      default { 1 }
    }
    $minimumEnd = if ($type -eq 0x1000) {
      $mapListEnd
    } else {
      [uint64]$offset + ([uint64]$size * $minimumWidth)
    }
    if ($minimumEnd -gt [uint64]$Bytes.LongLength) { throw $Code }
    $entry = [pscustomobject][ordered]@{ type = $type; size = $size; offset = $offset }
    $entries.Add($type, $entry)
    $items.Add($entry)
    $priorOffset = $offset
    $priorMinimumEnd = $minimumEnd
  }
  for ($index = 0; $index -lt $items.Count; $index += 1) {
    $end = if (($index + 1) -lt $items.Count) { [uint32]$items[$index + 1].offset } else { [uint32]$Bytes.Length }
    $items[$index] | Add-Member -NotePropertyName end -NotePropertyValue $end
  }
  $info = [pscustomobject][ordered]@{
    entries = $entries
    items = $items
    bytesLength = [uint32]$Bytes.Length
    dataOffset = $dataOffset
    mapOffset = $mapOffset
  }
  if (-not $entries.ContainsKey(0x1000) -or $entries[0x1000].size -ne 1 -or
      $entries[0x1000].offset -ne $mapOffset) { throw $Code }
  Assert-DexMapSection $info 0x0000 1 0 112 $Code
  foreach ($spec in @(
    [pscustomobject]@{ type = 0x0001; count = Get-DexUInt32 $Bytes 56 $Code; offset = Get-DexUInt32 $Bytes 60 $Code; width = 4 },
    [pscustomobject]@{ type = 0x0002; count = Get-DexUInt32 $Bytes 64 $Code; offset = Get-DexUInt32 $Bytes 68 $Code; width = 4 },
    [pscustomobject]@{ type = 0x0003; count = Get-DexUInt32 $Bytes 72 $Code; offset = Get-DexUInt32 $Bytes 76 $Code; width = 12 },
    [pscustomobject]@{ type = 0x0004; count = Get-DexUInt32 $Bytes 80 $Code; offset = Get-DexUInt32 $Bytes 84 $Code; width = 8 },
    [pscustomobject]@{ type = 0x0005; count = Get-DexUInt32 $Bytes 88 $Code; offset = Get-DexUInt32 $Bytes 92 $Code; width = 8 },
    [pscustomobject]@{ type = 0x0006; count = Get-DexUInt32 $Bytes 96 $Code; offset = Get-DexUInt32 $Bytes 100 $Code; width = 32 }
  )) {
    Assert-DexMapSection $info $spec.type $spec.count $spec.offset $spec.width $Code
  }
  return $info
}

function Assert-DexMappedOffset(
  [object]$MapInfo,
  [int]$Type,
  [uint32]$Offset,
  [int]$Alignment,
  [string]$Code
) {
  if (-not $MapInfo.entries.ContainsKey($Type)) { throw $Code }
  $entry = $MapInfo.entries[$Type]
  if ($Offset -lt $entry.offset -or $Offset -ge $entry.end -or ($Offset % $Alignment) -ne 0) { throw $Code }
}

function Assert-DexCodeItem(
  [byte[]]$Bytes,
  [uint32]$Offset,
  [uint32]$TypeCount,
  [uint32]$SectionEnd,
  [string]$Code
) {
  if ($Offset -eq 0 -or ($Offset -band 3) -ne 0 -or
      ([uint64]$Offset + 16) -gt [uint64]$SectionEnd) { throw $Code }
  $triesSize = Get-DexUInt16 $Bytes ([int]$Offset + 6) $Code
  $instructionsSize = Get-DexUInt32 $Bytes ([int]$Offset + 12) $Code
  if ($instructionsSize -eq 0) { throw $Code }
  [uint64]$cursor = [uint64]$Offset + 16 + ([uint64]$instructionsSize * 2)
  if ($cursor -gt [uint64]$SectionEnd) { throw $Code }
  if ($triesSize -eq 0) { return [uint32]$cursor }
  if (($instructionsSize -band 1) -ne 0) {
    if (($cursor + 2) -gt [uint64]$SectionEnd -or
        (Get-DexUInt16 $Bytes ([int]$cursor) $Code) -ne 0) { throw $Code }
    $cursor += 2
  }
  [uint64]$triesEnd = $cursor + ([uint64]$triesSize * 8)
  if ($triesEnd -gt [uint64]$SectionEnd) { throw $Code }
  $handlerOffsets = [Collections.Generic.List[uint16]]::new()
  [uint64]$previousTryEnd = 0
  for ($index = 0; $index -lt $triesSize; $index += 1) {
    $tryOffset = [int]($cursor + ($index * 8))
    $startAddress = Get-DexUInt32 $Bytes $tryOffset $Code
    $instructionCount = Get-DexUInt16 $Bytes ($tryOffset + 4) $Code
    $handlerOffset = Get-DexUInt16 $Bytes ($tryOffset + 6) $Code
    [uint64]$tryEnd = [uint64]$startAddress + $instructionCount
    if ($instructionCount -eq 0 -or [uint64]$startAddress -lt $previousTryEnd -or
        $tryEnd -gt [uint64]$instructionsSize) { throw $Code }
    $handlerOffsets.Add($handlerOffset)
    $previousTryEnd = $tryEnd
  }
  $handlerListOffset = [int]$triesEnd
  $decoded = Read-DexUleb128 $Bytes $handlerListOffset $Code
  if ($decoded.next -gt $SectionEnd -or $decoded.value -eq 0 -or $decoded.value -gt 65536) { throw $Code }
  $cursor = [uint64]$decoded.next
  $handlerStarts = [Collections.Generic.HashSet[uint16]]::new()
  for ($index = 0; $index -lt $decoded.value; $index += 1) {
    $relativeOffset = [uint64]$cursor - [uint64]$handlerListOffset
    if ($relativeOffset -gt [uint16]::MaxValue -or -not $handlerStarts.Add([uint16]$relativeOffset)) { throw $Code }
    $signed = Read-DexSleb128 $Bytes ([int]$cursor) $Code
    if ($signed.next -gt $SectionEnd -or $signed.value -eq [int32]::MinValue) { throw $Code }
    $cursor = [uint64]$signed.next
    $catchCount = [Math]::Abs([int64]$signed.value)
    if (($cursor + ($catchCount * 2)) -gt [uint64]$SectionEnd) { throw $Code }
    for ($catchIndex = 0; $catchIndex -lt $catchCount; $catchIndex += 1) {
      $typeIndex = Read-DexUleb128 $Bytes ([int]$cursor) $Code
      if ($typeIndex.next -gt $SectionEnd -or $typeIndex.value -ge $TypeCount) { throw $Code }
      $cursor = [uint64]$typeIndex.next
      $address = Read-DexUleb128 $Bytes ([int]$cursor) $Code
      if ($address.next -gt $SectionEnd -or $address.value -ge $instructionsSize) { throw $Code }
      $cursor = [uint64]$address.next
    }
    if ($signed.value -le 0) {
      $catchAll = Read-DexUleb128 $Bytes ([int]$cursor) $Code
      if ($catchAll.next -gt $SectionEnd -or $catchAll.value -ge $instructionsSize) { throw $Code }
      $cursor = [uint64]$catchAll.next
    }
  }
  foreach ($handlerOffset in $handlerOffsets) {
    if (-not $handlerStarts.Contains($handlerOffset)) { throw $Code }
  }
  return [uint32]$cursor
}

function Get-DexClassDataFact(
  [byte[]]$Bytes,
  [uint32]$Offset,
  [uint32]$FieldCount,
  [uint32]$MethodCount,
  [uint32]$SectionEnd,
  [string]$Code
) {
  if ($Offset -eq 0 -or $Offset -ge $SectionEnd -or $SectionEnd -gt $Bytes.Length) { throw $Code }
  $cursor = [int]$Offset
  $sizes = [Collections.Generic.List[uint32]]::new()
  for ($index = 0; $index -lt 4; $index += 1) {
    $decoded = Read-DexUleb128 $Bytes $cursor $Code
    if ($decoded.next -gt $SectionEnd) { throw $Code }
    $sizes.Add([uint32]$decoded.value)
    $cursor = [int]$decoded.next
  }
  if (([uint64]$sizes[0] + $sizes[1]) -gt $FieldCount -or
      ([uint64]$sizes[2] + $sizes[3]) -gt $MethodCount) { throw $Code }

  foreach ($fieldListCount in @($sizes[0], $sizes[1])) {
    [uint64]$fieldIndex = 0
    for ($index = 0; $index -lt $fieldListCount; $index += 1) {
      $decoded = Read-DexUleb128 $Bytes $cursor $Code
      if ($decoded.next -gt $SectionEnd -or ($index -gt 0 -and $decoded.value -eq 0)) { throw $Code }
      $fieldIndex += [uint32]$decoded.value
      $cursor = [int]$decoded.next
      if ($fieldIndex -ge $FieldCount) { throw $Code }
      $decoded = Read-DexUleb128 $Bytes $cursor $Code
      if ($decoded.next -gt $SectionEnd) { throw $Code }
      $cursor = [int]$decoded.next
    }
  }

  $methods = [Collections.Generic.List[object]]::new()
  foreach ($methodListCount in @($sizes[2], $sizes[3])) {
    [uint64]$methodIndex = 0
    for ($index = 0; $index -lt $methodListCount; $index += 1) {
      $decoded = Read-DexUleb128 $Bytes $cursor $Code
      if ($decoded.next -gt $SectionEnd -or ($index -gt 0 -and $decoded.value -eq 0)) { throw $Code }
      $methodIndex += [uint32]$decoded.value
      $cursor = [int]$decoded.next
      if ($methodIndex -ge $MethodCount) { throw $Code }
      $decoded = Read-DexUleb128 $Bytes $cursor $Code
      if ($decoded.next -gt $SectionEnd) { throw $Code }
      $cursor = [int]$decoded.next
      $decoded = Read-DexUleb128 $Bytes $cursor $Code
      if ($decoded.next -gt $SectionEnd) { throw $Code }
      $cursor = [int]$decoded.next
      $methods.Add([pscustomobject][ordered]@{
        methodIndex = [uint32]$methodIndex
        codeOffset = [uint32]$decoded.value
      })
    }
  }
  return [pscustomobject][ordered]@{
    end = [uint32]$cursor
    methods = $methods
  }
}

function Get-DexSurfaceEntry([string]$Name, [byte[]]$Bytes) {
  $code = 'apk_dex_surface_invalid'
  if (-not [BitConverter]::IsLittleEndian -or $Bytes.Length -lt 112 -or
      $Bytes[0] -ne 100 -or $Bytes[1] -ne 101 -or $Bytes[2] -ne 120 -or $Bytes[3] -ne 10 -or
      $Bytes[4] -ne 48 -or ($Bytes[5] -lt 51 -or $Bytes[5] -gt 52) -or
      ($Bytes[5] -eq 51 -and ($Bytes[6] -lt 53 -or $Bytes[6] -gt 57)) -or
      ($Bytes[5] -eq 52 -and ($Bytes[6] -lt 48 -or $Bytes[6] -gt 49)) -or $Bytes[7] -ne 0) { throw $code }
  Assert-DexIntegrity $Bytes $code
  if ((Get-DexUInt32 $Bytes 32 $code) -ne $Bytes.Length -or
      (Get-DexUInt32 $Bytes 36 $code) -ne 112 -or
      (Get-DexUInt32 $Bytes 40 $code) -ne 0x12345678) { throw $code }
  $mapInfo = Get-DexMapInfo $Bytes $code
  $stringCount = Get-DexUInt32 $Bytes 56 $code
  $stringOffset = Get-DexUInt32 $Bytes 60 $code
  $typeCount = Get-DexUInt32 $Bytes 64 $code
  $typeOffset = Get-DexUInt32 $Bytes 68 $code
  $protoCount = Get-DexUInt32 $Bytes 72 $code
  $protoOffset = Get-DexUInt32 $Bytes 76 $code
  $fieldCount = Get-DexUInt32 $Bytes 80 $code
  $fieldOffset = Get-DexUInt32 $Bytes 84 $code
  $methodCount = Get-DexUInt32 $Bytes 88 $code
  $methodOffset = Get-DexUInt32 $Bytes 92 $code
  $classCount = Get-DexUInt32 $Bytes 96 $code
  $classOffset = Get-DexUInt32 $Bytes 100 $code
  Assert-DexTableRange $Bytes $stringCount $stringOffset 4 $code
  Assert-DexTableRange $Bytes $typeCount $typeOffset 4 $code
  Assert-DexTableRange $Bytes $protoCount $protoOffset 12 $code
  Assert-DexTableRange $Bytes $fieldCount $fieldOffset 8 $code
  Assert-DexTableRange $Bytes $methodCount $methodOffset 8 $code
  Assert-DexTableRange $Bytes $classCount $classOffset 32 $code
  if ($stringCount -eq 0 -or $typeCount -eq 0) { throw $code }
  if (-not $mapInfo.entries.ContainsKey(0x2002) -or
      $mapInfo.entries[0x2002].size -ne $stringCount) { throw $code }

  $targetStrings = @(
    'acquireAccountProvisionLockAsync', 'releaseAsync',
    'Lexpo/modules/sqlite/SQLiteModule;', 'Lexpo/modules/sqlite/NativeAccountProvisionLock;',
    'Ljava/lang/String;', 'acquireAccountProvisionLock'
  )
  $targetSet = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  foreach ($target in $targetStrings) { $targetSet.Add($target) | Out-Null }
  $stringByIndex = @{}
  $indexByString = @{}
  for ($index = 0; $index -lt $stringCount; $index += 1) {
    $dataOffset = Get-DexUInt32 $Bytes ([int]($stringOffset + ($index * 4))) $code
    Assert-DexMappedOffset $mapInfo 0x2002 $dataOffset 1 $code
    $value = Get-DexAsciiString $Bytes $dataOffset $code
    if ($null -ne $value -and $targetSet.Contains($value)) {
      if ($indexByString.ContainsKey($value)) { throw $code }
      $stringByIndex[[int]$index] = $value
      $indexByString[$value] = [int]$index
    }
  }

  $typeDescriptorByIndex = @{}
  for ($index = 0; $index -lt $typeCount; $index += 1) {
    $descriptorIndex = Get-DexUInt32 $Bytes ([int]($typeOffset + ($index * 4))) $code
    if ($descriptorIndex -ge $stringCount) { throw $code }
    if ($stringByIndex.ContainsKey([int]$descriptorIndex)) {
      $descriptor = [string]$stringByIndex[[int]$descriptorIndex]
      if ($descriptor -ceq 'Lexpo/modules/sqlite/SQLiteModule;' -or
          $descriptor -ceq 'Lexpo/modules/sqlite/NativeAccountProvisionLock;' -or
          $descriptor -ceq 'Ljava/lang/String;') {
        $typeDescriptorByIndex[[int]$index] = $descriptor
      }
    }
  }

  $classDescriptors = @()
  $sqliteClassDataOffsets = @()
  $allClassDataOffsets = [Collections.Generic.HashSet[uint32]]::new()
  for ($index = 0; $index -lt $classCount; $index += 1) {
    $definitionOffset = [int]($classOffset + ($index * 32))
    $classIndex = Get-DexUInt32 $Bytes $definitionOffset $code
    if ($classIndex -ge $typeCount) { throw $code }
    $interfacesOffset = Get-DexUInt32 $Bytes ($definitionOffset + 12) $code
    if ($interfacesOffset -ne 0) { Assert-DexMappedOffset $mapInfo 0x1001 $interfacesOffset 4 $code }
    $classDataOffset = Get-DexUInt32 $Bytes ($definitionOffset + 24) $code
    if ($classDataOffset -ne 0) {
      Assert-DexMappedOffset $mapInfo 0x2000 $classDataOffset 1 $code
      if (-not $allClassDataOffsets.Add($classDataOffset)) { throw $code }
    }
    if ($typeDescriptorByIndex.ContainsKey([int]$classIndex)) {
      $descriptor = [string]$typeDescriptorByIndex[[int]$classIndex]
      if ($descriptor -cne 'Ljava/lang/String;') {
        $classDescriptors += $descriptor
        if ($descriptor -ceq 'Lexpo/modules/sqlite/SQLiteModule;') {
          $sqliteClassDataOffsets += $classDataOffset
        }
      }
    }
  }
  $classDataFacts = [Collections.Generic.Dictionary[uint32,object]]::new()
  $codeOffsets = [Collections.Generic.HashSet[uint32]]::new()
  $orderedClassDataOffsets = @($allClassDataOffsets | Sort-Object)
  if ($orderedClassDataOffsets.Count -eq 0) {
    if ($mapInfo.entries.ContainsKey(0x2000)) { throw $code }
  } else {
    if (-not $mapInfo.entries.ContainsKey(0x2000) -or
        $mapInfo.entries[0x2000].size -ne $orderedClassDataOffsets.Count -or
        $mapInfo.entries[0x2000].offset -ne $orderedClassDataOffsets[0]) { throw $code }
    for ($index = 0; $index -lt $orderedClassDataOffsets.Count; $index += 1) {
      $classDataOffset = [uint32]$orderedClassDataOffsets[$index]
      $classDataEnd = if (($index + 1) -lt $orderedClassDataOffsets.Count) {
        [uint32]$orderedClassDataOffsets[$index + 1]
      } else {
        [uint32]$mapInfo.entries[0x2000].end
      }
      $fact = Get-DexClassDataFact $Bytes $classDataOffset $fieldCount $methodCount $classDataEnd $code
      if (($index + 1) -lt $orderedClassDataOffsets.Count -and $fact.end -ne $classDataEnd) { throw $code }
      $classDataFacts.Add($classDataOffset, $fact)
      foreach ($method in $fact.methods) {
        if ($method.codeOffset -ne 0 -and -not $codeOffsets.Add([uint32]$method.codeOffset)) { throw $code }
      }
    }
  }

  $orderedCodeOffsets = @($codeOffsets | Sort-Object)
  if ($orderedCodeOffsets.Count -eq 0) {
    if ($mapInfo.entries.ContainsKey(0x2001)) { throw $code }
  } else {
    if (-not $mapInfo.entries.ContainsKey(0x2001) -or
        $mapInfo.entries[0x2001].size -ne $orderedCodeOffsets.Count -or
        $mapInfo.entries[0x2001].offset -ne $orderedCodeOffsets[0]) { throw $code }
    for ($index = 0; $index -lt $orderedCodeOffsets.Count; $index += 1) {
      $codeOffset = [uint32]$orderedCodeOffsets[$index]
      Assert-DexMappedOffset $mapInfo 0x2001 $codeOffset 4 $code
      $codeEnd = if (($index + 1) -lt $orderedCodeOffsets.Count) {
        [uint32]$orderedCodeOffsets[$index + 1]
      } else {
        [uint32]$mapInfo.entries[0x2001].end
      }
      Assert-DexCodeItem $Bytes $codeOffset $typeCount $codeEnd $code | Out-Null
    }
  }

  $targetMethodIndexes = @{}
  for ($index = 0; $index -lt $methodCount; $index += 1) {
    $offset = [int]($methodOffset + ($index * 8))
    $classIndex = Get-DexUInt16 $Bytes $offset $code
    $protoIndex = Get-DexUInt16 $Bytes ($offset + 2) $code
    $nameIndex = Get-DexUInt32 $Bytes ($offset + 4) $code
    if ($classIndex -ge $typeCount -or $protoIndex -ge $protoCount -or $nameIndex -ge $stringCount) { throw $code }
    if ($typeDescriptorByIndex.ContainsKey([int]$classIndex) -and
        $stringByIndex.ContainsKey([int]$nameIndex) -and
        $typeDescriptorByIndex[[int]$classIndex] -ceq 'Lexpo/modules/sqlite/SQLiteModule;' -and
        $stringByIndex[[int]$nameIndex] -ceq 'acquireAccountProvisionLock') {
      $protoEntryOffset = [int]($protoOffset + ($protoIndex * 12))
      $shortyIndex = Get-DexUInt32 $Bytes $protoEntryOffset $code
      $returnTypeIndex = Get-DexUInt32 $Bytes ($protoEntryOffset + 4) $code
      $parametersOffset = Get-DexUInt32 $Bytes ($protoEntryOffset + 8) $code
      if ($shortyIndex -ge $stringCount -or $returnTypeIndex -ge $typeCount -or
          -not $typeDescriptorByIndex.ContainsKey([int]$returnTypeIndex) -or
          $typeDescriptorByIndex[[int]$returnTypeIndex] -cne 'Lexpo/modules/sqlite/NativeAccountProvisionLock;' -or
          $parametersOffset -eq 0 -or ([long]$parametersOffset + 6) -gt $Bytes.LongLength -or
          (Get-DexUInt32 $Bytes ([int]$parametersOffset) $code) -ne 1) { continue }
      Assert-DexMappedOffset $mapInfo 0x1001 $parametersOffset 4 $code
      $parameterTypeIndex = Get-DexUInt16 $Bytes ([int]$parametersOffset + 4) $code
      if ($parameterTypeIndex -ge $typeCount -or
          -not $typeDescriptorByIndex.ContainsKey([int]$parameterTypeIndex) -or
          $typeDescriptorByIndex[[int]$parameterTypeIndex] -cne 'Ljava/lang/String;') { continue }
      $targetMethodIndexes[[int]$index] = $true
    }
  }
  $methods = @()
  if ($sqliteClassDataOffsets.Count -eq 1 -and $sqliteClassDataOffsets[0] -gt 0 -and
      $classDataFacts.ContainsKey([uint32]$sqliteClassDataOffsets[0])) {
    foreach ($method in $classDataFacts[[uint32]$sqliteClassDataOffsets[0]].methods) {
      if ($targetMethodIndexes.ContainsKey([int]$method.methodIndex)) {
        if ($method.codeOffset -eq 0) { throw $code }
        $methods += 'Lexpo/modules/sqlite/SQLiteModule;->acquireAccountProvisionLock(Ljava/lang/String;)' +
          'Lexpo/modules/sqlite/NativeAccountProvisionLock;'
      }
    }
  }
  $surfaceStrings = @()
  foreach ($value in @('acquireAccountProvisionLockAsync', 'releaseAsync')) {
    if ($indexByString.ContainsKey($value)) { $surfaceStrings += $value }
  }
  return [pscustomobject][ordered]@{
    name = $Name
    valid = $true
    strings = @($surfaceStrings)
    classDescriptors = @($classDescriptors)
    methods = @($methods)
  }
}

function Assert-ApkDexSurface([string]$ApkPath) {
  $code = 'apk_dex_surface_invalid'
  if (-not (Test-Path -LiteralPath $ApkPath -PathType Leaf)) { throw $code }
  $item = Get-Item -LiteralPath $ApkPath -Force
  if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw $code }
  Add-Type -AssemblyName System.IO.Compression -ErrorAction Stop
  $stream = [IO.File]::Open($item.FullName, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
  $archive = $null
  try {
    $archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Read, $false)
    $entries = @($archive.Entries | Where-Object { $_.FullName -cmatch '^classes(?:[2-9]|[1-9][0-9]+)?\.dex$' })
    if ($entries.Count -eq 0 -or $entries.Count -gt 64) { throw $code }
    $facts = @()
    foreach ($entry in $entries) {
      if ($entry.Length -lt 112 -or $entry.Length -gt 67108864 -or $entry.Length -gt [int]::MaxValue) { throw $code }
      $bytes = [byte[]]::new([int]$entry.Length)
      $entryStream = $entry.Open()
      try {
        $offset = 0
        while ($offset -lt $bytes.Length) {
          $read = $entryStream.Read($bytes, $offset, $bytes.Length - $offset)
          if ($read -le 0) { throw $code }
          $offset += $read
        }
        if ($entryStream.ReadByte() -ne -1) { throw $code }
      } finally { $entryStream.Dispose() }
      $facts += Get-DexSurfaceEntry $entry.FullName $bytes
    }
    $surface = Assert-ApkDexSurfaceModel ([pscustomobject]@{ dexEntries = @($facts) })
  } catch {
    if ($_.Exception.Message -ceq $code) { throw }
    throw $code
  } finally {
    if ($null -ne $archive) { $archive.Dispose() }
    $stream.Dispose()
  }
  return [pscustomobject][ordered]@{
    schemaVersion = 1
    apkLength = [long]$item.Length
    apkSha256 = Get-Sha256 $item.FullName
    dexEntryCount = $surface.dexEntryCount
    bindingDexName = $surface.bindingDexName
    acquireSurface = $surface.acquireSurface
    nativeHandleClass = $surface.nativeHandleClass
    releaseSurface = $surface.releaseSurface
    sqliteModuleImplementation = $surface.sqliteModuleImplementation
  }
}

function Get-MergedDebugManifestComponentFacts([string]$Xml) {
  $code = 'merged_debug_manifest_invalid'
  if ([string]::IsNullOrWhiteSpace($Xml) -or $Xml.Length -gt 1048576) { throw $code }
  $reader = $null
  try {
    $settings = [Xml.XmlReaderSettings]::new()
    $settings.DtdProcessing = [Xml.DtdProcessing]::Prohibit
    $settings.XmlResolver = $null
    $reader = [Xml.XmlReader]::Create([IO.StringReader]::new($Xml), $settings)
    $document = [Xml.XmlDocument]::new()
    $document.XmlResolver = $null
    $document.Load($reader)
  } catch { throw $code } finally { if ($null -ne $reader) { $reader.Dispose() } }
  $manifest = $document.DocumentElement
  if ($null -eq $manifest -or $manifest.LocalName -cne 'manifest' -or
      $manifest.GetAttribute('package') -cne $script:PackageName) { throw $code }
  $applications = @($manifest.ChildNodes | Where-Object {
    $_.NodeType -eq [Xml.XmlNodeType]::Element -and $_.LocalName -ceq 'application'
  })
  if ($applications.Count -ne 1) { throw $code }
  $androidNamespace = 'http://schemas.android.com/apk/res/android'
  $activityName = 'app.phraseman.AccountV2ProbeActivity'
  $activities = @($applications[0].ChildNodes | Where-Object {
    $_.NodeType -eq [Xml.XmlNodeType]::Element -and $_.LocalName -ceq 'activity' -and
    $_.GetAttribute('name', $androidNamespace) -ceq $activityName
  })
  $aliases = @($applications[0].ChildNodes | Where-Object {
    $_.NodeType -eq [Xml.XmlNodeType]::Element -and $_.LocalName -ceq 'activity-alias' -and
    ($_.GetAttribute('name', $androidNamespace) -ceq $activityName -or
     $_.GetAttribute('targetActivity', $androidNamespace) -ceq $activityName)
  })
  if ($activities.Count -ne 1 -or $aliases.Count -ne 0) { throw $code }
  $activity = $activities[0]
  $intentFilters = @($activity.ChildNodes | Where-Object {
    $_.NodeType -eq [Xml.XmlNodeType]::Element -and $_.LocalName -ceq 'intent-filter'
  })
  if ($activity.GetAttribute('exported', $androidNamespace) -cne 'false' -or
      $activity.GetAttribute('launchMode', $androidNamespace) -cne 'singleTask' -or
      $activity.GetAttribute('process', $androidNamespace) -cne ':account_v2_probe' -or
      $intentFilters.Count -ne 0) { throw $code }
  return [pscustomobject][ordered]@{
    schemaVersion = 1
    componentCount = 1
    exported = $false
    launchMode = 'singleTask'
    process = ':account_v2_probe'
    intentFilterCount = 0
  }
}

function Assert-MergedDebugManifestModel([object]$Payload) {
  $code = 'merged_debug_manifest_invalid'
  Assert-ExactKeys $Payload @('xml') $code
  $xml = Get-Property $Payload 'xml' $code
  if ($xml -isnot [string]) { throw $code }
  $facts = Get-MergedDebugManifestComponentFacts $xml
  return [pscustomobject][ordered]@{
    status = 'pass'
    schemaVersion = $facts.schemaVersion
    componentCount = $facts.componentCount
    exported = $facts.exported
    launchMode = $facts.launchMode
    process = $facts.process
    intentFilterCount = $facts.intentFilterCount
  }
}

function Get-MergedDebugManifestFact([string]$Path) {
  $code = 'merged_debug_manifest_invalid'
  $bytes = Get-FileBytes $Path $code
  try { $xml = [Text.UTF8Encoding]::new($false, $true).GetString($bytes) } catch { throw $code }
  $component = Get-MergedDebugManifestComponentFacts $xml
  return [pscustomobject][ordered]@{
    schemaVersion = 1
    length = [long]$bytes.Length
    sha256 = Get-BytesSha256 $bytes
    componentCount = $component.componentCount
    exported = $component.exported
    launchMode = $component.launchMode
    process = $component.process
    intentFilterCount = $component.intentFilterCount
  }
}

function Assert-OwnedRepositorySnapshotModel([object]$Payload) {
  $code = 'owned_repository_snapshot_invalid'
  Assert-ExactKeys $Payload @('sandboxRoot', 'ownedRelativePaths', 'expectedFacts', 'stage') $code
  $stage = Get-Property $Payload 'stage' $code
  if ($stage -cne 'cleanup' -and $stage -cne 'post-publication') { throw $code }
  $paths = @(Get-Property $Payload 'ownedRelativePaths' $code)
  $facts = @(Get-OwnedPathFacts ([string](Get-Property $Payload 'sandboxRoot' $code)) $paths $code)
  $expected = Get-Property $Payload 'expectedFacts' $code
  if ($null -ne $expected) {
    $failureCode = if ($stage -ceq 'cleanup') { 'repository_drift' } else { 'post_publication_repository_snapshot_failed' }
    Assert-OwnedPathFactsEqual @($expected) $facts $failureCode
  }
  return [pscustomobject][ordered]@{ status = 'pass'; facts = $facts }
}

function Assert-CampaignIntegrityMatrixModel([object]$Payload) {
  $code = 'campaign_integrity_matrix_invalid'
  Assert-ExactKeys $Payload @('before', 'mutations', 'stage') $code
  $before = Get-Property $Payload 'before' $code
  $mutations = @(Get-Property $Payload 'mutations' $code)
  $stage = Get-Property $Payload 'stage' $code
  if ($mutations.Count -eq 0 -or ($stage -cne 'cleanup' -and $stage -cne 'post-publication')) { throw $code }
  $expectedCode = if ($stage -ceq 'cleanup') { 'repository_drift' } else { 'post_publication_repository_snapshot_failed' }
  try { $expected = ($before | ConvertTo-Json -Depth 10 -Compress) | ConvertFrom-Json } catch { throw $code }
  $oldBuiltApkSha256 = $script:BuiltApkSha256
  $script:BuiltApkSha256 = $null
  try {
    foreach ($mutation in $mutations) {
      Assert-ExactKeys $mutation @('collection', 'index', 'field', 'value') $code
      $collection = Get-Property $mutation 'collection' $code
      $index = Get-Property $mutation 'index' $code
      $field = Get-Property $mutation 'field' $code
      $value = Get-Property $mutation 'value' $code
      if ($index -isnot [int] -or $index -lt 0) { throw $code }
      if ($collection -ceq 'criticalInputs') {
        if ($index -ge $script:CriticalInputs.Count -or
            ($field -cne 'kind' -and $field -cne 'length' -and $field -cne 'sha256')) { throw $code }
        if (($field -ceq 'kind' -and ($value -isnot [string] -or
              ($value -cne 'absent' -and $value -cne 'directory' -and $value -cne 'file'))) -or
            ($field -ceq 'length' -and ($value -isnot [int] -or $value -lt 0)) -or
            ($field -ceq 'sha256' -and ($value -isnot [string] -or $value -cnotmatch '^[0-9a-f]{64}$'))) { throw $code }
      } elseif ($collection -ceq 'activatedNativeInputs') {
        if ($index -ge $script:ActivatedNativeInputs.Count -or
            ($field -cne 'kind' -and $field -cne 'length' -and $field -cne 'sha256')) { throw $code }
        if (($field -ceq 'kind' -and ($value -isnot [string] -or
              ($value -cne 'absent' -and $value -cne 'directory' -and $value -cne 'file'))) -or
            ($field -ceq 'length' -and ($value -isnot [int] -or $value -lt 0)) -or
            ($field -ceq 'sha256' -and ($value -isnot [string] -or $value -cnotmatch '^[0-9a-f]{64}$'))) { throw $code }
      } elseif ($collection -ceq 'gitScope') {
        if ($index -ge ($script:SevenPaths.Count + $script:CriticalInputs.Count) -or
            ($field -cne 'tracked' -and $field -cne 'indexObjectId' -and $field -cne 'statusSha256')) { throw $code }
        if (($field -ceq 'tracked' -and $value -isnot [bool]) -or
            ($field -ceq 'indexObjectId' -and ($value -isnot [string] -or $value -cnotmatch '^([0-9a-f]{40}|[0-9a-f]{64})$')) -or
            ($field -ceq 'statusSha256' -and ($value -isnot [string] -or $value -cnotmatch '^[0-9a-f]{64}$'))) { throw $code }
      } else { throw $code }
      $target = @($before.$collection)[$index]
      $property = $target.PSObject.Properties[$field]
      if ($null -eq $property) { throw $code }
      $original = $property.Value
      $property.Value = $value
      try {
        try {
          if ($stage -ceq 'cleanup') {
            Assert-CampaignOwnedCleanupIntegrity $expected $before
          } else {
            Assert-CampaignOwnedPostPublicationIntegrity $expected $before
          }
          throw $code
        } catch {
          if ($_.Exception.Message -cne $expectedCode) { throw $code }
        }
      } finally {
        $property.Value = $original
      }
    }
  } finally {
    $script:BuiltApkSha256 = $oldBuiltApkSha256
  }
  return [pscustomobject][ordered]@{ status = 'pass'; rejected = $mutations.Count }
}

function Assert-SourceTrustModel([object]$Payload) {
  $code = 'reviewed_source_trust_root_invalid'
  Assert-ExactKeys $Payload @('sources') $code
  $sources = @(Get-Property $Payload 'sources' $code)
  if ($sources.Count -ne $script:SevenPaths.Count) { throw $code }
  for ($index = 0; $index -lt $script:SevenPaths.Count; $index += 1) {
    $source = $sources[$index]
    Assert-ExactKeys $source @('path', 'tracked', 'actualSha256', 'reviewedSha256') $code
    if ((Get-Property $source 'path' $code) -cne $script:SevenPaths[$index]) { throw $code }
    if ((Get-Property $source 'tracked' $code) -ne $true) { throw 'source_tracking_precondition_failed' }
    $actual = Get-Property $source 'actualSha256' $code
    $reviewed = Get-Property $source 'reviewedSha256' $code
    Assert-Hex64 $actual $code
    Assert-Hex64 $reviewed $code
    if ($actual -cne $reviewed) { throw $code }
  }
  return [pscustomobject][ordered]@{ status = 'pass'; sourceCount = $sources.Count }
}

function Assert-RuntimeMarkerBinding([object]$Payload) {
  $code = 'runtime_marker_binding_invalid'
  Assert-ExactKeys $Payload @('binding', 'lines') $code
  $binding = Get-Property $Payload 'binding' $code
  Assert-Binding $binding $code
  $lines = @(Get-Property $Payload 'lines' $code)
  if ($lines.Count -lt 2) { throw $code }
  $bindingFields = @(
    $script:PackageName, [string]$binding.processName, [string]$binding.pid,
    [string]$binding.starttime, [string]$binding.launchNonce, [string]$binding.runtimeIdentity
  )
  $lifecycle = @(
    'account_provision_lock_launch_ack', 'account_provision_lock_attempted',
    'account_provision_lock_acquired', 'account_provision_lock_release_requested',
    'account_provision_lock_released', 'account_provision_lock_probe_pass'
  )
  $launchCount = 0
  $controlCount = 0
  for ($lineIndex = 0; $lineIndex -lt $lines.Count; $lineIndex += 1) {
    if ($lines[$lineIndex] -isnot [string]) { throw $code }
    $fields = @(([string]$lines[$lineIndex]).Split('|'))
    $marker = $fields[0]
    if ($lifecycle -ccontains $marker) {
      if ($fields.Count -ne 7) { throw $code }
      for ($index = 0; $index -lt $bindingFields.Count; $index += 1) {
        if ($fields[$index + 1] -cne $bindingFields[$index]) { throw $code }
      }
      if ($marker -ceq 'account_provision_lock_launch_ack') {
        if ($lineIndex -ne 0) { throw $code }
        $launchCount += 1
      }
    } elseif ($marker -ceq 'account_provision_lock_control_ack') {
      if ($fields.Count -ne 9 -or ($fields[1] -cne 'release' -and $fields[1] -cne 'checkpoint')) { throw $code }
      for ($index = 0; $index -lt $bindingFields.Count; $index += 1) {
        if ($fields[$index + 2] -cne $bindingFields[$index]) { throw $code }
      }
      if (($fields[1] -ceq 'release' -and $fields[8] -cne '-') -or
          ($fields[1] -ceq 'checkpoint' -and $fields[8] -cnotmatch '^[0-9a-f]{32}$')) { throw $code }
      $controlCount += 1
    } elseif ($marker -ceq 'account_provision_lock_owned_checkpoint') {
      if ($fields.Count -ne 8 -or $fields[7] -cnotmatch '^[0-9a-f]{32}$') { throw $code }
      for ($index = 0; $index -lt $bindingFields.Count; $index += 1) {
        if ($fields[$index + 1] -cne $bindingFields[$index]) { throw $code }
      }
    } else { throw $code }
  }
  if ($launchCount -ne 1 -or $controlCount -lt 1) { throw $code }
  return [pscustomobject][ordered]@{ status = 'pass'; lineCount = $lines.Count }
}

function Assert-AdbTransportModel([object]$Payload) {
  $code = 'adb_transport_invalid'
  Assert-ExactKeys $Payload @('arguments') $code
  $arguments = @(Get-Property $Payload 'arguments' $code)
  if ($arguments.Count -eq 0) { throw $code }
  foreach ($argument in $arguments) { if ($argument -isnot [string]) { throw $code } }
  return [pscustomobject][ordered]@{
    status = 'pass'
    hostArguments = @(ConvertTo-AdbTransportArguments ([string[]]$arguments))
  }
}

function Assert-DiagnosticReducerModel([object]$Payload) {
  $code = 'diagnostic_reducer_invalid'
  Assert-ExactKeys $Payload @('lines', 'binding') $code
  $lines = @(Get-Property $Payload 'lines' $code)
  $binding = Get-Property $Payload 'binding' $code
  Assert-Binding $binding $code
  $failureCode = Get-SanitizedJsDiagnosticCode $lines
  return [pscustomobject][ordered]@{
    status = 'pass'
    failureCode = $failureCode
    databaseRootDiagnostic = Get-SanitizedDatabaseRootDiagnosticFromLines $lines $binding $failureCode
  }
}

function Assert-FailureEnvelopeModel([object]$Payload) {
  $code = 'failure_envelope_invalid'
  Assert-ExactKeys $Payload @(
    'candidateCode', 'observedJsFailureCode', 'observedDatabaseRootDiagnostic', 'stage',
    'cleanupComplete', 'cleanupReceipt', 'reviewedReceiptSha256'
  ) $code
  $cleanupComplete = Get-Property $Payload 'cleanupComplete' $code
  if ($cleanupComplete -isnot [bool]) { throw $code }
  return New-SanitizedFailureEnvelope `
    (Get-Property $Payload 'candidateCode' $code) `
    (Get-Property $Payload 'observedJsFailureCode' $code) `
    (Get-Property $Payload 'observedDatabaseRootDiagnostic' $code) `
    ([string](Get-Property $Payload 'stage' $code)) `
    $cleanupComplete `
    (Get-Property $Payload 'cleanupReceipt' $code) `
    ([string](Get-Property $Payload 'reviewedReceiptSha256' $code))
}

function Assert-HostGateReceiptModel([object]$Payload) {
  $code = 'host_gate_receipt_model_invalid'
  Assert-ExactKeys $Payload @(
    'label', 'canonical', 'exitCode', 'expectSuccess',
    'expectedFailed', 'expectedPassed', 'expectedTotal'
  ) $code
  $label = Get-Property $Payload 'label' $code
  $canonical = Get-Property $Payload 'canonical' $code
  $expectSuccess = Get-Property $Payload 'expectSuccess' $code
  if ($label -isnot [string] -or $canonical -isnot [string] -or $expectSuccess -isnot [bool]) { throw $code }
  try {
    $counts = Assert-HostGateResult `
      $label `
      $canonical `
      ([int](Get-Property $Payload 'exitCode' $code)) `
      $expectSuccess `
      ([int](Get-Property $Payload 'expectedFailed' $code)) `
      ([int](Get-Property $Payload 'expectedPassed' $code)) `
      ([int](Get-Property $Payload 'expectedTotal' $code))
  } catch [Management.Automation.RuntimeException] {
    throw
  } catch {
    throw $code
  }
  return [pscustomobject][ordered]@{
    status = 'pass'; failed = $counts.failed; passed = $counts.passed; total = $counts.total
  }
}

function Invoke-EvidencePublicationValidation([object]$Payload) {
  $code = 'evidence_publication_validation_invalid'
  Assert-ExactKeys $Payload @('sandboxRoot', 'fault') $code
  $root = [IO.Path]::GetFullPath([string](Get-Property $Payload 'sandboxRoot' $code))
  if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw $code }
  $fault = Get-Property $Payload 'fault' $code
  if ($fault -cne 'none' -and $fault -cne 'after_provisional' -and
      $fault -cne 'custody_teardown_failure' -and $fault -cne 'before_final_commit' -and
      $fault -cne 'atomic_commit_failure') { throw $code }
  $target = Assert-DescendantPath $root (Join-Path $root 'account-provision-lock-runtime.json') $code
  $temporary = "$target.new"
  $evidence = [pscustomobject][ordered]@{
    schemaVersion = 2
    status = 'provisional'
    repositoryAfterPublication = $null
  }
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($evidence | ConvertTo-Json -Compress))
  Write-DurableNewBytes $temporary $bytes 'evidence_publication_failed'
  [IO.File]::Move($temporary, $target)
  Invoke-InjectedFault $fault 'after_provisional'
  $evidence.repositoryAfterPublication = [pscustomobject][ordered]@{ snapshot = 'verified' }
  $script:HeldSourceHandles = @([IO.MemoryStream]::new())
  Close-SevenPathHolds $fault
  Invoke-InjectedFault $fault 'before_final_commit'
  $evidence.status = 'pass'
  $finalPath = "$target.final"
  $finalBytes = [Text.UTF8Encoding]::new($false).GetBytes(($evidence | ConvertTo-Json -Compress))
  Write-DurableNewBytes $finalPath $finalBytes 'evidence_publication_failed'
  try {
    Invoke-InjectedFault $fault 'atomic_commit_failure'
    Move-AtomicReplace $finalPath $target 'evidence_publication_failed'
  } catch {
    if (Test-Path -LiteralPath $finalPath -PathType Leaf) { [IO.File]::Delete($finalPath) }
    throw
  }
  return $evidence
}

function Assert-MaterializationPayload([object]$Payload) {
  $code = 'materialization_payload_invalid'
  Assert-ExactKeys $Payload @(
    'sandboxRoot', 'operation', 'fault', 'targetManifest', 'targetActivity',
    'fixtureManifest', 'fixtureActivity', 'journalPath', 'backupRoot'
  ) $code
  $root = [IO.Path]::GetFullPath([string](Get-Property $Payload 'sandboxRoot' $code))
  if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw $code }
  $operation = Get-Property $Payload 'operation' $code
  if ($operation -cne 'exercise' -and $operation -cne 'crash' -and $operation -cne 'recover') { throw $code }
  $fault = Get-Property $Payload 'fault' $code
  $allowedFaults = @(
    'none', 'after_journal', 'after_manifest_replace', 'after_activity_replace',
    'before_manifest_restore', 'after_manifest_restore', 'before_activity_restore',
    'after_activity_restore', 'after_restoration_before_cleanup',
    'after_manifest_restore_action', 'after_activity_restore_action',
    'after_manifest_backup_delete', 'after_activity_backup_delete',
    'after_journal_update_temp', 'after_journal_update_replace'
  )
  if ($allowedFaults -cnotcontains $fault) { throw $code }
  $result = [ordered]@{ sandboxRoot = $root; operation = $operation; fault = $fault }
  foreach ($name in @('targetManifest', 'targetActivity', 'fixtureManifest', 'fixtureActivity', 'journalPath', 'backupRoot')) {
    $result[$name] = Assert-DescendantPath $root ([string](Get-Property $Payload $name $code)) $code
  }
  if ($result.targetManifest -ceq $result.targetActivity -or
      $result.fixtureManifest -ceq $result.fixtureActivity -or
      $result.journalPath -ceq $result.targetManifest -or
      $result.journalPath -ceq $result.targetActivity) { throw $code }
  if (-not (Test-Path -LiteralPath $result.fixtureManifest -PathType Leaf) -or
      -not (Test-Path -LiteralPath $result.fixtureActivity -PathType Leaf)) { throw $code }
  return [pscustomobject]$result
}

function Invoke-InjectedFault([string]$Actual, [string]$Expected) {
  if ($Actual -ceq $Expected) { throw 'account_provision_lock_injected_crash' }
}

function New-MaterializationJournal([object]$Context) {
  if ((Test-Path -LiteralPath $Context.journalPath) -or (Test-Path -LiteralPath $Context.backupRoot)) {
    throw 'materialization_preserve_all_stop'
  }
  [IO.Directory]::CreateDirectory($Context.backupRoot) | Out-Null
  $manifestOriginal = Get-FileBytes $Context.targetManifest 'materialization_target_kind_invalid'
  $manifestFixture = Get-FileBytes $Context.fixtureManifest 'materialization_fixture_invalid'
  $activityFixture = Get-FileBytes $Context.fixtureActivity 'materialization_fixture_invalid'
  $manifestDesired = New-ManifestDesiredBytes $manifestOriginal $manifestFixture
  $activityFact = Get-TargetFact $Context.targetActivity
  $manifestBackup = Join-Path $Context.backupRoot 'manifest.original.bin'
  $activityBackup = if ($activityFact.kind -ceq 'file') { Join-Path $Context.backupRoot 'activity.original.bin' } else { $null }
  Write-DurableNewBytes $manifestBackup $manifestOriginal 'materialization_backup_write_failed'
  $activityOriginal = $null
  if ($activityFact.kind -ceq 'file') {
    $activityOriginal = Get-FileBytes $Context.targetActivity 'materialization_target_kind_invalid'
    Write-DurableNewBytes $activityBackup $activityOriginal 'materialization_backup_write_failed'
  }
  $ownerToken = [Guid]::NewGuid().ToString('N')
  $entries = @(
    [pscustomobject][ordered]@{
      name = 'manifest'
      targetPath = $Context.targetManifest
      fixturePath = $Context.fixtureManifest
      originalKind = 'file'
      originalLength = [long]$manifestOriginal.Length
      originalSha256 = Get-BytesSha256 $manifestOriginal
      fixtureSha256 = Get-BytesSha256 $manifestFixture
      desiredLength = [long]$manifestDesired.Length
      desiredSha256 = Get-BytesSha256 $manifestDesired
      backupPath = $manifestBackup
      backupSha256 = Get-BytesSha256 $manifestOriginal
      materialized = $false
      restored = $false
    },
    [pscustomobject][ordered]@{
      name = 'activity'
      targetPath = $Context.targetActivity
      fixturePath = $Context.fixtureActivity
      originalKind = $activityFact.kind
      originalLength = if ($null -eq $activityOriginal) { [long]0 } else { [long]$activityOriginal.Length }
      originalSha256 = if ($null -eq $activityOriginal) { $null } else { Get-BytesSha256 $activityOriginal }
      fixtureSha256 = Get-BytesSha256 $activityFixture
      desiredLength = [long]$activityFixture.Length
      desiredSha256 = Get-BytesSha256 $activityFixture
      backupPath = $activityBackup
      backupSha256 = if ($null -eq $activityOriginal) { $null } else { Get-BytesSha256 $activityOriginal }
      materialized = $false
      restored = $false
    }
  )
  $journal = [pscustomobject][ordered]@{
    schemaVersion = 1
    owner = 'account-provision-lock-runtime-v1'
    ownerToken = $ownerToken
    sandboxRoot = $Context.sandboxRoot
    journalPath = $Context.journalPath
    backupRoot = $Context.backupRoot
    preserveAll = $false
    phase = 'prepared'
    entries = $entries
  }
  Write-DurableJson $Context.journalPath $journal $true
  return [pscustomobject][ordered]@{
    journal = $journal
    desired = @($manifestDesired, $activityFixture)
    original = @($manifestOriginal, $activityOriginal)
  }
}

function Read-MaterializationJournal([object]$Context) {
  $code = 'materialization_preserve_all_stop'
  $inventoryCode = 'materialization_recovery_inventory_invalid'
  if (-not (Test-Path -LiteralPath $Context.backupRoot -PathType Container)) { throw $code }
  $allowedNames = @('journal.json', 'manifest.original.bin', 'activity.original.bin')
  $initialInventory = @(Get-ChildItem -LiteralPath $Context.backupRoot -Force)
  foreach ($artifact in $initialInventory) {
    if (-not $artifact.PSIsContainer -and $allowedNames -ccontains $artifact.Name -and
        ($artifact.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) { continue }
    throw $inventoryCode
  }
  if (-not (Test-Path -LiteralPath $Context.journalPath -PathType Leaf)) { throw $code }
  $rawBytes = Get-FileBytes $Context.journalPath $code
  try {
    $raw = [Text.UTF8Encoding]::new($false, $true).GetString($rawBytes)
    $journal = $raw | ConvertFrom-Json
    $canonical = $journal | ConvertTo-Json -Depth 20 -Compress
  } catch {
    throw $code
  }
  if ($raw -cne $canonical) { throw $code }
  Assert-ExactKeys $journal @('schemaVersion', 'owner', 'ownerToken', 'sandboxRoot', 'journalPath', 'backupRoot', 'preserveAll', 'phase', 'entries') $code
  if ($journal.schemaVersion -ne 1 -or
      $journal.owner -cne 'account-provision-lock-runtime-v1' -or
      $journal.ownerToken -cnotmatch '^[0-9a-f]{32}$' -or
      $journal.sandboxRoot -cne $Context.sandboxRoot -or
      $journal.journalPath -cne $Context.journalPath -or
      $journal.backupRoot -cne $Context.backupRoot -or
      $journal.preserveAll -ne $false -or
       @('prepared', 'materialized', 'restoring', 'cleanup_pending') -cnotcontains $journal.phase) { throw $code }
  $entries = @($journal.entries)
  if ($entries.Count -ne 2) { throw $code }
  $expectedNames = @('manifest', 'activity')
  $expectedTargets = @($Context.targetManifest, $Context.targetActivity)
  $expectedFixtures = @($Context.fixtureManifest, $Context.fixtureActivity)
  $desired = @()
  $original = @()
  for ($index = 0; $index -lt 2; $index += 1) {
    $entry = $entries[$index]
    Assert-ExactKeys $entry @(
      'name', 'targetPath', 'fixturePath', 'originalKind', 'originalLength',
      'originalSha256', 'fixtureSha256', 'desiredLength', 'desiredSha256',
      'backupPath', 'backupSha256', 'materialized', 'restored'
    ) $code
    if ($entry.name -cne $expectedNames[$index] -or
        $entry.targetPath -cne $expectedTargets[$index] -or
        $entry.fixturePath -cne $expectedFixtures[$index] -or
        ($entry.materialized -isnot [bool]) -or ($entry.restored -isnot [bool])) { throw $code }
    $fixtureBytes = Get-FileBytes $entry.fixturePath $code
    if ((Get-BytesSha256 $fixtureBytes) -cne $entry.fixtureSha256) { throw $code }
    $fact = Get-TargetFact $entry.targetPath
    $factMatchesOriginal = if ($entry.originalKind -ceq 'absent') {
      $fact.kind -ceq 'absent'
    } else {
      $fact.kind -ceq 'file' -and $fact.length -eq $entry.originalLength -and $fact.sha256 -ceq $entry.originalSha256
    }
    if ($entry.originalKind -ceq 'file') {
      if ($entry.backupPath -isnot [string] -or
          (Assert-DescendantPath $Context.backupRoot $entry.backupPath $code) -cne $entry.backupPath) { throw $code }
      if (Test-Path -LiteralPath $entry.backupPath -PathType Leaf) {
        $originalBytes = Get-FileBytes $entry.backupPath $code
      } elseif ($journal.phase -ceq 'cleanup_pending' -and $entry.restored -eq $true -and $factMatchesOriginal) {
        $originalBytes = Get-FileBytes $entry.targetPath $code
      } else { throw $code }
      if ($originalBytes.Length -ne $entry.originalLength -or
          (Get-BytesSha256 $originalBytes) -cne $entry.originalSha256 -or
          $entry.backupSha256 -cne $entry.originalSha256) { throw $code }
      $original += ,$originalBytes
    } elseif ($entry.originalKind -ceq 'absent') {
      if ($null -ne $entry.backupPath -or $null -ne $entry.backupSha256 -or
          $null -ne $entry.originalSha256 -or $entry.originalLength -ne 0) { throw $code }
      $original += ,$null
    } else { throw $code }
    $desiredBytes = if ($index -eq 0) { New-ManifestDesiredBytes $original[$index] $fixtureBytes } else { $fixtureBytes }
    if ($desiredBytes.Length -ne $entry.desiredLength -or (Get-BytesSha256 $desiredBytes) -cne $entry.desiredSha256) { throw $code }
    $desired += ,$desiredBytes
    $currentMatchesDesired = $fact.kind -ceq 'file' -and $fact.length -eq $entry.desiredLength -and $fact.sha256 -ceq $entry.desiredSha256
    $currentMatchesOriginal = if ($entry.originalKind -ceq 'absent') {
      $fact.kind -ceq 'absent'
    } else {
      $fact.kind -ceq 'file' -and $fact.length -eq $entry.originalLength -and $fact.sha256 -ceq $entry.originalSha256
    }
    if (-not $currentMatchesDesired -and -not $currentMatchesOriginal) { throw $code }
    if ($entry.restored -and -not $currentMatchesOriginal) { throw $code }
    if ($journal.phase -ceq 'cleanup_pending' -and (-not $entry.restored -or -not $currentMatchesOriginal)) { throw $code }
  }
  $expectedArtifacts = @($Context.journalPath)
  foreach ($entry in $entries) {
    if ($entry.backupPath -is [string] -and (Test-Path -LiteralPath $entry.backupPath -PathType Leaf)) {
      $expectedArtifacts += $entry.backupPath
    }
  }
  $actualArtifacts = @($initialInventory | ForEach-Object { $_.FullName } | Sort-Object)
  $expectedArtifacts = @($expectedArtifacts | Sort-Object)
  if ($actualArtifacts.Count -ne $expectedArtifacts.Count) { throw $code }
  for ($index = 0; $index -lt $actualArtifacts.Count; $index += 1) {
    if ($actualArtifacts[$index] -cne $expectedArtifacts[$index]) { throw $code }
  }
  return [pscustomobject][ordered]@{ journal = $journal; desired = $desired; original = $original }
}

function Start-Materialization([object]$Context) {
  $state = New-MaterializationJournal $Context
  Invoke-InjectedFault $Context.fault 'after_journal'
  for ($index = 0; $index -lt 2; $index += 1) {
    $entry = @($state.journal.entries)[$index]
    $entry.materialized = $true
    Write-DurableJson $Context.journalPath $state.journal $false $Context.fault
    if ($entry.originalKind -ceq 'file') {
      Invoke-CasWrite $entry.targetPath $state.original[$index] $state.desired[$index] $Context.backupRoot
    } else {
      Invoke-CasCreate $entry.targetPath $state.desired[$index] $Context.backupRoot
    }
    $replacementFault = if ($index -eq 0) { 'after_manifest_replace' } else { 'after_activity_replace' }
    Invoke-InjectedFault $Context.fault $replacementFault
  }
  $state.journal.phase = 'materialized'
  Write-DurableJson $Context.journalPath $state.journal $false
}

function Restore-Materialization([object]$Context, [string]$Fault) {
  $state = Read-MaterializationJournal $Context
  if ($state.journal.phase -cne 'cleanup_pending') {
    $state.journal.phase = 'restoring'
    Write-DurableJson $Context.journalPath $state.journal $false
    for ($index = 0; $index -lt 2; $index += 1) {
      $entry = @($state.journal.entries)[$index]
      $label = if ($index -eq 0) { 'manifest' } else { 'activity' }
      Invoke-InjectedFault $Fault "before_$($label)_restore"
      $fact = Get-TargetFact $entry.targetPath
      $matchesOriginal = if ($entry.originalKind -ceq 'absent') {
        $fact.kind -ceq 'absent'
      } else {
        $fact.kind -ceq 'file' -and $fact.sha256 -ceq $entry.originalSha256 -and $fact.length -eq $entry.originalLength
      }
      if (-not $matchesOriginal) {
        if ($fact.kind -cne 'file' -or $fact.sha256 -cne $entry.desiredSha256 -or $fact.length -ne $entry.desiredLength) {
          throw 'materialization_preserve_all_stop'
        }
        if ($entry.originalKind -ceq 'file') {
          Invoke-CasWrite $entry.targetPath $state.desired[$index] $state.original[$index] $Context.backupRoot
        } else {
          Invoke-CasDelete $entry.targetPath $state.desired[$index] $Context.backupRoot
        }
      }
      Invoke-InjectedFault $Fault "after_$($label)_restore_action"
      $entry.restored = $true
      Write-DurableJson $Context.journalPath $state.journal $false
      Invoke-InjectedFault $Fault "after_$($label)_restore"
    }
    foreach ($entry in @($state.journal.entries)) {
      $fact = Get-TargetFact $entry.targetPath
      $matchesOriginal = if ($entry.originalKind -ceq 'absent') { $fact.kind -ceq 'absent' } else {
        $fact.kind -ceq 'file' -and $fact.sha256 -ceq $entry.originalSha256 -and $fact.length -eq $entry.originalLength
      }
      if (-not $entry.restored -or -not $matchesOriginal) { throw 'materialization_preserve_all_stop' }
    }
    $state.journal.phase = 'cleanup_pending'
    Write-DurableJson $Context.journalPath $state.journal $false
  }
  Invoke-InjectedFault $Fault 'after_restoration_before_cleanup'
  foreach ($entry in @($state.journal.entries)) {
    if ($entry.backupPath -is [string] -and (Test-Path -LiteralPath $entry.backupPath -PathType Leaf)) {
      [IO.File]::Delete($entry.backupPath)
      $backupFault = if ($entry.name -ceq 'manifest') { 'after_manifest_backup_delete' } else { 'after_activity_backup_delete' }
      Invoke-InjectedFault $Fault $backupFault
    }
  }
  $remaining = @(Get-ChildItem -LiteralPath $Context.backupRoot -Force | Where-Object { $_.FullName -cne $Context.journalPath })
  if ($remaining.Count -ne 0) { throw 'materialization_cleanup_failed' }
  [IO.Directory]::Delete($Context.backupRoot, $true)
  if (Test-Path -LiteralPath $Context.backupRoot) { throw 'materialization_cleanup_failed' }
  return [pscustomobject][ordered]@{
    status = 'pass'
    restored = $true
    manifestFact = Get-TargetFact $Context.targetManifest
    activityFact = Get-TargetFact $Context.targetActivity
  }
}

function Invoke-MaterializationValidation([object]$Payload) {
  $context = Assert-MaterializationPayload $Payload
  if ($context.operation -ceq 'recover') {
    try { return Restore-Materialization $context 'none' } catch { throw 'materialization_preserve_all_stop' }
  }
  try {
    Start-Materialization $context
  } catch {
    if ($context.operation -ceq 'crash' -and $_.Exception.Message -ceq 'account_provision_lock_injected_crash') { throw }
    try { return Restore-Materialization $context 'none' } catch { throw 'materialization_preserve_all_stop' }
  }
  try {
    return Restore-Materialization $context $context.fault
  } catch {
    if ($_.Exception.Message -cne 'account_provision_lock_injected_crash') { throw }
    if ($context.operation -ceq 'crash') { throw }
    return Restore-Materialization $context 'none'
  }
}

function Convert-LibraryPayload([string]$Encoded) {
  try {
    $bytes = [Convert]::FromBase64String($Encoded)
    if ($bytes.Length -gt 262144) { throw 'invalid' }
    $utf8 = [Text.UTF8Encoding]::new($false, $true)
    return $utf8.GetString($bytes) | ConvertFrom-Json
  } catch {
    throw 'account_provision_lock_validation_payload_invalid'
  }
}

function Invoke-PackageRecoveryValidation([object]$Payload) {
  $code = 'package_recovery_validation_invalid'
  Assert-ExactKeys $Payload @('sandboxRoot', 'operation', 'fault') $code
  $root = [IO.Path]::GetFullPath([string](Get-Property $Payload 'sandboxRoot' $code))
  if (-not (Test-Path -LiteralPath $root -PathType Container) -or
      -not (Test-Path -LiteralPath (Join-Path $root 'package.json') -PathType Leaf)) { throw $code }
  $operation = Get-Property $Payload 'operation' $code
  if (@('exercise', 'crash', 'recover') -cnotcontains $operation) { throw $code }
  $fault = Get-Property $Payload 'fault' $code
  $allowed = @(
    'none', 'after_package_journal', 'after_package_replace', 'after_package_materialized',
    'after_package_restore_journal', 'after_package_restore_action',
    'after_package_cleanup_pending', 'after_package_backup_delete'
  )
  if ($allowed -cnotcontains $fault) { throw $code }
  $oldRepo = $script:Repo
  try {
    $script:Repo = $root
    $restoreFault = $fault -clike 'after_package_restore*' -or
      $fault -ceq 'after_package_cleanup_pending' -or $fault -ceq 'after_package_backup_delete'
    if ($operation -ceq 'recover') {
      Restore-PackageEntrypoint
    } elseif ($operation -ceq 'crash') {
      if ($restoreFault) { Start-PackageEntrypoint; Restore-PackageEntrypoint $fault }
      else { Start-PackageEntrypoint $fault }
      throw 'package_recovery_crash_not_injected'
    } else {
      try {
        if ($restoreFault) { Start-PackageEntrypoint; Restore-PackageEntrypoint $fault }
        else { Start-PackageEntrypoint $fault; Restore-PackageEntrypoint }
      } catch {
        if ($_.Exception.Message -cne 'account_provision_lock_injected_crash') { throw }
        Restore-PackageEntrypoint
      }
    }
    if (Test-Path -LiteralPath (Get-PackageRecoveryContext).root) { throw 'package_recovery_preserve_all_stop' }
    return [pscustomobject][ordered]@{ status = 'pass'; restored = $true }
  } finally {
    $script:Repo = $oldRepo
  }
}

function Invoke-LibraryValidation([string]$Kind, [object]$Payload) {
  switch ($Kind) {
    'ContendedCheckpoint' { return Assert-ContendedCheckpoint $Payload }
    'KilledWaiterBoundary' { return Assert-KilledWaiterBoundary $Payload }
    'StaleLockEvidence' { return Assert-StaleLockEvidence $Payload }
    'Timeline' { return Assert-Timeline $Payload }
    'PhaseTranscript' { return Assert-PhaseTranscript $Payload }
    'CleanupModel' { return Assert-CleanupModel $Payload }
    'OwnedRepositorySnapshot' { return Assert-OwnedRepositorySnapshotModel $Payload }
    'CampaignIntegrityMatrix' { return Assert-CampaignIntegrityMatrixModel $Payload }
    'ActivatedNativeProvenance' { return Assert-ActivatedNativeProvenanceModel $Payload }
    'ApkDexSurface' { return Assert-ApkDexSurfaceModel $Payload }
    'ApkDexSurfacePath' {
      $code = 'apk_dex_surface_invalid'
      Assert-ExactKeys $Payload @('apkPath') $code
      $apkPath = Get-Property $Payload 'apkPath' $code
      if ($apkPath -isnot [string] -or [string]::IsNullOrWhiteSpace($apkPath)) { throw $code }
      return Assert-ApkDexSurface $apkPath
    }
    'MergedDebugManifest' { return Assert-MergedDebugManifestModel $Payload }
    'Materialization' { return Invoke-MaterializationValidation $Payload }
    'PackageRecovery' { return Invoke-PackageRecoveryValidation $Payload }
    'SourceTrust' { return Assert-SourceTrustModel $Payload }
    'EvidencePublication' { return Invoke-EvidencePublicationValidation $Payload }
    'RuntimeMarkerBinding' { return Assert-RuntimeMarkerBinding $Payload }
    'AdbTransport' { return Assert-AdbTransportModel $Payload }
    'DiagnosticReducer' { return Assert-DiagnosticReducerModel $Payload }
    'FailureEnvelope' { return Assert-FailureEnvelopeModel $Payload }
    'HostGateReceipt' { return Assert-HostGateReceiptModel $Payload }
    default { throw 'account_provision_lock_validation_kind_invalid' }
  }
}

function New-DeviceMaterializationContext {
  $backupRoot = Join-Path $script:Repo '.codex-tmp\account-provision-lock-materialization'
  return [pscustomobject][ordered]@{
    sandboxRoot = $script:Repo
    operation = 'exercise'
    fault = 'none'
    targetManifest = Join-Path $script:Repo 'android\app\src\debug\AndroidManifest.xml'
    targetActivity = Join-Path $script:Repo 'android\app\src\debug\java\app\phraseman\AccountV2ProbeActivity.kt'
    fixtureManifest = Join-Path $script:Repo 'runtime-probes\android-account-provision-lock\android\AndroidManifest.fragment.xml'
    fixtureActivity = Join-Path $script:Repo 'runtime-probes\android-account-provision-lock\android\AccountV2ProbeActivity.kt'
    journalPath = Join-Path $backupRoot 'journal.json'
    backupRoot = $backupRoot
  }
}

function Get-PackageRecoveryContext {
  $root = Join-Path $script:Repo '.codex-tmp\account-provision-lock-package-recovery'
  return [pscustomobject][ordered]@{
    root = $root
    target = Join-Path $script:Repo 'package.json'
    journal = Join-Path $root 'journal.json'
    backup = Join-Path $root 'package.original.bin'
  }
}

function Read-PackageRecoveryState([object]$Context) {
  $code = 'package_recovery_preserve_all_stop'
  if (-not (Test-Path -LiteralPath $Context.root -PathType Container)) { throw $code }
  $rawBytes = Get-FileBytes $Context.journal $code
  try {
    $raw = [Text.UTF8Encoding]::new($false, $true).GetString($rawBytes)
    $journal = $raw | ConvertFrom-Json
    if ($raw -cne ($journal | ConvertTo-Json -Depth 10 -Compress)) { throw $code }
  } catch { throw $code }
  Assert-ExactKeys $journal @(
    'schemaVersion', 'owner', 'phase', 'restored', 'target', 'backup',
    'originalLength', 'originalSha256', 'desiredLength', 'desiredSha256'
  ) $code
  if ($journal.schemaVersion -ne 2 -or $journal.owner -cne 'account-provision-lock-package-v2' -or
      $journal.target -cne $Context.target -or $journal.backup -cne $Context.backup) { throw $code }
  if (@('prepared', 'materialized', 'restoring', 'cleanup_pending') -cnotcontains $journal.phase -or
      $journal.restored -isnot [bool] -or ($journal.restored -and $journal.phase -cne 'cleanup_pending')) { throw $code }
  $inventory = @(Get-ChildItem -LiteralPath $Context.root -Force)
  $actual = @($inventory | ForEach-Object {
    if ($_.PSIsContainer -or ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw $code }
    $_.FullName
  } | Sort-Object)
  $backupPresent = Test-Path -LiteralPath $Context.backup -PathType Leaf
  $expected = if ($backupPresent) { @($Context.backup, $Context.journal) } else { @($Context.journal) }
  $expected = @($expected | Sort-Object)
  if ($actual.Count -ne $expected.Count) { throw $code }
  for ($index = 0; $index -lt $actual.Count; $index += 1) { if ($actual[$index] -cne $expected[$index]) { throw $code } }
  $original = if ($backupPresent) { Get-FileBytes $Context.backup $code } else { $null }
  if ($backupPresent -and ($original.Length -ne $journal.originalLength -or
      (Get-BytesSha256 $original) -cne $journal.originalSha256)) { throw $code }
  $fact = Get-TargetFact $Context.target
  $matchesOriginal = $fact.kind -ceq 'file' -and $fact.length -eq $journal.originalLength -and $fact.sha256 -ceq $journal.originalSha256
  $matchesDesired = $fact.kind -ceq 'file' -and $fact.length -eq $journal.desiredLength -and $fact.sha256 -ceq $journal.desiredSha256
  if (-not $matchesOriginal -and -not $matchesDesired) { throw $code }
  if (-not $backupPresent -and (-not $journal.restored -or $journal.phase -cne 'cleanup_pending' -or -not $matchesOriginal)) { throw $code }
  return [pscustomobject][ordered]@{
    journal = $journal; original = $original; matchesOriginal = $matchesOriginal
    matchesDesired = $matchesDesired; backupPresent = $backupPresent
  }
}

function Start-PackageEntrypoint([string]$Fault = 'none') {
  $context = Get-PackageRecoveryContext
  if (Test-Path -LiteralPath $context.root) { throw 'package_recovery_preserve_all_stop' }
  [IO.Directory]::CreateDirectory($context.root) | Out-Null
  $original = Get-FileBytes $context.target 'package_recovery_invalid'
  try {
    $package = [Text.UTF8Encoding]::new($false, $true).GetString($original) | ConvertFrom-Json
    $package.main = 'runtime-probes/android-account-provision-lock/index.js'
    $desired = [Text.UTF8Encoding]::new($false).GetBytes(($package | ConvertTo-Json -Depth 100))
  } catch { throw 'package_recovery_invalid' }
  Write-DurableNewBytes $context.backup $original 'package_recovery_invalid'
  $journal = [pscustomobject][ordered]@{
    schemaVersion = 2
    owner = 'account-provision-lock-package-v2'
    phase = 'prepared'
    restored = $false
    target = $context.target
    backup = $context.backup
    originalLength = [long]$original.Length
    originalSha256 = Get-BytesSha256 $original
    desiredLength = [long]$desired.Length
    desiredSha256 = Get-BytesSha256 $desired
  }
  Write-DurableJson $context.journal $journal $true
  Invoke-InjectedFault $Fault 'after_package_journal'
  Invoke-CasWrite $context.target $original $desired $context.root
  Invoke-InjectedFault $Fault 'after_package_replace'
  $journal.phase = 'materialized'
  Write-DurableJson $context.journal $journal $false
  Invoke-InjectedFault $Fault 'after_package_materialized'
  $script:PackageEntrypointState = $context
}

function Restore-PackageEntrypoint([string]$Fault = 'none') {
  $context = Get-PackageRecoveryContext
  if (-not (Test-Path -LiteralPath $context.root)) { return }
  $state = Read-PackageRecoveryState $context
  if (-not $state.matchesOriginal) {
    if (-not $state.backupPresent -or $null -eq $state.original) { throw 'package_recovery_preserve_all_stop' }
    $state.journal.phase = 'restoring'
    Write-DurableJson $context.journal $state.journal $false
    Invoke-InjectedFault $Fault 'after_package_restore_journal'
    $desired = Get-FileBytes $context.target 'package_recovery_preserve_all_stop'
    Invoke-CasWrite $context.target $desired $state.original $context.root
    Invoke-InjectedFault $Fault 'after_package_restore_action'
  }
  $restoredFact = Get-TargetFact $context.target
  if ($restoredFact.kind -cne 'file' -or $restoredFact.length -ne $state.journal.originalLength -or
      $restoredFact.sha256 -cne $state.journal.originalSha256) { throw 'package_recovery_preserve_all_stop' }
  if (-not $state.journal.restored -or $state.journal.phase -cne 'cleanup_pending') {
    $state.journal.restored = $true
    $state.journal.phase = 'cleanup_pending'
    Write-DurableJson $context.journal $state.journal $false
    Invoke-InjectedFault $Fault 'after_package_cleanup_pending'
  }
  if (Test-Path -LiteralPath $context.backup -PathType Leaf) { [IO.File]::Delete($context.backup) }
  Invoke-InjectedFault $Fault 'after_package_backup_delete'
  [IO.File]::Delete($context.journal)
  if (@(Get-ChildItem -LiteralPath $context.root -Force).Count -ne 0) { throw 'package_recovery_preserve_all_stop' }
  [IO.Directory]::Delete($context.root)
  $script:PackageEntrypointState = $null
}

function Invoke-StartupRecovery {
  $script:DeviceMaterializationContext = New-DeviceMaterializationContext
  $androidRootExists = Test-Path -LiteralPath $script:DeviceMaterializationContext.backupRoot
  $androidJournalExists = Test-Path -LiteralPath $script:DeviceMaterializationContext.journalPath -PathType Leaf
  if ($androidRootExists -ne $androidJournalExists) { $script:PreserveAll = $true; throw 'materialization_preserve_all_stop' }
  if ($androidJournalExists) {
    try { Restore-Materialization $script:DeviceMaterializationContext 'none' | Out-Null }
    catch { $script:PreserveAll = $true; throw 'materialization_preserve_all_stop' }
  }
  $packageContext = Get-PackageRecoveryContext
  $packageRootExists = Test-Path -LiteralPath $packageContext.root
  $packageJournalExists = Test-Path -LiteralPath $packageContext.journal -PathType Leaf
  if ($packageRootExists -ne $packageJournalExists) { $script:PreserveAll = $true; throw 'package_recovery_preserve_all_stop' }
  if ($packageJournalExists) {
    try { Restore-PackageEntrypoint } catch { $script:PreserveAll = $true; throw 'package_recovery_preserve_all_stop' }
  }
}

function Open-SevenPathHolds {
  foreach ($relative in $script:SevenPaths) {
    $path = Join-Path $script:Repo $relative
    $script:HeldSourceHandles += [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
  }
}

function Open-ActivatedNativeInputHolds {
  if ($script:HeldActivatedNativeHandles.Count -ne 0) { throw 'activated_native_provenance_invalid' }
  try {
    foreach ($relative in $script:ActivatedNativeInputs) {
      $path = Assert-PlainDescendantFile $script:Repo $relative 'activated_native_provenance_invalid'
      $script:HeldActivatedNativeHandles += [IO.File]::Open(
        $path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read
      )
    }
    $script:ActivatedNativeProvenance = Get-ActivatedNativeProvenanceFacts `
      $script:Repo 'activated_native_provenance_invalid' 'activated_native_package_version_invalid'
    Assert-ActivatedNativeProvenanceCandidate `
      $script:ActivatedNativeProvenance 'activated_native_provenance_invalid'
  } catch {
    $failure = $_.Exception.Message
    foreach ($handle in $script:HeldActivatedNativeHandles) {
      try { $handle.Dispose() } catch { }
    }
    $script:HeldActivatedNativeHandles = @()
    throw $failure
  }
}

function Close-SevenPathHolds([string]$Fault = 'none') {
  $closeFailed = $false
  foreach ($handle in $script:HeldSourceHandles) {
    try { $handle.Dispose() } catch { $closeFailed = $true }
  }
  $script:HeldSourceHandles = @()
  foreach ($handle in $script:HeldActivatedNativeHandles) {
    try { $handle.Dispose() } catch { $closeFailed = $true }
  }
  $script:HeldActivatedNativeHandles = @()
  if ($null -ne $script:ReviewedReceiptHandle) {
    try { $script:ReviewedReceiptHandle.Dispose() } catch { $closeFailed = $true }
    $script:ReviewedReceiptHandle = $null
  }
  Invoke-InjectedFault $Fault 'custody_teardown_failure'
  if ($closeFailed) { throw 'source_custody_close_failed' }
}

function Get-SevenPathFacts {
  $facts = @()
  foreach ($relative in $script:SevenPaths) {
    $path = Join-Path $script:Repo $relative
    $item = Get-Item -LiteralPath $path
    $facts += [pscustomobject][ordered]@{ path = $relative; kind = 'file'; length = [long]$item.Length; sha256 = Get-Sha256 $path }
  }
  return $facts
}

function Get-AbsoluteResourceFact([string]$Name, [object]$Path, [string]$Code) {
  if ($Path -isnot [string] -or [string]::IsNullOrWhiteSpace($Path) -or
      -not (Test-Path -LiteralPath $Path)) {
    return [pscustomobject][ordered]@{ name = $Name; kind = 'absent'; length = [long]0; sha256 = $null }
  }
  $item = Get-Item -LiteralPath ([IO.Path]::GetFullPath($Path)) -Force
  if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw $Code }
  if ($item.PSIsContainer) {
    return [pscustomobject][ordered]@{ name = $Name; kind = 'directory'; length = [long]0; sha256 = $null }
  }
  return [pscustomobject][ordered]@{
    name = $Name; kind = 'file'; length = [long]$item.Length; sha256 = Get-Sha256 $item.FullName
  }
}

function Get-ScopedGitFacts([string]$Root, [string[]]$RelativePaths, [string]$Code) {
  $facts = @()
  foreach ($relative in $RelativePaths) {
    if ([string]::IsNullOrWhiteSpace($relative) -or [IO.Path]::IsPathRooted($relative) -or
        $relative.Contains('\') -or $relative -cnotmatch '^[A-Za-z0-9._+/-]+$') { throw $Code }
    $tracked = @(& git -C $Root 'ls-files' '--error-unmatch' '--' $relative 2>$null)
    if ($LASTEXITCODE -ne 0 -or $tracked.Count -ne 1 -or $tracked[0].Replace('\', '/') -cne $relative) { throw $Code }
    $staged = @(& git -C $Root 'ls-files' '--stage' '--' $relative 2>$null)
    if ($LASTEXITCODE -ne 0 -or $staged.Count -ne 1) { throw $Code }
    $match = [regex]::Match([string]$staged[0], '^([0-7]{6}) ([0-9a-f]{40}|[0-9a-f]{64}) ([0-3])\t(.+)$')
    if (-not $match.Success -or $match.Groups[4].Value.Replace('\', '/') -cne $relative -or
        [int]$match.Groups[3].Value -ne 0) { throw $Code }
    $status = @(& git -C $Root '-c' 'core.quotepath=false' 'status' '--porcelain=v1' '--untracked-files=all' '--' $relative 2>$null)
    if ($LASTEXITCODE -ne 0) { throw $Code }
    $canonicalStatus = if ($status.Count -eq 0) { '' } else { ($status -join "`n") + "`n" }
    $facts += [pscustomobject][ordered]@{
      path = $relative
      tracked = $true
      indexMode = $match.Groups[1].Value
      indexObjectId = $match.Groups[2].Value
      indexStage = [int]$match.Groups[3].Value
      statusRecordCount = $status.Count
      statusSha256 = Get-BytesSha256 ([Text.UTF8Encoding]::new($false).GetBytes($canonicalStatus))
    }
  }
  return $facts
}

function Get-RepositoryFacts {
  $code = 'repository_fact_failed'
  if ($null -eq $script:DeviceMaterializationContext -or $null -eq $script:ReviewedSourceReceipt) { throw $code }
  $ownedRelativePaths = @($script:SevenPaths) + @(
    'package.json',
    'android/app/src/debug/AndroidManifest.xml',
    'android/app/src/debug/java/app/phraseman/AccountV2ProbeActivity.kt'
  )
  $packageRecovery = Get-PackageRecoveryContext
  $apkPath = if ($null -ne $script:BuiltApkPath) {
    $script:BuiltApkPath
  } else {
    Join-Path $script:Repo 'android\app\build\outputs\apk\debug\app-debug.apk'
  }
  $activatedNative = Get-ActivatedNativeProvenanceFacts `
    $script:Repo $code $code
  return [pscustomobject][ordered]@{
    scope = 'account-provision-lock-campaign-owned-v2'
    packetSha256 = Get-Sha256 $PacketPath
    reviewedReceiptSha256 = $script:ReviewedSourceReceipt.receiptSha256
    launcherSha256 = $script:ReviewedSourceReceipt.launcherSha256
    ownedPaths = @(Get-OwnedPathFacts $script:Repo $ownedRelativePaths $code)
    criticalInputs = @(Get-OwnedPathFacts $script:Repo $script:CriticalInputs $code)
    activatedNativeInputs = @($activatedNative.inputs)
    activatedNativePackageVersion = $activatedNative.packageVersion
    gitScope = @(Get-ScopedGitFacts $script:Repo (@($script:SevenPaths) + @($script:CriticalInputs)) $code)
    localApk = Get-AbsoluteResourceFact 'local-debug-apk' $apkPath $code
    materializationRecovery = Get-AbsoluteResourceFact 'android-recovery' $script:DeviceMaterializationContext.backupRoot $code
    packageRecovery = Get-AbsoluteResourceFact 'package-recovery' $packageRecovery.root $code
    campaignTemp = Get-AbsoluteResourceFact 'campaign-temp' $script:CampaignTemp $code
  }
}

function Assert-CampaignOwnedCleanupIntegrity([object]$Before, [object]$After) {
  $code = 'repository_drift'
  if ($null -eq $Before -or $null -eq $After -or
      $Before.scope -cne 'account-provision-lock-campaign-owned-v2' -or
      $After.scope -cne $Before.scope -or
      $After.packetSha256 -cne $Before.packetSha256 -or
      $After.reviewedReceiptSha256 -cne $Before.reviewedReceiptSha256 -or
      $After.launcherSha256 -cne $Before.launcherSha256) { throw $code }
  Assert-OwnedPathFactsEqual @($Before.ownedPaths) @($After.ownedPaths) $code
  Assert-OwnedPathFactsEqual @($Before.criticalInputs) @($After.criticalInputs) $code
  Assert-OwnedPathFactsEqual @($Before.activatedNativeInputs) @($After.activatedNativeInputs) $code
  if ($After.activatedNativePackageVersion -cne $Before.activatedNativePackageVersion) { throw $code }
  Assert-OwnedPathFactsEqual @($Before.gitScope) @($After.gitScope) $code
  foreach ($fact in @($After.materializationRecovery, $After.packageRecovery, $After.campaignTemp)) {
    if ($fact.kind -cne 'absent') { throw $code }
  }
  if ($null -eq $script:BuiltApkSha256) {
    Assert-OwnedPathFactsEqual @($Before.localApk) @($After.localApk) $code
  } elseif ($After.localApk.kind -cne 'file' -or $After.localApk.sha256 -cne $script:BuiltApkSha256) {
    throw $code
  }
}

function Assert-CampaignOwnedPostPublicationIntegrity([object]$Expected, [object]$Actual) {
  if (($Expected | ConvertTo-Json -Depth 10 -Compress) -cne
      ($Actual | ConvertTo-Json -Depth 10 -Compress)) {
    throw 'post_publication_repository_snapshot_failed'
  }
}

function Get-HostGateFailureCodes([string]$Label) {
  $prefix = switch ($Label) {
    'authentic-red-probe' { 'host_gate_red_probe' }
    'authentic-red-entrypoint' { 'host_gate_red_entrypoint' }
    'focused-green-probe' { 'host_gate_green_probe' }
    'focused-green-entrypoint' { 'host_gate_green_entrypoint' }
    'focused-green-sqlite-lease' { 'host_gate_green_sqlite_lease' }
    'strict-typescript' { 'host_gate_typescript' }
    'zero-warning-eslint' { 'host_gate_eslint' }
    default { throw 'host_gate_definition_invalid' }
  }
  return [pscustomobject][ordered]@{
    exit = "${prefix}_exit_failed"
    harness = "${prefix}_harness_failed"
    receipt = "${prefix}_receipt_invalid"
  }
}

function Assert-HostGateResult(
  [string]$Label,
  [string]$Canonical,
  [int]$ExitCode,
  [bool]$ExpectSuccess,
  [int]$ExpectedFailed = -1,
  [int]$ExpectedPassed = -1,
  [int]$ExpectedTotal = -1
) {
  $codes = Get-HostGateFailureCodes $Label
  if (($ExpectSuccess -and $ExitCode -ne 0) -or (-not $ExpectSuccess -and $ExitCode -eq 0)) { throw $codes.exit }
  if ($Canonical -cmatch 'Test suite failed to run') { throw $codes.harness }
  $failed = 0; $passed = 0; $total = 0
  if ($ExpectedFailed -ge 0 -or $ExpectedPassed -ge 0 -or $ExpectedTotal -ge 0) {
    $summaries = [regex]::Matches($Canonical, 'Tests:\s+(?:(?<failed>[0-9]+) failed,\s*)?(?:(?<passed>[0-9]+) passed,\s*)?(?<total>[0-9]+) total')
    if ($summaries.Count -ne 1) { throw $codes.receipt }
    $summary = $summaries[0]
    $failed = if ($summary.Groups['failed'].Success) { [int]$summary.Groups['failed'].Value } else { 0 }
    $passed = if ($summary.Groups['passed'].Success) { [int]$summary.Groups['passed'].Value } else { 0 }
    $total = [int]$summary.Groups['total'].Value
    if (($ExpectedFailed -ge 0 -and $failed -ne $ExpectedFailed) -or
        ($ExpectedPassed -ge 0 -and $passed -ne $ExpectedPassed) -or
        ($ExpectedTotal -ge 0 -and $total -ne $ExpectedTotal) -or
        $total -ne ($failed + $passed)) { throw $codes.receipt }
  }
  return [pscustomobject][ordered]@{ failed = $failed; passed = $passed; total = $total }
}

function Invoke-HostGateCommand(
  [string]$Label,
  [string[]]$Arguments,
  [bool]$ExpectSuccess,
  [int]$ExpectedFailed = -1,
  [int]$ExpectedPassed = -1,
  [int]$ExpectedTotal = -1
) {
  $lines = @(& node @Arguments 2>&1 | ForEach-Object { [string]$_ })
  $exitCode = $LASTEXITCODE
  $canonical = ($lines -join "`n") + "`n"
  $counts = Assert-HostGateResult `
    $Label $canonical $exitCode $ExpectSuccess $ExpectedFailed $ExpectedPassed $ExpectedTotal
  return [pscustomobject][ordered]@{
    label = $Label
    expected = if ($ExpectSuccess) { 'success' } else { 'failure' }
    exitCode = $exitCode
    failed = $counts.failed
    passed = $counts.passed
    total = $counts.total
    outputSha256 = Get-BytesSha256 ([Text.UTF8Encoding]::new($false).GetBytes($canonical))
  }
}

function Invoke-AuthenticRedGate {
  $oldFake = $env:ACCOUNT_PROVISION_LOCK_VULNERABLE
  $oldNodeOptions = $env:NODE_OPTIONS
  try {
    $env:ACCOUNT_PROVISION_LOCK_VULNERABLE = '1'
    $env:NODE_OPTIONS = '--max-old-space-size=6144'
    $receipts = @()
    foreach ($spec in @(
      @('tests/account_provision_lock_android_runtime_probe.test.ts', 26, 1, 27, 'authentic-red-probe'),
      @('tests/account_provision_lock_android_runtime_entrypoint.test.ts', 53, 5, 58, 'authentic-red-entrypoint')
    )) {
      $receipt = Invoke-HostGateCommand $spec[4] @(
        'node_modules/jest/bin/jest.js', '--runTestsByPath', $spec[0],
        '--no-cache', '--runInBand', '--watchman=false', '--verbose=false'
      ) $false $spec[1] $spec[2] $spec[3]
      $receipt | Add-Member -NotePropertyName testPath -NotePropertyValue $spec[0]
      $receipt | Add-Member -NotePropertyName testSha256 -NotePropertyValue (Get-Sha256 (Join-Path $script:Repo $spec[0]))
      $receipt | Add-Member -NotePropertyName vulnerableFake -NotePropertyValue 'inline-vulnerable-source-substitution-v1'
      $receipts += $receipt
    }
    return $receipts
  } finally {
    if ($null -eq $oldFake) { Remove-Item Env:ACCOUNT_PROVISION_LOCK_VULNERABLE -ErrorAction SilentlyContinue } else { $env:ACCOUNT_PROVISION_LOCK_VULNERABLE = $oldFake }
    if ($null -eq $oldNodeOptions) { Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue } else { $env:NODE_OPTIONS = $oldNodeOptions }
  }
}

function Invoke-FocusedGreenGates {
  if ($null -ne $env:ACCOUNT_PROVISION_LOCK_VULNERABLE) { throw 'host_gate_override_forbidden' }
  $oldNodeOptions = $env:NODE_OPTIONS
  try {
    $env:NODE_OPTIONS = '--max-old-space-size=6144'
    $receipts = @()
    foreach ($spec in @(
      @('tests/account_provision_lock_android_runtime_probe.test.ts', 27, 'focused-green-probe'),
      @('tests/account_provision_lock_android_runtime_entrypoint.test.ts', 58, 'focused-green-entrypoint'),
      @('tests/account_sqlite_lease_patch_v2.test.ts', 13, 'focused-green-sqlite-lease')
    )) {
      $test = $spec[0]
      $expectedPassed = if ($test -clike '*probe.test.ts') { 27 } else { if ($test -clike '*entrypoint.test.ts') { 58 } else { 13 } }
      $receipts += Invoke-HostGateCommand $spec[2] @(
        'node_modules/jest/bin/jest.js', '--runTestsByPath', $test,
        '--no-cache', '--runInBand', '--watchman=false', '--verbose=false'
      ) $true 0 $expectedPassed $spec[1]
    }
    $receipts += Invoke-HostGateCommand 'strict-typescript' @(
      'node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false', '--strict', '--skipLibCheck',
      '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--esModuleInterop',
      '--lib', 'ES2022,DOM', '--types', 'jest,node',
      'runtime-probes/android-account-provision-lock/probe.ts',
      'tests/account_provision_lock_android_runtime_probe.test.ts',
      'tests/account_provision_lock_android_runtime_entrypoint.test.ts'
    ) $true
    $receipts += Invoke-HostGateCommand 'zero-warning-eslint' @(
      'node_modules/eslint/bin/eslint.js', '--max-warnings=0',
      'runtime-probes/android-account-provision-lock/probe.ts',
      'runtime-probes/android-account-provision-lock/index.js',
      'tests/account_provision_lock_android_runtime_probe.test.ts',
      'tests/account_provision_lock_android_runtime_entrypoint.test.ts'
    ) $true
    $tokens = $null; $errors = $null
    [Management.Automation.Language.Parser]::ParseFile((Join-Path $script:Repo 'runtime-probes/android-account-provision-lock/run-proof.ps1'), [ref]$tokens, [ref]$errors) | Out-Null
    if (@($errors).Count -ne 0) { throw 'powershell_parser_gate_failed' }
    & git -C $script:Repo diff --check HEAD -- $script:SevenPaths 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'diff_check_failed' }
    foreach ($relative in $script:SevenPaths) {
      foreach ($line in Get-Content -LiteralPath (Join-Path $script:Repo $relative)) {
        if ($line -cmatch '[ \t]+$') { throw 'diff_check_failed' }
      }
    }
    $receipts += [pscustomobject][ordered]@{ label = 'powershell-parser'; expected = 'success'; exitCode = 0; outputSha256 = ('0' * 64) }
    $receipts += [pscustomobject][ordered]@{ label = 'diff-check'; expected = 'success'; exitCode = 0; outputSha256 = ('0' * 64) }
    return $receipts
  } finally {
    if ($null -eq $oldNodeOptions) { Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue } else { $env:NODE_OPTIONS = $oldNodeOptions }
  }
}

function Invoke-BoundedHostGates {
  $bash = 'C:\Program Files\Git\bin\bash.exe'
  if (-not (Test-Path -LiteralPath $bash -PathType Leaf)) { throw 'host_gate_semaphore_unavailable' }
  & $bash '-lc' 'bash .claude/semaphore/slot.sh acquire "account provision lock runtime gates"' 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'host_gate_semaphore_unavailable' }
  try {
    $red = Invoke-AuthenticRedGate
    $green = Invoke-FocusedGreenGates
    $script:GateReceipts = @($red) + @($green)
  } finally {
    & $bash '-lc' 'bash .claude/semaphore/slot.sh release' 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'host_gate_semaphore_release_failed' }
  }
}

function Start-DeviceMaterialization {
  $script:GeneratedTargetFactsBefore = @(
    Get-TargetFact $script:DeviceMaterializationContext.targetManifest
    Get-TargetFact $script:DeviceMaterializationContext.targetActivity
  )
  Start-Materialization $script:DeviceMaterializationContext
  Start-PackageEntrypoint
}

function Get-MaterializedInputHashes {
  $packagePath = Join-Path $script:Repo 'package.json'
  $packageBytes = Get-FileBytes $packagePath 'materialized_input_hash_failed'
  try { $package = [Text.UTF8Encoding]::new($false, $true).GetString($packageBytes) | ConvertFrom-Json }
  catch { throw 'materialized_input_hash_failed' }
  if ($package.main -cne 'runtime-probes/android-account-provision-lock/index.js') { throw 'materialized_input_hash_failed' }
  $manifest = Get-TargetFact $script:DeviceMaterializationContext.targetManifest
  $activity = Get-TargetFact $script:DeviceMaterializationContext.targetActivity
  if ($manifest.kind -cne 'file' -or $activity.kind -cne 'file') { throw 'materialized_input_hash_failed' }
  return [pscustomobject][ordered]@{
    packageJsonSha256 = Get-BytesSha256 $packageBytes
    debugManifestSha256 = $manifest.sha256
    debugActivitySha256 = $activity.sha256
    metroEntrypointSha256 = Get-Sha256 (Join-Path $script:Repo 'runtime-probes/android-account-provision-lock/index.js')
    metroProbeSha256 = Get-Sha256 (Join-Path $script:Repo 'runtime-probes/android-account-provision-lock/probe.ts')
  }
}

function Restore-DeviceMaterialization {
  if ($script:PreserveAll) { return }
  Restore-PackageEntrypoint
  Restore-AndroidMaterialization
}

function Restore-AndroidMaterialization {
  if ($script:PreserveAll) { return }
  if ($null -ne $script:DeviceMaterializationContext -and
      (Test-Path -LiteralPath $script:DeviceMaterializationContext.journalPath -PathType Leaf)) {
    Restore-Materialization $script:DeviceMaterializationContext 'none' | Out-Null
  }
  if ($null -ne $script:GeneratedTargetFactsBefore) {
    $after = @(
      Get-TargetFact $script:DeviceMaterializationContext.targetManifest
      Get-TargetFact $script:DeviceMaterializationContext.targetActivity
    )
    for ($index = 0; $index -lt 2; $index += 1) {
      if ($after[$index].path -cne $script:GeneratedTargetFactsBefore[$index].path -or
          $after[$index].kind -cne $script:GeneratedTargetFactsBefore[$index].kind -or
          $after[$index].length -ne $script:GeneratedTargetFactsBefore[$index].length -or
          $after[$index].sha256 -cne $script:GeneratedTargetFactsBefore[$index].sha256) {
        throw 'generated_target_restoration_failed'
      }
    }
    $script:GeneratedTargetFactsAfter = $after
  }
}

function Invoke-Adb([string[]]$Arguments, [string]$Code) {
  $transportArguments = @(ConvertTo-AdbTransportArguments $Arguments)
  $lines = @(& adb '-s' $Serial @transportArguments 2>&1 | ForEach-Object { [string]$_ })
  if ($LASTEXITCODE -ne 0) { throw $Code }
  return $lines
}

function Get-ProcStat([int]$ProcessId) {
  $procPath = '/proc/{0}/stat' -f $ProcessId
  $line = @(Invoke-Adb @('shell', 'run-as', $script:PackageName, 'cat', $procPath) 'proc_observation_failed')
  if ($line.Count -ne 1 -or $line[0] -notmatch '^([0-9]+) \(.+\) .+ ([0-9]+)(?:\s*)$') { throw 'proc_observation_failed' }
  $close = $line[0].LastIndexOf(')')
  $fields = @($line[0].Substring($close + 2) -split '\s+')
  if ($fields.Count -le 19 -or $fields[19] -notmatch '^[1-9][0-9]*$') { throw 'proc_observation_failed' }
  return [pscustomobject][ordered]@{ pid = $ProcessId; starttime = $fields[19] }
}

function Test-ProcDisappeared([int]$ProcessId) {
  $procPath = '/proc/{0}/stat' -f $ProcessId
  try {
    Invoke-Adb @('shell', 'run-as', $script:PackageName, 'test', '!', '-e', $procPath) 'proc_observation_failed' | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Get-ExactLstatFact([string]$LockPath, [string]$Checkpoint, [double]$Sequence) {
  # Exact device lstat command: stat -c '%F|%N' -- <path>
  $lines = @(Invoke-Adb @('shell', 'run-as', $script:PackageName, 'stat', '-c', '%F|%N', '--', $LockPath) 'stale_lstat_failed')
  if ($lines.Count -ne 1 -or $lines[0] -notmatch '^regular file\|') { throw 'account_provision_lock_stale_file_invalid' }
  $pathHash = Get-BytesSha256 ([Text.Encoding]::UTF8.GetBytes($LockPath))
  return [pscustomobject][ordered]@{ checkpoint = $Checkpoint; sequence = $Sequence; identity = 'x'; pathHash = $pathHash; exists = $true; kind = 'regular'; symlink = $false }
}

function Start-Secondary([string]$Role, [string]$Identity, [string]$Nonce) {
  $arguments = @(
    'shell', 'run-as', $script:PackageName, 'am', 'start',
    '-n', $script:RemoteComponent,
    '--es', 'account_v2_command', 'launch',
    '--es', 'account_v2_role', $Role,
    '--es', 'account_v2_identity', $Identity,
    '--es', 'account_v2_launch_nonce', $Nonce
  )
  Invoke-Adb $arguments 'secondary_start_failed' | Out-Null
}

function Assert-ActivatedNativeProvenanceAfterBuild {
  $script:ActivatedNativeAfterBuild = Get-ActivatedNativeProvenanceFacts `
    $script:Repo 'activated_native_provenance_build_drift' 'activated_native_provenance_build_drift'
  Assert-ActivatedNativeProvenanceEqual `
    $script:ActivatedNativeProvenance $script:ActivatedNativeAfterBuild 'activated_native_provenance_build_drift'
}

function Invoke-AndroidDebugBuild {
  $gradle = Join-Path $script:Repo 'android\gradlew.bat'
  if (-not (Test-Path -LiteralPath $gradle -PathType Leaf)) { throw 'android_build_unavailable' }
  & $gradle '-p' (Join-Path $script:Repo 'android') ':app:assembleDebug' '--offline' '--no-daemon' 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'android_build_failed' }
  Assert-ActivatedNativeProvenanceAfterBuild
  $script:BuiltApkPath = Join-Path $script:Repo 'android\app\build\outputs\apk\debug\app-debug.apk'
  $script:BuiltApkSha256 = Get-Sha256 $script:BuiltApkPath
  $script:ApkDexSurfaceFact = Assert-ApkDexSurface $script:BuiltApkPath
  $mergedManifestPath = Join-Path $script:Repo `
    'android\app\build\intermediates\merged_manifests\debug\processDebugManifest\AndroidManifest.xml'
  $script:MergedDebugManifestFact = Get-MergedDebugManifestFact $mergedManifestPath
}

function Install-VerifiedApk {
  if ($script:BuiltApkSha256 -cnotmatch '^[0-9a-f]{64}$') { throw 'apk_hash_invalid' }
  $script:ApkInstallState = 'attempting'
  Invoke-Adb @('install', '-r', $script:BuiltApkPath) 'apk_install_failed' | Out-Null
  $script:ApkInstallState = 'attempted'
  Assert-InstalledApkHash | Out-Null
  $script:ApkInstallState = 'installed_verified'
}

function Start-OwnedMetro {
  if ($null -ne $script:OwnedMetroPid) { throw 'metro_ownership_invalid' }
  $stdout = Join-Path $script:CampaignTemp 'metro.stdout.raw.log'
  $stderr = Join-Path $script:CampaignTemp 'metro.stderr.raw.log'
  $oldCi = $env:CI
  try {
    $env:CI = '1'
    $process = Start-Process -FilePath (Get-Command node -ErrorAction Stop).Source -ArgumentList @(
      'node_modules/expo/bin/cli', 'start', '--dev-client', '--port', '8081', '--non-interactive'
    ) -WorkingDirectory $script:Repo -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden -PassThru
  } finally {
    if ($null -eq $oldCi) { Remove-Item Env:CI -ErrorAction SilentlyContinue } else { $env:CI = $oldCi }
  }
  $script:OwnedMetroPid = $process.Id
  $script:OwnedMetroStartedUtc = $process.StartTime.ToUniversalTime().ToString('O')
  Start-Sleep -Seconds 1
  if ($process.HasExited) { throw 'metro_start_failed' }
  Invoke-Adb @('reverse', 'tcp:8081', 'tcp:8081') 'reverse_start_failed' | Out-Null
  $script:OwnedReverse = $true
}

function Stop-OwnedMetro {
  if ($null -eq $script:OwnedMetroPid) { return }
  $process = Get-Process -Id $script:OwnedMetroPid -ErrorAction Stop
  if ($process.StartTime.ToUniversalTime().ToString('O') -cne $script:OwnedMetroStartedUtc) { throw 'metro_ownership_invalid' }
  Stop-Process -Id $script:OwnedMetroPid -Force -ErrorAction Stop
  $process.WaitForExit(10000)
  if (-not $process.HasExited) { throw 'metro_stop_failed' }
  $script:OwnedMetroPid = $null
  $script:OwnedMetroStartedUtc = $null
}

function Assert-InstalledApkHash {
  if ($null -eq $script:CampaignTemp -or -not (Test-Path -LiteralPath $script:CampaignTemp -PathType Container)) {
    throw 'apk_hash_invalid'
  }
  $packagePaths = @(Invoke-Adb @('shell', 'pm', 'path', $script:PackageName) 'installed_apk_hash_failed')
  $basePaths = @($packagePaths | Where-Object { $_ -cmatch '^package:.*/base\.apk$' })
  if ($basePaths.Count -ne 1) { throw 'installed_apk_hash_failed' }
  $devicePath = $basePaths[0].Substring('package:'.Length)
  $pulled = Join-Path $script:CampaignTemp 'installed-base.apk'
  if (Test-Path -LiteralPath $pulled) { [IO.File]::Delete($pulled) }
  & adb '-s' $Serial 'pull' $devicePath $pulled 2>&1 | Out-Null
  $installedSha = if ($LASTEXITCODE -eq 0) { Get-Sha256 $pulled } else { $null }
  if ($LASTEXITCODE -ne 0 -or $installedSha -cne $script:BuiltApkSha256) { throw 'installed_apk_hash_failed' }
  [IO.File]::Delete($pulled)
  return [pscustomobject][ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('O')
    baseApkPathSha256 = Get-BytesSha256 ([Text.UTF8Encoding]::new($false).GetBytes($devicePath))
    localSha256 = $script:BuiltApkSha256
    installedSha256 = $installedSha
  }
}

function New-Hex32 {
  $bytes = [byte[]]::new(16)
  [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

function Get-ProcessBinding([string]$ProcessName, [string]$Nonce) {
  $pids = @(Invoke-Adb @('shell', 'pidof', '-s', $ProcessName) 'process_binding_failed')
  if ($pids.Count -ne 1 -or $pids[0].Trim() -cnotmatch '^[1-9][0-9]*$') { throw 'process_binding_failed' }
  $processId = [int]$pids[0].Trim()
  $stat = Get-ProcStat $processId
  $cmdline = @(Invoke-Adb @('shell', 'run-as', $script:PackageName, 'cat', "/proc/$processId/cmdline") 'process_binding_failed')
  if ($cmdline.Count -ne 1 -or $cmdline[0].Trim([char]0) -cne $ProcessName) { throw 'process_binding_failed' }
  return [pscustomobject][ordered]@{
    pid = $processId
    starttime = [string]$stat.starttime
    processName = $ProcessName
    launchNonce = $Nonce
  }
}

function Get-LaunchUrl([string]$Command, [string]$Role, [string]$Identity, [object]$Binding, [string]$Token = '') {
  $pairs = [ordered]@{ command = $Command }
  if ($Command -ceq 'launch') { $pairs.role = $Role; $pairs.identity = $Identity }
  $pairs.packageName = $script:PackageName
  $pairs.processName = $Binding.processName
  $pairs.pid = [string]$Binding.pid
  $pairs.starttime = $Binding.starttime
  $pairs.launchNonce = $Binding.launchNonce
  if ($Command -cne 'launch') { $pairs.runtimeIdentity = $Binding.runtimeIdentity }
  if ($Command -ceq 'checkpoint') { $pairs.token = $Token }
  $query = @($pairs.GetEnumerator() | ForEach-Object {
    [Uri]::EscapeDataString([string]$_.Key) + '=' + [Uri]::EscapeDataString([string]$_.Value)
  }) -join '&'
  return "phraseman://_account_v2_provision_lock_probe?$query"
}

function Start-PrimaryBootstrap([string]$Nonce) {
  $script:LaunchEpochByNonce[$Nonce] = ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() / 1000.0).ToString('F3', [Globalization.CultureInfo]::InvariantCulture)
  Invoke-Adb @('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d',
    'phraseman://_account_v2_provision_lock_probe?command=bootstrap', $script:PackageName) 'primary_start_failed' | Out-Null
  return Get-ProcessBinding $script:PrimaryProcess $Nonce
}

function Send-PrimaryLaunch([string]$Role, [string]$Identity, [object]$Binding) {
  $url = Get-LaunchUrl 'launch' $Role $Identity $Binding
  Invoke-Adb @('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', $url, $script:PackageName) 'primary_launch_failed' | Out-Null
  return Wait-LaunchAcknowledgement $Binding
}

function Start-SecondaryBound([string]$Role, [string]$Identity, [string]$Nonce) {
  $script:LaunchEpochByNonce[$Nonce] = ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() / 1000.0).ToString('F3', [Globalization.CultureInfo]::InvariantCulture)
  Start-Secondary $Role $Identity $Nonce
  $binding = Get-ProcessBinding $script:RemoteProcess $Nonce
  return Wait-LaunchAcknowledgement $binding
}

function Send-ReleaseControl([object]$Binding, [string]$Role, [string]$Identity) {
  if ($Binding.processName -ceq $script:PrimaryProcess) {
    $url = Get-LaunchUrl 'release' $Role $Identity $Binding
    Invoke-Adb @('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', $url, $script:PackageName) 'control_release_failed' | Out-Null
    Wait-ControlAcknowledgement $Binding 'release'
    return
  }
  Invoke-Adb @(
    'shell', 'run-as', $script:PackageName, 'am', 'start', '-n', $script:RemoteComponent,
    '--es', 'account_v2_command', 'release', '--es', 'account_v2_role', $Role,
    '--es', 'account_v2_identity', $Identity, '--es', 'account_v2_package', $script:PackageName,
    '--es', 'account_v2_process', $Binding.processName, '--ei', 'account_v2_pid', ([string]$Binding.pid),
    '--es', 'account_v2_starttime', $Binding.starttime, '--es', 'account_v2_launch_nonce', $Binding.launchNonce,
    '--es', 'account_v2_runtime_identity', $Binding.runtimeIdentity
  ) 'control_release_failed' | Out-Null
  Wait-ControlAcknowledgement $Binding 'release'
}

function Send-OwnershipCheckpoint([object]$Binding, [string]$Role, [string]$Identity, [string]$Token) {
  Assert-Hex32 $Token 'ownership_checkpoint_invalid'
  if ($Binding.processName -ceq $script:PrimaryProcess) {
    $url = Get-LaunchUrl 'checkpoint' $Role $Identity $Binding $Token
    Invoke-Adb @('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', $url, $script:PackageName) 'ownership_checkpoint_invalid' | Out-Null
    Wait-ControlAcknowledgement $Binding 'checkpoint' $Token
    return
  }
  Invoke-Adb @(
    'shell', 'run-as', $script:PackageName, 'am', 'start', '-n', $script:RemoteComponent,
    '--es', 'account_v2_command', 'checkpoint', '--es', 'account_v2_role', $Role,
    '--es', 'account_v2_identity', $Identity, '--es', 'account_v2_package', $script:PackageName,
    '--es', 'account_v2_process', $Binding.processName, '--ei', 'account_v2_pid', ([string]$Binding.pid),
    '--es', 'account_v2_starttime', $Binding.starttime, '--es', 'account_v2_launch_nonce', $Binding.launchNonce,
    '--es', 'account_v2_runtime_identity', $Binding.runtimeIdentity,
    '--es', 'account_v2_checkpoint_token', $Token
  ) 'ownership_checkpoint_invalid' | Out-Null
  Wait-ControlAcknowledgement $Binding 'checkpoint' $Token
}

function Get-ProbeMarkerPayloads([object]$Binding) {
  $notBefore = $script:LaunchEpochByNonce[$Binding.launchNonce]
  if ($null -eq $notBefore) { throw 'marker_observation_failed' }
  $lines = @(Invoke-Adb @('logcat', '-d', '-v', 'brief', '-T', $notBefore, "--pid=$($Binding.pid)", 'ReactNativeJS:I', '*:S') 'marker_observation_failed')
  $script:ObservedJsFailureCode = Get-SanitizedJsDiagnosticCode $lines
  $script:ObservedDatabaseRootDiagnostic = Get-SanitizedDatabaseRootDiagnosticFromLines `
    $lines $Binding $script:ObservedJsFailureCode
  $payloads = @()
  foreach ($line in $lines) {
    $match = [regex]::Match([string]$line, 'account_provision_lock_(?:launch_ack|attempted|acquired|control_ack|owned_checkpoint|release_requested|released|probe_pass)(?:\|[a-z0-9_.:-]+)*')
    if ($match.Success) {
      $payloads += $match.Value
    }
  }
  return $payloads
}

function Assert-MarkerPayloadBinding([string]$Payload, [object]$Binding) {
  $fields = @($Payload.Split('|'))
  $marker = $fields[0]
  $lifecycle = @(
    'account_provision_lock_launch_ack', 'account_provision_lock_attempted',
    'account_provision_lock_acquired', 'account_provision_lock_release_requested',
    'account_provision_lock_released', 'account_provision_lock_probe_pass'
  )
  $offset = if ($marker -ceq 'account_provision_lock_control_ack') { 2 } else { 1 }
  $expectedCount = if ($marker -ceq 'account_provision_lock_control_ack') { 9 } elseif ($marker -ceq 'account_provision_lock_owned_checkpoint') { 8 } else { 7 }
  if (($lifecycle -cnotcontains $marker -and $marker -cne 'account_provision_lock_control_ack' -and
       $marker -cne 'account_provision_lock_owned_checkpoint') -or $fields.Count -ne $expectedCount) {
    throw 'runtime_marker_binding_invalid'
  }
  $expected = @(
    $script:PackageName, [string]$Binding.processName, [string]$Binding.pid,
    [string]$Binding.starttime, [string]$Binding.launchNonce, [string]$Binding.runtimeIdentity
  )
  for ($index = 0; $index -lt $expected.Count; $index += 1) {
    if ($fields[$index + $offset] -cne $expected[$index]) { throw 'runtime_marker_binding_invalid' }
  }
  if ($marker -ceq 'account_provision_lock_control_ack') {
    if (($fields[1] -cne 'release' -and $fields[1] -cne 'checkpoint') -or
        ($fields[1] -ceq 'release' -and $fields[8] -cne '-') -or
        ($fields[1] -ceq 'checkpoint' -and $fields[8] -cnotmatch '^[0-9a-f]{32}$')) {
      throw 'runtime_marker_binding_invalid'
    }
  } elseif ($marker -ceq 'account_provision_lock_owned_checkpoint' -and $fields[7] -cnotmatch '^[0-9a-f]{32}$') {
    throw 'runtime_marker_binding_invalid'
  }
  return $marker
}

function Wait-LaunchAcknowledgement([object]$BaseBinding) {
  $deadline = [DateTime]::UtcNow.AddSeconds(15)
  while ([DateTime]::UtcNow -lt $deadline) {
    $acks = @((Get-ProbeMarkerPayloads $BaseBinding) | Where-Object { $_ -clike 'account_provision_lock_launch_ack|*' })
    if ($acks.Count -gt 1) { throw 'runtime_marker_binding_invalid' }
    if ($acks.Count -eq 1) {
      $fields = @($acks[0].Split('|'))
      if ($fields.Count -ne 7 -or $fields[1] -cne $script:PackageName -or
          $fields[2] -cne [string]$BaseBinding.processName -or $fields[3] -cne [string]$BaseBinding.pid -or
          $fields[4] -cne [string]$BaseBinding.starttime -or $fields[5] -cne [string]$BaseBinding.launchNonce -or
          $fields[6] -cnotmatch '^[0-9a-f]{32}$') { throw 'runtime_marker_binding_invalid' }
      return [pscustomobject][ordered]@{
        pid = $BaseBinding.pid
        starttime = $BaseBinding.starttime
        processName = $BaseBinding.processName
        launchNonce = $BaseBinding.launchNonce
        runtimeIdentity = $fields[6]
      }
    }
    Start-Sleep -Milliseconds 200
  }
  throw 'runtime_launch_acknowledgement_deadline'
}

function Get-ProbeMarkers([object]$Binding) {
  $payloads = @(Get-ProbeMarkerPayloads $Binding)
  if ($payloads.Count -eq 0 -or $payloads[0] -cnotlike 'account_provision_lock_launch_ack|*') {
    throw 'runtime_marker_binding_invalid'
  }
  $launchCount = 0
  $markers = @()
  foreach ($payload in $payloads) {
    $marker = Assert-MarkerPayloadBinding $payload $Binding
    if ($marker -ceq 'account_provision_lock_launch_ack') { $launchCount += 1; continue }
    if ($marker -ceq 'account_provision_lock_control_ack' -or $marker -ceq 'account_provision_lock_owned_checkpoint') { continue }
    $markers += $marker
  }
  if ($launchCount -ne 1) { throw 'runtime_marker_binding_invalid' }
  return $markers
}

function Wait-ProbeMarker([object]$Binding, [string]$Expected) {
  $key = "$($Binding.pid):$($Binding.starttime):$($Binding.launchNonce):$($Binding.runtimeIdentity)"
  if (-not $script:MarkerOffsets.ContainsKey($key)) { $script:MarkerOffsets[$key] = 0 }
  $deadline = [DateTime]::UtcNow.AddSeconds(15)
  while ([DateTime]::UtcNow -lt $deadline) {
    $markers = @(Get-ProbeMarkers $Binding)
    $offset = [int]$script:MarkerOffsets[$key]
    if ($markers.Count -gt $offset) {
      if ($markers[$offset] -cne $Expected) { throw 'marker_order_invalid' }
      $script:MarkerOffsets[$key] = $offset + 1
      return
    }
    Start-Sleep -Milliseconds 200
  }
  throw 'marker_observation_deadline'
}

function Assert-MarkerAbsent([object]$Binding, [string]$Marker) {
  if (@(Get-ProbeMarkers $Binding) -ccontains $Marker) { throw 'unexpected_marker_observed' }
}

function Wait-ControlAcknowledgement([object]$Binding, [string]$Command, [string]$Token = '-') {
  $expected = @(
    'account_provision_lock_control_ack', $Command, $script:PackageName, $Binding.processName,
    [string]$Binding.pid, $Binding.starttime, $Binding.launchNonce, $Binding.runtimeIdentity, $Token
  ) -join '|'
  $deadline = [DateTime]::UtcNow.AddSeconds(10)
  while ([DateTime]::UtcNow -lt $deadline) {
    $payloads = @(Get-ProbeMarkerPayloads $Binding)
    foreach ($payload in $payloads) { Assert-MarkerPayloadBinding $payload $Binding | Out-Null }
    $matches = @($payloads | Where-Object { $_ -ceq $expected })
    if ($matches.Count -gt 1) { throw 'runtime_control_acknowledgement_invalid' }
    if ($matches.Count -eq 1) { return }
    Start-Sleep -Milliseconds 200
  }
  throw 'runtime_control_acknowledgement_deadline'
}

function Wait-OwnershipCheckpointMarker([object]$Binding, [string]$Token) {
  $notBefore = $script:LaunchEpochByNonce[$Binding.launchNonce]
  if ($null -eq $notBefore) { throw 'ownership_checkpoint_invalid' }
  $expected = @(
    'account_provision_lock_owned_checkpoint', $script:PackageName, $Binding.processName,
    [string]$Binding.pid, $Binding.starttime, $Binding.launchNonce, $Binding.runtimeIdentity, $Token
  ) -join '|'
  $deadline = [DateTime]::UtcNow.AddSeconds(10)
  while ([DateTime]::UtcNow -lt $deadline) {
    $payloads = @(Get-ProbeMarkerPayloads $Binding)
    foreach ($payload in $payloads) { Assert-MarkerPayloadBinding $payload $Binding | Out-Null }
    if (@($payloads | Where-Object { $_ -ceq $expected }).Count -eq 1) { return }
    Start-Sleep -Milliseconds 200
  }
  throw 'ownership_checkpoint_invalid'
}

function Write-DurablePhaseCheckpoint([string]$Phase, [object]$Event) {
  $root = Join-Path $script:CampaignTemp 'phase-checkpoints'
  if (-not (Test-Path -LiteralPath $root -PathType Container)) { [IO.Directory]::CreateDirectory($root) | Out-Null }
  $path = Join-Path $root ("$Phase-$($Event.sequence).json")
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($Event | ConvertTo-Json -Depth 12 -Compress))
  Write-DurableNewBytes $path $bytes 'phase_checkpoint_persist_failed'
}

function Write-DurablePhaseApkObservation([string]$Phase, [string]$Boundary, [object]$Observation) {
  if ($Boundary -cne 'before' -and $Boundary -cne 'after') { throw 'apk_hash_invalid' }
  $root = Join-Path $script:CampaignTemp 'phase-apk-observations'
  if (-not (Test-Path -LiteralPath $root -PathType Container)) { [IO.Directory]::CreateDirectory($root) | Out-Null }
  $path = Join-Path $root "$Phase-$Boundary.json"
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($Observation | ConvertTo-Json -Depth 8 -Compress))
  Write-DurableNewBytes $path $bytes 'apk_hash_invalid'
}

function New-VerifiedOwnershipEvent(
  [string]$Phase,
  [string]$Kind,
  [string]$Identity,
  [object]$Owner,
  [hashtable]$Extra = @{}
) {
  $ownerStat = Get-ProcStat $Owner.pid
  if ($ownerStat.starttime -cne $Owner.starttime) { throw 'ownership_checkpoint_invalid' }
  $token = New-Hex32
  Send-OwnershipCheckpoint $Owner 'holder' $Identity $token
  Wait-OwnershipCheckpointMarker $Owner $token
  $fields = @{} + $Extra
  $fields.ownershipToken = $token
  if ($fields.ContainsKey('ownerReportsOwnership')) {
    $fields.ownerReportsOwnership = ($token -cmatch '^[0-9a-f]{32}$')
  }
  if ($fields.ContainsKey('live')) { $fields.live = ($ownerStat.starttime -ceq $Owner.starttime) }
  if ($fields.ContainsKey('owns')) { $fields.owns = ($token -cmatch '^[0-9a-f]{32}$') }
  $event = New-PhaseEvent $Kind $Identity $Owner $fields
  Write-DurablePhaseCheckpoint $Phase $event
  return $event
}

function New-PhaseEvent([string]$Kind, [string]$Identity, [object]$Binding, [hashtable]$Extra = @{}) {
  $script:EventSequence += 1
  $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  if ($timestamp -le $script:LastEventTimestamp) { $timestamp = $script:LastEventTimestamp + 1 }
  $script:LastEventTimestamp = $timestamp
  $event = [ordered]@{ kind = $Kind; sequence = $script:EventSequence; timestamp = [double]$timestamp; identity = $Identity; binding = $Binding }
  foreach ($key in $Extra.Keys) { $event[$key] = $Extra[$key] }
  return [pscustomobject]$event
}

function Add-ProbeMarkerEvent([Collections.Generic.List[object]]$Events, [object]$Binding, [string]$Identity, [string]$Marker) {
  Wait-ProbeMarker $Binding ("account_provision_lock_" + $(if ($Marker -ceq 'pass') { 'probe_pass' } else { $Marker }))
  $Events.Add((New-PhaseEvent $Marker $Identity $Binding))
}

function Add-ContendedObservations([Collections.Generic.List[object]]$Events, [object]$Owner, [object]$Waiter, [string]$Phase) {
  for ($index = 0; $index -lt 2; $index += 1) {
    $ownerStat = Get-ProcStat $Owner.pid
    $waiterStat = Get-ProcStat $Waiter.pid
    if ($ownerStat.starttime -cne $Owner.starttime -or $waiterStat.starttime -cne $Waiter.starttime) { throw 'contended_process_drift' }
    Assert-MarkerAbsent $Waiter 'account_provision_lock_acquired'
    $proof = @{
      waiter = $Waiter
      ownerLive = ($ownerStat.starttime -ceq $Owner.starttime)
      ownerReportsOwnership = $false
      waiterLive = ($waiterStat.starttime -ceq $Waiter.starttime)
      waiterAcquired = (@(Get-ProbeMarkers $Waiter) -ccontains 'account_provision_lock_acquired')
    }
    $event = New-VerifiedOwnershipEvent $Phase 'contended_observation' 'x' $Owner $proof
    $Events.Add($event)
    if ($index -eq 0) { Start-Sleep -Milliseconds 250 }
  }
}

function Wait-ExactProcDisappearance([object]$Binding) {
  $deadline = [DateTime]::UtcNow.AddSeconds(10)
  while ([DateTime]::UtcNow -lt $deadline) {
    if (Test-ProcDisappeared $Binding.pid) { return }
    $stat = Get-ProcStat $Binding.pid
    if ($stat.starttime -cne $Binding.starttime) { throw 'pid_reuse_detected' }
    Start-Sleep -Milliseconds 200
  }
  throw 'proc_disappearance_deadline'
}

function Invoke-InlinePhase([string]$Phase) {
  $apkBefore = Assert-InstalledApkHash
  Write-DurablePhaseApkObservation $Phase 'before' $apkBefore
  Invoke-Adb @('shell', 'am', 'force-stop', $script:PackageName) 'phase_reset_failed' | Out-Null
  $script:MarkerOffsets = @{}
  $script:LaunchEpochByNonce = @{}
  $script:EventSequence = 0
  $script:LastEventTimestamp = [long]0
  $events = [Collections.Generic.List[object]]::new()
  $owner = $null; $waiter = $null
  if ($Phase -ceq 'primary-holder-secondary-waiter' -or $Phase -ceq 'holder-death' -or
      $Phase -ceq 'waiter-death' -or $Phase -ceq 'independent-identities') {
    $owner = Start-PrimaryBootstrap (New-Hex32)
    $owner = Send-PrimaryLaunch 'holder' 'x' $owner
    Add-ProbeMarkerEvent $events $owner 'x' 'attempted'
    Add-ProbeMarkerEvent $events $owner 'x' 'acquired'
    $waiterIdentity = if ($Phase -ceq 'independent-identities') { 'y' } else { 'x' }
    $waiter = Start-SecondaryBound 'release' $waiterIdentity (New-Hex32)
    Add-ProbeMarkerEvent $events $waiter $waiterIdentity 'attempted'
  } elseif ($Phase -ceq 'secondary-holder-primary-waiter') {
    $owner = Start-SecondaryBound 'holder' 'x' (New-Hex32)
    Add-ProbeMarkerEvent $events $owner 'x' 'attempted'
    Add-ProbeMarkerEvent $events $owner 'x' 'acquired'
    $waiter = Start-PrimaryBootstrap (New-Hex32)
    $waiter = Send-PrimaryLaunch 'release' 'x' $waiter
    Add-ProbeMarkerEvent $events $waiter 'x' 'attempted'
  } elseif ($Phase -ceq 'stale-file') {
    $owner = Start-PrimaryBootstrap (New-Hex32)
    $owner = Send-PrimaryLaunch 'holder' 'x' $owner
    Add-ProbeMarkerEvent $events $owner 'x' 'attempted'
    Add-ProbeMarkerEvent $events $owner 'x' 'acquired'
    $events.Add((New-VerifiedOwnershipEvent $Phase 'owner_live_owned' 'x' $owner @{ live = $false; owns = $false }))
    $events.Add((New-PhaseEvent 'sigkill_sent' 'x' $owner))
    Invoke-Adb @('shell', 'run-as', $script:PackageName, 'kill', '-9', ([string]$owner.pid)) 'holder_kill_failed' | Out-Null
    Wait-ExactProcDisappearance $owner
    $events.Add((New-PhaseEvent 'proc_disappeared' 'x' $owner))
    $databaseName = 'accounts-v2-g-' + ('a' * 64) + '.db'
    $lockPath = "/data/user/0/app.phraseman/no_backup/account-sqlite-provision-locks/$databaseName.provision.lock"
    $fact = Get-ExactLstatFact $lockPath 'after_verified_death_before_fresh_acquire' ($script:EventSequence + 1)
    $events.Add((New-PhaseEvent 'stale_lstat_before' 'x' $owner @{ pathHash = $fact.pathHash; exists = $fact.exists; fileKind = $fact.kind; symlink = $fact.symlink }))
    $fresh = Start-PrimaryBootstrap (New-Hex32)
    $fresh = Send-PrimaryLaunch 'holder' 'x' $fresh
    Assert-FreshRelaunch $owner $fresh 'fresh_relaunch_invalid'
    $events.Add((New-PhaseEvent 'relaunch' 'x' $fresh))
    Add-ProbeMarkerEvent $events $fresh 'x' 'attempted'
    Add-ProbeMarkerEvent $events $fresh 'x' 'acquired'
    $heldFact = Get-ExactLstatFact $lockPath 'while_acquired' ($script:EventSequence + 1)
    $events.Add((New-PhaseEvent 'stale_lstat_while_owned' 'x' $fresh @{ pathHash = $heldFact.pathHash; exists = $heldFact.exists; fileKind = $heldFact.kind; symlink = $heldFact.symlink }))
    $events.Add((New-VerifiedOwnershipEvent $Phase 'owner_live_owned' 'x' $fresh @{ live = $false; owns = $false }))
    Send-ReleaseControl $fresh 'holder' 'x'; $events.Add((New-PhaseEvent 'control_release' 'x' $fresh))
    Add-ProbeMarkerEvent $events $fresh 'x' 'release_requested'
    Add-ProbeMarkerEvent $events $fresh 'x' 'released'
    Add-ProbeMarkerEvent $events $fresh 'x' 'pass'
  } else { throw 'phase_invalid' }

  if ($Phase -eq 'primary-holder-secondary-waiter' -or $Phase -eq 'secondary-holder-primary-waiter') {
    Add-ContendedObservations $events $owner $waiter $Phase
    Send-ReleaseControl $owner 'holder' 'x'; $events.Add((New-PhaseEvent 'control_release' 'x' $owner))
    foreach ($marker in @('release_requested', 'released', 'pass')) { Add-ProbeMarkerEvent $events $owner 'x' $marker }
    foreach ($marker in @('acquired', 'release_requested', 'released', 'pass')) { Add-ProbeMarkerEvent $events $waiter 'x' $marker }
  } elseif ($Phase -eq 'holder-death') {
    $events.Add((New-VerifiedOwnershipEvent $Phase 'owner_live_owned' 'x' $owner @{ live = $false; owns = $false }))
    $events.Add((New-PhaseEvent 'sigkill_sent' 'x' $owner))
    Invoke-Adb @('shell', 'run-as', $script:PackageName, 'kill', '-9', ([string]$owner.pid)) 'holder_kill_failed' | Out-Null
    Wait-ExactProcDisappearance $owner
    $events.Add((New-PhaseEvent 'proc_disappeared' 'x' $owner))
    foreach ($marker in @('acquired', 'release_requested', 'released', 'pass')) { Add-ProbeMarkerEvent $events $waiter 'x' $marker }
  } elseif ($Phase -eq 'waiter-death') {
    Add-ContendedObservations $events $owner $waiter $Phase
    $events.Add((New-PhaseEvent 'sigkill_sent' 'x' $waiter))
    Invoke-Adb @('shell', 'run-as', $script:PackageName, 'kill', '-9', ([string]$waiter.pid)) 'waiter_kill_failed' | Out-Null
    Wait-ExactProcDisappearance $waiter
    $events.Add((New-PhaseEvent 'proc_disappeared' 'x' $waiter))
    $events.Add((New-VerifiedOwnershipEvent $Phase 'owner_live_owned' 'x' $owner @{ live = $false; owns = $false }))
    $remotePid = @()
    $remotePidObserved = $false
    try {
      $remotePid = @(Invoke-Adb @('shell', 'pidof', '-s', $script:RemoteProcess) 'killed_waiter_control_rejection_invalid')
      $remotePidObserved = $true
    } catch {}
    if ($remotePidObserved -or @($remotePid | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) }).Count -ne 0) {
      throw 'killed_waiter_control_rejection_invalid'
    }
    $waiterKey = "$($waiter.pid):$($waiter.starttime):$($waiter.launchNonce):$($waiter.runtimeIdentity)"
    if (@(Get-ProbeMarkers $waiter).Count -ne [int]$script:MarkerOffsets[$waiterKey]) { throw 'late_killed_waiter_marker' }
    $events.Add((New-PhaseEvent 'killed_waiter_control_rejected' 'x' $waiter))
    Send-ReleaseControl $owner 'holder' 'x'; $events.Add((New-PhaseEvent 'control_release' 'x' $owner))
    foreach ($marker in @('release_requested', 'released', 'pass')) { Add-ProbeMarkerEvent $events $owner 'x' $marker }
    $fresh = Start-SecondaryBound 'release' 'x' (New-Hex32)
    Assert-FreshRelaunch $waiter $fresh 'fresh_relaunch_invalid'
    $events.Add((New-PhaseEvent 'relaunch' 'x' $fresh))
    foreach ($marker in @('attempted', 'acquired', 'release_requested', 'released', 'pass')) { Add-ProbeMarkerEvent $events $fresh 'x' $marker }
  } elseif ($Phase -eq 'independent-identities') {
    foreach ($marker in @('acquired', 'release_requested', 'released', 'pass')) { Add-ProbeMarkerEvent $events $waiter 'y' $marker }
    $events.Add((New-VerifiedOwnershipEvent $Phase 'owner_live_owned' 'x' $owner @{ live = $false; owns = $false }))
    Send-ReleaseControl $owner 'holder' 'x'; $events.Add((New-PhaseEvent 'control_release' 'x' $owner))
    foreach ($marker in @('release_requested', 'released', 'pass')) { Add-ProbeMarkerEvent $events $owner 'x' $marker }
  }

  $transcript = [pscustomobject][ordered]@{ phase = $Phase; events = $events.ToArray() }
  Assert-PhaseTranscript $transcript | Out-Null
  $apkAfter = Assert-InstalledApkHash
  Write-DurablePhaseApkObservation $Phase 'after' $apkAfter
  $script:PhaseEvidence += [pscustomobject][ordered]@{
    phase = $Phase; status = 'pass'; apkSha256 = $script:BuiltApkSha256
    apkBefore = $apkBefore; apkAfter = $apkAfter; transcript = $transcript
  }
}

function Invoke-PrimaryHolderSecondaryWaiterPhase { Invoke-InlinePhase 'primary-holder-secondary-waiter' }
function Invoke-SecondaryHolderPrimaryWaiterPhase { Invoke-InlinePhase 'secondary-holder-primary-waiter' }
function Invoke-HolderDeathPhase { Invoke-InlinePhase 'holder-death' }
function Invoke-WaiterDeathPhase { Invoke-InlinePhase 'waiter-death' }
function Invoke-IndependentIdentitiesPhase { Invoke-InlinePhase 'independent-identities' }
function Invoke-StaleFilePhase { Invoke-InlinePhase 'stale-file' }

function Convert-SanitizedBinding([object]$Binding) {
  return [pscustomobject][ordered]@{
    pid = $Binding.pid
    starttime = $Binding.starttime
    processNameSha256 = Get-BytesSha256 ([Text.UTF8Encoding]::new($false).GetBytes([string]$Binding.processName))
    launchNonceSha256 = Get-BytesSha256 ([Text.UTF8Encoding]::new($false).GetBytes([string]$Binding.launchNonce))
    runtimeIdentitySha256 = Get-BytesSha256 ([Text.UTF8Encoding]::new($false).GetBytes([string]$Binding.runtimeIdentity))
  }
}

function Convert-SanitizedPhases {
  $phases = @()
  foreach ($phase in $script:PhaseEvidence) {
    $events = @()
    foreach ($event in @($phase.transcript.events)) {
      $safe = [ordered]@{
        kind = $event.kind
        sequence = $event.sequence
        timestamp = $event.timestamp
        identity = $event.identity
        binding = Convert-SanitizedBinding $event.binding
      }
      if ($null -ne $event.PSObject.Properties['waiter']) { $safe.waiter = Convert-SanitizedBinding $event.waiter }
      foreach ($booleanName in @('ownerLive', 'ownerReportsOwnership', 'waiterLive', 'waiterAcquired', 'live', 'owns', 'exists', 'symlink')) {
        if ($null -ne $event.PSObject.Properties[$booleanName]) { $safe[$booleanName] = $event.$booleanName }
      }
      foreach ($textName in @('pathHash', 'fileKind')) {
        if ($null -ne $event.PSObject.Properties[$textName]) { $safe[$textName] = $event.$textName }
      }
      if ($null -ne $event.PSObject.Properties['ownershipToken']) {
        $safe.ownershipTokenSha256 = Get-BytesSha256 ([Text.UTF8Encoding]::new($false).GetBytes([string]$event.ownershipToken))
      }
      $events += [pscustomobject]$safe
    }
    $phases += [pscustomobject][ordered]@{
      phase = $phase.phase
      status = $phase.status
      apkSha256 = $phase.apkSha256
      apkBefore = $phase.apkBefore
      apkAfter = $phase.apkAfter
      events = $events
    }
  }
  return $phases
}

function Get-NativeInputHashes {
  $result = [ordered]@{}
  foreach ($relative in @(
    'patches/expo-sqlite+16.0.10.patch', 'package.json', 'package-lock.json', 'app.json', 'app.config.js'
  )) { $result[$relative] = Get-Sha256 (Join-Path $script:Repo $relative) }
  foreach ($fact in @($script:ActivatedNativeProvenance.inputs)) { $result[$fact.name] = $fact.sha256 }
  if ($null -ne $script:BuiltApkSha256) { $result['built-apk'] = $script:BuiltApkSha256 }
  return [pscustomobject]$result
}

function Convert-GeneratedTargetFacts([object[]]$Facts) {
  $names = @('debug-manifest', 'debug-activity')
  $safe = @()
  for ($index = 0; $index -lt $Facts.Count; $index += 1) {
    $safe += [pscustomobject][ordered]@{
      name = $names[$index]; kind = $Facts[$index].kind; length = $Facts[$index].length; sha256 = $Facts[$index].sha256
    }
  }
  return $safe
}

function Publish-SanitizedEvidence {
  Assert-PathOutsideRepository $EvidenceDirectory 'evidence_directory_inside_repository' | Out-Null
  if (-not (Test-Path -LiteralPath $EvidenceDirectory -PathType Container)) {
    [IO.Directory]::CreateDirectory($EvidenceDirectory) | Out-Null
  }
  $target = Join-Path $EvidenceDirectory 'account-provision-lock-runtime.json'
  $temporary = "$target.new"
  if ((Test-Path -LiteralPath $target) -or (Test-Path -LiteralPath $temporary)) { throw 'evidence_publication_failed' }
  $evidence = [pscustomobject][ordered]@{
    schemaVersion = 2
    status = 'provisional'
    packetSha256 = $PacketSha256
    apkSha256 = $script:BuiltApkSha256
    nativeInputHashes = $script:NativeInputHashes
    activatedNativeProvenance = [pscustomobject][ordered]@{
      expected = $script:ActivatedNativeProvenance
      afterBuild = $script:ActivatedNativeAfterBuild
    }
    apkDexSurface = $script:ApkDexSurfaceFact
    mergedDebugManifest = $script:MergedDebugManifestFact
    materializedInputHashes = $script:MaterializedInputHashes
    reviewedSourceReceipt = $script:ReviewedSourceReceipt
    gateReceipts = $script:GateReceipts
    repositoryBefore = $script:RepositoryBefore
    repositoryAfter = $script:RepositoryAfter
    repositoryAfterPublication = $null
    sourceBefore = $script:SourceBefore
    sourceAfter = $script:SourceAfter
    generatedTargetsBefore = Convert-GeneratedTargetFacts @($script:GeneratedTargetFactsBefore)
    generatedTargetsAfter = Convert-GeneratedTargetFacts @($script:GeneratedTargetFactsAfter)
    cleanupApkObservation = $script:CleanupApkObservation
    phases = Convert-SanitizedPhases
    restoration = $script:CleanupReceipt
    cleanupComplete = $true
  }
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($evidence | ConvertTo-Json -Depth 10 -Compress))
  Write-DurableNewBytes $temporary $bytes 'evidence_publication_failed'
  [IO.File]::Move($temporary, $target)
  $script:PublishedEvidencePath = $target
}

function Assert-PostPublicationRepositorySnapshot {
  if ($null -eq $script:PublishedEvidencePath -or -not (Test-Path -LiteralPath $script:PublishedEvidencePath -PathType Leaf)) {
    throw 'post_publication_repository_snapshot_failed'
  }
  $after = Get-RepositoryFacts
  Assert-CampaignOwnedPostPublicationIntegrity $script:RepositoryAfter $after
  $source = Get-SevenPathFacts
  if (($source | ConvertTo-Json -Depth 10 -Compress) -cne ($script:SourceAfter | ConvertTo-Json -Depth 10 -Compress)) {
    throw 'post_publication_repository_snapshot_failed'
  }
  $script:RepositoryAfterPublication = $after
}

function Finalize-SanitizedEvidence {
  $target = $script:PublishedEvidencePath
  $bytes = Get-FileBytes $target 'evidence_publication_failed'
  try {
    $raw = [Text.UTF8Encoding]::new($false, $true).GetString($bytes)
    $evidence = $raw | ConvertFrom-Json
  } catch { throw 'evidence_publication_failed' }
  if ($evidence.status -cne 'provisional' -or $null -eq $script:RepositoryAfterPublication) {
    throw 'evidence_publication_failed'
  }
  $evidence.repositoryAfterPublication = $script:RepositoryAfterPublication
  $evidence.status = 'pass'
  $temporary = "$target.final"
  if (Test-Path -LiteralPath $temporary) { throw 'evidence_publication_failed' }
  $finalBytes = [Text.UTF8Encoding]::new($false).GetBytes(($evidence | ConvertTo-Json -Depth 12 -Compress))
  Write-DurableNewBytes $temporary $finalBytes 'evidence_publication_failed'
  try {
    Move-AtomicReplace $temporary $target 'evidence_publication_failed'
  } catch {
    if (Test-Path -LiteralPath $temporary -PathType Leaf) { [IO.File]::Delete($temporary) }
    throw 'evidence_publication_failed'
  }
}

function Invoke-OuterCleanup {
  $attempted = [Collections.Generic.List[string]]::new()
  $failures = [Collections.Generic.List[string]]::new()
  $attempted.Add('app-stop')
  try { if (-not [string]::IsNullOrWhiteSpace($Serial)) { Invoke-Adb @('shell', 'am', 'force-stop', $script:PackageName) 'cleanup_force_stop_failed' | Out-Null } } catch { $failures.Add('app-stop') }
  $attempted.Add('reverse-remove')
  try {
    if ($script:OwnedReverse) { Invoke-Adb @('reverse', '--remove', 'tcp:8081') 'cleanup_reverse_failed' | Out-Null; $script:OwnedReverse = $false }
  } catch { $failures.Add('reverse-remove') }
  $attempted.Add('metro-stop')
  try { Stop-OwnedMetro } catch { $failures.Add('metro-stop') }

  if ($script:PreserveAll) {
    foreach ($name in @('package-restore', 'android-restore')) { $attempted.Add($name); $failures.Add($name) }
  } else {
    $attempted.Add('package-restore')
    try { Restore-PackageEntrypoint } catch { $failures.Add('package-restore') }
    $attempted.Add('android-restore')
    try { Restore-AndroidMaterialization } catch { $failures.Add('android-restore') }
  }

  $attempted.Add('apk-recheck')
  if (Test-ApkCleanupRecheckRequired $script:ApkInstallState) {
    try { $script:CleanupApkObservation = Assert-InstalledApkHash } catch { $failures.Add('apk-recheck') }
  } else {
    $script:CleanupApkObservation = [pscustomobject][ordered]@{
      status = 'skipped'
      reason = 'install_not_attempted'
    }
  }
  $attempted.Add('temp-delete')
  if ($script:PreserveAll) {
    $failures.Add('temp-delete')
  } else {
    try {
      if ($null -ne $script:CampaignTemp -and (Test-Path -LiteralPath $script:CampaignTemp -PathType Container)) {
        [IO.Directory]::Delete($script:CampaignTemp, $true)
      }
    } catch { $failures.Add('temp-delete') }
  }
  $attempted.Add('repository-check')
  try {
    $script:RepositoryAfter = Get-RepositoryFacts
    Assert-CampaignOwnedCleanupIntegrity $script:RepositoryBefore $script:RepositoryAfter
  } catch { $failures.Add('repository-check') }
  $attempted.Add('source-check')
  try {
    $script:SourceAfter = Get-SevenPathFacts
    if (($script:SourceAfter | ConvertTo-Json -Depth 10 -Compress) -cne ($script:SourceBefore | ConvertTo-Json -Depth 10 -Compress)) { throw 'source_drift' }
  } catch { $failures.Add('source-check') }
  $attempted.Add('evidence-finalize')
  $script:CleanupReceipt = [pscustomobject][ordered]@{
    attempted = $attempted.ToArray(); failures = $failures.ToArray(); cleanupPassed = $failures.Count -eq 0
    packageRestored = $failures -cnotcontains 'package-restore'; androidRestored = $failures -cnotcontains 'android-restore'
  }
  return $failures.ToArray()
}

function Assert-DevicePreflight {
  if ($PacketSha256 -cne $script:PacketExpectedSha256 -or (Get-Sha256 $PacketPath) -cne $PacketSha256) { throw 'packet_hash_invalid' }
  Assert-PathOutsideRepository $EvidenceDirectory 'evidence_directory_inside_repository' | Out-Null
  $devices = @(& adb devices | Select-String "^$([regex]::Escape($Serial))\s+device$")
  if ($devices.Count -ne 1) { throw 'emulator_identity_invalid' }
  $abi = @(Invoke-Adb @('shell', 'getprop', 'ro.product.cpu.abi') 'emulator_identity_invalid')
  if ($abi.Count -ne 1 -or $abi[0].Trim() -cne 'x86_64') { throw 'emulator_identity_invalid' }
}

function Invoke-DeviceCampaign {
  Invoke-StartupRecovery
  Open-SevenPathHolds
  Open-ActivatedNativeInputHolds
  $script:SourceBefore = Get-SevenPathFacts
  Assert-CampaignGitPathsTracked
  Assert-ExternalReviewedReceipt
  $script:RepositoryBefore = Get-RepositoryFacts
  Assert-DevicePreflight
  Invoke-BoundedHostGates
  if ($timeoutIsCancellation) { throw 'timeout_cancellation_forbidden' }
  if ($script:PhaseNames.Count -ne 6) { throw 'phase_topology_invalid' }
  $script:CampaignTemp = Join-Path ([IO.Path]::GetTempPath()) ("account-provision-lock-" + [Guid]::NewGuid().ToString('N'))
  [IO.Directory]::CreateDirectory($script:CampaignTemp) | Out-Null
  $script:NativeInputHashes = Get-NativeInputHashes
  Start-DeviceMaterialization
  $script:MaterializedInputHashes = Get-MaterializedInputHashes
  Invoke-AndroidDebugBuild
  Install-VerifiedApk
  $script:NativeInputHashes | Add-Member -NotePropertyName 'built-apk' -NotePropertyValue $script:BuiltApkSha256
  Start-OwnedMetro
  Invoke-PrimaryHolderSecondaryWaiterPhase
  Invoke-SecondaryHolderPrimaryWaiterPhase
  Invoke-HolderDeathPhase
  Invoke-WaiterDeathPhase
  Invoke-IndependentIdentitiesPhase
  Invoke-StaleFilePhase
}

if ($LibraryMode) {
  try {
    $payload = Convert-LibraryPayload $ValidationPayloadBase64
    $result = Invoke-LibraryValidation $ValidationKind $payload
    [Console]::Out.WriteLine(($result | ConvertTo-Json -Depth 20 -Compress))
    exit 0
  } catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
  }
}

$cleanupComplete = $false
$campaignComplete = $false
$cleanupFailures = @()
$deviceFailed = $false
$handlesClosed = $false
$deviceFailureCode = 'account_provision_lock_runtime_failed'
$deviceFailureStage = 'android-account-provision-lock-campaign'
$failureReceiptSha256 = if ($ReviewedReceiptSha256 -cmatch '^[0-9a-f]{64}$') {
  $ReviewedReceiptSha256
} else {
  '0' * 64
}
try {
  try {
    Invoke-DeviceCampaign
    $campaignComplete = $true
  } catch {
    $deviceFailed = $true
    $deviceFailureCode = Get-AllowlistedHostFailureCode $_.Exception.Message
    $deviceFailureStage = 'android-account-provision-lock-campaign'
  }
  try {
    $cleanupFailures = @(Invoke-OuterCleanup)
    $cleanupComplete = $cleanupFailures.Count -eq 0
  } catch {
    $cleanupComplete = $false
    if (-not $deviceFailed) {
      $deviceFailed = $true
      $deviceFailureCode = Get-AllowlistedHostFailureCode $_.Exception.Message
      $deviceFailureStage = 'android-account-provision-lock-cleanup'
    }
  }
  if (-not $cleanupComplete -and -not $deviceFailed) {
    $deviceFailed = $true
    $deviceFailureCode = 'cleanup_incomplete'
    $deviceFailureStage = 'android-account-provision-lock-cleanup'
  }
  if (-not $campaignComplete -and -not $deviceFailed) {
    $deviceFailed = $true
    $deviceFailureCode = 'campaign_incomplete'
    $deviceFailureStage = 'android-account-provision-lock-campaign'
  }
  if (-not $deviceFailed) {
    $activeStage = 'android-account-provision-lock-publication'
    try {
      Publish-SanitizedEvidence
      Assert-PostPublicationRepositorySnapshot
      $activeStage = 'android-account-provision-lock-source-custody'
      Close-SevenPathHolds
      $handlesClosed = $true
      $activeStage = 'android-account-provision-lock-publication'
      Finalize-SanitizedEvidence
    } catch {
      $deviceFailed = $true
      $deviceFailureCode = Get-AllowlistedHostFailureCode $_.Exception.Message
      $deviceFailureStage = $activeStage
    }
  }
} finally {
  if (-not $handlesClosed) {
    try {
      Close-SevenPathHolds
      $handlesClosed = $true
    } catch {
      $cleanupComplete = $false
      if (-not $deviceFailed) {
        $deviceFailed = $true
        $deviceFailureCode = 'source_custody_close_failed'
        $deviceFailureStage = 'android-account-provision-lock-source-custody'
      }
    }
  }
}
if ($deviceFailed) {
  Write-CanonicalFailureEnvelope `
    $deviceFailureCode `
    $script:ObservedJsFailureCode `
    $script:ObservedDatabaseRootDiagnostic `
    $deviceFailureStage `
    $cleanupComplete `
    $script:CleanupReceipt `
    $failureReceiptSha256
  exit 1
}
[Console]::Out.WriteLine('account_provision_lock_android_runtime_probe_pass')
