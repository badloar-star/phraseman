// ═══════════════════════════════════════════════════════════════════════════
// SpireNoEnergySheet.tsx — момент m22 «Энергия закончилась → Plus» (эталон engagement-moments-v3-all.html m22 · вариант A, шаблон plusSheet).
//
// зачем (координатор 15.10, m22 к сборке 16.10): док Пика без энергии раньше сразу уводил в пейвол отдельным окном. По эталону — шторка над
// доком: плитка ⚡ + чип «Энергия», «Энергия закончилась», «Следующая — через m:ss. С Plus — без ожидания.» (живой отсчёт), выгода
// «Энергия не кончается», «Попробовать Plus» с мелкой строкой цены, «Подожду 10 минут». Покупка ИЗ шторки — после выпуска, по слову
// владельца: «Попробовать Plus» открывает прежний полный пейвол (колбэк onPlus у дока, атрибуция no_energy / spire_no_energy).
// Мелкая строка (координатор 15.10): пробный доступен (живой признак магазина) → fineTrial; нет → finePrice; нет цены в кэше → строки нет.
// Ничего не пишет и не покупает: «Plus» и «закрыть» — колбэки.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../../constants/i18n';
import { hapticTap } from '../../../hooks/use-haptics';
import { playEvent } from '../../../modules/sound_v2/sound_bank';
import { hydratePaywallPriceCache, peekPaywallPriceCache, type PaywallPriceCache } from '../../../app/paywall_price_cache';
import { useEnergyCountdown } from '../../EnergyContext';
import { usePremium } from '../../PremiumContext';
import { useFireOnce } from '../../moments/use_fire_once';
import V2Pressable from '../../v2/V2Pressable';
import { KitSheetModal } from '../../v2/KitSheetModal';
import { V2Button } from '../../v2/V2Kit';
import { spireGameText } from '../spire_game_strings';
import { useSpirePalette } from '../useSpirePalette';
import { useSpireShadow } from '../useSpireShadow';
import { noEnergySheetText } from './no_energy_sheet_strings';

export type SpireNoEnergySheetProps = Readonly<{
  lang: Lang;
  visible: boolean;
  /** «Попробовать Plus» — родитель закрывает шторку и открывает пейвол. */
  onPlus: () => void;
  /** «Подожду 10 минут», свайп вниз, тап по фону, «Назад». */
  onClose: () => void;
  testID?: string;
}>;

type PriceLine = Readonly<{ text: string | null; source: 'cache' | 'none'; plan: 'monthly' | 'yearly_per_month' | 'none' }>;

/** Строка цены «≈ X/мес»: месячный план, иначе годовой в пересчёте на месяц; только из кэша магазина. */
export function noEnergyPriceLine(lang: Lang, cache: PaywallPriceCache | null, trialEligible: boolean): PriceLine {
  const monthly = cache?.monthly?.price;
  const perMonth = cache?.yearly?.perMonth;
  const price = monthly || perMonth || '';
  if (!price) return { text: null, source: 'none', plan: 'none' };
  return {
    text: noEnergySheetText(lang, trialEligible ? 'fineTrial' : 'finePrice', { price }),
    source: 'cache',
    plan: monthly ? 'monthly' : 'yearly_per_month',
  };
}

function SpireNoEnergySheet({ lang, visible, onPlus, onClose, testID = 'no-energy-sheet' }: SpireNoEnergySheetProps) {
  const p = useSpirePalette();
  const sh = useSpireShadow();
  const { trialEligible } = usePremium();
  const { formattedTime } = useEnergyCountdown({ visible });
  const [cache, setCache] = useState<PaywallPriceCache | null>(() => peekPaywallPriceCache());
  const fire = useFireOnce('M22-SHEET', visible);

  // зачем (CLAUDE.md «мгновенно»): цена — синхронный peek; диск читается фоном один раз, если в памяти ещё пусто. Сети нет.
  useEffect(() => {
    if (!visible || cache) return undefined;
    let alive = true;
    void hydratePaywallPriceCache().then((next) => {
      console.log(`[M22-PRICE] hydrate: ${next ? 'есть' : 'нет'}`); // guard-ok: единичный лог чтения кэша
      if (alive && next) setCache(next);
    });
    return () => { alive = false; };
  }, [visible, cache]);

  const priceLine = noEnergyPriceLine(lang, cache, trialEligible);

  useEffect(() => {
    if (!visible) return;
    console.log(`[M22-PRICE] source=${priceLine.source} plan=${priceLine.plan} trial=live:${String(trialEligible)} line=${priceLine.text ? 'shown' : 'hidden'}`); // guard-ok: единичный лог показа
    playEvent('sheet_open');
    void hapticTap();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: показ один раз на открытие
  }, [visible]);

  const clock = formattedTime || '—';

  return (
    <KitSheetModal
      visible={visible}
      onRequestClose={onClose}
      closeLabel={spireGameText(lang, 'close')}
      testID={testID}
      header={(
        <View style={s.head}>
          <View style={[s.tile, { backgroundColor: p.control }, sh.nested]}>
            <Ionicons name="flash" size={24} color={p.text} />
          </View>
          <View style={[s.chip, { backgroundColor: p.control }]}>
            <Text style={[s.chipText, { color: p.textSecondary }]}>{noEnergySheetText(lang, 'ctx')}</Text>
          </View>
        </View>
      )}
    >
      <View>
        <Text style={[s.title, { color: p.text }]} accessibilityRole="header">{noEnergySheetText(lang, 'title')}</Text>
        <Text style={[s.sub, { color: p.textSecondary }]} testID={`${testID}-sub`}>{noEnergySheetText(lang, 'sub', { t: clock })}</Text>
        <View style={[s.benefit, { backgroundColor: p.card }, sh.plate]}>
          <Ionicons name="checkmark" size={18} color={p.accentTextSafe} />
          <Text style={[s.benefitText, { color: p.text }]}>{noEnergySheetText(lang, 'benefit')}</Text>
        </View>
        <V2Pressable
          onPress={() => fire(onPlus, 'plus')}
          accessibilityRole="button"
          accessibilityLabel={priceLine.text ? `${noEnergySheetText(lang, 'cta')}. ${priceLine.text}` : noEnergySheetText(lang, 'cta')}
          scaleTo={0.97}
          style={[s.cta, { backgroundColor: p.cta }, sh.action(p.cta)]}
          testID={`${testID}-plus`}
        >
          <Text style={[s.ctaText, { color: p.ctaText }]}>{noEnergySheetText(lang, 'cta')}</Text>
          {priceLine.text ? <Text style={[s.ctaSub, { color: p.ctaText }]} testID={`${testID}-price`}>{priceLine.text}</Text> : null}
        </V2Pressable>
        <View style={s.wait}>
          <V2Button label={noEnergySheetText(lang, 'wait')} variant="secondary" onPress={() => fire(onClose, 'wait')} testID={`${testID}-wait`} />
        </View>
      </View>
    </KitSheetModal>
  );
}

const s = StyleSheet.create({
  // эталон plusSheet: плитка 52×52 r16 + чип в строку, зазор 12
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chip: { height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
  chipText: { fontSize: 13, lineHeight: 16, fontWeight: '700' },
  title: { marginTop: 16, fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.2 },
  sub: { marginTop: 8, fontSize: 16, lineHeight: 22 },
  benefit: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { fontSize: 16, lineHeight: 22, fontWeight: '600', flexShrink: 1 },
  cta: { marginTop: 16, minHeight: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 20 },
  ctaText: { fontSize: 17, lineHeight: 20, fontWeight: '700', textAlign: 'center' }, // d145-micro: m22-A эталон v3, одобрен владельцем 14.10
  // зачем: строка цены внутри кнопки — ровно эталон `.em-ph .cta .sub` (12/600, 70 %), исключение 2.0 «короткая подпись по референсу»
  ctaSub: { marginTop: 1, fontSize: 12, lineHeight: 14, fontWeight: '600', opacity: 0.7, textAlign: 'center' }, // guard-ok: эталон m22 .cta .sub; d145-micro: m22-A эталон v3, одобрен владельцем 14.10
  wait: { marginTop: 12 },
});

export default memo(SpireNoEnergySheet);
