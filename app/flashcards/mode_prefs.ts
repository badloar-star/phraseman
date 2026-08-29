/**
 * cards-2.0 (E8): настройки режимов практики — ключ `fc_mode_prefs_v1` (§1 мастер-плана).
 * `lastPreset` — «быстрый старт» (§3.1 п.5): тап по режиму на хабе запускает сессию
 * с последним выбранным набором и размером, DeckPickerSheet открывается только
 * по long-press / иконке ⚙ и сохраняет выбор сюда.
 *
 * cards-2.1 (§6 SPEC_2_1): пресет хранит МУЛЬТИВЫБОР колод — `deckIds: FcDeckId[]`.
 * Поле `deckId` остаётся (это первая колода списка): и старые сохранённые данные
 * (`{ deckId, size }`), и старые сборки приложения продолжают читать/писать его.
 * Чтение: `deckIds` при наличии, иначе `[deckId]`; запись — оба поля сразу.
 *
 * Новый ключ — существующие ключи AsyncStorage не трогаем (принцип 4).
 * Все записи — через одну очередь (withWriteLock, образец hooks/use-flashcards.ts).
 * Чистые функции парсинга экспортированы для юнит-тестов (tests/fc_mode_prefs.test.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidDeckId, normalizeDeckIds, type FcDeckId } from './deck_selection';
import { DebugLogger } from '../debug-logger';

export const FC_MODE_PREFS_KEY = 'fc_mode_prefs_v1';

/** Размер сессии (§3.5: 10/15/20, дефолт 15). */
export type FcSessionSize = 10 | 15 | 20;
export const FC_SESSION_SIZES: readonly FcSessionSize[] = [10, 15, 20];
export const FC_DEFAULT_SESSION_SIZE: FcSessionSize = 15;

/**
 * Идентификатор набора тренировки (§3 DeckPickerSheet) — определение переехало
 * в `deck_selection.ts` (общий слой мультивыбора), здесь реэкспорт для совместимости.
 */
export type { FcDeckId } from './deck_selection';
export { isValidDeckId } from './deck_selection';

/**
 * Пресет быстрого старта.
 *  - `deckIds` — мультивыбор колод (§6 SPEC 2.1), непустой, без дублей;
 *  - `deckId`  — первая колода списка; поле оставлено для обратной совместимости
 *                (старые данные в fc_mode_prefs_v1 и вызывающие экраны).
 */
export type FcModePreset = {
  deckId: FcDeckId;
  deckIds: FcDeckId[];
  size: FcSessionSize;
};

/** Вход `setLastPreset`: достаточно любого из полей `deckIds` / `deckId`. */
export type FcModePresetInput = {
  deckId?: FcDeckId;
  deckIds?: readonly FcDeckId[];
  size: FcSessionSize;
};

/**
 * Режимы с пресетом быстрого старта (E8 — тренер, E10 — слушание, E12 — блиц,
 * `speaking` — «Говорить»: владелец 2026-08-17 попросил рядом с «Блиц» и «Слушать»
 * режим, где карточки отрабатываются речью).
 */
export type FcPresetMode = 'trainer' | 'listening' | 'blitz' | 'speaking';
const PRESET_MODES: readonly string[] = ['trainer', 'listening', 'blitz', 'speaking'];

export type FcModePrefs = {
  /** Последний пресет по режимам — быстрый старт с хаба. */
  lastPreset: Partial<Record<FcPresetMode, FcModePreset>>;
};

// ── Чистые функции (для тестов) ──────────────────────────────────────────────

export function isValidSessionSize(v: unknown): v is FcSessionSize {
  return v === 10 || v === 15 || v === 20;
}

/**
 * Нормализация пресета: `deckIds` — источник правды, `deckId` = deckIds[0].
 * Пустой/битый выбор → null (пресета нет, режим стартует по дефолту).
 */
export function normalizeModePreset(input: FcModePresetInput | null | undefined): FcModePreset | null {
  if (!input || !isValidSessionSize(input.size)) return null;
  const raw: unknown[] = input.deckIds ? [...input.deckIds] : [];
  if (raw.length === 0 && input.deckId !== undefined) raw.push(input.deckId);
  const deckIds = normalizeDeckIds(raw);
  if (deckIds.length === 0) return null;
  return { deckId: deckIds[0], deckIds, size: input.size };
}

/** Колоды пресета (совместимость: старый пресет без `deckIds` → `[deckId]`). */
export function presetDeckIds(preset: FcModePreset | null | undefined): FcDeckId[] {
  if (!preset) return [];
  const list = normalizeDeckIds(preset.deckIds ?? []);
  if (list.length > 0) return list;
  return isValidDeckId(preset.deckId) ? [preset.deckId] : [];
}

/** Толерантный парсинг сырого JSON — битые/чужие поля отбрасываются молча. */
export function parseModePrefs(raw: string | null | undefined): FcModePrefs {
  const empty: FcModePrefs = { lastPreset: {} };
  if (!raw || !raw.trim()) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return empty;
  const lastRaw = (parsed as Record<string, unknown>).lastPreset;
  if (!lastRaw || typeof lastRaw !== 'object' || Array.isArray(lastRaw)) return empty;
  const lastPreset: FcModePrefs['lastPreset'] = {};
  for (const [mode, presetRaw] of Object.entries(lastRaw as Record<string, unknown>)) {
    if (!PRESET_MODES.includes(mode)) continue;
    if (!presetRaw || typeof presetRaw !== 'object' || Array.isArray(presetRaw)) continue;
    const p = presetRaw as Record<string, unknown>;
    if (!isValidSessionSize(p.size)) continue;
    // cards-2.1: новый формат — `deckIds`; старый (`deckId`) читается как список из одного.
    const deckIds = normalizeDeckIds(
      Array.isArray(p.deckIds) ? (p.deckIds as unknown[]) : isValidDeckId(p.deckId) ? [p.deckId] : [],
    );
    if (deckIds.length === 0) continue;
    lastPreset[mode as FcPresetMode] = { deckId: deckIds[0], deckIds, size: p.size };
  }
  return { lastPreset };
}

// ── Хранение: очередь записи + in-memory кэш ─────────────────────────────────

let prefsMemory: FcModePrefs | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(() => fn());
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** Только для юнит-тестов: сброс модульного состояния. */
export function __resetModePrefsForTests(): void {
  prefsMemory = null;
  writeQueue = Promise.resolve();
}

async function readPrefs(): Promise<FcModePrefs> {
  try {
    const raw = await AsyncStorage.getItem(FC_MODE_PREFS_KEY);
    const prefs = parseModePrefs(raw);
    prefsMemory = prefs;
    return prefs;
  } catch {
    return prefsMemory ?? { lastPreset: {} };
  }
}

export async function getModePrefs(): Promise<FcModePrefs> {
  if (prefsMemory) return prefsMemory;
  return readPrefs();
}

/** Пресет быстрого старта режима (null — пресета ещё нет → дефолтное поведение). */
export async function getLastPreset(mode: FcPresetMode): Promise<FcModePreset | null> {
  const prefs = await getModePrefs();
  return prefs.lastPreset[mode] ?? null;
}

/**
 * Запомнить выбор из DeckPickerSheet — следующий тап по режиму стартует с ним.
 * Пишем и `deckIds` (мультивыбор), и `deckId` (первая колода) — старые сборки
 * приложения, читающие только `deckId`, продолжают работать.
 */
export function setLastPreset(mode: FcPresetMode, preset: FcModePresetInput): Promise<void> {
  const normalized = normalizeModePreset(preset);
  if (!normalized) return Promise.resolve();
  return withWriteLock(async () => {
    const current = await readPrefs();
    const next: FcModePrefs = {
      ...current,
      lastPreset: { ...current.lastPreset, [mode]: normalized },
    };
    prefsMemory = next;
    try {
      await AsyncStorage.setItem(FC_MODE_PREFS_KEY, JSON.stringify(next));
    } catch (e) {
      // fail-soft: память обновлена, следующий успешный write перезапишет
      DebugLogger.error('mode_prefs:current', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
