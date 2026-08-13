import fs from "node:fs";
import path from "node:path";

const screenPath = path.join(
  process.cwd(),
  "app",
  "learning-v2",
  "lesson",
  "[id].tsx",
);
const source = fs.readFileSync(screenPath, "utf8");

describe("Learning V2 Lesson 1 map screen contract", () => {
  it("is a separate route and loads real local-first progress without touching legacy economy", () => {
    expect(source).toMatch(
      /createLesson1LocalProgressStore\(\s*AsyncStorage\s*,/,
    );
    expect(source).toContain("lesson1MapInputFromProgress(state)");
    expect(source).toContain("useState(fallbackModel)");
    expect(source).not.toMatch(/useEnergy|EnergyBar|registerXP|registerShards/);
  });

  it("keeps the long zigzag course, semantic actions and reduced-motion guardrails explicit", () => {
    expect(source).toMatch(
      /["']understand["'],\s*["']use["'],\s*["']master["']/,
    );
    expect(source).toContain("const PATH_WAVE");
    expect(source).toMatch(/kind:\s*["']episode["']\s*\|\s*["']checkpoint["']/);
    expect(source).toContain("Array.from({ length: 31 }");
    expect(source).toContain("height: 74");
    expect(source).toContain("Путь к свободной речи");
    expect(source).not.toContain("4 сектора · 32 эпизода · уроки и экзамены");
    expect(source).not.toContain("Тридцать два эпизода");
    expect(source).not.toContain("СЕКТОР 1 · ЭПИЗОД 1");
    expect(source).toContain("ТЕКУЩАЯ ТЕМА");
    expect(source).toContain("Знакомство");
    expect(source).toContain("SESSION_ZONE_META");
    expect(source).toMatch(/width:\s*40,\s*height:\s*40/);
    expect(source).toContain("useStableSafeAreaInsets");
    expect(source).toContain("useReducedMotion");
    expect(source).toContain("AppState.addEventListener");
    expect(source).toMatch(
      /FadeInDown\.delay\(\(node\.order - 1\) \* 40\)[\s\S]{0,80}\.duration\(320\)/,
    );
    expect(source).toContain("Easing.bezier(0.38, 0.7, 0.125, 1)");
    expect(source).toContain("<Modal");
    expect(source).toContain("onRequestClose={onClose}");
    expect(source).toContain('accessibilityLabel="Закрыть"');
    expect(source).toContain("Gesture.Pan()");
    expect(source).toContain("dragY.value > 88 || event.velocityY > 900");
    expect(source).not.toContain("Открыть словарь первого эпизода");
    expect(source).not.toContain("Открыть теорию первого эпизода");
  });

  it("shows a presentation-only session reward without pretending it is the wallet balance", () => {
    expect(source).toContain("parseLearningV2SessionResultRouteParams");
    expect(source).toContain("РЕЗУЛЬТАТ СЕССИИ СОХРАНЁН");
    expect(source).toContain("Общий баланс обновляется отдельно");
    expect(source).toContain('accessibilityLiveRegion="polite"');
    expect(source).toMatch(
      /systemReducedMotion\s*\?\s*FadeInDown\.duration\(1\)/,
    );
  });

  it("hydrates and announces only the authoritative shared star wallet", () => {
    expect(source).toMatch(
      /useState\(\s*peekCurrentLearningV2WalletBalance\s*[,)]/,
    );
    expect(source).toContain("subscribeLearningV2WalletBalance(refresh)");
    expect(source).toContain("hydrateCurrentLearningV2WalletBalance()");
    expect(source).toContain(
      "walletBalance.balanceSubunits / WALLET_SUBUNITS_PER_STAR",
    );
    expect(source).toContain('accessibilityLiveRegion="polite"');
    expect(source).toContain("Подтверждённый баланс:");
  });
});
