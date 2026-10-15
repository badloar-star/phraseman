// зачем (R08 «зависание интерфейса», Ревизор fd1d5d589, координатор 15.10): бесконечный блик скелета крутился в момент замены скелета большим содержимым (~30 экранов), и непрерывные коммиты
// анимации на Fabric могли перебить коммит React. Правила: старт после onLayout на видимом экране; остановка при размонтировании/скрытии гарантирована; reduce motion — без блика.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/SkeletonShimmer.tsx'), 'utf8').replace(/\r\n/g, '\n');
const code = src.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');

describe('SkeletonShimmer: безопасный блик', () => {
  it('без замера ширины (onLayout), без фокуса экрана и при «Уменьшить движение» анимации нет — только сброс', () => {
    expect(code).toContain('if (measuredW <= 0 || !isFocused || reducedMotion) {');
    expect(code).toMatch(/if \(measuredW <= 0 \|\| !isFocused \|\| reducedMotion\) \{\s*cancelAnimation\(sweep\);\s*sweep\.value = 0;\s*return undefined;/);
  });

  it('старт — после взаимодействий (не посреди монтирования большого содержимого) и только на переднем плане; отложенный старт отменяется', () => {
    expect(code).toContain('InteractionManager.runAfterInteractions(');
    expect(code).toContain("if (!disposed && AppState.currentState === 'active') start();");
    expect(code).toContain('pending?.cancel();');
    // старт цикла не вызывается напрямую из эффекта — только через scheduleStart
    expect(code).toContain("if (AppState.currentState === 'active') scheduleStart();");
    expect(code).not.toMatch(/if \(AppState\.currentState === 'active'\) start\(\);/);
  });

  it('остановка на размонтировании — в очистке useLayoutEffect (в самом коммите), плюс очистка эффекта; фон приложения гасит блик', () => {
    expect(code).toContain('useLayoutEffect(() => () => { cancelAnimation(sweep); }, [sweep]);');
    expect(code).toMatch(/return \(\) => \{\s*disposed = true;\s*appSub\.remove\(\);\s*stop\(\);\s*\};/);
    expect(code).toMatch(/if \(state === 'active'\) scheduleStart\(\);\s*else stop\(\);/);
  });

  it('цикл конечный (предохранитель): бесконечного withRepeat(-1) в файле нет', () => {
    expect(code).toContain('export const SHIMMER_MAX_LOOPS = 60;');
    expect(code).toMatch(/withRepeat\(\s*withTiming\(1, \{ duration: durationMs, easing: Easing\.inOut\(Easing\.ease\) \}\),\s*SHIMMER_MAX_LOOPS,\s*false,\s*\)/);
    expect(code).not.toMatch(/withRepeat\([^;]*?,\s*-1\b/);
  });
});
