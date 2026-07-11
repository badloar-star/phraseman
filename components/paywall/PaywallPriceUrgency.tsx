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
import React, { useEffect, useState } from 'react';
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
  /** Компактный режим: укороченный блок для верхней части A/B/C без полного сравнения. */
  compact?: boolean;
  /** Выбран план Phraseman Pro (разовый платёж, non-consumable). Меняет текст
      закрепления: у lifetime нечего «отменять», поэтому «пока не отменишь»
      (формулировка для подписок) тут неуместна. */
  isLifetime?: boolean;
}

export default function PaywallPriceUrgency({ lang, chrome, urgency, currentPrice, futurePrice, period, compact, isLifetime }: Props) {
  const { tc, textPrimary, textMuted, cardBorder } = chrome;
  const [timer, setTimer] = useState(urgency.remainingFormatted || formatCountdown(urgency.remainingMs));

  // Живой тик раз в секунду считает время локально; storage проверяем только при истечении окна.
  useEffect(() => {
    if (!urgency.isActive) return;
    let dead = false;
    const endsAt = Date.now() + Math.max(0, urgency.remainingMs);
    const updateFromClock = () => {
      const remainingMs = Math.max(0, endsAt - Date.now());
      setTimer(formatCountdown(remainingMs));
      return remainingMs > 0;
    };

    updateFromClock();
    const iv = setInterval(() => {
      if (updateFromClock()) return;
      clearInterval(iv);
      void getUrgencyState().then((s) => {
        if (!dead) setTimer(s.remainingFormatted);
      });
    }, 1000);
    return () => { dead = true; clearInterval(iv); };
  }, [urgency.isActive, urgency.remainingMs]);

  // Нет реальной цены — ничего не показываем (без «NaN»/выдуманных значений).
  if (!currentPrice || !futurePrice) return null;

  // ── Компактный режим: понятный мини-блок для верхней части paywall ─────────
  if (compact) {
    // grace — спокойная строка про сохранённую цену
    if (!urgency.isActive && urgency.remainingMs > 0) {
      return (
        <View style={[S.compactWrap, { backgroundColor: tc.urgencyBg, borderColor: cardBorder }]}>
          <Ionicons name="lock-closed" size={13} color={tc.urgencyCurrentPriceText} style={{ marginRight: 7 }} />
          <Text style={[S.compactText, { color: textMuted }]} numberOfLines={1}>
            {triLang(lang, {
              ru: 'Старая цена сохранена ещё ~2 недели', uk: 'Стара ціна збережена ще ~2 тижні', es: 'Precio anterior guardado ~2 semanas',
              'pt-BR': 'Preço antigo guardado ~2 semanas', vi: 'Giá cũ giữ thêm ~2 tuần', id: 'Harga lama disimpan ~2 minggu',
              tr: 'Eski fiyat ~2 hafta saklı', pl: 'Stara cena zachowana ~2 tygodnie',
            })}
          </Text>
        </View>
      );
    }
    if (!urgency.isActive) return null;
    return (
      <View style={[S.compactActiveWrap, { backgroundColor: tc.urgencyBg, borderColor: `${tc.urgencyTimerText}3a` }]}>
        <View style={S.compactUrgencyHead}>
          <Ionicons name="time" size={18} color={tc.urgencyTimerText} style={S.compactUrgencyIcon} />
          <Text style={[S.compactUrgencyTitle, { color: tc.urgencyLabelText }]}>
            {triLang(lang, {
              ru: 'Цена скоро будет поднята',
              uk: 'Ціну скоро буде підвищено',
              es: 'El precio subirá pronto',
              'pt-BR': 'O preço vai subir em breve',
              vi: 'Giá sẽ tăng sớm',
              id: 'Harga akan segera naik',
              tr: 'Fiyat yakında artacak',
              pl: 'Cena wkrótce wzrośnie',
            })}
          </Text>
        </View>

        <View style={S.compactTimerRow}>
          <Text style={[S.compactTimerLabel, { color: textMuted }]}>
            {triLang(lang, {
              ru: 'Старая цена действует ещё',
              uk: 'Стара ціна діє ще',
              es: 'El precio anterior dura',
              'pt-BR': 'O preço antigo vale por',
              vi: 'Giá cũ còn hiệu lực',
              id: 'Harga lama berlaku',
              tr: 'Eski fiyat kalan süre',
              pl: 'Stara cena działa jeszcze',
            })}
          </Text>
          <Text style={[S.compactTimerBig, { color: tc.urgencyTimerText }]}>{timer}</Text>
        </View>

        <View style={[S.compactPriceLine, { borderTopColor: `${tc.urgencyTimerText}26` }]}>
          <Text style={[S.compactPriceNow, { color: tc.urgencyCurrentPriceText }]} numberOfLines={1}>
            {triLang(lang, { ru: 'Сейчас', uk: 'Зараз', es: 'Ahora', 'pt-BR': 'Agora', vi: 'Hiện tại', id: 'Sekarang', tr: 'Şimdi', pl: 'Teraz' })}
            {': '}
            {currentPrice}<Text style={[S.compactPricePeriod, { color: textMuted }]}>{period}</Text>
          </Text>
          <Text style={[S.compactPriceFuture, { color: textMuted }]} numberOfLines={1}>
            {triLang(lang, { ru: 'Скоро', uk: 'Скоро', es: 'Pronto', 'pt-BR': 'Em breve', vi: 'Sắp tới', id: 'Segera', tr: 'Yakında', pl: 'Wkrótce' })}
            {': '}
            {futurePrice}<Text style={S.compactPricePeriod}>{period}</Text>
          </Text>
        </View>

        <Text style={[S.compactUrgencyBody, { color: textMuted }]}>
          {isLifetime
            ? triLang(lang, {
                ru: 'Сейчас последняя возможность взять Phraseman Pro по старой цене. Это разовая покупка без подписки.',
                uk: 'Зараз остання можливість взяти Phraseman Pro за старою ціною. Це разова покупка без підписки.',
                es: 'Ahora es la última oportunidad de tomar Phraseman Pro al precio anterior. Es una compra única sin suscripción.',
                'pt-BR': 'Agora é a última chance de pegar o Phraseman Pro pelo preço antigo. É uma compra única sem assinatura.',
                vi: 'Đây là cơ hội cuối để mua Phraseman Pro với giá cũ. Đây là mua một lần, không đăng ký.',
                id: 'Ini kesempatan terakhir mendapatkan Phraseman Pro dengan harga lama. Ini pembelian sekali tanpa langganan.',
                tr: 'Phraseman Pro’yu eski fiyatla almak için son fırsat. Abonelik değil, tek seferlik satın alma.',
                pl: 'To ostatnia szansa na Phraseman Pro w starej cenie. To zakup jednorazowy bez subskrypcji.',
              })
            : triLang(lang, {
                ru: 'Сейчас последняя возможность купить подписку по старой цене. Она будет закреплена за вами, пока вы сами её не отмените.',
                uk: 'Зараз остання можливість купити підписку за старою ціною. Вона буде закріплена за вами, доки ви самі її не скасуєте.',
                es: 'Ahora es la última oportunidad de comprar la suscripción al precio anterior. Quedará fijado para ti hasta que tú la canceles.',
                'pt-BR': 'Agora é a última chance de assinar pelo preço antigo. Ele fica fixo para você até você cancelar.',
                vi: 'Đây là cơ hội cuối để mua gói đăng ký với giá cũ. Giá này sẽ được giữ cho bạn đến khi bạn tự hủy.',
                id: 'Ini kesempatan terakhir membeli langganan dengan harga lama. Harga ini terkunci untukmu sampai kamu sendiri membatalkan.',
                tr: 'Eski fiyatla abonelik almak için son fırsat. Sen iptal edene kadar bu fiyat sana sabitlenir.',
                pl: 'To ostatnia szansa kupić subskrypcję w starej cenie. Cena zostanie przypisana do ciebie, dopóki sam jej nie anulujesz.',
              })}
        </Text>
      </View>
    );
  }

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
        <Ionicons name="time" size={14} color={tc.urgencyTimerText} style={{ marginRight: 7 }} />
        <Text style={[S.headline, { color: tc.urgencyLabelText }]} numberOfLines={2}>
          {triLang(lang, {
            ru: 'Это предложение скоро меняется — успей закрепить', uk: 'Ця пропозиція скоро зміниться — встигни закріпити',
            es: 'Pronto subimos este precio — asegúralo', 'pt-BR': 'Em breve aumentamos este preço — garanta já',
            vi: 'Sắp tăng giá này — kịp giữ ngay', id: 'Harga ini segera naik — kunci sekarang',
            tr: 'Bu fiyatı yakında artıracağız — hemen sabitle', pl: 'Wkrótce podnosimy tę cenę — zdąż ją zablokować',
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

      {/* Доминанта = твоя цена («Сейчас», крупно+акцент). Будущая — заметно мельче
          и приглушённая (P0-3): сразу читается, какая цена выгодная и твоя. */}
      <View style={[S.priceRow, { borderTopColor: cardBorder }]}>
        <View style={S.priceColNow}>
          <Text style={[S.priceCapNow, { color: tc.urgencyCurrentPriceText }]}>
            {triLang(lang, { ru: 'СЕЙЧАС', uk: 'ЗАРАЗ', es: 'AHORA', 'pt-BR': 'AGORA', vi: 'BÂY GIỜ', id: 'SEKARANG', tr: 'ŞİMDİ', pl: 'TERAZ' })}
          </Text>
          <Text style={[S.priceNow, { color: tc.urgencyCurrentPriceText }]} numberOfLines={1}>
            {currentPrice}<Text style={[S.pricePer, { color: textMuted }]}>{period}</Text>
          </Text>
        </View>
        <View style={S.priceColFuture}>
          <Text style={[S.priceCapFuture, { color: textMuted }]}>
            {triLang(lang, { ru: 'скоро', uk: 'скоро', es: 'pronto', 'pt-BR': 'em breve', vi: 'sắp tới', id: 'segera', tr: 'yakında', pl: 'wkrótce' })}
          </Text>
          <Text style={[S.priceFuture, { color: textMuted }]} numberOfLines={1}>
            {futurePrice}<Text style={S.pricePer}>{period}</Text>
          </Text>
        </View>
      </View>

      <Text style={[S.lockNote, { color: textMuted }]}>
        <Text style={{ color: textPrimary, fontWeight: '700' }}>
          {triLang(lang, { ru: 'Купишь сейчас', uk: 'Купиш зараз', es: 'Si compras ahora', 'pt-BR': 'Se comprar agora', vi: 'Mua ngay', id: 'Beli sekarang', tr: 'Şimdi alırsan', pl: 'Kupisz teraz' })}
        </Text>
        {/* lifetime — разовая покупка: «отменять» нечего, поэтому без «пока не отменишь». */}
        {isLifetime
          ? triLang(lang, {
              ru: ' — это Phraseman Pro: разовая покупка без подписки.', uk: ' — це Phraseman Pro: разова покупка без підписки.',
              es: ' — es Phraseman Pro: compra única sin suscripción.', 'pt-BR': ' — é o Phraseman Pro: compra única sem assinatura.',
              vi: ' — đây là Phraseman Pro: mua một lần, không đăng ký.', id: ' — ini Phraseman Pro: pembelian sekali tanpa langganan.',
              tr: ' — bu Phraseman Pro: aboneliksiz tek seferlik satın alma.', pl: ' — to Phraseman Pro: zakup jednorazowy bez subskrypcji.',
            })
          : triLang(lang, {
              ru: ' — цена закрепится за тобой, пока сам не отменишь.', uk: ' — ціна закріпиться за тобою, поки сам не скасуєш.',
              es: ' — el precio queda fijo para ti hasta que tú lo canceles.', 'pt-BR': ' — o preço fica travado pra você até você cancelar.',
              vi: ' — giá được giữ cho bạn đến khi bạn tự hủy.', id: ' — harga terkunci untukmu sampai kamu sendiri membatalkan.',
              tr: ' — fiyat, sen iptal edene kadar sana sabitlenir.', pl: ' — cena zostaje przypisana tobie, dopóki sam jej nie anulujesz.',
            })}
      </Text>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { borderRadius: 16, borderWidth: 0, paddingHorizontal: 16, paddingVertical: 13, marginTop: 16, flexDirection: 'row', alignItems: 'center' },
  wrapActive: { flexDirection: 'column', alignItems: 'stretch' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 9 },
  headline: { flex: 1, fontSize: 14, fontWeight: '900', lineHeight: 19 },
  // компактный режим — мини-блок
  compactWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 0, paddingHorizontal: 14, paddingVertical: 11, marginTop: 16 },
  compactActiveWrap: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 15, marginTop: 16 },
  compactUrgencyHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  compactUrgencyIcon: { marginRight: 8, flexShrink: 0 },
  compactUrgencyTitle: { flex: 1, fontSize: 16, lineHeight: 20, fontWeight: '900', letterSpacing: 0 },
  compactTimerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  compactTimerLabel: { flex: 1, fontSize: 13.5, lineHeight: 18.5, fontWeight: '700' },
  compactTimerBig: { fontSize: 24, lineHeight: 29, fontWeight: '900', letterSpacing: 0, fontVariant: ['tabular-nums'] },
  compactPriceLine: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, marginTop: 12, paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth,
  },
  compactPriceNow: { flex: 1, minWidth: 0, fontSize: 14.5, lineHeight: 19, fontWeight: '900' },
  compactPriceFuture: { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  compactPricePeriod: { fontSize: 11.5, fontWeight: '700' },
  compactUrgencyBody: { fontSize: 13.5, lineHeight: 19, marginTop: 11 },
  compactText: { flex: 1, fontSize: 13 },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  timerLabel: { fontSize: 13, flex: 1 },
  // P0-1: таймер мельче CTA (17.5/900) — кнопка остаётся главной.
  timer: { fontSize: 16.5, fontWeight: '900', letterSpacing: 0, fontVariant: ['tabular-nums'] },
  // P0-3: «Сейчас» доминирует, «Скоро» приглушено и мельче.
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 13, marginTop: 11, paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth },
  priceColNow: { alignItems: 'flex-start', minWidth: 0, flexShrink: 1 },
  priceColFuture: { alignItems: 'flex-start', minWidth: 0, flexShrink: 1, opacity: 0.85, paddingBottom: 1 },
  priceCapNow: { fontSize: 11.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 3 },
  priceCapFuture: { fontSize: 11, fontWeight: '700', letterSpacing: 0, marginBottom: 3 },
  priceNow: { fontSize: 19, fontWeight: '900', letterSpacing: 0 },
  priceFuture: { fontSize: 14, fontWeight: '700' },
  pricePer: { fontSize: 12, fontWeight: '600' },
  lockNote: { fontSize: 13, lineHeight: 18, marginTop: 11 },
  graceText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
