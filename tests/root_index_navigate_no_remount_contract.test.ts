// зачем (R1, двойной монтаж Главной; журналы [PERF-R1-NAV] / [PERF-R1-MOUNT] Сверки 12.10): холодный старт стоит на `/` внутри группы (tabs), и корневой эффект уходил на Главную через
// router.replace — он пересоздаёт маршрут (tabs) с новым ключом и перемонтирует ВЕСЬ каркас табов (≈1,8–2,1 с работы выбрасывается). Внутри группы (tabs) на Главную идём navigate (как переключаются табы),
// с подстраховкой replace, если путь остался корневым. Вне группы и для ссылок холодного старта — прежний replace.
import fs from 'node:fs';
import path from 'node:path';

const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8').replace(/\r\n/g, '\n');

function effectBlock(): string {
  const start = layout.indexOf("traceLessonExit('layout:rootIndex_replace_home', {");
  expect(start).toBeGreaterThan(-1);
  const end = layout.indexOf('}, [effectiveShowOnboarding, isBanned, isRootIndexRoute, ready, rootNavigationReady, router]);', start);
  expect(end).toBeGreaterThan(start);
  return layout.slice(start, end);
}

describe('корневой переход на Главную не пересоздаёт каркас табов', () => {
  const block = effectBlock();

  it('для цели Главной и при уже смонтированном каркасе табов — router.navigate; условие НЕ по сегментам (на холодном старте они пусты)', () => {
    expect(block).toContain("if (rootTarget === '/(tabs)/home' && isTabsShellMounted()) {");
    expect(block).not.toContain("rootSegmentsRef.current[0] === '(tabs)'");
    expect(block).toContain('tabsShellMounted: isTabsShellMounted(),');
    expect(block).toContain('segments: JSON.stringify(rootSegmentsRef.current),');
    expect(block).toContain('router.navigate(rootTarget as Href);');
    expect(layout).toContain('const rootSegmentsRef = useRef(rootSegments);');
    expect(layout).toContain('const rootSegments: readonly string[] = useSegments();');
    const tabsLayout = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');
    expect(tabsLayout).toContain('setTabsShellMounted(true);');
    expect(tabsLayout).toContain('return () => setTabsShellMounted(false);');
  });

  it('ветка navigate стоит ДО replace, возвращает очистку таймера и имеет подстраховку replace через 600 мс, если путь остался корневым', () => {
    const navigateAt = block.indexOf('router.navigate(rootTarget as Href);');
    const replaceAt = block.indexOf('router.replace(rootTarget as Href);\n    const retry');
    expect(navigateAt).toBeGreaterThan(-1);
    expect(replaceAt).toBeGreaterThan(navigateAt);
    const branch = block.slice(navigateAt, replaceAt);
    expect(branch).toContain('}, 600);');
    expect(branch).toContain('return () => clearTimeout(navigateFallback);');
    expect(branch).toContain("if (action === 'replace') router.replace(rootTarget as Href);");
    expect(branch).toContain('rootNavigateFallbackAction(current?.name)');
    expect(branch).toContain('rootNavigationContainerRef.getCurrentRoute?.()');
    expect(branch).not.toContain('stillRoot');
    expect(branch).toContain("layout:rootIndex_navigate_home_check");
  });

  it('ссылки холодного старта и корень вне (tabs) идут прежним replace (цель не Главная или сегмент не (tabs))', () => {
    expect(layout).toContain("const rootTarget = initialDeepLinkRef.current ?? '/(tabs)/home';");
    // после ветки navigate остаётся безусловный replace + повтор — для всех остальных случаев
    expect(block.slice(block.indexOf('router.navigate(rootTarget as Href);'))).toContain('router.replace(rootTarget as Href);\n    const retry = setTimeout(');
  });
});

describe('флаг «каркас табов смонтирован» (app/tabs_shell_state.ts)', () => {
  it('по умолчанию выключен, включается и выключается', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const state = require('../app/tabs_shell_state') as typeof import('../app/tabs_shell_state');
    expect(state.isTabsShellMounted()).toBe(false);
    state.setTabsShellMounted(true);
    expect(state.isTabsShellMounted()).toBe(true);
    state.setTabsShellMounted(false);
    expect(state.isTabsShellMounted()).toBe(false);
  });
});

describe('проверка после navigate решает по живому состоянию навигации, а не по pathname из рендера', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { rootNavigateFallbackAction } = require('../app/tabs_shell_state') as typeof import('../app/tabs_shell_state');

  it('сфокусирован (tabs) — оставляем (путь «/» у него нормален, каркас считает его Главной)', () => {
    expect(rootNavigateFallbackAction('(tabs)')).toBe('keep');
  });

  it('остался корневой index, неизвестный или пустой маршрут — прежний replace', () => {
    expect(rootNavigateFallbackAction('index')).toBe('replace');
    expect(rootNavigateFallbackAction('premium_modal')).toBe('replace');
    expect(rootNavigateFallbackAction(undefined)).toBe('replace');
    expect(rootNavigateFallbackAction(null)).toBe('replace');
    expect(rootNavigateFallbackAction('')).toBe('replace');
  });
});
