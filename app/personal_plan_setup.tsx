import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import TapScale from '../components/TapScale';
import BouncyScrollView from '../components/BouncyScrollView';
import TopFadeMask from '../components/TopFadeMask';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import PlusBadge from '../components/PlusBadge';
import { hapticTap } from '../hooks/use-haptics';
import { getPlanById, type PersonalPlanId, type PlanMinutesChoice } from './personal_plan_catalog';
import { activatePersonalPlan, readPersonalPlanState } from './personal_plan_state';
import { getPersonalPlanArt } from './personal_plan_art';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { queuePendingPersonalPlanActivation, readPendingPersonalPlanActivation } from './personal_plan_activation';
import { usePremium } from '../components/PremiumContext';
import { shouldGateFeature } from './feature_gates';
import {
  personalPlanSetupGoals,
  personalPlanSetupLevels,
  recommendPersonalPlan,
  type PersonalPlanSetupChoice,
  type PersonalPlanSetupGoal,
  type PersonalPlanSetupLevel,
} from './personal_plan_recommendation';
import { triLang, type Lang } from '../constants/i18n';
import { useLang } from '../components/LangContext';

type Step = 'goal' | 'level' | 'minutes' | 'result' | 'all';

/**
 * Премиум-гейт запуска персонального плана. Раньше жил в удалённом
 * app/compass/compass_access.ts (папка «Compass» была лишь местом хранения,
 * само правило не зависело от ассистента Compass и всегда действовало —
 * это починка дыры монетизации: план — Premium-фича, без доступа должен
 * вести на пейвол, а не активироваться бесплатно). Логика 1-в-1 сохранена
 * здесь после удаления ассистента: делегируем в тот же shouldGateFeature.
 */
function canActivatePlan(input: { hasPremiumAccess: boolean }): boolean {
  return !shouldGateFeature('personal_plan', input.hasPremiumAccess);
}

const PLAN_IDS: PersonalPlanId[] = ['voyazh', 'mitap', 'gavan', 'impuls', 'echo'];
const TOTAL_STEPS = 4;
const PERSONAL_PLAN_SETUP_EXIT_FALLBACK = '/lessons_list';

function stepIndex(step: Step): number {
  if (step === 'goal') return 1;
  if (step === 'level') return 2;
  if (step === 'minutes') return 3;
  return 4;
}

type PersonalPlanSetupMinuteChoice = {
  id: PlanMinutesChoice;
  title: string;
  subtitle: string;
  icon: PersonalPlanSetupChoice['icon'];
  emoji: string;
};

function personalPlanSetupMinutes(lang: Lang): PersonalPlanSetupMinuteChoice[] {
  return [
    {
      id: 5,
      title: triLang(lang, { ru: '5 минут в день', uk: '5 хвилин на день', es: '5 minutos al día', 'pt-BR': '5 minutos por dia', vi: '5 phút mỗi ngày', id: '5 menit sehari', tr: 'Günde 5 dakika', pl: '5 minut dziennie' }),
      subtitle: triLang(lang, { ru: '2–4 задания. Лёгкий старт, без давления. Хорошо, если часто пропускаешь.', uk: '2–4 завдання. Легкий старт, без тиску. Добре, якщо часто пропускаєш.', es: '2–4 tareas. Inicio suave, sin presión. Ideal si sueles saltarte días.', 'pt-BR': '2–4 tarefas. Início leve, sem pressão. Ideal se você costuma pular dias.', vi: '2–4 nhiệm vụ. Khởi đầu nhẹ nhàng, không áp lực. Tốt nếu bạn hay bỏ lỡ.', id: '2–4 tugas. Awal yang ringan, tanpa tekanan. Cocok jika sering terlewat.', tr: '2–4 görev. Baskısız, hafif bir başlangıç. Sık atlıyorsan iyi bir seçim.', pl: '2–4 zadania. Lekki start, bez presji. Dobre, jeśli często pomijasz dni.' }),
      icon: 'flash-outline',
      emoji: '⚡',
    },
    {
      id: 10,
      title: triLang(lang, { ru: '10 минут в день', uk: '10 хвилин на день', es: '10 minutos al día', 'pt-BR': '10 minutos por dia', vi: '10 phút mỗi ngày', id: '10 menit sehari', tr: 'Günde 10 dakika', pl: '10 minut dziennie' }),
      subtitle: triLang(lang, { ru: '3–5 заданий. Баланс между прогрессом и нагрузкой. Хороший выбор на старте.', uk: '3–5 завдань. Баланс між прогресом і навантаженням. Гарний вибір на старті.', es: '3–5 tareas. Equilibrio entre progreso y esfuerzo. Buena opción para empezar.', 'pt-BR': '3–5 tarefas. Equilíbrio entre progresso e esforço. Boa opção para começar.', vi: '3–5 nhiệm vụ. Cân bằng giữa tiến độ và khối lượng. Lựa chọn tốt để bắt đầu.', id: '3–5 tugas. Keseimbangan progres dan beban. Pilihan bagus untuk memulai.', tr: '3–5 görev. İlerleme ve yük arasında denge. Başlamak için iyi bir seçim.', pl: '3–5 zadań. Równowaga między postępem a obciążeniem. Dobry wybór na start.' }),
      icon: 'book-outline',
      emoji: '📖',
    },
    {
      id: 15,
      title: triLang(lang, { ru: '15 минут в день', uk: '15 хвилин на день', es: '15 minutos al día', 'pt-BR': '15 minutos por dia', vi: '15 phút mỗi ngày', id: '15 menit sehari', tr: 'Günde 15 dakika', pl: '15 minut dziennie' }),
      subtitle: triLang(lang, { ru: '4–5 заданий. Плотная ежедневная тренировка с ощутимым прогрессом.', uk: '4–5 завдань. Щільне щоденне тренування з відчутним прогресом.', es: '4–5 tareas. Entrenamiento diario intenso con progreso notable.', 'pt-BR': '4–5 tarefas. Treino diário intenso com progresso notável.', vi: '4–5 nhiệm vụ. Luyện tập hàng ngày dày dặn với tiến bộ rõ rệt.', id: '4–5 tugas. Latihan harian yang padat dengan progres nyata.', tr: '4–5 görev. Belirgin ilerleme sağlayan yoğun günlük antrenman.', pl: '4–5 zadań. Intensywny codzienny trening z wyraźnym postępem.' }),
      icon: 'mic-outline',
      emoji: '🎯',
    },
    {
      id: 20,
      title: triLang(lang, { ru: '20 минут в день', uk: '20 хвилин на день', es: '20 minutos al día', 'pt-BR': '20 minutos por dia', vi: '20 phút mỗi ngày', id: '20 menit sehari', tr: 'Günde 20 dakika', pl: '20 minut dziennie' }),
      subtitle: triLang(lang, { ru: '5–6 заданий. Полный дневной блок для тех, кто хочет расти быстро.', uk: '5–6 завдань. Повний денний блок для тих, хто хоче зростати швидко.', es: '5–6 tareas. Bloque diario completo para quienes quieren avanzar rápido.', 'pt-BR': '5–6 tarefas. Bloco diário completo para quem quer avançar rápido.', vi: '5–6 nhiệm vụ. Khối luyện tập trọn ngày cho ai muốn tiến bộ nhanh.', id: '5–6 tugas. Blok harian penuh untuk yang ingin berkembang cepat.', tr: '5–6 görev. Hızlı ilerlemek isteyenler için tam günlük blok.', pl: '5–6 zadań. Pełny dzienny blok dla tych, którzy chcą szybko rosnąć.' }),
      icon: 'map-outline',
      emoji: '🚀',
    },
  ];
}

function planReason(planId: PersonalPlanId, lang: Lang): string {
  switch (planId) {
    case 'voyazh': return triLang(lang, { ru: 'Каждый день — живой диалог поездки: услышал, понял, ответил вслух.', uk: 'Кожен день — живий діалог подорожі: почув, зрозумів, відповів уголос.', es: 'Cada día, un diálogo real de viaje: escuchas, entiendes, respondes en voz alta.', 'pt-BR': 'Todo dia, um diálogo real de viagem: você ouve, entende, responde em voz alta.', vi: 'Mỗi ngày — một đoạn hội thoại du lịch thật: nghe, hiểu, trả lời thành tiếng.', id: 'Setiap hari — dialog perjalanan nyata: mendengar, memahami, menjawab dengan suara.', tr: 'Her gün gerçek bir seyahat diyaloğu: duyarsın, anlarsın, sesli cevap verirsin.', pl: 'Każdego dnia — żywy dialog podróży: usłyszałeś, zrozumiałeś, odpowiedziałeś na głos.' });
    case 'mitap': return triLang(lang, { ru: 'Спокойный микс для себя: слова, слух и речь — понемногу каждый день.', uk: 'Спокійний мікс для себе: слова, слух і мова — потроху щодня.', es: 'Una mezcla tranquila para ti: palabras, oído y habla, poco a poco cada día.', 'pt-BR': 'Uma mistura tranquila para você: palavras, ouvido e fala, aos poucos todo dia.', vi: 'Sự kết hợp thư thái cho riêng bạn: từ vựng, nghe và nói — từng chút mỗi ngày.', id: 'Campuran santai untukmu: kata, pendengaran, dan bicara — sedikit demi sedikit setiap hari.', tr: 'Kendin için sakin bir karışım: kelimeler, dinleme ve konuşma — her gün azar azar.', pl: 'Spokojny mix dla siebie: słowa, słuch i mowa — po trochu każdego dnia.' });
    case 'gavan': return triLang(lang, { ru: 'Нужные слова на каждый день — и каждое сразу звучит вслух.', uk: 'Потрібні слова на кожен день — і кожне одразу звучить уголос.', es: 'Las palabras que necesitas cada día, y cada una suena en voz alta al instante.', 'pt-BR': 'As palavras que você precisa todo dia, e cada uma soa em voz alta na hora.', vi: 'Những từ cần thiết mỗi ngày — và mỗi từ được nói to ngay lập tức.', id: 'Kata-kata yang dibutuhkan setiap hari — dan langsung diucapkan.', tr: 'Her gün için gerekli kelimeler — ve her biri hemen sesli söylenir.', pl: 'Potrzebne słowa na każdy dzień — i każde od razu wypowiadane na głos.' });
    case 'impuls': return triLang(lang, { ru: 'Понимаешь, но зависаешь перед ответом? Здесь тренируется речь вслух.', uk: 'Розумієш, але зависаєш перед відповіддю? Тут тренується мова вголос.', es: '¿Entiendes pero te bloqueas al responder? Aquí se entrena el habla en voz alta.', 'pt-BR': 'Entende mas trava na hora de responder? Aqui se treina a fala em voz alta.', vi: 'Hiểu nhưng lại khựng lại trước khi trả lời? Ở đây luyện nói thành tiếng.', id: 'Mengerti tapi macet sebelum menjawab? Di sini melatih bicara dengan suara.', tr: 'Anlıyorsun ama cevap vermeden önce takılıyor musun? Burada sesli konuşma antrenmanı yapılır.', pl: 'Rozumiesz, ale zawieszasz się przed odpowiedzią? Tu trenuje się mowę na głos.' });
    case 'echo': return triLang(lang, { ru: 'Понимать живую речь с первого раза — и отвечать без долгой паузы.', uk: 'Розуміти живу мову з першого разу — і відповідати без довгої паузи.', es: 'Entender el habla real a la primera y responder sin largas pausas.', 'pt-BR': 'Entender a fala real de primeira e responder sem pausas longas.', vi: 'Hiểu lời nói thật ngay từ lần đầu — và trả lời không cần ngừng lâu.', id: 'Memahami percakapan nyata sejak awal — dan menjawab tanpa jeda lama.', tr: 'Gerçek konuşmayı ilk seferde anlamak — ve uzun duraklamadan cevap vermek.', pl: 'Rozumieć żywą mowę za pierwszym razem — i odpowiadać bez długiej pauzy.' });
    default: return triLang(lang, { ru: 'Подходит под выбранный старт и ближайшую цель.', uk: 'Підходить під обраний старт і найближчу ціль.', es: 'Se ajusta al punto de partida elegido y tu próximo objetivo.', 'pt-BR': 'Se ajusta ao ponto de partida escolhido e ao seu próximo objetivo.', vi: 'Phù hợp với điểm khởi đầu đã chọn và mục tiêu gần nhất.', id: 'Sesuai dengan titik awal yang dipilih dan tujuan terdekat.', tr: 'Seçilen başlangıca ve en yakın hedefe uygundur.', pl: 'Pasuje do wybranego startu i najbliższego celu.' });
  }
}

function planTagline(planId: PersonalPlanId, lang: Lang): string {
  switch (planId) {
    case 'voyazh': return triLang(lang, { ru: '🗺️ Путешествия и дорога', uk: '🗺️ Подорожі та дорога', es: '🗺️ Viajes y camino', 'pt-BR': '🗺️ Viagens e estrada', vi: '🗺️ Du lịch và trên đường', id: '🗺️ Perjalanan dan jalan', tr: '🗺️ Seyahat ve yol', pl: '🗺️ Podróże i droga' });
    case 'mitap': return triLang(lang, { ru: '🧠 Язык для ума', uk: '🧠 Мова для розуму', es: '🧠 Idioma para la mente', 'pt-BR': '🧠 Idioma para a mente', vi: '🧠 Ngôn ngữ cho trí óc', id: '🧠 Bahasa untuk pikiran', tr: '🧠 Zihin için dil', pl: '🧠 Język dla umysłu' });
    case 'gavan': return triLang(lang, { ru: '📦 Запас нужных слов', uk: '📦 Запас потрібних слів', es: '📦 Vocabulario esencial', 'pt-BR': '📦 Vocabulário essencial', vi: '📦 Vốn từ cần thiết', id: '📦 Perbekalan kosakata', tr: '📦 Gerekli kelime dağarcığı', pl: '📦 Zapas potrzebnych słów' });
    case 'impuls': return triLang(lang, { ru: '💬 Живое общение', uk: '💬 Живе спілкування', es: '💬 Comunicación real', 'pt-BR': '💬 Comunicação real', vi: '💬 Giao tiếp thực tế', id: '💬 Komunikasi nyata', tr: '💬 Canlı iletişim', pl: '💬 Żywa komunikacja' });
    case 'echo': return triLang(lang, { ru: '🎬 Кино и сериалы', uk: '🎬 Кіно та серіали', es: '🎬 Cine y series', 'pt-BR': '🎬 Cinema e séries', vi: '🎬 Phim và series', id: '🎬 Film dan serial', tr: '🎬 Film ve diziler', pl: '🎬 Filmy i seriale' });
    default: return triLang(lang, { ru: '📚 Общее развитие', uk: '📚 Загальний розвиток', es: '📚 Desarrollo general', 'pt-BR': '📚 Desenvolvimento geral', vi: '📚 Phát triển chung', id: '📚 Pengembangan umum', tr: '📚 Genel gelişim', pl: '📚 Ogólny rozwój' });
  }
}

// ─── Step progress bar ─────────────────────────────────────────────────────
function StepProgress({ current, total, accent, trackBg }: {
  current: number;
  total: number;
  accent: string;
  trackBg: string;
}) {
  const progress = useRef(new Animated.Value(current / total)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: current / total,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [current, total, progress]);

  return (
    <View style={[progressStyles.track, { backgroundColor: trackBg }]}>
      <Animated.View
        style={[
          progressStyles.fill,
          {
            backgroundColor: accent,
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

// ─── Choice card ───────────────────────────────────────────────────────────
function ChoiceCard<T extends string | number>({
  item,
  selected,
  accent,
  onAccent,
  cardBg,
  softBg,
  border,
  borderHighlight,
  text,
  muted,
  onPress,
}: {
  item: { id: T; title: string; subtitle: string; icon: PersonalPlanSetupChoice['icon'] };
  selected: boolean;
  accent: string;
  onAccent: string;
  cardBg: string;
  softBg: string;
  border: string;
  borderHighlight: string;
  text: string;
  muted: string;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[
          styles.choice,
          { backgroundColor: selected ? accent + '14' : cardBg, borderColor: selected ? accent : border },
        ]}
      >
        <View style={[styles.choiceIcon, { backgroundColor: selected ? accent : softBg, borderColor: selected ? accent : borderHighlight }]}>
          <Ionicons name={item.icon} size={22} color={selected ? onAccent : accent} />
        </View>
        <View style={styles.choiceCopy}>
          <Text style={[styles.choiceTitle, { color: text }]}>{item.title}</Text>
          <Text style={[styles.choiceSub, { color: muted }]}>{item.subtitle}</Text>
        </View>
        {selected ? (
          <View style={[styles.checkDot, { backgroundColor: accent }]}>
            <Ionicons name="checkmark" size={14} color={onAccent} />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={muted} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Plan card (for "all plans" view) ─────────────────────────────────────
function PlanCard({
  planId,
  recommended,
  locked,
  themeMode,
  accent,
  softBg,
  cardBg,
  border,
  borderHighlight,
  text,
  muted,
  onPress,
  lang,
}: {
  planId: PersonalPlanId;
  recommended: boolean;
  locked: boolean;
  themeMode: string;
  accent: string;
  softBg: string;
  lang: Lang;
  cardBg: string;
  border: string;
  borderHighlight: string;
  text: string;
  muted: string;
  onPress: () => void;
}) {
  const plan = getPlanById(planId);
  const art = getPersonalPlanArt(planId);

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.planCard, { backgroundColor: recommended ? accent + '10' : cardBg, borderColor: recommended ? accent : border }]}
    >
      <View style={[styles.planCardIcon, { backgroundColor: softBg, borderColor: borderHighlight }]}>
        <Ionicons name={art.heroIcon} size={24} color={accent} />
      </View>
      <View style={styles.planCardCopy}>
        <Text style={[styles.planCardName, { color: text }]}>{plan.name}</Text>
        <Text style={[styles.planCardTagline, { color: accent }]}>{planTagline(planId, lang)}</Text>
        <Text style={[styles.planCardSub, { color: muted }]}>{plan.shortFocus}</Text>
        <Text style={[styles.planCardMeta, { color: muted }]}>{triLang(lang, { ru: `${plan.horizonWeeks} нед · ${plan.recommendedLevel}`, uk: `${plan.horizonWeeks} тиж · ${plan.recommendedLevel}`, es: `${plan.horizonWeeks} sem · ${plan.recommendedLevel}`, 'pt-BR': `${plan.horizonWeeks} sem · ${plan.recommendedLevel}`, vi: `${plan.horizonWeeks} tuần · ${plan.recommendedLevel}`, id: `${plan.horizonWeeks} mgg · ${plan.recommendedLevel}`, tr: `${plan.horizonWeeks} hf · ${plan.recommendedLevel}`, pl: `${plan.horizonWeeks} tyg · ${plan.recommendedLevel}` })}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        {locked ? <PlusBadge themeMode={themeMode} size="xs" /> : null}
        {recommended ? (
          <View style={[styles.recommendedBadge, { backgroundColor: accent }]}>
            <Text style={[styles.recommendedText, { color: '#fff' }]}>✓</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={muted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────
export default function PersonalPlanSetupScreen() {
  const { lang } = useLang();
  const router = useRouter();
  const params = useLocalSearchParams<{ directToPlans?: string }>();
  // Смена плана с экрана активного плана: НЕ показываем опрос (goal/level/minutes),
  // открываем сразу список планов на выбор (юзер уже всё это проходил).
  const directToPlans = (Array.isArray(params.directToPlans) ? params.directToPlans[0] : params.directToPlans) === '1';
  const exitFallback = directToPlans ? '/personal_plan' : PERSONAL_PLAN_SETUP_EXIT_FALLBACK;
  const insets = useStableSafeAreaInsets();
  const { hasPremiumAccess } = usePremium();
  const { theme: t, themeMode } = useTheme();
  // Верхний фейд-маск под safe-area при скролле — как на главной и в личном плане.
  const fadeScrollY = useRef(new Animated.Value(0)).current;
  const handleSetupScroll = (e: any) => {
    fadeScrollY.setValue(e?.nativeEvent?.contentOffset?.y ?? 0);
  };
  const [step, setStep] = useState<Step>(directToPlans ? 'all' : 'goal');
  // Античание: при обычном входе (не directToPlans) экран не рисует шаг 'goal',
  // пока не резолвится чтение сохранённых ответов онбординга — иначе юзер с уже
  // отвеченным опросом на долю секунды увидит вопрос 1, прежде чем его перекинет
  // на 'result'. directToPlans читает своё (минуты) отдельным эффектом ниже и
  // сразу готов — тут не ждём.
  const [answersReady, setAnswersReady] = useState(directToPlans);

  // При смене плана сохраняем выбранную ранее дневную нагрузку (минуты), чтобы
  // новый план шёл с тем же темпом, а не сбрасывался на дефолт.
  useEffect(() => {
    if (!directToPlans) return;
    let alive = true;
    void readPersonalPlanState().then((state) => {
      if (alive && state?.minutesPerDay) setSelectedMinutes(state.minutesPerDay);
    }).catch(() => {});
    return () => { alive = false; };
  }, [directToPlans]);
  const [goal, setGoal] = useState<PersonalPlanSetupGoal>('words');
  const [level, setLevel] = useState<PersonalPlanSetupLevel>('a1');
  const [selectedMinutes, setSelectedMinutes] = useState<PlanMinutesChoice>(15);
  const [goalChosen, setGoalChosen] = useState(false);
  const [levelChosen, setLevelChosen] = useState(false);
  const [minutesChosen, setMinutesChosen] = useState(false);

  // Префилл ответами онбординга: онбординг (components/CleanOnboarding.tsx) уже
  // спросил тему/уровень/минуты и положил их в AsyncStorage + очередь pending-
  // активации (app/personal_plan_activation.ts). Юзер не должен отвечать заново —
  // если сохранены ВСЕ три ответа или есть pending-активация, сразу открываем
  // 'result' (там есть «назад» по шагам к 'minutes'→'level'→'goal', так что
  // передумать и поменять ответы всё ещё можно).
  useEffect(() => {
    if (directToPlans) return;
    let alive = true;
    (async () => {
      try {
        const [pending, stored] = await Promise.all([
          readPendingPersonalPlanActivation().catch(() => null),
          AsyncStorage.multiGet([
            'onboarding_plan_goal',
            'onboarding_plan_level',
            'onboarding_plan_minutes',
          ]).catch(() => []),
        ]);
        if (!alive) return;
        const map = new Map(stored);
        const savedGoal = map.get('onboarding_plan_goal');
        const savedLevel = map.get('onboarding_plan_level');
        const savedMinutesNum = Number(map.get('onboarding_plan_minutes'));

        // зачем: id-шники ('series', 'a0'...) не зависят от языка — берём
        // любую локаль, это чисто структурная проверка присутствия id.
        const hasGoal = personalPlanSetupGoals('ru').some((item) => item.id === savedGoal);
        const hasLevel = personalPlanSetupLevels('ru').some((item) => item.id === savedLevel);
        const hasMinutes = savedMinutesNum === 5 || savedMinutesNum === 10 || savedMinutesNum === 15 || savedMinutesNum === 20;

        if (hasGoal) {
          setGoal(savedGoal as PersonalPlanSetupGoal);
          setGoalChosen(true);
        }
        if (hasLevel) {
          setLevel(savedLevel as PersonalPlanSetupLevel);
          setLevelChosen(true);
        }
        if (hasMinutes) {
          setSelectedMinutes(savedMinutesNum as PlanMinutesChoice);
          setMinutesChosen(true);
        }
        // pending хранит planId (не goal) — используем его только как сигнал «есть
        // готовая очередь активации», а минуты из pending важнее дефолта, если
        // отдельно сохранённого ответа onboarding_plan_minutes почему-то нет.
        if (pending != null && !hasMinutes) {
          setSelectedMinutes(pending.minutesPerDay);
          setMinutesChosen(true);
        }

        if ((hasGoal && hasLevel && hasMinutes) || pending != null) {
          setStep('result');
        }
      } finally {
        if (alive) setAnswersReady(true);
      }
    })();
    return () => { alive = false; };
  }, [directToPlans]);
  const [selectedPlanId, setSelectedPlanId] = useState<PersonalPlanId | null>(null);

  const slideFade = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(0)).current;

  const recommendedPlanId = useMemo(() => recommendPersonalPlan({ goal, level }), [goal, level]);
  const visiblePlanId = selectedPlanId ?? recommendedPlanId;
  const visiblePlan = getPlanById(visiblePlanId);
  const planArt = getPersonalPlanArt(visiblePlanId);

  const accent = t.accent;
  const onAccent = t.correctText;
  const screenBg = t.bgPrimary;
  const cardBg = t.bgCard;
  const softBg = t.accentBg;
  const inactiveProgressBg = t.bgSurface;
  const border = t.border;
  const text = t.textPrimary;
  const muted = t.textMuted;

  const animateStep = (fn: () => void) => {
    Animated.parallel([
      Animated.timing(slideFade, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideX, { toValue: -30, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      fn();
      slideX.setValue(30);
      Animated.parallel([
        Animated.timing(slideFade, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideX, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    });
  };

  const activate = async (planId: PersonalPlanId) => {
    hapticTap();
    // Премиум-гейт (чинит дыру): план — Premium-фича. Без доступа ведём на пейвол,
    // а не активируем план бесплатно. Раньше прямой вход с главной активировал
    // план без оплаты — гейт был только в онбординге.
    if (!canActivatePlan({ hasPremiumAccess })) {
      await queuePendingPersonalPlanActivation({
        planId,
        minutesPerDay: selectedMinutes,
        startDayIndex: 1,
        source: 'unknown',
      });
      router.push({ pathname: '/premium_modal', params: { context: 'personal_plan' } } as any);
      return;
    }
    await activatePersonalPlan({
      planId,
      minutesPerDay: selectedMinutes,
      startDayIndex: 1,
    });
    // Пометка replace держит честный стек согласованным: без неё setup остаётся
    // в in-memory стеке navigation_back.ts, и «назад» из плана возвращает на опрос
    // (см. app/personal_plan.tsx:397-401 — тот же паттерн на обратном переходе).
    markNextNavigationAsReplace();
    router.replace('/personal_plan' as any);
  };

  // Премиум-метка показывается РАНЬШЕ — на финальной кнопке/карточке результата,
  // чтобы юзер видел замок до тапа, а не узнавал о пейволе только после нажатия.
  // Логику перехода на /premium_modal (в activate) это НЕ меняет.
  const planIsLocked = !canActivatePlan({ hasPremiumAccess });

  const renderQuestion = (
    title: string,
    subtitle: string,
    body: React.ReactNode,
  ) => (
    <Animated.View style={{ opacity: slideFade, transform: [{ translateX: slideX }] }}>
      <Text style={[styles.stepKicker, { color: accent }]}>{triLang(lang, { ru: `Шаг ${stepIndex(step)} из ${TOTAL_STEPS}`, uk: `Крок ${stepIndex(step)} з ${TOTAL_STEPS}`, es: `Paso ${stepIndex(step)} de ${TOTAL_STEPS}`, 'pt-BR': `Passo ${stepIndex(step)} de ${TOTAL_STEPS}`, vi: `Bước ${stepIndex(step)}/${TOTAL_STEPS}`, id: `Langkah ${stepIndex(step)} dari ${TOTAL_STEPS}`, tr: `Adım ${stepIndex(step)}/${TOTAL_STEPS}`, pl: `Krok ${stepIndex(step)} z ${TOTAL_STEPS}` })}</Text>
      <Text
        style={[styles.stepTitle, { color: text }]}
        numberOfLines={2}
      >
        {title}
      </Text>
      <Text style={[styles.stepSubtitle, { color: muted }]}>{subtitle}</Text>
      <View style={styles.stack}>{body}</View>
    </Animated.View>
  );

  const content = (() => {
    if (step === 'goal') {
      return renderQuestion(
        triLang(lang, { ru: 'Зачем тебе английский?', uk: 'Навіщо тобі англійська?', es: '¿Para qué necesitas el inglés?', 'pt-BR': 'Para que você precisa do inglês?', vi: 'Bạn học tiếng Anh để làm gì?', id: 'Untuk apa kamu belajar bahasa Inggris?', tr: 'İngilizceye neden ihtiyacın var?', pl: 'Po co potrzebujesz angielskiego?' }),
        triLang(lang, { ru: 'Это определяет ситуации и фразы, которые пригодятся первыми.', uk: 'Це визначає ситуації та фрази, які знадобляться першими.', es: 'Esto determina las situaciones y frases que necesitarás primero.', 'pt-BR': 'Isso determina as situações e frases que você vai precisar primeiro.', vi: 'Điều này quyết định tình huống và cụm từ bạn cần trước tiên.', id: 'Ini menentukan situasi dan frasa yang paling dulu dibutuhkan.', tr: 'Bu, önce ihtiyaç duyacağın durumları ve ifadeleri belirler.', pl: 'To określa sytuacje i zwroty, które przydadzą się jako pierwsze.' }),
        personalPlanSetupGoals(lang).map((item) => (
          <ChoiceCard
            key={item.id}
            item={item}
            selected={goalChosen && goal === item.id}
            accent={accent}
            onAccent={onAccent}
            cardBg={cardBg}
            softBg={softBg}
            border={border}
            borderHighlight={t.borderHighlight}
            text={text}
            muted={muted}
            onPress={() => {
              hapticTap();
              animateStep(() => {
                setGoal(item.id);
                setGoalChosen(true);
                setStep('level');
              });
            }}
          />
        )),
      );
    }

    if (step === 'level') {
      return renderQuestion(
        triLang(lang, { ru: 'С чего удобнее начать?', uk: 'З чого зручніше почати?', es: '¿Con qué es más cómodo empezar?', 'pt-BR': 'Com o que é mais confortável começar?', vi: 'Bạn thấy bắt đầu từ đâu thoải mái hơn?', id: 'Dari mana kamu merasa nyaman untuk mulai?', tr: 'Nereden başlamak daha rahat?', pl: 'Od czego wygodniej zacząć?' }),
        triLang(lang, { ru: 'Не идеальный уровень, а тот, с которого комфортно стартовать сегодня.', uk: 'Не ідеальний рівень, а той, з якого комфортно стартувати сьогодні.', es: 'No el nivel perfecto, sino el que te resulta cómodo hoy.', 'pt-BR': 'Não o nível perfeito, mas o que é confortável para começar hoje.', vi: 'Không phải trình độ hoàn hảo, mà là mức bạn thấy thoải mái để bắt đầu hôm nay.', id: 'Bukan level yang sempurna, tapi yang nyaman untuk memulai hari ini.', tr: 'Mükemmel bir seviye değil, bugün başlaman için rahat olan seviye.', pl: 'Nie idealny poziom, ale taki, od którego wygodnie zacząć dziś.' }),
        personalPlanSetupLevels(lang).map((item) => (
          <ChoiceCard
            key={item.id}
            item={item}
            selected={levelChosen && level === item.id}
            accent={accent}
            onAccent={onAccent}
            cardBg={cardBg}
            softBg={softBg}
            border={border}
            borderHighlight={t.borderHighlight}
            text={text}
            muted={muted}
            onPress={() => {
              hapticTap();
              animateStep(() => {
                setLevel(item.id);
                setLevelChosen(true);
                setSelectedPlanId(null);
                setStep('minutes');
              });
            }}
          />
        )),
      );
    }

    if (step === 'minutes') {
      return renderQuestion(
        triLang(lang, { ru: 'Сколько времени в день?', uk: 'Скільки часу на день?', es: '¿Cuánto tiempo al día?', 'pt-BR': 'Quanto tempo por dia?', vi: 'Bao nhiêu thời gian mỗi ngày?', id: 'Berapa lama sehari?', tr: 'Günde ne kadar zaman?', pl: 'Ile czasu dziennie?' }),
        triLang(lang, { ru: 'Это не меняет план — только сколько заданий открыть сразу.', uk: 'Це не змінює план — лише скільки завдань відкрити одразу.', es: 'Esto no cambia el plan, solo cuántas tareas abrir de una vez.', 'pt-BR': 'Isso não muda o plano, apenas quantas tarefas abrir de uma vez.', vi: 'Điều này không thay đổi kế hoạch — chỉ ảnh hưởng số nhiệm vụ mở cùng lúc.', id: 'Ini tidak mengubah rencana — hanya berapa tugas yang dibuka sekaligus.', tr: 'Bu planı değiştirmez — sadece kaç görevin birden açılacağını belirler.', pl: 'To nie zmienia planu — tylko liczbę zadań otwieranych naraz.' }),
        personalPlanSetupMinutes(lang).map((item) => (
          <ChoiceCard
            key={item.id}
            item={item}
            selected={minutesChosen && selectedMinutes === item.id}
            accent={accent}
            onAccent={onAccent}
            cardBg={cardBg}
            softBg={softBg}
            border={border}
            borderHighlight={t.borderHighlight}
            text={text}
            muted={muted}
            onPress={() => {
              hapticTap();
              animateStep(() => {
                setSelectedMinutes(item.id);
                setMinutesChosen(true);
                setStep('result');
              });
            }}
          />
        )),
      );
    }

    if (step === 'all') {
      return (
        <Animated.View style={{ opacity: slideFade, transform: [{ translateX: slideX }] }}>
          <Text style={[styles.stepKicker, { color: accent }]}>{triLang(lang, { ru: 'Все маршруты', uk: 'Усі маршрути', es: 'Todas las rutas', 'pt-BR': 'Todas as rotas', vi: 'Tất cả lộ trình', id: 'Semua rute', tr: 'Tüm rotalar', pl: 'Wszystkie ścieżki' })}</Text>
          <Text
            style={[styles.stepTitle, { color: text }]}
            numberOfLines={2}
          >
            {triLang(lang, { ru: 'Выбери свой план', uk: 'Обери свій план', es: 'Elige tu plan', 'pt-BR': 'Escolha seu plano', vi: 'Chọn kế hoạch của bạn', id: 'Pilih rencanamu', tr: 'Planını seç', pl: 'Wybierz swój plan' })}
          </Text>
          <Text style={[styles.stepSubtitle, { color: muted }]}>
            {directToPlans
              ? triLang(lang, { ru: 'Выбери план — он начнётся с первого дня.', uk: 'Обери план — він почнеться з першого дня.', es: 'Elige un plan: comenzará desde el primer día.', 'pt-BR': 'Escolha um plano: ele começará do primeiro dia.', vi: 'Chọn một kế hoạch — nó sẽ bắt đầu từ ngày đầu tiên.', id: 'Pilih rencana — akan dimulai dari hari pertama.', tr: 'Bir plan seç — ilk günden başlayacak.', pl: 'Wybierz plan — zacznie się od pierwszego dnia.' })
              : triLang(lang, {
                  ru: `Рекомендуется ${PLAN_IDS.indexOf(recommendedPlanId) + 1}-й вариант, но можно выбрать любой.`,
                  uk: `Рекомендується ${PLAN_IDS.indexOf(recommendedPlanId) + 1}-й варіант, але можна обрати будь-який.`,
                  es: `Se recomienda la opción ${PLAN_IDS.indexOf(recommendedPlanId) + 1}, pero puedes elegir cualquiera.`,
                  'pt-BR': `A opção ${PLAN_IDS.indexOf(recommendedPlanId) + 1} é recomendada, mas você pode escolher qualquer uma.`,
                  vi: `Gợi ý là lựa chọn thứ ${PLAN_IDS.indexOf(recommendedPlanId) + 1}, nhưng bạn có thể chọn bất kỳ.`,
                  id: `Opsi ke-${PLAN_IDS.indexOf(recommendedPlanId) + 1} direkomendasikan, tapi kamu bisa memilih yang mana pun.`,
                  tr: `${PLAN_IDS.indexOf(recommendedPlanId) + 1}. seçenek önerilir, ama istediğini seçebilirsin.`,
                  pl: `Zalecana jest opcja ${PLAN_IDS.indexOf(recommendedPlanId) + 1}, ale możesz wybrać dowolną.`,
              })}
          </Text>
          <View style={styles.stack}>
            {PLAN_IDS.map((planId) => (
              <PlanCard
                key={planId}
                planId={planId}
                recommended={!directToPlans && planId === recommendedPlanId}
                locked={planIsLocked}
                themeMode={themeMode}
                accent={accent}
                softBg={softBg}
                cardBg={cardBg}
                border={border}
                borderHighlight={t.borderHighlight}
                text={text}
                muted={muted}
                onPress={() => {
                  hapticTap();
                  setSelectedPlanId(planId);
                  // Смена плана: сразу активируем выбранный (минуты по умолчанию),
                  // без шага «минуты» — юзер хотел просто выбрать из списка.
                  if (directToPlans) {
                    void activate(planId);
                  } else {
                    setStep('minutes');
                  }
                }}
                lang={lang}
              />
            ))}
          </View>
        </Animated.View>
      );
    }

    // Result step
    return (
      <Animated.View style={{ opacity: slideFade, transform: [{ translateX: slideX }] }}>
        <Text style={[styles.stepKicker, { color: accent }]}>{triLang(lang, { ru: 'Для тебя подходит', uk: 'Тобі підходить', es: 'Te conviene', 'pt-BR': 'Combina com você', vi: 'Phù hợp với bạn', id: 'Cocok untukmu', tr: 'Sana uygun', pl: 'Pasuje do ciebie' })}</Text>
        <Text
          style={[styles.stepTitle, { color: text }]}
          numberOfLines={2}
        >
          {triLang(lang, { ru: 'Твой план', uk: 'Твій план', es: 'Tu plan', 'pt-BR': 'Seu plano', vi: 'Kế hoạch của bạn', id: 'Rencanamu', tr: 'Planın', pl: 'Twój plan' })}
        </Text>

        <LinearGradient
          colors={t.cardGradient}
          style={[styles.resultCard, { borderColor: border }]}
        >
          <View style={[styles.resultIconWrap, { backgroundColor: accent + '18', borderColor: accent + '33' }]}>
            <Ionicons name={planArt.heroIcon} size={52} color={accent} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            <View style={[styles.resultTagPill, { backgroundColor: accent + '14', borderColor: accent + '33' }]}>
              <Text style={[styles.resultTagText, { color: accent }]}>{planTagline(visiblePlanId, lang)}</Text>
            </View>
            {planIsLocked ? <PlusBadge themeMode={themeMode} size="xs" /> : null}
          </View>
          <Text
            style={[styles.resultName, { color: text }]}
            numberOfLines={2}
          >
            {visiblePlan.name}
          </Text>
          <Text style={[styles.resultReason, { color: muted }]}>{planReason(visiblePlanId, lang)}</Text>

          <View style={styles.resultFacts}>
            <View style={[styles.resultFact, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.resultFactValue, { color: accent }]}>{visiblePlan.horizonWeeks}</Text>
              <Text style={[styles.resultFactLabel, { color: muted }]}>{triLang(lang, { ru: 'недель', uk: 'тижнів', es: 'semanas', 'pt-BR': 'semanas', vi: 'tuần', id: 'minggu', tr: 'hafta', pl: 'tygodni' })}</Text>
            </View>
            <View style={[styles.resultFact, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.resultFactValue, { color: accent }]}>{visiblePlan.recommendedLevel}</Text>
              <Text style={[styles.resultFactLabel, { color: muted }]}>{triLang(lang, { ru: 'уровень', uk: 'рівень', es: 'nivel', 'pt-BR': 'nível', vi: 'trình độ', id: 'level', tr: 'seviye', pl: 'poziom' })}</Text>
            </View>
            <View style={[styles.resultFact, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.resultFactValue, { color: accent }]}>{selectedMinutes}</Text>
              <Text style={[styles.resultFactLabel, { color: muted }]}>{triLang(lang, { ru: 'мин/день', uk: 'хв/день', es: 'min/día', 'pt-BR': 'min/dia', vi: 'phút/ngày', id: 'mnt/hari', tr: 'dk/gün', pl: 'min/dzień' })}</Text>
            </View>
          </View>
        </LinearGradient>

        <TouchableOpacity
          testID="personal-plan-setup-choose-plan"
          activeOpacity={0.88}
          onPress={() => void activate(visiblePlanId)}
          style={[styles.primaryBtn, { backgroundColor: accent }]}
        >
          {planIsLocked ? (
            <Ionicons name="lock-closed" size={18} color={onAccent} />
          ) : null}
          <Text style={[styles.primaryBtnText, { color: onAccent }]}>{triLang(lang, { ru: 'Начать этот план', uk: 'Почати цей план', es: 'Empezar este plan', 'pt-BR': 'Começar este plano', vi: 'Bắt đầu kế hoạch này', id: 'Mulai rencana ini', tr: 'Bu planı başlat', pl: 'Rozpocznij ten plan' })}</Text>
          <Ionicons name="arrow-forward" size={20} color={onAccent} />
        </TouchableOpacity>

        <TouchableOpacity
          testID="personal-plan-setup-view-all"
          activeOpacity={0.82}
          onPress={() => {
            hapticTap();
            animateStep(() => setStep('all'));
          }}
          style={[styles.secondaryBtn, { borderColor: border, backgroundColor: cardBg }]}
        >
          <Text style={[styles.secondaryBtnText, { color: text }]}>{triLang(lang, { ru: 'Посмотреть все планы', uk: 'Переглянути всі плани', es: 'Ver todos los planes', 'pt-BR': 'Ver todos os planos', vi: 'Xem tất cả kế hoạch', id: 'Lihat semua rencana', tr: 'Tüm planları gör', pl: 'Zobacz wszystkie plany' })}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  })();

  // В режиме смены плана опрос пропущен → «назад» из списка уходит на экран плана,
  // а не на несуществующий шаг result.
  const canGoBack = step !== 'goal' && !directToPlans;
  const handleBack = () => {
    hapticTap();
    if (directToPlans) { safeRouterBack(router, exitFallback); return; }
    animateStep(() => {
      if (step === 'level') setStep('goal');
      else if (step === 'minutes') setStep('level');
      else if (step === 'result') setStep('minutes');
      else if (step === 'all') setStep('result');
      else safeRouterBack(router, exitFallback);
    });
  };

  // Античание: пока не резолвилось чтение сохранённых ответов онбординга, не
  // рисуем шаг 'goal' (или любой другой) — только фон, без контента и прогресс-бара.
  // Иначе на кадр мелькнёт вопрос 1, прежде чем эффект выше перекинет на 'result'.
  if (!answersReady) {
    return <View style={[styles.safe, { backgroundColor: screenBg }]} />;
  }

  return (
    <View style={[styles.safe, { backgroundColor: screenBg }]}>
      <LinearGradient colors={t.bgGradient} style={styles.safe}>
        {/* TopFadeMask — position:absolute от top:0 экрана, плавный фейд как на главной. */}
        <TopFadeMask scrollY={fadeScrollY} zIndex={2} />
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <TapScale
            onPress={canGoBack ? handleBack : () => safeRouterBack(router, exitFallback)}
            style={[styles.topBarBtn, { backgroundColor: t.bgCard, borderColor: border }]}
          >
            <Ionicons name="chevron-back" size={22} color={accent} />
          </TapScale>

          {/* В режиме смены плана опрос пропущен — прогресс-бар шагов не показываем. */}
          {directToPlans ? <View style={{ flex: 1 }} /> : (
            <>
              <StepProgress
                current={stepIndex(step)}
                total={TOTAL_STEPS}
                accent={accent}
                trackBg={inactiveProgressBg}
              />

              <View style={[styles.topBarStepPill, { backgroundColor: t.accentBg, borderColor: border }]}>
                <Text style={[styles.topBarStepText, { color: accent }]}>{stepIndex(step)}/{TOTAL_STEPS}</Text>
              </View>
            </>
          )}
        </View>

        <BouncyScrollView decelerationRate="normal" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={handleSetupScroll}>
          {content}
        </BouncyScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarBtn: {
    width: 44, height: 44, borderRadius: 14, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  topBarStepPill: {
    height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  topBarStepText: { fontSize: 13, fontWeight: '900' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  stepKicker: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  stepTitle: { fontSize: 36, lineHeight: 42, fontWeight: '900' },
  stepSubtitle: { marginTop: 10, fontSize: 16, lineHeight: 24, fontWeight: '700', marginBottom: 4 },
  stack: { marginTop: 22, gap: 10 },

  choice: {
    minHeight: 80, borderRadius: 18, borderWidth: 0,
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 13,
  },
  choiceIcon: {
    width: 50, height: 50, borderRadius: 15, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  choiceCopy: { flex: 1, minWidth: 0 },
  choiceTitle: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
  choiceSub: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  checkDot: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  planCard: {
    minHeight: 100, borderRadius: 18, borderWidth: 0,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13,
  },
  planCardIcon: {
    width: 50, height: 50, borderRadius: 15, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  planCardCopy: { flex: 1, minWidth: 0 },
  planCardName: { fontSize: 17, lineHeight: 21, fontWeight: '900' },
  planCardTagline: { marginTop: 2, fontSize: 12, lineHeight: 15, fontWeight: '900' },
  planCardSub: { marginTop: 3, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  planCardMeta: { marginTop: 4, fontSize: 11, lineHeight: 14, fontWeight: '800' },
  recommendedBadge: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  recommendedText: { fontSize: 14, fontWeight: '900' },

  resultCard: {
    marginTop: 20, borderRadius: 24, borderWidth: 0,
    padding: 22, alignItems: 'center', overflow: 'hidden',
  },
  resultIconWrap: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  resultTagPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 0, marginBottom: 12,
  },
  resultTagText: { fontSize: 13, fontWeight: '900' },
  resultName: { fontSize: 34, lineHeight: 40, fontWeight: '900', textAlign: 'center' },
  resultReason: { marginTop: 12, fontSize: 15, lineHeight: 23, fontWeight: '700', textAlign: 'center' },
  resultFacts: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  resultFact: {
    flex: 1, height: 72, borderRadius: 18, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  resultFactValue: { fontSize: 20, lineHeight: 24, fontWeight: '900' },
  resultFactLabel: { fontSize: 11, lineHeight: 14, fontWeight: '800' },

  primaryBtn: {
    minHeight: 60, marginTop: 20, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 10,
  },
  primaryBtnText: { fontSize: 18, fontWeight: '900' },
  secondaryBtn: {
    minHeight: 56, marginTop: 12, borderRadius: 18, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '900' },
});
