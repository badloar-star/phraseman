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
import { cs } from '../showcase_copy';

const DEMO_LANG = 'ru' as Lang;

const DEMO_MISTAKE_TEXT = cs('consent_mistake_demo_text');

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
  ],
};
