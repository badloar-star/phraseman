const TITLE_HANDOFF_TTL_MS = 60_000;

interface TitleHandoff {
  videoId: string;
  title: string;
  expiresAtMs: number;
}

let slot: TitleHandoff | null = null;

function validVideoId(value: string): boolean {
  return value.length > 0 && value.length <= 120 && /^[A-Za-z0-9_-]+$/.test(value);
}

export function setLingmanVideoTitleHandoff(videoId: string, title: string, nowMs = Date.now()): boolean {
  const normalizedTitle = title.trim();
  if (!validVideoId(videoId) || !normalizedTitle) return false;
  slot = { videoId, title: normalizedTitle, expiresAtMs: nowMs + TITLE_HANDOFF_TTL_MS };
  return true;
}

export function consumeLingmanVideoTitle(videoId: string | null, nowMs = Date.now()): string | null {
  if (!slot || !videoId || slot.videoId !== videoId) return null;
  const current = slot;
  slot = null;
  return current.expiresAtMs >= nowMs ? current.title : null;
}

export function clearLingmanVideoTitleHandoff(): void {
  slot = null;
}

export default function __RouteShim() { return null; }
