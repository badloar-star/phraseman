// зачем (владелец 01.10): в разделе «Карточки» нет экранов загрузки/ошибки и кнопок «Повторить» —
// контент рисуется сразу (кэш → снимок), сеть обновляет фоном и повторяется молча.
// Однократные тосты после тапа («Не удалось открыть набор») остаются и здесь не проверяются.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const strip = (path) => normalizeEol(readFileSync(new URL(path, import.meta.url), 'utf8')).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');

const BANNED = [
  'Не удалось загрузить карточки',
  'Повторить загрузку',
  'Загружаем лучшие наборы',
  'Наборы сообщества пока недоступны',
  'Не удалось загрузить наборы',
  'Загружаем наборы',
  'Текст карточки не загрузился',
  'Наборы не загрузились',
  'Не удалось загрузить карточки. Проверь интернет',
  'Проверьте связь и попробуйте снова.',
];

const FILES = [
  '../app/flashcards/SavedCollectionStates.tsx',
  '../app/flashcards/SavedTopCommunityPacks.tsx',
  '../app/flashcards_my_packs.tsx',
  '../app/flashcards_recall_session.tsx',
  '../app/flashcards_swipe.tsx',
  '../app/flashcards_training_setup.tsx',
  '../app/flashcards_video_packs.tsx',
];

test('flashcards screens carry no loading or load-error copy', () => {
  for (const file of FILES) {
    const source = strip(file);
    for (const text of BANNED) {
      assert.ok(!source.includes(text), `${file} still contains: ${text}`);
    }
  }
});

test('flashcards screens render no error test ids or manual retry buttons', () => {
  const ids = [
    ['../app/flashcards/SavedCollectionStates.tsx', /fc-saved-error/],
    ['../app/flashcards/SavedTopCommunityPacks.tsx', /saved-top-community-retry|saved-top-community-empty-cover|ActivityIndicator\s+color/],
    ['../app/flashcards_my_packs.tsx', /fc-my-packs-retry|fc-my-packs-error/],
    ['../app/flashcards_recall_session.tsx', /fc-recall-load-error/],
    ['../app/flashcards_training_setup.tsx', /fc-training-setup-retry/],
    ['../app/flashcards_video_packs.tsx', /copy\.errorTitle|copy\.errorBody|copy\.retry/],
  ];
  for (const [file, re] of ids) assert.doesNotMatch(strip(file), re, file);
});

test('silent retries are wired and log their reasons', () => {
  assert.match(strip('../app/flashcards/SavedCollectionStates.tsx'), /\[FC-SAVED\] тихий повтор/);
  assert.match(strip('../app/flashcards/SavedTopCommunityPacks.tsx'), /\[FC-DECKS\] top community: тихий повтор/);
  assert.match(strip('../app/flashcards_my_packs.tsx'), /\[FC-DECKS\] my packs: тихий повтор/);
  assert.match(strip('../app/flashcards_recall_session.tsx'), /\[FC-RECALL\] тихий повтор/);
  assert.match(strip('../app/flashcards_swipe.tsx'), /\[FC-SWIPE\] тихий повтор наборов/);
  assert.match(strip('../app/flashcards_training_setup.tsx'), /\[FC-TRAIN-SETUP\] тихий повтор/);
});
