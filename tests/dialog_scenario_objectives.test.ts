import {
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
});
