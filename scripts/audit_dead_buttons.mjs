#!/usr/bin/env node
// Бета-тест 15.10 (А2, координатор): «мёртвые» кнопки — нажимаемые элементы без обработчика или с пустым обработчиком.
// Только чтение. Разбирает app/ components/ modules/ (без тестов, dev-экранов и вырезанных из стор-сборки маршрутов).
//
// Ловит:
//   NO_HANDLER — Pressable/Touchable* без onPress/onPressIn/onPressOut/onLongPress и без {...spread} (спред может нести обработчик);
//   EMPTY      — обработчик `() => {}`, `() => undefined`, `() => null`, `function(){}`, `noop`, `undefined`;
//   *Button / *Btn — то же для своих компонентов кнопок (отдельный список: обработчик бывает под другим именем).
// Исключения: disabled={true}/disabled (константа), accessible={false}, pointerEvents="none" — это не кнопка для человека.
// Запуск: node scripts/audit_dead_buttons.mjs [--json]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const { parse } = require('@babel/parser');

const DIRS = ['app', 'components', 'modules'];
const SKIP = /(?:^|\/)(?:node_modules|__tests__|__mocks__)(?:\/|$)|\.test\.|\.spec\.|(?:^|\/)app\/(?:_|dev_)|showcase|preview|fixture|storybook/i;
const RN_PRESSABLES = new Set(['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback', 'TouchableNativeFeedback', 'RectButton', 'BorderlessButton', 'GestureTouchable']);
const HANDLERS = new Set(['onPress', 'onPressIn', 'onPressOut', 'onLongPress']);

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    if (SKIP.test(rel)) continue;
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if (/\.tsx$/.test(name)) out.push(rel);
  }
}

function elementName(node) {
  const n = node.name;
  if (n.type === 'JSXIdentifier') return n.name;
  if (n.type === 'JSXMemberExpression') return `${n.object.name ?? '?'}.${n.property.name}`;
  return '?';
}

function isEmptyFn(expr) {
  if (!expr) return false;
  if (expr.type === 'Identifier' && /^(?:noop|undefined)$/.test(expr.name)) return true;
  if (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') {
    const b = expr.body;
    if (b.type === 'BlockStatement') return b.body.length === 0;
    return b.type === 'Identifier' && b.name === 'undefined' || b.type === 'NullLiteral';
  }
  return false;
}

function constTrue(attr) {
  if (!attr) return false;
  if (attr.value === null) return true; // <X disabled />
  const v = attr.value.type === 'JSXExpressionContainer' ? attr.value.expression : attr.value;
  return v.type === 'BooleanLiteral' && v.value === true;
}

function audit(rel) {
  const src = readFileSync(path.join(ROOT, rel), 'utf8');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module', plugins: ['typescript', 'jsx'], errorRecovery: true });
  } catch (error) {
    return [{ rel, line: 0, kind: 'PARSE_ERROR', name: String(error.message).slice(0, 80) }];
  }
  const found = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'JSXOpeningElement') {
      const name = elementName(node);
      const short = name.split('.').pop();
      const isRn = RN_PRESSABLES.has(short);
      const isCustom = !isRn && /(?:Button|Btn)$/.test(short);
      if (isRn || isCustom) {
        const attrs = node.attributes.filter((a) => a.type === 'JSXAttribute');
        const hasSpread = node.attributes.some((a) => a.type === 'JSXSpreadAttribute');
        const byName = new Map(attrs.map((a) => [a.name.name, a]));
        const disabled = constTrue(byName.get('disabled'));
        const inert = byName.get('accessible')?.value?.expression?.value === false
          || byName.get('pointerEvents')?.value?.value === 'none';
        const handlers = attrs.filter((a) => HANDLERS.has(a.name.name));
        const group = isRn ? 'rn' : 'custom';
        if (!disabled && !inert) {
          if (handlers.length === 0 && !hasSpread) found.push({ rel, line: node.loc.start.line, kind: 'NO_HANDLER', name, group });
          for (const h of handlers) {
            const expr = h.value?.type === 'JSXExpressionContainer' ? h.value.expression : null;
            if (isEmptyFn(expr)) found.push({ rel, line: node.loc.start.line, kind: 'EMPTY', name: `${name}.${h.name.name}`, group });
          }
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value.type === 'string') visit(value);
    }
  };
  visit(ast.program);
  return found;
}

const files = [];
for (const dir of DIRS) walk(path.join(ROOT, dir), files);
const results = files.flatMap(audit);
if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(results, null, 1));
} else {
  for (const r of results) console.log(`${r.kind.padEnd(11)} ${r.group ?? ''}\t${r.rel}:${r.line}\t${r.name}`);
  const count = (kind, group) => results.filter((r) => r.kind === kind && (!group || r.group === group)).length;
  console.log(`[DEAD-BUTTONS] файлов ${files.length}; RN: без обработчика ${count('NO_HANDLER', 'rn')}, пустых ${count('EMPTY', 'rn')}; свои *Button: без обработчика ${count('NO_HANDLER', 'custom')}, пустых ${count('EMPTY', 'custom')}; ошибок разбора ${count('PARSE_ERROR')}`);
}
