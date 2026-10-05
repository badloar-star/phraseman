/**
 * PM-168: редакторская проверка библиотеки опросов (admin/v2/legacy.html → SHARD_SURVEY_PRESETS).
 *
 * зачем (SOCIAL.md: «переписать натужный юмор и бессмысленные вопросы в нормальный
 * взрослый тон»): прежняя библиотека держалась на шутках в каждом вопросе
 * («— или лампочка работает вхолостую?») и пятом «смешном» варианте, который
 * ничего не измеряет. Сторож не даёт этому вернуться: каждый новый или
 * изменённый опрос проходит те же правила. Сработал — правь текст опроса,
 * а не правило. Живые документы shard_surveys (ротация owner-selected-63-v1)
 * этот сторож не трогает — только библиотеку редактора.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeEol } from './helpers/read_source';

type Option = { label: string; action?: { kind: string; route?: string } };
type Preset = { id: number; category: string; question: string; description: string; insight: string; options: Option[] };

const html = normalizeEol(fs.readFileSync(path.resolve(__dirname, '../admin/v2/legacy.html'), 'utf8'));
const match = html.match(/const SHARD_SURVEY_PRESETS =\s*(\[[\s\S]*?\n  \]);\s*\n  const SS_SURVEY_ACTION_ROUTES/);
if (!match) throw new Error('SHARD_SURVEY_PRESETS not found');
const presets = JSON.parse(match[1]) as Preset[];

/** Удалённое в 2.0: в опросах не упоминается (D02 XP, D03/D104 руны и жемчуг, D54/D83 Лига и Арена, PM-170 подарки, PM-171 «Идеи»). */
const RETIRED = /\bXP\b|очк\w* опыта|Арен|Лиг[аиу]|рун[аыуе]?\b|жемчу|сундук|подар|«Идеи»|уровень друга/iu;

/** Маркеры натужного юмора, найденные в прежней библиотеке, — образы вместо вопроса. */
const FORCED_HUMOR = /вхолостую|попуга|попкорн|\bкот\b|минотавр|дракон|хрустальн|шаман|профсоюз|таможн|адвокат|тёт[яи]|психолог|жертв|Центробанк|Библи|драматизм|тройной аксель|печенье|экскурсовод|созвезд|музейн|медленном огне|сольный альбом|лабиринт|злодея?|вселенн|главный герой|трейлер/iu;

/** Канцелярит и псевдо-деловые эвфемизмы. */
const BUREAUCRATIC = /инвестици|осуществл|в рамках|данн(ый|ого|ом) функционал|(?<!\p{L})является|посредством|произвести|в целях/iu;

describe('survey library editorial guard (PM-168)', () => {
  it('library is not empty and ids are unique', () => {
    expect(presets.length).toBeGreaterThan(0);
    expect(new Set(presets.map((p) => p.id)).size).toBe(presets.length);
  });

  it.each(presets.map((p) => [p.id, p] as const))('preset %i reads as a plain adult question', (_id, p) => {
    const texts = [p.question, p.description, ...p.options.map((o) => o.label)];
    for (const text of texts) {
      expect(text).not.toMatch(RETIRED);
      expect(text).not.toMatch(FORCED_HUMOR);
      expect(text).not.toMatch(BUREAUCRATIC);
      expect(text).not.toMatch(/!/);
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(text).toBe(text.trim());
    }
    // Вопрос — один вопрос, без шуточного «— или …?» во второй половине.
    expect(p.question.endsWith('?')).toBe(true);
    expect(p.question).not.toMatch(/ — или /u);
    expect(p.question.length).toBeLessThanOrEqual(80);
    expect(p.description.length).toBeGreaterThan(0);
    expect(p.description.length).toBeLessThanOrEqual(140);
    // Пустых вопросов нет: 3–5 различных осмысленных вариантов.
    expect(p.options.length).toBeGreaterThanOrEqual(3);
    expect(p.options.length).toBeLessThanOrEqual(5);
    const labels = p.options.map((o) => o.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const label of labels) {
      expect(label.length).toBeGreaterThan(0);
      expect(label.length).toBeLessThanOrEqual(60);
    }
  });

  it('every preset route is in the admin allowlist and points to a live screen', () => {
    const routesBlock = html.slice(html.indexOf('const SS_SURVEY_ACTION_ROUTES'), html.indexOf('function ssPrepareOptionActionForSave'));
    for (const p of presets) {
      for (const o of p.options) {
        if (o.action?.kind !== 'app_route' || !o.action.route) continue;
        const route = o.action.route;
        expect(routesBlock).toContain(`'${route}'`);
        const screen = route.split('?')[0].replace(/^\//, '');
        const file = screen === '(tabs)/home'
          ? path.resolve(__dirname, '../app/(tabs)/home.tsx')
          : path.resolve(__dirname, `../app/${screen}.tsx`);
        expect(fs.existsSync(file)).toBe(true);
      }
    }
    expect(routesBlock).not.toContain("'/ideas_catalog'");
  });
});
