// learningV2IonIcons.ts — значки уроков и глав карты Learning V2 (Ionicons, outline).
//
// зачем: владелец 18.10 — без текстур, иконки как в Диалогах, но свои. Плитка в стиле мира Диалогов (55, тон текста 9 %, Ionicons 26),
// а значки — по смыслу каждой главы курса, набор утвердили Макеты (fd6d10db8, 64 значка без повторов). Внутри урока у каждой главы свой значок.
// Уроков 9+ в данных пока нет — запасной значок урока и общий набор глав по кругу.
import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

export type LearningV2IonIconName = ComponentProps<typeof Ionicons>['name'];

/** Урок N → значок заголовка урока (эталон Макетов fd6d10db8, docs/design/v2-app/learning-v2-icons.html). */
const LESSON_ICONS: Readonly<Record<number, LearningV2IonIconName>> = {
  1: 'briefcase-outline',
  2: 'help-circle-outline',
  3: 'cube-outline',
  4: 'map-outline',
  5: 'id-card-outline',
  6: 'sunny-outline',
  7: 'repeat-outline',
  8: 'school-outline',
};

/** Урок N → значки глав 1…7 (эталон Макетов, 64 значка без повторов). */
const CHAPTER_ICONS: Readonly<Record<number, readonly LearningV2IonIconName[]>> = {
  1: ['business-outline', 'cafe-outline', 'people-outline', 'home-outline', 'restaurant-outline', 'chatbubbles-outline', 'calendar-outline'],
  2: ['bed-outline', 'eye-outline', 'navigate-outline', 'pricetag-outline', 'balloon-outline', 'cloudy-outline', 'ribbon-outline'],
  3: ['archive-outline', 'storefront-outline', 'car-outline', 'bulb-outline', 'bag-handle-outline', 'receipt-outline', 'leaf-outline'],
  4: ['trail-sign-outline', 'search-outline', 'nutrition-outline', 'compass-outline', 'key-outline', 'mail-outline', 'gift-outline'],
  5: ['people-circle-outline', 'bag-outline', 'happy-outline', 'folder-open-outline', 'shirt-outline', 'images-outline', 'git-network-outline'],
  6: ['alarm-outline', 'bus-outline', 'laptop-outline', 'fast-food-outline', 'barbell-outline', 'cart-outline', 'moon-outline'],
  7: ['color-palette-outline', 'football-outline', 'book-outline', 'hourglass-outline', 'pizza-outline', 'airplane-outline', 'call-outline'],
  8: ['star-outline', 'bicycle-outline', 'hand-left-outline', 'list-outline', 'flame-outline', 'egg-outline', 'heart-outline'],
};

const FALLBACK_LESSON: LearningV2IonIconName = 'book-outline';
const FALLBACK_CHAPTERS: readonly LearningV2IonIconName[] = ['flag-outline', 'leaf-outline', 'rocket-outline', 'trophy-outline', 'diamond-outline', 'planet-outline', 'medal-outline'];

export function learningV2LessonIonIcon(lessonOrdinal: number): LearningV2IonIconName {
  return LESSON_ICONS[lessonOrdinal] ?? FALLBACK_LESSON;
}

export function learningV2ChapterIonIcon(lessonOrdinal: number, chapterOrdinal: number): LearningV2IonIconName {
  const index = Math.max(0, chapterOrdinal - 1);
  const own = CHAPTER_ICONS[lessonOrdinal];
  return own?.[index] ?? FALLBACK_CHAPTERS[index % FALLBACK_CHAPTERS.length]!;
}
