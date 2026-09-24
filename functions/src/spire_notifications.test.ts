// Сторож общих кусков пушей Шпиля (PM-281): имена шпилей, валидация токена,
// чанкование. Названия камней должны зеркалить modules/spire/tier_names.ts
// (клиент) — сторож зеркала ниже, отдельным тестом.
import {
  SPIRE_PUSH_TIER_COUNT,
  SPIRE_PUSH_TIER_NAMES,
  chunkSpirePushMessages,
  clampSpirePushTier,
  isValidSpireExpoPushToken,
  normalizeSpirePushLang,
  spirePushTierName,
} from './spire_notifications';

describe('normalizeSpirePushLang', () => {
  it('известный язык проходит как есть', () => {
    expect(normalizeSpirePushLang('uk')).toBe('uk');
  });
  it('неизвестный/пустой язык падает на ru', () => {
    expect(normalizeSpirePushLang('fr')).toBe('ru');
    expect(normalizeSpirePushLang(null)).toBe('ru');
    expect(normalizeSpirePushLang(undefined)).toBe('ru');
  });
});

describe('clampSpirePushTier / SPIRE_PUSH_TIER_NAMES', () => {
  it('все 8 языков дают ровно 12 имён (Гранит…Алмаз)', () => {
    for (const lang of Object.keys(SPIRE_PUSH_TIER_NAMES) as (keyof typeof SPIRE_PUSH_TIER_NAMES)[]) {
      expect(SPIRE_PUSH_TIER_NAMES[lang]).toHaveLength(SPIRE_PUSH_TIER_COUNT);
    }
  });
  it('прижимает выход за границы 0..11', () => {
    expect(clampSpirePushTier(-3)).toBe(0);
    expect(clampSpirePushTier(99)).toBe(11);
    expect(clampSpirePushTier(NaN)).toBe(0);
  });
  it('spirePushTierName: индекс 0 — Гранит, 11 — Алмаз, неизвестный язык — ru', () => {
    expect(spirePushTierName(0, 'ru')).toBe('Гранит');
    expect(spirePushTierName(11, 'ru')).toBe('Алмаз');
    expect(spirePushTierName(0, 'fr')).toBe('Гранит');
  });
});

describe('isValidSpireExpoPushToken', () => {
  it('принимает валидный формат Expo-токена', () => {
    expect(isValidSpireExpoPushToken('ExponentPushToken[abc123]')).toBe(true);
    expect(isValidSpireExpoPushToken('ExpoPushToken[abc123]')).toBe(true);
  });
  it('отклоняет мусор', () => {
    expect(isValidSpireExpoPushToken('not-a-token')).toBe(false);
    expect(isValidSpireExpoPushToken(null)).toBe(false);
    expect(isValidSpireExpoPushToken(undefined)).toBe(false);
    expect(isValidSpireExpoPushToken(42)).toBe(false);
  });
});

describe('chunkSpirePushMessages', () => {
  it('режет ровно по 100 (лимит Expo Push API)', () => {
    const items = Array.from({ length: 250 }, (_, i) => i);
    const chunks = chunkSpirePushMessages(items);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[1]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
  });
  it('пустой список — ноль чанков', () => {
    expect(chunkSpirePushMessages([])).toHaveLength(0);
  });
});
