[CmdletBinding()]
param(
  [ValidateSet('WalDelta', 'PhaseTranscript', 'KillBinding', 'ProcDisappearance', 'FamilyPath', 'FileFact', 'RecoveryOrdering', 'CleanupOutcome', 'EvidencePublication')]
  [string]$LibraryMode,
  [string]$PayloadBase64
)

$ErrorActionPreference = 'Stop'
$DatabaseSelector = 'files/SQLite/accounts-v2/accounts-v2-g-588b372845f968ba31b0e12c84bb17559ce7dc6de13247456e6cae9e3e971643.db'
$Hex32 = '^[0-9a-f]{32}$'
$Hex64 = '^[0-9a-f]{64}$'
$Decimal = '^[1-9][0-9]*$'

function Stop-Fixed([string]$Code) {
  [Console]::Error.WriteLine($Code)
  exit 1
}

function Write-Pass([hashtable]$Facts = @{}) {
  $ordered = [ordered]@{ status = 'pass' }
  foreach ($key in $Facts.Keys) { $ordered[$key] = $Facts[$key] }
  [Console]::Out.WriteLine(($ordered | ConvertTo-Json -Compress -Depth 8))
  exit 0
}

function Get-ExactProperties([object]$Value, [string[]]$Names) {
  if ($null -eq $Value) { return $false }
  $actual = @($Value.PSObject.Properties.Name)
  if ($actual.Count -ne $Names.Count) { return $false }
  foreach ($name in $Names) {
    if ($actual -cnotcontains $name) { return $false }
  }
  return $true
}

function Test-Boolean([object]$Value) {
  return $Value -is [bool]
}

function Test-BoundedInteger([object]$Value, [long]$Minimum, [long]$Maximum) {
  if ($Value -isnot [int] -and $Value -isnot [long]) { return $false }
  $integer = [long]$Value
  return $integer -ge $Minimum -and $integer -le $Maximum
}

function Test-ObjectArray([object]$Value) {
  return $Value -is [System.Array]
}

function Test-Binding([object]$Binding) {
  $names = @('family', 'packageName', 'processName', 'pid', 'starttime', 'launchNonce', 'runtimeIdentity')
  if (-not (Get-ExactProperties $Binding $names)) { return $false }
  return $Binding.family -ceq $DatabaseSelector -and
    $Binding.packageName -ceq 'app.phraseman' -and
    $Binding.processName -ceq 'app.phraseman' -and
    (Test-BoundedInteger $Binding.pid 1 2147483647) -and
    $Binding.starttime -is [string] -and $Binding.starttime -cmatch $Decimal -and
    $Binding.launchNonce -is [string] -and $Binding.launchNonce -cmatch $Hex32 -and
    $Binding.runtimeIdentity -is [string] -and $Binding.runtimeIdentity -cmatch $Hex32
}

function Test-SameBinding([object]$Left, [object]$Right) {
  if (-not (Test-Binding $Left) -or -not (Test-Binding $Right)) { return $false }
  foreach ($name in @('family', 'packageName', 'processName', 'pid', 'starttime', 'launchNonce', 'runtimeIdentity')) {
    if ($Left.$name -cne $Right.$name) { return $false }
  }
  return $true
}

function Read-U32BE([byte[]]$Bytes, [int]$Offset) {
  $value = ([uint64]$Bytes[$Offset] * 16777216) +
    ([uint64]$Bytes[$Offset + 1] * 65536) +
    ([uint64]$Bytes[$Offset + 2] * 256) +
    [uint64]$Bytes[$Offset + 3]
  return [uint32]$value
}

function Read-U32LE([byte[]]$Bytes, [int]$Offset) {
  $value = [uint64]$Bytes[$Offset] +
    ([uint64]$Bytes[$Offset + 1] * 256) +
    ([uint64]$Bytes[$Offset + 2] * 65536) +
    ([uint64]$Bytes[$Offset + 3] * 16777216)
  return [uint32]$value
}

function Add-U32([uint32]$Left, [uint32]$Middle, [uint32]$Right) {
  return [uint32](([uint64]$Left + [uint64]$Middle + [uint64]$Right) -band [uint64]4294967295)
}

function Update-WalChecksum(
  [byte[]]$Bytes,
  [int]$Offset,
  [int]$Length,
  [uint32]$S0,
  [uint32]$S1,
  [bool]$BigEndianWords
) {
  if ($Length -lt 0 -or ($Length % 8) -ne 0 -or $Offset -lt 0 -or ($Offset + $Length) -gt $Bytes.Length) {
    Stop-Fixed 'wal_structure_invalid'
  }
  for ($index = $Offset; $index -lt ($Offset + $Length); $index += 8) {
    $x0 = if ($BigEndianWords) { Read-U32BE $Bytes $index } else { Read-U32LE $Bytes $index }
    $x1 = if ($BigEndianWords) { Read-U32BE $Bytes ($index + 4) } else { Read-U32LE $Bytes ($index + 4) }
    $S0 = Add-U32 $S0 $x0 $S1
    $S1 = Add-U32 $S1 $x1 $S0
  }
  return @([uint32]$S0, [uint32]$S1)
}

function Test-PowerOfTwo([uint32]$Value) {
  if ($Value -lt 512 -or $Value -gt 65536) { return $false }
  return (($Value -band ($Value - 1)) -eq 0)
}

function Read-Wal([byte[]]$Bytes) {
  if ($null -eq $Bytes -or $Bytes.Length -lt 32) { Stop-Fixed 'wal_structure_invalid' }
  $magic = Read-U32BE $Bytes 0
  if ($magic -ne [uint32]0x377f0682 -and $magic -ne [uint32]0x377f0683) {
    Stop-Fixed 'wal_header_invalid'
  }
  if ((Read-U32BE $Bytes 4) -ne 3007000) { Stop-Fixed 'wal_header_invalid' }
  $pageSize = Read-U32BE $Bytes 8
  if (-not (Test-PowerOfTwo $pageSize)) { Stop-Fixed 'wal_header_invalid' }
  $frameSize = 24 + [int]$pageSize
  $payloadLength = $Bytes.Length - 32
  if ($payloadLength -lt 0 -or ($payloadLength % $frameSize) -ne 0) { Stop-Fixed 'wal_structure_invalid' }
  $bigEndianWords = $magic -eq [uint32]0x377f0683
  $checksum = Update-WalChecksum $Bytes 0 24 0 0 $bigEndianWords
  if ((Read-U32BE $Bytes 24) -ne $checksum[0] -or (Read-U32BE $Bytes 28) -ne $checksum[1]) {
    Stop-Fixed 'wal_checksum_invalid'
  }
  $salt1 = Read-U32BE $Bytes 16
  $salt2 = Read-U32BE $Bytes 20
  $commits = [System.Collections.Generic.List[uint32]]::new()
  $frameCount = [int]($payloadLength / $frameSize)
  for ($frame = 0; $frame -lt $frameCount; $frame += 1) {
    $offset = 32 + ($frame * $frameSize)
    if ((Read-U32BE $Bytes $offset) -eq 0) { Stop-Fixed 'wal_structure_invalid' }
    if ((Read-U32BE $Bytes ($offset + 8)) -ne $salt1 -or (Read-U32BE $Bytes ($offset + 12)) -ne $salt2) {
      Stop-Fixed 'wal_salt_invalid'
    }
    $checksum = Update-WalChecksum $Bytes $offset 8 $checksum[0] $checksum[1] $bigEndianWords
    $checksum = Update-WalChecksum $Bytes ($offset + 24) ([int]$pageSize) $checksum[0] $checksum[1] $bigEndianWords
    if ((Read-U32BE $Bytes ($offset + 16)) -ne $checksum[0] -or
        (Read-U32BE $Bytes ($offset + 20)) -ne $checksum[1]) {
      Stop-Fixed 'wal_checksum_invalid'
    }
    $commits.Add((Read-U32BE $Bytes ($offset + 4)))
  }
  return [pscustomobject]@{
    PageSize = [int]$pageSize
    FrameCount = $frameCount
    Salt1 = $salt1
    Salt2 = $salt2
    Commits = $commits.ToArray()
  }
}

function Convert-Base64([object]$Value) {
  if ($Value -isnot [string]) { Stop-Fixed 'wal_structure_invalid' }
  try {
    return [Convert]::FromBase64String($Value)
  } catch {
    Stop-Fixed 'wal_structure_invalid'
  }
}

function Test-BytePrefix([byte[]]$Prefix, [byte[]]$Value) {
  if ($Value.Length -lt $Prefix.Length) { return $false }
  for ($index = 0; $index -lt $Prefix.Length; $index += 1) {
    if ($Prefix[$index] -ne $Value[$index]) { return $false }
  }
  return $true
}

function Invoke-WalDelta([object]$Payload) {
  $properties = @('baselineKind', 'baselineBase64', 'afterKind', 'afterBase64', 'baselineBinding', 'afterBinding')
  if (-not (Get-ExactProperties $Payload $properties) -or
      $Payload.baselineKind -isnot [string] -or $Payload.baselineBase64 -isnot [string] -or
      $Payload.afterKind -isnot [string] -or $Payload.afterBase64 -isnot [string]) {
    Stop-Fixed 'wal_structure_invalid'
  }
  if (-not (Test-SameBinding $Payload.baselineBinding $Payload.afterBinding)) {
    Stop-Fixed 'wal_binding_invalid'
  }
  if ($Payload.afterKind -cne 'regular') { Stop-Fixed 'wal_structure_invalid' }
  $after = Convert-Base64 $Payload.afterBase64
  $baselineFrames = 0
  $prefixMatch = $true
  $saltsMatch = $true
  if ($Payload.baselineKind -ceq 'absent') {
    if ($Payload.baselineBase64 -cne '') { Stop-Fixed 'wal_prefix_invalid' }
  } elseif ($Payload.baselineKind -ceq 'regular') {
    $baseline = Convert-Base64 $Payload.baselineBase64
    if (-not (Test-BytePrefix $baseline $after)) { Stop-Fixed 'wal_prefix_invalid' }
    $baselineFacts = Read-Wal $baseline
    $afterFacts = Read-Wal $after
    if ($baselineFacts.Salt1 -ne $afterFacts.Salt1 -or $baselineFacts.Salt2 -ne $afterFacts.Salt2) {
      Stop-Fixed 'wal_salt_invalid'
    }
    $baselineFrames = $baselineFacts.FrameCount
  } else {
    Stop-Fixed 'wal_structure_invalid'
  }
  if ($null -eq $afterFacts) { $afterFacts = Read-Wal $after }
  $delta = $afterFacts.FrameCount - $baselineFrames
  if ($delta -le 0) { Stop-Fixed 'wal_delta_missing' }
  for ($index = $baselineFrames; $index -lt $afterFacts.FrameCount; $index += 1) {
    if ($afterFacts.Commits[$index] -ne 0) { Stop-Fixed 'wal_delta_commit_marker_invalid' }
  }
  Write-Pass @{
    baselineFrameCount = $baselineFrames
    afterFrameCount = $afterFacts.FrameCount
    deltaFrameCount = $delta
    prefixMatch = $prefixMatch
    saltsMatch = $saltsMatch
    checksumsValid = $true
    structurallyComplete = $true
    allDeltaCommitMarkersZero = $true
  }
}

$PhaseModes = @('prepare', 'dirty-hold', 'rollback-verify', 'committed-wal-hold', 'recovery-verify', 'final-reopen')
# зачем: каждая фаза начинается с bootstrap-ack — хост проверил pid/starttime процесса
# после bootstrap, ещё до отправки launch. В dirty-hold baseline WAL снимается ДО launch
# (пакет §5 Phase 2), поэтому baseline-bound стоит строго перед launch-ack. В убиваемых
# фазах SIGKILL допустим только после валидации WAL (delta для dirty, присутствие для
# committed), а исчезновение /proc/<pid> обязано быть последним. Точная упорядоченная
# последовательность ниже и есть проверка порядка.
$PhaseEvents = @{
  'prepare' = @('bootstrap-ack', 'launch-ack', 'prepare-pass')
  'dirty-hold' = @(
    'bootstrap-ack', 'baseline-bound', 'launch-ack', 'dirty-ready', 'wal-delta-validated', 'sigkill-sent', 'proc-gone'
  )
  'rollback-verify' = @('bootstrap-ack', 'launch-ack', 'rollback-pass')
  'committed-wal-hold' = @(
    'bootstrap-ack', 'launch-ack', 'committed-wal-ready', 'wal-present-validated', 'sigkill-sent', 'proc-gone'
  )
  'recovery-verify' = @('bootstrap-ack', 'launch-ack', 'authoritative-read', 'checkpoint', 'recovery-pass')
  'final-reopen' = @('bootstrap-ack', 'launch-ack', 'final-reopen-pass')
}

function Invoke-PhaseTranscript([object]$Payload) {
  if (-not (Get-ExactProperties $Payload @('phases')) -or -not (Test-ObjectArray $Payload.phases)) {
    Stop-Fixed 'phase_transcript_invalid'
  }
  $modes = $PhaseModes
  $expectedEvents = $PhaseEvents
  $phases = @($Payload.phases)
  if ($phases.Count -ne $modes.Count) { Stop-Fixed 'phase_transcript_invalid' }
  $processIdentities = @()
  $runtimeIdentities = @()
  $launchNonces = @()
  for ($phaseIndex = 0; $phaseIndex -lt $modes.Count; $phaseIndex += 1) {
    $phase = $phases[$phaseIndex]
    if (-not (Get-ExactProperties $phase @('mode', 'binding', 'events', 'procDisappeared')) -or
        $phase.mode -isnot [string] -or $phase.mode -cne $modes[$phaseIndex] -or
        -not (Test-Binding $phase.binding) -or -not (Test-ObjectArray $phase.events) -or
        -not (Test-Boolean $phase.procDisappeared) -or $phase.procDisappeared -ne $true) {
      Stop-Fixed 'phase_transcript_invalid'
    }
    $processIdentity = "$($phase.binding.pid)|$($phase.binding.starttime)"
    if ($processIdentities -ccontains $processIdentity -or
        $runtimeIdentities -ccontains $phase.binding.runtimeIdentity -or
        $launchNonces -ccontains $phase.binding.launchNonce) {
      Stop-Fixed 'phase_transcript_invalid'
    }
    $processIdentities += $processIdentity
    $runtimeIdentities += $phase.binding.runtimeIdentity
    $launchNonces += $phase.binding.launchNonce
    $events = @($phase.events)
    $kinds = @($expectedEvents[$phase.mode])
    if ($events.Count -ne $kinds.Count) { Stop-Fixed 'phase_transcript_invalid' }
    for ($eventIndex = 0; $eventIndex -lt $kinds.Count; $eventIndex += 1) {
      $event = $events[$eventIndex]
      if (-not (Get-ExactProperties $event @('kind', 'binding')) -or
          $event.kind -isnot [string] -or $event.kind -cne $kinds[$eventIndex] -or
          -not (Test-SameBinding $phase.binding $event.binding)) {
        Stop-Fixed 'phase_transcript_invalid'
      }
    }
  }
  Write-Pass
}

function Invoke-KillBinding([object]$Payload) {
  if (-not (Get-ExactProperties $Payload @('expected', 'observed', 'signal', 'owner')) -or
      -not (Test-SameBinding $Payload.expected $Payload.observed) -or
      -not (Test-BoundedInteger $Payload.signal 9 9) -or
      $Payload.owner -isnot [string] -or $Payload.owner -cne 'app.phraseman') {
    Stop-Fixed 'kill_binding_invalid'
  }
  Write-Pass
}

function Invoke-ProcDisappearance([object]$Payload) {
  if (-not (Get-ExactProperties $Payload @('samples', 'nextLaunchObserved')) -or
      -not (Test-ObjectArray $Payload.samples) -or
      -not (Test-Boolean $Payload.nextLaunchObserved) -or $Payload.nextLaunchObserved -ne $false) {
    Stop-Fixed 'proc_disappearance_invalid'
  }
  $samples = @($Payload.samples)
  if ($samples.Count -lt 2 -or $samples[0] -ne $true -or $samples[-1] -ne $false) {
    Stop-Fixed 'proc_disappearance_invalid'
  }
  $disappeared = $false
  foreach ($sample in $samples) {
    if (-not (Test-Boolean $sample)) { Stop-Fixed 'proc_disappearance_invalid' }
    if ($disappeared -and $sample) { Stop-Fixed 'proc_disappearance_invalid' }
    if (-not $sample) { $disappeared = $true }
  }
  Write-Pass
}

function Invoke-FamilyPath([object]$Payload) {
  if (-not (Get-ExactProperties $Payload @('selector', 'member')) -or
      $Payload.selector -isnot [string] -or $Payload.member -isnot [string] -or
      $Payload.selector -cne $DatabaseSelector -or
      @('main', 'wal', 'shm', 'journal') -cnotcontains $Payload.member) {
    Stop-Fixed 'family_path_invalid'
  }
  Write-Pass
}

function Invoke-FileFact([object]$Payload) {
  $properties = @('kind', 'isReparsePoint', 'isSymlink', 'length', 'sha256')
  if (-not (Get-ExactProperties $Payload $properties) -or
      $Payload.kind -isnot [string] -or $Payload.kind -cne 'regular' -or
      -not (Test-Boolean $Payload.isReparsePoint) -or $Payload.isReparsePoint -ne $false -or
      -not (Test-Boolean $Payload.isSymlink) -or $Payload.isSymlink -ne $false -or
      -not (Test-BoundedInteger $Payload.length 1 9223372036854775807) -or
      $Payload.sha256 -isnot [string] -or $Payload.sha256 -cnotmatch $Hex64) {
    Stop-Fixed 'file_fact_invalid'
  }
  Write-Pass
}

function Invoke-RecoveryOrdering([object]$Payload) {
  $expected = @('committed-read', 'dirty-absent-read', 'quick-check', 'cipher-integrity', 'checkpoint', 'committed-reread')
  if (-not (Get-ExactProperties $Payload @('events')) -or -not (Test-ObjectArray $Payload.events)) {
    Stop-Fixed 'checkpoint_order_invalid'
  }
  $actual = @($Payload.events)
  if ($actual.Count -ne $expected.Count) { Stop-Fixed 'checkpoint_order_invalid' }
  for ($index = 0; $index -lt $expected.Count; $index += 1) {
    if ($actual[$index] -isnot [string] -or $actual[$index] -cne $expected[$index]) {
      Stop-Fixed 'checkpoint_order_invalid'
    }
  }
  Write-Pass
}

function Test-CanonicalFamilyFacts([object]$Value, [string]$ProofName) {
  if (-not (Test-ObjectArray $Value)) { return $false }
  $facts = @($Value)
  $members = @('main', 'wal', 'shm', 'journal')
  if ($facts.Count -ne $members.Count) { return $false }
  for ($index = 0; $index -lt $members.Count; $index += 1) {
    $fact = $facts[$index]
    if (-not (Get-ExactProperties $fact @('member', $ProofName)) -or
        $fact.member -isnot [string] -or $fact.member -cne $members[$index] -or
        -not (Test-Boolean $fact.$ProofName) -or $fact.$ProofName -ne $true) {
      return $false
    }
  }
  return $true
}

function Test-CleanupOutcome([object]$Payload) {
  if ($null -eq $Payload -or $Payload.campaignStatus -isnot [string]) { return $false }
  if ($Payload.campaignStatus -ceq 'pass') {
    $properties = @(
      'campaignStatus', 'familyMembers', 'partialDelete', 'packageRestored', 'sourceRecaptured',
      'nativeRecaptured', 'apkRecaptured', 'currentTempCleanupComplete'
    )
    return (Get-ExactProperties $Payload $properties) -and
      (Test-CanonicalFamilyFacts $Payload.familyMembers 'absent') -and
      (Test-Boolean $Payload.partialDelete) -and $Payload.partialDelete -eq $false -and
      (Test-Boolean $Payload.packageRestored) -and $Payload.packageRestored -eq $true -and
      (Test-Boolean $Payload.sourceRecaptured) -and $Payload.sourceRecaptured -eq $true -and
      (Test-Boolean $Payload.nativeRecaptured) -and $Payload.nativeRecaptured -eq $true -and
      (Test-Boolean $Payload.apkRecaptured) -and $Payload.apkRecaptured -eq $true -and
      (Test-Boolean $Payload.currentTempCleanupComplete) -and $Payload.currentTempCleanupComplete -eq $true
  }
  if ($Payload.campaignStatus -ceq 'failure') {
    return (Get-ExactProperties $Payload @('campaignStatus', 'familyMembers', 'partialDelete')) -and
      (Test-CanonicalFamilyFacts $Payload.familyMembers 'preserved') -and
      (Test-Boolean $Payload.partialDelete) -and $Payload.partialDelete -eq $false
  }
  return $false
}

function Invoke-CleanupOutcome([object]$Payload) {
  if (-not (Test-CleanupOutcome $Payload)) { Stop-Fixed 'cleanup_preservation_invalid' }
  Write-Pass
}

# зачем: PASS публикуется только при полном наборе фактов §8 пакета — dirty-WAL
# (delta>0 и пять структурных булевых), quick_check, ноль строк cipher_integrity и
# хэши кастоди. Типы проверяются строго (без приведения строк/чисел к bool).
$AggregateTrueFacts = @(
  'checkpointAfterAuthoritativeRead', 'plaintextCanaryAbsent', 'dirtyWalPrefixMatch',
  'dirtyWalSaltsMatch', 'dirtyWalChecksumsValid', 'dirtyWalStructurallyComplete',
  'dirtyWalAllDeltaCommitMarkersZero', 'quickCheckOk'
)
$AggregateHashFacts = @(
  'packetSha256', 'sourceSha256', 'launcherSha256', 'nativeSha256', 'apkSha256', 'deviceIdentitySha256'
)
# зачем: остаток P2-C — остальные факты §8: версия схемы, фазы с хэшами привязки,
# кадры WAL до/после грязной транзакции, точные счётчики отката (0/0 dirty-строк) и
# восстановления (1 batch / 2 items), kind/length/SHA семейства файлов, cleanupComplete.
$AggregateExactCounts = [ordered]@{
  schemaVersion = 1
  rollbackDirtyBatchRowCount = 0
  rollbackDirtyItemRowCount = 0
  recoveryCommittedBatchRowCount = 1
  recoveryCommittedItemRowCount = 2
}
$AggregateStructuredFacts = @(
  'phases', 'dirtyWalPreFrameCount', 'dirtyWalPostFrameCount', 'dirtyWalBaselineFact', 'dirtyWalAfterFact',
  'committedWalFamilyFacts', 'cleanupComplete'
)
$MaxLength = [long]9223372036854775807
$ProcessNameSha256 = -join ([Security.Cryptography.SHA256]::Create().ComputeHash(
    [Text.Encoding]::UTF8.GetBytes('app.phraseman')) | ForEach-Object { $_.ToString('x2') })

function Test-Sha256([object]$Value) {
  return $Value -is [string] -and $Value -cmatch $Hex64
}

function Test-ExactStringArray([object]$Value, [string[]]$Expected) {
  if (-not (Test-ObjectArray $Value)) { return $false }
  $actual = @($Value)
  if ($actual.Count -ne $Expected.Count) { return $false }
  for ($index = 0; $index -lt $Expected.Count; $index += 1) {
    if ($actual[$index] -isnot [string] -or $actual[$index] -cne $Expected[$index]) { return $false }
  }
  return $true
}

# kind/length/SHA одного файла: absent = длина 0 и sha256 null; regular = длина ≥1 и hex64.
function Test-KindLengthSha([object]$Fact, [string[]]$Names) {
  if (-not (Get-ExactProperties $Fact $Names) -or $Fact.kind -isnot [string]) { return $false }
  if ($Fact.kind -ceq 'absent') {
    return (Test-BoundedInteger $Fact.length 0 0) -and $null -eq $Fact.sha256
  }
  return $Fact.kind -ceq 'regular' -and (Test-BoundedInteger $Fact.length 1 $MaxLength) -and
    (Test-Sha256 $Fact.sha256)
}

function Test-AggregatePhases([object]$Value) {
  if (-not (Test-ObjectArray $Value)) { return $false }
  $phases = @($Value)
  if ($phases.Count -ne $PhaseModes.Count) { return $false }
  $names = @('name', 'eventKinds', 'pid', 'starttime', 'processNameSha256', 'launchNonceSha256', 'runtimeIdentitySha256')
  $seen = @()
  for ($index = 0; $index -lt $PhaseModes.Count; $index += 1) {
    $phase = $phases[$index]
    if (-not (Get-ExactProperties $phase $names) -or
        $phase.name -isnot [string] -or $phase.name -cne $PhaseModes[$index] -or
        -not (Test-ExactStringArray $phase.eventKinds $PhaseEvents[$PhaseModes[$index]]) -or
        -not (Test-BoundedInteger $phase.pid 1 2147483647) -or
        $phase.starttime -isnot [string] -or $phase.starttime -cnotmatch $Decimal -or
        -not (Test-Sha256 $phase.processNameSha256) -or $phase.processNameSha256 -cne $ProcessNameSha256 -or
        -not (Test-Sha256 $phase.launchNonceSha256) -or -not (Test-Sha256 $phase.runtimeIdentitySha256)) {
      return $false
    }
    foreach ($identity in @(
        "process|$($phase.pid)|$($phase.starttime)", "nonce|$($phase.launchNonceSha256)",
        "runtime|$($phase.runtimeIdentitySha256)")) {
      if ($seen -ccontains $identity) { return $false }
      $seen += $identity
    }
  }
  return $true
}

function Test-CommittedWalFamily([object]$Value) {
  if (-not (Test-ObjectArray $Value)) { return $false }
  $facts = @($Value)
  $members = @('main', 'wal', 'shm', 'journal')
  if ($facts.Count -ne $members.Count) { return $false }
  for ($index = 0; $index -lt $members.Count; $index += 1) {
    $fact = $facts[$index]
    if (-not (Test-KindLengthSha $fact @('member', 'kind', 'length', 'sha256')) -or
        $fact.member -isnot [string] -or $fact.member -cne $members[$index]) {
      return $false
    }
  }
  return $true
}

function Test-AggregateStructure([object]$Aggregate) {
  $properties = @('accepted', 'phaseCount', 'dirtyDeltaFrameCount', 'cipherIntegrityErrorCount', 'abi') +
    $AggregateTrueFacts + $AggregateHashFacts + @($AggregateExactCounts.Keys) + $AggregateStructuredFacts
  if (-not (Get-ExactProperties $Aggregate $properties) -or
      -not (Test-Boolean $Aggregate.accepted) -or
      -not (Test-BoundedInteger $Aggregate.phaseCount 0 6) -or
      -not (Test-BoundedInteger $Aggregate.dirtyDeltaFrameCount 0 2147483647) -or
      -not (Test-BoundedInteger $Aggregate.cipherIntegrityErrorCount 0 2147483647) -or
      -not (Test-BoundedInteger $Aggregate.dirtyWalPreFrameCount 0 2147483647) -or
      -not (Test-BoundedInteger $Aggregate.dirtyWalPostFrameCount 0 2147483647) -or
      -not (Test-AggregatePhases $Aggregate.phases) -or
      -not (Test-KindLengthSha $Aggregate.dirtyWalBaselineFact @('kind', 'length', 'sha256')) -or
      -not (Test-KindLengthSha $Aggregate.dirtyWalAfterFact @('kind', 'length', 'sha256')) -or
      -not (Test-CommittedWalFamily $Aggregate.committedWalFamilyFacts) -or
      -not (Test-Boolean $Aggregate.cleanupComplete) -or
      $Aggregate.abi -isnot [string]) {
    return $false
  }
  foreach ($name in $AggregateExactCounts.Keys) {
    if (-not (Test-BoundedInteger $Aggregate.$name 0 2147483647)) { return $false }
  }
  foreach ($name in $AggregateTrueFacts) {
    if (-not (Test-Boolean $Aggregate.$name)) { return $false }
  }
  foreach ($name in $AggregateHashFacts) {
    if (-not (Test-Sha256 $Aggregate.$name)) { return $false }
  }
  return $true
}

function Test-AggregatePassFacts([object]$Aggregate) {
  foreach ($name in $AggregateTrueFacts) {
    if ($Aggregate.$name -ne $true) { return $false }
  }
  foreach ($name in $AggregateExactCounts.Keys) {
    if ($Aggregate.$name -ne $AggregateExactCounts[$name]) { return $false }
  }
  $baseline = $Aggregate.dirtyWalBaselineFact
  $after = $Aggregate.dirtyWalAfterFact
  $family = @($Aggregate.committedWalFamilyFacts)
  # Кадры WAL: post − pre обязано точно равняться дельте; отсутствующий baseline = 0 кадров.
  return $Aggregate.accepted -eq $true -and $Aggregate.phaseCount -eq 6 -and
    $Aggregate.dirtyDeltaFrameCount -ge 1 -and
    ($Aggregate.dirtyWalPostFrameCount - $Aggregate.dirtyWalPreFrameCount) -eq $Aggregate.dirtyDeltaFrameCount -and
    ($baseline.kind -cne 'absent' -or $Aggregate.dirtyWalPreFrameCount -eq 0) -and
    $after.kind -ceq 'regular' -and $after.length -gt $baseline.length -and
    $family[0].kind -ceq 'regular' -and $family[1].kind -ceq 'regular' -and
    $Aggregate.cleanupComplete -eq $true -and
    $Aggregate.cipherIntegrityErrorCount -eq 0 -and
    $Aggregate.abi -ceq 'x86_64'
}

function Test-Aggregate([object]$Aggregate, [string]$Status) {
  if (-not (Test-AggregateStructure $Aggregate)) { return $false }
  if ($Status -ceq 'pass') { return Test-AggregatePassFacts $Aggregate }
  return $Status -ceq 'failure' -and $Aggregate.accepted -eq $false
}

function Invoke-EvidencePublication([object]$Payload) {
  if (-not (Get-ExactProperties $Payload @('status', 'aggregate', 'cleanup')) -or
      $Payload.status -isnot [string] -or
      -not (Test-Aggregate $Payload.aggregate $Payload.status) -or
      -not (Test-CleanupOutcome $Payload.cleanup) -or
      ($Payload.status -ceq 'pass' -and $Payload.cleanup.campaignStatus -cne 'pass') -or
      ($Payload.status -ceq 'failure' -and $Payload.cleanup.campaignStatus -cne 'failure')) {
    Stop-Fixed 'evidence_publication_invalid'
  }
  Write-Pass
}

if ([string]::IsNullOrEmpty($LibraryMode)) { Stop-Fixed 'device_campaign_not_authorized' }
if ([string]::IsNullOrEmpty($PayloadBase64)) { Stop-Fixed 'library_payload_invalid' }
try {
  if ($PayloadBase64 -ceq '__STDIN__') { $PayloadBase64 = [Console]::In.ReadToEnd() }
  $payloadJson = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($PayloadBase64))
  $payload = $payloadJson | ConvertFrom-Json
} catch {
  Stop-Fixed 'library_payload_invalid'
}

switch ($LibraryMode) {
  'WalDelta' { Invoke-WalDelta $payload }
  'PhaseTranscript' { Invoke-PhaseTranscript $payload }
  'KillBinding' { Invoke-KillBinding $payload }
  'ProcDisappearance' { Invoke-ProcDisappearance $payload }
  'FamilyPath' { Invoke-FamilyPath $payload }
  'FileFact' { Invoke-FileFact $payload }
  'RecoveryOrdering' { Invoke-RecoveryOrdering $payload }
  'CleanupOutcome' { Invoke-CleanupOutcome $payload }
  'EvidencePublication' { Invoke-EvidencePublication $payload }
  default { Stop-Fixed 'library_mode_invalid' }
}
