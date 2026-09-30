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
// Плашка fail closed: появляется только для одного промо-цикла с тем же billing period,
// после которого сразу идёт обычная цена. Промежуточные цены, другой period,
// несколько циклов или неполные timing-данные скрывают промо, пока UI не умеет
// честно расписать всю цепочку списаний.
//
// Инварианты Perf Bible соблюдены через PaywallMotion: только transform/opacity
// на UI-треде, лупы гейтятся фокусом экрана, reduce-motion отдаёт статичный кадр.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from '../SafeLinearGradient';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';

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

type PromoGlassTokens = ReturnType<typeof liquidGlassTokens>;

export default function PaywallPromoBanner({ lang, chrome, promo, delay = 0, glass }: {
  lang: Lang;
  chrome: PaywallChrome;
  /** зачем: пейвол A/D на Liquid Glass (макет PW-PROMO) — баннер рисуется стеклом из токенов темы;
   *  без glass (онбординг-пейвол) прежний тональный вид не меняется. */
  glass?: PromoGlassTokens;
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
      style={glass ? [S.wrap, S.glassWrap, {
        backgroundColor: glass.card,
        borderColor: glass.glassEdge,
      }] : [S.wrap, {
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
      {glass ? <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Platform.OS === 'ios' ? <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={[`${glass.lightTint.slice(0, 7)}24`, `${glass.lightTint.slice(0, 7)}08`, 'transparent']}
          style={S.glassSheen} />
      </View> : null}
      <View
        testID="paywall-promo-banner"
        accessible
        accessibilityRole="text"
        // Для незрячих — одной фразой всё, что видно глазами, включая «далее».
        accessibilityLabel={`${title}. ${promo.promoPriceString} ${afterLine}`}
        style={S.row}
      >
        <View style={[S.badge, { backgroundColor: glass ? glass.cta : tc.savingsBadgeBg }]}>
          <Text style={[S.badgeText, { color: glass ? glass.ctaInk : tc.savingsBadgeText }]} maxFontSizeMultiplier={1.6}>
            {promoBadgeLabel(lang, promo.discountPercent)}
          </Text>
        </View>

        <View style={S.texts}>
          <View style={S.priceRow}>
            {/* зачем: обе цены видны ЦЕЛИКОМ (владелец 2026-09-17: «текст не
                должен уходить в три точки»). Длинные валюты и крупный системный
                шрифт раньше упирались в многоточие; priceRow переносит строку. */}
            <Text
              testID="paywall-promo-price"
              style={[S.promoPrice, { color: glass ? glass.text : tc.urgencyCurrentPriceText }]}
              maxFontSizeMultiplier={1.5}
            >
              {promo.promoPriceString}
            </Text>
            <Text
              testID="paywall-promo-standard"
              style={[S.standardPrice, { color: glass ? glass.secondary : tc.urgencyStrikethroughColor }]}
              maxFontSizeMultiplier={1.5}
            >
              {promo.standardPriceString}
            </Text>
          </View>
          {/* Не подпись-расшифровка под названием, а обязательное условие
              сделки: сколько и когда спишется дальше. */}
          {/* зачем: условие сделки («дальше спишется столько-то») обязано быть
              видно целиком — это не украшение, а то, за что человек платит. */}
          <Text
            testID="paywall-promo-after"
            style={[S.afterPrice, { color: glass ? glass.secondary : tc.urgencyLabelText }]}
            maxFontSizeMultiplier={1.5}
          >
            {afterLine}
          </Text>
        </View>

        <Ionicons name="sparkles" size={17} color={glass ? glass.secondary : tc.heroAccent} />
      </View>
    </PaywallBadgePop>
  );
}

const S = StyleSheet.create({
  // Тоном и скруглением, без обводки (правило владельца: контейнеры не
  // обводим — разделяем фоном).
  wrap: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12 },
  // зачем: при переносе цен блок растёт вниз — бейдж и иконка должны держаться
  // верхней строки, а не «уезжать» в середину выросшего блока.
  // зачем: стеклянный вид — 1px полупрозрачная кромка (разрешена для 2.0), без цветного свечения.
  glassWrap: { borderWidth: 1, borderRadius: 22, overflow: 'hidden', shadowOpacity: 0, elevation: 0 },
  glassSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 74 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badge: { flexShrink: 0, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },
  texts: { flex: 1, minWidth: 0 },
  // зачем: flexWrap — зачёркнутая цена уходит на вторую строку вместо
  // обрезания, когда обе цены не помещаются в ширину баннера.
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' },
  // Цена со скидкой — самое крупное число блока: именно её человек ищет глазами.
  promoPrice: { fontSize: 21, fontWeight: '900', letterSpacing: 0.2 },
  standardPrice: { fontSize: 13, fontWeight: '700', textDecorationLine: 'line-through' },
  afterPrice: { fontSize: 12, fontWeight: '700', marginTop: 1 },
});
