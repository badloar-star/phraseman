import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Jest source write guard', () => {
  it('blocks tests from writing into application source files', () => {
    const probePath = path.join(ROOT, 'app', '__jest_write_guard_probe__.ts');
    let blocked = false;

    try {
      fs.writeFileSync(probePath, 'export const probe = true;\n', 'utf8');
    } catch (error) {
      blocked = error instanceof Error && error.message.includes('Jest source write guard blocked');
    } finally {
      if (fs.existsSync(probePath)) {
        fs.unlinkSync(probePath);
      }
    }

    expect(blocked).toBe(true);
    expect(fs.existsSync(probePath)).toBe(false);
  });

  it('still allows temporary fixture files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-jest-write-guard-'));
    const fixturePath = path.join(tempDir, 'fixture.txt');

    try {
      fs.writeFileSync(fixturePath, 'fixture\n', 'utf8');

      expect(fs.readFileSync(fixturePath, 'utf8')).toBe('fixture\n');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('blocks inherited Node child processes from writing into source files', () => {
    const probePath = path.join(ROOT, 'app', '__jest_child_write_guard_probe__.ts');
    const script = `
      const fs = require('fs');
      try {
        fs.writeFileSync(${JSON.stringify(probePath)}, 'export const probe = true;\\n', 'utf8');
        fs.unlinkSync(${JSON.stringify(probePath)});
        process.exit(0);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(19);
      }
    `;

    expect(process.env.NODE_OPTIONS ?? '').toContain('setup_jest_write_guard.js');

    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: ROOT,
      encoding: 'utf8',
    });

    expect(result.status).toBe(19);
    expect(`${result.stderr}\n${result.stdout}`).toContain('Jest source write guard blocked');
    expect(fs.existsSync(probePath)).toBe(false);
  });
});
