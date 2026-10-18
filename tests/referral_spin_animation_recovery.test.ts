import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const REFERRALS = fs.readFileSync(path.join(ROOT, 'app', 'referrals.tsx'), 'utf8');
const CLIENT = fs.readFileSync(path.join(ROOT, 'app', 'roulette_spin_client.ts'), 'utf8');
const ARC = fs.readFileSync(path.join(ROOT, 'components', 'prize_arc.tsx'), 'utf8');

function onSpinSlice(): string {
  return REFERRALS.slice(
    REFERRALS.indexOf('const onSpin = useCallback(async () => {'),
    // зачем: D78/D81 — DEV-кнопка удалена; конец onSpin — закрытие модалки выигрыша.
    REFERRALS.indexOf('const closeWinAndStartCelebration = useCallback(() => {'),
  );
}

describe('referral reward animation recovery', () => {
  // зачем: владелец (2026-07-26) — на «Получить приз» НЕТ загрузки: дуга стартует
  // мгновенно по нажатию, сервер выбирает приз в фоне, дуга докручивается до него.
  it('starts the arc instantly and asks the server in the background', () => {
    const onSpin = onSpinSlice();
    const startIndex = onSpin.indexOf('arcRef.current?.startSpin()');
    const requestIndex = onSpin.indexOf('await spinReferralRoulette();');

    expect(startIndex).toBeGreaterThan(-1);
    expect(requestIndex).toBeGreaterThan(startIndex);
    expect(ARC).toContain('startSpin()');
    // Крейсер конечен: вечные циклы в фоне запрещены perf-контрактом.
    expect(ARC).toContain('CRUISE_MAX_TURNS');
    expect(ARC).not.toMatch(/withRepeat\([\s\S]{0,220}?,\s*-1/);
  });

  it('opens a prize only after the server accepted a key', () => {
    const onSpin = onSpinSlice();
    const localKeyGuardIndex = onSpin.indexOf('spinCredits <= 0');
    const requestIndex = onSpin.indexOf('await spinReferralRoulette();');
    const outcomeGuardIndex = onSpin.indexOf('if (!outcome.ok)');
    const modalIndex = onSpin.indexOf('setWin({ prizeIndex: outcome.prizeIndex');

    expect(localKeyGuardIndex).toBeGreaterThan(-1);
    expect(requestIndex).toBeGreaterThan(localKeyGuardIndex);
    expect(outcomeGuardIndex).toBeGreaterThan(requestIndex);
    expect(modalIndex).toBeGreaterThan(outcomeGuardIndex);
  });

  it('rolls back the optimistic key and settles the arc when the server declines', () => {
    const onSpin = onSpinSlice();
    // Оптимистичное списание — чисто локальное и обратимое.
    expect(onSpin).toContain('const creditsBeforeSpin = spinCredits;');
    expect(onSpin).toContain('const floorBeforeSpin = devGrantedCreditsFloorRef.current;');
    expect(onSpin).toContain('setSpinCredits(Math.max(0, creditsBeforeSpin - 1));');
    // Ошибка сервера: дуга мягко останавливается, ключ возвращается.
    expect(onSpin).toContain('arcRef.current?.stopSpin();');
    expect(onSpin).toContain('devGrantedCreditsFloorRef.current = floorBeforeSpin;');
    expect(onSpin).toContain('setSpinCredits(creditsBeforeSpin);');
    expect(ARC).toContain('stopSpin()');
  });

  it('keeps the claim button free of loading spinners during the reveal', () => {
    const buttonAt = REFERRALS.indexOf('testID="referrals-roulette-spin"');
    const buttonEnd = REFERRALS.indexOf('</KitTouchable>', buttonAt);
    const buttonBlock = REFERRALS.slice(buttonAt, buttonEnd);

    expect(buttonAt).toBeGreaterThan(-1);
    expect(buttonBlock).not.toContain('ActivityIndicator');
  });

  it('lands the arc on the server prize with a JS deadline before the modal', () => {
    const onSpin = onSpinSlice();
    const settleIndex = onSpin.indexOf('settlePrizeArcAnimation');
    const modalIndex = onSpin.indexOf('setWin({ prizeIndex: outcome.prizeIndex');

    expect(settleIndex).toBeGreaterThan(-1);
    expect(modalIndex).toBeGreaterThan(settleIndex);
    expect(onSpin).toContain('arcRef.current?.spinTo(outcome.prizeIndex)');
    expect(REFERRALS).toContain('Promise.race');
  });

  it('shows the win modal before the separate celebration begins', () => {
    const onSpin = onSpinSlice();
    const modalIndex = onSpin.indexOf('setWin({ prizeIndex: outcome.prizeIndex');

    expect(modalIndex).toBeGreaterThan(-1);
    expect(REFERRALS).toContain('const closeWinAndStartCelebration = useCallback(() => {');
    expect(REFERRALS).toContain('setWin(null);');
    expect(REFERRALS).toContain('setWinCelebrationVisible(true);');
    expect(REFERRALS).toContain('<RouletteWinCelebration');
  });

  it('does not let image preloading block a server-issued reward', () => {
    // зачем: PM-229-A1 — прогрев по-прежнему не блокирует награду, но сбой теперь пишет причину (swallowError), а не глотается.
    expect(REFERRALS).toMatch(/void preloadRoulettePrizeImages\(\)\.catch\(swallowError\('/);
    expect(REFERRALS).not.toMatch(/await preloadRoulettePrizeImages\(\)\.catch\(/);
  });

  // зачем: D78/D81 (владелец, 2026-09-30) — DEV-выдача ключа удалена навсегда и НЕ
  // возвращается вместе с рулеткой (D99); серверный путь спина остаётся прежним.
  it('keeps the dev key grant removed while the server-winning path stays', () => {
    expect(REFERRALS).not.toContain('devGrantReferralSpin');
    expect(REFERRALS).not.toContain('referrals-roulette-dev-grant');
    expect(CLIENT).not.toContain('devGrantReferralSpin');
    expect(CLIENT).not.toContain('referralDevGrantSpin');
    expect(CLIENT).toContain('const spinCreditMutationEpochByScope = new Map<string, number>();');
    expect(CLIENT).toContain('await cacheClaimedSpinCredits(stableId, res.data.spinsTotal, requestEpoch);');
    expect(CLIENT).toContain('beginSpinCreditMutation(stableId);');
    expect(REFERRALS).toContain('const outcome = await spinReferralRoulette();');
    expect(REFERRALS).toContain('setWin({ prizeIndex: outcome.prizeIndex, prizeDays: outcome.prizeDays, vipUntil: outcome.vipUntil, prizeKind: outcome.prizeKind, prizeCoins: outcome.prizeCoins });');
  });

  // зачем: D100 (владелец, 2026-09-30) — Pro (lifetime) получает МОНЕТЫ вместо дней
  // (раньше жемчуг, удалён D70). Сервер сам начисляет их в журнал кошелька
  // идемпотентно по spinRequestId и НЕ трогает vip_*; клиент лишь вливает снапшот.
  it('credits Pro coins on the server ledger, idempotent by spinRequestId', () => {
    const onSpin = onSpinSlice();
    const CLIENT_PRIZES = fs.readFileSync(path.join(ROOT, 'app', 'roulette_prizes.ts'), 'utf8');
    const SPIN_FN = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'referral_spin.ts'), 'utf8');
    const SPIN_LOGIC = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'referral_spin_logic.ts'), 'utf8');

    // Лестница зеркалится клиент↔сервер.
    expect(SPIN_LOGIC).toContain('REFERRAL_SPIN_PRIZE_COINS: readonly number[] = [100, 250, 700, 1500, 3500, 5000]');
    expect(CLIENT_PRIZES).toContain('ROULETTE_PRIZE_COINS: readonly number[] = [100, 250, 700, 1500, 3500, 5000]');
    // Сервер: Pro по progress.premium_plan, vip_* только для days, монеты — журнал stars.
    expect(SPIN_FN).toContain("=== 'lifetime'");
    expect(SPIN_FN).toContain("= prizeKind === 'days' ? {");
    expect(SPIN_FN).toContain("reason: 'referral_spin'");
    expect(SPIN_FN).toContain('referralSpinCoinOpId(spinRequestId)');
    expect(SPIN_FN).toContain('commitStarOperations(tx, coinsPrepared)');
    expect(SPIN_FN).not.toContain('appendExternalEconomyEvent');
    expect(SPIN_FN).not.toContain('prizePearls');
    // Клиент: жемчуг не начисляется, снапшот монет вливается в кошелёк телефона.
    expect(onSpin).not.toContain('claimReferralSpinPearls');
    expect(CLIENT).toContain('mergeLevelSpinServerStars(token, {');
    expect(CLIENT).toContain("if (outcome.prizeKind === 'coins')");
  });

  it('keeps reward cards bright and shows a disabled claim button when no keys remain', () => {
    expect(REFERRALS).toContain('<PrizeArc ref={arcRef} dimmed={false} />');
    expect(REFERRALS).toContain("accessibilityState={{ disabled: spinning || spinCredits <= 0 }}");
    // зачем (Макеты 18.10, кадр referral_01d66): при 0 ключей кнопка приглушена (opacity 0.5) и по тапу открывает «Как это работает»,
    // а не молчит; нажатие блокирует только идущий спин. onSpin по-прежнему сам выходит при spinCredits <= 0.
    expect(REFERRALS).toContain('disabled={spinning}');
    // зачем ([BLEND-1018B] 18.10): «приглушена» — парой неактивной кнопки темы, а не opacity 0,5 (та давала заливку 1,00:1 и подпись 2,12:1)
    expect(REFERRALS).toContain('spinGlass.buttonFillDisabled');
    expect(REFERRALS).toContain('spinGlass.buttonInkDisabled');
    expect(REFERRALS).toContain('setHowSheetOpen(true);');
    expect(REFERRALS).toContain('if (spinningRef.current || spinCredits <= 0) return;');
    expect(REFERRALS).toContain("L('Получить приз'");
  });

  // зачем: владелец (2026-07-26) — вход «Ввести код» убран из настроек, поэтому
  // на едином экране должна быть полноценная кнопка, а не тихая строка внизу.
  it('keeps a prominent enter-code button inside the hero', () => {
    const heroAt = REFERRALS.indexOf('testID="referrals-roulette-hero"');
    const heroEnd = REFERRALS.indexOf('testID="referrals-my-code-card"');
    const hero = REFERRALS.slice(heroAt, heroEnd);

    expect(hero).toContain('testID="referrals-enter-code"');
    expect(hero).toContain('setCodeSheetOpen(true)');
    expect(hero).toContain("L('Ввести код друга'");
  });
});
