import { buildLearningV2CourseWorkspaceProjectionV1 } from './learning_v2_course_workspace_projection';

const stage = (kind: string, revision: number, state: string, overrides: Record<string, unknown> = {}) => ({
  id: `course:${kind}:r${revision}`,
  kind,
  revision,
  state,
  artifactId: `artifact:course:${kind}:r${revision}`,
  contentHash: String(revision).repeat(64).slice(0, 64),
  ...overrides,
});

const input = (stageDocuments: readonly unknown[], historyIncomplete = false) => ({
  requestId: 'learning-v2-en-v1',
  studyTarget: 'en',
  sourceLocale: 'multi',
  scopeId: 'course-en',
  stageDocuments,
  historyIncomplete,
});

describe('LearningV2CourseWorkspaceProjectionV1', () => {
  it('never turns generic approved stages into release authority', () => {
    const kinds = [
      'learning_v2_research', 'learning_v2_curriculum', 'learning_v2_lesson_outline',
      'learning_v2_localized_course', 'learning_v2_audio', 'learning_v2_quality_assurance',
      'learning_v2_release',
    ];
    const projection = buildLearningV2CourseWorkspaceProjectionV1(input(kinds.map((kind) => stage(kind, 1, 'approved'))));
    expect(projection.rollups.every((rollup) => rollup.approvalState === 'verified')).toBe(true);
    expect(projection.rollups.every((rollup) => rollup.releaseAuthority === false)).toBe(true);
    expect(projection.releaseEligible).toBe(false);
    expect(projection.publicationPolicy).toBe('draft_only_no_consumer');
    expect(projection.blockers).toContain('canonical_content_studio_authority_missing');
    expect(projection.curriculumScience.proficiencyCertification).toBe('none');
  });

  it('separates approved baseline from a newer working revision', () => {
    const projection = buildLearningV2CourseWorkspaceProjectionV1(input([
      stage('learning_v2_research', 1, 'approved'),
      stage('learning_v2_research', 2, 'needs_review'),
    ]));
    const research = projection.rollups[0];
    expect(research.approvedBaseline?.revision).toBe(1);
    expect(research.latestWorkingRevision?.revision).toBe(2);
    expect(research.approvalState).toBe('stale');
    expect(projection.blockers).toContain('rollup_not_current:learning_v2_research');
  });

  it('keeps exact locale and voice matrices fail-closed', () => {
    const projection = buildLearningV2CourseWorkspaceProjectionV1(input([
      stage('learning_v2_localized_course', 1, 'approved'),
      stage('learning_v2_audio', 1, 'approved'),
    ]));
    expect(projection.locales.map((row) => row.locale)).toEqual(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
    expect(projection.locales.every((row) => row.specialistReviewState === 'missing')).toBe(true);
    expect(projection.audio.voices).toEqual(['ash', 'onyx', 'nova', 'coral']);
    expect(projection.audio.manifestState).toBe('invalid');
    expect(projection.audio.assetBytesState).toBe('missing');
  });

  it('reports truncated or hostile history instead of synthesizing readiness', () => {
    let getterCalled = false;
    const hostile = Object.create(Object.prototype, {
      id: { enumerable: true, value: 'hostile' },
      kind: { enumerable: true, get() { getterCalled = true; return 'learning_v2_research'; } },
    });
    const projection = buildLearningV2CourseWorkspaceProjectionV1(input([hostile], true));
    expect(getterCalled).toBe(false);
    expect(projection.history).toMatchObject({ historyIncomplete: true, invalidStageCount: 1 });
    expect(projection.blockers).toEqual(expect.arrayContaining(['stage_history_incomplete', 'stage_metadata_invalid']));
    expect(projection.releaseEligible).toBe(false);
  });

  it('enforces the bounded 100-document summary input', () => {
    expect(() => buildLearningV2CourseWorkspaceProjectionV1(input(Array.from({ length: 101 }, (_, index) =>
      stage('learning_v2_research', index + 1, 'approved'))))).toThrow('learning_v2_workspace_projection_input_invalid');
  });
});
