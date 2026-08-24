// ─── Витрина движения · шард «Тосты» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// Семья: ActionToast (5 типов через emitAppEvent('action_toast', …)),
// AchievementToast, MedalToast (демо-медаль), InGameToast — render
// с демо-пропсами; StreakRiskToastHost/BillingIssueToastHost — фоновые хосты
// без своего UI, поэтому note с честной причиной (условия показа завязаны на
// время суток / AsyncStorage / RevenueCat, безопасного мгновенного триггера нет).
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import type { ShowcaseSection } from '../types';
import { copy } from './toasts_copy';
import { cs } from '../showcase_copy';
import { actionToastTri, emitAppEvent } from '../../../../app/events';
import { useTheme } from '../../../ThemeContext';
import { useLang } from '../../../LangContext';
import MedalToast from '../../../MedalToast';
import InGameToast from '../../../InGameToast';

/** Обёртка-мост: MedalToast принимает Animated.Value (0→1) и themeMode из контекста темы.
 * зачем: motionVariant опционален — classic-вызов ниже передаёт демо-пружину anim как
 * раньше, гибрид-вызов рядом просто добавляет проп, сам MedalToast решает какой путь идёт. */
function MedalToastDemo({ onClose, motionVariant = 'classic' }: { onClose: () => void; motionVariant?: 'classic' | 'hybrid' }) {
  const { themeMode, theme: t } = useTheme();
  const { lang } = useLang();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
  }, [anim]);
  return (
    <MedalToast
      tier="gold"
      promoted
      anim={anim}
      bg={t.bgCard}
      isLightTheme={false}
      themeMode={themeMode}
      lang={lang}
      spanishUiActive={false}
      onDismiss={onClose}
      motionVariant={motionVariant}
    />
  );
}

function InGameToastDemo({ onClose, motionVariant = 'classic' }: { onClose: () => void; motionVariant?: 'classic' | 'hybrid' }) {
  return (
    <InGameToast
      message={cs('in_game_toast_demo_message')}
      onHide={onClose}
      duration={3000}
      type="info"
      motionVariant={motionVariant}
    />
  );
}

export const SECTION: ShowcaseSection = {
  id: 'toasts',
  order: 50,
  title: cs('toasts_section_title'),
  items: [
    {
      id: 'action-toast-success',
      title: cs('toast_success_title'),
      detail: cs('real_event'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', actionToastTri('success', copy('success_1'))),
    },
    // зачем: гибрид «Световод + Чекан» рядом с боевым видом — motionVariant:'hybrid' в
    // payload включает ActionToastHybridCard, боевые эмиты этого поля не передают.
    {
      id: 'action-toast-success-hybrid',
      approval: 'pending',
      title: cs('toast_success_hybrid_title'),
      detail: cs('real_event'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', { ...actionToastTri('success', copy('success_1')), motionVariant: 'hybrid' }),
    },
    {
      id: 'action-toast-error',
      title: cs('toast_error_title'),
      detail: cs('real_event'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', actionToastTri('error', copy('error_1'))),
    },
    {
      id: 'action-toast-error-hybrid',
      approval: 'pending',
      title: cs('toast_error_hybrid_title'),
      detail: cs('real_event'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', { ...actionToastTri('error', copy('error_1')), motionVariant: 'hybrid' }),
    },
    {
      id: 'action-toast-info',
      title: cs('toast_info_title'),
      detail: cs('real_event'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', actionToastTri('info', copy('info_1'))),
    },
    {
      id: 'action-toast-info-hybrid',
      approval: 'pending',
      title: cs('toast_info_hybrid_title'),
      detail: cs('real_event'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', { ...actionToastTri('info', copy('info_1')), motionVariant: 'hybrid' }),
    },
    {
      id: 'action-toast-warning',
      title: cs('toast_warning_title'),
      detail: cs('real_event'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', actionToastTri('warning', copy('warning_1'))),
    },
    {
      id: 'action-toast-warning-hybrid',
      approval: 'pending',
      title: cs('toast_warning_hybrid_title'),
      detail: cs('real_event'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', { ...actionToastTri('warning', copy('warning_1')), motionVariant: 'hybrid' }),
    },
    {
      id: 'action-toast-reward',
      title: cs('toast_reward_title'),
      detail: cs('real_event'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', actionToastTri('reward', copy('reward_1'))),
    },
    {
      id: 'action-toast-reward-hybrid',
      approval: 'pending',
      title: cs('toast_reward_hybrid_title'),
      detail: cs('real_event'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', { ...actionToastTri('reward', copy('reward_1')), motionVariant: 'hybrid' }),
    },
    {
      id: 'achievement-toast',
      title: cs('achievement_toast_title'),
      kind: 'note',
      note: cs('achievement_toast_note'),
    },
    {
      id: 'achievement-toast-hybrid',
      approval: 'pending',
      title: cs('achievement_toast_hybrid_title'),
      kind: 'note',
      note: cs('achievement_toast_hybrid_note'),
    },
    {
      id: 'medal-toast',
      title: cs('medal_toast_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (visible ? <MedalToastDemo onClose={onClose} /> : null),
    },
    {
      id: 'medal-toast-hybrid',
      approval: 'pending',
      title: cs('medal_toast_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (visible ? <MedalToastDemo onClose={onClose} motionVariant="hybrid" /> : null),
    },
    {
      id: 'in-game-toast',
      title: cs('in_game_toast_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (visible ? <InGameToastDemo onClose={onClose} /> : null),
    },
    {
      id: 'in-game-toast-hybrid',
      approval: 'pending',
      title: cs('in_game_toast_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (visible ? <InGameToastDemo onClose={onClose} motionVariant="hybrid" /> : null),
    },
    {
      id: 'streak-risk-toast-host',
      title: cs('streak_risk_toast_host_title'),
      kind: 'note',
      note: cs('streak_risk_toast_host_note'),
    },
    {
      id: 'billing-issue-toast-host',
      title: cs('billing_issue_toast_host_title'),
      kind: 'note',
      note: cs('billing_issue_toast_host_note'),
    },
  ],
};
