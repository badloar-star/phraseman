// зачем (координатор 12.10, Сверка cards-042): верхняя панель «‹ … ⋮» экрана набора Карточек стояла ПОД строкой состояния (сдвиг ≈75 px).
// Причина: родной SafeAreaView берёт отступ у системы после первого кадра — пока экран входит в стек, inset сверху = 0.
// Экран обязан брать отступы из useStableSafeAreaInsets (родной или запасной по высоте строки состояния) и не возвращаться к SafeAreaView.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('экран набора Карточек: отступ сверху не зависит от первого кадра системы', () => {
  const screen = read('app/flashcards_collection.tsx');

  it('нет родного SafeAreaView, корень берёт отступы из стабильных insets', () => {
    expect(screen).not.toMatch(/import\s*\{\s*SafeAreaView\s*\}\s*from 'react-native-safe-area-context'/);
    expect(screen).not.toContain('<SafeAreaView');
    expect(screen).toContain("import { useStableSafeAreaInsets } from './stable_safe_area_metrics';");
    expect(screen).toContain('paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right');
  });

  it('стабильный inset сверху не меньше высоты строки состояния', () => {
    const metrics = read('app/stable_safe_area_metrics.ts');
    expect(metrics).toContain('top: Math.max(baseInsets.top, fallbackTop)');
    expect(metrics).toContain('return Math.max(nativeTopInset, stableInitialWindowMetrics.insets.top);');
  });

  it('положение панели пишется в журнал [CARDS-SET-HEADER] с откуда взят отступ', () => {
    const header = read('app/flashcards/PackHeaderV2.tsx');
    expect(header).toContain("console.log('[CARDS-SET-HEADER]'");
    for (const field of ['windowY', 'insetTopStable', 'insetTopInitialWindow', 'statusBarH', 'sinceMountMs']) {
      expect(header).toContain(field);
    }
  });
});
