// зачем (аудит Авторизации 057dfb6ac, координатор 13.10): Главная после смены ника показывала старое имя до перезагрузки — `userName` брался один раз при монтировании.
// Контракт: есть эффект, зависящий ТОЛЬКО от имени в слепке профиля; пустое имя не затирает показанное; повторное значение не даёт рендера; в журнал идут длины, а не имя.
import fs from 'node:fs';
import path from 'node:path';

describe('Главная: имя из слепка профиля после смены ника', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8').replace(/\r\n/g, '\n');
  const start = src.indexOf('const snapshotNameSeenRef = useRef(snapshotName);');
  const block = src.slice(start, src.indexOf('}, [snapshotName]);', start) + '}, [snapshotName]);'.length);

  it('эффект зависит только от snapshotName и обновляет userName', () => {
    expect(start).toBeGreaterThan(0);
    expect(block).toContain('if (previous === snapshotName)');
    expect(block).toContain('setUserName((current) => (current === snapshotName ? current : snapshotName));');
    expect(block.endsWith('}, [snapshotName]);')).toBe(true);
  });

  it('пустое имя слепка не затирает показанное и пишет причину', () => {
    expect(block).toContain('if (!snapshotName) {');
    expect(block).toContain("console.log('[HOME-NAME] snapshot_changed → пустое имя, показанное не трогаем'");
  });

  it('в журнал — длины имён, не сами имена (персональные данные)', () => {
    expect(block).toContain('fromLen: previous.length');
    expect(block).toContain('toLen: snapshotName.length');
    expect(block).not.toMatch(/JSON\.stringify\(\{[^}]*(name|snapshotName)\s*[,}]/);
  });

  it('эффект стоит сразу после useState имени, до других состояний Главной', () => {
    const nameState = src.indexOf('const [userName, setUserName] = useState(() => hh?.userName ?? snapshotName);');
    expect(nameState).toBeGreaterThan(0);
    expect(start).toBeGreaterThan(nameState);
    expect(start).toBeLessThan(src.indexOf('const [streak, setStreak] = useState('));
  });
});
