import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Apply stage of the Claude translation conveyor.
//
// Takes a GO ledger (accepted_rows.jsonl) and inserts the translated copy into
// app sources. v1 supports the dominant, structurally safe class: keyPath ends
// with a locale key ('...meaning.uk', 'intro.[0].body.es'), i.e. the parent is
// a locale container object ({ ru, uk, es, ... }) — the target locale is added
// as one more key right after the located sibling. Everything else is reported
// as unsupported (suffix fields like titleES need per-file runtime work).
//
// Safety rails:
// - dry-run by default; --execute writes;
// - files with uncommitted git changes are skipped (parallel sessions);
// - rows whose parent already carries the target locale are skipped as
//   already-present;
// - after writing, run `npx tsc --noEmit` yourself (or --check to do it here);
//   type unions that don't accept the new locale must be extended by hand.

const require = createRequire(import.meta.url);
const ts = require('typescript');

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

function parseArgs(argv) {
  const args = { ledger: '', locale: '', execute: false, check: false, out: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--ledger') args.ledger = argv[++i] || '';
    else if (arg === '--locale') args.locale = argv[++i] || '';
    else if (arg === '--execute') args.execute = true;
    else if (arg === '--check') args.check = true;
    else if (arg === '--out') args.out = argv[++i] || '';
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.ledger) throw new Error('--ledger <accepted_rows.jsonl> is required');
  if (!args.locale) throw new Error('--locale <target locale> is required');
  return args;
}

function absFromRoot(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

function parseJsonl(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

const LOCALE_KEY_RE = /^(ru|uk|es|russian|ukrainian|spanish)$/i;

function propertyName(node) {
  if (!node) return '';
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return '';
}

// Index every property-assignment path in the file using the SAME addressing
// scheme as the extractor (heisenberg_core.cjs): array elements become 'id:X'
// when the object has a string/number id, '[i]' otherwise; property names are
// appended verbatim. Direct map lookup then replaces fragile searching.
function objectLiteralIdValue(node) {
  if (!ts.isObjectLiteralExpression(node)) return null;
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop) || propertyName(prop.name) !== 'id') continue;
    const v = prop.initializer;
    if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v) || ts.isNumericLiteral(v)) return v.text;
    return null;
  }
  return null;
}

function indexPropertyPaths(sf) {
  const map = new Map();
  function walk(node, pathParts) {
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach((element, index) => {
        const stableId = objectLiteralIdValue(element);
        walk(element, [...pathParts, stableId ? `id:${stableId}` : `[${index}]`]);
      });
      return;
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      walk(node.initializer, pathParts);
      return;
    }
    if (ts.isPropertyAssignment(node)) {
      const key = propertyName(node.name);
      const nextPathParts = key ? [...pathParts, key] : pathParts;
      if (key) {
        const full = nextPathParts.join('.');
        if (!map.has(full)) map.set(full, node);
      }
      ts.forEachChild(node, (child) => walk(child, nextPathParts));
      return;
    }
    ts.forEachChild(node, (child) => walk(child, pathParts));
  }
  walk(sf, []);
  return map;
}

function classifyAndLocate(pathIndex, row, locale) {
  const parts = row.keyPath.split('.');
  const last = parts[parts.length - 1];
  if (!LOCALE_KEY_RE.test(last)) return { status: 'unsupported-slot' };
  const parentPath = parts.slice(0, -1).join('.');
  const prop = pathIndex.get(row.keyPath);
  if (!prop) return { status: 'keypath-not-found' };
  if (!prop.parent || !ts.isObjectLiteralExpression(prop.parent)) return { status: 'not-locale-container' };
  const container = prop.parent;
  for (const sibling of container.properties) {
    if (ts.isPropertyAssignment(sibling) && propertyName(sibling.name) === locale) {
      return { status: 'already-present' };
    }
  }
  // Only treat as a locale container when at least 2 locale keys are present.
  const localeKeys = container.properties.filter(
    (p) => ts.isPropertyAssignment(p) && LOCALE_KEY_RE.test(propertyName(p.name)),
  );
  if (localeKeys.length < 2) return { status: 'not-locale-container' };
  const lastLocaleProp = localeKeys[localeKeys.length - 1];
  return { status: 'insert', insertAfter: lastLocaleProp.end, parentPath, indentRef: lastLocaleProp };
}

function escapeSingleQuoted(text) {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = parseJsonl(absFromRoot(args.ledger)).filter((r) => r.targetLocale === args.locale && r.status === 'GO');
  const dirty = new Set(
    execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' })
      .split(/\r?\n/)
      .map((l) => l.slice(3).trim().replace(/\\/g, '/'))
      .filter(Boolean),
  );

  const byFile = new Map();
  for (const row of rows) {
    if (!byFile.has(row.file)) byFile.set(row.file, []);
    byFile.get(row.file).push(row);
  }

  const report = { applied: 0, alreadyPresent: 0, unsupported: 0, notFound: 0, fileBusy: 0, conflicts: 0, files: {}, details: [] };
  for (const [file, fileRows] of [...byFile.entries()].sort()) {
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs) || !/\.(ts|tsx)$/.test(file)) {
      report.unsupported += fileRows.length;
      continue;
    }
    if (dirty.has(file)) {
      report.fileBusy += fileRows.length;
      report.details.push({ file, status: 'file-busy-other-session', rows: fileRows.length });
      continue;
    }
    const text = fs.readFileSync(abs, 'utf8');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const pathIndex = indexPropertyPaths(sf);
    const inserts = [];
    const seenParents = new Map();
    const stats = { applied: 0, alreadyPresent: 0, unsupported: 0, notFound: 0, conflicts: 0 };
    for (const row of fileRows) {
      const res = classifyAndLocate(pathIndex, row, args.locale);
      if (res.status === 'insert') {
        const prev = seenParents.get(res.parentPath);
        if (prev !== undefined) {
          if (prev !== row.targetText) stats.conflicts += 1;
          continue;
        }
        seenParents.set(res.parentPath, row.targetText);
        inserts.push({ at: res.insertAfter, text: row.targetText, indentRef: res.indentRef });
        stats.applied += 1;
      } else if (res.status === 'already-present') stats.alreadyPresent += 1;
      else if (res.status === 'keypath-not-found') stats.notFound += 1;
      else stats.unsupported += 1;
    }
    if (args.execute && inserts.length > 0) {
      let out = text;
      for (const ins of inserts.sort((a, b) => b.at - a.at)) {
        const indentMatch = /^[ \t]*/.exec(out.slice(out.lastIndexOf('\n', ins.at - 1) + 1, ins.at));
        const indent = indentMatch ? indentMatch[0] : '  ';
        // Keep the original trailing comma (it now terminates the inserted
        // property); when the sibling had none (last prop), ours is enough.
        out = `${out.slice(0, ins.at)},\n${indent}'${args.locale}': '${escapeSingleQuoted(ins.text)}'${out.slice(ins.at)}`;
      }
      fs.writeFileSync(abs, out, 'utf8');
    }
    report.applied += stats.applied;
    report.alreadyPresent += stats.alreadyPresent;
    report.unsupported += stats.unsupported;
    report.notFound += stats.notFound;
    report.conflicts += stats.conflicts;
    report.files[file] = stats;
  }

  const mode = args.execute ? 'EXECUTE' : 'DRY_RUN';
  console.log(`[heisenberg-apply] ${mode}: insert ${report.applied}, already-present ${report.alreadyPresent}, unsupported ${report.unsupported}, not-found ${report.notFound}, file-busy ${report.fileBusy}, conflicts ${report.conflicts}.`);
  if (args.out) {
    fs.mkdirSync(path.dirname(absFromRoot(args.out)), { recursive: true });
    fs.writeFileSync(absFromRoot(args.out), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`[heisenberg-apply] report: ${args.out}`);
  }
  if (args.check && args.execute) {
    console.log('[heisenberg-apply] running tsc --noEmit ...');
    execSync('npx tsc --noEmit', { cwd: ROOT, stdio: 'inherit' });
  }
}

main();
