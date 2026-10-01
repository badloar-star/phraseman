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
    expect(source).toContain('const priorityCardImage = priorityCardShowsMistakes');
    expect(source).toContain('? getHomeMistakesImage(themeMode)');
    expect(source).toContain(': lastLessonImage;');
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
