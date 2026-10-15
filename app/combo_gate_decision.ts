// Чистое решение замка комбинированного урока (без React/Native — тестируется отдельно). См. combo_lesson_gate.tsx.
export type ComboGateDecision = 'allow' | 'pending' | 'deny';

/** Потолок ожидания статуса Plus / активации после покупки на пейволе. */
export const COMBO_GATE_CAP_MS = 5000;

/** Не комбо — пускаем; Plus — пускаем; статус неизвестен — ждём (контент закрыт); Free — отказ. */
export function comboGateDecision(input: Readonly<{ comboActive: boolean; hasPremiumAccess: boolean; accessResolved: boolean }>): ComboGateDecision {
  if (!input.comboActive) return 'allow';
  if (input.hasPremiumAccess) return 'allow';
  return input.accessResolved ? 'deny' : 'pending';
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
