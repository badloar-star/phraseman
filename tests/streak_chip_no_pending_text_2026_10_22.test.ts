// зачем (слово владельца 22.10: «УБЕРИ ВОТ ЭТОТ ТЕКСТ, ТАКОГО НЕ НАДО ПОКАЗЫВАТЬ. ЛУЧШЕ ПРОСТО ПУСТЬ ОГОНЁК БУДЕТ ПУСТОЙ ИЛИ ЗАЖЖЁН»): в чипе серии на Главной нет
// подписи «Сегодня ещё нет» ни на одном из 9 языков; состояние дня показывает только огонёк (flame-outline / flame); «ещё не сегодня» остаётся для незрячих.
import fs from 'node:fs';
import path from 'node:path';

import { homeScenePreviewHeaderWords } from '../components/home/v2/scene/home_scene_preview_fixtures';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const noComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

const PHRASES = [
  'Сегодня ещё нет', 'Сьогодні ще ні', 'Not yet today', 'Hoy aún no', 'Hoje ainda não', 'Hôm nay chưa có', 'Hari ini belum', 'Bugün henüz yok', 'Dziś jeszcze nie',
];
const LINE_BREAK = String.fromCharCode(10);
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('чип серии: без текста «Сегодня ещё нет»', () => {
  const home = noComments(read('app/(tabs)/home.tsx'));

  it('подпись чипа при pending та же, что у зажжённого огонька; слова pending больше нет', () => {
    expect(home).toContain('label: homeV2StreakWord,');
    expect(home).not.toContain('homeV2StreakPendingWord');
    expect(home).not.toMatch(/label: streakToday === 'pending'/);
  });

  it('состояние несёт только иконка: pending — flame-outline, засчитан — flame', () => {
    expect(home).toContain("icon: <Ionicons name={streakToday === 'pending' ? 'flame-outline' : 'flame'}");
  });

  it('для незрячих «ещё не сегодня» остаётся в accessibilityLabel', () => {
    expect(home).toContain("accessibilityLabel: streakToday === 'pending' ? `${homeV2StreakWord}: ${homeV2DaysLabel}. ${homeV2StreakPendingA11y}`");
  });

  it('ни одной из 9 фраз «Сегодня ещё нет» нет в коде экранов и компонентов (кроме текстов для чтения с экрана)', () => {
    for (const rel of ['app/(tabs)/home.tsx', 'app/dev_home_scene_preview.tsx', 'components/home/v2/HomeV2Header.tsx', 'components/home/v2/scene/home_scene_preview_fixtures.ts']) {
      // тексты для чтения с экрана (homeV2StreakPendingA11y) — отдельная строка: «Hoy aún no cuenta…» там допустимо
      const src = noComments(read(rel)).split(LINE_BREAK).filter((line) => !line.includes('homeV2StreakPendingA11y = ')).join(LINE_BREAK);
      for (const phrase of PHRASES) expect(`${rel}: ${src.includes(phrase)}`).toBe(`${rel}: false`);
    }
  });

  it('слова шапки dev-входа: подписи «ещё нет» нет, серия и монеты на месте', () => {
    for (const lang of LANGS) {
      const words = homeScenePreviewHeaderWords(lang, 5);
      expect('pending' in words).toBe(false);
      expect(words.streak.trim().length).toBeGreaterThan(0);
    }
  });
});
