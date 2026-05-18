import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import { clearTrainerStore, devSeedTrainer, getTrainerDashboard, type TrainerDashboard, type TrainerQueue, } from './trainer_store';
import { ENABLE_DEV_TOOLS } from './config';
import { getVerifiedPremiumStatus } from './premium_guard';
import { getFreeSessionsLeftToday, reserveTrainerSessionEntry } from './trainer_session';
import { computePhraseAnalytics, type PhraseAnalyticsResult, type WordCategoryStat, } from './phrase_analytics';
import { getDiagnosisTraining } from './diagnosis_trainings';
import { loadResolvedPersonalTrainings, type ResolvedPersonalTrainingsState } from './diagnosis_training_progress';
import { choosePersonalTrainingCandidate } from './personal_training_taxonomy';
import { GOLD_RICH } from '../constants/goldTheme';
import { trainerThemeIconPalette, type TrainerThemeIconKind } from '../constants/trainerThemeIcons';
import type { ThemeMode } from '../constants/theme';
type RoutePath = '/trainer_words_session' | '/trainer_phrases_session' | '/trainer_arena_session';
interface SectionInfo {
    queue: TrainerQueue;
    icon: keyof typeof Ionicons.glyphMap;
    title: {
        ru: string;
        uk: string;
        es: string;
    };
    sub: {
        ru: string;
        uk: string;
        es: string;
    };
    method: {
        ru: string;
        uk: string;
        es: string;
    };
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
    const p = trainerThemeIconPalette(themeMode);
    if (kind === 'phrases') {
        return (<Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M12 28C12 17 22 10 35 10C48 10 56 18 56 29C56 40 46 47 33 47H29L18 55L20 44C15 40 12 35 12 28Z" fill={p.primary} opacity={0.72} stroke={p.stroke} strokeWidth={2.8} strokeLinejoin="round"/>
          <Path d="M28 37C28 29 36 24 47 24C57 24 62 30 62 38C62 46 54 52 44 52H40L32 58L34 49C30 46 28 42 28 37Z" fill={p.secondary} opacity={0.88} stroke={p.stroke} strokeWidth={2.4} strokeLinejoin="round"/>
          <Path d="M9 19C7 22 6 26 7 31M16 11C13 13 11 16 10 19" stroke={p.tertiary} strokeWidth={3.3} strokeLinecap="round" opacity={0.8}/>
          <Circle cx={46} cy={14} r={2.1} fill={p.tertiary}/>
          <Path d="M52 9L54 13L58 15L54 17L52 21L50 17L46 15L50 13Z" fill={p.tertiary}/>
        </Svg>);
    }
    if (kind === 'words') {
        return (<Svg width={size} height={size} viewBox="0 0 64 64">
          <G transform="rotate(-8 32 32)">
            <Rect x={20} y={17} width={31} height={37} rx={6} fill={p.muted} opacity={0.8} stroke={p.stroke} strokeWidth={2.3}/>
            <Rect x={16} y={12} width={31} height={37} rx={6} fill={p.primary} opacity={0.92} stroke={p.stroke} strokeWidth={2.5}/>
            <Path d="M22 12V43L27 39L32 44V13Z" fill={p.secondary} opacity={0.95}/>
            <Path d="M29 26L37 20L35 29L43 29L32 37L34 28Z" fill={p.tertiary} opacity={0.95}/>
          </G>
          <Rect x={47} y={40} width={10} height={8} rx={2.5} fill={p.secondary} stroke={p.stroke} strokeWidth={1.7}/>
          <Rect x={48} y={51} width={9} height={7} rx={2.2} fill={p.primary} opacity={0.82} stroke={p.stroke} strokeWidth={1.5}/>
          <Circle cx={21} cy={10} r={2.2} fill={p.tertiary}/>
        </Svg>);
    }
    return (<Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x={9} y={40} width={7} height={13} rx={1.6} fill={p.primary} opacity={0.7} stroke={p.stroke} strokeWidth={1.6}/>
      <Rect x={21} y={34} width={7} height={19} rx={1.6} fill={p.secondary} opacity={0.82} stroke={p.stroke} strokeWidth={1.6}/>
      <Rect x={33} y={27} width={7} height={26} rx={1.6} fill={p.primary} opacity={0.86} stroke={p.stroke} strokeWidth={1.6}/>
      <Path d="M12 33L24 24L36 30L50 15" fill="none" stroke={p.tertiary} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"/>
      <Circle cx={12} cy={33} r={4} fill={p.primary} stroke={p.stroke} strokeWidth={2}/>
      <Circle cx={24} cy={24} r={4} fill={p.secondary} stroke={p.stroke} strokeWidth={2}/>
      <Circle cx={36} cy={30} r={4} fill={p.primary} stroke={p.stroke} strokeWidth={2}/>
      <Circle cx={50} cy={15} r={4} fill={p.secondary} stroke={p.stroke} strokeWidth={2}/>
      <Circle cx={48} cy={43} r={9} fill="none" stroke={p.stroke} strokeWidth={3.4}/>
      <Line x1={54} y1={50} x2={61} y2={57} stroke={p.stroke} strokeWidth={4} strokeLinecap="round"/>
      <Path d="M10 16L13 19M13 16L10 19M51 25L55 29M55 25L51 29" stroke={p.secondary} strokeWidth={2.4} strokeLinecap="round"/>
    </Svg>);
}
const SECTIONS: SectionInfo[] = [
    {
        queue: 'phrases',
        icon: 'chatbubbles',
        title: { ru: 'Фразы', uk: 'Фрази', es: 'Frases' },
        sub: {
            ru: 'Сборка и пропуски по фразам, где ты ошибался.',
            uk: 'Складання й пропуски у фразах, де ти помилявся.',
            es: 'Construcción y huecos en frases donde fallaste.',
        },
        method: {
            ru: 'Generation practice: вспоминаешь фразу сам, а не узнаешь её глазами.',
            uk: 'Generation practice: згадуєш фразу сам, а не впізнаєш очима.',
            es: 'Práctica generativa: recuerdas la frase, no solo la reconoces.',
        },
        accent: '#2DD4BF',
        route: '/trainer_phrases_session',
    },
    {
        queue: 'words',
        icon: 'library',
        title: { ru: 'Слова', uk: 'Слова', es: 'Palabras' },
        sub: {
            ru: 'Слова и глаголы, где ошибка повторилась.',
            uk: 'Слова й дієслова, де помилка повторилась.',
            es: 'Palabras y verbos donde el error se repitió.',
        },
        method: {
            ru: 'Active recall: быстро проверяешь перевод и закрепляешь слабый словарь.',
            uk: 'Active recall: швидко перевіряєш переклад і закріплюєш слабкий словник.',
            es: 'Recuerdo activo: revisas traducción y vocabulario débil.',
        },
        accent: '#60A5FA',
        route: '/trainer_words_session',
    },
    {
        queue: 'arena',
        icon: 'shield-checkmark',
        title: { ru: 'Фразы', uk: 'Фрази', es: 'Frases' },
        sub: {
            ru: 'Фразы из быстрых тренировок без давления.',
            uk: 'Фрази зі швидких тренувань без тиску.',
            es: 'Frases de práctica rápida sin presión.',
        },
        method: {
            ru: 'Transfer practice: переносишь знание в быстрые ответы.',
            uk: 'Transfer practice: переносиш знання у швидкі відповіді.',
            es: 'Práctica de transferencia: llevas conocimiento a respuestas rápidas.',
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
function InlineCategoryRow({ stat, lang, t, f, router, resolvedPersonalTrainings, isGoldTheme = false }: {
    stat: WordCategoryStat;
    lang: string;
    t: ReturnType<typeof useTheme>['theme'];
    f: ReturnType<typeof useTheme>['f'];
    router: ReturnType<typeof useRouter>;
    resolvedPersonalTrainings: ResolvedPersonalTrainingsState | null;
    isGoldTheme?: boolean;
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
    const diagnosisId = isWeak ? chooseInlineDiagnosis(stat, resolvedPersonalTrainings) : null;
    const accent = isGoldTheme ? GOLD_RICH.metalGold : t.accent;
    const rowBg = isGoldTheme ? 'rgba(14,12,8,0.92)' : t.bgSurface;
    const rowBorder = isGoldTheme
        ? (isWeak ? GOLD_RICH.hairline : GOLD_RICH.hairlineQuiet)
        :
            isWeak ? t.accent + '55' : t.border;
    const inner = (<View style={[styles.analyticsRow, { backgroundColor: rowBg, borderColor: rowBorder }]}>
      <Text style={[styles.analyticsRowPct, { color: t.textPrimary, fontSize: f.bodyLg }]}>{stat.pct}%</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
        <View style={styles.miniProgressBg}>
          <View style={[styles.miniProgressFill, { width: `${Math.min(stat.pct, 100)}%`, backgroundColor: isWeak ? accent : isGoldTheme ? GOLD_RICH.agedGold : 'rgba(255,255,255,0.45)' }]}/>
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
export default function TrainerScreen() {
    const router = useRouter();
    const { theme: t, f, themeMode } = useTheme();
    const isGoldTheme = themeMode === 'gold';
    const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
    const { lang } = useLang();
    const [dashboard, setDashboard] = useState<TrainerDashboard>(EMPTY_TRAINER_DASHBOARD);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [hasPremium, setHasPremium] = useState(false);
    const [freeLeft, setFreeLeft] = useState(1);
    const [analytics, setAnalytics] = useState<PhraseAnalyticsResult | null>(null);
    const [resolvedPersonalTrainings, setResolvedPersonalTrainings] = useState<ResolvedPersonalTrainingsState | null>(null);
    const [analyticsTab, setAnalyticsTab] = useState<'categories' | 'lessons' | 'phrases'>('categories');
    const loadData = useCallback(async () => {
        setLoading(true);
        const [dash, premium, left, analyticsResult, resolved] = await Promise.all([
            getTrainerDashboard(),
            getVerifiedPremiumStatus().catch(() => false),
            getFreeSessionsLeftToday(),
            computePhraseAnalytics().catch(() => null),
            loadResolvedPersonalTrainings(),
        ]);
        setDashboard(dash);
        setHasPremium(premium);
        setFreeLeft(left);
        setAnalytics(analyticsResult);
        setResolvedPersonalTrainings(resolved);
        setLoading(false);
    }, []);
    useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));
    const total = dashboard?.totalDue ?? 0;
    const nextOption = useMemo(() => (dashboard.nextQueue === 'words' ? PRACTICE_OPTIONS[1] : PRACTICE_OPTIONS[0]), [dashboard]);
    const primaryAccent = isGoldTheme ? GOLD_RICH.metalGold : hasPremium ? '#FACC15' : nextOption.accent;
    const primaryTextColor = isGoldTheme || (hasPremium) ? '#17130A' : '#fff';
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
        router.push({ pathname: '/trainer_smart_session', params: { mode: 'smart_mix' } } as any);
    }, [router, total]);
    const startQueue = useCallback(async (section: SectionInfo) => {
        const count = dashboard?.due[section.queue] ?? 0;
        hapticTap();
        if (count <= 0)
            return;
        if (!hasPremium && freeLeft <= 0) {
            openPremium('trainer_limit');
            return;
        }
        const reserved = await reserveTrainerSessionEntry(section.route, hasPremium);
        if (!reserved) {
            openPremium('trainer_limit');
            return;
        }
        if (!hasPremium)
            setFreeLeft(0);
        router.push(section.route as any);
    }, [dashboard, freeLeft, hasPremium, openPremium, router]);
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
    return (<ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} testID="screen-trainer">
        <ContentWrap>
          <View style={styles.headerRow}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary}/>
            </TouchableOpacity>
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
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
            {null}

            {null}

            {PRACTICE_OPTIONS.map(option => {
            const count = option.queues.reduce((sum, queue) => sum + (dashboard.due[queue] ?? 0), 0);
            const empty = count === 0;
            const isNext = option.queues.includes(dashboard.nextQueue as TrainerQueue);
            const optionAccent = isGoldTheme
                ? option.id === 'context' ? GOLD_RICH.metalGold : GOLD_RICH.champagne
                :
                    option.accent;
            const optionAccentBorder = isGoldTheme
                ? (isNext ? GOLD_RICH.hairlineStrong : GOLD_RICH.hairlineQuiet)
                :
                    optionAccent + '55';
            return (<TouchableOpacity key={option.id} accessibilityRole="button" accessibilityLabel={optionTitle(option, lang)} onPress={() => { void startPracticeOption(option); }} activeOpacity={empty ? 1 : 0.86} style={[
                    styles.card,
                    {
                        backgroundColor: isGoldTheme ? 'rgba(8,8,6,0.92)' : t.bgCard,
                        borderColor: isGoldTheme
                            ? (isNext ? GOLD_RICH.hairlineStrong : GOLD_RICH.hairlineQuiet)
                            :
                                isNext ? option.accent : t.border,
                        opacity: empty ? 0.62 : 1,
                    },
                ]}>
                  <View style={styles.cardIcon}>
                    <TrainerThemeIcon kind={option.iconKind} themeMode={themeMode}/>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                        {optionTitle(option, lang)}
                      </Text>
                      {isNext ? (<View style={[styles.nextBadge, { backgroundColor: isGoldTheme ? GOLD_RICH.washStrong : option.accent + '22' }]}>
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
                  <View style={[styles.countBadge, { backgroundColor: empty ? (isGoldTheme ? 'rgba(14,12,8,0.90)' : t.bgSurface) : isGoldTheme ? GOLD_RICH.wash : option.accent + '22', borderColor: empty ? (isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border) : optionAccentBorder }]}>
                    <Text style={[styles.countNum, { color: empty ? t.textMuted : optionAccent, fontSize: f.numMd }]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>);
        })}

            {/* ── Аналитика ошибок inline ── */}
            {hasPremium ? (<View style={[styles.analyticsBlock, { backgroundColor: isGoldTheme ? 'rgba(8,8,6,0.94)' : t.bgCard, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : '#FACC1533' }]}>
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
                <View style={[styles.analyticsTabs, { backgroundColor: isGoldTheme ? 'rgba(14,12,8,0.92)' : t.bgSurface }]}>
                  {(['categories', 'lessons', 'phrases'] as const).map(key => (<TouchableOpacity key={key} onPress={() => { hapticTap(); setAnalyticsTab(key); }} style={[styles.analyticsTabItem, analyticsTab === key && { backgroundColor: isGoldTheme ? 'rgba(214,179,90,0.10)' : t.bgCard }]} activeOpacity={0.75}>
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

                {!hasAnalyticsMistakes && (<TouchableOpacity accessibilityRole="button" accessibilityLabel="Open mistake analytics" onPress={() => { hapticTap(); router.push('/phrase_analytics_screen' as any); }} activeOpacity={0.86} style={[styles.analyticsRow, { backgroundColor: isGoldTheme ? 'rgba(14,12,8,0.92)' : t.bgSurface, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border }]}>
                    <Ionicons name="sparkles-outline" size={18} color={isGoldTheme ? GOLD_RICH.metalGold : t.textMuted}/>
                    <Text style={{ flex: 1, color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.35 }}>
                      {triLang(lang, {
                    ru: 'Сделай квиз или тренировку с ошибками - здесь появятся темы и фразы для разбора.',
                    uk: 'Зроби квіз або тренування з помилками - тут зʼявляться теми й фрази для розбору.',
                    es: 'Haz un quiz o una práctica con errores y aquí aparecerán temas y frases para analizar.',
                    'pt-BR': "Faça um quiz ou treino com erros: aqui aparecerão temas e frases para analisar.",
                    vi: "Làm quiz hoặc bài luyện có lỗi: các chủ đề và cụm câu cần phân tích sẽ xuất hiện ở đây.",
                    id: "Kerjakan kuis atau latihan dengan kesalahan: topik dan frasa untuk dibahas akan muncul di sini.",
                    tr: "Hatalı bir quiz ya da antrenman yap: analiz için konular ve ifadeler burada görünecek.",
                    pl: "Zrób quiz albo trening z błędami: tu pojawią się tematy i frazy do analizy.",
                })}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={t.textMuted}/>
                  </TouchableOpacity>)}

                {/* Контент вкладок */}
                {hasAnalyticsMistakes && analyticsTab === 'categories' && (<View style={{ gap: 6 }}>
                    {shownAnalytics.categoryStats.slice(0, 4).map(stat => (<InlineCategoryRow key={stat.category} stat={stat} lang={lang} t={t} f={f} router={router} resolvedPersonalTrainings={resolvedPersonalTrainings} isGoldTheme={isGoldTheme}/>))}
                  </View>)}
                {hasAnalyticsMistakes && analyticsTab === 'lessons' && (<View style={{ gap: 6 }}>
                    {shownAnalytics.lessonStats.slice(0, 4).map(stat => (<View key={stat.lessonId} style={[styles.analyticsRow, { backgroundColor: isGoldTheme ? 'rgba(14,12,8,0.92)' : t.bgSurface, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border }]}>
                        <Text style={[styles.analyticsRowPct, { color: t.textPrimary, fontSize: f.bodyLg }]}>{stat.pct}%</Text>
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
                            {lang === 'uk' ? stat.lessonNameUK : lang === 'es' ? stat.lessonNameES : stat.lessonNameRU}
                          </Text>
                          <View style={styles.miniProgressBg}>
                            <View style={[styles.miniProgressFill, { width: `${Math.min(stat.pct, 100)}%`, backgroundColor: isGoldTheme ? GOLD_RICH.metalGold : 'rgba(255,255,255,0.45)' }]}/>
                          </View>
                        </View>
                      </View>))}
                  </View>)}
                {hasAnalyticsMistakes && analyticsTab === 'phrases' && (<View style={{ gap: 6 }}>
                    {shownAnalytics.topMistakePhrases.slice(0, 5).map(({ phrase, lessonId, count }, i) => (<View key={i} style={[styles.analyticsRow, { backgroundColor: isGoldTheme ? 'rgba(14,12,8,0.92)' : t.bgSurface, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border }]}>
                        <View style={[styles.phraseMinibadge, { backgroundColor: isGoldTheme ? GOLD_RICH.wash : t.bgCard }]}>
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
              </View>) : !hasPremium ? (<TouchableOpacity accessibilityRole="button" accessibilityLabel="Mistake analytics" onPress={() => { hapticTap(); router.push('/phrase_analytics_screen' as any); }} activeOpacity={0.86} style={[styles.card, { backgroundColor: isGoldTheme ? 'rgba(8,8,6,0.92)' : t.bgCard, borderColor: isGoldTheme ? GOLD_RICH.hairline : '#FACC1566' }]}>
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
                  <Text style={[styles.cardSub, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={2}>
                    {triLang(lang, {
                ru: 'Где ошибаешься чаще всего - по темам и фразам',
                uk: 'Де помиляєшся найчастіше - за темами й фразами',
                es: 'Dónde fallas más: temas y frases concretas',
                'pt-BR': "Onde você erra com mais frequência: por temas e frases",
                vi: "Bạn hay sai nhất ở đâu: theo chủ đề và cụm câu",
                id: "Di mana kamu paling sering salah: berdasarkan topik dan frasa",
                tr: "En çok nerede hata yapıyorsun: konu ve ifadelere göre",
                pl: "Gdzie najczęściej się mylisz: według tematów i fraz",
            })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={t.textMuted}/>
              </TouchableOpacity>) : null}

            {ENABLE_DEV_TOOLS && (<View style={[styles.devPanel, { backgroundColor: isGoldTheme ? 'rgba(8,8,6,0.94)' : '#1a1a2e', borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : '#4A9EFF44' }]}>
                <Text style={{ color: isGoldTheme ? GOLD_RICH.metalGold : '#4A9EFF', fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 1 }}>
                  DEV TOOLS
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={async () => {
                setSeeding(true);
                await devSeedTrainer();
                await loadData();
                setSeeding(false);
            }} testID="trainer-dev-seed" style={[styles.devBtn, { backgroundColor: isGoldTheme ? GOLD_RICH.wash : '#4A9EFF22', borderColor: isGoldTheme ? GOLD_RICH.hairline : '#4A9EFF66', flex: 1 }]}>
                    <Text style={{ color: isGoldTheme ? GOLD_RICH.metalGold : '#4A9EFF', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                      {seeding ? 'Seeding...' : 'Random seed'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={async () => {
                await clearTrainerStore();
                await loadData();
            }} testID="trainer-dev-clear" style={[styles.devBtn, { backgroundColor: isGoldTheme ? 'rgba(110,75,20,0.14)' : '#E0505022', borderColor: isGoldTheme ? GOLD_RICH.hairlineDark : '#E0505066' }]}>
                    <Ionicons name="trash" size={16} color={isGoldTheme ? GOLD_RICH.agedGold : '#E05050'}/>
                  </TouchableOpacity>
                </View>
              </View>)}
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>);
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
    cardIcon: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
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
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10,
    },
    analyticsRowPct: {
        fontWeight: '700',
        width: 42,
        textAlign: 'right',
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
