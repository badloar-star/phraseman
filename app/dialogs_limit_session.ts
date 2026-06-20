// Гейт бесплатных ИИ-диалогов. Модель (запрос пользователя 2026-06-20):
// бесплатно ПОЖИЗНЕННО доступен РОВНО ОДИН полный диалог (без лимита реплик
// внутри него), общий на все режимы (сценарий / ситуация / свободный разговор).
// После него — полный премиум-замок, без «3 реплики в день».
//
// Клиентский флаг — UX-слой (мгновенно прячет ввод и ведёт на пейвол). Источник
// правды — сервер (premium_dialog CF), который держит тот же пожизненный флаг по
// stable_id, поэтому переустановка/второе устройство попытку не возвращает.
import AsyncStorage from '@react-native-async-storage/async-storage';

// v2: переезд с дневного счётчика реплик (v1) на пожизненный «один диалог».
// Старый ключ намеренно не читаем — у кого он был, тот получает свежую попытку
// (разовая щедрость при миграции, не баг).
export const FREE_DIALOG_USED_KEY = 'dialogs_free_lifetime_used_v2';

/** Потрачен ли единственный бесплатный диалог (пожизненно). */
export async function hasUsedFreeDialog(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(FREE_DIALOG_USED_KEY)) === '1';
  } catch {
    return false;
  }
}

/**
 * Отметить бесплатный диалог как использованный. Идемпотентно — повторный вызов
 * ничего не меняет. Зовётся на ПЕРВОЙ реплике пользователя (не при открытии
 * экрана), чтобы случайный вход-выход не сжигал попытку.
 */
export async function markFreeDialogUsed(): Promise<void> {
  try {
    await AsyncStorage.setItem(FREE_DIALOG_USED_KEY, '1');
  } catch {
    // запись в локальное хранилище — best-effort; сервер всё равно источник правды
  }
}

/** Остался ли у не-premium бесплатный диалог. true = можно начать. */
export async function hasFreeDialogLeft(): Promise<boolean> {
  return !(await hasUsedFreeDialog());
}
