import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const audit = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'docs', 'reports', 'user_error_reports_audit_2026-07-10.json'), 'utf8'),
) as Array<{
  reportId: string;
  verdict: string;
  reward: number;
  group: string;
}>;
const batch = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'replies_batch_2026-07-10.json'), 'utf8'),
) as Array<{
  reportId: string;
  resolution: string;
  shards: number;
  rewardGroup: string;
}>;
const finalBatch = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'replies_batch_2026-07-10_final.json'), 'utf8'),
) as typeof batch;
const markdownAudit = fs.readFileSync(
  path.join(ROOT, 'docs', 'reports', 'user_error_reports_audit_2026-07-10.md'),
  'utf8',
);
const staleBuilder = fs.readFileSync(
  path.join(ROOT, 'scripts', 'build_user_report_audit_2026-07-10.mjs'),
  'utf8',
);

const FINAL_VERDICTS = new Set([
  'by_design',
  'confirmed_fixed',
  'duplicate',
  'no_issue_details',
  'not_reproduced',
  'user_error',
]);

describe('user report final closure', () => {
  it('keeps all 48 audited reports in a final state', () => {
    expect(audit).toHaveLength(48);
    expect(audit.filter((row) => !FINAL_VERDICTS.has(row.verdict))).toEqual([]);
  });

  it('keeps prepared admin replies aligned with the final audit decision', () => {
    expect(batch).toHaveLength(48);
    const batchById = new Map(batch.map((row) => [row.reportId, row]));

    for (const row of audit) {
      expect(batchById.get(row.reportId)).toMatchObject({
        resolution: row.verdict,
        shards: row.reward,
        rewardGroup: row.group,
      });
    }
  });

  it('keeps every published audit artifact synchronized and UTF-8 safe', () => {
    expect(finalBatch).toEqual(batch);
    expect(markdownAudit).toContain('0 unresolved reports');
    expect(markdownAudit).not.toMatch(/confirmed_investigating|content_review|\?{3,}/u);
    expect(staleBuilder).toContain("await import('./sync_user_report_support_copy.mjs')");
  });
});
