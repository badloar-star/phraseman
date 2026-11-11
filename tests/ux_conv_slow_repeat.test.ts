// зачем (владелец 11.11.2026, «Убрать медленный повтор»): удобство №2 от 04.11 — второе нажатие на ту же фразу за ~3 с
// само замедляло её до 0,7× и показывало метку — снято. Оно работало только на голосе телефона, а с новой озвучкой
// курса (записи играют как записаны) перестало срабатывать там, где человек его ждал. Сторож не даёт ему вернуться
// незаметно и держит то, что осталось: явная кнопка «Медленнее» в меню реплики диалога.
import fs from 'node:fs';
import path from 'node:path';

import * as slowRepeat from '../app/slow_repeat';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('медленный повтор снят', () => {
  const audio = read('hooks/use-audio.ts');

  it('в модуле осталась только скорость явной кнопки «Медленнее»', () => {
    expect(slowRepeat.SLOW_NOW_RATE).toBe(0.7);
    expect(Object.keys(slowRepeat)).toEqual(['SLOW_NOW_RATE']);
  });

  it('общая функция озвучки не замедляет повторное нажатие и не показывает метку', () => {
    expect(audio).not.toContain('slowRepeat');
    expect(audio).not.toContain('slowByRepeat');
    expect(audio).not.toContain('isSlowRepeat');
    expect(audio).not.toContain('emitSlowRepeatToast');
  });

  it('метки «Медленнее 0,7×» в приложении больше нет', () => {
    const src = read('app/slow_repeat.ts');
    expect(src).not.toContain('actionToastTri');
    expect(src).not.toContain('Slower 0.7×');
  });

  it('явная кнопка «Медленнее» по-прежнему идёт голосом телефона на 0,7×', () => {
    expect(audio).toContain('const slowNow = opts?.slowNow === true;');
    expect(audio).toContain('opts = { ...opts, systemTtsOnly: true };');
    expect(audio).toContain('const safeRate = slowNow ? SLOW_NOW_RATE : normalizeSpeechRate(undefined);');
  });
});
