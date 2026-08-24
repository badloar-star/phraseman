import fs from 'node:fs';
import path from 'node:path';

import { applyUserSettingsNow, getUserSettingsSnapshot } from '@/app/user_settings_store';
import { SOUND_EVENTS, type SoundEventId } from '@/modules/audio/sound_events';
import {
  getSoundSettingsSnapshot,
  subscribeSoundSettings,
} from '@/modules/audio/sound_settings';

const MISSING_EVENTS: SoundEventId[] = [
  'pm.reward.vip_finale',
];

describe('semantic sound event catalog', () => {
  test('types every manifest event and enables every supplied asset', () => {
    const ids = Object.keys(SOUND_EVENTS) as SoundEventId[];
    const enabled = ids.filter((id) => SOUND_EVENTS[id].source !== null);
    const disabled = ids.filter((id) => SOUND_EVENTS[id].source === null);

    expect(ids).toHaveLength(61);
    expect(enabled).toHaveLength(60);
    expect(disabled).toEqual(MISSING_EVENTS);
    enabled.forEach((id) => expect(SOUND_EVENTS[id].source).toBeTruthy());
  });

  test('keeps approved runtime volumes, priorities, durations and cooldowns', () => {
    expect(SOUND_EVENTS['pm.learn.correct']).toMatchObject({
      volume: 0.42,
      priority: 70,
      durationMs: 380,
      cooldownMs: 160,
      family: 'learning',
    });
    expect(SOUND_EVENTS['pm.voice.record_ready']).toMatchObject({
      volume: 0.4,
      priority: 95,
      platform: 'ios',
    });
    expect(SOUND_EVENTS['pm.reward.vip_finale']).toMatchObject({
      source: null,
      volume: 0.64,
      priority: 97,
    });

    Object.values(SOUND_EVENTS).forEach((definition) => {
      expect(definition.volume).toBeGreaterThan(0);
      expect(definition.volume).toBeLessThanOrEqual(1);
      expect(definition.priority).toBeGreaterThan(0);
      expect(definition.cooldownMs).toBeGreaterThanOrEqual(0);
      expect(definition.durationMs).toBeGreaterThan(0);
    });
  });

  test('keeps the rejected lesson combo cue deleted', () => {
    const rejectedEventId = 'pm.learn.combo_up';
    // зачем: sfx переехали wav -> m4a (экономия ~13 МБ в APK); сторож обязан
    // ловить возврат отклонённого звука в ЛЮБОМ формате, не только старом wav.
    const rejectedAssets = ['.wav', '.m4a'].map((ext) => path.resolve(
      __dirname,
      `../assets/audio/sfx/v1/learning/pm_learn_combo_up_v1${ext}`,
    ));
    const lessonSource = fs.readFileSync(path.resolve(__dirname, '../app/lesson1.tsx'), 'utf8');

    expect(SOUND_EVENTS).not.toHaveProperty(rejectedEventId);
    rejectedAssets.forEach((asset) => expect(fs.existsSync(asset)).toBe(false));
    expect(lessonSource).not.toContain(rejectedEventId);
  });
});

describe('sound settings bridge', () => {
  test('publishes uiSounds and voiceOut changes synchronously', () => {
    const original = getUserSettingsSnapshot();
    const seen: Array<{ effectsEnabled: boolean; voiceEnabled: boolean }> = [];
    const unsubscribe = subscribeSoundSettings(() => seen.push(getSoundSettingsSnapshot()));

    applyUserSettingsNow({ ...original, uiSounds: false, voiceOut: false });

    expect(getSoundSettingsSnapshot()).toEqual({ effectsEnabled: false, voiceEnabled: false });
    expect(seen.at(-1)).toEqual({ effectsEnabled: false, voiceEnabled: false });

    unsubscribe();
    applyUserSettingsNow(original);
  });
});
