// ─── Витрина движения · шард «Празднования и сундуки» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// .tsx (не .ts): render использует JSX (React.createElement напрямую тоже
// годится, но для читаемости демо-компонентов ниже используется JSX).
import React from 'react';
import type { ShowcaseSection } from '../types';
import RouletteWinModal from '../../../roulette_win_modal';
import RouletteWinCelebration from '../../../roulette_win_celebration';
import ReferralFriendRewardModal from '../../../referral_friend_reward_modal';
import { DialogVictoryCelebration } from '../../../DialogVictoryCelebration';
import { cs } from '../showcase_copy';

// ── Демо-данные: НЕ мутируют прогресс/деньги/сеть. Только статичные объекты
// и пустые колбэки там, где реальный пропс мог бы что-то начислить/списать. ──


export const SECTION: ShowcaseSection = {
  id: 'celebrations',
  order: 10,
  title: cs('celebrations_section_title'),
  items: [
    // D140 (владелец 2026-10-01): дроп карточки коллекции удалён вместе с разделом.
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
