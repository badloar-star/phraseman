// ─── Витрина движения · шард «Алерты и формы» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
//
// Безопасность демо-пропсов (см. правило владельца в шапке задания агента):
//   • ThemedConfirmModal / ThemedChoiceModal — чистый UI, все колбэки no-op.
//   • ReportUserModal / ReportPackModal — при явном тапе «Отправить» пишут
//     реальный документ в user_reports/community_pack_reports. Это не деньги
//     и не прогресс, а модерационный сигнал; чтобы тестовый тап не зашумлял
//     данные о реальном пользователе/паке, цель зашита фиктивная (dev-uid,
//     несуществующий packId) — запись уйдёт в жалобу на призрак, а не на
//     живой контент.
//   • NicknameEditModal — «Сохранить» уходит в reserveNameDetailed() (бронь
//     ника). Родительские колбэки (onOptimisticApply/onRollback/onNotice)
//     здесь no-op, но сама бронь всё равно реальна на сервере — риск тот же
//     класс, что у report-модалок (не деньги/прогресс), поэтому оставляем
//     живой: без этого не увидеть DEBOUNCE/спиннер доступности имени.
//   • CertificateNameModal — onSave/onSkip чисто локальные (компонент сам
//     ничего не пишет), полностью безопасно.
//   • RegistrationPromptModal и DeleteAccountConfirmModal — kind:'note'.
//     Кнопки входа (Google/Apple OAuth) и подтверждение удаления вызывают
//     signInWithProvider()/beginAccountDeletion() ПРЯМО внутри компонента,
//     без прокладки через пропсы — перехватить/подменить их безопасными
//     заглушками нельзя. Тестовый тап реально сменил бы аккаунт сессии или
//     необратимо начал удаление — это ровно деньги/прогресс/сеть, которые
//     правило запрещает мутировать демо-показом.
import React from 'react';
import type { ShowcaseSection } from '../types';
import ThemedConfirmModal from '../../../ThemedConfirmModal';
import ThemedChoiceModal from '../../../ThemedChoiceModal';
import ReportUserModal from '../../../ReportUserModal';
import ReportPackModal from '../../../ReportPackModal';
import NicknameEditModal from '../../../account/NicknameEditModal';
import CertificateNameModal from '../../../CertificateNameModal';
import { cs } from '../showcase_copy';

// зачем: ReviewPromptModal.rate/close no-op здесь — визуально идентично боевому,
// но getReviewVariant() только ЧИТАЕТ вариант (безопасно), а вот markReviewPrompted()
// в useEffect ПИШЕТ в AsyncStorage счётчик показов/дату — поэтому карточка ниже
// всё равно 'note' (см. правило владельца в шапке файла), а не живой рендер.

export const SECTION: ShowcaseSection = {
  id: 'alerts_forms',
  order: 35,
  title: cs('alerts_forms_section_title'),
  items: [
    {
      id: 'themed_confirm_default',
      title: cs('confirm_neutral_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ThemedConfirmModal
          visible={visible}
          title={cs('confirm_exit_title')}
          message={cs('confirm_exit_message')}
          cancelLabel={cs('confirm_exit_cancel')}
          confirmLabel={cs('confirm_exit_confirm')}
          confirmVariant="default"
          onCancel={onClose}
          onConfirm={onClose}
          testIDPrefix="showcase-confirm-default"
        />
      ),
    },
    {
      id: 'themed_confirm_default_hybrid',
      title: cs('confirm_neutral_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ThemedConfirmModal
          visible={visible}
          title={cs('confirm_exit_title')}
          message={cs('confirm_exit_message')}
          cancelLabel={cs('confirm_exit_cancel')}
          confirmLabel={cs('confirm_exit_confirm')}
          confirmVariant="default"
          onCancel={onClose}
          onConfirm={onClose}
          testIDPrefix="showcase-confirm-default-hybrid"
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'themed_confirm_accent',
      title: cs('confirm_accent_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ThemedConfirmModal
          visible={visible}
          title={cs('confirm_shards_title')}
          message={cs('confirm_shards_message')}
          cancelLabel={cs('confirm_shards_cancel')}
          confirmLabel={cs('confirm_shards_confirm')}
          confirmVariant="accent"
          onCancel={onClose}
          onConfirm={onClose}
          testIDPrefix="showcase-confirm-accent"
        />
      ),
    },
    {
      id: 'themed_confirm_accent_hybrid',
      title: cs('confirm_accent_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ThemedConfirmModal
          visible={visible}
          title={cs('confirm_shards_title')}
          message={cs('confirm_shards_message')}
          cancelLabel={cs('confirm_shards_cancel')}
          confirmLabel={cs('confirm_shards_confirm')}
          confirmVariant="accent"
          onCancel={onClose}
          onConfirm={onClose}
          testIDPrefix="showcase-confirm-accent-hybrid"
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'themed_confirm_destructive_hybrid',
      title: cs('confirm_destructive_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      // зачем: M1 макета — единственное место семьи, где виден удар TOAST.errorShakePx
      // на danger-CTA (см. header задания: «деструктивные — одна дрожь на подтверждении»).
      render: ({ visible, onClose }) => (
        <ThemedConfirmModal
          visible={visible}
          title={cs('confirm_destructive_title')}
          message={cs('confirm_destructive_message')}
          cancelLabel={cs('confirm_destructive_cancel')}
          confirmLabel={cs('confirm_destructive_confirm')}
          confirmVariant="default"
          destructive
          onCancel={onClose}
          onConfirm={onClose}
          testIDPrefix="showcase-confirm-destructive-hybrid"
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'themed_choice_two',
      title: cs('choice_two_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ThemedChoiceModal
          visible={visible}
          title={cs('choice_two_question')}
          message={cs('choice_two_message')}
          onRequestClose={onClose}
          choices={[
            { label: cs('choice_two_option_repeat'), onPress: onClose, variant: 'primary' },
            { label: cs('choice_two_option_next'), onPress: onClose, variant: 'secondary' },
          ]}
        />
      ),
    },
    {
      id: 'themed_choice_two_hybrid',
      title: cs('choice_two_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ThemedChoiceModal
          visible={visible}
          title={cs('choice_two_question')}
          message={cs('choice_two_message')}
          onRequestClose={onClose}
          choices={[
            { label: cs('choice_two_option_repeat'), onPress: onClose, variant: 'primary' },
            { label: cs('choice_two_option_next'), onPress: onClose, variant: 'secondary' },
          ]}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'themed_choice_three',
      title: cs('choice_three_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ThemedChoiceModal
          visible={visible}
          title={cs('choice_three_question')}
          message={cs('choice_three_message')}
          onRequestClose={onClose}
          choices={[
            { label: cs('choice_three_option_retry'), onPress: onClose, variant: 'primary' },
            { label: cs('choice_three_option_offline'), onPress: onClose, variant: 'secondary' },
            { label: cs('choice_three_option_close'), onPress: onClose, variant: 'secondary' },
          ]}
        />
      ),
    },
    {
      id: 'themed_choice_three_hybrid',
      title: cs('choice_three_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ThemedChoiceModal
          visible={visible}
          title={cs('choice_three_question')}
          message={cs('choice_three_message')}
          onRequestClose={onClose}
          choices={[
            { label: cs('choice_three_option_retry'), onPress: onClose, variant: 'primary' },
            { label: cs('choice_three_option_offline'), onPress: onClose, variant: 'secondary' },
            { label: cs('choice_three_option_close'), onPress: onClose, variant: 'secondary' },
          ]}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'report_user_modal',
      title: cs('report_user_title'),
      detail: cs('report_user_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ReportUserModal
          visible={visible}
          reportedUid="dev-showcase-ghost-uid"
          reportedName={cs('report_user_demo_name')}
          screen="leaderboard"
          lang="ru"
          onClose={onClose}
        />
      ),
    },
    {
      id: 'report_user_modal_hybrid',
      title: cs('report_user_hybrid_title'),
      detail: cs('report_user_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ReportUserModal
          visible={visible}
          reportedUid="dev-showcase-ghost-uid"
          reportedName={cs('report_user_demo_name')}
          screen="leaderboard"
          lang="ru"
          onClose={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'report_pack_modal',
      title: cs('report_pack_title'),
      detail: cs('report_user_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <ReportPackModal
          visible={visible}
          packId="dev-showcase-ghost-pack"
          packTitle={cs('report_pack_demo_title')}
          authorStableId={null}
          lang="ru"
          onClose={onClose}
          onPackHiddenOnDevice={() => {}}
        />
      ),
    },
{
      id: 'nickname_edit_modal',
      title: cs('nickname_edit_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <NicknameEditModal
          visible={visible}
          currentName={cs('nickname_edit_demo_name')}
          onRequestClose={onClose}
          onOptimisticApply={() => {}}
          onRollback={() => {}}
          onNotice={() => {}}
        />
      ),
    },
    {
      id: 'nickname_edit_modal_hybrid',
      title: cs('nickname_edit_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <NicknameEditModal
          visible={visible}
          currentName={cs('nickname_edit_demo_name')}
          onRequestClose={onClose}
          onOptimisticApply={() => {}}
          onRollback={() => {}}
          onNotice={() => {}}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'certificate_name_modal',
      title: cs('certificate_name_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <CertificateNameModal
          visible={visible}
          initialName=""
          onSave={onClose}
          onSkip={onClose}
        />
      ),
    },
    {
      id: 'certificate_name_modal_hybrid',
      title: cs('certificate_name_hybrid_title'),
      detail: cs('real_component'),
      kind: 'render',
      render: ({ visible, onClose }) => (
        <CertificateNameModal
          visible={visible}
          initialName=""
          onSave={onClose}
          onSkip={onClose}
          motionVariant="hybrid"
        />
      ),
    },
    {
      id: 'registration_prompt_modal',
      title: cs('registration_prompt_title'),
      kind: 'note',
      note: cs('registration_prompt_note'),
    },
    {
      id: 'delete_account_confirm_modal',
      title: cs('delete_account_confirm_title'),
      kind: 'note',
      note: cs('delete_account_confirm_note'),
    },
    {
      id: 'delete_account_confirm_modal_hybrid',
      title: cs('delete_account_confirm_hybrid_title'),
      kind: 'note',
      note: cs('delete_account_confirm_note'),
    },
    {
      id: 'review_prompt_modal',
      title: cs('review_prompt_modal_title'),
      kind: 'note',
      note: cs('review_prompt_modal_note'),
    },
    {
      id: 'review_prompt_modal_hybrid',
      title: cs('review_prompt_modal_hybrid_title'),
      kind: 'note',
      note: cs('review_prompt_modal_note'),
    },
  ],
};
