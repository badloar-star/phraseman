import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Account Authority 2.0, этап S1e-2 — хвосты ревью S1e (c0333fe6d) по ключу
 * flashcards_force_future_kept_local_v1 (локальные версии карточек, уступившие облачной «из будущего»).
 *
 * 1. readOwnAccountSwitchBackupValue не читает копию, у которой в корне чужой владелец (защита в
 *    глубину: вызывающий тоже проверяет, поэтому снятие проверки в функции раньше не ловилось).
 * 2. Стирание аккаунта при непустом ключе, который в аварийную копию не попал (presync гостя с
 *    успешной выгрузкой), пишет future_kept_stash_wiped count=N — редкий случай становится видимым.
 * 3. Применение при входе чистит записи ЧУЖОГО владельца старше 30 дней (иначе копятся до потолка).
 * 4. Значение ключа обязано помещаться в одну страницу аварийной копии (512 КБ на пару, пара не
 *    делится): иначе копия бросает value_upgrade_required и смена аккаунта блокируется. 1000 крупных
 *    карточек не влезают — потолок по числу снижен и добавлен потолок по байтам.
 */

jest.mock('../app/user_id_policy', () => ({
  clearArenaAuthUidCache: jest.fn(),
  getAuthUserId: jest.fn(() => null),
  getCanonicalUserId: jest.fn(async () => 'stable-a'),
}));

// eslint-disable-next-line import/first
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
// eslint-disable-next-line import/first
import {
  readOwnAccountSwitchBackupValue,
  saveAccountSwitchEmergencyBackup,
  wipeLocalAccountData,
} from '../app/cloud_sync';
// eslint-disable-next-line import/first
import {
  FLASHCARD_FUTURE_KEPT_STASH_KEY,
  FLASHCARD_FUTURE_KEPT_STASH_MAX_BYTES,
  FLASHCARD_FUTURE_KEPT_STASH_MAX_ENTRIES,
  applyFutureKeptStashAfterReturn,
  stashForceFutureKeptLocalVersions,
  type FutureKeptLocalGroup,
} from '../app/flashcards_future_kept_stash';

const OWNER = 'stable-a';
const OTHER = 'stable-other';
const KEY = FLASHCARD_FUTURE_KEPT_STASH_KEY;
const DAY = 24 * 60 * 60 * 1000;
const T = 1_800_000_000_000;
const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

const group = (ids: string[], filler = ''): FutureKeptLocalGroup => ({
  key: 'flashcards_v1',
  target: 'en',
  versions: ids.map((id) => ({
    local: { id, en: `phrase ${id}`, ru: `моё ${id}${filler}`, uk: 'x', addedAt: T - DAY, updatedAt: T - DAY },
    remote: { id, en: `phrase ${id}`, ru: 'облако', uk: 'x', addedAt: T - DAY, updatedAt: T + 5 * DAY },
  })),
});

let clock: jest.SpyInstance;
let logSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
beforeEach(() => {
  storage.__reset?.();
  __resetAccountGenerationForTests();
  beginAccountGeneration(OWNER);
  clock = jest.spyOn(Date, 'now').mockReturnValue(T);
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  clock.mockRestore();
  logSpy.mockRestore();
  warnSpy.mockRestore();
});
const lines = () => [...logSpy.mock.calls, ...warnSpy.mock.calls].map((call) => String(call[0]));
const stashLines = () => lines().filter((line) => line.startsWith('[FLASHCARD-FUTURE-STASH]'));

describe('S1e-2 п.1 — readOwnAccountSwitchBackupValue: чужой владелец в корне копии', () => {
  test('v2: корень чужого владельца → null, причина в логе; свой → значение', async () => {
    const root = (stableId: string) => JSON.stringify({
      version: 2, createdAt: T, reason: 'test', stableId, pairs: [[KEY, '{"v":1,"entries":[]}']],
    });
    await expect(readOwnAccountSwitchBackupValue(root(OTHER), OWNER, KEY)).resolves.toBeNull();
    expect(lines().some((line) => line.includes('backup carry_skipped') && line.includes('other_owner'))).toBe(true);
    await expect(readOwnAccountSwitchBackupValue(root(OWNER), OWNER, KEY)).resolves.toBe('{"v":1,"entries":[]}');
  });

  test('v3: корень чужого владельца → null даже если страница подделана под нашего', async () => {
    const backupId = 'abc-123';
    await AsyncStorage.setItem(`account_switch_emergency_backup_page_v1:${backupId}:0`, JSON.stringify({
      backupId, stableId: OWNER, pairs: [[KEY, 'stolen']],
    }));
    const root = JSON.stringify({ version: 3, backupId, stableId: OTHER, pageCount: 1 });
    await expect(readOwnAccountSwitchBackupValue(root, OWNER, KEY)).resolves.toBeNull();
  });
});

describe('S1e-2 п.2 — стирание непустого ключа, не попавшего в копию', () => {
  test('копии нет → future_kept_stash_wiped count=N (только число)', async () => {
    await stashForceFutureKeptLocalVersions(OWNER, [group(['secret-1', 'secret-2'])]);
    await wipeLocalAccountData();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(stashLines()).toContain('[FLASHCARD-FUTURE-STASH] future_kept_stash_wiped count=2');
    for (const line of stashLines()) expect(line).not.toContain('secret-');
  });

  test('ключ лежит в аварийной копии владельца → стирание без тревоги', async () => {
    await stashForceFutureKeptLocalVersions(OWNER, [group(['secret-1'])]);
    await expect(saveAccountSwitchEmergencyBackup('final_account_snapshot_before_switch', OWNER)).resolves.toBe(true);
    await wipeLocalAccountData();
    expect(stashLines().some((line) => line.includes('future_kept_stash_wiped'))).toBe(false);
  });

  test('ключа нет → ничего не пишется', async () => {
    await wipeLocalAccountData();
    expect(stashLines().some((line) => line.includes('future_kept_stash_wiped'))).toBe(false);
  });
});

describe('S1e-2 п.3 — чужие записи старше 30 дней чистятся при применении', () => {
  test('нет своих: старая чужая удаляется, свежая чужая остаётся', async () => {
    clock.mockReturnValue(T - 31 * DAY);
    await stashForceFutureKeptLocalVersions(OTHER, [group(['old'])]);
    clock.mockReturnValue(T - 2 * DAY);
    await stashForceFutureKeptLocalVersions(OTHER, [group(['fresh'])]);
    clock.mockReturnValue(T);

    const result = await applyFutureKeptStashAfterReturn(OWNER);

    expect(result).toMatchObject({ status: 'no_own_entries', replaced: 0, kept: 1 });
    const left = JSON.parse(String(await AsyncStorage.getItem(KEY))) as { entries: Array<{ id: string }> };
    expect(left.entries.map((entry) => entry.id)).toEqual(['fresh']);
    expect(stashLines()).toContain('[FLASHCARD-FUTURE-STASH] apply foreign_expired dropped=1');
  });

  test('все чужие старые → ключ удаляется целиком', async () => {
    clock.mockReturnValue(T - 40 * DAY);
    await stashForceFutureKeptLocalVersions(OTHER, [group(['old-1', 'old-2'])]);
    clock.mockReturnValue(T);

    const result = await applyFutureKeptStashAfterReturn(OWNER);

    expect(result).toMatchObject({ status: 'no_own_entries', kept: 0 });
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(stashLines()).toContain('[FLASHCARD-FUTURE-STASH] apply foreign_expired dropped=2');
  });

  test('свои записи старше 30 дней НЕ чистятся этим правилом', async () => {
    clock.mockReturnValue(T - 40 * DAY);
    await stashForceFutureKeptLocalVersions(OWNER, [group(['mine'])]);
    clock.mockReturnValue(T);
    const replace = jest.fn(async () => -1);

    const result = await applyFutureKeptStashAfterReturn(OWNER, { replace });

    expect(replace).toHaveBeenCalledTimes(1);
    expect(result.kept).toBe(1);
    expect(stashLines().some((line) => line.includes('foreign_expired'))).toBe(false);
  });
});

describe('S1e-2 п.4 — значение ключа помещается в страницу аварийной копии', () => {
  test('1000 крупных карточек: значение урезано по байтам, копия записывается, новые сохранены', async () => {
    // ~2.5 КБ кириллицы на карточку (объяснения/примеры на трёх языках) — ×1000 ≈ 2.5 МБ.
    const filler = 'щ'.repeat(1200);
    const ids = Array.from({ length: 1000 }, (_, index) => `card-${String(index).padStart(4, '0')}`);
    for (let index = 0; index < ids.length; index += 100) {
      clock.mockReturnValue(T + index);
      await stashForceFutureKeptLocalVersions(OWNER, [group(ids.slice(index, index + 100), filler)]);
    }
    const raw = String(await AsyncStorage.getItem(KEY));
    expect(Buffer.byteLength(raw, 'utf8')).toBeLessThanOrEqual(FLASHCARD_FUTURE_KEPT_STASH_MAX_BYTES);
    expect(FLASHCARD_FUTURE_KEPT_STASH_MAX_BYTES).toBeLessThan(512 * 1024 - 4096);
    const entries = (JSON.parse(raw) as { entries: Array<{ id: string }> }).entries;
    expect(entries.length).toBeLessThanOrEqual(FLASHCARD_FUTURE_KEPT_STASH_MAX_ENTRIES);
    expect(entries.length).toBeGreaterThan(0);
    // Остаются самые свежие.
    expect(entries[entries.length - 1].id).toBe('card-0999');
    expect(stashLines().some((line) => line.includes('cap_reached') && line.includes('reason=bytes'))).toBe(true);

    await expect(saveAccountSwitchEmergencyBackup('final_account_snapshot_before_switch', OWNER)).resolves.toBe(true);
  });

  test('потолок по числу не больше 300', () => {
    expect(FLASHCARD_FUTURE_KEPT_STASH_MAX_ENTRIES).toBeLessThanOrEqual(300);
  });
});
