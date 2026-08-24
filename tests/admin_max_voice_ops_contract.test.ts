import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'admin', 'v2', 'legacy.html'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'functions', 'src', 'max_voice_ops_dashboard.ts'), 'utf8');

describe('single MAX operations admin surface', () => {
  test('lives only in the production legacy surface and exposes bounded diagnostics', () => {
    expect(admin).toContain('id="tab-max-ops"');
    expect(admin).toContain("'max-ops'");
    expect(admin).toContain('Здоровье MAX');
    expect(admin).toContain('Source: server daily MAX aggregates');
    expect(admin).toContain('1 день');
    expect(admin).toContain('7 дней');
    expect(admin).toContain('30 дней');
    expect(admin).toContain('Обновить');
    expect(admin).toContain('maxOpsLoad');
    expect(admin).toContain('data-tooltip=');
    expect(admin).toContain('Причины отказа до резерва');
    expect(admin).toContain('max-ops-mint-rejections');
    expect(admin).toContain('distributions.mintRejectionReasons');
  });

  test('has no learner/session/content drill-down or realtime behavior', () => {
    const sectionStart = admin.indexOf('id="tab-max-ops"');
    const sectionEnd = admin.indexOf('</section>', sectionStart);
    const section = admin.slice(sectionStart, sectionEnd > sectionStart ? sectionEnd : sectionStart + 30_000);
    expect(section).not.toMatch(/UID|имя пользователя|поиск сесс|транскрипт|диалог|summary|free.?text/i);
    expect(section).not.toMatch(/onSnapshot|setInterval|input[^>]+type="(?:text|search)"/i);
  });

  test('the callable is permission-gated, bounded, content-free, and App Check remains disabled for admin', () => {
    expect(dashboard).toContain("hasPermission(role, 'diagnostics.read')");
    expect(dashboard).toContain("ENFORCE_APP_CHECK_ADMIN");
    expect(dashboard).toContain("action: 'max_ops_read'");
    expect(dashboard).toContain("[1, 7, 30]");
    expect(dashboard).not.toMatch(/voice_call_reviews|voice_tutor_memory|transcript|history|dialogue|sessionId/);
  });

  test('the combined Jarvis view has a named MAX department', () => {
    expect(admin).toContain("maxvoice: { title: 'MAX', accentRgb: '52,211,153' }");
  });

  test('safety_flags reaches the browser only through the server-filtered callable', () => {
    expect(admin).not.toContain("u360Query('safety_flags'");
    expect(admin).not.toContain('fetchSafetyFlagsFirestoreFallback');
    expect(admin).not.toContain("collection(db, 'safety_flags')");
    expect(admin).toContain("getAdminListSafetyFlagsCallable()({ handled:'all', identity:uid, limit:60 })");
  });
});
