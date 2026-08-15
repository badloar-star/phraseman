import { buildGenerationStagePlan } from './stage_service';
import {
  LEARNING_V2_GENERATION_INTERFACE_LOCALES,
  LEARNING_V2_GENERATION_REQUIRED_CONTENT_KINDS,
  extractLearningV2ApprovedSessionOutlineSegment,
  validateLearningV2GenerationArtifact,
} from './learning_v2_generation_artifacts';

const localized = (label: string) => Object.fromEntries(
  LEARNING_V2_GENERATION_INTERFACE_LOCALES.map((locale) => [locale, { title: `${label}-${locale}` }]),
);

const localizedCourseArtifact = () => ({
  stage: 'learning_v2_localized_course',
  result: {
    packageId: 'course-en-v1',
    targetLanguage: 'en',
    approvalStage: 'localized_content',
    interfaceLocales: [...LEARNING_V2_GENERATION_INTERFACE_LOCALES],
    localizedContent: localized('whole-course'),
    requiredContentKinds: [...LEARNING_V2_GENERATION_REQUIRED_CONTENT_KINDS],
    artifacts: LEARNING_V2_GENERATION_REQUIRED_CONTENT_KINDS.map((kind, index) => ({
      artifactId: `artifact-${String(index + 1).padStart(2, '0')}`,
      kind,
      sequenceOrdinal: index + 1,
      contentByLocale: localized(kind),
      introducesConceptIds: index === 3 ? ['concept-to-be'] : [],
      usesConceptIds: index >= 3 ? ['concept-to-be'] : [],
      dependsOnArtifactIds: index === 0 ? [] : [`artifact-${String(index).padStart(2, '0')}`],
    })),
  },
});

const lessonOutlineArtifact = () => ({
  stage: 'learning_v2_lesson_outline',
  result: {
    packageId: 'course-en-v1', targetLanguage: 'en', approvalStage: 'lesson_outline',
    interfaceLocales: [...LEARNING_V2_GENERATION_INTERFACE_LOCALES], localizedContent: localized('outline'),
    sectors: Array.from({ length: 4 }, (_, index) => ({ ordinal: index + 1 })),
    episodes: Array.from({ length: 32 }, (_, episodeIndex) => {
      const ordinal = episodeIndex + 1;
      const episodeId = `episode-${String(ordinal).padStart(2, '0')}`;
      return {
        ordinal, episodeId, sectorOrdinal: Math.ceil(ordinal / 8), cefrBand: ordinal <= 4 ? 'PRE_A1' : 'A1',
        canDoOutcomeId: `outcome-e${ordinal}`, title: `Episode ${ordinal} approved teaching outline`, sectorExamAfter: ordinal % 8 === 0,
        sessions: Array.from({ length: 12 }, (_, sessionIndex) => {
          const sessionOrdinal = sessionIndex + 1;
          return {
            ordinal: sessionOrdinal,
            sessionTemplateId: `${episodeId}:session-${String(sessionOrdinal).padStart(2, '0')}`,
            canDoOutcomeId: `outcome-e${ordinal}-s${sessionOrdinal}`,
            focusConceptIds: [`concept-e${ordinal}-s${sessionOrdinal}`], prerequisiteConceptIds: [],
            teachingBrief: `Teach the approved concept for episode ${ordinal}, session ${sessionOrdinal}.`,
            practiceBrief: `Practise the approved concept with cumulative support for session ${sessionOrdinal}.`,
            assessmentBrief: `Check independent use of the approved concept in session ${sessionOrdinal}.`,
          };
        }),
      };
    }),
    exams: Array.from({ length: 4 }, (_, index) => ({ afterEpisodeOrdinal: (index + 1) * 8 })),
  },
});

describe('Learning V2 stages inside the canonical Generation Queue', () => {
  test('requires an approved predecessor before the next owner-review stage can be queued', () => {
    const research = buildGenerationStagePlan({
      requestId: 'learning-v2-en-v1', kind: 'learning_v2_research', studyTarget: 'en', sourceLocale: 'multi',
      cefr: 'PRE_A1', scopeId: 'course-en', schemaVersion: 2, promptVersion: 'v2', count: 1,
      qaPolicy: 'learning-v2-course-quality-v1', revision: 1, approvedPrerequisites: [],
    });
    expect(research.unit.kind).toBe('learning_v2_research');
    expect(() => buildGenerationStagePlan({
      requestId: 'learning-v2-en-v1', kind: 'learning_v2_curriculum', studyTarget: 'en', sourceLocale: 'multi',
      cefr: 'PRE_A1', scopeId: 'course-en', schemaVersion: 2, promptVersion: 'v2', count: 1,
      qaPolicy: 'learning-v2-course-quality-v1', revision: 1,
      approvedPrerequisites: [{ kind: 'learning_v2_research', artifactId: research.unit.artifactId, state: 'needs_review' }],
    })).toThrow('generation_stage_prerequisite_unapproved:learning_v2_research');
    expect(() => buildGenerationStagePlan({
      requestId: 'learning-v2-en-v1', kind: 'learning_v2_curriculum', studyTarget: 'en', sourceLocale: 'multi',
      cefr: 'PRE_A1', scopeId: 'course-en', schemaVersion: 2, promptVersion: 'v2', count: 1,
      qaPolicy: 'learning-v2-course-quality-v1', revision: 1,
      approvedPrerequisites: [{ kind: 'learning_v2_research', artifactId: research.unit.artifactId, state: 'approved' }],
    })).not.toThrow();
  });

  test('accepts the complete all-locales pedagogical package and rejects a missing language', () => {
    const artifact = localizedCourseArtifact();
    expect(validateLearningV2GenerationArtifact(artifact, { kind: 'learning_v2_localized_course', targetLanguage: 'en' })).toEqual([]);
    const { pl: _missing, ...withoutPolish } = artifact.result.artifacts[8].contentByLocale;
    const broken = {
      ...artifact,
      result: {
        ...artifact.result,
        artifacts: artifact.result.artifacts.map((entry, index) => index === 8 ? { ...entry, contentByLocale: withoutPolish } : entry),
      },
    };
    expect(validateLearningV2GenerationArtifact(broken, { kind: 'learning_v2_localized_course', targetLanguage: 'en' }))
      .toContain('learning_v2_localized_course_invalid');
  });

  test('rejects a generated task that uses a concept before it is taught', () => {
    const artifact = localizedCourseArtifact();
    const broken = {
      ...artifact,
      result: {
        ...artifact.result,
        artifacts: artifact.result.artifacts.map((entry, index) => index === 0 ? { ...entry, usesConceptIds: ['concept-unseen'] } : entry),
      },
    };
    expect(validateLearningV2GenerationArtifact(broken, { kind: 'learning_v2_localized_course', targetLanguage: 'en' }))
      .toContain('learning_v2_localized_course_invalid');
  });

  test('requires an approved 12-session segment for every one of the 32 episodes', () => {
    const artifact = lessonOutlineArtifact();
    expect(validateLearningV2GenerationArtifact(artifact, { kind: 'learning_v2_lesson_outline', targetLanguage: 'en' })).toEqual([]);
    const broken = {
      ...artifact,
      result: { ...artifact.result, episodes: artifact.result.episodes.map((episode, index) => index === 0
        ? { ...episode, sessions: episode.sessions.slice(0, 11) }
        : episode) },
    };
    expect(validateLearningV2GenerationArtifact(broken, { kind: 'learning_v2_lesson_outline', targetLanguage: 'en' }))
      .toContain('learning_v2_e1_e32_outline_invalid');
  });

  test('extracts only the exact approved session segment for the bounded content runner', () => {
    const artifact = lessonOutlineArtifact();
    const segment = extractLearningV2ApprovedSessionOutlineSegment(artifact, {
      packageId: 'course-en-v1', targetLanguage: 'en', episodeOrdinal: 2, sessionOrdinal: 3,
    });
    expect(segment).toMatchObject({
      ordinal: 3,
      sessionTemplateId: 'episode-02:session-03',
      canDoOutcomeId: 'outcome-e2-s3',
    });
    expect(Object.isFrozen(segment)).toBe(true);
    expect(() => extractLearningV2ApprovedSessionOutlineSegment(artifact, {
      packageId: 'course-en-v1', targetLanguage: 'en', episodeOrdinal: 2, sessionOrdinal: 13,
    })).toThrow('learning_v2_outline_session_segment_invalid');
  });
});
