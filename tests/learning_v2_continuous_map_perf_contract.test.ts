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
    // Строки за окном не должны создавать хуков ВООБЩЕ: раньше
    // useAnimatedStyle стоял до раннего выхода и выполнялся для всех строк.
    expect(source).toContain("if (reducedMotion || distance > ENTRY_ANIMATED_ROWS) return body;");
    expect(source).toContain("LearningV2PulseMapEntryAnimatedMemo");
  });

  test("линия маршрута анимируется только рядом с текущим занятием", () => {
    // useAnimatedProps на каждой строке — постоянная работа на UI-треде.
    // Линия маршрута больше не SVG: react-native-svg монтировал отдельную
    // нативную поверхность на КАЖДУЮ строку (~62 одновременно).
    const from = source.indexOf("const renderMapRow = useCallback(");
    // Только тело renderMapRow: в списке уроков SVG-кольцо законно (32 строки).
    const rowBody = source.slice(from, source.indexOf("}, [active, c, completed", from));
    // Именно JSX-тег, а не упоминание в комментарии.
    expect(rowBody.includes("<Svg ") || rowBody.includes("<Svg>")).toBe(false);
    expect(source).toContain("connectorAngle");
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
    expect(source).toContain("const lead = atCourseStart ?");
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
    // Та же прозрачность, но обычным View вместо SVG-пути.
    expect(source).toContain("opacity: 0.35,");
  });

  test("модал знакомства не возвращается после закрытия", () => {
    // Владелец 20.09: «нажимаю кнопку на модале, открывается карта, затем
    // сразу моргает и открывается снова». Дев-гейт требовал СТРОГОГО
    // равенства счётчиков входа и закрытия, а счётчик входа рос на каждый
    // фокус экрана — закрытие отменялось задним числом.
    const gate = readFileSync(
      join(__dirname, "..", "app", "learning_v2_release_intro_receipt_v1.ts"),
      "utf8",
    );
    // Владелец 20.09: «модал должен и в дев показываться только единожды».
    // Отдельной дев-ветки со счётчиками в гейте больше нет.
    expect(gate).not.toContain("if (input.isDev) {");
    expect(gate).not.toContain("devDismissedEntryOrdinal === input.devEntryOrdinal");
    // И dismiss больше не выходит в DEV, не сохранив чек, — это и был корень.
    const lessons = readFileSync(
      join(__dirname, "..", "app", "(tabs)", "lessons.tsx"),
      "utf8",
    );
    expect(lessons).not.toContain("setLearningV2FounderDevDismissedEntryOrdinal(");
  });

  test("прокрутка не перерисовывает весь список", () => {
    // Владелец 20.09: «пролистнул до третьего урока — всё начало лагать».
    // Смена видимого урока писалась в useState экрана: перерисовывался весь
    // компонент, а с ним инлайновый renderItem — FlatList считал его новым и
    // заново рисовал все видимые строки. Чем глубже, тем чаще смена урока.
    expect(source).toContain("createMapViewStoreV1");
    expect(source).toContain("useSyncExternalStore");
    // Колбэки списка стабильны между рендерами.
    expect(source).toContain("renderItem={renderMapRow}");
    expect(source).toContain("keyExtractor={mapRowKeyV1}");
    expect(source).toContain("getItemLayout={getMapItemLayout}");
  });

  test("при открытии карты плашка главы не попадает в кадр", () => {
    // Владелец 20.09: «плашка ГЛАВА 1 в кадр попадать не должна, но если
    // проскроллить вверх — да».
    // Ровно 0: при 18 от главы (118px) снизу торчал огрызок в 18px —
    // владелец: «плашка глава 1 обрезается и вообще не попадает полностью».
    expect(source).toContain("const lead = atCourseStart ? 0 :");
  });

  test("карта не пересоздаётся: на ней нет key от generation", () => {
    // Владелец 20.09: «открывается с потушением экрана, а затем снова».
    // key={learningV2ProjectionScopeKey} заставлял React уничтожать карту и
    // строить заново, потому что generation читался вне зависимостей useMemo.
    const lessons = readFileSync(
      join(__dirname, "..", "app", "(tabs)", "lessons.tsx"),
      "utf8",
    );
    // Ищем реальный проп, а не упоминание в комментарии.
    expect(lessons).not.toMatch(/^\s*key=\{learningV2ProjectionScopeKey\}/m);
    expect(lessons).toContain("scopeKey={learningV2ProjectionScopeKey}");
  });

  test("на карте скрыт таббар и возвращается при уходе", () => {
    const lessons = readFileSync(
      join(__dirname, "..", "app", "(tabs)", "lessons.tsx"),
      "utf8",
    );
    expect(lessons).toContain('useHideTabBar(page === "v2")');
    const ctx = readFileSync(
      join(__dirname, "..", "components", "TabBarVisibilityContext.tsx"),
      "utf8",
    );
    // Счётчик, а не булев флаг: иначе размонтирование одного экрана покажет
    // таббар поверх другого, а двойной release уведёт счётчик в минус.
    expect(ctx).toContain("setHiddenCount");
    expect(ctx).toContain("Math.max(0, value - 1)");
    expect(ctx).toContain("if (released) return;");
  });

  test("в шапке карты нет заголовка урока, меняющегося при скролле", () => {
    // Владелец 20.09: «я не просил».
    expect(source).not.toContain("LearningV2PulseMapLessonTitle");
  });

  test("renderItem не зависит от всего объекта пропсов", () => {
    // Аудит 20.09: `props` в зависимостях useCallback делал его декоративным —
    // идентичность объекта пропсов меняется при КАЖДОМ рендере родителя, и
    // FlatList перестраивал все ~62 строки окна. Это и была главная причина.
    const from = source.indexOf("const renderMapRow = useCallback(");
    const depsAt = source.indexOf("}, [", from);
    const deps = source.slice(depsAt, source.indexOf("]);", depsAt));
    expect(deps).not.toMatch(/(^|[^.\w])props([^.\w]|$)/);
  });

  test("тяжёлые вычисления экрана мемоизированы", () => {
    // horizonsCopy строит объект на 27 ключей; findIndex идёт по 2048 строк.
    expect(source).toContain("useMemo(() => horizonsCopy(props.lang)");
    expect(source).toContain("rows.findIndex(row => row.kind === 'session' && row.state === 'current')");
    expect(source).toContain("[rows],");
  });

  test("гало узла не создаёт хук у каждого кружка", () => {
    // 2047 узлов из 2048 платили за маппер Reanimated, который им не нужен.
    const node = readFileSync(
      join(__dirname, "..", "components", "LearningV2MapNode.tsx"),
      "utf8",
    );
    expect(node).toContain("function LearningV2MapNodeHalo");
    // В теле самого узла haloStyle больше нет.
    const body = node.slice(node.indexOf("export const LearningV2MapNode"));
    expect(body).not.toContain("const haloStyle = useAnimatedStyle");
  });

  test("список знает стартовую позицию до первого кадра", () => {
    // Владелец 20.09: «показывает в самом верху, затем экран пропадает и
    // показывает как надо» — список рисовал кадр с нуля, потом его сдвигали.
    expect(source).toContain("contentOffset={initialOffset}");
  });

  test("прокрутка учитывает padding контейнера", () => {
    // Без него экран вставал выше строки ровно на padding, и снизу торчал
    // огрызок плашки главы (владелец: «глава 1 обрезается»).
    expect(source).toContain("geometry.padding + (layout.offsets[currentRowIndex] ?? 0) - lead");
  });

  test("нет отладочного лога, фильтрующего 2048 строк", () => {
    expect(source).not.toContain("[V2-MAP] layout");
  });

  test("у списка задан порог видимости строки", () => {
    // Без конфига onViewableItemsChanged зовётся почти на каждом кадре.
    expect(source).toContain("viewabilityConfig={MAP_VIEWABILITY_CONFIG}");
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
