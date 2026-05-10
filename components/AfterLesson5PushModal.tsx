import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { getLevelFromXP } from '../constants/theme';
import { navigateAfterModalClose } from '../app/safe_modal_navigation';

const { height: SCREEN_H } = Dimensions.get('window');

/** Спокойное «дорогое» золото — без кричащих оттенков */
const LUX = {
  gold: '#C9A227',
  goldSoft: '#E8D5A3',
  goldDim: 'rgba(201, 162, 39, 0.45)',
  panelDark: '#12100e',
  panelBorder: 'rgba(212, 175, 88, 0.28)',
  prose: '#c4b8a4',
  iconRing: 'rgba(201, 162, 39, 0.12)',
};

const FEATURE_ROW_COUNT = 5;

type FeatureDef = { icon: keyof typeof Ionicons.glyphMap; label: { ru: string; uk: string; es: string } };

function buildFeatures(): FeatureDef[] {
  return [
    {
      icon: 'flash-outline',
      label: {
        ru: 'Безлимит энергии — учись когда хочешь',
        uk: 'Безліміт енергії — навчайся коли хочеш',
        es: 'Energía ilimitada — estudia cuando quieras',
      },
    },
    {
      icon: 'refresh-outline',
      label: {
        ru: 'Повтор любого урока — неограниченно',
        uk: 'Повтор будь-якого уроку — необмежено',
        es: 'Repite cualquier lección sin límites',
      },
    },
    {
      icon: 'pulse-outline',
      label: {
        ru: 'Тренер слабых мест — фразы где ты ошибаешься',
        uk: 'Тренер слабких місць — фрази де ти помиляєшся',
        es: 'Entrenador de puntos débiles',
      },
    },
    {
      icon: 'stats-chart-outline',
      label: {
        ru: 'Подробная аналитика и карта 365 дней',
        uk: 'Детальна аналітика і карта 365 днів',
        es: 'Analítica detallada y mapa de 365 días',
      },
    },
    {
      icon: 'trophy-outline',
      label: {
        ru: 'Сложные квизы и расширенные задания',
        uk: 'Складні квізи та розширені завдання',
        es: 'Quizzes difíciles y tareas avanzadas',
      },
    },
  ];
}

export interface PersonalStats {
  /** Сколько фраз изучено (успешные ответы из всех 32 уроков). */
  phrasesLearned: number;
  /** Текущая цепочка дней подряд. */
  streak: number;
  /** Текущий уровень (рассчитан из XP). */
  level: number;
}

export interface AfterLesson5PushModalProps {
  visible: boolean;
  stats: PersonalStats;
  onClose: () => void;
}

/**
 * Soft-push после первого завершения lesson 5.
 * Не отнимает контент. Триггерится 1 раз навсегда (storage flag).
 * Цель: предложить trial / ознакомить с premium-фичами в момент когда юзер уже инвестировал
 * минимум 5 уроков труда → высокая вероятность конверсии.
 *
 * Закрытие: «Продолжить бесплатно» (мелкий текст), backdrop tap, или системная back-кнопка.
 * Покупка premium → автоматически срабатывает PremiumCelebrationModal в home через flag.
 */
export default function AfterLesson5PushModal({
  visible,
  stats,
  onClose,
}: AfterLesson5PushModalProps) {
  const router = useRouter();
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();
  const { trialEligible } = usePremium();
  const [enterT] = useState(() => new Animated.Value(0));
  const featureAnims = useRef(
    Array.from({ length: FEATURE_ROW_COUNT }, () => new Animated.Value(0)),
  ).current;

  const features = buildFeatures();

  useEffect(() => {
    if (!visible) {
      enterT.setValue(0);
      featureAnims.forEach((a) => a.setValue(0));
      return;
    }
    enterT.setValue(0);
    featureAnims.forEach((a) => a.setValue(0));
    Animated.parallel([
      Animated.timing(enterT, {
        toValue: 1,
        duration: 540,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(
        72,
        featureAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ),
      ),
    ]).start();
  }, [visible, enterT, featureAnims]);

  const onTryPremium = useCallback(() => {
    hapticTap();
    navigateAfterModalClose(onClose, () => {
      router.push({
        pathname: '/premium_modal',
        params: { context: 'after_lesson5', source: 'lesson5_push' },
      } as any);
    });
  }, [onClose, router]);

  const onSkip = useCallback(() => {
    hapticTap();
    onClose();
  }, [onClose]);

  const isLight = themeMode === 'ocean' || themeMode === 'sakura';

  const titleRu = `Ты прошёл 5 уроков. ${stats.phrasesLearned} фраз. Серьёзный настрой.`;
  const titleUk = `Ти пройшов 5 уроків. ${stats.phrasesLearned} фраз. Серйозний настрій.`;
  const titleEs = `Has completado 5 lecciones. ${stats.phrasesLearned} frases. Vas en serio.`;

  const subRu =
    'Премиум вытащит тебя на следующий уровень — без ограничений энергии, со слабыми местами в Тренере и аналитикой прогресса.';
  const subUk =
    'Преміум допоможе зростати швидше — без обмежень енергії, зі слабкими місцями в Тренері та аналітикою.';
  const subEs =
    'Premium te llevará al siguiente nivel — sin límites de energía, con puntos débiles en el Entrenador y analítica detallada.';

  /** «7 дней» только если магазин реально отдаёт intro — см. PremiumContext.trialEligible */
  const ctaLabel = triLang(
    lang,
    trialEligible
      ? {
          ru: 'Попробовать 7 дней бесплатно',
          uk: 'Спробувати 7 днів безкоштовно',
          es: 'Probar 7 días gratis',
        }
      : {
          ru: 'Попробовать Премиум',
          uk: 'Спробувати Premium',
          es: 'Probar Premium',
        },
  );

  const skipRu = 'Продолжить бесплатно';
  const skipUk = 'Продовжити безкоштовно';
  const skipEs = 'Continuar gratis';

  const cardBg = isLight ? t.bgCard : LUX.panelDark;
  const cardBorder = isLight ? t.border : LUX.panelBorder;
  const subColor = isLight ? t.textSecond : LUX.prose;

  const anchorLines = [
    triLang(lang, {
      ru: `${stats.phrasesLearned} фраз уже в зачёт — это не «я попробовал», а реальная база.`,
      uk: `${stats.phrasesLearned} фраз уже в зарахунку — це не «я спробував», а реальна база.`,
      es: `${stats.phrasesLearned} frases suman: no es un intento suelto, es una base.`,
    }),
    triLang(lang, {
      ru:
        stats.streak > 0
          ? `${stats.streak} дней подряд — такой ритм уже отделяет тех, кто дойдёт, от тех, кто бросит на полпути.`
          : 'Следующий шаг — ритм: Premium снимает паузы из-за энергии, чтобы тренировка не обрывалась.',
      uk:
        stats.streak > 0
          ? `${stats.streak} днів поспіль — такий ритм уже відділяє тих, хто дійде, від тих, хто кине на півдорозі.`
          : 'Наступний крок — ритм: Premium знімає паузи через енергію, щоб тренування не обривалося.',
      es:
        stats.streak > 0
          ? `${stats.streak} días seguidos: ese ritmo separa a quien llega de quien para a medias.`
          : 'El siguiente paso es el ritmo: Premium quita pausas por energía para no cortar el entreno.',
    }),
    triLang(lang, {
      ru: `Уровень ${stats.level} — скорость роста можно удвоить: безлимит, повторы и Тренер слабых мест в одном пакете.`,
      uk: `Рівень ${stats.level} — швидкість росту можна подвоїти: безліміт, повтори й Тренер слабких місць в одному пакеті.`,
      es: `Nivel ${stats.level}: puedes acelerar el ritmo con energía ilimitada, repeticiones y el entrenador de puntos débiles.`,
    }),
  ];

  const enterStyle = {
    opacity: enterT,
    transform: [
      {
        translateY: enterT.interpolate({
          inputRange: [0, 1],
          outputRange: [48, 0],
        }),
      },
      {
        scale: enterT.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1],
        }),
      },
    ],
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: isLight ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.82)' }]}
          onPress={onSkip}
        />
        <Animated.View style={[styles.cardWrap, enterStyle]} pointerEvents="box-none">
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              <View style={styles.headerRow}>
                <LinearGradient
                  colors={['rgba(42,36,28,0.95)', 'rgba(18,16,14,0.98)']}
                  style={styles.crownBadge}
                >
                  <View style={styles.crownInnerRing}>
                    <Ionicons name="diamond" size={26} color={LUX.goldSoft} />
                  </View>
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.title, { color: isLight ? t.textPrimary : '#f2efe8', fontSize: Math.max(19, f.h2) }]}>
                    {triLang(lang, { ru: titleRu, uk: titleUk, es: titleEs })}
                  </Text>
                </View>
              </View>

              <Text style={[styles.strengthSectionLabel, { color: isLight ? t.textMuted : LUX.goldDim }]}>
                {triLang(lang, { ru: 'ПОЧЕМУ ТЫ УЖЕ В ХОРОШЕЙ ПОЗИЦИИ', uk: 'ЧОМУ ТИ ВЖЕ В ХОРОШІЙ ПОЗИЦІЇ', es: 'POR QUÉ YA VAS BIEN' })}
              </Text>
              <View style={styles.anchorList}>
                {anchorLines.map((line, idx) => (
                  <View key={idx} style={[styles.anchorRow, { borderColor: isLight ? t.border : 'rgba(212, 175, 88, 0.22)' }]}>
                    <View style={[styles.anchorIconWrap, { backgroundColor: isLight ? LUX.iconRing : 'rgba(201, 162, 39, 0.12)' }]}>
                      <Ionicons name="trending-up" size={20} color={LUX.gold} />
                    </View>
                    <Text style={[styles.anchorText, { color: isLight ? t.textPrimary : '#f0ebe9', fontSize: f.body }]}>
                      {line}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.subtitle, { color: subColor, fontSize: f.body, marginTop: 6, marginBottom: 4 }]}>
                {triLang(lang, { ru: subRu, uk: subUk, es: subEs })}
              </Text>

              <View style={styles.featuresList}>
                {features.map((feat, i) => {
                  const anim = featureAnims[i];
                  const rowStyle = {
                    opacity: anim,
                    transform: [
                      {
                        translateX: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [14, 0],
                        }),
                      },
                    ],
                  };
                  return (
                    <Animated.View key={feat.icon + String(i)} style={[styles.featureRow, rowStyle]}>
                      <View style={[styles.featureIconWrap, { backgroundColor: isLight ? LUX.iconRing : 'rgba(201, 162, 39, 0.08)' }]}>
                        <Ionicons name={feat.icon} size={21} color={LUX.gold} />
                      </View>
                      <Text style={[styles.featureText, { color: isLight ? t.textPrimary : '#ebe6dc', fontSize: f.body }]}>
                        {triLang(lang, feat.label)}
                      </Text>
                    </Animated.View>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity activeOpacity={0.88} onPress={onTryPremium} style={styles.ctaWrap}>
              <LinearGradient
                colors={['#6b5420', '#9a7b32', '#c9a227', '#9a7b32', '#6b5420']}
                locations={[0, 0.25, 0.5, 0.75, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.ctaGradient}
              >
                <View style={styles.ctaInner}>
                  <Ionicons name="sparkles" size={20} color="#1a1208" style={{ marginRight: 8 }} />
                  <Text style={[styles.ctaText, { fontSize: f.bodyLg }]}>{ctaLabel}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: isLight ? t.textMuted : 'rgba(200,190,175,0.75)', fontSize: f.caption }]}>
                {triLang(lang, { ru: skipRu, uk: skipUk, es: skipEs })}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Утилита: строит PersonalStats из локальных AsyncStorage-ключей.
 * Используется родителем (lesson_complete.tsx) при показе.
 */
export async function loadAfterLesson5Stats(): Promise<PersonalStats> {
  try {
    const [streakRaw, xpRaw, ...lessonProgs] = await Promise.all([
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('user_total_xp'),
      ...Array.from({ length: 32 }, (_, i) => AsyncStorage.getItem(`lesson${i + 1}_progress`)),
    ]);
    let phrasesLearned = 0;
    for (const raw of lessonProgs) {
      if (!raw) continue;
      try {
        const arr: string[] = JSON.parse(raw);
        if (Array.isArray(arr)) {
          phrasesLearned += arr.filter((x) => x === 'correct' || x === 'replay_correct').length;
        }
      } catch {
        /* skip */
      }
    }
    const streak = parseInt(streakRaw || '0', 10) || 0;
    const xp = parseInt(xpRaw || '0', 10) || 0;
    const level = getLevelFromXP(xp);
    return { phrasesLearned, streak, level };
  } catch {
    return { phrasesLearned: 0, streak: 0, level: 1 };
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  cardWrap: { width: '100%', maxWidth: 420, zIndex: 1, maxHeight: SCREEN_H * 0.9 },
  card: {
    borderRadius: 22,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    elevation: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  crownBadge: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LUX.panelBorder,
  },
  crownInnerRing: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 163, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  title: { fontWeight: '700', lineHeight: 28, letterSpacing: 0.15 },
  strengthSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  anchorList: { gap: 12, marginBottom: 20 },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  anchorIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  anchorText: { flex: 1, fontWeight: '600', lineHeight: 23, letterSpacing: 0.12 },
  subtitle: { lineHeight: 24, marginBottom: 18, letterSpacing: 0.2 },
  featuresList: {
    gap: 14,
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, fontWeight: '700', lineHeight: 24, letterSpacing: 0.12 },
  ctaWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 88, 0.35)',
  },
  ctaGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#140f08',
    fontWeight: '800',
    letterSpacing: 0.35,
  },
  skipBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    fontWeight: '500',
    textDecorationLine: 'underline',
    letterSpacing: 0.2,
  },
});
