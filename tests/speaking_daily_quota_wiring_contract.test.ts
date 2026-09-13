import fs from 'node:fs';
import path from 'node:path';

import { PAYWALL_SOURCE_VALUES } from '../app/paywall_entry_contract';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

describe('голосовая практика — дневной лимит через единый гейт', () => {
  const surfaces: ReadonlyArray<[string, string]> = [
    ['components/SpeakingButton.tsx', 'lesson_speaking'],
    ['app/lesson1.tsx', 'lesson_speaking'],
    ['app/flashcards/SpeakHoldButton.tsx', 'flashcards_speak_hold'],
    ['app/ai_dialog_session.tsx', 'ai_dialog_voice_input'],
  ];

  test.each(surfaces)('%s использует useSpeakingAttemptGate с source %s', (relative, source) => {
    const src = read(relative);
    expect(src).toContain('useSpeakingAttemptGate(');
    expect(src).toContain(`source: '${source}'`);
    expect(src).toContain('.tryStartAttempt()');
    // Старый глухой пейвол без source ушёл.
    expect(src).not.toMatch(/params:\s*\{\s*context:\s*'speaking'\s*\}/);
    expect(src).not.toContain("useFeatureAccess('speaking')");
  });

  test('все новые source зарегистрированы в контракте пейвола', () => {
    for (const source of ['lesson_speaking', 'flashcards_speak_hold', 'ai_dialog_daily_limit', 'dialogs_catalogue', 'stats_locked_card']) {
      expect(PAYWALL_SOURCE_VALUES).toContain(source);
    }
  });

  test('гейт: решение в кадре тапа, чек фоном, unavailable не открывает пейвол', () => {
    const gate = read('hooks/useSpeakingAttemptGate.ts');
    expect(gate).toContain("if (quota.status === 'exhausted') {");
    expect(gate).toContain('openPaywall();');
    expect(gate).toContain('void consumeRevenueDailyQuota({');
    expect(gate).toContain('inFlightRef');
    expect(gate).not.toContain("status === 'unavailable') {\n      openPaywall");
    expect(gate).toContain("void trackEvent('paywall_shown', { context: input.context, source: input.source });");
  });

  test('авторизованная карточная сессия не спрашивает дневной гейт', () => {
    const hold = read('app/flashcards/SpeakHoldButton.tsx');
    expect(hold).toContain('const speakingAllowed = sessionAuthorized || !speakingGate.locked;');
    expect(hold).toContain('if (!sessionAuthorized && !speakingGate.tryStartAttempt()) {');
  });

  test('квота хранится иммутабельными чеками PhoneState, без счётчика в AsyncStorage', () => {
    const quota = read('app/revenue_daily_quota.ts');
    expect(quota).toContain("commitReceipt('attempt', entityId, receipt, entityId, input.token.stableId, lineage)");
    expect(quota).toContain("REVENUE_DAILY_QUOTA_PREFIX = 'revenue_quota:v1:'");
    expect(quota).not.toMatch(/AsyncStorage\.setItem/);
    expect(quota).toContain('verifyPaidAccess(input.token, lease)');
  });
});
