// ─── Витрина движения · шард «Уровень и спины» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
import React from 'react';
import { Animated } from 'react-native';
import LevelUpThresholdModal from '../../../LevelUpThresholdModal';
import LevelSpinRewardModal from '../../../LevelSpinRewardModal';
import { SpinRewardPlaque } from '../../../SpinRewardPlaque';
import type { GiftDef } from '../../../../app/level_gift_system';
import type { ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';

// Демо-подарок для превью LevelSpinRewardModal: чистые данные, без
// spinRewardReceipt/levelGiftReservation — модалка их не требует для показа,
// а claim-колбэк ниже пустой, так что реального списания/выдачи не будет.
const DEMO_GIFT: GiftDef = {
  id: 'xp_250',
  rarity: 'rare',
  icon: 'xp',
  titleRU: '+250 XP',
  titleUK: '+250 XP',
  descRU: cs('levelup_gift_desc_instant_xp'),
  descUK: '+250 XP миттєво',
  weight: 1,
};

// зачем: демо-версия LevelUpThresholdModal нужна своя пара Animated.Value —
// компонент их мутирует таймингами, общий инстанс на все пункты гонял бы
// анимацию сразу у всех превью.
function makeLevelUpDemoRender(variant: 'standard' | 'milestone') {
  return ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
    const opacity = new Animated.Value(1);
    const translateY = new Animated.Value(0);
    const glow = new Animated.Value(1);
    return React.createElement(LevelUpThresholdModal, {
      visible,
      variant,
      level: variant === 'milestone' ? 20 : 13,
      themeMode: 'indigo', // зачем: дефолтная бесплатная тема; тип ThemeMode не знает 'system'
      kicker: variant === 'milestone' ? cs('levelup_kicker_milestone') : cs('levelup_kicker_standard'),
      headline: cs('levelup_headline').replace('{level}', String(variant === 'milestone' ? 20 : 13)),
      message: variant === 'milestone'
        ? cs('levelup_message_milestone')
        : cs('levelup_message_standard'),
      xpLabel: cs('levelup_xp_label'),
      xpValue: cs('levelup_xp_value'),
      titleLabel: cs('levelup_title_label'),
      energyLabel: cs('levelup_energy_label'),
      energyValue: (amount: number) => cs('levelup_energy_value').replace('{amount}', String(amount)),
      spinReward: true,
      spinReceiptId: `motion-showcase-levelup-${variant}`,
      continueLabel: cs('levelup_continue_label'),
      opacity,
      translateY,
      glow,
      onShow: () => {},
      onContinue: onClose,
    });
  };
}

const renderLevelUpStandard = makeLevelUpDemoRender('standard');
const renderLevelUpMilestone = makeLevelUpDemoRender('milestone');

function renderSpinRewardModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return React.createElement(LevelSpinRewardModal, {
    visible,
    gift: DEMO_GIFT,
    giftId: DEMO_GIFT.id,
    lang: 'ru',
    isPremium: false,
    requestId: 'motion-showcase-spin-reward',
    // Пустые колбэки: витрина не пишет в инвентарь подарков и не тратит спин.
    onClaim: onClose,
    onClose,
  });
}

function renderSpinPlaque({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return React.createElement(SpinRewardPlaque, {
    amount: 1,
    receiptId: 'motion-showcase-spin-plaque',
    visible,
    onComplete: onClose,
    testID: 'motion-showcase-spin-plaque',
  });
}

export const SECTION: ShowcaseSection = {
  id: 'levelup_spins',
  order: 15,
  title: cs('levelup_spins_section_title'),
  items: [
    {
      id: 'levelup_threshold_standard',
      title: cs('levelup_threshold_standard_title'),
      detail: cs('real_modal'),
      kind: 'render',
      render: renderLevelUpStandard,
    },
    {
      id: 'levelup_threshold_milestone',
      title: cs('levelup_threshold_milestone_title'),
      detail: cs('real_modal'),
      kind: 'render',
      render: renderLevelUpMilestone,
    },
    {
      id: 'level_spin_reward_modal',
      title: cs('level_spin_reward_modal_title'),
      detail: cs('real_modal'),
      kind: 'render',
      render: renderSpinRewardModal,
    },
    {
      id: 'spin_reward_plaque',
      title: cs('spin_reward_plaque_title'),
      detail: cs('spin_reward_plaque_detail'),
      kind: 'render',
      render: renderSpinPlaque,
    },
    // Экраны /level_reward_spin и /level_gifts_inventory уже заведены
    // в шарде screens_profile.ts (та же семья, чужая зона) — не дублируем,
    // чтобы в реестре не было двух пунктов на один маршрут.
  ],
};
