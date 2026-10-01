// PM-233 / D137 — выдать Plus людям, чей чек Plus магазин подтвердил, а сервер отклонил
// (коллекция revenuecat_premium_denials).
//
// зачем: решение владельца D137 (2026-10-01): «выдать всем Plus; исполнение в проде —
// только по команде владельца (скрипт с сухим прогоном)». Поэтому скрипт по умолчанию
// ТОЛЬКО печатает план — агрегаты без uid/почты/имён. Запись возможна лишь при
// одновременно: --execute + --confirm=D137_GRANT_PLUS + --days=N + цель
// (эмулятор: --emulator и FIRESTORE_EMULATOR_HOST; прод: --project=<id> и
// --owner-command=<дословная команда владельца>). Иначе — отказ с кодом 2.
//
// Как выдаётся Plus: тот же путь, что у админской кнопки «Выдать Plus» (D86, adminGrantAccess):
// buildAdminAccessPatch(kind 'vip') + writeAccessProjectionFromPatch + запись в admin_log и
// идемпотентная операция admin_command_operations/pm233_d137_<hash>. Повторный запуск
// ничего не выдаёт второй раз. Удалённые/удаляемые аккаунты пропускаются.
//
// Запуск:
//   node scripts/pm233_grant_plus_for_denials.mjs                      → как запускать (без доступа к данным)
//   node scripts/pm233_grant_plus_for_denials.mjs --fixture=<file.json> → сухой прогон по фикстуре
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/pm233_grant_plus_for_denials.mjs --emulator
//                                                                       → сухой прогон по эмулятору
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[PM233-D137]';
export const CONFIRM_TOKEN = 'D137_GRANT_PLUS';
const DENIALS = 'revenuecat_premium_denials';
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const MAX_DAYS = 3650;
const GRANT_REASON = 'D137: оплаченный чек Plus, отклонённый сервером (revenuecat_premium_denials)';

/** Разбор аргументов `--key=value` / `--flag`. */
export function parseArgs(argv) {
  const out = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const eq = raw.indexOf('=');
    if (eq === -1) out[raw.slice(2)] = true;
    else out[raw.slice(2, eq)] = raw.slice(eq + 1);
  }
  return out;
}

/**
 * Куда относится отказ. Причину печатаем, uid — никогда.
 * grantable — есть один владелец; needs_identity — владельца не установить по записи
 * (аноним, неоднозначно, TRANSFER хранит только хэши); skip_deleted_account — аккаунт удалён.
 */
export function classifyDenial(id, doc) {
  const reason = String(doc?.reason ?? 'unknown').slice(0, 80);
  if (/^account_deletion/.test(reason)) return { reason, kind: 'skip_deleted_account', ownerUid: null };
  if (String(id).startsWith('transfer_')) return { reason, kind: 'needs_identity', ownerUid: null };
  if (Array.isArray(doc?.ownerUids) && doc.ownerUids.length > 0) return { reason, kind: 'needs_identity', ownerUid: null };
  const ownerUid = typeof doc?.ownerUid === 'string' ? doc.ownerUid.trim() : '';
  if (!UID_RE.test(ownerUid)) return { reason, kind: 'needs_identity', ownerUid: null };
  return { reason, kind: 'grantable', ownerUid };
}

/** Агрегатный план без PII: только количества. */
export function buildPlan(denials, { days = null, source = 'none' } = {}) {
  const byReason = {};
  const owners = new Set();
  const totals = { denials: 0, grantable: 0, needs_identity: 0, skip_deleted_account: 0 };
  for (const { id, doc } of denials) {
    const c = classifyDenial(id, doc);
    totals.denials += 1;
    totals[c.kind] += 1;
    byReason[c.reason] = byReason[c.reason] ?? { grantable: 0, needs_identity: 0, skip_deleted_account: 0 };
    byReason[c.reason][c.kind] += 1;
    if (c.ownerUid) owners.add(c.ownerUid);
  }
  return {
    decision: 'D137',
    source,
    executes: false,
    totals,
    uniqueOwnersToGrant: owners.size,
    byReason,
    grant: { kind: 'vip (как кнопка «Выдать Plus», D86)', days: days ?? 'не задано (--days=N обязателен для исполнения; 0 = бессрочно)' },
    note: 'needs_identity — владельца по записи отказа не установить (аноним/неоднозначно/TRANSFER с хэшами): разбирать вручную. Удалённые аккаунты Plus не получают.',
  };
}

export function ownerHash(uid) {
  return createHash('sha256').update(uid).digest('hex').slice(0, 32);
}

/** Проверка права на исполнение. Возвращает текст отказа или null. */
export function executeRefusal(args, env = process.env) {
  if (!args.execute) return null;
  if (args.confirm !== CONFIRM_TOKEN) return `--execute без --confirm=${CONFIRM_TOKEN} отклонён`;
  const days = Number(args.days);
  if (args.days === undefined || args.days === true || !Number.isInteger(days) || days < 0 || days > MAX_DAYS) {
    return `--execute требует --days=N (целое 0..${MAX_DAYS}; 0 = бессрочно)`;
  }
  if (args.fixture) return '--execute не работает с фикстурой: фикстура только для сухого прогона';
  if (args.emulator) {
    if (!env.FIRESTORE_EMULATOR_HOST) return '--emulator требует FIRESTORE_EMULATOR_HOST';
    if (args.project) return '--emulator и --project одновременно запрещены';
    return null;
  }
  if (typeof args.project !== 'string' || !args.project.trim()) return 'прод без --project=<id> запрещён';
  if (typeof args['owner-command'] !== 'string' || args['owner-command'].trim().length < 10) {
    return 'прод без --owner-command="<дословная команда владельца>" запрещён (D137)';
  }
  if (env.FIRESTORE_EMULATOR_HOST) return 'FIRESTORE_EMULATOR_HOST задан — прод и эмулятор не смешиваем';
  return null;
}

function readFixture(path) {
  const raw = JSON.parse(readFileSync(resolve(REPO, path), 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.denials;
  if (!Array.isArray(list)) throw new Error('fixture: ожидается массив или { denials: [...] }');
  return list.map((row, index) => ({ id: String(row.id ?? `fixture_${index}`), doc: row }));
}

async function openFirestore(args) {
  // зачем: firebase-admin грузится ТОЛЬКО когда есть явная цель (эмулятор или прод с --project).
  const requireFn = createRequire(resolve(REPO, 'functions', 'package.json'));
  const admin = requireFn('firebase-admin');
  const projectId = args.emulator ? (process.env.GCLOUD_PROJECT || 'demo-phraseman') : String(args.project).trim();
  if (!admin.apps.length) admin.initializeApp({ projectId });
  return { admin, db: admin.firestore(), requireFn };
}

async function readDenials(db) {
  const snap = await db.collection(DENIALS).get();
  return snap.docs.map((d) => ({ id: d.id, doc: d.data() }));
}

async function executeGrants({ admin, db, requireFn }, denials, days) {
  // Тот же код, что у adminGrantAccess — берём из собранных функций, чтобы не разойтись.
  let lib;
  try {
    lib = {
      access: requireFn('./lib/functions/src/admin_access_controls.js'),
      projection: requireFn('./lib/functions/src/access_projection.js'),
      audit: requireFn('./lib/functions/src/admin/audit_contract.js'),
      deletion: requireFn('./lib/functions/src/account_delete_job.js'),
    };
  } catch (error) {
    throw new Error(`нет собранных функций (npm --prefix functions run build): ${error.message}`);
  }
  const owners = new Map();
  for (const { id, doc } of denials) {
    const c = classifyDenial(id, doc);
    if (c.kind !== 'grantable') continue;
    owners.set(c.ownerUid, [...(owners.get(c.ownerUid) ?? []), id]);
  }
  const result = { granted: 0, replayed: 0, skippedDeleted: 0, failed: 0, failures: {} };
  for (const [uid, denialIds] of owners) {
    const hash = ownerHash(uid);
    const opRef = db.collection('admin_command_operations').doc(`pm233_d137_${hash}`);
    try {
      const outcome = await db.runTransaction(async (tx) => {
        const op = await tx.get(opRef);
        if (op.exists) return 'replayed';
        const target = await lib.access.resolveCanonicalAdminAccessTarget(tx, db, uid);
        const deletionSnaps = await Promise.all([
          tx.get(db.collection(lib.deletion.ACCOUNT_DELETE_TOMBSTONES).doc(target.uid)),
          tx.get(db.collection(lib.deletion.ACCOUNT_DELETE_AUTH_MARKERS).doc(target.uid)),
          tx.get(db.collection(lib.deletion.ACCOUNT_DELETE_PERMANENT_DENIALS).doc(lib.deletion.accountDeletePermanentDenialId(target.uid))),
        ]);
        if (deletionSnaps.some((s) => s.exists)) return 'skipped_deleted';
        const now = Date.now();
        const requestId = `pm233_d137_${hash}`;
        const input = lib.access.normalizeAdminAccessInput({
          uid: target.uid, kind: 'vip', durationDays: days, active: true,
          reason: GRANT_REASON, requestId, idempotencyKey: requestId,
        });
        const data = target.snapshot.data() ?? {};
        const patch = lib.access.buildAdminAccessPatch(data, input, now);
        const auditRef = db.collection('admin_log').doc();
        const audit = lib.audit.createAuditRecord({
          action: 'grant_vip', actorUid: 'script:pm233_d137', role: 'owner',
          entity: { collection: 'users', id: target.uid }, reason: GRANT_REASON,
          before: patch.before, after: patch.after, requestId, timestamp: new Date(now).toISOString(),
        });
        tx.update(target.ref, { ...patch.updates, updatedAt: now });
        const progress = data.progress && typeof data.progress === 'object' && !Array.isArray(data.progress) ? data.progress : {};
        lib.projection.writeAccessProjectionFromPatch(tx, target.ref, progress, patch.updates, now);
        tx.create(auditRef, { ...audit, operationId: opRef.id });
        tx.create(opRef, {
          action: 'pm233_d137_grant_plus', decision: 'D137', denialIds, durationDays: days,
          auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return 'granted';
      });
      if (outcome === 'granted') result.granted += 1;
      else if (outcome === 'replayed') result.replayed += 1;
      else result.skippedDeleted += 1;
    } catch (error) {
      // Причину пишем без uid: только код ошибки и хэш владельца.
      result.failed += 1;
      const code = String(error?.code ?? error?.message ?? 'unknown').slice(0, 80);
      result.failures[code] = (result.failures[code] ?? 0) + 1;
      console.error(`${LOG} grant failed owner=${hash} code=${code}`);
    }
  }
  return result;
}

const USAGE = `${LOG} D137: сухой прогон по умолчанию, данные не читаются без явного источника.
  --fixture=<file.json>          сухой прогон по фикстуре (массив записей отказов)
  --emulator                     сухой прогон по эмулятору (нужен FIRESTORE_EMULATOR_HOST)
  --project=<id> --owner-command="<команда владельца>"   чтение прода (только по команде владельца)
  --execute --confirm=${CONFIRM_TOKEN} --days=N         запись; без всех условий — отказ (код 2)`;

export async function main(argv, env = process.env) {
  const args = parseArgs(argv);
  const refusal = executeRefusal(args, env);
  if (refusal) {
    console.error(`${LOG} refused: ${refusal}`);
    return 2;
  }
  const days = args.days === undefined || args.days === true ? null : Number(args.days);
  if (args.fixture) {
    const plan = buildPlan(readFixture(String(args.fixture)), { days, source: 'fixture' });
    console.log(JSON.stringify(plan, null, 2));
    return 0;
  }
  const prodRead = typeof args.project === 'string' && args.project.trim();
  if (!args.emulator && !prodRead) {
    console.log(USAGE);
    return 0;
  }
  if (args.emulator && !env.FIRESTORE_EMULATOR_HOST) {
    console.error(`${LOG} refused: --emulator требует FIRESTORE_EMULATOR_HOST`);
    return 2;
  }
  if (prodRead && (typeof args['owner-command'] !== 'string' || args['owner-command'].trim().length < 10)) {
    console.error(`${LOG} refused: чтение прода без --owner-command запрещено (D137)`);
    return 2;
  }
  const firestore = await openFirestore(args);
  const denials = await readDenials(firestore.db);
  const plan = buildPlan(denials, { days, source: args.emulator ? 'emulator' : 'prod' });
  console.log(JSON.stringify(plan, null, 2));
  if (!args.execute) return 0;
  const result = await executeGrants(firestore, denials, days);
  console.log(JSON.stringify({ decision: 'D137', executed: true, target: plan.source, ...result }, null, 2));
  return result.failed > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (error) => {
    console.error(`${LOG} failed: ${error?.message ?? error}`);
    process.exitCode = 1;
  });
}
