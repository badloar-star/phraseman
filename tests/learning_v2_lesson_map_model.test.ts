import {
  buildLessonMapModel,
  type LessonMapInput,
} from '../modules/learning-v2/map/lesson_map_model';

const personalPlanTasks = [
  { id: 'plan-1', title: 'Повтори фразы о знакомстве', status: 'available' as const },
  { id: 'plan-2', title: 'Закрепи present simple', status: 'locked' as const },
];

const baseInput: LessonMapInput = {
  lessonId: 1,
  completedSessionIds: ['lesson-1-understand-1', 'lesson-1-understand-2'],
  currentSessionId: 'lesson-1-understand-3',
  personalPlanTasks,
};

describe('Learning V2 lesson map model', () => {
  it('always renders the owner-approved 12-session, three-zone route', () => {
    const model = buildLessonMapModel(baseInput);

    expect(model.zones.map(zone => [zone.id, zone.nodes.length])).toEqual([
      ['understand', 4],
      ['use', 4],
      ['master', 4],
    ]);
    expect(model.zones.flatMap(zone => zone.nodes)).toHaveLength(12);
    expect(model.zones.flatMap(zone => zone.nodes).map(node => node.id)).toEqual([
      'lesson-1-understand-1', 'lesson-1-understand-2', 'lesson-1-understand-3', 'lesson-1-understand-4',
      'lesson-1-use-1', 'lesson-1-use-2', 'lesson-1-use-3', 'lesson-1-use-4',
      'lesson-1-master-1', 'lesson-1-master-2', 'lesson-1-master-3', 'lesson-1-master-4',
    ]);
  });

  it('maps completed/current/next/locked states without a connector line', () => {
    const model = buildLessonMapModel(baseInput);
    const nodes = model.zones.flatMap(zone => zone.nodes);

    expect(nodes.map(node => node.state)).toEqual([
      'completed', 'completed', 'current', 'next',
      'locked', 'locked', 'locked', 'locked',
      'locked', 'locked', 'locked', 'locked',
    ]);
    expect(nodes.every(node => node.connector === null)).toBe(true);
    expect(nodes.map(node => node.xOffset)).toEqual([-64, 64, -64, 64, -64, 64, -64, 64, -64, 64, -64, 64]);
  });

  it('keeps personal-plan tasks as at most two side nodes and rejects tournament nodes', () => {
    const model = buildLessonMapModel({
      ...baseInput,
      personalPlanTasks: [
        ...personalPlanTasks,
        { id: 'plan-3', title: 'Лишняя задача', status: 'available' },
      ],
      tournamentTasks: [{ id: 'tournament-1', title: 'Не на карте урока' }],
    });

    expect(model.sideNodes).toEqual([
      expect.objectContaining({ id: 'plan-1', kind: 'personal_plan', status: 'available' }),
      expect.objectContaining({ id: 'plan-2', kind: 'personal_plan', status: 'locked' }),
    ]);
    expect(model.sideNodes).toHaveLength(2);
    expect(model.sideNodes.some(node => node.id === 'tournament-1')).toBe(false);
  });
});
