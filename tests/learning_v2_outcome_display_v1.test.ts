// Владелец 25.10, вариант A («умение + пример»): под «Чему научишься» не показываем служебную цель фабрики (латиница, «+»,
// формула в кавычках, «используя», «как сказать») — до переписывания целей показываем название сцены занятия.
import {
  isLearningV2ServiceOutcomeV1,
  learningV2OutcomeDisplayV1,
  learningV2OutcomeHeadingKindV1,
} from '../app/learning_v2_outcome_display_v1';

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('показ цели занятия под «Чему научишься»', () => {
  it('служебные цели фабрики узнаются', () => {
    expect(isLearningV2ServiceOutcomeV1('как сказать, какой человек или предмет, используя `he/she/it + is`.')).toBe(true);
    expect(isLearningV2ServiceOutcomeV1('present perfect + already')).toBe(true);
    expect(isLearningV2ServiceOutcomeV1('говорить об умениях с can и спрашивать Can you…?')).toBe(true);
    expect(isLearningV2ServiceOutcomeV1('Говорить, какой человек')).toBe(false);
  });

  it('хорошая цель показывается как есть', () => {
    expect(learningV2OutcomeDisplayV1({ lessonOrdinal: 1, sessionOrdinal: 9, outcome: 'Говорить, какой человек', lang: 'ru' })).toBe('Говорить, какой человек');
  });

  it('служебная цель заменяется названием сцены занятия, формула не показывается', () => {
    const shown = learningV2OutcomeDisplayV1({ lessonOrdinal: 1, sessionOrdinal: 9, outcome: 'как сказать, какой человек или предмет, используя `he/she/it + is`.', lang: 'ru' });
    expect(shown).toBe('Найдите высокого участника');
    expect(shown).not.toMatch(/\+|`|используя/u);
  });

  it('заголовок всегда «Чему научишься»', () => {
    expect(learningV2OutcomeHeadingKindV1('understand')).toBe('learn');
    expect(learningV2OutcomeHeadingKindV1('learn')).toBe('learn');
  });
});
