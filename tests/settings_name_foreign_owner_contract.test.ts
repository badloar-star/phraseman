// зачем (прогон 18.10 11:29, утечка): после выхода вкладка Настроек держала ник прошлого аккаунта (decision=kept_previous) —
// гость видел «Максим2». Ник помнит владельца; «пустое не затирает загруженное» — только внутри одного владельца.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'settings.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('Настройки: ник прошлого аккаунта не переживает смену владельца', () => {
  it('состояние ника помнит владельца', () => {
    expect(src).toContain('const userNameOwnerRef = useRef<string | null>(captureAccountGeneration().stableId ?? null);');
  });

  it('пустой снимок при другом владельце сбрасывает ник (cleared_foreign), а не сохраняет прежний', () => {
    expect(src).toContain("return snapshotName || (foreignCurrent ? '' : current);");
    expect(src).toContain("foreignCurrent ? 'cleared_foreign' : 'kept_previous'");
    expect(src).not.toContain('return snapshotName || current;');
  });

  it('пустое хранилище при другом владельце сбрасывает ник', () => {
    const at = src.indexOf("} else if (userNameOwnerRef.current !== token.stableId) {");
    expect(at).toBeGreaterThan(0);
    expect(src.slice(at, at + 400)).toContain("setUserName('');");
    expect(src).toContain('userNameOwnerRef.current = token.stableId;');
  });
});
