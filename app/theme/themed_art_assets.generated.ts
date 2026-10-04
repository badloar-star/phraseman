// АВТОГЕНЕРАЦИЯ: node scripts/gen_themed_art_assets.mjs — руками не править.
// Новые предметы 2.0, которые реально лежат в assets/images/v2art/{dark,light}/.
import type { ThemedArtSlots } from './themed_art_registry';

export const THEMED_ART_GENERATED: Readonly<Partial<Record<string, ThemedArtSlots>>> = {
  cards: { dark: require('../../assets/images/v2art/dark/cards.webp'), light: require('../../assets/images/v2art/light/cards.webp') },
  continue: { dark: require('../../assets/images/v2art/dark/continue.webp'), light: require('../../assets/images/v2art/light/continue.webp') },
  dialogs: { dark: require('../../assets/images/v2art/dark/dialogs.webp'), light: require('../../assets/images/v2art/light/dialogs.webp') },
  lessons: { dark: require('../../assets/images/v2art/dark/lessons.webp'), light: require('../../assets/images/v2art/light/lessons.webp') },
  mistakes_entry: { dark: require('../../assets/images/v2art/dark/mistakes_entry.webp'), light: require('../../assets/images/v2art/light/mistakes_entry.webp') },
  phrase_of_day: { dark: require('../../assets/images/v2art/dark/phrase_of_day.webp'), light: require('../../assets/images/v2art/light/phrase_of_day.webp') },
  today: { dark: require('../../assets/images/v2art/dark/today.webp'), light: require('../../assets/images/v2art/light/today.webp') },
};
