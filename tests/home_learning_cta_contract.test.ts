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
    expect(source).toContain("router.push({ pathname: '/lesson_menu', params: { id: String(lastLesson.id) } } as never)");
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

  it('keeps the long-press swap on the V2 card and no V1 press-scale wrapper', () => {
    // зачем (01.10, удаление Главной V1): удержание-подмена урока на «Мои ошибки» осталась на
    // карточке V2 (HomeV2ContinueCard), а масштаб при удержании жил в V1-обёртке и удалён.
    expect(source).toContain('priorityCardShowsMistakes');
    expect(source).toContain('handleHomeLearningPriorityCardLongPress');
    expect(source).toContain('homePriorityCardFace');
    expect(source).not.toContain('<Reanimated.View style={homePriorityCardScaleStyle}>');
    expect(source).not.toContain('testID="home-mistakes-pulse-button"');
    expect(source).not.toContain('testID="home-videos-pulse-button"');
    expect(source).not.toContain('showMistakesCard');
    expect(source).not.toContain('homeLearningPriorityOverride');
    expect(source).not.toContain('canToggleHomeLearningPriority');
    expect(source).not.toContain('MistakePracticeSetupSheet');
  });
});
