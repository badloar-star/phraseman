import fs from 'fs';
import path from 'path';

describe('home learning CTA contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');

  // зачем 2026-08-02: владелец заменил плановую плашку на главной карточкой
  // «последний открытый урок» (форма — как ряды «Сегодня»). Вход в план остался
  // внутри раздела уроков («Уроки» → «Маршрут»), на главной плановых карточек нет.
  it('renders the continue-lesson card instead of the plan cards', () => {
    expect(source).not.toContain('<PersonalPlanHomeRouteCard');
    expect(source).not.toContain('testID="home-personal-plan-card"');
    expect(source).toContain('testID="home-continue-lesson"');
    expect(source).toContain("router.push({ pathname: '/lesson_menu', params: { id: lastLesson.id } } as any)");
  });

  // зачем: плитка быстрого старта «Уроки» открывает полный список уроков —
  // push-маршрут /lessons_list, заменивший убранный таб с книжкой.
  it('opens the full lessons list from the quick-start tile', () => {
    expect(source).toContain("onPress: () => { go('/lessons_list'); }");
    expect(source).not.toContain("'/(tabs)/lessons'");
  });

  // зачем: владелец убрал с главной плашку «Выбрать свой план обучения» —
  // она вытесняла карточку «Продолжить урок». Вход в создание плана остался
  // в других местах, на главной его быть не должно.
  it('does not advertise plan setup on home anymore', () => {
    expect(source).not.toContain('testID="home-choose-personal-plan"');
    expect(source).not.toContain('Выбрать свой план обучения');
    expect(source).not.toContain("router.push('/personal_plan_setup' as any)");
  });

  // зачем: машинерия плана (кэш снапшота + события) остаётся тёплой для
  // CompassBriefingHost и снапшота главной, хотя карточка плана больше не рендерится.
  it('keeps the personal plan snapshot machinery warm for other consumers', () => {
    expect(source).toContain("onAppEvent('personal_plan_updated', (payload)");
    expect(source).toContain('setPersonalPlanSnapshot(payload.snapshot)');
    expect(source).toContain('setPersonalPlanSnapshot((previous) => planSnapshot ?? (nextHasActivePersonalPlan ? previous : null))');
  });
});
