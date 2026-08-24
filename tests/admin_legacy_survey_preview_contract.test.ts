import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const liveAdmin = fs.readFileSync(path.join(root, 'admin', 'v2', 'legacy.html'), 'utf8');
const functionsIndex = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
const surveyServer = fs.readFileSync(path.join(root, 'functions', 'src', 'shard_survey.ts'), 'utf8');
const surveyClient = fs.readFileSync(path.join(root, 'app', 'survey_client.ts'), 'utf8');
const surveySectionStart = liveAdmin.indexOf('// Опросы за осколки (shard-survey)');
const surveySectionEnd = liveAdmin.indexOf('const REWARD_TYPES', surveySectionStart);
const surveySection = liveAdmin.slice(surveySectionStart, surveySectionEnd);
const executableSurveySection = surveySection.replace(/^\s*\/\/.*$/gm, '');

describe('live admin shard survey connection', () => {
  test('binds the live admin editor to the callable that the server exports', () => {
    expect(surveySectionStart).toBeGreaterThanOrEqual(0);
    expect(surveySectionEnd).toBeGreaterThan(surveySectionStart);
    expect(executableSurveySection).toContain("httpsCallable(functionsUs, 'adminWriteShardSurvey')");
    expect(executableSurveySection).not.toContain("'adminPreviewVoiceResearchMutation'");
    expect(executableSurveySection).not.toContain("'adminApplyVoiceResearchMutation'");
    expect(functionsIndex).toContain('adminWriteShardSurvey,');
    expect(functionsIndex).toContain('exports.adminWriteShardSurvey = adminWriteShardSurvey;');
    expect(surveyServer).toContain('export const adminWriteShardSurvey = onCall');
    expect(surveyServer).toContain("request.auth?.token?.admin !== true");
  });

  test('confirms before create, update, or toggle reaches the server', () => {
    expect(surveySection).toContain('async function ssPreviewAndApplySurveyMutation');
    expect(surveySection).toContain('showConfirmModal');
    expect(surveySection).toContain('if (!confirmed) return null;');
    expect(surveySection).toContain('writeFn({ survey })');
    expect(surveySection).toContain("'survey_toggle'");
    expect(surveySection).toContain("_ssEditingIsNew ? 'survey_create' : 'survey_update'");
    expect(surveySection).toContain("action === 'survey_create' ? survey : { survey }");
    expect(surveySection.indexOf('showConfirmModal')).toBeLessThan(surveySection.indexOf('writeFn({ survey })'));
  });

  test('uses one collection contract from admin save through client delivery', () => {
    expect(surveyServer).toContain("const SURVEYS = 'shard_surveys';");
    expect(surveyServer).toContain("db.collection(SURVEYS).where('enabled', '==', true).get()");
    expect(surveyServer).toContain('db.collection(SURVEYS).doc(parsed.surveyId)');
    expect(functionsIndex).toContain('exports.getActiveShardSurvey = getActiveShardSurvey;');
    expect(surveyClient).toContain("'getActiveShardSurvey'");
  });

  test('keeps the live editor honest about the server-fixed one-shard reward', () => {
    expect(surveyServer).toContain('const SURVEY_SHARD_AMOUNT = 1;');
    expect(surveySection).toContain('rewardShards: 1');
    expect(surveySection).toContain('prepared.rewardShards = 1;');
    expect(surveySection).toContain('1 осколок за завершение');
    expect(surveySection).not.toContain('rewardShards: 3');
    expect(surveySection).not.toContain("_ssSet('rewardShards'");
  });
});
