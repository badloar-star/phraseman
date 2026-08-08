// ════════════════════════════════════════════════════════════════════════════
// active_gifts_runtime.test.ts — сборщик «Активных» проверяется РАБОТОЙ.
//
// зачем 2026-08-03 (владелец: «в разделе активные ничего нет»): предыдущий
// контракт сверял строки-ключи в исходниках и был зелёным — но пустой раздел он
// не поймал, потому что проверял ТЕКСТ кода, а не его ПОВЕДЕНИЕ.
//
// Здесь сборщик реально запускается на подставленном хранилище: кладём бонус —
// ждём его в списке. Если функция падает, отдаёт пустоту или теряет пункт,
// тест это видит.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadActiveLevelGiftInventory } from '../app/level_gift_active_inventory';

const NOW = Date.UTC(2026, 7, 3, 12, 0, 0);
const HOUR = 60 * 60 * 1000;

async function collect() {
  return loadActiveLevelGiftInventory('ru', NOW);
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('сборщик вообще работает', () => {
  test('на пустом хранилище возвращает пустой список, а не падает', async () => {
    await expect(collect()).resolves.toEqual([]);
  });

  test('битый JSON в хранилище не роняет весь раздел', async () => {
    // Класс бага «раздел пуст»: одно повреждённое значение не должно скрывать
    // остальные бонусы.
    await AsyncStorage.setItem('gift_xp_bank_v1', '{сломано');
    await AsyncStorage.setItem('league_personal_boost_v1', JSON.stringify({
      id: 'x2_eod_pass', multiplier: 2, startedAt: NOW, expiresAt: NOW + 5 * HOUR,
    }));
    const active = await collect();
    expect(active.map((item) => item.key)).toContain('league_personal_boost');
  });
});

describe('уровневые бонусы попадают в список', () => {
  test('банк опыта виден после начисления', async () => {
    await AsyncStorage.setItem('gift_xp_bank_v1', JSON.stringify({
      remaining: 300, grantedTotal: 300, updatedAt: NOW,
    }));
    const active = await collect();
    expect(active.map((item) => item.key)).toContain('xp_bank');
  });

  test('множитель опыта виден, пока не истёк', async () => {
    await AsyncStorage.setItem('gift_xp_multiplier', JSON.stringify({
      multiplier: 2, expiresAt: NOW + 10 * HOUR,
    }));
    const active = await collect();
    expect(active.length).toBeGreaterThan(0);
  });

  test('истёкший множитель в список не попадает', async () => {
    await AsyncStorage.setItem('gift_xp_multiplier', JSON.stringify({
      multiplier: 2, expiresAt: NOW - HOUR,
    }));
    await expect(collect()).resolves.toEqual([]);
  });
});

describe('СЕЗОННЫЕ награды попадают в список', () => {
  test('буст лиги виден со своим сроком', async () => {
    await AsyncStorage.setItem('league_personal_boost_v1', JSON.stringify({
      id: 'x2_eod_pass', multiplier: 2, startedAt: NOW, expiresAt: NOW + 6 * HOUR,
    }));
    const active = await collect();
    const boost = active.find((item) => item.key === 'league_personal_boost');
    expect(boost).toBeDefined();
    expect(boost!.expiresAtMs).toBe(NOW + 6 * HOUR);
  });

  test('золотой урок виден и получает 72-часовой срок', async () => {
    await AsyncStorage.setItem('season_golden_lesson_v1', JSON.stringify({
      multiplier: 3, remaining: 1, grantedAtMs: NOW,
    }));
    const active = await collect();
    const lesson = active.find((item) => item.key === 'season_golden_lesson');
    expect(lesson).toBeDefined();
    expect(lesson!.expiresAtMs).toBe(NOW + 72 * HOUR);
  });

  test('второе дыхание видно со своим сроком', async () => {
    await AsyncStorage.setItem('boon_energy_override_v1', JSON.stringify({
      expiresAt: NOW + 8 * HOUR, intervalMs: 60_000,
    }));
    const active = await collect();
    expect(active.map((item) => item.key)).toContain('turbo_regen');
  });

  test('потраченный золотой урок исчезает из списка', async () => {
    await AsyncStorage.setItem('season_golden_lesson_v1', JSON.stringify({
      multiplier: 3, remaining: 0, grantedAtMs: NOW,
    }));
    await expect(collect()).resolves.toEqual([]);
  });

  test('истёкший буст лиги в список не попадает', async () => {
    await AsyncStorage.setItem('league_personal_boost_v1', JSON.stringify({
      id: 'x2_eod_pass', multiplier: 2, startedAt: NOW - 10 * HOUR, expiresAt: NOW - HOUR,
    }));
    await expect(collect()).resolves.toEqual([]);
  });
});

describe('несколько бонусов сразу', () => {
  test('все активные показываются одновременно, каждый со своим таймером', async () => {
    await AsyncStorage.multiSet([
      ['gift_xp_bank_v1', JSON.stringify({ remaining: 200, grantedTotal: 200, updatedAt: NOW })],
      ['league_personal_boost_v1', JSON.stringify({ id: 'x2_eod_pass', multiplier: 2, startedAt: NOW, expiresAt: NOW + 4 * HOUR })],
      ['season_golden_lesson_v1', JSON.stringify({ multiplier: 3, remaining: 2, grantedAtMs: NOW })],
      ['boon_energy_override_v1', JSON.stringify({ expiresAt: NOW + 9 * HOUR, intervalMs: 60_000 })],
    ]);

    const active = await collect();
    const keys = active.map((item) => item.key);
    expect(keys).toEqual(expect.arrayContaining([
      'xp_bank', 'league_personal_boost', 'season_golden_lesson', 'turbo_regen',
    ]));

    // У каждого пункта есть свой срок и он в будущем — иначе таймер не тикает.
    for (const item of active) {
      expect(item.expiresAtMs).toBeGreaterThan(NOW);
    }
  });

  test('у каждого пункта заполнены название и описание', async () => {
    await AsyncStorage.setItem('league_personal_boost_v1', JSON.stringify({
      id: 'x2_eod_pass', multiplier: 2, startedAt: NOW, expiresAt: NOW + 3 * HOUR,
    }));
    const active = await collect();
    for (const item of active) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.desc.length).toBeGreaterThan(0);
      expect(item.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
