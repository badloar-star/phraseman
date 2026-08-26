// ─── Витрина движения · шард «Празднование покупки» ───
// зачем (владелец 2026-08-25): выделено отдельным разделом из «Пейволы и
// Premium» — было пять строк среди пейволов и IntroFullAccess, владелец не
// смог их найти. Каждый пункт монтирует РЕАЛЬНУЮ модалку с боевой
// хореографией v6 «Золотая палата» (components/PremiumCelebrationModal.tsx),
// ничего не начисляет и не пишет в AsyncStorage — onClose только закрывает
// превью. id пунктов содержит "hybrid" — реестр (index.ts →
// isExecutableHybridItem) показывает в release-витрине ТОЛЬКО пункты с этим
// маркером; без него (как было раньше) строки были в коде, но не видны на
// экране. Это и есть причина, по которой раздел «не находился».
import React from 'react';
import type { ShowcaseSection } from '../types';
import PremiumCelebrationModal from '../../../PremiumCelebrationModal';
import VipCelebrationModal from '../../../VipCelebrationModal';
import { cs } from '../showcase_copy';

export const SECTION: ShowcaseSection = {
  id: 'purchase_celebration',
  order: 29,
  title: cs('purchase_celebration_section_title'),
  items: [
    {
      id: 'premium_celebration_hybrid',
      title: cs('premium_celebration_title'),
      detail: cs('celebration_full_detail'),
      approval: 'pending',
      kind: 'render',
      render: ({ visible, onClose }) => (
        <PremiumCelebrationModal visible={visible} onClose={onClose} variant="premium" />
      ),
    },
    {
      id: 'vip_celebration_hybrid',
      title: cs('vip_celebration_title'),
      detail: cs('celebration_full_detail'),
      approval: 'pending',
      kind: 'render',
      render: ({ visible, onClose }) => <VipCelebrationModal visible={visible} onClose={onClose} />,
    },
    {
      id: 'pro_celebration_hybrid',
      title: cs('pro_celebration_title'),
      detail: cs('celebration_full_detail'),
      approval: 'pending',
      kind: 'render',
      render: ({ visible, onClose }) => (
        <PremiumCelebrationModal visible={visible} onClose={onClose} variant="pro" />
      ),
    },
    {
      id: 'max_celebration_hybrid',
      title: cs('max_celebration_title'),
      detail: cs('celebration_max_detail'),
      approval: 'pending',
      kind: 'render',
      render: ({ visible, onClose }) => (
        <PremiumCelebrationModal visible={visible} onClose={onClose} variant="max" />
      ),
    },
    {
      id: 'promo_celebration_hybrid',
      title: cs('promo_celebration_title'),
      detail: cs('celebration_promo_detail'),
      approval: 'pending',
      kind: 'render',
      render: ({ visible, onClose }) => (
        <VipCelebrationModal visible={visible} onClose={onClose} promoCode="PHRASE30" />
      ),
    },
  ],
};
