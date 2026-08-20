import type { SessionSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';
import { introRunsPlainTextV1 } from '../modules/learning-v2/content/intro_semantic_runs_v1';
import { EPISODE_01_SESSION_MAP_V1 } from '../modules/learning-v2/content/source/episode_01_session_map_v1';
import { APPROVED_FIRST_TEN_CANDIDATE_SHA_V2 } from '../modules/learning-v2/content/source/approved_first_ten_source_v2';
import type { LearningV2IntroTextRunV1 } from '../modules/learning-v2/content/intro_semantic_runs_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

const localizedText = (
  value: Record<string, unknown>,
  locale: (typeof LOCALES)[number],
): string => String(value[locale] ?? (value.rest as Record<string, unknown> | undefined)?.[locale] ?? '');

const localizedRuns = (
  value: Record<string, unknown>,
  locale: (typeof LOCALES)[number],
) =>
  (value[locale] ?? (value.rest as Record<string, unknown> | undefined)?.[locale]) as
    | readonly LearningV2IntroTextRunV1[]
    | undefined;

export function assertApprovedFirstTenSession(
  source: SessionSource,
  ordinal: number,
): void {
  expect(source.requiredSessionOrdinal).toBe(ordinal);
  expect(source.generationInputFingerprint).toBe(
    APPROVED_FIRST_TEN_CANDIDATE_SHA_V2,
  );
  expect(EPISODE_01_SESSION_MAP_V1[ordinal - 1].sessionOrdinal).toBe(ordinal);
  expect(source.introPages.map((page) => page.kind)).toEqual([
    'concept',
    'formula',
    'trap',
  ]);
  expect(source.phrases).toHaveLength(15);
  expect(new Set(source.phrases.map((phrase) => phrase.id)).size).toBe(15);
  expect(new Set(source.phrases.map((phrase) => phrase.english)).size).toBe(15);

  for (const field of [source.title, source.summary, source.learningGoal]) {
    for (const locale of LOCALES)
      expect(localizedText(field as unknown as Record<string, unknown>, locale).trim()).not.toBe('');
  }

  for (const page of source.introPages) {
    for (const locale of LOCALES) {
      const body = localizedText(
        page.body as unknown as Record<string, unknown>,
        locale,
      );
      const runs = localizedRuns(
        page.bodyRuns as unknown as Record<string, unknown>,
        locale,
      );
      expect(body.length).toBeGreaterThanOrEqual(300);
      expect(runs).toBeDefined();
      expect(introRunsPlainTextV1(runs ?? [])).toBe(body);
      expect(runs?.some((run) => run.semantic === 'targetCorrect')).toBe(true);
      for (const field of [
        page.title,
        page.question.prompt,
        page.question.explanation,
        ...page.question.choices,
      ]) {
        expect(
          localizedText(field as unknown as Record<string, unknown>, locale).trim(),
        ).not.toBe('');
      }
    }
  }

  for (const phrase of source.phrases) {
    expect(phrase.localizedDetails).toBeDefined();
    expect(phrase.words.map((word) => word.correct).join(' ')).toBe(
      phrase.english,
    );
    for (const locale of LOCALES) {
      const details = phrase.localizedDetails?.[locale];
      expect(details?.meaning.trim()).not.toBe('');
      expect(details?.explanation.length).toBeGreaterThanOrEqual(80);
      expect(details?.words).toHaveLength(phrase.words.length);
      for (const word of details?.words ?? []) {
        expect(word.distractors).toHaveLength(5);
        expect(new Set(word.distractors.map((item) => item.value)).size).toBe(5);
      }
    }
  }

  const shard = buildSessionShardFromSource(source);
  expect(() =>
    validateLearningV2GeneratedSessionShardV1(shard, {
      packageId: source.packageId,
      targetLanguage: source.targetLanguage,
      episodeOrdinal: source.episodeOrdinal,
      requiredSessionOrdinal: source.requiredSessionOrdinal,
      generationInputFingerprint: source.generationInputFingerprint,
    }),
  ).not.toThrow();
  expect(JSON.stringify(shard)).not.toContain('[[NEEDS_TRANSLATION]]');
  expect(source.phrases.map((phrase) => phrase.english).join('\n')).not.toMatch(
    /^(?:he|she|it|we|they)\b/im,
  );

  if (ordinal === 1) {
    const hot = source.phrases.find((phrase) => phrase.english === 'I am hot');
    expect(hot?.localizedDetails?.ru.meaning).toBe('Мне жарко');
    expect(JSON.stringify(hot)).not.toContain('Я мне жарко');
  }
}
