# Chains Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate Windows Chains Runner with a local GUI, Codex-backed structured generation, persistent project history, and clone-only CapCut application.

**Architecture:** A standalone Python/Tkinter application reads CapCut drafts, produces stable fingerprints, and stores state outside CapCut. Codex is called through `codex exec --json` in read-only mode and returns schema-validated JSON; a deterministic executor applies approved operations only to a new CapCut clone and runs structural gates before registration.

**Tech Stack:** Python 3.14 standard library, Tkinter, `unittest`, PowerShell launcher, installed Codex CLI, existing Phraseman Chains quality scripts invoked as subprocesses.

---

## Scope and file map

The new runtime lives outside the Phraseman app repository:

```text
C:\appsprojects\chains-runner\
  chains_runner\
  config\default_profile.json
  schemas\codex_generation.schema.json
  tests\
  README.ru.md
```

The user-facing launcher and persistent state live outside the source tree:

```text
C:\Users\badlo\OneDrive\Desktop\CHAINS_RUNNER\Run Chains Runner.cmd
C:\Users\badlo\OneDrive\Desktop\CHAINS_RUNNER_DATA\
```

The existing Phraseman repository is read as a source of current Chains gates and helpers. The first implementation does not modify `tools/build_chains_800_capcut_project.py`, `tools/capcut_chains_quality_gate.py`, or any native CapCut draft.

### Task 1: Create the standalone project shell

**Files:**
- Create: `C:\appsprojects\chains-runner\chains_runner\__init__.py`
- Create: `C:\appsprojects\chains-runner\chains_runner\models.py`
- Create: `C:\appsprojects\chains-runner\chains_runner\config.py`
- Create: `C:\appsprojects\chains-runner\config\default_profile.json`
- Create: `C:\appsprojects\chains-runner\README.ru.md`
- Test: `C:\appsprojects\chains-runner\tests\test_config.py`

- [ ] **Step 1: Write configuration tests first.**

  Test that the default profile has `profile_id`, `profile_version`, `track_roles`, `unknown_element_policy=ignore_and_report`, and `missing_known_element_policy=fail_closed`. Test that a relative or non-existent Phraseman source path is rejected before a run starts.

- [ ] **Step 2: Run the focused test and verify it fails.**

  Run: `python -m unittest discover -s tests -p 'test_config.py' -v`

  Expected: FAIL because the standalone package does not exist yet.

- [ ] **Step 3: Implement typed configuration loading.**

  `config.py` must expose `load_profile(path: Path) -> PipelineProfile` and `validate_source_root(path: Path, capcut_root: Path) -> Path`. `models.py` must define dataclasses for `PipelineProfile`, `TrackRoleRule`, and `RunOptions`. Use `json.loads`, `Path.resolve(strict=True)`, and `os.path.commonpath`; never accept a source path outside the CapCut root.

- [ ] **Step 4: Add the default profile and package README.**

  The default profile must define role rules by track type/name patterns, `ignore_and_report` for unknown elements, `fail_closed` for missing known elements, and a reference to `C:\appsprojects\phraseman\tools\capcut_chains_quality_gate.py` without hardcoding a project name.

- [ ] **Step 5: Run the focused test and verify it passes.**

  Run: `python -m unittest discover -s tests -p 'test_config.py' -v`

  Expected: PASS.

### Task 2: Implement CapCut discovery and safe process checks

**Files:**
- Create: `C:\appsprojects\chains-runner\chains_runner\capcut_process.py`
- Create: `C:\appsprojects\chains-runner\chains_runner\capcut_discovery.py`
- Test: `C:\appsprojects\chains-runner\tests\test_capcut_discovery.py`
- Test fixture: `C:\appsprojects\chains-runner\tests\fixtures\minimal_draft\`

- [ ] **Step 1: Write read-only discovery tests.**

  Cover: finding `draft_content.json`, rejecting a folder without required files, listing draft names sorted by `draft_meta_info.json` modification time, and refusing a source outside `%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft`.

- [ ] **Step 2: Write process tests around an injectable process probe.**

  The probe must return `open`, `closed`, or `unknown`. The mutation path must reject `open` and `unknown`; tests must verify no copy operation is called in either case.

- [ ] **Step 3: Implement discovery.**

  `discover_drafts(capcut_root: Path) -> list[DraftSummary]` reads only metadata needed for the list. `load_draft_content(draft_dir: Path) -> dict[str, Any]` validates UTF-8 JSON and returns a clear error containing the exact file path.

- [ ] **Step 4: Implement the Windows process probe.**

  Use `Get-Process -Name CapCut` through `subprocess.run` with captured output. Add `wait_until_closed(timeout_seconds: float)` and make the mutation executor call it before backup. Do not terminate helper processes unless a normal close attempt has already failed and the user explicitly confirms the recovery action.

- [ ] **Step 5: Run tests.**

  Run: `python -m unittest discover -s tests -p 'test_capcut_discovery.py' -v`

  Expected: PASS with no CapCut process launched or terminated by tests.

### Task 3: Implement fingerprints and history

**Files:**
- Create: `C:\appsprojects\chains-runner\chains_runner\fingerprint.py`
- Create: `C:\appsprojects\chains-runner\chains_runner\history.py`
- Create: `C:\appsprojects\chains-runner\chains_runner\manifest.py`
- Test: `C:\appsprojects\chains-runner\tests\test_fingerprint.py`
- Test: `C:\appsprojects\chains-runner\tests\test_history.py`

- [ ] **Step 1: Write matching tests.**

  Verify that reordering JSON object keys does not change a fingerprint; a changed track segment count does change it; a new track is reported as `new_element`; a known track with a changed role is reported as `ambiguous_known_element`; and a removed known track is reported as `missing_known_element`.

- [ ] **Step 2: Define the manifest contract.**

  `manifest.py` must emit `ProjectManifest` with `project_key`, `draft_id`, `source_path`, `profile_id`, `profile_version`, `tracks`, `materials_summary`, `content_hash`, and `created_at`. Each track entry must include `track_key`, `role`, `type`, `name`, `segment_count`, `segment_signatures`, and `source_identities`.

- [ ] **Step 3: Implement stable normalization.**

  Normalize paths case-insensitively, normalize separators, strip volatile timestamps and generated UUIDs from the hash input, sort object keys, and hash canonical UTF-8 JSON with SHA-256. Keep original IDs in the report but do not make an ID-only change trigger full regeneration.

- [ ] **Step 4: Implement history persistence.**

  `history.py` must write only under `CHAINS_RUNNER_DATA`. Use atomic write-to-temporary-then-replace for `project.json` and `last-manifest.json`; append one JSON object per run to `runs.jsonl`. Store Codex thread id separately so a token or prompt never enters the project manifest.

- [ ] **Step 5: Run tests.**

  Run: `python -m unittest discover -s tests -p 'test_fingerprint.py' -v; python -m unittest discover -s tests -p 'test_history.py' -v`

  Expected: PASS and no files created outside the temporary test state directory.

### Task 4: Add the Codex structured-output provider

**Files:**
- Create: `C:\appsprojects\chains-runner\chains_runner\codex_provider.py`
- Create: `C:\appsprojects\chains-runner\schemas\codex_generation.schema.json`
- Create: `C:\appsprojects\chains-runner\chains_runner\prompt_builder.py`
- Test: `C:\appsprojects\chains-runner\tests\test_codex_provider.py`
- Test fixture: `C:\appsprojects\chains-runner\tests\fixtures\codex_response.json`

- [ ] **Step 1: Write output-validation tests.**

  Verify acceptance of the exact schema, rejection of extra top-level fields, rejection of unknown `track_key`, rejection of operations targeting `ignored_by_policy`, rejection of replacement characters and literal `????`, and rejection of malformed JSON.

- [ ] **Step 2: Define the JSON Schema.**

  Required top-level fields: `profile_id`, `profile_version`, `source_project_key`, `operations`, `content_rows`, `asset_jobs`, and `warnings`. Each operation must contain `track_key`, `element_key`, `action`, and `payload`. `action` is limited to `set_text`, `attach_asset`, or `skip`; no operation may contain a raw filesystem write command.

- [ ] **Step 3: Implement the prompt builder.**

  `build_prompt(profile, manifest, diff, rules_text) -> str` must include the instruction that Codex is read-only, unknown/new elements are ignored, missing known elements stop execution, and the response must be JSON matching the supplied schema. Include only compact manifest data and rule text.

- [ ] **Step 4: Implement the Codex subprocess adapter.**

  Spawn `codex exec --json --sandbox read-only --output-schema <schema> -` with the prompt on stdin. Capture stdout/stderr separately, parse JSONL events, extract the first `thread.started` id and final structured response, and persist only the thread id plus run metadata. Never set `OPENAI_API_KEY` from `.env.local`; use saved Codex CLI auth. If Codex exits non-zero, return a report without entering the apply phase.

- [ ] **Step 5: Add resume support.**

  When the project history has a prior Codex thread id, use `codex exec resume <thread_id>` only for a content follow-up. Never use a resumed thread as a substitute for the deterministic fingerprint comparison.

- [ ] **Step 6: Run tests without contacting Codex.**

  Run: `python -m unittest discover -s tests -p 'test_codex_provider.py' -v`

  Expected: PASS using the fixture adapter; no network request and no API spend.

### Task 5: Implement clone-only application and gates

**Files:**
- Create: `C:\appsprojects\chains-runner\chains_runner\backup.py`
- Create: `C:\appsprojects\chains-runner\chains_runner\clone.py`
- Create: `C:\appsprojects\chains-runner\chains_runner\apply.py`
- Create: `C:\appsprojects\chains-runner\chains_runner\quality.py`
- Test: `C:\appsprojects\chains-runner\tests\test_clone_safety.py`
- Test: `C:\appsprojects\chains-runner\tests\test_apply_policy.py`

- [ ] **Step 1: Write clone safety tests.**

  Verify that the source file hashes are unchanged after a successful clone-only run; target names are unique; a target collision aborts; a source outside CapCut root aborts; and a `missing_known_element` diff produces no target directory.

- [ ] **Step 2: Implement timestamped backups.**

  `backup_project(source, run_id) -> BackupReport` copies the complete source folder into `.codex-tmp/capcut-backups/chains-runner/<run_id>/<source-name>/`. Before registration, separately copy `root_meta_info.json` into the same run directory. Record SHA-256 for every file copied.

- [ ] **Step 3: Implement clone and path localization.**

  `clone_project(source, target) -> CloneReport` uses `shutil.copytree` only after CapCut is closed. Recursively rewrite absolute resource paths that point into the source folder to the corresponding target path. Do not rewrite external asset paths. Remove only a clone-local `.locked` marker if present.

- [ ] **Step 4: Implement policy application.**

  Apply only `set_text` and `attach_asset` operations whose `track_key` and `element_key` match the current clone manifest. Skip `ignored_by_policy` elements and record them. Reject any operation that changes track count, track order, segment count, timing, speed, volume, font, or layout unless the profile explicitly allows that field.

- [ ] **Step 5: Mirror native files.**

  After applying changes, write root `draft_content.json`, update `template-2.tmp` when it exists, and write the matching `Timelines/<draft-id>/draft_content.json`. Recompute metadata only for the clone. Compare canonical JSON and report any mirror mismatch as a hard failure.

- [ ] **Step 6: Run quality gates.**

  Run the generic structural gate against the clone by default, checking JSON, duration, `template-2.tmp`, and the timeline mirror. Run the existing Phraseman gate only when the selected profile explicitly uses `capcut_gate=chains-quality`, always passing explicit `--draft-dir`, `--assets-dir`, and report paths. Run `tools/register_capcut_draft.py` only after the clone gate passes and after backing up `root_meta_info.json`; then run its `--verify-only` mode. Never open CapCut automatically after a failed gate.

- [ ] **Step 7: Run tests.**

  Run: `python -m unittest discover -s tests -p 'test_clone_safety.py' -v; python -m unittest discover -s tests -p 'test_apply_policy.py' -v`

  Expected: PASS with all writes confined to temporary fixtures and the configured backup directory.

### Task 6: Build the orchestration service and CLI

**Files:**
- Create: `C:\appsprojects\chains-runner\chains_runner\service.py`
- Create: `C:\appsprojects\chains-runner\chains_runner\cli.py`
- Create: `C:\appsprojects\chains-runner\chains_runner\__main__.py`
- Test: `C:\appsprojects\chains-runner\tests\test_service_modes.py`

- [ ] **Step 1: Write mode tests.**

  Verify that `analyze` writes history but no CapCut file, `preview` calls Codex only when the diff is non-empty, `clone` requires explicit confirmation, and `run` stops before apply when the gate report is not passed.

- [ ] **Step 2: Implement service phases.**

  Expose `analyze_project`, `build_preview`, `apply_to_clone`, and `run_pipeline`. Each phase returns a serializable report with `phase`, `status`, `source`, `target`, `history`, `codex`, `backup`, and `quality` fields. Keep phase boundaries explicit so the GUI can show progress and resume from a saved report.

- [ ] **Step 3: Implement CLI commands.**

  Support:

  ```text
  python -m chains_runner list
  python -m chains_runner analyze --project-name "..."
  python -m chains_runner preview --project-name "..."
  python -m chains_runner run --project-name "..." --confirm-copy --register-copy
  ```

  Default to read-only analysis. Do not add an in-place flag.

- [ ] **Step 4: Run service tests.**

  Run: `python -m unittest discover -s tests -p 'test_service_modes.py' -v`

  Expected: PASS without CapCut or Codex network activity.

### Task 7: Build the native window and desktop launcher

**Files:**
- Create: `C:\appsprojects\chains-runner\chains_runner\ui.py`
- Create: `C:\Users\badlo\OneDrive\Desktop\CHAINS_RUNNER\Run Chains Runner.cmd`
- Create: `C:\Users\badlo\OneDrive\Desktop\CHAINS_RUNNER\README.ru.md`
- Test: `C:\appsprojects\chains-runner\tests\test_ui_formatting.py`

- [ ] **Step 1: Write formatting tests.**

  Test that the UI summary renders source, target, known count, new ignored count, missing count, backup, and gate status without exposing environment variable values or tokens.

- [ ] **Step 2: Implement Tkinter window.**

  Use a single main window with a project list, profile selector, mode toggles, action buttons, progress text, and read-only report panel. Run long operations on a worker thread and marshal status updates back to Tkinter with `after`; never block the UI loop.

- [ ] **Step 3: Implement confirmation and failure states.**

  Disable `Создать копию` until preview succeeds, require a typed confirmation of the target name, show a red stop state on missing known elements or gate failures, and keep the source path visible in every destructive-looking action.

- [ ] **Step 4: Add the desktop launcher.**

  The `.cmd` must resolve `C:\appsprojects\chains-runner`, call `python -m chains_runner`, set `PYTHONIOENCODING=utf-8`, and leave the terminal open only when the program exits with an error. It must not contain a token or a project-specific draft name.

- [ ] **Step 5: Run UI tests.**

  Run: `python -m unittest discover -s tests -p 'test_ui_formatting.py' -v`

  Expected: PASS. Then launch the window manually from the desktop and verify it shows the current CapCut project list.

### Task 8: End-to-end verification and handoff

**Files:**
- Create: `C:\appsprojects\chains-runner\reports\first-run-dry-run.json`
- Create: `C:\appsprojects\chains-runner\reports\first-run-clone-report.json`
- Modify: `C:\appsprojects\chains-runner\README.ru.md`

- [ ] **Step 1: Run a read-only project listing.**

  Run `python -m chains_runner list` and confirm that the source project paths are inside the CapCut root and no CapCut file timestamps changed.

- [ ] **Step 2: Run analysis twice.**

  Run `analyze` twice for one selected project. Confirm the first run writes a manifest and the second run reports `unchanged` and does not invoke the Codex adapter.

- [ ] **Step 3: Test unknown-element behavior with a fixture.**

  Add a fixture-only track, run preview, and verify it is listed as `ignored_by_policy` and absent from operations. Do not add the fixture to a real CapCut draft.

- [ ] **Step 4: Run clone-only on a selected real project.**

  Confirm CapCut is closed, capture source hashes, create the backup, create the clone, run mirror and structural checks, and compare source hashes after completion. Record every path in `first-run-clone-report.json`.

- [ ] **Step 5: Review final state.**

  Verify no generic project API key was added to `.env.local`, no token appears in reports, the desktop launcher contains no secrets, the original CapCut draft is unchanged, and all new files are confined to the standalone runner plus the explicit desktop folder.

- [ ] **Step 6: Handoff.**

  Update the README with the exact double-click workflow, the meaning of `new ignored`, the recovery path from a failed gate, and the location of reports and backups. Do not claim the pipeline is ready until the source hash comparison and clone gate both pass.

## Self-review checklist

- The AI boundary is explicit: Codex returns structured data and never writes CapCut files.
- New elements are logged and ignored; missing known elements fail closed.
- No task mutates the existing Phraseman app or a native CapCut source draft.
- The plan has tests for configuration, discovery, history, Codex output, clone safety, policy, service modes, and UI formatting.
- The only paid AI path in the first implementation is an explicit user-run provider outside Codex analysis; dry-run never spends money.
- All paths and commands are Windows-specific and use absolute paths where the native project boundary matters.
