import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { triLang, type Lang } from '../../constants/i18n';
import type { PaywallChrome } from './paywallShared';

type Props = Readonly<{
  lang: Lang;
  chrome: PaywallChrome;
  priceLabel: string;
  periodLabel: string;
}>;

export default function PaywallTrialStages({ lang, chrome, priceLabel, periodLabel }: Props) {
  const { tc, textPrimary, textMuted, cardBorder } = chrome;
  const rows: readonly {
    icon: keyof typeof Ionicons.glyphMap;
    active: boolean;
    title: string;
    detail: string;
  }[] = [
    {
      icon: 'lock-open',
      active: true,
      title: triLang(lang, {
        ru: 'Сейчас — полный доступ', uk: 'Зараз — повний доступ', en: 'Now — full access', es: 'Ahora: acceso completo',
        'pt-BR': 'Agora: acesso completo', vi: 'Bây giờ: toàn quyền truy cập', id: 'Sekarang: akses penuh',
        tr: 'Şimdi: tam erişim', pl: 'Teraz: pełny dostęp',
      }),
      detail: triLang(lang, {
        ru: 'Возможности Plus. Деньги сейчас не спишутся.', uk: 'Можливості Plus. Гроші зараз не спишуться.', en: 'Plus features. Nothing is charged now.', es: 'Funciones de Plus. No se cobra nada ahora.',
        'pt-BR': 'Recursos do Plus. Nada será cobrado agora.', vi: 'Các tính năng Plus. Chưa bị tính phí.', id: 'Fitur Plus. Belum ada tagihan.',
        tr: 'Plus özellikleri. Şimdi ücret alınmaz.', pl: 'Funkcje Plus. Teraz opłata nie zostanie pobrana.',
      }),
    },
    {
      icon: 'notifications-outline',
      active: false,
      title: triLang(lang, {
        ru: 'Перед окончанием — напоминание, если разрешено', uk: 'Перед завершенням — нагадування, якщо дозволено', en: 'Before it ends — reminder, if allowed', es: 'Antes de que termine: aviso, si está permitido',
        'pt-BR': 'Antes de terminar: aviso, se permitido', vi: 'Trước khi kết thúc: nhắc nếu được phép', id: 'Sebelum berakhir: pengingat jika diizinkan',
        tr: 'Bitmeden önce: izin varsa hatırlatma', pl: 'Przed końcem: przypomnienie, jeśli dozwolone',
      }),
      detail: triLang(lang, {
        ru: 'Если уведомления разрешены, напомним до первого списания.', uk: 'Якщо сповіщення дозволені, нагадаємо до першого списання.', en: 'If notifications are allowed, we will remind you before the first charge.', es: 'Si permites las notificaciones, te avisaremos antes del primer cobro.',
        'pt-BR': 'Se as notificações estiverem permitidas, avisaremos antes da primeira cobrança.', vi: 'Nếu thông báo được cho phép, chúng tôi sẽ nhắc trước lần tính phí đầu tiên.', id: 'Jika notifikasi diizinkan, kami akan mengingatkan sebelum tagihan pertama.',
        tr: 'Bildirimlere izin verilirse ilk ödeme öncesinde hatırlatırız.', pl: 'Jeśli powiadomienia są dozwolone, przypomnimy przed pierwszą opłatą.',
      }),
    },
    {
      icon: 'card-outline',
      active: false,
      title: triLang(lang, {
        ru: 'После пробного периода — оплата, если не отменишь', uk: 'Після пробного періоду — оплата, якщо не скасуєш', en: `After the trial — charged only if you don't cancel`, es: 'Después de la prueba: solo se cobra si no cancelas',
        'pt-BR': 'Depois do teste: só cobra se você não cancelar', vi: 'Sau thời gian dùng thử: chỉ tính phí nếu bạn không hủy', id: 'Setelah uji coba: ditagih hanya jika kamu tidak membatalkan',
        tr: 'Denemeden sonra: yalnızca iptal etmezsen ücret alınır', pl: 'Po okresie próbnym: opłata tylko, jeśli nie anulujesz',
      }),
      detail: triLang(lang, {
        ru: `Если не отменишь, дальше — ${priceLabel}${periodLabel}.`, uk: `Якщо не скасуєш, далі — ${priceLabel}${periodLabel}.`, en: `If you do not cancel, it is ${priceLabel}${periodLabel} afterward.`, es: `Si no cancelas, después son ${priceLabel}${periodLabel}.`,
        'pt-BR': `Se não cancelar, depois será ${priceLabel}${periodLabel}.`, vi: `Nếu không hủy, sau đó là ${priceLabel}${periodLabel}.`, id: `Jika tidak dibatalkan, berikutnya ${priceLabel}${periodLabel}.`,
        tr: `İptal etmezsen sonrasında ${priceLabel}${periodLabel}.`, pl: `Jeśli nie anulujesz, później ${priceLabel}${periodLabel}.`,
      }),
    },
  ];

  return <View style={[S.wrap, { backgroundColor: `${tc.heroAccent}0D` }]}>
    <View style={[S.ribbon, { backgroundColor: `${tc.heroAccent}1A` }]}>
      <Ionicons name="gift-outline" size={15} color={tc.heroAccent} />
      <Text style={[S.ribbonText, { color: tc.heroAccent }]}>{triLang(lang, {
        ru: `Пробный доступ, потом ${priceLabel}${periodLabel}`, uk: `Пробний доступ, потім ${priceLabel}${periodLabel}`, en: `Trial access, then ${priceLabel}${periodLabel}`, es: `Acceso de prueba, luego ${priceLabel}${periodLabel}`,
        'pt-BR': `Acesso de teste, depois ${priceLabel}${periodLabel}`, vi: `Quyền truy cập dùng thử, sau đó ${priceLabel}${periodLabel}`, id: `Akses uji coba, lalu ${priceLabel}${periodLabel}`,
        tr: `Deneme erişimi, ardından ${priceLabel}${periodLabel}`, pl: `Dostęp próbny, potem ${priceLabel}${periodLabel}`,
      })}</Text>
    </View>
    {rows.map((row, index) => <View key={row.icon} style={[S.row, index < rows.length - 1 && S.rowGap]}>
      <View style={S.railColumn}>
        <View style={[S.dot, row.active ? { backgroundColor: tc.heroAccent } : { backgroundColor: chrome.cardBgStrong }]}>
          <Ionicons name={row.icon} size={13} color={row.active ? tc.ctaText : textMuted} />
        </View>
        {index < rows.length - 1 ? <View style={[S.rail, { backgroundColor: cardBorder }]} /> : null}
      </View>
      <View style={S.body}>
        <Text style={[S.title, { color: textPrimary }]}>{row.title}</Text>
        <Text style={[S.detail, { color: textMuted }]}>{row.detail}</Text>
      </View>
    </View>)}
  </View>;
}

const S = StyleSheet.create({
  wrap: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginTop: 16 },
  ribbon: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 13 },
  ribbonText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  rowGap: { paddingBottom: 13 },
  railColumn: { alignItems: 'center', width: 26 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rail: { flex: 1, width: StyleSheet.hairlineWidth, marginTop: 2 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  detail: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});
