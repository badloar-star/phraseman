export const LEARNING_LANGUAGE_TARGETS = ['en', 'es', 'fr', 'de'] as const;
export type LearningLanguageTarget = (typeof LEARNING_LANGUAGE_TARGETS)[number];

export type LearningLanguageContour = Readonly<{
  code: LearningLanguageTarget;
  nativeName: string;
  flagGlyph: string;
  speechLocale: 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE';
}>;

export const LEARNING_LANGUAGE_CONTOURS: Readonly<
  Record<LearningLanguageTarget, LearningLanguageContour>
> = Object.freeze({
  en: Object.freeze({ code: 'en', nativeName: 'English', flagGlyph: '🇬🇧', speechLocale: 'en-US' }),
  es: Object.freeze({ code: 'es', nativeName: 'Español', flagGlyph: '🇪🇸', speechLocale: 'es-ES' }),
  fr: Object.freeze({ code: 'fr', nativeName: 'Français', flagGlyph: '🇫🇷', speechLocale: 'fr-FR' }),
  de: Object.freeze({ code: 'de', nativeName: 'Deutsch', flagGlyph: '🇩🇪', speechLocale: 'de-DE' }),
});

export function resolveLearningLanguageContour(value: unknown): LearningLanguageContour | null {
  const code = String(value ?? '').trim().toLowerCase();
  return (LEARNING_LANGUAGE_TARGETS as readonly string[]).includes(code)
    ? LEARNING_LANGUAGE_CONTOURS[code as LearningLanguageTarget]
    : null;
}

export function isLearningLanguageTarget(value: unknown): value is LearningLanguageTarget {
  return resolveLearningLanguageContour(value) !== null;
}

export default function __LearningLanguageContourRouteShim() {
  return null;
}
