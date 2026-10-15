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
    // зачем (01.10, удаление Главной V1): карточка «Продолжить» теперь HomeV2ContinueCard (testID внутри компонента).
    expect(source).toContain('<HomeV2ContinueCard');
    // зачем (координатор 12.10, аудит Optimistic UI): переход идёт через nav.push (useGuardedNav) — повторный тап в окне 600 мс не открывает меню урока дважды
    expect(source).toContain("nav.push({ pathname: '/lesson_menu', params: { id: String(lastLesson.id) } } as never)");
    expect(source).toMatch(/perfNavStart\(screenName\);[\s\S]{0,260}nav\.push\(path as any\);/);
  });

  // зачем (координатор §46, 2026-10-01): дизайн 2.0 — один утверждённый арт
  // «блокнот» для всех тем (тема тонирует стекло вокруг, предмет не меняется),
  // карточка — HomeV2ContinueCard. Намерение прежнее: подготовленный арт, а не
  // общий menuImages.lesson, и арт есть у КАЖДОЙ темы.
  it('uses the approved continue-card art for every theme', () => {
    const cardStart = source.indexOf('<HomeV2ContinueCard');
    const cardEnd = source.indexOf(') : null}', cardStart);
    const cardSource = source.slice(cardStart, cardEnd);
    const assetPath = path.join(process.cwd(), 'app', 'home_last_lesson_assets.ts');

    expect(cardStart).toBeGreaterThan(-1);
    expect(source).toContain("import { getHomeLastLessonImage } from '../home_last_lesson_assets';");
    expect(source).toContain('const lastLessonImage = getHomeLastLessonImage(themeMode);');
    // 04.10 (владелец: «ТУТ ПОСЛЕДНИЙ УРОК, А НЕ ОШИБКИ»): у карточки только арт урока — новый предмет 2.0 из реестра,
    // прежняя картинка запасная; арта «Мои ошибки» на карточке больше нет.
    // 15.10: слой .accent — из того же resolve (priorityCardArt), основа та же.
    expect(source).toContain("const priorityCardArt = resolveThemedArt(lastLessonCompleted ? 'today' : 'continue', homeArtTone);");
    expect(source).toContain('const priorityCardImage = priorityCardArt.base ?? lastLessonImage;');
    expect(source).not.toContain("resolveThemedArt('mistakes_entry'");
    expect(cardSource).toContain('art={priorityCardImage}');
    expect(cardSource).not.toContain('menuImages.lesson');

    const assetSource = fs.readFileSync(assetPath, 'utf8');
    const artMatch = assetSource.match(/const HOME_LAST_LESSON_ART = require\("\.\.\/(assets\/images\/home_last_lesson\/[^"]+)"\);/);
    expect(artMatch).not.toBeNull();
    const artPath = path.join(process.cwd(), artMatch![1]!);
    expect(fs.existsSync(artPath)).toBe(true);
    for (const theme of ['dark', 'gold', 'olive', 'midnight', 'ember', 'aurora', 'volt', 'indigo', 'sagePorcelain']) {
      expect(assetSource).toMatch(new RegExp(`\\b${theme}: HOME_LAST_LESSON_ART,`));
    }
    // Бюджет веса сохранён НАМЕРЕННО: арт грузится на первом кадре Главной.
    // 2026-10-01 блокнот — PNG 1 236 838 байт (прежний бюджет всех тем 150 000).
    // Падение здесь — реальный долг скорости (пережать в webp), а не устаревший тест.
    expect(fs.statSync(artPath).size).toBeLessThanOrEqual(150_000);
  });

  // зачем: плитка быстрого старта «Уроки» открывает полный список уроков —
  // push-маршрут /lessons_list, заменивший убранный таб с книжкой.
  it('opens the full lessons list from the quick-start tile', () => {
    expect(source).toContain("onPress: () => { go('/lessons_list'); }");
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
    expect(source).toContain('const priorityCardVisible = (continueV2 ? continueV2Progress !== null : lastLesson !== null) && homeLearnVisible;');
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
