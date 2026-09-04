import { arenaPeekHomeWarm } from './home_cache';
import { ARENA_RANK_COUNT, arenaRankIndex } from './rank_engine';

export function arenaViewerRankIndex(viewerStars: number | null): number | null {
  if (viewerStars === null || !Number.isFinite(viewerStars) || viewerStars < 0) return null;
  return arenaRankIndex(viewerStars);
}

/**
 * Сезонные звёзды игрока для показа СВОЕГО ранга, когда route-параметра нет.
 *
 * зачем (владелец 2026-09-03: «у соперника есть ранг ассет у меня нет —
 * оба актуальный ранг ассет»): ранг соперника приходит с сервера в плане матча
 * и есть всегда, а свой брался ТОЛЬКО из query-параметра `viewerStars`. Этот
 * параметр проставляет один путь входа (хаб → матчмейкинг), а дуэль с другом и
 * вход по приглашению его не передают — и на месте своего щита оставался
 * пустой прямоугольник.
 *
 * Запасной источник — тёплый снимок хаба в памяти: ранг и звёзды за ночь не
 * портятся (см. `arenaHomeWarmUsable`). Чтение синхронное и НУЛЕВОЙ стоимости:
 * ни одного обращения к Firestore, первый кадр не ждёт сети.
 *
 * Возвращает null честно, если снимка нет вовсе (первый запуск после установки):
 * лучше нейтральный плейсхолдер, чем выдуманный чужой ранг.
 */
export function arenaViewerSeasonStarsFallback(wallNowMs: number): number | null {
  const warm = arenaPeekHomeWarm(wallNowMs);
  const home = warm?.home;
  if (!home || typeof home !== 'object') return null;
  const profile = (home as Record<string, unknown>).profile;
  if (!profile || typeof profile !== 'object') return null;
  const rating = (profile as Record<string, unknown>).rating;
  if (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 0) return null;
  return Math.trunc(rating);
}

export function arenaEligibleRankIndices(viewerStars: number | null): readonly number[] {
  const viewerRankIndex = arenaViewerRankIndex(viewerStars);
  if (viewerRankIndex === null) return [];
  return [viewerRankIndex - 1, viewerRankIndex, viewerRankIndex + 1]
    .filter((rankIndex) => rankIndex >= 0 && rankIndex < ARENA_RANK_COUNT);
}
