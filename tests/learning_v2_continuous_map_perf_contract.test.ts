import { existsSync, readFileSync } from "node:fs";
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
  join(__dirname, "..", "components", "learning-v2", "LearningV2ChaptersCourse.tsx"),
  "utf8",
);

// зачем (координатор §49, 2026-10-02): сплошная карта LearningV2PulseCourse не рендерилась
// с 30.09 (карта = аккордеон глав LearningV2ChaptersCourse) и удалена; 21 кейсов,
// сторожившие её прокрутку, кружки и SVG-путь, сняты вместе с ней. Оставлены кейсы,
// которые относятся к живой карте и общим модулям раздела.
describe("Learning V2 continuous map performance contract", () => {
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
    // R08 (15.10, предохранитель): прячет только пока «Обучение» владеет экраном — иначе запоздавшее скрытие доезжало до Главной
    expect(lessons).toContain('useHideTabBar(page === "v2" && lessonsTabVisible)');
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

  test("нет отладочного лога, фильтрующего 2048 строк", () => {
    expect(source).not.toContain("[V2-MAP] layout");
  });

  test("тяжёлые модули данных не висят на открытии раздела", () => {
    // Аудит 20.09: при входе во вкладку синхронно разбирались ~2,2 МБ:
    // манифест 1172 КБ + записи озвучки 556 КБ + индекс озвучки 504 КБ.
    // Замер по логам: JS-тред был занят 2612 мс, тапы не доходили.
    // Оба нужны только при ЗАПУСКЕ занятия. Статический импорт их вернёт.
    const lessons = readFileSync(
      join(__dirname, "..", "app", "(tabs)", "lessons.tsx"),
      "utf8",
    );
    for (const heavy of [
      "learning_v2_lesson_audio_pack_v1",
      "learning_v2_course_released_session_client_v3",
    ]) {
      const staticImport = new RegExp(`^import \\{[^}]*\\} from "\\.\\./${heavy}"`, "m");
      expect(lessons).not.toMatch(staticImport);
    }
    // зачем (D47, владелец): координатор догрузки озвучки (плюс фоновая
    // задача) удалён целиком вместе со всеми способами СКАЧИВАНИЯ озвучки V2 —
    // раньше он статически тянул тот же тяжёлый аудиопак и в корне, и в фоне
    // (аудит 20.09, старт 19–46 с). Файлов больше нет — сторож проверяет, что
    // импорт удалённого модуля не вернулся (текст комментариев не считается).
    const deletedCoordinatorImport = /from ["'][^"']*learning_v2_audio_prefetch_coordinator_v1["']/;
    const deletedBackgroundImport = /from ["'][^"']*learning_v2_audio_prefetch_background_v1["']/;
    expect(lessons).not.toMatch(deletedCoordinatorImport);
    const layout = readFileSync(join(__dirname, "..", "app", "_layout.tsx"), "utf8");
    expect(layout).not.toMatch(deletedCoordinatorImport);
    expect(layout).not.toMatch(deletedBackgroundImport);
    // Загружаются лениво и ровно один раз (промис кэшируется).
    // R09 (15.10): ленивый загрузчик клиента занятий переехал в общий модуль запуска (вкладка и Главная — один путь)
    expect(readFileSync(join(__dirname, "..", "app", "learning_v2_session_launch_v1.ts"), "utf8")).toContain("loadLearningV2SessionClientV3");
    expect(lessons).toContain("prepareLearningV2SessionRunV1(");
    expect(lessons).toContain("loadLearningV2AudioPackV1");
    // Проверка «есть ли озвучка» идёт по лёгкому срезу, а не по 504 КБ.
    expect(lessons).toContain("learningV2HasPublishedAudioV1");
  });

  test("лёгкий срез озвучки совпадает с полным индексом", () => {
    // Технический долг среза: он дублирует список из большого индекса и обязан
    // обновляться вместе с ним. Без этой проверки расхождение было бы немым —
    // занятие с новой озвучкой просто не прогревалось бы.
    const readOrdinals = (text: string) => {
      const re =
        /(\d+):\s*Object\.freeze\(\{\s*sessionCount:\s*\d+,\s*sessionOrdinals:\s*Object\.freeze\(\[([0-9,]*)\]\)/g;
      const map = new Map<number, string>();
      let match: RegExpExecArray | null;
      while ((match = re.exec(text))) map.set(Number(match[1]), match[2]);
      return map;
    };
    const fullIndex = readOrdinals(
      readFileSync(
        join(__dirname, "..", "app", "learning_v2_factory_lesson_audio_index_v1.generated.ts"),
        "utf8",
      ),
    );
    const sliceText = readFileSync(
      join(__dirname, "..", "app", "learning_v2_published_audio_sessions_v1.generated.ts"),
      "utf8",
    );
    const sliceRe = /(\d+):\s*Object\.freeze\(\[([0-9,]*)\]\)/g;
    const slice = new Map<number, string>();
    let sliceMatch: RegExpExecArray | null;
    while ((sliceMatch = sliceRe.exec(sliceText))) {
      slice.set(Number(sliceMatch[1]), sliceMatch[2]);
    }
    expect(fullIndex.size).toBeGreaterThan(0);
    expect([...slice.keys()].sort()).toEqual([...fullIndex.keys()].sort());
    for (const [lesson, ordinals] of fullIndex) {
      expect(slice.get(lesson)).toBe(ordinals);
    }
  });

  // зачем (владелец 17.10: «этот модал удаляй полностью, он не нужен!!!»): окна «Пропуск основателя / Начать знакомство» нет —
  // ни компонента, ни гейта, ни квитанции «видел»; карта уроков и прогрев занятия от него не зависят.
  test("окна «Пропуск основателя» нет: ни компонента, ни гейта в «Уроках»", () => {
    expect(existsSync(join(__dirname, "..", "components", "learning-v2", "LearningV2FounderPassModal.tsx"))).toBe(false);
    expect(existsSync(join(__dirname, "..", "app", "learning_v2_release_intro_receipt_v1.ts"))).toBe(false);
    const lessons = readFileSync(join(__dirname, "..", "app", "(tabs)", "lessons.tsx"), "utf8");
    expect(lessons).not.toMatch(/LearningV2FounderPassModal|learningV2FounderPass|resolveLearningV2FounderPassGateV1|FounderPassReceipt/);
  });

  test("запреты владельца соблюдены в новых элементах", () => {
    // Многоточие и ужатие шрифта запрещены; текст переносится целиком.
    expect(source).not.toContain("adjustsFontSizeToFit");
    expect(source).not.toContain("ellipsizeMode");
  });
});
