import fs from 'fs';
import path from 'path';

describe('premium intro-ended context', () => {
  const copySrc = fs.readFileSync(path.join(process.cwd(), 'app', 'paywall_copy.ts'), 'utf8');
  const dispatcherSrc = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');

  it('keeps a dedicated intro_ended copy context for all new paywalls', () => {
    expect(copySrc).toContain('PAYWALL_COPY.intro_ended');
    expect(dispatcherSrc).toContain("openPremiumPaywall(router, params, 'replace')");
  });

  it('uses gentle gain-framed copy in the shared paywall copy source', () => {
    const start = copySrc.indexOf('PAYWALL_COPY.intro_ended');
    expect(start).toBeGreaterThan(-1);
    const block = copySrc.slice(start, copySrc.indexOf('PAYWALL_COPY.level_up', start));
    expect(block).toContain('titleRu');
    expect(block).toContain('subtitleRu');
    expect(block).toContain('titleUk');
    expect(block).toContain('titleEs');
  });

  it('keeps expired grant paywall wording user-facing as Plus, not VIP', () => {
    const start = copySrc.indexOf('PAYWALL_COPY.vip_expired');
    expect(start).toBeGreaterThan(-1);
    const block = copySrc.slice(start, copySrc.indexOf('PAYWALL_COPY.notification_upsell', start));

    // зачем (10.10): тексты пейволов переписаны «по-человечески и без вранья» (114baf437) — истёкший доступ
    // описан как «бесплатный доступ закончился», слово VIP пользователю не показывается.
    expect(block).toContain('Бесплатный доступ закончился');
    expect(block).toContain('Безкоштовний доступ завершився');
    expect(block).toContain('El acceso gratuito ha terminado');
    expect(block).not.toMatch(/VIP/);
    expect(block).not.toContain('VIP-доступ');
    expect(block).not.toContain('Tu acceso VIP');
  });
});
