// АВТОГЕНЕРАЦИЯ: node scripts/gen_themed_art_assets.mjs — руками не править.
// Новые предметы 2.0, которые реально лежат в assets/images/v2art/{dark,light}/.
import type { ThemedArtSlots } from './themed_art_registry';

export const THEMED_ART_GENERATED: Readonly<Partial<Record<string, ThemedArtSlots>>> = {
  dialogs: { dark: require('../../assets/images/v2art/dark/dialogs.webp') },
  lessons: { dark: require('../../assets/images/v2art/dark/lessons.webp'), light: require('../../assets/images/v2art/light/lessons.webp') },
};
