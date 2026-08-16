// ─── Витрина движения · шард «Арена · ранги и итоги» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
import React from 'react';
import type { ShowcaseSection } from '../types';
import RankChangeBanner from '../../../RankChangeBanner';
// зачем: файл лежит в components/dev/motion_showcase/sections/ — до components/
// ровно ТРИ уровня вверх, как в соседнем импорте RankChangeBanner. Было '../../',
// что резолвилось в несуществующий components/dev/arena/ и роняло весь бандл
// Metro (экран витрины тянется через require.context каталога app/).
import { ArenaVersusIntro } from '../../../arena/ArenaVersusIntro';
import { ArenaStarFlight } from '../../../arena/ArenaStarFlight';
import { ArenaRewards } from '../../../arena/ArenaRewards';
import { ArenaPlayers } from '../../../arena/ArenaPlayers';
import { ArenaTimerRing } from '../../../arena/ArenaTimerRing';
import type { ArenaPlayer } from '../../../../modules/arena/contract';

// зачем: демо-игроки для рендера ArenaPlayers/ArenaVersusIntro — статичные
// данные, ничего не читают из сети и не пишут в прогресс/деньги.
const DEMO_YOU: ArenaPlayer = {
  uid: 'demo-you',
  name: 'Ты',
  rank: 1,
  score: 4,
  correct: 4,
};
const DEMO_OPPONENT: ArenaPlayer = {
  uid: 'demo-opponent',
  name: 'Алекс',
  rank: 2,
  score: 3,
  correct: 3,
};

export const SECTION: ShowcaseSection = {
  id: 'arena_rewards',
  order: 25,
  title: 'Арена · ранги и итоги',
  items: [
    {
      id: 'arena-rank-change-banner',
      title: 'Баннер смены ранга',
      detail: 'реальный компонент — демо-данные, подъём на 3 позиции',
      kind: 'render',
      render: ({ onClose }) => React.createElement(RankChangeBanner, {
        delta: 3,
        passedName: 'Алекс',
        lostToName: null,
        lang: 'ru',
        duration: 0,
        onClose,
      }),
    },
    {
      id: 'arena-versus-intro',
      title: 'Старт матча: соперник → 3-2-1 → GO',
      detail: 'реальный компонент — демо-игроки, звук/хаптик реальные',
      kind: 'render',
      render: ({ onClose }) => React.createElement(ArenaVersusIntro, {
        you: DEMO_YOU,
        opponent: DEMO_OPPONENT,
        goLabel: 'СТАРТ',
        onDone: onClose,
      }),
    },
    {
      id: 'arena-star-flight',
      title: 'Полёт звёзд в кошелёк',
      // зачем: from/to — условные точки на экране витрины (не завязаны на
      // реальный счётчик звёзд), сама траектория и приземления настоящие.
      detail: 'реальный компонент — демо-траектория, 5 звёзд',
      kind: 'render',
      render: ({ onClose }) => React.createElement(ArenaStarFlight, {
        amount: 5,
        from: { x: 60, y: 260 },
        to: { x: 300, y: 60 },
        onComplete: onClose,
      }),
    },
    {
      id: 'arena-rewards-known',
      title: 'Награда за матч (известна)',
      detail: 'реальный компонент — демо-награда +12 звёзд, рейтинг +18',
      kind: 'render',
      render: () => React.createElement(ArenaRewards, {
        reward: { starsEarned: 12, ratingDelta: 18 },
        starsLabel: 'звёзд за матч',
      }),
    },
    {
      id: 'arena-rewards-pending',
      title: 'Награда за матч (ещё не пришла)',
      // зачем: reward=undefined — честное «пока не знаю», а не «+0»; ровно
      // то состояние, которое чинил ArenaRewards (см. комментарий в файле).
      detail: 'реальный компонент — состояние «отчёт в очереди»',
      kind: 'render',
      render: () => React.createElement(ArenaRewards, {
        reward: undefined,
        starsLabel: 'звёзд за матч',
      }),
    },
    {
      id: 'arena-players-row',
      title: 'Счёт матча (ты vs соперник)',
      detail: 'реальный компонент — демо-счёт 4:3',
      kind: 'render',
      render: () => React.createElement(ArenaPlayers, {
        players: [DEMO_YOU, DEMO_OPPONENT],
        active: true,
        animateScore: true,
      }),
    },
    {
      id: 'arena-timer-ring',
      title: 'Кольцо таймера ответа',
      detail: 'реальный компонент — демо-длительность 12с, тик и тревога настоящие',
      kind: 'render',
      render: ({ onClose }) => React.createElement(ArenaTimerRing, {
        durationMs: 12_000,
        onExpire: onClose,
      }),
    },
    {
      id: 'arena-results-screen',
      title: 'Экран итогов матча',
      // зачем: /arena_results читает matchId из useLocalSearchParams и живой
      // матч через useArenaMatch(matchId) — без реального завершённого
      // матча на сервере экран навсегда останется в состоянии загрузки
      // (нет ветки graceful-empty на отсутствующий matchId). Безопасного
      // демо-запуска без реальных серверных данных матча нет.
      kind: 'note',
      note: 'нет безопасного демо: экран требует реальный matchId завершённого матча с сервера',
    },
  ],
};
