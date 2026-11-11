// ═══════════════════════════════════════════════════════════════════════════
// story_events_core.ts — чистая логика «историй» Главной (D192, владелец 14.10).
//
// зачем: у аватарки на Главной кольцо, как история в Instagram, когда есть хоть одно непросмотренное событие.
// Событие — реальный факт о человеке: итог недели в Шпиле, рубеж серии, ранг монеты, ачивка или открытая владельцем тема.
// docs/design/v2-app/stories-avatar.html (s1/s3) задаёт механику кольца; новый слайд темы одобрен владельцем в этой задаче.
// Здесь только правила списка: ключ повтора, срок жизни 7 дней, не больше 20 событий, «просмотрено».
// Без React Native и без хранилища — чтобы правила проверялись тестом напрямую.
// ═══════════════════════════════════════════════════════════════════════════

export const STORY_EVENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const STORY_EVENT_LIMIT = 20;

export type StoryEventType = 'spire_week' | 'streak_milestone' | 'coin_rank_up' | 'achievement' | 'theme_unlock' | 'announcement' | 'contest_winner' | 'referral_ladder' | 'home_activity' | 'instead' | 'dialog_done' | 'week_recap' | 'plus_offer'; // Projection and Home activity stories stay out of the persistent journal.

export type StoryEventPayload = Readonly<Record<string, string | number | boolean>>;

export type StoryEvent = Readonly<{
  /** Ключ повтора: один и тот же факт даёт один и тот же id. */
  id: string;
  type: StoryEventType;
  payload: StoryEventPayload;
  atMs: number;
  seen: boolean;
}>;

export type StoryEventList = readonly StoryEvent[];

export type StoryAddDecision =
  | Readonly<{ added: true; list: StoryEventList; event: StoryEvent; evicted: number }>
  | Readonly<{ added: false; list: StoryEventList; reason: 'duplicate' | 'expired' | 'invalid' }>;

const STORY_TYPES: ReadonlySet<string> = new Set<StoryEventType>([
  'spire_week', 'streak_milestone', 'coin_rank_up', 'achievement', 'theme_unlock', 'announcement',
  // instead — кадры «истории вместо окон» (владелец 11.11): факт, который раньше всплывал окном, лежит в журнале историй
  'instead',
  // dialog_done — диалог с ИИ засчитан пройденным (владелец 11.11: «заводи события недели и диалога»); кадр «Диалог пройден» у него уже был
  'dialog_done',
  // week_recap — «Твоя неделя» участника Пика: активность с телефона + монеты недели Пика (владелец 11.11: «Монеты Пика»)
  'week_recap',
]);

function part(payload: StoryEventPayload, name: string): string {
  const value = payload[name];
  return value === undefined ? '' : String(value);
}

/**
 * Ключ повтора. зачем: источники зовут запись при каждом совпадении факта (итог недели читается из кэша на каждом входе,
 * ачивка может проверяться повторно) — один факт обязан давать одну историю.
 */
export function storyEventKey(type: StoryEventType, payload: StoryEventPayload): string {
  switch (type) {
    case 'announcement': return `announcement:${part(payload, 'id')}:${part(payload, 'revision')}`;
    case 'spire_week': return `spire_week:${part(payload, 'weekId')}:${part(payload, 'lang')}`;
    // День в ключе: серия может оборваться и снова дойти до того же рубежа — это новый факт.
    case 'streak_milestone': return `streak_milestone:${part(payload, 'days')}:${part(payload, 'dayKey')}`;
    case 'coin_rank_up': return `coin_rank_up:${part(payload, 'toRank')}`;
    case 'achievement': return `achievement:${part(payload, 'achievementId')}`;
    case 'theme_unlock': return `theme_unlock:${part(payload, 'themeId')}`;
    // День в ключе: тот же сценарий, пройденный в другой день, — новый факт; повтор в тот же день второй истории не даёт.
    // Понедельник недели в ключе: одна история на неделю, сколько бы раз ни пришёл итог Пика.
    case 'week_recap': { const start = part(payload, 'startDayKey'); return start ? `week_recap:${start}` : ''; }
    case 'dialog_done': {
      const scenarioId = part(payload, 'scenarioId');
      const dayKey = part(payload, 'dayKey');
      return scenarioId && dayKey ? `dialog_done:${scenarioId}:${dayKey}` : '';
    }
    // зачем (истории вместо окон, 11.11): вид и ключ повтора лежат в данных события — «С возвращением» раз в день, «Хватает на ранг» раз на ранг;
    // без вида или ключа событие негодно (пустой id → запись отклоняется)
    case 'instead': {
      const kind = part(payload, 'kind');
      const key = part(payload, 'key');
      return kind && key ? `instead:${kind}:${key}` : '';
    }
    default: return '';
  }
}

export function isStoryEventLive(event: StoryEvent, nowMs: number): boolean {
  if(event.type==='announcement')return Number.isFinite(event.payload.expiresAtMs)&&event.atMs<=nowMs&&Number(event.payload.expiresAtMs)>nowMs;
  return nowMs - event.atMs < STORY_EVENT_TTL_MS && event.atMs - nowMs < STORY_EVENT_TTL_MS;
}

/** Убрать истёкшие и оставить 20 самых свежих, новые первыми. */
export function pruneStoryEvents(list: StoryEventList, nowMs: number): StoryEventList {
  return Object.freeze(
    list.filter((event) => isStoryEventLive(event, nowMs))
      .slice()
      .sort((a, b) => b.atMs - a.atMs)
      .slice(0, STORY_EVENT_LIMIT),
  );
}

export function addStoryEvent(
  list: StoryEventList,
  input: Readonly<{ type: StoryEventType; payload: StoryEventPayload; atMs: number; seen?: boolean }>,
  nowMs: number,
): StoryAddDecision {
  const live = pruneStoryEvents(list, nowMs);
  if (!STORY_TYPES.has(input.type) || !Number.isFinite(input.atMs)) return { added: false, list: live, reason: 'invalid' };
  const id = storyEventKey(input.type, input.payload);
  if (!id) return { added: false, list: live, reason: 'invalid' };
  if (!isStoryEventLive({ id, type: input.type, payload: input.payload, atMs: input.atMs, seen: false }, nowMs)) {
    return { added: false, list: live, reason: 'expired' };
  }
  // Повтор ищем и среди просмотренных: просмотренный факт не должен вернуться непросмотренным.
  if (live.some((event) => event.id === id)) return { added: false, list: live, reason: 'duplicate' };
  const event: StoryEvent = Object.freeze({ id, type: input.type, payload: Object.freeze({ ...input.payload }), atMs: input.atMs, seen: input.seen === true });
  const next = pruneStoryEvents([event, ...live], nowMs);
  return { added: true, list: next, event, evicted: live.length + 1 - next.length };
}

export function markStorySeen(list: StoryEventList, id: string): Readonly<{ changed: boolean; list: StoryEventList }> {
  let changed = false;
  const next = list.map((event) => {
    if (event.id !== id || event.seen) return event;
    changed = true;
    return Object.freeze({ ...event, seen: true });
  });
  return { changed, list: changed ? Object.freeze(next) : list };
}

export function unseenStories(list: StoryEventList, nowMs: number): StoryEventList {
  return Object.freeze(pruneStoryEvents(list, nowMs).filter((event) => !event.seen));
}

/**
 * Недавние (координатор 14.10): тап по аватару БЕЗ кольца открывает уже просмотренные истории за 7 дней, как в Instagram;
 * порядок тот же — по времени события, от старого к новому. Пусто → тап ведёт туда, куда сейчас.
 */
export function storyRecentQueue(list: StoryEventList): StoryEventList {
  return Object.freeze(list.slice().sort((a, b) => a.atMs - b.atMs));
}

/** Очередь просмотра по образцу s2/s3: непросмотренные «по времени события» — от старого к новому. */
export function storyPlaybackQueue(list: StoryEventList): StoryEventList {
  return Object.freeze(list.filter((event) => !event.seen).slice().sort((a, b) => a.atMs - b.atMs));
}

/** Разбор сохранённого списка: битые строки отбрасываются, а не роняют Главную. */
export function parseStoryEvents(raw: string | null): StoryEventList {
  if (!raw) return Object.freeze([]);
  const parsed: unknown = JSON.parse(raw);
  const rows = (parsed as { events?: unknown })?.events;
  if (!Array.isArray(rows)) return Object.freeze([]);
  const out: StoryEvent[] = [];
  for (const row of rows) {
    const r = row as Partial<StoryEvent> | null;
    if (!r || typeof r.id !== 'string' || typeof r.type !== 'string' || !STORY_TYPES.has(r.type)) continue;
    if (typeof r.atMs !== 'number' || !Number.isFinite(r.atMs) || typeof r.payload !== 'object' || r.payload === null) continue;
    out.push(Object.freeze({ id: r.id, type: r.type as StoryEventType, payload: Object.freeze({ ...r.payload }), atMs: r.atMs, seen: r.seen === true }));
  }
  return Object.freeze(out);
}

export function serializeStoryEvents(list: StoryEventList): string {
  return JSON.stringify({ v: 1, events: list });
}

export function isStoryAvailable(event: StoryEvent, liveAnnouncements?: readonly string[], liveHomeStoryIds?: readonly string[]): boolean {
  if (event.type === 'announcement' && liveAnnouncements) return liveAnnouncements.includes(event.id);
  if (event.type === 'home_activity' && liveHomeStoryIds) return liveHomeStoryIds.includes(event.id);
  return true;
}

export function nextLiveStoryIndex(events: StoryEventList, target: number, current: number, liveAnnouncements?: readonly string[], liveHomeStoryIds?: readonly string[]): number {
  let index = Math.max(0, target);
  const direction = target < current ? -1 : 1;
  while (index >= 0 && index < events.length && !isStoryAvailable(events[index], liveAnnouncements, liveHomeStoryIds)) {
    index += direction;
  }
  return index;
}
