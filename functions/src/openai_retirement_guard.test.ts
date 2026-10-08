import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { ALLOWED_JOB_MODELS } from './openai_jobs_config';
import { ALLOWED_DIALOG_MODELS } from './openai_dialog_model_config';

const root = path.resolve(__dirname, '../..');
const retired = /^(?:gpt-4\.1-nano(?:-2025-04-14)?|gpt-image-1|gpt-3\.5-turbo(?:-0125)?|gpt-4(?:-0613|-1106-preview|-turbo(?:-2024-04-09)?)?|gpt-4o-2024-05-13|o1(?:-2024-12-17|-pro(?:-2025-03-19)?)?|o3-mini(?:-2025-01-31)?|o4-mini(?:-2025-04-16)?)$/;

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(file);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [file] : [];
  });
}

test('no retired model can be selected in the active job/dialog registries', () => {
  for (const model of [...ALLOWED_JOB_MODELS, ...ALLOWED_DIALOG_MODELS]) expect(retired.test(model)).toBe(false);
});

test('server request/default declarations cannot reintroduce October retired models', () => {
  const violations: string[] = [];
  for (const file of files(path.join(root, 'functions/src'))) {
    if (file.endsWith('openai_model_policy.ts')) continue; // intentional read-time legacy migration
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      const value = ts.isPropertyAssignment(node) ? node.initializer : ts.isVariableDeclaration(node) ? node.initializer : undefined;
      const name = ts.isPropertyAssignment(node) || ts.isVariableDeclaration(node) ? node.name.getText(source) : '';
      if (/model/i.test(name) && value && ts.isStringLiteral(value) && retired.test(value.text)) violations.push(path.relative(root, file) + ':' + name);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect(violations).toEqual([]);
});

test('live admin selectors and image generators cannot restore a retired model', () => {
  const html = fs.readFileSync(path.join(root, 'admin/v2/legacy.html'), 'utf8');
  expect(html).not.toMatch(/<option[^>]*value=["']gpt-4\.1-nano/);
  for (const file of [
    'scripts/generate-clean-onboarding-dalle-assets.mjs',
    'scripts/gustav_generate_fr_collectible_dalle_images.mjs',
    'scripts/generate-level-spin-theme-reward.mjs',
    'tools/generate_youtube_pack_dalle.py',
  ]) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    expect(source).not.toMatch(/["']gpt-image-1["']/);
    expect(source).toContain('gpt-image-2.5-flare');
  }
});
