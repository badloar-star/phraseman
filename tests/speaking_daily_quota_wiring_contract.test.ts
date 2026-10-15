import fs from 'node:fs';
import path from 'node:path';

import { PAYWALL_SOURCE_VALUES } from '../app/paywall_entry_contract';
import { normalizeEol } from './helpers/read_source';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => normalizeEol(fs.readFileSync(path.join(root, relative), 'utf8'));

describe('голосовая практика — дневной лимит через единый гейт', () => {
  // зачем (владелец 15.10, D196): один ОБЩИЙ счётчик 3/день на все микрофоны (app/voice_daily_allowance.ts); хук useVoiceAttemptGate повторяет API прежнего гейта,
  // но решает по общему счётчику. Старый useSpeakingAttemptGate остаётся только у не подключённых к экранам мест (SpeakingButton).
  const surfaces: ReadonlyArray<[string, string, string]> = [
    ['app/lesson1.tsx', 'lessons', 'lesson_speaking'],
    ['app/flashcards/SpeakMicButton.tsx', 'cards_speaking', 'flashcards_speak_hold'],
    ['app/ai_dialog_session.tsx', 'ai_dialog', 'ai_dialog_voice_input'],
    ['app/mistake_practice_session.tsx', 'mistakes', 'mistake_practice_direct'],
    ['app/dialogue_v2_freeform.tsx', 'dialogs', 'dialogue_v2_freeform'],
  ];

  test.each(surfaces)('%s использует useVoiceAttemptGate (поверхность %s, source %s)', (relative, surface, source) => {
    const src = read(relative);
    expect(src).toContain('useVoiceAttemptGate({');
    expect(src).toContain(`surface: '${surface}'`);
    expect(src).toContain(`source: '${source}'`);
    expect(src).not.toContain('useSpeakingAttemptGate(');
    // Старый глухой пейвол без source ушёл.
    expect(src).not.toMatch(/params:\s*\{\s*context:\s*'speaking'\s*\}/);
    expect(src).not.toContain("useFeatureAccess('speaking')");
  });

  test('ИИ-диалог проверяет лимит до записи, а списывает, когда микрофон реально слушает', () => {
    const src = read('app/ai_dialog_session.tsx');
    expect(src).toContain('.canStartAttempt()');
    expect(src).toContain('.commitStartedAttempt()');
  });

  test('хук общего гейта: пейвол ai_voice_input на исчерпанном лимите, списание одной попытки на запись', () => {
    const gate = read('hooks/use_voice_attempt_gate.ts');
    expect(gate).toContain('voiceDailyAllowanceGate(surface, { accessResolved, hasPremiumAccess })');
    expect(gate).toContain('VOICE_LIMIT_PAYWALL_CONTEXT');
    expect(gate).toContain('recordVoiceDailyAttempt(surface,');
    expect(gate).toContain("void trackEvent('paywall_shown', { context: VOICE_LIMIT_PAYWALL_CONTEXT, source });");
  });

  test('все новые source зарегистрированы в контракте пейвола', () => {
    for (const source of ['lesson_speaking', 'flashcards_speak_hold', 'ai_dialog_daily_limit', 'dialogs_catalogue', 'stats_locked_card', 'mistake_practice_direct', 'dialogue_v2_freeform']) {
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

  test('квота хранится иммутабельными чеками PhoneState, без счётчика в AsyncStorage', () => {
    const quota = read('app/revenue_daily_quota.ts');
    expect(quota).toContain("commitReceipt('attempt', entityId, receipt, entityId, input.token.stableId, lineage)");
    expect(quota).toContain("REVENUE_DAILY_QUOTA_PREFIX = 'revenue_quota:v1:'");
    expect(quota).not.toMatch(/AsyncStorage\.setItem/);
    expect(quota).toContain('verifyPaidAccess(input.token, lease)');
  });
});
