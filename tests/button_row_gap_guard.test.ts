// зачем (владелец 13.10, №35: «никакие кнопки не сливаются»; координатор: зазор между соседними кнопками >= 12 dp): ряд из >= 2 кнопок (flexDirection: row) с gap < 12 не допускается.
// Считаем контейнеры с кнопочными детьми, у которых gap/columnGap задан числом (inline или через styles.key в этом же файле). Потолок: число нарушений только ВНИЗ.
// Осознанные исключения (не кнопки действий): буквы-плитки игры и клетки тепловой карты.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const SKIP = /node_modules|[\\/]\.|\.test\.|__tests__|dev_|[\\/]dev[\\/]|\.d\.ts|learning-v2-lab/;
const EXEMPT = /components\/VerbLetterBank\.tsx|components\/ActivityHeatmap365\.tsx/;
const BTN = /^(Pressable|TouchableOpacity|TouchableHighlight|DuoPressable|V2Pressable|PressableHybrid|AnimatedPressable|V2Button|DialogueGlassCta|FriendsButton|PackGhostCta|Reanimated\.Pressable)$/;
/** Ждут коммита чужих правок (пейвол, окно регистрации) — после их коммита потолок станет 0. */
const CEILING = 2;

function listTsx(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (SKIP.test(full)) continue;
    if (e.isDirectory()) listTsx(full, out);
    else if (e.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const num = (text: string, key: string): number | null => {
  const m = new RegExp(`\\b${key}\\s*:\\s*(\\d+(?:\\.\\d+)?)`).exec(text);
  return m ? Number(m[1]) : null;
};

function narrowRows(file: string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ts = require('typescript') as typeof import('typescript');
  const src = fs.readFileSync(file, 'utf8');
  if (!/gap/.test(src)) return [];
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (EXEMPT.test(rel)) return [];
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const styleMap: Record<string, string> = {};
  const collect = (n: import('typescript').Node): void => {
    if (ts.isCallExpression(n) && /StyleSheet\.create$/.test(n.expression.getText(sf)) && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
      for (const p of n.arguments[0].properties) if (ts.isPropertyAssignment(p)) styleMap[p.name.getText(sf)] = p.initializer.getText(sf);
    }
    ts.forEachChild(n, collect);
  };
  collect(sf);
  const isBtn = (c: import('typescript').Node): boolean =>
    (ts.isJsxElement(c) && BTN.test(c.openingElement.tagName.getText(sf))) || (ts.isJsxSelfClosingElement(c) && BTN.test(c.tagName.getText(sf)));
  const hits: string[] = [];
  const visit = (n: import('typescript').Node): void => {
    if (ts.isJsxElement(n)) {
      const btnKids = n.children.filter((c) => (ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c)) && isBtn(c));
      if (btnKids.length >= 2) {
        const attr = n.openingElement.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === 'style');
        if (attr && ts.isJsxAttribute(attr) && attr.initializer) {
          const t = attr.initializer.getText(sf);
          const ref = /styles2?\.(\w+)|s\.(\w+)|S\.(\w+)/.exec(t);
          const key = ref ? ref[1] || ref[2] || ref[3] : undefined;
          let gap = num(t, 'gap') ?? num(t, 'columnGap');
          if (gap === null && key && styleMap[key]) gap = num(styleMap[key]!, 'gap') ?? num(styleMap[key]!, 'columnGap');
          const row = /flexDirection\s*:\s*'row'/.test(t) || (key && styleMap[key] && /flexDirection\s*:\s*'row'/.test(styleMap[key]!));
          if (gap !== null && gap < 12 && row) hits.push(`${rel}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1} gap=${gap}`);
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return hits;
}

describe('зазор между кнопками в ряду >= 12', () => {
  const all: string[] = [];
  for (const d of ['app', 'components']) for (const f of listTsx(path.join(root, d))) all.push(...narrowRows(f));

  it('число узких рядов не выше потолка', () => {
    if (all.length > CEILING) throw new Error(`узких рядов кнопок: ${all.length} > ${CEILING}\n${all.join('\n')}`);
  });

  it('потолок не завышен: стало меньше — понизь CEILING', () => {
    expect(all.length).toBe(CEILING);
  });
});
