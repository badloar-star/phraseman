import { readFileSync } from 'fs';
import { join } from 'path';

// зачем: сторож инвариантов сцены «Дар дня»
// (components/daily_journey/DailyJourneyRevealScene.tsx) по одобренной спеке
// docs/superpowers/specs/2026-08-30-daily-journey-gift-inbox-design.md и
// запретам владельца. Статический тест по исходнику: дешёвый по памяти,
// не тянет React Native в jest.

const SRC_PATH = join(
  __dirname,
  '..',
  'components',
  'daily_journey',
  'DailyJourneyRevealScene.tsx',
);
const src = readFileSync(SRC_PATH, 'utf8');

describe('DailyJourneyRevealScene contract', () => {
  test('запрет владельца: никаких рамок вокруг контейнеров', () => {
    expect(src).not.toMatch(/borderWidth/);
    expect(src).not.toMatch(/borderColor/);
  });

  test('спека п.5: в сцене нет кнопок решения и описаний награды', () => {
    expect(src).not.toMatch(/Применить/);
    expect(src).not.toMatch(/Позже/);
    expect(src).not.toMatch(/daily-journey-apply/);
    expect(src).not.toMatch(/daily-journey-later/);
  });

  test('убирает счётчик из 50 и гасит имя награды только под конец полёта подарка', () => {
    expect(src).not.toContain('dailyJourneyDayProgress');
    expect(src).toContain('dailyJourneyRewardDisplayLabel(currentReward, lang)');
    expect(src).toContain('testID="daily-journey-reward-label"');
    expect(src).toContain('const rewardLabelOp = useRef(new Animated.Value(0)).current');
    const revealSource = src.slice(src.indexOf('const reveal = Animated.parallel'), src.indexOf('// Свет живёт конечно'));
    const flightSource = src.slice(src.indexOf('const flight = Animated.parallel'), src.indexOf('const settle = Animated.timing'));
    expect(revealSource).toMatch(/Animated\.timing\(rewardLabelOp, \{ toValue: 1, duration: 260/);
    expect(revealSource).toContain('Animated.delay(1_140)');
    expect(revealSource).not.toMatch(/Animated\.timing\(rewardLabelOp, \{ toValue: 0/);
    expect(src).toMatch(/applyRevealEndState[\s\S]{0,900}rewardLabelOp\.setValue\(1\)/);
    expect(flightSource).toMatch(/Animated\.timing\(rewardLabelOp, \{ toValue: 0, duration: 180, delay: 430/);
    expect(src).toMatch(/rewardLabelWrap:\s*\{\s*position:\s*'absolute'/);
  });

  test('единственный контрол: «Пропустить» с ролью и меткой', () => {
    expect(src).toMatch(/daily-journey-skip/);
    expect(src).toMatch(/Пропустить/);
    expect(src).toMatch(/accessibilityRole="button"/);
    expect(src).toMatch(/accessibilityLabel=\{skipCopy\.accessibility\}/);
    expect(src).toContain('dailyJourneyTileAccessibilityLabel(');
    expect(src).toContain('AccessibilityInfo.announceForAccessibility(');
  });

  test('lifecycle ratchet: без бесконечных циклов, свет конечной длительности', () => {
    expect(src).not.toMatch(/Animated\.loop\s*\(/);
    expect(src).not.toMatch(/withRepeat\(/);
    expect(src).toMatch(/RAYS_TURN_MS = 36_000/);
    expect(src).toMatch(/raysTurnA\.stopAnimation\(\)/);
    expect(src).toMatch(/raysTurnB\.stopAnimation\(\)/);
  });

  test('перф: всё движение на native driver, без layout-анимаций', () => {
    expect(src).not.toMatch(/useNativeDriver:\s*false/);
    const timingCount = (src.match(/Animated\.timing\(/g) ?? []).length;
    const nativeCount = (src.match(/useNativeDriver:\s*true/g) ?? []).length;
    expect(nativeCount).toBeGreaterThanOrEqual(timingCount);
  });

  test('спека п.5: арт занимает 78% плитки, сетка главы из модели', () => {
    expect(src).toMatch(/width:\s*'78%'/);
    expect(src).toMatch(/dailyJourneyChapterForDay/);
    expect(src).toMatch(/from '\.\.\/\.\.\/app\/daily_journey_rewards'/);
  });

  test('спека п.5.2: единственный звук — существующее интро, со стопом', () => {
    const requests = src.match(/soundDirector\.request\(\s*'([^']+)'/g) ?? [];
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain('pm.reward.daily_journey_intro');
    expect(src).toMatch(/stopActiveEvent\('pm\.reward\.daily_journey_intro'/);
  });

  test('спека п.5.6: фоллбэк цели полёта и reduce motion обязаны существовать', () => {
    expect(src).toMatch(/top-center/);
    expect(src).toMatch(/useReduceMotion\(\)/);
    expect(src).toMatch(/startReducedMotion/);
  });

  test('правило логов: ранние выходы и catch пишут причину с префиксом', () => {
    expect(src).toMatch(/\[DAILY-JOURNEY-REVEAL\]/);
    expect(src).toMatch(/djLog\(`measureInWindow threw:/);
    expect(src).toMatch(/djLog\(`startFlight ignored/);
    expect(src).toMatch(/djLog\(`intro chain failed/);
    // немой catch запрещён: каждый catch обязан звать djLog
    const catches = src.match(/catch\s*(\([^)]*\))?\s*\{[^}]*\}/g) ?? [];
    for (const block of catches) {
      expect(block).toMatch(/djLog/);
    }
  });

  test('типографика владельца: только веса 400 и 700', () => {
    const weights = src.match(/fontWeight:\s*'(\d+)'/g) ?? [];
    for (const w of weights) {
      expect(w).toMatch(/'(400|700)'/);
    }
  });

  test('доставка неотменяема: skip ведёт в полёт, onDelivered один раз', () => {
    expect(src).toMatch(/skipToDelivery/);
    expect(src).toMatch(/deliveredRef/);
    expect(src).toMatch(/onDelivered suppressed/);
  });

  test('skip diagnostic callback tracks the current reduced-motion preference', () => {
    const skipCallback = src.match(/const skipToDelivery = useCallback\([\s\S]*?\n\s*\}, \[[^\]]*\]\);/)?.[0] ?? '';
    expect(skipCallback).toContain('reduceMotion=${reduceMotion}');
    expect(skipCallback).toMatch(/\}, \[reduceMotion\]\);/);
  });

  test('точный art map использует билет спина и все существующие rune/energy варианты', () => {
    expect(src).toContain("assets/images/spin/spin_ticket.webp");
    expect(src).toContain('energy_plus2.webp');
    expect(src).toContain('energy_plus3.webp');
    expect(src).toContain('stars_250.webp');
    expect(src).toContain('stars_500.webp');
    expect(src).toContain('stars_1000.webp');
    expect(src).toContain('reward.amount === 3');
    expect(src).toContain('pearls_150:');
    expect(src).toContain('dailyJourneyRuneArtRewardId(reward.amount)');
  });

  test('uses the durable cycle for absolute chapter numbering across 50-day loops', () => {
    expect(src).toContain('cycle?: number');
    expect(src).toContain('(normalizedCycle - 1) * 5 + dailyJourneyChapterNumber(normalizedDay)');
  });

  test('switching Reduce Motion on during intro accelerates the active run to reduced delivery', () => {
    expect(src).toContain('reduceMotionRef.current = reduceMotion');
    expect(src).toContain('if (visible && reduceMotion && phaseRef.current === \'intro\')');
    expect(src).toContain('lifecycleRef.current.startFlight(lifecycleTokenRef.current)');
  });

  test('финальный выход раскрытия — сильный ease-out без Easing.in', () => {
    expect(src).not.toMatch(/Easing\.in\(/);
    expect(src).toContain('Easing.bezier(0.23, 1, 0.32, 1)');
  });
});
