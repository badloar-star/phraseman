# Social Learning Cards Admin & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure admin control surface that imports card packages, links manual social posts, retrieves per-post Publer insights, and reports honest UTM/campaign performance.

**Architecture:** Firebase Functions own all writes, Publer secrets and UTM registry checks. Firestore stores immutable content revisions, a bounded published-content registry and daily content aggregates separate from existing totals. The existing admin UI consumes narrow admin-only callables and lazy-loads one categorized section.

**Tech Stack:** Firebase Functions v2, Firestore Admin SDK and rules, Firebase Secret Manager, Publer REST API, TypeScript/Jest, static admin HTML/JS, CSV/XLSX dry-run import.

---

## File map

- Modify `knowly-www/assets/stats.js`: attach normalized location UTM to existing beacons.
- Modify `functions/src/site_stats.ts`: normalize/allowlist UTM, validate published registry, write bounded daily aggregates.
- Create `functions/src/site_stats.test.ts`: focused handler/helper tests.
- Create `functions/src/social_content_admin.ts`: admin-only package import, revision/status transitions and post links.
- Create `functions/src/social_content_storage.ts`: admin-only staging upload, validation and immutable finalized preview objects.
- Create `functions/src/social_content_publer.ts`: secret-backed per-post analytics and safe file preview/apply.
- Create `functions/src/social_content_publer.test.ts`: auth, allowlist, timeout, error and import tests.
- Modify `functions/src/index.ts`: export new callables.
- Modify `functions/tsconfig.json`: enable JSON module import for the single versioned manifest contract.
- Modify `functions/package.json`: add Ajv, Sharp and only the security-audited spreadsheet parser selected during implementation.
- Modify `firestore.rules`: admin reads for content/aggregate collections; deny public writes.
- Modify `storage.rules`: admin-only reads for finalized social-card images; all client writes denied.
- Modify `tests/firestore_rules_security.test.ts`: rules coverage.
- Create `tests/storage_social_learning_cards_security.test.ts`: Storage access contracts.
- Modify `admin/index.html`: categorized Content section, queue/detail/results UI and callable clients.
- Create `tests/admin_social_learning_cards_contract.test.ts`: UI/router/loading/error/no-secret contracts.
- Modify `tests/firebase_cost_controls_contract.test.ts`: bounded query/cache/rate-limit contracts.

### Task 1: Extend the beacon contract without changing legacy totals

**Files:**
- Modify: `knowly-www/assets/stats.js`
- Modify: `functions/src/site_stats.ts`
- Create: `functions/src/site_stats.test.ts`

- [ ] **Step 1: Write failing normalization tests**

Export pure helpers under test and assert lowercase `[a-z0-9_-]+`, max 64 chars, source/medium allowlists, no PII fields, missing UTM compatibility and unknown event rejection.

```ts
expect(normalizeUtm({ utm_source: 'Instagram', utm_medium: 'carousel', utm_campaign: 'slc_pilot_01', utm_content: 'slc_pilot_01_taste' })).toEqual({
  source: 'instagram', medium: 'carousel', campaign: 'slc_pilot_01', contentId: 'slc_pilot_01_taste',
});
expect(normalizeUtm({ utm_source: 'email@example.com' })).toBeNull();
```

- [ ] **Step 2: Verify RED**

Run: `npm --prefix functions test -- site_stats.test.ts --runInBand`

- [ ] **Step 3: Implement URL extraction and compatible payloads**

`stats.js` reads only `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` from `location.search`, sends them on initial/view/store-click events, and sends the previous payload shape when absent.

- [ ] **Step 4: Implement pure server normalization**

Keep `EVENT_FIELDS` and existing totals unchanged. Invalid UTM must be dropped rather than rejecting the valid event.

- [ ] **Step 5: Verify GREEN and legacy cost contract**

Run: `npm --prefix functions test -- site_stats.test.ts --runInBand`

Run: `npx jest tests/firebase_cost_controls_contract.test.ts --runInBand`

- [ ] **Step 6: Commit**

```powershell
git add knowly-www/assets/stats.js functions/src/site_stats.ts functions/src/site_stats.test.ts tests/firebase_cost_controls_contract.test.ts
git commit -m "feat: carry bounded campaign attribution"
```

### Task 2: Add the published-content registry and bounded aggregation

**Files:**
- Modify: `functions/src/site_stats.ts`
- Modify: `functions/src/site_stats.test.ts`
- Modify: `firestore.rules`
- Modify: `tests/firestore_rules_security.test.ts`

- [ ] **Step 1: Write failing registry tests**

Known active `campaign + contentId + platform/surface` creates/updates `site_stats_content_daily/{date}_{tupleHash}`; unknown/random IDs update totals only; 1,000 valid random IDs create zero content documents; stale cache expires; no-UTM event stays legacy-only.

- [ ] **Step 2: Verify RED**

Run: `npm --prefix functions test -- site_stats.test.ts --runInBand`

- [ ] **Step 3: Implement server-authoritative registry lookup**

Use `social_content_registry/{contentId}` with campaign, activeRevision, status=`published`, allowed surfaces and updatedAt. Cache positive/negative lookups for at most 60 seconds with a bounded 500-entry map.

- [ ] **Step 4: Implement deterministic aggregate writes**

Hash normalized date/source/medium/campaign/contentId server-side. Batch legacy totals/daily and the content aggregate only for a registered tuple. Store identifiers plus allowed increments, never raw query strings or request identity.

- [ ] **Step 5: Add rules**

Admin may read `social_learning_cards`, `social_content_registry`, and `site_stats_content_daily`; clients cannot write them. Functions use Admin SDK.

- [ ] **Step 6: Verify GREEN**

Run: `npm --prefix functions test -- site_stats.test.ts --runInBand`

Run: `npx jest tests/firestore_rules_security.test.ts --runInBand`

- [ ] **Step 7: Commit**

```powershell
git add functions/src/site_stats.ts functions/src/site_stats.test.ts firestore.rules tests/firestore_rules_security.test.ts
git commit -m "feat: aggregate registered social campaigns"
```

### Task 3: Import immutable card revisions through admin callables

**Files:**
- Create: `functions/src/social_content_admin.ts`
- Create: `functions/src/social_content_admin.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/tsconfig.json`
- Modify: `functions/package.json`
- Modify: `functions/package-lock.json`

- [ ] **Step 1: Write failing auth and revision tests**

Unauthenticated and non-admin requests return `permission-denied`; the server loads the same `functions/src/contracts/social_learning_card_manifest_v1.json` and shared fixture used by the local pipeline; valid manifest preview performs no writes; apply creates a `copy_ready` revision; published/collecting/scored revisions cannot be overwritten; changed published content creates revision N+1; post URLs and IDs are validated. The same fixture must produce identical normalized values and stable Ajv error codes in local ESM and Functions TypeScript.

- [ ] **Step 2: Verify RED**

Run: `npm --prefix functions test -- social_content_admin.test.ts --runInBand`

Also run the cross-runtime contract test that validates the shared fixture through local `schema.mjs` and server validation and compares normalized `contentId`, `revision`, `campaign`, `status`, `surfaces` and image hashes.

- [ ] **Step 3: Implement `socialContentImport` and `socialContentLinkPost`**

Before implementing the validator, install Ajv 8.20.0 as a direct Functions dependency with `npm --prefix functions install --save-exact ajv@8.20.0` and commit `functions/package.json` plus `functions/package-lock.json` in this task. Use `request.auth?.token?.admin === true`, enforce App Check consistently with admin callables, import the v1 JSON Schema with `resolveJsonModule`, configure Ajv exactly like the local validator, cap manifest plus canonical quality report JSON at 512 KB, reject unknown keys and arbitrary paths, verify the quality-report SHA-256, validate every required machine/manual gate field, and replace client reviewer/audit identity with authenticated server audit fields `createdBy`, `createdAt`, `updatedBy`, `updatedAt`.

- [ ] **Step 4: Export import/link callables and verify GREEN**

Run: `npm --prefix functions test -- social_content_admin.test.ts --runInBand`

- [ ] **Step 5: Commit**

```powershell
git add functions/src/social_content_admin.ts functions/src/social_content_admin.test.ts functions/src/index.ts functions/tsconfig.json functions/package.json functions/package-lock.json
git commit -m "feat: import social card revisions"
```

### Task 4: Deliver immutable preview images to the admin browser

**Files:**
- Create: `functions/src/social_content_storage.ts`
- Create: `functions/src/social_content_storage.test.ts`
- Modify: `functions/src/social_content_admin.ts`
- Modify: `functions/src/index.ts`
- Modify: `storage.rules`
- Modify: `functions/package.json`
- Modify: `functions/package-lock.json`
- Create: `tests/storage_social_learning_cards_security.test.ts`

- [ ] **Step 1: Write failing upload/finalize tests**

Cover admin claim, 1.5 MB per-image limit, JPEG MIME plus `FF D8 FF` magic bytes, Sharp-decoded 1080×1080 RGB/sRGB metadata, manifest SHA-256 match, only `slide_01_learning.jpg`/`slide_02_install.jpg`, closed staging path, immutable finalized path `social-learning-cards/<contentId>/revision_001/<file>`, and refusal to overwrite/delete published, collecting or scored revisions. Publish tests reject missing finalized objects, hash mismatch, failed/missing machine report, incomplete manual QA and unsupported surfaces; a complete revision transactionally enters the registry.

- [ ] **Step 2: Verify RED**

Run: `npm --prefix functions test -- social_content_storage.test.ts --runInBand`

- [ ] **Step 3: Implement admin-only upload and finalize callables**

Add Sharp to Functions dependencies. `socialContentUploadImage` accepts one base64 JPEG per call, validates decoded bytes before Admin SDK upload, and writes only to `social-learning-cards-staging/<adminUid>/<contentId>/revision_001/<file>` without a public download token. `socialContentFinalizeImages` verifies both staging objects, manifest hashes and server-validated QA, copies them with Admin SDK to immutable `social-learning-cards/<contentId>/revision_001/<file>`, verifies the copies, writes their object paths/metadata into the revision, then deletes staging objects. Local absolute paths are ignored.

- [ ] **Step 4: Add Storage rules**

Deny every client read/write/list under `social-learning-cards-staging/**`. Allow authenticated users with `request.auth.token.admin == true` to `get` immutable finalized `social-learning-cards/**` objects; deny list and all client writes. Because only Admin SDK finalize can create the final path, Storage Rules can distinguish staging from finalized state without consulting Firestore. Keep existing public asset rules unchanged.

- [ ] **Step 5: Implement the transactional server publish gate**

`socialContentPublish` re-reads the revision and both finalized Storage object metadata, verifies both SHA-256 values against the manifest, requires every machine check and manual QA field, requires allowed surfaces, then transactionally sets revision status `published` and activates `social_content_registry/{contentId}`. Any missing condition returns `failed-precondition`; incomplete revisions never enter the registry. Archive/unpublish removes eligibility without deleting historical revisions, images or analytics.

- [ ] **Step 6: Verify GREEN and rules**

Run: `npm --prefix functions test -- social_content_storage.test.ts --runInBand`

Run: `npx jest tests/storage_social_learning_cards_security.test.ts --runInBand`

Expected: staging reads fail before finalize, admin final reads pass after finalize, non-admin final reads fail, and incomplete publish leaves the registry absent.

- [ ] **Step 7: Commit**

```powershell
git add functions/src/social_content_storage.ts functions/src/social_content_storage.test.ts functions/src/social_content_admin.ts functions/src/index.ts functions/package.json functions/package-lock.json storage.rules tests/storage_social_learning_cards_security.test.ts
git commit -m "feat: upload immutable social card previews"
```

### Task 5: Verify Publer capabilities, then add secure per-post analytics

**Files:**
- Create: `functions/src/social_content_publer.ts`
- Create: `functions/src/social_content_publer.test.ts`
- Create: `functions/src/fixtures/publer_post_insights_v1.json`
- Create: `docs/reports/social-learning-cards/publer-capability.md`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Run a read-only capability spike against official Publer documentation and the configured account**

Verify current plan entitlement, `Bearer-API` authentication, workspace header, real post-insights endpoint, response fields, pagination, rate limits and per-network metric availability. Save a redacted normalized fixture at `functions/src/fixtures/publer_post_insights_v1.json` and a short decision record at `docs/reports/social-learning-cards/publer-capability.md`; neither file may contain tokens, account secrets or raw personal data. If access is unavailable, record `apiAvailable: false`; implement a deterministic `publer_api_unavailable` result that performs no provider request, make its tests GREEN, and proceed to Task 6 fallback without blocking the phase.

- [ ] **Step 2: Write failing security tests against the verified fixture**

Cover admin claim, `PUBLER_API_KEY` secret binding, account allowlist, post ID/URL validation, 8-second timeout, 429 retry-after handling, safe provider errors, 60-second request rate limit and absence of tokens/raw responses in logs.

- [ ] **Step 3: Verify RED**

Run: `npm --prefix functions test -- social_content_publer.test.ts --runInBand`

- [ ] **Step 4: Implement `socialContentPublerSync` only when the spike proves access**

Use `defineSecret('PUBLER_API_KEY')`, an admin-only callable, `AbortController`, one bounded retry for 429/5xx, and allowlisted account IDs from `social_content_config/publer`. Use only the verified endpoint/auth/response contract from Step 1, normalize required metrics, and store them under the linked revision/platform. Do not hard-code an endpoint before the spike.

- [ ] **Step 5: Verify GREEN**

Run: `npm --prefix functions test -- social_content_publer.test.ts --runInBand`

- [ ] **Step 6: Commit**

```powershell
git add functions/src/social_content_publer.ts functions/src/social_content_publer.test.ts functions/src/fixtures/publer_post_insights_v1.json functions/src/index.ts docs/reports/social-learning-cards/publer-capability.md
git commit -m "feat: sync Publer social post insights"
```

### Task 6: Add safe CSV/XLSX preview and apply fallback

**Files:**
- Modify: `functions/src/social_content_publer.ts`
- Modify: `functions/src/social_content_publer.test.ts`
- Modify: `functions/package.json`
- Modify: `functions/package-lock.json`

- [ ] **Step 1: Add failing import tests**

Reject files over 5 MB/10,000 rows, `.xlsm`, wrong MIME/extension, unknown columns, formulas beginning `=`, `+`, `-`, `@`, path-like fields and unlinked accounts/posts. Preview writes nothing; apply requires a server-issued preview hash and admin confirmation.

- [ ] **Step 2: Verify RED**

Run: `npm --prefix functions test -- social_content_publer.test.ts --runInBand`

- [ ] **Step 3: Select and audit a maintained XLSX parser, then implement fixed schema**

Check the current release, maintenance status, license and published security advisories of candidate libraries from primary sources. Add the chosen package and lockfile only after the audit passes. Run `npm --prefix functions audit --omit=dev` and do not accept a newly introduced high/critical advisory. Enforce compressed and decompressed byte limits, at most 3 sheets, parse only the first expected sheet, at most 10,000 rows/cells within the fixed table, and bounded shared strings. Accepted columns are exactly `platform,account_id,post_id,published_at,reach,impressions,reactions,comments,shares,saves,link_clicks`. Convert cells to inert typed values and never evaluate formulas.

- [ ] **Step 4: Implement preview/apply token**

Preview returns normalized rows and a SHA-256 hash and stores an admin-bound preview record in Firestore `social_content_import_previews/{hash}` with `createdBy`, schema version and `expiresAt` 15 minutes later. Apply re-parses the same re-uploaded bytes, verifies the hash and unexpired preview record, then writes only linked revision metrics. Correctness must not depend on process memory; TTL cleanup may remove expired preview records later.

- [ ] **Step 5: Verify GREEN and build**

Run: `npm --prefix functions test -- social_content_publer.test.ts --runInBand`

Run: `npm --prefix functions run build`

- [ ] **Step 6: Commit**

```powershell
git add functions/src/social_content_publer.ts functions/src/social_content_publer.test.ts functions/package.json functions/package-lock.json
git commit -m "feat: preview social analytics imports"
```

### Task 7: Add the categorized admin content workspace

**Files:**
- Modify: `admin/index.html`
- Create: `tests/admin_social_learning_cards_contract.test.ts`

- [ ] **Step 1: Read `docs/design/ADMIN_UI_BIBLE.md` immediately before editing**

Confirm category, navigation, tooltip, loading/empty/error, accessibility and responsive table rules.

- [ ] **Step 2: Write failing admin contracts**

Assert `social-learning-cards` is registered under the existing content/campaign category, data lazy-loads only when active, queue/detail/results views exist, finalized Storage object paths render both authenticated previews, every icon-only action has tooltip and aria-label, zero/loading/error states are explicit, lime controls use dark text, and no secret literal appears.

- [ ] **Step 3: Verify RED**

Run: `npx jest tests/admin_social_learning_cards_contract.test.ts --runInBand`

- [ ] **Step 4: Implement a compact workspace**

Add one sidebar destination with internal chips for Queue, Card, Publications, Results and Winners rather than five top-level tabs. Use existing Firebase callable helpers and Firebase Storage SDK authenticated `getBlob`/`getBytes` reads (not tokenized public download URLs), upload/finalize the two selected package JPEGs before rendering previews, require confirm for publish/apply, and show correlation labels for Instagram/TikTok.

- [ ] **Step 5: Verify GREEN and neighboring contracts**

Run: `npx jest tests/admin_social_learning_cards_contract.test.ts tests/admin_sidebar_icons_contract.test.ts tests/admin_revenue_analytics_contract.test.ts --runInBand`

- [ ] **Step 6: Commit**

```powershell
git add admin/index.html tests/admin_social_learning_cards_contract.test.ts
git commit -m "feat: add social content admin workspace"
```

### Task 8: Join Publer, site aggregates and honest winner scores

**Files:**
- Modify: `admin/index.html`
- Modify: `tests/admin_social_learning_cards_contract.test.ts`

- [ ] **Step 1: Add failing score tests**

Assert education score uses `(saves + shares) / max(reach,1)`, commercial score uses exact `utm_content` only where a post has a unique clickable URL, and Instagram/TikTok display campaign-window correlation separately and never label it attributed installs.

- [ ] **Step 2: Verify RED**

Run: `npx jest tests/admin_social_learning_cards_contract.test.ts --runInBand`

- [ ] **Step 3: Implement results and winners tables**

Show raw values, denominators, collection timestamp, platform availability and confidence label. Do not combine missing metrics into zero. Allow 24h/72h/7d windows and compare like-for-like surfaces only.

- [ ] **Step 4: Verify GREEN**

Run: `npx jest tests/admin_social_learning_cards_contract.test.ts --runInBand`

- [ ] **Step 5: Commit**

```powershell
git add admin/index.html tests/admin_social_learning_cards_contract.test.ts
git commit -m "feat: rank social learning card results"
```

### Task 9: End-to-end focused verification

- [ ] Run `npm --prefix functions test -- site_stats.test.ts social_content_admin.test.ts social_content_storage.test.ts social_content_publer.test.ts --runInBand` — expected PASS.
- [ ] Run `npm --prefix functions run build` — expected PASS.
- [ ] Run the cross-runtime manifest contract test against local ESM and Functions TypeScript — expected identical normalized fixture and stable Ajv error codes.
- [ ] Run `npx jest tests/admin_social_learning_cards_contract.test.ts tests/firestore_rules_security.test.ts tests/storage_social_learning_cards_security.test.ts tests/firebase_cost_controls_contract.test.ts --runInBand` — expected PASS.
- [ ] Run an emulator-backed test transition: import preview → apply revision → verify publish fails and registry stays absent before QA/images → upload and finalize both immutable JPEGs → open both authenticated previews in admin → publish registry only after machine/manual gates → call `/download/?utm_source=facebook&utm_medium=post&utm_campaign=slc_pilot_01&utm_content=slc_pilot_01_taste` beacon → verify totals plus one content aggregate → verify `utm_content=slc_random_0001` creates no content aggregate → read result in admin.
- [ ] Run `git diff --check` and verify no token, raw provider response, generated DALL-E source or unrelated user change is staged.
- [ ] Do not deploy without a separate explicit deployment request. Future deployment must use narrow targets only: the new `socialContent*` Functions plus changed `siteStatsTrack`, `firestore.rules`, `storage.rules`, website hosting source `knowly-www`, and Firebase Hosting target `admin`; do not use a blanket Functions deploy as the normal path.
