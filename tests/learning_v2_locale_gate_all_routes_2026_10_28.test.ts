// Координатор 28.10 (Переводчик: курс есть только на ru/uk, на остальных языках показ подставлял русский): каждый маршрут Learning V2
// проверяет язык интерфейса — isLearningV2Hidden() / замок withLearningV2LocaleGuardV1 — или это отладочный маршрут, закрытый в выпуске.
// Новый экран V2 без замка — красный: ссылка, уведомление или «Продолжить» откроют русский текст человеку на en/es/….
import fs from 'node:fs';
import path from 'node:path';

const APP = path.join(__dirname, '..', 'app');

function routeFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (/\.tsx$/.test(name)) out.push(full);
    }
  };
  walk(path.join(APP, 'learning-v2'));
  walk(path.join(APP, 'learning_v2_modes_showcase_run'));
  for (const name of fs.readdirSync(APP)) if (/^_?(learning_v2|dev_learning_v2)_.*\.tsx$/.test(name)) out.push(path.join(APP, name));
  return out.filter((f) => /export default/.test(fs.readFileSync(f, 'utf8')));
}

const GATED = /isLearningV2Hidden\(|withLearningV2LocaleGuardV1\(/;
const DEV_ONLY = /IS_STORE_RELEASE|ENABLE_DEV_TOOLS/;

describe('каждый маршрут Learning V2 проверяет язык интерфейса', () => {
  const files = routeFiles();

  it('маршруты найдены', () => {
    expect(files.length).toBeGreaterThan(8);
  });

  it.each(files.map((f) => [path.relative(APP, f)]))('%s: замок языка или отладочный маршрут', (rel) => {
    const src = fs.readFileSync(path.join(APP, rel), 'utf8');
    expect(GATED.test(src) || DEV_ONLY.test(src)).toBe(true);
  });

  it('четыре маршрута, которые раньше открывались на любом языке, теперь под замком', () => {
    for (const rel of ['learning_v2_lesson_words.tsx', 'learning_v2_session_intro.tsx', 'learning_v2_session_intro_check.tsx', 'learning_v2_direct_session_player_v1.tsx']) {
      expect(fs.readFileSync(path.join(APP, rel), 'utf8')).toMatch(/^export default withLearningV2LocaleGuardV1\('route_/m);
    }
  });

  it('замок: скрыт → [V2-HIDDEN] и на Главную, иначе экран с теми же props', () => {
    const guard = fs.readFileSync(path.join(APP, 'learning_v2_locale_guard.tsx'), 'utf8');
    expect(guard).toMatch(/if \(isLearningV2Hidden\(\)\) \{\s*logLearningV2Hidden\(entry, LEARNING_V2_HIDDEN_REDIRECT\);\s*return <Redirect href=\{LEARNING_V2_HIDDEN_REDIRECT\} \/>;/);
    expect(guard).toContain('return <Screen {...props} />;');
  });
});
