// зачем (Сверка 22.10, ss_side_5…9; эталон course-hybrid-1-4): карта «Экзамен главы» не показывается, пока экзамен выключен; «Вся глава · Слова · Теория» — текст без подложки;
// справа в шапке аватар с ромбом Plus (в dev-входе — мок, в бою — avatarSlot хозяина, без новых чтений).
import fs from 'node:fs';
import path from 'node:path';

import { SEASON_CHAPTER_EXAM_ENABLED } from '../components/learning-v2/season/season_flags';
import { buildSeasonDeck } from '../components/learning-v2/season/season_course_model';
import { seasonPreviewRows, seasonPreviewSetup, SEASON_PREVIEW_STATES } from '../components/learning-v2/season/season_preview_fixtures';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('«Экзамен главы» и флаг экзамена', () => {
  // зачем (экзамен главы — Learning V2 22.10): флаг теперь dev-условие (в тестах dev включён) — проверки подстроены под значение флага, а не под «выключен всегда»
  it('карта экзамена в колодах превью есть ровно тогда, когда флаг включён', () => {
    for (const state of SEASON_PREVIEW_STATES) {
      const { deck } = seasonPreviewSetup(state);
      expect(deck.cards.filter((card) => card.kind === 'exam')).toHaveLength(SEASON_CHAPTER_EXAM_ENABLED ? 3 : 0);
      expect(deck.cards).toHaveLength(SEASON_CHAPTER_EXAM_ENABLED ? 27 : 24);
    }
  });

  it('границы глав: без экзамена по 8 карт подряд, с экзаменом — по 9', () => {
    const deck = buildSeasonDeck(seasonPreviewRows(11), { includeExam: SEASON_CHAPTER_EXAM_ENABLED });
    expect(deck.chapters.map((chapter) => [chapter.firstIndex, chapter.lastIndex])).toEqual(SEASON_CHAPTER_EXAM_ENABLED ? [[0, 8], [9, 17], [18, 26]] : [[0, 7], [8, 15], [16, 23]]);
    expect(deck.currentIndex).toBe(SEASON_CHAPTER_EXAM_ENABLED ? 12 : 11);
  });

  it('колода с экзаменом (включённый флаг в будущем) по-прежнему собирается: 27 карт', () => {
    expect(buildSeasonDeck(seasonPreviewRows(11), { includeExam: true }).cards).toHaveLength(27);
    expect(buildSeasonDeck(seasonPreviewRows(11)).cards).toHaveLength(27);
  });

  it('эпизод 16 в экзаменных состояниях закрыт (🔒), как в эталоне, — а не пройден (✓)', () => {
    for (const state of ['exam_card', 'exam_open'] as const) {
      const { deck, initialState } = seasonPreviewSetup(state);
      const card = deck.cards[initialState.selectedIndex];
      expect(card.state).toBe('locked');
    }
  });
});

describe('вид «Сезона»', () => {
  const view = code(read('components/learning-v2/season/SeasonCourseView.tsx'));
  const preview = code(read('app/dev_season_preview.tsx'));

  it('«Вся глава · Слова · Теория» — без подложки, разнесены по ширине', () => {
    expect(view).toMatch(/style=\{\(\{ pressed \}\) => \[styles\.chip, \{ opacity: pressed \? 0\.72 : 1 \}\]\}/);
    expect(view).not.toMatch(/styles\.chip, \{ backgroundColor/);
    expect(view).toMatch(/actions: \{ flexDirection: 'row', justifyContent: 'space-around'/);
    expect(view).not.toMatch(/chip: \{[^}]*backgroundColor/);
  });

  it('в шапке dev-превью — аватар-монета с кольцом Plus (через avatarSlot, без чтений)', () => {
    expect(preview).toContain('<PlusAvatarRing plus size={STORY_RING_SLOT}>');
    expect(preview).toContain('avatarSlot={avatar}');
    expect(preview).not.toMatch(/fetch\(|httpsCallable|getDoc|firestore|AsyncStorage/i);
  });
});
