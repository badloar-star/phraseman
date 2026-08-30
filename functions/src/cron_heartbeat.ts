import * as admin from 'firebase-admin';

/**
 * Пульс кронов — «жив ли фоновый процесс» без доступа в Cloud Logging.
 *
 * зачем (аудит 2026-08-29, правило владельца «сперва логи»): в проекте ~25
 * расписаний, и ни одно не оставляло следа о прогоне. Умерший крон (лиги,
 * премиум-истечения, пуши) был неотличим от здорового — тишина и там и там.
 * Cloud Logging владельцу недоступен, поэтому единственное честное место
 * для пульса — Firestore.
 *
 * Стоимость: РОВНО ОДНА запись на прогон крона (set с merge в фиксированный
 * doc), никакого роста коллекции — документ на крон, перезаписывается.
 * При ~25 кронах это <2k записей в сутки суммарно — копейки.
 *
 * Ошибку крона НЕ глотаем: пульс пишет исход и пробрасывает её дальше,
 * чтобы штатный ретрай-механизм Cloud Functions продолжал работать.
 */
export const CRON_HEARTBEATS = 'cron_heartbeats';

type HeartbeatExtra = Record<string, string | number | boolean>;

async function writeHeartbeat(
  name: string,
  startedAtMs: number,
  ok: boolean,
  errorMessage: string | null,
  extra: HeartbeatExtra,
): Promise<void> {
  const nowMs = Date.now();
  try {
    await admin.firestore().collection(CRON_HEARTBEATS).doc(name).set({
      name,
      lastRunAtMs: startedAtMs,
      lastFinishedAtMs: nowMs,
      durationMs: nowMs - startedAtMs,
      ok,
      // Последняя ошибка остаётся видимой до следующего УСПЕШНОГО прогона:
      // так «мигающий» крон (падает через раз) не прячет свой предыдущий сбой.
      ...(ok ? { lastError: admin.firestore.FieldValue.delete() } : {
        // зачем 600 (2026-08-30): FAILED_PRECONDITION несёт ссылку create_composite,
        // и 300 символов отрезали base64-хвост с ПОЛЯМИ индекса — самое ценное.
        lastError: String(errorMessage ?? 'unknown').slice(0, 600),
        lastErrorAtMs: nowMs,
      }),
      ...(Object.keys(extra).length > 0 ? { extra } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (e: any) {
    // зачем: запрет немого catch. Отказ записи пульса — сам по себе диагноз
    // (правила/квота), но он не имеет права уронить полезную работу крона.
    console.warn(JSON.stringify({
      event: 'cron_heartbeat_write_failed',
      cron: name,
      code: e?.code ?? 'unknown',
      message: String(e?.message ?? e).slice(0, 160),
    }));
  }
}

/**
 * Обёртка тела крона: пишет пульс на успехе и на падении.
 *
 *   export const myCron = onSchedule(OPTS, withCronHeartbeat('myCron', async () => {
 *     ...полезная работа...
 *   }));
 *
 * `extra()` — необязательные лёгкие метрики прогона (сколько обработано),
 * считается ТОЛЬКО на успехе и не должна бросать.
 */
export function withCronHeartbeat<TEvent>(
  name: string,
  handler: (event: TEvent) => Promise<void | HeartbeatExtra>,
): (event: TEvent) => Promise<void> {
  return async (event: TEvent) => {
    const startedAtMs = Date.now();
    try {
      const extra = await handler(event);
      await writeHeartbeat(name, startedAtMs, true, null, extra && typeof extra === 'object' ? extra : {});
    } catch (e: any) {
      await writeHeartbeat(name, startedAtMs, false, String(e?.message ?? e), {});
      throw e;
    }
  };
}
