/**
 * [SPIRE-GOLD] Разбор ответа spireReportSteps по золоту: золотая часть монет — отдельная «ожидающая» строка
 * `spire_gold:{reportId}`; по ответу сервера снимаем ТОЛЬКО её и объясняем тостом.
 *
 * зачем (Ревизор 25.10 по ec03e9e58: «молчаливый минус монет»): телефон кладёт ×2 сразу, а сервер может золото не засчитать —
 * потолок дня выбран на другом устройстве, номер ступени разошёлся (not_golden), сервер старый (нет поля gold). Раньше ×2 жило
 * внутри общей строки ступени и пропадало без слов. Теперь:
 *   - gold.accepted — золото засчитано: гасим как обычную ступень (монеты уже в балансе);
 *   - gold.skipped  — снимаем золотую строку, тост: daily_cap → «золото на сегодня уже собрано», остальное → «не засчитано»;
 *   - нет поля gold, а ступень принята — сервер старый: снимаем, тост «не засчитано», журнал reason=server_too_old;
 *   - ступень отвергнута — снимаем золото вместе с ней (reason=rejected), без отдельного тоста: ступень и так откатилась.
 * Сторож — tests/spire_gold_settle.test.ts (все ветки отказа).
 */
import { emitAppEvent, actionToastTri } from '../events';
import { DebugLogger } from '../debug-logger';
import { removeSpirePendingCoins, settleSpirePendingCoins, spireGoldPendingId, spirePendingCoinsHas } from './spire_pending_coins';
import { SPIRE_GOLD_TOAST_DAILY_CAP, SPIRE_GOLD_TOAST_NOT_COUNTED } from './spire_gold_copy';

// зачем (сторож spire_game_source_contract: префикс [SPIRE] во всех файлах app/spire): контекст [SPIRE], метка задачи в строке
const SPIRE = '[SPIRE]';
const TAG = '[SPIRE-GOLD]';

type Verdict = Readonly<{ reportId: string; verdict: string; reason?: string }>;
type GoldWire = Readonly<{ accepted?: unknown; skipped?: unknown }>;

function toast(kind: 'daily_cap' | 'not_counted'): void {
  emitAppEvent('action_toast', actionToastTri('info', kind === 'daily_cap' ? SPIRE_GOLD_TOAST_DAILY_CAP : SPIRE_GOLD_TOAST_NOT_COUNTED));
}

/** Вызывается рядом с settleSpirePendingCoins основного ответа (spire_flush_wallet), с тем же балансом. */
export function settleSpireGoldFromFlush(
  owner: string,
  response: Readonly<Record<string, unknown>>,
  verdicts: readonly Verdict[],
  balanceBefore: number | null,
  balanceAfter: number | null,
): void {
  const mine = verdicts.filter((v) => spirePendingCoinsHas(owner, spireGoldPendingId(v.reportId)));
  if (mine.length === 0) return;
  const gold = (response.gold && typeof response.gold === 'object' ? response.gold : null) as GoldWire | null;
  const accepted = new Set(Array.isArray(gold?.accepted) ? (gold?.accepted as unknown[]).filter((x): x is string => typeof x === 'string') : []);
  const skipped = new Map<string, string>();
  if (Array.isArray(gold?.skipped)) {
    for (const s of gold?.skipped as unknown[]) {
      const row = s as { reportId?: unknown; reason?: unknown };
      if (typeof row?.reportId === 'string') skipped.set(row.reportId, typeof row.reason === 'string' ? row.reason : 'unknown');
    }
  }
  const settle: Verdict[] = [];
  let toastKind: 'daily_cap' | 'not_counted' | null = null;
  for (const v of mine) {
    const id = spireGoldPendingId(v.reportId);
    if (v.verdict === 'rejected') { removeSpirePendingCoins(owner, id, 'gold_rejected'); continue; }
    if (!gold) {
      DebugLogger.warn(SPIRE, `${TAG} gate reason=server_too_old: ответ без поля gold, ступень ${v.reportId} ${v.verdict} → снимаем ×2`);
      removeSpirePendingCoins(owner, id, 'gold_server_too_old');
      toastKind = toastKind ?? 'not_counted';
      continue;
    }
    if (accepted.has(v.reportId)) { settle.push({ reportId: id, verdict: 'accepted' }); continue; }
    const reason = skipped.get(v.reportId) ?? (v.verdict === 'duplicate' ? 'duplicate' : 'not_listed');
    if (reason === 'duplicate') { settle.push({ reportId: id, verdict: 'duplicate' }); continue; }
    DebugLogger.warn(SPIRE, `${TAG} сервер не засчитал золото ступени ${v.reportId}: reason=${reason} → снимаем ×2`);
    removeSpirePendingCoins(owner, id, `gold_${reason}`);
    toastKind = reason === 'daily_cap' ? 'daily_cap' : (toastKind ?? 'not_counted');
  }
  if (settle.length > 0) settleSpirePendingCoins(owner, settle, true, balanceBefore, balanceAfter);
  if (toastKind) toast(toastKind);
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
