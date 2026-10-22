// ═══════════════════════════════════════════════════════════════════════════
// scene_touch_trace.ts — [SCENE-TOUCH]: кто получает касание (только dev).
//
// зачем (🔴 владелец 22.10: «в сценах ничего не нажимается» — Диалоги, Пик; правило «сперва логи»): onTouchStart срабатывает у
// вида, внутри которого началось касание, и не участвует в выборе ответчика — поведение не меняется. Если корень приложения
// касания не видит, его забирает отдельное окно (Modal поверх всего); если корень видит, а сцена/кнопка нет — перекрывающий слой.
// ═══════════════════════════════════════════════════════════════════════════
import type { GestureResponderEvent } from 'react-native';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__ === true;

type TouchStartHandler = (event: GestureResponderEvent) => void;

const noop: TouchStartHandler = () => undefined;

/** Обработчик onTouchStart с логом места касания; в стор-сборке — пустая функция. */
export function sceneTouchTrace(where: string, extra?: () => Readonly<Record<string, unknown>>): TouchStartHandler {
  if (!IS_DEV) return noop;
  return (event) => {
    const n = event.nativeEvent;
    console.log('[SCENE-TOUCH]', JSON.stringify({ where, x: Math.round(n.pageX), y: Math.round(n.pageY), target: n.target ?? null, ...(extra ? extra() : {}) })); // guard-ok: dev-трасса касаний
  };
}

/* expo-router route shim */
export default function __SceneTouchTraceRouteShim() { return null; }
