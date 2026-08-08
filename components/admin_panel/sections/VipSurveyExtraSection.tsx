// Секция QA-панели: прямые превью модалок VIP-опроса (раньше — только через
// засев inbox-сообщения и переход на главную).
import React, { useState } from 'react';
import VipSurveyModal from '../../VipSurveyModal';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';
import { qaToast } from '../qa_utils';

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
  onSeedInboxPreview: () => void;
}

export default function VipSurveyExtraSection({ open, onToggle, onSeedInboxPreview }: Props) {
  const [surveyVisible, setSurveyVisible] = useState(false);

  return (
    <AccordionSection
      id="vip_survey_extra"
      icon="clipboard-outline"
      title="Plus-опрос: модалки напрямую"
      badge={3}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>
        Прямой рендер без засева inbox (полный флоу — кнопка «VIP survey» в Быстром QA).
      </AdminHint>
      <ButtonRow
        testID="admin-preview-vip-survey-notification"
        icon="mail-unread-outline"
        label="Добавить тестовый опрос в inbox"
        sub="Создаёт локальное уведомление и возвращает на Главную для проверки полного пользовательского пути."
        onPress={onSeedInboxPreview}
      />
      <ButtonRow
        testID="admin-extra-vip-survey-direct"
        icon="clipboard-outline"
        label="VipSurveyModal"
        sub="⚠️ Завершение опроса отправит реальные ответы и активирует Plus через callable"
        onPress={() => setSurveyVisible(true)}
      />

      <VipSurveyModal
        visible={surveyVisible}
        messageId="qa-direct-preview"
        onClose={() => setSurveyVisible(false)}
        onCompleted={() => {
          setSurveyVisible(false);
          qaToast('success', 'QA: опрос завершён (ответы отправлены по-настоящему)');
        }}
      />
    </AccordionSection>
  );
}
