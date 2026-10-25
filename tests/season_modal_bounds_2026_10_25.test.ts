// зачем (жалоба владельца, iPhone 2.0.2, 25.10: окно эпизода «Сезона» съехало вправо — правый край и кнопка обрезаны, низ просвечивал): окно эпизода
// ВСЕГДА целиком в экране и после входа полностью видно. Таблица для чистых границ + контракт на карту (журнал [EPISODE-MODAL], страховка входа, сдвиг).
import * as fs from 'fs';
import * as path from 'path';
import { seasonModalInside, seasonModalMaxWidth, seasonModalShift } from '../components/learning-v2/season/season_modal_bounds';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const W = 393; // iPhone 15/16

describe('границы окна эпизода', () => {
  it('на месте (поля 24 по бокам) — сдвиг 0 и «внутри»', () => {
    expect(seasonModalInside({ x: 24, width: 345 }, W)).toBe(true);
    expect(seasonModalShift({ x: 24, width: 345 }, W)).toBe(0);
  });

  it('допуск полпикселя: округление измерения — не смещение', () => {
    expect(seasonModalInside({ x: -0.4, width: 393.8 }, W)).toBe(true);
    expect(seasonModalShift({ x: 24.3, width: 345.2 }, W)).toBe(0);
  });

  it('съехало вправо (жалоба): правый край за экраном — сдвиг влево до левого поля 24', () => {
    const rect = { x: 100, width: 345 }; // правый край 445 > 393
    expect(seasonModalInside(rect, W)).toBe(false);
    const dx = seasonModalShift(rect, W);
    expect(dx).toBe(-76);
    expect(seasonModalInside({ x: rect.x + dx, width: rect.width }, W)).toBe(true);
  });

  it('съехало влево — сдвиг вправо', () => {
    const dx = seasonModalShift({ x: -60, width: 345 }, W);
    expect(dx).toBe(84);
    expect(seasonModalInside({ x: -60 + dx, width: 345 }, W)).toBe(true);
  });

  it('не помещается с левым полем — прижимаем правым, но остаёмся в экране', () => {
    const rect = { x: 100, width: 360 };
    const dx = seasonModalShift(rect, W);
    const moved = { x: rect.x + dx, width: rect.width };
    expect(seasonModalInside(moved, W)).toBe(true);
    expect(moved.x + moved.width).toBeLessThanOrEqual(W - 24);
  });

  it('шире окна — сдвигать нечем (ширину режет maxWidth), сдвиг 0; мусорные числа не ломают', () => {
    expect(seasonModalShift({ x: 0, width: 500 }, W)).toBe(0);
    expect(seasonModalShift({ x: Number.NaN, width: 345 }, W)).toBe(0);
    expect(seasonModalShift({ x: 100, width: 345 }, 0)).toBe(0);
  });

  it('предельная ширина — окно минус два поля, не меньше нуля', () => {
    expect(seasonModalMaxWidth(393)).toBe(345);
    expect(seasonModalMaxWidth(393.9)).toBe(345);
    expect(seasonModalMaxWidth(30)).toBe(0);
  });
});

describe('карта эпизода: журнал, страховка входа, положение в экране (iOS)', () => {
  const card = read('components/learning-v2/season/SeasonExpandedCard.tsx');
  const course = read('components/learning-v2/season/SeasonCourse.tsx');
  const log = read('components/learning-v2/season/season_modal_log.ts');

  it('журнал [EPISODE-MODAL]: открытие, раскладка корня и карты, замер в окне, итог входа — через общий помощник, в консоль (системный журнал iOS)', () => {
    for (const part of ["'open'", "'root_layout'", "'card_layout'", "'enter_done'", 'measureInWindow', 'episodeModalLog(']) expect(card).toContain(part);
    expect(log).toContain("'[EPISODE-MODAL]'");
    expect(log).toContain("'[SEASON-LAYOUT]'");
    expect(log).not.toContain('DebugLogger'); // журнал приложения в релизе никто не читает; iOS пишет console.log в системный журнал («Консоль» на Mac)
    expect(card).toContain('platform: Platform.OS'); // iOS или Android — в первой же строке журнала с iPhone
    for (const part of ['screenW:', 'maxWidth:', 'margin:', 'clip:', 'enterTransform:']) expect(card).toContain(part); // факты для разбора причины (Ядро 25.10)
  });

  it('строки журнала без кириллицы в литералах (скан «русский текст в UI» считает их интерфейсом)', () => {
    const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const quoted = /(['"`])(?:(?!\1)[^\\\n]|\\.)*[А-Яа-яЁё](?:(?!\1)[^\\\n]|\\.)*\1/g;
    expect(strip(card).match(quoted) ?? []).toEqual([]);
    expect(strip(log).match(quoted) ?? []).toEqual([]);
  });

  it('вход обязан закончиться: ватчдог 600 мс принудительно ставит непрозрачность и масштаб в 1', () => {
    expect(card).toContain('ENTER_WATCHDOG_MS = 600');
    expect(card).toContain('enter.setValue(1)');
    expect(card).toContain("finish('watchdog', false)");
  });

  it('iOS: ширина окна — от окна (window − 48), а не от родителя; внешний слой без overflow:hidden, обрезка по радиусу — на внутреннем слое без анимации', () => {
    expect(card).toContain('width: seasonModalMaxWidth(win.width)');
    expect(card).toContain('left: SEASON_MODAL_MARGIN + shiftX');
    expect(card).not.toContain('right: SEASON_MODAL_MARGIN - shiftX');
    const outer = /^\s*card: \{[^\n]*\},$/m.exec(card)?.[0] ?? '';
    const clip = /^\s*cardClip: \{[^\n]*\},$/m.exec(card)?.[0] ?? '';
    expect(outer).not.toContain('overflow');
    expect(outer).not.toMatch(/\bright:/);
    expect(outer).toContain('boxShadow: SHADOW');
    expect(clip).toContain("overflow: 'hidden'");
    expect(clip).toContain('borderRadius: 32');
    // анимируется только внешний слой: масштаб/прозрачность на нём, clip внутри
    expect(card).toMatch(/<Animated\.View[\s\S]{0,160}?style=\{\[styles\.card,[^\]]*cardStyle\]\}>\s*<View style=\{styles\.cardClip\}>/);
    expect(card).toContain('seasonModalShift(');
  });

  it('у окна экзамена есть ✕ (эталон zoomX) и стеклянная «Закрыть», когда главной кнопки нет', () => {
    expect(card).toContain('testID="season-expanded-close"');
    expect(card).toContain("p.kind === 'exam' ?");
    expect(course).toContain("else secondary = { label: seasonCardText(lang, 'closeCard')");
  });

  it('аппаратный «Назад» (Android) при открытом окне закрывает окно и больше ничего; причина каждого закрытия — в журнале', () => {
    expect(course).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(course).toContain("reason: 'hardware_back'");
    expect(course).toMatch(/if \(expanded === null\) return undefined;[\s\S]{0,200}hardwareBackPress/);
    for (const reason of ["'backdrop_or_x'", "'exam_close_button'"]) expect(course).toContain(reason);
    expect(course).toContain("secondary = { label: learningV2ChapterExamCopy(lang, 'later'), onPress: close };"); // строка эталона «Позже» (season_exam_captions_etalon) не тронута
    expect(course).toContain("episodeModalLog('info', 'closed'");
  });

  it('тап по карте пишет условие «иногда»: время с остановки карусели, повторный тап, какая карта в центре', () => {
    for (const part of ["episodeModalLog('info', 'tap_on_card'", 'sinceSettleMs', 'sinceLastOpenMs', 'alreadyOpen', 'selected']) expect(course).toContain(part);
  });

  it('[SEASON-LAYOUT]: корень «Обучения» в окне (winX, diffW) и открытие окна эпизода (cardX, cardWidth, windowW)', () => {
    for (const part of ["at: 'season_root'", 'measureInWindow', 'diffW', 'offsetX', "verdict: bad ? 'ROOT_SHIFTED_OR_WIDER_THAN_WINDOW'", 'seasonLayoutLog(']) expect(course).toContain(part);
    for (const part of ["at: 'expanded_open'", 'cardX', 'cardWidth', 'windowW', 'rootWinX']) expect(card).toContain(part);
    expect(course).toContain('logMeta: { lesson: lessonOrdinal, session: card.sessionOrdinal }');
  });
});
