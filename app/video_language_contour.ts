import type { LearningLanguageTarget } from './learning_language_contour';

export type VideoLanguageChannel = Readonly<{
  id: string;
  languageTags: readonly string[];
  order: number;
}>;

function languageBase(value: string): string {
  return value.trim().replace(/_/g, '-').toLowerCase().split('-')[0] ?? '';
}

/**
 * A video channel is eligible only when it explicitly declares the active
 * learning target. Returning null is intentional: callers show a preparing
 * state rather than substituting an English channel.
 */
export function resolveVideoChannelForStudyTarget<T extends VideoLanguageChannel>(
  channels: readonly T[],
  target: LearningLanguageTarget,
): T | null {
  return channels
    .filter((channel) => channel.languageTags.some((tag) => languageBase(tag) === target))
    .slice()
    .sort((left, right) => left.order - right.order)[0] ?? null;
}

export default function __VideoLanguageContourRouteShim() {
  return null;
}
