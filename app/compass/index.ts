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
export type { CompassDay, CompassTask, CompassDayType, CompassTaskKind, CompassInductionFeature } from './compass_brain';
export { pickInductionFeature } from './compass_brain';
// Персональное приветствие первого дня (имя + обещание под цель + индакшн).
export { readCompassOnboardingProfile } from './compass_onboarding_profile';
export type { CompassOnboardingProfile, CompassGoal, CompassLevel } from './compass_onboarding_profile';
export { buildCompassGreeting, buildCompassInduction } from './compass_copy';
export { compassInductionRoute } from './compass_induction_route';
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
// Крыло «ИИ-голос»: тёплый комментарий дня (ИИ + fallback по Библии).
export { useCompassVoice } from './use_compass_voice';
export { compassAiVoiceOn } from './compass_flags';
