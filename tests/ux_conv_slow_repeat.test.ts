// Удобство №2 (владелец одобрил 04.11): второе нажатие кнопки звука той же фразы за ~3 с — медленнее 0,7× через системный голос, с меткой.
import fs from 'node:fs';
import path from 'node:path';

import { SLOW_REPEAT_MIN_GAP_MS, SLOW_REPEAT_RATE, SLOW_REPEAT_WINDOW_MS, isSlowRepeat } from '../app/slow_repeat';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('правило медленного повтора', () => {
  it('скорость 0,7×, окно 3 с', () => {
    expect(SLOW_REPEAT_RATE).toBe(0.7);
    expect(SLOW_REPEAT_WINDOW_MS).toBe(3000);
  });
  it('тот же текст внутри окна — медленно', () => {
    expect(isSlowRepeat({ sameText: true, sinceLastMs: 800 })).toBe(true);
    expect(isSlowRepeat({ sameText: true, sinceLastMs: SLOW_REPEAT_MIN_GAP_MS })).toBe(true);
    expect(isSlowRepeat({ sameText: true, sinceLastMs: SLOW_REPEAT_WINDOW_MS - 1 })).toBe(true);
  });
  it('другой текст, слишком быстрый дубль и «давно» — обычная скорость', () => {
    expect(isSlowRepeat({ sameText: false, sinceLastMs: 800 })).toBe(false);
    expect(isSlowRepeat({ sameText: true, sinceLastMs: SLOW_REPEAT_MIN_GAP_MS - 1 })).toBe(false);
    expect(isSlowRepeat({ sameText: true, sinceLastMs: SLOW_REPEAT_WINDOW_MS })).toBe(false);
  });
});

describe('проводка в озвучку', () => {
  const audio = read('hooks/use-audio.ts');
  it('только по opt-in slowRepeat, без явной скорости и записей Learning V2', () => {
    expect(audio).toContain('slowRepeat?: boolean;');
    expect(audio).toContain('opts?.slowRepeat === true && rate === undefined && !opts.learningV2Recorded');
  });
  it('медленный повтор идёт через системный голос, скорость 0,7 в обход нижней границы настроек', () => {
    expect(audio).toContain('opts = { ...opts, systemTtsOnly: true };');
    expect(audio).toContain('const safeRate = slowRepeatActive ? SLOW_REPEAT_RATE : normalizeSpeechRate(');
  });
  it('метка — тост на 9 языках без мелких подписей', () => {
    const src = read('app/slow_repeat.ts');
    for (const text of ['Медленнее 0,7×', 'Повільніше 0,7×', 'Slower 0.7×', 'Más lento 0,7×', 'Mais devagar 0,7×', 'Chậm hơn 0,7×', 'Lebih lambat 0,7×', 'Daha yavaş 0,7×', 'Wolniej 0,7×']) {
      expect(src).toContain(text);
    }
  });
  it('список слов Learning V2 включает медленный повтор', () => {
    expect(read('components/learning-v2/words/LearningV2WordsList.tsx')).toContain('slowRepeat: true');
  });
});
