// зачем (аудит кнопок R58, 15.10, зона Дизайна): #49 кнопка листа предложений в онбординге растёт по содержимому; #58 «К занятиям» ведёт на занятия; #59 зона листания сторис считается от выреза; #60 шторка энергии учитывает нижнюю вставку.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('аудит R58: Дизайн', () => {
  it('#49: кнопка листа предложений — minHeight 56, не жёсткие 56', () => {
    const src = read('components/CleanOnboarding.tsx');
    expect(src).toMatch(/offersCta: \{[\s\S]{0,260}minHeight: 56,/);
    expect(src).not.toMatch(/offersCta: \{[\s\S]{0,260}\n    height: 56,/);
  });

  it('#58: «К занятиям» закрывает окно и открывает вкладку занятий', () => {
    const src = read('components/PremiumCelebrationModal.tsx');
    expect(src).toContain("router.push('/(tabs)/lessons' as never);");
    expect(src).toMatch(/handleClose\(\);[\s\S]{0,300}router\.push\('\/\(tabs\)\/lessons'/);
  });

  it('#59: зона листания сторис считается от верхней вставки, а не константой 110', () => {
    const src = read('components/stories/StoryViewer.tsx');
    expect(src).toContain('const headerH = insets.top + HEADER_BELOW_INSET;');
    expect(src).toContain('if (y < headerH) return;');
    expect(src).not.toContain('HEADER_H = 110');
  });

  it('#60: нижний отступ шторки энергии — не меньше системной вставки + 16', () => {
    const src = read('components/energy/EnergyNeededSheet.tsx');
    expect(src).toContain('paddingBottom: Math.max(30, insets.bottom + 16)');
  });
});
