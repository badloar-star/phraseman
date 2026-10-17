import fs from 'fs';
import path from 'path';

import { act, cleanup, renderHook } from '@testing-library/react-native';

import { callExplainMistake } from '../app/ai_mistake_explain_client';
import { MISTAKE_EXPLAIN_ENABLED } from '../app/mistake_explain_flag';
import { useMistakeExplain } from '../app/use_mistake_explain';

// зачем (владелец 17.10): «кнопку Объяснить отключаем вообще, её не должно быть». Сторож держит флаг выключенным
// и доказывает, что при нём хук не показывает карточку, не открывает шторку согласия и не зовёт облако.
jest.mock('../app/ai_mistake_explain_client', () => ({
  callExplainMistake: jest.fn(),
  isMistakeExplainOfflineError: () => false,
  warmExplainMistake: jest.fn(),
}));
jest.mock('../app/ai_explain_consent', () => ({
  hasAiExplainConsentDecision: () => false,
  isAiExplainConsentGranted: () => true,
  isAiExplainConsentHydrated: () => true,
  recordAiExplainConsentToCloud: jest.fn(async () => undefined),
  setAiExplainConsent: jest.fn(async () => undefined),
  subscribeAiExplainConsent: () => () => undefined,
}));
jest.mock('../app/ai_mistake_explain_limit_session', () => ({
  hasShownAiMistakeLimitNoticeToday: jest.fn(async () => false),
  markAiMistakeLimitNoticeShownToday: jest.fn(async () => undefined),
  peekAiMistakeLimitNoticeShownToday: jest.fn(() => false),
  getAiMistakeExplainsLeftToday: jest.fn(async () => 3),
  markAiMistakeExplainUsed: jest.fn(async () => undefined),
  buyMistakeExplainLocally: jest.fn(async () => ({ ok: false, reason: 'test' })),
  FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT: 3,
  MISTAKE_EXPLAIN_PRICE_RUNES: 120,
}));
jest.mock('../app/level_spin_star_grants', () => ({
  readUnifiedLevelSpinStars: jest.fn(async () => ({ balance: 0, earnedTotal: 0 })),
}));
jest.mock('../components/PremiumContext', () => ({ usePremium: () => ({ hasPremiumAccess: false }) }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../app/net_status', () => ({
  getNetStatus: () => 'online',
  subscribeNetStatus: () => () => undefined,
}));
jest.mock('../app/mistake_token_resolver', () => ({
  resolveAllMistakeTokens: () => [],
  resolvePhraseMistakeToken: () => undefined,
}));

describe('ИИ-разбор ошибок выключен (владелец 17.10)', () => {
  afterEach(async () => {
    await cleanup();
  });

  it('флаг выключен', () => {
    expect(MISTAKE_EXPLAIN_ENABLED).toBe(false);
  });

  it.each([true, false])('автозапуск=%s: карточка скрыта, согласие не спрашивается, облако не зовётся', async (autoStart) => {
    const hook = await renderHook(() => useMistakeExplain({
      active: true,
      autoStart,
      phraseKey: 'p1:wrong',
      lessonId: 1,
      phraseId: 'p1',
      studyTarget: 'en',
      interfaceLang: 'ru',
      prompt: 'Привет',
      userAnswer: 'Helo',
      targetAnswer: 'Hello',
    }));
    await act(async () => {
      hook.result.current.explain();
      hook.result.current.eli5.onOpen();
      hook.result.current.refreshMistakeExplain();
    });
    expect(hook.result.current.aiMistakeState).toBe('hidden');
    expect(hook.result.current.consentGate.visible).toBe(false);
    expect(hook.result.current.eli5.open).toBe(false);
    expect(callExplainMistake).not.toHaveBeenCalled();
  });

  it('плитка «Объяснить» в уроке и облачная подсказка хаба ошибок выключены тем же флагом', () => {
    const lesson = fs.readFileSync(path.join(process.cwd(), 'app/lesson1.tsx'), 'utf8');
    expect(lesson).toContain('MISTAKE_EXPLAIN_ENABLED && isExplainEnabled()');
    const advice = fs.readFileSync(path.join(process.cwd(), 'app/mistake_hub_advice.ts'), 'utf8');
    expect(advice).toContain('[MISTAKE-HUB-ADVICE] disabled');
    expect(advice.indexOf('if (!MISTAKE_EXPLAIN_ENABLED)')).toBeLessThan(advice.indexOf('const pending = refreshInFlight.get(key)'));
  });

  it('клиент explainPhrase заблокирован на входе: вызов и прогрев не уходят в облако', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'app/explain_phrase_client.ts'), 'utf8');
    expect(src).toContain('[MISTAKE-EXPLAIN] disabled callExplainPhrase blocked');
    expect(src).toContain('[MISTAKE-EXPLAIN] disabled warmExplainPhrase skipped');
    expect(src.indexOf('disabled callExplainPhrase blocked')).toBeLessThan(src.indexOf("readExplainLocalCache({ kind: 'phrase', key })"));
  });

  it('предгенерация текстов для разбора на экране ошибок выключена тем же флагом', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'app/mistake_practice_session.tsx'), 'utf8');
    expect(src).toContain('if (!MISTAKE_EXPLAIN_ENABLED)');
    expect(src.indexOf('if (!MISTAKE_EXPLAIN_ENABLED)')).toBeLessThan(src.indexOf('void prewarmMistakeSessionExplanations({'));
  });
});
