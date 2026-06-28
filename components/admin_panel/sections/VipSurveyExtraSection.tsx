// Секция QA-панели: прямые превью модалок VIP-опроса (раньше — только через
// засев inbox-сообщения и переход на главную).
import React, { useState } from 'react';
import VipSurveyModal from '../../VipSurveyModal';
import VipSurveyReviewPromptModal from '../../VipSurveyReviewPromptModal';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';
import { qaToast } from '../qa_utils';

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
}

export default function VipSurveyExtraSection({ open, onToggle }: Props) {
  const [surveyVisible, setSurveyVisible] = useState(false);
  const [reviewPromptVisible, setReviewPromptVisible] = useState(false);

  return (
    <AccordionSection
      id="vip_survey_extra"
      icon="clipboard-outline"
      title="Plus-опрос: модалки напрямую"
      badge={2}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>
        Прямой рендер без засева inbox (полный флоу — кнопка «VIP survey» в Быстром QA).
      </AdminHint>
      <ButtonRow
        testID="admin-extra-vip-survey-direct"
        icon="clipboard-outline"
        label="VipSurveyModal"
        sub="⚠️ Завершение опроса отправит реальные ответы и активирует Plus через callable"
        onPress={() => setSurveyVisible(true)}
      />
      <ButtonRow
        testID="admin-extra-vip-survey-review"
        icon="star-outline"
        label="VipSurveyReviewPromptModal"
        sub="Просьба об отзыве после опроса. «Написать отзыв» откроет магазин."
        onPress={() => setReviewPromptVisible(true)}
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
      <VipSurveyReviewPromptModal
        visible={reviewPromptVisible}
        onClose={() => setReviewPromptVisible(false)}
      />
    </AccordionSection>
  );
}
