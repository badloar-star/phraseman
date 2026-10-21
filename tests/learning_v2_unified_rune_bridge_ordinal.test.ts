// зачем (Ревизор к 40ecaaa65): пустой номер урока/занятия давал общий ключ «lv2_en_x_x» — все такие занятия делили
// одно начисление. Без обоих номеров мост не начисляет вовсе и пишет [COINS-AWARD] unified:skip reason=missing_ordinal.
const settle = jest.fn(async () => ({ ok: true }));
jest.mock("../app/practice_rune_settlement", () => ({
  settlePracticeRuneEarningsToServer: (...args: unknown[]) => settle(...(args as [])),
}));

/* eslint-disable import/first -- settlement mocked first */
import { creditLearningV2SessionRunesToUnifiedWallet } from "../app/learning_v2_unified_rune_bridge";
/* eslint-enable import/first */

beforeEach(() => {
  settle.mockClear();
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe("Learning V2 → unified wallet bridge ordinals", () => {
  test.each([
    [null, 3],
    [2, undefined],
    ["", 1],
    [Number.NaN, 1],
  ])("missing ordinal (%p, %p) does not credit and logs the reason", async (lessonOrdinal, sessionOrdinal) => {
    await creditLearningV2SessionRunesToUnifiedWallet({ targetLanguage: "en", lessonOrdinal, sessionOrdinal, runes: 30 });
    expect(settle).not.toHaveBeenCalled();
    const lines = (console.warn as jest.Mock).mock.calls.map((call) => String(call[0]) + " " + String(call[1] ?? ""));
    expect(lines.some((line) => line.includes("[COINS-AWARD] unified:skip") && line.includes("missing_ordinal"))).toBe(true);
  });

  test("both ordinals present → credits once under a per-session key", async () => {
    await creditLearningV2SessionRunesToUnifiedWallet({ targetLanguage: "en", lessonOrdinal: 1, sessionOrdinal: 8, runes: 30 });
    expect(settle).toHaveBeenCalledTimes(1);
    const earnings = (settle.mock.calls[0] as unknown[])[0] as { creditedItemIds: readonly string[] };
    expect(earnings.creditedItemIds[0]).toContain("lv2_en_1_8");
  });
});
