import { arenaContentAvailableForTarget } from '../app/arena_target_gate';
import { maxVoiceContentAvailableForTarget } from '../app/max_target_gate';

describe('arena_target_gate', () => {
  it('is available for English', () => {
    expect(arenaContentAvailableForTarget('en')).toBe(true);
  });
  it('is unavailable for Spanish', () => {
    expect(arenaContentAvailableForTarget('es')).toBe(false);
  });
  it('is unavailable for French', () => {
    expect(arenaContentAvailableForTarget('fr')).toBe(false);
  });
});

describe('max_target_gate', () => {
  it('is available for English', () => {
    expect(maxVoiceContentAvailableForTarget('en')).toBe(true);
  });
  it('is unavailable for Spanish', () => {
    expect(maxVoiceContentAvailableForTarget('es')).toBe(false);
  });
  it('is unavailable for French', () => {
    expect(maxVoiceContentAvailableForTarget('fr')).toBe(false);
  });
});
