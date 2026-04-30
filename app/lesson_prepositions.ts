import { LessonPrepositionPack, PrepositionKind } from './lesson_data_types';
import { getLessonData } from './lesson_data_all';
import { explainPrepositionChoice } from './preposition_explanations';

const directionSet = new Set(['to', 'into', 'onto', 'from', 'toward', 'through', 'across', 'along', 'up', 'down', 'out']);
const placeSet = new Set(['in', 'on', 'at', 'under', 'over', 'between', 'among', 'inside', 'outside', 'near', 'behind', 'opposite', 'beside', 'around']);
const timeSet = new Set(['during', 'before', 'after', 'since', 'until', 'for', 'by', 'on', 'in', 'at']);

function classifyPreposition(text: string): PrepositionKind {
  const t = text.toLowerCase();
  if (directionSet.has(t)) return 'direction';
  if (timeSet.has(t)) return 'time';
  if (placeSet.has(t)) return 'place';
  return 'other';
}

function normalizeWord(text: string): string {
  return String(text || '').trim().toLowerCase();
}

function buildLessonPrepositions(lessonId: number): string[] {
  const seenCurrent = new Set<string>();
  const result: string[] = [];
  for (const phrase of getLessonData(lessonId)) {
    for (const word of phrase.words ?? []) {
      if ((word.category || '').toLowerCase() !== 'preposition') continue;
      const value = normalizeWord(word.correct || word.text);
      if (!value || seenCurrent.has(value)) continue;
      seenCurrent.add(value);
      result.push(value);
    }
  }
  return result;
}

// Cumulative set of prepositions seen in lessons strictly BEFORE `lessonId`.
// Used to sort drill items: prepositions first introduced in this lesson go to
// the front of the queue, prepositions that already appeared earlier follow.
const priorPrepositionsCache = new Map<number, Set<string>>();
function getPrepositionsBeforeLesson(lessonId: number): Set<string> {
  const cached = priorPrepositionsCache.get(lessonId);
  if (cached) return cached;
  const set = new Set<string>();
  for (let i = 1; i < lessonId; i++) {
    for (const p of buildLessonPrepositions(i)) set.add(p);
  }
  priorPrepositionsCache.set(lessonId, set);
  return set;
}

const ITEM_CAP = 12;

function deterministicShuffle<T>(arr: T[], seed: string): T[] {
  // Fisher-Yates shuffle with a hash-based PRNG so the order is stable per
  // item id but no longer puts the correct answer in slot 0.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const rand = () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildItemsForLesson(lessonId: number, lessonPrepositions: Set<string>) {
  // collect ALL valid items in source order, then re-order so brand-new
  // prepositions come first; cap at ITEM_CAP after sorting
  const all: LessonPrepositionPack['items'] = [];
  let idx = 1;
  for (const phrase of getLessonData(lessonId)) {
    for (const word of phrase.words ?? []) {
      if ((word.category || '').toLowerCase() !== 'preposition') continue;
      const answer = normalizeWord(word.correct || word.text);
      if (!lessonPrepositions.has(answer)) continue;
      const template = phrase.english.replace(new RegExp(`\\b${answer}\\b`, 'i'), '__');
      const rawOptions = [answer, ...(word.distractors || []).map(normalizeWord)]
        .filter(Boolean)
        .slice(0, 4);
      if (!template.includes('__') || rawOptions.length < 2) continue;
      const itemId = `l${lessonId}-p${idx++}`;
      const options = deterministicShuffle(rawOptions, `${itemId}|${template}|${answer}`);
      const explanation = explainPrepositionChoice(answer, phrase.english);
      all.push({
        id: itemId,
        sentenceTemplate: template,
        correct: answer,
        options,
        explainRU: explanation.ru,
        explainUK: explanation.uk,
        explainES: explanation.es,
      });
    }
  }

  const priorSet = getPrepositionsBeforeLesson(lessonId);
  // stable sort: NEW prepositions first, then repeated ones; original order preserved within each group
  all.sort((a, b) => {
    const aNew = !priorSet.has(a.correct);
    const bNew = !priorSet.has(b.correct);
    if (aNew === bNew) return 0;
    return aNew ? -1 : 1;
  });

  return all.slice(0, ITEM_CAP);
}

export function getLessonPrepositionPack(lessonId: number): LessonPrepositionPack | null {
  const lessonPrepositions = buildLessonPrepositions(lessonId);
  if (!lessonPrepositions.length) return null;

  const lessonSet = new Set(lessonPrepositions);
  const items = buildItemsForLesson(lessonId, lessonSet);
  if (!items.length) return null;

  // surface NEW prepositions first in the header label too
  const priorSet = getPrepositionsBeforeLesson(lessonId);
  const ordered = [
    ...lessonPrepositions.filter(p => !priorSet.has(p)),
    ...lessonPrepositions.filter(p => priorSet.has(p)),
  ];

  return {
    lessonId,
    newPrepositions: ordered.map(text => ({ text, kind: classifyPreposition(text) })),
    items,
  };
}

export function hasLessonPrepositionDrill(lessonId: number): boolean {
  return getLessonPrepositionPack(lessonId) !== null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
