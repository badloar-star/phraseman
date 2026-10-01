// PM-221 ратчет-проба карты серверных доменов.
// зачем: A1 (каждая функция имеет домен, возможность и статус) и A2
// (auth/purchases/account-delete/support всегда keep) — падаем, если правило нарушено.
// Запуск: npx tsx tests/pm221_server_domain_map.probe.ts (exit 0 = PASS).
import assert from 'node:assert/strict';

// @ts-expect-error — .mjs без деклараций типов
import { buildDomainMap, DOMAINS, STATUSES, PROTECTED_DOMAINS } from '../scripts/pm221_server_domain_map.mjs';

type Row = { name: string; type: string; domain: string; capability: string; status: string; sourcePath: string };
const { rows } = buildDomainMap(process.cwd()) as { rows: Row[] };

assert.ok(rows.length > 0, 'атлас не дал ни одной серверной функции');
const bad = rows.filter((r) => !r.domain || !DOMAINS.includes(r.domain) || !r.status || !STATUSES.includes(r.status) || !r.capability?.trim());
assert.deepEqual(bad.map((r) => r.name), [], 'A1: функции без домена/статуса/возможности');
const protectedNotKeep = rows.filter((r) => PROTECTED_DOMAINS.includes(r.domain) && r.status !== 'keep');
assert.deepEqual(protectedNotKeep.map((r) => `${r.domain}:${r.name}`), [], 'A2: защищённый домен помечен не keep');
// зачем: имена с auth/purchase/delete/support-признаками не должны уезжать в домен «мусорных» статусов.
const sensitive = /^(auth|accountDelete|accountClaim|accountMerge|submitClientReport|revenueCat|stripeWebhook|webCheckout|adminSupport)/u;
const sensitiveBad = rows.filter((r) => sensitive.test(r.name) && r.status !== 'keep');
assert.deepEqual(sensitiveBad.map((r) => r.name), [], 'A2: чувствительная функция не keep');

// зачем (PM-221-A1, 2026-10-01): храповик — без решения владельца остаются только эти функции.
// Новая функция без домена-решения уронит пробу; закрытый вопрос — убрать имя отсюда.
const OWNER_DECISION_ALLOWLIST = ['statsInsightsGenerate', 'weeklyReviewGenerate'];
const undecided = rows.filter((r) => r.status === 'needs-owner-decision').map((r) => r.name).sort();
const unexpected = undecided.filter((n) => !OWNER_DECISION_ALLOWLIST.includes(n));
assert.deepEqual(unexpected, [], 'A1: новая функция без привязки к сохраняемой возможности');

const inDomain =(d: string) => rows.filter((r) => r.domain === d).length;
process.stdout.write(`PM-221 PROBE PASS: total=${rows.length} keep=${rows.filter((r) => r.status === 'keep').length} tombstone=${rows.filter((r) => r.status === 'retired-tombstone').length} owner-decision=${rows.filter((r) => r.status === 'needs-owner-decision').length} protected=${PROTECTED_DOMAINS.map((d: string) => `${d}=${inDomain(d)}`).join(',')}\n`);
