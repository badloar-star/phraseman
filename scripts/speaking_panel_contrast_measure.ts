// Запуск: npx tsx scripts/speaking_panel_contrast_measure.ts > out.md
// зачем (координатор 25.10, после e8aa1c456 — честные подписи причин «не расслышал» вместо «скажи громче»): контраст подписей и состояний
// панели голосового ответа (SpeakingPanel) во всех 29 темах × светлая/тёмная × Спокойно/Акцент/Максимум. Тема панели собирается так же,
// как в приложении: makeLiquidGlassTheme(id, base, variant) → buildSpeakingPanelTheme (lesson1, learning_v2_direct_session_player_v1,
// flashcards_speaking_session). Скрипт сверяет поля с исходником и падает, если связка изменилась.
// Новые подписи причин длиннее, но стоят тем же цветом (textMuted) на той же карточке — длина на контраст не влияет.
// Пороги: текст 4,5, значки и звёзды 3,0.
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, makeLiquidGlassTheme } from '../constants/liquidGlassThemePalette';
import { flattenOver, legibleOn } from '../constants/liquidGlassSurfaceRoles';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';

const PANEL = fs.readFileSync(path.join(__dirname, '..', 'components/SpeakingPanel.tsx'), 'utf8');
for (const line of [
  'card: t.bgCard,', 'textPrimary: t.textPrimary,', 'textSecond: t.textSecond,', 'textMuted: t.textMuted,', 'accent: t.accent,',
  'correct: t.correct,', 'wrong: t.wrong,', 'onAccent: t.textOnGold,', 'accentText: t.accentText,',
  "const WARN_COLOR_FALLBACK = '#E6A23C';", "const INLINE_GOOD_COLOR = '#F2C94C';", "const INLINE_ALMOST_COLOR = '#F2994A';",
  'color: settled ? theme.correct : theme.textMuted,',
  "<Text style={[styles.hintLine, { color: mTheme.textSecond }]}>{hintLine}</Text>",
  "style={[styles.actionBtn, { backgroundColor: mTheme.correct }]}",
  "<Text style={[styles.actionBtnText, { color: mTheme.onAccent }]}>",
  'backgroundColor: listening ? mTheme.wrong : mTheme.accent,',
  "<Text style={[styles.retryText, { color: mTheme.accentText }]}>",
  "<Text style={[styles.perfectLine, { color: mTheme.correct }]}>",
]) if (!PANEL.includes(line)) throw new Error(`SpeakingPanel изменился: нет «${line}» — обнови модель панели`);

type T = ReturnType<typeof makeLiquidGlassTheme>;
// база Theme нужна только для полей, которых нет у токенов; панели они не нужны — пустой объект (тип из constants/theme тянет RN)
const theme = (id: string, level: string, appearance: string): T => makeLiquidGlassTheme(id as never, {} as never, { level, appearance } as never);
const bestInk = (fill: string, a: string, b: string): string => (paletteContrast(a.slice(0, 7), fill.slice(0, 7)) >= paletteContrast(b.slice(0, 7), fill.slice(0, 7)) ? a : b);
const card = (t: T): string => flattenOver(t.bgCard, flattenOver(t.bgPrimary, '#000000'));

type Role = { id: string; where: string; what: string; min: number; fn: (t: T) => [string[], string[]] };
const ROLES: Role[] = [
  { id: 'V1', where: 'Строка в уроке', what: 'Статус и подпись причины «не расслышал: …» (textMuted)', min: 4.5, fn: (t) => [[t.textMuted], [card(t)]] },
  { id: 'V2', where: 'Строка в уроке', what: 'Засчитано (correct)', min: 4.5, fn: (t) => [[t.correct], [card(t)]] },
  { id: 'V3', where: 'Строка в уроке', what: 'Значок и подпись записи (accentText)', min: 4.5, fn: (t) => [[t.accentText], [card(t)]] },
  { id: 'V4', where: 'Строка в уроке', what: 'Кнопка «Открыть настройки» (onAccent на accent)', min: 4.5, fn: (t) => [[t.textOnGold], [t.accent]] },
  { id: 'V5', where: 'Строка в уроке', what: 'Звёзды результата: отлично / хорошо #F2C94C / почти #F2994A / мимо', min: 3, fn: (t) => [[t.correct, '#F2C94C', '#F2994A', t.wrong], [card(t)]] },
  { id: 'P1', where: 'Карточка панели', what: 'Заголовок (textPrimary)', min: 4.5, fn: (t) => [[t.textPrimary], [card(t)]] },
  { id: 'P2', where: 'Карточка панели', what: 'Закрыть, «звук» слова (textMuted)', min: 4.5, fn: (t) => [[t.textMuted], [card(t)]] },
  { id: 'P3', where: 'Карточка панели', what: 'Слова фразы: чисто / мимо (correct / wrong)', min: 4.5, fn: (t) => [[t.correct, t.wrong], [card(t)]] },
  { id: 'P4', where: 'Карточка панели', what: 'Слово «нечётко» — янтарь #E6A23C (theme.warn у темы нет)', min: 4.5, fn: () => [['#E6A23C'], []] },
  { id: 'P5', where: 'Карточка панели', what: 'Подсказка «Не услышали слово…» (textSecond = cta)', min: 4.5, fn: (t) => [[t.textSecond], [card(t)]] },
  { id: 'P6', where: 'Карточка панели', what: '«Отлично!» (correct)', min: 4.5, fn: (t) => [[t.correct], [card(t)]] },
  { id: 'P7a', where: 'Карточка панели', what: 'Микрофон: значок onAccent на accent', min: 3, fn: (t) => [[t.textOnGold], [t.accent]] },
  { id: 'P7b', where: 'Карточка панели', what: 'Стоп во время записи: значок onAccent на заливке wrong', min: 3, fn: (t) => [[t.textOnGold], [t.wrong]] },
  { id: 'P8', where: 'Карточка панели', what: 'Кнопка «Готово» — onAccent на зелёной заливке correct', min: 4.5, fn: (t) => [[t.textOnGold], [t.correct]] },
  { id: 'P9', where: 'Карточка панели', what: 'Кнопки на accent («Дальше», «Пропустить»)', min: 4.5, fn: (t) => [[t.textOnGold], [t.accent]] },
  { id: 'P10', where: 'Карточка панели', what: '«Сказать ещё раз» (accentText)', min: 4.5, fn: (t) => [[t.accentText], [card(t)]] },
  // ── замены (только токены и уже существующие поля темы) ──
  { id: 'V5*', where: 'Строка в уроке', what: 'звёзды: тот же оттенок, доведённый legibleOn к textPrimary до 3,05 на карточке', min: 3, fn: (t) => [[t.correct, legibleOn('#F2C94C', t.textPrimary, [card(t)], 3.05), legibleOn('#F2994A', t.textPrimary, [card(t)], 3.05), t.wrong], [card(t)]] },
  { id: 'P4*', where: 'Карточка панели', what: '«нечётко»: янтарь, доведённый legibleOn к textPrimary до 4,55', min: 4.5, fn: (t) => [[legibleOn('#E6A23C', t.textPrimary, [card(t)], 4.55)], [card(t)]] },
  { id: 'P5*', where: 'Карточка панели', what: 'подсказка цветом textMuted (как статус), не textSecond', min: 4.5, fn: (t) => [[t.textMuted], [card(t)]] },
  { id: 'P7b*', where: 'Карточка панели', what: 'стоп: лучший из цвета карточки / белого на wrong (как inkOn; в тёмном карточка тёмная)', min: 3, fn: (t) => [[bestInk(t.wrong, t.bgCard, '#FFFFFF')], [t.wrong]] },
  { id: 'P8*', where: 'Карточка панели', what: '«Готово»: correctText (уже есть в теме: inkOn(correct, ctaInk, белый))', min: 4.5, fn: (t) => [[t.correctText], [t.correct]] },
  { id: 'P8**', where: 'Карточка панели', what: '«Готово» на accent (как остальные кнопки) — onAccent', min: 4.5, fn: (t) => [[t.textOnGold], [t.accent]] },
];
type Hit = { role: Role; theme: string; app: string; level: string; v: number };
const hits: Hit[] = [];
for (const app of ['light', 'dark'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
  const t = theme(id, level, app);
  for (const r of ROLES) {
    const [fgs, bgs0] = r.fn(t); const bgs = bgs0.length ? bgs0 : [card(t)];
    hits.push({ role: r, theme: id, app, level, v: Math.min(...fgs.flatMap((fg) => bgs.map((b) => contrastRatio(flattenOver(fg, b), b)))) });
  }
}
const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
const ap = (a: string): string => (a === 'light' ? 'светлая' : 'тёмная');
console.log('| № | Где | Элемент | Порог | Минимум | Где минимум | Нарушений |');
console.log('|---|---|---|---|---|---|---|');
for (const r of ROLES) {
  const hs = hits.filter((h) => h.role === r); const w = hs.reduce((a, b) => (b.v < a.v ? b : a)); const n = hs.filter((h) => h.v < r.min).length;
  console.log(`| ${r.id} | ${r.where} | ${r.what} | ${f2(r.min)} | ${f2(w.v)} | ${w.theme} · ${ap(w.app)} · ${w.level} | ${n ? `**${n} из ${hs.length}**` : `0 из ${hs.length}`} |`);
}
console.log('\nНАРУШЕНИЯ');
for (const r of ROLES) { const b = hits.filter((h) => h.role === r && h.v < r.min); if (b.length) console.log(`${r.id}: ${b.length} — ${b.slice(0, 20).map((h) => `${h.theme}/${ap(h.app)}/${h.level} ${f2(h.v)}`).join('; ')}`); }
console.log('\nВСЕГО', hits.length, 'пар, нарушений', hits.filter((h) => h.v < h.role.min).length);
