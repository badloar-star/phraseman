export interface PromptContext {
  readonly studyTarget: string;
  readonly sourceLocale: string;
  readonly cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  readonly objective: string;
  readonly count: number;
  readonly approvedArtifactIds: readonly string[];
  readonly exemplarIds: readonly string[];
  readonly previousContentFingerprints: readonly string[];
}

const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const CEFR_RE = /^(?:A1|A2|B1|B2|C1|C2)$/;
const HASH_RE = /^[a-f0-9]{64}$/i;
const INSTRUCTION_RE = /(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|system)\s+instructions?|system\s*prompt|developer\s*message/i;

function normalizedIds(values: readonly string[]): readonly string[] {
  if (values.some((value) => typeof value !== 'string' || !value.trim() || value.length > 260)) throw new Error('prompt_context_invalid');
  return Object.freeze([...new Set(values.map((value) => value.trim()))].sort());
}

export function buildPromptContext(input: PromptContext): PromptContext {
  const objective = String(input.objective ?? '').trim();
  if (INSTRUCTION_RE.test(objective)) throw new Error('prompt_context_instruction_injection');
  if (!LOCALE_RE.test(input.studyTarget) || !LOCALE_RE.test(input.sourceLocale) || !CEFR_RE.test(input.cefr) || !objective || objective.length > 1000 || !Number.isSafeInteger(input.count) || input.count < 1 || input.count > 1000 || input.previousContentFingerprints.some((hash) => !HASH_RE.test(hash))) {
    throw new Error('prompt_context_invalid');
  }
  return Object.freeze({
    studyTarget: input.studyTarget,
    sourceLocale: input.sourceLocale,
    cefr: input.cefr,
    objective,
    count: input.count,
    approvedArtifactIds: normalizedIds(input.approvedArtifactIds),
    exemplarIds: normalizedIds(input.exemplarIds),
    previousContentFingerprints: Object.freeze([...new Set(input.previousContentFingerprints.map((hash) => hash.toLowerCase()))].sort()),
  });
}
