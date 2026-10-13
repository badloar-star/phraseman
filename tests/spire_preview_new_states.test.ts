// зачем (координатор 14.10, R1_SHOT_LIST «нет пути» по Шпилю): новые состояния dev-превью открываются через dev_spire_preview?state=…
// и показывают ровно то, что просит строка съёмки. Моки — чистые данные: ни сети, ни записей, лог [DEV-STATE] на каждой ветке.
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SPIRE_PREVIEW_STATES,
  isSpirePreviewState,
  isSpireStepPreviewState,
  spirePreviewModel,
  spireStepPreview,
} from '../components/spire/spire_preview_fixtures';
import { spireIsGuard } from '../components/spire/spire_tower_model';
import { resolveSpireListenAudio } from '../modules/spire/listen_audio';

const NEW_STATES = [
  'weekresult_stay', 'weekresult_down', 'passed', 'guard', 'block_missing', 'block_offline',
  'step_gap', 'step_odd', 'step_listen_choose', 'step_listen_build',
] as const;

describe('новые состояния превью Шпиля', () => {
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { log.mockRestore(); });

  it('все новые состояния распознаются и есть в списке (селектор ?selector=1 их покажет)', () => {
    for (const state of NEW_STATES) {
      expect(isSpirePreviewState(state)).toBe(true);
      expect(SPIRE_PREVIEW_STATES).toContain(state);
    }
    expect(new Set(SPIRE_PREVIEW_STATES).size).toBe(SPIRE_PREVIEW_STATES.length);
  });

  it('итог недели: «остаёшься» (ни повышения, ни спуска) и «спускаешься» (ранг ниже)', () => {
    const stay = spirePreviewModel('weekresult_stay').game.weekResult!;
    expect(stay).toMatchObject({ promoted: false, demoted: false });
    expect(stay.newTier).toBe(stay.prevTier);
    const down = spirePreviewModel('weekresult_down').game.weekResult!;
    expect(down).toMatchObject({ promoted: false, demoted: true });
    expect(down.newTier).toBeLessThan(down.prevTier);
    expect(spirePreviewModel('weekresult').game.weekResult).toMatchObject({ promoted: true, demoted: false });
  });

  it('итог ступени «passed» и этаж перед стражем', () => {
    const passed = spirePreviewModel('passed').game.outcome!;
    expect(passed.kind).toBe('passed');
    const guard = spirePreviewModel('guard');
    expect(guard.game.outcome!.kind).toBe('floor');
    expect(guard.week!.floor).toBe(5);
    expect(spireIsGuard(guard.week!.floor)).toBe(true);
    expect(guard.game.outcome!.floorBefore).toBe(4);
  });

  // зачем (R1 spire-012): ссылка Макетов floor=4 уводила Стража на этаж 2 (сдвиг от базового 7) — «Этаж 1 → 2» вместо «Этаж 4 → Страж».
  it('страж с floor= — ближайший этаж Стража выше заданного', () => {
    const at4 = spirePreviewModel('guard', { tier: 0, floor: 4 });
    expect(at4.week!.floor).toBe(5);
    expect(at4.game.outcome!.floorBefore).toBe(4);
    const at7 = spirePreviewModel('guard', { floor: 7 });
    expect(at7.week!.floor).toBe(10);
    expect(spireIsGuard(at7.week!.floor)).toBe(true);
  });

  it('плашки у «Подняться»: задания готовятся / нет сети', () => {
    expect(spirePreviewModel('block_missing').game.startBlock).toBe('pack_missing');
    expect(spirePreviewModel('block_offline').game.startBlock).toBe('pack_offline');
    expect(spirePreviewModel('room').game.startBlock).toBeNull();
  });

  it('виды заданий: вставь слово, найди лишнее, послушай и выбери / собери', () => {
    expect(isSpireStepPreviewState('step_gap')).toBe(true);
    expect(spireStepPreview('step_gap').task).toMatchObject({ mode: 'fill_gap', kind: 'choice' });
    expect(String(spireStepPreview('step_gap').task.payload.phrase)).toContain('___');
    expect(spireStepPreview('step_odd').task).toMatchObject({ mode: 'find_oddity', kind: 'choice' });
    const lc = spireStepPreview('step_listen_choose').task;
    const lb = spireStepPreview('step_listen_build').task;
    expect(lc.mode).toBe('listen_choose');
    expect(lb.mode).toBe('listen_build');
    expect(Array.isArray(lc.payload.options) && (lc.payload.options as unknown[]).length === 4).toBe(true);
    expect(Array.isArray(lb.payload.wordBank)).toBe(true);
    // кнопка «Прослушать» (spire-task-listen) появляется только при читаемом audioUri — проверяем, что мок его даёт
    expect(resolveSpireListenAudio(lc.payload, 'en')).toMatchObject({ ok: true });
    expect(resolveSpireListenAudio(lb.payload, 'en')).toMatchObject({ ok: true });
  });

  it('каждая ветка пишет [DEV-STATE] с состоянием', () => {
    for (const state of NEW_STATES) {
      log.mockClear();
      if (isSpireStepPreviewState(state)) spireStepPreview(state); else spirePreviewModel(state);
      expect(String(log.mock.calls[0]?.[0])).toContain(`[DEV-STATE] spire_preview`);
      expect(String(log.mock.calls[0]?.[0])).toContain(`state=${state}`);
    }
  });

  it('маршрут: шторка выхода по ?exit=1, лог маршрута, в стор-сборке уводит на Главную; моки без сети', () => {
    const route = readFileSync(join(__dirname, '..', 'app', 'dev_spire_preview.tsx'), 'utf8');
    expect(route).toMatch(/params\.exit === '1'/);
    expect(route).toMatch(/\[DEV-STATE\] spire_preview route/);
    expect(route).toMatch(/if \(!ENABLE_DEV_TOOLS \|\| IS_STORE_RELEASE\) return <Redirect href="\/" \/>;/);
    const fixtures = readFileSync(join(__dirname, '..', 'components', 'spire', 'spire_preview_fixtures.ts'), 'utf8');
    expect(fixtures).not.toMatch(/fetch\(|httpsCallable|firestore|AsyncStorage/i);
  });
  // зачем (координатор 12.10, spire-gap-012/013): причины провала различаются в превью
  it('провал: «время вышло» (timeout) и «ступень прервана» (backed_out) — свои состояния, обычный lose остаётся «сердца»', () => {
    for (const state of ['lose_timeout', 'lose_aborted'] as const) {
      expect(isSpirePreviewState(state)).toBe(true);
      expect(SPIRE_PREVIEW_STATES).toContain(state);
    }
    expect(spirePreviewModel('lose').game.outcome!.report!.failReason).toBe('hearts');
    expect(spirePreviewModel('lose_timeout').game.outcome!.report!.failReason).toBe('timeout');
    expect(spirePreviewModel('lose_aborted').game.outcome!.report!.failReason).toBe('backed_out');
  });
});
