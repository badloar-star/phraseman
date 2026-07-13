export const VOICE_RESEARCH_VIEWS = Object.freeze(['ideas', 'ideas-decided', 'surveys', 'onboarding-sources', 'cancel-surveys']);

export function createVoiceResearchState(view = 'ideas') {
  return {
    state: 'idle', view: VOICE_RESEARCH_VIEWS.includes(view) ? view : 'ideas', items: [], workspace: null,
    nextCursor: '', filters: { status: '', category: '', reason: '', query: '', rangeDays: 28, platform: 'all' },
    selectedSurveyId: '', preview: null, draft: null, error: '', operationKeys: {},
  };
}

export function createSurveyDraft() {
  return {
    surveyId: '', enabled: false, title: { ru: '' }, subtitle: { ru: '' }, rewardShards: 3,
    minDaysBetweenSurveys: 7, audience: { tier: 'any', minLessons: null, maxLessons: null, platforms: [] },
    questions: [{ id: 'question_1', type: 'single_choice', text: { ru: '' }, options: [{ id: 'option_1', label: { ru: '' } }, { id: 'option_2', label: { ru: '' } }] }],
    accentColor: '', finalScreen: { title: { ru: 'Спасибо!' }, subtitle: { ru: 'Награда начислена.' } },
  };
}

export function voiceResearchViewFromCapability(id) {
  return VOICE_RESEARCH_VIEWS.includes(id) ? id : 'ideas';
}
