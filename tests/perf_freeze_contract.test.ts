import fs from 'fs';
import path from 'path';

/**
 * Перф-контракт «Frozen Background» (см. AGENTS.md → Performance Bible и PERF_MASTER_PLAN.md).
 *
 * Корень нагрева/деградации: ушедшие экраны продолжали жить (freezeOnBlur:false + вечно
 * смонтированные табы) + вечные анимации без гардов. Этот тест — храповик: он фиксирует
 * вылеченное состояние и не даёт новым экранам/фичам молча вернуть проблему.
 * Ослаблять контракт можно только осознанно, вместе с обновлением Performance Bible.
 */

const ROOT = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('perf freeze contract', () => {
  it('keeps global freezeOnBlur enabled on the root stack', () => {
    const source = read('app/_layout.tsx');
    expect(source).toContain('freezeOnBlur: true');
  });

  it('allows freezeOnBlur:false only for the realtime allowlist', () => {
    const source = read('app/_layout.tsx');
    // Экраны, которым разрешено НЕ замораживаться (живой матч/комната/лобби-поиск, экзамен).
    // Добавление нового исключения = осознанное решение хозяина: расширь список и объясни зачем.
    // constellation_match — живой 4-игроковый матч «Созвездий» (фазовый таймер,
    // onSnapshot матча): та же природа, что arena_game (спек F3/A10).
    const allowed = ['arena_game', 'arena_lobby', 'arena_join', 'arena_room', 'exam', 'constellation_match'];
    const offenders = source
      .split(/\r?\n/)
      .filter((line) => line.includes('freezeOnBlur: false'))
      .filter((line) => !allowed.some((name) => line.includes(`name="${name}"`)));
    expect(offenders).toEqual([]);
  });

  it('keeps hidden tabs frozen and background premount enabled in the custom tab slider', () => {
    const source = read('app/(tabs)/_layout.tsx');
    expect(source).toContain('const ENABLE_TAB_FREEZE = true');
    expect(source).toContain('const ENABLE_BACKGROUND_TAB_PREMOUNT = true');
    expect(source).toContain("from 'react-freeze'");
  });

  it('keeps heavy thematic quiz packs behind the lazy registry seam', () => {
    // Мегабайтные паки вопросов грузятся ТОЛЬКО через quiz_thematic_registry
    // (ленивый require) — это же шов для будущей серверной доставки контента.
    // Аналогичная граница для plan_content_* — tests/plan_content_pack_boundary_contract.test.ts.
    const dirs = ['app', 'components', 'hooks'];
    const files = dirs.flatMap((d) => walk(path.join(ROOT, d)));
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      if (rel === 'app/quiz_thematic_registry.ts' || rel === 'app/quiz_thematic_dev_registry.ts') continue;
      if (/^app\/quiz_thematic_[a-z_]+\.ts$/.test(rel)) continue;
      const source = fs.readFileSync(file, 'utf8');
      if (/(from\s+'|require\(')\.{1,2}\/quiz_thematic_(home_and_rooms|kitchen_and_cooking)'/.test(source)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps infinite animations guarded (focus/AppState) outside the legacy allowlist', () => {
    // withRepeat(..., -1) без гарда = вечная работа в фоне (экраны не размонтируются).
    // Гард-маркеры: useIsScreenFocused и/или AppState (паттерн components/AvatarAura.tsx).
    // Allowlist — только модалки, размонтируемые при закрытии, dev-лабы и legacy-хвост
    // (хвост догардить и УДАЛЯТЬ отсюда; добавлять новые файлы сюда нельзя без причины).
    const legacyAllowlist = new Set([
      'components/PremiumCelebrationModal.tsx', // модалка, unmount on close
      'components/premium_celebration/AuroraBackground.tsx', // внутри той же модалки
      'app/flashcards/CardPackShardPaywallModal.tsx', // модалка, unmount on close
      'app/_anim_demo_lab.tsx', // dev-лаба
      'app/_admin_celebration_lab.tsx', // dev-лаба
    ]);
    const dirs = ['app', 'components', 'hooks'];
    const files = dirs.flatMap((d) => walk(path.join(ROOT, d)));
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      const source = fs.readFileSync(file, 'utf8');
      if (!/withRepeat\(([\s\S]{0,200}?),\s*-1/.test(source)) continue;
      if (legacyAllowlist.has(rel)) continue;
      const guarded = source.includes('useIsScreenFocused') || source.includes('AppState');
      if (!guarded) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
