// Секция QA-панели: наградные модалки, которых не было в панели до редизайна
// 2026-06. Все превью — с мок-данными, без реальных начислений.
import React, { useState } from 'react';
import ReleaseWaveBonusModal from '../../ReleaseWaveBonusModal';
import ShardRewardModal, { type ShardReward } from '../../ShardRewardModal';
import EnergyRefillShardModal from '../../EnergyRefillShardModal';
import ProfileCardUpgradeModal from '../../ProfileCardUpgradeModal';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';
import { qaToast } from '../qa_utils';

const SHARD_REWARD_PRESETS: { label: string; sub: string; rewards: ShardReward[] }[] = [
  {
    label: 'ShardReward: баг исправлен',
    sub: 'Legacy bottom-sheet наград за репорт (reason=bug_fixed)',
    rewards: [
      { id: 'qa-reward-bug', dataId: 'qa-bug-42', dataText: '«I am ready» — опечатка в переводе исправлена', count: 15, reason: 'bug_fixed' },
    ],
  },
  {
    label: 'ShardReward: предложение принято',
    sub: 'reason=suggestion_accepted',
    rewards: [
      { id: 'qa-reward-suggestion', dataId: 'qa-sugg-7', dataText: 'Предложение нового примера для урока 12 принято', count: 25, reason: 'suggestion_accepted' },
    ],
  },
  {
    label: 'ShardReward: admin grant ×2',
    sub: 'Две награды в одном списке (reason=admin_grant)',
    rewards: [
      { id: 'qa-reward-grant-1', dataId: 'qa-grant-1', dataText: 'Компенсация за сбой синхронизации', count: 40, reason: 'admin_grant' },
      { id: 'qa-reward-grant-2', dataId: 'qa-grant-2', dataText: 'Бонус за участие в бета-тесте', count: 20, reason: 'admin_grant' },
    ],
  },
];

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
}

export default function RewardModalsExtraSection({ open, onToggle }: Props) {
  const [releaseWaveVisible, setReleaseWaveVisible] = useState(false);
  const [shardRewards, setShardRewards] = useState<ShardReward[] | null>(null);
  const [energyRefillVisible, setEnergyRefillVisible] = useState(false);
  const [profileCardVisible, setProfileCardVisible] = useState(false);

  return (
    <AccordionSection
      id="reward_modals_extra"
      icon="diamond-outline"
      title="Наградные модалки (остальные)"
      badge={4 + SHARD_REWARD_PRESETS.length - 1}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>
        Наградные окна, которые раньше нельзя было вызвать из панели. Всё preview-only: claim-запросы не уходят.
      </AdminHint>
      <ButtonRow
        testID="admin-extra-release-wave"
        icon="megaphone-outline"
        label="ReleaseWaveBonusModal"
        sub="Релизный бонус (сейчас выключен флагом VERSION=0). previewMode — без claim."
        onPress={() => setReleaseWaveVisible(true)}
      />
      {SHARD_REWARD_PRESETS.map((preset) => (
        <ButtonRow
          key={preset.label}
          icon="sparkles-outline"
          label={preset.label}
          sub={preset.sub}
          onPress={() => setShardRewards(preset.rewards)}
        />
      ))}
      <ButtonRow
        testID="admin-extra-energy-refill"
        icon="battery-charging-outline"
        label="EnergyRefillShardModal"
        sub="Покупка энергии за осколки (долгий тап по индикатору энергии в проде). Читает реальный баланс."
        onPress={() => setEnergyRefillVisible(true)}
      />
      <ButtonRow
        testID="admin-extra-profile-card-upgrade"
        icon="id-card-outline"
        label="ProfileCardUpgradeModal (уровень 2)"
        sub="Bottom-sheet апгрейда карточки профиля. Рендерится только при ENABLE_DEV_TOOLS."
        onPress={() => setProfileCardVisible(true)}
      />

      <ReleaseWaveBonusModal
        visible={releaseWaveVisible}
        onClose={() => setReleaseWaveVisible(false)}
        previewMode
      />
      <ShardRewardModal
        visible={shardRewards !== null}
        rewards={shardRewards ?? []}
        onClose={() => setShardRewards(null)}
      />
      <EnergyRefillShardModal
        visible={energyRefillVisible}
        onClose={() => setEnergyRefillVisible(false)}
      />
      <ProfileCardUpgradeModal
        visible={profileCardVisible}
        level={2}
        snapshot={{ level: 2, theme: 'gold', motion: 'gleam', publicFocus: 'xp' }}
        onClose={() => setProfileCardVisible(false)}
        onUpgraded={(level) => {
          setProfileCardVisible(false);
          qaToast('success', `Карточка профиля улучшена до уровня ${level} (QA)`);
        }}
      />
    </AccordionSection>
  );
}
