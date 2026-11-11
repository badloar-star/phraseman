import fs from 'fs';
import path from 'path';

describe('home learning CTA contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');

  it('renders one direct lesson action instead of the old progress and plan cards', () => {
    expect(source).not.toContain('<PersonalPlanHomeRouteCard');
    expect(source).not.toContain('<HomeV2ContinueCard');
    expect(source).toContain('<HomeScene');
    expect(source).toContain("nav.push({ pathname: '/lesson1', params: { id: String(lastLesson.id), from: 'home' } } as never)");
  });

  // зачем: плитка быстрого старта «Уроки» открывает полный список уроков —
  // push-маршрут /lessons_list, заменивший убранный таб с книжкой.
  it('opens the full lessons list from the quick-start tile', () => {
    // Решение владельца 02.11: плитка открывает только классический Курс;
    // тихий запрос страницы V2 удалён, retained-вкладка остаётся быстрым путём.
    expect(source).toContain('onPress: openLessonsFromHome');
    // перепин 29.10 (координатор): обработчик принимает источник — плитка и «Начать урок 1» идут одним путём
    expect(source).toContain("const openLessonsFromHome = () => openLessonsTabFromHome('home_tile');");
    const handlerBody = source.slice(source.indexOf('const openLessonsTabFromHome = ('), source.indexOf('const quickItems = ['));
    expect(handlerBody.length).toBeGreaterThan(200);
    expect(handlerBody).toContain('goToTab(1);');
    expect(handlerBody).not.toContain('requestLessonsV2Page');
    expect(source).not.toContain("import { requestLessonsV2Page } from '../lessons_open_v2_request';");
    expect(handlerBody).not.toContain("go('/learning-v2/course')");
    // скрытая вкладка (fr/de/it): не молчим — тост и журнал, а не немой goToTab на Главную
    expect(source).toMatch(/!learnTabVisible[\s\S]{0,900}action_toast/);
    // повторные тапы не плодят тосты: хост ActionToast отбрасывает такой же тост (на экране / в очереди / охлаждение), а тап даёт отклик
    const toastHost = fs.readFileSync(path.join(process.cwd(), 'components', 'ActionToast.tsx'), 'utf8');
    expect(toastHost).toContain('showingKeyRef.current === k');
    expect(toastHost).toContain('queueRef.current.some((p) => toastKey(p) === k)');
    expect(toastHost).toContain('SAME_TOAST_COOLDOWN_MS');
    expect(source).toMatch(/action_toast[\s\S]{0,1200}void hapticTap\(\);[\s\S]{0,40}return;/);
    // пульс подсказки не держит InteractionManager (иначе отложенные переходы ждут ~7,5 с)
    expect(source.match(/isInteraction: false/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain("go(isLearningV2Hidden() ? '/lessons_list'");
  });

  it('omits the continue action when there is no saved lesson', () => {
    const scene = fs.readFileSync(path.join(process.cwd(), 'components', 'home', 'v2', 'scene', 'HomeScene.tsx'), 'utf8');
    expect(scene).toContain("const canContinueLesson = p.place.ctaTarget === 'legacy' && p.place.lessonNo != null;");
    expect(scene).toContain('cta: canContinueLesson ? triLang');
    expect(source).not.toContain('openHomeContinuePlace');
  });

  // зачем: владелец убрал с главной плашку «Выбрать свой план обучения» —
  // она вытесняла карточку «Продолжить урок». Вход в создание плана остался
  // в других местах, на главной его быть не должно.
  it('does not advertise plan setup on home anymore', () => {
    expect(source).not.toContain('testID="home-choose-personal-plan"');
    expect(source).not.toContain('Выбрать свой план обучения');
    expect(source).not.toContain("router.push('/personal_plan_setup' as any)");
  });

  // Компас не входит в релиз, а карточка плана на Home уже снята. Поэтому Home
  // не держит отдельный plan snapshot/event listener; сам Personal Plan пока
  // остаётся доступен в разделе обучения до полной замены Learning V2.
  it('does not keep a retired personal-plan snapshot pipeline on home', () => {
    expect(source).not.toContain("onAppEvent('personal_plan_updated', (payload)");
    expect(source).not.toContain('setPersonalPlanSnapshot(payload.snapshot)');
    expect(source).not.toContain('personalPlanSnapshot: planSnapshot');
  });

  // 04.10 (решение владельца): «Продолжить обучение» = последний открытый урок; ошибки — только строкой «Сегодня» (D144).
  // Автозахват ошибками и переворот долгим нажатием удалены.
  it('continue card always shows the last lesson: no mistakes takeover, no long-press swap', () => {
    expect(source).not.toContain('priorityCardShowsMistakes');
    expect(source).not.toContain('handleHomeLearningPriorityCardLongPress');
    expect(source).not.toContain('homePriorityCardFace');
    // зачем (Ревизор P23, 15.10): «последний урок» = старый урок ИЛИ занятие курса V2 — что свежее (home_continue_mark); ошибки по-прежнему не захватывают карточку
    // 15.10 поправка координатора: карточка V2 видна, когда прочитан её прогресс (до этого — та же заглушка загрузки)
    expect(source).toContain('[HOME-CONTINUE] card');
    expect(source).not.toContain('<Reanimated.View style={homePriorityCardScaleStyle}>');
    expect(source).not.toContain('testID="home-mistakes-pulse-button"');
    expect(source).not.toContain('testID="home-videos-pulse-button"');
    expect(source).not.toContain('showMistakesCard');
    expect(source).not.toContain('homeLearningPriorityOverride');
    expect(source).not.toContain('canToggleHomeLearningPriority');
    expect(source).not.toContain('MistakePracticeSetupSheet');
  });
});
