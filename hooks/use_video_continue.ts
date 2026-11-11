/**
 * Запись «Продолжить» для ленты раздела «Видео» (владелец 11.11): первый кадр — из памяти процесса,
 * диск поднимается фоном один раз на аккаунт. Сети нет.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { hydrateVideoContinue, peekVideoContinue, subscribeVideoContinue, type VideoContinueRecord } from '../app/video_continue';

const peek = (): VideoContinueRecord | null => peekVideoContinue();

export function useVideoContinue(): VideoContinueRecord | null {
  const record = useSyncExternalStore(subscribeVideoContinue, peek, peek);
  useEffect(() => {
    void hydrateVideoContinue(); // зачем: ошибки чтения журналируются внутри; карточки при сбое просто нет
  }, []);
  return record;
}
