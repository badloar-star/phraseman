// ─── Витрина движения · шард «Лига · неделя и подарки» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// Файл .tsx (не .ts): kind:'render' монтирует настоящие компоненты через JSX —
// агрегатор (components/dev/motion_showcase/index.ts) импортирует без расширения,
// tsc резолвит .tsx так же, как .ts.
import React from 'react';
import LeagueResultModal from '../../../../app/LeagueResultModal';
import LeagueChestOpenModal from '../../../LeagueChestOpenModal';
import LeagueBonusAvailableModal from '../../../LeagueBonusAvailableModal';
import { LeagueChestTeaserModal } from '../../../league/LeagueChestTeaserModal';
import { buildLeagueDevSeed } from '../../leagueDevSeeds';
import type { LeagueChestRewardDrop } from '../../../../app/services/league_chest_rewards';
import type { LeagueHubPalette } from '../../../league/leagueHubPalette';
import type { ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';

// зачем: демо-палитра тизера сундука — те же токены, что строит club_screen.tsx
// (useMemo hubPalette), но захардкожены здесь: витрина не обязана дублировать
// тему компонента-хозяина, ей достаточно правдоподобных статичных цветов.
const DEMO_HUB_PALETTE: LeagueHubPalette = {
  surface: '#1B2420',
  elevated: '#232E28',
  text: '#F4F7F2',
  muted: '#9AA79E',
  accent: '#FFD24A',
  accentText: '#0B3D22',
  outline: 'rgba(255,255,255,0.12)',
  positive: '#34C759',
  negative: '#FF5B6C',
  warning: '#FFD43B',
  isLight: false,
  bone: 'rgba(255,255,255,0.07)',
  boneShine: 'rgba(255,255,255,0.16)',
};

// зачем: правдоподобный набор дропов сундука — по одному на редкость, без
// реальных id наград (только превью карточек, ничего не зачисляется).
const DEMO_CHEST_REWARDS: LeagueChestRewardDrop[] = [
  { id: 'dev-shards', kind: 'shards', rarity: 'common', amount: 40 },
  { id: 'dev-xp', kind: 'xp_boost', rarity: 'rare', multiplier: 1.5, uses: 3 },
  { id: 'dev-shield', kind: 'streak_shield', rarity: 'epic', uses: 1 },
  { id: 'dev-gold', kind: 'gold_theme', rarity: 'legendary' },
];

export const SECTION: ShowcaseSection = {
  id: 'league',
  order: 20,
  title: cs('league_section_title'),
  items: [
    {
      id: 'league-hub-route',
      title: cs('league_hub_route_title'),
      detail: cs('real_screen'),
      kind: 'route',
      route: '/league_screen',
    },
    {
      id: 'league-result-promoted',
      title: cs('league_result_promoted_title'),
      detail: cs('league_result_synthetic_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <LeagueResultModal
          visible={visible}
          onClose={onClose}
          previewMode
          result={buildLeagueDevSeed('promoted')}
        />
      ),
    },
    {
      id: 'league-result-demoted',
      title: cs('league_result_demoted_title'),
      detail: cs('league_result_synthetic_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <LeagueResultModal
          visible={visible}
          onClose={onClose}
          previewMode
          result={buildLeagueDevSeed('demoted')}
        />
      ),
    },
    {
      id: 'league-result-stay',
      title: cs('league_result_stay_title'),
      detail: cs('league_result_synthetic_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <LeagueResultModal
          visible={visible}
          onClose={onClose}
          previewMode
          result={buildLeagueDevSeed('stay')}
        />
      ),
    },
    {
      id: 'league-chest-open',
      title: cs('league_chest_open_title'),
      detail: cs('league_chest_open_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <LeagueChestOpenModal
          visible={visible}
          onClose={onClose}
          crownName={cs('league_chest_crown_name')}
          isCrownWinner
          rewards={DEMO_CHEST_REWARDS}
        />
      ),
    },
    {
      id: 'league-bonus-available',
      title: cs('league_bonus_available_title'),
      detail: cs('league_bonus_available_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <LeagueBonusAvailableModal
          visible={visible}
          onClose={onClose}
          onOpenLeague={() => {}}
          availability={{
            available: true,
            weekId: 'dev-week',
            groupId: 'dev-group',
            leagueId: 3,
            progress: 820,
            goal: 1000,
            memberCount: 29,
            crownName: cs('league_chest_crown_name'),
            crownUid: 'dev-me',
            isCrownWinner: true,
            userUid: 'dev-me',
          }}
        />
      ),
    },
    {
      id: 'league-chest-teaser',
      title: cs('league_chest_teaser_title'),
      detail: cs('league_chest_teaser_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <LeagueChestTeaserModal
          visible={visible}
          onClose={onClose}
          lang="ru"
          palette={DEMO_HUB_PALETTE}
          remainingXp={180}
          canClaim={false}
          rarities={['common', 'rare', 'epic', 'legendary']}
          onClaim={() => {}}
        />
      ),
    },
  ],
};
