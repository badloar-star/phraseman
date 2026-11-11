import fs from 'fs';
import path from 'path';

describe('admin app messages poll contract', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');
  const functionsSource = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'app_messages.ts'), 'utf8');

  it('only composes normal messages and excludes old polls from campaign history', () => {
    expect(html).not.toMatch(/id="am-(?:kind|poll-fields|preview-poll)"/);
    expect(html).not.toMatch(/appMessageBuildPollPayload|resetAppMessagePollEngagement/);
    expect(html).toContain("row.kind !== 'poll' && row.kind !== 'vip_survey' && !row.poll");
    expect(html).toContain('getAdminCreateAppMessageCallable()');
    expect(html).toContain('getAdminUpdateAppMessageCallable()');
  });

  it('keeps the Cloud Function counter safe during admin poll resets', () => {
    expect(functionsSource).toContain('pollResetAtMs');
    expect(functionsSource).toContain('countedBeforeOptionId');
    expect(functionsSource).toMatch(/pollResetAtMs >= beforeUpdatedAtMs/);
    expect(functionsSource).toMatch(/pollVoteCount: admin\.firestore\.FieldValue\.increment\(\(afterOptionId \? 1 : 0\) - \(countedBeforeOptionId \? 1 : 0\)\)/);
  });
});
