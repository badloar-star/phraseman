// ─── Витрина движения · агрегатор шардов ───
// зачем: единая точка чтения реестра для app/_motion_showcase.tsx;
// каждый шард — отдельный файл, чтобы агенты наполняли их параллельно.
import type { ShowcaseSection } from './types';
import { SECTION as s_celebrations } from './sections/celebrations';
import { SECTION as s_purchase_celebration } from './sections/purchase_celebration';
import { SECTION as s_levelup_spins } from './sections/levelup_spins';
import { SECTION as s_league } from './sections/league';
import { SECTION as s_arena_rewards } from './sections/arena_rewards';
import { SECTION as s_arena_star_ladder } from './sections/arena_star_ladder';
import { SECTION as s_paywalls } from './sections/paywalls';
import { SECTION as s_alerts_forms } from './sections/alerts_forms';
import { SECTION as s_consent_info } from './sections/consent_info';
import { SECTION as s_fullscreen } from './sections/fullscreen';
import { SECTION as s_toasts } from './sections/toasts';
import { SECTION as s_banners } from './sections/banners';
import { SECTION as s_screens_learn } from './sections/screens_learn';
import { SECTION as s_learning_v2_modes } from './sections/learning_v2_modes';
import { SECTION as s_screens_arena_social } from './sections/screens_arena_social';
import { SECTION as s_screens_flashcards } from './sections/screens_flashcards';
import { SECTION as s_screens_profile } from './sections/screens_profile';
import { SECTION as s_press_icons_tabbar } from './sections/press_icons_tabbar';

const ALL: readonly ShowcaseSection[] = [s_celebrations, s_purchase_celebration, s_levelup_spins, s_league, s_arena_star_ladder, s_arena_rewards, s_paywalls, s_alerts_forms, s_consent_info, s_fullscreen, s_toasts, s_banners, s_screens_learn, s_learning_v2_modes, s_screens_arena_social, s_screens_flashcards, s_screens_profile, s_press_icons_tabbar];

/**
 * Пункт — это гибрид (моя новая анимация), а не оригинал приложения?
 * зачем: владелец 2026-08-17 потребовал убрать из витрины все оригиналы и
 * оставить ТОЛЬКО гибриды с пометкой «принято / ждёт» — иначе в списке из
 * ~170 строк невозможно понять, что именно смотреть глазами.
 */
const isExecutableHybridItem = (item: ShowcaseSection['items'][number]): boolean =>
  item.kind !== 'note' && /hybrid|гибрид/i.test(item.id);

export function getShowcaseSections(): readonly ShowcaseSection[] {
  return [...ALL]
    .sort((a, b) => a.order - b.order)
    // Текстовые target/note-карточки не являются проверяемыми анимациями.
    // Они остаются в исходных шардах как документация, но не попадают в
    // release-витрину, где каждая строка обязана что-то реально запускать.
    .map((s) => ({ ...s, items: s.items.filter(isExecutableHybridItem) }))
    .filter((s) => s.items.length > 0);
}
