import {
  createPersonalProgressStore,
} from '../app/personal_progress_store';
import type { PersonalProgressProjection } from '../modules/phone-state/domains/progress_projection';

const empty: PersonalProgressProjection = {
  totalXp: 0, level: 1, weeklyXp: 0, activityDates: [], streakCount: 0,
  completedLessons: [], passedExams: [], unlockedLessons: [], bestResults: {},
};

test('hydration publishes PhoneState projection before screens render cutover data', async () => {
  const store = createPersonalProgressStore({
    readPhoneState: async () => ({ ...empty, totalXp: 120, streakCount: 4 }),
    readLegacy: async () => ({ ...empty, totalXp: 90 }),
    usePhoneState: () => true,
  });
  await store.hydrate();
  expect(store.getSnapshot()).toMatchObject({ totalXp: 120, streakCount: 4, hydrated: true });
});

test('local commit updates subscribers without any cloud event', async () => {
  const store = createPersonalProgressStore({
    readPhoneState: async () => empty,
    readLegacy: async () => empty,
    usePhoneState: () => true,
  });
  await store.hydrate();
  const observed: number[] = [];
  store.subscribe(() => observed.push(store.getSnapshot().totalXp));
  store.publish({ ...empty, totalXp: 10 }, 'phone_state');
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
  store.publish({ ...empty, totalXp: 10 }, 'phone_state');
  release({ ...empty, totalXp: 5 });
  await hydration;
  expect(store.getSnapshot().totalXp).toBe(10);
});
