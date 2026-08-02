export interface SoundClock {
  now(): number;
}

export const systemSoundClock: SoundClock = Object.freeze({
  now: () => Date.now(),
});

