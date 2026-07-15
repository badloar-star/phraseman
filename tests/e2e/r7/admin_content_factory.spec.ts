import { test, expect, type Page } from '@playwright/test';

async function installBackend(page: Page) {
  await page.addInitScript(() => {
    (globalThis as any).__R7_ERRORS__ = [];
    globalThis.addEventListener('error', (event) => (globalThis as any).__R7_ERRORS__.push(String(event.error?.stack || event.message)));
    globalThis.addEventListener('unhandledrejection', (event) => (globalThis as any).__R7_ERRORS__.push(String(event.reason?.stack || event.reason)));
    const backend: any = { stages: [], jobs: [], calls: [], audit: [], failNext: false, delayNext: false, lateDiscarded: false, activeRelease: 'release-old', revision: 1, drafts: { d1: 'approved' }, sealed: false, arenaConfig: { mode: 'legacy', revision: 0, canaryBps: 0, comparatorVersion: 'arena-parity-v1', minimumEvidenceWindow: { comparisons: 200, jobs: 20, days: 7 }, requiredLocalePairs: [], disabledReason: 'not_initialized' } };
    const find = (id: string) => backend.stages.find((item: any) => item.stageId === id);
    const cap = (kind: string, scopeType: string, count: any, prerequisites: string[] = [], cefr = ['A1','A2','B1','B2','C1','C2']) => ({ kind, scopeType, count, prerequisiteKinds: prerequisites, prerequisiteCardinality: { min: prerequisites.length, max: prerequisites.length }, dependencyScopePolicy: 'same_scope', editableFields: ['items'], publicationPolicy: 'standard', runtimeConsumer: true, cefr });
    const capabilities: any = {
      lesson_outline: cap('lesson_outline','lesson',{ min:1,max:1,fixed:1 }), lesson_phrases: cap('lesson_phrases','lesson',{ min:50,max:50,fixed:50 },['lesson_outline']), lesson_vocabulary: cap('lesson_vocabulary','lesson',{ min:1,max:1000 },['lesson_phrases']), lesson_irregular_verbs: cap('lesson_irregular_verbs','lesson',{ min:1,max:1000 },['lesson_phrases']), lesson_prepositions: cap('lesson_prepositions','lesson',{ min:1,max:1000 },['lesson_phrases']), lesson_theory: cap('lesson_theory','lesson',{ min:1,max:1000 },['lesson_phrases']),
      quiz_topic: cap('quiz_topic','topic',{ min:1,max:1,fixed:1 }), quiz_questions: cap('quiz_questions','topic',{ min:10,max:10,fixed:10 },['quiz_topic']), challenge_topic: cap('challenge_topic','topic',{ min:1,max:1,fixed:1 }), challenge_questions: cap('challenge_questions','topic',{ min:10,max:10,fixed:10 },['challenge_topic']), flashcard_pack_idea: cap('flashcard_pack_idea','pack',{ min:1,max:1,fixed:1 }), flashcard_items: cap('flashcard_items','pack',{ min:1,max:20 },['flashcard_pack_idea']), arena_topic: cap('arena_topic','arena',{ min:1,max:1,fixed:1 },[],['A1','A2','B1','B2']), arena_questions: cap('arena_questions','arena',{ min:10,max:10,fixed:10 },['arena_topic'],['A1','A2','B1','B2']),
    };
    const actions: any = new Proxy({
      getContentStageCapabilities: async () => ({ version: 'e2e', languagePolicy: { studyTargets: ['en','fr','de'], sourceLocales: ['ru','en'], sameLanguageAllowed: false }, capabilities }),
      listContentStages: async (input: any) => { backend.calls.push(['list', { ...input }]); const filtered = backend.stages.filter((item: any) => (!input.kind || item.kind === input.kind) && (!input.state || item.state === input.state) && (!input.scopeId || item.scopeId === input.scopeId)); const offset = Number(input.cursor || 0); const limit = Number(input.limit || 50); const stages = filtered.slice(offset, offset + limit).map((item: any) => ({ ...item })); const more = offset + limit < filtered.length; return { stages, nextCursor: more ? String(offset + limit) : null, isPartial: more }; },
      createContentStage: async (input: any) => { const stageId = `${input.requestId}:${input.kind}:${input.scopeId}:r${input.revision}`; if (!find(stageId)) backend.stages.push({ ...input, stageId, id: stageId, state: 'queued', resolvedCount: input.count }); backend.calls.push(['create', stageId]); return { stageId }; },
      runContentStage: async ({ stageId }: any) => { const stage = find(stageId); stage.attempts = Number(stage.attempts || 0) + 1; const action = stage.attempts === 1 ? 'content_factory.stage.generate' : 'content_factory.stage.retry'; backend.calls.push(['run', stageId]); if (backend.failNext) { backend.failNext = false; stage.state = 'failed'; stage.retryable = true; stage.errorCode = 'provider_rate_limit'; stage.errorMessage = 'Retry later'; backend.audit.push({ action, stageId, attempt: stage.attempts, outcome: 'failed' }); throw new Error('provider_rate_limit'); } if (backend.delayNext) { backend.delayNext = false; stage.state = 'running'; await new Promise<void>((resolve) => { backend.resolveLate = resolve; }); if (stage.state === 'cancelled') { backend.lateDiscarded = true; return { discarded: true }; } } stage.state = 'needs_review'; stage.retryable = false; backend.audit.push({ action, stageId, attempt: stage.attempts, outcome: 'needs_review' }); return { ok: true }; },
      controlContentStage: async ({ stageId, action }: any) => { const stage = find(stageId); backend.calls.push([action, stageId]); if (action === 'pause') stage.state = 'paused'; if (action === 'resume') stage.state = 'queued'; if (action === 'cancel') stage.state = 'cancelled'; return { state: stage.state }; },
      previewContentStage: async ({ stageId }: any) => { const stage = find(stageId); backend.calls.push(['preview', stageId]); return { stage: { ...stage, artifactId: `artifact:${stageId}` }, payload: { stage: stage.kind, result: { title: `Preview ${stage.scopeId}` } }, qaReceipt: { status: 'passed', contentHash: 'a'.repeat(64) }, reviewFingerprint: 'f'.repeat(64) }; },
      reviewContentStage: async ({ stageId, status }: any) => { find(stageId).state = status; backend.calls.push([status, stageId]); return { ok: true }; },
      listContentStageDependencies: async ({ consumerKind }: any) => ({ items: backend.stages.filter((item: any) => item.state === 'approved').map((item: any) => ({ stageId: item.stageId, kind: item.kind, scopeId: item.scopeId, title: `Approved ${item.scopeId}`, revision: item.revision, artifactId: `artifact:${item.stageId}`, contentHash: 'a'.repeat(64) })).filter((item: any) => consumerKind === 'lesson_phrases' ? item.kind === 'lesson_outline' : true) }),
      createContentStageBulkPlan: async (input: any) => { const stageIds: string[] = []; for (let lesson = input.lessonRange.start; lesson <= input.lessonRange.end; lesson += 1) for (const kind of input.kinds) { const stageId = `${input.requestId}:${kind}:lesson-${lesson}:r1`; if (!find(stageId)) backend.stages.push({ ...input, kind, scopeId: `lesson-${lesson}`, revision: 1, count: capabilities[kind].count.fixed || capabilities[kind].count.min, stageId, id: stageId, state: 'queued' }); stageIds.push(stageId); } backend.calls.push(['bulk', stageIds]); return { planId: `bulk:${input.idempotencyKey}`, stageIds, progress: { planned: stageIds.length, queued: stageIds.length, completed: 0, failed: 0 }, conflicts: [], replayed: false }; },
      editContentStageArtifact: async ({ baseStageId, artifact }: any) => { const base = find(baseStageId); const revision = Number(base.revision) + 1; const stageId = `${base.requestId}:${base.kind}:${base.scopeId}:r${revision}`; backend.stages.push({ ...base, stageId, id: stageId, revision, state: 'needs_review', baseStageId }); const diff = { summary: { added: 0, removed: 0, changed: 1, moved: 0 }, details: [{ type: 'changed', path: 'result.title' }], isPartial: false }; backend.calls.push(['edit', stageId, artifact]); return { stageId, revision, diff, replayed: false }; },
      getFactoryRolloutMetrics: async () => ({ metrics: { window: { fromMs: 1, toMs: 2 }, attemptCount: 5, acceptedArtifactCount: 4, attemptsPerAcceptedArtifact: 1.25, failuresByCategory: { provider_rate_limit: 1 }, populations: { staged: { attemptCount: 3 }, legacy: { attemptCount: 2 } }, qa: { passed: 4, failed: 1 }, operatorCorrectionRate: 0.25, latencyMs: { p50: 120, p95: 450 }, budgetProxy: { reservedUnits: 4, capUnits: 10 } } }),
      getArenaConvergenceStatus: async (input: any) => { backend.calls.push(['arena-status', input.limit]); return { arena: { ...backend.arenaConfig }, metrics: { sampleCount: 3, successfulQaArtifactCount: 3, completeCount: 3, criticalMismatchCount: 0, fallbackCount: 0, goBlockers: ['minimum_comparisons_not_met'] }, groups: [], isPartial: false, nextCursor: null }; },
      updateArenaConvergenceConfig: async ({ mode, expectedRevision, requiredLocalePairs }: any) => { if (expectedRevision !== backend.arenaConfig.revision) throw new Error('revision conflict'); backend.arenaConfig = { ...backend.arenaConfig, mode, revision: expectedRevision + 1, requiredLocalePairs: requiredLocalePairs || backend.arenaConfig.requiredLocalePairs, disabledReason: mode === 'legacy' ? 'operator_kill_switch' : null }; backend.calls.push(['arena-mode', mode, backend.arenaConfig.requiredLocalePairs]); return { arena: backend.arenaConfig }; },
      getFactoryWorkspace: async () => ({ sourceRegistries: [{ id: 'english-core-32:v1', lessons: Object.fromEntries(Array.from({ length: 100 }, (_, index) => [String(index + 1), {}])) }], releases: [{ releaseId: 'release-old' }, ...(backend.sealed ? [{ releaseId: 'release-new' }] : [])] }),
      createFactoryJob: async (input: any) => { backend.createdLessonIds = [...input.lessonIds]; const job = { id: input.idempotencyKey, projectId: input.projectId, studyTarget: input.studyTarget, learnerSourceLocale: input.sourceLocale, sourceLocale: input.sourceLocale, releaseCandidate: true, state: 'needs_review', progress: { total: 4, completed: 4, failed: 0 } }; const units = ['lesson', 'quiz', 'flashcard', 'arena'].map((surface) => ({ id: `${job.id}-${surface}`, unitId: `${job.id}-${surface}`, jobId: job.id, lessonId: input.lessonIds[0], surface, state: 'succeeded' })); backend.jobs = [{ job, units, review: null, release: null }]; backend.calls.push(['create-range', input.lessonIds]); return { jobId: job.id }; },
      listFactoryJobs: async () => ({ jobs: backend.jobs.map((entry: any) => entry.job) }),
      getFactoryJobDetail: async ({ jobId }: any) => { const entry = backend.jobs.find((item: any) => item.job.id === jobId); return { ok: true, jobId, job: { ...entry.job }, units: entry.units.map((unit: any) => ({ ...unit })), review: entry.review ? { ...entry.review } : null, release: entry.release ? { ...entry.release } : null, catalog: { revision: backend.revision, activeRelease: { releaseId: backend.activeRelease } } }; },
      previewFactoryUnit: async ({ unitId }: any) => ({ unit: { id: unitId }, payload: { lessonId: 1, phrases: ['Safe preview'] }, qaReceipt: { status: 'passed', contentHash: 'b'.repeat(64) } }),
      reviewFactoryJob: async ({ jobId, status, reason }: any) => { backend.jobs.find((item: any) => item.job.id === jobId).review = { status, reason }; backend.calls.push(['review-job', status]); return { ok: true }; },
      sealFactoryRelease: async ({ jobId }: any) => { backend.sealed = true; backend.jobs.find((item: any) => item.job.id === jobId).release = { releaseId: 'release-new' }; backend.calls.push(['seal']); return { releaseId: 'release-new' }; },
      activateFactoryRelease: async () => { backend.activeRelease = 'release-new'; backend.revision += 1; backend.calls.push(['activate']); return { revision: backend.revision }; },
      rollbackFactoryRelease: async () => { backend.activeRelease = 'release-old'; backend.revision += 1; backend.calls.push(['rollback']); return { revision: backend.revision }; },
      getDailyBriefing: async () => null,
    }, { get(target, key) { if (key === 'then') return undefined; return key in target ? target[key] : async () => ({}); } });
    (globalThis as any).__R7_BACKEND__ = backend;
    (globalThis as any).__PHRASEMAN_ADMIN_E2E__ = { auth: { authorized: true, email: 'e2e@localhost', role: 'admin' }, actions };
  });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' && url.port === '4173') return route.continue();
    throw new Error(`Unexpected network request: ${url.href}`);
  });
}

async function openContent(page: Page) {
  await installBackend(page);
  await page.goto('/v2/#content');
  await expect.poll(() => page.evaluate(() => Boolean((globalThis as any).__PHRASEMAN_ADMIN_E2E__?.ready))).toBe(true);
  await expect(page.locator('.content-generator-shell')).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
}

async function createStage(page: Page, scope: string) {
  const before = await page.evaluate(() => (globalThis as any).__R7_BACKEND__.stages.length);
  await page.locator('#content-studio-objective').fill(`Objective ${scope}`);
  await page.locator('#content-studio-scope').fill(scope);
  await page.locator('.studio-workflow [data-action="create-content-stage"]').click();
  await page.waitForTimeout(50);
  if (await page.evaluate(() => (globalThis as any).__R7_BACKEND__.stages.length) === before) {
    throw new Error(`Create did not reach fake backend: ${await page.locator('#global-message').textContent()} errors=${JSON.stringify(await page.evaluate(() => (globalThis as any).__R7_ERRORS__))}`);
  }
  await expect.poll(() => page.evaluate(() => (globalThis as any).__R7_BACKEND__.stages.length)).toBe(before + 1);
  await expect(page.locator('.data-list article')).toHaveCount(before + 1);
}

test('real Admin v2 modules preserve independent stages through retry, pause, cancel, preview and approval', async ({ page }) => {
  await openContent(page);
  await createStage(page, 'lesson-1');
  const first = page.locator('.data-list article').first();
  await first.locator('[data-run-content-stage]').click();
  await first.locator('[data-preview-content-stage]').click();
  await expect(page.locator('.code-preview').first()).toContainText('Preview lesson-1');
  await page.locator('#content-stage-review-reason').fill('Checked immutable preview and receipt');
  await page.locator('[data-review-content-stage="approved"]').click();

  await createStage(page, 'lesson-8');
  await createStage(page, 'lesson-9');
  await createStage(page, 'lesson-16');
  await createStage(page, 'lesson-17');
  await createStage(page, 'lesson-24');
  await createStage(page, 'lesson-25');
  await createStage(page, 'lesson-32');
  await expect(page.locator('.data-list article')).toHaveCount(8);

  await page.locator('[data-action="load-content-readiness"]').click();
  await expect(page.locator('[aria-labelledby="content-readiness-title"]')).toContainText('Попыток на принятый');
  await expect(page.locator('[aria-labelledby="content-readiness-title"]')).toContainText('1.25');
  await expect(page.locator('[aria-labelledby="content-readiness-title"]')).toContainText('Deployment не выполнялся');

  await page.locator('[data-action="load-arena-convergence"]').click();
  await expect(page.locator('[aria-labelledby="arena-convergence-title"]')).toContainText('Режим: legacy');
  await page.locator('[data-action="enable-arena-shadow"]').click();
  await expect(page.locator('[aria-labelledby="arena-convergence-title"]')).toContainText('Режим: shadow');
  await page.locator('[data-action="stop-arena-convergence"]').click();
  await expect(page.locator('[aria-labelledby="arena-convergence-title"]')).toContainText('Режим: legacy');
  await expect.poll(() => page.evaluate(() => (globalThis as any).__R7_BACKEND__.calls.some((call: any[]) => call[0] === 'arena-status' && call[1] === 500))).toBe(true);
  await expect.poll(() => page.evaluate(() => (globalThis as any).__R7_BACKEND__.calls.some((call: any[]) => call[0] === 'arena-mode' && call[1] === 'shadow' && Array.isArray(call[2]) && call[2].some((pair: string) => /^[a-z]{2,12}(?:-[A-Z]{2})?:[a-z]{2,12}(?:-[A-Z]{2})?$/.test(pair))))).toBe(true);

  const second = page.locator('.data-list article').nth(1);
  await page.evaluate(() => { (globalThis as any).__R7_BACKEND__.failNext = true; });
  await second.locator('[data-run-content-stage]').click();
  await expect(second).toContainText('provider_rate_limit');
  await expect(second.locator('[data-run-content-stage]')).toContainText('Повторить генерацию');
  await second.locator('[data-run-content-stage]').click();
  await expect(second.locator('[data-preview-content-stage]')).toBeVisible();
  await expect(page.locator('.data-list article').first()).toContainText('approved');

  const queued = page.locator('.data-list article').nth(2);
  await queued.locator('[data-control-content-stage="pause"]').click();
  await expect(queued.locator('[data-control-content-stage="resume"]')).toBeVisible();
  await expect(queued.locator('[data-control-content-stage="resume"]')).toContainText('Продолжить без генерации');
  const runsBeforeResume = await page.evaluate(() => (globalThis as any).__R7_BACKEND__.calls.filter((call: any[]) => call[0] === 'run').length);
  await queued.locator('[data-control-content-stage="resume"]').click();
  expect(await page.evaluate(() => (globalThis as any).__R7_BACKEND__.calls.filter((call: any[]) => call[0] === 'run').length)).toBe(runsBeforeResume);
  await queued.locator('[data-control-content-stage="cancel"]').click();
  await expect(queued).toContainText('cancelled');

  const lateDiscarded = await page.evaluate(async () => {
    const backend: any = (globalThis as any).__R7_BACKEND__;
    const seam: any = (globalThis as any).__PHRASEMAN_ADMIN_E2E__;
    const stage = backend.stages[3];
    backend.delayNext = true;
    const late = seam.actions.runContentStage({ stageId: stage.stageId });
    await Promise.resolve();
    await seam.actions.controlContentStage({ stageId: stage.stageId, action: 'cancel' });
    backend.resolveLate();
    await late;
    return backend.lateDiscarded && stage.state === 'cancelled';
  });
  expect(lateDiscarded).toBe(true);

  const backend = await page.evaluate(() => (globalThis as any).__R7_BACKEND__);
  expect(backend.stages[0].state).toBe('approved');
  expect(backend.calls.filter((call: any[]) => call[0] === 'run' && call[1] === backend.stages[0].stageId)).toHaveLength(1);
  expect(backend.audit).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: 'content_factory.stage.generate', stageId: backend.stages[0].stageId, outcome: 'needs_review' }),
    expect.objectContaining({ action: 'content_factory.stage.generate', stageId: backend.stages[1].stageId, outcome: 'failed' }),
    expect.objectContaining({ action: 'content_factory.stage.retry', stageId: backend.stages[1].stageId, outcome: 'needs_review' }),
  ]));
  expect(backend.audit.some((entry: any) => entry.stageId === backend.stages[3].stageId)).toBe(false);
});

test('R10B visible workflow covers dependencies, atomic range, edit diff, filters and cursor pagination', async ({ page }) => {
  await openContent(page);
  await expect(page.locator('.studio-workflow')).toContainText('Что создать');
  await createStage(page, 'lesson-1');
  const outline = page.locator('.data-list article').first();
  await outline.locator('[data-run-content-stage]').click();
  await outline.locator('[data-preview-content-stage]').click();
  await page.locator('#content-stage-review-reason').fill('Approved outline for dependent phrase generation');
  await page.locator('[data-review-content-stage="approved"]').click();

  await page.locator('[data-studio-kind="lesson_phrases"]').check();
  await page.locator('[data-action="load-content-dependencies"]').click();
  await expect(page.locator('.dependency-picker')).toContainText('Approved lesson-1');
  await page.locator('#content-dependency-search').fill('lesson-1');
  await page.locator('[data-content-dependency-id]').check();
  await page.locator('#content-studio-objective').fill('Generate exactly fifty grounded phrases');
  await page.locator('#content-studio-scope').fill('lesson-1');
  await page.locator('.studio-workflow [data-action="create-content-stage"]').click();
  await expect.poll(() => page.evaluate(() => (globalThis as any).__R7_BACKEND__.stages.some((item: any) => item.kind === 'lesson_phrases'))).toBe(true);

  await page.locator('[data-content-create-mode="range"]').click();
  await page.locator('#content-range-start').fill('2'); await page.locator('#content-range-end').fill('4');
  await page.locator('#content-studio-objective').fill('Create bounded lesson outlines');
  await page.locator('[data-action="create-content-bulk"]').click();
  await expect(page.locator('.studio-workflow')).toContainText('План создан');
  expect(await page.evaluate(() => (globalThis as any).__R7_BACKEND__.calls.filter((call: any[]) => call[0] === 'bulk').length)).toBe(1);
  const bulkRetry = await page.evaluate(() => {
    const backend: any = (globalThis as any).__R7_BACKEND__;
    const stageId = backend.calls.filter((call: any[]) => call[0] === 'bulk').at(-1)[1][0];
    const stage = backend.stages.find((item: any) => item.stageId === stageId);
    stage.state = 'failed'; stage.retryable = true; stage.errorCode = 'provider_rate_limit';
    return { stageId, runsBefore: backend.calls.filter((call: any[]) => call[0] === 'run').length };
  });
  await page.locator('[data-action="load-content-stages"]:visible').click();
  const bulkRetryButton = page.locator(`.bulk-stage-progress [data-run-content-stage="${bulkRetry.stageId}"]`);
  await expect(bulkRetryButton).toBeVisible();
  await bulkRetryButton.click();
  expect(await page.evaluate(() => (globalThis as any).__R7_BACKEND__.calls.filter((call: any[]) => call[0] === 'run').length)).toBe(bulkRetry.runsBefore + 1);
  await expect.poll(() => page.evaluate((stageId) => (globalThis as any).__R7_BACKEND__.stages.find((item: any) => item.stageId === stageId)?.state, bulkRetry.stageId)).toBe('needs_review');

  await page.locator('[data-content-create-mode="single"]').click();
  await page.locator('.data-list article').first().locator('[data-preview-content-stage]').click();
  await expect(page.locator('.technical-disclosure')).toContainText('Технические данные JSON');
  const editor = page.locator('#content-artifact-edit-json');
  const edited = JSON.parse(await editor.inputValue()); edited.result.title = 'Edited preview title';
  await editor.fill(JSON.stringify(edited, null, 2)); await page.locator('#content-artifact-edit-reason').fill('Correct the generated title');
  await page.locator('[data-action="create-content-edit"]').click();
  await expect(page.locator('.semantic-diff')).toContainText('result.title');

  await page.evaluate(() => { const backend: any = (globalThis as any).__R7_BACKEND__; for (let index = backend.stages.length; index < 58; index += 1) backend.stages.push({ requestId: backend.stages[0].requestId, kind: 'lesson_outline', scopeId: `lesson-${index + 1}`, revision: 1, count: 1, stageId: `${backend.stages[0].requestId}:lesson_outline:lesson-${index + 1}:r1`, id: `${backend.stages[0].requestId}:lesson_outline:lesson-${index + 1}:r1`, state: 'queued' }); });
  await page.locator('[data-action="load-content-stages"]:visible').click();
  await expect(page.locator('[data-action="load-more-content-stages"]')).toBeVisible();
  await page.locator('[data-action="load-more-content-stages"]').click();
  await expect(page.locator('.data-list article')).toHaveCount(58);
  await page.locator('summary').filter({ hasText: 'Фильтры очереди' }).click();
  await page.locator('#content-filter-state').selectOption('approved');
  await page.locator('[data-action="apply-content-filters"]').click();
  await expect.poll(() => page.evaluate(() => (globalThis as any).__R7_BACKEND__.calls.filter((call: any[]) => call[0] === 'list').at(-1)?.[1]?.state)).toBe('approved');
  await expect(page.locator('.data-list article')).toHaveCount(1);
});

test('seal stays inactive until activation, rollback restores release and drafts', async ({ page }) => {
  await openContent(page);
  const draftsBefore = await page.evaluate(() => JSON.stringify((globalThis as any).__R7_BACKEND__.drafts));
  const factoryPanel = page.locator('details').filter({ has: page.locator('.factory-steps') });
  await factoryPanel.locator('summary').click();
  await page.locator('#factory-start').fill('1');
  await page.locator('#factory-count').fill('32');
  await page.locator('[data-action="create-factory-job"]').click();
  await expect.poll(() => page.evaluate(() => (globalThis as any).__R7_BACKEND__.createdLessonIds?.length)).toBe(32);
  expect(await page.evaluate(() => (globalThis as any).__R7_BACKEND__.createdLessonIds.filter((id: number) => [1, 8, 9, 16, 17, 24, 25, 32].includes(id)))).toEqual([1, 8, 9, 16, 17, 24, 25, 32]);

  await factoryPanel.locator('summary').click();
  await page.locator('[data-preview-unit]').first().click();
  await factoryPanel.locator('summary').click();
  await expect(page.locator('.code-preview').filter({ hasText: 'Safe preview' })).toBeVisible();
  await page.locator('#factory-review-reason').fill('Checked preview, sources and immutable hash');
  await page.locator('[data-action="approve-factory-job"]').click();
  await factoryPanel.locator('summary').click();
  await expect(page.locator('[data-action="seal-factory-release"]')).toBeVisible();
  await page.locator('[data-action="seal-factory-release"]').click();
  await factoryPanel.locator('summary').click();
  await expect(page.locator('.metrics article').nth(3)).toContainText('Нет');
  expect(await page.evaluate(() => (globalThis as any).__R7_BACKEND__.activeRelease)).toBe('release-old');

  await page.locator('#factory-activation-reason').fill('Approved internal canary');
  await page.locator('[data-action="activate-factory-release"]').click();
  await factoryPanel.locator('summary').click();
  await expect(page.locator('.metrics article').nth(3)).toContainText('Да');
  await page.locator('#factory-rollback-target').selectOption('release-old');
  await page.locator('#factory-rollback-reason').fill('Restore prior release after canary');
  await page.locator('[data-action="rollback-factory-release"]').click();
  await expect.poll(() => page.evaluate(() => (globalThis as any).__R7_BACKEND__.activeRelease)).toBe('release-old');
  expect(await page.evaluate(() => JSON.stringify((globalThis as any).__R7_BACKEND__.drafts))).toBe(draftsBefore);
});

for (const width of [375, 768, 1024, 1440]) {
  test(`accessible keyboard/focus and layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openContent(page);
    const buttons = page.locator('.content-generator-shell button:visible');
    expect(await buttons.count()).toBeGreaterThan(2);
    await buttons.first().focus();
    const focus = await buttons.first().evaluate((element) => { const style = getComputedStyle(element); return { outline: style.outlineStyle, width: style.outlineWidth, name: element.getAttribute('title') || element.textContent?.trim() }; });
    expect(focus.name).toBeTruthy();
    expect(focus.outline === 'none' && focus.width === '0px').toBe(false);
    const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, overlaps: [...document.querySelectorAll('.content-generator-shell button')].some((a, index, all) => all.slice(index + 1).some((b) => { const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); return x.width > 0 && y.width > 0 && x.left < y.right && x.right > y.left && x.top < y.bottom && x.bottom > y.top; })) }));
    expect(layout).toEqual({ overflow: false, overlaps: false });
    await expect(page.locator('#auth-status')).toHaveAttribute('role', 'status');
    await page.screenshot({ path: `qa-artifacts/r7-admin-e2e/admin-${width}.png`, fullPage: true });
  });
}
