// Сторож «экспорты каждой кодовой базы ⊇ функции на бою» (координатор 29.10, слово владельца: «всё всегда в одной ветке,
// абсолютно всё должно попасть»).
// зачем: прод собирался частичными выкладками из нескольких деревьев, а полная `firebase deploy --only functions` предлагает
// УДАЛИТЬ каждую живую функцию, экспорта которой нет в точке входа её кодовой базы. Снимок боя снят один раз (gcloud, только
// чтение) и лежит в репо: tests/fixtures/functions_prod_snapshot.json. Каждая функция снимка обязана экспортироваться точкой
// входа своей кодовой базы из firebase.json — либо стоять в KNOWN_WITHOUT_EXPORT с причиной (намеренно удалена решением владельца
// и ждёт удаляющей выкладки, или временно ждёт слияния/кодовой базы). Новое имя без экспорта — красный.
// Деплой-гейт scripts/functions_source_coverage_gate.mjs делает ту же проверку по собранному lib перед полной выкладкой; этот
// сторож — его тестовое зеркало по исходникам, без сборки и без сети.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const SNAPSHOT = 'tests/fixtures/functions_prod_snapshot.json';

interface ProdFunction { name: string; codebase: string; region: string; updateTime: string }
interface Snapshot { project: string; snapshotAt: string; total: number; functions: ProdFunction[] }

/**
 * Живые функции боя без экспорта в репо — каждая с причиной. Сторож требует: missing ⊆ KNOWN (то, что снова экспортируется,
 * из списка можно вычеркнуть в любой момент; НОВОЕ имя сюда попадает только словом владельца/координатора).
 */
export const KNOWN_WITHOUT_EXPORT: Record<string, string> = {
  // Намеренные удаления владельца — реализация снята, функции на сервере снимет удаляющая выкладка (комментарии в functions/src/index.ts).
  questGetActive: 'D140 (01.10): «Задания» удалены целиком',
  adminListQuests: 'D140 (01.10): «Задания» удалены целиком',
  shardsApplyDelta: 'D70/D78: заглушка записи жемчуга удалена',
  devShardsGrant: 'D78 (30.09): dev-выдачи удалены из кода целиком',
  devRunesGrant: 'D78 (30.09): dev-выдачи удалены из кода целиком',
  referralDevGrantSpin: 'D78/D81: dev-выдача спина не возвращается',
  recalcCoinExchangeRate: 'D70/D78: биржа «жемчуг → звёзды» удалена целиком',
  cosmeticAssetCatalogGet: 'D108: архив косметики удалён',
  adminGrantVoiceMinutes: 'D136 (01.10): удалена',
  aiDialogBuyExtraReplies: 'D111: покупка доп. ответов удалена, месячная квота остаётся',
  videoWatchRunesClaim: 'D78/PM-080, Q109: руны за просмотр видео удалены',
  collectiblesClaimDrop: 'надгробие в index.ts: выкладка удалит функцию',
  communityRedeemPackGiftVoucher: 'подарки наборов сняты (index.ts ~606: «удалены»)',
  flashcardPackGiftRedeem: 'подарки наборов сняты (index.ts ~606: «удалены»)',
  flashcardPackGiftGrantGlobalBroadcast: 'подарки наборов сняты (index.ts ~607: «удалены»)',
  flashcardPackGiftSyncState: 'подарки наборов сняты (index.ts ~607: «удалены»)',
  // Временно (координатор 29.10): деньги и покупки — Ядро разбирается по факту, зовёт ли их клиент; исходник в HEAD есть, экспорта нет.
  resolveLearningV2CourseUnlockReceipt: 'временно, Ядро разбирается 29.10: functions/src/learning_v2_course_unlock.ts без экспорта',
  authorizeLearningV2CourseUnlock: 'временно, Ядро разбирается 29.10: functions/src/learning_v2_course_unlock.ts без экспорта',
  aiDialogSyncPurchase: 'временно, Ядро разбирается 29.10: functions/src/ai_dialog_sync_purchase.ts без экспорта',
  leagueActivateGroupBoost: 'временно, Ядро разбирается 29.10: исходника в HEAD нет',
  // adminGetProductStatistics и adminStaffIsolatedSession пришли со слиянием релиза 13f66f310 (29.10) — обязательные экспорты, в списке их нет.
  // Временно: кодовая база youtube-admin (functions-youtube-admin) ждёт записи в firebase.json (вместе с Ядром).
  adminYoutubeComments: 'временно до записи codebase youtube-admin в firebase.json',
  youtubeOAuthCallback: 'временно до записи codebase youtube-admin в firebase.json',
};

/**
 * Запрет владельца («персонал и приглашения — не включать», подтверждён координатором 29.10 после живой сверки боя): эти семь
 * callable никогда не выкладывались, их экспорты есть только в ветке релиза и в незакоммиченном ханке Codex. Проверка «⊇ бой»
 * лишние имена не ловит, поэтому запрет отдельный. adminStaffIsolatedSession и adminGetProductStatistics — наоборот, на бою и обязательны.
 */
export const FORBIDDEN_EXPORTS = [
  'adminStaffGetSession', 'adminStaffSetMembership', 'adminStaffResolveIdentity', 'adminStaffListMemberships',
  'adminStaffCreateInvitation', 'adminStaffListInvitations', 'adminStaffRevokeInvitation',
] as const;

/** Кодовые базы из firebase.json → путь к исходной точке входа (как её соберёт и выложит CLI). */
export function codebaseEntries(): Record<string, string | null> {
  const fb = JSON.parse(read('firebase.json')) as { functions?: unknown };
  const list = (Array.isArray(fb.functions) ? fb.functions : fb.functions ? [fb.functions] : []) as Array<{ source: string; codebase?: string }>;
  const out: Record<string, string | null> = {};
  for (const cb of list) {
    const name = cb.codebase || 'default';
    const pkgPath = path.join(cb.source, 'package.json');
    if (!fs.existsSync(path.join(ROOT, pkgPath))) { out[name] = null; continue; }
    const main: string = (JSON.parse(read(pkgPath)) as { main?: string }).main || 'index.js';
    // rootDir ".." у tsc: lib/<путь от корня репо>/index.js ← <путь от корня репо>/index.ts
    const fromLib = main.replace(/^lib\//, '');
    const candidates = main.startsWith('lib/')
      ? [fromLib.replace(/\.js$/, '.ts'), path.posix.join(cb.source, fromLib.replace(/\.js$/, '.ts'))]
      : [path.posix.join(cb.source, main)];
    out[name] = candidates.find((c) => fs.existsSync(path.join(ROOT, c))) || null;
  }
  return out;
}

function resolveRelative(fromRel: string, spec: string): string | null {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  for (const c of [base + '.ts', base + '.js', base + '/index.ts', base + '/index.js', base]) {
    const abs = path.join(ROOT, c);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return c;
  }
  return null;
}

/** Имена, которые точка входа отдаёт наружу: export {…}, export const/function/class, exports.X =, Object.defineProperty(exports, 'X'), module.exports = {…}, export * from. */
export function exportedNames(rel: string, depth = 0): Set<string> {
  const src = read(rel);
  const kind = rel.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, kind);
  const names = new Set<string>();
  const hasExport = (n: ts.Node): boolean => ts.canHaveModifiers(n) && (ts.getModifiers(n) || []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  const isExportsObj = (e: ts.Expression): boolean => (ts.isIdentifier(e) && e.text === 'exports')
    || (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'module' && e.name.text === 'exports');
  const visitCall = (c: ts.CallExpression): void => {
    const callee = c.expression;
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === 'Object'
      && callee.name.text === 'defineProperty' && c.arguments.length >= 2 && isExportsObj(c.arguments[0]) && ts.isStringLiteralLike(c.arguments[1])) {
      names.add(c.arguments[1].text);
    }
  };
  for (const st of sf.statements) {
    if (ts.isExportDeclaration(st)) {
      if (st.exportClause && ts.isNamedExports(st.exportClause)) for (const el of st.exportClause.elements) names.add(el.name.text);
      else if (st.exportClause && ts.isNamespaceExport(st.exportClause)) names.add(st.exportClause.name.text);
      else if (st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier) && depth < 4) {
        const target = resolveRelative(rel, st.moduleSpecifier.text);
        if (target) exportedNames(target, depth + 1).forEach((n) => names.add(n));
      }
    } else if (ts.isVariableStatement(st) && hasExport(st)) {
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.add(d.name.text);
    } else if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && hasExport(st) && st.name) {
      names.add(st.name.text);
    } else if (ts.isExpressionStatement(st)) {
      const e = st.expression;
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        if (ts.isPropertyAccessExpression(e.left) && isExportsObj(e.left.expression)) names.add(e.left.name.text);
        else if (isExportsObj(e.left) && ts.isObjectLiteralExpression(e.right)) {
          for (const p of e.right.properties) if (p.name && ts.isIdentifier(p.name)) names.add(p.name.text);
        }
      } else if (ts.isCallExpression(e)) visitCall(e);
    }
  }
  // exports.X = … и Object.defineProperty могут стоять внутри блоков — проходим всё дерево
  const walk = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) visitCall(n);
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(n.left) && isExportsObj(n.left.expression)) names.add(n.left.name.text);
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return names;
}

describe('сторож боя 29.10 — каждая живая функция экспортируется своей кодовой базой', () => {
  const snapshot = JSON.parse(read(SNAPSHOT)) as Snapshot;
  const entries = codebaseEntries();
  const prodByCodebase = new Map<string, ProdFunction[]>();
  for (const f of snapshot.functions) prodByCodebase.set(f.codebase, [...(prodByCodebase.get(f.codebase) || []), f]);

  it('снимок боя целый: проект, дата, 400+ функций, у каждой имя и кодовая база', () => {
    expect(snapshot.project).toBe('phraseman-ea0b3');
    expect(Date.parse(snapshot.snapshotAt)).toBeGreaterThan(Date.parse('2026-10-29T00:00:00Z'));
    expect(snapshot.functions.length).toBe(snapshot.total);
    expect(snapshot.functions.length).toBeGreaterThan(400);
    for (const f of snapshot.functions) {
      expect(f.name).toMatch(/^[A-Za-z0-9_]+$/);
      expect(f.codebase).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('firebase.json: у каждой кодовой базы есть исходная точка входа', () => {
    expect(Object.keys(entries)).toEqual(expect.arrayContaining(['default', 'content', 'english-test']));
    for (const [cb, entry] of Object.entries(entries)) expect({ cb, entry }).toEqual({ cb, entry: expect.any(String) });
    expect(exportedNames(entries.default as string).size).toBeGreaterThan(350);
  });

  it('KNOWN_WITHOUT_EXPORT говорит только о функциях, которые есть на бою (нет опечаток и мёртвых строк)', () => {
    const prodNames = new Set(snapshot.functions.map((f) => f.name));
    const stale = Object.keys(KNOWN_WITHOUT_EXPORT).filter((n) => !prodNames.has(n));
    expect(stale).toEqual([]);
  });

  it('персонал и приглашения не экспортируются ни одной кодовой базой (владелец: «не включать»)', () => {
    const offenders: string[] = [];
    for (const [cb, entry] of Object.entries(entries)) {
      if (!entry) continue;
      const exported = exportedNames(entry);
      for (const name of FORBIDDEN_EXPORTS) if (exported.has(name)) offenders.push(`${cb}/${name}`);
    }
    expect(offenders).toEqual([]);
    // зачем: запрет не должен задевать разрешённые имена той же семьи
    expect(FORBIDDEN_EXPORTS).not.toContain('adminStaffIsolatedSession');
  });

  it('ни одной живой функции без экспорта, кроме перечисленных с причиной', () => {
    const unexpected: string[] = [];
    const report: string[] = [];
    for (const [cb, fns] of prodByCodebase) {
      const entry = entries[cb] || null;
      const exported = entry ? exportedNames(entry) : new Set<string>();
      const missing = fns.filter((f) => !exported.has(f.name)).map((f) => f.name).sort();
      report.push(`${cb}: на бою ${fns.length}, точка входа ${entry || 'НЕТ В firebase.json'}, экспортов ${exported.size}, без экспорта ${missing.length}`);
      for (const name of missing) if (!(name in KNOWN_WITHOUT_EXPORT)) unexpected.push(`${cb}/${name} (бой ${fns.find((f) => f.name === name)?.updateTime.slice(0, 10)})`);
    }
    // зачем: при падении видно всю картину по кодовым базам, а не одно имя
    expect({ unexpected, report }).toEqual({ unexpected: [], report });
  });
});
