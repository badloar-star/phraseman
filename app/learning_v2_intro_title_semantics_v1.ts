export type LearningV2IntroTitleSegmentV1 = Readonly<{
  text: string;
  isTarget: boolean;
}>;

const WORD_CHARACTER = /[\p{L}\p{N}_]/u;

const isWordCharacter = (character: string | undefined): boolean =>
  character !== undefined && WORD_CHARACTER.test(character);

const hasTokenBoundaries = (
  title: string,
  offset: number,
  target: string,
): boolean => {
  const first = target[0];
  const last = target[target.length - 1];
  const before = offset > 0 ? title[offset - 1] : undefined;
  const after = title[offset + target.length];
  return (
    (!isWordCharacter(first) || !isWordCharacter(before)) &&
    (!isWordCharacter(last) || !isWordCharacter(after))
  );
};

export function splitLearningV2IntroTitleByTargetsV1(
  title: string,
  authoredTargets: readonly string[],
): readonly LearningV2IntroTitleSegmentV1[] {
  if (!title) return [];
  const targets = [...new Set(authoredTargets.map((value) => value.trim()))]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  if (targets.length === 0) return [{ text: title, isTarget: false }];

  const lowerTitle = title.toLocaleLowerCase();
  const segments: LearningV2IntroTitleSegmentV1[] = [];
  let explanationStart = 0;
  let cursor = 0;

  while (cursor < title.length) {
    const match = targets.find(
      (target) =>
        lowerTitle.startsWith(target.toLocaleLowerCase(), cursor) &&
        hasTokenBoundaries(title, cursor, target),
    );
    if (!match) {
      cursor += 1;
      continue;
    }
    if (explanationStart < cursor) {
      segments.push({
        text: title.slice(explanationStart, cursor),
        isTarget: false,
      });
    }
    segments.push({
      text: title.slice(cursor, cursor + match.length),
      isTarget: true,
    });
    cursor += match.length;
    explanationStart = cursor;
  }

  if (explanationStart < title.length) {
    segments.push({ text: title.slice(explanationStart), isTarget: false });
  }
  return segments.length > 0 ? segments : [{ text: title, isTarget: false }];
}
