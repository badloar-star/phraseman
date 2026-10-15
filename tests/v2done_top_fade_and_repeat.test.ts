// зачем (вердикт Макетов 06b311f0d по «Итогу урока», координатор 15.10): (б) при прокрутке заголовок заезжал под значки статус-бара — верхний скрим цвета фона экрана, включается только после прокрутки;
// (а) «Повторить ошибки» стоит в блоке «Ошибки» эталона practice#done2 всегда — при ошибках без id кнопка ведёт в хаб ошибок; (в) подпись «Урок N · тема» совпадает с practice.html#done2.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«Итог урока»: верхний скрим при прокрутке', () => {
  const src = read('components/completion/V2DoneScreen.tsx');

  it('скрим цвета фона экрана, прозрачный к низу, высота = inset + 28; включается порогом 6 dp, в покое скрыт', () => {
    expect(src).toContain('const [scrolled, setScrolled] = useState(false);');
    expect(src).toContain('const next = e.nativeEvent.contentOffset.y > TOP_FADE_SHOW_AT;');
    expect(src).toContain('setScrolled((prev) => (prev === next ? prev : next));');
    expect(src).toContain('colors={[g.bg, g.bg, alphaHex(g.bg, 0)]}');
    expect(src).toContain('locations={[0, insets.top / (insets.top + TOP_FADE_FEATHER), 1]}');
    expect(src).toContain('const TOP_FADE_SHOW_AT = 6;');
    expect(src).toContain('const TOP_FADE_FEATHER = 28;');
    expect(src).toContain('{scrolled ? (');
  });

  it('скрим — того же цвета, что корень экрана (шва нет); не перехватывает касания', () => {
    expect(src).toContain('style={[s.root, { backgroundColor: g.bg }]}');
    expect(src).toMatch(/<LinearGradient\s+pointerEvents="none"\s+testID="v2-done-top-fade"/);
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
