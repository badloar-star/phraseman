// ════════════════════════════════════════════════════════════════════════════
// season_reward_art_alignment.test.ts — логотипы наград не обрезаны и ровные.
//
// зачем 2026-08-03 (владелец, со скриншотом дорожки): «все лого обязательно
// должны быть не обрезаны, а фулл размер и стоять ровно и красиво».
//
// Диагностика заняла три шага, и тест закрепляет её результат:
//   1. resizeMode="contain" стоял и НЕ резал — код был не виноват;
//   2. файлы квадратные 256×256 — пропорции тоже ни при чём;
//   3. предмет нарисован ВПРИТЫК к краям файла (battery.webp, club_totem.webp
//      начинаются от верхней границы и кончаются у нижней) — полей нет в самом
//      исходнике, поэтому «contain» нечего было ужимать.
//
// Лечение: слот сохраняет размер (геометрия строки не едет), а картинка внутри
// ужимается и центрируется — появляется воздух по краям, иконки встают на одну
// линию.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const SCREEN = fs.readFileSync(path.join(ROOT, 'app', 'season_pass.tsx'), 'utf8');

/**
 * Константы читаются из исходника, а не импортируются.
 *
 * зачем: season_pass.tsx тянет react-native-svg, который в jest не поднимается
 * (TypeError: Cannot destructure property 'Mixin'). Тот же приём уже применён в
 * season_pass_spine_continuity.test.ts.
 */
function numericConstant(name: string): number {
  const direct = new RegExp(`export const ${name} = (\\d+);`).exec(SCREEN);
  if (direct) return Number(direct[1]);
  const computed = new RegExp(`export const ${name} = Math\\.round\\(([A-Z_]+) \\* ([\\d.]+)\\);`).exec(SCREEN);
  if (computed) return Math.round(numericConstant(computed[1]) * Number(computed[2]));
  throw new Error(`константа ${name} не найдена в season_pass.tsx`);
}

const SEASON_REWARD_ART_SIZE = numericConstant('SEASON_REWARD_ART_SIZE');
const SEASON_REWARD_ART_INNER = numericConstant('SEASON_REWARD_ART_INNER');
const ART_DIR = path.join(ROOT, 'assets', 'images', 'season', 'rewards');

/** Ширина и высота .webp — из заголовка VP8X/VP8, без внешних зависимостей. */
function webpSize(file: string): { width: number; height: number } {
  const head = fs.readFileSync(file).subarray(0, 40);
  const format = head.subarray(12, 16).toString('ascii');
  if (format === 'VP8X') {
    return {
      width: 1 + head.readUIntLE(24, 3),
      height: 1 + head.readUIntLE(27, 3),
    };
  }
  if (format === 'VP8 ') {
    return {
      width: head.readUInt16LE(26) & 0x3fff,
      height: head.readUInt16LE(28) & 0x3fff,
    };
  }
  if (format === 'VP8L') {
    // Lossless: 14 бит на ширину и 14 на высоту, упакованы после сигнатуры 0x2F.
    const bits = head.readUInt32LE(21);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >> 14) & 0x3fff),
    };
  }
  throw new Error(`неизвестный формат webp: ${path.basename(file)} (${format})`);
}

function artFiles(): string[] {
  const themes = fs.readdirSync(ART_DIR).filter((entry) => (
    fs.statSync(path.join(ART_DIR, entry)).isDirectory()
  ));
  return themes.flatMap((theme) => (
    fs.readdirSync(path.join(ART_DIR, theme))
      .filter((name) => name.endsWith('.webp'))
      .map((name) => path.join(ART_DIR, theme, name))
  ));
}

describe('картинка внутри слота имеет поля', () => {
  test('внутренний размер меньше слота — предмет не касается краёв', () => {
    expect(SEASON_REWARD_ART_INNER).toBeLessThan(SEASON_REWARD_ART_SIZE);
  });

  test('поля заметные, но арт не превращается в марку', () => {
    const ratio = SEASON_REWARD_ART_INNER / SEASON_REWARD_ART_SIZE;
    expect(ratio).toBeGreaterThanOrEqual(0.8);
    expect(ratio).toBeLessThanOrEqual(0.92);
  });

  test('слот остался прежним — геометрия строки дорожки не поехала', () => {
    // Layout stability: менять размер слота значило бы двигать всю строку.
    expect(SEASON_REWARD_ART_SIZE).toBe(58);
  });
});

describe('логотипы стоят ровно', () => {
  test('картинка центрируется в слоте', () => {
    expect(SCREEN).toContain("alignItems: 'center'");
    expect(SCREEN).toContain("justifyContent: 'center'");
  });

  test('используется внутренний размер, а не размер слота', () => {
    expect(SCREEN).toContain('width: SEASON_REWARD_ART_INNER, height: SEASON_REWARD_ART_INNER');
  });

  test('пропорции сохраняются — арт не растянут', () => {
    expect(SCREEN).toContain('resizeMode="contain"');
  });
});

describe('исходные файлы арта', () => {
  const files = artFiles();

  test('арт наград найден — есть что проверять', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  /**
   * Осознанные исключения из квадратной сетки.
   *
   * frame — это ВИЗИТКА профиля, она по смыслу широкая (512×320) и повторяет
   * пропорции реальной карточки игрока. Остальной арт обязан быть квадратным:
   * в квадратном слоте «contain» вписывает широкую картинку по ширине, и по
   * высоте она занимает вдвое меньше — предмет выглядит обрезанным и выпадает
   * из общего ряда.
   */
  const NON_SQUARE_BY_DESIGN = new Set(['frame.webp']);

  test('весь арт квадратный, кроме осознанных исключений', () => {
    for (const file of files) {
      if (NON_SQUARE_BY_DESIGN.has(path.basename(file))) continue;
      const { width, height } = webpSize(file);
      expect(`${path.basename(file)} ${width}x${height}`).toBe(`${path.basename(file)} ${width}x${width}`);
    }
  });

  test('квадратный арт одного размера — единый ритм сетки', () => {
    const sizes = new Set(
      files
        .filter((file) => !NON_SQUARE_BY_DESIGN.has(path.basename(file)))
        .map((file) => webpSize(file).width),
    );
    expect(sizes.size).toBe(1);
  });

  test('широкий арт не притворяется квадратным', () => {
    // Если визитку однажды перерисуют квадратной, исключение станет ненужным —
    // тест об этом скажет, а не промолчит.
    for (const name of NON_SQUARE_BY_DESIGN) {
      const file = files.find((entry) => path.basename(entry) === name);
      expect(file).toBeDefined();
      const { width, height } = webpSize(file!);
      expect(width).not.toBe(height);
    }
  });
});
