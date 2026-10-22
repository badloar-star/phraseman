import { readFileSync } from "fs";
import { join } from "path";

/**
 * Сторож правила владельца 21.09:
 * «кружок не нажимается первые пару секунд… всё должно быть мгновенно,
 *  загрузки только в фоне и ЗАРАНЕЕ, чтобы вообще до входа на карту»,
 * «при этом ничего не стопорится и не блокируется, все кнопки обязаны
 *  нажиматься мгновенно с первого раза».
 *
 * Обычные тесты этот класс бага НЕ ловят: экран рендерится, узел нажимается,
 * обработчик существует. Ломается только ТАЙМИНГ — подготовка занятия попадает
 * в то же окно, где человек тапает.
 */
describe("Learning V2 map tap instant contract", () => {
  const source = readFileSync(
    join(__dirname, "..", "app", "(tabs)", "lessons.tsx"),
    "utf8",
  );

  /** Тело handleLearningV2SessionPress — от объявления до его списка зависимостей. */
  const pressHandler = (() => {
    const from = source.indexOf("const handleLearningV2SessionPress = useCallback(");
    expect(from).toBeGreaterThan(-1);
    const to = source.indexOf("const handleLearningV2SessionModalMounted", from);
    expect(to).toBeGreaterThan(from);
    return source.slice(from, to);
  })();

  test("нажатие на кружок ничего не ждёт: в обработчике нет await", () => {
    // Любой await здесь = кнопка «не нажимается с первого раза».
    expect(pressHandler).not.toContain("await ");
    // Обработчик не объявлен async — иначе await легко вернуть незаметно.
    expect(pressHandler).not.toContain("useCallback(async");
    expect(pressHandler).not.toContain("async (");
  });

  test("подготовка занятия только наблюдается, а не ожидается на пути тапа", () => {
    // void + .then: промис не стоит между тапом и открытием модалки.
    expect(pressHandler).toContain("void prewarmLearningV2SessionLaunch(");
    // Состояние модалки ставится синхронно в этом же кадре.
    expect(pressHandler).toContain("setSelectedLearningV2Session({");
    const prewarmAt = pressHandler.indexOf("void prewarmLearningV2SessionLaunch(");
    const modalAt = pressHandler.indexOf("setSelectedLearningV2Session({");
    // Модалка ставится РАНЬШЕ запуска подготовки — иначе подготовка попадёт
    // в тот же синхронный участок и отодвинет первый кадр модалки.
    expect(modalAt).toBeLessThan(prewarmAt);
  });

  // R08 🔴 (15.10, замер CPU на 5554 + Advisor): прогрев «сразу при входе» (21.09) держал JS-поток 6–10 с — карта не появлялась, касания
  // ждали. Требование владельца «ничего не стопорится» выполняется теперь так: прогрев после анимаций входа и паузы 600 мс, с отменой при
  // уходе; греется одно занятие, следующее — после готовности первого. Тап по занятию прогрев не ждёт.
  test("прогрев при входе — после взаимодействий и паузы, по одному занятию", () => {
    const from = source.indexOf("prewarmCurrentLearningV2SessionOnEntry();");
    expect(from).toBeGreaterThan(-1);
    const before = source.slice(Math.max(0, from - 700), from);
    expect(source).toMatch(/const task = InteractionManager\.runAfterInteractions\(\(\) => \{\s*timer = setTimeout\(waitIdle, IDLE_BEFORE_PREWARM_MS\);/);
    // 15.10 вечер (замер 5554): прогрев ждёт 2,5 с без касаний экрана «Обучения» — касание сбрасывает отсчёт
    expect(source).toContain("const IDLE_BEFORE_PREWARM_MS = 2500;");
    expect(source).toContain("onTouchStart={() => { lastLessonsTouchAtRef.current = Date.now(); }}");
    expect(before).toContain("if (idleMs < IDLE_BEFORE_PREWARM_MS) {");
    expect(source).toContain("[R08-PREP] entry_prewarm:run");
    expect(source).toMatch(/const warmAt = \(index: number\): void => \{[\s\S]{0,2600}warmAt\(index \+ 1\);[\s\S]{0,900}warmAt\(0\);/);
  });

  test("первый рендер и раскрытие главы не запускают тяжёлую подготовку", () => {
    // Каталог из 32 × 56 занятий материализуется синхронно. Его нельзя
    // собирать внутри initial render: в этот момент native не получит tap.
    const catalogState = source.slice(
      source.indexOf("const [learningV2Catalog, setLearningV2Catalog]"),
      source.indexOf("const [learningV2Progress, setLearningV2Progress]"),
    );
    expect(catalogState).not.toContain("peekLearningV2ActiveCourseCatalogV1(");
    expect(source).toContain("const learningV2WarmupEnabled = learningV2WarmupArmed;");
    // Прогресс — авторитет для current/locked/repeat, его нельзя заменять
    // placeholder-ом на время idle ожидания тяжёлого каталога.
    expect(source).toContain("const learningV2ProgressWarmupEnabled = page === \"v2\" || learningV2WarmupArmed;");
    const progressWarmupAt = source.indexOf("const learningV2ProgressWarmupEnabled");
    const progressEffectAt = source.indexOf("useFocusEffect(", progressWarmupAt);
    const catalogEffectAt = source.indexOf("useFocusEffect(", progressEffectAt + 1);
    const progressWarmup = source.slice(progressEffectAt, catalogEffectAt);
    expect(progressWarmup).toContain("if (!learningV2ProgressWarmupEnabled) return undefined;");

    // Нажатие раскрытия главы — это не idle. Оно может только перенести
    // фоновую работу, но не начать materialize/hash в окно следующего тапа.
    const expandedHandler = source.slice(
      source.indexOf("const handleLearningV2ExpandedLesson"),
      source.indexOf("const handleLearningV2VisibleSessionsSettled"),
    );
    expect(expandedHandler).not.toContain("prewarmLearningV2SessionLaunch(");
    const visibleHandler = source.slice(
      source.indexOf("const handleLearningV2VisibleSessionsSettled"),
      source.indexOf("const [learningV2DenialHint"),
    );
    expect(visibleHandler).not.toContain("prewarmLearningV2SessionLaunch(");
  });

  test("греется не только текущее занятие, но и следующее", () => {
    // После прохождения занятия следующий тап обязан быть тёплым.
    expect(source).toContain("sessionOrdinal: current.sessionOrdinal + 1");
  });

  test("каждый ранний выход прогрева называет причину", () => {
    // Запрет владельца на немой выход: иначе прогрев умирает молча и месяцами.
    for (const reason of [
      "no_current_coordinates",
      "beyond_last_session",
      "not_authored",
    ]) {
      expect(source).toContain(reason);
    }
  });
});
