// ЗАМОК: владелец 05.11 ~14:45 «Хаб карточек — СПИСКОМ, по уже утверждённому макету» и ~20:55 «ХАБ ДЕЛАЕТ КАК МАКЕТ Я ОДОБРИЛ».
// Эталон: docs/work/golden/approved-rev8/hub-community-approved-rev4.png + интерактивный макет approved-rev8 (views.js `view === 'cards'`,
// preview.css `.screen-head`, `.screen-content`, `.row-card`). Сторож держит список: порядок строк, предметы, анатомию строки и шапки,
// размеры макета, 9 языков «Моих ошибок», отсутствие стопки/кнопки «Тренироваться»/пилюли «30/30»/обводок/вечных анимаций,
// и то, что тренировка (окно режимов, лимит, ?train=1 из «Сохранённых» и наборов) осталась в FlashcardsHubScreen.
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCardsHubRows,
  cardsHubMistakesTitle,
  cardsHubRowA11yLabel,
  CARDS_HUB_MISTAKES_ROUTE,
  CARDS_HUB_ROW_ART,
  CARDS_HUB_ROW_ORDER,
} from '../app/flashcards/cards_hub_rows';
import type { Lang } from '../constants/i18n';
import { THEMED_ART_GENERATED } from '../components/theme/themed_art_assets.generated';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('хаб «Карточки» — список по утверждённому макету rev4', () => {
  const view = read('app/flashcards/CardsHubV2.tsx');
  const screen = read('app/flashcards/FlashcardsHubScreen.tsx');

  it('порядок строк как в макете: Сохранённые, Мои наборы, Из видео, Мои ошибки, Сообщество', () => {
    expect(CARDS_HUB_ROW_ORDER).toEqual(['saved', 'mine', 'video', 'mistakes', 'community']);
    const noop = () => undefined;
    // строки приходят в другом порядке — список всё равно в порядке макета
    const rows = buildCardsHubRows([
      { id: 'community', title: 'C', count: '5', onPress: noop },
      { id: 'mistakes', title: 'M', count: '', onPress: noop },
      { id: 'saved', title: 'S', count: '64', onPress: noop },
      { id: 'video', title: 'V', count: '6', onPress: noop },
      { id: 'mine', title: 'N', count: '3', onPress: noop },
    ]);
    expect(rows.map((r) => r.id)).toEqual(['saved', 'mine', 'video', 'mistakes', 'community']);
  });

  it('предметы строк — имена макета, у каждого есть тёмный и светлый комплект', () => {
    expect(CARDS_HUB_ROW_ART).toEqual({
      saved: 'cards_empty_saved', mine: 'cards', video: 'cards_from_video', mistakes: 'mistakes_entry', community: 'dialogs',
    });
    for (const name of Object.values(CARDS_HUB_ROW_ART)) {
      const slots = (THEMED_ART_GENERATED as Record<string, { dark?: unknown; light?: unknown }>)[name];
      expect(slots?.dark).toBeTruthy();
      expect(slots?.light).toBeTruthy();
    }
  });

  it('пропавшая строка не роняет список и пишет причину [CARDS-HUB]', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const rows = buildCardsHubRows([{ id: 'saved', title: 'S', count: '', onPress: () => undefined }]);
    expect(rows.map((r) => r.id)).toEqual(['saved']);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('[CARDS-HUB] row missing'))).toBe(true);
    warn.mockRestore();
  });

  it('«Мои ошибки»: 9 языков, слова плитки Главной, маршрут /mistakes_hub', () => {
    const expected: Record<Lang, string> = {
      ru: 'Мои ошибки', uk: 'Мої помилки', en: 'My mistakes', es: 'Mis errores', 'pt-BR': 'Meus erros',
      vi: 'Lỗi của tôi', id: 'Kesalahanku', tr: 'Hatalarım', pl: 'Moje błędy',
    } as Record<Lang, string>;
    for (const [lang, title] of Object.entries(expected)) expect(cardsHubMistakesTitle(lang as Lang)).toBe(title);
    expect(CARDS_HUB_MISTAKES_ROUTE).toBe('/mistakes_hub');
    expect(read('app/(tabs)/home.tsx')).toContain("nav.push('/mistakes_hub' as never)");
  });

  it('число на экране не рисуется, но остаётся для скринридера', () => {
    expect(cardsHubRowA11yLabel({ title: 'Сохранённые', count: '64', unit: 'карточек' })).toBe('Сохранённые. карточек: 64');
    expect(cardsHubRowA11yLabel({ title: 'Мои ошибки', count: '' })).toBe('Мои ошибки');
    expect(view).toContain('accessibilityLabel={cardsHubRowA11yLabel(row)}');
    expect(view).not.toMatch(/\{row\.count\}|\{t\.count\}/);
  });

  it('анатомия строки `.row-card`: плашка r18, поля 16, зазор 12, предмет 54, название 16/700, шеврон 22', () => {
    expect(view).toMatch(/row: \{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: ROW_RADIUS/);
    expect(view).toContain('const ROW_RADIUS = 18;');
    expect(view).toContain('const ART_SIZE = 54;');
    expect(view).toMatch(/rowTitle: \{ flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700' \}/);
    expect(view).toContain('<BackGlyph size={22} color={g.text} style={styles.chevron} />');
    expect(view).toContain("chevron: { transform: [{ scaleX: -1 }] }");
    // порядок внутри строки: предмет → название → шеврон
    const rowStart = view.indexOf('const CardsHubListRow');
    const art = view.indexOf('<ThemedArtLayers', rowStart);
    const title = view.indexOf('styles.rowTitle', rowStart);
    const chevron = view.indexOf('styles.chevron', rowStart);
    expect(art).toBeGreaterThan(rowStart);
    expect(title).toBeGreaterThan(art);
    expect(chevron).toBeGreaterThan(title);
    // testID строк прежние — робот и ссылки не ломаются; «Мои ошибки» — новый fc-cards-hub-tile-mistakes
    expect(view).toContain('testID={`fc-cards-hub-tile-${row.id}`}');
  });

  it('шапка `.screen-head`: круглая «назад» 44, заголовок 23/800 в строку, круглый «+» 44 → «Создать набор»', () => {
    expect(view).toMatch(/head: \{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 \}/);
    expect(view).toContain('const ROUND = 44;');
    expect(view).toMatch(/title: \{ flex: 1, fontSize: 23, lineHeight: 29, fontWeight: '800'/);
    const back = view.indexOf('testID="fc-cards-hub-back"');
    const title = view.indexOf('accessibilityRole="header"');
    const plus = view.indexOf('testID="fc-cards-hub-create-pack"');
    expect(back).toBeGreaterThan(-1);
    expect(title).toBeGreaterThan(back);
    expect(plus).toBeGreaterThan(title);
    expect(view.slice(plus, plus + 400)).toContain('onPress={onCreate}');
    expect(view).toMatch(/list: \{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 12 \}/);
  });

  it('стопки, кнопки «Тренироваться», пилюли «30/30», подзаголовка, обводок и вечных анимаций нет', () => {
    for (const gone of ['fc-cards-hub-train', 'fc-cards-hub-limit', 'stackTop', 'StackCard', 'Boarding pass', 'withRepeat', 'subtitle}', 'Начни с готового', 'Откроется']) {
      expect(view).not.toContain(gone);
    }
    expect(view).not.toMatch(/borderWidth|borderColor/);
    expect(view).not.toMatch(/adjustsFontSizeToFit/);
    // цвета — только токены темы
    expect(view).not.toMatch(/['"]#[0-9a-fA-F]{3,8}['"]/);
  });

  it('тренировка не потеряна: окно режимов, лимит и вход ?train=1 живут в экране; «Сохранённые» и наборы ведут в него', () => {
    expect(screen).toContain('<FlashcardsTrainingModeSheet');
    expect(screen).toContain('limitLabel={limitLabel}');
    expect(screen).toContain('useLocalSearchParams<{ train?: string; deck?: string; cnt?: string }>()');
    expect(read('app/flashcards_collection.tsx')).toContain("router.navigate({ pathname: '/flashcards', params: { train: '1' } } as never);");
    expect(read('app/flashcards_my_packs.tsx')).toContain("params: { train: '1', deck: `pack:${pack.id}`");
  });

  it('прежние разделы на месте: маршруты четырёх строк из экрана + «Мои ошибки»', () => {
    expect(screen).toContain("pathname: '/flashcards_collection', params: { cat: 'saved', from: 'hub' }");
    expect(screen).toContain("router.push('/flashcards_my_packs' as never)");
    expect(screen).toContain("router.push('/flashcards_video_packs' as never)");
    expect(screen).toContain("router.push('/flashcards_packs' as never)");
    expect(view).toContain('router.push(CARDS_HUB_MISTAKES_ROUTE as never)');
  });
});
