// use_dialog_say_hint_input.ts — тап по подсказке «Можно сказать…»: фраза в поле, фокус в поле, курсор в конце.
// зачем (аудит Optimistic UI 24.10 п.3, координатор 25.10): подсказка меняла только черновик — поле не получало фокус, клавиатура не открывалась, а на Android курсор мог остаться в начале
// пустого поля. Теперь тап: черновик = фраза (ровно один раз, замена, не дописывание), фокус в поле, выделение — в конец. Выделение держим «управляемым» только до первого ввода или ухода фокуса,
// дальше курсор принадлежит человеку. Нужен обоим экранам Диалогов (сценарий и свободный разговор) — поэтому один хук, а не копия логики в каждом.
import { useCallback, useRef, useState } from 'react';
import type { TextInput } from 'react-native';

export type DialogSayHintSelection = Readonly<{ start: number; end: number }>;

export function useDialogSayHintInput(onChangeDraft: (text: string) => void) {
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState<DialogSayHintSelection | undefined>(undefined);

  const onUse = useCallback((text: string) => {
    onChangeDraft(text);
    setSelection({ start: text.length, end: text.length });
    const input = inputRef.current;
    if (!input) {
      console.warn('[DIALOG-HINT] поле ввода не подключено — фраза вставлена без фокуса', JSON.stringify({ len: text.length }));
      return;
    }
    input.focus();
  }, [onChangeDraft]);

  const onChangeText = useCallback((text: string) => {
    setSelection(undefined);
    onChangeDraft(text);
  }, [onChangeDraft]);

  const onBlur = useCallback(() => { setSelection(undefined); }, []);

  return { inputRef, selection, onUse, onChangeText, onBlur } as const;
}
