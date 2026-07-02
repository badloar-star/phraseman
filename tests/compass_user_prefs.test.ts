import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_COMPASS_USER_PREFS,
  loadCompassUserPrefs,
  parseCompassUserPrefs,
  saveCompassUserPrefs,
} from '../app/compass/compass_user_prefs';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('compass user prefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to everything enabled (behaviour unchanged before the settings screen)', async () => {
    expect(await loadCompassUserPrefs()).toEqual(DEFAULT_COMPASS_USER_PREFS);
    expect(DEFAULT_COMPASS_USER_PREFS).toEqual({ briefing: true, dayClosing: true, aiVoice: true, social: true });
  });

  it('parses stored prefs defensively (garbage → defaults, partial → merged)', () => {
    expect(parseCompassUserPrefs(null)).toEqual(DEFAULT_COMPASS_USER_PREFS);
    expect(parseCompassUserPrefs('not json')).toEqual(DEFAULT_COMPASS_USER_PREFS);
    expect(parseCompassUserPrefs('{"briefing":false}')).toEqual({ ...DEFAULT_COMPASS_USER_PREFS, briefing: false });
    expect(parseCompassUserPrefs('{"aiVoice":"nope"}')).toEqual(DEFAULT_COMPASS_USER_PREFS);
  });

  it('persists partial patches immutably and round-trips', async () => {
    const afterPatch = await saveCompassUserPrefs({ dayClosing: false });
    expect(afterPatch).toEqual({ ...DEFAULT_COMPASS_USER_PREFS, dayClosing: false });

    const reloaded = await loadCompassUserPrefs();
    expect(reloaded).toEqual({ ...DEFAULT_COMPASS_USER_PREFS, dayClosing: false });

    const second = await saveCompassUserPrefs({ social: false });
    expect(second).toEqual({ ...DEFAULT_COMPASS_USER_PREFS, dayClosing: false, social: false });
  });

  it('gates every Compass surface: host (briefing/dayClosing/social) and voice (aiVoice)', () => {
    const host = read('app/compass/compass_briefing_host.tsx');
    expect(host).toContain('loadCompassUserPrefs');
    expect(host).toContain("userPrefs?.briefing === true");
    expect(host).toContain("userPrefs?.dayClosing !== true");
    expect(host).toContain("userPrefs?.social !== true");

    const voice = read('app/compass/use_compass_voice.ts');
    expect(voice).toContain('loadCompassUserPrefs');
    expect(voice).toContain('prefs.aiVoice');
  });

  it('exposes the settings entry point and the dedicated screen', () => {
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).toContain("router.push('/compass_settings'");

    const screen = read('app/compass_settings.tsx');
    for (const id of [
      'compass-settings-briefing',
      'compass-settings-day-closing',
      'compass-settings-ai-voice',
      'compass-settings-social',
    ]) {
      expect(screen).toContain(id);
    }
    expect(screen).toContain('saveCompassUserPrefs');
  });
});
