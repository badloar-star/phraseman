// ─── Витрина движения · шард «Празднования и сундуки» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// .tsx (не .ts): render использует JSX (React.createElement напрямую тоже
// годится, но для читаемости демо-компонентов ниже используется JSX).
import React from 'react';
import type { ShowcaseSection } from '../types';
import LevelGiftModal from '../../../LevelGiftModal';
import LevelGiftDualModal from '../../../LevelGiftDualModal';
import BoonChestModal from '../../../BoonChestModal';
import BoonActivatedModal from '../../../BoonActivatedModal';
import WeeklyBoonDetailModal from '../../../WeeklyBoonDetailModal';
import SeasonGiftModal from '../../../SeasonGiftModal';
import SeasonRewardInfoModal from '../../../SeasonRewardInfoModal';
import CollectibleDropModal from '../../../CollectibleDropModal';
import RouletteWinModal from '../../../roulette_win_modal';
import RouletteWinCelebration from '../../../roulette_win_celebration';
import ReferralFriendRewardModal from '../../../referral_friend_reward_modal';
import { DialogVictoryCelebration } from '../../../DialogVictoryCelebration';
import type { GiftDef } from '../../../../app/level_gift_system';
import type { PremPair } from '../../../../app/level_gift_inventory';
import type { SeasonReward } from '../../../../app/season_pass_track_config';
import { cs } from '../showcase_copy';

// ── Демо-данные: НЕ мутируют прогресс/деньги/сеть. Только статичные объекты
// и пустые колбэки там, где реальный пропс мог бы что-то начислить/списать. ──

const DEMO_F2P_GIFT: GiftDef = {
  id: 'xp_50',
  rarity: 'common',
  // зачем: владелец запретил эмодзи в UI — витринные демо-данные тоже
  // рендерятся в реальных компонентах, значок заменён на пустую строку
  // (иконка тут декоративный fallback, не текст).
  icon: '',
  weight: 7,
  titleRU: 'Опыт +50', titleUK: 'Досвід +50', titleES: 'XP +50',
  descRU: 'Небольшая прибавка к опыту.', descUK: 'Невеликий приріст досвіду.', descES: 'Un pequeño impulso de XP.',
};

const DEMO_PREM_GIFT: GiftDef = {
  id: 'xp_2x_48h',
  rarity: 'epic',
  icon: '',
  weight: 3,
  titleRU: 'XP ×2 на 48ч', titleUK: 'XP ×2 на 48г', titleES: 'XP ×2 por 48h',
  descRU: 'Двойной опыт двое суток.', descUK: 'Подвійний досвід дві доби.', descES: 'XP doble durante dos días.',
};

const DEMO_PAIR: PremPair = { f2p: DEMO_F2P_GIFT, prem: DEMO_PREM_GIFT };

const DEMO_SEASON_REWARD: SeasonReward = { kind: 'pearls', amount: 15 };

export const SECTION: ShowcaseSection = {
  id: 'celebrations',
  order: 10,
  title: cs('celebrations_section_title'),
  items: [
    {
      id: 'celebrations-level-gift',
      title: cs('celebrations_level_gift_title'),
      detail: cs('celebrations_level_gift_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <LevelGiftModal
          visible={visible}
          level={7}
          userName={cs('celebrations_demo_user_name')}
          lang="ru"
          // зачем: inventory-режим только сохраняет предпросмотренный подарок в
          // инвентарь (та же ветка, что и обычная работа приложения при
          // неполном клейме) — деньги/прогресс модалка сама по себе не тратит.
          deliveryMode="inventory"
          preRolledGift={DEMO_F2P_GIFT}
          onClose={() => onClose()}
        />
      ),
    },
    {
      id: 'celebrations-level-gift-hybrid',
      approval: 'pending',
      title: cs('celebrations_level_gift_hybrid_title'),
      detail: cs('celebrations_level_gift_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <LevelGiftModal
          visible={visible}
          level={7}
          userName={cs('celebrations_demo_user_name')}
          lang="ru"
          deliveryMode="inventory"
          preRolledGift={DEMO_F2P_GIFT}
          motionVariant="hybrid"
          onClose={() => onClose()}
        />
      ),
    },
    {
      id: 'celebrations-level-gift-dual',
      title: cs('celebrations_level_gift_dual_title'),
      detail: cs('celebrations_level_gift_dual_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <LevelGiftDualModal
          visible={visible}
          level={12}
          userName={cs('celebrations_demo_user_name')}
          lang="ru"
          deliveryMode="inventory"
          preRolledPair={DEMO_PAIR}
          onClose={() => onClose()}
        />
      ),
    },
    {
      id: 'celebrations-level-gift-dual-hybrid',
      approval: 'pending',
      title: cs('celebrations_level_gift_dual_hybrid_title'),
      detail: cs('celebrations_level_gift_dual_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <LevelGiftDualModal
          visible={visible}
          level={12}
          userName={cs('celebrations_demo_user_name')}
          lang="ru"
          deliveryMode="inventory"
          preRolledPair={DEMO_PAIR}
          motionVariant="hybrid"
          onClose={() => onClose()}
        />
      ),
    },
    {
      id: 'celebrations-boon-chest',
      title: cs('celebrations_boon_chest_title'),
      detail: cs('celebrations_boon_chest_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <BoonChestModal
          visible={visible}
          rarity="epic"
          title={cs('celebrations_boon_chest_modal_title')}
          rewardLine={cs('celebrations_boon_chest_reward_line')}
          tapHint={cs('celebrations_boon_chest_tap_hint')}
          claimCta={cs('celebrations_boon_chest_claim_cta')}
          closeLabel={cs('celebrations_boon_chest_close_label')}
          onClaim={() => {}}
          onClose={onClose}
        />
      ),
    },
    {
      id: 'celebrations-boon-chest-hybrid',
      approval: 'pending',
      title: cs('celebrations_boon_chest_hybrid_title'),
      detail: cs('celebrations_boon_chest_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <BoonChestModal
          visible={visible}
          rarity="epic"
          title={cs('celebrations_boon_chest_modal_title')}
          rewardLine={cs('celebrations_boon_chest_reward_line')}
          tapHint={cs('celebrations_boon_chest_tap_hint')}
          claimCta={cs('celebrations_boon_chest_claim_cta')}
          closeLabel={cs('celebrations_boon_chest_close_label')}
          onClaim={() => {}}
          onClose={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'celebrations-boon-activated',
      title: cs('celebrations_boon_activated_title'),
      detail: cs('celebrations_boon_activated_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <BoonActivatedModal visible={visible} boon="double_xp" onClose={onClose} />
      ),
    },
    {
      id: 'celebrations-boon-activated-hybrid',
      approval: 'pending',
      title: cs('celebrations_boon_activated_hybrid_title'),
      detail: cs('celebrations_boon_activated_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <BoonActivatedModal visible={visible} boon="double_xp" onClose={onClose} motionVariant="hybrid" />
      ),
    },
    {
      id: 'celebrations-weekly-boon-detail',
      title: cs('celebrations_weekly_boon_detail_title'),
      detail: cs('celebrations_weekly_boon_detail_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <WeeklyBoonDetailModal visible={visible} boon="mystery_monday" claimed={false} onClose={onClose} />
      ),
    },
    {
      id: 'celebrations-weekly-boon-detail-hybrid',
      approval: 'pending',
      title: cs('celebrations_weekly_boon_detail_hybrid_title'),
      detail: cs('celebrations_weekly_boon_detail_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <WeeklyBoonDetailModal visible={visible} boon="mystery_monday" claimed={false} onClose={onClose} motionVariant="hybrid" />
      ),
    },
    {
      id: 'celebrations-season-gift',
      title: cs('celebrations_season_gift_title'),
      detail: cs('celebrations_season_gift_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <SeasonGiftModal
          visible={visible}
          reward={DEMO_SEASON_REWARD}
          giftId={null}
          userName={cs('celebrations_demo_user_name')}
          onClose={onClose}
        />
      ),
    },
    {
      id: 'celebrations-season-gift-hybrid',
      approval: 'pending',
      title: cs('celebrations_season_gift_hybrid_title'),
      detail: cs('celebrations_season_gift_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <SeasonGiftModal
          visible={visible}
          reward={DEMO_SEASON_REWARD}
          giftId={null}
          userName={cs('celebrations_demo_user_name')}
          onClose={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'celebrations-season-reward-info',
      title: cs('celebrations_season_reward_info_title'),
      detail: cs('celebrations_season_reward_info_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <SeasonRewardInfoModal
          visible={visible}
          reward={DEMO_SEASON_REWARD}
          level={9}
          side="pass"
          status="claimable"
          onClose={onClose}
          onClaim={() => {}}
          onNeedPass={() => {}}
        />
      ),
    },
    {
      id: 'celebrations-season-reward-info-hybrid',
      approval: 'pending',
      title: cs('celebrations_season_reward_info_hybrid_title'),
      detail: cs('celebrations_season_reward_info_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <SeasonRewardInfoModal
          visible={visible}
          reward={DEMO_SEASON_REWARD}
          level={9}
          side="pass"
          status="claimable"
          onClose={onClose}
          onClaim={() => {}}
          onNeedPass={() => {}}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'celebrations-collectible-drop',
      title: cs('celebrations_collectible_drop_title'),
      detail: cs('celebrations_collectible_drop_detail'),
      kind: 'render',
      render: ({ onClose }) => (
        <CollectibleDropModal
          outcome={{
            cardId: 'animals_01',
            setId: 'set01_animals',
            rarity: 'common',
            setCompleted: false,
            secretCardId: null,
            bonusShards: 0,
          }}
          onClose={onClose}
        />
      ),
    },
    {
      id: 'celebrations-collectible-drop-hybrid',
      approval: 'pending',
      title: cs('celebrations_collectible_drop_hybrid_title'),
      detail: cs('celebrations_collectible_drop_detail'),
      kind: 'render',
      render: ({ onClose }) => (
        <CollectibleDropModal
          outcome={{
            cardId: 'animals_01',
            setId: 'set01_animals',
            rarity: 'common',
            setCompleted: false,
            secretCardId: null,
            bonusShards: 0,
          }}
          onClose={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'celebrations-roulette-win-modal',
      title: cs('celebrations_roulette_win_modal_title'),
      detail: cs('celebrations_roulette_win_modal_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <RouletteWinModal
          data={visible ? { prizeIndex: 0, prizeDays: 3, vipUntil: Date.now() + 3 * 86400000 } : null}
          onClose={onClose}
        />
      ),
    },
{
      id: 'celebrations-roulette-win-celebration',
      title: cs('celebrations_roulette_win_celebration_title'),
      detail: cs('celebrations_roulette_win_celebration_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <RouletteWinCelebration visible={visible} onComplete={onClose} />
      ),
    },
    {
      id: 'celebrations-referral-friend-reward',
      title: cs('celebrations_referral_friend_reward_title'),
      detail: cs('celebrations_referral_friend_reward_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ReferralFriendRewardModal
          data={visible ? { name: cs('celebrations_referral_friend_name') } : null}
          onClose={onClose}
          title={cs('celebrations_referral_friend_reward_modal_title')}
          subtitle={cs('celebrations_referral_friend_reward_modal_subtitle')}
          ctaLabel={cs('celebrations_referral_friend_reward_cta')}
        />
      ),
    },
    {
      id: 'celebrations-loyalty-gift',
      title: cs('celebrations_loyalty_gift_title'),
      kind: 'note',
      // зачем: компонент существует только в чужих заброшенных копиях дерева
      // (.claude/worktrees/…, .codex-tmp/…), в текущем рабочем дереве
      // components/LoyaltyGiftModal.tsx отсутствует — импортировать нечего.
      note: cs('celebrations_loyalty_gift_note'),
    },
    {
      id: 'celebrations-dialog-victory',
      title: cs('celebrations_dialog_victory_title'),
      detail: cs('celebrations_dialog_victory_detail'),
      kind: 'render',
      render: ({ onClose }) => (
        <DialogVictoryCelebration
          lang="ru"
          xp={120}
          replies={8}
          goalsMet={3}
          goalsTotal={3}
          heroIcon="ribbon"
          moodIcon="happy"
          onDone={onClose}
        />
      ),
    },
  ],
};
