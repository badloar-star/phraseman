/** Parses both current and legacy Markdown interaction annotations. */
export function parseAnnotation(text) {
  const match = /<!--\s*interaction_id:\s*([^;]+);(?:\s*family:\s*([^\s]+)\s*)?\s*-->/u.exec(text);
  return match ? { interactionId: match[1].trim(), family: match[2]?.trim() ?? null } : null;
}

export function canonicalAnnotation(interactionId, family) {
  return `<!-- interaction_id: ${interactionId}; family: ${family} -->`;
}

export function hasAnnotationChanges({ insertions, replacements }) {
  return insertions + replacements > 0;
}
