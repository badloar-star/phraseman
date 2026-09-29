import fs from 'fs';
import path from 'path';

describe('intro full access modal contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'components', 'IntroFullAccessModal.tsx'), 'utf8');

  // Обновлено 2026-09-29: окно перенесено на Liquid Glass (макет OM-FULL-*),
  // старая reward-подложка и градиенты убраны, см. intro_full_access_liquid_glass_source_contract.
  it('uses active Liquid Glass tokens instead of the reward backdrop', () => {
    expect(source).toContain('liquidGlassTokens(liquidGlassThemeId)');
    expect(source).not.toContain('RewardModalBackdrop');
    expect(source).not.toContain('LinearGradient');
  });

  it('states that the gift does not auto-start a subscription', () => {
    expect(source).toContain('Подписка не включается автоматически');
  });

  it('does not show feature-lock chips or old Plus promises on the gift modals', () => {
    expect(source).not.toContain('copy.chips');
    expect(source).not.toContain("name=\"lock-open-outline\"");
    expect(source).not.toContain('Все уроки');
    expect(source).not.toContain('Все планы');
    expect(source).not.toContain('без ограничений');
  });

  it('keeps direct prices out of the expiration modal', () => {
    expect(source).not.toMatch(/₽|\$|€|\/мес|\/год/i);
  });

  it('offers the store offer CTA and basic-mode continuation on expiration', () => {
    expect(source).toContain('Посмотреть предложение');
    expect(source).toContain('Остаться на базовом');
    expect(source).toContain('intro-full-access-ended-primary');
  });
});
