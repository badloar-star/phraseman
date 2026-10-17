#!/usr/bin/env node
// gen_learning_v2_icons.mjs — переводит иконки уроков/глав V2 и узоры плашек из макета в данные для react-native-svg.
//
// зачем (владелец 17.10, координатор: «переносим к сборке 18.10»): рисунки нарисованы вручную в макете
// docs/design/v2-app/learning-v2-icons.html (источник правды). Чтобы телефон не разбирал SVG-строки на лету,
// фигуры один раз превращаются в простые структуры {t, a} и кладутся в
// components/learning-v2/icons/learningV2IconData.generated.ts. Правишь рисунок — правь макет и перезапускай:
//   node scripts/gen_learning_v2_icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/design/v2-app/learning-v2-icons.html');
const OUT = path.join(root, 'components/learning-v2/icons/learningV2IconData.generated.ts');

const html = fs.readFileSync(SRC, 'utf8');
const grab = (name) => {
  const start = html.indexOf(`const ${name} = [`);
  if (start < 0) throw new Error(`[ICONS-GEN] в макете нет const ${name}`);
  let depth = 0;
  for (let i = html.indexOf('[', start); i < html.length; i += 1) {
    if (html[i] === '[') depth += 1;
    if (html[i] === ']') { depth -= 1; if (depth === 0) return html.slice(html.indexOf('[', start), i + 1); }
  }
  throw new Error(`[ICONS-GEN] не закрыт массив ${name}`);
};
// eslint-disable-next-line no-new-func
const LESSONS = new Function(`return ${grab('LESSONS')};`)();
// eslint-disable-next-line no-new-func
const PAT1 = new Function(`return ${grab('PAT1')};`)();

const ATTR = { d: 'd', x: 'x', y: 'y', width: 'width', height: 'height', rx: 'rx', cx: 'cx', cy: 'cy', r: 'r', ry: 'ry', transform: 'transform', 'stroke-width': 'strokeWidth' };
const NUM = new Set(['x', 'y', 'width', 'height', 'rx', 'cx', 'cy', 'r', 'ry', 'strokeWidth']);
function shapes(svg, where) {
  const out = [];
  const re = /<(path|rect|circle|ellipse)\s([^>]*?)\/>/g;
  let m;
  while ((m = re.exec(svg))) {
    const a = {};
    for (const [, k, v] of m[2].matchAll(/([a-z-]+)="([^"]*)"/g)) {
      const key = ATTR[k];
      if (!key) throw new Error(`[ICONS-GEN] ${where}: неизвестный атрибут ${k}`);
      a[key] = NUM.has(key) ? Number(v) : v;
    }
    out.push({ t: m[1], a });
  }
  const rest = svg.replace(re, '').trim();
  if (rest) throw new Error(`[ICONS-GEN] ${where}: не разобрано «${rest.slice(0, 60)}»`);
  if (out.length === 0) throw new Error(`[ICONS-GEN] ${where}: пустой рисунок`);
  return out;
}

const lessons = LESSONS.map((L) => ({
  n: L.n,
  icon: shapes(L.icon, `урок ${L.n}`),
  chapters: L.ch.map(([name, d], i) => ({ name, icon: shapes(d, `урок ${L.n} глава ${i + 1}`) })),
  byArc: !!L.byArc,
}));
const pat1 = PAT1.map((p, i) => ({ w: p.w, h: p.h, shapes: shapes(p.d, `узор урока 1, глава ${i + 1}`) }));

const banner = `// СГЕНЕРИРОВАНО scripts/gen_learning_v2_icons.mjs из docs/design/v2-app/learning-v2-icons.html — руками не править.
// зачем (владелец 17.10): у каждого урока и главы V2 своя рисованная иконка (холст 24, линия 1,8, currentColor), у плашки главы — свой узор.
`;
const body = `${banner}
export type LearningV2IconShape = Readonly<{ t: 'path' | 'rect' | 'circle' | 'ellipse'; a: Readonly<Record<string, string | number>> }>;
export type LearningV2IconLesson = Readonly<{ n: number; icon: readonly LearningV2IconShape[]; chapters: readonly Readonly<{ name: string; icon: readonly LearningV2IconShape[] }>[]; byArc: boolean }>;
export type LearningV2IconPattern = Readonly<{ w: number; h: number; shapes: readonly LearningV2IconShape[] }>;

export const LEARNING_V2_ICON_LESSONS: readonly LearningV2IconLesson[] = ${JSON.stringify(lessons)};

/** Узоры урока 1 нарисованы отдельно; у уроков 2–8 узор собирается из иконки главы (LearningV2ChapterPattern). */
export const LEARNING_V2_LESSON1_PATTERNS: readonly LearningV2IconPattern[] = ${JSON.stringify(pat1)};
`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body);
const iconCount = lessons.length + lessons.reduce((s, L) => s + L.chapters.length, 0);
console.log(`[ICONS-GEN] уроков ${lessons.length}, иконок ${iconCount}, узоров урока 1 ${pat1.length} → ${path.relative(root, OUT)} (${body.length} байт)`);
