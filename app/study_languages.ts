// ═══════════════════════════════════════════════════════════════════════════
// study_languages.ts — реестр изучаемых языков пользователя.
//
// зачем (владелец 2026-09-30): «ЯЗЫКИ ОБУЧЕНИЯ ВСЕ ФРИ БЕЗ ПЛЮС» — гейт «1 язык фри»
// удалён целиком (D78: удалённое удаляется, а не прячется). Любой язык добавляется
// без Plus. Прогресс каждого языка живёт в своём namespace
// (target_storage_keys.ts, `..._v2::{target}::...`), поэтому переключение ничего
// не теряет. «Начатый» язык = язык, который пользователь хотя бы раз активировал
// через экран приветствия (language_welcome) или который был активен на момент
// первого сида списка.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDevStartedLanguages, isDevSettingsFail } from './dev_social_state';
import type { Lang } from '../constants/i18n';
import { isStudyTarget, setStoredStudyTarget, type StudyTarget } from './study_target';
import { DebugLogger } from './debug-logger';
import { peekStableId } from './stable_id';

// зачем (правило владельца «каждый раздел открывается мгновенно», аудит 04.10): список начатых языков читался из хранилища при каждом открытии пикера,
// а ранний тап уходил в резолвер-роут со спиннером. Последний известный список держим в памяти по аккаунту; пикер берёт его первым кадром.
let startedMemory: { owner: string; list: StudyTargetLang[] } | null = null;
function rememberStarted(list: StudyTargetLang[]): StudyTargetLang[] {
  const owner = peekStableId();
  if (owner) startedMemory = { owner, list };
  return list;
}
export function peekStartedStudyLanguages(): StudyTargetLang[] | null {
  const owner = peekStableId();
  const known = owner && startedMemory?.owner === owner ? startedMemory.list : null;
  return known ? withDevStarted(known) : known;
}

/**
 * зачем (Авторизация 12.10, settings-gap-020/021): dev `started=en,es` — языки считаются начатыми только в памяти процесса,
 * поверх сохранённого списка; хранилище и облачная синхронизация не трогаются. В стор-сборке геттер null — список как есть.
 */
function withDevStarted(list: StudyTargetLang[]): StudyTargetLang[] {
  const extra = getDevStartedLanguages();
  if (!extra) return list;
  const merged = normalizeStartedList([...list, ...extra]);
  console.log('[DEV-STATE] study_languages: начатые языки дополнены в памяти', JSON.stringify({ stored: list, extra, merged })); // guard-ok: dev-ветка
  return merged;
}

export type StudyTargetLang = StudyTarget;

export function isKnownStudyLanguage(value: unknown): value is StudyTargetLang {
  return isStudyTarget(value);
}

/** JSON-массив кодов начатых языков. Входит в cloud_sync. */
export const STUDY_LANGUAGES_STARTED_KEY = 'study_languages_started_v1';

/** Ответы мини-онбординга нового языка (зачем/уровень) — по языку. */
export function languageProfileKey(target: StudyTargetLang): string {
  return 'language_profile_v1::' + target;
}

export type LanguageProfile = {
  /** Цель — те же id, что в онбординге ('series'|'everyday'|'travel'|'words'|'mind'). */
  goal: string;
  /** Стартовый уровень ('a0'|'a1'|'a2'|'b1'|'b2'). */
  level: string;
  /** ISO-дата сохранения ответов. */
  savedAt: string;
};

function normalizeStartedList(raw: unknown): StudyTargetLang[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<StudyTargetLang>();
  for (const item of raw) {
    if (isKnownStudyLanguage(item)) seen.add(item);
  }
  return Array.from(seen);
}

/**
 * Список начатых языков. `seed` — текущий активный язык: если списка ещё нет
 * (старые установки до фичи), он считается первым начатым языком, чтобы
 * существующие пользователи не упёрлись в пейвол на своём же языке.
 */
/** Сохранённый список (без dev-наложения) — только он пишется обратно в хранилище. */
async function readStoredStartedStudyLanguages(seed?: StudyTargetLang): Promise<StudyTargetLang[]> {
  let stored: StudyTargetLang[] = [];
  try {
    const raw = await AsyncStorage.getItem(STUDY_LANGUAGES_STARTED_KEY);
    stored = raw ? normalizeStartedList(JSON.parse(raw)) : [];
  } catch (e) {
    // зачем: немой catch прятал битый JSON/сбой чтения — список молча становился пустым.
    console.warn('[STUDY-LANGS] список начатых языков не прочитан — считаем пустым', String(e));
    stored = [];
  }
  if (stored.length === 0 && seed && isKnownStudyLanguage(seed)) {
    const seeded = [seed];
    try {
      await AsyncStorage.setItem(STUDY_LANGUAGES_STARTED_KEY, JSON.stringify(seeded));
    } catch (e) {
      DebugLogger.error('study_languages:seeded', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    return rememberStarted(seeded);
  }
  return rememberStarted(stored);
}

export async function getStartedStudyLanguages(seed?: StudyTargetLang): Promise<StudyTargetLang[]> {
  return withDevStarted(await readStoredStartedStudyLanguages(seed));
}

/** Отметить язык начатым (идемпотентно). Возвращает актуальный список. */
export async function markStudyLanguageStarted(target: StudyTargetLang): Promise<StudyTargetLang[]> {
  // зачем: читаем сохранённый список без dev-наложения `started=`, иначе языки из памяти записались бы в хранилище и облако.
  const current = await readStoredStartedStudyLanguages();
  if (current.includes(target)) return withDevStarted(current);
  const next = [...current, target];
  try {
    await AsyncStorage.setItem(STUDY_LANGUAGES_STARTED_KEY, JSON.stringify(next));
  } catch (e) {
      DebugLogger.error('study_languages:next', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return withDevStarted(rememberStarted(next));
}

export async function saveLanguageProfile(
  target: StudyTargetLang,
  profile: Omit<LanguageProfile, 'savedAt'>,
): Promise<LanguageProfile> {
  const full: LanguageProfile = { ...profile, savedAt: new Date().toISOString() };
  await AsyncStorage.setItem(languageProfileKey(target), JSON.stringify(full));
  return full;
}

export async function getLanguageProfile(target: StudyTargetLang): Promise<LanguageProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(languageProfileKey(target));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LanguageProfile>;
    if (typeof parsed?.goal !== 'string' || typeof parsed?.level !== 'string') return null;
    return {
      goal: parsed.goal,
      level: parsed.level,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return null;
  }
}

/**
 * Единая процедура активации языка обучения (настройки + language_welcome).
 * Записывает единственный канонический target и отмечает язык начатым.
 */
export async function applyStudyLanguageSelection(code: StudyTargetLang, uiLang: Lang): Promise<void> {
  // зачем (координатор 12.10, R1 «нет пути»): dev `studyfail=on` — сбой смены языка изучения (тост «Не получилось сменить язык»); в стор-сборке геттер выключен.
  if (isDevSettingsFail('study_language')) {
    console.warn(`[DEV-STATE] study_language: смена языка подменена сбоем (code=${code})`); // guard-ok: dev-ветка
    throw new Error('dev_study_language_failed');
  }
  try {
    await setStoredStudyTarget(code, uiLang);
  } catch (error: unknown) {
    throw new StudyLanguageSelectionError('set_target', code, error);
  }
  try {
    await markStudyLanguageStarted(code);
  } catch (error: unknown) {
    throw new StudyLanguageSelectionError('mark_started', code, error);
  }
}

/**
 * Отказ активации языка с указанием шага.
 * зачем (ревью TG-3BD963DD05D5, R4): при сбое на `mark_started` язык УЖЕ сменён (target записан и событие
 * отправлено) — вызывающий не должен показывать «не получилось сменить язык», это была бы неправда.
 */
export class StudyLanguageSelectionError extends Error {
  readonly step: 'set_target' | 'mark_started';
  readonly target: StudyTargetLang;

  constructor(step: 'set_target' | 'mark_started', target: StudyTargetLang, cause: unknown) {
    super(`study_language_selection_failed step=${step} target=${target} reason=${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'StudyLanguageSelectionError';
    this.step = step;
    this.target = target;
  }
}

/* expo-router: не регистрировать файл как экран */
export default function __StudyLanguagesRouteShim() {
  return null;
}
