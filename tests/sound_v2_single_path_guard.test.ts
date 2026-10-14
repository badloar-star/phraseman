// зачем (координатор 14.10: Дизайн нашёл двойной звук в StoryViewer — его playEvent('story') и мой tryPlayV2Event('story')): одно событие V2 в одном компоненте вызывается ОДНИМ путём.
// Сторож: в каждом файле приложения множество событий, которые вызываются через мост (`tryPlayV2Event`), не пересекается с событиями, которые вызываются прямо (`playEvent`).
// Известные расхождения — в списке с причиной; список может только сокращаться. Расхождения чужих файлов — владельцу одной строкой.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const DIRS = ['app', 'components', 'hooks', 'modules'];

/** Файл → причина. Сейчас пусто (Дизайн убрал свой playEvent('story') в StoryViewer). Новые сюда НЕ добавлять: чинить файл. */
const KNOWN: Readonly<Record<string, string>> = {};

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (!/node_modules|^\./.test(e.name) && rel !== 'modules/sound_v2') walk(rel, out);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(rel);
  }
  return out;
}

const events = (src: string, re: RegExp): Set<string> => {
  const found = new Set<string>();
  for (const m of src.matchAll(re)) found.add(m[1]!);
  return found;
};

describe('звуки V2: одно событие — один путь в файле', () => {
  it('нет файла, где одно событие вызывается и через tryPlayV2Event, и через playEvent', () => {
    const bad: string[] = [];
    for (const d of DIRS) {
      for (const rel of walk(d)) {
        const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        if (!/tryPlayV2Event|playEvent\(/.test(src)) continue;
        const viaBridge = events(src, /tryPlayV2Event\(\s*'([a-z_]+)'/g);
        for (const m of src.matchAll(/tryPlayV2Event\(\s*[a-zA-Z_.]+\s*\?\s*'([a-z_]+)'\s*:\s*'([a-z_]+)'/g)) { viaBridge.add(m[1]!); viaBridge.add(m[2]!); }
        const direct = events(src, /\bplayEvent\(\s*'([a-z_]+)'/g);
        const both = [...viaBridge].filter((e) => direct.has(e));
        if (both.length > 0 && !KNOWN[rel]) bad.push(`${rel}: ${both.join(', ')}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('список известных расхождений не завышен: каждый файл из него и вправду всё ещё двоит', () => {
    for (const rel of Object.keys(KNOWN)) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const viaBridge = events(src, /tryPlayV2Event\(\s*'([a-z_]+)'/g);
      const direct = events(src, /\bplayEvent\(\s*'([a-z_]+)'/g);
      expect([...viaBridge].some((e) => direct.has(e))).toBe(true); // исправили файл — удали строку из KNOWN
    }
  });

  it('Пик: звуки ступени/этажа/вершины в use_spire_game играют СРАЗУ (без паузы и без реестра), дубль с моментом гасит сам момент через playUnlessRecentlyPlayed', () => {
    const hook = fs.readFileSync(path.join(ROOT, 'app/spire/use_spire_game.ts'), 'utf8');
    expect(hook).toContain("tryPlayV2Event(kind === 'summit' ? 'summit' : kind === 'floor' ? 'floor' : 'step', 'spire_step_finish')");
    expect(hook).not.toMatch(/setTimeout|isMomentsV3FlagOn|active_moment_registry/);
    const moments = ['components/spire/moments/SpireFloorMoment.tsx', 'components/spire/moments/SpireStepResultMoment.tsx']
      .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    expect(moments).toContain("playEvent('floor')");
  });
});
