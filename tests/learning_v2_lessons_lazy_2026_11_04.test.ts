// Заморозка Learning V2 + Android-лаги (владелец 04.11): при замороженном V2 тяжёлые модули V2 не импортируются СТАТИЧЕСКИ ни из lessons.tsx,
// ни из корневого _layout.tsx, ни из Главной — иначе их исполнение при первом выполнении вкладки «Уроки» замедляет старт у всех.
// Смотрим статическое замыкание импортов (import / export-from; динамический import() и require внутри функций — ленивые и не считаются).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
const cache = new Map<string, string[]>();

function resolveSpec(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const ext of EXTS) {
    const candidate = base + ext;
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // нет такого файла — пробуем следующее расширение
    }
  }
  return null;
}

function staticDeps(file: string): string[] {
  const hit = cache.get(file);
  if (hit) return hit;
  const deps = new Set<string>();
  let source = '';
  try {
    source = fs.readFileSync(file, 'utf8');
  } catch (error) {
    throw new Error(`не прочитан ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const re = /^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?["']([^"']+)["']/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const resolved = resolveSpec(file, match[1]);
    if (resolved) deps.add(resolved);
  }
  const list = [...deps];
  cache.set(file, list);
  return list;
}

function closure(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    stack.push(...staticDeps(file));
  }
  return seen;
}

const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join('/');
const HEAVY = [
  'components/learning-v2/season/SeasonCourseConnected.tsx',
  'components/learning-v2/LearningV2ChaptersCourse.tsx',
  'app/learning_v2_active_course_catalog_client_v1.ts',
  'modules/learning-v2/content/factory_native/factory_native_catalog_v1.ts',
  'modules/learning-v2/content/factory_native/factory_native_catalog_v1.generated.ts',
];

describe('заморозка V2: тяжёлый V2 не в статическом графе старта', () => {
  it.each(['app/(tabs)/lessons.tsx', 'app/_layout.tsx', 'app/(tabs)/home.tsx'])('%s не тянет тяжёлые модули V2 статически', (entry) => {
    const reached = new Set([...closure(path.join(ROOT, entry))].map(rel));
    const offenders = HEAVY.filter((heavy) => reached.has(heavy));
    expect(offenders).toEqual([]);
  });

  it('ленивый модуль держит в статическом графе только лёгкое (флаги Season), а тяжёлое — через import()/require внутри функций', () => {
    const lazy = path.join(ROOT, 'app/learning_v2_lessons_lazy.ts');
    const reached = [...closure(lazy)].map(rel).filter((f) => f !== 'app/learning_v2_lessons_lazy.ts');
    expect(reached).toContain('components/learning-v2/season/season_flags.ts');
    expect(HEAVY.filter((heavy) => reached.includes(heavy))).toEqual([]);
    const source = fs.readFileSync(lazy, 'utf8');
    expect(source).toContain("import('../components/learning-v2/season/SeasonCourseConnected')");
    expect(source).toContain("require('./learning_v2_active_course_catalog_client_v1')");
    expect(source).toContain("require('../modules/learning-v2/content/factory_native/factory_native_catalog_v1')");
  });

  it('каталог занятий V2 не считается, пока V2 заморожен, а компонент курса прогревается только при открытом V2', () => {
    const lessons = fs.readFileSync(path.join(ROOT, 'app/(tabs)/lessons.tsx'), 'utf8');
    expect(lessons).toMatch(/if \(LEARNING_V2_HIDDEN\) return new Set<string>\(\);\s*\r?\n\s*const authored = factoryNativeLearningV2AvailabilityV1\(/);
    expect(lessons).toMatch(/if \(learningV2CanOpen\) prewarmLearningV2CourseSurface\(\);/);
    expect(lessons).toContain('from "../learning_v2_lessons_lazy"');
  });
});
