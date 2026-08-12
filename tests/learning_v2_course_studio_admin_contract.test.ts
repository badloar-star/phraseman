import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'admin', 'learning-v2-generator.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'admin', 'styles', 'learning-v2-generator.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'admin', 'scripts', 'pages', 'learning-v2-generator.js'), 'utf8');
const legacy = fs.readFileSync(path.join(root, 'admin', 'legacy.html'), 'utf8');

describe('Learning V2 root-admin course studio', () => {
  test('opens inside the legacy admin and keeps the old standalone URL as a redirect only', () => {
    expect(legacy).toContain("switchTab('v2-generator')");
    expect(legacy).not.toContain("location.href='/learning-v2-generator.html'");
    expect(html).toContain("window.location.replace('/legacy.html' + window.location.search + '#control-panel')");
    expect(html).toContain('content="0;url=/legacy.html#control-panel"');
    expect(`${html}\n${css}\n${js}`).not.toContain('admin/v2');
  });

  test('shows the owner a light, accessible seven-stage approval workflow', () => {
    expect(css).toContain('--bg: #f7f8fa');
    expect(html).toContain('Тестовый черновик — не для релиза');
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).toContain('role="dialog" aria-modal="true"');
    expect(css).toContain('prefers-reduced-motion');
    const stageCatalog = js.slice(js.indexOf('const COURSE_STAGES'), js.indexOf('const COURSE_LOCALES'));
    expect(stageCatalog.match(/kind: 'learning_v2_/g)).toHaveLength(7);
    expect(js).toContain("Object.freeze(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'])");
    expect(html).toContain('E1–E8');
    expect(html).toContain('E1–E32');
    expect(html).toContain('Полный сезон только после двух зелёных ворот');
  });

  test('keeps all generated content multilingual, four-voice and manually reviewed', () => {
    for (const voice of ['Ash', 'Onyx', 'Nova', 'Coral']) expect(`${html}\n${js}`).toContain(voice);
    for (const callable of [
      'adminCreateContentStage', 'adminRunContentStage', 'adminListContentStages', 'adminPreviewContentStage', 'adminReviewContentStage',
      'adminPreviewLearningV2CourseWave', 'adminApproveLearningV2CourseWave', 'adminRejectLearningV2CourseWave',
    ]) expect(js).toContain(callable);
    expect(js).not.toContain('adminSeedV2E1DemoSource');
    expect(js).not.toContain('adminRunV2E1Compilation');
    expect(js).not.toMatch(/publish[A-Z]/);
    expect(html).toContain('Одобрить этап');
    expect(html).toContain('Вернуть на исправление');
  });

  test('replaces a generic paused-stage restart with an exact owner wave review', () => {
    expect(js).toContain("learningV2PauseReason === 'owner_wave_approval_required'");
    expect(js).toContain("learningV2PauseReason === 'root_manifest_materialization_pending'");
    expect(js).toContain("WAVE_LABELS = Object.freeze({ e1: 'E1', chapter_1: 'E1–E8', season: 'E1–E32' })");
    expect(js).toContain('expectedCheckpointFingerprint');
    expect(html).toContain('Сессия для полной проверки');
    expect(html).toContain('Предыдущий эпизод');
    expect(html).toContain('Следующий эпизод');
    expect(css).toContain('.review-content.is-wave');
  });

  test('requires an authenticated admin and preserves the mobile Hosting auth handoff', () => {
    expect(js).toContain("token.claims?.admin !== true");
    expect(js).toContain('applyMobileHostingAuthDomain');
    expect(js).toContain("hostname !== `${projectId}.web.app`");
    expect(js).toContain("getFunctions(app, 'us-central1')");
  });
});
