import {
  buildLessonMapModel,
  type LessonMapInput,
} from '../modules/learning-v2/map/lesson_map_model';

const baseInput: LessonMapInput = {
  lessonId: 1,
  completedSessionIds: ['lesson-1-understand-1', 'lesson-1-understand-2'],
  currentSessionId: 'lesson-1-understand-3',
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

  it('ignores tournament context instead of adding it to the lesson map', () => {
    const model = buildLessonMapModel({
      ...baseInput,
      tournamentTasks: [{ id: 'tournament-1', title: 'Не на карте урока' }],
    });
    expect(model.zones.flatMap((zone) => zone.nodes).some((node) => node.id === 'tournament-1')).toBe(false);
  });
});
