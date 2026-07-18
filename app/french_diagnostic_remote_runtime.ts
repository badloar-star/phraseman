export type FrenchDiagnosticQuestion = {
  phrase: string;
  hintRU: string;
  hintUK: string;
  hintES: string;
  opts: string[];
  correct: number;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  type: 'choice4';
  answer?: string;
};

/**
 * The retired Quiz payload was the only remote source for French diagnostic
 * rows. Return no rows rather than silently serving stale or unverified data.
 */
export async function loadFrenchRemoteDiagnosticQuestions(
  _sourceLocaleInput: unknown,
  _totalCount = 20,
): Promise<FrenchDiagnosticQuestion[]> {
  return [];
}

export default function __FrenchDiagnosticRemoteRuntimeRouteShim() {
  return null;
}
