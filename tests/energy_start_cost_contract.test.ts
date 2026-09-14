import fs from 'fs';
import path from 'path';

/** Fast source contract for the owner-approved numeric energy system. */
const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('numeric energy v2 contract', () => {
  it('has one canonical capacity, recovery rate and activity price table', () => {
    const contract = read('app/energy_contract.ts');
    expect(contract).toContain('ENERGY_SCHEMA_VERSION = 2');
    expect(contract).toContain('ENERGY_BASE_CAPACITY = 100');
    expect(contract).toContain('ENERGY_ACTIVE_CAPACITY_LIMIT = ENERGY_PERMANENT_CAPACITY_LIMIT + ENERGY_BONUS_CAPACITY_LIMIT');
    expect(contract).toContain('ENERGY_PASSIVE_UNIT_MS = 6 * 60 * 1000');
    expect(contract).toContain('ENERGY_VIDEO_UNIT_MS = 36 * 1000');
    expect(contract).toContain('flashcards: 10');
    expect(contract).toContain('classic_lesson: 20');
    expect(contract).toContain('learning_v2_session: 20');
    expect(contract).toContain('arena_match: 25');
    expect(contract).toContain('video: 0');
    expect(contract).toContain('max_call: 0');
  });

  it('remote defaults resolve to 100 energy and one unit every six minutes', () => {
    const flags = read('app/remote_flags.ts');
    expect(flags).toContain('numeric_energy_v2: true');
    expect(flags).toContain('energy_max: 100');
    expect(flags).toContain('energy_recovery_interval_ms: 6 * 60 * 1000');
  });

  it('all paid starts use the single durable activity-first context entry point', () => {
    const context = read('components/EnergyContext.tsx');
    expect(context).toContain('const confirmActivityStart = useCallback');
    expect(context).toContain('activityEnergyCost(activity)');
    expect(context).toContain('commitEnergySessionStart(');
    expect(context).toContain('applySessionProjection(result.projection)');
    expect(context).toContain("reason: 'spend'");
    expect(context).toContain('energyVisualTransactions.publish({');
    expect(context).not.toContain("emitAppEvent('energy_spent_on_start'");
    expect(context).not.toContain('createEnergySpendMotionWaiter');
  });

  it('legacy wrappers cannot choose their own numeric price', () => {
    const context = read('components/EnergyContext.tsx');
    expect(context).toContain('const spendAmount = useCallback(async (_n: number');
    expect(context).toContain('const confirmSpendAmount = useCallback(async (_n: number');
    expect(context).toContain('energyActivityForSessionKind(intent.grant.kind)');
  });

  it('refunds the exact durable operation and publishes one reverse transaction', () => {
    const context = read('components/EnergyContext.tsx');
    expect(context).toContain('const refundActivityStart = useCallback');
    expect(context).toContain('refundEnergySessionStart(');
    expect(context).toContain("operationId: `${operationId}:refund`");
    expect(context).toContain("reason: 'refund'");
    expect(context).toContain('const refundOne = refundActivityStart');
  });

  it('uses one vector numeric badge and no energy image asset', () => {
    const badge = read('components/EnergyCostBadge.tsx');
    const icon = read('components/EnergyIcon.tsx');
    expect(badge).toContain('activity: EnergyActivityKey');
    expect(badge).toContain('activityEnergyCost(activity)');
    expect(badge).toContain('name="flash-outline"');
    expect(badge).toContain('−{cost}');
    expect(icon).toContain('name="flash-outline"');
    expect(icon).not.toContain('expo-image');
    expect(icon).not.toContain('require(');
    expect(fs.readdirSync(path.join(process.cwd(), 'assets/images/energy'))).toEqual([]);
  });

  it('uses one compact fixed-size energy pill in every header', () => {
    const bar = read('components/EnergyBar.tsx');
    expect(bar).toContain('const ENERGY_PILL_WIDTH = 60');
    expect(bar).toContain('const ENERGY_PILL_HEIGHT = 28');
    expect(bar).toContain('const ENERGY_PILL_TOUCH_HEIGHT = 44');
    expect(bar).toContain('valueCompact: { width: 36, height: 21, fontSize: 15');
    expect(read('components/energy/AnimatedEnergyNumber.tsx')).toContain('maxFontSizeMultiplier={1.15}');
    expect(bar).toContain('width: ENERGY_PILL_WIDTH');
    expect(bar).not.toContain('capsuleCompact');
    expect(bar).not.toContain('touchTargetCompact');
  });

  it('does not render the energy control for Plus or Pro accounts', () => {
    const bar = read('components/EnergyBar.tsx');
    expect(bar).toContain("import { usePremium } from './PremiumContext'");
    expect(bar).toContain('const { hasPremiumAccess } = usePremium()');
    expect(bar).toContain('if (hasPremiumAccess) return null');
  });

  it('keeps the original compact anchored energy tooltip contract', () => {
    const bar = read('components/EnergyBar.tsx');
    const popover = read('components/energy/EnergyInfoPopover.tsx');
    expect(bar).toContain('measureInWindow');
    expect(bar).toContain('anchor={popoverAnchor}');
    expect(popover).toContain('const POPOVER_WIDTH = 220');
    expect(popover).toContain("backgroundColor: '#1C1C1E'");
    expect(popover).toContain('energyArrowLeft');
    expect(popover).toContain('1 энергия каждые');
    expect(popover).toContain("ru: 'Через'");
    expect(popover).toContain('При просмотре видео энергия восстанавливается в 10 раз быстрее');
    expect(popover).not.toContain('100 энергии в час');
    expect(popover).not.toContain("ru: 'Следующая единица'");
    expect(popover).not.toContain("ru: 'Полный заряд'");
  });

  it('renders activity prices only after energy access is known and only for free users', () => {
    const badge = read('components/EnergyCostBadge.tsx');
    expect(badge).toContain('const { isUnlimited, energyReady } = useEnergy()');
    expect(badge).toContain('if (!energyReady || isUnlimited || cost === 0) return null');
  });

  it('removes the old flying-lightning host and event', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'components/EnergySpendFlightHost.tsx'))).toBe(false);
    expect(read('app/_layout.tsx')).not.toContain('EnergySpendFlightHost');
    expect(read('app/events.ts')).not.toContain('energy_spent_on_start');
    expect(read('constants/motionHybrid.ts')).not.toContain('ENERGY_SPEND_TRANSFER_HYBRID');
  });

  it('animates every integer on spend, refill, video and gift transactions', () => {
    const number = read('components/energy/AnimatedEnergyNumber.tsx');
    const bar = read('components/EnergyBar.tsx');
    expect(number).toContain('Array.from(');
    expect(number).toContain('withSequence(...steps)');
    expect(number).toContain('useReducedMotion()');
    expect(bar).toContain('<AnimatedEnergyNumber');
    expect(bar).toContain('value={current}');
  });

  it('shows central prices on representative paid CTAs', () => {
    for (const [file, activity] of [
      ['app/flashcards_training_setup.tsx', 'flashcards'],
      ['app/learning-v2/lesson/[id].tsx', 'learning_v2_session'],
      ['components/arena/ArenaModeSheet.tsx', 'arena_match'],
      ['components/level-exam/LevelExamIntro.tsx', 'level_exam'],
      ['components/AiDialogBriefingScreen.tsx', 'ai_dialog'],
    ] as const) {
      expect(read(file)).toContain(`activity="${activity}"`);
    }
  });

  it('keeps MAX free and mistakes inside an activity free', () => {
    const max = read('app/max_call_prestart.tsx');
    expect(max).not.toContain('EnergyCostBadge');
    expect(max).not.toContain('confirmSpendOne');
    for (const file of [
      'app/lesson1.tsx',
      'app/lesson_words.tsx',
      'app/lesson_irregular_verbs.tsx',
      'app/preposition_drill.tsx',
      'app/personal_plan_exercise.tsx',
    ]) expect(read(file)).not.toContain('spendEnergyOnMistake');
  });

  it('keeps synchronous double-tap latches on network-backed paid taps', () => {
    for (const { file, latch } of [
      { file: 'app/arena_today.tsx', latch: 'startChargeInFlightRef' },
      { file: 'app/arena_friend_duel.tsx', latch: 'chargeInFlightRef' },
      { file: 'app/arena_invite.tsx', latch: 'chargeInFlightRef' },
      { file: 'app/flashcards_swipe.tsx', latch: 'startChargeInFlightRef' },
      { file: 'app/diagnostic_test.tsx', latch: 'diagnosticChargeInFlightRef' },
    ]) {
      const source = read(file);
      expect(source).toContain(`const ${latch} = useRef(false)`);
      expect(source).toContain(`${latch}.current = true`);
      expect(source).toContain(`${latch}.current = false`);
    }
  });

  it('covers recall and direct Learning V2 retry paid-entry callsites', () => {
    const recall = read('app/flashcards_recall_session.tsx');
    expect(recall).toContain("useEnergySessionIntent(");
    expect(recall).toContain("'flashcards'");
    expect(recall).toContain('await confirmSpendOne(energyIntent)');
    expect(recall).toContain('activity="flashcards"');

    const directV2 = read('app/learning_v2_direct_session_player_v1.tsx');
    expect(directV2).toContain('useEnergySessionIntent(');
    expect(directV2).toContain('"learning_v2_session"');
    expect(directV2).toContain('await confirmSpendOne(restartEnergyIntent)');
    expect(directV2).toContain('restartEnergyBusyRef.current = true');
  });
});
