#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const ROOT = process.cwd();
const INCLUDE_DIRS = ['app', 'components', 'constants', 'hooks'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const CHANGED_ONLY = process.argv.includes('--changed');

const SKIP_PARTS = [
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.git${path.sep}`,
  `${path.sep}tmp${path.sep}`,
  `${path.sep}functions${path.sep}lib${path.sep}`,
  `${path.sep}docs${path.sep}`,
  `${path.sep}scripts${path.sep}`,
];

const SKIP_FILE_RE = [
  /(?:^|[\\/])app[\\/]_admin_/,
  /(?:^|[\\/])app[\\/]lesson_data_/,
  /(?:^|[\\/])app[\\/]lesson_intro_screens_/,
  /(?:^|[\\/])app[\\/]lesson_help\.tsx$/,
  /(?:^|[\\/])app[\\/]lesson_words_(?:es_by_en|source_locales)\.ts$/,
  /(?:^|[\\/])app[\\/]quiz_data(?:_.*)?\.ts$/,
  /(?:^|[\\/])app[\\/]idioms_data\.ts$/,
  /(?:^|[\\/])app[\\/]error_traps[\\/]/,
  /(?:^|[\\/])constants[\\/]contractions\.ts$/,
  /(?:^|[\\/])constants[\\/]verb_forms\.ts$/,
];

const RAW_RULES = [
  {
    name: 'react-native ActivityIndicator',
    re: /\bActivityIndicator\b/,
  },
];

const STRING_RULES = [
  {
    name: 'visible loading copy',
    re: /(?:Loading(?:\.\.\.|…)?|Загрузка|Загружаем|Завантаження|Cargando(?:\.\.\.|…)?|Loading lesson)/,
  },
  {
    name: 'spinner/skeleton placeholder',
    re: /\b(?:spinner|loader|skeleton)\b/i,
  },
  {
    name: 'busy action copy',
    re: /(?:Отправка\.\.\.|Надсилання\.\.\.|Enviando\.\.\.|Restaurando\.\.\.|Procesando…|Обработка…|Зачисление…|Añadiendo…|Нараховуємо…|Активируем…|Активуємо…|Activando…|Готовим|Готуємо|Preparando)/,
  },
  {
    name: 'wait-as-loading copy',
    re: /(?:Подождите…|Зачекайте…|Espera…|Жд[её]м соперника|Ожидание соперника|Очікування суперника|Esperando al rival)/,
  },
];

function isAllowedStringFinding(rel, ruleName, literal) {
  if (ruleName !== 'spinner/skeleton placeholder') return false;
  if (!/\bshimmer\b/i.test(literal) || /\b(?:spinner|loader|skeleton)\b/i.test(literal)) return false;
  return rel === 'app/profile_card_system.ts' || rel === 'app/profile_card_upgrade.tsx';
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SKIP_PARTS.some((part) => full.includes(part))) continue;
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function lineCol(source, index) {
  const before = source.slice(0, index);
  const lines = before.split(/\r?\n/);
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

function collectStringLiterals(source, fileName) {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith('.tsx') || fileName.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const literals = [];
  const visit = (node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      (ts.isJsxText(node) && node.getText(sf).trim())
    ) {
      literals.push({ text: node.text ?? node.getText(sf), pos: node.getStart(sf) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return literals;
}

function changedSourceFiles() {
  const commands = [
    ['diff', '--name-only', 'HEAD^1', 'HEAD', '--', ...INCLUDE_DIRS],
    ['diff', '--name-only', 'HEAD', '--', ...INCLUDE_DIRS],
    ['diff', '--cached', '--name-only', '--', ...INCLUDE_DIRS],
  ];
  const changed = new Set();
  for (const [index, args] of commands.entries()) {
    try {
      const output = execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      for (const file of output.split(/\r?\n/u).filter(Boolean)) {
        changed.add(file.replace(/\\/gu, '/'));
      }
    } catch (error) {
      if (index === 0 && process.env.GITHUB_ACTIONS === 'true') {
        throw new Error('Visible loading audit cannot resolve the pull-request base (HEAD^1); refusing to pass CI without a reviewable diff.', { cause: error });
      }
      // A shallow/local checkout may not have HEAD^1. Other commands still
      // cover staged and unstaged files. CI is deliberately fail-closed above.
    }
  }
  return changed;
}

const changedFiles = CHANGED_ONLY ? changedSourceFiles() : null;

const files = INCLUDE_DIRS
  .map((dir) => path.join(ROOT, dir))
  .filter((dir) => fs.existsSync(dir))
  .flatMap((dir) => walk(dir))
  .filter((file) => !SKIP_FILE_RE.some((re) => re.test(path.relative(ROOT, file))))
  .filter((file) => !changedFiles || changedFiles.has(path.relative(ROOT, file).replace(/\\/gu, '/')));

const findings = [];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const source = stripComments(raw);
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  for (const rule of RAW_RULES) {
    rule.re.lastIndex = 0;
    const match = rule.re.exec(source);
    if (!match) continue;
    const { line, col } = lineCol(source, match.index);
    const snippet = source
      .slice(Math.max(0, match.index - 50), Math.min(source.length, match.index + 90))
      .replace(/\s+/g, ' ')
      .trim();
    findings.push({ rel, line, col, rule: rule.name, snippet });
  }

  for (const literalNode of collectStringLiterals(source, rel)) {
    const literal = literalNode.text ?? '';
    for (const rule of STRING_RULES) {
      rule.re.lastIndex = 0;
      if (!rule.re.test(literal)) continue;
      if (isAllowedStringFinding(rel, rule.name, literal)) continue;
      const { line, col } = lineCol(source, literalNode.pos);
      const snippet = literal.replace(/\s+/g, ' ').trim().slice(0, 140);
      findings.push({ rel, line, col, rule: rule.name, snippet });
      break;
    }
  }
}

if (findings.length > 0) {
  console.error('Visible loading audit failed. Remove user-visible loading states:');
  for (const f of findings) {
    console.error(`- ${f.rel}:${f.line}:${f.col} [${f.rule}] ${f.snippet}`);
  }
  process.exit(1);
}

console.log(`Visible loading audit passed (${files.length} ${CHANGED_ONLY ? 'changed ' : ''}files scanned).`);
