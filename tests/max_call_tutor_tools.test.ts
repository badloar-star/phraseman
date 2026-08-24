// Инструменты учителя (app/max_call_tutor_tools) — чистый модуль под jest.
// зачем: владелец 2026-08-16 — учитель ведёт урок, предлагает сцены, задаёт
// домашку и сам заканчивает звонок; клиент исполняет это локально.

import {
  TUTOR_SCENE_CATALOG_LIMIT,
  buildStableTutorSceneCatalog,
  buildTutorSceneCatalog,
  createTutorToolRunner,
  renderTutorSceneCatalog,
} from '../app/max_call_tutor_tools';
import type { TutorBoardToolPayload } from '../app/max_call_tutor_tools';
import type { DialogScenario } from '../app/ai_dialog_scenarios';
import type { TutorConversationMode } from '../app/max_tutor_live_board_state';

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
  function makeRunner(
    currentGoal: { id: string; mastery: number; sceneIds?: string[] } | null = null,
    studyTarget: 'en' | 'fr' | 'es' = 'en',
  ) {
    const events: string[] = [];
    const liveBoards: TutorBoardToolPayload[] = [];
    const liveTopics: { topic: string; mode: TutorConversationMode }[] = [];
    const runner = createTutorToolRunner({
      scenes: buildTutorSceneCatalog(ALL, 'A2'),
      studyTarget,
      sceneBlock: (id) => (ALL.some((s) => s.id === id && s.active) ? `SCENARIO ${id}` : null),
      onSceneChange: (scene) => events.push(`scene:${scene ? scene.id : 'none'}`),
      onHomework: (p) => events.push(`hw:${p.join('|')}`),
      onNextTopic: (t) => events.push(`topic:${t}`),
      onLiveBoard: (payload) => liveBoards.push(payload),
      onLiveTopic: (payload) => liveTopics.push(payload),
      onEndCall: () => events.push('end'),
      currentGoal: () => currentGoal,
    });
    return { runner, events, liveBoards, liveTopics };
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

  it.each([
    ['en', 'English'],
    ['fr', 'French'],
    ['es', 'Spanish'],
  ] as const)('start_scene keeps the %s course language inside the scene', (studyTarget, languageName) => {
    const { runner } = makeRunner(null, studyTarget);
    const result = runner.handle('start_scene', { scene_id: 'a2_one' });
    expect(result.output).toContain(`Play this role in ${languageName}`);
    for (const wrongLanguage of ['English', 'French', 'Spanish'].filter((name) => name !== languageName)) {
      expect(result.output).not.toContain(`Play this role in ${wrongLanguage}`);
    }
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

  it('assign_homework: чистит, дедупит и сохраняет максимум 3 полные пары', () => {
    const { runner, events } = makeRunner();
    for (const phrase of ['I would like a coffee', 'How much is it?', 'One', 'Two', 'Three']) {
      runner.handle('mark_phrase_result', { phrase, result: 'pass' });
    }
    const res = runner.handle('assign_homework', {
      phrases: ['  I would like a coffee ', 'i would like a COFFEE', 'How much is it?', '', 'One', 'Two', 'Three'],
      meanings: ['Я хотел бы кофе', 'дубль', 'Сколько это стоит?', '', 'Один', 'Два', 'Три'],
    });
    expect(res.respond).toBe(true);
    expect(runner.homework()).toEqual(['I would like a coffee', 'How much is it?', 'One']);
    expect(events).toEqual(['hw:I would like a coffee|How much is it?|One']);
    expect(runner.handle('assign_homework', { phrases: [] }).output).toContain('No phrases received');
    expect(runner.homework()).toHaveLength(3); // прежняя домашка не стёрта пустым вызовом
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

  it('show_tutor_board validates and emits one safe payload', () => {
    const { runner, liveBoards } = makeRunner();
    const result = runner.handle('show_tutor_board', {
      kind: 'hint',
      target_text: 'Could we move it to Friday?',
      meaning: 'Можем перенести это на пятницу?',
      source: 'learner_request',
    });

    expect(result).toEqual({ output: 'Tutor board shown.', respond: false });
    expect(liveBoards).toEqual([{
      kind: 'hint',
      targetText: 'Could we move it to Friday?',
      meaning: 'Можем перенести это на пятницу?',
      source: 'learner_request',
    }]);
  });

  it('show_tutor_board rejects unsafe enums, oversized text, and uncertain recasts', () => {
    const { runner, liveBoards } = makeRunner();

    expect(runner.handle('show_tutor_board', {
      kind: 'grade', target_text: 'Try this', source: 'silence',
    }).output).toContain('Invalid tutor board');
    expect(runner.handle('show_tutor_board', {
      kind: 'hint', target_text: 'x'.repeat(101), source: 'silence',
    }).output).toContain('Invalid tutor board');
    expect(runner.handle('show_tutor_board', {
      kind: 'recast', target_text: 'Try this', source: 'silence',
    }).output).toContain('Invalid tutor board');
    expect(liveBoards).toEqual([]);
  });

  it('set_live_topic emits guided/free-talk mode and rejects blank topics', () => {
    const { runner, liveTopics } = makeRunner();

    expect(runner.handle('set_live_topic', {
      topic: 'Weekend plans', mode: 'guided',
    }).respond).toBe(false);
    expect(liveTopics).toEqual([{ topic: 'Weekend plans', mode: 'guided' }]);
    expect(runner.handle('set_live_topic', {
      topic: ' ', mode: 'free_talk',
    }).output).toContain('Topic is empty');
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

  it('mark_phrase_result: хранит четыре состояния речи; последнее по фразе побеждает', () => {
    const { runner } = makeRunner();
    expect(runner.handle('mark_phrase_result', { phrase: 'I would like a coffee', result: 'uncertain' }).respond).toBe(false);
    runner.handle('mark_phrase_result', { phrase: 'i would like a COFFEE', result: 'pass' });
    runner.handle('mark_phrase_result', { phrase: 'How much is it?', result: 'needs_work' });
    runner.handle('mark_phrase_result', { phrase: 'The line broke', result: 'invalid' });
    runner.handle('mark_phrase_result', { phrase: '', result: 'pass' });
    expect(runner.phraseResults()).toEqual([
      { text: 'i would like a COFFEE', result: 'pass' },
      { text: 'How much is it?', result: 'needs_work' },
      { text: 'The line broke', result: 'invalid' },
    ]);
  });

  it('mark_phrase_result отклоняет неизвестное состояние вместо ложной ошибки', () => {
    const { runner } = makeRunner();
    expect(runner.handle('mark_phrase_result', { phrase: 'Hello', result: 'maybe' }).output).toContain('Unknown speech result');
    expect(runner.phraseResults()).toEqual([]);
  });

  it('mark_goal_progress не показывает ложное закрытие до накопленных доказательств и подходящей сцены', () => {
    const first = makeRunner({ id: 'a1_greet', mastery: 0, sceneIds: ['a1_one'] }).runner;
    first.handle('mark_goal_progress', { goal_id: 'a1_greet', mastery: 3 });
    expect(first.goalProgress()).toEqual({ goalId: 'a1_greet', mastery: 1 });
    expect(first.handle('mark_goal_progress', { goal_id: 'a1_intro', mastery: 3 }).output).toContain('current goal');

    const unrelated = makeRunner({ id: 'a1_greet', mastery: 2, sceneIds: ['a1_one'] }).runner;
    unrelated.handle('start_scene', { scene_id: 'a2_one' });
    unrelated.handle('end_scene', { outcome: 'done' });
    expect(unrelated.handle('mark_goal_progress', {
      goal_id: 'a1_greet', mastery: 3, transfer_evidence: 'scene',
    }).output).toContain('approved transfer scene');
    expect(unrelated.goalProgress()).toEqual({ goalId: 'a1_greet', mastery: 2 });

    const transfer = makeRunner({ id: 'a1_greet', mastery: 2, sceneIds: ['a1_one'] }).runner;
    transfer.handle('start_scene', { scene_id: 'a1_one' });
    transfer.handle('end_scene', { outcome: 'done' });
    transfer.handle('mark_goal_progress', { goal_id: 'a1_greet', mastery: 3, transfer_evidence: 'scene' });
    expect(transfer.goalProgress()).toEqual({ goalId: 'a1_greet', mastery: 3, evidence: 'scene', sceneId: 'a1_one' });

    const invented = makeRunner({ id: 'a1_family', mastery: 2, sceneIds: [] }).runner;
    invented.handle('mark_goal_progress', { goal_id: 'a1_family', mastery: 3, transfer_evidence: 'novel_context' });
    expect(invented.goalProgress()).toEqual({ goalId: 'a1_family', mastery: 3, evidence: 'novel_context' });
  });

  it('assign_homework без значения отклоняется целиком; полные пары уходят в тренажёр', () => {
    const { runner } = makeRunner();
    runner.handle('mark_phrase_result', { phrase: 'I would like tea', result: 'pass' });
    runner.handle('mark_phrase_result', { phrase: 'See you tomorrow', result: 'pass' });
    expect(runner.handle('assign_homework', {
      phrases: ['I would like tea', 'See you tomorrow'], meanings: ['Я хотел бы чай'],
    }).output).toContain('Every homework phrase needs a meaning');
    expect(runner.homeworkItems()).toEqual([]);
    runner.handle('assign_homework', {
      phrases: ['I would like tea', 'See you tomorrow'], meanings: ['Я хотел бы чай', 'До завтра'],
    });
    expect(runner.homeworkItems()).toEqual([
      { text: 'I would like tea', meaning: 'Я хотел бы чай' },
      { text: 'See you tomorrow', meaning: 'До завтра' },
    ]);
  });

  it('assign_homework принимает только уверенно отработанные фразы и не портит прежнюю домашку', () => {
    const { runner } = makeRunner();
    runner.handle('mark_phrase_result', { phrase: 'I can help', result: 'pass' });
    runner.handle('assign_homework', { phrases: ['I can help'], meanings: ['Я могу помочь'] });

    runner.handle('mark_phrase_result', { phrase: 'I need help', result: 'needs_work' });
    const rejected = runner.handle('assign_homework', {
      phrases: ['I can help', 'I need help', 'A brand new line'],
      meanings: ['Я могу помочь', 'Мне нужна помощь', 'Новая фраза'],
    });

    expect(rejected.output).toContain('confidently practised');
    expect(runner.homeworkItems()).toEqual([{ text: 'I can help', meaning: 'Я могу помочь' }]);
  });

  it('end_scene(outcome) сохраняет результат переноса', () => {
    const { runner } = makeRunner();
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

// зачем (владелец 2026-08-23, «урезать стоимость минуты хотя бы на 70»):
// каталог сцен уходит в промпт, а prompt cache OpenAI совпадает по ТОЧНОМУ
// префиксу. Пока каталог зависел от уровня и дня, он давал 4 разных префикса
// в день и 28 за неделю — кэш дробился и почти всегда был холодным.
describe('стабильный каталог сцен (кэш-контракт)', () => {
  const pool = [
    scenario('a1_one', 'A1'), scenario('a1_two', 'A1'), scenario('a1_three', 'A1'),
    scenario('a2_one', 'A2'), scenario('a2_two', 'A2'), scenario('a2_three', 'A2'),
    scenario('b1_one', 'B1'), scenario('b1_two', 'B1'), scenario('b1_three', 'B1'),
    scenario('b2_one', 'B2'), scenario('b2_two', 'B2'), scenario('b2_three', 'B2'),
  ];

  it('один и тот же список независимо от уровня и дня — префикс промпта стабилен', () => {
    const a = renderTutorSceneCatalog(buildStableTutorSceneCatalog(pool));
    const b = renderTutorSceneCatalog(buildStableTutorSceneCatalog(pool));
    expect(a).toBe(b);
    expect(a).not.toBe('');
  });

  it('каждый уровень представлен — сильному ученику есть что предложить', () => {
    const items = buildStableTutorSceneCatalog(pool, 8);
    const levels = new Set(items.map((s) => s.cefr));
    expect(levels).toEqual(new Set(['A1', 'A2', 'B1', 'B2']));
    expect(items).toHaveLength(8);
  });

  it('уровень каждой сцены виден в строке — учитель выбирает подходящую сам', () => {
    const rendered = renderTutorSceneCatalog(buildStableTutorSceneCatalog(pool, 4));
    expect(rendered).toContain('level A1');
    expect(rendered).toContain('level B2');
  });

  it('неактивные сцены не попадают в каталог', () => {
    const withDisabled = [...pool, scenario('disabled_one', 'A2', false)];
    const ids = buildStableTutorSceneCatalog(withDisabled, 20).map((s) => s.id);
    expect(ids).not.toContain('disabled_one');
  });

  it('не превышает лимит и не падает на пустом наборе', () => {
    expect(buildStableTutorSceneCatalog(pool, 3)).toHaveLength(3);
    expect(buildStableTutorSceneCatalog(pool).length).toBeLessThanOrEqual(TUTOR_SCENE_CATALOG_LIMIT);
    expect(buildStableTutorSceneCatalog([])).toEqual([]);
  });
});
