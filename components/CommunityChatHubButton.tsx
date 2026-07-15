import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import ScreenGradient from './ScreenGradient';
import HelpBoardPanel from './HelpBoardPanel';
import { subscribeCommunityHubDeepLink } from '../app/community_hub_deeplink';

function hubCopy(lang: Lang) {
  return {
    title: triLang(lang, { ru: 'Help Board', uk: 'Help Board', es: 'Help Board', 'pt-BR': 'Help Board', vi: 'Help Board', id: 'Help Board', tr: 'Help Board', pl: 'Help Board' }),
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
  const [helpDeepLink, setHelpDeepLink] = useState<{ topicId: string; commentId?: string } | null>(null);

  useEffect(() => subscribeCommunityHubDeepLink((link) => {
    setHelpDeepLink({ topicId: link.topicId, commentId: link.commentId });
    setVisible(true);
  }), []);

  const open = () => {
    hapticTap();
    setVisible(true);
  };

  const close = () => {
    hapticTap();
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        testID="home-help-board-button"
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={copy.title}
        onPress={open}
        style={styles.headerButton}
      >
        <View style={styles.headerIconWrap}>
          <Ionicons name="chatbubble-ellipses-outline" size={30} color={t.accent} />
        </View>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
        <ScreenGradient forceFullBleed>
          <View testID="community-chat-hub-fullscreen" style={[styles.screen, { backgroundColor: 'transparent', paddingTop: topInset }]}>
            <View style={styles.header}>
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityRole="button"
                accessibilityLabel={copy.close}
                hitSlop={8}
                onPress={close}
                style={[styles.closeButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}
              >
                <Ionicons name="close" size={22} color={t.textPrimary} />
              </TouchableOpacity>
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={[styles.headerTitle, { color: t.textPrimary }]}
              >
                {copy.title}
              </Text>
            </View>

            <View style={styles.content}>
              <HelpBoardPanel
                deepLink={helpDeepLink}
                onDeepLinkConsumed={() => setHelpDeepLink(null)}
                onToast={(message, type) => {
                  if (type === 'error') Alert.alert(copy.title, message);
                }}
              />
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
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
  },
});

export default memo(CommunityChatHubButton);
