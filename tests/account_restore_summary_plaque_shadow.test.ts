// зачем (стиль «Тень», Ревизор 26.10 по 51884d675): плашка «серия · фраз · уроков» в окне «Восстановить аккаунт?» —
// заливка PlateFill + тень plateBoxShadow, без обводки; разделители ячеек — узкие View, а не borderLeft.
import { readSource } from './helpers/read_source';

it('плашка сводки без обводок: PlateFill + plateBoxShadow, разделитель — View', () => {
  const src = readSource('components/account/AccountRestoreSummaryDialog.tsx');
  expect(src).toContain('<PlateFill g={glass} radius={16} />');
  expect(src).toContain("style={[styles.plaque, { boxShadow: plateBoxShadow(glass) }]}");
  expect(src).toContain('<View style={[styles.cellDivider, { backgroundColor: glass.mutedText }]} />');
  expect(src).not.toMatch(/border(Top|Bottom|Left|Right)?(Width|Color)/);
});
