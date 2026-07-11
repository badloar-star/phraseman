import fs from 'node:fs';
import path from 'node:path';

const lessonsSource = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/lessons.tsx'), 'utf8');
const v2Source = fs.readFileSync(path.join(process.cwd(), 'components/LessonsV2TabContent.tsx'), 'utf8');

describe('lessons V2 experimental surface', () => {
  test('exposes a dev-gated V2 page and dedicated content component', () => {
    expect(lessonsSource).toMatch(/ENABLE_DEV_TOOLS/);
    expect(lessonsSource).toMatch(/useState<\s*'lessons'\s*\|\s*'dialogs'\s*\|\s*'v2'/);
    expect(lessonsSource).toMatch(/label="V2"/);
    expect(lessonsSource).toMatch(/LessonsV2TabContent/);
  });

  test('localizes V2 stage labels instead of forcing English copy', () => {
    expect(v2Source).toMatch(/triLang/);
    expect(v2Source).toContain('Слова');
    expect(v2Source).toContain('Теория');
    expect(v2Source).toContain('Построение');
  });

  test('uses transparent hex wrappers so stage nodes cannot render as square tiles', () => {
    expect(v2Source).toContain('50,3.5 93,26 93,74 50,96.5 7,74 7,26');
    expect(v2Source).not.toContain('backgroundColor: tone.fill');
  });

  test('keeps the lesson path top-to-bottom with smooth shared press feedback', () => {
    expect(v2Source).toMatch(/<TapScale[\s\S]*scaleTo=\{0\.96\}/);
    expect(v2Source).toContain('nWords: { left: 18, top: 8 }');
    expect(v2Source).toContain('nExam: { left: 8, top: 568 }');
    expect(v2Source).not.toContain('nodePressed');
    expect(v2Source).toContain("selectedStage.state === 'locked'");
  });
});
