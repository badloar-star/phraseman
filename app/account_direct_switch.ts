// account_direct_switch.ts — переключатель маршрута «Выйти и войти под другим аккаунтом» на экране «Аккаунт».
//
// зачем (правила владельца 3–4, координатор 18.10): вошедший A должен попадать к выбору Google/Apple СРАЗУ — без предварительного стирания данных (~14 с)
// и без окон подтверждения; вход в B выполняет auth_provider, а «Позже» оставляет человека в A. Пока auth_provider при вошедшем A отвечает
// account_switch_required (красное правило 4 в приёмке Сайта account_switch_owner_rules_1018), прямой маршрут вернул бы человеку отказ, поэтому
// переключатель ВЫКЛЮЧЕН и экран ведёт себя как раньше (выход со стиранием → окно входа).
// Включает Авторизация одной строкой — в том же коммите, где auth_provider начинает входить из A в B без отказа.
// зачем (Авторизация 18.10): auth_provider теперь входит из A в B сам (окно выбора → штатная смена → вход тем же выбором).
export const ACCOUNT_DIRECT_SWITCH_ENABLED = true;

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __AccountDirectSwitchRouteShim() {
  return null;
}
