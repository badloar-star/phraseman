/** Exact server-compatible answer normalization for instant tournament feedback. */
export function canonicalAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).join('\u0001');
  return String(value ?? '').trim();
}

/** Room-scoped UX hint only; scores and rewards remain server-authoritative. */
export function answerFingerprint(roomId: string, taskId: string, answer: unknown): string {
  let hash = 2166136261;
  const source = `${roomId}|${taskId}|${canonicalAnswerValue(answer)}`;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
