import fs from 'fs';
import path from 'path';

const root = process.cwd();

describe('account deletion modal layout contract', () => {
  const modalSource = fs.readFileSync(
    path.join(root, 'components', 'DeleteAccountConfirmModal.tsx'),
    'utf8',
  );
  const shellSource = fs.readFileSync(
    path.join(root, 'components', 'modal_fx', 'HybridAlertShell.tsx'),
    'utf8',
  );

  it('expands the hybrid dialog and gives its long body a real scroll viewport', () => {
    // A maxHeight on the shell alone is not enough: without an opt-in flex chain,
    // the ScrollView measures at full content height and an outer overflow:hidden
    // clips the input and destructive action instead of making them reachable.
    expect(shellSource).toContain('fillAvailableHeight?: boolean;');
    expect(shellSource).toContain('fillAvailableHeight = false');
    expect(modalSource).toContain('fillAvailableHeight');
    expect(modalSource).toContain('styles.hybridPanelViewport');
    expect(modalSource).toContain('styles.hybridScrollViewport');
    expect(modalSource).toMatch(/hybridPanelViewport:\s*\{\s*flex:\s*1,/);
    expect(modalSource).toMatch(/hybridScrollViewport:\s*\{\s*flex:\s*1,/);
  });
});
