/**
 * Язык серверных пушей и локальных напоминаний = язык, на котором человек РЕАЛЬНО видит интерфейс.
 *
 * зачем (координатор 12.10, диагностика 9e1532a38): запуск считал язык из сырого `app_lang` — uk → uk, es → es,
 * иначе ru. Украиноязычный без ручного выбора и pt-BR/vi/id/tr/pl получали пуши (и `users.pushTokenLang`, по
 * которому сервер решает пуши Шпиля) по-русски, а локальные напоминания перепланировались на русском при каждом
 * старте. Порядок: фактический язык LangContext → сохранённый выбор → язык устройства (выключенный en → ru).
 * Без чтений: всё уже в памяти.
 */
import { coerceInterfaceLang, type Lang } from '../constants/i18n';

export type PushUiLangSource = 'ui' | 'stored' | 'device';

export function resolvePushUiLang(input: Readonly<{
  resolvedUiLang: unknown;
  storedAppLang: unknown;
  deviceLang: Lang;
}>): { lang: Lang; source: PushUiLangSource } {
  const ui = coerceInterfaceLang(input.resolvedUiLang);
  if (ui) return { lang: ui, source: 'ui' };
  const stored = coerceInterfaceLang(input.storedAppLang);
  if (stored) return { lang: stored, source: 'stored' };
  return { lang: input.deviceLang, source: 'device' };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
