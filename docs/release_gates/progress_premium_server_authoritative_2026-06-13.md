# Progress/Premium Server-Authoritative Release Gate

Date: 2026-06-13

Status: deploy locked. Do not deploy functions, Firestore rules, EAS updates, or hosting until this gate is green.

## 2026-06-13 Audit Run Status

Passed:

- Functions build passed.
- Functions progress/auth/premium suite passed: 92 tests.
- Client progress/auth/premium contract suite passed: 146 tests.
- Firestore emulator progress e2e passed: migration, duplicate ledger, concurrent events, lesson/exam completion fields.
- Premium static/runtime contracts passed: RevenueCat identity, purchase activation, restore activation, trial signal, VIP separation, premium guard, admin grant contract, QA strip contract.
- Read-only Firebase functions log check was available for project `phraseman-ea0b3`; the inspected RevenueCat/progress/premium slice did not show purchase/progress function failures.

Maestro/device status:

- Maestro is installed and sees Android `pixel_6` / `emulator-5554`.
- `phraseman:///admin_premium_delivery_test` opens the dev-only premium delivery screen through adb.
- Maestro active-screen flow reaches the screen and taps `Run auth matrix`.
- The auth matrix currently fails with Firestore `permission-denied` when the app client tries to write `progress.vip_*`.
- Local Admin Panel was started at `http://localhost:4173/#vip`.
- A clean browser check reaches the Admin login screen, which is expected: VIP grant requires Google sign-in with `admin=true`.
- Test device target for the admin-panel VIP delivery check:
  - `stable_id`: `a8fd45d9-11f1-4595-af42-48f120149884`
  - `auth_uid`: `oUAOKkdopqWalvsIhd11E2KbtFf2`

Interpretation:

- This is a correct security block, not something to bypass in rules. Regular clients must not be able to grant themselves VIP/Premium.
- The old dev E2E harness is stale: it simulates admin VIP delivery from inside the app client, but current security requires either an authenticated admin custom claim, Admin SDK/server path, or actual admin panel write.
- Do not weaken `progressHasNoPremiumWrites()` to make this E2E pass.

Remaining release blocker:

- Sign into the local Admin Panel with a Google account that has `admin=true`.
- In the VIP tab, grant VIP to the displayed safe E2E `stable_id`.
- After the admin-panel grant, rerun `maestro/flows/dev_only/admin_premium_delivery_external_grant.yaml` and require `admin-premium-e2e-pass`.
- Do not use the app client to self-grant VIP, and do not weaken Firestore rules.

Separate pre-release risk:

- Firebase logs show repeated App Check warnings/errors such as `short_non_jwt` for `authEnsureStableLink` and several league/community callables. Enforcement is currently disabled, so these calls are allowed today. Do not enable App Check enforcement until native App Check token shape is fixed and verified.

## Why This Gate Exists

The progress cutover moves core learning state from device-owned sync to server-authoritative events. A bad release can lose XP, lesson completion, exam completion, streak, or premium/VIP access. This gate is required because the Firestore emulator already caught a real write-shape bug that unit tests missed.

## Must Pass Before Deploy

1. Functions build:
   `npm --prefix functions run build`

2. Functions tests:
   `npm --prefix functions test -- progress_events.test.ts auth_identity.test.ts auth_merge.test.ts --runInBand`

3. Firestore emulator progress e2e:
   `npx firebase emulators:exec --only firestore "node functions/scripts/e2e_progress_events_emulator.cjs"`

4. Client/contracts:
   `npx jest tests/firestore_rules_security.test.ts tests/variable_reward_system.test.ts tests/personal_plan_day_reward.test.ts tests/progress_event_type_contract.test.ts tests/progress_events_client_queue.test.ts tests/auth_provider_stable_link.test.ts tests/admin_premium_delivery_contract.test.ts tests/paywall_purchase_activation_contract.test.ts tests/revenuecat_init_identity.test.ts tests/premium_revenuecat_state.test.ts tests/premium_trial_signal.test.ts tests/premium_guard.test.ts tests/qa_strip_premium_contract.test.ts --runInBand --no-cache`

5. Maestro dev-device premium delivery:
   `maestro test maestro/flows/dev_only/admin_premium_delivery_e2e.yaml`

   If Maestro `openLink` ignores the Expo Router path on Android, open the route with adb first and then run the active-screen flow:
   `adb shell am start -W -a android.intent.action.VIEW -d phraseman:///admin_premium_delivery_test app.phraseman`
   `maestro test maestro/flows/dev_only/admin_premium_delivery_e2e_active.yaml`

   Note: this flow requires an admin-authorized VIP grant path. If it fails with `permission-denied` on `progress.vip_*`, the rules are doing the right thing and the harness must be run with a real admin path, not with weakened client rules.

   Admin Panel path:

   - Start admin locally:
     `npm run admin:serve`
   - Open:
     `http://localhost:4173/#vip`
   - Sign in with a Google account that has custom claim `admin=true`.
   - Open the app route:
     `adb shell am start -W -a android.intent.action.VIEW -d phraseman:///admin_premium_delivery_test app.phraseman`
   - Copy the displayed `stable_id`.
   - In the Admin Panel VIP tab, grant VIP to that `stable_id`.
   - Verify delivery on the already-open app screen:
     `maestro test maestro/flows/dev_only/admin_premium_delivery_external_grant.yaml`

## Manual Runtime Scenarios

Run on a dev build connected to Firebase test/dev environment unless explicitly doing a read-only prod audit.

1. Existing user with old local progress opens the app.
   Expected: local snapshot migrates once, server values are not lowered, migration marker is set only after server success.

2. Complete a lesson.
   Expected: `progressSubmitEvent` writes server ledger row, XP/streak/weekly XP update on server, local cache mirrors server result.

3. Complete an exam.
   Expected: exam progress fields are written by server event, not by outbound client sync.

4. Offline then online.
   Expected: event is queued once in `progress_server_event_queue_v1`, app does not burn one-time rewards before confirmed XP, flush sends the event later.

5. Premium/VIP delivery.
   Expected: admin/VIP grant reaches the same stable account, `hasPremiumAccess` becomes true, real RevenueCat premium stays separate from VIP, revoke removes VIP access, later grant works again.

6. Account switch.
   Expected: premium/VIP does not leak from previous stable id to a new stable id.

7. Purchase/trial risk audit.
   Expected: RevenueCat identity is configured before purchase/restore, purchase success persists premium event telemetry, trial signal does not grant fake premium unless RevenueCat entitlement is active.

## Do Not Deploy Until

- All automated commands above pass.
- Maestro premium flow passes on an actual local device/emulator.
- No new critical errors appear in app health for auth, premium, purchase, or progress after the dev smoke.
- Deploy lock is intentionally reviewed and removed by the owner.
