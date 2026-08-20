import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * Форма вёрстки обвязки Арены.
 *
 * Владелец увидел чёрные полосы в сейф-зонах и потребовал «как на главной».
 * Ловушка здесь не в цвете, а в Yoga: отступы родителя сдвигают и абсолютно
 * позиционированных детей. `paddingTop` на корне утаскивает фон вниз ровно на
 * высоту сейф-зоны — полоса возвращается, только рисует её теперь сам корень.
 * Ошибка молчит: типы сходятся, тесты логики зелёные, видно её лишь глазами на
 * устройстве с вырезом. Поэтому она проверяется по исходнику.
 */
describe('Arena chrome layout source contract', () => {
  const screen = read('components/arena/ArenaScreen.tsx');
  const chrome = read('components/arena/ArenaHubChrome.tsx');
  const tabBar = read('components/arena/ArenaTabBar.tsx');

  test('фон экрана идёт под сейф-зону: отступ живёт на содержимом, не на корне', () => {
    expect(screen).toContain('styles.root, { backgroundColor: P.bg }');
    expect(screen).not.toContain('styles.root, { backgroundColor: P.bg, paddingTop');
    expect(screen).toContain('paddingTop: insets.top, paddingBottom');
  });

  test('арт не обрезается сейф-зоной сверху', () => {
    expect(screen).toContain('capSafeTop={false}');
  });

  test('место под плавающий таббар добавляется содержимому через контекст', () => {
    expect(screen).toContain('useArenaChromeInset()');
    // Оба пути — прокручиваемый и фиксированный — должны учесть обвязку:
    // забыть один значит спрятать нижнюю строку ровно на одном из двух видов
    // экранов, а это самый незаметный вид поломки.
    const withInset = screen.match(/paddingBottom: Math\.max\([^)]*\) \+ chromeInset/g) ?? [];
    expect(withInset.length).toBe(2);
  });

  test('обвязка не режет высоту экрана своим отступом', () => {
    // По частям: добавить провайдеру ещё один проп — правка здоровая.
    expect(chrome).toContain('ArenaChromeInsetContext.Provider');
    expect(chrome).toContain('arenaHubBodyPaddingBottom(insets.bottom)');
    expect(chrome).toContain('<View style={styles.body}>');
    expect(chrome).not.toContain('styles.body, { paddingBottom');
  });

  test('поля таббара входят в ширину экрана, а не прибавляются к 100%', () => {
    // `width: 100%` вместе с `marginHorizontal` даёт полосу шире телефона на
    // сумму обоих полей. Поля принадлежат внешней обёртке, а сама пилюля уже
    // занимает оставшуюся ширину.
    expect(tabBar).toContain('paddingHorizontal: 14');
    expect(tabBar).not.toContain('marginHorizontal: 14');
  });
});

describe('Arena screen back lock source contract', () => {
  const screen = read('components/arena/ArenaScreen.tsx');

  test('allows callers to disable the actual header back control without changing its default', () => {
    expect(screen).toContain('backDisabled = false');
    expect(screen).toContain('backDisabled?: boolean;');
    expect(screen).toContain('disabled={backDisabled}');
    expect(screen).toContain('accessibilityState={{ disabled: backDisabled }}');
    expect(screen).toContain('onPress={onBack ?? (() => safeRouterBack(router, navigationFallbackForPath(pathname) as never))}');
  });
});

describe('Arena visible-loading ban', () => {
  test('экран рангов не показывает слово «Загрузка»', () => {
    // Владелец: видимой загрузки нет нигде. Блок «рядом с тобой» показывал её
    // долю секунды и дёргал страницу прыжком высоты.
    const ranks = read('app/arena_ranks.tsx');
    expect(ranks).not.toContain(": 'loading')");
    expect(ranks).toContain("friendsState === 'failed' || friendsState === 'empty'");
  });
});

describe('Arena versus intro on narrow screens', () => {
  test('колонки игроков тянутся, а не заданы жёсткой шириной', () => {
    // 108 + 108 + 46 + отступы не помещаются в 320 pt: ряд не переносится и
    // не сжимается, крайние аватары уезжали за край.
    const intro = read('components/arena/ArenaVersusIntro.tsx');
    expect(intro).toContain("player: { alignItems: 'center', gap: 8, flex: 1, maxWidth: 108 }");
    expect(intro).toContain('const avatarSize = narrow ? 62 : 78;');
    expect(intro).toContain('allowFontScaling={false}');
  });
});

describe('Arena rejected report is surfaced, not swallowed', () => {
  const match = read('app/arena_match.tsx');
  const results = read('app/arena_results.tsx');

  test('экран матча доносит отказ до экрана результата', () => {
    // Отчёт, отвергнутый сервером по существу, дослать нельзя — но и молчать
    // о нём нельзя: экран результата иначе включал «ждём соперника», то есть
    // обещал награду, которая не придёт.
    expect(match).toContain("if (failure === 'rejected') {");
    expect(match).toContain('rejected = true;');
    expect(match).toContain('await arenaOutboxRemove(AsyncStorage as unknown as ArenaKeyValueStore, matchId);');
    expect(match).toContain("params: rejected ? { matchId, reportRejected: '1' } : { matchId }");
  });

  test('экран результата показывает отказ и гасит ожидание соперника', () => {
    expect(results).toContain("params.reportRejected === '1'");
    expect(results).toContain("arenaText(lang, 'reportRejected')");
    expect(results).toContain('!reportRejected && !reportPending && match');
  });
});

describe('Arena expansion screens share one visibility rule', () => {
  test('экраны спрашивают общее правило, а не переписывают его у себя', () => {
    // `arenaExpansionShowsState` был написан и не подключён ни к одному
    // экрану: правило жило в модуле, а решали его экраны, каждый по-своему.
    // Такое расхождение молчит — экран просто ничего не рисует.
    const partner = read('app/arena_partner.tsx');
    const lab = read('app/arena_match_lab.tsx');
    expect(partner).toContain('arenaExpansionShowsState(state)');
    expect(partner).not.toContain("state === 'loading' || state === 'unavailable'");
    expect(lab).toContain('arenaExpansionShowsState(state) || !plan');
  });
});

describe('Arena mode sheet stays reachable at large font', () => {
  const sheet = read('components/arena/ArenaModeSheet.tsx');

  test('у шторки есть потолок высоты и прокрутка списка', () => {
    // Шторка прижата к низу и растёт вверх. При крупном системном шрифте
    // пять режимов с описаниями перерастали экран, и верх листа — заголовок
    // и первые режимы — уезжал за верхний край без всякой возможности до
    // него добраться. Ровно тот же класс поломки, что и выдавленная кнопка
    // отправки в сборщике перевода.
    expect(sheet).toContain('maxHeight: height * 0.86');
    expect(sheet).toContain('<ScrollView');
    expect(sheet).toContain('style={styles.listScroll}');
    expect(sheet).toContain('contentContainerStyle={styles.list}');
  });

  test('заголовок и ручка остаются снаружи прокрутки', () => {
    const titleAt = sheet.indexOf('styles.sheetTitle');
    const scrollAt = sheet.indexOf('styles.listScroll');
    expect(titleAt).toBeGreaterThan(0);
    expect(scrollAt).toBeGreaterThan(titleAt);
  });
});

describe('Arena text scales with the system font', () => {
  const DIRS = ['app', 'components/arena', 'hooks'];

  function arenaSources(): readonly string[] {
    const out: string[] = [];
    for (const dir of DIRS) {
      const full = path.join(ROOT, dir);
      for (const name of fs.readdirSync(full)) {
        if (!/\.tsx?$/.test(name)) continue;
        if (dir === 'app' && !name.startsWith('arena')) continue;
        if (dir === 'hooks' && !name.startsWith('use_arena')) continue;
        out.push(path.join(dir, name));
      }
    }
    return out;
  }

  test('ни один экран Арены не задаёт высоту строки числом', () => {
    /**
     * В React Native системный крупный шрифт увеличивает `fontSize`, но
     * `lineHeight` остаётся тем числом, что записано в стиле. Пара
     * «fontSize 22 / lineHeight 29» при полуторном шрифте даёт кегль 33 в
     * строке высотой 29: строки наезжают друг на друга и обрезаются.
     *
     * Проверка сплошная и без исключений: поймать это глазами можно только
     * на устройстве с включённым крупным шрифтом, то есть у тех самых людей,
     * которым он нужен. Правильная запись — `lineHeight: 29 * fontScale`.
     */
    const guilty: string[] = [];
    for (const rel of arenaSources()) {
      const source = read(rel);
      const matches = source.match(/lineHeight: \d+\s*[,}]/g);
      if (matches) guilty.push(`${rel}: ${matches.join(' ')}`);
    }
    expect(guilty).toEqual([]);
  });

  test('масштаб берётся из одного места', () => {
    const hook = read('hooks/use_arena_font_scale.ts');
    expect(hook).toContain('useWindowDimensions()');
    expect(hook).toContain('fontScale');
  });
});
