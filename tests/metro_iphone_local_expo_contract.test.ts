import fs from 'fs';
import path from 'path';

describe('iPhone Metro launcher', () => {
  const scriptPath = path.join(process.cwd(), 'scripts', 'metro-iphone-lan.ps1');
  const script = fs.readFileSync(scriptPath, 'utf8');

  it('starts the project-local Expo CLI without falling back to an npx cache copy', () => {
    expect(script).toContain("$localExpoCli = Join-Path $ProjectRoot 'node_modules\\expo\\bin\\cli'");
    expect(script).toContain('if (-not (Test-Path -LiteralPath $localExpoCli))');
    expect(script).toContain('& node $localExpoCli @expoArgs');
    expect(script).not.toContain('& npx @expoArgs');
  });
});
