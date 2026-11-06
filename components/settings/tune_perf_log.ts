// ═══════════════════════════════════════════════════════════════════════════
// tune_perf_log.ts — замер жеста ползунков «Оформление»: [THEME-SLIDERS] perf.
//
// зачем (🔴 слово владельца 06.11, TestFlight 150: «при прокрутке ЛЮБОГО из двух ползунков ужасные лаги»; правило «сперва логи»): за каждый жест
// в журнал уходит ОДНА строка — сколько шагов прислал ползунок (previews), сколько раз за жест менялся ThemeContext (ctxCommits), сколько
// перерисовок экрана (screenRenders), сколько записей на диск (diskWrites), длительность жеста и задержка JS-кадра после шага (avg/max мс:
// от смены шага до следующего requestAnimationFrame — в неё входит перерисовка всего, что подписано на тему). Чистый модуль, без React.
// ═══════════════════════════════════════════════════════════════════════════

export type TunePerfSummary = Readonly<{
  target: string;
  previews: number;
  ctxCommits: number;
  screenRenders: number;
  diskWrites: number;
  gestureMs: number;
  frameAvgMs: number;
  frameMaxMs: number;
}>;

type Deps = Readonly<{
  now: () => number;
  raf: (cb: () => void) => void;
  log: (summary: TunePerfSummary) => void;
}>;

export type TunePerf = Readonly<{
  /** Шаг ползунка пришёл в JS (превью). */
  preview: (target: string) => void;
  /** ThemeContext изменён (превью или запись). */
  ctxCommit: () => void;
  /** Экран перерисовался. */
  render: () => void;
  /** Отпускание: запись (в ThemeContext и на диск) — итог жеста в журнал. */
  end: (target: string, wrote: boolean) => TunePerfSummary | null;
}>;

export function createTunePerf(deps: Deps): TunePerf {
  let g: { target: string; t0: number; previews: number; ctx: number; renders: number; frames: number[] } | null = null;
  const ensure = (target: string) => {
    if (!g) g = { target, t0: deps.now(), previews: 0, ctx: 0, renders: 0, frames: [] };
    return g;
  };
  return Object.freeze({
    preview(target: string) {
      const cur = ensure(target);
      cur.previews += 1;
      const t = deps.now();
      deps.raf(() => { if (g === cur) cur.frames.push(deps.now() - t); });
    },
    ctxCommit() { if (g) g.ctx += 1; },
    render() { if (g) g.renders += 1; },
    end(target: string, wrote: boolean) {
      const cur = ensure(target);
      g = null;
      const frames = cur.frames;
      const summary: TunePerfSummary = {
        target,
        previews: cur.previews,
        ctxCommits: cur.ctx + (wrote ? 1 : 0),
        screenRenders: cur.renders,
        diskWrites: wrote ? 1 : 0,
        gestureMs: Math.round(deps.now() - cur.t0),
        frameAvgMs: frames.length ? Math.round((frames.reduce((a, b) => a + b, 0) / frames.length) * 10) / 10 : 0,
        frameMaxMs: frames.length ? Math.round(Math.max(...frames) * 10) / 10 : 0,
      };
      deps.log(summary);
      return summary;
    },
  });
}
