// Текущий вход V2 обязан вести к новому проверяемому вертикальному срезу, а не
// к старой тупиковой заглушке. При этом забракованный Kimi/session-прототип не
// возвращается: рабочая карта и раннер живут в app/learning-v2.
import fs from "node:fs";
import path from "node:path";

const read = (rel: string) =>
  fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const exists = (rel: string) => fs.existsSync(path.join(process.cwd(), rel));

const lessonsSource = read("app/(tabs)/lessons.tsx");
const labSource = read("components/learning-v2-lab/LearningV2ModesLab.tsx");
const mapSource = read("app/learning-v2/lesson/[id].tsx");
const sessionSource = read("app/learning-v2/session/[id].tsx");

describe("lessons V2 — одна карта раскрывается прямо под плашкой урока", () => {
  test("V2 переиспользует обычные LessonCard и раскрывает только выбранный урок", () => {
    expect(lessonsSource).toMatch(/ENABLE_DEV_TOOLS/);
    expect(lessonsSource).toMatch(
      /useState<\s*["']lessons["']\s*\|\s*["']dialogs["']\s*\|\s*["']v2["']/,
    );
    expect(lessonsSource).toMatch(/label="V2"/);
    expect(lessonsSource).toMatch(/setPage\(["']v2["']\)/);
    expect(lessonsSource).toMatch(/learningV2=\{page\s*===\s*["']v2["']\}/);
    expect(lessonsSource).toContain(
      "buildLearningV2CourseAccordionMapFromPreparedProgressV1",
    );
    expect(lessonsSource).toContain("expandedLearningV2Lesson");
    expect(lessonsSource).toContain("LearningV2InlineMapRow");
    expect(lessonsSource).toContain('kind: "v2_chapter"');
    expect(lessonsSource).toContain('kind: "v2_session"');
    expect(lessonsSource).not.toContain("function LearningV2InlineMap(");
    expect(lessonsSource).toMatch(
      /current\s*===\s*lessonOrdinal\s*\?\s*null\s*:\s*lessonOrdinal/,
    );
    expect(lessonsSource).not.toContain("<LearningV2ModesLab");
  });

  test("забракованная витрина Kimi не возвращается ни под каким видом", () => {
    expect(labSource).not.toMatch(
      /ModeDemoPlayer|LAB_MODE_CATALOG|kimi\/registry/,
    );
  });

  test("снесённый Kimi session-прототип не возвращается", () => {
    expect(exists("components/learning-v2-lab/session")).toBe(false);
    expect(labSource).not.toMatch(/\.\/session\//);
    expect(labSource).not.toMatch(
      /SessionRunner|UnitMap|ZoneCeremony|PracticeLab/,
    );
  });

  test("переиспользуемый слой kimi (токены/примитивы/голос) сохранён", () => {
    // Хендовер §4: tokens/primitives/use_voice_capture — переиспользуемое.
    expect(exists("components/learning-v2-lab/kimi/tokens.ts")).toBe(true);
    expect(exists("components/learning-v2-lab/kimi/primitives.tsx")).toBe(true);
    expect(exists("components/learning-v2-lab/kimi/use_voice_capture.ts")).toBe(
      true,
    );
  });

  test("старая лаборатория остаётся отдельным dev-инструментом, но не вклинивается в путь пользователя", () => {
    expect(labSource).toContain("LearningV2ModesLab");
    expect(lessonsSource).not.toMatch(/import LearningV2ModesLab/);
  });

  test("course route показывает те же плашки и 56 inline-сессий выбранного урока", () => {
    const courseSource = read("app/learning-v2/course.tsx");
    expect(courseSource).toContain(
      'import LessonsTab from "../(tabs)/lessons"',
    );
    expect(courseSource).toContain(
      '<LessonsTab presentation="push" initialPage="v2" />',
    );
    expect(sessionSource).toContain('pathname: "/learning-v2/course"');
    expect(mapSource).toContain("buildLessonMapModel");
    expect(mapSource).toContain("buildLessonRoadItems");
    expect(mapSource).toContain("LEARNING_V2_LESSON_SESSION_COUNT_V1");
    expect(mapSource).toContain("КАРТА УРОКА");
    expect(mapSource).toContain("Ты научишься");
    expect(mapSource).toContain("useTheme()");
    expect(mapSource).not.toContain("Путь к свободной речи");
    // зачем (аудит по Библии, 2026-08-26): «вы» → «ты» (Правило 14).
    // Проверяется наличие всех трёх обещаний, а не форма обращения.
    expect(lessonsSource).toContain("Ты поймёшь");
    expect(lessonsSource).toContain("Что ты поймёшь");
    expect(lessonsSource).toContain("Чему научишься");
    expect(lessonsSource).toContain("Что сможешь делать");
    expect(lessonsSource).not.toContain("Обычно 14–18 шагов");
    expect(lessonsSource).toContain("setSelectedLearningV2Session(null)");
    expect(lessonsSource).toContain("requestAnimationFrame(() =>");
  });
});
