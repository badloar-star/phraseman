import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

describe('avatar 100 prompts', () => {
  it('builds ten unique, resolved pilot prompts with anti-copy constraints', () => {
    const root = path.resolve(__dirname, '..');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-100-prompts-'));
    const manifestPath = path.join(tempDir, 'manifest.json');
    const promptsDir = path.join(tempDir, 'prompts');

    execFileSync(
      process.execPath,
      ['scripts/avatar-100/build-manifest.mjs', '--out', manifestPath],
      { cwd: root },
    );
    execFileSync(
      process.execPath,
      [
        'scripts/avatar-100/build-prompts.mjs',
        '--manifest', manifestPath,
        '--out-dir', promptsDir,
        '--pilot',
      ],
      { cwd: root },
    );

    const files = fs.readdirSync(promptsDir).sort();
    expect(files).toEqual([
      'custom-idea-100-master.txt',
      'custom-idea-108-master.txt',
      'custom-idea-120-master.txt',
      'custom-idea-129-master.txt',
      'custom-idea-137-master.txt',
      'custom-idea-147-master.txt',
      'custom-idea-157-master.txt',
      'custom-idea-63-master.txt',
      'custom-idea-74-master.txt',
      'custom-idea-87-master.txt',
    ]);

    const prompts = files.map((file) => fs.readFileSync(path.join(promptsDir, file), 'utf8'));
    for (const prompt of prompts) {
      expect(prompt).toContain('Use case: stylized-concept');
      expect(prompt).toContain('512 x 512');
      expect(prompt).toContain('genuinely transparent background');
      expect(prompt).toContain('quality reference only');
      expect(prompt).toContain(
        'Do not copy any reference subject, silhouette, composition, pedestal, or ornament',
      );
      expect(prompt).toContain(
        'no text, letters, numbers, logo, watermark, frame, badge, pedestal, or background',
      );
      expect(prompt).toContain('No human or humanoid');
      expect(prompt).toContain('no human face, body, hands, clothing, portrait pose, or android');
      expect(prompt).not.toContain('Subject class: person');
      expect(prompt).not.toContain('custom-idea-01');
      expect(prompt).not.toContain('${');
    }
    expect(new Set(prompts).size).toBe(10);
  });
});
