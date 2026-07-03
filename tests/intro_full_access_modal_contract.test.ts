import fs from 'fs';
import path from 'path';

describe('intro full access modal contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'components', 'IntroFullAccessModal.tsx'), 'utf8');

  it('uses the shared reward modal styling instead of a one-off surface', () => {
    expect(source).toContain('RewardModalBackdrop');
    expect(source).toContain('RewardModalPanelBackdrop');
    expect(source).toContain('rewardModalPrimaryButtonColors');
  });

  it('states that the gift does not auto-start a subscription', () => {
    expect(source).toContain('Подписка не включается автоматически');
  });

  it('does not show feature-lock chips on the welcome gift modal', () => {
    expect(source).not.toContain('copy.chips');
    expect(source).not.toContain("name=\"lock-open-outline\"");
    expect(source).not.toContain('Все уроки');
    expect(source).not.toContain('Все планы');
  });

  it('keeps direct prices out of the expiration modal', () => {
    expect(source).not.toMatch(/₽|\$|€|\/мес|\/год/i);
  });

  it('offers paywall CTA and free continuation on expiration', () => {
    expect(source).toContain('Открыть полный доступ');
    expect(source).toContain('Остаться на базовом');
    expect(source).toContain('intro-full-access-ended-primary');
  });
});
