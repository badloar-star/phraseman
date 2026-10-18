import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const screen = readFileSync(join(root, 'app/flashcards_video_packs.tsx'), 'utf8');
const row = readFileSync(join(root, 'app/flashcards/VideoPackRow.tsx'), 'utf8');

test('Video packs preserves real catalog, staging, sort, language and social actions', () => {
  for (const token of ['loadVideoPhraseSetPacks({ forceRemote })', 'isVideoPhraseSetPackId(pack.id)', 'filterVideoPacks(catalog)', 'applyCommunityPacksFilter(packs, query, sort, packLanguage)', 'stageCommunityPackCardsWithSilentRetry(pack.id, studyTarget, pack', "preview: '1', from: 'video'", 'CommunityPackSocialBar', 'getTrustedLingmanYoutubeUrl']) {
    assert.ok((screen + row).includes(token), `missing live behavior: ${token}`);
  }
});

test('Video list and row use current translucent theme material with native diffusion', () => {
  for (const source of [screen, row]) {
    assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
    // зачем: строка набора — плоская (макет video-packs-from-video-mockup.html), блюр только у экрана; кромка — у обоих.
    // зачем (владелец 18.10 — ореол текста от BlurView без blurTarget): блюр у экрана только на iOS, на Android живой блюр выключен.
    if (source === screen) assert.match(source, /Platform\.OS !== 'android' \? \(\s*<BlurView/);
    if (source === screen) assert.doesNotMatch(source, /dimezisBlurView/);
    // зачем (макет cards-section «Из видео»): строка — KitCard (кромка внутренними тенями), экран — токены 2.0
    if (source === screen) assert.match(source, /useLv2Glass/);
    else assert.match(source, /KitCard/);
  }
  assert.match(screen, /colors=\{\[g\.bgTop, g\.bg, g\.bgBottom\]\}/);
});

// зачем (владелец 01.10): «Из видео» никогда не пустой и без экранов ошибок — места строк + тихий повтор;
// «Ничего не нашли» остаётся только для поиска.
test('Video shows rows or row placeholders with silent retry, never an error or empty card', () => {
  assert.doesNotMatch(screen, /fc-video-packs-retry/);
  // зачем (владелец, журнал п.85(2)): прежнее правило 01.10 «никогда не пустой» уточнено — «Пока пусто» (copy.emptyTitle) показывается ТОЛЬКО когда ответ получен и наборов из видео ноль
  // (ветка empty из video_packs_catalog_branch); экрана ошибки по-прежнему нет, «Сейчас недоступно» — только после исчерпания тихих повторов настоящего сбоя.
  assert.doesNotMatch(screen, /copy.errorTitle/);
  assert.match(screen, /branch === 'empty'/);
  assert.match(screen, /title=\{copy\.emptyTitle\}/);
  assert.match(screen, /silentRetryRef/);
  assert.match(screen, /fc-video-packs-title/);
  for (const token of ["'loading' | 'ready' | 'error'", 'fc-video-packs-clear-search', 'THUMB_W = 112', 'THUMB_H = 63']) {
    assert.ok((screen + row).includes(token), `missing state: ${token}`);
  }
  // зачем (координатор 12.10): название строки — ClampedText (до 2 строк с многоточием, шрифт не ужимается), см. tests/pack_row_shared_contract.test.ts
  assert.match(row, /<ClampedText/);
  assert.doesNotMatch(row, /numberOfLines=/);
});

test('Video retry visibly reloads and bypasses the warm catalog cache once', () => {
  assert.match(screen, /consumeVideoCatalogRetryTarget\(retryTargetKeyRef\.current, targetKey\)/);
  // зачем (владелец 01.10): источник «Из видео» — готовые наборы фраз роликов (video_phrase_sets).
  assert.match(screen, /loadVideoPhraseSetPacks\(\{ forceRemote \}\)/);
  assert.match(screen, /retryTargetKeyRef\.current = targetKey;/);
  assert.match(screen, /transitionVideoCatalogState\(current, targetKey, 'loading'\)/);
  assert.doesNotMatch(screen, /forceRemote: reloadTick > 0/);
});

test('Video row exposes separate accessible video, pack and social controls', () => {
  // зачем (владелец 11.10, video-redesign #c1): строка бывает карточкой раздела «Карточки» (styles.row) и голой строкой вкладки «Наборы» (styles.rowPlain).
  assert.match(row, /<RowShell plain=\{plain\}/);
  assert.match(row, /baseStyles\.row[^P]/);
  assert.match(row, /baseStyles\.rowPlain/);
  // зачем (владелец 11.10, «при нажатии на сам блок должен открываться набор фраз»): во вкладке «Наборы» вся строка и обложка открывают страницу набора, «+» — быстрое добавление.
  assert.match(row, /testID=\{`video-pack-open-row-\$\{pack\.id\}`\}/);
  assert.match(row, /if \(plain\) \{ onOpen\(pack\); return; \}/);
  assert.match(row, /video-pack-open-/);
  assert.match(row, /video-pack-play-/);
  assert.match(row, /accessibilityLabel=\{`\$\{title\}/);
});
