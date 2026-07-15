// ════════════════════════════════════════════════════════════════════════════
// admin_panel/ui.tsx — дизайн-система QA/админ-панели (dev-only).
//
// Нейтральная тёмно-серая палитра (без красного), примитивы строк/секций и
// контекст навигации (главы + поиск). Импортируется ТОЛЬКО из
// app/_admin_settings_testers.tsx и его секций — в прод-бандл не попадает
// (гейт settings_testers.tsx отсекает весь граф через __DEV__).
// ════════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
import AccordionChevronIonicons from '../AccordionChevronIonicons';
import { configureAccordionLayout } from '../../constants/layoutAnimation';
import { hapticTap } from '../../hooks/use-haptics';

// ─── Палитра: простой тёмно-серый, без красного ──────────────────────────────
export const ACCENT = '#A9B1BD';            // основной акцент: светло-серый (иконки)
export const ACCENT_DIM = '#5D6571';        // шевроны, второстепенные иконки
export const ACCENT_DARK = '#343B46';       // плашки бейджей, активные чипы, CTA
export const ADMIN_BG = '#0E1013';          // фон экрана
export const ADMIN_HEADER_BG = '#14161A';   // фон шапки
export const ADMIN_SURFACE = '#17191E';     // карточки секций
export const ADMIN_SURFACE_ELEVATED = '#1E2126';
export const ADMIN_SURFACE_MUTED = '#121417';
export const ADMIN_SURFACE_DANGER = '#1E1A12'; // тёмно-янтарная подложка danger-строк
export const ADMIN_TEXT = '#E8EAEE';
export const ADMIN_TEXT_MUTED = '#8C94A0';
export const ADMIN_BORDER_MUTED = '#272B32';
export const ACCENT_BG = '#15171B';
export const ACCENT_BORDER = '#2B3038';     // границы карточек
export const ACCENT_BORDER_SOFT = '#22262C';// разделители строк
export const DANGER = '#D9A04A';            // янтарный для опасных действий (не красный)
export const DANGER_TEXT = '#E5B96E';

// ─── Главы (категории разделов) ──────────────────────────────────────────────
export type AdminChapterId =
  | 'all' | 'quick' | 'monetization' | 'rewards' | 'modals' | 'toasts'
  | 'gameplay' | 'social' | 'system' | 'scenarios' | 'labs' | 'data';

export const CHAPTERS: { id: AdminChapterId; label: string; icon: string }[] = [
  { id: 'all', label: 'Все', icon: 'apps-outline' },
  { id: 'quick', label: 'Быстрый QA', icon: 'flash-outline' },
  { id: 'monetization', label: 'Премиум', icon: 'card-outline' },
  { id: 'rewards', label: 'Награды', icon: 'gift-outline' },
  { id: 'modals', label: 'Модалки', icon: 'albums-outline' },
  { id: 'toasts', label: 'Тосты', icon: 'chatbox-ellipses-outline' },
  { id: 'gameplay', label: 'Геймплей', icon: 'game-controller-outline' },
  { id: 'social', label: 'Соцфичи', icon: 'people-outline' },
  { id: 'system', label: 'Система', icon: 'construct-outline' },
  { id: 'scenarios', label: 'Сценарии', icon: 'git-branch-outline' },
  { id: 'labs', label: 'Лаборатории', icon: 'flask-outline' },
  { id: 'data', label: 'Данные', icon: 'server-outline' },
];

/** Раздел → глава + ключевые слова для поиска (русские синонимы того, что внутри). */
const SECTION_META: Record<string, { chapter: AdminChapterId; keywords: string }> = {
  new_paywall_v2: { chapter: 'monetization', keywords: 'пейвол paywall v2 макет premium подписка' },
  soft_upsell_previews: { chapter: 'monetization', keywords: 'мягкие пейволы soft upsell превью premium подписка первый урок недельный обзор серия тренировка ии диалог' },
  platform_ui_preview: { chapter: 'system', keywords: 'android ios платформа превью ui' },
  cosmetics_preview: { chapter: 'social', keywords: 'аватары ауры рамки косметика бюсты осколки' },
  account: { chapter: 'data', keywords: 'аккаунт xp без ограничений энергия достижения снять премиум mastery перепройти' },
  friends_admin: { chapter: 'social', keywords: 'друзья подарки осколки активность сид buddy gift' },
  auth_dev: { chapter: 'data', keywords: 'auth google apple вход регистрация signout привязка' },
  arena_modals: { chapter: 'gameplay', keywords: 'арена ранг повышение понижение победа поражение лига финал недели трон rollover' },
  league_bonus: { chapter: 'rewards', keywords: 'лига бонус корона сундук редкая тема chest crown' },
  lesson_modals: { chapter: 'gameplay', keywords: 'урок lesson complete сертификат лингман 5/5' },
  premium_modals: { chapter: 'monetization', keywords: 'пейвол premium триал кулдаун контекст quiz maestro подписка' },
  speaking_mode: { chapter: 'gameplay', keywords: 'устно speaking микрофон произношение голос' },
  ai_dialogue: { chapter: 'gameplay', keywords: 'ии диалог ai dialog лимит чат' },
  referral_modals: { chapter: 'monetization', keywords: 'реферал vip приглашение friend code пригласи' },
  error_states: { chapter: 'system', keywords: 'ошибки edge микрофон unavailable слияние аккаунтов denied' },
  soft_monetization: { chapter: 'monetization', keywords: 'celebration vip празднование streak revive blur монетизация pending' },
  activity_365_qa: { chapter: 'system', keywords: 'статистика 365 год активность heatmap' },
  paywall_personalization: { chapter: 'monetization', keywords: 'персонализация счётчики пейвол energy zero streak lost hard block' },
  trainer_debug: { chapter: 'gameplay', keywords: 'тренер trainer сессии ошибки srs лог weak точечный повтор' },
  phrase_analytics_debug: { chapter: 'gameplay', keywords: 'ошибки тренировки диагнозы pos coach анализ глаголы артикли' },
  toasts: { chapter: 'toasts', keywords: 'тосты достижения streak daily task reward уведомления' },
  medal_toasts: { chapter: 'toasts', keywords: 'медали тост бронза серебро золото premium' },
  levelup: { chapter: 'rewards', keywords: 'level up уровень подарки gift dual глобальный' },
  shards: { chapter: 'rewards', keywords: 'осколки shards профиль карточка источники' },
  onboarding: { chapter: 'system', keywords: 'онбординг язык цель уровень время mini aha план пейвол legal analytics consent' },
  conversion_push: { chapter: 'monetization', keywords: 'пуши конверсия upsell expiring уведомления d+4 d+7' },
  core_modals: { chapter: 'modals', keywords: 'noenergy арена лимит quiz timeout warning report update notif release broadcast match toast энергия' },
  daily_tasks_qa: { chapter: 'gameplay', keywords: 'дейли задачи паки daily tasks empty ready claimed' },
  qa_checklist: { chapter: 'quick', keywords: 'чеклист qa проверки прогон' },
  rank_change_test: { chapter: 'rewards', keywords: 'клуб ранг повышение понижение лиги переход' },
  data: { chapter: 'data', keywords: 'сброс все данные статистика reset wipe' },
  // Новые секции (добавлены при редизайне 2026-06):
  scenarios_conflicts: { chapter: 'scenarios', keywords: 'сценарии конфликты цепочки парад окон тройной удар revive level up inbox' },
  reward_modals_extra: { chapter: 'rewards', keywords: 'release wave shard reward профиль карточка апгрейд энергия refill осколки' },
  system_modals_extra: { chapter: 'modals', keywords: 'choice выбор delete удаление аккаунта сертификат имя экзамен report pack жалоба explain объясни' },
  banners_toasts_extra: { chapter: 'toasts', keywords: 'ingame тост баннер rank change save progress привязка инлайн' },
  vip_survey_extra: { chapter: 'monetization', keywords: 'vip опрос survey отзыв review prompt напрямую' },
  labs_hub: { chapter: 'labs', keywords: 'лаборатории speaking referral интро celebration anim delivery повтор review очередь стек модалки swipe preview' },
  gifts_catalog: { chapter: 'rewards', keywords: 'справочник подарки каталог все подарки иконки описания уровень премиум вехи друзья сундук лиги gift catalog' },
  collectible_drop_modals: { chapter: 'modals', keywords: 'коллекция карточка дроп сокровищница новая карточка получение подарок редкость сет собран секретка collectible drop modal' },
  user_consents: { chapter: 'data', keywords: 'согласия consent gdpr возраст аналитика приватность дата отзыв granted denied user_consents' },
};

export interface AdminNavState {
  chapter: AdminChapterId;
  query: string;
}

export const AdminNavContext = createContext<AdminNavState>({ chapter: 'all', query: '' });

/** Видна ли секция при текущей главе и поисковом запросе. */
export function sectionVisible(id: string, title: string, nav: AdminNavState): boolean {
  const meta = SECTION_META[id];
  if (nav.chapter !== 'all' && (meta?.chapter ?? 'system') !== nav.chapter) return false;
  const q = nav.query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${title} ${id} ${meta?.keywords ?? ''}`.toLowerCase();
  return q.split(/\s+/).every((tok) => hay.includes(tok));
}

// ─── Примитивы ───────────────────────────────────────────────────────────────

export function AdminBackground() {
  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: ADMIN_BG }}
      pointerEvents="none"
    />
  );
}

export const ToggleRow = ({ icon, label, sub, value, onToggle, f }: {
  icon: string; label: string; sub?: string; value: boolean; onToggle: (val: boolean) => void;
  t?: any; f?: any;
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: ACCENT_BORDER_SOFT, backgroundColor: ADMIN_SURFACE }}>
    <Ionicons name={icon as any} size={22} color={ACCENT} style={{ marginRight: 14 }} />
    <View style={{ flex: 1 }}>
      <Text style={{ color: ADMIN_TEXT, fontSize: f?.bodyLg ?? 16 }}>{label}</Text>
      {sub && <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: f?.caption ?? 12, marginTop: 2 }}>{sub}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      thumbColor={value ? ACCENT : ADMIN_BORDER_MUTED}
      trackColor={{ false: ADMIN_SURFACE_MUTED, true: ACCENT_DARK }}
    />
  </View>
);

export const ButtonRow = ({ icon, label, sub, onPress, danger, testID, f, doHaptic, pressInStarts, confirm }: {
  icon: string; label: string; sub?: string; onPress: () => void; danger?: boolean; testID?: string;
  t?: any; f?: any; doHaptic?: () => void; pressInStarts?: boolean; confirm?: string;
}) => {
  const haptic = doHaptic ?? hapticTap;
  const handlePress = () => {
    if (confirm) {
      Alert.alert('Подтверждение', confirm, [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Выполнить', style: danger ? 'destructive' : 'default', onPress: () => { haptic(); onPress(); } },
      ]);
      return;
    }
    haptic();
    onPress();
  };
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityLabel={testID ? `qa-${testID}` : undefined}
      accessible={!!testID}
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: ACCENT_BORDER_SOFT, backgroundColor: danger ? ADMIN_SURFACE_DANGER : ADMIN_SURFACE }}
      onPressIn={pressInStarts ? handlePress : undefined}
      onPress={pressInStarts ? undefined : handlePress}
      activeOpacity={0.6}
    >
      <Ionicons name={icon as any} size={22} color={danger ? DANGER : ACCENT} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? DANGER_TEXT : ADMIN_TEXT, fontSize: f?.bodyLg ?? 16 }}>{label}</Text>
        {sub && <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: f?.caption ?? 12, marginTop: 2 }}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={ACCENT_DIM} />
    </TouchableOpacity>
  );
};

/** Мелкий поясняющий текст внутри тела секции. */
export function AdminHint({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, lineHeight: 16, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
      {children}
    </Text>
  );
}

/**
 * Секция-аккордеон. Сама фильтруется по активной главе и поисковому запросу
 * (AdminNavContext): вне главы/запроса — не рендерится, при активном фильтре —
 * раскрыта (с возможностью локально свернуть тапом).
 */
export function AccordionSection({ id, icon, title, badge, open, onToggle, children }: {
  id: string; icon: string; title: string; badge?: number; open: boolean;
  onToggle: (id: string) => void; children: React.ReactNode;
}) {
  const nav = useContext(AdminNavContext);
  const filtered = nav.chapter !== 'all' || nav.query.trim().length > 0;
  const [localCollapsed, setLocalCollapsed] = useState(false);
  useEffect(() => { setLocalCollapsed(false); }, [nav.chapter, nav.query]);
  if (!sectionVisible(id, title, nav)) return null;
  const effOpen = filtered ? !localCollapsed : open;
  return (
    <View style={{ marginHorizontal: 12, marginBottom: 8, borderRadius: 14, borderWidth: 1, borderColor: ACCENT_BORDER, overflow: 'hidden', backgroundColor: ADMIN_SURFACE }}>
      <TouchableOpacity
        testID={`testers-section-${id}`}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}
        onPress={() => {
          configureAccordionLayout();
          if (filtered) setLocalCollapsed((v) => !v);
          else onToggle(id);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name={icon as any} size={20} color={ACCENT} style={{ marginRight: 12 }} />
        <Text style={{ flex: 1, color: ADMIN_TEXT, fontSize: 15, fontWeight: '700' }}>{title}</Text>
        {badge !== undefined && badge > 0 && (
          <View style={{ backgroundColor: ACCENT_DARK, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 8 }}>
            <Text style={{ color: ADMIN_TEXT, fontSize: 11, fontWeight: '700' }}>{badge}</Text>
          </View>
        )}
        <AccordionChevronIonicons isOpen={effOpen} size={16} color={ACCENT_DIM} />
      </TouchableOpacity>
      {effOpen && (
        <View style={{ borderTopWidth: 0.5, borderTopColor: ACCENT_BORDER_SOFT, backgroundColor: ADMIN_SURFACE }}>
          {children}
        </View>
      )}
    </View>
  );
}
