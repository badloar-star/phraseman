// ═══ Опросы на Главной 2.0 — dev-фикстура для карточки ════════════════════════
// зачем (координатор 18.10: «хук и модель для карточки + dev-фикстура»): Дизайн и Сверка рисуют и снимают карточку без
// сети и без голоса в прод. Голос фикстуры отвечает из памяти через ~300 мс правдоподобными счётчиками; режим 'offline'
// показывает откат выбора. В стор-сборке не используется (вызывающий передаёт fixture только в __DEV__).
import { parseHomePollV2Set, type HomePollV2Answer, type HomePollV2Set } from './home_polls_v2_model';
import type { HomePollV2Snapshot, HomePollV2VoteOutcome } from './home_polls_v2_client';

export type HomePollV2Fixture = Readonly<{
  snapshot: HomePollV2Snapshot;
  vote: (questionId: string, optionId: string) => Promise<HomePollV2VoteOutcome>;
}>;

export type HomePollV2FixtureMode = 'fresh' | 'second_question' | 'offline';

const DEMO_SET_RAW = {
  id: 'p2-001',
  theme: 'me',
  questions: [
    { id: 'q1', text: { ru: 'Сколько тебе лет?', en: 'How old are you?' }, options: [
      { id: 'o1', text: { ru: 'До 18', en: 'Under 18' } },
      { id: 'o2', text: { ru: '18–24', en: '18–24' } },
      { id: 'o3', text: { ru: '25–34', en: '25–34' } },
      { id: 'o4', text: { ru: '35 и больше', en: '35 or older' } },
    ] },
    { id: 'q2', text: { ru: 'Зачем тебе английский в первую очередь?', en: 'Why do you need English most?' }, options: [
      { id: 'o1', text: { ru: 'Работа и карьера', en: 'Work and career' } },
      { id: 'o2', text: { ru: 'Путешествия', en: 'Travel' } },
      { id: 'o3', text: { ru: 'Переезд в другую страну', en: 'Moving abroad' } },
      { id: 'o4', text: { ru: 'Для себя, для мозга', en: 'For myself' } },
    ] },
    { id: 'q3', text: { ru: 'Как быстро хочешь заговорить?', en: 'How soon do you want to speak?' }, options: [
      { id: 'o1', text: { ru: 'Через пару месяцев', en: 'In a couple of months' } },
      { id: 'o2', text: { ru: 'Через полгода', en: 'In six months' } },
      { id: 'o3', text: { ru: 'Через год', en: 'In a year' } },
      { id: 'o4', text: { ru: 'Я не тороплюсь', en: 'No rush' } },
    ] },
  ],
};

const DEMO_COUNTS: Record<string, Record<string, number>> = {
  q1: { o1: 112, o2: 340, o3: 281, o4: 167 },
  q2: { o1: 402, o2: 188, o3: 121, o4: 189 },
  q3: { o1: 233, o2: 301, o3: 156, o4: 210 },
};

export function createHomePollV2Fixture(mode: HomePollV2FixtureMode = 'fresh', dateKey = '2026-10-19'): HomePollV2Fixture {
  const set = parseHomePollV2Set(DEMO_SET_RAW) as HomePollV2Set;
  const answers: Record<string, HomePollV2Answer> = mode === 'second_question'
    ? { q1: { optionId: 'o2', counts: DEMO_COUNTS.q1 } }
    : {};
  const snapshot: HomePollV2Snapshot = {
    dateKey,
    ownerId: 'dev',
    window: { launch: 0, setIndex: 0, setId: set.id, startDateKey: dateKey, endDateKey: dateKey },
    set,
    answers,
    questionIndex: mode === 'second_question' ? 1 : 0,
  };
  const vote = (questionId: string, optionId: string): Promise<HomePollV2VoteOutcome> => new Promise((resolve) => {
    setTimeout(() => {
      if (mode === 'offline') {
        resolve({ ok: false, reason: 'offline' });
        return;
      }
      const base = DEMO_COUNTS[questionId] ?? {};
      const counts = { ...base, [optionId]: (base[optionId] ?? 0) + 1 };
      resolve({ ok: true, answer: { optionId, counts }, alreadyAnswered: false });
    }, 300);
  });
  return { snapshot, vote };
}
