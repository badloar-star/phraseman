/**
 * зачем (сверка Ревизора 25.10, docs/work/tasks/revizor-deletion-grace-gate-audit-2026-10-25.md): после варианта Б (713677ddd)
 * пользователь Auth живёт 14 дней отсрочки удаления, и callable, берущие authUid напрямую, стали доступны удаляемому аккаунту.
 * Сторож: шлюз отказывает в отсрочке (account_delete_pending) и пишет причину; пропускает обычный аккаунт; в пяти обработчиках
 * стоит раньше остальных чтений/записей; у accountsV2SyncApply — после ворот флага (выключено → шлюз не зовётся).
 */
import * as fs from 'fs';
import * as path from 'path';
import type { Firestore } from 'firebase-admin/firestore';
import { assertAuthAccountUsableForCallable } from './account_gate';
import { handleAccountsV2SyncGated } from './accounts_v2_adapter/callable';
import type { AccountsV2FlagsReader } from './accounts_v2_flags';

const NOW = 1_800_000_000_000;
const UID = 'auth_uid_grace_test_1';

/** Фейк ровно под два чтения шлюза: метка удаления по authUid и постоянный отказ. */
function gateDb(marker: Record<string, unknown> | null): Firestore {
  return {
    collection: (name: string) => ({
      doc: () => ({
        get: async () => {
          const data = name === 'account_deletion_auth_markers' ? marker : null;
          return { exists: data !== null, data: () => data ?? undefined };
        },
      }),
    }),
  } as unknown as Firestore;
}

const codeOf = async (p: Promise<unknown>): Promise<string> => {
  try { await p; return 'ok'; } catch (e) { return String((e as { message?: unknown })?.message ?? e); }
};

describe('шлюз удаления для callable с прямым authUid', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { warn.mockRestore(); });

  it('отсрочка (метка pending, срок впереди) → account_delete_pending + журнал [ACCOUNT-GATE] с именем callable', async () => {
    const db = gateDb({ status: 'pending', graceDeadlineMs: NOW + 5 * 86_400_000 });
    expect(await codeOf(assertAuthAccountUsableForCallable(db, UID, 'referralSpin', NOW))).toBe('account_delete_pending');
    const line = warn.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('[ACCOUNT-GATE] reject'));
    expect(line).toContain('callable=referralSpin');
    expect(line).toContain('reason=account_delete_pending');
    expect(line).not.toContain(UID); // в журнал — только 6 знаков uid
  });

  it('обычный аккаунт (метки нет) → проходит без журнала', async () => {
    expect(await codeOf(assertAuthAccountUsableForCallable(gateDb(null), UID, 'referralSpin', NOW))).toBe('ok');
    expect(warn).not.toHaveBeenCalled();
  });

  it('срок отсрочки истёк → identity_retired (аккаунт удалён)', async () => {
    const db = gateDb({ status: 'pending', graceDeadlineMs: NOW - 1 });
    expect(await codeOf(assertAuthAccountUsableForCallable(db, UID, 'dailyPhraseSetSaved', NOW))).toBe('identity_retired');
  });
});

describe('accountsV2SyncApply: шлюз после ворот флага', () => {
  /** База, которой нельзя касаться: любое обращение — ошибка (доказывает, что до синка дело не дошло). */
  const untouchable = new Proxy({}, { get: () => { throw new Error('db_touched'); } }) as unknown as Firestore;
  const flags = (syncEnabled: boolean): AccountsV2FlagsReader => ({
    read: async () => ({ ok: true, flags: { syncEnabled, minClientVersion: 0 } }),
  }) as unknown as AccountsV2FlagsReader;

  beforeEach(() => { jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('флаг выключен → шлюз не зовётся (0 чтений), отказ accounts_v2_disabled', async () => {
    const gate = jest.fn(async () => undefined);
    const code = await codeOf(handleAccountsV2SyncGated(untouchable, { auth: { uid: UID }, data: {} }, flags(false), undefined, gate));
    expect(code).toBe('accounts_v2_disabled');
    expect(gate).not.toHaveBeenCalled();
  });

  it('флаг включён, аккаунт в отсрочке → отказ шлюза до синка', async () => {
    const gate = jest.fn(async () => { throw Object.assign(new Error('account_delete_pending'), { code: 'failed-precondition' }); });
    const code = await codeOf(handleAccountsV2SyncGated(untouchable, { auth: { uid: UID }, data: {} }, flags(true), undefined, gate));
    expect(code).toBe('account_delete_pending');
    // сравнение по ссылке: глубокое сравнение jest полезло бы в «нетрогаемую» базу
    expect(gate).toHaveBeenCalledTimes(1);
    const [calledDb, calledUid] = gate.mock.calls[0] as unknown as [unknown, string];
    expect(calledDb === untouchable).toBe(true);
    expect(calledUid).toBe(UID);
  });

  it('боевая обёртка передаёт настоящий шлюз', () => {
    const src = fs.readFileSync(path.join(__dirname, 'accounts_v2_adapter', 'callable.ts'), 'utf8');
    const wrapper = src.slice(src.indexOf('export const accountsV2SyncApply'));
    expect(wrapper).toContain("assertAuthAccountUsableForCallable(gateDb, authUid, 'accountsV2SyncApply')");
  });
});

describe('сторож по исходнику: шлюз первым в обработчике', () => {
  const cases: ReadonlyArray<[string, string, readonly string[]]> = [
    ['referral_spin.ts', 'referralSpin', ['assertAuthStableLink(', 'resolveReferralRoulettePolicy(', 'runTransaction(']],
    ['referral_claim_spin.ts', 'referralClaimSpin', ['assertAuthStableLink(', 'resolveReferralRoulettePolicy(', 'runTransaction(']],
    ['community_pack_rune_sale.ts', 'communitySyncPackRuneSale', ['runTransaction(', 'tx.get(']],
    ['daily_phrases.ts', 'dailyPhraseSetSaved', ['resolveStableUid(', 'runTransaction(']],
  ];
  it.each(cases)('%s: шлюз раньше остальных чтений', (file, callable, laterCalls) => {
    const src = fs.readFileSync(path.join(__dirname, file), 'utf8');
    const handler = src.slice(src.indexOf(`export const ${callable} = onCall`));
    const gateAt = handler.indexOf(`assertAuthAccountUsableForCallable(db, authUid, '${callable}')`);
    expect(gateAt).toBeGreaterThan(0);
    for (const call of laterCalls) {
      const at = handler.indexOf(call);
      if (at >= 0) expect(gateAt).toBeLessThan(at);
    }
  });
});
