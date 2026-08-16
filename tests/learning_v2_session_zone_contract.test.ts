// зачем: зоны сессий описаны в ДВУХ местах — таблицей REQUIRED_SESSION_POLICY_V1
// в компиляторе и формулой expectedZone в контракте. Импортировать таблицу в
// контракт нельзя: компилятор сам импортирует контракт, вышел бы цикл.
//
// Пока они совпадали, никто не замечал дублирования. Когда урок вырос с 12
// сессий до 56, таблица поехала, а формула осталась прежней — и КАЖДЫЙ набор
// сессий стал невалидным с session_set_required_order. На телефоне это
// выглядело как «Сессия недоступна»: ни одного урока открыть было нельзя.
//
// Сторож сверяет два источника напрямую. Он не даёт починить один и забыть
// второй — ровно та ошибка, которая стоила рабочего экрана.
import { REQUIRED_SESSION_POLICY_V1 } from "../modules/learning-v2/content/session_compiler";
import { validateV2SessionSet } from "../modules/learning-v2/contracts/session";
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from "../modules/learning-v2/content/course_topology_v1";

/**
 * Достаёт зону, которую контракт ожидает на данной позиции.
 *
 * expectedZone не экспортируется наружу, поэтому спрашиваем контракт так же,
 * как это делает рантайм: подсовываем набор и смотрим, ругнётся ли он на
 * порядок. Проверяем через минимальный набор с одной подменённой зоной.
 */
function contractRejectsZoneAt(index: number, zone: string): boolean {
  const sessions = REQUIRED_SESSION_POLICY_V1.slice(0, index + 1).map(
    (policy, position) => ({
      sessionId: `session-${String(position + 1).padStart(2, "0")}`,
      ordinal: position + 1,
      zone: position === index ? zone : policy.zone,
      targetSeconds: 420,
      cards: [],
    }),
  );
  const result = validateV2SessionSet({
    schemaVersion: "v2-session-set.v1",
    episodeId: "episode-01",
    version: 1,
    sessions,
    optionalPracticeSlots: [],
  });
  return (
    !result.ok && result.issues.includes("session_set_required_order")
  );
}

describe("session zones stay identical in the compiler table and the contract", () => {
  it("covers the whole lesson, not just the first twelve sessions", () => {
    expect(REQUIRED_SESSION_POLICY_V1).toHaveLength(
      LEARNING_V2_LESSON_SESSION_COUNT_V1,
    );
  });

  // зачем: главная проверка. Для каждой позиции урока контракт обязан принять
  // ту зону, которую там ставит компилятор — иначе набор невалиден целиком.
  it("accepts every zone the compiler actually produces", () => {
    const rejected: string[] = [];
    REQUIRED_SESSION_POLICY_V1.forEach((policy, index) => {
      if (contractRejectsZoneAt(index, policy.zone))
        rejected.push(
          `сессия ${index + 1}: компилятор ставит «${policy.zone}», контракт её не принимает`,
        );
    });
    expect(rejected).toEqual([]);
  });

  // зачем: обратная сторона. Если контракт согласен на любую зону, он не
  // защищает ни от чего — а именно на него полагается публикация.
  it("still rejects a zone the compiler would never produce there", () => {
    const zones = ["understand", "use", "master"] as const;
    const checked: number[] = [];
    REQUIRED_SESSION_POLICY_V1.forEach((policy, index) => {
      const wrong = zones.find((zone) => zone !== policy.zone);
      if (wrong && contractRejectsZoneAt(index, wrong)) checked.push(index);
    });
    // Каждая позиция урока обязана отвергнуть чужую зону.
    expect(checked).toHaveLength(REQUIRED_SESSION_POLICY_V1.length);
  });
});
