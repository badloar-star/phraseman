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

  it('reuses the quick-start surface material for the priority card', () => {
    const quickStartStart = source.indexOf('{visibleQuickItems.map((item, index) => {');
    const priorityStart = source.indexOf('testID="home-continue-lesson"');
    const priorityEnd = source.indexOf('{/* «Задание»', priorityStart);
    const quickStartSource = source.slice(quickStartStart, priorityStart);
    const prioritySource = source.slice(priorityStart, priorityEnd);

    // Карточка и плитки быстрого старта берут один материал поверхности.
    expect(quickStartSource.length).toBeGreaterThan(0);
    expect(prioritySource).toContain('homeThemePanelGradient');
  });

  it('uses dedicated per-theme art for the last-lesson card', () => {
    const cardStart = source.indexOf('testID="home-continue-lesson"');
    const cardEnd = source.indexOf('{/* «Задание»', cardStart);
    const cardSource = source.slice(cardStart, cardEnd);
    const assetPath = path.join(process.cwd(), 'app', 'home_last_lesson_assets.ts');

    expect(source).toContain("import { getHomeLastLessonImage } from '../home_last_lesson_assets';");
    expect(source).toContain('const lastLessonImage = getHomeLastLessonImage(themeMode);');
    // зачем (владелец 2026-09-21): карточка переключается между уроком и
    // ошибками, поэтому арт выбирается условно. Намерение проверки прежнее —
    // берём подготовленный арт ТЕМЫ, а не общий menuImages.lesson.
    expect(source).toContain('const priorityCardImage = priorityCardShowsMistakes');
    expect(source).toContain('? getHomeMistakesImage(themeMode)');
    expect(source).toContain(': lastLessonImage;');
    expect(cardSource).toContain('source={priorityCardImage}');
    expect(cardSource).not.toContain('source={menuImages.lesson}');
    expect(cardSource).not.toContain('align="center"');
    expect(fs.existsSync(assetPath)).toBe(true);

    const assetSource = fs.readFileSync(assetPath, 'utf8');

    let totalAssetBytes = 0;
    for (const theme of ['indigo', 'sagePorcelain', 'midnight', 'ember', 'aurora', 'volt', 'forest', 'gold']) {
      const fileName = `home-last-lesson-${theme}.webp`;
      const filePath = path.join(process.cwd(), 'assets', 'images', 'home_last_lesson', fileName);
      expect(assetSource).toContain(fileName);
      expect(fs.existsSync(filePath)).toBe(true);
      totalAssetBytes += fs.statSync(filePath).size;
    }
    expect(totalAssetBytes).toBeLessThanOrEqual(150_000);
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

  it('swaps the lesson card for mistakes on long press', () => {
    // зачем (владелец 2026-09-21): «плашка последнего урока при зажатии
    // менялась анимированно на плашку раздела мои ошибки», и «зажатие
    // работало» при любом числе ошибок.
    //
    // Это ОТМЕНА решения от 2026-09-14/15, по которому вход в ошибки жил
    // отдельной кнопкой-пилюлей у заголовка «Сегодня», а переключение
    // удержанием было запрещено. Ряд из двух пилюль удалён целиком: он был
    // источником визуального шума на Главной.
    expect(source).toContain('onLongPress={handleHomeLearningPriorityCardLongPress}');
    expect(source).toContain('homePriorityCardFace');
    expect(source).toContain('priorityCardShowsMistakes');
    // Пилюль у «Сегодня» больше нет — вход живёт на карточке и на полосе опыта.
    expect(source).not.toContain('testID="home-mistakes-pulse-button"');
    expect(source).not.toContain('testID="home-videos-pulse-button"');
    // Старые механизмы подмены не возвращаются.
    expect(source).not.toContain('showMistakesCard');
    expect(source).not.toContain('homeLearningPriorityOverride');
    expect(source).not.toContain('canToggleHomeLearningPriority');
    expect(source).not.toContain('MistakePracticeSetupSheet');
  });

  it('uses a reduced-motion-aware UI-thread scale while the priority card is held', () => {
    expect(source).toContain('const homePriorityCardScale = useSharedValue(1);');
    expect(source).toContain('const homePriorityCardScaleStyle = useAnimatedStyle(() => ({');
    expect(source).toContain('onPressIn={handleHomeLearningPriorityCardPressIn}');
    expect(source).toContain('onPressOut={handleHomeLearningPriorityCardPressOut}');
    expect(source).toContain('<Reanimated.View style={homePriorityCardScaleStyle}>');
    expect(source).toContain('homePriorityCardReduceMotion');
  });
});
