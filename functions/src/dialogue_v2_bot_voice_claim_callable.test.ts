import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

function sourceFilesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(entryPath);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe('Dialogue V2 prepared bot voice claim boundary', () => {
  const repositoryRoot = path.join(__dirname, '../..');
  const indexPath = path.join(__dirname, 'index.ts');
  const retiredCallablePath = path.join(__dirname, 'dialogue_v2_bot_voice_claim_callable.ts');

  it('does not deploy a client-callable voice-slot reservation endpoint', () => {
    const indexSource = readFileSync(indexPath, 'utf8');

    expect(indexSource).not.toContain('dialogueV2BotVoiceClaim');
    expect(indexSource).not.toContain('dialogue_v2_bot_voice_claim_callable');
    expect(existsSync(retiredCallablePath)).toBe(false);
  });

  it('keeps live client code unable to invoke or import the retired claim endpoint', () => {
    const liveClientFiles = [
      ...sourceFilesUnder(path.join(repositoryRoot, 'app')),
      ...sourceFilesUnder(path.join(repositoryRoot, 'components')),
      ...sourceFilesUnder(path.join(repositoryRoot, 'hooks')),
      ...sourceFilesUnder(path.join(repositoryRoot, 'lib')),
      ...sourceFilesUnder(path.join(repositoryRoot, 'shared')),
    ];
    const offenders = liveClientFiles.filter((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return source.includes('dialogueV2BotVoiceClaim')
        || source.includes('dialogue_v2_bot_voice_claim_callable');
    });

    expect(offenders).toEqual([]);
  });

  it('retains only a Firebase-free server-authoritative daily transition primitive', () => {
    const primitiveSource = readFileSync(
      path.join(__dirname, 'dialogue_v2_bot_voice_daily_claim.ts'),
      'utf8',
    );

    expect(primitiveSource).toContain('transitionDialogueV2BotVoiceDailyClaim');
    expect(primitiveSource).toContain('trustedAccountState');
    expect(primitiveSource).not.toMatch(/firebase|onCall|HttpsError|preparedResponseId|personaId|scenarioId/i);
  });
});
