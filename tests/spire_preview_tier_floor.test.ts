// зачем (координатор 15.10, Макеты: кадры spire-007/011/gap-015/018 = образцу «Гранит, этаж 4»): /dev_spire_preview принимает tier= и floor=.
// Без параметров — прежние значения (лига 3, этаж 7); с параметрами — лига и этаж меняются во всех состояниях, вершина остаётся вершиной.
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SPIRE_PREVIEW_STATES,
  isSpireStepPreviewState,
  parseSpirePreviewOverrides,
  spirePreviewModel,
  spireStepPreview,
} from '../components/spire/spire_preview_fixtures';

const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8').replace(/\r\n/g, '\n');

describe('dev_spire_preview: tier= и floor=', () => {
  let warn: jest.SpyInstance;
  let log: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { warn.mockRestore(); log.mockRestore(); });

  it('разбор: целые в диапазоне принимаются, мусор и выход за границы игнорируются с предупреждением', () => {
    expect(parseSpirePreviewOverrides('0', '4')).toEqual({ tier: 0, floor: 4 });
    expect(parseSpirePreviewOverrides(undefined, undefined)).toEqual({});
    expect(parseSpirePreviewOverrides(['2', '5'], '15')).toEqual({ tier: 2, floor: 15 });
    expect(parseSpirePreviewOverrides('12', '0')).toEqual({});
    expect(parseSpirePreviewOverrides('abc', '3.5')).toEqual({});
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it('без параметров — прежние лига 3 и этаж 7', () => {
    const model = spirePreviewModel('room');
    expect(model.week?.tier).toBe(3);
    expect(model.week?.floor).toBe(7);
    expect(model.game.tier).toBe(3);
    const step = spireStepPreview('step_choice');
    expect(step.ctx.tier).toBe(3);
    expect(step.ctx.floor).toBe(7);
  });

  it('tier=0 floor=4: «Гранит, этаж 4» в комнате и на ступени', () => {
    const model = spirePreviewModel('room', { tier: 0, floor: 4 });
    expect(model.week?.tier).toBe(0);
    expect(model.week?.floor).toBe(4);
    expect(model.game.tier).toBe(0);
    const step = spireStepPreview('step_choice', { tier: 0, floor: 4 });
    expect(step.ctx.tier).toBe(0);
    expect(step.ctx.floor).toBe(4);
  });

  it('этаж смещается относительно базового 7: win → этаж+1, вершина 15 не двигается, ниже 1 не бывает', () => {
    expect(spirePreviewModel('win', { floor: 4 }).week?.floor).toBe(5);
    expect(spirePreviewModel('summit', { floor: 4 }).week?.floor).toBe(15);
    expect(spirePreviewModel('lobby', { floor: 4 }).week?.floor).toBe(1);
  });

  it('параметры действуют на ВСЕ состояния и сбрасываются после сборки (следующий вызов без них — прежний)', () => {
    for (const state of SPIRE_PREVIEW_STATES) {
      if (isSpireStepPreviewState(state)) {
        expect(spireStepPreview(state, { tier: 5, floor: 9 }).ctx.tier).toBe(5);
        continue;
      }
      const model = spirePreviewModel(state, { tier: 5, floor: 9 });
      if (model.week) expect(model.week.tier).toBe(5);
    }
    expect(spirePreviewModel('room').week?.tier).toBe(3);
  });

  it('итог недели следует за tier: «поднимаешься» в tier, «остаёшься» в tier, «опускаешься» из tier; steps= меняет число ступеней; без параметров прежние 2→3, 58', () => {
    const base = spirePreviewModel('weekresult').game.weekResult;
    expect(base).toMatchObject({ prevTier: 2, newTier: 3, steps: 58 });
    expect(spirePreviewModel('weekresult_stay').game.weekResult).toMatchObject({ prevTier: 3, newTier: 3, steps: 31 });
    expect(spirePreviewModel('weekresult_down').game.weekResult).toMatchObject({ prevTier: 3, newTier: 2, steps: 12 });
    // образец spire-gap-015: «поднимаешься в Базальт · 39 ступеней» (Базальт = tier 1)
    expect(spirePreviewModel('weekresult', { tier: 1, floor: 1, steps: 39 }).game.weekResult).toMatchObject({ prevTier: 0, newTier: 1, steps: 39, promoted: true });
    expect(spirePreviewModel('weekresult_stay', { tier: 4 }).game.weekResult).toMatchObject({ prevTier: 4, newTier: 4 });
    expect(spirePreviewModel('weekresult_down', { tier: 4 }).game.weekResult).toMatchObject({ prevTier: 4, newTier: 3 });
    // в Граните (0) входа «в Гранит» и спуска ниже нет: «поднимаешься» даёт Базальт, спуск — из Базальта в Гранит
    expect(spirePreviewModel('weekresult', { tier: 0 }).game.weekResult).toMatchObject({ prevTier: 0, newTier: 1 });
    expect(spirePreviewModel('weekresult_down', { tier: 0 }).game.weekResult).toMatchObject({ prevTier: 1, newTier: 0 });
    expect(parseSpirePreviewOverrides(undefined, undefined, '39')).toEqual({ steps: 39 });
  });

  it('маршрут читает параметры и меняет ключ провайдера; параметры описаны в шапке; боевой код Шпиля не тронут', () => {
    const route = read('app', 'dev_spire_preview.tsx');
    expect(route).toContain('parseSpirePreviewOverrides(params.tier, params.floor, params.steps, params.nicks)');
    expect(route).toContain('spirePreviewModel(state, overrides)');
    expect(route).toContain('spireStepPreview(state, overrides)');
    expect(route).toMatch(/&tier=0/);
    for (const prod of [['components', 'spire', 'SpireHomeScreen.tsx'], ['app', 'spire', 'use_spire_game.ts']]) {
      expect(read(...prod)).not.toContain('SpirePreviewOverrides');
    }
  });
});
