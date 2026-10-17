// зачем (слово владельца 17.10 через координатора: «у кнопки назад вообще-то есть ассет — его надо поставить; проверить во всех местах»): значок «назад» один на всё приложение —
// контур макета kit.js `back`, а не системная стрелка Ionicons разной толщины. Сторож держит: контур не разъехался с эталоном; новые места не берут Ionicons напрямую;
// общие киты кнопок с пропом `icon` рисуют «назад» через NavIcon.
import fs from 'node:fs';
import path from 'node:path';
jest.mock('react-native', () => ({ StyleSheet: { create: (s: unknown) => s } }));
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Path: 'Path' }));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));

import { BACK_GLYPH_PATH, BACK_ICON_NAMES, isBackIconName } from '../components/v2/BackGlyph';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

describe('значок «назад»: один контур — как в макетах', () => {
  it('контур совпадает с эталоном docs/design/v2-app/kit.js (back)', () => {
    const kit = read('docs/design/v2-app/kit.js');
    expect(kit).toContain(`back: '<path d="${BACK_GLYPH_PATH}"/>'`);
    // толщина эталона 1,8 (kit.css svg.i); концы скруглены
    expect(read('docs/design/v2-app/kit.css')).toContain('stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round');
    const glyph = read('components/v2/BackGlyph.tsx');
    expect(glyph).toContain('strokeWidth = 1.8');
    expect(glyph).toContain('strokeLinecap="round"');
    expect(glyph).toContain('strokeLinejoin="round"');
  });

  it('имена системных стрелок «назад» распознаются; прочие значки остаются Ionicons', () => {
    for (const n of ['chevron-back', 'chevron-back-outline', 'arrow-back', 'arrow-back-outline']) expect(isBackIconName(n)).toBe(true);
    for (const n of ['close', 'chevron-forward', 'play', 'mic-off-outline', undefined]) expect(isBackIconName(n as string | undefined)).toBe(false);
    expect(BACK_ICON_NAMES).toHaveLength(4);
  });

  // Места, где системная стрелка ещё стоит: разработческие экраны (подчёркивание в имени), демо лаборатории и текстовая кнопка «Назад» с глифом. Список только УМЕНЬШАЕТСЯ.
  const ALLOWED_DIRECT = new Set<string>([
    'components/learning-v2-lab/ModeDemoPlayer.tsx',
    'app/flashcards_speaking_session.tsx',
  ]);
  const walk = (dir: string): string[] => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(rel);
    return /\.tsx$/.test(e.name) ? [rel] : [];
  });

  it('новые экраны не рисуют «назад» системной стрелкой напрямую', () => {
    const direct = /<Ionicons[^>]*name=["'](?:chevron|arrow)-back/;
    const offenders = [...walk('app'), ...walk('components')]
      .filter((rel) => !path.basename(rel).startsWith('_'))
      .filter((rel) => direct.test(read(rel)) && !ALLOWED_DIRECT.has(rel));
    expect(offenders).toEqual([]);
  });

  it('общая кнопка BackButton: заливка buttonFill (не сливается ни с одной темой), зона 44 + hitSlop, журнал [BACK-BTN]; «Сегодня» использует её', () => {
    const btn = read('components/v2/BackButton.tsx');
    expect(btn).toContain('backgroundColor: g.buttonFill');
    expect(btn).not.toContain('opaqueControl');
    expect(btn).toContain('size = 44');
    expect(btn).toContain('hitSlop={6}');
    expect(btn).toContain("noteBackTap(screen, 'BackButton')");
    expect(btn).toContain('<BackGlyph size={22} color={g.text} />');
    // Темы 17.10: круг на p.control сливался со страницей (1,00 на светлых, 1,25 на тёмных при пороге 1,5)
    const today = read('app/today_tasks.tsx');
    expect(today).toContain('<BackButton');
    expect(today).toContain('testID="today-tasks-back"');
    expect(today).not.toContain('backgroundColor: p.control');
  });

  it('общие киты кнопок, куда имя значка приходит пропом, рисуют «назад» через NavIcon', () => {
    for (const rel of [
      'components/v2/V2Kit.tsx',
      'components/practice/PracticeChrome.tsx',
      'components/dialogs/glass/DialogueGlassKit.tsx',
      'components/results/ResultsGlass.tsx',
      'components/lessons/LessonMenuGlass.tsx',
      'components/packs/PackScreenKit.tsx',
      'app/flashcards/CardsGlassKit.tsx',
      'components/learning-v2/horizons/LearningV2Horizons.tsx',
    ]) {
      expect(read(rel)).toContain('NavIcon');
    }
    expect(read('components/v2/V2Kit.tsx')).toContain('<NavIcon name={icon} size={Math.round(size * 0.46)}');
  });
});
