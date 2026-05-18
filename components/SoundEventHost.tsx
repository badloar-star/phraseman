import { useEffect } from 'react';
import { onAppEvent, type AppEventMap } from '../app/events';
import { playAppSound, preloadAppSounds } from '../app/audio/sound_manager';
import {
  resolveSoundIdForAppEvent,
  SOUND_ROUTED_APP_EVENTS,
} from '../app/audio/sound_routing';

export default function SoundEventHost() {
  useEffect(() => {
    preloadAppSounds();
    const subs = SOUND_ROUTED_APP_EVENTS.map(event =>
      onAppEvent(event, (payload: AppEventMap[typeof event]) => {
        const id = resolveSoundIdForAppEvent(event, payload as never);
        if (id) void playAppSound(id);
      }),
    );
    return () => {
      subs.forEach(sub => sub.remove());
    };
  }, []);

  return null;
}
