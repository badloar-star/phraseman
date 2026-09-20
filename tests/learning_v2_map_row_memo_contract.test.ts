import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Сторож прокрутки карты Learning V2.
 *
 * Владелец 20.09: «исправь скролл чтобы он не подтормаживал даже если мы
 * скроллим до 1770 сессии». Полный курс — 32 урока × 56 занятий плюс плашки
 * уроков и глав, около 2048 строк.
 *
 * Корень лагов был не в настройках FlatList (они как раз верные), а в самой
 * строке: она рисовалась голым JSX внутри renderMapRow, поэтому переиспользование
 * ячейки перерисовывало всё поддерево — SVG-холст, узел, две иконки, две
 * подписи — и так для ~62 строк окна.
 *
 * Обычные тесты этого не ловят: они работают на моках и остаются зелёными,
 * пока экран лагает. Поэтому сторожим сам код.
 */
const row = readFileSync(
  join(__dirname, "..", "components", "learning-v2", "LearningV2PulseMapSessionRow.tsx"),
  "utf8",
);

describe("Learning V2 map row memo contract", () => {
  test("строка занятия обёрнута в memo", () => {
    // Без memo переиспользование ячейки перерисовывает всё поддерево строки.
    expect(row).toMatch(/export const LearningV2PulseMapSessionRow = memo\(/);
  });

  test("пропсы строки — примитивы, без темы и локализации целиком", () => {
    // Объект темы и объект локализации получают новую идентичность на каждый
    // рендер родителя. Приняв их целиком, memo стал бы декоративным — ровно
    // тот дефект, из-за которого прокрутка и тормозила.
    const propsBlock = row.slice(
      row.indexOf("export interface LearningV2PulseMapSessionRowProps"),
      row.indexOf("function LearningV2PulseMapSessionRowImpl"),
    );
    expect(propsBlock.length).toBeGreaterThan(0);
    for (const forbidden of [
      "theme",
      "ReturnType<typeof horizonsCopy>",
      // Тип строки модели целиком: приняв его, компонент снова начнёт зависеть
      // от объекта, который родитель пересобирает.
      ": SessionRow",
      ": MapRow",
      "readonly row:",
    ]) {
      expect(propsBlock).not.toContain(forbidden);
    }
    // И сам файл не должен импортировать модель строк карты.
    expect(row).not.toMatch(/import .*course_accordion_map_model_v1/);
  });

  test("обработчик нажатия не пересоздаётся инлайново", () => {
    // Инлайновая стрелка в onPress делала пропс новым каждый рендер и
    // обнуляла memo самого LearningV2MapNode — узел перерисовывался всегда.
    expect(row).toContain("const handlePress = useCallback(");
    expect(row).toContain("onPress={handlePress}");
    expect(row).not.toMatch(/onPress=\{\(\)\s*=>/);
  });

  test("стили строки лежат в StyleSheet, а не собираются в рендере", () => {
    // Объектные литералы стилей в теле рендера — новая ссылка на каждую
    // строку в каждом кадре прокрутки.
    expect(row).toContain("const styles = StyleSheet.create({");
  });

  test("дужка рисуется SVG по координатам узлов", () => {
    // Замена SVG повёрнутым View уже проваливалась: концы отрезка не
    // совпадали с центрами кружков и палки уехали мимо (владелец 20.09
    // прислал скриншот). Возврат к повороту ломает вид карты.
    expect(row).toContain("<Path");
    expect(row).not.toContain("rotate: `");
  });
});
