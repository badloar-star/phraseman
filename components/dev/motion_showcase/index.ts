// ─── Витрина движения · агрегатор шардов ───
// зачем: единая точка чтения реестра для app/_motion_showcase.tsx;
// каждый шард — отдельный файл, чтобы агенты наполняли их параллельно.
import type { ShowcaseSection } from './types';
import { SECTION as s_celebrations } from './sections/celebrations';
import { SECTION as s_levelup_spins } from './sections/levelup_spins';
import { SECTION as s_league } from './sections/league';
import { SECTION as s_arena_rewards } from './sections/arena_rewards';
import { SECTION as s_paywalls } from './sections/paywalls';
import { SECTION as s_alerts_forms } from './sections/alerts_forms';
import { SECTION as s_consent_info } from './sections/consent_info';
import { SECTION as s_fullscreen } from './sections/fullscreen';
import { SECTION as s_toasts } from './sections/toasts';
import { SECTION as s_banners } from './sections/banners';
import { SECTION as s_screens_learn } from './sections/screens_learn';
import { SECTION as s_screens_arena_social } from './sections/screens_arena_social';
import { SECTION as s_screens_flashcards } from './sections/screens_flashcards';
import { SECTION as s_screens_profile } from './sections/screens_profile';
import { SECTION as s_press_icons_tabbar } from './sections/press_icons_tabbar';

const ALL: readonly ShowcaseSection[] = [s_celebrations, s_levelup_spins, s_league, s_arena_rewards, s_paywalls, s_alerts_forms, s_consent_info, s_fullscreen, s_toasts, s_banners, s_screens_learn, s_screens_arena_social, s_screens_flashcards, s_screens_profile, s_press_icons_tabbar];

export function getShowcaseSections(): readonly ShowcaseSection[] {
  return [...ALL]
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.items.length > 0);
}
