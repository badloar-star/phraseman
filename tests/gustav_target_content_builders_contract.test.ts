import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Gustav target content builders contract', () => {
  it('requires Gustav to build full target-language surfaces instead of translation-only rows', () => {
    const contract = fs.readFileSync(path.join(ROOT, 'docs', 'gustav', 'GUSTAV_TARGET_CONTENT_BUILDERS_CONTRACT.md'), 'utf8');
    const brain = fs.readFileSync(path.join(ROOT, 'docs', 'gustav', 'GUSTAV_BRAIN.md'), 'utf8');
    const architecture = fs.readFileSync(path.join(ROOT, 'docs', 'gustav', 'GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md'), 'utf8');

    expect(brain).toContain('GUSTAV_TARGET_CONTENT_BUILDERS_CONTRACT.md');
    expect(architecture).toContain('GUSTAV_TARGET_CONTENT_BUILDERS_CONTRACT.md');
    expect(contract).toContain('lesson_theory_builder');
    expect(contract).toContain('personal_practice_builder');
    expect(contract).toContain('ai_prompt_pack_builder');
    expect(contract).toContain('server_manifest_builder');
    expect(contract).toContain('English app atlas as the product-shape reference');
    expect(contract).toContain("antiCalqueDecision: 'not_needed' | 'adapted' | 'rejected_direct_translation'");
    expect(contract).toContain('activationApproved: false');
    expect(contract).toContain('Missing builders are production blockers');
  });
});
