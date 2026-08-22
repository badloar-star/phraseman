// Тест №6 спеки MAX Voice: таймер подсказок при тишине.
// Время подаётся только через nowMs — никаких фейковых Date.now.

import { createHintTimer, type HintTimerConfig } from '../app/max_call_hint_timer';

const CFG: HintTimerConfig = { delaySec: 8, secondHintDelaySec: 10, maxPerSession: 4 };

describe('max_call_hint_timer', () => {
  describe('взвод только в listening при тишине', () => {
    it('выдаёт first после delaySec тишины в listening', () => {
      const t = createHintTimer(CFG);
      t.onPhase('listening', 0);
      expect(t.due(7_999)).toBeNull();
      expect(t.due(8_000)).toBe('first');
      expect(t.firedCount()).toBe(1);
    });

    it('без входа в listening тишина любой длины не даёт подсказку', () => {
      const t = createHintTimer(CFG);
      expect(t.due(60_000)).toBeNull();
      expect(t.firedCount()).toBe(0);
    });

    it('фазы thinking/ai_speaking (активный response) разоружают таймер', () => {
      for (const phase of ['thinking', 'ai_speaking']) {
        const t = createHintTimer(CFG);
        t.onPhase('listening', 0);
        t.onPhase(phase, 3_000);
        // Даже спустя порог подсказки нет — нет гонки с активным response.
        expect(t.due(30_000)).toBeNull();
      }
    });

    it('после выхода из чужой фазы отсчёт начинается заново от нового listening', () => {
      const t = createHintTimer(CFG);
      t.onPhase('listening', 0);
      t.onPhase('ai_speaking', 5_000);
      t.onPhase('listening', 12_000);
      expect(t.due(19_999)).toBeNull(); // 8с ещё не прошло от 12_000
      expect(t.due(20_000)).toBe('first');
    });

    it('дубль события listening не отодвигает уже взведённый отсчёт', () => {
      const t = createHintTimer(CFG);
      t.onPhase('listening', 0);
      t.onPhase('listening', 7_000); // дребезг того же состояния
      expect(t.due(8_000)).toBe('first');
    });
  });

  describe('сброс любым speech_started', () => {
    it('речь ученика сбрасывает отсчёт, подсказка не выдаётся', () => {
      const t = createHintTimer(CFG);
      t.onPhase('listening', 0);
      t.onSpeechStarted();
      expect(t.due(100_000)).toBeNull();
      expect(t.firedCount()).toBe(0);
    });

    it('не перевзводится, если аудио MAX закончилось, а ученик всё ещё говорит', () => {
      const t = createHintTimer(CFG);
      t.onPhase('ai_speaking', 0);
      t.onSpeechStarted();

      // output_audio_buffer.stopped переводит UI в listening, хотя начавшаяся
      // на хвосте MAX реплика ученика ещё продолжается.
      t.onPhase('listening', 1_000);

      expect(t.due(100_000)).toBeNull();
      expect(t.firedCount()).toBe(0);
    });

    it('после речи новая тишина отсчитывается с нового listening и снова с first', () => {
      const t = createHintTimer(CFG);
      t.onPhase('listening', 0);
      expect(t.due(8_000)).toBe('first'); // уже была первая подсказка
      t.onSpeechStarted(); // ученик ответил
      t.onSpeechStopped();
      t.onPhase('listening', 20_000); // и снова замолчал
      expect(t.due(27_999)).toBeNull();
      expect(t.due(28_000)).toBe('first'); // цикл начинается заново
    });
  });

  describe('вторая подсказка и перевзвод', () => {
    it('second приходит через secondHintDelaySec после выданной first', () => {
      const t = createHintTimer(CFG);
      t.onPhase('listening', 0);
      expect(t.due(8_000)).toBe('first');
      expect(t.due(17_999)).toBeNull(); // 10с от момента выдачи ещё не прошло
      expect(t.due(18_000)).toBe('second');
      expect(t.firedCount()).toBe(2);
    });

    it('повторный опрос в тот же момент не дублирует подсказку (перевзвод)', () => {
      const t = createHintTimer(CFG);
      t.onPhase('listening', 0);
      expect(t.due(8_000)).toBe('first');
      expect(t.due(8_000)).toBeNull(); // гонка поллинга → тихий no-op
      expect(t.firedCount()).toBe(1);
    });
  });

  describe('кэп подсказок на сессию', () => {
    it('после maxPerSession суммарных подсказок всегда null', () => {
      const t = createHintTimer(CFG);
      t.onPhase('listening', 0);
      let now = 0;
      const got: string[] = [];
      for (let i = 0; i < 10; i++) {
        now += 20_000; // заведомо больше любого порога
        const kind = t.due(now);
        if (kind) got.push(kind);
      }
      expect(got).toEqual(['first', 'second', 'second', 'second']);
      expect(t.firedCount()).toBe(4);
      expect(t.due(now + 100_000)).toBeNull();
    });

    it('кэп суммарный: сбросы речью не возвращают лимит', () => {
      const t = createHintTimer(CFG);
      let now = 0;
      for (let i = 0; i < 4; i++) {
        t.onPhase('listening', now);
        expect(t.due(now + 8_000)).toBe('first');
        t.onSpeechStarted();
        t.onSpeechStopped();
        now += 30_000;
      }
      t.onPhase('listening', now);
      expect(t.due(now + 100_000)).toBeNull();
      expect(t.firedCount()).toBe(4);
    });
  });

  describe('пороги per-CEFR из конфига', () => {
    it('B1/B2 конфиг с 9с срабатывает позже, чем A1/A2 с 8с', () => {
      const b1 = createHintTimer({ ...CFG, delaySec: 9 });
      b1.onPhase('listening', 0);
      expect(b1.due(8_000)).toBeNull(); // на пороге A1 ещё рано
      expect(b1.due(9_000)).toBe('first');
    });
  });

  describe('запрет в reconnecting', () => {
    it('reconnecting разоружает таймер до нового listening', () => {
      const t = createHintTimer(CFG);
      t.onPhase('listening', 0);
      t.onPhase('reconnecting', 4_000);
      expect(t.due(60_000)).toBeNull();
      t.onPhase('listening', 60_000);
      expect(t.due(68_000)).toBe('first');
    });

    it('reconnecting между first и second отменяет ожидание second', () => {
      const t = createHintTimer(CFG);
      t.onPhase('listening', 0);
      expect(t.due(8_000)).toBe('first');
      t.onPhase('reconnecting', 10_000);
      expect(t.due(100_000)).toBeNull();
    });
  });
});
