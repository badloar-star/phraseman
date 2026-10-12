// зачем (координатор 12.10, overlays-campaigns-004/016/017): шапка «шторки раздела» по стандарту владельца — заголовок по центру, крестик СПРАВА (в коде был слева).
// Окно «Промокод» рисует крестик плоско (образец promo-code-states), окно «Код от друга» — в круге (referral-code-states).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('SectionSheetHeader: close button on the right', () => {
  const header = read('components/SectionSheetHeader.tsx');

  it('the close group is anchored to the right edge, not the left', () => {
    expect(header).toMatch(/position: 'absolute',\s*right: 12,/);
    expect(header).not.toMatch(/position: 'absolute',\s*left: 12,/);
  });

  it('has a plate (default) and a flat variant of the close button', () => {
    expect(header).toContain("closeVariant?: 'plate' | 'flat';");
    expect(header).toContain("closeVariant = 'plate'");
    expect(header).toMatch(/if \(variant === 'flat'\) \{[^}]*width: 40, height: 40, borderRadius: 20/);
  });

  it('the promo window uses the flat close, the friend-code window keeps the plate', () => {
    expect(read('app/promo_code_entry.tsx')).toContain('closeVariant="flat"');
    expect(read('app/referrals.tsx')).not.toContain('closeVariant="flat"');
  });
});
