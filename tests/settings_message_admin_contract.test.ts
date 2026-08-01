import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('settings message admin and vote contracts', () => {
  it('uses the only live admin surface for two independent slots', () => {
    const admin = read('admin/v2/legacy.html');
    expect(admin).toContain('id="settings-message-slots"');
    expect(admin).toContain('data-settings-slot="top"');
    expect(admin).toContain('data-settings-slot="bottom"');
    expect(admin).toContain('Голос после выбора изменить нельзя');
  });

  it('exports a protected first-vote callable and denies direct writes', () => {
    const callable = read('functions/src/settings_poll_vote.ts');
    const index = read('functions/src/index.ts');
    const rules = read('firestore.rules');
    expect(callable).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(callable).toContain("collection('fixed_poll_votes').doc(uid)");
    expect(callable).toContain('transaction.create(voteRef');
    expect(index).toContain('submitSettingsPollVote');
    expect(rules).toMatch(/match \/fixed_poll_votes\/\{userId\}[\s\S]*?allow create, update, delete: if false;/);
  });
});
