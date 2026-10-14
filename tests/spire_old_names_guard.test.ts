// зачем (№32 R1_BACKLOG, владелец 13.10: «Шпиль» → «Пик»): ни одного старого имени раздела в строках, которые видит человек, —
// словари, «Что нового», тексты уведомлений и шторок, подписи доступности, юридические тексты. Комментарии и журнал разработчика (DebugLogger) не считаются.
// Старые имена по языкам: ru/uk Шпиль, en Spire, es Aguja, pt-BR Torre (только рядом с Spire), vi Tháp, id Menara, tr Kule, pl Wieża.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const OLD = /Шпил|Шпіл|\bSpire\b|\bAguja\b|\bTháp\b|\bMenara\b|\bKule\b|\bWieża\b|\bWieży\b|\bWieżę\b/;

/** Каталоги клиента, строки которых видит человек. Разработческие экраны (dev_*), тесты и серверный код сюда не входят. */
const CLIENT_DIRS = ['app', 'components', 'constants', 'modules', 'hooks'];
const SKIP = /node_modules|[\\/]\.|dev_|[\\/]dev[\\/]|\.test\.|__tests__|devToolRegistry|spire_preview/;

function listSources(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (SKIP.test(full)) continue;
    if (e.isDirectory()) listSources(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

/** Строки-литералы и JSX-текст файла без комментариев; строки внутри вызовов DebugLogger/console пропускаются (это журнал, не интерфейс). */
function userFacingStrings(file: string): Array<{ line: number; text: string }> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ts = require('typescript') as typeof import('typescript');
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: Array<{ line: number; text: string }> = [];
  const isLogCall = (n: import('typescript').Node): boolean => {
    if (!ts.isCallExpression(n)) return false;
    const callee = n.expression.getText(sf);
    return /^(DebugLogger\.(info|warn|error|debug)|console\.(log|warn|error|info)|logSpire\w*|log\w*)$/.test(callee);
  };
  const visit = (n: import('typescript').Node, inLog: boolean): void => {
    const nowInLog = inLog || isLogCall(n);
    let text: string | null = null;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) text = n.text;
    else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) text = n.text;
    else if (ts.isJsxText(n)) text = n.text;
    if (text !== null && !nowInLog) found.push({ line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, text });
    ts.forEachChild(n, (c) => visit(c, nowInLog));
  };
  visit(sf, false);
  return found;
}

describe('«Шпиль → Пик»: старых имён нет в пользовательских строках', () => {
  it('клиент: ни одного старого имени раздела в строках интерфейса на 9 языках', () => {
    const bad: string[] = [];
    for (const d of CLIENT_DIRS) {
      for (const file of listSources(path.join(root, d))) {
        const src = fs.readFileSync(file, 'utf8');
        if (!OLD.test(src)) continue; // быстрый отсев: файл без старых имён разбирать не нужно
        for (const s of userFacingStrings(file)) {
          if (OLD.test(s.text)) bad.push(`${path.relative(root, file).replace(/\\/g, '/')}:${s.line}: ${s.text.replace(/\s+/g, ' ').slice(0, 80)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('юридические тексты (политика и условия, 4 файла) называют раздел «Peak», а не «Spire»', () => {
    for (const f of ['privacy_policy_en', 'privacy_policy_en_ios', 'terms_of_use_en', 'terms_of_use_en_ios']) {
      for (const dir of ['legal', 'app/legal']) {
        const text = fs.readFileSync(path.join(root, dir, `${f}.json`), 'utf8');
        expect(text).not.toMatch(/\bSpire\b/);
      }
    }
  });

  // зачем (№32, координатор 14.10): админка — «Пик/Peak» в подписях; старое имя допустимо только в идентификаторах (adminSpireConfigSet, spire-*) и комментариях
  it('админка: в видимых подписях admin/v2/legacy.html нет «Шпиль»/«Spire» (комментарии и идентификаторы не считаются)', () => {
    const lines = fs.readFileSync(path.join(root, 'admin/v2/legacy.html'), 'utf8').split(/\r?\n/);
    const bad: string[] = [];
    let inComment = false;
    lines.forEach((raw, i) => {
      let line = raw;
      if (inComment) { const end = line.indexOf('-->'); if (end < 0) return; line = line.slice(end + 3); inComment = false; }
      line = line.replace(/<!--.*?-->/g, '');
      const open = line.indexOf('<!--');
      if (open >= 0) { line = line.slice(0, open); inComment = true; }
      if (/^\s*\/\//.test(line)) return;
      line = line.replace(/\s\/\/.*$/, '');
      if (/Шпил|Шпіл|\bSpire\b/.test(line)) bad.push(`${i + 1}: ${line.trim().slice(0, 100)}`);
    });
    expect(bad).toEqual([]);
  });

  it('сервер: тексты пушей Пика проверяет собственный сторож на всех 9 языках (functions/src/spire_peak_push_texts.test.ts)', () => {
    const guard = fs.readFileSync(path.join(root, 'functions/src/spire_peak_push_texts.test.ts'), 'utf8');
    expect(guard).toContain("const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']");
    expect(guard).toContain('OLD_NAME');
  });
});
