import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const uiFor = key => ({
  back: 'Назад', next: 'Дальше', check: 'Проверить', retry: 'Попробовать ещё раз',
  allPairs: 'Все пары соединены.', listen: 'Прослушать', missingExplanation: 'Для выбранного ответа нет проверенного объяснения.',
  missingTileExplanation: 'Нет объяснения плитки.', builderWrong: 'Фраза не совпадает.', tileHint: 'Соберите фразу.',
  missingBuilderExplanation: 'У задания нет полного авторского объяснения.',
  missingPairsExplanation: 'У задания нет полного авторского разбора пар.',
})[key] ?? key;
const audioControlFor = transcript => ({ tag: 'audio', props: { transcript }, children: [] });

// Source-level interaction test, not a browser/viewport verification.
test('mockup renders every pair and waits for the seventh match', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderPairs('), source.indexOf('function renderSpeak('));
  const state = { pairsDone: [], pairSel: null, right: 0, wrong: 0, answered: false };
  let nodes = [];
  const panel = { append: node => nodes.push(node) };
  const grid = Array.from({ length: 7 }, (_, i) => ({ pairId: `p${i}`, target: `target${i}`, meaningByLocale: { ru: `meaning${i}` } }));
  const scope = {
    S: state, ui: uiFor, audioControl: audioControlFor, h: (tag, props, children = []) => ({ tag, props, children }),
    shuffle: values => values.slice().reverse(), loc: value => value.ru,
    avoidAlignedPairs: (_left, right) => right,
    WARNBOX: () => assert.fail('unexpected empty grid'), nextRow: () => ({ tag: 'next' }),
    render: () => { nodes = []; scope.renderPairs(panel, { interactionId: 'fixture' }, { pairGrid: grid }); },
  };
  vm.runInNewContext(fn, scope);
  scope.render();
  assert.deepEqual(Array.from(nodes[0].children, column => column.children.length), [7,7]);
  for (let i = 0; i < 7; i++) {
    nodes[0].children[0].children.find(button => button.props.text === `target${i}`).props.onClick();
    nodes[0].children[1].children.find(button => button.props.text === `meaning${i}`).props.onClick();
    assert.equal(state.answered, i === 6);
  }
  assert.equal(state.right, 7);
  assert.equal(state.wrong, 0);
  assert.ok(nodes[0].children.every(column => column.children.every(button => button.props.disabled)));
});

test('mockup never aligns a Speed Match pair on the same row', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderPairs('), source.indexOf('function renderSpeak('));
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const state = { pairsDone: [], pairSel: null, right: 0, wrong: 0, answered: false };
  const nodes = [];
  const panel = { append: node => nodes.push(node) };
  const grid = Array.from({ length: 4 }, (_, i) => ({
    pairId: `p${i}`,
    target: `target${i}`,
    meaningByLocale: { ru: `meaning${i}` },
  }));
  const scope = {
    S: state, ui: uiFor, audioControl: audioControlFor,
    h: (tag, props, children = []) => ({ tag, props, children }),
    loc: value => value.ru,
    WARNBOX: () => assert.fail('unexpected empty grid'),
    nextRow: () => ({ tag: 'next' }),
    render: () => {},
  };
  vm.runInNewContext(`${shuffleSource}\n${fn}`, scope);
  scope.renderPairs(panel, { interactionId: 'en:lesson-01:session-02:i07' }, { pairGrid: grid });
  const [left, right] = nodes[0].children.map(column => column.children.map(button => button.props.text));
  for (let row = 0; row < grid.length; row++) {
    assert.notEqual(
      left[row].replace('target', ''),
      right[row].replace('meaning', ''),
      `row ${row + 1} must not reveal a correct pair`,
    );
  }
});

test('mockup does not add a second final stop to an already punctuated Speed Match meaning', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderPairs('), source.indexOf('function renderSpeak('));
  const state = {
    pairsDone: [], pairSel: null, pairFeedback: { correct: true, leftId: 'p1', rightId: 'p1' },
    right: 0, wrong: 0, answered: false, locale: 'ru',
  };
  const nodes = [];
  const panel = { append: node => nodes.push(node) };
  const analysisV1 = {
    lemma: 'I am happy.', partOfSpeechLabelByLocale: { ru: 'фраза' },
    meaningByLocale: { ru: 'Хорошая новость.' },
    functionByLocale: { ru: 'Подходит к ситуации.' },
    matchExplanationByLocale: { ru: 'Поэтому подходит I am happy.' },
  };
  const scope = {
    S: state, ui: uiFor, audioControl: audioControlFor,
    h: (tag, props, children = []) => ({ tag, props, children }),
    shuffle: values => values, loc: value => value.ru, tl: value => value, avoidAlignedPairs: (_left, right) => right,
    WARNBOX: () => assert.fail('unexpected warning'), nextRow: () => ({ tag: 'next' }), render: () => {},
  };
  vm.runInNewContext(fn, scope);
  scope.renderPairs(panel, { interactionId: 'fixture' }, {
    pairGrid: [{ pairId: 'p1', target: 'I am happy.', meaningByLocale: { ru: 'Хорошая новость.' }, analysisV1 }],
  });
  assert.doesNotMatch(JSON.stringify(nodes), /Хорошая новость\.\./u);
});

test('mockup identifies a selected extra builder tile by its physical tile ID', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderBuilder('), source.indexOf('function renderPairs('));
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const state = { answered: false, ok: null, assembled: [], tileFeedback: null, step: 3, right: 0, wrong: 0, locale: 'ru' };
  let nodes = [];
  const panel = { append: node => nodes.push(node) };
  const scope = {
    S: state, ui: uiFor, audioControl: audioControlFor,
    h: (tag, props, children = []) => ({ tag, props, children }),
    shuffle: values => values,
    speak: () => {},
    document: { createTextNode: text => ({ text }) },
    loc: value => value?.[state.locale] ?? value?.ru ?? '',
    tl: value => value,
    WARNBOX: () => assert.fail('unexpected missing tiles'),
    render: () => { nodes = []; scope.renderBuilder(panel, { interactionId: 'fixture' }, payload); },
  };
  const payload = {
    targetPhrase: 'I am here.', orderedTokens: ['I', 'am', 'here'], authoredDistractorTokens: ['ready', 'ready'],
    slotFeedback: [
      { responseId: 'fixture:tile:d1', correct: false, feedbackByLocale: { ru: 'Первый лишний ready.' } },
      { responseId: 'fixture:tile:d2', correct: false, feedbackByLocale: { ru: 'Второй лишний ready.' } },
    ],
  };
  vm.runInNewContext(`${shuffleSource}\n${fn}`, scope);
  scope.render();
  const tiles = nodes.find(node => node?.props?.class === 'tiles').children;
  tiles.filter(tile => tile.props.text === 'ready')[1].props.onClick();
  assert.equal(state.tileFeedback.responseId, 'fixture:tile:d2');
  assert.equal(state.tileFeedback.feedbackByLocale.ru, 'Второй лишний ready.');
});

test('Speed Match derangement has a guaranteed fallback for five pairs', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const left = [0, 1, 2, 3, 4].map(id => ({ id }));
  const right = [0, 2, 4, 1, 3].map(id => ({ id }));
  const scope = { left, right };
  vm.runInNewContext(`${shuffleSource}\nresult = avoidAlignedPairs(left, right);`, scope);
  assert.deepEqual(Array.from(scope.result, item => item.id).sort(), [0, 1, 2, 3, 4]);
  assert.ok(scope.result.every((item, row) => item.id !== left[row].id));
});

test('mockup shuffles choices and renders localized listen meanings', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderChoice('), source.indexOf('function correctIdOf('));
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const state = { answered: false, picked: null, ok: false, right: 0, wrong: 0, locale: 'uk' };
  const nodes = [];
  const panel = { append: node => nodes.push(node) };
  const scope = {
    S: state, ui: uiFor, audioControl: audioControlFor,
    h: (tag, props, children = []) => ({ tag, props, children }),
    speak: () => {},
    document: { createTextNode: text => ({ text }) },
    loc: value => value?.[state.locale] ?? value?.ru ?? '',
    tl: value => value,
    WARNBOX: () => assert.fail('unexpected empty options'),
    correctIdOf: () => 'fixture:r1',
    nextRow: () => ({ tag: 'next' }),
    render: () => {},
  };
  vm.runInNewContext(`${shuffleSource}\n${fn}`, scope);
  scope.renderChoice(panel, {
    interactionId: 'en:lesson-03:session-25:i02',
    family: 'listen_choose',
    responseOptions: [
      { responseId: 'fixture:r1', text: 'phone' },
      { responseId: 'fixture:r2', text: 'bone' },
    ],
  }, {
    localizedMeaningChoices: [
      { responseId: 'fixture:r1', targetText: 'phone', meaningByLocale: { ru: 'телефон', uk: 'телефон' } },
      { responseId: 'fixture:r2', targetText: 'bone', meaningByLocale: { ru: 'кость', uk: 'кістка' } },
    ],
    choiceFeedback: [],
  });
  const labels = nodes[0].children.map(button => button.children[0].text);
  assert.notEqual(labels[0], 'телефон', 'authored correct-first choice must never remain first after seeded shuffle');
  assert.deepEqual(new Set(labels), new Set(['кістка', 'телефон']));
});

test('mockup renders separate sound-contrast audioA and audioB controls', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderChoice('), source.indexOf('function correctIdOf('));
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const state = { answered: false, picked: null, ok: false, right: 0, wrong: 0, locale: 'ru' };
  const spoken = [];
  const nodes = [];
  const panel = { append: node => nodes.push(node) };
  const scope = {
    S: state, ui: uiFor, audioControl: audioControlFor,
    h: (tag, props, children = []) => ({ tag, props, children }),
    speak: text => spoken.push(text),
    document: { createTextNode: text => ({ text }) },
    loc: value => value?.[state.locale] ?? value?.ru ?? '',
    tl: value => value,
    sanitizeLearnerPrompt: value => value,
    WARNBOX: () => assert.fail('unexpected missing sound-contrast audio'),
    correctIdOf: () => 'fixture:r1',
    nextRow: () => ({ tag: 'next' }),
    render: () => {},
  };
  vm.runInNewContext(`${shuffleSource}\n${fn}`, scope);
  scope.renderChoice(panel, {
    interactionId: 'en:lesson-01:session-04:i08',
    family: 'sound_contrast',
    responseOptions: [
      { responseId: 'fixture:r1', text: 'right' },
      { responseId: 'fixture:r2', text: 'wrong' },
    ],
  }, {
    audioA: { audioTargetId: 'fixture:a', transcript: 'right' },
    audioB: { audioTargetId: 'fixture:b', transcript: 'wrong' },
    contrastA: 'right',
    contrastB: 'wrong',
    choiceFeedback: [],
  });
  const audioButtons = nodes[0].children;
  assert.deepEqual(Array.from(audioButtons, button => button.children[0].text), ['▶  Прослушать A', '▶  Прослушать B']);
  audioButtons.forEach(button => button.props.onClick());
  assert.deepEqual(spoken, ['right', 'wrong']);
});

test('mockup fails closed when canonical release contains a multi-phrase practice or intro interaction', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  assert.match(source, /auditSinglePhraseRelease/u);
  assert.match(source, /single_phrase_mockup_hold/u);
  assert.match(source, /report\.violationCount/u);
  assert.match(source, /report\.introFileCount/u);
});

test('mockup keeps learner-facing labels free of the internal session term and numbers every task', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  assert.match(source, /const displayTitle/u);
  assert.match(source, /text:ui\("task"\) \+ " " \+ taskNumber/u);
  assert.match(source, /Пройти урок/u);
  assert.doesNotMatch(source.slice(source.indexOf('const displayTitle'), source.indexOf('const esc')), /\\bсессия\\b/u);
});

test('mockup renders the S03 trap intro without an internal kind label in RU and UK', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderIntro('), source.indexOf('function renderTask('));
  const state = { answered: false, picked: null, ok: false, locale: 'ru' };
  const scope = {
    S: state, ui: uiFor, audioControl: audioControlFor,
    h: (tag, props, children = []) => {
      const node = { tag, props, children: [].concat(children || []).filter(Boolean) };
      node.append = child => node.children.push(child);
      return node;
    },
    document: { createTextNode: text => ({ text }) },
    loc: value => value?.[state.locale] ?? value?.ru ?? '',
    tl: value => value,
    shuffleChoices: values => values,
    nextRow: () => ({ tag: 'next', props: {}, children: [] }),
    render: () => {},
  };
  const page = {
    pageId: 'en:lesson-01:session-03:intro3',
    kind: 'trap',
    titleByLocale: { ru: 'Где not спасает от неловкости', uk: 'Де not рятує від незручності' },
    bodyByLocale: { ru: 'Текст.', uk: 'Текст.' },
    question: {
      interactionId: 'en:lesson-01:session-03:intro3:q',
      promptByLocale: { ru: 'Скажите фразу.', uk: 'Скажіть фразу.' },
      choicesByLocale: {
        ru: [{ responseId: 'r1', text: 'I am not sure.' }],
        uk: [{ responseId: 'r1', text: 'I am not sure.' }],
      },
    },
  };
  const visibleText = node => [
    node?.props?.text,
    node?.text,
    ...(node?.children || []).flatMap(visibleText),
  ].filter(Boolean).join(' ');

  vm.runInNewContext(fn, scope);
  for (const locale of ['ru', 'uk']) {
    state.locale = locale;
    const rendered = scope.renderIntro(page, { entries: [] });
    assert.doesNotMatch(visibleText(rendered), /(?:Ловушка|Пастка)/u, `${locale}: internal trap label must stay hidden`);
  }
});

test('mockup renders the selected intro response token analysis and diagnostic contrast', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderIntro('), source.indexOf('function renderTask('));
  const analysisSource = source.slice(source.indexOf('function completeTextAnalysisV1('), source.indexOf('function renderCard('));
  const state = { answered: true, picked: 'r1', ok: true, locale: 'ru', step: 0 };
  const scope = {
    S: state, ui: uiFor, audioControl: audioControlFor,
    h: (tag, props, children = []) => {
      const node = { tag, props, children: [].concat(children || []).filter(Boolean) };
      node.append = child => node.children.push(child);
      return node;
    },
    document: { createTextNode: text => ({ text }) }, loc: value => value?.ru ?? '', tl: value => value,
    activeLocaleValue: value => value?.ru ?? value,
    shuffleChoices: values => values, render: () => {}, resetStep: () => {},
  };
  const page = {
    pageId: 'intro1', titleByLocale: { ru: 'Заголовок' }, bodyByLocale: { ru: 'Текст.' },
    question: { interactionId: 'intro1:q', promptByLocale: { ru: 'Выберите.' }, choicesByLocale: { ru: [{ responseId: 'r1', text: 'here' }] } },
  };
  const analysis = {
    text: 'here', meaningByLocale: { ru: 'здесь' }, explanationByLocale: { ru: 'Разбор here.' },
    units: [{ text: 'here', start: 0, end: 4, lemma: 'here', partOfSpeechLabelByLocale: { ru: 'наречие' }, meaningByLocale: { ru: 'здесь' }, functionByLocale: { ru: 'Сообщает о месте.' } }],
  };
  vm.runInNewContext(`${analysisSource}\n${fn}`, scope);
  const rendered = scope.renderIntro(page, { entries: [{
    interactionId: 'intro1:q', responseFeedbackById: { r1: { ru: 'Верно.' } }, responseAnalysisById: { r1: analysis },
    responseDiagnosticsById: { r1: {
      errorType: 'location_word',
      whyTemptingByLocale: { ru: 'Слова похожи по роли.' },
      whyWrongHereByLocale: { ru: 'Здесь требуется другое место.' },
      minimalContrastByLocale: { ru: 'Не here, а there.' },
      acceptabilityBoundaryByLocale: { ru: 'В другом контексте here возможно.' },
    } },
  }] });
  const json = JSON.stringify(rendered);
  const feedbackRegion = rendered.children.find((node) => node?.props?.class?.startsWith("fb "));
  assert.equal(feedbackRegion?.props?.role, "status");
  assert.equal(feedbackRegion?.props?.["aria-live"], "polite");
  assert.equal(feedbackRegion?.props?.["aria-atomic"], "true");
  assert.match(json, /Разбор here./u);
  assert.match(json, /наречие/u);
  assert.match(json, /Сообщает о месте./u);
  assert.match(json, /Не here, а there./u);
});

test('a card with any unsynchronised release material is yellow, not green', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  assert.match(source, /const needsRepair = findings\.length \|\| releaseFindings\.length;/u);
  assert.match(source, /needsRepair \? " needs-repair" : sourceFixed \? " " \+ REVIEWED_CARD_CLASS : ""/u);
});

test('candidate preview has an explicit yellow state and cannot reuse reviewed-source status', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  assert.match(source, /--candidate-preview/u);
  assert.match(source, /ЧЕРНОВИК · НЕ ПРОВЕРЕНО · НЕ ВЫПУСК/u);
  assert.match(source, /viewSource: CANDIDATE_PREVIEW \? "candidate"/u);
  assert.match(source, /isCandidate \? " needs-repair candidate"/u);
  assert.match(source, /Канонический выпуск не изменён/u);
  assert.match(source, /const REVIEWED_LABEL = CANDIDATE_PREVIEW \? ""/u);
  assert.match(source, /const REVIEWED_CARD_CLASS = CANDIDATE_PREVIEW \? "candidate-review-disabled"/u);
});

test('mockup uses the exact authored choice feedback for both outcomes and blocks a missing selected row', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderChoice('), source.indexOf('function correctIdOf('));
  const analysisSource = source.slice(source.indexOf('function completeTextAnalysisV1('), source.indexOf('function renderCard('));
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const state = { answered: false, picked: null, ok: false, right: 0, wrong: 0, locale: 'ru' };
  let nodes = [];
  const panel = { append: node => nodes.push(node) };
  const scope = {
    S: state, ui: uiFor, audioControl: audioControlFor,
    h: (tag, props, children = []) => ({ tag, props, children }),
    speak: () => {}, document: { createTextNode: text => ({ text }) },
    loc: value => value?.[state.locale] ?? value?.ru ?? '', tl: value => value,
    WARNBOX: () => assert.fail('unexpected invalid task'), correctIdOf: () => 'fixture:r1',
    nextRow: canNext => ({ tag: 'next', canNext }), render: () => {},
  };
  const task = { interactionId: 'fixture', family: 'context_gap_grammar', responseOptions: [
    { responseId: 'fixture:r1', text: 'right' }, { responseId: 'fixture:r2', text: 'wrong' },
  ] };
  const analysis = text => ({
    text, meaningByLocale: { ru: `Значение ${text}.` }, explanationByLocale: { ru: `Разбор ${text}.` },
    units: [{ text, start: 0, end: text.length, lemma: text, partOfSpeechLabelByLocale: { ru: 'слово' }, meaningByLocale: { ru: text }, functionByLocale: { ru: `Роль ${text}.` } }],
  });
  const feedback = [
    { responseId: 'fixture:r1', correct: true, feedbackByLocale: { ru: 'Авторский разбор верного ответа.' }, analysisV1: analysis('right') },
    { responseId: 'fixture:r2', correct: false, feedbackByLocale: { ru: 'Авторский разбор неверного ответа.' }, analysisV1: analysis('wrong') },
  ];
  vm.runInNewContext(`${shuffleSource}\n${analysisSource}\n${fn}`, scope);
  scope.renderChoice(panel, task, { choiceFeedback: feedback });
  nodes[0].children.find(button => button.children[0].text === 'right').props.onClick();
  nodes = []; scope.renderChoice(panel, task, { choiceFeedback: feedback });
  assert.match(JSON.stringify(nodes), /Авторский разбор верного ответа./u);
  assert.match(JSON.stringify(nodes), /Разбор right./u);
  assert.deepEqual(
    Object.fromEntries(["role", "aria-live", "aria-atomic"].map((key) => [key, nodes[1].props[key]])),
    { role: "status", "aria-live": "polite", "aria-atomic": "true" },
  );
  assert.equal(nodes.at(-1).canNext, true);

  nodes = []; state.answered = false; state.picked = null;
  scope.renderChoice(panel, task, { choiceFeedback: feedback });
  nodes[0].children.find(button => button.children[0].text === 'wrong').props.onClick();
  nodes = []; scope.renderChoice(panel, task, { choiceFeedback: feedback });
  assert.match(JSON.stringify(nodes), /Авторский разбор неверного ответа./u);
  assert.match(JSON.stringify(nodes), /Разбор wrong./u);
  assert.equal(nodes.at(-1).canNext, true);

  nodes = []; state.answered = false; state.picked = null;
  scope.renderChoice(panel, task, { choiceFeedback: feedback.slice(0, 1) });
  nodes[0].children.find(button => button.children[0].text === 'wrong').props.onClick();
  nodes = []; scope.renderChoice(panel, task, { choiceFeedback: feedback.slice(0, 1) });
  assert.match(JSON.stringify(nodes), /нет проверенного объяснения/u);
  assert.equal(nodes.at(-1).canNext, false);
});

test('mockup renders a complete builder explanation and blocks a partial explanation packet', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderBuilder('), source.indexOf('function renderPairs('));
  const analysisSource = source.slice(source.indexOf('function completeTextAnalysisV1('), source.indexOf('function renderCard('));
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const state = { answered: true, ok: true, assembled: [], tileFeedback: null, step: 3, right: 0, wrong: 0, locale: 'ru' };
  const nodes = [];
  const panel = { append: node => nodes.push(node) };
  const scope = {
    S: state, ui: uiFor, audioControl: audioControlFor, h: (tag, props, children = []) => ({ tag, props, children }), shuffle: values => values,
    speak: () => {}, document: { createTextNode: text => ({ text }) },
    loc: value => value?.[state.locale] ?? value?.ru ?? '', tl: value => value,
    WARNBOX: () => assert.fail('unexpected legacy warning'), nextRow: canNext => ({ tag: 'next', canNext }), render: () => {},
  };
  const complete = {
    completionFeedbackByLocale: { ru: 'Авторское завершение.' },
    phrase: {
      text: 'I am here.', meaningByLocale: { ru: 'Я здесь.' }, explanationByLocale: { ru: 'Полное объяснение фразы.' },
      units: [{ text: 'here', start: 5, end: 9, lemma: 'here', partOfSpeechLabelByLocale: { ru: 'наречие' }, meaningByLocale: { ru: 'здесь' }, functionByLocale: { ru: 'Сообщает о месте.' } }],
    },
  };
  vm.runInNewContext(`${shuffleSource}\n${analysisSource}\n${fn}`, scope);
  scope.renderBuilder(panel, { interactionId: 'fixture', family: 'phrase_builder' }, {
    targetPhrase: 'I am here.', orderedTokens: ['I', 'am', 'here'], explanationV1: complete,
  });
  const rendered = JSON.stringify(nodes);
  for (const text of ['Авторское завершение.', 'Я здесь.', 'Полное объяснение фразы.', 'наречие', 'здесь', 'Сообщает о месте.']) assert.match(rendered, new RegExp(text, 'u'));

  const invalidNodes = [];
  const invalidPanel = { append: node => invalidNodes.push(node) };
  scope.renderBuilder(invalidPanel, { interactionId: 'fixture', family: 'phrase_builder' }, {
    targetPhrase: 'I am here.', orderedTokens: ['I', 'am', 'here'],
    explanationV1: { ...complete, phrase: { ...complete.phrase, units: [{}] } },
  });
  assert.match(invalidNodes[0].props.text, /нет полного авторского объяснения/u);
  assert.equal(invalidNodes.at(-1).canNext, false);
});

test('mockup keeps an incorrect builder attempt in the task and announces localized negative feedback', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderBuilder('), source.indexOf('function renderPairs('));
  const analysisSource = source.slice(source.indexOf('function completeTextAnalysisV1('), source.indexOf('function renderCard('));
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const state = { answered: true, ok: false, assembled: [{ tileId: 't1', text: 'I' }, { tileId: 't2', text: 'am' }, { tileId: 't3', text: 'ready' }], tileFeedback: null, step: 3, right: 0, wrong: 1, locale: 'uk' };
  const nodes = [];
  const panel = { append: node => nodes.push(node) };
  const scope = {
    S: state, h: (tag, props, children = []) => ({ tag, props, children }), shuffle: values => values,
    speak: () => true, audioControl: () => ({ tag: 'audio' }), document: { createTextNode: text => ({ text }) },
    loc: value => value?.[state.locale] ?? value?.ru ?? '', tl: value => value,
    ui: key => ({ back: 'Назад', next: 'Далі', check: 'Перевірити', retry: 'Спробувати ще раз', builderWrong: 'Фраза не збігається. Спробуйте ще раз.' })[key] ?? key,
    WARNBOX: () => assert.fail('unexpected warning'), nextRow: canNext => ({ tag: 'next', canNext }), render: () => {},
  };
  const explanation = {
    completionFeedbackByLocale: { ru: 'Верно.', uk: 'Правильно.' },
    phrase: { text: 'I am here.', meaningByLocale: { ru: 'Я здесь.', uk: 'Я тут.' }, explanationByLocale: { ru: 'Разбор.', uk: 'Розбір.' }, units: [
      { text: 'here', start: 5, end: 9, lemma: 'here', partOfSpeechLabelByLocale: { ru: 'наречие', uk: 'прислівник' }, meaningByLocale: { ru: 'здесь', uk: 'тут' }, functionByLocale: { ru: 'Место.', uk: 'Місце.' } },
    ] },
  };
  vm.runInNewContext(`${shuffleSource}\n${analysisSource}\n${fn}`, scope);
  scope.renderBuilder(panel, { interactionId: 'fixture', family: 'phrase_builder' }, {
    targetPhrase: 'I am here.', orderedTokens: ['I', 'am', 'here'], explanationV1: explanation,
  });
  const status = nodes.find(node => node?.props?.role === 'status');
  assert.equal(status.props['aria-live'], 'polite');
  assert.equal(status.props.text, 'Фраза не збігається. Спробуйте ще раз.');
  assert.doesNotMatch(JSON.stringify(nodes), /Правильно\./u);
  const actions = nodes.at(-1);
  assert.equal(actions.children.some(button => button.props.text === 'Далі'), false);
  const retry = actions.children.find(button => button.props.text === 'Спробувати ще раз');
  retry.props.onClick();
  assert.equal(state.answered, false);
  assert.equal(state.assembled.length, 0);
});

test('mockup speaking task requires an honest learner action and never claims automatic checking', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderSpeak('), source.indexOf('function renderDone('));
  const state = { answered: false, ok: null, locale: 'ru', unverified: 0 };
  let nodes = [];
  const panel = { append: node => nodes.push(node) };
  const scope = {
    S: state, h: (tag, props, children = []) => ({ tag, props, children }), document: { createTextNode: text => ({ text }) },
    ui: key => ({ speakUnavailable: 'Запись и автоматическая проверка сейчас недоступны.', markSpoken: 'Я произнёс(ла) фразу', unverified: 'Выполнено без автоматической проверки.' })[key] ?? key,
    audioControl: () => ({ tag: 'audio' }), completeTextAnalysisV1: () => true, renderTextAnalysisV1: () => ({ tag: 'analysis' }),
    WARNBOX: () => assert.fail('unexpected warning'), nextRow: canNext => ({ tag: 'next', canNext }),
    render: () => { nodes = []; scope.renderSpeak(panel, { interactionId: 'fixture' }, { targetPhrase: 'I am here.' }); },
  };
  vm.runInNewContext(fn, scope);
  scope.renderSpeak(panel, { interactionId: 'fixture' }, { targetPhrase: 'I am here.' });
  assert.equal(state.answered, false);
  assert.equal(nodes.at(-1).canNext, false);
  assert.match(JSON.stringify(nodes), /автоматическая проверка сейчас недоступн/u);
  const mark = nodes.find(node => node?.props?.text === 'Я произнёс(ла) фразу');
  mark.props.onClick();
  assert.equal(state.answered, true);
  assert.equal(state.ok, null);
  assert.equal(state.unverified, 1);
  const status = nodes.find(node => node?.props?.role === 'status');
  assert.equal(status.props.text, 'Выполнено без автоматической проверки.');
  assert.equal(nodes.at(-1).canNext, true);
});

test('mockup localizes the complete Ukrainian shell and reports an honest audio transcript fallback', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  for (const expected of [
    'back:\\{ru:"Назад",uk:"Назад"\\}',
    'Далі', 'Завдання', 'Прослухати', 'Перевірити', 'До списку уроків',
    'Аудіо недоступне. Текст для читання:',
    'ЧЕРНЕТКА · НЕ ПЕРЕВІРЕНО · НЕ ВИПУСК',
    'Перевірений розбір для цієї відповіді відсутній.',
    'У завданні немає повного авторського пояснення.',
    'Помилка відтворення',
  ]) assert.match(source, new RegExp(expected, 'u'));
  assert.match(source, /function audioControl\(/u);
  assert.match(source, /role:"status",\s*"aria-live":"polite"/u);
  assert.match(source, /document\.documentElement\.lang = S\.locale/u);
  assert.match(source, /HOME_DESCRIPTION_BY_LOCALE/u);
  assert.match(source, /titleByLocale/u);
  assert.match(source, /sceneByLocale/u);
  assert.match(source, /displayTitle\(loc\(s\.titleByLocale\) \|\| s\.title\)/u);
  assert.match(source, /text:loc\(s\.sceneByLocale\) \|\| s\.scene/u);
});

test('all dynamic builder and pair feedback uses an aria live status region', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const builder = source.slice(source.indexOf('function renderBuilder('), source.indexOf('function renderPairs('));
  const pairs = source.slice(source.indexOf('function renderPairs('), source.indexOf('function renderSpeak('));
  assert.match(builder, /S\.tileFeedback[\s\S]+role:"status"[\s\S]+aria-live/u);
  assert.match(builder, /S\.answered[\s\S]+builderWrong[\s\S]+role:"status"/u);
  assert.match(pairs, /S\.pairFeedback[\s\S]+role:"status"[\s\S]+aria-live/u);
  assert.match(pairs, /S\.answered[\s\S]+role:"status"[\s\S]+allPairs/u);
});

test('S01 final listening prompt identifies the colleague question and the learner answer in both locales', () => {
  const atomic = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../sessions/en/l01/s01/practice.atomic.json', import.meta.url)), 'utf8'));
  const rows = Object.values(atomic.interactionsByLocale).flat().filter(row => row.interactionId === 'en:lesson-01:session-01:i17:s03');
  assert.equal(rows.length, 2);
  assert.match(rows[0].prompt, /Коллега спрашивает, как у вас дела\. Послушайте и соберите свой ответ/u);
  assert.match(rows[1].prompt, /Колега запитує, як ваші справи\. Послухайте й складіть свою відповідь/u);
  assert.equal(rows.every(row => row.accessibilityLabel === row.prompt), true);
});

test('completion screen reports checked and unverified work without comparing score to all tasks', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const done = source.slice(source.indexOf('function renderDone('), source.indexOf('function render()'));
  assert.match(done, /checkedActions/u);
  assert.match(done, /unverified/u);
  assert.doesNotMatch(done, /learner\.interactions\.length/u);
});

test('mockup keeps speed-match identities for authored feedback and blocks a partial analysis packet', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderPairs('), source.indexOf('function renderSpeak('));
  const analysisSource = source.slice(source.indexOf('function completeTextAnalysisV1('), source.indexOf('function renderCard('));
  const state = { pairsDone: [], pairSel: null, pairFeedback: null, right: 0, wrong: 0, answered: false, locale: 'ru' };
  let nodes = [];
  const panel = { append: node => nodes.push(node) };
  const analysis = (meaning) => ({
    lemma: meaning, partOfSpeechLabelByLocale: { ru: 'существительное' }, meaningByLocale: { ru: meaning },
    functionByLocale: { ru: `Функция ${meaning}.` }, matchExplanationByLocale: { ru: `Верная пара ${meaning}.` },
    phrase: { text: meaning, meaningByLocale: { ru: meaning }, explanationByLocale: { ru: `Разбор ${meaning}.` }, units: [
      { text: meaning, start: 0, end: meaning.length, lemma: meaning, partOfSpeechLabelByLocale: { ru: 'существительное' }, meaningByLocale: { ru: meaning }, functionByLocale: { ru: `Функция ${meaning}.` } },
    ] },
  });
  const grid = [
    { pairId: 'p1', target: 'one', meaningByLocale: { ru: 'один' }, analysisV1: analysis('один') },
    { pairId: 'p2', target: 'two', meaningByLocale: { ru: 'два' }, analysisV1: analysis('два') },
  ];
  const scope = {
    S: state, ui: uiFor, audioControl: audioControlFor, h: (tag, props, children = []) => ({ tag, props, children }),
    shuffle: values => values, avoidAlignedPairs: (_left, right) => right.slice().reverse(),
    loc: value => value?.[state.locale] ?? value?.ru ?? '', tl: value => value,
    WARNBOX: () => assert.fail('unexpected legacy warning'), nextRow: canNext => ({ tag: 'next', canNext }),
    render: () => { nodes = []; scope.renderPairs(panel, { interactionId: 'fixture' }, { pairGrid: grid }); },
  };
  vm.runInNewContext(`${analysisSource}\n${fn}`, scope);
  scope.render();
  nodes[0].children[0].children.find(button => button.props.text === 'one').props.onClick();
  nodes[0].children[1].children.find(button => button.props.text === 'два').props.onClick();
  const mismatch = JSON.stringify(nodes);
  for (const text of ['один', 'два', 'Функция один.', 'Функция два.', 'Разбор один.', 'Разбор два.']) assert.match(mismatch, new RegExp(text, 'u'));

  const invalidNodes = [];
  const invalidPanel = { append: node => invalidNodes.push(node) };
  scope.renderPairs(invalidPanel, { interactionId: 'fixture' }, { pairGrid: [{ ...grid[0] }, { ...grid[1], analysisV1: undefined }] });
  assert.match(invalidNodes[0].props.text, /нет полного авторского разбора/u);
  assert.equal(invalidNodes.at(-1).canNext, false);
});
