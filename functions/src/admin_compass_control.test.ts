import {
  buildCompassWorkspaceConfig,
  compassPatchIsEmergencyOff,
  parseCompassPatch,
  protectedCompassChanges,
} from './admin_compass_control';

describe('admin Compass control contracts', () => {
  test('accepts only seven booleans and three bounded fallback texts', () => {
    expect(parseCompassPatch({
      bools: { compass_enabled: false, compass_topic_map_enabled: true },
      texts: { compass_voice_fallback_ru: 'Текст' },
    })).toEqual({
      bools: { compass_enabled: false, compass_topic_map_enabled: true },
      texts: { compass_voice_fallback_ru: 'Текст' },
    });
    expect(() => parseCompassPatch({ bools: { maintenance_block: true } })).toThrow('unsupported_compass_key');
    expect(() => parseCompassPatch({ texts: { compass_voice_fallback_ru: 'x'.repeat(501) } })).toThrow('compass_fallback_too_long');
    expect(() => parseCompassPatch({})).toThrow('empty_compass_patch');
  });

  test('only a pure emergency-off patch bypasses second-admin approval', () => {
    expect(compassPatchIsEmergencyOff({ bools: { compass_enabled: false } })).toBe(true);
    expect(compassPatchIsEmergencyOff({ bools: { compass_ai_voice_enabled: false } })).toBe(true);
    expect(compassPatchIsEmergencyOff({ bools: { compass_enabled: false, compass_ai_voice_enabled: false } })).toBe(true);
    expect(compassPatchIsEmergencyOff({ bools: { compass_enabled: true } })).toBe(false);
    expect(compassPatchIsEmergencyOff({ bools: { compass_enabled: false, compass_topic_map_enabled: false } })).toBe(false);
    expect(compassPatchIsEmergencyOff({ texts: { compass_voice_fallback_ru: 'Fallback' } })).toBe(false);
  });

  test('returns configured and effective defaults without exposing the full remote config', () => {
    const workspace = buildCompassWorkspaceConfig({
      revision: 8,
      bools: { compass_enabled: false, unrelated_secret_flag: true },
      texts: { compass_voice_fallback_ru: 'Своя строка', unrelated_private_text: 'private' },
    });
    expect(workspace.revision).toBe(8);
    expect(workspace.bools.compass_enabled).toEqual({ configured: false, effective: false, defaultValue: true });
    expect(workspace.bools.compass_ai_voice_enabled).toEqual({ configured: null, effective: true, defaultValue: true });
    expect(workspace.texts.compass_voice_fallback_ru).toEqual({ configured: 'Своя строка', effective: 'Своя строка', usesBuiltIn: false });
    expect(JSON.stringify(workspace)).not.toContain('unrelated_secret_flag');
    expect(JSON.stringify(workspace)).not.toContain('unrelated_private_text');
  });

  test('generic remote-config publisher detects actual protected changes but permits unchanged full branches', () => {
    const before = { bools: { compass_enabled: false, maintenance: false }, texts: { compass_voice_fallback_ru: 'old' } };
    expect(protectedCompassChanges(before, { bools: { compass_enabled: false, maintenance: true } })).toEqual([]);
    expect(protectedCompassChanges(before, { bools: { compass_enabled: true } })).toEqual(['bools.compass_enabled']);
    expect(protectedCompassChanges(before, { texts: { compass_voice_fallback_ru: 'new' } })).toEqual(['texts.compass_voice_fallback_ru']);
  });
});
