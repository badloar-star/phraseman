import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');
const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2]/u;

describe('personal plan exercise audio and recorder UI contract', () => {
  it('keeps listening audio control readable, accessible and stateful', () => {
    expect(SOURCE).not.toMatch(MOJIBAKE_RE);
    expect(SOURCE).toContain("accessibilityRole=\"button\"");
    expect(SOURCE).toContain("accessibilityLabel={disabled ? 'Аудио готовится' : 'Слушать фразу'}");
    expect(SOURCE).toContain("opacity: disabled ? 0.7 : 1");
    expect(SOURCE).toContain("shadowColor: disabled ? '#000000' : accent");
    expect(SOURCE).toContain("label = disabled ? 'Аудио готовится' : isBuffering ? 'Загрузка' : isPlaying ? 'Слушаю' : 'Слушать'");
  });

  it('wraps pronunciation recording in a premium calm recorder panel', () => {
    expect(SOURCE).toContain('recorderHintPill');
    expect(SOURCE).toContain('Запись до 12 секунд');
    expect(SOURCE).toContain('recorderStack: {');
    expect(SOURCE).toContain('borderRadius: 26');
    expect(SOURCE).toContain('padding: 16');
    expect(SOURCE).toContain('borderWidth: 1.5');
    expect(SOURCE).toContain("backgroundColor: 'rgba(255,255,255,0.055)'");
    expect(SOURCE).toContain("shadowOpacity: 0.22");
  });
});
