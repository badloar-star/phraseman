# Admin Survey Analytics Master–Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the live admin survey section into a compact master–detail analytics workspace that shows all 63 scheduled surveys and opens exact aggregate results for any row.

**Architecture:** Keep Firestore reads and the existing survey editor unchanged. Extend only the survey CSS/markup/script blocks inside `admin/v2/legacy.html`: derive a cyclic schedule view from existing rotation metadata, render accessible clickable rows with local mini-distributions, and reuse `_ssStats` plus the existing bounded raw-response query for the detail pane.

**Tech Stack:** Static HTML/CSS/JavaScript, Firebase Firestore Web SDK already loaded by `admin/v2/legacy.html`, Node contract scripts, Firebase Hosting target `admin`.

---

### Task 1: Lock the master–detail contract

**Files:**
- Create: `scripts/verify_shard_survey_admin_master_detail.mjs`
- Test: `scripts/verify_shard_survey_admin_master_detail.mjs`

- [ ] **Step 1: Write the failing contract**

Create a source contract that asserts the live admin contains schedule-first sorting, date labels, a full-row selection handler, mini-distribution markup, selected-row semantics, the existing aggregate pane, and responsive master–detail breakpoints:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../admin/v2/legacy.html', import.meta.url), 'utf8');
assert.match(source, /function ssScheduledSurveyRows\(\)/);
assert.match(source, /function ssNearestRotationDate\(survey, nowMs = Date\.now\(\)\)/);
assert.match(source, /window\.ssSelectSurveyRow = async function/);
assert.match(source, /class="ss-cycle-row/);
assert.match(source, /aria-pressed=/);
assert.match(source, /class="ss-mini-distribution"/);
assert.match(source, /data-ss-view="next7"/);
assert.match(source, /grid-template-columns:minmax\(420px/);
assert.match(source, /@media\(max-width:767px\)/);
console.log('PASS shard survey admin master-detail contract');
```

- [ ] **Step 2: Verify RED**

Run: `node scripts/verify_shard_survey_admin_master_detail.mjs`  
Expected: FAIL because `ssScheduledSurveyRows`, `ss-cycle-row`, and the mini-distribution do not yet exist.

### Task 2: Build the compact schedule list

**Files:**
- Modify: `admin/v2/legacy.html` survey CSS block near `#tab-surveys .ss-grid`
- Modify: `admin/v2/legacy.html` survey list markup near `#ss-survey-list`
- Modify: `admin/v2/legacy.html` survey script near `ssRotationOccurrence` and `renderShardSurveyList`
- Test: `scripts/verify_shard_survey_admin_master_detail.mjs`

- [ ] **Step 1: Add pure schedule helpers**

Implement helpers with these exact responsibilities:

```js
function ssNearestRotationDate(survey, nowMs = Date.now()) {
  const occurrence = ssRotationOccurrence(nowMs);
  const order = Number(survey?.rotation?.order);
  const offset = ((order - occurrence.index) % SS_ROTATION_SURVEY_IDS.length
    + SS_ROTATION_SURVEY_IDS.length) % SS_ROTATION_SURVEY_IDS.length;
  return { offset, dateMs: occurrence.dayStartMs + offset * 86400000 };
}

function ssScheduledSurveyRows() {
  const rotation = _ssSurveys.filter(ssIsRotationSurvey)
    .map((survey) => ({ survey, schedule: ssNearestRotationDate(survey) }))
    .sort((a, b) => a.schedule.offset - b.schedule.offset);
  const outside = _ssSurveys.filter((survey) => !ssIsRotationSurvey(survey));
  return { rotation, outside };
}
```

Extend `ssRotationOccurrence` to return `dayStartMs` without changing its existing `surveyId`, `index`, or day-key behaviour.

- [ ] **Step 2: Render one compact interactive row per survey**

Replace the five-column table body with a semantic list. Each row must be a `button` with `aria-pressed`, selected/today classes, an exact date/relative label, total response count, and a mini segmented distribution derived from the first choice question and `_ssStats`:

```js
window.ssSelectSurveyRow = async function ssSelectSurveyRow(surveyId) {
  _ssCurrentId = surveyId;
  const select = document.getElementById('ss-survey-select');
  if (select) select.value = surveyId;
  window.renderShardSurveyList();
  renderShardSurveySummary();
  await loadShardSurveyResponses();
};
```

Rows must call this handler from the full surface, not expose a separate «Результаты» link.

- [ ] **Step 3: Add filters without changing selection**

Use existing `_ssView` with values `all`, `today`, and `next7`. Filtering changes the visible rows only. If the selected survey is filtered out, keep `_ssCurrentId` and the right pane unchanged.

- [ ] **Step 4: Add compact accessible styling**

Use the existing `--ss-*` tokens. Desktop layout uses `grid-template-columns:minmax(420px,.92fr) minmax(380px,1.08fr)`, selected and today states include text plus border/background, rows remain at least 56 px tall, focus-visible uses the existing cyan outline, and hover changes color only.

- [ ] **Step 5: Verify GREEN**

Run: `node scripts/verify_shard_survey_admin_master_detail.mjs`  
Expected: `PASS shard survey admin master-detail contract`.

### Task 3: Refine the right-hand analytics pane

**Files:**
- Modify: `admin/v2/legacy.html` survey results markup near `#ss-results-panel`
- Modify: `admin/v2/legacy.html` function `renderShardSurveySummary`
- Modify: `admin/v2/legacy.html` raw response details near `#ss-feed-panel`
- Test: `scripts/verify_shard_survey_admin_aggregate.mjs`
- Test: `scripts/verify_shard_survey_admin_master_detail.mjs`

- [ ] **Step 1: Keep aggregate data first**

Render full question text, next-show date, total responses, last response timestamp, and every option in source order. Each option shows `count · percent` and a proportional bar. Zero-response options stay visible with `0 · 0%`.

- [ ] **Step 2: Move raw responses under the selected detail**

Keep the bounded raw list in a collapsed `<details>` labelled «Комментарии и ответы». Preserve the current 300-document limit, partial-data warning, fallback query, search, and CSV export behaviour.

- [ ] **Step 3: Preserve aggregates on raw-feed failure**

`loadShardSurveyResponses` may update only the raw-response status/list. It must not clear `#ss-summary` if its query fails.

- [ ] **Step 4: Verify focused contracts**

Run:

```powershell
node scripts/verify_shard_survey_admin_master_detail.mjs
node scripts/verify_shard_survey_admin_aggregate.mjs
node scripts/verify_shard_survey_admin_rotation.mjs
```

Expected: all three commands print `PASS` and exit 0.

### Task 4: Build and publish only the live admin surface

**Files:**
- Modify: `scripts/build_shard_survey_admin_release_artifact.mjs` only if its survey section markers do not include the complete new master–detail block
- Verify: `.codex-tmp/shard-survey-admin-release/public/legacy.html`

- [ ] **Step 1: Build the isolated hosting artifact**

Run: `node scripts/verify_shard_survey_admin_release_artifact.mjs`  
Expected: artifact PASS and no non-survey working-tree sections included.

- [ ] **Step 2: Verify the artifact contains the new contract**

Run the master–detail verifier against both canonical and artifact HTML. Expected: both PASS.

- [ ] **Step 3: Deploy only Firebase Hosting target admin**

Run the deploy from the isolated artifact configuration with the existing `admin` target. Do not deploy Functions, Firestore Rules, EAS, or the mobile app.

- [ ] **Step 4: Verify production**

Fetch `https://phraseman-ea0b3.web.app/legacy.html`, verify HTTP 200, compare SHA-256 with the isolated artifact, and assert production contains `ssScheduledSurveyRows`, `ss-cycle-row`, `ss-mini-distribution`, «Сегодня», «В ротации», and the aggregate-results markers.

- [ ] **Step 5: Report the release**

Report the production URL, exact hosting-only scope, focused contract results, and any bounded-data limitation. Do not claim a Functions or mobile release.
