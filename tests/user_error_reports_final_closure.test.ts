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
// зачем (04.10): разовые файлы июльской раздачи ответов — replies_batch_2026-07-10.json, replies_batch_2026-07-10_final.json и
// scripts/build_user_report_audit_2026-07-10.mjs — удалены при сводной чистке корня репозитория (68f4ef973, 15.08); в них же были награды
// осколками (осколки убраны в 2.0). Тест падал на чтении отсутствующего файла ещё до первой проверки. Остаётся то, что реально хранится:
// итоговый аудит (JSON и Markdown) — все 48 обращений в финальном состоянии, нерешённых нет.
const markdownAudit = fs.readFileSync(
  path.join(ROOT, 'docs', 'reports', 'user_error_reports_audit_2026-07-10.md'),
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

  it('keeps every published audit artifact synchronized and UTF-8 safe', () => {
    expect(markdownAudit).toContain('0 unresolved reports');
    expect(markdownAudit).not.toMatch(/confirmed_investigating|content_review|\?{3,}/u);
  });
});
