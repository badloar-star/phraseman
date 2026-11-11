/**
 * Экзамен уровня: авторский банк для пяти механик, которым нужен диалог или короткий текст.
 *
 * зачем (владелец 11.11.2026): «писать отдельно, но используя материалы — грамматику или слова, которые юзер уже
 * разбирал, чтобы не было жалоб "а нас такому не учили"». Из одной фразы урока диалог не построить, поэтому задания
 * этих механик написаны руками. Правило банка: КАЖДОЕ слово задания встречалось в уроках уровня или раньше.
 * Его держит сторож tests/level_exam_authored_bank.test.ts — слово вне пройденного словаря роняет тест.
 *
 * Задание пишется целиком на изучаемом языке: подпись «что сделать» и названия групп — постоянные, на языке ученика
 * (app/level_exam_expanded_copy.ts). Автор пишет ответ «как есть» (верный вариант первым, реплики по порядку) —
 * порядок на экране перемешивает сборщик по сиду попытки, чтобы место не выдавало ответ.
 *
 * Готово: английский, уровень A1 (уроки 1–8). Остальные уровни и языки пополняются отдельными партиями;
 * пока банка для уровня нет, экзамен берёт вместо этих заданий механики из фраз уроков.
 */
import type { ExpandedExercise } from '../modules/expanded-formats/types';
import { parseExpandedExercise } from '../modules/expanded-formats/validate';
import type { CourseLevel } from './course_levels';
import { levelExamExpandedCopy, type AuthoredGroupKind } from './level_exam_expanded_copy';
import { createLevelExamRng, shuffled } from './level_exam_rng';

export const AUTHORED_FORMATS = ['context_choice', 'dialogue_order', 'reply_pairs', 'classify_function', 'evidence_choice'] as const;
export type AuthoredFormat = (typeof AUTHORED_FORMATS)[number];

type Base = Readonly<{ id: string; /** Урок, к теме которого относится задание (для разбора слабых уроков). */ lessonId: number }>;

export type AuthoredExamItem =
  /** Реплика собеседника и четыре ответа: подходит только `right`. */
  | (Base & Readonly<{ format: 'context_choice'; line: string; right: string; wrong: readonly [string, string, string] }>)
  /** Четыре реплики в верном порядке; порядок обязан быть единственным возможным. */
  | (Base & Readonly<{ format: 'dialogue_order'; lines: readonly [string, string, string, string] }>)
  /** Четыре пары «вопрос — ответ»; каждый ответ подходит только своему вопросу. */
  | (Base & Readonly<{ format: 'reply_pairs'; pairs: readonly (readonly [string, string])[] }>)
  /** Реплики и номер группы (0 или 1) для каждой. */
  | (Base & Readonly<{ format: 'classify_function'; kind: AuthoredGroupKind; items: readonly (readonly [string, 0 | 1])[] }>)
  /** Короткий текст, вопрос к нему и номер предложения-ответа. */
  | (Base & Readonly<{ format: 'evidence_choice'; passage: readonly string[]; question: string; answer: number }>);

const EN_A1: readonly AuthoredExamItem[] = [
  { id: 'en:A1:reply:01', lessonId: 6, format: 'context_choice', line: 'Where do you live?', right: 'I live near the station.', wrong: ['Yes, I do.', 'At nine.', 'It is my flat.'] },
  { id: 'en:A1:reply:02', lessonId: 6, format: 'context_choice', line: 'What time does the shop open?', right: 'It opens at nine.', wrong: ['Yes, it does.', 'It is on this street.', 'At the station.'] },
  { id: 'en:A1:reply:03', lessonId: 4, format: 'context_choice', line: 'Do you accept cards?', right: 'Yes, we do.', wrong: ['Yes, we are.', 'At ten.', 'It is my card.'] },
  { id: 'en:A1:reply:04', lessonId: 2, format: 'context_choice', line: 'Is this seat free?', right: 'Yes, it is.', wrong: ['Yes, it does.', 'At home.', 'No, I do not.'] },
  { id: 'en:A1:reply:05', lessonId: 6, format: 'context_choice', line: 'When does the train leave?', right: 'It leaves at eight.', wrong: ['Yes, it does.', 'At the platform.', 'It is a long journey.'] },
  { id: 'en:A1:reply:06', lessonId: 6, format: 'context_choice', line: 'Who teaches the evening class?', right: 'My sister teaches it.', wrong: ['At eight.', 'Yes, she does.', 'In the office.'] },
  { id: 'en:A1:reply:07', lessonId: 6, format: 'context_choice', line: 'Why are you late?', right: 'My bus is late.', wrong: ['Yes, I am.', 'At nine.', 'It is my bag.'] },
  { id: 'en:A1:reply:08', lessonId: 7, format: 'context_choice', line: 'Do you have an appointment?', right: 'Yes, I do.', wrong: ['Yes, I am.', 'It is my passport.', 'At home.'] },
  { id: 'en:A1:reply:09', lessonId: 8, format: 'context_choice', line: 'When does the film start?', right: 'It starts at seven.', wrong: ['Yes, it does.', 'In the park.', 'It is a short film.'] },
  { id: 'en:A1:reply:10', lessonId: 6, format: 'context_choice', line: 'How do you go to work?', right: 'I go by bus.', wrong: ['I go at eight.', 'Yes, I do.', 'I work in an office.'] },

  { id: 'en:A1:order:01', lessonId: 6, format: 'dialogue_order', lines: ['A: Where do you work?', 'B: I work in a cafe.', 'A: When does it open?', 'B: It opens at seven.'] },
  { id: 'en:A1:order:02', lessonId: 7, format: 'dialogue_order', lines: ['A: Do you have a car?', 'B: No, I have a bicycle.', 'A: Where do you keep it?', 'B: I keep it in the garden.'] },
  { id: 'en:A1:order:03', lessonId: 6, format: 'dialogue_order', lines: ['A: What do you study?', 'B: I study English.', 'A: Who teaches it?', 'B: My sister teaches it.'] },
  { id: 'en:A1:order:04', lessonId: 6, format: 'dialogue_order', lines: ['A: Is the shop open?', 'B: No, it is closed.', 'A: When does it open?', 'B: It opens at nine.'] },
  { id: 'en:A1:order:05', lessonId: 3, format: 'dialogue_order', lines: ['A: Do you live alone?', 'B: No, I share a flat.', 'A: Where is it?', 'B: It is near the station.'] },
  { id: 'en:A1:order:06', lessonId: 7, format: 'dialogue_order', lines: ['A: Do you have a pen?', 'B: Yes, I have two.', 'A: Which colour are they?', 'B: They are blue.'] },

  { id: 'en:A1:pairs:01', lessonId: 6, format: 'reply_pairs', pairs: [['Where do you live?', 'Near the station.'], ['When do you start work?', 'At eight.'], ['Do you speak English?', 'Yes, I do.'], ['Is the cafe open?', 'No, it is closed.']] },
  { id: 'en:A1:pairs:02', lessonId: 6, format: 'reply_pairs', pairs: [['Who has the keys?', 'My sister.'], ['Which bus goes to the centre?', 'Bus number nine.'], ['Why is the room cold?', 'The window is open.'], ['Are you ready?', 'Yes, I am.']] },
  { id: 'en:A1:pairs:03', lessonId: 8, format: 'reply_pairs', pairs: [['When is your birthday?', 'In July.'], ['What time is the concert?', 'At seven.'], ['Does the bakery open on Sundays?', 'No, it does not.'], ['Where is the market?', 'Near the park.']] },
  { id: 'en:A1:pairs:04', lessonId: 4, format: 'reply_pairs', pairs: [['Is this your bag?', 'No, it is her bag.'], ['Do they work together?', 'Yes, they do.'], ['Does he drive?', 'No, he does not.'], ['Are the seats free?', 'Yes, they are.']] },
  { id: 'en:A1:pairs:05', lessonId: 6, format: 'reply_pairs', pairs: [['What do you want?', 'A coffee.'], ['Where is the lift?', 'Near the stairs.'], ['When does the shift finish?', 'At midnight.'], ['Who is the manager?', 'My colleague.']] },

  { id: 'en:A1:groups:01', lessonId: 8, format: 'classify_function', kind: 'when_where', items: [['At nine.', 0], ['At home.', 1], ['On Friday.', 0], ['Near the park.', 1]] },
  { id: 'en:A1:groups:02', lessonId: 8, format: 'classify_function', kind: 'when_where', items: [['In July.', 0], ['In the kitchen.', 1], ['After lunch.', 0], ['At the station.', 1]] },
  { id: 'en:A1:groups:03', lessonId: 8, format: 'classify_function', kind: 'when_where', items: [['Before midnight.', 0], ['On the balcony.', 1], ['Every morning.', 0], ['In the garden.', 1]] },
  { id: 'en:A1:groups:04', lessonId: 1, format: 'classify_function', kind: 'one_many', items: [['The door is open.', 0], ['The doors are open.', 1], ['This seat is free.', 0], ['These seats are free.', 1]] },
  { id: 'en:A1:groups:05', lessonId: 3, format: 'classify_function', kind: 'one_many', items: [['My sister works here.', 0], ['They work here.', 1], ['The shop opens at nine.', 0], ['The shops open at nine.', 1]] },
  { id: 'en:A1:groups:06', lessonId: 4, format: 'classify_function', kind: 'one_many', items: [['She has a ticket.', 0], ['We have tickets.', 1], ['The train is late.', 0], ['The buses are late.', 1]] },

  { id: 'en:A1:text:01', lessonId: 3, format: 'evidence_choice', passage: ['My sister works in a cafe.', 'She starts at seven.', 'She walks to work.'], question: 'When does she start work?', answer: 1 },
  { id: 'en:A1:text:02', lessonId: 8, format: 'evidence_choice', passage: ['The shop is closed today.', 'It opens on Monday.', 'The cafe is open.'], question: 'When does the shop open?', answer: 1 },
  { id: 'en:A1:text:03', lessonId: 6, format: 'evidence_choice', passage: ['I live near the station.', 'I go to work by bus.', 'The journey is short.'], question: 'Where do I live?', answer: 0 },
  { id: 'en:A1:text:04', lessonId: 4, format: 'evidence_choice', passage: ['The room is cold.', 'The window is open.', 'The heating is off.'], question: 'Is the heating on?', answer: 2 },
  { id: 'en:A1:text:05', lessonId: 8, format: 'evidence_choice', passage: ['The concert is on Friday.', 'It starts at seven.', 'The tickets are on sale.'], question: 'Which day is the concert?', answer: 0 },
  { id: 'en:A1:text:06', lessonId: 7, format: 'evidence_choice', passage: ['He has a headache.', 'He needs an appointment.', 'He does not go to work today.'], question: 'Why does he need an appointment?', answer: 0 },
];

const BANK: Readonly<Record<string, Readonly<Partial<Record<CourseLevel, readonly AuthoredExamItem[]>>>>> = {
  en: { A1: EN_A1 },
};

/** Авторские задания языка и уровня; пусто — банк для них ещё не написан. */
export function authoredExamItems(studyTarget: string, level: CourseLevel): readonly AuthoredExamItem[] {
  return BANK[studyTarget]?.[level] ?? [];
}

/** Все тексты задания на изучаемом языке — по ним сторож сверяет словарь пройденных уроков. */
export function authoredItemTexts(item: AuthoredExamItem): string[] {
  switch (item.format) {
    case 'context_choice': return [item.line, item.right, ...item.wrong];
    // зачем: метки «A:» / «B:» — не слова курса, в сверку словаря не идут
    case 'dialogue_order': return item.lines.map((line) => line.replace(/^[AB]:\s*/u, ''));
    case 'reply_pairs': return item.pairs.flat();
    case 'classify_function': return item.items.map(([text]) => text);
    case 'evidence_choice': return [...item.passage, item.question];
  }
}

export type AuthoredExamDraft = Readonly<{
  format: AuthoredFormat;
  instruction: string;
  prompt: string;
  context: string;
  exercise: ExpandedExercise;
}>;

/** Задание из авторской записи: порядок вариантов — по сиду попытки. `null` — запись не прошла проверку формы. */
export function buildAuthoredExamDraft(item: AuthoredExamItem, seedKey: string, sourceLocale: string): AuthoredExamDraft | null {
  const rng = (salt: string) => createLevelExamRng(`${seedKey}:${item.id}:${salt}`);
  const copy = levelExamExpandedCopy(sourceLocale);
  const done = (raw: Record<string, unknown>, prompt: string): AuthoredExamDraft | null => {
    const parsed = parseExpandedExercise(item.format, raw, 'en');
    return parsed.ok ? { format: item.format, instruction: copy.instruction[item.format], prompt, context: '', exercise: parsed.exercise } : null;
  };

  switch (item.format) {
    case 'context_choice': {
      const options = shuffled([item.right, ...item.wrong], rng('options'));
      return done({ options, key: options.indexOf(item.right) }, item.line);
    }
    case 'dialogue_order': {
      const bank = shuffled(item.lines.map((text, index) => ({ text, index })), rng('bank'));
      return done({ bank: bank.map((line) => line.text), key: item.lines.map((_line, index) => bank.findIndex((line) => line.index === index)) }, copy.prompt.dialogue_order);
    }
    case 'reply_pairs': {
      const replies = shuffled(item.pairs.map(([, reply], index) => ({ reply, index })), rng('replies'));
      return done({
        questions: item.pairs.map(([question]) => question),
        replies: replies.map((entry) => entry.reply),
        key: item.pairs.map((_pair, index) => replies.findIndex((entry) => entry.index === index)),
      }, copy.prompt.reply_pairs);
    }
    case 'classify_function': {
      const items = shuffled(item.items, rng('items'));
      const group = copy.groups[item.kind];
      return done({ items: items.map(([text]) => text), groups: [...group.labels], key: items.map(([, at]) => at) }, group.prompt);
    }
    case 'evidence_choice':
      // зачем: предложения текста не перемешиваются — текст должен читаться связно; варианты идут в порядке текста
      return done({ passage: item.passage.join(' '), options: [...item.passage], key: item.answer }, item.question);
  }
}

// зачем: файл лежит в app/ — expo-router ждёт экспорт по умолчанию у каждого файла (как у level_exam_gap_rules)
export default function __RouteShim() { return null; }
