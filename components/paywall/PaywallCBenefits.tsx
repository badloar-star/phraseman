import React, { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { LP, pick } from './PaywallPlusCopy';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;
export const PAYWALL_C_BENEFIT_COUNT = 3;
const PAYWALL_C_BENEFITS = [
  { title: LP('Карточки без ограничений', 'Картки без обмежень', 'Cards without limits', 'Tarjetas sin límites', 'Cartões sem limites', 'Thẻ không giới hạn', 'Kartu tanpa batas', 'Sınırsız kartlar', 'Karty bez limitów'), detail: LP('Сохраняй, создавай наборы, тренируйся', 'Зберігай, створюй набори, тренуйся', 'Save, build packs, practice', 'Guarda, crea packs y entrena', 'Salve, crie pacotes e treine', 'Lưu, tạo bộ thẻ và luyện tập', 'Simpan, buat paket, dan berlatih', 'Kaydet, paket oluştur, çalış', 'Zapisuj, twórz zestawy, ćwicz') },
  { title: LP('Все 32 урока курса', 'Усі 32 уроки курсу', 'All 32 course lessons', 'Las 32 lecciones del curso', 'Todas as 32 lições do curso', 'Đủ 32 bài của khóa học', 'Semua 32 pelajaran kursus', 'Kursun 32 dersinin tümü', 'Wszystkie 32 lekcje kursu'), detail: LP('Бесплатно — уроки 1–3', 'Безкоштовно — уроки 1–3', 'Free: lessons 1–3', 'Gratis: lecciones 1–3', 'Grátis: lições 1–3', 'Miễn phí: bài 1–3', 'Gratis: pelajaran 1–3', 'Ücretsiz: 1–3. dersler', 'Za darmo: lekcje 1–3') },
  { title: LP('AI разбирает каждую ошибку', 'AI розбирає кожну помилку', 'AI explains every mistake', 'La IA explica cada error', 'A IA explica cada erro', 'AI phân tích từng lỗi', 'AI menjelaskan setiap kesalahan', 'AI her hatayı açıklar', 'AI wyjaśnia każdy błąd'), detail: LP('Бесплатно — 3 разбора в день', 'Безкоштовно — 3 розбори на день', 'Free: 3 a day', 'Gratis: 3 al día', 'Grátis: 3 por dia', 'Miễn phí: 3 lượt mỗi ngày', 'Gratis: 3 per hari', 'Ücretsiz: günde 3', 'Za darmo: 3 dziennie') },
] as const;

const Row = memo(function Row({ g, title, caption, index }: { g: GlassTokens; title: string; caption: string; index: number }) {
  const reduceMotion = useReduceMotion();
  const enter = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) { enter.setValue(1); return; }
    const animation = Animated.sequence([
      Animated.delay(index * 55),
      Animated.timing(enter, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [enter, index, reduceMotion]);
  return (
    <Animated.View style={[S.row, index > 0 && { borderTopColor: g.line, borderTopWidth: StyleSheet.hairlineWidth }, {
      opacity: enter,
      transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
    }]}>
      <View style={S.check}><Ionicons name="checkmark" size={20} color={g.text} /></View>
      <View style={S.copy}>
        <Text style={[S.title, { color: g.text }]}>{title}</Text>
        {caption ? <Text style={[S.caption, { color: g.text }]}>{caption}</Text> : null}
      </View>
    </Animated.View>
  );
});

export const PaywallCBenefits = memo(function PaywallCBenefits({ lang, g, leadBenefit, leadCaption, factCaption }: {
  lang: Lang; g: GlassTokens; leadBenefit?: string; leadCaption?: string; factCaption?: string;
}) {
  const benefits = PAYWALL_C_BENEFITS.map((benefit, index) => ({
    title: index === 0 && leadBenefit ? leadBenefit : pick(lang, benefit.title),
    caption: index === 0 && leadBenefit ? (factCaption || leadCaption || '') : pick(lang, benefit.detail),
  }));
  return (
    <View testID="paywall-c-benefits">
      {benefits.map((benefit, index) => <Row key={`${index}:${benefit.title}`} g={g} title={benefit.title} caption={benefit.caption} index={index} />)}
    </View>
  );
});

const S = StyleSheet.create({
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  check: { width: 26, alignItems: 'flex-start', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, lineHeight: 25, fontWeight: '700' },
  caption: { fontSize: 13, lineHeight: 19 },
});
