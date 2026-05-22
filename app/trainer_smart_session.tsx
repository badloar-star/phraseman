import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { updateMultipleTaskProgress, type TaskType } from './daily_tasks';
import { checkAchievements } from './achievements';
import { logMistake } from './mistake_log';
import {
  getTrainerPremiumItems,
  markTrainerResult,
  trainerTranslationForLang,
  type TrainerItem,
  type TrainerPremiumMode,
  type TrainerQueue,
} from './trainer_store';
import { getVerifiedPremiumStatus } from './premium_guard';
import { type WordCategory } from './pos_taxonomy';
import {
  buildPosDrillPlan,
  getPosWorkoutProfile,
  recordPosWorkoutResult,
  resolveTrainerItemPosCategory,
  type PosDrillMethod,
  type PosDrillType,
  type PosWorkoutProfile,
} from './pos_workout_engine';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { frenchTrainerGateCopy, trainerSessionContentAvailableForTarget } from './trainer_target_gate';

type PlannedCopy = { ru: string; uk: string; es: string } & Partial<Record<PlannedInterfaceLang, string>>;

type AnswerState = 'idle' | 'correct' | 'wrong';

interface SmartCard {
  item: TrainerItem;
  title: string;
  prompt: string;
  helper: string;
  instruction?: string;
  answerLabel?: string;
  focusChips?: string[];
  options: string[];
  correct: string;
  accent: string;
  category?: WordCategory;
  drillType?: PosDrillType;
  method?: PosDrillMethod;
  profile?: PosWorkoutProfile | null;
}

interface MistakeInsight {
  title: string;
  correctLabel: string;
  correctValue: string;
  why: string;
  next: string;
}

interface SessionAttempt {
  key: string;
  queue: TrainerQueue;
  label: string;
  correct: boolean;
  category?: WordCategory;
  method?: PosDrillMethod;
}

const MODE_META: Record<TrainerPremiumMode, { icon: keyof typeof Ionicons.glyphMap; accent: string; title: PlannedCopy; sub: PlannedCopy }> = {
  smart_mix: {
    icon: 'sparkles',
    accent: '#FACC15',
    title: { ru: 'Smart Mix', uk: 'Smart Mix', es: 'Smart Mix', 'pt-BR': 'Smart Mix', vi: 'Smart Mix', id: 'Smart Mix', tr: 'Smart Mix', pl: 'Smart Mix' },
    sub: {
      ru: 'Короткая тренировка по тому, что стоит повторить сейчас.',
      uk: 'Коротке тренування того, що варто повторити зараз.',
      es: 'Entrenamiento corto con lo que conviene repasar ahora.',
      'pt-BR': 'Treino curto com o que vale revisar agora.',
      vi: 'Buổi luyện ngắn với những gì nên ôn ngay bây giờ.',
      id: 'Latihan singkat untuk hal yang perlu diulang sekarang.',
      tr: 'Şu anda tekrar etmeye değer şeylerle kısa antrenman.',
      pl: 'Krótki trening tego, co warto teraz powtórzyć.',
    },
  },
  weak: {
    icon: 'pulse',
    accent: '#A78BFA',
    title: { ru: 'Слабые места', uk: 'Слабкі місця', es: 'Puntos debiles', 'pt-BR': 'Pontos fracos', vi: 'Điểm yếu', id: 'Titik lemah', tr: 'Zayıf noktalar', pl: 'Słabe miejsca' },
    sub: {
      ru: 'Карточки, которые еще не стали стабильными.',
      uk: 'Картки, які ще не стали стабільними.',
      es: 'Tarjetas que aun no son estables.',
      'pt-BR': 'Cartões que ainda não ficaram estáveis.',
      vi: 'Những thẻ vẫn chưa ổn định.',
      id: 'Kartu yang belum stabil.',
      tr: 'Henüz kalıcı hale gelmemiş kartlar.',
      pl: 'Karty, które nie są jeszcze stabilne.',
    },
  },
  hard: {
    icon: 'flame',
    accent: '#FB7185',
    title: { ru: 'Тяжелые ошибки', uk: 'Важкі помилки', es: 'Errores duros', 'pt-BR': 'Erros difíceis', vi: 'Lỗi nặng', id: 'Kesalahan berat', tr: 'Zor hatalar', pl: 'Trudne błędy' },
    sub: {
      ru: 'Самые повторяющиеся ошибки идут первыми.',
      uk: 'Найчастіші помилки йдуть першими.',
      es: 'Los errores repetidos van primero.',
      'pt-BR': 'Os erros mais repetidos aparecem primeiro.',
      vi: 'Những lỗi lặp lại nhiều nhất sẽ xuất hiện trước.',
      id: 'Kesalahan yang paling sering terulang muncul lebih dulu.',
      tr: 'En çok tekrarlanan hatalar önce gelir.',
      pl: 'Najczęściej powtarzane błędy idą pierwsze.',
    },
  },
};

const SESSION_COACH: Record<TrainerPremiumMode, PlannedCopy> = {
  smart_mix: { ru: '', uk: '', es: '', 'pt-BR': '', vi: '', id: '', tr: '', pl: '' },
  weak: {
    ru: 'Сейчас важна не скорость, а честная попытка вспомнить до выбора.',
    uk: 'Зараз важлива не швидкість, а чесна спроба згадати до вибору.',
    es: 'Ahora importa recordar antes de elegir.',
    'pt-BR': 'Agora o importante não é a velocidade, mas uma tentativa honesta de lembrar antes de escolher.',
    vi: 'Lúc này tốc độ không quan trọng bằng việc thật sự cố nhớ trước khi chọn.',
    id: 'Sekarang yang penting bukan kecepatan, tetapi usaha jujur untuk mengingat sebelum memilih.',
    tr: 'Şu anda hız değil, seçmeden önce dürüstçe hatırlamaya çalışmak önemli.',
    pl: 'Teraz liczy się nie szybkość, ale uczciwa próba przypomnienia przed wyborem.',
  },
  hard: {
    ru: 'Тяжелые ошибки идут первыми: именно они дают самый заметный рост.',
    uk: 'Важкі помилки йдуть першими: саме вони дають найпомітніший ріст.',
    es: 'Los errores duros van primero: ahi esta el progreso.',
    'pt-BR': 'Os erros difíceis vêm primeiro: é neles que o progresso fica mais visível.',
    vi: 'Các lỗi nặng xuất hiện trước: chính chúng tạo ra tiến bộ rõ nhất.',
    id: 'Kesalahan berat muncul lebih dulu: dari situlah kemajuan paling terlihat.',
    tr: 'Zor hatalar önce gelir: en görünür gelişim tam oradadır.',
    pl: 'Trudne błędy idą pierwsze: to one dają najbardziej widoczny postęp.',
  },
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function modeFromParam(value: unknown): TrainerPremiumMode {
  return value === 'weak' || value === 'hard' || value === 'smart_mix' ? value : 'smart_mix';
}

function queueLabel(queue: TrainerQueue, lang: Lang): string {
  if (queue === 'words') return triLang(lang, {
    ru: 'слово',
    uk: 'слово',
    es: 'palabra',
    'pt-BR': "palavra",
    vi: "t?",
    id: "kata",
    tr: "kelime",
    pl: "słowo",
  });
  if (queue === 'phrases') return triLang(lang, {
    ru: 'фраза',
    uk: 'фраза',
    es: 'frase',
    'pt-BR': "frase",
    vi: "cụm câu",
    id: "frasa",
    tr: "ifade",
    pl: "fraza",
  });
  return triLang(lang, {
    ru: 'арена',
    uk: 'арена',
    es: 'arena',
    'pt-BR': "arena",
    vi: "đấu trường",
    id: "arena",
    tr: "arena",
    pl: "arena",
  });
}

function categoryCandidates(all: TrainerItem[], item: TrainerItem, category?: WordCategory): string[] {
  if (!category) return [];
  return all
    .filter((candidate) => candidate.key !== item.key && resolveTrainerItemPosCategory(candidate) === category)
    .map((candidate) => candidate.errorWord || (candidate.queue === 'words' ? candidate.key : candidate.arenaQuestion?.correct) || '')
    .filter(Boolean);
}

function targetPhraseRecallHelper(lang: Lang, studyTarget?: RuntimeStudyTarget): string {
  if (studyTarget === 'fr') {
    return triLang(lang, {
      ru: 'Попробуй вспомнить французскую фразу целиком.',
      uk: 'Спробуй згадати французьку фразу повністю.',
      es: 'Intenta recordar la frase completa en frances.',
      'pt-BR': 'Tente lembrar a frase em francês inteira.',
      vi: 'Hãy cố nhớ toàn bộ cụm câu tiếng Pháp.',
      id: 'Coba ingat seluruh frasa bahasa Prancis.',
      tr: 'Fransızca ifadeyi tamamen hatırlamaya çalış.',
      pl: 'Spróbuj przypomnieć sobie całą frazę po francusku.',
    });
  }
  return triLang(lang, {
    ru: 'Попробуй вспомнить английскую фразу целиком.',
    uk: 'Спробуй згадати англійську фразу повністю.',
    es: 'Intenta recordar la frase completa en ingles.',
    'pt-BR': 'Tente lembrar a frase em inglês inteira.',
    vi: 'Hãy cố nhớ toàn bộ cụm câu tiếng Anh.',
    id: 'Coba ingat seluruh frasa bahasa Inggris.',
    tr: 'İngilizce ifadeyi tamamen hatırlamaya çalış.',
    pl: 'Spróbuj przypomnieć sobie całą frazę po angielsku.',
  });
}

function wordLinkMistakeWhy(picked: string, lang: Lang, studyTarget?: RuntimeStudyTarget): string {
  if (studyTarget === 'fr') {
    return triLang(lang, {
      ru: `Ты выбрал: ${picked}. Сейчас важно связать французское слово именно с точным переводом.`,
      uk: `Ти обрав: ${picked}. Зараз важливо зв'язати французьке слово саме з точним перекладом.`,
      es: `Elegiste: ${picked}. Ahora importa unir la palabra francesa con su traduccion exacta.`,
      'pt-BR': `Você escolheu: ${picked}. Agora o importante é ligar a palavra francesa à tradução exata.`,
      vi: `Bạn đã chọn: ${picked}. Giờ điều quan trọng là nối từ tiếng Pháp với bản dịch chính xác.`,
      id: `Kamu memilih: ${picked}. Sekarang yang penting adalah menghubungkan kata Prancis dengan terjemahan yang tepat.`,
      tr: `Seçimin: ${picked}. Şimdi önemli olan Fransızca kelimeyi tam çeviriyle eşleştirmek.`,
      pl: `Wybrano: ${picked}. Teraz ważne jest połączenie francuskiego słowa z dokładnym tłumaczeniem.`,
    });
  }
  return triLang(lang, {
    ru: `Ты выбрал: ${picked}. Сейчас важно связать английское слово именно с точным переводом.`,
    uk: `Ти обрав: ${picked}. Зараз важливо зв'язати англійське слово саме з точним перекладом.`,
    es: `Elegiste: ${picked}. Ahora importa unir la palabra inglesa con su traduccion exacta.`,
    'pt-BR': `Você escolheu: ${picked}. Agora o importante é ligar a palavra inglesa à tradução exata.`,
    vi: `Bạn đã chọn: ${picked}. Giờ điều quan trọng là nối từ tiếng Anh với bản dịch chính xác.`,
    id: `Kamu memilih: ${picked}. Sekarang yang penting adalah menghubungkan kata Inggris dengan terjemahan yang tepat.`,
    tr: `Seçimin: ${picked}. Şimdi önemli olan İngilizce kelimeyi tam çeviriyle eşleştirmek.`,
    pl: `Wybrano: ${picked}. Teraz ważne jest połączenie angielskiego słowa z dokładnym tłumaczeniem.`,
  });
}

function buildCard(item: TrainerItem, all: TrainerItem[], lang: Lang, studyTarget?: RuntimeStudyTarget): SmartCard {
  const category = resolveTrainerItemPosCategory(item);
  const profile = studyTarget === 'fr' ? null : getPosWorkoutProfile(category);

  if (item.queue === 'arena' && item.arenaQuestion) {
    return {
      item,
      title: triLang(lang, {
        ru: 'Арена без давления',
        uk: 'Арена без тиску',
        es: 'Arena sin presion',
        'pt-BR': "Arena sem pressão",
        vi: "Đấu trường không áp lực",
        id: "Arena tanpa tekanan",
        tr: "Baskısız arena",
        pl: "Arena bez presji",
      }),
      prompt: item.arenaQuestion.question,
      helper: item.arenaQuestion.rule || triLang(lang, {
        ru: 'Выбери правильный вариант.',
        uk: 'Обери правильний варіант.',
        es: 'Elige la opcion correcta.',
        'pt-BR': "Escolha a opção correta.",
        vi: "Chọn đáp án đúng.",
        id: "Pilih opsi yang benar.",
        tr: "Doğru seçeneği seç.",
        pl: "Wybierz poprawną opcję.",
      }),
      options: shuffle(item.arenaQuestion.options),
      correct: item.arenaQuestion.correct,
      accent: profile?.accent || '#FB7185',
      category,
      profile,
    };
  }

  if (item.queue === 'phrases') {
    if (profile && category && item.errorWord) {
      const drill = buildPosDrillPlan({
        category,
        phrase: item.key,
        token: item.errorWord,
        translation: trainerTranslationForLang(item, lang),
        candidates: categoryCandidates(all, item, category),
        lang,
      });
      if (drill) {
        return {
          item,
          title: drill.title,
          prompt: drill.prompt,
          helper: drill.helper,
          instruction: drill.instruction,
          answerLabel: drill.answerLabel,
          focusChips: drill.focusChips,
          options: shuffle(drill.options),
          correct: drill.correct,
          accent: profile.accent,
          category,
          drillType: drill.drillType,
          method: drill.method,
          profile,
        };
      }
    }

    const decoys = all.filter((candidate) => candidate.queue === 'phrases' && candidate.key !== item.key).map((candidate) => candidate.key);
    return {
      item,
      title: triLang(lang, {
        ru: 'Вспомни фразу',
        uk: 'Згадай фразу',
        es: 'Recuerda la frase',
        'pt-BR': "Lembre a frase",
        vi: "Nhớ lại cụm câu",
        id: "Ingat frasa",
        tr: "İfadeyi hatırla",
        pl: "Przypomnij sobie frazę",
      }),
      prompt: trainerTranslationForLang(item, lang),
      helper: targetPhraseRecallHelper(lang, studyTarget),
      options: shuffle(uniq([item.key, ...decoys]).slice(0, 4)),
      correct: item.key,
      accent: profile?.accent || '#2DD4BF',
      category,
      profile,
    };
  }

  const correctTranslation = trainerTranslationForLang(item, lang);
  const decoys = all.filter((candidate) => candidate.queue === 'words' && candidate.key !== item.key).map((candidate) => trainerTranslationForLang(candidate, lang));
  return {
    item,
    title: '',
    prompt: item.key,
    helper: triLang(lang, {
      ru: 'Выбери точный перевод.',
      uk: 'Обери точний переклад.',
      es: 'Elige la traduccion exacta.',
      'pt-BR': "Escolha a tradução exata.",
      vi: "Chọn bản dịch chính xác.",
      id: "Pilih terjemahan yang tepat.",
      tr: "Tam çeviriyi seç.",
      pl: "Wybierz dokładne tłumaczenie.",
    }),
    options: shuffle(uniq([correctTranslation, ...decoys]).slice(0, 4)),
    correct: correctTranslation,
    accent: profile?.accent || '#60A5FA',
    category,
    profile,
  };
}

function buildMistakeInsight(card: SmartCard, picked: string, lang: Lang, studyTarget?: RuntimeStudyTarget): MistakeInsight {
  if (card.profile && card.drillType && card.item.queue !== 'words') {
    return {
      title: card.profile.title[lang],
      correctLabel: card.profile.drillLabel[lang],
      correctValue: card.correct,
      why: triLang(lang, {
        ru: `Ты выбрал: ${picked}. ${card.profile.mistakeWhy[lang]}`,
        uk: `Ти обрав: ${picked}. ${card.profile.mistakeWhy[lang]}`,
        es: `Elegiste: ${picked}. ${card.profile.mistakeWhy[lang]}`,
        'pt-BR': `Você escolheu: ${picked}. Confira o motivo e conecte a frase ao sentido correto.`,
        vi: `Bạn đã chọn: ${picked}. Hãy xem lý do và nối cụm câu với đúng nghĩa.`,
        id: `Kamu memilih: ${picked}. Periksa alasannya dan hubungkan frasa dengan makna yang tepat.`,
        tr: `Seçimin: ${picked}. Nedeni kontrol et ve ifadeyi doğru anlamla bağla.`,
        pl: `Wybrano: ${picked}. Sprawdź powód i połącz frazę z właściwym znaczeniem.`,
      }),
      next: card.profile.nextStep[lang],
    };
  }

  if (card.item.queue === 'words') {
    return {
      title: triLang(lang, {
        ru: 'Разбор слова',
        uk: 'Розбір слова',
        es: 'Analisis de palabra',
        'pt-BR': "Análise da palavra",
        vi: "Phân tích từ",
        id: "Pembahasan kata",
        tr: "Kelime analizi",
        pl: "Analiza słowa",
      }),
      correctLabel: triLang(lang, {
        ru: 'Правильный перевод',
        uk: 'Правильний переклад',
        es: 'Traduccion correcta',
        'pt-BR': "Tradução correta",
        vi: "Bản dịch đúng",
        id: "Terjemahan benar",
        tr: "Doğru çeviri",
        pl: "Poprawne tłumaczenie",
      }),
      correctValue: card.correct,
      why: wordLinkMistakeWhy(picked, lang, studyTarget),
      next: triLang(lang, {
        ru: 'Эта карточка вернется раньше, пока ответ не станет уверенным.',
        uk: 'Ця картка повернеться раніше, доки відповідь не стане впевненою.',
        es: 'Esta tarjeta volvera antes hasta que la respuesta sea segura.',
        'pt-BR': "Este cartão voltará mais cedo até a resposta ficar segura.",
        vi: "Thẻ này sẽ quay lại sớm hơn cho đến khi câu trả lời trở nên chắc chắn.",
        id: "Kartu ini akan kembali lebih cepat sampai jawabannya terasa mantap.",
        tr: "Cevap güvenli hale gelene kadar bu kart daha erken dönecek.",
        pl: "Ta karta wróci wcześniej, dopóki odpowiedź nie będzie pewna.",
      }),
    };
  }

  return {
    title: triLang(lang, {
      ru: 'Мини-разбор',
      uk: 'Міні-розбір',
      es: 'Mini analisis',
      'pt-BR': "Mini-análise",
      vi: "Phân tích nhanh",
      id: "Mini pembahasan",
      tr: "Mini analiz",
      pl: "Mini analiza",
    }),
    correctLabel: triLang(lang, {
      ru: 'Правильный ответ',
      uk: 'Правильна відповідь',
      es: 'Respuesta correcta',
      'pt-BR': "Resposta correta",
      vi: "Đáp án đúng",
      id: "Jawaban benar",
      tr: "Doğru cevap",
      pl: "Poprawna odpowiedź",
    }),
    correctValue: card.correct,
    why: triLang(lang, {
      ru: `Ты выбрал: ${picked}. Здесь тренируется точное восстановление смысла, а не узнавание знакомого варианта.`,
      uk: `Ти обрав: ${picked}. Тут тренується точне відновлення сенсу, а не впізнавання знайомого варіанта.`,
      es: `Elegiste: ${picked}. Aqui entrenamos recuperar el sentido exacto.`,
      'pt-BR': `Você escolheu: ${picked}. Aqui treinamos recuperar o sentido exato, não apenas reconhecer uma opção familiar.`,
      vi: `Bạn đã chọn: ${picked}. Ở đây ta luyện khôi phục đúng nghĩa, không chỉ nhận ra một lựa chọn quen thuộc.`,
      id: `Kamu memilih: ${picked}. Di sini kita melatih pemulihan makna yang tepat, bukan sekadar mengenali opsi yang familiar.`,
      tr: `Seçimin: ${picked}. Burada tanıdık seçeneği fark etmeyi değil, anlamı tam olarak geri çağırmayı çalışıyoruz.`,
      pl: `Wybrano: ${picked}. Tu ćwiczysz dokładne odtworzenie sensu, a nie tylko rozpoznanie znajomej opcji.`,
    }),
    next: triLang(lang, {
      ru: 'Перед выбором проговори полный вариант в голове.',
      uk: 'Перед вибором проговори повний варіант подумки.',
      es: 'Antes de elegir, di la opcion completa mentalmente.',
      'pt-BR': "Antes de escolher, diga mentalmente a opção completa.",
      vi: "Trước khi chọn, hãy đọc thầm toàn bộ đáp án trong đầu.",
      id: "Sebelum memilih, ucapkan opsi lengkapnya di kepala.",
      tr: "Seçmeden önce tam seçeneği zihninde söyle.",
      pl: "Przed wyborem powiedz w głowie całą opcję.",
    }),
  };
}

function logSmartTrainerMistake(card: SmartCard, picked: string, studyTarget?: RuntimeStudyTarget): void {
  if (!card.item.lessonId || card.item.lessonId <= 0) return;
  const tokenText = card.item.errorWord || (card.item.queue === 'words' ? card.item.key : card.item.arenaQuestion?.correct);
  logMistake(card.item.key, card.item.lessonId, 'trainer', 'wrong_pick', {
    tokenText,
    expected: tokenText || card.correct,
    picked,
    category: card.category,
    rawCategory: card.item.grammarTag,
    grammarTag: card.item.grammarTag,
  }, studyTarget);
}

export default function TrainerSmartSession() {
  const params = useLocalSearchParams<{ mode?: string; preview?: string }>();
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const trainerGateOpen = trainerSessionContentAvailableForTarget(studyTarget);
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);

  const mode = modeFromParam(params.mode);
  const meta = MODE_META[mode];
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<SmartCard[]>([]);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<AnswerState>('idle');
  const [picked, setPicked] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<SessionAttempt[]>([]);
  const [mistakeInsight, setMistakeInsight] = useState<MistakeInsight | null>(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    if (!trainerGateOpen) {
      setCards([]);
      setIndex(0);
      setState('idle');
      setPicked(null);
      setAttempts([]);
      setMistakeInsight(null);
      setLoading(false);
      return;
    }
    const premiumAllowed = params.preview === 'report' || params.preview === 'mistake'
      ? true
      : await getVerifiedPremiumStatus();
    if (!premiumAllowed) {
      router.replace({ pathname: '/premium_modal', params: { context: 'smart_trainer' } } as any);
      return;
    }

    const items = await getTrainerPremiumItems(mode, 12, studyTarget);
    setCards(items.map((item) => buildCard(item, items, lang, studyTarget)));
    setIndex(0);
    setState('idle');
    setPicked(null);
    setAttempts([]);
    setMistakeInsight(null);
    setLoading(false);
  }, [lang, mode, params.preview, router, studyTarget, trainerGateOpen]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const current = cards[index];
  const done = !loading && cards.length > 0 && index >= cards.length;
  const correctCount = attempts.filter((attempt) => attempt.correct).length;
  const wrongCount = attempts.length - correctCount;
  const accuracy = attempts.length ? Math.round((correctCount / attempts.length) * 100) : 0;
  const sessionCoachText = SESSION_COACH[mode][lang];

  const posStats = useMemo(() => {
    const stats = new Map<WordCategory, { correct: number; total: number; profile: PosWorkoutProfile }>();
    attempts.forEach((attempt) => {
      if (!attempt.category) return;
      const profile = getPosWorkoutProfile(attempt.category);
      if (!profile) return;
      const row = stats.get(attempt.category) || { correct: 0, total: 0, profile };
      row.total += 1;
      if (attempt.correct) row.correct += 1;
      stats.set(attempt.category, row);
    });
    return [...stats.entries()].slice(0, 4);
  }, [attempts]);

  const answer = async (option: string) => {
    if (!current || state !== 'idle') return;
    const correct = option === current.correct;
    hapticTap();
    setPicked(option);
    setState(correct ? 'correct' : 'wrong');
    if (correct) hapticSuccess();
    else hapticError();

    await markTrainerResult(current.item.key, current.item.queue, correct, studyTarget);
    if (current.profile && current.category) {
      await recordPosWorkoutResult(current.category, correct, studyTarget);
    }
    await updateMultipleTaskProgress([
      { type: 'trainer_session' as TaskType, increment: 1 },
      ...(correct ? [{ type: 'correct_answer' as TaskType, increment: 1 }] : []),
    ], { studyTarget });
    if (correct) await checkAchievements({ type: 'trainer_correct', correct: 1, studyTarget });
    if (!correct) logSmartTrainerMistake(current, option, studyTarget);

    const attempt = {
      key: current.item.key,
      queue: current.item.queue,
      label: current.title || current.prompt,
      correct,
      category: current.profile ? current.category : undefined,
      method: current.method,
    };
    const nextAttempts = [...attempts, attempt];
    setAttempts(nextAttempts);
    if (index + 1 >= cards.length) {
      const sessionCorrect = nextAttempts.filter((row) => row.correct).length;
      void checkAchievements({
        type: 'trainer_session_result',
        correct: sessionCorrect,
        wrong: nextAttempts.length - sessionCorrect,
        total: cards.length,
        studyTarget,
      });
    }

    if (!correct) {
      setMistakeInsight(buildMistakeInsight(current, option, lang, studyTarget));
      return;
    }
    setTimeout(() => advance(), 350);
  };

  const advance = () => {
    setMistakeInsight(null);
    setState('idle');
    setPicked(null);
    setIndex((value) => value + 1);
  };

  const retryCurrent = () => {
    hapticTap();
    setMistakeInsight(null);
    setState('idle');
    setPicked(null);
  };

  if (loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={styles.center}>
          <Text style={{ color: sx.muted, fontSize: f.body }}>...</Text>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (!trainerGateOpen) {
    const copy = frenchTrainerGateCopy(lang);
    return (
      <ScreenGradient>
        <SafeAreaView style={styles.center}>
          <Ionicons name="lock-closed-outline" size={38} color={sx.muted} />
          <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', marginTop: 14 }}>
            {copy.title}
          </Text>
          <Text style={{ color: sx.muted, fontSize: f.body, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
            {copy.body}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/trainer' as any)} style={[styles.primaryBtn, { backgroundColor: meta.accent, marginTop: 18 }]}>
            <Text style={{ color: '#fff', fontSize: f.sub, fontWeight: '900' }}>{copy.action}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (cards.length === 0) {
    return (
      <ScreenGradient>
        <SafeAreaView style={styles.center}>
          <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '900' }}>
            {triLang(lang, {
              ru: 'Пока нечего повторять',
              uk: 'Поки немає що повторювати',
              es: 'Nada que repasar aun',
              'pt-BR': "Nada para repetir ainda",
              vi: "Chưa có gì để ôn",
              id: "Belum ada yang perlu diulang",
              tr: "Tekrar edecek bir şey yok",
              pl: "Nie ma jeszcze nic do powtórki",
            })}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.primaryBtn, { backgroundColor: meta.accent, marginTop: 18 }]}>
            <Text style={{ color: '#fff', fontSize: f.sub, fontWeight: '900' }}>
              {triLang(lang, {
                ru: 'Готово',
                uk: 'Готово',
                es: 'Listo',
                'pt-BR': "Pronto",
                vi: "Xong",
                id: "Selesai",
                tr: "Tamam",
                pl: "Gotowe",
              })}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (done) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={styles.report}>
              <View style={[styles.reportHero, { backgroundColor: t.bgCard, borderColor: meta.accent + '55' }]}>
                <View style={[styles.doneIcon, { backgroundColor: meta.accent + '18', borderColor: meta.accent + '66' }]}>
                  <Ionicons name="checkmark-circle" size={34} color={meta.accent} />
                </View>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Тренировка завершена',
                    uk: 'Тренування завершено',
                    es: 'Entrenamiento terminado',
                    'pt-BR': "Treino concluído",
                    vi: "Đã hoàn thành luyện tập",
                    id: "Latihan selesai",
                    tr: "Antrenman tamamlandı",
                    pl: "Trening zakończony",
                  })}
                </Text>
              </View>

              <View style={styles.reportGrid}>
                <ReportMetric label={triLang(lang, {
                  ru: 'точность',
                  uk: 'точність',
                  es: 'precision',
                  'pt-BR': "precisão",
                  vi: "độ chính xác",
                  id: "akurasi",
                  tr: "doğruluk",
                  pl: "dokładność",
                })} value={`${accuracy}%`} color={meta.accent} t={t} f={f} />
                <ReportMetric label={triLang(lang, {
                  ru: 'верно',
                  uk: 'вірно',
                  es: 'bien',
                  'pt-BR': "corretas",
                  vi: "đúng",
                  id: "benar",
                  tr: "doğru",
                  pl: "poprawnie",
                })} value={`${correctCount}`} color="#34D399" t={t} f={f} />
                <ReportMetric label={triLang(lang, {
                  ru: 'ошибки',
                  uk: 'помилки',
                  es: 'errores',
                  'pt-BR': "erros",
                  vi: "lỗi",
                  id: "kesalahan",
                  tr: "hata",
                  pl: "błędy",
                })} value={`${wrongCount}`} color="#FB7185" t={t} f={f} />
              </View>

              {posStats.length > 0 && (
                <View style={[styles.reportPanel, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                  {posStats.map(([category, row]) => (
                    <View key={category} style={styles.attentionRow}>
                      <View style={[styles.attentionDot, { backgroundColor: row.profile.accent }]} />
                      <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '800', flex: 1 }}>
                        {row.profile.title[lang]}
                      </Text>
                      <Text style={{ color: row.profile.accent, fontSize: f.caption, fontWeight: '900' }}>
                        {row.correct}/{row.total}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.reportActions}>
                <TouchableOpacity onPress={() => { hapticTap(); void loadSession(); }} style={[styles.secondaryBtn, { borderColor: meta.accent + '66', backgroundColor: meta.accent + '14' }]}>
                  <Text style={{ color: meta.accent, fontSize: f.sub, fontWeight: '900' }}>
                    {triLang(lang, {
                      ru: 'Еще раз',
                      uk: 'Ще раз',
                      es: 'Otra vez',
                      'pt-BR': "Mais uma vez",
                      vi: "Làm lại",
                      id: "Sekali lagi",
                      tr: "Bir kez daha",
                      pl: "Jeszcze raz",
                    })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { hapticTap(); router.back(); }} style={[styles.nextBtn, { backgroundColor: meta.accent }]}>
                  <Text style={{ color: '#fff', fontSize: f.sub, fontWeight: '900' }}>
                    {triLang(lang, {
                      ru: 'Готово',
                      uk: 'Готово',
                      es: 'Listo',
                      'pt-BR': "Pronto",
                      vi: "Xong",
                      id: "Selesai",
                      tr: "Tamam",
                      pl: "Gotowe",
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (!current) return null;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} testID="screen-trainer-smart-session">
        <ContentWrap>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => { hapticTap(); router.back(); }} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: sx.primary, fontSize: f.body, fontWeight: '900' }}>{meta.title[lang]}</Text>
              <Text style={{ color: sx.muted, fontSize: f.caption, marginTop: 2 }}>{meta.sub[lang]}</Text>
            </View>
            <Text style={{ color: sx.muted, fontSize: f.caption, fontWeight: '800' }}>{index + 1}/{cards.length}</Text>
          </View>

          <View style={[styles.progress, { backgroundColor: t.bgSurface }]}>
            <View style={[styles.progressFill, { backgroundColor: meta.accent, width: `${(index / cards.length) * 100}%` }]} />
          </View>

          <View style={styles.body}>
            {!!sessionCoachText && (
              <View style={[styles.coachStrip, { backgroundColor: meta.accent + '17', borderColor: meta.accent + '44' }]}>
                <Ionicons name={meta.icon} size={17} color={meta.accent} />
                <Text style={{ color: sx.second, fontSize: f.caption, fontWeight: '700', flex: 1, lineHeight: f.caption * 1.35 }}>
                  {sessionCoachText}
                </Text>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: state === 'correct' ? '#40C080' : state === 'wrong' ? '#FB7185' : t.border }]}>
              <View style={styles.cardTop}>
                <View style={styles.cardMetaLeft}>
                  {current.item.queue !== 'words' && (
                    <View style={[styles.typeBadge, { backgroundColor: current.accent + '22', borderColor: current.accent + '66' }]}>
                      <Text style={{ color: current.accent, fontSize: f.label, fontWeight: '900' }}>{queueLabel(current.item.queue, lang)}</Text>
                    </View>
                  )}
                  {current.profile && (
                    <View style={[styles.posBadge, { backgroundColor: current.profile.accent + '14', borderColor: current.profile.accent + '44' }]}>
                      <Ionicons name={current.profile.icon as keyof typeof Ionicons.glyphMap} size={12} color={current.profile.accent} />
                      <Text style={{ color: current.profile.accent, fontSize: f.label, fontWeight: '900' }} numberOfLines={1}>
                        {current.profile.title[lang]}
                      </Text>
                    </View>
                  )}
                </View>
                {current.item.mistakeCount > 0 ? (
                  <View style={[styles.mistakeBadge, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
                    <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900' }}>
                      {triLang(lang, {
                        ru: `${current.item.mistakeCount} ош.`,
                        uk: `${current.item.mistakeCount} пом.`,
                        es: `${current.item.mistakeCount} err.`,
                        'pt-BR': `${current.item.mistakeCount} err.`,
                        vi: `${current.item.mistakeCount} lỗi`,
                        id: `${current.item.mistakeCount} kes.`,
                        tr: `${current.item.mistakeCount} hata`,
                        pl: `${current.item.mistakeCount} b?.`,
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>

              {!!current.title && current.title !== current.profile?.title[lang] && (
                <Text style={{ color: current.accent, fontSize: f.sub, fontWeight: '900', textAlign: 'center' }}>
                  {current.title}
                </Text>
              )}
              <View style={[styles.helperBox, { backgroundColor: current.accent + '10', borderColor: current.accent + '35' }]}>
                <Ionicons name="navigate" size={15} color={current.accent} />
                <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '800', flex: 1, lineHeight: f.caption * 1.35 }}>
                  {current.helper}
                </Text>
              </View>
              {current.instruction && (
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800', textAlign: 'center', lineHeight: f.caption * 1.35 }}>
                  {current.instruction}
                </Text>
              )}
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', lineHeight: f.h2 * 1.22 }}>
                {current.prompt}
              </Text>
              {current.focusChips && current.focusChips.length > 0 && (
                <View style={styles.drillChipRow}>
                  {current.focusChips.slice(0, 3).map((chip) => (
                    <View key={chip} style={[styles.drillChip, { backgroundColor: current.accent + '14', borderColor: current.accent + '44' }]}>
                      <Text style={{ color: current.accent, fontSize: f.label, fontWeight: '900' }} numberOfLines={1}>
                        {chip}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={{ gap: 10 }}>
              {current.answerLabel && (
                <Text style={{ color: sx.muted, fontSize: f.label, fontWeight: '900', textTransform: 'uppercase' }}>
                  {current.answerLabel}
                </Text>
              )}
              {current.options.map((option) => {
                const isPicked = picked === option;
                const isCorrect = option === current.correct;
                let bg = t.bgCard;
                let border = t.border;
                let color = t.textPrimary;
                if (state !== 'idle' && isCorrect) { bg = '#40C08022'; border = '#40C080'; color = '#40C080'; }
                if (state === 'wrong' && isPicked) { bg = '#FB718522'; border = '#FB7185'; color = '#FB7185'; }
                return (
                  <TouchableOpacity
                    key={option}
                    disabled={state !== 'idle'}
                    onPress={() => { void answer(option); }}
                    testID="trainer-smart-option"
                    style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                    activeOpacity={0.86}
                  >
                    <Text style={{ color, fontSize: f.body, fontWeight: '800', lineHeight: f.body * 1.25 }}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <MistakeInsightModal
            insight={mistakeInsight}
            accent={current.accent}
            profile={current.profile}
            onRetry={retryCurrent}
            onNext={() => { hapticTap(); advance(); }}
            lang={lang}
            t={t}
            f={f}
          />
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

function MistakeInsightModal({
  insight,
  accent,
  profile,
  onRetry,
  onNext,
  lang,
  t,
  f,
}: {
  insight: MistakeInsight | null;
  accent: string;
  profile?: PosWorkoutProfile | null;
  onRetry: () => void;
  onNext: () => void;
  lang: Lang;
  t: any;
  f: any;
}) {
  return (
    <Modal visible={!!insight} transparent animationType="fade" onRequestClose={onNext}>
      <View style={styles.modalRoot} testID="trainer-mistake-insight-modal">
        <Pressable style={StyleSheet.absoluteFill} onPress={onNext} />
        {insight ? (
          <View testID="trainer-mistake-insight-sheet" style={[styles.insightSheet, { backgroundColor: t.bgCard, borderColor: accent + '66' }]}>
            <View style={[styles.insightIcon, { backgroundColor: accent + '22', borderColor: accent + '66' }]}>
              <Ionicons name="analytics" size={22} color={accent} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
              {insight.title}
            </Text>
            {profile && (
              <View style={[styles.posInsight, { backgroundColor: profile.accent + '12', borderColor: profile.accent + '35' }]}>
                <Ionicons name={profile.icon as keyof typeof Ionicons.glyphMap} size={16} color={profile.accent} />
                <Text style={{ color: t.textSecond, fontSize: f.caption, flex: 1, lineHeight: f.caption * 1.4 }}>
                  {profile.title[lang]} - {profile.mistakeWhy[lang]}
                </Text>
              </View>
            )}
            <View style={[styles.correctBox, { backgroundColor: '#40C08018', borderColor: '#40C08055' }]}>
              <Text style={{ color: '#40C080', fontSize: f.label, fontWeight: '900', textTransform: 'uppercase' }}>
                {insight.correctLabel}
              </Text>
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', marginTop: 4, lineHeight: f.bodyLg * 1.25 }}>
                {insight.correctValue}
              </Text>
            </View>
            <Text style={{ color: t.textSecond, fontSize: f.sub, lineHeight: f.sub * 1.45 }}>
              {insight.why}
            </Text>
            <View style={[styles.nextHint, { backgroundColor: accent + '12', borderColor: accent + '35' }]}>
              <Ionicons name="refresh" size={16} color={accent} />
              <Text style={{ color: t.textMuted, fontSize: f.caption, flex: 1, lineHeight: f.caption * 1.4 }}>
                {insight.next}
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={onRetry} activeOpacity={0.86} style={[styles.secondaryBtn, { borderColor: accent + '66', backgroundColor: accent + '14' }]}>
                <Text style={{ color: accent, fontSize: f.sub, fontWeight: '900' }}>
                  {triLang(lang, {
                    ru: 'Повторить',
                    uk: 'Повторити',
                    es: 'Repetir',
                    'pt-BR': "Repetir",
                    vi: "Lặp lại",
                    id: "Ulangi",
                    tr: "Tekrar et",
                    pl: "Powtórz",
                  })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onNext} activeOpacity={0.86} style={[styles.nextBtn, { backgroundColor: accent }]}>
                <Text style={{ color: '#fff', fontSize: f.sub, fontWeight: '900' }}>
                  {triLang(lang, {
                    ru: 'Дальше',
                    uk: 'Далі',
                    es: 'Siguiente',
                    'pt-BR': "Próximo",
                    vi: "Tiếp theo",
                    id: "Berikutnya",
                    tr: "İleri",
                    pl: "Dalej",
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function ReportMetric({ label, value, color, t, f }: { label: string; value: string; color: string; t: any; f: any }) {
  return (
    <View style={[styles.reportMetric, { backgroundColor: t.bgCard, borderColor: color + '44' }]}>
      <Text style={{ color, fontSize: f.numLg, fontWeight: '900' }}>{value}</Text>
      <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  progress: { height: 6, borderRadius: 999, marginHorizontal: 16, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  body: { flex: 1, padding: 16, justifyContent: 'center', gap: 14 },
  coachStrip: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  card: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 13, minHeight: 248, justifyContent: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardMetaLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  typeBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  posBadge: {
    maxWidth: '72%',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mistakeBadge: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexShrink: 0,
  },
  helperBox: {
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  drillChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7,
  },
  drillChip: {
    maxWidth: '48%',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  option: { borderRadius: 15, borderWidth: 1, padding: 15, minHeight: 56, justifyContent: 'center' },
  report: { flex: 1, padding: 16, gap: 12, justifyContent: 'center' },
  reportHero: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 10,
    alignItems: 'center',
  },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reportMetric: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    minHeight: 76,
    justifyContent: 'center',
  },
  reportPanel: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 28 },
  attentionDot: { width: 7, height: 7, borderRadius: 4 },
  reportActions: { flexDirection: 'row', gap: 10 },
  doneIcon: { width: 64, height: 64, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { minHeight: 52, borderRadius: 16, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  insightSheet: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 13,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  insightIcon: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctBox: {
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 13,
  },
  posInsight: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  nextHint: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
