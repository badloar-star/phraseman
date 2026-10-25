// use_dialog_keyboard_log.ts — журнал клавиатуры в Диалогах [DIALOG-KB]: показ, скрытие, высота и ЧЕМ скрыто.
// зачем (жалоба владельца 25.10 «в диалогах нельзя смахнуть клавиатуру вниз»): лента теперь прячет клавиатуру смахиванием и тапом мимо
// поля; журнал показывает, сработало ли это и чем закрыли (drag — смахнули ленту, tap — тап мимо поля, send — отправка, system — кнопка
// «назад»/системное). Экран отмечает причину перед действием (markCause), скрытие пишет её и сбрасывает.
import { useCallback, useEffect, useRef } from 'react';
import { Keyboard, Platform } from 'react-native';

const LOG = '[DIALOG-KB]';

export type DialogKeyboardCause = 'drag' | 'tap' | 'send' | 'system';

export function useDialogKeyboardLog(screen: 'scenario' | 'freeform'): (cause: DialogKeyboardCause) => void {
  const causeRef = useRef<DialogKeyboardCause>('system');
  const shownRef = useRef(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (event) => {
      shownRef.current = true;
      causeRef.current = 'system';
      console.log(LOG, 'show', JSON.stringify({ screen, height: Math.round(event.endCoordinates?.height ?? 0), os: Platform.OS })); // guard-ok: одна строка на показ
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      console.log(LOG, 'hide', JSON.stringify({ screen, by: causeRef.current, wasShown: shownRef.current, os: Platform.OS })); // guard-ok: одна строка на скрытие
      shownRef.current = false;
      causeRef.current = 'system';
    });
    return () => { show.remove(); hide.remove(); };
  }, [screen]);
  return useCallback((cause: DialogKeyboardCause) => {
    if (!shownRef.current) return; // guard-ok: клавиатура не открыта — причину скрытия запоминать незачем
    causeRef.current = cause;
  }, []);
}
