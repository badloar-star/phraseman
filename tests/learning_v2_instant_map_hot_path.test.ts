import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("Learning V2 instant inline map hot path", () => {
  test("accordion projection never builds or hashes canonical topology", () => {
    const source = read(
      "modules/learning-v2/map/course_accordion_map_model_v1.ts",
    );

    expect(source).not.toContain("buildLearningV2CourseTopologyV1");
    expect(source).not.toContain("hashCanonicalBody");
    expect(source).toContain("LEARNING_V2_LESSON_SESSION_COUNT_V1");
    expect(source).toContain("projectionScopeKey: string;");
    expect(source).not.toContain("projectionScopeKey?: string;");
  });

  test("renders V2 chapter and session rows as outer virtualized list items", () => {
    const source = read("app/(tabs)/lessons.tsx");

    expect(source).toContain('kind: "v2_chapter"');
    expect(source).toContain('kind: "v2_session"');
    expect(source).toContain("LearningV2InlineMapRow");
    expect(source).not.toContain("function LearningV2InlineMap(");
    expect(source).not.toMatch(/<LearningV2InlineMap\s/);
  });

  test("keeps map rows visible from their first frame without a long stagger hold", () => {
    const source = read("components/LearningV2InlineNodeReveal.tsx");

    expect(source).toContain("FIRST_FRAME_OPACITY");
    expect(source).toContain("reduceMotion: boolean;");
    expect(source).not.toContain("useReduceMotion");
    expect(source).not.toContain("REVEAL_MAX_DELAY_MS = 130");
    expect(source).not.toMatch(/opacity:\s*progress\.value[,}]/);
  });

  test("prepares once and performs only an O(1) prepared-cache lookup on press", () => {
    const source = read("app/(tabs)/lessons.tsx");
    const prepareBlock = source.slice(
      source.indexOf("const prepareLearningV2Lesson = useCallback("),
      source.indexOf(
        "useEffect(() => {",
        source.indexOf("const prepareLearningV2Lesson = useCallback("),
      ),
    );

    expect(source).toContain("prepareLearningV2CourseAccordionProgressV1");
    expect(source).toContain(
      "buildLearningV2CourseAccordionMapFromPreparedProgressV1",
    );
    expect(source).toContain("onLearningV2PressIn={prepareLearningV2Lesson}");
    expect(prepareBlock).toContain(
      "preparedProgress: learningV2PreparedProgress",
    );
    expect(prepareBlock).not.toContain("completedSessionIds");
    expect(prepareBlock).not.toContain("setExpandedLearningV2Lesson");
    expect(prepareBlock).not.toContain("await ");
    expect(prepareBlock).not.toContain("AsyncStorage");
    expect(source).toContain("InteractionManager.runAfterInteractions");
  });

  test("shows inserted rows immediately and respects unresolved reduced-motion preference", () => {
    const lessonsSource = read("app/(tabs)/lessons.tsx");
    const revealSource = read("components/LearningV2InlineNodeReveal.tsx");
    const reduceMotionSource = read("hooks/use_reduce_motion.ts");

    expect(lessonsSource).toContain(
      "animateNextLayoutShiftWithoutEntryFade(160)",
    );
    expect(lessonsSource).not.toContain("animateNextLayoutTransition(160)");
    expect(lessonsSource).toContain(
      "learningV2ReduceMotionPreference === false",
    );
    expect(lessonsSource).toContain(
      "reduceMotion={learningV2ReduceMotionPreference !== false}",
    );
    expect(revealSource).toContain(
      "const progress = useSharedValue(reduceMotion ? 1 : 0)",
    );
    expect(reduceMotionSource).toContain(
      "export function useReduceMotionPreference(): boolean | null",
    );
    expect(reduceMotionSource).toContain("useState<boolean | null>(null)");
  });

  test("preserves the expanded accessibility state on lesson cards", () => {
    const source = read("app/(tabs)/lessons.tsx");

    expect(source).toContain(
      "learningV2 ? { expanded: learningV2Expanded } : undefined",
    );
  });
});
