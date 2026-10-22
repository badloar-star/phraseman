// зачем (координатор 12.10, п.70 №2): users/{uid} на старте читался до трёх раз. Проверка бана берёт `banned` из
// документа восстановления (если он свежий), рассылка — доступ из PremiumContext. TTL кэша бана не меняется.
import fs from 'fs';
import path from 'path';

import {
  RESTORE_USER_DOC_BAN_MAX_AGE_MS,
  noteRestoreUserDocBanned,
  resetRestoreUserDocBanPeekForTests,
  waitForRestoreUserDocBanned,
} from '../app/boot_user_doc_ban_peek';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('[BAN-CHECK] banned из документа восстановления', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    resetRestoreUserDocBanPeekForTests();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => log.mockRestore());

  it('документ уже прочитан — ответ сразу, без ожидания', async () => {
    noteRestoreUserDocBanned('u1', true, Date.now());
    await expect(waitForRestoreUserDocBanned('u1', 5_000)).resolves.toMatchObject({ source: 'restore_doc', banned: true });
  });

  it('ждёт восстановление и просыпается по его записи', async () => {
    const pending = waitForRestoreUserDocBanned('u1', 5_000);
    noteRestoreUserDocBanned('u1', false);
    await expect(pending).resolves.toMatchObject({ source: 'restore_doc', banned: false });
  });

  it('не дождались — timeout, проверка читает документ сама', async () => {
    await expect(waitForRestoreUserDocBanned('u1', 10)).resolves.toEqual({ source: 'none', reason: 'timeout' });
  });

  it('документ другого аккаунта и устаревший документ не используются', async () => {
    noteRestoreUserDocBanned('other', true);
    await expect(waitForRestoreUserDocBanned('u1', 10)).resolves.toEqual({ source: 'none', reason: 'timeout' });
    noteRestoreUserDocBanned('u1', true, Date.now() - RESTORE_USER_DOC_BAN_MAX_AGE_MS - 1);
    await expect(waitForRestoreUserDocBanned('u1', 10)).resolves.toEqual({ source: 'none', reason: 'timeout' });
    const pending = waitForRestoreUserDocBanned('u1', 5_000);
    noteRestoreUserDocBanned('other', false);
    await expect(pending).resolves.toEqual({ source: 'none', reason: 'other_uid' });
  });

  it('контракт: восстановление публикует banned, проверка бана берёт его, banned_users читается всегда, TTL 30 мин', () => {
    const cloudSync = read('app/cloud_sync.ts');
    expect(cloudSync).toContain("noteRestoreUserDocBanned(uid, doc.exists ? !!(doc.data() as { banned?: unknown } | undefined)?.banned : false);");
    const layout = read('app/_layout.tsx');
    expect(layout).toContain('const BAN_CACHE_TTL_MS = 30 * 60 * 1000;');
    expect(layout).toContain("db.collection('banned_users').doc(uid).get(), // guard-ok: один документ по id");
    expect(layout).toContain('force ? Promise.resolve(null) : waitForRestoreUserDocBanned(uid, BAN_RESTORE_DOC_WAIT_MS)');
    expect(layout).toContain("if (restorePeek?.source === 'restore_doc') {");
    // повторная проверка по кнопке всегда читает сеть
    expect(layout).toContain("reason=${force ? 'force' : restorePeek?.reason ?? 'none'}");
  });

  it('контракт: рассылка берёт аудиторию из PremiumContext, пока он не разрешён — из документа', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toContain('broadcastAudienceAccessRef.current = accessResolved ? (premiumForAudience || vipForAudience) : null;');
    // teamModalVerdict — окно рассылки только тем, кто в приложении ≥ 48 ч (владелец 22.10)
    expect(layout).toContain('fetchPendingGlobalBroadcastModal(studyTarget, { premiumAudienceAccess: broadcastAudienceAccessRef.current, teamModalVerdict: verdict })');
    const broadcast = read('app/global_broadcast_modal.ts');
    expect(broadcast).toContain("if (typeof options.premiumAudienceAccess === 'boolean') {");
    expect(broadcast).toContain('source=users_doc');
  });
});
