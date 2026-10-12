import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { liquidGlassLevelForIntensity } from '../constants/liquidGlassThemeIntensity';
import { colorContrast } from '../constants/color_contrast';

// зачем (координатор 12.10, ночная проверка двух тем): новые экраны — меню языка наборов (PackLanguagePicker), кнопка языка на настройке тренировки
// (TrainingSetupV2) и поле промокода/кода друга (promo_code_entry, referral_code_sheet) красятся ТОЛЬКО токенами темы. Здесь — читаемость текста
// (≥ 4,5:1) на каждой поверхности, где он лежит, для всех тем × тёмное/светлое × 5 оттенков ползунка. Полупрозрачные заливки (selected, hairlineSoft)
// сводятся с нижним слоем перед расчётом. Пустое состояние «Из видео» (KitEmpty) берёт ТОЛЬКО эти же токены — отдельных токенов не требуется.
const APPEARANCES = ['dark', 'light'] as const;
const INTENSITIES = [0, 0.25, 0.5, 0.75, 1];
const MIN = 4.5;

function parse(c: string): [number, number, number, number] {
  const m = c.trim().match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), m[2] ? parseInt(m[2], 16) / 255 : 1];
  const r = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (r) return [Number(r[1]), Number(r[2]), Number(r[3]), r[4] === undefined ? 1 : Number(r[4])];
  throw new Error(`цвет не разобран: ${c}`);
}
const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
/** Свести (возможно полупрозрачный) верхний слой с непрозрачным нижним. */
function over(top: string, bottom: string): string {
  const [tr, tg, tb, ta] = parse(top);
  const [br, bg, bb] = parse(bottom);
  return `#${hex2(tr * ta + br * (1 - ta))}${hex2(tg * ta + bg * (1 - ta))}${hex2(tb * ta + bb * (1 - ta))}`;
}

describe('новые экраны: текст читается в обеих темах и на всех оттенках', () => {
  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const appearance of APPEARANCES) {
      for (const intensity of INTENSITIES) {
        it(`${id}/${appearance}/${intensity}`, () => {
          const g = liquidGlassTokens(id, { appearance, intensity, level: liquidGlassLevelForIntensity(intensity) });
          const worst = (fg: string, bgs: string[]) => Math.min(...bgs.map((b) => colorContrast(fg, b)));
          const checks: Array<[string, number]> = [
            // меню языка: строка, выбранная строка, нажатая строка (selected поверх шторки), счётчик наборов
            ['option text/sheet', colorContrast(g.text, g.opaqueSheet)],
            ['option text/selected row', colorContrast(g.text, g.opaqueControl)],
            ['option text/pressed row', colorContrast(g.text, over(g.selected, g.opaqueSheet))],
            ['option count/sheet', colorContrast(g.secondary, g.opaqueSheet)],
            ['option count/selected row', colorContrast(g.secondary, g.opaqueControl)],
            // кнопка-пилюля языка: обычная (opaqueControl), открытая (selected), пилюля с hairlineSoft — над фоном экрана и карточкой
            ['pill text/control', colorContrast(g.text, g.opaqueControl)],
            ['pill text/open', worst(g.text, [over(g.selected, g.bg), over(g.selected, g.opaqueCard)])],
            ['pill text/hairline', worst(g.text, [over(g.hairlineSoft, g.bg), over(g.hairlineSoft, g.opaqueCard)])],
            // поле промокода: готовая кнопка (ctaInk на cta), неактивная (mutedText на selected над шторкой/карточкой/фоном), текст ответа (text на карточке)
            ['promo ready button', colorContrast(g.ctaInk, g.cta)],
            ['promo idle button', worst(g.mutedText, [over(g.selected, g.opaqueSheet), over(g.selected, g.opaqueCard), over(g.selected, g.bg)])],
            ['promo feedback text', worst(g.text, [g.opaqueCard, g.opaqueSheet, g.bg])],
            // пустое состояние «Пока пусто» в «Из видео» (KitEmpty, экран Дизайна): значок text на плитке opaqueControl, заголовок text и подпись secondary на фоне экрана
            // Диалоги (Сверка chain7 12.10): плашка «Свободный разговор» — значок accentText на accentSoft над карточкой, заголовок text на карточке, метка PLUS accentInk на accent; «Начать диалог» — accentInk на accent
            ['dialogs plate icon', worst(g.accentText, [over(g.accentSoft, g.opaqueCard), over(g.accentSoft, g.bg)])],
            ['dialogs plate title', colorContrast(g.text, g.opaqueCard)],
            // тинта плашки (Дизайн 366ae9846): градиент accent·0x1F поверх карточки — заголовок, значок и подпись читаются и на тонированной поверхности
            ['dialogs plate title/tint', colorContrast(g.text, over(`${g.accent.slice(0, 7)}1F`, g.opaqueCard))],
            ['dialogs plate muted/tint', colorContrast(g.secondary, over(`${g.accent.slice(0, 7)}1F`, g.opaqueCard))],
            ['dialogs plate icon/tint', colorContrast(g.accentText, over(g.accentSoft, over(`${g.accent.slice(0, 7)}1F`, g.opaqueCard)))],
            ['dialogs plus chip', colorContrast(g.accentInk, g.accent)],
            ['dialogs start button', colorContrast(g.accentInk, g.accent)],
            ['video-empty icon/tile', colorContrast(g.text, g.opaqueControl)],
            ['video-empty title/bg', worst(g.text, [g.bg, g.bgTop, g.bgBottom])],
            ['video-empty detail/bg', worst(g.secondary, [g.bg, g.bgTop, g.bgBottom])],
            // капсула энергии в стеклянной шапке (Дизайн 7b252fa06): цифра lg.text и значок (accentText на «Акценте/Максимуме», иначе text; низкий заряд — bad) на заливке opaqueControl
            ['energy capsule number', colorContrast(g.text, g.opaqueControl)],
            ['energy capsule icon', colorContrast(g.level === 'accent' || g.level === 'max' ? g.accentText : g.text, g.opaqueControl)],
            ['energy capsule low icon', colorContrast(g.bad, g.opaqueControl)],
            // карточка языкового гейта в Диалогах (DialogueV2HubLanguageGate): заголовок, текст и значок на плашке plateFillFrom, значок-плитка opaqueControl, кнопка «К урокам →»
            ['gate title/plate', worst(g.text, [over(g.plateFillFrom, g.bg), over(g.plateFillFrom, g.bgTop), over(g.plateFillFrom, g.bgBottom)])],
            ['gate text/plate', worst(g.secondary, [over(g.plateFillFrom, g.bg), over(g.plateFillFrom, g.bgTop), over(g.plateFillFrom, g.bgBottom)])],
            ['gate icon/tile', colorContrast(g.secondary, g.opaqueControl)],
            ['gate cta', g.level === 'accent' || g.level === 'max' ? colorContrast(g.accentInk, g.accent) : colorContrast(g.text, g.opaqueControl)],
          ];
          const bad = checks.filter(([, ratio]) => ratio < MIN).map(([name, ratio]) => `${name} ${ratio.toFixed(2)}`);
          expect(bad).toEqual([]);
        });
      }
    }
  }
});
