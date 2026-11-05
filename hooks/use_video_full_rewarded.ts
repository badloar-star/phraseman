// use_video_full_rewarded.ts — «за какие ролики награда +500 уже получена» (для плашек «монета с галочкой» и флага награды).
// зачем (владелец 05.11: «+500 за полный просмотр видео»; повтор награды не даёт): плашки на роликах показывают «+500» или «получено». Список лежит на телефоне
// (app/video_full_reward), читается один раз на аккаунт; подписка через useSyncExternalStore — плашка меняется в тот же кадр, когда награда записана в журнал.
import { useEffect, useSyncExternalStore } from 'react';
import { captureAccountGeneration } from '../app/account_generation';
import { peekVideoFullRewarded, readVideoFullRewarded, subscribeVideoFullRewarded } from '../app/video_full_reward';
import { getRemoteBool } from '../app/remote_flags';

const NONE: ReadonlySet<string> = new Set();

function currentOwner(): string | null {
  const token = captureAccountGeneration();
  return token.phase === 'active' ? token.stableId?.trim() || null : null;
}

export function useVideoFullRewarded(): ReadonlySet<string> {
  const ids = useSyncExternalStore(subscribeVideoFullRewarded, () => peekVideoFullRewarded(currentOwner()), () => NONE);
  useEffect(() => {
    const owner = currentOwner();
    if (owner) void readVideoFullRewarded(owner); // один раз на аккаунт (кэш в памяти); после чтения подписчики получат новую ссылку
  }, []);
  return ids;
}

/** Награда за видео включена (флаг; по умолчанию ВКЛ). Читается в рендере: переключение в Пульте дойдёт после перерисовки. */
export function isVideoFullRewardEnabled(): boolean {
  return getRemoteBool('video_full_reward_enabled');
}
