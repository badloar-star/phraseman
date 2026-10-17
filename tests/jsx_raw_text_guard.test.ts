// зачем (координатор 18.10, охота на крэши): строка или пробел на той же строке между JSX-элементами вне <Text>
// (`</Text> {/* коммент */}`) и `{count && <X/>}` с нулём — «Text strings must be rendered within a <Text> component».
// Находка в m05-C (c9cc72907) и SpireHomeScreen. Сторож держит окна моментов, Пика, Главной и «Сегодня» чистыми.
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- зачем: общий помощник сторожей на CommonJS
const { scanRoots } = require('./helpers/jsx_raw_text_scan.cjs') as {
  scanRoots: (root: string, rels: string[]) => { file: string; line: number; kind: string; parent: string; text: string }[];
};

const ROOT = path.join(__dirname, '..');
// зачем (координатор 18.10): весь код приложения — новый такой пробел не должен пройти в сборку
const GUARDED = ['app', 'components', 'modules'];

/**
 * Исключения с причиной. Ключ — «файл:вид:родитель» (без номера строки, чтобы сдвиги строк не ломали сторож).
 * FixtureHeading сам оборачивает children в <Text> (app/dialogue_v2_visual_fixture.tsx:53–56), экран только для разработки.
 */
const ALLOWED = new Set([
  'app/dialogue_v2_visual_fixture.tsx:raw_text:FixtureHeading',
]);

describe('JSX: строки только внутри <Text> (app, components, modules)', () => {
  it('нет голого текста, пробела между элементами на одной строке и `{число && …}`', () => {
    const hits = scanRoots(ROOT, GUARDED)
      .filter((h) => !ALLOWED.has(`${h.file}:${h.kind}:${h.parent}`))
      .map((h) => `${h.file}:${h.line} ${h.kind} parent=${h.parent} ${h.text}`);
    expect(hits).toEqual([]);
  });

  it('помощник ловит именно тот класс, что дал краш в m05-C', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- зачем: временный файл для самопроверки сканера
    const fs = require('node:fs') as typeof import('node:fs');
    const os = require('node:os') as typeof import('node:os');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsxscan-'));
    const file = path.join(dir, 'Bad.tsx');
    fs.writeFileSync(file, [
      'export const A = () => (',
      '  <View>',
      '    <Text>ok</Text> {/* comment */}',
      '    {items.length && <Text>n</Text>}',
      '    <Text>fine {name} here</Text>',
      '  </View>',
      ');',
    ].join('\n'));
    const kinds = scanRoots(dir, ['Bad.tsx']).map((h) => h.kind).sort();
    expect(kinds).toEqual(['number_and', 'same_line_space']);
  });
});
