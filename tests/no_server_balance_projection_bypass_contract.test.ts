import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function productionTypeScriptFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return productionTypeScriptFiles(absolute);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [absolute] : [];
  });
}

it('keeps server-balance projection compatibility helpers out of production call sites', () => {
  const forbidden = [
    'addShardsLocalOnlyForPendingServerClaim',
    'keepShardsBalanceLocalAtLeast',
  ];
  const offenders = productionTypeScriptFiles(path.join(ROOT, 'app'))
    .filter((file) => file !== path.join(ROOT, 'app', 'shards_system.ts'))
    .flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return forbidden
        .filter((symbol) => source.includes(symbol))
        .map((symbol) => `${path.relative(ROOT, file)}: ${symbol}`);
    });

  expect(offenders).toEqual([]);
});
