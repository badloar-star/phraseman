// зачем (сбои ROBOT8/ROBOT9, 12.10; docs/work/tasks/robot-step-failures-2026-10-12.md): робот находил только видимые узлы — элементы ниже экрана давали step_target_not_found.
// Теперь поиск прокручивает вниз; `await` не листает; тап ждёт стабильных границ узла. Ссылки хаба Карточек не требуют тапа по анимированному хабу.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\r\n').join('\n');
const MODULE = path.join(ROOT, 'scripts', 'parity_steps.mjs').split(path.sep).join('/');

const SCRIPT = `
import * as m from 'file:///${MODULE}';
const swipes = [];
const taps = [];
let hidden = 2; // сколько прокруток нужно, пока элемент не появится на экране
const xml = () => '<hierarchy><node text="" resource-id="" content-desc="" bounds="[0,0][1080,2400]"/>'
  + (hidden <= 0 ? '<node text="" resource-id="manage-subscription-cancel" content-desc="" bounds="[100,1000][900,1100]"/>' : '')
  + '</hierarchy>';
const run = (args) => {
  if (args[0] === 'exec-out' && args[1] === 'cat') return xml();
  if (args[0] === 'shell' && args[1] === 'input' && args[2] === 'swipe') { swipes.push(args.slice(3).join(',')); hidden -= 1; }
  if (args[0] === 'shell' && args[1] === 'input' && args[2] === 'tap') taps.push(args.slice(3).join(','));
  return '';
};
const mode = process.argv[1];
try {
  await m.runSteps(run, m.parseSteps(mode === 'await' ? 'await:#manage-subscription-cancel' : 'tap:#manage-subscription-cancel'), { stepTimeoutMs: 1500, pollMs: 50, afterStepMs: 0 });
  console.log(JSON.stringify({ ok: true, swipes: swipes.length, taps }));
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: String(error.message), swipes: swipes.length, taps }));
}
`;

function runScript(mode: string): { ok: boolean; error?: string; swipes: number; taps: string[] } {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', SCRIPT, mode], { encoding: 'utf8' });
  const line = result.stdout.trim().split('\n').pop() ?? '';
  return JSON.parse(line);
}

describe('робот съёмки: поиск прокруткой и стабильные границы', () => {
  it('элемент вне экрана: робот листает вниз и нажимает, а не падает step_target_not_found', () => {
    const outcome = runScript('tap');
    expect(outcome.ok).toBe(true);
    expect(outcome.swipes).toBeGreaterThanOrEqual(2);
    expect(outcome.taps).toHaveLength(1);
  }, 30_000);

  it('шаг await не листает экран (тосты у нижней кромки)', () => {
    const outcome = runScript('await');
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain('step_target_not_found');
    expect(outcome.swipes).toBe(0);
  }, 30_000);

  it('ссылки хаба Карточек открывают окно режимов и настройку без тапа по анимированному хабу', () => {
    const steps = read('scripts/dev_links_r1_steps.py');
    expect(steps).toContain("HUB_TRAIN = '/flashcards?train=1'");
    expect(steps).not.toContain("TRAIN = 'tap:#fc-cards-hub-train'");
    expect(steps).not.toMatch(/\[TRAIN[,\]]/);
    expect(steps).toContain("add(['cards-002', 'cards-section-032', 'cards-v2-027'], [], HUB_FREE, HUB_TRAIN,");
    expect(steps).toContain("SETUP + 'truefalse'");
    const cards2 = read('scripts/dev_links_r1_steps_cards2.py');
    expect(cards2).toContain("'tap:#fc-speak-mic', 'wait:900', 'tap:#fc-speak-mic'");
    expect(cards2).not.toContain('long:Зажми и говори');
    expect(cards2).toContain("'cards-gap-024', [MENU, 'tap:Фразы'");
    expect(cards2).toContain("'cards-064', ['tap:#fc-editor-en', 'type:Test', 'back',");
  });
});
