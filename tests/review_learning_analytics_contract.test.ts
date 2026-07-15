import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const reviewSource = fs.readFileSync(path.join(root, 'app/review.tsx'), 'utf8');
const governance = JSON.parse(fs.readFileSync(path.join(root, 'app/product_analytics_governance.json'), 'utf8')) as {
  events: { name: string }[];
};

describe('review learning analytics integration contract', () => {
  it('governs explicit review session lifecycle and answer events', () => {
    expect(governance.events.map((event) => event.name)).toEqual(expect.arrayContaining([
      'learning_review_session_start',
      'learning_review_answer',
      'learning_review_session_complete',
      'learning_review_session_abandoned',
    ]));
  });

  it('emits an answer only from the persisted privacy-safe transition', () => {
    expect(reviewSource).toContain("trackEvent('learning_review_answer'");
    expect(reviewSource).toMatch(/markReviewed\([\s\S]*?\.then\(\(transition\)[\s\S]*?buildLearningReviewAnswerPayload/);
    expect(reviewSource).not.toMatch(/buildLearningReviewAnswerPayload\(\{[\s\S]{0,300}phrase\s*:/);
  });

  it('keeps one review attempt closed until the next card is loaded', () => {
    expect(reviewSource).toContain('reviewAttemptIdRef.current = makeReviewAttemptId()');
    const finishCard = reviewSource.slice(
      reviewSource.indexOf('const finishCard = useCallback'),
      reviewSource.indexOf('const onWordBankTap'),
    );
    expect(finishCard).not.toContain('checkingRef.current = false;\n  },');
  });

  it('waits for pending persistence before either terminal session event reads counters', () => {
    const abandoned = reviewSource.slice(
      reviewSource.indexOf("trackEvent('learning_review_session_abandoned'" ) - 700,
      reviewSource.indexOf("trackEvent('learning_review_session_abandoned'" ) + 800,
    );
    const completed = reviewSource.slice(
      reviewSource.indexOf("trackEvent('learning_review_session_complete'" ) - 700,
      reviewSource.indexOf("trackEvent('learning_review_session_complete'" ) + 800,
    );
    expect(abandoned).toContain('Promise.all');
    expect(completed).toContain('Promise.all');
  });
});
