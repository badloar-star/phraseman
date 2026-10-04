import fs from 'fs';
import path from 'path';

// зачем: подарок лояльности «3 дня» убран вместе со всей системой подарков (D09 OWNER_FINAL: «подарки, спины, сундуки, бонусы
// убрать»); app/loyalty_gift.ts и components/LoyaltyGiftModal.tsx удалены коммитом 285ac732c. Прежний тест читал эти файлы и
// падал ENOENT. Теперь сторож проверяет ОТСУТСТВИЕ: подарок не должен вернуться в корневой поток незаметно — возврат потребует
// осознанно переписать этот тест вместе с решением владельца.
const root = process.cwd();
const exists = (...parts: string[]) => fs.existsSync(path.join(root, ...parts));

describe('loyalty gift 3-day flow stays removed', () => {
  it('has no loyalty gift source or modal in the tree (removed in 285ac732c)', () => {
    expect(exists('app', 'loyalty_gift.ts')).toBe(false);
    expect(exists('components', 'LoyaltyGiftModal.tsx')).toBe(false);
  });

  it('has no loyalty gift offer or claim in the root layout', () => {
    const layoutSource = fs.readFileSync(path.join(root, 'app', '_layout.tsx'), 'utf8');
    expect(layoutSource).not.toContain('LOYALTY_UPDATE_MODAL_ENABLED');
    expect(layoutSource).not.toContain('startLoyaltyGift');
    expect(layoutSource).not.toContain('loyalty_gift_changed');
    expect(layoutSource).not.toContain('LoyaltyGiftModal');
  });
});
