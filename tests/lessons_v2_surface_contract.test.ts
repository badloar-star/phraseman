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

describe("lessons V2 — прямой вход в длинную карту курса", () => {
  test("V2 открывает карту сразу, без промежуточной страницы Урок 1", () => {
    expect(lessonsSource).toMatch(/ENABLE_DEV_TOOLS/);
    expect(lessonsSource).toMatch(/useState<\s*'lessons'\s*\|\s*'dialogs'/);
    expect(lessonsSource).toMatch(/label="V2"/);
    expect(lessonsSource).toContain(
      "router.push('/learning-v2/lesson/1' as any)",
    );
    expect(lessonsSource).not.toContain("setPage('v2')");
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

  test("карта показывает весь сезон зигзагом и виртуализирует длинный путь", () => {
    expect(mapSource).toContain("АНГЛИЙСКИЙ · A1");
    expect(mapSource).not.toContain(
      "4 сектора · 32 эпизода · уроки и экзамены",
    );
    expect(mapSource).toContain("Array.from({ length: 31 }");
    expect(mapSource).toMatch(/["']One independent day["']/);
    expect(mapSource).toContain("COURSE_CHAPTERS");
    expect(mapSource).toContain("<FlatList");
    expect(mapSource).not.toMatch(
      /sessionConnector|futureConnector|connectorStyle/,
    );
    expect(mapSource).toContain("PATH_WAVE");
    expect(mapSource).toContain("height: 74");
    expect(mapSource).toContain("Путь к свободной речи");
    expect(mapSource).not.toContain("СЕКТОР 1 · ЭПИЗОД 1");
    expect(mapSource).toContain("ТЕКУЩАЯ ТЕМА");
    expect(mapSource).toContain("Знакомство");
    expect(mapSource).toContain("SESSION_ZONE_META");
    expect(mapSource).toContain("EPISODE_ICONS");
    expect(mapSource).toContain("mapDecorationAt");
    expect(
      exists("assets/images/learning_v2_map/phraseman-map-guide-v1.webp"),
    ).toBe(true);
    expect(
      exists("assets/images/learning_v2_map/phraseman-map-chest-v1.webp"),
    ).toBe(true);
    expect(
      exists("assets/images/learning_v2_map/phraseman-map-sign-v1.webp"),
    ).toBe(true);
    expect(
      exists("assets/images/learning_v2_map/phraseman-map-exam-v1.webp"),
    ).toBe(true);
    expect(mapSource).toMatch(
      /kind:\s*checkpoint\s*\?\s*["']checkpoint["']\s*:\s*["']episode["']/,
    );
    expect(mapSource).not.toContain("<ScrollView");
  });
});
