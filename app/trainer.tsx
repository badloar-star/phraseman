import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
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
        icon: 'chatbubbles',
        accent: '#2DD4BF',
    },
    {
        id: 'words',
        queues: ['words'],
        icon: 'library',
        accent: '#60A5FA',
    },
];
const recommendedStartText = (queue: TrainerQueue | null, lang: Lang): string => {
    if (queue === 'phrases') {
        return triLang(lang, {
            ru: 'Сначала повтори фразы. Здесь самые свежие ошибки в контексте.',
            uk: 'Спочатку повтори фрази. Тут найсвіжіші помилки в контексті.',
            es: 'Empieza con frases: son tus errores más recientes en contexto.',
            'pt-BR': "Comece pelas frases. Aqui est?o os erros mais recentes em contexto.",
            vi: "H?y b?t ??u v?i c?m c?u. ??y l? nh?ng l?i m?i nh?t trong ng? c?nh.",
            id: "Mulai dari frasa. Di sini ada kesalahan terbaru dalam konteks.",
            tr: "?nce ifadeleri tekrar et. Burada ba?lam i?indeki en yeni hatalar?n var.",
            pl: "Zacznij od fraz. Tu s? naj?wie?sze b??dy w kontek?cie.",
        });
    }
    if (queue === 'words') {
        return triLang(lang, {
            ru: 'Сначала повтори слова. Это самый быстрый способ закрыть свежие ошибки.',
            uk: 'Спочатку повтори слова. Це найшвидший спосіб закрити свіжі помилки.',
            es: 'Empieza con palabras: es la forma más rápida de cerrar errores recientes.',
            'pt-BR': "Comece pelas palavras. ? o jeito mais r?pido de fechar erros recentes.",
            vi: "H?y b?t ??u v?i t? v?ng. ??y l? c?ch nhanh nh?t ?? x? l? l?i m?i.",
            id: "Mulai dari kata. Ini cara tercepat untuk menutup kesalahan terbaru.",
            tr: "?nce kelimeleri tekrar et. Yeni hatalar? kapatman?n en h?zl? yolu bu.",
            pl: "Zacznij od s??w. To najszybszy spos?b na domkni?cie ?wie?ych b??d?w.",
        });
    }
    if (queue === 'arena') {
        return triLang(lang, {
            ru: 'Сначала повтори фразы. Там сейчас самые свежие ошибки.',
            uk: 'Спочатку повтори фрази. Там зараз найсвіжіші помилки.',
            es: 'Empieza con frases: ahí están tus errores más recientes.',
            'pt-BR': "Comece pelas frases. Ali est?o os erros mais recentes agora.",
            vi: "H?y b?t ??u v?i c?m c?u. Hi?n c?c l?i m?i nh?t n?m ? ??.",
            id: "Mulai dari frasa. Di sana ada kesalahan terbaru saat ini.",
            tr: "?nce ifadeleri tekrar et. En yeni hatalar ?u anda orada.",
            pl: "Zacznij od fraz. Tam s? teraz naj?wie?sze b??dy.",
        });
    }
    return triLang(lang, {
        ru: 'Начни с короткой тренировки по свежим ошибкам.',
        uk: 'Почни з короткого тренування за свіжими помилками.',
        es: 'Empieza con un repaso corto de errores recientes.',
        'pt-BR': "Comece com um treino curto dos erros recentes.",
        vi: "B?t ??u b?ng m?t b?i luy?n ng?n v?i c?c l?i m?i.",
        id: "Mulai dengan latihan singkat untuk kesalahan terbaru.",
        tr: "Yeni hatalar i?in k?sa bir antrenmanla ba?la.",
        pl: "Zacznij od kr?tkiego treningu ?wie?ych b??d?w.",
    });
};
const todayReviewLabel = (count: number, lang: Lang): string => triLang(lang, {
    ru: count === 1 ? 'на повтор сегодня' : 'на повтор сегодня',
    uk: count === 1 ? 'на повтор сьогодні' : 'на повтор сьогодні',
    es: count === 1 ? 'para repasar hoy' : 'para repasar hoy',
    'pt-BR': count === 1 ? 'para revisar hoje' : 'para revisar hoje',
    vi: count === 1 ? 'c?n ?n h?m nay' : 'c?n ?n h?m nay',
    id: count === 1 ? 'untuk diulas hari ini' : 'untuk diulas hari ini',
    tr: count === 1 ? 'bug?n tekrar i?in' : 'bug?n tekrar i?in',
    pl: count === 1 ? 'do powt?rki dzi?' : 'do powt?rki dzi?',
});
const scheduledLaterText = (count: number, lang: Lang): string => triLang(lang, {
    ru: `Еще ${count} уже отложено на следующие повторения.`,
    uk: `Ще ${count} уже відкладено на наступні повторення.`,
    es: `${count} más ya están programados para próximos repasos.`,
    'pt-BR': `Mais ${count} j? foram agendados para pr?ximas revis?es.`,
    vi: `${count} m?c n?a ?? ???c l?n l?ch cho c?c l?n ?n ti?p theo.`,
    id: `${count} lagi sudah dijadwalkan untuk ulasan berikutnya.`,
    tr: `${count} ??e sonraki tekrarlar i?in planland?.`,
    pl: `Jeszcze ${count} zaplanowano na kolejne powt?rki.`,
});
const smartMixStartText = (lang: Lang): string => triLang(lang, {
    ru: 'Начни короткую тренировку по самым важным ошибкам. Порядок уже выбран автоматически.',
    uk: 'Почни коротке тренування за найважливішими помилками. Порядок уже обрано автоматично.',
    es: 'Start a short review of your most important mistakes. The order is already picked.',
    'pt-BR': "Comece um treino curto com seus erros mais importantes. A ordem j? foi escolhida automaticamente.",
    vi: "B?t ??u m?t b?i luy?n ng?n v?i nh?ng l?i quan tr?ng nh?t. Th? t? ?? ???c ch?n t? ??ng.",
    id: "Mulai latihan singkat untuk kesalahan paling penting. Urutannya sudah dipilih otomatis.",
    tr: "En ?nemli hatalar?nla k?sa bir antrenmana ba?la. S?ralama otomatik se?ildi.",
    pl: "Zacznij kr?tki trening najwa?niejszych b??d?w. Kolejno?? zosta?a dobrana automatycznie.",
});
const queueTitle = (queue: TrainerQueue, lang: Lang): string => {
    if (queue === 'phrases')
        return triLang(lang, {
            ru: 'Фразы',
            uk: 'Фрази',
            es: 'Frases',
            'pt-BR': "Frases",
            vi: "C?m c?u",
            id: "Frasa",
            tr: "?fadeler",
            pl: "Frazy",
        });
    if (queue === 'words')
        return triLang(lang, {
            ru: 'Слова',
            uk: 'Слова',
            es: 'Palabras',
            'pt-BR': "Palavras",
            vi: "T? v?ng",
            id: "Kata",
            tr: "Kelimeler",
            pl: "S?owa",
        });
    return triLang(lang, {
        ru: 'Фразы',
        uk: 'Фрази',
        es: 'Frases',
        'pt-BR': "Frases",
        vi: "C?m c?u",
        id: "Frasa",
        tr: "?fadeler",
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
            vi: "?n l?i trong ng? c?nh.",
            id: "Ulas kesalahan dalam konteks.",
            tr: "Hatalar? ba?lam i?inde tekrar et.",
            pl: "Powt?rz b??dy w kontek?cie.",
        });
    if (queue === 'words')
        return triLang(lang, {
            ru: 'Повтори слова, которые стоит закрепить.',
            uk: 'Повтори слова, які варто закріпити.',
            es: 'Review words that need another pass.',
            'pt-BR': "Revise palavras que precisam ser fixadas.",
            vi: "?n c?c t? c?n c?ng c?.",
            id: "Ulas kata yang perlu diperkuat.",
            tr: "Peki?tirmen gereken kelimeleri tekrar et.",
            pl: "Powt?rz s?owa, kt?re warto utrwali?.",
        });
    return triLang(lang, {
        ru: 'Повтори ошибки без таймера и давления.',
        uk: 'Повтори помилки без таймера й тиску.',
        es: 'Review mistakes without timer or pressure.',
        'pt-BR': "Revise erros sem cron?metro nem press?o.",
        vi: "?n l?i kh?ng c? h?n gi? hay ?p l?c.",
        id: "Ulas kesalahan tanpa timer atau tekanan.",
        tr: "Hatalar? zamanlay?c? ve bask? olmadan tekrar et.",
        pl: "Powt?rz b??dy bez timera i presji.",
    });
};
const optionTitle = (option: PracticeOption, lang: Lang): string => {
    if (option.id === 'context') {
        return triLang(lang, {
            ru: 'Фразы',
            uk: 'Фрази',
            es: 'Frases',
            'pt-BR': "Frases",
            vi: "C?m c?u",
            id: "Frasa",
            tr: "?fadeler",
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
            vi: "?n l?i trong ng? c?nh.",
            id: "Ulas kesalahan dalam konteks.",
            tr: "Hatalar? ba?lam i?inde tekrar et.",
            pl: "Powt?rz b??dy w kontek?cie.",
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
    const analyticsAccent = isGoldTheme ? GOLD_RICH.metalGold : '#FACC15';
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
            'pt-BR': "Minha pr?tica",
            vi: "Luy?n t?p c?a t?i",
            id: "Latihanku",
            tr: "Prati?im",
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
            const optionAccentSoft = isGoldTheme ? GOLD_RICH.wash : optionAccent + '20';
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
                  <View style={[styles.cardIcon, { backgroundColor: optionAccentSoft, borderColor: optionAccentBorder }]}>
                    <Ionicons name={option.icon} size={20} color={optionAccent}/>
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
                        'pt-BR': "melhor in?cio",
                        vi: "b?t ??u t?t nh?t",
                        id: "awal terbaik",
                        tr: "en iyi ba?lang??",
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
                        vi: "Hi?n ch?a c? g? ?? ?n.",
                        id: "Belum ada yang perlu diulas.",
                        tr: "?u an tekrar edecek bir ?ey yok.",
                        pl: "Nie ma teraz nic do powt?rki.",
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
                  <View style={[styles.cardIcon, { backgroundColor: isGoldTheme ? GOLD_RICH.wash : '#FACC1520', borderColor: isGoldTheme ? GOLD_RICH.hairline : '#FACC1566' }]}>
                    <Ionicons name="analytics" size={20} color={analyticsAccent}/>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                      {triLang(lang, {
                ru: 'Аналитика ошибок',
                uk: 'Аналітика помилок',
                es: 'Análisis de errores',
                'pt-BR': "An?lise de erros",
                vi: "Ph?n t?ch l?i",
                id: "Analitik kesalahan",
                tr: "Hata analizi",
                pl: "Analiza b??d?w",
            })}
                    </Text>
                    <Text style={[styles.cardSub, { color: t.textMuted, fontSize: f.caption }]}>
                      {triLang(lang, {
                ru: `${shownAnalytics.totalMistakes} ошибок за ${shownAnalytics.windowDays} дней`,
                uk: `${shownAnalytics.totalMistakes} помилок за ${shownAnalytics.windowDays} днів`,
                es: `${shownAnalytics.totalMistakes} errores en ${shownAnalytics.windowDays} días`,
                'pt-BR': `${shownAnalytics.totalMistakes} erros em ${shownAnalytics.windowDays} dias`,
                vi: `${shownAnalytics.totalMistakes} l?i trong ${shownAnalytics.windowDays} ng?y`,
                id: `${shownAnalytics.totalMistakes} kesalahan dalam ${shownAnalytics.windowDays} hari`,
                tr: `${shownAnalytics.windowDays} g?nde ${shownAnalytics.totalMistakes} hata`,
                pl: `${shownAnalytics.totalMistakes} b??d?w w ${shownAnalytics.windowDays} dni`,
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
                        vi: "Danh m?c",
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
                            vi: "B?i h?c",
                            id: "Pelajaran",
                            tr: "Dersler",
                            pl: "Lekcje",
                        })
                        : triLang(lang, {
                            ru: 'Фразы',
                            uk: 'Фрази',
                            es: 'Frases',
                            'pt-BR': "Frases",
                            vi: "C?m c?u",
                            id: "Frasa",
                            tr: "?fadeler",
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
                    'pt-BR': "Fa?a um quiz ou treino com erros: aqui aparecer?o temas e frases para analisar.",
                    vi: "L?m quiz ho?c b?i luy?n c? l?i: c?c ch? ?? v? c?m c?u c?n ph?n t?ch s? xu?t hi?n ? ??y.",
                    id: "Kerjakan kuis atau latihan dengan kesalahan: topik dan frasa untuk dibahas akan muncul di sini.",
                    tr: "Hatal? bir quiz ya da antrenman yap: analiz i?in konular ve ifadeler burada g?r?necek.",
                    pl: "Zr?b quiz albo trening z b??dami: tu pojawi? si? tematy i frazy do analizy.",
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
                        vi: "B?i",
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
                        vi: "B?i",
                        id: "Pel.",
                        tr: "Ders",
                        pl: "Lek.",
                    })} {lessonId}
                          </Text>
                        </View>
                      </View>))}
                  </View>)}
              </View>) : !hasPremium ? (<TouchableOpacity accessibilityRole="button" accessibilityLabel="Mistake analytics" onPress={() => { hapticTap(); router.push('/phrase_analytics_screen' as any); }} activeOpacity={0.86} style={[styles.card, { backgroundColor: isGoldTheme ? 'rgba(8,8,6,0.92)' : t.bgCard, borderColor: isGoldTheme ? GOLD_RICH.hairline : '#FACC1566' }]}>
                <View style={[styles.cardIcon, { backgroundColor: isGoldTheme ? GOLD_RICH.wash : '#FACC1520', borderColor: isGoldTheme ? GOLD_RICH.hairline : '#FACC1566' }]}>
                  <Ionicons name="analytics" size={20} color={analyticsAccent}/>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                    {triLang(lang, {
                ru: 'Аналитика ошибок',
                uk: 'Аналітика помилок',
                es: 'Análisis de errores',
                'pt-BR': "An?lise de erros",
                vi: "Ph?n t?ch l?i",
                id: "Analitik kesalahan",
                tr: "Hata analizi",
                pl: "Analiza b??d?w",
            })}
                  </Text>
                  <Text style={[styles.cardSub, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={2}>
                    {triLang(lang, {
                ru: 'Где ошибаешься чаще всего - по темам и фразам',
                uk: 'Де помиляєшся найчастіше - за темами й фразами',
                es: 'Dónde fallas más: temas y frases concretas',
                'pt-BR': "Onde voc? erra com mais frequ?ncia: por temas e frases",
                vi: "B?n hay sai nh?t ? ??u: theo ch? ?? v? c?m c?u",
                id: "Di mana kamu paling sering salah: berdasarkan topik dan frasa",
                tr: "En ?ok nerede hata yap?yorsun: konu ve ifadelere g?re",
                pl: "Gdzie najcz??ciej si? mylisz: wed?ug temat?w i fraz",
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
        alignItems: 'flex-start',
        borderRadius: 18,
        borderWidth: 1,
        paddingVertical: 14,
        paddingHorizontal: 14,
        gap: 12,
    },
    cardIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        borderWidth: 1,
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
