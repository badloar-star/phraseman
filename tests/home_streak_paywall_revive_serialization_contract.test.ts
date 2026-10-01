import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');

// зачем (координатор §46, 2026-10-01): контракт упорядочивал два окна одного
// прохода загрузки — пейвол серии и нативное «восстановить серию». Платное
// восстановление снято целиком (D107, владелец 30.09): окна восстановления на
// Главной нет, упорядочивать нечего. Сторожим ретайр и то, что пейвол серии жив.
describe('Home streak paywall after the paid revive retirement', () => {
  it('keeps the streak paywall and no revive prompt on Home', () => {
    expect(source).toContain("router.push({ pathname: '/premium_modal', params: { context: 'streak', streak: String(streakBefore) } }");
    expect(source).not.toContain('setReviveModalVisible(');
    expect(source).not.toContain('reviveOfferDirtyRef');
    expect(source).not.toContain("onAppEvent('streak_revive_offer'");
  });
});
