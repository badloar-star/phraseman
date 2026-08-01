import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from './ThemeContext';
import type { ThemeMode } from '../constants/theme';

const THEME_BANNERS: Record<ThemeMode, number> = {
  dark: require('../assets/images/settings/referral_theme/invite-dark-v2.webp'),
  gold: require('../assets/images/settings/referral_theme/invite-gold-v2.webp'),
  coral: require('../assets/images/settings/referral_theme/invite-coral-v2.webp'),
  minimalDark: require('../assets/images/settings/referral_theme/invite-indigo-v2.webp'),
  business: require('../assets/images/settings/referral_theme/invite-business-v2.webp'),
  businessLight: require('../assets/images/settings/referral_theme/invite-businessLight-v2.webp'),
  midnight: require('../assets/images/settings/referral_theme/invite-midnight-v2.webp'),
  ember: require('../assets/images/settings/referral_theme/invite-ember-v2.webp'),
  aurora: require('../assets/images/settings/referral_theme/invite-aurora-v2.webp'),
  volt: require('../assets/images/settings/referral_theme/invite-volt-v2.webp'),
  candyBlue: require('../assets/images/settings/referral_theme/invite-indigo-v2.webp'),
  indigo: require('../assets/images/settings/referral_theme/invite-indigo-v2.webp'),
};

/** New DALL·E artwork is intentionally unique for every interface theme. */
function ReferralInviteBannerArt() {
  const { themeMode } = useTheme();
  // зачем: без recyclingKey expo-image переиспользует нативную вьюху и держит
  // кадр прошлой темы — баннер не менялся при переключении темы. Ключ по теме
  // заставляет сбросить закешированный кадр ровно на смене темы (не каждый рендер).
  const banner = THEME_BANNERS[themeMode] ?? THEME_BANNERS.midnight;
  return (
    <View testID={`settings-invite-art-${themeMode}`} pointerEvents="none" style={styles.root}>
      <Image
        key={themeMode}
        recyclingKey={themeMode}
        source={banner}
        accessible={false}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: 132, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});

export default memo(ReferralInviteBannerArt);

export const REFERRAL_INVITE_BANNER_IMAGES = Object.values(THEME_BANNERS);
