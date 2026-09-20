import {
  DIALOGUE_QUALITY_ROLES,
  isDialogueLanguageActivationReceiptValid,
  type DialogueLanguageActivationReceipt,
} from '../app/dialogue_language_activation';

const hash = 'a'.repeat(64);
const validReceipt: DialogueLanguageActivationReceipt = {
  target: 'es',
  packSha256: hash,
  englishBenchmarkSha256: hash,
  promptContractSha256: hash,
  voiceEvidenceSha256: hash,
  matrixReportSha256: hash,
  judgePromptVersion: 'dialogue-scenario-judge-v1',
  roleVerdicts: Object.fromEntries(DIALOGUE_QUALITY_ROLES.map((role) => [role, 'PASS'])) as DialogueLanguageActivationReceipt['roleVerdicts'],
};

describe('dialogue language activation receipt', () => {
  it('requires every hash-bound independent PASS before a non-English contour can activate', () => {
    expect(isDialogueLanguageActivationReceiptValid(validReceipt, 'es')).toBe(true);
  });

  it('rejects missing evidence, a changed target, or any non-PASS role', () => {
    expect(isDialogueLanguageActivationReceiptValid({ ...validReceipt, packSha256: '' }, 'es')).toBe(false);
    expect(isDialogueLanguageActivationReceiptValid({ ...validReceipt, target: 'fr' }, 'es')).toBe(false);
    expect(isDialogueLanguageActivationReceiptValid({ ...validReceipt, roleVerdicts: { ...validReceipt.roleVerdicts, voice_locale_gate: 'REVISE' } }, 'es')).toBe(false);
  });
});
