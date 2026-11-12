/**
 * Пик (координатор 24.10, замер [PEAK-PERF] 1→10): dev-кнопка «решить задание» есть только в отладочной сборке и стоит строкой
 * под заданием, а не поверх экрана; сработавшие таймеры раннера уходят из списка (замер Сверки: список рос 1→2→3).
 */
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEol } from './helpers/read_source';

const read = (...p: string[]) => normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', ...p), 'utf8'));

describe('dev-кнопка «решить задание»', () => {
  const step = read('components', 'spire', 'SpireStepScreen.tsx');
  const button = read('components', 'spire', 'SpireDevSolveButton.tsx');

  it('подключается только при __DEV__ и только ленивым require внутри экрана', () => {
    expect(step).toContain("const DevSolve = __DEV__ ? (require('./SpireDevSolveButton')");
    expect(step).not.toMatch(/^import .*SpireDevSolveButton/m);
  });

  it('стоит в строке «пожаловаться» под заданием, не поверх экрана', () => {
    expect(step).toMatch(/<View style=\{\[s\.reportRow, devSolve \? s\.reportRowDev : null\]\}>\s*\{devSolve\}/);
    expect(button).not.toMatch(/position:\s*'absolute'/);
  });

  it('ответ уходит обычным путём раннера (тот же поток, что у человека), без цветов-литералов', () => {
    expect(step).toContain('onChoice={runner.submitChoice} onTokens={runner.submitTokens} onItems={runner.submitItems}');
    expect(button.match(/(['"`])#(?:[0-9A-Fa-f]{3,8})\1|rgba?\(\s*\d/g) ?? []).toEqual([]);
  });
});

describe('таймеры раннера ступени', () => {
  // зачем (12.11): 606a71aaa (владелец 11.11: «я должен сам переходить по нажатию кнопки») убрал автопереход после
  // верного ответа — вместе с ним ушли все разовые таймеры раннера и их список. Утечка «список растёт» теперь невозможна
  // в принципе; сторожим, чтобы так и осталось: ни одного setTimeout, один тик часов — и он снимается при уходе из фазы.
  it('таймеры раннера ступени не копятся: разовых таймеров нет, единственный тик часов снимается', () => {
    const runner = read('app', 'spire', 'use_spire_step_runner.ts');
    expect(runner).not.toMatch(/setTimeout\(/);
    expect(runner.match(/setInterval\(/g)).toHaveLength(1);
    expect(runner).toContain('return () => clearInterval(id);');
    expect(runner).toMatch(/if \(fb\.ok\) return; \/\/ D207[^\n]*автоперехода нет: ответ висит до «Дальше» \(continueAfterReveal\)/);
  });
});

describe('экран Пика при закрытии ступени', () => {
  it('смена этажа переключает карточку в том же рендере, без второго прохода эффектом (Сверка 24.10: selected 4→5 двумя проходами)', () => {
    const home = read('components', 'spire', 'SpireHomeScreen.tsx');
    expect(home).not.toContain('useEffect(() => { if (myFloor !== null) setSelected(myFloor); }, [myFloor]);');
    expect(home).toContain('const [floorSeen, setFloorSeen] = useState(myFloor); if (myFloor !== floorSeen) { setFloorSeen(myFloor); if (myFloor !== null) setSelected(myFloor); }');
  });
});
