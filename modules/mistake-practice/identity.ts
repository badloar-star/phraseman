import {
  canonicalJsonV1,
  sha256Utf8,
} from '../learning-v2/policies/decision_registry';
import type {
  MistakeFacetRef,
  MistakeIdentityInput,
  MistakeIdentityResult,
} from './contracts';

const IDENTITY_SCHEMA = 'mistake-identity.v2' as const;
const CONTENT_SCHEMA = 'mistake-content.v1' as const;

const normalizeText = (value: string): string =>
  value.normalize('NFC').replace(/\s+/g, ' ').trim();

function normalizeFacet(
  facet: MistakeFacetRef,
): Readonly<Record<string, unknown>> | null {
  if (facet.kind === 'missing_token') {
    const expected = normalizeText(facet.expected ?? '');
    if (
      !Number.isSafeInteger(facet.tokenIndex)
      || (facet.tokenIndex ?? -1) < 0
      || !expected
    ) {
      return null;
    }
    return Object.freeze({
      expected,
      kind: facet.kind,
      tokenIndex: facet.tokenIndex,
    });
  }

  const normalized: Record<string, unknown> = { kind: facet.kind };
  if (facet.tokenIndex !== undefined) {
    if (!Number.isSafeInteger(facet.tokenIndex) || facet.tokenIndex < 0) {
      return null;
    }
    normalized.tokenIndex = facet.tokenIndex;
  }
  if (facet.expected !== undefined) {
    const expected = normalizeText(facet.expected);
    if (!expected) return null;
    normalized.expected = expected;
  }
  return Object.freeze(normalized);
}

export function buildMistakeIdentity(
  input: MistakeIdentityInput,
): MistakeIdentityResult {
  const sourceId = normalizeText(input.content.sourceId);
  if (!sourceId) {
    return Object.freeze({ kind: 'not_capturable', reason: 'missing_source_id' });
  }

  const canonicalTarget = normalizeText(input.content.canonicalTarget);
  if (!canonicalTarget) {
    return Object.freeze({
      kind: 'not_capturable',
      reason: 'missing_canonical_target',
    });
  }

  const facet = normalizeFacet(input.facet);
  if (!facet) {
    return Object.freeze({ kind: 'not_capturable', reason: 'invalid_facet' });
  }

  const contentFingerprint = sha256Utf8(canonicalJsonV1({
    audioRef: normalizeText(input.content.audioRef ?? ''),
    canonicalTarget,
    schema: CONTENT_SCHEMA,
    sourceMeaning: normalizeText(input.content.sourceMeaning ?? ''),
    tokens: (input.content.tokens ?? []).map(normalizeText),
  }));

  const canonicalIdentity = canonicalJsonV1({
    canonicalTarget,
    contentFingerprint,
    facet,
    schema: IDENTITY_SCHEMA,
    sourceId,
    sourceKind: input.content.sourceKind,
    studyTarget: input.studyTarget,
  });

  return Object.freeze({
    kind: 'capturable',
    mistakeId: `mistake:v1:${sha256Utf8(canonicalIdentity)}`,
    canonicalIdentity,
    contentFingerprint,
  });
}
