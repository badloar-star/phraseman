// зачем (эталон today-scene-concepts.html, вариант A; координатор 22.10): «Сегодня» в стиле «Сцена» — за флагом (dev — вкл, релиз — выкл), прежний экран остаётся
// нетронутым при выключенном флаге, dev-вход закрыт в релизе, свои цвета только по метке theme-exempt. Сторож смотрит исходники.
import { readSource } from './helpers/read_source';

describe('«Сегодня» в стиле «Сцена»: подключение', () => {
  it('флаг: включён только в dev-сборке', () => {
    const flag = readSource('components/home/v2/today_scene/today_scene_flag.ts');
    expect(flag).toContain("typeof __DEV__ !== 'undefined' && __DEV__ === true");
    expect(flag).toContain('export const TODAY_SCENE_V2_ENABLED: boolean = IS_DEV;');
  });

  it('экран /today_tasks: ветка сцены стоит ПОСЛЕ всех хуков и перед прежним видом, дальше прежний код целиком', () => {
    const src = readSource('app/today_tasks.tsx');
    const branch = src.indexOf('if (TODAY_SCENE_V2_ENABLED) {');
    const legacy = src.indexOf('<HomeV2TodayCard');
    const lastHook = src.lastIndexOf('useEffect(');
    expect(branch).toBeGreaterThan(lastHook);
    expect(branch).toBeLessThan(legacy);
    expect(src).toContain('<TodayScene');
    expect(src).toContain('fromProgress={ringReady ? ringFrom.from : undefined}');
    expect(src).toContain('onOpenTask={openTask}');
    expect(src).toContain("noteBackDecision('today_tasks → home')");
  });

  it('dev-вход: закрыт в релизе и решение берёт у настоящей pickTodaySceneState', () => {
    const route = readSource('app/dev_today_scene_preview.tsx');
    expect(route).toContain('if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect');
    expect(route).toContain('pickTodaySceneState(input)');
    expect(route).toContain('setDevAppearance(before)');
  });

  it('вид: цвета сцены из токенов темы уровня «Максимум» (homeSceneTokensForTheme), кольца — существующий TodayRingsSlot размера 200, строки без своих рамок', () => {
    const view = readSource('components/home/v2/today_scene/TodaySceneView.tsx');
    expect(view).toContain('homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance, evening)');
    expect(view).toContain('<TodayRingsSlot');
    expect(view).toContain('size={200}');
    for (const line of view.split('\n')) {
      if (/border(Color|Width)/.test(line) && !/guard-ok|shadow-ok|hairlineWidth/.test(line)) throw new Error(`обводка без пометки: ${line.trim()}`);
    }
  });

  it('размер колец 200 — масштаб геометрии 222 (толщина 16·k, зазор 7·k, монета 86·k)', () => {
    const rings = readSource('components/streak/moments/TodayRings.tsx');
    expect(rings).toContain('200: Object.freeze({ size: 200, stroke: 14.4, gap: 6.3, coin: 77 })');
  });

  it('чужие файлы не тронуты: карточка «Сегодня», лента истории и опрос не импортируются сценой', () => {
    for (const file of ['TodayScene.tsx', 'TodaySceneView.tsx']) {
      // зачем: в шапке файла эти имена названы в комментариях (почему не используются) — проверяем только код
      const src = readSource(`components/home/v2/today_scene/${file}`).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
      expect(src).not.toContain('HomeV2TodayCard');
      expect(src).not.toContain('TodayActivityHistory');
      expect(src).not.toContain('HomePollV2Card');
    }
  });
});
