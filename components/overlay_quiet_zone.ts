// ════════════════════════════════════════════════════════════════════════════
// overlay_quiet_zone.ts — «тишина в уроке» для очереди окон (OverlayArbiter).
//
// зачем (владелец 11.11, аудит всплывающих окон): служебные окна корня («Доступно обновление»,
// напоминание про уведомления, рассылки, сообщения команды, восстановление входа, истёкшая подписка)
// решают «показаться» по сети/таймеру/возврату из фона и не знают, где игрок, — поэтому вставали
// прямо поверх упражнения. Здесь только чистые правила: какой экран «тихий» и какие окна на нём ждут.
// Окно НЕ теряется: его просьба остаётся в очереди и исполняется, когда игрок вышел с занятия.
//
// Отдельный файл, а не правка overlay_arbiter_core.ts: тот файл в момент правки редактировался в
// другой сессии. Новый экран занятия → допиши путь в QUIET_ROUTE_PATHS (сторож: tests/overlay_quiet_zone.test.ts).
// ════════════════════════════════════════════════════════════════════════════

import type { OverlayKey, WantsMap } from './overlay_arbiter_core';

/**
 * Экраны, где игрок занят делом и служебное окно — помеха: само занятие и его итог.
 * Итог (lesson_complete, dialogue_v2_completion) тоже тихий — у него своя цепочка окон, служебные её только удлиняют.
 * Значения — имена файлов экранов в app/ (первый сегмент пути expo-router).
 */
export const QUIET_ROUTE_PATHS: readonly string[] = [
  'lesson1',
  'lesson_words',
  'lesson_verbs',
  'lesson_irregular_verbs',
  'lesson_theory_v2',
  'lesson_complete',
  'exam',
  'level_exam',
  'diagnostic_test',
  'mistake_practice_session',
  'flashcards_blitz_session',
  'flashcards_recall_session',
  'flashcards_speaking_session',
  'flashcards_truefalse_session',
  'flashcards_swipe',
  'dialogue_v2_session',
  'dialogue_v2_freeform',
  'dialogue_v2_completion',
  'ai_dialog_session',
  'ai_companion_session',
  'lingman_video_quiz',
  'lingman_video_watch',
  // зачем (аудит 12.11, заход 3): игры Elevate — тоже занятие на время; служебное окно поверх игры с таймером сбивает партию.
  // Экраны выбора (разминка, уровни игры) не тихие: там игрок ещё не играет.
  'game_flow',
  'game_hunt',
  'game_minute',
  'game_odd_word',
  'game_order',
  'game_quiz',
  'game_race',
  'game_sort',
];

const QUIET_ROUTE_SET: ReadonlySet<string> = new Set(QUIET_ROUTE_PATHS);

/**
 * Окна, которые ждут выхода из тихой зоны: служебные окна корня, не связанные с тем, что игрок делает сейчас.
 * Сюда НЕ входят: themedAlert (блокирующие алерты самих занятий), окна итога урока, тосты, праздники экранов —
 * они часть занятия. Обязательное обновление и техработы идут мимо очереди и здесь не регулируются.
 */
export const QUIET_DEFERRED_KEYS: ReadonlySet<OverlayKey> = new Set<OverlayKey>([
  'update',
  'authRecovery',
  'releaseNotes',
  'broadcast',
  'appMessageModal',
  'personalAdminMessage',
  'notifNudge',
  'introFullAccess',
  'entitlementExpired',
  'referralWelcome',
  'coinsMigration',
]);

/** Первый сегмент пути: '/exam?lesson=3' → 'exam', 'lesson1/' → 'lesson1'. */
function firstSegment(pathname: string): string {
  const withoutQuery = pathname.split('?')[0] ?? '';
  return withoutQuery.replace(/^\/+/, '').split('/')[0] ?? '';
}

/** Тихий ли экран (занятие или его итог). Пустой/неизвестный путь — не тихий: лучше показать окно, чем потерять его. */
export function isQuietRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return QUIET_ROUTE_SET.has(firstSegment(pathname));
}

/**
 * Список желающих для выбора следующего окна. В тихой зоне служебные окна из него убраны — кроме того, кто
 * уже держит слот (очередь невытесняющая: показанное окно не срываем, его закроет человек).
 * Исходный список не меняется; если убирать нечего — возвращается он же (без лишних перерисовок).
 */
export function filterWantsForQuietZone(wantsMap: WantsMap, quiet: boolean, active: OverlayKey | null): WantsMap {
  if (!quiet) return wantsMap;
  let filtered: WantsMap | null = null;
  for (const key of QUIET_DEFERRED_KEYS) {
    if (!wantsMap[key] || key === active) continue;
    filtered = { ...(filtered ?? wantsMap), [key]: false };
  }
  return filtered ?? wantsMap;
}

/** Какие служебные окна сейчас отложены тишиной — для журнала [OVERLAY-QUIET]. */
export function listQuietDeferredWaiting(wantsMap: WantsMap, quiet: boolean, active: OverlayKey | null): OverlayKey[] {
  if (!quiet) return [];
  const deferred: OverlayKey[] = [];
  for (const key of QUIET_DEFERRED_KEYS) {
    if (wantsMap[key] && key !== active) deferred.push(key);
  }
  return deferred;
}
