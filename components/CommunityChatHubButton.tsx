import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { formatLeagueChatUnreadBadge } from '../app/league_chat_unread';
import { useLeagueChatUnread } from '../app/use_league_chat_unread';
import ScreenGradient from './ScreenGradient';
import HelpBoardPanel from './HelpBoardPanel';
import LeagueChatPanel from './LeagueChatPanel';
import { HOME_NOTIFICATION_BADGE_COLOR, HOME_NOTIFICATION_BADGE_TEXT_COLOR } from './homeNotificationBadge';
import { subscribeCommunityHubDeepLink } from '../app/community_hub_deeplink';

type CommunityHubTab = 'help' | 'league';

function hubCopy(lang: Lang) {
  return {
    title: triLang(lang, { ru: 'Чаты', uk: 'Чати', es: 'Chats', 'pt-BR': 'Chats', vi: 'Chat', id: 'Chat', tr: 'Sohbetler', pl: 'Czaty' }),
    helpBoard: triLang(lang, { ru: 'Help Board', uk: 'Help Board', es: 'Help Board', 'pt-BR': 'Help Board', vi: 'Help Board', id: 'Help Board', tr: 'Help Board', pl: 'Help Board' }),
    leagueChat: triLang(lang, { ru: 'Чат лиги', uk: 'Чат ліги', es: 'Chat de liga', 'pt-BR': 'Chat da liga', vi: 'Chat liga', id: 'Chat liga', tr: 'Lig sohbeti', pl: 'Czat ligi' }),
    close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }),
  };
}

function CommunityChatHubButton() {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const topInset = Math.max(18, insets.top + 8);
  const copy = hubCopy(lang as Lang);
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<CommunityHubTab>('help');
  // Deep-link из центра уведомлений: цель для каждой панели, отдаём проп и очищаем после consume.
  const [helpDeepLink, setHelpDeepLink] = useState<{ topicId: string; commentId?: string } | null>(null);
  const [leagueDeepLink, setLeagueDeepLink] = useState<{ messageId: string } | null>(null);
  const leagueUnreadCount = useLeagueChatUnread({ active: visible && tab === 'league' });
  const activeTitle = tab === 'help' ? copy.helpBoard : copy.leagueChat;

  useEffect(() => subscribeCommunityHubDeepLink((link) => {
    if (link.tab === 'help') {
      setHelpDeepLink({ topicId: link.topicId, commentId: link.commentId });
      setTab('help');
    } else {
      setLeagueDeepLink({ messageId: link.messageId });
      setTab('league');
    }
    setVisible(true);
  }), []);

  const open = () => {
    hapticTap();
    setTab('help');
    setVisible(true);
  };

  const close = () => {
    hapticTap();
    setVisible(false);
    setTab('help');
  };

  const selectTab = (next: CommunityHubTab) => {
    hapticTap();
    setTab(next);
  };

  const renderTab = (key: CommunityHubTab, label: string, icon: keyof typeof Ionicons.glyphMap, badgeCount = 0) => {
    const active = tab === key;
    return (
      <TouchableOpacity
        key={key}
        testID={key === 'help' ? 'community-chat-help-tab' : 'community-chat-league-tab'}
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
        onPress={() => selectTab(key)}
        style={[
          styles.tab,
          {
            borderColor: 'transparent',
            backgroundColor: 'transparent',
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={active ? t.accent : t.textMuted} />
        {badgeCount > 0 ? (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{formatLeagueChatUnreadBadge(badgeCount)}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity
        testID="home-league-chat-button"
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={copy.title}
        onPress={open}
        style={styles.headerButton}
      >
        <View style={styles.headerIconWrap}>
          <Ionicons name="chatbubbles-outline" size={30} color={t.accent} />
        </View>
        {leagueUnreadCount > 0 ? (
          <View testID="home-community-chat-unread-badge" style={styles.badge}>
            <Text style={styles.badgeText}>{formatLeagueChatUnreadBadge(leagueUnreadCount)}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
        {/* Глубокий фирменный градиент вместо плоского bgCard: очень тёмный фон
            с деликатными свечениями в оттенке активной темы (зелёные орбы для
            зелёной темы и т.д.) — ScreenGradient сам подстраивается под themeMode.
            forceFullBleed: это полноэкранная модалка, нужен собственный фон. */}
        <ScreenGradient forceFullBleed>
        <View testID="community-chat-hub-fullscreen" style={[styles.screen, { backgroundColor: 'transparent', paddingTop: topInset }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerTabs}>
                {renderTab('help', copy.helpBoard, 'chatbubble-ellipses-outline')}
                {renderTab('league', copy.leagueChat, 'chatbubbles-outline', leagueUnreadCount)}
              </View>
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={[styles.headerTitle, { color: t.textPrimary }]}
              >
                {activeTitle}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityRole="button"
              accessibilityLabel={copy.close}
              onPress={close}
              style={[styles.closeButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}
            >
              <Ionicons name="close" size={22} color={t.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {tab === 'help' ? (
              <HelpBoardPanel
                deepLink={helpDeepLink}
                onDeepLinkConsumed={() => setHelpDeepLink(null)}
                onToast={(message, type) => {
                  if (type === 'error') Alert.alert(copy.helpBoard, message);
                }}
              />
            ) : (
              <LeagueChatPanel
                deepLink={leagueDeepLink}
                onDeepLinkConsumed={() => setLeagueDeepLink(null)}
                onToast={(message, type) => {
                  if (type === 'error') Alert.alert(copy.leagueChat, message);
                }}
              />
            )}
          </View>
        </View>
        </ScreenGradient>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 48,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconWrap: {
    width: 44,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 3,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: HOME_NOTIFICATION_BADGE_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: HOME_NOTIFICATION_BADGE_TEXT_COLOR,
    fontSize: 10,
    fontWeight: '900',
  },
  screen: {
    flex: 1,
  },
  header: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: HOME_NOTIFICATION_BADGE_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: HOME_NOTIFICATION_BADGE_TEXT_COLOR,
    fontSize: 9,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
  },
});

export default memo(CommunityChatHubButton);
