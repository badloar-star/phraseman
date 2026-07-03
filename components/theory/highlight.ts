export function splitTheoryHighlight(en: string, hi?: string): [string, string, string] {
  const needle = String(hi ?? '').trim();
  if (!needle) return [en, '', ''];

  const escapedNeedle = needle
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  const match = new RegExp(`(^|[^A-Za-z0-9'])(${escapedNeedle})(?=$|[^A-Za-z0-9'])`, 'i').exec(en);
  if (!match) return [en, '', ''];

  const start = match.index + match[1].length;
  const end = start + match[2].length;
  return [en.slice(0, start), en.slice(start, end), en.slice(end)];
}
