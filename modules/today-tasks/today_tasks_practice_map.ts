// зачем (D49, «Сегодня»): какой тип задания дня засчитывает правильный ответ в
// практике (hooks/usePracticeRunes.ts → onCorrectAnswer). Строки активностей —
// те же, что PracticeRuneActivity (app/practice_rune_earnings.ts); тип строкой,
// чтобы модуль не тянул граф кошелька в тесты.
//   • flashcards_blitz / flashcards_training / speaking_practice — тренировки
//     карточек (блиц, вспоминание+свайп/верно-неверно, произношение) → 'cards';
//   • mistake_practice — «Мои ошибки» → 'mistakes';
//   • lesson / vocabulary / irregular_verbs — НЕ засчитывают ответами: урок
//     засчитывается целиком на экране итога (lesson_complete / Learning V2).
import type { TodayTaskKindCore } from './today_tasks_core';

const PRACTICE_TO_TODAY: Readonly<Record<string, TodayTaskKindCore>> = Object.freeze({
  flashcards_blitz: 'cards',
  flashcards_training: 'cards',
  speaking_practice: 'cards',
  mistake_practice: 'mistakes',
});

export function todayTaskKindForPracticeActivity(activity: string): TodayTaskKindCore | null {
  return PRACTICE_TO_TODAY[activity] ?? null;
}
