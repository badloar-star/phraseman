// ─── Витрина движения · шард «Экраны · обучение» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
import type { ShowcaseSection } from '../types';

export const SECTION: ShowcaseSection = {
  id: 'screens_learn',
  order: 60,
  title: 'Экраны · обучение',
  items: [
    { id: 'lessons-tab', title: 'Вкладка «Обучение» (уроки, V2, диалоги)', kind: 'route', route: '/(tabs)/lessons', detail: 'реальный экран' },
    { id: 'lesson-menu', title: 'Меню урока', kind: 'route', route: '/lesson_menu', detail: 'реальный экран' },
    { id: 'lesson1', title: 'Урок (фразы)', kind: 'route', route: '/lesson1', detail: 'реальный экран' },
    { id: 'lesson-words', title: 'Урок (слова)', kind: 'route', route: '/lesson_words', detail: 'реальный экран' },
    { id: 'lesson-irregular-verbs', title: 'Урок (неправильные глаголы)', kind: 'route', route: '/lesson_irregular_verbs', detail: 'реальный экран' },
    { id: 'lesson-verbs', title: 'Урок (глаголы, редирект)', kind: 'route', route: '/lesson_verbs', detail: 'реальный экран' },
    { id: 'lesson-theory-v2', title: 'Теория урока V2', kind: 'route', route: '/lesson_theory_v2', detail: 'реальный экран' },
    { id: 'lesson-help', title: 'Помощь по уроку', kind: 'route', route: '/lesson_help', detail: 'реальный экран' },
    { id: 'lesson-intro-screens', title: 'Интро урока (первый запуск)', kind: 'route', route: '/lesson_intro_screens', detail: 'реальный экран' },
    { id: 'lesson-complete', title: 'Урок завершён', kind: 'route', route: '/lesson_complete', detail: 'реальный экран' },
    { id: 'preposition-drill', title: 'Тренажёр предлогов', kind: 'route', route: '/preposition_drill', detail: 'реальный экран' },
    { id: 'hint', title: 'Подсказка', kind: 'route', route: '/hint', detail: 'реальный экран' },
    { id: 'review', title: 'Повторение (сжигание карточек)', kind: 'route', route: '/review', detail: 'реальный экран' },
    { id: 'diagnostic-test', title: 'Диагностический тест', kind: 'route', route: '/diagnostic_test', detail: 'реальный экран' },
    { id: 'exam', title: 'Экзамен', kind: 'route', route: '/exam', detail: 'реальный экран' },
    { id: 'level-exam', title: 'Экзамен на уровень', kind: 'route', route: '/level_exam', detail: 'реальный экран' },
    { id: 'trainer', title: 'Тренажёр (меню)', kind: 'route', route: '/trainer', detail: 'реальный экран' },
    { id: 'trainer-phrases-session', title: 'Тренажёр: сессия фраз', kind: 'route', route: '/trainer_phrases_session', detail: 'реальный экран' },
    { id: 'trainer-words-session', title: 'Тренажёр: сессия слов', kind: 'route', route: '/trainer_words_session', detail: 'реальный экран' },
    { id: 'trainer-session-report', title: 'Тренажёр: отчёт по сессии', kind: 'route', route: '/trainer_session_report', detail: 'реальный экран' },
    { id: 'ai-dialog-home', title: 'AI-диалоги: главная', kind: 'route', route: '/ai_dialog_home', detail: 'реальный экран' },
    { id: 'ai-dialog-briefing', title: 'AI-диалог: брифинг перед сессией', kind: 'route', route: '/ai_dialog_briefing', detail: 'реальный экран' },
    { id: 'ai-dialog-session', title: 'AI-диалог: сессия чата', kind: 'route', route: '/ai_dialog_session', detail: 'реальный экран' },
    { id: 'ai-companion-session', title: 'AI-компаньон: голосовая сессия', kind: 'route', route: '/ai_companion_session', detail: 'реальный экран' },
    { id: 'learning-v2-course', title: 'Курс V2 (карта уроков)', kind: 'route', route: '/learning-v2/course', detail: 'реальный экран' },
    { id: 'learning-v2-session-intro', title: 'Курс V2: интро перед сессией', kind: 'route', route: '/learning_v2_session_intro', detail: 'реальный экран' },
    { id: 'learning-v2-session-intro-check', title: 'Курс V2: проверка перед сессией', kind: 'route', route: '/learning_v2_session_intro_check', detail: 'реальный экран' },
    { id: 'learning-v2-direct-session-player', title: 'Курс V2: прямой плеер сессии', kind: 'route', route: '/learning_v2_direct_session_player_v1', detail: 'реальный экран' },
    { id: 'lingman-videos', title: 'Lingman: список видео', kind: 'route', route: '/lingman_videos', detail: 'реальный экран' },
    { id: 'lingman-playlist', title: 'Lingman: плейлист', kind: 'route', route: '/lingman_playlist', detail: 'реальный экран' },
  ],
};
