// ════════════════════════════════════════════════════════════════════════════
// PaywallPromoBanner.tsx — плашка скидки стора на пейволах A–G.
//
// зачем (владелец 2026-09-04): «если включены скидочные цены в сторах — чтобы
// открытие пейвола было премиальным и праздничным, с анимацией и новым звуком,
// и на ВСЕХ пейволах появлялась новая цена и заметная плашка про скидку».
//
// И вторая половина того же требования — честность: «чтобы не было ошибок,
// когда на пейволе написано OFF, а списывается полная цена через N дней».
// Поэтому плашка показывает ТРИ вещи сразу, а не одну:
//   • цену со скидкой  — сколько спишется сейчас;
//   • обычную цену     — зачёркнутой, чтобы выгода была видна;
//   • что будет потом  — «далее <обычная цена>», прямым текстом.
// Скрыть третью строку нельзя: именно её отсутствие и порождает возвраты,
// жалобы и претензии ревью Apple/Google.
//
// Источник истины — ТОЛЬКО стор (getStorePromoPricing над данными RevenueCat).
// Никаких флагов в админке: включили скидку в App Store Connect / Play Console —
// плашка появилась, выключили — исчезла. Рассинхрону «написано ≠ списано»
// взяться неоткуда, потому что второго источника цены не существует.
//
// Инварианты Perf Bible соблюдены через PaywallMotion: только transform/opacity
// на UI-треде, лупы гейтятся фокусом экрана, reduce-motion отдаёт статичный кадр.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { triLang, type Lang } from '../../constants/i18n';
import { PaywallBadgePop } from './PaywallMotion';
import type { PaywallChrome } from './paywallShared';
import type { StorePromoPricing } from '../../app/premium_store_promo_display';

export function promoBadgeLabel(lang: Lang, percent: number): string {
  return triLang(lang, {
    ru: `−${percent}%`, uk: `−${percent}%`, en: `−${percent}%`, es: `−${percent}%`,
    'pt-BR': `−${percent}%`, vi: `−${percent}%`, id: `−${percent}%`,
    tr: `−${percent}%`, pl: `−${percent}%`,
  });
}

export default function PaywallPromoBanner({ lang, chrome, promo, delay = 0 }: {
  lang: Lang;
  chrome: PaywallChrome;
  /** Промо выбранного плана из стора; null — плашки нет вовсе. */
  promo: StorePromoPricing | null;
  /** Задержка появления, мс — подстраивается под каскад входа пейвола. */
  delay?: number;
}) {
  if (!promo) return null;
  const { tc } = chrome;

  const title = triLang(lang, {
    ru: 'Скидка действует сейчас',
    uk: 'Знижка діє зараз',
    en: 'Discount is live now',
    es: 'Descuento activo ahora',
    'pt-BR': 'Desconto ativo agora',
    vi: 'Ưu đãi đang áp dụng',
    id: 'Diskon berlaku sekarang',
    tr: 'İndirim şu anda geçerli',
    pl: 'Zniżka obowiązuje teraz',
  });

  // Третья строка — обязательная. Человек обязан видеть, что будет ПОСЛЕ
  // промо-периода, ещё до нажатия кнопки.
  const afterLine = triLang(lang, {
    ru: `далее ${promo.standardPriceString}`,
    uk: `далі ${promo.standardPriceString}`,
    en: `then ${promo.standardPriceString}`,
    es: `luego ${promo.standardPriceString}`,
    'pt-BR': `depois ${promo.standardPriceString}`,
    vi: `sau đó ${promo.standardPriceString}`,
    id: `lalu ${promo.standardPriceString}`,
    tr: `sonra ${promo.standardPriceString}`,
    pl: `potem ${promo.standardPriceString}`,
  });

  return (
    <PaywallBadgePop
      pulse
      delay={delay}
      style={[S.wrap, {
        backgroundColor: `${tc.heroAccent}1F`,
        // Свечение вместо обводки: блок обязан вести взглядом, а не спорить с
        // карточками планов. На макете при `14` он читался тише соседей.
        shadowColor: tc.heroAccent,
        shadowOpacity: 0.22,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }]}
    >
      <View
        testID="paywall-promo-banner"
        accessible
        accessibilityRole="text"
        // Для незрячих — одной фразой всё, что видно глазами, включая «далее».
        accessibilityLabel={`${title}. ${promo.promoPriceString} ${afterLine}`}
        style={S.row}
      >
        <View style={[S.badge, { backgroundColor: tc.savingsBadgeBg }]}>
          <Text style={[S.badgeText, { color: tc.savingsBadgeText }]} maxFontSizeMultiplier={1.6}>
            {promoBadgeLabel(lang, promo.discountPercent)}
          </Text>
        </View>

        <View style={S.texts}>
          <View style={S.priceRow}>
            <Text
              testID="paywall-promo-price"
              style={[S.promoPrice, { color: tc.urgencyCurrentPriceText }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.5}
            >
              {promo.promoPriceString}
            </Text>
            <Text
              testID="paywall-promo-standard"
              style={[S.standardPrice, { color: tc.urgencyStrikethroughColor }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.5}
            >
              {promo.standardPriceString}
            </Text>
          </View>
          {/* Не подпись-расшифровка под названием, а обязательное условие
              сделки: сколько и когда спишется дальше. */}
          <Text
            testID="paywall-promo-after"
            style={[S.afterPrice, { color: tc.urgencyLabelText }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.5}
          >
            {afterLine}
          </Text>
        </View>

        <Ionicons name="sparkles" size={17} color={tc.heroAccent} />
      </View>
    </PaywallBadgePop>
  );
}

const S = StyleSheet.create({
  // Тоном и скруглением, без обводки (правило владельца: контейнеры не
  // обводим — разделяем фоном).
  wrap: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },
  texts: { flex: 1, minWidth: 0 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  // Цена со скидкой — самое крупное число блока: именно её человек ищет глазами.
  promoPrice: { fontSize: 21, fontWeight: '900', letterSpacing: 0.2 },
  standardPrice: { fontSize: 13, fontWeight: '700', textDecorationLine: 'line-through' },
  afterPrice: { fontSize: 12, fontWeight: '700', marginTop: 1 },
});
