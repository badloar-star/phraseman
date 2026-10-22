// ════════════════════════════════════════════════════════════════════════════
// season_course_model.ts — колода карт «Сезона» из текущего прогресса курса (эталон course-hybrid-1-4.html, «Способ 2»).
//
// зачем (владелец 21.10): карусель листает карты эпизодов; «Экзамен главы» — отдельная последняя карта главы, за ней идут карты следующей главы.
// Решение владельца (через координатора): экзамен главы ОТДЕЛЬНО от 8-го занятия — 8-е занятие («Проверка главы») остаётся обычным эпизодом, а
// 9-я карта — экзамен (эталон chapter-exam-season.html). Экзамен — не строка прогресса, а производная карта: она появляется после последнего
// занятия каждой главы, доступна, когда все занятия главы пройдены, и НЕ влияет ни на «текущий эпизод», ни на счётчик «n из 8».
// Модель чистая: берёт строки-занятия, которые уже строит course_accordion_map_model_v1 из прогресса (completedSessionIds + currentSessionId), и ничего
// не читает из сети и хранилища — новых чтений Firebase нет. Состояния сводятся к трём, как в эталоне: пройден / текущий / закрыт; занятие «следующее»
// (next) в приложении недоступно, поэтому на карте оно «закрыто» (замок), как и раньше на карте глав (открываются только completed и current).
// ════════════════════════════════════════════════════════════════════════════
import type {
  LearningV2AccordionSessionStateV1,
  LearningV2CourseAccordionRowV1,
} from '../../../modules/learning-v2/map/course_accordion_map_model_v1';

export type SeasonCardState = 'done' | 'current' | 'locked';

type SessionRow = Extract<LearningV2CourseAccordionRowV1, { kind: 'session' }>;

type CardBase = Readonly<{
  id: string;
  lessonOrdinal: number;
  /** Эпизод: номер занятия. Экзамен: номер последнего занятия своей главы (для порядка и подписей). */
  sessionOrdinal: number;
  chapterOrdinal: number;
  positionInChapter: number;
  state: SeasonCardState;
  /** Состояние занятия из карты курса как есть (onSessionPress получает его). У экзамена — производное: current при всех пройденных, иначе locked. */
  sourceState: LearningV2AccordionSessionStateV1;
}>;

export type SeasonEpisodeCard = CardBase & Readonly<{ kind: 'episode' }>;
export type SeasonExamCard = CardBase & Readonly<{ kind: 'exam' }>;
export type SeasonCard = SeasonEpisodeCard | SeasonExamCard;

export type SeasonChapterSpan = Readonly<{
  chapterOrdinal: number;
  /** Индексы карт главы в колоде (включая карту экзамена). */
  firstIndex: number;
  lastIndex: number;
  /** Пройдено занятий главы и всего занятий (экзамен не считается): «3 из 8». */
  doneCount: number;
  total: number;
}>;

export type SeasonDeck = Readonly<{
  cards: readonly SeasonCard[];
  chapters: readonly SeasonChapterSpan[];
  /** Индекс текущего ЭПИЗОДА; нет текущего — первый закрытый эпизод; всё пройдено — последняя карта-эпизод. Экзамен сюда не попадает. */
  currentIndex: number;
}>;

export function seasonCardState(source: LearningV2AccordionSessionStateV1): SeasonCardState {
  if (source === 'completed') return 'done';
  if (source === 'current') return 'current';
  return 'locked';
}

/** Колода карт урока: строки-занятия по порядку, после последнего занятия каждой главы — карта экзамена; другие строки (урок, глава) пропускаются. */
// зачем (Сверка 22.10, ss_side_9; координатор): пока экзамена главы нет в курсе (SEASON_CHAPTER_EXAM_ENABLED = false), карту «Экзамен главы» показывать нельзя — она вела в пустоту и
// дублировала подпись. Вызывающий передаёт includeExam: SEASON_CHAPTER_EXAM_ENABLED; без параметра экзамен кладётся (чистая модель, тесты эталона).
export function buildSeasonDeck(rows: readonly LearningV2CourseAccordionRowV1[], options: Readonly<{ includeExam?: boolean }> = {}): SeasonDeck {
  const includeExam = options.includeExam !== false;
  const sessions = rows
    .filter((row): row is SessionRow => row.kind === 'session')
    .slice()
    .sort((a, b) => a.sessionOrdinal - b.sessionOrdinal);

  const cards: SeasonCard[] = [];
  const chapters: SeasonChapterSpan[] = [];
  const flushExam = (chapterRows: readonly SessionRow[]): void => {
    if (!includeExam || chapterRows.length === 0) return;
    const last = chapterRows[chapterRows.length - 1];
    const allDone = chapterRows.every((row) => row.state === 'completed');
    cards.push({
      kind: 'exam',
      id: `exam:lesson-${String(last.lessonOrdinal).padStart(2, '0')}:chapter-${last.chapterOrdinal}`,
      lessonOrdinal: last.lessonOrdinal,
      sessionOrdinal: last.sessionOrdinal,
      chapterOrdinal: last.chapterOrdinal,
      positionInChapter: chapterRows.length + 1,
      state: allDone ? 'current' : 'locked',
      sourceState: allDone ? 'current' : 'locked',
    });
  };

  let group: SessionRow[] = [];
  const closeGroup = (): void => {
    if (group.length === 0) return;
    const firstIndex = cards.length - group.length;
    flushExam(group);
    chapters.push({
      chapterOrdinal: group[0].chapterOrdinal,
      firstIndex,
      lastIndex: cards.length - 1,
      doneCount: group.filter((row) => row.state === 'completed').length,
      total: group.length,
    });
    group = [];
  };
  for (const row of sessions) {
    if (group.length > 0 && group[0].chapterOrdinal !== row.chapterOrdinal) closeGroup();
    group.push(row);
    cards.push({
      kind: 'episode',
      id: row.id,
      lessonOrdinal: row.lessonOrdinal,
      sessionOrdinal: row.sessionOrdinal,
      chapterOrdinal: row.chapterOrdinal,
      positionInChapter: row.positionInChapter,
      state: seasonCardState(row.state),
      sourceState: row.state,
    });
  }
  closeGroup();

  const episodeIndexes = cards.map((card, index) => (card.kind === 'episode' ? index : -1)).filter((index) => index >= 0);
  const current = episodeIndexes.find((index) => cards[index].state === 'current');
  const firstLocked = episodeIndexes.find((index) => cards[index].state === 'locked');
  const currentIndex = current !== undefined ? current : firstLocked !== undefined ? firstLocked : episodeIndexes.length > 0 ? episodeIndexes[episodeIndexes.length - 1] : 0;
  return { cards, chapters, currentIndex };
}

/** Глава, к которой относится карта с индексом `index` (для заголовка «Глава N из 7»). */
export function seasonChapterOfIndex(deck: SeasonDeck, index: number): SeasonChapterSpan | null {
  return deck.chapters.find((chapter) => index >= chapter.firstIndex && index <= chapter.lastIndex) ?? null;
}

/**
 * Подсказка закрытой карты: «Откроется после эпизода N» — номер ближайшего ПРЕДЫДУЩЕГО эпизода, который ещё не пройден (карты экзамена пропускаются).
 * Если все предыдущие пройдены (карта «следующая»), подсказка — текущий эпизод. null — подсказки нет (карта не закрыта или перед ней нет эпизодов).
 */
export function seasonUnlockAfter(deck: SeasonDeck, index: number): number | null {
  const card = deck.cards[index];
  if (!card || card.state !== 'locked') return null;
  for (let i = index - 1; i >= 0; i -= 1) {
    const previous = deck.cards[i];
    if (previous.kind === 'episode' && previous.state !== 'done') return previous.sessionOrdinal;
  }
  return null;
}

/** Сколько занятий главы пройдено — для строки «3 из 8» над каруселью (экзамен не считается). */
export function seasonChapterProgress(deck: SeasonDeck, chapterOrdinal: number): Readonly<{ done: number; total: number }> {
  const span = deck.chapters.find((chapter) => chapter.chapterOrdinal === chapterOrdinal);
  return span ? { done: span.doneCount, total: span.total } : { done: 0, total: 0 };
}
