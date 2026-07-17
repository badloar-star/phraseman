import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('post-onboarding age blockers contract', () => {
  it('keeps feature age gates non-blocking inside the app', () => {
    expect(read('app/feature_gates.ts')).toContain('return false;');
    expect(read('components/DialogsTabContent.tsx')).not.toContain('isFeatureBlockedForAge');
    expect(read('app/age_gate.ts')).toContain('return true;');
    expect(read('app/age_gate.ts')).toContain('return false;');
  });

  it('does not reject AI dialog calls with age_restricted on the server', () => {
    const serverFiles = [
      'functions/src/premium_dialog.ts',
      'functions/src/premium_dialog_review.ts',
    ];

    for (const file of serverFiles) {
      const source = read(file);
      expect(source).not.toContain("throw new HttpsError('permission-denied', 'age_restricted')");
      expect(source).not.toContain('reason: \'age_restricted\'');
    }
  });

  it('does not send age brackets from post-onboarding feature callables', () => {
    const dialogClient = read('app/ai_dialog_client.ts');

    expect(dialogClient).not.toContain('getAgeBracketSnapshot');
    expect(dialogClient).not.toContain('reqWithAge');
    expect(dialogClient).not.toContain('ageBracket?: string');
  });
});
