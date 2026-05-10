// ═══════════════════════════════════════════════════════════════════════════
// phrase_analytics_screen.tsx — экран «Аналитика ошибок» (Premium)
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter, type Router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { triLang } from '../constants/i18n';
import { hapticTap, hapticSuccess } from '../hooks/use-haptics';
import {
  computePhraseAnalytics,
  type PhraseAnalyticsResult,
  type WordCategoryStat,
  type LessonMistakeStat,
  type PersonalInsight,
  type WordCategory,
} from './phrase_analytics';

type IonName = ComponentProps<typeof Ionicons>['name'];

// ── Дизайн-токены ─────────────────────────────────────────────────────────────

const GATE_LUX = {
  panelDark: '#12100e',
  panelBorder: 'rgba(212, 175, 88, 0.28)',
  gold: '#C9A227',
  goldSoft: '#E8D5A3',
  prose: '#c4b8a4',
  iconRing: 'rgba(201, 162, 39, 0.12)',
} as const;

// Нейтральная палитра — никаких кислотных цветов
const SIGNAL = {
  weak: 'rgba(255,255,255,0.55)',      // слабые категории — приглушённый белый
  weakBorder: 'rgba(255,255,255,0.12)',
  strong: 'rgba(255,255,255,0.22)',    // сильные — ещё тише
  bar: {
    high: 'rgba(255,255,255,0.7)',     // > 30% — акцент на баре
    mid: 'rgba(255,255,255,0.45)',     // 15–30%
    low: 'rgba(255,255,255,0.2)',      // < 15%
  },
} as const;

const GATE_BENEFITS: { icon: IonName; ru: string; uk: string; es: string }[] = [
  { icon: 'stats-chart-outline', ru: 'Топ категорий, где чаще всего промах.', uk: 'Топ категорій, де найчастіше промах.', es: 'Categorías donde más fallas.' },
  { icon: 'school-outline', ru: 'Уроки с самым высоким % ошибок.', uk: 'Уроки з найвищим % помилок.', es: 'Lecciones con mayor % de errores.' },
  { icon: 'list-circle-outline', ru: 'Список фраз «уточнить и повторить».', uk: 'Список фраз «уточнити й повторити».', es: 'Lista de frases para repasar.' },
];

// ── Метки категорий ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<WordCategory, { ru: string; uk: string; es: string }> = {
  verb:            { ru: 'Глаголы',          uk: 'Дієслова',          es: 'Verbos' },
  noun:            { ru: 'Существительные',   uk: 'Іменники',          es: 'Sustantivos' },
  pronoun:         { ru: 'Местоимения',       uk: 'Займенники',        es: 'Pronombres' },
  adjective:       { ru: 'Прилагательные',    uk: 'Прикметники',       es: 'Adjetivos' },
  adverb:          { ru: 'Наречия',           uk: 'Прислівники',       es: 'Adverbios' },
  preposition:     { ru: 'Предлоги',          uk: 'Прийменники',       es: 'Preposiciones' },
  article:         { ru: 'Артикли',           uk: 'Артиклі',           es: 'Artículos' },
  'to-be':         { ru: 'Глагол to be',      uk: 'Дієслово to be',    es: 'Verbo to be' },
  conjunction:     { ru: 'Союзы',             uk: 'Сполучники',        es: 'Conjunciones' },
  modal:           { ru: 'Модальные',         uk: 'Модальні',          es: 'Modales' },
  phrasal_particle:{ ru: 'Частицы',           uk: 'Частки',            es: 'Partículas' },
  other:           { ru: 'Другое',            uk: 'Інше',              es: 'Otros' },
};

// ── ProgressBar ───────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const barColor = pct >= 30 ? SIGNAL.bar.high : pct >= 15 ? SIGNAL.bar.mid : SIGNAL.bar.low;
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
    </View>
  );
}

// ── InsightRow — минималистичный, без цветного бордера слева ─────────────────

function InsightRow({ insight }: { insight: PersonalInsight }) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const text = triLang(lang, { ru: insight.ru, uk: insight.uk, es: insight.es });
  const isPositive = insight.accent === 'green';
  const iconName: IonName = isPositive ? 'checkmark-circle-outline' : 'alert-circle-outline';

  return (
    <View style={[styles.insightRow, { borderBottomColor: t.border }]}>
      <Ionicons
        name={iconName}
        size={16}
        color={isPositive ? 'rgba(255,255,255,0.35)' : t.accent}
        style={{ marginTop: 1, flexShrink: 0 }}
      />
      <Text style={[styles.insightText, { color: isPositive ? t.textMuted : t.textSecond, fontSize: f.body }]}>
        {text}
      </Text>
    </View>
  );
}

// ── CategoryRow ───────────────────────────────────────────────────────────────

function CategoryRow({ stat, router }: { stat: WordCategoryStat; router: Router }) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const label = triLang(lang, CATEGORY_LABELS[stat.category]);
  const isWeak = stat.pct >= 15;
  const pctOpacity = stat.pct >= 30 ? 1 : stat.pct >= 15 ? 0.75 : 0.45;

  const inner = (
    <>
      <View style={styles.catMeta}>
        <Text style={[styles.catPctBig, { color: t.textPrimary, opacity: pctOpacity, fontSize: f.h2 }]}>
          {stat.pct}
        </Text>
        <Text style={[styles.catPctSign, { color: t.textMuted, fontSize: f.caption }]}>%</Text>
      </View>
      <View style={styles.catBody}>
        <Text style={[styles.catLabel, { color: t.textPrimary, fontSize: f.body }]} numberOfLines={1}>
          {label}
        </Text>
        <ProgressBar pct={stat.pct} />
        {stat.topWords.length > 0 && (
          <Text style={[styles.catWords, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={1}>
            {stat.topWords.join(' · ')}
          </Text>
        )}
        {isWeak && (
          <View style={[styles.coachCta, { borderTopColor: t.border }]}>
            <Ionicons name="school-outline" size={12} color={t.accent} />
            <Text style={[styles.coachCtaText, { color: t.accent, fontSize: f.caption }]}>
              {triLang(lang, {
                ru: 'Персональное объяснение и упражнения',
                uk: 'Персональне пояснення та вправи',
                es: 'Explicación y ejercicios personalizados',
              })}
            </Text>
            <Ionicons name="chevron-forward" size={12} color={t.accent} style={{ opacity: 0.6 }} />
          </View>
        )}
      </View>
    </>
  );

  if (isWeak) {
    return (
      <TouchableOpacity
        onPress={() => {
          hapticTap();
          router.push({ pathname: '/problem_coach', params: { category: stat.category } } as any);
        }}
        style={[styles.catRow, { backgroundColor: t.bgCard, borderColor: t.border }]}
        activeOpacity={0.75}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.catRow, { backgroundColor: t.bgCard, borderColor: t.border }]}>
      {inner}
    </View>
  );
}

// ── LessonRow ─────────────────────────────────────────────────────────────────

function LessonRow({ stat }: { stat: LessonMistakeStat }) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const name = lang === 'uk' ? stat.lessonNameUK : lang === 'es' ? stat.lessonNameES : stat.lessonNameRU;
  const pctOpacity = stat.pct >= 25 ? 1 : stat.pct >= 12 ? 0.75 : 0.45;

  return (
    <View style={[styles.catRow, { backgroundColor: t.bgCard, borderColor: t.border }]}>
      <View style={styles.catMeta}>
        <Text style={[styles.catPctBig, { color: t.textPrimary, opacity: pctOpacity, fontSize: f.h2 }]}>
          {stat.pct}
        </Text>
        <Text style={[styles.catPctSign, { color: t.textMuted, fontSize: f.caption }]}>%</Text>
      </View>
      <View style={styles.catBody}>
        <View style={styles.lessonMeta}>
          <Text style={[styles.lessonNum, { color: t.textMuted, fontSize: f.caption }]}>
            {triLang(lang, { ru: 'Урок', uk: 'Урок', es: 'Lec.' })} {stat.lessonId}
          </Text>
        </View>
        <Text style={[styles.catLabel, { color: t.textPrimary, fontSize: f.sub }]} numberOfLines={2}>
          {name}
        </Text>
        <ProgressBar pct={stat.pct} />
      </View>
    </View>
  );
}

// ── Главный экран ─────────────────────────────────────────────────────────────

export default function PhraseAnalyticsScreen() {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const isLightGate = themeMode === 'ocean' || themeMode === 'sakura';
  const { lang } = useLang();
  const { isPremium } = usePremium();
  const [data, setData] = useState<PhraseAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'categories' | 'lessons' | 'phrases'>('categories');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await computePhraseAnalytics();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const title = triLang(lang, { ru: 'Аналитика', uk: 'Аналітика', es: 'Analítica' });
  const emptyText = triLang(lang, {
    ru: 'Пока нет данных. Пройди несколько уроков — аналитика появится здесь.',
    uk: 'Поки немає даних. Пройди кілька уроків — аналітика з\'явиться тут.',
    es: 'Sin datos aún. Completa algunas lecciones y la analítica aparecerá aquí.',
  });

  const tabs = [
    { key: 'categories' as const, label: triLang(lang, { ru: 'Категории', uk: 'Категорії', es: 'Categorías' }) },
    { key: 'lessons' as const, label: triLang(lang, { ru: 'Уроки', uk: 'Уроки', es: 'Lecciones' }) },
    { key: 'phrases' as const, label: triLang(lang, { ru: 'Фразы', uk: 'Фрази', es: 'Frases' }) },
  ];

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => { hapticTap(); router.back(); }}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Premium gate ── */}
        {!isPremium ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gateScroll}>
            <ContentWrap>
              <View style={[styles.gateCard, {
                backgroundColor: isLightGate ? t.bgCard : GATE_LUX.panelDark,
                borderColor: isLightGate ? t.border : GATE_LUX.panelBorder,
              }]}>
                {/* Icon + title */}
                <View style={styles.gateHeader}>
                  <LinearGradient
                    colors={['rgba(42,36,28,0.95)', 'rgba(18,16,14,0.98)']}
                    style={[styles.gateIconBox, { borderColor: GATE_LUX.panelBorder }]}
                  >
                    <View style={[styles.gateIconInner, { borderColor: 'rgba(232,213,163,0.35)' }]}>
                      <Ionicons name="diamond" size={24} color={GATE_LUX.goldSoft} />
                    </View>
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[styles.gateLabel, { color: isLightGate ? '#B8860B' : GATE_LUX.gold }]}>
                      INSIGHT LAB
                    </Text>
                    <Text style={[styles.gateTitle, { color: isLightGate ? t.textPrimary : '#f2efe8', fontSize: Math.max(18, f.h2 * 0.88) }]}>
                      {triLang(lang, { ru: 'Персональный отчёт по слабым местам', uk: 'Персональний звіт по слабких місцях', es: 'Informe personal de puntos débiles' })}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.gateProse, { color: isLightGate ? t.textSecond : GATE_LUX.prose, fontSize: f.body }]}>
                  {triLang(lang, {
                    ru: 'Категории слов, уроки и конкретные фразы — в одном месте.',
                    uk: 'Категорії слів, уроки й конкретні фрази — в одному місці.',
                    es: 'Categorías, lecciones y frases en un solo lugar.',
                  })}
                </Text>

                <Text style={[styles.gateSubLabel, { color: isLightGate ? t.textMuted : 'rgba(200,190,175,0.65)' }]}>
                  {triLang(lang, { ru: 'С PREMIUM ТЫ ПОЛУЧИШЬ', uk: 'З PREMIUM ТИ ОТРИМАЄШ', es: 'CON PREMIUM DESBLOQUEAS' })}
                </Text>

                <View style={{ gap: 12 }}>
                  {GATE_BENEFITS.map((row, i) => (
                    <View key={i} style={styles.gateBenefit}>
                      <View style={[styles.gateBenefitIcon, { backgroundColor: isLightGate ? GATE_LUX.iconRing : 'rgba(201,162,39,0.1)' }]}>
                        <Ionicons name={row.icon} size={19} color={isLightGate ? '#B8860B' : GATE_LUX.gold} />
                      </View>
                      <Text style={[styles.gateBenefitText, { color: isLightGate ? t.textPrimary : '#ebe6dc', fontSize: f.body }]}>
                        {triLang(lang, { ru: row.ru, uk: row.uk, es: row.es })}
                      </Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => { hapticTap(); router.push({ pathname: '/premium_modal', params: { context: 'patterns' } } as any); }}
                  activeOpacity={0.88}
                  style={styles.gateBtn}
                >
                  <LinearGradient
                    colors={['#6b5420', '#9a7b32', '#c9a227', '#9a7b32', '#6b5420']}
                    locations={[0, 0.25, 0.5, 0.75, 1]}
                    start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                    style={styles.gateBtnInner}
                  >
                    <Text style={[styles.gateBtnText, { fontSize: f.body }]}>
                      {triLang(lang, { ru: 'Открыть полный отчёт', uk: 'Відкрити повний звіт', es: 'Desbloquear informe completo' })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ContentWrap>
          </ScrollView>

        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={t.accent} />
          </View>

        ) : !data || data.totalMistakes === 0 ? (
          <View style={styles.center}>
            <View style={[styles.emptyIconBox, { backgroundColor: t.accent + '18' }]}>
              <Ionicons name="bar-chart-outline" size={40} color={t.accent} />
            </View>
            <Text style={[styles.emptyText, { color: t.textSecond, fontSize: f.body }]}>{emptyText}</Text>
          </View>

        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <ContentWrap>

              {/* ── Сводка ── */}
              <View style={[styles.summaryRow, { borderColor: t.border }]}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: t.textPrimary, fontSize: f.h1 }]}>
                    {data.totalMistakes}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: t.textMuted, fontSize: f.caption }]}>
                    {triLang(lang, { ru: 'ошибок', uk: 'помилок', es: 'errores' })}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: t.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: t.textPrimary, fontSize: f.h1 }]}>
                    {data.windowDays}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: t.textMuted, fontSize: f.caption }]}>
                    {triLang(lang, { ru: 'дней', uk: 'днів', es: 'días' })}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: t.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: t.textPrimary, fontSize: f.h1 }]}>
                    {data.categoryStats.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: t.textMuted, fontSize: f.caption }]}>
                    {triLang(lang, { ru: 'категорий', uk: 'категорій', es: 'categorías' })}
                  </Text>
                </View>
              </View>

              {/* ── Инсайты ── */}
              {data.insights.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: t.textMuted, fontSize: f.label }]}>
                    {triLang(lang, { ru: 'ВЫВОДЫ', uk: 'ВИСНОВКИ', es: 'CONCLUSIONES' })}
                  </Text>
                  <View style={[styles.insightBlock, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                    {data.insights.map((ins, i) => (
                      <InsightRow key={i} insight={ins} />
                    ))}
                  </View>
                </View>
              )}

              {/* ── CTA тренировка ── */}
              <TouchableOpacity
                onPress={() => {
                  if (!isPremium) { hapticTap(); router.push({ pathname: '/premium_modal', params: { context: 'trainer' } } as any); return; }
                  hapticSuccess();
                  router.push({ pathname: '/review', params: { trainerMode: 'mistakes' } } as any);
                }}
                activeOpacity={0.82}
                style={styles.trainBtn}
              >
                <LinearGradient
                  colors={[t.accent, t.accent + 'cc']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.trainBtnGrad}
                >
                  <Ionicons name="flash-outline" size={18} color="#fff" />
                  <Text style={[styles.trainBtnText, { fontSize: f.body }]}>
                    {triLang(lang, { ru: 'Тренировать слабые места', uk: 'Тренувати слабкі місця', es: 'Entrenar puntos débiles' })}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
                </LinearGradient>
              </TouchableOpacity>

              {/* ── Вкладки ── */}
              <View style={[styles.tabs, { backgroundColor: t.bgSurface }]}>
                {tabs.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => { hapticTap(); setTab(key); }}
                    style={[styles.tabItem, tab === key && { backgroundColor: t.bgCard }]}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      styles.tabText,
                      { fontSize: f.sub },
                      tab === key
                        ? { color: t.textPrimary, fontWeight: '700' }
                        : { color: t.textMuted, fontWeight: '500' },
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Контент вкладок ── */}
              {tab === 'categories' && (
                <View style={styles.list}>
                  {data.categoryStats.length === 0 ? (
                    <Text style={[styles.emptyTabText, { color: t.textMuted, fontSize: f.body }]}>
                      {triLang(lang, { ru: 'Нет данных по категориям', uk: 'Немає даних', es: 'Sin datos' })}
                    </Text>
                  ) : (
                    data.categoryStats.map((stat) => (
                      <CategoryRow key={stat.category} stat={stat} router={router} />
                    ))
                  )}
                </View>
              )}

              {tab === 'lessons' && (
                <View style={styles.list}>
                  {data.lessonStats.slice(0, 10).map((stat) => (
                    <LessonRow key={stat.lessonId} stat={stat} />
                  ))}
                </View>
              )}

              {tab === 'phrases' && (
                <View style={styles.list}>
                  {data.topMistakePhrases.map(({ phrase, lessonId, count }, i) => (
                    <View key={i} style={[styles.phraseRow, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                      <View style={[styles.phraseBadge, { backgroundColor: t.bgSurface }]}>
                        <Text style={[styles.phraseBadgeText, { color: t.textPrimary, fontSize: f.label }]}>×{count}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.phraseText, { color: t.textPrimary, fontSize: f.body }]}>{phrase}</Text>
                        <Text style={[styles.phraseLesson, { color: t.textMuted, fontSize: f.caption }]}>
                          {triLang(lang, { ru: 'Урок', uk: 'Урок', es: 'Lección' })} {lessonId}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

            </ContentWrap>
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}

// ── Стили ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '700', letterSpacing: -0.3 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', lineHeight: 24, maxWidth: 280 },

  // ── Gate ──
  gateScroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 },
  gateCard: {
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
    gap: 18,
  },
  gateHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  gateIconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  gateIconInner: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  gateLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2.4, marginBottom: 6 },
  gateTitle: { fontWeight: '800', lineHeight: 26 },
  gateProse: { lineHeight: 24, letterSpacing: 0.1 },
  gateSubLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  gateBenefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gateBenefitIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  gateBenefitText: { flex: 1, lineHeight: 22, fontWeight: '500' },
  gateBtn: { borderRadius: 13, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(212,175,88,0.3)' },
  gateBtnInner: { paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center' },
  gateBtnText: { color: '#140f08', fontWeight: '800', letterSpacing: 0.3 },

  // ── Content: боковые отступы здесь — ContentWrap задаёт только maxWidth по центру ──
  scrollContent: { paddingTop: 12, paddingBottom: 48, paddingHorizontal: 16 },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginBottom: 24,
    paddingVertical: 20,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  summaryItem: { alignItems: 'center', gap: 3 },
  summaryNum: { fontWeight: '700', letterSpacing: -0.5 },
  summaryLabel: { fontWeight: '500', letterSpacing: 0.3, textTransform: 'uppercase' },
  summaryDivider: { width: 0.5, height: 32, opacity: 0.5 },

  section: { marginBottom: 16 },
  sectionLabel: { fontWeight: '700', letterSpacing: 1.1, marginBottom: 8 },

  // инсайты — единый блок без разноцветных бордеров
  insightBlock: {
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  insightText: { flex: 1, lineHeight: 22, fontWeight: '500' },

  // CTA кнопка
  trainBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  trainBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  trainBtnText: { color: '#fff', fontWeight: '700', letterSpacing: 0.2, flex: 1 },

  // Вкладки — pills style
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    gap: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: { letterSpacing: 0.1 },

  list: { gap: 8 },

  // Строка категории — горизонтальный лейаут с большим числом
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 0.5,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  catMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    width: 52,
    flexShrink: 0,
    justifyContent: 'flex-end',
  },
  catPctBig: { fontWeight: '700', letterSpacing: -0.5 },
  catPctSign: { marginLeft: 1, fontWeight: '500' },
  catBody: { flex: 1, gap: 5 },
  catLabel: { fontWeight: '600', letterSpacing: 0.1 },
  catWords: { fontWeight: '400', opacity: 0.7 },

  coachCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: 0.5,
  },
  coachCtaText: { flex: 1, fontWeight: '600', letterSpacing: 0.1 },

  progressBg: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.15)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  lessonMeta: { flexDirection: 'row', alignItems: 'center' },
  lessonNum: { fontWeight: '600', letterSpacing: 0.2, textTransform: 'uppercase' },

  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 13,
    gap: 12,
  },
  phraseBadge: {
    width: 38, height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  phraseBadgeText: { fontWeight: '800' },
  phraseText: { fontWeight: '600', lineHeight: 22 },
  phraseLesson: { marginTop: 2, opacity: 0.6 },

  emptyTabText: { textAlign: 'center', paddingVertical: 24 },
});
