import { HttpsError } from 'firebase-functions/v2/https';
import { hasPermission, type AdminPermission } from '../admin/permissions';
import { hasAdminRole, type AdminRole } from '../admin/roles';

/**
 * Auth-гейт для owner-facing секции "Стадия роста бизнеса" — паттерн скопирован
 * с jarvis/all_departments_callables.ts (requireAllDepartmentsAccess), но
 * СОЗНАТЕЛЬНО не импортирован оттуда напрямую: эта фича не должна зависеть от
 * internal Jarvis модуля (разные вопросы — "когда бить тревогу" vs "какая
 * стадия бизнеса для владельца"), чтобы будущие правки Jarvis не могли молча
 * задеть эту панель и наоборот.
 *
 * ДВА разных гейта:
 *  - READ (чтение истории/тира) — те же три права, что у Jarvis-свода:
 *    money.read + users.read + diagnostics.read. analyst имеет все три.
 *  - BACKFILL (запуск тяжёлого одноразового пересчёта) — СТРОЖЕ: только
 *    owner/admin. Совет (Advisor, Opus 5): analyst тоже прошёл бы read-гейт
 *    по правам, но backfill стоит реальных денег на чтениях Firestore —
 *    случайный повторный запуск аналитиком не должен быть возможен.
 */

interface CallableAuth {
  readonly uid?: string;
  readonly token?: Record<string, unknown>;
}

export interface CallableRequestLike {
  readonly auth?: CallableAuth | null;
}

const READ_PERMISSIONS: readonly AdminPermission[] = ['money.read', 'users.read', 'diagnostics.read'];
const BACKFILL_ROLES: readonly AdminRole[] = ['owner', 'admin'];

function requireAuthenticatedAdmin(request: CallableRequestLike): AdminRole {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const claimedRole = request.auth.token.adminRole;
  if (!hasAdminRole(claimedRole)) throw new HttpsError('permission-denied', 'Valid adminRole required');
  return claimedRole;
}

export function requireBusinessTierReadAccess(request: CallableRequestLike): void {
  const role = requireAuthenticatedAdmin(request);
  const missing = READ_PERMISSIONS.find((permission) => !hasPermission(role, permission));
  if (missing) throw new HttpsError('permission-denied', `Role cannot use ${missing}`);
}

export function requireBusinessTierBackfillAccess(request: CallableRequestLike): void {
  const role = requireAuthenticatedAdmin(request);
  if (!BACKFILL_ROLES.includes(role)) {
    throw new HttpsError('permission-denied', 'Backfill requires owner or admin role');
  }
}
