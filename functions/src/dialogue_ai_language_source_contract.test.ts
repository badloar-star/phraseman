import fs from 'fs';
import path from 'path';

function source(name: string): string {
  return fs.readFileSync(path.join(__dirname, name), 'utf8');
}

function endpointBody(file: string, exportName: string): string {
  const start = file.indexOf(`export const ${exportName}`);
  expect(start).toBeGreaterThanOrEqual(0);
  return file.slice(start);
}

describe('dialogue server language isolation source contract', () => {
  it('uses only the dialogue-specific resolver in every dialogue endpoint', () => {
    for (const name of ['premium_dialog.ts', 'premium_dialog_stream.ts', 'premium_dialog_review.ts']) {
      const file = source(name);
      expect(file).not.toContain("resolveStudyTarget } from './ai_language_contract'");
      expect(file).toContain('resolveDialogueTargetBeforeWarmup');
    }
  });

  it('validates send and stream targets before quota consumption', () => {
    const send = endpointBody(source('premium_dialog.ts'), 'premiumDialogSend');
    expect(send.indexOf('resolveDialogueTargetBeforeWarmup(')).toBeLessThan(
      send.indexOf('enforceDailyQuota('),
    );

    const stream = endpointBody(source('premium_dialog_stream.ts'), 'premiumDialogStream');
    expect(stream.indexOf('resolveDialogueTargetBeforeWarmup(')).toBeLessThan(
      stream.indexOf('enforceDailyQuota('),
    );
  });

  it('validates review targets before identity, evidence, rate-limit, and provider work', () => {
    const review = endpointBody(source('premium_dialog_review.ts'), 'premiumDialogReview');
    const validation = review.indexOf('resolveDialogueTargetBeforeWarmup(');
    expect(validation).toBeGreaterThanOrEqual(0);
    expect(validation).toBeLessThan(review.indexOf('resolveStableUidForAuth('));
    expect(validation).toBeLessThan(review.indexOf('applyTutorMemoryUpdate('));
    expect(validation).toBeLessThan(review.indexOf('enforceRateLimit('));
    expect(validation).toBeLessThan(review.indexOf('fetch(OPENAI_CHAT_URL'));
  });

  it('validates translation and how-to-say targets before cache, rate-limit, or provider work', () => {
    const translate = endpointBody(source('premium_dialog.ts'), 'premiumDialogTranslate');
    const validation = translate.indexOf('resolveDialogueTargetBeforeWarmup(');
    expect(validation).toBeGreaterThanOrEqual(0);
    expect(validation).toBeLessThan(translate.indexOf('cacheRef.get()'));
    expect(validation).toBeLessThan(translate.indexOf("enforceRateLimit(authUid, stableUid, 'tr')"));
    expect(validation).toBeLessThan(translate.indexOf('fetch(OPENAI_CHAT_URL'));
  });

  it('validates activated targets before every warmup success', () => {
    const send = endpointBody(source('premium_dialog.ts'), 'premiumDialogSend');
    const translate = endpointBody(source('premium_dialog.ts'), 'premiumDialogTranslate');
    const stream = endpointBody(source('premium_dialog_stream.ts'), 'premiumDialogStream');

    for (const endpoint of [send, translate, stream]) {
      const validation = endpoint.indexOf('resolveDialogueTargetBeforeWarmup(');
      const warmup = endpoint.indexOf('warmupPing === true');
      expect(validation).toBeGreaterThanOrEqual(0);
      expect(warmup).toBeGreaterThan(validation);
    }
  });

  it('binds dialogue translation cache reads and writes to the dialogue contract version', () => {
    const translate = endpointBody(source('premium_dialog.ts'), 'premiumDialogTranslate');
    expect(translate).toContain('LANGUAGE_CONTRACT_VERSION');
    expect(translate).toContain('assertHowToSayVariantsMatchTarget(cachedVariants, sourceStudyTarget)');
    expect(translate).toContain('cachedData?.languageContractVersion === LANGUAGE_CONTRACT_VERSION');
  });
});
