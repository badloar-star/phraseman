// ════════════════════════════════════════════════════════════════════════════
// PromoBanner.tsx — промо-баннер акции, управляемый из «Пульта» (remote_config).
//
// База под маркетинговые акции. Показывается ТОЛЬКО когда админ включил
// promo_banner_enabled И (срок не задан или ещё не истёк) — см.
// shouldShowPromoBanner (remote_flags). Текст/ссылка/срок берутся из
// remote_config/app.texts (promo_banner_*). Дефолт — выключено, поэтому пустая
// база ничего не показывает, пока пользователь сам не настроит акцию.
//
// Сама скидка на подписку настраивается в App Store/Google Play отдельно —
// баннер только зовёт (по ссылке/в пейвол). По образцу мягкого баннера
// MaintenanceGate: живое обновление на remote_config_changed.
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import { triLang, type Lang } from '../constants/i18n';
import { onAppEvent } from '../app/events';
import {
  isPromoBannerEnabled,
  getPromoBannerText,
  getPromoBannerUrl,
  getPromoBannerUntil,
  getPromoBannerAudience,
  getPromoBannerPlatform,
  shouldShowPromoBanner,
} from '../app/remote_flags';

interface PromoState {
  visible: boolean;
  text: string;
  url: string;
}

function readState(lang: string, nowMs: number, isPremium: boolean): PromoState {
  return {
    visible: shouldShowPromoBanner({
      enabled: isPromoBannerEnabled(),
      untilRaw: getPromoBannerUntil(),
      nowMs,
      audience: getPromoBannerAudience(),
      isPremium,
      platformFilter: getPromoBannerPlatform(),
      platform: Platform.OS,
    }),
    text: getPromoBannerText(lang),
    url: getPromoBannerUrl(),
  };
}

export default function PromoBanner() {
  const { lang } = useLang();
  const { hasPremiumAccess } = usePremium();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<PromoState>(() => readState(lang, Date.now(), hasPremiumAccess));

  useEffect(() => {
    setState(readState(lang, Date.now(), hasPremiumAccess));
    const sub = onAppEvent('remote_config_changed', () => setState(readState(lang, Date.now(), hasPremiumAccess)));
    // Срок акции может истечь, пока экран открыт → периодически перечитываем
    // видимость со свежим Date.now(), чтобы баннер сам пропал по окончании.
    const iv = setInterval(() => setState(readState(lang, Date.now(), hasPremiumAccess)), 60_000);
    return () => { sub.remove(); clearInterval(iv); };
  }, [lang, hasPremiumAccess]);

  if (!state.visible) return null;

  const hasUrl = !!(state.url && state.url.trim());

  const defaultText = triLang(lang as Lang, {
    ru: '🎉 Специальное предложение — успей!', uk: '🎉 Спеціальна пропозиція — встигни!',
    es: '🎉 Oferta especial, ¡aprovecha!', 'pt-BR': '🎉 Oferta especial, aproveite!',
    vi: '🎉 Ưu đãi đặc biệt — nhanh tay!', id: '🎉 Penawaran spesial — buruan!',
    tr: '🎉 Özel teklif — kaçırma!', pl: '🎉 Oferta specjalna — zdąż!',
  });
  const message = state.text && state.text.trim() ? state.text.trim() : defaultText;

  const onPress = () => {
    if (hasUrl) {
      void Linking.openURL(state.url.trim()).catch(() => { /* кривая ссылка — игнор */ });
    }
  };

  const barStyle = {
    marginTop: insets.top,
    backgroundColor: '#3b1d6e',
    borderBottomWidth: 1, borderBottomColor: '#5b21b6',
    paddingHorizontal: 16, paddingVertical: 10,
  } as const;
  const label = (
    <Text style={{ color: '#e9d5ff', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
      {message}
    </Text>
  );

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9997, elevation: 9997 }}
    >
      {hasUrl ? (
        // Кликабельный баннер (есть ссылка).
        <Pressable onPress={onPress} style={barStyle}>{label}</Pressable>
      ) : (
        // Без ссылки — НЕ перехватываем касания, чтобы не блокировать шапку под баннером.
        <View pointerEvents="none" style={barStyle}>{label}</View>
      )}
    </View>
  );
}
