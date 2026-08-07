import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import postcss, { type AtRule } from 'postcss';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

type CapabilitySnapshot = {
  registry: { id: string; route: string; nativeRoute: string; label: string }[];
  retiredCapabilityIds: string[];
  resolutions: { hash: string; resolved: boolean; route: string; capabilityId: string }[];
};

function inspectCapabilityModule(hashes: string[]): CapabilitySnapshot {
  const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-capabilities.js')).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then((m) => process.stdout.write(JSON.stringify({ registry: m.ADMIN_CAPABILITY_REGISTRY, retiredCapabilityIds: m.RETIRED_CAPABILITY_IDS, resolutions: ${JSON.stringify(hashes)}.map((hash) => ({ hash, ...m.resolveCapabilityHash(hash) })) })))`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout);
}

describe('Admin v2 native-only boundary', () => {
  const canonicalRoutes = new Set([
    'overview', 'application', 'users', 'money', 'content', 'community', 'diagnostics',
    'support', 'analytics', 'daily-briefing', 'report-center', 'asset-studio', 'campaigns',
    'control-panel', 'admin-settings', 'agent-office', 'agent-manager', 'plans', 'coin-center', 'english-test',
  ]);
  const analyticsBookmarks = new Set(['#today', '#growth', '#subscriptions', '#learning']);
  const retiredCapabilityIds = [
    'daily-phrases', 'compass', 'mod-queue', 'audit', 'audit-log',
    'ops-log', 'archive', 'changelog-0608', 'arena-ranks', 'arena-live', 'arena-bets',
    'arena-rooms', 'arena-question-pool', 'arena-generator', 'arena-shadow', 'french-quizzes',
  ] as const;
  const userFacingSourcePaths = [
    'admin/v2/index.html',
    'admin/v2/migration.html',
    ...fs.readdirSync(path.join(root, 'admin/v2/scripts'), { recursive: true })
      .map(String)
      .filter((relativePath) => relativePath.endsWith('.js'))
      .map((relativePath) => `admin/v2/scripts/${relativePath.replaceAll('\\', '/')}`),
  ];

  function expectCanonicalEmittedHashes(hashes: string[]) {
    const uniqueHashes = [...new Set(hashes)];
    const { resolutions } = inspectCapabilityModule(uniqueHashes);
    for (const resolution of resolutions) {
      const decodedHash = decodeURIComponent(resolution.hash).replace(/^#/, '');
      const emittedSegments = decodedHash.split(':');
      for (const retiredId of retiredCapabilityIds) expect(emittedSegments).not.toContain(retiredId);
      expect(emittedSegments).toHaveLength(1);
      expect(canonicalRoutes).toContain(resolution.route);
      expect(resolution.capabilityId).toBe('');
      if (analyticsBookmarks.has(resolution.hash)) {
        expect(resolution).toMatchObject({ resolved: true, route: 'analytics' });
      }
    }
  }

  test('contains no user-facing old-admin escape link or retired label', () => {
    const userFacingSources = userFacingSourcePaths.map((sourcePath) => read(sourcePath)).join('\n');

    expect(userFacingSources).not.toMatch(/href\s*=\s*["'][^"']*admin\/index\.html/);
    expect(userFacingSources).not.toContain('href="./migration.html"');

    // Owner decision (2026-07-24): exactly one sanctioned emergency escape to the
    // archived old admin is allowed — the small yellow icon-only button fixed at
    // the bottom corner of the V2 shell. Any other legacy link stays forbidden.
    const legacyHrefs = userFacingSources.match(/href\s*=\s*["']\/legacy\.html["']/g) || [];
    expect(legacyHrefs).toHaveLength(1);
    const shell = read('admin/v2/index.html');
    expect(shell).toMatch(/<a class="legacy-admin-link" href="\/legacy\.html" target="_blank" rel="noopener" title="Открыть старую админку в новой вкладке" aria-label="Открыть старую админку в новой вкладке">/);
    const sourcesWithoutSanctionedLink = userFacingSources
      .replace(/<a class="legacy-admin-link"[\s\S]*?<\/a>/, '')
      .replace(/\/\* Legacy admin quick link[\s\S]*?\}\n/, '');
    expect(sourcesWithoutSanctionedLink).not.toMatch(/href\s*=\s*["']\/legacy\.html/);

    for (const retiredLabel of [
      'Старая админка',
      'Открыть прежний модуль',
      'Старый бюджет',
      'Старый интерфейс',
      'Старая версия',
      'Legacy fallback:',
    ]) {
      expect(sourcesWithoutSanctionedLink).not.toContain(retiredLabel);
    }
    expect(sourcesWithoutSanctionedLink).not.toContain('Открыть старую админку');
  });

  test('keeps the exact retired-capability denylist and fails every retired hash closed', () => {
    const hashes = retiredCapabilityIds.flatMap((id) => [
      `#${id}`,
      `#overview:${id}`,
      `#overview%3A${id}`,
    ]);
    const snapshot = inspectCapabilityModule(hashes);

    expect(snapshot.retiredCapabilityIds).toEqual(retiredCapabilityIds);
    expect(snapshot.resolutions).toHaveLength(retiredCapabilityIds.length * 3);
    snapshot.resolutions.forEach((resolution) => {
      expect(resolution).toMatchObject({ resolved: true, route: 'overview', capabilityId: '' });
    });
  });

  test('checks single/double-quoted anchors and dynamic emitted hashes before resolving inside V2', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const staticAnchors = userFacingSourcePaths.flatMap((sourcePath) => {
      const source = read(sourcePath);
      return [...source.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(#[^"'$]+)\1[^>]*>/g)]
        .map((match) => ({ markup: match[0], hash: match[2] }));
    });
    const workflows = core.slice(core.indexOf('const CONTROL_PANEL_WORKFLOWS'), core.indexOf('function renderControlPanel()'));
    const workflowPrimaries = [...workflows.matchAll(/\bprimary:\s*'(#[^']+)'/g)].map((match) => match[1]);
    const overviewDecisions = core.slice(core.indexOf('function renderOverviewDecisions'), core.indexOf('const CONTROL_PANEL_WORKFLOWS'));
    const dynamicOverviewHashes = [...overviewDecisions.matchAll(/,\s*'(#[a-z0-9-]+)'\s*,\s*'[^']+'\s*,\s*'(?:danger|warning)'/g)].map((match) => match[1]);

    expect(staticAnchors.length).toBeGreaterThan(0);
    expect(workflowPrimaries.length).toBeGreaterThan(0);
    expect(dynamicOverviewHashes.length).toBeGreaterThan(0);
    staticAnchors.forEach(({ markup }) => expect(markup).not.toMatch(/\btarget\s*=\s*["']_blank["']/));
    expectCanonicalEmittedHashes([
      ...staticAnchors.map((anchor) => anchor.hash),
      ...workflowPrimaries,
      ...dynamicOverviewHashes,
    ]);
  });

  test('keeps literal data routes and every global-search emitted route canonical', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const literalDataRoutes = [...core.matchAll(/\bdata-route="([^"$]+)"/g)].map((match) => match[1]);
    const navigationMetadata = core.slice(core.indexOf('const CANONICAL_LEFT_NAV_ITEMS'), core.indexOf('function buildVisibleNavigationSearchIndex'));
    const metadataRoutes = [...navigationMetadata.matchAll(/\broute:\s*'([^']+)'/g)].map((match) => match[1]);
    const sectionMetadata = core.slice(core.indexOf('export const ADMIN_SECTIONS'), core.indexOf('const PAGES'));
    const sectionRoutes = [...sectionMetadata.matchAll(/\broute:\s*'([^']+)'/g)].map((match) => match[1]);
    const analyticsSearchBookmarks = [...core.matchAll(/\[['"]([a-z-]+)['"],\s*['"][^'"]+['"]\]/g)]
      .map((match) => match[1])
      .filter((route) => ['today', 'growth', 'subscriptions', 'learning'].includes(route));
    const { registry } = inspectCapabilityModule([]);
    const globalSearchRoutes = [
      ...sectionRoutes,
      ...metadataRoutes,
      ...registry.map((capability) => capability.nativeRoute),
      ...analyticsSearchBookmarks,
    ];

    expect(core).toContain('data-route="${route}"');
    expect(core).toContain('data-global-search-route="${escapeHtml(entry.route || entry.nativeRoute)}"');
    expect(sectionRoutes.length).toBeGreaterThan(0);
    expect(metadataRoutes.length).toBeGreaterThan(0);
    expect(registry.length).toBeGreaterThan(0);
    expect(analyticsSearchBookmarks).toEqual(expect.arrayContaining(['today', 'growth', 'subscriptions', 'learning']));
    expectCanonicalEmittedHashes([
      ...literalDataRoutes.map((route) => `#${route}`),
      ...globalSearchRoutes.map((route) => `#${route}`),
    ]);
  });

  test('keeps retired owner labels out of user-visible Admin V2 copy', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    expect(core).not.toMatch(/\bArena\b|Арена|Арены|Компас|\bCompass\b/);
    expect(core).toContain("{ key: 'gate_personal_plan_premium'");
    expect(core).toMatch(/function renderCommunity\(\)[\s\S]*?href="#report-center"[^>]*>Открыть центр репортов<\/a>/);
  });

  test('keeps the V2 shell rooted at the canonical / entry', () => {
    const shell = read('admin/v2/index.html');
    expect(shell).toContain('href="/styles/admin.css"');
    expect(shell).toContain('src="/scripts/admin-router.js"');
    expect(shell).not.toContain('="/v2/');
  });

  test('keeps the V2 stylesheet parseable after obsolete blocks are removed', () => {
    const css = read('admin/v2/styles/admin.css');
    expect(() => postcss.parse(css)).not.toThrow();
  });

  test('ends responsive layout with the authoritative mobile drawer cascade', () => {
    const rootCss = postcss.parse(read('admin/v2/styles/admin.css'));
    const responsiveRules = rootCss.nodes.filter((node): node is AtRule => node.type === 'atrule' && node.name === 'media');
    const tabletRules = responsiveRules.filter((node) => node.params.includes('max-width: 1020px'));
    const mobileRules = responsiveRules.filter((node) => node.params.includes('max-width: 760px'));
    const tabletIndex = responsiveRules.findLastIndex((node) => node.params.includes('max-width: 1020px'));
    const mobileIndex = responsiveRules.findLastIndex((node) => node.params.includes('max-width: 760px'));
    expect(mobileIndex).toBeGreaterThan(tabletIndex);

    const tabletCss = tabletRules.map((node) => node.toString()).join('\n');
    const mobileCss = mobileRules.map((node) => node.toString()).join('\n');
    expect(tabletCss).toMatch(/\.nav-group > summary span,\s*\.agent-office-nav span,\s*\.agent-manager-nav span\s*\{\s*display:\s*block/s);
    expect(tabletCss).not.toContain('.legacy-admin-link-label');
    expect(mobileCss).toMatch(/\.sidebar\s*\{[^}]*width:\s*min\(248px,\s*86vw\)[^}]*transform:\s*translateX\(-102%\)/s);
    expect(mobileCss).toMatch(/body\.nav-open \.sidebar\s*\{[^}]*transform:\s*translateX\(0\)/s);
    expect(mobileCss).toMatch(/\.workspace\s*\{[^}]*margin-left:\s*0/s);
    expect(mobileCss).toMatch(/\.nav-group > summary span,\s*\.nav-group > summary::after,\s*\.agent-office-nav span,\s*\.agent-manager-nav span\s*\{\s*display:\s*block/s);
    expect(mobileCss).not.toContain('.legacy-admin-link-label');
    expect(mobileCss).toMatch(/\.nav-group > summary\s*\{[^}]*justify-content:\s*flex-start/s);
    expect(mobileCss).toMatch(/\.sidebar \.nav-button\s*\{[^}]*justify-content:\s*flex-start/s);
    expect(mobileCss).toMatch(/\.command-save-bar\s*\{[^}]*left:\s*12px/s);
  });
});
