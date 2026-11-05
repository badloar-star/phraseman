// зачем (Эмулятор 05.11, b07_04): окно «Открытие раздела» после покупки Plus рисовалось под системной полосой.
// Пин: содержимое сдвигается на верхний/нижний отступ безопасной зоны, а тап «Skip» пишет [SECTION-OPENING] skip_tap.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/section_openings/SectionOpeningCeremony.tsx'), 'utf8');

describe('Открытие раздела: безопасная зона и лог Skip', () => {
  it('содержимое сдвинуто на отступы безопасной зоны', () => {
    expect(src).toContain('useStableSafeAreaInsets');
    expect(src).toContain('paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24');
  });
  it('тап Skip пишет лог до закрытия', () => {
    expect(src).toMatch(/skip_tap[\s\S]*onSkip\(\)/);
  });
});
