// Секция QA-панели: «🆕 UX-обновление — модалы и тосты».
// Живые превью модалов, изменённых в недавнем UX-апдейте, плюс все варианты
// ActionToast. Всё preview-only: мок-пропсы, без записей в AsyncStorage/
// Firestore и без реальных начислений. Модалы с уже рабочим превью в других
// секциях (NoEnergy, LevelGift/Dual, LeagueChest/LeagueBonusAvailable,
// GlobalBroadcast, NotificationPermission, VipSurvey/ReviewPrompt,
// ThemedChoice, CertificateName, ExplainSheet, EnergyRefillShard) сюда
// не дублируются.
import React, { useState } from 'react';
import { useLang } from '../../LangContext';
import { useTheme } from '../../ThemeContext';
import { triLang } from '../../../constants/i18n';
import CollectibleDropModal from '../../CollectibleDropModal';
import BoonChestModal from '../../BoonChestModal';
import BoonActivatedModal from '../../BoonActivatedModal';
import StreakReviveModal from '../../StreakReviveModal';
import MistakeEli5Modal, { type MistakeEli5State } from '../../MistakeEli5Modal';
import ThemedConfirmModal from '../../ThemedConfirmModal';
import { AvatarEditorSheet } from '../../customization/AvatarEditorSheet';
import { CustomizationPurchaseConfirmModal } from '../../customization/CustomizationPurchaseConfirmModal';
import CardPackShardPaywallModal, {
  type CardPackPaywallMode,
} from '../../../app/flashcards/CardPackShardPaywallModal';
import type { FlashcardMarketPack } from '../../../app/flashcards/marketplace';
import { ReferralAccessActivatedModal } from '../../../app/referral_access_activated_modal';
import { ReferralAccessEndedModal } from '../../../app/referral_access_ended_modal';
import { enqueueThemedBlockingInfoAlert } from '../../../app/themed_blocking_alert_queue';
import { actionToastTri, emitAppEvent } from '../../../app/events';
import type { StreakReviveOffer } from '../../../app/streak_revive';
import {
  COLLECTIBLE_SETS,
  type CollectibleRarity,
} from '../../../app/collectibles/catalog';
import type { CollectibleDropOutcome } from '../../../app/collectibles/storage';
import { getThemedShardIcon } from '../../../constants/levelGiftRewardIcons';
import {
  CUSTOM_AVATAR_GRADIENTS,
  CUSTOM_AVATAR_SHOP,
  customAvatarGradientNameForLang,
  type CustomAvatarLogoColor,
} from '../../../constants/custom_avatars';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';
import { qaToast } from '../qa_utils';

// ─── Моки ────────────────────────────────────────────────────────────────────

/** Первая карточка указанной редкости + её сет (для мок-outcome дропа). */
function findFirstCardByRarity(rarity: CollectibleRarity): { setId: string; cardId: string } | null {
  for (const set of COLLECTIBLE_SETS) {
    const card = set.cards.find((c) => c.rarity === rarity);
    if (card) return { setId: set.setId, cardId: card.id };
  }
  return null;
}

function buildDropOutcome(rarity: CollectibleRarity): CollectibleDropOutcome | null {
  const hit = findFirstCardByRarity(rarity);
  if (!hit) return null;
  return { cardId: hit.cardId, setId: hit.setId, rarity, setCompleted: false, secretCardId: null, bonusShards: 0 };
}

function buildSetCompletedOutcome(): CollectibleDropOutcome | null {
  const setWithSecret = COLLECTIBLE_SETS.find((s) => s.cards.length > 0 && s.secret);
  if (!setWithSecret) return null;
  const lastCard = setWithSecret.cards[setWithSecret.cards.length - 1];
  return {
    cardId: lastCard.id,
    setId: setWithSecret.setId,
    rarity: lastCard.rarity,
    setCompleted: true,
    secretCardId: setWithSecret.secret.id,
    bonusShards: 15,
  };
}

/** Свежий мок оффера восстановления стрика (без записи в сторадж). */
function buildMockReviveOffer(): StreakReviveOffer {
  return {
    lostStreak: 47,
    lostAt: Date.now() - 36 * 60 * 60 * 1000,
    expiresAt: Date.now() + 12 * 60 * 60 * 1000,
    missedDays: 2,
    costShards: 50,
  };
}

const MOCK_PACK: FlashcardMarketPack = {
  id: 'qa-ux-preview-pack',
  codeName: 'QA Preview',
  titleRu: 'Деловой английский: переговоры',
  titleUk: 'Ділова англійська: переговори',
  titleEs: 'Inglés de negocios: negociaciones',
  descriptionRu: '40 карточек для уверенных переговоров: встречи, звонки и письма.',
  descriptionUk: '40 карток для впевнених переговорів: зустрічі, дзвінки та листи.',
  descriptionEs: '40 tarjetas para negociar con confianza: reuniones, llamadas y correos.',
  category: 'business',
  cardCount: 40,
  priceShards: 120,
  salesCount: 128,
  authorName: 'Phraseman',
  isOfficial: true,
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const MOCK_ELI5_TEXT =
  'Представь, что ты обещаешь другу: «Я точно приду!». По-английски это звучит «I will come». ' +
  'А когда просто рассказываешь о планах — «I am going to come». Маленькая разница, а смысл другой.';

type ActionToastType = 'success' | 'error' | 'info' | 'reward';

const ACTION_TOAST_PREVIEWS: { type: ActionToastType; icon: string; label: string; sub: string }[] = [
  { type: 'success', icon: 'checkmark-circle-outline', label: 'ActionToast — success', sub: 'Зелёный тон «Готово»' },
  { type: 'error', icon: 'alert-circle-outline', label: 'ActionToast — error', sub: 'Красный тон «Что-то пошло не так»' },
  { type: 'info', icon: 'information-circle-outline', label: 'ActionToast — info', sub: 'Нейтральный информационный тон' },
  { type: 'reward', icon: 'gift-outline', label: 'ActionToast — reward', sub: 'Наградной тон (единственное превью этого варианта в панели)' },
];

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
}

export default function UxOverhaulModalsSection({ open, onToggle }: Props) {
  const { lang } = useLang();
  const { theme: t, themeMode } = useTheme();

  const [dropOutcome, setDropOutcome] = useState<CollectibleDropOutcome | null>(null);
  const [boonChestVisible, setBoonChestVisible] = useState(false);
  const [boonActivatedVisible, setBoonActivatedVisible] = useState(false);
  const [reviveOffer, setReviveOffer] = useState<StreakReviveOffer | null>(null);
  const [confirmVariant, setConfirmVariant] = useState<null | 'default' | 'accent'>(null);
  const [eli5, setEli5] = useState<{ state: MistakeEli5State; text: string | null } | null>(null);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarGradientId, setAvatarGradientId] = useState<string>(CUSTOM_AVATAR_GRADIENTS[0].id);
  const [avatarLogoColor, setAvatarLogoColor] = useState<CustomAvatarLogoColor>('black');
  const [customPurchaseOpen, setCustomPurchaseOpen] = useState(false);
  const [packPaywall, setPackPaywall] = useState<{ mode: CardPackPaywallMode; balance: number } | null>(null);
  const [refActivated, setRefActivated] = useState<{ grantedDays: number; friendsCount: number; untilLabel: string } | null>(null);
  const [refEndedOpen, setRefEndedOpen] = useState(false);

  const L = (
    ru: string, uk: string, es: string, ptBr: string,
    vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  const fireActionToast = (type: ActionToastType) => {
    emitAppEvent('action_toast', actionToastTri(type, {
      ru: `Проверка ActionToast: ${type.toUpperCase()}`,
      uk: `Перевірка ActionToast: ${type.toUpperCase()}`,
      es: `Prueba ActionToast: ${type.toUpperCase()}`,
      'pt-BR': `Teste ActionToast: ${type.toUpperCase()}`,
      vi: `Kiểm tra ActionToast: ${type.toUpperCase()}`,
      id: `Uji ActionToast: ${type.toUpperCase()}`,
      tr: `ActionToast testi: ${type.toUpperCase()}`,
      pl: `Test ActionToast: ${type.toUpperCase()}`,
    }));
  };

  return (
    <AccordionSection
      id="ux_overhaul_modals"
      icon="sparkles-outline"
      title="🆕 UX-обновление — модалы и тосты"
      badge={22}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>
        Живые превью окон после UX-апдейта: мок-данные, ничего не пишется в сторадж/Firestore,
        начислений нет. Что уже покрыто другими секциями (NoEnergy, LevelGift, сундук/бонус лиги,
        GlobalBroadcast, промпт уведомлений, VIP-опрос, ThemedChoice, сертификат, ExplainSheet,
        EnergyRefillShard) — здесь не дублируется.
      </AdminHint>

      {/* ── Тосты: все варианты ActionToast ── */}
      {ACTION_TOAST_PREVIEWS.map((p) => (
        <ButtonRow
          key={`action_toast_${p.type}`}
          testID={`admin-ux-toast-${p.type}`}
          icon={p.icon}
          label={p.label}
          sub={p.sub}
          onPress={() => fireActionToast(p.type)}
        />
      ))}

      {/* ── Коллекция: дроп карточки (tilt отключён) ── */}
      <ButtonRow
        testID="admin-ux-collectible-legendary"
        icon="star-outline"
        label="CollectibleDropModal — легендарная"
        sub="«Новая карточка» без tilt-вращения (tiltEnabled=false зашит в модал)"
        onPress={() => {
          const outcome = buildDropOutcome('legendary');
          if (outcome) setDropOutcome(outcome);
          else qaToast('error', 'QA: в каталоге нет легендарной карточки');
        }}
      />
      <ButtonRow
        testID="admin-ux-collectible-set-completed"
        icon="trophy-outline"
        label="CollectibleDropModal — сет собран"
        sub="Секретная карточка + блок бонусного жемчуга"
        onPress={() => {
          const outcome = buildSetCompletedOutcome();
          if (outcome) setDropOutcome(outcome);
          else qaToast('error', 'QA: в каталоге нет сета с секреткой');
        }}
      />

      {/* ── Буны ── */}
      <ButtonRow
        testID="admin-ux-boon-chest"
        icon="cube-outline"
        label="BoonChestModal"
        sub="Сундук недели/идеальной недели: парение → тап → орб с жемчужиной. Claim не начисляет."
        onPress={() => setBoonChestVisible(true)}
      />
      <ButtonRow
        testID="admin-ux-boon-activated"
        icon="flash-outline"
        label="BoonActivatedModal"
        sub="«Тихий» бонус дня (мок: ×2 XP) — иконка, свечение, без сундука"
        onPress={() => setBoonActivatedVisible(true)}
      />

      {/* ── Стрик ── */}
      <ButtonRow
        testID="admin-ux-streak-revive"
        icon="flame-outline"
        label="StreakReviveModal — drag-to-dismiss"
        sub="Шторка восстановления стрика (мок: 47 дней, 50 жемчужин). ⚠️ «Восстановить» внутри настоящая — без реального оффера просто вернёт no_offer."
        onPress={() => setReviveOffer(buildMockReviveOffer())}
      />

      {/* ── Единый стандарт кнопок ── */}
      <ButtonRow
        testID="admin-ux-themed-confirm-default"
        icon="checkbox-outline"
        label="ThemedConfirmModal — default"
        sub="Единый стандарт подтверждений (вариант default)"
        onPress={() => setConfirmVariant('default')}
      />
      <ButtonRow
        testID="admin-ux-themed-confirm-accent"
        icon="color-wand-outline"
        label="ThemedConfirmModal — accent"
        sub="Тот же стандарт, акцентная кнопка подтверждения"
        onPress={() => setConfirmVariant('accent')}
      />
      <ButtonRow
        testID="admin-ux-blocking-alert"
        icon="alert-outline"
        label="ThemedBlockingAlertHost"
        sub="Блокирующий инфо-диалог через enqueueThemedBlockingInfoAlert (хост из _layout)"
        onPress={() => {
          void enqueueThemedBlockingInfoAlert(
            'Превью: блокирующий диалог',
            'Так выглядит ThemedBlockingAlertHost — единый стандарт системных сообщений без нативного Alert.',
            'Понятно',
          );
        }}
      />

      {/* ── Шторки разбора ошибки ── */}
      <ButtonRow
        testID="admin-ux-eli5-ready"
        icon="bulb-outline"
        label="MistakeEli5Modal — готово"
        sub="Drag-to-dismiss шторка «Объясни просто» с мок-текстом (без запроса к CF)"
        onPress={() => setEli5({ state: 'ready', text: MOCK_ELI5_TEXT })}
      />
      <ButtonRow
        testID="admin-ux-eli5-error"
        icon="cloud-offline-outline"
        label="MistakeEli5Modal — ошибка"
        sub="Состояние ошибки; «Повторить» переключит на готовый мок-текст"
        onPress={() => setEli5({ state: 'error', text: null })}
      />

      {/* ── Кастомизация ── */}
      <ButtonRow
        testID="admin-ux-avatar-editor"
        icon="person-circle-outline"
        label="AvatarEditorSheet — drag-to-dismiss"
        sub="Шторка редактора кастомного аватара (мок: первый аватар магазина). «Применить» ничего не сохраняет."
        onPress={() => setAvatarEditorOpen(true)}
      />
      <ButtonRow
        testID="admin-ux-customization-purchase"
        icon="cart-outline"
        label="CustomizationPurchaseConfirmModal"
        sub="Обёртка над ThemedConfirmModal (accent) для покупок кастомизации"
        onPress={() => setCustomPurchaseOpen(true)}
      />

      {/* ── Пейвол пака карточек за жемчуг ── */}
      <ButtonRow
        testID="admin-ux-pack-paywall-confirm"
        icon="albums-outline"
        label="CardPackShardPaywallModal — покупка"
        sub="Drag-to-dismiss шторка, баланса хватает (мок: 500 💎 за пак 120 💎). Покупка не выполняется."
        onPress={() => setPackPaywall({ mode: 'confirm', balance: 500 })}
      />
      <ButtonRow
        testID="admin-ux-pack-paywall-insufficient"
        icon="wallet-outline"
        label="CardPackShardPaywallModal — не хватает"
        sub="Вариант insufficient (мок: 30 💎) с переходом в магазин жемчуга (в превью отключён)"
        onPress={() => setPackPaywall({ mode: 'insufficient', balance: 30 })}
      />
      <ButtonRow
        testID="admin-ux-pack-paywall-voucher"
        icon="ticket-outline"
        label="CardPackShardPaywallModal — ваучер"
        sub="Вариант voucher: бесплатный набор по 48-часовому подарку"
        onPress={() => setPackPaywall({ mode: 'voucher', balance: 500 })}
      />

      {/* ── Реферальные модалы (не роуты — именованные компоненты с route-shim) ── */}
      <ButtonRow
        testID="admin-ux-referral-activated-14"
        icon="gift-outline"
        label="ReferralAccessActivated — 14 дней / 2 друга"
        sub="Праздничный модал активации реферального доступа"
        onPress={() => setRefActivated({ grantedDays: 14, friendsCount: 2, untilLabel: 'до 24 июня' })}
      />
      <ButtonRow
        testID="admin-ux-referral-activated-30"
        icon="gift"
        label="ReferralAccessActivated — 30 дней / 5 друзей"
        sub="Вариант с большим числом друзей (проверка плюрализации)"
        onPress={() => setRefActivated({ grantedDays: 30, friendsCount: 5, untilLabel: 'до 10 июля' })}
      />
      <ButtonRow
        testID="admin-ux-referral-ended"
        icon="time-outline"
        label="ReferralAccessEndedModal"
        sub="«Доступ можно открыть снова»: CTA на инвайт/пейвол в превью отключены"
        onPress={() => setRefEndedOpen(true)}
      />

      {/* ── Хосты превью ── */}
      <CollectibleDropModal
        outcome={dropOutcome}
        onClose={() => setDropOutcome(null)}
        onOpenCollection={() => {
          setDropOutcome(null);
          qaToast('info', 'QA: переход «В коллекцию» отключён в превью');
        }}
      />
      <BoonChestModal
        visible={boonChestVisible}
        rarity="epic"
        rewardIcon={getThemedShardIcon(themeMode)}
        title="Сундук идеальной недели"
        rewardLine="25 жемчужин — теперь твои (превью, без начисления)"
        tapHint="Нажми, чтобы открыть"
        claimCta="Забрать"
        closeLabel="Закрыть"
        onClaim={() => {
          setBoonChestVisible(false);
          qaToast('success', 'QA: «Забрать» нажато — начисления нет');
        }}
        onClose={() => setBoonChestVisible(false)}
      />
      <BoonActivatedModal
        visible={boonActivatedVisible}
        boon={boonActivatedVisible ? 'double_xp' : null}
        onClose={() => setBoonActivatedVisible(false)}
      />
      <StreakReviveModal
        visible={reviveOffer !== null}
        offer={reviveOffer}
        onClose={() => setReviveOffer(null)}
      />
      <ThemedConfirmModal
        visible={confirmVariant !== null}
        title="Удалить пак карточек?"
        message="Это превью ThemedConfirmModal — единый стандарт кнопок подтверждения."
        cancelLabel="Отмена"
        confirmLabel={confirmVariant === 'accent' ? 'Оформить' : 'Удалить'}
        onCancel={() => setConfirmVariant(null)}
        onConfirm={() => {
          setConfirmVariant(null);
          qaToast('info', 'QA: подтверждение нажато — действия нет');
        }}
        confirmVariant={confirmVariant ?? 'default'}
      />
      <MistakeEli5Modal
        visible={eli5 !== null}
        onClose={() => setEli5(null)}
        lang={lang}
        state={eli5?.state ?? 'idle'}
        text={eli5?.text ?? null}
        onRetry={() => setEli5({ state: 'ready', text: MOCK_ELI5_TEXT })}
      />
      <AvatarEditorSheet
        visible={avatarEditorOpen}
        avatar={CUSTOM_AVATAR_SHOP[0] ?? null}
        gradientId={avatarGradientId}
        logoColor={avatarLogoColor}
        owned
        title="Настроить аватар"
        applyLabel="Применить стиль"
        darkLabel="Тёмный"
        lightLabel="Светлый"
        gradientLabel={(id) =>
          customAvatarGradientNameForLang(
            CUSTOM_AVATAR_GRADIENTS.find((g) => g.id === id) ?? CUSTOM_AVATAR_GRADIENTS[0],
            lang,
          )
        }
        onGradientChange={setAvatarGradientId}
        onLogoColorChange={setAvatarLogoColor}
        onConfirm={() => {
          setAvatarEditorOpen(false);
          qaToast('success', 'QA: стиль применён только в превью');
        }}
        onClose={() => setAvatarEditorOpen(false)}
      />
      <CustomizationPurchaseConfirmModal
        visible={customPurchaseOpen}
        title="Купить рамку «Аврора»?"
        message="Превью обёртки подтверждения покупки кастомизации (ThemedConfirmModal, accent)."
        cancelLabel="Отмена"
        confirmLabel="Купить"
        onCancel={() => setCustomPurchaseOpen(false)}
        onConfirm={() => {
          setCustomPurchaseOpen(false);
          qaToast('info', 'QA: покупка не выполняется в превью');
        }}
      />
      {packPaywall && (
        <CardPackShardPaywallModal
          visible
          mode={packPaywall.mode}
          pack={MOCK_PACK}
          balance={packPaywall.balance}
          lang={lang}
          purchasing={false}
          onClose={() => setPackPaywall(null)}
          onConfirmPurchase={() => {
            setPackPaywall(null);
            qaToast('info', 'QA: покупка пака не выполняется в превью');
          }}
          onGoToShards={() => {
            setPackPaywall(null);
            qaToast('info', 'QA: переход в магазин жемчуга отключён в превью');
          }}
        />
      )}
      <ReferralAccessActivatedModal
        visible={refActivated !== null}
        grantedDays={refActivated?.grantedDays ?? 0}
        friendsCount={refActivated?.friendsCount ?? 0}
        untilLabel={refActivated?.untilLabel}
        onClose={() => setRefActivated(null)}
        L={L}
        t={t}
      />
      <ReferralAccessEndedModal
        visible={refEndedOpen}
        onInviteFriend={() => {
          setRefEndedOpen(false);
          qaToast('info', 'QA: «Позвать друга» отключено в превью');
        }}
        onOpenFullAccess={() => {
          setRefEndedOpen(false);
          qaToast('info', 'QA: переход на пейвол отключён в превью');
        }}
        onClose={() => setRefEndedOpen(false)}
        L={L}
        t={t}
      />
    </AccordionSection>
  );
}
