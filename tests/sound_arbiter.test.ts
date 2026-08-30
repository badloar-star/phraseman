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
    // pm.subscription.manage_open (36) — низкий приоритет; прежний участник
    // pm.learn.hint_reveal удалён владельцем навсегда (2026-08-30).
    expect(arbiter.request('pm.subscription.manage_open')).toEqual({ kind: 'drop', reason: 'priority' });
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
    // зачем 2026-08-03 (владелец: «убрать эффект серии полностью»): комбо-звуки
    // combo_5/combo_10 удалены — вердикт больше не зависит от длины серии.
    expect(setup().arbiter.requestLearningVerdict({ correct: true })).toMatchObject({
      kind: 'play', eventId: 'pm.learn.correct',
    });
    expect(setup().arbiter.requestLearningVerdict({
      correct: true,
      completesUnit: true,
      completionEvent: 'pm.complete.session',
    })).toMatchObject({ kind: 'play', eventId: 'pm.complete.session' });
    expect(setup().arbiter.requestLearningVerdict({ correct: false })).toMatchObject({
      kind: 'play', eventId: 'pm.learn.needs_work',
    });
  });

  test('disabling effects clears state, stops eligibility, and missing assets fail silently', () => {
    const { arbiter } = setup();
    expect(arbiter.request('pm.reward.vip_finale')).toEqual({ kind: 'drop', reason: 'missing' });
    arbiter.request('pm.learn.correct');
    arbiter.setEffectsEnabled(false);
    expect(arbiter.hasActiveSound()).toBe(false);
    expect(arbiter.request('pm.system.warning')).toEqual({ kind: 'drop', reason: 'disabled' });
  });

  /**
   * зачем 2026-08-04 (владелец: «звуки в турнире работают рандомно и через
   * раз»): общий лимит 2/сек рассчитан на редкие события одиночного урока. В
   * турнире тап по паре, вердикт и тик таймера легитимно случаются чаще —
   * scoped rateLimit даёт турнирному экрану свой бюджет, не трогая остальные.
   */
  describe('scoped rateLimit overrides the shared 2-per-second budget', () => {
    test('a scope with rateLimit gets its own higher budget', () => {
      const { arbiter, clock } = setup();
      const opts = { scope: 'tournament-round', rateLimit: { maxStarts: 5, windowMs: 1000 } };
      // Пять разных событий подряд в ту же секунду — все play, третье уже
      // превысило бы общий лимит 2/сек, если бы шло через общий трекер.
      expect(arbiter.request('pm.learn.correct', opts).kind).toBe('play');
      arbiter.finishActive();
      clock.advance(10);
      expect(arbiter.request('pm.learn.needs_work', opts).kind).toBe('play');
      arbiter.finishActive();
      clock.advance(10);
      expect(arbiter.request('pm.learn.timer_warning', opts).kind).toBe('play');
      arbiter.finishActive();
      clock.advance(10);
      expect(arbiter.request('pm.system.warning', opts).kind).toBe('play');
      arbiter.finishActive();
      clock.advance(10);
      expect(arbiter.request('pm.system.info', opts).kind).toBe('play');
      arbiter.finishActive();
      clock.advance(10);
      // Шестое в то же окно — бюджет scope исчерпан.
      expect(arbiter.request('pm.system.error_recoverable', opts)).toEqual({ kind: 'drop', reason: 'rate-limit' });
    });

    test('a scoped budget does not weaken the shared budget for other scopes', () => {
      const { arbiter, clock } = setup();
      const scoped = { scope: 'tournament-round', rateLimit: { maxStarts: 5, windowMs: 1000 } };
      // Burn through the tournament scope's raised budget with five distinct
      // events (each event also has its own cooldown, so reusing one event
      // would falsely fail on that cooldown rather than the rate limit).
      const scopedEvents = [
        'pm.learn.correct', 'pm.learn.needs_work', 'pm.learn.timer_warning',
        'pm.system.warning', 'pm.system.info',
      ] as const;
      for (const eventId of scopedEvents) {
        expect(arbiter.request(eventId, scoped).kind).toBe('play');
        arbiter.finishActive();
        clock.advance(10);
      }
      // An unrelated caller with NO scope still hits the original 2-per-second
      // shared limit — the raised tournament budget must not leak into it.
      expect(arbiter.request('pm.system.success').kind).toBe('play');
      arbiter.finishActive();
      clock.advance(10);
      expect(arbiter.request('pm.system.error_recoverable').kind).toBe('play');
      arbiter.finishActive();
      clock.advance(10);
      expect(arbiter.request('pm.system.destructive_done')).toEqual({ kind: 'drop', reason: 'rate-limit' });
    });

    test('without rateLimit, a scope still falls back to the shared 2-per-second budget', () => {
      const { arbiter, clock } = setup();
      expect(arbiter.request('pm.learn.correct', { scope: 'phase-timer' }).kind).toBe('play');
      arbiter.finishActive();
      clock.advance(10);
      expect(arbiter.request('pm.learn.needs_work', { scope: 'phase-timer' }).kind).toBe('play');
      arbiter.finishActive();
      clock.advance(10);
      expect(arbiter.request('pm.system.warning', { scope: 'phase-timer' }))
        .toEqual({ kind: 'drop', reason: 'rate-limit' });
    });
  });
});
