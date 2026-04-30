/**
 * Per-phrase preposition explanation overrides.
 *
 * Key format: `${sentence (lowercase, single spaces, with chosen preposition inline)}::${preposition}`
 * Example: 'she is on vacation::on'
 *
 * Used as the highest-priority lookup before any rule-engine logic in
 * preposition_explanations.ts. Add an entry here when an idiom or fixed
 * collocation needs an explanation that the rule engine cannot infer.
 */

export type PrepositionOverride = { ru: string; uk: string; es: string };

export const PREPOSITION_OVERRIDES: Record<string, PrepositionOverride> = {
  'she is on vacation::on': {
    ru: '"On vacation" - устойчивое выражение: "в отпуске". Перед словом vacation в значении отдыха всегда стоит "on", потому что отпуск воспринимается как состояние/событие, в которое человек "вошёл".',
    uk: '"On vacation" - сталий вираз: "у відпустці". Перед словом vacation у значенні відпочинку завжди стоїть "on", бо відпустка сприймається як стан/подія, в яку людина "увійшла".',
    es: 'La colocación fija «on vacation» equivale a «de vacaciones» o «tomando vacaciones». Con vacation en este sentido suele irse on, porque se trata como un estado o período determinado.',
  },
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
