// story_plus_offer_from_event.ts — данные события `plus_offer` → кадр-предложение Plus. Строгий разбор: непонятное событие кадра не даёт.
// зачем (владелец 11.11, шаг 2 историй-предложений): событие выводится из рубежа серии (modules/story_events/plus_offer_stories.ts);
// из второго пройденного диалога или из истории недели; здесь оно превращается в кадр `plus_streak`, `plus_dialog` или `plus_week`.
import { REVENUE_MONTHLY_LIMITS } from '../../../app/revenue_daily_limits';
import type { StoryPlusOfferTemplate } from './story_plus_offer_registry';
import { DAY_MS, dayKeyToMs } from './story_template_dates';

export function plusOfferTemplateFromPayload(payload: Readonly<Record<string, unknown>>, atMs: number): StoryPlusOfferTemplate | null {
  if (payload.kind === 'dialog') {
    // реплики — формат события «me:текст|them:текст»; лимит ответов — правило приложения, а не число из события
    const bubbles = (typeof payload.bubbles === 'string' ? payload.bubbles : '').split('|')
      .map((item) => ({ me: item.startsWith('me:'), text: item.replace(/^(me|them):/, '').trim() }))
      .filter((bubble) => bubble.text !== '');
    return { id: 'plus_dialog', repliesLimit: REVENUE_MONTHLY_LIMITS.ai_dialog_replies, bubbles };
  }
  if (payload.kind === 'week') {
    // столбики — минуты по дням из события недели («42,70,…»); без понедельника недели кадра нет
    const startMs = dayKeyToMs(payload.startDayKey);
    if (startMs === null) return null;
    const dailyMinutes = (typeof payload.dailyMinutes === 'string' ? payload.dailyMinutes : '').split(',')
      .map((item) => Math.trunc(Number(item))).filter((n) => Number.isFinite(n) && n >= 0).slice(0, 7);
    return { id: 'plus_week', startMs, endMs: startMs + 6 * DAY_MS, dailyMinutes };
  }
  if (payload.kind !== 'streak') return null;
  const days = Math.trunc(Number(payload.days));
  if (!Number.isFinite(days) || days < 1) return null;
  // дата рубежа — из события серии; нет ключа дня — момент события
  return { id: 'plus_streak', days, endMs: dayKeyToMs(payload.dayKey) ?? atMs };
}
