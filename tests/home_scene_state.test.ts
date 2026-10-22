// зачем (владелец 21.10 ~23:40, Главная A «Сцена»; таблица приоритетов home-scene-states.html): сторож выбора героя сцены,
// контраста белого текста на сцене в любой теме и текстов состояний — чтобы правка одного правила не сдвинула остальные.
import { HOME_SCENE_HERO, HOME_SCENE_STATES, minutesUntilMidnight, pickHomeSceneState, type HomeSceneInput } from '../components/home/v2/scene/home_scene_state';
import { HOME_SCENE_MIN_WHITE_CONTRAST, homeSceneTokens, whiteContrastOn } from '../components/home/v2/scene/home_scene_tokens';
import { buildHomeSceneCopy, type HomeSceneCopyInput } from '../components/home/v2/scene/home_scene_copy';
import { homeSceneAllReleasedDone, homeSceneDaysSince, homeSceneLastActivityDay, homeSceneStreakLost } from '../components/home/v2/scene/home_scene_inputs';

const base: HomeSceneInput = {
  hasProgress: true, hour: 14, streakDays: 5, dayCounted: false, plus: false, energy: 3, daysAway: 0,
  streakLostToday: false, chapterExamReady: false, allReleasedDone: false, offline: false,
};
const pick = (o: Partial<HomeSceneInput>) => pickHomeSceneState({ ...base, ...o });

describe('Сцена Главной: таблица приоритетов героя', () => {
  it('новичок раньше всего, даже вечером без энергии', () => expect(pick({ hasProgress: false, hour: 22, energy: 0 }).state).toBe('newbie'));
  it('неизвестный прогресс не делает новичком', () => expect(pick({ hasProgress: null }).state).toBe('continue'));
  it('вечер с 20:00 при серии и без занятия сегодня', () => expect(pick({ hour: 20 }).state).toBe('streak_risk'));
  it('19 часов — ещё не вечер', () => expect(pick({ hour: 19 }).state).toBe('continue'));
  it('без серии вечера нет', () => expect(pick({ hour: 22, streakDays: 0 }).state).toBe('continue'));
  it('день ещё не прочитан — вечером не пугаем угрозой', () => expect(pick({ hour: 22, dayCounted: null }).state).toBe('continue'));
  it('вечер при 0 энергии: герой вечера и пометка про энергию', () => {
    const d = pick({ hour: 21, energy: 0 });
    expect(d.state).toBe('streak_risk');
    expect(d.zeroEnergyNote).toBe(true);
  });
  it('0 энергии у Free', () => expect(pick({ energy: 0 }).state).toBe('no_energy'));
  it('Plus при 0 в «нет энергии» не попадает', () => expect(pick({ energy: 0, plus: true }).state).toBe('continue'));
  it('энергия неизвестна — не «нет энергии»', () => expect(pick({ energy: null }).state).toBe('continue'));
  it('«С возвращением» важнее «серия прервалась» и экзамена', () => expect(pick({ daysAway: 4, streakLostToday: true, chapterExamReady: true }).state).toBe('welcome_back'));
  it('2 дня — ещё не «С возвращением»', () => expect(pick({ daysAway: 2 }).state).toBe('continue'));
  it('«серия прервалась» раньше экзамена', () => expect(pick({ streakLostToday: true, chapterExamReady: true }).state).toBe('streak_lost'));
  it('экзамен раньше «всё пройдено»', () => expect(pick({ chapterExamReady: true, allReleasedDone: true }).state).toBe('exam_ready'));
  it('«всё пройдено» раньше «день засчитан»', () => expect(pick({ allReleasedDone: true, dayCounted: true }).state).toBe('all_done'));
  it('день засчитан', () => expect(pick({ dayCounted: true }).state).toBe('day_done'));
  it('нет сети: свой герой и строка; при другом герое — только строка', () => {
    expect(pick({ offline: true })).toMatchObject({ state: 'offline', offlineLine: true });
    expect(pick({ offline: true, dayCounted: true })).toMatchObject({ state: 'day_done', offlineLine: true });
    expect(pick({ offline: null }).offlineLine).toBe(false);
  });
  it('причина решения называет значения, а не голое true/false', () => expect(pick({ hour: 21 }).reason).toContain('hour=21'));
  it('у каждого состояния есть файл героя и заглушка из нынешних картинок', () => {
    for (const s of HOME_SCENE_STATES) {
      expect(HOME_SCENE_HERO[s].file).toBe(`home_scene_${s}`);
      expect(['continue', 'today', 'lessons']).toContain(HOME_SCENE_HERO[s].placeholder);
    }
  });
  it('минуты до полуночи', () => expect(minutesUntilMidnight(new Date(2026, 9, 21, 21, 40))).toBe(140));
});

describe('Сцена Главной: белый текст читается в любой теме', () => {
  it.each(['#FFFFFF', '#F2F1F6', '#7EF0C8', '#F0C551', '#5B49D6', '#000000', 'rgba(1,2,3,.5)'])('акцент %s → белый ≥ 4,5:1 сверху и снизу', (accent) => {
    const t = homeSceneTokens(accent);
    expect(whiteContrastOn(t.sceneTop)).toBeGreaterThanOrEqual(HOME_SCENE_MIN_WHITE_CONTRAST);
    expect(whiteContrastOn(t.sceneBottom)).toBeGreaterThanOrEqual(HOME_SCENE_MIN_WHITE_CONTRAST);
  });
  it('вечерние цвета тёмные', () => {
    const t = homeSceneTokens('#FFFFFF', true);
    expect(whiteContrastOn(t.sceneTop)).toBeGreaterThanOrEqual(HOME_SCENE_MIN_WHITE_CONTRAST);
  });
});

describe('Сцена Главной: тексты состояний', () => {
  const copyBase: HomeSceneCopyInput = {
    lang: 'ru', state: 'continue', zeroEnergyNote: false, badge: 'Урок 1', episode: 12, title: 'Комплименты вслух',
    progress: { done: 11, total: 56 }, streakDays: 5, minutesToMidnight: 140, daysAway: null, energyMinutes: null, theoryAvailable: true, wordsAvailable: false, lostStreakDays: null,
  };
  it('продолжить: урок и эпизод, прогресс урока, «Теория»', () => {
    const c = buildHomeSceneCopy(copyBase);
    expect(c).toMatchObject({ kicker: 'Урок 1 · Эпизод 12', title: 'Комплименты вслух', line: '11 из 56', cta: 'Продолжить', chips: ['theory'] });
  });
  it('вечер: серия, время до полуночи, тёплая строка, эпизод в кнопке', () => {
    const c = buildHomeSceneCopy({ ...copyBase, state: 'streak_risk' });
    expect(c).toMatchObject({ kicker: 'Серия 5 дней', title: 'До полуночи 2 ч 20 мин' /* неразрывные пробелы: строка рвётся только между фразой и временем (Сверка 22.10) */, warm: 'Одно занятие сохранит серию', cta: 'Продолжить эпизод 12' });
  });
  it('вечер при 0 энергии говорит, когда энергия', () => {
    const c = buildHomeSceneCopy({ ...copyBase, state: 'streak_risk', zeroEnergyNote: true, energyMinutes: 42 });
    expect(c.warm).toBe('Энергия +1 через 42 мин — успеешь до полуночи');
  });
  it('нет энергии: без главной кнопки, занятия без энергии и Plus', () => {
    const c = buildHomeSceneCopy({ ...copyBase, state: 'no_energy', energyMinutes: 42 });
    expect(c).toMatchObject({ title: 'Энергия вернётся через 42 мин', cta: null, chips: ['cards', 'phrase', 'video'], note: 'С Plus без энергии' });
  });
  it.each(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const)('%s: у каждого состояния непустой заголовок', (lang) => {
    for (const state of HOME_SCENE_STATES) {
      const c = buildHomeSceneCopy({ ...copyBase, lang, state, daysAway: 4, energyMinutes: 10 });
      expect(c.title.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('Сцена Главной: входы из данных на телефоне', () => {
  const now = new Date(2026, 9, 22, 9, 0);
  it('дни с последнего засчитанного дня', () => {
    expect(homeSceneDaysSince('2026-10-22', now)).toBe(0);
    expect(homeSceneDaysSince('2026-10-20', now)).toBe(2);
    expect(homeSceneDaysSince('2026-10-18', now)).toBe(4);
    expect(homeSceneDaysSince(null, now)).toBeNull();
    expect(homeSceneDaysSince('мусор', now)).toBeNull();
  });
  it('последний день — самая поздняя дата', () => expect(homeSceneLastActivityDay(['2026-10-01', '2026-10-20', '2026-10-19'])).toBe('2026-10-20'));
  it('серия прервалась: пропущен один день, серия от 2, без Plus', () => {
    expect(homeSceneStreakLost({ daysAway: 2, streakCount: 5, plus: false })).toBe(true);
    expect(homeSceneStreakLost({ daysAway: 2, streakCount: 5, plus: true })).toBe(false);
    expect(homeSceneStreakLost({ daysAway: 2, streakCount: 1, plus: false })).toBe(false);
    expect(homeSceneStreakLost({ daysAway: 1, streakCount: 5, plus: false })).toBe(false);
    expect(homeSceneStreakLost({ daysAway: 3, streakCount: 5, plus: false })).toBe(false);
  });
  it('всё выпущенное пройдено: урок целиком и следующий не выпущен', () => {
    const released = (l: number) => l <= 2;
    expect(homeSceneAllReleasedDone({ lessonOrdinal: 2, done: 56, total: 56 }, released)).toBe(true);
    expect(homeSceneAllReleasedDone({ lessonOrdinal: 1, done: 56, total: 56 }, released)).toBe(false);
    expect(homeSceneAllReleasedDone({ lessonOrdinal: 2, done: 55, total: 56 }, released)).toBe(false);
    expect(homeSceneAllReleasedDone(null, released)).toBe(false);
  });
  it('чип «Слова» — только когда словарь подключён', () => {
    const base = { lang: 'ru' as const, state: 'continue' as const, zeroEnergyNote: false, badge: 'Урок 1', episode: 12, title: 'Т', progress: null, streakDays: 5, minutesToMidnight: 140, daysAway: null, energyMinutes: null, theoryAvailable: true, lostStreakDays: null };
    expect(buildHomeSceneCopy({ ...base, wordsAvailable: false }).chips).toEqual(['theory']);
    expect(buildHomeSceneCopy({ ...base, wordsAvailable: true }).chips).toEqual(['words', 'theory']);
  });
  it('серия прервалась: сколько было дней', () => {
    const c = buildHomeSceneCopy({ lang: 'ru', state: 'streak_lost', zeroEnergyNote: false, badge: null, episode: 12, title: 'Т', progress: null, streakDays: 0, minutesToMidnight: 0, daysAway: 2, energyMinutes: null, theoryAvailable: false, wordsAvailable: false, lostStreakDays: 5 });
    expect(c.line).toBe('Было 5 дней. Одно занятие, и огонь снова загорится');
  });
});
