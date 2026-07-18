import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const legacy = fs.readFileSync(path.join(root, 'admin', 'legacy.html'), 'utf8');
const surveySectionStart = legacy.indexOf('// Опросы за осколки (shard-survey)');
const surveySectionEnd = legacy.indexOf('const REWARD_TYPES', surveySectionStart);
const surveySection = legacy.slice(surveySectionStart, surveySectionEnd);

describe('legacy shard survey protected mutation workflow', () => {
  test('uses Voice Research preview/apply callables instead of the disabled direct writer', () => {
    expect(surveySectionStart).toBeGreaterThanOrEqual(0);
    expect(surveySectionEnd).toBeGreaterThan(surveySectionStart);
    expect(surveySection).toContain("'adminPreviewVoiceResearchMutation'");
    expect(surveySection).toContain("'adminApplyVoiceResearchMutation'");
    expect(surveySection).not.toContain("'adminWriteShardSurvey'");
  });

  test('previews, confirms, and idempotently applies every exposed mutation', () => {
    expect(surveySection).toContain('async function ssPreviewAndApplySurveyMutation');
    expect(surveySection).toContain('showConfirmModal');
    expect(surveySection).toContain('previewId: preview.previewId');
    expect(surveySection).toContain('confirmation: preview.confirmation');
    expect(surveySection).toContain('idempotencyKey: `survey-${preview.fingerprint}`.slice(0, 180)');
    expect(surveySection).toContain("'survey_toggle'");
    expect(surveySection).toContain("_ssEditingIsNew ? 'survey_create' : 'survey_update'");
    expect(surveySection).toContain("action === 'survey_create' ? survey : { survey }");
  });
});
