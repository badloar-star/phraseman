import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('settings message admin and vote contracts', () => {
  it('uses the only live admin surface for two independent slots', () => {
    const admin = read('admin/v2/legacy.html');
    expect(admin).toContain('>Плашки и сообщения</div>');
    expect(admin).toContain('id="settings-message-slots"');
    expect(admin).toContain('data-settings-slot="top"');
    expect(admin).toContain('data-settings-slot="bottom"');
    expect(admin).toContain('Голос после выбора изменить нельзя');
    expect(admin).toContain("collection(db, 'paywall_funnel')");
    expect(admin).toContain("row.step === 'purchase_completed'");
  });

  it('exports a protected first-vote callable and denies direct writes', () => {
    const callable = read('functions/src/settings_poll_vote.ts');
    const index = read('functions/src/index.ts');
    const rules = read('firestore.rules');
    const adminCallable = read('functions/src/admin_app_messages.ts');
    expect(callable).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(callable).toContain("collection('fixed_poll_votes').doc(stableUid)");
    expect(callable).toContain('transaction.create(voteRef');
    expect(index).toContain('submitSettingsPollVote');
    expect(adminCallable).toContain("collection('admin_config').doc(`settings_message_slot_${settingsSlot}`)");
    expect(adminCallable).toContain('activeMessageId: messageRef.id');
    expect(rules).toMatch(/match \/fixed_poll_votes\/\{userId\}[\s\S]*?allow create, update, delete: if false;/);
  });
});
