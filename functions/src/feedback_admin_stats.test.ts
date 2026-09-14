import fs from 'node:fs';
import path from 'node:path';
import { aggregateAdminFeedback } from './feedback_admin_logic';

const statsPath = path.join(__dirname, 'feedback_admin_stats.ts');
const readStats = (): string => fs.existsSync(statsPath) ? fs.readFileSync(statsPath, 'utf8') : '';

describe('adminGetFeedbackStats contract', () => {
  it('exists as a dedicated aggregate-only callable', () => {
    expect(fs.existsSync(statsPath)).toBe(true);
    expect(readStats()).toContain('export const adminGetFeedbackStats = onCall(');
  });

  it('requires admin reports.read and uses the owner-controlled App Check option', () => {
    const source = readStats();
    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK_ADMIN');
    expect(source).toContain("hasPermission(role, 'reports.read')");
    expect(source).toContain("new HttpsError('permission-denied', 'Admin only')");
  });

  it('returns aggregates without serializing messages', () => {
    const result = aggregateAdminFeedback([{ rating: 5, message: 'secret' }], 'all');
    expect(result.ratedTotal).toBe(1);
    expect(result).not.toHaveProperty('items');
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('loads only aggregate fields and exhausts every server page', () => {
    const source = readStats();
    expect(source).toContain("select('rating', 'message', 'createdAtMs')");
    expect(source).toContain('if (snap.docs.length < FEEDBACK_STATS_BATCH) break;');
    expect(source).not.toMatch(/return\s+\{[^}]*items/s);
  });

  it('is exported from the functions entry point', () => {
    const index = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(index).toContain('adminGetFeedbackStats');
    expect(index).toContain('exports.adminGetFeedbackStats = adminGetFeedbackStats');
  });
});
