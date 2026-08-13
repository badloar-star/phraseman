import fs from 'node:fs';
import path from 'node:path';
import { SOURCE_LOCALES, type SourceLocale } from '../app/source_locales';
import { auditPlanContentLocaleIsolation } from '../app/plan_content_locale_gate';
import { IMPULS_CONTENT_DAYS } from '../app/plan_content_impuls';
import { ECHO_CONTENT_DAYS } from '../app/plan_content_echo';
import { GAVAN_CONTENT_DAYS } from '../app/plan_content_gavan';
import { MITAP_CONTENT_DAYS } from '../app/plan_content_mitap';
import { VOYAZH_CONTENT_DAYS } from '../app/plan_content_voyazh';
import type { LocalizedText, PlanContentDay } from '../app/plan_content_schema';

type PlanEntry = {
  plan: string;
  file: string;
  days: PlanContentDay[];
};

type RepairItem = {
  id: string;
  plan: string;
  file: string;
  day: number;
  path: string;
  locale: SourceLocale;
  targetLanguage: string;
  current: string;
  sources: {
    ru?: string;
    uk?: string;
    es?: string;
  };
  protectedAnchors: string[];
  context: Record<string, unknown>;
};

const PLAN_CONTENT: PlanEntry[] = [
  { plan: 'impuls', file: 'app/plan_content_impuls.ts', days: IMPULS_CONTENT_DAYS },
  { plan: 'echo', file: 'app/plan_content_echo.ts', days: ECHO_CONTENT_DAYS },
  { plan: 'gavan', file: 'app/plan_content_gavan.ts', days: GAVAN_CONTENT_DAYS },
  { plan: 'mitap', file: 'app/plan_content_mitap.ts', days: MITAP_CONTENT_DAYS },
  { plan: 'voyazh', file: 'app/plan_content_voyazh.ts', days: VOYAZH_CONTENT_DAYS },
];

const LOCALE_NAMES: Record<SourceLocale, string> = {
  ru: 'Russian',
  uk: 'Ukrainian',
  es: 'Spanish',
  'pt-BR': 'Brazilian Portuguese',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish',
  pl: 'Polish',
};

function argValue(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file: string, value: unknown): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(file: string, value: string): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}

function writeJsonl(file: string, rows: unknown[]): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
}

function protectedTermFromMessage(message: string): string | undefined {
  return message.match(/"([^"]+)"/)?.[1];
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

function valueAtPath(root: unknown, rawPath: string): unknown {
  let cursor: unknown = root;
  for (const segment of pathSegments(rawPath)) {
    if (cursor == null || (typeof cursor !== 'object' && !Array.isArray(cursor))) return undefined;
    cursor = (cursor as Record<string | number, unknown>)[segment];
  }
  return cursor;
}

function localizedAtPath(day: PlanContentDay, rawPath: string): LocalizedText | undefined {
  const value = valueAtPath(day, rawPath);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as LocalizedText;
}

function compact(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/\s+/g, ' ').trim();
}

function phraseContext(day: PlanContentDay, rawPath: string): Record<string, unknown> {
  const match = rawPath.match(/^phrases\[(\d+)\]/);
  if (!match) return {};
  const phrase = day.phrases[Number(match[1])];
  if (!phrase) return {};
  return {
    phraseId: phrase.id,
    phraseEnglish: phrase.english,
    phraseMeaning: {
      ru: compact(phrase.meaning.ru),
      uk: compact(phrase.meaning.uk),
      es: compact(phrase.meaning.es),
    },
    words: phrase.words.map((word) => ({
      text: word.text,
      distractors: word.distractors,
    })),
  };
}

function introContext(day: PlanContentDay, rawPath: string): Record<string, unknown> {
  const match = rawPath.match(/^intro\[(\d+)\]/);
  if (!match) return {};
  const screen = day.intro[Number(match[1])];
  if (!screen) return {};
  return {
    introKind: screen.kind,
    examples: screen.examples?.map((example) => ({
      en: example.en,
      gloss: {
        ru: compact(example.gloss.ru),
        uk: compact(example.gloss.uk),
        es: compact(example.gloss.es),
      },
    })) ?? [],
  };
}

function contextForPath(day: PlanContentDay, rawPath: string): Record<string, unknown> {
  return {
    planId: day.planId,
    dayIndex: day.dayIndex,
    topic: {
      ru: compact(day.topic.ru),
      uk: compact(day.topic.uk),
      es: compact(day.topic.es),
    },
    ...introContext(day, rawPath),
    ...phraseContext(day, rawPath),
  };
}

function itemKey(plan: string, day: number, rawPath: string, locale: string): string {
  return `${plan}:d${day}:${rawPath}:${locale}`;
}

function collectRepairItems(planFilter?: string, localeFilter?: SourceLocale): RepairItem[] {
  const grouped = new Map<string, RepairItem>();
  for (const entry of PLAN_CONTENT) {
    if (planFilter && entry.plan !== planFilter) continue;
    for (const day of entry.days) {
      for (const issue of auditPlanContentLocaleIsolation(day)) {
        if (issue.severity !== 'blocker') continue;
        if (issue.code !== 'protected_english_term_missing') continue;
        if (!issue.locale) continue;
        if (localeFilter && issue.locale !== localeFilter) continue;
        const text = localizedAtPath(day, issue.path);
        if (!text) continue;
        const current = text[issue.locale];
        if (!current) continue;

        const key = itemKey(entry.plan, day.dayIndex, issue.path, issue.locale);
        const existing = grouped.get(key);
        const term = protectedTermFromMessage(issue.message);
        if (existing) {
          if (term && !existing.protectedAnchors.includes(term)) existing.protectedAnchors.push(term);
          continue;
        }

        grouped.set(key, {
          id: key,
          plan: entry.plan,
          file: entry.file,
          day: day.dayIndex,
          path: issue.path,
          locale: issue.locale,
          targetLanguage: LOCALE_NAMES[issue.locale],
          current,
          sources: {
            ru: text.ru,
            uk: text.uk,
            es: text.es,
          },
          protectedAnchors: term ? [term] : [],
          context: contextForPath(day, issue.path),
        });
      }
    }
  }

  return [...grouped.values()].sort((a, b) => (
    a.plan.localeCompare(b.plan) ||
    a.day - b.day ||
    a.path.localeCompare(b.path) ||
    a.locale.localeCompare(b.locale)
  ));
}

function countBy<T extends string>(rows: RepairItem[], pick: (row: RepairItem) => T): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const row of rows) {
    const key = pick(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function anchorCounts(rows: RepairItem[]): Array<{ anchor: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const anchor of row.protectedAnchors) {
      counts.set(anchor, (counts.get(anchor) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 40)
    .map(([anchor, count]) => ({ anchor, count }));
}

function renderPrompt(rows: RepairItem[]): string {
  return [
    '# Heisenberg PlanContent Repair Prompt',
    '',
    'You will receive JSONL repair items for English-learning PlanContent fields.',
    'Return JSONL only: one object per input item, with exactly {"id": "...", "text": "..."}.' ,
    '',
    'Rules:',
    '- Rewrite only the requested locale text.',
    '- The output text must be in the item targetLanguage.',
    '- Preserve every string in protectedAnchors exactly as English. Do not translate, inflect, reorder, or partially localize these anchors.',
    '- Translate only the surrounding explanation.',
    '- Keep the same teaching meaning as sources.ru/sources.uk/sources.es and the same field intent as current.',
    '- Do not use Cyrillic outside ru/uk items. Do not mix another target language into the output.',
    '- Do not change item ids, plan ids, paths, English phrases, source text, or other locales.',
    '- Prefer minimal repair when current is mostly correct: replace the bad translated anchor with the exact protected English anchor and smooth the surrounding sentence.',
    '',
    `Items in this packet: ${rows.length}.`,
  ].join('\n');
}

function main(): void {
  const root = process.cwd();
  const plan = argValue('plan');
  const locale = argValue('locale') as SourceLocale | undefined;
  if (locale && !SOURCE_LOCALES.includes(locale)) {
    throw new Error(`Unknown --locale=${locale}. Expected one of ${SOURCE_LOCALES.join(', ')}`);
  }
  const relOutDir = argValue('out-dir', path.join('docs', 'heisenberg', 'repair', timestampSlug()))!;
  const outDir = path.isAbsolute(relOutDir) ? relOutDir : path.join(root, relOutDir);
  const rows = collectRepairItems(plan, locale);

  writeJsonl(path.join(outDir, 'repair_items.jsonl'), rows);
  writeJson(path.join(outDir, 'manifest.json'), {
    generatedAt: new Date().toISOString(),
    mode: 'heisenberg-plan-content-repair-packets',
    sourceLocales: SOURCE_LOCALES,
    filters: { plan: plan ?? null, locale: locale ?? null },
    itemCount: rows.length,
    byPlan: countBy(rows, (row) => row.plan),
    byLocale: countBy(rows, (row) => row.locale),
    topAnchors: anchorCounts(rows),
  });
  writeText(path.join(outDir, 'PROMPT.md'), renderPrompt(rows));

  const itemDir = path.join(outDir, 'items');
  ensureDir(itemDir);
  for (const row of rows) {
    const file = path.join(itemDir, `${row.plan}_${row.locale}.jsonl`);
    fs.appendFileSync(file, `${JSON.stringify(row)}\n`, 'utf8');
  }

  console.log(`Heisenberg repair packets: ${rows.length} items`);
  console.log(`Output: ${path.relative(root, outDir).replace(/\\/g, '/')}`);
}

if (require.main === module) {
  main();
}
