import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('OpenAI runtime cost controls', () => {
  test('Theo sessions render local greetings and do not call OpenAI before the first user turn', () => {
    const scenario = read('app/ai_dialog_session.tsx');
    const companion = read('app/ai_companion_session.tsx');

    expect(scenario).toContain('LOCAL_SCENARIO_GREETING');
    expect(companion).toContain('LOCAL_COMPANION_GREETING');
    expect(scenario).not.toContain('(start the conversation with your greeting)');
    expect(companion).not.toContain('sendToTheo(null, [])');
    expect(companion).not.toContain('(start the conversation: greet me warmly');
  });

  test('weekly review and stats insights are generated from local templates, not paid callables', () => {
    const weekly = read('app/weekly_review_client.ts');
    const stats = read('app/stats_insights_client.ts');

    expect(weekly).toContain('buildLocalWeeklyReview');
    expect(stats).toContain('buildLocalStatsInsights');
    expect(weekly).not.toContain("weeklyReviewGenerate'");
    expect(weekly).not.toContain('"weeklyReviewGenerate"');
    expect(stats).not.toContain("statsInsightsGenerate'");
    expect(stats).not.toContain('"statsInsightsGenerate"');
  });

  test('legacy pronunciation OpenAI callable is no longer exported from Cloud Functions', () => {
    const index = read('functions/src/index.ts');

    expect(index).not.toContain('pronunciation_scoring');
    expect(index).not.toContain('scorePronunciationAttempt');
  });

  test('Theo runtime defaults to the cheapest GPT-4.1 nano model and records the exact model billed', () => {
    const premiumDialog = read('functions/src/premium_dialog.ts');
    const modelConfig = read('functions/src/openai_dialog_model_config.ts');

    expect(premiumDialog).toContain("const MODEL_DEFAULT = 'gpt-4.1-nano'");
    expect(premiumDialog).toContain('process.env.OPENAI_DIALOG_MODEL');
    expect(premiumDialog).toContain('resolveConfiguredDialogModel');
    expect(premiumDialog).toContain('const dialogModel = await resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL);');
    expect(premiumDialog).toContain('model: dialogModel');
    expect(modelConfig).toContain('ALLOWED_DIALOG_MODELS');
    expect(modelConfig).toContain('admin_runtime_config');
    expect(modelConfig).toContain('openAiDialogModelConfig');
    expect(modelConfig).toContain('request.auth?.token?.admin');
  });

  test('high-risk dev OpenAI batch scripts require an explicit spend guard', () => {
    for (const rel of [
      'scripts/generate_audio.mjs',
      'scripts/regen_phrase_audio.mjs',
      'tools/generate_venga_openai_audio.py',
      'tools/generate_chains_unique_v3_openai_audio.py',
    ]) {
      expect(read(rel)).toContain('PHRASEMAN_ALLOW_OPENAI_DEV_SPEND');
    }
  });

  test('admin has an OpenAI budget dashboard backed by billing collections', () => {
    const adminHtml = read('admin/index.html');
    const budgetFn = read('functions/src/openai_budget_dashboard.ts');

    expect(adminHtml).toContain("switchTab('openai-budget')");
    expect(adminHtml).toContain('id="tab-openai-budget"');
    expect(adminHtml).toContain('OPENAI_MODEL_PRICES');
    expect(adminHtml).toContain('loadOpenAiBudgetDashboard');
    expect(adminHtml).toContain("httpsCallable(functionsUs, 'openAiBudgetDashboard')");
    expect(adminHtml).toContain("httpsCallable(functionsUs, 'openAiDialogModelConfig')");
    expect(adminHtml).toContain('id="openai-dialog-model"');
    expect(adminHtml).toContain('saveOpenAiDialogModel');
    expect(budgetFn).toContain("request.auth?.token?.admin");
    expect(budgetFn).toContain("openAiBudgetSafeGetDocs('premium_dialog_billing'");
    expect(budgetFn).toContain("openAiBudgetSafeGetDocs('explain_billing'");
    expect(budgetFn).toContain("openAiBudgetSafeGetDocs('weekly_review_billing'");
    expect(budgetFn).toContain("openAiBudgetSafeGetDocs('stats_insights_billing'");
    expect(adminHtml).toContain('OpenAI estimated month');
  });
});
