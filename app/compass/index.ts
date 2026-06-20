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
