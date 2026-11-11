// зачем (владелец 11.11 «ползунки всё равно тормозят»; журнал 22:49 — строка [PLATE-TONE] на каждый шаг ползунка «Оформление»):
// у тем-ползунков каждый шаг — новый tune:H:S, и «один раз на сочетание» становился логом на каждый кадр жеста. Сторож: темы-ползунки
// одного оформления/уровня логируются ОДИН раз, именные темы — как раньше, по одной строке на тему.
import { logPlateToneOnce, plateToneFor } from '../components/v2/plateTone';

const g = { isLight: true, level: 'max', intensity: 1, plateFillFrom: '#FFFFFF', plateFillTo: '#FCFBFF' } as const;
const pal = { smoke: '#FFFFFF', smokeBoost: 1, sheenFrom: 'rgba(255,255,255,0.65)', sheenTo: 'rgba(255,255,255,0)' };

describe('[PLATE-TONE] на ползунках «Оформление»', () => {
  it('шаги ползунка (разные tune:H:S) дают одну строку, а не строку на шаг', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const tone = plateToneFor(g, pal);
    for (let h = 0; h < 40; h += 1) logPlateToneOnce(`tune:${h}:27`, g, pal, tone);
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0]?.[0])).toContain('[PLATE-TONE] theme=tune:0:27');
    logPlateToneOnce('plate-tone-named-a', g, pal, tone);
    logPlateToneOnce('plate-tone-named-b', g, pal, tone);
    expect(log).toHaveBeenCalledTimes(3);
    log.mockRestore();
  });
});
