export const V2_EXACT_LANGUAGE_TAG_MAX_BYTES_V1 = 255;
export const V2_EXACT_LANGUAGE_TAG_MAX_SUBTAGS_V1 = 3;

export interface V2ExactLanguageTagShapeV1 {
  readonly primary: string;
  readonly script: string | null;
  readonly region: string | null;
}

const EXACT_LANGUAGE_TAG_RE =
  /^([a-z]{2,3})(?:-([A-Z][a-z]{3}))?(?:-([A-Z]{2}|[0-9]{3}))?$/;

export function parseV2ExactLanguageTagV1(
  value: unknown,
): V2ExactLanguageTagShapeV1 | null {
  if (
    typeof value !== "string" ||
    value.length > V2_EXACT_LANGUAGE_TAG_MAX_BYTES_V1 ||
    value.split("-").length > V2_EXACT_LANGUAGE_TAG_MAX_SUBTAGS_V1
  )
    return null;
  const match = EXACT_LANGUAGE_TAG_RE.exec(value);
  if (!match) return null;
  return Object.freeze({
    primary: match[1],
    script: match[2] ?? null,
    region: match[3] ?? null,
  });
}

export function v2ExactLanguageTagsCompatibleV1(
  targetLanguage: unknown,
  speechLocale: unknown,
): boolean {
  const target = parseV2ExactLanguageTagV1(targetLanguage);
  const speech = parseV2ExactLanguageTagV1(speechLocale);
  return (
    target !== null &&
    speech !== null &&
    target.primary === speech.primary &&
    (target.script === null || target.script === speech.script) &&
    (target.region === null || target.region === speech.region)
  );
}
