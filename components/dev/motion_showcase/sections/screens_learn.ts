// ─── Витрина движения · шард «Экраны · обучение» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
import type { ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';

export const SECTION: ShowcaseSection = {
  id: 'screens_learn',
  order: 60,
  title: cs('screens_learn_section_title'),
  items: [
    { id: 'lessons-tab', title: cs('lessons_tab_title'), kind: 'route', route: '/(tabs)/lessons', detail: cs('real_screen') },
    { id: 'lesson-menu', title: cs('lesson_menu_title'), kind: 'route', route: '/lesson_menu', detail: cs('real_screen') },
    { id: 'lesson1', title: cs('lesson1_title'), kind: 'route', route: '/lesson1', detail: cs('real_screen') },
    { id: 'lesson-words', title: cs('lesson_words_title'), kind: 'route', route: '/lesson_words', detail: cs('real_screen') },
    { id: 'lesson-irregular-verbs', title: cs('lesson_irregular_verbs_title'), kind: 'route', route: '/lesson_irregular_verbs', detail: cs('real_screen') },
    { id: 'lesson-verbs', title: cs('lesson_verbs_title'), kind: 'route', route: '/lesson_verbs', detail: cs('real_screen') },
    { id: 'lesson-theory-v2', title: cs('lesson_theory_v2_title'), kind: 'route', route: '/lesson_theory_v2', detail: cs('real_screen') },
    { id: 'lesson-help', title: cs('lesson_help_title'), kind: 'route', route: '/lesson_help', detail: cs('real_screen') },
    { id: 'lesson-intro-screens', title: cs('lesson_intro_screens_title'), kind: 'route', route: '/lesson_intro_screens', detail: cs('real_screen') },
    { id: 'lesson-complete', title: cs('lesson_complete_title'), kind: 'route', route: '/lesson_complete', detail: cs('real_screen') },
    { id: 'preposition-drill', title: cs('preposition_drill_title'), kind: 'route', route: '/preposition_drill', detail: cs('real_screen') },
    { id: 'hint', title: cs('hint_title'), kind: 'route', route: '/hint', detail: cs('real_screen') },
    { id: 'review', title: cs('review_title'), kind: 'route', route: '/review', detail: cs('real_screen') },
    { id: 'diagnostic-test', title: cs('diagnostic_test_title'), kind: 'route', route: '/diagnostic_test', detail: cs('real_screen') },
    { id: 'exam', title: cs('exam_title'), kind: 'route', route: '/exam', detail: cs('real_screen') },
    { id: 'level-exam', title: cs('level_exam_title'), kind: 'route', route: '/level_exam', detail: cs('real_screen') },
    { id: 'trainer', title: cs('trainer_title'), kind: 'route', route: '/trainer', detail: cs('real_screen') },
    { id: 'trainer-phrases-session', title: cs('trainer_phrases_session_title'), kind: 'route', route: '/trainer_phrases_session', detail: cs('real_screen') },
    { id: 'trainer-words-session', title: cs('trainer_words_session_title'), kind: 'route', route: '/trainer_words_session', detail: cs('real_screen') },
    { id: 'trainer-session-report', title: cs('trainer_session_report_title'), kind: 'route', route: '/trainer_session_report', detail: cs('real_screen') },
    { id: 'ai-dialog-home', title: cs('ai_dialog_home_title'), kind: 'route', route: '/ai_dialog_home', detail: cs('real_screen') },
    { id: 'ai-dialog-briefing', title: cs('ai_dialog_briefing_title'), kind: 'route', route: '/ai_dialog_briefing', detail: cs('real_screen') },
    { id: 'ai-dialog-session', title: cs('ai_dialog_session_title'), kind: 'route', route: '/ai_dialog_session', detail: cs('real_screen') },
    { id: 'ai-companion-session', title: cs('ai_companion_session_title'), kind: 'route', route: '/ai_companion_session', detail: cs('real_screen') },
    { id: 'learning-v2-course', title: cs('learning_v2_course_title'), kind: 'route', route: '/learning-v2/course', detail: cs('real_screen') },
    { id: 'learning-v2-session-intro', title: cs('learning_v2_session_intro_title'), kind: 'route', route: '/learning_v2_session_intro', detail: cs('real_screen') },
    { id: 'learning-v2-session-intro-check', title: cs('learning_v2_session_intro_check_title'), kind: 'route', route: '/learning_v2_session_intro_check', detail: cs('real_screen') },
    { id: 'learning-v2-direct-session-player', title: cs('learning_v2_direct_session_player_title'), kind: 'route', route: '/learning_v2_direct_session_player_v1', detail: cs('real_screen') },
    { id: 'lingman-videos', title: cs('lingman_videos_title'), kind: 'route', route: '/lingman_videos', detail: cs('real_screen') },
    { id: 'lingman-playlist', title: cs('lingman_playlist_title'), kind: 'route', route: '/lingman_playlist', detail: cs('real_screen') },
  ],
};
