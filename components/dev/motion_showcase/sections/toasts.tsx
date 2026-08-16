// ─── Витрина движения · шард «Тосты» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// Семья: ActionToast (5 типов через emitAppEvent('action_toast', …)),
// AchievementToast, MedalToast (демо-медаль), CoachToast, InGameToast — render
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
import CoachToast from '../../../CoachToast';
import InGameToast from '../../../InGameToast';

/** Обёртка-мост: MedalToast принимает Animated.Value (0→1) и themeMode из контекста темы. */
function MedalToastDemo({ onClose }: { onClose: () => void }) {
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
    />
  );
}

function CoachToastDemo({ onClose }: { onClose: () => void }) {
  return (
    <CoachToast
      category="verb"
      labelRu={cs('toasts_24')}
      labelUk={"неправильні дієслова"} // pairedUK: перевод рядом
      labelEs="verbos irregulares"
      labelPtBr="verbos irregulares"
      labelVi="động từ bất quy tắc"
      labelId="kata kerja tidak beraturan"
      labelTr="düzensiz fiiller"
      labelPl="czasowniki nieregularne"
      mistakeCount={4}
      weaknessScore={78}
      focusWords={['go — went', 'see — saw']}
      onDismiss={onClose}
    />
  );
}

function InGameToastDemo({ onClose }: { onClose: () => void }) {
  return (
    <InGameToast
      message={cs('toasts_25')}
      onHide={onClose}
      duration={3000}
      type="info"
    />
  );
}

export const SECTION: ShowcaseSection = {
  id: 'toasts',
  order: 50,
  title: cs('toasts_1'),
  items: [
    {
      id: 'action-toast-success',
      title: cs('toasts_2'),
      detail: cs('toasts_3'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', actionToastTri('success', copy('success_1'))),
    },
    {
      id: 'action-toast-error',
      title: cs('toasts_4'),
      detail: cs('toasts_5'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', actionToastTri('error', copy('error_1'))),
    },
    {
      id: 'action-toast-info',
      title: cs('toasts_6'),
      detail: cs('toasts_7'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', actionToastTri('info', copy('info_1'))),
    },
    {
      id: 'action-toast-warning',
      title: cs('toasts_8'),
      detail: cs('toasts_9'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', actionToastTri('warning', copy('warning_1'))),
    },
    {
      id: 'action-toast-reward',
      title: cs('toasts_10'),
      detail: cs('toasts_11'),
      kind: 'event',
      fire: () => emitAppEvent('action_toast', actionToastTri('reward', copy('reward_1'))),
    },
    {
      id: 'achievement-toast',
      title: cs('toasts_12'),
      kind: 'note',
      note: cs('toasts_13'),
    },
    {
      id: 'medal-toast',
      title: cs('toasts_14'),
      detail: cs('toasts_15'),
      kind: 'render',
      render: ({ visible, onClose }) => (visible ? <MedalToastDemo onClose={onClose} /> : null),
    },
    {
      id: 'coach-toast',
      title: cs('toasts_16'),
      detail: cs('toasts_17'),
      kind: 'render',
      render: ({ visible, onClose }) => (visible ? <CoachToastDemo onClose={onClose} /> : null),
    },
    {
      id: 'in-game-toast',
      title: cs('toasts_18'),
      detail: cs('toasts_19'),
      kind: 'render',
      render: ({ visible, onClose }) => (visible ? <InGameToastDemo onClose={onClose} /> : null),
    },
    {
      id: 'streak-risk-toast-host',
      title: cs('toasts_20'),
      kind: 'note',
      note: cs('toasts_21'),
    },
    {
      id: 'billing-issue-toast-host',
      title: cs('toasts_22'),
      kind: 'note',
      note: cs('toasts_23'),
    },
  ],
};
