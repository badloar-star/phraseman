import React from 'react';
import StreakStats from '../streak_stats';

// зачем: владелец перенёс полноценный раздел статистики на вторую вкладку
// таббара («Журнал») вместо таба «Уроки»: урок дня живёт на главной (кольцо +
// CTA), полный список уроков — /lesson_menu. embedded скрывает кнопку «назад».
export default function JournalScreen() {
  return <StreakStats embedded />;
}
