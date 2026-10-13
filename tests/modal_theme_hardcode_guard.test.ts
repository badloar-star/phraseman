// зачем (владелец 13.10, №35 п.2: «ВСЁ СТРОГО В ТЕКУЩЕЙ ТЕМЕ — ВСЕ МОДАЛЫ СЛУШАЮТСЯ ТЕМУ»): в модалах, шторках, тостах, церемониях и оверлеях нет жёстко заданных
// цветов мимо токенов темы. Потолок по файлам (ratchet): число хардкод-цветов в файле может только УМЕНЬШАТЬСЯ; новый файл с хардкодом — красный тест.
// Строка с пометкой `theme-exempt` / `guard-ok` (на ней или строкой выше) не считается — исключение осознанное, причина рядом.
// Решения владельца, которые держат оставшиеся исключения: тёмная шторка стиля «Тень» нейтральная (12.10), золото церемоний Premium/VIP, затемнение подложки.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const NAME = /(Modal|Sheet|Dialog|Ceremon|Toast|Overlay|Celebrat|Alert|Banner|Shell|Backdrop)/i;
const MODAL_DIRS = /^components\/(dialogs|modal_fx|celebration|premium_celebration)\//;
const SKIP = /node_modules|[\\/]\.|\.test\.|__tests__|dev_|[\\/]dev[\\/]|\.d\.ts/;
const COLOR = /^(#[0-9a-fA-F]{3,8}|rgba?\(.*\)|hsla?\(.*\)|white|black|red|green|blue|gray|grey|yellow|orange|purple|pink)$/i;

/** Потолок на 13.10 (замер Темами): файл → число неоправданных хардкод-цветов. Уменьшай при правке, увеличивать нельзя. */
const CEILING: Readonly<Record<string, number>> = {
  'components/medalToastThemeStyles.ts': 177, // старые палитры тостов медалей по ThemeMode: живой путь окна — medalToastStyleFromTokens (токены темы), эти — превью
  'components/premium_celebration/celebrationContent.ts': 45, // золото церемоний Premium/VIP: фирменные цвета уровня подписки (решение владельца нужно)
  'components/ExamResultPreviewAdminModal.tsx': 27, // окно только для админа
  'components/UpdateModal.tsx': 5, // блик и чёрная подложка
  'components/v2/shadow_sheet_paint.ts': 4, // нейтральная тёмная шторка «Тень» (решение владельца 12.10)
  'components/GlobalBroadcastModal.tsx': 1, // затемнение подложки
  'components/home/HomeMistakesLockedSheet.tsx': 1, // затемнение подложки
  'components/PersonalAdminMessageModal.tsx': 1, // затемнение подложки
};

function listModalFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (SKIP.test(full)) continue;
    if (e.isDirectory()) listModalFiles(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) {
      const rel = path.relative(root, full).replace(/\\/g, '/');
      if (NAME.test(e.name) || MODAL_DIRS.test(rel)) out.push(rel);
    }
  }
  return out;
}

function hardcodedColors(rel: string): number {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ts = require('typescript') as typeof import('typescript');
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  const lines = src.split(/\r?\n/);
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let count = 0;
  const visit = (n: import('typescript').Node): void => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const t = n.text.trim();
      if (t !== 'transparent' && (COLOR.test(t) || (/#[0-9a-fA-F]{6,8}\b/.test(t) && t.length < 40))) {
        const line = sf.getLineAndCharacterOfPosition(n.getStart()).line;
        const ctx = (lines[line - 1] ?? '') + (lines[line] ?? '');
        if (!/theme-exempt|guard-ok|transparent/.test(ctx)) count++;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return count;
}

describe('модалы, шторки, тосты и церемонии слушаются тему', () => {
  const files = [...listModalFiles(path.join(root, 'components')), ...listModalFiles(path.join(root, 'app'))];

  it('новых жёстких цветов в модалах нет: счёт по файлу не выше потолка', () => {
    const bad: string[] = [];
    for (const rel of files) {
      const n = hardcodedColors(rel);
      const allowed = CEILING[rel] ?? 0;
      if (n > allowed) bad.push(`${rel}: ${n} жёстких цветов, потолок ${allowed}`);
    }
    expect(bad).toEqual([]);
  });

  it('потолок не завышен: файлы, где хардкода стало меньше, обязаны уменьшить число в CEILING', () => {
    const stale: string[] = [];
    for (const [rel, allowed] of Object.entries(CEILING)) {
      if (!fs.existsSync(path.join(root, rel))) { stale.push(`${rel}: файла нет — убери из CEILING`); continue; }
      const n = hardcodedColors(rel);
      if (n < allowed) stale.push(`${rel}: сейчас ${n}, в CEILING ${allowed} — понизь`);
    }
    expect(stale).toEqual([]);
  });

  it('каждый модал/шторка берёт цвета из токенов темы (хук темы или палитры в файле)', () => {
    const THEME_SOURCE = /useTheme\(|useV2Palette\(|liquidGlassTokens\(|useShadowGlass\(|useThemeColors|useSpirePalette|useGlass\w*\(|useShadow\w*\(|useAppTheme|GlassCard|HybridSheetShell|centered_dialog_shell|ThemedChoiceModal|ThemedConfirmModal/;
    const ENTRY = /(Modal|Sheet|Dialog|Ceremony|Toast|Celebration)\.tsx$/;
    const without: string[] = [];
    for (const rel of files.filter((f) => ENTRY.test(f))) {
      const src = fs.readFileSync(path.join(root, rel), 'utf8');
      if (!THEME_SOURCE.test(src)) without.push(rel);
    }
    // файлы-обёртки без собственных цветов допускаются, но их список виден и не должен расти
    if (without.length > WITHOUT_THEME_SOURCE_CEILING) throw new Error(`без источника темы ${without.length} > ${WITHOUT_THEME_SOURCE_CEILING}: ${without.join(', ')}`);
  });
});

/** Потолок числа модал-файлов без прямого источника темы (оболочки/мосты без своих цветов). Заполняется замером; уменьшать. */
const WITHOUT_THEME_SOURCE_CEILING = 40;
