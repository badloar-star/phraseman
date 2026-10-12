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
    // зачем (PM-220): каталог сократился с 141 до ~68 событий после удаления Арены/MAX/XP — порог
    // «кэш меньше каталога» остаётся смысловым (16 < 68), а не привязан к старому числу 100.
    expect(sourceCount).toBeGreaterThan(size);
    expect(sourceCount).toBeGreaterThan(40);
    expect(size).toBeLessThan(sourceCount);
  });

  it('звуки нажатий греются первыми, сразу после кадра Главной и премаунта вкладок', () => {
    // Тап слышно чаще всего — волна нажатий идёт первой в очереди прогрева.
    // зачем (координатор 13.10, вариант «б»; замер Сверки 57ecd26e6): прежний таймер 1,2 с от монтирования корня ставил
    // первый плеер — единственный дорогой (подъём нативного аудио, до 1,5 с) — в окно премаунта вкладок. Теперь старт —
    // кадр Главной (потолок ≤ 6 с) + пауза под премаунт; ранний тап до прогрева звучит, лишь с задержкой (play создаёт плеер).
    expect(layout).toMatch(/prewarm\(\[\s*'pm\.ui\.tap_soft',\s*'pm\.ui\.tap_primary'/);
    expect(layout).toContain('scheduleStartupSfxPrewarm({');
    const startup = readFileSync(join(__dirname, '..', 'modules', 'audio', 'startup_sfx_prewarm.ts'), 'utf8');
    const ceiling = startup.match(/SFX_PREWARM_HOME_PAINT_CEILING_MS = ([\d_]+);/);
    const delay = startup.match(/SFX_PREWARM_AFTER_PAINT_DELAY_MS = ([\d_]+);/);
    expect(ceiling).not.toBeNull();
    expect(delay).not.toBeNull();
    // Кадр Главной + пауза не дольше ~11 с: прогрев обязан успеть задолго до первого урока.
    expect(Number(ceiling![1].replace(/_/g, ''))).toBeLessThanOrEqual(6000);
    expect(Number(delay![1].replace(/_/g, ''))).toBeLessThanOrEqual(5000);
    // Плеер при промахе прогрева создаётся в play() — ранний тап не молчит.
    expect(backend).toMatch(/entry = this\.ensure\(eventId, source\);/);
  });

  it('прогрев покрывает звуки конца урока, а не только его середину', () => {
    // Раньше их не было вовсе, хотя они звучат в конце каждого урока.
    for (const eventId of [
      'pm.reward.chest_open',
      // зачем (D02): счётчик опыта удалён вместе с XP; конец урока теперь — микро-завершение,
      // награда и сохранённая серия.
      'pm.complete.micro',
      'pm.reward.small',
      'pm.streak.saved',
    ]) {
      expect({ eventId, present: layout.includes(`'${eventId}'`) })
        .toEqual({ eventId, present: true });
    }
  });

  it('каждое прогреваемое событие существует в каталоге', () => {
    // Опечатка в id сделала бы прогрев молча бесполезным.
    const prewarmed = [...layout.matchAll(/prewarm\(\[([\s\S]*?)\]\)/g)]
      .flatMap((block) => [...block[1].matchAll(/'(pm\.[a-z0-9_.]+)'/g)].map((m) => m[1]));
    expect(prewarmed.length).toBeGreaterThanOrEqual(7);
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
