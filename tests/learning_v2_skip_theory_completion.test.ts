import { getLesson1SessionRuntime } from "../modules/learning-v2/runtime/lesson1_session_runtime";
import { materializeRequiredSessionCompletionEnvelope } from "../modules/learning-v2/progress/required_session_completion_envelope";
import { projectRequiredTaskStars } from "../modules/learning-v2/contracts/course_economy";

// зачем: владелец 23.08.2026 — в модалке карты появилась кнопка «Пропустить
// теорию». Три вопроса интро — это канонические слоты 1-3 из 12, и конверт
// завершения требует запись для КАЖДОГО слота. Наивная реализация «просто не
// показывать интро» роняла бы finish() на каждом пропуске с ошибкой
// required_session_completion_incomplete. Здесь сторожим готовое решение:
// слоты 1-3 помечаются `skipped` (0 звёзд), сессия остаётся из 12 записей.
// Данные — НАСТОЯЩИЕ, из реального рантайма урока, а не самодельная фикстура.

const scope = {
  stableId: "account-skip-theory",
  accountScopeHash: "b".repeat(64),
  seasonId: "learning-v2",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  generation: 4,
};

/** Прогон сессии так, как он выглядит при нажатии «Пропустить теорию». */
const skipTheoryRun = () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const taskResults = session.cards.map((card, index) => {
    // Слоты 1-3 (index 0..2) — теория пропущена: ученик их не отвечал.
    if (index < 3) {
      return {
        taskId: card.cardId,
        disposition: "skipped" as const,
        learnerAttempts: 0,
        hintUsed: false,
      };
    }
    // Слоты 4-12 — обычная практика.
    return {
      taskId: card.cardId,
      disposition: "completed" as const,
      learnerAttempts: 1,
      hintUsed: false,
    };
  });
  return { runtime, session, taskResults };
};

describe("пропуск теории не ломает завершение сессии", () => {
  it("конверт собирается: 12 записей, первые три помечены skipped", () => {
    const { runtime, session, taskResults } = skipTheoryRun();

    const envelope = materializeRequiredSessionCompletionEnvelope({
      scope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "session-run-skip-theory",
      session,
      taskResults,
    });

    // Контракт из 12 задач обязан устоять — именно на нём падала бы наивная
    // реализация «сессия из 9 заданий».
    expect(envelope.taskCompletions).toHaveLength(12);
    expect(envelope.taskCompletions[0]).toMatchObject({ disposition: "skipped" });
    expect(envelope.taskCompletions[1]).toMatchObject({ disposition: "skipped" });
    expect(envelope.taskCompletions[2]).toMatchObject({ disposition: "skipped" });
    expect(envelope.taskCompletions[3]).toMatchObject({ disposition: "completed" });
  });

  it("за пропущенную теорию звёзд не начисляется", () => {
    // Решение владельца: пропустил теорию — звёзд за неё нет.
    const skipped = projectRequiredTaskStars({
      disposition: "skipped",
      learnerAttempts: 0,
      hintUsed: false,
    });
    expect(skipped.stars).toBe(0);
    // При этом пропуск не считается ошибкой ученика и не требует повтора,
    // иначе сессия зациклилась бы на непройденной теории.
    expect(skipped.countsAsLearnerError).toBe(false);
    expect(skipped.retryRequired).toBe(false);
  });

  it("максимум звёзд за прогон с пропуском — 27 из 36", () => {
    const { taskResults } = skipTheoryRun();
    const total = taskResults.reduce(
      (sum, result) => sum + projectRequiredTaskStars(result).stars,
      0,
    );
    // 9 практических слотов × 3 звезды = 27; три слота теории дают 0.
    expect(total).toBe(27);
  });

  it("обычный прогон без пропуска по-прежнему даёт полные 36 звёзд", () => {
    // Страховка: правка ради пропуска не должна занижать обычный прогон.
    const runtime = getLesson1SessionRuntime();
    const session = runtime.compiled.sessions[0];
    const total = session.cards.reduce(
      (sum, card) =>
        sum +
        projectRequiredTaskStars({
          disposition: "completed",
          learnerAttempts: 1,
          hintUsed: false,
        }).stars,
      0,
    );
    expect(total).toBe(36);
  });
});
