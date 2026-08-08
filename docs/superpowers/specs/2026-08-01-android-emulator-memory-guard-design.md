# Android Emulator Memory Guard Design

**Date:** 2026-08-01

**Status:** Owner-approved design

## Goal

Make every Android Virtual Device opened on this Windows workstation start with the Android Emulator maximum supported memory profile: `8192 MB` guest RAM and `1024 MB` VM heap. The guard must cover launches from Android Studio and every Phraseman launcher, including AVDs created after installation.

The workstation has 32 GB physical RAM and the owner normally runs one emulator at a time. The fixed 8192 MB profile therefore does not need multi-emulator memory sharing.

## Scope

The feature owns only emulator memory configuration and its Windows hook. It must not change AVD user data, snapshots, audio, graphics mode, screen dimensions, API level, app data, Metro configuration, or build behavior. It must not stop or restart a running emulator; configuration changes apply on its next launch.

All source, tests, scripts, and commands run from the canonical checkout `C:\appsprojects\phraseman` on `feature/referral-roulette`. Historical worktrees remain read-only.

## Architecture

### 1. Central memory guard

Create `scripts/android-emulator-memory-guard.ps1` as the single implementation and source of truth. It exposes five explicit modes:

- `Apply`: scan the configured AVD root and normalize every `*.avd/config.ini`.
- `Watch`: run `Apply` at startup, watch the AVD root for new or changed `config.ini` files, debounce duplicate events, and periodically reconcile all AVDs.
- `Install`: idempotently register the current-user Windows scheduled task.
- `Uninstall`: remove only the named Phraseman scheduled task and leave AVD settings intact.
- `Status`: report task state, watcher process state, and every AVD's effective memory values.

The script accepts `-AvdRoot` for isolated tests, defaults to `%USERPROFILE%\.android\avd`, and accepts `-DryRun` for mutation-free previews. Production memory values are constants, not user-tunable launch defaults:

```text
hw.ramSize=8192
vm.heapSize=1024
```

### 2. Safe configuration update

For each `config.ini`, the guard:

1. Resolves and validates that the file is below the selected AVD root.
2. Reads the file without interpreting values as commands.
3. Replaces all existing `hw.ramSize` and `vm.heapSize` entries with exactly one canonical entry each.
4. Preserves all unrelated lines, their order, the original line-ending style, and the presence or absence of a terminal newline.
5. Writes a sibling temporary file and atomically replaces the original.
6. Creates a timestamped first-change backup under `.codex-tmp/emulator-memory-guard/backups/` when operating on the real AVD root.

Repeated `Apply` calls are idempotent: an already normalized file is not rewritten and does not create another backup.

### 3. Persistent Windows hook

`Install` creates one current-user scheduled task named `Phraseman Android Emulator Memory Guard`, then starts it immediately. Its logon trigger starts hidden PowerShell with:

```text
-NoProfile -ExecutionPolicy Bypass -File C:\appsprojects\phraseman\scripts\android-emulator-memory-guard.ps1 -Mode Watch
```

Installation fails closed if the script is not running from the canonical checkout. Reinstalling replaces only the same named task. The task uses `IgnoreNew` for overlapping starts and retries an unexpected exit up to three times at one-minute intervals. Uninstalling never removes or edits another scheduled task.

`Watch` uses `FileSystemWatcher` with a 250 ms per-path debounce for low-latency updates and reconciles all AVDs every 30 seconds as a recovery path for dropped filesystem events. If the AVD root does not yet exist, it checks for creation every five seconds. It writes compact logs to `.codex-tmp/emulator-memory-guard/guard.log`, rotates at 2 MiB by retaining one `.1` file, and does not keep unbounded in-memory state.

### 4. Project launcher integration

Every Phraseman script that directly starts Android Emulator calls the guard in `Apply` mode immediately before `Start-Process`, and includes explicit `-memory 8192` in the emulator arguments as defense in depth.

The initial integration covers:

- `scripts/start-android-emulator.ps1`
- `scripts/dev-android-emulator.ps1`
- `scripts/metro-emulator-prepare.ps1`
- `scripts/protected-metro-emu.ps1`

Package scripts already route through these launchers. Android Studio launches are covered by persistent AVD configuration maintained by the watcher.

## Data Flow

```text
Windows logon
  -> scheduled task
  -> Memory Guard Watch
  -> initial Apply to all AVDs
  -> config.ini change event or reconciliation tick
  -> validate path
  -> normalize memory keys atomically
  -> compact log entry

Phraseman emulator launcher
  -> Memory Guard Apply
  -> explicit emulator.exe -memory 8192
  -> emulator starts with the canonical profile
```

## Failure Handling

- Missing AVD root: log an informational state and continue watching for its creation.
- Malformed or temporarily locked config: retry three times with a 200 ms delay, then log the exact file and leave it unchanged.
- Scheduled-task permission or registration failure: return a non-zero exit code with a concise remediation message.
- Watcher crash: Windows Task Scheduler restarts the task with a bounded restart policy.
- Running emulator: never terminate it; report that updated values apply on next start.
- Host memory pressure: do not silently lower the approved 8192 MB profile. `Status` reports host total/free memory so the owner can diagnose unrelated pressure.

## Testing

Add `tests/android_emulator_memory_guard.test.ts`. Tests run the PowerShell script only against an ignored temporary AVD root and verify:

- missing keys are added;
- stale values and duplicate keys become exactly one canonical value;
- unrelated configuration, line endings, and terminal-newline state are preserved;
- a second `Apply` is idempotent;
- `-DryRun` makes no filesystem changes;
- paths outside `-AvdRoot` are rejected;
- `Install -DryRun` emits the exact canonical scheduled-task action without registering it;
- `Uninstall -DryRun` targets only the named task;
- every direct emulator launcher calls `Apply` before launch and contains `-memory 8192`.

The tests must not modify real AVD files, scheduled tasks, app source, fixtures, or snapshots. Real installation is a separate explicit command after tests pass.

## Acceptance Criteria

1. Every current AVD reports `hw.ramSize=8192` and `vm.heapSize=1024` exactly once.
2. A newly created AVD is normalized by the running hook within two seconds.
3. Android Studio and all direct Phraseman launch paths use the same memory profile on the next emulator start.
4. Repeated application and installation are idempotent.
5. `-DryRun` performs zero external mutations.
6. No running emulator, AVD data, snapshots, audio, GPU settings, Metro process, or unrelated scheduled task is changed.
7. Focused tests, PowerShell syntax validation, launcher contracts, and `git diff --check` pass before installation.
