// ─── Витрина движения · шард «Пейволы и Premium» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
import React from 'react';
import { useRouter } from 'expo-router';
import type { ShowcaseSection } from '../types';
import { emitAppEvent } from '../../../../app/events';
import IntroFullAccessModal from '../../../IntroFullAccessModal';
import NoEnergyModal from '../../../NoEnergyModal';
import PremiumCelebrationModal from '../../../PremiumCelebrationModal';
import VipCelebrationModal from '../../../VipCelebrationModal';
import StreakReviveModal from '../../../StreakReviveModal';
import CardPackShardPaywallModal from '../../../../app/flashcards/CardPackShardPaywallModal';
import type { StreakReviveOffer } from '../../../../app/streak_revive';
import type { FlashcardMarketPack } from '../../../../app/flashcards/marketplace';
import { cs } from '../showcase_copy';

// зачем: демо-оффер для StreakReviveModal — не пишет в AsyncStorage/Firestore,
// только пропс превью; onRevived/onClose ничего не мутируют.
const DEMO_STREAK_REVIVE_OFFER: StreakReviveOffer = {
  lostStreak: 14,
  missedDays: 1,
  lostAt: 1_755_000_000_000,
  expiresAt: 1_755_000_000_000 + 24 * 3_600_000,
  costShards: 30,
};

// зачем: демо-набор для CardPackShardPaywallModal — статичный объект, без чтения
// реального каталога/баланса; onConfirmPurchase/onGoToShards — пустые колбэки.
const DEMO_CARD_PACK: FlashcardMarketPack = {
  id: 'dev_showcase_demo_pack',
  codeName: cs('card_pack_demo_code_name'),
  titleRu: cs('card_pack_demo_title'),
  titleUk: 'Демонстраційний набір',
  titleEs: 'Paquete de demostración',
  descriptionRu: cs('card_pack_demo_description'),
  descriptionUk: 'Набір для вітрини руху — не бере участі в покупках.',
  descriptionEs: 'Paquete para la vitrina de movimiento — no participa en compras.',
  category: 'daily',
  cardCount: 20,
  priceShards: 40,
  salesCount: 0,
  authorName: 'Phraseman',
  isOfficial: true,
  updatedAt: new Date().toISOString(),
};

function PaywallDevPreviewRouteLauncher({ onClose }: { onClose: () => void }): React.ReactElement | null {
  const router = useRouter();
  React.useEffect(() => {
    router.push('/paywall_dev_preview' as never);
    onClose();
  }, [router, onClose]);
  return null;
}

export const SECTION: ShowcaseSection = {
  id: 'paywalls',
  order: 30,
  title: cs('paywalls_section_title'),
  items: [
    { id: 'paywall_a', title: cs('paywall_a_title'), detail: cs('real_screen'), kind: 'route', route: '/paywall_a' },
    { id: 'paywall_b', title: cs('paywall_b_title'), detail: cs('real_screen'), kind: 'route', route: '/paywall_b' },
    { id: 'paywall_c', title: cs('paywall_c_title'), detail: cs('real_screen'), kind: 'route', route: '/paywall_c' },
    { id: 'paywall_d', title: cs('paywall_d_title'), detail: cs('real_screen'), kind: 'route', route: '/paywall_d' },
    { id: 'paywall_e', title: cs('paywall_e_title'), detail: cs('real_screen'), kind: 'route', route: '/paywall_e' },
    { id: 'paywall_f', title: cs('paywall_f_title'), detail: cs('real_screen'), kind: 'route', route: '/paywall_f' },
    { id: 'paywall_g', title: cs('paywall_g_title'), detail: cs('real_screen'), kind: 'route', route: '/paywall_g' },
    {
      id: 'manage_subscription',
      title: cs('manage_subscription_title'),
      detail: cs('real_screen'),
      kind: 'route',
      route: '/manage_subscription',
    },
    {
      id: 'intro_full_access_welcome',
      title: cs('intro_full_access_welcome_title'),
      detail: cs('real_modal'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <IntroFullAccessModal visible={visible} variant="welcome" onPrimaryPress={onClose} onSecondaryPress={onClose} />
      ),
    },
    {
      id: 'intro_full_access_welcome_hybrid',
      approval: 'accepted',
      title: cs('intro_full_access_welcome_hybrid_title'),
      detail: cs('real_modal'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <IntroFullAccessModal
          visible={visible}
          variant="welcome"
          onPrimaryPress={onClose}
          onSecondaryPress={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'intro_full_access_ended',
      title: cs('intro_full_access_ended_title'),
      detail: cs('real_modal'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <IntroFullAccessModal visible={visible} variant="ended" onPrimaryPress={onClose} onSecondaryPress={onClose} />
      ),
    },
    {
      id: 'intro_full_access_ended_hybrid',
      approval: 'accepted',
      title: cs('intro_full_access_ended_hybrid_title'),
      detail: cs('real_modal'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <IntroFullAccessModal
          visible={visible}
          variant="ended"
          onPrimaryPress={onClose}
          onSecondaryPress={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'premium_modal',
      title: cs('premium_modal_title'),
      detail: cs('real_screen'),
      kind: 'route',
      route: '/premium_modal',
    },
    // ─── Празднования v6: все четыре тира + промокод ───
    // зачем: владелец проверяет каждый прогон вживую (2026-08-24). Каждый пункт
    // монтирует РЕАЛЬНУЮ модалку приложения с боевой хореографией, ничего не
    // начисляет и не пишет в AsyncStorage — onClose только закрывает превью.
    {
      id: 'premium_celebration',
      title: cs('premium_celebration_title'),
      detail: cs('celebration_full_detail'),
      approval: 'pending',
      kind: 'render',
      render: ({ visible, onClose }) => (
        <PremiumCelebrationModal visible={visible} onClose={onClose} variant="premium" />
      ),
    },
    {
      id: 'vip_celebration',
      title: cs('vip_celebration_title'),
      detail: cs('celebration_full_detail'),
      approval: 'pending',
      kind: 'render',
      render: ({ visible, onClose }) => <VipCelebrationModal visible={visible} onClose={onClose} />,
    },
    {
      id: 'pro_celebration',
      title: cs('pro_celebration_title'),
      detail: cs('celebration_full_detail'),
      approval: 'pending',
      kind: 'render',
      render: ({ visible, onClose }) => (
        <PremiumCelebrationModal visible={visible} onClose={onClose} variant="pro" />
      ),
    },
    {
      id: 'max_celebration',
      title: cs('max_celebration_title'),
      detail: cs('celebration_max_detail'),
      approval: 'pending',
      kind: 'render',
      render: ({ visible, onClose }) => (
        <PremiumCelebrationModal visible={visible} onClose={onClose} variant="max" />
      ),
    },
    {
      id: 'promo_celebration',
      title: cs('promo_celebration_title'),
      detail: cs('celebration_promo_detail'),
      approval: 'pending',
      kind: 'render',
      render: ({ visible, onClose }) => (
        <VipCelebrationModal visible={visible} onClose={onClose} promoCode="PHRASE30" />
      ),
    },
{
      id: 'no_energy_modal',
      title: cs('no_energy_modal_title'),
      detail: cs('real_modal'),
      kind: 'render',
      render: ({ visible, onClose }) => <NoEnergyModal visible={visible} onClose={onClose} />,
    },
    {
      id: 'streak_revive_modal',
      title: cs('streak_revive_modal_title'),
      detail: cs('streak_revive_modal_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <StreakReviveModal visible={visible} offer={DEMO_STREAK_REVIVE_OFFER} onClose={onClose} onRevived={() => {}} />
      ),
    },
    {
      id: 'streak_revive_offer_event',
      title: cs('streak_revive_offer_event_title'),
      detail: cs('real_event'),
      kind: 'event',
      fire: () => emitAppEvent('streak_revive_offer', { lostStreak: 14, missedDays: 1 }),
    },
    {
      id: 'card_pack_shard_paywall_confirm',
      title: cs('card_pack_shard_paywall_confirm_title'),
      detail: cs('card_pack_shard_paywall_demo_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <CardPackShardPaywallModal
          visible={visible}
          mode="confirm"
          pack={DEMO_CARD_PACK}
          balance={120}
          lang="ru"
          purchasing={false}
          onClose={onClose}
          onConfirmPurchase={() => {}}
          onGoToShards={() => {}}
        />
      ),
    },
    {
      id: 'card_pack_shard_paywall_insufficient',
      title: cs('card_pack_shard_paywall_insufficient_title'),
      detail: cs('card_pack_shard_paywall_demo_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <CardPackShardPaywallModal
          visible={visible}
          mode="insufficient"
          pack={DEMO_CARD_PACK}
          balance={5}
          lang="ru"
          purchasing={false}
          onClose={onClose}
          onConfirmPurchase={() => {}}
          onGoToShards={() => {}}
        />
      ),
    },
    {
      id: 'card_pack_shard_paywall_voucher',
      title: cs('card_pack_shard_paywall_voucher_title'),
      detail: cs('card_pack_shard_paywall_demo_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <CardPackShardPaywallModal
          visible={visible}
          mode="voucher"
          pack={DEMO_CARD_PACK}
          balance={120}
          lang="ru"
          purchasing={false}
          onClose={onClose}
          onConfirmPurchase={() => {}}
          onGoToShards={() => {}}
        />
      ),
    },
    {
      id: 'paywall_dev_preview_route',
      title: cs('paywall_dev_preview_route_title'),
      detail: cs('paywall_dev_preview_route_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (visible ? <PaywallDevPreviewRouteLauncher onClose={onClose} /> : null),
    },
    {
      id: 'arena_limit_modal',
      title: cs('arena_limit_modal_title'),
      kind: 'note',
      note: cs('arena_limit_modal_note'),
    },
    {
      id: 'energy_refill_shard_modal',
      title: cs('energy_refill_shard_modal_title'),
      kind: 'note',
      note: cs('energy_refill_shard_modal_note'),
    },
  ],
};
