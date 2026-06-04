import { readFileSync } from 'fs';
import path from 'path';
import {
  buildGavanDay1ReleaseEvidence,
  buildGavanDay1ReleaseFixture,
  validateGavanDay1ReleaseFixture,
} from '../app/personal_plan_gavan_day1_release_fixture';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';
import { buildGavanDay1PackageDraft } from '../app/personal_plan_gavan_day1_package_draft';
import { buildPlaceholderPlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import { buildBlockedPlanPronunciationScoringRequirement } from '../app/personal_plan_pronunciation_readiness';

describe('Gavan day 1 release fixture', () => {
  it('approves candidate content while keeping audio and pronunciation honestly not required', () => {
    const fixture = buildGavanDay1ReleaseFixture();
    const validation = validateGavanDay1ReleaseFixture(fixture);

    expect(fixture.kind).toBe('candidate_release_gate');
    expect(fixture.liveIntegration).toBe(false);
    expect(fixture.draft.content.source).toBe('candidate');
    expect(fixture.bridge.content.approval).toBe('approved');
    expect(fixture.bridge.audio.status).toBe('not_required');
    expect(fixture.bridge.pronunciation.status).toBe('not_required');
    expect(fixture.bridge.production.canRelease).toBe(true);
    expect(validation.valid).toBe(true);
    expect(validation.issues).toEqual([]);
  });

  it('exposes every release section and the final production decision', () => {
    const fixture = buildGavanDay1ReleaseFixture();

    expect(fixture.release.sections).toEqual([
      'content',
      'package',
      'quiz',
      'copy',
      'audio',
      'pronunciation',
    ]);
    expect(fixture.release.productionCanRelease).toBe(true);
    expect(fixture.release.blockedSections).toEqual([]);
    expect(fixture.release.acceptedNotRequiredSections).toEqual(['audio', 'pronunciation']);
  });

  it('builds reviewer-friendly release evidence for every section', () => {
    const evidence = buildGavanDay1ReleaseEvidence();

    expect(evidence.kind).toBe('candidate_release_evidence');
    expect(evidence.dayId).toBe('gavan-week1-day1');
    expect(evidence.liveIntegration).toBe(false);
    expect(evidence.decision).toEqual({
      label: 'go',
      canRelease: true,
      blockedSections: [],
      acceptedNotRequiredSections: ['audio', 'pronunciation'],
    });
    expect(evidence.candidate).toEqual(expect.objectContaining({
      contentSource: 'candidate',
      phraseCount: 5,
      quizItemCount: 10,
      taskReasonCopies: expect.any(Number),
      contentQualityValid: true,
    }));
    expect(evidence.sections.map((section) => section.section)).toEqual([
      'content',
      'package',
      'quiz',
      'copy',
      'audio',
      'pronunciation',
    ]);
    expect(evidence.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        section: 'content',
        status: 'ready',
        required: true,
        issueCodes: [],
      }),
      expect.objectContaining({
        section: 'audio',
        status: 'not_required',
        required: false,
        acceptedNotRequired: true,
        issueCodes: [],
      }),
      expect.objectContaining({
        section: 'pronunciation',
        status: 'not_required',
        required: false,
        acceptedNotRequired: true,
        issueCodes: [],
      }),
    ]));
  });

  it('shows blocked release evidence with exact issue codes', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    draft.quizDraft.items[0].prompt = 'DEV placeholder';
    draft.personalization.taskReasonCopy.valid = false;
    draft.personalization.taskReasonCopy.issues.push({
      code: 'developer_copy',
      reasonId: 'reason_bad',
      detail: 'Developer copy leaked.',
    });

    const evidence = buildGavanDay1ReleaseEvidence(
      buildGavanDay1ReleaseFixture({ draft }),
    );

    expect(evidence.decision.label).toBe('hold');
    expect(evidence.decision.canRelease).toBe(false);
    expect(evidence.decision.blockedSections).toEqual(expect.arrayContaining([
      'package',
      'quiz',
      'copy',
    ]));
    expect(evidence.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        section: 'quiz',
        status: 'blocked',
        issueCodes: expect.arrayContaining(['candidate_quiz_developer_copy']),
      }),
      expect.objectContaining({
        section: 'copy',
        status: 'blocked',
        issueCodes: expect.arrayContaining(['developer_copy']),
      }),
    ]));
  });

  it('keeps reviewer evidence copy samples free from developer wording', () => {
    const evidence = buildGavanDay1ReleaseEvidence();
    const copyPreview = evidence.copyPreview
      .map((item) => `${item.label} ${item.body}`)
      .join(' ');

    expect(evidence.copyPreview.length).toBeGreaterThan(0);
    expect(copyPreview).not.toMatch(/DEV|debug|sourcePhraseId|contentUnit|renderer|active recall/i);
    expect(copyPreview).not.toMatch(/[\u00d0\u00d1\u00c2\u00e2]/);
  });

  it('fails when the content candidate is invalid', () => {
    const contentCandidate = buildGavanDay1ContentCandidate();
    contentCandidate.phrases[0].english = '';

    const fixture = buildGavanDay1ReleaseFixture({ contentCandidate });
    const validation = validateGavanDay1ReleaseFixture(fixture);

    expect(fixture.bridge.production.canRelease).toBe(false);
    expect(validation.valid).toBe(false);
    expect(validation.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid_content_candidate' }),
      expect.objectContaining({ code: 'package_not_ready' }),
    ]));
  });

  it('fails when candidate content contains mojibake or corrupted Cyrillic copy', () => {
    const contentCandidate = buildGavanDay1ContentCandidate();
    contentCandidate.phrases[0].russian =
      '\u00d0\u00af \u00d0\u00b7\u00d0\u00b4\u00d0\u00b5\u00d1\u0081\u00d1\u008c.';

    const fixture = buildGavanDay1ReleaseFixture({ contentCandidate });
    const validation = validateGavanDay1ReleaseFixture(fixture);

    expect(validation.valid).toBe(false);
    expect(validation.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid_content_candidate' }),
      expect.objectContaining({ code: 'package_not_ready' }),
    ]));
  });

  it('fails when package quiz copy audio and pronunciation gates are broken', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    const blockId = draft.blocks[1].id;
    draft.explanationRequirements = [];
    draft.quizDraft.items[0].prompt = 'DEV placeholder';
    draft.personalization.taskReasonCopy.valid = false;
    draft.personalization.taskReasonCopy.issues.push({
      code: 'developer_copy',
      reasonId: 'reason_bad',
      detail: 'Developer copy leaked.',
    });
    draft.readinessInput.audioRequirementsByBlockId[blockId] = buildPlaceholderPlanAudioAsset({
      blockId,
      contentUnitIds: ['gavan-day1-final-p1'],
      targetText: 'Hi, I am here.',
    });
    draft.readinessInput.pronunciationRequirementsByExerciseId['gavan-day1-pronunciation'] =
      buildBlockedPlanPronunciationScoringRequirement({
        exerciseId: 'gavan-day1-pronunciation',
        blockId: 'gavan-day1:block-pronunciation',
        contentUnitIds: ['gavan-day1-final-p1'],
        targetText: 'Hi, I am here.',
      });

    const fixture = buildGavanDay1ReleaseFixture({ draft });
    const validation = validateGavanDay1ReleaseFixture(fixture);

    expect(validation.valid).toBe(false);
    expect(validation.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'package_not_ready' }),
      expect.objectContaining({ code: 'quiz_not_ready' }),
      expect.objectContaining({ code: 'copy_not_ready' }),
      expect.objectContaining({ code: 'audio_not_ready' }),
      expect.objectContaining({ code: 'pronunciation_not_ready' }),
      expect.objectContaining({ code: 'production_not_releasable' }),
    ]));
    expect(fixture.release.blockedSections).toEqual(expect.arrayContaining([
      'package',
      'quiz',
      'copy',
      'audio',
      'pronunciation',
    ]));
  });

  it('remains outside live catalog and live quiz registry', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'app', 'personal_plan_gavan_day1_release_fixture.ts'),
      'utf8',
    );

    expect(source).not.toContain("from './personal_plan_catalog'");
    expect(source).not.toContain("from './personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
