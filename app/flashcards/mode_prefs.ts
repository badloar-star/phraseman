/**
 * cards-2.0 (E8): настройки режимов практики — ключ `fc_mode_prefs_v1` (§1 мастер-плана).
 * `lastPreset` — «быстрый старт» (§3.1 п.5): тап по режиму на хабе запускает сессию
 * с последним выбранным набором и размером, DeckPickerSheet открывается только
 * по long-press / иконке ⚙ и сохраняет выбор сюда.
 *
 * Новый ключ — существующие ключи AsyncStorage не трогаем (принцип 4).
 * Все записи — через одну очередь (withWriteLock, образец hooks/use-flashcards.ts).
 * Чистые функции парсинга экспортированы для юнит-тестов (tests/fc_mode_prefs.test.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FC_MODE_PREFS_KEY = 'fc_mode_prefs_v1';

/** Размер сессии (§3.5: 10/15/20, дефолт 15). */
export type FcSessionSize = 10 | 15 | 20;
export const FC_SESSION_SIZES: readonly FcSessionSize[] = [10, 15, 20];
export const FC_DEFAULT_SESSION_SIZE: FcSessionSize = 15;

/**
 * Идентификатор набора тренировки (§3 DeckPickerSheet):
 *  - 'weak'      — «Слабые»: due-очередь тренера (trainer_store, дефолтное поведение);
 *  - 'saved'     — «Все сохранённые» (flashcards_v1);
 *  - 'custom'    — «Мои карточки» (custom_flashcards_v2);
 *  - 'pack:<id>' — купленный набор маркета.
 */
export type FcDeckId = 'weak' | 'saved' | 'custom' | `pack:${string}`;

export type FcModePreset = { deckId: FcDeckId; size: FcSessionSize };

/** Режимы с пресетом быстрого старта (E8 — тренер, E10 — слушание, E12 — блиц). */
export type FcPresetMode = 'trainer' | 'listening' | 'blitz';
const PRESET_MODES: readonly string[] = ['trainer', 'listening', 'blitz'];

export type FcModePrefs = {
  /** Последний пресет по режимам — быстрый старт с хаба. */
  lastPreset: Partial<Record<FcPresetMode, FcModePreset>>;
};

// ── Чистые функции (для тестов) ──────────────────────────────────────────────

export function isValidSessionSize(v: unknown): v is FcSessionSize {
  return v === 10 || v === 15 || v === 20;
}

export function isValidDeckId(v: unknown): v is FcDeckId {
  if (typeof v !== 'string') return false;
  if (v === 'weak' || v === 'saved' || v === 'custom') return true;
  return v.startsWith('pack:') && v.length > 'pack:'.length;
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
    if (isValidDeckId(p.deckId) && isValidSessionSize(p.size)) {
      lastPreset[mode as FcPresetMode] = { deckId: p.deckId, size: p.size };
    }
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

/** Запомнить выбор из DeckPickerSheet — следующий тап по режиму стартует с ним. */
export function setLastPreset(mode: FcPresetMode, preset: FcModePreset): Promise<void> {
  return withWriteLock(async () => {
    const current = await readPrefs();
    const next: FcModePrefs = {
      ...current,
      lastPreset: { ...current.lastPreset, [mode]: preset },
    };
    prefsMemory = next;
    try {
      await AsyncStorage.setItem(FC_MODE_PREFS_KEY, JSON.stringify(next));
    } catch {
      // fail-soft: память обновлена, следующий успешный write перезапишет
    }
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
