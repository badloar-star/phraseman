/** Shared wire contract: no navigation target, branding or template-owned background. */
export const ANNOUNCEMENT_TEMPLATES = [
  "leaf",
  "editorial",
  "ribbons",
  "manifest",
  "cards",
  "margin",
  "focus",
  "steps",
  "mosaic",
  "tide",
] as const;
export type AnnouncementTemplate = (typeof ANNOUNCEMENT_TEMPLATES)[number];

// ── Шаблоны объявлений v1 (владелец 28.10 одобрил 36 кадров stories-announcements-v1; формат согласован с Сайтом) ──
// зачем: новые id идут в отдельное поле design — в templateId лежат старые 10 видов, и editorial / manifest / cards совпадают
// по имени. Старые сборки берут из ленты только известные им поля и показывают объявление по templateId, как раньше.
export const ANNOUNCEMENT_DESIGNS = [
  "manifest", "editorial", "quote", "list3", "qa", "number",
  "countdown", "date", "schedule", "soon", "today24",
  "lessons", "dialogs", "cards", "peak", "duels", "phrase", "mistakes", "video", "exam", "ai",
  "plus", "contest", "challenge", "invite",
  "thanks", "poll", "author",
  "newyear", "holiday", "birthday", "theme", "version",
  "maintenance", "feedback", "tip",
] as const;
export type AnnouncementDesign = (typeof ANNOUNCEMENT_DESIGNS)[number];
/** Арты assets/v2art (одни и те же файлы в тёмном и светлом). */
export const ANNOUNCEMENT_ARTS = [
  "lessons", "dialogs", "cards", "spire_tile", "phrase_of_day", "today", "mistakes_entry", "intro_friends", "intro_ai_dialog",
  "intro_cards_hub", "intro_training_blitz", "home_scene_welcome_back", "home_scene_exam_ready", "home_scene_newbie",
  "home_scene_day_done", "home_scene_all_done", "home_scene_continue", "home_scene_streak_risk", "home_scene_streak_lost",
  "home_scene_no_energy", "home_scene_offline", "cards_from_video", "continue", "dialogs_scene_limit",
] as const;
export type AnnouncementArt = (typeof ANNOUNCEMENT_ARTS)[number];
/** У каких design можно выбрать арт и какой арт у них по умолчанию (кадр берёт его, когда поля art нет). */
export const ANNOUNCEMENT_ART_DEFAULTS: Readonly<Partial<Record<AnnouncementDesign, AnnouncementArt>>> = {
  lessons: "lessons", dialogs: "dialogs", mistakes: "mistakes_entry", exam: "home_scene_exam_ready",
  ai: "intro_ai_dialog", holiday: "home_scene_all_done", maintenance: "dialogs_scene_limit", phrase: "phrase_of_day",
};
/** Кнопка действия — только из белого списка; подпись фиксирована по действию и переведена в приложении (свободного текста и ссылок нет). */
export const ANNOUNCEMENT_CTA_ACTIONS = [
  "open_plus", "share_invite", "use_theme", "open_lessons", "open_dialogs", "open_cards",
  "open_spire", "open_duels", "open_mistakes", "open_video", "open_exam", "open_ai",
] as const;
export type AnnouncementCtaAction = (typeof ANNOUNCEMENT_CTA_ACTIONS)[number];
export type AnnouncementCta = Readonly<{ action: AnnouncementCtaAction }>;
/** Опрос: варианты — блоки объявления, от 2 до 4. */
export const ANNOUNCEMENT_POLL_MIN_OPTIONS = 2;
export const ANNOUNCEMENT_POLL_MAX_OPTIONS = 4;

export type AnnouncementBlock = Readonly<{
  text: string;
  size: 14 | 16 | 20;
  style: "normal" | "accent" | "quote";
}>;
export type AnnouncementContent = Readonly<{
  templateId: AnnouncementTemplate;
  badge: string;
  title: string;
  blocks: readonly AnnouncementBlock[];
  titleSize: 28 | 34 | 40;
  align: "left" | "center";
  decoration: boolean;
  lifetime: number;
  unit: "hours" | "days";
  durationMs: 5000 | 8000 | 12000 | 15000;
  /** Шаблон v1 (36 кадров). Нет — старый вид по templateId. */
  design?: AnnouncementDesign;
  /** Дата события (только design = date): кадр рисует число, месяц и день недели на языке интерфейса. */
  eventAtMs?: number;
  /** Арт (только design из ANNOUNCEMENT_ART_DEFAULTS). */
  art?: AnnouncementArt;
  /** Ролик ленты «Видео» Главной (только design = video); нет — первый ролик ленты языка изучения. */
  videoId?: string;
  /** Кнопка действия (только вместе с design). */
  cta?: AnnouncementCta;
  /** Тема для образца и «Включить тему» (только design = theme). */
  themeId?: string;
}>;
export type PublishedAnnouncement = AnnouncementContent &
  Readonly<{
    id: string;
    revision: number;
    status: "published";
    publishedAtMs: number;
    expiresAtMs: number;
  }>;
const fields = new Set([
  "templateId",
  "badge",
  "title",
  "blocks",
  "titleSize",
  "align",
  "decoration",
  "lifetime",
  "unit",
  "durationMs",
  "design",
  "eventAtMs",
  "art",
  "videoId",
  "cta",
  "themeId",
]);
function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("invalid_content");
  return v as Record<string, unknown>;
}
function text(v: unknown, max: number): string {
  if (v === undefined) return "";
  if (typeof v !== "string" || v.length > max) throw new Error("text_too_long");
  return v.trim();
}
function member<T>(v: unknown, allowed: readonly T[]): T {
  if (!allowed.includes(v as T)) throw new Error("invalid_option");
  return v as T;
}
/** Только значения id без пробелов и знаков (ролик, тема). */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
/** Дата события: от 2020 до 2100 года (защита от мусора в поле). */
const EVENT_MIN_MS = 1577836800000;
const EVENT_MAX_MS = 4102444800000;

/**
 * Поля шаблона v1: каждое разрешено только своему design (иначе field_not_for_design), значения — из белых списков.
 * Пустые поля в результат не попадают — Firestore не принимает undefined.
 */
function designFields(
  v: Record<string, unknown>,
  blockCount: number,
): Pick<AnnouncementContent, "design" | "eventAtMs" | "art" | "videoId" | "cta" | "themeId"> {
  const design = v.design === undefined ? undefined : member(v.design, ANNOUNCEMENT_DESIGNS);
  const onlyFor = (key: string, ok: boolean) => {
    if (v[key] !== undefined && !ok) throw new Error("field_not_for_design");
  };
  onlyFor("eventAtMs", design === "date");
  onlyFor("art", design !== undefined && ANNOUNCEMENT_ART_DEFAULTS[design] !== undefined);
  onlyFor("videoId", design === "video");
  onlyFor("cta", design !== undefined);
  onlyFor("themeId", design === "theme");
  const out: {
    design?: AnnouncementDesign; eventAtMs?: number; art?: AnnouncementArt; videoId?: string; cta?: AnnouncementCta; themeId?: string;
  } = {};
  if (design === undefined) return out;
  out.design = design;
  if (v.eventAtMs !== undefined) {
    if (!Number.isSafeInteger(v.eventAtMs) || Number(v.eventAtMs) < EVENT_MIN_MS || Number(v.eventAtMs) > EVENT_MAX_MS)
      throw new Error("invalid_event_date");
    out.eventAtMs = Number(v.eventAtMs);
  }
  if (v.art !== undefined) out.art = member(v.art, ANNOUNCEMENT_ARTS);
  if (v.videoId !== undefined) {
    if (typeof v.videoId !== "string" || !SAFE_ID.test(v.videoId)) throw new Error("invalid_video");
    out.videoId = v.videoId;
  }
  if (v.cta !== undefined) {
    const c = record(v.cta);
    if (Object.keys(c).some((k) => k !== "action")) throw new Error("invalid_cta");
    out.cta = { action: member(c.action, ANNOUNCEMENT_CTA_ACTIONS) };
  }
  if (v.themeId !== undefined) {
    if (typeof v.themeId !== "string" || !SAFE_ID.test(v.themeId)) throw new Error("invalid_theme");
    out.themeId = v.themeId;
  }
  // зачем (макет «Опрос»: варианты = блоки): опрос без 2–4 вариантов не публикуется
  if (design === "poll" && (blockCount < ANNOUNCEMENT_POLL_MIN_OPTIONS || blockCount > ANNOUNCEMENT_POLL_MAX_OPTIONS))
    throw new Error("invalid_poll_options");
  return out;
}

export function normalizeAnnouncement(value: unknown): AnnouncementContent {
  const v = record(value);
  if (Object.keys(v).some((k) => !fields.has(k)))
    throw new Error("unknown_content_field");
  if (!Array.isArray(v.blocks) || v.blocks.length > 4)
    throw new Error("invalid_blocks");
  const blocks = v.blocks
    .map((value) => {
      const b = record(value);
      if (Object.keys(b).some((k) => !["text", "size", "style"].includes(k)))
        throw new Error("invalid_block");
      return {
        text: text(b.text, 260),
        size: member(b.size, [14, 16, 20] as const),
        style: member(b.style, ["normal", "accent", "quote"] as const),
      };
    })
    .filter((b) => b.text);
  const title = text(v.title, 110),
    badge = text(v.badge, 35);
  if (!title && !badge && !blocks.length) throw new Error("empty_story");
  if (
    !Number.isInteger(v.lifetime) ||
    Number(v.lifetime) < 1 ||
    Number(v.lifetime) > 365
  )
    throw new Error("invalid_lifetime");
  if (typeof v.decoration !== "boolean") throw new Error("invalid_decoration");
  return {
    ...designFields(v, blocks.length),
    templateId: member(v.templateId, ANNOUNCEMENT_TEMPLATES),
    title,
    badge,
    blocks,
    titleSize: member(v.titleSize, [28, 34, 40] as const),
    align: member(v.align, ["left", "center"] as const),
    decoration: v.decoration,
    lifetime: Number(v.lifetime),
    unit: member(v.unit, ["hours", "days"] as const),
    durationMs: member(v.durationMs, [5000, 8000, 12000, 15000] as const),
  };
}
export function announcementDuration(content: AnnouncementContent): number {
  return content.lifetime * (content.unit === "days" ? 86400000 : 3600000);
}
export function liveAnnouncements(
  rows: readonly unknown[],
  now: number,
): PublishedAnnouncement[] {
  const out: PublishedAnnouncement[] = [];
  for (const value of rows) {
    try {
      const v = record(value);
      if (
        v.status !== "published" ||
        typeof v.id !== "string" ||
        !/^[-a-zA-Z0-9_]{1,100}$/.test(v.id) ||
        !Number.isSafeInteger(v.revision) ||
        Number(v.revision) < 1 ||
        !Number.isFinite(v.publishedAtMs) ||
        !Number.isFinite(v.expiresAtMs) ||
        Number(v.publishedAtMs) > now ||
        Number(v.expiresAtMs) <= now ||
        Number(v.expiresAtMs) <= Number(v.publishedAtMs)
      )
        continue;
      const content = normalizeAnnouncement(
        Object.fromEntries([...fields].map((k) => [k, v[k]])),
      );
      out.push({
        ...content,
        id: v.id,
        revision: Number(v.revision),
        status: "published",
        publishedAtMs: Number(v.publishedAtMs),
        expiresAtMs: Number(v.expiresAtMs),
      });
    } catch (error) {
      // зачем: битое объявление пропускается (fail closed), но причина видна в журнале — без текста и идентификаторов
      console.warn("[STORY-ANNOUNCE] объявление отброшено как повреждённое", String(error));
    }
  }
  return out.sort((a, b) => a.publishedAtMs - b.publishedAtMs).slice(0, 20);
}
export function announcementSeenKey(
  a: Pick<PublishedAnnouncement, "id" | "revision">,
): string {
  return `announcement:${a.id}:${a.revision}`;
}

// ── Версия ленты историй (координатор 28.10: «метка версии ленты в уже читаемом конфиге — запрос только при новой истории») ──
// зачем: remote_config/app читается на каждом холодном старте и так. Сервер при публикации или снятии истории пишет туда
// numbers.story_feed_rev (в той же транзакции, что и лента; +1 запись на действие админа, 0 на людей), а лента отдаёт ту же версию.
// Совпала с версией копии на телефоне — ленту не запрашиваем. Поля нет (сервер ещё не выложен) — клиент работает по-старому.

/** Ключ версии ленты в remote_config/app.numbers. */
export const STORY_FEED_REV_CONFIG_KEY = "story_feed_rev";

/** Следующая версия ленты: не меньше времени изменения и строго больше прежней (монотонно даже при одинаковых мс). */
export function nextStoryFeedRev(previous: unknown, nowMs: number): number {
  const prev =
    typeof previous === "number" && Number.isFinite(previous) && previous > 0
      ? Math.floor(previous)
      : 0;
  return Math.max(Math.floor(nowMs), prev + 1);
}

/** Версия из документа ленты или из ответа; 0 — версии нет. */
export function storyFeedRevOf(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const rev = (value as Record<string, unknown>).rev;
  return typeof rev === "number" && Number.isFinite(rev) && rev > 0
    ? Math.floor(rev)
    : 0;
}

// ── Опрос объявления (координатор 28.10: по образцу «Опросов Главной v2») ──
// зачем (политика конфиденциальности: «we record only which questions your account has already answered … the option you choose is added
// only to aggregated counts and is not stored with your account ID»): документ голоса хранит только answered и userId (стабильный uid — по
// нему удаление аккаунта находит голос общим запросом по коллекциям 'votes'); вариант сразу +1 к счётчикам и нигде не сохраняется.
// Переголосовать нельзя: прежний вариант неизвестен — его нечем вычесть.

export const STORY_POLLS_COLLECTION = "story_polls";
export const STORY_POLL_VOTES_SUBCOLLECTION = "votes";

/** Документ опроса — один на ревизию объявления: правка вариантов не смешивает голоса. story_polls/{id}_{revision}. */
export function storyPollDocId(id: string, revision: number): string {
  return `${id}_${revision}`;
}

export type StoryPollVoteInput = Readonly<{ id: string; revision: number; option: number }>;

/** Вход голоса: id объявления, ревизия, номер варианта 0…3. Иначе invalid_vote. */
export function normalizeStoryPollVoteInput(data: unknown): StoryPollVoteInput {
  const v = record(data);
  if (
    typeof v.id !== "string" ||
    !/^[-a-zA-Z0-9_]{1,100}$/.test(v.id) ||
    !Number.isSafeInteger(v.revision) ||
    Number(v.revision) < 1 ||
    !Number.isInteger(v.option) ||
    Number(v.option) < 0 ||
    Number(v.option) >= ANNOUNCEMENT_POLL_MAX_OPTIONS
  )
    throw new Error("invalid_vote");
  return { id: v.id, revision: Number(v.revision), option: Number(v.option) };
}

/** Счётчики опроса по вариантам из документа ({ counts: { "0": n, … }, options: [...] }). */
export function storyPollCounts(poll: Readonly<Record<string, unknown>> | null): number[] {
  const options = Array.isArray(poll?.options) ? poll!.options.length : 0;
  const counts = poll?.counts && typeof poll.counts === "object" ? (poll.counts as Record<string, unknown>) : {};
  return Array.from({ length: options }, (_, i) => {
    const n = counts[String(i)];
    return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  });
}

export type StoryPollDecision =
  | Readonly<{ kind: "accept"; counts: number[]; voteCount: number }>
  | Readonly<{ kind: "already_answered"; counts: number[]; voteCount: number }>
  | Readonly<{ kind: "reject"; code: "not-found" | "failed-precondition" | "invalid-argument"; reason: "poll_not_found" | "poll_closed" | "invalid_option" }>;

const sumOf = (xs: readonly number[]): number => xs.reduce((a, n) => a + n, 0);

/** Решение по голосу: опроса нет / закрыт / вариант вне списка → отказ; уже отвечал → текущие счётчики; иначе +1 к варианту. */
export function decideStoryPollVote(args: Readonly<{
  poll: Readonly<Record<string, unknown>> | null;
  vote: Readonly<Record<string, unknown>> | null;
  input: StoryPollVoteInput;
  nowMs: number;
}>): StoryPollDecision {
  const { poll, vote, input, nowMs } = args;
  if (!poll) return { kind: "reject", code: "not-found", reason: "poll_not_found" };
  if (typeof poll.expiresAtMs !== "number" || poll.expiresAtMs <= nowMs)
    return { kind: "reject", code: "failed-precondition", reason: "poll_closed" };
  const counts = storyPollCounts(poll);
  if (input.option >= counts.length) return { kind: "reject", code: "invalid-argument", reason: "invalid_option" };
  if (vote?.answered === true) return { kind: "already_answered", counts, voteCount: sumOf(counts) };
  const next = counts.map((n, i) => (i === input.option ? n + 1 : n));
  return { kind: "accept", counts: next, voteCount: sumOf(next) };
}

/** Проценты из счётчиков: целые, в сумме ровно 100 (наибольший остаток); голосов нет — нули. */
export function storyPollPercents(counts: readonly number[]): number[] {
  const total = sumOf(counts);
  if (total <= 0) return counts.map(() => 0);
  const raw = counts.map((n) => (n * 100) / total);
  const out = raw.map(Math.floor);
  let rest = 100 - sumOf(out);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    out[i] += 1;
    rest -= 1;
  }
  return out;
}
