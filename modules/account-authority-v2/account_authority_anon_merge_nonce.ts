/*
 * Account Authority 2.0, этап S2b, пункт 9: одноразовый nonce метки
 * anon_merge_claim (M-1 / HIGH-1). Контракт:
 * docs/work/tasks/account-v2-client-anon-merge-nonce-contract-2026-10-03.md
 *
 * зачем: сервер отдаёт nonce на постановке метки (`nonceRequested: true`) и
 * хранит у себя только его sha256. Предъявить nonce может лишь тот процесс,
 * который ставил метку, — так слияние анонимного аккаунта доказывает «то же
 * устройство» без legacy-пути.
 *
 * Правила секрета:
 *   - живёт ТОЛЬКО в памяти процесса (Map в этом модуле), по stableId;
 *   - срок — не больше 10 минут (вход дольше не длится);
 *   - не пишется ни в AsyncStorage, ни в SecureStore, ни в логи/аналитику:
 *     лог видит только факт (issued/absent/attached/expired/cleared);
 *   - стирается после слияния, по завершении входа (успех, отказ, отмена) и
 *     по истечении срока.
 * Старый сервер ответа `mergeNonce` не даёт — работаем без nonce (legacy-путь).
 */
import { safeAccountAuthorityLogger, type AccountAuthorityLogger } from './account_authority_logger';

export const ANON_MERGE_NONCE_TTL_MS = 10 * 60_000;
/** Сервер принимает строку 1..128 (parseAnonMergeNonce в functions/src/auth_identity.ts). */
const NONCE_MAX_LENGTH = 128;

type Entry = Readonly<{ secret: string; issuedAtMs: number }>;

const entries = new Map<string, Entry>();
let log: AccountAuthorityLogger = safeAccountAuthorityLogger(undefined);

/** Только для тестов: подменить логгер (по умолчанию console с префиксом AA). */
export function setAnonMergeNonceLoggerForTests(logger: AccountAuthorityLogger | undefined): void {
  log = safeAccountAuthorityLogger(logger);
}

function normalizeStableId(stableId: string): string {
  return String(stableId || '').trim();
}

function isValidSecret(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= NONCE_MAX_LENGTH;
}

/**
 * Разбор ответа `authStampAnonOwnership`. Есть валидный `mergeNonce` — запомнить
 * для stableId. Нет — старый сервер, работаем без nonce (и стираем прежний,
 * чтобы не предъявить чужой метке устаревший секрет).
 */
export function acceptAnonMergeStampResponse(
  stableIdRaw: string,
  response: unknown,
  nowMs: number = Date.now(),
): 'issued' | 'absent' | 'invalid' {
  const stableId = normalizeStableId(stableIdRaw);
  if (!stableId) {
    log.warn('anon_merge_nonce stamp_skipped', { reason: 'stable_id_missing' });
    return 'invalid';
  }
  const data = typeof response === 'object' && response !== null
    ? (response as { data?: unknown }).data
    : undefined;
  const candidate = typeof data === 'object' && data !== null
    ? (data as { mergeNonce?: unknown }).mergeNonce
    : undefined;
  if (candidate === undefined || candidate === null) {
    entries.delete(stableId);
    log.info('anon_merge_nonce absent', { reason: 'legacy_server' });
    return 'absent';
  }
  if (!isValidSecret(candidate)) {
    entries.delete(stableId);
    log.warn('anon_merge_nonce absent', { reason: 'malformed_response' });
    return 'invalid';
  }
  entries.set(stableId, Object.freeze({ secret: candidate, issuedAtMs: nowMs }));
  log.info('anon_merge_nonce issued', { result: 'memory_only' });
  return 'issued';
}

/** Nonce для stableId или null (нет / истёк — истёкший стирается). */
export function peekAnonMergeNonce(stableIdRaw: string, nowMs: number = Date.now()): string | null {
  const stableId = normalizeStableId(stableIdRaw);
  const entry = stableId ? entries.get(stableId) : undefined;
  if (entry === undefined) return null;
  const age = nowMs - entry.issuedAtMs;
  if (age < 0 || age > ANON_MERGE_NONCE_TTL_MS) {
    entries.delete(stableId);
    log.info('anon_merge_nonce expired', { reason: age < 0 ? 'clock_rollback' : 'ttl' });
    return null;
  }
  return entry.secret;
}

/**
 * Поле `anonMergeNonce` для data callable: `{ anonMergeNonce }`, если nonce есть
 * хотя бы для одного из stableId, иначе пустой объект. Лог — только факт.
 */
export function anonMergeNonceField(
  source: 'ensure_link' | 'merge',
  stableIds: readonly string[],
  nowMs: number = Date.now(),
): Readonly<{ anonMergeNonce?: string }> {
  for (const stableId of stableIds) {
    const secret = peekAnonMergeNonce(stableId, nowMs);
    if (secret !== null) {
      log.info('anon_merge_nonce attached', { source });
      return Object.freeze({ anonMergeNonce: secret });
    }
  }
  if (entries.size > 0) log.info('anon_merge_nonce not_attached', { source, reason: 'other_stable_id' });
  return Object.freeze({});
}

/** Стереть nonce для перечисленных stableId (после успешного слияния). */
export function forgetAnonMergeNonce(stableIds: readonly string[], reason: 'merged' | 'cancelled'): void {
  let cleared = 0;
  for (const stableId of stableIds) {
    if (entries.delete(normalizeStableId(stableId))) cleared += 1;
  }
  if (cleared > 0) log.info('anon_merge_nonce cleared', { reason, count: cleared });
}

/** Стереть всё (вход завершён любым исходом). */
export function forgetAllAnonMergeNonces(reason: 'sign_in_settled' | 'sign_out' | 'tests'): void {
  const count = entries.size;
  entries.clear();
  if (count > 0) log.info('anon_merge_nonce cleared', { reason, count });
}

/** Только для тестов: сколько секретов в памяти. */
export function anonMergeNonceCountForTests(): number {
  return entries.size;
}
