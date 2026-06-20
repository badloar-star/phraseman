// ════════════════════════════════════════════════════════════════════════════
// PaywallCtaBlock.tsx — CTA + честный сабтекст с ценой прямо под кнопкой
// (гигиена App Store 3.1.2: цена/период/автопродление — крупно, не в сноске)
// + футер (Восстановить · Условия · Конфиденциальность — обязательны)
// + ghost «Продолжить бесплатно». Бегущий блик — существующий ShineOverlay.
// ════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking,
} from 'react-native';

import ShineOverlay from '../ShineOverlay';
import { triLang, type Lang } from '../../constants/i18n';
import type { PaywallChrome } from './paywallShared';

interface Props {
  lang: Lang;
  chrome: PaywallChrome;
  label: string;
  /** Честная строка под CTA: «затем 2 990 ₽/год · отмена в любой момент». */
  subLine: string;
  disabled: boolean;
  busy: boolean;
  onPress: () => void;
  onRestore: () => void;
  restoring: boolean;
  onContinueFree?: () => void;
  /** Повторный CTA в галерее: без футера и ghost-ссылки. */
  hideFooter?: boolean;
}

export default function PaywallCtaBlock({
  lang, chrome, label, subLine, disabled, busy, onPress, onRestore, restoring, onContinueFree, hideFooter,
}: Props) {
  const { tc, textMuted } = chrome;
  const [ctaSize, setCtaSize] = useState({ w: 0, h: 0 });

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={onPress}
        disabled={disabled}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width !== ctaSize.w || height !== ctaSize.h) setCtaSize({ w: width, h: height });
        }}
        style={[S.cta, {
          backgroundColor: tc.ctaBg,
          shadowColor: tc.ctaShadow,
          opacity: disabled && !busy ? 0.5 : 1,
        }]}
      >
        {busy
          ? <ActivityIndicator color={tc.ctaText} />
          : <Text style={[S.ctaText, { color: tc.ctaText }]} numberOfLines={1}>{label}</Text>}
        {!disabled && !busy && ctaSize.w > 0 && (
          <ShineOverlay width={ctaSize.w} height={ctaSize.h} borderRadius={30} />
        )}
      </TouchableOpacity>

      <Text style={[S.subLine, { color: textMuted }]} numberOfLines={3}>{subLine}</Text>

      {hideFooter ? null : (
      <View style={S.footer}>
        <TouchableOpacity onPress={onRestore} disabled={restoring}>
          {restoring
            ? <ActivityIndicator size="small" color={textMuted} style={{ width: 80 }} />
            : <Text style={[S.footerLink, { color: textMuted }]}>
                {triLang(lang, {
                  ru: 'Восстановить',
                  uk: 'Відновити',
                  es: 'Restaurar',
                  'pt-BR': 'Restaurar',
                  vi: 'Khôi phục',
                  id: 'Pulihkan',
                  tr: 'Geri yükle',
                  pl: 'Przywróć',
                })}
              </Text>}
        </TouchableOpacity>
        <Text style={[S.footerDot, { color: textMuted }]}>·</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://phraseman.app/terms').catch(() => {})}>
          <Text style={[S.footerLink, { color: textMuted }]}>
            {triLang(lang, {
              ru: 'Условия',
              uk: 'Умови',
              es: 'Términos',
              'pt-BR': 'Termos',
              vi: 'Điều khoản',
              id: 'Syarat',
              tr: 'Şartlar',
              pl: 'Warunki',
            })}
          </Text>
        </TouchableOpacity>
        <Text style={[S.footerDot, { color: textMuted }]}>·</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://phraseman.app/privacy').catch(() => {})}>
          <Text style={[S.footerLink, { color: textMuted }]}>
            {triLang(lang, {
              ru: 'Конфиденциальность',
              uk: 'Конфіденційність',
              es: 'Privacidad',
              'pt-BR': 'Privacidade',
              vi: 'Quyền riêng tư',
              id: 'Privasi',
              tr: 'Gizlilik',
              pl: 'Prywatność',
            })}
          </Text>
        </TouchableOpacity>
      </View>
      )}

      {!hideFooter && onContinueFree && (
        <TouchableOpacity onPress={onContinueFree} style={S.ghost}>
          <Text style={[S.ghostText, { color: textMuted }]}>
            {triLang(lang, {
              ru: 'Продолжить бесплатно',
              uk: 'Продовжити безкоштовно',
              es: 'Continuar gratis',
              'pt-BR': 'Continuar grátis',
              vi: 'Tiếp tục miễn phí',
              id: 'Lanjut gratis',
              tr: 'Ücretsiz devam et',
              pl: 'Kontynuuj za darmo',
            })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  cta: {
    borderRadius: 30, paddingVertical: 16, alignItems: 'center', overflow: 'hidden',
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  ctaText: { fontSize: 17.5, fontWeight: '900', letterSpacing: -0.2, paddingHorizontal: 12 },
  subLine: { textAlign: 'center', fontSize: 11.5, lineHeight: 15.5, marginTop: 9, fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 11 },
  footerLink: { fontSize: 11, opacity: 0.7 },
  footerDot: { fontSize: 11, opacity: 0.4 },
  ghost: { alignSelf: 'center', marginTop: 9, paddingVertical: 4, paddingHorizontal: 8 },
  ghostText: { fontSize: 12, textDecorationLine: 'underline', opacity: 0.55 },
});
