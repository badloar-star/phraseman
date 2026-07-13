import { createSurveyDraft, createVoiceResearchState, voiceResearchViewFromCapability } from './admin-voice-research-state.js';

export function createVoiceResearchController(context) {
  const model = () => context.getModel();
  const patch = (value) => context.setModel({ ...model(), ...value });
  const input = (cursor = '', exportCsv = false) => ({ view: model().view, filters: {
    ...model().filters,
    query: String(document.getElementById('voice-query')?.value || model().filters.query || '').trim(),
    rangeDays: Number(document.getElementById('voice-range')?.value || model().filters.rangeDays || 28),
    status: String(document.getElementById('voice-status')?.value || model().filters.status || ''),
    category: String(document.getElementById('voice-category')?.value || model().filters.category || ''),
    reason: String(document.getElementById('voice-reason')?.value || model().filters.reason || ''),
    platform: String(document.getElementById('voice-platform')?.value || model().filters.platform || 'all'),
  }, selectedSurveyId: model().selectedSurveyId, pageSize: 50, cursor, exportCsv });
  async function load(append = false) {
    const request = input(append ? model().nextCursor : ''); patch({ state: 'loading', filters: request.filters, error: '' }); context.render();
    try { const result = await context.actions().getVoiceResearchWorkspace(request); patch({ state: 'ready', workspace: result, items: append ? [...model().items, ...(result.items || [])] : (result.items || []), nextCursor: String(result.nextCursor || ''), error: '' }); }
    catch (error) { patch({ state: 'error', error: context.errorMessage(error) }); throw error; }
    finally { context.render(); }
  }
  async function preview(action, targetId, payload) {
    const reason = String(document.getElementById(`voice-mutation-reason-${targetId}`)?.value || document.getElementById('voice-mutation-reason-survey')?.value || (action === 'idea_decide' ? 'Решение по пользовательской идее' : '')).trim();
    if (!reason) return context.message('Укажите причину изменения.', 'warning');
    const result = await context.actions().previewVoiceResearchMutation({ action, targetId, payload, reason, requestId: context.id('voice-preview') }); patch({ preview: result }); context.render();
  }
  function surveyFromEditor() {
    const surveys = model().workspace?.summary?.surveys || [];
    const selected = surveys.find((row) => row.surveyId === model().selectedSurveyId) || surveys[0];
    const base = structuredClone(model().draft || selected || {}); const value = (id) => String(document.getElementById(id)?.value || '').trim();
    base.questions = [...document.querySelectorAll('.voice-survey-question-editor')].map((node, questionIndex) => {
      const prefix = `voice-survey-question-${questionIndex}`; const type = value(`${prefix}-type`) === 'text' ? 'text' : 'single_choice'; const text = {};
      for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) { const key = lang.replace(/[^a-z0-9]/gi, '-').toLowerCase(); const content = value(`${prefix}-text-${key}`); if (content) text[lang] = content; }
      const options = type === 'text' ? [] : [...node.querySelectorAll('.voice-survey-option-editor')].map((optionNode, optionIndex) => { const optionPrefix = `${prefix}-option-${optionIndex}`; const label = {}; for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) { const key = lang.replace(/[^a-z0-9]/gi, '-').toLowerCase(); const content = value(`${optionPrefix}-label-${key}`); if (content) label[lang] = content; } void optionNode; return { id: value(`${optionPrefix}-id`), label }; });
      return { id: value(`${prefix}-id`), type, text, options };
    });
    base.surveyId = value('voice-survey-id') || base.surveyId; base.enabled = document.getElementById('voice-survey-enabled')?.checked === true; base.rewardShards = Number(value('voice-survey-reward') || 3); base.minDaysBetweenSurveys = Number(value('voice-survey-cooldown') || 7); base.accentColor = value('voice-survey-accent');
    base.audience = { ...(base.audience || {}), tier: value('voice-survey-tier') || 'any', minLessons: value('voice-survey-min-lessons') === '' ? null : Number(value('voice-survey-min-lessons')), maxLessons: value('voice-survey-max-lessons') === '' ? null : Number(value('voice-survey-max-lessons')), platforms: ['ios', 'android'].filter((platform) => document.getElementById(`voice-survey-${platform}`)?.checked) };
    const langs = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']; base.title = {}; base.subtitle = {};
    for (const lang of langs) { const key = lang.replace(/[^a-z0-9]/gi, '-').toLowerCase(); const title = value(`voice-survey-title-${key}`); const subtitle = value(`voice-survey-subtitle-${key}`); if (title) base.title[lang] = title; if (subtitle) base.subtitle[lang] = subtitle; }
    base.finalScreen = { ...(base.finalScreen || {}), title: { ...(base.finalScreen?.title || {}), ru: value('voice-survey-final-title') }, subtitle: { ...(base.finalScreen?.subtitle || {}), ru: value('voice-survey-final-subtitle') } };
    return base;
  }
  function ideaPayload(target) {
    const ideaId = target.dataset.targetId; const decision = target.dataset.voiceDecision;
    const field = (name) => String(document.getElementById(`voice-idea-${ideaId}-${name}`)?.value || '').trim();
    return { decision, titleRu: field('title-ru'), titleUk: field('title-uk'), titleEs: field('title-es'), messageRu: field('message-ru'), messageUk: field('message-uk'), messageEs: field('message-es') };
  }
  return {
    reset(view = 'ideas') { context.setModel(createVoiceResearchState(view)); },
    selectCapability(id) { const view = voiceResearchViewFromCapability(id); if (model().view !== view) this.reset(view); },
    async maybeLoad() { if (context.route() === 'voice-research' && context.authorized() && model().state === 'idle') await load(false); },
    async handle(action, target) {
      if (!action?.startsWith('voice-')) return false;
      try {
        if (action === 'voice-load') await load(false);
        else if (action === 'voice-next') await load(true);
        else if (action === 'voice-set-view') { this.reset(target.dataset.voiceView); await load(false); }
        else if (action === 'voice-select-survey') { patch({ selectedSurveyId: target.dataset.surveyId || '', draft: null, draftMode: null, items: [], nextCursor: '' }); await load(false); }
        else if (action === 'voice-export') { const cursor = model().workspace?.snapshotCursor; if (!cursor) return context.message('Сначала загрузите снимок.', 'warning'); const result = await context.actions().getVoiceResearchWorkspace(input(cursor, true)); context.download(`phraseman-voice-${model().view}.csv`, `\uFEFF${result.csv || ''}`); }
        else if (action === 'voice-draft-idea') { const toneHint = String(document.getElementById(`voice-idea-${target.dataset.targetId}-tone`)?.value || '').trim(); const result = await context.actions().draftIdeaDecision({ ideaId: target.dataset.targetId, decision: target.dataset.voiceDecision, toneHint, requestId: context.id('voice-idea-draft') }); const lang = String(result.lang || 'ru').toLowerCase().split('-')[0]; const suffix = ['uk', 'es'].includes(lang) ? lang : 'ru'; const field = document.getElementById(`voice-idea-${target.dataset.targetId}-message-${suffix}`); if (field) field.value = result.message || ''; context.message('AI-черновик добавлен в поле языка пользователя. Проверьте и отредактируйте его.', 'success'); }
        else if (action === 'voice-preview-idea') await preview('idea_decide', target.dataset.targetId, ideaPayload(target));
        else if (action === 'voice-preview-survey-create') { const survey = surveyFromEditor(); if (survey) await preview('survey_create', survey.surveyId, survey); }
        else if (action === 'voice-preview-survey-update') { const survey = surveyFromEditor(); if (survey) await preview('survey_update', target.dataset.targetId, { survey }); }
        else if (action === 'voice-preview-survey-toggle') await preview('survey_toggle', target.dataset.targetId, { enabled: target.dataset.enabled === 'true' });
        else if (action === 'voice-preview-survey-delete') await preview('survey_delete', target.dataset.targetId, {});
        else if (action === 'voice-preview-survey-restore') { const history = (model().workspace?.summary?.deletedSurveys || []).find((row) => row.targetId === target.dataset.targetId); if (!history?.before) return context.message('Безопасная предыдущая конфигурация не найдена.', 'warning'); await preview('survey_restore', target.dataset.targetId, { survey: history.before }); }
        else if (action === 'voice-discard-preview') { patch({ preview: null }); context.render(); }
        else if (action === 'voice-apply-preview') { const current = model().preview; const confirmation = String(document.getElementById('voice-confirmation')?.value || '').trim(); if (!current || confirmation !== current.confirmation) return context.message('Точное подтверждение не совпадает.', 'warning'); const key = current.fingerprint || current.previewId; const operationKeys = { ...model().operationKeys, [key]: model().operationKeys[key] || context.id('voice-operation') }; patch({ operationKeys }); await context.actions().applyVoiceResearchMutation({ previewId: current.previewId, confirmation, reason: current.reason, requestId: context.id('voice-apply'), idempotencyKey: operationKeys[key] }); patch({ preview: null, draft: null, draftMode: null }); await load(false); }
        else if (action === 'voice-new-survey') { patch({ draft: createSurveyDraft(), draftMode: 'create', selectedSurveyId: '' }); context.render(); }
        else if (action === 'voice-survey-add-question' || action === 'voice-survey-remove-question' || action === 'voice-survey-add-option' || action === 'voice-survey-remove-option') {
          const survey = surveyFromEditor(); if (!survey) return true; const questions = [...(survey.questions || [])]; const qi = Number(target.dataset.questionIndex); const oi = Number(target.dataset.optionIndex);
          if (action === 'voice-survey-add-question') questions.push({ id: `question_${questions.length + 1}`, type: 'single_choice', text: { ru: '' }, options: [{ id: 'option_1', label: { ru: '' } }, { id: 'option_2', label: { ru: '' } }] });
          if (action === 'voice-survey-remove-question' && questions.length > 1) questions.splice(qi, 1);
          if (action === 'voice-survey-add-option') questions[qi]?.options?.push({ id: `option_${questions[qi].options.length + 1}`, label: { ru: '' } });
          if (action === 'voice-survey-remove-option' && questions[qi]?.options?.length > 2) questions[qi].options.splice(oi, 1);
          survey.questions = questions; patch({ draft: survey, draftMode: model().draftMode || 'update' }); context.render();
        }
      } catch (error) {
        context.message(`Операция не выполнена: ${context.errorMessage(error)}`, 'warning');
        if (model().state === 'loading') patch({ state: model().workspace ? 'ready' : 'error', error: context.errorMessage(error) });
        context.render();
      }
      return true;
    },
  };
}
