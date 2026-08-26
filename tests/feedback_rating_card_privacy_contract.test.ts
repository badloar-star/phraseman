import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('FeedbackRatingCard privacy and delivery contract', () => {
  const source = read('components/FeedbackRatingCard.tsx');

  it('offers optional accessible AI analysis consent without gating feedback submission', () => {
    expect(source).toContain("const [aiSummaryConsent, setAiSummaryConsent] = useState(false);");
    expect(source).toContain('accessibilityRole="checkbox"');
    expect(source).toContain('accessibilityState={{ checked: aiSummaryConsent }}');
    expect(source).toContain('minHeight: 44');
    expect(source).toContain('aiSummaryConsent,');
    expect(source).not.toMatch(/disabled=\{[^}]*aiSummaryConsent/);
    for (const locale of ['ru', 'uk', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
      expect(source).toContain(`${locale}:`);
    }
    expect(source.match(/OpenAI/g) ?? []).toHaveLength(8);
    for (const warning of [
      'Не указывайте личные данные',
      'Не вказуйте особисті дані',
      'No incluyas datos personales',
      'Não inclua dados pessoais',
      'Không nhập dữ liệu cá nhân',
      'Jangan masukkan data pribadi',
      'Kişisel veri girmeyin',
      'Nie wpisuj danych osobowych',
    ]) {
      expect(source).toContain(warning);
    }
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
