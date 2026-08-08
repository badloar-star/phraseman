import fs from 'fs';
import path from 'path';

describe('canonical premium resolver call sites', () => {
  it('passes authUid as the fourth resolvePremiumAccess argument at every Plus gate', () => {
    for (const file of [
      'explain_phrase.ts',
      'explain_choice.ts',
      'mistake_explain.ts',
      'stats_insights.ts',
      'weekly_review.ts',
    ]) {
      const source = fs.readFileSync(path.join(process.cwd(), 'src', file), 'utf8');
      expect(source).toContain('resolvePremiumAccess(db, stableUid, Date.now(), authUid)');
    }
  });
});
