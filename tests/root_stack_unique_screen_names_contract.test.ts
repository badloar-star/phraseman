import fs from 'fs';
import path from 'path';

// зачем: 2026-07-26 приложение падало на старте с «Screen names must be unique:
// …settings_testers…» — параллельная сессия добавила экран явным <Stack.Screen>,
// хотя это же имя уже регистрировалось динамически из DEV_UTILITY_ROUTE_NAMES.
// Expo Router роняет весь рут-лейаут, то есть баг = белый экран у всех.
// Тест ловит любое повторное имя в app/_layout.tsx до релиза.

const ROOT = path.resolve(__dirname, '..');
const LAYOUT_PATH = path.join(ROOT, 'app', '_layout.tsx');
const DEV_ROUTES_PATH = path.join(ROOT, 'constants', 'devRoutes.ts');

function readLayout(): string {
  return fs.readFileSync(LAYOUT_PATH, 'utf8');
}

/** Имена из явных <Stack.Screen name="..."> в рут-лейауте. */
function explicitScreenNames(source: string): string[] {
  return [...source.matchAll(/<Stack\.Screen\b[^>]*?\bname="([^"]+)"/g)].map((m) => m[1]);
}

/**
 * Имена, попадающие в стек из динамической дев-карты. Читаем реальный список
 * DEV_UTILITY_ROUTE_NAMES из constants/devRoutes.ts и вычитаем те, что лейаут
 * осознанно исключает через .filter((name) => name !== X).
 */
function devUtilityScreenNames(layoutSource: string): string[] {
  const devSource = fs.readFileSync(DEV_ROUTES_PATH, 'utf8');

  const constByName = new Map<string, string>();
  for (const m of devSource.matchAll(
    /export const (\w+)\s*=\s*routeName\(([^)]*)\);/g,
  )) {
    const parts = [...m[2].matchAll(/'([^']+)'/g)].map((p) => p[1]);
    constByName.set(m[1], parts.join('_'));
  }

  const listBlock = devSource.match(
    /export const DEV_UTILITY_ROUTE_NAMES\s*=\s*\[([\s\S]*?)\]/,
  );
  expect(listBlock).toBeTruthy();

  const listed = [...listBlock![1].matchAll(/(\w+_ROUTE_NAME)/g)].map((m) => m[1]);
  expect(listed.length).toBeGreaterThan(0);

  const resolved = listed.map((constName) => {
    const value = constByName.get(constName);
    expect(value).toBeTruthy();
    return value as string;
  });

  // Имена, которые лейаут намеренно выкидывает из дев-карты, потому что
  // объявляет их явно (например settings_testers — «шторка раздела» в проде).
  const excluded = new Set(
    [...layoutSource.matchAll(/name\s*!==\s*(\w+_ROUTE_NAME)/g)]
      .map((m) => constByName.get(m[1]))
      .filter((v): v is string => Boolean(v)),
  );

  return resolved.filter((name) => !excluded.has(name));
}

describe('root stack screen names', () => {
  it('не содержит повторов среди явных <Stack.Screen>', () => {
    const names = explicitScreenNames(readLayout());
    expect(names.length).toBeGreaterThan(50);

    const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
    expect(duplicates).toEqual([]);
  });

  it('явные экраны не пересекаются с динамической дев-картой', () => {
    const layout = readLayout();
    const explicit = new Set(explicitScreenNames(layout));
    const collisions = devUtilityScreenNames(layout).filter((name) => explicit.has(name));

    expect(collisions).toEqual([]);
  });

  it('settings_testers регистрируется ровно один раз', () => {
    const layout = readLayout();
    const all = [...explicitScreenNames(layout), ...devUtilityScreenNames(layout)];

    expect(all.filter((name) => name === 'settings_testers')).toHaveLength(1);
  });
});
