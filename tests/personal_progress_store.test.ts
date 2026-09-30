import {
  createPersonalProgressStore,
} from '../app/personal_progress_store';
import type { PersonalProgressProjection } from '../modules/phone-state/domains/progress_projection';

const empty: PersonalProgressProjection = {
  // зачем: XP удалён (PM-055/PM-067) — смысл тестов (порядок публикаций) проверяется на streakCount
  activityDates: [], streakCount: 0,
  completedLessons: [], passedExams: [], unlockedLessons: [], bestResults: {},
};

test('hydration publishes PhoneState projection before screens render cutover data', async () => {
  const store = createPersonalProgressStore({
    readPhoneState: async () => ({ ...empty, streakCount: 4 }),
    readLegacy: async () => ({ ...empty, streakCount: 2 }),
    usePhoneState: () => true,
  });
  await store.hydrate();
  expect(store.getSnapshot()).toMatchObject({ streakCount: 4, hydrated: true });
});

test('local commit updates subscribers without any cloud event', async () => {
  const store = createPersonalProgressStore({
    readPhoneState: async () => empty,
    readLegacy: async () => empty,
    usePhoneState: () => true,
  });
  await store.hydrate();
  const observed: number[] = [];
  store.subscribe(() => observed.push(store.getSnapshot().streakCount));
  store.publish({ ...empty, streakCount: 10 }, 'phone_state');
  expect(observed.at(-1)).toBe(10);
});

test('stale hydration cannot replace a newer local commit', async () => {
  let release!: (projection: PersonalProgressProjection) => void;
  const store = createPersonalProgressStore({
    readPhoneState: () => new Promise((resolve) => { release = resolve; }),
    readLegacy: async () => empty,
    usePhoneState: () => true,
  });
  const hydration = store.hydrate();
  store.publish({ ...empty, streakCount: 10 }, 'phone_state');
  release({ ...empty, streakCount: 5 });
  await hydration;
  expect(store.getSnapshot().streakCount).toBe(10);
});
