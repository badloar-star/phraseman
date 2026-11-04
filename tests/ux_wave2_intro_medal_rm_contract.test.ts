// Сторож (UX-волна 2, 04.11, владелец одобрил): введение урока и окно медали уважают «Уменьшение движения».
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Reduce Motion: введение урока и окно медали', () => {
  it('введение урока: покачивание подсказки и «дыхание» кнопки не стартуют', () => {
    const s = read('app/lesson_intro_screens.tsx');
    expect(s).toContain('if (!reduceMotion) bob.start();');
    expect(s).toContain('if (!reduceMotion) pulse.start();');
    expect(s).toContain('lessonIntroRuntimeActive, reduceMotion]');
  });
  it('окно медали: без пружинного подъезда, только короткое проявление', () => {
    const s = read('app/lesson_complete.tsx');
    expect(s).toContain("import { useReduceMotion } from '../hooks/use_reduce_motion';");
    expect(s).toContain('if (reduceMotion) {\n      translateY.setValue(0);');
    expect(s).toContain('[opacity, translateY, reduceMotion]');
  });
});
