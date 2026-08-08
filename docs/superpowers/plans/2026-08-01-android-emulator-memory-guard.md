# Android Emulator Memory Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Android Emulator launch on this Windows workstation use the approved 8 GB guest RAM and 1 GB VM heap, including launches from Android Studio Device Manager, while leaving unrelated AVD settings and running emulators untouched.

**Architecture:** A single PowerShell guard owns normalization, dry-run reporting, watcher lifetime, scheduled-task installation, status, and uninstall. Repository launchers call its one-shot `Apply` mode immediately before starting an emulator and also pass `-memory 8192` as a launch-time guarantee. An at-logon watcher covers Android Studio and newly created AVDs by watching `%USERPROFILE%\.android\avd` and periodically reconciling it.

**Tech Stack:** Windows PowerShell 5.1, Windows Task Scheduler, Android Emulator AVD `config.ini`, Jest 29 with ts-jest, Node.js child processes and temporary directories.

**Approved design:** `docs/superpowers/specs/2026-08-01-android-emulator-memory-guard-design.md`

**Workspace constraint:** Execute only in `C:\appsprojects\phraseman` on `feature/referral-roulette`. Do not create or use a worktree or another branch. Do not restart an already running emulator. Stage only the files named in this plan because the canonical checkout contains unrelated owner changes.

---

## Public command contract

The script introduced by this plan has this stable interface:

```powershell
scripts\android-emulator-memory-guard.ps1 `
  -Mode Apply|Watch|Install|Uninstall|Status `
  [-AvdRoot <path>] `
  [-StateRoot <path>] `
  [-DryRun]
```

Defaults and invariants:

```text
Mode: Apply
AvdRoot: %USERPROFILE%\.android\avd
StateRoot: <canonical repository>\.codex-tmp\emulator-memory-guard
Scheduled task: Phraseman Android Emulator Memory Guard
hw.ramSize: 8192
vm.heapSize: 1024
watch debounce: 250 ms per config path
full reconciliation: every 30 seconds
missing-root retry: every 5 seconds
locked-file retry: 3 attempts, 200 ms apart
log rotation: guard.log at 2 MiB, preserve guard.log.1
```

`-StateRoot` exists so tests can keep all backups and logs outside source. It does not change the production default. `Watch` must terminate cleanly when its PowerShell process is stopped; it must not launch or stop an emulator.

---

### Task 1: Add RED contract tests for one-shot normalization

**Files:**

- Create: `tests/android_emulator_memory_guard.test.ts`
- Reference: `tests/dev_runtime_performance_contract.test.ts`
- Reference: `tests/setup_jest_write_guard.js`

- [ ] **Step 1: Create a temp-only PowerShell test harness**

At the top of `tests/android_emulator_memory_guard.test.ts`, add imports and helpers that:

```ts
import { spawn, spawnSync, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'android-emulator-memory-guard.ps1');
const POWERSHELL = path.join(
  process.env.SystemRoot ?? 'C:\\Windows',
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'powershell.exe',
);

function createSandbox(): { root: string; avdRoot: string; stateRoot: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-avd-guard-'));
  const avdRoot = path.join(root, 'avd');
  const stateRoot = path.join(root, 'state');
  fs.mkdirSync(avdRoot, { recursive: true });
  return { root, avdRoot, stateRoot };
}

function runGuard(
  avdRoot: string,
  stateRoot: string,
  mode = 'Apply',
  extra: string[] = [],
) {
  return spawnSync(
    POWERSHELL,
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      SCRIPT,
      '-Mode',
      mode,
      '-AvdRoot',
      avdRoot,
      '-StateRoot',
      stateRoot,
      ...extra,
    ],
    { encoding: 'utf8', timeout: 15_000 },
  );
}
```

Keep a sandbox list and remove each sandbox in `afterEach` with `fs.rmSync(root, { recursive: true, force: true })`. All test mutations must remain under the OS temp directory.

- [ ] **Step 2: Write failing `Apply` behavior tests**

Add tests that create `<name>.avd/config.ini` fixtures and assert:

1. Missing keys are appended exactly once as `hw.ramSize=8192` and `vm.heapSize=1024`.
2. Wrong values are replaced in place.
3. Duplicate RAM/heap keys collapse to one canonical occurrence each.
4. Unrelated keys, comments, blank lines, original line order, CRLF/LF choice, and terminal-newline presence are preserved.
5. A second `Apply` leaves file bytes and mtime unchanged.
6. Multiple `.avd` directories are normalized in one pass.
7. Files outside `AvdRoot` are never touched.
8. A malformed or locked `config.ini` produces a non-zero result for that file without truncating it.

Use byte reads (`fs.readFileSync(configPath)`) for preservation and idempotence assertions. For the locked-file case, tolerate platform-specific lock behavior: hold a Windows file descriptor without delete sharing through a tiny child PowerShell process, run `Apply`, then verify the original bytes after releasing the lock.

- [ ] **Step 3: Write failing `DryRun` and validation tests**

Assert that:

```text
-DryRun reports every file that would change
-DryRun does not create StateRoot, backups, logs, or mutate config.ini
missing AvdRoot returns success with an explicit no-AVD status in Apply mode
an AvdRoot that resolves to a regular file is rejected
an empty AvdRoot argument is rejected by parameter validation
```

- [ ] **Step 4: Run the RED test**

Run:

```powershell
npx jest --runTestsByPath tests/android_emulator_memory_guard.test.ts --no-cache --runInBand
```

Expected: FAIL because `scripts/android-emulator-memory-guard.ps1` does not exist.

- [ ] **Step 5: Commit the RED test alone**

```powershell
git add -- tests/android_emulator_memory_guard.test.ts
git commit -m "test: specify Android emulator memory guard"
```

Expected: only the new test is committed; unrelated dirty files remain unstaged.

---

### Task 2: Implement safe `Apply` and `DryRun` modes

**Files:**

- Create: `scripts/android-emulator-memory-guard.ps1`
- Test: `tests/android_emulator_memory_guard.test.ts`

- [ ] **Step 1: Define strict parameters and canonical constants**

Start the script with:

```powershell
[CmdletBinding()]
param(
  [ValidateSet('Apply', 'Watch', 'Install', 'Uninstall', 'Status')]
  [string]$Mode = 'Apply',
  [ValidateNotNullOrEmpty()]
  [string]$AvdRoot = (Join-Path $env:USERPROFILE '.android\avd'),
  [string]$StateRoot = '',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$RamMb = 8192
$HeapMb = 1024
$TaskName = 'Phraseman Android Emulator Memory Guard'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $StateRoot) {
  $StateRoot = Join-Path $ProjectRoot '.codex-tmp\emulator-memory-guard'
}
```

Resolve existing paths with `[System.IO.Path]::GetFullPath()`. Reject an existing non-directory `AvdRoot`. Do not demand that the default AVD directory already exists because `Watch` must tolerate Android Studio creating it later.

- [ ] **Step 2: Implement byte-preserving config parsing**

Add focused helpers:

```powershell
function Get-TextEnvelope { param([byte[]]$Bytes) }
function Set-CanonicalIniValue { param([string[]]$Lines, [string]$Key, [string]$Value) }
function Get-AvdConfigPaths { param([string]$Root) }
function Invoke-WithFileRetry { param([scriptblock]$Operation, [string]$Path) }
function Update-AvdConfig { param([string]$Path, [switch]$WhatIfOnly) }
function Invoke-Apply { param([switch]$WhatIfOnly) }
```

`Get-TextEnvelope` must detect UTF-8 BOM, CRLF versus LF, and whether the file ends in a newline. Decode with strict UTF-8; a decode failure is a malformed-file error and must leave the source untouched.

`Set-CanonicalIniValue` must compare keys case-insensitively with the anchored expression `^\s*<escaped-key>\s*=`. Replace the first occurrence at its original position and remove later duplicates. If absent, append the key after the existing final content. Preserve every unrelated line byte-for-byte after re-encoding with the original BOM/newline envelope.

- [ ] **Step 3: Implement backup and atomic replacement**

Before the first real change to a config file:

1. Create `$StateRoot\backups` only when not in `DryRun`.
2. Derive a collision-safe backup filename from the AVD directory name plus a SHA-256 hash of the full config path.
3. Create the backup with `Copy-Item -LiteralPath $Path -Destination $BackupPath` only if that backup does not already exist.
4. Write replacement bytes to a sibling filename such as `.config.ini.<guid>.tmp`.
5. Flush and close the temp file, then call `[System.IO.File]::Replace(...)` when possible; fall back to `Move-Item -Force` only after the backup is safely present.
6. In `finally`, remove only the exact sibling temp file if it still exists.

Never create a temp file before complete parse/validation succeeds. Retry locked reads or replacements three times with 200 ms delays. If all attempts fail, report the path and continue other AVDs, then exit non-zero after the pass.

- [ ] **Step 4: Implement idempotent output and exit behavior**

Use concise machine-searchable lines:

```text
UNCHANGED <path>
WOULD_CHANGE <path>
UPDATED <path>
ERROR <path> :: <message>
SUMMARY scanned=<n> changed=<n> failed=<n> dryRun=<true|false>
```

Do not create a log in one-shot `Apply`; standard output is sufficient. Return exit code 0 when no file failed and 1 when at least one file failed. A missing AVD root is `SUMMARY scanned=0 changed=0 failed=0`.

- [ ] **Step 5: Run focused tests until GREEN**

```powershell
npx jest --runTestsByPath tests/android_emulator_memory_guard.test.ts --no-cache --runInBand
```

Expected: PASS for one-shot normalization, preservation, idempotence, failures, and dry-run.

- [ ] **Step 6: Parse the PowerShell script without executing it**

```powershell
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
  (Resolve-Path 'scripts/android-emulator-memory-guard.ps1'),
  [ref]$null,
  [ref]$errors
) | Out-Null
if ($errors.Count) { $errors | Format-List; exit 1 }
```

Expected: exit 0 with no parser errors.

- [ ] **Step 7: Commit the minimal GREEN implementation**

```powershell
git add -- scripts/android-emulator-memory-guard.ps1 tests/android_emulator_memory_guard.test.ts
git commit -m "feat: normalize Android emulator memory"
```

---

### Task 3: Add watcher, backups, and bounded logging

**Files:**

- Modify: `scripts/android-emulator-memory-guard.ps1`
- Modify: `tests/android_emulator_memory_guard.test.ts`

- [ ] **Step 1: Add a watcher test helper**

Add a helper that starts `Watch` with `spawn`, accumulates stdout/stderr, and guarantees cleanup:

```ts
function startWatcher(avdRoot: string, stateRoot: string): ChildProcess {
  return spawn(
    POWERSHELL,
    [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT,
      '-Mode', 'Watch', '-AvdRoot', avdRoot, '-StateRoot', stateRoot,
    ],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

async function waitUntil(predicate: () => boolean, timeoutMs = 2_500): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('condition was not met before timeout');
}
```

Register every watcher process and terminate it in `afterEach`; wait for its `exit` event before deleting the sandbox.

- [ ] **Step 2: Write RED watcher tests**

Cover:

1. Startup reconciliation fixes an existing AVD.
2. Creating a new `.avd/config.ini` after watcher start normalizes it in under 2 seconds.
3. Rewriting a canonical config to a wrong RAM value is repaired in under 2 seconds.
4. Bursts of multiple file events do not create duplicate key lines or repeated backups.
5. The first real edit creates exactly one backup containing the original bytes.
6. Subsequent edits reuse the same first-change backup.
7. `guard.log` records start, update, errors, and stop/reconcile events without logging config contents.
8. When `guard.log` grows past 2 MiB, it rotates to `guard.log.1`, preserving at most those two log files.
9. Starting with a missing AVD root does not exit; creating the root later is detected.

For log rotation, pre-seed a 2 MiB+ `guard.log` under the temp `StateRoot`, then start `Watch`; do not generate megabytes through stdout.

- [ ] **Step 3: Run watcher tests RED**

```powershell
npx jest --runTestsByPath tests/android_emulator_memory_guard.test.ts --no-cache --runInBand
```

Expected: watcher-related cases FAIL while Task 2 cases remain PASS.

- [ ] **Step 4: Implement bounded log helpers**

Add:

```powershell
function Rotate-GuardLog { }
function Write-GuardLog { param([string]$Level, [string]$Message) }
```

`Write-GuardLog` creates `StateRoot` only in non-dry watcher/install operations, rotates before append when the log is at least 2 MiB, writes UTF-8 timestamped lines, and never writes full config contents or environment variables.

- [ ] **Step 5: Implement `Watch`**

`Invoke-Watch` must:

1. Run a full `Apply` reconciliation immediately.
2. If `AvdRoot` is absent, wait 5 seconds and retry without exiting.
3. Create one `FileSystemWatcher` with `IncludeSubdirectories = $true`, `Filter = 'config.ini'`, and Changed/Created/Renamed handlers.
4. Put changed full paths into a case-insensitive dictionary with the latest event timestamp.
5. On a 100 ms event-loop tick, process entries at least 250 ms old and remove them from the dictionary.
6. Run full reconciliation every 30 seconds as a lost-event safety net.
7. Dispose the watcher and registered events in `finally`.

Every per-path update still goes through `Update-AvdConfig`; the watcher must not duplicate parsing or write logic. Reject event paths whose resolved parent is outside the resolved `AvdRoot`.

- [ ] **Step 6: Run tests GREEN and commit**

```powershell
npx jest --runTestsByPath tests/android_emulator_memory_guard.test.ts --no-cache --runInBand
git add -- scripts/android-emulator-memory-guard.ps1 tests/android_emulator_memory_guard.test.ts
git commit -m "feat: watch Android AVD memory settings"
```

Expected: focused test PASS; only the two task files enter the commit.

---

### Task 4: Add scheduled-task lifecycle and status

**Files:**

- Modify: `scripts/android-emulator-memory-guard.ps1`
- Modify: `tests/android_emulator_memory_guard.test.ts`

- [ ] **Step 1: Write RED static and dry-run lifecycle tests**

Tests must assert the script contains and/or reports:

```text
Phraseman Android Emulator Memory Guard
New-ScheduledTaskAction
New-ScheduledTaskTrigger -AtLogOn
New-ScheduledTaskSettingsSet
MultipleInstances IgnoreNew
RestartCount 3
RestartInterval one minute
StartWhenAvailable
hidden PowerShell action
-Mode Watch
the canonical absolute script path from $PSCommandPath
```

Run `Install -DryRun` in the temp sandbox and assert it prints the exact proposed executable, arguments, trigger, task name, and settings but does not register a real scheduled task. Run `Status -AvdRoot <temp>` and assert it lists each AVD as compliant/non-compliant without modifying it. Run `Uninstall -DryRun` and assert it reports the intended task removal without mutation.

- [ ] **Step 2: Run lifecycle tests RED**

```powershell
npx jest --runTestsByPath tests/android_emulator_memory_guard.test.ts --no-cache --runInBand
```

Expected: only lifecycle cases FAIL.

- [ ] **Step 3: Implement `Install`**

Build the scheduled task with:

```powershell
$PowerShellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$WatchArguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`" -Mode Watch"
$Action = New-ScheduledTaskAction -Execute $PowerShellExe -Argument $WatchArguments
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)
```

Register with `-Force`, current user context, and a description that states it only normalizes AVD RAM/heap settings. Immediately call `Start-ScheduledTask` after successful registration so the guard is active without requiring logoff. `Install -DryRun` must only print the intended action.

- [ ] **Step 4: Implement `Uninstall` and `Status`**

`Uninstall` stops the exact named task if running, unregisters only that exact task, and does not delete AVD configs, backups, or logs. Missing task is success.

`Status` prints:

```text
TASK installed=<true|false> state=<state-or-missing>
AVD <name> ram=<value-or-missing> heap=<value-or-missing> compliant=<true|false>
SUMMARY avds=<n> compliant=<n> nonCompliant=<n>
```

Status is read-only and returns non-zero when the task is missing or any AVD is non-compliant, so automation can detect drift.

- [ ] **Step 5: Run lifecycle tests GREEN and commit**

```powershell
npx jest --runTestsByPath tests/android_emulator_memory_guard.test.ts --no-cache --runInBand
git add -- scripts/android-emulator-memory-guard.ps1 tests/android_emulator_memory_guard.test.ts
git commit -m "feat: install Android emulator memory guard"
```

---

### Task 5: Route all repository emulator launchers through the guard

**Files:**

- Modify: `scripts/start-android-emulator.ps1:16-46`
- Modify: `scripts/dev-android-emulator.ps1:62-95`
- Modify: `scripts/metro-emulator-prepare.ps1:56-90`
- Modify: `scripts/protected-metro-emu.ps1:70-96`
- Modify: `tests/android_emulator_memory_guard.test.ts`
- Test: `tests/dev_runtime_performance_contract.test.ts`

- [ ] **Step 1: Add a RED launcher integration contract**

Read each launcher as text and assert:

1. It resolves `android-emulator-memory-guard.ps1` from `$PSScriptRoot`.
2. It invokes `-Mode Apply` before its emulator `Start-Process` call.
3. Its emulator argument array contains `-memory` followed by `8192`.
4. The guard call is not hidden behind `Fast`, `Headless`, or another optional mode.
5. The already correct audio behavior in `metro-emulator-prepare.ps1` remains unchanged.

Use one table-driven Jest case over:

```ts
const launchers = [
  'scripts/start-android-emulator.ps1',
  'scripts/dev-android-emulator.ps1',
  'scripts/metro-emulator-prepare.ps1',
  'scripts/protected-metro-emu.ps1',
];
```

- [ ] **Step 2: Run launcher contract RED**

```powershell
npx jest --runTestsByPath tests/android_emulator_memory_guard.test.ts tests/dev_runtime_performance_contract.test.ts --no-cache --runInBand
```

Expected: the four launcher integration assertions FAIL; pre-existing runtime assertions PASS.

- [ ] **Step 3: Add the same fail-fast guard call to all four launchers**

Immediately before computing or launching emulator arguments, add:

```powershell
$memoryGuard = Join-Path $PSScriptRoot 'android-emulator-memory-guard.ps1'
if (-not (Test-Path -LiteralPath $memoryGuard)) {
  throw "Android emulator memory guard not found: $memoryGuard"
}
& $memoryGuard -Mode Apply
if ($LASTEXITCODE -ne 0) {
  throw "Android emulator memory guard failed with exit code $LASTEXITCODE"
}
```

In functions where `Continue` is the error preference, explicitly inspect `$LASTEXITCODE` as shown. Do not swallow guard failure and do not start an emulator with unknown memory configuration.

- [ ] **Step 4: Add the launch-time RAM override**

Add exactly:

```powershell
'-memory', '8192'
```

to each emulator argument array. Keep the existing `-cores 6`, GPU selection, window/headless behavior, network settings, snapshots, audio, boot animation, and adb behavior exactly as they are. Do not add `-no-audio` to `metro-emulator-prepare.ps1`; its existing comment documents why audio is required.

- [ ] **Step 5: Run focused integration tests GREEN**

```powershell
npx jest --runTestsByPath tests/android_emulator_memory_guard.test.ts tests/dev_runtime_performance_contract.test.ts --no-cache --runInBand
```

Expected: both suites PASS.

- [ ] **Step 6: Commit exact launcher files**

```powershell
git add -- `
  scripts/android-emulator-memory-guard.ps1 `
  scripts/start-android-emulator.ps1 `
  scripts/dev-android-emulator.ps1 `
  scripts/metro-emulator-prepare.ps1 `
  scripts/protected-metro-emu.ps1 `
  tests/android_emulator_memory_guard.test.ts
git commit -m "fix: enforce emulator RAM on every launcher"
```

---

### Task 6: Verify safely against the real workstation, then install

**Files:**

- Verify: `scripts/android-emulator-memory-guard.ps1`
- Verify: `%USERPROFILE%\.android\avd\*.avd\config.ini`
- Verify: Windows scheduled task `Phraseman Android Emulator Memory Guard`

- [ ] **Step 1: Confirm canonical checkout and branch**

```powershell
$expectedRoot = 'C:\appsprojects\phraseman'
$actualRoot = (git rev-parse --show-toplevel).Trim()
$actualBranch = (git branch --show-current).Trim()
if ($actualRoot -ne $expectedRoot -or $actualBranch -ne 'feature/referral-roulette') {
  throw "Canonical workspace mismatch: $actualRoot [$actualBranch]"
}
```

Expected: no output and exit 0. Stop on mismatch; do not create a replacement checkout.

- [ ] **Step 2: Run deterministic source gates**

```powershell
npx jest --runTestsByPath tests/android_emulator_memory_guard.test.ts tests/dev_runtime_performance_contract.test.ts --no-cache --runInBand
git diff --check
```

Expected: both suites PASS and `git diff --check` emits no errors.

- [ ] **Step 3: Parse every changed PowerShell file**

```powershell
$files = @(
  'scripts/android-emulator-memory-guard.ps1',
  'scripts/start-android-emulator.ps1',
  'scripts/dev-android-emulator.ps1',
  'scripts/metro-emulator-prepare.ps1',
  'scripts/protected-metro-emu.ps1'
)
$allErrors = @()
foreach ($file in $files) {
  $parseErrors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    (Resolve-Path $file),
    [ref]$null,
    [ref]$parseErrors
  ) | Out-Null
  $allErrors += $parseErrors
}
if ($allErrors.Count) { $allErrors | Format-List; exit 1 }
```

Expected: exit 0 with no parser errors.

- [ ] **Step 4: Preview real AVD changes without writing**

```powershell
& .\scripts\android-emulator-memory-guard.ps1 -Mode Apply -DryRun
```

Expected: seven known AVDs are scanned; each is either `UNCHANGED` or `WOULD_CHANGE`. No file timestamp changes and no task is registered.

- [ ] **Step 5: Apply to current AVDs**

```powershell
& .\scripts\android-emulator-memory-guard.ps1 -Mode Apply
```

Expected: every existing AVD config ends with exactly one `hw.ramSize=8192` and one `vm.heapSize=1024`; unrelated config content remains intact. Do not stop or restart the currently running emulator—the settings apply on its next normal launch.

- [ ] **Step 6: Install and start the persistent watcher**

```powershell
& .\scripts\android-emulator-memory-guard.ps1 -Mode Install
& .\scripts\android-emulator-memory-guard.ps1 -Mode Status
```

Expected: task is installed/running and all AVDs are compliant. If task registration fails due to policy, report the exact Task Scheduler error; repository launchers still provide the fallback guarantee.

- [ ] **Step 7: Verify the actual scheduled action and one live watcher**

```powershell
$taskName = 'Phraseman Android Emulator Memory Guard'
$task = Get-ScheduledTask -TaskName $taskName
$info = Get-ScheduledTaskInfo -TaskName $taskName
$task.Actions | Format-List Execute,Arguments
$task.Triggers | Format-List Enabled,UserId
$task.Settings | Format-List MultipleInstances,RestartCount,RestartInterval
$info | Format-List LastRunTime,LastTaskResult,NextRunTime
Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
  Where-Object { $_.CommandLine -like '*android-emulator-memory-guard.ps1*Mode Watch*' } |
  Select-Object ProcessId,CommandLine
```

Expected: action points to the canonical script, `Mode Watch` is present, `IgnoreNew`/restart settings match the contract, and exactly one watcher process exists.

- [ ] **Step 8: Perform a reversible real-time smoke check without touching source**

Create a temporary AVD-shaped directory under the real AVD root, let the watcher normalize it, verify under two seconds, then remove only that exact temporary directory:

```powershell
$avdRoot = Join-Path $env:USERPROFILE '.android\avd'
$smokeName = 'phraseman_memory_guard_smoke_' + [guid]::NewGuid().ToString('N')
$smokeDir = Join-Path $avdRoot ($smokeName + '.avd')
$smokeConfig = Join-Path $smokeDir 'config.ini'
New-Item -ItemType Directory -Path $smokeDir | Out-Null
Set-Content -LiteralPath $smokeConfig -Encoding ASCII -Value @(
  'AvdId=' + $smokeName,
  'hw.ramSize=2048',
  'vm.heapSize=256'
)
$deadline = (Get-Date).AddSeconds(2)
do {
  Start-Sleep -Milliseconds 50
  $text = Get-Content -LiteralPath $smokeConfig -Raw
} until (($text -match '(?m)^hw\.ramSize=8192$') -and ($text -match '(?m)^vm\.heapSize=1024$') -or (Get-Date) -ge $deadline)
if (-not (($text -match '(?m)^hw\.ramSize=8192$') -and ($text -match '(?m)^vm\.heapSize=1024$'))) {
  throw 'Watcher did not normalize the smoke AVD within two seconds.'
}
$resolvedSmoke = (Resolve-Path -LiteralPath $smokeDir).Path
$resolvedRoot = (Resolve-Path -LiteralPath $avdRoot).Path
if (-not $resolvedSmoke.StartsWith($resolvedRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to remove unexpected path: $resolvedSmoke"
}
Remove-Item -LiteralPath $resolvedSmoke -Recurse -Force
```

Expected: the temporary config is normalized within two seconds and only the GUID-named smoke directory is deleted.

- [ ] **Step 9: Inspect final task-owned diff and commit any verification-only adjustments**

```powershell
git status --short
git diff -- `
  scripts/android-emulator-memory-guard.ps1 `
  scripts/start-android-emulator.ps1 `
  scripts/dev-android-emulator.ps1 `
  scripts/metro-emulator-prepare.ps1 `
  scripts/protected-metro-emu.ps1 `
  tests/android_emulator_memory_guard.test.ts `
  docs/superpowers/specs/2026-08-01-android-emulator-memory-guard-design.md `
  docs/superpowers/plans/2026-08-01-android-emulator-memory-guard.md
```

If verification required a source correction, repeat the relevant RED/GREEN step and commit only the named task files:

```powershell
git add -- `
  scripts/android-emulator-memory-guard.ps1 `
  scripts/start-android-emulator.ps1 `
  scripts/dev-android-emulator.ps1 `
  scripts/metro-emulator-prepare.ps1 `
  scripts/protected-metro-emu.ps1 `
  tests/android_emulator_memory_guard.test.ts
git commit -m "fix: harden Android emulator memory guard"
```

Do not stage the whole dirty working tree. Do not run Metro, Gradle, or restart an emulator as part of this task.

---

## Final acceptance checklist

- [ ] Every existing `.avd/config.ini` contains exactly one `hw.ramSize=8192`.
- [ ] Every existing `.avd/config.ini` contains exactly one `vm.heapSize=1024`.
- [ ] `Apply` is byte-idempotent on a second run.
- [ ] `DryRun` produces zero mutations.
- [ ] A newly created AVD is normalized within two seconds.
- [ ] Android Studio launches are covered by the at-logon watcher.
- [ ] All four repository launchers call the guard and pass `-memory 8192`.
- [ ] The scheduled task runs one hidden watcher and uses `IgnoreNew`.
- [ ] Logs are bounded to `guard.log` plus `guard.log.1`.
- [ ] Backups preserve the first pre-change bytes under `.codex-tmp`.
- [ ] No running emulator was stopped or restarted.
- [ ] No Metro server was launched.
- [ ] No unrelated dirty file was staged or committed.
