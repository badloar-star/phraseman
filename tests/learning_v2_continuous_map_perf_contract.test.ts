import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Сторож производительности сплошной карты Learning V2.
 *
 * Повод (владелец, 20.09.2026): «КАРТА ТОРМОЗИТ НЕВЕРОЯТНО И ПРИ СКРОЛЛЕ И ПРИ
 * ВХОДЕ, ЭКРАН ПРИ ВХОДЕ МОРГАЕТ». Причина была не в одной строке, а в классе
 * решения: карта выросла с 56 строк до 1824, а оформление осталось прежним —
 * анимированная обёртка и анимированный SVG-путь на КАЖДОЙ строке.
 *
 * Обычные тесты этого не ловят: они работают на моках и остаются зелёными,
 * пока экран лагает. Поэтому сторожим сам код.
 */
const source = readFileSync(
  join(__dirname, "..", "components", "learning-v2", "LearningV2PulseCourse.tsx"),
  "utf8",
);

describe("Learning V2 continuous map performance contract", () => {
  test("вступительная анимация ограничена окном вокруг текущего занятия", () => {
    // Анимировать все 1824 строки — это и есть «тормозит невероятно».
    expect(source).toMatch(/const ENTRY_ANIMATED_ROWS = \d+;/);
    const limit = Number(/const ENTRY_ANIMATED_ROWS = (\d+);/.exec(source)?.[1]);
    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThanOrEqual(16);
    // Строки за пределами окна обязаны рендериться без Animated.View.
    expect(source).toContain("distanceFromCurrent > ENTRY_ANIMATED_ROWS");
  });

  test("линия маршрута анимируется только рядом с текущим занятием", () => {
    // useAnimatedProps на каждой строке — постоянная работа на UI-треде.
    expect(source).toContain("animated={Math.abs(index - currentRowIndex) <= ENTRY_ANIMATED_ROWS}");
    expect(source).toContain("if (!animated) {");
  });

  test("вступление играет один раз за жизнь экрана", () => {
    // mapEntry сбрасывался в 0 при каждом закрытии списка уроков, и карта
    // заново проявлялась из прозрачности — отсюда «экран при входе моргает».
    expect(source).toContain("if (entryPlayed.current) return;");
    expect(source).toContain("entryPlayed.current = true;");
  });

  test("список карты остаётся виртуализованным", () => {
    // ScrollView с map() по 1824 строкам положит раздел.
    expect(source).toContain("getItemLayout=");
    expect(source).toMatch(/windowSize=\{\d+\}/);
    expect(source).not.toMatch(/rows\.map\(/);
  });

  test("смещения строк считаются картой высот, а не одним шагом", () => {
    // Строки разной высоты: плашка урока — разворот, глава ниже, занятие ещё
    // ниже. Единый шаг ломал позиции и заставлял ужимать плашку.
    expect(source).toContain("layout.offsets[index]");
    expect(source).toContain("LESSON_PLATE_HEIGHT");
    expect(source).toContain("CHAPTER_HEAD_HEIGHT");
  });

  test("карта показывает уроки, главы и занятия", () => {
    // Главы уже один раз потерялись: фильтр оставлял только занятия и уроки.
    expect(source).toContain("row.kind === 'chapter'");
    expect(source).toContain("LearningV2PulseCourseChapterHead");
    expect(source).toContain("LearningV2PulseCourseLessonPlate");
  });

  test("подпись занятия живёт в строке, а не в кластере узла", () => {
    // nodeCluster шириной ровно с кружок: на Android всё, что выходит за его
    // границы, не рисуется — именно поэтому названий не было видно.
    const labelStyle = /nodeLabel: \{[^}]*\}/.exec(source)?.[0] ?? "";
    expect(labelStyle).not.toContain("'100%'");
    expect(source).toContain("pulseSessionTitle(");
  });

  test("подпись стоит ПОД кружком и не упирается в край экрана", () => {
    // Владелец 20.09: «тексты обрезаются экраном, делай их под кнопками».
    // Сбоку не помещалось: змейка уводит кружок на ±71px от центра.
    const labelStyle = /nodeLabel: \{[^}]*\}/.exec(source)?.[0] ?? "";
    // Тянется на всю ширину строки (left+right), а не фиксированной шириной.
    expect(labelStyle).toContain("width: 206");
    // Позиция по вертикали задаётся из геометрии кружка в самом рендере.
    expect(source).toContain("top: 6 + geometry.nodeSize + 6");
    // Подпись центрируется ПО КРУЖКУ: двигается тем же смещением, что узел.
    expect(source).toContain("transform: [{ translateX: nodeOffsetX }]");
  });

  test("в шаге карты есть место под подпись", () => {
    const geometry = readFileSync(
      join(__dirname, "..", "components", "learning-v2", "learningV2PulseGeometry.ts"),
      "utf8",
    );
    // Кружок 101 + подпись в две строки: базовый шаг 128 оставлял 27px,
    // и соседние подписи налезали друг на друга.
    expect(geometry).toContain("SESSION_LABEL_BLOCK");
    expect(geometry).toContain("MAP_STEP_WITH_LABEL");
    const block = Number(/const SESSION_LABEL_BLOCK = (\d+);/.exec(geometry)?.[1]);
    expect(block).toBeGreaterThanOrEqual(32);
  });

  test("плашки урока и главы — настоящие карточки, текст по центру", () => {
    // Владелец 20.09: «плашки должны быть ПЛАШКАМИ на карте, а не просто
    // текстом», «текст отцентрирован и красиво подан, очень премиально».
    expect(source).toContain("styles.plateCard");
    expect(source).toContain("styles.chapterCard");
    for (const style of ["plateCard", "chapterCard"] as const) {
      const from = source.indexOf(`${style}: {`);
      expect(from).toBeGreaterThan(-1);
      const block = source.slice(from, source.indexOf("},", from));
      expect(block).toContain("borderRadius");
      expect(block).toContain("alignItems: 'center'");
      // Цвет подложки приходит из темы инлайном — плашка не «просто текст».
      expect(source).toContain(`styles.${style}, { backgroundColor: t.bgCard }`);
    }
    for (const style of ["plateTitle", "plateKicker", "plateArc", "chapterTitle", "chapterNum"] as const) {
      const block = new RegExp(`${style}: \{[^}]*\}`).exec(source)?.[0] ?? "";
      expect(block).toContain("textAlign: 'center'");
    }
  });

  test("первое занятие курса показывается вверху, а не по центру", () => {
    // Владелец 20.09: «когда урок 1 сессия 1 — она должна быть ВВЕРХУ».
    expect(source).toContain("const atCourseStart =");
    // Индекс строки сюда не годится: занятие 1 лежит на индексе 2 (перед ним
    // плашка урока и глава). Признак начала — урок 1, глава 1.
    expect(source).toContain("currentSession.lessonOrdinal === 1");
    expect(source).toContain("currentSession.chapterOrdinal === 1");
    expect(source).toContain("const lead = atCourseStart ? 0 :");
  });

  test("модель карты не строится дважды", () => {
    // Вторая сборка давала 2048 строк на каждое изменение прогресса и
    // блокировала вход в раздел.
    const lessons = readFileSync(
      join(__dirname, "..", "app", "(tabs)", "lessons.tsx"),
      "utf8",
    );
    expect(lessons).not.toContain("const learningV2Accordion = useMemo(");
    expect(lessons).not.toContain("learningV2Accordion.rows");
  });

  test("прокрутку не отбрасывает назад при дорисовке строк", () => {
    // Владелец 20.09: «если скроллит вниз, оно отбрасывает назад вверх само».
    // centerCurrent висит на onContentSizeChange, а размер контента меняется
    // при каждой дорисовке строк — наведение обязано быть одноразовым.
    expect(source).toContain("centeredOnce.current");
    expect(source).toContain("if (!viewport.height || centeredOnce.current) return;");
  });

  test("при быстром скролле строки успевают рисоваться", () => {
    // removeClippedSubviews вырезал строки и оставлял пустоту на флике.
    expect(source).not.toContain("removeClippedSubviews");
    const win = Number(/windowSize=\{(\d+)\}/.exec(source)?.[1]);
    expect(win).toBeGreaterThanOrEqual(9);
  });

  test("дорожка маршрута полупрозрачная", () => {
    expect(source).toContain("strokeOpacity={opacity}");
    expect(source).toContain("opacity={0.35}");
  });

  test("на карте есть кнопка возврата к текущему занятию", () => {
    expect(source).toContain("learning-v2-pulse-back-to-current");
    expect(source).toContain("currentOffscreen");
  });

  test("модал «Начать знакомство» закрывается мгновенно", () => {
    // Владелец 20.09: «кнопка Начать знакомство блокируется». onDismiss ждал
    // конца анимации: 180мс тап выглядел мёртвым, а при прерывании анимации
    // не вызывался вовсе и модал залипал.
    const modal = readFileSync(
      join(__dirname, "..", "components", "learning-v2", "LearningV2FounderPassModal.tsx"),
      "utf8",
    );
    expect(modal).not.toContain("if (finished) onDismiss();");
    // Первое вхождение — ветка reduceMotion, она и так мгновенная.
    // Проверяем основную: закрытие вызывается ДО анимации, а не в её колбэке.
    const first = modal.indexOf("onDismiss();");
    const main = modal.indexOf("onDismiss();", first + 1);
    expect(main).toBeGreaterThan(-1);
    expect(modal.slice(main, main + 160)).toContain("Animated.timing");
  });

  test("запреты владельца соблюдены в новых элементах", () => {
    // Многоточие и ужатие шрифта запрещены; текст переносится целиком.
    expect(source).not.toContain("adjustsFontSizeToFit");
    expect(source).not.toContain("ellipsizeMode");
  });
});
