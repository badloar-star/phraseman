// Координатор 15.10 (урок 1 V2 целиком, потолок 56): client_v3 берёт список слов из лёгкой очереди
// factoryNativeSessionWordEncountersV1 вместо полной сборки каждого занятия ≤ текущего. Лёгкая очередь обязана
// совпасть с полной сборкой (все встречи, тот же порядок, те же поля) — иначе другие слова/озвучка у ученика.
import {
  __resetFactoryNativeMaterializeCacheForTests,
  factoryNativeSessionWordEncountersV1,
  materializeFactoryNativeLearningV2SessionV1,
} from '../modules/learning-v2/content/factory_native/factory_native_course_v1';

describe('лёгкая очередь слов = полная сборка', () => {
  beforeAll(() => {
    __resetFactoryNativeMaterializeCacheForTests();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  it.each(['ru', 'uk', 'en'] as const)('урок 1, все занятия манифеста, язык %s', (locale) => {
    let compared = 0;
    for (let session = 1; session <= 56; session += 1) {
      const full = materializeFactoryNativeLearningV2SessionV1({ lessonOrdinal: 1, sessionOrdinal: session, interfaceLocale: locale });
      const light = factoryNativeSessionWordEncountersV1({ lessonOrdinal: 1, sessionOrdinal: session, interfaceLocale: locale });
      if (full === null) {
        expect([session, light]).toEqual([session, null]);
        continue;
      }
      const fromFull = Object.values(full.wordEncounterQueuesByInteractionId).flat();
      expect([session, light]).toEqual([session, fromFull]);
      compared += 1;
    }
    expect(compared).toBeGreaterThan(0);
  });
});
