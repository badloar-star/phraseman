// ═══════════════════════════════════════════════════════════════════════════
// study_languages.ts — реестр изучаемых языков пользователя + гейт «1 язык фри».
//
// Идея монетизации: бесплатный аккаунт учит ОДИН язык (тот, что выбран на
// онбординге / первым). Каждый следующий язык — за Plus. Прогресс каждого языка
// живёт в своём namespace (target_storage_keys.ts, `..._v2::{target}::...`),
// поэтому «начатые» языки ничего не теряют при переключении.
//
// «Начатый» язык = язык, который пользователь хотя бы раз активировал через
// экран приветствия (language_welcome) или который был активен на момент
// первого сида списка. Переключение МЕЖДУ уже начатыми языками не гейтится —
// наказание за даунгрейд подписки ограничено только добавлением НОВЫХ языков.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import { ENABLE_DEV_STUDY_TARGET_LANG } from './config';
import { setStoredStudyTarget } from './study_target';
import { emitDevStudyTargetChanged, setDevStudyTargetLang, type StudyTargetLang } from './study_target_lang_dev';
import { prefetchAndRecordStudyTargetServerPack } from './study_target_server_prefetch';
import { shouldGateFeature } from './feature_gates';

/** Все возможные коды языка обучения (включая dev-испанский). */
const KNOWN_STUDY_LANGUAGE_CODES = ['en', 'fr', 'es'] as const;

export function isKnownStudyLanguage(value: unknown): value is StudyTargetLang {
  return typeof value === 'string'
    && (KNOWN_STUDY_LANGUAGE_CODES as readonly string[]).includes(value);
}

/** Сколько языков доступно бесплатному аккаунту. */
export const FREE_STUDY_LANGUAGE_LIMIT = 1;

/** JSON-массив кодов начатых языков. Входит в cloud_sync. */
export const STUDY_LANGUAGES_STARTED_KEY = 'study_languages_started_v1';

/** Ответы мини-онбординга нового языка (зачем/уровень) — по языку. */
export function languageProfileKey(target: StudyTargetLang): string {
  return 'language_profile_v1::' + target;
}

export type LanguageProfile = {
  /** Цель — те же id, что PersonalPlanSetupGoal ('series'|'everyday'|'travel'|'words'|'mind'). */
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
export async function getStartedStudyLanguages(seed?: StudyTargetLang): Promise<StudyTargetLang[]> {
  let stored: StudyTargetLang[] = [];
  try {
    const raw = await AsyncStorage.getItem(STUDY_LANGUAGES_STARTED_KEY);
    stored = raw ? normalizeStartedList(JSON.parse(raw)) : [];
  } catch {
    stored = [];
  }
  if (stored.length === 0 && seed && isKnownStudyLanguage(seed)) {
    const seeded = [seed];
    try {
      await AsyncStorage.setItem(STUDY_LANGUAGES_STARTED_KEY, JSON.stringify(seeded));
    } catch {}
    return seeded;
  }
  return stored;
}

/** Отметить язык начатым (идемпотентно). Возвращает актуальный список. */
export async function markStudyLanguageStarted(target: StudyTargetLang): Promise<StudyTargetLang[]> {
  const current = await getStartedStudyLanguages();
  if (current.includes(target)) return current;
  const next = [...current, target];
  try {
    await AsyncStorage.setItem(STUDY_LANGUAGES_STARTED_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

/**
 * Гейт добавления нового языка. true → показать пейвол (context='language_add').
 *
 * Чистая функция для тестируемости: список начатых и премиум-статус передаёт
 * вызывающий. Замок можно снять для всех через админку
 * (gate_extra_languages_premium=false), как у остальных фич.
 */
export function shouldGateExtraLanguage(params: {
  target: StudyTargetLang;
  startedLanguages: readonly StudyTargetLang[];
  hasPremiumAccess: boolean;
}): boolean {
  const { target, startedLanguages, hasPremiumAccess } = params;
  if (startedLanguages.includes(target)) return false; // уже учит — не гейтим
  if (startedLanguages.length < FREE_STUDY_LANGUAGE_LIMIT) return false; // первый язык бесплатно
  return shouldGateFeature('extra_languages', hasPremiumAccess);
}

export async function saveLanguageProfile(
  target: StudyTargetLang,
  profile: Omit<LanguageProfile, 'savedAt'>,
): Promise<LanguageProfile> {
  const full: LanguageProfile = { ...profile, savedAt: new Date().toISOString() };
  try {
    await AsyncStorage.setItem(languageProfileKey(target), JSON.stringify(full));
  } catch {}
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
 * Повторяет проверенную логику плашек настроек: dev-испанский идёт через
 * dev-канал, продовые языки — через setStoredStudyTarget + префетч контент-пака
 * для французского. Отмечает язык начатым.
 */
export async function applyStudyLanguageSelection(code: StudyTargetLang, uiLang: Lang): Promise<void> {
  if (ENABLE_DEV_STUDY_TARGET_LANG && (code === 'es' || code === 'fr')) {
    await setDevStudyTargetLang(code, uiLang);
    if (code === 'fr') {
      void prefetchAndRecordStudyTargetServerPack('fr', uiLang).catch(() => {});
    }
  } else {
    await setStoredStudyTarget('en', uiLang);
    if (ENABLE_DEV_STUDY_TARGET_LANG) {
      await setDevStudyTargetLang('en', uiLang);
    }
  }
  await markStudyLanguageStarted(code);
  emitDevStudyTargetChanged();
}

/* expo-router: не регистрировать файл как экран */
export default function __StudyLanguagesRouteShim() {
  return null;
}
