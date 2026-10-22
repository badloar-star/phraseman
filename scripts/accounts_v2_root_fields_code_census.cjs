'use strict';
/* global __dirname */
/*
 * Account V2, Пакет 8A — перепись корневых полей users/{id} ПО КОДУ.
 *
 * зачем: E2E 2026-10-01 (квитанция 5b18dd743, сценарий A) — перенос OD21 ушёл в
 * HOLD unknown_field из-за служебных полей корня (accountGeneration, updatedAt,
 * last_active_at, created_at), которых не было в ROOT_RULES. У реальных людей
 * таких полей больше. Этот модуль находит ВСЕХ писателей корня users/{uid} и
 * users/{stableId} в коде (клиент, функции, триггеры, админка) и отдаёт список
 * корневых полей с местом записи file:line. Сторож
 * functions/src/accounts_v2_migration/root_fields_census_guard.test.ts требует,
 * чтобы каждое найденное поле было в таблице инвентаря и не блокировало перенос.
 *
 * Как ищется (синтаксический разбор TypeScript, без типов и без сети):
 *  - ссылка на документ пользователя: collection('users'|USERS).doc(x), doc(db,'users',x),
 *    doc(`users/${x}`), переменные/параметры/поля объектов с такой ссылкой, `.ref` снимка,
 *    документы из запроса по коллекции users, функции-помощники, возвращающие ссылку;
 *  - запись: ref.set/update/create, tx|batch.set/update/create(ref, …), setDoc/updateDoc;
 *  - ключи: литерал объекта, спред, условные куски, Object.assign, присваивания obj.key=…,
 *    вычисляемые ключи через строковые константы, точечные пути 'progress.x' → progress;
 *  - сквозные функции: ссылка или данные пришли параметром — ключи берутся в месте вызова.
 * Что не разобрано, попадает в `unresolved` (сторож требует пустой список).
 * Ограничение: поля, которые пишет только прод-скрипт вне репозитория или старая версия
 * приложения, здесь не видны — их ловит прод-сверка scripts/accounts_v2_root_fields_census.mjs.
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_ROOTS = Object.freeze(['app', 'components', 'hooks', 'modules', 'functions/src', 'shared', 'lib', 'constants']);
const ADMIN_HTML = 'admin/v2/legacy.html';
const SKIP_DIR = new Set(['node_modules', '__tests__', '__mocks__', '.expo', 'generated']);
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP_FILE = /\.(test|spec|probe)\.[a-z]+$|\.d\.ts$/;

/**
 * Подсказки там, где ссылка на users/{id} приходит через сложную цепочку (замыкание
 * с кэшем промисов). Каждая подсказка обязана встречаться в файле — иначе она протухла
 * (staleHints), и сторож краснеет.
 */
const DEFAULT_HINTS = Object.freeze({
  // resolveCanonical() → { stableId, data, ref: db.collection(USERS).doc(...) } через кэш промисов.
  'functions/src/auth_merge.ts': Object.freeze(['winner.ref', 'loser.ref']),
});

/**
 * Сборщики патча корня: функция из другого файла возвращает объект с вычисляемыми именами полей,
 * и писатель кладёт его в патч через `...сборщик(...)`. Через границу файла перепись этого не видит.
 * Здесь имя функции → её файл → имена (или префиксы шаблона) полей, которые она кладёт.
 * Протухание строгое, как у подсказок: в файле обязаны встречаться `function <имя>(` и каждый
 * префикс, иначе staleHints. Вызов сборщика, которого нет в таблице, остаётся unresolved (красный).
 */
const DEFAULT_PATCH_BUILDERS = Object.freeze({
  // зачем: вопрос 27 (5755b2f94) — flashcardPagesRev_<язык> в патче синка cloud_sync.ts (ревизия страниц карточек).
  buildFlashcardPagesRevPatch: Object.freeze({ file: 'app/flashcard_pages_rev.ts', keys: Object.freeze(['flashcardPagesRev_']) }),
});

/** Имена параметров/полей, которые в коде обозначают ссылку на users/{id}. */
const LOOSE_REF = /^(user|stableUser|freshUser|displacedUser|userDoc)Ref$/;
const NOT_PASS_THROUGH = new Set(['set', 'update', 'create', 'get', 'doc', 'collection', 'setDoc', 'updateDoc', 'getDoc',
  'delete', 'deleteDoc', 'all', 'assign', 'push']);
const QUERY_METHODS = new Set(['where', 'orderBy', 'limit', 'limitToLast', 'startAfter', 'startAt', 'endAt', 'endBefore', 'offset', 'select']);
const ARRAY_CALLBACKS = new Set(['forEach', 'map', 'filter', 'some', 'every', 'flatMap']);

function listCode(repo, dir, out) {
  const abs = path.join(repo, dir);
  if (!fs.existsSync(abs)) return;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (!SKIP_DIR.has(entry.name)) listCode(repo, rel, out);
    } else if (CODE_FILE.test(entry.name) && !SKIP_FILE.test(entry.name)) {
      out.push(rel);
    }
  }
}

/** Только тела inline-<script>; остальное заменено пробелами, чтобы номера строк совпадали. */
function htmlScripts(raw) {
  const blank = (text) => text.replace(/[^\n]/g, ' ');
  let out = '';
  let last = 0;
  const re = /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/g;
  for (let match = re.exec(raw); match !== null; match = re.exec(raw)) {
    out += blank(raw.slice(last, match.index + match[1].length)) + match[2];
    last = match.index + match[1].length + match[2].length;
  }
  return out + blank(raw.slice(last));
}

/** Исходники репозитория: [{ rel, text }]. Файлы без слова users и без *Ref не могут писать корень. */
function readRepoSources(repo, roots = DEFAULT_ROOTS) {
  const rels = [];
  for (const root of roots) listCode(repo, root, rels);
  const sources = rels.map((rel) => ({ rel, text: fs.readFileSync(path.join(repo, rel), 'utf8') }));
  const adminPath = path.join(repo, ADMIN_HTML);
  if (fs.existsSync(adminPath)) sources.push({ rel: ADMIN_HTML, text: htmlScripts(fs.readFileSync(adminPath, 'utf8')) });
  return sources;
}

function createEngine(ts, hints, patchBuilders) {
  const strVal = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);
  const unwrap = (node) => {
    let n = node;
    while (n && (ts.isParenthesizedExpression(n) || ts.isAwaitExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n)
      || ts.isTypeAssertionExpression(n) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(n)))) n = n.expression;
    return n;
  };
  const globalStr = new Map();
  const refHelpers = new Set();
  const objHelpers = new Map();
  const retPropKeys = new Map();
  const passThrough = new Map();

  function fnNameOf(f) {
    if (!f) return null;
    if (f.name && ts.isIdentifier(f.name)) return f.name.text;
    const p = f.parent;
    if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
    if (p && ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) return p.name.text;
    return null;
  }
  function addPassThrough(name, entry) {
    if (!name) return;
    const list = passThrough.get(name) || [];
    const sig = JSON.stringify(entry);
    if (!list.some((item) => JSON.stringify(item) === sig)) {
      list.push(entry);
      passThrough.set(name, list);
    }
  }
  function collectGlobalStrings(sf) {
    ts.forEachChild(sf, function visit(n) {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
        const value = strVal(unwrap(n.initializer));
        if (value !== null) {
          const prev = globalStr.get(n.name.text);
          // Одно имя с разными значениями в разных файлах — неоднозначно, не используем.
          globalStr.set(n.name.text, prev === undefined || prev === value ? value : null);
        }
      }
      ts.forEachChild(n, visit);
    });
  }
  function stateSize() {
    let size = refHelpers.size * 1e6 + objHelpers.size * 1e4;
    for (const m of retPropKeys.values()) for (const set of m.values()) size += set.size * 100;
    for (const list of passThrough.values()) size += list.length;
    return size;
  }

  function analyze(source) {
    const sf = source.sf;
    const fileHints = hints[source.rel] || [];
    const scopes = [new Map()];
    const fnStack = [];
    const writes = [];
    const lookup = (name) => {
      for (let i = scopes.length - 1; i >= 0; i -= 1) if (scopes[i].has(name)) return scopes[i].get(name);
      return undefined;
    };
    const declare = (name, info) => scopes[scopes.length - 1].set(name, info);
    const line = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    const textOf = (node, max = 60) => (node ? node.getText(sf).replace(/\s+/g, ' ').slice(0, max) : '?');
    const strOf = (node) => {
      const n = unwrap(node);
      const value = strVal(n);
      if (value !== null) return value;
      if (n && ts.isIdentifier(n)) {
        const b = lookup(n.text);
        if (b && b.kind === 'str') return b.value;
        if (!b || b.kind === 'other') return globalStr.get(n.text) || null;
      }
      if (n && ts.isPropertyAccessExpression(n)) return globalStr.get(n.name.text) || null;
      return null;
    };
    const templateHead = (node) => {
      const n = unwrap(node);
      if (n && ts.isTemplateExpression(n)) return n.head.text.split('.')[0] || null;
      return null;
    };
    const isUsersName = (n) => strOf(n) === 'users';
    function oneSegmentUsersPath(node) {
      const n = unwrap(node);
      const value = strOf(n);
      if (value !== null) return /^users\/[^/]+$/.test(value);
      if (n && ts.isTemplateExpression(n)) {
        let text = n.head.text;
        for (const span of n.templateSpans) text += (strOf(span.expression) === 'users' ? 'users' : '$') + span.literal.text;
        return /^users\/\$$/.test(text);
      }
      return false;
    }
    function isColl(node) {
      const n = unwrap(node);
      if (!n) return false;
      if (ts.isIdentifier(n)) return (lookup(n.text) || {}).kind === 'coll';
      if (!ts.isCallExpression(n)) return false;
      const c = n.expression;
      const a = n.arguments;
      if (ts.isPropertyAccessExpression(c) && c.name.text === 'collection' && a.length === 1 && isUsersName(a[0])) return true;
      return ts.isIdentifier(c) && c.text === 'collection' && a.length === 2 && isUsersName(a[1]);
    }
    function isRef(node) {
      const n = unwrap(node);
      if (!n) return false;
      if (ts.isIdentifier(n)) {
        const b = lookup(n.text);
        return !!b && (b.kind === 'ref' || (b.kind === 'param' && LOOSE_REF.test(n.text)));
      }
      if (ts.isPropertyAccessExpression(n)) {
        if (fileHints.includes(n.getText(sf))) return true;
        const base = unwrap(n.expression);
        if (n.name.text === 'ref' && isSnap(base)) return true;
        if (ts.isIdentifier(base)) {
          const b = lookup(base.text);
          if (b && b.refProps && b.refProps.has(n.name.text)) return true;
        }
        return LOOSE_REF.test(n.name.text);
      }
      if (!ts.isCallExpression(n)) return false;
      const c = n.expression;
      const a = n.arguments;
      if (ts.isPropertyAccessExpression(c) && c.name.text === 'doc' && a.length === 1) {
        if (isColl(c.expression) || oneSegmentUsersPath(a[0])) return true;
      }
      if (ts.isIdentifier(c) && c.text === 'doc') {
        if (a.length === 3 && isUsersName(a[1])) return true;
        if (a.length === 2 && (isColl(a[0]) || oneSegmentUsersPath(a[1]))) return true;
      }
      const name = ts.isIdentifier(c) ? c.text : ts.isPropertyAccessExpression(c) ? c.name.text : '';
      return refHelpers.has(name);
    }
    function isUsersQuery(node) {
      const n = unwrap(node);
      if (!n) return false;
      if (ts.isIdentifier(n)) return (lookup(n.text) || {}).kind === 'query';
      if (isColl(n)) return true;
      if (!ts.isCallExpression(n)) return false;
      const c = n.expression;
      if (ts.isPropertyAccessExpression(c) && QUERY_METHODS.has(c.name.text)) return isUsersQuery(c.expression);
      return ts.isIdentifier(c) && c.text === 'query' && n.arguments.length >= 1 && isUsersQuery(n.arguments[0]);
    }
    function isQuerySnap(node) {
      const n = unwrap(node);
      if (!n) return false;
      if (ts.isIdentifier(n)) return (lookup(n.text) || {}).kind === 'qsnap';
      if (!ts.isCallExpression(n)) return false;
      const c = n.expression;
      if (ts.isPropertyAccessExpression(c) && c.name.text === 'get') {
        if (n.arguments.length === 0 && isUsersQuery(c.expression)) return true;
        if (n.arguments.length === 1 && isUsersQuery(n.arguments[0])) return true;
      }
      return ts.isIdentifier(c) && c.text === 'getDocs' && isUsersQuery(n.arguments[0]);
    }
    function isSnap(node) {
      const n = unwrap(node);
      if (!n) return false;
      if (ts.isIdentifier(n)) return (lookup(n.text) || {}).kind === 'snap';
      if (!ts.isCallExpression(n)) return false;
      const c = n.expression;
      if (ts.isPropertyAccessExpression(c) && c.name.text === 'get') {
        if (n.arguments.length === 0 && isRef(c.expression)) return true;
        if (n.arguments.length >= 1 && isRef(n.arguments[0])) return true;
      }
      return ts.isIdentifier(c) && /^getDoc(FromServer|FromCache)?$/.test(c.text) && isRef(n.arguments[0]);
    }
    function isOtherRef(node) {
      const n = unwrap(node);
      if (!n) return false;
      if (ts.isIdentifier(n)) return (lookup(n.text) || {}).kind === 'otherref';
      if (!ts.isCallExpression(n)) return false;
      const c = n.expression;
      const name = ts.isPropertyAccessExpression(c) ? c.name.text : ts.isIdentifier(c) ? c.text : '';
      return name === 'doc' && !isRef(n);
    }
    /** Элементы массива — снимки users/{id} (docs запроса) или объекты с полем-ссылкой. */
    function elementInfo(node) {
      const n = unwrap(node);
      if (!n) return null;
      if (ts.isPropertyAccessExpression(n) && n.name.text === 'docs' && isQuerySnap(n.expression)) return { kind: 'snap' };
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ['slice', 'filter'].includes(n.expression.name.text)) {
        return elementInfo(n.expression.expression);
      }
      if (ts.isIdentifier(n)) {
        const b = lookup(n.text);
        if (b && b.kind === 'arr' && b.elemRefProps.size > 0) return { kind: 'obj', nodes: [], extra: [], refProps: new Set(b.elemRefProps) };
      }
      return null;
    }
    const isNullish = (node) => {
      const n = unwrap(node);
      return !!n && (n.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(n) && n.text === 'undefined'));
    };
    function classify(init) {
      const u = unwrap(init);
      if (!u) return { kind: 'other' };
      const value = strVal(u);
      if (value !== null) return { kind: 'str', value };
      if (isColl(u)) return { kind: 'coll' };
      if (isRef(u)) return { kind: 'ref' };
      if (isSnap(u)) return { kind: 'snap' };
      if (ts.isIdentifier(u)) {
        const b = lookup(u.text);
        if (b && ['coll', 'ref', 'snap', 'obj', 'otherref', 'query', 'qsnap', 'ret'].includes(b.kind)) return b;
      }
      if (ts.isConditionalExpression(u)) {
        if (isNullish(u.whenFalse)) return classify(u.whenTrue);
        if (isNullish(u.whenTrue)) return classify(u.whenFalse);
        const yes = classify(u.whenTrue);
        const no = classify(u.whenFalse);
        if (yes.kind === no.kind && yes.kind !== 'obj') return yes;
      }
      if (isUsersQuery(u)) return { kind: 'query' };
      if (isQuerySnap(u)) return { kind: 'qsnap' };
      if (ts.isArrayLiteralExpression(u) && u.elements.length === 0) return { kind: 'arr', elemRefProps: new Set() };
      if (ts.isCallExpression(u)) {
        const c = u.expression;
        const name = ts.isIdentifier(c) ? c.text : ts.isPropertyAccessExpression(c) ? c.name.text : '';
        if (objHelpers.has(name)) return { kind: 'obj', nodes: [], extra: [], refProps: new Set(objHelpers.get(name)) };
        if (retPropKeys.has(name)) return { kind: 'ret', fn: name };
      }
      if (isOtherRef(u)) return { kind: 'otherref' };
      if (ts.isObjectLiteralExpression(u)) {
        const refProps = new Set();
        for (const p of u.properties) {
          if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && isRef(p.initializer)) refProps.add(p.name.text);
          if (ts.isShorthandPropertyAssignment(p) && isRef(p.name)) refProps.add(p.name.text);
        }
        return { kind: 'obj', nodes: [u], extra: [], refProps };
      }
      return { kind: 'other' };
    }
    function paramIndex(node) {
      const n = unwrap(node);
      if (!n || !ts.isIdentifier(n)) return null;
      const b = lookup(n.text);
      return b && b.kind === 'param' && b.fn === fnStack[fnStack.length - 1] ? b.index : null;
    }
    const emptyKeys = () => ({ keys: [], unresolved: [], params: [], keyParams: [] });
    function keysOf(node, seen = new Set()) {
      const n = unwrap(node);
      const res = emptyKeys();
      if (!n || isNullish(n)) return res;
      const merge = (r) => {
        res.keys.push(...r.keys);
        res.unresolved.push(...r.unresolved);
        res.params.push(...r.params);
        res.keyParams.push(...r.keyParams);
      };
      if (ts.isObjectLiteralExpression(n)) {
        for (const p of n.properties) {
          if (ts.isSpreadAssignment(p)) { merge(keysOf(p.expression, seen)); continue; }
          if (ts.isShorthandPropertyAssignment(p)) { res.keys.push(p.name.text); continue; }
          if (!ts.isPropertyAssignment(p)) continue;
          const name = p.name;
          if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
            res.keys.push(name.text);
          } else if (ts.isComputedPropertyName(name)) {
            const value = strOf(name.expression);
            const head = templateHead(name.expression);
            const keyParam = paramIndex(name.expression);
            if (value !== null) res.keys.push(value);
            else if (head) res.keys.push(head);
            else if (keyParam !== null) res.keyParams.push(keyParam);
            else res.unresolved.push(`[${textOf(name.expression)}]`);
          }
        }
        res.keys = res.keys.map((key) => key.split('.')[0]);
        return res;
      }
      const param = paramIndex(n);
      if (param !== null) { res.params.push(param); return res; }
      if (ts.isIdentifier(n) && !seen.has(n.text)) {
        seen.add(n.text);
        const b = lookup(n.text);
        if (b && b.kind === 'obj') {
          for (const literal of b.nodes) merge(keysOf(literal, seen));
          for (const key of b.extra) {
            if (typeof key === 'number') res.params.push(key);
            else if (key.startsWith('<')) res.unresolved.push(key);
            else res.keys.push(key.split('.')[0]);
          }
          return res;
        }
      }
      if (ts.isConditionalExpression(n)) { merge(keysOf(n.whenTrue, seen)); merge(keysOf(n.whenFalse, seen)); return res; }
      if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken,
        ts.SyntaxKind.QuestionQuestionToken].includes(n.operatorToken.kind)) {
        if (n.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) merge(keysOf(n.left, seen));
        merge(keysOf(n.right, seen));
        return res;
      }
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
        const method = n.expression.name.text;
        if (method === 'assign') { for (const arg of n.arguments) merge(keysOf(arg, seen)); return res; }
        if (method === 'freeze' && n.arguments.length === 1) return keysOf(n.arguments[0], seen);
      }
      if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(unwrap(n.expression))) {
        const b = lookup(unwrap(n.expression).text);
        const known = b && b.kind === 'ret' ? (retPropKeys.get(b.fn) || new Map()).get(n.name.text) : undefined;
        if (known) { res.keys.push(...[...known].map((key) => key.split('.')[0])); return res; }
      }
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)
        && Object.prototype.hasOwnProperty.call(patchBuilders, n.expression.text)) {
        res.keys.push(...patchBuilders[n.expression.text].keys);
        return res;
      }
      res.unresolved.push(textOf(n, 80));
      return res;
    }
    function fieldPathKeys(args) {
      const res = emptyKeys();
      for (let i = 0; i < args.length; i += 2) {
        const a = unwrap(args[i]);
        const value = strOf(a);
        if (value !== null) res.keys.push(value.split('.')[0]);
        else if (a && ts.isNewExpression(a)) {
          const first = strOf(a.arguments && a.arguments[0]);
          if (first !== null) res.keys.push(first); else res.unresolved.push(textOf(a));
        } else {
          const head = templateHead(a);
          if (head) res.keys.push(head); else res.unresolved.push(textOf(a));
        }
      }
      return res;
    }
    const isFieldPathUpdate = (method, first) => (method === 'update' || method === 'updateDoc') && first !== undefined
      && (strOf(first) !== null || ts.isNewExpression(unwrap(first)) || templateHead(first) !== null);
    const objectish = (node) => {
      const u = unwrap(node);
      if (!u) return false;
      if (ts.isObjectLiteralExpression(u) || strOf(u) !== null || ts.isNewExpression(u) || templateHead(u) !== null) return true;
      return ts.isIdentifier(u) && (lookup(u.text) || {}).kind === 'obj';
    };
    function handleWrite(node, method, refExpr, dataArgs) {
      const fname = fnNameOf(fnStack[fnStack.length - 1]);
      const r = isFieldPathUpdate(method, dataArgs[0]) ? fieldPathKeys(dataArgs) : keysOf(dataArgs[0]);
      if (isRef(refExpr)) {
        writes.push({ line: line(node), via: method, keys: [...new Set(r.keys)], unresolved: r.unresolved });
        for (const p of r.params) addPassThrough(fname, { refParam: null, dataParam: p, keyParam: null, keys: [] });
        for (const p of r.keyParams) addPassThrough(fname, { refParam: null, dataParam: null, keyParam: p, keys: [] });
        return;
      }
      const refParam = paramIndex(refExpr);
      if (refParam === null) return;
      addPassThrough(fname, { refParam, dataParam: r.params.length ? r.params[0] : null, keyParam: null, keys: [...new Set(r.keys)].sort() });
      for (const p of r.params.slice(1)) addPassThrough(fname, { refParam, dataParam: p, keyParam: null, keys: [] });
    }
    function handlePassThroughCall(node, method, args) {
      const entries = passThrough.get(method);
      if (!entries) return;
      const fname = fnNameOf(fnStack[fnStack.length - 1]);
      for (const entry of entries) {
        const refArg = entry.refParam === null ? null : args[entry.refParam];
        const data = entry.dataParam === null ? emptyKeys() : keysOf(args[entry.dataParam]);
        if (entry.keyParam !== null) {
          const keyValue = strOf(args[entry.keyParam]);
          const keyParam = paramIndex(args[entry.keyParam]);
          if (keyValue !== null) data.keys.push(keyValue);
          else if (keyParam !== null) addPassThrough(fname, { refParam: null, dataParam: null, keyParam, keys: [] });
          else data.unresolved.push(`[${textOf(args[entry.keyParam])}]`);
        }
        if (entry.refParam === null || isRef(refArg)) {
          const keys = [...new Set([...(entry.refParam === null ? [] : entry.keys), ...data.keys])];
          writes.push({ line: line(node), via: `via:${method}`, keys, unresolved: data.unresolved });
          for (const p of data.params) addPassThrough(fname, { refParam: null, dataParam: p, keyParam: null, keys: [] });
        } else {
          const refParam = paramIndex(refArg);
          if (refParam !== null) {
            addPassThrough(fname, {
              refParam, dataParam: data.params.length ? data.params[0] : null, keyParam: null, keys: [...new Set([...entry.keys, ...data.keys])].sort(),
            });
          }
        }
      }
    }
    function onCall(node) {
      const c = node.expression;
      const args = [...node.arguments];
      const method = ts.isPropertyAccessExpression(c) ? c.name.text : ts.isIdentifier(c) ? c.text : '';
      if (ts.isPropertyAccessExpression(c) && ['set', 'update', 'create'].includes(method)) {
        if (isRef(c.expression)) return handleWrite(node, method, c.expression, args);
        if (args.length >= 2 && isRef(args[0])) return handleWrite(node, method, args[0], args.slice(1));
        if (args.length >= 2 && paramIndex(args[0]) !== null && !objectish(args[0])) return handleWrite(node, method, args[0], args.slice(1));
        if (paramIndex(c.expression) !== null && (args.length === 1 || objectish(args[0]))) return handleWrite(node, method, c.expression, args);
        return undefined;
      }
      if (ts.isIdentifier(c) && (method === 'setDoc' || method === 'updateDoc') && args.length >= 2) return handleWrite(node, method, args[0], args.slice(1));
      if (ts.isPropertyAccessExpression(c) && method === 'push' && ts.isIdentifier(unwrap(c.expression))) {
        const b = lookup(unwrap(c.expression).text);
        if (b && b.kind === 'arr') for (const arg of args) { const info = classify(arg); if (info.refProps) for (const p of info.refProps) b.elemRefProps.add(p); }
        return undefined;
      }
      if (ts.isPropertyAccessExpression(c) && method === 'assign' && args.length >= 2 && ts.isIdentifier(unwrap(args[0]))) {
        const b = lookup(unwrap(args[0]).text);
        if (b && b.kind === 'obj') {
          for (const arg of args.slice(1)) {
            const r = keysOf(arg);
            b.extra.push(...r.keys, ...r.unresolved.map((item) => `<${item}>`), ...r.params);
          }
        }
        return undefined;
      }
      if (!NOT_PASS_THROUGH.has(method)) handlePassThroughCall(node, method, args);
      return undefined;
    }
    function bindPattern(name, info) {
      if (ts.isIdentifier(name)) declare(name.text, info);
      else for (const el of name.elements) if (!ts.isOmittedExpression(el)) bindPattern(el.name, { kind: 'other' });
    }
    function bindArray(pattern, init) {
      let u = unwrap(init);
      if (u && ts.isCallExpression(u) && ts.isPropertyAccessExpression(u.expression) && u.expression.name.text === 'getAll') {
        const getAll = u;
        pattern.elements.forEach((el, i) => {
          if (!ts.isOmittedExpression(el)) bindPattern(el.name, isRef(getAll.arguments[i]) ? { kind: 'snap' } : { kind: 'other' });
        });
        return;
      }
      if (u && ts.isCallExpression(u) && ts.isPropertyAccessExpression(u.expression) && u.expression.name.text === 'all' && u.arguments.length === 1) {
        u = unwrap(u.arguments[0]);
      }
      if (!u || !ts.isArrayLiteralExpression(u)) { bindPattern(pattern, { kind: 'other' }); return; }
      const list = u;
      pattern.elements.forEach((el, i) => {
        if (!ts.isOmittedExpression(el)) bindPattern(el.name, el.dotDotDotToken ? { kind: 'other' } : classify(list.elements[i]));
      });
    }
    function bindObject(pattern, init) {
      const info = classify(init);
      for (const el of pattern.elements) {
        if (!ts.isIdentifier(el.name)) { bindPattern(el.name, { kind: 'other' }); continue; }
        const prop = el.propertyName && (ts.isIdentifier(el.propertyName) || ts.isStringLiteral(el.propertyName)) ? el.propertyName.text : el.name.text;
        declare(el.name.text, info.refProps && info.refProps.has(prop) ? { kind: 'ref' } : { kind: 'other' });
      }
    }
    function recordReturn(fn, expr) {
      const name = fnNameOf(fn);
      if (!name) return;
      if (isRef(expr)) refHelpers.add(name);
      const info = classify(expr);
      if (info.kind === 'obj' && info.refProps && info.refProps.size > 0) {
        objHelpers.set(name, [...new Set([...(objHelpers.get(name) || []), ...info.refProps])]);
      }
      const ro = unwrap(expr);
      const literal = ro && ts.isCallExpression(ro) && ts.isPropertyAccessExpression(ro.expression) && ro.expression.name.text === 'freeze'
        ? unwrap(ro.arguments[0]) : ro;
      if (!literal || !ts.isObjectLiteralExpression(literal)) return;
      for (const p of literal.properties) {
        if (!(ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) || !ts.isIdentifier(p.name)) continue;
        const value = ts.isPropertyAssignment(p) ? p.initializer : p.name;
        const vu = unwrap(value);
        const objectValued = vu && (ts.isObjectLiteralExpression(vu) || ts.isIdentifier(vu)
          || (ts.isCallExpression(vu) && ts.isPropertyAccessExpression(vu.expression) && vu.expression.name.text === 'freeze'));
        if (!objectValued) continue;
        const r = keysOf(value);
        if (r.unresolved.length > 0 || r.params.length > 0) continue;
        const byProp = retPropKeys.get(name) || new Map();
        const set = byProp.get(p.name.text) || new Set();
        r.keys.forEach((key) => set.add(key));
        byProp.set(p.name.text, set);
        retPropKeys.set(name, byProp);
      }
    }
    function enterFunction(node) {
      fnStack.push(node);
      (node.parameters || []).forEach((p, i) => bindPattern(p.name, { kind: 'param', index: i, fn: node }));
      const call = node.parent;
      if (call && ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression) && ARRAY_CALLBACKS.has(call.expression.name.text)
        && node.parameters.length >= 1 && ts.isIdentifier(node.parameters[0].name)) {
        const info = elementInfo(call.expression.expression);
        if (info) declare(node.parameters[0].name.text, info);
      }
    }
    function visitDeclaration(node) {
      if (node.initializer) visit(node.initializer);
      if (ts.isIdentifier(node.name)) {
        declare(node.name.text, node.initializer ? classify(node.initializer) : { kind: 'other' });
        const u = unwrap(node.initializer);
        if (u && (ts.isArrowFunction(u) || ts.isFunctionExpression(u)) && !ts.isBlock(u.body)) {
          scopes.push(new Map());
          u.parameters.forEach((p, i) => bindPattern(p.name, { kind: 'param', index: i, fn: u }));
          if (isRef(u.body)) refHelpers.add(node.name.text);
          scopes.pop();
        }
      } else if (ts.isArrayBindingPattern(node.name) && node.initializer) bindArray(node.name, node.initializer);
      else if (ts.isObjectBindingPattern(node.name) && node.initializer) bindObject(node.name, node.initializer);
      else bindPattern(node.name, { kind: 'other' });
    }
    function visitAssignment(node) {
      const l = node.left;
      visit(node.right);
      if (ts.isIdentifier(l)) {
        const b = lookup(l.text);
        const info = classify(node.right);
        if (b && info.kind !== 'other' && b.kind !== 'param' && b !== info) {
          for (const key of Object.keys(b)) delete b[key];
          Object.assign(b, info);
        }
        return;
      }
      if ((ts.isPropertyAccessExpression(l) || ts.isElementAccessExpression(l)) && ts.isIdentifier(unwrap(l.expression))) {
        const b = lookup(unwrap(l.expression).text);
        if (b && b.kind === 'obj') {
          if (ts.isPropertyAccessExpression(l)) b.extra.push(l.name.text);
          else {
            const value = strOf(l.argumentExpression);
            const head = templateHead(l.argumentExpression);
            b.extra.push(value !== null ? value : head || `<[${textOf(l.argumentExpression, 50)}]>`);
          }
        }
      }
      ts.forEachChild(l, visit);
    }
    function visit(node) {
      const fnLike = ts.isFunctionLike(node) && node.kind !== ts.SyntaxKind.FunctionType && node.kind !== ts.SyntaxKind.MethodSignature
        && node.kind !== ts.SyntaxKind.CallSignature && node.kind !== ts.SyntaxKind.ConstructorType;
      const isScope = fnLike || ts.isBlock(node) || ts.isForStatement(node) || ts.isForOfStatement(node) || ts.isForInStatement(node) || ts.isCatchClause(node);
      if (isScope) scopes.push(new Map());
      if (fnLike) enterFunction(node);
      try {
        if (ts.isForOfStatement(node) && ts.isVariableDeclarationList(node.initializer) && node.initializer.declarations.length === 1
          && ts.isIdentifier(node.initializer.declarations[0].name)) {
          const info = elementInfo(node.expression);
          if (info) {
            visit(node.expression);
            declare(node.initializer.declarations[0].name.text, info);
            visit(node.statement);
            return;
          }
        }
        if (ts.isVariableDeclaration(node)) { visitDeclaration(node); return; }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) { visitAssignment(node); return; }
        if (ts.isCallExpression(node)) { ts.forEachChild(node, visit); onCall(node); return; }
        if (ts.isReturnStatement(node) && node.expression) {
          visit(node.expression);
          if (fnStack.length > 0) recordReturn(fnStack[fnStack.length - 1], node.expression);
          return;
        }
        ts.forEachChild(node, visit);
      } finally {
        if (fnLike) fnStack.pop();
        if (isScope) scopes.pop();
      }
    }
    visit(sf);
    return writes;
  }

  return { analyze, collectGlobalStrings, stateSize };
}

/**
 * Перепись. sources — [{ rel, text }] (по умолчанию — файлы репозитория).
 * Возвращает { fields: { name: ['file:line', …] }, unresolved: ['file:line …'], staleHints, scannedFiles }.
 */
function buildRootFieldCensus(options = {}) {
  // зачем: typescript берётся из корня репозитория (devDependency), а не из functions/.
  const ts = options.typescript || require('typescript');
  const hints = options.hints || DEFAULT_HINTS;
  const patchBuilders = options.patchBuilders || DEFAULT_PATCH_BUILDERS;
  const repo = options.repo || path.resolve(__dirname, '..');
  const raw = options.sources || readRepoSources(repo, options.roots || DEFAULT_ROOTS);
  const sources = raw
    .filter((source) => /users|Ref\b/.test(source.text))
    .map((source) => {
      const kind = /\.(tsx|jsx)$/.test(source.rel) ? ts.ScriptKind.TSX : /\.ts$/.test(source.rel) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
      return { rel: source.rel, text: source.text, sf: ts.createSourceFile(source.rel, source.text, ts.ScriptTarget.Latest, true, kind) };
    });
  const engine = createEngine(ts, hints, patchBuilders);
  for (const source of sources) engine.collectGlobalStrings(source.sf);
  // Помощники и сквозные функции объявляются в других файлах — обходим до неподвижной точки.
  let last = -1;
  for (let pass = 0; pass < 8; pass += 1) {
    for (const source of sources) engine.analyze(source);
    const size = engine.stateSize();
    if (size === last) break;
    last = size;
  }
  const fields = new Map();
  const unresolved = [];
  for (const source of sources) {
    for (const write of engine.analyze(source)) {
      const where = `${source.rel}:${write.line}`;
      for (const key of write.keys) {
        const list = fields.get(key) || [];
        if (!list.includes(where)) list.push(where);
        fields.set(key, list);
      }
      if (write.unresolved.length > 0) unresolved.push(`${where} ${write.via} ${write.unresolved.join(' | ')}`);
    }
  }
  const byName = new Map(raw.map((source) => [source.rel, source.text]));
  const staleHints = [];
  for (const [rel, list] of Object.entries(hints)) {
    for (const hint of list) {
      const text = byName.get(rel);
      if (text !== undefined && !text.includes(hint)) staleHints.push(`${rel}: ${hint}`);
      if (text === undefined && !options.sources) staleHints.push(`${rel}: файл не найден`);
    }
  }
  for (const [name, builder] of Object.entries(patchBuilders)) {
    const text = byName.get(builder.file);
    if (text === undefined) {
      if (!options.sources) staleHints.push(`${builder.file}: файл сборщика ${name} не найден`);
      continue;
    }
    if (!text.includes(`function ${name}(`)) staleHints.push(`${builder.file}: нет function ${name}(`);
    for (const key of builder.keys) if (!text.includes(key)) staleHints.push(`${builder.file}: ${name} больше не кладёт ${key}`);
  }
  const sorted = Object.fromEntries([...fields.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return { fields: sorted, unresolved: [...new Set(unresolved)], staleHints, scannedFiles: raw.length };
}

module.exports = { buildRootFieldCensus, readRepoSources, DEFAULT_ROOTS, DEFAULT_HINTS, DEFAULT_PATCH_BUILDERS };

if (require.main === module) {
  const census = buildRootFieldCensus();
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(census, null, 2)}\n`);
  } else {
    for (const [name, where] of Object.entries(census.fields)) console.log(`${name.padEnd(36)} ${where.join(' ')}`);
    console.log(`[ACCOUNT-V2-ROOT-CENSUS] fields=${Object.keys(census.fields).length} unresolved=${census.unresolved.length} staleHints=${census.staleHints.length} files=${census.scannedFiles}`);
    for (const item of census.unresolved) console.log(`[ACCOUNT-V2-ROOT-CENSUS] unresolved ${item}`);
  }
}
