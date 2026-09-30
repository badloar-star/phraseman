import fs from 'node:fs';
import path from 'node:path';

import { dialogueReplyAccessDecision } from '../functions/src/dialogue_reply_access_contract';

describe('premium dialog stream companion access ordering', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'functions', 'src', 'premium_dialog_stream.ts'),
    'utf8',
  );

  test('rejects Free companion before starting limits, moderation, or the provider', () => {
    const handlerStart = source.indexOf('export const premiumDialogStream = onRequest({');
    const authenticatedPrechecks = source.indexOf(
      'const { stableUid, isPremium } = identity;',
      handlerStart,
    );
    const accessDecision = source.indexOf(
      'dialogueReplyAccessDecision(mode, isPremium)',
      authenticatedPrechecks,
    );
    const accessReturn = source.indexOf(
      "res.status(403).json({ error: 'dialog_plus_required' });",
      accessDecision,
    );
    const returnAfterAccess = source.indexOf('return;', accessReturn);
    const rateReservation = source.indexOf(
      'enforceRateLimit(authUid, stableUid)',
      authenticatedPrechecks,
    );
    const quotaReservation = source.indexOf(
      'enforceMonthlyQuota(',
      authenticatedPrechecks,
    );
    const moderation = source.indexOf(
      'moderateUserText(apiKey, userText)',
      authenticatedPrechecks,
    );
    const providerFetch = source.indexOf(
      'await fetch(OPENAI_CHAT_URL, {',
      authenticatedPrechecks,
    );

    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(authenticatedPrechecks).toBeGreaterThanOrEqual(0);
    expect(authenticatedPrechecks).toBeGreaterThan(handlerStart);
    expect(accessDecision).toBeGreaterThan(authenticatedPrechecks);
    expect(accessReturn).toBeGreaterThan(accessDecision);
    expect(returnAfterAccess).toBeGreaterThan(accessReturn);
    expect(rateReservation).toBeGreaterThan(returnAfterAccess);
    expect(quotaReservation).toBeGreaterThan(returnAfterAccess);
    expect(moderation).toBeGreaterThan(returnAfterAccess);
    expect(providerFetch).toBeGreaterThan(returnAfterAccess);
    expect(returnAfterAccess).toBeLessThan(rateReservation);
    expect(returnAfterAccess).toBeLessThan(quotaReservation);
    expect(returnAfterAccess).toBeLessThan(moderation);
    expect(returnAfterAccess).toBeLessThan(providerFetch);
  });

  test('preserves scenario access for Free and both modes for Plus', () => {
    expect(dialogueReplyAccessDecision('scenario', false)).toBe('allow');
    expect(dialogueReplyAccessDecision('scenario', true)).toBe('allow');
    expect(dialogueReplyAccessDecision('companion', true)).toBe('allow');
    expect(dialogueReplyAccessDecision('companion', false)).toBe('plus_required');
  });
});
