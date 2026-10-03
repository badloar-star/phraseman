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
    'SpeakHoldButton',
    'NoEnergyModal',
    'CoinRewardFlight',
  ]);
  const nodes = [];
  const visit = (node) => {
    if (ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText(sessionAst);
      if (protectedNames.has(name)) {
        let printed = printNode(node);
        if (name === 'SpeakHoldButton') {
          printed = printed.replace(/accent=\{[^}]+\}/, 'accent={__PRESENTATION_ACCENT__}');
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
    count: 34,
    // зачем (30.09): D127 — «Устно» отсеивает карточки «без языка» (voicedDeckCards, 2acba6874); квоты/попытки/TTS не менялись.
    // зачем (30.09): D128 — озвучка клипом OpenAI своего языка вместо голоса устройства (7b4631e7e).
    // зачем (03.10): логика старта Ядра — 85f9e7231 (сторож загрузки +1 useEffect, трассировка [FC-SPEAKING-GATE], reconcile missing → fail-open) и 94003821a (компактный manifest, снятие записи до локального старта; ревью Opus).
    hash: 'e0eaae0641bed3007cb294586b9113acc3811d0832c5c68a8e517f7f769793b6',
  });
  assert.equal(
    hashProtectedRuntimeElements(),
    // зачем (03.10): эталон разошёлся раньше 85f9e7231 и был скрыт падением проверки выше; сами семь
    // защищённых элементов поэлементно одинаковы в 85f9e7231^, 94003821a и 4ee077331 (сверено скриптом).
    '0a3616c688d52d9643761ca3276db09ce9f0e5fc3769400f3dbd521dac929d08',
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
      hold: '92c92d8b1e7d00de8c0738f5455514ea338924ad5f75e495d6502977a5b7a9e9',
      // зачем (03.10): SpeakingPanel менялся законно — PM-229 db985607f (причины в немых catch) и D139 997f56dfe
      // (шкала текста 16/13); логика записи/удержания не тронута (hold и slot — прежние).
      panel: '45075aa9df43c1bb8f14bfc4ad84d5e0ef6f4b4e81ad437015e86dc07d2a3963',
      slot: 'ef4f0bab5e4bd50af4c9855af1e24e2084bc1b04756de016e368cbd2bd071ae7',
      stars: '38631c90662c00baf57ee9b9e129d6049854f6799bd13fe05e1c9587fc3e6d60',
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
  assert.equal((phraseCardSource.match(/borderRadius: faceRadius/g) ?? []).length, 5);
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
  assert.match(active, /contentContainerStyle=\{\{ flexGrow: 1, paddingBottom: 8 \}\}/);

  assert.match(active, /<PhraseCard[\s\S]*flipped=\{flipped\}[\s\S]*onFlip=\{setFlipped\}/);
  assert.match(active, /minHeight=\{CARD_MIN_H\}/);
  assert.match(active, /disabled=\{holdActive\}/);
  assert.match(active, /t=\{t\}/);
  assert.match(active, /presentation=\{SPEAKING_CARD_PRESENTATION\}/);
  assert.match(active, /fontSize: 30 \* textScale/);
  assert.match(active, /lineHeight: 36 \* textScale/);
  assert.doesNotMatch(active, /maxFontSizeMultiplier|numberOfLines|adjustsFontSizeToFit/);

  assert.match(sessionSource, /const CARD_MIN_H = 200;/);
  assert.match(sessionSource, /borderRadius: 16,[\s\S]*paddingHorizontal: 28,[\s\S]*paddingTop: 24,[\s\S]*paddingBottom: 22/);
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
  assert.match(active, /borderColor: speakingGlass\.glassEdge/);
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
    assert.match(source, /paddingBottom: 22/);
    assert.match(findStyle(source, 'progressTrack', 'progressFill'), /height: 6/);
    assert.match(findStyle(source, 'cardArea', 'cardFace'), /paddingHorizontal: 20/);
    assert.match(source, /presentation=\{SPEAKING_CARD_PRESENTATION\}/);
    assert.match(source, /accent=\{speakingGlass\.cta\}/);
  };
  validatePhraseCard(phraseCardSource);
  validateSession(sessionSource);
  assert.throws(() => validatePhraseCard(phraseCardSource.replace('paddingBottom={facePadBottom}', 'paddingBottom={facePadTop}')));
  assert.throws(() => validatePhraseCard(phraseCardSource.replace('presentation?.paddingBottom ?? adaptiveFacePadV', 'presentation?.paddingTop ?? adaptiveFacePadV')));
  assert.throws(() => validateSession(sessionSource.replace('const CARD_MIN_H = 200;', 'const CARD_MIN_H = 260;')));
  assert.throws(() => validateSession(sessionSource.replace('paddingBottom: 22', 'paddingBottom: 24')));
  assert.throws(() => validateSession(sessionSource.replace('progressTrack: { height: 6', 'progressTrack: { height: 4')));
  assert.throws(() => validateSession(sessionSource.replace('paddingHorizontal: 20, paddingTop: 34', 'paddingHorizontal: 24, paddingTop: 34')));
  assert.throws(() => validateSession(sessionSource.replace('presentation={SPEAKING_CARD_PRESENTATION}', '')));
  assert.throws(() => validateSession(sessionSource.replace('accent={speakingGlass.cta}', 'accent={ACCENT}')));
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
  assert.match(active, /<SpeakHoldButton[\s\S]*accent=\{speakingGlass\.cta\}/);
  assert.doesNotMatch(active, /packTheme=/);
});
