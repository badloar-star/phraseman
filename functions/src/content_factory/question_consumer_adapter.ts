export function assertChallengeDraftOnly(action: 'preview' | 'publish'): 'draft_only_no_consumer' {
  if (action === 'publish') throw new Error('challenge_runtime_consumer_not_found');
  return 'draft_only_no_consumer';
}

export function applyQuestionReplacements<T extends { readonly id: string }>(items: readonly T[], replacements: readonly { readonly replacementForQuestionId: string; readonly item: T }[]): readonly T[] {
  const byId = new Map(replacements.map((replacement) => [replacement.replacementForQuestionId, replacement.item]));
  if (byId.size !== replacements.length || replacements.some((replacement) => replacement.item.id !== replacement.replacementForQuestionId) || replacements.some((replacement) => !items.some((item) => item.id === replacement.replacementForQuestionId))) throw new Error('question_replacement_set_invalid');
  return Object.freeze(items.map((item) => byId.get(item.id) ?? item));
}
