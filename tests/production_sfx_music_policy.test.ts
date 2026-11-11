import { SoundArbiter } from '../modules/audio/sound_arbiter';
import { createProductionSoundDirector } from '../modules/audio/sound_director';

class Backend {
  plays: string[] = [];
  prewarmed: string[] = [];
  play(id: string) { this.plays.push(id); return true; }
  stopExclusive() {}
  stopAll() {}
  prewarm(items: ReadonlyArray<{ eventId: string }>) { this.prewarmed.push(...items.map((x) => x.eventId)); }
  dispose() {}
}

test('production policy denies SFX play and prewarm even when legacy settings are enabled', () => {
  const backend = new Backend();
  const director = createProductionSoundDirector(backend as any, new SoundArbiter({ now: () => 1 } as any));
  director.setEffectsEnabled(true);
  director.request('pm.system.warning');
  director.prewarm(['pm.system.warning']);
  expect(backend.plays).toEqual([]);
  expect(backend.prewarmed).toEqual([]);
});
