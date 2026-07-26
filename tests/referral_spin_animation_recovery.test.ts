import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const REFERRALS = fs.readFileSync(path.join(ROOT, 'app', 'referrals.tsx'), 'utf8');
const CLIENT = fs.readFileSync(path.join(ROOT, 'app', 'roulette_spin_client.ts'), 'utf8');
const ARC = fs.readFileSync(path.join(ROOT, 'components', 'prize_arc.tsx'), 'utf8');

function onSpinSlice(): string {
  return REFERRALS.slice(
    REFERRALS.indexOf('const onSpin = useCallback(async () => {'),
    REFERRALS.indexOf('// DEV: кнопка «+1 ключ»'),
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
    const buttonEnd = REFERRALS.indexOf('</TouchableOpacity>', buttonAt);
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
    expect(REFERRALS).toContain('void preloadRoulettePrizeImages().catch(() => {});');
    expect(REFERRALS).not.toContain('await preloadRoulettePrizeImages().catch(() => {});');
  });

  it('uses the same server-winning path in DEV after a test key is issued', () => {
    expect(REFERRALS).toContain("setMessage('DEV: ключ добавлен — нажми «Получить приз», чтобы увидеть серверный выигрыш.');");
    expect(REFERRALS).toContain('const grantedSpins = Math.max(1, res.spinsTotal);');
    expect(REFERRALS).toContain('const devGrantedCreditsFloorRef = useRef(0);');
    expect(REFERRALS).toContain('devGrantedCreditsFloorRef.current = Math.max(devGrantedCreditsFloorRef.current, grantedSpins);');
    expect(REFERRALS).toContain('setSpinCredits((current) => Math.max(current, grantedSpins));');
    expect(REFERRALS).not.toContain('void load({ force: true }).catch(() => {});');
    expect(CLIENT).toContain('const spinCreditMutationEpochByScope = new Map<string, number>();');
    expect(CLIENT).toContain('await cacheClaimedSpinCredits(stableId, res.data.spinsTotal, requestEpoch);');
    expect(CLIENT).toContain('beginSpinCreditMutation(stableId);');
    expect(REFERRALS).toContain('const outcome = await spinReferralRoulette();');
    expect(REFERRALS).toContain('setWin({ prizeIndex: outcome.prizeIndex, prizeDays: outcome.prizeDays, vipUntil: outcome.vipUntil, prizeKind: outcome.prizeKind, prizePearls: outcome.prizePearls });');
  });

  // зачем: владелец (2026-07-26) — Pro (lifetime) получает жемчужины вместо дней:
  // сервер помечает prizeKind='pearls', клиент начисляет идемпотентной claim-
  // транзакцией по spinRequestId и НЕ трогает vip_* (нет «Plus активирован»).
  it('credits Pro pearls through an idempotent claim keyed by spinRequestId', () => {
    const onSpin = onSpinSlice();
    const CLIENT_PRIZES = fs.readFileSync(path.join(ROOT, 'app', 'roulette_prizes.ts'), 'utf8');
    const SHARDS = fs.readFileSync(path.join(ROOT, 'app', 'shards_system.ts'), 'utf8');
    const SPIN_FN = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'referral_spin.ts'), 'utf8');
    const SPIN_LOGIC = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'referral_spin_logic.ts'), 'utf8');

    // Лестница согласована владельцем и зеркалится клиент↔сервер.
    expect(SPIN_LOGIC).toContain('REFERRAL_SPIN_PRIZE_PEARLS: readonly number[] = [10, 25, 70, 150, 350, 800]');
    expect(CLIENT_PRIZES).toContain('ROULETTE_PRIZE_PEARLS: readonly number[] = [10, 25, 70, 150, 350, 800]');
    // Сервер: Pro определяется по progress.premium_plan, vip_* пишутся только для days.
    expect(SPIN_FN).toContain("=== 'lifetime'");
    expect(SPIN_FN).toContain("...(prizeKind === 'days' ? {");
    expect(SPIN_FN).toContain('prizePearls');
    // Клиент: начисление стартует после server ok и идемпотентно по spinRequestId.
    expect(onSpin).toContain("if (outcome.prizeKind === 'pearls')");
    expect(onSpin).toContain('claimReferralSpinPearls(outcome.spinRequestId, outcome.prizePearls)');
    expect(SHARDS).toContain('const claimId = `referral_spin_${requestId}`;');
    expect(SHARDS).toContain("shards_updated_reason: 'referral_spin'");
  });

  it('keeps reward cards bright and shows a disabled claim button when no keys remain', () => {
    expect(REFERRALS).toContain('<PrizeArc ref={arcRef} dimmed={false} />');
    expect(REFERRALS).toContain("accessibilityState={{ disabled: spinning || spinCredits <= 0 }}");
    expect(REFERRALS).toContain("disabled={spinning || spinCredits <= 0}");
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
