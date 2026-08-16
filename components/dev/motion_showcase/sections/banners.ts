// ─── Витрина движения · шард «Баннеры» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
import React from 'react';
import type { ShowcaseSection } from '../types';
import OfflineBanner from '../../../OfflineBanner';
import PromoBanner from '../../../PromoBanner';
import SaveProgressBanner from '../../../SaveProgressBanner';
import RankChangeBanner from '../../../RankChangeBanner';
import ReferralInviteBannerArt from '../../../ReferralInviteBannerArt';
import { cs } from '../showcase_copy';

export const SECTION: ShowcaseSection = {
  id: 'banners',
  order: 55,
  title: cs('banners_section_title'),
  items: [
    {
      id: 'banner-offline',
      title: cs('banner_offline_title'),
      // зачем: компонент сам подписан на реальный net_status и решает свою
      // видимость — демо-обёртка не может «заставить» его показаться без
      // реального обрыва сети. Честно показываем текущее состояние сети.
      detail: cs('banner_offline_detail'),
      kind: 'render',
      render: () => React.createElement(OfflineBanner, { lang: 'ru' }),
    },
    // зачем: гибрид «Световод» рядом с боевым видом — motionVariant:'hybrid'
    // включает Reanimated-путь внутри реального OfflineBanner.
    {
      id: 'banner-offline-hybrid',
      title: cs('banner_offline_hybrid_title'),
      detail: cs('banner_offline_detail'),
      kind: 'render',
      render: () => React.createElement(OfflineBanner, { lang: 'ru', motionVariant: 'hybrid' }),
    },
    {
      id: 'banner-promo',
      title: cs('banner_promo_title'),
      // зачем: видимость зависит от remote_flags (isPromoBannerEnabled/until/
      // audience) и статуса дисмисса кампании — реальные проверки, без
      // моков. Если акция сейчас выключена/дисмиссена — баннер честно пуст.
      detail: cs('banner_promo_detail'),
      kind: 'render',
      render: () => React.createElement(PromoBanner),
    },
    {
      id: 'banner-promo-hybrid',
      title: cs('banner_promo_hybrid_title'),
      detail: cs('banner_promo_detail'),
      kind: 'render',
      render: () => React.createElement(PromoBanner, { motionVariant: 'hybrid' }),
    },
    {
      id: 'banner-save-progress',
      title: cs('banner_save_progress_title'),
      // зачем: shouldShow() читает реальные AsyncStorage/auth — условия
      // (XP >= 1000, не привязан, не дисмиссено 7 дней) либо выполняются на
      // текущем устройстве, либо нет. Ничего не мутирует при монтировании.
      detail: cs('banner_save_progress_detail'),
      kind: 'render',
      render: () => React.createElement(SaveProgressBanner, { ownerActive: true }),
    },
    {
      id: 'banner-save-progress-hybrid',
      title: cs('banner_save_progress_hybrid_title'),
      detail: cs('banner_save_progress_detail'),
      kind: 'render',
      render: () => React.createElement(SaveProgressBanner, { ownerActive: true, motionVariant: 'hybrid' }),
    },
    {
      id: 'banner-rank-change',
      title: cs('banner_rank_change_title'),
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
      id: 'banner-rank-change-hybrid',
      title: cs('banner_rank_change_hybrid_title'),
      detail: cs('arena_rank_change_banner_detail'),
      kind: 'render',
      render: ({ onClose }) => React.createElement(RankChangeBanner, {
        delta: 3,
        passedName: cs('arena_demo_opponent_name'),
        lostToName: null,
        lang: 'ru',
        duration: 0,
        onClose,
        motionVariant: 'hybrid',
      }),
    },
    {
      id: 'banner-referral-invite-art',
      title: cs('banner_referral_invite_art_title'),
      detail: cs('banner_referral_invite_art_detail'),
      kind: 'render',
      render: () => React.createElement(ReferralInviteBannerArt),
    },
  ],
};
