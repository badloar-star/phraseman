import {
  validateTournamentSemanticCandidate,
  type TournamentModeKind,
  type TournamentSemanticCandidate,
} from './tournament_semantic_contract';
import { validateEmbeddedFillGapCandidate } from './tournament_pool_v11_fill_gap';
import { validateEmbeddedGuessPhraseCandidate } from './tournament_pool_v11_guess_phrase';
import { validateEmbeddedOddityCandidate } from './tournament_pool_v11_oddity';

export type TournamentV11CellKey = `${TournamentModeKind}:${1 | 2 | 3}`;
export type TournamentV11CellQuotas = Readonly<Record<TournamentV11CellKey, number>>;

export const TOURNAMENT_V11_CELL_QUOTAS: TournamentV11CellQuotas = Object.freeze({
  'fill_gap:1': 160,
  'fill_gap:2': 180,
  'fill_gap:3': 160,
  'find_oddity:1': 110,
  'find_oddity:2': 205,
  'find_oddity:3': 0,
  'guess_phrase:1': 470,
  'guess_phrase:2': 554,
  'guess_phrase:3': 469,
  'speed_match:1': 60,
  'speed_match:2': 70,
  'speed_match:3': 62,
  'translate_build:1': 400,
  'translate_build:2': 700,
  'translate_build:3': 400,
});

export const TOURNAMENT_V11_REQUIRED_FILL_TRAP_TYPES = Object.freeze([
  'agreement',
  'government',
  'morphology',
] as const);

export type DiversityShortage = Readonly<{
  axis: 'cell' | 'fill_position' | 'fill_content_word' | 'fill_trap_type' | 'fill_manifest';
  key: string;
  required: number;
  available: number;
}>;

export type FillPositionCounts = Readonly<{ first: number; middle: number; last: number }>;

export type V11CandidateManifest = Readonly<{
  total: number;
  semanticSignatureCount: number;
  modeDifficultyCounts: TournamentV11CellQuotas;
  primaryProvenanceCounts: Readonly<Record<string, number>>;
  sourceDayCounts: Readonly<Record<string, number>>;
  topicCounts: Readonly<Record<string, number>>;
  grammarRuleCounts: Readonly<Record<string, number>>;
  oddityErrorTypeCounts: Readonly<Record<string, number>>;
  translateDecoyTypeCounts: Readonly<Record<string, number>>;
  speedPartOfSpeechCounts: Readonly<Record<string, number>>;
  speedSenseCounts: Readonly<Record<string, number>>;
  historicalExclusions: number;
  deterministicRejections: Readonly<Record<string, number>>;
  fill: Readonly<{
    total: number;
    contentWordCount: number;
    articleAndToBeCount: number;
    optionSetCounts: Readonly<Record<string, number>>;
    correctTokenCounts: Readonly<Record<string, number>>;
    positionCounts: FillPositionCounts;
    categoryCounts: Readonly<Record<string, number>>;
    trapTypeCounts: Readonly<Record<string, number>>;
    sourceDayCounts: Readonly<Record<string, number>>;
    topicCounts: Readonly<Record<string, number>>;
  }>;
}>;

export type TournamentV11Selection =
  | Readonly<{
    ok: true;
    selected: readonly TournamentSemanticCandidate[];
    manifest: V11CandidateManifest;
  }>
  | Readonly<{
    ok: false;
    shortages: readonly DiversityShortage[];
  }>;

const CELL_KEYS = Object.freeze(Object.keys(TOURNAMENT_V11_CELL_QUOTAS).sort() as TournamentV11CellKey[]);
const WORD = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu;
const ARTICLE_AND_BE = new Set(['a', 'an', 'the', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
const FILL_OPTION_SET_CAP = 10;
const FILL_CORRECT_TOKEN_CAP = 40;
const PRIMARY_PROVENANCE_CAP = 4;
const ALL_PROVENANCE_CAP = 24;
const FILL_ARTICLE_AND_BE_CAP = 75;
const FILL_POSITION_FLOOR = 75;
const FILL_CONTENT_WORD_FLOOR = 300;

export function validateTournamentV11DeterministicCandidate(
  candidate: TournamentSemanticCandidate,
): boolean {
  if (!validateTournamentSemanticCandidate(candidate).ok) return false;
  if (candidate.mode === 'fill_gap') return validateEmbeddedFillGapCandidate(candidate).ok;
  if (candidate.mode === 'guess_phrase') return validateEmbeddedGuessPhraseCandidate(candidate).ok;
  if (candidate.mode === 'find_oddity') return validateEmbeddedOddityCandidate(candidate).ok;
  return true;
}

type Position = keyof FillPositionCounts;
type CandidateFeatures = Readonly<{
  cell: TournamentV11CellKey;
  primaryProvenance: string;
  provenanceKeys: readonly string[];
  sourceDay: string;
  topic: string;
  grammarRule: string;
  correctToken: string;
  optionSet: string;
  position: Position | '';
  contentWord: boolean;
  articleAndBe: boolean;
  trapType: string;
}>;

type SelectionState = {
  readonly selected: TournamentSemanticCandidate[];
  readonly selectedIds: Set<string>;
  readonly signatures: Set<string>;
  readonly cell: Map<string, number>;
  readonly primary: Map<string, number>;
  readonly provenance: Map<string, number>;
  readonly sourceDay: Map<string, number>;
  readonly topic: Map<string, number>;
  readonly rule: Map<string, number>;
  readonly token: Map<string, number>;
  readonly optionSet: Map<string, number>;
  readonly fillPosition: Map<Position, number>;
  fillContentWords: number;
  fillArticleAndBe: number;
};

function normalized(value: unknown): string {
  return String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('en');
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function count(map: Map<string, number>, key: string): number {
  return map.get(key) ?? 0;
}

function sourceDayFor(candidate: TournamentSemanticCandidate): string {
  const parts = String(candidate.provenanceKeys[0] ?? '').split(':');
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : 'invalid:0';
}

function fillPosition(candidate: TournamentSemanticCandidate): Position | '' {
  if (candidate.mode !== 'fill_gap') return '';
  const slotIndex = Number(candidate.context.slotIndex);
  const sentence = String(candidate.context.authoredSentence ?? '');
  const tokenCount = [...sentence.matchAll(WORD)].length;
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= tokenCount) return '';
  if (slotIndex === 0) return 'first';
  if (slotIndex === tokenCount - 1) return 'last';
  return 'middle';
}

function correctTokenFor(candidate: TournamentSemanticCandidate): string {
  const contextValue = candidate.context.correctValue ?? candidate.context.decoySourceWord;
  if (typeof contextValue === 'string' && contextValue.trim()) return normalized(contextValue);
  const correct = candidate.reviewSubjects.find((subject) => subject.declaredRole === 'correct');
  return normalized(correct?.text ?? 'none');
}

function optionSetFor(candidate: TournamentSemanticCandidate): string {
  return candidate.reviewSubjects
    .filter((subject) => subject.kind === 'choice_option')
    .map((subject) => normalized(subject.text))
    .sort()
    .join('\u241f');
}

function featuresFor(candidate: TournamentSemanticCandidate): CandidateFeatures {
  const correctToken = correctTokenFor(candidate);
  const correct = candidate.reviewSubjects.find((subject) => subject.declaredRole === 'correct');
  const partOfSpeech = normalized(correct?.metadata?.partOfSpeech ?? '');
  const distractor = candidate.reviewSubjects.find((subject) => (
    subject.declaredRole === 'distractor' || subject.declaredRole === 'odd' || subject.declaredRole === 'decoy'
  ));
  const primaryProvenance = String(candidate.provenanceKeys[0] ?? 'missing');
  return Object.freeze({
    cell: `${candidate.mode}:${candidate.difficulty}`,
    primaryProvenance: `${candidate.mode}:${primaryProvenance}`,
    provenanceKeys: candidate.provenanceKeys,
    sourceDay: `${candidate.mode}:${sourceDayFor(candidate)}`,
    topic: `${candidate.mode}:${candidate.difficulty}:${normalized(candidate.context.topic ?? 'none') || 'none'}`,
    grammarRule: `${candidate.mode}:${candidate.difficulty}:${normalized(
      candidate.context.grammarRuleId ?? candidate.context.decoyRelationship ?? distractor?.trapType ?? 'none',
    )}`,
    correctToken: candidate.mode === 'fill_gap'
      ? `${candidate.mode}:${correctToken}`
      : `${candidate.mode}:${candidate.difficulty}:${correctToken}`,
    optionSet: `${candidate.mode}:${candidate.difficulty}:${optionSetFor(candidate) || candidate.semanticSignature}`,
    position: fillPosition(candidate),
    contentWord: candidate.mode === 'fill_gap'
      && partOfSpeech === 'verb'
      && !ARTICLE_AND_BE.has(correctToken),
    articleAndBe: candidate.mode === 'fill_gap' && ARTICLE_AND_BE.has(correctToken),
    trapType: normalized(distractor?.trapType ?? 'none'),
  });
}

function modeCap(candidate: TournamentSemanticCandidate, kind: 'day' | 'topic' | 'rule' | 'token' | 'option'): number {
  if (kind === 'day') return candidate.mode === 'speed_match' ? 1 : candidate.mode === 'find_oddity' ? 6 : 8;
  if (kind === 'topic') return candidate.mode === 'speed_match' ? 50 : 250;
  if (kind === 'rule') {
    if (candidate.mode === 'fill_gap') return 150;
    if (candidate.mode === 'find_oddity') return 150;
    if (candidate.mode === 'guess_phrase') return 400;
    return 1_000;
  }
  if (kind === 'token') {
    if (candidate.mode === 'fill_gap') return FILL_CORRECT_TOKEN_CAP;
    if (candidate.mode === 'speed_match') return 1_000;
    if (candidate.mode === 'guess_phrase') return 120;
    if (candidate.mode === 'find_oddity') return 80;
    return 100;
  }
  if (candidate.mode === 'fill_gap') return FILL_OPTION_SET_CAP;
  return 10;
}

function createState(): SelectionState {
  return {
    selected: [],
    selectedIds: new Set(),
    signatures: new Set(),
    cell: new Map(),
    primary: new Map(),
    provenance: new Map(),
    sourceDay: new Map(),
    topic: new Map(),
    rule: new Map(),
    token: new Map(),
    optionSet: new Map(),
    fillPosition: new Map(),
    fillContentWords: 0,
    fillArticleAndBe: 0,
  };
}

function canAdd(
  state: SelectionState,
  candidate: TournamentSemanticCandidate,
  features: CandidateFeatures,
  quotas: TournamentV11CellQuotas,
): boolean {
  if (state.selectedIds.has(candidate.candidateId) || state.signatures.has(candidate.semanticSignature)) return false;
  if (count(state.cell, features.cell) >= quotas[features.cell]) return false;
  if (count(state.primary, features.primaryProvenance) >= PRIMARY_PROVENANCE_CAP) return false;
  if (features.provenanceKeys.some((key) => count(state.provenance, key) >= ALL_PROVENANCE_CAP)) return false;
  if (count(state.sourceDay, features.sourceDay) >= modeCap(candidate, 'day')) return false;
  if (count(state.topic, features.topic) >= modeCap(candidate, 'topic')) return false;
  if (count(state.rule, features.grammarRule) >= modeCap(candidate, 'rule')) return false;
  if (count(state.token, features.correctToken) >= modeCap(candidate, 'token')) return false;
  if (count(state.optionSet, features.optionSet) >= modeCap(candidate, 'option')) return false;
  if (features.articleAndBe && state.fillArticleAndBe >= FILL_ARTICLE_AND_BE_CAP) return false;
  if (candidate.mode === 'fill_gap' && features.position === 'middle'
    && count(state.fillPosition as Map<string, number>, 'middle') >= 325) return false;
  return true;
}

function addCandidate(state: SelectionState, candidate: TournamentSemanticCandidate, features: CandidateFeatures): void {
  state.selected.push(candidate);
  state.selectedIds.add(candidate.candidateId);
  state.signatures.add(candidate.semanticSignature);
  increment(state.cell, features.cell);
  increment(state.primary, features.primaryProvenance);
  for (const key of features.provenanceKeys) increment(state.provenance, key);
  increment(state.sourceDay, features.sourceDay);
  increment(state.topic, features.topic);
  increment(state.rule, features.grammarRule);
  increment(state.token, features.correctToken);
  increment(state.optionSet, features.optionSet);
  if (candidate.mode === 'fill_gap') {
    if (features.position) increment(state.fillPosition as Map<string, number>, features.position);
    if (features.contentWord) state.fillContentWords += 1;
    if (features.articleAndBe) state.fillArticleAndBe += 1;
  }
}

function compareScore(
  left: readonly (number | string)[],
  right: readonly (number | string)[],
): number {
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === b) continue;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a) < String(b) ? -1 : 1;
  }
  return 0;
}

function pickBest(
  state: SelectionState,
  pool: readonly TournamentSemanticCandidate[],
  featureMap: ReadonlyMap<string, CandidateFeatures>,
  quotas: TournamentV11CellQuotas,
  predicate: (candidate: TournamentSemanticCandidate, features: CandidateFeatures) => boolean,
): boolean {
  let best: TournamentSemanticCandidate | null = null;
  let bestFeatures: CandidateFeatures | null = null;
  let bestScore: readonly (number | string)[] | null = null;
  for (const candidate of pool) {
    const features = featureMap.get(candidate.candidateId);
    if (!features || !predicate(candidate, features) || !canAdd(state, candidate, features, quotas)) continue;
    const score = [
      count(state.primary, features.primaryProvenance),
      count(state.sourceDay, features.sourceDay),
      count(state.rule, features.grammarRule),
      count(state.token, features.correctToken),
      count(state.optionSet, features.optionSet),
      count(state.topic, features.topic),
      candidate.candidateId,
    ] as const;
    if (!bestScore || compareScore(score, bestScore) < 0) {
      best = candidate;
      bestFeatures = features;
      bestScore = score;
    }
  }
  if (!best || !bestFeatures) return false;
  addCandidate(state, best, bestFeatures);
  return true;
}

function freezeCounts(map: Map<string, number>): Readonly<Record<string, number>> {
  return Object.freeze(Object.fromEntries([...map.entries()].sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  ))));
}

function incrementRecord(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function manifestFor(
  selected: readonly TournamentSemanticCandidate[],
  historicalExclusions: number,
  deterministicRejections: Readonly<Record<string, number>>,
): V11CandidateManifest {
  const cells: Record<string, number> = Object.fromEntries(CELL_KEYS.map((key) => [key, 0]));
  const primary = new Map<string, number>();
  const sourceDays = new Map<string, number>();
  const topics = new Map<string, number>();
  const rules = new Map<string, number>();
  const oddity: Record<string, number> = {};
  const translate: Record<string, number> = {};
  const speedPos: Record<string, number> = {};
  const speedSense: Record<string, number> = {};
  const fillOptions: Record<string, number> = {};
  const fillTokens: Record<string, number> = {};
  const fillTraps: Record<string, number> = {};
  const fillCategories: Record<string, number> = {};
  const fillDays: Record<string, number> = {};
  const fillTopics: Record<string, number> = {};
  const positions: Record<Position, number> = { first: 0, middle: 0, last: 0 };
  let contentWordCount = 0;
  let articleAndToBeCount = 0;
  let fillTotal = 0;
  for (const candidate of selected) {
    const features = featuresFor(candidate);
    cells[features.cell] += 1;
    increment(primary, features.primaryProvenance);
    increment(sourceDays, features.sourceDay);
    increment(topics, features.topic);
    increment(rules, features.grammarRule);
    if (candidate.mode === 'fill_gap') {
      fillTotal += 1;
      if (features.contentWord) contentWordCount += 1;
      if (features.articleAndBe) articleAndToBeCount += 1;
      if (features.position) positions[features.position] += 1;
      incrementRecord(fillOptions, features.optionSet);
      incrementRecord(fillTokens, features.correctToken);
      incrementRecord(fillTraps, features.trapType);
      incrementRecord(fillCategories, features.grammarRule);
      incrementRecord(fillDays, features.sourceDay);
      incrementRecord(fillTopics, features.topic);
    } else if (candidate.mode === 'find_oddity') {
      incrementRecord(oddity, normalized(candidate.context.grammarRuleId ?? 'none'));
    } else if (candidate.mode === 'translate_build') {
      incrementRecord(translate, normalized(candidate.context.decoyRelationship ?? 'none'));
    } else if (candidate.mode === 'speed_match') {
      for (const subject of candidate.reviewSubjects) {
        incrementRecord(speedPos, normalized(subject.metadata?.partOfSpeech ?? 'none'));
        incrementRecord(speedSense, normalized(subject.metadata?.senseHint ?? 'none'));
      }
    }
  }
  return Object.freeze({
    total: selected.length,
    semanticSignatureCount: new Set(selected.map((candidate) => candidate.semanticSignature)).size,
    modeDifficultyCounts: Object.freeze(cells) as TournamentV11CellQuotas,
    primaryProvenanceCounts: freezeCounts(primary),
    sourceDayCounts: freezeCounts(sourceDays),
    topicCounts: freezeCounts(topics),
    grammarRuleCounts: freezeCounts(rules),
    oddityErrorTypeCounts: Object.freeze(oddity),
    translateDecoyTypeCounts: Object.freeze(translate),
    speedPartOfSpeechCounts: Object.freeze(speedPos),
    speedSenseCounts: Object.freeze(speedSense),
    historicalExclusions,
    deterministicRejections: Object.freeze({ ...deterministicRejections }),
    fill: Object.freeze({
      total: fillTotal,
      contentWordCount,
      articleAndToBeCount,
      optionSetCounts: Object.freeze(fillOptions),
      correctTokenCounts: Object.freeze(fillTokens),
      positionCounts: Object.freeze(positions),
      categoryCounts: Object.freeze(fillCategories),
      trapTypeCounts: Object.freeze(fillTraps),
      sourceDayCounts: Object.freeze(fillDays),
      topicCounts: Object.freeze(fillTopics),
    }),
  });
}

export function selectTournamentV11Candidates(input: Readonly<{
  candidates: readonly TournamentSemanticCandidate[];
  quotas?: TournamentV11CellQuotas;
  historicalExclusions?: number;
  deterministicRejections?: Readonly<Record<string, number>>;
}>): TournamentV11Selection {
  const quotas = input.quotas ?? TOURNAMENT_V11_CELL_QUOTAS;
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const candidates = [...(input.candidates ?? [])]
    .filter((candidate) => {
      if (!validateTournamentV11DeterministicCandidate(candidate)
        || !Object.prototype.hasOwnProperty.call(quotas, `${candidate.mode}:${candidate.difficulty}`)
        || seenIds.has(candidate.candidateId)
        || seenSignatures.has(candidate.semanticSignature)) return false;
      seenIds.add(candidate.candidateId);
      seenSignatures.add(candidate.semanticSignature);
      return true;
    })
    .sort((left, right) => (left.candidateId < right.candidateId ? -1 : left.candidateId > right.candidateId ? 1 : 0));
  const rawCounts = new Map<string, number>();
  for (const candidate of candidates) increment(rawCounts, `${candidate.mode}:${candidate.difficulty}`);
  const rawShortages = CELL_KEYS
    .filter((key) => count(rawCounts, key) < quotas[key])
    .map((key): DiversityShortage => Object.freeze({
      axis: 'cell', key, required: quotas[key], available: count(rawCounts, key),
    }));
  if (rawShortages.length) return Object.freeze({ ok: false, shortages: Object.freeze(rawShortages) });

  const state = createState();
  const featureMap = new Map(candidates.map((candidate) => [candidate.candidateId, featuresFor(candidate)]));
  const fillPool = candidates.filter((candidate) => candidate.mode === 'fill_gap');
  const enforceFullFill = CELL_KEYS
    .filter((key) => key.startsWith('fill_gap:'))
    .reduce((sum, key) => sum + quotas[key], 0) >= 500;
  const fillTrapTypes = enforceFullFill
    ? TOURNAMENT_V11_REQUIRED_FILL_TRAP_TYPES
    : Object.freeze([] as const);
  if (enforceFullFill) {
    while (pickBest(state, fillPool, featureMap, quotas, (_candidate, features) => (
      features.cell === 'fill_gap:3' && features.position === 'last'
    ))) {
      // D3 has no safe sentence-initial grammar slots in the authored corpus.
      // Reserve every diverse last-position candidate before the global middle cap is consumed.
    }
    for (const trapType of fillTrapTypes) {
      pickBest(state, fillPool, featureMap, quotas, (_candidate, features) => features.trapType === trapType);
    }
    for (const position of ['first', 'last', 'middle'] as const) {
      while (count(state.fillPosition as Map<string, number>, position) < FILL_POSITION_FLOOR) {
        if (!pickBest(state, fillPool, featureMap, quotas, (_candidate, features) => features.position === position)) break;
      }
    }
    while (state.fillContentWords < FILL_CONTENT_WORD_FLOOR) {
      if (!pickBest(state, fillPool, featureMap, quotas, (_candidate, features) => features.contentWord)) break;
    }
  }
  for (const cell of CELL_KEYS.filter((key) => key.startsWith('fill_gap:'))) {
    while (count(state.cell, cell) < quotas[cell]) {
      if (!pickBest(state, fillPool, featureMap, quotas, (_candidate, features) => features.cell === cell)) break;
    }
  }
  for (const cell of CELL_KEYS.filter((key) => !key.startsWith('fill_gap:'))) {
    const cellPool = candidates.filter((candidate) => `${candidate.mode}:${candidate.difficulty}` === cell);
    while (count(state.cell, cell) < quotas[cell]) {
      if (!pickBest(state, cellPool, featureMap, quotas, () => true)) break;
    }
  }

  const manifest = manifestFor(
    state.selected,
    Math.max(0, Math.trunc(input.historicalExclusions ?? 0)),
    input.deterministicRejections ?? {},
  );
  const shortages: DiversityShortage[] = [];
  for (const key of CELL_KEYS) {
    if (manifest.modeDifficultyCounts[key] !== quotas[key]) shortages.push(Object.freeze({
      axis: 'cell', key, required: quotas[key], available: manifest.modeDifficultyCounts[key],
    }));
  }
  if (enforceFullFill) {
    for (const position of ['first', 'middle', 'last'] as const) {
      if (manifest.fill.positionCounts[position] < FILL_POSITION_FLOOR) shortages.push(Object.freeze({
        axis: 'fill_position', key: position, required: FILL_POSITION_FLOOR,
        available: manifest.fill.positionCounts[position],
      }));
    }
    if (manifest.fill.contentWordCount < FILL_CONTENT_WORD_FLOOR) shortages.push(Object.freeze({
      axis: 'fill_content_word', key: 'content_word', required: FILL_CONTENT_WORD_FLOOR,
      available: manifest.fill.contentWordCount,
    }));
    for (const trapType of fillTrapTypes) {
      if (!(manifest.fill.trapTypeCounts[trapType] > 0)) shortages.push(Object.freeze({
        axis: 'fill_trap_type', key: trapType, required: 1, available: 0,
      }));
    }
    if (manifest.fill.positionCounts.middle > 325) shortages.push(Object.freeze({
      axis: 'fill_manifest', key: 'middle_max', required: 325,
      available: manifest.fill.positionCounts.middle,
    }));
  }
  if (shortages.length) return Object.freeze({ ok: false, shortages: Object.freeze(shortages) });
  const selected = Object.freeze([...state.selected].sort((left, right) => {
    const leftCell = `${left.mode}:${left.difficulty}`;
    const rightCell = `${right.mode}:${right.difficulty}`;
    return leftCell < rightCell ? -1 : leftCell > rightCell ? 1
      : left.candidateId < right.candidateId ? -1 : left.candidateId > right.candidateId ? 1 : 0;
  }));
  return Object.freeze({ ok: true, selected, manifest });
}
