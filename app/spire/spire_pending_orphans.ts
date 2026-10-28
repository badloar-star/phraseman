// spire_pending_orphans.ts — сироты среди ожидающих монет Пика: строка есть, а отчёта под ней в очереди нет.
// зачем (Сверка 25.10, координатор + критерии Ревизора): ожидающие монеты хранятся отдельно от очереди отчётов (по reportId) и гаснут
// только вердиктом, ростом кошелька или через 48 ч. Если неделя Пика на телефоне подменилась (восстановление ключа недели из облака,
// перезапись недели, ручная чистка), отчётов больше нет — их монеты никогда не вольются, а плашка 48 ч показывала монеты-призраки
// (Сверка: 450 после удаления 47 неотправленных отчётов). Снимаем строку, ТОЛЬКО если её reportId нет в живой очереди pending ни
// одного языка. Отправленные и ждущие вердикта лежат в той же очереди до ответа — их не трогаем (иначе число нырнёт, потом прыгнет).
// Свежие строки (моложе GRACE) не трогаем: монеты ступени показываются в момент итога, до записи отчёта на диск.
// Firebase-экономия: только диск телефона (по ключу недели на язык), без сети и без чтений Firestore.
import { removeSpirePendingCoins, peekSpirePendingEntries, spireGoldPendingId, type SpirePendingEntry } from './spire_pending_coins';
import type { SpireLang } from '../../modules/spire/report_queue';

const SPIRE = '[SPIRE]';
const LANGS: readonly SpireLang[] = ['en', 'es', 'de', 'fr', 'it'];
export const SPIRE_PENDING_ORPHAN_GRACE_MS = 2 * 60 * 1000;
/** Строку, чей отчёт сервер принял, а баланс не влился (acceptedAtMs), держим не дольше — координатор 28.10. */
export const SPIRE_PENDING_ACCEPTED_HOLD_MS = 24 * 60 * 60 * 1000;
/** Приставка строки золота — из того же источника, что и сама строка (spireGoldPendingId). */
const SPIRE_GOLD_PREFIX = spireGoldPendingId('');

export type SpirePendingOrphanDeps = Readonly<{
  /** Живая очередь отчётов недели на языке: reportId строк pending (null — недели нет; бросок — чтение не удалось). */
  readQueueReportIds: (owner: string, lang: SpireLang) => Promise<readonly string[] | null>;
  /** Серверный seq, уже влитый в кошелёк телефона (нет — seq неизвестен: принятые строки ждут роста баланса или 24 ч). */
  readLocalSeq?: (owner: string) => Promise<number>;
}>;

async function defaultDeps(): Promise<SpirePendingOrphanDeps> {
  const { spireReadWeekLocal } = await import('../spire_report_client');
  const { readSpireWalletLocalSeq } = await import('./spire_flush_wallet');
  return {
    readQueueReportIds: async (owner, lang) => {
      const local = await spireReadWeekLocal(owner, lang);
      return local ? local.pending.map((row) => row.reportId) : null;
    },
    readLocalSeq: readSpireWalletLocalSeq,
  };
}

/** Что делать с принятой сервером строкой без отчёта в очереди: держать (причина) или снять (причина). */
function acceptedDecision(entry: SpirePendingEntry, localSeq: number | null, nowMs: number): Readonly<{ keep: boolean; reason: string }> {
  const heldMs = nowMs - (entry.acceptedAtMs as number);
  if (entry.acceptedMinSeq !== undefined && localSeq !== null && localSeq >= entry.acceptedMinSeq) return { keep: false, reason: 'accepted_snapshot_in' };
  if (heldMs >= SPIRE_PENDING_ACCEPTED_HOLD_MS) return { keep: false, reason: 'accepted_24h' };
  return { keep: true, reason: localSeq === null ? 'accepted_awaiting_balance:local_seq_unknown' : 'accepted_awaiting_balance' };
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
    let localSeq: number | null = null;
    if (deps.readLocalSeq && entries.some((e) => e.acceptedAtMs !== undefined)) {
      try {
        localSeq = await deps.readLocalSeq(owner);
      } catch (error) {
        console.warn(`${SPIRE}[SPIRE-COINS] orphan:local_seq_failed ${JSON.stringify({ trigger, error: error instanceof Error ? error.message : String(error) })} → принятые держим до 24 ч`); // guard-ok: catch с причиной
      }
    }
    let removed = 0;
    let removedCoins = 0;
    let young = 0;
    let keptAccepted = 0;
    for (const entry of entries) {
      // зачем (координатор 28.10, жалоба «двойные очки, потом с общего счёта сняли 50»): строка золота хранится как
      // spire_gold:{reportId}, а в очереди лежит {reportId} — раньше золото ВСЕГДА выглядело сиротой и через 2 мин снималось,
      // хотя ступень ждала отправки (потом сервер засчитывал золото, и число прыгало обратно). Сверяем по id ступени.
      const stepId = entry.reportId.startsWith(SPIRE_GOLD_PREFIX) ? entry.reportId.slice(SPIRE_GOLD_PREFIX.length) : entry.reportId;
      if (live.has(stepId)) continue;
      if (nowMs - entry.atMs < SPIRE_PENDING_ORPHAN_GRACE_MS) { young += 1; continue; }
      let why = 'no_report_in_queue';
      if (entry.acceptedAtMs !== undefined) {
        // зачем (координатор 28.10, второй путь вниз): отчёт ушёл из очереди, потому что сервер его ПРИНЯЛ, а баланс из ответа не
        // влился (merge_failed / ответ без stars) — монеты ещё не в кошельке. Держим до снимка облака с ними, максимум 24 ч.
        const decision = acceptedDecision(entry, localSeq, nowMs);
        const detail = { trigger, report: entry.reportId, stepId, coins: entry.coins, reason: decision.reason, acceptedWhy: entry.acceptedWhy ?? null, minSeq: entry.acceptedMinSeq ?? null, localSeq, heldMs: nowMs - entry.acceptedAtMs };
        if (decision.keep) {
          console.log(`${SPIRE}[SPIRE-COINS] orphan:keep ${JSON.stringify(detail)}`); // guard-ok: почему принятая строка не снята
          keptAccepted += 1;
          continue;
        }
        why = decision.reason;
      }
      console.warn(`${SPIRE}[SPIRE-COINS] orphan:remove ${JSON.stringify({ trigger, report: entry.reportId, stepId, gold: stepId !== entry.reportId, coins: entry.coins, why, ageMs: nowMs - entry.atMs, liveReports: live.size })}`); // guard-ok: что снято как сирота и почему
      removeSpirePendingCoins(owner, entry.reportId, why === 'no_report_in_queue' ? 'orphan' : `orphan_${why}`);
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
      keptAccepted,
    })}`); // guard-ok: из чего складывались ожидающие и что снято
    return removed;
  })().finally(() => { if (!injected) inFlight = null; });
  if (!injected) inFlight = run;
  return run;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
