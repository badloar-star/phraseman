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
const surveyMarkupStart = liveAdmin.indexOf('<div id="tab-surveys"');
const surveyMarkupEnd = liveAdmin.indexOf('<!-- ══ Paywall A/B эксперимент', surveyMarkupStart);
const surveyMarkup = liveAdmin.slice(surveyMarkupStart, surveyMarkupEnd);

describe('live admin shard survey connection', () => {
  test('exposes a daily survey workstation instead of a raw settings stack', () => {
    expect(surveyMarkupStart).toBeGreaterThanOrEqual(0);
    expect(surveyMarkupEnd).toBeGreaterThan(surveyMarkupStart);
    expect(surveyMarkup).toContain('id="ss-daily-workspace"');
    expect(surveyMarkup).toContain('id="ss-today-card"');
    expect(surveyMarkup).toContain('id="ss-results-panel"');
    expect(surveyMarkup).toContain('id="ss-survey-list"');
    expect(surveyMarkup).toContain('Создать опрос на сегодня');
    expect(surveyMarkup).toContain('Сегодня');
  });

  test('isolates the survey page from legacy header and light-theme overrides', () => {
    expect(surveyMarkup).toContain('<div class="ss-head">');
    expect(surveyMarkup).not.toContain('<header class="ss-head">');
    expect(surveyMarkup).toContain('--ss-primary:#2563eb');
    expect(surveyMarkup).toContain('#tab-surveys .ss-primary{');
    expect(surveyMarkup).toContain('background:var(--ss-primary)!important');
    expect(surveyMarkup).toContain('#tab-surveys .ss-panel-title{');
    expect(surveyMarkup).toContain('color:var(--ss-text)!important');
    expect(surveyMarkup).toContain('@media(max-width:760px)');
  });

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

  test('ships the owner-selected 63-poll preset library into the live admin editor', () => {
    expect(surveyMarkup).toContain('id="ss-preset-library"');
    expect(surveyMarkup).toContain('Библиотека 63 опросов');
    expect(surveySection).toContain('const SHARD_SURVEY_PRESETS =');
    expect(surveySection).toContain('window.openShardSurveyPreset');
    expect(surveySection).toContain('business theme must not be mentioned');
    expect(surveySection).toContain('phrase of the day has no mini task');

    const idsLiteral = surveySection.match(/const SHARD_SURVEY_PRESET_IDS = \[([^\]]+)]/);
    expect(idsLiteral).not.toBeNull();
    const ids = idsLiteral![1].split(',').map((value) => Number(value.trim())).filter(Number.isFinite);
    expect(ids).toHaveLength(63);
    expect(new Set(ids).size).toBe(63);
    expect(ids).toEqual(expect.arrayContaining([1, 2, 3, 5, 7, 37, 65, 74, 81, 100]));
  });

  test('keeps preset actions allowlisted and preserves them when preparing a draft', () => {
    expect(surveySection).toContain("kind: 'store_review'");
    expect(surveySection).toContain("kind: 'app_route'");
    expect(surveySection).toContain('action: ssPrepareOptionActionForSave(o.action)');
    expect(surveyServer).toContain('action: o.action');
  });

  test('opens the aggregate result summary and keeps raw responses collapsed as secondary details', () => {
    expect(surveyMarkup).toContain('Открыть результаты');
    expect(surveyMarkup).toContain('onclick="window.ssSelectTodaySurvey && window.ssSelectTodaySurvey()"');
    expect(surveyMarkup).toContain('<details id="ss-feed-panel"');
    expect(surveyMarkup).toContain('Комментарии и ответы');
    expect(surveySection).toContain('window.ssScrollToResults = function ssScrollToResults()');
    expect(surveySection).toContain("document.getElementById('ss-results-panel')");
    expect(surveySection).toContain('await window.ssSelectSurveyRow(surveyId);');
    expect(surveySection).toContain('window.ssScrollToResults();');
    expect(surveySection).not.toContain('window.ssScrollToFeed();');
  });
});
