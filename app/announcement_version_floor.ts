/**
 * Нижняя граница всплывающих объявлений 2.0 (окно AppMessageAnnouncementModal).
 *
 * зачем (координатор 15.10): у серверных объявлений «всем» (targetAppVersions пуст) нет защиты по версии — анонс
 * времён 1.6.x, ещё активный и не истёкший, всплыл бы окном в 2.0 у того, кто его не подтверждал (новая установка старше
 * суток, человек не открывал 1.6.x после рассылки). При первом обращении сборка 2.0 запоминает время на устройстве; окном
 * показываются только объявления, созданные позже. Старые остаются во «Входящих» — пропадает только всплывающее окно.
 * Сообщение, явно нацеленное на текущую версию (targetAppVersions непуст — фильтр версии его уже пропустил), идёт без
 * границы: так релизный анонс 2.0 дойдёт и до обновившихся позже рассылки. Прод не трогаем, сеть не нужна.
 * Логи: [APP-MESSAGE] floor … / skip reason=created_before_2_0_floor.
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

/** Убрать из очереди окна объявления «всем», созданные раньше границы. Чистая функция — тестируется без хранилища. */
export function skipAnnouncementsBeforeFloor<T extends Readonly<{ id: string; createdAtMs: number; targetAppVersions: readonly string[] }>>(
  queue: T[],
  floorMs: number,
): T[] {
  if (queue.length === 0) return queue;
  const kept = queue.filter((message) => message.targetAppVersions.length > 0 || message.createdAtMs >= floorMs);
  if (kept.length !== queue.length) {
    const skipped = queue.filter((message) => !kept.includes(message));
    console.log(`[APP-MESSAGE] skip reason=created_before_2_0_floor count=${skipped.length} ids=${skipped.map((m) => m.id).join(',')} floorMs=${floorMs}`); // guard-ok: пропуск пишет причину
  }
  return kept;
}
