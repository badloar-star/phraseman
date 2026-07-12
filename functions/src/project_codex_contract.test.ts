import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const CODEX_PATH = path.join(ROOT, 'admin', 'generated', 'app-codex.json');

describe('Phraseman application Codex', () => {
  test('contains searchable screen, path, callable, event and metric entities', () => {
    expect(fs.existsSync(CODEX_PATH)).toBe(true);
    const codex = JSON.parse(fs.readFileSync(CODEX_PATH, 'utf8'));
    expect(codex.schemaVersion).toBe('phraseman-app-codex-v1');
    expect(codex.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(codex.entities.some((entity: { kind: string; route?: string }) => entity.kind === 'screen' && entity.route)).toBe(true);
    expect(codex.entities.some((entity: { kind: string }) => entity.kind === 'firestore_path')).toBe(true);
    expect(codex.entities.some((entity: { kind: string }) => entity.kind === 'callable')).toBe(true);
    expect(codex.entities.some((entity: { kind: string }) => entity.kind === 'event')).toBe(true);
    expect(codex.entities.some((entity: { kind: string; sourceIds?: string[] }) => entity.kind === 'metric' && entity.sourceIds?.length)).toBe(true);
  });

  test('documents admin digest coverage and freshness inputs', () => {
    const codex = JSON.parse(fs.readFileSync(CODEX_PATH, 'utf8'));
    expect(codex.coverage.digestSources.length).toBeGreaterThan(10);
    expect(codex.coverage.adminTabs.length).toBeGreaterThan(20);
    expect(codex.inputFiles).toContain('admin/index.html');
    expect(codex.inputFiles).toContain('functions/src/admin_digest_contracts.ts');
  });

  test('generates a server-side digest projection used by the prompt', () => {
    const projectionPath = path.join(ROOT, 'functions', 'src', 'generated', 'admin_digest_codex.ts');
    const digestSource = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'admin_daily_digest.ts'), 'utf8');
    const projection = fs.readFileSync(projectionPath, 'utf8');
    expect(projection).toContain('"schemaVersion": "phraseman-digest-codex-v1"');
    expect(projection).toContain('metricSources');
    expect(projection).toContain('revenuecat_premium_events');
    expect(digestSource).toContain("import { ADMIN_DIGEST_CODEX } from './generated/admin_digest_codex'");
    expect(digestSource).toContain('codex: ADMIN_DIGEST_CODEX');
  });

  test('is exposed as a searchable accessible admin section', () => {
    const adminHtml = fs.readFileSync(path.join(ROOT, 'admin', 'index.html'), 'utf8');
    const modulePath = path.join(ROOT, 'admin', 'app-codex.js');
    expect(fs.existsSync(modulePath)).toBe(true);
    expect(adminHtml).toContain("'app-codex'");
    expect(adminHtml).toContain('id="tab-app-codex"');
    expect(adminHtml).toContain('id="app-codex-search"');
    expect(adminHtml).toContain('aria-label="Поиск по Кодексу приложения"');
    expect(adminHtml).toContain('app-codex.js');
  });

  test('has explicit generation and CI drift commands for every session', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'source-quality.yml'), 'utf8');
    const agents = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
    expect(packageJson.scripts['codex:generate']).toBe('node scripts/generate_project_atlas.mjs --codex-only');
    expect(packageJson.scripts['codex:check']).toBe('node scripts/generate_project_atlas.mjs --check');
    expect(workflow).toContain('npm run codex:check');
    expect(agents).toContain('npm run codex:generate');
    expect(agents).toContain('npm run codex:check');
  });
});
