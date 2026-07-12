export function mergeLegacyLessonWordCounts(
  counts: Record<string, number>,
  aliases: Readonly<Record<string, string>>,
  availableWords?: ReadonlySet<string>,
): { counts: Record<string, number>; dirty: boolean } {
  let dirty = false;
  const out = { ...counts };
  for (const [legacy, canonical] of Object.entries(aliases)) {
    if (legacy === canonical || out[legacy] == null) continue;
    if (availableWords?.has(legacy)) continue;
    if (availableWords && !availableWords.has(canonical)) continue;
    out[canonical] = Math.max(Number(out[canonical]) || 0, Number(out[legacy]) || 0);
    delete out[legacy];
    dirty = true;
  }
  return { counts: dirty ? out : counts, dirty };
}
