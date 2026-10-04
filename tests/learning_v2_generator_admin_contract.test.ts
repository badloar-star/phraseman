import fs from "node:fs";
import path from "node:path";

// зачем (04.10): прежние проверки встроенной в admin/legacy.html «Студии курса» и
// рабочего места владельца E1–E32 (7 этапов, импорт JSON, визуальный редактор, пустые
// слоты, нейтральный тестовый пример) сняты — этого экрана нет в единственной живой
// админке admin/v2/legacy.html (там остался только прежний вкладочный генератор E1).
// Автономная «Студия курса» (admin/learning-v2-generator.html) сторожится отдельно:
// tests/learning_v2_course_studio_admin_contract.test.ts. Здесь остались только
// проверки документов-контрактов, которые от админки не зависят.
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
