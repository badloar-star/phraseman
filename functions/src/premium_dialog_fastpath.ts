/**
 * Быстрый путь диалога: то, что стояло МЕЖДУ нажатием «отправить» и вызовом модели.
 *
 * зачем (владелец 2026-09-14: «диалоги отвечают супер долго, ускорь на 100%»):
 * замер цепочки premiumDialogStream показал перед первым байтом ответа модели
 * 7–8 ПОСЛЕДОВАТЕЛЬНЫХ обращений к Firestore на КАЖДУЮ реплику —
 * личность (deletion-pending → auth_links → users), затем подписка (auth_links +
 * запрос users + документы кандидатов), затем две транзакции лимитов. Личность и
 * подписка человека за минуту разговора не меняются, а перечитывались каждый раз.
 *
 * Здесь они кэшируются в памяти тёплого инстанса на короткий TTL. Кэш НЕ расширяет
 * доступ: истёкший Plus проживёт на том же инстансе не дольше TTL, и только для
 * диалога/перевода. Ошибки не кэшируются — следующая реплика перечитает.
 *
 * Модуль без зависимостей от сети кроме переданных резолверов — так его можно
 * тестировать чистыми функциями (см. premium_dialog_fastpath.test.ts).
 */

/** Личность + подписка, снятые одним заходом. */
export interface DialogIdentity {
  stableUid: string;
  isPremium: boolean;
}

/** Гейты диалога из remote_config/app — оба живут в ОДНОМ документе. */
export interface DialogGates {
  aiOff: boolean;
  gatedByPremium: boolean;
}

interface CacheEntry<T> {
  value: T;
  expiresAtMs: number;
}

/**
 * 60 с: за это время подписка не успевает «пропасть» незаметно (клиент и так
 * показывает Plus по своему кэшу), а рефанд/истечение догоняют на следующей минуте.
 */
export const DIALOG_IDENTITY_CACHE_TTL_MS = 60 * 1000;
/** 30 с: рубильник ИИ из «Пульта» доезжает за полминуты — как и остальные конфиги. */
export const DIALOG_GATES_CACHE_TTL_MS = 30 * 1000;

const identityCache = new Map<string, CacheEntry<DialogIdentity>>();
let gatesCache: CacheEntry<DialogGates> | null = null;

/** Сброс — для тестов и для админских правок, которым нужен мгновенный эффект. */
export function __resetDialogFastpathCache(): void {
  identityCache.clear();
  gatesCache = null;
}

/**
 * Личность и подписка по authUid с кэшем на инстанс.
 * Резолверы передаются снаружи: модуль не знает про Firestore.
 */
export async function resolveDialogIdentityCached(
  authUid: string,
  resolve: () => Promise<DialogIdentity>,
  nowMs: number = Date.now(),
  ttlMs: number = DIALOG_IDENTITY_CACHE_TTL_MS,
): Promise<DialogIdentity & { fromCache: boolean }> {
  const hit = identityCache.get(authUid);
  if (hit && hit.expiresAtMs > nowMs) {
    return { ...hit.value, fromCache: true };
  }
  const fresh = await resolve();
  // Кэшируем только удачный ответ: отказ (deletion pending, mismatch) должен
  // перепроверяться каждый раз — иначе одна ошибка залипла бы на минуту.
  identityCache.set(authUid, { value: fresh, expiresAtMs: nowMs + ttlMs });
  return { ...fresh, fromCache: false };
}

/** Гейты диалога с кэшем на инстанс (один документ вместо двух чтений на реплику). */
export async function resolveDialogGatesCached(
  resolve: () => Promise<DialogGates>,
  nowMs: number = Date.now(),
  ttlMs: number = DIALOG_GATES_CACHE_TTL_MS,
): Promise<DialogGates & { fromCache: boolean }> {
  if (gatesCache && gatesCache.expiresAtMs > nowMs) {
    return { ...gatesCache.value, fromCache: true };
  }
  const fresh = await resolve();
  gatesCache = { value: fresh, expiresAtMs: nowMs + ttlMs };
  return { ...fresh, fromCache: false };
}

/**
 * Таймер стадий запроса. Печатает одну строку `[DIALOG-LAT]` в конце — по ней
 * владелец одним grep видит, где именно ушло время: auth / identity / limits /
 * первый токен модели / полный ответ. Только длительности и коды, без текста и uid.
 */
export interface StageTimer {
  mark: (stage: string) => void;
  elapsedMs: () => number;
  summary: () => Record<string, number>;
}

export function createStageTimer(now: () => number = Date.now): StageTimer {
  const startedAt = now();
  const marks: Record<string, number> = {};
  return {
    mark: (stage) => {
      // Первая отметка стадии побеждает: повторный mark той же стадии не сдвигает её.
      if (marks[stage] === undefined) marks[stage] = now() - startedAt;
    },
    elapsedMs: () => now() - startedAt,
    summary: () => ({ ...marks, totalMs: now() - startedAt }),
  };
}
