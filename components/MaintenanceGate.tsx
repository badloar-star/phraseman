import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { monoIcon } from '../constants/monoIcon';
import { triLang, type Lang } from '../constants/i18n';
import { onAppEvent } from '../app/events';
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
  const { themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(0)).current;
  const [state, setState] = useState<MaintenanceState>({
    block: false,
    banner: false,
    text: '',
    dismissalKey: '',
  });

  const refresh = useCallback(() => {
    void readState(lang).then(setState);
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

  if (state.block) {
    return (
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#0b0b12',
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 28,
          zIndex: 9999, elevation: 9999,
        }}
      >
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: 22,
            backgroundColor: '#431407',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          <Ionicons name="construct-outline" size={32} color={monoIcon(themeMode, '#fed7aa')} />
        </View>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>
          {triLang(lang as Lang, {
            ru: 'Технические работы',
            uk: 'Технічні роботи',
            es: 'Mantenimiento',
            'pt-BR': 'Manutenção',
            vi: 'Bảo trì',
            id: 'Pemeliharaan',
            tr: 'Bakım',
            pl: 'Prace techniczne',
          })}
        </Text>
        <Text style={{ color: monoIcon(themeMode, '#cbd5e1'), fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 420 }}>
          {message}
        </Text>
      </View>
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
        backgroundColor: '#7c2d12',
        borderBottomWidth: 1,
        borderBottomColor: '#9a3412',
        zIndex: 25,
        elevation: 25,
      }}
    >
      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.14)',
          }}
        >
          <Ionicons name="construct-outline" size={18} color={monoIcon(themeMode, '#fed7aa')} />
        </View>
        <ScrollView
          horizontal={false}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, maxHeight: 54 }}
          contentContainerStyle={{ justifyContent: 'center', minHeight: 44 }}
        >
          <Text style={{ color: monoIcon(themeMode, '#fed7aa'), fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center' }}>
            {message}
          </Text>
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={triLang(lang as Lang, {
            ru: 'Закрыть техработы',
            uk: 'Закрити техроботи',
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
            backgroundColor: pressed ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.12)',
          })}
        >
          <Ionicons name="close" size={20} color={monoIcon(themeMode, '#fed7aa')} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
