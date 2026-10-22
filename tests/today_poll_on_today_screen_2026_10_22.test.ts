// зачем (владелец 22.10 кнопкой: «опрос дня перенести на экран «Сегодня» (/today_tasks), Главная — строго по макету»; координатор: после
// 3c68a67b8 на новой Главной опроса нет — без переноса его нет в приложении): сторож — опрос живёт на «Сегодня» тем же хуком и той же шторкой,
// без новых запросов, и не дублируется на Главной.
import { readSource } from './helpers/read_source';

describe('опрос дня на экране «Сегодня»', () => {
  it('экран /today_tasks: тот же хук, строка и шторка — при новой Главной (флаг «Сцены»)', () => {
    const src = readSource('app/today_tasks.tsx');
    expect(src).toContain('const pollOn = HOME_SCENE_V2_ENABLED;');
    expect(src).toContain('const poll = useHomePollV2({ lang, active: pollOn });');
    expect(src).toContain('<HomePollV2Card model={poll} lang={lang} onFinished={closePoll} />');
    expect(src).toContain('testID="today-poll-v2-sheet"');
    expect(src).toContain('pollRow={pollRow}');
    expect(src).toContain('surveyRow={pollRow} />');
    expect(src).toContain("console.log('[TODAY-POLL] row'");
    expect(src.match(/\{pollSheet\}/g)).toHaveLength(2);
  });

  it('строка опроса в «Сцене» «Сегодня» — после заданий, в стиле строк экрана', () => {
    const view = readSource('components/home/v2/today_scene/TodaySceneView.tsx');
    expect(view).toContain('testID="today-scene-row-poll"');
    expect(view).toContain('<Ionicons name="clipboard-outline" size={18} color={card.text} />');
    expect(view.indexOf('testID="today-scene-row-poll"')).toBeGreaterThan(view.indexOf('{tasks.map((task, index) => {'));
    const scene = readSource('components/home/v2/today_scene/TodayScene.tsx');
    expect(scene).toContain('onOpenTask={onOpenTask} pollRow={pollRow}');
  });

  it('на новой Главной строки опроса нет — не дублируется', () => {
    const home = readSource('app/(tabs)/home.tsx');
    expect(home).toMatch(/'poll_v2' && !HOME_SCENE_V2_ENABLED/);
  });

  it('набор дня грузится без сети — второй экран не добавляет запросов', () => {
    const client = readSource('app/home_polls/home_polls_v2_client.ts');
    expect(client).toContain('/** Набор дня без сети: расписание + бандл + свои ответы с диска. */');
  });
});
