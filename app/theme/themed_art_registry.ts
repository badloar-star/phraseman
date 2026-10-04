// ═══════════════════════════════════════════════════════════════════════════
// Реестр предметов 2.0 (ТЗ docs/phraseman-2.0/ASSETS_V2_PROMPTS.md, ТЕМЫ 2.0, 2026-10-04).
//
// зачем: до прихода картинок Codex любой экран может уже ссылаться на предмет по имени.
// Источник выбирается так:
//   1) новый файл нужной яркости (assets/images/v2art/<dark|light>/<name>.webp + .accent.webp);
//   2) новый файл другой яркости — лучше старой картинки;
//   3) НЫНЕШНЯЯ картинка ЭТОГО ЖЕ места (запасная);
//   4) нет ничего → origin 'none': экран оставляет то, что показывает сейчас (обычно Ionicons).
// Запасные взяты только там, где это место РЕАЛЬНО показывает картинку сегодня (сверено по коду,
// файл:строка в комментариях). Чужие картинки «для заполнения» НЕ подставлены: значки уровней
// вместо обложек уроков или удалённые 30.09 картинки вступлений — это выдумка, а не запасной вариант.
// Новые файлы подключает scripts/gen_themed_art_assets.mjs (Metro понимает только статический require).
// ═══════════════════════════════════════════════════════════════════════════
import type { ImageSourcePropType } from 'react-native';
import { THEMED_ART_GENERATED } from './themed_art_assets.generated';

export const THEMED_ART_NAMES = [
  // Главная (7)
  'lessons', 'dialogs', 'cards', 'continue', 'phrase_of_day', 'mistakes_entry', 'today',
  // Мои ошибки (3)
  'mistakes_hero', 'mistakes_empty', 'mistakes_done',
  // Карточки — пустые состояния (3)
  'cards_empty_saved', 'cards_empty_sets', 'cards_from_video',
  // Обучение (4)
  'exam', 'diagnostic', 'practice', 'course_map',
  // Лиги (6) — экраны Лиг удалены в 2.0 (D54/D78), имена оставлены по ТЗ
  'league_bronze', 'league_silver', 'league_gold', 'league_ruby', 'league_emerald', 'league_diamond',
  // Серия (12)
  'streak_01', 'streak_02', 'streak_03', 'streak_04', 'streak_05',
  'streak_06', 'streak_07', 'streak_08', 'streak_09', 'streak_10',
  'streak_freeze', 'streak_freeze_overlay',
  // Достижения (5)
  'achievements_header', 'ach_lessons', 'ach_streak', 'ach_combo', 'ach_special',
  // Plus / рулетка (6)
  'prize_1d', 'prize_7d', 'prize_1m', 'prize_3m', 'prize_6m', 'prize_1y',
  // Магазин (1)
  'shop',
  // Вступления разделов (13)
  'intro_cards_hub', 'intro_legacy_lessons', 'intro_statistics', 'intro_daily_phrase', 'intro_videos',
  'intro_friends', 'intro_arena', 'intro_cards_swipe', 'intro_training_listening', 'intro_training_speaking',
  'intro_training_blitz', 'intro_ai_dialog', 'intro_mistake_practice',
] as const;

type LessonCoverName = `lesson_${'0' | '1' | '2' | '3' | '4'}${'0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'}` | 'lesson_50';
/** Обложки уроков lesson_01 … lesson_50 (lesson_00 в реестре нет). */
export type ThemedArtName = typeof THEMED_ART_NAMES[number] | Exclude<LessonCoverName, 'lesson_00'>;

const LESSON_COVER_NAMES = Array.from({ length: 50 }, (_, i) => `lesson_${String(i + 1).padStart(2, '0')}` as ThemedArtName);

/** Все 110 имён ТЗ. */
export const THEMED_ART_ALL_NAMES: readonly ThemedArtName[] = Object.freeze([...THEMED_ART_NAMES, ...LESSON_COVER_NAMES]);

export type ThemedArtBrightness = 'dark' | 'light';
export type ThemedArtSlots = Readonly<{
  dark?: ImageSourcePropType;
  darkAccent?: ImageSourcePropType;
  light?: ImageSourcePropType;
  lightAccent?: ImageSourcePropType;
}>;
export type ThemedArtOrigin = 'v2art' | 'v2art_other_brightness' | 'fallback' | 'none';
export type ThemedArtResolved = Readonly<{
  name: ThemedArtName;
  brightness: ThemedArtBrightness;
  base: ImageSourcePropType | null;
  accent: ImageSourcePropType | null;
  origin: ThemedArtOrigin;
}>;

// Нынешние картинки этих же мест (тёмный/нейтральный вариант, если раньше было по темам).
const FALLBACKS: Readonly<Partial<Record<ThemedArtName, ImageSourcePropType>>> = {
  lessons: require('../../assets/images/v2/book_stack.png'), // app/(tabs)/home.tsx — плитка «Уроки»
  dialogs: require('../../assets/images/v2/chat_bubbles.png'), // home.tsx — плитка «Диалоги»
  cards: require('../../assets/images/v2/notecard_stack.png'), // home.tsx — плитка «Карточки»
  continue: require('../../assets/images/home_last_lesson/home-last-lesson-notepad.png'), // app/home_last_lesson_assets.ts
  phrase_of_day: require('../../assets/images/v2/mug_quote.png'), // components/DailyPhraseCard.tsx (homeV2)
  mistakes_entry: require('../../assets/images/home_mistakes/home-mistakes-dark.webp'), // app/home_mistakes_assets.ts
  cards_empty_saved: require('../../assets/images/v2/cards_hub_saved.webp'), // home.tsx — «Сохранённые»
  cards_from_video: require('../../assets/images/v2/spiral_notepad.png'), // home.tsx — «Наборы из видео»
  exam: require('../../assets/images/levels/exam-dark.webp'), // app/home_menu_icons.ts (dark: exam)
  diagnostic: require('../../assets/images/home_menu/home-forest-diagnostic-test.webp'), // home_menu_icons.ts (dark: test)
  practice: require('../../assets/images/home_menu/home-forest-practice.webp'), // home_menu_icons.ts (dark: practice)
  league_bronze: require('../../assets/images/levels/bronza.webp'), // app/(tabs)/lessons.tsx — медали ступеней
  league_silver: require('../../assets/images/levels/serebro.webp'),
  league_gold: require('../../assets/images/levels/zoloto.webp'),
  league_ruby: require('../../assets/images/levels/rubin.webp'),
  league_emerald: require('../../assets/images/levels/izumrud.webp'),
  league_diamond: require('../../assets/images/levels/almaz.webp'),
  streak_01: require('../../assets/images/streak_icons/feather/streak-feather-01.webp'), // constants/streakIconAssets.ts
  streak_02: require('../../assets/images/streak_icons/feather/streak-feather-02.webp'),
  streak_03: require('../../assets/images/streak_icons/feather/streak-feather-03.webp'),
  streak_04: require('../../assets/images/streak_icons/feather/streak-feather-04.webp'),
  streak_05: require('../../assets/images/streak_icons/feather/streak-feather-05.webp'),
  streak_06: require('../../assets/images/streak_icons/feather/streak-feather-06.webp'),
  streak_07: require('../../assets/images/streak_icons/feather/streak-feather-07.webp'),
  streak_08: require('../../assets/images/streak_icons/feather/streak-feather-08.webp'),
  streak_09: require('../../assets/images/streak_icons/feather/streak-feather-09.webp'),
  streak_10: require('../../assets/images/streak_icons/feather/streak-feather-10.webp'),
  streak_freeze: require('../../assets/images/streak_icons/dark/streak-freeze-dark.webp'), // streakIconAssets.ts (dark)
  streak_freeze_overlay: require('../../assets/images/streak_overlays/streak-freeze-ice.webp'), // app/theme_ui_assets.ts
  achievements_header: require('../../assets/images/levels/achivement.webp'), // app/achievements_screen.tsx — щит
  ach_lessons: require('../../assets/images/achievement_categories/achievement-category-lessons.webp'), // achievements_screen.tsx
  ach_streak: require('../../assets/images/achievement_categories/achievement-category-streak.webp'),
  ach_combo: require('../../assets/images/achievement_categories/achievement-category-combo.webp'),
  ach_special: require('../../assets/images/achievement_categories/achievement-category-special.webp'),
  prize_1d: require('../../assets/roulette/card-1d.webp'), // app/roulette_prizes.ts
  prize_7d: require('../../assets/roulette/card-7d.webp'),
  prize_1m: require('../../assets/roulette/card-1m.webp'),
  prize_3m: require('../../assets/roulette/card-3m.webp'),
  prize_6m: require('../../assets/roulette/card-6m.webp'),
  prize_1y: require('../../assets/roulette/card-1y.webp'),
  shop: require('../../assets/images/levels/SHOP FOREST.webp'), // home_menu_icons.ts (dark: shop)
};

/**
 * Имена, у которых СЕГОДНЯ на этом месте картинки нет (Ionicons или раздела нет):
 * до прихода предметов экран оставляет свой нынешний вид (см. hasThemedArt).
 */
export const THEMED_ART_NO_FALLBACK: readonly ThemedArtName[] = Object.freeze(
  THEMED_ART_ALL_NAMES.filter(name => !(name in FALLBACKS)),
);

/** Чистое разрешение по набору новых файлов — для тестов и для resolveThemedArt. */
export function resolveThemedArtFrom(
  generated: Readonly<Partial<Record<string, ThemedArtSlots>>>,
  name: ThemedArtName,
  brightness: ThemedArtBrightness,
): ThemedArtResolved {
  const slots = generated[name];
  const other: ThemedArtBrightness = brightness === 'dark' ? 'light' : 'dark';
  const own = slots?.[brightness];
  if (own) return Object.freeze({ name, brightness, base: own, accent: slots?.[`${brightness}Accent`] ?? null, origin: 'v2art' });
  const alt = slots?.[other];
  if (alt) return Object.freeze({ name, brightness, base: alt, accent: slots?.[`${other}Accent`] ?? null, origin: 'v2art_other_brightness' });
  const fallback = FALLBACKS[name];
  if (fallback) return Object.freeze({ name, brightness, base: fallback, accent: null, origin: 'fallback' });
  return Object.freeze({ name, brightness, base: null, accent: null, origin: 'none' });
}

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
// зачем: экраны перерисовываются на каждом шаге ползунка — разрешение кэшируется навсегда по
// имени+яркости, чтобы источники картинок оставались ТЕМИ ЖЕ объектами (expo-image не перезагружает).
const cache = new Map<string, ThemedArtResolved>();

export function resolveThemedArt(name: ThemedArtName, brightness: ThemedArtBrightness): ThemedArtResolved {
  const key = `${name}|${brightness}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const resolved = resolveThemedArtFrom(THEMED_ART_GENERATED, name, brightness);
  if (IS_DEV && resolved.origin !== 'v2art') {
    console.log('[THEMED-ART] resolve', { name, brightness, origin: resolved.origin, hasAccent: resolved.accent !== null });
  }
  cache.set(key, resolved);
  return resolved;
}

/** Есть ли что показать (новый предмет или нынешняя картинка) — иначе экран оставляет свой вид. */
export function hasThemedArt(name: ThemedArtName, brightness: ThemedArtBrightness): boolean {
  return resolveThemedArt(name, brightness).origin !== 'none';
}
