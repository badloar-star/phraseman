import fs from 'fs';
import path from 'path';

describe('dialogue completion assessment screen', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'DialogVerdictScreen.tsx'),
    'utf8',
  );

  it('keeps a transcript-grounded completion summary visible even while the AI review falls back', () => {
    // A network failure must not turn the terminal screen into a bare
    // "review unavailable" notice: the session already has an honest,
    // transcript-derived completion summary to show.
    expect(source).toContain("const hasCompletionAssessment = Boolean(review?.assessment?.trim());");
    expect(source).toContain("review?.fallback === true");
    expect(source).toContain("ru: 'Итог переписки'");
    expect(source).toContain('{completionAssessment}');
  });

  it('does not replace the already available completion assessment with a loading skeleton', () => {
    // The local, transcript-grounded assessment is set before the asynchronous
    // review request. "Always" means it remains readable during that request,
    // rather than disappearing behind the review skeleton.
    expect(source).toContain("reviewStatus === 'loading' && !hasCompletionAssessment");
    expect(source).toContain("reviewStatus === 'loading' && hasCompletionAssessment");
  });

  it('does not call the detailed review unavailable while that review is still loading', () => {
    expect(source).toContain("reviewStatus !== 'loading' && completionFeedbackMode === 'review_unavailable'");
    expect(source).toContain("reviewStatus === 'loading' && hasCompletionAssessment ? null");
  });

  it('keeps the generated partner takeaway inspectable through evidence and score', () => {
    expect(source).toContain("ru: 'Итог от собеседника'");
    expect(source).toContain("ru: 'На чём основан итог'");
    expect(source).toContain("ru: 'из 100'");
  });

  it('renders every validated V2 scenario task in the terminal assessment when supplied', () => {
    expect(source).toContain('const completionObjectiveResults = review?.objectiveResults ?? [];');
    expect(source).toContain("ru: 'Итоги задач'");
    expect(source).toContain('completionObjectiveResults.map((result) => (');
    expect(source).toContain("result.status === 'met'");
  });

  it('confirms a saved dialogue branch only for a Plus-safe V2 checkpoint receipt', () => {
    expect(source).toContain("review?.v2Memory?.scenarioCheckpointStored === true && !locked");
    expect(source).toContain("ru: 'Ветка диалога сохранена'");
    expect(source).toContain('backgroundColor: t.bgCard');
  });
});
