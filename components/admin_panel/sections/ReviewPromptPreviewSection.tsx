import React, { useState } from 'react';
import ReviewPromptModal from '../../ReviewPromptModal';
import { useLang } from '../../LangContext';
import type { ReviewContext } from '../../../app/review_utils';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';

type Props = { open: boolean; onToggle: (id: string) => void };

export default function ReviewPromptPreviewSection({ open, onToggle }: Props) {
  const { lang } = useLang();
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [streakDays, setStreakDays] = useState<7 | 14 | 30>(7);

  return (
    <AccordionSection id="review_prompt_previews" icon="star-outline" title="Модалки оценки: предпросмотр" badge={3} open={open} onToggle={onToggle}>
      <AdminHint>Локальный preview-only: не меняет лимиты, не сохраняет оценку и не открывает магазин.</AdminHint>
      <ButtonRow testID="admin-review-perfect-preview" icon="checkmark-circle-outline" label="Идеальный урок" sub="Центральная модалка после чистого урока" onPress={() => setContext('perfect_lesson')} />
      <ButtonRow testID="admin-review-exam-preview" icon="star-outline" label="Уровневый зачёт" sub="Центральная модалка после результата ≥85%" onPress={() => setContext('level_exam_pass')} />
      <ButtonRow testID="admin-review-streak-preview-7" icon="flame-outline" label="Серия: 7 дней" sub="Центральная модалка оценки" onPress={() => { setStreakDays(7); setContext('streak_milestone'); }} />
      <ButtonRow testID="admin-review-streak-preview-14" icon="flame-outline" label="Серия: 14 дней" sub="Центральная модалка оценки" onPress={() => { setStreakDays(14); setContext('streak_milestone'); }} />
      <ButtonRow testID="admin-review-streak-preview-30" icon="flame-outline" label="Серия: 30 дней" sub="Центральная модалка оценки" onPress={() => { setStreakDays(30); setContext('streak_milestone'); }} />
      <ReviewPromptModal visible={context !== null} context={context ?? 'perfect_lesson'} lang={lang} streakDays={context === 'streak_milestone' ? streakDays : undefined} previewOnly onClose={() => setContext(null)} />
    </AccordionSection>
  );
}
