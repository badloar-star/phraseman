import fs from 'fs';
import path from 'path';

/** Fast source contract for the owner-approved numeric energy system. */
const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('numeric energy v2 contract', () => {
  // PM-081/PM-082 (BIBLE «Энергия: 5, −1 за начавшееся учебное занятие»):
  // потолок 5 и единая цена 1. Лестница 10/20/25 и запас 100 — отменены.
  it('has one canonical capacity, recovery rate and activity price table', () => {
    const contract = read('app/energy_contract.ts');
    expect(contract).toContain('ENERGY_SCHEMA_VERSION = 2');
    expect(contract).toContain('ENERGY_BASE_CAPACITY = 5');
    expect(contract).toContain('ENERGY_SESSION_COST = 1');
    // D07/PM-081: бонусов к потолку нет — активный потолок равен постоянному, бонус 0.
    expect(contract).toContain('ENERGY_BONUS_CAPACITY_LIMIT = 0');
    expect(contract).toContain('ENERGY_ACTIVE_CAPACITY_LIMIT = ENERGY_PERMANENT_CAPACITY_LIMIT');
    // PM-083 (BIBLE «+1 за 10 минут»): прежние 6 минут отменены.
    expect(contract).toContain('ENERGY_PASSIVE_UNIT_MS = 10 * 60 * 1000');
    expect(contract).toContain('ENERGY_VIDEO_UNIT_MS = 36 * 1000');
    expect(contract).toContain('flashcards: ENERGY_SESSION_COST');
    expect(contract).toContain('classic_lesson: ENERGY_SESSION_COST');
    expect(contract).toContain('learning_v2_session: ENERGY_SESSION_COST');
    expect(contract).toContain('level_exam: ENERGY_SESSION_COST');
    expect(contract).toContain('arena_match: ENERGY_SESSION_COST');
    expect(contract).not.toMatch(/:s*(10|20|25),/);
    expect(contract).toContain('video: 0');
    // MAX удалён (D81): ключа активности max_call в таблице цен больше нет.
    expect(contract).not.toContain('max_call');
  });

  // зачем: D66 (local-first) — энергия решается на устройстве; удалённые флаги
  // numeric_energy_v2/max_energy/energy_recovery_interval_ms из remote_flags убраны.
  // Запас 5 и восстановление 10 минут живут только в energy_contract.ts (проверено выше),
  // сторож не даёт им вернуться в удалённый конфиг.
  it('energy capacity and recovery are local constants, not remote flags', () => {
    const flags = read('app/remote_flags.ts');
    expect(flags).not.toContain('numeric_energy_v2');
    expect(flags).not.toContain('max_energy');
    expect(flags).not.toContain('energy_recovery_interval_ms');
    const contract = read('app/energy_contract.ts');
    expect(contract).toContain('maxEnergy: ENERGY_BASE_CAPACITY');
    expect(contract).toContain('recoveryIntervalMs: ENERGY_PASSIVE_UNIT_MS');
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

  // зачем (PM-086, владелец 2026-09-24): EnergyCostBadge.tsx удалён целиком —
  // ценники энергии убраны со всех кнопок (расход энергии не менялся).
  // Прежний тест сторожил формат самого бейджа, которого больше нет.
  // EnergyIcon остаётся — им пользуется EnergyBar (постоянный индикатор
  // в хедере), проверка на него переносится сюда.
  it('keeps the vector energy icon without an image asset', () => {
    const icon = read('components/EnergyIcon.tsx');
    expect(fs.existsSync(path.join(process.cwd(), 'components/EnergyCostBadge.tsx'))).toBe(false);
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
    expect(bar).toContain('valueCompact: { width: 36, height: 22, fontSize: 16');
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

  it('keeps one compact anchored liquid-glass energy popover', () => {
    const bar = read('components/EnergyBar.tsx');
    const popover = read('components/energy/EnergyInfoPopover.tsx');
    const popoverLayout = read('components/energy/energy_info_popover_layout.ts');
    expect(bar).toContain('measureInWindow');
    expect(bar).toContain('anchor={popoverAnchor}');
    expect(bar).toContain('const popoverEligible = !hasPremiumAccess && focused && ownerActive');
    expect(bar).toContain('visible={popoverVisible}');
    expect(popoverLayout).toContain('MAX_POPOVER_WIDTH = 220');
    expect(popover).toContain('backgroundColor: glass.opaqueCard');
    expect(popover).toContain('borderColor: glass.glassEdge');
    expect(popover).toContain('layout.arrowLeft');
    expect(popover).toContain('1 энергия каждые');
    expect(popover).toContain("ru: 'Через'");
    expect(popover).toContain("ru: 'запас полон'");
    expect(popover).not.toContain('100 энергии в час');
    expect(popover).not.toContain('10 раз быстрее');
    expect(popover).not.toContain('Подарок +');
  });

  // зачем (PM-086, владелец 2026-09-24): EnergyCostBadge удалён — гейт
  // "только для бесплатных после готовности энергии" сторожить больше
  // нечего, сама механика списания энергии (EnergyContext) не менялась.

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

  // зачем (PM-086, владелец 2026-09-24): ценники энергии убраны со ВСЕХ
  // кнопок владельцем — прежний тест требовал их присутствия на 5 экранах,
  // то есть сторожил отменённое правило. Расход энергии на этих экранах
  // не меняется (activityEnergyCost/confirmSpendOne остаются внутри
  // EnergyContext), убрана только видимая цена перед стартом.
  it('no longer shows a price badge on the representative paid CTAs', () => {
    for (const file of [
      'app/flashcards_training_setup.tsx',
      'app/learning-v2/lesson/[id].tsx',
      'components/level-exam/LevelExamIntro.tsx',
      'components/AiDialogBriefingScreen.tsx',
    ]) {
      // зачем: комментарии могут упоминать бывший бейдж как историю (project_energy_badge_clip
      // и т.п.) — запрещаем именно живой JSX-тег, а не любое упоминание слова в файле.
      expect(read(file)).not.toContain('<EnergyCostBadge');
    }
  });

  // зачем: D81 — клиентский MAX удалён целиком, раздел законсервирован (пломбы сторожит
  // max_section_sealed_contract). «MAX бесплатен» теперь = экрана нет + цена в таблице 0.
  it('keeps MAX sealed and free, and mistakes inside an activity free', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'app/max_call_prestart.tsx'))).toBe(false);
    expect(read('app/energy_contract.ts')).not.toContain('max_call');
    for (const file of [
      'app/lesson1.tsx',
      'app/lesson_words.tsx',
      'app/lesson_irregular_verbs.tsx',
      'app/preposition_drill.tsx',
    ]) expect(read(file)).not.toContain('spendEnergyOnMistake');
  });

  it('keeps synchronous double-tap latches on network-backed paid taps', () => {
    for (const { file, latch } of [
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
    expect(recall).toContain("'flashcards_recall'");
    // зачем (03.10): интент берётся под запись журнала (resolveEnergyIntentForRecord), а не из manifest.
    expect(recall).toContain('confirmSpendOne(recordIntent)');
    expect(recall).toContain('resolveEnergyIntentForRecord(');
    expect(recall).toContain('activity="flashcards"');

    const directV2 = read('app/learning_v2_direct_session_player_v1.tsx');
    expect(directV2).toContain('useEnergySessionIntent(');
    expect(directV2).toContain('"learning_v2_session"');
    expect(directV2).toContain('await confirmSpendOne(restartEnergyIntent)');
    expect(directV2).toContain('restartEnergyBusyRef.current = true');
  });
});
