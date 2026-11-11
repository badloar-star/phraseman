export const LEGACY_PLURAL_WORD_COUNT_MERGES: Readonly<Record<string, string>> = Object.freeze({
  friends: 'friend',
  enemies: 'enemy',
  books: 'book',
  things: 'thing',
  dishes: 'dish',
  keys: 'key',
  letters: 'letter',
  strangers: 'stranger',
  ads: 'ad',
  details: 'detail',
  masks: 'mask',
  messages: 'message',
  rules: 'rule',
  secrets: 'secret',
  tickets: 'ticket',
  vegetables: 'vegetable',
  cards: 'card',
  mistakes: 'mistake',
  taxes: 'tax',
  groceries: 'grocery bag',
  guests: 'guest',
  bookings: 'booking',
  chargers: 'charger',
  documents: 'document',
  mondays: 'Monday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  saturdays: 'Saturday',
  sundays: 'Sunday',
  thursdays: 'Thursday',
  tuesdays: 'Tuesday',
  wednesdays: 'Wednesday',
  weekends: 'weekend',
  apples: 'apple',
  cafes: 'cafe',
  cars: 'car',
  desserts: 'dessert',
  magazines: 'magazine',
  mountains: 'mountain',
  pens: 'pen',
  pharmacies: 'pharmacy',
  photos: 'photo',
  places: 'place',
  printers: 'printer',
  questions: 'question',
  stars: 'star',
  students: 'student',
  tasks: 'task',
  towels: 'towel',
  trees: 'tree',
  windows: 'window',
  days: 'day',
  hours: 'hour',
  minutes: 'minute',
  plants: 'plant',
  shelves: 'shelf',
  shoes: 'shoe',
  suitcases: 'suitcase',
  bags: 'bag',
  fruits: 'fruit',
  words: 'word',
  armchairs: 'armchair',
  boots: 'boot',
  gloves: 'glove',
  batteries: 'battery',
  papers: 'paper',
  facts: 'fact',
  terms: 'term',
  people: 'person',
  children: 'child',
  builders: 'builder',
  conditions: 'condition',
  farmers: 'farmer',
  flowers: 'flower',
  gardeners: 'gardener',
  gifts: 'gift',
  panels: 'panel',
  gates: 'gate',
  berries: 'berry',
  watches: 'watch',
  blueprints: 'blueprint',
  lamps: 'lamp',
  newspapers: 'newspaper',
  stairs: 'stair step',
  sneakers: 'sneaker',
  boxes: 'box',
  bushes: 'bush',
  clouds: 'cloud',
  forests: 'forest',
  hills: 'hill',
  parks: 'park',
  tables: 'table',
  employees: 'employee',
  crumbs: 'crumb',
  bananas: 'banana',
  blankets: 'blanket',
  buildings: 'building',
  clocks: 'clock',
  cookies: 'cookie',
  curtains: 'curtain',
  drones: 'drone',
  knives: 'knife',
  licenses: 'license',
  maps: 'map',
  mice: 'mouse',
  nuts: 'nut',
  ribbons: 'ribbon',
  rings: 'ring',
  scarves: 'scarf',
  tomatoes: 'tomato',
  tools: 'tool',
  addresses: 'address',
  bottles: 'bottle',
  clients: 'client',
  coins: 'coin',
  colleagues: 'colleague',
  deals: 'deal',
  drops: 'drop',
  folders: 'folder',
  hands: 'hand',
  jackets: 'jacket',
  leaflets: 'leaflet',
  parcels: 'parcel',
  plates: 'plate',
  problems: 'problem',
  socks: 'sock',
  snacks: 'snack',
  grapes: 'grape',
  pears: 'pear',
  jewels: 'jewel',
  materials: 'material',
  eyes: 'eye',
});

export type LessonWordCounts = Record<string, number>;

export interface ParseLessonWordCountsOptions {
  lessonId: number;
  required: number;
  englishCompatibility: boolean;
  activeKeys: ReadonlySet<string>;
}

/**
 * Migrates an obsolete plural only when the active lesson unambiguously uses
 * its singular replacement. Current exact keys always win; reverse migration
 * would invent historical provenance after a destructive old rewrite.
 */
export function mergeLegacyPluralLessonWordCounts(
  counts: LessonWordCounts,
  activeKeys: ReadonlySet<string>,
): { counts: LessonWordCounts; dirty: boolean } {
  let dirty = false;
  const out = { ...counts };
  for (const [legacyPlural, canonical] of Object.entries(LEGACY_PLURAL_WORD_COUNT_MERGES)) {
    if (legacyPlural === canonical || out[legacyPlural] == null) continue;
    const pluralIsActive = activeKeys.has(legacyPlural);
    const canonicalIsActive = activeKeys.has(canonical);
    if (pluralIsActive || !canonicalIsActive) continue;
    const canonicalCount = Number(out[canonical]) || 0;
    const pluralCount = Number(out[legacyPlural]) || 0;
    out[canonical] = Math.max(canonicalCount, pluralCount);
    delete out[legacyPlural];
    dirty = true;
  }
  return { counts: dirty ? out : counts, dirty };
}

export function parseLessonWordCountsForBank(
  raw: string | null,
  options: ParseLessonWordCountsOptions,
): LessonWordCounts {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    let counts: LessonWordCounts = {};
    if (Array.isArray(data)) {
      data.forEach((word: string) => { counts[word] = options.required; });
    } else if (data && typeof data === 'object') {
      counts = data as LessonWordCounts;
    }
    if (options.englishCompatibility && options.lessonId === 1
      && Object.values(counts).some((count) => count >= options.required)) {
      for (const pronoun of ['I', 'you', 'he', 'she', 'we', 'it']) {
        if (!counts[pronoun] || counts[pronoun] < options.required) counts[pronoun] = options.required;
      }
    }
    return options.englishCompatibility
      ? mergeLegacyPluralLessonWordCounts(counts, options.activeKeys).counts
      : counts;
  } catch (error: unknown) {
    // зачем (правило владельца «никаких немых catch», сторож SILENT-CATCH 11.11): пустые счётчики слов выглядят как «прогресс пропал» —
    // причина обязана быть в журнале.
    console.warn('[LESSON-WORD-PROGRESS] counts:read_failed → пустые счётчики', error instanceof Error ? error.message : String(error));
    return {};
  }
}

export default function __LessonWordProgressCompatibilityRouteShim() {
  return null;
}
