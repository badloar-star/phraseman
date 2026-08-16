// ─── Витрина движения · шард «Полноэкранные (обновления, инбокс)» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
import React from 'react';
import type { ShowcaseSection } from '../types';

import UpdateModal from '../../../UpdateModal';
import ReleaseNotesModal from '../../../ReleaseNotesModal';
import PersonalAdminMessageModal from '../../../PersonalAdminMessageModal';
import VipSurveyModal from '../../../VipSurveyModal';
import VipSurveyReviewPromptModal from '../../../VipSurveyReviewPromptModal';
import AppMessagesInbox from '../../../AppMessagesInbox';
import { TournamentWelcomeModal } from '../../../tournament/TournamentWelcomeModal';
import type { AppMessageWithState } from '../../../../app/app_messages';
import { cs } from '../showcase_copy';

// зачем: PersonalAdminMessageModal требует onAcknowledge — в демо это НЕ реальный
// acknowledgePersonalAdminMessage (тот пишет в Firestore/локальный стейт), а
// пустая заглушка, которая просто резолвится — модалка закрывается витриной
// через сам facet-стейт (visible/onClose из ShowcaseRenderProps).
const noopAcknowledge = async (_messageId: string): Promise<void> => {};

// Демо-сообщение для PersonalAdminMessageModal — валидная форма AppMessageWithState,
// но без реального id/сети: onAcknowledge — заглушка выше, ничего не читает и не пишет.
const DEMO_PERSONAL_MESSAGE: AppMessageWithState = {
  id: 'showcase-demo-personal-message',
  kind: 'personal_admin_message',
  active: true,
  audience: 'all',
  deliverySurface: 'inbox',
  settingsSlot: null,
  voteMode: 'fixed',
  controlPercent: 100,
  titleRu: cs('admin_msg_title'),
  titleUk: 'Особисте повідомлення (демо)',
  titleEs: 'Mensaje personal (demo)',
  titlePtBr: 'Mensagem pessoal (demo)',
  titleVi: 'Tin nhắn cá nhân (demo)',
  titleId: 'Pesan pribadi (demo)',
  titleTr: 'Kişisel mesaj (demo)',
  titlePl: 'Wiadomość osobista (demo)',
  messageRu: cs('admin_msg_body'),
  messageUk: 'Це вітрина руху — реальний компонент PersonalAdminMessageModal із демо-текстом.',
  messageEs: 'Esta es la vitrina de movimiento — componente real con texto de demostración.',
  messagePtBr: 'Esta é a vitrine de movimento — componente real com texto de demonstração.',
  messageVi: 'Đây là màn trình diễn chuyển động — component thật với văn bản demo.',
  messageId: 'Ini adalah etalase gerakan — komponen asli dengan teks demo.',
  messageTr: 'Bu hareket vitrini — demo metinli gerçek bileşen.',
  messagePl: 'To witryna ruchu — prawdziwy komponent z tekstem demo.',
  createdAt: new Date().toISOString(),
  createdAtMs: Date.now(),
  updatedAt: new Date().toISOString(),
  updatedAtMs: Date.now(),
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  expiresAtMs: Date.now() + 86_400_000,
  priority: 0,
  targetAppVersions: [],
  poll: null,
  vipSurvey: null,
  reportReply: null,
  recipientUid: '',
  deliveryMode: null,
  nextLoginModalPending: false,
  readAtMs: null,
  dismissedAtMs: null,
  reaction: null,
  pollOptionId: null,
  unread: true,
  personalModalAcknowledgedAtMs: null,
};

export const SECTION: ShowcaseSection = {
  id: 'fullscreen',
  order: 45,
  title: cs('fullscreen_section_title'),
  items: [
    {
      id: 'update_modal',
      title: cs('update_modal_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <UpdateModal
          visible={visible}
          // зачем: демо-ссылка — реальная кнопка «Обновить» вызовет Linking.openURL,
          // но откроет страницу приложения в сторе, а не спишет деньги/данные.
          storeUrl="https://apps.apple.com/app/id0000000000"
          onClose={onClose}
        />
      ),
    },
    {
      id: 'release_notes_modal',
      title: cs('release_notes_modal_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ReleaseNotesModal visible={visible} onClose={onClose} />
      ),
    },
    {
      id: 'global_broadcast_modal',
      title: cs('global_broadcast_modal_title'),
      kind: 'note',
      note: cs('global_broadcast_modal_note'),
    },
    {
      id: 'tournament_welcome_modal',
      title: cs('tournament_welcome_modal_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <TournamentWelcomeModal visible={visible} onClose={onClose} />
      ),
    },
    {
      id: 'personal_admin_message_modal',
      title: cs('personal_admin_message_modal_title'),
      detail: cs('personal_admin_message_modal_detail'),
      kind: 'render',
      render: ({ visible }) => (
        <PersonalAdminMessageModal
          message={DEMO_PERSONAL_MESSAGE}
          visible={visible}
          onAcknowledge={noopAcknowledge}
        />
      ),
    },
    {
      id: 'vip_survey_modal',
      title: cs('vip_survey_modal_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <VipSurveyModal
          visible={visible}
          messageId="showcase-demo-vip-survey"
          onClose={onClose}
          onCompleted={onClose}
        />
      ),
    },
    {
      id: 'vip_survey_modal_hybrid',
      title: cs('vip_survey_modal_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <VipSurveyModal
          visible={visible}
          messageId="showcase-demo-vip-survey-hybrid"
          onClose={onClose}
          onCompleted={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'vip_survey_review_prompt_modal',
      title: cs('vip_survey_review_prompt_modal_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <VipSurveyReviewPromptModal visible={visible} onClose={onClose} />
      ),
    },
    {
      id: 'app_messages_inbox',
      title: cs('app_messages_inbox_title'),
      detail: cs('app_messages_inbox_detail'),
      kind: 'render',
      render: () => <AppMessagesInbox mode="standalone" />,
    },
    {
      id: 'maintenance_gate_note',
      title: cs('maintenance_gate_title'),
      kind: 'note',
      note: cs('maintenance_gate_note'),
    },
  ],
};
