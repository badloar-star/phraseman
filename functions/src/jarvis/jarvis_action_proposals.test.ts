import { proposeActionsForDecisions } from './jarvis_action_proposals';
import { JARVIS_ACTIONS_MAX_PER_RUN, ALLOWED_TAGS } from './jarvis_actions';
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
    // зачем задача даже без адресов: большинство департаментов работают с
    // агрегатами и конкретных документов не называют. Задача по находке —
    // цель, которая существует всегда. Адреса, если они есть, добавляют
    // пометки СВЕРХУ (см. describe ниже), а не отменяют задачу.
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

describe('Пометки на конкретных документах', () => {
  // зачем (владелец 2026-08-16): пока департаменты отдавали только числа,
  // пометить было нечего. Теперь у решения есть адреса — появилась цель.

  function withTargets(targets: readonly { collection: string; docId: string }[]) {
    return {
      ...decision(),
      actionTargets: targets,
    } as unknown as Decision;
  }

  test('решение с адресами порождает пометку на документе', () => {
    const proposals = proposeActionsForDecisions({
      decisions: [withTargets([{ collection: 'user_reports', docId: 'r1' }])],
      nowMs: 1_000,
    });
    const tag = proposals.find((p) => p.kind === 'admin_tag');
    expect(tag).toBeTruthy();
    expect(tag!.target).toEqual({ collection: 'user_reports', docId: 'r1' });
  });

  test('пометка берётся из словаря, а не сочиняется', () => {
    // зачем: свободный тег — это запись произвольного текста в чужую
    // коллекцию, то есть та же инъекция, только через админку.
    const [tag] = proposeActionsForDecisions({
      decisions: [withTargets([{ collection: 'user_reports', docId: 'r1' }])],
      nowMs: 1_000,
    }).filter((p) => p.kind === 'admin_tag');
    expect(ALLOWED_TAGS).toContain(String(tag.payload.tag));
  });

  test('без адресов пометок не предлагается', () => {
    const proposals = proposeActionsForDecisions({ decisions: [decision()], nowMs: 1_000 });
    expect(proposals.filter((p) => p.kind === 'admin_tag')).toHaveLength(0);
  });

  test('общий потолок действий за прогон соблюдается', () => {
    // зачем: десять адресов не должны превращаться в десять действий —
    // потолок защищает от лавины независимо от числа целей.
    const many = Array.from({ length: 10 }, (_, i) => ({ collection: 'user_reports', docId: `r${i}` }));
    const proposals = proposeActionsForDecisions({
      decisions: [withTargets(many)],
      nowMs: 1_000,
    });
    expect(proposals.length).toBeLessThanOrEqual(JARVIS_ACTIONS_MAX_PER_RUN);
  });

  test('задача по находке остаётся: адреса её не отменяют', () => {
    const proposals = proposeActionsForDecisions({
      decisions: [withTargets([{ collection: 'user_reports', docId: 'r1' }])],
      nowMs: 1_000,
    });
    expect(proposals.some((p) => p.kind === 'github_issue')).toBe(true);
  });
});
