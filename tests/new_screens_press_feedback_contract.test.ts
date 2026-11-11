// зачем (владелец 22.10: «ВСЕ КНОПКИ НАДО ПРОВЕРИТЬ»; координатор — отклик нажатия на новых экранах): у каждой кнопки видимое состояние нажатия.
// Управляющие кнопки — через V2Pressable (масштаб + приглушение + хаптик, мгновенно); плитки/карточки — приглушение без хаптика.
// Голый <Pressable> без функции стиля с `pressed` допускается только у подложки-затемнения (закрыть по тапу вне) — она не кнопка.
import { readSource } from './helpers/read_source';

const FILES = [
  'components/home/v2/HomeV2VideoRail.tsx',
] as const;

function openingTags(src: string, tag: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const start = src.indexOf(`<${tag}`, from);
    if (start === -1) return out;
    from = start + tag.length + 1;
    if (!/[\s>]/.test(src[start + tag.length + 1] ?? ' ')) continue;
    let depth = 0;
    let quote: string | null = null;
    for (let i = start; i < src.length; i += 1) {
      const c = src[i]!;
      if (quote) { if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if (c === '{') depth += 1;
      else if (c === '}') depth -= 1;
      else if (c === '>' && depth === 0 && src[i - 1] !== '=') { out.push(src.slice(start, i + 1)); break; }
    }
  }
}

describe('новые экраны: отклик нажатия на кнопках', () => {
  it.each(FILES)('%s: голые <Pressable> только с pressed-стилем или подложка-затемнение', (file) => {
    const src = readSource(file);
    const bare = openingTags(src, 'Pressable').filter((tag) => !/pressed/.test(tag) && !/styles\.dim\b|backdrop/.test(tag));
    expect(bare).toEqual([]);
  });
});
