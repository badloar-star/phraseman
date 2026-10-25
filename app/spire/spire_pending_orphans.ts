// spire_pending_orphans.ts — сироты среди ожидающих монет Пика: строка есть, а отчёта под ней в очереди нет.
// зачем (Сверка 25.10, координатор + критерии Ревизора): ожидающие монеты хранятся отдельно от очереди отчётов (по reportId) и гаснут
// только вердиктом, ростом кошелька или через 48 ч. Если неделя Пика на телефоне подменилась (восстановление ключа недели из облака,
// перезапись недели, ручная чистка), отчётов больше нет — их монеты никогда не вольются, а плашка 48 ч показывала монеты-призраки
// (Сверка: 450 после удаления 47 неотправленных отчётов). Снимаем строку, ТОЛЬКО если её reportId нет в живой очереди pending ни
// одного языка. Отправленные и ждущие вердикта лежат в той же очереди до ответа — их не трогаем (иначе число нырнёт, потом прыгнет).
// Свежие строки (моложе GRACE) не трогаем: монеты ступени показываются в момент итога, до записи отчёта на диск.
// Firebase-экономия: только диск телефона (по ключу недели на язык), без сети и без чтений Firestore.
import { removeSpirePendingCoins, peekSpirePendingEntries } from './spire_pending_coins';
import type { SpireLang } from '../../modules/spire/report_queue';

const SPIRE = '[SPIRE]';
const LANGS: readonly SpireLang[] = ['en', 'es', 'de', 'fr', 'it'];
export const SPIRE_PENDING_ORPHAN_GRACE_MS = 2 * 60 * 1000;

export type SpirePendingOrphanDeps = Readonly<{
  /** Живая очередь отчётов недели на языке: reportId строк pending (null — недели нет; бросок — чтение не удалось). */
  readQueueReportIds: (owner: string, lang: SpireLang) => Promise<readonly string[] | null>;
}>;

async function defaultDeps(): Promise<SpirePendingOrphanDeps> {
  const { spireReadWeekLocal } = await import('../spire_report_client');
  return {
    readQueueReportIds: async (owner, lang) => {
      const local = await spireReadWeekLocal(owner, lang);
      return local ? local.pending.map((row) => row.reportId) : null;
    },
  };
}

let inFlight: Promise<number> | null = null;

/** Снять сирот владельца. Возвращает число снятых строк. Никогда не бросает: причина — в журнале. */
export function reconcileSpirePendingOrphans(owner: string | null | undefined, trigger: string, injected?: SpirePendingOrphanDeps, nowMs: number = Date.now()): Promise<number> {
  if (!owner) return Promise.resolve(0);
  if (peekSpirePendingEntries(owner).length === 0) return Promise.resolve(0);
  if (inFlight && !injected) return inFlight;
  const run = (async (): Promise<number> => {
    const entries = peekSpirePendingEntries(owner);
    let deps: SpirePendingOrphanDeps;
    try {
      deps = injected ?? await defaultDeps();
    } catch (error) {
      console.warn(`${SPIRE}[PEAK-COINS] orphan_skip reason=deps_failed trigger=${trigger} ${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина пропуска
      return 0;
    }
    const live = new Set<string>();
    for (const lang of LANGS) {
      try {
        const ids = await deps.readQueueReportIds(owner, lang);
        for (const id of ids ?? []) live.add(id);
      } catch (error) {
        // зачем: не смогли прочитать очередь одного языка — не знаем, живы ли его отчёты; ничего не снимаем (лучше показать лишнее, чем стереть живое)
        console.warn(`${SPIRE}[PEAK-COINS] orphan_skip reason=queue_read_failed lang=${lang} trigger=${trigger} ${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина пропуска
        return 0;
      }
    }
    let removed = 0;
    let removedCoins = 0;
    let young = 0;
    for (const entry of entries) {
      if (live.has(entry.reportId)) continue;
      if (nowMs - entry.atMs < SPIRE_PENDING_ORPHAN_GRACE_MS) { young += 1; continue; }
      removeSpirePendingCoins(owner, entry.reportId, 'orphan');
      removed += 1;
      removedCoins += entry.coins;
    }
    console.log(`${SPIRE}[PEAK-COINS] orphan_audit ${JSON.stringify({
      trigger,
      entries: entries.length,
      pendingSum: entries.reduce((s, e) => s + e.coins, 0),
      liveReports: live.size,
      removed,
      removedCoins,
      keptYoung: young,
    })}`); // guard-ok: из чего складывались ожидающие и что снято
    return removed;
  })().finally(() => { if (!injected) inFlight = null; });
  if (!injected) inFlight = run;
  return run;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
