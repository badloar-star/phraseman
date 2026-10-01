/*
 * Account V2, Пакет 5 — контракт совместимости клиентов и cutover.
 *
 * Это намеренно чистая функция: ни Firestore, ни Firebase, ни сеть. Она
 * отвечает только на вопрос «можно ли этому клиенту читать/писать и можно ли
 * переходить к следующей фазе». Применение миграции, отключение legacy-sync и
 * purge выполняются отдельными оркестраторами после этой проверки.
 *
 * СТАТУС (PM-235, принято Account V2 2026-10-01, TG-4D4949E78A5B): МОДЕЛЬ/КОНТРАКТ,
 * к рантайму НЕ подключена — её не импортирует ни одна функция и ни один клиент
 * (только свои тесты и two_device_idempotency.test.ts). Подключение — отдельным решением.
 * зачем так: фазы описывают порядок выкладки, а исполняют его реальные флаги ниже;
 * вторая «правда» о фазах в рантайме разошлась бы с флагами.
 * Сопоставление с реальными флагами (в коде не закреплено, держится этим комментарием):
 *   legacy     = config/accounts_v2.syncEnabled=false ИЛИ remote accounts_v2_client_enabled=false;
 *   dual_write = оба true, accounts_v2_legacy_sync_disabled=false;
 *   v2_cutover = accounts_v2_legacy_sync_disabled=true (Пакет 7B; предусловие — force_update +
 *                min_app_version = первая сборка 2.0, см. account-v2-status «Предусловие 7B»);
 *   purged     = чистка старых полей users/{uid} (OD20, 30 дней, по команде владельца) — НЕ
 *                реализована: legacyCleanupPaths (report.ts) возвращает [] для любого отчёта.
 *   hydration 'verified' ≈ метка гидрации accounts_v2_legacy_hydrated_v1 этого uid (7A);
 *   migrationStatus/applyAllowed ≈ accounts_v2_meta/migration {status done|hold|partial|not_found_yet}.
 * Расхождение модели и рантайма: «legacy_write_blocked_after_cutover» в рантайме есть только у
 * НОВОГО клиента (выключатель 7A не пишет V2-домены в старое облако). Старые версии приложения
 * сервер не блокирует (серверного min-version нет — PM-235 T2); E2E J подтвердил: их правки
 * после переноса V2 не видит. Отсюда предусловие 7B.
 */

export const ACCOUNT_V2_MIGRATION_SCHEMA_VERSION = 1 as const;

export type MigrationPhase = 'legacy' | 'dual_write' | 'v2_cutover' | 'purged';
export type HydrationState = 'missing' | 'verified';
export type MigrationProtocolVersion = 1 | 2;
export type MigrationOperation = 'read' | 'write';

export type MigrationCutoverState = Readonly<{
  /** Версия именно этого контракта, не версия payload-операции Account V2. */
  schemaVersion: number;
  phase: MigrationPhase;
  legacySyncDisabled: boolean;
  hydration: HydrationState;
  migrationStatus: 'ready' | 'hold';
  applyAllowed: boolean;
  pendingDomainCount: number;
  backupVerified: boolean;
  /** Пока true, откат до purge должен оставаться возможным. */
  rollbackWindowOpen: boolean;
  purgeCompleted: boolean;
}>;

export type MigrationClientRequest = Readonly<{
  protocolVersion: MigrationProtocolVersion;
  operation: MigrationOperation;
}>;

export type MigrationCutoverDecision = Readonly<{
  valid: boolean;
  clientAllowed: boolean;
  cutoverAllowed: boolean;
  purgeAllowed: boolean;
  rollbackAllowed: boolean;
  reasons: readonly string[];
}>;

function addReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function stateReasons(state: MigrationCutoverState): string[] {
  const reasons: string[] = [];
  if (state.schemaVersion !== ACCOUNT_V2_MIGRATION_SCHEMA_VERSION) addReason(reasons, 'unsupported_schema_version');
  if (state.migrationStatus !== 'ready') addReason(reasons, 'migration_not_ready');
  if (state.applyAllowed !== true) addReason(reasons, 'apply_forbidden');
  if (!Number.isSafeInteger(state.pendingDomainCount) || state.pendingDomainCount < 0) {
    addReason(reasons, 'invalid_pending_domain_count');
  } else if (state.pendingDomainCount !== 0) {
    addReason(reasons, 'pending_domain');
  }
  if (state.hydration !== 'verified') addReason(reasons, 'hydration_missing');
  if (state.backupVerified !== true) addReason(reasons, 'backup_unverified');
  return reasons;
}

/**
 * Проверяет совместимость клиента и фазовые gates. Функция не меняет state.
 * Старый протокол читается до purge, но писать после v2_cutover нельзя;
 * после purge старый клиент полностью блокируется.
 */
export function evaluateMigrationCutover(
  state: MigrationCutoverState,
  request?: MigrationClientRequest,
): MigrationCutoverDecision {
  const reasons = stateReasons(state);
  const valid = !reasons.includes('unsupported_schema_version') && !reasons.includes('invalid_pending_domain_count');

  let clientAllowed = true;
  if (request) {
    if (request.protocolVersion === 1) {
      if (state.phase === 'purged' || state.purgeCompleted) {
        clientAllowed = false;
        addReason(reasons, 'legacy_read_blocked_after_purge');
      } else if (request.operation === 'write' && (state.phase === 'v2_cutover' || state.legacySyncDisabled)) {
        clientAllowed = false;
        addReason(reasons, 'legacy_write_blocked_after_cutover');
      }
    } else if (request.protocolVersion === 2) {
      if (state.phase === 'legacy') {
        clientAllowed = false;
        addReason(reasons, 'v2_not_available_before_dual_write');
      } else if (state.hydration !== 'verified') {
        clientAllowed = false;
        addReason(reasons, 'v2_access_requires_hydration');
      }
    }
  }

  const baseGatesPass = valid
    && state.migrationStatus === 'ready'
    && state.applyAllowed === true
    && state.pendingDomainCount === 0
    && state.hydration === 'verified'
    && state.backupVerified === true;

  let cutoverAllowed = false;
  if (baseGatesPass && state.phase === 'dual_write' && state.rollbackWindowOpen) {
    cutoverAllowed = true;
  } else if (state.phase !== 'dual_write') {
    addReason(reasons, 'cutover_requires_dual_write');
  } else if (!state.rollbackWindowOpen) {
    addReason(reasons, 'rollback_window_closed');
  }

  let purgeAllowed = false;
  if (baseGatesPass && state.phase === 'v2_cutover' && state.legacySyncDisabled
    && !state.purgeCompleted && !state.rollbackWindowOpen) {
    purgeAllowed = true;
  } else {
    if (state.phase !== 'v2_cutover') addReason(reasons, 'purge_requires_v2_cutover');
    if (!state.legacySyncDisabled) addReason(reasons, 'legacy_sync_must_be_disabled');
    if (state.rollbackWindowOpen) addReason(reasons, 'rollback_window_open');
  }

  const rollbackAllowed = valid && !state.purgeCompleted && state.phase !== 'purged'
    && state.backupVerified === true && state.rollbackWindowOpen;
  if (!rollbackAllowed && (state.purgeCompleted || state.phase === 'purged')) {
    addReason(reasons, 'rollback_forbidden_after_purge');
  }

  return { valid, clientAllowed, cutoverAllowed, purgeAllowed, rollbackAllowed, reasons };
}

