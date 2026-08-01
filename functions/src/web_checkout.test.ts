import {
  activationRewardForPlan,
  assertGiftCertificateAdminAccess,
  assertGiftCertificateAdminReadAccess,
  assertGiftCertificateRefsAvailable,
  assertGiftCertificateAssetResponse,
  assertGiftCertificateSendAuthorization,
  assertGiftCertificateSendCoherence,
  buildActivationEmail,
  buildGiftCertificateDeletePlan,
  buildGiftCertificateBatchRequestKey,
  createGiftCertificateBatchPlan,
  buildResendRequestHeaders,
  buildGiftCertificateRecipientUpdate,
  buildGiftCertificatePersonalizationUpdate,
  buildSyntheticGiftCertificateReplacement,
  decideGiftCertificateDeliveryClaim,
  deliveryStatusForEmailOutcome,
  generateActivationCode,
  GIFT_CERTIFICATE_REPLACEMENT_AUTHORIZATION,
  GIFT_CERTIFICATE_BATCH_AUTHORIZATION,
  GIFT_CERTIFICATE_RECIPIENT_UPDATE_AUTHORIZATION,
  GIFT_CERTIFICATE_PERSONALIZATION_UPDATE_AUTHORIZATION,
  GIFT_CERTIFICATE_SEND_AUTHORIZATION,
  GIFT_CERTIFICATE_MUTATION_OPTIONS,
  GIFT_CERTIFICATE_REPAIR_OLD_CODE,
  GIFT_CERTIFICATE_REPAIR_OLD_NOTE,
  GIFT_CODE_TTL_DAYS,
  giftCodeExpiryMs,
  giftCertificateDisplayRecord,
  giftPlanTitle,
  normalizeGiftCertificateBatchOperationId,
  productNameForPlan,
  readBoundedGiftCertificateAssetBody,
  readGiftCertificateBatchReplay,
  resolveGiftCertificatePresentation,
  resendFailureOutcomeForHttpStatus,
} from './web_checkout';
import * as webCheckoutModule from './web_checkout';
import {
  GIFT_CERTIFICATE_PHRASES,
  resolveGiftPhrase,
} from './gift_certificate_phrases';

describe('resolveGiftPhrase', () => {
  it('keeps a valid phrase inside its purchased plan', () => {
    const phrase = GIFT_CERTIFICATE_PHRASES.yearly[17];
    expect(resolveGiftPhrase('yearly', phrase.id)).toEqual(phrase);
  });

  it('does not accept a phrase identifier from another plan', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(resolveGiftPhrase('yearly', 'monthly-01')).toEqual(GIFT_CERTIFICATE_PHRASES.yearly[0]);
    random.mockRestore();
  });

  it('falls back within the purchased plan for a missing identifier', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(resolveGiftPhrase('lifetime', undefined)).toEqual(GIFT_CERTIFICATE_PHRASES.lifetime[49]);
    random.mockRestore();
  });
});

describe('activationRewardForPlan', () => {
  it('monthly → 31 день', () => {
    expect(activationRewardForPlan('monthly')).toEqual({ rewardDays: 31, rewardKind: 'days' });
  });
  it('yearly → 366 дней', () => {
    expect(activationRewardForPlan('yearly')).toEqual({ rewardDays: 366, rewardKind: 'days' });
  });
  it('lifetime → бессрочный VIP', () => {
    expect(activationRewardForPlan('lifetime')).toEqual({ rewardDays: 0, rewardKind: 'lifetime' });
  });
});

describe('generateActivationCode', () => {
  it('формат WEB-XXXXXXXXXX, совместим с promoCodeRedeem (CODE_RE), без похожих символов', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateActivationCode();
      // Тот же контракт, что CODE_RE в promo_codes.ts: A-Z 0-9 _ - длиной 3..32.
      expect(code).toMatch(/^WEB-[A-HJ-NP-Z2-9]{10}$/);
      expect(code).not.toMatch(/[01IO]/);
      expect(code.length).toBeLessThanOrEqual(32);
    }
  });
  it('коды не повторяются', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateActivationCode()));
    expect(seen.size).toBe(200);
  });
});

// зачем: витрина/письма называют продукты Plus/Pro (решение владельца 2026-07-26),
// внутренние ключи планов не меняются — проверяем только видимые имена.
describe('productNameForPlan / giftPlanTitle', () => {
  it('monthly/yearly → Phraseman Plus, lifetime → Phraseman Pro', () => {
    expect(productNameForPlan('monthly', false)).toBe('Phraseman Plus — месяц');
    expect(productNameForPlan('yearly', false)).toBe('Phraseman Plus — год');
    expect(productNameForPlan('lifetime', false)).toBe('Phraseman Pro — навсегда');
  });
  it('подарочный вариант получает пометку (подарок)', () => {
    expect(productNameForPlan('yearly', true)).toBe('Phraseman Plus — год (подарок)');
    expect(productNameForPlan('lifetime', true)).toBe('Phraseman Pro — навсегда (подарок)');
  });
  it('названия подарка на сертификате', () => {
    expect(giftPlanTitle('monthly')).toBe('Месяц Phraseman Plus');
    expect(giftPlanTitle('yearly')).toBe('Год Phraseman Plus');
    expect(giftPlanTitle('lifetime')).toBe('Phraseman Pro — навсегда');
  });
});

describe('giftCodeExpiryMs', () => {
  it('подарочный код живёт ровно 365 дней', () => {
    const now = 1_753_500_000_000;
    expect(giftCodeExpiryMs(now, true)).toBe(now + GIFT_CODE_TTL_DAYS * 24 * 60 * 60 * 1000);
  });
  it('обычная покупка «себе» — код бессрочный (0), как раньше', () => {
    expect(giftCodeExpiryMs(1_753_500_000_000, false)).toBe(0);
  });
});

describe('gift certificate batch', () => {
  const nowMs = Date.UTC(2026, 6, 29, 12, 0, 0);
  const base = {
    input: {
      product: 'yearly',
      count: 2,
      recipientNames: ['Профессор Лингман', 'Мария Иванова'],
      recipientEmails: ['badloar@gmail.com', ''],
      source: 'admin_gift_certificates',
      authorization: 'CREATE_GIFT_CERTIFICATES',
    },
    codes: ['GIFT-7QW8E9R2TY', 'GIFT-4AS5DF6GHJ'],
    batchId: 'gift-batch-20260729-1',
    nowMs,
    actorUid: 'owner-uid',
    actorEmail: 'owner@example.com',
  } as const;

  it('builds real single-use records with immutable yearly product metadata and one audit entry', () => {
    expect(GIFT_CERTIFICATE_BATCH_AUTHORIZATION).toBe('CREATE_GIFT_CERTIFICATES');
    const plan = createGiftCertificateBatchPlan(base);

    expect(plan.items).toHaveLength(2);
    expect(plan.items[0]).toMatchObject({
      certificateId: base.codes[0],
      activationCode: base.codes[0],
      product: 'yearly',
      recipientName: 'Профессор Лингман',
      recipientEmail: 'badloar@gmail.com',
      createdAtMs: nowMs,
      expiresAtMs: nowMs + 365 * 24 * 60 * 60 * 1000,
      status: 'generated',
      assetUrl: 'https://knowlyapps.com/assets/gift-certificates/gift-certificate-yearly.webp',
    });
    expect(plan.items[0].promoDoc).toMatchObject({
      rewardDays: 366,
      rewardKind: 'days',
      enabled: true,
      maxRedemptions: 1,
      usedCount: 0,
      expiresAtMs: nowMs + 365 * 24 * 60 * 60 * 1000,
      certificateId: base.codes[0],
      certificateProduct: 'yearly',
    });
    expect(plan.items[0].certificateDoc).toMatchObject({
      plan: 'yearly',
      product: 'yearly',
      gift: true,
      giftTo: 'Профессор Лингман',
      giftFrom: 'Phraseman',
      giftPhraseId: 'yearly-01',
      codeExpiresAtMs: nowMs + 365 * 24 * 60 * 60 * 1000,
    });
    expect(plan.auditDoc).toMatchObject({
      action: 'gift_certificate_batch_create',
      adminUid: 'owner-uid',
      details: { batchId: base.batchId, product: 'yearly', count: 2 },
    });
  });

  it.each([
    ['monthly', 31, 'days', 'gift-certificate-monthly.webp'],
    ['yearly', 366, 'days', 'gift-certificate-yearly.webp'],
    ['lifetime', 0, 'lifetime', 'gift-certificate-lifetime.webp'],
  ] as const)('keeps the %s reward and artwork server-authoritative', (product, rewardDays, rewardKind, assetName) => {
    const plan = createGiftCertificateBatchPlan({
      ...base,
      input: { ...base.input, product, count: 1, recipientNames: ['Получатель'], recipientEmails: [] },
      codes: ['GIFT-7QW8E9R2TY'],
    });
    expect(plan.items[0].promoDoc).toMatchObject({ rewardDays, rewardKind });
    expect(plan.items[0].assetUrl).toContain(assetName);
  });

  it.each([
    ['invalid product', { product: 'weekly' }],
    ['zero count', { count: 0 }],
    ['oversized count', { count: 201 }],
    ['blank recipient', { recipientNames: ['Профессор Лингман', ' '] }],
    ['duplicate recipient', { recipientNames: ['Профессор Лингман', ' профессор лингман '] }],
    ['wrong source', { source: 'promo_codes' }],
    ['missing authorization', { authorization: '' }],
  ])('rejects %s', (_label, patch) => {
    expect(() => createGiftCertificateBatchPlan({
      ...base,
      input: { ...base.input, ...patch },
    })).toThrow();
  });

  it('rejects invalid emails and any generated-code collision inside the proposed batch', () => {
    expect(() => createGiftCertificateBatchPlan({
      ...base,
      input: { ...base.input, recipientEmails: ['not-an-email', ''] },
    })).toThrow('invalid_recipient_email');
    expect(() => createGiftCertificateBatchPlan({
      ...base,
      codes: ['GIFT-7QW8E9R2TY', 'GIFT-7QW8E9R2TY'],
    })).toThrow('gift_certificate_code_collision');
  });

  it('rejects a collision with any already persisted promo or certificate document', () => {
    expect(() => assertGiftCertificateRefsAvailable([false, false, false, true])).toThrow('gift_certificate_code_collision');
    expect(() => assertGiftCertificateRefsAvailable([false, false])).not.toThrow();
  });

  it('keeps read-only history behind money.read without granting mutation permission', () => {
    expect(() => assertGiftCertificateAdminReadAccess(undefined)).toThrow('Admin only');
    expect(() => assertGiftCertificateAdminReadAccess({ uid: 'support', token: { admin: true, adminRole: 'support' } }))
      .toThrow('Role cannot read gift certificates');
    expect(() => assertGiftCertificateAdminReadAccess({ uid: 'analyst', token: { admin: true, adminRole: 'analyst' } }))
      .not.toThrow();
    expect(() => assertGiftCertificateAdminAccess({ uid: 'analyst', token: { admin: true, adminRole: 'analyst' } }))
      .toThrow('Role cannot replace gift certificates');
  });

  it('requires a canonical random UUID-v4 operation id', () => {
    expect(normalizeGiftCertificateBatchOperationId('7d71d9f8-8428-4adb-88fa-508a5a59f206'))
      .toBe('7d71d9f8-8428-4adb-88fa-508a5a59f206');
    for (const invalid of [
      undefined,
      '',
      ' 7d71d9f8-8428-4adb-88fa-508a5a59f206 ',
      '7D71D9F8-8428-4ADB-88FA-508A5A59F206',
      '7d71d9f8-8428-1adb-88fa-508a5a59f206',
      '7d71d9f8-8428-4adb-08fa-508a5a59f206',
      'gift-batch-1',
    ]) {
      expect(() => normalizeGiftCertificateBatchOperationId(invalid)).toThrow('invalid_gift_certificate_operation_id');
    }
  });

  it('replays the exact atomically persisted response only for the same actor and request', () => {
    const plan = createGiftCertificateBatchPlan(base);
    const requestKey = buildGiftCertificateBatchRequestKey(plan.items);
    expect(requestKey).toMatch(/^[0-9a-f]{64}$/);
    expect(requestKey).not.toContain('badloar@gmail.com');
    expect(buildGiftCertificateBatchRequestKey(createGiftCertificateBatchPlan({
      ...base,
      input: { ...base.input, recipientEmails: ['different@example.com', ''] },
    }).items)).not.toBe(requestKey);
    const operationId = '7d71d9f8-8428-4adb-88fa-508a5a59f206';
    const response = {
      ok: true as const,
      operationId,
      batchId: plan.batchId,
      certificates: plan.items.map((item) => ({ certificateId: item.certificateId })),
    };
    const persisted = {
      schemaVersion: 'gift-certificate-batch-operation.v1',
      operationId,
      actorUid: base.actorUid,
      requestKey,
      response,
    };

    expect(readGiftCertificateBatchReplay(persisted, { operationId, actorUid: base.actorUid, requestKey }))
      .toEqual(response);
    expect(() => readGiftCertificateBatchReplay(persisted, {
      operationId,
      actorUid: 'different-admin',
      requestKey,
    })).toThrow('gift_certificate_operation_conflict');
    expect(() => readGiftCertificateBatchReplay(persisted, {
      operationId,
      actorUid: base.actorUid,
      requestKey: `${requestKey}:changed`,
    })).toThrow('gift_certificate_operation_conflict');
    expect(() => readGiftCertificateBatchReplay({ ...persisted, response: null }, {
      operationId,
      actorUid: base.actorUid,
      requestKey,
    })).toThrow('gift_certificate_operation_corrupt');
  });
});

describe('gift certificate deletion', () => {
  const certificateId = 'GIFT-7QW8E9R2TY';
  const nowMs = Date.UTC(2026, 7, 1, 12, 0, 0);
  const certificate = {
    certificateId,
    activationCode: certificateId,
    product: 'yearly',
    gift: true,
    status: 'generated',
    batchId: 'gift-batch-delete-test',
    createdAtMs: nowMs - 1_000,
    updatedAtMs: nowMs - 500,
  };
  const promo = {
    certificateId,
    certificateProduct: 'yearly',
    rewardDays: 366,
    rewardKind: 'days',
    enabled: true,
    maxRedemptions: 1,
    usedCount: 0,
  };

  it('builds a privacy-safe audit plan for the linked certificate and promo code', () => {
    expect(buildGiftCertificateDeletePlan({
      certificateId,
      expectedUpdatedAtMs: certificate.updatedAtMs,
      certificate,
      promo,
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: 'Duplicate certificate',
    })).toEqual({
      certificateId,
      auditDoc: {
        action: 'gift_certificate_delete',
        targetUid: certificateId,
        reason: 'Duplicate certificate',
        details: {
          certificateId,
          batchId: 'gift-batch-delete-test',
          product: 'yearly',
          deliveryStatus: 'generated',
        },
        adminEmail: 'owner@example.com',
        adminUid: 'owner-uid',
        ts: new Date(nowMs).toISOString(),
      },
    });
  });

  it.each([
    ['used count', { usedCount: 1 }],
    ['redemption timestamp', { lastRedeemedAtMs: nowMs - 1 }],
    ['redeemer identity', { lastRedeemedBy: 'stable-user' }],
  ])('refuses deletion when the promo has %s evidence', (_label, patch) => {
    expect(() => buildGiftCertificateDeletePlan({
      certificateId,
      expectedUpdatedAtMs: certificate.updatedAtMs,
      certificate,
      promo: { ...promo, ...patch },
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: '',
    })).toThrow('gift_certificate_already_redeemed');
  });

  it('fails closed on an activated delivery status or corrupt negative redemption count', () => {
    expect(() => buildGiftCertificateDeletePlan({
      certificateId,
      expectedUpdatedAtMs: certificate.updatedAtMs,
      certificate: { ...certificate, status: 'activated' },
      promo,
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: '',
    })).toThrow('gift_certificate_already_redeemed');
    expect(() => buildGiftCertificateDeletePlan({
      certificateId,
      expectedUpdatedAtMs: certificate.updatedAtMs,
      certificate,
      promo: { ...promo, usedCount: -1 },
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: '',
    })).toThrow('gift_certificate_promo_invalid');
  });

  it('refuses a stale destructive request after the certificate was edited', () => {
    expect(() => buildGiftCertificateDeletePlan({
      certificateId,
      expectedUpdatedAtMs: certificate.updatedAtMs - 1,
      certificate,
      promo,
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: '',
    })).toThrow('gift_certificate_delete_conflict');
  });

  it('fails closed when either persisted record is not linked to the requested certificate', () => {
    expect(() => buildGiftCertificateDeletePlan({
      certificateId,
      expectedUpdatedAtMs: certificate.updatedAtMs,
      certificate: { ...certificate, activationCode: 'GIFT-4AS5DF6GHJ' },
      promo,
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: '',
    })).toThrow('gift_certificate_identity_mismatch');
    expect(() => buildGiftCertificateDeletePlan({
      certificateId,
      expectedUpdatedAtMs: certificate.updatedAtMs,
      certificate,
      promo: { ...promo, certificateId: 'GIFT-4AS5DF6GHJ' },
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: '',
    })).toThrow('gift_certificate_promo_invalid');
  });
});

describe('gift certificate persisted recipient update', () => {
  const nowMs = Date.UTC(2026, 6, 29, 13, 0, 0);
  const current = {
    certificateId: 'GIFT-7QW8E9R2TY',
    activationCode: 'GIFT-7QW8E9R2TY',
    product: 'yearly',
    recipientName: 'Старое имя',
    recipientEmail: '',
    status: 'generated',
    gift: true,
    testIssue: false,
    createdAtMs: nowMs - 60_000,
    updatedAtMs: nowMs - 60_000,
    expiresAtMs: nowMs + 365 * 24 * 60 * 60 * 1000,
    assetUrl: 'https://knowlyapps.com/assets/gift-certificates/gift-certificate-yearly.webp',
  };

  it('returns a canonical persisted recipient patch for subsequent download/send', () => {
    expect(GIFT_CERTIFICATE_RECIPIENT_UPDATE_AUTHORIZATION).toBe('UPDATE_GIFT_CERTIFICATE_RECIPIENT');
    expect(buildGiftCertificateRecipientUpdate({
      input: {
        authorization: GIFT_CERTIFICATE_RECIPIENT_UPDATE_AUTHORIZATION,
        certificateId: current.certificateId,
        recipientName: ' Профессор Лингман ',
        recipientEmail: ' Badloar@GMAIL.com ',
        expectedUpdatedAtMs: current.updatedAtMs,
      },
      current,
      promo: { enabled: true, usedCount: 0, maxRedemptions: 1, expiresAtMs: current.expiresAtMs },
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
    })).toMatchObject({
      patch: {
        recipientName: 'Профессор Лингман',
        recipientEmail: 'badloar@gmail.com',
        updatedAtMs: nowMs,
      },
      record: {
        certificateId: current.certificateId,
        recipientName: 'Профессор Лингман',
        recipientEmail: 'badloar@gmail.com',
        assetUrl: current.assetUrl,
      },
    });
  });

  it.each([
    ['sent', { status: 'sent' }],
    ['sending', { status: 'sending' }],
    ['delivery unknown', { status: 'delivery_unknown' }],
    ['reconciliation', { status: 'reconciliation_required' }],
  ])('does not mutate recipient identity after delivery entered %s state', (_label, patch) => {
    expect(() => buildGiftCertificateRecipientUpdate({
      input: {
        authorization: GIFT_CERTIFICATE_RECIPIENT_UPDATE_AUTHORIZATION,
        certificateId: current.certificateId,
        recipientName: 'Профессор Лингман',
        recipientEmail: 'badloar@gmail.com',
        expectedUpdatedAtMs: current.updatedAtMs,
      },
      current: { ...current, ...patch },
      promo: { enabled: true, usedCount: 0, maxRedemptions: 1, expiresAtMs: current.expiresAtMs },
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
    })).toThrow('gift_certificate_recipient_locked');
  });

  it('rejects stale edits, redeemed codes, blank names and invalid email', () => {
    const make = (inputPatch: Record<string, unknown> = {}, promoPatch: Record<string, unknown> = {}) => () => buildGiftCertificateRecipientUpdate({
      input: {
        authorization: GIFT_CERTIFICATE_RECIPIENT_UPDATE_AUTHORIZATION,
        certificateId: current.certificateId,
        recipientName: 'Профессор Лингман',
        recipientEmail: 'badloar@gmail.com',
        expectedUpdatedAtMs: current.updatedAtMs,
        ...inputPatch,
      },
      current,
      promo: { enabled: true, usedCount: 0, maxRedemptions: 1, expiresAtMs: current.expiresAtMs, ...promoPatch },
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
    });
    expect(make({ expectedUpdatedAtMs: current.updatedAtMs - 1 })).toThrow('gift_certificate_edit_conflict');
    expect(make({}, { usedCount: 1 })).toThrow('gift_certificate_already_redeemed');
    expect(make({ recipientName: ' ' })).toThrow('recipient_name_missing');
    expect(make({ recipientEmail: 'bad email' })).toThrow('invalid_recipient_email');
  });
});

describe('gift certificate canonical personalization and activation presentation', () => {
  const nowMs = Date.UTC(2026, 7, 1, 12, 0, 0);
  const certificateId = 'GIFT-7QW8E9R2TY';
  const current = {
    certificateId,
    activationCode: certificateId,
    product: 'yearly',
    plan: 'yearly',
    gift: true,
    testIssue: false,
    recipientName: 'Внутреннее имя',
    recipientEmail: 'recipient@example.com',
    giftTo: 'Внутреннее имя',
    giftFrom: 'Даритель',
    giftPhraseId: 'yearly-01',
    createdAtMs: nowMs - 60_000,
    updatedAtMs: nowMs - 60_000,
    expiresAtMs: nowMs + 365 * 24 * 60 * 60 * 1000,
    assetUrl: 'https://knowlyapps.com/assets/gift-certificates/gift-certificate-yearly.webp',
    status: 'generated',
  };
  const promo = {
    enabled: true,
    usedCount: 0,
    maxRedemptions: 1,
    expiresAtMs: current.expiresAtMs,
    certificateId,
    certificateProduct: 'yearly',
    rewardDays: 366,
    rewardKind: 'days',
  };

  it.each([
    [true, true, 'Recipient', 'Sender', 'named'],
    [true, false, 'Recipient', '', 'named'],
    [false, true, '', 'Sender', 'named'],
    [false, false, '', '', 'anonymous'],
  ] as const)(
    'resolves recipient=%s sender=%s independently',
    (showRecipientName, showSenderName, displayRecipientName, displaySenderName, personalizationMode) => {
      expect(resolveGiftCertificatePresentation({
        ...current,
        personalizationMode: 'anonymous',
        showRecipientName,
        showSenderName,
        displayRecipientName: 'Recipient',
        displaySenderName: 'Sender',
      }, promo, nowMs)).toMatchObject({
        showRecipientName,
        showSenderName,
        personalizationMode,
        displayRecipientName,
        displaySenderName,
      });
    },
  );

  it('prefers explicit flags and maps legacy named/anonymous records compatibly', () => {
    expect(resolveGiftCertificatePresentation({
      ...current, personalizationMode: 'anonymous', showRecipientName: true, showSenderName: false,
    }, promo, nowMs)).toMatchObject({ showRecipientName: true, showSenderName: false, personalizationMode: 'named' });
    expect(resolveGiftCertificatePresentation({ ...current, personalizationMode: 'anonymous' }, promo, nowMs))
      .toMatchObject({ showRecipientName: false, showSenderName: false, personalizationMode: 'anonymous' });
    expect(resolveGiftCertificatePresentation({ ...current, personalizationMode: 'named' }, promo, nowMs))
      .toMatchObject({ showRecipientName: true, showSenderName: true, personalizationMode: 'named' });
    expect(resolveGiftCertificatePresentation({ ...current, personalizationMode: undefined }, promo, nowMs))
      .toMatchObject({ showRecipientName: true, showSenderName: true, personalizationMode: 'named' });
  });

  it.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ] as const)('persists independent visibility recipient=%s sender=%s without erasing hidden names', (showRecipientName, showSenderName) => {
    const result = buildGiftCertificatePersonalizationUpdate({
      input: {
        authorization: GIFT_CERTIFICATE_PERSONALIZATION_UPDATE_AUTHORIZATION,
        certificateId,
        showRecipientName,
        showSenderName,
        displayRecipientName: showRecipientName ? 'New Recipient' : '',
        displaySenderName: showSenderName ? 'New Sender' : '',
        recipientEmail: '',
        expectedUpdatedAtMs: current.updatedAtMs,
      } as any,
      current,
      promo,
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
    });
    expect(result.patch).toMatchObject({
      showRecipientName,
      showSenderName,
      personalizationMode: showRecipientName || showSenderName ? 'named' : 'anonymous',
      displayRecipientName: showRecipientName ? 'New Recipient' : current.recipientName,
      displaySenderName: showSenderName ? 'New Sender' : current.giftFrom,
    });
    expect(result.auditDetails).toMatchObject({ showRecipientName, showSenderName });
    expect(JSON.stringify(result.auditDetails)).not.toContain('New Recipient');
    expect(JSON.stringify(result.auditDetails)).not.toContain('New Sender');
  });

  it('defaults legacy records to named and resolves the same visible copy used by every surface', () => {
    expect(resolveGiftCertificatePresentation(current, promo, nowMs)).toMatchObject({
      personalizationMode: 'named',
      displayRecipientName: 'Внутреннее имя',
      displaySenderName: 'Даритель',
      recipientEmail: 'recipient@example.com',
      showPersonalization: true,
      productTitle: 'Год Phraseman Plus',
      giftPhrase: 'Целый год, чтобы английский стал твоей суперсилой.',
      activationStatus: 'available',
      activationStatusLabel: 'Не активирован',
    });
  });

  it('keeps internal names/email while anonymous presentation omits both display lines', () => {
    expect(resolveGiftCertificatePresentation({
      ...current,
      personalizationMode: 'anonymous',
      displayRecipientName: 'Скрытое имя',
      displaySenderName: 'Скрытый даритель',
    }, promo, nowMs)).toMatchObject({
      personalizationMode: 'anonymous',
      savedRecipientName: 'Скрытое имя',
      savedSenderName: 'Скрытый даритель',
      recipientEmail: 'recipient@example.com',
      displayRecipientName: '',
      displaySenderName: '',
      showPersonalization: false,
    });
  });

  it.each([
    ['redeemed with date', { usedCount: 1, lastRedeemedAtMs: nowMs - 1_000 }, 'redeemed', 'Активирован', nowMs - 1_000],
    ['redeemed without date', { usedCount: 1 }, 'redeemed', 'Активирован', 0],
    ['expired', { expiresAtMs: nowMs - 1 }, 'expired', 'Истёк', 0],
    ['disabled', { enabled: false }, 'disabled', 'Отключён', 0],
  ])('derives truthful activation status for %s', (_label, patch, status, label, redeemedAtMs) => {
    expect(resolveGiftCertificatePresentation(current, { ...promo, ...patch }, nowMs)).toMatchObject({
      activationStatus: status,
      activationStatusLabel: label,
      lastRedeemedAtMs: redeemedAtMs,
    });
  });

  it('evaluates every display record against the same explicit response timestamp', () => {
    const expiresAtMs = nowMs;
    const expiringPromo = { ...promo, expiresAtMs };
    const expiringRecord = { ...current, expiresAtMs };
    const first = giftCertificateDisplayRecord(certificateId, expiringRecord, expiringPromo, nowMs);
    const secondId = 'GIFT-4AS5DF6GHJ';
    const second = giftCertificateDisplayRecord(secondId, {
      ...expiringRecord,
      certificateId: secondId,
      activationCode: secondId,
    }, { ...expiringPromo, certificateId: secondId }, nowMs);
    expect(first).toMatchObject({ activationStatus: 'expired', statusEvaluatedAtMs: nowMs });
    expect(second).toMatchObject({ activationStatus: 'expired', statusEvaluatedAtMs: nowMs });
  });

  it('repairs legacy missing or invalid phrase ids deterministically and persists the canonical id', () => {
    const expected = GIFT_CERTIFICATE_PHRASES.yearly[0];
    for (const giftPhraseId of [undefined, '', 'monthly-01', 'not-a-real-phrase']) {
      const legacy = { ...current, giftPhraseId };
      const first = resolveGiftCertificatePresentation(legacy, promo, nowMs);
      const second = resolveGiftCertificatePresentation(legacy, promo, nowMs);
      expect(first).toMatchObject({ giftPhraseId: expected.id, giftPhrase: expected.text });
      expect(second).toMatchObject({ giftPhraseId: expected.id, giftPhrase: expected.text });
      expect(giftCertificateDisplayRecord(certificateId, legacy, promo, nowMs))
        .toMatchObject({ giftPhraseId: expected.id, giftPhrase: expected.text });

      const update = buildGiftCertificatePersonalizationUpdate({
        input: {
          authorization: GIFT_CERTIFICATE_PERSONALIZATION_UPDATE_AUTHORIZATION,
          certificateId,
          personalizationMode: 'named',
          displayRecipientName: 'Recipient',
          displaySenderName: 'Sender',
          recipientEmail: '',
          expectedUpdatedAtMs: current.updatedAtMs,
        },
        current: legacy,
        promo,
        nowMs,
        actorUid: 'owner-uid',
        actorEmail: 'owner@example.com',
      });
      expect(update.patch.giftPhraseId).toBe(expected.id);
      expect(update.record.giftPhraseId).toBe(expected.id);
    }
  });

  it('persists canonical named personalization with optimistic concurrency and privacy-safe audit facts', () => {
    expect(GIFT_CERTIFICATE_PERSONALIZATION_UPDATE_AUTHORIZATION).toBe('UPDATE_GIFT_CERTIFICATE_PERSONALIZATION');
    const result = buildGiftCertificatePersonalizationUpdate({
      input: {
        authorization: GIFT_CERTIFICATE_PERSONALIZATION_UPDATE_AUTHORIZATION,
        certificateId,
        personalizationMode: 'named',
        displayRecipientName: ' Получатель ',
        displaySenderName: ' Отправитель ',
        recipientEmail: ' Recipient@Example.com ',
        expectedUpdatedAtMs: current.updatedAtMs,
      },
      current,
      promo,
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
    });
    expect(result.patch).toMatchObject({
      personalizationMode: 'named',
      displayRecipientName: 'Получатель',
      displaySenderName: 'Отправитель',
      recipientName: 'Получатель',
      giftTo: 'Получатель',
      giftFrom: 'Отправитель',
      recipientEmail: 'recipient@example.com',
      updatedAtMs: nowMs,
    });
    expect(result.auditDetails).toEqual({
      certificateId,
      personalizationMode: 'named',
      recipientEmailSet: true,
      recipientNameSet: true,
      senderNameSet: true,
    });
    expect(JSON.stringify(result.auditDetails)).not.toContain('recipient@example.com');
    expect(JSON.stringify(result.auditDetails)).not.toContain('Получатель');
  });

  it('retains saved names when switching to anonymous and fails closed on stale/identity/plan/promo/lock fields', () => {
    const make = (inputPatch: Record<string, unknown> = {}, currentPatch: Record<string, unknown> = {}, promoPatch: Record<string, unknown> = {}) => () => buildGiftCertificatePersonalizationUpdate({
      input: {
        authorization: GIFT_CERTIFICATE_PERSONALIZATION_UPDATE_AUTHORIZATION,
        certificateId,
        personalizationMode: 'anonymous',
        displayRecipientName: '',
        displaySenderName: '',
        recipientEmail: '',
        expectedUpdatedAtMs: current.updatedAtMs,
        ...inputPatch,
      },
      current: { ...current, ...currentPatch },
      promo: { ...promo, ...promoPatch },
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
    });
    expect(make()).not.toThrow();
    expect(make()().patch).toMatchObject({
      personalizationMode: 'anonymous',
      displayRecipientName: 'Внутреннее имя',
      displaySenderName: 'Даритель',
      recipientEmail: 'recipient@example.com',
    });
    expect(make({ authorization: 'yes' })).toThrow('gift_certificate_personalization_update_not_authorized');
    expect(make({ expectedUpdatedAtMs: current.updatedAtMs - 1 })).toThrow('gift_certificate_edit_conflict');
    expect(make({}, { activationCode: 'GIFT-4AS5DF6GHJ' })).toThrow('gift_certificate_identity_mismatch');
    expect(make({}, { plan: 'monthly' })).toThrow('gift_certificate_plan_mismatch');
    expect(make({}, {}, { maxRedemptions: 2 })).toThrow('gift_certificate_promo_invalid');
    expect(make({}, {}, { usedCount: 1 })).toThrow('gift_certificate_already_redeemed');
    expect(make({}, { status: 'sent' })).toThrow('gift_certificate_personalization_locked');
  });

  it.each([
    ['blank', ''],
    ['omitted', undefined],
  ])('preserves the stored delivery email when a download-equivalent anonymous update sends %s email', (_label, recipientEmail) => {
    const result = buildGiftCertificatePersonalizationUpdate({
      input: {
        authorization: GIFT_CERTIFICATE_PERSONALIZATION_UPDATE_AUTHORIZATION,
        certificateId,
        personalizationMode: 'anonymous',
        displayRecipientName: '',
        displaySenderName: '',
        recipientEmail,
        expectedUpdatedAtMs: current.updatedAtMs,
      },
      current,
      promo,
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
    });

    expect(result.patch.recipientEmail).toBe('recipient@example.com');
    expect(result.auditDetails.recipientEmailSet).toBe(true);
  });

  it('requires both named display names and enforces the 60 character limit without truncation', () => {
    const run = (displayRecipientName: string, displaySenderName: string) => () => buildGiftCertificatePersonalizationUpdate({
      input: {
        authorization: GIFT_CERTIFICATE_PERSONALIZATION_UPDATE_AUTHORIZATION,
        certificateId,
        personalizationMode: 'named',
        displayRecipientName,
        displaySenderName,
        recipientEmail: '',
        expectedUpdatedAtMs: current.updatedAtMs,
      },
      current,
      promo,
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
    });
    expect(run('', 'Даритель')).toThrow('gift_certificate_recipient_name_missing');
    expect(run('Получатель', '')).toThrow('gift_certificate_sender_name_missing');
    expect(run('Ж'.repeat(61), 'Даритель')).toThrow('gift_certificate_recipient_name_too_long');
    expect(run('Получатель', 'Ж'.repeat(61))).toThrow('gift_certificate_sender_name_too_long');
  });
});

describe('gift certificate download asset proxy', () => {
  it('accepts only a successful bounded WebP from the fixed server-selected asset', () => {
    expect(() => assertGiftCertificateAssetResponse({ ok: true, contentType: 'image/webp', byteLength: 194_976 })).not.toThrow();
    expect(() => assertGiftCertificateAssetResponse({ ok: false, contentType: 'image/webp', byteLength: 10 })).toThrow('gift_certificate_asset_fetch_failed');
    expect(() => assertGiftCertificateAssetResponse({ ok: true, contentType: 'text/html', byteLength: 10 })).toThrow('gift_certificate_asset_type_invalid');
    expect(() => assertGiftCertificateAssetResponse({ ok: true, contentType: 'image/webp', byteLength: 600_000 })).toThrow('gift_certificate_asset_size_invalid');
  });

  it('streams with a hard 512 KiB cap and cancels before consuming the remaining body', async () => {
    let pulls = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(300 * 1024));
      },
      cancel() {
        cancelled = true;
      },
    }, { highWaterMark: 0 });

    await expect(readBoundedGiftCertificateAssetBody(body)).rejects.toThrow('gift_certificate_asset_size_invalid');
    expect(pulls).toBe(2);
    expect(cancelled).toBe(true);
  });

  it('returns the complete streamed bytes while they remain under the cap', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(Uint8Array.from([1, 2]));
        controller.enqueue(Uint8Array.from([3, 4, 5]));
        controller.close();
      },
    });
    await expect(readBoundedGiftCertificateAssetBody(body)).resolves.toEqual(Buffer.from([1, 2, 3, 4, 5]));
  });

  it('keeps the bounded-size failure even when upstream cancellation rejects', async () => {
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(513 * 1024));
      },
      cancel() {
        throw new Error('upstream cancel failed');
      },
    }, { highWaterMark: 0 });

    await expect(readBoundedGiftCertificateAssetBody(body)).rejects.toThrow('gift_certificate_asset_size_invalid');
  });
});

describe('gift certificate canonical download display', () => {
  const certificateId = 'GIFT-7QW8E9R2TY';
  const record = {
    certificateId,
    activationCode: certificateId,
    product: 'yearly',
    plan: 'yearly',
    gift: true,
    testIssue: false,
    recipientName: 'Александра Константиновна Очень-Длинная Фамилия-Подарочная',
    recipientEmail: 'recipient@example.com',
    giftFrom: 'Саша',
    giftPhraseId: 'yearly-01',
    assetUrl: 'https://knowlyapps.com/assets/gift-certificates/gift-certificate-yearly.webp',
    createdAtMs: Date.UTC(2026, 6, 29),
    updatedAtMs: Date.UTC(2026, 6, 30),
    expiresAtMs: Date.UTC(2027, 6, 29),
    rewardDays: 366,
    rewardKind: 'days',
    status: 'generated',
  };
  const validPromo = {
    enabled: true,
    usedCount: 0,
    maxRedemptions: 1,
    expiresAtMs: record.expiresAtMs,
    certificateId,
    certificateProduct: 'yearly',
    rewardDays: 366,
    rewardKind: 'days',
  };

  it('derives all visible certificate copy from the persisted server record', () => {
    const buildCanonicalDisplay = (webCheckoutModule as unknown as {
      buildGiftCertificateDownloadDisplayRecord?: (
        id: string,
        delivery: Record<string, unknown>,
        promo: Record<string, unknown>,
      ) => Record<string, unknown>;
    }).buildGiftCertificateDownloadDisplayRecord;

    expect(typeof buildCanonicalDisplay).toBe('function');
    expect(buildCanonicalDisplay?.(certificateId, record, validPromo)).toMatchObject({
      certificateId,
      activationCode: certificateId,
      product: 'yearly',
      recipientName: record.recipientName,
      senderName: 'Саша',
      productTitle: 'Год Phraseman Plus',
      giftPhraseId: 'yearly-01',
      giftPhrase: 'Целый год, чтобы английский стал твоей суперсилой.',
      assetUrl: record.assetUrl,
      expiresAtMs: record.expiresAtMs,
    });
  });

  it('repairs a missing or cross-plan stored phrase to the deterministic plan-first phrase', () => {
    const buildCanonicalDisplay = (webCheckoutModule as unknown as {
      buildGiftCertificateDownloadDisplayRecord: (
        id: string,
        delivery: Record<string, unknown>,
        promo: Record<string, unknown>,
      ) => Record<string, unknown>;
    }).buildGiftCertificateDownloadDisplayRecord;

    const expected = GIFT_CERTIFICATE_PHRASES.yearly[0];
    for (const giftPhraseId of [undefined, 'monthly-01']) {
      const first = buildCanonicalDisplay(certificateId, { ...record, giftPhraseId }, validPromo);
      const second = buildCanonicalDisplay(certificateId, { ...record, giftPhraseId }, validPromo);
      expect(first).toMatchObject({ giftPhraseId: expected.id, giftPhrase: expected.text });
      expect(second).toMatchObject({ giftPhraseId: expected.id, giftPhrase: expected.text });
    }
  });

  it('fails closed when a direct or stale caller requests an expired certificate download', () => {
    const buildCanonicalDisplay = (webCheckoutModule as unknown as {
      buildGiftCertificateDownloadDisplayRecord: (
        id: string,
        delivery: Record<string, unknown>,
        promo: Record<string, unknown>,
        nowMs: number,
      ) => Record<string, unknown>;
    }).buildGiftCertificateDownloadDisplayRecord;

    expect(() => buildCanonicalDisplay(
      certificateId,
      record,
      validPromo,
      record.expiresAtMs + 1,
    )).toThrow('gift_certificate_promo_invalid');
  });

  it.each([
    ['disabled', { enabled: false }],
    ['redeemed', { usedCount: 1 }],
    ['missing redemption count', { usedCount: undefined }],
    ['not single-use', { maxRedemptions: 2 }],
    ['expiry mismatch', { expiresAtMs: record.expiresAtMs + 1 }],
    ['missing certificate id', { certificateId: undefined }],
    ['certificate mismatch', { certificateId: 'GIFT-4AS5DF6GHJ' }],
    ['missing plan', { certificateProduct: undefined }],
    ['plan mismatch', { certificateProduct: 'monthly' }],
    ['missing reward days', { rewardDays: undefined }],
    ['reward days mismatch', { rewardDays: 31 }],
    ['missing reward kind', { rewardKind: undefined }],
    ['reward kind mismatch', { rewardKind: 'lifetime' }],
  ])('fails closed when persisted promo state is %s', (_label, promoPatch) => {
    const buildCanonicalDisplay = (webCheckoutModule as unknown as {
      buildGiftCertificateDownloadDisplayRecord: (
        id: string,
        delivery: Record<string, unknown>,
        promo: Record<string, unknown>,
      ) => Record<string, unknown>;
    }).buildGiftCertificateDownloadDisplayRecord;

    expect(() => buildCanonicalDisplay(certificateId, record, {
      ...validPromo,
      ...promoPatch,
    })).toThrow('gift_certificate_promo_invalid');
  });
});

describe('synthetic gift certificate replacement', () => {
  const nowMs = Date.UTC(2026, 6, 29, 12, 0, 0);
  const oldCode = 'GIFT-TEST-FRNRYV23VS';
  const oldNote = 'Simulated gift purchase; no payment; requested 2026-07-29; recipient badloar@gmail.com';
  const base = {
    oldCode,
    newCode: 'GIFT-REAL-8Q7W6E5R',
    nowMs,
    actorUid: 'admin-uid',
    actorEmail: 'owner@example.com',
    input: {
      authorization: GIFT_CERTIFICATE_REPLACEMENT_AUTHORIZATION,
      recipientEmail: 'recipient@example.com',
      giftTo: 'Мария',
      giftFrom: 'Алексей',
      giftPhraseId: 'yearly-18',
      reason: 'Replace the explicitly verified no-payment test certificate',
    },
    oldDoc: {
      enabled: true,
      maxRedemptions: 1,
      usedCount: 0,
      rewardDays: 365,
      rewardKind: 'days',
      expiresAtMs: Date.UTC(2027, 6, 29),
      note: oldNote,
      createdBy: 'owner@example.com',
    },
  } as const;

  it('requires an admin with manual-access permission', () => {
    expect(() => assertGiftCertificateAdminAccess(undefined)).toThrow('Admin only');
    expect(() => assertGiftCertificateAdminAccess({ uid: 'support', token: { admin: true, adminRole: 'support' } })).toThrow('Role cannot replace gift certificates');
    expect(() => assertGiftCertificateAdminAccess({ uid: 'owner', token: { admin: true } })).not.toThrow();
  });

  it('hard-binds the one repair to the exact server-owned code and note', () => {
    expect(GIFT_CERTIFICATE_REPAIR_OLD_CODE).toBe(oldCode);
    expect(GIFT_CERTIFICATE_REPAIR_OLD_NOTE).toBe(oldNote);
    expect(() => buildSyntheticGiftCertificateReplacement({ ...base, oldCode: 'GIFT-OTHER-123' }))
      .toThrow('old_certificate_target_mismatch');
    expect(() => buildSyntheticGiftCertificateReplacement({
      ...base,
      oldDoc: { ...base.oldDoc, note: `${oldNote}.` },
    })).toThrow('old_certificate_note_mismatch');
  });

  it('builds one active 365-day replacement and a prepared personalized delivery', () => {
    const result = buildSyntheticGiftCertificateReplacement(base);

    expect(result.newCodeDoc).toMatchObject({
      enabled: true,
      maxRedemptions: 1,
      usedCount: 0,
      rewardDays: 366,
      rewardKind: 'days',
      expiresAtMs: nowMs + 365 * 24 * 60 * 60 * 1000,
      replacementOf: oldCode,
    });
    expect(result.oldCodePatch).toMatchObject({ enabled: false, supersededBy: base.newCode, supersededAtMs: nowMs });
    expect(result.deliveryDoc).toMatchObject({
      status: 'prepared',
      activationCode: base.newCode,
      recipientEmail: 'recipient@example.com',
      plan: 'yearly',
      gift: true,
      giftTo: 'Мария',
      giftFrom: 'Алексей',
      giftPhraseId: 'yearly-18',
      codeExpiresAtMs: nowMs + 365 * 24 * 60 * 60 * 1000,
      testIssue: false,
      certificateId: base.newCode,
      product: 'yearly',
      recipientName: 'Мария',
      assetUrl: 'https://knowlyapps.com/assets/gift-certificates/gift-certificate-yearly.webp',
      createdAtMs: nowMs,
      expiresAtMs: nowMs + 365 * 24 * 60 * 60 * 1000,
    });
    expect(result.deliveryDoc.activationCode).toBe(base.newCode);
    expect(result.deliveryDoc).not.toHaveProperty('customerEmailSentAt');
    expect(result.deliveryDoc).not.toHaveProperty('provider');
    expect(result.deliveryDoc).not.toHaveProperty('amountCents');
  });

  it.each([
    ['used count', { usedCount: 1 }],
    ['redeemer marker', { lastRedeemedBy: 'stable-user' }],
    ['redemption timestamp', { lastRedeemedAtMs: nowMs - 1 }],
    ['disabled old code', { enabled: false }],
    ['non-single-use code', { maxRedemptions: 2 }],
    ['different reward', { rewardDays: 366 }],
  ])('rejects an old code that is not the exact unused synthetic grant: %s', (_label, patch) => {
    expect(() => buildSyntheticGiftCertificateReplacement({ ...base, oldDoc: { ...base.oldDoc, ...patch } }))
      .toThrow('old_certificate_not_replaceable');
  });

  it('requires the exact stored synthetic/no-payment note', () => {
    expect(() => buildSyntheticGiftCertificateReplacement({
      ...base,
      oldDoc: { ...base.oldDoc, note: 'Gift certificate for Test User' },
    })).toThrow('old_certificate_note_mismatch');
  });

  it('requires the dedicated authorization phrase and valid personalization', () => {
    expect(() => buildSyntheticGiftCertificateReplacement({ ...base, input: { ...base.input, authorization: 'yes' } }))
      .toThrow('replacement_not_authorized');
    expect(() => buildSyntheticGiftCertificateReplacement({ ...base, input: { ...base.input, recipientEmail: 'not-an-email' } }))
      .toThrow('invalid_recipient_email');
  });
});

describe('gift certificate prepared-delivery claim', () => {
  const deliveryId = 'GIFT-REAL-8Q7W6E5R';
  const nowMs = Date.UTC(2026, 6, 29, 12, 0, 0);
  const prepared = {
    status: 'prepared',
    activationCode: deliveryId,
    recipientEmail: 'badloar@gmail.com',
    giftTo: 'Мария',
    giftFrom: 'Алексей',
    plan: 'yearly',
    gift: true,
    testIssue: false,
    codeExpiresAtMs: Date.UTC(2027, 6, 29),
  };

  it('fails closed when delivery plan, product, reward, asset, expiry, code, or presentation drift', () => {
    const coherentDelivery = {
      ...prepared,
      certificateId: deliveryId,
      product: 'yearly',
      plan: 'yearly',
      giftPhraseId: 'yearly-01',
      assetUrl: 'https://knowlyapps.com/assets/gift-certificates/gift-certificate-yearly.webp',
      rewardDays: 366,
      rewardKind: 'days',
      expiresAtMs: prepared.codeExpiresAtMs,
    };
    const coherentCode = {
      enabled: true,
      maxRedemptions: 1,
      usedCount: 0,
      certificateId: deliveryId,
      certificateProduct: 'yearly',
      rewardDays: 366,
      rewardKind: 'days',
      expiresAtMs: prepared.codeExpiresAtMs,
    };

    expect(assertGiftCertificateSendCoherence(coherentDelivery, coherentCode, { deliveryId, nowMs }))
      .toMatchObject({ plan: 'yearly', presentation: { giftPhraseId: 'yearly-01' } });
    expect(() => assertGiftCertificateSendCoherence(
      { ...coherentDelivery, product: 'monthly' }, coherentCode, { deliveryId, nowMs },
    )).toThrow('gift_certificate_not_sendable');
    expect(() => assertGiftCertificateSendCoherence(
      { ...coherentDelivery, rewardDays: 31 }, coherentCode, { deliveryId, nowMs },
    )).toThrow('gift_certificate_not_sendable');
    expect(() => assertGiftCertificateSendCoherence(
      { ...coherentDelivery, assetUrl: 'https://example.com/monthly.webp' }, coherentCode, { deliveryId, nowMs },
    )).toThrow('gift_certificate_not_sendable');
    expect(() => assertGiftCertificateSendCoherence(
      coherentDelivery, { ...coherentCode, certificateProduct: 'monthly' }, { deliveryId, nowMs },
    )).toThrow('gift_certificate_not_sendable');
  });

  it('requires a separate explicit send authorization', () => {
    expect(() => assertGiftCertificateSendAuthorization('send')).toThrow('delivery_not_authorized');
    expect(() => assertGiftCertificateSendAuthorization(GIFT_CERTIFICATE_SEND_AUTHORIZATION)).not.toThrow();
  });

  it('claims only an unsent normal personalized certificate', () => {
    const context = { deliveryId, expectedRecipientEmail: ' Badloar@GMAIL.com ', nowMs };
    expect(decideGiftCertificateDeliveryClaim(prepared, context)).toEqual({ action: 'send', email: 'badloar@gmail.com' });
    expect(() => decideGiftCertificateDeliveryClaim({ ...prepared, giftTo: '' }, context)).toThrow('delivery_recipient_name_missing');
    expect(() => decideGiftCertificateDeliveryClaim({ ...prepared, testIssue: true }, context)).toThrow('test_delivery_forbidden');
  });

  it.each(['monthly', 'yearly', 'lifetime'] as const)('allows a persisted %s certificate to use the same sender', (plan) => {
    const context = { deliveryId, expectedRecipientEmail: 'badloar@gmail.com', nowMs };
    expect(decideGiftCertificateDeliveryClaim({ ...prepared, status: 'generated', plan }, context))
      .toEqual({ action: 'send', email: 'badloar@gmail.com' });
  });

  it('requires the caller to confirm the exact normalized stored recipient', () => {
    expect(() => decideGiftCertificateDeliveryClaim(prepared, {
      deliveryId, expectedRecipientEmail: undefined, nowMs,
    })).toThrow('expected_recipient_email_required');
    expect(() => decideGiftCertificateDeliveryClaim(prepared, {
      deliveryId, expectedRecipientEmail: 'recipient@example.com', nowMs,
    })).toThrow('expected_recipient_email_mismatch');
  });

  it('requires the activation code to exactly equal the delivery id', () => {
    expect(() => decideGiftCertificateDeliveryClaim({ ...prepared, activationCode: 'GIFT-OTHER-123' }, {
      deliveryId, expectedRecipientEmail: 'badloar@gmail.com', nowMs,
    })).toThrow('delivery_code_mismatch');
    expect(() => decideGiftCertificateDeliveryClaim({ ...prepared, activationCode: ` ${deliveryId} ` }, {
      deliveryId, expectedRecipientEmail: 'badloar@gmail.com', nowMs,
    })).toThrow('delivery_code_mismatch');
  });

  it('is idempotent after success and fail-closed during an in-flight send', () => {
    const context = { deliveryId, expectedRecipientEmail: 'badloar@gmail.com', nowMs };
    expect(decideGiftCertificateDeliveryClaim({ ...prepared, status: 'sent' }, context)).toEqual({ action: 'already_sent' });
    expect(() => decideGiftCertificateDeliveryClaim({
      ...prepared, status: 'sending', sendClaimedAtMs: nowMs - 30_000, firstProviderAttemptAtMs: nowMs - 30_000,
    }, context)).toThrow('delivery_in_progress');
  });

  it('retries ambiguous outcomes only inside Resend idempotency retention and then requires reconciliation', () => {
    const expectedRecipientEmail = 'badloar@gmail.com';
    expect(decideGiftCertificateDeliveryClaim({
      ...prepared,
      status: 'delivery_unknown',
      firstProviderAttemptAtMs: nowMs - 60 * 60 * 1000,
    }, { deliveryId, expectedRecipientEmail, nowMs })).toEqual({ action: 'send', email: expectedRecipientEmail });
    expect(decideGiftCertificateDeliveryClaim({
      ...prepared,
      status: 'sending',
      sendClaimedAtMs: nowMs - 120_000,
      firstProviderAttemptAtMs: nowMs - 60 * 60 * 1000,
    }, { deliveryId, expectedRecipientEmail, nowMs })).toEqual({ action: 'send', email: expectedRecipientEmail });
    expect(decideGiftCertificateDeliveryClaim({
      ...prepared,
      status: 'delivery_unknown',
      firstProviderAttemptAtMs: nowMs - 24 * 60 * 60 * 1000,
    }, { deliveryId, expectedRecipientEmail, nowMs })).toEqual({ action: 'reconciliation_required' });
  });

  it('distinguishes definite provider rejection from ambiguous transport outcomes', () => {
    expect(deliveryStatusForEmailOutcome('sent')).toBe('sent');
    expect(deliveryStatusForEmailOutcome('skipped_no_resend_key')).toBe('failed');
    expect(deliveryStatusForEmailOutcome('skipped_no_resend_from')).toBe('failed');
    expect(deliveryStatusForEmailOutcome('provider_rejected')).toBe('failed');
    expect(deliveryStatusForEmailOutcome('transport_unknown')).toBe('delivery_unknown');
    expect(resendFailureOutcomeForHttpStatus(400)).toBe('provider_rejected');
    expect(resendFailureOutcomeForHttpStatus(429)).toBe('provider_rejected');
    expect(resendFailureOutcomeForHttpStatus(500)).toBe('transport_unknown');
    expect(resendFailureOutcomeForHttpStatus(409)).toBe('transport_unknown');
  });

  it('hard-enforces App Check and binds Resend retries to the delivery id', () => {
    expect(GIFT_CERTIFICATE_MUTATION_OPTIONS.enforceAppCheck).toBe(true);
    expect(buildResendRequestHeaders('resend-key', deliveryId)).toMatchObject({
      Authorization: 'Bearer resend-key',
      'Content-Type': 'application/json',
      'Idempotency-Key': deliveryId,
    });
  });
});

describe('buildActivationEmail', () => {
  const support = 'support.phraseman@gmail.com';

  it('uses the same deterministic plan-first phrase for legacy missing or invalid saved ids', () => {
    const expected = GIFT_CERTIFICATE_PHRASES.yearly[0];
    for (const giftPhraseId of [undefined, 'monthly-01', 'invalid']) {
      const first = buildActivationEmail({
        activationCode: 'GIFT-7QW8E9R2TY', plan: 'yearly', product: 'yearly', gift: true,
        giftPhraseId, codeExpiresAtMs: Date.UTC(2027, 0, 1),
      }, support);
      const second = buildActivationEmail({
        activationCode: 'GIFT-7QW8E9R2TY', plan: 'yearly', product: 'yearly', gift: true,
        giftPhraseId, codeExpiresAtMs: Date.UTC(2027, 0, 1),
      }, support);
      expect(first.text).toContain(expected.text);
      expect(second.text).toContain(expected.text);
    }
  });

  it.each([
    ['monthly', 'gift-certificate-monthly.webp'],
    ['yearly', 'gift-certificate-yearly.webp'],
    ['lifetime', 'gift-certificate-lifetime.webp'],
  ] as const)('uses the deployed %s certificate art in paid gift email', (plan, filename) => {
    const { html } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan,
      gift: true,
      codeExpiresAtMs: Date.UTC(2027, 0, 1),
    }, support);

    expect(html).toContain(`https://knowlyapps.com/assets/gift-certificates/${filename}`);
    expect(html).toContain('data-gift-certificate-art="true"');
  });

  it('keeps the recipient-facing gift certificate free of payment commentary', () => {
    const { html, text } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'yearly',
      gift: true,
      codeExpiresAtMs: Date.UTC(2027, 0, 1),
    }, support);

    expect(html).not.toContain('Разовый платёж');
    expect(text).not.toContain('Разовый платёж');
  });

  it('именной сертификат: Для/От, название подарка, код, срок действия', () => {
    const { subject, text, html } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'yearly',
      gift: true,
      giftTo: 'Маша',
      giftFrom: 'Саша',
      codeExpiresAtMs: Date.UTC(2027, 6, 26),
    }, support);
    expect(subject).toContain('Подарочный сертификат');
    expect(subject).toContain('WEB-ABCDEFGHJK');
    expect(html).toContain('ПОДАРОЧНЫЙ СЕРТИФИКАТ');
    expect(html).toContain('Для: Маша');
    expect(html).toContain('от Саша');
    expect(html).toContain('Год Phraseman Plus');
    expect(html).toContain('WEB-ABCDEFGHJK');
    expect(html).toContain('26.07.2027');
    expect(text).toContain('Для: Маша');
    expect(text).toContain('Сертификат действует до 26.07.2027');
  });

  it('без имён — заголовок называет конкретный подарок, без дубля и без «вам подарили английский»', () => {
    const { html, text } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'monthly',
      gift: true,
      codeExpiresAtMs: Date.UTC(2027, 0, 1),
    }, support);
    expect(html).not.toContain('Вам подарили');
    expect(html).not.toContain('Для: ');
    expect(text).not.toContain('Для: ');
    expect((html.match(/Месяц Phraseman Plus/g) ?? []).length).toBe(1);
  });

  it('anonymous canonical personalization omits Для/от from both visual HTML and plain text while retaining delivery email', () => {
    const { html, text } = buildActivationEmail({
      activationCode: 'GIFT-7QW8E9R2TY',
      plan: 'yearly',
      product: 'yearly',
      gift: true,
      personalizationMode: 'anonymous',
      displayRecipientName: 'Скрытое имя',
      displaySenderName: 'Скрытый даритель',
      recipientName: 'Скрытое имя',
      recipientEmail: 'recipient@example.com',
      giftTo: 'Скрытое имя',
      giftFrom: 'Скрытый даритель',
      giftPhraseId: 'yearly-01',
      codeExpiresAtMs: Date.UTC(2027, 6, 26),
    }, support);
    expect(html).not.toContain('Для: Скрытое имя');
    expect(html).not.toContain('от Скрытый даритель');
    expect(text).not.toContain('Для: Скрытое имя');
    expect(text).not.toContain('От: Скрытый даритель');
    expect(html).toContain('Год Phraseman Plus');
  });

  it('keeps only gift identity, phrase, code and expiry inside the decorated certificate', () => {
    const phrase = GIFT_CERTIFICATE_PHRASES.yearly[17];
    const { html, text } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'yearly',
      gift: true,
      giftTo: 'Маша',
      giftFrom: 'Саша',
      giftPhraseId: phrase.id,
      testIssue: true,
      codeExpiresAtMs: Date.UTC(2027, 6, 26),
    }, support);
    const certificate = html.match(/<table data-gift-certificate-art="true"[\s\S]*?<\/table>/)?.[0] ?? '';
    const instructions = html.match(/<div data-gift-instructions="true"[\s\S]*?<\/div>/)?.[0] ?? '';

    expect(certificate).toContain('Для: Маша');
    expect(certificate).toContain('от Саша');
    expect(certificate).toContain('Год Phraseman Plus');
    expect(certificate).toContain(phrase.text);
    expect(certificate).toContain('WEB-ABCDEFGHJK');
    expect(certificate).toContain('26.07.2027');
    expect(certificate).not.toContain('Как включить доступ');
    expect(certificate).not.toContain('Скачайте Phraseman');
    expect(certificate).not.toContain('Перешлите это письмо');
    expect(certificate).not.toContain(support);
    expect(certificate).not.toContain('ТЕСТОВАЯ ВЫДАЧА');

    expect(instructions).toContain('ТЕСТОВАЯ ВЫДАЧА');
    expect(instructions).toContain('Как включить доступ');
    expect(instructions).toContain('Скачайте Phraseman');
    expect(instructions).toContain('Перешлите это письмо');
    expect(instructions).toContain(support);
    expect(html.indexOf(instructions)).toBeGreaterThan(html.indexOf('</table>'));
    expect(text).toContain(phrase.text);
    expect(text.indexOf(phrase.text)).toBeLessThan(text.indexOf('Код активации'));
  });

  it('оплаченный подарочный код стоит простой строкой внизу без плашки', () => {
    const { html } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'lifetime',
      gift: true,
      giftTo: 'Маша',
      codeExpiresAtMs: Date.UTC(2027, 0, 1),
    }, support);
    const codeLine = html.match(/<div data-gift-code="true"[^>]*>WEB-ABCDEFGHJK<\/div>/)?.[0] ?? '';

    expect(codeLine).not.toBe('');
    expect(codeLine).not.toContain('background:');
    expect(codeLine).not.toContain('border-radius:');
    expect(codeLine).not.toContain('padding:');
    expect(html.indexOf(codeLine)).toBeLessThan(html.indexOf('Как включить доступ:'));
  });

  it('обычная покупка: нейминг Plus/Pro, без слова «сертификат», без срока', () => {
    const { subject, html, text } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'lifetime',
      gift: false,
      codeExpiresAtMs: 0,
    }, support);
    expect(subject).toBe('Ваш код активации Phraseman: WEB-ABCDEFGHJK');
    expect(html).toContain('Phraseman Pro — навсегда');
    expect(html).not.toContain('СЕРТИФИКАТ');
    expect(html).not.toContain('действует до');
    expect(text).not.toContain('действует до');
  });

  it('вёрстка без рамок-обводок и имена экранируются', () => {
    const { html } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'yearly',
      gift: true,
      giftTo: '<script>alert(1)</script>',
      giftFrom: 'A&B',
      codeExpiresAtMs: Date.UTC(2027, 0, 1),
    }, support);
    expect(html).not.toMatch(/border:\s*1px/);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A&amp;B');
  });
});
