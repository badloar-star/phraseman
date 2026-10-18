// spire_rank_accent_small.ts — уменьшенные маски «.accent» значков рангов Пика (128²) для показа в 25 dp.
// зачем (координатор 18.10, реестр R154 «до релиза — только ранги Пика»): основа значков уже 128² (b4af17fc1), а маски .accent остались 1024² —
// в сборке всего ~33 КБ, но каждая при показе распаковывается в ~4 МБ памяти ради значка 25 dp. Копии 128² лежат отдельно
// (assets/images/spire_rank_small), исходники v2art и реестр тем не тронуты. 128² хватает 25 dp на любой плотности экрана (до ×5).
import type { ImageSourcePropType } from 'react-native';

type Tone = 'dark' | 'light';

const SMALL_ACCENT: Readonly<Record<string, Readonly<Record<Tone, ImageSourcePropType>>>> = {
  spire_rank_1: { dark: require('../../assets/images/spire_rank_small/dark/spire_rank_1.accent.webp'), light: require('../../assets/images/spire_rank_small/light/spire_rank_1.accent.webp') }, // light-accent-ok: путь к файлу маски .accent.webp, не цвет
  spire_rank_2: { dark: require('../../assets/images/spire_rank_small/dark/spire_rank_2.accent.webp'), light: require('../../assets/images/spire_rank_small/light/spire_rank_2.accent.webp') }, // light-accent-ok: путь к файлу маски .accent.webp, не цвет
  spire_rank_3: { dark: require('../../assets/images/spire_rank_small/dark/spire_rank_3.accent.webp'), light: require('../../assets/images/spire_rank_small/light/spire_rank_3.accent.webp') }, // light-accent-ok: путь к файлу маски .accent.webp, не цвет
  spire_rank_4: { dark: require('../../assets/images/spire_rank_small/dark/spire_rank_4.accent.webp'), light: require('../../assets/images/spire_rank_small/light/spire_rank_4.accent.webp') }, // light-accent-ok: путь к файлу маски .accent.webp, не цвет
  spire_rank_5: { dark: require('../../assets/images/spire_rank_small/dark/spire_rank_5.accent.webp'), light: require('../../assets/images/spire_rank_small/light/spire_rank_5.accent.webp') }, // light-accent-ok: путь к файлу маски .accent.webp, не цвет
  spire_rank_6: { dark: require('../../assets/images/spire_rank_small/dark/spire_rank_6.accent.webp'), light: require('../../assets/images/spire_rank_small/light/spire_rank_6.accent.webp') }, // light-accent-ok: путь к файлу маски .accent.webp, не цвет
};

/** Маска 128² для значка ранга Пика; не ранг Пика — null (рисуется маска из реестра). */
export function spireRankSmallAccent(name: string, tone: Tone): ImageSourcePropType | null {
  return SMALL_ACCENT[name]?.[tone] ?? null;
}
