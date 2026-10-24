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
    } catch {
      /* Fail closed on malformed remote content. */
    }
  }
  return out.sort((a, b) => a.publishedAtMs - b.publishedAtMs).slice(0, 20);
}
export function announcementSeenKey(
  a: Pick<PublishedAnnouncement, "id" | "revision">,
): string {
  return `announcement:${a.id}:${a.revision}`;
}
