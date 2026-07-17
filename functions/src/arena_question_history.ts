const MAX_RECENT_QUESTIONS = 100;

export function mergeArenaQuestionHistory(previous: readonly string[], selected: readonly string[]): readonly string[] {
  return Object.freeze([...new Set([...selected, ...previous].filter((id) => typeof id === 'string' && id.length > 0))].slice(0, MAX_RECENT_QUESTIONS));
}
