import AsyncStorage from '@react-native-async-storage/async-storage';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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

/**
 * зачем ([COLD-START-IO], release, слабый профиль, 02.10): campaign_dismissals_v1 читали 10 раз за
 * первые 15 с — каждое чтение ждало очередь AsyncStorage. Ключ пишет ТОЛЬКО этот модуль (проверено
 * grep), поэтому карта живёт в памяти процесса: одно чтение с диска, запись обновляет память сразу.
 * Одновременные первые чтения склеиваются. Сбой чтения не кэшируется (повтор при следующем вызове).
 */
let memoryMap: DismissalMap | null = null;
let inFlightRead: Promise<DismissalMap> | null = null;
// Запись во время первого чтения: поздний ответ диска не должен затереть свежую карту в памяти.
let writeGeneration = 0;

async function readMap(): Promise<DismissalMap> {
  if (memoryMap) return { ...memoryMap };
  if (!inFlightRead) {
    inFlightRead = readMapFromStorage().finally(() => {
      inFlightRead = null;
    });
  }
  return { ...(await inFlightRead) };
}

async function readMapFromStorage(): Promise<DismissalMap> {
  const generation = writeGeneration;
  const remember = (map: DismissalMap): void => {
    if (generation === writeGeneration) memoryMap = map;
  };
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      remember({});
      return memoryMap ?? {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: DismissalMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === 'string' && typeof value === 'number' && Number.isFinite(value)) {
        out[key] = value;
      }
    }
    remember(out);
    return memoryMap ?? out;
  } catch (error) {
    // зачем: запрет немого catch — не прочиталось/битое: считаем «ничего не скрыто», память не заполняем.
    console.warn('[CAMPAIGN-DISMISSALS] read_failed', error instanceof Error ? error.message : String(error));
    return {};
  }
}

async function writeMap(map: DismissalMap): Promise<void> {
  const entries = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_STORED);
  writeGeneration += 1;
  memoryMap = Object.fromEntries(entries);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries))).catch(noteSwallowedHandler('campaign_dismissals:promise_1'));
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
