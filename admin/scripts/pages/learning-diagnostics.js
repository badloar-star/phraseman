(function () {
  'use strict';

  window.renderLearningDiagnostics = function renderLearningDiagnostics(input) {
    var L = window.AdminAnalyticsLanguage;
    var data = input && typeof input === 'object' ? input : {};
    var rows = Array.isArray(data.checkpoints) ? data.checkpoints : [];
    var hasSummary = L.finite(data.answers) != null || L.finite(data.abandons) != null;
    if (!hasSummary && !rows.length) return L.empty('Диагностика фраз пока не накопила данные.');
    var sorted = rows.slice().sort(function (a, b) {
      return Number(b.abandons || 0) - Number(a.abandons || 0)
        || Number(b.answer_error_rate || 0) - Number(a.answer_error_rate || 0);
    });
    return L.cards([
      { label: 'Ответы', value: L.number(data.answers) },
      { label: 'Покрытие позиции фразы', value: L.percent(data.checkpoint_coverage_rate) },
      { label: 'Явные выходы', value: L.number(data.abandons) },
      { label: 'Покрытие позиции выхода', value: L.percent(data.abandon_checkpoint_coverage_rate) },
      { label: 'Завершённые попытки', value: L.number(data.distinct_completed_attempts) },
      { label: '90-й перцентиль времени', value: L.duration(data.p90_terminal_elapsed_ms) },
    ]) + L.table([
      { key: 'lesson_id', label: 'Урок', format: L.number },
      { key: 'phrase_index', label: 'Фраза', format: function (value) { return L.finite(value) == null ? '—' : L.number(Number(value) + 1); } },
      { key: 'answers', label: 'Ответы', format: L.number },
      { key: 'answer_error_rate', label: 'Ошибки', format: L.percent },
      { key: 'abandons', label: 'Выходы', format: L.number },
      { key: 'app_instances', label: 'Установки', format: L.number },
    ], sorted.slice(0, 50), 'Проблемных контрольных точек не найдено.');
  };

  window.renderLearningOutcomes = function renderLearningOutcomes(input) {
    var L = window.AdminAnalyticsLanguage;
    var data = input && typeof input === 'object' ? input : {};
    var review = data.review || {};
    var sessions = data.reviewSessions || {};
    var delay = Array.isArray(data.delayBuckets) ? data.delayBuckets : [];
    var content = Array.isArray(data.contentDiagnostics) ? data.contentDiagnostics : [];
    var weekly = Array.isArray(data.weeklyEffectiveLearners) ? data.weeklyEffectiveLearners : [];
    if (L.finite(review.persisted_answers) == null && !delay.length && !content.length && !weekly.length) {
      return L.empty('Данных об отложенном вспоминании пока нет.');
    }
    var html = L.cards([
      { label: 'Сохранённые ответы SRS', value: L.number(review.persisted_answers) },
      { label: 'Точность первого ответа', value: L.percent(review.first_answer_accuracy) },
      { label: 'Точность отложенного ответа', value: L.percent(review.delayed_recall_accuracy) },
      { label: 'Завершение SRS-сессий', value: L.percent(sessions.completion_rate) },
      { label: 'Ответ за медианное время', value: L.duration(review.p50_response_time_ms) },
    ]);
    html += '<h4>По задержке повторения</h4>' + L.table([
      { key: 'delay_bucket', label: 'Задержка', format: L.humanize },
      { key: 'answers', label: 'Ответы', format: L.number },
      { key: 'accuracy', label: 'Точность', format: L.percent },
      { key: 'consented_app_instances', label: 'Установки', format: L.number },
    ], delay, 'Нет данных по задержкам.');
    html += '<h4>Уроки в повторении</h4>' + L.table([
      { key: 'diagnostic_group', label: 'Группа', format: L.humanize },
      { key: 'answers', label: 'Ответы', format: L.number },
      { key: 'accuracy', label: 'Точность', format: L.percent },
      { key: 'mastered_transitions', label: 'Закреплено', format: L.number },
      { key: 'lapses', label: 'Откаты', format: L.number },
    ], content.slice(0, 40), 'Нет безопасной выборки по урокам.');
    html += '<h4>Эффективное обучение по неделям</h4>' + L.table([
      { key: 'week_start_utc', label: 'Неделя' },
      { key: 'active_consented_app_instances', label: 'Активные установки', format: L.number },
      { key: 'weekly_effective_learners', label: 'Эффективные ученики', format: L.number },
      { key: 'weekly_effective_learner_rate', label: 'Доля', format: L.percent },
      { key: 'is_complete_week', label: 'Полная неделя', format: function (value) { return value ? 'Да' : 'Нет'; } },
    ], weekly.slice(0, 16), 'Полных недель пока нет.');
    return html;
  };
})();
