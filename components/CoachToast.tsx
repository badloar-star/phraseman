import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { type WordCategory } from '../app/phrase_analytics';
import { useOverlayVisible } from './OverlayArbiter';

interface CoachToastProps {
  category: WordCategory;
  labelRu: string;
  labelUk: string;
  labelEs: string;
  labelPtBr: string;
  labelVi: string;
  labelId: string;
  labelTr: string;
  labelPl: string;
  mistakeCount: number;
  weaknessScore?: number;
  priorityScore?: number;
  recoveryScore?: number;
  focusWords?: string[];
  microDiagnosisId?: string;
  microLabelRu?: string;
  microLabelUk?: string;
  microLabelEs?: string;
  microLabelPtBr?: string;
  microLabelVi?: string;
  microLabelId?: string;
  microLabelTr?: string;
  microLabelPl?: string;
  diagnosisEvidenceCount?: number;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 8000;

export default function CoachToast({
  category,
  labelRu,
  labelUk,
  labelEs,
  labelPtBr,
  labelVi,
  labelId,
  labelTr,
  labelPl,
  weaknessScore,
  priorityScore,
  recoveryScore,
  focusWords = [],
  microDiagnosisId,
  microLabelRu,
  microLabelUk,
  microLabelEs,
  microLabelPtBr,
  microLabelVi,
  microLabelId,
  microLabelTr,
  microLabelPl,
  diagnosisEvidenceCount,
  onDismiss,
}: CoachToastProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const overlayVisible = useOverlayVisible('coachToast', true);
  const slideAnim = useRef(new Animated.Value(120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const categoryLabel = triLang(lang, {
    ru: labelRu,
    uk: labelUk,
    es: labelEs,
    'pt-BR': labelPtBr,
    vi: labelVi,
    id: labelId,
    tr: labelTr,
    pl: labelPl,
  });

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 120, duration: 220, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [opacityAnim, onDismiss, slideAnim]);

  useEffect(() => {
    if (!overlayVisible) return;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dismiss, opacityAnim, overlayVisible, slideAnim]);

  const handleStart = () => {
    hapticTap();
    onDismiss();
    if (microDiagnosisId) {
      router.push({
        pathname: '/problem_coach',
        params: {
          category,
          ...(typeof priorityScore === 'number' ? { priority: String(priorityScore) } : {}),
          ...(typeof recoveryScore === 'number' ? { recovery: String(recoveryScore) } : {}),
          microDiagnosisId,
          ...(microLabelRu ? { microLabelRu } : {}),
          ...(microLabelUk ? { microLabelUk } : {}),
          ...(microLabelEs ? { microLabelEs } : {}),
          ...(microLabelPtBr ? { microLabelPtBr } : {}),
          ...(microLabelVi ? { microLabelVi } : {}),
          ...(microLabelId ? { microLabelId } : {}),
          ...(microLabelTr ? { microLabelTr } : {}),
          ...(microLabelPl ? { microLabelPl } : {}),
          ...(typeof diagnosisEvidenceCount === 'number' ? { evidence: String(diagnosisEvidenceCount) } : {}),
        },
      });
      return;
    }
  };

  const microLabel = microLabelRu || microLabelUk || microLabelEs || microLabelPtBr || microLabelVi || microLabelId || microLabelTr || microLabelPl
    ? triLang(lang, {
        ru: microLabelRu ?? categoryLabel,
        uk: microLabelUk ?? microLabelRu ?? categoryLabel,
        es: microLabelEs ?? microLabelRu ?? categoryLabel,
        'pt-BR': microLabelPtBr ?? microLabelEs ?? categoryLabel,
        vi: microLabelVi ?? microLabelEs ?? categoryLabel,
        id: microLabelId ?? microLabelEs ?? categoryLabel,
        tr: microLabelTr ?? microLabelEs ?? categoryLabel,
        pl: microLabelPl ?? microLabelEs ?? categoryLabel,
      })
    : null;
  const titleText = triLang(lang, {
    ru: microLabel
      ? `Мы заметили трудности с ${microLabel}`
      : `Мы заметили трудности с темой «${categoryLabel}»`,
    uk: microLabel
      ? `Ми помітили труднощі з ${microLabel}`
      : `Ми помітили труднощі з темою «${categoryLabel}»`,
    es: microLabel
      ? `Notamos dificultad con ${microLabel}`
      : `Notamos dificultad con «${categoryLabel}»`,
    'pt-BR': microLabel
      ? `Notamos dificuldade com ${microLabel}`
      : `Notamos dificuldade com «${categoryLabel}»`,
    vi: microLabel
      ? `Chúng tôi thấy bạn gặp khó với ${microLabel}`
      : `Chúng tôi thấy bạn gặp khó với chủ đề «${categoryLabel}»`,
    id: microLabel
      ? `Kami melihat kesulitan pada ${microLabel}`
      : `Kami melihat kesulitan pada topik «${categoryLabel}»`,
    tr: microLabel
      ? `${microLabel} konusunda zorlandığını fark ettik`
      : `«${categoryLabel}» konusunda zorlandığını fark ettik`,
    pl: microLabel
      ? `Widzimy trudność z ${microLabel}`
      : `Widzimy trudność z tematem «${categoryLabel}»`,
  });
  const descText = triLang(lang, {
    ru: 'Если есть минутка, объясним на простом примере, как больше не допускать эту ошибку.',
    uk: 'Якщо є хвилинка, пояснимо на простому прикладі, як більше не припускатися цієї помилки.',
    es: 'Si tienes un minuto, te lo explicamos con un ejemplo sencillo para evitar este error.',
    'pt-BR': 'Se você tiver um minuto, explicamos com um exemplo simples como evitar esse erro.',
    vi: 'Nếu bạn có một phút, chúng tôi sẽ giải thích bằng một ví dụ đơn giản để tránh lỗi này.',
    id: 'Jika kamu punya waktu sebentar, kami akan menjelaskannya dengan contoh sederhana agar kesalahan ini tidak terulang.',
    tr: 'Bir dakikan varsa, bu hatayı önlemek için basit bir örnekle açıklayalım.',
    pl: 'Jeśli masz chwilę, wyjaśnimy to na prostym przykładzie, żeby uniknąć tego błędu.',
  });
  const focusText = focusWords.length > 0 ? focusWords.join(' · ') : null;
  const hasStrongSignal = typeof weaknessScore === 'number' && weaknessScore >= 70;
  const confidenceText = triLang(lang, {
    ru: hasStrongSignal ? 'Точный фокус' : 'Есть зацепка',
    uk: hasStrongSignal ? 'Точний фокус' : 'Є зачіпка',
    es: hasStrongSignal ? 'Foco claro' : 'Hay una pista',
    'pt-BR': hasStrongSignal ? 'Foco claro' : 'Há uma pista',
    vi: hasStrongSignal ? 'Trọng tâm rõ' : 'Có manh mối',
    id: hasStrongSignal ? 'Fokus jelas' : 'Ada petunjuk',
    tr: hasStrongSignal ? 'Net odak' : 'Bir ipucu var',
    pl: hasStrongSignal ? 'Jasny fokus' : 'Jest trop',
  });

  if (!overlayVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: t.accentBg }]}>
            <Ionicons name="sparkles" size={21} color={t.accent} />
          </View>
          <View style={styles.textWrap}>
            <Text style={[styles.eyebrow, { color: t.accent, fontSize: f.caption }]} numberOfLines={1}>
              {confidenceText}
            </Text>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.body }]}>
              {titleText}
            </Text>
          </View>
          <TouchableOpacity onPress={dismiss} style={styles.dismissBtn} hitSlop={12}>
            <Ionicons name="close" size={19} color={t.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.desc, { color: t.textSecond, fontSize: f.caption }]} numberOfLines={2}>
          {descText}
        </Text>

        <View style={styles.metaRow}>
          {focusText && (
            <View style={[styles.focusPill, { borderColor: t.border }]}>
              <Text style={[styles.focusText, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={1}>
                {focusText}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleStart}
            style={[styles.startBtn, { backgroundColor: t.accent }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.startBtnText, { color: t.correctText, fontSize: f.label }]}>
              {triLang(lang, {
                ru: 'Объяснить',
                uk: 'Пояснити',
                es: 'Explicar',
                'pt-BR': 'Explicar',
                vi: 'Giải thích',
                id: 'Jelaskan',
                tr: 'Açıkla',
                pl: 'Wyjaśnij',
              })}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={t.correctText} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    fontWeight: '800',
  },
  desc: {
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  focusPill: {
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  focusText: {
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  startBtn: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  startBtnText: {
    fontWeight: '800',
  },
  dismissBtn: {
    padding: 4,
  },
});
