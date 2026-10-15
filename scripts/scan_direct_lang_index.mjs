#!/usr/bin/env node
/**
 * Ищет прямое чтение словаря по языку интерфейса: DICT[lang] / DICT[uiLang] / DICT[locale], где DICT — объект в этом же файле
 * с ключами ru и uk, но БЕЗ ключа en, и чтение не защищено `??` / `||` / `?.`.
 *
 * зачем (координатор 12.10): именно такое чтение уронило прод 27.08 при включении английского (Студия аватаров: `STUDIO_COPY[lang]`
 * без ключа en → undefined → TypeError). Сторож не даёт появиться новому незащищённому чтению, пока ENGLISH_UI_LOCALE_ENABLED выключен.
 * Исключения — файлы, где язык здесь контентный (en не бывает) или чтение защищено запасным значением; причина в ALLOWED.
 *
 * Использование: node scripts/scan_direct_lang_index.mjs   (код выхода 1, если нашёл незащищённое чтение вне ALLOWED)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANG_NAMES = new Set(['lang', 'uiLang', 'interfaceLang', 'appLang', 'currentLang', 'sourceUi']);

/** Файлы с причиной, почему чтение безопасно. */
const ALLOWED = new Map([
  ['app/flashcards/FlashcardListItem.tsx', 'язык здесь контентный (FlashcardContentLang): en не бывает'],
  ['app/flashcards/PhraseCard.tsx', 'язык здесь контентный (FlashcardContentLang): en не бывает'],
  ['app/lesson_lock_system.ts', 'чтение защищено `?? byLang.ru`'],
  ['components/ActivityHeatmap365.tsx', 'чтение защищено `?? \'en-US\'` (коды локалей, не тексты)'],
  ['constants/lessons.ts', 'чтение защищено запасным списком названий'],
  ['constants/avatars.ts', 'чтение защищено `||` и необязательным обращением'],
  ['components/spire/moments/moments_strings.ts', 'LEAGUE_LOCATIVE[lang] читается только после сужения lang до ru/uk/pl (падеж; в en падежа нет — имя как есть)'],
]);

function listFiles() {
  const out = execFileSync('git', ['ls-files', '--', 'app', 'components', 'constants', 'hooks'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
}

const keyName = (p) => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null);

function offendersIn(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (!/\[(lang|uiLang|interfaceLang|appLang|currentLang|sourceUi)\]/.test(src)) return [];
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const dicts = new Map();
  const collect = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      let init = n.initializer;
      while (ts.isAsExpression(init) || ts.isParenthesizedExpression(init) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(init))) init = init.expression;
      if (ts.isObjectLiteralExpression(init)) {
        const keys = new Set(init.properties.filter(ts.isPropertyAssignment).map(keyName).filter(Boolean));
        if (keys.has('ru') && keys.has('uk')) dicts.set(n.name.text, { hasEn: keys.has('en') });
      }
    }
    ts.forEachChild(n, collect);
  };
  collect(sf);
  const hits = [];
  const guarded = (n) => {
    const p = n.parent;
    if (!p) return false;
    if (ts.isBinaryExpression(p) && p.left === n && (p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || p.operatorToken.kind === ts.SyntaxKind.BarBarToken)) return true;
    return false;
  };
  const visit = (n) => {
    if (ts.isElementAccessExpression(n) && ts.isIdentifier(n.expression) && ts.isIdentifier(n.argumentExpression) && LANG_NAMES.has(n.argumentExpression.text)) {
      const d = dicts.get(n.expression.text);
      if (d && !d.hasEn && !guarded(n) && !n.questionDotToken) hits.push(`${n.expression.text}[${n.argumentExpression.text}]@${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return hits;
}

const offenders = [];
for (const rel of listFiles()) {
  if (ALLOWED.has(rel)) continue;
  const hits = offendersIn(rel);
  if (hits.length) offenders.push(`${rel} :: ${hits.join(', ')}`);
}
if (offenders.length) {
  console.error('Незащищённое чтение словаря по языку без ключа en (крэш при включении английского):');
  for (const o of offenders) console.error('  ' + o);
  console.error('Добавь ключ en в словарь или защити чтение (`?? запасное`). Исключения — только с причиной в ALLOWED.');
  process.exit(1);
}
console.log('OK: незащищённых чтений словарей по языку без ключа en нет.');
