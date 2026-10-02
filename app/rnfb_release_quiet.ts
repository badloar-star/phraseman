/*
 * Тишина предупреждений RN Firebase «namespaced API deprecated» в release.
 *
 * зачем (координатор §66, замер Q53 2026-10-02): на «слабом телефоне» за первые
 * ~13 с холодного старта приложение писало 241 такое предупреждение — каждый
 * console.warn идёт мостом в нативный лог прямо в окне старта (до Главной ≈ 6 с).
 * Флаг — официальный переключатель пакета (@react-native-firebase/app,
 * lib/common: globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS), читается в
 * момент вызова. В dev предупреждения остаются: они — список того, что ещё надо
 * перевести на модульный API. Импортируется из index.js ПЕРВЫМ, до любых вызовов
 * Firebase.
 */

if (!__DEV__) {
  (globalThis as { RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS?: boolean }).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
