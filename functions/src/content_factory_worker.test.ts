import { HttpsError } from 'firebase-functions/v2/https';
import { parseGenerationUnitRequest } from './content_factory_worker';
import { parseSourceRegistryReference } from './content_factory/source_registry';

describe('content factory unit runner request', () => {
  it('accepts one bounded canonical generation unit', () => {
    expect(parseGenerationUnitRequest({ jobId: 'job-1', surface: 'lesson', lessonId: 3 })).toEqual({ jobId: 'job-1', surface: 'lesson', lessonId: 3 });
  });

  it('rejects unsupported or unsafe units', () => {
    expect(() => parseGenerationUnitRequest({ jobId: '../escape', surface: 'lesson', lessonId: 1 })).toThrow(HttpsError);
    expect(() => parseGenerationUnitRequest({ jobId: 'job', surface: 'theory', lessonId: 1 })).toThrow(HttpsError);
    expect(() => parseGenerationUnitRequest({ jobId: 'job', surface: 'quiz', lessonId: 1 })).toThrow(HttpsError);
    expect(() => parseGenerationUnitRequest({ jobId: 'job', surface: 'lesson', lessonId: 101 })).toThrow(HttpsError);
  });

  it('requires an explicit immutable blueprint reference', () => {
    expect(parseSourceRegistryReference('english-core-32:v1')).toEqual({ blueprintId: 'english-core-32', version: 'v1' });
    expect(() => parseSourceRegistryReference('en-v1')).toThrow('source_registry_reference_invalid');
  });
});
