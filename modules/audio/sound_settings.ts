import { subscribeAppSnapshot } from '@/app/app_snapshot_store';
import { getUserSettingsSnapshot } from '@/app/user_settings_store';

export type SoundSettingsSnapshot = Readonly<{
  effectsEnabled: boolean;
  voiceEnabled: boolean;
}>;

export function getSoundSettingsSnapshot(): SoundSettingsSnapshot {
  const settings = getUserSettingsSnapshot();
  return {
    effectsEnabled: settings.uiSounds,
    voiceEnabled: settings.voiceOut,
  };
}

export function subscribeSoundSettings(listener: () => void): () => void {
  let previous = getSoundSettingsSnapshot();
  return subscribeAppSnapshot(() => {
    const next = getSoundSettingsSnapshot();
    if (
      next.effectsEnabled === previous.effectsEnabled
      && next.voiceEnabled === previous.voiceEnabled
    ) return;
    previous = next;
    listener();
  });
}

