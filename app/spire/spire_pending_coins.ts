/**
 * [PEAK-COINS] «Ожидающие» монеты Пика: ступень засчитана на телефоне → +N сразу на Главной, сервер потом сверяет.
 *
 * зачем (координатор 24.10, жалоба «монеты на Главной не меняются после ступени»; контракт 1 · ЯДРО 24.10): монеты за ступень
 * начисляет сервер при досылке очереди (spireReportSteps), и Главная ждала досылки (уход с экрана, фон, таймер, конец этажа).
 * Сервер не трогаем (магазинные сборки 142/143 не знают новых источников кошелька). Телефон кладёт «ожидающее» начисление
 * по reportId — той же сумме, что посчитает сервер (зеркало spireStepCoinOps); Главная показывает баланс + Σожидающих
 * своего владельца. Гасит ответ сервера в mergeSpireFlushWallet — в том же шаге, где вливается баланс, поэтому цифра не прыгает.
 * Это только ПОКАЗ: тратить «ожидающие» нельзя — кошелёк и проверки покупок их не видят.
 * Двойного нет: ключ — reportId (повтор не добавляет). Предохранитель — TTL 48 ч; смена владельца — чужое не показываем.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from '../debug-logger';

// зачем (сторож spire_game_source_contract: префикс [SPIRE] во всех файлах app/spire): контекст журнала — [SPIRE], метка задачи — в начале строки
const SPIRE = '[SPIRE]';
export const PEAK_COINS = '[PEAK-COINS]';
const KEY = 'spire_pending_coins_v1';
export const SPIRE_PENDING_TTL_MS = 48 * 60 * 60 * 1000;
/** Этаж вершины и Страж — зеркало functions/src/spire_config_contract.ts. */
const SUMMIT_FLOOR = 15;

export type SpirePendingCoinsConfig = Readonly<{ perStep: number; perFloorPerLevel: number; guardianMultiplier: number; summitBonus: number }>;
/** base — баланс кошелька в момент засчёта: облако прибавило base + coins и больше → монеты уже в балансе (Ревизор 24.10). */
export type SpirePendingEntry = Readonly<{ reportId: string; coins: number; atMs: number; base?: number }>;

/** Целое ≥1 — как spireCoinAmount сервера (предел журнала сервер держит сам; здесь суммы конфига малы). */
function amount(raw: number): number {
  return Math.max(1, Math.round(Number.isFinite(raw) ? raw : 0));
}

/**
 * Сколько монет даст пройденная ступень — то же правило, что spireStepCoinOps на сервере: ступень; закрыт этаж ≤15 — ещё
 * perFloorPerLevel × этаж (Страж, каждый 5-й, ×guardianMultiplier); закрыт 15-й — ещё вершина. Над облаками (16+) — только ступень
 * (Ядро 24.10 сверило со spireStepCoinOps: perStep платится за каждую новую ступень; старт над вершиной закрыт c2ad7ec38).
 */
export function spireStepPendingCoins(coins: SpirePendingCoinsConfig, floorBefore: number, floorCleared: boolean): number {
  let total = amount(coins.perStep);
  if (floorCleared && floorBefore >= 1 && floorBefore <= SUMMIT_FLOOR) {
    const base = coins.perFloorPerLevel * floorBefore;
    total += amount(floorBefore % 5 === 0 ? base * coins.guardianMultiplier : base);
    if (floorBefore === SUMMIT_FLOOR) total += amount(coins.summitBonus);
  }
  return total;
}

type Listener = () => void;
const memory = new Map<string, readonly SpirePendingEntry[]>();
const listeners = new Set<Listener>();
const hydrated = new Set<string>();

const isEntry = (v: unknown): v is SpirePendingEntry => !!v && typeof v === 'object'
  && typeof (v as SpirePendingEntry).reportId === 'string' && Number.isSafeInteger((v as SpirePendingEntry).coins)
  && (v as SpirePendingEntry).coins > 0 && typeof (v as SpirePendingEntry).atMs === 'number';

function fresh(list: readonly SpirePendingEntry[], nowMs: number, owner: string): readonly SpirePendingEntry[] {
  const kept = list.filter((e) => nowMs - e.atMs < SPIRE_PENDING_TTL_MS);
  for (const e of list) {
    if (!kept.includes(e)) DebugLogger.warn(SPIRE, `${PEAK_COINS} settle reason=ttl_48h drop report=${e.reportId} coins=${e.coins} owner=${owner.slice(0, 6)}`);
  }
  return kept;
}

function publish(owner: string, list: readonly SpirePendingEntry[]): void {
  memory.set(owner, list); // guard-ok: Map в памяти — показ ожидающих, не баланс и не Firestore
  for (const listener of listeners) listener();
  void AsyncStorage.setItem(`${KEY}::${owner}`, JSON.stringify(list)).catch((e: unknown) => { // guard-ok: локальная копия показа, сбой — в журнал; баланс пишет только кошелёк
    DebugLogger.warn(SPIRE, `${PEAK_COINS} store:write failed owner=${owner.slice(0, 6)} → ожидающие только в памяти: ${e instanceof Error ? e.message : String(e)}`);
  });
}

/** Поднять ожидающие владельца с диска (первый кадр Главной после перезапуска). */
export async function hydrateSpirePendingCoins(owner: string, nowMs: number = Date.now()): Promise<void> {
  if (!owner || hydrated.has(owner)) return;
  hydrated.add(owner);
  try {
    const raw = await AsyncStorage.getItem(`${KEY}::${owner}`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const disk = Array.isArray(parsed) ? parsed.filter(isEntry) : [];
    const mem = memory.get(owner) ?? [];
    const merged = [...mem, ...disk.filter((d) => !mem.some((m) => m.reportId === d.reportId))];
    const list = fresh(merged, nowMs, owner);
    DebugLogger.info(SPIRE, `${PEAK_COINS} hydrate owner=${owner.slice(0, 6)} disk=${disk.length} kept=${list.length} Σ=${list.reduce((s, e) => s + e.coins, 0)}`);
    if (list.length !== mem.length || list.some((e, i) => e !== mem[i])) publish(owner, list);
  } catch (e) {
    DebugLogger.warn(SPIRE, `${PEAK_COINS} hydrate failed owner=${owner.slice(0, 6)} → без ожидающих: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Ступень засчитана на телефоне → ожидающее начисление. Повтор того же reportId ничего не добавляет. */
export function addSpirePendingCoins(owner: string, reportId: string, coins: number, nowMs: number = Date.now(), base?: number): void {
  if (!owner || !reportId || !Number.isSafeInteger(coins) || coins <= 0) {
    DebugLogger.warn(SPIRE, `${PEAK_COINS} add skip reason=bad_input owner=${owner ? 'yes' : 'no'} report=${reportId || '-'} coins=${coins}`);
    return;
  }
  const list = memory.get(owner) ?? [];
  if (list.some((e) => e.reportId === reportId)) {
    DebugLogger.info(SPIRE, `${PEAK_COINS} add skip reason=duplicate report=${reportId}`);
    return;
  }
  const next = [...list, { reportId, coins, atMs: nowMs, ...(Number.isSafeInteger(base) && (base as number) >= 0 ? { base } : {}) }];
  DebugLogger.info(SPIRE, `${PEAK_COINS} add report=${reportId} coins=${coins} base=${base ?? '-'} Σ=${next.reduce((s, e) => s + e.coins, 0)}`);
  publish(owner, next);
}

/**
 * Снять ожидающее без монет: ступень, засчитанная сразу в момент итога, не легла на диск (save_failed) или на диске оказалась
 * повтором. зачем (координатор 25.10, вариант A; контракт Ядра 25.10): монеты показываются до записи — сбой записи их снимает,
 * подписчики (единый показ subscribeDisplayedRunes) обновляют число сами.
 */
export function removeSpirePendingCoins(owner: string | null | undefined, reportId: string, reason: string, late = false): void {
  if (!owner || !reportId) {
    DebugLogger.warn(SPIRE, `${PEAK_COINS} remove skip reason=bad_input owner=${owner ? 'yes' : 'no'} report=${reportId || '-'} why=${reason}`);
    return;
  }
  const list = memory.get(owner) ?? [];
  const hit = list.find((e) => e.reportId === reportId);
  if (!hit) {
    DebugLogger.info(SPIRE, `${PEAK_COINS} remove skip reason=not_pending report=${reportId} why=${reason}`);
    return;
  }
  const next = list.filter((e) => e.reportId !== reportId);
  DebugLogger.warn(SPIRE, `${PEAK_COINS} settle reason=${reason} late=${String(late)} report=${reportId} coins=${hit.coins} Σ=${next.reduce((s, e) => s + e.coins, 0)}`);
  publish(owner, next);
}

/**
 * Гасим по ответу spireReportSteps. accepted/duplicate — монеты уже в серверном балансе: снимаем, если баланс влит (merged)
 * или влит раньше (older_seq — баланс телефона уже новее). rejected — снимаем без монет. Нет вердикта — ждёт досылки.
 */
export function settleSpirePendingCoins(
  owner: string,
  results: readonly Readonly<{ reportId: string; verdict: string; reason?: string }>[],
  balanceApplied: boolean,
  balanceBefore: number | null,
  balanceAfter: number | null,
): void {
  const list = memory.get(owner) ?? [];
  if (list.length === 0) return;
  const verdicts = new Map(results.map((r) => [r.reportId, r] as const));
  const next = list.filter((e) => {
    const v = verdicts.get(e.reportId);
    if (!v) return true;
    if (v.verdict === 'rejected') {
      DebugLogger.warn(SPIRE, `${PEAK_COINS} settle reason=rejected report=${e.reportId} coins=${e.coins} server=${v.reason ?? '-'}`);
      return false;
    }
    if (!balanceApplied) {
      DebugLogger.info(SPIRE, `${PEAK_COINS} settle wait report=${e.reportId} verdict=${v.verdict} — баланс не влит, держим`);
      return true;
    }
    DebugLogger.info(SPIRE, `${PEAK_COINS} settle reason=verdict_${v.verdict} report=${e.reportId} coins=${e.coins} balanceBefore=${balanceBefore ?? '-'} balanceAfter=${balanceAfter ?? '-'}`);
    return false;
  });
  if (next.length !== list.length) publish(owner, next);
}

/**
 * Гасим по росту баланса (Ревизор 24.10): баланс пришёл из облака без вердиктов очереди (синк снимка, другой экран) — если
 * кошелёк дорос до base + накопленных монет ожидающих с той же базой, эти монеты уже в нём, показ без задвоения.
 */
export function settleSpirePendingByBalance(owner: string | null | undefined, balance: number): void {
  if (!owner || !Number.isFinite(balance)) return;
  const list = memory.get(owner) ?? [];
  if (list.length === 0) return;
  const running = new Map<number, number>();
  const settled = new Set<string>();
  for (const e of [...list].sort((a, b) => a.atMs - b.atMs)) {
    if (e.base === undefined) continue;
    const sum = (running.get(e.base) ?? 0) + e.coins;
    running.set(e.base, sum);
    if (balance >= e.base + sum) settled.add(e.reportId);
  }
  if (settled.size === 0) return;
  for (const e of list) {
    if (settled.has(e.reportId)) DebugLogger.info(SPIRE, `${PEAK_COINS} settle reason=balance_grew report=${e.reportId} coins=${e.coins} base=${e.base} balance=${balance}`);
  }
  publish(owner, list.filter((e) => !settled.has(e.reportId)));
}

/** Σ ожидающих владельца (для показа на Главной). */
export function spirePendingCoinsTotal(owner: string | null | undefined, nowMs: number = Date.now()): number {
  if (!owner) return 0;
  return (memory.get(owner) ?? []).filter((e) => nowMs - e.atMs < SPIRE_PENDING_TTL_MS).reduce((s, e) => s + e.coins, 0);
}

export function subscribeSpirePendingCoins(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); }; // guard-ok: снятие подписчика из памяти (Set), не запись данных
}

export function __resetSpirePendingCoinsForTests(): void {
  memory.clear();
  listeners.clear();
  hydrated.clear();
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
