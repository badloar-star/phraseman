import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  shouldShowReferralAccessEnded,
  markReferralAccessEndedSeen,
} from '../app/referral_access_ended_tracker';

jest.mock('@react-native-async-storage/async-storage');

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

beforeEach(() => {
  // @ts-expect-error — мок предоставляет __reset
  AsyncStorage.__reset?.();
});

describe('referral_access_ended_tracker — «показать модал ровно один раз на окно»', () => {
  it('активное окно: ничего не показываем, запоминаем конец', async () => {
    const until = NOW + 3 * DAY;
    expect(await shouldShowReferralAccessEnded(until, NOW)).toBe(false);
    // конец окна сохранился для последующего сравнения
    expect(await AsyncStorage.getItem('referral_access_last_until_ms_v1')).toBe(String(until));
  });

  it('никогда не было окна: ничего не показываем', async () => {
    expect(await shouldShowReferralAccessEnded(0, NOW)).toBe(false);
  });

  it('окно только что закрылось → показываем один раз', async () => {
    const until = NOW - 1; // только что истекло
    // эмулируем, что окно ранее было активно (запомнили его конец)
    await AsyncStorage.setItem('referral_access_last_until_ms_v1', String(until));
    expect(await shouldShowReferralAccessEnded(until, NOW)).toBe(true);
  });

  it('после markSeen для того же окна — больше не показываем', async () => {
    const until = NOW - 1;
    await AsyncStorage.setItem('referral_access_last_until_ms_v1', String(until));
    expect(await shouldShowReferralAccessEnded(until, NOW)).toBe(true);

    await markReferralAccessEndedSeen(until);
    expect(await shouldShowReferralAccessEnded(until, NOW)).toBe(false);
  });

  it('полный жизненный цикл: активно → закрылось (показали) → новое окно → снова закрылось (показали)', async () => {
    // 1. первое окно активно
    const until1 = NOW + 2 * DAY;
    expect(await shouldShowReferralAccessEnded(until1, NOW)).toBe(false);

    // 2. первое окно закрылось — показываем, помечаем виденным
    const after1 = until1 + 1;
    expect(await shouldShowReferralAccessEnded(until1, after1)).toBe(true);
    await markReferralAccessEndedSeen(until1);
    expect(await shouldShowReferralAccessEnded(until1, after1)).toBe(false);

    // 3. пользователь открыл новое окно (позвал ещё друга) — активно
    const until2 = after1 + 7 * DAY;
    expect(await shouldShowReferralAccessEnded(until2, after1)).toBe(false);

    // 4. второе окно закрылось — снова показываем (это другое окно)
    const after2 = until2 + 1;
    expect(await shouldShowReferralAccessEnded(until2, after2)).toBe(true);
  });

  it('markSeen(0) использует последнее известное окно из стораджа', async () => {
    const until = NOW - 1;
    await AsyncStorage.setItem('referral_access_last_until_ms_v1', String(until));
    expect(await shouldShowReferralAccessEnded(until, NOW)).toBe(true);

    // UI вызывает markSeen без явного значения (0) — должно взять lastUntil
    await markReferralAccessEndedSeen(0);
    expect(await shouldShowReferralAccessEnded(until, NOW)).toBe(false);
  });

  it('until=0, но окно когда-то было и истекло → показываем по lastUntil', async () => {
    const lastUntil = NOW - 5 * DAY;
    await AsyncStorage.setItem('referral_access_last_until_ms_v1', String(lastUntil));
    // на клиенте vip_until мог обнулиться, но окно фактически было
    expect(await shouldShowReferralAccessEnded(0, NOW)).toBe(true);
  });
});
