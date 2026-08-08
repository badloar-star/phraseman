import { applyUserSettingsNow, getUserSettingsSnapshot } from '@/app/user_settings_store';
import { SOUND_EVENTS, type SoundEventId } from '@/modules/audio/sound_events';
import {
  getSoundSettingsSnapshot,
  subscribeSoundSettings,
} from '@/modules/audio/sound_settings';

const MISSING_EVENTS: SoundEventId[] = [
  'pm.reward.vip_finale',
  'pm.arena.match_found',
  'pm.arena.countdown_3',
  'pm.arena.countdown_2',
  'pm.arena.countdown_1',
  'pm.arena.round_start',
  'pm.arena.victory',
  'pm.arena.defeat',
  'pm.arena.draw',
];

describe('semantic sound event catalog', () => {
  test('types every manifest event and enables exactly the supplied 44 assets', () => {
    const ids = Object.keys(SOUND_EVENTS) as SoundEventId[];
    const enabled = ids.filter((id) => SOUND_EVENTS[id].source !== null);
    const disabled = ids.filter((id) => SOUND_EVENTS[id].source === null);

    expect(ids).toHaveLength(53);
    expect(enabled).toHaveLength(44);
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
