import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { getVerifiedPremiumStatus } from './premium_guard';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { localizedDailyTaskStrings } from './daily_tasks_es_locale';
import ReportErrorButton from '../components/ReportErrorButton';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import XpGainBadge from '../components/XpGainBadge';
import { checkAchievements } from './achievements';
import {
  claimTaskWithReward,
  countClaimedForTaskList,
  DailyTask,
  getTodayTasks,
  getTodayKey,
  getArenaComboRequirement,
  getTodayTasksSafe, loadTodayProgress,
  TaskProgress,
  TaskType,
  rerollDailyTask,
  getDailyRerollsLeftToday,
  DAILY_TASK_REROLL_COST_SHARDS,
} from './daily_tasks';
import { LESSONS_WITH_IRREGULAR_VERBS } from './irregular_verbs_data';
import { getCurrentMultiplier, registerXP } from './xp_manager';
import {
  claimDailyTasksAllShardsReward,
  isDailyTasksAllShardsRewardClaimedForDay,
  SHARD_REWARDS,
  getShardsBalance,
} from './shards_system';
import { Image } from 'expo-image';
import { oskolokImageForPackShards } from './oskolok';
import { primeLessonScreenFromStorage } from './lesson_screen_bootstrap';
import { emitAppEvent, onAppEvent } from './events';

const PREMIUM_TASK_TYPES = new Set([
  'quiz_hard', 'quiz_medium', 'quiz_perfect', 'quiz_hard_perfect',
]);

type DailyTaskUiMeta = {
  stage: string;
  label: string;
  reason: string;
  cta: string;
  minutes: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
};

const getDailyTaskUiMeta = (type: TaskType, lang: Lang): DailyTaskUiMeta => {
  const byType: Record<TaskType, DailyTaskUiMeta> = {
    daily_active: {
      stage: triLang(lang, { ru: 'Старт', uk: 'Старт', es: 'Inicio' }),
      label: triLang(lang, { ru: 'Разогрев', uk: 'Розігрів', es: 'Calentamiento' }),
      reason: triLang(lang, {
        ru: 'Открой урок и собери одну фразу.',
        uk: 'Відкрий урок і збери одну фразу.',
        es: 'Abre una lección y completa una frase.',
      }),
      cta: triLang(lang, { ru: 'Открыть урок', uk: 'Відкрити урок', es: 'Abrir lección' }),
      minutes: '1-2 мин',
      icon: 'sunny',
      tone: '#60A5FA',
    },
    total_answers: {
      stage: triLang(lang, { ru: 'Практика', uk: 'Практика', es: 'Práctica' }),
      label: triLang(lang, { ru: 'Набор фраз', uk: 'Набір фраз', es: 'Frases' }),
      reason: triLang(lang, {
        ru: 'Больше собранных фраз — легче вспоминать их дальше.',
        uk: 'Більше зібраних фраз — легше згадувати їх далі.',
        es: 'Más frases completas hacen más fácil recordarlas luego.',
      }),
      cta: triLang(lang, { ru: 'Тренировать', uk: 'Тренувати', es: 'Practicar' }),
      minutes: '3-8 мин',
      icon: 'flash',
      tone: '#FBBF24',
    },
    correct_streak: {
      stage: triLang(lang, { ru: 'Точность', uk: 'Точність', es: 'Precisión' }),
      label: triLang(lang, { ru: 'Без ошибок', uk: 'Без помилок', es: 'Sin errores' }),
      reason: triLang(lang, {
        ru: 'Серия без ошибок помогает отвечать спокойнее и точнее.',
        uk: 'Серія без помилок допомагає відповідати спокійніше й точніше.',
        es: 'Una racha sin errores entrena calma y precisión.',
      }),
      cta: triLang(lang, { ru: 'Собрать серию', uk: 'Зібрати серію', es: 'Hacer racha' }),
      minutes: '4-7 мин',
      icon: 'radio-button-on',
      tone: '#34D399',
    },
    lesson_no_mistakes: {
      stage: triLang(lang, { ru: 'Точность', uk: 'Точність', es: 'Precisión' }),
      label: triLang(lang, { ru: 'Чистая серия', uk: 'Чиста серія', es: 'Serie limpia' }),
      reason: triLang(lang, {
        ru: 'Хорошая проверка: тема вспоминается без подсказок.',
        uk: 'Добра перевірка: тема згадується без підказок.',
        es: 'Buena prueba: recuerdas el tema sin pistas.',
      }),
      cta: triLang(lang, { ru: 'Играть аккуратно', uk: 'Грати уважно', es: 'Jugar con calma' }),
      minutes: '5-9 мин',
      icon: 'sparkles',
      tone: '#34D399',
    },
    quiz_easy: {
      stage: triLang(lang, { ru: 'Проверка', uk: 'Перевірка', es: 'Prueba' }),
      label: triLang(lang, { ru: 'Квиз', uk: 'Квіз', es: 'Quiz' }),
      reason: triLang(lang, {
        ru: 'Быстрая проверка того, что уже держится в памяти.',
        uk: 'Швидка перевірка того, що вже тримається в пам\'яті.',
        es: 'Una prueba rápida de lo que ya recuerdas.',
      }),
      cta: triLang(lang, { ru: 'Открыть квизы', uk: 'Відкрити квізи', es: 'Abrir quizzes' }),
      minutes: '2-5 мин',
      icon: 'help-buoy',
      tone: '#A78BFA',
    },
    quiz_medium: {
      stage: triLang(lang, { ru: 'Проверка', uk: 'Перевірка', es: 'Prueba' }),
      label: triLang(lang, { ru: 'Квиз+', uk: 'Квіз+', es: 'Quiz+' }),
      reason: triLang(lang, {
        ru: 'Чуть сложнее обычного: покажет, что стоит повторить.',
        uk: 'Трохи складніше звичайного: покаже, що варто повторити.',
        es: 'Un poco más difícil: muestra qué conviene repasar.',
      }),
      cta: triLang(lang, { ru: 'Пройти квиз', uk: 'Пройти квіз', es: 'Hacer quiz' }),
      minutes: '3-6 мин',
      icon: 'school',
      tone: '#A78BFA',
    },
    quiz_hard: {
      stage: triLang(lang, { ru: 'Вызов', uk: 'Виклик', es: 'Reto' }),
      label: triLang(lang, { ru: 'Сложный квиз', uk: 'Складний квіз', es: 'Quiz difícil' }),
      reason: triLang(lang, {
        ru: 'Сложная проверка для тех, кто хочет нагрузку посерьёзнее.',
        uk: 'Складна перевірка для тих, хто хоче серйозніше навантаження.',
        es: 'Una prueba difícil para practicar con más intensidad.',
      }),
      cta: triLang(lang, { ru: 'Открыть вызов', uk: 'Відкрити виклик', es: 'Abrir reto' }),
      minutes: '4-8 мин',
      icon: 'flame',
      tone: '#FB7185',
    },
    quiz_score: {
      stage: triLang(lang, { ru: 'Проверка', uk: 'Перевірка', es: 'Prueba' }),
      label: triLang(lang, { ru: 'XP в квизах', uk: 'XP у квізах', es: 'XP en quiz' }),
      reason: triLang(lang, {
        ru: 'Квизы тренируют скорость и точность одновременно.',
        uk: 'Квізи тренують швидкість і точність одночасно.',
        es: 'Los quizzes entrenan velocidad y precisión a la vez.',
      }),
      cta: triLang(lang, { ru: 'Набрать XP', uk: 'Набрати XP', es: 'Ganar XP' }),
      minutes: '3-7 мин',
      icon: 'analytics',
      tone: '#A78BFA',
    },
    quiz_perfect: {
      stage: triLang(lang, { ru: 'Мастерство', uk: 'Майстерність', es: 'Maestría' }),
      label: triLang(lang, { ru: 'Идеальный квиз', uk: 'Ідеальний квіз', es: 'Quiz perfecto' }),
      reason: triLang(lang, {
        ru: 'Цель на аккуратность: меньше угадывания, больше уверенности.',
        uk: 'Ціль на уважність: менше вгадування, більше впевненості.',
        es: 'Meta de precisión: menos adivinar, más confianza.',
      }),
      cta: triLang(lang, { ru: 'Сделать идеально', uk: 'Зробити ідеально', es: 'Hacer perfecto' }),
      minutes: '4-8 мин',
      icon: 'diamond',
      tone: '#A78BFA',
    },
    quiz_hard_perfect: {
      stage: triLang(lang, { ru: 'Мастерство', uk: 'Майстерність', es: 'Maestría' }),
      label: triLang(lang, { ru: 'Идеальный hard', uk: 'Ідеальний hard', es: 'Hard perfecto' }),
      reason: triLang(lang, {
        ru: 'Сложная цель на чистое прохождение без случайных ответов.',
        uk: 'Складна ціль на чисте проходження без випадкових відповідей.',
        es: 'Un reto difícil para pasar sin respuestas al azar.',
      }),
      cta: triLang(lang, { ru: 'Принять вызов', uk: 'Прийняти виклик', es: 'Aceptar reto' }),
      minutes: '5-10 мин',
      icon: 'trophy',
      tone: '#FB7185',
    },
    words_learned: {
      stage: triLang(lang, { ru: 'Словарь', uk: 'Словник', es: 'Vocabulario' }),
      label: triLang(lang, { ru: 'Новые слова', uk: 'Нові слова', es: 'Palabras' }),
      reason: triLang(lang, {
        ru: 'Расширяет базу слов, чтобы уроки и квизы становились легче.',
        uk: 'Розширює базу слів, щоб уроки й квізи ставали легшими.',
        es: 'Amplía tu base para que lecciones y quizzes sean más fáciles.',
      }),
      cta: triLang(lang, { ru: 'Учить слова', uk: 'Вчити слова', es: 'Aprender palabras' }),
      minutes: '3-6 мин',
      icon: 'book',
      tone: '#38BDF8',
    },
    verb_learned: {
      stage: triLang(lang, { ru: 'Грамматика', uk: 'Граматика', es: 'Gramática' }),
      label: triLang(lang, { ru: 'Глаголы', uk: 'Дієслова', es: 'Verbos' }),
      reason: triLang(lang, {
        ru: 'Нерегулярные глаголы сильно повышают уверенность в реальных фразах.',
        uk: 'Неправильні дієслова сильно підвищують упевненість у реальних фразах.',
        es: 'Los verbos irregulares aumentan confianza en frases reales.',
      }),
      cta: triLang(lang, { ru: 'Учить глаголы', uk: 'Вчити дієслова', es: 'Aprender verbos' }),
      minutes: '4-8 мин',
      icon: 'construct',
      tone: '#38BDF8',
    },
    open_theory: {
      stage: triLang(lang, { ru: 'Понимание', uk: 'Розуміння', es: 'Comprensión' }),
      label: triLang(lang, { ru: 'Теория', uk: 'Теорія', es: 'Teoría' }),
      reason: triLang(lang, {
        ru: 'Короткое правило помогает делать меньше случайных ошибок.',
        uk: 'Коротке правило допомагає робити менше випадкових помилок.',
        es: 'Una regla corta reduce errores aleatorios.',
      }),
      cta: triLang(lang, { ru: 'Открыть теорию', uk: 'Відкрити теорію', es: 'Abrir teoría' }),
      minutes: '1-3 мин',
      icon: 'bulb',
      tone: '#FBBF24',
    },
    flashcard_view: {
      stage: triLang(lang, { ru: 'Память', uk: 'Пам\'ять', es: 'Memoria' }),
      label: triLang(lang, { ru: 'Карточки', uk: 'Картки', es: 'Tarjetas' }),
      reason: triLang(lang, {
        ru: 'Повторение возвращает старые фразы до того, как они выпадут из памяти.',
        uk: 'Повторення повертає старі фрази до того, як вони випадуть із пам\'яті.',
        es: 'Repasa antes de olvidar frases antiguas.',
      }),
      cta: triLang(lang, { ru: 'Открыть карточки', uk: 'Відкрити картки', es: 'Abrir tarjetas' }),
      minutes: '2-5 мин',
      icon: 'albums',
      tone: '#2DD4BF',
    },
    flashcard_save: {
      stage: triLang(lang, { ru: 'Память', uk: 'Пам\'ять', es: 'Memoria' }),
      label: triLang(lang, { ru: 'Сохранить фразы', uk: 'Зберегти фрази', es: 'Guardar frases' }),
      reason: triLang(lang, {
        ru: 'Собирает личный словарь из фраз, которые действительно нужны тебе.',
        uk: 'Збирає особистий словник із фраз, які справді потрібні тобі.',
        es: 'Crea tu vocabulario personal con frases útiles.',
      }),
      cta: triLang(lang, { ru: 'Найти фразы', uk: 'Знайти фрази', es: 'Buscar frases' }),
      minutes: '2-6 мин',
      icon: 'bookmark',
      tone: '#2DD4BF',
    },
    flashcard_flip: {
      stage: triLang(lang, { ru: 'Память', uk: 'Пам\'ять', es: 'Memoria' }),
      label: triLang(lang, { ru: 'Проверка карточек', uk: 'Перевірка карток', es: 'Revisar tarjetas' }),
      reason: triLang(lang, {
        ru: 'Проверяет, узнаешь ли ты фразу без немедленной подсказки.',
        uk: 'Перевіряє, чи впізнаєш фразу без миттєвої підказки.',
        es: 'Comprueba si reconoces la frase sin pista inmediata.',
      }),
      cta: triLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Repasar' }),
      minutes: '2-5 мин',
      icon: 'repeat',
      tone: '#2DD4BF',
    },
    recall_session: {
      stage: triLang(lang, { ru: 'Повторение', uk: 'Повторення', es: 'Repaso' }),
      label: triLang(lang, { ru: 'Сессия памяти', uk: 'Сесія пам\'яті', es: 'Sesión memoria' }),
      reason: triLang(lang, {
        ru: 'Самое полезное для долгой памяти: возвращает фразы по расписанию.',
        uk: 'Найкорисніше для довгої пам\'яті: повертає фрази за розкладом.',
        es: 'Lo mejor para memoria larga: frases en el momento correcto.',
      }),
      cta: triLang(lang, { ru: 'Повторить сейчас', uk: 'Повторити зараз', es: 'Repasar ahora' }),
      minutes: '3-6 мин',
      icon: 'refresh-circle',
      tone: '#2DD4BF',
    },
    recall_answers: {
      stage: triLang(lang, { ru: 'Повторение', uk: 'Повторення', es: 'Repaso' }),
      label: triLang(lang, { ru: 'Ответы памяти', uk: 'Відповіді пам\'яті', es: 'Respuestas' }),
      reason: triLang(lang, {
        ru: 'Закрепляет старое, чтобы новый материал не вытеснял выученное.',
        uk: 'Закріплює старе, щоб новий матеріал не витісняв вивчене.',
        es: 'Fija lo antiguo para que lo nuevo no lo desplace.',
      }),
      cta: triLang(lang, { ru: 'Начать повторение', uk: 'Почати повторення', es: 'Empezar repaso' }),
      minutes: '4-7 мин',
      icon: 'reload',
      tone: '#2DD4BF',
    },
    recall_perfect: {
      stage: triLang(lang, { ru: 'Мастерство', uk: 'Майстерність', es: 'Maestría' }),
      label: triLang(lang, { ru: 'Чистое повторение', uk: 'Чисте повторення', es: 'Repaso perfecto' }),
      reason: triLang(lang, {
        ru: 'Показывает, что старые фразы не просто знакомы, а реально доступны.',
        uk: 'Показує, що старі фрази не просто знайомі, а реально доступні.',
        es: 'Muestra que las frases antiguas están disponibles de verdad.',
      }),
      cta: triLang(lang, { ru: 'Сделать чисто', uk: 'Зробити чисто', es: 'Hacer limpio' }),
      minutes: '5-8 мин',
      icon: 'checkmark-done-circle',
      tone: '#2DD4BF',
    },
    trainer_words: {
      stage: triLang(lang, { ru: 'Моя практика', uk: 'Моя практика', es: 'Mi práctica' }),
      label: triLang(lang, { ru: 'Слабые слова', uk: 'Слабкі слова', es: 'Palabras débiles' }),
      reason: triLang(lang, {
        ru: 'Возвращает именно те слова, где были ошибки, а не случайный материал.',
        uk: 'Повертає саме ті слова, де були помилки, а не випадковий матеріал.',
        es: 'Trae justo las palabras donde fallaste, no material aleatorio.',
      }),
      cta: triLang(lang, { ru: 'Открыть слова', uk: 'Відкрити слова', es: 'Abrir palabras' }),
      minutes: '2-5 мин',
      icon: 'library',
      tone: '#38BDF8',
    },
    trainer_phrases: {
      stage: triLang(lang, { ru: 'Моя практика', uk: 'Моя практика', es: 'Mi práctica' }),
      label: triLang(lang, { ru: 'Слабые фразы', uk: 'Слабкі фрази', es: 'Frases débiles' }),
      reason: triLang(lang, {
        ru: 'Чинит целые фразы: это ближе к живому английскому, чем одиночные слова.',
        uk: 'Лагодить цілі фрази: це ближче до живої англійської, ніж окремі слова.',
        es: 'Repara frases completas: más real que palabras sueltas.',
      }),
      cta: triLang(lang, { ru: 'Тренировать фразы', uk: 'Тренувати фрази', es: 'Practicar frases' }),
      minutes: '3-7 мин',
      icon: 'chatbubbles',
      tone: '#2DD4BF',
    },
    trainer_arena: {
      stage: triLang(lang, { ru: 'Моя практика', uk: 'Моя практика', es: 'Mi práctica' }),
      label: triLang(lang, { ru: 'Быстрые ошибки', uk: 'Швидкі помилки', es: 'Fast mistakes' }),
      reason: triLang(lang, {
        ru: 'Разбирает быстрые ошибки без давления, чтобы следующий ответ был увереннее.',
        uk: 'Розбирає швидкі помилки без тиску, щоб наступна відповідь була впевненішою.',
        es: 'Reviews fast mistakes without pressure.',
      }),
      cta: triLang(lang, { ru: 'Разобрать ошибки', uk: 'Розібрати помилки', es: 'Review mistakes' }),
      minutes: '3-6 мин',
      icon: 'shield-checkmark',
      tone: '#FB7185',
    },
    daily_phrase_read: {
      stage: triLang(lang, { ru: 'Микро-шаг', uk: 'Мікро-крок', es: 'Micro paso' }),
      label: triLang(lang, { ru: 'Фраза дня', uk: 'Фраза дня', es: 'Frase del día' }),
      reason: triLang(lang, {
        ru: 'Одна полезная фраза в день поддерживает контакт с языком.',
        uk: 'Одна корисна фраза на день підтримує контакт із мовою.',
        es: 'Una frase útil al día mantiene contacto con el idioma.',
      }),
      cta: triLang(lang, { ru: 'Открыть фразу', uk: 'Відкрити фразу', es: 'Abrir frase' }),
      minutes: '<1 мин',
      icon: 'newspaper',
      tone: '#60A5FA',
    },
    daily_phrase_save: {
      stage: triLang(lang, { ru: 'Микро-шаг', uk: 'Мікро-крок', es: 'Micro paso' }),
      label: triLang(lang, { ru: 'В личный запас', uk: 'В особистий запас', es: 'Guardar' }),
      reason: triLang(lang, {
        ru: 'Сохраняет полезную фразу, чтобы она вернулась в повторении.',
        uk: 'Зберігає корисну фразу, щоб вона повернулась у повторенні.',
        es: 'Guarda una frase útil para repasarla después.',
      }),
      cta: triLang(lang, { ru: 'Сохранить фразу', uk: 'Зберегти фразу', es: 'Guardar frase' }),
      minutes: '<1 мин',
      icon: 'star',
      tone: '#60A5FA',
    },
    diagnostic_complete: {
      stage: triLang(lang, { ru: 'Диагностика', uk: 'Діагностика', es: 'Diagnóstico' }),
      label: triLang(lang, { ru: 'Тест уровня', uk: 'Тест рівня', es: 'Test nivel' }),
      reason: triLang(lang, {
        ru: 'Помогает приложению точнее понимать твой уровень и подбирать нагрузку.',
        uk: 'Допомагає застосунку точніше розуміти твій рівень і добирати навантаження.',
        es: 'Ayuda a ajustar mejor nivel y carga.',
      }),
      cta: triLang(lang, { ru: 'Пройти тест', uk: 'Пройти тест', es: 'Hacer test' }),
      minutes: '8-12 мин',
      icon: 'medkit',
      tone: '#FB7185',
    },
    different_lessons: {
      stage: triLang(lang, { ru: 'Гибкость', uk: 'Гнучкість', es: 'Flexibilidad' }),
      label: triLang(lang, { ru: 'Разные темы', uk: 'Різні теми', es: 'Temas distintos' }),
      reason: triLang(lang, {
        ru: 'Смешивание тем снижает иллюзию знания и укрепляет перенос навыка.',
        uk: 'Змішування тем зменшує ілюзію знання й зміцнює перенесення навички.',
        es: 'Mezclar temas reduce falsa seguridad y mejora transferencia.',
      }),
      cta: triLang(lang, { ru: 'Выбрать уроки', uk: 'Обрати уроки', es: 'Elegir lecciones' }),
      minutes: '5-12 мин',
      icon: 'git-branch',
      tone: '#FBBF24',
    },
    lesson_complete: {
      stage: triLang(lang, { ru: 'Фокус', uk: 'Фокус', es: 'Foco' }),
      label: triLang(lang, { ru: 'Закрыть урок', uk: 'Закрити урок', es: 'Terminar lección' }),
      reason: triLang(lang, {
        ru: 'Доводит тему до конца вместо вечного старта без завершения.',
        uk: 'Доводить тему до кінця замість постійного старту без завершення.',
        es: 'Termina un tema en vez de empezar sin cerrar.',
      }),
      cta: triLang(lang, { ru: 'Продолжить урок', uk: 'Продовжити урок', es: 'Continuar lección' }),
      minutes: '6-12 мин',
      icon: 'flag',
      tone: '#FBBF24',
    },
    morning_session: {
      stage: triLang(lang, { ru: 'Ритм', uk: 'Ритм', es: 'Ritmo' }),
      label: triLang(lang, { ru: 'Утренний якорь', uk: 'Ранковий якір', es: 'Ancla mañana' }),
      reason: triLang(lang, {
        ru: 'Утренняя короткая сессия повышает шанс не пропустить день.',
        uk: 'Ранкова коротка сесія підвищує шанс не пропустити день.',
        es: 'Una sesión matinal aumenta la probabilidad de no fallar.',
      }),
      cta: triLang(lang, { ru: 'Начать урок', uk: 'Почати урок', es: 'Empezar lección' }),
      minutes: '3-6 мин',
      icon: 'partly-sunny',
      tone: '#60A5FA',
    },
    evening_session: {
      stage: triLang(lang, { ru: 'Ритм', uk: 'Ритм', es: 'Ritmo' }),
      label: triLang(lang, { ru: 'Вечерний якорь', uk: 'Вечірній якір', es: 'Ancla noche' }),
      reason: triLang(lang, {
        ru: 'Закрывает день повторением, когда проще сохранить серию.',
        uk: 'Закриває день повторенням, коли простіше зберегти серію.',
        es: 'Cierra el día con repaso y protege la racha.',
      }),
      cta: triLang(lang, { ru: 'Закрыть день', uk: 'Закрити день', es: 'Cerrar día' }),
      minutes: '3-6 мин',
      icon: 'moon',
      tone: '#60A5FA',
    },
    energy_spend: {
      stage: triLang(lang, { ru: 'Активность', uk: 'Активність', es: 'Actividad' }),
      label: triLang(lang, { ru: 'Энергия', uk: 'Енергія', es: 'Energía' }),
      reason: triLang(lang, {
        ru: 'Превращает энергию в реальную практику, а не просто ресурс на экране.',
        uk: 'Перетворює енергію на реальну практику, а не просто ресурс на екрані.',
        es: 'Convierte energía en práctica real.',
      }),
      cta: triLang(lang, { ru: 'Потратить с пользой', uk: 'Витратити з користю', es: 'Usar energía' }),
      minutes: '3-8 мин',
      icon: 'battery-charging',
      tone: '#FBBF24',
    },
    arena_play: {
      stage: triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' }),
      label: triLang(lang, { ru: 'Живой матч', uk: 'Живий матч', es: 'Partida real' }),
      reason: triLang(lang, {
        ru: 'Добавляет давление времени и проверяет, вспоминаются ли фразы в бою.',
        uk: 'Додає тиск часу й перевіряє, чи згадуються фрази в бою.',
        es: 'Añade presión de tiempo y prueba memoria en acción.',
      }),
      cta: triLang(lang, { ru: 'Играть арену', uk: 'Грати арену', es: 'Jugar arena' }),
      minutes: '2-5 мин',
      icon: 'game-controller',
      tone: '#FB7185',
    },
    arena_win: {
      stage: triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' }),
      label: triLang(lang, { ru: 'Победа', uk: 'Перемога', es: 'Victoria' }),
      reason: triLang(lang, {
        ru: 'Проверяет не только участие, но и качество ответов под давлением.',
        uk: 'Перевіряє не лише участь, а й якість відповідей під тиском.',
        es: 'Prueba calidad de respuestas bajo presión.',
      }),
      cta: triLang(lang, { ru: 'Искать матч', uk: 'Шукати матч', es: 'Buscar partida' }),
      minutes: '3-8 мин',
      icon: 'shield-checkmark',
      tone: '#FB7185',
    },
    arena_plays_wins_combo: {
      stage: triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' }),
      label: triLang(lang, { ru: 'Матчи + победа', uk: 'Матчі + перемога', es: 'Partidas + victoria' }),
      reason: triLang(lang, {
        ru: 'Балансирует смелость играть и умение выигрывать за счет знаний.',
        uk: 'Балансує сміливість грати й уміння вигравати завдяки знанням.',
        es: 'Equilibra jugar y ganar con conocimiento.',
      }),
      cta: triLang(lang, { ru: 'Выйти на арену', uk: 'Вийти на арену', es: 'Ir a arena' }),
      minutes: '5-10 мин',
      icon: 'medal',
      tone: '#FB7185',
    },
    arena_rank_promoted: {
      stage: triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' }),
      label: triLang(lang, { ru: 'Рост ранга', uk: 'Зростання рангу', es: 'Subir rango' }),
      reason: triLang(lang, {
        ru: 'Длинная цель дня: мотивирует играть качественно, а не просто нажимать.',
        uk: 'Довга ціль дня: мотивує грати якісно, а не просто натискати.',
        es: 'Meta larga: motiva calidad, no solo actividad.',
      }),
      cta: triLang(lang, { ru: 'Поднять ранг', uk: 'Підняти ранг', es: 'Subir rango' }),
      minutes: '8-15 мин',
      icon: 'trending-up',
      tone: '#FB7185',
    },
    invite_friend: {
      stage: triLang(lang, { ru: 'Социальное', uk: 'Соціальне', es: 'Social' }),
      label: triLang(lang, { ru: 'Друг', uk: 'Друг', es: 'Amigo' }),
      reason: triLang(lang, {
        ru: 'Отправь ссылку другу из приложения.',
        uk: 'Надішли посилання другу з застосунку.',
        es: 'Envía el enlace a un amigo desde la app.',
      }),
      cta: triLang(lang, { ru: 'Пригласить', uk: 'Запросити', es: 'Invitar' }),
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
  const { lang } = useLang();

  // Не подставляем getTodayTasks() (всегда тир уровня 1) — иначе после обновления/холодного старта
  // карточки не совпадают с AsyncStorage и «Забрать» не срабатывает, пока не перезагрузишь экран.
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [progress, setProgress] = useState<TaskProgress[]>([]);
  /** Первый успешный refresh завершён — можно рисовать список и клеймить тем же набором id, что на экране. */
  const [screenReady, setScreenReady] = useState(false);
  const [userName, setUserName] = useState('');
  const [claimedXP, setClaimedXP] = useState<number | null>(null);
  const [xpMultiplier, setXpMultiplier] = useState(1);
  const [hasPremium, setHasPremium] = useState(false);
  /** Награда «3 осколка за тройку дня» уже забрана сегодня (AsyncStorage / облако). */
  const [trioShardsClaimed, setTrioShardsClaimed] = useState(false);
  /** Сколько замен ещё доступно сегодня (max DAILY_TASK_REROLL_MAX_PER_DAY). */
  const [rerollsLeft, setRerollsLeft] = useState(0);
  /** Подтверждение замены: если null — модалка скрыта. */
  const [rerollConfirm, setRerollConfirm] = useState<{ task: DailyTask } | null>(null);
  /** taskId, для которого сейчас идёт сетевой запрос замены (одна за раз). */
  const [rerollBusyId, setRerollBusyId] = useState<string | null>(null);
  /** Антидребезг клейма: свежий getTodayTasksSafe + registerXP не дают второго тапа «в никуда». */
  const [claimBusyId, setClaimBusyId] = useState<string | null>(null);
  const xpAnim = useRef(new Animated.Value(0)).current;
  const claimAnims = useRef<Record<string, Animated.Value>>({});

  // Анимации для премиум-плашки
  const premiumPulse    = useRef(new Animated.Value(1)).current;
  const premiumSparkle  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(premiumPulse,   { toValue: 1.08, duration: 700, useNativeDriver: true }),
      Animated.timing(premiumPulse,   { toValue: 1.0,  duration: 700, useNativeDriver: true }),
    ]));
    const sparkle = Animated.loop(Animated.sequence([
      Animated.timing(premiumSparkle, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(premiumSparkle, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    pulse.start();
    sparkle.start();
    return () => { pulse.stop(); sparkle.stop(); };
  }, [premiumPulse, premiumSparkle]);

  // Инициализируем анимации при изменении tasks (useEffect, не в теле рендера)
  useEffect(() => {
    (tasks ?? []).forEach(task => {
      if (!claimAnims.current[task.id]) {
        claimAnims.current[task.id] = new Animated.Value(1);
      }
    });
  }, [tasks]);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
    getCurrentMultiplier().then(setXpMultiplier).catch(() => {});
    getVerifiedPremiumStatus().then(setHasPremium).catch(() => {});
  }, []);

  // Список заданий и прогресс с экрана должны ссылаться на один и тот же набор task id
  // (после смены уровня/премиума/подмен заданий), и прогресс в storage — быть с ним согласован.
  const refreshGen = useRef(0);
  const refreshTasksAndProgress = useCallback(() => {
    const gen = ++refreshGen.current;
    (async () => {
      try {
        const list = await getTodayTasksSafe();
        if (gen !== refreshGen.current) return;
        setTasks(list);
        const p = await loadTodayProgress(list);
        if (gen !== refreshGen.current) return;
        setProgress(p);
        const trio = await isDailyTasksAllShardsRewardClaimedForDay(getTodayKey());
        if (gen !== refreshGen.current) return;
        setTrioShardsClaimed(trio);
        const left = await getDailyRerollsLeftToday();
        if (gen !== refreshGen.current) return;
        setRerollsLeft(left);
      } catch {
        if (gen !== refreshGen.current) return;
        const fallback = getTodayTasks();
        setTasks(fallback);
        setProgress(fallback.map((x) => ({ taskId: x.id, current: 0, completed: false, claimed: false })));
        setRerollsLeft(0);
      } finally {
        if (gen === refreshGen.current) setScreenReady(true);
      }
    })();
  }, []);

  const handleRerollConfirm = useCallback(async () => {
    const target = rerollConfirm?.task;
    if (!target || rerollBusyId) return;
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
      const r = await rerollDailyTask(target.id);
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
      const reasonMsg: Record<string, { ru: string; uk: string; es: string }> = {
        limit_reached: {
          ru: 'Сегодня ты уже использовал замену. Завтра будет новая попытка.',
          uk: 'Сьогодні ти вже використав заміну. Завтра буде нова спроба.',
          es: 'Ya usaste tu reemplazo de hoy. Mañana podrás reemplazar otra tarea.',
        },
        task_already_completed: {
          ru: 'Это задание уже выполнено — заменять нечего.',
          uk: 'Це завдання вже виконане — замінювати нема чого.',
          es: 'Esta tarea ya está completada, no hay nada que reemplazar.',
        },
        no_candidates: {
          ru: 'Не нашлось подходящей замены — попробуй другое задание.',
          uk: 'Не знайшлось гідної заміни — спробуй інше завдання.',
          es: 'No hay reemplazo disponible. Prueba con otra tarea.',
        },
      };
      const msg = reasonMsg[r.reason] ?? {
        ru: 'Не удалось заменить задание. Попробуй ещё раз.',
        uk: 'Не вдалося замінити завдання. Спробуй ще раз.',
        es: 'No se pudo reemplazar la tarea. Inténtalo de nuevo.',
      };
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: msg.ru,
        messageUk: msg.uk,
        messageEs: msg.es,
      });
      setRerollConfirm(null);
    } finally {
      setRerollBusyId(null);
    }
  }, [rerollConfirm, rerollBusyId, refreshTasksAndProgress, router]);

  useFocusEffect(useCallback(() => { refreshTasksAndProgress(); }, [refreshTasksAndProgress]));

  useEffect(() => {
    const sub = onAppEvent('daily_task_reward_claimed', () => { refreshTasksAndProgress(); });
    return () => sub.remove();
  }, [refreshTasksAndProgress]);

  const handleClaim = async (taskId: string, xpBase: number) => {
    if (claimBusyId) return;
    setClaimBusyId(taskId);
    try {
      const freshList = await getTodayTasksSafe();
      const tasksForClaim = freshList.length > 0 ? freshList : tasks;
      const { claimed, awardedXp } = await claimTaskWithReward(taskId, async () => {
        // registerXP сам резолвит имя из canonical UID + уровня, если userName пустой.
        // Раньше тут был ранний return при !userName — это и был баг "опыт не начислен"
        // когда пользователь жмёт Забрать до того, как AsyncStorage.getItem('user_name') резолвится.
        try {
          const result = await registerXP(xpBase, 'daily_task_reward', userName || '', lang);
          return Math.max(0, Math.round(result.finalDelta || xpBase));
        } catch {
          // Не блокируем выдачу награды из-за transient-сбоя XP-пайплайна.
          return xpBase;
        }
      }, { tasksForClaim });
      // Снимаем спиннер сразу после клейма: дальше могут быть медленные getTodayTasksSafe/loadTodayProgress.
      setClaimBusyId(null);
      if (!claimed) {
        refreshTasksAndProgress();
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Награда уже получена или данные обновились. Проверьте список задач.',
          messageUk: 'Нагороду вже отримано або дані оновилися. Перевірте список завдань.',
          messageEs: 'La recompensa ya está reclamada o los datos cambiaron. Revisa la lista de tareas.',
        });
        return;
      }
      const t = await getTodayTasksSafe();
      setTasks(t);
      const newProgress = await loadTodayProgress(t);
      setProgress(newProgress);

      const allDone = newProgress.length > 0 && newProgress.every(p => p.claimed);
      checkAchievements({ type: 'daily_task', allDone }).catch(() => {});
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
    } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось забрать награду. Попробуйте снова.',
        messageUk: 'Не вдалося забрати нагороду. Спробуйте ще раз.',
        messageEs: 'No se pudo reclamar la recompensa. Inténtalo de nuevo.',
      });
    } finally {
      setClaimBusyId(null);
    }
  };

  const handleClaimTrioShards = useCallback(async () => {
    if (tasks.length === 0) return;
    const done = tasks.every((task) => {
      const p = progress.find((pr) => pr.taskId === task.id);
      return p?.completed === true;
    });
    if (!done || trioShardsClaimed) return;
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
          messageRu: 'Не удалось получить осколки. Попробуйте снова.',
          messageUk: 'Не вдалося отримати уламки. Спробуйте ще раз.',
          messageEs: 'No se pudieron obtener fragmentos. Inténtalo de nuevo.',
        });
      }
    } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Ошибка при получении осколков.',
        messageUk: 'Помилка під час отримання уламків.',
        messageEs: 'Error al obtener fragmentos.',
      });
    }
  }, [tasks, progress, trioShardsClaimed, refreshTasksAndProgress]);

  const claimedCount = countClaimedForTaskList(tasks, progress);
  const allTasksObjectivesDone =
    tasks.length > 0 &&
    tasks.every((task) => {
      const p = progress.find((pr) => pr.taskId === task.id);
      return p?.completed === true;
    });
  const trioRewardCount = SHARD_REWARDS.daily_tasks_all;
  const trioClaimButtonEnabled = allTasksObjectivesDone && !trioShardsClaimed;
  const bonusAccent = trioClaimButtonEnabled ? t.correct : '#C9A860';
  const taskProgressById = new Map(progress.map((row) => [row.taskId, row]));
  const objectivesDoneCount = tasks.filter((task) => taskProgressById.get(task.id)?.completed).length;

  const handleTaskNav = async (task: DailyTask) => {
    if (PREMIUM_TASK_TYPES.has(task.type) && !hasPremium) {
      const paywallContext =
        task.type === 'quiz_hard'
          ? 'quiz_hard'
          : task.type === 'quiz_medium'
            ? 'quiz_medium'
            : 'quiz_level';
      router.push({ pathname: '/premium_modal', params: { context: paywallContext } } as any);
      return;
    }
    const lastLesson = await AsyncStorage.getItem('last_opened_lesson');
    const lessonId = parseInt(lastLesson || '1', 10);
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
        await primeLessonScreenFromStorage(lessonId);
        router.push({ pathname: '/lesson1', params: { id: lessonId } });
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
        await AsyncStorage.setItem('quiz_nav_level', 'hard');
        router.replace('/(tabs)/quizzes');
        break;
      case 'quiz_score':
      case 'quiz_perfect':
        await AsyncStorage.setItem('quiz_nav_level', 'easy');
        router.replace('/(tabs)/quizzes');
        break;
      case 'quiz_easy':
        await AsyncStorage.setItem('quiz_nav_level', 'easy');
        router.replace('/(tabs)/quizzes');
        break;
      case 'quiz_medium':
        await AsyncStorage.setItem('quiz_nav_level', 'medium');
        router.replace('/(tabs)/quizzes');
        break;
      case 'quiz_hard_perfect':
        await AsyncStorage.setItem('quiz_nav_level', 'hard');
        router.replace('/(tabs)/quizzes');
        break;
      case 'open_theory':
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
        router.push('/diagnostic_test');
        break;
      case 'invite_friend':
        // На iPhone экран с приглашением по ссылке скрыт — ведём во «Друзья» (код).
        if (Platform.OS === 'ios') {
          router.push('/(tabs)/friends' as any);
        } else {
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
        await primeLessonScreenFromStorage(lessonId);
        router.push({ pathname: '/lesson1', params: { id: lessonId } });
        break;
    }
  };

  // Сортировка: готово к награде → в процессе → завершено
  const sortedTasks = [...tasks].sort((a, b) => {
    const pa = progress.find(p => p.taskId === a.id);
    const pb = progress.find(p => p.taskId === b.id);
    const aScore = pa?.claimed ? 2 : pa?.completed ? 0 : 1;
    const bScore = pb?.claimed ? 2 : pb?.completed ? 0 : 1;
    return aScore - bScore;
  });

  if (false && !screenReady) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <Text style={{ color: t.textGhost }} />
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: sx.ghost }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="chevron-back" size={28} color={sx.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '700' }}>
            {triLang(lang, { ru: 'Задания дня', uk: 'Завдання дня', es: 'Tareas del día' })}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: sx.primary, fontSize: f.numMd, fontWeight: '700' }}>{objectivesDoneCount}/{tasks.length}</Text>
          <Text style={{ color: sx.muted, fontSize: f.label }}>
            {triLang(lang, { ru: 'выполнено', uk: 'виконано', es: 'completadas' })}
          </Text>
        </View>
      </View>

      {claimedXP !== null && (
        <Animated.View style={{
          position: 'absolute', top: 80, alignSelf: 'center', zIndex: 100,
          backgroundColor: t.correct, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
          opacity: xpAnim,
          transform: [{ translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        }}>
          <XpGainBadge amount={claimedXP} visible={claimedXP !== null} style={{ color: t.correctText, fontSize: f.h1, fontWeight: '800' }} />
        </Animated.View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >

        {/* Прогресс */}
        <LinearGradient
          colors={trioShardsClaimed
            ? ['#111820', '#141E18', '#111820']
            : trioClaimButtonEnabled
              ? ['#0f1f18', '#122018', '#0f1f18']
              : ['#101820', '#17251E', '#102033']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            dailyTaskStyles.taskCard,
            dailyTaskStyles.bonusCard,
            {
              borderColor: trioShardsClaimed
                ? t.border
                : trioClaimButtonEnabled
                  ? t.correct + '55'
                  : bonusAccent + '44',
            },
          ]}
        >
          <View style={dailyTaskStyles.taskMainRow}>
            <View style={[dailyTaskStyles.taskIconFrame, { backgroundColor: bonusAccent + '22' }]}>
              <Image
                source={oskolokImageForPackShards(trioRewardCount)}
                style={{
                  width: 24,
                  height: 24,
                  opacity: trioShardsClaimed ? 0.55 : trioClaimButtonEnabled ? 1 : 0.72,
                }}
                contentFit="contain"
              />
            </View>

            <View style={dailyTaskStyles.taskTextBlock}>
              <Text style={{ color: '#FFFFFF', fontSize: f.body, fontWeight: '800', marginBottom: 1 }}>
                {triLang(lang, { ru: 'Бонус за день', uk: 'Бонус за день', es: 'Bono del día' })}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.50)', fontSize: f.caption, lineHeight: f.caption * 1.4 }}>
                {triLang(lang, {
                  ru: `Выполни все задания и забери ${trioRewardCount} осколков.`,
                  uk: `Виконай усі завдання і забери ${trioRewardCount} уламків.`,
                  es: `Completa todas las tareas y reclama ${trioRewardCount} fragmentos.`,
                })}
              </Text>
            </View>

            <View style={[dailyTaskStyles.xpBadge, {
              backgroundColor: bonusAccent + '1A',
              borderColor: bonusAccent + '60',
            }]}>
              <Text style={{ color: trioShardsClaimed ? t.textMuted : bonusAccent, fontSize: f.body, fontWeight: '900' }}>
                {objectivesDoneCount}/{tasks.length || 0}
              </Text>
            </View>
          </View>

          <View style={dailyTaskStyles.taskProgressBlock}>
            <View style={dailyTaskStyles.taskProgressTrack}>
              <View
                style={{
                  height: '100%',
                  width: `${tasks.length ? Math.min((objectivesDoneCount / tasks.length) * 100, 100) : 0}%` as any,
                  backgroundColor: trioShardsClaimed ? 'rgba(255,255,255,0.25)' : bonusAccent,
                  borderRadius: 999,
                }}
              />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: f.caption, fontWeight: '700' }}>
              {objectivesDoneCount} / {tasks.length || 0}
            </Text>
          </View>

          {(trioClaimButtonEnabled || trioShardsClaimed) && (
            <>
              <View style={dailyTaskStyles.taskDivider} />
              <View style={dailyTaskStyles.taskFooter}>
                <View />
                <View style={dailyTaskStyles.taskActions}>
                  {trioShardsClaimed ? (
                    <View style={[dailyTaskStyles.claimedPill, { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                      <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.4)" />
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleClaimTrioShards}
                      activeOpacity={0.85}
                      style={[dailyTaskStyles.taskClaimButton, { backgroundColor: t.correct, shadowColor: t.correct }]}
                    >
                      <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                        {triLang(lang, { ru: 'Забрать', uk: 'Забрати', es: 'Reclamar' })}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}
        </LinearGradient>

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
          const hasMultiStepProgress = isArenaCombo || task.target > 1;
          const pct = isArenaCombo && comboReq
            ? Math.min(
                100,
                (comboPlaysDisp / comboReq.minPlays) * 50 + (comboWinsDisp >= comboReq.minWins ? 50 : 0),
              )
            : Math.min((current / task.target) * 100, 100);
          const progressLine = isArenaCombo && comboReq
            ? triLang(lang, {
                ru: `Матчи ${comboPlaysDisp}/${comboReq.minPlays} · побед ${comboWinsDisp}/${comboReq.minWins}`,
                uk: `Матчі ${comboPlaysDisp}/${comboReq.minPlays} · перемог ${comboWinsDisp}/${comboReq.minWins}`,
                es: `Partidas ${comboPlaysDisp}/${comboReq.minPlays} · victorias ${comboWinsDisp}/${comboReq.minWins}`,
              })
            : `${current} / ${task.target}`;
          const anim = claimAnims.current[task.id] ?? new Animated.Value(1);
          const { title: taskTitle, desc: taskDesc } = localizedDailyTaskStrings(lang, task);

          const isPremiumTask = PREMIUM_TASK_TYPES.has(task.type);
          const meta = getDailyTaskUiMeta(task.type, lang);
          const taskAccent = claimed ? t.textMuted : completed ? t.correct : meta.tone;

          return (
            <Animated.View key={task.id} style={[dailyTaskStyles.taskOuterAnim, { transform: [{ scale: anim }] }]}>
            <TouchableOpacity
              activeOpacity={completed && !claimed ? 1 : (claimed ? 1 : 0.88)}
              onPress={completed && !claimed ? undefined : (claimed ? undefined : () => handleTaskNav(task))}
            >
            <LinearGradient
              colors={claimed
                ? ['#111820', '#141E18', '#111820']
                : completed
                  ? ['#0f1f18', '#122018', '#0f1f18']
                  : ['#101820', '#17251E', '#102033']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[dailyTaskStyles.taskCard, {
                borderColor: claimed
                  ? t.border
                  : completed
                    ? t.correct + '55'
                    : taskAccent + '44',
              }]}
            >
                {/* Плашка Premium */}
                {isPremiumTask && (
                  <Animated.View
                    pointerEvents="box-none"
                    style={{
                    position: 'absolute', bottom: -1, right: -1, zIndex: 10,
                    transform: [{ scale: premiumPulse }],
                    borderBottomRightRadius: 18, borderTopLeftRadius: 10,
                    overflow: 'hidden',
                  }}
                  >
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: '#B8860B',
                      borderWidth: 1, borderColor: '#FFD700',
                      borderBottomRightRadius: 18, borderTopLeftRadius: 10,
                      paddingHorizontal: 10, paddingVertical: 5,
                    }}>
                      <Animated.Text style={{ fontSize: 11, opacity: premiumSparkle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }}>✨</Animated.Text>
                      <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>PREMIUM</Text>
                      <Animated.Text style={{ fontSize: 11, opacity: premiumSparkle.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }}>✨</Animated.Text>
                    </View>
                  </Animated.View>
                )}

                {/* Верхняя строка: иконка + текст + XP */}
                <View style={dailyTaskStyles.taskMainRow}>
                  <View style={[dailyTaskStyles.taskIconFrame, { backgroundColor: taskAccent + '22' }]}>
                    <Ionicons name={meta.icon} size={20} color={taskAccent} />
                  </View>

                  <View style={dailyTaskStyles.taskTextBlock}>
                    <Text style={{ color: '#FFFFFF', fontSize: f.body, fontWeight: '800', marginBottom: 1 }}>
                      {taskTitle}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.50)', fontSize: f.caption, lineHeight: f.caption * 1.4 }}>
                      {taskDesc}
                    </Text>
                  </View>

                  <View style={[dailyTaskStyles.xpBadge, {
                    backgroundColor: taskAccent + '1A',
                    borderColor: taskAccent + '60',
                  }]}>
                    <Text style={{ color: taskAccent, fontSize: f.body, fontWeight: '900' }}>+{Math.round(task.xp * xpMultiplier)}</Text>
                    <Text style={{ color: taskAccent + '99', fontSize: f.caption, fontWeight: '800', letterSpacing: 0.3 }}>XP</Text>
                  </View>
                </View>

                {/* Прогресс-бар */}
                <View style={dailyTaskStyles.taskProgressBlock}>
                  <View style={dailyTaskStyles.taskProgressTrack}>
                    <View style={{
                      height: '100%',
                      width: `${pct}%` as any,
                      backgroundColor: claimed ? 'rgba(255,255,255,0.25)' : taskAccent,
                      borderRadius: 999,
                    }} />
                  </View>
                  {hasMultiStepProgress && (
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: f.caption, fontWeight: '700' }}>
                      {progressLine}
                    </Text>
                  )}
                </View>

                {/* Footer — только если есть действие */}
                {((!completed && !claimed && rerollsLeft > 0) || completed || claimed) && (
                <>
                <View style={dailyTaskStyles.taskDivider} />
                <View style={dailyTaskStyles.taskFooter}>
                  <View />
                  <View style={dailyTaskStyles.taskActions}>
                    {!completed && !claimed && rerollsLeft > 0 && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          hapticTap();
                          setRerollConfirm({ task });
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={triLang(lang, {
                          ru: 'Заменить задание за осколки',
                          uk: 'Замінити завдання за осколки',
                          es: 'Reemplazar tarea por fragmentos',
                        })}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.15)',
                        }}
                      >
                        <Ionicons name="refresh" size={17} color="rgba(255,255,255,0.5)" />
                      </TouchableOpacity>
                    )}
                    {completed && !claimed && (
                      <TouchableOpacity
                        onPress={() => { void handleClaim(task.id, task.xp); }}
                        disabled={claimBusyId === task.id}
                        activeOpacity={0.85}
                        style={[dailyTaskStyles.taskClaimButton, { backgroundColor: t.correct, shadowColor: t.correct }]}
                      >
                        <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                          {triLang(lang, { ru: 'Забрать', uk: 'Забрати', es: 'Reclamar' })}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {claimed && (
                      <View style={[dailyTaskStyles.claimedPill, { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                        <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.4)" />
                      </View>
                    )}
                  </View>
                </View>
                </>
                )}
            </LinearGradient>
            </TouchableOpacity>
            </Animated.View>
          );
        })}

        {claimedCount === tasks.length && tasks.length > 0 && (
          <View style={{ alignItems: 'center', padding: 24, gap: 8 }}>
            <Text style={{ fontSize: f.numLg + 12 }}>🎉</Text>
            <Text style={{ color: t.correct, fontSize: f.bodyLg, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Все задания выполнены!',
                uk: 'Всі завдання виконано!',
                es: '¡Has completado todas las tareas!',
              })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Новые задания появятся завтра в 00:00',
                uk: "Нові завдання з\'являться завтра о 00:00",
                es: 'Las nuevas tareas aparecerán mañana a las 00:00',
              })}
            </Text>
          </View>
        )}

        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <ReportErrorButton
            screen="daily_tasks"
            dataId="daily_tasks_main"
            dataText={triLang(lang, {
              ru: 'Ежедневные задания',
              uk: 'Щоденні завдання',
              es: 'Tareas diarias',
            })}
          />
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
      </View>
      </ContentWrap>

      {/* Confirm — заменить задание за осколки */}
      <Modal
        visible={rerollConfirm !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (rerollBusyId) return;
          setRerollConfirm(null);
        }}
      >
        <View style={rerollStyles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (rerollBusyId) return;
              hapticTap();
              setRerollConfirm(null);
            }}
          />
          <View style={[rerollStyles.card, { backgroundColor: t.bgCard }]}>
            <Text style={rerollStyles.emoji}>🔄</Text>
            <Text style={[rerollStyles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
              {triLang(lang, {
                ru: 'Заменить задание?',
                uk: 'Замінити завдання?',
                es: '¿Reemplazar la tarea?',
              })}
            </Text>
            {rerollConfirm?.task && (
              <Text style={[rerollStyles.subtitle, { color: t.textSecond, fontSize: f.body }]}>
                «{localizedDailyTaskStrings(lang, rerollConfirm.task).title}»
                {' — '}
                {triLang(lang, {
                  ru: 'будет заменено на случайное задание из той же категории.',
                  uk: 'буде замінено на випадкове завдання з тієї ж категорії.',
                  es: 'se reemplazará por una tarea aleatoria de la misma categoría.',
                })}
              </Text>
            )}

            <View style={rerollStyles.priceRow}>
              <Image
                source={oskolokImageForPackShards(DAILY_TASK_REROLL_COST_SHARDS)}
                style={{ width: 32, height: 32 }}
                contentFit="contain"
              />
              <Text style={[rerollStyles.priceNum, { color: t.textPrimary }]}>{DAILY_TASK_REROLL_COST_SHARDS}</Text>
            </View>

            <Text style={[rerollStyles.hint, { color: t.textMuted }]}>
              {triLang(lang, {
                ru: 'Лимит — 1 замена в сутки. Прогресс старого задания не сохранится.',
                uk: 'Ліміт — 1 заміна на добу. Прогрес старого завдання не збережеться.',
                es: 'Límite: 1 reemplazo por día. El progreso de la tarea anterior se perderá.',
              })}
            </Text>

            <TouchableOpacity
              onPress={() => {
                hapticTap();
                void handleRerollConfirm();
              }}
              disabled={!!rerollBusyId}
              style={[
                rerollStyles.btnPrimary,
                { backgroundColor: t.accent, opacity: rerollBusyId ? 0.6 : 1 },
              ]}
            >
              <Text style={[rerollStyles.btnPrimaryText, { color: t.correctText, fontSize: f.body }]}>
                {triLang(lang, {
                  ru: `Заменить · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
                  uk: `Замінити · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
                  es: `Reemplazar · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
                })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (rerollBusyId) return;
                hapticTap();
                setRerollConfirm(null);
              }}
              style={[rerollStyles.btnGhost, { borderColor: t.border }]}
              disabled={!!rerollBusyId}
            >
              <Text style={[rerollStyles.btnGhostText, { color: t.textPrimary, fontSize: f.body }]}>
                {triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </ScreenGradient>
  );
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
    padding: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskMainRow: {
    flexDirection: 'row',
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
  taskTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  xpBadge: {
    width: 58,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskProgressBlock: {
    gap: 4,
    marginTop: 8,
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
  },
  taskFooter: {
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
