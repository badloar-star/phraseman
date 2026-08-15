import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const ADMIN = fs.readFileSync(path.join(ROOT, 'admin', 'v2', 'legacy.html'), 'utf8');
const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'cosmetic_asset_archive.ts'), 'utf8');
const RULES = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
const JARVIS_GUARD = fs.readFileSync(
  path.join(ROOT, 'functions', 'src', 'jarvis', 'jarvis_data_contract_guard.test.ts'),
  'utf8',
);

describe('admin cosmetic asset archive contract', () => {
  it('exists only on the live admin surface with all planned categories', () => {
    expect(ADMIN).toContain("switchTab('asset-archive')");
    expect(ADMIN).toContain('Архив ассетов');
    expect(ADMIN).toContain('data-caa-category="aura"');
    expect(ADMIN).toContain('data-caa-category="avatar"');
    expect(ADMIN).toContain('data-caa-category="achievement"');
    expect(ADMIN).toContain('data-caa-category="other"');
  });

  it('explains owner retention and uses the guarded server callables', () => {
    expect(ADMIN).toContain('У прежних владельцев предмет останется');
    expect(ADMIN).toContain("httpsCallable(functionsUs, 'adminGetCosmeticAssetArchive')");
    expect(ADMIN).toContain("httpsCallable(functionsUs, 'adminSetCosmeticAssetSaleStatus')");
    expect(FUNCTIONS).toContain('cosmeticAssetCatalogGet');
    expect(FUNCTIONS).toContain('adminSetCosmeticAssetSaleStatus');
    expect(FUNCTIONS).toContain("item.delivery !== 'purchase' && item.delivery !== 'legacy'");
    expect(ADMIN).toContain('item.saleManaged === true');
    expect(ADMIN).toContain('Управляется подпиской');
  });

  it('closes the new collection to clients and registers its Jarvis contract', () => {
    expect(RULES).toMatch(/match \/cosmetic_asset_archive_overrides\/\{document=\*\*\} \{\s*allow read, write: if false;/);
    expect(JARVIS_GUARD).toContain("collection: 'cosmetic_asset_archive_overrides'");
  });
});
