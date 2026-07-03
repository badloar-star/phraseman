import {
  parseHelperDoc,
  isCooldownElapsed,
  TOP_HELPERS_REFRESH_COOLDOWN_MS,
} from '../app/firestore_top_helpers';

describe('parseHelperDoc', () => {
  it('парсит валидный документ проекции в строку борда', () => {
    const row = parseHelperDoc('uid-1', {
      confirmed: 5,
      displayName: 'Аня',
      avatar: '12',
      aura: 'aura-aurora',
      isPremium: true,
      profileCardLevel: 2,
      leagueCrownCount: 3,
    });
    expect(row).not.toBeNull();
    expect(row!.uid).toBe('uid-1');
    expect(row!.confirmed).toBe(5);
    expect(row!.displayName).toBe('Аня');
    expect(row!.avatar).toBe('12');
    expect(row!.aura).toBe('aura-aurora');
    expect(row!.isPremium).toBe(true);
    expect(row!.profileCardLevel).toBe(2);
    expect(row!.leagueCrownCount).toBe(3);
  });

  it('отбрасывает записи с confirmed<=0 (нечего показывать на борде)', () => {
    expect(parseHelperDoc('u', { confirmed: 0, displayName: 'X' })).toBeNull();
    expect(parseHelperDoc('u', { confirmed: -1, displayName: 'X' })).toBeNull();
    expect(parseHelperDoc('u', {})).toBeNull();
    expect(parseHelperDoc('u', undefined)).toBeNull();
  });

  it('подставляет тире, если имя пустое, и не роняется на мусоре', () => {
    const row = parseHelperDoc('u', { confirmed: 2 });
    expect(row).not.toBeNull();
    expect(row!.displayName).toBe('—');
    expect(row!.isPremium).toBe(false);
    expect(row!.avatar).toBeUndefined();
  });

  it('обрезает слишком длинное имя (защита от раздувания)', () => {
    const long = 'x'.repeat(200);
    const row = parseHelperDoc('u', { confirmed: 1, displayName: long });
    expect(row!.displayName.length).toBe(60);
  });
});

describe('isCooldownElapsed (кулдаун 3 ч — дёшево по Firebase)', () => {
  const now = 1_000_000_000_000;

  it('первый заход (нет метки) — обновляемся', () => {
    expect(isCooldownElapsed(0, now)).toBe(true);
    expect(isCooldownElapsed(NaN, now)).toBe(true);
  });

  it('в пределах 3 ч — НЕ обновляемся', () => {
    expect(isCooldownElapsed(now - 1000, now)).toBe(false);
    expect(isCooldownElapsed(now - (TOP_HELPERS_REFRESH_COOLDOWN_MS - 1), now)).toBe(false);
  });

  it('ровно/после 3 ч — обновляемся', () => {
    expect(isCooldownElapsed(now - TOP_HELPERS_REFRESH_COOLDOWN_MS, now)).toBe(true);
    expect(isCooldownElapsed(now - (TOP_HELPERS_REFRESH_COOLDOWN_MS + 1), now)).toBe(true);
  });

  it('кулдаун равен трём часам', () => {
    expect(TOP_HELPERS_REFRESH_COOLDOWN_MS).toBe(3 * 60 * 60 * 1000);
  });
});
