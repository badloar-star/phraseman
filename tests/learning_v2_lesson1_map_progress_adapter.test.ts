import { lesson1MapInputFromProgress } from '../modules/learning-v2/map/lesson1_map_progress_adapter';
import { buildLessonMapModel } from '../modules/learning-v2/map/lesson_map_model';
import type { Lesson1LocalProgressState } from '../modules/learning-v2/progress/lesson1_local_progress';

const sessionIds = Array.from({ length: 12 }, (_, index) => {
  const zones = ['understand', 'use', 'master'] as const;
  return `lesson-1-${zones[Math.floor(index / 4)]}-${(index % 4) + 1}`;
});

it('renders the next real V2 session from persisted local-first state', () => {
  const state: Lesson1LocalProgressState = {
    schemaVersion: 'learning-v2-lesson1-progress.v1', accountKey: 'test', requiredSessionIds: sessionIds,
    lessonStatus: 'in_progress', sessions: { [sessionIds[0]]: 'completed', [sessionIds[1]]: 'in_progress' },
    operations: {}, migration: { status: 'not_checked' }, revision: 2,
  };

  const model = buildLessonMapModel(lesson1MapInputFromProgress(state));
  expect(model.zones.flatMap(zone => zone.nodes).map(node => node.state).slice(0, 4))
    .toEqual(['completed', 'current', 'next', 'locked']);
});
