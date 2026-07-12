import { normalizeVipSurveyCampaign, parseVipSurveyResponseRequest, projectVipSurveyResponse } from './admin_vip_survey_control';

const translations = Object.fromEntries(['ru', 'uk', 'es', 'ptBr', 'vi', 'id', 'tr', 'pl'].map((lang) => [lang, { title: `${lang} title`, body: `${lang} body` }]));

describe('admin VIP survey control', () => {
  test('normalizes eight explicit locales and server-fixed survey invariants', () => {
    const value = normalizeVipSurveyCampaign({
      campaignId: 'vip-feedback-july-2026', allVersions: false, targetAppVersions: ['1.5.50', '1.5.51'], priority: 30, ttlDays: 7, translations,
    });
    expect(value).toMatchObject({ campaignId: 'vip-feedback-july-2026', allVersions: false, targetAppVersions: ['1.5.50', '1.5.51'], priority: 30, ttlDays: 7, audience: 'free', surveyId: 'vip_feedback_v2', rewardDays: 30 });
    expect(value.translations.es.title).toBe('es title');
    expect(value.translations).toHaveProperty('ptBr');
  });

  test('rejects missing locales, implicit version scope and invalid ids', () => {
    expect(() => normalizeVipSurveyCampaign({ campaignId: 'valid-campaign', allVersions: false, targetAppVersions: [], translations })).toThrow('target_versions_required');
    expect(() => normalizeVipSurveyCampaign({ campaignId: 'bad id!', allVersions: true, translations })).toThrow('invalid_campaign_id');
    const incomplete = { ...translations }; delete incomplete.pl;
    expect(() => normalizeVipSurveyCampaign({ campaignId: 'valid-campaign', allVersions: true, translations: incomplete })).toThrow('missing_translation:pl');
  });

  test('bounds response filters and redacts unrelated user data', () => {
    expect(parseVipSurveyResponseRequest({ filter: 'review_yes', query: ' TEST ', pageSize: 999 })).toEqual({ filter: 'review_yes', query: 'test', pageSize: 100, cursor: '' });
    const row = projectVipSurveyResponse('response-1', { uid: 'stable-1', platform: 'ios', answers: { feature_request: { comment: 'Dark mode' } }, token: 'secret' }, { name: 'Ada', email: 'ada@example.com', progress: { vip_active: 'true', authToken: 'secret' } }, 100);
    expect(row).toMatchObject({ id: 'response-1', uid: 'stable-1', name: 'Ada', email: 'ada@example.com', currentVipActive: true });
    expect(row).not.toHaveProperty('token');
    expect(row).not.toHaveProperty('progress');
  });
});
