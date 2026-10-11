// ─── Реестр обучающих модалок фич ────────────────────────────────────────
// зачем: владелец (2026-08-16) — «люди не находят фичи». Три механизма показа
// решены: первый вход на экран, по достижению условия (progress-based),
// центр «Что нового» (отдельная задача). Этот файл — ОДНА точка правды:
// список фич + текст на 8 языков + флаг «уже показано» на диск. Firebase не
// участвует (всё локально, дёшево — ноль чтений/записей в Firestore).
import AsyncStorage from '@react-native-async-storage/async-storage';
import type React from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import { triLang, type Lang } from '../constants/i18n';
import { captureAccountGeneration } from './account_generation';
import { DebugLogger } from './debug-logger';
import type { FeatureIntroFamily } from '../components/feature_intro/FeatureIntroStage';
import type { FeatureIntroArt } from './feature_intro_art';
import { SECTION_FEATURE_INTROS } from './feature_intro_sections_copy';
import { APPROVED_FEATURE_INTROS } from './feature_intro_copy';
import { TRAINING_FEATURE_INTROS } from './feature_intro_training_copy';
import { isDevFeatureIntroReplayEnabled } from './feature_intro_dev_replay';

export type FeatureIntroTrigger = 'first_visit' | 'condition';
export type FeatureIntroIconName = React.ComponentProps<typeof Ionicons>['name'];

export type FeatureIntroDef = Readonly<{
  id: string;
  trigger: FeatureIntroTrigger;
  /** Экран, на котором показывается при trigger='first_visit' (informational — конкретный маршрут решает вызывающий хук). */
  screenRoute?: string;
  title: (lang: Lang) => string;
  body: (lang: Lang) => string;
  icon: FeatureIntroIconName;
  family?: FeatureIntroFamily;
  art?: FeatureIntroArt;
  ctaLabel: (lang: Lang) => string;
}>;

const STORAGE_PREFIX = 'feature_intro_seen_v1';

// зачем: «показано» обязано переживать перезапуск приложения (AsyncStorage,
// не память), но НЕ обязано переживать смену аккаунта на том же устройстве —
// новый игрок должен снова увидеть объяснения фич. Ключ несёт stableId
// текущего поколения аккаунта (см. app/account_generation.ts, тот же паттерн,
// что у lessons_tab_state.ts), 'anon' — до входа/для гостя.
function seenStorageKey(id: string): string {
  const stableId = captureAccountGeneration().stableId ?? 'anon';
  return `${STORAGE_PREFIX}::${stableId}::${id}`;
}

export async function shouldShowFeatureIntro(id: string): Promise<boolean> {
  if (isDevFeatureIntroReplayEnabled()) return true;
  try {
    const raw = await AsyncStorage.getItem(seenStorageKey(id));
    return raw !== '1';
  } catch {
    // Диск недоступен — лучше один лишний показ, чем никогда не показать.
    return true;
  }
}

export async function markFeatureIntroSeen(id: string): Promise<void> {
  if (isDevFeatureIntroReplayEnabled()) return;
  try {
    await AsyncStorage.setItem(seenStorageKey(id), '1');
  } catch (e) {
      // Не критично: в худшем случае покажется снова в следующий раз.
      DebugLogger.error('feature_intro_registry:markFeatureIntroSeen', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// зачем (координатор 12.10, DEV_LINKS_R1): окна знакомства с разделами (first_visit) встают на первый заход в каждый раздел и перекрывают кадр — робот-съёмке нужно пометить все показанными одной ссылкой (`dev_state?intros=seen`).
export async function markAllFeatureIntrosSeen(): Promise<number> {
  try {
    await AsyncStorage.multiSet(FEATURE_INTRO_REGISTRY.map((def) => [seenStorageKey(def.id), '1'] as [string, string]));
    return FEATURE_INTRO_REGISTRY.length;
  } catch (e) {
    DebugLogger.error('feature_intro_registry:markAllFeatureIntrosSeen', e instanceof Error ? e : new Error(String(e)), 'warning');
    throw e;
  }
}

/** Только для витрины движения (DEV Hub): стирает «показано» для ВСЕХ зарегистрированных интро текущего аккаунта. */
export async function resetAllFeatureIntrosSeen(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(FEATURE_INTRO_REGISTRY.map((def) => seenStorageKey(def.id)));
  } catch (e) {
      // dev-only утилита — тихий отказ достаточен.
      DebugLogger.error('feature_intro_registry:resetAllFeatureIntrosSeen', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export const FEATURE_INTRO_REGISTRY: readonly FeatureIntroDef[] = [
  ...SECTION_FEATURE_INTROS,
  ...APPROVED_FEATURE_INTROS,
  ...TRAINING_FEATURE_INTROS,
  // зачем (PM-008, Q74): интро «Арена» удалено вместе с Ареной (D83) — маршрута /arena больше нет.
];

export function featureIntroById(id: string): FeatureIntroDef | null {
  return FEATURE_INTRO_REGISTRY.find((def) => def.id === id) ?? null;
}
