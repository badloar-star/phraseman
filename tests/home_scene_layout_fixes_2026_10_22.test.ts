// зачем (Сверка 22.10, склейки hs_side_*): (1) чипы шапки на сцене не переполняются, (2) заголовок «До полуночи 2 ч 20 мин» рвётся только между фразой и временем,
// (3) герой привязан к шапке, а не к высоте текста. Раскладку на экране мерит Сверка на эмуляторе; здесь — контракт данных и исходников.
import fs from 'node:fs';
import path from 'node:path';

import { buildHomeSceneCopy, type HomeSceneCopyInput } from '../components/home/v2/scene/home_scene_copy';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const NBSP = ' ';

const base: HomeSceneCopyInput = {
  lang: 'ru', state: 'streak_risk', zeroEnergyNote: false, badge: null, episode: 12, title: 'Комплименты вслух', progress: null,
  streakDays: 5, minutesToMidnight: 140, daysAway: null, energyMinutes: null, theoryAvailable: false, wordsAvailable: false, lostStreakDays: null,
};
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const titleOf = (lang: (typeof LANGS)[number], minutesToMidnight: number): string => buildHomeSceneCopy({ ...base, lang, minutesToMidnight }).title;

describe('«До полуночи …»: перенос строки только между фразой и временем', () => {
  it('русский: «До полуночи» и «2 ч 20 мин» — два куска, внутри каждого пробелы неразрывные', () => {
    expect(titleOf('ru', 140)).toBe(`До${NBSP}полуночи 2${NBSP}ч${NBSP}20${NBSP}мин`);
  });

  it.each(LANGS)('%s: ровно один обычный пробел — место переноса, время не рвётся', (lang) => {
    for (const minutes of [140, 120, 45]) {
      const chunks = titleOf(lang, minutes).split(' ');
      expect(chunks).toHaveLength(2);
      // время (число часов/минут вместе с единицами) целиком в одном куске
      const needle = minutes >= 60 ? `${Math.floor(minutes / 60)}${NBSP}` : `${minutes}${NBSP}`;
      expect(chunks.filter((chunk) => chunk.includes(needle))).toHaveLength(1);
    }
  });

  it('короткое время тоже два куска: «До полуночи 45 мин» остаётся в одну строку, если помещается', () => {
    expect(titleOf('ru', 45)).toBe(`До${NBSP}полуночи 45${NBSP}мин`);
  });
});

describe('чипы шапки на сцене', () => {
  const header = read('components/home/v2/HomeV2Header.tsx');

  it('плашка «монеты | энергия» на сцене держит свою ширину и не переносит число', () => {
    expect(header).toContain("const keep = scene && stat.testID === 'home-v2-coins';");
    expect(header).toContain('statSlotKeep: { flexGrow: 0, flexShrink: 0 }');
    expect(header).toContain('statKeep: { flexShrink: 0 }');
    expect(header).toContain('statCopyKeep: { flexShrink: 0 }');
  });

  it('сжимается только плашка серии; зазоры на сцене 8; ужатия шрифта и обрезки нет', () => {
    expect(header).toContain('topRowScene: { gap: 8 }');
    expect(header).toContain('statsScene: { gap: 8 }');
    expect(header.replace(/\/\/.*$/gm, '')).not.toMatch(/adjustsFontSizeToFit|numberOfLines/);
  });
});

describe('герой сцены', () => {
  const stage = read('components/home/v2/scene/HomeSceneStage.tsx');

  it('привязан к шапке: верх героя = верх шапки + 36 из эталона, а не 92 от верха сцены', () => {
    expect(stage).toContain('const HEADER_TOP = 12;');
    expect(stage).toContain('const HERO_BELOW_HEADER = 92 - 56;');
    expect(stage).toContain('const HERO_TOP = HEADER_TOP + HERO_BELOW_HEADER;');
    // герой лежит в слоте свободного места под шапкой (heroSpace): относительно слота верх = HERO_TOP минус высота места под шапку (TOP_SPACE) — в координатах сцены те же 48
    expect(stage).toContain('const TOP_SPACE = 64;');
    expect(stage).toMatch(/hero: \{ position: 'absolute', right: -26, top: HERO_TOP - TOP_SPACE,/);
  });

  it('верх шапки в HomeScene совпадает с HEADER_TOP', () => {
    expect(read('components/home/v2/scene/HomeScene.tsx')).toMatch(/top: \{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: 12,/);
  });
});
