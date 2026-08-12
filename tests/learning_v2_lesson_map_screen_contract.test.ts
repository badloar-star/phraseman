import fs from 'node:fs';
import path from 'node:path';

const screenPath = path.join(process.cwd(), 'app', 'learning-v2', 'lesson', '[id].tsx');
const source = fs.readFileSync(screenPath, 'utf8');

describe('Learning V2 Lesson 1 map screen contract', () => {
  it('is a separate route and loads real local-first progress without touching legacy economy', () => {
    expect(source).toContain('createLesson1LocalProgressStore(AsyncStorage');
    expect(source).toContain('lesson1MapInputFromProgress(state)');
    expect(source).toContain('useState(getLesson1SourcePayload)');
    expect(source).not.toMatch(/useEnergy|EnergyBar|registerXP|registerShards/);
  });

  it('keeps the long zigzag course, semantic actions and reduced-motion guardrails explicit', () => {
    expect(source).toContain("['understand', 'use', 'master']");
    expect(source).toContain('const PATH_WAVE');
    expect(source).toContain("kind: 'episode' | 'checkpoint'");
    expect(source).toContain("Array.from({ length: 31 }");
    expect(source).toContain('height: 74');
    expect(source).toContain('Путь к свободной речи');
    expect(source).toContain('4 сектора · 32 эпизода · уроки и экзамены');
    expect(source).toContain('SESSION_ZONE_META');
    expect(source).toContain('width: 40, height: 40');
    expect(source).toContain('useStableSafeAreaInsets');
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('AppState.addEventListener');
    expect(source).toContain('FadeInDown.delay((node.order - 1) * 40).duration(320)');
    expect(source).toContain('Easing.bezier(.38, .70, .125, 1)');
    expect(source).toContain('SlideInDown.duration(320)');
    expect(source).toContain('Открыть словарь первого эпизода');
    expect(source).toContain('Открыть теорию первого эпизода');
  });

  it('shows a presentation-only session reward without pretending it is the wallet balance', () => {
    expect(source).toContain('parseLearningV2SessionResultRouteParams');
    expect(source).toContain('РЕЗУЛЬТАТ СЕССИИ СОХРАНЁН');
    expect(source).toContain('Общий баланс обновляется отдельно');
    expect(source).toContain('accessibilityLiveRegion="polite"');
    expect(source).toContain('systemReducedMotion ? FadeInDown.duration(1)');
  });

  it('hydrates and announces only the authoritative shared star wallet', () => {
    expect(source).toContain('useState(peekCurrentLearningV2WalletBalance)');
    expect(source).toContain('subscribeLearningV2WalletBalance(refresh)');
    expect(source).toContain('hydrateCurrentLearningV2WalletBalance()');
    expect(source).toContain('walletBalance.balanceSubunits / WALLET_SUBUNITS_PER_STAR');
    expect(source).toContain('accessibilityLiveRegion="polite"');
    expect(source).toContain('Подтверждённый баланс:');
  });
});
