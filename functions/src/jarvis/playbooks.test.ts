import {
  PLAYBOOKS,
  findPlaybook,
  renderPlaybook,
} from './playbooks';

describe('Процедуры расследования', () => {
  test('каждая процедура имеет шаги в порядке', () => {
    for (const p of PLAYBOOKS) {
      expect(p.steps.length).toBeGreaterThanOrEqual(3);
      expect(p.symptom.length).toBeGreaterThan(0);
    }
  });

  test('у каждой процедуры записан реальный случай', () => {
    // зачем: процедура без примера — теория. Владелец должен видеть, что
    // это уже происходило, иначе шаги выглядят выдумкой.
    for (const p of PLAYBOOKS) {
      expect(p.precedent.length).toBeGreaterThan(20);
    }
  });

  test('каждый шаг говорит, что делать и что это значит', () => {
    // зачем: шаг «проверь кэш» бесполезен. Нужно, что именно смотреть и
    // какой вывод из увиденного следует.
    for (const p of PLAYBOOKS) {
      for (const s of p.steps) {
        expect(s.check.length).toBeGreaterThan(10);
        expect(s.meaning.length).toBeGreaterThan(10);
      }
    }
  });

  test('процедура находится по симптому', () => {
    expect(findPlaybook('в админке включено, а в приложении не видно')?.id).toBe('stale-cache');
    expect(findPlaybook('тест-сторож упал после правки')?.id).toBe('contract-drift');
  });

  test('незнакомый симптом не подгоняется под первую попавшуюся', () => {
    // зачем: выдать неподходящую процедуру хуже, чем не выдать никакой —
    // она уводит расследование в сторону с видом уверенности.
    expect(findPlaybook('пользователь жалуется на цвет кнопки')).toBeNull();
  });

  test('пустой запрос ничего не находит', () => {
    expect(findPlaybook('')).toBeNull();
  });

  test('текст процедуры содержит шаги по порядку', () => {
    const text = renderPlaybook(PLAYBOOKS[0]);
    expect(text).toContain('1.');
    expect(text).toContain('2.');
  });

  test('идентификаторы процедур уникальны', () => {
    const ids = PLAYBOOKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('покрыты три механизма, которые реально ломаются', () => {
    // зачем именно эти: посчитано по истории правок за три месяца —
    // контракты 76 упоминаний, кэш 35, деплой 20. Турниры исключены:
    // владелец распорядился их законсервировать.
    const ids = PLAYBOOKS.map((p) => p.id);
    expect(ids).toContain('stale-cache');
    expect(ids).toContain('contract-drift');
    expect(ids).toContain('silent-zero');
  });
});
