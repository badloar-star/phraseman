import { validatePmBrief, type PmBrief, type ValidationResult } from './admin_pm_contracts';

export interface PmGenerationRequestInput {
  mode: 'full' | 'coverage_only';
  evidence: unknown;
  codex: unknown;
  ownerNotes: string[];
}

export interface PmGenerationRequest {
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  tools: [];
  responseFormat: 'json';
}

export type PmParseResult = ({ ok: true; brief: PmBrief } | ValidationResult) & { brief?: PmBrief };

function jsonForPrompt(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildPmGenerationRequest(input: PmGenerationRequestInput): PmGenerationRequest {
  const coverageOnlyRule = input.mode === 'coverage_only'
    ? 'Do not produce recommendations, ideas, experiments or causal hypotheses. Return verified observations and coverage report only.'
    : 'Produce a 1200-2000 word product-manager article, 3-5 recommendations and 1-3 experiments.';
  return {
    tools: [],
    responseFormat: 'json',
    messages: [
      {
        role: 'system',
        content: [
          'You are a product manager for PhraseMan.',
          'Use only provided aggregate evidence and Codex references.',
          'Separate facts, hypotheses and recommendations.',
          coverageOnlyRule,
          'Return strict JSON matching the PM brief contract.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          'UNTRUSTED_DATA_START',
          jsonForPrompt({
            mode: input.mode,
            evidence: input.evidence,
            codex: input.codex,
            ownerNotes: input.ownerNotes,
          }),
          'UNTRUSTED_DATA_END',
        ].join('\n'),
      },
    ],
  };
}

export function sanitizePmMarkdown(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/\[([^\]]*)\]\((?:javascript|data):[^)]*\)\)?/gi, '[$1](#)');
}

function sanitizeDeep(value: unknown): unknown {
  if (typeof value === 'string') return sanitizePmMarkdown(value);
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sanitizeDeep(item)]));
}

export function parseAndValidatePmBriefJson(
  raw: string,
  evidenceIds: ReadonlySet<string>,
  codexIds: ReadonlySet<string>,
): PmParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ['invalid_json'] };
  }
  const sanitized = sanitizeDeep(parsed);
  const validation = validatePmBrief(sanitized, evidenceIds, codexIds);
  if (!validation.ok) return validation;
  return { ok: true, brief: sanitized as PmBrief };
}
