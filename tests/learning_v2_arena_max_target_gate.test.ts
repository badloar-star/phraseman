import { arenaContentAvailableForTarget } from '../app/arena_target_gate';
import { maxVoiceContentAvailableForTarget } from '../app/max_target_gate';

describe('arena_target_gate', () => {
  it('fails closed until every target receives an explicit readiness decision', () => {
    for (const target of ['en', 'es', 'fr', 'de'] as const) {
      expect(arenaContentAvailableForTarget(target)).toBe(false);
      expect(arenaContentAvailableForTarget(target, undefined)).toBe(false);
    }
  });

  it('opens only a target explicitly marked ready', () => {
    for (const target of ['en', 'es', 'fr', 'de'] as const) {
      expect(arenaContentAvailableForTarget(target, { [target]: true })).toBe(true);
      expect(arenaContentAvailableForTarget(target, { [target]: false })).toBe(false);
    }
  });

  it('rejects unsupported targets even when another target is ready', () => {
    expect(arenaContentAvailableForTarget('it' as never, { en: true })).toBe(false);
  });
});

describe('max_target_gate', () => {
  it('is available for English', () => {
    expect(maxVoiceContentAvailableForTarget('en')).toBe(true);
  });
  it('is available for Spanish', () => {
    expect(maxVoiceContentAvailableForTarget('es')).toBe(true);
  });
  it('is available for French', () => {
    expect(maxVoiceContentAvailableForTarget('fr')).toBe(true);
  });
});
