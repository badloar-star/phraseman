import React, { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { COPY, LP, pick } from './PaywallPlusCopy';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;
export const PAYWALL_C_BENEFIT_COUNT = 3;
const PAYWALL_C_BENEFITS = [
  { title: LP('Карточки без ограничений', 'Картки без обмежень', 'Cards without limits', 'Tarjetas sin límites', 'Cartões sem limites', 'Thẻ không giới hạn', 'Kartu tanpa batas', 'Sınırsız kartlar', 'Karty bez limitów'), detail: LP('Сохраняй, создавай наборы, тренируйся', 'Зберігай, створюй набори, тренуйся', 'Save, build packs, practice', 'Guarda, crea packs y entrena', 'Salve, crie pacotes e treine', 'Lưu, tạo bộ thẻ và luyện tập', 'Simpan, buat paket, dan berlatih', 'Kaydet, paket oluştur, çalış', 'Zapisuj, twórz zestawy, ćwicz') },
  { title: LP('Все 32 урока курса', 'Усі 32 уроки курсу', 'All 32 course lessons', 'Las 32 lecciones del curso', 'Todas as 32 lições do curso', 'Đủ 32 bài của khóa học', 'Semua 32 pelajaran kursus', 'Kursun 32 dersinin tümü', 'Wszystkie 32 lekcje kursu'), detail: LP('Бесплатно — уроки 1–3', 'Безкоштовно — уроки 1–3', 'Free: lessons 1–3', 'Gratis: lecciones 1–3', 'Grátis: lições 1–3', 'Miễn phí: bài 1–3', 'Gratis: pelajaran 1–3', 'Ücretsiz: 1–3. dersler', 'Za darmo: lekcje 1–3') },
  { title: LP('ИИ разбирает каждую ошибку', 'ШІ розбирає кожну помилку', 'AI explains every mistake', 'La IA explica cada error', 'A IA explica cada erro', 'AI phân tích từng lỗi', 'AI menjelaskan setiap kesalahan', 'AI her hatayı açıklar', 'AI wyjaśnia każdy błąd'), detail: LP('Бесплатно — 3 разбора в день', 'Безкоштовно — 3 розбори на день', 'Free: 3 a day', 'Gratis: 3 al día', 'Grátis: 3 por dia', 'Miễn phí: 3 lượt mỗi ngày', 'Gratis: 3 per hari', 'Ücretsiz: günde 3', 'Za darmo: 3 dziennie') },
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
      <View style={S.check}><Ionicons name="checkmark" size={20} color={g.accentGraphic} /></View>
      <View style={S.copy}>
        <Text style={[S.title, { color: g.text }]}>{title}</Text>
        {caption ? <Text style={[S.caption, { color: g.text }]}>{caption}</Text> : null}
      </View>
    </Animated.View>
  );
});

export const PaywallCBenefits = memo(function PaywallCBenefits({ lang, g, leadBenefit, leadCaption, factCaption, items, paragraph }: {
  lang: Lang; g: GlassTokens; leadBenefit?: string; leadCaption?: string; factCaption?: string;
  /** Макет «Все окна Plus» (слово владельца 05.11, 1 в 1): готовые три пункта — первая строка больше не повторяет подзаголовок. */
  items?: ReadonlyArray<Readonly<{ title: string; detail: string }>>;
  /** Абзац под списком («В первом выбранном языке уроки 1–3 бесплатны…»). */
  paragraph?: string;
}) {
  const benefits = items && items.length > 0
    ? items.map((item) => ({ title: item.title, caption: item.detail }))
    : PAYWALL_C_BENEFITS.map((benefit, index) => ({
      title: index === 0 && leadBenefit ? leadBenefit : pick(lang, benefit.title),
      caption: index === 0 && leadBenefit ? (factCaption || leadCaption || '') : pick(lang, benefit.detail),
    }));
  return (
    <View testID="paywall-c-benefits" style={[S.section, { borderTopColor: g.line }]}>
      <Text accessibilityRole="header" style={[S.heading, { color: g.text }]}>{pick(lang, COPY.whatsIncluded)}</Text>
      {benefits.map((benefit, index) => <Row key={`${index}:${benefit.title}`} g={g} title={benefit.title} caption={benefit.caption} index={index} />)}
      {paragraph ? <Text testID="paywall-v3-paragraph" style={[S.paragraph, { color: g.text }]}>{paragraph}</Text> : null}
    </View>
  );
});

const S = StyleSheet.create({
  section: { marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: '800', marginBottom: 4 },
  // макет «Все окна Plus»: строка плотнее — отступ 10, пункт 16, строка под ним 13 (шапка/абзац/плитки/кнопка помещаются на 360×800)
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  check: { width: 26, alignItems: 'flex-start', justifyContent: 'center', paddingTop: 1 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  caption: { fontSize: 13, lineHeight: 17, marginTop: 1 },
  // зачем (макет): абзац под списком — обычный текст 13/18, отступ как между блоками листа
  paragraph: { marginTop: 12, fontSize: 13, lineHeight: 18 },
});
