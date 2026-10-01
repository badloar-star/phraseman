// Сторож D150: публикация авторского курса en блокируется, пока урок 1
// расходится со встроенным релизом (набор новых слов или профиль занятия).
import { HttpsError } from "firebase-functions/v2/https";
import { assertLesson1ReleaseParityForPublishV1 } from "./learning_v2_publish_authored_course_v1";

const sessions = [{ requiredSessionOrdinal: 1 }] as never;

describe("lesson 1 release parity guard for authored publish (D150)", () => {
  beforeEach(() => {
    jest.spyOn(console, "info").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  test("does not gate non-English courses", () => {
    const compute = jest.fn(() => [{ sessionOrdinal: 1, field: "newWords", release: "a", authored: "b" }] as never);
    expect(() => assertLesson1ReleaseParityForPublishV1("es", sessions, compute)).not.toThrow();
    expect(compute).not.toHaveBeenCalled();
  });

  test("refuses English publish when lesson 1 diverges and logs the reason", () => {
    const mismatch = { sessionOrdinal: 1, field: "interactionProfile", release: "standard", authored: "rapid" };
    let caught: unknown;
    try {
      assertLesson1ReleaseParityForPublishV1("en", sessions, () => [mismatch] as never);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(HttpsError);
    expect((caught as HttpsError).code).toBe("failed-precondition");
    expect((caught as HttpsError).message).toBe("publish_lesson1_diverges_from_release");
    expect((caught as HttpsError).details).toMatchObject({ count: 1, first: [mismatch] });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[PUBLISH-PARITY] refused"),
      expect.objectContaining({ count: 1 }),
    );
  });

  test("fails closed when the bundled release reference cannot be read", () => {
    expect(() => assertLesson1ReleaseParityForPublishV1("en", sessions, () => {
      throw new Error("Cannot find module './generated_release/en/l01/s01/intro.json'");
    })).toThrow("publish_lesson1_release_reference_unavailable");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("reference unavailable"),
      expect.objectContaining({ reason: expect.stringContaining("Cannot find module") }),
    );
  });

  test("allows English publish only when lesson 1 matches the release", () => {
    expect(() => assertLesson1ReleaseParityForPublishV1("en", sessions, () => [])).not.toThrow();
  });
});
