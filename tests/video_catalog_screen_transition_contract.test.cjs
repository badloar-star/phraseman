const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

require('tsx/cjs');

const screenPath = path.join(process.cwd(), 'app', 'flashcards_video_packs.tsx');
const originalModuleLoad = Module._load;

Module._load = function loadVideoScreenWithNativeStubs(request, parent, isMain) {
  if (parent?.filename === screenPath) {
    if (request === 'react-native') {
      return {
        FlatList: function FlatList() {},
        Platform: { OS: 'android' },
        Pressable: function Pressable() {},
        StatusBar: function StatusBar() {},
        StyleSheet: { absoluteFill: {}, create: (value) => value },
        Text: function Text() {},
        TextInput: function TextInput() {},
        View: function View() {},
      };
    }
    return {};
  }
  return originalModuleLoad.call(this, request, parent, isMain);
};

delete require.cache[require.resolve(screenPath)];
const screen = require(screenPath);

test.after(() => {
  Module._load = originalModuleLoad;
});

test('a target transition immediately hides the previous target rows and enters loading', () => {
  assert.equal(typeof screen.transitionVideoCatalogState, 'function');
  if (typeof screen.transitionVideoCatalogState !== 'function') return;

  const english = {
    targetKey: 'en',
    packs: [{ id: 'english-pack' }],
    loadState: 'ready',
  };

  assert.deepEqual(screen.transitionVideoCatalogState(english, 'fr', 'target'), {
    targetKey: 'fr',
    packs: [],
    loadState: 'loading',
  });
});

test('a failed new-target load becomes an error without restoring previous-target rows', () => {
  assert.equal(typeof screen.transitionVideoCatalogState, 'function');
  if (typeof screen.transitionVideoCatalogState !== 'function') return;

  const english = {
    targetKey: 'en',
    packs: [{ id: 'english-pack' }],
    loadState: 'ready',
  };

  assert.deepEqual(screen.transitionVideoCatalogState(english, 'fr', 'error'), {
    targetKey: 'fr',
    packs: [],
    loadState: 'error',
  });
});

test('a same-target refresh failure preserves already usable rows', () => {
  assert.equal(typeof screen.transitionVideoCatalogState, 'function');
  if (typeof screen.transitionVideoCatalogState !== 'function') return;

  const english = {
    targetKey: 'en',
    packs: [{ id: 'english-pack' }],
    loadState: 'ready',
  };

  assert.deepEqual(screen.transitionVideoCatalogState(english, 'en', 'error'), english);
});

test('retry forceRemote is consumed once and is discarded across a target race', () => {
  assert.equal(typeof screen.consumeVideoCatalogRetryTarget, 'function');
  if (typeof screen.consumeVideoCatalogRetryTarget !== 'function') return;

  assert.deepEqual(screen.consumeVideoCatalogRetryTarget('en', 'en'), {
    forceRemote: true,
    pendingTargetKey: null,
  });
  assert.deepEqual(screen.consumeVideoCatalogRetryTarget(null, 'en'), {
    forceRemote: false,
    pendingTargetKey: null,
  });
  assert.deepEqual(screen.consumeVideoCatalogRetryTarget('en', 'fr'), {
    forceRemote: false,
    pendingTargetKey: null,
  });
});
