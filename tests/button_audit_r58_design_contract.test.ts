// зачем (аудит кнопок R58, 15.10, зона Дизайна): #49 кнопка листа предложений в онбординге растёт по содержимому; #58 «К занятиям» ведёт на занятия; #59 зона листания сторис считается от выреза; #60 шторка энергии учитывает нижнюю вставку.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('аудит R58: Дизайн', () => {
  // зачем (координатор 12.11): лист «Больше предложений» удалён в d8a0a685a — тарифы и кнопка оформления встали прямо на экран оплаты.
  // Правило #49 то же: кнопка оформления растёт по содержимому (крупный шрифт, длинный перевод), а не режется жёсткой высотой.
  it('#49: кнопка оформления на экране оплаты онбординга — общая кнопка с minHeight ≥ 56, без жёсткой высоты', () => {
    const src = read('components/CleanOnboarding.tsx');
    expect(src).toMatch(/<View style=\{styles\.paywallInlineAction\}>\s*<PrimaryButton[\s\S]{0,400}testID="onboarding-paywall-continue"/);
    for (const key of ['primaryButtonOuter', 'primaryButton']) {
      const block = new RegExp(`\\n  ${key}: \\{([^}]*)\\}`).exec(src)?.[1] ?? '';
      expect({ key, minHeight: Number(/minHeight: (\d+)/.exec(block)?.[1] ?? 0) >= 56 }).toEqual({ key, minHeight: true });
      expect({ key, fixedHeight: /(^|[\s,{])height:/.test(block) }).toEqual({ key, fixedHeight: false });
    }
  });

  it('#58: «К занятиям» закрывает окно и открывает вкладку занятий', () => {
    const src = read('components/PremiumCelebrationModal.tsx');
    expect(src).toContain("router.push('/(tabs)/lessons' as never);");
    expect(src).toMatch(/handleClose\(\);[\s\S]{0,300}router\.push\('\/\(tabs\)\/lessons'/);
  });

  it('#59: зона листания сторис считается от верхней вставки, а не константой 110', () => {
    const src = read('components/stories/StoryViewer.tsx');
    expect(src).toContain('const headerH = insets.top + HEADER_BELOW_INSET;');
    // зачем (координатор 12.11): f4a3492eb добавил запись в журнал на этом раннем выходе (правило «логи на ранних выходах»); правило то же — тап в шапке не листает
    expect(src).toMatch(/if \(y < headerH\) \{ DebugLogger\.info\([^;]*\); return; \}/);
    expect(src).not.toContain('HEADER_H = 110');
  });

  it('#60: нижний отступ шторки энергии — не меньше системной вставки + 16', () => {
    const src = read('components/energy/EnergyNeededSheet.tsx');
    expect(src).toContain('paddingBottom: Math.max(30, insets.bottom + 16)');
  });
});
