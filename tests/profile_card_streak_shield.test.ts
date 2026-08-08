import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CARD_STREAK_SHIELD_COOLDOWN_DAYS,
  CARD_STREAK_SHIELD_MIN_LEVEL,
  CARD_STREAK_SHIELD_USED_AT_KEY,
  getCardStreakShieldStatus,
  tryConsumeCardStreakShield,
} from '../app/profile_card_streak_shield';

jest.mock('@react-native-async-storage/async-storage');

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
});

const TODAY = '2026-07-19';

const setLevel = (level: number) => {
  mockStorage['profile_card_level'] = String(level);
};

describe('getCardStreakShieldStatus — Фаза 3: «Защита цепочки» III+, 1 раз в 7 дней', () => {
  it('pins the contract constants', () => {
    expect(CARD_STREAK_SHIELD_MIN_LEVEL).toBe(3);
    expect(CARD_STREAK_SHIELD_COOLDOWN_DAYS).toBe(7);
    expect(CARD_STREAK_SHIELD_USED_AT_KEY).toBe('card_streak_shield_used_at');
  });

  it('is not eligible below level III even with a fresh shield', async () => {
    setLevel(2);
    const s = await getCardStreakShieldStatus(TODAY);
    expect(s).toEqual({ level: 2, eligible: false, usedToday: false, cooldownDaysLeft: 0 });
  });

  it('is eligible at level III when never used', async () => {
    setLevel(3);
    const s = await getCardStreakShieldStatus(TODAY);
    expect(s).toEqual({ level: 3, eligible: true, usedToday: false, cooldownDaysLeft: 0 });
  });

  it('is on cooldown with exact days left when used 3 days ago', async () => {
    setLevel(3);
    mockStorage[CARD_STREAK_SHIELD_USED_AT_KEY] = '2026-07-16';
    const s = await getCardStreakShieldStatus(TODAY);
    expect(s).toEqual({ level: 3, eligible: false, usedToday: false, cooldownDaysLeft: 4 });
  });

  it('becomes eligible again exactly 7 days after use', async () => {
    setLevel(5);
    mockStorage[CARD_STREAK_SHIELD_USED_AT_KEY] = '2026-07-12';
    const s = await getCardStreakShieldStatus(TODAY);
    expect(s).toEqual({ level: 5, eligible: true, usedToday: false, cooldownDaysLeft: 0 });
  });

  it('reports usedToday with a fresh 7-day cooldown after firing today', async () => {
    setLevel(4);
    mockStorage[CARD_STREAK_SHIELD_USED_AT_KEY] = TODAY;
    const s = await getCardStreakShieldStatus(TODAY);
    expect(s).toEqual({ level: 4, eligible: false, usedToday: true, cooldownDaysLeft: 7 });
  });
});

describe('tryConsumeCardStreakShield', () => {
  it('consumes once and writes the local day key', async () => {
    setLevel(3);
    await expect(tryConsumeCardStreakShield(TODAY)).resolves.toBe(true);
    expect(mockStorage[CARD_STREAK_SHIELD_USED_AT_KEY]).toBe(TODAY);
  });

  it('is idempotent within the same day — a second call cannot save the streak twice', async () => {
    setLevel(3);
    await expect(tryConsumeCardStreakShield(TODAY)).resolves.toBe(true);
    await expect(tryConsumeCardStreakShield(TODAY)).resolves.toBe(false);
  });

  it('refuses below level III without writing anything', async () => {
    setLevel(2);
    await expect(tryConsumeCardStreakShield(TODAY)).resolves.toBe(false);
    expect(mockStorage[CARD_STREAK_SHIELD_USED_AT_KEY]).toBeUndefined();
  });

  it('refuses during cooldown', async () => {
    setLevel(3);
    mockStorage[CARD_STREAK_SHIELD_USED_AT_KEY] = '2026-07-18';
    await expect(tryConsumeCardStreakShield(TODAY)).resolves.toBe(false);
  });
});

describe('hall_of_fame_utils — ветка карточного щита (source contract)', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', 'hall_of_fame_utils.ts'), 'utf8');

  it('sits strictly after wasRepairedToday and before the friend chain_shield branch', () => {
    const repairedIdx = source.indexOf('await wasRepairedToday()');
    const cardShieldIdx = source.indexOf('tryConsumeCardStreakShield(today)');
    const chainShieldIdx = source.indexOf("await AsyncStorage.getItem('chain_shield')");
    expect(repairedIdx).toBeGreaterThan(-1);
    expect(cardShieldIdx).toBeGreaterThan(repairedIdx);
    expect(chainShieldIdx).toBeGreaterThan(cardShieldIdx);
  });

  it('marks the week with a freeze marker exactly like the manual freeze branch', () => {
    expect(
      source.match(/recordStreakWeekMarker\(addDaysToDateKey\(lastActive, 1\), 'freeze'\)/g),
    ).toHaveLength(2);
  });

  it('emits the reward action_toast with the card-shield message on all 3 contract languages', () => {
    expect(source).toContain('🛡 Карточка спасла цепочку ${streak} дн.');
    expect(source).toContain('🛡 Картка врятувала ланцюжок ${streak} дн.');
    expect(source).toContain('🛡 La tarjeta salvó tu racha de ${streak} días');
  });

  it('does not emit the manual-freeze achievement from the card branch', () => {
    expect(source).not.toContain("{ type: 'streak_freeze_used'");
  });

  it('suppresses the loss warning/paywall in checkStreakLossPending when the shield already fired today', () => {
    const fnStart = source.indexOf('export const checkStreakLossPending');
    const guardIdx = source.indexOf('cardShield.usedToday');
    expect(guardIdx).toBeGreaterThan(fnStart);
    expect(source.slice(fnStart)).toContain('if (cardShield.usedToday) return { willLose: false, streakBefore: streak };');
  });
});

describe('PlayerProfileModal — строка щита в панели разблокировок (source contract)', () => {
  const modal = fs.readFileSync(path.join(process.cwd(), 'components', 'PlayerProfileModal.tsx'), 'utf8');

  it('shows the shield row only for own card at level III+', () => {
    expect(modal).toContain('const showShieldBlock = isMe && displayCardLevel >= 3;');
    expect(modal).toContain('(showLearnedBlock || showShieldBlock || showPathBlock)');
  });

  it('renders the row with the shield tile icon and localized title', () => {
    expect(modal).toContain('name="shield-checkmark"');
    expect(modal).toContain("ru: 'Защита цепочки',");
    expect(modal).toContain("ru: 'спасла сегодня',");
    expect(modal).toContain("ru: 'активна',");
    expect(modal).toContain('перезарядка · ${cardShieldStatus.cooldownDaysLeft} дн');
  });

  it('loads the status through the new module without importing profile_card_system', () => {
    expect(modal).toContain("from '../app/profile_card_streak_shield'");
    expect(modal.match(/getCardStreakShieldStatus/g)!.length).toBeGreaterThanOrEqual(2);
  });
});
