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
  {
    id: 'arena_first_visit',
    trigger: 'first_visit',
    screenRoute: '/arena',
    icon: 'flash',
    family: 'premiere',
    art: 'arena',
    title: (lang) => triLang(lang, {
      ru: 'Твой выход на Арену',
      uk: 'Арена',
      en: 'Arena',
      es: 'Arena',
      'pt-BR': 'Arena',
      vi: 'Đấu trường',
      id: 'Arena',
      tr: 'Arena',
      pl: 'Arena',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Здесь вы с соперником отвечаете на задания по фразам. Победы поднимают ранг и приносят руны. Сначала освоимся — соперника выберем следующим шагом.',
      uk: 'Дуелі один на один по фразах. Перемагай і піднімайся по рангах — від Бронзи до Легенди. За перемоги — руни для сезонних нагород.',
      en: 'One-on-one phrase duels. Win and climb the ranks — from Bronze to Legend. Victories earn runes for season rewards.',
      es: 'Duelos uno contra uno con frases. Gana y sube de rango, desde Bronce hasta Leyenda. Las victorias dan runas para las recompensas de temporada.',
      'pt-BR': 'Duelos um contra um com frases. Vença e suba de rank, do Bronze até Lenda. As vitórias dão runas para as recompensas da temporada.',
      vi: 'Đấu 1 chọi 1 bằng các câu học. Thắng để lên rank, từ Đồng đến Huyền thoại. Chiến thắng cho rune để đổi phần thưởng theo mùa.',
      id: 'Duel satu lawan satu dengan frasa. Menang untuk naik rank, dari Perunggu sampai Legenda. Kemenangan memberi rune untuk hadiah musiman.',
      tr: 'Cümlelerle birebir düellolar. Kazan ve rütbe yüksel, Bronzdan Efsaneye kadar. Zaferler sezon ödülleri için rün kazandırır.',
      pl: 'Pojedynki 1 na 1 na frazy. Wygrywaj i pnij się w rangach — od Brązu do Legendy. Zwycięstwa dają runy na nagrody sezonowe.',
    }),
    ctaLabel: (lang) => triLang(lang, {
      ru: 'Открыть Арену',
      uk: 'Відкрити Арену',
      en: 'Explore Arena',
      es: 'Explorar la Arena',
      'pt-BR': 'Explorar a Arena',
      vi: 'Khám phá Đấu trường',
      id: 'Jelajahi Arena',
      tr: 'Arenayı keşfet',
      pl: 'Poznaj Arenę',
    }),
  },
];

export function featureIntroById(id: string): FeatureIntroDef | null {
  return FEATURE_INTRO_REGISTRY.find((def) => def.id === id) ?? null;
}
