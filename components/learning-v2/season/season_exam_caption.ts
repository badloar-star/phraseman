// ═══════════════════════════════════════════════════════════════════════════
// season_exam_caption.ts — подпись под каруселью у карты «Экзамен главы» по состоянию экзамена (эталон chapter-exam-season.html, ex1).
//
// зачем (координатор 24.10: «экзамен идёт в выпуск, если совпадёт с эталоном»; правка владельца 22.10 №10): три состояния эталона —
// можно сдать (avail), пауза после провала (pause), сдан (pass) — каждое со своим кикером, заголовком, кнопкой и строкой. Чистая
// функция: тексты и выбор кнопки; что делает кнопка, решает экран.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { seasonCardText } from './season_copy_card';
import { seasonText } from './season_copy';

export type SeasonExamStatus =
  | Readonly<{ state: 'available' }>
  | Readonly<{ state: 'cooldown'; lastCorrect: number; minutesLeft: number }>
  | Readonly<{ state: 'passed'; correct: number }>;

export type SeasonExamCaptionAction = Readonly<{ kind: 'open' | 'toChapter'; label: string; icon: 'trophy' | 'play'; chapter: number | null }>;

export type SeasonExamCaption = Readonly<{ kicker: string; title: string; action: SeasonExamCaptionAction | null; note: string | null }>;

export type SeasonExamCaptionInput = Readonly<{
  lang: Lang;
  chapterOrdinal: number;
  chapterCount: number;
  status: SeasonExamStatus;
  /** Можно ли начать экзамен (флаг запуска); нет — у «можно сдать» ни кнопки, ни строки. */
  canStart: boolean;
  questions: number;
  passFrom: number;
  /** Эпизоды следующей главы (первый–последний) — для «Эпизоды A–B открыты»; нет — строки нет. */
  nextRange: Readonly<{ a: number; b: number }> | null;
}>;

export function seasonExamCaption(i: SeasonExamCaptionInput): SeasonExamCaption {
  const next = i.chapterOrdinal < i.chapterCount ? i.chapterOrdinal + 1 : null;
  const examTitle = seasonText(i.lang, 'exam');
  if (i.status.state === 'cooldown') {
    // эталон capX('pause'): «Попытка: 9 из 12, нужно 10» / «Пересдать через 59 мин» / «Пересдать можно через час после попытки»
    return {
      kicker: seasonCardText(i.lang, 'examAttempt', { c: i.status.lastCorrect, q: i.questions, p: i.passFrom }),
      title: seasonCardText(i.lang, 'examRetakeIn', { m: i.status.minutesLeft }),
      action: null,
      note: seasonCardText(i.lang, 'examRetakeNote'),
    };
  }
  if (i.status.state === 'passed') {
    // эталон capX('pass'): «Экзамен сдан, 11 из 12» / «Глава 3 открыта» / «К главе 3» / «Начнём с эпизода 13»
    const kicker = seasonCardText(i.lang, 'examPassed', { c: i.status.correct, q: i.questions });
    if (next === null) return { kicker, title: examTitle, action: null, note: null };
    return {
      kicker,
      title: seasonCardText(i.lang, 'examChapterOpen', { n: next }),
      action: { kind: 'toChapter', label: seasonCardText(i.lang, 'examToChapter', { n: next }), icon: 'play', chapter: next },
      note: i.nextRange ? seasonCardText(i.lang, 'examPassedNote', { a: i.nextRange.a, b: i.nextRange.b }) : null,
    };
  }
  // эталон capX('avail'): «Финал главы 2, можно сдать заранее» / «Экзамен главы» / «Сдать экзамен» / «Сдашь — откроется глава 3»
  const kicker = seasonCardText(i.lang, 'examKickerEarly', { n: i.chapterOrdinal });
  if (!i.canStart) return { kicker, title: examTitle, action: null, note: null };
  return {
    kicker,
    title: examTitle,
    action: { kind: 'open', label: seasonCardText(i.lang, 'startExam'), icon: 'trophy', chapter: null },
    // зачем (координатор 25.10, макет): «· 12 вопросов, сдать от 10» — служебная кухня, в подписи только «Сдашь — откроется глава N»
    note: next !== null ? seasonCardText(i.lang, 'examOpens', { n: next }) : null,
  };
}
