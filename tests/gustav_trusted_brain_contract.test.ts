import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const BRAIN_PATH = path.join(ROOT, 'docs', 'gustav', 'GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md');
const SOURCE_PATH = path.join(ROOT, 'docs', 'gustav', 'trusted_sources', 'fr_trusted_sources.json');
const OPERATOR_PATH = path.join(ROOT, 'docs', 'gustav', 'OPERATOR.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav trusted brain contract', () => {
  it('requires high/deep reasoning and trusted sources before French content can leave HOLD', () => {
    const brain = fs.readFileSync(BRAIN_PATH, 'utf8');
    const sources = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
    const operator = fs.readFileSync(OPERATOR_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(brain).toContain('Gustav work requires `reasoningLevel=high` by default.');
    expect(brain).toContain('Use `reasoningLevel=deep`');
    expect(brain).toContain('Research-First Rule');
    expect(brain).toContain('Copy/Do-Not-Copy Rule');
    expect(brain).toContain('Feature Parity Matrix has no `BLOCK` or `HOLD` rows');

    expect(sources.schemaVersion).toBe('gustav-trusted-source-library-v1');
    expect(sources.studyTarget).toBe('fr');
    expect(sources.reasoningLevelRequired).toBe('high');
    expect(sources.sources.length).toBeGreaterThanOrEqual(10);

    const sourceIds = new Set(sources.sources.map((source: any) => source.id));
    for (const required of [
      'coe_cefr_companion_2020',
      'tv5monde_grammar',
      'alliance_francaise_paris_courses',
      'le_robert_dictionary',
      'le_robert_conjugation',
      'phraseman_english_feature_atlas',
      'phraseman_admin_parity_atlas',
    ]) {
      expect(sourceIds.has(required)).toBe(true);
    }

    expect(operator).toContain('GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md');
    expect(operator).toContain('trusted_sources/fr_trusted_sources.json');
    expect(operator).toContain('scripts/gustav_validate_trusted_brain.mjs');
    expect(state.languages.fr.reasoningLevelRequired).toBe('high');
    expect(state.languages.fr.trustedBrain).toBe('docs/gustav/GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md');
  });
});
