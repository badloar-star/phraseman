export type ArenaTextRole = 'native' | 'target' | 'prompt';

export type ArenaPromptSegment = Readonly<{
  text: string;
  role: Exclude<ArenaTextRole, 'prompt'>;
  focus: boolean;
}>;

/**
 * Splits prompt copy on quote boundaries without inferring a language from its
 * characters. The caller owns language meaning through the explicit role.
 */
export function arenaPromptSegments(text: string, role: ArenaTextRole): readonly ArenaPromptSegment[] {
  if (!text) return [];
  if (role !== 'prompt') return [{ text, role, focus: false }];

  const segments: ArenaPromptSegment[] = [];
  const matcher = /«[^»]*»|"[^"]*"/g;
  let offset = 0;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(text))) {
    if (match.index > offset) segments.push({ text: text.slice(offset, match.index), role: 'native', focus: false });
    segments.push({ text: match[0], role: 'native', focus: true });
    offset = match.index + match[0].length;
  }
  if (offset < text.length) segments.push({ text: text.slice(offset), role: 'native', focus: false });
  return segments;
}

/** Display punctuation is a visual suffix, never an answer token. */
export function shouldShowArenaBuilderPunctuation(
  selectedTokenCount: number,
  punctuation: '?' | undefined,
): boolean {
  return selectedTokenCount > 0 && punctuation === '?';
}
