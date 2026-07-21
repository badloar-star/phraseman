import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRouteRefreshCoordinator } from '../admin/v2/scripts/admin-route-refresh.js';

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

{
  let now = 100;
  const coordinator = createRouteRefreshCoordinator({ now: () => now });
  coordinator.setContext('owner-a');
  const pending = deferred();
  let calls = 0;
  const request = { key: 'overview', ttlMs: 50, load: () => { calls += 1; return pending.promise; } };
  const first = coordinator.refresh(request);
  const second = coordinator.refresh(request);
  assert.equal(first, second, 'the same route/context refresh must share its in-flight promise');
  assert.equal(calls, 1);
  pending.resolve({ count: 1 });
  assert.deepEqual(await first, { status: 'loaded', value: { count: 1 } });
  now = 120;
  assert.deepEqual(await coordinator.refresh(request), { status: 'cached', value: { count: 1 } });
  assert.equal(calls, 1, 'a fresh cache entry must prevent another loader call');
}

{
  const coordinator = createRouteRefreshCoordinator();
  coordinator.setContext('owner-a');
  const pending = deferred();
  const refresh = coordinator.refresh({ key: 'support', ttlMs: 1000, load: () => pending.promise });
  coordinator.setContext('owner-b');
  pending.resolve({ stale: true });
  assert.deepEqual(await refresh, { status: 'discarded' }, 'a late result must not survive a context generation change');
  assert.equal(coordinator.peek('support'), undefined);
}

{
  const scheduled = [];
  let visible = false;
  const coordinator = createRouteRefreshCoordinator({
    isVisible: () => visible,
    schedule: (task) => scheduled.push(task),
  });
  coordinator.setContext('owner-a');
  let calls = 0;
  const first = coordinator.queuePrefetch({ key: 'analytics', ttlMs: 1000, load: () => { calls += 1; return { ok: true }; } });
  const second = coordinator.queuePrefetch({ key: 'support', ttlMs: 1000, load: () => { calls += 1; return { ok: true }; } });
  assert.equal(first, second, 'only one low-priority prefetch may be queued at a time');
  assert.equal(scheduled.length, 1);
  scheduled.shift()();
  assert.deepEqual(await first, { status: 'skipped-hidden' });
  assert.equal(calls, 0, 'a hidden page must not run its queued prefetch');

  visible = true;
  const visiblePrefetch = coordinator.queuePrefetch({ key: 'analytics', ttlMs: 1000, load: () => { calls += 1; return { ok: true }; } });
  scheduled.shift()();
  assert.deepEqual(await visiblePrefetch, { status: 'loaded', value: { ok: true } });
  assert.equal(calls, 1);
}

{
  const scheduled = [];
  const coordinator = createRouteRefreshCoordinator({
    isVisible: () => false,
    schedule: (task) => scheduled.push(task),
  });
  coordinator.setContext('owner-a');
  let calls = 0;
  const automaticEntry = coordinator.refresh({
    key: 'agent-office',
    ttlMs: 1000,
    skipIfHidden: true,
    load: () => { calls += 1; return { generation: 1 }; },
  });
  assert.deepEqual(await automaticEntry, { status: 'skipped-hidden' });
  assert.equal(calls, 0, 'a hidden automatic Agent Office entry must not start its loader');
}

{
  const scheduled = [];
  const coordinator = createRouteRefreshCoordinator({ schedule: (task) => scheduled.push(task) });
  coordinator.setContext('owner-a');
  const pending = deferred();
  let calls = 0;
  let rendered = '';
  const request = {
    key: 'agent-office',
    ttlMs: 1000,
    load: () => {
      calls += 1;
      return pending.promise.then((value) => {
        rendered = value;
        return value;
      });
    },
  };
  const automaticEntry = coordinator.queuePrefetch(request);
  const manualEntry = coordinator.refresh({ ...request, force: true });
  scheduled.shift()();
  assert.equal(calls, 1, 'automatic and manual Agent Office refreshes must share one read generation');
  pending.resolve('fresh');
  assert.deepEqual(await manualEntry, { status: 'loaded', value: 'fresh' });
  assert.deepEqual(await automaticEntry, { status: 'loaded', value: 'fresh' });
  assert.equal(rendered, 'fresh', 'the shared generation must be the only result allowed to render');
}

{
  const coordinator = createRouteRefreshCoordinator();
  coordinator.setContext('owner-a');
  let calls = 0;
  const request = { key: 'agent-office', ttlMs: 1000, load: () => ({ generation: ++calls }) };
  assert.deepEqual(await coordinator.refresh(request), { status: 'loaded', value: { generation: 1 } });
  assert.deepEqual(await coordinator.refresh({ ...request, force: true }), { status: 'loaded', value: { generation: 2 } },
    'an explicit Agent Office refresh must bypass a completed TTL cache');
}

{
  const core = await readFile(new URL('../admin/v2/scripts/admin-core.js', import.meta.url), 'utf8');
  assert.match(core, /createRouteRefreshCoordinator\(\{\s*isVisible:\s*\(\)\s*=>\s*document\.visibilityState\s*===\s*'visible'/,
    'the actual route coordinator must read document visibility');
  assert.match(core, /routeRefreshCoordinator\.refresh\(\{\s*\.\.\.request,\s*ttlMs: ROUTE_REFRESH_TTL_MS,\s*skipIfHidden: true\s*\}\)/,
    'automatic route refresh must use the visibility-aware coordinator path');
  assert.match(core, /document\.addEventListener\('visibilitychange', \(\) => \{\s*if \(document\.visibilityState !== 'visible'\) return;\s*refreshCurrentRouteReadModels\(\);\s*\}\);/,
    'returning to a visible document must retry the current route read model skipped while hidden');
  assert.match(core, /globalThis\.addEventListener\?\.\('pageshow', \(\) => \{\s*if \(document\.visibilityState !== 'visible'\) return;\s*refreshCurrentRouteReadModels\(\);\s*\}\);/,
    'a restored page must retry the current route read model; coordinator dedupe keeps visibility and pageshow to one load');
  assert.match(core, /action === 'load-agent-office'\) return runBusy\(\(\) => refreshAgentOffice\(\{ force: true \}\)/,
    'the Agent Office error retry must use the shared coordinator');
  assert.match(core, /plans: state\.adminRole === 'owner'\s*\? \[\{ key: 'plans', permission: '', load: loadPlans \}\]\s*:\s*\[\],/,
    'owner-only Plans must use the shared route coordinator read model');
  assert.doesNotMatch(core, /state\.route === 'plans'[\s\S]*?void loadPlans\(\)\.then\(renderCurrentPage\)/,
    'Plans must not keep a second direct route-entry read beside the coordinator');

  const refreshStart = core.indexOf('function refreshCurrentRouteReadModels()');
  const refreshBody = core.slice(refreshStart, core.indexOf('function agentOfficeRefreshKey', refreshStart));
  for (const route of ['overview', 'analytics', 'report-center', 'diagnostics', 'daily-briefing']) {
    const routeStart = refreshBody.indexOf(`${route === 'report-center' || route === 'daily-briefing' ? `'${route}'` : route}:`);
    const routeEnd = refreshBody.indexOf('\n    ],', routeStart);
    const routeBody = refreshBody.slice(routeStart, routeEnd === -1 ? refreshBody.length : routeEnd);
    assert.match(routeBody, /key: 'plans', permission: '', ownerOnly: true, load: loadPlans/,
      `${route} must hydrate the owner-only plan cache through the shared read coordinator`);
  }
  assert.doesNotMatch(refreshBody, /createPlan\(/,
    'automatic plan-cache hydration must never create a plan');
}

{
  const core = await readFile(new URL('../admin/v2/scripts/admin-core.js', import.meta.url), 'utf8');
  for (const name of ['loadDailyBriefing', 'loadReportQueue', 'loadAssetJobs']) {
    const start = core.indexOf(`async function ${name}`);
    const next = core.indexOf('\nasync function ', start + 1);
    const body = core.slice(start, next === -1 ? core.length : next);
    assert.match(body, /catch \(error\) \{[\s\S]*?state: 'error'[\s\S]*?renderCurrentPage\(\);[\s\S]*?throw error;/,
      `${name} must render its accepted error state before the automatic route coordinator swallows the rejection`);
  }
}

{
  const core = await readFile(new URL('../admin/v2/scripts/admin-core.js', import.meta.url), 'utf8');
  const routeBodies = Object.fromEntries(['renderOverview', 'renderAgentOfficeCenter', 'renderAgentManagerWorkspace', 'renderAssetStudio', 'renderReportQueue']
    .map((name) => {
      const start = core.indexOf(`function ${name}()`);
      const next = core.indexOf('\nfunction ', start + 1);
      return [name, core.slice(start, next === -1 ? core.length : next)];
    }));

  assert.doesNotMatch(routeBodies.renderOverview, /data-action="load-daily-briefing"/,
    'Overview refreshes its snapshot on route entry instead of exposing a duplicate manual refresh');
  assert.doesNotMatch(routeBodies.renderAgentOfficeCenter, /data-action="load-agent-office"[\s\S]*?(?:Загрузить|Обновить) решения/,
    'Agent Office refreshes automatically in its normal header');
  assert.doesNotMatch(routeBodies.renderAgentManagerWorkspace, /data-action="load-agent-manager"[\s\S]*?>Обновить</,
    'Agent Manager refreshes automatically in its normal header');
  assert.doesNotMatch(routeBodies.renderAssetStudio, /data-action="load-asset-jobs"[\s\S]*?>Обновить очередь</,
    'Asset Studio refreshes its queue on route entry');
  assert.doesNotMatch(routeBodies.renderReportQueue, /data-action="load-report-queue"[\s\S]*?>Обновить сейчас</,
    'Report Center refreshes its queue on route entry');

  assert.match(routeBodies.renderReportQueue, /reports\.error \? `[\s\S]*?data-action="load-report-queue"[\s\S]*?disabledWhenUnauthorized\('reports\.read'\)[\s\S]*?title="Повторно прочитать очередь репортов после ошибки"[\s\S]*?>Повторить чтение</,
    'Report Center exposes one permission-guarded retry only after its automatic route read fails');
  assert.equal((routeBodies.renderReportQueue.match(/data-action="load-report-queue"/g) || []).length, 1,
    'Report Center must not restore a normal-state manual refresh control');
  assert.match(routeBodies.renderAssetStudio, /state\.assetStudio\.error \? `[\s\S]*?data-action="load-asset-jobs"[\s\S]*?disabledWhenUnauthorized\('content\.read'\)[\s\S]*?title="Повторно прочитать очередь заданий после ошибки"[\s\S]*?>Повторить чтение</,
    'Asset Studio exposes one permission-guarded retry only after its automatic route read fails');
  assert.equal((routeBodies.renderAssetStudio.match(/data-action="load-asset-jobs"/g) || []).length, 1,
    'Asset Studio must not restore a normal-state manual refresh control');

  for (const action of ['load-agent-office', 'load-agent-manager']) {
    assert.match(core, new RegExp(`data-action="${action}"[\\s\\S]*?>Повторить</`),
      `${action} remains available when the server read fails`);
  }
  assert.match(routeBodies.renderReportQueue, /data-action="load-report-next"/,
    'Report pagination remains an explicit user action');
  assert.match(core, /data-action="create-asset-job"|data-action="create-asset-generation"|data-action="load-asset-jobs"/,
    'Asset Studio keeps its non-refresh work controls');
}

console.log('admin-v2-route-refresh: PASS');
