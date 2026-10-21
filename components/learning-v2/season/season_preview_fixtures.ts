// ════════════════════════════════════════════════════════════════════════════
// season_preview_fixtures.ts — моки для dev-входа /dev_season_preview (экран «Обучение», способ 2 «Сезон и карусель карт»), только разработка.
//
// зачем (координатор 21.10, Сверка): состояния экрана снимаются по ссылке рядом с эталоном course-hybrid-1-4.html / chapter-exam-season.html, боевая вкладка
// «Уроки» не подменяется и боевой прогресс не трогается. Прогресс — те же строки LearningV2CourseAccordionRowV1, что строит карта курса, поэтому колода
// (buildSeasonDeck) и всё остальное — настоящие; моки — только пройдено/текущее и тексты. Тексты эпизодов 1–18 и глав — дословно из эталона (константы EP и CH),
// 19–24 в эталоне нет — заглушки, на кадры Сверки они не попадают. Ничего не читает из сети и хранилища.
// ════════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import {
  learningV2CourseSessionIdV1, learningV2CourseSessionRoleV1,
} from '../../../modules/learning-v2/content/course_topology_v1';
import type { LearningV2CourseAccordionRowV1 } from '../../../modules/learning-v2/map/course_accordion_map_model_v1';
import type { SeasonChapterInfo } from './SeasonCourseView';
import { seasonText } from './season_copy';
import { seasonTasksLabel } from './season_copy_card';
import { buildSeasonDeck, type SeasonDeck, type SeasonEpisodeCard } from './season_course_model';

export const SEASON_PREVIEW_STATES = ['cover', 'newcomer', 'carousel', 'locked_open', 'chapter_picker', 'exam_card', 'exam_open'] as const;
export type SeasonPreviewState = (typeof SEASON_PREVIEW_STATES)[number];

export function isSeasonPreviewState(value: unknown): value is SeasonPreviewState {
  return typeof value === 'string' && (SEASON_PREVIEW_STATES as readonly string[]).includes(value);
}

export const SEASON_PREVIEW_LESSON = { ordinal: 1, title: 'Present be: утверждение + not', arc: 'Первая неделя в Дублине', chapterCount: 7 } as const;

const CHAPTERS: readonly Readonly<{ scene: string; icon: SeasonChapterInfo['icon'] }>[] = [
  { scene: 'Первый рабочий день', icon: 'business-outline' },
  { scene: 'Кофе с коллегой', icon: 'cafe-outline' },
  { scene: 'Знакомство с командой', icon: 'people-outline' },
  { scene: 'Квартира, погода, вещи', icon: 'home-outline' },
  { scene: 'Обед с командой', icon: 'restaurant-outline' },
  { scene: 'Пятница, паб', icon: 'chatbubbles-outline' },
  { scene: 'Воскресный звонок домой', icon: 'call-outline' },
];

type EpisodeFixture = Readonly<{ title: string; phrase: string; tasks: number; translation?: string; words?: readonly string[] }>;

const EP: Readonly<Record<number, EpisodeFixture>> = {
  1: { title: 'Вошли в офис', phrase: 'I am here.', tasks: 20, translation: 'Я здесь.', words: ['here', 'ready', 'fine', 'happy'] },
  2: { title: 'День продолжается', phrase: 'I am busy.', tasks: 21 },
  3: { title: 'Заботливый начальник', phrase: 'I am not sure.', tasks: 21 },
  4: { title: 'Утренняя планёрка вслух', phrase: 'I am early.', tasks: 21 },
  5: { title: 'Типичные ошибки: I fine, I no sure', phrase: 'I am new.', tasks: 21 },
  6: { title: 'Вечером в квартире, звонок другу', phrase: 'I am home.', tasks: 20 },
  7: { title: 'Конец дня, всё вперемешку', phrase: 'I am full.', tasks: 18 },
  8: { title: 'Итог первого дня: ответить на 10 вопросов о себе', phrase: 'I am excited.', tasks: 25 },
  9: { title: 'Коллега приносит кофе', phrase: 'He is tall.', tasks: 21 },
  10: { title: 'Замечаем и говорим о собеседнике', phrase: 'You are early.', tasks: 21 },
  11: { title: 'Успокаиваем коллегу', phrase: 'You are not lazy.', tasks: 18 },
  12: { title: 'Комплименты вслух', phrase: 'I am calm.', tasks: 20, translation: 'Я спокоен.', words: ['polite', 'brave', 'honest', 'smart'] },
  13: { title: 'Ловушки: you am, I are', phrase: 'You are kind.', tasks: 18 },
  14: { title: 'Помогаем туристу под дождём', phrase: 'You are safe.', tasks: 18, translation: 'Ты в безопасности.', words: ['safe', 'warm', 'dry', 'wet'] },
  15: { title: 'Вечер, разбор дня', phrase: 'I am serious.', tasks: 22 },
  16: { title: '«Скажи коллеге пять вещей о нём»', phrase: 'It is open.', tasks: 21 },
  17: { title: 'Начальник представляет людей', phrase: 'You are welcome.', tasks: 21 },
  18: { title: 'Обсуждаем коллег шёпотом', phrase: 'She is funny.', tasks: 21 },
};

/** Эпизод в эталоне есть не у всех номеров: 19–24 — заглушки для колоды из трёх полных глав. */
function episodeFixture(ordinal: number): EpisodeFixture {
  return EP[ordinal] ?? { title: `Эпизод ${ordinal}`, phrase: 'It is fine.', tasks: 20 };
}

/** Индекс карты-эпизода в колоде: после каждых 8 эпизодов вставлена карта экзамена главы. */
export function seasonPreviewEpisodeIndex(ordinal: number): number {
  return (ordinal - 1) + Math.floor((ordinal - 1) / 8);
}

/** Индекс карты «Экзамен главы N» (N-я глава заканчивается 9-й картой). */
export function seasonPreviewExamIndex(chapterOrdinal: number): number {
  return chapterOrdinal * 9 - 1;
}

/** Строки прогресса: занятия 1…`completedThrough` пройдены, следующее — текущее (0 — «новичок»: текущее — эпизод 1). */
export function seasonPreviewRows(completedThrough: number, totalSessions = 24): readonly LearningV2CourseAccordionRowV1[] {
  const current = completedThrough + 1;
  const rows: LearningV2CourseAccordionRowV1[] = [{ kind: 'lesson', id: 'lesson-01', lessonOrdinal: 1 }];
  for (let s = 1; s <= totalSessions; s += 1) {
    rows.push({
      kind: 'session',
      id: learningV2CourseSessionIdV1(1, s),
      lessonOrdinal: 1,
      sessionOrdinal: s,
      chapterOrdinal: Math.ceil(s / 8),
      positionInChapter: ((s - 1) % 8) + 1,
      role: learningV2CourseSessionRoleV1(s),
      state: s < current ? 'completed' : s === current ? 'current' : s === current + 1 ? 'next' : 'locked',
    });
  }
  return rows;
}

export type SeasonPreviewInitialState = Readonly<{
  /** Карта, на которой стоит карусель. */
  selectedIndex: number;
  /** Раскрытая карта (поверх экрана) или null. */
  expandedIndex: number | null;
  /** Открытый веер «Вся глава» или null. */
  fanChapter: number | null;
}>;

export type SeasonPreviewSetup = Readonly<{
  deck: SeasonDeck;
  newcomer: boolean;
  initialState: SeasonPreviewInitialState;
}>;

/** Состояния для Сверки: номера в скобках — экраны эталона (course-hybrid-1-4 phone 5–9, chapter-exam-season). */
export function seasonPreviewSetup(state: SeasonPreviewState): SeasonPreviewSetup {
  const inProgress = buildSeasonDeck(seasonPreviewRows(11)); // эпизоды 1–11 пройдены, текущий — 12 (phone 5)
  const idx12 = seasonPreviewEpisodeIndex(12);
  const idx14 = seasonPreviewEpisodeIndex(14);
  switch (state) {
    case 'cover':
      return { deck: inProgress, newcomer: false, initialState: { selectedIndex: idx12, expandedIndex: null, fanChapter: null } };
    case 'newcomer': {
      const deck = buildSeasonDeck(seasonPreviewRows(0)); // phone 6
      return { deck, newcomer: true, initialState: { selectedIndex: deck.currentIndex, expandedIndex: null, fanChapter: null } };
    }
    case 'carousel': // phone 7: карусель сдвинута на закрытый эпизод 14
      return { deck: inProgress, newcomer: false, initialState: { selectedIndex: idx14, expandedIndex: null, fanChapter: null } };
    case 'locked_open': // тап по закрытому эпизоду: раскрытая закрытая карта
      return { deck: inProgress, newcomer: false, initialState: { selectedIndex: idx14, expandedIndex: idx14, fanChapter: null } };
    case 'chapter_picker': // phone 8: «Вся глава» веером, глава 2, выбран эпизод 12
      return { deck: inProgress, newcomer: false, initialState: { selectedIndex: idx12, expandedIndex: null, fanChapter: 2 } };
    case 'exam_card': { // phone 9: глава 2 пройдена целиком, карусель на карте «Экзамен главы 2»
      const deck = buildSeasonDeck(seasonPreviewRows(16));
      return { deck, newcomer: false, initialState: { selectedIndex: seasonPreviewExamIndex(2), expandedIndex: null, fanChapter: null } };
    }
    case 'exam_open': {
      const deck = buildSeasonDeck(seasonPreviewRows(16));
      const exam = seasonPreviewExamIndex(2);
      return { deck, newcomer: false, initialState: { selectedIndex: exam, expandedIndex: exam, fanChapter: null } };
    }
  }
}

export type SeasonPreviewEpisodeInfo = Readonly<{
  title: string;
  phrase: string;
  progress: number | null;
  taskLine: string | null;
  translation: string | null;
  words: readonly string[];
  tasksCount: number | null;
}>;

/** Подписи эпизода: у текущего — «задание 6 из 20» и 30 % полоски (как в эталоне), у остальных — «20 заданий». */
export function seasonPreviewEpisodeInfo(lang: Lang, card: SeasonEpisodeCard, newcomer: boolean): SeasonPreviewEpisodeInfo {
  const ep = episodeFixture(card.sessionOrdinal);
  // новичок: текущий эпизод 1 ещё не начат — в подписи «20 заданий», полоски нет (эталон h2New)
  const current = card.state === 'current' && !newcomer;
  return {
    title: ep.title,
    phrase: ep.phrase,
    progress: current ? 0.3 : null,
    taskLine: current ? seasonText(lang, 'taskOf', { k: 6, n: ep.tasks }) : seasonTasksLabel(lang, ep.tasks),
    translation: ep.translation ?? null,
    words: ep.words ?? [],
    tasksCount: ep.tasks,
  };
}

export function seasonPreviewChapterInfo(chapterOrdinal: number): SeasonChapterInfo {
  const ch = CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, chapterOrdinal - 1))];
  return { scene: ch.scene, icon: ch.icon };
}

/** Строка под «Продолжить»: «Комплименты вслух, задание 6 из 20». */
export function seasonPreviewResumeLine(lang: Lang, deck: SeasonDeck, newcomer: boolean): string | null {
  if (newcomer) return null;
  const card = deck.cards[deck.currentIndex];
  if (!card || card.kind !== 'episode') return null;
  const ep = episodeFixture(card.sessionOrdinal);
  return `${ep.title}, ${seasonText(lang, 'taskOf', { k: 6, n: ep.tasks })}`;
}
