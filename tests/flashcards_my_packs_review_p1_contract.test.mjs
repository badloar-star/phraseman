import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const mine = readFileSync(join(root, 'app/flashcards_my_packs.tsx'), 'utf8');
const hub = readFileSync(join(root, 'app/flashcards/FlashcardsHubScreen.tsx'), 'utf8');
const sameGroup = mine.slice(mine.indexOf('function sameGroup('), mine.indexOf('export default function FlashcardsMyPacksScreen'));
const loadMine = mine.slice(mine.indexOf('const loadMine = useCallback'), mine.indexOf('useFocusEffect(', mine.indexOf('const loadMine = useCallback')));
// зачем: плитки заменены строками-карточками MyPacksV2 / KitPackRow (макет cards-section «Мои наборы»)
const renderTile = readFileSync(join(root, 'app/flashcards/MyPacksV2.tsx'), 'utf8') + readFileSync(join(root, 'components/cards-grid/CardsKit.tsx'), 'utf8');

test('My Packs refreshes changed visible metadata and freshness sort keys', () => {
  for (const field of ['titleRu', 'titleUk', 'titleEs', 'codeName', 'cardCount', 'updatedAt', 'authorName', 'packTileArtRevision']) {
    assert.ok(sameGroup.includes(field), `sameGroup ignores ${field}`);
  }
});

test('My presentation does not add another failure fallback and clears count on observable throw', () => {
  assert.doesNotMatch(loadMine, /loadAccessiblePackIds\(studyTarget\)\.catch\(\(\) => \[\]/);
  assert.doesNotMatch(loadMine, /loadLocalAuthorPacks\(studyTarget\)\.catch\(\(\) => \[\]/);
  assert.doesNotMatch(loadMine, /loadCommunityOwnedPackIds\(studyTarget\)\.catch\(\(\) => \[\]/);
  // зачем (координатор §77; правило владельца 01.10): при сбое показываем последнее известное число и тихо
  // повторяем — счётчик «Моих наборов» не стирается (my_packs_storage_status требует отсутствия clearMyPacksCount).
  assert.doesNotMatch(mine, /clearMyPacksCount/);
  // зачем (владелец 01.10): экрана ошибки и кнопки повтора нет — тихие повторы.
  assert.doesNotMatch(mine, /fc-my-packs-error|fc-my-packs-retry/);
  assert.match(mine, /\[FC-DECKS\] my packs: тихий повтор/);
});

test.todo('shared storage loaders must expose read failure separately from real empty before offline can be classified');

test('screen-reader exposes open, edit and delete as separate real actions', () => {
  assert.doesNotMatch(renderTile, /accessibilityLabel={`qa-fc-my-packs-pack-/);
  // зачем (11.10, журнал 9): строка — общий PackRow; подпись для чтения экрана — название без хвоста файла, автор/статус, число.
  // зачем (Карточки 2.0, стопка): подпись — название без хвоста файла, автор у добавленного и число карточек
  // зачем (12.10, мёртвый бейдж «На проверке» подключён к стопке): в подпись для чтения экрана добавлен статус проверки
  assert.match(renderTile, /accessibilityLabel=\{`\$\{formatPackTitleForDisplay\(title\)\}\$\{authorName \? `, \$\{authorName\}` : ''\}, \$\{pack\.cardCount\}\$\{pack\.isPendingUpdateReview \? `, \$\{reviewNote\}` : ''\}`\}/);
  assert.match(renderTile, /fc-my-packs-pack-edit-/);
  assert.match(renderTile, /fc-my-packs-pack-delete-/);
  assert.match(renderTile, /key=\{pack\.id\}/);
  assert.doesNotMatch(mine, /accessibilityLabel="qa-fc-my-packs-(back|browse-community)"/);
  // зачем: 0ee956c9e — неизвестное число не озвучивается прочерком: пока count === null, подпись без числа.
  // зачем: плитки хаба рисует CardsHubV2 (макет 2.0); неизвестное число — пустая строка, и подпись тогда без числа.
  const hubTiles = readFileSync(join(root, 'app/flashcards/CardsHubV2.tsx'), 'utf8');
  // зачем (координатор 18.10, red-tests): 799956929 добавил единицу для скринридера («Из видео. наборов: 6»); правило прежнее —
  // при неизвестном числе (count === '') озвучивается только название.
  assert.match(hubTiles, /accessibilityLabel=\{t\.count === '' \? t\.title : `\$\{t\.title\}\. \$\{t\.unit \? `\$\{t\.unit\}: ` : ''\}\$\{t\.count\}`\}/);
});
