import fs from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { SOURCE_LOCALES, type SourceLocale } from '../app/source_locales';

type RepairOutput = {
  id: string;
  text: string;
};

type SourceRepairItem = {
  id: string;
  locale: SourceLocale;
  protectedAnchors?: string[];
};

type ParsedId = {
  plan: string;
  day: number;
  fieldPath: string;
  locale: SourceLocale;
};

type Replacement = {
  file: string;
  id: string;
  start: number;
  end: number;
  text: string;
};

const PLAN_FILES: Record<string, string> = {
  impuls: 'app/plan_content_impuls.ts',
  echo: 'app/plan_content_echo.ts',
  gavan: 'app/plan_content_gavan.ts',
  mitap: 'app/plan_content_mitap.ts',
  voyazh: 'app/plan_content_voyazh.ts',
};

const CYRILLIC_RE = /[А-Яа-яЁёІіЇїЄєҐґ]/;
const MOJIBAKE_RE = /�|Ð|Ñ|Â[¿¡«»]|Ã[\u0080-\u00BF]|Ä[\u0080-\u00BF]|Å[\u0080-\u00BF]/;

function argValue(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function readJsonl<T>(file: string): T[] {
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function parseId(id: string): ParsedId {
  const match = id.match(/^([a-z0-9_]+):d(\d+):(.+):(ru|uk|es|pt-BR|vi|id|tr|pl)$/);
  if (!match) throw new Error(`Bad repair id: ${id}`);
  const locale = match[4] as SourceLocale;
  if (!SOURCE_LOCALES.includes(locale)) throw new Error(`Unknown locale in repair id: ${id}`);
  return {
    plan: match[1],
    day: Number(match[2]),
    fieldPath: match[3],
    locale,
  };
}

function propName(node: ts.ObjectLiteralElementLike): string | undefined {
  if (!ts.isPropertyAssignment(node)) return undefined;
  const name = node.name;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function propertyInitializer(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  for (const prop of object.properties) {
    if (propName(prop) === name && ts.isPropertyAssignment(prop)) return prop.initializer;
  }
  return undefined;
}

function pathSegments(rawPath: string): Array<string | number> {
  const out: Array<string | number> = [];
  for (const part of rawPath.split('.')) {
    const match = part.match(/^([A-Za-z0-9_]+)\[(\d+)\]$/);
    if (match) {
      out.push(match[1], Number(match[2]));
    } else {
      out.push(part);
    }
  }
  return out;
}

function expressionAtPath(root: ts.Expression, rawPath: string): ts.Expression | undefined {
  let cursor: ts.Expression | undefined = root;
  for (const segment of pathSegments(rawPath)) {
    if (cursor == null) return undefined;
    if (typeof segment === 'string') {
      if (!ts.isObjectLiteralExpression(cursor)) return undefined;
      cursor = propertyInitializer(cursor, segment);
    } else {
      if (!ts.isArrayLiteralExpression(cursor)) return undefined;
      cursor = cursor.elements[segment];
    }
  }
  return cursor;
}

function findDayObject(sourceFile: ts.SourceFile, plan: string, day: number): ts.ObjectLiteralExpression | undefined {
  const varName = `${plan.toUpperCase()}_DAY_${day}`;
  let found: ts.ObjectLiteralExpression | undefined;
  sourceFile.forEachChild((node) => {
    if (found || !ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      if (declaration.name.text !== varName) continue;
      if (declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
        found = declaration.initializer;
      }
    }
  });
  return found;
}

function quoteString(value: string): string {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`;
}

function validateRepairText(repair: RepairOutput, parsed: ParsedId, sourceItem?: SourceRepairItem): void {
  const text = String(repair.text ?? '').trim();
  if (!text) throw new Error(`Empty repair text for ${repair.id}`);
  if (MOJIBAKE_RE.test(text)) throw new Error(`Mojibake in repair text for ${repair.id}`);
  if (parsed.locale !== 'ru' && parsed.locale !== 'uk' && CYRILLIC_RE.test(text)) {
    throw new Error(`Cyrillic leaked into ${parsed.locale} repair ${repair.id}`);
  }
  for (const anchor of sourceItem?.protectedAnchors ?? []) {
    if (!text.includes(anchor)) {
      throw new Error(`Repair ${repair.id} is missing protected anchor "${anchor}"`);
    }
  }
}

function buildReplacements(root: string, repairs: RepairOutput[], sourceItems: Map<string, SourceRepairItem>): Replacement[] {
  const byFile = new Map<string, Array<{ repair: RepairOutput; parsed: ParsedId }>>();
  for (const repair of repairs) {
    const parsed = parseId(repair.id);
    validateRepairText(repair, parsed, sourceItems.get(repair.id));
    const file = PLAN_FILES[parsed.plan];
    if (!file) throw new Error(`Unknown plan in repair id: ${repair.id}`);
    const group = byFile.get(file) ?? [];
    group.push({ repair, parsed });
    byFile.set(file, group);
  }

  const replacements: Replacement[] = [];
  for (const [file, rows] of byFile.entries()) {
    const abs = path.join(root, file);
    const source = fs.readFileSync(abs, 'utf8');
    const sourceFile = ts.createSourceFile(abs, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    for (const row of rows) {
      const dayObject = findDayObject(sourceFile, row.parsed.plan, row.parsed.day);
      if (!dayObject) throw new Error(`Cannot find day object for ${row.repair.id}`);
      const localized = expressionAtPath(dayObject, row.parsed.fieldPath);
      if (!localized || !ts.isObjectLiteralExpression(localized)) {
        throw new Error(`Cannot find localized field for ${row.repair.id}`);
      }
      const localeValue = propertyInitializer(localized, row.parsed.locale);
      if (!localeValue || !(ts.isStringLiteral(localeValue) || ts.isNoSubstitutionTemplateLiteral(localeValue))) {
        throw new Error(`Cannot find string locale value for ${row.repair.id}`);
      }
      replacements.push({
        file,
        id: row.repair.id,
        start: localeValue.getStart(sourceFile),
        end: localeValue.getEnd(),
        text: quoteString(row.repair.text.trim()),
      });
    }
  }
  return replacements;
}

function applyReplacements(source: string, replacements: Replacement[]): string {
  let next = source;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    next = `${next.slice(0, replacement.start)}${replacement.text}${next.slice(replacement.end)}`;
  }
  return next;
}

function main(): void {
  const root = process.cwd();
  const repairsArg = argValue('repairs');
  if (!repairsArg) throw new Error('Usage: npx tsx scripts/heisenberg_apply_plan_content_repairs.ts --repairs=path/to/repairs.jsonl [--source-items=path/to/repair_items.jsonl] [--apply]');
  const repairsFile = path.isAbsolute(repairsArg) ? repairsArg : path.join(root, repairsArg);
  const sourceItemsArg = argValue('source-items');
  const sourceItemsFile = sourceItemsArg
    ? (path.isAbsolute(sourceItemsArg) ? sourceItemsArg : path.join(root, sourceItemsArg))
    : undefined;
  const sourceItems = new Map<string, SourceRepairItem>();
  if (sourceItemsFile) {
    for (const item of readJsonl<SourceRepairItem>(sourceItemsFile)) {
      sourceItems.set(item.id, item);
    }
  }

  const repairs = readJsonl<RepairOutput>(repairsFile);
  const replacements = buildReplacements(root, repairs, sourceItems);
  const byFile = new Map<string, Replacement[]>();
  for (const replacement of replacements) {
    const group = byFile.get(replacement.file) ?? [];
    group.push(replacement);
    byFile.set(replacement.file, group);
  }

  const apply = process.argv.includes('--apply');
  for (const [file, fileReplacements] of byFile.entries()) {
    const abs = path.join(root, file);
    const source = fs.readFileSync(abs, 'utf8');
    const next = applyReplacements(source, fileReplacements);
    ts.createSourceFile(abs, next, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    if (apply) fs.writeFileSync(abs, next, 'utf8');
  }

  console.log(`Heisenberg repair apply ${apply ? 'APPLIED' : 'DRY-RUN'}: ${replacements.length} replacements across ${byFile.size} files`);
}

if (require.main === module) {
  main();
}
