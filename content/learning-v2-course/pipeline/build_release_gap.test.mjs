import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));

test('gap at the beginning survives the real source to mockup build', () => {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, 'learning-v2-gap-'));
  try {
    fs.mkdirSync(path.join(root, 'pipeline'));
    for (const name of ['build_release.mjs', 'single_phrase_release.mjs', 'build_mockup.mjs', 'write_mockup_file.mjs', 'session_readiness.mjs', 'session_header.mjs', 'owner_quality.mjs', 'progression_quality_gate.mjs', 'practice_explanations_v1.mjs', 'audit_actor_clarity.mjs', 'prejudge_choreography.mjs', 'sync_mockup_readiness.mjs', 'sync_mockup_source_release_findings.mjs', 'sync_mockup_source_quality_findings.mjs', 'candidate_preview_status.mjs']) {
      fs.copyFileSync(path.join(here, name), path.join(root, 'pipeline', name));
    }
    fs.writeFileSync(path.join(root, 'pipeline/factory_intro_practice_gate.mjs'), "export function auditFactoryIntroPractice(){return {schemaVersion:'test_fixture_only',verdict:'PASS',inventoryCount:186,auditedSessionCount:186,findingCount:0,perSession:[],findings:[]};}\n");
    const visibleTextModule = path.resolve(here, '../../../modules/learning-v2/content/learner_visible_text_v1.js');
    const fixtureVisibleTextModule = path.join(root, 'modules/learning-v2/content/learner_visible_text_v1.js');
    fs.mkdirSync(path.dirname(fixtureVisibleTextModule), { recursive: true });
    fs.copyFileSync(visibleTextModule, fixtureVisibleTextModule);
    const source = path.join(root, 'sessions/en/l02/s08');
    fs.mkdirSync(source, { recursive: true });
    const finalPath = path.join(source, 'final.ru.md');
    fs.copyFileSync(path.join(here, '../sessions/en/l02/s08/final.ru.md'), finalPath);
    fs.writeFileSync(
      finalPath,
      fs.readFileSync(finalPath, 'utf8')
        .replace('- ✅ **Are you awake?**', '- ✅ **Are you awake now?**')
        .replace('- ✅ **Yes, I am.**', '- ✅ **Yes, I am hungry today.**')
        .replace('- ✅ **No, I am not.**', '- ✅ **No, I am not thirsty now.**')
        .replace(/\n\*\*1 ·[\s\S]*?(?=\n\*\*2 ·)/u, '')
        .replace(/\n\*\*6 ·[\s\S]*$/u, '\n\n## Для сборщика\n\nmodes: 2=context_gap_grammar, 3=listen_choose, 4=phrase_builder, 5=context_gap_grammar\n')
        .replace('Варианты: `Are` · `You` · `Am`', 'Варианты: `Are` · `You` · `Am`\n- Are — *Верно.*')
        .replace('Цель: `awake`\nВарианты:', 'Цель: `awake`\n🔊 *awake*\nВарианты:')
        .replace('Варианты: `awake` · `away` · `alone`', 'Варианты: `awake` · `away` · `alone`\n- awake — *Верно.*')
        .replace('Варианты: `thirsty` · `lost` · `awake`', 'Варианты: `thirsty` · `lost` · `awake`\n- thirsty — *Верно.*'),
      'utf8',
    );
    const out = path.join(root, 'private-release');
    const build = spawnSync(process.execPath, [path.join(root, 'pipeline/build_release.mjs'), '--session', 'en/l02/s08', '--locales', 'ru', '--out', out, '--migration-composite-source'], { encoding: 'utf8' });
    assert.equal(build.status, 0, build.stderr || build.stdout);
    fs.cpSync(out, path.join(root, 'release'), { recursive: true });
    const child = JSON.parse(fs.readFileSync(path.join(root, 'release/en/l02/s08/learner.json'), 'utf8'));
    const gap = child.interactions.find(i => i.interactionId.endsWith(':i02'));
    assert.equal(gap.modePayload.gappedTargetPhrase, '___ you awake?');
    assert.equal(child.interactions.find(i => i.interactionId.endsWith(':i05')).modePayload.gappedTargetPhrase, 'Are you ___ ?');
    const preview = spawnSync(process.execPath, [path.join(root, 'pipeline/build_mockup.mjs')], { encoding: 'utf8' });
    assert.equal(preview.status, 0, preview.stderr || preview.stdout);
    const html = fs.readFileSync(path.join(root, 'mockup/index.html'), 'utf8');
    const data = JSON.parse(/<script id="data"[^>]*>([\s\S]*?)<\/script>/.exec(html)[1]);
    assert.equal(data[0].learner.interactions.find(i => i.interactionId.endsWith(':i02')).modePayload.gappedTargetPhrase, '___ you awake?');
  } finally {
    assert.equal(path.dirname(root), parent);
    assert.ok(path.basename(root).startsWith('learning-v2-gap-'));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
