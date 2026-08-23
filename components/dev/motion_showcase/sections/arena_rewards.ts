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
import { cs } from '../showcase_copy';

// зачем: демо-игроки для рендера ArenaPlayers/ArenaVersusIntro — статичные
// данные, ничего не читают из сети и не пишут в прогресс/деньги.
const DEMO_YOU: ArenaPlayer = {
  uid: 'demo-you',
  name: cs('arena_demo_you_name'),
  rank: 1,
  score: 4,
  correct: 4,
};
const DEMO_OPPONENT: ArenaPlayer = {
  uid: 'demo-opponent',
  name: cs('arena_demo_opponent_name'),
  rank: 2,
  score: 3,
  correct: 3,
};

export const SECTION: ShowcaseSection = {
  id: 'arena_rewards',
  order: 25,
  title: cs('arena_rewards_section_title'),
  items: [
    {
      id: 'arena-rank-change-banner',
      title: cs('arena_rank_change_banner_title'),
      detail: cs('arena_rank_change_banner_detail'),
      kind: 'render',
      render: ({ onClose }) => React.createElement(RankChangeBanner, {
        delta: 3,
        passedName: cs('arena_demo_opponent_name'),
        lostToName: null,
        lang: 'ru',
        duration: 0,
        onClose,
      }),
    },
    {
      id: 'arena-versus-intro',
      title: cs('arena_versus_intro_title'),
      detail: cs('arena_versus_intro_detail'),
      kind: 'render',
      render: ({ onClose }) => React.createElement(ArenaVersusIntro, {
        you: DEMO_YOU,
        opponent: DEMO_OPPONENT,
        goLabel: cs('arena_versus_go_label'),
        onDone: onClose,
      }),
    },
    {
      id: 'arena-star-flight',
      title: cs('arena_star_flight_title'),
      // зачем: from/to — условные точки на экране витрины (не завязаны на
      // реальный счётчик звёзд), сама траектория и приземления настоящие.
      detail: cs('arena_star_flight_detail'),
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
      title: cs('arena_rewards_known_title'),
      detail: cs('arena_rewards_known_detail'),
      kind: 'render',
      // зачем: звёздная лестница (2026-08-23) — рейтинг больше не очки;
      // полка показывает опыт и руны кошелька, дельта ранга живёт в такте звезды.
      render: () => React.createElement(ArenaRewards, {
        reward: { starsEarned: 12, xpEarned: 40, ratingDelta: 1 },
        starsLabel: cs('arena_stars_label'),
      }),
    },
    {
      id: 'arena-rewards-pending',
      title: cs('arena_rewards_pending_title'),
      // зачем: reward=undefined — честное «пока не знаю», а не «+0»; ровно
      // то состояние, которое чинил ArenaRewards (см. комментарий в файле).
      detail: cs('arena_rewards_pending_detail'),
      kind: 'render',
      render: () => React.createElement(ArenaRewards, {
        reward: undefined,
        starsLabel: cs('arena_stars_label'),
      }),
    },
    {
      id: 'arena-players-row',
      title: cs('arena_players_row_title'),
      detail: cs('arena_players_row_detail'),
      kind: 'render',
      render: () => React.createElement(ArenaPlayers, {
        players: [DEMO_YOU, DEMO_OPPONENT],
        active: true,
        animateScore: true,
      }),
    },
    {
      id: 'arena-timer-ring',
      title: cs('arena_timer_ring_title'),
      detail: cs('arena_timer_ring_detail'),
      kind: 'render',
      render: ({ onClose }) => React.createElement(ArenaTimerRing, {
        durationMs: 12_000,
        onExpire: onClose,
      }),
    },
    {
      id: 'arena-results-screen',
      title: cs('arena_results_screen_title'),
      // зачем: /arena_results читает matchId из useLocalSearchParams и живой
      // матч через useArenaMatch(matchId) — без реального завершённого
      // матча на сервере экран навсегда останется в состоянии загрузки
      // (нет ветки graceful-empty на отсутствующий matchId). Безопасного
      // демо-запуска без реальных серверных данных матча нет.
      kind: 'note',
      note: cs('arena_results_screen_note'),
    },
  ],
};
