// ─── Витрина движения · шард «Согласия и объяснения» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// Семья: AiConsentSheetModal (общий движок) через двух потребителей
// (AiDialogConsentModal / AiExplainConsentModal), NotificationPermissionModal,
// MistakeEli5Modal, ExplainSheet. У всех render-компонентов колбэки-пустышки —
// открытие витрины не должно писать в Firestore/менять реальные настройки.
import React from 'react';
import type { ShowcaseSection } from '../types';
import type { Lang } from '../../../../constants/i18n';
import AiDialogConsentModal from '../../../AiDialogConsentModal';
import AiExplainConsentModal from '../../../AiExplainConsentModal';
import NotificationPermissionModal from '../../../NotificationPermissionModal';
import MistakeEli5Modal from '../../../MistakeEli5Modal';
import OnboardingWelcomeSheet from '../../../OnboardingWelcomeSheet';
import YoutubeChannelPickerSheet from '../../../youtube/YoutubeChannelPickerSheet';
import DeckPickerSheet from '../../../../app/flashcards/DeckPickerSheet';
import SectionSheetHeader from '../../../SectionSheetHeader';
import { useTheme } from '../../../ThemeContext';
import { cs } from '../showcase_copy';

const DEMO_LANG = 'ru' as Lang;

const DEMO_MISTAKE_TEXT = cs('consent_mistake_demo_text');

/** Демо-манифест для YoutubeChannelPickerSheet — один канал, без сети. */
const DEMO_YOUTUBE_MANIFEST = {
  schemaVersion: 1 as const,
  activeVersion: 'showcase-demo',
  generatedAt: new Date().toISOString(),
  sourceRefreshedAt: new Date().toISOString(),
  defaultChannelId: 'demo-channel',
  localeDefaults: {},
  channels: [
    {
      id: 'demo-channel',
      displayName: cs('youtube_channel_picker_sheet_demo_channel'),
      languageTags: ['ru'],
      order: 0,
    },
  ],
};

/** Демо-наборы для DeckPickerSheet — безопасные deckId ('saved'/'custom'), онбординг ничего не начисляет. */
const DEMO_FC_DECKS = [
  { deckId: 'saved' as const, title: cs('fc_deck_picker_sheet_demo_saved'), count: 12, icon: 'bookmark' as const },
  { deckId: 'custom' as const, title: cs('fc_deck_picker_sheet_demo_custom'), count: 8, icon: 'layers' as const },
];

/** SectionSheetHeader сам не рендерит подложку/крестик-фон — оборачиваем в лёгкий фон для превью. */
function SectionSheetHeaderPreview({ hybrid }: { hybrid: boolean }) {
  return (
    <SectionSheetHeader
      title={cs('section_sheet_header_demo_title')}
      onClose={() => {}}
      showDivider
      motionVariant={hybrid ? 'hybrid' : 'classic'}
    />
  );
}

/** DeckPickerSheet ждёт t/f из useTheme() — витрина использует реальную тему, не заглушку. */
function DeckPickerSheetPreview({ visible, onClose, hybrid }: { visible: boolean; onClose: () => void; hybrid: boolean }) {
  const { theme: t, f } = useTheme();
  return (
    <DeckPickerSheet
      visible={visible}
      onClose={onClose}
      onStart={() => onClose()}
      decks={DEMO_FC_DECKS}
      lang={DEMO_LANG}
      t={t}
      f={f}
      motionVariant={hybrid ? 'hybrid' : 'classic'}
    />
  );
}

export const SECTION: ShowcaseSection = {
  id: 'consent_info',
  order: 40,
  title: cs('consent_info_section_title'),
  items: [
    {
      id: 'ai-dialog-consent',
      title: cs('ai_dialog_consent_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <AiDialogConsentModal
          visible={visible}
          lang={DEMO_LANG}
          onAccept={onClose}
          onDecline={onClose}
        />
      ),
    },
    {
      id: 'ai-dialog-consent-hybrid',
      title: cs('ai_dialog_consent_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <AiDialogConsentModal
          visible={visible}
          lang={DEMO_LANG}
          onAccept={onClose}
          onDecline={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'ai-explain-consent',
      title: cs('ai_explain_consent_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <AiExplainConsentModal
          visible={visible}
          lang={DEMO_LANG}
          onAccept={onClose}
          onDecline={onClose}
        />
      ),
    },
    {
      id: 'ai-explain-consent-hybrid',
      title: cs('ai_explain_consent_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <AiExplainConsentModal
          visible={visible}
          lang={DEMO_LANG}
          onAccept={onClose}
          onDecline={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'notification-permission',
      title: cs('notification_permission_title'),
      detail: cs('notification_permission_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <NotificationPermissionModal
          visible={visible}
          lang={DEMO_LANG}
          onConfirm={onClose}
          onCancel={onClose}
        />
      ),
    },
    {
      id: 'notification-permission-hybrid',
      title: cs('notification_permission_hybrid_title'),
      detail: cs('notification_permission_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <NotificationPermissionModal
          visible={visible}
          lang={DEMO_LANG}
          onConfirm={onClose}
          onCancel={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'mistake-eli5',
      title: cs('mistake_eli5_title'),
      detail: cs('mistake_eli5_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <MistakeEli5Modal
          visible={visible}
          onClose={onClose}
          lang={DEMO_LANG}
          state="ready"
          text={DEMO_MISTAKE_TEXT}
          onRetry={() => {}}
        />
      ),
    },
    {
      id: 'explain-sheet',
      title: cs('explain_sheet_title'),
      kind: 'note',
      note: cs('explain_sheet_note'),
    },
    {
      id: 'onboarding-welcome-sheet',
      title: cs('onboarding_welcome_sheet_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <OnboardingWelcomeSheet
          visible={visible}
          userName={cs('onboarding_welcome_sheet_demo_name')}
          onClose={onClose}
        />
      ),
    },
    {
      id: 'onboarding-welcome-sheet-hybrid',
      title: cs('onboarding_welcome_sheet_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <OnboardingWelcomeSheet
          visible={visible}
          userName={cs('onboarding_welcome_sheet_demo_name')}
          onClose={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'youtube-channel-picker-sheet',
      title: cs('youtube_channel_picker_sheet_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <YoutubeChannelPickerSheet
          visible={visible}
          manifest={DEMO_YOUTUBE_MANIFEST}
          preference={{ mode: 'auto' }}
          onSelect={() => {}}
          onClose={onClose}
        />
      ),
    },
    {
      id: 'youtube-channel-picker-sheet-hybrid',
      title: cs('youtube_channel_picker_sheet_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <YoutubeChannelPickerSheet
          visible={visible}
          manifest={DEMO_YOUTUBE_MANIFEST}
          preference={{ mode: 'auto' }}
          onSelect={() => {}}
          onClose={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'fc-deck-picker-sheet',
      title: cs('fc_deck_picker_sheet_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <DeckPickerSheetPreview visible={visible} onClose={onClose} hybrid={false} />
      ),
    },
    {
      id: 'fc-deck-picker-sheet-hybrid',
      title: cs('fc_deck_picker_sheet_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <DeckPickerSheetPreview visible={visible} onClose={onClose} hybrid />
      ),
    },
    {
      id: 'section-sheet-header',
      title: cs('section_sheet_header_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: () => <SectionSheetHeaderPreview hybrid={false} />,
    },
    {
      id: 'section-sheet-header-hybrid',
      title: cs('section_sheet_header_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: () => <SectionSheetHeaderPreview hybrid />,
    },
  ],
};
