import fs from 'fs';
import path from 'path';

const root = process.cwd();

describe('admin VIP survey contract', () => {
  // 04.10: admin/legacy.html удалена снимком efe19ae9d — рабочая админка admin/v2/legacy.html.
  const html = fs.readFileSync(path.join(root, 'admin', 'v2', 'legacy.html'), 'utf8');
  const launchSource = fs.readFileSync(path.join(root, 'functions', 'src', 'admin_app_messages.ts'), 'utf8');
  const appMessagesSource = fs.readFileSync(path.join(root, 'app', 'app_messages.ts'), 'utf8');
  const inboxSource = fs.readFileSync(path.join(root, 'components', 'AppMessagesInbox.tsx'), 'utf8');
  const callableSource = fs.readFileSync(path.join(root, 'functions', 'src', 'vip_survey.ts'), 'utf8');
  const indexSource = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
  const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');

  it('has a callable, deploy target, and rules for one-time VIP survey grants', () => {
    expect(callableSource).toContain('export const submitVipSurvey');
    expect(callableSource).toContain('export const recordVipSurveyReviewClick');
    expect(callableSource).toContain('vip_survey_responses');
    // 04.10: id опроса вынесен в общий контракт.
    expect(callableSource).toContain("import { VIP_SURVEY_ID, VIP_SURVEY_REWARD_DAYS } from './vip_survey_contract'");
    expect(fs.readFileSync(path.join(root, 'functions', 'src', 'vip_survey_contract.ts'), 'utf8')).toContain("VIP_SURVEY_ID = 'vip_feedback_v2'");
    expect(callableSource).toContain("'one_thing_week'");
    expect(callableSource).toContain("'feature_request'");
    expect(callableSource).toContain("'friend_recommendation'");
    expect(callableSource).toContain('textOnly: true');
    expect(callableSource).toContain("optionId: 'comment'");
    expect(callableSource).toContain('existingVipGranted');
    expect(callableSource).toContain('hasPremiumOrVipAccess(progress, nowMs)');
    expect(callableSource).toContain('vip_survey_free_tier_required');
    expect(callableSource).toContain("vip_plan: vipPlan");
    expect(indexSource).toContain('require("./vip_survey")');
    expect(indexSource).toContain('exports.submitVipSurvey = submitVipSurvey');
    expect(indexSource).toContain('exports.recordVipSurveyReviewClick = recordVipSurveyReviewClick');
    expect(rules).toContain('match /vip_survey_responses/{userId}');
  });

  // Решение владельца 04.10: просьбу об отзыве после опроса вернуть (снята снимком 95eec1717).
});
