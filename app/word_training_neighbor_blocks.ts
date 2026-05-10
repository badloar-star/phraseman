/**
 * Подковырные английские пары для режима «6 кнопок»: единственное ↔ множественное (book↔books)
 * и базовая форма глагола ↔ he/she … (-s / irregular).
 * Заполняется один раз из словаря уроков (initWordNeighborBlocks).
 */

export interface MiniWord {
  en: string;
  pos: string;
}

const EMPTY_SET = new Set<string>();

/** Orthographic "+s" — это не множественное число для этого существительного. */
const NOUN_SG_PLUS_S_EXCEPTIONS = new Set<string>([
  'new->news', // новость ≠ plural от «новый»
]);

function nounPairKey(a: string, b: string): string {
  return a < b ? `${a}->${b}` : `${b}->${a}`;
}

export function buildNeighborBlockMap(flat: readonly MiniWord[]): Map<string, Set<string>> {
  const nouns = flat.filter((w) => w.pos === 'nouns');
  const verbs = flat.filter((w) => w.pos === 'verbs' || w.pos === 'irregular_verbs');
  const nounByEn = new Map(nouns.map((w) => [w.en, w]));
  const verbByEn = new Map(verbs.map((w) => [w.en, w]));

  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };

  for (const w of nouns) {
    const cand = w.en + 's';
    const other = nounByEn.get(cand);
    if (!other || other.en === w.en) continue;
    const pk = nounPairKey(w.en, cand);
    if (NOUN_SG_PLUS_S_EXCEPTIONS.has(pk)) continue;
    link(w.en, cand);
  }

  for (const w of verbs) {
    const cand = w.en + 's';
    const other = verbByEn.get(cand);
    if (!other || other.en === w.en) continue;
    link(w.en, cand);
  }

  const irregular3sg: [string, string][] = [
    ['do', 'does'],
    ['go', 'goes'],
    ['have', 'has'],
  ];
  for (const [a, b] of irregular3sg) {
    if (verbByEn.has(a) && verbByEn.has(b)) link(a, b);
  }

  return adj;
}

let mapRef: Map<string, Set<string>> | null = null;

/** Вызывать после сборки плоского списка слов уроков (один раз). */
export function initWordNeighborBlocks(flat: readonly MiniWord[]): void {
  mapRef = buildNeighborBlockMap(flat);
}

/** Кого не показывать как неправильную кнопку рядом с correctEn (если такое слово есть в базе). */
export function blockedEnglishNeighbors(en: string): ReadonlySet<string> {
  return mapRef?.get(en) ?? EMPTY_SET;
}
