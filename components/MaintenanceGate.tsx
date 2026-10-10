import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { onAppEvent } from '../app/events';
import { animateNextLayoutTransition } from '../app/smooth_layout';
import { LinearGradient } from './SafeLinearGradient';
import {
  getMaintenanceCampaignId,
  getMaintenanceText,
  isMaintenanceBanner,
  isMaintenanceBlock,
} from '../app/remote_flags';
import {
  campaignDismissalKey,
  isCampaignDismissed,
  markCampaignDismissed,
} from '../app/campaign_dismissals';

interface MaintenanceState {
  block: boolean;
  banner: boolean;
  text: string;
  dismissalKey: string;
}

function defaultText(lang: string): string {
  return triLang(lang as Lang, {
    ru: 'Идут технические работы. Скоро вернемся.',
    uk: 'Тривають технічні роботи. Скоро повернемось.',
    en: 'We\'re under maintenance. Back soon.',
    es: 'Estamos en mantenimiento. Volvemos pronto.',
    'pt-BR': 'Estamos em manutenção. Voltamos em breve.',
    vi: 'Đang bảo trì. Chúng tôi sẽ sớm trở lại.',
    id: 'Sedang pemeliharaan. Kami segera kembali.',
    tr: 'Bakım çalışması yapılıyor. Kısa süre içinde döneceğiz.',
    pl: 'Trwają prace techniczne. Wkrótce wrócimy.',
  });
}

async function readState(lang: string): Promise<MaintenanceState> {
  const block = isMaintenanceBlock();
  const banner = isMaintenanceBanner();
  const text = getMaintenanceText(lang);
  const dismissalKey = campaignDismissalKey('maintenance_banner', getMaintenanceCampaignId(), text);
  const dismissed = await isCampaignDismissed(dismissalKey);
  return { block, banner: banner && !dismissed, text, dismissalKey };
}

export default function MaintenanceGate() {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const translateX = useRef(new Animated.Value(0)).current;
  const [state, setState] = useState<MaintenanceState>({
    block: false,
    banner: false,
    text: '',
    dismissalKey: '',
  });

  // зачем: баннер техработ стоит в потоке НАД стеком навигации (_layout) —
  // его асинхронное появление мгновенно сдвигало вниз все открытые экраны.
  // Flip видимости оборачиваем в плавный layout-переход (Bevel-стабильность).
  const lastBannerRef = useRef(false);

  const refresh = useCallback(() => {
    void readState(lang).then((next) => {
      if (lastBannerRef.current !== next.banner) animateNextLayoutTransition();
      lastBannerRef.current = next.banner;
      setState(next);
    });
  }, [lang]);

  useEffect(() => {
    refresh();
    const sub = onAppEvent('remote_config_changed', refresh);
    return () => sub.remove();
  }, [refresh]);

  const dismiss = useCallback(() => {
    if (state.dismissalKey) void markCampaignDismissed(state.dismissalKey);
    Animated.timing(translateX, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      translateX.setValue(0);
      // зачем: после слайда вправо высота баннера схлопывается плавно,
      // а не мгновенным скачком контента вверх.
      animateNextLayoutTransition();
      lastBannerRef.current = false;
      setState((prev) => ({ ...prev, banner: false }));
    });
  }, [state.dismissalKey, translateX]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => {
      translateX.setValue(gesture.dx);
    },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 84) {
        dismiss();
        return;
      }
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
    },
  }), [dismiss, translateX]);

  const message = state.text && state.text.trim() ? state.text.trim() : defaultText(lang);
  const maintenanceTitle = triLang(lang as Lang, {
    ru: 'Технические работы',
    uk: 'Технічні роботи',
    en: 'Maintenance',
    es: 'Mantenimiento',
    'pt-BR': 'Manutenção',
    vi: 'Bảo trì',
    id: 'Pemeliharaan',
    tr: 'Bakım',
    pl: 'Prace techniczne',
  });

  if (state.block) {
    return (
      <Modal
        visible
        transparent={false}
        animationType="none"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => undefined}
      >
        <View
          accessibilityViewIsModal
          importantForAccessibility="yes"
          style={{
            flex: 1,
            backgroundColor: glass.bg,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[glass.bgTop, glass.bgBottom]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <ScrollView
            testID="maintenance-block-message"
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 28,
              paddingTop: Math.max(insets.top, 24),
              paddingBottom: Math.max(insets.bottom, 24),
            }}
            showsVerticalScrollIndicator={false}
            bounces={false} decelerationRate="fast"
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 22,
                backgroundColor: glass.card,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: glass.glassEdge,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[glass.selected, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="construct-outline" size={31} color={glass.lightTint} />
            </View>
            <Text
              accessibilityRole="header"
              style={{ color: glass.text, fontSize: 23, lineHeight: 29, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}
            >
              {maintenanceTitle}
            </Text>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              accessibilityLabel={`${maintenanceTitle}. ${message}`}
              style={{ color: glass.secondary, fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 420 }}
            >
              {message}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  if (!state.banner) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        transform: [{ translateX }],
        paddingTop: Math.max(insets.top, 8),
        paddingBottom: 8,
        paddingHorizontal: 12,
        backgroundColor: glass.bg,
        zIndex: 25,
        elevation: 25,
      }}
    >
      <View
        testID="maintenance-banner-surface"
        style={{
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 8,
          borderRadius: 20,
          backgroundColor: glass.sheet,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: glass.glassEdge,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[glass.selected, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: glass.selected,
          }}
        >
          <Ionicons name="construct-outline" size={18} color={glass.lightTint} />
        </View>
        <ScrollView decelerationRate="fast"
          horizontal={false}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, maxHeight: 64 }}
          contentContainerStyle={{ justifyContent: 'center', minHeight: 46, paddingVertical: 4 }}
        >
          <Text style={{ color: glass.text, fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center' }}>
            {message}
          </Text>
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={triLang(lang as Lang, {
            ru: 'Закрыть техработы',
            uk: 'Закрити техроботи',
            en: 'Close maintenance notice',
            es: 'Cerrar mantenimiento',
            'pt-BR': 'Fechar manutenção',
            vi: 'Đóng bảo trì',
            id: 'Tutup pemeliharaan',
            tr: 'Bakımı kapat',
            pl: 'Zamknij prace techniczne',
          })}
          hitSlop={10}
          onPress={dismiss}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? glass.selected : glass.card,
          })}
        >
          <Ionicons name="close" size={20} color={glass.lightTint} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
