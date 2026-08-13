import { HttpsError } from 'firebase-functions/v2/https';
import {
  __compassWhyTestHooks,
  buildCompassWhyPrompts,
  parseCompassWhyResult,
  sanitizeCompassWhyEnvelope,
} from './compass_ai_explanation';

const validInput = {
  schemaVersion: 'compass-why-now.v1',
  recommendationId: 'trainer:phrases',
  reasonCode: 'trainer_due',
  reasonParams: { queue: 'phrases', selectedDue: 7, totalDue: 9 },
  evidence: [
    { ref: 'trainer:dueWords', value: 2 },
    { ref: 'trainer:duePhrases', value: 7 },
  ],
  lang: 'ru',
  studyTarget: 'en',
};

describe('Compass why-now server boundary', () => {
  it('reconstructs the allowlisted envelope and drops raw learner material', () => {
    const envelope = sanitizeCompassWhyEnvelope({
      ...validInput,
      action: { route: '/settings' },
      rawMistakeText: 'private phrase',
      voice: 'base64-private',
      evidence: [...validInput.evidence, { ref: 'mistakes:rawText', value: 'private phrase' }],
      reasonParams: { ...validInput.reasonParams, overdue: 99, personalPlanTitle: 'private' },
    });
    expect(envelope).toEqual(validInput);
    expect(JSON.stringify(envelope)).not.toMatch(/private|voice|overdue|personalPlan|route/);
  });

  it('builds a principle-grounded prompt without action authority', () => {
    const prompt = buildCompassWhyPrompts(sanitizeCompassWhyEnvelope(validInput));
    expect(prompt.system).toContain('at most ten');
    expect(prompt.user).toContain('spaced retrieval');
    expect(prompt.user).not.toMatch(/pathname|route|action/);
  });

  it('accepts short grounded output and an evidence subset', () => {
    const envelope = sanitizeCompassWhyEnvelope(validInput);
    expect(parseCompassWhyResult(JSON.stringify({
      schemaVersion: 'compass-why-now.v1',
      whyNow: 'Эти фразы стоит проверить сейчас. Так вспоминать станет легче.',
      evidenceRefs: ['trainer:duePhrases'],
    }), envelope)).toEqual({
      schemaVersion: 'compass-why-now.v1',
      whyNow: 'Эти фразы стоит проверить сейчас. Так вспоминать станет легче.',
      evidenceRefs: ['trainer:duePhrases'],
    });
  });

  it('accepts only numbers that are present in supplied aggregates', () => {
    const envelope = sanitizeCompassWhyEnvelope(validInput);
    expect(parseCompassWhyResult({
      schemaVersion: 'compass-why-now.v1',
      whyNow: '7 фраз готовы к повтору. Короткий раунд поможет их удержать.',
      evidenceRefs: ['trainer:duePhrases'],
    }, envelope).whyNow).toContain('7 фраз');
    expect(() => parseCompassWhyResult({
      schemaVersion: 'compass-why-now.v1',
      whyNow: '99 фраз готовы к повтору.',
      evidenceRefs: ['trainer:duePhrases'],
    }, envelope)).toThrow(HttpsError);
  });

  it.each([
    ['Этот урок уже готов.', ['trainer:duePhrases']],
    ['Один два три четыре пять шесть семь восемь девять десять одиннадцать.', ['trainer:duePhrases']],
    ['Проверьте 99 фраз сейчас.', ['trainer:duePhrases']],
    ['Эти фразы стоит проверить сейчас.', ['weekly_review:evidenceCount']],
  ])('rejects Bible or grounding violation: %s', (whyNow, evidenceRefs) => {
    const envelope = sanitizeCompassWhyEnvelope(validInput);
    expect(() => parseCompassWhyResult({ schemaVersion: 'compass-why-now.v1', whyNow, evidenceRefs }, envelope))
      .toThrow(HttpsError);
  });

  it('rejects Personal Plan and overdue reason codes at the boundary', () => {
    expect(() => sanitizeCompassWhyEnvelope({ ...validInput, reasonCode: 'personal_plan' })).toThrow(HttpsError);
    expect(() => sanitizeCompassWhyEnvelope({ ...validInput, reasonCode: 'trainer_overdue' })).toThrow(HttpsError);
  });

  it('prunes abandoned budget reservations while retaining live leases', () => {
    expect(__compassWhyTestHooks.activeBudgetReservations({
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 900_000,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb': 1,
      malformed: 999_999,
    }, 1_000_000)).toEqual({
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 900_000,
    });
  });
});
