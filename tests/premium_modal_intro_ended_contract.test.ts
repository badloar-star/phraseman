import fs from 'fs';
import path from 'path';

describe('premium modal intro-ended context', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');

  it('has a dedicated intro_ended context with gentle post-gift copy', () => {
    expect(source).toContain("'intro_ended'");
    expect(source).toContain('Подарочный доступ закончился');
    expect(source).toContain('Можно продолжить бесплатно');
  });
});
