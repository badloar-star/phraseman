// зачем (обход экранов 12.11, координатор): «Блиц» под открытым поверх экраном каждую секунду перерисовывался — часы
// не учитывали, виден ли экран. Сторож держит три вещи: (1) скрытый экран не ставит состояние часов; (2) конец минуты
// по-прежнему наступает по реальному времени и заход сохраняется, даже если экран скрыт — проверка конца стоит ДО
// выхода по неактивности; (3) постоянный журнал ухода [GAME-RACE-EXIT] для замера на телефоне.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'game_race.tsx'), 'utf8').replace(/\r\n/g, '\n');

function clockBody(): string {
  const start = src.indexOf('const id = setInterval(() => {');
  expect(start).toBeGreaterThan(0);
  return src.slice(start, src.indexOf('}, M.tickMs);', start));
}

describe('«Блиц»: скрытый экран и уход', () => {
  it('часы знают, виден ли экран (общий признак useRuntimeActive)', () => {
    expect(src).toContain("import { useRuntimeActive } from '../hooks/use_runtime_active';");
    expect(src).toContain('const runtimeActive = useRuntimeActive();');
    expect(src).toContain('runtimeActiveRef.current = runtimeActive;');
  });

  it('конец минуты наступает и на скрытом экране, перерисовка — только на видимом', () => {
    const body = clockBody();
    const endCheck = body.indexOf('if (!(now < M.durationMs)) { finish(gameRef.current); return; }');
    const hiddenSkip = body.indexOf('if (!runtimeActiveRef.current) return;');
    const firstSetState = body.indexOf('setElapsed(now);');
    expect(endCheck).toBeGreaterThan(0);
    expect(hiddenSkip).toBeGreaterThan(endCheck); // сохранение захода не зависит от видимости экрана
    expect(firstSetState).toBeGreaterThan(hiddenSkip); // состояние часов ставится только на видимом экране
    expect(body).toContain('setGhostAt(now + M.tickMs);');
  });

  it('заход по-прежнему сохраняется в конце минуты, ровно один раз', () => {
    expect(src).toContain('if (ended.current) return;');
    expect(src).toContain('void saveRaceRun(today, { correct: final.correct, marks: final.marks });');
  });

  it('вернулись на экран — время сразу верное, без ожидания тика', () => {
    expect(src).toMatch(/if \(runtimeActive && phaseRef\.current !== 'over'\) \{\s*const now = Date\.now\(\) - startedAt\.current;\s*setElapsed\(now\);/);
  });

  it('постоянный журнал ухода: нажатие выхода, размонтирование с длительностями, скрыт/виден', () => {
    expect(src).toContain("const EXIT_LOG = '[GAME-RACE-EXIT]';");
    expect(src).toMatch(/\$\{EXIT_LOG\} close_tap \$\{JSON\.stringify\(\{ phase: phaseRef\.current, backCallMs: Date\.now\(\) - t0 \}\)\}/);
    expect(src).toMatch(/\$\{EXIT_LOG\} unmount \$\{JSON\.stringify\(\{ phase: phaseRef\.current, cleanupMs: Date\.now\(\) - t0, sinceCloseTapMs:/);
    expect(src).toContain("${EXIT_LOG} ${runtimeActive ? 'visible' : 'hidden'}");
  });
});
