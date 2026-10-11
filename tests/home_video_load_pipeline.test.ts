import { createHomeVideoLoadPipeline } from '../app/home_video_load_pipeline';

// зачем (Сверка 02:15, HOME-COLD_cold3: video:start ×2, video:resolved ×2 с alive:false): перезапуск эффекта ленты
// во время загрузки не запускает вторую цепочку — подписывается на первую.
describe('home video load pipeline', () => {
  it('a restart while loading joins the running chain; the unsubscribed listener gets nothing', async () => {
    const pipeline = createHomeVideoLoadPipeline<string>();
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const start = jest.fn(async (emit: (snapshot: string, source: 'cache' | 'network') => void) => {
      emit('cached', 'cache');
      await gate;
      emit('fresh', 'network');
    });
    const first: string[] = [];
    const second: string[] = [];

    const a = pipeline.run((snapshot, source) => first.push(`${source}:${snapshot}`), start);
    await Promise.resolve();
    await Promise.resolve();
    a.unsubscribe(); // эффект перезапустился — прежний запуск отписался
    const b = pipeline.run((snapshot, source) => second.push(`${source}:${snapshot}`), start);

    expect(a.joined).toBe(false);
    expect(b.joined).toBe(true);
    expect(pipeline.isRunning()).toBe(true);
    finish();
    await gate;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(start).toHaveBeenCalledTimes(1);
    expect(first).toEqual(['cache:cached']);
    expect(second).toEqual(['network:fresh']);
    expect(pipeline.isRunning()).toBe(false);
  });

  it('after the chain finishes the next run (a new focus) starts again', async () => {
    const pipeline = createHomeVideoLoadPipeline<string>();
    const start = jest.fn(async (emit: (snapshot: string, source: 'cache' | 'network') => void) => { emit('ok', 'network'); });
    const seen: string[] = [];
    pipeline.run((snapshot) => seen.push(snapshot), start).unsubscribe;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const again = pipeline.run((snapshot) => seen.push(snapshot), start);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(again.joined).toBe(false);
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('a failing chain is logged and frees the pipeline', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const pipeline = createHomeVideoLoadPipeline<string>();
    pipeline.run(() => undefined, async () => { throw new Error('import failed'); });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pipeline.isRunning()).toBe(false);
    expect(warn).toHaveBeenCalledWith('[HOME-COLD] video:pipeline_error', 'import failed');
    warn.mockRestore();
  });
});
