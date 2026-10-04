// PM-229 (A1) — ратчет «не подавлять ошибки молча» для серверного кода.
//
// зачем: клиентская проба tests/pm229_silent_catch.probe.ts сторожит app/ и
// modules/, а сервер (functions/src) не сторожил никто. Немой `.catch(() => null)`
// на чтении при удалении аккаунта/проверке покупки превращает сбой в «записи нет»
// без единой строки в логе. Правило: причину пишем через swallowed(tag, fallback)
// из ./swallowed_error (одна строка logger.warn с префиксом [PM-229]).
//
// Считаем немыми: `catch {}` с пустым телом и `.catch(() => null|undefined|{}|false|0|'')`.
// BASELINE — потолок на файл, может только сокращаться (устаревшая запись тоже
// роняет тест). Намеренный разрыв цепочки очереди (`tail = next.catch(...)`)
// допустим и учтён в базе. Код MAX (max_*) законсервирован владельцем — не трогаем.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { reportSwallowedServer, swallowed } from './swallowed_error';

const SRC = __dirname;
const SKIP = new Set(['generated', 'node_modules', 'lib']);

// Только сокращать. Новые файлы сюда не добавлять — логируй причину через swallowed().
const BASELINE: Record<string, number> = {
  'admin_alert_context.ts': 4,
  'admin_alerts.ts': 1,
  'admin_asset_studio.ts': 1,
  'admin_director_digest_audio.ts': 1,
  'admin_push_jobs.ts': 2,
  'admin_user_profile.ts': 2,
  'app_messages.ts': 1,
  'content_factory/artifact_edit.ts': 1,
  'content_factory/v2_firebase_repository_persistence_v1.ts': 1,
  'content_studio/firestore_authoring_store.ts': 1,
  'daily_phrases.ts': 2,
  'dialogue_v2_freeform_memory.ts': 1,
  'dialogue_v2_session_complete_callable.ts': 1,
  'dialogue_v2_turn_callable.ts': 2,
  'dialogue_v2_turn_production_callable.ts': 2,
  'email_contacts.ts': 1,
  'email_unsubscribe.ts': 1,
  'explain/explain_provider.ts': 2,
  'explain_phrase.ts': 5,
  'expo_push.ts': 1,
  'friend_codes.ts': 4,
  'friend_lookup.ts': 5,
  'jarvis/all_departments_callables.ts': 1,
  'jarvis/approval_webhook.ts': 1,
  'jarvis/business_tier_callables.ts': 1,
  'jarvis/growth_firestore_fetcher.ts': 1,
  'jarvis/pm_business_context.ts': 3,
  'jarvis/quality_firestore_fetcher.ts': 1,
  'jarvis/telegram_send.ts': 2,
  'leaderboard.ts': 6,
  'payment_webhook_alert.ts': 1,
  'premium_dialog.ts': 5,
  'premium_dialog_review.ts': 1,
  'premium_dialog_stream.ts': 1,
  'report_replies.ts': 1,
  // stats_insights.ts (1) и weekly_review.ts (5) удалены 04.10 (PM-221) — их немые catch ушли вместе с кодом.
};

// Существенные файлы (покупки, удаление, поддержка, личность): немых catch быть не должно вообще.
const ESSENTIAL_ZERO = [
  'account_delete.ts',
  'premium_status.ts',
  'auth_identity.ts',
  'auth_recovery.ts',
  'support_inbox.ts',
  'support_reply_delivery.ts',
  'identity_cleanup.ts',
  'web_checkout.ts',
  'user_notifications.ts',
];

function isSilentValue(expr: ts.Expression): boolean {
  let e = expr;
  while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e)) e = e.expression;
  if (ts.isVoidExpression(e)) return isSilentValue(e.expression);
  if (e.kind === ts.SyntaxKind.NullKeyword || e.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (ts.isIdentifier(e) && e.text === 'undefined') return true;
  if (ts.isNumericLiteral(e) || ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return true;
  if (ts.isArrayLiteralExpression(e)) return e.elements.length === 0;
  if (ts.isObjectLiteralExpression(e)) return e.properties.length === 0;
  return false;
}

function isSilentHandler(fn: ts.Expression): boolean {
  if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return false;
  if (ts.isBlock(fn.body)) return fn.body.statements.length === 0;
  return isSilentValue(fn.body);
}

export function countSilentServer(source: string, fileName = 'x.ts'): number {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let n = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isCatchClause(node) && node.block.statements.length === 0) n += 1;
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'catch'
      && node.arguments.length === 1
      && isSilentHandler(node.arguments[0]!)
    ) n += 1;
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return n;
}

function listFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) listFiles(abs, out);
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name) && !/\.d\.ts$/.test(name) && !name.startsWith('max_')) out.push(abs);
  }
  return out;
}

function scan(): Record<string, number> {
  const found: Record<string, number> = {};
  for (const abs of listFiles(SRC)) {
    const n = countSilentServer(readFileSync(abs, 'utf8'), abs);
    if (n > 0) found[path.relative(SRC, abs).replace(/\\/g, '/')] = n;
  }
  return found;
}

describe('PM-229 server silent catch ratchet', () => {
  const found = scan();

  it('счётчик ловит немые обработчики и пропускает логирующие', () => {
    expect(countSilentServer('a().catch(() => null);')).toBe(1);
    expect(countSilentServer('try { a(); } catch {}')).toBe(1);
    expect(countSilentServer("a().catch(swallowed('t', null));")).toBe(0);
    expect(countSilentServer('try { a(); } catch (e) { log(e); }')).toBe(0);
  });

  it('новых немых catch нет (ратчет)', () => {
    const violations = Object.entries(found)
      .filter(([f, n]) => n > (BASELINE[f] ?? 0))
      .map(([f, n]) => `${f}: немых catch ${n}, разрешено ${BASELINE[f] ?? 0}`);
    expect(violations).toEqual([]);
  });

  it('BASELINE не устарел (ратчет только уменьшается)', () => {
    const stale = Object.entries(BASELINE)
      .filter(([f, n]) => (found[f] ?? 0) < n)
      .map(([f, n]) => `${f}: осталось ${found[f] ?? 0} из ${n} — сократи BASELINE`);
    expect(stale).toEqual([]);
  });

  it('в существенных файлах (покупки/удаление/поддержка/личность) немых catch нет вообще', () => {
    const bad = ESSENTIAL_ZERO.filter((f) => (found[f] ?? 0) > 0).map((f) => `${f}: ${found[f]}`);
    expect(bad).toEqual([]);
  });
});

describe('swallowed()', () => {
  it('возвращает заглушку и не бросает', () => {
    expect(swallowed('t:x', null)(new Error('boom'))).toBeNull();
    expect(swallowed('t:x', undefined)('строка')).toBeUndefined();
  });

  it('reportSwallowedServer не бросает на любых входах', () => {
    expect(() => reportSwallowedServer('t:x', undefined)).not.toThrow();
    expect(() => reportSwallowedServer('t:x', { code: 'unavailable', message: 'x'.repeat(5000) })).not.toThrow();
    expect(() => reportSwallowedServer('t:x', null)).not.toThrow();
  });

  it('асинхронный отказ превращается в заглушку', async () => {
    const value = await Promise.reject(new Error('nope')).catch(swallowed('t:async', 'fallback'));
    expect(value).toBe('fallback');
  });
});
