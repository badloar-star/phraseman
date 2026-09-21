import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Сторож порядка объявлений в карте Learning V2.
 *
 * ПОВОД (2026-09-21): `mapContentTop` был объявлен СТРОКОЙ ВЫШЕ `geometry`,
 * который он использует. `const` не поднимается (temporal dead zone), поэтому
 * на каждом рендере падало `Cannot read property 'padding' of undefined`, и
 * раздел уроков не открывался ВООБЩЕ — весь экран уходил в ErrorBoundary.
 *
 * Почему нужен отдельный сторож: `tsc --noEmit` этот случай НЕ ловит (внутри
 * тела функции он не проверяет порядок инициализации), типы были полностью
 * зелёными. Нашлось только живым логом Metro с телефона.
 *
 * Сработал — переставить объявление, а не ослаблять проверку.
 */

const SOURCE = readFileSync(
  "components/learning-v2/LearningV2PulseCourse.tsx",
  "utf8",
);
const lines = SOURCE.split("\n");

/** Номер строки (1-based), где объявлена переменная тела компонента. */
function declarationLine(name: string): number {
  const index = lines.findIndex((line) =>
    new RegExp(`^\\s{2}const ${name}\\s*=`).test(line),
  );
  assert.notStrictEqual(
    index,
    -1,
    `в карте больше нет объявления \`${name}\` — сторож устарел, проверь правку осознанно`,
  );
  return index + 1;
}

// Цепочка зависимостей геометрии карты. Каждая следующая величина читает
// предыдущую, поэтому объявления обязаны идти строго в этом порядке.
const chain = [
  "mapViewportHeight",
  "mapHeaderReserve",
  "geometry",
  "mapContentTop",
] as const;

for (let i = 1; i < chain.length; i += 1) {
  const previous = chain[i - 1];
  const current = chain[i];
  assert.ok(
    declarationLine(previous) < declarationLine(current),
    `\`${current}\` объявлен ДО \`${previous}\`, который он использует: const не поднимается, это даёт undefined на рендере и раздел не открывается вовсе (инцидент 21.09)`,
  );
}

// Прямая проверка того самого выражения, которое падало.
const contentTopLine = lines[declarationLine("mapContentTop") - 1];
assert.match(
  contentTopLine,
  /geometry\.padding/,
  "mapContentTop обязан складывать geometry.padding с резервом шапки",
);
assert.ok(
  declarationLine("geometry") < declarationLine("mapContentTop"),
  "geometry обязан быть объявлен выше mapContentTop",
);

// Резерв под футер больше НЕ укорачивает видимую область: иначе вернётся
// жёсткий край, ради снятия которого делалась правка (владелец 21.09).
assert.doesNotMatch(
  SOURCE,
  /marginBottom:\s*mapFooterReserve/,
  "резерв футера обязан жить в paddingBottom контента, а не в marginBottom списка: marginBottom укорачивает видимую область и возвращает жёсткий край",
);
assert.match(
  SOURCE,
  /paddingBottom:\s*geometry\.padding \+ mapFooterReserve/,
  "резерв футера должен добавляться в конец контента",
);

// Полосы растворения обязаны пропускать тач: они лежат ПОВЕРХ списка.
const fadeMatches = SOURCE.match(
  /<LinearGradient[\s\S]{0,400}?testID="learning-v2-pulse-map-fade-(top|bottom)"/g,
);
assert.strictEqual(
  fadeMatches?.length,
  2,
  "у карты должны быть обе полосы растворения — верхняя и нижняя",
);
for (const fade of fadeMatches ?? []) {
  assert.match(
    fade,
    /pointerEvents="none"/,
    "полоса растворения обязана пропускать тач, иначе она съест нажатия по кружкам у края",
  );
}

process.stdout.write("LEARNING V2 MAP GEOMETRY ORDER GATE: PASS\n");
