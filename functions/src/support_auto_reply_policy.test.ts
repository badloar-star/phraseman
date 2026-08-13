import {
  buildGroundedReplySystemPrompt,
  buildPremiumAlternativePaymentReply,
  classifySupportRisk,
  isPremiumAlternativePaymentQuestion,
  parseSupportDraftEnvelope,
  selectFinalAutoReply,
} from './support_auto_reply_policy';
import type { SupportRepositoryContext } from './support_repository_context_types';
import { makeSupportOwnerInstructionsSnapshot } from './support_owner_instructions';

const context: SupportRepositoryContext = {
  generatedAt: '2026-08-11T00:00:00.000Z', commit: 'a'.repeat(40), dirty: false, appVersion: '1.6.7', appBuild: '112',
  sourceFingerprint: 'f'.repeat(64), trustworthy: true, trustReason: 'verified_build_snapshot',
  queryConcepts: ['learning_activity'],
  evidence: [{
    evidenceId: 'repo-facts-1', path: 'app/lessons.tsx', line: 1,
    text: 'The learning screen contains lessons and practice activities.', relevanceScore: 28,
    queryCoverage: 1, matchedConcepts: ['learning_activity'],
  }],
};

describe('support auto-reply policy', () => {
  test.each([
    ['refund my purchase', 'billing'],
    ['удалите мои персональные данные', 'privacy'],
    ['ребёнку угрожают', 'safety'],
    ['I cannot log in', 'account'],
    ['How do lessons work?', 'safe'],
  ])('classifies %s as %s', (text, expected) => expect(classifySupportRisk(text)).toBe(expected));

  test.each([
    'Не могу купить Premium в России — оплата недоступна',
    'Какие ещё есть способы оплаты?',
    'I need another way to pay for Plus',
  ])('routes alternative Premium payment question to Telegram: %s', (issue) => {
    expect(isPremiumAlternativePaymentQuestion(issue)).toBe(true);
    const reply = buildPremiumAlternativePaymentReply(issue);
    expect(reply).toContain('@PhrasemanPremiumBot');
    expect(reply).toContain('https://t.me/PhrasemanPremiumBot');
  });

  test('does not reroute a refund or missing entitlement case', () => {
    expect(isPremiumAlternativePaymentQuestion('Оплатил Plus, но доступ не появился')).toBe(false);
    expect(isPremiumAlternativePaymentQuestion('Хочу возврат за подписку')).toBe(false);
    expect(isPremiumAlternativePaymentQuestion('Какие ещё способы оплаты? Деньги списали дважды, хочу возврат')).toBe(false);
  });

  test('email prompt injection remains explicitly untrusted data', () => {
    const prompt = buildGroundedReplySystemPrompt(context);
    expect(prompt).toContain('UNTRUSTED DATA');
    expect(prompt).toContain('never call tools');
    expect(prompt).toContain('repo-facts-1');
  });

  test('drops invented evidence IDs', () => {
    const parsed = parseSupportDraftEnvelope(JSON.stringify({
      reply: 'Open lessons and choose a practice activity.',
      evidenceIds: ['repo-facts-1', 'made-up'], confidence: 0.9, needsHuman: false,
    }), context);
    expect(parsed?.evidenceIds).toEqual(['repo-facts-1']);
  });

  test('never sends account claims even when a model approves them', () => {
    const issue = 'Where is restore purchases?';
    const selected = selectFinalAutoReply({
      issue, risk: classifySupportRisk(issue), context,
      draft: { reply: 'We checked and access is restored.', evidenceIds: ['repo-facts-1'], confidence: 0.99, needsHuman: false },
      review: { approved: true, correctedReply: '', reasons: [] },
    });
    expect(selected).toMatchObject({ grounded: false, reason: 'guarded_billing' });
  });

  test('valid evidence ID cannot launder an unrelated answer', () => {
    const restoreContext: SupportRepositoryContext = {
      ...context,
      evidence: [{ ...context.evidence[0], text: 'Settings contains Restore purchases.', matchedConcepts: ['restore_purchase'] }],
    };
    const selected = selectFinalAutoReply({
      issue: 'How do lessons work?', risk: 'safe', context: restoreContext,
      draft: { reply: 'Open Settings and restore purchases.', evidenceIds: ['repo-facts-1'], confidence: 0.99, needsHuman: false },
      review: { approved: true, correctedReply: '', reasons: [] },
    });
    expect(selected).toMatchObject({ grounded: false, reason: 'semantic_mismatch' });
    expect(selected.reply).not.toMatch(/restore purchases/i);
  });

  test('reviewer cannot replace a grounded draft with an unrelated correction', () => {
    const selected = selectFinalAutoReply({
      issue: 'What learning activities are available?', risk: 'safe', context,
      draft: { reply: 'Open lessons and choose a practice activity.', evidenceIds: ['repo-facts-1'], confidence: 0.9, needsHuman: false },
      review: { approved: true, correctedReply: 'Restore your purchase.', reasons: [] },
    });
    expect(selected).toMatchObject({ grounded: true, reason: 'grounded_and_reviewed' });
    expect(selected.reply).not.toContain('Restore');
  });

  test('allows a relevant grounded safe answer only after independent approval', () => {
    const selected = selectFinalAutoReply({
      issue: 'What learning activities are available?', risk: 'safe', context,
      draft: { reply: 'Open lessons and choose a practice activity.', evidenceIds: ['repo-facts-1'], confidence: 0.9, needsHuman: false },
      review: { approved: true, correctedReply: '', reasons: [] },
    });
    expect(selected).toMatchObject({ grounded: true, reason: 'grounded_and_reviewed' });
  });

  test('rejects a model-invented link even when evidence and reviewer approve it', () => {
    const selected = selectFinalAutoReply({
      issue: 'What learning activities are available?', risk: 'safe', context,
      draft: { reply: 'Open lessons and choose a practice activity at https://fake.example/help', evidenceIds: ['repo-facts-1'], confidence: 0.9, needsHuman: false },
      review: { approved: true, correctedReply: '', reasons: [] },
      ownerInstructions: makeSupportOwnerInstructionsSnapshot('Пишем дружелюбно.', 1),
    });
    expect(selected).toMatchObject({ grounded: false, reason: 'unapproved_link' });
    expect(selected.reply).not.toContain('fake.example');
  });

  test('untrusted repository snapshot can only produce a holding reply', () => {
    const selected = selectFinalAutoReply({
      issue: 'What learning activities are available?', risk: 'safe', context: { ...context, trustworthy: false, trustReason: 'fingerprint_mismatch' },
      draft: { reply: 'Open lessons and choose a practice activity.', evidenceIds: ['repo-facts-1'], confidence: 1, needsHuman: false },
      review: { approved: true, correctedReply: '', reasons: [] },
    });
    expect(selected).toMatchObject({ grounded: false, reason: 'untrusted_snapshot_fingerprint_mismatch' });
  });
});
