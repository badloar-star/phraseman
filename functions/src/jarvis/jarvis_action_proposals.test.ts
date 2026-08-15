import { proposeActionsForDecisions } from './jarvis_action_proposals';
import { JARVIS_ACTIONS_MAX_PER_RUN } from './jarvis_actions';
import type { Decision } from './decision';

function decision(over: Partial<Decision> = {}): Decision {
  return {
    department: 'quality',
    contentHash: 'c1',
    revision: 1,
    status: 'awaiting_owner',
    actionability: 'confirmed_action',
    question: 'Что ломается чаще всего?',
    finding: '12 ошибок на экране уроков',
    recommendation: 'Починить падение на экране уроков',
    ...over,
  } as unknown as Decision;
}

describe('Jarvis action proposals — во что превращается находка', () => {
  test('находка с рекомендацией превращается в задачу', () => {
    // зачем задача, а не пометка: id конкретных документов до решений не
    // доходят — департаменты работают с агрегатами. Единственная цель,
    // которая реально существует сегодня, это собственный буфер задач.
    const proposals = proposeActionsForDecisions({ decisions: [decision()], nowMs: 1_000 });
    expect(proposals).toHaveLength(1);
    expect(proposals[0].kind).toBe('github_issue');
    expect(String(proposals[0].payload.title)).toContain('уроков');
  });

  test('наблюдательная находка задачу не порождает', () => {
    // зачем: evidence_only означает «я только смотрю» — заводить по такой
    // находке задачу значит выйти за границу, поставленную департаментом.
    const observing = decision({ actionability: 'evidence_only' } as Partial<Decision>);
    expect(proposeActionsForDecisions({ decisions: [observing], nowMs: 1_000 })).toHaveLength(0);
  });

  test('находка без доказательств задачу не порождает', () => {
    const shaky = decision({ status: 'insufficient_evidence' } as Partial<Decision>);
    expect(proposeActionsForDecisions({ decisions: [shaky], nowMs: 1_000 })).toHaveLength(0);
  });

  test('за прогон предлагается не больше потолка', () => {
    const many = Array.from({ length: 10 }, (_, i) => decision({ contentHash: `c${i}` } as Partial<Decision>));
    const proposals = proposeActionsForDecisions({ decisions: many, nowMs: 1_000 });
    expect(proposals.length).toBeLessThanOrEqual(JARVIS_ACTIONS_MAX_PER_RUN);
  });

  test('в тело задачи попадает провенанс, а не пересказ от модели', () => {
    // зачем: задача без ссылки на источник — это работа, которую Джарвис
    // выдумал себе сам. По телу должно быть видно, откуда она взялась.
    const [p] = proposeActionsForDecisions({ decisions: [decision()], nowMs: 1_000 });
    expect(String(p.payload.body)).toContain('quality');
    expect(String(p.payload.body)).toContain('12 ошибок');
  });

  test('заголовок обрезается, а не ломает валидатор', () => {
    const long = decision({ recommendation: 'Ч'.repeat(500) } as Partial<Decision>);
    const [p] = proposeActionsForDecisions({ decisions: [long], nowMs: 1_000 });
    expect(String(p.payload.title).length).toBeLessThanOrEqual(200);
  });

  test('пустой список решений — пустой список действий', () => {
    expect(proposeActionsForDecisions({ decisions: [], nowMs: 1_000 })).toHaveLength(0);
  });
});
