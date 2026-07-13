const VIDEO_HANDOFF_TTL_MS = 60_000;

export interface LingmanVideoHandoff {
  readonly videoId: string;
  readonly channelId: string;
  readonly title: string;
}

interface StoredHandoff extends LingmanVideoHandoff {
  readonly expiresAtMs: number;
}

let slot: StoredHandoff | null = null;

function validIdentifier(value: string, maxLength = 120): boolean {
  return value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && /[A-Za-z0-9]/.test(value)
    && /^[A-Za-z0-9._:-]+$/.test(value);
}

function normalizeTitle(value: string): string | null {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const codePoints = Array.from(normalized);
  if (!codePoints.length || codePoints.some(character => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint >= 0xD800 && codePoint <= 0xDFFF;
  })) return null;
  return codePoints.slice(0, 100).join('');
}

export function setLingmanVideoHandoff(handoff: LingmanVideoHandoff, nowMs = Date.now()): boolean {
  const title = normalizeTitle(handoff.title);
  if (!validIdentifier(handoff.videoId) || !validIdentifier(handoff.channelId) || !title) return false;
  slot = Object.freeze({
    videoId: handoff.videoId,
    channelId: handoff.channelId,
    title,
    expiresAtMs: nowMs + VIDEO_HANDOFF_TTL_MS,
  });
  return true;
}

export function peekLingmanVideoHandoff(videoId: string | null, nowMs = Date.now()): LingmanVideoHandoff | null {
  if (!slot || slot.expiresAtMs < nowMs) {
    slot = null;
    return null;
  }
  if (!videoId || slot.videoId !== videoId) return null;
  return Object.freeze({ videoId: slot.videoId, channelId: slot.channelId, title: slot.title });
}

export function clearLingmanVideoTitleHandoff(): void {
  slot = null;
}

export default function __RouteShim() { return null; }
