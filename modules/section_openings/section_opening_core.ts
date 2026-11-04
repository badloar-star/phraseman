// section_opening_core.ts — праздничные окна «Открытие разделов»: чистые правила (без сети, без памяти, без React).
//
// зачем (владелец одобрил на макете 26 состояний; координатор 04.11): когда новому пользователю открывается раздел по рангу (видео, диалоги,
// Пик, карточки) или Plus — показываем ОДНО окно на раздел, один раз. Старые пользователи не получают поток окон за уже открытое:
// при первом запуске с функцией всё открытое молча помечается «показано». Здесь — решения; хранение и показ — рядом (store, host).

/** Окна макета: 5 разделов + «Ранг 1» (видео → диалоги). Порядок = порядок показа. */
export const SECTION_OPENING_IDS = ['rank', 'video', 'dialogs', 'peak', 'cards', 'plus'] as const;
export type SectionOpeningId = (typeof SECTION_OPENING_IDS)[number];

/** Фазы макета (якоря 15 / 43 / 60 / 100 % времени церемонии). */
export const SECTION_OPENING_PHASES = ['anticipation', 'reveal', 'celebrate', 'cta'] as const;
export type SectionOpeningPhase = (typeof SECTION_OPENING_PHASES)[number];
export const SECTION_OPENING_PHASE_ANCHORS: Readonly<Record<SectionOpeningPhase, number>> = { anticipation: 0.15, reveal: 0.43, celebrate: 0.6, cta: 1 };
/** 20 кадров фаз + «Ранг 1» + 5 «уменьшенное движение» = 26 состояний макета (COVERAGE.md). */
export const SECTION_OPENING_STATE_COUNT = SECTION_OPENING_IDS.filter((id) => id !== 'rank').length * SECTION_OPENING_PHASES.length + 1 + 5;

/** Поверхности доступа по рангу (shared/rank_access_contract) → окно. */
export type SectionOpeningSurface = 'video' | 'dialogues' | 'peak' | 'cards_hub';
export const SECTION_OPENING_SURFACES: readonly SectionOpeningSurface[] = ['video', 'dialogues', 'peak', 'cards_hub'];
export const SURFACE_TO_OPENING: Readonly<Record<SectionOpeningSurface, SectionOpeningId>> = {
  video: 'video', dialogues: 'dialogs', peak: 'peak', cards_hub: 'cards',
};

/** Куда ведёт «CTA» окна (те же маршруты, что у плиток Главной). rank и plus только закрывают окно. */
export const SECTION_OPENING_ROUTES: Readonly<Record<SectionOpeningId, string | null>> = {
  rank: null,
  video: '/flashcards_video_packs',
  dialogs: '/ai_dialog_home',
  peak: '/(tabs)/community?section=spire',
  cards: '/flashcards',
  plus: null,
};

/** Отметки владельца: какие окна уже показаны и был ли первый запуск с функцией (seeded). */
export type SectionOpeningMarks = Readonly<{ seeded: boolean; seen: readonly SectionOpeningId[] }>;
export const EMPTY_MARKS: SectionOpeningMarks = Object.freeze({ seeded: false, seen: Object.freeze([]) });


export function parseMarks(raw: string | null): SectionOpeningMarks | null {
  if (raw === null || raw === '') return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { v, seeded, seen } = value as { v?: unknown; seeded?: unknown; seen?: unknown };
    if (v !== 1 || typeof seeded !== 'boolean' || !Array.isArray(seen)) return null;
    return { seeded, seen: SECTION_OPENING_IDS.filter((id) => (seen as unknown[]).includes(id)) };
  } catch (error) {
    console.warn("[SECTION-OPENING] marks_parse_failed — считаем, что отметок нет", error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
    return null; // зачем: битая отметка = нет отметки
  }
}
export const serializeMarks = (marks: SectionOpeningMarks): string => JSON.stringify({ v: 1, seeded: marks.seeded, seen: marks.seen });

/** Что доступно прямо сейчас (по решениям useRankAccess и статусу Plus). */
export type SectionOpeningFacts = Readonly<{
  /** Все четыре решения и статус Plus известны (ничего не pending) — иначе решать рано. */
  resolved: boolean;
  /** «Новый» пользователь ранговых гейтов (readRankGateUserVerdict.isNew); неизвестно = не новый. */
  isNew: boolean;
  /** Поверхности, ставшие доступными (decision.status === 'allowed'). */
  open: readonly SectionOpeningSurface[];
  plusActive: boolean;
}>;

export type SectionOpeningDecision = Readonly<{
  /** Что записать в отметки (null — менять нечего). */
  nextMarks: SectionOpeningMarks | null;
  /** Окна к показу по порядку (без уже показанных). */
  queue: readonly SectionOpeningId[];
  reason: string;
}>;

const ordered = (ids: Iterable<SectionOpeningId>): SectionOpeningId[] => {
  const set = new Set(ids);
  return SECTION_OPENING_IDS.filter((id) => set.has(id));
};

/** Окна, которые «уже заслужены» при таких фактах: раздел открыт → окно раздела; видео/диалоги → «Ранг»; Plus → одно окно «Plus». */
export function deservedOpenings(facts: Pick<SectionOpeningFacts, 'open' | 'plusActive'>): SectionOpeningId[] {
  // зачем (макет «Plus»): Plus открывает всё сразу — показываем одно окно «Больше способов учиться», а не пять подряд
  if (facts.plusActive) return ['plus'];
  const ids = new Set<SectionOpeningId>(facts.open.map((surface) => SURFACE_TO_OPENING[surface]));
  if (ids.has('video') || ids.has('dialogs')) ids.add('rank');
  return ordered(ids);
}

export function decideSectionOpenings(marks: SectionOpeningMarks, facts: SectionOpeningFacts): SectionOpeningDecision {
  if (!facts.resolved) return { nextMarks: null, queue: [], reason: 'not_resolved' };
  const deserved = deservedOpenings(facts);
  if (!marks.seeded) {
    // зачем (координатор 04.11): старый или неизвестный пользователь — молча «показано» на всё уже открытое, потока окон нет.
    // Новый — отметка «был первый запуск», окна за уже открытое (редкий случай: ранг уже есть) показываем.
    if (!facts.isNew) {
      const all = ordered([...marks.seen, ...deserved, ...(facts.plusActive ? SECTION_OPENING_IDS : [])]);
      return { nextMarks: { seeded: true, seen: all }, queue: [], reason: 'seeded_silently_not_new' };
    }
    const queue = deserved.filter((id) => !marks.seen.includes(id));
    return { nextMarks: { seeded: true, seen: marks.seen }, queue, reason: 'seeded_new_user' };
  }
  // Plus показан/открыт — окна разделов, которые он открыл, считаем показанными (иначе после окна Plus пришли бы ещё четыре)
  const queue = deserved.filter((id) => !marks.seen.includes(id));
  return { nextMarks: null, queue, reason: queue.length > 0 ? 'queued' : 'nothing_new' };
}

/** Отметка «показано» (одна на окно). При показе Plus заодно помечаются окна разделов — Plus открыл их все. */
export function markShown(marks: SectionOpeningMarks, id: SectionOpeningId): SectionOpeningMarks {
  const add: SectionOpeningId[] = id === 'plus' ? [...SECTION_OPENING_IDS] : [id];
  return { seeded: true, seen: ordered([...marks.seen, ...add]) };
}
