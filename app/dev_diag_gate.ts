/**
 * Один гейт для диагностических проб (журналы [BACK-BTN], [SCROLL-RESTORE], [HOME-FOCUS-COST], [MEM-HOME]): только dev и не стор-релиз.
 *
 * зачем (Ревизор 3.44, координатор 18.10): пробы нельзя оставлять работающими в сторовой сборке. Модуль СПЕЦИАЛЬНО без импортов: пробы стоят в широко подключаемых
 * компонентах (кнопка «назад», арт плиток, превью видео, Главная), а `app/config` тянет `Platform` — тесты, подменяющие react-native минимальной заглушкой, падали бы на загрузке.
 * Выражение стор-режима то же, что у `IS_STORE_RELEASE` в `app/config.ts` (`process.env.EXPO_PUBLIC_STORE_RELEASE === '1'`); совпадение держит tests/dev_diag_gate_contract.test.cjs.
 */
export const DIAG_ENABLED: boolean = typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_STORE_RELEASE !== '1';

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
