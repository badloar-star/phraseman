import fs from 'node:fs';
import path from 'node:path';

const layoutPath = path.join(process.cwd(), 'app/(tabs)/_layout.tsx');
const modelPath = path.join(process.cwd(), 'lib/today/tab_page_model.ts');

describe('Today navigation contract', () => {
  test('keeps Today as a swipe-only physical neighbor with no tab-bar entry', () => {
    const layout = fs.readFileSync(layoutPath, 'utf8');
    const model = fs.readFileSync(modelPath, 'utf8');
    expect(model).toContain("PHYSICAL_PAGE_IDS = ['today', ...LOGICAL_TAB_IDS]");
    expect(layout).toContain('<TodayPaneBoundary key="today"');
    expect(layout).not.toMatch(/\{ key: ['"]today['"],\s+icon:/);
  });

  test('returns from Today to Home through the Home tab and Android back', () => {
    const layout = fs.readFileSync(layoutPath, 'utf8');
    expect(layout).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(layout).toContain('handleTabChange(0)');
    expect(layout).toContain('if (!wasToday) setTodaySessionEpoch');
  });

  test('replaces the frozen Today subtree whenever its privacy scope changes', () => {
    const layout = fs.readFileSync(layoutPath, 'utf8');
    expect(layout).toContain('function TodayPaneBoundary');
    expect(layout).toContain('scopeSafetyKey');
    expect(layout).toContain('<TabPane key={scopeSafetyKey}');
    expect(layout).toContain('resetTodayRuntimeMemory()');
  });
});
