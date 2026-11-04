// Чистое решение замка комбинированного урока (без React/Native — тестируется отдельно). См. combo_lesson_gate.tsx.
export type ComboGateDecision = 'allow' | 'pending' | 'deny';

/** Потолок ожидания статуса Plus / активации после покупки на пейволе. */
export const COMBO_GATE_CAP_MS = 5000;

/** Не комбо — пускаем; статус неизвестен — ждём; только подтверждённый Plus пускаем, подтверждённый Free отклоняем. */
export function comboGateDecision(input: Readonly<{ comboActive: boolean; hasPremiumAccess: boolean; accessResolved: boolean }>): ComboGateDecision {
  if (!input.comboActive) return 'allow';
  if (!input.accessResolved) return 'pending';
  return input.hasPremiumAccess ? 'allow' : 'deny';
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
