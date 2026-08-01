# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e\r7\admin_content_factory.spec.ts >> R10B visible workflow covers dependencies, atomic range, edit diff, filters and cursor pagination
- Location: tests\e2e\r7\admin_content_factory.spec.ts:142:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/v2/#content", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | async function installBackend(page: Page) {
  4   |   await page.addInitScript(() => {
  5   |     (globalThis as any).__R7_ERRORS__ = [];
  6   |     globalThis.addEventListener('error', (event) => (globalThis as any).__R7_ERRORS__.push(String(event.error?.stack || event.message)));
  7   |     globalThis.addEventListener('unhandledrejection', (event) => (globalThis as any).__R7_ERRORS__.push(String(event.reason?.stack || event.reason)));
  8   |     const backend: any = { stages: [], jobs: [], calls: [], audit: [], failNext: false, delayNext: false, lateDiscarded: false, activeRelease: 'release-old', revision: 1, drafts: { d1: 'approved' }, sealed: false, arenaConfig: { mode: 'legacy', revision: 0, canaryBps: 0, comparatorVersion: 'arena-parity-v1', minimumEvidenceWindow: { comparisons: 200, jobs: 20, days: 7 }, disabledReason: 'not_initialized' } };
  9   |     const find = (id: string) => backend.stages.find((item: any) => item.stageId === id);
  10  |     const cap = (kind: string, scopeType: string, count: any, prerequisites: string[] = [], cefr = ['A1','A2','B1','B2','C1','C2']) => ({ kind, scopeType, count, prerequisiteKinds: prerequisites, prerequisiteCardinality: { min: prerequisites.length, max: prerequisites.length }, dependencyScopePolicy: 'same_scope', editableFields: ['items'], publicationPolicy: 'standard', runtimeConsumer: true, cefr });
  11  |     const capabilities: any = {
  12  |       lesson_outline: cap('lesson_outline','lesson',{ min:1,max:1,fixed:1 }), lesson_phrases: cap('lesson_phrases','lesson',{ min:50,max:50,fixed:50 },['lesson_outline']), lesson_vocabulary: cap('lesson_vocabulary','lesson',{ min:1,max:1000 },['lesson_phrases']), lesson_irregular_verbs: cap('lesson_irregular_verbs','lesson',{ min:1,max:1000 },['lesson_phrases']), lesson_prepositions: cap('lesson_prepositions','lesson',{ min:1,max:1000 },['lesson_phrases']), lesson_theory: cap('lesson_theory','lesson',{ min:1,max:1000 },['lesson_phrases']),
  13  |       quiz_topic: cap('quiz_topic','topic',{ min:1,max:1,fixed:1 }), quiz_questions: cap('quiz_questions','topic',{ min:10,max:10,fixed:10 },['quiz_topic']), challenge_topic: cap('challenge_topic','topic',{ min:1,max:1,fixed:1 }), challenge_questions: cap('challenge_questions','topic',{ min:10,max:10,fixed:10 },['challenge_topic']), flashcard_pack_idea: cap('flashcard_pack_idea','pack',{ min:1,max:1,fixed:1 }), flashcard_items: cap('flashcard_items','pack',{ min:1,max:20 },['flashcard_pack_idea']), arena_topic: cap('arena_topic','arena',{ min:1,max:1,fixed:1 },[],['A1','A2','B1','B2']), arena_questions: cap('arena_questions','arena',{ min:10,max:10,fixed:10 },['arena_topic'],['A1','A2','B1','B2']),
  14  |     };
  15  |     const actions: any = new Proxy({
  16  |       getContentStageCapabilities: async () => ({ version: 'e2e', languagePolicy: { studyTargets: ['en','fr','de'], sourceLocales: ['ru','en'], sameLanguageAllowed: false }, capabilities }),
  17  |       listContentStages: async (input: any) => { backend.calls.push(['list', { ...input }]); const filtered = backend.stages.filter((item: any) => (!input.kind || item.kind === input.kind) && (!input.state || item.state === input.state) && (!input.scopeId || item.scopeId === input.scopeId)); const offset = Number(input.cursor || 0); const limit = Number(input.limit || 50); const stages = filtered.slice(offset, offset + limit).map((item: any) => ({ ...item })); const more = offset + limit < filtered.length; return { stages, nextCursor: more ? String(offset + limit) : null, isPartial: more }; },
  18  |       createContentStage: async (input: any) => { const stageId = `${input.requestId}:${input.kind}:${input.scopeId}:r${input.revision}`; if (!find(stageId)) backend.stages.push({ ...input, stageId, id: stageId, state: 'queued', resolvedCount: input.count }); backend.calls.push(['create', stageId]); return { stageId }; },
  19  |       runContentStage: async ({ stageId }: any) => { const stage = find(stageId); stage.attempts = Number(stage.attempts || 0) + 1; const action = stage.attempts === 1 ? 'content_factory.stage.generate' : 'content_factory.stage.retry'; backend.calls.push(['run', stageId]); if (backend.failNext) { backend.failNext = false; stage.state = 'failed'; stage.retryable = true; stage.errorCode = 'provider_rate_limit'; stage.errorMessage = 'Retry later'; backend.audit.push({ action, stageId, attempt: stage.attempts, outcome: 'failed' }); throw new Error('provider_rate_limit'); } if (backend.delayNext) { backend.delayNext = false; stage.state = 'running'; await new Promise<void>((resolve) => { backend.resolveLate = resolve; }); if (stage.state === 'cancelled') { backend.lateDiscarded = true; return { discarded: true }; } } stage.state = 'needs_review'; stage.retryable = false; backend.audit.push({ action, stageId, attempt: stage.attempts, outcome: 'needs_review' }); return { ok: true }; },
  20  |       controlContentStage: async ({ stageId, action }: any) => { const stage = find(stageId); backend.calls.push([action, stageId]); if (action === 'pause') stage.state = 'paused'; if (action === 'resume') stage.state = 'queued'; if (action === 'cancel') stage.state = 'cancelled'; return { state: stage.state }; },
  21  |       previewContentStage: async ({ stageId }: any) => { const stage = find(stageId); backend.calls.push(['preview', stageId]); return { stage: { ...stage, artifactId: `artifact:${stageId}` }, payload: { stage: stage.kind, result: { title: `Preview ${stage.scopeId}` } }, qaReceipt: { status: 'passed', contentHash: 'a'.repeat(64) }, reviewFingerprint: 'f'.repeat(64) }; },
  22  |       reviewContentStage: async ({ stageId, status }: any) => { find(stageId).state = status; backend.calls.push([status, stageId]); return { ok: true }; },
  23  |       listContentStageDependencies: async ({ consumerKind }: any) => ({ items: backend.stages.filter((item: any) => item.state === 'approved').map((item: any) => ({ stageId: item.stageId, kind: item.kind, scopeId: item.scopeId, title: `Approved ${item.scopeId}`, revision: item.revision, artifactId: `artifact:${item.stageId}`, contentHash: 'a'.repeat(64) })).filter((item: any) => consumerKind === 'lesson_phrases' ? item.kind === 'lesson_outline' : true) }),
  24  |       createContentStageBulkPlan: async (input: any) => { const stageIds: string[] = []; for (let lesson = input.lessonRange.start; lesson <= input.lessonRange.end; lesson += 1) for (const kind of input.kinds) { const stageId = `${input.requestId}:${kind}:lesson-${lesson}:r1`; if (!find(stageId)) backend.stages.push({ ...input, kind, scopeId: `lesson-${lesson}`, revision: 1, count: capabilities[kind].count.fixed || capabilities[kind].count.min, stageId, id: stageId, state: 'queued' }); stageIds.push(stageId); } backend.calls.push(['bulk', stageIds]); return { planId: `bulk:${input.idempotencyKey}`, stageIds, progress: { planned: stageIds.length, queued: stageIds.length, completed: 0, failed: 0 }, conflicts: [], replayed: false }; },
  25  |       editContentStageArtifact: async ({ baseStageId, artifact }: any) => { const base = find(baseStageId); const revision = Number(base.revision) + 1; const stageId = `${base.requestId}:${base.kind}:${base.scopeId}:r${revision}`; backend.stages.push({ ...base, stageId, id: stageId, revision, state: 'needs_review', baseStageId }); const diff = { summary: { added: 0, removed: 0, changed: 1, moved: 0 }, details: [{ type: 'changed', path: 'result.title' }], isPartial: false }; backend.calls.push(['edit', stageId, artifact]); return { stageId, revision, diff, replayed: false }; },
  26  |       getFactoryRolloutMetrics: async () => ({ metrics: { window: { fromMs: 1, toMs: 2 }, attemptCount: 5, acceptedArtifactCount: 4, attemptsPerAcceptedArtifact: 1.25, failuresByCategory: { provider_rate_limit: 1 }, populations: { staged: { attemptCount: 3 }, legacy: { attemptCount: 2 } }, qa: { passed: 4, failed: 1 }, operatorCorrectionRate: 0.25, latencyMs: { p50: 120, p95: 450 }, budgetProxy: { reservedUnits: 4, capUnits: 10 } } }),
  27  |       getArenaConvergenceStatus: async () => ({ arena: { ...backend.arenaConfig }, metrics: { sampleCount: 3, completeCount: 3, criticalMismatchCount: 0, fallbackCount: 0, goBlockers: ['minimum_comparisons_not_met'] }, isPartial: false, nextCursor: null }),
  28  |       updateArenaConvergenceConfig: async ({ mode, expectedRevision }: any) => { if (expectedRevision !== backend.arenaConfig.revision) throw new Error('revision conflict'); backend.arenaConfig = { ...backend.arenaConfig, mode, revision: expectedRevision + 1, disabledReason: mode === 'legacy' ? 'operator_kill_switch' : null }; backend.calls.push(['arena-mode', mode]); return { arena: backend.arenaConfig }; },
  29  |       getFactoryWorkspace: async () => ({ sourceRegistries: [{ id: 'english-core-32:v1', lessons: Object.fromEntries(Array.from({ length: 100 }, (_, index) => [String(index + 1), {}])) }], releases: [{ releaseId: 'release-old' }, ...(backend.sealed ? [{ releaseId: 'release-new' }] : [])] }),
  30  |       createFactoryJob: async (input: any) => { backend.createdLessonIds = [...input.lessonIds]; const job = { id: input.idempotencyKey, projectId: input.projectId, studyTarget: input.studyTarget, learnerSourceLocale: input.sourceLocale, sourceLocale: input.sourceLocale, releaseCandidate: true, state: 'needs_review', progress: { total: 4, completed: 4, failed: 0 } }; const units = ['lesson', 'quiz', 'flashcard', 'arena'].map((surface) => ({ id: `${job.id}-${surface}`, unitId: `${job.id}-${surface}`, jobId: job.id, lessonId: input.lessonIds[0], surface, state: 'succeeded' })); backend.jobs = [{ job, units, review: null, release: null }]; backend.calls.push(['create-range', input.lessonIds]); return { jobId: job.id }; },
  31  |       listFactoryJobs: async () => ({ jobs: backend.jobs.map((entry: any) => entry.job) }),
  32  |       getFactoryJobDetail: async ({ jobId }: any) => { const entry = backend.jobs.find((item: any) => item.job.id === jobId); return { ok: true, jobId, job: { ...entry.job }, units: entry.units.map((unit: any) => ({ ...unit })), review: entry.review ? { ...entry.review } : null, release: entry.release ? { ...entry.release } : null, catalog: { revision: backend.revision, activeRelease: { releaseId: backend.activeRelease } } }; },
  33  |       previewFactoryUnit: async ({ unitId }: any) => ({ unit: { id: unitId }, payload: { lessonId: 1, phrases: ['Safe preview'] }, qaReceipt: { status: 'passed', contentHash: 'b'.repeat(64) } }),
  34  |       reviewFactoryJob: async ({ jobId, status, reason }: any) => { backend.jobs.find((item: any) => item.job.id === jobId).review = { status, reason }; backend.calls.push(['review-job', status]); return { ok: true }; },
  35  |       sealFactoryRelease: async ({ jobId }: any) => { backend.sealed = true; backend.jobs.find((item: any) => item.job.id === jobId).release = { releaseId: 'release-new' }; backend.calls.push(['seal']); return { releaseId: 'release-new' }; },
  36  |       activateFactoryRelease: async () => { backend.activeRelease = 'release-new'; backend.revision += 1; backend.calls.push(['activate']); return { revision: backend.revision }; },
  37  |       rollbackFactoryRelease: async () => { backend.activeRelease = 'release-old'; backend.revision += 1; backend.calls.push(['rollback']); return { revision: backend.revision }; },
  38  |       getDailyBriefing: async () => null,
  39  |     }, { get(target, key) { if (key === 'then') return undefined; return key in target ? target[key] : async () => ({}); } });
  40  |     (globalThis as any).__R7_BACKEND__ = backend;
  41  |     (globalThis as any).__PHRASEMAN_ADMIN_E2E__ = { auth: { authorized: true, email: 'e2e@localhost', role: 'admin' }, actions };
  42  |   });
  43  |   await page.route('**/*', async (route) => {
  44  |     const url = new URL(route.request().url());
  45  |     if (url.hostname === '127.0.0.1' && url.port === '4173') return route.continue();
  46  |     throw new Error(`Unexpected network request: ${url.href}`);
  47  |   });
  48  | }
  49  | 
  50  | async function openContent(page: Page) {
  51  |   await installBackend(page);
> 52  |   await page.goto('/v2/#content');
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  53  |   await expect.poll(() => page.evaluate(() => Boolean((globalThis as any).__PHRASEMAN_ADMIN_E2E__?.ready))).toBe(true);
  54  |   await expect(page.locator('.content-generator-shell')).toBeVisible();
  55  |   page.on('dialog', (dialog) => dialog.accept());
  56  | }
  57  | 
  58  | async function createStage(page: Page, scope: string) {
  59  |   const before = await page.evaluate(() => (globalThis as any).__R7_BACKEND__.stages.length);
  60  |   await page.locator('#content-studio-objective').fill(`Objective ${scope}`);
  61  |   await page.locator('#content-studio-scope').fill(scope);
  62  |   await page.locator('.studio-workflow [data-action="create-content-stage"]').click();
  63  |   await page.waitForTimeout(50);
  64  |   if (await page.evaluate(() => (globalThis as any).__R7_BACKEND__.stages.length) === before) {
  65  |     throw new Error(`Create did not reach fake backend: ${await page.locator('#global-message').textContent()} errors=${JSON.stringify(await page.evaluate(() => (globalThis as any).__R7_ERRORS__))}`);
  66  |   }
  67  |   await expect.poll(() => page.evaluate(() => (globalThis as any).__R7_BACKEND__.stages.length)).toBe(before + 1);
  68  |   await expect(page.locator('.data-list article')).toHaveCount(before + 1);
  69  | }
  70  | 
  71  | test('real Admin v2 modules preserve independent stages through retry, pause, cancel, preview and approval', async ({ page }) => {
  72  |   await openContent(page);
  73  |   await createStage(page, 'lesson-1');
  74  |   const first = page.locator('.data-list article').first();
  75  |   await first.locator('[data-run-content-stage]').click();
  76  |   await first.locator('[data-preview-content-stage]').click();
  77  |   await expect(page.locator('.code-preview').first()).toContainText('Preview lesson-1');
  78  |   await page.locator('#content-stage-review-reason').fill('Checked immutable preview and receipt');
  79  |   await page.locator('[data-review-content-stage="approved"]').click();
  80  | 
  81  |   await createStage(page, 'lesson-8');
  82  |   await createStage(page, 'lesson-9');
  83  |   await createStage(page, 'lesson-16');
  84  |   await createStage(page, 'lesson-17');
  85  |   await createStage(page, 'lesson-24');
  86  |   await createStage(page, 'lesson-25');
  87  |   await createStage(page, 'lesson-32');
  88  |   await expect(page.locator('.data-list article')).toHaveCount(8);
  89  | 
  90  |   await page.locator('[data-action="load-content-readiness"]').click();
  91  |   await expect(page.locator('[aria-labelledby="content-readiness-title"]')).toContainText('Попыток на принятый');
  92  |   await expect(page.locator('[aria-labelledby="content-readiness-title"]')).toContainText('1.25');
  93  |   await expect(page.locator('[aria-labelledby="content-readiness-title"]')).toContainText('Deployment не выполнялся');
  94  | 
  95  |   await page.locator('[data-action="load-arena-convergence"]').click();
  96  |   await expect(page.locator('[aria-labelledby="arena-convergence-title"]')).toContainText('Режим: legacy');
  97  |   await page.locator('[data-action="enable-arena-shadow"]').click();
  98  |   await expect(page.locator('[aria-labelledby="arena-convergence-title"]')).toContainText('Режим: shadow');
  99  |   await page.locator('[data-action="stop-arena-convergence"]').click();
  100 |   await expect(page.locator('[aria-labelledby="arena-convergence-title"]')).toContainText('Режим: legacy');
  101 | 
  102 |   const second = page.locator('.data-list article').nth(1);
  103 |   await page.evaluate(() => { (globalThis as any).__R7_BACKEND__.failNext = true; });
  104 |   await second.locator('[data-run-content-stage]').click();
  105 |   await expect(second).toContainText('provider_rate_limit');
  106 |   await second.locator('[data-run-content-stage]').click();
  107 |   await expect(second.locator('[data-preview-content-stage]')).toBeVisible();
  108 |   await expect(page.locator('.data-list article').first()).toContainText('approved');
  109 | 
  110 |   const queued = page.locator('.data-list article').nth(2);
  111 |   await queued.locator('[data-control-content-stage="pause"]').click();
  112 |   await expect(queued.locator('[data-control-content-stage="resume"]')).toBeVisible();
  113 |   await queued.locator('[data-control-content-stage="resume"]').click();
  114 |   await queued.locator('[data-control-content-stage="cancel"]').click();
  115 |   await expect(queued).toContainText('cancelled');
  116 | 
  117 |   const lateDiscarded = await page.evaluate(async () => {
  118 |     const backend: any = (globalThis as any).__R7_BACKEND__;
  119 |     const seam: any = (globalThis as any).__PHRASEMAN_ADMIN_E2E__;
  120 |     const stage = backend.stages[3];
  121 |     backend.delayNext = true;
  122 |     const late = seam.actions.runContentStage({ stageId: stage.stageId });
  123 |     await Promise.resolve();
  124 |     await seam.actions.controlContentStage({ stageId: stage.stageId, action: 'cancel' });
  125 |     backend.resolveLate();
  126 |     await late;
  127 |     return backend.lateDiscarded && stage.state === 'cancelled';
  128 |   });
  129 |   expect(lateDiscarded).toBe(true);
  130 | 
  131 |   const backend = await page.evaluate(() => (globalThis as any).__R7_BACKEND__);
  132 |   expect(backend.stages[0].state).toBe('approved');
  133 |   expect(backend.calls.filter((call: any[]) => call[0] === 'run' && call[1] === backend.stages[0].stageId)).toHaveLength(1);
  134 |   expect(backend.audit).toEqual(expect.arrayContaining([
  135 |     expect.objectContaining({ action: 'content_factory.stage.generate', stageId: backend.stages[0].stageId, outcome: 'needs_review' }),
  136 |     expect.objectContaining({ action: 'content_factory.stage.generate', stageId: backend.stages[1].stageId, outcome: 'failed' }),
  137 |     expect.objectContaining({ action: 'content_factory.stage.retry', stageId: backend.stages[1].stageId, outcome: 'needs_review' }),
  138 |   ]));
  139 |   expect(backend.audit.some((entry: any) => entry.stageId === backend.stages[3].stageId)).toBe(false);
  140 | });
  141 | 
  142 | test('R10B visible workflow covers dependencies, atomic range, edit diff, filters and cursor pagination', async ({ page }) => {
  143 |   await openContent(page);
  144 |   await expect(page.locator('.studio-workflow')).toContainText('Что создать');
  145 |   await createStage(page, 'lesson-1');
  146 |   const outline = page.locator('.data-list article').first();
  147 |   await outline.locator('[data-run-content-stage]').click();
  148 |   await outline.locator('[data-preview-content-stage]').click();
  149 |   await page.locator('#content-stage-review-reason').fill('Approved outline for dependent phrase generation');
  150 |   await page.locator('[data-review-content-stage="approved"]').click();
  151 | 
  152 |   await page.locator('[data-studio-kind="lesson_phrases"]').check();
```