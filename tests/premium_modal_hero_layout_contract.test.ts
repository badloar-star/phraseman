import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('premium modal retired UI contract', () => {
  it('does not keep the old hero paywall inside /premium_modal', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'premium_modal.tsx'), 'utf8');

    expect(source).toContain('PremiumModalDispatcher');
    expect(source).not.toContain('ActivityIndicator');
    expect(source).not.toContain('БЛОК 1');
    expect(source).not.toContain('Почему Premium тебе нужен');
    expect(source).not.toContain('Учись быстрее с Premium');
    expect(source).not.toContain('StyleSheet.absoluteFillObject');
  });
});
