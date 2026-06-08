import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  shouldShowReferralAccessEnded,
  markReferralAccessEndedSeen,
  getTrackedReferralWindowEnd,
} from '../app/referral_access_ended_tracker';

jest.mock('@react-native-async-storage/async-storage');

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('referral_access_ended_tracker — «показать модал ровно один раз на окно»', () => {
  it('активное реферальное окно: не показываем, запоминаем конец стикки', async () => {
    const until = NOW + 3 * DAY;
    expect(await shouldShowReferralAccessEnded('referral', until, NOW)).toBe(false);
    expect(await getTrackedReferralWindowEnd()).toBe(until);
  });

  it('активное окно ДРУГОГО плана (admin): игнорируем, не запоминаем', async () => {
    const until = NOW + 3 * DAY;
    expect(await shouldShowReferralAccessEnded('admin_vip', until, NOW)).toBe(false);
    expect(await getTrackedReferralWindowEnd()).toBe(0);
  });

  it('никогда не было реферального окна: ничего не показываем', async () => {
    expect(await shouldShowReferralAccessEnded('', 0, NOW)).toBe(false);
  });

  it('КЛЮЧЕВОЙ ФИКС BUG1: окно истекло и vip_plan занулён cloud_sync → всё равно показываем', async () => {
    // 1. окно было активно и реферальным — запомнили стикки
    const until = NOW + 2 * DAY;
    await shouldShowReferralAccessEnded('referral', until, NOW);
    // 2. время прошло, cloud_sync занулил vip_plan='' и vip_until=0
    const afterEnd = until + 1;
    expect(await shouldShowReferralAccessEnded('', 0, afterEnd)).toBe(true);
  });

  it('после markSeen для того же окна — больше не показываем', async () => {
    const until = NOW + 2 * DAY;
    await shouldShowReferralAccessEnded('referral', until, NOW);
    const afterEnd = until + 1;
    expect(await shouldShowReferralAccessEnded('', 0, afterEnd)).toBe(true);

    const windowEnd = await getTrackedReferralWindowEnd();
    await markReferralAccessEndedSeen(windowEnd);
    expect(await shouldShowReferralAccessEnded('', 0, afterEnd)).toBe(false);
  });

  it('полный цикл: активно → истекло (показали, пометили) → новое окно → снова истекло (показали)', async () => {
    // 1. первое окно активно
    const until1 = NOW + 2 * DAY;
    expect(await shouldShowReferralAccessEnded('referral', until1, NOW)).toBe(false);

    // 2. первое окно истекло — показываем, помечаем виденным
    const after1 = until1 + 1;
    expect(await shouldShowReferralAccessEnded('', 0, after1)).toBe(true);
    await markReferralAccessEndedSeen(await getTrackedReferralWindowEnd());
    expect(await shouldShowReferralAccessEnded('', 0, after1)).toBe(false);

    // 3. пользователь открыл новое реферальное окно (позвал ещё друга)
    const until2 = after1 + 7 * DAY;
    expect(await shouldShowReferralAccessEnded('referral', until2, after1)).toBe(false);

    // 4. второе окно истекло — снова показываем (другой конец окна)
    const after2 = until2 + 1;
    expect(await shouldShowReferralAccessEnded('', 0, after2)).toBe(true);
  });

  it('Б BUG2: markSeen стейпит ИМЕННО показанное окно, новое окно не помечается заранее', async () => {
    // показали для окна1
    const until1 = NOW - 1; // уже истекло
    await AsyncStorage.setItem('referral_access_last_until_ms_v1', String(until1));
    expect(await shouldShowReferralAccessEnded('', 0, NOW)).toBe(true);
    const shown = await getTrackedReferralWindowEnd();
    expect(shown).toBe(until1);

    // помечаем именно это окно
    await markReferralAccessEndedSeen(shown);
    expect(await shouldShowReferralAccessEnded('', 0, NOW)).toBe(false);

    // новое активное окно НЕ должно быть предварительно помечено как виденное
    const until2 = NOW + 5 * DAY;
    await shouldShowReferralAccessEnded('referral', until2, NOW);
    const after2 = until2 + 1;
    expect(await shouldShowReferralAccessEnded('', 0, after2)).toBe(true);
  });

  it('boundary until===now → окно закрыто (consistent с premium gate > now)', async () => {
    await AsyncStorage.setItem('referral_access_last_until_ms_v1', String(NOW));
    // until===now: не активно (нужно > now), стикки в прошлом-или-равно → показываем
    expect(await shouldShowReferralAccessEnded('', 0, NOW)).toBe(true);
  });

  it('markSeen(0) — no-op, не стейпит ничего', async () => {
    const until = NOW - 1;
    await AsyncStorage.setItem('referral_access_last_until_ms_v1', String(until));
    expect(await shouldShowReferralAccessEnded('', 0, NOW)).toBe(true);
    await markReferralAccessEndedSeen(0); // невалидно — не должно глушить
    expect(await shouldShowReferralAccessEnded('', 0, NOW)).toBe(true);
  });
});
