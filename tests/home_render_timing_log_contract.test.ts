import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeEol } from './helpers/read_source';

// зачем (координатор 05.10, пакеты 05:26/06:26): окно первого кадра Главной делится строкой [HOME-RENDER] на
// «модуль вычислен → первый рендер → фиксация». Сторож держит: строка одна за запуск (флаг), метка рендера ставится
// только на первом рендере (одна проверка числа), лог — в useLayoutEffect с пустыми зависимостями, без setState.
const home = normalizeEol(readFileSync(join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8'));

describe('[HOME-RENDER] first render timing log', () => {
  it('marks module evaluation once at module level', () => {
    expect(home).toMatch(/^const homeModuleEvaluatedAt = Date\.now\(\);$/m);
  });

  it('stamps the first render start with a single numeric check in the component body', () => {
    expect(home).toContain('if (homeFirstRenderStartedAt === 0) homeFirstRenderStartedAt = Date.now();');
    expect(home.match(/homeFirstRenderStartedAt = Date\.now\(\)/g)).toHaveLength(1);
  });

  it('logs once per launch from a layout effect with empty deps', () => {
    expect(home).toContain('useLayoutEffect(() => { logHomeFirstRenderTiming(); }, []);');
    expect(home).toMatch(/function logHomeFirstRenderTiming\(\): void \{\n\s+if \(homeFirstRenderLogged\) return;\n\s+homeFirstRenderLogged = true;/);
    const body = home.slice(home.indexOf('function logHomeFirstRenderTiming'), home.indexOf('export default function HomeScreen'));
    expect(body).toContain("console.warn('[HOME-RENDER] first'");
    expect(body).not.toMatch(/\bset[A-Z]\w*\(/);
  });
});
