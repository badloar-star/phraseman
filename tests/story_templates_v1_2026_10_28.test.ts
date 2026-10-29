// зачем (владелец 28.10: «эти все прекрасные шаблоны, их надо добавить и проверить, что они именно так выглядят в приложении»; макет
// docs/design/v2-app/stories-templates-v1.html): сторож 23 кадров историй — порядок и данные макета, строки Переводчика на 9 языках с формами
// слов, кривые CSS, формулы частиц и раскладки макета, событие → кадр (существующие и будущие типы), стиль (без обводок и жёстких цветов).
import fs from 'node:fs';
import path from 'node:path';
import { STORY_TEMPLATE_STRING_KEYS, tplNumber, tplText } from '../components/stories/templates/story_template_strings';
import {
  STORY_TEMPLATE_CTA, STORY_TEMPLATE_IDS, STORY_TEMPLATE_SAMPLES, studioEvents, studioStartIndex,
} from '../components/stories/templates/story_template_registry';
import { storyTemplateFromEvent } from '../components/stories/templates/story_template_from_event';
import { cubicBezier, EASE_OUT, frameMs, groupThousands, phase, pingPong } from '../components/stories/templates/story_frame_clock';
import {
  balancedWidth, coinDrops, confettiPieces, monthCells, snowFlakes, splitAlpha, streakWeekCells, summitTowerSize, titleWords, weekBars, WEEK_BAR_MAX,
} from '../components/stories/templates/story_template_layout';
import { dayKeyToMs, DAY_MS } from '../components/stories/templates/story_template_dates';
import { mix } from '../components/stories/templates/story_template_palette';
import type { Lang } from '../constants/i18n';

// подмены поднимаются выше импортов (jest hoist). Часы кадра импортируют useSharedValue; сами кривые и фазы — чистые функции
jest.mock('react-native-reanimated', () => ({ useSharedValue: (value: number) => ({ value }) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../app/achievements', () => ({ ALL_ACHIEVEMENTS: [{ id: 'streak_7' }, { id: 'streak_30' }, { id: 'streak_100' }, { id: 'lessons_10' }] }));
jest.mock('../app/coin_rank_table_v1', () => ({
  isValidCoinRank: (r: unknown) => typeof r === 'number' && r >= 0 && r <= 19,
  coinRankRowForDisplay: (r: number) => ({ priceToReach: r * 1000 }),
}));
jest.mock('../components/spire/spire_tower_model', () => ({ SPIRE_TW: 390, SPIRE_TOWER_GEOM: { height: 900 } }));
// палитра кадров берёт тему из контекста — для чистой функции mix() контекст и токены не нужны
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({}) }));
jest.mock('../constants/liquidGlassThemePalette', () => ({ liquidGlassTokens: () => ({}) }));

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const plain = (s: string): string => s.replace(/ /g, ' ');
const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const noComments = (src: string): string => src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n');

describe('шаблоны историй v1 — реестр', () => {
  it('23 кадра в порядке макета, у каждого — примерные данные своего id', () => {
    expect(STORY_TEMPLATE_IDS).toEqual(['streak7', 'streak100', 'ach', 'level', 'lesson', 'exam', 'summit', 'peakweek', 'duel', 'overtaken', 'friend', 'pack',
      'packpop', 'phrase', 'week', 'month', 'invite', 'holiday', 'rank', 'theme', 'coins', 'mistakes', 'dialog']);
    for (const id of STORY_TEMPLATE_IDS) expect(STORY_TEMPLATE_SAMPLES[id].id).toBe(id);
  });

  it('шесть кнопок действия макета — у «друг обогнал», «новый друг», «набор добавляют», «фраза дня», «пригласи», «новая тема»; седьмая — у анонса конкурса', () => {
    // зачем (владелец 29.10): кнопка «Открыть наборы» на последнем кадре анонса «Набор месяца» — сверх шести кнопок макета историй
    expect(Object.keys(STORY_TEMPLATE_CTA).sort()).toEqual(['contest_invite', 'friend', 'invite', 'overtaken', 'packpop', 'phrase', 'theme']);
    expect(STORY_TEMPLATE_CTA.theme).toEqual({ action: 'use_theme', label: 'ctaUseTheme', icon: 'color-palette' });
    expect(tplText('ru', 'ctaCatchUp')).toBe('Догнать');
    expect(tplText('ru', 'ctaShareLink')).toBe('Поделиться ссылкой');
  });

  it('фотостудия: кадр по id или номеру; 23 кадра макета, за ними 4 кадра анонса конкурса', () => {
    expect(studioStartIndex('duel')).toBe(8);
    expect(studioStartIndex('23')).toBe(22);
    expect(studioStartIndex('0')).toBe(0);
    expect(studioStartIndex(undefined)).toBe(0);
    const events = studioEvents(1);
    expect(events).toHaveLength(27);
    expect(events[8]).toMatchObject({ id: 'studio-duel', type: 'achievement', payload: { studioTemplate: 'duel' } });
    expect(events[23]).toMatchObject({ id: 'studio-contest_start', payload: { studioTemplate: 'contest_start' } });
  });
});

describe('шаблоны историй v1 — строки на 9 языках', () => {
  it('каждая строка подставляется на всех языках без «{…}»-хвостов', () => {
    const vars = { days: 7, next: 14, opened: 3, total: 24, toLevel: 'A2', chapters: 8, lessons: 96, lessonNo: 12, coins: 40, minutes: 6, chapter: 2,
      nextChapter: 3, league: 'Гранит', floor: 15, floors: 15, my: 4, their: 2, name: 'Тимур', min: 1, sec: 40, gap: 80, daysLeft: 2, packTitle: 'Еда',
      cards: 48, pct: 92, count: 14, time: '0:02', streak: 7, h: 3, m: '20', active: 21, daysInMonth: 31, exams: 2, date: '20 июля', theme: 'Титан',
      rank: 8, cleared: 12, left: 3, title: 'В кафе', done: 6, turns: 14,
      // анонс конкурса «Набор месяца» (29.10): голоса, месяцы Plus, место, друзья, дни Plus
      votes: 10, months: 3, place: 1, friends: 3, plusDays: 14 };
    for (const key of STORY_TEMPLATE_STRING_KEYS) {
      for (const lang of LANGS) {
        const text = tplText(lang, key, vars);
        expect([key, lang, /\{\w+\}/.test(text)]).toEqual([key, lang, false]);
        expect([key, lang, text.trim().length > 0]).toEqual([key, lang, true]);
      }
    }
  });

  it('тексты макета на русском и формы слов по числу (ru/uk/pl — три формы, en — две)', () => {
    expect(plain(tplText('ru', 'streakOverline', { days: 7 }))).toBe('Серия · 7 дней');
    expect(plain(tplText('ru', 'streakOverline', { days: 1 }))).toBe('Серия · 1 день');
    expect(plain(tplText('ru', 'streakNext', { next: 14 }))).toBe('Следующий рубеж — 14 дней');
    expect(plain(tplText('uk', 'streakOverline', { days: 3 }))).toBe('Серія · 3 дні');
    expect(plain(tplText('pl', 'streakOverline', { days: 22 }))).toBe('Seria · 22 dni');
    expect(plain(tplText('en', 'streakOverline', { days: 1 }))).toBe('Streak · 1 day');
    expect(plain(tplText('ru', 'levelBehind', { chapters: 8, lessons: 96 }))).toBe('Позади 8 глав и 96 уроков');
    expect(plain(tplText('ru', 'packAddedTitle', { count: 14 }))).toBe('Набор добавили 14 человек');
    expect(plain(tplText('ru', 'packAddedTitle', { count: 2 }))).toBe('Набор добавили 2 человека');
    expect(plain(tplText('ru', 'overtakenGap', { gap: 80, daysLeft: 2 }))).toBe('Разрыв 80 монет · до конца недели 2 дня');
    expect(plain(tplText('ru', 'peakSummitFloor', { floor: 15, floors: 15, coins: 980 }))).toBe('Этаж 15 из 15 · 980 монет за подъём');
    expect(plain(tplText('ru', 'coinsBigUnit', { coins: 10000 }))).toBe('монет на счету');
    expect(plain(tplText('ru', 'monthTitle', { active: 21, daysInMonth: 31 }))).toBe('21 день из 31');
    expect(plain(tplText('ru', 'dialogStats', { turns: 14, minutes: 4 }))).toBe('14 реплик · 4 минуты');
    expect(plain(tplText('ru', 'phraseListen', { time: '0:02' }))).toBe('Послушать · 0:02');
  });

  it('число не отрывается от слова: неразрывный пробел; разряды — «10 000»', () => {
    expect(tplText('ru', 'streakNext', { next: 14 })).toContain('14 дней');
    expect(tplNumber(10000)).toBe('10 000');
    expect(groupThousands(1420)).toBe('1 420');
  });
});

describe('шаблоны историй v1 — часы кадра и кривые макета', () => {
  it('cubic-bezier как в CSS: ease(.25,.1,.25,1) в 50 % ≈ 0,8024; линейная = x; концы 0 и 1', () => {
    expect(cubicBezier(0.25, 0.1, 0.25, 1)(0.5)).toBeCloseTo(0.8024, 3);
    expect(cubicBezier(0, 0, 1, 1)(0.37)).toBeCloseTo(0.37, 4);
    expect(EASE_OUT(0)).toBe(0);
    expect(EASE_OUT(1)).toBe(1);
    let prev = 0;
    for (let x = 0.05; x < 1; x += 0.05) { const y = EASE_OUT(x); expect(y).toBeGreaterThanOrEqual(prev); prev = y; }
    // пружина .34,1.56,.64,1 перелетает за 1 (stPop макета)
    expect(Math.max(...Array.from({ length: 19 }, (_, i) => cubicBezier(0.34, 1.56, 0.64, 1)((i + 1) / 20)))).toBeGreaterThan(1);
  });

  it('фаза отрезка, «конец» при уменьшении движения, вечный цикл в покое', () => {
    expect(phase(0, 100, 200)).toBe(0);
    expect(phase(200, 100, 200)).toBe(0.5);
    expect(phase(frameMs(0, 10000, true), 1300, 1100)).toBe(1);
    expect(frameMs(0.5, 10000, false)).toBe(5000);
    expect(pingPong(1300, 1300, false)).toBe(1);
    expect(pingPong(1300, 1300, true)).toBe(0);
  });
});

describe('шаблоны историй v1 — формулы макета', () => {
  it('конфетти: угол по кругу, радиус 120..232, сдвиг вниз 90, задержки d0 + (i % 6)·60', () => {
    const pieces = confettiPieces(18, 700, ['a', 'b', 'c', 'd']);
    expect(pieces).toHaveLength(18);
    expect(pieces[0]).toEqual({ color: 'a', dx: 120, dy: 90, rot: 0, d: 700 });
    expect(pieces[5]!.d).toBe(700 + 5 * 60);
    expect(pieces[6]!.d).toBe(700);
  });

  it('снег 26 и дождь монет 10 — формулы макета', () => {
    const flakes = snowFlakes();
    expect(flakes).toHaveLength(26);
    expect(flakes[1]).toEqual({ x: 37, size: 4, durMs: 8000, offsetMs: 900, sx: 0 });
    const drops = coinDrops();
    expect(drops.map((d) => d.rank)).toEqual([1, 7, 3, 9, 5, 12, 2, 8, 4, 10]);
    expect(drops[3]).toEqual({ rank: 9, x: 6 + 3 * 9.4, size: 26 + 3 * 7, durMs: 1500, d: 420, rot: 300 });
  });

  it('заголовок «как text-wrap: balance»: одна строка — по ширине слов, перенос — та же длина строк', () => {
    const one = balancedWidth([100, 50, 60], 9, 334);
    expect(one).toBeGreaterThanOrEqual(228);
    expect(one).toBeLessThanOrEqual(229);
    expect(balancedWidth([150, 150, 150], 9, 334)).toBeGreaterThanOrEqual(309);
    expect(balancedWidth([], 9, 334)).toBe(0);
  });

  // зачем (логи Сверки 29.10, кадр 13): «добавили 14 человек» было одним словом 333,71 dp при строке 334 — рвалось «челове|к».
  // Граница перед числом после слова есть (как words() макета), склейка «число → слово» и разряды «10 000» — остаются.
  it('слова заголовка: граница перед числом после слова, «14 человек» и «10 000» не делятся', () => {
    const nb = ' ';
    expect(titleWords(tplText('ru', 'packAddedTitle', { count: 14 }))).toEqual(['Набор', 'добавили', `14${nb}человек`]);
    expect(titleWords(`Получено${nb}10${nb}000${nb}монет`)).toEqual(['Получено', `10${nb}000${nb}монет`]);
    expect(titleWords(`14${nb}people added your pack`)).toEqual([`14${nb}people`, 'added', 'your', 'pack']);
    expect(titleWords(`Ранг${nb}−5${nb}мест`)).toEqual(['Ранг', `−5${nb}мест`]);
    expect(titleWords('Уровень A2 открыт')).toEqual(['Уровень', 'A2', 'открыт']);
    expect(titleWords('  ')).toEqual([]);
  });

  it('неделя серии: горят последние min(days, 7) дней, буквы дней — по дате события', () => {
    const end = new Date(2026, 9, 25, 12).getTime(); // воскресенье 25.10.2026
    const cells = streakWeekCells('ru', end, 3);
    expect(cells.map((c) => c.on)).toEqual([false, false, false, false, true, true, true]);
    expect(cells.map((c) => c.letter).join('')).toBe('ПВСЧПСВ');
    expect(streakWeekCells('ru', end, 100).every((c) => c.on)).toBe(true);
  });

  it('столбики недели — доля самого длинного дня (93 dp), он — в акценте; месяц — по порядку через 55 мс', () => {
    const bars = weekBars('ru', new Date(2026, 9, 19, 12).getTime(), [42, 70, 55, 90, 30, 80, 100]);
    expect(bars.map((b) => b.h)).toEqual([39, 65, 51, 84, 28, 74, WEEK_BAR_MAX]);
    expect(bars.map((b) => b.top)).toEqual([false, false, false, false, false, false, true]);
    expect(bars[3]!.d).toBe(150 + 3 * 90);
    expect(weekBars('ru', 0, [0, 0, 0, 0, 0, 0, 0]).every((b) => b.h === 0 && !b.top)).toBe(true);
    const cells = monthCells(31, [1, 2, 5]);
    expect(cells).toHaveLength(31);
    expect(cells.filter((c) => c.on).map((c) => c.d)).toEqual([200, 255, 310]);
  });

  it('башня: ширина ≤ 200, высота ≤ 400; на низком экране меньше', () => {
    expect(summitTowerSize(844)).toEqual({ width: 173, height: 399 });
    const small = summitTowerSize(640);
    expect(small.height).toBeLessThan(399);
    expect(small.height).toBeGreaterThanOrEqual(150);
  });

  it('цвет токена → сплошной + прозрачность', () => {
    expect(splitAlpha('#3FD9A655')).toEqual({ solid: '#3FD9A6', alpha: 0x55 / 255 });
    expect(splitAlpha('#FFFFFF')).toEqual({ solid: '#FFFFFF', alpha: 1 });
    expect(splitAlpha('rgba(10, 20, 30, 0.5)')).toEqual({ solid: 'rgb(10, 20, 30)', alpha: 0.5 });
  });

  // зачем (Сверка 28.10, кадр 3 «плитка под ачивкой» в светлом): color-mix(in srgb, X N%, transparent) умножает свою прозрачность X на N.
  // Тень светлых тем — #RRGGBB29 (≈ 16 %): × 70 % = ≈ 11 %, а не 70 % (было в ~6 раз темнее макета).
  it('mix() — как color-mix макета: своя прозрачность токена × доля', () => {
    const alphaOf = (rgba: string): number => Number(/,([\d.]+)\)$/.exec(rgba)?.[1]);
    expect(mix('#36365929', 0.7)).toMatch(/^rgba\(54,54,89,/);
    expect(alphaOf(mix('#36365929', 0.7))).toBeCloseTo((0x29 / 255) * 0.7, 4);
    expect(mix('#000000', 0.7)).toBe('rgba(0,0,0,0.7)');
    expect(alphaOf(mix('rgba(0, 0, 0, 0.5)', 0.55))).toBeCloseTo(0.275, 4);
    expect(mix('#FFFFFF', 0)).toBe('rgba(255,255,255,0)');
  });
});

describe('шаблоны историй v1 — событие → кадр', () => {
  const at = new Date(2026, 9, 25, 12).getTime();
  const ev = (type: string, payload: Record<string, unknown>) => ({ type, payload, atMs: at });

  it('рубеж серии: обычный — неделя дней, 100/365/1000 — 100 клеток с датой начала', () => {
    expect(storyTemplateFromEvent(ev('streak_milestone', { days: 7, dayKey: '2026-10-25' }))).toMatchObject({ id: 'streak7', days: 7, next: 14 });
    const big = storyTemplateFromEvent(ev('streak_milestone', { days: 100, dayKey: '2026-10-27' }));
    expect(big).toMatchObject({ id: 'streak100', days: 100, next: 150 });
    expect(big && 'startMs' in big ? big.startMs : 0).toBe((dayKeyToMs('2026-10-27') ?? 0) - 99 * DAY_MS);
    expect(storyTemplateFromEvent(ev('streak_milestone', { days: 0 }))).toBeNull();
  });

  it('ачивка серии — «следующая» по каталогу; итог недели — тройка из плоских полей или без соседей', () => {
    expect(storyTemplateFromEvent(ev('achievement', { achievementId: 'streak_7' }))).toMatchObject({ id: 'ach', nextDays: 30, opened: null });
    const week = storyTemplateFromEvent(ev('spire_week', { outcome: 'stay', floor: 1, place: 2, total: 30, weekCoins: 1420, p1Name: 'Марина', p1Rank: 9, p1Coins: 1610, p2Me: true, p2Coins: 1420 }));
    expect(week).toMatchObject({ id: 'peakweek', tier: 1, outcome: 'stay', place: 2, total: 30 });
    expect(week && week.id === 'peakweek' ? week.podium : null).toEqual([
      { place: 1, name: 'Марина', rank: 9, coins: 1610, me: false },
      { place: 2, name: '', rank: null, coins: 1420, me: true },
    ]);
    expect(storyTemplateFromEvent(ev('spire_week', { outcome: 'up', floor: 2 }))).toMatchObject({ podium: null });
  });

  it('ранг монеты — цена и следующая цена; тема — только особая; объявление — прежний кадр', () => {
    expect(storyTemplateFromEvent(ev('coin_rank_up', { toRank: 6 }))).toEqual({ id: 'rank', toRank: 6, price: 6000, nextPrice: 7000 });
    expect(storyTemplateFromEvent(ev('coin_rank_up', { toRank: 19 }))).toMatchObject({ nextPrice: null });
    expect(storyTemplateFromEvent(ev('theme_unlock', { themeId: 'grad_full_titanium' }))).toMatchObject({ id: 'theme', themeId: 'grad_full_titanium' });
    expect(storyTemplateFromEvent(ev('theme_unlock', { themeId: 'ink' }))).toBeNull();
    expect(storyTemplateFromEvent(ev('announcement', { title: 'x' }))).toBeNull();
  });

  it('будущие события — плоский контракт payload (списки строкой)', () => {
    expect(storyTemplateFromEvent(ev('duel_won', { friendName: 'Тимур', friendRank: 8, myScore: 4, theirScore: 2, seconds: 100 })))
      .toEqual({ id: 'duel', friend: { name: 'Тимур', rank: 8 }, myScore: 4, theirScore: 2, rounds: 5, seconds: 100 });
    expect(storyTemplateFromEvent(ev('pack_learned', { packTitle: 'B2', cards: 126, knownPct: 92, days: 11, samples: 'hire=нанимать|fire=увольнять' })))
      .toMatchObject({ samples: [{ term: 'hire', meaning: 'нанимать' }, { term: 'fire', meaning: 'увольнять' }] });
    expect(storyTemplateFromEvent(ev('dialog_done', { title: 'В кафе', bubbles: 'them:¿Me pones un café?|me:Claro.' })))
      .toMatchObject({ bubbles: [{ me: false, text: '¿Me pones un café?' }, { me: true, text: 'Claro.' }] });
    expect(storyTemplateFromEvent(ev('week_recap', { startDayKey: '2026-10-19', dailyMinutes: '42,70,55' })))
      .toMatchObject({ id: 'week', dailyMinutes: [42, 70, 55] });
    expect(storyTemplateFromEvent(ev('friend_joined', {}))).toBeNull();
  });

  it('метка фотостудии действует только в просмотре фотостудии', () => {
    const marked = ev('achievement', { studioTemplate: 'duel' });
    expect(storyTemplateFromEvent(marked, true)).toBe(STORY_TEMPLATE_SAMPLES.duel);
    expect(storyTemplateFromEvent(marked, false)).toBeNull();
  });
});

describe('шаблоны историй v1 — стиль и связи', () => {
  const dir = 'components/stories/templates';
  const files = fs.readdirSync(path.join(ROOT, dir)).filter((f) => /\.(tsx?|ts)$/.test(f));

  it('без обводок контейнеров, без ужатия шрифта, без жёстких цветов (только токены темы)', () => {
    for (const f of files) {
      const src = noComments(read(`${dir}/${f}`));
      expect([f, /borderWidth|borderColor/.test(src)]).toEqual([f, false]);
      expect([f, /adjustsFontSizeToFit/.test(src)]).toEqual([f, false]);
      expect([f, src.match(/['"`]#[0-9a-fA-F]{3,8}['"`]/g)]).toEqual([f, null]);
      expect([f, src.match(/['"`]rgba?\(\s*\d/g)]).toEqual([f, null]);
    }
  });

  it('просмотр рисует кадр шаблона с часами кадра, кнопкой действия и паузой; фотостудия — в dev-маршруте', () => {
    const viewer = read('components/stories/StoryViewer.tsx');
    expect(viewer).toContain('storyTemplateFromEvent(event, studio)');
    expect(viewer).toContain('<StoryFrameClockProvider value={clock}>');
    expect(viewer).toContain('final: reduceMotion || screenReader');
    expect(viewer).toContain('<StoryPauseBadge visible={heldUi} />');
    expect(viewer).toContain('if (studioSettle) { progress.value = Math.min(1, STORY_SETTLE_MS / duration);');
    expect(viewer).toContain('if (reduceMotion) { progress.value = 1;');
    const route = read('app/dev_moments_preview.tsx');
    expect(route).toContain("'stories', 'announcements'] as const");
    expect(route).toContain("<StoryTemplateStudio key={key} lang={lang} frame={params.frame} settle={params.settle === '1'} />");
    expect(route).toContain("<AnnouncementV2Studio key={key} lang={lang} frame={params.frame} long={params.long === '1'} settle={params.settle === '1'} />");
  });
});
