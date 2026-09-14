/** Display indices keep repeated tokens independently selectable. */
export function mistakePracticeTokenOrder(
  tokens: readonly string[],
  exerciseId: string,
  answerTokenCount = 0,
): number[] {
  const order = tokens.map((_, index) => index);
  let seed = 2166136261;
  for (let i = 0; i < exerciseId.length; i += 1) {
    seed = Math.imul(seed ^ exerciseId.charCodeAt(i), 16777619) >>> 0;
  }
  for (let i = order.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = Math.floor((seed / 0x100000000) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // A shuffle may leave the same visible sentence, especially with duplicates.
  if (order.every((index, position) => tokens[index] === tokens[position])) {
    const different = order.findIndex(index => tokens[index] !== tokens[order[0]]);
    if (different > 0) [order[0], order[different]] = [order[different], order[0]];
  }
  // The builder bank is created as [answer tokens, distractors]. A shuffle
  // can still leave the answer tokens together in their original order,
  // making the task look solved before the first tap.
  const answerCount = Math.min(Math.max(0, answerTokenCount), tokens.length);
  if (answerCount > 1) {
    const positions = Array.from({ length: answerCount }, (_, index) => order.indexOf(index));
    const answerRun = positions.every((position, index) => position === positions[0] + index);
    if (answerRun) {
      [order[positions[0]], order[positions[0] + 1]] = [order[positions[0] + 1], order[positions[0]]];
    }
  }
  return order;
}
