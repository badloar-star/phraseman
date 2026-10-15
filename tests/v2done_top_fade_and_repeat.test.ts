// зачем (вердикт Макетов 06b311f0d по «Итогу урока», координатор 15.10): (б) при прокрутке заголовок заезжал под значки статус-бара — верхний скрим цвета фона экрана, включается только после прокрутки;
// (а) «Повторить ошибки» стоит в блоке «Ошибки» эталона practice#done2 всегда — при ошибках без id кнопка ведёт в хаб ошибок; (в) подпись «Урок N · тема» совпадает с practice.html#done2.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«Итог урока»: шапка закреплена, скрим сверху и затухание над доком', () => {
  const src = read('components/completion/V2DoneScreen.tsx');

  it('🔴 «×» не прокручивается под статус-бар: шапка (крестик и баланс) вынесена из прокрутки и закреплена, в прокрутке — пустое место её высоты', () => {
    expect(src).toContain('<View pointerEvents="box-none" testID="v2-done-head" style={[s.headPinned, { paddingTop: insets.top + 8 }]}>');
    expect(src).toContain('<View style={s.headSpacer} />');
    expect(src).toContain("headPinned: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20 },");
    expect(src).toContain('headSpacer: { height: HEAD_H },');
    expect(src).toContain('const HEAD_H = 44;');
    // крестик живёт только в закреплённой шапке — не дублируется в прокрутке
    expect(src.match(/accessibilityLabel=\{c\.close\}/g)?.length).toBe(1);
  });

  it('верхний скрим: цвет фона экрана, непрозрачный до низа шапки, ниже растворение 28; плавно (160/220 мс) после прокрутки >6 dp; в покое скрыт', () => {
    expect(src).toContain('const [scrolled, setScrolled] = useState(false);');
    expect(src).toContain('const next = e.nativeEvent.contentOffset.y > TOP_FADE_SHOW_AT;');
    expect(src).toContain('colors={[g.bg, g.bg, alphaHex(g.bg, 0)]}');
    expect(src).toContain('const topFadeSolidH = insets.top + 8 + HEAD_H;');
    expect(src).toContain('const topFadeH = topFadeSolidH + TOP_FADE_FEATHER;');
    expect(src).toContain('locations={[0, topFadeSolid, 1]}');
    expect(src).toContain('withTiming(scrolled ? 1 : 0, { duration: scrolled ? 160 : 220 })');
    expect(src).toContain('const TOP_FADE_SHOW_AT = 6;');
    expect(src).toContain('const TOP_FADE_FEATHER = 28;');
  });

  it('скрим того же цвета, что корень экрана (шва нет); не перехватывает касания; шапка лежит поверх скрима', () => {
    expect(src).toContain('style={[s.root, { backgroundColor: g.bg }]}');
    expect(src).toMatch(/<Reanimated\.View pointerEvents="none" testID="v2-done-top-fade"/);
    expect(src).not.toMatch(/\bAnimated\.(Value|timing)/);
    expect(src.indexOf('testID="v2-done-top-fade"')).toBeLessThan(src.indexOf('testID="v2-done-head"'));
  });

  it('(г) нижнее затухание над доком: прозрачный → цвет фона, 28 dp, не перехватывает касания, в обоих вариантах дока', () => {
    expect(src).toContain('const DOCK_FADE_H = 28;');
    expect(src).toContain("dockFade: { position: 'absolute', left: 0, right: 0, top: -DOCK_FADE_H, height: DOCK_FADE_H },");
    expect(src).toContain('colors={[alphaHex(g.bg, 0), g.bg]} style={s.dockFade}');
    expect(src).toContain('>{fade}{children}</Chain.ChainBeat>');
    expect(src).toContain('>{fade}{children}</View>');
  });
});

describe('«Итог урока»: «Повторить ошибки» и подпись', () => {
  const host = read('app/lesson_complete.tsx');

  it('есть id ошибок — прежняя точечная тренировка; ошибки есть, а id нет — хаб «Мои ошибки»; без ошибок кнопки нет', () => {
    expect(host).toContain('onRepeatErrors={runMistakeIds.length > 0 ? finishMistakes : (!isComboCompletion && peekLessonRunErrors(lessonId).length > 0 ? openMistakesHub : undefined)}');
    expect(host).toContain("router.replace('/mistakes_hub' as never);");
    expect(host).toContain('if (!navOnce(`lesson_complete:mistakes_hub:${lessonId}`)) return;');
  });

  it('подпись «Урок N · тема» — как в эталоне practice.html#done2 (sub: «Урок 3 · Present Simple»)', () => {
    const mock = read('docs/design/v2-app/practice.html');
    expect(mock).toContain("sub: 'Урок 3 · Present Simple'");
    expect(host).toContain('lessonNamesForLang(lang)[lessonId - 1],\n              ].filter(Boolean).join(\' · \')');
  });
});
