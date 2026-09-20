import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, 'premium_dialog_stream.ts'), 'utf8');

describe('premium dialog stream language guard contract', () => {
  it('keeps unchecked live provider deltas exclusive to English', () => {
    expect(source).toContain("return studyTarget === 'en';");
    expect(source).toContain('const canPublishUncheckedDeltas = canPublishUncheckedProviderDelta(studyTarget);');

    const providerDeltaGuard = source.indexOf('if (!canPublishUncheckedDeltas) return;');
    const uncheckedPublish = source.indexOf('publisher.push(accumulated);');
    expect(providerDeltaGuard).toBeGreaterThanOrEqual(0);
    expect(uncheckedPublish).toBeGreaterThan(providerDeltaGuard);
  });

  it('publishes a future non-English reply only after full-response guards accept it', () => {
    const regulatedGuard = source.indexOf('sanitizeRegulatedAdviceReply(reply, studyTarget)');
    const languageGuard = source.indexOf('assertDialogGeneratedTargetFields({');
    const acceptedReply = source.indexOf('const assistantMessage = accepted.value.reply;');
    const bufferedPublishGuard = source.indexOf('if (!canPublishUncheckedDeltas) {', acceptedReply);
    const validatedPublish = source.indexOf('publishAcceptedDialogReply(', bufferedPublishGuard);
    const validatedPublisherCallback = source.indexOf(
      '(reply) => assertDialogReplyMatchesTarget(reply, studyTarget)',
      validatedPublish,
    );

    expect(regulatedGuard).toBeGreaterThanOrEqual(0);
    expect(languageGuard).toBeGreaterThan(regulatedGuard);
    expect(acceptedReply).toBeGreaterThan(languageGuard);
    expect(bufferedPublishGuard).toBeGreaterThan(acceptedReply);
    expect(validatedPublish).toBeGreaterThan(bufferedPublishGuard);
    expect(validatedPublisherCallback).toBeGreaterThan(validatedPublish);
  });

  it('builds the companion prompt from the validated target', () => {
    expect(source).toContain(
      'buildCompanionSystemPrompt(cefr, sanitizeMemory(data.memory), data.interfaceLang, requestedTarget)',
    );
    expect(source).not.toContain(
      'buildCompanionSystemPrompt(cefr, sanitizeMemory(data.memory), data.interfaceLang, data.studyTarget)',
    );
  });
});
