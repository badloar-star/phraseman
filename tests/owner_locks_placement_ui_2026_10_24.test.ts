// ЗАМКИ по интерфейсу теста «Не хочу с начала» (макет docs/design/v2-app/chapter-exam-season.html, раздел 6; слово координатора 24.10 «только интерфейс, 1 в 1, за флагом»;
// владелец 21.10 №10: тест БЕСПЛАТНО; реестр docs/work/OWNER_LOCKS.md). Падает, если размеры уйдут от макета, у теста появится цена/энергия, флаг включат без моста.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

describe('Замки: тест «Не хочу с начала» — интерфейс по макету', () => {
  const chrome = code(read('components/learning-v2/placement/PlacementChrome.tsx'));
  const start = code(read('components/learning-v2/placement/PlacementStartView.tsx'));
  const result = code(read('components/learning-v2/placement/PlacementResultView.tsx'));
  const screen = code(read('app/learning_v2_placement.tsx'));
  const flags = read('components/learning-v2/placement/placement_flags.ts');
  const entry = code(read('components/learning-v2/season/SeasonCourseConnected.tsx'));

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «макет 1:1, ничего не толкуем» — размеры шапки, карточки темы, точек, плашки и подвала из CSS макета (.extop .topic .tries .extra .exfoot)
  it('размеры обвязки — из CSS макета', () => {
    expect(chrome).toContain('top: { gap: 12, minHeight: 54, marginTop: 2, close: 44, closeIcon: 22 }');
    expect(chrome).toContain('topic: { marginTop: 10, radius: 18, padV: 10, padH: 12, gap: 12, tile: 46, tileRadius: 12, tileIcon: 22');
    expect(chrome).toContain('dot: 10, dotGap: 5');
    expect(chrome).toContain('extra: { marginTop: 12, radius: 16, padV: 10, padH: 14, size: 15, line: 21, gap: 8, icon: 16 }');
    expect(chrome).toContain('foot: { padTop: 12, padH: 20, padBottom: 34, cta: 52, ghost: 50, ghostGap: 10 }');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «макет 1:1» — старт: плитка 55, заголовок 28/34, абзац 16/23, три правила с кружками 28
  it('старт: размеры и три правила', () => {
    expect(start).toContain("tile: { width: 55, height: 55, borderRadius: 14");
    expect(start).toContain("fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4");
    expect(start).toContain('fontSize: 16, lineHeight: 23');
    expect(start).toContain("RULE_KEYS = ['rule1', 'rule2', 'rule3']");
    expect(start).toContain('width: 28, height: 28, borderRadius: 14');
    expect(start).toContain("ghostLabel={placementCopy(lang, 'startOver')}");
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «макет 1:1» — итог: «Открыто до урока N» 34/40, строки уроков с «открыт» зелёным и «начнём здесь», кнопка «Начать урок N»
  it('итог: заголовок, строки и кнопка', () => {
    expect(result).toContain("fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1");
    expect(result).toContain("placementCopy(lang, 'resultTitle'");
    expect(result).toContain("kind === 'opened'");
    expect(result).toContain("placementCopy(lang, 'here')");
    expect(result).toContain("placementCopy(lang, 'startLesson'");
  });

  // ЗАМОК ВЛАДЕЛЬЦА 21.10: «входной тест БЕСПЛАТНО» — ни энергии, ни цены, ни пейвола в экранах теста
  it('тест бесплатный: нет ни энергии, ни пейвола, ни покупок', () => {
    for (const src of [chrome, start, result, screen]) {
      expect(src).not.toMatch(/Energy|energy|paywall|Paywall|NoEnergy|confirmActivityStart/u);
    }
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «обводок нет» (стиль «Тень») — экраны теста без borderWidth/borderColor
  it('без обводок контейнеров', () => {
    for (const src of [chrome, start, result]) {
      expect(src).not.toMatch(/borderWidth|borderColor/u);
    }
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: координатор 24.10 «за флагом» — пока Learning V2 не подключил вопросы и прогресс, флаг выключен, вход с обложки ведёт как раньше
  // ЗАМОК ВЛАДЕЛЬЦА 25.10 (через координатора): «Не хочу с начала» ВХОДИТ в релиз — флаг включён; вход и редирект по-прежнему через флаг
  it('флаг включён (релиз 25.10), вход с обложки ведёт на тест только по флагу, выключенный экран уводит назад', () => {
    expect(flags).toContain('LEARNING_V2_PLACEMENT_UI_ENABLED = true as boolean');
    expect(entry).toContain('if (LEARNING_V2_PLACEMENT_UI_ENABLED) { router.push(LEARNING_V2_PLACEMENT_HREF as never); return; }');
    expect(code(read('app/learning_v2_placement_route.ts'))).toContain("LEARNING_V2_PLACEMENT_HREF = '/learning_v2_placement'");
    expect(screen).toContain('isLearningV2Hidden()');
    expect(screen).toContain('if (!LEARNING_V2_PLACEMENT_UI_ENABLED) {');
    expect(screen).toContain('<Redirect href=');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «кнопка «Не хочу с начала» только 1 раз на аккаунт, после того как он прошёл и ему что-то открылось или нет» — при переходе на тест флаг НЕ ставится, он ставится на итоге
  it('вход на тест не ставит флаг «использовано» (его ставит только итог)', () => {
    const push = entry.indexOf('router.push(LEARNING_V2_PLACEMENT_HREF');
    const mark = entry.indexOf("markLearningV2NotFromStartUsedV1('season_cover')");
    expect(push).toBeGreaterThan(0);
    expect(mark).toBeGreaterThan(push);
    expect(read('components/learning-v2/placement/placement_bridge_live.tsx')).toContain('applyLearningV2PlacementResultV1');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «движок и прогресс — Learning V2, их файлы не трогать» — экран считает только через placement_test_v1 и мост
  it('счёт — только движок, вопросы и запись прогресса — только через мост', () => {
    expect(screen).toContain("from '../modules/learning-v2/exam/placement_test_v1'");
    expect(screen).toContain('bridge.questionFor');
    expect(screen).toContain('bridge.applyResult');
    expect(screen).not.toMatch(/AsyncStorage|firestore|Firestore|fetch\(/u);
  });
});
