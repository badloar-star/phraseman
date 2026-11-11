// ═══════════════════════════════════════════════════════════════════════════
// story_plus_offer_registry.ts — три кадра-предложения Plus в «Историях»: порядок макета, данные кадра и примеры фотостудии.
//
// зачем (владелец 11.11: «карточки предложения переместить в истории и сделать красивый дизайн им», на макет — «Да, делай»):
// порядок и примеры — как в TPL макета docs/design/v2-app/stories-plus-offers.html. Отдельный файл по образцу
// story_instead_registry.ts: в общий story_template_registry.ts уходит только подключение списка. В фотостудии кадры идут
// после 48 прежних — номера 49…51. К игроку кадры попадают на шаге 2 (события-источники, показ только бесплатному аккаунту).
// ═══════════════════════════════════════════════════════════════════════════
import { REVENUE_MONTHLY_LIMITS } from '../../../app/revenue_daily_limits';
import type { PlusDialogOffer, PlusStreakOffer, PlusWeekOffer } from './frames_plus';

/** Порядок — как в макете (кадры 1…3). */
export const STORY_PLUS_OFFER_TEMPLATE_IDS = ['plus_streak', 'plus_week', 'plus_dialog'] as const;
export type StoryPlusOfferTemplateId = (typeof STORY_PLUS_OFFER_TEMPLATE_IDS)[number];

type T<I extends StoryPlusOfferTemplateId, D> = Readonly<{ id: I } & D>;

/** Данные кадров: только то, что событие уже знает. */
export type StoryPlusOfferTemplate =
  | T<'plus_streak', PlusStreakOffer>
  | T<'plus_week', PlusWeekOffer>
  | T<'plus_dialog', PlusDialogOffer>;

// зачем: даты примеров — локальное время устройства, как у событий
const day = (y: number, m: number, d: number): number => new Date(y, m - 1, d, 12).getTime();

/** Примерные данные — числа и тексты макета 1:1 (фотостудия и тест снимков). Лимит ответов — из правила приложения, не цифрой. */
export const STORY_PLUS_OFFER_TEMPLATE_SAMPLES: Readonly<{ [I in StoryPlusOfferTemplateId]: Extract<StoryPlusOfferTemplate, { id: I }> }> = {
  plus_streak: { id: 'plus_streak', days: 7, endMs: day(2026, 10, 25) },
  // «20–26 октября» с подписями П…В — неделя 2025 года, как у примера кадра «Твоя неделя»
  plus_week: { id: 'plus_week', startMs: day(2025, 10, 20), endMs: day(2025, 10, 26), dailyMinutes: [42, 70, 55, 90, 30, 80, 100] },
  plus_dialog: {
    id: 'plus_dialog', repliesLimit: REVENUE_MONTHLY_LIMITS.ai_dialog_replies,
    bubbles: [{ text: '¿Me pones un café con leche?', me: false }, { text: 'Claro. ¿Para llevar?', me: true }],
  },
};
