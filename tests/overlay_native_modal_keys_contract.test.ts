// C1 (координатор 15.10): окно, которое рисуется нативным <Modal>, обязано быть в NATIVE_MODAL_KEYS.
// Иначе арбитр передаёт слот «нативное → нативное» без паузы закрытия, и на iOS второй present во время
// dismiss первого роняет стек презентаций (окно мелькает и пропадает, экран замирает).
// Повод: spireWeekMoment, welcomeBack и coinRankEnough рисовались <Modal>, а комментарии в ядре арбитра
// утверждали обратное — цепочка «итог недели → С возвращением → Встречайте 2.0 → Хватает на ранг» шла без паузы.
import fs from 'fs';
import path from 'path';
import { NATIVE_MODAL_KEYS, type OverlayKey } from '../components/overlay_arbiter_core';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// Окна, у которых слот занимает хук, а рисует другой файл: ключ → [файл, где рисуется, фрагмент рядом с <Modal>].
const HOOK_DRIVEN_MODAL_HOSTS: { key: OverlayKey; host: string; anchor: RegExp }[] = [
  { key: 'spireWeekMoment', host: 'components/spire/moments/SpireWeekMomentHost.tsx', anchor: /<Modal\b/ },
  { key: 'welcomeBack', host: 'app/(tabs)/home.tsx', anchor: /<Modal\b[^>]*onRequestClose=\{welcomeBack\.close\}/ },
  { key: 'coinRankEnough', host: 'app/(tabs)/home.tsx', anchor: /<Modal\b[^>]*onRequestClose=\{rankEnough\.close\}/ },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.tsx$/.test(entry.name)) out.push(rel);
  }
  return out;
}

describe('C1: нативные окна в NATIVE_MODAL_KEYS', () => {
  it.each(HOOK_DRIVEN_MODAL_HOSTS)('$key рисуется <Modal> в $host и стоит в списке нативных', ({ key, host, anchor }) => {
    expect([key, anchor.test(read(host))]).toEqual([key, true]);
    expect([key, NATIVE_MODAL_KEYS.has(key)]).toEqual([key, true]);
  });

  it('компонент, который сам занимает слот и рисует <Modal>, — в списке нативных', () => {
    const missing: string[] = [];
    for (const file of walk('components')) {
      const src = read(file);
      if (!/<Modal\b/.test(src)) continue;
      for (const match of src.matchAll(/useOverlayVisible\(\s*'([a-zA-Z]+)'/g)) {
        if (!NATIVE_MODAL_KEYS.has(match[1] as OverlayKey)) missing.push(`${match[1]} (${file})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('в ядре арбитра нет утверждения «не нативным <Modal>» про окна из списка нативных', () => {
    const core = read('components/overlay_arbiter_core.ts');
    expect(core).not.toMatch(/в дереве,\s*не\s*<Modal>/);
    expect(core).not.toMatch(/рисуется в дереве, не нативным <Modal>/);
  });
});
