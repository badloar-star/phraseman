import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'admin/v2/legacy.html'), 'utf8');
const indexSource = fs.readFileSync(path.join(ROOT, 'functions/src/index.ts'), 'utf8');
const modulePath = path.join(ROOT, 'functions/src/admin_arena_content.ts');
const moduleSource = fs.existsSync(modulePath) ? fs.readFileSync(modulePath, 'utf8') : '';

const panelStart = html.indexOf('id="tab-arena-content"');
const nextPanelStart = html.indexOf('<div id="tab-', panelStart + 1);
const panelEnd = nextPanelStart >= 0 ? nextPanelStart : html.length;
const panel = panelStart >= 0 && panelEnd > panelStart ? html.slice(panelStart, panelEnd) : '';
const scriptStart = html.indexOf('const ARENA_CONTENT_TARGET_LABELS');
const scriptEnd = html.indexOf('</script>', scriptStart);
const script = scriptStart >= 0 && scriptEnd > scriptStart ? html.slice(scriptStart, scriptEnd) : '';

describe('live Arena multilingual DRAFT admin surface', () => {
  test('lives only on the canonical legacy admin Content surface', () => {
    expect(html).toContain("switchTab('arena-content')");
    expect(html).toContain('id="tab-arena-content"');
    expect(html).toContain("'arena-content': 'community'");
    expect(html).toContain("content:new Set([");
    expect(html).toContain("'arena-content'");
  });

  test('offers explicit Spanish, French and German targets without fallback to English', () => {
    expect(panel).toContain('for="arena-content-target"');
    expect(panel).toContain('id="arena-content-target"');
    expect(panel).toContain('<option value="es">Spanish</option>');
    expect(panel).toContain('<option value="fr">French</option>');
    expect(panel).toContain('<option value="de">German</option>');
    expect(panel).not.toContain('value="en"');
    expect(script).not.toMatch(/fallback.*en|\|\|\s*['"]en['"]/iu);
  });

  test('shows counts, hashes, manifest BLOCK and review readiness from read-only callables', () => {
    for (const id of [
      'arena-content-required-count',
      'arena-content-generated-count',
      'arena-content-manifest-verdict',
      'arena-content-review-readiness',
      'arena-content-manifest-sha',
      'arena-content-tasks-sha',
      'arena-content-ledger-sha',
      'arena-content-evidence-sha',
    ]) expect(panel).toContain(`id="${id}"`);
    expect(script).toContain("httpsCallable(functionsUs, 'adminArenaContentStatus')");
    expect(script).toContain("httpsCallable(functionsUs, 'adminArenaContentValidate')");
    expect(script).toContain('textContent');
  });

  test('keeps package import and every mutation visibly unavailable', () => {
    for (const id of [
      'arena-content-import',
      'arena-content-stage',
      'arena-content-publish',
      'arena-content-rollback',
    ]) expect(panel).toMatch(new RegExp(`id="${id}"[^>]*disabled`, 'u'));
    expect(panel).toContain('large_static_package_transport_unavailable');
    expect(panel).toContain('Публикация заблокирована');
    expect(panel).toContain('title=');
    expect(script).not.toContain('OPENAI');
    expect(script).not.toContain('adminTournament');
    expect(script).not.toContain('TOURNAMENTS_RELEASED');
  });

  test('exports only read-only Arena content status and validation callables', () => {
    expect(indexSource).toContain('adminArenaContentStatus, adminArenaContentValidate');
    expect(indexSource).toContain('from "./admin_arena_content"');
    expect(moduleSource).toContain('export const adminArenaContentStatus = onCall');
    expect(moduleSource).toContain('export const adminArenaContentValidate = onCall');
    expect(moduleSource).not.toContain('.set(');
    expect(moduleSource).not.toContain('.update(');
    expect(moduleSource).not.toContain('.delete(');
    expect(moduleSource).not.toContain('OPENAI');
  });
});
