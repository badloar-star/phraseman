import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const modalPath = new URL('../components/friends_together/FriendStudyInviteModal.tsx', import.meta.url);
const friendsPath = new URL('../app/(tabs)/friends.tsx', import.meta.url);
const modal = readFileSync(modalPath, 'utf8');
const friends = readFileSync(friendsPath, 'utf8');

// зачем (переводчик 17.10): заголовок переформулирован по D188 (1bf5288b4) — без «английского», человек может учить любой язык
const TITLE_COPY = [
  'Пять минут на практику?',
  'П’ять хвилин на практику?',
  'Five minutes of practice?',
  '¿Cinco minutos de práctica?',
  'Cinco minutos de prática?',
  'Năm phút luyện tập?',
  'Lima menit latihan?',
  'Beş dakika pratik?',
  'Pięć minut praktyki?',
];

const BODY_COPY = [
  'Друг зовёт тебя заниматься сегодня.',
  'Друг кличе тебе позайматися сьогодні.',
  'A friend is inviting you to study today.',
  'Un amigo te invita a estudiar hoy.',
  'Um amigo está convidando você para estudar hoje.',
  'Một người bạn đang mời bạn học hôm nay.',
  'Seorang teman mengajakmu belajar hari ini.',
  'Bir arkadaşın seni bugün çalışmaya davet ediyor.',
  'Znajomy zaprasza cię dziś do nauki.',
];

const START_COPY = [
  'Начать занятие', 'Почати заняття', 'Start the lesson', 'Empezar lección',
  'Começar lição', 'Bắt đầu bài học', 'Mulai pelajaran', 'Derse başla', 'Zacznij lekcję',
];

const DECLINE_COPY = [
  'Не сейчас', 'Не зараз', 'Not now', 'Ahora no', 'Agora não',
  'Không phải bây giờ', 'Jangan sekarang', 'Şimdi değil', 'Nie teraz',
];

function compileModal() {
  const output = ts.transpileModule(modal, {
    fileName: 'FriendStudyInviteModal.tsx',
    reportDiagnostics: true,
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  assert.equal(
    output.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error).length ?? 0,
    0,
    'modal transpiles without syntax errors',
  );

  const react = {
    createElement(type, props, ...children) {
      return { type, props: { ...(props ?? {}), children } };
    },
  };
  const module = { exports: {} };
  const coinSources = Array.from({ length: 20 }, (_, rank) => ({ canonicalCoinRank: rank }));
  const require = (id) => {
    if (id === 'react') return { __esModule: true, default: react, memo: (component) => component };
    if (id === 'react-native') {
      return {
        Image: 'RNImage',
        StyleSheet: { absoluteFill: { position: 'absolute' }, create: (styles) => styles },
        Text: 'Text',
        View: 'View',
      };
    }
    // зачем (R129, координатор 18.10): монета героя — expo-image (декод под размер вида), журнал [MEM-COIN] только в отладке
    if (id === 'expo-image') return { Image: 'ExpoImage' };
    if (id.endsWith('/mem_coin_probe')) return { logMemCoin() {} };
    if (id.endsWith('/HybridAlertShell')) return { __esModule: true, default: 'HybridAlertShell' };
    if (id.endsWith('/DuoPressable')) return { __esModule: true, default: 'DuoPressable' };
    if (id.endsWith('/SafeLinearGradient')) return { LinearGradient: 'LinearGradient' };
    if (id.endsWith('/ThemeContext')) {
      return {
        FONT_SCALE: { small: 1, medium: 1.15, large: 1.3 },
        useTheme: () => ({ fontSize: 'medium', liquidGlassThemeId: 'graphite', uiScale: 1 }),
      };
    }
    if (id.endsWith('/LangContext')) return { useLang: () => ({ lang: 'ru' }) };
    // зачем (идея 1, 21.10): строка «Серия вдвоём · N дней» в окне приглашения — текст из pair_copy
    if (id.endsWith('/pair_copy')) return { pairInviteLine: (_lang, n) => `Серия вдвоём · ${n} дней` };
    // зачем (идея 2, 22.10): вариант окна с занятием — тексты друга; без lesson окно прежнее, факты пустые
    if (id.endsWith('/lesson_invite_friend_copy')) {
      return {
        lessonInviteFriendTitle: (_lang, name) => `${name} зовёт на занятие`,
        lessonInviteFriendBody: (_lang, l, s) => `Урок ${l} · Занятие ${s}. Пройди сегодня — до полуночи.`,
        lessonInviteFriendFacts: () => [],
      };
    }
    if (id.endsWith('/friend_social_events')) return {};
    if (id.endsWith('/i18n')) return { triLang: (lang, copy) => copy[lang] };
    if (id.endsWith('/liquidGlassThemePalette')) {
      return {
        liquidGlassTokens: () => ({
          cta: '#cta', ctaInk: '#ink', accent: '#cta', accentInk: '#ink', glassEdge: '#edge',
          opaqueSheet: '#sheet', secondary: '#secondary', selected: '#selected', text: '#text',
        }),
      };
    }
    if (id.endsWith('/coin_rank_table_v1')) {
      return {
        coinRankRowForDisplay: (rank) => ({ source: coinSources[rank] }),
        isValidCoinRank: (rank) => Number.isSafeInteger(rank) && rank >= 0 && rank <= 19,
      };
    }
    throw new Error(`Unexpected modal dependency: ${id}`);
  };

  new Function('exports', 'require', 'module', '__filename', '__dirname', output.outputText)(
    module.exports,
    require,
    module,
    'FriendStudyInviteModal.js',
    '.',
  );
  return module.exports.default;
}

function walk(node, visit) {
  if (node == null || typeof node !== 'object') return;
  visit(node);
  const children = node.props?.children ?? [];
  for (const child of Array.isArray(children) ? children : [children]) walk(child, visit);
}

test('COM-04 invite uses the approved opaque Liquid Glass geometry, typography, and localized copy', () => {
  assert.match(modal, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(modal, /FONT_SCALE\[fontSize\] \/ FONT_SCALE\.medium\) \* uiScale/);
  assert.match(modal, /backgroundColor: glass\.opaqueSheet/);
  assert.match(modal, /colors=\{\[glass\.opaqueSheet, glass\.selected, glass\.opaqueSheet\]\}/);
  // зачем (владелец 12.10, стиль «Тень»): у окна приглашения нет обводки — отделяют тон и тень оболочки.
  assert.doesNotMatch(modal, /borderColor: glass\.glassEdge/);
  assert.match(modal, /paddingTop: 24/);
  assert.match(modal, /paddingHorizontal: 20/);
  assert.match(modal, /paddingBottom: 20/);
  assert.match(modal, /borderRadius: 26/);
  assert.match(modal, /width: 68, height: 68/);
  assert.match(modal, /marginTop: 14/);
  assert.match(modal, /fontSize: 22 \* textScale/);
  assert.match(modal, /lineHeight: 28 \* textScale/);
  assert.match(modal, /fontSize: 13 \* textScale/);
  assert.match(modal, /lineHeight: 18 \* textScale/);
  assert.match(modal, /fontSize: 16 \* textScale/);
  assert.match(modal, /wrapStyle=\{styles\.primaryWrap\}/);
  assert.match(modal, /wrapStyle=\{styles\.secondaryWrap\}/);
  assert.match(modal, /primaryWrap: \{ marginTop: 20 \}/);
  assert.match(modal, /secondaryWrap: \{ marginTop: 10 \}/);
  assert.match(modal, /minHeight: 48/);
  assert.match(modal, /borderRadius: 24/);
  assert.match(modal, /backgroundColor: glass.accent/);
  assert.match(modal, /color: glass.accentInk/);
  // зачем (владелец 12.10, стиль «Тень»): «Не сейчас» без контура — отделяется тоном opaqueControl.
  assert.match(modal, /styles.secondary, { backgroundColor: glass.buttonFill }/);
  for (const copy of [...TITLE_COPY, ...BODY_COPY, ...START_COPY, ...DECLINE_COPY]) {
    assert.ok(modal.includes(copy), `missing approved locale copy: ${copy}`);
  }
  assert.doesNotMatch(modal, /AvatarView|BlurView|setInterval|numberOfLines|adjustsFontSizeToFit/);
});

test('COM-04 invite preserves callbacks and IDs while threading only a validated canonical rank', () => {
  assert.match(modal, /friendCoinRank\?: number \| null/);
  assert.match(modal, /friendCoinRank = null/);
  assert.match(modal, /onRequestClose=\{onDecline\}/);
  for (const id of ['friend-study-invite-modal', 'friend-study-start', 'friend-study-decline']) {
    assert.ok(modal.includes(`testID="${id}"`), `missing preserved test ID: ${id}`);
  }

  assert.match(friends, /useState<\{ event: FriendSocialEvent; friendName: string; friendCoinRank: number \| null \} \| null>\(null\)/);
  assert.match(
    friends,
    /setStudyInvite\(\{ event, friendName: profile\.name, friendCoinRank: isValidCoinRank\(profile\.coinRank\) \? profile\.coinRank : null \}\)/,
  );
  assert.match(friends, /friendCoinRank=\{studyInvite\?\.friendCoinRank \?\? null\}/);
  assert.match(
    friends,
    /onStart=\{\(\) => \{\s*if \(studyInvite\) acknowledgeFriendEvent\(studyInvite\.event\);\s*setStudyInvite\(null\);\s*router\.push\('\/\(tabs\)\/lessons' as never\);\s*\}\}/,
  );
  assert.match(
    friends,
    /onDecline=\{\(\) => \{\s*if \(studyInvite\) acknowledgeFriendEvent\(studyInvite\.event\);\s*setStudyInvite\(null\);\s*\}\}/,
  );
  assert.doesNotMatch(friends, /friendsTogetherUiEnabled\s*&&\s*\(\s*<FriendStudyInviteModal/);
});

test('COM-04 invite shows canonical ranks 0 and 19 but never clamps missing or invalid rank data', () => {
  const FriendStudyInviteModal = compileModal();
  for (const rank of [0, 19]) {
    const tree = FriendStudyInviteModal({
      visible: true,
      friendCoinRank: rank,
      onStart() {},
      onDecline() {},
    });
    const images = [];
    walk(tree, (node) => { if (node.type === 'ExpoImage') images.push(node); });
    assert.equal(images.length, 1, `rank ${rank} renders one canonical image`);
    assert.deepEqual(images[0].props.source, { canonicalCoinRank: rank });
  }

  for (const rank of [undefined, null, -1, 20, 1.5, '0', Number.NaN]) {
    const tree = FriendStudyInviteModal({
      visible: true,
      friendCoinRank: rank,
      onStart() {},
      onDecline() {},
    });
    const images = [];
    walk(tree, (node) => { if (node.type === 'ExpoImage') images.push(node); });
    assert.equal(images.length, 0, `invalid rank ${String(rank)} renders the neutral placeholder`);
  }
});
