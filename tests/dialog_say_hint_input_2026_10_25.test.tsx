// Тап по подсказке «Можно сказать…» (координатор 25.10, аудит п.3): фраза в поле один раз, фокус в поле, курсор в конце; повторный тап не дублирует; ввод руками снимает выделение.
import fs from 'node:fs';
import path from 'node:path';
import { act, renderHook } from '@testing-library/react-native';

import { useDialogSayHintInput } from '../components/dialogs/hints/use_dialog_say_hint_input';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('useDialogSayHintInput', () => {
  it('тап: черновик = фраза (один вызов), фокус в поле, курсор в конце', async () => {
    const onChangeDraft = jest.fn();
    const focus = jest.fn();
    const hook = await renderHook(() => useDialogSayHintInput(onChangeDraft));
    (hook.result.current.inputRef as { current: unknown }).current = { focus };
    await act(async () => { hook.result.current.onUse('How are you?'); });
    expect(onChangeDraft).toHaveBeenCalledTimes(1);
    expect(onChangeDraft).toHaveBeenCalledWith('How are you?');
    expect(focus).toHaveBeenCalledTimes(1);
    expect(hook.result.current.selection).toEqual({ start: 12, end: 12 });
  });

  it('повторный тап по той же фразе не дублирует её: каждый раз черновик = фраза целиком', async () => {
    let draft = '';
    const onChangeDraft = jest.fn((text: string) => { draft = text; });
    const hook = await renderHook(() => useDialogSayHintInput(onChangeDraft));
    (hook.result.current.inputRef as { current: unknown }).current = { focus: jest.fn() };
    await act(async () => { hook.result.current.onUse('Nice to meet you'); });
    await act(async () => { hook.result.current.onUse('Nice to meet you'); });
    expect(draft).toBe('Nice to meet you');
    expect(onChangeDraft).toHaveBeenCalledTimes(2);
  });

  it('ввод руками и уход фокуса снимают управляемое выделение', async () => {
    const onChangeDraft = jest.fn();
    const hook = await renderHook(() => useDialogSayHintInput(onChangeDraft));
    (hook.result.current.inputRef as { current: unknown }).current = { focus: jest.fn() };
    await act(async () => { hook.result.current.onUse('Hello'); });
    expect(hook.result.current.selection).toEqual({ start: 5, end: 5 });
    await act(async () => { hook.result.current.onChangeText('Hello!'); });
    expect(hook.result.current.selection).toBeUndefined();
    expect(onChangeDraft).toHaveBeenLastCalledWith('Hello!');
    await act(async () => { hook.result.current.onUse('Hi'); });
    await act(async () => { hook.result.current.onBlur(); });
    expect(hook.result.current.selection).toBeUndefined();
  });

  it('поле не подключено: фраза всё равно вставлена, причина в журнале', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onChangeDraft = jest.fn();
    const hook = await renderHook(() => useDialogSayHintInput(onChangeDraft));
    await act(async () => { hook.result.current.onUse('Yes'); });
    expect(onChangeDraft).toHaveBeenCalledWith('Yes');
    expect(warn.mock.calls.some((c) => String(c[0]).includes('[DIALOG-HINT]'))).toBe(true);
    warn.mockRestore();
  });
});

describe('оба экрана Диалогов подключают хук', () => {
  for (const [name, rel, hintTestId] of [
    ['сценарий', 'components/dialogs/DialogueV2SessionScreen.tsx', 'dialogue-v2-session-say-hints'],
    ['свободный разговор', 'components/dialogs/DialogueV2FreeformScreen.tsx', 'dialogue-v2-freeform-say-hints'],
  ] as const) {
    it(`${name}: onUse из хука, ref/selection/onChangeText/onBlur на поле`, () => {
      const src = read(rel);
      expect(src).toContain('useDialogSayHintInput(onChangeDraft)');
      expect(src).toContain('onUse={hintInput.onUse}');
      expect(src).toContain('ref={hintInput.inputRef}');
      expect(src).toContain('selection={hintInput.selection}');
      expect(src).toContain('onChangeText={hintInput.onChangeText}');
      expect(src).toMatch(/(onBlur|onEndEditing)=\{hintInput\.onBlur\}/); // сценарий: onBlur занят сворачиванием цели, выделение снимает onEndEditing
      expect(src).toContain(hintTestId);
    });
  }
});
