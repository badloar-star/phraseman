import {
  parseTurnState,
  neutralTurnState,
  isTerminalOutcome,
  outcomeXpMultiplier,
  outcomeTitle,
  objectiveLabel,
  type DialogOutcome,
} from '../app/dialog_outcome';

describe('dialog_outcome — контракт исхода диалога', () => {
  describe('parseTurnState — фолбэк на битый/частичный JSON', () => {
    it('валидный объект разбирается полностью', () => {
      const s = parseTurnState({
        mood: 88,
        objectivesMet: ['order_drink', 'ask_size'],
        outcome: 'success',
        characterReaction: "Loved chatting!",
        coachTips: ['Try asking the price next time'],
      });
      expect(s.mood).toBe(88);
      expect(s.objectivesMet).toEqual(['order_drink', 'ask_size']);
      expect(s.outcome).toBe('success');
      expect(s.characterReaction).toBe('Loved chatting!');
      expect(s.coachTips).toEqual(['Try asking the price next time']);
    });

    it('JSON-строка тоже разбирается', () => {
      const s = parseTurnState('{"mood":40,"outcome":"stalled","objectivesMet":[]}');
      expect(s.mood).toBe(40);
      expect(s.outcome).toBe('stalled');
    });

    it('битый JSON → нейтральный продолжающийся исход (не падает)', () => {
      const s = parseTurnState('{not valid json');
      expect(s).toEqual(neutralTurnState());
      expect(s.outcome).toBe('ongoing');
    });

    it('null/undefined/число → нейтральный исход', () => {
      expect(parseTurnState(null).outcome).toBe('ongoing');
      expect(parseTurnState(undefined).outcome).toBe('ongoing');
      expect(parseTurnState(42).outcome).toBe('ongoing');
    });

    it('неизвестный outcome → ongoing (не доверяем модели вслепую)', () => {
      expect(parseTurnState({ outcome: 'explosion' }).outcome).toBe('ongoing');
    });

    it('частичный объект — недостающие поля получают безопасные дефолты', () => {
      const s = parseTurnState({ outcome: 'lost_patience' });
      expect(s.outcome).toBe('lost_patience');
      expect(s.objectivesMet).toEqual([]);
      expect(s.coachTips).toEqual([]);
      expect(s.characterReaction).toBe('');
      expect(typeof s.mood).toBe('number');
    });

    it('mood клампится, мусор в массивах отсеивается', () => {
      const s = parseTurnState({
        mood: 250,
        objectivesMet: ['ok', '', null, 123, 'two'],
        coachTips: 'not-an-array',
      });
      expect(s.mood).toBe(100);
      expect(s.objectivesMet).toEqual(['ok', '123', 'two']);
      expect(s.coachTips).toEqual([]);
    });
  });

  describe('isTerminalOutcome', () => {
    it('ongoing не терминальный, остальные — терминальные', () => {
      expect(isTerminalOutcome('ongoing')).toBe(false);
      expect(isTerminalOutcome('success')).toBe(true);
      expect(isTerminalOutcome('lost_patience')).toBe(true);
      expect(isTerminalOutcome('stalled')).toBe(true);
    });
  });

  describe('outcomeXpMultiplier — больше XP за успех, провал >0', () => {
    it('success полный, провал/заглох меньше но не ноль', () => {
      expect(outcomeXpMultiplier('success')).toBe(1);
      expect(outcomeXpMultiplier('stalled')).toBeGreaterThan(0);
      expect(outcomeXpMultiplier('lost_patience')).toBeGreaterThan(0);
      expect(outcomeXpMultiplier('success')).toBeGreaterThan(outcomeXpMultiplier('stalled'));
      expect(outcomeXpMultiplier('stalled')).toBeGreaterThan(outcomeXpMultiplier('lost_patience'));
    });

    it('ongoing → 0 (диалог не завершён)', () => {
      expect(outcomeXpMultiplier('ongoing')).toBe(0);
    });
  });

  describe('outcomeTitle — локализация всех исходов', () => {
    const langs = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
    const outcomes: DialogOutcome[] = ['success', 'lost_patience', 'stalled', 'ongoing'];
    it('каждый исход даёт непустой заголовок на всех языках', () => {
      for (const o of outcomes) {
        for (const l of langs) {
          expect(outcomeTitle(o, l).length).toBeGreaterThan(0);
        }
      }
    });
    it('русский заголовок успеха корректен', () => {
      expect(outcomeTitle('success', 'ru')).toBe('Получилось!');
    });
  });

  describe('objectiveLabel — метка цели по языку (H5)', () => {
    const obj = { labelRu: 'Заказать напиток', labelEs: 'Pedir bebida', en: 'order a drink' };
    it('ru/uk → labelRu', () => {
      expect(objectiveLabel(obj, 'ru')).toBe('Заказать напиток');
      expect(objectiveLabel(obj, 'uk')).toBe('Заказать напиток');
    });
    it('es → labelEs', () => {
      expect(objectiveLabel(obj, 'es')).toBe('Pedir bebida');
    });
    it('прочие языки → английская формулировка (не русская заглушка)', () => {
      expect(objectiveLabel(obj, 'tr')).toBe('order a drink');
      expect(objectiveLabel(obj, 'vi')).toBe('order a drink');
      expect(objectiveLabel(obj, 'pl')).toBe('order a drink');
    });
    it('фолбэк на labelRu, если нет en', () => {
      expect(objectiveLabel({ labelRu: 'Цель' }, 'tr')).toBe('Цель');
    });
  });
});
