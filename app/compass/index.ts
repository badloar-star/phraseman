/**
 * Компас — ПУБЛИЧНЫЙ ВХОД. Единственная поверхность, которую импортирует основное
 * приложение. Всё остальное в `app/compass/` — внутреннее.
 *
 * КОНТРАКТ ИЗОЛЯЦИИ:
 *  - основной код приложения импортирует ТОЛЬКО отсюда;
 *  - всё здесь безопасно при выключенном Компасе (`compassOn() === false`):
 *    хук отдаёт day=null, компоненты рендерят null, гейт работает всегда;
 *  - удалить Компас целиком = убрать импорты из основных файлов + папку compass.
 *    Ничего в основном приложении при этом не ломается.
 */
export { compassOn } from './compass_flags';
export { useCompassDay } from './use_compass_day';
export { default as CompassBriefingModal } from './compass_briefing_modal';
export { default as CompassBriefingHost } from './compass_briefing_host';
export { default as CompassLessonInvite } from './compass_lesson_invite';
export { compassLessonInviteOn } from './compass_flags';
export type { CompassDay, CompassTask, CompassDayType, CompassTaskKind } from './compass_brain';
// Премиум-гейт плана (чинит дыру; работает независимо от флага Компаса).
export { canActivatePlan, decidePlanAccess } from './compass_access';
// Крыло «Экономика»: справедливый вес дня + анти-фарм (рекомендации, не начисление).
export { computeCompassDayWeight, shouldCreditTopic } from './compass_economy';
export { compassEconomyOn } from './compass_flags';
// Крыло «Мотивация»: тёплый возврат, защита серии, выбор пуша (решения, не отправка).
export { decideRetentionPush, needsComebackDay } from './compass_retention';
export type { CompassPushDecision, CompassPushKind } from './compass_retention';
export { compassRetentionOn } from './compass_flags';
// Крыло «Память»: карта тем (читает всё, агрегирует; только она — сущность Компаса).
export { buildTopicMap, summarizeTopicMap } from './compass_memory';
export type { TopicCard, TopicStatus, TopicMapSummary } from './compass_memory';
export { compassTopicMapOn } from './compass_flags';
export { default as CompassStatsBlock } from './compass_stats_block';
