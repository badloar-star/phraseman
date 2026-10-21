// зачем (координатор 21.10, «Сверка»): «Собери перевод» с ячейками не выпадает на эмуляторе, поэтому dev-превью даёт его в состояниях «заполнено» и «ошибка».
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

import fs from 'node:fs';
import path from 'node:path';

import { SPIRE_PREVIEW_STATES, isSpireStepPreviewState, spireStepPreview } from '../components/spire/spire_preview_fixtures';

describe('Spire preview: «Собери перевод» — заполнено и ошибка', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('оба состояния зарегистрированы как ступень', () => {
    for (const state of ['step_build_filled', 'step_build_wrong'] as const) {
      expect(SPIRE_PREVIEW_STATES).toContain(state);
      expect(isSpireStepPreviewState(state)).toBe(true);
    }
  });

  it('«заполнено»: все 4 слова уже в ячейках, ответ ещё принимается', () => {
    const p = spireStepPreview('step_build_filled');
    expect(p.task.kind).toBe('translate');
    expect(p.task.payload.correctTokenCount).toBe(4);
    expect(p.task.payload.previewPicked).toEqual(['She', 'works', 'every', 'day']);
    expect(p.answering).toBe(true);
    expect(p.feedback).toBeNull();
  });

  it('«ошибка»: одно неверное слово, правильная фраза и «Дальше» (ответ уже не принимается)', () => {
    const p = spireStepPreview('step_build_wrong');
    expect(p.task.payload.previewPicked).toEqual(['She', 'work', 'every', 'day']);
    expect(p.answering).toBe(false);
    expect(p.feedback).toMatchObject({ ok: false, correctText: 'She works every day' });
    expect(p.hearts).toBe(2);
  });

  it('предзаполнение читается только в __DEV__', () => {
    const view = fs.readFileSync(path.join(__dirname, '..', 'components/spire/SpireTaskView.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(view).toMatch(/__DEV__ && Array\.isArray\(task\.payload\.previewPicked\)/);
  });
});
