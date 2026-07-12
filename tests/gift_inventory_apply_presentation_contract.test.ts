import fs from 'fs';
import path from 'path';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('gift inventory apply presentation', () => {
  it('requests direct apply presentation for stored single and dual gifts', () => {
    const source = readSource('app/level_gifts_inventory.tsx');
    expect(source.match(/presentationMode="apply"/g)).toHaveLength(2);
  });

  it('keeps single gift initialization edge-triggered and skips the chest in apply mode', () => {
    const source = readSource('components/LevelGiftModal.tsx');
    expect(source).toContain("presentationMode?: 'open' | 'apply'");
    expect(source).toContain("if (!justOpened) return;");
    expect(source).toContain("presentationMode === 'apply'");
    expect(source).toContain("handleTap(true)");
    expect(source).not.toContain('directApplyBusy');
    expect(source).toContain("presentationMode === 'apply'\n                    ? triLang(lang, { ru: 'Готово'");
    expect(source).toContain("if (presentationMode === 'apply') {\n      onClose(true);\n      return;\n    }");
  });

  it('shows both stored dual rewards without reopening either chest', () => {
    const source = readSource('components/LevelGiftDualModal.tsx');
    expect(source).toContain("presentationMode?: 'open' | 'apply'");
    expect(source).toContain("presentationMode === 'apply' ? new Set<BoxKey>(['f2p', 'prem']) : new Set<BoxKey>()");
    expect(source).toContain('if (directApplyStartedRef.current) return;');
    expect(source).toContain("if (presentationMode === 'apply') {");
    expect(source).toContain('onClose(true);');
    expect(source).toContain("const applyModeCanClose = presentationMode === 'apply';");
    expect(source).toContain("disabled={presentationMode === 'apply' ? false : claimNowBusy}");
  });

  it('documents optimistic UI as a mandatory project invariant', () => {
    const agents = readSource('AGENTS.md');
    const bible = readSource('docs/OPTIMISTIC_UI_AND_OFFLINE_MUTATIONS.md');
    expect(agents).toContain('### Optimistic UI and offline mutations');
    expect(agents).toContain('docs/OPTIMISTIC_UI_AND_OFFLINE_MUTATIONS.md');
    expect(bible).toContain('No user-visible waiting for ordinary local-first actions');
  });
});
