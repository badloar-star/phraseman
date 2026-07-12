import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('Admin v2 fallback embedding security', () => {
  test('keeps the standalone legacy admin unavailable to frames', () => {
    const config = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8')) as {
      hosting: Array<{
        target?: string;
        headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
      }>;
    };
    const adminHosting = config.hosting.find((entry) => entry.target === 'admin');
    const globalHeaders = adminHosting?.headers?.find((entry) => entry.source === '**')?.headers ?? [];
    const header = (key: string): string => globalHeaders.find((entry) => entry.key.toLowerCase() === key.toLowerCase())?.value ?? '';

    expect(header('X-Frame-Options')).toBe('DENY');
    expect(header('Content-Security-Policy')).toContain("frame-ancestors 'none'");
  });
});
