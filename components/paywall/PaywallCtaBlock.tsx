// ════════════════════════════════════════════════════════════════════════════
// PaywallCtaBlock.tsx — CTA + честный сабтекст с ценой прямо под кнопкой
// (гигиена App Store 3.1.2: цена/период/автопродление — крупно, не в сноске)
// + футер (Восстановить · Условия · Конфиденциальность — обязательны)
// + ghost «Продолжить бесплатно».
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import DuoPressable from '../DuoPressable';
import PressableHybrid from '../PressableHybrid';
import { triLang, type Lang } from '../../constants/i18n';
import type { PaywallChrome } from './paywallShared';
import { PaywallCtaShine } from './PaywallMotion';
import { noAndroidOutline } from '../../constants/androidGlow';

// зачем: DuoPressable требует непрозрачный edgeColor (кромка-«подошва» клавиши),
// а ctaShadow части тем (midnight/ember/aurora/volt) намеренно 'transparent' —
// они использовались только как shadowColor, не как заливка. Тёмная кромка
// клавиши считается прямо из ctaBg темы, а не изобретается заново.
function isOpaqueHex(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

function darkenHex(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Тёмный тон акцента CTA для кромки DuoPressable: ctaShadow, если это
 *  непрозрачный hex темы; иначе — ctaBg, затемнённый на 28%. Экспортируется —
 *  тот же тон нужен sticky-CTA (paywallShared.tsx), не дублируем логику. */
export function resolveCtaEdgeColor(chrome: PaywallChrome): string {
  const { ctaShadow, ctaBg } = chrome.tc;
  if (isOpaqueHex(ctaShadow)) return ctaShadow;
  if (isOpaqueHex(ctaBg)) return darkenHex(ctaBg, 0.28);
  return 'rgba(0,0,0,0.32)';
}

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
  isOnboarding?: boolean;
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
  lang, chrome, label, subLine, disabled, busy, onPress, onRestore, restoring, onContinueFree, hideFooter, trustHasTrial, isOnboarding,
}: Props) {
  const { tc, textMuted } = chrome;
  // зачем: владелец — главная CTA пейвола обязана быть клавишей с кромкой
  // (вдавливается, а не тускнеет), как весь остальной прод. edgeColor считается
  // из токенов темы (ctaShadow/ctaBg), никаких новых цветов не вводим.
  const ctaEdgeColor = resolveCtaEdgeColor(chrome);

  return (
    <View>
      <DuoPressable
        onPress={onPress}
        disabled={disabled}
        edgeColor={ctaEdgeColor}
        edgeHeight={6}
        gradientColors={isOnboarding ? ['#D7E0FF', '#8FA0FF', '#A95BFF'] : undefined}
        style={[S.cta, {
          backgroundColor: isOnboarding ? '#8FA0FF' : tc.ctaBg,
          shadowColor: tc.ctaShadow,
          opacity: disabled && !busy ? 0.5 : 1,
        }]}
      >
        {/* Блик-полоса раз в ~5.6с (гейтится фокусом/AppState/reduce-motion);
            лежит ПОД текстом — поздние siblings рисуются поверх. */}
        <PaywallCtaShine />
        {busy
          ? <ActivityIndicator color={tc.ctaText} />
          : <Text style={[S.ctaText, { color: tc.ctaText }]} numberOfLines={1}>{label}</Text>}
      </DuoPressable>

      <Text style={[S.subLine, { color: textMuted }]} numberOfLines={3}>{subLine}</Text>

      {/* Снижатель риска: показываем только на основном CTA (не на повторе в галерее). */}
      {!hideFooter && trustHasTrial !== undefined && (
        <TrustBadge lang={lang} chrome={chrome} hasTrial={trustHasTrial} />
      )}

      {hideFooter ? null : (
      <View style={S.footer}>
        <PressableHybrid
          variant="chip"
          style={S.footerLinkPress}
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
        </PressableHybrid>
        <Text style={[S.footerDot, { color: textMuted }]}>·</Text>
        <PressableHybrid
          variant="chip"
          style={S.footerLinkPress}
          onPress={() => Linking.openURL('https://phraseman.app/terms').catch(() => {})}
        >
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
        </PressableHybrid>
        <Text style={[S.footerDot, { color: textMuted }]}>·</Text>
        <PressableHybrid
          variant="chip"
          style={S.footerLinkPress}
          onPress={() => Linking.openURL('https://phraseman.app/privacy').catch(() => {})}
        >
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
        </PressableHybrid>
      </View>
      )}

      {!hideFooter && onContinueFree && (
        <PressableHybrid variant="secondary" style={S.ghost} onPress={onContinueFree}>
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
        </PressableHybrid>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  cta: {
    borderRadius: 32, paddingVertical: 18, alignItems: 'center', overflow: 'hidden',
    // зачем: главная CTA-кнопка пейвола — фон рисует градиент внутри, поэтому
    // Android заливал квадрат вокруг скругления 32. На iOS тень как была.
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.42, shadowRadius: 16,
    ...noAndroidOutline,
  },
  ctaText: { fontSize: 19, fontWeight: '900', letterSpacing: 0, paddingHorizontal: 14 },
  subLine: { textAlign: 'center', fontSize: 13, lineHeight: 17.5, marginTop: 10, fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 12 },
  // зачем: PressableHybrid по умолчанию alignSelf:'stretch' (растягивает на всю
  // ширину строки-контейнера) — ссылки футера должны остаться inline-шириной.
  footerLinkPress: { alignSelf: 'auto' },
  footerLink: { fontSize: 12.5, opacity: 0.72 }, // guard-ok: самостоятельная ссылка (Восстановить/Условия/Конфиденциальность), не подпись под заголовком
  footerLinkDisabled: { opacity: 0.35 },
  footerDot: { fontSize: 12.5, opacity: 0.42 },
  ghost: { alignSelf: 'center', marginTop: 10, paddingVertical: 6, paddingHorizontal: 10 },
  ghostText: { fontSize: 13.5, textDecorationLine: 'underline', opacity: 0.6 },
  trust: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, borderWidth: 0, paddingVertical: 9, paddingHorizontal: 13, marginTop: 11,
  },
  trustIcon: { flexShrink: 0 },
  trustText: { flex: 1, fontSize: 13, lineHeight: 17.5, fontWeight: '700' },
});
