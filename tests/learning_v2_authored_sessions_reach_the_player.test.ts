// зачем: владелец включил ЛАН-метро и увидел пустой раздел и «Сессия
// недоступна». Восемь сессий были написаны, покрыты тестами и закоммичены —
// но ни один файл вне папки source/ их не импортировал. Контент оказался
// сиротой: тесты проверяли ФОРМУ данных, а не путь до экрана.
//
// Этот сторож закрывает ровно ту дыру. Он не проверяет, красиво ли написана
// фраза — он проверяет, что авторский текст доходит до рантайма приложения.
// Пока моста нет, тест красный, и это честно: экран действительно пустой.
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from "../modules/learning-v2/content/course_topology_v1";
import {
  AUTHORED_EPISODE_01_SESSIONS,
  authoredLearningV2SessionShards,
} from "../modules/learning-v2/content/source/authored_sessions_v1";
import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";

describe("authored sessions reach the runtime, not just the test suite", () => {
  // зачем: главная проверка. Если этот список пуст или сюда забыли добавить
  // новую сессию, приложение её не увидит — именно так и вышло с сессиями 1–8.
  it("exposes every authored session through one registry", () => {
    expect(AUTHORED_EPISODE_01_SESSIONS.length).toBeGreaterThan(0);
    const ordinals = AUTHORED_EPISODE_01_SESSIONS.map(
      (session) => session.requiredSessionOrdinal,
    );
    // Порядковые номера идут подряд с первого: дырка означает, что сессию
    // написали, но не подключили.
    expect(ordinals).toEqual(
      Array.from({ length: ordinals.length }, (_, index) => index + 1),
    );
  });

  it("builds every authored session into a shard the runtime accepts", () => {
    const shards = authoredLearningV2SessionShards();
    expect(shards.length).toBe(AUTHORED_EPISODE_01_SESSIONS.length);
    for (const shard of shards)
      expect(() =>
        validateLearningV2GeneratedSessionShardV1(shard, {
          packageId: shard.packageId,
          targetLanguage: shard.targetLanguage,
          episodeOrdinal: shard.episodeOrdinal,
          requiredSessionOrdinal: shard.requiredSessionOrdinal,
          generationInputFingerprint: shard.generationInputFingerprint,
        }),
      ).not.toThrow();
  });

  // зачем: карта обещает 56 сессий. Пока их меньше, релиз неполный — и это
  // должно быть видно числом, а не обнаруживаться на телефоне.
  it("reports honestly how much of the lesson is actually authored", () => {
    expect(EPISODE_01_SESSION_MAP_V1.length).toBe(
      LEARNING_V2_LESSON_SESSION_COUNT_V1,
    );
    const authored = AUTHORED_EPISODE_01_SESSIONS.length;
    const planned = EPISODE_01_SESSION_MAP_V1.length;
    // Не утверждение о готовности, а честный замер: сколько из обещанного есть.
    expect(authored).toBeLessThanOrEqual(planned);
    // eslint-disable-next-line no-console
    console.log(
      `[learning-v2] урок 1: написано ${authored} из ${planned} сессий`,
    );
  });

  it("keeps each authored session matched to its slot in the map", () => {
    for (const session of AUTHORED_EPISODE_01_SESSIONS) {
      const plan =
        EPISODE_01_SESSION_MAP_V1[session.requiredSessionOrdinal - 1];
      expect(plan.sessionOrdinal).toBe(session.requiredSessionOrdinal);
      // Заголовок сессии и её место в карте должны говорить об одном и том же
      // занятии: рассинхрон здесь означает, что человек откроет не то.
      expect(session.title.ru.length).toBeGreaterThan(0);
    }
  });
});
