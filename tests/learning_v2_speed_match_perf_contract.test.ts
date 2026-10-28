// зачем (координатор 28.10, жалоба «Найди пару» тормозит): замок формы кода — тик таймера не перерисовывает сетку, плитка memo со стабильными
// обработчиками, пустая подсветка ошибки не будит рендер, журнал [SPEED-MATCH-PERF] на месте. Поведение таймера и пар держат соседние гейты
// (keep_pairs, timeout); здесь — только то, что делает упражнение быстрым.
import fs from "fs";
import path from "path";

const source = fs.readFileSync(path.join(process.cwd(), "modules", "learning-v2", "modes", "speed_match_mode_v1.tsx"), "utf8").replace(/\r\n/g, "\n");

describe("speed_match perf contract", () => {
  it("секунды таймера живут в отдельной читалке, а не в главном компоненте", () => {
    expect(source).toContain("const SpeedMatchTimerReadoutV1 = memo(");
    const main = source.slice(source.indexOf("export function SpeedMatchModeV1"));
    expect(main).not.toContain("useSpeedMatchTimerV1(");
    expect(main).not.toMatch(/\bsecondsLeft\b/);
    expect(main).toContain("<SpeedMatchTimerReadoutV1");
  });

  it("плитка memo: обработчик по pairId стабилен, стили не создаются заново на каждый рендер", () => {
    expect(source).toContain("const SpeedMatchCardV1 = memo(");
    expect(source).toContain("onPickPair={onPickLeft}");
    expect(source).toContain("onPickPair={onPickRight}");
    expect(source).toMatch(/const onPickLeft = useCallback\(\(pairId: string\) => pickRef\.current\.left\(pairId\), \[\]\)/);
    expect(source).toMatch(/const optionStyle = useMemo\(/);
    expect(source).toMatch(/const optionTextStyle = useMemo\(/);
    expect(source).not.toContain("onPress={() => chooseLeft(");
    expect(source).not.toContain("onPress={() => chooseRight(");
  });

  it("clearMismatch не создаёт новый Set, когда подсвечивать нечего", () => {
    expect(source).toMatch(/setWrongPairIds\(\(current\) => \(current\.size === 0 \? current : new Set\(\)\)\)/);
  });

  it("анимации плиток — reanimated на UI-треде, таймер — useFrameCallback с троттлингом", () => {
    expect(source).toContain("useAnimatedStyle(");
    expect(source).toContain("useFrameCallback(");
    expect(source).toContain("scheduleOnRN(setSecondsLeft, nextSeconds)");
  });

  it("журнал [SPEED-MATCH-PERF]: тап, перерисовки, кадры после тапа и ранний выход с причиной", () => {
    for (const mark of ["tap`", "frames_after_tap`", "tap_ignored`", "mount`"]) {
      expect(source).toContain("${PERF} " + mark);
    }
    expect(source).toContain('const PERF = "[SPEED-MATCH-PERF]"');
    expect(source).toMatch(/perfTapIgnored\("left", pairId, "already_matched"\)/);
    expect(source).toMatch(/perfTapIgnored\("right", pairId, "already_matched"\)/);
  });
});
