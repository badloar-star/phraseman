/**
 * Язык локального пуша по сохранённому языку интерфейса (`app_lang`).
 *
 * зачем (аудит §AUTH-0110, координатор 12.10): «энергия восполнена» и «серия потеряна» брали язык как
 * `uk ? uk : es ? es : ru` — пуш уходил по-русски для en / pt-BR / vi / id / tr / pl, хотя тексты пушей есть на всех 9 языках.
 * Теперь — тот же разбор, что у интерфейса (`coerceInterfaceLang`); нет сохранённого или он не включён → язык устройства,
 * как при первом запуске. Чистая функция, без хранилища — читают вызывающие.
 */
import { coerceInterfaceLang, getDeviceBootstrapLocale, type Lang } from '../constants/i18n';

export function resolveNotificationLang(storedAppLang: unknown, source: string): Lang {
  const stored = coerceInterfaceLang(storedAppLang);
  if (stored) return stored;
  const device = getDeviceBootstrapLocale();
  // Запасной путь печатаем всегда: язык пуша решён не настройкой человека, а устройством.
  console.log(`[LANG-SWITCH] notification_lang source=${source} stored=${typeof storedAppLang === 'string' ? storedAppLang : 'none'} resolved=${device} via=device`);
  return device;
}
