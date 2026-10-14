// ═══════════════════════════════════════════════════════════════════════════
// spire_week_remind.ts — D191 m03 «Напомнить вечером» (окно понижения итога недели).
//
// зачем (координатор 14.10, пункт 3): одно локальное напоминание сегодня в 19:00 по местному времени — только через
// существующие уведомления приложения и только если разрешение УЖЕ дано (новый запрос из окна не делаем, политику не трогаем).
// Нет разрешения / категория «Шпиль» выключена / уже позже 18:30 — кнопку не показываем.
// Лог: [D191-REMIND] — доступность (с причиной), постановка, повтор, отказ.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from '../debug-logger';
import { actionToastTri, emitAppEvent } from '../events';

const TAG = '[D191-REMIND]';
const ID_KEY = 'spire_week_remind_id_v1';
export const SPIRE_WEEK_REMIND_HOUR = 19;
/** После 18:30 местного кнопку не показываем — напоминание пришло бы почти сразу. */
export const SPIRE_WEEK_REMIND_LAST_OFFER_MINUTES = 18 * 60 + 30;

export type SpireWeekRemindAvailability = Readonly<
  { available: true; triggerAtMs: number } | { available: false; reason: 'too_late' | 'permission' | 'muted' | 'failed' }
>;

const log = (msg: string): void => DebugLogger.info('[SPIRE]', `${TAG} ${msg}`);

/** Сегодня 19:00 по местному времени устройства; null — уже позже 18:30 (кнопку не показываем). */
export function spireWeekRemindTriggerAt(nowMs: number): number | null {
  const now = new Date(nowMs);
  if (now.getHours() * 60 + now.getMinutes() > SPIRE_WEEK_REMIND_LAST_OFFER_MINUTES) return null;
  const at = new Date(nowMs);
  at.setHours(SPIRE_WEEK_REMIND_HOUR, 0, 0, 0);
  return at.getTime();
}

export function spireWeekRemindCopy(uiLang: string): Readonly<{ title: string; body: string }> {
  // Пик в первом выпуске — только интерфейс ru/uk (замок spire_ui_lang_gate); остальное — запасной русский.
  if (uiLang === 'uk') return { title: 'Пік чекає', body: 'Кілька раундів увечері — і ліга знову твоя.' };
  return { title: 'Пик ждёт', body: 'Пара раундов вечером — и лига снова твоя.' };
}

/** Можно ли показать кнопку «Напомнить вечером» прямо сейчас. Разрешение не запрашивает. */
export async function spireWeekRemindAvailability(nowMs: number = Date.now()): Promise<SpireWeekRemindAvailability> {
  const triggerAtMs = spireWeekRemindTriggerAt(nowMs);
  if (triggerAtMs === null) { log(`кнопки нет: уже позже 18:30 (сейчас ${new Date(nowMs).toTimeString().slice(0, 5)})`); return { available: false, reason: 'too_late' }; }
  try {
    const { canOfferSpireWeekRemind } = await import('../notifications');
    const offer = await canOfferSpireWeekRemind();
    if (!offer.ok) { log(`кнопки нет: ${offer.reason === 'permission' ? 'разрешения на уведомления нет (новый запрос не делаем)' : 'категория «Шпиль» выключена'}`); return { available: false, reason: offer.reason === 'permission' ? 'permission' : 'muted' }; }
    log(`кнопка доступна: напоминание на ${new Date(triggerAtMs).toTimeString().slice(0, 5)}`);
    return { available: true, triggerAtMs };
  } catch (error) {
    log(`кнопки нет: проверка разрешения упала (${error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)})`);
    return { available: false, reason: 'failed' };
  }
}

/** Поставить напоминание (повторный тап заменяет прежнее — одно напоминание, а не пачка). */
export async function scheduleSpireWeekRemind(uiLang: string, nowMs: number = Date.now()): Promise<boolean> {
  const triggerAtMs = spireWeekRemindTriggerAt(nowMs);
  if (triggerAtMs === null) { log('не поставили: уже позже 18:30'); return false; }
  try {
    const notifications = await import('../notifications');
    const prevId = await AsyncStorage.getItem(ID_KEY).catch((error: unknown) => { log(`прежний id не прочитан (${String(error).slice(0, 80)})`); return null; });
    if (prevId) {
      await notifications.cancelScheduledLocalNotificationById(prevId);
      log(`прежнее напоминание ${prevId} снято — ставим заново`);
    }
    const copy = spireWeekRemindCopy(uiLang);
    const result = await notifications.scheduleSpireWeekRemindLocalNotification({ ...copy, triggerAtMs });
    if (result.id === null) { log(`не поставили: ${result.reason}`); return false; }
    await AsyncStorage.setItem(ID_KEY, result.id).catch((error: unknown) => log(`id не сохранён (${String(error).slice(0, 80)}) — повтор может дать второе напоминание`));
    log(`поставили: id=${result.id} на ${new Date(triggerAtMs).toTimeString().slice(0, 5)} ui=${uiLang}`);
    return true;
  } catch (error) {
    log(`не поставили: сбой (${error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)})`);
    return false;
  }
}

/**
 * То же, что scheduleSpireWeekRemind, но при отказе — тихий тост.
 * зачем (координатор 14.10, аудит Optimistic UI): окно закрывается сразу, напоминание ставится фоном; если постановка
 * не удалась, человек был уверен, что напоминание есть, — теперь он узнаёт, что нет. Закрытие окна остаётся оптимистичным.
 */
export async function scheduleSpireWeekRemindWithFeedback(uiLang: string, nowMs: number = Date.now()): Promise<boolean> {
  const ok = await scheduleSpireWeekRemind(uiLang, nowMs);
  if (ok) return true;
  log('fail_toast: напоминание не поставилось — показываем тихий тост');
  emitAppEvent('action_toast', actionToastTri('info', {
    ru: 'Не получилось поставить напоминание', uk: 'Не вдалося поставити нагадування', en: "Couldn't set the reminder",
    es: 'No se pudo programar el recordatorio', 'pt-BR': 'Não foi possível agendar o lembrete', vi: 'Không đặt được lời nhắc',
    id: 'Pengingat tidak dapat dipasang', tr: 'Hatırlatıcı kurulamadı', pl: 'Nie udało się ustawić przypomnienia',
  }));
  return false;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
