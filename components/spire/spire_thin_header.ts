// зачем (координатор 15.10): «тонкая шапка» Пика — первая ступень ужатия, ПОДГОТОВЛЕНА и ВЫКЛЮЧЕНА (SPIRE_THIN_HEADER_ENABLED в spire_tower_window.ts): заголовок 34/40 → 24/30 (−10), отступ шапки 6 → 0 (−6),
// отступ страницы 6 → 0 (−6) — итого SPIRE_HEADER_THIN_SAVE = 22. Подзаголовок («Гранит · до конца недели»), плашка энергии и порядок блоков не меняются. Стили вынесены отдельно,
// чтобы SpireHomeScreen остался в пределах 400 строк.
import { StyleSheet } from 'react-native';
import { V2_TYPE } from '../../constants/v2Style';

export const SPIRE_THIN_HEADER_STYLES = StyleSheet.create({
  content: { paddingTop: 0 },
  head: { marginTop: 0 },
  title: { fontSize: V2_TYPE.title.fontSize, lineHeight: V2_TYPE.title.lineHeight, letterSpacing: -0.3 },
});
