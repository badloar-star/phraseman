// зачем (владелец 13.10, №35: «никакие кнопки вообще чтобы не сливались»): кнопка не красится слабой заливкой контрола `opaqueControl` (она отличается от шторки/карточки на 1,2–1,3 : 1);
// берём токен кнопки `buttonFill` (>= 1,6 : 1 к поверхностям, подпись >= 4,6). Потолок (ratchet): число кнопок с `opaqueControl` в style может только УМЕНЬШАТЬСЯ.
// Заливки карточек, строк и полей ввода сюда не входят — считаются только атрибуты style/wrapStyle кнопочных тегов.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const SKIP = /node_modules|[\\/]\.|\.test\.|__tests__|dev_|[\\/]dev[\\/]|\.d\.ts|learning-v2-lab/;
const BTN = /^(Pressable|TouchableOpacity|TouchableHighlight|DuoPressable|V2Pressable|PressableHybrid|AnimatedPressable|Reanimated\.Pressable)$/;

/** Потолок на 14.10 после первого прохода (замер Темами). Уменьшай при правке, увеличивать нельзя. */
const CEILING = 7; // зачем: остаток после первого прохода — 3 в файлах, ждавших коммита раунда 2 (будут исправлены), 4 в RegistrationPromptModal (чужие незакоммиченные правки)

function listTsx(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (SKIP.test(full)) continue;
    if (e.isDirectory()) listTsx(full, out);
    else if (e.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function weakFillButtons(file: string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ts = require('typescript') as typeof import('typescript');
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('opaqueControl')) return [];
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: string[] = [];
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const visit = (n: import('typescript').Node): void => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      if (BTN.test(n.tagName.getText(sf))) {
        for (const a of n.attributes.properties) {
          if (ts.isJsxAttribute(a) && /^(style|wrapStyle)$/.test(a.name.getText(sf)) && a.initializer && /\.opaqueControl\b/.test(a.initializer.getText(sf))) {
            hits.push(`${rel}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
          }
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return hits;
}

describe('кнопки не на слабой заливке контрола', () => {
  const all: string[] = [];
  for (const d of ['app', 'components']) for (const f of listTsx(path.join(root, d))) all.push(...weakFillButtons(f));

  it('число кнопок с opaqueControl в style не выше потолка', () => {
    if (all.length > CEILING) throw new Error(`кнопок с opaqueControl: ${all.length} > ${CEILING}\n${all.join('\n')}`);
  });

  it('потолок не завышен: стало меньше — понизь CEILING', () => {
    expect(all.length).toBe(CEILING);
  });
});
