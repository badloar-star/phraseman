import type { Decision } from './decision';
import { decisionTopicKey, stripVolatileNumbers } from './decision_topic';

function decision(over: Partial<Decision> = {}): Decision {
  return {
    department: 'support',
    question: 'Сколько обращений ждут ответа?',
    finding: '125 писем без ответа',
    recommendation: 'Разобрать очередь',
    ...over,
  } as unknown as Decision;
}

describe('Jarvis decision topic key — адрес темы, а не сегодняшней цифры', () => {
  test('счётчик сдвинулся — тема та же', () => {
    // зачем: владелец 2026-08-15 «пишет одно и то же». Причина класса —
    // ключ, посчитанный от текста с живым числом, назавтра другой,
    // и одна проблема выглядит как две разные.
    expect(decisionTopicKey(decision({ finding: '125 писем без ответа' } as Partial<Decision>)))
      .toBe(decisionTopicKey(decision({ finding: '126 писем без ответа' } as Partial<Decision>)));
  });

  test('разные проблемы одного департамента остаются разными', () => {
    // зачем: устойчивость к числам не должна превращаться в глухоту —
    // иначе один отказ заглушил бы весь департамент.
    expect(decisionTopicKey(decision({ finding: '125 писем без ответа' } as Partial<Decision>)))
      .not.toBe(decisionTopicKey(decision({ finding: '3 платежа зависли' } as Partial<Decision>)));
  });

  test('перестановка чисел не склеивает разные находки', () => {
    const a = decision({ finding: '3 платежа зависли, 12 подтверждены' } as Partial<Decision>);
    const b = decision({ finding: '12 платежей зависли, 3 подтверждены' } as Partial<Decision>);
    expect(decisionTopicKey(a)).not.toBe(decisionTopicKey(b));
  });

  test('департамент входит в ключ: одинаковый текст у разных отделов — разные темы', () => {
    expect(decisionTopicKey(decision({ department: 'support' } as Partial<Decision>)))
      .not.toBe(decisionTopicKey(decision({ department: 'safety' } as Partial<Decision>)));
  });

  test('регистр и пунктуация не создают новую тему', () => {
    expect(decisionTopicKey(decision({ finding: '125 писем БЕЗ ответа!!!' } as Partial<Decision>)))
      .toBe(decisionTopicKey(decision({ finding: '125 писем без ответа' } as Partial<Decision>)));
  });

  test('ключ детерминирован и имеет стабильную длину', () => {
    const key = decisionTopicKey(decision());
    expect(key).toBe(decisionTopicKey(decision()));
    expect(key).toMatch(/^[0-9a-f]{16}$/);
  });

  test('пустые поля не роняют ключ', () => {
    expect(() => decisionTopicKey({ department: 'support' } as unknown as Decision)).not.toThrow();
  });

  test('stripVolatileNumbers схлопывает число, но сохраняет слова', () => {
    expect(stripVolatileNumbers('125 писем')).toBe(stripVolatileNumbers('7 писем'));
    expect(stripVolatileNumbers('125 писем')).not.toBe(stripVolatileNumbers('125 звонков'));
  });
});
