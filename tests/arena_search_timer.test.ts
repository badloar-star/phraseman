// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

describe('таймер поиска соперника', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '..', 'app/arena_matchmaking.tsx'),
    'utf8',
  );

  it('показывает прошедшее время и обновляет его раз в секунду только на видимом экране', () => {
    expect(source).toContain('useVisibleWallClock(active, 1_000)');
    expect(source).toContain('const elapsedLabel = useMemo(() =>');
    expect(source).toContain("padStart(2, '0')");
    expect(source).toContain('testID="arena-search-elapsed"');
    expect(source).toContain('{elapsedLabel}</Text>');
    expect(source).toContain("fontVariant: ['tabular-nums']");
  });
});
