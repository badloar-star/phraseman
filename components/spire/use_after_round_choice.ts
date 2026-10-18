// use_after_round_choice.ts — (лежит в components/spire, а не в moments: им пользуется и запасная плашка итога, а экран не импортирует папку моментов) выбор после ступени Пика: «Следующее задание» (новая ступень через отсчёт 3-2-1) или «В раздел Пик» (закрыть итог).
//
// зачем (владелец 18.10 через координатора, вариант (а)): после ступени человек сам решает, идти ли дальше — никакого автоперехода. «Следующее задание» зовёт прежний подъём (climb → startStep → отсчёт 3-2-1),
// «В раздел Пик» — прежнее закрытие итога (dismissOutcome); правила ступени, таймер и энергию не трогаем. Нехватка энергии на следующую ступень разбирается самим startStep (тот же лист «нет энергии», что и раньше) — тупика нет.
// Защита от двойного тапа: второй тап в течение 700 мс после принятого игнорируется (и пока идёт запуск — busy), но окно НЕ запирается навсегда: если запуск отказал, а итог остался, повторный тап через 0,7 с снова работает.
// Вибрацию даёт сама кнопка (V2Pressable) — здесь её не дублируем. Журнал [SPIRE-AFTER-ROUND]: показ, выбор, значение, которое его решило, что открылось, игнорированные тапы.
import { useCallback, useEffect, useRef } from 'react';
import type { SpireStepOutcome } from '../../app/spire/use_spire_game';

export type AfterRoundChoice = 'next' | 'toSpire';

/** Окно, в котором повторный тап после принятого считается двойным, мс. */
export const AFTER_ROUND_DOUBLE_TAP_MS = 700;

type Args = Readonly<{
  outcome: SpireStepOutcome;
  busy: boolean | undefined;
  onNext: () => void;
  onLater: () => void;
}>;

export function useAfterRoundChoice({ outcome, busy, onNext, onLater }: Args): Readonly<{ next: () => void; toSpire: () => void }> {
  const shownAtRef = useRef(Date.now());
  const lastAcceptedRef = useRef(0);
  const argsRef = useRef({ outcome, busy, onNext, onLater });
  argsRef.current = { outcome, busy, onNext, onLater };

  useEffect(() => {
    console.log(`[SPIRE-AFTER-ROUND] показ kind=${outcome.kind} floorBefore=${outcome.floorBefore} busy=${String(Boolean(busy))}`); // guard-ok: единичный лог показа выбора
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: один показ — одна строка
  }, []);

  const choose = useCallback((choice: AfterRoundChoice) => {
    const now = Date.now();
    const a = argsRef.current;
    const sinceShown = now - shownAtRef.current;
    const sinceLast = lastAcceptedRef.current === 0 ? null : now - lastAcceptedRef.current;
    if (sinceLast !== null && sinceLast < AFTER_ROUND_DOUBLE_TAP_MS) {
      console.log(`[SPIRE-AFTER-ROUND] игнор двойного тапа choice=${choice} sinceLastAcceptedMs=${sinceLast} окно=${AFTER_ROUND_DOUBLE_TAP_MS}`); // guard-ok: ранний выход с причиной
      return;
    }
    if (choice === 'next' && a.busy) {
      console.log(`[SPIRE-AFTER-ROUND] игнор: запуск уже идёт choice=next busy=true kind=${a.outcome.kind}`); // guard-ok: ранний выход с причиной
      return;
    }
    lastAcceptedRef.current = now;
    if (choice === 'next') {
      console.log(`[SPIRE-AFTER-ROUND] выбор=next kind=${a.outcome.kind} sinceShownMs=${sinceShown} → onNext(): новая ступень, перед ней отсчёт 3-2-1 (нет энергии — лист «нет энергии»)`); // guard-ok: выбор и что откроется
      a.onNext();
      return;
    }
    console.log(`[SPIRE-AFTER-ROUND] выбор=toSpire kind=${a.outcome.kind} sinceShownMs=${sinceShown} → onLater(): итог закрыт, главный экран Пика`); // guard-ok: выбор и что откроется
    a.onLater();
  }, []);

  const next = useCallback(() => choose('next'), [choose]);
  const toSpire = useCallback(() => choose('toSpire'), [choose]);
  return { next, toSpire };
}
