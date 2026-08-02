import { SoundArbiter } from '@/modules/audio/sound_arbiter';
import type { SoundClock } from '@/modules/audio/sound_clock';

class FakeClock implements SoundClock {
  nowMs = 0;
  now = () => this.nowMs;
  advance(ms: number) { this.nowMs += ms; }
}

function setup() {
  const clock = new FakeClock();
  const arbiter = new SoundArbiter(clock);
  return { clock, arbiter };
}

describe('SoundArbiter', () => {
  test('allows one active SFX and only a higher priority request can preempt it', () => {
    const { arbiter } = setup();
    expect(arbiter.request('pm.system.info')).toMatchObject({ kind: 'play', preempt: false });
    expect(arbiter.request('pm.learn.hint_reveal')).toEqual({ kind: 'drop', reason: 'priority' });
    expect(arbiter.request('pm.system.error_recoverable')).toMatchObject({
      kind: 'play',
      eventId: 'pm.system.error_recoverable',
      preempt: true,
    });
  });

  test('deduplicates keys, respects event cooldown and limits starts to two per rolling second', () => {
    const { arbiter, clock } = setup();
    expect(arbiter.request('pm.learn.correct', { dedupeKey: 'answer:1' }).kind).toBe('play');
    arbiter.finishActive();
    expect(arbiter.request('pm.learn.correct', { dedupeKey: 'answer:1' })).toEqual({ kind: 'drop', reason: 'dedupe' });

    clock.advance(170);
    expect(arbiter.request('pm.learn.correct', { dedupeKey: 'answer:2' }).kind).toBe('play');
    arbiter.finishActive();
    clock.advance(170);
    expect(arbiter.request('pm.system.error_recoverable')).toEqual({ kind: 'drop', reason: 'rate-limit' });

    clock.advance(661);
    expect(arbiter.request('pm.system.error_recoverable').kind).toBe('play');
  });

  test('blocks all SFX during recording and clears pending work', () => {
    const { arbiter } = setup();
    arbiter.setVoiceActive(true);
    expect(arbiter.request('pm.system.info')).toMatchObject({ kind: 'defer' });

    arbiter.setRecordingActive(true);
    expect(arbiter.request('pm.learn.timer_expired')).toEqual({ kind: 'drop', reason: 'recording' });
    arbiter.setRecordingActive(false);
    arbiter.setVoiceActive(false);
    expect(arbiter.flushDeferred()).toBeNull();
  });

  test('defers only one fresh low-priority request until 250ms after voice', () => {
    const { arbiter, clock } = setup();
    arbiter.setVoiceActive(true);

    expect(arbiter.request('pm.system.info')).toMatchObject({ kind: 'defer', eventId: 'pm.system.info' });
    expect(arbiter.request('pm.system.success')).toMatchObject({ kind: 'defer', eventId: 'pm.system.success' });
    expect(arbiter.request('pm.learn.timer_expired')).toEqual({ kind: 'drop', reason: 'voice' });

    arbiter.setVoiceActive(false);
    clock.advance(249);
    expect(arbiter.flushDeferred()).toBeNull();
    clock.advance(1);
    expect(arbiter.flushDeferred()).toMatchObject({ kind: 'play', eventId: 'pm.system.success' });
    expect(arbiter.flushDeferred()).toBeNull();
  });

  test('drops a stale deferred request instead of creating a FIFO backlog', () => {
    const { arbiter, clock } = setup();
    arbiter.setVoiceActive(true);
    arbiter.request('pm.reward.small');
    clock.advance(2100);
    arbiter.setVoiceActive(false);
    clock.advance(250);

    expect(arbiter.flushDeferred()).toBeNull();
  });

  test('selects exactly one semantic learning verdict', () => {
    expect(setup().arbiter.requestLearningVerdict({ correct: true, combo: 5 })).toMatchObject({
      kind: 'play', eventId: 'pm.learn.combo_5',
    });
    expect(setup().arbiter.requestLearningVerdict({
      correct: true,
      combo: 10,
      completesUnit: true,
      completionEvent: 'pm.complete.session',
    })).toMatchObject({ kind: 'play', eventId: 'pm.complete.session' });
    expect(setup().arbiter.requestLearningVerdict({ correct: false })).toMatchObject({
      kind: 'play', eventId: 'pm.learn.needs_work',
    });
  });

  test('disabling effects clears state, stops eligibility, and missing assets fail silently', () => {
    const { arbiter } = setup();
    expect(arbiter.request('pm.arena.victory')).toEqual({ kind: 'drop', reason: 'missing' });
    arbiter.request('pm.learn.correct');
    arbiter.setEffectsEnabled(false);
    expect(arbiter.hasActiveSound()).toBe(false);
    expect(arbiter.request('pm.system.warning')).toEqual({ kind: 'drop', reason: 'disabled' });
  });
});
