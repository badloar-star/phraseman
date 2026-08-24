import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import sharp from 'sharp';

describe('avatar 100 preview', () => {
  it('renders both variants on all ten gradients with a 20 px inspection row', async () => {
    const root = path.resolve(__dirname, '..');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-100-preview-'));
    const inputDir = path.join(dir, 'pairs');
    const outputDir = path.join(dir, 'previews');
    const reportPath = path.join(dir, 'preview.json');
    fs.mkdirSync(inputDir);
    const black = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><circle cx="256" cy="256" r="128" fill="#30343b"/></svg>',
    );
    const white = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><circle cx="256" cy="256" r="128" fill="#ece7dc"/></svg>',
    );
    await sharp(black).png().toFile(path.join(inputDir, 'custom-idea-63-black.png'));
    await sharp(white).png().toFile(path.join(inputDir, 'custom-idea-63-white.png'));

    execFileSync(process.execPath, [
      'scripts/avatar-100/build-preview.mjs',
      '--input-dir', inputDir,
      '--index', '63',
      '--out-dir', outputDir,
      '--json', reportPath,
    ], { cwd: root });

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(report.gradients).toHaveLength(10);
    expect(report.variants).toEqual(['black', 'white']);
    expect(report.smallSize).toBe(20);
    expect(fs.existsSync(report.contactSheet)).toBe(true);
    const meta = await sharp(report.contactSheet).metadata();
    expect(meta.width).toBeGreaterThan(1600);
    expect(meta.height).toBeGreaterThan(300);
  });
});
