import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const core = readFileSync(join(root, 'admin/v2/scripts/admin-core.js'), 'utf8');
const firebase = readFileSync(join(root, 'admin/v2/scripts/admin-firebase.js'), 'utf8');
const html = readFileSync(join(root, 'admin/v2/index.html'), 'utf8');

describe('Admin V2 director digest UI contract', () => {
  test('bridges the fixed callable through Admin V2 Firebase actions', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetDirectorDigest')");
    expect(firebase).toContain('getDirectorDigest: async (input) => unwrap(await directorDigestCallable(input))');
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGenerateDirectorDigestAudio')");
    expect(firebase).toContain('generateDirectorDigestAudio: async (input) => unwrap(await directorDigestAudioCallable(input))');
  });

  test('offers one accessible action that reads the complete briefing aloud', () => {
    expect(core).not.toContain('data-action="speak-director-digest"');
    expect(core).toContain('data-action="pause-director-digest"');
    expect(core).toContain('loadDirectorDigestAndSpeak');
    expect(core).toContain('director-digest-audio');
    expect(core).toContain('new Audio');
    expect(core).toContain('aria-live="polite"');
    expect(core).toContain('directorDigestOwnerMonologue');
    expect(core).not.toContain("lines.push('Метрики отчёта:')");
    expect(core).not.toContain('digest.metrics.slice(0, 40)');
    expect(core).toContain("state.directorDigest.state === 'loading'");
    expect(core).toContain('Формирую и озвучиваю');
  });

  test('keeps director digest owner-only with all supported periods and a manual generate action', () => {
    expect(core).toContain('directorDigest');
    expect(core).toContain("state.adminRole !== 'owner'");
    expect(core).toContain('const periods = [1, 3, 7, 28, 90]');
    expect(core).toContain('data-action="load-director-digest"');
    expect(core).toContain('Сформировать сводку');
    const overviewStart = core.indexOf('function renderOverview()');
    const overviewEnd = core.indexOf('\nfunction ', overviewStart + 10);
    expect(core.slice(overviewStart, overviewEnd)).toContain('${renderDirectorDigest()}');
    const briefingStart = core.indexOf('function renderDailyBriefing');
    const briefingEnd = core.indexOf('\nfunction ', briefingStart + 10);
    expect(core.slice(briefingStart, briefingEnd)).not.toContain('${renderDirectorDigest()}');
  });

  test('renders compact accessible trend charts with a text alternative', () => {
    expect(core).toContain('director-digest-chart');
    expect(core).toContain('aria-label="График метрики');
    expect(core).toContain('director-digest-table');
  });

  test('shows one owner monologue and sends that same monologue to TTS', () => {
    const speechStart = core.indexOf('function directorDigestNarrativeSpeechText');
    const speechEnd = core.indexOf('\nfunction stopDirectorDigestAudio', speechStart);
    const speech = core.slice(speechStart, speechEnd);
    const renderStart = core.indexOf('function renderDirectorDigestNarrative');
    const renderEnd = core.indexOf('\nfunction renderDirectorDigest()', renderStart);
    const renderer = core.slice(renderStart, renderEnd);
    const ownerStart = core.indexOf('function directorDigestOwnerMonologue');
    const ownerEnd = core.indexOf('\nfunction directorDigestNarrativeSpeechText', ownerStart);
    const owner = core.slice(ownerStart, ownerEnd);

    expect(owner).toContain('narrative.ownerMonologue');
    expect(speech).toContain('directorDigestOwnerMonologue(narrative)');
    expect(speech).not.toContain('narrative.productManager');
    expect(speech).not.toContain('narrative.actions');
    expect(renderer).toContain('directorDigestOwnerMonologue(narrative)');
    expect(renderer).toContain('director-digest-monologue');
    expect(renderer).not.toContain('director-digest-narrative-grid');
    expect(renderer).not.toContain('<strong>Факт:</strong>');
    expect(renderer).not.toContain('<strong>Гипотеза:</strong>');
    expect(renderer).not.toContain('<strong>Успех:</strong>');
    expect(core).not.toContain('innerHTML = narrative');
  });

  test('keeps a visible deterministic Russian executive voice when narrative is missing', () => {
    expect(core).toContain('directorDigestFallbackNarrative');
    expect(core).toContain('Подтверждённых метрик за выбранный период нет.');
    expect(core).toContain('Данные за выбранный период недоступны; управленческий вывод не сформирован.');
    expect(core).toContain('digest?.narrative || directorDigestFallbackNarrative(digest, status)');
  });

  test('loads the UI module from Admin V2 only', () => {
    expect(html).toContain('/scripts/admin-router.js');
    expect(html).not.toContain('/admin/index.html');
  });

  test('keeps overview hydration owner-only without auto-calling the backend', () => {
    const refreshStart = core.indexOf("overview: [");
    const refreshEnd = core.indexOf("analytics: [", refreshStart);
    const refresh = core.slice(refreshStart, refreshEnd);
    expect(refresh).toContain("key: 'director-digest'");
    expect(refresh).toContain('ownerOnly: true');
    expect(refresh).toContain('refreshDirectorDigestPlaceholder');
    expect(core).toContain('function refreshDirectorDigestPlaceholder');
  });
});
