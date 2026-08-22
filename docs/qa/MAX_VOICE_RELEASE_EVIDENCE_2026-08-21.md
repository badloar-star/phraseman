# MAX Voice release evidence — 2026-08-21

## Verdict

**BLOCKED — do not sign off or deploy MAX Voice yet.**

The MAX implementation, privacy guard, focused client/RNTL suites, admin contracts,
Functions compilation, generated-runtime parity, and whitespace audit pass. Release
sign-off remains blocked by:

1. every physical-device row in `docs/qa/MAX_VOICE_DEVICE_MATRIX.md` is still
   `NOT RUN — physical device required`;
2. the full Jarvis data-contract suite has two failures in the unrelated personal
   economy writer contract (`openingBalance` and `createdAtMs` in
   `app/economy/client_shard_operation_sync.ts`). This MAX task did not change or
   weaken that guard and did not repair the separate economy/purchase workstream.

No deployment, release, or commit was performed during this verification.

## Automated evidence

| Gate | Result | Evidence |
|---|---:|---|
| Focused client logic | PASS | 11 suites, 255 tests, exit 0 |
| Focused client logic without forced exit | PASS | 11 suites, 255 tests, `--detectOpenHandles --forceExit=false`, exit 0; no handles reported |
| Focused RNTL | PASS | 3 suites, 10 tests, exit 0 |
| Focused RNTL without forced exit | PASS | 3 suites, 10 tests, `--detectOpenHandles --forceExit=false`, exit 0; no handles reported |
| First audible MAX output regression | PASS | server aggregation/session end: 2 suites, 34 tests; client transport: 1 suite, 48 tests |
| Focused server/MAX/Jarvis/account deletion | **PARTIAL / BLOCKED** | 13 suites passed; 1 suite failed; 212 tests passed and 2 unrelated economy-writer contract tests failed |
| MAX privacy guard | PASS | `MAX voice privacy guard: PASS`, exit 0 |
| Admin single-surface + MAX diagnostics | PASS | 2 suites, 7 tests, exit 0 |
| Firestore rules | PASS | included in client gate; focused rules suite passed |
| Full Functions build | PASS | exit 0; 9,714 support-context chunks / 2,371 files; clean runtime; TypeScript; assets; runtime parity |
| Final diff whitespace check | PASS | `git diff --check`, exit 0; line-ending warnings only |
| Physical device matrix | **NOT RUN / BLOCKED** | all rows pending in `docs/qa/MAX_VOICE_DEVICE_MATRIX.md` |

### Commands

```powershell
npx jest --runInBand --no-cache `
  tests/max_voice_consent.test.ts `
  tests/max_voice_finalize_outbox.test.ts `
  tests/max_voice_finalize_client.test.ts `
  tests/max_call_ui_state.test.ts `
  tests/max_call_reconnect.test.ts `
  tests/max_call_live_caption.test.ts `
  tests/max_call_audio_level.test.ts `
  tests/max_call_orb_visual_contract.test.ts `
  tests/max_voice_review_projection.test.ts `
  tests/max_voice_privacy_guard.test.ts `
  tests/firestore_rules_security.test.ts
```

Result: exit 0, 11/11 suites and 255/255 tests passed. The same command with
`--detectOpenHandles --forceExit=false` also exited 0 without reporting an open
handle. This second run is necessary because the repository Jest configuration
normally enables `forceExit`.

```powershell
npx jest --config jest.rntl.config.cjs --runInBand --no-cache `
  tests/max_memory_settings.test.tsx `
  tests/max_voice_accessibility.test.tsx `
  tests/max_call_live_caption_view.test.ts
```

Result: exit 0, 3/3 suites and 10/10 tests passed. The same command with
`--detectOpenHandles --forceExit=false` also exited 0 without reporting an open
handle.

```powershell
Push-Location functions
npx jest --runInBand --no-cache `
  src/max_voice_finalize.test.ts `
  src/max_voice_tutor_memory.test.ts `
  src/max_voice_prompt.test.ts `
  src/max_voice_memory_controls.test.ts `
  src/max_voice_can_do_goals.test.ts `
  src/max_voice_tutor_preview.test.ts `
  src/max_voice_ops.test.ts `
  src/max_voice_ops_dashboard.test.ts `
  src/max_voice_privacy_contract.test.ts `
  src/jarvis/maxvoice_firestore_fetcher.test.ts `
  src/jarvis/maxvoice_department.test.ts `
  src/jarvis/all_departments_snapshot.test.ts `
  src/jarvis/jarvis_data_contract_guard.test.ts `
  src/account_delete.test.ts
Pop-Location
```

Result: exit 1, 13/14 suites passed and 212/214 tests passed. The only failures
are the existing full Jarvis money-writer assertions:

- `app/economy/client_shard_operation_sync.ts` no longer contextually writes
  `openingBalance` in the expected collection write;
- the same writer no longer contextually writes `createdAtMs` in the expected
  collection write.

All selected MAX, privacy, account-deletion, MAX Jarvis fetcher/department, and
all-department snapshot tests passed. The failing guard was preserved exactly.

```powershell
Push-Location functions
npx jest --runInBand --no-cache `
  src/max_voice_ops.test.ts `
  src/max_voice_session_end.test.ts
Pop-Location

npx jest --runInBand --no-cache tests/max_call_client_teardown.test.ts
```

Result: exit 0, 34/34 server tests and 48/48 client tests passed. This includes a
regression check that `call_connected` no longer masquerades as first audio:
`firstAudioLatencyBuckets` are updated only after the client observes the real
`output_audio_buffer.started` event.

```powershell
node scripts/guard_max_voice_privacy.mjs
npx jest --runInBand --no-cache `
  tests/admin_max_voice_ops_contract.test.ts `
  tests/admin_single_surface_contract.test.ts
Push-Location functions
npm run build
Pop-Location
git diff --check
```

Results: all exit 0. The fresh build log is
`.codex-tmp/max-release-functions-build.log`. It records support-context
generation, generated-runtime cleanup, successful TypeScript compilation, asset
copy, and Functions runtime parity.

## Privacy and product assertions

- **No raw audio is retained by Phraseman.** Audio remains in the live provider /
  WebRTC path and no MAX durable writer accepts an audio field.
- **No full transcript is retained after successful finalization.** The client
  finalization envelope is account-scoped, expires after 24 hours, and is removed
  after the durable receipt. The server stores the bounded review, structured
  learner memory, evidence, and anonymous operations aggregate—not the full
  conversation.
- **No conversation content is exposed through admin, Jarvis, analytics, or MAX
  logs.** The repository privacy guard reports zero sinks. MAX admin and Jarvis
  read only bounded anonymous daily operational aggregates.
- **The review is recoverable across app kill/reopen at the code-contract level.**
  The local outbox and idempotent server receipt tests pass. Physical kill/reopen
  behavior is not yet signed off because the iOS and Android device rows remain
  unexecuted.
- **Personal MAX memory is manageable.** View, edit, delete-item, and clear-all
  contracts pass; clearing writes a tombstone so delayed finalization cannot
  silently restore deleted memory.
- **Reconnect and terminal failure states are truthful at the code-contract
  level.** The UI exposes recovery, explicit reconnect failure, Retry, and Finish;
  it does not relabel a transport failure as listening/thinking. Physical network
  interruption still requires device evidence.
- **Pronunciation is not claimed or assessed.** Current MAX feedback is limited to
  supported language/formulation evidence; no pronunciation score is presented.
- **Purchase scope was not modified by this MAX execution.** No intentional edit
  was made here to purchase, paywall, RevenueCat, pricing, or entitlement logic.
  The shared dirty worktree already contains unrelated changes in those areas, so
  this statement applies to the MAX workstream only, not to the repository-wide
  working tree.

## Device evidence required before release

The canonical matrix is `docs/qa/MAX_VOICE_DEVICE_MATRIX.md`. On 2026-08-21 all
rows remain `NOT RUN — physical device required`, including:

- real MAX audibility and audio-driven orb response;
- Bluetooth/wired route transitions and route restoration;
- VoiceOver, TalkBack, Voice/Switch Access, keyboard navigation;
- 200% text and Reduce Motion;
- background/foreground, network recovery and explicit terminal failure;
- app kill/offline reopen during finalization with exactly one durable review;
- all eight interface-language smoke tests.

Release evidence must be updated row by row with device model, OS, build/commit,
tester, date, and screenshot/recording before changing this verdict to PASS.

## Final audit notes

- `git diff --check` returned exit 0. The command emitted only existing Windows
  LF/CRLF conversion warnings.
- Scoped MAX/admin/Jarvis/rules status contains no production-file deletion.
  The removed `tests/max_voice_fallback_contract.test.ts` is the obsolete test for
  the explicitly removed B2-to-B1 fallback; owned B2 coverage replaces it.
- Admin App Check was not enabled.
- No Firebase function, hosting target, or mobile build was deployed.
- No source commit was created from the shared dirty worktree.
