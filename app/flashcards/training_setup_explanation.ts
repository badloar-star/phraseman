/** Selection and loading are different facts. Never describe an unresolved list as empty. */
export function trainingSetupExplanation(
  state: 'loading' | 'ready' | 'error',
  deckCount: number,
  selectionLabel: string,
  labels: Readonly<{ loading: string; error: string; empty: string; unselected: string }>,
): string {
  if (state === 'loading') return labels.loading;
  if (state === 'error') return labels.error;
  if (deckCount === 0) return labels.empty;
  return selectionLabel || labels.unselected;
}
