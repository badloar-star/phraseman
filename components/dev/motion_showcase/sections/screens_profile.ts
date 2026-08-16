// ─── Витрина движения · шард «Экраны · профиль и прочее» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// Подраздел: всё, что не попало в «обучение» / «арена и социальное» / «карточки» —
// настройки, статистика, магазины, аватары, сертификаты, ачивки и разные утилитарные экраны.
import type { ShowcaseSection } from '../types';

export const SECTION: ShowcaseSection = {
  id: 'screens_profile',
  order: 75,
  title: 'Экраны · профиль и прочее',
  items: [
    { id: 'settings-tab', title: 'Вкладка «Настройки»', kind: 'route', route: '/(tabs)/settings', detail: 'реальный экран' },
    { id: 'settings-language', title: 'Настройки · язык интерфейса', kind: 'route', route: '/settings_language', detail: 'реальный экран' },
    { id: 'settings-notifications', title: 'Настройки · уведомления', kind: 'route', route: '/settings_notifications', detail: 'реальный экран' },
    { id: 'settings-themes', title: 'Настройки · темы оформления', kind: 'route', route: '/settings_themes', detail: 'реальный экран' },
    { id: 'settings-edu', title: 'Настройки · образование (уровень/цели)', kind: 'route', route: '/settings_edu', detail: 'реальный экран' },
    { id: 'account-details', title: 'Аккаунт · детали', kind: 'route', route: '/account_details', detail: 'реальный экран' },
    { id: 'privacy-settings', title: 'Приватность · настройки', kind: 'route', route: '/privacy_settings', detail: 'реальный экран' },
    { id: 'privacy-screen', title: 'Политика конфиденциальности', kind: 'route', route: '/privacy_screen', detail: 'реальный экран' },
    { id: 'terms-screen', title: 'Условия использования', kind: 'route', route: '/terms_screen', detail: 'реальный экран' },
    { id: 'streak-stats', title: 'Статистика (стрик, XP, календарь)', kind: 'route', route: '/streak_stats', detail: 'реальный экран' },
    { id: 'phrase-analytics', title: 'Аналитика фраз ученика', kind: 'route', route: '/phrase_analytics_screen', detail: 'реальный экран' },
    { id: 'shards-shop', title: 'Магазин осколков', kind: 'route', route: '/shards_shop', detail: 'реальный экран' },
    { id: 'coin-exchange', title: 'Обмен монет', kind: 'route', route: '/coin_exchange', detail: 'реальный экран' },
    { id: 'avatar-select', title: 'Выбор аватара', kind: 'route', route: '/avatar_select', detail: 'реальный экран' },
    { id: 'collectibles-screen', title: 'Коллекция (артефакты/значки)', kind: 'route', route: '/collectibles_screen', detail: 'реальный экран' },
    { id: 'achievements-screen', title: 'Достижения', kind: 'route', route: '/achievements_screen', detail: 'реальный экран' },
    { id: 'level-gifts-inventory', title: 'Инвентарь уровневых подарков', kind: 'route', route: '/level_gifts_inventory', detail: 'реальный экран' },
    { id: 'level-reward-spin', title: 'Колесо наград за уровень', kind: 'route', route: '/level_reward_spin', detail: 'реальный экран' },
    { id: 'season-pass', title: 'Сезонный пропуск', kind: 'route', route: '/season_pass', detail: 'реальный экран' },
    { id: 'club-screen', title: 'Клуб', kind: 'route', route: '/club_screen', detail: 'реальный экран' },
    { id: 'referrals', title: 'Пригласить друзей (рефералка)', kind: 'route', route: '/referrals', detail: 'реальный экран' },
    { id: 'manage-subscription', title: 'Управление подпиской', kind: 'route', route: '/manage_subscription', detail: 'реальный экран' },
    { id: 'promo-code-entry', title: 'Ввод промокода', kind: 'route', route: '/promo_code_entry', detail: 'реальный экран' },
    { id: 'diagnostic-test', title: 'Диагностический тест уровня', kind: 'route', route: '/diagnostic_test', detail: 'реальный экран' },
    { id: 'exam-screen', title: 'Экзамен (сертификат)', kind: 'route', route: '/exam', detail: 'реальный экран' },
    { id: 'problem-coach', title: 'Разбор ошибок с коучем', kind: 'route', route: '/problem_coach', detail: 'реальный экран' },
    { id: 'survey-screen', title: 'Опрос ученика', kind: 'route', route: '/survey_screen', detail: 'реальный экран' },
    { id: 'ideas-submit', title: 'Предложить идею', kind: 'route', route: '/ideas_submit', detail: 'реальный экран' },
    { id: 'community-pack-create', title: 'Создать пользовательский набор карточек', kind: 'route', route: '/community_pack_create', detail: 'реальный экран' },
    { id: 'language-welcome', title: 'Приветствие выбора языка', kind: 'route', route: '/language_welcome', detail: 'реальный экран' },
  ],
};
