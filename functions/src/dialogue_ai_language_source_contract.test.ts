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
      send.indexOf('enforceMonthlyQuota('),
    );

    const stream = endpointBody(source('premium_dialog_stream.ts'), 'premiumDialogStream');
    expect(stream.indexOf('resolveDialogueTargetBeforeWarmup(')).toBeLessThan(
      stream.indexOf('enforceMonthlyQuota('),
    );
  });

  it('validates review targets before identity, evidence, rate-limit, and provider work', () => {
    const review = endpointBody(source('premium_dialog_review.ts'), 'premiumDialogReview');
    // зачем (Dialogue V2, D112): в начале эндпоинта появилась ветка dialogueVersion === 'v2' со своей
    // серверной валидацией запроса — executeDialogueV2CompletionReview проверяет цель и сценарий
    // РАНЬШЕ, чем persistDialogueV2CompletionMemory читает личность (resolveStableUidForAuth).
    // Прежняя проверка порядка теперь относится к устаревшему (не-V2) пути после этой ветки.
    const v2Branch = review.indexOf("data.dialogueVersion === 'v2'");
    expect(v2Branch).toBeGreaterThanOrEqual(0);
    const v2Validation = review.indexOf('executeDialogueV2CompletionReview(');
    expect(v2Validation).toBeGreaterThan(v2Branch);
    expect(v2Validation).toBeLessThan(review.indexOf('resolveStableUidForAuth('));

    const legacy = review.slice(review.indexOf('resolveDialogueTargetBeforeWarmup('));
    expect(legacy.length).toBeGreaterThan(0);
    expect(legacy.indexOf('resolveStableUidForAuth(')).toBeGreaterThan(0);
    expect(legacy.indexOf('applyTutorMemoryUpdate(')).toBeGreaterThan(0);
    expect(legacy.indexOf('enforceRateLimit(')).toBeGreaterThan(0);
    expect(legacy.indexOf('fetch(OPENAI_CHAT_URL')).toBeGreaterThan(0);
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
