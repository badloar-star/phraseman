import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function callableOptions(source: string, exportName: string): string {
  const start = source.indexOf(`export const ${exportName} = onCall({`);
  const end = source.indexOf('}, async (request)', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('critical AI callable idle-cost controls', () => {
  it.each([
    ['functions/src/mistake_explain.ts', 'explainMistake'],
    ['functions/src/explain_phrase.ts', 'explainPhrase'],
    ['functions/src/premium_dialog.ts', 'premiumDialogSend'],
  ])('%s scales to zero while idle for %s', (file, exportName) => {
    expect(callableOptions(read(file), exportName)).toContain('minInstances: 0');
  });
});
