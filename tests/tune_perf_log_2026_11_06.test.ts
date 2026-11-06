// зачем (🔴 владелец 06.11 «лаги ползунков», правило «сперва логи»): замер жеста [THEME-SLIDERS] perf — одна строка на жест с числом шагов,
// коммитов ThemeContext, перерисовок, записей на диск и задержкой JS-кадра. Сторож чистого модуля.
import { createTunePerf, type TunePerfSummary } from '../components/settings/tune_perf_log';

describe('tune_perf_log', () => {
  it('один жест → одна строка; ctxCommits = коммиты во время жеста + 1 запись при отпускании', () => {
    let t = 0;
    const rafs: (() => void)[] = [];
    const out: TunePerfSummary[] = [];
    const perf = createTunePerf({ now: () => t, raf: (cb) => { rafs.push(cb); }, log: (s) => out.push(s) });
    for (let i = 0; i < 5; i += 1) { perf.preview('hue'); t += 16; rafs.shift()!(); perf.render(); }
    t += 100;
    const s = perf.end('hue', true);
    expect(out).toHaveLength(1);
    expect(s).toEqual(expect.objectContaining({ target: 'hue', previews: 5, ctxCommits: 1, screenRenders: 5, diskWrites: 1, frameAvgMs: 16, frameMaxMs: 16 }));
    expect(s!.gestureMs).toBe(180);
  });
  it('коммиты ThemeContext во время жеста считаются (так выглядел замер «до»)', () => {
    let t = 0;
    const perf = createTunePerf({ now: () => t, raf: (cb) => { t += 400; cb(); }, log: () => undefined });
    for (let i = 0; i < 3; i += 1) { perf.preview('saturation'); perf.ctxCommit(); }
    const s = perf.end('saturation', true)!;
    expect(s.ctxCommits).toBe(4);
    expect(s.frameMaxMs).toBe(400);
  });
});
