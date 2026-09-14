# Revenue VNext Epic 2A — Flashcard Training Quota

**Status:** implementation GREEN; awaiting fresh critical review.  
**Scope:** flashcard training starts only. Learning V2 and Max AI Tutor are excluded.

## Commercial contract

- Free receives exactly three successful starts per IANA-local calendar day,
  shared across Swipe/True-False, Blitz, Recall, and Flashcard Speaking.
- Plus/VIP/other verified Premium access is unlimited.
- `gate_flashcards_premium=false` remains an unlimited compatibility override.
- Weekly boons do not bypass this quota.
- A start is counted only after valid content and a successful energy decision,
  immediately before playable session state is granted.
- Empty content, cancelled energy, insufficient energy, load failure, and resume
  of an existing session consume zero starts.
- A Blitz restart is a new start. Render/effect replay of the same stable start
  ID is idempotent.

## Architecture and acceptance criteria

1. `revenue_quota_calendar.ts` canonicalizes IANA zones, finds the next local
   midnight without fixed 24-hour arithmetic, retains a window's zone through
   its boundary, and uses immutable receipt observations as a clock high-water.
2. `revenue_quota_store.ts` projects only valid current-lineage
   `revenue_quota:v1:` receipts from existing PhoneState `attempt` facts.
3. `phone_state_practice_bridge.ts` distinguishes unavailable storage from an
   available empty projection and commits a caller-owned idempotent receipt.
4. `revenue_quota_access.ts` returns only
   `waiting|allowed|exhausted|unavailable|stale_account`, with usage, limit,
   reset, period, and bypass metadata. Consume runs under the account-transition
   lock, rechecks account generation, and re-verifies paid access inside it.
5. Hub and setup only preview. Each direct mode authoritatively consumes at the
   grant boundary. If energy was spent and quota refuses/fails, the existing
   durable refund path is invoked once. Only `exhausted` opens a paywall.
6. The saved-card cap remains `FREE_FLASHCARD_LIMIT = 20`.

## Post-review hardening (2026-09-13)

- Time-zone hopping is reconciled as immutable epochs rather than by exact
  `period` equality. Receipts are de-duplicated by stable ID, sorted by
  `(observedAtMs, receiptId)`, joined only while `observedAtMs < epochReset`,
  and the epoch retains the complete period/time-zone/reset tuple belonging to
  the deterministic member with the latest boundary. A Dublin/Tokyo merge
  therefore cannot open a fifth start or manufacture a mixed calendar tuple.
- Stable receipt replay is lineage-global and checked before active-window
  filtering. Retrying the same start after midnight cannot commit or charge a
  second quota fact.
- Recall and Flashcard Speaking synchronously take ownership of a charged
  energy operation before refund or acknowledgement. Cleanup and a late quota
  continuation therefore cannot invoke the refund adapter twice.
- A quota-authorized Flashcard Speaking session explicitly authorizes its
  nested hold-to-talk control. Ordinary non-session Speaking callers retain
  the existing binary Speaking gate.
- Preview freshness has three event-driven wakeups and no polling: PhoneState
  runtime revision, route focus/app-active, and one cancellable timeout at the
  server-independent epoch `resetAt`. `unavailable` remains distinct and never
  opens a false paywall.
- Blitz and Flashcard Speaking show a retryable unavailable state. A spent
  energy operation is refunded once; explicit retry uses the same quota
  receipt identity, and only a successful retry grants playable state.

## Technical-debt handling

- No standalone AsyncStorage counter or mutable balance was introduced.
- The existing practice reducer schema and existing PhoneState persistence
  collection/fields are unchanged; the receipt is an opaque value under the
  already-supported `attempt` fact. Therefore Firestore Rules and Jarvis data
  contracts require no schema update. A focused scan found no Jarvis fetcher
  reading practice attempt payloads.
- Multi-device offline starts can temporarily exceed three until immutable
  PhoneState facts merge. This is recorded as RVTD-019; client-authoritative
  progress is preserved and no committed session is revoked.
- Speaking now has dedicated RNTL coverage for unavailable/refund/retry and
  nested microphone authorization. Recall and the remaining empty/cancel/
  exhausted/resume matrices remain tracked as RVTD-020 before Epic 2 closes.
- A durable same-device pending-grant journal now closes the crash/unmount gap
  between energy debit, quota commit, playable React state, and energy ACK. It
  is scoped by account lineage plus the exact mode/target/language/deck/daily/
  size/preset fingerprint, stores the exact bounded session manifest, and is
  capped at 8 records / 128 KiB. It never evicts a committed voucher.
- Swipe, Blitz, and Flashcard Speaking have executable unmount/late-allow/
  remount races proving one quota consume, no cleanup refund, and one playable
  ACK. Recall has the same executable coordinator-core race plus a focused
  route ordering contract. Its full playable-tree RNTL harness remains open in
  RVTD-020 because this host renderer throws an opaque React `AggregateError`.
- Pending grants are same-device only. Cross-device portable recovery is
  explicitly deferred as RVTD-025; it must reuse immutable PhoneState facts
  and cannot introduce a mutable server balance or revoke a local grant.
- No economy reducer, PhoneState fact schema, Firestore collection/field, or
  Jarvis reader changed in this hardening tranche.

## Evidence

RED core:

```powershell
npx cross-env NODE_OPTIONS=--max-old-space-size=8192 jest tests/revenue_quota_calendar.test.ts tests/revenue_quota_store.test.ts tests/revenue_quota_access.test.ts --runInBand --no-cache --forceExit
```

Expected result: 3 suites failed because all three modules were absent; 0 tests
ran; 38.051s.

GREEN core and wiring:

```powershell
npx cross-env NODE_OPTIONS=--max-old-space-size=8192 jest tests/flashcard_training_quota_contract.test.ts tests/phone_state_practice_bridge.test.ts tests/revenue_quota_calendar.test.ts tests/revenue_quota_store.test.ts tests/revenue_quota_access.test.ts --runInBand --no-cache --forceExit
```

Result: 5/5 suites, 30/30 tests, 66.501s.

GREEN direct-screen regressions:

```powershell
npx cross-env NODE_OPTIONS=--max-old-space-size=8192 jest tests/flashcards_swipe_access_behavior.test.ts tests/flashcards_blitz_access_behavior.test.ts --runInBand --no-cache --forceExit
```

Result: 2/2 suites, 7/7 tests, 27.815s.

Post-review final split gate (kept split to respect the shared memory budget):

```powershell
$env:NODE_OPTIONS='--max-old-space-size=6144'; npx jest tests/revenue_quota_access.test.ts tests/revenue_quota_calendar.test.ts --runInBand --no-cache --forceExit
$env:NODE_OPTIONS='--max-old-space-size=6144'; npx jest tests/flashcard_quota_refund_once.test.ts tests/flashcard_training_quota_contract.test.ts --runInBand --no-cache --forceExit
$env:NODE_OPTIONS='--max-old-space-size=6144'; npx jest tests/use_flashcard_training_quota_preview.test.ts tests/phone_state_practice_bridge.test.ts --runInBand --no-cache --forceExit
$env:NODE_OPTIONS='--max-old-space-size=6144'; npx jest tests/flashcards_blitz_access_behavior.test.ts --runInBand --no-cache --forceExit
$env:NODE_OPTIONS='--max-old-space-size=6144'; npx jest tests/flashcards_speaking_quota_unavailable_behavior.test.ts --runInBand --no-cache --forceExit
$env:NODE_OPTIONS='--max-old-space-size=6144'; npx jest tests/speak_hold_session_authorization.test.ts --runInBand --no-cache --forceExit
```

Result: 9/9 suites, 49/49 tests. The shared semaphore was released after the
split gate (`0/3` occupied by this task).

Durable pending-grant final split gate (isolated ts-jest config used after the
normal shared transform reached the host memory ceiling):

```powershell
npx jest --config .codex-tmp/jest.pending-grant.config.cjs --runTestsByPath tests/flashcard_training_pending_grant.test.ts tests/energy_session_start_status.test.ts --runInBand --forceExit
npx jest --config .codex-tmp/jest.pending-grant.config.cjs --testMatch "<rootDir>/tests/flashcards_swipe_access_behavior.test.ts" --runInBand --forceExit
npx jest --config .codex-tmp/jest.pending-grant.config.cjs --testMatch "<rootDir>/tests/flashcards_blitz_access_behavior.test.ts" --runInBand --forceExit
npx jest --config .codex-tmp/jest.pending-grant.config.cjs --testMatch "<rootDir>/tests/fc_recall_session_contract.test.ts" --runInBand --forceExit
npx jest --config .codex-tmp/jest.pending-grant.config.cjs --testMatch "<rootDir>/tests/flashcards_speaking_quota_unavailable_behavior.test.ts" --runInBand --forceExit
```

Result: 6/6 suites, 34/34 tests. A combined `--runTestsByPath` attempt for the
two route files selected zero tests because the temporary config has a narrow
default `testMatch`; the corrected explicit `--testMatch` runs above passed.
The skipped Recall full-tree harness is not counted. Semaphore released
(`0/3` occupied by this task).

Targeted ESLint for the coordinator, energy status reader, four routes, and
focused tests exited 0: 0 errors, 3 existing import-order warnings in test
files. The text-integrity rule was disabled only on this CLI invocation to
avoid unrelated baseline truncation findings; no source rule was disabled.

Targeted ESLint exited 0 with no errors. Remaining warnings were pre-existing or
test-layout warnings; no rule was disabled in source.

## Stop gate

Do not mark Epic 2 complete or begin another monetization tranche until a fresh
critical reviewer verifies calendar rollback/tz behavior, account fencing,
receipt idempotency, energy refund ordering, direct-route parity, and the
documented residual multi-device limitation.
