import fs from 'fs';
import path from 'path';

const root = process.cwd();

describe('admin VIP survey contract', () => {
  const html = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
  const appMessagesSource = fs.readFileSync(path.join(root, 'app', 'app_messages.ts'), 'utf8');
  const inboxSource = fs.readFileSync(path.join(root, 'components', 'AppMessagesInbox.tsx'), 'utf8');
  const callableSource = fs.readFileSync(path.join(root, 'functions', 'src', 'vip_survey.ts'), 'utf8');
  const indexSource = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
  const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');

  it('rewrites the old Review promo admin surface into a VIP survey campaign', () => {
    expect(html).toContain('💚 Plus survey');
    expect(html).toContain('sendVipSurveyCampaign');
    expect(html).toContain("kind: 'vip_survey'");
    expect(html).toContain('vip_survey_responses');
    expect(html).toContain('loadVipSurveyResponses');
    expect(html).toContain("VIP_SURVEY_ID = 'vip_feedback_v2'");
    expect(html).toContain('one_thing_week');
    expect(html).toContain('Что улучшить на этой неделе');
    expect(html).toContain('feature_request');
    expect(html).toContain('friend_recommendation');
    expect(html).toContain('Что помогает учиться лучше всего');
    expect(html).toContain('Какой экран перегружен');
    expect(html).toContain('Только full free tier');
    expect(html).toContain("const audience = 'free'");
    expect(html).toContain('Plus-пользователи не увидят');
    expect(html).not.toContain('не влияет на награду');
    expect(html).not.toContain('Store-review');
    expect(html).not.toContain('sendReviewPromoModal');
    expect(html).not.toContain("kind: 'review_promo'");
  });

  it('routes VIP survey inbox messages to the in-app survey modal and local dismissal', () => {
    expect(appMessagesSource).toContain("export type AppMessageKind = 'message' | 'poll' | 'vip_survey'");
    expect(appMessagesSource).toContain("if (message.kind === 'vip_survey') return !hasPremiumAccess");
    expect(appMessagesSource).toContain('dismissAppMessage');
    expect(appMessagesSource).toContain('dismissedAtMs');
    expect(inboxSource).toContain('VipSurveyModal');
    expect(inboxSource).toContain('VipCelebrationModal');
    expect(inboxSource).toContain('VipSurveyReviewPromptModal');
    expect(inboxSource).toContain("message.kind === 'vip_survey'");
    expect(inboxSource).toContain('const { hasPremiumAccess } = usePremium()');
    expect(inboxSource).toContain('if (hasPremiumAccess) {');
    expect(inboxSource).toContain('dismissSurveyMessage(message.id)');
    expect(inboxSource).toContain('setVisible(false)');
    expect(inboxSource).toContain('setTimeout(() => {');
    expect(inboxSource).toContain('event.stopPropagation?.()');
    expect(inboxSource).toContain('numberOfLines={messageRead ? 1 : 2}');
    expect(inboxSource).toContain('messageMetaRow');
  });

  it('has a callable, deploy target, and rules for one-time VIP survey grants', () => {
    expect(callableSource).toContain('export const submitVipSurvey');
    expect(callableSource).toContain('export const recordVipSurveyReviewClick');
    expect(callableSource).toContain('vip_survey_responses');
    expect(callableSource).toContain("VIP_SURVEY_ID = 'vip_feedback_v2'");
    expect(callableSource).toContain("'one_thing_week'");
    expect(callableSource).toContain("'feature_request'");
    expect(callableSource).toContain("'friend_recommendation'");
    expect(callableSource).toContain('textOnly: true');
    expect(callableSource).toContain("optionId: 'comment'");
    expect(callableSource).toContain('existingVipGranted');
    expect(callableSource).toContain('hasPremiumOrVipAccess(progress, nowMs)');
    expect(callableSource).toContain('vip_survey_free_tier_required');
    expect(callableSource).toContain("vip_plan: vipPlan");
    expect(indexSource).toContain("require('./vip_survey')");
    expect(indexSource).toContain('exports.submitVipSurvey = submitVipSurvey');
    expect(indexSource).toContain('exports.recordVipSurveyReviewClick = recordVipSurveyReviewClick');
    expect(rules).toContain('match /vip_survey_responses/{userId}');
  });
});
