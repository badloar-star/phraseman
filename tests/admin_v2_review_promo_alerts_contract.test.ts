import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin v2 Plus survey and Telegram alerts migration', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const router = read('admin/v2/scripts/admin-router.js');
  const capabilities = read('admin/v2/scripts/admin-capabilities.js');
  const functionsIndex = read('functions/src/index.ts');
  const survey = read('functions/src/admin_vip_survey_control.ts');
  const alerts = read('functions/src/admin_alerts_control.ts');
  const rules = read('firestore.rules');
  const legacy = read('admin/index.html');

  test('routes both legacy capabilities to dedicated native screens', () => {
    expect(capabilities).toContain("'review-promo': 'review-promo'");
    expect(capabilities).toContain("alerts: 'alerts'");
    expect(router).toContain("'review-promo': 'review-promo'");
    expect(router).toContain("alerts: 'alerts'");
    expect(core).toContain("'review-promo': renderReviewPromo");
    expect(core).toContain('alerts: renderAlerts');
    expect(legacy).toContain("window.location.href = './v2/index.html#review-promo'");
    expect(legacy).toContain("window.location.href = './v2/index.html#alerts'");
    expect(legacy).toContain("window.location.href = './v2/index.html?openUser=' + encodeURIComponent(uid) + '#users'");
  });

  test('wires every protected survey and alerts callable into the interface', () => {
    for (const name of [
      'adminGetVipSurveyWorkspace', 'adminListVipSurveyResponses', 'adminPreviewVipSurveyCampaign', 'adminApplyVipSurveyCampaign',
      'adminGetAlertsWorkspace', 'adminPreviewAlertsConfig', 'adminApplyAlertsConfig', 'adminPreviewAlertTest', 'adminQueueAlertTest',
      'adminPreviewManualAccess', 'adminApplyManualAccess',
    ]) {
      expect(functionsIndex).toContain(name);
      expect(firebase).toContain(name);
    }
    for (const action of [
      'preview-vip-survey-activate', 'preview-vip-survey-deactivate', 'apply-vip-survey',
      'preview-alerts-config', 'apply-alerts-config', 'preview-alert-test', 'queue-alert-test',
      'preview-manual-plus', 'apply-manual-plus',
    ]) expect(core).toContain(`action === '${action}'`);
  });

  test('keeps fixed survey semantics, explicit versions and eight independent locales', () => {
    expect(survey).toContain("audience: 'free'");
    expect(survey).toContain("surveyId: 'vip_feedback_v2'");
    expect(survey).toContain('rewardDays: 30');
    expect(survey).toContain('allVersions');
    expect(survey).toContain('targetAppVersions');
    expect(survey).toContain("['ru', 'uk', 'es', 'ptBr', 'vi', 'id', 'tr', 'pl']");
    expect(core).toContain("es: ['¿Quieres recibir un mes de Plus?'");
  });

  test('keeps browser writes blocked and Telegram history redacted', () => {
    expect(rules).toContain("docId != 'alerts'");
    expect(rules).toContain("request.resource.data.kind != 'vip_survey'");
    expect(rules).toMatch(/match \/vip_survey_responses\/\{userId\}[\s\S]*?allow create, update, delete: if false;/);
    expect(rules).toContain('match /admin_alerts_history/{docId} { allow read, write: if false; }');
    expect(rules).toContain('match /admin_manual_access_previews/{docId} { allow read, write: if false; }');
    expect(alerts).toContain('maskAlertsChatId');
    expect(alerts).toContain('projectAlertsConfig');
    expect(alerts).not.toContain('secrets: [OPENAI_API_KEY]');
  });
});
