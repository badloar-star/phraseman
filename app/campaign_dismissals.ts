import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'campaign_dismissals_v1';
const MAX_STORED = 200;

type DismissalMap = Record<string, number>;

function hashString(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function normalizePart(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function campaignDismissalKey(scope: string, campaignId: string, fallbackFingerprint = ''): string {
  const cleanScope = normalizePart(scope) || 'campaign';
  const cleanId = normalizePart(campaignId);
  if (cleanId) return `${cleanScope}:${cleanId}`;
  return `${cleanScope}:legacy:${hashString(fallbackFingerprint || 'default')}`;
}

async function readMap(): Promise<DismissalMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: DismissalMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === 'string' && typeof value === 'number' && Number.isFinite(value)) {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function writeMap(map: DismissalMap): Promise<void> {
  const entries = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_STORED);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries))).catch(() => {});
}

export async function readDismissedCampaignKeys(): Promise<string[]> {
  return Object.keys(await readMap());
}

export async function isCampaignDismissed(key: string): Promise<boolean> {
  const clean = String(key || '').trim();
  if (!clean) return false;
  const map = await readMap();
  return Object.prototype.hasOwnProperty.call(map, clean);
}

export async function markCampaignDismissed(key: string, atMs = Date.now()): Promise<void> {
  const clean = String(key || '').trim();
  if (!clean) return;
  const map = await readMap();
  map[clean] = atMs;
  await writeMap(map);
}
