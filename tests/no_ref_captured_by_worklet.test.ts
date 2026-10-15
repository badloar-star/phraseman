// зачем (Макеты 15.10: «[Worklets] Tried to modify key `current` of an object which has been already passed to a worklet» ×2 каждые 0,5 с на «Друзьях»): коллбэк withTiming/withSpring — worklet; если внутри него
// написано `runOnJS(someRef.current)()`, сам ref-объект попадает в worklet (становится неизменяемым), а присваивание `someRef.current = …` в каждом рендере пишет предупреждение при каждой перерисовке.
// Правило: в worklet уходит стабильная функция (`runOnJS(invokeHandleClose)()`), а ref остаётся обычным JS-объектом.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const DIRS = ['app', 'components', 'hooks', 'modules'];

function walk(dir: string, out: string[]): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('ref-объект не уходит в worklet через runOnJS(ref.current)', () => {
  it('в app/components/hooks/modules нет runOnJS(xxxRef.current)(…)', () => {
    const bad: string[] = [];
    for (const dir of DIRS) {
      for (const file of walk(path.join(ROOT, dir), [])) {
        const src = fs.readFileSync(file, 'utf8').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
        if (/runOnJS\(\s*[A-Za-z_$][\w$]*Ref\.current\s*\)/.test(src)) bad.push(path.relative(ROOT, file).replace(/\\/g, '/'));
      }
    }
    expect(bad).toEqual([]);
  });

  it('шесть шторок и окно регистрации зовут стабильную функцию, ref пишет только JS', () => {
    const cases: ReadonlyArray<readonly [string, string, string]> = [
      ['components/friends/FriendsAddSheetShell.tsx', 'invokeHandleClose', 'handleCloseRef'],
      ['components/centered_dialog_shell.tsx', 'invokeHandleClose', 'handleCloseRef'],
      ['components/dialogs/DialogHowToSaySheet.tsx', 'invokeHandleClose', 'handleCloseRef'],
      ['components/ExplainSheet.tsx', 'invokeHandleClose', 'handleCloseRef'],
      ['components/MistakeEli5Modal.tsx', 'invokeHandleClose', 'handleCloseRef'],
      ['components/referral_sheet_shell.tsx', 'invokeHandleClose', 'handleCloseRef'],
      ['components/RegistrationPromptModal.tsx', 'invokeHandleLater', 'handleLaterRef'],
    ];
    for (const [file, fn, ref] of cases) {
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
      expect([file, src.includes(`runOnJS(${fn})()`)]).toEqual([file, true]);
      expect([file, src.includes(`const ${fn} = useCallback(() => { ${ref}.current(); }, []);`)]).toEqual([file, true]);
    }
  });
});
