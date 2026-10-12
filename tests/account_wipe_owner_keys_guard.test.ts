// зачем (PRIVACY_DELTA_R1 п.5, координатор 12.10): ключи сообщений аккаунта (в имени — stableId) переживали выход и удаление аккаунта,
// а политика (§3, §20) обещает удаление локальных данных. Сторож: (1) эти ключи стирает wipeLocalAccountData; денежные очереди — нет;
// (2) каждый ключ-владелец (`<prefix>:${owner}`) в app/** имеет решение — стирается или сохраняется намеренно (с причиной).
// Новый ключ-владелец без решения роняет тест: так пропуск больше не проскочит молча.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

function listTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTs(rel));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/** Решение по каждому ключу-владельцу. wiped — убирается при выходе/удалении; kept — сохраняется намеренно (причина). */
const OWNER_KEY_DECISIONS: Record<string, { decision: 'wiped' | 'kept'; how: string }> = {
  app_messages_cache_v2: { decision: 'wiped', how: 'шаг appMessages (APP_MESSAGES_ACCOUNT_WIPE_PREFIXES)' },
  app_messages_login_forced_v1: { decision: 'wiped', how: 'шаг appMessages' },
  mistake_restore_full_done_v1: { decision: 'wiped', how: 'шаг appMessages (WIPE_ONLY_ACCOUNT_KEY_PREFIXES)' },
  // зачем (п.80): ключи «константа + stableId» — их прежний сторож не видел, и после удаления гостя они оставались
  friend_blocked_v1: { decision: 'wiped', how: 'шаг appMessages (WIPE_ONLY_ACCOUNT_KEY_PREFIXES, FRIEND_BLOCKED_CACHE_PREFIX)' },
  economy_daily_stats_tail_v1: { decision: 'wiped', how: 'шаг appMessages (WIPE_ONLY_ACCOUNT_KEY_PREFIXES, ECONOMY_DAILY_STATS_TAIL_PREFIX)' },
  paid_level_spin_envelope_v1: { decision: 'kept', how: 'деньги: конверт платного спина, владелец-scoped, досылается при возврате владельца' },
  level_spin_star_grant_outbox_v1: { decision: 'kept', how: 'деньги: очередь начислений звёзд спина' },
  level_spin_star_projection_v1: { decision: 'kept', how: 'деньги: проекция начислений' },
  level_spin_star_prepared_v1: { decision: 'kept', how: 'деньги: подготовленные начисления' },
  level_spin_star_operation_v1: { decision: 'kept', how: 'деньги: журнал операций' },
  practice_rune_journal_v1: { decision: 'kept', how: 'деньги: журнал рун практики' },
  community_pack_paid_ids_v1: { decision: 'kept', how: 'покупки наборов (деньги) — решение координатора: стирать при УДАЛЕНИИ, не при смене (§AUTH-0180)' },
  community_pack_sale_outbox_v1: { decision: 'kept', how: 'очередь продаж автора (деньги) — решение координатора (§AUTH-0180)' },
};

describe('account wipe covers every owner-keyed local key', () => {
  it('wipes the app message keys and the mistake-restore marker, keeps the report-reward claim queue', async () => {
    jest.resetModules();
    jest.doMock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));
    const messages = read('app/app_messages.ts');
    const prefixes = [...messages.matchAll(/^const (\w+_KEY_PREFIX) = '([^']+)';/gm)].map((m) => ({ name: m[1], value: m[2] }));
    const wipeList = messages.slice(messages.indexOf('APP_MESSAGES_ACCOUNT_WIPE_PREFIXES'), messages.indexOf('APP_MESSAGES_ACCOUNT_WIPE_LEGACY_KEYS'));
    for (const { name, value } of prefixes) {
      if (name === 'REPORT_REPLY_PENDING_CLAIMS_KEY_PREFIX') {
        expect(wipeList).not.toContain(name); // деньги: досылает синхронизация
        continue;
      }
      expect({ name, value, inWipeList: wipeList.includes(`  ${name},`) }).toEqual({ name, value, inWipeList: true });
    }
    const sync = read('app/cloud_sync.ts');
    expect(sync).toContain("const MISTAKE_RESTORE_FULL_DONE_PREFIX = 'mistake_restore_full_done_v1';");
    // шаг стирания — тем же removeExactly, после «Памяти диалогов», и тихий повтор в конце без броска
    const body = sync.slice(sync.indexOf('async function wipeLocalAccountDataUnsafeBody'), sync.indexOf('// Сбрасываем in-memory bookkeeping синка'));
    expect(body.indexOf("markWipeStage('dialogueMemory')")).toBeLessThan(body.indexOf('await removeExactly(wipeOnlyKeys);'));
    expect(body).toContain("markWipeStage('appMessages', wipeOnlyKeys.length);");
    expect(body).toContain('[ACC-WIPE] app_messages ');
    const late = body.slice(body.indexOf('const lateWipeOnlyKeys'), body.indexOf('if (finalResidue.length > 0)'));
    expect(late).not.toContain('throw');
    // общий инвентарь (копия + проверка чистоты) НЕ расширен ключами сообщений
    const inventory = sync.slice(sync.indexOf('export function accountOwnedStorageKeysFrom'), sync.indexOf('export function accountLocalDataKeysForToday'));
    expect(inventory).not.toMatch(/wipeOnlyAccountKeyPrefix|APP_MESSAGES_ACCOUNT_WIPE/);
  });

  it('every `<prefix>:${owner}` storage key in app/** has a wipe decision', () => {
    const ownerKeyRx = /`([a-z][a-z0-9_]*_v\d+):\$\{(?:encodeURIComponent\()?(?:stableId|ownerUid|ownerStableId|owner|uid)\b/g;
    const found = new Map<string, string>();
    // зачем (п.80): ключ, склеенный из константы-префикса и владельца (`PREFIX + uid`, `${PREFIX}${uid}`), — тот же ключ-владелец
    const ownerVar = '(?:stableId|ownerUid|ownerStableId|owner|uid|myUid|userId)';
    for (const file of listTs('app')) {
      const source = read(file);
      for (const m of source.matchAll(ownerKeyRx)) found.set(m[1], file);
      for (const c of source.matchAll(/const (\w+) = '([a-z][a-z0-9_]*_v\d+):';/g)) {
        const glued = new RegExp(`\\b${c[1]} *\\+ *${ownerVar}\\b|\\$\\{${c[1]}\\}\\$\\{${ownerVar}\\}`);
        if (glued.test(source)) found.set(c[2], file);
      }
    }
    // сторож не пустой: известные ключи-владельцы находятся
    for (const known of ['community_pack_paid_ids_v1', 'level_spin_star_grant_outbox_v1', 'mistake_restore_full_done_v1', 'friend_blocked_v1', 'economy_daily_stats_tail_v1']) {
      expect(found.has(known)).toBe(true);
    }
    // ключи сообщений строятся через appMessagesOwnerStorageKey — их покрывает первый тест
    const undecided = [...found.entries()].filter(([prefix]) => !OWNER_KEY_DECISIONS[prefix]).map(([prefix, file]) => `${prefix} (${file})`);
    expect(undecided).toEqual([]);
  });
});
