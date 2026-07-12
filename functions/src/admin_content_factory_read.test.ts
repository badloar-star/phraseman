import { HttpsError } from 'firebase-functions/v2/https';
import {
  buildContentFactoryJobDetail,
  parseContentFactoryJobDetailRequest,
  parseContentFactoryUnitPreviewRequest,
  parseContentFactoryWorkspaceRequest,
} from './admin_content_factory_read';

describe('Language Factory protected reads', () => {
  it('accepts only bounded job and unit identities', () => {
    expect(parseContentFactoryJobDetailRequest({ jobId: 'job-1' })).toEqual({ jobId: 'job-1' });
    expect(parseContentFactoryUnitPreviewRequest({ unitId: 'job-1__lesson__1' })).toEqual({ unitId: 'job-1__lesson__1' });
    expect(() => parseContentFactoryJobDetailRequest({ jobId: '../escape' })).toThrow(HttpsError);
    expect(() => parseContentFactoryUnitPreviewRequest({ unitId: '' })).toThrow(HttpsError);
  });

  it('normalizes the workspace filters and caps its read size', () => {
    expect(parseContentFactoryWorkspaceRequest({ studyTarget: 'fr', learnerSourceLocale: 'ru', limit: 999 })).toEqual({ studyTarget: 'fr', learnerSourceLocale: 'ru', limit: 100 });
    expect(parseContentFactoryWorkspaceRequest({})).toEqual({ studyTarget: '', learnerSourceLocale: '', limit: 50 });
    expect(() => parseContentFactoryWorkspaceRequest({ studyTarget: 'French' })).toThrow(HttpsError);
  });

  it('sorts units by lesson and canonical surface and preserves the review state', () => {
    const detail = buildContentFactoryJobDetail({
      jobId: 'job-1',
      job: { studyTarget: 'fr', learnerSourceLocale: 'ru', state: 'needs_review' },
      units: [
        { unitId: 'arena-2', lessonId: 2, surface: 'arena' },
        { unitId: 'quiz-1', lessonId: 1, surface: 'quiz' },
        { unitId: 'lesson-1', lessonId: 1, surface: 'lesson' },
      ],
      review: { status: 'approved', reason: 'checked' },
      release: null,
      catalog: { revision: 3 },
    });
    expect(detail.units.map((unit) => unit.unitId)).toEqual(['lesson-1', 'quiz-1', 'arena-2']);
    expect(detail.units.every((unit) => Array.isArray(unit.attemptHistory))).toBe(true);
    expect(detail.review).toEqual({ status: 'approved', reason: 'checked' });
    expect(detail.catalog).toEqual({ revision: 3 });
  });
});
