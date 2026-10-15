import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');

// зачем (координатор §46, 2026-10-01): контракт упорядочивал два окна одного
// прохода загрузки — пейвол серии и нативное «восстановить серию». Платное
// восстановление снято целиком (D107, владелец 30.09): окна восстановления на
// Главной нет, упорядочивать нечего. Сторожим ретайр и то, что пейвол серии жив.
describe('Home streak paywall after the paid revive retirement', () => {
  it('keeps the streak paywall and no revive prompt on Home', () => {
    // зачем (координатор 15.10): авто-пейвол серии не входит в очередь окон сам — открытие вынесено в pushStreakPaywall и ждёт слот (окно недели / «С возвращением» идут первыми); смысл прежний: пейвол серии с контекстом и числом серии, без окна возрождения
    expect(source).toContain("router.push({ pathname: '/premium_modal', params: { context: 'streak', streak: String(streak) } }");
    expect(source).toContain('await pushStreakPaywall(streakBefore, today);');
    expect(source).toContain('pendingStreakPaywallRef.current = { streak: streakBefore, day: today };');
    expect(source).not.toContain('setReviveModalVisible(');
    expect(source).not.toContain('reviveOfferDirtyRef');
    expect(source).not.toContain("onAppEvent('streak_revive_offer'");
  });
});
