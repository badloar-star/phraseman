import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import type { HomeHintAudience, PublishedHomeHint, PublishedHomeHints } from './home_hints';
import { SELECTED_HOME_HINTS_SNAPSHOT } from './home_hints_selected';

const HOME_HINTS_COLLECTION = 'home_hints';
const HOME_HINTS_DOC = 'published';
const HOME_HINTS_CACHE_KEY = 'home_hints_published_cache_v1';
const MAX_ITEMS = 300;
const MAX_TEXT_LENGTH = 180;
const MAX_LOCALES = 12;

type FirestoreFactory = () => {
  collection: (name: string) => {
    doc: (id: string) => {
      get: () => Promise<{ exists: boolean; data: () => unknown }>;
    };
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function parsePublishedItem(value: unknown): PublishedHomeHint | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const category = typeof value.category === 'string' ? value.category.trim() : '';
  const audience = value.audience;
  const textRu = typeof value.textRu === 'string' ? value.textRu.trim() : '';
  if (!id || id.length > 100 || !category || !['all', 'free', 'plus'].includes(String(audience)) || !textRu || textRu.length > MAX_TEXT_LENGTH) return null;
  const rawTranslations = value.textByLocale;
  let textByLocale: Record<string, string> | undefined;
  if (rawTranslations !== undefined) {
    if (!isRecord(rawTranslations) || Object.keys(rawTranslations).length > MAX_LOCALES) return null;
    textByLocale = {};
    for (const [locale, text] of Object.entries(rawTranslations)) {
      if (!locale || locale.length > 16 || typeof text !== 'string' || text.trim().length === 0 || text.trim().length > MAX_TEXT_LENGTH) return null;
      textByLocale[locale] = text.trim();
    }
  }
  return { id, category, audience: audience as HomeHintAudience, textRu, ...(textByLocale ? { textByLocale } : {}) };
}

export function parsePublishedHomeHints(value: unknown): PublishedHomeHints | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.version !== 'string' || !value.version.trim() || value.version.length > 80 || !Array.isArray(value.items) || value.items.length === 0 || value.items.length > MAX_ITEMS) return null;
  const ids = new Set<string>();
  const items: PublishedHomeHint[] = [];
  for (const raw of value.items) {
    const item = parsePublishedItem(raw);
    if (!item || ids.has(item.id)) return null;
    ids.add(item.id);
    items.push(item);
  }
  return { schemaVersion: 1, version: value.version, items };
}

async function getFirestoreModule(): Promise<FirestoreFactory | null> {
  if (Platform.OS === 'web' || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    const mod = await import('@react-native-firebase/firestore');
    return mod.default as unknown as FirestoreFactory;
  } catch {
    return null;
  }
}

async function readCache(): Promise<PublishedHomeHints | null> {
  try {
    return parsePublishedHomeHints(JSON.parse((await AsyncStorage.getItem(HOME_HINTS_CACHE_KEY)) ?? ''));
  } catch {
    return null;
  }
}

export async function loadPublishedHomeHints(): Promise<PublishedHomeHints | null> {
  const cached = await readCache();
  const firestore = await getFirestoreModule();
  if (!firestore) return cached ?? SELECTED_HOME_HINTS_SNAPSHOT;
  try {
    const snapshot = await firestore().collection(HOME_HINTS_COLLECTION).doc(HOME_HINTS_DOC).get();
    const parsed = snapshot.exists ? parsePublishedHomeHints(snapshot.data()) : null;
    if (!parsed) return cached ?? SELECTED_HOME_HINTS_SNAPSHOT;
    await AsyncStorage.setItem(HOME_HINTS_CACHE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return cached ?? SELECTED_HOME_HINTS_SNAPSHOT;
  }
}
