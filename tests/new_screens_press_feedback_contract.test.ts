// зачем (владелец 22.10: «ВСЕ КНОПКИ НАДО ПРОВЕРИТЬ»; координатор — отклик нажатия на новых экранах): у каждой кнопки видимое состояние нажатия.
// Управляющие кнопки — через V2Pressable (масштаб + приглушение + хаптик, мгновенно); плитки/карточки — приглушение без хаптика.
// Голый <Pressable> без функции стиля с `pressed` допускается только у подложки-затемнения (закрыть по тапу вне) — она не кнопка.
import { readSource } from './helpers/read_source';

const FILES = [
  'components/learning-v2/season/SeasonCourseView.tsx',
  'components/learning-v2/season/SeasonExpandedCard.tsx',
  'components/learning-v2/season/SeasonNavTiles.tsx',
  'components/learning-v2/season/SeasonPickScreens.tsx',
  'components/learning-v2/season/SeasonCarousel.tsx',
  'components/home/v2/HomeV2VideoRail.tsx',
  'components/learning-v2/LearningV2TheorySheet.tsx',
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

  it('управляющие кнопки «Сезона» — через V2Pressable (масштаб + приглушение + хаптик)', () => {
    const viaV2 = (file: string): string[] => openingTags(readSource(file), 'V2Pressable').map((tag) => (/testID="([^"]+)"/.exec(tag) ?? [])[1] ?? '');
    const view = viaV2('components/learning-v2/season/SeasonCourseView.tsx');
    for (const id of ['season-lesson-pill', 'season-primary', 'season-not-from-start']) expect(view).toContain(id);
    // плитки «Слова» / «Теория» в обложке — V2Pressable внутри HeroTile (testID приходит пропсом)
    const heroSrc = readSource('components/learning-v2/season/SeasonCourseView.tsx');
    expect(heroSrc).toContain('<HeroTile icon="albums-outline" label={seasonText(lang, \'words\')} onPress={props.onWords} dark={dark} testID="season-words" />');
    expect(heroSrc).toContain('<HeroTile icon="book-outline" label={seasonText(lang, \'theory\')} onPress={props.onTheory} dark={dark} testID="season-theory" />');
    expect(heroSrc).toMatch(/function HeroTile[\s\S]*?<V2Pressable/);
    const expanded = readSource('components/learning-v2/season/SeasonExpandedCard.tsx');
    // ЗАМОК ВЛАДЕЛЬЦА 22.10: закрытая карта не раскрывается (крестика «просмотра» больше нет)
    expect(expanded).toContain('<LearningV2SessionOutcomeSheet');
    expect(readSource('components/LearningV2SessionOutcomeSheet.tsx')).toContain('activeOpacity={0.8}');
    // зачем (владелец 22.10, макет lesson-hub-final.html): плитки и строки списков — тоже через V2Pressable
    const tiles = readSource('components/learning-v2/season/SeasonNavTiles.tsx');
    expect(tiles).toContain('<V2Pressable');
    for (const id of ['season-all-chapters', 'season-all-lessons-button', 'season-classic-course']) expect(tiles).toContain(`testID="${id}"`);
    const picks = readSource('components/learning-v2/season/SeasonPickScreens.tsx');
    expect(openingTags(picks, 'V2Pressable').length).toBeGreaterThanOrEqual(2);
  });
});
