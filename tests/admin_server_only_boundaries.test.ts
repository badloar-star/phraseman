import fs from 'node:fs';
import path from 'node:path';

const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');

describe('admin server-only boundaries', () => {
  it('does not grant broad admin writes through the recursive catch-all', () => {
    const catchAllStart = rules.indexOf('match /{document=**}');
    expect(catchAllStart).toBeGreaterThanOrEqual(0);
    const catchAll = rules.slice(catchAllStart, rules.indexOf('\n    }', catchAllStart));
    expect(catchAll).not.toMatch(/allow\s+(read,\s*)?write:\s*if\s+isAdmin\(\)/);
  });

});
