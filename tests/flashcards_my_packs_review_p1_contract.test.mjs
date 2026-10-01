import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const mine = readFileSync(join(root, 'app/flashcards_my_packs.tsx'), 'utf8');
const hub = readFileSync(join(root, 'app/flashcards/FlashcardsHubScreen.tsx'), 'utf8');
const sameGroup = mine.slice(mine.indexOf('function sameGroup('), mine.indexOf('export default function FlashcardsMyPacksScreen'));
const loadMine = mine.slice(mine.indexOf('const loadMine = useCallback'), mine.indexOf('useFocusEffect(', mine.indexOf('const loadMine = useCallback')));
const renderTile = mine.slice(mine.indexOf('const renderTile = useCallback'), mine.indexOf('const renderSection = useCallback'));

test('My Packs refreshes changed visible metadata and freshness sort keys', () => {
  for (const field of ['titleRu', 'titleUk', 'titleEs', 'codeName', 'cardCount', 'updatedAt', 'authorName', 'packTileArtRevision']) {
    assert.ok(sameGroup.includes(field), `sameGroup ignores ${field}`);
  }
});

test('My presentation does not add another failure fallback and clears count on observable throw', () => {
  assert.doesNotMatch(loadMine, /loadAccessiblePackIds\(studyTarget\)\.catch\(\(\) => \[\]/);
  assert.doesNotMatch(loadMine, /loadLocalAuthorPacks\(studyTarget\)\.catch\(\(\) => \[\]/);
  assert.doesNotMatch(loadMine, /loadCommunityOwnedPackIds\(studyTarget\)\.catch\(\(\) => \[\]/);
  assert.match(mine, /clearMyPacksCount\(studyTarget/);
  // зачем (владелец 01.10): экрана ошибки и кнопки повтора нет — тихие повторы.
  assert.doesNotMatch(mine, /fc-my-packs-error|fc-my-packs-retry/);
  assert.match(mine, /\[FC-DECKS\] my packs: тихий повтор/);
});

test.todo('shared storage loaders must expose read failure separately from real empty before offline can be classified');

test('screen-reader exposes open, edit and delete as separate real actions', () => {
  assert.doesNotMatch(renderTile, /accessibilityLabel={`qa-fc-my-packs-pack-/);
  assert.match(renderTile, /accessibilityLabel={`\$\{label\}/);
  assert.match(renderTile, /fc-my-packs-pack-edit-/);
  assert.match(renderTile, /fc-my-packs-pack-delete-/);
  assert.match(renderTile, /<View\s+key=\{pack\.id\}/);
  assert.doesNotMatch(mine, /accessibilityLabel="qa-fc-my-packs-(back|browse-community)"/);
  assert.match(hub, /accessibilityLabel={`\$\{title\}.*count/s);
});
