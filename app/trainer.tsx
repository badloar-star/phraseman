import React, { useCallback, useMemo, useState } from 'react';
import Reanimated from 'react-native-reanimated';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { Image } from 'expo-image';
import TapScale from '../components/TapScale';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import ReportErrorButton from '../components/ReportErrorButton';
import { TrainerLoadingView } from '../components/TrainerLoadStates';
import CompassBevel from '../components/CompassBevel';
import { LinearGradient } from '../components/SafeLinearGradient';
import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import { clearTrainerStore, devSeedTrainer, getTrainerDashboard, type TrainerDashboard, type TrainerQueue, } from './trainer_store';
import { ENABLE_DEV_TOOLS } from './config';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { getVerifiedPremiumStatus } from './premium_guard';
import { computeFrenchPhraseAnalytics } from './french_phrase_analytics';
import { computePhraseAnalytics, type LessonMistakeStat, type PhraseAnalyticsResult, type WordCategoryStat, } from './phrase_analytics';
import StatsPremiumBlur from '../components/StatsPremiumBlur';
import { getDiagnosisTraining } from './diagnosis_trainings';
import { loadResolvedPersonalTrainings, type ResolvedPersonalTrainingsState } from './diagnosis_training_progress';
import { personalPracticeCoachEnabledForTarget } from './personal_practice_target_gate';
import { frenchTrainerGateCopy, trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import { choosePersonalTrainingCandidate } from './personal_training_taxonomy';
import { lessonNameForStudyTarget } from './lesson_titles_for_study_target';
import { isStudyTargetSourceUiLang, type StudyTargetLang } from './study_target_lang_dev';
import { storageStudyTarget } from './target_storage_keys';
import { GOLD_RICH } from '../constants/goldTheme';
import { COMPASS_GRADIENTS, COMPASS_RICH, COMPASS_SURFACE_LOCATIONS, compassShadow } from '../constants/compassTheme';
import { trainerThemeIconSource, type TrainerThemeIconKind } from '../constants/trainerThemeIcons';
import type { ThemeMode } from '../constants/theme';
import { safeRouterBack } from './navigation_back';
import ErrorBoundary from '../components/ErrorBoundary';
type RoutePath = '/trainer_words_session' | '/trainer_phrases_session' | '/trainer_arena_session';
type PlannedCopy = { ru: string; uk: string; es: string } & Partial<Record<PlannedInterfaceLang, string>>;
interface SectionInfo {
    queue: TrainerQueue;
    icon: keyof typeof Ionicons.glyphMap;
    title: PlannedCopy;
    sub: PlannedCopy;
    method: PlannedCopy;
    accent: string;
    route: RoutePath;
}
interface PracticeOption {
    id: 'context' | 'words';
    queues: TrainerQueue[];
    iconKind: TrainerThemeIconKind;
    accent: string;
}

function TrainerThemeIcon({
    kind,
    themeMode,
    size = 52,
}: {
    kind: TrainerThemeIconKind;
    themeMode: ThemeMode;
    size?: number;
}) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        fadeDuration={0}
        contentFit="contain"
        source={trainerThemeIconSource(themeMode, kind)}
        style={{ width: size, height: size }}
      />
    );
}

function CompassTrainerSurface({
    radius,
    selected = false,
    quiet = false,
    physical = false,
}: {
    radius: number;
    selected?: boolean;
    quiet?: boolean;
    physical?: boolean;
}) {
    return (
      <>
        <LinearGradient
          colors={selected ? COMPASS_GRADIENTS.selectedTile : quiet ? COMPASS_GRADIENTS.recessedPanel : COMPASS_GRADIENTS.raisedTile}
          locations={COMPASS_SURFACE_LOCATIONS}
          style={StyleSheet.absoluteFillObject}
        />
        {physical ? (
          <>
            <LinearGradient
              colors={['rgba(255,245,222,0.34)', 'rgba(255,230,181,0.10)', 'rgba(255,255,255,0)']}
              locations={[0, 0.34, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.compassTopShelf, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
            />
            <View style={[styles.compassLeftRail, { backgroundColor: 'rgba(255,230,181,0.22)' }]} />
            <View style={[styles.compassRightRail, { backgroundColor: 'rgba(0,0,0,0.50)' }]} />
            <LinearGradient
              colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.62)']}
              locations={[0, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.compassBottomShelf, { borderBottomLeftRadius: radius, borderBottomRightRadius: radius }]}
            />
          </>
        ) : null}
        <CompassBevel radius={radius} intensity={selected ? 'strong' : quiet ? 'quiet' : 'normal'} />
      </>
    );
}
const SECTIONS: SectionInfo[] = [
    {
        queue: 'phrases',
        icon: 'chatbubbles',
        title: { ru: 'Фразы', uk: 'Фрази', es: 'Frases', 'pt-BR': 'Frases', vi: 'Cụm từ', id: 'Frasa', tr: 'İfadeler', pl: 'Frazy' },
        sub: {
            ru: 'Сборка и пропуски по фразам, где ты ошибался.',
            uk: 'Складання й пропуски у фразах, де ти помилявся.',
            es: 'Construcción y huecos en frases donde fallaste.',
            'pt-BR': 'Montagem e lacunas em frases em que você errou.',
            vi: 'Lắp câu và điền chỗ trống trong những câu bạn đã sai.',
            id: 'Menyusun dan mengisi bagian kosong pada frasa yang pernah salah.',
            tr: 'Hata yaptığın ifadelerde kurma ve boşluk doldurma.',
            pl: 'Układanie i luki w zdaniach, w których były błędy.',
        },
        method: {
            ru: 'Generation practice: вспоминаешь фразу сам, а не узнаешь её глазами.',
            uk: 'Generation practice: згадуєш фразу сам, а не впізнаєш очима.',
            es: 'Práctica generativa: recuerdas la frase, no solo la reconoces.',
            'pt-BR': 'Prática generativa: você lembra a frase, não só a reconhece.',
            vi: 'Luyện gợi nhớ: bạn tự nhớ cụm từ, không chỉ nhận ra bằng mắt.',
            id: 'Latihan generatif: kamu mengingat frasa sendiri, bukan hanya mengenalinya.',
            tr: 'Üretim pratiği: ifadeyi sadece tanımak yerine kendin hatırlarsın.',
            pl: 'Praktyka generowania: przypominasz sobie frazę, nie tylko ją rozpoznajesz.',
        },
        accent: '#2DD4BF',
        route: '/trainer_phrases_session',
    },
    {
        queue: 'words',
        icon: 'library',
        title: { ru: 'Слова', uk: 'Слова', es: 'Palabras', 'pt-BR': 'Palavras', vi: 'Từ vựng', id: 'Kata', tr: 'Kelimeler', pl: 'Słowa' },
        sub: {
            ru: 'Слова и глаголы, где ошибка повторилась.',
            uk: 'Слова й дієслова, де помилка повторилась.',
            es: 'Palabras y verbos donde el error se repitió.',
            'pt-BR': 'Palavras e verbos em que o erro se repetiu.',
            vi: 'Từ và động từ mà lỗi đã lặp lại.',
            id: 'Kata dan verba yang kesalahannya berulang.',
            tr: 'Hatanın tekrarlandığı kelimeler ve fiiller.',
            pl: 'Słowa i czasowniki, przy których błąd się powtórzył.',
        },
        method: {
            ru: 'Active recall: быстро проверяешь перевод и закрепляешь слабый словарь.',
            uk: 'Active recall: швидко перевіряєш переклад і закріплюєш слабкий словник.',
            es: 'Recuerdo activo: revisas traducción y vocabulario débil.',
            'pt-BR': 'Recordação ativa: revise rapidamente a tradução e fixe o vocabulário fraco.',
            vi: 'Gợi nhớ chủ động: kiểm tra nhanh bản dịch và củng cố từ vựng yếu.',
            id: 'Active recall: cepat memeriksa terjemahan dan menguatkan kosakata yang lemah.',
            tr: 'Aktif hatırlama: çeviriyi hızla kontrol edip zayıf kelimeleri pekiştirirsin.',
            pl: 'Aktywne przypominanie: szybko sprawdzasz tłumaczenie i wzmacniasz słabe słownictwo.',
        },
        accent: '#60A5FA',
        route: '/trainer_words_session',
    },
    {
        queue: 'arena',
        icon: 'shield-checkmark',
        title: { ru: 'Фразы', uk: 'Фрази', es: 'Frases', 'pt-BR': 'Frases', vi: 'Cụm từ', id: 'Frasa', tr: 'İfadeler', pl: 'Frazy' },
        sub: {
            ru: 'Фразы из быстрых тренировок без давления.',
            uk: 'Фрази зі швидких тренувань без тиску.',
            es: 'Frases de práctica rápida sin presión.',
            'pt-BR': 'Frases de treinos rápidos sem pressão.',
            vi: 'Cụm từ từ các buổi luyện nhanh không áp lực.',
            id: 'Frasa dari latihan cepat tanpa tekanan.',
            tr: 'Baskısız hızlı antrenmanlardan ifadeler.',
            pl: 'Frazy z szybkich ćwiczeń bez presji.',
        },
        method: {
            ru: 'Transfer practice: переносишь знание в быстрые ответы.',
            uk: 'Transfer practice: переносиш знання у швидкі відповіді.',
            es: 'Práctica de transferencia: llevas conocimiento a respuestas rápidas.',
            'pt-BR': 'Prática de transferência: você leva o conhecimento para respostas rápidas.',
            vi: 'Luyện chuyển giao: đưa kiến thức vào câu trả lời nhanh.',
            id: 'Latihan transfer: membawa pengetahuan ke jawaban cepat.',
            tr: 'Aktarım pratiği: bilgiyi hızlı cevaplara taşırsın.',
            pl: 'Praktyka transferu: przenosisz wiedzę do szybkich odpowiedzi.',
        },
        accent: '#FB7185',
        route: '/trainer_arena_session',
    },
];
const PRACTICE_OPTIONS: PracticeOption[] = [
    {
        id: 'context',
        queues: ['phrases', 'arena'],
        iconKind: 'phrases',
        accent: '#2DD4BF',
    },
    {
        id: 'words',
        queues: ['words'],
        iconKind: 'words',
        accent: '#60A5FA',
    },
];
const recommendedStartText = (queue: TrainerQueue | null, lang: Lang): string => {
    if (queue === 'phrases') {
        return triLang(lang, {
            ru: 'Сначала повтори фразы. Здесь самые свежие ошибки в контексте.',
            uk: 'Спочатку повтори фрази. Тут найсвіжіші помилки в контексті.',
            es: 'Empieza con frases: son tus errores más recientes en contexto.',
            'pt-BR': "Comece pelas frases. Aqui estão os erros mais recentes em contexto.",
            vi: "Hãy bắt đầu với cụm câu. Đây là những lỗi mới nhất trong ngữ cảnh.",
            id: "Mulai dari frasa. Di sini ada kesalahan terbaru dalam konteks.",
            tr: "Önce ifadeleri tekrar et. Burada bağlam içindeki en yeni hataların var.",
            pl: "Zacznij od fraz. Tu są najświeższe błędy w kontekście.",
        });
    }
    if (queue === 'words') {
        return triLang(lang, {
            ru: 'Сначала повтори слова. Это самый быстрый способ закрыть свежие ошибки.',
            uk: 'Спочатку повтори слова. Це найшвидший спосіб закрити свіжі помилки.',
            es: 'Empieza con palabras: es la forma más rápida de cerrar errores recientes.',
            'pt-BR': "Comece pelas palavras. É o jeito mais rápido de fechar erros recentes.",
            vi: "Hãy bắt đầu với từ vựng. Đây là cách nhanh nhất để xử lý lỗi mới.",
            id: "Mulai dari kata. Ini cara tercepat untuk menutup kesalahan terbaru.",
            tr: "Önce kelimeleri tekrar et. Yeni hataları kapatmanın en hızlı yolu bu.",
            pl: "Zacznij od słów. To najszybszy sposób na domknięcie świeżych błędów.",
        });
    }
    if (queue === 'arena') {
        return triLang(lang, {
            ru: 'Сначала повтори фразы. Там сейчас самые свежие ошибки.',
            uk: 'Спочатку повтори фрази. Там зараз найсвіжіші помилки.',
            es: 'Empieza con frases: ahí están tus errores más recientes.',
            'pt-BR': "Comece pelas frases. Ali estão os erros mais recentes agora.",
            vi: "Hãy bắt đầu với cụm câu. Hiện các lỗi mới nhất nằm ở đó.",
            id: "Mulai dari frasa. Di sana ada kesalahan terbaru saat ini.",
            tr: "Önce ifadeleri tekrar et. En yeni hatalar şu anda orada.",
            pl: "Zacznij od fraz. Tam są teraz najświeższe błędy.",
        });
    }
    return triLang(lang, {
        ru: 'Начни с короткой тренировки по свежим ошибкам.',
        uk: 'Почни з короткого тренування за свіжими помилками.',
        es: 'Empieza con un repaso corto de errores recientes.',
        'pt-BR': "Comece com um treino curto dos erros recentes.",
        vi: "Bắt đầu bằng một bài luyện ngắn với các lỗi mới.",
        id: "Mulai dengan latihan singkat untuk kesalahan terbaru.",
        tr: "Yeni hatalar için kısa bir antrenmanla başla.",
        pl: "Zacznij od krótkiego treningu świeżych błędów.",
    });
};
const todayReviewLabel = (count: number, lang: Lang): string => triLang(lang, {
    ru: count === 1 ? 'на повтор сегодня' : 'на повтор сегодня',
    uk: count === 1 ? 'на повтор сьогодні' : 'на повтор сьогодні',
    es: count === 1 ? 'para repasar hoy' : 'para repasar hoy',
    'pt-BR': count === 1 ? 'para revisar hoje' : 'para revisar hoje',
    vi: count === 1 ? 'cần ôn hôm nay' : 'cần ôn hôm nay',
    id: count === 1 ? 'untuk diulas hari ini' : 'untuk diulas hari ini',
    tr: count === 1 ? 'bugün tekrar için' : 'bugün tekrar için',
    pl: count === 1 ? 'do powtórki dziś' : 'do powtórki dziś',
});
const scheduledLaterText = (count: number, lang: Lang): string => triLang(lang, {
    ru: `Еще ${count} уже отложено на следующие повторения.`,
    uk: `Ще ${count} уже відкладено на наступні повторення.`,
    es: `${count} más ya están programados para próximos repasos.`,
    'pt-BR': `Mais ${count} já foram agendados para próximas revisões.`,
    vi: `${count} mục nữa đã được lên lịch cho các lần ôn tiếp theo.`,
    id: `${count} lagi sudah dijadwalkan untuk ulasan berikutnya.`,
    tr: `${count} öğe sonraki tekrarlar için planlandı.`,
    pl: `Jeszcze ${count} zaplanowano na kolejne powtórki.`,
});
const smartMixStartText = (lang: Lang): string => triLang(lang, {
    ru: 'Начни короткую тренировку по самым важным ошибкам. Порядок уже выбран автоматически.',
    uk: 'Почни коротке тренування за найважливішими помилками. Порядок уже обрано автоматично.',
    es: 'Start a short review of your most important mistakes. The order is already picked.',
    'pt-BR': "Comece um treino curto com seus erros mais importantes. A ordem já foi escolhida automaticamente.",
    vi: "Bắt đầu một bài luyện ngắn với những lỗi quan trọng nhất. Thứ tự đã được chọn tự động.",
    id: "Mulai latihan singkat untuk kesalahan paling penting. Urutannya sudah dipilih otomatis.",
    tr: "En önemli hatalarınla kısa bir antrenmana başla. Sıralama otomatik seçildi.",
    pl: "Zacznij krótki trening najważniejszych błędów. Kolejność została dobrana automatycznie.",
});
const queueTitle = (queue: TrainerQueue, lang: Lang): string => {
    if (queue === 'phrases')
        return triLang(lang, {
            ru: 'Фразы',
            uk: 'Фрази',
            es: 'Frases',
            'pt-BR': "Frases",
            vi: "Cụm câu",
            id: "Frasa",
            tr: "İfadeler",
            pl: "Frazy",
        });
    if (queue === 'words')
        return triLang(lang, {
            ru: 'Слова',
            uk: 'Слова',
            es: 'Palabras',
            'pt-BR': "Palavras",
            vi: "Từ vựng",
            id: "Kata",
            tr: "Kelimeler",
            pl: "Słowa",
        });
    return triLang(lang, {
        ru: 'Фразы',
        uk: 'Фрази',
        es: 'Frases',
        'pt-BR': "Frases",
        vi: "Cụm câu",
        id: "Frasa",
        tr: "İfadeler",
        pl: "Frazy",
    });
};
const queueSubtitle = (queue: TrainerQueue, lang: Lang): string => {
    if (queue === 'phrases')
        return triLang(lang, {
            ru: 'Повтори ошибки в контексте.',
            uk: 'Повтори помилки в контексті.',
            es: 'Review mistakes in context.',
            'pt-BR': "Revise erros em contexto.",
            vi: "Ôn lại trong ngữ cảnh.",
            id: "Ulas kesalahan dalam konteks.",
            tr: "Hataları bağlam içinde tekrar et.",
            pl: "Powtórz błędy w kontekście.",
        });
    if (queue === 'words')
        return triLang(lang, {
            ru: 'Повтори слова, которые стоит закрепить.',
            uk: 'Повтори слова, які варто закріпити.',
            es: 'Review words that need another pass.',
            'pt-BR': "Revise palavras que precisam ser fixadas.",
            vi: "Ôn các từ cần củng cố.",
            id: "Ulas kata yang perlu diperkuat.",
            tr: "Pekiştirmen gereken kelimeleri tekrar et.",
            pl: "Powtórz słowa, które warto utrwalić.",
        });
    return triLang(lang, {
        ru: 'Повтори ошибки без таймера и давления.',
        uk: 'Повтори помилки без таймера й тиску.',
        es: 'Review mistakes without timer or pressure.',
        'pt-BR': "Revise erros sem cronômetro nem pressão.",
        vi: "Ôn lại không có hạn giờ hay áp lực.",
        id: "Ulas kesalahan tanpa timer atau tekanan.",
        tr: "Hataları zamanlayıcı ve baskı olmadan tekrar et.",
        pl: "Powtórz błędy bez timera i presji.",
    });
};
const optionTitle = (option: PracticeOption, lang: Lang): string => {
    if (option.id === 'context') {
        return triLang(lang, {
            ru: 'Фразы',
            uk: 'Фрази',
            es: 'Frases',
            'pt-BR': "Frases",
            vi: "Cụm câu",
            id: "Frasa",
            tr: "İfadeler",
            pl: "Frazy",
        });
    }
    return queueTitle('words', lang);
};
const optionSubtitle = (option: PracticeOption, lang: Lang): string => {
    if (option.id === 'context') {
        return triLang(lang, {
            ru: 'Повтори ошибки в контексте.',
            uk: 'Повтори помилки в контексті.',
            es: 'Review mistakes in context.',
            'pt-BR': "Revise erros em contexto.",
            vi: "Ôn lại trong ngữ cảnh.",
            id: "Ulas kesalahan dalam konteks.",
            tr: "Hataları bağlam içinde tekrar et.",
            pl: "Powtórz błędy w kontekście.",
        });
    }
    return queueSubtitle('words', lang);
};
const EMPTY_TRAINER_DASHBOARD: TrainerDashboard = {
    due: { words: 0, phrases: 0, arena: 0 },
    totalDue: 0,
    totalTracked: 0,
    active: 0,
    future: 0,
    archived: 0,
    hardestQueue: null,
    hardestMistakes: 0,
    hardestCategory: null,
    hardestCategoryMistakes: 0,
    hardestCategoryPriority: 0,
    hardestCategoryRecovery: 0,
    memoryScore: 0,
    posMasteryXp: 0,
    posMasteryTop: [],
    nextQueue: null,
};
const CATEGORY_LABELS_INLINE: Record<string, {
    ru: string;
    uk: string;
    es: string;
} & Record<PlannedInterfaceLang, string>> = {
    verb: { ru: 'Глаголы', uk: 'Дієслова', es: 'Verbos', 'pt-BR': 'Verbos', vi: 'Động từ', id: 'Kata kerja', tr: 'Fiiller', pl: 'Czasowniki' },
    noun: { ru: 'Существительные', uk: 'Іменники', es: 'Sustantivos', 'pt-BR': 'Substantivos', vi: 'Danh từ', id: 'Kata benda', tr: 'İsimler', pl: 'Rzeczowniki' },
    pronoun: { ru: 'Местоимения', uk: 'Займенники', es: 'Pronombres', 'pt-BR': 'Pronomes', vi: 'Đại từ', id: 'Kata ganti', tr: 'Zamirler', pl: 'Zaimki' },
    adjective: { ru: 'Прилагательные', uk: 'Прикметники', es: 'Adjetivos', 'pt-BR': 'Adjetivos', vi: 'Tính từ', id: 'Kata sifat', tr: 'Sıfatlar', pl: 'Przymiotniki' },
    adverb: { ru: 'Наречия', uk: 'Прислівники', es: 'Adverbios', 'pt-BR': 'Advérbios', vi: 'Trạng từ', id: 'Kata keterangan', tr: 'Zarflar', pl: 'Przysłówki' },
    preposition: { ru: 'Предлоги', uk: 'Прийменники', es: 'Preposiciones', 'pt-BR': 'Preposições', vi: 'Giới từ', id: 'Preposisi', tr: 'Edatlar', pl: 'Przyimki' },
    article: { ru: 'Артикли', uk: 'Артиклі', es: 'Artículos', 'pt-BR': 'Artigos', vi: 'Mạo từ', id: 'Artikel', tr: 'Artikeller', pl: 'Przedimki' },
    'to-be': { ru: 'Глагол to be', uk: 'Дієслово to be', es: 'Verbo to be', 'pt-BR': 'Verbo to be', vi: 'Động từ to be', id: 'Kata kerja to be', tr: 'To be fiili', pl: 'Czasownik to be' },
    conjunction: { ru: 'Союзы', uk: 'Сполучники', es: 'Conjunciones', 'pt-BR': 'Conjunções', vi: 'Liên từ', id: 'Konjungsi', tr: 'Bağlaçlar', pl: 'Spójniki' },
    modal: { ru: 'Модальные', uk: 'Модальні', es: 'Modales', 'pt-BR': 'Modais', vi: 'Động từ khuyết thiếu', id: 'Modal', tr: 'Modal fiiller', pl: 'Czasowniki modalne' },
    existential: { ru: 'There is/are', uk: 'There is/are', es: 'There is/are', 'pt-BR': 'There is/are', vi: 'There is/are', id: 'There is/are', tr: 'There is/are', pl: 'There is/are' },
    phrasal_particle: { ru: 'Частицы', uk: 'Частки', es: 'Partículas', 'pt-BR': 'Partículas', vi: 'Tiểu từ', id: 'Partikel', tr: 'Parçacıklar', pl: 'Partykuły' },
    modifier: { ru: 'Modifiers', uk: 'Modifiers', es: 'Modificadores', 'pt-BR': 'Modificadores', vi: 'Từ bổ nghĩa', id: 'Modifier', tr: 'Niteleyiciler', pl: 'Modyfikatory' },
    determiner: { ru: 'Determiners', uk: 'Determiners', es: 'Determinantes', 'pt-BR': 'Determinantes', vi: 'Từ hạn định', id: 'Determiner', tr: 'Belirleyiciler', pl: 'Określniki' },
    other: { ru: 'Другое', uk: 'Інше', es: 'Otros', 'pt-BR': 'Outros', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' },
};
const TRAINER_LESSON_TITLE_UNAVAILABLE: Record<PlannedInterfaceLang, string> = {
    'pt-BR': 'Título da aula indisponível',
    vi: 'Chưa có tiêu đề bài học',
    id: 'Judul pelajaran belum tersedia',
    tr: 'Ders başlığı kullanılamıyor',
    pl: 'Tytuł lekcji jest niedostępny',
};
function isTrainerPlannedLang(lang: Lang): lang is PlannedInterfaceLang {
    return lang === 'pt-BR' || lang === 'vi' || lang === 'id' || lang === 'tr' || lang === 'pl';
}
export function trainerAnalyticsLessonTitle(stat: LessonMistakeStat, lang: Lang, studyTarget: StudyTargetLang): string {
    const localized = lessonNameForStudyTarget(lang, studyTarget, stat.lessonId)?.trim();
    if (localized) return localized;
    if (isTrainerPlannedLang(lang)) return TRAINER_LESSON_TITLE_UNAVAILABLE[lang];
    let legacyTitle = stat.lessonNameRU;
    if (lang === 'uk') legacyTitle = stat.lessonNameUK;
    if (lang === 'es') legacyTitle = stat.lessonNameES;
    return legacyTitle || `Lesson ${stat.lessonId}`;
}
function resolvedDiagnosisIdSet(resolved: ResolvedPersonalTrainingsState | null): Set<string> {
    return new Set(Object.keys(resolved?.diagnoses ?? {}));
}
function chooseInlineDiagnosis(stat: WordCategoryStat, resolved: ResolvedPersonalTrainingsState | null): string | null {
    const words = new Set(stat.topWords.map((word) => word.trim().toLowerCase()).filter(Boolean));
    const has = (...candidates: string[]) => candidates.some((word) => words.has(word));
    const hasPart = (...parts: string[]) => [...words].some((word) => parts.some((part) => word.includes(part)));
    const candidates: Record<string, string[]> = {
        article: has('a', 'an') ? ['article_a_an'] : has('the') ? ['article_the_specific'] : ['article_zero', 'article_a_an'],
        preposition: has('for', 'since') ? ['preposition_duration_for_since'] : has('to', 'into', 'from', 'out of') ? ['preposition_direction_to_into_from'] : ['preposition_time_in_on_at', 'preposition_common_verb_patterns'],
        verb: has('am', 'is', 'are', 'be', 'been') ? ['to_be_present_agreement'] : has('was', 'were') ? ['verb_was_were'] : has('do', 'does', "don't", "doesn't", 'did') ? ['verb_present_simple_negative_question'] : hasPart('ing') ? ['verb_present_continuous_basic'] : ['verb_present_simple_statement', 'verb_third_person'],
        'to-be': ['to_be_present_agreement', 'verb_was_were'],
        noun: ['noun_singular_plural_basic'],
        pronoun: has('my', 'mine', 'your', 'yours', 'his', 'her', 'hers', 'our', 'ours', 'their', 'theirs') ? ['pronoun_possessive'] : ['pronoun_case'],
        adjective: ['adjective_comparison', 'adjective_vs_adverb'],
        adverb: ['adverb_frequency_position', 'adjective_vs_adverb'],
        modal: has('may', 'might') ? ['modal_may_might_probability'] : has('can', 'could') ? ['modal_can_could_ability_request'] : has('should', 'must') ? ['modal_should_must_have_to'] : ['modal_base_form'],
        modifier: has('very', 'really', 'quite') ? ['modifier_very_really_quite'] : ['too_enough'],
        syntax: ['word_order_basic_statement', 'word_order_basic_question'],
        conjunction: ['conjunction_logic'],
        determiner: has('this', 'that', 'these', 'those') ? ['determiner_this_that_these_those'] : ['quantifier_some_any'],
        existential: ['there_is_are'],
    };
    const routedId = choosePersonalTrainingCandidate(candidates[stat.category] ?? [], resolvedDiagnosisIdSet(resolved));
    return routedId && getDiagnosisTraining(routedId) ? routedId : null;
}
function InlineCategoryRow({ stat, lang, t, f, router, resolvedPersonalTrainings, personalTrainingEnabled = true, isGoldTheme = false, isCompassTheme = false }: {
    stat: WordCategoryStat;
    lang: string;
    t: ReturnType<typeof useTheme>['theme'];
    f: ReturnType<typeof useTheme>['f'];
    router: ReturnType<typeof useRouter>;
    resolvedPersonalTrainings: ResolvedPersonalTrainingsState | null;
    personalTrainingEnabled?: boolean;
    isGoldTheme?: boolean;
    isCompassTheme?: boolean;
}) {
    const categoryCopy = CATEGORY_LABELS_INLINE[stat.category];
    const label = categoryCopy
        ? triLang(lang as any, {
            ru: categoryCopy.ru,
            uk: categoryCopy.uk,
            es: categoryCopy.es,
            'pt-BR': categoryCopy['pt-BR'],
            vi: categoryCopy.vi,
            id: categoryCopy.id,
            tr: categoryCopy.tr,
            pl: categoryCopy.pl,
        })
        : triLang(lang as any, {
            ru: stat.category,
            uk: stat.category,
            es: stat.category,
            'pt-BR': stat.category,
            vi: stat.category,
            id: stat.category,
            tr: stat.category,
            pl: stat.category,
        });
    const priorityScore = stat.priorityScore ?? stat.weaknessScore;
    const recoveryScore = stat.recoveryScore ?? 0;
    const isWeak = priorityScore >= 55 || (stat.pct >= 15 && recoveryScore < 25);
    const diagnosisId = isWeak && personalTrainingEnabled ? chooseInlineDiagnosis(stat, resolvedPersonalTrainings) : null;
    const accent = isCompassTheme ? COMPASS_RICH.champagne : isGoldTheme ? GOLD_RICH.metalGold : t.accent;
    const rowBg = isCompassTheme ? COMPASS_RICH.charcoalRaised : isGoldTheme ? 'rgba(14,12,8,0.92)' : t.bgSurface;
    const rowBorder = isCompassTheme
        ? (isWeak ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet)
        : isGoldTheme
        ? (isWeak ? GOLD_RICH.hairline : GOLD_RICH.hairlineQuiet)
        :
            isWeak ? t.accent + '55' : t.border;
    const inner = (<View style={[styles.analyticsRow, isCompassTheme && styles.compassClip, isCompassTheme && compassShadow(1), { backgroundColor: rowBg, borderColor: rowBorder, borderRadius: isCompassTheme ? 8 : 12 }]}>
      {isCompassTheme ? <CompassTrainerSurface radius={8} quiet={!isWeak} selected={isWeak} physical /> : null}
      <Text style={[styles.analyticsRowPct, { color: t.textPrimary, fontSize: f.bodyLg }]} numberOfLines={1}>{stat.pct}%</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
        <View style={styles.miniProgressBg}>
          <View style={[styles.miniProgressFill, { width: `${Math.min(stat.pct, 100)}%`, backgroundColor: isWeak ? accent : isCompassTheme ? COMPASS_RICH.peach : isGoldTheme ? GOLD_RICH.agedGold : 'rgba(255,255,255,0.45)' }]}/>
        </View>
      </View>
      {diagnosisId && <Ionicons name="chevron-forward" size={14} color={accent}/>}
    </View>);
    if (!diagnosisId)
        return inner;
    return (<TouchableOpacity onPress={() => {
            hapticTap();
            router.push({
                pathname: '/problem_coach',
                params: { microDiagnosisId: diagnosisId, category: stat.category },
            } as any);
        }} activeOpacity={0.86}>
      {inner}
    </TouchableOpacity>);
}
function TrainerScreenInner() {
    const router = useRouter();
    const { theme: t, f, themeMode } = useTheme();
    const isGoldTheme = themeMode === 'gold';
    const isCompassTheme = false;
    const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
    const { lang } = useLang();
    const { studyTarget } = useStudyTarget();
    const sourceLocale = isStudyTargetSourceUiLang(lang) ? lang : 'ru';
    const [dashboard, setDashboard] = useState<TrainerDashboard>(EMPTY_TRAINER_DASHBOARD);
    const [loading, setLoading] = useState(true);
    const [initialDataReady, setInitialDataReady] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [hasPremium, setHasPremium] = useState(false);
    const [analytics, setAnalytics] = useState<PhraseAnalyticsResult | null>(null);
    const [resolvedPersonalTrainings, setResolvedPersonalTrainings] = useState<ResolvedPersonalTrainingsState | null>(null);
    const [analyticsTab, setAnalyticsTab] = useState<'categories' | 'lessons' | 'phrases'>('categories');
    const personalPracticeCoachEnabled = personalPracticeCoachEnabledForTarget(studyTarget);
    const trainerSessionEnabled = trainerSessionContentAvailableForTarget(studyTarget);
    const trainerGateCopy = frenchTrainerGateCopy(lang);
    const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
    const bouncyStyle = useBouncyStyle(bouncyStretch);
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [dash, premium, analyticsResult, resolved] = await Promise.all([
                getTrainerDashboard(studyTarget, sourceLocale),
                getVerifiedPremiumStatus().catch(() => false),
                trainerSessionEnabled
                    ? storageStudyTarget(studyTarget) === 'fr'
                        ? computeFrenchPhraseAnalytics({ sourceLocale }).catch(() => null)
                        : computePhraseAnalytics().catch(() => null)
                    : Promise.resolve(null),
                personalPracticeCoachEnabled ? loadResolvedPersonalTrainings({ studyTarget, sourceLocale }) : Promise.resolve(null),
            ]);
            setDashboard(dash);
            setHasPremium(premium);
            setAnalytics(analyticsResult);
            setResolvedPersonalTrainings(resolved);
            setLoadError(false);
        }
        catch {
            // Keep the previous dashboard on refresh failure so the scroll layout does not collapse.
            // Surface a retry affordance only when we never managed an initial load — otherwise the
            // stale-but-valid dashboard stays on screen and a transient refresh hiccup is invisible.
            setLoadError(prev => prev || !initialDataReady);
        }
        finally {
            setInitialDataReady(true);
            setLoading(false);
        }
    }, [personalPracticeCoachEnabled, sourceLocale, studyTarget, trainerSessionEnabled, initialDataReady]);
    useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));
    const total = dashboard?.totalDue ?? 0;
    const nextOption = useMemo(() => (dashboard.nextQueue === 'words' ? PRACTICE_OPTIONS[1] : PRACTICE_OPTIONS[0]), [dashboard]);
    const trainerRadius = isCompassTheme ? 10 : 18;
    const trainerSmallRadius = isCompassTheme ? 7 : 14;
    const trainerPillRadius = isCompassTheme ? 8 : 999;
    const trainerCardBg = isCompassTheme ? COMPASS_RICH.charcoalRaised : isGoldTheme ? 'rgba(8,8,6,0.92)' : t.bgCard;
    const trainerRowBg = isCompassTheme ? COMPASS_RICH.charcoalSoft : isGoldTheme ? 'rgba(14,12,8,0.92)' : t.bgSurface;
    const trainerBorder = isCompassTheme ? COMPASS_RICH.hairlineQuiet : isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border;
    const trainerAccent = isCompassTheme ? COMPASS_RICH.champagne : isGoldTheme ? GOLD_RICH.metalGold : hasPremium ? '#FACC15' : nextOption.accent;
    const primaryAccent = trainerAccent;
    const primaryTextColor = isCompassTheme || isGoldTheme || (hasPremium) ? '#17130A' : '#fff';
    const shownAnalytics: PhraseAnalyticsResult = analytics ?? {
        categoryStats: [],
        lessonStats: [],
        topMistakePhrases: [],
        insights: [],
        totalMistakes: 0,
        windowDays: 30,
    };
    const hasAnalyticsMistakes = shownAnalytics.totalMistakes > 0;
    const openPremium = useCallback((context = 'trainer') => {
        hapticTap();
        router.push({ pathname: '/premium_modal', params: { context } } as any);
    }, [router]);
    const startSmartMix = useCallback(() => {
        hapticTap();
        if (total <= 0)
            return;
        const targetQueue = dashboard.nextQueue && (dashboard.due[dashboard.nextQueue] ?? 0) > 0
            ? dashboard.nextQueue
            : SECTIONS.find(section => (dashboard.due[section.queue] ?? 0) > 0)?.queue;
        const section = SECTIONS.find(item => item.queue === targetQueue);
        if (!section)
            return;
        router.push(section.route as any);
    }, [dashboard, router, total]);
    const startQueue = useCallback(async (section: SectionInfo) => {
        const count = dashboard?.due[section.queue] ?? 0;
        hapticTap();
        if (count <= 0)
            return;
        router.push(section.route as any);
    }, [dashboard, router]);
    const startPracticeOption = useCallback(async (option: PracticeOption) => {
        const recommendedQueue = dashboard.nextQueue && option.queues.includes(dashboard.nextQueue) && (dashboard.due[dashboard.nextQueue] ?? 0) > 0
            ? dashboard.nextQueue
            : null;
        const targetQueue = recommendedQueue ?? option.queues.find(queue => (dashboard?.due[queue] ?? 0) > 0);
        const section = SECTIONS.find(item => item.queue === targetQueue);
        if (!section) {
            hapticTap();
            return;
        }
        await startQueue(section);
    }, [dashboard, startQueue]);
    const openLessons = useCallback(() => {
        hapticTap();
        router.push('/(tabs)/lessons' as any);
    }, [router]);
    if (loading && !initialDataReady) {
        return <TrainerLoadingView lang={lang} accent={trainerAccent}/>;
    }
    if (loadError && !initialDataReady) {
        return (<ScreenGradient>
          <SafeAreaView style={{ flex: 1 }} testID="screen-trainer-error">
            <ContentWrap>
              <View style={styles.headerRow}>
                <TapScale accessibilityRole="button" accessibilityLabel="Back" onPress={() => safeRouterBack(router)} style={{ padding: 4, marginRight: 12 }}>
                  <Ionicons name="chevron-back" size={28} color={sx.primary}/>
                </TapScale>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.headerTitle, { color: sx.primary, fontSize: f.h2 }]}>
                    {triLang(lang, {
                      ru: 'Моя практика', uk: 'Моя практика', es: 'Mi práctica',
                      'pt-BR': 'Minha prática', vi: 'Luyện tập của tôi', id: 'Latihanku',
                      tr: 'Pratiğim', pl: 'Moja praktyka',
                    })}
                  </Text>
                </View>
              </View>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
                <Ionicons name="cloud-offline-outline" size={48} color={t.textMuted}/>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Не удалось загрузить практику', uk: 'Не вдалося завантажити практику',
                    es: 'No se pudo cargar la práctica', 'pt-BR': 'Não foi possível carregar a prática',
                    vi: 'Không tải được phần luyện tập', id: 'Gagal memuat latihan',
                    tr: 'Pratik yüklenemedi', pl: 'Nie udało się wczytać praktyki',
                  })}
                </Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => { hapticTap(); void loadData(); }} style={{ backgroundColor: trainerAccent, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 }}>
                  <Text style={{ color: primaryTextColor, fontSize: f.bodyLg, fontWeight: '800' }}>
                    {triLang(lang, {
                      ru: 'Повторить', uk: 'Повторити', es: 'Reintentar', 'pt-BR': 'Tentar novamente',
                      vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </ContentWrap>
          </SafeAreaView>
        </ScreenGradient>);
    }
    return (<ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} testID="screen-trainer">
        <ContentWrap>
          <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>
          <View style={styles.headerRow}>
            <TapScale accessibilityRole="button" accessibilityLabel="Back" onPress={() => safeRouterBack(router)} style={{ padding: 4, marginRight: 12 }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary}/>
            </TapScale>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: sx.primary, fontSize: f.h2 }]}>
                {triLang(lang, {
            ru: 'Моя практика',
            uk: 'Моя практика',
            es: 'Mi práctica',
            'pt-BR': "Minha prática",
            vi: "Luyện tập của tôi",
            id: "Latihanku",
            tr: "Pratiğim",
            pl: "Moja praktyka",
        })}
              </Text>
            </View>
            <ReportErrorButton
              screen="trainer"
              dataId="trainer_dashboard"
              dataText={triLang(lang, {
                ru: 'Экран Моя практика',
                uk: 'Екран Моя практика',
                es: 'Pantalla Mi práctica',
                'pt-BR': 'Tela Minha prática',
                vi: 'Màn hình Luyện tập của tôi',
                id: 'Layar Latihanku',
                tr: 'Pratiğim ekranı',
                pl: 'Ekran Moja praktyka',
              })}
              variant="icon-flag"
              accessibilityLabel="Сообщить о баге на экране практики"
              style={[
                { width: 38, height: 38, borderRadius: 19, backgroundColor: t.bgCard, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border },
                isCompassTheme && { borderRadius: 9, backgroundColor: COMPASS_RICH.charcoalRaised, borderColor: COMPASS_RICH.hairline, ...compassShadow(1) },
              ]}
            />
          </View>

          <BouncyWrap>
          <ScrollView decelerationRate="normal" bounces alwaysBounceVertical overScrollMode="always" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 30 }} showsVerticalScrollIndicator={false} onScroll={onBouncyScroll} scrollEventThrottle={16}>
            {null}

            {null}

            {!trainerSessionEnabled && (<View style={[styles.card, isCompassTheme && styles.compassClip, isCompassTheme && compassShadow(1), { backgroundColor: trainerCardBg, borderColor: trainerBorder, borderRadius: trainerRadius }]}>
                {isCompassTheme ? <CompassTrainerSurface radius={trainerRadius} quiet physical /> : null}
                <View style={styles.cardIcon}>
                  <Ionicons name="lock-closed-outline" size={30} color={isCompassTheme ? COMPASS_RICH.champagne : isGoldTheme ? GOLD_RICH.metalGold : t.textMuted}/>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                    {trainerGateCopy.title}
                  </Text>
                  <Text style={[styles.cardSub, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={4}>
                    {trainerGateCopy.body}
                  </Text>
                </View>
              </View>)}

            {PRACTICE_OPTIONS.map(option => {
            const count = option.queues.reduce((sum, queue) => sum + (dashboard.due[queue] ?? 0), 0);
            const empty = count === 0 || !trainerSessionEnabled;
            const isNext = option.queues.includes(dashboard.nextQueue as TrainerQueue);
            const optionAccent = isCompassTheme
                ? (option.id === 'context' ? COMPASS_RICH.champagne : COMPASS_RICH.peach)
                : isGoldTheme
                ? option.id === 'context' ? GOLD_RICH.metalGold : GOLD_RICH.champagne
                :
                    option.accent;
            const optionAccentBorder = isCompassTheme
                ? (isNext ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet)
                : isGoldTheme
                ? (isNext ? GOLD_RICH.hairlineStrong : GOLD_RICH.hairlineQuiet)
                :
                    optionAccent + '55';
            return (<TouchableOpacity key={option.id} accessibilityRole="button" accessibilityLabel={optionTitle(option, lang)} onPress={() => { if (trainerSessionEnabled) void startPracticeOption(option); }} activeOpacity={empty ? 1 : 0.86} style={[
                    styles.card,
                    isCompassTheme && styles.compassClip,
                    isCompassTheme && compassShadow(isNext ? 2 : 1),
                    {
                        backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : isGoldTheme ? 'rgba(8,8,6,0.92)' : t.bgCard,
                        borderColor: isCompassTheme
                            ? (isNext ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet)
                            : isGoldTheme
                            ? (isNext ? GOLD_RICH.hairlineStrong : GOLD_RICH.hairlineQuiet)
                            :
                                isNext ? option.accent : t.border,
                        borderRadius: trainerRadius,
                        opacity: empty ? 0.62 : 1,
                    },
                ]}>
                  {isCompassTheme ? <CompassTrainerSurface radius={trainerRadius} selected={isNext} quiet={!isNext} physical /> : null}
                  <View style={styles.cardIcon}>
                    <TrainerThemeIcon kind={option.iconKind} themeMode={themeMode}/>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                        {optionTitle(option, lang)}
                      </Text>
                      {isNext ? (<View style={[styles.nextBadge, { backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : isGoldTheme ? GOLD_RICH.washStrong : option.accent + '22', borderRadius: trainerPillRadius, borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0, borderColor: isCompassTheme ? COMPASS_RICH.hairline : 'transparent' }]}>
                          <Text style={{ color: optionAccent, fontSize: f.label, fontWeight: '900' }}>
                            {triLang(lang, {
                        ru: 'лучший старт',
                        uk: 'кращий старт',
                        es: 'mejor inicio',
                        'pt-BR': "melhor início",
                        vi: "bắt đầu tốt nhất",
                        id: "awal terbaik",
                        tr: "en iyi başlangıç",
                        pl: "najlepszy start",
                    })}
                          </Text>
                        </View>) : null}
                    </View>
                    <Text style={[styles.cardSub, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={2}>
                      {empty
                    ? triLang(lang, {
                        ru: 'Сейчас нечего повторять.',
                        uk: 'Зараз нічого повторювати.',
                        es: 'Nada que repasar ahora.',
                        'pt-BR': "Nada para revisar agora.",
                        vi: "Hiện chưa có gì để ôn.",
                        id: "Belum ada yang perlu diulas.",
                        tr: "Şu an tekrar edecek bir şey yok.",
                        pl: "Nie ma teraz nic do powtórki.",
                    })
                    : optionSubtitle(option, lang)}
                    </Text>
                  </View>
                  <View style={[styles.countBadge, { backgroundColor: empty ? trainerRowBg : isCompassTheme ? COMPASS_RICH.washStrong : isGoldTheme ? GOLD_RICH.wash : option.accent + '22', borderColor: empty ? trainerBorder : optionAccentBorder, borderRadius: isCompassTheme ? 9 : 23 }]}>
                    <Text style={[styles.countNum, { color: empty ? t.textMuted : optionAccent, fontSize: f.numMd }]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>);
        })}

            {/* ── Аналитика ошибок inline ── */}
            <StatsPremiumBlur isPremium={hasPremium} context="patterns">
            <View style={[styles.analyticsBlock, isCompassTheme && styles.compassClip, isCompassTheme && compassShadow(2), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : isGoldTheme ? 'rgba(8,8,6,0.94)' : t.bgCard, borderColor: isCompassTheme ? COMPASS_RICH.hairline : isGoldTheme ? GOLD_RICH.hairlineQuiet : '#FACC1533', borderRadius: trainerRadius }]}>
                {isCompassTheme ? <CompassTrainerSurface radius={trainerRadius} quiet physical /> : null}
                <View style={styles.analyticsHeader}>
                  <View style={styles.cardIcon}>
                    <TrainerThemeIcon kind="analytics" themeMode={themeMode}/>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                      {triLang(lang, {
                ru: 'Аналитика ошибок',
                uk: 'Аналітика помилок',
                es: 'Análisis de errores',
                'pt-BR': "Análise de erros",
                vi: "Phân tích lỗi",
                id: "Analitik kesalahan",
                tr: "Hata analizi",
                pl: "Analiza błędów",
            })}
                    </Text>
                    <Text style={[styles.cardSub, { color: t.textMuted, fontSize: f.caption }]}>
                      {triLang(lang, {
                ru: `${shownAnalytics.totalMistakes} ошибок за ${shownAnalytics.windowDays} дней`,
                uk: `${shownAnalytics.totalMistakes} помилок за ${shownAnalytics.windowDays} днів`,
                es: `${shownAnalytics.totalMistakes} errores en ${shownAnalytics.windowDays} días`,
                'pt-BR': `${shownAnalytics.totalMistakes} erros em ${shownAnalytics.windowDays} dias`,
                vi: `${shownAnalytics.totalMistakes} lỗi trong ${shownAnalytics.windowDays} ngày`,
                id: `${shownAnalytics.totalMistakes} kesalahan dalam ${shownAnalytics.windowDays} hari`,
                tr: `${shownAnalytics.windowDays} günde ${shownAnalytics.totalMistakes} hata`,
                pl: `${shownAnalytics.totalMistakes} błędów w ${shownAnalytics.windowDays} dni`,
            })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => { hapticTap(); router.push('/phrase_analytics_screen' as any); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="expand-outline" size={18} color={t.textMuted}/>
                  </TouchableOpacity>
                </View>

                {/* Вкладки */}
                <View style={[styles.analyticsTabs, { backgroundColor: isCompassTheme ? COMPASS_RICH.void : isGoldTheme ? 'rgba(14,12,8,0.92)' : t.bgSurface, borderRadius: isCompassTheme ? 8 : 10, borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0, borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent' }]}>
                  {(['categories', 'lessons', 'phrases'] as const).map(key => (<TouchableOpacity key={key} onPress={() => { hapticTap(); setAnalyticsTab(key); }} style={[styles.analyticsTabItem, { borderRadius: isCompassTheme ? 6 : 8 }, analyticsTab === key && { backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : isGoldTheme ? 'rgba(214,179,90,0.10)' : t.bgCard }]} activeOpacity={0.75}>
                      <Text style={[
                    styles.analyticsTabText,
                    { fontSize: f.caption },
                    analyticsTab === key ? { color: t.textPrimary, fontWeight: '700' } : { color: t.textMuted },
                ]}>
                        {key === 'categories'
                    ? triLang(lang, {
                        ru: 'Категории',
                        uk: 'Категорії',
                        es: 'Categorías',
                        'pt-BR': "Categorias",
                        vi: "Danh mục",
                        id: "Kategori",
                        tr: "Kategoriler",
                        pl: "Kategorie",
                    })
                    : key === 'lessons'
                        ? triLang(lang, {
                            ru: 'Уроки',
                            uk: 'Уроки',
                            es: 'Lecciones',
                            'pt-BR': "Aulas",
                            vi: "Bài học",
                            id: "Pelajaran",
                            tr: "Dersler",
                            pl: "Lekcje",
                        })
                        : triLang(lang, {
                            ru: 'Фразы',
                            uk: 'Фрази',
                            es: 'Frases',
                            'pt-BR': "Frases",
                            vi: "Cụm câu",
                            id: "Frasa",
                            tr: "İfadeler",
                            pl: "Frazy",
                        })}
                      </Text>
                    </TouchableOpacity>))}
                </View>

                {!hasAnalyticsMistakes && (<TouchableOpacity accessibilityRole="button" accessibilityLabel="Open mistake analytics" onPress={() => { hapticTap(); router.push('/phrase_analytics_screen' as any); }} activeOpacity={0.86} style={[styles.analyticsRow, isCompassTheme && styles.compassClip, { backgroundColor: trainerRowBg, borderColor: trainerBorder, borderRadius: isCompassTheme ? 8 : 12 }]}>
                    {isCompassTheme ? <CompassTrainerSurface radius={8} quiet physical /> : null}
                    <Ionicons name="sparkles-outline" size={18} color={isCompassTheme ? COMPASS_RICH.champagne : isGoldTheme ? GOLD_RICH.metalGold : t.textMuted}/>
                    <Text style={{ flex: 1, color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.35 }}>
                      {triLang(lang, {
                    ru: 'Пройди вызов или тренировку — если будут ошибки, здесь появятся темы и фразы для разбора.',
                    uk: 'Пройди квіз або тренування - якщо будуть помилки, тут зʼявляться теми й фрази для розбору.',
                    es: 'Haz un quiz o una práctica: si hay errores, aquí aparecerán temas y frases para analizar.',
                    'pt-BR': "Faça um quiz ou treino: se houver erros, aqui aparecerão temas e frases para analisar.",
                    vi: "Làm quiz hoặc bài luyện: nếu có lỗi, các chủ đề và cụm câu cần phân tích sẽ xuất hiện ở đây.",
                    id: "Kerjakan kuis atau latihan: jika ada kesalahan, topik dan frasa untuk dibahas akan muncul di sini.",
                    tr: "Bir quiz ya da antrenman yap: hata olursa analiz için konular ve ifadeler burada görünecek.",
                    pl: "Zrób quiz albo trening: jeśli pojawią się błędy, tu zobaczysz tematy i frazy do analizy.",
                })}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={t.textMuted}/>
                  </TouchableOpacity>)}

                {/* Контент вкладок */}
                {hasAnalyticsMistakes && analyticsTab === 'categories' && (<View style={{ gap: 6 }}>
                    {shownAnalytics.categoryStats.slice(0, 4).map(stat => (<InlineCategoryRow key={stat.category} stat={stat} lang={lang} t={t} f={f} router={router} resolvedPersonalTrainings={resolvedPersonalTrainings} personalTrainingEnabled={personalPracticeCoachEnabled} isGoldTheme={isGoldTheme} isCompassTheme={isCompassTheme}/>))}
                  </View>)}
                {hasAnalyticsMistakes && analyticsTab === 'lessons' && (<View style={{ gap: 6 }}>
                    {shownAnalytics.lessonStats.slice(0, 4).map(stat => (<View key={stat.lessonId} style={[styles.analyticsRow, isCompassTheme && styles.compassClip, isCompassTheme && compassShadow(1), { backgroundColor: trainerRowBg, borderColor: trainerBorder, borderRadius: isCompassTheme ? 8 : 12 }]}>
                        {isCompassTheme ? <CompassTrainerSurface radius={8} quiet physical /> : null}
                        <Text style={[styles.analyticsRowPct, { color: t.textPrimary, fontSize: f.bodyLg }]} numberOfLines={1}>{stat.pct}%</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                            {triLang(lang, {
                        ru: 'Урок',
                        uk: 'Урок',
                        es: 'Lec.',
                        'pt-BR': "Aula",
                        vi: "Bài",
                        id: "Pel.",
                        tr: "Ders",
                        pl: "Lek.",
                    })} {stat.lessonId}
                          </Text>
                          <Text style={{ color: t.textPrimary, fontSize: f.caption }} numberOfLines={1}>
                            {trainerAnalyticsLessonTitle(stat, lang, studyTarget)}
                          </Text>
                          <View style={styles.miniProgressBg}>
                            <View style={[styles.miniProgressFill, { width: `${Math.min(stat.pct, 100)}%`, backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : isGoldTheme ? GOLD_RICH.metalGold : 'rgba(255,255,255,0.45)' }]}/>
                          </View>
                        </View>
                      </View>))}
                  </View>)}
                {hasAnalyticsMistakes && analyticsTab === 'phrases' && (<View style={{ gap: 6 }}>
                    {shownAnalytics.topMistakePhrases.slice(0, 5).map(({ phrase, lessonId, count }, i) => (<View key={i} style={[styles.analyticsRow, isCompassTheme && styles.compassClip, isCompassTheme && compassShadow(1), { backgroundColor: trainerRowBg, borderColor: trainerBorder, borderRadius: isCompassTheme ? 8 : 12 }]}>
                        {isCompassTheme ? <CompassTrainerSurface radius={8} quiet physical /> : null}
                        <View style={[styles.phraseMinibadge, { backgroundColor: isCompassTheme ? COMPASS_RICH.wash : isGoldTheme ? GOLD_RICH.wash : t.bgCard, borderRadius: isCompassTheme ? 7 : 8, borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0, borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent' }]}>
                          <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>×{count}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '600' }} numberOfLines={1}>{phrase}</Text>
                          <Text style={{ color: t.textMuted, fontSize: f.caption - 1 }}>
                            {triLang(lang, {
                        ru: 'Урок',
                        uk: 'Урок',
                        es: 'Lec.',
                        'pt-BR': "Aula",
                        vi: "Bài",
                        id: "Pel.",
                        tr: "Ders",
                        pl: "Lek.",
                    })} {lessonId}
                          </Text>
                        </View>
                      </View>))}
                  </View>)}
              </View>
            </StatsPremiumBlur>

            {ENABLE_DEV_TOOLS && (<View style={[styles.devPanel, isCompassTheme && styles.compassClip, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : isGoldTheme ? 'rgba(8,8,6,0.94)' : '#1a1a2e', borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : isGoldTheme ? GOLD_RICH.hairlineQuiet : '#4A9EFF44', borderRadius: isCompassTheme ? 9 : 14 }]}>
                {isCompassTheme ? <CompassTrainerSurface radius={9} quiet physical /> : null}
                <Text style={{ color: isCompassTheme ? COMPASS_RICH.champagne : isGoldTheme ? GOLD_RICH.metalGold : '#4A9EFF', fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 1 }}>
                  DEV TOOLS
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={async () => {
                setSeeding(true);
                await devSeedTrainer(studyTarget);
                await loadData();
                setSeeding(false);
            }} testID="trainer-dev-seed" style={[styles.devBtn, { backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : isGoldTheme ? GOLD_RICH.wash : '#4A9EFF22', borderColor: isCompassTheme ? COMPASS_RICH.hairline : isGoldTheme ? GOLD_RICH.hairline : '#4A9EFF66', borderRadius: trainerSmallRadius, flex: 1 }]}>
                    <Text style={{ color: isCompassTheme ? COMPASS_RICH.champagne : isGoldTheme ? GOLD_RICH.metalGold : '#4A9EFF', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                      {seeding ? 'Seeding...' : 'Random seed'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={async () => {
                await clearTrainerStore(studyTarget);
                await loadData();
            }} testID="trainer-dev-clear" style={[styles.devBtn, { backgroundColor: isCompassTheme ? COMPASS_RICH.copperWash : isGoldTheme ? 'rgba(110,75,20,0.14)' : '#E0505022', borderColor: isCompassTheme ? COMPASS_RICH.hairline : isGoldTheme ? GOLD_RICH.hairlineDark : '#E0505066', borderRadius: trainerSmallRadius }]}>
                    <Ionicons name="trash" size={16} color={isCompassTheme ? COMPASS_RICH.peach : isGoldTheme ? GOLD_RICH.agedGold : '#E05050'}/>
                  </TouchableOpacity>
                </View>
              </View>)}
            </ScrollView>
          </BouncyWrap>
          </Reanimated.View>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>);
}

export default function TrainerScreen() {
    return (
      <ErrorBoundary>
        <TrainerScreenInner />
      </ErrorBoundary>
    );
}
const styles = StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    headerTitle: { fontWeight: '900' },
    hero: {
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 16,
    },
    heroIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtn: {
        minHeight: 48,
        borderRadius: 14,
        marginTop: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    sectionTitle: { fontWeight: '900', marginTop: 4 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1,
        paddingVertical: 14,
        paddingHorizontal: 14,
        gap: 12,
    },
    compassClip: {
        overflow: 'hidden',
    },
    compassTopShelf: {
        position: 'absolute',
        left: 2,
        right: 2,
        top: 2,
        height: 12,
    },
    compassBottomShelf: {
        position: 'absolute',
        left: 2,
        right: 2,
        bottom: 2,
        height: 14,
    },
    compassLeftRail: {
        position: 'absolute',
        left: 1,
        top: 5,
        bottom: 8,
        width: 2,
    },
    compassRightRail: {
        position: 'absolute',
        right: 1,
        top: 6,
        bottom: 4,
        width: 2,
    },
    cardIcon: {
        width: 56,
        height: 56,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    cardTitle: { fontWeight: '900' },
    cardSub: { lineHeight: 18, marginTop: 3 },
    countBadge: {
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countNum: { fontWeight: '900' },
    nextBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    emptyHint: {
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 22,
    },
    devPanel: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        marginTop: 8,
    },
    devBtn: {
        borderRadius: 10,
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    analyticsBlock: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
        gap: 12,
    },
    analyticsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    analyticsTabs: {
        flexDirection: 'row',
        borderRadius: 10,
        padding: 3,
        gap: 2,
    },
    analyticsTabItem: {
        flex: 1,
        paddingVertical: 7,
        borderRadius: 8,
        alignItems: 'center',
    },
    analyticsTabText: { letterSpacing: 0.1 },
    analyticsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 0.5,
        minHeight: 64,
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10,
    },
    analyticsRowPct: {
        fontWeight: '800',
        width: 58,
        textAlign: 'center',
        flexShrink: 0,
    },
    miniProgressBg: {
        height: 2,
        borderRadius: 1,
        backgroundColor: 'rgba(128,128,128,0.15)',
        overflow: 'hidden',
        marginTop: 4,
    },
    miniProgressFill: {
        height: '100%',
        borderRadius: 1,
        backgroundColor: 'rgba(255,255,255,0.45)',
    },
    phraseMinibadge: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
});
