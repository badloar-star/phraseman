import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const source = readFileSync(join(root, 'app/flashcards_my_packs.tsx'), 'utf8');

test('My Packs retains real Added then Created data, create, edit and delete actions', () => {
  assert.ok(source.indexOf("renderSection('added'") < source.indexOf("renderSection('created'"));
  for (const token of ['openPack(pack)', 'openPackEditor(pack)', 'setDeletePackTarget(pack)', "pathname: '/community_pack_create'", 'onPress={() => { void deletePack(); }}']) {
    assert.ok(source.includes(token), `missing live action: ${token}`);
  }
});

test('My Packs uses exact live liquid tokens, glass materials and approved typography', () => {
  assert.ok(source.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(source.includes('colors={[g.bgTop, g.bg, g.bgBottom]}'));
  assert.ok(source.includes('<MyPacksGlass'));
  assert.ok(source.includes("'dimezisBlurView'"));
  assert.ok(source.includes('fontSize: 34, lineHeight: 40'));
  assert.ok(source.includes('fontSize: 16, lineHeight: 22'));
  assert.ok(source.includes('height: 46'));
});

test('My Packs has honest pending/error/search/true-empty states and image flags', () => {
  for (const token of ["useState<'loading' | 'ready' | 'stale' | 'error'>", "loadStatus === 'loading'", "loadStatus !== 'ready'", 'visiblePackCount === 0', 'packCount === 0', 'language_en.webp', 'language_fr_dev.webp', 'language_es_dev.webp']) {
    assert.ok(source.includes(token), `missing live state or asset: ${token}`);
  }
  assert.ok(!source.includes('flagGlyph'), 'pack tiles use approved flag images, not emoji glyphs');
  assert.ok(!source.includes('numberOfLines={2}'), 'long user-authored pack titles remain readable');
});

test('My Packs keeps live picker and deletion confirmation in theme glass', () => {
  const picker = readFileSync(join(root, 'app/flashcards/PackLanguagePicker.tsx'), 'utf8');
  assert.match(source, /<PackLanguagePicker[^>]*liquidGlass/);
  assert.match(picker, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(source, /fc-delete-pack-confirm-modal/);
  assert.match(source, /deletePackBusy/);
  assert.doesNotMatch(source, /<ThemedConfirmModal/);
});
