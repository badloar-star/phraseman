export const SAFETY_FLAG_AGE_CONTRACT = Object.freeze({
  consentAgeValues: Object.freeze(['adult', 'unknown'] as const),
  evidenceStates: Object.freeze([
    'confirmed_adult',
    'age_unverified',
    'unavailable',
  ] as const),
});

export type SafetyAgeEvidence = (typeof SAFETY_FLAG_AGE_CONTRACT.evidenceStates)[number];

export type SafetyConsentEvidenceInput = Readonly<{
  available: boolean;
  ageBracket?: unknown;
}>;

export function deriveSafetyAgeEvidence(input: SafetyConsentEvidenceInput): SafetyAgeEvidence {
  if (!input.available) return 'unavailable';
  return input.ageBracket === 'adult' ? 'confirmed_adult' : 'age_unverified';
}

export function safetyFlagAgeBracket(evidence: SafetyAgeEvidence): 'adult' | null {
  return evidence === 'confirmed_adult' ? 'adult' : null;
}

export async function readServerSafetyAgeEvidence(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
): Promise<SafetyAgeEvidence> {
  try {
    const snapshot = await db.collection('user_consents').doc(stableUid).get();
    const row = snapshot.exists ? (snapshot.data() ?? {}) : {};
    return deriveSafetyAgeEvidence({ available: true, ageBracket: row.ageBracket });
  } catch {
    return 'unavailable';
  }
}
