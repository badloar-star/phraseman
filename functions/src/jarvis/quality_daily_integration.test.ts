import fs from 'node:fs';
import path from 'node:path';

describe('Jarvis daily quality aggregate integration', () => {
  test.each([
    'callables.ts',
    'all_departments_callables.ts',
    'jarvis_crons.ts',
  ])('%s passes the server db so the reader can prefer the aggregate', (file) => {
    const source = fs.readFileSync(path.resolve(__dirname, file), 'utf8');
    for (const sourceId of ['error_reports', 'user_reports', 'app_errors']) {
      expect(source).toContain(`fetchQualitySource({ db, sourceId: '${sourceId}'`);
    }
  });

  test('the aggregate root is denied recursively and excluded from the browser-admin catch-all', () => {
    const rules = fs.readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8');
    expect(rules).toContain('match /jarvis_quality_daily/{document=**}');
    expect(rules).toContain("collection != 'jarvis_quality_daily'");
  });
});
