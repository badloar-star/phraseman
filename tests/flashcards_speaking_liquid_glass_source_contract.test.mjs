import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const ROOT = path.resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const SESSION_PATH = 'app/flashcards_speaking_session.tsx';
const PHRASE_CARD_PATH = 'app/flashcards/PhraseCard.tsx';
const SIZER_PATH = 'app/flashcards/PhraseCardSizer.tsx';
const sessionSource = read(SESSION_PATH);
const phraseCardSource = read(PHRASE_CARD_PATH);
const sizerSource = read(SIZER_PATH);
const sessionAst = ts.createSourceFile(
  SESSION_PATH,
  sessionSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

function printNode(node) {
  return printer.printNode(ts.EmitHint.Unspecified, node, sessionAst);
}

function sourceAst(relativePath, source) {
  return ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function findFunctionSource(relativePath, source, name) {
  const ast = sourceAst(relativePath, source);
  const localPrinter = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  let found = null;
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(found, `missing function ${name}`);
  return localPrinter.printNode(ts.EmitHint.Unspecified, found, ast);
}

function executeExtractedFunction(relativePath, source, name, prelude = '') {
  const code = `${prelude}\n${findFunctionSource(relativePath, source, name)}\nmodule.exports = ${name};`;
  const output = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports });
  return module.exports;
}

function loadActualSizer() {
  const output = ts.transpileModule(sizerSource, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: SIZER_PATH,
  }).outputText;
  const stateWrites = [];
  const react = {
    createElement(type, props, ...children) {
      return {
        type,
        props: {
          ...(props ?? {}),
          children: children.length <= 1 ? children[0] : children,
        },
      };
    },
    useState(initialValue) {
      const index = stateWrites.length;
      stateWrites.push([]);
      return [initialValue, (value) => stateWrites[index].push(value)];
    },
  };
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier === 'react') return { __esModule: true, default: react, ...react };
    if (specifier === 'react-native') return { View: 'View' };
    throw new Error(`unexpected Sizer dependency ${specifier}`);
  };
  const wrapper = vm.runInNewContext(`(function(require, module, exports) { ${output}\n})`);
  wrapper(localRequire, module, module.exports);
  return { Sizer: module.exports.default, stateWrites };
}

function findStyle(source, name, nextName) {
  const start = source.indexOf(`  ${name}:`);
  const end = source.indexOf(`  ${nextName}:`, start + 1);
  assert.ok(start >= 0 && end > start, `missing scoped style ${name}`);
  return source.slice(start, end);
}

function activeScreenSource() {
  const start = sessionSource.indexOf('  return (', sessionSource.indexOf('const spoken ='));
  const end = sessionSource.indexOf('const styles =', start);
  assert.ok(start >= 0 && end > start, 'active speaking screen slice must exist');
  return sessionSource.slice(start, end);
}

function hashProtectedRuntimeAst() {
  const protectedNames = new Set([
    'refundSpeakingEntry',
    'leave',
    'stopSpeechAndCancelPendingAdvance',
    'clearAdvanceTimer',
    'speakCard',
    'clearEchoTimers',
    'echoReference',
    'onHoldStart',
    'onHoldEnd',
    'goNext',
    'advanceOrWaitForEcho',
    'onScore',
    'onPanelClose',
    'onPanelStatusChange',
    'onRetry',
    'resetSpeakingCardAfterSessionRuneForfeit',
    'onPickTask',
    'onRetryWrong',
    'openDeckPicker',
    'closeDeckPicker',
    'retryQuotaStart',
    'startWithPreset',
  ]);
  const nodes = [];
  let effectIndex = 0;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && protectedNames.has(node.name.text)) {
      nodes.push({ name: node.name.text, position: node.getStart(sessionAst), hash: sha256(printNode(node)) });
    }
    if (
      ts.isExpressionStatement(node)
      && ts.isCallExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === 'useEffect'
    ) {
      nodes.push({ name: `useEffect#${effectIndex}`, position: node.getStart(sessionAst), hash: sha256(printNode(node)) });
      effectIndex += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(sessionAst);
  nodes.sort((left, right) => left.position - right.position);
  return {
    count: nodes.length,
    hash: sha256(nodes.map(({ name, hash }) => `${name}:${hash}`).join('\n')),
  };
}

function hashProtectedRuntimeElements() {
  const protectedNames = new Set([
    'DeckPickerSheet',
    'SessionAttemptsHud',
    'SessionResultScreen',
    'SpeakingPanel',
    'SpeakMicButton',
    'NoEnergyModal',
    'CoinRewardFlight',
  ]);
  const nodes = [];
  const visit = (node) => {
    if (ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText(sessionAst);
      if (protectedNames.has(name)) {
        let printed = printNode(node);
        if (name === 'SpeakMicButton') {
          // зачем (Карточки 2.0 12.10): микрофон 92 принимает токены темы пропсом g (раньше accent); вид не входит в хеш поведения
          printed = printed.replace(/g=\{[^}]+\}/, 'g={__PRESENTATION_GLASS__}');
        }
        nodes.push({ name, position: node.getStart(sessionAst), hash: sha256(printed) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sessionAst);
  nodes.sort((left, right) => left.position - right.position);
  return sha256(nodes.map(({ name, hash }) => `${name}:${hash}`).join('\n'));
}

test('keeps the quota, attempt, hold, TTS, flight, and result runtime AST unchanged', () => {
  assert.deepEqual(hashProtectedRuntimeAst(), {
    // 10.10: f371d6122 — итог по cards-section (время раунда roundStartedAtRef, список ошибок); квоты/попытки не тронуты.
    count: 36,
    // зачем (30.09): D127 — «Устно» отсеивает карточки «без языка» (voicedDeckCards, 2acba6874); квоты/попытки/TTS не менялись.
    // зачем (30.09): D128 — озвучка клипом OpenAI своего языка вместо голоса устройства (7b4631e7e).
    // зачем (03.10): логика старта Ядра — 85f9e7231 (сторож загрузки +1 useEffect, трассировка [FC-SPEAKING-GATE], reconcile missing → fail-open) и 94003821a (компактный manifest, снятие записи до локального старта; ревью Opus).
    // зачем (04.10): 3b2ebf79d — трассировка запуска «Устно» (gateLog load:begin / load:cards_done / load:prefs_done) внутри useEffect#2 загрузки колод.
    // Сверено поузловым списком хешей между 94003821a и 3b2ebf79d: изменился ЕДИНСТВЕННЫЙ узел — useEffect#2; поведение (квоты, попытки, удержание,
    // озвучка, полёт монеты, итог) не менялось, остальные 33 узла побайтно те же. Удаление подарка ef0eea570 на этот хеш не влияет.
    // зачем (04.10, Дизайн): сторож старта считает простой (20 с без нового шага), а не время с начала — gateLog ставит время шага,
    // эффект сторожа перепланирует себя, пока шаги идут. Квоты, попытки, удержание, озвучка, полёт, итог — без изменений.
    // зачем (04.10, Ядро): сверено поузлово 82f0773fe → HEAD, менялись ровно три узла:
    //  • refundSpeakingEntry (abac0c627) — немой .catch(() => undefined) теперь пишет причину [FC-SPEAKING] (PM-229);
    //  • useEffect#2 + useEffect#11 (83300f8d5, §SPEECH-NA) — без распознавателя речи «Устно» не тратит энергию;
    //  • useEffect#2 (8e3e5993c) — claim старта, как у свайпа: выдача проходит фазы, месячный лимит списывается.
    // Удержание, озвучка, полёт монеты, итог — без изменений; 4bfdfb659 и 88f7489b3 хеш не трогали.
    // зачем (владелец 11.10, режим энергии Б; 750314a24): стоп-эффект экрана теперь проверяет общий isAttemptsStopEffect (attempts_exhausted ИЛИ energy_exhausted) — иначе в режиме Б остановка не останавливает озвучку. Квоты/попытки режима А не менялись.
    // зачем (Карточки 2.0 12.10): сверено — в защищённых узлах изменилась только строка setLastAward(...) в onScore (пилюля «+N» в панели «Верно» по макету cards-v2); квоты, попытки, удержание, озвучка, полёт, итог — без изменений.
    // зачем (Карточки 2.0 12.10, координатор: «ручное «Дальше» ДЕЛАЕМ»): в onScore убран автопереход после зачёта (таймеры advanceTimerRef, SPEAKING_AUTO_ADVANCE_MS) — остаётся эхо эталона и «Дальше» по нажатию;
    // квоты, попытки, озвучка, полёт монеты, итог — без изменений.
    // зачем (Карточки 2.0 12.10, «Продолжить»): +1 useEffect — запись позиции в наборе через usePackContinueRecorder (локально, с задержкой, не для смешанных колод);
    // квоты, попытки, озвучка, полёт монеты, итог — без изменений (число узлов 35 → 36, остальные побайтно прежние).
    // зачем (15.10, координатор: красные сторожи; сверено по diff 660f23ed6 и e531e6408): добавлены ТОЛЬКО dev-ветки съёмки — setLoading(false) в ветке отказа (cards-gap-002)
    // и подмена выдачи dev `train_gate=fail_speaking` (getDevTrainGate); квоты, попытки, удержание, озвучка, полёт монеты, итог — без изменений.
    // зачем (15.10 вечер, перепрогон красных; сверено по diff d1b10af11 и 41443be48): d1b10af11 (Ядро) — в acknowledgeAndClearFlashcardTrainingPendingGrant передаётся { energyCharged } (старт у Plus без списания энергии);
    // 41443be48 — украинские тексты «вислів». Квоты, попытки, удержание, озвучка, полёт монеты, итог — без изменений.
    hash: '887c427bd3a3c408bc2f0637c2c4ced71dca9f24d323312581f30d68e33828e2', // перепин 17.10 (R115): после пина 13.10 намеренные правки — D194 попытка голоса списывается при РЕАЛЬНОМ старте записи (dc5589c86, useVoiceAttemptGate), язык микрофона и озвучки по изучаемому языку (e6392a5a7, cardSpeechLocale), экран «не засчитано» с missingWords (fc7514d76, 9ef805ab1, d58f6357f); кол-во узлов 36 прежнее
  });
  assert.equal(
    hashProtectedRuntimeElements(),
    // зачем (03.10): эталон разошёлся раньше 85f9e7231 и был скрыт падением проверки выше; сами семь
    // защищённых элементов поэлементно одинаковы в 85f9e7231^, 94003821a и 4ee077331 (сверено скриптом).
    // зачем (05.10, Дизайн, координатор): у <NoEnergyModal> добавлен обязательный variant="learn" (выбор макета окна);
    // других изменений в защищённых элементах нет — поведение квот/попыток/озвучки не тронуто.
    // зачем (10.10): f371d6122 — у экрана итога пропсы overline/startedAtMs/mistakes (вид по cards-section); тексты «ты» (bb416e3cd).
    // зачем (владелец 11.10, режим энергии Б; 750314a24): у <SessionAttemptsHud> новый проп attempts={attempts} — шапка сама рисует энергию вместо сердечек.
    // зачем (Карточки 2.0 12.10): микрофон «Устно» — SpeakMicButton 92 (касание включает и заканчивает запись) вместо SpeakHoldButton; Learning V2 по-прежнему на SpeakHoldButton, он не тронут.
    // Те же onHoldStart/onHoldEnd, тот же гейт попыток и sessionAuthorized; остальные защищённые элементы побайтно прежние.
    // зачем (перепин 17.10, R115): после пина 12.10 в защищённых элементах — намеренная правка D194 dc5589c86: попытка голоса списывается при РЕАЛЬНОМ старте записи (useVoiceAttemptGate.commitStartedAttempt по статусу listening) и язык распознавания по карточке (recognitionLocale); остальное прежнее.
    '2cae75747f54c45571cbfc82ecafee65b47ff6a9deef70d3a761433b39da2e84',
  );
  assert.deepEqual(
    {
      hold: sha256(read('app/flashcards/SpeakHoldButton.tsx')),
      panel: sha256(read('components/SpeakingPanel.tsx')),
      slot: sha256(read('components/SpeakingInlineSlot.tsx')),
      stars: sha256(read('components/SpeakingInlineResultStars.tsx')),
      logic: sha256(read('app/flashcards/speaking_session_logic.ts')),
    },
    {
      // зачем (04.10, Ядро): 83300f8d5 §SPEECH-NA — без распознавателя речи кнопка заранее отключена (лог [SPEECH-AVAIL]);
      // при наличии распознавателя удержание/запись/попытки прежние.
      // перепин 17.10 (R115): после пина — caac6f0f1 и 514fbcac7 (15.10, D194): цифра остатка голоса на микрофоне; запись/удержание/оценка те же
      hold: '490d004ca976328de82d1c749c0b40c5bcf9194ed45950961e8b2081c64ba0e7',
      // зачем (03.10): SpeakingPanel менялся законно — PM-229 db985607f (причины в немых catch) и D139 997f56dfe
      // (шкала текста 16/13); логика записи/удержания не тронута (hold и slot — прежние).
      // зачем (04.10, §126 «строка микрофона прыгает»): в inline-карточке место под эквалайзер/спиннер держится
      // всегда (VOICE_EQUALIZER_ROW_H) — только раскладка; запись/удержание/оценка не тронуты.
      // зачем (04.10): 9ff9164b2 (§126 п.6) добавил в SpeakingPanel одну строку журнала [SPEAK-SCORE] (итог оценки виден в релизе) — только запись в журнал,
      // оценка и поведение панели не менялись; эталон panel держался на 81a487c5a и отстал на этот коммит. slot здесь не трогаю — файл в работе у «Дизайна».
      // зачем (04.10, Ядро): 9ff9164b2 и 6b9e88612 — только логи [SPEAK-SCORE]/[SPEAK-FOCUS], поведение то же.
      // зачем (10.10, Дизайн, волна 4 цветов): из статического actionBtnText убран литерал color '#fff' — во всех трёх местах цвет и так
      // задаётся токеном темы (mTheme.onAccent); логика квот/записи/удержания не тронута.
      // перепин 17.10 (R115): после пина 13.10 — намеренные правки речи 15.10: aa62db9b6 (одна попытка на удержание), 7488b8f5f (строгая проверка слов), 9ef805ab1 (панель отдаёт missingWords), 2d63aff8c (onScore: strictWordsOk и reason из одного расчёта), a1c67f60f (верх капсулы)
      panel: '642bb6fe0481bb4f9f6543aebddf562e9eee94f3d1658bae8b2aa129aa66166a' /* перепин 13.10 (координатор): c9037920f — в SpeakingPanel только комментарий light-accent-ok у accent: t.accent (светлый акцент, класс Д), код не менялся; ранее, 12.10: c35b9f8ad (Ядро, dev-state) — dev speech=hold|preparing: в обработчике отпускания ранний выход ТОЛЬКО при dev-режиме (в стор-сборке он всегда null), запись/оценка/удержание не менялись */ + '', // 15.10 вечер (41443be48): только украинские тексты «вислів/вислову» в панели, логика не менялась; // 15.10 (красные сторожи; сверено по diff e531e6408 и 63dfa4cd1): dev-подмена удержания `speech=` (только съёмка) и цвет значков/текста accent → accentText (светлая тема); логика квот/попыток/записи не менялась; // 12.10 (подготовка к английскому интерфейсу): в словари подписей панели добавлен ключ en (26 строк), логика не менялась; // 11.10: onAccent панели = t.textOnGold (accentInk), акцент как текст = accentText (светлая тема)
      // зачем (04.10, §126 срез карточки речи): на коротких экранах тренажёр прижимает карточку к верху слота
      // (speakingInlineSlotAlign) — только выравнивание; геометрия слота и логика записи не тронуты.
      // зачем (04.10): + 8 dp воздуха сверху у прижатой карточки (кадр 450×800).
      slot: '9349576ffb4cd827b9fe39a9b1164a9b1e5232df4b33894b867a5b965c4650de',
      // зачем (Ядро 1dc23e923, 12.10): звёзды учитывают passed — незасчитанный ответ не подписывается «Хорошо! Зачтено» (3 строки); запись/удержание/оценка не тронуты
      stars: '96b14e66ee10a4a581973b85171954fb9d3b2dcc860e16dbee28709d2e43abc5',
      logic: '3b4d1528d7223cb1ca37f52e0e2304b55552c86a7a3102cad6657a00cd4084ef',
    },
  );
});

test('adds an opt-in PhraseCard geometry seam while preserving default geometry and sizing', () => {
  assert.match(phraseCardSource, /export type PhraseCardPresentation = Readonly<\{/);
  assert.match(phraseCardSource, /presentation\?: PhraseCardPresentation;/);
  assert.match(phraseCardSource, /faceRadius: presentation\?\.borderRadius \?\? CARD_RADIUS/);
  assert.match(phraseCardSource, /facePadH: presentation\?\.paddingHorizontal \?\? adaptiveFacePadH/);
  assert.match(phraseCardSource, /facePadTop: presentation\?\.paddingTop \?\? adaptiveFacePadV/);
  assert.match(phraseCardSource, /facePadBottom: presentation\?\.paddingBottom \?\? adaptiveFacePadV/);
  // зачем (Тень 12.10): слои тонировки граней заменены на <PlateFill radius={faceRadius}> — литералов `borderRadius: faceRadius` стало 3
  assert.equal((phraseCardSource.match(/borderRadius: faceRadius/g) ?? []).length, 3);
  assert.match(phraseCardSource, /<PhraseCardSizer[\s\S]*paddingTop=\{facePadTop\}[\s\S]*paddingBottom=\{facePadBottom\}/);

  assert.match(sizerSource, /paddingTop\?: number;/);
  assert.match(sizerSource, /paddingBottom\?: number;/);
  assert.match(sizerSource, /const verticalPaddingStyle = paddingTop === undefined && paddingBottom === undefined/);
  assert.match(sizerSource, /\? \{ paddingVertical \}/);
  assert.match(sizerSource, /paddingTop: paddingTop \?\? paddingVertical/);
  assert.match(sizerSource, /paddingBottom: paddingBottom \?\? paddingVertical/);

  const resolvePresentation = executeExtractedFunction(
    PHRASE_CARD_PATH,
    phraseCardSource,
    'resolvePhraseCardPresentation',
    'const CARD_RADIUS = 24;',
  );
  assert.deepEqual(
    { ...resolvePresentation(undefined, 16, 14) },
    { faceRadius: 24, facePadH: 16, facePadTop: 14, facePadBottom: 14 },
  );
  assert.deepEqual(
    { ...resolvePresentation({ borderRadius: 16, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 22 }, 16, 14) },
    { faceRadius: 16, facePadH: 28, facePadTop: 24, facePadBottom: 22 },
  );
  assert.deepEqual(
    { ...resolvePresentation({ paddingBottom: 22 }, 13, 11) },
    { faceRadius: 24, facePadH: 13, facePadTop: 11, facePadBottom: 22 },
  );

  const defaultSizerRuntime = loadActualSizer();
  const defaultTree = defaultSizerRuntime.Sizer({ front: 'front', back: 'back', minHeight: 200 });
  const defaultFaces = defaultTree.props.children;
  assert.deepEqual(
    { ...defaultFaces[0].props.style },
    { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 17, paddingVertical: 15 },
  );
  assert.deepEqual({ ...defaultFaces[1].props.style }, { ...defaultFaces[0].props.style });
  defaultFaces[0].props.onLayout({ nativeEvent: { layout: { height: 123.2 } } });
  defaultFaces[1].props.onLayout({ nativeEvent: { layout: { height: 88.1 } } });
  assert.deepEqual(defaultSizerRuntime.stateWrites, [[124], [89]]);

  const partialTree = loadActualSizer().Sizer({ front: 'front', back: 'back', minHeight: 200, paddingTop: 24 });
  assert.deepEqual(
    { ...partialTree.props.children[0].props.style },
    { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 17, paddingTop: 24, paddingBottom: 15 },
  );
  const asymmetricTree = loadActualSizer().Sizer({
    front: 'front',
    back: 'back',
    minHeight: 200,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 22,
  });
  assert.deepEqual(
    { ...asymmetricTree.props.children[0].props.style },
    { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 22 },
  );
});

test('renders the approved active geometry with stable insets and normalized font preference', () => {
  const active = activeScreenSource();
  assert.match(sessionSource, /useStableSafeAreaInsets/);
  assert.match(sessionSource, /const textScale = \(FONT_SCALE\[fontSize\] \/ FONT_SCALE\.medium\) \* uiScale;/);
  assert.match(active, /paddingTop: insets\.top/);
  assert.match(active, /paddingRight: insets\.right/);
  assert.match(active, /paddingBottom: insets\.bottom/);
  assert.match(active, /paddingLeft: insets\.left/);
  assert.match(active, /<ScrollView[^>]*style=\{\{ flex: 1, minHeight: 0 \}\}/);
  assert.match(active, /contentContainerStyle=\{\{ flexGrow: 1, paddingBottom: passedNow \? 170 : 8 \}\}/);

  // зачем (Карточки 2.0 12.10, cards-v2.html «Устно»): карточка RU → EN — переворачиваемая CardFlipV2 высотой 196 (прежняя PhraseCard с геометрией 24/22 ушла из этого экрана)
  assert.match(active, /<CardFlipV2[\s\S]*flipped=\{flipped\}[\s\S]*onFlip=\{setFlipped\}/);
  assert.match(active, /height=\{SPEAKING_CARD_HEIGHT\}/);
  assert.match(active, /disabled=\{holdActive\}/);
  assert.doesNotMatch(active, /maxFontSizeMultiplier|numberOfLines|adjustsFontSizeToFit/);

  assert.match(sessionSource, /const CARD_MIN_H = 200;/);
  assert.match(sessionSource, /const SPEAKING_CARD_HEIGHT = 196;/);
  assert.match(findStyle(sessionSource, 'progressTrack', 'progressFill'), /height: 6/);
  assert.match(findStyle(sessionSource, 'progressTrack', 'progressFill'), /borderRadius: 4/);
  assert.match(findStyle(sessionSource, 'progressTrack', 'progressFill'), /marginTop: 22/);
  assert.match(findStyle(sessionSource, 'progressTrack', 'progressFill'), /marginHorizontal: 20/);
  assert.match(findStyle(sessionSource, 'progressFill', 'cardArea'), /height: 6/);
  assert.match(findStyle(sessionSource, 'progressFill', 'cardArea'), /borderRadius: 4/);
  assert.match(findStyle(sessionSource, 'cardArea', 'cardFace'), /paddingTop: 34/);
  assert.match(findStyle(sessionSource, 'cardArea', 'cardFace'), /paddingHorizontal: 20/);
  assert.match(findStyle(sessionSource, 'inlineSlot', 'resultCard'), /paddingHorizontal: 20/);
});

test('uses a passive 13-theme scored surface and only a retained runtime transcript', () => {
  const active = activeScreenSource();
  const resultCard = findStyle(sessionSource, 'resultCard', 'resultActions');
  assert.match(sessionSource, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(sessionSource, /function SpeakingResultSheen\(/);
  assert.match(sessionSource, /pointerEvents="none"/);
  assert.match(sessionSource, /colors=\{\[glass\.lightTint, 'transparent'\]\}/);
  assert.doesNotMatch(sessionSource, /BlurView/);
  assert.match(active, /backgroundColor: speakingGlass\.opaqueCard/);
  assert.doesNotMatch(active, /borderColor: speakingGlass\.glassEdge/); // зачем (Тень 12.10): карточка результата без кромки
  assert.match(active, /boxShadow: plateBoxShadow\(speakingGlass\)/);
  assert.match(active, /<SpeakingResultSheen glass=\{speakingGlass\} \/>/);
  assert.match(resultCard, /borderRadius: 16/);
  assert.match(resultCard, /paddingHorizontal: 18/);
  assert.match(resultCard, /paddingVertical: 16/);
  assert.match(resultCard, /overflow: 'hidden'/);

  assert.match(sessionSource, /function retainedSpeakingTranscript\(/);
  assert.match(sessionSource, /typeof transcript !== 'string'/);
  assert.match(sessionSource, /transcript\.trim\(\)/);
  assert.match(active, /\{spokenTranscript \? \(/);
  assert.match(active, /\{labels\.spokenTranscript\}/);
  assert.match(active, /\{spokenTranscript\}/);
  assert.match(sessionSource, /spokenTranscript: triLang\(lang, \{/);
  for (const locale of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
    const key = locale.includes('-') ? `'${locale}':` : `${locale}:`;
    const labelsStart = sessionSource.indexOf('spokenTranscript: triLang(lang, {');
    const labelsEnd = sessionSource.indexOf('}),', labelsStart);
    assert.ok(sessionSource.slice(labelsStart, labelsEnd).includes(key), `missing transcript label ${locale}`);
  }

  const retainedTranscript = executeExtractedFunction(
    SESSION_PATH,
    sessionSource,
    'retainedSpeakingTranscript',
  );
  assert.equal(retainedTranscript(null), null);
  assert.equal(retainedTranscript({ score: 0, passed: false }), null);
  assert.equal(retainedTranscript({ score: 0, passed: false, transcript: 42 }), null);
  assert.equal(retainedTranscript({ score: 0, passed: false, transcript: '   ' }), null);
  assert.equal(retainedTranscript({ score: 100, passed: true, transcript: '  exact runtime text  ' }), '  exact runtime text  ');
});

test('scoped presentation validators reject negative geometry and wiring mutations', () => {
  const validatePhraseCard = (source) => {
    assert.match(source, /facePadBottom: presentation\?\.paddingBottom \?\? adaptiveFacePadV/);
    assert.match(source, /paddingBottom=\{facePadBottom\}/);
  };
  const validateSession = (source) => {
    assert.match(source, /const CARD_MIN_H = 200;/);
    assert.match(source, /const SPEAKING_CARD_HEIGHT = 196;/);
    assert.match(findStyle(source, 'progressTrack', 'progressFill'), /height: 6/);
    assert.match(findStyle(source, 'cardArea', 'cardFace'), /paddingHorizontal: 20/);
    assert.match(source, /height=\{SPEAKING_CARD_HEIGHT\}/);
    assert.match(source, /<SpeakMicButton[\s\S]*g=\{speakingGlass\}/);
  };
  validatePhraseCard(phraseCardSource);
  validateSession(sessionSource);
  assert.throws(() => validatePhraseCard(phraseCardSource.replace('paddingBottom={facePadBottom}', 'paddingBottom={facePadTop}')));
  assert.throws(() => validatePhraseCard(phraseCardSource.replace('presentation?.paddingBottom ?? adaptiveFacePadV', 'presentation?.paddingTop ?? adaptiveFacePadV')));
  assert.throws(() => validateSession(sessionSource.replace('const CARD_MIN_H = 200;', 'const CARD_MIN_H = 260;')));
  assert.throws(() => validateSession(sessionSource.replace('const SPEAKING_CARD_HEIGHT = 196;', 'const SPEAKING_CARD_HEIGHT = 240;')));
  assert.throws(() => validateSession(sessionSource.replace('progressTrack: { height: 6', 'progressTrack: { height: 4')));
  assert.throws(() => validateSession(sessionSource.replace('paddingHorizontal: 20, paddingTop: 34', 'paddingHorizontal: 24, paddingTop: 34')));
  assert.throws(() => validateSession(sessionSource.replace('height={SPEAKING_CARD_HEIGHT}', '')));
  assert.throws(() => validateSession(sessionSource.replace(/(<SpeakMicButton\s+)g=\{speakingGlass\}/, '$1g={OTHER}')));
});

test('keeps all real controls and uses the approved title and microphone material', () => {
  const active = activeScreenSource();
  for (const marker of [
    'fc-speak-practice-runes',
    'fc-speak-progress',
    'fc-speak-pick-decks',
    'fc-speak-report',
    'fc-speak-count',
    'fc-speak-task',
    'fc-speak-retry',
    'fc-speak-next',
    'fc-speak-skip',
    'fc-speak-listen',
  ]) {
    assert.ok(sessionSource.includes(marker), `missing retained control ${marker}`);
  }
  assert.match(sessionSource, /ru: 'Устно'/);
  assert.match(sessionSource, /en: 'Speaking'/);
  assert.match(active, /<SpeakMicButton[\s\S]*g=\{speakingGlass\}/);
  assert.doesNotMatch(active, /packTheme=/);
});
