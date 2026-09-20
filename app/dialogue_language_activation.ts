import type { DialogueStudyTarget } from './dialogue_language_registry';

export const DIALOGUE_QUALITY_ROLES = [
  'target_contract_guardian',
  'scenario_pack_reviewer',
  'prompt_language_judge',
  'voice_locale_gate',
  'state_isolation_judge',
  'surface_matrix_gate',
] as const;

type DialogueQualityRole = typeof DIALOGUE_QUALITY_ROLES[number];

export type DialogueLanguageActivationReceipt = Readonly<{
  target: Exclude<DialogueStudyTarget, 'en'>;
  packSha256: string;
  englishBenchmarkSha256: string;
  promptContractSha256: string;
  voiceEvidenceSha256: string;
  matrixReportSha256: string;
  judgePromptVersion: string;
  roleVerdicts: Readonly<Record<DialogueQualityRole, 'PASS' | 'REVISE' | 'BLOCK'>>;
}>;

const SHA256_RE = /^[a-f0-9]{64}$/i;

/** Independent quality evidence. Owner-authorised release state is separate. */
export const DIALOGUE_LANGUAGE_ACTIVATION_RECEIPTS: Readonly<Partial<Record<Exclude<DialogueStudyTarget, 'en'>, DialogueLanguageActivationReceipt>>> = Object.freeze({});

/**
 * Explicit production release switch authorised by the owner on 2026-09-20.
 *
 * This is deliberately separate from quality receipts: an urgent owner release
 * must not be represented as independent review evidence that never existed.
 */
export const DIALOGUE_OWNER_RELEASED_TARGETS: readonly Exclude<DialogueStudyTarget, 'en'>[] =
  Object.freeze(['es', 'fr', 'de']);

export function isDialogueLanguageActivationReceiptValid(
  receipt: DialogueLanguageActivationReceipt | undefined,
  target: Exclude<DialogueStudyTarget, 'en'>,
): boolean {
  if (!receipt || receipt.target !== target || !receipt.judgePromptVersion.trim()) return false;
  const hashes = [
    receipt.packSha256,
    receipt.englishBenchmarkSha256,
    receipt.promptContractSha256,
    receipt.voiceEvidenceSha256,
    receipt.matrixReportSha256,
  ];
  return hashes.every((hash) => SHA256_RE.test(hash))
    && DIALOGUE_QUALITY_ROLES.every((role) => receipt.roleVerdicts[role] === 'PASS');
}

export function dialogueLanguageIsActivated(target: DialogueStudyTarget): boolean {
  if (target === 'en') return true;
  return DIALOGUE_OWNER_RELEASED_TARGETS.includes(target)
    || isDialogueLanguageActivationReceiptValid(DIALOGUE_LANGUAGE_ACTIVATION_RECEIPTS[target], target);
}
