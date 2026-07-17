import { createHash } from 'node:crypto';
import { PROMPT_REGRESSION_FIXTURES, type PromptRegressionCase, type RegressionFailure } from './fixtures/prompt-regression/cases';
export type { PromptRegressionCase, RegressionFailure } from './fixtures/prompt-regression/cases';

function canonical(value: unknown): string { if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`; return JSON.stringify(value); }
function hash(value: unknown): string { return createHash('sha256').update(canonical(value)).digest('hex'); }

export const PROMPT_REGRESSION_CASES: readonly PromptRegressionCase[] = PROMPT_REGRESSION_FIXTURES;
export function promptRegressionManifest(cases: readonly PromptRegressionCase[]) { const entries = cases.map((item) => JSON.parse(JSON.stringify(item)) as PromptRegressionCase); return Object.freeze({ schemaVersion: 'prompt-regression-manifest-v1' as const, entries: Object.freeze(entries), hash: hash(entries) }); }
export function promptRegressionManifestHash(): string { return promptRegressionManifest(PROMPT_REGRESSION_CASES).hash; }
export function regressionHash(value: unknown): string { return hash(value); }
