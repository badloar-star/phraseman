import type { IrregularVerb } from './irregular_verbs_data';

export type IrregularVerbFormKey = 'past' | 'pp' | 'base';

const OPTION_FALLBACK_POOL: readonly string[] = [
  'went', 'took', 'saw', 'came', 'gave', 'knew', 'found', 'left', 'held', 'bought',
  'sold', 'drove', 'wrote', 'spoke', 'ate', 'drank', 'told', 'sent', 'built', 'fought',
  'flew', 'drew', 'grew', 'paid', 'shut', 'slept', 'brought', 'caught', 'taught',
  'wore', 'won', 'forgot', 'chose', 'broke', 'fell', 'stole', 'swam', 'rose', 'woke',
  'began',
];

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanOption(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hasCompleteOptionSet(options: readonly string[], correct: string): boolean {
  if (options.length !== 4) return false;
  const normalized = options.map(cleanOption);
  if (normalized.some(option => !option)) return false;
  const keys = normalized.map(option => option!.toLowerCase());
  return new Set(keys).size === 4 && keys.includes(correct.toLowerCase());
}

export function buildIrregularVerbOptions(
  correct: string,
  verb: IrregularVerb,
  allVerbs: IrregularVerb[],
  formKey: IrregularVerbFormKey,
): string[] {
  const cleanCorrect = cleanOption(correct) ?? cleanOption(verb[formKey]) ?? cleanOption(verb.base) ?? 'answer';
  const correctLow = cleanCorrect.toLowerCase();
  const seen = new Set<string>([correctLow]);

  const score = (w: string) => {
    let s = 0;
    if (w[0] === cleanCorrect[0]) s += 2;
    if (w.slice(-2) === cleanCorrect.slice(-2)) s += 3;
    if (w.slice(-3) === cleanCorrect.slice(-3)) s += 2;
    return s;
  };

  const ownForms = [verb.base, verb.past, verb.pp]
    .map(cleanOption)
    .filter((f): f is string => Boolean(f))
    .filter(f => f.toLowerCase() !== correctLow);
  const uniqueOwn = [...new Set(ownForms)];

  const candidates = allVerbs
    .filter(v => v.base !== verb.base)
    .map(v => cleanOption(v[formKey]))
    .filter((f): f is string => Boolean(f))
    .filter(f => f.toLowerCase() !== correctLow);
  const deduped = [...new Set(candidates)];
  const sorted = shuffleArr(deduped).sort((a, b) => score(b) - score(a));

  const out: string[] = [cleanCorrect];
  for (const option of [...shuffleArr(uniqueOwn), ...sorted, ...OPTION_FALLBACK_POOL]) {
    if (out.length >= 4) break;
    const clean = cleanOption(option);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  }

  let pad = 0;
  while (out.length < 4) {
    const filler = `option ${++pad}`;
    const key = filler.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(filler);
    }
  }

  return shuffleArr(out);
}

export function ensureCompleteIrregularVerbOptions(
  options: readonly string[],
  verb: IrregularVerb,
  allVerbs: IrregularVerb[],
  formKey: IrregularVerbFormKey,
): string[] {
  const correct = cleanOption(verb[formKey]) ?? cleanOption(verb.base) ?? 'answer';
  const cleaned = options.map(cleanOption).filter((option): option is string => Boolean(option));
  if (hasCompleteOptionSet(cleaned, correct)) return cleaned;
  return buildIrregularVerbOptions(correct, verb, allVerbs, formKey);
}
