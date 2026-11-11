// зачем: владелец 14.10 одобрил звуки лаборатории; несколько вариантов на событие, без повторов подряд.
// 11.11, владелец: «звуки должны быть точно закреплены за событием и воспроизводиться мгновенно» — у события, для которого он выбрал звук,
// вариант ровно один (замер: каждый лишний файл — это +530 мс холодного запуска). Четыре варианта — у событий без выбора.
// Каталог V2: у каждого события 1 или не меньше 4 вариантов, каждый файл существует, нет файлов-сирот,
// размер набора укладывается в бюджет стор-сборки (≤ 2,5 МБ).
import * as fs from 'fs';
import * as path from 'path';
import {
  SOUND_V2_CATALOG,
  SOUND_V2_EVENT_IDS,
  getSoundV2Clip,
  isSoundV2Series,
  type SoundV2EventId,
} from '../modules/sound_v2/catalog';

const ASSETS_DIR = path.resolve(__dirname, '..', 'assets', 'sounds', 'v2');
const SIZE_BUDGET_BYTES = 2_500_000;

function listFilesOnDisk(): string[] {
  const out: string[] = [];
  for (const dir of fs.readdirSync(ASSETS_DIR)) {
    const full = path.join(ASSETS_DIR, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const file of fs.readdirSync(full)) out.push(`${dir}/${file}`);
  }
  return out.sort();
}

describe('sound_v2 catalog', () => {
  // 11.11: +6 событий — отсчёт Пика, приглашение и три исхода дуэли, выигрыш рулетки (владелец выбрал им звук, слота не было)
  it('содержит 42 события в 6 группах', () => {
    expect(SOUND_V2_EVENT_IDS).toHaveLength(42);
    const groups = new Set(SOUND_V2_EVENT_IDS.map((id) => SOUND_V2_CATALOG[id].group));
    expect([...groups].sort()).toEqual(['day', 'learn', 'peak', 'plus', 'reward', 'touch']);
  });

  // события без выбора владельца: молния и «Учить» (под удаление), переключатели (без звука), идеальный урок и достижение (нет экрана)
  const MULTI_VARIANT_EVENTS = ['achievement', 'lesson_perfect', 'lightning', 'swipe_learn', 'toggle_off', 'toggle_on'];

  it('один вариант — ровно у событий с выбором владельца, у остальных не меньше четырёх', () => {
    const multi = SOUND_V2_EVENT_IDS.filter((id) => SOUND_V2_CATALOG[id].variants.length !== 1).sort();
    expect(multi).toEqual(MULTI_VARIANT_EVENTS);
  });

  it.each(SOUND_V2_EVENT_IDS.map((id) => [id]))('у события %s один вариант или не меньше 4, и все шаги на месте', (id) => {
    const entry = SOUND_V2_CATALOG[id as SoundV2EventId];
    if (entry.variants.length !== 1) expect(entry.variants.length).toBeGreaterThanOrEqual(4);
    for (const clips of entry.variants) expect(clips).toHaveLength(entry.steps);
  });

  it('каждый файл каталога существует, не пуст и назван по схеме событие/v<вариант>[_s<шаг>].m4a', () => {
    const missing: string[] = [];
    const badName: string[] = [];
    for (const id of SOUND_V2_EVENT_IDS) {
      const entry = SOUND_V2_CATALOG[id];
      entry.variants.forEach((clips, v) => {
        clips.forEach((clip, s) => {
          const expected = entry.steps > 1 ? `${id}/v${v + 1}_s${s}.m4a` : `${id}/v${v + 1}.m4a`;
          if (clip.file !== expected) badName.push(`${clip.file} != ${expected}`);
          const full = path.join(ASSETS_DIR, clip.file);
          if (!fs.existsSync(full) || fs.statSync(full).size === 0) missing.push(clip.file);
          expect(clip.ms).toBeGreaterThan(50);
        });
      });
    }
    expect(missing).toEqual([]);
    expect(badName).toEqual([]);
  });

  it('на диске нет файлов-сирот и дублей: набор файлов совпадает с каталогом', () => {
    const inCatalog = SOUND_V2_EVENT_IDS.flatMap((id) => SOUND_V2_CATALOG[id].variants.flatMap((clips) => clips.map((c) => c.file))).sort();
    expect(new Set(inCatalog).size).toBe(inCatalog.length);
    expect(listFilesOnDisk()).toEqual(inCatalog);
  });

  it('общий размер набора не выше бюджета стор-сборки', () => {
    const total = listFilesOnDisk().reduce((sum, file) => sum + fs.statSync(path.join(ASSETS_DIR, file)).size, 0);
    expect(total).toBeLessThanOrEqual(SIZE_BUDGET_BYTES);
  });

  it('серии: correct 8 шагов, lightning 4, coin 5, ring 3 по кругу; остальные события без шагов', () => {
    const steps = Object.fromEntries(SOUND_V2_EVENT_IDS.filter(isSoundV2Series).map((id) => [id, SOUND_V2_CATALOG[id].steps]));
    expect(steps).toEqual({ correct: 8, lightning: 4, coin: 5, ring: 3 });
    expect(SOUND_V2_CATALOG.ring.cycle).toBe(true);
    expect(SOUND_V2_CATALOG.correct.cycle).toBe(false);
  });

  it('getSoundV2Clip: за пределами шагов серия держится на последнем, кольцо идёт по кругу', () => {
    expect(getSoundV2Clip('correct', 0, 99).file).toBe('correct/v1_s7.m4a');
    expect(getSoundV2Clip('lightning', 2, -5).file).toBe('lightning/v3_s0.m4a');
    expect(getSoundV2Clip('ring', 0, 4).file).toBe('ring/v1_s1.m4a');
    expect(getSoundV2Clip('toggle_on', 3, 7).file).toBe('toggle_on/v4.m4a');
  });
});
