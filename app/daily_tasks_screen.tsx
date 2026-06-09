import { Ionicons } from '@expo/vector-icons';
import TapScale from '../components/TapScale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { triLang, type Lang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { GOLD_RICH, goldTaskAccent, goldShadow } from '../constants/goldTheme';
import { localizedDailyTaskStrings } from './daily_tasks_es_locale';
import ReportErrorButton from '../components/ReportErrorButton';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import XpGainBadge from '../components/XpGainBadge';
import { safeRouterBack } from './navigation_back';
import { checkAchievements } from './achievements';
import { claimTaskWithReward, countClaimedForTaskList, DailyTask, dailyTaskAvailableForStudyTarget, filterDailyTasksForStudyTarget, getTodayTasks, getTodayKey, getArenaComboRequirement, getTodayTasksSafe, loadTodayProgress, TaskProgress, TaskType, rerollDailyTask, getDailyRerollsLeftToday, DAILY_TASK_REROLL_COST_SHARDS, DAILY_TASK_REROLL_MAX_PER_DAY, } from './daily_tasks';
import { LESSONS_WITH_IRREGULAR_VERBS } from './irregular_verbs_data';
import { registerXP } from './xp_manager';
import { claimDailyTasksAllShardsReward, isDailyTasksAllShardsRewardClaimedForDay, SHARD_REWARDS, getShardsBalance, } from './shards_system';
import { Image } from 'expo-image';
import { oskolokImageForPackShards } from './oskolok';
import { primeLessonScreenFromStorage } from './lesson_screen_bootstrap';
import { emitAppEvent, onAppEvent } from './events';
import { DAILY_TASK_ACHIEVEMENT_ICONS, DAILY_TASK_ID_ACHIEVEMENT_ICONS } from './daily_task_achievement_icons';
import { lastOpenedLessonKey, quizNavLevelKey } from './target_storage_keys';
import { frenchLessonRuntimeAvailableForTarget } from './french_content_source_gate';
import { frenchQuizGateCopy, quizContentAvailableForTarget } from './quiz_target_gate';
import { diagnosticContentAvailableForTarget, frenchDiagnosticGateCopy } from './diagnostic_target_gate';
import { getDailyTaskCardPressIntent } from './daily_task_card_press_intent';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
const PREMIUM_TASK_TYPES = new Set<TaskType>([]);
type DailyTaskUiMeta = {
    stage: string;
    label: string;
    reason: string;
    cta: string;
    minutes: string;
    icon: keyof typeof Ionicons.glyphMap;
    tone: string;
};

function slavicPlural(count: number, one: string, few: string, many: string): string {
    const normalized = Math.abs(Math.floor(count));
    const mod10 = normalized % 10;
    const mod100 = normalized % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

const getDailyTaskUiMeta = (type: TaskType, lang: Lang): DailyTaskUiMeta => {
    const byType: Record<TaskType, DailyTaskUiMeta> = {
        daily_active: {
            stage: triLang(lang, {
                ru: 'Старт',
                uk: 'Старт',
                es: 'Inicio',
                'pt-BR': "Início",
                vi: "Bắt đầu",
                id: "Mulai",
                tr: "Başlangıç",
                pl: "Start",
            }),
            label: triLang(lang, {
                ru: 'Разогрев',
                uk: 'Розігрів',
                es: 'Calentamiento',
                'pt-BR': "Aquecimento",
                vi: "Khởi động",
                id: "Pemanasan",
                tr: "Isınma",
                pl: "Rozgrzewka",
            }),
            reason: triLang(lang, {
                ru: 'Открой урок и собери одну фразу.',
                uk: 'Відкрий урок і збери одну фразу.',
                es: 'Abre una lección y completa una frase.',
                'pt-BR': "Abra uma lição e complete uma frase.",
                vi: "Mở một bài học và hoàn thành một cụm từ.",
                id: "Buka pelajaran dan lengkapi satu frasa.",
                tr: "Bir ders aç ve bir ifadeyi tamamla.",
                pl: "Otwórz lekcję i uzupełnij jeden zwrot.",
            }),
            cta: triLang(lang, {
                ru: 'Открыть урок',
                uk: 'Відкрити урок',
                es: 'Abrir lección',
                'pt-BR': "Abrir lição",
                vi: "Mở bài học",
                id: "Buka pelajaran",
                tr: "Dersi aç",
                pl: "Otwórz lekcję",
            }),
            minutes: '1-2 мин',
            icon: 'sunny',
            tone: '#60A5FA',
        },
        total_answers: {
            stage: triLang(lang, {
                ru: 'Практика',
                uk: 'Практика',
                es: 'Práctica',
                'pt-BR': "Prática",
                vi: "Luyện tập",
                id: "Latihan",
                tr: "Pratik",
                pl: "Ćwiczenie",
            }),
            label: triLang(lang, {
                ru: 'Набор фраз',
                uk: 'Набір фраз',
                es: 'Frases',
                'pt-BR': "Frases",
                vi: "Cụm từ",
                id: "Frasa",
                tr: "İfadeler",
                pl: "Zwroty",
            }),
            reason: triLang(lang, {
                ru: 'Больше собранных фраз — легче вспоминать их дальше.',
                uk: 'Більше зібраних фраз — легше згадувати їх далі.',
                es: 'Más frases completas hacen más fácil recordarlas luego.',
                'pt-BR': "Mais frases completas facilitam lembrar delas depois.",
                vi: "Càng có nhiều cụm từ hoàn chỉnh, bạn càng dễ nhớ lại sau này.",
                id: "Lebih banyak frasa lengkap membuatnya lebih mudah diingat nanti.",
                tr: "Daha fazla tam ifade, onları sonra hatırlamayı kolaylaştırır.",
                pl: "Więcej pełnych zwrotów ułatwia ich późniejsze przypomnienie.",
            }),
            cta: triLang(lang, {
                ru: 'Тренировать',
                uk: 'Тренувати',
                es: 'Practicar',
                'pt-BR': "Praticar",
                vi: "Luyện tập",
                id: "Latihan",
                tr: "Pratik yap",
                pl: "Ćwicz",
            }),
            minutes: '3-8 мин',
            icon: 'flash',
            tone: '#FBBF24',
        },
        correct_streak: {
            stage: triLang(lang, {
                ru: 'Точность',
                uk: 'Точність',
                es: 'Precisión',
                'pt-BR': "Precisão",
                vi: "Độ chính xác",
                id: "Akurasi",
                tr: "Doğruluk",
                pl: "Dokładność",
            }),
            label: triLang(lang, {
                ru: 'Без ошибок',
                uk: 'Без помилок',
                es: 'Sin errores',
                'pt-BR': "Sem erros",
                vi: "Không lỗi",
                id: "Tanpa kesalahan",
                tr: "Hatasız",
                pl: "Bez błędów",
            }),
            reason: triLang(lang, {
                ru: 'Серия без ошибок помогает отвечать спокойнее и точнее.',
                uk: 'Серія без помилок допомагає відповідати спокійніше й точніше.',
                es: 'Una racha sin errores entrena calma y precisión.',
                'pt-BR': "Uma sequência sem erros treina calma e precisão.",
                vi: "Một chuỗi không lỗi giúp luyện sự bình tĩnh và độ chính xác.",
                id: "Rangkaian tanpa kesalahan melatih ketenangan dan akurasi.",
                tr: "Hatasız bir seri sakinliği ve doğruluğu geliştirir.",
                pl: "Seria bez błędów ćwiczy spokój i dokładność.",
            }),
            cta: triLang(lang, {
                ru: 'Собрать серию',
                uk: 'Зібрати серію',
                es: 'Hacer racha',
                'pt-BR': "Fazer sequência",
                vi: "Tạo chuỗi",
                id: "Buat rangkaian",
                tr: "Seri yap",
                pl: "Zrób serię",
            }),
            minutes: '4-7 мин',
            icon: 'radio-button-on',
            tone: '#34D399',
        },
        lesson_no_mistakes: {
            stage: triLang(lang, {
                ru: 'Точность',
                uk: 'Точність',
                es: 'Precisión',
                'pt-BR': "Precisão",
                vi: "Độ chính xác",
                id: "Akurasi",
                tr: "Doğruluk",
                pl: "Dokładność",
            }),
            label: triLang(lang, {
                ru: 'Чистая серия',
                uk: 'Чиста серія',
                es: 'Serie limpia',
                'pt-BR': "Sequência limpa",
                vi: "Chuỗi sạch",
                id: "Rangkaian bersih",
                tr: "Temiz seri",
                pl: "Czysta seria",
            }),
            reason: triLang(lang, {
                ru: 'Хорошая проверка: тема вспоминается без подсказок.',
                uk: 'Добра перевірка: тема згадується без підказок.',
                es: 'Buena prueba: recuerdas el tema sin pistas.',
                'pt-BR': "Boa prova: você lembra o tema sem pistas.",
                vi: "Bài kiểm tra tốt: bạn nhớ chủ đề mà không cần gợi ý.",
                id: "Uji yang bagus: kamu mengingat topik tanpa petunjuk.",
                tr: "İyi bir kontrol: konuyu ipucu olmadan hatırlıyorsun.",
                pl: "Dobry sprawdzian: pamiętasz temat bez podpowiedzi.",
            }),
            cta: triLang(lang, {
                ru: 'Играть аккуратно',
                uk: 'Грати уважно',
                es: 'Jugar con calma',
                'pt-BR': "Jogar com calma",
                vi: "Chơi bình tĩnh",
                id: "Main dengan tenang",
                tr: "Sakin oyna",
                pl: "Graj spokojnie",
            }),
            minutes: '5-9 мин',
            icon: 'sparkles',
            tone: '#34D399',
        },
        quiz_easy: {
            stage: triLang(lang, {
                ru: 'Проверка',
                uk: 'Перевірка',
                es: 'Prueba',
                'pt-BR': "Teste",
                vi: "Kiểm tra",
                id: "Tes",
                tr: "Kontrol",
                pl: "Test",
            }),
            label: triLang(lang, {
                ru: 'Вызов',
                uk: 'Квіз',
                es: 'Quiz',
                'pt-BR': "Quiz",
                vi: "Quiz",
                id: "Kuis",
                tr: "Quiz",
                pl: "Quiz",
            }),
            reason: triLang(lang, {
                ru: 'Быстрая проверка того, что уже держится в памяти.',
                uk: 'Швидка перевірка того, що вже тримається в пам\'яті.',
                es: 'Una prueba rápida de lo que ya recuerdas.',
                'pt-BR': "Uma verificação rápida do que você já lembra.",
                vi: "Một bài kiểm tra nhanh những gì bạn đã nhớ.",
                id: "Tes cepat untuk hal yang sudah kamu ingat.",
                tr: "Zaten hatırladıkların için hızlı bir kontrol.",
                pl: "Szybki test tego, co już pamiętasz.",
            }),
            cta: triLang(lang, {
                ru: 'Открыть вызовы',
                uk: 'Відкрити квізи',
                es: 'Abrir quizzes',
                'pt-BR': "Abrir quizzes",
                vi: "Mở quiz",
                id: "Buka kuis",
                tr: "Quizleri aç",
                pl: "Otwórz quizy",
            }),
            minutes: '2-5 мин',
            icon: 'help-buoy',
            tone: '#A78BFA',
        },
        quiz_medium: {
            stage: triLang(lang, {
                ru: 'Проверка',
                uk: 'Перевірка',
                es: 'Prueba',
                'pt-BR': "Teste",
                vi: "Kiểm tra",
                id: "Tes",
                tr: "Kontrol",
                pl: "Test",
            }),
            label: triLang(lang, {
                ru: 'Вызов+',
                uk: 'Квіз+',
                es: 'Quiz+',
                'pt-BR': "Quiz+",
                vi: "Quiz+",
                id: "Kuis+",
                tr: "Quiz+",
                pl: "Quiz+",
            }),
            reason: triLang(lang, {
                ru: 'Чуть сложнее обычного: покажет, что стоит повторить.',
                uk: 'Трохи складніше звичайного: покаже, що варто повторити.',
                es: 'Un poco más difícil: muestra qué conviene repasar.',
                'pt-BR': "Um pouco mais difícil: mostra o que vale revisar.",
                vi: "Khó hơn một chút: cho thấy phần nào nên ôn lại.",
                id: "Sedikit lebih sulit: menunjukkan apa yang perlu diulang.",
                tr: "Biraz daha zor: neyi tekrar etmen gerektiğini gösterir.",
                pl: "Trochę trudniejsze: pokazuje, co warto powtórzyć.",
            }),
            cta: triLang(lang, {
                ru: 'Принять вызов',
                uk: 'Пройти квіз',
                es: 'Hacer quiz',
                'pt-BR': "Fazer quiz",
                vi: "Làm quiz",
                id: "Kerjakan kuis",
                tr: "Quiz yap",
                pl: "Zrób quiz",
            }),
            minutes: '3-6 мин',
            icon: 'school',
            tone: '#A78BFA',
        },
        quiz_hard: {
            stage: triLang(lang, {
                ru: 'Вызов',
                uk: 'Виклик',
                es: 'Reto',
                'pt-BR': "Desafio",
                vi: "Thử thách",
                id: "Tantangan",
                tr: "Meydan okuma",
                pl: "Wyzwanie",
            }),
            label: triLang(lang, {
                ru: 'Сложный вызов',
                uk: 'Складний квіз',
                es: 'Quiz difícil',
                'pt-BR': "Quiz difícil",
                vi: "Quiz khó",
                id: "Kuis sulit",
                tr: "Zor quiz",
                pl: "Trudny quiz",
            }),
            reason: triLang(lang, {
                ru: 'Сложная проверка для тех, кто хочет нагрузку посерьёзнее.',
                uk: 'Складна перевірка для тих, хто хоче серйозніше навантаження.',
                es: 'Una prueba difícil para practicar con más intensidad.',
                'pt-BR': "Uma prova difícil para praticar com mais intensidade.",
                vi: "Một bài kiểm tra khó để luyện tập với cường độ cao hơn.",
                id: "Tes sulit untuk berlatih dengan intensitas lebih tinggi.",
                tr: "Daha yoğun pratik yapmak için zor bir kontrol.",
                pl: "Trudny test do intensywniejszego ćwiczenia.",
            }),
            cta: triLang(lang, {
                ru: 'Открыть вызов',
                uk: 'Відкрити виклик',
                es: 'Abrir reto',
                'pt-BR': "Abrir desafio",
                vi: "Mở thử thách",
                id: "Buka tantangan",
                tr: "Meydan okumayı aç",
                pl: "Otwórz wyzwanie",
            }),
            minutes: '4-8 мин',
            icon: 'flame',
            tone: '#FB7185',
        },
        quiz_score: {
            stage: triLang(lang, {
                ru: 'Проверка',
                uk: 'Перевірка',
                es: 'Prueba',
                'pt-BR': "Teste",
                vi: "Kiểm tra",
                id: "Tes",
                tr: "Kontrol",
                pl: "Test",
            }),
            label: triLang(lang, {
                ru: 'XP в вызовах',
                uk: 'XP у квізах',
                es: 'XP en quiz',
                'pt-BR': "XP no quiz",
                vi: "XP trong quiz",
                id: "XP di kuis",
                tr: "Quiz XP",
                pl: "XP w quizie",
            }),
            reason: triLang(lang, {
                ru: 'Вызовы тренируют скорость и точность одновременно.',
                uk: 'Квізи тренують швидкість і точність одночасно.',
                es: 'Los quizzes entrenan velocidad y precisión a la vez.',
                'pt-BR': "Os quizzes treinam velocidade e precisão ao mesmo tempo.",
                vi: "Quiz luyện tốc độ và độ chính xác cùng lúc.",
                id: "Kuis melatih kecepatan dan akurasi sekaligus.",
                tr: "Quizler aynı anda hız ve doğruluk çalıştırır.",
                pl: "Quizy ćwiczą szybkość i dokładność jednocześnie.",
            }),
            cta: triLang(lang, {
                ru: 'Набрать XP',
                uk: 'Набрати XP',
                es: 'Ganar XP',
                'pt-BR': "Ganhar XP",
                vi: "Kiếm XP",
                id: "Dapatkan XP",
                tr: "XP kazan",
                pl: "Zdobądź XP",
            }),
            minutes: '3-7 мин',
            icon: 'analytics',
            tone: '#A78BFA',
        },
        quiz_perfect: {
            stage: triLang(lang, {
                ru: 'Мастерство',
                uk: 'Майстерність',
                es: 'Maestría',
                'pt-BR': "Maestria",
                vi: "Thành thạo",
                id: "Kemahiran",
                tr: "Ustalık",
                pl: "Mistrzostwo",
            }),
            label: triLang(lang, {
                ru: 'Идеальный вызов',
                uk: 'Ідеальний квіз',
                es: 'Quiz perfecto',
                'pt-BR': "Quiz perfeito",
                vi: "Quiz hoàn hảo",
                id: "Kuis sempurna",
                tr: "Kusursuz quiz",
                pl: "Quiz perfekcyjny",
            }),
            reason: triLang(lang, {
                ru: 'Цель на аккуратность: меньше угадывания, больше уверенности.',
                uk: 'Ціль на уважність: менше вгадування, більше впевненості.',
                es: 'Meta de precisión: menos adivinar, más confianza.',
                'pt-BR': "Meta de precisão: menos chute, mais confiança.",
                vi: "Mục tiêu chính xác: ít đoán hơn, tự tin hơn.",
                id: "Target akurasi: lebih sedikit menebak, lebih percaya diri.",
                tr: "Doğruluk hedefi: daha az tahmin, daha çok güven.",
                pl: "Cel dokładności: mniej zgadywania, więcej pewności.",
            }),
            cta: triLang(lang, {
                ru: 'Сделать идеально',
                uk: 'Зробити ідеально',
                es: 'Hacer perfecto',
                'pt-BR': "Fazer perfeito",
                vi: "Làm hoàn hảo",
                id: "Buat sempurna",
                tr: "Kusursuz yap",
                pl: "Zrób perfekcyjnie",
            }),
            minutes: '4-8 мин',
            icon: 'diamond',
            tone: '#A78BFA',
        },
        quiz_hard_perfect: {
            stage: triLang(lang, {
                ru: 'Мастерство',
                uk: 'Майстерність',
                es: 'Maestría',
                'pt-BR': "Maestria",
                vi: "Thành thạo",
                id: "Kemahiran",
                tr: "Ustalık",
                pl: "Mistrzostwo",
            }),
            label: triLang(lang, {
                ru: 'Идеальный hard',
                uk: 'Ідеальний hard',
                es: 'Hard perfecto',
                'pt-BR': "Hard perfeito",
                vi: "Hard hoàn hảo",
                id: "Hard sempurna",
                tr: "Kusursuz hard",
                pl: "Hard perfekcyjny",
            }),
            reason: triLang(lang, {
                ru: 'Сложная цель на чистое прохождение без случайных ответов.',
                uk: 'Складна ціль на чисте проходження без випадкових відповідей.',
                es: 'Un reto difícil para pasar sin respuestas al azar.',
                'pt-BR': "Um desafio difícil para passar sem respostas aleatórias.",
                vi: "Một thử thách khó để vượt qua mà không trả lời ngẫu nhiên.",
                id: "Tantangan sulit untuk diselesaikan tanpa jawaban acak.",
                tr: "Rastgele cevap vermeden geçmek için zor bir meydan okuma.",
                pl: "Trudne wyzwanie do przejścia bez przypadkowych odpowiedzi.",
            }),
            cta: triLang(lang, {
                ru: 'Принять вызов',
                uk: 'Прийняти виклик',
                es: 'Aceptar reto',
                'pt-BR': "Aceitar desafio",
                vi: "Nhận thử thách",
                id: "Terima tantangan",
                tr: "Meydan okumayı kabul et",
                pl: "Przyjmij wyzwanie",
            }),
            minutes: '5-10 мин',
            icon: 'trophy',
            tone: '#FB7185',
        },
        words_learned: {
            stage: triLang(lang, {
                ru: 'Словарь',
                uk: 'Словник',
                es: 'Vocabulario',
                'pt-BR': "Vocabulário",
                vi: "Từ vựng",
                id: "Kosakata",
                tr: "Kelime bilgisi",
                pl: "Słownictwo",
            }),
            label: triLang(lang, {
                ru: 'Новые слова',
                uk: 'Нові слова',
                es: 'Palabras',
                'pt-BR': "Palavras",
                vi: "Từ",
                id: "Kata",
                tr: "Kelimeler",
                pl: "Słowa",
            }),
            reason: triLang(lang, {
                ru: 'Расширяет базу слов, чтобы уроки и вызовы становились легче.',
                uk: 'Розширює базу слів, щоб уроки й квізи ставали легшими.',
                es: 'Amplía tu base para que lecciones y quizzes sean más fáciles.',
                'pt-BR': "Amplia sua base para que lições e quizzes fiquem mais fáceis.",
                vi: "Mở rộng nền tảng để bài học và quiz dễ hơn.",
                id: "Perluas dasar agar pelajaran dan kuis jadi lebih mudah.",
                tr: "Derslerin ve quizlerin kolaylaşması için temelini genişletir.",
                pl: "Rozszerza bazę, aby lekcje i quizy były łatwiejsze.",
            }),
            cta: triLang(lang, {
                ru: 'Учить слова',
                uk: 'Вчити слова',
                es: 'Aprender palabras',
                'pt-BR': "Aprender palavras",
                vi: "Học từ",
                id: "Pelajari kata",
                tr: "Kelime öğren",
                pl: "Ucz się słów",
            }),
            minutes: '3-6 мин',
            icon: 'book',
            tone: '#38BDF8',
        },
        verb_learned: {
            stage: triLang(lang, {
                ru: 'Грамматика',
                uk: 'Граматика',
                es: 'Gramática',
                'pt-BR': "Gramática",
                vi: "Ngữ pháp",
                id: "Tata bahasa",
                tr: "Dil bilgisi",
                pl: "Gramatyka",
            }),
            label: triLang(lang, {
                ru: 'Глаголы',
                uk: 'Дієслова',
                es: 'Verbos',
                'pt-BR': "Verbos",
                vi: "Động từ",
                id: "Kata kerja",
                tr: "Fiiller",
                pl: "Czasowniki",
            }),
            reason: triLang(lang, {
                ru: 'Нерегулярные глаголы сильно повышают уверенность в реальных фразах.',
                uk: 'Неправильні дієслова сильно підвищують упевненість у реальних фразах.',
                es: 'Los verbos irregulares aumentan confianza en frases reales.',
                'pt-BR': "Os verbos irregulares aumentam a confiança em frases reais.",
                vi: "Động từ bất quy tắc tăng sự tự tin trong các cụm từ thật.",
                id: "Kata kerja tidak beraturan meningkatkan percaya diri dalam frasa nyata.",
                tr: "Düzensiz fiiller gerçek ifadelerde güveni artırır.",
                pl: "Czasowniki nieregularne zwiększają pewność w prawdziwych zwrotach.",
            }),
            cta: triLang(lang, {
                ru: 'Учить глаголы',
                uk: 'Вчити дієслова',
                es: 'Aprender verbos',
                'pt-BR': "Aprender verbos",
                vi: "Học động từ",
                id: "Pelajari kata kerja",
                tr: "Fiil öğren",
                pl: "Ucz się czasowników",
            }),
            minutes: '4-8 мин',
            icon: 'construct',
            tone: '#38BDF8',
        },
        open_theory: {
            stage: triLang(lang, {
                ru: 'Понимание',
                uk: 'Розуміння',
                es: 'Comprensión',
                'pt-BR': "Compreensão",
                vi: "Hiểu bài",
                id: "Pemahaman",
                tr: "Anlama",
                pl: "Zrozumienie",
            }),
            label: triLang(lang, {
                ru: 'Теория',
                uk: 'Теорія',
                es: 'Teoría',
                'pt-BR': "Teoria",
                vi: "Lý thuyết",
                id: "Teori",
                tr: "Teori",
                pl: "Teoria",
            }),
            reason: triLang(lang, {
                ru: 'Короткое правило помогает делать меньше случайных ошибок.',
                uk: 'Коротке правило допомагає робити менше випадкових помилок.',
                es: 'Una regla corta reduce errores aleatorios.',
                'pt-BR': "Uma regra curta reduz erros aleatórios.",
                vi: "Một quy tắc ngắn giúp giảm lỗi ngẫu nhiên.",
                id: "Aturan singkat mengurangi kesalahan acak.",
                tr: "Kısa bir kural rastgele hataları azaltır.",
                pl: "Krótka zasada zmniejsza przypadkowe błędy.",
            }),
            cta: triLang(lang, {
                ru: 'Открыть теорию',
                uk: 'Відкрити теорію',
                es: 'Abrir teoría',
                'pt-BR': "Abrir teoria",
                vi: "Mở lý thuyết",
                id: "Buka teori",
                tr: "Teoriyi aç",
                pl: "Otwórz teorię",
            }),
            minutes: '1-3 мин',
            icon: 'bulb',
            tone: '#FBBF24',
        },
        flashcard_view: {
            stage: triLang(lang, {
                ru: 'Память',
                uk: 'Пам\'ять',
                es: 'Memoria',
                'pt-BR': "Memória",
                vi: "Ghi nhớ",
                id: "Memori",
                tr: "Hafıza",
                pl: "Pamięć",
            }),
            label: triLang(lang, {
                ru: 'Карточки',
                uk: 'Картки',
                es: 'Tarjetas',
                'pt-BR': "Cartões",
                vi: "Thẻ học",
                id: "Kartu",
                tr: "Kartlar",
                pl: "Fiszki",
            }),
            reason: triLang(lang, {
                ru: 'Повторение возвращает старые фразы до того, как они выпадут из памяти.',
                uk: 'Повторення повертає старі фрази до того, як вони випадуть із пам\'яті.',
                es: 'Repasa antes de olvidar frases antiguas.',
                'pt-BR': "Revise antes de esquecer frases antigas.",
                vi: "Ôn lại trước khi quên các cụm từ cũ.",
                id: "Ulangi sebelum lupa frasa lama.",
                tr: "Eski ifadeleri unutmadan önce tekrar et.",
                pl: "Powtórz, zanim zapomnisz stare zwroty.",
            }),
            cta: triLang(lang, {
                ru: 'Открыть карточки',
                uk: 'Відкрити картки',
                es: 'Abrir tarjetas',
                'pt-BR': "Abrir cartões",
                vi: "Mở thẻ học",
                id: "Buka kartu",
                tr: "Kartları aç",
                pl: "Otwórz fiszki",
            }),
            minutes: '2-5 мин',
            icon: 'albums',
            tone: '#2DD4BF',
        },
        flashcard_save: {
            stage: triLang(lang, {
                ru: 'Память',
                uk: 'Пам\'ять',
                es: 'Memoria',
                'pt-BR': "Memória",
                vi: "Ghi nhớ",
                id: "Memori",
                tr: "Hafıza",
                pl: "Pamięć",
            }),
            label: triLang(lang, {
                ru: 'Сохранить фразы',
                uk: 'Зберегти фрази',
                es: 'Guardar frases',
                'pt-BR': "Salvar frases",
                vi: "Lưu cụm từ",
                id: "Simpan frasa",
                tr: "İfadeleri kaydet",
                pl: "Zapisz zwroty",
            }),
            reason: triLang(lang, {
                ru: 'Собирает личный словарь из фраз, которые действительно нужны тебе.',
                uk: 'Збирає особистий словник із фраз, які справді потрібні тобі.',
                es: 'Crea tu vocabulario personal con frases útiles.',
                'pt-BR': "Crie seu vocabulário pessoal com frases úteis.",
                vi: "Tạo vốn từ cá nhân bằng các cụm từ hữu ích.",
                id: "Buat kosakata pribadi dengan frasa berguna.",
                tr: "Yararlı ifadelerle kişisel kelime hazineni oluştur.",
                pl: "Buduj własne słownictwo z przydatnych zwrotów.",
            }),
            cta: triLang(lang, {
                ru: 'Найти фразы',
                uk: 'Знайти фрази',
                es: 'Buscar frases',
                'pt-BR': "Buscar frases",
                vi: "Tìm cụm từ",
                id: "Cari frasa",
                tr: "İfade ara",
                pl: "Szukaj zwrotów",
            }),
            minutes: '2-6 мин',
            icon: 'bookmark',
            tone: '#2DD4BF',
        },
        flashcard_flip: {
            stage: triLang(lang, {
                ru: 'Память',
                uk: 'Пам\'ять',
                es: 'Memoria',
                'pt-BR': "Memória",
                vi: "Ghi nhớ",
                id: "Memori",
                tr: "Hafıza",
                pl: "Pamięć",
            }),
            label: triLang(lang, {
                ru: 'Проверка карточек',
                uk: 'Перевірка карток',
                es: 'Revisar tarjetas',
                'pt-BR': "Revisar cartões",
                vi: "Ôn thẻ học",
                id: "Tinjau kartu",
                tr: "Kartları tekrar et",
                pl: "Powtórz fiszki",
            }),
            reason: triLang(lang, {
                ru: 'Проверяет, узнаешь ли ты фразу без немедленной подсказки.',
                uk: 'Перевіряє, чи впізнаєш фразу без миттєвої підказки.',
                es: 'Comprueba si reconoces la frase sin pista inmediata.',
                'pt-BR': "Confira se você reconhece a frase sem pista imediata.",
                vi: "Kiểm tra xem bạn có nhận ra cụm từ mà không cần gợi ý ngay không.",
                id: "Cek apakah kamu mengenali frasa tanpa petunjuk langsung.",
                tr: "İfadeyi anında ipucu olmadan tanıyıp tanımadığını kontrol et.",
                pl: "Sprawdź, czy rozpoznajesz zwrot bez natychmiastowej podpowiedzi.",
            }),
            cta: triLang(lang, {
                ru: 'Повторить',
                uk: 'Повторити',
                es: 'Repasar',
                'pt-BR': "Revisar",
                vi: "Ôn lại",
                id: "Ulangi",
                tr: "Tekrar et",
                pl: "Powtórz",
            }),
            minutes: '2-5 мин',
            icon: 'repeat',
            tone: '#2DD4BF',
        },
        recall_session: {
            stage: triLang(lang, {
                ru: 'Повторение',
                uk: 'Повторення',
                es: 'Repaso',
                'pt-BR': "Revisão",
                vi: "Ôn tập",
                id: "Pengulangan",
                tr: "Tekrar",
                pl: "Powtórka",
            }),
            label: triLang(lang, {
                ru: 'Сессия памяти',
                uk: 'Сесія пам\'яті',
                es: 'Sesión memoria',
                'pt-BR': "Sessão de memória",
                vi: "Buổi ghi nhớ",
                id: "Sesi memori",
                tr: "Hafıza seansı",
                pl: "Sesja pamięci",
            }),
            reason: triLang(lang, {
                ru: 'Самое полезное для долгой памяти: возвращает фразы по расписанию.',
                uk: 'Найкорисніше для довгої пам\'яті: повертає фрази за розкладом.',
                es: 'Lo mejor para memoria larga: frases en el momento correcto.',
                'pt-BR': "O melhor para memória longa: frases no momento certo.",
                vi: "Tốt nhất cho trí nhớ dài hạn: cụm từ đúng lúc.",
                id: "Terbaik untuk memori jangka panjang: frasa pada waktu yang tepat.",
                tr: "Uzun süreli hafıza için en iyisi: doğru zamanda ifadeler.",
                pl: "Najlepsze dla długiej pamięci: zwroty we właściwym momencie.",
            }),
            cta: triLang(lang, {
                ru: 'Повторить сейчас',
                uk: 'Повторити зараз',
                es: 'Repasar ahora',
                'pt-BR': "Revisar agora",
                vi: "Ôn ngay",
                id: "Ulangi sekarang",
                tr: "Şimdi tekrar et",
                pl: "Powtórz teraz",
            }),
            minutes: '3-6 мин',
            icon: 'refresh-circle',
            tone: '#2DD4BF',
        },
        recall_answers: {
            stage: triLang(lang, {
                ru: 'Повторение',
                uk: 'Повторення',
                es: 'Repaso',
                'pt-BR': "Revisão",
                vi: "Ôn tập",
                id: "Pengulangan",
                tr: "Tekrar",
                pl: "Powtórka",
            }),
            label: triLang(lang, {
                ru: 'Ответы памяти',
                uk: 'Відповіді пам\'яті',
                es: 'Respuestas',
                'pt-BR': "Respostas",
                vi: "Câu trả lời",
                id: "Jawaban",
                tr: "Cevaplar",
                pl: "Odpowiedzi",
            }),
            reason: triLang(lang, {
                ru: 'Закрепляет старое, чтобы новый материал не вытеснял выученное.',
                uk: 'Закріплює старе, щоб новий матеріал не витісняв вивчене.',
                es: 'Fija lo antiguo para que lo nuevo no lo desplace.',
                'pt-BR': "Fixe o antigo para que o novo não o substitua.",
                vi: "Củng cố phần cũ để phần mới không đẩy nó ra.",
                id: "Kuatkan yang lama agar yang baru tidak menggantikannya.",
                tr: "Eski olanı sağlamlaştır ki yeni olan onun yerini almasın.",
                pl: "Utrwal stare rzeczy, aby nowe ich nie wyparły.",
            }),
            cta: triLang(lang, {
                ru: 'Начать повторение',
                uk: 'Почати повторення',
                es: 'Empezar repaso',
                'pt-BR': "Começar revisão",
                vi: "Bắt đầu ôn tập",
                id: "Mulai pengulangan",
                tr: "Tekrara başla",
                pl: "Zacznij powtórkę",
            }),
            minutes: '4-7 мин',
            icon: 'reload',
            tone: '#2DD4BF',
        },
        recall_perfect: {
            stage: triLang(lang, {
                ru: 'Мастерство',
                uk: 'Майстерність',
                es: 'Maestría',
                'pt-BR': "Maestria",
                vi: "Thành thạo",
                id: "Kemahiran",
                tr: "Ustalık",
                pl: "Mistrzostwo",
            }),
            label: triLang(lang, {
                ru: 'Чистое повторение',
                uk: 'Чисте повторення',
                es: 'Repaso perfecto',
                'pt-BR': "Revisão perfeita",
                vi: "Ôn tập hoàn hảo",
                id: "Pengulangan sempurna",
                tr: "Kusursuz tekrar",
                pl: "Perfekcyjna powtórka",
            }),
            reason: triLang(lang, {
                ru: 'Показывает, что старые фразы не просто знакомы, а реально доступны.',
                uk: 'Показує, що старі фрази не просто знайомі, а реально доступні.',
                es: 'Muestra que las frases antiguas están disponibles de verdad.',
                'pt-BR': "Mostra que as frases antigas estão realmente disponíveis.",
                vi: "Cho thấy các cụm từ cũ thật sự vẫn sẵn sàng dùng.",
                id: "Menunjukkan bahwa frasa lama benar-benar masih tersedia.",
                tr: "Eski ifadelerin gerçekten hazır olduğunu gösterir.",
                pl: "Pokazuje, że stare zwroty naprawdę są dostępne.",
            }),
            cta: triLang(lang, {
                ru: 'Сделать чисто',
                uk: 'Зробити чисто',
                es: 'Hacer limpio',
                'pt-BR': "Fazer limpo",
                vi: "Làm sạch lỗi",
                id: "Buat bersih",
                tr: "Temiz yap",
                pl: "Zrób czysto",
            }),
            minutes: '5-8 мин',
            icon: 'checkmark-done-circle',
            tone: '#2DD4BF',
        },
        trainer_words: {
            stage: triLang(lang, {
                ru: 'Моя практика',
                uk: 'Моя практика',
                es: 'Mi práctica',
                'pt-BR': "Minha prática",
                vi: "Luyện tập của tôi",
                id: "Latihan saya",
                tr: "Pratiğim",
                pl: "Moje ćwiczenie",
            }),
            label: triLang(lang, {
                ru: 'Слабые слова',
                uk: 'Слабкі слова',
                es: 'Palabras débiles',
                'pt-BR': "Palavras fracas",
                vi: "Từ yếu",
                id: "Kata lemah",
                tr: "Zayıf kelimeler",
                pl: "Słabe słowa",
            }),
            reason: triLang(lang, {
                ru: 'Возвращает именно те слова, где были ошибки, а не случайный материал.',
                uk: 'Повертає саме ті слова, де були помилки, а не випадковий матеріал.',
                es: 'Trae justo las palabras donde fallaste, no material aleatorio.',
                'pt-BR': "Traz exatamente as palavras em que você errou, não material aleatório.",
                vi: "Đưa đúng những từ bạn đã sai, không phải nội dung ngẫu nhiên.",
                id: "Mengambil kata yang tepat saat kamu salah, bukan materi acak.",
                tr: "Rastgele materyal değil, tam hata yaptığın kelimeleri getirir.",
                pl: "Podsuwa dokładnie te słowa, w których był błąd, nie losowy materiał.",
            }),
            cta: triLang(lang, {
                ru: 'Открыть слова',
                uk: 'Відкрити слова',
                es: 'Abrir palabras',
                'pt-BR': "Abrir palavras",
                vi: "Mở từ",
                id: "Buka kata",
                tr: "Kelimeleri aç",
                pl: "Otwórz słowa",
            }),
            minutes: '2-5 мин',
            icon: 'library',
            tone: '#38BDF8',
        },
        trainer_phrases: {
            stage: triLang(lang, {
                ru: 'Моя практика',
                uk: 'Моя практика',
                es: 'Mi práctica',
                'pt-BR': "Minha prática",
                vi: "Luyện tập của tôi",
                id: "Latihan saya",
                tr: "Pratiğim",
                pl: "Moje ćwiczenie",
            }),
            label: triLang(lang, {
                ru: 'Слабые фразы',
                uk: 'Слабкі фрази',
                es: 'Frases débiles',
                'pt-BR': "Frases fracas",
                vi: "Cụm từ yếu",
                id: "Frasa lemah",
                tr: "Zayıf ifadeler",
                pl: "Słabe zwroty",
            }),
            reason: triLang(lang, {
                ru: 'Чинит целые фразы: это ближе к живому английскому, чем одиночные слова.',
                uk: 'Лагодить цілі фрази: це ближче до живої англійської, ніж окремі слова.',
                es: 'Repara frases completas: más real que palabras sueltas.',
                'pt-BR': "Conserta frases completas: mais real do que palavras soltas.",
                vi: "Sửa các cụm từ hoàn chỉnh: thực tế hơn từ rời.",
                id: "Perbaiki frasa lengkap: lebih nyata daripada kata lepas.",
                tr: "Tam ifadeleri onarır: tek tek kelimelerden daha gerçektir.",
                pl: "Naprawia pełne zwroty: to bardziej realne niż pojedyncze słowa.",
            }),
            cta: triLang(lang, {
                ru: 'Тренировать фразы',
                uk: 'Тренувати фрази',
                es: 'Practicar frases',
                'pt-BR': "Praticar frases",
                vi: "Luyện cụm từ",
                id: "Latih frasa",
                tr: "İfade çalış",
                pl: "Ćwicz zwroty",
            }),
            minutes: '3-7 мин',
            icon: 'chatbubbles',
            tone: '#2DD4BF',
        },
        trainer_arena: {
            stage: triLang(lang, {
                ru: 'Моя практика',
                uk: 'Моя практика',
                es: 'Mi práctica',
                'pt-BR': "Minha prática",
                vi: "Luyện tập của tôi",
                id: "Latihan saya",
                tr: "Pratiğim",
                pl: "Moje ćwiczenie",
            }),
            label: triLang(lang, {
                ru: 'Быстрые ошибки',
                uk: 'Швидкі помилки',
                es: "Errores rápidos",
                'pt-BR': "Erros rápidos",
                vi: "Lỗi nhanh",
                id: "Kesalahan cepat",
                tr: "Hızlı hatalar",
                pl: "Szybkie błędy",
            }),
            reason: triLang(lang, {
                ru: 'Разбирает быстрые ошибки без давления, чтобы следующий ответ был увереннее.',
                uk: 'Розбирає швидкі помилки без тиску, щоб наступна відповідь була впевненішою.',
                es: "Revisa errores rápidos sin presión.",
                'pt-BR': "Revisa erros rápidos sem pressão.",
                vi: "Ôn các lỗi nhanh mà không bị áp lực.",
                id: "Meninjau kesalahan cepat tanpa tekanan.",
                tr: "Hızlı hataları baskı olmadan tekrar eder.",
                pl: "Powtarza szybkie błędy bez presji.",
            }),
            cta: triLang(lang, {
                ru: 'Разобрать ошибки',
                uk: 'Розібрати помилки',
                es: "Revisar errores",
                'pt-BR': "Revisar erros",
                vi: "Ôn lỗi sai",
                id: "Tinjau kesalahan",
                tr: "Hataları incele",
                pl: "Powtórz błędy",
            }),
            minutes: '3-6 мин',
            icon: 'shield-checkmark',
            tone: '#FB7185',
        },
        daily_phrase_read: {
            stage: triLang(lang, {
                ru: 'Микро-шаг',
                uk: 'Мікро-крок',
                es: 'Micro paso',
                'pt-BR': "Micro passo",
                vi: "Bước nhỏ",
                id: "Langkah mikro",
                tr: "Mikro adım",
                pl: "Mikrokrok",
            }),
            label: triLang(lang, {
                ru: 'Фраза дня',
                uk: 'Фраза дня',
                es: 'Frase del día',
                'pt-BR': "Frase do dia",
                vi: "Cụm từ hôm nay",
                id: "Frasa hari ini",
                tr: "Günün ifadesi",
                pl: "Zwrot dnia",
            }),
            reason: triLang(lang, {
                ru: 'Одна полезная фраза в день поддерживает контакт с языком.',
                uk: 'Одна корисна фраза на день підтримує контакт із мовою.',
                es: 'Una frase útil al día mantiene contacto con el idioma.',
                'pt-BR': "Uma frase útil por dia mantém contato com o idioma.",
                vi: "Một cụm từ hữu ích mỗi ngày giúp bạn giữ liên hệ với ngôn ngữ.",
                id: "Satu frasa berguna per hari menjaga kontak dengan bahasa.",
                tr: "Günde bir yararlı ifade dil ile teması korur.",
                pl: "Jeden przydatny zwrot dziennie utrzymuje kontakt z językiem.",
            }),
            cta: triLang(lang, {
                ru: 'Открыть фразу',
                uk: 'Відкрити фразу',
                es: 'Abrir frase',
                'pt-BR': "Abrir frase",
                vi: "Mở cụm từ",
                id: "Buka frasa",
                tr: "İfadeyi aç",
                pl: "Otwórz zwrot",
            }),
            minutes: '<1 мин',
            icon: 'newspaper',
            tone: '#60A5FA',
        },
        daily_phrase_save: {
            stage: triLang(lang, {
                ru: 'Микро-шаг',
                uk: 'Мікро-крок',
                es: 'Micro paso',
                'pt-BR': "Micro passo",
                vi: "Bước nhỏ",
                id: "Langkah mikro",
                tr: "Mikro adım",
                pl: "Mikrokrok",
            }),
            label: triLang(lang, {
                ru: 'В личный запас',
                uk: 'В особистий запас',
                es: 'Guardar',
                'pt-BR': "Salvar",
                vi: "Lưu",
                id: "Simpan",
                tr: "Kaydet",
                pl: "Zapisz",
            }),
            reason: triLang(lang, {
                ru: 'Сохраняет полезную фразу, чтобы она вернулась в повторении.',
                uk: 'Зберігає корисну фразу, щоб вона повернулась у повторенні.',
                es: 'Guarda una frase útil para repasarla después.',
                'pt-BR': "Salve uma frase útil para revisar depois.",
                vi: "Lưu một cụm từ hữu ích để ôn lại sau.",
                id: "Simpan frasa berguna untuk diulang nanti.",
                tr: "Sonra tekrar etmek için yararlı bir ifadeyi kaydet.",
                pl: "Zapisz przydatny zwrot do późniejszej powtórki.",
            }),
            cta: triLang(lang, {
                ru: 'Сохранить фразу',
                uk: 'Зберегти фразу',
                es: 'Guardar frase',
                'pt-BR': "Salvar frase",
                vi: "Lưu cụm từ",
                id: "Simpan frasa",
                tr: "İfadeyi kaydet",
                pl: "Zapisz zwrot",
            }),
            minutes: '<1 мин',
            icon: 'star',
            tone: '#60A5FA',
        },
        diagnostic_complete: {
            stage: triLang(lang, {
                ru: 'Диагностика',
                uk: 'Діагностика',
                es: 'Diagnóstico',
                'pt-BR': "Diagnóstico",
                vi: "Chẩn đoán",
                id: "Diagnostik",
                tr: "Tanılama",
                pl: "Diagnoza",
            }),
            label: triLang(lang, {
                ru: 'Тест уровня',
                uk: 'Тест рівня',
                es: 'Test nivel',
                'pt-BR': "Teste de nível",
                vi: "Kiểm tra trình độ",
                id: "Tes level",
                tr: "Seviye testi",
                pl: "Test poziomu",
            }),
            reason: triLang(lang, {
                ru: 'Помогает приложению точнее понимать твой уровень и подбирать нагрузку.',
                uk: 'Допомагає застосунку точніше розуміти твій рівень і добирати навантаження.',
                es: 'Ayuda a ajustar mejor nivel y carga.',
                'pt-BR': "Ajuda a ajustar melhor o nível e a carga.",
                vi: "Giúp điều chỉnh trình độ và khối lượng tốt hơn.",
                id: "Membantu menyesuaikan level dan beban dengan lebih baik.",
                tr: "Seviyeyi ve yükü daha iyi ayarlamaya yardım eder.",
                pl: "Pomaga lepiej dobrać poziom i obciążenie.",
            }),
            cta: triLang(lang, {
                ru: 'Пройти тест',
                uk: 'Пройти тест',
                es: 'Hacer test',
                'pt-BR': "Fazer teste",
                vi: "Làm bài kiểm tra",
                id: "Kerjakan tes",
                tr: "Test yap",
                pl: "Zrób test",
            }),
            minutes: '8-12 мин',
            icon: 'medkit',
            tone: '#FB7185',
        },
        different_lessons: {
            stage: triLang(lang, {
                ru: 'Гибкость',
                uk: 'Гнучкість',
                es: 'Flexibilidad',
                'pt-BR': "Flexibilidade",
                vi: "Linh hoạt",
                id: "Fleksibilitas",
                tr: "Esneklik",
                pl: "Elastyczność",
            }),
            label: triLang(lang, {
                ru: 'Разные темы',
                uk: 'Різні теми',
                es: 'Temas distintos',
                'pt-BR': "Temas diferentes",
                vi: "Chủ đề khác nhau",
                id: "Topik berbeda",
                tr: "Farklı konular",
                pl: "Różne tematy",
            }),
            reason: triLang(lang, {
                ru: 'Смешивание тем снижает иллюзию знания и укрепляет перенос навыка.',
                uk: 'Змішування тем зменшує ілюзію знання й зміцнює перенесення навички.',
                es: 'Mezclar temas reduce falsa seguridad y mejora transferencia.',
                'pt-BR': "Misturar temas reduz falsa segurança e melhora a transferência.",
                vi: "Trộn chủ đề giảm cảm giác chắc chắn giả và cải thiện khả năng chuyển dùng.",
                id: "Mencampur topik mengurangi rasa aman palsu dan meningkatkan transfer.",
                tr: "Konuları karıştırmak sahte güveni azaltır ve aktarımı geliştirir.",
                pl: "Mieszanie tematów zmniejsza fałszywą pewność i poprawia przenoszenie wiedzy.",
            }),
            cta: triLang(lang, {
                ru: 'Выбрать уроки',
                uk: 'Обрати уроки',
                es: 'Elegir lecciones',
                'pt-BR': "Escolher lições",
                vi: "Chọn bài học",
                id: "Pilih pelajaran",
                tr: "Ders seç",
                pl: "Wybierz lekcje",
            }),
            minutes: '5-12 мин',
            icon: 'git-branch',
            tone: '#FBBF24',
        },
        lesson_complete: {
            stage: triLang(lang, {
                ru: 'Фокус',
                uk: 'Фокус',
                es: 'Foco',
                'pt-BR': "Foco",
                vi: "Tập trung",
                id: "Fokus",
                tr: "Odak",
                pl: "Skupienie",
            }),
            label: triLang(lang, {
                ru: 'Закрыть урок',
                uk: 'Закрити урок',
                es: 'Terminar lección',
                'pt-BR': "Terminar lição",
                vi: "Hoàn thành bài học",
                id: "Selesaikan pelajaran",
                tr: "Dersi bitir",
                pl: "Zakończ lekcję",
            }),
            reason: triLang(lang, {
                ru: 'Доводит тему до конца вместо вечного старта без завершения.',
                uk: 'Доводить тему до кінця замість постійного старту без завершення.',
                es: 'Termina un tema en vez de empezar sin cerrar.',
                'pt-BR': "Termine um tema em vez de começar sem fechar.",
                vi: "Hoàn thành một chủ đề thay vì bắt đầu rồi bỏ dở.",
                id: "Selesaikan satu topik, bukan mulai tanpa menutupnya.",
                tr: "Kapatmadan başlamak yerine bir konuyu bitir.",
                pl: "Zakończ temat, zamiast zaczynać bez domknięcia.",
            }),
            cta: triLang(lang, {
                ru: 'Продолжить урок',
                uk: 'Продовжити урок',
                es: 'Continuar lección',
                'pt-BR': "Continuar lição",
                vi: "Tiếp tục bài học",
                id: "Lanjutkan pelajaran",
                tr: "Derse devam et",
                pl: "Kontynuuj lekcję",
            }),
            minutes: '6-12 мин',
            icon: 'flag',
            tone: '#FBBF24',
        },
        morning_session: {
            stage: triLang(lang, {
                ru: 'Ритм',
                uk: 'Ритм',
                es: 'Ritmo',
                'pt-BR': "Ritmo",
                vi: "Nhịp độ",
                id: "Ritme",
                tr: "Ritim",
                pl: "Rytm",
            }),
            label: triLang(lang, {
                ru: 'Утренний якорь',
                uk: 'Ранковий якір',
                es: 'Ancla mañana',
                'pt-BR': "Âncora da manhã",
                vi: "Neo buổi sáng",
                id: "Jangkar pagi",
                tr: "Sabah çıpası",
                pl: "Poranna kotwica",
            }),
            reason: triLang(lang, {
                ru: 'Утренняя короткая сессия повышает шанс не пропустить день.',
                uk: 'Ранкова коротка сесія підвищує шанс не пропустити день.',
                es: 'Una sesión matinal aumenta la probabilidad de no fallar.',
                'pt-BR': "Uma sessão matinal aumenta a chance de não falhar.",
                vi: "Một buổi học sáng tăng khả năng không bị đứt nhịp.",
                id: "Sesi pagi meningkatkan peluang untuk tidak gagal.",
                tr: "Sabah seansı aksatmama ihtimalini artırır.",
                pl: "Poranna sesja zwiększa szansę, że nie odpuścisz.",
            }),
            cta: triLang(lang, {
                ru: 'Начать урок',
                uk: 'Почати урок',
                es: 'Empezar lección',
                'pt-BR': "Começar lição",
                vi: "Bắt đầu bài học",
                id: "Mulai pelajaran",
                tr: "Derse başla",
                pl: "Zacznij lekcję",
            }),
            minutes: '3-6 мин',
            icon: 'partly-sunny',
            tone: '#60A5FA',
        },
        evening_session: {
            stage: triLang(lang, {
                ru: 'Ритм',
                uk: 'Ритм',
                es: 'Ritmo',
                'pt-BR': "Ritmo",
                vi: "Nhịp độ",
                id: "Ritme",
                tr: "Ritim",
                pl: "Rytm",
            }),
            label: triLang(lang, {
                ru: 'Вечерний якорь',
                uk: 'Вечірній якір',
                es: 'Ancla noche',
                'pt-BR': "Âncora da noite",
                vi: "Neo buổi tối",
                id: "Jangkar malam",
                tr: "Akşam çıpası",
                pl: "Wieczorna kotwica",
            }),
            reason: triLang(lang, {
                ru: 'Закрывает день повторением, когда проще сохранить серию.',
                uk: 'Закриває день повторенням, коли простіше зберегти серію.',
                es: 'Cierra el día con repaso y protege la racha.',
                'pt-BR': "Feche o dia com revisão e proteja a sequência.",
                vi: "Kết thúc ngày bằng ôn tập và giữ chuỗi học.",
                id: "Tutup hari dengan pengulangan dan lindungi rangkaian.",
                tr: "Günü tekrarla kapat ve serini koru.",
                pl: "Zamknij dzień powtórką i chroń serię.",
            }),
            cta: triLang(lang, {
                ru: 'Закрыть день',
                uk: 'Закрити день',
                es: 'Cerrar día',
                'pt-BR': "Fechar dia",
                vi: "Kết thúc ngày",
                id: "Tutup hari",
                tr: "Günü kapat",
                pl: "Zamknij dzień",
            }),
            minutes: '3-6 мин',
            icon: 'moon',
            tone: '#60A5FA',
        },
        energy_spend: {
            stage: triLang(lang, {
                ru: 'Активность',
                uk: 'Активність',
                es: 'Actividad',
                'pt-BR': "Atividade",
                vi: "Hoạt động",
                id: "Aktivitas",
                tr: "Aktivite",
                pl: "Aktywność",
            }),
            label: triLang(lang, {
                ru: 'Энергия',
                uk: 'Енергія',
                es: 'Energía',
                'pt-BR': "Energia",
                vi: "Năng lượng",
                id: "Energi",
                tr: "Enerji",
                pl: "Energia",
            }),
            reason: triLang(lang, {
                ru: 'Превращает энергию в реальную практику, а не просто ресурс на экране.',
                uk: 'Перетворює енергію на реальну практику, а не просто ресурс на екрані.',
                es: 'Convierte energía en práctica real.',
                'pt-BR': "Transforme energia em prática real.",
                vi: "Biến năng lượng thành luyện tập thật.",
                id: "Ubah energi menjadi latihan nyata.",
                tr: "Enerjiyi gerçek pratiğe dönüştür.",
                pl: "Zamień energię w prawdziwe ćwiczenie.",
            }),
            cta: triLang(lang, {
                ru: 'Потратить с пользой',
                uk: 'Витратити з користю',
                es: 'Usar energía',
                'pt-BR': "Usar energia",
                vi: "Dùng năng lượng",
                id: "Gunakan energi",
                tr: "Enerji kullan",
                pl: "Użyj energii",
            }),
            minutes: '3-8 мин',
            icon: 'battery-charging',
            tone: '#FBBF24',
        },
        arena_play: {
            stage: triLang(lang, {
                ru: 'Арена',
                uk: 'Арена',
                es: 'Arena',
                'pt-BR': "Arena",
                vi: "Đấu trường",
                id: "Arena",
                tr: "Arena",
                pl: "Arena",
            }),
            label: triLang(lang, {
                ru: 'Живой матч',
                uk: 'Живий матч',
                es: 'Partida real',
                'pt-BR': "Partida real",
                vi: "Trận thật",
                id: "Pertandingan nyata",
                tr: "Gerçek maç",
                pl: "Prawdziwy mecz",
            }),
            reason: triLang(lang, {
                ru: 'Добавляет давление времени и проверяет, вспоминаются ли фразы в бою.',
                uk: 'Додає тиск часу й перевіряє, чи згадуються фрази в бою.',
                es: 'Añade presión de tiempo y prueba memoria en acción.',
                'pt-BR': "Adiciona pressão de tempo e testa a memória em ação.",
                vi: "Thêm áp lực thời gian và kiểm tra trí nhớ khi hành động.",
                id: "Menambahkan tekanan waktu dan menguji memori dalam aksi.",
                tr: "Zaman baskısı ekler ve hafızayı eylem içinde test eder.",
                pl: "Dodaje presję czasu i sprawdza pamięć w działaniu.",
            }),
            cta: triLang(lang, {
                ru: 'Играть арену',
                uk: 'Грати арену',
                es: 'Jugar arena',
                'pt-BR': "Jogar arena",
                vi: "Chơi đấu trường",
                id: "Main arena",
                tr: "Arenada oyna",
                pl: "Graj na arenie",
            }),
            minutes: '2-5 мин',
            icon: 'game-controller',
            tone: '#FB7185',
        },
        arena_win: {
            stage: triLang(lang, {
                ru: 'Арена',
                uk: 'Арена',
                es: 'Arena',
                'pt-BR': "Arena",
                vi: "Đấu trường",
                id: "Arena",
                tr: "Arena",
                pl: "Arena",
            }),
            label: triLang(lang, {
                ru: 'Победа',
                uk: 'Перемога',
                es: 'Victoria',
                'pt-BR': "Vitória",
                vi: "Chiến thắng",
                id: "Kemenangan",
                tr: "Zafer",
                pl: "Zwycięstwo",
            }),
            reason: triLang(lang, {
                ru: 'Проверяет не только участие, но и качество ответов под давлением.',
                uk: 'Перевіряє не лише участь, а й якість відповідей під тиском.',
                es: 'Prueba calidad de respuestas bajo presión.',
                'pt-BR': "Testa a qualidade das respostas sob pressão.",
                vi: "Kiểm tra chất lượng câu trả lời dưới áp lực.",
                id: "Menguji kualitas jawaban di bawah tekanan.",
                tr: "Baskı altında cevap kalitesini test eder.",
                pl: "Sprawdza jakość odpowiedzi pod presją.",
            }),
            cta: triLang(lang, {
                ru: 'Искать матч',
                uk: 'Шукати матч',
                es: 'Buscar partida',
                'pt-BR': "Buscar partida",
                vi: "Tìm trận",
                id: "Cari pertandingan",
                tr: "Maç ara",
                pl: "Szukaj meczu",
            }),
            minutes: '3-8 мин',
            icon: 'shield-checkmark',
            tone: '#FB7185',
        },
        arena_plays_wins_combo: {
            stage: triLang(lang, {
                ru: 'Арена',
                uk: 'Арена',
                es: 'Arena',
                'pt-BR': "Arena",
                vi: "Đấu trường",
                id: "Arena",
                tr: "Arena",
                pl: "Arena",
            }),
            label: triLang(lang, {
                ru: 'Матчи + победа',
                uk: 'Матчі + перемога',
                es: 'Partidas + victoria',
                'pt-BR': "Partidas + vitória",
                vi: "Trận + thắng",
                id: "Pertandingan + menang",
                tr: "Maçlar + zafer",
                pl: "Mecze + zwycięstwo",
            }),
            reason: triLang(lang, {
                ru: 'Балансирует смелость играть и умение выигрывать за счет знаний.',
                uk: 'Балансує сміливість грати й уміння вигравати завдяки знанням.',
                es: 'Equilibra jugar y ganar con conocimiento.',
                'pt-BR': "Equilibra jogar e ganhar com conhecimento.",
                vi: "Cân bằng giữa chơi, thắng và kiến thức.",
                id: "Menyeimbangkan bermain dan menang dengan pengetahuan.",
                tr: "Oynamayı ve kazanmayı bilgiyle dengeler.",
                pl: "Równoważy granie i wygrywanie z wiedzą.",
            }),
            cta: triLang(lang, {
                ru: 'Выйти на арену',
                uk: 'Вийти на арену',
                es: 'Ir a arena',
                'pt-BR': "Ir para a arena",
                vi: "Vào đấu trường",
                id: "Ke arena",
                tr: "Arenaya git",
                pl: "Idź na arenę",
            }),
            minutes: '5-10 мин',
            icon: 'medal',
            tone: '#FB7185',
        },
        arena_rank_promoted: {
            stage: triLang(lang, {
                ru: 'Арена',
                uk: 'Арена',
                es: 'Arena',
                'pt-BR': "Arena",
                vi: "Đấu trường",
                id: "Arena",
                tr: "Arena",
                pl: "Arena",
            }),
            label: triLang(lang, {
                ru: 'Рост ранга',
                uk: 'Зростання рангу',
                es: 'Subir rango',
                'pt-BR': "Subir de rank",
                vi: "Tăng hạng",
                id: "Naik peringkat",
                tr: "Rütbe yükselt",
                pl: "Awansuj w rankingu",
            }),
            reason: triLang(lang, {
                ru: 'Длинная цель дня: мотивирует играть качественно, а не просто нажимать.',
                uk: 'Довга ціль дня: мотивує грати якісно, а не просто натискати.',
                es: 'Meta larga: motiva calidad, no solo actividad.',
                'pt-BR': "Meta longa: motiva qualidade, não só atividade.",
                vi: "Mục tiêu dài hạn: khuyến khích chất lượng, không chỉ hoạt động.",
                id: "Target panjang: memotivasi kualitas, bukan hanya aktivitas.",
                tr: "Uzun hedef: sadece aktiviteyi değil kaliteyi de motive eder.",
                pl: "Długi cel: motywuje jakość, nie tylko aktywność.",
            }),
            cta: triLang(lang, {
                ru: 'Поднять ранг',
                uk: 'Підняти ранг',
                es: 'Subir rango',
                'pt-BR': "Subir de rank",
                vi: "Tăng hạng",
                id: "Naik peringkat",
                tr: "Rütbe yükselt",
                pl: "Awansuj w rankingu",
            }),
            minutes: '8-15 мин',
            icon: 'trending-up',
            tone: '#FB7185',
        },
        invite_friend: {
            stage: triLang(lang, {
                ru: 'Социальное',
                uk: 'Соціальне',
                es: 'Social',
                'pt-BR': "Social",
                vi: "Xã hội",
                id: "Sosial",
                tr: "Sosyal",
                pl: "Społeczność",
            }),
            label: triLang(lang, {
                ru: 'Друг',
                uk: 'Друг',
                es: 'Amigo',
                'pt-BR': "Amigo",
                vi: "Bạn bè",
                id: "Teman",
                tr: "Arkadaş",
                pl: "Znajomy",
            }),
            reason: triLang(lang, {
                ru: 'Отправь ссылку другу из приложения.',
                uk: 'Надішли посилання другу з застосунку.',
                es: 'Envía el enlace a un amigo desde la app.',
                'pt-BR': "Envie o link para um amigo pelo app.",
                vi: "Gửi liên kết cho một người bạn từ ứng dụng.",
                id: "Kirim tautan ke teman dari aplikasi.",
                tr: "Bağlantıyı uygulamadan bir arkadaşına gönder.",
                pl: "Wyślij link znajomemu z aplikacji.",
            }),
            cta: triLang(lang, {
                ru: 'Пригласить',
                uk: 'Запросити',
                es: 'Invitar',
                'pt-BR': "Convidar",
                vi: "Mời",
                id: "Undang",
                tr: "Davet et",
                pl: "Zaproś",
            }),
            minutes: '1 мин',
            icon: 'people',
            tone: '#94A3B8',
        },
    };
    return byType[type];
};
export default function DailyTasksScreen() {
    const router = useRouter();
    const { theme: t, f, themeMode } = useTheme();
    const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
    const isGoldTheme = themeMode === 'gold';
    const goldAccent = GOLD_RICH.metalGold;
    const goldBright = GOLD_RICH.champagne;
    const goldHairline = GOLD_RICH.hairline;
    const goldSoftBg = GOLD_RICH.wash;
    const goldDivider = GOLD_RICH.hairlineQuiet;
    const rewardActionBg = isGoldTheme ? GOLD_RICH.paleGold : t.correct;
    const rewardActionText = isGoldTheme ? t.textOnGold : t.correctText;
    const { lang } = useLang();
    const { studyTarget } = useStudyTarget();
    const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
    const bouncyStyle = useBouncyStyle(bouncyStretch);
    // Не подставляем getTodayTasks() (всегда тир уровня 1) — иначе после обновления/холодного старта
    // карточки не совпадают с AsyncStorage и «Забрать» не срабатывает, пока не перезагрузишь экран.
    const [tasks, setTasks] = useState<DailyTask[]>([]);
    const [progress, setProgress] = useState<TaskProgress[]>([]);
    const [userName, setUserName] = useState('');
    const [claimedXP, setClaimedXP] = useState<number | null>(null);
    /** Награда «3 осколка за тройку дня» уже забрана сегодня (AsyncStorage / облако). */
    const [trioShardsClaimed, setTrioShardsClaimed] = useState(false);
    /** Сколько замен ещё доступно сегодня (max DAILY_TASK_REROLL_MAX_PER_DAY). */
    const [rerollsLeft, setRerollsLeft] = useState(0);
    /** Подтверждение замены: если null — модалка скрыта. */
    const [rerollConfirm, setRerollConfirm] = useState<{
        task: DailyTask;
    } | null>(null);
    /** taskId, для которого сейчас идёт сетевой запрос замены (одна за раз). */
    const [rerollBusyId, setRerollBusyId] = useState<string | null>(null);
    /** Антидребезг клейма: свежий getTodayTasksSafe + registerXP не дают второго тапа «в никуда». */
    const [claimBusyId, setClaimBusyId] = useState<string | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [readyToNavigateTaskId, setReadyToNavigateTaskId] = useState<string | null>(null);
    const expandedTaskAnim = useRef(new Animated.Value(0)).current;
    const taskConfirmAnim = useRef(new Animated.Value(0)).current;
    const xpAnim = useRef(new Animated.Value(0)).current;
    const claimAnims = useRef<Record<string, Animated.Value>>({});
    // Анимации для премиум-плашки
    const premiumPulse = useRef(new Animated.Value(1)).current;
    const premiumSparkle = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const pulse = Animated.loop(Animated.sequence([
            Animated.timing(premiumPulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
            Animated.timing(premiumPulse, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ]));
        const sparkle = Animated.loop(Animated.sequence([
            Animated.timing(premiumSparkle, { toValue: 1, duration: 900, useNativeDriver: true }),
            Animated.timing(premiumSparkle, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]));
        pulse.start();
        sparkle.start();
        return () => { pulse.stop(); sparkle.stop(); };
    }, [premiumPulse, premiumSparkle]);
    useEffect(() => {
        setReadyToNavigateTaskId(null);
        taskConfirmAnim.setValue(0);
        Animated.timing(expandedTaskAnim, {
            toValue: expandedTaskId ? 1 : 0,
            duration: expandedTaskId ? 240 : 170,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished && expandedTaskId) {
                setReadyToNavigateTaskId(expandedTaskId);
            }
        });
    }, [expandedTaskAnim, expandedTaskId, taskConfirmAnim]);
    // Инициализируем анимации при изменении tasks (useEffect, не в теле рендера)
    useEffect(() => {
        (tasks ?? []).forEach(task => {
            if (!claimAnims.current[task.id]) {
                claimAnims.current[task.id] = new Animated.Value(1);
            }
        });
    }, [tasks]);
    useEffect(() => {
        AsyncStorage.getItem('user_name').then(n => { if (n)
            setUserName(n); });
    }, []);
    // Список заданий и прогресс с экрана должны ссылаться на один и тот же набор task id
    // (после смены уровня/премиума/подмен заданий), и прогресс в storage — быть с ним согласован.
    const refreshGen = useRef(0);
    const refreshTasksAndProgress = useCallback(() => {
        const gen = ++refreshGen.current;
        (async () => {
            try {
                const list = await getTodayTasksSafe(studyTarget);
                if (gen !== refreshGen.current)
                    return;
                setTasks(list);
                const p = await loadTodayProgress(list, studyTarget);
                if (gen !== refreshGen.current)
                    return;
                setProgress(p);
                const trio = await isDailyTasksAllShardsRewardClaimedForDay(getTodayKey());
                if (gen !== refreshGen.current)
                    return;
                setTrioShardsClaimed(trio);
                const left = await getDailyRerollsLeftToday(studyTarget);
                if (gen !== refreshGen.current)
                    return;
                setRerollsLeft(left);
            }
            catch {
                if (gen !== refreshGen.current)
                    return;
                const backupTaskList = filterDailyTasksForStudyTarget(getTodayTasks(), studyTarget);
                setTasks(backupTaskList);
                setProgress(backupTaskList.map((x) => ({ taskId: x.id, current: 0, completed: false, claimed: false })));
                setRerollsLeft(0);
            }
        })();
    }, [studyTarget]);
    const handleRerollConfirm = useCallback(async () => {
        const target = rerollConfirm?.task;
        if (!target || rerollBusyId)
            return;
        setRerollBusyId(target.id);
        try {
            const balance = await getShardsBalance();
            if (balance < DAILY_TASK_REROLL_COST_SHARDS) {
                const need = Math.max(0, DAILY_TASK_REROLL_COST_SHARDS - balance);
                setRerollConfirm(null);
                router.push({
                    pathname: '/shards_shop',
                    params: { need: String(need), source: 'daily_task_reroll' },
                } as any);
                return;
            }
            const r = await rerollDailyTask(target.id, studyTarget);
            if (r.ok) {
                emitAppEvent('action_toast', {
                    type: 'success',
                    messageRu: `🔄 Задание заменено · −${r.cost} 💎`,
                    messageUk: `🔄 Завдання замінено · −${r.cost} 💎`,
                    messageEs: `🔄 Tarea reemplazada · −${r.cost} 💎`,
                });
                setRerollConfirm(null);
                refreshTasksAndProgress();
                return;
            }
            if (r.reason === 'insufficient_shards') {
                const balance2 = await getShardsBalance();
                const need = Math.max(0, DAILY_TASK_REROLL_COST_SHARDS - balance2);
                setRerollConfirm(null);
                router.push({
                    pathname: '/shards_shop',
                    params: { need: String(need), source: 'daily_task_reroll' },
                } as any);
                return;
            }
            const reasonMsg: Record<string, {
                ru: string;
                uk: string;
                es: string;
                'pt-BR': string;
                vi: string;
                id: string;
                tr: string;
                pl: string;
            }> = {
                limit_reached: {
                    ru: 'Сегодня ты уже использовал замену. Завтра будет новая попытка.',
                    uk: 'Сьогодні ти вже використав заміну. Завтра буде нова спроба.',
                    es: 'Ya usaste tu reemplazo de hoy. Mañana podrás reemplazar otra tarea.',
                    'pt-BR': 'Você já usou a troca de hoje. Amanhã terá outra tentativa.',
                    vi: 'Hôm nay bạn đã dùng lượt đổi. Ngày mai sẽ có lượt mới.',
                    id: 'Kamu sudah memakai penggantian hari ini. Besok ada kesempatan baru.',
                    tr: 'Bugünkü değiştirme hakkını kullandın. Yarın yeni bir deneme olacak.',
                    pl: 'Dzisiejsza wymiana została już użyta. Jutro będzie kolejna próba.',
                },
                task_already_completed: {
                    ru: 'Это задание уже выполнено — заменять нечего.',
                    uk: 'Це завдання вже виконане — замінювати нема чого.',
                    es: 'Esta tarea ya está completada, no hay nada que reemplazar.',
                    'pt-BR': 'Esta tarefa já foi concluída. Não há nada para trocar.',
                    vi: 'Nhiệm vụ này đã hoàn thành, không còn gì để đổi.',
                    id: 'Tugas ini sudah selesai, tidak ada yang perlu diganti.',
                    tr: 'Bu görev zaten tamamlandı, değiştirilecek bir şey yok.',
                    pl: 'To zadanie jest już ukończone, nie ma czego wymieniać.',
                },
                no_candidates: {
                    ru: 'Замены нет — выбери другое задание.',
                    uk: 'Не знайшлось гідної заміни — спробуй інше завдання.',
                    es: 'No hay reemplazo disponible. Prueba con otra tarea.',
                    'pt-BR': 'Não há uma troca adequada. Tente outra tarefa.',
                    vi: 'Không tìm thấy nhiệm vụ thay thế phù hợp. Hãy thử nhiệm vụ khác.',
                    id: 'Tidak ada pengganti yang cocok. Coba tugas lain.',
                    tr: 'Uygun bir değiştirme bulunamadı. Başka bir görevi dene.',
                    pl: 'Nie znaleziono odpowiedniej wymiany. Spróbuj innego zadania.',
                },
            };
            const msg = reasonMsg[r.reason] ?? {
                ru: 'Замена не прошла. Попробуй ещё раз.',
                uk: 'Не вдалося замінити завдання. Спробуй ще раз.',
                es: 'No se pudo reemplazar la tarea. Inténtalo de nuevo.',
                'pt-BR': 'Não foi possível trocar a tarefa. Tente de novo.',
                vi: 'Không thể đổi nhiệm vụ. Hãy thử lại.',
                id: 'Gagal mengganti tugas. Coba lagi.',
                tr: 'Görev değiştirilemedi. Tekrar dene.',
                pl: 'Nie udało się wymienić zadania. Spróbuj ponownie.',
            };
            emitAppEvent('action_toast', {
                type: 'info',
                messageRu: msg.ru,
                messageUk: msg.uk,
                messageEs: msg.es,
            });
            setRerollConfirm(null);
        }
        finally {
            setRerollBusyId(null);
        }
    }, [rerollConfirm, rerollBusyId, refreshTasksAndProgress, router, studyTarget]);
    useFocusEffect(useCallback(() => {
        setExpandedTaskId(null);
        setReadyToNavigateTaskId(null);
        expandedTaskAnim.setValue(0);
        taskConfirmAnim.setValue(0);
        refreshTasksAndProgress();
    }, [expandedTaskAnim, refreshTasksAndProgress, taskConfirmAnim]));
    useEffect(() => {
        const sub = onAppEvent('daily_task_reward_claimed', () => { refreshTasksAndProgress(); });
        return () => sub.remove();
    }, [refreshTasksAndProgress]);
    const handleClaim = async (taskId: string, xpBase: number) => {
        if (claimBusyId)
            return;
        setClaimBusyId(taskId);
        try {
            const freshList = await getTodayTasksSafe(studyTarget);
            const tasksForClaim = freshList.length > 0 ? freshList : tasks;
            const { claimed, awardedXp } = await claimTaskWithReward(taskId, async () => {
                // registerXP сам резолвит имя из canonical UID + уровня, если userName пустой.
                // Раньше тут был ранний return при !userName — это и был баг "опыт не начислен"
                // когда пользователь жмёт Забрать до того, как AsyncStorage.getItem('user_name') резолвится.
                try {
                    const result = await registerXP(xpBase, 'daily_task_reward', userName || '', lang);
                    return Math.max(0, Math.round(result.finalDelta || xpBase));
                }
                catch {
                    // Не блокируем выдачу награды из-за transient-сбоя XP-пайплайна.
                    return xpBase;
                }
            }, { tasksForClaim, studyTarget });
            // Снимаем спиннер сразу после клейма: дальше могут быть медленные getTodayTasksSafe/loadTodayProgress.
            setClaimBusyId(null);
            if (!claimed) {
                refreshTasksAndProgress();
                emitAppEvent('action_toast', {
                    type: 'info',
                    messageRu: 'Похоже, награду ты уже забрал. Обнови список задач.',
                    messageUk: 'Нагороду вже отримано або дані оновилися. Перевірте список завдань.',
                    messageEs: 'La recompensa ya está reclamada o los datos cambiaron. Revisa la lista de tareas.',
                });
                return;
            }
            const t = await getTodayTasksSafe(studyTarget);
            setTasks(t);
            const newProgress = await loadTodayProgress(t, studyTarget);
            setProgress(newProgress);
            const allDone = newProgress.length > 0 && newProgress.every(p => p.claimed);
            const noReroll = allDone
                ? (await getDailyRerollsLeftToday(studyTarget).catch(() => rerollsLeft)) >= DAILY_TASK_REROLL_MAX_PER_DAY
                : false;
            checkAchievements({ type: 'daily_task', allDone, noReroll, studyTarget }).catch(() => { });
            void hapticSuccess();
            const anim = claimAnims.current[taskId];
            if (anim) {
                Animated.sequence([
                    Animated.timing(anim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }),
                ]).start();
            }
            setClaimedXP(awardedXp);
            xpAnim.setValue(0);
            Animated.sequence([
                Animated.timing(xpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.delay(1200),
                Animated.timing(xpAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]).start(() => setClaimedXP(null));
        }
        catch {
            emitAppEvent('action_toast', {
                type: 'error',
                messageRu: 'Награду забрать не получилось. Попробуй ещё раз.',
                messageUk: 'Не вдалося забрати нагороду. Спробуйте ще раз.',
                messageEs: 'No se pudo reclamar la recompensa. Inténtalo de nuevo.',
            });
        }
        finally {
            setClaimBusyId(null);
        }
    };
    const handleClaimTrioShards = useCallback(async () => {
        if (tasks.length === 0)
            return;
        const done = tasks.every((task) => {
            const p = progress.find((pr) => pr.taskId === task.id);
            return p?.completed === true;
        });
        if (!done || trioShardsClaimed)
            return;
        try {
            const ok = await claimDailyTasksAllShardsReward(getTodayKey());
            if (ok) {
                setTrioShardsClaimed(true);
                void hapticSuccess();
                refreshTasksAndProgress();
                return;
            }
            const synced = await isDailyTasksAllShardsRewardClaimedForDay(getTodayKey());
            setTrioShardsClaimed(synced);
            if (!synced) {
                emitAppEvent('action_toast', {
                    type: 'info',
                    messageRu: 'Осколки не загрузились. Попробуй ещё раз.',
                    messageUk: 'Не вдалося отримати уламки. Спробуйте ще раз.',
                    messageEs: 'No se pudieron obtener fragmentos. Inténtalo de nuevo.',
                });
            }
        }
        catch {
            emitAppEvent('action_toast', {
                type: 'error',
                messageRu: 'Осколки не загрузились. Проверь соединение.',
                messageUk: 'Помилка під час отримання уламків.',
                messageEs: 'Error al obtener fragmentos.',
            });
        }
    }, [tasks, progress, trioShardsClaimed, refreshTasksAndProgress]);
    const claimedCount = countClaimedForTaskList(tasks, progress);
    const allTasksObjectivesDone = tasks.length > 0 &&
        tasks.every((task) => {
            const p = progress.find((pr) => pr.taskId === task.id);
            return p?.completed === true;
        });
    const trioRewardCount = SHARD_REWARDS.daily_tasks_all;
    const trioClaimButtonEnabled = allTasksObjectivesDone && !trioShardsClaimed;
    const bonusAccent = isGoldTheme
        ? (trioClaimButtonEnabled ? GOLD_RICH.champagne : GOLD_RICH.paleGold)
        :
            trioShardsClaimed ? '#9CA3AF' : '#63D98F';
    const taskProgressById = new Map(progress.map((row) => [row.taskId, row]));
    const objectivesDoneCount = tasks.filter((task) => taskProgressById.get(task.id)?.completed).length;
    const handleTaskNav = async (task: DailyTask) => {
        if (!dailyTaskAvailableForStudyTarget(task, studyTarget)) {
            router.replace('/(tabs)/lessons' as any);
            return;
        }
        const lastLesson = await AsyncStorage.getItem(lastOpenedLessonKey(studyTarget));
        const lessonId = parseInt(lastLesson || '1', 10);
        const openLessonOrFrenchGate = async () => {
            if (!frenchLessonRuntimeAvailableForTarget(studyTarget, lessonId)) {
                emitAppEvent('action_toast', {
                    type: 'info',
                    messageRu: 'French урок ещё на source gate. English фразы не будут открыты как замена.',
                    messageUk: 'French урок ще на source gate. English фрази не відкриватимуться як заміна.',
                    messageEs: 'French lesson is still behind source gate.',
                });
                router.replace('/(tabs)/lessons' as any);
                return;
            }
            await primeLessonScreenFromStorage(lessonId, studyTarget);
            router.push({ pathname: '/lesson1', params: { id: lessonId } });
        };
        const openQuizOrFrenchGate = async (level: 'easy' | 'medium' | 'hard') => {
            if (!quizContentAvailableForTarget(studyTarget)) {
                const copy = frenchQuizGateCopy(lang);
                emitAppEvent('action_toast', {
                    type: 'info',
                    messageRu: copy.title,
                    messageUk: copy.title,
                    messageEs: 'French quizzes are still behind source gate.',
                });
                router.replace('/quizzes_screen' as any);
                return;
            }
            await AsyncStorage.setItem(quizNavLevelKey(studyTarget), level);
            router.replace('/quizzes_screen');
        };
        const openDiagnosticOrFrenchGate = () => {
            if (!diagnosticContentAvailableForTarget(studyTarget)) {
                const copy = frenchDiagnosticGateCopy(lang);
                emitAppEvent('action_toast', {
                    type: 'info',
                    messageRu: copy.title,
                    messageUk: copy.title,
                    messageEs: 'French diagnostic is still behind source gate.',
                });
                router.replace('/(tabs)/lessons' as any);
                return;
            }
            router.push('/diagnostic_test');
        };
        switch (task.type) {
            case 'different_lessons':
                // "Заниматься в N разных уроках" — отправляем в список, чтобы пользователь мог выбрать другой урок.
                router.replace('/(tabs)/lessons' as any);
                break;
            case 'total_answers':
            case 'correct_streak':
            case 'lesson_no_mistakes':
            case 'daily_active':
            case 'lesson_complete':
            case 'morning_session':
            case 'evening_session':
            case 'energy_spend':
                await openLessonOrFrenchGate();
                break;
            case 'verb_learned': {
                let verbLessonId = lessonId;
                if (!LESSONS_WITH_IRREGULAR_VERBS.has(verbLessonId)) {
                    const sorted = [...LESSONS_WITH_IRREGULAR_VERBS].sort((a, b) => a - b);
                    verbLessonId = sorted[0] ?? 1;
                }
                router.push({ pathname: '/lesson_irregular_verbs', params: { id: verbLessonId } });
                break;
            }
            case 'words_learned':
                router.push({ pathname: '/lesson_words', params: { id: lessonId } });
                break;
            case 'quiz_hard':
                await openQuizOrFrenchGate('hard');
                break;
            case 'quiz_score':
            case 'quiz_perfect':
                await openQuizOrFrenchGate('easy');
                break;
            case 'quiz_easy':
                await openQuizOrFrenchGate('easy');
                break;
            case 'quiz_medium':
                await openQuizOrFrenchGate('medium');
                break;
            case 'quiz_hard_perfect':
                await openQuizOrFrenchGate('hard');
                break;
            case 'open_theory':
                if (!frenchLessonRuntimeAvailableForTarget(studyTarget, lessonId)) {
                    emitAppEvent('action_toast', {
                        type: 'info',
                        messageRu: 'French теория откроется после source gate. English theory не подставляется.',
                        messageUk: 'French теорія відкриється після source gate. English theory не підставляється.',
                        messageEs: 'French theory is still behind source gate.',
                    });
                    router.replace('/(tabs)/lessons' as any);
                    break;
                }
                router.push({ pathname: '/lesson_help', params: { id: lessonId } });
                break;
            case 'flashcard_view':
            case 'flashcard_save':
            case 'flashcard_flip':
                router.push('/flashcards');
                break;
            case 'recall_session':
            case 'recall_answers':
            case 'recall_perfect':
                router.push('/trainer');
                break;
            case 'trainer_words':
                router.push('/trainer');
                break;
            case 'trainer_phrases':
                router.push('/trainer');
                break;
            case 'trainer_arena':
                router.push('/trainer');
                break;
            case 'daily_phrase_read':
            case 'daily_phrase_save':
                router.replace('/(tabs)/home');
                break;
            case 'diagnostic_complete':
                openDiagnosticOrFrenchGate();
                break;
            case 'invite_friend':
                // На iPhone экран с приглашением по ссылке скрыт — ведём во «Друзья» (код).
                if (Platform.OS === 'ios') {
                    router.push('/(tabs)/friends' as any);
                }
                else {
                    router.push('/settings_invite_friend' as any);
                }
                break;
            case 'arena_play':
            case 'arena_win':
            case 'arena_rank_promoted':
            case 'arena_plays_wins_combo':
                router.replace({
                    pathname: '/(tabs)/arena' as any,
                    params: { autoSearch: '1', playAgainTs: String(Date.now()) },
                });
                break;
            default:
                await openLessonOrFrenchGate();
                break;
        }
    };
    // Сортировка: готово к награде → в процессе → завершено
    const handleTaskCardPress = (task: DailyTask) => {
        const intent = getDailyTaskCardPressIntent(readyToNavigateTaskId, task.id);
        if (intent === 'expand') {
            hapticTap();
            expandedTaskAnim.setValue(0);
            taskConfirmAnim.setValue(0);
            setReadyToNavigateTaskId(null);
            setExpandedTaskId(task.id);
            return;
        }
        hapticTap();
        Animated.timing(taskConfirmAnim, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(() => {
            void handleTaskNav(task);
        });
    };
    const sortedTasks = [...tasks].sort((a, b) => {
        const pa = progress.find(p => p.taskId === a.id);
        const pb = progress.find(p => p.taskId === b.id);
        const aScore = pa?.claimed ? 2 : pa?.completed ? 0 : 1;
        const bScore = pb?.claimed ? 2 : pb?.completed ? 0 : 1;
        return aScore - bScore;
    });
    if (false) {
        return (<ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <Text style={{ color: t.textGhost }}/>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>);
    }
    return (<ScreenGradient artBackdrop="dailyTasks">
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: sx.ghost }}>
        <TapScale onPress={() => safeRouterBack(router)} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="chevron-back" size={28} color={sx.primary}/>
        </TapScale>
        <View style={{ flex: 1 }}>
          <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '700' }}>
            {triLang(lang, {
            ru: 'Задания дня',
            uk: 'Завдання дня',
            es: 'Tareas del día',
            'pt-BR': "Tarefas do dia",
            vi: "Nhiệm vụ hôm nay",
            id: "Tugas harian",
            tr: "Günün görevleri",
            pl: "Zadania dnia",
        })}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: sx.primary, fontSize: f.numMd, fontWeight: '700' }}>{objectivesDoneCount}/{tasks.length}</Text>
          <Text style={{ color: sx.muted, fontSize: f.label }}>
            {triLang(lang, {
            ru: 'выполнено',
            uk: 'виконано',
            es: 'completadas',
            'pt-BR': "concluídas",
            vi: "đã hoàn thành",
            id: "selesai",
            tr: "tamamlandı",
            pl: "ukończono",
        })}
          </Text>
        </View>
      </View>

      {claimedXP !== null && (<Animated.View style={{
                position: 'absolute', top: 80, alignSelf: 'center', zIndex: 100,
                backgroundColor: rewardActionBg, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
                opacity: xpAnim,
                transform: [{ translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
            }}>
          <XpGainBadge amount={claimedXP} visible={claimedXP !== null} style={{ color: rewardActionText, fontSize: f.h1, fontWeight: '800' }}/>
        </Animated.View>)}

      <BouncyWrap>
      <ScrollView decelerationRate="normal" style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" onScroll={onBouncyScroll} scrollEventThrottle={16}>
        <Animated.View style={bouncyStyle}>

        {/* Прогресс */}
        {(trioClaimButtonEnabled || trioShardsClaimed) && (<View style={[
            dailyTaskStyles.taskCard,
            dailyTaskStyles.bonusCard,
            {
                borderColor: trioShardsClaimed
                    ? (t.border)
                    : trioClaimButtonEnabled
                        ? (isGoldTheme ? goldHairline : bonusAccent + '80')
                        : (isGoldTheme ? goldHairline : bonusAccent + '44'),
                borderRadius: isGoldTheme ? 16 : 18,
            },
            isGoldTheme ? goldShadow(trioClaimButtonEnabled ? 2 : 1) : null,
            null,
        ]}>
          <View style={dailyTaskStyles.taskMainRow}>
            <View style={[dailyTaskStyles.taskIconFrame, { backgroundColor: isGoldTheme ? goldSoftBg : bonusAccent + '22' }]}>
              <Image source={oskolokImageForPackShards(trioRewardCount)} style={[{
                width: 24,
                height: 24,
                opacity: trioShardsClaimed ? 0.55 : trioClaimButtonEnabled ? 1 : 0.72,
            }]} contentFit="contain"/>
            </View>

            <View style={dailyTaskStyles.taskTextBlock}>
              <Text numberOfLines={1} style={{ color: isGoldTheme ? t.textPrimary : '#FFFFFF', fontSize: f.body, fontWeight: '800', marginBottom: 1 }}>
                {triLang(lang, {
            ru: 'Бонус за день',
            uk: 'Бонус за день',
            es: 'Bono del día',
            'pt-BR': "Bônus do dia",
            vi: "Thưởng trong ngày",
            id: "Bonus harian",
            tr: "Günlük bonus",
            pl: "Bonus dnia",
        })}
              </Text>
              <Text numberOfLines={1} style={{ color: isGoldTheme ? t.textMuted : 'rgba(255,255,255,0.62)', fontSize: f.caption, lineHeight: f.caption * 1.35 }}>
                {triLang(lang, {
            ru: `Выполни все задания и забери ${trioRewardCount} ${slavicPlural(trioRewardCount, 'осколок', 'осколка', 'осколков')}.`,
            uk: `Виконай усі завдання і забери ${trioRewardCount} ${slavicPlural(trioRewardCount, 'уламок', 'уламки', 'уламків')}.`,
            es: `Completa todas las tareas y reclama ${trioRewardCount} fragmentos.`,
            'pt-BR': `Conclua todas as tarefas e colete ${trioRewardCount} fragmentos.`,
            vi: `Hoàn thành tất cả nhiệm vụ và nhận ${trioRewardCount} mảnh.`,
            id: `Selesaikan semua tugas dan klaim ${trioRewardCount} fragmen.`,
            tr: `Tüm görevleri tamamla ve ${trioRewardCount} parça al.`,
            pl: `Ukończ wszystkie zadania i odbierz ${trioRewardCount} odłamków.`,
        })}
              </Text>
            </View>

            <View style={dailyTaskStyles.taskRightColumn}>
              {trioShardsClaimed ? (<View style={[dailyTaskStyles.compactIconButton, { borderColor: isGoldTheme ? goldHairline : 'rgba(255,255,255,0.12)', backgroundColor: isGoldTheme ? GOLD_RICH.bronzeWash : 'rgba(255,255,255,0.06)' }]}>
                <Ionicons name="checkmark-circle" size={18} color={isGoldTheme ? goldAccent : 'rgba(255,255,255,0.5)'}/>
              </View>) : (<TouchableOpacity onPress={handleClaimTrioShards} activeOpacity={0.85} style={[dailyTaskStyles.compactClaimButton, { backgroundColor: rewardActionBg }]}>
                <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: rewardActionText, fontSize: f.caption, fontWeight: '800' }}>
                  {triLang(lang, {
                    ru: 'Забрать',
                    uk: 'Забрати',
                    es: 'Reclamar',
                    'pt-BR': "Coletar",
                    vi: "Nháº­n",
                    id: "Klaim",
                    tr: "Al",
                    pl: "Odbierz",
                  })}
                </Text>
              </TouchableOpacity>)}
            </View>
          </View>

          <View style={dailyTaskStyles.taskProgressBlock}>
            <View style={[dailyTaskStyles.taskProgressTrack, isGoldTheme ? { backgroundColor: 'rgba(0,0,0,0.34)', borderWidth: StyleSheet.hairlineWidth, borderColor: GOLD_RICH.hairlineQuiet } : null]}>
              <View style={{
                    height: '100%',
                    width: `${tasks.length ? Math.min((objectivesDoneCount / tasks.length) * 100, 100) : 0}%` as any,
                    backgroundColor: trioShardsClaimed ? (isGoldTheme ? 'rgba(159,122,45,0.30)' : 'rgba(255,255,255,0.25)') : bonusAccent,
                    borderRadius: 999,
                }}/>
            </View>
          </View>

          {false && (<>
              <View style={[dailyTaskStyles.taskDivider, isGoldTheme ? { backgroundColor: goldDivider } : null]}/>
              <View style={dailyTaskStyles.taskFooter}>
                <View />
                <View style={dailyTaskStyles.taskActions}>
                  {trioShardsClaimed ? (<View style={[dailyTaskStyles.claimedPill, { borderColor: isGoldTheme ? goldHairline : 'rgba(255,255,255,0.12)', backgroundColor: isGoldTheme ? GOLD_RICH.bronzeWash : 'rgba(255,255,255,0.06)' }]}>
                      <Ionicons name="checkmark-circle" size={16} color={isGoldTheme ? goldAccent : 'rgba(255,255,255,0.4)'}/>
                    </View>) : (<TouchableOpacity onPress={handleClaimTrioShards} activeOpacity={0.85} style={[dailyTaskStyles.taskClaimButton, { backgroundColor: rewardActionBg, shadowColor: rewardActionBg }]}>
                      <Text style={{ color: rewardActionText, fontSize: f.body, fontWeight: '700' }}>
                        {triLang(lang, {
                    ru: 'Забрать',
                    uk: 'Забрати',
                    es: 'Reclamar',
                    'pt-BR': "Coletar",
                    vi: "Nhận",
                    id: "Klaim",
                    tr: "Al",
                    pl: "Odbierz",
                })}
                      </Text>
                    </TouchableOpacity>)}
                </View>
              </View>
            </>)}
        </View>)}

        {sortedTasks.map((task) => {
            const p = progress.find(pr => pr.taskId === task.id);
            const current = p?.current ?? 0;
            const completed = p?.completed ?? false;
            const claimed = p?.claimed ?? false;
            const isArenaCombo = task.type === 'arena_plays_wins_combo';
            const comboReq = isArenaCombo ? getArenaComboRequirement(task) : null;
            const comboPlaysDisp = isArenaCombo && comboReq
                ? Math.min(comboReq.minPlays, p?.comboPlays ?? current)
                : 0;
            const comboWinsDisp = isArenaCombo && comboReq ? (p?.comboWins ?? 0) : 0;
            const pct = isArenaCombo && comboReq
                ? Math.min(100, (comboPlaysDisp / comboReq.minPlays) * 50 + (comboWinsDisp >= comboReq.minWins ? 50 : 0))
                : Math.min((current / task.target) * 100, 100);
            const anim = claimAnims.current[task.id] ?? new Animated.Value(1);
            const { title: taskTitle, desc: taskDesc } = localizedDailyTaskStrings(lang, task);
            const isPremiumTask = PREMIUM_TASK_TYPES.has(task.type);
            const meta = getDailyTaskUiMeta(task.type, lang);
            const achievementIcon = DAILY_TASK_ID_ACHIEVEMENT_ICONS[task.id] ?? DAILY_TASK_ACHIEVEMENT_ICONS[task.type];
            const taskAccent = isGoldTheme
                ? goldTaskAccent(task.type, { completed, claimed })
                :
                    meta.tone;
            const progressLabel = isArenaCombo && comboReq
                ? `${Math.round(pct)}%`
                : `${Math.min(current, task.target)}/${task.target}`;
            const taskFillPct = Math.max(0, Math.min(pct, 100));
            const taskFillSizeStyle = completed || claimed
                ? { right: 0 }
                : { width: `${taskFillPct}%` as any };
            const taskFillColor = isGoldTheme
                ? taskAccent
                : `${taskAccent}${completed || claimed ? '38' : '1C'}`;
            const taskTrackColor = isGoldTheme ? 'rgba(12,10,8,0.78)' : 'rgba(18,16,20,0.92)';
            const isExpanded = expandedTaskId === task.id && !completed && !claimed;
            const expandedDescriptionLineHeight = f.body * 1.28;
            const expandedDescriptionLines = Math.min(3, Math.max(1, Math.ceil(taskDesc.length / 32)));
            const expandedDescriptionBlockHeight = Math.ceil(expandedDescriptionLineHeight * expandedDescriptionLines + 14);
            const expandedCardTargetHeight = 92 + expandedDescriptionBlockHeight + 46;
            const expandedCardHeight = isExpanded
                ? expandedTaskAnim.interpolate({ inputRange: [0, 1], outputRange: [92, expandedCardTargetHeight] })
                : 92;
            const expandedPanelHeight = isExpanded
                ? expandedTaskAnim.interpolate({ inputRange: [0, 1], outputRange: [0, expandedDescriptionBlockHeight] })
                : 0;
            const expandedPanelTranslateY = isExpanded
                ? expandedTaskAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] })
                : 0;
            const confirmFillTranslateX = isExpanded
                ? taskConfirmAnim.interpolate({ inputRange: [0, 1], outputRange: [-520, 0] })
                : -520;
            return (<Animated.View key={task.id} style={[dailyTaskStyles.taskOuterAnim, { transform: [{ scale: anim }] }, isGoldTheme ? goldShadow(completed && !claimed ? 2 : 1) : null, null]}>
            <TouchableOpacity activeOpacity={completed && !claimed ? 1 : (claimed ? 1 : 0.88)} onPress={completed && !claimed ? undefined : (claimed ? undefined : () => handleTaskCardPress(task))}>
            <Animated.View style={[
                    dailyTaskStyles.taskCard,
                    dailyTaskStyles.taskCapsuleCard,
                    {
                        height: expandedCardHeight as any,
                        borderColor: claimed
                            ? (isGoldTheme ? goldHairline : taskAccent + 'A0')
                            : completed
                                ? (isGoldTheme ? goldHairline : taskAccent + 'A0')
                                : (isGoldTheme ? goldHairline : taskAccent + '72'),
                        backgroundColor: taskTrackColor,
                    }]}
                >
                <View pointerEvents="none" style={[
                    dailyTaskStyles.taskCapsuleFill,
                    {
                        ...taskFillSizeStyle,
                        backgroundColor: taskFillColor,
                        opacity: 1,
                    },
                ]}/>
                {/* Плашка Premium */}
                {isPremiumTask && (<Animated.View pointerEvents="box-none" style={{
                        position: 'absolute', bottom: -1, right: -1, zIndex: 10,
                        transform: [{ scale: premiumPulse }],
                        borderBottomRightRadius: 18, borderTopLeftRadius: 10,
                        overflow: 'hidden',
                    }}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        backgroundColor: isGoldTheme ? '#16120A' : '#B8860B',
                        borderWidth: 1, borderColor: isGoldTheme ? goldHairline : '#FFD700',
                        borderBottomRightRadius: 18, borderTopLeftRadius: 10,
                        paddingHorizontal: 10, paddingVertical: 5,
                    }}>
                      <Animated.Text style={{ fontSize: 11, opacity: premiumSparkle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }}>✨</Animated.Text>
                      <Text style={{ color: isGoldTheme ? goldBright : '#FFD700', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>PREMIUM</Text>
                      <Animated.Text style={{ fontSize: 11, opacity: premiumSparkle.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }}>✨</Animated.Text>
                    </View>
                  </Animated.View>)}

                {/* Верхняя строка: иконка + текст + XP */}
                <View style={[dailyTaskStyles.taskMainRow, dailyTaskStyles.taskCapsuleRow]}>
                  <Image source={achievementIcon} style={dailyTaskStyles.taskCapsuleHeroIcon} contentFit="contain"/>
                  <View style={dailyTaskStyles.taskCapsuleTextBlock}>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86} style={[dailyTaskStyles.taskCapsuleTitle, { color: isGoldTheme ? t.textPrimary : '#FFFFFF', fontSize: f.h2 }]}>
                      {taskTitle}
                    </Text>
                  </View>

                  <View style={dailyTaskStyles.taskCapsuleRight}>
                    {completed && !claimed ? (<TouchableOpacity onPress={() => { void handleClaim(task.id, task.xp); }} disabled={claimBusyId === task.id} activeOpacity={0.85} style={[dailyTaskStyles.compactClaimButton, { backgroundColor: rewardActionBg }]}>
                      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: rewardActionText, fontSize: f.caption, fontWeight: '800' }}>
                        {triLang(lang, {
                          ru: 'Забрать',
                          uk: 'Забрати',
                          es: 'Reclamar',
                          'pt-BR': "Coletar",
                          vi: "Nháº­n",
                          id: "Klaim",
                          tr: "Al",
                          pl: "Odbierz",
                        })}
                      </Text>
                    </TouchableOpacity>) : claimed ? (<View style={[dailyTaskStyles.compactIconButton, { borderColor: isGoldTheme ? goldHairline : 'rgba(255,255,255,0.12)', backgroundColor: isGoldTheme ? GOLD_RICH.bronzeWash : 'rgba(255,255,255,0.06)' }]}>
                      <Ionicons name="checkmark-circle" size={18} color={isGoldTheme ? goldAccent : 'rgba(255,255,255,0.5)'}/>
                    </View>) : (<View style={[dailyTaskStyles.taskProgressValuePill, {
                          backgroundColor: isGoldTheme ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.06)',
                          borderColor: isGoldTheme ? goldHairline : 'rgba(255,255,255,0.10)',
                      }]}>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86} style={{ color: isGoldTheme ? t.textPrimary : 'rgba(255,255,255,0.78)', fontSize: f.body, fontWeight: '900' }}>{progressLabel}</Text>
                    </View>)}
                    {!completed && !claimed && rerollsLeft > 0 && (<TouchableOpacity onPress={(e) => {
                        e.stopPropagation();
                        hapticTap();
                        setRerollConfirm({ task });
                    }} accessibilityRole="button" accessibilityLabel={triLang(lang, {
                        ru: 'Заменить задание за осколки',
                        uk: 'Замінити завдання за осколки',
                        es: 'Reemplazar tarea por fragmentos',
                        'pt-BR': "Substituir tarefa por fragmentos",
                        vi: "Đổi nhiệm vụ bằng mảnh",
                        id: "Ganti tugas dengan fragmen",
                        tr: "Görevi parçalarla değiştir",
                        pl: "ZamieÅ„ zadanie za odÅ‚amki",
                    })} style={[dailyTaskStyles.compactIconButton, dailyTaskStyles.taskCapsuleRefreshButton, { backgroundColor: isGoldTheme ? goldSoftBg : 'rgba(255,255,255,0.08)', borderColor: isGoldTheme ? goldHairline : 'rgba(255,255,255,0.15)' }]}>
                      <Ionicons name="refresh" size={22} color={isGoldTheme ? goldAccent : 'rgba(255,255,255,0.55)'}/>
                    </TouchableOpacity>)}
                  </View>
                </View>

                {/* Прогресс-бар */}
                {isExpanded && (<Animated.View style={[
                    dailyTaskStyles.taskExpandedPanel,
                    {
                        height: expandedPanelHeight as any,
                        opacity: expandedTaskAnim,
                        transform: [{ translateY: expandedPanelTranslateY as any }],
                    },
                ]}>
                  <Text numberOfLines={expandedDescriptionLines} style={[dailyTaskStyles.taskExpandedDescription, { color: isGoldTheme ? t.textSecond : 'rgba(255,255,255,0.78)', fontSize: f.body, lineHeight: expandedDescriptionLineHeight }]}>
                    {taskDesc}
                  </Text>
                </Animated.View>)}
                {isExpanded && (<Animated.View style={[
                    dailyTaskStyles.taskConfirmTrack,
                    {
                        opacity: expandedTaskAnim,
                        backgroundColor: isGoldTheme ? GOLD_RICH.washStrong : `${taskAccent}22`,
                        borderColor: isGoldTheme ? goldHairline : taskAccent,
                    },
                  ]}>
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            dailyTaskStyles.taskConfirmFill,
                            {
                                width: '100%',
                                backgroundColor: isGoldTheme ? GOLD_RICH.champagne : taskAccent,
                                transform: [{ translateX: confirmFillTranslateX as any }],
                            },
                        ]}
                    />
                    <Text numberOfLines={1} style={[dailyTaskStyles.taskExpandedHint, { color: isGoldTheme ? GOLD_RICH.champagne : taskAccent, fontSize: f.body }]}>
                    {triLang(lang, {
                      ru: 'Нажми ещё раз, чтобы перейти',
                      uk: 'Натисни ще раз, щоб перейти',
                      es: 'Toca otra vez para ir',
                      'pt-BR': 'Toque de novo para abrir',
                      vi: 'Nhấn lần nữa để mở',
                      id: 'Ketuk lagi untuk membuka',
                      tr: 'Açmak için tekrar dokun',
                      pl: 'Stuknij ponownie, aby przejść',
                    })}
                    </Text>
                </Animated.View>)}

                {false && (<View style={dailyTaskStyles.taskProgressBlock}>
                  <View style={[dailyTaskStyles.taskProgressTrack, isGoldTheme ? { backgroundColor: 'rgba(0,0,0,0.34)', borderWidth: StyleSheet.hairlineWidth, borderColor: GOLD_RICH.hairlineQuiet } : null]}>
                    <View style={{
                        height: '100%',
                        width: `${pct}%` as any,
                        borderRadius: 999,
                        backgroundColor: claimed ? (isGoldTheme ? 'rgba(159,122,45,0.30)' : 'rgba(255,255,255,0.25)') : taskAccent,
                    }}>
                    </View>
                  </View>
                </View>)}

                {/* Footer — только если есть действие */}
                {false && (<>
                <View style={[dailyTaskStyles.taskDivider, isGoldTheme ? { backgroundColor: goldDivider } : null]}/>
                <View style={dailyTaskStyles.taskFooter}>
                  <View />
                  <View style={dailyTaskStyles.taskActions}>
                    {!completed && !claimed && rerollsLeft > 0 && (<TouchableOpacity onPress={(e) => {
                            e.stopPropagation();
                            hapticTap();
                            setRerollConfirm({ task });
                        }} accessibilityRole="button" accessibilityLabel={triLang(lang, {
                            ru: 'Заменить задание за осколки',
                            uk: 'Замінити завдання за осколки',
                            es: 'Reemplazar tarea por fragmentos',
                            'pt-BR': "Substituir tarefa por fragmentos",
                            vi: "Đổi nhiệm vụ bằng mảnh",
                            id: "Ganti tugas dengan fragmen",
                            tr: "Görevi parçalarla değiştir",
                            pl: "Zamień zadanie za odłamki",
                        })} style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isGoldTheme ? goldSoftBg : 'rgba(255,255,255,0.08)',
                            borderWidth: 1,
                            borderColor: isGoldTheme ? goldHairline : 'rgba(255,255,255,0.15)',
                        }}>
                        <Ionicons name="refresh" size={17} color={isGoldTheme ? goldAccent : 'rgba(255,255,255,0.5)'}/>
                      </TouchableOpacity>)}
                    {completed && !claimed && (<TouchableOpacity onPress={() => { void handleClaim(task.id, task.xp); }} disabled={claimBusyId === task.id} activeOpacity={0.85} style={[dailyTaskStyles.taskClaimButton, { backgroundColor: rewardActionBg, shadowColor: rewardActionBg }]}>
                        <Text style={{ color: rewardActionText, fontSize: f.body, fontWeight: '700' }}>
                          {triLang(lang, {
                            ru: 'Забрать',
                            uk: 'Забрати',
                            es: 'Reclamar',
                            'pt-BR': "Coletar",
                            vi: "Nhận",
                            id: "Klaim",
                            tr: "Al",
                            pl: "Odbierz",
                        })}
                        </Text>
                      </TouchableOpacity>)}
                    {claimed && (<View style={[dailyTaskStyles.claimedPill, { borderColor: isGoldTheme ? goldHairline : 'rgba(255,255,255,0.12)', backgroundColor: isGoldTheme ? GOLD_RICH.bronzeWash : 'rgba(255,255,255,0.06)' }]}>
                        <Ionicons name="checkmark-circle" size={16} color={isGoldTheme ? goldAccent : 'rgba(255,255,255,0.4)'}/>
                      </View>)}
                  </View>
                </View>
                </>)}
            </Animated.View>
            </TouchableOpacity>
            </Animated.View>);
        })}

        {claimedCount === tasks.length && tasks.length > 0 && (<View style={{ alignItems: 'center', padding: 24, gap: 8 }}>
            <Text style={{ fontSize: f.numLg + 12 }}>🎉</Text>
            <Text style={{ color: t.correct, fontSize: f.bodyLg, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Все задания выполнены!',
                uk: 'Всі завдання виконано!',
                es: '¡Has completado todas las tareas!',
                'pt-BR': "Você concluiu todas as tarefas!",
                vi: "Bạn đã hoàn thành tất cả nhiệm vụ!",
                id: "Kamu telah menyelesaikan semua tugas!",
                tr: "Tüm görevleri tamamladın!",
                pl: "Wszystkie zadania ukończone!",
            })}
            </Text>
          </View>)}

        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <ReportErrorButton screen="daily_tasks" dataId="daily_tasks_main" dataText={triLang(lang, {
            ru: 'Ежедневные задания',
            uk: 'Щоденні завдання',
            es: 'Tareas diarias',
            'pt-BR': "Tarefas diárias",
            vi: "Nhiệm vụ hằng ngày",
            id: "Tugas harian",
            tr: "Günlük görevler",
            pl: "Zadania dzienne",
        })}/>
        </View>

        <View style={{ height: 16 }}/>
        </Animated.View>
      </ScrollView>
      </BouncyWrap>
      </View>
      </ContentWrap>

      {/* Confirm — заменить задание за осколки */}
      <Modal visible={rerollConfirm !== null} transparent animationType="fade" onRequestClose={() => {
            if (rerollBusyId)
                return;
            setRerollConfirm(null);
        }}>
        <View style={rerollStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => {
            if (rerollBusyId)
                return;
            hapticTap();
            setRerollConfirm(null);
        }}/>
          <View style={[rerollStyles.card, { backgroundColor: t.bgCard }]}>
            <Text style={rerollStyles.emoji}>🔄</Text>
            <Text style={[rerollStyles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
              {triLang(lang, {
            ru: 'Заменить задание?',
            uk: 'Замінити завдання?',
            es: '¿Reemplazar la tarea?',
            'pt-BR': "Substituir a tarefa?",
            vi: "Đổi nhiệm vụ?",
            id: "Ganti tugas?",
            tr: "Görev değiştirilsin mi?",
            pl: "Zamienić zadanie?",
        })}
            </Text>
            {rerollConfirm?.task && (<Text style={[rerollStyles.subtitle, { color: t.textSecond, fontSize: f.body }]}>
                «{localizedDailyTaskStrings(lang, rerollConfirm.task).title}»
                {' — '}
                {triLang(lang, {
                ru: 'будет заменено на случайное задание из той же категории.',
                uk: 'буде замінено на випадкове завдання з тієї ж категорії.',
                es: 'se reemplazará por una tarea aleatoria de la misma categoría.',
                'pt-BR': "será substituída por uma tarefa aleatória da mesma categoria.",
                vi: "sẽ được đổi thành một nhiệm vụ ngẫu nhiên cùng danh mục.",
                id: "akan diganti dengan tugas acak dari kategori yang sama.",
                tr: "aynı kategoriden rastgele bir görevle değiştirilecek.",
                pl: "zostanie zastąpione losowym zadaniem z tej samej kategorii.",
            })}
              </Text>)}

            <View style={rerollStyles.priceRow}>
              <Image source={oskolokImageForPackShards(DAILY_TASK_REROLL_COST_SHARDS)} style={{ width: 32, height: 32 }} contentFit="contain"/>
              <Text style={[rerollStyles.priceNum, { color: t.textPrimary }]}>{DAILY_TASK_REROLL_COST_SHARDS}</Text>
            </View>

            <Text style={[rerollStyles.hint, { color: t.textMuted }]}>
              {triLang(lang, {
            ru: 'Лимит — 1 замена в сутки. Прогресс старого задания не сохранится.',
            uk: 'Ліміт — 1 заміна на добу. Прогрес старого завдання не збережеться.',
            es: 'Límite: 1 reemplazo por día. El progreso de la tarea anterior se perderá.',
            'pt-BR': "Limite: 1 substituição por dia. O progresso da tarefa anterior será perdido.",
            vi: "Giới hạn: 1 lần đổi mỗi ngày. Tiến độ của nhiệm vụ cũ sẽ bị mất.",
            id: "Batas: 1 penggantian per hari. Progres tugas sebelumnya akan hilang.",
            tr: "Sınır: günde 1 değiştirme. Önceki görevin ilerlemesi kaybolacak.",
            pl: "Limit: 1 zamiana dziennie. Postęp poprzedniego zadania zostanie utracony.",
        })}
            </Text>

            <TouchableOpacity onPress={() => {
            hapticTap();
            void handleRerollConfirm();
        }} disabled={!!rerollBusyId} style={[
            rerollStyles.btnPrimary,
            { backgroundColor: isGoldTheme ? goldAccent : t.accent, opacity: rerollBusyId ? 0.6 : 1 },
        ]}>
              <Text style={[rerollStyles.btnPrimaryText, { color: isGoldTheme ? t.textOnGold : t.correctText, fontSize: f.body }]}>
                {triLang(lang, {
            ru: `Заменить · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
            uk: `Замінити · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
            es: `Reemplazar · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
            'pt-BR': `Substituir · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
            vi: `Đổi nhiệm vụ · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
            id: `Ganti · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
            tr: `Değiştir · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
            pl: `Zamień · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
        })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
            if (rerollBusyId)
                return;
            hapticTap();
            setRerollConfirm(null);
        }} style={[rerollStyles.btnGhost, { borderColor: isGoldTheme ? goldHairline : t.border }]} disabled={!!rerollBusyId}>
              <Text style={[rerollStyles.btnGhostText, { color: t.textPrimary, fontSize: f.body }]}>
                {triLang(lang, {
            ru: 'Отмена',
            uk: 'Скасувати',
            es: 'Cancelar',
            'pt-BR': "Cancelar",
            vi: "Hủy",
            id: "Batal",
            tr: "İptal",
            pl: "Anuluj",
        })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </ScreenGradient>);
}
const dailyTaskStyles = StyleSheet.create({
    bonusCard: {
        marginBottom: 8,
    },
    taskOuterAnim: {
        marginBottom: 0,
    },
    taskCard: {
        borderRadius: 18,
        minHeight: 72,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'rgba(13,32,36,0.82)',
    },
    taskCapsuleCard: {
        minHeight: 92,
        borderRadius: 24,
        paddingHorizontal: 26,
        paddingVertical: 0,
        justifyContent: 'flex-start',
    },
    taskCapsuleFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderTopLeftRadius: 24,
        borderBottomLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomRightRadius: 24,
    },
    taskMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        position: 'relative',
        zIndex: 1,
    },
    taskCapsuleRow: {
        minHeight: 92,
        gap: 12,
    },
    taskCapsuleTextBlock: {
        flex: 1,
        minWidth: 0,
    },
    taskCapsuleTitle: {
        fontWeight: '900',
        lineHeight: 30,
    },
    taskCapsuleHeroIcon: {
        width: 48,
        height: 48,
        flexShrink: 0,
    },
    taskCapsuleRight: {
        minWidth: 118,
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        flexShrink: 0,
    },
    taskExpandedPanel: {
        overflow: 'hidden',
        paddingTop: 0,
        paddingLeft: 0,
        paddingRight: 0,
        gap: 14,
        zIndex: 1,
    },
    taskExpandedDescription: {
        fontWeight: '800',
        marginLeft: 24,
        marginRight: 18,
    },
    taskConfirmTrack: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 46,
        borderWidth: 2,
        borderTopWidth: 0,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    taskConfirmFill: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    taskExpandedHint: {
        fontWeight: '800',
        zIndex: 1,
    },
    taskProgressValuePill: {
        width: 66,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskCapsuleRefreshButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    taskArtworkRow: {
        alignItems: 'center',
        gap: 10,
    },
    taskIconFrame: {
        width: 38,
        height: 38,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    taskArtworkFrame: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    taskArtworkIcon: {
        width: 40,
        height: 40,
    },
    taskTextBlock: {
        flex: 1,
        minWidth: 0,
    },
    xpBadge: {
        width: 54,
        height: 30,
        borderRadius: 11,
        borderWidth: 1,
        paddingHorizontal: 4,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    taskRightColumn: {
        width: 58,
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        flexShrink: 0,
    },
    compactClaimButton: {
        width: 58,
        height: 30,
        borderRadius: 10,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactIconButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskProgressBlock: {
        gap: 4,
        marginTop: 8,
        position: 'relative',
        zIndex: 1,
    },
    taskProgressTrack: {
        height: 4,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.10)',
        overflow: 'hidden',
    },
    taskDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.10)',
        marginTop: 8,
        marginHorizontal: -12,
        position: 'relative',
        zIndex: 1,
    },
    taskFooter: {
        paddingTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1,
    },
    taskActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    taskClaimButton: {
        height: 34,
        minWidth: 100,
        borderRadius: 12,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
        elevation: 2,
    },
    claimedPill: {
        minHeight: 30,
        borderRadius: 15,
        borderWidth: 1,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
});
const rerollStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 28,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    card: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 22,
        padding: 24,
        alignItems: 'center',
        gap: 12,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
    },
    emoji: { fontSize: 44 },
    title: { fontWeight: '900', textAlign: 'center' },
    subtitle: { lineHeight: 21, textAlign: 'center' },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
    priceNum: { fontSize: 24, fontWeight: '900' },
    hint: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
    btnPrimary: {
        alignSelf: 'stretch',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
        marginTop: 4,
    },
    btnPrimaryText: { fontWeight: '800' },
    btnGhost: {
        alignSelf: 'stretch',
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 13,
        alignItems: 'center',
    },
    btnGhostText: { fontWeight: '700' },
});
