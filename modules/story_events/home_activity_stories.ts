import { getLocalDayKey } from '../../app/local_date';
import type { HomeSceneCopy } from '../../components/home/v2/scene/home_scene_copy';
import type { HomeSceneState } from '../../components/home/v2/scene/home_scene_state';
import type { StoryEvent } from './story_events_core';

export function buildHomeSceneStory(
  state: HomeSceneState,
  copy: Pick<HomeSceneCopy, 'kicker' | 'title'>,
  offlineLabel: string | undefined,
  now: Date,
): StoryEvent | undefined {
  let status: string | undefined;
  switch (state) {
    case 'newbie':
    case 'continue': return undefined;
    case 'offline': status = offlineLabel; break;
    case 'welcome_back': status = copy.kicker; break;
    case 'streak_risk':
    case 'day_done':
    case 'no_energy':
    case 'streak_lost':
    case 'exam_ready':
    case 'all_done': status = copy.title; break;
  }
  if (!status) return undefined;
  return {
    id: `home-activity:${state}:${getLocalDayKey(now)}`,
    type: 'home_activity',
    atMs: now.getTime(),
    seen: false,
    payload: { state, status },
  };
}

/**
 * зачем (владелец 11.11: «все сцены, которые передают какие-то состояния, переместить в истории»): особая сцена Главной
 * (неразобранные ошибки, пора повторить, место в Пике, праздник…) больше не встаёт сверху — её заголовок уходит историей дня.
 * Ключ особой сцены входит в id: новая особая сцена того же вида в тот же день — новая история, повтор — та же.
 */
export function buildHomeSpecialStory(
  special: string,
  key: string | null,
  copy: Pick<HomeSceneCopy, 'title'>,
  now: Date,
): StoryEvent | undefined {
  const status = copy.title?.trim();
  if (!status) return undefined;
  return {
    id: `home-activity:special:${special}:${key ?? ''}:${getLocalDayKey(now)}`,
    type: 'home_activity',
    atMs: now.getTime(),
    seen: false,
    payload: { state: `special:${special}`, status },
  };
}
