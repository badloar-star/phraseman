/**
 * Экран «Что это?» для рулетки Plus (роут /roulette_about).
 *
 * Полностью статичный: hero с тремя карточками призов, «Как это работает»
 * (3 шага), полный список призов с дефолтными шансами, правила, CTA
 * «Пригласить друга» → /referrals.
 *
 * Токены: fontWeight только '400'/'700'; тени shadowColor '#000000';
 * LinearGradient только start/end.
 */
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { CINEMA, cinemaAlpha, isCinemaMode } from '../constants/cinemaThemes';
import { ROULETTE_PRIZES, SHOW_SPIN_ODDS } from './roulette_prizes';

const STEPS: readonly { title: string; text: string }[] = [
  { title: 'Пригласи друга', text: 'Поделись своей ссылкой или кодом из раздела «Рефералы».' },
  { title: 'Друг начнёт учиться', text: 'Когда приглашение засчитается, ты получишь прокрут рулетки.' },
  { title: 'Крути и выигрывай', text: 'Каждый прокрут — гарантированный приз: дни Plus добавляются к подписке.' },
];

const RULES: readonly string[] = [
  'Прокрут начисляется за каждое засчитанное приглашение.',
  'Не более 3 прокрутов в день и 30 в месяц.',
  'Выигрыш суммируется с текущим сроком Plus.',
  'Результат определяет сервер.',
];

export default function RouletteAboutScreen() {
  const { theme: t, f, ds, themeMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const bloomColors: [string, string] = isCinemaMode(themeMode)
    ? [CINEMA[themeMode].bloomA, CINEMA[themeMode].bloomB]
    : [t.accent, t.accent];

  const heroPrizes = [ROULETTE_PRIZES[2], ROULETTE_PRIZES[5], ROULETTE_PRIZES[3]]; // 1м / 1г / 3м

  return (
    <View style={styles.root}>
      <LinearGradient colors={t.bgGradient} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['transparent', cinemaAlpha(bloomColors[0], 0.18), cinemaAlpha(bloomColors[1], 0.26)]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomBloom}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Хедер */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.headerBtn, { borderColor: t.border }]}
            accessibilityLabel="Назад"
          >
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily, fontWeight: '400' }}>‹</Text>
          </Pressable>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontFamily: ds.fontFamily, fontWeight: '700', flex: 1, textAlign: 'center' }}>
            Что это?
          </Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Hero: три карточки веером */}
        <View style={styles.hero}>
          {heroPrizes.map((p, i) => (
            <View
              key={p.index}
              style={[
                styles.heroCardOuter,
                { shadowColor: '#000000' },
                i === 1 ? styles.heroCardCenter : null,
                { transform: [{ rotate: i === 0 ? '-8deg' : i === 2 ? '8deg' : '0deg' }] },
              ]}
            >
              <View style={[styles.heroCardInner, { borderColor: i === 1 ? t.accent : t.border }]}>
                <Image source={p.image} style={styles.heroCardImage} resizeMode="cover" />
              </View>
            </View>
          ))}
        </View>
        <Text style={{ color: t.textMuted, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '400', textAlign: 'center', marginTop: 18, paddingHorizontal: 32 }}>
          Рулетка Plus — бесплатные дни подписки за приглашённых друзей. Каждый прокрут выигрывает.
        </Text>

        {/* Как это работает */}
        <View style={[styles.card, { backgroundColor: t.accentBg, borderColor: t.border }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily }]}>
            Как это работает
          </Text>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: t.accent }]}>
                <Text style={{ color: t.correctText, fontSize: f.label, fontFamily: ds.fontFamily, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '700' }}>{s.title}</Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '400', marginTop: 2 }}>{s.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Призы */}
        <View style={[styles.card, { backgroundColor: t.accentBg, borderColor: t.border }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily }]}>
            Призы
          </Text>
          {ROULETTE_PRIZES.map((p) => (
            <View key={p.index} style={styles.prizeRow}>
              <View style={[styles.prizeThumbOuter, { borderColor: t.border }]}>
                <Image source={p.image} style={styles.prizeThumb} resizeMode="cover" />
              </View>
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '700', width: 74 }}>
                {p.label}
              </Text>
              {SHOW_SPIN_ODDS && (
                <>
                  <View style={[styles.prizeBarTrack, { backgroundColor: t.border }]}>
                    <View style={[styles.prizeBarFill, { backgroundColor: t.accent, width: `${Math.max(2, p.weight)}%` }]} />
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '400', width: 52, textAlign: 'right' }}>
                    {p.weight}%
                  </Text>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Правила */}
        <View style={[styles.card, { backgroundColor: t.accentBg, borderColor: t.border }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily }]}>
            Правила
          </Text>
          {RULES.map((r, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={{ color: t.accent, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '700' }}>•</Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '400', flex: 1 }}>{r}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <View style={[styles.ctaOuter, { shadowColor: '#000000' }]}>
            <Pressable
              onPress={() => router.push('/referrals')}
              style={({ pressed }: { pressed: boolean }) => [{ borderRadius: 22, overflow: 'hidden', opacity: pressed ? 0.92 : 1 }]}
              accessibilityLabel="Пригласить друга"
            >
              <LinearGradient
                colors={bloomColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.ctaBtn, { height: ds.buttonHeight }]}
              >
                <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontFamily: ds.fontFamily, fontWeight: '700' }}>
                  Пригласить друга
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bottomBloom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 10,
  },
  heroCardOuter: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  heroCardCenter: {
    zIndex: 1,
    marginTop: -14,
  },
  heroCardInner: {
    width: 120,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
  },
  heroCardImage: {
    width: '100%',
    height: '100%',
  },
  card: {
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  prizeThumbOuter: {
    width: 48,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  prizeThumb: {
    width: '100%',
    height: '100%',
  },
  prizeBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  prizeBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ruleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  ctaWrap: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  ctaOuter: {
    borderRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  ctaBtn: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
