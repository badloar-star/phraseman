import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { openStoreReviewPage } from '../app/store_review';
import { recordVipSurveyReviewClickFromApp } from '../app/vip_survey';
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function VipSurveyReviewPromptModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const { theme: t, f, isDark, themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const isCompassTheme = themeMode === 'compass';

  const close = () => {
    hapticTap();
    onClose();
  };

  const openReview = async () => {
    hapticTap();
    void recordVipSurveyReviewClickFromApp({ storeOpened: false }).catch(() => false);
    const storeOpened = await openStoreReviewPage();
    if (storeOpened) void recordVipSurveyReviewClickFromApp({ storeOpened: true }).catch(() => false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View testID="vip-survey-review-prompt" style={[styles.card, isCompassTheme && compassShadow(3), { paddingBottom: Math.max(22, insets.bottom + 14), backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border, borderRadius: isCompassTheme ? 14 : 22, overflow: 'hidden' }]}>
          {isCompassTheme && <CompassDepthSurface radius={14} selected />}
          <TouchableOpacity
            testID="vip-survey-review-close"
            activeOpacity={0.76}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Close', 'pt-BR': 'Close', vi: 'Close', id: 'Close', tr: 'Close', pl: 'Close' })}
            onPress={close}
            style={[styles.closeButton, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : isDark ? '#17202A' : '#EEF2F7', borderColor: isCompassTheme ? COMPASS_RICH.hairline : t.border, borderRadius: isCompassTheme ? 8 : 17, overflow: 'hidden' }]}
          >
            {isCompassTheme && <CompassDepthSurface radius={8} quiet />}
            <Ionicons name="close" size={20} color={t.textPrimary} />
          </TouchableOpacity>

          <View style={[styles.iconWrap, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalWarm : 'rgba(34,197,94,0.14)', borderRadius: isCompassTheme ? 10 : 29, borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent', overflow: 'hidden' }]}>
            {isCompassTheme && <CompassDepthSurface radius={10} selected />}
            <Ionicons name="star" size={28} color={isCompassTheme ? COMPASS_RICH.champagne : '#22C55E'} />
          </View>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.max(22, f.h2) }]}>
            {triLang(lang, {
              ru: 'Ваш VIP активирован',
              uk: 'Ваш VIP активовано',
              es: 'Your VIP is active',
              'pt-BR': 'Your VIP is active',
              vi: 'Your VIP is active',
              id: 'Your VIP is active',
              tr: 'Your VIP is active',
              pl: 'Your VIP is active',
            })}
          </Text>
          <Text style={[styles.body, { color: t.textMuted, fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'Хотите поделиться впечатлением о Phraseman? Честный отзыв поможет другим людям понять, чего ждать от приложения.',
              uk: 'Хочете поділитися враженням про Phraseman? Чесний відгук допоможе іншим людям зрозуміти, чого чекати від застосунку.',
              es: 'Would you like to share your impression of Phraseman? An honest review helps other people know what to expect from the app.',
              'pt-BR': 'Would you like to share your impression of Phraseman? An honest review helps other people know what to expect from the app.',
              vi: 'Would you like to share your impression of Phraseman? An honest review helps other people know what to expect from the app.',
              id: 'Would you like to share your impression of Phraseman? An honest review helps other people know what to expect from the app.',
              tr: 'Would you like to share your impression of Phraseman? An honest review helps other people know what to expect from the app.',
              pl: 'Would you like to share your impression of Phraseman? An honest review helps other people know what to expect from the app.',
            })}
          </Text>
          <TouchableOpacity
            testID="vip-survey-review-write"
            activeOpacity={0.88}
            accessibilityRole="button"
            onPress={openReview}
            style={[styles.primaryButton, isCompassTheme && compassShadow(2), { backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : '#16A34A', borderRadius: isCompassTheme ? 9 : 16, borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent', overflow: 'hidden' }]}
          >
            {isCompassTheme && <CompassDepthSurface radius={9} cream />}
            <Ionicons name="create-outline" size={19} color={isCompassTheme ? COMPASS_RICH.textDark : '#FFFFFF'} />
            <Text style={[styles.primaryText, { fontSize: f.body, color: isCompassTheme ? COMPASS_RICH.textDark : '#FFFFFF' }]}>
              {triLang(lang, { ru: 'Написать отзыв', uk: 'Написати відгук', es: 'Write a review', 'pt-BR': 'Write a review', vi: 'Write a review', id: 'Write a review', tr: 'Write a review', pl: 'Write a review' })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(0,0,0,0.56)',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    paddingTop: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,197,94,0.14)',
    marginBottom: 14,
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    width: '100%',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
