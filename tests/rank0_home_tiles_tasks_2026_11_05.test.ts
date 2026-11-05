// зачем (владелец 05.11: «Ранг 0 — макет 1 в 1»; координатор; аудит AUDIT_RANK_GATING п.4): ряд плиток Главной по рангам и состав «Сегодня» на ранге 0.
// Сторож читает исходник Главной: слот «Карточки» отдаётся «Сохранённым», пока хаб закрыт; «Наборы из видео»/«Мои ошибки» ряд не занимают; на ранге 0 одна задача.
import { readSource } from './helpers/read_source';

describe('Главная: ряд плиток и «Сегодня» по рангам', () => {
  const src = readSource('app/(tabs)/home.tsx');

  it('пока хаб карточек закрыт рангом, «Сохранённые» занимают слот «Карточки», вторым после «Уроков»', () => {
    expect(src).toContain("const homeV2SavedAsCards = rankLockedCardsHub && homeFlashcardsVisible ? homeV2FillerTiles.find((tile) => tile.key === 'saved') : undefined;");
    expect(src).toContain('homeV2BaseTiles.slice(0, 1), tile, ...homeV2BaseTiles.slice(1)');
  });

  it('«Сохранённые» не дублируются среди наполнителей, а видео/ошибки в ряд не попадают при занятом слоте', () => {
    expect(src).toContain("homeV2FillerTiles.filter((tile) => tile.key !== 'saved')");
    expect(src).toContain('homeV2RankedFillers.filter((tile) => tile.available)');
  });

  it('четвёртая плитка «Пик» считается от ряда с «Сохранёнными» (ранг 2: Уроки, Сохранённые, Диалоги, Пик)', () => {
    expect(src).toContain('const homeV2WithSpire = homeV2RankedBase.length === 3 && homeV2SpireTile.available;');
  });

  it('порядок макета: Уроки → Карточки/Сохранённые → Диалоги → Пик', () => {
    expect(src).toContain("const homeV2TileOrder = ['lessons', 'cards', 'saved', 'dialogs', 'spire'];");
  });

  it('на ранге 0 (видео и диалоги закрыты) в «Сегодня» одна задача — урок; со «Смотреть все» остальное на /today_tasks', () => {
    expect(src).toContain('const homeTodayRank0 = rankLockedVideo && rankLockedDialogues;');
    expect(src).toMatch(/homeTodayCardTasks = homeTodayRank0 \? \[homeV2Tasks\.find\(\(task\) => task\.kind === 'lesson'\) \?\? homeV2Tasks\[0\]\]/);
    expect(src).toContain("go('/today_tasks')");
  });

  it('на ранге 0 заголовок «Сегодня» — ссылка «Все задания» вместо счёта, строки опроса/триала нет (макет home-free-0)', () => {
    expect(src).toContain("count: homeTodayRank0 ? triLang(lang, { ru: 'Все задания'");
    expect(src).toContain('surveyRow={homeTodayRank0 ? null :');
  });

  it('на ранге 0 (видео закрыто рангом) ленты «Видео» на Главной нет — обе точки показа проверяют !rankLockedVideo', () => {
    const hits = src.split('isVideoButtonEnabled() && homeVideosVisible && !rankLockedVideo && !homeV2VideoNoChannel').length - 1;
    expect(hits).toBe(2);
  });

  it('на ранге 0 до первого пройденного занятия сцена — «newbie» (hasProgress=false): «Урок 1 + название + Начать», серия первого дня прогрессом не считается', () => {
    expect(src).toContain('hasProgress={homeTodayRank0 && homeSceneLessonNo === 1 && !lastLesson && (homeSceneCount.done ?? 0) === 0 ? false :');
  });
});
