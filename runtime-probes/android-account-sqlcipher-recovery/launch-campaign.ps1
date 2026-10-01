[CmdletBinding()]
param(
  [string]$Authorization,
  [string]$Serial,
  [string]$EvidenceDirectory,
  # зачем: ремонт №2 — по умолчанию проба подаётся через собственный прокси точки входа
  # (entry-proxy.js), общий package.json не трогается. PackageSwap — только явный запасной
  # режим (прежний, доказанный на устройстве путь).
  [ValidateSet('EntryProxy', 'PackageSwap')]
  [string]$EntryMode = 'EntryProxy'
)

# зачем: хост-лаунчер WAL-кампании (пакет Codex ACCOUNT_ANDROID_SQLCIPHER_WAL_RECOVERY_PACKET §5).
# Владелец 2026-09-30 разрешил эмулятор; без точного токена авторизации лаунчер закрыт так же,
# как раннер (device_campaign_not_authorized). Все факты устройства проходят через те же
# ревьюированные валидаторы run-proof.ps1 (LibraryMode), а не через собственные проверки.
Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'

$CampaignToken = 'wal-campaign-authorized-by-owner-2026-09-30'

function Stop-Fixed([string]$Code) {
  [Console]::Error.WriteLine($Code)
  exit 1
}

if ($Authorization -cne $CampaignToken) { Stop-Fixed 'device_campaign_not_authorized' }
if ($Serial -cnotmatch '^emulator-[0-9]{4,5}\z') { Stop-Fixed 'serial_invalid' }

$script:Repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:Runner = Join-Path $PSScriptRoot 'run-proof.ps1'
$script:Adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$script:PackageName = 'app.phraseman'
$script:ProbeEntry = 'runtime-probes/android-account-sqlcipher-recovery/index.js'
$script:Selector = 'files/SQLite/accounts-v2/accounts-v2-g-588b372845f968ba31b0e12c84bb17559ce7dc6de13247456e6cae9e3e971643.db'
$script:Members = [ordered]@{ main = ''; wal = '-wal'; shm = '-shm'; journal = '-journal' }
$script:Canary = 'account_sqlcipher_wal_recovery_public_canary_v1'
$script:PacketPath = 'C:\Users\badlo\Documents\Codex\2026-09-22\new-chat\outputs\ACCOUNT_ANDROID_SQLCIPHER_WAL_RECOVERY_PACKET.md'
$script:PacketSha256 = 'a1161b298d390695fae2a2f63127a3faea3c4b7c8ffc9e4e1ebf8d2399a02353'
$script:Modes = @('prepare', 'dirty-hold', 'rollback-verify', 'committed-wal-hold', 'recovery-verify', 'final-reopen')
$script:PassMarkers = @{
  'prepare' = 'account_sqlcipher_recovery_prepare_pass'
  'dirty-hold' = 'account_sqlcipher_recovery_dirty_ready'
  'rollback-verify' = 'account_sqlcipher_recovery_rollback_pass'
  'committed-wal-hold' = 'account_sqlcipher_recovery_committed_wal_ready'
  'recovery-verify' = 'account_sqlcipher_recovery_recovery_pass'
  'final-reopen' = 'account_sqlcipher_recovery_final_reopen_pass'
}
$script:PassEvents = @{
  'prepare' = 'prepare-pass'
  'dirty-hold' = 'dirty-ready'
  'rollback-verify' = 'rollback-pass'
  'committed-wal-hold' = 'committed-wal-ready'
  'recovery-verify' = 'recovery-pass'
  'final-reopen' = 'final-reopen-pass'
}
$script:AuthoritativeMarker = 'account_sqlcipher_recovery_authoritative_read'
$script:CheckpointedMarker = 'account_sqlcipher_recovery_checkpointed'
$script:ProbeFailureCodes = @(
  'account_sqlcipher_recovery_request_invalid', 'account_sqlcipher_recovery_invalid_mode',
  'account_sqlcipher_recovery_restart_required', 'account_sqlcipher_recovery_open_failed',
  'account_sqlcipher_recovery_unsupported', 'account_sqlcipher_recovery_key_failed',
  'account_sqlcipher_recovery_cipher_unavailable', 'account_sqlcipher_recovery_pragma_failed',
  'account_sqlcipher_recovery_schema_failed', 'account_sqlcipher_recovery_write_failed',
  'account_sqlcipher_recovery_atomic_invariant_failed', 'account_sqlcipher_recovery_commit_failed',
  'account_sqlcipher_recovery_quick_check_failed', 'account_sqlcipher_recovery_integrity_failed',
  'account_sqlcipher_recovery_checkpoint_failed', 'account_sqlcipher_recovery_revoke_failed',
  'account_sqlcipher_recovery_close_failed', 'account_sqlcipher_recovery_close_ineffective',
  'account_sqlcipher_recovery_emit_failed', 'account_sqlcipher_recovery_failed'
)

$script:Stage = 'preflight'
$script:FamilyMayExist = $false
$script:MetroProcess = $null
$script:MetroStartTime = $null
$script:EntryProxyProcess = $null
$script:EntryProxyStartTime = $null
$script:DevicePort = 8081
$script:MetroPort = 8081
if ($EntryMode -ceq 'EntryProxy') { $script:MetroPort = 8082 }
$script:HostSetupReached = $false
$script:ReverseOwned = $false
$script:PackageSwap = $null
$script:Trace = [Collections.Generic.List[string]]::new()
$script:TempRoot = $null

# ---------- общие помощники ----------

function Write-Trace([string]$Line) {
  # зачем: правило владельца «сперва логи» — каждый шаг кампании пишет одну строку с
  # единым префиксом; в трассе только фиксированная лексика, числа и хэши (без путей,
  # ключей, байтов базы).
  $entry = '[WAL-CAMPAIGN] ' + [DateTime]::UtcNow.ToString('HH:mm:ss.fff') + ' ' + $script:Stage + ' ' + $Line
  $script:Trace.Add($entry)
  [Console]::Out.WriteLine($entry)
}

function Get-BytesSha256([byte[]]$Bytes) {
  $hasher = [Security.Cryptography.SHA256]::Create()
  try { return -join ($hasher.ComputeHash($Bytes) | ForEach-Object { $_.ToString('x2') }) } finally { $hasher.Dispose() }
}

function Get-TextSha256([string]$Text) { return Get-BytesSha256 ([Text.Encoding]::UTF8.GetBytes($Text)) }

function Get-FileSha256([string]$Path) { return Get-BytesSha256 ([IO.File]::ReadAllBytes($Path)) }

function New-Hex32 {
  $bytes = New-Object byte[] 16
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return -join ($bytes | ForEach-Object { $_.ToString('x2') })
}

function ConvertTo-WindowsArgument([string]$Value) {
  if ($Value -cmatch '^[A-Za-z0-9._:/=@%+,\-]+$') { return $Value }
  if ($Value.Contains('"') -or $Value.EndsWith('\')) { throw 'argument_unquotable' }
  return '"' + $Value + '"'
}

function Invoke-Process([string]$FileName, [string[]]$Arguments, [int]$TimeoutMs, [bool]$Binary, [string]$StdinText) {
  $info = [Diagnostics.ProcessStartInfo]::new($FileName)
  $info.Arguments = (@($Arguments | ForEach-Object { ConvertTo-WindowsArgument $_ }) -join ' ')
  $info.UseShellExecute = $false
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  $info.RedirectStandardInput = $null -ne $StdinText
  $info.CreateNoWindow = $true
  if (-not $Binary) { $info.StandardOutputEncoding = [Text.UTF8Encoding]::new($false) }
  $process = [Diagnostics.Process]::Start($info)
  try {
    $errTask = $process.StandardError.ReadToEndAsync()
    $memory = $null
    $outTask = $null
    if ($Binary) {
      $memory = [IO.MemoryStream]::new()
      $copyTask = $process.StandardOutput.BaseStream.CopyToAsync($memory)
    } else {
      $outTask = $process.StandardOutput.ReadToEndAsync()
    }
    if ($null -ne $StdinText) {
      $process.StandardInput.Write($StdinText)
      $process.StandardInput.Close()
    }
    if (-not $process.WaitForExit($TimeoutMs)) {
      try { $process.Kill() } catch { Write-Trace 'process_kill_after_timeout_failed' }
      throw 'process_timeout'
    }
    $process.WaitForExit()
    if ($Binary) {
      $copyTask.Wait()
      $stdoutValue = $memory.ToArray()
    } else {
      $stdoutValue = $outTask.Result
    }
    return [pscustomobject]@{ ExitCode = $process.ExitCode; Stdout = $stdoutValue; Stderr = $errTask.Result }
  } finally {
    $process.Dispose()
  }
}

function Invoke-Adb([string[]]$Arguments, [string]$Code, [int]$TimeoutMs = 60000) {
  $result = Invoke-Process $script:Adb (@('-s', $Serial) + $Arguments) $TimeoutMs $false $null
  if ($result.ExitCode -ne 0) {
    Write-Trace ("adb_failed code=$Code exit=" + $result.ExitCode)
    throw $Code
  }
  return @(($result.Stdout -replace "`r", '') -split "`n" | Where-Object { $_ -ne '' })
}

function Invoke-AdbRaw([string[]]$Arguments, [int]$TimeoutMs = 60000) {
  return Invoke-Process $script:Adb (@('-s', $Serial) + $Arguments) $TimeoutMs $false $null
}

function Invoke-Validator([string]$Mode, [object]$Payload) {
  $json = ConvertTo-Json -InputObject $Payload -Depth 12 -Compress
  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
  $result = Invoke-Process 'powershell.exe' @(
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', $script:Runner,
    '-LibraryMode', $Mode, '-PayloadBase64', '__STDIN__'
  ) 900000 $false $encoded
  if ($result.ExitCode -ne 0) {
    $code = ($result.Stderr -replace '\s', '')
    if ($code -cnotmatch '^[a-z_]{3,64}$') { $code = 'validator_failed' }
    Write-Trace ("validator_rejected mode=$Mode code=$code")
    throw $code
  }
  Write-Trace ("validator_pass mode=$Mode")
  return ($result.Stdout | ConvertFrom-Json)
}

# ---------- устройство: процесс, файлы, логи ----------

function Get-FamilyPath([string]$Member) { return $script:Selector + $script:Members[$Member] }

function Get-MemberFact([string]$Member) {
  $path = Get-FamilyPath $Member
  $stat = Invoke-AdbRaw @('shell', 'run-as', $script:PackageName, 'stat', '-c', '%F:%s', $path)
  if ($stat.ExitCode -ne 0) {
    if ($stat.Stderr -match 'No such file' -or $stat.Stdout -match 'No such file') {
      return [pscustomobject][ordered]@{ member = $Member; kind = 'absent'; length = 0; sha256 = $null; bytes = $null }
    }
    throw 'family_stat_failed'
  }
  $line = ($stat.Stdout -replace "`r", '').Trim()
  $match = [regex]::Match($line, '^(regular file|regular empty file|symbolic link|directory|[a-z ]+):([0-9]+)$')
  if (-not $match.Success) { throw 'family_stat_invalid' }
  if ($match.Groups[1].Value -cne 'regular file' -and $match.Groups[1].Value -cne 'regular empty file') {
    Write-Trace ("family_member_not_regular member=$Member")
    throw 'family_member_not_regular'
  }
  $length = [long]$match.Groups[2].Value
  $raw = Invoke-Process $script:Adb @('-s', $Serial, 'exec-out', 'run-as', $script:PackageName, 'cat', $path) 120000 $true $null
  if ($raw.ExitCode -ne 0) { throw 'family_read_failed' }
  [byte[]]$bytes = $raw.Stdout
  if ($bytes.Length -ne $length) {
    Write-Trace ("family_length_mismatch member=$Member stat=$length read=" + $bytes.Length)
    throw 'family_length_mismatch'
  }
  $sha = $null
  if ($bytes.Length -gt 0) { $sha = Get-BytesSha256 $bytes }
  return [pscustomobject][ordered]@{ member = $Member; kind = 'regular'; length = $length; sha256 = $sha; bytes = $bytes }
}

function Test-CanaryAbsent([byte[]]$Bytes) {
  if ($null -eq $Bytes -or $Bytes.Length -eq 0) { return $true }
  $text = [Text.Encoding]::GetEncoding(28591).GetString($Bytes)
  return $text.IndexOf($script:Canary, [StringComparison]::Ordinal) -lt 0
}

function Get-SinglePid {
  $lines = @(Invoke-Adb @('shell', 'pidof', $script:PackageName) 'pid_lookup_failed')
  if ($lines.Count -ne 1 -or $lines[0].Trim() -cnotmatch '^[1-9][0-9]*$') { throw 'pid_not_unique' }
  return [int]$lines[0].Trim()
}

function Get-ProcessBinding([int]$ProcessId) {
  $stat = (@(Invoke-Adb @('shell', 'run-as', $script:PackageName, 'cat', "/proc/$ProcessId/stat") 'proc_stat_failed') -join '')
  $match = [regex]::Match($stat, '^([0-9]+) \((.+)\) (.+)$')
  if (-not $match.Success -or [int]$match.Groups[1].Value -ne $ProcessId) { throw 'proc_stat_invalid' }
  $tail = $match.Groups[3].Value -split ' '
  if ($tail.Count -lt 20 -or $tail[19] -cnotmatch '^[1-9][0-9]*$') { throw 'proc_starttime_invalid' }
  $cmdline = (@(Invoke-Adb @('shell', 'run-as', $script:PackageName, 'cat', "/proc/$ProcessId/cmdline") 'proc_cmdline_failed') -join '')
  if (($cmdline -replace "`0", '') -cne $script:PackageName) { throw 'proc_name_invalid' }
  return [pscustomobject]@{ pid = $ProcessId; starttime = $tail[19] }
}

function Test-ProcPresent([int]$ProcessId) {
  $lines = @(Invoke-Adb @('shell', "if [ -d /proc/$ProcessId ]; then echo present; else echo absent; fi") 'proc_observation_failed')
  if ($lines.Count -ne 1) { throw 'proc_observation_invalid' }
  if ($lines[0].Trim() -ceq 'present') { return $true }
  if ($lines[0].Trim() -ceq 'absent') { return $false }
  throw 'proc_observation_invalid'
}

function Get-ProbeLines([int]$ProcessId) {
  $result = Invoke-AdbRaw @('logcat', '-d', '-v', 'raw', "--pid=$ProcessId", '-s', 'ReactNativeJS:V') 30000
  if ($result.ExitCode -ne 0) { throw 'logcat_failed' }
  return @(($result.Stdout -replace "`r", '') -split "`n" | ForEach-Object { $_.Trim() } |
    Where-Object { $_ -cmatch '^account_sqlcipher_recovery_[a-z_]+(\|[a-z0-9.\-]+)*$' })
}

function Assert-NoProbeFailure([string[]]$Lines) {
  foreach ($line in $Lines) {
    if ($script:ProbeFailureCodes -ccontains $line) {
      Write-Trace ("probe_reported code=$line")
      throw $line
    }
  }
}

function Wait-ProbeLine([int]$ProcessId, [string]$Expected, [int]$TimeoutSeconds) {
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  while ([DateTime]::UtcNow -lt $deadline) {
    $lines = @(Get-ProbeLines $ProcessId)
    Assert-NoProbeFailure $lines
    $hits = @($lines | Where-Object { $_ -ceq $Expected })
    if ($hits.Count -gt 1) { throw 'marker_duplicated' }
    if ($hits.Count -eq 1) { return $lines }
    Start-Sleep -Milliseconds 500
  }
  Write-Trace ("marker_timeout expected=" + ($Expected -split '\|')[0])
  throw 'marker_timeout'
}

function Get-BoundLine([string]$Marker, [object]$Binding, [string]$Mode) {
  return (@($Marker, $script:PackageName, $script:PackageName, [string]$Binding.pid, $Binding.starttime,
      $Binding.launchNonce, $Binding.runtimeIdentity, $Mode) -join '|')
}

function Send-View([string]$Url, [string]$Code) {
  # зачем: URL уходит в удалённый sh одним аргументом в одинарных кавычках; все части URL
  # заранее проверены (фиксированная лексика, hex, десятичные), кавычек в них нет.
  if ($Url -cnotmatch '^phraseman://_account_v2_sqlcipher_recovery_probe\?[A-Za-z0-9=&.\-]+$') { throw 'url_invalid' }
  Invoke-Adb @('shell', "am start -W -a android.intent.action.VIEW -d '$Url' $($script:PackageName)") $Code 60000 | Out-Null
}

function Wait-ProcGone([int]$ProcessId, [bool]$InitialPresent) {
  # зачем: первая выборка — реальное наблюдение ДО kill/force-stop, а не допущение.
  $samples = [Collections.Generic.List[bool]]::new()
  $samples.Add($InitialPresent)
  $deadline = [DateTime]::UtcNow.AddSeconds(20)
  while ([DateTime]::UtcNow -lt $deadline) {
    $present = Test-ProcPresent $ProcessId
    $samples.Add($present)
    if (-not $present) { break }
    Start-Sleep -Milliseconds 200
  }
  $pidLines = @(Invoke-Adb @('shell', "pidof $($script:PackageName) || true") 'pid_lookup_failed')
  $nextLaunch = $pidLines.Count -gt 0
  Invoke-Validator 'ProcDisappearance' @{ samples = $samples.ToArray(); nextLaunchObserved = $nextLaunch } | Out-Null
}

# ---------- владение хостом: package.json, Metro, reverse ----------

function Enter-PackageSwap {
  $path = Join-Path $script:Repo 'package.json'
  [byte[]]$original = [IO.File]::ReadAllBytes($path)
  $text = [Text.Encoding]::UTF8.GetString($original)
  $needle = '"main": "index.js"'
  $first = $text.IndexOf($needle, [StringComparison]::Ordinal)
  if ($first -lt 0 -or $text.IndexOf($needle, $first + 1, [StringComparison]::Ordinal) -ge 0) { throw 'package_main_not_unique' }
  $swapped = $text.Substring(0, $first) + '"main": "' + $script:ProbeEntry + '"' + $text.Substring($first + $needle.Length)
  [byte[]]$swappedBytes = [Text.UTF8Encoding]::new($false).GetBytes($swapped)
  # зачем: журнал с исходными байтами пишется ДО подмены — при обрыве процесса владелец
  # восстанавливает package.json из него (CAS: только если файл всё ещё наш).
  $journal = Join-Path $script:TempRoot 'package.json.original'
  [IO.File]::WriteAllBytes($journal, $original)
  [IO.File]::WriteAllBytes($path, $swappedBytes)
  $script:PackageSwap = [pscustomobject]@{
    Path = $path; Journal = $journal; OriginalSha = (Get-BytesSha256 $original); SwappedSha = (Get-BytesSha256 $swappedBytes)
  }
  Write-Trace ('package_swapped original=' + $script:PackageSwap.OriginalSha.Substring(0, 12))
}

function Exit-PackageSwap {
  # зачем: ремонт №2 — повторный прогон 2026-10-01 упал на уборке: WriteAllBytes бросил
  # IOException «user-mapped section» (package.json отображён в память чужим процессом),
  # и подменённый файл остался в общем дереве. Теперь: повтор с нарастающей паузой до
  # ~60 с, без исключений наружу; при окончательной неудаче — громкий код, журнал остаётся.
  if ($null -eq $script:PackageSwap) { return $true }
  $deadline = [DateTime]::UtcNow.AddSeconds(60)
  $delayMs = 250
  $attempt = 0
  while ($true) {
    $attempt += 1
    try {
      $current = Get-FileSha256 $script:PackageSwap.Path
      if ($current -ceq $script:PackageSwap.OriginalSha) {
        Write-Trace "package_restored ok=True attempt=$attempt"
        $script:PackageSwap = $null
        return $true
      }
      if ($current -cne $script:PackageSwap.SwappedSha) {
        # зачем: файл поменяла другая сессия — не затираем чужую правку, журнал остаётся.
        Write-Trace 'package_restore_conflict package_restore_failed_journal_kept'
        return $false
      }
      [IO.File]::WriteAllBytes($script:PackageSwap.Path, [IO.File]::ReadAllBytes($script:PackageSwap.Journal))
    } catch {
      Write-Trace ("package_restore_retry attempt=$attempt type=" + $_.Exception.GetType().Name)
    }
    if ([DateTime]::UtcNow -ge $deadline) {
      Write-Trace ("package_restore_failed_journal_kept attempts=$attempt journal=" + (Split-Path -Leaf $script:PackageSwap.Journal))
      [Console]::Error.WriteLine('package_restore_failed_journal_kept')
      return $false
    }
    Start-Sleep -Milliseconds $delayMs
    $delayMs = [Math]::Min($delayMs * 2, 4000)
  }
}

function Test-PortListening([int]$Port) {
  $client = [Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync([Net.IPAddress]::Loopback, $Port)
    return ($task.Wait(500) -and $client.Connected)
  } catch {
    Write-Trace 'port_probe_refused'
    return $false
  } finally {
    $client.Dispose()
  }
}

function Start-OwnedMetro {
  if (Test-PortListening $script:DevicePort) { throw 'metro_port_busy' }
  if (Test-PortListening $script:MetroPort) { throw 'metro_port_busy' }
  $info = [Diagnostics.ProcessStartInfo]::new('node')
  $info.Arguments = 'node_modules/expo/bin/cli start --dev-client --localhost --port ' + $script:MetroPort + ' --max-workers 1'
  $info.WorkingDirectory = $script:Repo
  $info.UseShellExecute = $false
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  $info.CreateNoWindow = $true
  $info.EnvironmentVariables['NODE_OPTIONS'] = '--max-old-space-size=8192'
  $info.EnvironmentVariables['CI'] = '1'
  $info.EnvironmentVariables['EXPO_NO_TELEMETRY'] = '1'
  $script:MetroProcess = [Diagnostics.Process]::Start($info)
  $script:MetroStartTime = $script:MetroProcess.StartTime.ToUniversalTime().Ticks
  $script:MetroLog = Join-Path $script:TempRoot 'metro.log'
  $null = $script:MetroProcess.StandardOutput.BaseStream.CopyToAsync([IO.File]::Create($script:MetroLog))
  $null = $script:MetroProcess.StandardError.BaseStream.CopyToAsync([IO.File]::Create($script:MetroLog + '.err'))
  $deadline = [DateTime]::UtcNow.AddSeconds(240)
  while ([DateTime]::UtcNow -lt $deadline) {
    if ($script:MetroProcess.HasExited) { throw 'metro_early_exit' }
    if (Test-PortListening $script:MetroPort) { Write-Trace ('metro_ready pid=' + $script:MetroProcess.Id + ' port=' + $script:MetroPort); return }
    Start-Sleep -Milliseconds 1000
  }
  throw 'metro_readiness_timeout'
}

function Stop-OwnedProcessTree([Diagnostics.Process]$Process, [object]$StartTicks, [string]$Label) {
  if ($null -eq $Process) { return $true }
  try {
    if (-not $Process.HasExited) {
      # зачем: ревью P3 — PID мог быть переиспользован; убиваем дерево только если
      # процесс с этим PID стартовал в тот же момент, что и наш.
      $current = [Diagnostics.Process]::GetProcessById($Process.Id)
      $currentStart = $current.StartTime.ToUniversalTime().Ticks
      if ($currentStart -ne $StartTicks) {
        Write-Trace "${Label}_identity_mismatch"
        return $false
      }
      $kill = Invoke-Process 'taskkill.exe' @('/PID', [string]$Process.Id, '/T', '/F') 30000 $false $null
      Write-Trace ("${Label}_stop exit=" + $kill.ExitCode)
    }
    return $true
  } catch {
    Write-Trace "${Label}_stop_failed"
    return $false
  }
}

function Stop-OwnedMetro {
  $stopped = Stop-OwnedProcessTree $script:MetroProcess $script:MetroStartTime 'metro'
  if ($stopped) { $script:MetroProcess = $null }
  return $stopped
}

function Start-OwnedEntryProxy {
  # зачем: ремонт №2 — прокси слушает порт устройства (8081 через adb reverse) и переписывает
  # только запрос виртуальной точки входа Expo на файл пробы; Metro живёт на 8082.
  $info = [Diagnostics.ProcessStartInfo]::new('node')
  $info.Arguments = 'runtime-probes/android-account-sqlcipher-recovery/entry-proxy.js ' + $script:DevicePort + ' ' + $script:MetroPort
  $info.WorkingDirectory = $script:Repo
  $info.UseShellExecute = $false
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  $info.CreateNoWindow = $true
  $script:EntryProxyProcess = [Diagnostics.Process]::Start($info)
  $script:EntryProxyStartTime = $script:EntryProxyProcess.StartTime.ToUniversalTime().Ticks
  $log = Join-Path $script:TempRoot 'entry-proxy.log'
  $null = $script:EntryProxyProcess.StandardOutput.BaseStream.CopyToAsync([IO.File]::Create($log))
  $null = $script:EntryProxyProcess.StandardError.BaseStream.CopyToAsync([IO.File]::Create($log + '.err'))
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  while ([DateTime]::UtcNow -lt $deadline) {
    if ($script:EntryProxyProcess.HasExited) { throw 'entry_proxy_early_exit' }
    if (Test-PortListening $script:DevicePort) { Write-Trace ('entry_proxy_ready pid=' + $script:EntryProxyProcess.Id); return }
    Start-Sleep -Milliseconds 300
  }
  throw 'entry_proxy_readiness_timeout'
}

function Stop-OwnedEntryProxy {
  $stopped = Stop-OwnedProcessTree $script:EntryProxyProcess $script:EntryProxyStartTime 'entry_proxy'
  if ($stopped) { $script:EntryProxyProcess = $null }
  return $stopped
}

# ---------- фазы ----------

function New-Binding([object]$Process, [string]$Nonce, [string]$Runtime) {
  return [ordered]@{
    family = $script:Selector; packageName = $script:PackageName; processName = $script:PackageName
    pid = [int]$Process.pid; starttime = [string]$Process.starttime; launchNonce = $Nonce; runtimeIdentity = $Runtime
  }
}

function Invoke-Kill([object]$Binding, [string]$Mode) {
  $observed = Get-ProcessBinding ([int]$Binding.pid)
  $observedBinding = New-Binding $observed $Binding.launchNonce $Binding.runtimeIdentity
  Invoke-Validator 'KillBinding' @{ expected = $Binding; observed = $observedBinding; signal = 9; owner = $script:PackageName } | Out-Null
  $present = Test-ProcPresent ([int]$Binding.pid)
  Write-Trace ("sigkill_sent mode=$Mode pid=" + $Binding.pid)
  Invoke-Adb @('shell', 'run-as', $script:PackageName, 'kill', '-9', [string]$Binding.pid) 'sigkill_failed' | Out-Null
  return $present
}

function Invoke-Phase([string]$Mode, [int]$Index) {
  $script:Stage = "phase-$Index-$Mode"
  $events = [Collections.Generic.List[string]]::new()
  $phaseFacts = @{}
  Invoke-Adb @('logcat', '-c') 'logcat_clear_failed' | Out-Null
  Invoke-Adb @('shell', 'am', 'force-stop', $script:PackageName) 'force_stop_failed' | Out-Null
  $script:FamilyMayExist = $true
  Send-View "phraseman://_account_v2_sqlcipher_recovery_probe?command=bootstrap&mode=$Mode" 'bootstrap_send_failed'
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  $processId = 0
  while ([DateTime]::UtcNow -lt $deadline) {
    try { $processId = Get-SinglePid; break } catch { Write-Trace 'pid_not_yet_unique'; Start-Sleep -Milliseconds 300 }
  }
  if ($processId -le 0) { throw 'phase_pid_invalid' }
  $process = Get-ProcessBinding $processId
  $bootTimeout = 120
  if ($Index -eq 0) { $bootTimeout = 420 }
  $bootstrapPattern = '^account_sqlcipher_recovery_bootstrap_acknowledged\|([0-9a-f]{32})\|' + [regex]::Escape($Mode) + '$'
  $runtime = $null
  $bootDeadline = [DateTime]::UtcNow.AddSeconds($bootTimeout)
  while ([DateTime]::UtcNow -lt $bootDeadline -and $null -eq $runtime) {
    $lines = @(Get-ProbeLines $processId)
    Assert-NoProbeFailure $lines
    $acks = @($lines | Where-Object { $_ -cmatch $bootstrapPattern })
    if ($acks.Count -gt 1) { throw 'bootstrap_ack_duplicated' }
    if ($acks.Count -eq 1) { $runtime = [regex]::Match($acks[0], $bootstrapPattern).Groups[1].Value }
    else { Start-Sleep -Milliseconds 500 }
  }
  if ($null -eq $runtime) { Write-Trace 'bootstrap_ack_timeout'; throw 'bootstrap_ack_timeout' }
  # PID/starttime сверяются ещё раз после ack: процесс, приславший ack, тот же.
  $recheck = Get-ProcessBinding $processId
  if ($recheck.starttime -cne $process.starttime) { throw 'pid_reused' }
  $nonce = New-Hex32
  $binding = New-Binding $process $nonce $runtime
  $events.Add('bootstrap-ack')
  Write-Trace ("bootstrap_ack pid=$processId starttime=" + $process.starttime)

  if ($Mode -ceq 'dirty-hold') {
    $baseline = Get-MemberFact 'wal'
    $phaseFacts.baseline = $baseline
    $events.Add('baseline-bound')
    Write-Trace ('baseline_bound kind=' + $baseline.kind + ' length=' + $baseline.length)
  }

  $launchUrl = 'phraseman://_account_v2_sqlcipher_recovery_probe?command=launch&mode=' + $Mode +
    '&packageName=' + $script:PackageName + '&processName=' + $script:PackageName + '&pid=' + $processId +
    '&starttime=' + $process.starttime + '&launchNonce=' + $nonce + '&runtimeIdentity=' + $runtime
  Send-View $launchUrl 'launch_send_failed'
  $events.Add('launch-sent')
  Write-Trace 'launch_sent'
  Wait-ProbeLine $processId (Get-BoundLine 'account_sqlcipher_recovery_launch_acknowledged' $binding $Mode) 60 | Out-Null
  $events.Add('launch-ack')

  $passLine = Get-BoundLine $script:PassMarkers[$Mode] $binding $Mode
  $lines = @(Wait-ProbeLine $processId $passLine 180)
  if ($Mode -ceq 'recovery-verify') {
    $authoritative = [array]::IndexOf($lines, (Get-BoundLine $script:AuthoritativeMarker $binding $Mode))
    $checkpointed = [array]::IndexOf($lines, (Get-BoundLine $script:CheckpointedMarker $binding $Mode))
    $pass = [array]::IndexOf($lines, $passLine)
    if ($authoritative -lt 0 -or $checkpointed -le $authoritative -or $pass -le $checkpointed) {
      Write-Trace "recovery_order_invalid read=$authoritative checkpoint=$checkpointed pass=$pass"
      throw 'checkpoint_order_invalid'
    }
    $events.Add('authoritative-read')
    $events.Add('checkpoint')
  }
  $events.Add($script:PassEvents[$Mode])
  Write-Trace ('marker ' + $script:PassEvents[$Mode])

  if ($Mode -ceq 'dirty-hold') {
    $after = Get-MemberFact 'wal'
    if ($after.kind -cne 'regular' -or $after.length -le 0) { throw 'wal_delta_missing' }
    $baselineBase64 = ''
    if ($phaseFacts.baseline.kind -ceq 'regular') { $baselineBase64 = [Convert]::ToBase64String($phaseFacts.baseline.bytes) }
    $delta = Invoke-Validator 'WalDelta' ([ordered]@{
        baselineKind = $phaseFacts.baseline.kind; baselineBase64 = $baselineBase64
        afterKind = $after.kind; afterBase64 = [Convert]::ToBase64String($after.bytes)
        baselineBinding = $binding; afterBinding = $binding
      })
    $phaseFacts.after = $after
    $phaseFacts.delta = $delta
    $events.Add('wal-delta-validated')
    Write-Trace ('wal_delta frames=' + $delta.deltaFrameCount + ' pre=' + $delta.baselineFrameCount + ' post=' + $delta.afterFrameCount)
    $present = Invoke-Kill $binding $Mode
    $events.Add('sigkill-sent')
    Wait-ProcGone $processId $present
    $events.Add('proc-gone')
  } elseif ($Mode -ceq 'committed-wal-hold') {
    $family = @(foreach ($member in $script:Members.Keys) { Get-MemberFact $member })
    $wal = $family[1]
    if ($wal.kind -cne 'regular' -or $wal.length -le 0) { throw 'committed_wal_absent' }
    foreach ($fact in @($family[0], $family[1])) {
      Invoke-Validator 'FileFact' ([ordered]@{
          kind = $fact.kind; isReparsePoint = $false; isSymlink = $false; length = $fact.length; sha256 = $fact.sha256
        }) | Out-Null
    }
    $canaryAbsent = (Test-CanaryAbsent $family[0].bytes) -and (Test-CanaryAbsent $family[1].bytes)
    if (-not $canaryAbsent) { throw 'plaintext_canary_present' }
    $phaseFacts.family = $family
    $events.Add('wal-present-validated')
    Write-Trace ('wal_present main=' + $family[0].length + ' wal=' + $wal.length + ' canaryAbsent=' + $canaryAbsent)
    $present = Invoke-Kill $binding $Mode
    $events.Add('sigkill-sent')
    Wait-ProcGone $processId $present
    $events.Add('proc-gone')
  } else {
    $present = Test-ProcPresent $processId
    Invoke-Adb @('shell', 'am', 'force-stop', $script:PackageName) 'force_stop_failed' | Out-Null
    Wait-ProcGone $processId $present
  }

  $eventObjects = @(foreach ($kind in $events) { [ordered]@{ kind = $kind; binding = $binding } })
  return [pscustomobject]@{
    Transcript = [ordered]@{ mode = $Mode; binding = $binding; events = $eventObjects; procDisappeared = $true }
    Facts = $phaseFacts
  }
}

# ---------- кастоди ----------

function Get-SourceFacts {
  $names = @('probe.ts', 'index.js', 'run-proof.ps1', 'launch-campaign.ps1', 'entry-proxy.js')
  $facts = [ordered]@{}
  foreach ($name in $names) { $facts[$name] = Get-FileSha256 (Join-Path $PSScriptRoot $name) }
  return $facts
}

function Get-NativeSha256 {
  $parts = @(
    (Get-FileSha256 (Join-Path $script:Repo 'patches\expo-sqlite+16.0.10.patch')),
    (Get-FileSha256 (Join-Path $script:Repo 'node_modules\expo-sqlite\package.json')),
    (Get-FileSha256 (Join-Path $script:Repo 'android\gradle.properties'))
  )
  return Get-TextSha256 ($parts -join '|')
}

function Get-InstalledApkSha256 {
  $paths = @(Invoke-Adb @('shell', 'pm', 'path', $script:PackageName) 'apk_path_failed')
  $base = @($paths | Where-Object { $_ -cmatch '^package:/data/app/.+/base\.apk$' })
  if ($base.Count -ne 1) { throw 'apk_path_invalid' }
  $line = @(Invoke-Adb @('shell', 'sha256sum', $base[0].Substring(8)) 'apk_hash_failed')
  $match = [regex]::Match(($line -join ''), '^([0-9a-f]{64})\s')
  if (-not $match.Success) { throw 'apk_hash_invalid' }
  return $match.Groups[1].Value
}

function Get-DeviceFacts {
  $read = { param($name) (@(Invoke-Adb @('shell', 'getprop', $name) 'device_identity_failed') -join '').Trim() }
  $facts = [ordered]@{
    model = (& $read 'ro.product.model')
    abi = (& $read 'ro.product.cpu.abi')
    sdk = (& $read 'ro.build.version.sdk')
    release = (& $read 'ro.build.version.release')
    fingerprintSha256 = (Get-TextSha256 (& $read 'ro.build.fingerprint'))
  }
  return $facts
}

# ---------- кампания ----------

$exitCode = 1
$failureCode = $null
$cleanupFailures = [Collections.Generic.List[string]]::new()
$phaseResults = @()
$receipt = $null
try {
  if (-not (Test-Path -LiteralPath $script:Adb)) { throw 'adb_missing' }
  if ((Get-FileSha256 $script:PacketPath) -cne $script:PacketSha256) { throw 'packet_hash_mismatch' }
  if ([string]::IsNullOrEmpty($EvidenceDirectory)) {
    $EvidenceDirectory = Join-Path $env:TEMP ('phraseman-wal-campaign\run-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + (New-Hex32))
  }
  if (Test-Path -LiteralPath $EvidenceDirectory) { throw 'evidence_directory_not_fresh' }
  [void](New-Item -ItemType Directory -Path $EvidenceDirectory)
  $script:TempRoot = $EvidenceDirectory

  $devices = @(@(Invoke-Process $script:Adb @('devices') 30000 $false $null).Stdout -split "`n" |
      ForEach-Object { $_.Trim() } | Where-Object { $_ -cmatch '\tdevice$' })
  if ($devices.Count -ne 1 -or $devices[0] -cne "$Serial`tdevice") { throw 'device_not_exclusive' }
  $device = Get-DeviceFacts
  if ($device.abi -cne 'x86_64') { throw 'device_abi_invalid' }
  Write-Trace ('device model=' + $device.model + ' abi=' + $device.abi + ' sdk=' + $device.sdk)
  $reverse = @(Invoke-Adb @('reverse', '--list') 'reverse_list_failed')
  if (@($reverse | Where-Object { $_ -match 'tcp:8081' }).Count -ne 0) { throw 'adb_reverse_preexisting' }
  foreach ($member in $script:Members.Keys) {
    if ((Get-MemberFact $member).kind -cne 'absent') { throw 'family_present_before_prepare' }
  }
  $sourceBefore = Get-SourceFacts
  $nativeBefore = Get-NativeSha256
  $apkBefore = Get-InstalledApkSha256
  $packageBefore = Get-FileSha256 (Join-Path $script:Repo 'package.json')
  Write-Trace "entry_mode=$EntryMode"

  $script:Stage = 'host-setup'
  # зачем: ревью P2 — до этой точки эмулятор может принадлежать другой сессии
  # (отказ preflight). Останавливать app.phraseman в уборке разрешено только после
  # того, как preflight доказал исключительность устройства.
  $script:HostSetupReached = $true
  if ($EntryMode -ceq 'PackageSwap') { Enter-PackageSwap }
  Start-OwnedMetro
  if ($EntryMode -ceq 'EntryProxy') { Start-OwnedEntryProxy }
  Invoke-Adb @('reverse', 'tcp:8081', 'tcp:8081') 'reverse_add_failed' | Out-Null
  $script:ReverseOwned = $true

  for ($index = 0; $index -lt $script:Modes.Count; $index += 1) {
    $phaseResults += Invoke-Phase $script:Modes[$index] $index
  }

  $script:Stage = 'aggregate'
  $transcript = [ordered]@{ phases = @($phaseResults | ForEach-Object { $_.Transcript }) }
  Invoke-Validator 'PhaseTranscript' $transcript | Out-Null
  $digest = Invoke-Validator 'TranscriptDigest' $transcript
  # зачем: ревью P3 — порядок «чтение до checkpoint» доказывают наблюдённые маркеры
  # authoritative-read/checkpoint в транскрипте фазы recovery-verify (PhaseTranscript выше);
  # подача постоянного списка в RecoveryOrdering ничего не доказывала и убрана.

  $dirty = $phaseResults[1].Facts
  $committed = $phaseResults[3].Facts
  $phases = @(for ($index = 0; $index -lt 6; $index += 1) {
      $entry = $phaseResults[$index].Transcript
      [ordered]@{
        name = $entry.mode
        eventKinds = @($entry.events | ForEach-Object { $_.kind })
        pid = [int]$entry.binding.pid
        starttime = $entry.binding.starttime
        processNameSha256 = (Get-TextSha256 $script:PackageName)
        launchNonceSha256 = (Get-TextSha256 $entry.binding.launchNonce)
        runtimeIdentitySha256 = (Get-TextSha256 $entry.binding.runtimeIdentity)
      }
    })
  $factOf = { param($fact) [ordered]@{ kind = $fact.kind; length = [long]$fact.length; sha256 = $fact.sha256 } }
  $sourceSha = Get-TextSha256 ((@($sourceBefore.Values)) -join '|')

  $script:Stage = 'cleanup'
  $appStopped = $true
  try { Invoke-Adb @('shell', 'am', 'force-stop', $script:PackageName) 'force_stop_failed' | Out-Null } catch { $appStopped = $false; $cleanupFailures.Add('app_stop_failed') }
  if ($script:ReverseOwned) {
    try { Invoke-Adb @('reverse', '--remove', 'tcp:8081') 'reverse_remove_failed' | Out-Null; $script:ReverseOwned = $false } catch { $cleanupFailures.Add('reverse_remove_failed') }
  }
  if (-not (Stop-OwnedEntryProxy)) { $cleanupFailures.Add('entry_proxy_stop_failed') }
  if (-not (Stop-OwnedMetro)) { $cleanupFailures.Add('metro_stop_failed') }
  $packageRestored = (Exit-PackageSwap) -and ((Get-FileSha256 (Join-Path $script:Repo 'package.json')) -ceq $packageBefore)
  if (-not $packageRestored) { $cleanupFailures.Add('package_restore_failed') }
  $sourceAfter = Get-SourceFacts
  $sourceRecaptured = (($sourceAfter.Values -join '|') -ceq ($sourceBefore.Values -join '|'))
  $nativeRecaptured = (Get-NativeSha256) -ceq $nativeBefore
  $apkAfter = Get-InstalledApkSha256
  $apkRecaptured = $apkAfter -ceq $apkBefore
  if ($cleanupFailures.Count -ne 0 -or -not $sourceRecaptured -or -not $nativeRecaptured -or -not $apkRecaptured) {
    throw 'custody_recapture_failed'
  }

  $aggregate = [ordered]@{
    schemaVersion = 1; accepted = $true; phaseCount = 6; phases = $phases
    # host-observed: порядок маркеров recovery-verify; канарейка проверена хостом в байтах main/WAL.
    checkpointAfterAuthoritativeRead = $true; plaintextCanaryAbsent = $true
    dirtyWalPreFrameCount = [int]$dirty.delta.baselineFrameCount
    dirtyWalPostFrameCount = [int]$dirty.delta.afterFrameCount
    dirtyDeltaFrameCount = [int]$dirty.delta.deltaFrameCount
    dirtyWalBaselineFact = (& $factOf $dirty.baseline)
    dirtyWalAfterFact = (& $factOf $dirty.after)
    committedWalFamilyFacts = @($committed.family | ForEach-Object { [ordered]@{ member = $_.member; kind = $_.kind; length = [long]$_.length; sha256 = $_.sha256 } })
    # probe-derived: хост не читает строки; значения требует сама проба перед PASS-маркером.
    rollbackDirtyBatchRowCount = 0; rollbackDirtyItemRowCount = 0
    recoveryCommittedBatchRowCount = 1; recoveryCommittedItemRowCount = 2
    cleanupComplete = $true
    dirtyWalPrefixMatch = [bool]$dirty.delta.prefixMatch; dirtyWalSaltsMatch = [bool]$dirty.delta.saltsMatch
    dirtyWalChecksumsValid = [bool]$dirty.delta.checksumsValid
    dirtyWalStructurallyComplete = [bool]$dirty.delta.structurallyComplete
    dirtyWalAllDeltaCommitMarkersZero = [bool]$dirty.delta.allDeltaCommitMarkersZero
    # probe-derived: quick_check/cipher_integrity_check проверяет проба перед PASS-маркером.
    quickCheckOk = $true; cipherIntegrityErrorCount = 0
    packetSha256 = $script:PacketSha256; sourceSha256 = $sourceSha
    launcherSha256 = $sourceBefore['launch-campaign.ps1']; nativeSha256 = $nativeBefore; apkSha256 = $apkBefore
    deviceIdentitySha256 = (Get-TextSha256 (@($device.model, $device.abi, $device.sdk, $device.fingerprintSha256) -join '|'))
    transcriptSha256 = $digest.transcriptSha256
    abi = $device.abi
  }

  # зачем: пакет §5 Phase 7 — удалять семейство базы можно только после принятия
  # aggregate; удаляем ровно четыре файла и доказываем отсутствие каждого.
  foreach ($member in $script:Members.Keys) {
    Invoke-Adb @('shell', 'run-as', $script:PackageName, 'rm', '-f', (Get-FamilyPath $member)) 'family_delete_failed' | Out-Null
  }
  $absent = @(foreach ($member in $script:Members.Keys) { [ordered]@{ member = $member; absent = ((Get-MemberFact $member).kind -ceq 'absent') } })
  $script:FamilyMayExist = $false
  $cleanup = [ordered]@{
    campaignStatus = 'pass'; familyMembers = $absent; partialDelete = $false; packageRestored = $packageRestored
    sourceRecaptured = $sourceRecaptured; nativeRecaptured = $nativeRecaptured; apkRecaptured = $apkRecaptured
    currentTempCleanupComplete = $true
  }
  $script:Stage = 'publication'
  Invoke-Validator 'CleanupOutcome' $cleanup | Out-Null
  Invoke-Validator 'EvidencePublication' ([ordered]@{ status = 'pass'; aggregate = $aggregate; cleanup = $cleanup; transcript = $transcript }) | Out-Null
  $receipt = [ordered]@{
    status = 'pass'; device = $device; aggregate = $aggregate; cleanup = $cleanup; transcript = $transcript
    sources = $sourceBefore; apkSha256After = $apkAfter
    probeDerivedFacts = @(
      'rollbackDirtyBatchRowCount', 'rollbackDirtyItemRowCount', 'recoveryCommittedBatchRowCount',
      'recoveryCommittedItemRowCount', 'quickCheckOk', 'cipherIntegrityErrorCount'
    )
  }
  $exitCode = 0
} catch {
  $failureCode = [string]$_.Exception.Message
  if ($failureCode -cnotmatch '^[a-z_]{3,80}$') {
    # зачем: «сперва логи» — непредвиденная ошибка обязана оставить след: тип и строку
    # лаунчера (без текста исключения: он может нести пути/данные устройства).
    Write-Trace ('unexpected_error type=' + $_.Exception.GetType().Name + ' line=' + $_.InvocationInfo.ScriptLineNumber)
    $failureCode = 'campaign_failed'
  }
  Write-Trace ("campaign_failed code=$failureCode")
} finally {
  if ($exitCode -ne 0) {
    $failedStage = $script:Stage
    $script:Stage = 'failure-cleanup'
    if ($script:HostSetupReached) {
      try { Invoke-Adb @('shell', 'am', 'force-stop', $script:PackageName) 'force_stop_failed' | Out-Null } catch { $cleanupFailures.Add('app_stop_failed') }
    } else {
      Write-Trace 'app_stop_skipped_preflight_refused'
    }
    if ($script:ReverseOwned) {
      try { Invoke-Adb @('reverse', '--remove', 'tcp:8081') 'reverse_remove_failed' | Out-Null } catch { $cleanupFailures.Add('reverse_remove_failed') }
    }
    if (-not (Stop-OwnedEntryProxy)) { $cleanupFailures.Add('entry_proxy_stop_failed') }
    if (-not (Stop-OwnedMetro)) { $cleanupFailures.Add('metro_stop_failed') }
    if (-not (Exit-PackageSwap)) { $cleanupFailures.Add('package_restore_failed_journal_kept') }
    # зачем: при провале семейство базы СОХРАНЯЕТСЯ целиком (пакет §5 Phase 7) —
    # частичное удаление уничтожило бы улики.
    $receipt = [ordered]@{
      status = 'failure'; code = $failureCode; stage = $failedStage
      familyPreserved = $script:FamilyMayExist; cleanupFailures = @($cleanupFailures)
    }
  }
  if ($null -ne $script:TempRoot -and (Test-Path -LiteralPath $script:TempRoot)) {
    $receiptJson = ConvertTo-Json -InputObject $receipt -Depth 12
    [IO.File]::WriteAllText((Join-Path $script:TempRoot 'receipt.json'), $receiptJson, [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllLines((Join-Path $script:TempRoot 'trace.log'), $script:Trace, [Text.UTF8Encoding]::new($false))
    [Console]::Out.WriteLine('[WAL-CAMPAIGN] evidence ' + $script:TempRoot)
  }
}
if ($exitCode -ne 0) { [Console]::Error.WriteLine($failureCode) }
exit $exitCode
