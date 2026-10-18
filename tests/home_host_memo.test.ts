import fs from 'node:fs';
import path from 'node:path';

// зачем (R137, координатор 18.10; журнал Сверки back_after4): рендер Главной №1 на 79–150 мс возврата приходил от родителя (parent_or_unlisted) — группа вкладок перерисовывалась (pathname ещё /today_tasks),
// а HomeScreenHost не был мемоизирован и тянул Главную за собой (≈120 мс с коммитом). memo режет эту перерисовку; шаги журнала возврата показывают, кто сменился в группе (tabs_cause) и дошла ли перерисовка до Главной (home_host_render).
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('хост Главной не перерисовывается вместе с группой вкладок', () => {
  const layout = read('app/(tabs)/_layout.tsx');

  it('HomeScreenHost обёрнут в React.memo, openDevHub стабилен (useCallback без зависимостей)', () => {
    expect(layout).toContain('const HomeScreenHost = React.memo(function HomeScreenHost({ onOpenDevHub }: { onOpenDevHub: () => void }) {');
    expect(layout).toContain('const openDevHub = useCallback(() => setDevHubVisible(true), []);');
    expect(layout).toContain('<HomeScreenHost onOpenDevHub={openDevHub} />');
  });

  it('журнал возврата: шаг home_host_render в хосте и tabs_cause в группе вкладок (dev, без флага TAP_LATENCY_TRACE)', () => {
    expect(layout).toContain("noteBackStep('home_host_render');");
    expect(layout).toContain("noteBackStep('tabs_cause'");
    expect(layout).toContain('if (!TAP_LATENCY_TRACE_ENABLED) { noteTabsCause(values, inst); return; }');
    expect(layout).toMatch(/function noteTabsCause[\s\S]{0,120}if \(!DIAG_ENABLED\) return;/);
  });
});
