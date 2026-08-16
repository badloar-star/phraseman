import { buildDecision } from './decision';

function base() {
  return {
    department: 'support' as const,
    mode: 'observe' as const,
    trigger: 'scheduled' as const,
    question: 'Как дела с очередью?',
    finding: '12 писем ждут ответа',
    hypothesis: 'Очередь копится',
    options: [
      { title: 'Разобрать очередь', cost: 0, risk: 'low' as const },
      { title: 'Подождать', cost: 0, risk: 'low' as const },
    ],
    recommendation: 'Разобрать просроченные',
    risk: 'Люди уходят без ответа',
    cost: 0,
    successMetric: 'Очередь пуста',
    rollback: 'Ничего не менялось',
    evidence: [{
      sourceId: 'support_inbox', state: 'ready' as const, count: 12,
      truncated: false, droppedCount: 0, observedAtMs: 1_000,
    }],
    nowMs: 1_000,
  };
}

describe('Decision action targets — по чему именно действовать', () => {
  test('решение несёт ссылки на конкретные документы', () => {
    // зачем (владелец 2026-08-16): раньше решение содержало только числа,
    // поэтому Джарвис мог сказать «12 писем ждут», но не мог ни пометить их,
    // ни подготовить черновик — целей для действия не существовало.
    const decision = buildDecision({
      ...base(),
      actionTargets: [
        { collection: 'support_inbox', docId: 'letter-1' },
        { collection: 'support_inbox', docId: 'letter-2' },
      ],
    });
    expect(decision.actionTargets).toHaveLength(2);
    expect(decision.actionTargets[0]).toEqual({ collection: 'support_inbox', docId: 'letter-1' });
  });

  test('без целей поле пустое, а не отсутствует', () => {
    // зачем: потребителю не нужно różnić undefined и «целей нет» —
    // это два способа сказать одно и то же и лишняя ветка в каждом месте.
    expect(buildDecision(base()).actionTargets).toEqual([]);
  });

  test('цели заморожены вместе с решением', () => {
    const decision = buildDecision({
      ...base(),
      actionTargets: [{ collection: 'support_inbox', docId: 'x' }],
    });
    expect(Object.isFrozen(decision.actionTargets)).toBe(true);
  });

  test('цель без документа не принимается', () => {
    // зачем строго: пустой docId означал бы действие «по всей коллекции» —
    // ровно то, чего белый список действий не должен допускать.
    expect(() => buildDecision({
      ...base(),
      actionTargets: [{ collection: 'support_inbox', docId: '' }],
    })).toThrow();
  });

  test('цель без коллекции не принимается', () => {
    expect(() => buildDecision({
      ...base(),
      actionTargets: [{ collection: '', docId: 'x' }],
    })).toThrow();
  });

  test('цели меняют contentHash: одобрение старой версии не действует на новую', () => {
    // зачем: contentHash — защита «одобрили одно, применилось другое».
    // Если цели действия изменились, это ДРУГОЕ решение.
    const a = buildDecision({ ...base(), actionTargets: [{ collection: 'c', docId: '1' }] });
    const b = buildDecision({ ...base(), actionTargets: [{ collection: 'c', docId: '2' }] });
    expect(a.contentHash).not.toBe(b.contentHash);
  });

  test('число целей ограничено', () => {
    // зачем: решение с сотней целей — это не решение, а выгрузка базы.
    const many = Array.from({ length: 50 }, (_, i) => ({ collection: 'c', docId: `d${i}` }));
    expect(() => buildDecision({ ...base(), actionTargets: many })).toThrow();
  });
});
