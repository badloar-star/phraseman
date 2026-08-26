import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('FeedbackRatingCard privacy and delivery contract', () => {
  const source = read('components/FeedbackRatingCard.tsx');

  /**
   * Владелец 2026-08-26: «убери этот текст и галочку — никаких согласий мы тут
   * не спрашиваем (вообще со всех экранов этот текст убери)». Согласие на
   * анализ тем во внешнем сервисе теперь даётся один раз в Политике
   * конфиденциальности, а не отдельной галочкой в каждой карточке отзыва.
   *
   * Сторож требует, чтобы галочка и её текст НЕ вернулись, и чтобы карточка
   * по-прежнему не блокировала отправку отзыва.
   */
  it('asks for no per-card consent and never blocks sending on one', () => {
    expect(source).not.toContain('setAiSummaryConsent');
    expect(source).not.toContain('aiConsentLabel');
    expect(source).not.toContain('ai-summary-consent');
    expect(source).not.toContain('accessibilityRole="checkbox"');
    expect(source).not.toContain('OpenAI');
    expect(source).not.toMatch(/disabled=\{[^}]*aiSummaryConsent/);
    expect(source).toContain('const aiSummaryConsent = true;');
  });

  it('uses the current fail-closed consent version in the client payload', () => {
    const client = read('app/feedback_client.ts');
    expect(client).toContain("FEEDBACK_AI_SUMMARY_CONSENT_VERSION = 'feedback-ai-summary-v2'");
    expect(client).toContain('aiSummaryConsentVersion?: string | null;');
    expect(client).toContain('input.aiSummaryConsentVersion === FEEDBACK_AI_SUMMARY_CONSENT_VERSION');
    expect(client).toContain('? input.aiSummaryConsentVersion');
    expect(source).toContain('aiSummaryConsentVersion: aiSummaryConsent ? FEEDBACK_AI_SUMMARY_CONSENT_VERSION : null');
  });

  it('flushes persisted rows and directly attempts the current row only when persistence fails', () => {
    expect(source).toContain('flushFeedbackOutbox(accountKey, submitFeedbackEntry)');
    expect(source).toContain('const persisted = await enqueueFeedbackEntry(accountKey, input)');
    expect(source).toContain('if (!persisted)');
    expect(source.match(/await submitFeedbackEntry\(input\)/g) ?? []).toHaveLength(1);
    expect(source).not.toContain('dequeueFeedbackEntry(accountKey, kind, entityId)');
  });

  it('retries pending rows on mount and keeps radio semantics and success contrast accurate', () => {
    expect(source).toContain('useEffect(() =>');
    expect(source).toContain('void flushPendingFeedback();');
    expect(source).toContain('accessibilityState={{ selected: rating === star }}');
    expect(source).toContain('color={t.correct}');
    expect(source).toContain('style={{ color: t.correct');
  });

  it('registers privacy-safe analytics without feedback text, consent, or identity', () => {
    expect(read('app/analytics.ts')).toContain("| 'feedback_entry_sent'");
    const eventCall = source.match(/trackEvent\('feedback_entry_sent',[\s\S]*?\);/)?.[0] ?? '';
    expect(eventCall).toContain("{ kind, rating, hasText: message !== '' }");
    expect(eventCall).not.toMatch(/message[,}]|aiSummaryConsent|entityId|userName/);
  });

  it('purges the current account outbox during app bootstrap without touching auth flow', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toContain("import('./feedback_outbox')");
    expect(layout).toContain('purgeExpiredFeedbackOutbox(stableId)');
    expect(layout).toContain('accountGeneration.phase !== \'active\'');
  });
});
