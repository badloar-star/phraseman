import {
  getPublicDialogScenarios,
  getScenarioById,
  scenarioObjectives,
  scenarioTemperament,
  temperamentStartMood,
  type DialogScenario,
} from '../app/ai_dialog_scenarios';

describe('scenarioObjectives — под-цели из goalEn или явные', () => {
  it('coffee: goalEn разбивается на 3 под-цели с галочными id', () => {
    const coffee = getScenarioById('coffee')!;
    const objs = scenarioObjectives(coffee);
    expect(objs.length).toBeGreaterThanOrEqual(2);
    expect(objs.length).toBeLessThanOrEqual(4);
    for (const o of objs) {
      expect(o.id.length).toBeGreaterThan(0);
      expect(o.labelRu.length).toBeGreaterThan(0);
    }
    // id-слаги уникальны
    const ids = objs.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('явные objectives переопределяют вывод', () => {
    const fake: DialogScenario = {
      ...getScenarioById('coffee')!,
      objectives: [{ id: 'only_one', labelRu: 'Единственная цель' }],
    };
    expect(scenarioObjectives(fake)).toEqual([{ id: 'only_one', labelRu: 'Единственная цель' }]);
  });

  it('РЕГРЕСС «4 одинаковых пункта»: НИ ОДИН сценарий каталога не даёт дублей меток', () => {
    // Баг: при рассинхроне числа частей goalRu/goalEn КАЖДАЯ под-цель получала
    // меткой целиком goalRu → финальный модал показывал 4 одинаковые строки
    // (скриншот юзера, сценарий mistaken_celebrity).
    for (const scenario of getPublicDialogScenarios()) {
      const objs = scenarioObjectives(scenario);
      const labels = objs.map((o) => o.labelRu.trim().toLowerCase());
      expect(new Set(labels).size).toBe(labels.length);
      const ids = objs.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('mistaken_celebrity (сценарий со скриншота) имеет осмысленные различные под-цели', () => {
    const scenario = getScenarioById('mistaken_celebrity')!;
    const objs = scenarioObjectives(scenario);
    expect(objs.length).toBeGreaterThanOrEqual(2);
    const labels = objs.map((o) => o.labelRu);
    expect(new Set(labels).size).toBe(labels.length);
    // Метка под-цели — НЕ вся цель сценария целиком.
    for (const label of labels) {
      expect(label).not.toBe(scenario.goalRu);
    }
  });

  it('режиссёрские указания из второго предложения goalEn не становятся под-целями', () => {
    const base = getScenarioById('coffee')!;
    const scripted: DialogScenario = {
      ...base,
      objectives: undefined,
      goalEn: 'The learner must order tea and ask the price. Reward clear phrasing; if the learner is vague, push back.',
      goalRu: 'Закажи чай и спроси цену',
    };
    const objs = scenarioObjectives(scripted);
    for (const o of objs) {
      expect(o.en ?? '').not.toMatch(/reward|push back/i);
      // Служебный префикс «The learner must» из метки вычищен.
      expect(o.labelRu).not.toMatch(/^the learner/i);
    }
  });
});

describe('scenarioTemperament — характер из persona или явный', () => {
  it('бариста (тёплая) → высокое терпение', () => {
    const coffee = getScenarioById('coffee')!;
    const temp = scenarioTemperament(coffee);
    expect(temp.patience).toBe('high');
    expect(temp.warmth).toBe('warm');
  });

  it('явный temperament переопределяет', () => {
    const fake: DialogScenario = {
      ...getScenarioById('coffee')!,
      temperament: { patience: 'low', warmth: 'cold' },
    };
    expect(scenarioTemperament(fake)).toEqual({ patience: 'low', warmth: 'cold' });
  });

  it('temperamentStartMood: высокое+тёплое выше низкого', () => {
    const high = temperamentStartMood({ patience: 'high', warmth: 'warm' });
    const low = temperamentStartMood({ patience: 'low', warmth: 'cold' });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(100);
    expect(low).toBeGreaterThanOrEqual(0);
  });

  it('H8: regex с границами слов НЕ ловит подстроки (airline ≠ нетерпеливый)', () => {
    const base = getScenarioById('coffee')!;
    const airline: DialogScenario = {
      ...base,
      temperament: undefined,
      role: 'an airline check-in agent',
      persona: 'You are a calm, helpful airline check-in agent.',
      setting: 'an airline check-in desk',
    };
    // 'line' внутри 'airline' больше НЕ делает агента нетерпеливым (patience low).
    expect(scenarioTemperament(airline).patience).not.toBe('low');
  });

  it('H9: пустой/односложный goalEn не выключает игру молча', () => {
    const base = getScenarioById('coffee')!;
    const empty: DialogScenario = { ...base, objectives: undefined, goalEn: '', goalRu: '' };
    const single: DialogScenario = { ...base, objectives: undefined, goalEn: 'Ask', goalRu: 'Спроси' };
    expect(scenarioObjectives(empty).length).toBeGreaterThan(0);
    expect(scenarioObjectives(single).length).toBeGreaterThan(0);
  });
});
