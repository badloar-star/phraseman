/**
 * зачем (координатор 12.11, журнал холодного старта эмулятора: первый кадр Главной раньше стартового снимка на 19 с,
 * монеты «—» → 1190): пока баланс не известен, плашка монет держит место заготовкой фиксированной ширины, а не «—»
 * (Performance Bible: «счётчик не рисует заглушку и не прыгает — резерв цифр SkeletonBlock»). Ожидать снимок до первого
 * кадра — нельзя (задержка старта), поэтому только резерв.
 */
import { readSource } from './helpers/read_source';

it('шапка: valuePending рисует заготовку фиксированной ширины и высоты строки цифры', () => {
  const header = readSource('components/home/v2/HomeV2Header.tsx');
  expect(header).toContain('valuePending?: boolean;');
  expect(header).toMatch(/const PENDING_VALUE_W = \d+;/);
  expect(header).toContain('<SkeletonBlock width={PENDING_VALUE_W} height={PENDING_VALUE_H} borderRadius={6} />');
  expect(header).toContain('style={[s.pendingValue, { height: headerText.statValue.lineHeight ?? 17 }]}');
  // плашка перерисовывается, когда число становится известным (memo сравнивает признак)
  expect(header).toContain('&& Boolean(x.valuePending) === Boolean(y.valuePending)');
});

it('Главная: заготовка, пока баланс не известен; для диктора — прежнее «—»', () => {
  const home = readSource('app/(tabs)/home.tsx');
  expect(home).toContain('valuePending: !runesKnown,');
  expect(home).toContain("accessibilityLabel: `${homeV2CoinsLabel}: ${runesKnown ? homeShownCoins : '—'}`,");
});
