// Запуск: npx tsx scripts/theme_contrast_measure.ts > out.md
// зачем (координатор 25.10): карта цветов экзамена главы v2 и «Мастерской фраз» на токенах тем + контраст во ВСЕХ темах.
// Каждая роль = пара «передний план / фон» из liquidGlassTokens; полупрозрачные фоны сводятся на подложку (flattenOver).
// Порог: текст 4,5; графика (иконка, полоса, точки) 3,0. Печатает markdown-таблицы для docs/work.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';

type T = Record<string, unknown> & { [k: string]: never | string | unknown };
type Role = { id: string; screen: string; what: string; fg: string; bg: string; on?: string; min: 4.5 | 3; kind: 'текст' | 'графика' };
// fg/bg — имена токенов; on — подложка, на которую сводится полупрозрачный bg (по умолчанию bg экрана)
const ROLES: Role[] = [
  { id: 'E1', screen: 'Экзамен', what: 'Счётчик «Экзамен · 3 / 10»', fg: 'secondary', bg: 'bg', min: 4.5, kind: 'текст' },
  { id: 'E2', screen: 'Экзамен', what: 'Полоса прогресса: заливка на дорожке', fg: 'accentGraphic', bg: 'opaqueControl', min: 3, kind: 'графика' },
  { id: 'E3', screen: 'Экзамен', what: 'Полоса прогресса: заливка на фоне экрана', fg: 'accentGraphic', bg: 'bg', min: 3, kind: 'графика' },
  { id: 'E4', screen: 'Экзамен', what: 'Значок задания на плитке', fg: 'accentText', bg: 'accentTile', on: 'bg', min: 3, kind: 'графика' },
  { id: 'E5', screen: 'Экзамен', what: 'Текст ситуации на плашке', fg: 'secondary', bg: 'accentSoft', on: 'bg', min: 4.5, kind: 'текст' },
  { id: 'E6', screen: 'Экзамен', what: 'Реплика собеседника на карточке', fg: 'text', bg: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'E7', screen: 'Экзамен', what: 'Поле ввода: набранный текст', fg: 'text', bg: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'E8', screen: 'Экзамен', what: 'Поле ввода: подсказка-заглушка', fg: 'mutedText', bg: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'E9', screen: 'Экзамен', what: 'Поле ввода: курсор и рамка фокуса', fg: 'accentGraphic', bg: 'opaqueCard', min: 3, kind: 'графика' },
  { id: 'E10', screen: 'Экзамен', what: 'Поле после проверки: верный ответ', fg: 'good', bg: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'E11', screen: 'Экзамен', what: 'Поле после проверки: неверный ответ', fg: 'bad', bg: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'E12', screen: 'Экзамен', what: 'Плашка «Верно.»: значок ✓', fg: 'good', bg: 'goodSoft', on: 'bg', min: 3, kind: 'графика' },
  { id: 'E13', screen: 'Экзамен', what: 'Плашка «Верно.»: весь текст (слово «Верно» жирным)', fg: 'text', bg: 'goodSoft', on: 'bg', min: 4.5, kind: 'текст' },
  { id: 'E14', screen: 'Экзамен', what: 'Плашка «Неверно.»: значок ✕', fg: 'bad', bg: 'badSoft', on: 'bg', min: 3, kind: 'графика' },
  { id: 'E15', screen: 'Экзамен', what: 'Плашка «Неверно.»: весь текст (слово «Неверно» жирным)', fg: 'text', bg: 'badSoft', on: 'bg', min: 4.5, kind: 'текст' },
  { id: 'E16', screen: 'Экзамен', what: '«Исправь ошибку»: подсветка ошибки', fg: 'text', bg: 'badSoft', on: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'E17', screen: 'Экзамен', what: 'Кнопка «Проверить / Дальше»', fg: 'ctaFillInk', bg: 'ctaFill', min: 4.5, kind: 'текст' },
  { id: 'E18', screen: 'Экзамен', what: 'Кнопка неактивна (пустое поле)', fg: 'buttonInkDisabled', bg: 'buttonFillDisabled', min: 4.5, kind: 'текст' },
  { id: 'E19', screen: 'Экзамен', what: 'Нижняя панель: кнопка на панели', fg: 'ctaFill', bg: 'opaqueSheet', min: 3, kind: 'графика' },
  { id: 'E20', screen: 'Итог', what: 'Счёт «7 из 10», заголовок', fg: 'text', bg: 'bg', min: 4.5, kind: 'текст' },
  { id: 'E21', screen: 'Итог', what: 'Точки ответов: верная на неверной', fg: 'accentGraphic', bg: 'opaqueControl', min: 3, kind: 'графика' },
  { id: 'E22', screen: 'Итог', what: 'Кубок на мягкой плитке', fg: 'accentText', bg: 'accentSoft', on: 'bg', min: 3, kind: 'графика' },
  { id: 'E23', screen: 'Итог', what: 'Награда «+40» на плашке', fg: 'text', bg: 'opaqueControl', min: 4.5, kind: 'текст' },
  { id: 'E24', screen: 'Итог', what: '«Где споткнулся»: заголовок раздела', fg: 'secondary', bg: 'bg', min: 4.5, kind: 'текст' },
  { id: 'E25', screen: 'Итог', what: 'Слабая тема: название', fg: 'text', bg: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'E26', screen: 'Итог', what: 'Слабая тема: «Эпизоды 9 и 16»', fg: 'secondary', bg: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'E27', screen: 'Итог', what: 'Слабая тема: «2 ошибки»', fg: 'bad', bg: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'E28', screen: 'Итог', what: 'Эпизод повторён: галочка', fg: 'good', bg: 'opaqueCard', min: 3, kind: 'графика' },
  { id: 'E29', screen: 'Итог', what: 'Кнопка с часами «Пересдать через 59 мин»', fg: 'secondary', bg: 'opaqueControl', min: 4.5, kind: 'текст' },
  { id: 'E30', screen: 'Итог', what: 'Вторая кнопка «К итогу»', fg: 'text', bg: 'opaqueControl', min: 4.5, kind: 'текст' },
  { id: 'E31', screen: 'Итог', what: 'Ссылка «Разбор ошибок · 3»', fg: 'accentText', bg: 'bg', min: 4.5, kind: 'текст' },
  // зачем (перемер 25.10 после 759b1b0b6, шкала D145: мелкие подписи экзамена стали 13): мелкий текст держит только 4,5 — проверяем каждую 13-ю
  { id: 'E40', screen: 'Экзамен', what: 'Подсказка микрофона в поле ответа (13, link)', fg: 'accentText', bg: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'E41', screen: 'Экзамен', what: '«или напиши» под микрофоном (13, link)', fg: 'accentText', bg: 'bg', min: 4.5, kind: 'текст' },
  { id: 'E42', screen: 'Итог', what: 'Слабая тема: «2 ошибки» (13, topicErrors)', fg: 'bad', bg: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'E32', screen: 'Итог', what: 'Глава открыта: значок на градиенте', fg: 'accentInk', bg: 'accent', min: 3, kind: 'графика' },
  { id: 'W1', screen: 'Мастерская', what: 'Вход у пройденного урока (Plus)', fg: 'accentText', bg: 'accentSoft', on: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'W2', screen: 'Мастерская', what: 'Вход без Plus: подпись', fg: 'accentText', bg: 'accentSoft', on: 'opaqueCard', min: 4.5, kind: 'текст' },
  { id: 'W3', screen: 'Мастерская', what: 'Вход без Plus: замок', fg: 'accentText', bg: 'accentSoft', on: 'opaqueCard', min: 3, kind: 'графика' },
  { id: 'W4', screen: 'Мастерская', what: 'Фраз мало: приглушённая подпись', fg: 'secondary', bg: 'opaqueControl', min: 4.5, kind: 'текст' },
  { id: 'W5', screen: 'Мастерская', what: 'Фраз мало: часы', fg: 'iconMuted', bg: 'opaqueControl', min: 3, kind: 'графика' },
  { id: 'W6', screen: 'Мастерская', what: 'Название режима в шапке', fg: 'text', bg: 'bg', min: 4.5, kind: 'текст' },
];
const LEVELS = ['calm', 'accent', 'max'] as const;
const APPS = ['light', 'dark'] as const;
const str = (t: T, k: string): string => { const v = t[k]; if (typeof v !== 'string') throw new Error(`нет токена ${k}`); return v; };
type Hit = { role: Role; theme: string; app: string; level: string; ratio: number; fg: string; bg: string };
const all: Hit[] = [];
for (const app of APPS) for (const level of LEVELS) for (const id of LIQUID_GLASS_THEME_IDS) {
  const t = liquidGlassTokens(id, { level, appearance: app } as never) as unknown as T;
  const screen = flattenOver(str(t, 'bg'), '#000000');
  for (const r of ROLES) {
    const base = r.on ? flattenOver(str(t, r.on), screen) : screen;
    const bg = flattenOver(str(t, r.bg), base);
    const fg = flattenOver(str(t, r.fg), bg);
    all.push({ role: r, theme: id, app, level, ratio: contrastRatio(fg, bg), fg, bg });
  }
}
const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
console.log('| № | Экран | Роль | Цвет (токен) | Фон (токен) | Порог | Минимум | Где минимум | Нарушений |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of ROLES) {
  const hits = all.filter((h) => h.role === r);
  const worst = hits.reduce((a, b) => (b.ratio < a.ratio ? b : a));
  const fails = hits.filter((h) => h.ratio < r.min).length;
  console.log(`| ${r.id} | ${r.screen} | ${r.what} | \`${r.fg}\` | \`${r.bg}\`${r.on ? ` на \`${r.on}\`` : ''} | ${f2(r.min)} | ${f2(worst.ratio)} | ${worst.theme} · ${worst.app === 'light' ? 'светлая' : 'тёмная'} · ${worst.level} | ${fails ? `**${fails} из ${hits.length}**` : `0 из ${hits.length}`} |`);
}
console.log('\nНАРУШЕНИЯ');
const fails = all.filter((h) => h.ratio < h.role.min);
const byRole = new Map<string, Hit[]>();
for (const h of fails) byRole.set(h.role.id, [...(byRole.get(h.role.id) ?? []), h]);
for (const [id, hs] of byRole) console.log(`${id}: ${hs.length} — ${hs.slice(0, 40).map((h) => `${h.theme}/${h.app}/${h.level} ${f2(h.ratio)}`).join('; ')}`);
console.log('\nПО ТЕМАМ (уровень max)');
console.log('| Тема | Светлая: худшая роль | Тёмная: худшая роль |');
console.log('|---|---|---|');
for (const id of LIQUID_GLASS_THEME_IDS) {
  const cell = (app: string): string => { const hs = all.filter((h) => h.theme === id && h.app === app && h.level === 'max'); const w = hs.reduce((a, b) => (b.ratio / b.role.min < a.ratio / a.role.min ? b : a)); const n = hs.filter((h) => h.ratio < h.role.min).length; return `${w.role.id} ${f2(w.ratio)}${n ? ` · нарушений ${n}` : ''}`; };
  console.log(`| ${id} | ${cell('light')} | ${cell('dark')} |`);
}
console.log('\nВСЕГО', all.length, 'пар, нарушений', fails.length);
