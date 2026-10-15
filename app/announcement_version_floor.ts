/**
 * Нижняя граница всплывающих объявлений 2.0 (окно AppMessageAnnouncementModal).
 *
 * зачем (координатор 15.10): у серверных объявлений «всем» (targetAppVersions пуст) нет защиты по версии — анонс
 * времён 1.6.x, ещё активный и не истёкший, всплыл бы окном в 2.0 у того, кто его не подтверждал (новая установка старше
 * суток, человек не открывал 1.6.x после рассылки). При первом обращении сборка 2.0 запоминает время на устройстве; окном
 * показываются только объявления, созданные позже. Старые остаются во «Входящих» — пропадает только всплывающее окно.
 * Правила координатора 15.10: без даты создания в данных сервера — не показываем; исключений по версии нет (релизный
 * анонс создаётся после выхода 2.0). Прод не трогаем, сеть не нужна.
 * Логи: [APP-MESSAGE] floor … / modal {id, createdAt, firstLaunch2At, decision}.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ANNOUNCEMENT_FLOOR_KEY = 'app_messages_modal_floor_v2';
/** Отметка «из будущего» дальше этого допуска — часы шли вперёд; ставим новую. */
const FLOOR_CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

/** Прочитать нижнюю границу или поставить её «сейчас». Сбой чтения/записи — граница «сейчас» (старое не всплывёт). */
export async function readOrInitAnnouncementFloor(nowMs: number = Date.now()): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(ANNOUNCEMENT_FLOOR_KEY);
    const parsed = raw === null ? Number.NaN : Number(raw);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= nowMs + FLOOR_CLOCK_SKEW_TOLERANCE_MS) return parsed;
    const reason = raw === null ? 'missing' : !Number.isFinite(parsed) || parsed <= 0 ? 'invalid' : 'clock_skew';
    await AsyncStorage.setItem(ANNOUNCEMENT_FLOOR_KEY, String(nowMs));
    console.log(`[APP-MESSAGE] floor init reason=${reason} floorMs=${nowMs} raw=${String(raw)}`); // guard-ok: один раз на устройство
    return nowMs;
  } catch (error) {
    console.warn(`[APP-MESSAGE] floor read_failed — граница «сейчас» ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch пишет причину
    return nowMs;
  }
}

/** Решение окна по одному объявлению: показать только созданное позже первого запуска 2.0 и с известной датой. */
export function announcementFloorDecision(
  message: Readonly<{ createdAtMs: number; createdAtKnown?: boolean }>,
  floorMs: number,
): 'show' | 'skip_no_created_at' | 'skip_created_before_2_0' {
  if (message.createdAtKnown === false || !Number.isFinite(message.createdAtMs) || message.createdAtMs <= 0) return 'skip_no_created_at';
  return message.createdAtMs > floorMs ? 'show' : 'skip_created_before_2_0';
}

/** Отфильтровать очередь окна по границе; одна строка журнала на объявление. Чистая — тестируется без хранилища. */
export function skipAnnouncementsBeforeFloor<T extends Readonly<{ id: string; createdAtMs: number; createdAtKnown?: boolean }>>(
  queue: T[],
  floorMs: number,
): T[] {
  return queue.filter((message) => {
    const decision = announcementFloorDecision(message, floorMs);
    console.log('[APP-MESSAGE] modal', JSON.stringify({ id: message.id, createdAt: message.createdAtKnown === false ? null : message.createdAtMs, firstLaunch2At: floorMs, decision })); // guard-ok: решение по каждому объявлению
    return decision === 'show';
  });
}
