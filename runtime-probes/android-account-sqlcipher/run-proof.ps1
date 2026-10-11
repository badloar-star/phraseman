[CmdletBinding(DefaultParameterSetName = 'Device')]
param(
  [Parameter(ParameterSetName = 'Build', Mandatory = $true)]
  [switch]$BuildGateBundle,
  [Parameter(ParameterSetName = 'Library', Mandatory = $true)]
  [switch]$LibraryMode,
  [Parameter(ParameterSetName = 'Library', Mandatory = $true)]
  [ValidateSet('GateRecords','GateArchiveNames','GateStaging','PhaseFacts','ReducePhaseLog','Snapshot','Aggregate','Sanitize','ApkAbi','MutexModel','CleanupModel','Recovery','RecoveryRace','RecoveryMatrix','PackageMutation','PackageTransform','PackageTransformValidation','DeviceLifecycle','EvidenceOwnership','MetroOwnership','LiveGatePreflight','ApkContinuity','SourceBinding','Baseline','Packet','RedReceipt','RedEvidenceBinding','FocusedEnvironment')]
  [string]$ValidationKind,
  [Parameter(ParameterSetName = 'Library', Mandatory = $true)]
  [string]$ValidationPayloadBase64,
  [Parameter(ParameterSetName = 'Build', Mandatory = $true)]
  [string]$RedReceiptPath,
  [Parameter(ParameterSetName = 'Build', Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{64}$')]
  [string]$RedReceiptSha256,
  [Parameter(ParameterSetName = 'Build', Mandatory = $true)]
  [Parameter(ParameterSetName = 'Device', Mandatory = $true)]
  [string]$GateBundlePath,
  [Parameter(ParameterSetName = 'Build', Mandatory = $true)]
  [Parameter(ParameterSetName = 'Device', Mandatory = $true)]
  [string]$PreEditBaselinePath,
  [Parameter(ParameterSetName = 'Build', Mandatory = $true)]
  [Parameter(ParameterSetName = 'Device', Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{64}$')]
  [string]$PreEditBaselineSha256,
  [Parameter(ParameterSetName = 'Device', Mandatory = $true)]
  [string]$Serial,
  [Parameter(ParameterSetName = 'Device', Mandatory = $true)]
  [string]$EvidenceDirectory,
  [Parameter(ParameterSetName = 'Device', Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{64}$')]
  [string]$GateBundleSha256,
  [Parameter(ParameterSetName = 'Build', Mandatory = $true)]
  [Parameter(ParameterSetName = 'Device', Mandatory = $true)]
  [string]$PacketPath,
  [Parameter(ParameterSetName = 'Build', Mandatory = $true)]
  [Parameter(ParameterSetName = 'Device', Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{64}$')]
  [string]$PacketSha256
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$mutex = $null
$ownsMutex = $false
try {
  if (-not $LibraryMode) {
    $mutex = [Threading.Mutex]::new($false, 'Global\PhrasemanAccountSqlcipherProofV1')
    try {
      $ownsMutex = $mutex.WaitOne(0)
    } catch [Threading.AbandonedMutexException] {
      $ownsMutex = $true
    }
    if (-not $ownsMutex) {
      [Console]::Out.WriteLine('account_sqlcipher_probe_mutex_busy')
      exit 73
    }
  }

  # ReleaseMutex occurs only after cleanup/finalization; this comment also anchors the source-order contract.
  $script:Repo = 'C:\appsprojects\phraseman'
  $script:FivePaths = @(
    'runtime-probes/android-account-sqlcipher/probe.ts',
    'runtime-probes/android-account-sqlcipher/index.js',
    'tests/account_sqlcipher_android_runtime_probe.test.ts',
    'tests/account_sqlcipher_android_runtime_entrypoint.test.ts',
    'runtime-probes/android-account-sqlcipher/run-proof.ps1'
  )
  $script:NativePaths = [ordered]@{
    appConfigJs = 'app.config.js'
    gradleProperties = 'android/gradle.properties'
    packageJson = 'package.json'
    packageLockJson = 'package-lock.json'
    expoSqlitePatch = 'patches/expo-sqlite+16.0.10.patch'
    localApk = 'android/app/build/outputs/apk/debug/app-debug.apk'
  }
  $script:DatabaseRelativePath = 'files/SQLite/accounts-v2/accounts-v2-g-7b32e4de72ea35b9caf5468847f91e542f87c50c5062e82c794f7e9c8c92392c.db'
  $script:RecoveryPath = 'C:\Users\badlo\Documents\Codex\2026-09-22\new-chat\outputs\ACCOUNT_ANDROID_SQLCIPHER_PACKAGE_RECOVERY.json'
  $script:BackupPath = 'C:\Users\badlo\Documents\Codex\2026-09-22\new-chat\outputs\ACCOUNT_ANDROID_SQLCIPHER_PACKAGE_JSON_ORIGINAL.bin'
  $script:AuthorizedEvidenceRoot = 'C:\Users\badlo\Documents\Codex\2026-09-22\new-chat\account-sqlcipher-evidence'
  $script:Utf8NoBom = [Text.UTF8Encoding]::new($false)
  $script:AuthenticRedSnapshotArtifact = 'ACCOUNT_ANDROID_SQLCIPHER_P1_VULNERABLE_RUNNER.ps1'
  $script:AuthenticRedRawLogArtifact = 'ACCOUNT_ANDROID_SQLCIPHER_P1_AUTHENTIC_RED.log'
  $script:AuthenticRedInvocation = 'node node_modules/jest/bin/jest.js --config=$ACCOUNT_SQLCIPHER_JEST_CONFIG --runTestsByPath tests/account_sqlcipher_android_runtime_probe.test.ts tests/account_sqlcipher_android_runtime_entrypoint.test.ts --no-cache --runInBand --watchman=false'
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem

  function Get-Sha256([string]$Path) {
    $stream=[IO.File]::Open($Path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
    $hasher=[Security.Cryptography.SHA256]::Create()
    try{return (($hasher.ComputeHash($stream)|ForEach-Object{$_.ToString('x2')})-join '')}finally{$hasher.Dispose();$stream.Dispose()}
  }

  function Get-StreamSha256([IO.Stream]$Stream) {
    $originalPosition=$Stream.Position
    $hasher=[Security.Cryptography.SHA256]::Create()
    try{$Stream.Position=0;return(($hasher.ComputeHash($Stream)|ForEach-Object{$_.ToString('x2')})-join'')}finally{$Stream.Position=$originalPosition;$hasher.Dispose()}
  }

  function Get-StreamBytes([IO.Stream]$Stream,[long]$MaximumLength,[string]$Code) {
    if(-not$Stream.CanSeek-or$Stream.Length-lt0-or$Stream.Length-gt$MaximumLength-or$Stream.Length-gt[int]::MaxValue){throw $Code}
    $originalPosition=$Stream.Position;$bytes=[byte[]]::new([int]$Stream.Length);$offset=0
    try{
      $Stream.Position=0
      while($offset-lt$bytes.Length){$read=$Stream.Read($bytes,$offset,$bytes.Length-$offset);if($read-le0){throw $Code};$offset+=$read}
      return $bytes
    }finally{$Stream.Position=$originalPosition}
  }

  function Get-OrdinalSortedStrings([string[]]$Values) {
    $copy=[string[]]@($Values)
    [Array]::Sort($copy,[StringComparer]::Ordinal)
    return $copy
  }

  function Assert-ExactKeys([object]$Value, [string[]]$Keys, [string]$Code) {
    if ($null -eq $Value -or $Value.GetType().Name -ne 'PSCustomObject') { throw $Code }
    $actual = @($Value.PSObject.Properties.Name)
    if ($actual.Count -ne $Keys.Count) { throw $Code }
    foreach ($key in $Keys) { if ($actual -cnotcontains $key) { throw $Code } }
  }

  function Write-DurableBytes([string]$Path, [byte[]]$Bytes) {
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try {
      $stream.Write($Bytes, 0, $Bytes.Length)
      $stream.Flush($true)
    } finally {
      $stream.Dispose()
    }
  }

  function Initialize-AtomicFileType {
    if($null-eq('AccountSqlcipherAtomicFile' -as [type])){Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AccountSqlcipherAtomicFile {
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool MoveFileEx(string existing, string destination, int flags);
  [DllImport("kernel32.dll", EntryPoint="ReplaceFileW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool ReplaceFile(string replaced, string replacement, string backup, int flags, IntPtr exclude, IntPtr reserved);
}
'@}
  }

  function Move-ReplaceFile([string]$Source,[string]$Destination) {
    if(Test-Path -LiteralPath $Destination -PathType Leaf){
      Initialize-AtomicFileType
      if(-not[AccountSqlcipherAtomicFile]::MoveFileEx($Source,$Destination,9)){throw 'atomic_file_replace_failed'}
    }else{[IO.File]::Move($Source,$Destination)}
  }

  function Invoke-AtomicReplaceWithDisplaced([string]$Source,[string]$Destination,[string]$Displaced) {
    if(-not(Test-Path -LiteralPath $Source -PathType Leaf)-or-not(Test-Path -LiteralPath $Destination -PathType Leaf)-or(Test-Path -LiteralPath $Displaced)){throw 'package_atomic_replace_precondition_failed'}
    Initialize-AtomicFileType
    if(-not[AccountSqlcipherAtomicFile]::ReplaceFile($Destination,$Source,$Displaced,1,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'package_atomic_replace_failed'}
    if(-not(Test-Path -LiteralPath $Destination -PathType Leaf)-or-not(Test-Path -LiteralPath $Displaced -PathType Leaf)-or(Test-Path -LiteralPath $Source)){throw 'package_atomic_replace_failed'}
  }

  function Invoke-PackageCasReplace([string]$Source,[string]$Destination,[string]$Displaced,[string]$ExpectedCurrentSha256,[string]$ExpectedNewSha256,[string]$ConcurrentCode,[scriptblock]$BeforeAtomicReplace=$null) {
    if($null-ne$BeforeAtomicReplace){&$BeforeAtomicReplace}
    Invoke-AtomicReplaceWithDisplaced $Source $Destination $Displaced
    $displacedSha=Get-Sha256 $Displaced
    if($displacedSha-cne$ExpectedCurrentSha256){
      Invoke-AtomicReplaceWithDisplaced $Displaced $Destination $Source
      if((Get-Sha256 $Destination)-cne$displacedSha){throw 'package_concurrent_restore_failed'}
      throw $ConcurrentCode
    }
    if((Get-Sha256 $Destination)-cne$ExpectedNewSha256){throw $ConcurrentCode}
    [IO.File]::Delete($Displaced)
    if(Test-Path -LiteralPath $Displaced){throw 'package_displaced_cleanup_failed'}
  }

  function Write-DurableJson([string]$Path, [object]$Value, [bool]$Replace) {
    $bytes = $script:Utf8NoBom.GetBytes(($Value | ConvertTo-Json -Depth 20 -Compress))
    if ($Replace) {
      $temporary = "$Path.$([Guid]::NewGuid().ToString('N')).tmp"
      Write-DurableBytes $temporary $bytes
      Move-ReplaceFile $temporary $Path
    } else {
      Write-DurableBytes $Path $bytes
    }
  }

  function Invoke-NativeChecked([string]$Label, [string]$Command, [string[]]$Arguments) {
    $lines = @(& $Command @Arguments 2>&1 | ForEach-Object { [string]$_ })
    $code = $LASTEXITCODE
    if ($code -ne 0) { throw "native_command_failed_$Label" }
    return $lines
  }

  function Assert-ExternalHash([string]$Path, [string]$Expected, [string]$Code) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw $Code }
    if ((Get-Sha256 $Path) -cne $Expected) { throw $Code }
  }

  function Read-JsonExact([string]$Path, [string[]]$Keys, [string]$Code) {
    try {
      $value = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    } catch {
      throw $Code
    }
    Assert-ExactKeys $value $Keys $Code
    return $value
  }

  function Get-NativeInputHashes {
    $result = [ordered]@{}
    foreach ($entry in $script:NativePaths.GetEnumerator()) {
      $full = Join-Path $script:Repo $entry.Value
      if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw "native_input_missing_$($entry.Key)" }
      $result[$entry.Key] = Get-Sha256 $full
    }
    $appConfig = Get-Content -LiteralPath (Join-Path $script:Repo 'app.config.js') -Raw
    $gradle = Get-Content -LiteralPath (Join-Path $script:Repo 'android/gradle.properties') -Raw
    if ($appConfig -notmatch 'useSQLCipher:\s*true' -or $appConfig -notmatch 'enableFTS:\s*false') {
      throw 'sqlcipher_app_config_invalid'
    }
    if ($gradle -notmatch '(?m)^expo\.sqlite\.useSQLCipher=true\s*$' -or $gradle -notmatch '(?m)^expo\.sqlite\.enableFTS=false\s*$') {
      throw 'sqlcipher_gradle_properties_invalid'
    }
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $apkPath = Join-Path $script:Repo $script:NativePaths.localApk
    $archive = [IO.Compression.ZipFile]::OpenRead($apkPath)
    try {
      $abiFacts = Test-ApkAbiEntries ([pscustomobject][ordered]@{entries=@($archive.Entries | ForEach-Object FullName)})
      if ($abiFacts.x86_64LibraryCount -lt 1) { throw 'local_apk_x86_64_missing' }
    } finally {
      $archive.Dispose()
    }
    return [pscustomobject]$result
  }

  function Assert-RedResultCounts([object]$Counts,[object]$Observed=$null) {
    Assert-ExactKeys $Counts @('failedSuites','passedSuites','totalSuites','failedTests','passedTests','totalTests') 'red_result_counts_invalid'
    foreach($key in @('failedSuites','passedSuites','totalSuites','failedTests','passedTests','totalTests')){
      $value=Get-PropertyValue $Counts $key 'red_result_counts_invalid'
      if(($value-isnot[int]-and$value-isnot[long])-or$value-lt0){throw 'red_result_counts_invalid'}
    }
    if($Counts.failedSuites-lt1-or$Counts.failedTests-lt9-or$Counts.totalSuites-lt1-or$Counts.totalTests-lt1-or
       ($Counts.failedSuites+$Counts.passedSuites)-ne$Counts.totalSuites-or
       ($Counts.failedTests+$Counts.passedTests)-ne$Counts.totalTests){throw 'red_result_counts_invalid'}
    if($null-ne$Observed){
      foreach($key in @('failedSuites','passedSuites','totalSuites','failedTests','passedTests','totalTests')){
        if((Get-PropertyValue $Counts $key 'red_result_counts_invalid')-ne(Get-PropertyValue $Observed $key 'red_result_counts_invalid')){throw 'red_result_counts_invalid'}
      }
    }
  }

  function Open-ReadEvidenceHandle([string]$Path,[long]$MaximumLength,[string]$Code) {
    $full=[IO.Path]::GetFullPath($Path);$parent=[IO.Path]::GetDirectoryName($full)
    if(-not(Test-Path -LiteralPath $parent -PathType Container)-or-not(Test-Path -LiteralPath $full -PathType Leaf)){throw $Code}
    Assert-PathHasNoReparsePoint $parent 'red_evidence_reparse_invalid';Assert-PathHasNoReparsePoint $full 'red_evidence_reparse_invalid'
    $stream=$null
    try{
      $stream=[IO.File]::Open($full,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
      Assert-PathHasNoReparsePoint $parent 'red_evidence_reparse_invalid';Assert-PathHasNoReparsePoint $full 'red_evidence_reparse_invalid'
      if($stream.Length-gt$MaximumLength){throw $Code}
      return $stream
    }catch{if($null-ne$stream){$stream.Dispose()};throw}
  }

  function Close-RedEvidenceBinding([object]$Binding) {
    if($null-eq$Binding){return}
    foreach($handle in $Binding.handles){$handle.Dispose()}
  }

  function Open-RedEvidenceBinding([string]$Path,[string]$ExpectedHash) {
    $handles=[Collections.Generic.List[IO.FileStream]]::new();$binding=$null
    try{
      $receiptPath=[IO.Path]::GetFullPath($Path);$receipt=Open-ReadEvidenceHandle $receiptPath 16384 'red_receipt_hash_invalid';$handles.Add($receipt)
      if(-not(Get-Item -LiteralPath $receiptPath).IsReadOnly){throw 'red_receipt_not_read_only'}
      $receiptBytes=Get-StreamBytes $receipt 16384 'red_receipt_hash_invalid';if((Get-BytesSha256 $receiptBytes)-cne$ExpectedHash){throw 'red_receipt_hash_invalid'}
      try{$receiptText=[Text.UTF8Encoding]::new($false,$true).GetString($receiptBytes);$red=$receiptText|ConvertFrom-Json}catch{throw 'red_receipt_schema_invalid'}
      $keys=@('schemaVersion','gate','status','exitCode','classification','createdUtc','testFileHashes','vulnerableRunnerArtifact','vulnerableRunnerSha256','vulnerableRunnerPathSha256','invocationSha256','rawLogArtifact','rawLogSha256','resultCounts')
      Assert-ExactKeys $red $keys 'red_receipt_schema_invalid'
      if($red.schemaVersion-ne2-or$red.gate-cne'red'-or$red.status-cne'expected_failure'-or$red.exitCode-ne1-or$red.classification-cne'p1_hardening_regressions_absent'-or$red.vulnerableRunnerArtifact-cne$script:AuthenticRedSnapshotArtifact-or$red.rawLogArtifact-cne$script:AuthenticRedRawLogArtifact){throw 'red_receipt_value_invalid'}
      Assert-UtcTimestamp $red.createdUtc 'red_receipt_value_invalid'|Out-Null;foreach($sha in @($red.vulnerableRunnerSha256,$red.vulnerableRunnerPathSha256,$red.invocationSha256,$red.rawLogSha256)){Assert-LowerSha $sha 'red_receipt_value_invalid'}
      Assert-ExactKeys $red.testFileHashes @('probe','entrypoint') 'red_receipt_test_hash_schema_invalid'
      $parent=[IO.Path]::GetDirectoryName($receiptPath);$snapshotPath=[IO.Path]::GetFullPath((Join-Path $parent $script:AuthenticRedSnapshotArtifact));$rawPath=[IO.Path]::GetFullPath((Join-Path $parent $script:AuthenticRedRawLogArtifact))
      $probePath=[IO.Path]::GetFullPath((Join-Path $script:Repo 'tests/account_sqlcipher_android_runtime_probe.test.ts'));$entryPath=[IO.Path]::GetFullPath((Join-Path $script:Repo 'tests/account_sqlcipher_android_runtime_entrypoint.test.ts'))
      $snapshot=Open-ReadEvidenceHandle $snapshotPath 262144 'red_vulnerable_runner_invalid';$handles.Add($snapshot);$raw=Open-ReadEvidenceHandle $rawPath 262144 'red_raw_log_invalid';$handles.Add($raw);$probe=Open-ReadEvidenceHandle $probePath 262144 'red_receipt_test_hash_mismatch';$handles.Add($probe);$entry=Open-ReadEvidenceHandle $entryPath 262144 'red_receipt_test_hash_mismatch';$handles.Add($entry)
      if(-not(Get-Item -LiteralPath $snapshotPath).IsReadOnly){throw 'red_vulnerable_runner_invalid'};if(-not(Get-Item -LiteralPath $rawPath).IsReadOnly){throw 'red_raw_log_invalid'}
      if((Get-StreamSha256 $snapshot)-cne$red.vulnerableRunnerSha256){throw 'red_vulnerable_runner_hash_invalid'};if((Get-StringSha256 $snapshotPath)-cne$red.vulnerableRunnerPathSha256){throw 'red_vulnerable_runner_path_invalid'};if((Get-StringSha256 $script:AuthenticRedInvocation)-cne$red.invocationSha256){throw 'red_invocation_hash_invalid'}
      $rawBytes=Get-StreamBytes $raw 262144 'red_raw_log_invalid';if((Get-BytesSha256 $rawBytes)-cne$red.rawLogSha256){throw 'red_raw_log_hash_invalid'}
      if((Get-StreamSha256 $probe)-cne$red.testFileHashes.probe-or(Get-StreamSha256 $entry)-cne$red.testFileHashes.entrypoint){throw 'red_receipt_test_hash_mismatch'}
      try{$rawText=[Text.UTF8Encoding]::new($false,$true).GetString($rawBytes)-replace "$([char]27)\[[0-9;]*[A-Za-z]",''}catch{throw 'red_raw_log_invalid'}
      $suiteMatch=[regex]::Match($rawText,'Test Suites:\s+(\d+) failed,\s+(\d+) passed,\s+(\d+) total');$testMatch=[regex]::Match($rawText,'Tests:\s+(\d+) failed,\s+(\d+) passed,\s+(\d+) total');if(-not$suiteMatch.Success-or-not$testMatch.Success){throw 'red_raw_log_counts_invalid'}
      $observed=[pscustomobject][ordered]@{failedSuites=[int]$suiteMatch.Groups[1].Value;passedSuites=[int]$suiteMatch.Groups[2].Value;totalSuites=[int]$suiteMatch.Groups[3].Value;failedTests=[int]$testMatch.Groups[1].Value;passedTests=[int]$testMatch.Groups[2].Value;totalTests=[int]$testMatch.Groups[3].Value};Assert-RedResultCounts $red.resultCounts $observed
      $binding=[pscustomobject][ordered]@{handles=$handles;receipt=$red;receiptBytes=$receiptBytes;receiptBytesSha256=(Get-BytesSha256 $receiptBytes);probePath=$probePath;entrypointPath=$entryPath}
      return $binding
    }catch{if($null-eq$binding){foreach($handle in $handles){$handle.Dispose()}};throw}
  }

  function Assert-RedReceipt([string]$Path,[string]$ExpectedHash) {
    $binding=$null
    try{$binding=Open-RedEvidenceBinding $Path $ExpectedHash;return [pscustomobject][ordered]@{status='pass';validation='authentic_red_receipt_valid';receipt=$binding.receipt}}finally{Close-RedEvidenceBinding $binding}
  }

  function Test-WriteOpenBlocked([string]$Path) {
    $stream=$null
    try{$stream=[IO.File]::Open($Path,[IO.FileMode]::Open,[IO.FileAccess]::Write,[IO.FileShare]::Read);return $false}catch [IO.IOException]{return $true}catch [UnauthorizedAccessException]{return $true}finally{if($null-ne$stream){$stream.Dispose()}}
  }

  function Invoke-LibraryRedEvidenceBinding([object]$Payload) {
    Assert-ExactKeys $Payload @('path','sha256') 'red_receipt_payload_invalid';$binding=$null
    try{$binding=Open-RedEvidenceBinding $Payload.path $Payload.sha256;$probeBlocked=Test-WriteOpenBlocked $binding.probePath;$entryBlocked=Test-WriteOpenBlocked $binding.entrypointPath;if(-not$probeBlocked-or-not$entryBlocked){throw 'red_evidence_binding_write_not_blocked'};return [pscustomobject][ordered]@{status='pass';validation='red_evidence_binding_valid';handleCount=$binding.handles.Count;probeWriteBlocked=$probeBlocked;entrypointWriteBlocked=$entryBlocked;receiptBytesSha256=$binding.receiptBytesSha256}}finally{Close-RedEvidenceBinding $binding}
  }

  function Assert-Baseline([string]$Path, [string]$ExpectedHash) {
    Assert-ExternalHash $Path $ExpectedHash 'baseline_hash_invalid'
    if (-not (Get-Item -LiteralPath $Path).IsReadOnly) { throw 'baseline_not_read_only' }
    $keys = @('schemaVersion','capturedUtc','repositoryRoot','head','branch','statusCanonicalization','statusRecordCount','statusSha256','contentCanonicalization','contentRecordCount','contentByteCount','contentManifestSha256','packetPaths')
    $baseline = Read-JsonExact $Path $keys 'baseline_schema_invalid'
    if ($baseline.schemaVersion -ne 1 -or $baseline.repositoryRoot -cne 'C:/appsprojects/phraseman') { throw 'baseline_value_invalid' }
    Assert-ExactKeys $baseline.packetPaths $script:FivePaths 'baseline_packet_paths_invalid'
    foreach ($path in $script:FivePaths) {
      if ($baseline.packetPaths.$path -cne 'absent') { throw 'baseline_packet_path_not_absent' }
    }
    return $baseline
  }

  function Assert-Packet([string]$Path,[string]$ExpectedHash) {
    Assert-ExternalHash $Path $ExpectedHash 'packet_hash_invalid'
    if(-not(Get-Item -LiteralPath $Path).IsReadOnly){throw 'packet_not_read_only'}
    return [pscustomobject][ordered]@{status='pass';validation='packet_valid';sha256=$ExpectedHash}
  }

  function Get-AllowlistedFileHashes {
    $hashes=[ordered]@{}
    foreach($relativePath in $script:FivePaths){
      $full=Join-Path $script:Repo $relativePath
      if(-not(Test-Path -LiteralPath $full -PathType Leaf)){throw 'allowlisted_source_missing'}
      $hashes[$relativePath]=Get-Sha256 $full
    }
    return [pscustomobject]$hashes
  }

  function Assert-PathHasNoReparsePoint([string]$Path,[string]$Code) {
    $item=Get-Item -LiteralPath $Path -Force
    if(($item.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne0){throw $Code}
  }

  function Open-SourceBindings([string]$Root,[string[]]$RelativePaths) {
    $rootPath=[IO.Path]::GetFullPath($Root).TrimEnd('\')
    if(-not(Test-Path -LiteralPath $rootPath -PathType Container)){throw 'source_binding_invalid'}
    Assert-PathHasNoReparsePoint $rootPath 'source_binding_invalid'
    $handles=[Collections.Generic.List[IO.FileStream]]::new();$hashes=[ordered]@{}
    try{
      foreach($relativePath in $RelativePaths){
        if([string]::IsNullOrWhiteSpace($relativePath)-or[IO.Path]::IsPathRooted($relativePath)){throw 'source_binding_invalid'}
        $full=[IO.Path]::GetFullPath((Join-Path $rootPath $relativePath));$prefix=$rootPath+'\'
        if(-not$full.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)-or-not(Test-Path -LiteralPath $full -PathType Leaf)){throw 'source_binding_invalid'}
        Assert-PathHasNoReparsePoint $full 'source_binding_invalid'
        $stream=[IO.File]::Open($full,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
        $handles.Add($stream);$hashes[$relativePath]=Get-StreamSha256 $stream
      }
      return [pscustomobject][ordered]@{handles=$handles;hashes=[pscustomobject]$hashes}
    }catch{foreach($handle in $handles){$handle.Dispose()};throw}
  }

  function Close-SourceBindings([object]$Binding) {
    if($null-eq$Binding){return}
    foreach($handle in $Binding.handles){$handle.Dispose()}
  }

  function Invoke-LibrarySourceBinding([object]$Payload) {
    Assert-ExactKeys $Payload @('root','relativePaths') 'source_binding_invalid'
    if($Payload.relativePaths-isnot[array]-or$Payload.relativePaths.Count-ne1-or$Payload.relativePaths[0]-isnot[string]){throw 'source_binding_invalid'}
    $binding=$null;$writeBlocked=$false
    try{
      $binding=Open-SourceBindings $Payload.root ([string[]]@($Payload.relativePaths))
      $path=Join-Path ([IO.Path]::GetFullPath($Payload.root)) $Payload.relativePaths[0]
      try{[IO.File]::WriteAllText($path,'forbidden')}catch [IO.IOException]{$writeBlocked=$true}catch [UnauthorizedAccessException]{$writeBlocked=$true}
      if(-not$writeBlocked){throw 'source_binding_write_not_blocked'}
      return [pscustomobject][ordered]@{status='pass';validation='source_binding_valid';writeBlocked=$true}
    }finally{Close-SourceBindings $binding}
  }

  function Get-SourceFingerprint([object]$Hashes) {
    Assert-ExactKeys $Hashes $script:FivePaths 'source_hash_schema_invalid'
    $lines=[Collections.Generic.List[string]]::new()
    foreach($relativePath in @(Get-OrdinalSortedStrings ([string[]]$script:FivePaths))){
      $hash=Get-PropertyValue $Hashes $relativePath 'source_hash_schema_invalid'
      Assert-LowerSha $hash 'source_hash_value_invalid'
      $lines.Add("$relativePath`n$hash")
    }
    return Get-StringSha256 (($lines.ToArray()-join"`n")+"`n")
  }

  function Get-SourceObservation([object]$ExpectedHashes,[string]$ExpectedFingerprint) {
    $current=Get-AllowlistedFileHashes
    foreach($relativePath in $script:FivePaths){if((Get-PropertyValue $current $relativePath 'source_hash_schema_invalid')-cne(Get-PropertyValue $ExpectedHashes $relativePath 'source_hash_schema_invalid')){throw 'source_continuity_invalid'}}
    $fingerprint=Get-SourceFingerprint $current
    if($fingerprint-cne$ExpectedFingerprint){throw 'source_continuity_invalid'}
    return [pscustomobject][ordered]@{observedUtc=[DateTime]::UtcNow.ToString('O');fileCount=5;fingerprintSha256=$fingerprint}
  }

  function New-GateRecord([string]$Gate, [int]$ExitCode, [string]$LogPath, [int]$Suites, [int]$Tests) {
    if ($ExitCode -ne 0) { throw "${Gate}_gate_failed" }
    if ((Get-Item -LiteralPath $LogPath).Length -gt 262144) { throw "${Gate}_log_too_large" }
    return [ordered]@{
      schemaVersion = 1
      gate = $Gate
      status = 'pass'
      exitCode = 0
      testSuites = $Suites
      tests = $Tests
      logSha256 = Get-Sha256 $LogPath
    }
  }

  function Get-JestCounts([string]$LogPath) {
    $text = Get-Content -LiteralPath $LogPath -Raw
    $plain = [regex]::Replace($text, "`e\[[0-9;]*m", '')
    $suites = [regex]::Match($plain, 'Test Suites:[^\r\n]*?(\d+) passed').Groups[1].Value
    $tests = [regex]::Match($plain, 'Tests:[^\r\n]*?(\d+) passed').Groups[1].Value
    if ($suites -eq '' -or $tests -eq '') {
      [Console]::Error.WriteLine(((Get-Content -LiteralPath $LogPath -Tail 30) -join "`n"))
      throw 'green_count_parse_failed'
    }
    return @([int]$suites, [int]$tests)
  }

  function Assert-SanitizedArtifact([string]$Path) {
    if ((Get-Item -LiteralPath $Path).Length -gt 16384) { throw 'sanitizer_artifact_too_large' }
    $text = Get-Content -LiteralPath $Path -Raw
    $rawField = '(?i)"(key|error|message|stack|cause|sql|absolutePath|stdout|stderr|cipherVersion|markerRow|environment)"\s*:'
    if ($text -match $rawField) { throw 'sanitizer_raw-field_rejected' }
    if ($text -match '(?i)([A-Z]:\\|/Users/|/home/|OPENAI_API_KEY|PRAGMA key)') { throw 'sanitizer_sensitive_value_rejected' }
  }

  function Get-BytesSha256([byte[]]$Bytes) {
    $hasher=[Security.Cryptography.SHA256]::Create()
    try { return (($hasher.ComputeHash($Bytes)|ForEach-Object{$_.ToString('x2')})-join '') } finally { $hasher.Dispose() }
  }

  function Get-StringSha256([string]$Value) {
    return Get-BytesSha256 ($script:Utf8NoBom.GetBytes($Value))
  }

  function Get-PropertyValue([object]$Value, [string]$Name, [string]$Code) {
    $property = $Value.PSObject.Properties[$Name]
    if ($null -eq $property) { throw $Code }
    return $property.Value
  }

  function Assert-LowerSha([object]$Value, [string]$Code) {
    if ($Value -isnot [string] -or $Value -cnotmatch '^[0-9a-f]{64}$') { throw $Code }
  }

  function Assert-UtcTimestamp([object]$Value, [string]$Code) {
    if ($Value -isnot [string] -or $Value -cnotmatch '^\d{4}-\d{2}-\d{2}T.*Z$') { throw $Code }
    $parsed = [DateTimeOffset]::MinValue
    if (-not [DateTimeOffset]::TryParse($Value, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal, [ref]$parsed) -or $parsed.Offset -ne [TimeSpan]::Zero) { throw $Code }
    return $parsed
  }

  function Get-StrictlyLaterUtcTimestamp([string]$Previous, [string]$Code) {
    $floor = Assert-UtcTimestamp $Previous $Code
    $current = [DateTimeOffset]::UtcNow
    while ($current -le $floor) {
      [Threading.Thread]::Sleep(1)
      $current = [DateTimeOffset]::UtcNow
    }
    return $current.UtcDateTime.ToString('O')
  }

  function Assert-SafeRelativePath([object]$Value, [string]$Code) {
    if ($Value -isnot [string] -or $Value.Length -eq 0 -or $Value.Contains('\') -or $Value.StartsWith('/') -or $Value -match '(^|/)\.\.(/|$)' -or $Value -match '^[A-Za-z]:') { throw $Code }
  }

  function Assert-SanitizedValue([object]$Value, [int]$Depth = 0) {
    if ($Depth -gt 24) { throw 'sanitizer_rejected' }
    if ($null -eq $Value -or $Value -is [bool] -or $Value -is [int] -or $Value -is [long] -or $Value -is [double]) { return }
    if ($Value -is [string]) {
      if ($Value -match '(?i)([A-Z]:[\\/]|\\\\[^\\]+\\|(^|\s)/[^\s]|OPENAI_API_KEY|PRAGMA\s+key)') { throw 'sanitizer_rejected' }
      if ($Value -match 'account_sqlcipher_' -and $Value -notin @(
        'account_sqlcipher_android_prepare_pass',
        'account_sqlcipher_android_verify_pass',
        'account_sqlcipher_android_wrong_key_rejected_pass',
        'account_sqlcipher_android_proof_pass',
        $script:AuthenticRedSnapshotArtifact,
        $script:AuthenticRedRawLogArtifact
      )) { throw 'sanitizer_rejected' }
      return
    }
    if ($Value -is [Collections.IEnumerable] -and $Value -isnot [Management.Automation.PSCustomObject]) {
      foreach ($item in $Value) { Assert-SanitizedValue $item ($Depth + 1) }
      return
    }
    if ($Value.GetType().Name -ne 'PSCustomObject') { throw 'sanitizer_rejected' }
    $forbidden = @('key','error','message','stack','cause','sql','absolutePath','stdout','stderr','cipherVersion','markerRow','environment')
    foreach ($property in $Value.PSObject.Properties) {
      if ($forbidden -contains $property.Name) { throw 'sanitizer_rejected' }
      Assert-SanitizedValue $property.Value ($Depth + 1)
    }
  }

  function Publish-SanitizedJson([string]$CandidateRoot, [string]$RelativePath, [object]$Value) {
    Assert-SafeRelativePath $RelativePath 'sanitizer_rejected'
    Assert-SanitizedValue $Value
    $candidate = Join-Path $CandidateRoot $RelativePath
    $candidateParent = Split-Path -Parent $candidate
    [IO.Directory]::CreateDirectory($candidateParent) | Out-Null
    Write-DurableJson $candidate $Value $false
    Assert-SanitizedArtifact $candidate
    return $candidate
  }

  function Test-GateRecordSet([object]$Payload) {
    Assert-ExactKeys $Payload @('entries','expected') 'gate_payload_schema_invalid'
    Assert-ExactKeys $Payload.entries @('red.json','green.json','eslint.json','strictTs.json','gate-manifest.json') 'gate_entry_set_invalid'
    Assert-ExactKeys $Payload.expected @('baselineSha256','packetSpecSha256','testFileHashes','allowlistedFileHashes','nativeInputHashes','sourceFingerprintSha256') 'gate_expected_schema_invalid'
    $raw = [ordered]@{}
    $parsed = [ordered]@{}
    foreach ($name in @('red.json','green.json','eslint.json','strictTs.json','gate-manifest.json')) {
      $text = Get-PropertyValue $Payload.entries $name 'gate_entry_missing'
      if ($text -isnot [string] -or $text.Length -eq 0 -or $script:Utf8NoBom.GetByteCount($text) -gt 16384) { throw 'gate_entry_invalid' }
      $raw[$name] = $text
      try { $parsed[$name] = $text | ConvertFrom-Json } catch { throw 'gate_entry_json_invalid' }
    }
    $red = $parsed['red.json']
    Assert-ExactKeys $red @('schemaVersion','gate','status','exitCode','classification','createdUtc','testFileHashes','vulnerableRunnerArtifact','vulnerableRunnerSha256','vulnerableRunnerPathSha256','invocationSha256','rawLogArtifact','rawLogSha256','resultCounts') 'red_record_schema_invalid'
    Assert-ExactKeys $red.testFileHashes @('probe','entrypoint') 'red_record_schema_invalid'
    if ($red.schemaVersion -ne 2 -or $red.gate -cne 'red' -or $red.status -cne 'expected_failure' -or $red.exitCode -ne 1 -or
        $red.classification -cne 'p1_hardening_regressions_absent' -or
        $red.vulnerableRunnerArtifact -cne $script:AuthenticRedSnapshotArtifact -or
        $red.rawLogArtifact -cne $script:AuthenticRedRawLogArtifact) { throw 'red_record_value_invalid' }
    Assert-UtcTimestamp $red.createdUtc 'red_record_value_invalid' | Out-Null
    foreach($sha in @($red.vulnerableRunnerSha256,$red.vulnerableRunnerPathSha256,$red.invocationSha256,$red.rawLogSha256)){Assert-LowerSha $sha 'red_record_value_invalid'}
    if($red.invocationSha256-cne(Get-StringSha256 $script:AuthenticRedInvocation)){throw 'red_record_value_invalid'}
    Assert-RedResultCounts $red.resultCounts
    foreach ($key in @('probe','entrypoint')) {
      Assert-LowerSha (Get-PropertyValue $red.testFileHashes $key 'red_record_schema_invalid') 'red_record_value_invalid'
      if ((Get-PropertyValue $red.testFileHashes $key 'red_record_schema_invalid') -cne (Get-PropertyValue $Payload.expected.testFileHashes $key 'gate_expected_schema_invalid')) { throw 'red_record_test_hash_mismatch' }
    }
    foreach ($name in @('green','eslint','strictTs')) {
      $record = $parsed["$name.json"]
      Assert-ExactKeys $record @('schemaVersion','gate','status','exitCode','testSuites','tests','logSha256') 'gate_record_schema_invalid'
      if ($record.schemaVersion -ne 1) { throw 'gate_record_value_invalid' }
      if ($record.gate -isnot [string] -or $record.gate -cne $name) { throw 'gate_record_value_invalid' }
      if ($record.status -isnot [string] -or $record.status -cne 'pass') { throw 'gate_record_value_invalid' }
      if ($record.exitCode -isnot [long] -and $record.exitCode -isnot [int]) { throw 'gate_record_value_invalid' }
      if ($record.exitCode -ne 0) { throw 'gate_record_value_invalid' }
      if (($record.testSuites -isnot [long] -and $record.testSuites -isnot [int]) -or ($record.tests -isnot [long] -and $record.tests -isnot [int])) { throw 'gate_record_value_invalid' }
      if ($name -eq 'green') {
        if ($record.testSuites -lt 1 -or $record.tests -lt 1) { throw 'gate_record_value_invalid' }
      } elseif ($record.testSuites -ne 0 -or $record.tests -ne 0) { throw 'gate_record_value_invalid' }
      Assert-LowerSha $record.logSha256 'gate_record_value_invalid'
    }
    $manifest = $parsed['gate-manifest.json']
    Assert-ExactKeys $manifest @('schemaVersion','baselineSha256','packetSpecSha256','exactFiveCreated','allowlistedFileHashes','gateArtifactHashes','nativeInputHashes','sourceFingerprintSha256') 'gate_manifest_schema_invalid'
    Assert-ExactKeys $manifest.gateArtifactHashes @('red','green','eslint','strictTs') 'gate_manifest_schema_invalid'
    if ($manifest.schemaVersion -ne 1 -or $manifest.exactFiveCreated -isnot [bool] -or -not $manifest.exactFiveCreated -or $manifest.baselineSha256 -cne $Payload.expected.baselineSha256) { throw 'gate_manifest_value_invalid' }
    if($manifest.packetSpecSha256-cne$Payload.expected.packetSpecSha256){throw 'gate_packet_spec_mismatch'}
    if($manifest.sourceFingerprintSha256-cne$Payload.expected.sourceFingerprintSha256){throw 'gate_source_fingerprint_mismatch'}
    Assert-LowerSha $manifest.packetSpecSha256 'gate_manifest_value_invalid'
    Assert-LowerSha $manifest.sourceFingerprintSha256 'gate_manifest_value_invalid'
    foreach ($name in @('red','green','eslint','strictTs')) {
      $expectedHash = Get-StringSha256 $raw["$name.json"]
      if ((Get-PropertyValue $manifest.gateArtifactHashes $name 'gate_manifest_schema_invalid') -cne $expectedHash) { throw 'gate_artifact_hash_invalid' }
    }
    $packetKeys = @($script:FivePaths)
    Assert-ExactKeys $manifest.allowlistedFileHashes $packetKeys 'gate_manifest_packet_schema_invalid'
    Assert-ExactKeys $Payload.expected.allowlistedFileHashes $packetKeys 'gate_expected_schema_invalid'
    foreach ($key in $packetKeys) {
      if ((Get-PropertyValue $manifest.allowlistedFileHashes $key 'gate_manifest_packet_schema_invalid') -cne (Get-PropertyValue $Payload.expected.allowlistedFileHashes $key 'gate_expected_schema_invalid')) { throw 'gate_packet_hash_mismatch' }
    }
    $nativeKeys = @('appConfigJs','gradleProperties','packageJson','packageLockJson','expoSqlitePatch','localApk')
    Assert-ExactKeys $manifest.nativeInputHashes $nativeKeys 'gate_manifest_native_schema_invalid'
    Assert-ExactKeys $Payload.expected.nativeInputHashes $nativeKeys 'gate_expected_schema_invalid'
    foreach ($key in $nativeKeys) {
      if ((Get-PropertyValue $manifest.nativeInputHashes $key 'gate_manifest_native_schema_invalid') -cne (Get-PropertyValue $Payload.expected.nativeInputHashes $key 'gate_expected_schema_invalid')) { throw 'gate_native_hash_mismatch' }
    }
    return [pscustomobject][ordered]@{
      status='pass'
      validation='gate_records_valid'
      manifest=$manifest
      gates=[pscustomobject][ordered]@{red='pass';green=$parsed['green.json'].status;eslint=$parsed['eslint.json'].status;strictTs=$parsed['strictTs.json'].status}
      focused=[pscustomobject][ordered]@{
        green=[pscustomobject][ordered]@{status=$parsed['green.json'].status;exitCode=$parsed['green.json'].exitCode;testSuites=$parsed['green.json'].testSuites;tests=$parsed['green.json'].tests}
        eslint=[pscustomobject][ordered]@{status=$parsed['eslint.json'].status;exitCode=$parsed['eslint.json'].exitCode;testSuites=$parsed['eslint.json'].testSuites;tests=$parsed['eslint.json'].tests}
        strictTs=[pscustomobject][ordered]@{status=$parsed['strictTs.json'].status;exitCode=$parsed['strictTs.json'].exitCode;testSuites=$parsed['strictTs.json'].testSuites;tests=$parsed['strictTs.json'].tests}
      }
    }
  }

  function Assert-GateArchiveNames([object]$Payload) {
    Assert-ExactKeys $Payload @('fullNames') 'gate_bundle_entries_invalid'
    if($Payload.fullNames-isnot[array]){throw 'gate_bundle_entries_invalid'}
    $expected=@('eslint.json','gate-manifest.json','green.json','red.json','strictTs.json')
    if($Payload.fullNames.Count-ne5){throw 'gate_bundle_entries_invalid'}
    $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach($name in $Payload.fullNames){
      if($name-isnot[string]-or$name.Contains('/')-or$name.Contains('\')-or$name.EndsWith('/')-or-not$seen.Add($name)){throw 'gate_bundle_entries_invalid'}
    }
    $actual=@(Get-OrdinalSortedStrings ([string[]]@($seen)))
    if(($actual-join'|')-cne($expected-join'|')){throw 'gate_bundle_entries_invalid'}
    return [pscustomobject][ordered]@{status='pass';validation='gate_archive_names_valid';entryCount=5}
  }

  function Get-ValidatedAccountSqlcipherPhaseFacts([object]$Payload) {
    Assert-ExactKeys $Payload @('runId','phases','header','snapshots') 'phase_payload_schema_invalid'
    if ($Payload.runId -isnot [string] -or $Payload.runId -cnotmatch '^[0-9a-f]{32}$') { throw 'phase_run_id_invalid' }
    if ($Payload.phases -isnot [array] -or $Payload.phases.Count -ne 4) { throw 'phase_count_invalid' }
    $phaseKeys = @('schemaVersion','runId','label','mode','sequence','launchedUtc','capturedUtc','pid','starttime','databaseRelativePath','logArtifactRelativePath','logSha256','expectedMarker','expectedMarkerCount','unexpectedMarkerCount','cleanupPassed','apkObservations','sourceBefore','sourceAfter')
    $labels = @('prepare','verify-before','wrong-key','verify-after')
    $modes = @('prepare','verify','wrong-key','verify')
    $markers = @('account_sqlcipher_android_prepare_pass','account_sqlcipher_android_verify_pass','account_sqlcipher_android_wrong_key_rejected_pass','account_sqlcipher_android_verify_pass')
    $tuples = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $paths = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $hashes = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $approvedApkSha256 = $null
    $approvedApkPathSha256 = $null
    $approvedSourceFingerprint = $null
    $apkTimes=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $apkCommands=[Collections.Generic.List[int]]::new()
    for ($index=0; $index -lt 4; $index += 1) {
      $phase = $Payload.phases[$index]
      Assert-ExactKeys $phase $phaseKeys 'phase_schema_invalid'
      if($phase.schemaVersion-ne1){throw 'phase_schema_invalid'}
      if ($phase.runId -cne $Payload.runId) { throw 'phase_run_id_invalid' }
      if ($phase.label -cne $labels[$index] -or $phase.mode -cne $modes[$index] -or $phase.sequence -ne ($index + 1)) { throw 'phase_order_invalid' }
      $launched = Assert-UtcTimestamp $phase.launchedUtc 'phase_time_invalid'
      $captured = Assert-UtcTimestamp $phase.capturedUtc 'phase_time_invalid'
      if ($captured -lt $launched) { throw 'phase_time_invalid' }
      if ($phase.pid -isnot [long] -and $phase.pid -isnot [int] -or $phase.pid -le 0 -or $phase.starttime -isnot [string] -or $phase.starttime -cnotmatch '^[1-9][0-9]*$') { throw 'phase_tuple_invalid' }
      if (-not $tuples.Add("$($phase.pid):$($phase.starttime)")) { throw 'phase_tuple_duplicate' }
      if ($phase.databaseRelativePath -cne $script:DatabaseRelativePath) { throw 'phase_database_path_invalid' }
      Assert-SafeRelativePath $phase.logArtifactRelativePath 'phase_log_path_invalid'
      if ($phase.logArtifactRelativePath -cne "phases/$($labels[$index]).json" -or -not $paths.Add($phase.logArtifactRelativePath)) { throw 'phase_log_path_duplicate' }
      Assert-LowerSha $phase.logSha256 'phase_log_hash_invalid'
      if (-not $hashes.Add($phase.logSha256)) { throw 'phase_log_hash_duplicate' }
      if ($phase.expectedMarker -cne $markers[$index] -or $phase.expectedMarkerCount -ne 1 -or $phase.unexpectedMarkerCount -ne 0 -or $phase.cleanupPassed -isnot [bool] -or -not $phase.cleanupPassed) { throw 'phase_marker_invalid' }
      Assert-SourceObservation $phase.sourceBefore 'phase_source_continuity_invalid'
      Assert-SourceObservation $phase.sourceAfter 'phase_source_continuity_invalid'
      if($null-eq$approvedSourceFingerprint){$approvedSourceFingerprint=$phase.sourceBefore.fingerprintSha256}
      if($phase.sourceBefore.fingerprintSha256-cne$approvedSourceFingerprint-or$phase.sourceAfter.fingerprintSha256-cne$approvedSourceFingerprint){throw 'phase_source_continuity_invalid'}
      if ($null -eq $approvedApkSha256) {
        $approvedApkSha256 = Get-PropertyValue $phase.apkObservations.beforeLaunch 'sha256' 'installed_apk_continuity_invalid'
        $approvedApkPathSha256 = Get-PropertyValue $phase.apkObservations.beforeLaunch 'baseApkPathSha256' 'installed_apk_continuity_invalid'
      }
      Assert-ApkContinuity ([pscustomobject][ordered]@{approvedApkSha256=$approvedApkSha256;approvedApkPathSha256=$approvedApkPathSha256;observations=$phase.apkObservations}) | Out-Null
      foreach($checkpoint in @('beforeLaunch','afterPid','afterMarker','final')){if(-not$apkTimes.Add($phase.apkObservations.$checkpoint.observedUtc)){throw 'installed_apk_continuity_invalid'}}
      $beforeTime=Assert-UtcTimestamp $phase.sourceBefore.observedUtc 'phase_time_invalid'
      $beforeLaunchTime=Assert-UtcTimestamp $phase.apkObservations.beforeLaunch.observedUtc 'phase_time_invalid'
      $afterPidTime=Assert-UtcTimestamp $phase.apkObservations.afterPid.observedUtc 'phase_time_invalid'
      $afterMarkerTime=Assert-UtcTimestamp $phase.apkObservations.afterMarker.observedUtc 'phase_time_invalid'
      $finalTime=Assert-UtcTimestamp $phase.apkObservations.final.observedUtc 'phase_time_invalid'
      $afterTime=Assert-UtcTimestamp $phase.sourceAfter.observedUtc 'phase_time_invalid'
      if(-not($beforeTime-lt$beforeLaunchTime-and$beforeLaunchTime-lt$launched-and$launched-lt$afterPidTime-and$afterPidTime-lt$captured-and$captured-lt$afterMarkerTime-and$afterMarkerTime-lt$finalTime-and$finalTime-lt$afterTime)){throw 'phase_time_invalid'}
      foreach($checkpoint in @('beforeLaunch','afterPid','afterMarker','final')){$observation=$phase.apkObservations.$checkpoint;$apkCommands.Add([int]$observation.pmPathCommandSequence);$apkCommands.Add([int]$observation.sha256CommandSequence)}
    }
    if(($apkCommands.ToArray()-join',')-cne((1..32)-join',')){throw 'installed_apk_continuity_invalid'}
    Assert-ExactKeys $Payload.header @('label','hex') 'header_schema_invalid'
    if ($Payload.header.label -cne 'header-16' -or $Payload.header.hex -isnot [string] -or $Payload.header.hex -cnotmatch '^[0-9a-f]{32}$' -or $Payload.header.hex -ceq '53514c69746520666f726d6174203300') { throw 'account_sqlcipher_probe_header_failed' }
    if ($Payload.snapshots -isnot [array] -or $Payload.snapshots.Count -ne 2) { throw 'snapshot_schema_invalid' }
    $snapshotLabels=@('before-wrong-key','after-wrong-key')
    for($index=0;$index-lt2;$index+=1){$snapshot=$Payload.snapshots[$index];Assert-ExactKeys $snapshot @('label','sha256','size') 'snapshot_schema_invalid';if($snapshot.label-cne$snapshotLabels[$index]-or$snapshot.size-isnot[long]-and$snapshot.size-isnot[int]-or$snapshot.size-le0){throw 'snapshot_value_invalid'};Assert-LowerSha $snapshot.sha256 'snapshot_value_invalid'}
    if ($Payload.snapshots[0].sha256 -cne $Payload.snapshots[1].sha256 -or $Payload.snapshots[0].size -ne $Payload.snapshots[1].size) { throw 'aggregate_snapshot_invalid' }
    return [pscustomobject][ordered]@{status='pass';validation='phase_facts_valid';runId=$Payload.runId;phaseCount=4;databaseRelativePath=$script:DatabaseRelativePath}
  }

  function Assert-ApkContinuity([object]$Payload) {
    Assert-ExactKeys $Payload @('approvedApkSha256','approvedApkPathSha256','observations') 'installed_apk_continuity_invalid'
    Assert-LowerSha $Payload.approvedApkSha256 'installed_apk_continuity_invalid'
    Assert-LowerSha $Payload.approvedApkPathSha256 'installed_apk_continuity_invalid'
    $checkpoints = @('beforeLaunch','afterPid','afterMarker','final')
    Assert-ExactKeys $Payload.observations $checkpoints 'installed_apk_continuity_invalid'
    $previousSequence=$null
    foreach($checkpoint in $checkpoints) {
      $observation = $Payload.observations.$checkpoint
      Assert-ExactKeys $observation @('checkpoint','observedUtc','pmPathCommandSequence','sha256CommandSequence','baseApkPathSha256','sha256') 'installed_apk_continuity_invalid'
      if ($observation.checkpoint -cne $checkpoint) { throw 'installed_apk_continuity_invalid' }
      Assert-UtcTimestamp $observation.observedUtc 'installed_apk_continuity_invalid' | Out-Null
      if(($observation.pmPathCommandSequence-isnot[int]-and$observation.pmPathCommandSequence-isnot[long])-or($observation.sha256CommandSequence-isnot[int]-and$observation.sha256CommandSequence-isnot[long])-or$observation.sha256CommandSequence-ne($observation.pmPathCommandSequence+1)){throw 'installed_apk_continuity_invalid'}
      if($null-ne$previousSequence-and$observation.pmPathCommandSequence-ne($previousSequence+1)){throw 'installed_apk_continuity_invalid'}
      $previousSequence=$observation.sha256CommandSequence
      if ($observation.baseApkPathSha256 -cne $Payload.approvedApkPathSha256 -or $observation.sha256 -cne $Payload.approvedApkSha256) { throw 'installed_apk_continuity_invalid' }
    }
    return [pscustomobject][ordered]@{status='pass';validation='apk_continuity_valid';observationCount=4}
  }

  function Assert-SourceObservation([object]$Observation,[string]$Code) {
    Assert-ExactKeys $Observation @('observedUtc','fileCount','fingerprintSha256') $Code
    Assert-UtcTimestamp $Observation.observedUtc $Code|Out-Null
    if(($Observation.fileCount-isnot[int]-and$Observation.fileCount-isnot[long])-or$Observation.fileCount-ne5){throw $Code}
    Assert-LowerSha $Observation.fingerprintSha256 $Code
  }

  function Reduce-AccountSqlcipherPhaseLog([object]$Payload) {
    Assert-ExactKeys $Payload @('runId','label','mode','pid','starttime','launchedUtc','capturedUtc','expectedMarker','lines') 'phase_log_payload_schema_invalid'
    if ($Payload.runId -isnot [string] -or $Payload.runId -cnotmatch '^[0-9a-f]{32}$' -or $Payload.pid -isnot [long] -and $Payload.pid -isnot [int] -or $Payload.pid -le 0 -or $Payload.starttime -isnot [string] -or $Payload.starttime -cnotmatch '^[1-9][0-9]*$') { throw 'phase_log_payload_invalid' }
    $launched=Assert-UtcTimestamp $Payload.launchedUtc 'phase_log_time_invalid';$captured=Assert-UtcTimestamp $Payload.capturedUtc 'phase_log_time_invalid';if($captured-lt$launched){throw 'phase_log_time_invalid'}
    if ($Payload.lines -isnot [array] -or $Payload.lines.Count -eq 0) { throw 'phase_log_marker_count_invalid' }
    $expectedCount=0;$unexpectedCount=0
    foreach($line in $Payload.lines){Assert-ExactKeys $line @('pid','utc','token') 'phase_log_line_schema_invalid';if($line.pid-ne$Payload.pid){throw 'phase_log_pid_invalid'};$time=Assert-UtcTimestamp $line.utc 'phase_log_time_invalid';if($time-lt$launched-or$time-gt$captured){throw 'phase_log_time_invalid'};if($line.token-ceq$Payload.expectedMarker){$expectedCount+=1}else{$unexpectedCount+=1}}
    if($expectedCount-ne1){throw 'phase_log_marker_count_invalid'};if($unexpectedCount-ne0){throw 'phase_log_unexpected_marker'}
    $canonical=[ordered]@{runId=$Payload.runId;label=$Payload.label;mode=$Payload.mode;pid=$Payload.pid;starttime=$Payload.starttime;launchedUtc=$Payload.launchedUtc;capturedUtc=$Payload.capturedUtc;expectedMarker=$Payload.expectedMarker}
    return [pscustomobject][ordered]@{status='pass';canonicalSha256=(Get-StringSha256 ($canonical|ConvertTo-Json -Compress));expectedMarkerCount=1;unexpectedMarkerCount=0}
  }

  function Convert-AccountSqlcipherSnapshot([object]$Payload) {
    Assert-ExactKeys $Payload @('databaseRelativePath','shaLines','sizeLines') 'snapshot_payload_schema_invalid'
    if($Payload.databaseRelativePath-cne$script:DatabaseRelativePath-or$Payload.shaLines-isnot[array]-or$Payload.shaLines.Count-ne1){throw 'database_snapshot_hash_invalid'}
    $shaMatch=[regex]::Match([string]$Payload.shaLines[0],'^([0-9a-f]{64})\s{2}'+[regex]::Escape($script:DatabaseRelativePath)+'$')
    if(-not$shaMatch.Success){throw 'database_snapshot_hash_invalid'};$capturedSha=$shaMatch.Groups[1].Value
    if($Payload.sizeLines-isnot[array]-or$Payload.sizeLines.Count-ne1){throw 'database_snapshot_size_invalid'};$sizeMatch=[regex]::Match([string]$Payload.sizeLines[0],'^[1-9][0-9]*$');if(-not$sizeMatch.Success){throw 'database_snapshot_size_invalid'}
    return [pscustomobject][ordered]@{status='pass';sha256=$capturedSha;size=[long]$sizeMatch.Value}
  }

  function Assert-AccountSqlcipherProofEvidence([object]$Manifest) {
    $keys=@('schemaVersion','runId','runStartedUtc','validatedUtc','preEditBaselineSha256','gateBundleSha256','packetSpecSha256','preDeviceHead','preDeviceContentRecordCount','preDeviceContentByteCount','preDeviceContentManifestSha256','postDeviceHead','postDeviceContentRecordCount','postDeviceContentByteCount','postDeviceContentManifestSha256','installedApkSha256','databaseRelativePath','phases','cleanupApkObservation','finalSourceObservation','headerHex','beforeWrongKey','afterWrongKey','packageSha256Before','packageSha256After','nativeInputHashes','gates','restoration')
    Assert-ExactKeys $Manifest $keys 'manifest_schema_invalid'
    if($Manifest.schemaVersion-ne1-or$Manifest.runId-isnot[string]-or$Manifest.runId-cnotmatch'^[0-9a-f]{32}$'-or$Manifest.databaseRelativePath-cne$script:DatabaseRelativePath){throw 'manifest_value_invalid'}
    Assert-UtcTimestamp $Manifest.runStartedUtc 'manifest_value_invalid'|Out-Null;Assert-UtcTimestamp $Manifest.validatedUtc 'manifest_value_invalid'|Out-Null
    foreach($name in @('preEditBaselineSha256','gateBundleSha256','packetSpecSha256','preDeviceContentManifestSha256','postDeviceContentManifestSha256','installedApkSha256','packageSha256Before','packageSha256After')){Assert-LowerSha (Get-PropertyValue $Manifest $name 'manifest_schema_invalid') 'manifest_value_invalid'}
    $phasePayload=[pscustomobject][ordered]@{runId=$Manifest.runId;phases=$Manifest.phases;header=$Manifest.headerHex;snapshots=@($Manifest.beforeWrongKey,$Manifest.afterWrongKey)};Get-ValidatedAccountSqlcipherPhaseFacts $phasePayload|Out-Null
    if($Manifest.preDeviceHead-cne$Manifest.postDeviceHead-or$Manifest.preDeviceContentRecordCount-ne$Manifest.postDeviceContentRecordCount-or$Manifest.preDeviceContentByteCount-ne$Manifest.postDeviceContentByteCount-or$Manifest.preDeviceContentManifestSha256-cne$Manifest.postDeviceContentManifestSha256){throw 'aggregate_content_invalid'}
    Assert-ExactKeys $Manifest.nativeInputHashes @('appConfigJs','gradleProperties','packageJson','packageLockJson','expoSqlitePatch','localApk') 'manifest_native_schema_invalid';foreach($property in $Manifest.nativeInputHashes.PSObject.Properties){Assert-LowerSha $property.Value 'manifest_native_value_invalid'}
    if($Manifest.installedApkSha256-cne$Manifest.nativeInputHashes.localApk-or$Manifest.packageSha256Before-cne$Manifest.packageSha256After){throw 'aggregate_binding_invalid'}
    Assert-SourceObservation $Manifest.finalSourceObservation 'aggregate_source_continuity_invalid'
    foreach($phase in $Manifest.phases){
      if($phase.apkObservations.beforeLaunch.sha256-cne$Manifest.installedApkSha256){throw 'installed_apk_continuity_invalid'}
      if($phase.sourceBefore.fingerprintSha256-cne$Manifest.finalSourceObservation.fingerprintSha256-or$phase.sourceAfter.fingerprintSha256-cne$Manifest.finalSourceObservation.fingerprintSha256){throw 'aggregate_source_continuity_invalid'}
    }
    $cleanupApk=$Manifest.cleanupApkObservation
    Assert-ExactKeys $cleanupApk @('checkpoint','observedUtc','pmPathCommandSequence','sha256CommandSequence','baseApkPathSha256','sha256') 'installed_apk_continuity_invalid'
    if($cleanupApk.checkpoint-cne'cleanup'-or$cleanupApk.pmPathCommandSequence-ne33-or$cleanupApk.sha256CommandSequence-ne34-or$cleanupApk.sha256-cne$Manifest.installedApkSha256-or$cleanupApk.baseApkPathSha256-cne$Manifest.phases[0].apkObservations.beforeLaunch.baseApkPathSha256){throw 'installed_apk_continuity_invalid'}
    $cleanupTime=Assert-UtcTimestamp $cleanupApk.observedUtc 'installed_apk_continuity_invalid';$lastPhaseTime=Assert-UtcTimestamp $Manifest.phases[3].sourceAfter.observedUtc 'installed_apk_continuity_invalid'
    if($cleanupTime-le$lastPhaseTime){throw 'installed_apk_continuity_invalid'}
    foreach($phase in $Manifest.phases){foreach($checkpoint in @('beforeLaunch','afterPid','afterMarker','final')){if($cleanupApk.observedUtc-ceq$phase.apkObservations.$checkpoint.observedUtc){throw 'installed_apk_continuity_invalid'}}}
    Assert-ExactKeys $Manifest.gates @('red','green','eslint','strictTs') 'manifest_gates_schema_invalid';foreach($property in $Manifest.gates.PSObject.Properties){if($property.Value-cne'pass'){throw 'aggregate_gate_invalid'}}
    Assert-ExactKeys $Manifest.restoration @('appForceStopped','metroStopped','packageRestored','packageRecoveryCleared','externalEmulatorOnline','installedApkMatched','tempDeleted','sanitizerPassed') 'manifest_restoration_schema_invalid';foreach($property in $Manifest.restoration.PSObject.Properties){if($property.Value-isnot[bool]-or-not$property.Value){throw 'aggregate_restoration_invalid'}}
    return [pscustomobject][ordered]@{status='pass';validation='aggregate_evidence_valid'}
  }

  function Test-AccountSqlcipherProofEvidence([object]$Manifest) {
    Assert-AccountSqlcipherProofEvidence $Manifest|Out-Null
    return [pscustomobject][ordered]@{status='pass';token='account_sqlcipher_android_proof_pass'}
  }

  function Test-ApkAbiEntries([object]$Payload) {
    Assert-ExactKeys $Payload @('entries') 'apk_abi_payload_invalid';if($Payload.entries-isnot[array]){throw 'apk_abi_payload_invalid'}
    $matches=@($Payload.entries|Where-Object{$_-is[string]-and$_-cmatch'^lib/x86_64/[^/]+\.so$'});if($matches.Count-lt1){throw 'local_apk_x86_64_missing'}
    return [pscustomobject][ordered]@{status='pass';x86_64LibraryCount=$matches.Count}
  }

  function Get-MutexModel([object]$Payload) {
    Assert-ExactKeys $Payload @('outcome') 'mutex_model_payload_invalid';$events=[Collections.Generic.List[string]]::new();$events.Add('mutex:create');$events.Add('mutex:wait')
    if($Payload.outcome-ceq'busy'){$events.Add('mutex:dispose');return [pscustomobject][ordered]@{status='pass';events=$events.ToArray()}}
    if($Payload.outcome-cnotin@('owned','abandoned')){throw 'mutex_model_payload_invalid'}
    foreach($event in @('recovery','work','restore','journal-cleanup','finalize','mutex:release','mutex:dispose','aggregate')){$events.Add($event)}
    return [pscustomobject][ordered]@{status='pass';events=$events.ToArray()}
  }

  function Get-CleanupModel([object]$Payload) {
    Assert-ExactKeys $Payload @('failures') 'cleanup_model_payload_invalid';if($Payload.failures-isnot[array]){throw 'cleanup_model_payload_invalid'}
    $attempted=@('app-stop','metro-stop','package-restore','journal-cleanup','apk-recheck','content-check','temp-delete','evidence-finalize');$failed=@($attempted|Where-Object{$Payload.failures-ccontains$_})
    return [pscustomobject][ordered]@{status='pass';attempted=$attempted;cleanupPassed=($failed.Count-eq0);aggregateEmitted=($failed.Count-eq0);failures=$failed}
  }

  function Test-FocusedGateFacts([object]$Facts,[bool]$RequirePass,[string]$Code) {
    Assert-ExactKeys $Facts @('green','eslint','strictTs') $Code
    foreach($name in @('green','eslint','strictTs')){
      $record=Get-PropertyValue $Facts $name $Code
      Assert-ExactKeys $record @('status','exitCode','testSuites','tests') $Code
      if($record.status-isnot[string]-or$record.status-cnotin@('pass','fail')-or($record.exitCode-isnot[int]-and$record.exitCode-isnot[long])-or($record.testSuites-isnot[int]-and$record.testSuites-isnot[long])-or($record.tests-isnot[int]-and$record.tests-isnot[long])){throw $Code}
      if($RequirePass-and($record.status-cne'pass'-or$record.exitCode-ne0)){throw $Code}
      if($name-ceq'green'){if($record.testSuites-lt1-or$record.tests-lt1){throw $Code}}elseif($record.testSuites-ne0-or$record.tests-ne0){throw $Code}
    }
  }

  function Test-LiveGatePreflight([object]$Payload) {
    Assert-ExactKeys $Payload @('bundle','live') 'live_gate_payload_invalid'
    Test-FocusedGateFacts $Payload.bundle $true 'bundle_gate_invalid'
    Test-FocusedGateFacts $Payload.live $true 'live_gate_failed'
    foreach($name in @('green','eslint','strictTs')){if($Payload.bundle.$name.testSuites-ne$Payload.live.$name.testSuites-or$Payload.bundle.$name.tests-ne$Payload.live.$name.tests){throw 'live_gate_mismatch'}}
    return [pscustomobject][ordered]@{status='pass';validation='live_gate_preflight_valid'}
  }

  function Remove-TreeChecked([string]$Path,[string]$Code) {
    if([IO.Directory]::Exists($Path)){foreach($file in Get-ChildItem -LiteralPath $Path -Recurse -File){$file.Attributes=[IO.FileAttributes]::Normal};[IO.Directory]::Delete($Path,$true)}
    if([IO.Directory]::Exists($Path)){throw $Code}
  }

  function ConvertFrom-StrictJsonBytes([byte[]]$Bytes) {
    try{$text=[Text.UTF8Encoding]::new($false,$true).GetString($Bytes);$value=$text|ConvertFrom-Json}catch{throw 'package_transform_invalid'}
    if($null-eq$value-or$value.GetType().Name-cne'PSCustomObject'){throw 'package_transform_invalid'}
    return $value
  }

  function ConvertTo-DeterministicJson([object]$Value,[int]$Depth=0) {
    if($Depth-gt100){throw 'package_transform_invalid'}
    if($null-eq$Value){return 'null'}
    if($Value-is[string]-or$Value-is[bool]-or$Value-is[int]-or$Value-is[long]-or$Value-is[decimal]-or$Value-is[double]){
      if($Value-is[double]-and([double]::IsNaN($Value)-or[double]::IsInfinity($Value))){throw 'package_transform_invalid'}
      return ($Value|ConvertTo-Json -Compress)
    }
    if($Value-is[array]){
      if($Value.Count-eq0){return '[]'}
      $items=@($Value|ForEach-Object{(('  '*($Depth+1))+(ConvertTo-DeterministicJson $_ ($Depth+1)))})
      return "[`n$($items-join",`n")`n$('  '*$Depth)]"
    }
    if($Value.GetType().Name-cne'PSCustomObject'){throw 'package_transform_invalid'}
    $propertyNames=@(Get-OrdinalSortedStrings ([string[]]@($Value.PSObject.Properties.Name)))
    if($propertyNames.Count-eq0){return '{}'}
    $lines=@($propertyNames|ForEach-Object{
      $property=$Value.PSObject.Properties[$_]
      $encodedName=$property.Name|ConvertTo-Json -Compress
      ('  '*($Depth+1))+$encodedName+': '+(ConvertTo-DeterministicJson $property.Value ($Depth+1))
    })
    return "{`n$($lines-join",`n")`n$('  '*$Depth)}"
  }

  function Assert-PackageTransformTrees([object]$Original,[object]$Candidate) {
    if($Original.GetType().Name-cne'PSCustomObject'-or$Candidate.GetType().Name-cne'PSCustomObject'){throw 'package_transform_invalid'}
    $originalKeys=@(Get-OrdinalSortedStrings ([string[]]@($Original.PSObject.Properties.Name)));$candidateKeys=@(Get-OrdinalSortedStrings ([string[]]@($Candidate.PSObject.Properties.Name)))
    if(($originalKeys-join'|')-cne($candidateKeys-join'|')-or$originalKeys-cnotcontains'main'){throw 'package_transform_invalid'}
    if($Original.main-isnot[string]-or$Original.main-cne'index.js'-or$Candidate.main-isnot[string]-or$Candidate.main-cne'runtime-probes/android-account-sqlcipher/index.js'){throw 'package_transform_invalid'}
    foreach($key in $originalKeys){if($key-ceq'main'){continue};if((ConvertTo-DeterministicJson $Original.$key)-cne(ConvertTo-DeterministicJson $Candidate.$key)){throw 'package_transform_invalid'}}
  }

  function Get-PackageTransformBytes([byte[]]$OriginalBytes) {
    $original=ConvertFrom-StrictJsonBytes $OriginalBytes
    if($null-eq$original.PSObject.Properties['main']-or$original.main-isnot[string]-or$original.main-cne'index.js'){throw 'package_transform_invalid'}
    $properties=[ordered]@{}
    foreach($propertyName in @(Get-OrdinalSortedStrings ([string[]]@($original.PSObject.Properties.Name)))){$property=$original.PSObject.Properties[$propertyName];$properties[$property.Name]=if($property.Name-ceq'main'){'runtime-probes/android-account-sqlcipher/index.js'}else{$property.Value}}
    $candidate=[pscustomobject]$properties
    Assert-PackageTransformTrees $original $candidate
    $bytes=$script:Utf8NoBom.GetBytes((ConvertTo-DeterministicJson $candidate)+"`n")
    $reread=ConvertFrom-StrictJsonBytes $bytes
    Assert-PackageTransformTrees $original $reread
    return $bytes
  }

  function Invoke-LibraryPackageTransform([object]$Payload,[bool]$ValidateOnly) {
    if($ValidateOnly){Assert-ExactKeys $Payload @('originalBase64','candidateBase64') 'package_transform_payload_invalid'}else{Assert-ExactKeys $Payload @('originalBase64') 'package_transform_payload_invalid'}
    try{$originalBytes=[Convert]::FromBase64String($Payload.originalBase64)}catch{throw 'package_transform_payload_invalid'}
    if($ValidateOnly){
      try{$candidateBytes=[Convert]::FromBase64String($Payload.candidateBase64)}catch{throw 'package_transform_payload_invalid'}
      $original=ConvertFrom-StrictJsonBytes $originalBytes;$candidate=ConvertFrom-StrictJsonBytes $candidateBytes
      Assert-PackageTransformTrees $original $candidate
      if((Get-BytesSha256 $candidateBytes)-cne(Get-BytesSha256 (Get-PackageTransformBytes $originalBytes))){throw 'package_transform_invalid'}
      return [pscustomobject][ordered]@{status='pass';validation='package_transform_valid'}
    }
    $transformed=Get-PackageTransformBytes $originalBytes
    return [pscustomobject][ordered]@{status='pass';transformedBase64=[Convert]::ToBase64String($transformed);changedPaths=@('main')}
  }

  function Invoke-LibraryRecovery([object]$Payload) {
    Assert-ExactKeys $Payload @('repo','packagePath','recoveryPath','backupPath') 'package_recovery_payload_invalid'
    $context=Get-RecoveryContext $Payload.repo $Payload.packagePath $Payload.recoveryPath $Payload.backupPath
    $repoPrefix=$context.repo.TrimEnd('/')+'/'
    foreach($path in @($context.packagePath,$context.recoveryPath,$context.backupPath,$context.devTempPath,$context.restoreTempPath)){if(-not([IO.Path]::GetFullPath($path).Replace('\','/').StartsWith($repoPrefix,[StringComparison]::OrdinalIgnoreCase))){throw 'package_recovery_path_invalid'}}
    Recover-PackageAtStart $context
    return [pscustomobject][ordered]@{status='pass';validation='package_recovery_complete';artifactsCleared=$true}
  }

  function Invoke-LibraryRecoveryRace([object]$Payload) {
    Assert-ExactKeys $Payload @('repo','packagePath','recoveryPath','backupPath','injectConcurrentRestoreAfterCheck') 'package_recovery_payload_invalid'
    if($Payload.injectConcurrentRestoreAfterCheck-isnot[bool]){throw 'package_recovery_payload_invalid'}
    $context=Get-RecoveryContext $Payload.repo $Payload.packagePath $Payload.recoveryPath $Payload.backupPath
    $state=Read-PackageRecovery $context
    if($null-eq$state){throw 'package_recovery_value_invalid'}
    $callback=$null
    if($Payload.injectConcurrentRestoreAfterCheck){$callback={[IO.File]::WriteAllText($context.packagePath,"{`"name`":`"restore-concurrent-after-check`"}`n",[Text.UTF8Encoding]::new($false))}.GetNewClosure()}
    Restore-Package $state $context $callback
    return [pscustomobject][ordered]@{status='pass';validation='package_recovery_complete';artifactsCleared=$true}
  }

  function Invoke-LibraryPackageMutation([object]$Payload) {
    Assert-ExactKeys $Payload @('repo','packagePath','recoveryPath','backupPath','head','injectConcurrentChange','injectConcurrentAfterCheck') 'package_mutation_payload_invalid'
    if($Payload.injectConcurrentChange-isnot[bool]-or$Payload.injectConcurrentAfterCheck-isnot[bool]){throw 'package_mutation_payload_invalid'}
    $context=Get-RecoveryContext $Payload.repo $Payload.packagePath $Payload.recoveryPath $Payload.backupPath
    $callback=$null
    if($Payload.injectConcurrentChange){$callback={param($currentContext)[IO.File]::WriteAllText($currentContext.packagePath,"{`"name`":`"concurrent-change`"}`n",$script:Utf8NoBom)}}
    $atomicCallback=$null
    if($Payload.injectConcurrentAfterCheck){$atomicCallback={param($currentContext)[IO.File]::WriteAllText($currentContext.packagePath,"{`"name`":`"concurrent-after-check`"}`n",$script:Utf8NoBom)}}
    $journal=Prepare-PackageMutation $Payload.head $context $callback $atomicCallback
    return [pscustomobject][ordered]@{status='pass';validation='package_mutation_complete';originalSha256=$journal.originalSha256;devMutatedSha256=$journal.devMutatedSha256}
  }

  function Invoke-LibraryDeviceLifecycle([object]$Payload) {
    Assert-ExactKeys $Payload @('root','evidence','failAt') 'device_lifecycle_payload_invalid'
    if($Payload.failAt-cnotin@('preflight','gate','apk','emulator','sanitizer','persist','temp-delete')){throw 'device_lifecycle_payload_invalid'}
    $root=[IO.Path]::GetFullPath($Payload.root);$evidence=[IO.Path]::GetFullPath($Payload.evidence);$runId='0123456789abcdef0123456789abcdef'
    try{$resolved=Resolve-EvidenceTarget $root $evidence $true}catch{throw 'device_lifecycle_payload_invalid'}
    $attempted=[Collections.Generic.List[string]]::new();$failures=[Collections.Generic.List[string]]::new();$raw=Join-Path $root '.raw-current-run';$staging=Get-OwnedStagingPath $root $runId '.account-sqlcipher-stage-';$published=$false;$tempDeleted=$false
    try{
      Write-StagingOwner $root $runId $resolved.targetName '.account-sqlcipher-stage-'|Out-Null
      if($Payload.failAt-ceq'preflight'){throw 'injected'}
      [IO.Directory]::CreateDirectory($raw)|Out-Null;[IO.File]::WriteAllText((Join-Path $raw 'raw.log'),'raw')
      [IO.File]::WriteAllText((Join-Path $staging 'candidate.json'),'{}')
      foreach($step in @('gate','apk','emulator','sanitizer','persist')){if($Payload.failAt-ceq$step){throw 'injected'}}
    }catch{
      # The harness intentionally injects a pre-publication failure.
    }finally{
      foreach($step in @('app-stop','metro-stop','package-restore','journal-cleanup','apk-recheck','content-check','emulator-check')){$attempted.Add($step)}
      $attempted.Add('raw-delete');try{if($Payload.failAt-ceq'temp-delete'){throw 'temp_delete_failed'};Remove-TreeChecked $raw 'raw_delete_failed';$tempDeleted=$true}catch{$failures.Add($(if($Payload.failAt-ceq'temp-delete'){'temp_delete_failed'}else{'raw_delete_failed'}))}
      $attempted.Add('staging-delete');try{if(Test-Path -LiteralPath $staging){Remove-OwnedStaging $root $runId $resolved.targetName '.account-sqlcipher-stage-'}}catch{$failures.Add('staging_delete_failed')}
      $attempted.Add('evidence-finalize')
    }
    return [pscustomobject][ordered]@{status='pass';attempted=$attempted.ToArray();cleanupFailures=$failures.ToArray();published=$published;aggregateEmitted=$false;tempDeleted=$tempDeleted}
  }

  function Resolve-EvidenceTarget([string]$AuthorizedRoot,[string]$Target,[bool]$RequireAbsent=$true) {
    $rootPath=[IO.Path]::GetFullPath($AuthorizedRoot).TrimEnd('\')
    $targetPath=[IO.Path]::GetFullPath($Target).TrimEnd('\')
    $parent=[IO.Path]::GetDirectoryName($targetPath)
    if($targetPath-ceq$rootPath-or$parent-cne$rootPath-or$targetPath-ceq[IO.Path]::GetFullPath($script:Repo).TrimEnd('\')-or$targetPath-ceq[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')){throw 'evidence_target_invalid'}
    if(Test-Path -LiteralPath $rootPath){Assert-PathHasNoReparsePoint $rootPath 'evidence_target_invalid'}
    if($RequireAbsent-and(Test-Path -LiteralPath $targetPath)){throw 'evidence_target_invalid'}
    return [pscustomobject][ordered]@{root=$rootPath;target=$targetPath;targetName=[IO.Path]::GetFileName($targetPath)}
  }

  function Get-OwnedStagingPath([string]$AuthorizedRoot,[string]$RunId,[string]$Prefix) {
    if($RunId-cnotmatch'^[0-9a-f]{32}$'-or$Prefix-cnotin@('.account-sqlcipher-stage-','.account-sqlcipher-gate-')){throw 'evidence_owner_invalid'}
    return [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetFullPath($AuthorizedRoot).TrimEnd('\')) "$Prefix$RunId"))
  }

  function Assert-NoReparseTree([string]$Root,[string]$Code) {
    Assert-PathHasNoReparsePoint $Root $Code
    $pending=[Collections.Generic.Stack[string]]::new();$pending.Push([IO.Path]::GetFullPath($Root))
    while($pending.Count-gt0){$current=$pending.Pop();foreach($entry in [IO.Directory]::EnumerateFileSystemEntries($current,'*',[IO.SearchOption]::TopDirectoryOnly)){Assert-PathHasNoReparsePoint $entry $Code;if([IO.Directory]::Exists($entry)){$pending.Push($entry)}}}
  }

  function Write-StagingOwner([string]$AuthorizedRoot,[string]$RunId,[string]$TargetName,[string]$Prefix) {
    if([string]::IsNullOrWhiteSpace($TargetName)){throw 'evidence_owner_invalid'}
    $rootPath=[IO.Path]::GetFullPath($AuthorizedRoot).TrimEnd('\');Assert-PathHasNoReparsePoint $rootPath 'evidence_owner_invalid'
    $staging=Get-OwnedStagingPath $rootPath $RunId $Prefix
    if(Test-Path -LiteralPath $staging){throw 'evidence_owner_invalid'}
    [IO.Directory]::CreateDirectory($staging)|Out-Null
    Write-DurableJson (Join-Path $staging '.owner.json') ([pscustomobject][ordered]@{schemaVersion=1;runId=$RunId;targetName=$TargetName}) $false
    return $staging
  }

  function Assert-StagingOwner([string]$AuthorizedRoot,[string]$RunId,[string]$TargetName,[string]$Prefix) {
    $rootPath=[IO.Path]::GetFullPath($AuthorizedRoot).TrimEnd('\');$stagingPath=Get-OwnedStagingPath $rootPath $RunId $Prefix
    if(-not[IO.Directory]::Exists($stagingPath)){throw 'evidence_owner_invalid'}
    Assert-NoReparseTree $stagingPath 'evidence_owner_invalid'
    $owner=Read-JsonExact (Join-Path $stagingPath '.owner.json') @('schemaVersion','runId','targetName') 'evidence_owner_invalid'
    if($owner.schemaVersion-ne1-or$owner.runId-cne$RunId-or$owner.targetName-cne$TargetName){throw 'evidence_owner_invalid'}
    return $stagingPath
  }

  function Remove-OwnedStaging([string]$AuthorizedRoot,[string]$RunId,[string]$TargetName,[string]$Prefix) {
    $stagingPath=Assert-StagingOwner $AuthorizedRoot $RunId $TargetName $Prefix
    foreach($file in Get-ChildItem -LiteralPath $stagingPath -Recurse -File){$file.Attributes=[IO.FileAttributes]::Normal}
    [IO.Directory]::Delete($stagingPath,$true)
    if([IO.Directory]::Exists($stagingPath)){throw 'evidence_cleanup_failed'}
  }

  function Publish-OwnedStaging([string]$AuthorizedRoot,[string]$Target,[string]$RunId,[string]$Prefix) {
    $resolved=Resolve-EvidenceTarget $AuthorizedRoot $Target $true
    $stagingPath=Assert-StagingOwner $AuthorizedRoot $RunId $resolved.targetName $Prefix
    [IO.File]::Delete((Join-Path $stagingPath '.owner.json'))
    [IO.Directory]::Move($stagingPath,$resolved.target)
    return $resolved.target
  }

  function Invoke-LibraryEvidenceOwnership([object]$Payload) {
    Assert-ExactKeys $Payload @('authorizedRoot','target','runId','operation') 'evidence_target_invalid'
    if($Payload.operation-ceq'validate'){Resolve-EvidenceTarget $Payload.authorizedRoot $Payload.target $true|Out-Null;return [pscustomobject][ordered]@{status='pass';validation='evidence_target_valid'}}
    $resolved=Resolve-EvidenceTarget $Payload.authorizedRoot $Payload.target $true
    if($Payload.operation-ceq'create-staging'){
      Write-StagingOwner $resolved.root $Payload.runId $resolved.targetName '.account-sqlcipher-stage-'|Out-Null
      return [pscustomobject][ordered]@{status='pass';ownerMatched=$true}
    }
    if($Payload.operation-ceq'publish'){Publish-OwnedStaging $Payload.authorizedRoot $Payload.target $Payload.runId '.account-sqlcipher-stage-'|Out-Null;return [pscustomobject][ordered]@{status='pass';published=$true}}
    throw 'evidence_target_invalid'
  }

  function Invoke-LibraryGateStaging([object]$Payload) {
    Assert-ExactKeys $Payload @('root','finalPath','runId','failAt') 'gate_staging_payload_invalid'
    if($Payload.failAt-cnotin@('archive','cleanup','readonly','reread','none')){throw 'gate_staging_payload_invalid'}
    $rootPath=[IO.Path]::GetFullPath($Payload.root).TrimEnd('\');$final=[IO.Path]::GetFullPath($Payload.finalPath)
    if([IO.Path]::GetDirectoryName($final)-cne$rootPath-or(Test-Path -LiteralPath $final)){throw 'gate_staging_payload_invalid'}
    $staging=Write-StagingOwner $rootPath $Payload.runId ([IO.Path]::GetFileName($final)) '.account-sqlcipher-gate-';$published=$false;$cleanupPassed=$false;$moved=$false
    try{
      [IO.File]::WriteAllText((Join-Path $staging 'candidate.zip'),'candidate',$script:Utf8NoBom)
      if($Payload.failAt-ceq'archive'){throw 'injected'}
      if($Payload.failAt-ceq'cleanup'){throw 'injected'}
      [IO.File]::Delete((Join-Path $staging '.owner.json'))
      [IO.File]::Move((Join-Path $staging 'candidate.zip'),$final)
      [IO.Directory]::Delete($staging)
      $moved=$true
      if($Payload.failAt-ceq'readonly'){throw 'injected'}
      (Get-Item -LiteralPath $final).IsReadOnly=$true
      if($Payload.failAt-ceq'reread'){throw 'injected'}
      $published=$true;$cleanupPassed=$true
    }catch{
      if($moved-and(Test-Path -LiteralPath $final)){(Get-Item -LiteralPath $final).IsReadOnly=$false;[IO.File]::Delete($final)}
      if(Test-Path -LiteralPath $staging){Remove-OwnedStaging $rootPath $Payload.runId ([IO.Path]::GetFileName($final)) '.account-sqlcipher-gate-'}
      $cleanupPassed=$true
    }
    return [pscustomobject][ordered]@{status='pass';published=$published;cleanupPassed=$cleanupPassed}
  }

  function Get-MetroOwnershipModel([object]$Payload) {
    Assert-ExactKeys $Payload @('startedPid','startedUtc','executablePath','hasExited','currentPid','currentStartedUtc','currentExecutablePath') 'metro_model_payload_invalid'
    $startupAccepted=($Payload.hasExited-is[bool]-and-not$Payload.hasExited)
    $cleanupAccepted=$startupAccepted-and$Payload.startedPid-eq$Payload.currentPid-and$Payload.startedUtc-ceq$Payload.currentStartedUtc-and([IO.Path]::GetFullPath($Payload.executablePath)-ceq[IO.Path]::GetFullPath($Payload.currentExecutablePath))
    return [pscustomobject][ordered]@{status='pass';startupAccepted=$startupAccepted;cleanupAccepted=$cleanupAccepted;stopAttempted=$cleanupAccepted}
  }

  function Start-OwnedProcessChecked([string]$Executable,[string[]]$Arguments,[string]$WorkingDirectory,[string]$StdoutPath,[string]$StderrPath) {
    $canonicalExecutable=[IO.Path]::GetFullPath($Executable)
    $process=Start-Process -FilePath $canonicalExecutable -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -RedirectStandardOutput $StdoutPath -RedirectStandardError $StderrPath -WindowStyle Hidden -PassThru
    if($process.WaitForExit(2000)-or$process.HasExited){throw 'metro_early_exit'}
    $current=[Diagnostics.Process]::GetProcessById($process.Id)
    $currentExecutable=[IO.Path]::GetFullPath($current.MainModule.FileName)
    if($currentExecutable-cne$canonicalExecutable){throw 'metro_executable_mismatch'}
    return [pscustomobject][ordered]@{process=$process;pid=$process.Id;startedUtc=$process.StartTime.ToUniversalTime().ToString('O');executablePath=$canonicalExecutable}
  }

  function Wait-OwnedMetroReady([object]$Owned) {
    $deadline=[DateTime]::UtcNow.AddSeconds(60)
    while([DateTime]::UtcNow-lt$deadline){
      try{$current=[Diagnostics.Process]::GetProcessById($Owned.pid)}catch{throw 'metro_early_exit'}
      $currentExecutable=[IO.Path]::GetFullPath($current.MainModule.FileName);$currentStarted=$current.StartTime.ToUniversalTime().ToString('O')
      if($current.Id-ne$Owned.pid-or$currentStarted-cne$Owned.startedUtc-or$currentExecutable-cne$Owned.executablePath-or$current.HasExited){throw 'metro_identity_mismatch'}
      $client=[Net.Sockets.TcpClient]::new()
      try{$connect=$client.ConnectAsync([Net.IPAddress]::Loopback,8081);if($connect.Wait(1000)-and$client.Connected){return}}catch{}finally{$client.Dispose()}
      Start-Sleep -Milliseconds 250
    }
    throw 'metro_readiness_timeout'
  }

  function Start-OwnedAdbReverse([string]$DeviceSerial) {
    $portPattern='(^|\s)tcp:8081\s+'
    $targetPattern='(^|\s)tcp:8081\s+tcp:8081$'
    $before=@(Invoke-NativeChecked 'adbReverseListBefore' 'adb' @('-s',$DeviceSerial,'reverse','--list'))
    if(@($before|Where-Object{$_-match$portPattern}).Count-ne0){throw 'adb_reverse_preexisting'}
    $added=$false
    try{
      Invoke-NativeChecked 'adbReverseAdd' 'adb' @('-s',$DeviceSerial,'reverse','tcp:8081','tcp:8081')|Out-Null;$added=$true
      $after=@(Invoke-NativeChecked 'adbReverseListAfterAdd' 'adb' @('-s',$DeviceSerial,'reverse','--list'))
      if(@($after|Where-Object{$_-match$targetPattern}).Count-ne1-or@($after|Where-Object{$_-match$portPattern}).Count-ne1){throw 'adb_reverse_add_invalid'}
    }catch{
      if($added){try{Invoke-NativeChecked 'adbReverseRollback' 'adb' @('-s',$DeviceSerial,'reverse','--remove','tcp:8081')|Out-Null}catch{}}
      throw
    }
  }

  function Stop-OwnedAdbReverse([string]$DeviceSerial) {
    Invoke-NativeChecked 'adbReverseRemove' 'adb' @('-s',$DeviceSerial,'reverse','--remove','tcp:8081')|Out-Null
    $after=@(Invoke-NativeChecked 'adbReverseListAfterRemove' 'adb' @('-s',$DeviceSerial,'reverse','--list'))
    if(@($after|Where-Object{$_-match'(^|\s)tcp:8081\s+'}).Count-ne0){throw 'adb_reverse_remove_invalid'}
  }

  function Stop-OwnedProcessChecked([object]$Owned) {
    if($null-eq$Owned){return}
    try{$current=[Diagnostics.Process]::GetProcessById($Owned.pid)}catch{throw 'metro_identity_mismatch'}
    $currentExecutable=[IO.Path]::GetFullPath($current.MainModule.FileName);$currentStarted=$current.StartTime.ToUniversalTime().ToString('O')
    if($current.Id-ne$Owned.pid-or$currentStarted-cne$Owned.startedUtc-or$currentExecutable-cne$Owned.executablePath){throw 'metro_identity_mismatch'}
    $current.Kill();$current.WaitForExit()
  }

  function Assert-NoRunnerOverride {
    if(Test-Path Env:ACCOUNT_SQLCIPHER_RUNNER_OVERRIDE_PATH){throw 'runner_override_forbidden'}
    return [pscustomobject][ordered]@{status='pass';validation='runner_override_absent'}
  }

  function Invoke-FocusedGateSet([string]$Directory,[string]$Label) {
    Assert-NoRunnerOverride|Out-Null
    [IO.Directory]::CreateDirectory($Directory)|Out-Null
    $oldNodePresent=Test-Path Env:NODE_OPTIONS;$oldNode=$env:NODE_OPTIONS
    $oldConfigPresent=Test-Path Env:ACCOUNT_SQLCIPHER_JEST_CONFIG;$oldConfig=$env:ACCOUNT_SQLCIPHER_JEST_CONFIG
    $oldCommandPresent=Test-Path Env:ACCOUNT_SQLCIPHER_GREEN_COMMAND;$oldCommand=$env:ACCOUNT_SQLCIPHER_GREEN_COMMAND
    $savedErrorPreference=$ErrorActionPreference
    try{
      $env:NODE_OPTIONS='--max-old-space-size=512'
      $env:ACCOUNT_SQLCIPHER_JEST_CONFIG='{"rootDir":"C:/appsprojects/phraseman","testEnvironment":"node","roots":["<rootDir>/tests"],"setupFilesAfterEnv":["<rootDir>/tests/setup_jest_write_guard.js"],"modulePathIgnorePatterns":["<rootDir>/.claude/","<rootDir>/.codex-tmp/","<rootDir>/.worktrees/","<rootDir>/_archive/","<rootDir>/tmp/"],"testPathIgnorePatterns":["<rootDir>/.claude/","<rootDir>/.codex-tmp/","<rootDir>/.worktrees/","<rootDir>/_archive/","<rootDir>/tmp/"],"transform":{"^.+\\.tsx?$":["ts-jest",{"isolatedModules":true,"tsconfig":{"strict":true,"esModuleInterop":true,"isolatedModules":true,"module":"commonjs","target":"ES2022"}}]},"forceExit":true,"maxWorkers":1}'
      $env:ACCOUNT_SQLCIPHER_GREEN_COMMAND="bash .claude/semaphore/slot.sh acquire `"account sqlcipher $Label`" || exit 75; trap `"bash .claude/semaphore/slot.sh release`" EXIT; node node_modules/jest/bin/jest.js --config=`"`$ACCOUNT_SQLCIPHER_JEST_CONFIG`" --runTestsByPath tests/account_sqlcipher_android_runtime_probe.test.ts tests/account_sqlcipher_android_runtime_entrypoint.test.ts --no-cache --runInBand --watchman=false"
      $greenLog=Join-Path $Directory 'green.log';$ErrorActionPreference='Continue';& 'C:\Program Files\Git\bin\bash.exe' -lc 'eval "$ACCOUNT_SQLCIPHER_GREEN_COMMAND"' *> $greenLog;$greenCode=$LASTEXITCODE;$ErrorActionPreference=$savedErrorPreference
      if($greenCode-ne0){throw 'green_gate_failed'};$counts=Get-JestCounts $greenLog;$green=New-GateRecord 'green' $greenCode $greenLog $counts[0] $counts[1]
      $eslintLog=Join-Path $Directory 'eslint.log';$ErrorActionPreference='Continue';& node node_modules/eslint/bin/eslint.js runtime-probes/android-account-sqlcipher/probe.ts runtime-probes/android-account-sqlcipher/index.js tests/account_sqlcipher_android_runtime_probe.test.ts tests/account_sqlcipher_android_runtime_entrypoint.test.ts *> $eslintLog;$eslintCode=$LASTEXITCODE;$ErrorActionPreference=$savedErrorPreference
      if($eslintCode-ne0){throw 'eslint_gate_failed'};$eslint=New-GateRecord 'eslint' $eslintCode $eslintLog 0 0
      $strictLog=Join-Path $Directory 'strict-ts.log';$ErrorActionPreference='Continue';& node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module commonjs --moduleResolution node --esModuleInterop runtime-probes/android-account-sqlcipher/probe.ts tests/account_sqlcipher_android_runtime_probe.test.ts tests/account_sqlcipher_android_runtime_entrypoint.test.ts *> $strictLog;$strictCode=$LASTEXITCODE;$ErrorActionPreference=$savedErrorPreference
      if($strictCode-ne0){throw 'strictTs_gate_failed'};$strictTs=New-GateRecord 'strictTs' $strictCode $strictLog 0 0
      return [pscustomobject][ordered]@{green=[pscustomobject]$green;eslint=[pscustomobject]$eslint;strictTs=[pscustomobject]$strictTs}
    }finally{
      $ErrorActionPreference=$savedErrorPreference
      if($oldNodePresent){$env:NODE_OPTIONS=$oldNode}else{Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue}
      if($oldConfigPresent){$env:ACCOUNT_SQLCIPHER_JEST_CONFIG=$oldConfig}else{Remove-Item Env:ACCOUNT_SQLCIPHER_JEST_CONFIG -ErrorAction SilentlyContinue}
      if($oldCommandPresent){$env:ACCOUNT_SQLCIPHER_GREEN_COMMAND=$oldCommand}else{Remove-Item Env:ACCOUNT_SQLCIPHER_GREEN_COMMAND -ErrorAction SilentlyContinue}
    }
  }

  function Convert-GateRecordsToFocusedFacts([object]$Records) {
    return [pscustomobject][ordered]@{
      green=[pscustomobject][ordered]@{status=$Records.green.status;exitCode=$Records.green.exitCode;testSuites=$Records.green.testSuites;tests=$Records.green.tests}
      eslint=[pscustomobject][ordered]@{status=$Records.eslint.status;exitCode=$Records.eslint.exitCode;testSuites=$Records.eslint.testSuites;tests=$Records.eslint.tests}
      strictTs=[pscustomobject][ordered]@{status=$Records.strictTs.status;exitCode=$Records.strictTs.exitCode;testSuites=$Records.strictTs.testSuites;tests=$Records.strictTs.tests}
    }
  }

  function Invoke-BuildGateBundle {
    if ($PSCmdlet.ParameterSetName -ne 'Build') { throw 'build_mode_binding_invalid' }
    if (Test-Path -LiteralPath $GateBundlePath) { throw 'gate_bundle_exists' }
    Assert-Baseline $PreEditBaselinePath $PreEditBaselineSha256|Out-Null
    Assert-Packet $PacketPath $PacketSha256|Out-Null
    foreach ($path in $script:FivePaths) {
      if (-not (Test-Path -LiteralPath (Join-Path $script:Repo $path) -PathType Leaf)) { throw 'exact_five_missing' }
    }
    $sourceBinding=$null;$redBinding=$null;$nativeHashes=$null
    $runId=[Guid]::NewGuid().ToString('N')
    $finalPath=[IO.Path]::GetFullPath($GateBundlePath);$parent=[IO.Path]::GetDirectoryName($finalPath)
    $stagingRoot=Join-Path $parent ".account-sqlcipher-gate-$runId"
    if(Test-Path -LiteralPath $stagingRoot){throw 'gate_staging_exists'}
    Write-StagingOwner $parent $runId ([IO.Path]::GetFileName($finalPath)) '.account-sqlcipher-gate-'|Out-Null
    $published=$false;$candidateHash=$null
    try {
      $redBinding=Open-RedEvidenceBinding $RedReceiptPath $RedReceiptSha256
      $sourceBinding=Open-SourceBindings $script:Repo ([string[]]$script:FivePaths)
      $nativeHashes=Get-NativeInputHashes
      $focusedRoot=Join-Path $stagingRoot 'focused'
      $focused=Invoke-FocusedGateSet $focusedRoot 'GREEN'
      $green=$focused.green;$eslint=$focused.eslint;$strictTs=$focused.strictTs

      $stage = Join-Path $stagingRoot 'entries'
      [IO.Directory]::CreateDirectory($stage) | Out-Null
      Write-DurableBytes (Join-Path $stage 'red.json') $redBinding.receiptBytes
      Write-DurableJson (Join-Path $stage 'green.json') $green $false
      Write-DurableJson (Join-Path $stage 'eslint.json') $eslint $false
      Write-DurableJson (Join-Path $stage 'strictTs.json') $strictTs $false
      $allowlistedHashes = $sourceBinding.hashes
      $sourceFingerprint=Get-SourceFingerprint $allowlistedHashes
      $gateHashes = [ordered]@{
        red = Get-Sha256 (Join-Path $stage 'red.json')
        green = Get-Sha256 (Join-Path $stage 'green.json')
        eslint = Get-Sha256 (Join-Path $stage 'eslint.json')
        strictTs = Get-Sha256 (Join-Path $stage 'strictTs.json')
      }
      $manifest = [ordered]@{
        schemaVersion = 1
        baselineSha256 = $PreEditBaselineSha256
        packetSpecSha256 = $PacketSha256
        exactFiveCreated = $true
        allowlistedFileHashes = $allowlistedHashes
        gateArtifactHashes = [pscustomobject]$gateHashes
        nativeInputHashes = $nativeHashes
        sourceFingerprintSha256 = $sourceFingerprint
      }
      Write-DurableJson (Join-Path $stage 'gate-manifest.json') $manifest $false
      foreach ($name in @('red.json','green.json','eslint.json','strictTs.json','gate-manifest.json')) {
        Assert-SanitizedArtifact (Join-Path $stage $name)
      }
      $candidate=Join-Path $stagingRoot 'candidate.zip'
      Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $candidate -CompressionLevel Optimal
      $candidateHash=Get-Sha256 $candidate
      Add-Type -AssemblyName System.IO.Compression.FileSystem
      $archive=[IO.Compression.ZipFile]::OpenRead($candidate)
      try{Assert-GateArchiveNames ([pscustomobject][ordered]@{fullNames=@($archive.Entries|ForEach-Object FullName)})|Out-Null}finally{$archive.Dispose()}
      $inspection=Join-Path $stagingRoot 'inspection'
      $entries=[ordered]@{};foreach($name in @('red.json','green.json','eslint.json','strictTs.json','gate-manifest.json')){$entries[$name]=Get-Content -LiteralPath (Join-Path $stage $name) -Raw}
      $expected=[pscustomobject][ordered]@{baselineSha256=$PreEditBaselineSha256;packetSpecSha256=$PacketSha256;testFileHashes=[pscustomobject][ordered]@{probe=Get-PropertyValue $allowlistedHashes 'tests/account_sqlcipher_android_runtime_probe.test.ts' 'source_hash_schema_invalid';entrypoint=Get-PropertyValue $allowlistedHashes 'tests/account_sqlcipher_android_runtime_entrypoint.test.ts' 'source_hash_schema_invalid'};allowlistedFileHashes=$allowlistedHashes;nativeInputHashes=$nativeHashes;sourceFingerprintSha256=$sourceFingerprint}
      Test-GateRecordSet ([pscustomobject][ordered]@{entries=[pscustomobject]$entries;expected=$expected})|Out-Null
      Remove-TreeChecked $focusedRoot 'gate_focused_cleanup_failed'
      Remove-TreeChecked $stage 'gate_entry_cleanup_failed'
      if(Test-Path -LiteralPath $inspection){Remove-TreeChecked $inspection 'gate_inspection_cleanup_failed'}
      $remaining=@(Get-ChildItem -LiteralPath $stagingRoot -File|ForEach-Object Name|Sort-Object)
      if(($remaining-join'|')-cne'.owner.json|candidate.zip'){throw 'gate_staging_cleanup_failed'}
      if(Test-Path -LiteralPath $finalPath){throw 'gate_bundle_exists'}
      [IO.File]::Move($candidate,$finalPath)
      [IO.File]::Delete((Join-Path $stagingRoot '.owner.json'))
      [IO.Directory]::Delete($stagingRoot)
      (Get-Item -LiteralPath $finalPath).IsReadOnly = $true
      if (-not (Get-Item -LiteralPath $finalPath).IsReadOnly) { throw 'gate_bundle_publish_failed' }
      $reread=Join-Path $parent ".account-sqlcipher-gate-reread-$runId"
      try{Expand-AndValidateGateBundle $finalPath (Get-Sha256 $finalPath) $reread $true|Out-Null}finally{if(Test-Path -LiteralPath $reread){Remove-TreeChecked $reread 'gate_reread_cleanup_failed'}}
      $published=$true
      [Console]::Out.WriteLine((Get-Sha256 $finalPath))
    } finally {
      if(-not$published-and(Test-Path -LiteralPath $finalPath)-and$null-ne$candidateHash-and(Get-Sha256 $finalPath)-ceq$candidateHash){(Get-Item -LiteralPath $finalPath).IsReadOnly=$false;[IO.File]::Delete($finalPath)}
      if(-not$published-and(Test-Path -LiteralPath $stagingRoot)){
        if(-not(Test-Path -LiteralPath (Join-Path $stagingRoot '.owner.json'))){Assert-NoReparseTree $stagingRoot 'gate_staging_cleanup_failed';Remove-TreeChecked $stagingRoot 'gate_staging_cleanup_failed'}else{Remove-OwnedStaging $parent $runId ([IO.Path]::GetFileName($finalPath)) '.account-sqlcipher-gate-'}
      }
      if(-not$published-and(Test-Path -LiteralPath $finalPath)){throw 'gate_failure_published_final'}
      try{Close-SourceBindings $sourceBinding}finally{Close-RedEvidenceBinding $redBinding}
    }
  }

  function Expand-AndValidateGateBundle([string]$Path, [string]$ExpectedHash, [string]$Destination,[bool]$RequireReadOnly=$true) {
    if(Test-Path -LiteralPath $Destination){throw 'gate_bundle_destination_exists'}
    $source=[IO.File]::Open($Path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
    try{
      if($RequireReadOnly-and-not(Get-Item -LiteralPath $Path).IsReadOnly){throw 'gate_bundle_not_read_only'}
      if((Get-StreamSha256 $source)-cne$ExpectedHash){throw 'gate_bundle_hash_invalid'}
      [IO.Directory]::CreateDirectory($Destination)|Out-Null
      $ownedArchive=Join-Path $Destination '.validated-owned-bundle.zip'
      $copy=[IO.File]::Open($ownedArchive,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
      try{$source.Position=0;$source.CopyTo($copy);$copy.Flush($true)}finally{$copy.Dispose()}
    }finally{$source.Dispose()}
    if((Get-Sha256 $ownedArchive)-cne$ExpectedHash){throw 'gate_bundle_hash_invalid'}
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $ownedStream=[IO.File]::Open($ownedArchive,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None)
    try{
      $archive=[IO.Compression.ZipArchive]::new($ownedStream,[IO.Compression.ZipArchiveMode]::Read,$true)
      try{
        Assert-GateArchiveNames ([pscustomobject][ordered]@{fullNames=@($archive.Entries|ForEach-Object FullName)})|Out-Null
        foreach($entry in $archive.Entries){
          $output=Join-Path $Destination $entry.FullName
          $input=$entry.Open();$writer=[IO.File]::Open($output,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
          try{$input.CopyTo($writer);$writer.Flush($true)}finally{$writer.Dispose();$input.Dispose()}
        }
      }finally{$archive.Dispose()}
    }finally{$ownedStream.Dispose()}
    [IO.File]::Delete($ownedArchive)
    if(Test-Path -LiteralPath $ownedArchive){throw 'gate_bundle_owned_copy_cleanup_failed'}
    $recursiveDirectories=@(Get-ChildItem -LiteralPath $Destination -Recurse -Directory)
    if($recursiveDirectories.Count-ne0){throw 'gate_bundle_recursive_entries_invalid'}
    $actual = @(Get-OrdinalSortedStrings ([string[]]@(Get-ChildItem -LiteralPath $Destination -Recurse -File | ForEach-Object{$_.FullName.Substring(([IO.Path]::GetFullPath($Destination).TrimEnd('\')+'\').Length).Replace('\','/')})))
    $expected = @('eslint.json','gate-manifest.json','green.json','red.json','strictTs.json')
    if (($actual -join '|') -cne ($expected -join '|')) { throw 'gate_bundle_recursive_entries_invalid' }
    foreach ($name in $expected) { Assert-SanitizedArtifact (Join-Path $Destination $name) }
    $entries = [ordered]@{}
    foreach ($name in @('red.json','green.json','eslint.json','strictTs.json','gate-manifest.json')) { $entries[$name] = Get-Content -LiteralPath (Join-Path $Destination $name) -Raw }
    $testHashes = [ordered]@{probe=Get-Sha256 (Join-Path $script:Repo 'tests/account_sqlcipher_android_runtime_probe.test.ts');entrypoint=Get-Sha256 (Join-Path $script:Repo 'tests/account_sqlcipher_android_runtime_entrypoint.test.ts')}
    $allowlistedHashes = Get-AllowlistedFileHashes
    $sourceFingerprint=Get-SourceFingerprint $allowlistedHashes
    $currentNative = Get-NativeInputHashes
    $validationPayload = [pscustomobject][ordered]@{
      entries=[pscustomobject]$entries
      expected=[pscustomobject][ordered]@{baselineSha256=$PreEditBaselineSha256;packetSpecSha256=$PacketSha256;testFileHashes=[pscustomobject]$testHashes;allowlistedFileHashes=$allowlistedHashes;nativeInputHashes=$currentNative;sourceFingerprintSha256=$sourceFingerprint}
    }
    return Test-GateRecordSet $validationPayload
  }

  function Get-InstalledApkObservation([string]$Checkpoint,[string]$ApprovedSha256,[string]$ApprovedPathSha256='') {
    if($Checkpoint-cnotin@('beforeLaunch','afterPid','afterMarker','final','cleanup')){throw 'installed_apk_continuity_invalid'}
    $script:ApkNativeCommandSequence+=1;$pmSequence=$script:ApkNativeCommandSequence
    $pm=@(Invoke-NativeChecked "apkPath_$Checkpoint" 'adb' @('-s',$Serial,'shell','pm','path','app.phraseman'))
    if($pm.Count-ne1){throw 'installed_apk_path_invalid'}
    $pathMatch=[regex]::Match($pm[0],'^package:(/data/app/[A-Za-z0-9._=+~/-]+/base\.apk)$');if(-not$pathMatch.Success){throw 'installed_apk_path_invalid'}
    $path=$pathMatch.Groups[1].Value;$pathSha256=Get-StringSha256 $path
    if($ApprovedPathSha256-ne''-and$pathSha256-cne$ApprovedPathSha256){throw 'installed_apk_continuity_invalid'}
    $script:ApkNativeCommandSequence+=1;$shaSequence=$script:ApkNativeCommandSequence
    $shaLines=@(Invoke-NativeChecked "apkHash_$Checkpoint" 'adb' @('-s',$Serial,'shell','toybox','sha256sum',$path));if($shaLines.Count-ne1){throw 'installed_apk_hash_mismatch'}
    $shaMatch=[regex]::Match($shaLines[0],'^([0-9a-f]{64})\s+'+[regex]::Escape($path)+'$')
    if(-not$shaMatch.Success-or$shaMatch.Groups[1].Value-cne$ApprovedSha256){throw 'installed_apk_continuity_invalid'}
    return [pscustomobject][ordered]@{path=$path;evidence=[pscustomobject][ordered]@{checkpoint=$Checkpoint;observedUtc=[DateTime]::UtcNow.ToString('O');pmPathCommandSequence=$pmSequence;sha256CommandSequence=$shaSequence;baseApkPathSha256=$pathSha256;sha256=$shaMatch.Groups[1].Value}}
  }

  function Get-ContentManifestFacts {
    $gitExecutable=[IO.Path]::GetFullPath((Get-Command git -ErrorAction Stop).Source)
    $startInfo=[Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName=$gitExecutable
    $startInfo.Arguments='-C "C:\appsprojects\phraseman" -c core.quotepath=false status --porcelain=v1 -z -uall'
    $startInfo.UseShellExecute=$false;$startInfo.CreateNoWindow=$true;$startInfo.RedirectStandardOutput=$true;$startInfo.RedirectStandardError=$true
    $process=[Diagnostics.Process]::new();$process.StartInfo=$startInfo;$memory=[IO.MemoryStream]::new()
    try{
      if(-not$process.Start()){throw 'content_status_start_failed'}
      $process.StandardOutput.BaseStream.CopyTo($memory);$stderr=$process.StandardError.ReadToEnd();$process.WaitForExit()
      if($process.ExitCode-ne0){throw 'content_status_command_failed'}
      try{$statusText=[Text.UTF8Encoding]::new($false,$true).GetString($memory.ToArray())}catch{throw 'content_status_utf8_invalid'}
    }finally{$memory.Dispose();$process.Dispose()}
    $fields=$statusText.Split([char]0)
    $records = [Collections.Generic.List[string]]::new()
    [long]$bytes = 0
    for($index=0;$index-lt$fields.Length;$index+=1){
      $entry=$fields[$index]
      if($entry.Length-eq0){if($index-ne$fields.Length-1){throw 'content_status_record_invalid'};break}
      if($entry.Length-lt4-or$entry[2]-ne' '){throw 'content_status_record_invalid'}
      $status=$entry.Substring(0,2);$path=$entry.Substring(3).Replace('\','/')
      if($status.Contains('R')-or$status.Contains('C')){$index+=1;if($index-ge$fields.Length-or$fields[$index].Length-eq0){throw 'content_status_record_invalid'}}
      if ($script:FivePaths -contains $path) { continue }
      $full = Join-Path $script:Repo $path
      $kind = 'missing'; [long]$length = 0; $sha = ('0' * 64)
      if (Test-Path -LiteralPath $full -PathType Leaf) {
        $kind = 'file'; $length = (Get-Item -LiteralPath $full).Length; $sha = Get-Sha256 $full; $bytes += $length
      } elseif (Test-Path -LiteralPath $full -PathType Container) {
        $kind = 'directory'
      }
      $record = [ordered]@{status=$status;path=$path;kind=$kind;length=$length;sha256=$sha}
      $records.Add(($record | ConvertTo-Json -Compress))
    }
    $canonical = if ($records.Count -eq 0) { '' } else { ($records -join "`n") + "`n" }
    $hash = Get-StringSha256 $canonical
    return [pscustomobject]@{recordCount=$records.Count;byteCount=$bytes;manifestSha256=$hash}
  }

  function Get-RecoveryContext([string]$Repo=$script:Repo,[string]$PackagePath=(Join-Path $script:Repo 'package.json'),[string]$RecoveryPath=$script:RecoveryPath,[string]$BackupPath=$script:BackupPath) {
    foreach($value in @($Repo,$PackagePath,$RecoveryPath,$BackupPath)){if([string]::IsNullOrWhiteSpace($value)){throw 'package_recovery_path_invalid'}}
    $fullPackage=[IO.Path]::GetFullPath($PackagePath);$fullRecovery=[IO.Path]::GetFullPath($RecoveryPath);$fullBackup=[IO.Path]::GetFullPath($BackupPath)
    if($fullRecovery-ceq$fullBackup-or$fullPackage-ceq$fullRecovery-or$fullPackage-ceq$fullBackup){throw 'package_recovery_path_invalid'}
    return [pscustomobject][ordered]@{repo=[IO.Path]::GetFullPath($Repo).TrimEnd('\').Replace('\','/');packagePath=$fullPackage;recoveryPath=$fullRecovery;journalTempPath="$fullRecovery.tmp";backupPath=$fullBackup;devTempPath="$fullPackage.account-sqlcipher-dev.tmp";restoreTempPath="$fullPackage.account-sqlcipher-restore.tmp"}
  }

  function Remove-ValidatedRecoveryArtifacts([object]$Context,[string[]]$Paths) {
    foreach($path in $Paths){if(Test-Path -LiteralPath $path -PathType Leaf){[IO.File]::Delete($path)}}
    foreach($path in $Paths){if(Test-Path -LiteralPath $path){throw 'package_recovery_cleanup_failed'}}
  }

  function Get-UnexpectedRecoveryTemps([object]$Context) {
    $directory=[IO.Path]::GetDirectoryName($Context.packagePath);$name=[IO.Path]::GetFileName($Context.packagePath)
    $unexpected=[Collections.Generic.List[string]]::new()
    foreach($candidate in [IO.Directory]::EnumerateFiles($directory,"$name.account-sqlcipher-*.tmp",[IO.SearchOption]::TopDirectoryOnly)){
      if($candidate-cne$Context.devTempPath-and$candidate-cne$Context.restoreTempPath){$unexpected.Add($candidate)}
    }
    $journalDirectory=[IO.Path]::GetDirectoryName($Context.recoveryPath);$journalName=[IO.Path]::GetFileName($Context.recoveryPath)
    foreach($candidate in [IO.Directory]::EnumerateFiles($journalDirectory,"$journalName.*.tmp",[IO.SearchOption]::TopDirectoryOnly)){
      if($candidate-cne$Context.journalTempPath){$unexpected.Add($candidate)}
    }
    return $unexpected.ToArray()
  }

  function Read-RecoveryJournalFile([string]$Path,[object]$Context) {
    $journal=Read-JsonExact $Path @('schemaVersion','repo','head','originalSha256','devMutatedSha256','backupPath','backupSha256','stage') 'package_recovery_schema_invalid'
    foreach($name in @('originalSha256','devMutatedSha256','backupSha256')){Assert-LowerSha (Get-PropertyValue $journal $name 'package_recovery_schema_invalid') 'package_recovery_value_invalid'}
    if($journal.schemaVersion-ne1-or$journal.repo-cne$Context.repo-or[IO.Path]::GetFullPath($journal.backupPath)-cne$Context.backupPath-or@('prepared','mutated','restoring')-cnotcontains$journal.stage-or$journal.backupSha256-cne$journal.originalSha256){throw 'package_recovery_value_invalid'}
    return $journal
  }

  function Test-RecoveryJournalImmutableEqual([object]$Left,[object]$Right) {
    foreach($name in @('schemaVersion','repo','head','originalSha256','devMutatedSha256','backupPath','backupSha256')){if($Left.$name-cne$Right.$name){return $false}}
    return $true
  }

  function Write-DurableRecoveryJournal([object]$Context,[object]$Journal) {
    if(Test-Path -LiteralPath $Context.journalTempPath){throw 'package_recovery_journal_temp_exists'}
    $bytes=$script:Utf8NoBom.GetBytes(($Journal|ConvertTo-Json -Depth 10 -Compress))
    Write-DurableBytes $Context.journalTempPath $bytes
    $reread=Read-RecoveryJournalFile $Context.journalTempPath $Context
    if(-not(Test-RecoveryJournalImmutableEqual $Journal $reread)-or$Journal.stage-cne$reread.stage){throw 'package_recovery_journal_temp_invalid'}
    Move-ReplaceFile $Context.journalTempPath $Context.recoveryPath
  }

  function Get-ValidatedRecoveryState([object]$Context) {
    $unexpected=@(Get-UnexpectedRecoveryTemps $Context);if($unexpected.Count-ne0){throw 'package_recovery_orphan_artifact'}
    $journalExists=Test-Path -LiteralPath $Context.recoveryPath -PathType Leaf;$tempExists=Test-Path -LiteralPath $Context.journalTempPath -PathType Leaf
    if(-not$journalExists-and-not$tempExists){
      foreach($artifact in @($Context.backupPath,$Context.devTempPath,$Context.restoreTempPath)){if(Test-Path -LiteralPath $artifact){throw 'package_recovery_orphan_artifact'}}
      try{$cleanBytes=[IO.File]::ReadAllBytes($Context.packagePath);$cleanTree=ConvertFrom-StrictJsonBytes $cleanBytes}catch{throw 'package_recovery_unclean_package'}
      if($null-eq$cleanTree.PSObject.Properties['main']-or$cleanTree.main-isnot[string]-or$cleanTree.main-cne'index.js'){throw 'package_recovery_unclean_package'}
      return $null
    }
    $journal=if($journalExists){Read-RecoveryJournalFile $Context.recoveryPath $Context}else{$null}
    $tempJournal=if($tempExists){Read-RecoveryJournalFile $Context.journalTempPath $Context}else{$null}
    $normalized=if($null-ne$tempJournal){$tempJournal}else{$journal}
    if($null-ne$journal-and$null-ne$tempJournal){
      if(-not(Test-RecoveryJournalImmutableEqual $journal $tempJournal)){throw 'package_recovery_value_invalid'}
      $allowed=($tempJournal.stage-ceq$journal.stage)-or($journal.stage-ceq'prepared'-and$tempJournal.stage-ceq'mutated')-or($journal.stage-ceq'mutated'-and$tempJournal.stage-ceq'restoring')
      if(-not$allowed){throw 'package_recovery_value_invalid'}
    }
    if(-not(Test-Path -LiteralPath $Context.backupPath -PathType Leaf)){throw 'package_recovery_backup_missing'}
    if((Get-Sha256 $Context.backupPath)-cne$normalized.originalSha256){throw 'package_recovery_value_invalid'}
    $current=Get-Sha256 $Context.packagePath
    $currentKind=if($current-ceq$normalized.originalSha256){'original'}elseif($current-ceq$normalized.devMutatedSha256){'dev'}else{'other'}
    $devKind=if(-not(Test-Path -LiteralPath $Context.devTempPath)){'missing'}elseif((Get-Sha256 $Context.devTempPath)-ceq$normalized.devMutatedSha256){'valid'}else{'invalid'}
    $restoreKind=if(-not(Test-Path -LiteralPath $Context.restoreTempPath)){'missing'}elseif((Get-Sha256 $Context.restoreTempPath)-ceq$normalized.originalSha256){'valid'}else{'invalid'}
    $accepted=($normalized.stage-ceq'prepared'-and$currentKind-ceq'original'-and$devKind-cin@('missing','valid')-and$restoreKind-ceq'missing')-or
      ($normalized.stage-ceq'prepared'-and$currentKind-ceq'dev'-and$devKind-ceq'missing'-and$restoreKind-ceq'missing')-or
      ($normalized.stage-ceq'mutated'-and$currentKind-ceq'dev'-and$devKind-ceq'missing'-and$restoreKind-ceq'missing')-or
      ($normalized.stage-ceq'restoring'-and$currentKind-cin@('dev','original')-and$devKind-ceq'missing'-and$restoreKind-cin@('missing','valid'))
    if(-not$accepted){if($currentKind-ceq'other'){throw 'package_recovery_current_hash_unexpected'};throw 'package_recovery_value_invalid'}
    return [pscustomobject][ordered]@{journal=$normalized;currentKind=$currentKind;devKind=$devKind;restoreKind=$restoreKind;promoteTemp=$tempExists}
  }

  function Read-PackageRecovery([object]$Context=(Get-RecoveryContext)) {
    return Get-ValidatedRecoveryState $Context
  }

  function Restore-Package([object]$State,[object]$Context=(Get-RecoveryContext),[scriptblock]$BeforeAtomicReplace=$null) {
    if($null-eq$State){return}
    $journal=$State.journal
    if($State.promoteTemp){Move-ReplaceFile $Context.journalTempPath $Context.recoveryPath}
    if($journal.stage-ceq'prepared'-and$State.currentKind-ceq'original'){
      Remove-ValidatedRecoveryArtifacts $Context @($Context.recoveryPath,$Context.journalTempPath,$Context.backupPath,$Context.devTempPath,$Context.restoreTempPath)
      return
    }
    if($journal.stage-ceq'prepared'){$journal.stage='mutated';Write-DurableRecoveryJournal $Context $journal}
    if($journal.stage-ceq'mutated'){$journal.stage='restoring';Write-DurableRecoveryJournal $Context $journal}
    if($State.currentKind-ceq'dev'){
      $original=[IO.File]::ReadAllBytes($Context.backupPath);if((Get-BytesSha256 $original)-cne$journal.originalSha256){throw 'package_recovery_value_invalid'}
      if(-not(Test-Path -LiteralPath $Context.restoreTempPath)){Write-DurableBytes $Context.restoreTempPath $original}
      if((Get-Sha256 $Context.restoreTempPath)-cne$journal.originalSha256){throw 'package_restore_hash_invalid'}
      Invoke-PackageCasReplace $Context.restoreTempPath $Context.packagePath $Context.devTempPath $journal.devMutatedSha256 $journal.originalSha256 'package_restore_concurrent_change' $BeforeAtomicReplace
      if((Get-Sha256 $Context.packagePath)-cne$journal.originalSha256){throw 'package_restore_hash_invalid'}
    }
    Remove-ValidatedRecoveryArtifacts $Context @($Context.recoveryPath,$Context.journalTempPath,$Context.backupPath,$Context.devTempPath,$Context.restoreTempPath)
  }

  function Recover-PackageAtStart([object]$Context=(Get-RecoveryContext)) {
    $state=Read-PackageRecovery $Context
    if($null-ne$state){Restore-Package $state $Context}
  }

  function Prepare-PackageMutation([string]$Head,[object]$Context=(Get-RecoveryContext),[scriptblock]$BeforeReplace=$null,[scriptblock]$BeforeAtomicReplace=$null) {
    foreach($path in @($Context.recoveryPath,$Context.journalTempPath,$Context.backupPath,$Context.devTempPath,$Context.restoreTempPath)){if(Test-Path -LiteralPath $path){throw 'package_recovery_artifact_exists'}}
    if(@(Get-UnexpectedRecoveryTemps $Context).Count-ne0){throw 'package_recovery_artifact_exists'}
    $original=[IO.File]::ReadAllBytes($Context.packagePath);$originalSha=Get-BytesSha256 $original
    $devBytes=Get-PackageTransformBytes $original;$devSha=Get-BytesSha256 $devBytes
    Write-DurableBytes $Context.backupPath $original
    if((Get-Sha256 $Context.backupPath)-cne$originalSha){throw 'package_backup_hash_invalid'}
    $journal=[pscustomobject][ordered]@{schemaVersion=1;repo=$Context.repo;head=$Head;originalSha256=$originalSha;devMutatedSha256=$devSha;backupPath=$Context.backupPath;backupSha256=$originalSha;stage='prepared'}
    Write-DurableRecoveryJournal $Context $journal
    Write-DurableBytes $Context.devTempPath $devBytes
    $candidate=[IO.File]::ReadAllBytes($Context.devTempPath);if((Get-BytesSha256 $candidate)-cne$devSha){throw 'package_mutation_hash_invalid'}
    Assert-PackageTransformTrees (ConvertFrom-StrictJsonBytes $original) (ConvertFrom-StrictJsonBytes $candidate)
    if($null-ne$BeforeReplace){&$BeforeReplace $Context}
    if((Get-Sha256 $Context.packagePath)-cne$originalSha){throw 'package_mutation_concurrent_change'}
    $atomicCallback=$null;if($null-ne$BeforeAtomicReplace){$atomicCallback={&$BeforeAtomicReplace $Context}.GetNewClosure()}
    Invoke-PackageCasReplace $Context.devTempPath $Context.packagePath $Context.restoreTempPath $originalSha $devSha 'package_mutation_concurrent_change' $atomicCallback
    if((Get-Sha256 $Context.packagePath)-cne$devSha){throw 'package_mutation_hash_invalid'}
    $journal.stage='mutated';Write-DurableRecoveryJournal $Context $journal
    return $journal
  }

  function Invoke-LibraryRecoveryMatrix([object]$Payload) {
    Assert-ExactKeys $Payload @('root') 'recovery_matrix_payload_invalid'
    $matrixRoot=[IO.Path]::GetFullPath($Payload.root)
    if(-not(Test-Path -LiteralPath $matrixRoot -PathType Container)-or@(Get-ChildItem -LiteralPath $matrixRoot).Count-ne0){throw 'recovery_matrix_payload_invalid'}
    $stages=@('prepared','mutated','restoring');$currents=@('original','dev','other');$backups=@('missing','valid','invalid');$devTemps=@('missing','valid','invalid');$restoreTemps=@('missing','valid','invalid');$journalTemps=@('missing','valid','invalid')
    $total=0;$accepted=0;$rejected=0;$repeatAccepted=0;$preserveChecks=0
    $caseRoot=Join-Path $matrixRoot 'case';[IO.Directory]::CreateDirectory($caseRoot)|Out-Null
    $original=$script:Utf8NoBom.GetBytes("{`"main`":`"index.js`",`"name`":`"fixture`"}`n");$dev=Get-PackageTransformBytes $original;$other=$script:Utf8NoBom.GetBytes("{`"main`":`"other.js`"}`n")
    $originalSha=Get-BytesSha256 $original;$devSha=Get-BytesSha256 $dev
    foreach($stage in $stages){foreach($currentKind in $currents){foreach($backupKind in $backups){foreach($devKind in $devTemps){foreach($restoreKind in $restoreTemps){foreach($tempKind in $journalTemps){
      $total+=1
      try{
        $packagePath=Join-Path $caseRoot 'package.json';$recoveryPath=Join-Path $caseRoot 'recovery.json';$backupPath=Join-Path $caseRoot 'backup.bin';$context=Get-RecoveryContext $caseRoot $packagePath $recoveryPath $backupPath
        [IO.File]::WriteAllBytes($packagePath,($(if($currentKind-ceq'original'){$original}elseif($currentKind-ceq'dev'){$dev}else{$other})))
        $journal=[pscustomobject][ordered]@{schemaVersion=1;repo=$context.repo;head=('a'*40);originalSha256=$originalSha;devMutatedSha256=$devSha;backupPath=$backupPath;backupSha256=$originalSha;stage=$stage}
        [IO.File]::WriteAllText($recoveryPath,($journal|ConvertTo-Json -Compress),$script:Utf8NoBom)
        if($backupKind-ceq'valid'){[IO.File]::WriteAllBytes($backupPath,$original)}elseif($backupKind-ceq'invalid'){[IO.File]::WriteAllBytes($backupPath,$other)}
        if($devKind-ceq'valid'){[IO.File]::WriteAllBytes($context.devTempPath,$dev)}elseif($devKind-ceq'invalid'){[IO.File]::WriteAllBytes($context.devTempPath,$other)}
        if($restoreKind-ceq'valid'){[IO.File]::WriteAllBytes($context.restoreTempPath,$original)}elseif($restoreKind-ceq'invalid'){[IO.File]::WriteAllBytes($context.restoreTempPath,$other)}
        if($tempKind-ceq'valid'){[IO.File]::WriteAllText($context.journalTempPath,($journal|ConvertTo-Json -Compress),$script:Utf8NoBom)}elseif($tempKind-ceq'invalid'){[IO.File]::WriteAllText($context.journalTempPath,'{}',$script:Utf8NoBom)}
        $expected=($backupKind-ceq'valid'-and$tempKind-cin@('missing','valid')-and(
          ($stage-ceq'prepared'-and$currentKind-ceq'original'-and$devKind-cin@('missing','valid')-and$restoreKind-ceq'missing')-or
          ($stage-ceq'prepared'-and$currentKind-ceq'dev'-and$devKind-ceq'missing'-and$restoreKind-ceq'missing')-or
          ($stage-ceq'mutated'-and$currentKind-ceq'dev'-and$devKind-ceq'missing'-and$restoreKind-ceq'missing')-or
          ($stage-ceq'restoring'-and$currentKind-cin@('dev','original')-and$devKind-ceq'missing'-and$restoreKind-cin@('missing','valid'))))
        $before=@{};foreach($filePath in [IO.Directory]::EnumerateFiles($caseRoot)){$before[[IO.Path]::GetFileName($filePath)]=Get-Sha256 $filePath}
        $didPass=$true;try{Recover-PackageAtStart $context}catch{$didPass=$false}
        if($expected){
          if(-not$didPass-or(Get-Sha256 $packagePath)-cne$originalSha){throw 'recovery_matrix_acceptance_failed'}
          foreach($artifact in @($context.recoveryPath,$context.journalTempPath,$context.backupPath,$context.devTempPath,$context.restoreTempPath)){if(Test-Path -LiteralPath $artifact){throw 'recovery_matrix_cleanup_failed'}}
          Recover-PackageAtStart $context;$accepted+=1;$repeatAccepted+=1
        }else{
          if($didPass){throw 'recovery_matrix_rejection_failed'}
          $after=@{};foreach($filePath in [IO.Directory]::EnumerateFiles($caseRoot)){$after[[IO.Path]::GetFileName($filePath)]=Get-Sha256 $filePath}
          $beforeNames=@($before.Keys|Sort-Object);$afterNames=@($after.Keys|Sort-Object)
          if(($beforeNames-join'|')-cne($afterNames-join'|')){throw 'recovery_matrix_preservation_failed'}
          foreach($name in $before.Keys){if($before[$name]-cne$after[$name]){throw 'recovery_matrix_preservation_failed'}}
          $rejected+=1;$preserveChecks+=1
        }
      }finally{foreach($file in [IO.Directory]::EnumerateFiles($caseRoot)){[IO.File]::Delete($file)}}
    }}}}}}
    [IO.Directory]::Delete($caseRoot)
    return [pscustomobject][ordered]@{status='pass';total=$total;accepted=$accepted;rejected=$rejected;repeatAccepted=$repeatAccepted;preserveChecks=$preserveChecks}
  }

  function Invoke-DeviceCampaign {
    if ($PSCmdlet.ParameterSetName -ne 'Device') { throw 'device_mode_binding_invalid' }
    $recoveryContext=Get-RecoveryContext
    Recover-PackageAtStart $recoveryContext
    $resolvedTemp=$null;$rawRoot=$null;$stagingRoot=$null;$gateTemp=$null;$focusedTemp=$null;$metro=$null;$gateValidation=$null;$manifest=$null;$gateEvidence=$null;$resolvedEvidence=$null;$sourceBinding=$null;$reverseOwned=$false
    $runId=[Guid]::NewGuid().ToString('N');$runStartedUtc=[DateTime]::UtcNow.ToString('O');$phases=@();$snapshots=@();$header=$null;$approvedLocalApkSha256=$null;$approvedPathSha256=$null
    $preHead=$null;$preContent=$null;$postHead=$null;$postContent=$null;$packageShaBefore=$null;$installedApkSha256=$null;$campaignFailure=$null;$runManifest=$null;$finalSourceObservation=$null;$cleanupApkObservation=$null
    $cleanupFailures=[Collections.Generic.List[string]]::new();$restoration=[ordered]@{appForceStopped=$false;metroStopped=$false;packageRestored=$false;packageRecoveryCleared=$false;externalEmulatorOnline=$false;installedApkMatched=$false;tempDeleted=$false;sanitizerPassed=$false}
    try {
      Assert-Baseline $PreEditBaselinePath $PreEditBaselineSha256|Out-Null
      Assert-Packet $PacketPath $PacketSha256|Out-Null
      $resolvedEvidence=Resolve-EvidenceTarget $script:AuthorizedEvidenceRoot $EvidenceDirectory $true
      if(-not(Test-Path -LiteralPath $resolvedEvidence.root)){[IO.Directory]::CreateDirectory($resolvedEvidence.root)|Out-Null}
      $stagingRoot=Write-StagingOwner $resolvedEvidence.root $runId $resolvedEvidence.targetName '.account-sqlcipher-stage-'
      $resolvedTemp=[IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "account-sqlcipher-device-$([Guid]::NewGuid().ToString('N'))"));$tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath())
      if(-not$resolvedTemp.StartsWith($tempRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'device_temp_path_invalid'}
      [IO.Directory]::CreateDirectory($resolvedTemp)|Out-Null;$rawRoot=Join-Path $resolvedTemp 'raw';$gateTemp=Join-Path $rawRoot 'bundle';$focusedTemp=Join-Path $rawRoot 'live-gates'
      [IO.Directory]::CreateDirectory($rawRoot)|Out-Null
      $sourceBinding=Open-SourceBindings $script:Repo ([string[]]$script:FivePaths)
      $gateValidation=Expand-AndValidateGateBundle $GateBundlePath $GateBundleSha256 $gateTemp;$manifest=$gateValidation.manifest;$gateEvidence=[ordered]@{};foreach($name in @('red.json','green.json','eslint.json','strictTs.json','gate-manifest.json')){$gateEvidence[$name]=Get-Content -LiteralPath (Join-Path $gateTemp $name) -Raw|ConvertFrom-Json}
      if($manifest.packetSpecSha256-cne$PacketSha256){throw 'gate_packet_spec_mismatch'}
      $liveRecords=Invoke-FocusedGateSet $focusedTemp 'DEVICE-PREFLIGHT';$liveFacts=Convert-GateRecordsToFocusedFacts $liveRecords
      Test-LiveGatePreflight ([pscustomobject][ordered]@{bundle=$gateValidation.focused;live=$liveFacts})|Out-Null
      Get-SourceObservation $sourceBinding.hashes $manifest.sourceFingerprintSha256|Out-Null
      $state=@(Invoke-NativeChecked 'adbState' 'adb' @('-s',$Serial,'get-state'));if($state.Count-ne1-or$state[0]-cne'device'){throw 'external_emulator_not_online'}
      $abi=@(Invoke-NativeChecked 'adbAbi' 'adb' @('-s',$Serial,'shell','getprop','ro.product.cpu.abi'));if($abi.Count-ne1-or$abi[0].Trim()-cne'x86_64'){throw 'external_emulator_not_x86_64'}
      $approvedLocalApkSha256=$manifest.nativeInputHashes.localApk;$installedApkSha256=$approvedLocalApkSha256
      $preHeadLines=@(Invoke-NativeChecked 'gitHeadBefore' 'git' @('-C',$script:Repo,'rev-parse','HEAD'));if($preHeadLines.Count-ne1-or$preHeadLines[0]-cnotmatch'^[0-9a-f]{40}([0-9a-f]{24})?$'){throw 'git_head_invalid'};$preHead=[string]$preHeadLines[0];$preContent=Get-ContentManifestFacts
      $journal=Prepare-PackageMutation $preHead $recoveryContext;$packageShaBefore=$journal.originalSha256
      $nodeExecutable=[IO.Path]::GetFullPath((Get-Command node -ErrorAction Stop).Source)
      $metro=Start-OwnedProcessChecked $nodeExecutable @('node_modules/expo/bin/cli','start','--dev-client','--localhost','--port','8081','--max-workers','1') $script:Repo (Join-Path $rawRoot 'metro.out') (Join-Path $rawRoot 'metro.err')
      Wait-OwnedMetroReady $metro
      Start-OwnedAdbReverse $Serial;$reverseOwned=$true
      $script:ApkNativeCommandSequence=0
      $phaseSpecs=@(@('prepare','prepare','account_sqlcipher_android_prepare_pass'),@('verify-before','verify','account_sqlcipher_android_verify_pass'),@('wrong-key','wrong-key','account_sqlcipher_android_wrong_key_rejected_pass'),@('verify-after','verify','account_sqlcipher_android_verify_pass'))
      for($index=0;$index-lt4;$index+=1){
        $spec=$phaseSpecs[$index];Invoke-NativeChecked 'logcatClear' 'adb' @('-s',$Serial,'logcat','-c')|Out-Null;Invoke-NativeChecked 'forceStopBefore' 'adb' @('-s',$Serial,'shell','am','force-stop','app.phraseman')|Out-Null
        $sourceBefore=Get-SourceObservation $manifest.allowlistedFileHashes $manifest.sourceFingerprintSha256
        $before=Get-InstalledApkObservation 'beforeLaunch' $approvedLocalApkSha256 $approvedPathSha256;if($null-eq$approvedPathSha256){$approvedPathSha256=$before.evidence.baseApkPathSha256}
        $launched=Get-StrictlyLaterUtcTimestamp $before.evidence.observedUtc 'phase_time_invalid';Invoke-NativeChecked 'deepLink' 'adb' @('-s',$Serial,'shell','am','start','-W','-a','android.intent.action.VIEW','-d',"phraseman://_account_v2_sqlcipher_probe?mode=$($spec[1])",'app.phraseman')|Out-Null
        $pidDeadline=[DateTime]::UtcNow.AddSeconds(10);$pidLines=@();while([DateTime]::UtcNow-lt$pidDeadline){$pidLines=@(Invoke-NativeChecked 'pidof' 'adb' @('-s',$Serial,'shell','pidof','-s','app.phraseman'));if($pidLines.Count-eq1-and$pidLines[0]-match'^\d+$'){break};Start-Sleep -Milliseconds 250};if($pidLines.Count-ne1-or$pidLines[0]-notmatch'^\d+$'){throw 'phase_pid_invalid'};$phasePid=[int]$pidLines[0]
        $stat=@(Invoke-NativeChecked 'procStat' 'adb' @('-s',$Serial,'shell','cat',"/proc/$phasePid/stat"))-join'';$statMatch=[regex]::Match($stat,'^\d+\s+\(.+\)\s+(.+)$');if(-not$statMatch.Success){throw 'phase_stat_invalid'};$tail=$statMatch.Groups[1].Value-split'\s+';if($tail.Count-lt20){throw 'phase_starttime_invalid'};$starttime=$tail[19]
        $afterBind=Get-InstalledApkObservation 'afterPid' $approvedLocalApkSha256 $approvedPathSha256
        $deadline=[DateTime]::UtcNow.AddSeconds(30);$logLines=@();$found=$false;$pidFilter='--pid='+$phasePid;while([DateTime]::UtcNow-lt$deadline){$logLines=@(Invoke-NativeChecked 'logcatRead' 'adb' @('-s',$Serial,'logcat',$pidFilter,'-d','-v','epoch'));if(@($logLines|Where-Object{$_-match[regex]::Escape($spec[2])}).Count-eq1){$found=$true;break};Start-Sleep -Milliseconds 500};if(-not$found){throw 'phase_marker_timeout'}
        $captured=[DateTime]::UtcNow.ToString('O');$afterMarker=Get-InstalledApkObservation 'afterMarker' $approvedLocalApkSha256 $approvedPathSha256;$structuredLines=@();foreach($logLine in $logLines){$match=[regex]::Match($logLine,'^\s*(\d+\.\d+)\s+(\d+)\s+.*?(account_sqlcipher_[a-z0-9_]+)');if($match.Success){$lineUtc=[DateTimeOffset]::FromUnixTimeMilliseconds([long]([decimal]$match.Groups[1].Value*1000)).UtcDateTime.ToString('O');$structuredLines+=[pscustomobject][ordered]@{pid=[int]$match.Groups[2].Value;utc=$lineUtc;token=$match.Groups[3].Value}}}
        $reduced=Reduce-AccountSqlcipherPhaseLog ([pscustomobject][ordered]@{runId=$runId;label=$spec[0];mode=$spec[1];pid=$phasePid;starttime=[string]$starttime;launchedUtc=$launched;capturedUtc=$captured;expectedMarker=$spec[2];lines=$structuredLines})
        Invoke-NativeChecked 'forceStopAfter' 'adb' @('-s',$Serial,'shell','am','force-stop','app.phraseman')|Out-Null
        $finalApk=Get-InstalledApkObservation 'final' $approvedLocalApkSha256 $approvedPathSha256
        $sourceAfter=Get-SourceObservation $manifest.allowlistedFileHashes $manifest.sourceFingerprintSha256
        $phases+=[pscustomobject][ordered]@{schemaVersion=1;runId=$runId;label=$spec[0];mode=$spec[1];sequence=$index+1;launchedUtc=$launched;capturedUtc=$captured;pid=$phasePid;starttime=[string]$starttime;databaseRelativePath=$script:DatabaseRelativePath;logArtifactRelativePath="phases/$($spec[0]).json";logSha256=$reduced.canonicalSha256;expectedMarker=$spec[2];expectedMarkerCount=1;unexpectedMarkerCount=0;cleanupPassed=$true;apkObservations=[pscustomobject][ordered]@{beforeLaunch=$before.evidence;afterPid=$afterBind.evidence;afterMarker=$afterMarker.evidence;final=$finalApk.evidence};sourceBefore=$sourceBefore;sourceAfter=$sourceAfter}
        if($spec[0]-ceq'prepare'){$headerRaw=Invoke-NativeChecked 'header' 'adb' @('-s',$Serial,'shell','run-as','app.phraseman','toybox','od','-An','-v','-tx1','-N16',$script:DatabaseRelativePath);$headerHex=($headerRaw-join'')-replace'\s','';if($headerHex-notmatch'^[0-9a-f]{32}$'-or$headerHex-ceq'53514c69746520666f726d6174203300'){throw 'account_sqlcipher_probe_header_failed'};$header=[pscustomobject][ordered]@{label='header-16';hex=$headerHex}}
        if($spec[0]-ceq'verify-before'-or$spec[0]-ceq'wrong-key'){$dbSha=@(Invoke-NativeChecked 'databaseHash' 'adb' @('-s',$Serial,'shell','run-as','app.phraseman','toybox','sha256sum',$script:DatabaseRelativePath));$dbSize=@(Invoke-NativeChecked 'databaseSize' 'adb' @('-s',$Serial,'shell','run-as','app.phraseman','toybox','stat','-c','%s',$script:DatabaseRelativePath));$snapshot=Convert-AccountSqlcipherSnapshot ([pscustomobject][ordered]@{databaseRelativePath=$script:DatabaseRelativePath;shaLines=$dbSha;sizeLines=$dbSize});$snapshots+=[pscustomobject][ordered]@{label=if($spec[0]-ceq'verify-before'){'before-wrong-key'}else{'after-wrong-key'};sha256=$snapshot.sha256;size=$snapshot.size}}
      }
      if($script:ApkNativeCommandSequence-ne32){throw 'installed_apk_continuity_invalid'}
    }catch{$campaignFailure='device_campaign_failed'}finally{
      try{Invoke-NativeChecked 'forceStopFinally' 'adb' @('-s',$Serial,'shell','am','force-stop','app.phraseman')|Out-Null;$restoration.appForceStopped=$true}catch{$cleanupFailures.Add('app_stop_failed')}
      try{$metroCleanupFailed=$false;if($reverseOwned){try{Stop-OwnedAdbReverse $Serial;$reverseOwned=$false}catch{$metroCleanupFailed=$true}};try{Stop-OwnedProcessChecked $metro}catch{$metroCleanupFailed=$true};if($metroCleanupFailed){throw 'metro_cleanup_failed'};$restoration.metroStopped=$true}catch{$cleanupFailures.Add('metro_stop_failed')}
      try{$durableState=Read-PackageRecovery $recoveryContext;if($null-ne$durableState){if($null-eq$packageShaBefore){$packageShaBefore=$durableState.journal.originalSha256};Restore-Package $durableState $recoveryContext};$restoration.packageRestored=$true}catch{$cleanupFailures.Add('package_restore_failed')}
      try{foreach($artifact in @($recoveryContext.recoveryPath,$recoveryContext.journalTempPath,$recoveryContext.backupPath,$recoveryContext.devTempPath,$recoveryContext.restoreTempPath)){if(Test-Path -LiteralPath $artifact){throw 'recovery_artifact_present'}};if(@(Get-UnexpectedRecoveryTemps $recoveryContext).Count-ne0){throw 'recovery_artifact_present'};$restoration.packageRecoveryCleared=$true}catch{$cleanupFailures.Add('journal_cleanup_failed')}
      try{if($phases.Count-ne4-or$script:ApkNativeCommandSequence-ne32){throw 'apk_measurement_incomplete'};$cleanupApk=Get-InstalledApkObservation 'cleanup' $approvedLocalApkSha256 $approvedPathSha256;if($script:ApkNativeCommandSequence-ne34){throw 'apk_measurement_incomplete'};$cleanupApkObservation=$cleanupApk.evidence;$restoration.installedApkMatched=$true}catch{$cleanupFailures.Add('apk_recheck_failed')}
      try{$postHeadLines=@(Invoke-NativeChecked 'gitHeadAfter' 'git' @('-C',$script:Repo,'rev-parse','HEAD'));if($postHeadLines.Count-ne1-or$postHeadLines[0]-cnotmatch'^[0-9a-f]{40}([0-9a-f]{24})?$'){throw 'git_head_invalid'};$postHead=[string]$postHeadLines[0];$postContent=Get-ContentManifestFacts;if($null-eq$preContent-or$postHead-cne$preHead-or$postContent.recordCount-ne$preContent.recordCount-or$postContent.byteCount-ne$preContent.byteCount-or$postContent.manifestSha256-cne$preContent.manifestSha256){throw 'content_drift'}}catch{$cleanupFailures.Add('content_check_failed')}
      try{if($null-eq$manifest){throw 'source_manifest_missing'};$finalSourceObservation=Get-SourceObservation $manifest.allowlistedFileHashes $manifest.sourceFingerprintSha256}catch{$cleanupFailures.Add('source_check_failed')}
      try{$online=@(Invoke-NativeChecked 'adbStateFinally' 'adb' @('-s',$Serial,'get-state'));if($online.Count-ne1-or$online[0]-cne'device'){throw 'emulator_offline'};$restoration.externalEmulatorOnline=$true}catch{$cleanupFailures.Add('emulator_check_failed')}
      if($null-ne$campaignFailure){$cleanupFailures.Add($campaignFailure)}
      try{if($null-ne$resolvedTemp){Remove-TreeChecked $resolvedTemp 'temp_delete_failed'};$restoration.tempDeleted=$true}catch{$cleanupFailures.Add('temp_delete_failed')}
      if($cleanupFailures.Count-eq0){
        try{
          foreach($name in @('red.json','green.json','eslint.json','strictTs.json','gate-manifest.json')){Publish-SanitizedJson $stagingRoot "gates/$name" $gateEvidence[$name]|Out-Null}
          foreach($phase in $phases){Publish-SanitizedJson $stagingRoot $phase.logArtifactRelativePath $phase|Out-Null};Publish-SanitizedJson $stagingRoot 'header-16.json' $header|Out-Null;Publish-SanitizedJson $stagingRoot 'snapshots.json' $snapshots|Out-Null
          $restoration.sanitizerPassed=$true;$runManifest=[pscustomobject][ordered]@{schemaVersion=1;runId=$runId;runStartedUtc=$runStartedUtc;validatedUtc=[DateTime]::UtcNow.ToString('O');preEditBaselineSha256=$PreEditBaselineSha256;gateBundleSha256=$GateBundleSha256;packetSpecSha256=$PacketSha256;preDeviceHead=$preHead;preDeviceContentRecordCount=$preContent.recordCount;preDeviceContentByteCount=$preContent.byteCount;preDeviceContentManifestSha256=$preContent.manifestSha256;postDeviceHead=$postHead;postDeviceContentRecordCount=$postContent.recordCount;postDeviceContentByteCount=$postContent.byteCount;postDeviceContentManifestSha256=$postContent.manifestSha256;installedApkSha256=$installedApkSha256;databaseRelativePath=$script:DatabaseRelativePath;phases=$phases;cleanupApkObservation=$cleanupApkObservation;finalSourceObservation=$finalSourceObservation;headerHex=$header;beforeWrongKey=$snapshots[0];afterWrongKey=$snapshots[1];packageSha256Before=$packageShaBefore;packageSha256After=(Get-Sha256 $recoveryContext.packagePath);nativeInputHashes=$manifest.nativeInputHashes;gates=$gateValidation.gates;restoration=[pscustomobject]$restoration}
          Assert-AccountSqlcipherProofEvidence $runManifest|Out-Null;Assert-SanitizedValue $runManifest;Publish-SanitizedJson $stagingRoot 'run-manifest.json' $runManifest|Out-Null
          foreach($artifact in Get-ChildItem -LiteralPath $stagingRoot -Recurse -File){Assert-SanitizedArtifact $artifact.FullName}
          Publish-OwnedStaging $resolvedEvidence.root $resolvedEvidence.target $runId '.account-sqlcipher-stage-'|Out-Null
        }catch{$cleanupFailures.Add('evidence_finalize_failed')}
      }
      try{Close-SourceBindings $sourceBinding;$sourceBinding=$null}catch{$cleanupFailures.Add('source_binding_release_failed')}
    }
    if($cleanupFailures.Count-ne0){if($null-ne$stagingRoot-and(Test-Path -LiteralPath $stagingRoot)){try{Remove-OwnedStaging $resolvedEvidence.root $runId $resolvedEvidence.targetName '.account-sqlcipher-stage-'}catch{throw 'device_staging_preserved_owner_mismatch'}};throw 'device_cleanup_failed'}
    return $runManifest
  }

  $aggregateCandidate = $null
  $libraryExitCode = 0
  if ($LibraryMode) {
    try {
      try {
        $payloadJson = $script:Utf8NoBom.GetString([Convert]::FromBase64String($ValidationPayloadBase64))
        $payload = $payloadJson | ConvertFrom-Json
      } catch {
        throw 'library_payload_invalid'
      }
      $libraryResult = switch ($ValidationKind) {
        'GateRecords' { Test-GateRecordSet $payload; break }
        'GateArchiveNames' { Assert-GateArchiveNames $payload; break }
        'GateStaging' { Invoke-LibraryGateStaging $payload; break }
        'PhaseFacts' { Get-ValidatedAccountSqlcipherPhaseFacts $payload; break }
        'ReducePhaseLog' { Reduce-AccountSqlcipherPhaseLog $payload; break }
        'Snapshot' { Convert-AccountSqlcipherSnapshot $payload; break }
        'Aggregate' { Test-AccountSqlcipherProofEvidence $payload; break }
        'Sanitize' { Assert-SanitizedValue $payload; [pscustomobject][ordered]@{status='pass';validation='sanitizer_valid'}; break }
        'ApkAbi' { Test-ApkAbiEntries $payload; break }
        'MutexModel' { Get-MutexModel $payload; break }
        'CleanupModel' { Get-CleanupModel $payload; break }
        'Recovery' { Invoke-LibraryRecovery $payload; break }
        'RecoveryRace' { Invoke-LibraryRecoveryRace $payload; break }
        'RecoveryMatrix' { Invoke-LibraryRecoveryMatrix $payload; break }
        'PackageMutation' { Invoke-LibraryPackageMutation $payload; break }
        'PackageTransform' { Invoke-LibraryPackageTransform $payload $false; break }
        'PackageTransformValidation' { Invoke-LibraryPackageTransform $payload $true; break }
        'DeviceLifecycle' { Invoke-LibraryDeviceLifecycle $payload; break }
        'EvidenceOwnership' { Invoke-LibraryEvidenceOwnership $payload; break }
        'MetroOwnership' { Get-MetroOwnershipModel $payload; break }
        'LiveGatePreflight' { Test-LiveGatePreflight $payload; break }
        'ApkContinuity' { Assert-ApkContinuity $payload; break }
        'SourceBinding' { Invoke-LibrarySourceBinding $payload; break }
        'Baseline' { Assert-ExactKeys $payload @('path','sha256') 'baseline_payload_invalid';Assert-Baseline $payload.path $payload.sha256|Out-Null;[pscustomobject][ordered]@{status='pass';validation='baseline_valid'}; break }
        'Packet' { Assert-ExactKeys $payload @('path','sha256') 'packet_payload_invalid';Assert-Packet $payload.path $payload.sha256; break }
        'RedReceipt' { Assert-ExactKeys $payload @('path','sha256') 'red_receipt_payload_invalid';Assert-RedReceipt $payload.path $payload.sha256; break }
        'RedEvidenceBinding' { Invoke-LibraryRedEvidenceBinding $payload; break }
        'FocusedEnvironment' { if($null-eq$payload-or$payload.GetType().Name-cne'PSCustomObject'-or@($payload.PSObject.Properties).Count-ne0){throw 'focused_environment_payload_invalid'};Assert-NoRunnerOverride; break }
        default { throw 'library_kind_invalid' }
      }
      [Console]::Out.Write(($libraryResult | ConvertTo-Json -Depth 20 -Compress))
    } catch {
      [Console]::Error.Write($_.Exception.Message)
      $libraryExitCode = 1
    }
  } elseif ($BuildGateBundle) {
    Invoke-BuildGateBundle
  } else {
    $aggregateCandidate = Invoke-DeviceCampaign
  }
} finally {
  if ($null -eq $mutex) {
    # Pure library validation owns no OS mutex and performs no recovery/device work.
  } elseif ($ownsMutex) {
    try { $mutex.ReleaseMutex() } finally { $mutex.Dispose() }
  } else {
    $mutex.Dispose()
  }
}

if ($LibraryMode) {
  exit $libraryExitCode
}
if ($null -ne $aggregateCandidate) {
  $aggregateResult = Test-AccountSqlcipherProofEvidence $aggregateCandidate
  [Console]::Out.WriteLine($aggregateResult.token)
}
