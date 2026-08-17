// Инструменты учителя (app/max_call_tutor_tools) — чистый модуль под jest.
// зачем: владелец 2026-08-16 — учитель ведёт урок, предлагает сцены, задаёт
// домашку и сам заканчивает звонок; клиент исполняет это локально.

import {
  TUTOR_SCENE_CATALOG_LIMIT,
  buildTutorSceneCatalog,
  createTutorToolRunner,
  renderTutorSceneCatalog,
} from '../app/max_call_tutor_tools';
import type { DialogScenario } from '../app/ai_dialog_scenarios';

function scenario(id: string, cefr: DialogScenario['cefr'], active = true): DialogScenario {
  return {
    id,
    cefr,
    active,
    role: `${id} host`,
    setting: `${id} place`,
    category: 'everyday',
    titleRu: id,
    persona: '',
    goalRu: '',
    goalEn: `goal ${id}`,
    icon: 'cafe-outline',
    requiredPhraseIds: [],
  } as unknown as DialogScenario;
}

const ALL: DialogScenario[] = [
  scenario('a1_one', 'A1'), scenario('a1_two', 'A1'), scenario('a2_one', 'A2'), scenario('a2_two', 'A2'),
  scenario('b1_one', 'B1'), scenario('b2_one', 'B2'), scenario('inactive', 'A2', false),
  ...Array.from({ length: 20 }, (_, i) => scenario(`a2_extra_${String(i).padStart(2, '0')}`, 'A2')),
];

describe('buildTutorSceneCatalog', () => {
  it('берёт активные сцены уровня ±1, ближние по уровню — первыми, потолок и ротация по seed', () => {
    const items = buildTutorSceneCatalog(ALL, 'A2', 0);
    expect(items.length).toBe(TUTOR_SCENE_CATALOG_LIMIT);
    expect(items.every((s) => s.id !== 'inactive')).toBe(true);
    expect(items.every((s) => s.cefr !== 'B2')).toBe(true); // A2 ±1 → A1..B1
    expect(items[0].cefr).toBe('A2'); // ближайший уровень впереди
    const rotated = buildTutorSceneCatalog(ALL, 'A2', 5);
    expect(rotated.map((s) => s.id)).not.toEqual(items.map((s) => s.id));
    expect(new Set(rotated.map((s) => s.id)).size).toBe(rotated.length);
  });

  it('A1: сцены A1 и A2 (B1 не подходит новичку); неизвестный уровень → как A2', () => {
    const a1 = buildTutorSceneCatalog(ALL, 'A1');
    expect(a1.every((s) => s.cefr === 'A1' || s.cefr === 'A2')).toBe(true);
    expect(a1[0].cefr).toBe('A1');
    expect(buildTutorSceneCatalog(ALL, 'zz').length).toBeGreaterThan(0);
  });

  it('renderTutorSceneCatalog — одна строка на сцену с id, сеттингом, ролью и уровнем', () => {
    const text = renderTutorSceneCatalog(buildTutorSceneCatalog(ALL, 'B1').slice(0, 2));
    expect(text.split('\n')).toHaveLength(2);
    expect(text).toMatch(/^b1_one: b1_one place \(you play b1_one host; level B1\)/);
  });
});

describe('createTutorToolRunner', () => {
  function makeRunner() {
    const events: string[] = [];
    const runner = createTutorToolRunner({
      scenes: buildTutorSceneCatalog(ALL, 'A2'),
      sceneBlock: (id) => (ALL.some((s) => s.id === id && s.active) ? `SCENARIO ${id}` : null),
      onSceneChange: (scene) => events.push(`scene:${scene ? scene.id : 'none'}`),
      onHomework: (p) => events.push(`hw:${p.join('|')}`),
      onNextTopic: (t) => events.push(`topic:${t}`),
      onEndCall: () => events.push('end'),
    });
    return { runner, events };
  }

  it('start_scene: известная сцена → блок сцены и respond; неизвестная → подсказка со списком', () => {
    const { runner, events } = makeRunner();
    const ok = runner.handle('start_scene', { scene_id: 'a2_one' });
    expect(ok.respond).toBe(true);
    expect(ok.output).toContain('SCENE STARTED');
    expect(ok.output).toContain('SCENARIO a2_one');
    expect(runner.activeScene()?.id).toBe('a2_one');
    expect(events).toEqual(['scene:a2_one']);

    const bad = runner.handle('start_scene', { scene_id: 'nope' });
    expect(bad.output).toContain('Unknown scene_id "nope"');
    expect(bad.output).toContain('a2_extra_00'); // список каталога дня в подсказке
    expect(runner.activeScene()?.id).toBe('a2_one'); // активная не сбилась
  });

  it('сцена вне каталога дня, но известная приложению, — принимается (учитель мог помнить id)', () => {
    const { runner } = makeRunner();
    const res = runner.handle('start_scene', { scene_id: 'b2_one' });
    expect(res.output).toContain('SCENE STARTED');
    expect(runner.activeScene()?.id).toBe('b2_one');
  });

  it('end_scene возвращает учителя; повторный end_scene — no-op с честным ответом', () => {
    const { runner, events } = makeRunner();
    runner.handle('start_scene', { scene_id: 'a1_one' });
    expect(runner.handle('end_scene', {}).output).toContain('Scene ended');
    expect(runner.activeScene()).toBeNull();
    expect(runner.handle('end_scene', {}).output).toContain('No scene was active');
    expect(events).toEqual(['scene:a1_one', 'scene:none', 'scene:none']);
  });

  it('assign_homework: чистит, дедупит без регистра, режет до 4; пустой список — просьба повторить', () => {
    const { runner, events } = makeRunner();
    const res = runner.handle('assign_homework', {
      phrases: ['  I would like a coffee ', 'i would like a COFFEE', 'How much is it?', '', 'One', 'Two', 'Three'],
    });
    expect(res.respond).toBe(true);
    expect(runner.homework()).toEqual(['I would like a coffee', 'How much is it?', 'One', 'Two']);
    expect(events).toEqual(['hw:I would like a coffee|How much is it?|One|Two']);
    expect(runner.handle('assign_homework', { phrases: [] }).output).toContain('No phrases received');
    expect(runner.homework()).toHaveLength(4); // прежняя домашка не стёрта пустым вызовом
  });

  it('set_next_topic сохраняет тему; end_call — без response и с сигналом экрану', () => {
    const { runner, events } = makeRunner();
    expect(runner.handle('set_next_topic', { topic: ' ordering food ' }).output).toContain('ordering food');
    expect(runner.nextTopic()).toBe('ordering food');
    const end = runner.handle('end_call', {});
    expect(end.respond).toBe(false);
    expect(runner.endRequested()).toBe(true);
    expect(events).toEqual(['topic:ordering food', 'end']);
  });

  it('set_language_preference: «говори со мной по-английски» запоминается на урок и уезжает в память; мусор отклоняется', () => {
    const { runner } = makeRunner();
    expect(runner.languagePreference()).toBe('');
    expect(runner.handle('set_language_preference', { mode: 'more_target' }).output).toContain('more_target');
    expect(runner.languagePreference()).toBe('more_target');
    expect(runner.handle('set_language_preference', { mode: 'loud' }).output).toContain('Unknown mode');
    expect(runner.languagePreference()).toBe('more_target');
    // Старое имя из первых сборок читается как more_target.
    runner.handle('set_language_preference', { mode: 'more_english' });
    expect(runner.languagePreference()).toBe('more_target');
    runner.handle('set_language_preference', { mode: 'default' });
    expect(runner.languagePreference()).toBe('default');
  });

  it('flag_safety: тихая пометка без response, дедуп по виду, мусор игнорируется', () => {
    const { runner } = makeRunner();
    const res = runner.handle('flag_safety', { kind: 'harassment', note: 'insulted the tutor twice' });
    expect(res.respond).toBe(false);
    expect(res.output).toContain('do not mention this');
    runner.handle('flag_safety', { kind: 'harassment', note: 'again' });
    runner.handle('flag_safety', { kind: 'teleport' });
    runner.handle('flag_safety', { kind: 'self_harm' });
    expect(runner.safetyFlags()).toEqual([
      { kind: 'harassment', note: 'insulted the tutor twice' },
      { kind: 'self_harm', note: '' },
    ]);
  });

  it('mark_phrase_result: результаты повторения собираются (последний по фразе побеждает), без response', () => {
    const { runner } = makeRunner();
    expect(runner.handle('mark_phrase_result', { phrase: 'I would like a coffee', ok: false }).respond).toBe(false);
    runner.handle('mark_phrase_result', { phrase: 'i would like a COFFEE', ok: true });
    runner.handle('mark_phrase_result', { phrase: 'How much is it?', ok: true });
    runner.handle('mark_phrase_result', { phrase: '', ok: true });
    expect(runner.phraseResults()).toEqual([
      { text: 'i would like a COFFEE', ok: true },
      { text: 'How much is it?', ok: true },
    ]);
  });

  it('assign_homework со значениями → homeworkItems для тренажёра; end_scene(outcome) → sceneOutcome', () => {
    const { runner } = makeRunner();
    runner.handle('assign_homework', { phrases: ['I would like tea', 'See you tomorrow'], meanings: ['Я хотел бы чай'] });
    expect(runner.homeworkItems()).toEqual([
      { text: 'I would like tea', meaning: 'Я хотел бы чай' },
      { text: 'See you tomorrow', meaning: '' },
    ]);
    expect(runner.sceneOutcome()).toBe('');
    runner.handle('start_scene', { scene_id: 'a2_one' });
    runner.handle('end_scene', { outcome: 'done' });
    expect(runner.sceneOutcome()).toBe('done');
    runner.handle('start_scene', { scene_id: 'a1_one' });
    runner.handle('end_scene', { outcome: 'weird' });
    expect(runner.sceneOutcome()).toBe('partial'); // неизвестный исход — «частично», не теряем факт сцены
  });

  it('неизвестный инструмент — мягкий ответ, ничего не ломает', () => {
    const { runner } = makeRunner();
    expect(runner.handle('teleport', {}).output).toContain('Unknown tool');
  });
});
