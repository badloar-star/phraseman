import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'functions', 'src', 'admin_daily_digest.ts'), 'utf8');
const index = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');

describe('Admin daily briefing fail-closed contract', () => {
  test('tracks every source and blocks false quiet-day generation before AI', () => {
    expect(source).toContain('export async function loadDigestSourcesWithHealth');
    expect(source).toContain('health: DigestSourceHealth[]');
    expect(source).toContain("if (completeness.state === 'blocked')");
    expect(source.indexOf("if (completeness.state === 'blocked')")).toBeLessThan(source.indexOf('await openAiChat({'));
    expect(source).toContain("action: 'ai_daily_digest_blocked'");
    expect(source).toContain('schemaVersion: 2');
    expect(source).toContain('generationState: completeness.state');
    expect(source).toContain('sourceHealth: loaded.health');
    expect(source).toContain("record('users', 'created_at', snap.size");
    expect(source).toContain("record('paywall_funnel', 'day', snap.size");
    expect(source).toContain('await db.runTransaction(async (tx) =>');
    expect(source).toContain("shouldPreserveCompleteDigest(prior, 'partial')");
    expect(source.indexOf('const current = await tx.get(digestRef)')).toBeLessThan(source.indexOf('tx.set(digestRef, digestDocument)'));
  });

  test('exposes a permission-checked stored briefing read without running production queries', () => {
    expect(source).toContain('export const adminGetDailyBriefing = onCall(');
    expect(source).toContain("requireDigestPermission(request, 'briefing.read')");
    expect(source).toContain("requireDigestPermission(request, 'briefing.generate')");
    expect(index).toContain("export { adminGenerateDailyDigest, adminGetDailyBriefing } from './admin_daily_digest';");
  });
});
