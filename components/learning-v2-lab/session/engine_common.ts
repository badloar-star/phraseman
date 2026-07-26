// зачем: общий контракт движков карточек (перенос source/src/session/engines/common.ts).
// Раннер владеет вердиктом и лестницей подсказок, движок — только вводом.
import type { OutcomeId } from './contracts';

export interface EngineProps {
  /** Ввод заблокирован: проверка / резолв / показ ответа / переход. */
  readonly locked: boolean;
  /** Вердикт для подсветки; null пока отвечают. */
  readonly resolved: 'correct' | 'wrong' | null;
  /** Ступень 3: показать правильный ответ. */
  readonly showAnswer: boolean;
  /** Инкремент очищает локальный ввод движка. */
  readonly resetEpoch: number;
  /** Инкремент перезапускает тряску после неверного ответа. */
  readonly shakeEpoch: number;
  /** Поднимает «готов к проверке» — до этого кнопка неактивна. */
  readonly onReady: (ready: boolean) => void;
  /** Самопроверяющиеся движки (match, dialogue) сообщают о промахе. */
  readonly onWrong: () => void;
  /** Самозавершающиеся движки сообщают о завершении. */
  readonly onAutoComplete: (outcomeHint?: OutcomeId) => void;
  /** Презентационные интенты движка. */
  readonly onIntent: (type: string, payload: Record<string, unknown>) => void;
}
