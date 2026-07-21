import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyRemoteConfigSnapshot,
  __resetRemoteFlagsForTest,
} from '../app/remote_flags';

jest.mock('../app/firestore_leagues', () => ({
  getOrCreateLeagueGroup: jest.fn(async () => null),
  updateMyGroupPoints: jest.fn(async () => undefined),
}));

jest.mock('../app/hall_of_fame_utils', () => ({
  loadWeekLeaderboard: jest.fn(async () => []),
  getLastWeekFinalPoints: jest.fn(async () => null),
}));

import {
  calculateResult,
  checkLeagueOnAppOpen,
  clearPendingResult,
  CLUBS,
  CLUB_DESC_PLANNED,
  clubDescForLang,
  CLUB_NAME_PLANNED,
  clubTierShortName,
  getLeagueResultSignature,
  getWeekId,
  loadPendingResult,
  markLeagueResultShown,
  tryAcquireLeagueResultModal,
  __resetLeagueResultSessionGuardForTests,
  type GroupMember,
  type LeagueState,
} from '../app/league_engine';

const makeGroup = (myPoints: number): GroupMember[] => [
  { uid: 'u1', name: 'Ava', points: 990, isMe: false },
  { uid: 'u2', name: 'Mia', points: 870, isMe: false },
  { uid: 'u3', name: 'Leo', points: 760, isMe: false },
  { uid: 'u4', name: 'Noah', points: 640, isMe: false },
  { uid: 'u5', name: 'Eli', points: 520, isMe: false },
  { uid: 'u6', name: 'Zoe', points: 410, isMe: false },
  { uid: 'u7', name: 'Ivy', points: 300, isMe: false },
  { uid: 'u8', name: 'Max', points: 180, isMe: false },
  { uid: 'u9', name: 'Sol', points: 80, isMe: false },
  { uid: 'me', name: 'QA Monday', points: myPoints, isMe: true },
].sort((a, b) => b.points - a.points);

const makeGroupWithMyRank = (total: number, myRank: number): { group: GroupMember[]; myPoints: number } => {
  const myPoints = 1000;
  const group = Array.from({ length: total }, (_, index): GroupMember => {
    const place = index + 1;
    if (place === myRank) {
      return { uid: 'me', name: 'QA Monday', points: myPoints, isMe: true };
    }
    const distance = Math.abs(place - myRank);
    const points = place < myRank
      ? myPoints + (distance + 1) * 100
      : myPoints - distance * 100;
    return { uid: `u${place}`, name: `Bot ${place}`, points, isMe: false };
  });
  return { group: group.sort((a, b) => b.points - a.points), myPoints };
};

const saveState = async (state: LeagueState) => {
  await AsyncStorage.setItem('league_state_v3', JSON.stringify(state));
};

describe('league locale coverage', () => {
  it('serves planned league descriptions without RU/UK/ES fallback', () => {
    const plannedLocales = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

    expect(Object.keys(CLUB_DESC_PLANNED)).toHaveLength(CLUBS.length);
    for (const club of CLUBS) {
      for (const locale of plannedLocales) {
        const direct = CLUB_DESC_PLANNED[club.id]?.[locale];
        const runtime = clubDescForLang(club, locale);

        expect(direct).toBeTruthy();
        expect(runtime).toBe(direct);
        expect(runtime).not.toBe(club.descRU);
        expect(runtime).not.toBe(club.descUK);
        expect(/[А-Яа-яЁёІіЇїЄєҐґ]/.test(runtime)).toBe(false);
      }
    }
  });

  it('serves planned league tier names without RU/UK/ES fallback', () => {
    const plannedLocales = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

    expect(Object.keys(CLUB_NAME_PLANNED)).toHaveLength(CLUBS.length);
    for (const club of CLUBS) {
      for (const locale of plannedLocales) {
        const direct = CLUB_NAME_PLANNED[club.id]?.[locale];
        const runtime = clubTierShortName(club, locale);

        expect(direct).toBeTruthy();
        expect(runtime).toBe(direct);
        expect(runtime).not.toBe(club.nameRU);
        expect(runtime).not.toBe(club.nameUK);
        expect(runtime).not.toBe(club.nameES);
        expect(/[А-Яа-яЁёІіЇїЄєҐґ]/.test(runtime)).toBe(false);
      }
    }
  });

  it('keeps league engine planned runtime away from legacy language branches', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'league_engine.ts'), 'utf8');
    const legacyRuntimePattern = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

    expect(source).not.toMatch(legacyRuntimePattern);
  });
});

describe('league weekly rollover', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    __resetRemoteFlagsForTest();
    __resetLeagueResultSessionGuardForTests();
    jest.clearAllMocks();
  });

  it('promotes the top result zone with a real group size', () => {
    const result = calculateResult({
      leagueId: 0,
      weekId: '2026-W19',
      group: makeGroup(1200),
    }, 1200);

    expect(result).toMatchObject({
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 1,
      totalInGroup: 10,
      promoted: true,
      demoted: false,
    });
  });

  it('uses the Monday UTC boundary even when local time has already crossed Monday', () => {
    expect(getWeekId(new Date('2026-07-05T23:30:00.000Z'))).toBe('2026-W27');
    expect(getWeekId(new Date('2026-07-06T00:00:00.000Z'))).toBe('2026-W28');
  });

  it('keeps fifth place in a sixteen-person group because top zone is three', () => {
    const { group, myPoints } = makeGroupWithMyRank(16, 5);
    const result = calculateResult({
      leagueId: 0,
      weekId: '2026-W19',
      group,
    }, myPoints);

    expect(result).toMatchObject({
      prevLeagueId: 0,
      newLeagueId: 0,
      myRank: 5,
      totalInGroup: 16,
      promoted: false,
      demoted: false,
    });
  });

  it('keeps the current percentage promotion logic when XP promotion mode is off', () => {
    applyRemoteConfigSnapshot({
      bools: { league_xp_promotion_enabled: false },
      numbers: { league_xp_promotion_threshold: 1000 },
    });
    const { group, myPoints } = makeGroupWithMyRank(16, 5);

    const result = calculateResult({
      leagueId: 0,
      weekId: '2026-W19',
      group,
    }, myPoints);

    expect(result).toMatchObject({
      prevLeagueId: 0,
      newLeagueId: 0,
      myRank: 5,
      totalInGroup: 16,
      promoted: false,
      demoted: false,
    });
  });

  it('promotes any player with at least the remote XP threshold when XP promotion mode is on', () => {
    applyRemoteConfigSnapshot({
      bools: { league_xp_promotion_enabled: true },
      numbers: { league_xp_promotion_threshold: 1000 },
    });
    const { group } = makeGroupWithMyRank(16, 5);

    const result = calculateResult({
      leagueId: 0,
      weekId: '2026-W19',
      group,
    }, 1000);

    expect(result).toMatchObject({
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 5,
      totalInGroup: 16,
      promoted: true,
      demoted: false,
    });
  });

  it('keeps players below the remote XP threshold in the same league when XP promotion mode is on', () => {
    applyRemoteConfigSnapshot({
      bools: { league_xp_promotion_enabled: true },
      numbers: { league_xp_promotion_threshold: 1000 },
    });
    const { group } = makeGroupWithMyRank(16, 1);

    const result = calculateResult({
      leagueId: 2,
      weekId: '2026-W19',
      group,
    }, 999);

    expect(result).toMatchObject({
      prevLeagueId: 2,
      newLeagueId: 2,
      myRank: 1,
      totalInGroup: 16,
      promoted: false,
      demoted: false,
    });
  });

  it('disables demotion while XP promotion mode is on', () => {
    applyRemoteConfigSnapshot({
      bools: { league_xp_promotion_enabled: true },
      numbers: { league_xp_promotion_threshold: 1000 },
    });
    const { group } = makeGroupWithMyRank(16, 16);

    const result = calculateResult({
      leagueId: 2,
      weekId: '2026-W19',
      group,
    }, 999);

    expect(result).toMatchObject({
      prevLeagueId: 2,
      newLeagueId: 2,
      myRank: 16,
      totalInGroup: 16,
      promoted: false,
      demoted: false,
    });
  });

  it('repairs a cached group where the current row lost isMe before rollover', async () => {
    const corrupted = makeGroup(1200).map(m => (
      m.name === 'QA Monday' ? { ...m, isMe: false } : m
    ));
    await saveState({
      leagueId: 0,
      weekId: '2026-W19',
      group: corrupted,
    });

    const opened = await checkLeagueOnAppOpen('QA Monday', 0);

    expect(opened.needShowResult).toBe(true);
    expect(opened.result).toMatchObject({
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 1,
      totalInGroup: 10,
      promoted: true,
    });
    expect(opened.result?.group.some(m => m.name === 'QA Monday' && m.isMe)).toBe(true);
  });

  it('repairs an already saved pending result structurally without changing its outcome', async () => {
    await AsyncStorage.setItem('user_name', 'QA Monday');
    const pending = {
      prevLeagueId: 0,
      newLeagueId: 0,
      myRank: 0,
      totalInGroup: 10,
      promoted: false,
      demoted: false,
      group: makeGroup(1200).map(m => (
        m.name === 'QA Monday' ? { ...m, isMe: false } : m
      )),
    };
    await AsyncStorage.setItem('league_result_pending', JSON.stringify(pending));

    const repaired = await loadPendingResult();
    const savedPending = JSON.parse(await AsyncStorage.getItem('league_result_pending') || '{}');

    // Ремонт только структурный: isMe восстановлен, но исход (rank 0, лига, флаги)
    // остаётся ровно тем, что был вычислен на ролловере — не пересчитывается.
    expect(repaired).toMatchObject({
      prevLeagueId: 0,
      newLeagueId: 0,
      myRank: 0,
      totalInGroup: 10,
      promoted: false,
    });
    expect(savedPending.myRank).toBe(0);
    expect(savedPending.group.some((m: GroupMember) => m.name === 'QA Monday' && m.isMe)).toBe(true);
  });

  it('preserves the outcome of an already saved pending result (structural repair only)', async () => {
    const { group } = makeGroupWithMyRank(16, 5);
    const stalePending = {
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 5,
      totalInGroup: 16,
      promoted: true,
      demoted: false,
      group,
    };
    await AsyncStorage.setItem('league_result_pending', JSON.stringify(stalePending));
    await AsyncStorage.setItem('league_state_v3', JSON.stringify({ leagueId: 0, weekId: '2026-W20', group }));

    const repaired = await loadPendingResult();
    const savedPending = JSON.parse(await AsyncStorage.getItem('league_result_pending') || '{}');
    const savedState = JSON.parse(await AsyncStorage.getItem('league_state_v3') || '{}');

    // Поля исхода не пересчитываются: pending показывает ровно тот результат,
    // что был сохранён на ролловере, даже если зона/состав группы «изменились» бы.
    expect(repaired).toMatchObject({
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 5,
      totalInGroup: 16,
      promoted: true,
      demoted: false,
    });
    expect(savedPending.promoted).toBe(true);
    expect(savedPending.newLeagueId).toBe(1);
    expect(savedState.leagueId).toBe(1);
  });

  it('demotes the bottom result zone and uses stored weekly points from league state', async () => {
    await saveState({
      leagueId: 2,
      weekId: '2026-W19',
      group: makeGroup(20),
    });

    const opened = await checkLeagueOnAppOpen('QA Monday', 9999);
    const savedPending = JSON.parse(await AsyncStorage.getItem('league_result_pending') || '{}');
    const savedState = JSON.parse(await AsyncStorage.getItem('league_state_v3') || '{}');

    expect(opened.needShowResult).toBe(true);
    expect(opened.result).toMatchObject({
      prevLeagueId: 2,
      newLeagueId: 1,
      myRank: 10,
      totalInGroup: 10,
      promoted: false,
      demoted: true,
    });
    expect(savedPending).toMatchObject(opened.result!);
    expect(savedState).toMatchObject({
      leagueId: 1,
      weekId: getWeekId(),
    });
  });

  it('keeps middle rank in the same league', () => {
    const result = calculateResult({
      leagueId: 3,
      weekId: '2026-W19',
      group: makeGroup(520),
    }, 520);

    expect(result).toMatchObject({
      prevLeagueId: 3,
      newLeagueId: 3,
      myRank: 6,
      totalInGroup: 10,
      promoted: false,
      demoted: false,
    });
  });

  it('shows an existing pending result before doing any new rollover math', async () => {
    const pending = {
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 1,
      totalInGroup: 10,
      promoted: true,
      demoted: false,
      group: makeGroup(1200),
    };
    await AsyncStorage.setItem('league_result_pending', JSON.stringify(pending));

    const opened = await checkLeagueOnAppOpen('QA Monday', 0);

    expect(opened.needShowResult).toBe(true);
    expect(opened.result).toEqual(pending);
    expect(opened.state).toMatchObject({
      leagueId: 1,
      weekId: getWeekId(),
    });
  });

  it('does not regenerate the same modal after pending result is cleared', async () => {
    await saveState({
      leagueId: 0,
      weekId: '2026-W19',
      group: makeGroup(1200),
    });

    const firstOpen = await checkLeagueOnAppOpen('QA Monday', 1200);
    expect(firstOpen.needShowResult).toBe(true);

    await clearPendingResult();
    const secondOpen = await checkLeagueOnAppOpen('QA Monday', 0);

    expect(secondOpen.needShowResult).toBe(false);
    expect(await AsyncStorage.getItem('league_result_pending')).toBeNull();
    expect(await AsyncStorage.getItem('league_result_consumed_sig')).toBe(getLeagueResultSignature(firstOpen.result!));
    expect(secondOpen.state).toMatchObject({
      leagueId: 1,
      weekId: getWeekId(),
    });
  });

  it('does not show a pending result whose signature is already consumed_sig (cloud restore scenario)', async () => {
    await saveState({
      leagueId: 0,
      weekId: '2026-W19',
      group: makeGroup(1200),
    });

    // Симулируем: результат уже был показан и подтверждён (markLeagueResultShown записал
    // consumed_sig), но pending всё ещё лежит в сторе — например, cloud restore (cloud_sync.ts)
    // воскресил старую запись league_result_pending с другого устройства ПОСЛЕ того, как
    // consumed_sig уже был записан локально.
    const firstOpen = await checkLeagueOnAppOpen('QA Monday', 1200);
    expect(firstOpen.needShowResult).toBe(true);
    await markLeagueResultShown(firstOpen.result!);

    // pending остаётся в сторе (симулируем воскрешение записи облаком) — но с тем же
    // содержимым, что уже помечено consumed.
    await AsyncStorage.setItem('league_result_pending', JSON.stringify(firstOpen.result));

    const resurrected = await checkLeagueOnAppOpen('QA Monday', 1200);
    expect(resurrected.needShowResult).toBe(false);
    expect(resurrected.result).toBeNull();
    expect(await AsyncStorage.getItem('league_result_pending')).toBeNull();

    // Тот же сценарий, но через путь loadPendingResult (club_screen.tsx читает так).
    await AsyncStorage.setItem('league_result_pending', JSON.stringify(firstOpen.result));
    const viaLoadPending = await loadPendingResult();
    expect(viaLoadPending).toBeNull();
    expect(await AsyncStorage.getItem('league_result_pending')).toBeNull();
  });

  it('acquires the module-level session guard once per signature — second host gets false', () => {
    const result = calculateResult({
      leagueId: 0,
      weekId: '2026-W19',
      group: makeGroup(1200),
    }, 1200);
    const sig = getLeagueResultSignature(result);

    // Первый хост (например home.tsx) бронирует показ.
    expect(tryAcquireLeagueResultModal(sig)).toBe(true);
    // Второй хост (club_screen.tsx) с той же сигнатурой — уже забронировано, не показывает.
    expect(tryAcquireLeagueResultModal(sig)).toBe(false);
    // Повторный вызов тем же (первым) хостом — тоже false, идемпотентно.
    expect(tryAcquireLeagueResultModal(sig)).toBe(false);

    // Другая сигнатура (другой результат/другая неделя) — можно бронировать заново.
    const otherSig = getLeagueResultSignature({ ...result, myRank: result.myRank + 1 });
    expect(tryAcquireLeagueResultModal(otherSig)).toBe(true);
  });
});
