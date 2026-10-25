// chapter_exam_v2_dev_presets.ts — снимки состояний экзамена главы v2 для dev-ссылки /dev_chapter_exam_v2_preview (только разработка).
// зачем (координатор 25.10): Сверке нельзя проходить экзамен на тестовом аккаунте (это запись экзамена), а склейка «прототип | эмулятор»
// решает, включён ли экзамен v2 в OTA. Снимок собирается из НАСТОЯЩЕГО банка главы (те же подбор и подсчёт, что в бою), отдельных моков нет.
// Боевой код этот файл не импортирует (сторож tests/chapter_exam_v2_dev_preview_contract.test.ts).
import { chapterExamV2BankFor } from '../../../app/learning_v2_chapter_exam_v2';
import {
  checkChapterExamV2Answer,
  scoreChapterExamV2,
  selectChapterExamV2Items,
  type ChapterExamV2Bank,
  type ChapterExamV2Item,
  type ChapterExamV2ItemType,
  type ChapterExamV2Result,
  type ChapterExamV2WeakPoint,
} from '../../../modules/learning-v2/exam/chapter_exam_v2';
import type { ChapterExamV2AnswerRecord } from './ChapterExamV2Question';

export const CHAPTER_EXAM_V2_DEV_STATES = [
  'start', 'situation', 'situation_write', 'dialogue', 'fix',
  'answer_correct', 'answer_typo', 'answer_wrong',
  'result_pass', 'result_fail', 'mistakes', 'review', 'cooldown',
] as const;
export type ChapterExamV2DevState = (typeof CHAPTER_EXAM_V2_DEV_STATES)[number];
export const isChapterExamV2DevState = (value: unknown): value is ChapterExamV2DevState =>
  typeof value === 'string' && (CHAPTER_EXAM_V2_DEV_STATES as readonly string[]).includes(value);

export type ChapterExamV2DevPhase = 'question' | 'result' | 'mistakes' | 'review';
export type ChapterExamV2DevPreset = Readonly<{
  state: ChapterExamV2DevState;
  bank: ChapterExamV2Bank;
  /** null — попытки нет (пауза пересдачи: экран открыт раньше часа). */
  attempt: Readonly<{ examKey: string; attempt: number; items: readonly ChapterExamV2Item[] }> | null;
  index: number;
  answers: readonly ChapterExamV2AnswerRecord[];
  writeMode: boolean;
  phase: ChapterExamV2DevPhase;
  outcome: Readonly<{ result: ChapterExamV2Result; startEpisode: number | null; retryMinutes: number | null }> | null;
  reward: number | null;
  review: Readonly<{ weak: readonly ChapterExamV2WeakPoint[]; episodes: readonly number[]; done: readonly number[] }> | null;
  /** Ответ, который вопрос `index` покажет уже проверенным (верно / опечатка / неверно). */
  initialAnswerText: string | null;
}>;

const DEV_LESSON = 1;
/** Сдал: 9 из 10 (одна ошибка — есть «Разбор ошибки»). Не сдал: 6 из 10 — «Почти получилось» и до 3 тем. */
const PASS_WRONG = 1;
const FAIL_WRONG = 4;
/** Пауза пересдачи: столько минут осталось (как «Пересдать через 59 мин» в прототипе). */
const RETRY_MINUTES = 59;
/** Глава после сдачи начинается с этого эпизода (8 эпизодов в главе). */
const firstEpisodeOf = (chapter: number): number => chapter * 8 + 1;

const typeOf = (state: ChapterExamV2DevState): ChapterExamV2ItemType =>
  state === 'dialogue' ? 'dialogue' : state === 'fix' || state === 'answer_wrong' ? 'fix' : 'situation';

/** Неверный ответ: для «исправь» — сама фраза с ошибкой (человек ничего не поправил), иначе — заведомо чужая фраза. */
const wrongText = (item: ChapterExamV2Item): string => (item.type === 'fix' && item.wrong ? item.wrong : 'I no understand');

/** Пропущенная буква в длинном слове — проверка засчитывает «Верно. Опечатка…»; не вышло — null. */
function typoText(item: ChapterExamV2Item): string | null {
  const words = (item.accepted[0] ?? '').split(' ');
  for (let w = 0; w < words.length; w += 1) {
    const word = words[w] as string;
    if (!/^[a-z]{5,}/iu.test(word)) continue;
    const typo = [...words.slice(0, w), `${word.slice(0, 2)}${word.slice(3)}`, ...words.slice(w + 1)].join(' ');
    const verdict = checkChapterExamV2Answer(item, typo);
    if (verdict.correct && verdict.typo) return typo;
  }
  return null;
}

function answersFor(items: readonly ChapterExamV2Item[], wrongCount: number): ChapterExamV2AnswerRecord[] {
  return items.map((item, i) => {
    // ошибки — в последних вопросах: так разбор и слабые темы показывают разные типы заданий
    const wrong = i >= items.length - wrongCount;
    const text = wrong ? wrongText(item) : item.accepted[0] ?? '';
    const verdict = checkChapterExamV2Answer(item, text);
    return { itemId: item.id, grammarPoint: item.grammarPoint, text, correct: verdict.correct, typo: verdict.typo, matched: verdict.matched };
  });
}

/** Снимок состояния для главы 1–3 урока 1; null — банка главы нет. */
export function chapterExamV2DevPreset(state: ChapterExamV2DevState, chapterOrdinal: number): ChapterExamV2DevPreset | null {
  const bank = chapterExamV2BankFor(DEV_LESSON, chapterOrdinal);
  if (!bank) return null;
  const examKey = `dev-preview:l${DEV_LESSON}-c${chapterOrdinal}`;
  const items = selectChapterExamV2Items(bank, { examKey, attempt: 1 });
  if (!items) return null;
  const base = { state, bank, writeMode: false, reward: null, review: null, initialAnswerText: null } as const;
  const attempt = { examKey, attempt: 1, items };

  if (state === 'result_pass' || state === 'result_fail' || state === 'mistakes' || state === 'review' || state === 'cooldown') {
    const passed = state === 'result_pass';
    const answers = answersFor(items, passed ? PASS_WRONG : FAIL_WRONG);
    const result = scoreChapterExamV2(bank, answers);
    const review = passed ? null : { weak: result.weakPoints, episodes: [...new Set(result.weakPoints.flatMap((w) => w.episodeOrdinals))].sort((a, b) => a - b), done: [] };
    if (state === 'cooldown') {
      // как в бою (prepareChapterExamV2 → kind 'cooldown'): попытки нет, сразу «Повтори эти темы», итог пустой
      return { ...base, attempt: null, index: 0, answers: [], phase: 'review', review,
        outcome: { result: { correct: 0, total: 0, passed: false, weakPoints: result.weakPoints }, startEpisode: null, retryMinutes: RETRY_MINUTES } };
    }
    return { ...base, attempt, index: items.length - 1, answers, review, reward: passed ? 40 : null,
      phase: state === 'mistakes' ? 'mistakes' : state === 'review' ? 'review' : 'result',
      outcome: { result, startEpisode: passed ? firstEpisodeOf(chapterOrdinal) : null, retryMinutes: passed ? null : RETRY_MINUTES } };
  }

  // вопрос: нужный тип ставим текущим, а предыдущие вопросы считаем отвеченными верно (прогресс как на середине экзамена)
  const wantType = typeOf(state);
  // опечатка возможна только в слове от 5 букв — берём первое задание, где она получается
  const typoIndex = items.findIndex((i) => typoText(i) !== null);
  const index = state === 'start' ? 0
    : state === 'answer_typo' && typoIndex >= 0 ? typoIndex
      : Math.max(0, items.findIndex((i) => i.type === wantType));
  const item = items[index] as ChapterExamV2Item;
  const answers = answersFor(items.slice(0, index), 0);
  const initialAnswerText = state === 'answer_correct' ? item.accepted[0] ?? null
    : state === 'answer_typo' ? typoText(item) ?? item.accepted[0] ?? null
      : state === 'answer_wrong' ? wrongText(item) : null;
  return { ...base, attempt, index, answers, phase: 'question', outcome: null, writeMode: state === 'situation_write', initialAnswerText };
}
