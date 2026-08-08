import fs from 'fs';
import path from 'path';

const layoutPath = path.resolve(__dirname, '../app/(tabs)/_layout.tsx');
const source = fs.readFileSync(layoutPath, 'utf8');

function tabPaneSource(): string {
  const start = source.indexOf('function TabPane(');
  const end = source.indexOf('\nfunction todayClockScopeKey', start);
  if (start < 0 || end < 0) throw new Error('TabPane source boundary not found');
  return source.slice(start, end);
}

describe('tab freeze ownership handoff contract', () => {
  it('commits ownership loss unfrozen before a passive effect arms freezing', () => {
    const pane = tabPaneSource();

    expect(pane).toContain('const [freezeCommitted, setFreezeCommitted] = useState(false);');
    expect(pane).toContain('const freezeActive = ENABLE_TAB_FREEZE && freezeWanted && freezeCommitted;');
    expect(pane).toMatch(
      /useEffect\(\(\) => \{\s*setFreezeCommitted\(freezeWanted\);\s*\}, \[freezeWanted\]\);/,
    );
    expect(pane).toContain('<Freeze freeze={freezeActive}>{children}</Freeze>');
    expect(pane).not.toContain('useLayoutEffect');
  });

  it('unfreezes immediately and preserves the existing freeze-distance policy', () => {
    const pane = tabPaneSource();

    // Even if the previous passive state is still armed, freezeWanted=false wins
    // synchronously in the render that makes the pane active/adjacent.
    expect(pane).toContain('freezeWanted && freezeCommitted');
    expect(source).toContain('const TAB_FREEZE_MIN_DISTANCE = 2;');
    expect(pane).not.toMatch(/setTimeout|requestAnimationFrame|key=/);
  });

  it('keeps provider ownership above the frozen pane tree', () => {
    const provider = source.indexOf('<TabProvider');
    const scaffold = source.indexOf('<TabScaffold', provider);
    const providerClose = source.indexOf('</TabProvider>', scaffold);

    expect(provider).toBeGreaterThanOrEqual(0);
    expect(scaffold).toBeGreaterThan(provider);
    expect(providerClose).toBeGreaterThan(scaffold);
    expect(source).toContain('runtimeOwnerId={runtimeOwnerId}');
  });
});
