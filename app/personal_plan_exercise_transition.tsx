import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeRouterBack } from './navigation_back';
import { LinearGradient } from '../components/SafeLinearGradient';
import BounceView from '../components/BounceView';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { hapticSuccess } from '../hooks/use-haptics';

function firstParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? '' : v ?? '';
}

type LangCopy = { ru: string; uk: string; es: string } & Record<string, string>;

const EXERCISE_META: Record<string, { icon: string; color: string; what: LangCopy; why: LangCopy }> = {
  plan_phrase_build: {
    icon: 'construct-outline',
    color: '#4ECDC4',
    what: {
      ru: 'Составь фразы из слов',
      uk: 'Склади фрази зі слів',
      es: 'Forma frases con las palabras',
      'pt-BR': 'Monte frases com as palavras',
      vi: 'Ghép câu từ các từ',
      id: 'Susun frasa dari kata-kata',
      tr: 'Kelimelerden cümleler kur',
      pl: 'Ułóż frazy ze słów',
    },
    why: {
      ru: 'Сборка закрепляет порядок слов и словосочетания лучше, чем чтение.',
      uk: 'Складання закріплює порядок слів і словосполучення краще, ніж читання.',
      es: 'Armar frases fija el orden de las palabras mejor que solo leer.',
      'pt-BR': 'Montar fixa a ordem das palavras melhor do que apenas ler.',
      vi: 'Việc ghép câu giúp ghi nhớ trật tự từ tốt hơn so với chỉ đọc.',
      id: 'Menyusun memperkuat urutan kata lebih baik daripada membaca.',
      tr: 'Cümle kurmak, kelime sırasını okumaktan daha iyi pekiştirir.',
      pl: 'Układanie utrwala szyk wyrazów lepiej niż samo czytanie.',
    },
  },
  plan_missing_word: {
    icon: 'text-outline',
    color: '#FF9F43',
    what: {
      ru: 'Вставь правильное слово',
      uk: 'Встав правильне слово',
      es: 'Inserta la palabra correcta',
      'pt-BR': 'Insira a palavra certa',
      vi: 'Điền từ đúng',
      id: 'Isi kata yang benar',
      tr: 'Doğru kelimeyi yerleştir',
      pl: 'Wstaw właściwe słowo',
    },
    why: {
      ru: 'Точные пропуски тренируют выбор нужного слова в живой речи.',
      uk: 'Точні пропуски тренують вибір потрібного слова в живій мові.',
      es: 'Los huecos precisos entrenan elegir la palabra justa al hablar.',
      'pt-BR': 'As lacunas precisas treinam a escolha da palavra certa na fala.',
      vi: 'Các chỗ trống chính xác rèn luyện việc chọn đúng từ khi nói.',
      id: 'Rumpang yang tepat melatih pemilihan kata yang pas saat berbicara.',
      tr: 'Belirli boşluklar, konuşurken doğru kelimeyi seçmeyi geliştirir.',
      pl: 'Precyzyjne luki ćwiczą dobór właściwego słowa w mowie.',
    },
  },
  plan_choose_natural_phrase: {
    icon: 'sparkles-outline',
    color: '#A29BFE',
    what: {
      ru: 'Выбери живую фразу',
      uk: 'Вибери живу фразу',
      es: 'Elige la frase natural',
      'pt-BR': 'Escolha a frase natural',
      vi: 'Chọn câu tự nhiên',
      id: 'Pilih frasa yang alami',
      tr: 'Doğal cümleyi seç',
      pl: 'Wybierz naturalną frazę',
    },
    why: {
      ru: 'Учишься отличать корректное от звучащего как носитель.',
      uk: 'Вчишся відрізняти коректне від того, що звучить як у носія.',
      es: 'Aprendes a distinguir lo correcto de lo que suena como un nativo.',
      'pt-BR': 'Você aprende a diferenciar o correto do que soa como nativo.',
      vi: 'Bạn học cách phân biệt câu đúng với câu nghe tự nhiên như người bản xứ.',
      id: 'Kamu belajar membedakan yang benar dari yang terdengar seperti penutur asli.',
      tr: 'Doğru olanı, ana dili gibi kulağa hoş geleni ayırt etmeyi öğrenirsin.',
      pl: 'Uczysz się odróżniać poprawne od tego, co brzmi jak u rodzimego użytkownika.',
    },
  },
  plan_listen_choose: {
    icon: 'headset-outline',
    color: '#00CEC9',
    what: {
      ru: 'Слушай и выбирай смысл',
      uk: 'Слухай і вибирай зміст',
      es: 'Escucha y elige el significado',
      'pt-BR': 'Ouça e escolha o significado',
      vi: 'Nghe và chọn nghĩa',
      id: 'Dengarkan dan pilih maknanya',
      tr: 'Dinle ve anlamı seç',
      pl: 'Słuchaj i wybieraj znaczenie',
    },
    why: {
      ru: 'Тренирует распознавание речи на слух без опоры на текст.',
      uk: 'Тренує розпізнавання мови на слух без опори на текст.',
      es: 'Entrena reconocer el habla de oído sin apoyarte en el texto.',
      'pt-BR': 'Treina reconhecer a fala de ouvido, sem depender do texto.',
      vi: 'Rèn luyện khả năng nghe hiểu mà không cần nhìn văn bản.',
      id: 'Melatih pengenalan ucapan dengan telinga tanpa bantuan teks.',
      tr: 'Metne bakmadan, konuşmayı kulaktan anlamayı geliştirir.',
      pl: 'Ćwiczy rozpoznawanie mowy ze słuchu, bez wsparcia tekstu.',
    },
  },
  plan_listen_build: {
    icon: 'ear-outline',
    color: '#74B9FF',
    what: {
      ru: 'Собери фразу по звуку',
      uk: 'Збери фразу за звуком',
      es: 'Arma la frase de oído',
      'pt-BR': 'Monte a frase de ouvido',
      vi: 'Ghép câu theo âm thanh',
      id: 'Susun frasa dari yang didengar',
      tr: 'Cümleyi sesten kur',
      pl: 'Ułóż frazę ze słuchu',
    },
    why: {
      ru: 'Восприятие + порядок слов — двойная прокачка за один подход.',
      uk: 'Сприйняття + порядок слів — подвійна прокачка за один підхід.',
      es: 'Comprensión auditiva y orden de palabras: doble entreno a la vez.',
      'pt-BR': 'Compreensão auditiva e ordem das palavras: treino duplo de uma vez.',
      vi: 'Nghe hiểu cộng trật tự từ — luyện gấp đôi trong một lượt.',
      id: 'Pemahaman dengar plus urutan kata — latihan ganda sekaligus.',
      tr: 'Dinleme ve kelime sırası: tek seferde çift kazanım.',
      pl: 'Rozumienie ze słuchu i szyk wyrazów — podwójny trening za jednym razem.',
    },
  },
  plan_pronunciation_repeat: {
    icon: 'mic-outline',
    color: '#FD79A8',
    what: {
      ru: 'Повтори вслух',
      uk: 'Повтори вголос',
      es: 'Repite en voz alta',
      'pt-BR': 'Repita em voz alta',
      vi: 'Lặp lại thành tiếng',
      id: 'Ulangi dengan suara',
      tr: 'Sesli tekrar et',
      pl: 'Powtórz na głos',
    },
    why: {
      ru: 'Голосовая запись помогает слышать себя и корректировать речь.',
      uk: 'Голосовий запис допомагає чути себе й коригувати мовлення.',
      es: 'Grabar tu voz te ayuda a escucharte y corregir tu pronunciación.',
      'pt-BR': 'Gravar a voz ajuda você a se ouvir e corrigir a fala.',
      vi: 'Ghi âm giọng nói giúp bạn nghe lại và chỉnh sửa cách nói.',
      id: 'Rekaman suara membantumu mendengar diri sendiri dan memperbaiki ucapan.',
      tr: 'Ses kaydı, kendini duymana ve konuşmanı düzeltmene yardımcı olur.',
      pl: 'Nagranie głosu pomaga usłyszeć siebie i poprawić wymowę.',
    },
  },
  plan_phrase_recall: {
    icon: 'bulb-outline',
    color: '#FDCB6E',
    what: {
      ru: 'Вспомни фразу по смыслу',
      uk: 'Пригадай фразу за змістом',
      es: 'Recuerda la frase por su sentido',
      'pt-BR': 'Lembre a frase pelo sentido',
      vi: 'Nhớ lại câu theo nghĩa',
      id: 'Ingat frasa dari maknanya',
      tr: 'Cümleyi anlamından hatırla',
      pl: 'Przypomnij frazę po znaczeniu',
    },
    why: {
      ru: 'Активное воспроизведение — самый мощный способ запомнить.',
      uk: 'Активне відтворення — найпотужніший спосіб запам’ятати.',
      es: 'La evocación activa es la forma más potente de memorizar.',
      'pt-BR': 'A recordação ativa é a forma mais poderosa de memorizar.',
      vi: 'Việc gợi nhớ chủ động là cách ghi nhớ mạnh mẽ nhất.',
      id: 'Mengingat secara aktif adalah cara paling ampuh untuk menghafal.',
      tr: 'Aktif hatırlama, ezberlemenin en güçlü yoludur.',
      pl: 'Aktywne przypominanie to najskuteczniejszy sposób zapamiętywania.',
    },
  },
};

export default function PersonalPlanExerciseTransitionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();

  const nextType = firstParam(params.nextRendererType);
  const nextParams = firstParam(params.nextParams);
  const taskTitle = firstParam(params.taskTitle);
  const taskSubtitle = firstParam(params.taskSubtitle);
  const completedCount = Number(firstParam(params.completedCount) || '0');
  const totalCount = Number(firstParam(params.totalCount) || '1');

  const nextTaskLabel = triLang(lang, {
    ru: 'Следующий вызов',
    uk: 'Наступний виклик',
    es: 'Siguiente tarea',
    'pt-BR': 'Próxima tarefa',
    vi: 'Nhiệm vụ tiếp theo',
    id: 'Tugas berikutnya',
    tr: 'Sonraki görev',
    pl: 'Następne zadanie',
  });

  const rawMeta = EXERCISE_META[nextType];
  const meta = rawMeta
    ? {
        icon: rawMeta.icon,
        color: rawMeta.color,
        what: triLang(lang, rawMeta.what),
        why: triLang(lang, rawMeta.why),
      }
    : {
        icon: 'play-outline',
        color: t.accent,
        what: taskTitle || nextTaskLabel,
        why: taskSubtitle || triLang(lang, {
          ru: 'Продолжай, ты делаешь отличную работу!',
          uk: 'Продовжуй, ти робиш чудову роботу!',
          es: '¡Sigue así, lo estás haciendo genial!',
          'pt-BR': 'Continue, você está indo muito bem!',
          vi: 'Tiếp tục nào, bạn đang làm rất tốt!',
          id: 'Lanjutkan, kamu hebat!',
          tr: 'Devam et, harika gidiyorsun!',
          pl: 'Tak trzymaj, świetnie ci idzie!',
        }),
      };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
    Animated.timing(progressAnim, {
      toValue: completedCount / Math.max(1, totalCount),
      duration: 600,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [fadeAnim, slideAnim, scaleAnim, progressAnim, completedCount, totalCount]);

  const proceed = () => {
    hapticSuccess();
    if (nextParams) {
      try {
        const parsed = JSON.parse(nextParams);
        router.replace({ pathname: '/personal_plan_exercise', params: parsed } as any);
        return;
      } catch {
        // fallthrough
      }
    }
    safeRouterBack(router, '/personal_plan');
  };

  const isGold = themeMode === 'gold';
  const bg = isGold ? '#090704' : t.bgPrimary;
  // Эталон урока использует единый акцент темы, а не отдельный цвет на каждый режим.
  const accentColor = isGold ? '#FFE8A8' : t.accent;

  return (
    <View style={[styles.safe, { backgroundColor: bg, paddingTop: insets.top }]}>
      <LinearGradient colors={t.bgGradient} style={styles.fill}>
        <BounceView style={styles.fill}>
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.72}
            onPress={() => safeRouterBack(router, '/personal_plan')}
            style={[styles.closeBtn, { borderColor: t.border, backgroundColor: t.bgCard }]}
          >
            <Ionicons name="close" size={22} color={t.textMuted} />
          </TouchableOpacity>
          <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: accentColor,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <View style={[styles.countPill, { backgroundColor: t.accentBg, borderColor: t.border }]}>
            <Text style={[styles.countText, { color: t.accent }]}>{completedCount}/{totalCount}</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.body,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.iconRing, { backgroundColor: accentColor + '18', borderColor: accentColor + '44' }]}>
            <Ionicons name={meta.icon as any} size={52} color={accentColor} />
          </View>

          <View style={[styles.labelPill, { backgroundColor: accentColor + '14', borderColor: accentColor + '33' }]}>
            <Text style={[styles.labelText, { color: accentColor }]}>{nextTaskLabel}</Text>
          </View>

          <Text style={[styles.whatTitle, { color: t.textPrimary }]}>{meta.what}</Text>
          <Text style={[styles.whyText, { color: t.textMuted }]}>{meta.why}</Text>

          {taskSubtitle ? (
            <View style={[styles.focusPill, { backgroundColor: t.bgCard, borderColor: t.border }]}>
              <Ionicons name="bookmark-outline" size={16} color={t.textMuted} />
              <Text style={[styles.focusText, { color: t.textMuted }]}>{taskSubtitle}</Text>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={proceed}
            style={styles.startWrap}
          >
            <LinearGradient
              colors={[accentColor + 'CC', accentColor]}
              style={styles.startButton}
            >
              <Ionicons name="play" size={22} color={t.correctText} />
              <Text style={[styles.startText, { color: t.correctText }]}>{triLang(lang, {
                ru: 'Начать',
                uk: 'Почати',
                es: 'Empezar',
                'pt-BR': 'Começar',
                vi: 'Bắt đầu',
                id: 'Mulai',
                tr: 'Başla',
                pl: 'Zacznij',
              })}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        </BounceView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  countPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 13,
    fontWeight: '900',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 20,
  },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  labelPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  whatTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    textAlign: 'center',
  },
  whyText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  focusText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  startWrap: { borderRadius: 14 },
  startButton: {
    height: 68,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
  },
});
