// Жалоба 23.10 №11: старая ошибка «Неправильных глаголов» без подписи формы — «Уходить/оставлять» с ответом Left.
import { irregularVerbLegacyPromptV1 } from '../app/irregular_verb_form_caption';

describe('irregular verb legacy prompt', () => {
  it('restores the asked form from the task id for old mistakes only', () => {
    expect(irregularVerbLegacyPromptV1({ sourceKind: 'irregular_verb', sourceId: 'leave:past', sourceMeaning: 'уходить / оставлять', sourcePrompt: null }, 'ru'))
      .toBe('уходить / оставлять — прошлое');
    expect(irregularVerbLegacyPromptV1({ sourceKind: 'irregular_verb', sourceId: 'go:pp', sourceMeaning: 'йти' }, 'uk')).toBe('йти — дієприкметник');
    // новая ошибка уже несёт подпись — не трогаем
    expect(irregularVerbLegacyPromptV1({ sourceKind: 'irregular_verb', sourceId: 'leave:past', sourceMeaning: 'x', sourcePrompt: 'x — прошлое' }, 'ru')).toBeNull();
    // чужой источник и непонятный id — прежний вид
    expect(irregularVerbLegacyPromptV1({ sourceKind: 'flashcard', sourceId: 'leave:past', sourceMeaning: 'x' }, 'ru')).toBeNull();
    expect(irregularVerbLegacyPromptV1({ sourceKind: 'irregular_verb', sourceId: 'leave', sourceMeaning: 'x' }, 'ru')).toBeNull();
  });
});
