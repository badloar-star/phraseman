// зачем (владелец 01.10 и 18.10 07:45: «полноэкранных экранов-ошибок НИГДЕ быть не должно»; правило
// C:/Temp/claude/no_error_screens_rule.txt п.1): когда у экрана нет его объекта (не найден, закрыт, язык не открыт,
// не собрался) — не рисуем ошибку, а один раз тихо уходим назад или в хаб раздела. Причина обязательно в журнал
// с единым префиксом [NO-ERROR-SCREEN], иначе уход становится немым багом.
import { useEffect, useRef } from 'react';

export const NO_ERROR_SCREEN_LOG = '[NO-ERROR-SCREEN]';

/**
 * Пока `active` — один раз (после первого кадра) вызывает `leave` и пишет причину. Повторные рендеры и смена
 * `leave`/`reason` второго ухода не дают. Если `active` снова станет false — признак сбрасывается.
 */
export function useSilentLeave(active: boolean, screen: string, reason: string, leave: () => void): void {
  const leftRef = useRef(false);
  const leaveRef = useRef(leave);
  leaveRef.current = leave;
  useEffect(() => {
    if (!active) {
      leftRef.current = false;
      return;
    }
    if (leftRef.current) return;
    leftRef.current = true;
    console.warn(`${NO_ERROR_SCREEN_LOG} screen=${screen} reason=${reason} shown=silent_leave`); // guard-ok: причина ухода называется всегда
    leaveRef.current();
  }, [active, reason, screen]);
}
