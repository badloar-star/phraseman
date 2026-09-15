import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HomeHintAudience, HomeHintCursor } from './home_hints';

// зачем: владелец видел 1-2 подсказки по кругу вместо всех 92. Причина была не в
// выборе (он честно последовательный), а в том, что курсор жил в useRef и при
// каждом холодном старте обнулялся -> всегда индекс 0. Курсор обязан пережить
// перезапуск, иначе очередь физически не двигается.
const HOME_HINT_CURSOR_KEY = 'home_hints_cursor_v1';

const AUDIENCES: readonly HomeHintAudience[] = ['all', 'free', 'plus'];

// зачем: голая ссылка на __DEV__ падает в jest (память project_dev_guard_bare_dev_global_jest) —
// читаем флаг только через globalThis.
const isDev = (): boolean => Boolean((globalThis as { __DEV__?: boolean }).__DEV__);

export function parseHomeHintCursor(value: unknown): HomeHintCursor | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const snapshotVersion = typeof record.snapshotVersion === 'string' ? record.snapshotVersion.trim() : '';
  if (!snapshotVersion || snapshotVersion.length > 80) return null;
  const rawIndices = record.nextIndexByAudience;
  if (!rawIndices || typeof rawIndices !== 'object' || Array.isArray(rawIndices)) return null;
  const source = rawIndices as Record<string, unknown>;
  const nextIndexByAudience: Record<HomeHintAudience, number> = { all: 0, free: 0, plus: 0 };
  for (const audience of AUDIENCES) {
    const raw = Number(source[audience]);
    // Отрицательное/NaN/дробное тихо приводим к 0: пул подсказок меняется,
    // а нормализация под длину очереди всё равно идёт в normalizeCursor.
    nextIndexByAudience[audience] = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
  }
  return { snapshotVersion, nextIndexByAudience };
}

export async function readHomeHintCursor(): Promise<HomeHintCursor | null> {
  try {
    const raw = await AsyncStorage.getItem(HOME_HINT_CURSOR_KEY);
    if (!raw) {
      if (isDev()) console.log('[HOME-HINT] курсор: в хранилище пусто, начинаем очередь с начала');
      return null;
    }
    const parsed = parseHomeHintCursor(JSON.parse(raw));
    if (!parsed) {
      console.warn('[HOME-HINT] курсор: запись в хранилище нечитаема, начинаем очередь с начала', { raw });
      return null;
    }
    if (isDev()) console.log('[HOME-HINT] курсор прочитан из хранилища', parsed);
    return parsed;
  } catch (error) {
    console.warn('[HOME-HINT] курсор: чтение из хранилища упало', { reason: String(error) });
    return null;
  }
}

export async function writeHomeHintCursor(cursor: HomeHintCursor): Promise<void> {
  try {
    await AsyncStorage.setItem(HOME_HINT_CURSOR_KEY, JSON.stringify(cursor));
    if (isDev()) console.log('[HOME-HINT] курсор сохранён', cursor);
  } catch (error) {
    // Не роняем показ подсказки: хуже протухший курсор, чем пустой экран.
    console.warn('[HOME-HINT] курсор: запись в хранилище упала', { reason: String(error), cursor });
  }
}
