import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import { useTheme } from './ThemeContext';
import { monoIcon } from '../constants/monoIcon';
import { triLang, type Lang } from '../constants/i18n';
import { onAppEvent } from '../app/events';
import {
  getPromoBannerAudience,
  getPromoBannerCampaignId,
  getPromoBannerPlatform,
  getPromoBannerText,
  getPromoBannerUntil,
  getPromoBannerUrl,
  isPromoBannerEnabled,
  parsePromoUntilMs,
  shouldShowPromoBanner,
} from '../app/remote_flags';
import { createCampaignExpiryScheduler } from '../app/campaign_expiry_scheduler';
import { runtimeAppStateStore } from '../app/runtime_app_state_store';
import {
  campaignDismissalKey,
  isCampaignDismissed,
  markCampaignDismissed,
} from '../app/campaign_dismissals';

interface PromoState {
  visible: boolean;
  text: string;
  url: string;
  dismissalKey: string;
  untilMs: number | null;
}

function defaultText(lang: string): string {
  return triLang(lang as Lang, {
    ru: 'Специальное предложение — успей!',
    uk: 'Спеціальна пропозиція — встигни!',
    es: 'Oferta especial, aprovecha',
    'pt-BR': 'Oferta especial, aproveite',
    vi: 'Ưu đãi đặc biệt — nhanh tay',
    id: 'Penawaran spesial — buruan',
    tr: 'Özel teklif — kaçırma',
    pl: 'Oferta specjalna — zdąż',
  });
}

async function readState(lang: string, nowMs: number, isPremium: boolean): Promise<PromoState> {
  const text = getPromoBannerText(lang);
  const url = getPromoBannerUrl();
  const untilRaw = getPromoBannerUntil();
  const audience = getPromoBannerAudience();
  const platformFilter = getPromoBannerPlatform();
  const fingerprint = [text, url, untilRaw, audience, platformFilter].join('|');
  const dismissalKey = campaignDismissalKey('promo_banner', getPromoBannerCampaignId(), fingerprint);
  const dismissed = await isCampaignDismissed(dismissalKey);
  return {
    visible: !dismissed && shouldShowPromoBanner({
      enabled: isPromoBannerEnabled(),
      untilRaw,
      nowMs,
      audience,
      isPremium,
      platformFilter,
      platform: Platform.OS,
    }),
    text,
    url,
    dismissalKey,
    untilMs: parsePromoUntilMs(untilRaw),
  };
}

export default function PromoBanner() {
  const { lang } = useLang();
  const { hasPremiumAccess } = usePremium();
  const { themeMode } = useTheme();
  const insets = useStableSafeAreaInsets();
  const translateX = useRef(new Animated.Value(0)).current;
  const [state, setState] = useState<PromoState>({
    visible: false,
    text: '',
    url: '',
    dismissalKey: '',
    untilMs: null,
  });
  const refreshGeneration = useRef(0);
  const refreshRef = useRef<() => void>(() => {});
  const expiryScheduler = useRef(createCampaignExpiryScheduler({
    now: Date.now,
    setTimeout: (listener, delayMs) => setTimeout(listener, delayMs),
    clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  })).current;

  const refresh = useCallback(() => {
    const generation = ++refreshGeneration.current;
    void readState(lang, Date.now(), hasPremiumAccess).then((next) => {
      if (generation !== refreshGeneration.current) return;
      setState(next);
      expiryScheduler.setUntil(next.visible ? next.untilMs : null, () => refreshRef.current());
    });
  }, [expiryScheduler, hasPremiumAccess, lang]);
  refreshRef.current = refresh;

  useEffect(() => {
    refresh();
    const sub = onAppEvent('remote_config_changed', refresh);
    const appStateOff = runtimeAppStateStore.subscribe(() => {
      const active = runtimeAppStateStore.getSnapshot();
      expiryScheduler.setActive(active);
      if (active) refresh();
    });
    expiryScheduler.setActive(runtimeAppStateStore.getSnapshot());
    return () => {
      refreshGeneration.current += 1;
      sub.remove();
      appStateOff();
      expiryScheduler.dispose();
    };
  }, [expiryScheduler, refresh]);

  const dismiss = useCallback(() => {
    if (state.dismissalKey) void markCampaignDismissed(state.dismissalKey);
    Animated.timing(translateX, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      translateX.setValue(0);
      setState((prev) => ({ ...prev, visible: false }));
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

  if (!state.visible) return null;

  const message = state.text && state.text.trim() ? state.text.trim() : defaultText(lang);
  const hasUrl = !!(state.url && state.url.trim());

  const openUrl = () => {
    if (!hasUrl) return;
    void Linking.openURL(state.url.trim()).catch(() => {});
  };

  const content = (
    <Text
      numberOfLines={2}
      style={{
        color: monoIcon(themeMode, '#f3e8ff'),
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '800',
        textAlign: 'center',
      }}
    >
      {message}
    </Text>
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        transform: [{ translateX }],
        paddingTop: Math.max(insets.top, 8),
        paddingBottom: 8,
        paddingHorizontal: 12,
        backgroundColor: '#3b1d6e',
        borderBottomWidth: 1,
        borderBottomColor: '#5b21b6',
        zIndex: 20,
        elevation: 20,
      }}
    >
      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {hasUrl ? (
          <Pressable
            accessibilityRole="link"
            onPress={openUrl}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              opacity: pressed ? 0.82 : 1,
            })}
          >
            {content}
          </Pressable>
        ) : (
          <View style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            {content}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={triLang(lang as Lang, {
            ru: 'Закрыть предложение',
            uk: 'Закрити пропозицію',
            es: 'Cerrar oferta',
            'pt-BR': 'Fechar oferta',
            vi: 'Đóng ưu đãi',
            id: 'Tutup penawaran',
            tr: 'Teklifi kapat',
            pl: 'Zamknij ofertę',
          })}
          hitSlop={10}
          onPress={dismiss}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.12)',
          })}
        >
          <Ionicons name="close" size={20} color={monoIcon(themeMode, '#f3e8ff')} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
