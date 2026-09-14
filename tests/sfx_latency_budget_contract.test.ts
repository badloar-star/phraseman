/**
 * Сторож: звук не должен платить создание нативного плеера на каждом экране.
 *
 * зачем (владелец 2026-09-03): «звуки воспроизводятся не сразу, а с паузой».
 * Разбор показал две причины, обе про холодный старт плеера — expo-audio не
 * буферизует до play() (issue #42900), поэтому цену платит КАЖДЫЙ первый
 * запуск события:
 *
 *  1. Кэш плееров держал 12 записей на 141 событие каталога. Человек ходит
 *     между экранами (урок → награды → арена → лига), и на каждом переходе
 *     плееры выселялись по LRU — на новом экране всё звучало «впервые».
 *  2. Прогрев на старте грел 5 событий, причём звуков награды и счётчика опыта
 *     среди них не было вовсе, хотя они звучат в конце КАЖДОГО урока
 *     (pm.reward.chest_open — самое частое событие по коду приложения).
 *
 * ВАЖНО, что чинить НЕЛЬЗЯ: ожидание завершения seekTo(0) перед play() в
 * expo_sfx_backend выглядит как лишняя задержка, но это защита от боевого бага
 * «тот же звук играет через раз» (ExoPlayer застревает в STATE_ENDED). Попытка
 * пропустить это ожидание для «свежего» плеера ломает три сторожа в
 * tests/sound_director.test.ts. Ускорять — прогревом и кэшем, не отключением
 * защиты.
 *
 * Сработал — вернуть значения, а не ослаблять проверку.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const BACKEND_PATH = join(__dirname, '..', 'modules', 'audio', 'expo_sfx_backend.ts');
const LAYOUT_PATH = join(__dirname, '..', 'app', '_layout.tsx');
const EVENTS_PATH = join(__dirname, '..', 'modules', 'audio', 'sound_events.ts');

describe('SFX: бюджет задержки первого звука', () => {
  const backend = readFileSync(BACKEND_PATH, 'utf8');
  const layout = readFileSync(LAYOUT_PATH, 'utf8');
  const events = readFileSync(EVENTS_PATH, 'utf8');

  it('кэш плееров ограничен безопасным native-бюджетом', () => {
    const match = backend.match(/const DEFAULT_CACHE_SIZE = (\d+);/);
    expect(match).not.toBeNull();
    const size = Number(match![1]);
    // После исправления release кэш не должен удерживать десятки native players.
    expect(size).toBe(16);
  });

  it('кэш остаётся меньше полного каталога — не держим всё подряд', () => {
    const match = backend.match(/const DEFAULT_CACHE_SIZE = (\d+);/);
    const size = Number(match![1]);
    const sourceCount = (events.match(/require\('/g) ?? []).length;
    expect(sourceCount).toBeGreaterThan(100);
    expect(size).toBeLessThan(sourceCount);
  });

  it('звуки нажатий греются рано — до первого тапа человека', () => {
    // Тап слышно чаще всего; прогрев на 3.5с не успевал к первому нажатию.
    expect(layout).toMatch(/prewarm\(\[\s*'pm\.ui\.tap_soft',\s*'pm\.ui\.tap_primary'/);
    const tapWave = layout.match(/tapPrewarmTimer = setTimeout\([\s\S]*?\}, (\d+)\);/);
    expect(tapWave).not.toBeNull();
    expect(Number(tapWave![1])).toBeLessThanOrEqual(1500);
  });

  it('прогрев покрывает звуки конца урока, а не только его середину', () => {
    // Раньше их не было вовсе, хотя они звучат в конце каждого урока.
    for (const eventId of [
      'pm.reward.chest_open',
      'pm.complete.xp_counter_start',
      'pm.complete.xp_counter_tick',
      'pm.complete.xp_counter_complete',
    ]) {
      expect({ eventId, present: layout.includes(`'${eventId}'`) })
        .toEqual({ eventId, present: true });
    }
  });

  it('каждое прогреваемое событие существует в каталоге', () => {
    // Опечатка в id сделала бы прогрев молча бесполезным.
    const prewarmed = [...layout.matchAll(/prewarm\(\[([\s\S]*?)\]\)/g)]
      .flatMap((block) => [...block[1].matchAll(/'(pm\.[a-z0-9_.]+)'/g)].map((m) => m[1]));
    expect(prewarmed.length).toBeGreaterThanOrEqual(10);
    const missing = prewarmed.filter((id) => !events.includes(`'${id}'`));
    expect(missing).toEqual([]);
  });

  it('защита от «звук играет через раз» не отключена', () => {
    // Ожидание seek перед play обязано остаться: без него возвращается баг,
    // ради которого оно введено (см. tests/sound_director.test.ts).
    expect(backend).toContain('SEEK_SETTLE_TIMEOUT_MS');
    expect(backend).toMatch(/if \(seekPromise\) \{/);
  });
});
