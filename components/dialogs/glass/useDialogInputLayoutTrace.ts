// ════════════════════════════════════════════════════════════════════════════
// useDialogInputLayoutTrace — журнал [DLG-INPUT-LAYOUT]: где стоит строка ввода диалога и почему.
//
// зачем (координатор 12.10, «сперва логи»; Сверка dialogs-030/031: после отправки клавиатура скрыта, а поле осталось приподнятым — пустая полоса ~150 px):
// на пересъёмке нужны ФАКТЫ, а не догадки — высота клавиатуры при показе/скрытии, где строка ввода относительно низа окна (зазор), какой нижний отступ безопасной зоны,
// и что происходило в этот момент (layout / sending / клавиатура). Если после «hide» зазор до низа остаётся больше нижнего отступа безопасной зоны — это и есть «приподнято».
// Только __DEV__; одинаковые подряд строки не повторяются.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef } from 'react';
import { Dimensions, Keyboard, Platform, type LayoutChangeEvent, type View } from 'react-native';

const TAG = '[DLG-INPUT-LAYOUT]';
/** Через сколько после события клавиатуры мерим строку: анимация системной панели уже закончилась. */
const SETTLE_MS = 350;

export type DialogInputLayoutTrace = Readonly<{
  /** ref строки ввода (вешается на внешний View строки). */
  barRef: React.RefObject<View | null>;
  /** onLayout строки ввода. */
  onBarLayout: (event: LayoutChangeEvent) => void;
}>;

export function useDialogInputLayoutTrace(args: Readonly<{ sending: boolean; bottomMode: string; insetBottom: number }>): DialogInputLayoutTrace {
  const { sending, bottomMode, insetBottom } = args;
  const barRef = useRef<View | null>(null);
  const keyboardRef = useRef<{ visible: boolean; height: number }>({ visible: false, height: 0 });
  const lastLineRef = useRef('');
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measure = useCallback((why: string) => {
    if (!__DEV__) return;
    const node = barRef.current;
    if (!node) {
      console.log(`${TAG} ${why}: строки ввода на экране нет (режим низа=${bottomMode})`); // guard-ok: ранний выход называет причину
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      const windowHeight = Dimensions.get('window').height;
      const gapToBottom = Math.round(windowHeight - (y + height));
      const kb = keyboardRef.current;
      const line = `${why} | клавиатура=${kb.visible ? 'открыта' : 'закрыта'} высота=${kb.height} | строка y=${Math.round(y)} h=${Math.round(height)} w=${Math.round(width)} | окно h=${Math.round(windowHeight)} | зазор до низа=${gapToBottom} | нижний отступ безопасной зоны=${Math.round(insetBottom)} | лишнее=${kb.visible ? 'n/a' : gapToBottom - Math.round(insetBottom)} | os=${Platform.OS}`;
      if (line === lastLineRef.current) return;
      lastLineRef.current = line;
      console.log(`${TAG} ${line}`); // guard-ok: замер раскладки
    });
  }, [bottomMode, insetBottom]);

  const scheduleMeasure = useCallback((why: string) => {
    if (!__DEV__) return;
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => measure(why), SETTLE_MS);
  }, [measure]);

  useEffect(() => {
    if (!__DEV__) return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      keyboardRef.current = { visible: true, height: Math.round(event.endCoordinates?.height ?? 0) };
      scheduleMeasure(`событие=${showEvent} screenY=${Math.round(event.endCoordinates?.screenY ?? 0)}`);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardRef.current = { visible: false, height: 0 };
      scheduleMeasure(`событие=${hideEvent}`);
    });
    return () => {
      show.remove();
      hide.remove();
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, [scheduleMeasure]);

  // отправка/ответ: именно после отправки поле «остаётся приподнятым»
  useEffect(() => {
    if (!__DEV__) return;
    scheduleMeasure(`sending=${String(sending)}`);
  }, [sending, scheduleMeasure]);

  const onBarLayout = useCallback((_event: LayoutChangeEvent) => {
    scheduleMeasure('layout');
  }, [scheduleMeasure]);

  return { barRef, onBarLayout };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
