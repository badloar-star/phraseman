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

  test("прогрев занятия НЕ откладывается за кадры", () => {
    const from = source.indexOf("prewarmCurrentLearningV2SessionOnEntry();");
    expect(from).toBeGreaterThan(-1);
    // Окно в 400 символов перед вызовом: раньше здесь стояли два вложенных
    // requestAnimationFrame, и подготовка приходилась ровно на то окно, когда
    // человек уже видит карту и тапает.
    const before = source.slice(Math.max(0, from - 400), from);
    expect(before).not.toContain("requestAnimationFrame");
    expect(before).not.toContain("setTimeout");
    expect(before).not.toContain("InteractionManager");
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
