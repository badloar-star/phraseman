import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan home route card layout', () => {
  const source = fs.readFileSync(path.join(ROOT, 'components', 'PersonalPlanHomeRouteCard.tsx'), 'utf8');
  const homeSource = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

  it('keeps the route title readable instead of forcing a one-line ellipsis', () => {
    const titleStart = source.indexOf('<Text style={[styles.title,');
    const titleEnd = source.indexOf('</Text>', source.indexOf('styles.titleDay'));
    const titleBlock = source.slice(titleStart, titleEnd);

    expect(titleStart).toBeGreaterThanOrEqual(0);
    // Название плана и день — на разных строках, день выделен отдельным акцентным <Text>.
    expect(titleBlock).toContain('{snapshot.planName}');
    expect(titleBlock).toContain("{'\\n'}");
    // зачем: день локализован через triLang (i18n-аудит) — проверяем сам
    // ключ словаря, а не дословный русский текст.
    expect(titleBlock).toContain('ru: `день ${snapshot.dayIndex}`');
    expect(titleBlock).toContain('styles.titleDay');
    expect(titleBlock).toContain('color: actionAccent');
    expect(titleBlock).not.toContain('numberOfLines={1}');
    expect(titleBlock).not.toContain('ellipsizeMode');
  });

  it('hides the "Мой план" kicker in the default state', () => {
    // В обычном состоянии верхняя надпись пустая (kicker: ''), но «План на сегодня готов»
    // и «Продолжить план» остаются (локализованы через triLang — i18n-аудит).
    expect(source).toContain("kicker: ''");
    expect(source).toContain("ru: 'План на сегодня готов'");
    expect(source).toContain("ru: 'Продолжить план'");
    expect(source).not.toContain("kicker: 'Мой план'");
    // Пустой kicker не рендерит лишнюю строку.
    expect(source).toContain('copy.kicker ? (');
  });

  it('renders from the active plan snapshot instead of preview constants', () => {
    expect(source).toContain('snapshot: PersonalPlanHomeSnapshot');
    expect(source).toContain('pct={snapshot.progressPct}');
    expect(source).toContain("router.push('/personal_plan' as any)");
    expect(source).toContain("router.push('/personal_plan_dev' as any)");
    expect(source).not.toContain('ACTIVE_PLAN_PREVIEW');
    expect(source).not.toContain('progressPct = 3');
    expect(homeSource).not.toContain('const hasActivePersonalPlan: boolean = true');
  });

  it('keeps the route card compact and free of the trailing arrow button', () => {
    expect(source).toContain('minHeight: 132');
    expect(source).toContain('size={62}');
    expect(source).not.toContain('styles.chevron');
    expect(source).not.toContain('chevron-forward');
  });

  it('does not place generated route task art inside the compact home card', () => {
    expect(source).not.toContain('getPersonalPlanTaskVisualAsset');
    expect(source).not.toContain('styles.heroImageBackdrop');
    expect(source).not.toContain('styles.heroImage');
    expect(source).not.toContain('contentFit="contain"');
    expect(source).not.toContain('contentFit="cover"');
  });
});
