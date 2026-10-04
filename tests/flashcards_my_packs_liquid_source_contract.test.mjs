import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const source = readFileSync(join(root, 'app/flashcards_my_packs.tsx'), 'utf8');
// зачем: разметка списка — MyPacksV2 + общие части CardsKit (макет cards-section «Мои наборы»)
const view = readFileSync(join(root, 'app/flashcards/MyPacksV2.tsx'), 'utf8');
const kit = readFileSync(join(root, 'components/cards-grid/CardsKit.tsx'), 'utf8');

test('My Packs retains real Created then Added data, create, edit and delete actions', () => {
  // макет: «Созданные» идут раньше «Добавленных»
  assert.ok(view.indexOf('copy.created} count={created.length}') < view.indexOf('copy.added} count={added.length}'));
  for (const token of ['onOpen={(pack) => { void openPack(pack); }}', 'onEdit={openPackEditor}', 'onDelete={setDeletePackTarget}', "pathname: '/community_pack_create'", 'onPress={() => { void deletePack(); }}']) {
    assert.ok((source + view).includes(token), `missing live action: ${token}`);
  }
});

test('My Packs uses exact live liquid tokens, glass materials and approved typography', () => {
  assert.ok(source.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(source.includes('colors={[g.bgTop, g.bg, g.bgBottom]}'));
  assert.ok(source.includes('<MyPacksGlass'));
  assert.ok(source.includes("'dimezisBlurView'"));
  // размеры из макета: заголовок 40/46, подпись 16/22, поиск 46
  assert.ok(kit.includes('fontSize: 40, lineHeight: 46'));
  assert.ok(kit.includes('fontSize: 16, lineHeight: 22'));
  assert.ok(view.includes('height: 46'));
});

test('My Packs has honest pending/error/search/true-empty states', () => {
  for (const token of ["useState<'loading' | 'ready' | 'stale' | 'error'>", "loadStatus !== 'ready'", 'packCount > 0', "'empty'"]) {
    assert.ok(source.includes(token), `missing live state: ${token}`);
  }
  assert.ok(view.includes("status === 'loading'") && view.includes("status === 'unavailable'") && view.includes("status === 'empty'"));
  assert.ok(!source.includes('flagGlyph'), 'pack rows use no emoji glyphs');
  assert.ok(!view.includes('numberOfLines'), 'long user-authored pack titles remain readable');
});

test('My Packs keeps live picker and deletion confirmation in theme glass', () => {
  const picker = readFileSync(join(root, 'app/flashcards/PackLanguagePicker.tsx'), 'utf8');
  assert.match(view, /<PackLanguagePicker/);
  assert.match(picker, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(source, /fc-delete-pack-confirm-modal/);
  assert.match(source, /deletePackBusy/);
  assert.doesNotMatch(source, /<ThemedConfirmModal/);
});
