// Weekly Boons — детектор «Идеальной недели» (чистые функции + claim-гард).
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isWeekComplete,
  parseWeekDone,
  PERFECT_WEEK_REWARD,
  PERFECT_WEEK_ONBOARDING_DAY_KEY,
  checkPerfectWeekEligible,
  decidePerfectWeekEligible,
  localDayKey,
  markPerfectWeekClaimed,
} from '../app/boons/perfect_week';

// Модификатор perfect_week должен числиться активным, иначе eligible сразу false.
// (jest.mock поднимается выше импортов — порядок строк здесь роли не играет.)
jest.mock('../app/boons/boon_engine', () => ({
  getTodaysBoons: () => ({ modifiers: ['perfect_week'] }),
}));

const FULL_WEEK = JSON.stringify(new Array(7).fill(true));
const WEEK_KEY = '2026-W25';
// Стабильные «дни» для проверки гейта «бонус только со 2-го дня».
const ONBOARDING_DAY_MS = Date.UTC(2026, 5, 22, 12, 0, 0); // день онбординга
const NEXT_DAY_MS = Date.UTC(2026, 5, 23, 9, 0, 0); // следующий календарный день

async function seedFullUnclaimedWeek(): Promise<void> {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('week_days_done', FULL_WEEK);
  await AsyncStorage.setItem('week_days_week_key', WEEK_KEY);
  // Недельный сундук показывается только ПОСЛЕ онбординга (см. гейт ниже).
  await AsyncStorage.setItem('onboarding_done', '1');
  // По требованию бонус — НЕ в день онбординга. Штампуем день онбординга ВЧЕРАШНИМ,
  // чтобы «сегодня» (NEXT_DAY_MS) уже было разрешённым 2-м днём.
  await AsyncStorage.setItem(PERFECT_WEEK_ONBOARDING_DAY_KEY, localDayKey(ONBOARDING_DAY_MS));
}

describe('isWeekComplete', () => {
  it('true только когда все 7 дней true', () => {
    expect(isWeekComplete([true, true, true, true, true, true, true])).toBe(true);
  });
  it('false при любом незакрытом дне', () => {
    expect(isWeekComplete([true, true, true, true, true, true, false])).toBe(false);
  });
  it('false при неверной длине', () => {
    expect(isWeekComplete([true, true, true])).toBe(false);
    expect(isWeekComplete(null)).toBe(false);
    expect(isWeekComplete(undefined)).toBe(false);
  });
});

describe('parseWeekDone', () => {
  it('парсит валидный массив из 7 bool', () => {
    expect(parseWeekDone(JSON.stringify([true, false, true, true, false, true, true]))).toEqual([
      true, false, true, true, false, true, true,
    ]);
  });
  it('null на мусоре/неверной длине', () => {
    expect(parseWeekDone(null)).toBeNull();
    expect(parseWeekDone('not json')).toBeNull();
    expect(parseWeekDone(JSON.stringify([true, true]))).toBeNull();
  });
  it('коэрсит не-true значения в false', () => {
    expect(parseWeekDone(JSON.stringify([1, 0, 'x', null, true, false, true]))).toEqual([
      false, false, false, false, true, false, true,
    ]);
  });
});

describe('PERFECT_WEEK_REWARD', () => {
  it('§7: монетный приз обнулён (монеты только покупаются)', () => {
    expect(PERFECT_WEEK_REWARD.shards).toBe(0);
  });
});

// Контракт надёжности (фикс «сундук уже полученной недели всплывает снова»):
// как только неделя помечена забранной, повторный показ невозможен.
describe('checkPerfectWeekEligible — claim-гард', () => {
  it('eligible=true для полной незаявленной недели (на 2-й день после онбординга)', async () => {
    await seedFullUnclaimedWeek();
    expect(await checkPerfectWeekEligible(NEXT_DAY_MS)).toBe(true);
  });

  it('eligible=false СРАЗУ после markPerfectWeekClaimed (нет повторного показа той же недели)', async () => {
    await seedFullUnclaimedWeek();
    await markPerfectWeekClaimed();
    expect(await checkPerfectWeekEligible(NEXT_DAY_MS)).toBe(false);
  });

  it('claim фиксирует именно текущую неделю (другая неделя снова eligible)', async () => {
    await seedFullUnclaimedWeek();
    await markPerfectWeekClaimed();
    // Наступила новая неделя — массив снова полный, claim прошлой недели не блокирует.
    await AsyncStorage.setItem('week_days_week_key', '2026-W26');
    await AsyncStorage.setItem('week_days_done', FULL_WEEK);
    expect(await checkPerfectWeekEligible(NEXT_DAY_MS)).toBe(true);
  });

  it('eligible=false для неполной недели даже без claim', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('week_days_done', JSON.stringify([true, true, true, true, true, true, false]));
    await AsyncStorage.setItem('week_days_week_key', WEEK_KEY);
    await AsyncStorage.setItem('onboarding_done', '1');
    await AsyncStorage.setItem(PERFECT_WEEK_ONBOARDING_DAY_KEY, localDayKey(ONBOARDING_DAY_MS));
    expect(await checkPerfectWeekEligible(NEXT_DAY_MS)).toBe(false);
  });
});

// Гейт онбординга (фикс «золотой недельный сундук всплыл на первом экране онбординга
// после сброса данных»): сброс удаляет claim-маркер, но мог оставить полную неделю от
// прошлого аккаунта. Пока онбординг не пройден — сундук не показываем ни при каких
// остатках в хранилище.
describe('checkPerfectWeekEligible — гейт онбординга', () => {
  it('eligible=false если onboarding_done отсутствует (полная незаявленная неделя в остатках)', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('week_days_done', FULL_WEEK);
    await AsyncStorage.setItem('week_days_week_key', WEEK_KEY);
    // onboarding_done НЕ выставлен — имитируем первый экран онбординга после сброса.
    expect(await checkPerfectWeekEligible()).toBe(false);
  });

  it('eligible=true после онбординга на СЛЕДУЮЩИЙ день (штамп онбординга = вчера)', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('week_days_done', FULL_WEEK);
    await AsyncStorage.setItem('week_days_week_key', WEEK_KEY);
    await AsyncStorage.setItem('onboarding_done', '1');
    await AsyncStorage.setItem(PERFECT_WEEK_ONBOARDING_DAY_KEY, localDayKey(ONBOARDING_DAY_MS));
    expect(await checkPerfectWeekEligible(NEXT_DAY_MS)).toBe(true);
  });

  it('eligible=false при onboarding_done=0/false/пусто', async () => {
    for (const val of ['0', 'false', '']) {
      await AsyncStorage.clear();
      await AsyncStorage.setItem('week_days_done', FULL_WEEK);
      await AsyncStorage.setItem('week_days_week_key', WEEK_KEY);
      await AsyncStorage.setItem('onboarding_done', val);
      expect(await checkPerfectWeekEligible(NEXT_DAY_MS)).toBe(false);
    }
  });
});

// Главное требование: у НОВОГО юзера недельный бонус НЕ показывается в ДЕНЬ онбординга,
// только со 2-го календарного дня. В первый день — только компас → подарок 3 дня.
describe('checkPerfectWeekEligible — гейт «бонус только со 2-го дня»', () => {
  it('eligible=false в ДЕНЬ онбординга (полная неделя, но сегодня = день онбординга)', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('week_days_done', FULL_WEEK);
    await AsyncStorage.setItem('week_days_week_key', WEEK_KEY);
    await AsyncStorage.setItem('onboarding_done', '1');
    // Штампа ещё нет → первый вызов в день онбординга штампует СЕГОДНЯ и блокирует.
    expect(await checkPerfectWeekEligible(ONBOARDING_DAY_MS)).toBe(false);
    // Штамп должен записаться = сегодняшний день онбординга.
    expect(await AsyncStorage.getItem(PERFECT_WEEK_ONBOARDING_DAY_KEY)).toBe(localDayKey(ONBOARDING_DAY_MS));
  });

  it('eligible=true на СЛЕДУЮЩИЙ день после того, как штамп проставлен в день онбординга', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('week_days_done', FULL_WEEK);
    await AsyncStorage.setItem('week_days_week_key', WEEK_KEY);
    await AsyncStorage.setItem('onboarding_done', '1');
    // 1-й вызов в день онбординга → штамп + false.
    expect(await checkPerfectWeekEligible(ONBOARDING_DAY_MS)).toBe(false);
    // 2-й день → тот же штамп ≠ сегодня → true.
    expect(await checkPerfectWeekEligible(NEXT_DAY_MS)).toBe(true);
  });

  it('decidePerfectWeekEligible (чистая): тот же день = false, другой день = true', async () => {
    const base = {
      onboardingDoneRaw: '1',
      todayKey: '2026-06-22',
      weekKey: WEEK_KEY,
      claimedWeek: null,
      weekDoneRaw: FULL_WEEK,
    };
    expect(decidePerfectWeekEligible({ ...base, onboardingDayKey: '2026-06-22' })).toBe(false); // день онбординга
    expect(decidePerfectWeekEligible({ ...base, onboardingDayKey: '2026-06-21' })).toBe(true);  // 2-й день
    expect(decidePerfectWeekEligible({ ...base, onboardingDayKey: null })).toBe(true);           // штампа нет → не блокируем
    expect(decidePerfectWeekEligible({ ...base, onboardingDayKey: '2026-06-21', onboardingDoneRaw: null })).toBe(false); // онбординг не пройден
  });
});
