import fs from "node:fs";
import path from "node:path";

const admin = fs.readFileSync(
  path.join(__dirname, "..", "admin", "legacy.html"),
  "utf8",
);
const rootAdmin = fs.readFileSync(
  path.join(__dirname, "..", "admin", "index.html"),
  "utf8",
);
const deliveryContract = fs.readFileSync(
  path.join(__dirname, "..", "docs", "v2", "GENERATOR_DELIVERY_CONTRACT.md"),
  "utf8",
);
const executionPlan = fs.readFileSync(
  path.join(__dirname, "..", "docs", "v2", "EXECUTION_PLAN_2026-08-09.md"),
  "utf8",
);
const v2Readme = fs.readFileSync(
  path.join(__dirname, "..", "docs", "v2", "README.md"),
  "utf8",
);

describe("Learning V2 full-course generator admin contract", () => {
  test("uses the root admin workflow and preserves the old E1 tool as an explicit non-release test", () => {
    expect(admin).toContain("Learning V2 · Студия курса");
    expect(admin).toContain("Тестовый старый инструмент E1 · не для релиза");
    expect(admin).toContain("adminSeedV2E1DemoSource");
    expect(rootAdmin).toContain("url=/legacy.html");
    expect(rootAdmin).not.toContain("url=/v2");
    expect(admin).toContain("local-visual-test-only");
    expect(admin).toContain("IS_LOCAL_ADMIN_VISUAL_TEST");
  });

  test("shows the seven owner-gated stages and all eight mandatory interface locales", () => {
    for (const kind of [
      "learning_v2_research",
      "learning_v2_curriculum",
      "learning_v2_lesson_outline",
      "learning_v2_localized_course",
      "learning_v2_audio",
      "learning_v2_quality_assurance",
      "learning_v2_release",
    ])
      expect(admin).toContain(kind);
    expect(admin).toContain(
      "Object.freeze(['ru','uk','es','pt-BR','vi','id','tr','pl'])",
    );
    expect(admin).toContain("Весь учебный контент");
    expect(admin).toContain("Одобрить как черновой этап");
    expect(admin).toContain("Вернуть на исправление");
    expect(admin).not.toContain('value="Проверено владельцем на всех языках"');
  });

  test("uses the canonical Generation Queue callables without automatic publication", () => {
    for (const callable of [
      "adminCreateContentStage",
      "adminRunContentStage",
      "adminGetLearningV2CourseWorkspaceProjection",
      "adminPreviewContentStage",
      "adminReviewContentStage",
    ])
      expect(admin).toContain(callable);
    expect(admin).toContain("Никакой этап не публикуется автоматически");
    expect(admin).toContain("Ash, Onyx, Nova и Coral");
    expect(admin).toContain("Релиз заблокирован");
    expect(admin).toContain(
      "8 локалей заполнены структурно. Языковая проверка ещё не подтверждена.",
    );
  });

  test("gives the owner a real E1–E32 import, preview and confirmation workspace", () => {
    expect(admin).toContain("Ваши эпизоды E1–E32");
    expect(admin).toContain("Контент создаёте только вы");
    expect(admin).toContain("Автоматическая генерация содержания отключена");
    expect(admin).toContain('accept="application/json,.json"');
    expect(admin).toContain("Нужно ровно 12 сессий");
    expect(admin).toContain("12 сессий, 144 задания");
    for (const callable of [
      "adminCreateV2GenerationPlan",
      "adminGetV2OwnerGeneratorWorkspace",
      "adminPrepareV2OwnerEpisodeDraft",
      "adminImportV2OwnerEpisodeStage",
      "adminPreviewContentStage",
      "adminConfirmV2OwnerEpisode",
    ])
      expect(admin).toContain(callable);
    expect(admin).toContain(
      "Подтвердить именно эту неизменяемую версию эпизода? Это не публикация и не релиз.",
    );
    expect(admin).toContain("Публикация этим экраном невозможна");
    expect(admin).toContain("learning_v2_owner_episode_editor.js");
    expect(admin).toContain("Визуальный редактор");
    expect(admin).toContain("12 сессий и 144 задания");
    expect(admin).toContain("v2OwnerPatchTaskField");
    expect(admin).toContain("Тип задания · задаётся шаблоном");
    expect(admin).toContain("Технический JSON");
    expect(admin).toContain("Начать с пустой структуры");
    expect(admin).toContain("createTechnicalSkeleton");
    expect(admin).toContain("Открыть тестовый пример 12×12");
    expect(admin).toContain("createNeutralTestFixture");
    expect(admin).toContain("Взять эталон как основу");
    expect(admin).toContain("promoteReferenceFixture");
    expect(admin).toContain("neutral_test_fixture");
    expect(admin).toContain(
      "Нейтральный тестовый пример нельзя отправить на сервер или опубликовать",
    );
  });

  test("builds the 32 empty episode slots through a published setup wizard while preserving raw JSON fallback", () => {
    expect(admin).toContain("Загрузить опубликованные настройки");
    expect(admin).toContain("adminGetV2OwnerGeneratorSetupCatalog");
    expect(admin).toContain("Создать 32 пустых эпизода");
    expect(admin).toContain("Array.from({ length:32 }");
    expect(admin).toContain("scope:'full_season'");
    expect(admin).toContain("Шаблоны заданий для всех E1–E32");
    expect(admin).toContain("Техническая команда JSON · аварийный режим");
    expect(admin).toContain("Ни одной фразы или задания система не сочинит.");
  });

  test("pins the owner delivery contract into the execution entry points", () => {
    expect(executionPlan).toContain(
      "[GENERATOR_DELIVERY_CONTRACT.md](./GENERATOR_DELIVERY_CONTRACT.md)",
    );
    expect(v2Readme).toContain(
      "[GENERATOR_DELIVERY_CONTRACT.md](./GENERATOR_DELIVERY_CONTRACT.md)",
    );
    expect(deliveryContract).toContain("оценка **5–10 агентов**");
    expect(deliveryContract).toContain(
      "Фраза «генератор готов на 100%» разрешена только если одновременно",
    );
    expect(deliveryContract).toContain("`admin/v2` запрещён");
    expect(deliveryContract).toContain("**Ash, Onyx, Nova, Coral**");
    expect(deliveryContract).toContain(
      "Следующая стадия начинается только после полного закрытия предыдущей",
    );
  });
});
