// Секция QA-панели: системные и контентные модалки, не покрытые панелью до
// редизайна 2026-06: ThemedChoice, удаление аккаунта, сертификат (имя+результат),
// жалоба на пак, ExplainSheet.
import React, { useState } from 'react';
import { useLang } from '../../LangContext';
import ThemedChoiceModal from '../../ThemedChoiceModal';
import DeleteAccountConfirmModal from '../../DeleteAccountConfirmModal';
import CertificateNameModal from '../../CertificateNameModal';
import ExamResultPreviewAdminModal from '../../ExamResultPreviewAdminModal';
import ReportPackModal from '../../ReportPackModal';
import ExplainSheet from '../../ExplainSheet';
import type { LingmanCertificate } from '../../../app/exam_certificate';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';
import { qaToast } from '../qa_utils';

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
}

export default function SystemModalsExtraSection({ open, onToggle }: Props) {
  const { lang } = useLang();
  const [choiceVisible, setChoiceVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [certNameVisible, setCertNameVisible] = useState(false);
  const [examResultCert, setExamResultCert] = useState<LingmanCertificate | null>(null);
  const [reportPackVisible, setReportPackVisible] = useState(false);
  const [explainVisible, setExplainVisible] = useState(false);

  const openExamResultPreview = () => {
    setExamResultCert({
      name: '',
      score: 18,
      total: 20,
      pct: 90,
      completedAt: Date.now(),
      certId: 'qa-preview-001',
      lang: 'ru',
    });
  };

  return (
    <AccordionSection
      id="system_modals_extra"
      icon="layers-outline"
      title="Системные модалки (остальные)"
      badge={6}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>
        Модалки, которых не было в панели. Помечено, где действия внутри превью настоящие.
      </AdminHint>
      <ButtonRow
        testID="admin-extra-themed-choice"
        icon="git-compare-outline"
        label="ThemedChoiceModal"
        sub="Темизированный выбор из двух действий (гейты уроков)"
        onPress={() => setChoiceVisible(true)}
      />
      <ButtonRow
        testID="admin-extra-delete-account"
        icon="trash-outline"
        label="DeleteAccountConfirmModal"
        sub="⚠️ Подтверждение внутри РЕАЛЬНО удалит аккаунт — для превью жми «Отмена»"
        danger
        onPress={() => setDeleteVisible(true)}
      />
      <ButtonRow
        testID="admin-extra-certificate-name"
        icon="create-outline"
        label="CertificateNameModal"
        sub="Ввод имени для сертификата Лингмана (экран экзамена)"
        onPress={() => setCertNameVisible(true)}
      />
      <ButtonRow
        testID="admin-extra-exam-result"
        icon="school-outline"
        label="ExamResultPreviewAdminModal"
        sub="Полноэкранный результат экзамена: мок 18/20 (90%)"
        onPress={openExamResultPreview}
      />
      <ButtonRow
        testID="admin-extra-report-pack"
        icon="flag-outline"
        label="ReportPackModal"
        sub="⚠️ Жалоба на community-пак: «Отправить» уйдёт по-настоящему (мок-packId)"
        onPress={() => setReportPackVisible(true)}
      />
      <ButtonRow
        testID="admin-extra-explain-sheet"
        icon="bulb-outline"
        label="ExplainSheet («Объясни просто»)"
        sub="Bottom-sheet объяснения фразы. Запрос реальный: скелетон → текст из кэша/CF."
        onPress={() => setExplainVisible(true)}
      />

      <ThemedChoiceModal
        visible={choiceVisible}
        title="Урок закрыт"
        message="Это превью ThemedChoiceModal: гейт премиум-урока с двумя действиями."
        choices={[
          { label: 'Оформить Premium', onPress: () => { setChoiceVisible(false); qaToast('info', 'QA: выбран primary-вариант'); } },
          { label: 'Позже', variant: 'secondary', onPress: () => setChoiceVisible(false) },
        ]}
        onRequestClose={() => setChoiceVisible(false)}
      />
      <DeleteAccountConfirmModal
        visible={deleteVisible}
        onRequestClose={() => setDeleteVisible(false)}
      />
      <CertificateNameModal
        visible={certNameVisible}
        initialName=""
        onSave={(name) => {
          setCertNameVisible(false);
          qaToast('success', `QA: имя сертификата сохранено — «${name}»`);
        }}
        onSkip={() => setCertNameVisible(false)}
      />
      {examResultCert && (
        <ExamResultPreviewAdminModal
          visible={examResultCert !== null}
          cert={examResultCert}
          onClose={() => setExamResultCert(null)}
        />
      )}
      <ReportPackModal
        visible={reportPackVisible}
        packId="qa-preview-pack"
        packTitle="QA Preview Pack"
        authorStableId={null}
        lang={lang}
        onClose={() => setReportPackVisible(false)}
      />
      <ExplainSheet
        visible={explainVisible}
        onClose={() => setExplainVisible(false)}
        phraseEn="I am ready to go"
        phraseMeaning="Я готов идти"
        lang={lang}
      />
    </AccordionSection>
  );
}
