// зачем (Сверка paywall-gap-001/007/009/010/011, 15.10): значки пейвола — по эталону paywall-gaps-states (стопка слоёв, «+», две искры, звёздочка-заморозка),
// плашка «Выгоднее всего» не переносится под «Год». Сторож держит контуры и числа, чтобы их не вернули к стоковым.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('пейвол Plus: значки и плашка тарифа по эталону', () => {
  const icons = read('components/paywall/PaywallContextIcons.tsx');
  it('«место закончилось» и «собери набор» — одна стопка слоёв, «добавь фразу» — плюс', () => {
    expect(icons).toContain('flashcard_limit: [...LAYERS],');
    expect(icons).toContain('pack_create: [...LAYERS],');
    expect(icons).toContain("{ t: 'p', d: 'M24 8 L41 16.6 L24 25.2 L7 16.6 Z' }");
    expect(icons).toMatch(/flashcard_create: \[\s*\{ t: 'p', d: 'M24 10 V38' \},\s*\{ t: 'p', d: 'M10 24 H38' \},\s*\],/);
  });

  const benefits = read('components/paywall/PaywallBenefitComparison.tsx');
  it('AI — две искры, заморозка — звёздочка эталона, остальные значки остаются стоковыми', () => {
    expect(benefits).toContain("'M10 4l1.6 4.4L16 10l-4.4 1.6L10 16l-1.6-4.4L4 10l4.4-1.6z'");
    expect(benefits).toContain("'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9'");
    expect(benefits).toContain('<BenefitGlyph name={benefit.icon} color={g.text} />');
    expect(benefits).toContain("if (!paths) return <Ionicons name={name} size={20} color={color} />;");
  });

  it('плашка «Выгоднее всего»: зазор 6 и поля 8, чтобы жить в одной строке с «Год»', () => {
    const plus = read('components/paywall/PaywallPlus.tsx');
    expect(plus).toMatch(/planNameRow: \{[^}]*gap: 6 \}/);
    expect(plus).toMatch(/badge: \{ minHeight: 22, paddingHorizontal: 8,/);
  });
});
