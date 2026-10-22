// зачем (решение владельца №42, вид A lesson-theory.html): теория урока Learning V2 грузится из сборки по уроку и языку,
// с откатом на английский и русский; раздел для занятия — по карте урока; задания — те же 4 типа, что в классике;
// кнопка в эпизоде — за флагом; сгенерированные файлы совпадают с черновиками «12 · ТЕОРИЯ».
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  LEARNING_V2_THEORY_BUTTON_ENABLED,
  __resetLearningV2TheoryCacheForTests,
  hasLearningV2TheoryV1,
  learningV2TheorySectionForSessionV1,
  loadLearningV2TheoryV1,
} from "../modules/learning-v2/theory/learning_v2_theory_v1";

const ROOT = join(__dirname, "..");

beforeEach(() => {
  __resetLearningV2TheoryCacheForTests();
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe("Learning V2 lesson theory", () => {
  test("lessons 1–14 exist on all 9 interface languages", () => {
    for (let lesson = 1; lesson <= 14; lesson += 1) {
      for (const lang of ["ru", "uk", "en", "es", "pt-BR", "vi", "id", "tr", "pl"]) {
        const theory = loadLearningV2TheoryV1(lesson, lang);
        expect(theory?.lang).toBe(lang);
        expect(theory!.sections.length).toBeGreaterThanOrEqual(10);
      }
    }
  });

  test("lesson 1 RU: title, open sections, all four drill types, examples with highlight", () => {
    const theory = loadLearningV2TheoryV1(1, "ru")!;
    expect(theory.title).toBe("I am, you are, it is");
    expect(theory.sections.filter((s) => s.defaultOpen).map((s) => s.num)).toEqual(["01", "02"]);
    const drills = theory.sections.flatMap((s) => s.blocks).filter((b) => b.kind === "drill");
    expect(drills.length).toBeGreaterThanOrEqual(4);
    for (const b of drills) expect(["choice", "spot_slip", "binary", "word_bank"]).toContain(b.kind === "drill" ? b.drill.type : "");
    const choice = drills.find((b) => b.kind === "drill" && b.drill.type === "choice");
    expect(choice && choice.kind === "drill" && choice.drill.type === "choice" ? [choice.drill.before, choice.drill.answer, choice.drill.after] : null).toEqual(["I", "am", "ready."]);
    const examples = theory.sections[0]!.blocks.find((b) => b.kind === "examples");
    expect(examples && examples.kind === "examples" ? examples.examples[0] : null).toEqual({ en: "I am ready.", translation: "Я готов / готова.", hi: "am" });
  });

  test("drill hints are in the file's language whatever key the classic helper reads", () => {
    const theory = loadLearningV2TheoryV1(1, "en")!;
    const drill = theory.sections.flatMap((s) => s.blocks).find((b) => b.kind === "drill" && b.drill.type === "choice");
    expect(drill && drill.kind === "drill" && drill.drill.type === "choice" ? drill.drill.why?.ru : "").toContain("about yourself");
  });

  test("episode opens on the section of its chapter (lesson 1 map), unknown session → first section", () => {
    const theory = loadLearningV2TheoryV1(1, "uk")!;
    expect(learningV2TheorySectionForSessionV1(theory, 1)).toBe("03");
    expect(learningV2TheorySectionForSessionV1(theory, 9)).toBe("06");
    expect(learningV2TheorySectionForSessionV1(theory, 56)).toBe("10");
    expect(learningV2TheorySectionForSessionV1(theory, null)).toBe("01");
  });

  test("every session 1–56 of lessons 1–14 opens an existing theory section on every language (координатор 22.10)", () => {
    for (let lesson = 1; lesson <= 14; lesson += 1) {
      for (const lang of ["ru", "uk", "en", "es", "pt-BR", "vi", "id", "tr", "pl"]) {
        const theory = loadLearningV2TheoryV1(lesson, lang)!;
        const nums = new Set(theory.sections.map((s) => s.num));
        for (let session = 1; session <= 56; session += 1) {
          const mapped = theory.sessionSection[String(session)];
          expect({ lesson, lang, session, ok: Boolean(mapped && nums.has(mapped)) }).toEqual({ lesson, lang, session, ok: true });
        }
      }
    }
  });

  test("missing language falls back to English, then Russian; unknown lesson → null with a reason", () => {
    expect(hasLearningV2TheoryV1(1, "xx")).toBe(true);
    expect(loadLearningV2TheoryV1(1, "xx")?.lang).toBe("en");
    expect(loadLearningV2TheoryV1(99, "ru")).toBeNull();
    expect((console.warn as jest.Mock).mock.calls.map((c) => String(c[0]))).toContain("[V2-THEORY] load_missing");
  });

  test("the episode button is behind a flag (off until Sverka signs off) and wired next to Words", () => {
    expect(LEARNING_V2_THEORY_BUTTON_ENABLED).toBe(false);
    const player = readFileSync(join(ROOT, "app", "learning_v2_direct_session_player_v1.tsx"), "utf8");
    expect(player).toContain('testID="learning-v2-footer-theory"');
    expect(player).toContain("LEARNING_V2_THEORY_BUTTON_ENABLED && typeof lessonOrdinal === \"number\"");
    expect(player).toContain("<LearningV2TheorySheet");
    expect(readFileSync(join(ROOT, "router.ctx.js"), "utf8")).toMatch(/\|dev_learning_v2_theory[|)]/u);
  });

  test("generated files match the theory drafts", () => {
    const out = execFileSync(process.execPath, [join(ROOT, "scripts", "build_learning_v2_theory.mjs"), "--check"], { cwd: ROOT, encoding: "utf8" });
    expect(JSON.parse(out.trim().split("\n").pop()!)).toMatchObject({ stale: [], problems: [] });
  });
});
