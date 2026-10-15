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
    // зачем (координатор 15.10: «робот ходит как человек»): c69063689 — перед шагом робот тапает (540,160), сбрасывая фокус
    // клавиатуры; нажатие на сам найденный элемент по-прежнему ровно одно
    expect(outcome.taps.filter((t) => t !== '540,160')).toEqual(['500,1050']);
  }, 30_000);

  it('шаг await не листает экран (тосты у нижней кромки)', () => {
    const outcome = runScript('await');
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain('step_target_not_found');
    expect(outcome.swipes).toBe(0);
  }, 30_000);

  // зачем (координатор 15.10, решение): робот ходит как человек — окно режимов открывает видимым тапом «Тренироваться» на хабе
  // (767b8c07f; хаб уже без анимаций — HUB_FREE с animations=off). Скрытое авто-открытие ?train=1 для этих кадров не возвращаем.
  it('ссылки хаба Карточек открывают окно режимов видимым тапом «Тренироваться», как человек', () => {
    const steps = read('scripts/dev_links_r1_steps.py');
    expect(steps).toContain("add(['cards-002', 'cards-section-032', 'cards-v2-027'], ['wait:2500', 'tap:#fc-cards-hub-train', 'wait:800'], HUB_FREE + '&quota=reset', '/flashcards',");
    expect(steps).not.toMatch(/add\(\['cards-002', 'cards-section-032', 'cards-v2-027'\], \[\], HUB_FREE, HUB_TRAIN,/);
    expect(steps).toContain("SETUP + 'truefalse'");
    const cards2 = read('scripts/dev_links_r1_steps_cards2.py');
    // Сверка 12.10: у круглого микрофона с вечной анимацией кольца uiautomator не отдаёт id — робот жмёт по центру кнопки, всё так же
    // видимым нажатием «начать → стоп», а не скрытым путём
    expect(cards2).toContain("add('cards-section-046', ['wait:3000', 'xy:540,1324', 'wait:900', 'xy:540,1324',");
    expect(cards2).not.toContain('long:Зажми и говори');
    expect(cards2).toContain("'cards-gap-024', [MENU, 'tap:Фразы'");
    // 1181c0ed7: 'back' → 'hidekb' (убрать клавиатуру, только если показана — 'back' мог увести с экрана); ввод и сохранение — те же
    expect(cards2).toContain("'cards-064', ['tap:#fc-editor-en', 'type:Test', 'hidekb',");
  });
});
