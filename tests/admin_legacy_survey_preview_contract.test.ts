import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const liveAdmin = fs.readFileSync(path.join(root, 'admin', 'v2', 'legacy.html'), 'utf8');
const functionsIndex = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
const surveyServer = fs.readFileSync(path.join(root, 'functions', 'src', 'shard_survey.ts'), 'utf8');
const surveyClient = fs.readFileSync(path.join(root, 'app', 'survey_client.ts'), 'utf8');
// зачем: D70 — жемчуг за ответ снят, раздел переименован в «Опросы»; якорь следует за заголовком.
const surveySectionStart = liveAdmin.indexOf('// Опросы (shard-survey');
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

  // зачем (04.10): награда «1 осколок за опрос» снята в 2.0 вместе с осколками (PM-289) — сторож удалён.

  test('ships the owner-selected 63-poll preset library into the live admin editor', () => {
    expect(surveyMarkup).toContain('id="ss-preset-library"');
    // зачем: Q3 (координатор 01.10) — опросы про XP/Арену/Лигу удалены из библиотеки (63 → 54);
    // PM-168 — ещё «Идеи» (1) и руны/жемчуг (62, 63): 54 → 51.
    expect(surveyMarkup).toContain('Библиотека 51 опроса');
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

  // зачем: Q3 (координатор 01.10) — XP (D02), Арена (D83) и Лига (D54) удалены:
  // их опросы и переходы убраны из библиотеки и белого списка. Порядок ротации
  // живых документов (SHARD_SURVEY_PRESET_IDS, 63) не трогаем.
  test('library has no XP/Arena/League presets and no routes into deleted sections', () => {
    const match = liveAdmin.match(/const SHARD_SURVEY_PRESETS =\s*(\[[\s\S]*?\n  \]);\s*\n  const SS_SURVEY_ACTION_ROUTES/);
    expect(match).not.toBeNull();
    const presets = JSON.parse(match![1]) as Array<{ id: number }>;
    expect(presets).toHaveLength(51);
    const ids = presets.map((preset) => preset.id);
    for (const removed of [1, 10, 11, 50, 53, 56, 58, 60, 61, 62, 63, 64]) expect(ids).not.toContain(removed);
    const text = JSON.stringify(presets);
    expect(text).not.toMatch(/Арен|Лиг|XP/u);
    expect(text).not.toContain('/(tabs)/arena');
    expect(text).not.toContain('/club_screen');
    const routes = liveAdmin.slice(liveAdmin.indexOf('const SS_SURVEY_ACTION_ROUTES'), liveAdmin.indexOf('function ssPrepareOptionActionForSave'));
    expect(routes).not.toContain("'/(tabs)/arena'");
    expect(routes).not.toContain("'/club_screen'");
    expect(surveyClient).not.toContain("'/(tabs)/arena'");
    expect(surveyClient).not.toContain("'/club_screen'");
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
