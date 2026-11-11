/**
 * Размеры экранов двенадцати новых механик — перенос CSS одобренного макета Кодекса
 * `peak-all-languages.html` (классы .option, .cell, .token, .classify-card, .pair-tile, .word-input, .feedback).
 * зачем: гейт «приложение = макет» — числа берутся из макета, а не подбираются на глаз.
 * Общие с существующим заданием Пика размеры (плашка вопроса, вариант, ячейки) совпадают с SpireTaskView.
 */
import { StyleSheet } from 'react-native';

export const expandedStyles = StyleSheet.create({
  overRow: { marginTop: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  overLine: { flex: 1, height: 1, minWidth: 8 },
  overline: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 2, textAlign: 'center', flexShrink: 1 },
  question: { marginTop: 18, minHeight: 96, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 20, justifyContent: 'center' },
  phrase: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  context: { marginTop: 18, fontSize: 16, lineHeight: 22 },
  body: { marginTop: 18 },

  stack: { gap: 13 },
  option: { minHeight: 58, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  optionText: { flexShrink: 1, fontSize: 16, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  optionTick: { marginRight: 10, fontSize: 16, lineHeight: 21, fontWeight: '700' },

  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flexGrow: 1, flexShrink: 1, flexBasis: '22%', minWidth: 64, minHeight: 52, borderRadius: 12, padding: 4, alignItems: 'center', justifyContent: 'center' },
  // .cell.wide — занятая ячейка реплики встаёт во всю ширину: реплика длинная
  cellWide: { flexBasis: '100%' },
  cellNum: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  cellToken: { width: '100%', minHeight: 44, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },

  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bankBelow: { marginTop: 13 },
  token: { minHeight: 44, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center' },
  tokenText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },

  gapLabel: { marginTop: 18, marginBottom: 10, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  gapLabelFirst: { marginTop: 0 },

  input: { minHeight: 58, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 12, fontSize: 20, lineHeight: 28 },

  classifyCard: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16 },
  classifyText: { marginBottom: 12, fontSize: 19, lineHeight: 24, fontWeight: '700' },

  pairsGrid: { flexDirection: 'row', gap: 10 },
  pairColumn: { flex: 1, minWidth: 0, gap: 8 },
  pairTile: { minHeight: 48, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' },
  pairText: { fontSize: 16, lineHeight: 21, fontWeight: '700', textAlign: 'center' },

  passage: { fontSize: 16, lineHeight: 22 },

  check: { marginTop: 20, minHeight: 52, borderRadius: 26, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  count: { marginTop: 10, fontSize: 13, lineHeight: 18, textAlign: 'center' },

  feedback: { marginTop: 18, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  feedbackHead: { marginBottom: 10, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  feedbackText: { fontSize: 16, lineHeight: 22 },
  onward: { marginTop: 10, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
