// зачем: шторки на Liquid Glass (комментарии, жалобы) кладут внутрь HybridSheetShell
// прокручиваемый список/форму. Каркас ограничивает высоту листа 86% экрана, но не
// даёт вложенному ScrollView измеренный viewport — без явного maxHeight длинный
// контент обрезается или не прокручивается. Формула та же, что в DeckPickerSheet:
// минус отступ снизу (safe area ИЛИ клавиатура — берётся большее, как в каркасе),
// минус 20 нижнего паддинга листа и 28 на «ручку». Клавиатура учитывается, чтобы
// поле ввода на Android не уезжало под неё.
import { useWindowDimensions } from 'react-native';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { useKeyboardBottomInset } from '../keyboardAvoidance';

const SHEET_HEIGHT_RATIO = 0.86;
const SHEET_BOTTOM_PADDING = 20;
const SHEET_GRABBER_ALLOWANCE = 28;
const MIN_CONTENT_HEIGHT = 140;

export function useGlassSheetContentMaxHeight(visible: boolean): number {
  const { height } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset(visible);
  const bottom = Math.max(normalizeSafeAreaBottomInset(insets.bottom), keyboardInset);
  const available = Math.min(height - insets.top, height * SHEET_HEIGHT_RATIO)
    - SHEET_BOTTOM_PADDING - bottom - SHEET_GRABBER_ALLOWANCE;
  return Math.max(MIN_CONTENT_HEIGHT, available);
}
