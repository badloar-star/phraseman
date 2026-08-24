// ─── Витрина движения · шард «Экраны · профиль и прочее» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// Подраздел: всё, что не попало в «обучение» / «арена и социальное» / «карточки» —
// настройки, статистика, магазины, аватары, сертификаты, ачивки и разные утилитарные экраны.
//
// Файл — .tsx (не .ts), т.к. добавлен один kind:'render' пункт (демо-панель
// SkeletonSwap) — остальные пункты (route) не изменены.
import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';
import { useTheme } from '../../../ThemeContext';
import MotionModal from '../../../MotionModal';
import SkeletonSwap from '../../../feedback/SkeletonSwap';
import SkeletonBlock from '../../../SkeletonShimmer';

/**
 * Демо-панель общего примитива SkeletonSwap: кнопка «Загрузить» переводит
 * панель в loading=true на секунду, затем контент проявляется кроссфейдом.
 * Геометрия скелетона совпадает с геометрией контента (аватар+имя+подпись) —
 * это и есть предмет демонстрации (первый кадр = финальная геометрия).
 * MotionModal даёт закрытие «из коробки»: бэкдроп-тап и аппаратный «назад»
 * оба зовут onRequestClose — контракт закрытия выполнен без ручной проводки.
 */
function SkeletonSwapDemoPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme: t, f } = useTheme();
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 1100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <MotionModal visible={visible} onRequestClose={onClose} testID="motion-showcase-skeleton-swap-preview">
      <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={cs('close')}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: t.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700', flex: 1 }}>
                {cs('skeleton_swap_hybrid_heading')}
              </Text>
              <Pressable onPress={onClose} hitSlop={10} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.bgSurface2, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={18} color={t.textMuted} />
              </Pressable>
            </View>

            <Text style={{ color: t.textMuted, fontSize: f.sub, marginBottom: 16, lineHeight: f.sub * 1.4 }}>
              {cs('skeleton_swap_hybrid_hint')}
            </Text>

            <View style={{ backgroundColor: t.bgSurface2, borderRadius: 16, padding: 14, marginBottom: 16, minHeight: 76 }}>
              <SkeletonSwap
                loading={loading}
                skeleton={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <SkeletonBlock width={48} height={48} borderRadius={24} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <SkeletonBlock width="60%" height={14} />
                      <SkeletonBlock width="40%" height={11} />
                    </View>
                  </View>
                }
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person" size={22} color={t.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                      {cs('skeleton_swap_demo_name')}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                      {cs('skeleton_swap_demo_subtitle')}
                    </Text>
                  </View>
                </View>
              </SkeletonSwap>
            </View>

            <Pressable
              onPress={reload}
              style={{ backgroundColor: t.accent, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}
            >
              <Text style={{ color: t.bgCard, fontSize: f.body, fontWeight: '700' }}>
                {cs('skeleton_swap_reload_button')}
              </Text>
            </Pressable>
          </Pressable>
        </View>
      </Pressable>
    </MotionModal>
  );
}

export const SECTION: ShowcaseSection = {
  id: 'screens_profile',
  order: 75,
  title: cs('screens_profile_section_title'),
  items: [
    { id: 'settings-tab', title: cs('settings_tab_title'), kind: 'route', route: '/(tabs)/settings', detail: cs('real_screen') },
    { id: 'settings-language', title: cs('settings_language_title'), kind: 'route', route: '/settings_language', detail: cs('real_screen') },
    { id: 'settings-notifications', title: cs('settings_notifications_title'), kind: 'route', route: '/settings_notifications', detail: cs('real_screen') },
    { id: 'settings-themes', title: cs('settings_themes_title'), kind: 'route', route: '/settings_themes', detail: cs('real_screen') },
    { id: 'settings-edu', title: cs('settings_edu_title'), kind: 'route', route: '/settings_edu', detail: cs('real_screen') },
    { id: 'account-details', title: cs('account_details_title'), kind: 'route', route: '/account_details', detail: cs('real_screen') },
    { id: 'privacy-settings', title: cs('privacy_settings_title'), kind: 'route', route: '/privacy_settings', detail: cs('real_screen') },
    { id: 'privacy-screen', title: cs('privacy_screen_title'), kind: 'route', route: '/privacy_screen', detail: cs('real_screen') },
    { id: 'terms-screen', title: cs('terms_screen_title'), kind: 'route', route: '/terms_screen', detail: cs('real_screen') },
    { id: 'streak-stats', title: cs('streak_stats_title'), kind: 'route', route: '/streak_stats', detail: cs('real_screen') },
    { id: 'phrase-analytics', title: cs('phrase_analytics_title'), kind: 'route', route: '/phrase_analytics_screen', detail: cs('real_screen') },
    { id: 'shards-shop', title: cs('shards_shop_title'), kind: 'route', route: '/shards_shop', detail: cs('real_screen') },
    { id: 'coin-exchange', title: cs('coin_exchange_title'), kind: 'route', route: '/coin_exchange', detail: cs('real_screen') },
    { id: 'avatar-select', title: cs('avatar_select_title'), kind: 'route', route: '/avatar_select', detail: cs('real_screen') },
    { id: 'collectibles-screen', title: cs('collectibles_screen_title'), kind: 'route', route: '/collectibles_screen', detail: cs('real_screen') },
    { id: 'achievements-screen', title: cs('achievements_screen_title'), kind: 'route', route: '/achievements_screen', detail: cs('real_screen') },
    { id: 'level-gifts-inventory', title: cs('level_gifts_inventory_title'), kind: 'route', route: '/level_gifts_inventory', detail: cs('real_screen') },
    { id: 'level-reward-spin', title: cs('level_reward_spin_title'), kind: 'route', route: '/level_reward_spin', detail: cs('real_screen') },
    { id: 'season-pass', title: cs('season_pass_title'), kind: 'route', route: '/season_pass', detail: cs('real_screen') },
    { id: 'club-screen', title: cs('club_screen_title'), kind: 'route', route: '/club_screen', detail: cs('real_screen') },
    { id: 'referrals', title: cs('referrals_invite_title'), kind: 'route', route: '/referrals', detail: cs('real_screen') },
    { id: 'manage-subscription', title: cs('manage_subscription_title'), kind: 'route', route: '/manage_subscription', detail: cs('real_screen') },
    { id: 'promo-code-entry', title: cs('promo_code_entry_title'), kind: 'route', route: '/promo_code_entry', detail: cs('real_screen') },
    { id: 'diagnostic-test', title: cs('diagnostic_test_level_title'), kind: 'route', route: '/diagnostic_test', detail: cs('real_screen') },
    { id: 'exam-screen', title: cs('exam_screen_title'), kind: 'route', route: '/exam', detail: cs('real_screen') },
    { id: 'survey-screen', title: cs('survey_screen_title'), kind: 'route', route: '/survey_screen', detail: cs('real_screen') },
    { id: 'ideas-submit', title: cs('ideas_submit_title'), kind: 'route', route: '/ideas_submit', detail: cs('real_screen') },
    { id: 'community-pack-create', title: cs('community_pack_create_title'), kind: 'route', route: '/community_pack_create', detail: cs('real_screen') },
    { id: 'language-welcome', title: cs('language_welcome_title'), kind: 'route', route: '/language_welcome', detail: cs('real_screen') },
    {
      id: 'skeleton-swap-demo',
      title: cs('skeleton_swap_hybrid_title'),
      detail: cs('skeleton_swap_hybrid_detail'),
      kind: 'render',
      render: ({ visible, onClose }) => <SkeletonSwapDemoPanel visible={visible} onClose={onClose} />,
    },
  ],
};
