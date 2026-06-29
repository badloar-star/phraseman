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
import { Ionicons } from '@expo/vector-icons';

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
  /**
   * Показать «снижатель риска» над футером. Если есть триал — «платить не нужно,
   * отмена за день до конца»; иначе — «отмена в любой момент в 2 тапа».
   * Намеренно НЕ обещаем собственный «возврат денег» — возвраты решает стор;
   * выдуманная гарантия = риск ввести в заблуждение (Apple 2.3.1 / Google).
   */
  trustHasTrial?: boolean;
}

// ── «снижатель риска» над футером ─────────────────────────────────────────────
function TrustBadge({ lang, chrome, hasTrial }: { lang: Lang; chrome: PaywallChrome; hasTrial: boolean }) {
  const accent = chrome.tc.heroAccent;
  const text = hasTrial
    ? triLang(lang, {
        ru: 'Платить сейчас не нужно — отмени за день до конца, и деньги не спишутся.',
        uk: 'Платити зараз не треба — скасуй за день до кінця, і гроші не спишуться.',
        es: 'No pagas ahora: cancela un día antes y no se cobra nada.',
        'pt-BR': 'Você não paga agora: cancele um dia antes e nada será cobrado.',
        vi: 'Chưa phải trả tiền — hủy trước một ngày là không bị trừ tiền.',
        id: 'Belum bayar sekarang — batalkan sehari sebelum berakhir, dan tidak ada uang yang ditagih.',
        tr: 'Şimdi ödeme yok — bitmeden bir gün önce iptal et, paran çekilmez.',
        pl: 'Teraz nie płacisz — anuluj dzień przed końcem, a pieniądze nie zostaną pobrane.',
      })
    : triLang(lang, {
        ru: 'Без риска: отмена в любой момент в два тапа.',
        uk: 'Без ризику: скасування будь-коли у два тапи.',
        es: 'Sin riesgo: cancela cuando quieras en dos toques.',
        'pt-BR': 'Sem risco: cancele quando quiser em dois toques.',
        vi: 'Không rủi ro: hủy bất cứ lúc nào chỉ với hai chạm.',
        id: 'Tanpa risiko: batalkan kapan saja dalam dua ketukan.',
        tr: 'Risksiz: istediğin an iki dokunuşla iptal et.',
        pl: 'Bez ryzyka: anuluj w każdej chwili dwoma dotknięciami.',
      });
  return (
    <View style={[S.trust, { backgroundColor: `${accent}12`, borderColor: `${accent}26` }]}>
      <Ionicons name="shield-checkmark-outline" size={14} color={accent} style={S.trustIcon} />
      <Text style={[S.trustText, { color: chrome.textPrimary }]}>{text}</Text>
    </View>
  );
}

export default function PaywallCtaBlock({
  lang, chrome, label, subLine, disabled, busy, onPress, onRestore, restoring, onContinueFree, hideFooter, trustHasTrial,
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

      {/* Снижатель риска: показываем только на основном CTA (не на повторе в галерее). */}
      {!hideFooter && trustHasTrial !== undefined && (
        <TrustBadge lang={lang} chrome={chrome} hasTrial={trustHasTrial} />
      )}

      {hideFooter ? null : (
      <View style={S.footer}>
        <TouchableOpacity
          onPress={onRestore}
          disabled={restoring || busy}
          accessibilityState={{ disabled: restoring || busy, busy: restoring }}
        >
          {restoring
            ? <ActivityIndicator size="small" color={textMuted} style={{ width: 80 }} />
            : <Text style={[S.footerLink, { color: textMuted }, busy && S.footerLinkDisabled]}>
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
  footerLinkDisabled: { opacity: 0.35 },
  footerDot: { fontSize: 11, opacity: 0.4 },
  ghost: { alignSelf: 'center', marginTop: 9, paddingVertical: 4, paddingHorizontal: 8 },
  ghostText: { fontSize: 12, textDecorationLine: 'underline', opacity: 0.55 },
  trust: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, borderRadius: 11, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, marginTop: 10,
  },
  trustIcon: { flexShrink: 0 },
  trustText: { flex: 1, fontSize: 11.5, lineHeight: 15.5, fontWeight: '600' },
});
