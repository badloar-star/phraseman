import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('Chains preview pack contract gate', () => {
  it('locks the premium metaphor preview formula, titles, and descriptions into docs and tooling', () => {
    const rules = fs.readFileSync(path.join(root, 'docs', 'chains_preview_pack_rules.md'), 'utf8');
    const script = fs.readFileSync(path.join(root, 'scripts', 'chains_preview_pack_contract_check.mjs'), 'utf8');
    const packager = fs.readFileSync(path.join(root, 'scripts', 'package_chains_codex_dalle_preview_pack.mjs'), 'utf8');
    const rejectedLocalGenerator = fs.readFileSync(path.join(root, 'scripts', 'build_chains_preview_fresh_styles.mjs'), 'utf8');
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

    expect(rules).toContain('premium_metaphor_v1');
    expect(rules).toContain('C:\\Users\\badlo\\OneDrive\\Desktop\\preview examples');
    expect(rules).toContain('C:\\Users\\badlo\\OneDrive\\Desktop\\банк превью');
    expect(rules).toContain('One associative metaphor object');
    expect(rules).toContain('Generic "school cards everywhere"');
    expect(rules).toContain('Do not overwrite these instructions');
    expect(rules).toContain('ДУМАЕШЬ НА РУССКОМ?');
    expect(rules).toContain('КЛЮЧ К АНГЛИЙСКОМУ');
    expect(rules).toContain('ФРАЗЫ ЛИПНУТ');
    expect(rules).toContain('<thumbnail>.description.txt');
    expect(rules).toContain('ALL_VIDEO_DESCRIPTIONS.txt');
    expect(rules).toContain('Every title must make it immediately clear');
    expect(rules).toContain('Use `вы`, `ваш`, `вам` naturally');
    expect(rules).toContain('App Store, Google Play, and site links');
    expect(rules).toContain('25 фраз');

    expect(script).toContain('REQUIRED_DESIGN_FORMULA');
    expect(script).toContain('wrong_design_formula');
    expect(script).toContain('wrong_reference_source_dir');
    expect(script).toContain('wrong_preview_bank_dir');
    expect(script).toContain('new_style_pack_must_use_codex_dalle');
    expect(script).toContain('local_rendered_thumbnail_pack_not_allowed_for_new_styles');
    expect(script).toContain('title_missing_english_language_signal');
    expect(script).toContain('missing_description_sidecar');
    expect(script).toContain('description_missing_phraseman_links');
    expect(script).toContain('description_missing_method_explanation');
    expect(script).toContain('MOJIBAKE_RE');

    expect(packager).toContain("design_formula: 'premium_metaphor_v1'");
    expect(packager).toContain('PREVIEW_BANK_DIR');
    expect(packager).toContain('REFERENCE_SOURCE_DIR');
    expect(packager).toContain('buildDescription');
    expect(packager).toContain('ALL_VIDEO_DESCRIPTIONS.txt');
    expect(packager).toContain('descriptionFile');
    expect(packager).toContain('App Store: https://apps.apple.com/app/id6764800879');
    expect(packager).toContain('Google Play: https://play.google.com/store/apps/details?id=app.phraseman');
    expect(packager).toContain('Сайт: https://knowlyapps.com/');

    expect(rejectedLocalGenerator).toContain('Rejected generator');
    expect(rejectedLocalGenerator).toContain('premium_metaphor_v1');
    expect(rejectedLocalGenerator).toContain('Do not use local SVG/PIL/canvas rendering');

    expect(packageJson.scripts['chains:preview-contract']).toBe('node ./scripts/chains_preview_pack_contract_check.mjs');
    expect(packageJson.scripts['chains:preview-fresh']).toBe('node ./scripts/package_chains_codex_dalle_preview_pack.mjs');
  });
});
