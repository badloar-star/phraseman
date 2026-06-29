// ════════════════════════════════════════════════════════════════════════════
// PaywallTrialTimeline.tsx — таймлайн триала «Сегодня → напомним → списание».
//
// Элемент №1 по подтверждённому импакту (Blinkist: +23% стартов триала, −55%
// жалоб, push opt-in 6%→74%): прозрачность снимает страх «забуду отменить» —
// причину трети мгновенных отмен. Рендерится ТОЛЬКО при реальной бесплатной
// intro-фазе из стора; дни и цена — из стора (см. paywall_trial_info.ts).
// Toggle-триал запрещён Apple с 2026 — таймлайн его легальная замена.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { triLang, type Lang } from '../../constants/i18n';
import type { PaywallChrome } from './paywallShared';

interface Props {
  lang: Lang;
  chrome: PaywallChrome;
  /** Длительность бесплатной фазы (из стора). */
  days: number;
  /** Цена выбранного плана (строка стора) — честно называем сумму списания. */
  priceLabel: string;
  /** Подпись периода: «/год» | «/мес». */
  periodLabel: string;
}

export default function PaywallTrialTimeline({ lang, chrome, days, priceLabel, periodLabel }: Props) {
  const { tc, textPrimary, textMuted, cardBorder } = chrome;
  const remindDay = Math.max(1, days - 1);

  const rows: { icon: keyof typeof Ionicons.glyphMap; lit: boolean; title: string; sub: string }[] = [
    {
      icon: 'lock-open',
      lit: true,
      title: triLang(lang, {
        ru: 'Сегодня — полный доступ',
        uk: 'Сьогодні — повний доступ',
        es: 'Hoy: acceso completo',
        'pt-BR': 'Hoje: acesso completo',
        vi: 'Hôm nay: toàn quyền truy cập',
        id: 'Hari ini: akses penuh',
        tr: 'Bugün: tam erişim',
        pl: 'Dziś: pełny dostęp',
      }),
      sub: triLang(lang, {
        ru: 'Все уроки и безлимит. Деньги не спишутся.',
        uk: 'Усі уроки й безліміт. Гроші не спишуться.',
        es: 'Todo abierto y sin límites. No se cobra nada.',
        'pt-BR': 'Tudo liberado e sem limites. Nada será cobrado.',
        vi: 'Mở tất cả và không giới hạn. Không bị trừ tiền.',
        id: 'Semua terbuka dan tanpa batas. Tidak ada uang yang ditagih.',
        tr: 'Her şey açık ve sınırsız. Paran çekilmez.',
        pl: 'Wszystko otwarte i bez limitu. Pieniądze nie zostaną pobrane.',
      }),
    },
    {
      icon: 'notifications',
      lit: false,
      title: triLang(lang, {
        ru: `День ${remindDay} — напомним`,
        uk: `День ${remindDay} — нагадаємо`,
        es: `Día ${remindDay}: te avisamos`,
        'pt-BR': `Dia ${remindDay}: vamos avisar`,
        vi: `Ngày ${remindDay}: chúng tôi sẽ nhắc bạn`,
        id: `Hari ${remindDay}: kami ingatkan`,
        tr: `${remindDay}. gün: hatırlatırız`,
        pl: `Dzień ${remindDay}: przypomnimy`,
      }),
      sub: triLang(lang, {
        ru: 'Пуш за день до конца — забыть невозможно.',
        uk: 'Пуш за день до кінця — забути неможливо.',
        es: 'Aviso un día antes: imposible olvidarlo.',
        'pt-BR': 'Aviso um dia antes: impossível esquecer.',
        vi: 'Nhắc trước một ngày: không thể quên.',
        id: 'Notifikasi sehari sebelumnya: mustahil lupa.',
        tr: 'Bir gün önce bildirim: unutmak imkânsız.',
        pl: 'Powiadomienie dzień wcześniej: nie da się zapomnieć.',
      }),
    },
    {
      icon: 'card',
      lit: false,
      title: triLang(lang, {
        ru: `День ${days} — спишется, только если не отменишь`,
        uk: `День ${days} — спишеться, лише якщо не скасуєш`,
        es: `Día ${days}: solo se cobra si no cancelas`,
        'pt-BR': `Dia ${days}: só cobra se você não cancelar`,
        vi: `Ngày ${days}: chỉ tính phí nếu bạn không hủy`,
        id: `Hari ${days}: ditagih hanya jika kamu tidak membatalkan`,
        tr: `${days}. gün: yalnızca iptal etmezsen ücret alınır`,
        pl: `Dzień ${days}: opłata tylko, jeśli nie anulujesz`,
      }),
      sub: triLang(lang, {
        ru: `Отменишь за день до конца — ${priceLabel}${periodLabel} не спишется. Отмена — в два тапа.`,
        uk: `Скасуєш за день до кінця — ${priceLabel}${periodLabel} не спишеться. Скасування — у два тапи.`,
        es: `Cancela un día antes y no se cobra ${priceLabel}${periodLabel}. Cancelar toma dos toques.`,
        'pt-BR': `Cancele um dia antes e ${priceLabel}${periodLabel} não será cobrado. Cancelar leva dois toques.`,
        vi: `Hủy trước một ngày là không bị trừ ${priceLabel}${periodLabel}. Hủy chỉ mất hai lần chạm.`,
        id: `Batalkan sehari sebelumnya dan ${priceLabel}${periodLabel} tidak ditagih. Batal dalam dua ketukan.`,
        tr: `Bir gün önce iptal et, ${priceLabel}${periodLabel} alınmaz. İptal iki dokunuş.`,
        pl: `Anuluj dzień wcześniej, a ${priceLabel}${periodLabel} nie zostanie pobrane. Anulowanie to dwa stuknięcia.`,
      }),
    },
  ];

  return (
    <View style={[S.wrap, { borderColor: cardBorder, backgroundColor: `${tc.heroAccent}0D` }]}>
      {/* Золотая лента «бесплатно N дней» — возвращена во все варианты (была убрана). */}
      <View style={[S.ribbon, { backgroundColor: `${tc.heroAccent}1A`, borderColor: `${tc.heroAccent}40` }]}>
        <Ionicons name="gift" size={13} color={tc.heroAccent} style={{ marginRight: 6 }} />
        <Text style={[S.ribbonText, { color: tc.heroAccent }]}>
          {triLang(lang, {
            ru: `${days} дня бесплатно, потом ${priceLabel}${periodLabel}`,
            uk: `${days} дні безкоштовно, потім ${priceLabel}${periodLabel}`,
            es: `${days} días gratis, luego ${priceLabel}${periodLabel}`,
            'pt-BR': `${days} dias grátis, depois ${priceLabel}${periodLabel}`,
            vi: `${days} ngày miễn phí, sau đó ${priceLabel}${periodLabel}`,
            id: `${days} hari gratis, lalu ${priceLabel}${periodLabel}`,
            tr: `${days} gün ücretsiz, sonra ${priceLabel}${periodLabel}`,
            pl: `${days} dni za darmo, potem ${priceLabel}${periodLabel}`,
          })}
        </Text>
      </View>
      {rows.map((row, i) => (
        <View key={row.icon} style={[S.row, i < rows.length - 1 && S.rowGap]}>
          <View style={S.railCol}>
            <View style={[
              S.dot,
              row.lit
                ? { backgroundColor: tc.heroAccent, borderColor: 'transparent' }
                : { borderColor: chrome.uncheckedBorder },
            ]}>
              <Ionicons name={row.icon} size={11} color={row.lit ? tc.ctaText : textMuted} />
            </View>
            {i < rows.length - 1 && <View style={[S.rail, { backgroundColor: cardBorder }]} />}
          </View>
          <View style={S.body}>
            <Text style={[S.title, { color: textPrimary }]}>{row.title}</Text>
            <Text style={[S.sub, { color: textMuted }]}>{row.sub}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14 },
  ribbon: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, marginBottom: 12,
  },
  ribbonText: { fontSize: 11.5, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 11 },
  rowGap: { paddingBottom: 12 },
  railCol: { alignItems: 'center', width: 22 },
  dot: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  rail: { flex: 1, width: StyleSheet.hairlineWidth, marginTop: 2 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 12.5, fontWeight: '700', lineHeight: 16 },
  sub: { fontSize: 11, lineHeight: 15, marginTop: 1.5 },
});
