// ════════════════════════════════════════════════════════════════════════════
// PaywallPriceUrgency.tsx — честный «анонс повышения цены» для A/B/C.
//
// ВАЖНО (легальность): ×2 подаётся как БУДУЩАЯ цена («Скоро будет»), НЕ как
// «старая/было». Анонс повышения цены законен (это утверждение о будущем,
// которое мы контролируем), в отличие от фантомной зачёркнутой «старой» цены
// (Apple 2.3.1 / Google / EU Omnibus / FTC). futurePrice — ТОЛЬКО отображение,
// в Purchases никогда не уходит (хук покупки шлёт RAW-пакет).
//
// Два состояния (по UrgencyState из app/paywall_urgency.ts):
//  • isActive (77ч идут): таймер + «Сейчас X» / «Скоро будет ~2X» + закрепление.
//  • grace (77ч прошли, remainingMs>0): «цену сохранили, ещё ~2 недели».
// Нет реальной цены или futurePrice=null → блок не рендерится.
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { triLang, type Lang } from '../../constants/i18n';
import { getUrgencyState, formatCountdown, type UrgencyState } from '../../app/paywall_urgency';
import type { PaywallChrome } from './paywallShared';

interface Props {
  lang: Lang;
  chrome: PaywallChrome;
  /** Начальное состояние urgency (экран грузит его сам и передаёт сюда). */
  urgency: UrgencyState;
  /** Текущая цена выбранного плана (строка стора). */
  currentPrice: string;
  /** Будущая цена = getDoubledPrice(currentPrice); null → блок скрыт. */
  futurePrice: string | null;
  /** «/год» | «/мес». */
  period: string;
}

export default function PaywallPriceUrgency({ lang, chrome, urgency, currentPrice, futurePrice, period }: Props) {
  const { tc, textPrimary, textMuted, cardBorder } = chrome;
  const [timer, setTimer] = useState(urgency.remainingFormatted || formatCountdown(urgency.remainingMs));

  // Живой тик раз в секунду только пока окно активно.
  const activeRef = useRef(urgency.isActive);
  activeRef.current = urgency.isActive;
  useEffect(() => {
    if (!urgency.isActive) return;
    let dead = false;
    const iv = setInterval(async () => {
      const s = await getUrgencyState();
      if (dead) return;
      setTimer(s.remainingFormatted);
      if (!s.isActive) clearInterval(iv);
    }, 1000);
    return () => { dead = true; clearInterval(iv); };
  }, [urgency.isActive]);

  // Нет реальной цены — ничего не показываем (без «NaN»/выдуманных значений).
  if (!currentPrice || !futurePrice) return null;

  // ── Grace: окно прошло, но цену пока придержали ────────────────────────────
  if (!urgency.isActive && urgency.remainingMs > 0) {
    return (
      <View style={[S.wrap, { backgroundColor: tc.urgencyBg, borderColor: cardBorder }]}>
        <Ionicons name="lock-closed" size={15} color={tc.urgencyCurrentPriceText} style={{ marginRight: 8 }} />
        <Text style={[S.graceText, { color: textMuted }]}>
          {triLang(lang, {
            ru: 'Мы пока сохранили для тебя старую цену — ', uk: 'Ми поки зберегли для тебе стару ціну — ', es: 'Por ahora te guardamos el precio anterior — ',
            'pt-BR': 'Por enquanto guardamos seu preço antigo — ', vi: 'Chúng tôi tạm giữ giá cũ cho bạn — ',
            id: 'Kami simpan dulu harga lamamu — ', tr: 'Eski fiyatını şimdilik senin için tuttuk — ', pl: 'Na razie zachowaliśmy dla ciebie starą cenę — ',
          })}
          <Text style={{ color: textPrimary, fontWeight: '800' }}>
            {triLang(lang, {
              ru: 'успеть можно ещё ~2 недели.', uk: 'встигнути можна ще ~2 тижні.', es: 'aún tienes ~2 semanas.',
              'pt-BR': 'ainda dá em ~2 semanas.', vi: 'còn ~2 tuần nữa.', id: 'masih ada ~2 minggu.', tr: '~2 hafta daha geçerli.', pl: 'masz jeszcze ~2 tygodnie.',
            })}
          </Text>
        </Text>
      </View>
    );
  }

  // ── Активно: таймер 77ч + «Сейчас X» / «Скоро будет ~2X» + закрепление ─────
  if (!urgency.isActive) return null;

  return (
    <View style={[S.wrap, S.wrapActive, { backgroundColor: tc.urgencyBg, borderColor: `${tc.urgencyTimerText}3a` }]}>
      <View style={S.headerRow}>
        <Text style={[S.headline, { color: tc.urgencyLabelText }]} numberOfLines={2}>
          {triLang(lang, {
            ru: '⏰ Эту цену скоро поднимаем — успей закрепить', uk: '⏰ Цю ціну скоро піднімемо — встигни закріпити',
            es: '⏰ Pronto subimos este precio — asegúralo', 'pt-BR': '⏰ Em breve aumentamos este preço — garanta já',
            vi: '⏰ Sắp tăng giá này — kịp giữ ngay', id: '⏰ Harga ini segera naik — kunci sekarang',
            tr: '⏰ Bu fiyatı yakında artıracağız — hemen sabitle', pl: '⏰ Wkrótce podnosimy tę cenę — zdąż ją zablokować',
          })}
        </Text>
      </View>

      <View style={S.timerRow}>
        <Text style={[S.timerLabel, { color: textMuted }]}>
          {triLang(lang, {
            ru: 'Старая цена держится ещё', uk: 'Стара ціна тримається ще', es: 'El precio anterior dura aún',
            'pt-BR': 'O preço antigo dura ainda', vi: 'Giá cũ còn giữ trong', id: 'Harga lama bertahan', tr: 'Eski fiyat hâlâ geçerli', pl: 'Stara cena trzyma się jeszcze',
          })}
        </Text>
        <Text style={[S.timer, { color: tc.urgencyTimerText }]}>{timer}</Text>
      </View>

      <View style={[S.priceRow, { borderTopColor: cardBorder }]}>
        <View style={S.priceCol}>
          <Text style={[S.priceCap, { color: textMuted }]}>
            {triLang(lang, { ru: 'Сейчас', uk: 'Зараз', es: 'Ahora', 'pt-BR': 'Agora', vi: 'Bây giờ', id: 'Sekarang', tr: 'Şimdi', pl: 'Teraz' })}
          </Text>
          <Text style={[S.priceNow, { color: tc.urgencyCurrentPriceText }]} numberOfLines={1} adjustsFontSizeToFit>
            {currentPrice}<Text style={[S.pricePer, { color: textMuted }]}>{period}</Text>
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={15} color={textMuted} style={{ marginHorizontal: 8 }} />
        <View style={S.priceCol}>
          <Text style={[S.priceCap, { color: textMuted }]}>
            {triLang(lang, { ru: 'Скоро будет', uk: 'Скоро буде', es: 'Pronto será', 'pt-BR': 'Em breve será', vi: 'Sắp thành', id: 'Segera jadi', tr: 'Yakında olacak', pl: 'Wkrótce będzie' })}
          </Text>
          <Text style={[S.priceFuture, { color: tc.urgencyStrikethroughColor }]} numberOfLines={1} adjustsFontSizeToFit>
            {futurePrice}<Text style={S.pricePer}>{period}</Text>
          </Text>
        </View>
      </View>

      <Text style={[S.lockNote, { color: textMuted }]}>
        <Text style={{ color: textPrimary, fontWeight: '700' }}>
          {triLang(lang, { ru: 'Купишь сейчас', uk: 'Купиш зараз', es: 'Si compras ahora', 'pt-BR': 'Se comprar agora', vi: 'Mua ngay', id: 'Beli sekarang', tr: 'Şimdi alırsan', pl: 'Kupisz teraz' })}
        </Text>
        {triLang(lang, {
          ru: ' — цена закрепится за тобой навсегда, пока сам не отменишь.', uk: ' — ціна закріпиться за тобою назавжди, поки сам не скасуєш.',
          es: ' — el precio queda fijo para ti hasta que tú lo canceles.', 'pt-BR': ' — o preço fica travado pra você até você cancelar.',
          vi: ' — giá được giữ cho bạn mãi đến khi bạn tự hủy.', id: ' — harga terkunci untukmu sampai kamu sendiri membatalkan.',
          tr: ' — fiyat, sen iptal edene kadar sana sabitlenir.', pl: ' — cena zostaje przypisana tobie, dopóki sam jej nie anulujesz.',
        })}
      </Text>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  wrapActive: { flexDirection: 'column', alignItems: 'stretch' },
  headerRow: { marginBottom: 8 },
  headline: { fontSize: 12.5, fontWeight: '800', lineHeight: 17 },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  timerLabel: { fontSize: 11.5, flex: 1 },
  timer: { fontSize: 18, fontWeight: '900', letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  priceCol: { alignItems: 'center', minWidth: 0, flexShrink: 1 },
  priceCap: { fontSize: 9.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  priceNow: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  priceFuture: { fontSize: 15, fontWeight: '700', textDecorationLine: 'line-through' },
  pricePer: { fontSize: 10, fontWeight: '500' },
  lockNote: { fontSize: 11, lineHeight: 15.5, marginTop: 10 },
  graceText: { flex: 1, fontSize: 11.5, lineHeight: 16 },
});
