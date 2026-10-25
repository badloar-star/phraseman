// Запуск: npx tsx scripts/account_delete_b_contrast_measure.ts > out.md
// зачем (координатор 25.10): окно удаления аккаунта, вариант Б (https://claude.ai/artifact/HqA1kLDYV1bAR3apVamLJj) во всех 29 темах ×
// светлая/тёмная × Спокойно/Акцент/Максимум. Три окна: «Удалить аккаунт?» (красная кнопка «Удалить через 14 дней», «Отмена», тихая
// красная ссылка «Удалить навсегда сейчас»), «Удалить навсегда?» (ввод «УДАЛИТЬ», кнопка до и после ввода, «Назад») и «Восстановить
// аккаунт?» (плашка с цифрами, «Восстановить», «Не восстанавливать»). Только токены темы. Окно — opaqueSheet, как в
// DeleteAccountConfirmModal; кнопка — настоящий deleteButtonPaint. Пороги: текст 4,5; заливка кнопки к окну 3,0.
// Неактивная кнопка по WCAG от порога освобождена — для неё порог 3,0 как «читается, но видно, что выключена».
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { semanticInk } from '../constants/liquidGlassSemanticInk';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { deleteButtonPaint } from '../components/account/delete_button_paint';

type G = ReturnType<typeof liquidGlassTokens>;
const MODAL = fs.readFileSync(path.join(__dirname, '..', 'components/DeleteAccountConfirmModal.tsx'), 'utf8');
for (const line of ['backgroundColor: glass.opaqueSheet', 'backgroundColor: glass.opaqueControl,', 'backgroundColor: glass.buttonFill,']) {
  if (!MODAL.includes(line)) throw new Error(`окно удаления изменилось: нет «${line}» в DeleteAccountConfirmModal.tsx — обнови поверхности в этом скрипте`);
}
// зачем (перемер 25.10 на коде: 74649503b, DeleteAccountVariantBBody): роли берём из вёрстки окна, а не из макета — сторож строк кода
const BODY = fs.readFileSync(path.join(__dirname, '..', 'components/account/DeleteAccountVariantBBody.tsx'), 'utf8');
for (const line of [
  "style={[styles.title, { color: glass.text, fontSize: f.h2 }]}",
  'color={glass.secondary} strongColor={glass.text} size={f.body} />',
  'fill={props.gracePaint.fill} ink={props.gracePaint.ink}',
  'fill={glass.buttonFill} ink={glass.text}',
  "<Text style={[styles.linkLabel, { color: props.linkColor }]}>{copy.w1DeleteNowLink}</Text>",
  "<Text style={[styles.inputLabel, { color: glass.secondary, fontSize: f.caption }]}>{props.confirmLabel}</Text>",
  'backgroundColor: glass.opaqueControl, color: glass.text,',
  'placeholderTextColor={glass.mutedText}',
  'fill={props.nowPaint.fill} ink={props.nowPaint.ink}',
]) if (!BODY.includes(line)) throw new Error(`DeleteAccountVariantBBody изменился: нет «${line}» — обнови модель`);
for (const line of ['gracePaint={deleteButtonPaint(glass, true)}', 'linkColor={semanticInk(glass).badText}', 'nowPaint={deletePaint}']) {
  if (!MODAL.includes(line)) throw new Error(`DeleteAccountConfirmModal: нет «${line}» — обнови модель`);
}
const screen = (g: G): string => flattenOver(g.bg, '#000000');
const dialog = (g: G): string => flattenOver(g.opaqueSheet, screen(g));
const control = (g: G): string => flattenOver(g.opaqueControl, dialog(g)); // поле ввода и плашка цифр восстановления
const cancel = (g: G): string => flattenOver(g.buttonFill, dialog(g));

type Role = { id: string; area: string; what: string; pair: string; min: number; fn: (g: G) => [string, string[]] };
const ROLES: Role[] = [
  // ── общее ──
  { id: 'D1', area: 'Все три окна', what: 'Заголовок и выделенное «через 14 дней» / «сразу»', pair: '`text` на окне', min: 4.5, fn: (g) => [g.text, [dialog(g)]] },
  { id: 'D2', area: 'Все три окна', what: 'Абзац, «Подписка … сама не отменится»', pair: '`secondary` на окне', min: 4.5, fn: (g) => [g.secondary, [dialog(g)]] },
  { id: 'D3', area: 'Все три окна', what: '«Отмена», «Назад», «Не восстанавливать»', pair: '`text` на buttonFill', min: 4.5, fn: (g) => [g.text, [cancel(g)]] },
  // ── «Удалить аккаунт?» ──
  { id: 'R1', area: 'Удалить аккаунт?', what: 'Красная кнопка «Удалить через 14 дней»: подпись', pair: 'deleteButtonPaint(armed).ink на fill', min: 4.5, fn: (g) => { const p = deleteButtonPaint(g, true); return [p.ink, [p.fill]]; } },
  { id: 'R2', area: 'Удалить аккаунт?', what: 'Красная кнопка видна на окне', pair: 'deleteButtonPaint(armed).fill на окне', min: 3, fn: (g) => [deleteButtonPaint(g, true).fill, [dialog(g)]] },
  { id: 'Q1', area: 'Удалить аккаунт?', what: 'Тихая ссылка «Удалить навсегда сейчас» сырым `bad`', pair: '`bad` на окне', min: 4.5, fn: (g) => [g.bad, [dialog(g)]] },
  { id: 'Q1*', area: 'Удалить аккаунт?', what: 'то же через semanticInk (замена)', pair: '`semanticInk.badText` на окне', min: 4.5, fn: (g) => [semanticInk(g).badText, [dialog(g)]] },
  // ── «Удалить навсегда?» ──
  { id: 'P1', area: 'Удалить навсегда?', what: '«Введи «УДАЛИТЬ» для подтверждения:»', pair: '`secondary` на окне', min: 4.5, fn: (g) => [g.secondary, [dialog(g)]] },
  { id: 'P2', area: 'Удалить навсегда?', what: 'Введённое слово в поле', pair: '`text` на opaqueControl', min: 4.5, fn: (g) => [g.text, [control(g)]] },
  { id: 'P3', area: 'Удалить навсегда?', what: 'Подсказка в пустом поле', pair: '`mutedText` на opaqueControl', min: 4.5, fn: (g) => [g.mutedText, [control(g)]] },
  { id: 'P4', area: 'Удалить навсегда?', what: 'Кнопка до ввода: подпись (неактивна)', pair: 'deleteButtonPaint(false).ink на fill', min: 3, fn: (g) => { const p = deleteButtonPaint(g, false); return [p.ink, [p.fill]]; } },
  { id: 'P5', area: 'Удалить навсегда?', what: 'Кнопка после ввода «УДАЛИТЬ»: подпись', pair: 'deleteButtonPaint(armed).ink на fill', min: 4.5, fn: (g) => { const p = deleteButtonPaint(g, true); return [p.ink, [p.fill]]; } },
  // ── «Восстановить аккаунт?» ──
  { id: 'V1', area: 'Восстановить', what: 'Цифры на плашке («12 дней», «140», «3 из 32»)', pair: '`text` на opaqueControl', min: 4.5, fn: (g) => [g.text, [control(g)]] },
  { id: 'V2', area: 'Восстановить', what: 'Подписи цифр («серия», «фраз», «урок»)', pair: '`secondary` на opaqueControl', min: 4.5, fn: (g) => [g.secondary, [control(g)]] },
  { id: 'V3', area: 'Восстановить', what: 'Кнопка «Восстановить»', pair: '`ctaFillInk` на ctaFill', min: 4.5, fn: (g) => [g.ctaFillInk, [g.ctaFill]] },
  { id: 'V4', area: 'Восстановить', what: 'Кнопка «Восстановить» видна на окне', pair: '`ctaFill` на окне', min: 3, fn: (g) => [g.ctaFill, [dialog(g)]] },
];
type Hit = { role: Role; theme: string; app: string; level: string; v: number };
const hits: Hit[] = [];
// отдельно: неактивная кнопка должна отличаться от готовой — иначе человек не поймёт, что ввод принят
const sameLook: string[] = [];
for (const app of ['light', 'dark'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
  const g = liquidGlassTokens(id, { level, appearance: app } as never);
  for (const r of ROLES) { const [fg, bgs] = r.fn(g); hits.push({ role: r, theme: id, app, level, v: Math.min(...bgs.map((b) => contrastRatio(flattenOver(fg, b), b))) }); }
  const off = flattenOver(deleteButtonPaint(g, false).fill, dialog(g)); const on = flattenOver(deleteButtonPaint(g, true).fill, dialog(g));
  const k = contrastRatio(on, off); if (k < 1.5) sameLook.push(`${id}/${app}/${level} ${k.toFixed(2)}`);
}
const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
const ap = (a: string): string => (a === 'light' ? 'светлая' : 'тёмная');
console.log('| № | Окно | Элемент | Пара | Порог | Минимум | Где минимум | Нарушений |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of ROLES) {
  const hs = hits.filter((h) => h.role === r); const w = hs.reduce((a, b) => (b.v < a.v ? b : a)); const n = hs.filter((h) => h.v < r.min).length;
  console.log(`| ${r.id} | ${r.area} | ${r.what} | ${r.pair} | ${f2(r.min)} | ${f2(w.v)} | ${w.theme} · ${ap(w.app)} · ${w.level} | ${n ? `**${n} из ${hs.length}**` : `0 из ${hs.length}`} |`);
}
console.log('\nНАРУШЕНИЯ');
for (const r of ROLES) { const b = hits.filter((h) => h.role === r && h.v < r.min); if (b.length) console.log(`${r.id}: ${b.length} — ${b.slice(0, 24).map((h) => `${h.theme}/${ap(h.app)}/${h.level} ${f2(h.v)}`).join('; ')}`); }
console.log(`\nНЕАКТИВНАЯ ≈ ГОТОВАЯ (тон заливок < 1,5): ${sameLook.length}${sameLook.length ? ' — ' + sameLook.slice(0, 20).join('; ') : ''}`);
console.log('\nВСЕГО', hits.length, 'пар, нарушений', hits.filter((h) => h.v < h.role.min).length);
