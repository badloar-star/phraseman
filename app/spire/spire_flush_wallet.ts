// spire_flush_wallet.ts — баланс из ответа spireReportSteps → кошелёк (то, что видит Главная).
// зачем (координатор 18.10, D1 проверки наград моментов): окна ступени/этажа/вершины пишут «+N монет», сервер их начисляет при отправке очереди
// и возвращает новый баланс (stars, starsSeq — functions/src/spire_progress.ts:367-371), но клиент ответ не вливал — Главная стояла до чужого снимка.
// Вливаем тем же единственным каналом серверных снимков, что итог недели (mergeLevelSpinServerStars): он не трогает непогашенные локальные операции.
// Поздний ответ не затирает свежий баланс: seq не новее локального — не вливаем вовсе. Нет полей (старый сервер) — ничего не делаем.
// Новых запросов нет: ответ уже пришёл. Журнал [MOMENT-REWARD] spire:flush merged=… reason=… на каждый ответ.
import type { AccountGenerationToken } from '../account_generation';

export type SpireFlushWalletResult = Readonly<{ merged: boolean; reason: string; balanceBefore: number | null; balanceAfter: number | null }>;

export type SpireFlushWalletDeps = Readonly<{
  merge: (token: AccountGenerationToken, observation: Readonly<{ stars: number; starsSeq: number; serverCreditedDelta?: number }>) => Promise<Readonly<{ balance: number }>>;
  readLocalSeq: (stableId: string) => Promise<number>;
  peekBalance: () => number;
}>;

// зачем (координатор 18.10, сторож spire_game_source_contract: префикс [SPIRE] во всех файлах app/spire): журнал ответа — с общим префиксом Пика, метка [MOMENT-REWARD] для поиска награды остаётся
const SPIRE = '[SPIRE]';
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

async function defaultDeps(): Promise<SpireFlushWalletDeps> {
  const grants = await import('../level_spin_star_grants');
  const { peekRunes } = await import('../runes_system');
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  return {
    merge: (token, observation) => grants.mergeLevelSpinServerStars(token, observation),
    readLocalSeq: async (stableId) => {
      const raw = await AsyncStorage.getItem(grants.levelSpinStarProjectionKey(stableId));
      const seq = raw ? Number((JSON.parse(raw) as { serverSeq?: unknown }).serverSeq) : 0;
      return Number.isSafeInteger(seq) ? seq : 0;
    },
    peekBalance: () => peekRunes(),
  };
}

function log(result: SpireFlushWalletResult, extra: Readonly<Record<string, unknown>>): SpireFlushWalletResult {
  console.log(`${SPIRE}[MOMENT-REWARD] spire:flush ${JSON.stringify({ merged: result.merged, reason: result.reason, ...extra, balanceBefore: result.balanceBefore, balanceAfter: result.balanceAfter })}`); // guard-ok: строка на ответ (раз в пачку, не на ступень)
  return result;
}

/** Влить баланс из ответа spireReportSteps. Никогда не бросает: итог и причина — в журнале и в возвращаемом значении. */
export async function mergeSpireFlushWallet(token: AccountGenerationToken, data: unknown, injected?: SpireFlushWalletDeps): Promise<SpireFlushWalletResult> {
  const d = (data ?? {}) as Readonly<Record<string, unknown>>;
  const extra = { ok: d.ok ?? null, coinsGranted: d.coinsGranted ?? null, serverBalance: d.stars ?? null, serverSeq: d.starsSeq ?? null };
  if (d.ok !== true) return log({ merged: false, reason: `not_ok:${String(d.reason ?? 'unknown')}`, balanceBefore: null, balanceAfter: null }, extra);
  if (!isCount(d.stars) || !isCount(d.starsSeq)) return log({ merged: false, reason: 'no_server_stars', balanceBefore: null, balanceAfter: null }, extra);
  const stableId = token.stableId?.trim();
  if (!stableId) return log({ merged: false, reason: 'no_account', balanceBefore: null, balanceAfter: null }, extra);
  let deps: SpireFlushWalletDeps;
  try {
    deps = injected ?? await defaultDeps();
  } catch (error) {
    return log({ merged: false, reason: `deps_failed:${error instanceof Error ? error.message : String(error)}`, balanceBefore: null, balanceAfter: null }, extra);
  }
  const balanceBefore = deps.peekBalance();
  try {
    const localSeq = await deps.readLocalSeq(stableId);
    if (d.starsSeq <= localSeq) return log({ merged: false, reason: `older_seq:${d.starsSeq}<=${localSeq}`, balanceBefore, balanceAfter: balanceBefore }, extra);
    const granted = isCount(d.coinsGranted) ? d.coinsGranted : undefined;
    const visible = await deps.merge(token, { stars: d.stars, starsSeq: d.starsSeq, ...(granted !== undefined ? { serverCreditedDelta: granted } : {}) });
    return log({ merged: true, reason: `newer_seq:${d.starsSeq}>${localSeq}`, balanceBefore, balanceAfter: visible.balance }, extra);
  } catch (error) {
    return log({ merged: false, reason: `merge_failed:${error instanceof Error ? error.message : String(error)}`, balanceBefore, balanceAfter: null }, extra);
  }
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
