import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudio } from '../hooks/use-audio';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddToFlashcard from '../components/AddToFlashcard';
import ContentWrap from '../components/ContentWrap';
import { triLang as pickTriLang, type Lang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useEnergy } from '../components/EnergyContext';
import { useScreen } from '../hooks/use-screen';
import LessonEnergyLightning from '../components/LessonEnergyLightning';
import NoEnergyModal from '../components/NoEnergyModal';
import { hapticError, hapticTap } from '../hooks/use-haptics';
import { loadFlashcards } from '../hooks/use-flashcards';
import { updateMultipleTaskProgress } from './daily_tasks';
import { loadSettings } from './settings_edu';
import { getCurrentMultiplier, registerXP } from './xp_manager';
import { addShards } from './shards_system';
import { playActivityCompletionModalSound } from './activity_complete_sound';
import FlatTopHexFill from '../components/FlatTopHexFill';
import ReportErrorButton from '../components/ReportErrorButton';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { lessonWordRecognitionPrompt } from './lesson_words_spanish_gloss';
import { LESSON_22_VOCABULARY } from './lesson_data_17_24';
import { LESSON_WORD_ES_BY_EN } from './lesson_words_es_by_en';
import { logMistake } from './mistake_log';
import { recordWordMistake, activateWordForTrainer } from './trainer_store';
import { bumpStatsDaily } from './stats_daily_breakdown';

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const shuffleNoConsecutive = (arr: Card[]): Card[] => {
  const result = shuffle(arr);
  for (let i = 1; i < result.length; i++) {
    if (result[i].word.en === result[i - 1].word.en) {
      for (let j = i + 1; j < result.length; j++) {
        if (result[j].word.en !== result[i - 1].word.en) {
          [result[i], result[j]] = [result[j], result[i]];
          break;
        }
      }
    }
  }
  return result;
};

const REQUIRED = 3;
const POINTS_PER_CORRECT = 5;
const POINTS_PER_LEARNED = 10;

/**
 * После верного: почти сразу (озвучка не блокирует таймер — вынесена в конец callback).
 * Неверно: дольше, чтобы увидеть ошибку.
 */
const ANSWER_FEEDBACK_MS = { correct: 800, wrong: 400 } as const;

type POS = 'pronouns'|'verbs'|'irregular_verbs'|'adjectives'|'adverbs'|'nouns';
interface Word { en:string; ru:string; uk:string; es:string; pos:POS; context?:string; definition?:string; }

function vocabularyProgressMetrics(
  words: Word[],
  counts: Record<string, number>,
): { correctSteps: number; totalSteps: number; fullyLearned: number; pct: number } {
  const totalSteps = words.length * REQUIRED;
  const correctSteps = words.reduce((sum, w) => sum + Math.min(counts[w.en] ?? 0, REQUIRED), 0);
  const fullyLearned = words.filter(w => (counts[w.en] ?? 0) >= REQUIRED).length;
  const pct = totalSteps > 0 ? Math.min(100, Math.round((correctSteps / totalSteps) * 100)) : 0;
  return { correctSteps, totalSteps, fullyLearned, pct };
}

const POS_LABELS_RU: Record<POS,string> = {
  pronouns:'Местоимения', verbs:'Глаголы (to-be)', irregular_verbs:'Неправильные глаголы', adjectives:'Прилагательные',
  adverbs:'Наречия', nouns:'Существительные',
};
const POS_LABELS_UK: Record<POS,string> = {
  pronouns:'Займенники', verbs:'Дієслова (to-be)', irregular_verbs:'Неправильні дієслова', adjectives:'Прикметники',
  adverbs:'Прислівники', nouns:'Іменники',
};
const POS_LABELS_ES: Record<POS,string> = {
  pronouns:'Pronombres', verbs:'Verbos (to-be)', irregular_verbs:'Verbos irregulares', adjectives:'Adjetivos',
  adverbs:'Adverbios', nouns:'Sustantivos',
};

/** Испанские подсказки урока 22: переопределения, где глоссарий по EN не совпадает со смыслом в уроке. */
const LESSON_22_ES_OVERRIDE: Record<string, string> = {
  line: 'cola',
  reschedule: 'reprogramar',
  shopping: 'compras',
};

function posForLesson22Word(enLower: string): POS {
  const adjectives = new Set([
    'annual', 'beautiful', 'boring', 'bright', 'cheap', 'classical', 'cold', 'complex',
    'favorite', 'foreign', 'free', 'great', 'historical', 'huge', 'important', 'legal',
    'modern', 'noisy', 'plastic', 'public', 'rare', 'refreshing', 'reliable', 'spicy',
    'stressed', 'technical', 'wild', 'whole',
  ]);
  const verbs = new Set([
    'appreciate', 'avoid', 'buy', 'check', 'clean', 'collect', 'consider', 'cook', 'dance',
    'discuss', 'dislike', 'enjoy', 'finish', 'hate', 'help', 'ignore', 'imagine', 'include',
    'keep', 'learn', 'like', 'listen', 'mention', 'order', 'paint', 'photograph', 'prefer',
    'read', 'relax', 'require', 'reschedule', 'ride', 'sell', 'smoke', 'stop', 'study',
    'suggest', 'swim', 'take', 'teach', 'translate', 'travel', 'understand', 'visit', 'wait',
    'walk', 'work', 'write',
  ]);
  if (adjectives.has(enLower)) return 'adjectives';
  if (verbs.has(enLower)) return 'verbs';
  return 'nouns';
}

const LESSON_22_WORD_CARDS: Word[] = LESSON_22_VOCABULARY.map((row) => {
  const en = row.english.toLowerCase();
  const es =
    LESSON_22_ES_OVERRIDE[en] ??
    LESSON_WORD_ES_BY_EN[en] ??
    en;
  return {
    en,
    ru: row.russian,
    uk: row.ukrainian,
    es,
    pos: posForLesson22Word(en),
  };
});

const WORDS_BY_LESSON: Record<number, Word[]> = {
  1: [
    { en: 'I', ru: 'Я', uk: 'Я', es: 'Yo', pos: 'pronouns' },
    { en: 'you', ru: 'Ты / Вы', uk: 'Ти / Ви', es: 'Tú / usted', pos: 'pronouns' },
    { en: 'he', ru: 'Он', uk: 'Він', es: 'Él', pos: 'pronouns' },
    { en: 'she', ru: 'Она', uk: 'Вона', es: 'Ella', pos: 'pronouns' },
    { en: 'we', ru: 'Мы', uk: 'Ми', es: 'Nosotros / nosotras', pos: 'pronouns' },
    { en: 'they', ru: 'Они', uk: 'Вони', es: 'Ellos / ellas', pos: 'pronouns' },
    { en: 'it', ru: 'Это / Оно', uk: 'Це / Воно', es: 'Eso / ello', pos: 'pronouns' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', es: 'aquí', pos: 'adverbs' },
    { en: 'outside', ru: 'Снаружи / На улице', uk: 'Зовні / Надворі', es: 'afuera', pos: 'adverbs' },
    { en: 'inside', ru: 'Внутри', uk: 'Всередині', es: 'adentro', pos: 'adverbs' },
    { en: 'together', ru: 'Вместе', uk: 'Разом', es: 'juntos', pos: 'adverbs' },
    { en: 'near', ru: 'Близко / Рядом', uk: 'Близько / Поруч', es: 'cerca', pos: 'adjectives' },
    { en: 'ready', ru: 'Готовый', uk: 'Готовий', es: 'listo', pos: 'adjectives' },
    { en: 'busy', ru: 'Занятый', uk: 'Зайнятий', es: 'ocupado', pos: 'adjectives' },
    { en: 'calm', ru: 'Спокойный', uk: 'Спокійний', es: 'tranquilo', pos: 'adjectives' },
    { en: 'happy', ru: 'Счастливый', uk: 'Щасливий', es: 'feliz', pos: 'adjectives' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', es: 'importante', pos: 'adjectives' },
    { en: 'okay', ru: 'В порядке', uk: 'В порядку', es: 'bien', pos: 'adjectives' },
    { en: 'right', ru: 'Правый / Правильный', uk: 'Правий / Правильний', es: 'correcto', pos: 'adjectives' },
    { en: 'safe', ru: 'В безопасности', uk: 'В безпеці', es: 'seguro', pos: 'adjectives' },
    { en: 'sick', ru: 'Больной', uk: 'Хворий', es: 'enfermo', pos: 'adjectives' },
    { en: 'cheap', ru: 'Дешевый', uk: 'Дешевий', es: 'barato', pos: 'adjectives' },
    { en: 'sad', ru: 'Грустный', uk: 'Сумний', es: 'triste', pos: 'adjectives' },
    { en: 'late', ru: 'Поздний / Опаздывающий', uk: 'Пізній / Запізнілий', es: 'tarde', pos: 'adjectives' },
    { en: 'tired', ru: 'Уставший', uk: 'Втомлений', es: 'cansado', pos: 'adjectives' },
    { en: 'free', ru: 'Бесплатный / Свободный', uk: 'Безкоштовний / Вільний', es: 'gratis / libre', pos: 'adjectives' },
    { en: 'strong', ru: 'Сильный', uk: 'Сильний', es: 'fuerte', pos: 'adjectives' },
    { en: 'kind', ru: 'Добрый', uk: 'Добрий', es: 'amable', pos: 'adjectives' },
    { en: 'serious', ru: 'Серьёзный', uk: 'Серйозний', es: 'serio', pos: 'adjectives' },
    { en: 'fine', ru: 'В порядке', uk: 'В порядку', es: 'bien', pos: 'adjectives' },
    { en: 'smart', ru: 'Умный', uk: 'Розумний', es: 'inteligente', pos: 'adjectives' },
    { en: 'nervous', ru: 'Нервный / Нервничающий', uk: 'Нервовий / Тривожний', es: 'nervioso', pos: 'adjectives' },
    { en: 'hungry', ru: 'Голодный', uk: 'Голодний', es: 'hambriento', pos: 'adjectives' },
    { en: 'broken', ru: 'Сломанный', uk: 'Зламаний', es: 'roto', pos: 'adjectives' },
    { en: 'angry', ru: 'Злой', uk: 'Злий', es: 'enojado', pos: 'adjectives' },
    { en: 'empty', ru: 'Пустой', uk: 'Порожній', es: 'vacío', pos: 'adjectives' },
    { en: 'friends', ru: 'Друзья', uk: 'Друзі', es: 'amigos', pos: 'nouns' },
  ],
  2: [
    // Местоимения — повторение из урока 1
    { en: 'I', ru: 'Я', uk: 'Я', es: 'Yo', pos: 'pronouns' },
    { en: 'you', ru: 'Ты / Вы', uk: 'Ти / Ви', es: 'Tú / usted', pos: 'pronouns' },
    { en: 'he', ru: 'Он', uk: 'Він', es: 'Él', pos: 'pronouns' },
    { en: 'she', ru: 'Она', uk: 'Вона', es: 'Ella', pos: 'pronouns' },
    { en: 'we', ru: 'Мы', uk: 'Ми', es: 'Nosotros / nosotras', pos: 'pronouns' },
    { en: 'they', ru: 'Они', uk: 'Вони', es: 'Ellos / ellas', pos: 'pronouns' },
    { en: 'it', ru: 'Это / Оно', uk: 'Це / Воно', es: 'Eso / ello', pos: 'pronouns' },
    // Отрицание — новая грамматика урока 2
    { en: 'not', ru: 'Не (отрицание)', uk: 'Не (заперечення)', es: 'no', pos: 'adverbs' },
    // Слова из урока 1 — повторение
    { en: 'here', ru: 'Здесь', uk: 'Тут', es: 'aquí', pos: 'adverbs' },
    { en: 'outside', ru: 'Снаружи / На улице', uk: 'Зовні / Надворі', es: 'afuera', pos: 'adverbs' },
    { en: 'inside', ru: 'Внутри', uk: 'Всередині', es: 'adentro', pos: 'adverbs' },
    { en: 'together', ru: 'Вместе', uk: 'Разом', es: 'juntos', pos: 'adverbs' },
    { en: 'ready', ru: 'Готовый', uk: 'Готовий', es: 'listo', pos: 'adjectives' },
    { en: 'busy', ru: 'Занятый', uk: 'Зайнятий', es: 'ocupado', pos: 'adjectives' },
    { en: 'calm', ru: 'Спокойный', uk: 'Спокійний', es: 'tranquilo', pos: 'adjectives' },
    { en: 'happy', ru: 'Счастливый', uk: 'Щасливий', es: 'feliz', pos: 'adjectives' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', es: 'importante', pos: 'adjectives' },
    { en: 'okay', ru: 'В порядке', uk: 'В порядку', es: 'bien', pos: 'adjectives' },
    { en: 'right', ru: 'Правый / Правильный', uk: 'Правий / Правильний', es: 'correcto', pos: 'adjectives' },
    { en: 'safe', ru: 'В безопасности', uk: 'В безпеці', es: 'seguro', pos: 'adjectives' },
    { en: 'sick', ru: 'Больной', uk: 'Хворий', es: 'enfermo', pos: 'adjectives' },
    { en: 'sad', ru: 'Грустный', uk: 'Сумний', es: 'triste', pos: 'adjectives' },
    { en: 'late', ru: 'Поздний / Опаздывающий', uk: 'Пізній / Запізнілий', es: 'tarde', pos: 'adjectives' },
    { en: 'tired', ru: 'Уставший', uk: 'Втомлений', es: 'cansado', pos: 'adjectives' },
    { en: 'free', ru: 'Бесплатный / Свободный', uk: 'Безкоштовний / Вільний', es: 'gratis / libre', pos: 'adjectives' },
    { en: 'nervous', ru: 'Нервный', uk: 'Нервовий', es: 'nervioso', pos: 'adjectives' },
    { en: 'hungry', ru: 'Голодный', uk: 'Голодний', es: 'hambriento', pos: 'adjectives' },
    { en: 'angry', ru: 'Злой', uk: 'Злий', es: 'enojado', pos: 'adjectives' },
    // Новые слова урока 2
    { en: 'sure', ru: 'Уверенный', uk: 'Впевнений', es: 'seguro', pos: 'adjectives' },
    { en: 'expensive', ru: 'Дорогой', uk: 'Дорогий', es: 'caro', pos: 'adjectives' },
    { en: 'scary', ru: 'Страшный', uk: 'Страшний', es: 'aterrador', pos: 'adjectives' },
    { en: 'open', ru: 'Открытый', uk: 'Відкритий', es: 'abierto', pos: 'adjectives' },
    { en: 'funny', ru: 'Смешной', uk: 'Смішний', es: 'gracioso', pos: 'adjectives' },
    { en: 'afraid', ru: 'Испуганный / Боящийся', uk: 'Наляканий / Боязливий', es: 'asustado', pos: 'adjectives' },
    { en: 'far', ru: 'Далеко / Далёкий', uk: 'Далеко / Далекий', es: 'lejos', pos: 'adjectives' },
    { en: 'wrong', ru: 'Неправильный / Неправый', uk: 'Неправильний / Неправий', es: 'equivocado', pos: 'adjectives' },
    { en: 'true', ru: 'Правда / Истинный', uk: 'Правда / Істинний', es: 'verdadero', pos: 'adjectives' },
    { en: 'dangerous', ru: 'Опасный', uk: 'Небезпечний', es: 'peligroso', pos: 'adjectives' },
    { en: 'serious', ru: 'Серьёзный', uk: 'Серйозний', es: 'serio', pos: 'adjectives' },
  ],
  3: [
    // Личные местоимения — повторение
    { en: 'I', ru: 'Я', uk: 'Я', es: 'Yo', pos: 'pronouns' },
    { en: 'you', ru: 'Ты / Вы', uk: 'Ти / Ви', es: 'Tú / usted', pos: 'pronouns' },
    { en: 'he', ru: 'Он', uk: 'Він', es: 'Él', pos: 'pronouns' },
    { en: 'she', ru: 'Она', uk: 'Вона', es: 'Ella', pos: 'pronouns' },
    { en: 'we', ru: 'Мы', uk: 'Ми', es: 'Nosotros / nosotras', pos: 'pronouns' },
    { en: 'they', ru: 'Они', uk: 'Вони', es: 'Ellos / ellas', pos: 'pronouns' },
    { en: 'it', ru: 'Это / Оно', uk: 'Це / Воно', es: 'Eso / ello', pos: 'pronouns' },
    // Объектные местоимения — новые в уроке 3
    { en: 'me', ru: 'Меня / Мне', uk: 'Мене / Мені', es: 'me', pos: 'pronouns' },
    { en: 'him', ru: 'Его / Ему', uk: 'Його / Йому', es: 'lo / le', pos: 'pronouns' },
    { en: 'her', ru: 'Её / Ей', uk: 'Її / Їй', es: 'la / le', pos: 'pronouns' },
    { en: 'us', ru: 'Нас / Нам', uk: 'Нас / Нам', es: 'nos', pos: 'pronouns' },
    { en: 'them', ru: 'Их / Им', uk: 'Їх / Їм', es: 'los / les', pos: 'pronouns' },
    // Глаголы — основные новые слова урока
    { en: 'work', ru: 'Работать', uk: 'Працювати', es: 'trabajar', pos: 'verbs' },
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', es: 'entender', pos: 'verbs' },
    { en: 'live', ru: 'Жить', uk: 'Жити', es: 'vivir', pos: 'verbs' },
    { en: 'drink', ru: 'Пить', uk: 'Пити', es: 'beber / tomar', pos: 'verbs' },
    { en: 'speak', ru: 'Говорить', uk: 'Говорити', es: 'hablar', pos: 'verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', es: 'ver / mirar', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', es: 'ayudar', pos: 'verbs' },
    { en: 'know', ru: 'Знать', uk: 'Знати', es: 'saber / conocer', pos: 'verbs' },
    { en: 'eat', ru: 'Есть / Кушать', uk: 'Їсти', es: 'comer', pos: 'verbs' },
    { en: 'love', ru: 'Любить', uk: 'Любити', es: 'amar / encantar', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', es: 'comprar', pos: 'verbs' },
    { en: 'cost', ru: 'Стоить', uk: 'Коштувати', es: 'costar', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', es: 'leer', pos: 'verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', es: 'oír / escuchar', pos: 'verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', es: 'escribir', pos: 'verbs' },
    { en: 'listen', ru: 'Слушать', uk: 'Слухати', es: 'escuchar', pos: 'verbs' },
    { en: 'wash', ru: 'Мыть', uk: 'Мити', es: 'lavar', pos: 'verbs' },
    { en: 'drive', ru: 'Водить / Ехать', uk: 'Водити / Їхати', es: 'conducir / manejar', pos: 'verbs' },
    { en: 'need', ru: 'Нуждаться / Нужно', uk: 'Потребувати / Потрібно', es: 'necesitar', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати / Дзвонити', es: 'llamar', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', es: 'cocinar', pos: 'verbs' },
    { en: 'feel', ru: 'Чувствовать', uk: 'Відчувати', es: 'sentir', pos: 'verbs' },
    { en: 'travel', ru: 'Путешествовать', uk: 'Подорожувати', es: 'viajar', pos: 'verbs' },
    { en: 'teach', ru: 'Преподавать / Учить', uk: 'Викладати / Навчати', es: 'enseñar', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', es: 'olvidar', pos: 'verbs' },
    { en: 'remember', ru: 'Помнить', uk: 'Пам\'ятати', es: 'recordar', pos: 'verbs' },
    { en: 'wear', ru: 'Носить (одежду)', uk: 'Носити (одяг)', es: 'llevar / usar', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', es: 'pedir / ordenar', pos: 'verbs' },
    { en: 'use', ru: 'Использовать', uk: 'Використовувати', es: 'usar / utilizar', pos: 'verbs' },
    { en: 'trust', ru: 'Доверять', uk: 'Довіряти', es: 'confiar', pos: 'verbs' },
    { en: 'wait', ru: 'Ждать', uk: 'Чекати', es: 'esperar', pos: 'verbs' },
    { en: 'come', ru: 'Приходить', uk: 'Приходити', es: 'venir', pos: 'verbs' },
    { en: 'look', ru: 'Выглядеть / Смотреть', uk: 'Виглядати / Дивитися', es: 'verse / mirar', pos: 'verbs' },
    { en: 'sound', ru: 'Звучать', uk: 'Звучати', es: 'sonar', pos: 'verbs' },
    { en: 'take', ru: 'Брать / Занимать', uk: 'Брати / Займати', es: 'tomar / llevar', pos: 'verbs' },
    // Существительные
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', es: 'café', pos: 'nouns' },
    { en: 'English', ru: 'Английский', uk: 'Англійська', es: 'inglés', pos: 'nouns' },
    { en: 'TV', ru: 'Телевизор', uk: 'Телевізор', es: 'televisión', pos: 'nouns' },
    { en: 'people', ru: 'Люди', uk: 'Люди', es: 'gente', pos: 'nouns' },
    { en: 'meat', ru: 'Мясо', uk: "М'ясо", es: 'carne', pos: 'nouns' },
    { en: 'music', ru: 'Музыка', uk: 'Музика', es: 'música', pos: 'nouns' },
    { en: 'food', ru: 'Еда', uk: 'Їжа', es: 'comida', pos: 'nouns' },
    { en: 'money', ru: 'Деньги', uk: 'Гроші', es: 'dinero', pos: 'nouns' },
    { en: 'books', ru: 'Книги', uk: 'Книжки', es: 'libros', pos: 'nouns' },
    { en: 'messages', ru: 'Сообщения', uk: 'Повідомлення', es: 'mensajes', pos: 'nouns' },
    { en: 'dishes', ru: 'Посуда', uk: 'Посуд', es: 'platos', pos: 'nouns' },
    { en: 'cars', ru: 'Машины', uk: 'Машини', es: 'coches', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', es: 'cena', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', es: 'tiempo', pos: 'nouns' },
    { en: 'names', ru: 'Имена', uk: 'Імена', es: 'nombres', pos: 'nouns' },
    { en: 'glasses', ru: 'Очки', uk: 'Окуляри', es: 'gafas', pos: 'nouns' },
    { en: 'pizza', ru: 'Пицца', uk: 'Піца', es: 'pizza', pos: 'nouns' },
    { en: 'apps', ru: 'Приложения', uk: 'Застосунки', es: 'aplicaciones', pos: 'nouns' },
    { en: 'rest', ru: 'Отдых', uk: 'Відпочинок', es: 'descanso', pos: 'nouns' },
    { en: 'tea', ru: 'Чай', uk: 'Чай', es: 'té', pos: 'nouns' },
    // Наречия
    { en: 'often', ru: 'Часто', uk: 'Часто', es: 'a menudo', pos: 'adverbs' },
    { en: 'well', ru: 'Хорошо', uk: 'Добре', es: 'bien', pos: 'adverbs' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', es: 'aquí', pos: 'adverbs' },
  ],
  4: [
    // Вспомогательные глаголы — новая грамматика урока 4
    { en: 'do', ru: 'Делать', uk: 'Робити', es: 'hacer', pos: 'verbs' },
    { en: 'does', ru: 'Делает', uk: 'Робить', es: 'hace', pos: 'verbs' },
    // Новые глаголы урока 4
    { en: 'smoke', ru: 'Курить', uk: 'Курити', es: 'fumar', pos: 'verbs' },
    { en: 'pay', ru: 'Платить', uk: 'Платити', es: 'pagar', pos: 'verbs' },
    { en: 'sell', ru: 'Продавать', uk: 'Продавати', es: 'vender', pos: 'verbs' },
    { en: 'lose', ru: 'Терять', uk: 'Втрачати', es: 'perder', pos: 'verbs' },
    { en: 'break', ru: 'Ломать', uk: 'Ламати', es: 'romper', pos: 'verbs' },
    { en: 'waste', ru: 'Тратить зря', uk: 'Витрачати даремно', es: 'desperdiciar', pos: 'verbs' },
    { en: 'share', ru: 'Делиться', uk: 'Ділитися', es: 'compartir', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Надсилати', es: 'enviar', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', es: 'revisar', pos: 'verbs' },
    { en: 'skip', ru: 'Пропускать', uk: 'Пропускати', es: 'saltarse', pos: 'verbs' },
    { en: 'carry', ru: 'Носить с собой', uk: 'Носити з собою', es: 'llevar', pos: 'verbs' },
    { en: 'ask', ru: 'Спрашивать / Просить', uk: 'Питати / Просити', es: 'preguntar / pedir', pos: 'verbs' },
    { en: 'believe', ru: 'Верить', uk: 'Вірити', es: 'creer', pos: 'verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', es: 'ver', pos: 'verbs' },
    { en: 'like', ru: 'Нравиться / Любить', uk: 'Подобатися / Любити', es: 'gustar', pos: 'verbs' },
    // Закрепление глаголов из урока 3
    { en: 'drink', ru: 'Пить', uk: 'Пити', es: 'beber', pos: 'verbs' },
    { en: 'listen', ru: 'Слушать', uk: 'Слухати', es: 'escuchar', pos: 'verbs' },
    { en: 'eat', ru: 'Есть', uk: 'Їсти', es: 'comer', pos: 'verbs' },
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', es: 'entender', pos: 'verbs' },
    { en: 'live', ru: 'Жить', uk: 'Жити', es: 'vivir', pos: 'verbs' },
    { en: 'work', ru: 'Работать', uk: 'Працювати', es: 'trabajar', pos: 'verbs' },
    { en: 'know', ru: 'Знать', uk: 'Знати', es: 'saber / conocer', pos: 'verbs' },
    { en: 'remember', ru: 'Помнить', uk: 'Пам\'ятати', es: 'recordar', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', es: 'comprar', pos: 'verbs' },
    { en: 'use', ru: 'Использовать', uk: 'Використовувати', es: 'usar', pos: 'verbs' },
    { en: 'wear', ru: 'Носить (одежду)', uk: 'Носити (одяг)', es: 'llevar / usar', pos: 'verbs' },
    { en: 'drive', ru: 'Водить', uk: 'Водити', es: 'conducir', pos: 'verbs' },
    { en: 'feel', ru: 'Чувствовать', uk: 'Відчувати', es: 'sentir', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', es: 'olvidar', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', es: 'ayudar', pos: 'verbs' },
    { en: 'need', ru: 'Нуждаться', uk: 'Потребувати', es: 'necesitar', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', es: 'leer', pos: 'verbs' },
    { en: 'trust', ru: 'Доверять', uk: 'Довіряти', es: 'confiar', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', es: 'cocinar', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', es: 'llamar', pos: 'verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', es: 'oír', pos: 'verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', es: 'ver / mirar', pos: 'verbs' },
    { en: 'take', ru: 'Брать', uk: 'Брати', es: 'tomar', pos: 'verbs' },
    // Новые существительные урока 4
    { en: 'milk', ru: 'Молоко', uk: 'Молоко', es: 'leche', pos: 'nouns' },
    { en: 'sugar', ru: 'Сахар', uk: 'Цукор', es: 'azúcar', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', es: 'efectivo', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'entradas', pos: 'nouns' },
    { en: 'things', ru: 'Вещи', uk: 'Речі', es: 'cosas', pos: 'nouns' },
    { en: 'maps', ru: 'Карты', uk: 'Карти', es: 'mapas', pos: 'nouns' },
    { en: 'breakfast', ru: 'Завтрак', uk: 'Сніданок', es: 'desayuno', pos: 'nouns' },
  ],
  5: [
    { en: 'do', ru: 'Делать', uk: 'Робити', es: 'hacer', pos: 'irregular_verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', es: 'encontrar', pos: 'irregular_verbs' },
    { en: 'go', ru: 'Идти', uk: 'Йти', es: 'ir', pos: 'irregular_verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', es: 'oír', pos: 'irregular_verbs' },
    { en: 'sing', ru: 'Петь', uk: 'Співати', es: 'cantar', pos: 'verbs' },
    { en: 'book', ru: 'Бронировать', uk: 'Бронювати', es: 'reservar', pos: 'verbs' },
    { en: 'speak', ru: 'Говорить', uk: 'Говорити', es: 'hablar', pos: 'irregular_verbs' },
    { en: 'sleep', ru: 'Спать', uk: 'Спати', es: 'dormir', pos: 'irregular_verbs' },
    { en: 'code', ru: 'Код', uk: 'Код', es: 'código', pos: 'nouns' },
    { en: 'room', ru: 'Номер', uk: 'Номер', es: 'habitación', pos: 'nouns' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', es: 'mesa', pos: 'nouns' },
    { en: 'vegetable', ru: 'Овощ', uk: 'Овоч', es: 'verdura', pos: 'nouns' },
    { en: 'job', ru: 'Работа', uk: 'Робота', es: 'trabajo', pos: 'nouns' },
    { en: 'luck', ru: 'Удача', uk: 'Вдача', es: 'suerte', pos: 'nouns' },
    { en: 'noise', ru: 'Шум', uk: 'Шум', es: 'ruido', pos: 'nouns' },
    { en: 'mask', ru: 'Маска', uk: 'Маска', es: 'mascarilla', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'boleto', pos: 'nouns' },
    { en: 'price', ru: 'Цена', uk: 'Ціна', es: 'precio', pos: 'nouns' },
    { en: 'credit', ru: 'Кредит', uk: 'Кредит', es: 'crédito', pos: 'nouns' },
    { en: 'card', ru: 'Карта (карточка)', uk: 'Картка', es: 'tarjeta', pos: 'nouns' },
    { en: 'rule', ru: 'Правило', uk: 'Правило', es: 'regla', pos: 'nouns' },
    { en: 'tax', ru: 'Налог', uk: 'Податок', es: 'impuesto', pos: 'nouns' },
    { en: 'taxes', ru: 'Налоги', uk: 'Податки', es: 'impuestos', pos: 'nouns' },
    { en: 'mistake', ru: 'Ошибка', uk: 'Помилка', es: 'error', pos: 'nouns' },
    { en: 'tomorrow', ru: 'Завтра', uk: 'Завтра', es: 'mañana', pos: 'adverbs' },
    { en: 'much', ru: 'Много', uk: 'Багато', es: 'mucho', pos: 'adverbs' },
    { en: 'well', ru: 'Хорошо', uk: 'Добре', es: 'Bueno', pos: 'adverbs' },
    { en: 'inside', ru: 'Внутрь', uk: 'Всередину', es: 'adentro', pos: 'adverbs' },
    { en: 'correctly', ru: 'Правильно', uk: 'Правильно', es: 'correctamente', pos: 'adverbs' },
    { en: 'enough', ru: 'Достаточно', uk: 'Достатньо', es: 'suficiente', pos: 'adverbs' },
    { en: 'cold', ru: 'Холодный', uk: 'Холодний', es: 'frío', pos: 'adjectives' },
  ],
  6: [
    { en: 'where', ru: 'Где', uk: 'Де', es: 'dónde', pos: 'adverbs' },
    { en: 'what', ru: 'Что', uk: 'Що', es: 'qué', pos: 'adverbs' },
    { en: 'when', ru: 'Когда', uk: 'Коли', es: 'cuándo', pos: 'adverbs' },
    { en: 'who', ru: 'Кто', uk: 'Хто', es: 'quién', pos: 'adverbs' },
    { en: 'why', ru: 'Почему', uk: 'Чому', es: 'por qué', pos: 'adverbs' },
    { en: 'how', ru: 'Как', uk: 'Як', es: 'cómo', pos: 'adverbs' },
    { en: 'which', ru: 'Какой (из)', uk: 'Який (з)', es: 'cuál', pos: 'adverbs' },
    { en: 'how much', ru: 'Сколько (цена или количество)', uk: 'Скільки (ціна або кількість)', es: 'cuánto', pos: 'adverbs' },
    { en: 'start', ru: 'Начинать', uk: 'Починати', es: 'empezar', pos: 'verbs' },
    { en: 'cry', ru: 'Плакать', uk: 'Плакати', es: 'llorar', pos: 'verbs' },
    { en: 'cost', ru: 'Стоить', uk: 'Коштувати', es: 'costar', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', es: 'llamar', pos: 'verbs' },
    { en: 'wait', ru: 'Ждать', uk: 'Чекати', es: 'esperar', pos: 'verbs' },
    { en: 'usually', ru: 'Обычно', uk: 'Зазвичай', es: 'generalmente', pos: 'adverbs' },
    { en: 'now', ru: 'Сейчас', uk: 'Зараз', es: 'ahora', pos: 'adverbs' },
    { en: 'open', ru: 'Открывать', uk: 'Відкривати', es: 'abrir', pos: 'verbs' },
    { en: 'sign', ru: 'Подписывать', uk: 'Підписувати', es: 'firmar', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Відправляти', es: 'enviar', pos: 'verbs' },
    { en: 'want', ru: 'Хотеть', uk: 'Хотіти', es: 'querer', pos: 'verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', es: 'terminar', pos: 'verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', es: 'ver', pos: 'verbs' },
    { en: 'carry', ru: 'Носить (в руках)', uk: 'Носити (в руках)', es: 'llevar', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', es: 'revisar', pos: 'verbs' },
    { en: 'speak', ru: 'Говорить', uk: 'Говорити', es: 'hablar', pos: 'verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', es: 'mirar', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', es: 'pedir', pos: 'verbs' },
    { en: 'slowly', ru: 'Медленно', uk: 'Повільно', es: 'despacio', pos: 'adverbs' },
    { en: 'always', ru: 'Всегда', uk: 'Завжди', es: 'siempre', pos: 'adverbs' },
    { en: 'come', ru: 'Приходить', uk: 'Приходити', es: 'venir', pos: 'irregular_verbs' },
    { en: 'do', ru: 'Делать', uk: 'Робити', es: 'hacer', pos: 'irregular_verbs' },
    { en: 'get', ru: 'Получать; добираться', uk: 'Отримувати; діставатися', es: 'llegar; obtener', pos: 'irregular_verbs' },
    { en: 'keep', ru: 'Хранить; держать', uk: 'Зберігати; тримати', es: 'guardar; mantener', pos: 'irregular_verbs' },
    { en: 'leave', ru: 'Уходить; покидать', uk: 'Піти; залишати (місце)', es: 'irse', pos: 'irregular_verbs' },
    { en: 'meet', ru: 'Встречать (кого-л.)', uk: 'Зустрічати (когось)', es: 'encontrarse (con)', pos: 'irregular_verbs' },
    { en: 'put', ru: 'Класть', uk: 'Класти', es: 'poner', pos: 'irregular_verbs' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', es: 'puerta', pos: 'nouns' },
    { en: 'home', ru: 'Дом; домой', uk: 'Дім; додому', es: 'casa; a casa', pos: 'nouns' },
    { en: 'report', ru: 'Отчёт', uk: 'Звіт', es: 'informe', pos: 'nouns' },
    { en: 'exit', ru: 'Выход', uk: 'Вихід', es: 'salida', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', es: 'bolsa', pos: 'nouns' },
    { en: 'shop', ru: 'Магазин', uk: 'Магазин', es: 'tienda', pos: 'nouns' },
    { en: 'guest', ru: 'Гость', uk: 'Гість', es: 'invitado', pos: 'nouns' },
    { en: 'mail', ru: 'Почта', uk: 'Пошта', es: 'correo', pos: 'nouns' },
    { en: 'groceries', ru: 'Продукты (бакалея)', uk: 'Продукти (бакалія)', es: 'compra (víveres)', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча', uk: 'Зустріч', es: 'reunión', pos: 'nouns' },
    { en: 'luggage', ru: 'Багаж', uk: 'Багаж', es: 'equipaje', pos: 'nouns' },
    { en: 'way', ru: 'Путь; дорога', uk: 'Шлях; дорога', es: 'camino', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', es: 'cena', pos: 'nouns' },
    { en: 'bill', ru: 'Счёт (в ресторане)', uk: 'Рахунок (у ресторані)', es: 'cuenta', pos: 'nouns' },
    { en: 'cafe', ru: 'Кафе (заведение; не напиток «кофе»)', uk: 'Кафе (заклад; не напій «кава»)', es: 'café', pos: 'nouns' },
  ],
  7: [
    { en: 'i', ru: 'Я', uk: 'Я', es: 'yo', pos: 'nouns' },
    { en: 'he', ru: 'Он', uk: 'Він', es: 'él', pos: 'nouns' },
    { en: 'she', ru: 'Она', uk: 'Вона', es: 'ella', pos: 'nouns' },
    { en: 'we', ru: 'Мы', uk: 'Ми', es: 'nosotros', pos: 'nouns' },
    { en: 'they', ru: 'Они', uk: 'Вони', es: 'ellos', pos: 'nouns' },
    { en: 'my', ru: 'Мой (моя, моё)', uk: 'Мій (моя, моє)', es: 'mi', pos: 'adjectives' },
    { en: 'his', ru: 'Его', uk: 'Його', es: 'su', pos: 'adjectives' },
    { en: 'this', ru: 'Этот (эта, это)', uk: 'Цей (ця, це)', es: 'este', pos: 'adjectives' },
    { en: 'not', ru: 'Не', uk: 'Не', es: 'no', pos: 'nouns' },
    { en: 'do', ru: 'Делать (вспомогательный в вопросах и отрицании)', uk: 'Робити (допоміжне в запитаннях і запереченні)', es: 'hacer (auxiliar)', pos: 'verbs' },
    { en: 'does', ru: 'Форма do в вопросах (он, она, оно)', uk: 'Форма do у запитаннях (він, вона, воно)', es: 'hace (auxiliar)', pos: 'verbs' },
    { en: 'have', ru: 'Иметь (обладать)', uk: 'Мати (володіти)', es: 'tener', pos: 'verbs' },
    { en: 'has', ru: 'Имеет (форма have: он, она, оно)', uk: 'Має (форма «мати»: він, вона, воно)', es: 'tiene (tener)', pos: 'verbs' },
    { en: 'about', ru: 'О; про (насчёт)', uk: 'Про; щодо', es: 'sobre', pos: 'nouns' },
    { en: 'for', ru: 'Для', uk: 'Для', es: 'para', pos: 'nouns' },
    { en: 'with', ru: 'С; со (предлог «с»)', uk: 'З; із (прийменник «з»)', es: 'con', pos: 'nouns' },
    { en: 'and', ru: 'И', uk: 'І; та', es: 'y', pos: 'nouns' },
    { en: 'insurance', ru: 'Страховка', uk: 'Страховка', es: 'seguro', pos: 'nouns' },
    { en: 'driver', ru: 'Водитель', uk: 'Водій', es: 'conductor', pos: 'nouns' },
    { en: 'license', ru: 'Водительские права', uk: 'Посвідчення водія', es: 'permiso de conducir', pos: 'nouns' },
    { en: 'free', ru: 'Свободный (о времени)', uk: 'Вільний (про час)', es: 'libre', pos: 'adjectives' },
    { en: 'time', ru: 'Время', uk: 'Час', es: 'tiempo', pos: 'nouns' },
    { en: 'allergy', ru: 'Аллергия', uk: 'Алергія', es: 'alergia', pos: 'nouns' },
    { en: 'nut', ru: 'Орех (плод)', uk: 'Горіх (плід)', es: 'fruto seco', pos: 'nouns' },
    { en: 'reservation', ru: 'Бронь; резерв (столика, места)', uk: 'Бронь; резервування місця', es: 'reserva', pos: 'nouns' },
    { en: 'booking', ru: 'Бронирование (номер, билет, запись)', uk: 'Бронювання (номер, квиток, запис)', es: 'reserva', pos: 'nouns' },
    { en: 'lighter', ru: 'Зажигалка', uk: 'Запальничка', es: 'encendedor', pos: 'nouns' },
    { en: 'pass', ru: 'Пропуск', uk: 'Пропуск', es: 'pase', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные (деньги)', uk: 'Готівка', es: 'efectivo', pos: 'nouns' },
    { en: 'change', ru: 'Сдача', uk: 'Решта', es: 'cambio', pos: 'nouns' },
    { en: 'tablet', ru: 'Планшет', uk: 'Планшет', es: 'tableta', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядное устройство', uk: 'Зарядний пристрій', es: 'cargador', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', es: 'pasaporte', pos: 'nouns' },
    { en: 'menu', ru: 'Меню', uk: 'Меню', es: 'menú', pos: 'nouns' },
    { en: 'device', ru: 'Устройство', uk: 'Пристрій', es: 'dispositivo', pos: 'nouns' },
    { en: 'discount', ru: 'Скидка', uk: 'Знижка', es: 'descuento', pos: 'nouns' },
    { en: 'city', ru: 'Город', uk: 'Місто', es: 'ciudad', pos: 'nouns' },
    { en: 'cities', ru: 'Города', uk: 'Міста', es: 'ciudades', pos: 'nouns' },
    { en: 'map', ru: 'Карта', uk: 'Карта', es: 'mapa', pos: 'nouns' },
    { en: 'guide', ru: 'Путеводитель', uk: 'Путівник', es: 'guía', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', es: 'hotel', pos: 'nouns' },
    { en: 'Wi-Fi', ru: 'Wi-Fi', uk: 'Wi-Fi', es: 'wifi', pos: 'nouns' },
    { en: 'lunch', ru: 'Обед', uk: 'Обід', es: 'almuerzo', pos: 'nouns' },
    { en: 'break', ru: 'Перерыв', uk: 'Перерва', es: 'descanso', pos: 'nouns' },
    { en: 'spare', ru: 'Запасной', uk: 'Запасний', es: 'repuesto', pos: 'adjectives' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', es: 'llave', pos: 'nouns' },
    { en: 'appetite', ru: 'Аппетит', uk: 'Апетит', es: 'apetito', pos: 'nouns' },
    { en: 'international', ru: 'Международный', uk: 'Міжнародний', es: 'internacional', pos: 'adjectives' },
    { en: 'question', ru: 'Вопрос', uk: 'Питання', es: 'pregunta', pos: 'nouns' },
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', es: 'teléfono', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', es: 'dirección', pos: 'nouns' },
    { en: 'return', ru: 'Обратный (о билете)', uk: 'Зворотний (про квиток)', es: 'de vuelta', pos: 'adjectives' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'billete', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'billetes', pos: 'nouns' },
    { en: 'confirmation', ru: 'Подтверждение', uk: 'Підтвердження', es: 'confirmación', pos: 'nouns' },
    { en: 'power bank', ru: 'Внешний аккумулятор (power bank)', uk: 'Зовнішній акумулятор (павербанк)', es: 'batería externa', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', es: 'documento', pos: 'nouns' },
    { en: 'documents', ru: 'Документы', uk: 'Документи', es: 'documentos', pos: 'nouns' },
    { en: 'policy', ru: 'Политика (компании)', uk: 'Політика (компанії)', es: 'política (empresa)', pos: 'nouns' },
    {
      en: 'issue',
      ru: 'Спорный вопрос; пункт',
      uk: 'Спірне питання; пункт',
      es: 'asunto',
      pos: 'nouns',
      context: 'There is a serious ... with the payment system that we need to fix.',
    },
    { en: 'number', ru: 'Номер', uk: 'Номер', es: 'número', pos: 'nouns' },
    { en: 'all', ru: 'Все (целиком)', uk: 'Усі; все', es: 'todo', pos: 'adjectives' },
    { en: 'needed', ru: 'Нужный; необходимый', uk: 'Потрібний; необхідний', es: 'necesario', pos: 'adjectives' },
    { en: 'umbrella', ru: 'Зонт', uk: 'Парасоля', es: 'paraguas', pos: 'nouns' },
    { en: 'headache', ru: 'Головная боль', uk: 'Головний біль', es: 'dolor de cabeza', pos: 'nouns' },
    { en: 'pen', ru: 'Ручка', uk: 'Ручка', es: 'bolígrafo', pos: 'nouns' },
    { en: 'suitcase', ru: 'Чемодан', uk: 'Валіза', es: 'maleta', pos: 'nouns' },
    { en: 'bicycle', ru: 'Велосипед', uk: 'Велосипед', es: 'bicicleta', pos: 'nouns' },
    { en: 'dog', ru: 'Собака', uk: 'Собака', es: 'perro', pos: 'nouns' },
    { en: 'backpack', ru: 'Рюкзак', uk: 'Рюкзак', es: 'mochila', pos: 'nouns' },
    { en: 'plan', ru: 'План', uk: 'План', es: 'plan', pos: 'nouns' },
    { en: 'good', ru: 'Хороший', uk: 'Гарний', es: 'bueno', pos: 'adjectives' },
    { en: 'news', ru: 'Новости', uk: 'Новини', es: 'noticias', pos: 'nouns' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', es: 'café', pos: 'nouns' },
  ],
  8: [
    { en: 'on', ru: 'В / по (дни недели)', uk: 'У / по (дні тижня)', es: 'el / los + день', pos: 'adverbs' },
    { en: 'in', ru: 'В (месяцы, сезоны, части суток)', uk: 'У (місяці, пори року, частини доби)', es: 'en + месяц / сезон', pos: 'adverbs' },
    { en: 'at', ru: 'В / о (точное время, час)', uk: 'О / у (точний час, година)', es: 'a las + время', pos: 'adverbs' },
    { en: 'Monday', ru: 'Понедельник', uk: 'Понеділок', es: 'Lunes', pos: 'nouns' },
    { en: 'Tuesday', ru: 'Вторник', uk: 'Вівторок', es: 'Martes', pos: 'nouns' },
    { en: 'Wednesday', ru: 'Среда', uk: 'Середа', es: 'Miércoles', pos: 'nouns' },
    { en: 'Thursday', ru: 'Четвер', uk: 'Четвер', es: 'Jueves', pos: 'nouns' },
    { en: 'Friday', ru: 'Пятница', uk: "П'ятниця", es: 'Viernes', pos: 'nouns' },
    { en: 'Saturday', ru: 'Суббота', uk: 'Субота', es: 'Sábado', pos: 'nouns' },
    { en: 'Sunday', ru: 'Воскресенье', uk: 'Неділя', es: 'Domingo', pos: 'nouns' },
    { en: 'weekend', ru: 'Выходные', uk: 'Вихідні', es: 'fin de semana', pos: 'nouns' },
    { en: 'weekends', ru: 'Выходные (повторяющиеся)', uk: 'Вихідні (кілька разів)', es: 'fines de semana', pos: 'nouns' },
    { en: 'morning', ru: 'Утро', uk: 'Ранок', es: 'mañana (утро)', pos: 'nouns' },
    { en: 'noon', ru: 'Полдень', uk: 'Полудень', es: 'mediodía', pos: 'nouns' },
    { en: 'afternoon', ru: 'День (после полудня)', uk: 'Після полудня (друга половина дня)', es: 'tarde', pos: 'nouns' },
    { en: 'evening', ru: 'Вечер', uk: 'Вечір', es: 'tarde (вечер)', pos: 'nouns' },
    { en: 'night', ru: 'Ночь', uk: 'Ніч', es: 'noche', pos: 'nouns' },
    { en: 'midnight', ru: 'Полночь', uk: 'Північ', es: 'medianoche', pos: 'nouns' },
    { en: 'AM', ru: 'До полудня (утро)', uk: 'До полудня (ранок)', es: 'a. m.', pos: 'nouns' },
    { en: 'PM', ru: 'После полудня (день и вечер)', uk: 'Після полудня (день і вечір)', es: 'p. m.', pos: 'nouns' },
    { en: "o'clock", ru: 'Ровно (указание часа)', uk: 'Рівно (на годиннику)', es: 'en punto', pos: 'nouns' },
    { en: 'one', ru: 'Один', uk: 'Один', es: 'uno', pos: 'nouns' },
    { en: 'two', ru: 'Два', uk: 'Два', es: 'dos', pos: 'nouns' },
    { en: 'five', ru: 'Пять', uk: "П'ять", es: 'cinco', pos: 'nouns' },
    { en: 'six', ru: 'Шесть', uk: 'Шість', es: 'seis', pos: 'nouns' },
    { en: 'seven', ru: 'Семь', uk: 'Сім', es: 'siete', pos: 'nouns' },
    { en: 'eight', ru: 'Восемь', uk: 'Вісім', es: 'ocho', pos: 'nouns' },
    { en: 'nine', ru: 'Девять', uk: "Дев'ять", es: 'nueve', pos: 'nouns' },
    { en: 'ten', ru: 'Десять', uk: 'Десять', es: 'diez', pos: 'nouns' },
    { en: 'fifteen', ru: 'Пятнадцать', uk: "П'ятнадцять", es: 'quince', pos: 'nouns' },
    { en: 'thirty', ru: 'Тридцать', uk: 'Тридцять', es: 'treinta', pos: 'nouns' },
    { en: 'January', ru: 'Январь', uk: 'Січень', es: 'enero', pos: 'nouns' },
    { en: 'February', ru: 'Февраль', uk: 'Лютий', es: 'febrero', pos: 'nouns' },
    { en: 'March', ru: 'Март', uk: 'Березень', es: 'marzo', pos: 'nouns' },
    { en: 'April', ru: 'Апрель', uk: 'Квітень', es: 'abril', pos: 'nouns' },
    { en: 'May', ru: 'Май', uk: 'Травень', es: 'mayo', pos: 'nouns' },
    { en: 'June', ru: 'Июнь', uk: 'Червень', es: 'junio', pos: 'nouns' },
    { en: 'July', ru: 'Июль', uk: 'Липень', es: 'julio', pos: 'nouns' },
    { en: 'August', ru: 'Август', uk: 'Серпень', es: 'agosto', pos: 'nouns' },
    { en: 'September', ru: 'Сентябрь', uk: 'Вересень', es: 'septiembre', pos: 'nouns' },
    { en: 'October', ru: 'Октябрь', uk: 'Жовтень', es: 'octubre', pos: 'nouns' },
    { en: 'November', ru: 'Ноябрь', uk: 'Листопад', es: 'noviembre', pos: 'nouns' },
    { en: 'December', ru: 'Декабрь', uk: 'Грудень', es: 'diciembre', pos: 'nouns' },
    { en: 'spring', ru: 'Весна', uk: 'Весна', es: 'primavera', pos: 'nouns' },
    { en: 'summer', ru: 'Лето', uk: 'Літо', es: 'verano', pos: 'nouns' },
    { en: 'winter', ru: 'Зима', uk: 'Зима', es: 'invierno', pos: 'nouns' },
    { en: 'birthday', ru: 'День рождения', uk: 'День народження', es: 'cumpleaños', pos: 'nouns' },
    { en: 'vacation', ru: 'Отпуск', uk: 'Відпустка', es: 'vacaciones', pos: 'nouns' },
    { en: 'rent', ru: 'Аренда', uk: 'Оренда', es: 'alquiler', pos: 'nouns' },
    { en: 'gym', ru: 'Спортзал', uk: 'Спортзал', es: 'gimnasio', pos: 'nouns' },
    { en: 'train', ru: 'Поезд', uk: 'Потяг', es: 'tren', pos: 'nouns' },
    { en: 'park', ru: 'Парк', uk: 'Парк', es: 'parque', pos: 'nouns' },
    { en: 'sport', ru: 'Спорт', uk: 'Спорт', es: 'deporte', pos: 'nouns' },
    { en: 'do', ru: 'Делать (в do sport — заниматься)', uk: 'Робити (у do sport — займатися)', es: 'hacer', pos: 'verbs' },
    { en: 'visit', ru: 'Посещать', uk: 'Відвідувати', es: 'visitar', pos: 'verbs' },
    { en: 'visits', ru: 'Посещает (он, она)', uk: 'Відвідує (він, вона)', es: 'visita', pos: 'verbs' },
    { en: 'music', ru: 'Музыка', uk: 'Музика', es: 'música', pos: 'nouns' },
    { en: 'pizza', ru: 'Пицца', uk: 'Піца', es: 'pizza', pos: 'nouns' },
    { en: 'mother', ru: 'Мама', uk: 'Мама', es: 'madre', pos: 'nouns' },
    { en: 'tea', ru: 'Чай', uk: 'Чай', es: 'té', pos: 'nouns' },
    { en: 'arrive', ru: 'Прибывать', uk: 'Прибувати', es: 'llegar', pos: 'verbs' },
    { en: 'depart', ru: 'Отправляться', uk: 'Відправлятися', es: 'salir', pos: 'verbs' },
    { en: 'travel', ru: 'Путешествовать', uk: 'Подорожувати', es: 'viajar', pos: 'verbs' },
    { en: 'relax', ru: 'Отдыхать', uk: 'Відпочивати', es: 'relajarse', pos: 'verbs' },
    { en: 'class', ru: 'Занятие (урок)', uk: 'Заняття (урок)', es: 'clase', pos: 'nouns' },
    { en: 'classes', ru: 'Уроки (занятия)', uk: 'Заняття (уроки)', es: 'clases', pos: 'nouns' },
    { en: 'shower', ru: 'Душ', uk: 'Душ', es: 'ducha', pos: 'nouns' },
    { en: 'wake', ru: 'Просыпаться', uk: 'Прокидатися', es: 'despertarse', pos: 'irregular_verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', es: 'escribir', pos: 'irregular_verbs' },
    { en: 'think', ru: 'Думать', uk: 'Думати', es: 'pensar', pos: 'irregular_verbs' },
    { en: 'run', ru: 'Бегать', uk: 'Бігати', es: 'correr', pos: 'irregular_verbs' },
    { en: 'bring', ru: 'Приносить', uk: 'Приносити', es: 'traer', pos: 'irregular_verbs' },
  ],
  9: [
    { en: 'bed', ru: 'Кровать', uk: 'Ліжко', es: 'cama', pos: 'nouns' },
    { en: 'fridge', ru: 'Холодильник', uk: 'Холодильник', es: 'refrigerador', pos: 'nouns' },
    { en: 'lift', ru: 'Лифт', uk: 'Ліфт', es: 'ascensor', pos: 'nouns' },
    { en: 'street', ru: 'Улица', uk: 'Вулиця', es: 'calle', pos: 'nouns' },
    { en: 'towel', ru: 'Полотенце', uk: 'Рушник', es: 'toalla', pos: 'nouns' },
    { en: 'space', ru: 'Место (пространство)', uk: 'Місце (простір)', es: 'espacio', pos: 'nouns' },
    { en: 'parking lot', ru: 'Парковка', uk: 'Парковка', es: 'estacionamiento', pos: 'nouns' },
    { en: 'shelf', ru: 'Полка', uk: 'Полиця', es: 'estante', pos: 'nouns' },
    { en: 'shelves', ru: 'Полки', uk: 'Полиці', es: 'estantes', pos: 'nouns' },
    { en: 'district', ru: 'Район', uk: 'Район', es: 'distrito', pos: 'nouns' },
    { en: 'first aid kit', ru: 'Аптечка', uk: 'Аптечка', es: 'botiquín de primeros auxilios', pos: 'nouns' },
    { en: 'ice', ru: 'Лед', uk: 'Лід', es: 'hielo', pos: 'nouns' },
    { en: 'glass', ru: 'Стакан', uk: 'Склянка', es: 'vaso', pos: 'nouns' },
    { en: 'wall', ru: 'Стена', uk: 'Стіна', es: 'muro', pos: 'nouns' },
    { en: 'swimming pool', ru: 'Бассейн', uk: 'Басейн', es: 'piscina', pos: 'nouns' },
    { en: 'garden', ru: 'Сад', uk: 'Сад', es: 'jardín', pos: 'nouns' },
    { en: 'plate', ru: 'Тарелка', uk: 'Тарілка', es: 'plato', pos: 'nouns' },
    { en: 'living room', ru: 'Гостиная', uk: 'Вітальня', es: 'sala de estar', pos: 'nouns' },
    { en: 'information', ru: 'Информация', uk: 'Інформація', es: 'información', pos: 'nouns' },
    { en: 'apartment', ru: 'Квартира', uk: 'Квартира', es: 'departamento', pos: 'nouns' },
    { en: 'coffeemaker', ru: 'Кофемашина', uk: 'Кавомашина', es: 'cafetera', pos: 'nouns' },
    { en: 'desk', ru: 'Письменный стол', uk: 'Письмовий стіл', es: 'escritorio', pos: 'nouns' },
    { en: 'library', ru: 'Библиотека', uk: 'Бібліотека', es: 'biblioteca', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелек', uk: 'Гаманець', es: 'billetera', pos: 'nouns' },
    { en: 'cellphone charger', ru: 'Зарядка для телефона', uk: 'Зарядка для телефону', es: 'cargador de celular', pos: 'nouns' },
    { en: 'furniture', ru: 'Мебель', uk: 'Меблі', es: 'muebles', pos: 'nouns' },
    { en: 'supermarket', ru: 'Супермаркет', uk: 'Супермаркет', es: 'supermercado', pos: 'nouns' },
    { en: 'museum', ru: 'Музей', uk: 'Музей', es: 'museo', pos: 'nouns' },
    { en: 'link', ru: 'Ссылка', uk: 'Посилання', es: 'enlace', pos: 'nouns' },
    { en: 'email', ru: 'Электронное письмо', uk: 'Електронний лист', es: 'correo electrónico', pos: 'nouns' },
    { en: 'group', ru: 'Группа', uk: 'Група', es: 'grupo', pos: 'nouns' },
    { en: 'video', ru: 'Видео', uk: 'Відео', es: 'video', pos: 'nouns' },
    { en: 'profile', ru: 'Профиль', uk: 'Профіль', es: 'perfil', pos: 'nouns' },
    { en: 'house', ru: 'Дом', uk: 'Будинок', es: 'casa', pos: 'nouns' },
    { en: 'country', ru: 'Страна', uk: 'Країна', es: 'país', pos: 'nouns' },
    { en: 'countries', ru: 'Страны', uk: 'Країни', es: 'países', pos: 'nouns' },
    { en: 'any', ru: 'Любой / какой-нибудь', uk: 'Будь-який', es: 'cualquier', pos: 'adjectives' },
    { en: 'apple', ru: 'Яблоко', uk: 'Яблуко', es: 'manzana', pos: 'nouns' },
    { en: 'beautiful', ru: 'Красивый', uk: 'Гарний', es: 'hermoso', pos: 'adjectives' },
    { en: 'bedroom', ru: 'Спальня', uk: 'Спальня', es: 'dormitorio', pos: 'nouns' },
    { en: 'big', ru: 'Большой', uk: 'Великий', es: 'grande', pos: 'nouns' },
    { en: 'cafe', ru: 'Кафе (заведение; не напиток «кофе»)', uk: 'Кафе (заклад; не напій «кава»)', es: 'cafetería', pos: 'nouns' },
    { en: 'car', ru: 'Машина', uk: 'Машина', es: 'carro', pos: 'nouns' },
    { en: 'classroom', ru: 'Класс', uk: 'Класна кімната', es: 'aula', pos: 'nouns' },
    { en: 'clean', ru: 'Чистый', uk: 'Чистий', es: 'limpio', pos: 'adjectives' },
    { en: 'clock', ru: 'Часы', uk: 'Годинник', es: 'reloj', pos: 'nouns' },
    { en: 'dessert', ru: 'Десерт', uk: 'Десерт', es: 'postre', pos: 'nouns' },
    { en: 'famous', ru: 'Известный', uk: 'Відомий', es: 'famoso', pos: 'adjectives' },
    { en: 'film', ru: 'Фильм', uk: 'Фільм', es: 'película', pos: 'nouns' },
    { en: 'machine', ru: 'Машина (механизм)', uk: 'Машина (механізм)', es: 'máquina', pos: 'nouns' },
    { en: 'magazine', ru: 'Журнал', uk: 'Журнал', es: 'revista', pos: 'nouns' },
    { en: 'many', ru: 'Много', uk: 'Багато', es: 'muchos', pos: 'nouns' },
    { en: 'mirror', ru: 'Зеркало', uk: 'Дзеркало', es: 'espejo', pos: 'nouns' },
    { en: 'mountain', ru: 'Гора', uk: 'Гора', es: 'montaña', pos: 'nouns' },
    { en: 'new', ru: 'Новый', uk: 'Новий', es: 'nuevo', pos: 'nouns' },
    { en: 'note', ru: 'Записка', uk: 'Записка', es: 'nota', pos: 'nouns' },
    { en: 'old', ru: 'Старый', uk: 'Старий', es: 'viejo', pos: 'nouns' },
    { en: 'pen', ru: 'Ручка', uk: 'Ручка', es: 'bolígrafo', pos: 'nouns' },
    { en: 'pharmacy', ru: 'Аптека', uk: 'Аптека', es: 'farmacia', pos: 'nouns' },
    { en: 'photo', ru: 'Фото', uk: 'Фото', es: 'foto', pos: 'nouns' },
    { en: 'place', ru: 'Место', uk: 'Місце', es: 'lugar', pos: 'nouns' },
    { en: 'pocket', ru: 'Карман', uk: 'Кишеня', es: 'bolsillo', pos: 'nouns' },
    { en: 'pool', ru: 'Бассейн', uk: 'Басейн', es: 'piscina', pos: 'nouns' },
    { en: 'printer', ru: 'Принтер', uk: 'Принтер', es: 'impresora', pos: 'nouns' },
    { en: 'question', ru: 'Вопрос', uk: 'Питання', es: 'pregunta', pos: 'nouns' },
    { en: 'quiet', ru: 'Тихий', uk: 'Тихий', es: 'tranquilo', pos: 'nouns' },
    { en: 'sky', ru: 'Небо', uk: 'Небо', es: 'cielo', pos: 'nouns' },
    { en: 'some', ru: 'Некоторые', uk: 'Деякі', es: 'alguno', pos: 'nouns' },
    { en: 'star', ru: 'Звезда', uk: 'Зірка', es: 'estrella', pos: 'nouns' },
    { en: 'student', ru: 'Учащийся', uk: 'Студент', es: 'estudiante', pos: 'nouns' },
    { en: 'task', ru: 'Задача', uk: 'Завдання', es: 'tarea', pos: 'nouns' },
    { en: 'there', ru: 'Там', uk: 'Там', es: 'allá', pos: 'adverbs' },
    { en: 'toy', ru: 'Игрушка', uk: 'Іграшка', es: 'juguete', pos: 'nouns' },
    { en: 'tree', ru: 'Дерево', uk: 'Дерево', es: 'árbol', pos: 'nouns' },
    { en: 'useful', ru: 'Полезный', uk: 'Корисний', es: 'útil', pos: 'adjectives' },
    { en: 'window', ru: 'Окно', uk: 'Вікно', es: 'ventana', pos: 'nouns' },
  ],
  10: [
    { en: 'can', ru: 'Мочь / Уметь', uk: 'Могти / Вміти', es: 'poder', pos: 'verbs' },
    { en: 'must', ru: 'Должен / Обязан', uk: 'Повинен / Зобов\'язаний', es: 'deber', pos: 'verbs' },
    { en: "can't", ru: 'Нельзя / не могу', uk: 'Не можна / не можу', es: 'no poder', pos: 'verbs' },
    { en: "mustn't", ru: 'Нельзя (запрет)', uk: 'Не можна (заборона)', es: 'prohibido', pos: 'verbs' },
    { en: 'may', ru: 'Можно (разрешение)', uk: 'Можна (дозвіл)', es: 'poder (permiso)', pos: 'verbs' },
    { en: 'should', ru: 'Следует / стоило бы', uk: 'Слід / варто було б', es: 'debería', pos: 'verbs' },
    { en: 'could', ru: 'Мог бы / смог бы', uk: 'Міг би / зміг би', es: 'podría', pos: 'verbs' },
    { en: 'might', ru: 'Возможно (мало вероятно)', uk: 'Можливо', es: 'quizá', pos: 'verbs' },
    { en: 'would', ru: 'Бы (условное намерение)', uk: 'Би (умовний)', es: 'condicional (‑ía)', pos: 'verbs' },
    { en: 'will', ru: 'Буду / будет (будущее)', uk: 'У майбутньому (will)', es: 'futuro (‑rá)', pos: 'verbs' },
    { en: 'need', ru: 'Нужно (need to)', uk: 'Потрібно (need to)', es: 'necesitar', pos: 'verbs' },
    { en: 'translate', ru: 'Переводить', uk: 'Перекладати', es: 'traducir', pos: 'verbs' },
    { en: 'fix', ru: 'Починить', uk: 'Полагодити', es: 'arreglar', pos: 'verbs' },
    { en: 'explain', ru: 'Объяснять', uk: 'Пояснювати', es: 'explicar', pos: 'verbs' },
    { en: 'discuss', ru: 'Обсуждать', uk: 'Обговорювати', es: 'comentar', pos: 'verbs' },
    { en: 'repair', ru: 'Ремонтировать', uk: 'Ремонтувати', es: 'reparar', pos: 'verbs' },
    { en: 'save', ru: 'Экономить / Сохранять', uk: 'Економити / Зберігати', es: 'ahorrar / guardar', pos: 'verbs' },
    { en: 'protect', ru: 'Защищать', uk: 'Захищати', es: 'proteger', pos: 'verbs' },
    { en: 'organize', ru: 'Организовывать', uk: 'Організувати', es: 'organizar', pos: 'verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', es: 'terminar', pos: 'verbs' },
    { en: 'remember', ru: 'Помнить / Запомнить', uk: 'Пам\'ятати / Запам\'ятати', es: 'recordar', pos: 'verbs' },
    { en: 'answer', ru: 'Отвечать', uk: 'Відповідати', es: 'responder', pos: 'verbs' },
    { en: 'ride', ru: 'Ездить (на чём-то)', uk: 'Їздити (на чомусь)', es: 'montar (en bici, etc.)', pos: 'irregular_verbs' },
    { en: 'ask', ru: 'Спрашивать', uk: 'Питати', es: 'preguntar', pos: 'verbs' },
    { en: 'study', ru: 'Учиться / Изучать', uk: 'Вчитися / Вивчати', es: 'estudiar', pos: 'verbs' },
    { en: 'show', ru: 'Показывать', uk: 'Показувати', es: 'mostrar', pos: 'irregular_verbs' },
    { en: 'print', ru: 'Распечатывать', uk: 'Роздруковувати', es: 'imprimir', pos: 'verbs' },
    { en: 'document', ru: 'Документ', uk: 'Документ', es: 'documento', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', es: 'contraseña', pos: 'nouns' },
    { en: 'report', ru: 'Отчёт', uk: 'Звіт', es: 'informe', pos: 'nouns' },
    { en: 'luggage', ru: 'Багаж', uk: 'Багаж', es: 'equipaje', pos: 'nouns' },
    { en: 'computer', ru: 'Компьютер', uk: 'Комп\'ютер', es: 'ordenador', pos: 'nouns' },
    { en: 'energy', ru: 'Энергия', uk: 'Енергія', es: 'energía', pos: 'nouns' },
    { en: 'suit', ru: 'Костюм', uk: 'Костюм', es: 'traje', pos: 'nouns' },
    { en: 'medicine', ru: 'Лекарство', uk: 'Ліки', es: 'medicamento', pos: 'nouns' },
    { en: 'task', ru: 'Задание', uk: 'Завдання', es: 'tarea', pos: 'nouns' },
    { en: 'gift', ru: 'Подарок', uk: 'Подарунок', es: 'regalo', pos: 'nouns' },
    { en: 'email', ru: 'Электронное письмо', uk: 'Електронний лист', es: 'correo electrónico', pos: 'nouns' },
    { en: 'photo', ru: 'Фото', uk: 'Фото', es: 'foto', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'boleto', pos: 'nouns' },
    { en: 'project', ru: 'Проект', uk: 'Проект', es: 'proyecto', pos: 'nouns' },
    { en: 'bike', ru: 'Велосипед (разг.)', uk: 'Велосипед (розм.)', es: 'bicicleta', pos: 'nouns' },
    { en: 'question', ru: 'Вопрос', uk: 'Питання', es: 'pregunta', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', es: 'dirección', pos: 'nouns' },
    { en: 'taxi', ru: 'Такси', uk: 'Таксі', es: 'taxi', pos: 'nouns' },
    { en: 'holiday', ru: 'Праздник', uk: 'Свято', es: 'fiesta / día festivo', pos: 'nouns' },
    { en: 'nature', ru: 'Природа', uk: 'Природа', es: 'naturaleza', pos: 'nouns' },
    { en: 'rule', ru: 'Правило', uk: 'Правило', es: 'regla', pos: 'nouns' },
    { en: 'mask', ru: 'Маска', uk: 'Маска', es: 'máscara', pos: 'nouns' },
  ],
  11: [
    { en: 'past simple', ru: 'Прошедшее простое время', uk: 'Минулий простий час', es: 'pasado simple', pos: 'nouns' },
    { en: 'yesterday', ru: 'Вчера', uk: 'Вчора', es: 'ayer', pos: 'adverbs' },
    { en: 'last week', ru: 'На прошлой неделе', uk: 'Минулого тижня', es: 'la semana pasada', pos: 'adverbs' },
    { en: 'last month', ru: 'В прошлом месяце', uk: 'Минулого місяця', es: 'el mes pasado', pos: 'adverbs' },
    { en: 'ago', ru: 'Назад (тому)', uk: 'Тому (назад)', es: 'hace', pos: 'adverbs' },
    { en: 'this morning', ru: 'Сегодня утром', uk: 'Сьогодні вранці', es: 'esta mañana', pos: 'adverbs' },
    { en: 'morning', ru: 'Утро', uk: 'Ранок', es: 'mañana', pos: 'nouns' },
    { en: 'evening', ru: 'Вечер', uk: 'Вечір', es: 'tarde', pos: 'nouns' },
    { en: 'day', ru: 'День', uk: 'День', es: 'día', pos: 'nouns' },
    { en: 'hour', ru: 'Час (единица времени)', uk: 'Година', es: 'hora', pos: 'nouns' },
    { en: 'minute', ru: 'Минута', uk: 'Хвилина', es: 'minuto', pos: 'nouns' },
    { en: 'week', ru: 'Неделя', uk: 'Тиждень', es: 'semana', pos: 'nouns' },
    { en: 'month', ru: 'Месяц', uk: 'Місяць', es: 'mes', pos: 'nouns' },
    { en: 'last', ru: 'Последний (прошлый)', uk: 'Минулий / останній', es: 'pasado / último', pos: 'adjectives' },
    { en: 'Monday', ru: 'Понедельник', uk: 'Понеділок', es: 'Lunes', pos: 'nouns' },
    { en: 'Tuesday', ru: 'Вторник', uk: 'Вівторок', es: 'Martes', pos: 'nouns' },
    { en: 'Thursday', ru: 'Четвер', uk: 'Четвер', es: 'Jueves', pos: 'nouns' },
    { en: 'Friday', ru: 'Пятница', uk: 'П\'ятниця', es: 'Viernes', pos: 'nouns' },
    { en: 'Saturday', ru: 'Суббота', uk: 'Субота', es: 'Sábado', pos: 'nouns' },
    { en: 'Sunday', ru: 'Воскресенье', uk: 'Неділя', es: 'Domingo', pos: 'nouns' },
    { en: 'two', ru: 'Два', uk: 'Два', es: 'dos', pos: 'nouns' },
    { en: 'three', ru: 'Три', uk: 'Три', es: 'tres', pos: 'nouns' },
    { en: 'five', ru: 'Пять', uk: 'П\'ять', es: 'cinco', pos: 'nouns' },
    { en: 'ten', ru: 'Десять', uk: 'Десять', es: 'diez', pos: 'nouns' },
    { en: 'book', ru: 'Бронировать', uk: 'Бронювати', es: 'reservar', pos: 'verbs' },
    { en: 'visit', ru: 'Навещать / посещать', uk: 'Відвідувати', es: 'visitar', pos: 'verbs' },
    { en: 'paint', ru: 'Красить', uk: 'Фарбувати', es: 'pintar', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', es: 'comprobar', pos: 'verbs' },
    { en: 'park', ru: 'Парковаться', uk: 'Паркуватися', es: 'estacionar', pos: 'verbs' },
    { en: 'confirm', ru: 'Подтверждать', uk: 'Підтверджувати', es: 'confirmar', pos: 'verbs' },
    { en: 'upload', ru: 'Загружать (в сеть)', uk: 'Завантажувати (в мережу)', es: 'subir', pos: 'verbs' },
    { en: 'iron', ru: 'Гладить (одежду)', uk: 'Прасувати (одяг)', es: 'planchar', pos: 'verbs' },
    { en: 'deliver', ru: 'Доставлять', uk: 'Доставляти', es: 'entregar', pos: 'verbs' },
    { en: 'rent', ru: 'Арендовать', uk: 'Орендувати', es: 'alquilar', pos: 'verbs' },
    { en: 'wash', ru: 'Мыть / стирать', uk: 'Мити / прати', es: 'lavar', pos: 'verbs' },
    { en: 'post', ru: 'Отправлять (почтой)', uk: 'Надсилати (поштою)', es: 'enviar (por correo)', pos: 'verbs' },
    { en: 'cancel', ru: 'Отменять', uk: 'Скасовувати', es: 'cancelar', pos: 'verbs' },
    { en: 'miss', ru: 'Пропускать / скучать', uk: 'Пропускати / сумувати', es: 'perder / echar de menos', pos: 'verbs' },
    { en: 'lock', ru: 'Запирать (на замок)', uk: 'Замикати', es: 'cerrar con llave', pos: 'verbs' },
    { en: 'close', ru: 'Закрывать', uk: 'Закривати', es: 'cerrar', pos: 'verbs' },
    { en: 'move', ru: 'Передвигать / переезжать', uk: 'Пересувати / переїжджати', es: 'mover / mudarse', pos: 'verbs' },
    { en: 'return', ru: 'Возвращать', uk: 'Повертати', es: 'devolver', pos: 'verbs' },
    { en: 'water', ru: 'Поливать', uk: 'Поливати', es: 'regar', pos: 'verbs' },
    { en: 'attend', ru: 'Посещать (мероприятие)', uk: 'Відвідувати (захід)', es: 'asistir', pos: 'verbs' },
    { en: 'prepare', ru: 'Готовить / подготавливать', uk: 'Готувати / підготовлювати', es: 'preparar', pos: 'verbs' },
    { en: 'booked', ru: 'Забронировал(а)', uk: 'Забронював(ла)', es: 'reservó', pos: 'verbs' },
    { en: 'visited', ru: 'Посетил(а)', uk: 'Відвідав(ла)', es: 'visitó', pos: 'verbs' },
    { en: 'painted', ru: 'Покрасил(а)', uk: 'Пофарбував(ла)', es: 'pintó', pos: 'verbs' },
    { en: 'checked', ru: 'Проверил(а)', uk: 'Перевірив(ла)', es: 'comprobó', pos: 'verbs' },
    { en: 'parked', ru: 'Припарковал(а)', uk: 'Припаркував(ла)', es: 'estacionó', pos: 'verbs' },
    { en: 'confirmed', ru: 'Подтвердил(а)', uk: 'Підтвердив(ла)', es: 'confirmó', pos: 'verbs' },
    { en: 'uploaded', ru: 'Загрузил(а) (в сеть)', uk: 'Завантажив(ла) (в мережу)', es: 'subió', pos: 'verbs' },
    { en: 'ironed', ru: 'Погладил(а)', uk: 'Випрасував(ла)', es: 'planchó', pos: 'verbs' },
    { en: 'delivered', ru: 'Доставил(а)', uk: 'Доставив(ла)', es: 'entregó', pos: 'verbs' },
    { en: 'rented', ru: 'Арендовал(а)', uk: 'Орендував(ла)', es: 'alquiló', pos: 'verbs' },
    { en: 'washed', ru: 'Вымыл(а) / постирал(а)', uk: 'Вимив(ла) / випрала', es: 'lavó', pos: 'verbs' },
    { en: 'canceled', ru: 'Отменил(а)', uk: 'Скасував(ла)', es: 'canceló', pos: 'verbs' },
    { en: 'missed', ru: 'Пропустил(а)', uk: 'Пропустив(ла)', es: 'perdió', pos: 'verbs' },
    { en: 'locked', ru: 'Запер(ла) на замок', uk: 'Замкнув(ла)', es: 'cerró con llave', pos: 'verbs' },
    { en: 'closed', ru: 'Закрыл(а)', uk: 'Закрив(ла)', es: 'cerró', pos: 'verbs' },
    { en: 'moved', ru: 'Передвинул(а) / переехал(а)', uk: 'Пересунув(ла) / переїхав(ла)', es: 'movió / se mudó', pos: 'verbs' },
    { en: 'returned', ru: 'Вернул(а) / отдал(а) назад', uk: 'Повернув(ла)', es: 'devolvió', pos: 'verbs' },
    { en: 'watered', ru: 'Полил(а)', uk: 'Полив(ла)', es: 'regó', pos: 'verbs' },
    { en: 'attended', ru: 'Посетил(а) (мероприятие)', uk: 'Відвідав(ла) (захід)', es: 'asistió', pos: 'verbs' },
    { en: 'prepared', ru: 'Приготовил(а) / подготовил(а)', uk: 'Приготував(ла) / підготував(ла)', es: 'preparó', pos: 'verbs' },
    { en: 'cooked', ru: 'Приготовил(а) (еду)', uk: 'Приготував(ла) (їжу)', es: 'cocinó', pos: 'verbs' },
    { en: 'opened', ru: 'Открыл(а)', uk: 'Відкрив(ла)', es: 'abrió', pos: 'verbs' },
    { en: 'ordered', ru: 'Заказал(а)', uk: 'Замовив(ла)', es: 'pidió', pos: 'verbs' },
    { en: 'called', ru: 'Позвонил(а)', uk: 'Подзвонив(ла)', es: 'llamó', pos: 'verbs' },
    { en: 'answered', ru: 'Ответил(а)', uk: 'Відповів(ла)', es: 'respondió', pos: 'verbs' },
    { en: 'changed', ru: 'Поменял(а)', uk: 'Змінив(ла)', es: 'cambió', pos: 'verbs' },
    { en: 'charged', ru: 'Зарядил(а)', uk: 'Зарядив(ла)', es: 'cargó', pos: 'verbs' },
    { en: 'cleaned', ru: 'Почистил(а)', uk: 'Прибрав(ла)', es: 'limpió', pos: 'verbs' },
    { en: 'deleted', ru: 'Удалил(а)', uk: 'Видалив(ла)', es: 'eliminó', pos: 'verbs' },
    { en: 'discussed', ru: 'Обсудил(а)', uk: 'Обговорив(ла)', es: 'habló de', pos: 'verbs' },
    { en: 'finished', ru: 'Закончил(а)', uk: 'Закінчив(ла)', es: 'terminó', pos: 'verbs' },
    { en: 'fixed', ru: 'Починил(а)', uk: 'Відремонтував(ла)', es: 'arregló', pos: 'verbs' },
    { en: 'helped', ru: 'Помог(ла)', uk: 'Допоміг(ла)', es: 'ayudó', pos: 'verbs' },
    { en: 'mailed', ru: 'Отправил(а) почтой', uk: 'Надіслав(ла) поштою', es: 'envió por correo', pos: 'verbs' },
    { en: 'packed', ru: 'Упаковал(а)', uk: 'Упакував(ла)', es: 'empacó', pos: 'verbs' },
    { en: 'printed', ru: 'Распечатал(а)', uk: 'Роздрукував(ла)', es: 'imprimió', pos: 'verbs' },
    { en: 'saved', ru: 'Сохранил(а) / сэкономил(а)', uk: 'Зберіг(ла) / заощадив(ла)', es: 'guardó / ahorró', pos: 'verbs' },
    { en: 'turned', ru: 'Выключил(а) (с off) / повернул(а)', uk: 'Вимкнув(ла) (з off) / повернув(ла)', es: 'apagó / giró', pos: 'verbs' },
    { en: 'watched', ru: 'Посмотрел(а)', uk: 'Дивився / дивилась', es: 'vio', pos: 'verbs' },
    { en: 'brushed', ru: 'Почистил(а) щёткой', uk: 'Почистив(ла) щіткою', es: 'cepilló', pos: 'verbs' },
    { en: 'shirt', ru: 'Рубашка', uk: 'Сорочка', es: 'camisa', pos: 'nouns' },
    { en: 'shoe', ru: 'Обувь (туфля)', uk: 'Взуття (туфля)', es: 'zapato', pos: 'nouns' },
    { en: 'dish', ru: 'Блюдо', uk: 'Страва', es: 'plato', pos: 'nouns' },
    { en: 'dishes', ru: 'Блюда / посуда', uk: 'Страви / посуд', es: 'platos', pos: 'nouns' },
    { en: 'laptop', ru: 'Ноутбук', uk: 'Ноутбук', es: 'portátil', pos: 'nouns' },
    { en: 'battery', ru: 'Батарейка', uk: 'Батарейка', es: 'pila / batería', pos: 'nouns' },
    { en: 'batteries', ru: 'Батарейки', uk: 'Батарейки', es: 'pilas', pos: 'nouns' },
    { en: 'plant', ru: 'Растение', uk: 'Рослина', es: 'planta', pos: 'nouns' },
    { en: 'parcel', ru: 'Посылка', uk: 'Посилка', es: 'paquete', pos: 'nouns' },
    { en: 'lecture', ru: 'Лекция', uk: 'Лекція', es: 'conferencia', pos: 'nouns' },
    { en: 'suitcase', ru: 'Чемодан', uk: 'Валіза', es: 'maleta', pos: 'nouns' },
    { en: 'suitcases', ru: 'Чемоданы', uk: 'Валізи', es: 'maletas', pos: 'nouns' },
    { en: 'movie', ru: 'Фильм (разг.)', uk: 'Фільм (розм.)', es: 'película', pos: 'nouns' },
    { en: 'present', ru: 'Подарок', uk: 'Подарунок', es: 'regalo', pos: 'nouns' },
    { en: 'card', ru: 'Открытка / карточка', uk: 'Листівка / картка', es: 'tarjeta', pos: 'nouns' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', es: 'puerta', pos: 'nouns' },
    { en: 'dirty', ru: 'Грязный', uk: 'Брудний', es: 'sucio', pos: 'adjectives' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', es: 'mesa', pos: 'nouns' },
    { en: 'window', ru: 'Окно', uk: 'Вікно', es: 'ventana', pos: 'nouns' },
    { en: 'car', ru: 'Машина', uk: 'Машина', es: 'coche', pos: 'nouns' },
    { en: 'wall', ru: 'Стена', uk: 'Стіна', es: 'pared', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'billete', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'billetes', pos: 'nouns' },
    { en: 'friend', ru: 'Друг', uk: 'Друг', es: 'amigo', pos: 'nouns' },
    { en: 'friends', ru: 'Друзья', uk: 'Друзі', es: 'amigos', pos: 'nouns' },
    { en: 'project', ru: 'Проект', uk: 'Проєкт', es: 'proyecto', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', es: 'cena', pos: 'nouns' },
    { en: 'computer', ru: 'Компьютер', uk: 'Комп\'ютер', es: 'ordenador', pos: 'nouns' },
    { en: 'email', ru: 'Электронное письмо', uk: 'Електронний лист', es: 'correo electrónico', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', es: 'documento', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', es: 'contraseña', pos: 'nouns' },
    { en: 'message', ru: 'Сообщение', uk: 'Повідомлення', es: 'mensaje', pos: 'nouns' },
    { en: 'report', ru: 'Отчёт', uk: 'Звіт', es: 'informe', pos: 'nouns' },
    { en: 'order', ru: 'Заказ', uk: 'Замовлення', es: 'pedido', pos: 'nouns' },
    { en: 'item', ru: 'Товар (позиция)', uk: 'Товар (позиція)', es: 'artículo', pos: 'nouns' },
    { en: 'apartment', ru: 'Квартира', uk: 'Квартира', es: 'apartamento', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', es: 'hotel', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча', uk: 'Зустріч', es: 'reunión', pos: 'nouns' },
    { en: 'doctor', ru: 'Врач', uk: 'Лікар', es: 'médico', pos: 'nouns' },
    { en: 'work', ru: 'Работа', uk: 'Робота', es: 'trabajo', pos: 'nouns' },
    { en: 'shop', ru: 'Магазин', uk: 'Крамниця', es: 'tienda', pos: 'nouns' },
    { en: 'pizza', ru: 'Пицца', uk: 'Піца', es: 'pizza', pos: 'nouns' },
    { en: 'photos', ru: 'Фотографии', uk: 'Фотографії', es: 'fotos', pos: 'nouns' },
    { en: 'hair', ru: 'Волосы', uk: 'Волосся', es: 'pelo', pos: 'nouns' },
    { en: 'shelf', ru: 'Полка', uk: 'Полиця', es: 'estante', pos: 'nouns' },
    { en: 'shelves', ru: 'Полки', uk: 'Полиці', es: 'estantes', pos: 'nouns' },
    { en: 'plants', ru: 'Растения', uk: 'Рослини', es: 'plantas', pos: 'nouns' },
    { en: 'sister', ru: 'Сестра', uk: 'Сестра', es: 'hermana', pos: 'nouns' },
    { en: 'man', ru: 'Мужчина', uk: 'Чоловік', es: 'hombre', pos: 'nouns' },
    { en: 'woman', ru: 'Женщина', uk: 'Жінка', es: 'mujer', pos: 'nouns' },
    { en: 'printer', ru: 'Принтер', uk: 'Принтер', es: 'impresora', pos: 'nouns' },
    { en: 'good', ru: 'Хороший', uk: 'Гарний', es: 'bueno', pos: 'adjectives' },
    { en: 'new', ru: 'Новый', uk: 'Новий', es: 'nuevo', pos: 'adjectives' },
    { en: 'old', ru: 'Старый', uk: 'Старий', es: 'viejo', pos: 'adjectives' },
    { en: 'long', ru: 'Длинный', uk: 'Довгий', es: 'largo', pos: 'adjectives' },
    { en: 'white', ru: 'Белый', uk: 'Білий', es: 'blanco', pos: 'adjectives' },
    { en: 'difficult', ru: 'Сложный', uk: 'Складний', es: 'difícil', pos: 'adjectives' },
    { en: 'call', ru: 'Звонок', uk: 'Дзвінок', es: 'llamada', pos: 'nouns' },
    { en: 'days', ru: 'Дни', uk: 'Дні', es: 'días', pos: 'nouns' },
    { en: 'shoes', ru: 'Обувь', uk: 'Взуття', es: 'zapatos', pos: 'nouns' },
  ],
  12: [
    // Past Simple — неправильные формы (инфинитив → прошедшее)
    { en: 'ate', ru: 'есть → ate', uk: 'їсти → ate', es: 'comer → comió', pos: 'irregular_verbs' },
    { en: 'bought', ru: 'покупать → bought', uk: 'купувати → bought', es: 'comprar → compró', pos: 'irregular_verbs' },
    { en: 'brought', ru: 'приносить → brought', uk: 'приносити → brought', es: 'traer → trajo', pos: 'irregular_verbs' },
    { en: 'built', ru: 'строить → built', uk: 'будувати → built', es: 'construir → construyó', pos: 'irregular_verbs' },
    { en: 'came', ru: 'приходить → came', uk: 'приходити → came', es: 'venir → vino', pos: 'irregular_verbs' },
    { en: 'chose', ru: 'выбирать → chose', uk: 'вибирати → chose', es: 'elegir → eligió', pos: 'irregular_verbs' },
    { en: 'drank', ru: 'пить → drank', uk: 'пити → drank', es: 'beber → bebió', pos: 'irregular_verbs' },
    { en: 'felt', ru: 'чувствовать → felt', uk: 'відчувати → felt', es: 'sentir → sintió', pos: 'irregular_verbs' },
    { en: 'forgot', ru: 'забывать → forgot', uk: 'забувати → forgot', es: 'olvidar → olvidó', pos: 'irregular_verbs' },
    { en: 'found', ru: 'находить → found', uk: 'знаходити → found', es: 'encontrar → encontró', pos: 'irregular_verbs' },
    { en: 'gave', ru: 'давать → gave', uk: 'давати → gave', es: 'dar → dio', pos: 'irregular_verbs' },
    { en: 'got', ru: 'получать → got', uk: 'отримувати → got', es: 'obtener → obtuvo', pos: 'irregular_verbs' },
    { en: 'heard', ru: 'слышать → heard', uk: 'чути → heard', es: 'oír → oyó', pos: 'irregular_verbs' },
    { en: 'kept', ru: 'хранить → kept', uk: 'тримати / зберігати → kept', es: 'guardar → guardó', pos: 'irregular_verbs' },
    { en: 'knew', ru: 'знать → knew', uk: 'знати → knew', es: 'saber → supo', pos: 'irregular_verbs' },
    { en: 'left', ru: 'оставлять / уходить → left', uk: 'залишати / йти → left', es: 'dejar → dejó', pos: 'irregular_verbs' },
    { en: 'lost', ru: 'терять → lost', uk: 'губити / втрачати → lost', es: 'perder → perdió', pos: 'irregular_verbs' },
    { en: 'made', ru: 'делать / готовить → made', uk: 'робити / готувати → made', es: 'hacer → hizo', pos: 'irregular_verbs' },
    { en: 'met', ru: 'встречать → met', uk: 'зустрічати → met', es: 'conocer → conoció', pos: 'irregular_verbs' },
    { en: 'said', ru: 'сказать → said', uk: 'сказати → said', es: 'decir → dijo', pos: 'irregular_verbs' },
    { en: 'saw', ru: 'видеть → saw', uk: 'бачити → saw', es: 'ver → vio', pos: 'irregular_verbs' },
    { en: 'sent', ru: 'отправлять → sent', uk: 'надсилати → sent', es: 'enviar → envió', pos: 'irregular_verbs' },
    { en: 'slept', ru: 'спать → slept', uk: 'спати → slept', es: 'dormir → durmió', pos: 'irregular_verbs' },
    { en: 'sold', ru: 'продавать → sold', uk: 'продавати → sold', es: 'vender → vendió', pos: 'irregular_verbs' },
    { en: 'spent', ru: 'тратить → spent', uk: 'витрачати → spent', es: 'gastar → gastó', pos: 'irregular_verbs' },
    { en: 'told', ru: 'рассказывать → told', uk: 'розповідати → told', es: 'contar → contó', pos: 'irregular_verbs' },
    { en: 'took', ru: 'брать → took', uk: 'брати → took', es: 'tomar → tomó', pos: 'irregular_verbs' },
    { en: 'understood', ru: 'понимать → understood', uk: 'розуміти → understood', es: 'entender → entendió', pos: 'irregular_verbs' },
    { en: 'went', ru: 'идти → went', uk: 'йти → went', es: 'ir → fue', pos: 'irregular_verbs' },
    { en: 'wore', ru: 'носить (одежду) → wore', uk: 'носити (одяг) → wore', es: 'llevar (puesto) → llevó', pos: 'irregular_verbs' },
    { en: 'wrote', ru: 'писать → wrote', uk: 'писати → wrote', es: 'escribir → escribió', pos: 'irregular_verbs' },
    // Словарь урока (LESSON_12_VOCABULARY)
    { en: 'apple', ru: 'Яблоко', uk: 'Яблуко', es: 'manzana', pos: 'nouns' },
    { en: 'boat', ru: 'Лодка', uk: 'Човен', es: 'barco', pos: 'nouns' },
    { en: 'box', ru: 'Ящик / коробка', uk: 'Ящик / коробка', es: 'caja', pos: 'nouns' },
    { en: 'boxes', ru: 'Ящики / коробки', uk: 'Ящики / коробки', es: 'cajas', pos: 'nouns' },
    { en: 'bridge', ru: 'Мост', uk: 'Міст', es: 'puente', pos: 'nouns' },
    { en: 'fence', ru: 'Забор', uk: 'Паркан', es: 'valla', pos: 'nouns' },
    { en: 'glove', ru: 'Перчатка', uk: 'Рукавичка', es: 'guante', pos: 'nouns' },
    { en: 'headphones', ru: 'Наушники', uk: 'Навушники', es: 'auriculares', pos: 'nouns' },
    { en: 'jacket', ru: 'Куртка', uk: 'Куртка', es: 'chaqueta', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', es: 'llave', pos: 'nouns' },
    { en: 'letter', ru: 'Письмо', uk: 'Лист', es: 'carta', pos: 'nouns' },
    { en: 'neighbor', ru: 'Сосед', uk: 'Сусід', es: 'vecino', pos: 'nouns' },
    { en: 'picture', ru: 'Картина / фото', uk: 'Картина / фото', es: 'cuadro', pos: 'nouns' },
    { en: 'sofa', ru: 'Диван', uk: 'Диван', es: 'sofá', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелёк', uk: 'Гаманець', es: 'cartera', pos: 'nouns' },
    { en: 'article', ru: 'Статья', uk: 'Стаття', es: 'artículo', pos: 'nouns' },
    { en: 'story', ru: 'История / рассказ', uk: 'Історія / розповідь', es: 'historia', pos: 'nouns' },
    { en: 'stories', ru: 'Истории / рассказы', uk: 'Історії / розповіді', es: 'historias', pos: 'nouns' },
    { en: 'song', ru: 'Песня', uk: 'Пісня', es: 'canción', pos: 'nouns' },
    { en: 'fruit', ru: 'Фрукт / фрукты', uk: 'Фрукт / фрукти', es: 'fruta', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', es: 'documento', pos: 'nouns' },
    { en: 'blue', ru: 'Синий / голубой', uk: 'Синій / блакитний', es: 'azul', pos: 'adjectives' },
    { en: 'comfortable', ru: 'Удобный', uk: 'Зручний', es: 'cómodo', pos: 'adjectives' },
    { en: 'fresh', ru: 'Свежий', uk: 'Свіжий', es: 'fresco', pos: 'adjectives' },
    { en: 'funny', ru: 'Смешной / забавный', uk: 'Смішний / кумедний', es: 'divertido', pos: 'adjectives' },
    { en: 'heavy', ru: 'Тяжёлый', uk: 'Важкий', es: 'pesado', pos: 'adjectives' },
    { en: 'hot', ru: 'Горячий', uk: 'Гарячий', es: 'caliente', pos: 'adjectives' },
    { en: 'interesting', ru: 'Интересный', uk: 'Цікавий', es: 'interesante', pos: 'adjectives' },
    { en: 'rare', ru: 'Редкий', uk: 'Рідкісний', es: 'raro', pos: 'adjectives' },
    { en: 'red', ru: 'Красный', uk: 'Червоний', es: 'rojo', pos: 'adjectives' },
    { en: 'short', ru: 'Короткий', uk: 'Короткий', es: 'corto', pos: 'adjectives' },
    { en: 'soft', ru: 'Мягкий', uk: "М'який", es: 'suave', pos: 'adjectives' },
    { en: 'strange', ru: 'Странный', uk: 'Дивний', es: 'extraño', pos: 'adjectives' },
    { en: 'sweet', ru: 'Сладкий', uk: 'Солодкий', es: 'dulce', pos: 'adjectives' },
    { en: 'useful', ru: 'Полезный', uk: 'Корисний', es: 'útil', pos: 'adjectives' },
    { en: 'wooden', ru: 'Деревянный', uk: "Дерев'яний", es: 'de madera', pos: 'adjectives' },
    { en: 'warm', ru: 'Тёплый', uk: 'Теплий', es: 'cálido', pos: 'adjectives' },
    { en: 'long', ru: 'Длинный', uk: 'Довгий', es: 'largo', pos: 'adjectives' },
    { en: 'tired', ru: 'Усталый', uk: 'Втомлений', es: 'cansado', pos: 'adjectives' },
    { en: 'noisy', ru: 'Шумный', uk: 'Шумний', es: 'ruidoso', pos: 'adjectives' },
    // Лексика из фраз урока 12 (не в официальном VOCABULARY)
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', es: 'bolsa', pos: 'nouns' },
    { en: 'bird', ru: 'Птица', uk: 'Птах', es: 'pájaro', pos: 'nouns' },
    { en: 'bread', ru: 'Хлеб', uk: 'Хліб', es: 'pan', pos: 'nouns' },
    { en: 'juice', ru: 'Сок', uk: 'Сік', es: 'zumo', pos: 'nouns' },
    { en: 'text', ru: 'Текст', uk: 'Текст', es: 'mensaje', pos: 'nouns' },
    { en: 'topic', ru: 'Тема', uk: 'Тема', es: 'tema', pos: 'nouns' },
    { en: 'wednesday', ru: 'Среда', uk: 'Середа', es: 'miércoles', pos: 'nouns' },
    { en: 'words', ru: 'Слова', uk: 'Слова', es: 'palabras', pos: 'nouns' },
    { en: 'tasty', ru: 'Вкусный', uk: 'Смачний', es: 'sabroso', pos: 'adjectives' },
  ],
  13: [
    { en: 'will', ru: 'Буду / будешь / будет… (will)', uk: 'Буду / будеш / буде… (will)', es: 'will (futuro)', pos: 'adverbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', es: 'llamar', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', es: 'ayudar', pos: 'verbs' },
    { en: 'come', ru: 'Приходить', uk: 'Приходити', es: 'venir', pos: 'irregular_verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', es: 'encontrar', pos: 'irregular_verbs' },
    { en: 'choose', ru: 'Выбирать', uk: 'Вибирати', es: 'elegir', pos: 'irregular_verbs' },
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', es: 'entender', pos: 'irregular_verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', es: 'comprar', pos: 'irregular_verbs' },
    { en: 'sell', ru: 'Продавать', uk: 'Продавати', es: 'vender', pos: 'irregular_verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Надсилати', es: 'enviar', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', es: 'cocinar', pos: 'verbs' },
    { en: 'wear', ru: 'Носить / надевать', uk: 'Носити / надягати', es: 'llevar / ponerse', pos: 'irregular_verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', es: 'leer', pos: 'irregular_verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', es: 'escribir', pos: 'irregular_verbs' },
    { en: 'pay', ru: 'Платить', uk: 'Платити', es: 'pagar', pos: 'irregular_verbs' },
    { en: 'leave', ru: 'Уходить / оставлять', uk: 'Йти / залишати', es: 'salir / dejar', pos: 'irregular_verbs' },
    { en: 'feel', ru: 'Чувствовать', uk: 'Відчувати', es: 'sentir', pos: 'irregular_verbs' },
    { en: 'sing', ru: 'Петь', uk: 'Співати', es: 'cantar', pos: 'verbs' },
    { en: 'close', ru: 'Закрывать', uk: 'Зачиняти', es: 'cerrar', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', es: 'olvidar', pos: 'irregular_verbs' },
    { en: 'tomorrow', ru: 'Завтра', uk: 'Завтра', es: 'mañana', pos: 'adverbs' },
    { en: 'soon', ru: 'Скоро', uk: 'Скоро', es: 'pronto', pos: 'adverbs' },
    { en: 'later', ru: 'Позже', uk: 'Пізніше', es: 'después / más tarde', pos: 'adverbs' },
    { en: 'tonight', ru: 'Сегодня вечером / ночью', uk: 'Сьогодні ввечері / вночі', es: 'esta noche', pos: 'adverbs' },
    { en: 'next week', ru: 'На следующей неделе', uk: 'Наступного тижня', es: 'la semana que viene', pos: 'adverbs' },
    { en: 'next month', ru: 'В следующем месяце', uk: 'Наступного місяця', es: 'el mes que viene', pos: 'adverbs' },
    { en: 'in two days', ru: 'Через два дня', uk: 'Через два дні', es: 'en dos días', pos: 'adverbs' },
    { en: 'in ten minutes', ru: 'Через десять минут', uk: 'Через десять хвилин', es: 'en diez minutos', pos: 'adverbs' },
    { en: 'food', ru: 'Еда', uk: 'їжа', es: 'comida', pos: 'nouns' },
    { en: 'soup', ru: 'Суп', uk: 'Суп', es: 'sopa', pos: 'nouns' },
    { en: 'glasses', ru: 'Очки', uk: 'Окуляри', es: 'gafas / lentes', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', es: 'efectivo', pos: 'nouns' },
    { en: 'plan', ru: 'План', uk: 'План', es: 'plan', pos: 'nouns' },
    { en: 'rent', ru: 'Аренда', uk: 'Оренда', es: 'alquiler', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядное устройство', uk: 'Зарядний пристрій', es: 'cargador', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', es: 'cena', pos: 'nouns' },
    { en: 'better', ru: 'Лучше', uk: 'Краще', es: 'mejor', pos: 'adjectives' },
    { en: 'early', ru: 'Рано', uk: 'Рано', es: 'temprano', pos: 'adverbs' },
  ],
  14: [
    { en: 'cheaper', ru: 'Дешевле · более дешёвый', uk: 'Дешевший', es: 'más barato', pos: 'adjectives' },
    { en: 'more expensive', ru: 'Дороже · более дорогой', uk: 'Дорожчий', es: 'más caro', pos: 'adjectives' },
    { en: 'better', ru: 'Лучше (сравн. от good)', uk: 'Краще (від good)', es: 'mejor', pos: 'adjectives' },
    { en: 'worse', ru: 'Хуже (сравн. от bad)', uk: 'Гірше (від bad)', es: 'peor', pos: 'adjectives' },
    { en: 'happier', ru: 'Счастливее', uk: 'Щасливіший', es: 'más feliz', pos: 'adjectives' },
    { en: 'more serious', ru: 'Серьёзнее', uk: 'Серйозніший', es: 'más serio', pos: 'adjectives' },
    { en: 'faster', ru: 'Быстрее', uk: 'Швидший', es: 'más rápido', pos: 'adjectives' },
    { en: 'slower', ru: 'Медленнее', uk: 'Повільніший', es: 'más lento', pos: 'adjectives' },
    { en: 'easier', ru: 'Проще · легче', uk: 'Простіший · легший', es: 'más fácil', pos: 'adjectives' },
    { en: 'harder', ru: 'Сложнее · труднее', uk: 'Складніший', es: 'más difícil', pos: 'adjectives' },
    { en: 'more interesting', ru: 'Интереснее', uk: 'Цікавіший', es: 'más interesante', pos: 'adjectives' },
    { en: 'more important', ru: 'Важнее', uk: 'Важливіший', es: 'más importante', pos: 'adjectives' },
    { en: 'safer', ru: 'Безопаснее', uk: 'Безпечніший', es: 'más seguro', pos: 'adjectives' },
    { en: 'more dangerous', ru: 'Опаснее', uk: 'Небезпечніший', es: 'más peligroso', pos: 'adjectives' },
    { en: 'colder', ru: 'Холоднее', uk: 'Холодніший', es: 'más frío', pos: 'adjectives' },
    { en: 'warmer', ru: 'Теплее', uk: 'Тепліший', es: 'más cálido', pos: 'adjectives' },
    { en: 'lighter', ru: 'Легче (по весу)', uk: 'Легший (за вагою)', es: 'más ligero', pos: 'adjectives' },
    { en: 'heavier', ru: 'Тяжелее', uk: 'Важчий', es: 'más pesado', pos: 'adjectives' },
    { en: 'newer', ru: 'Новее', uk: 'Новіший', es: 'más nuevo', pos: 'adjectives' },
    { en: 'older', ru: 'Старее', uk: 'Старший', es: 'más viejo', pos: 'adjectives' },
    { en: 'shorter', ru: 'Короче', uk: 'Коротший', es: 'más corto', pos: 'adjectives' },
    { en: 'longer', ru: 'Длиннее', uk: 'Довший', es: 'más largo', pos: 'adjectives' },
    { en: 'clearer', ru: 'Понятнее · яснее', uk: 'Зрозуміліший', es: 'más claro', pos: 'adjectives' },
    { en: 'more confusing', ru: 'Более запутанный', uk: 'Більш заплутаний', es: 'más confuso', pos: 'adjectives' },
    { en: 'the best', ru: 'Лучший · самый лучший', uk: 'Найкращий', es: 'el mejor / la mejor', pos: 'adjectives' },
    { en: 'the worst', ru: 'Худший · самый плохой', uk: 'Найгірший', es: 'el peor / la peor', pos: 'adjectives' },
    { en: 'the cheapest', ru: 'Самый дешёвый', uk: 'Найдешевший', es: 'el más barato', pos: 'adjectives' },
    { en: 'the most expensive', ru: 'Самый дорогой', uk: 'Найдорожчий', es: 'el más caro', pos: 'adjectives' },
    { en: 'the fastest', ru: 'Самый быстрый', uk: 'Найшвидший', es: 'el más rápido', pos: 'adjectives' },
    { en: 'the slowest', ru: 'Самый медленный', uk: 'Найповільніший', es: 'el más lento', pos: 'adjectives' },
    { en: 'the easiest', ru: 'Самый простой', uk: 'Найпростіший', es: 'el más fácil', pos: 'adjectives' },
    { en: 'the hardest', ru: 'Самый сложный', uk: 'Найскладніший', es: 'el más difícil', pos: 'adjectives' },
    { en: 'the safest', ru: 'Самый безопасный', uk: 'Найбезпечніший', es: 'el más seguro', pos: 'adjectives' },
    { en: 'the most dangerous', ru: 'Самый опасный', uk: 'Найнебезпечніший', es: 'el más peligroso', pos: 'adjectives' },
    { en: 'much', ru: 'Намного (усилитель)', uk: 'Набагато (підсилювач)', es: 'mucho / mucho más', pos: 'adverbs' },
    { en: 'more', ru: 'Более (сравнение)', uk: 'Більш (порівняння)', es: 'más (comparativo)', pos: 'adverbs' },
    { en: 'option', ru: 'Вариант', uk: 'Варіант', es: 'opción', pos: 'nouns' },
    { en: 'way', ru: 'Способ · путь', uk: 'Спосіб · шлях', es: 'forma / camino', pos: 'nouns' },
    { en: 'job', ru: 'Работа', uk: 'Робота', es: 'trabajo', pos: 'nouns' },
    { en: 'place', ru: 'Место', uk: 'Місце', es: 'lugar', pos: 'nouns' },
    { en: 'room', ru: 'Комната', uk: 'Кімната', es: 'habitación', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', es: 'bolsa', pos: 'nouns' },
    { en: 'app', ru: 'Приложение', uk: 'Застосунок', es: 'aplicación / app', pos: 'nouns' },
    { en: 'lesson', ru: 'Урок', uk: 'Урок', es: 'lección', pos: 'nouns' },
    { en: 'answer', ru: 'Ответ', uk: 'Відповідь', es: 'respuesta', pos: 'nouns' },
    { en: 'looks', ru: 'Выглядит', uk: 'Виглядає', es: 'parece', pos: 'verbs' },
    { en: 'feels', ru: 'Чувствует себя', uk: 'Почувається', es: 'se siente', pos: 'verbs' },
    { en: 'works', ru: 'Работает', uk: 'Працює', es: 'trabaja', pos: 'verbs' },
  ],
  15: [
    { en: 'my', ru: 'мой; моя; моё (перед сущ.)', uk: 'мій; моя; моє (перед ім.)', es: 'mi / mis', pos: 'pronouns' },
    { en: 'mine', ru: 'мой; моя; моё (самост.)', uk: 'мій; моя; моє (самост.)', es: 'mío / mía / míos / mías', pos: 'pronouns' },
    { en: 'your', ru: 'твой; ваш (перед сущ.)', uk: 'твій; ваш (перед ім.)', es: 'tu / tus; su / sus (usted)', pos: 'pronouns' },
    { en: 'yours', ru: 'твоё; ваше (самост.)', uk: 'твоє; ваше (самост.)', es: 'tuyo / tuya / tuyos / tuyas', pos: 'pronouns' },
    { en: 'his', ru: 'его (перед сущ. и самост.)', uk: 'його (перед ім. і самост.)', es: 'su; suyo / suya (él)', pos: 'pronouns' },
    { en: 'her', ru: 'её (перед сущ.)', uk: 'її (перед ім.)', es: 'su (ella)', pos: 'pronouns' },
    { en: 'hers', ru: 'её (самост.)', uk: 'її (самост.)', es: 'suyo / suya (ella)', pos: 'pronouns' },
    { en: 'our', ru: 'наш; наша; наше (перед сущ.)', uk: 'наш; наша; наше (перед ім.)', es: 'nuestro / nuestra / nuestros / nuestras', pos: 'pronouns' },
    { en: 'ours', ru: 'наше; наши (самост.)', uk: 'наше; наші (самост.)', es: 'el nuestro / la nuestra', pos: 'pronouns' },
    { en: 'their', ru: 'их (перед сущ.)', uk: 'їхній; їхня (перед ім.)', es: 'su (ellos / ellas)', pos: 'pronouns' },
    { en: 'theirs', ru: 'их (самост.)', uk: 'їхній; їхнє (самост.)', es: 'suyo / suya (ellos)', pos: 'pronouns' },
    { en: 'this', ru: 'этот; эта; это', uk: 'цей; ця; це', es: 'este / esta / esto', pos: 'pronouns' },
    { en: 'these', ru: 'эти', uk: 'ці', es: 'estos / estas', pos: 'pronouns' },
    { en: 'not', ru: 'не (с is / are)', uk: 'не (з is / are)', es: 'no', pos: 'adverbs' },
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', es: 'teléfono', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', es: 'llave', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'billete / entrada', pos: 'nouns' },
    { en: 'room', ru: 'Комната', uk: 'Кімната', es: 'habitación', pos: 'nouns' },
    { en: 'car', ru: 'Машина · автомобиль', uk: 'Машина · автомобіль', es: 'coche / carro / auto', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядное устройство', uk: 'Зарядний пристрій', es: 'cargador', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', es: 'pasaporte', pos: 'nouns' },
    { en: 'documents', ru: 'Документы', uk: 'Документи', es: 'documentos', pos: 'nouns' },
    { en: 'messages', ru: 'Сообщения', uk: 'Повідомлення', es: 'mensajes', pos: 'nouns' },
    { en: 'books', ru: 'Книги', uk: 'Книги', es: 'libros', pos: 'nouns' },
    { en: 'keys', ru: 'Ключи', uk: 'Ключі', es: 'llaves', pos: 'nouns' },
    { en: 'bags', ru: 'Сумки', uk: 'Сумки', es: 'bolsas', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'billetes / entradas', pos: 'nouns' },
    { en: 'answer', ru: 'Ответ', uk: 'Відповідь', es: 'respuesta', pos: 'nouns' },
    { en: 'question', ru: 'Вопрос', uk: 'Питання', es: 'pregunta', pos: 'nouns' },
    { en: 'outside', ru: 'Снаружи · на улице', uk: 'Надворі · зовні', es: 'afuera', pos: 'adverbs' },
    { en: 'ready', ru: 'Готовый', uk: 'Готовий', es: 'listo', pos: 'adjectives' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', es: 'aquí', pos: 'adverbs' },
  ],
  16: [
    { en: 'wake up', ru: 'Просыпаться', uk: 'Прокидатися', es: 'despertarse', pos: 'verbs' },
    { en: 'get up', ru: 'Вставать', uk: 'Вставати', es: 'levantarse', pos: 'verbs' },
    { en: 'put on', ru: 'Надевать', uk: 'Надягати', es: 'ponerse', pos: 'verbs' },
    { en: 'take off', ru: 'Снимать (одежду)', uk: 'Знімати (одяг)', es: 'quitarse', pos: 'verbs' },
    { en: 'turn on', ru: 'Включать', uk: 'Вмикати', es: 'encender / poner', pos: 'verbs' },
    { en: 'turn off', ru: 'Выключать', uk: 'Вимикати', es: 'apagar', pos: 'verbs' },
    { en: 'look for', ru: 'Искать', uk: 'Шукати', es: 'buscar', pos: 'verbs' },
    { en: 'clean up', ru: 'Убирать · наводить порядок', uk: 'Прибирати · наводити лад', es: 'limpiar / ordenar', pos: 'verbs' },
    { en: 'throw away', ru: 'Выбрасывать', uk: 'Викидати', es: 'tirar / botar', pos: 'verbs' },
    { en: 'give back', ru: 'Возвращать (отдавать обратно)', uk: 'Повертати (віддавати назад)', es: 'devolver', pos: 'verbs' },
    { en: 'find out', ru: 'Выяснять · узнавать', uk: "З'ясовувати · дізнаватися", es: 'averiguar / enterarse', pos: 'verbs' },
    { en: 'go back', ru: 'Возвращаться назад', uk: 'Повертатися назад', es: 'volver / regresar', pos: 'verbs' },
    { en: 'woke up', ru: 'Проснулся / проснулась', uk: 'Прокинувся / прокинулася', es: 'se despertó', pos: 'irregular_verbs' },
    { en: 'got up', ru: 'Встал / встала', uk: 'Встав / встала', es: 'se levantó', pos: 'irregular_verbs' },
    { en: 'put on', ru: 'Надел / надела (прош.)', uk: 'Надягнув / надягнула', es: 'se puso', pos: 'irregular_verbs' },
    { en: 'took off', ru: 'Снял / сняла', uk: 'Зняв / зняла', es: 'se quitó', pos: 'irregular_verbs' },
    { en: 'found out', ru: 'Выяснил / выяснила', uk: "З'ясував / з'ясувала", es: 'averiguó', pos: 'irregular_verbs' },
    { en: 'gave back', ru: 'Вернул / вернула', uk: 'Повернув / повернула', es: 'devolvió', pos: 'irregular_verbs' },
    { en: 'lights', ru: 'Свет · лампы', uk: 'Світло · лампи', es: 'luces', pos: 'nouns' },
    { en: 'shoes', ru: 'Обувь · туфли', uk: 'Взуття · туфлі', es: 'zapatos', pos: 'nouns' },
    { en: 'papers', ru: 'Бумаги', uk: 'Папери', es: 'papeles', pos: 'nouns' },
    { en: 'facts', ru: 'Факты', uk: 'Факти', es: 'hechos', pos: 'nouns' },
    { en: 'jacket', ru: 'Куртка', uk: 'Куртка', es: 'chaqueta', pos: 'nouns' },
    { en: 'problems', ru: 'Проблемы', uk: 'Проблеми', es: 'problemas', pos: 'nouns' },
    { en: 'noon', ru: 'Полдень', uk: 'Полудень', es: 'mediodía', pos: 'nouns' },
    { en: 'early', ru: 'Рано', uk: 'Рано', es: 'temprano', pos: 'adverbs' },
    { en: 'late', ru: 'Поздно', uk: 'Пізно', es: 'tarde', pos: 'adverbs' },
    { en: 'now', ru: 'Сейчас', uk: 'Зараз', es: 'ahora', pos: 'adverbs' },
    { en: 'yesterday', ru: 'Вчера', uk: 'Вчора', es: 'ayer', pos: 'adverbs' },
    { en: 'this morning', ru: 'Сегодня утром', uk: 'Сьогодні вранці', es: 'esta mañana', pos: 'adverbs' },
    { en: 'last week', ru: 'На прошлой неделе', uk: 'Минулого тижня', es: 'la semana pasada', pos: 'adverbs' },
    { en: 'at night', ru: 'Ночью', uk: 'Вночі', es: 'por la noche', pos: 'adverbs' },
    { en: 'at noon', ru: 'В полдень', uk: 'Опівдні', es: 'al mediodía', pos: 'adverbs' },
    { en: 'should', ru: 'Следует · стоит (совет)', uk: 'Слід · варто (порада)', es: 'debería / deberíamos', pos: 'verbs' },
  ],
  17: [
    { en: 'working', ru: 'Работает сейчас / работающий', uk: 'Працює зараз', es: 'trabajando', pos: 'verbs' },
    { en: 'reading', ru: 'Читает сейчас', uk: 'Читає зараз', es: 'leyendo', pos: 'verbs' },
    { en: 'cooking', ru: 'Готовит сейчас', uk: 'Готує зараз', es: 'cocinando', pos: 'verbs' },
    { en: 'writing', ru: 'Пишет сейчас', uk: 'Пише зараз', es: 'escribiendo', pos: 'verbs' },
    { en: 'waiting', ru: 'Ждёт сейчас', uk: 'Чекає зараз', es: 'esperando', pos: 'verbs' },
    { en: 'watching', ru: 'Смотрит сейчас', uk: 'Дивиться зараз', es: 'viendo', pos: 'verbs' },
    { en: 'listening', ru: 'Слушает сейчас', uk: 'Слухає зараз', es: 'escuchando', pos: 'verbs' },
    { en: 'drinking', ru: 'Пьёт сейчас', uk: "П'є зараз", es: 'bebiendo', pos: 'verbs' },
    { en: 'speaking', ru: 'Говорит сейчас', uk: 'Говорить зараз', es: 'hablando', pos: 'verbs' },
    { en: 'driving', ru: 'Ведёт машину сейчас', uk: 'Їде за кермом зараз', es: 'conduciendo', pos: 'verbs' },
    { en: 'checking', ru: 'Проверяет сейчас', uk: 'Перевіряє зараз', es: 'revisando', pos: 'verbs' },
    { en: 'sending', ru: 'Отправляет сейчас', uk: 'Надсилає зараз', es: 'enviando', pos: 'verbs' },
    { en: 'cleaning', ru: 'Убирает сейчас', uk: 'Прибирає зараз', es: 'limpiando', pos: 'verbs' },
    { en: 'fixing', ru: 'Чинит / исправляет сейчас', uk: 'Лагодить зараз', es: 'arreglando', pos: 'verbs' },
    { en: 'ordering', ru: 'Заказывает сейчас', uk: 'Замовляє зараз', es: 'pidiendo', pos: 'verbs' },
    { en: 'buying', ru: 'Покупает сейчас', uk: 'Купує зараз', es: 'comprando', pos: 'verbs' },
    { en: 'calling', ru: 'Звонит сейчас', uk: 'Телефонує зараз', es: 'llamando', pos: 'verbs' },
    { en: 'helping', ru: 'Помогает сейчас', uk: 'Допомагає зараз', es: 'ayudando', pos: 'verbs' },
    { en: 'sleeping', ru: 'Спит сейчас', uk: 'Спить зараз', es: 'durmiendo', pos: 'verbs' },
    { en: 'doing', ru: 'Делает сейчас', uk: 'Робить зараз', es: 'haciendo', pos: 'verbs' },
    { en: 'going', ru: 'Идёт / едет сейчас', uk: 'Іде / їде зараз', es: 'yendo', pos: 'verbs' },
    { en: 'crying', ru: 'Плачет сейчас', uk: 'Плаче зараз', es: 'llorando', pos: 'verbs' },
    { en: 'turning off', ru: 'Выключает сейчас', uk: 'Вимикає зараз', es: 'apagando', pos: 'verbs' },
    { en: 'putting on', ru: 'Надевает сейчас', uk: 'Надягає зараз', es: 'poniéndose', pos: 'verbs' },
    { en: 'cleaning up', ru: 'Убирает / наводит порядок сейчас', uk: 'Прибирає зараз', es: 'limpiando', pos: 'verbs' },
    { en: 'going back', ru: 'Возвращается назад сейчас', uk: 'Повертається назад зараз', es: 'volviendo', pos: 'verbs' },
    { en: 'now', ru: 'Сейчас', uk: 'Зараз', es: 'ahora', pos: 'adverbs' },
    { en: 'right now', ru: 'Прямо сейчас', uk: 'Прямо зараз', es: 'ahora mismo', pos: 'adverbs' },
    { en: 'at the moment', ru: 'В данный момент', uk: 'На даний момент', es: 'en este momento', pos: 'adverbs' },
    { en: 'today', ru: 'Сегодня', uk: 'Сьогодні', es: 'hoy', pos: 'adverbs' },
    { en: 'too fast', ru: 'Слишком быстро', uk: 'Занадто швидко', es: 'demasiado rápido', pos: 'adverbs' },
    { en: 'well', ru: 'Хорошо', uk: 'Добре', es: 'bien', pos: 'adverbs' },
    { en: 'outside', ru: 'Снаружи', uk: 'Надворі', es: 'fuera', pos: 'adverbs' },
    { en: 'music', ru: 'Музыка', uk: 'Музика', es: 'música', pos: 'nouns' },
    { en: 'TV', ru: 'Телевизор', uk: 'Телевізор', es: 'televisión', pos: 'nouns' },
    { en: 'English', ru: 'Английский язык', uk: 'Англійська мова', es: 'inglés', pos: 'nouns' },
    { en: 'problem', ru: 'Проблема', uk: 'Проблема', es: 'problema', pos: 'nouns' },
    { en: 'jacket', ru: 'Куртка', uk: 'Куртка', es: 'chaqueta', pos: 'nouns' },
  ],
  18: [
    { en: 'please', ru: 'Пожалуйста', uk: 'Будь ласка', es: 'por favor', pos: 'adverbs' },
    { en: 'wait', ru: 'Ждать', uk: 'Чекати', es: 'esperar', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', es: 'ayudar', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', es: 'llamar', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', es: 'revisar', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Надсилати', es: 'enviar', pos: 'verbs' },
    { en: 'open', ru: 'Открывать', uk: 'Відкривати', es: 'abrir', pos: 'verbs' },
    { en: 'close', ru: 'Закрывать', uk: 'Закривати', es: 'cerrar', pos: 'verbs' },
    { en: 'bring', ru: 'Приносить', uk: 'Приносити', es: 'traer', pos: 'irregular_verbs' },
    { en: 'take', ru: 'Брать', uk: 'Брати', es: 'coger / tomar', pos: 'irregular_verbs' },
    { en: 'clean', ru: 'Убирать / чистить', uk: 'Прибирати / чистити', es: 'limpiar', pos: 'verbs' },
    { en: 'start', ru: 'Начинать', uk: 'Починати', es: 'empezar', pos: 'verbs' },
    { en: 'listen', ru: 'Слушать', uk: 'Слухати', es: 'escuchar', pos: 'verbs' },
    { en: 'look', ru: 'Смотреть', uk: 'Дивитися', es: 'mirar', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', es: 'olvidar', pos: 'irregular_verbs' },
    { en: 'lose', ru: 'Терять', uk: 'Втрачати', es: 'perder', pos: 'irregular_verbs' },
    { en: 'share', ru: 'Делиться', uk: 'Ділитися', es: 'compartir', pos: 'verbs' },
    { en: 'use', ru: 'Использовать', uk: 'Використовувати', es: 'usar', pos: 'verbs' },
    { en: 'waste', ru: 'Тратить зря', uk: 'Витрачати даремно', es: 'desperdiciar', pos: 'verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', es: 'terminar', pos: 'verbs' },
    { en: 'talk', ru: 'Говорить / поговорить', uk: 'Говорити / поговорити', es: 'hablar', pos: 'verbs' },
    { en: 'work', ru: 'Работать', uk: 'Працювати', es: 'trabajar', pos: 'verbs' },
    { en: 'let', ru: 'Позволять / давайте', uk: 'Дозволяти / давайте', es: 'dejar / vamos a', pos: 'irregular_verbs' },
    { en: 'together', ru: 'Вместе', uk: 'Разом', es: 'juntos', pos: 'adverbs' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', es: 'puerta', pos: 'nouns' },
    { en: 'lights', ru: 'Свет / лампы', uk: 'Світло / лампи', es: 'luces', pos: 'nouns' },
    { en: 'passwords', ru: 'Пароли', uk: 'Паролі', es: 'contraseñas', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядное устройство', uk: 'Зарядний пристрій', es: 'cargador', pos: 'nouns' },
    { en: 'option', ru: 'Вариант', uk: 'Варіант', es: 'opción', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', es: 'tiempo', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', es: 'efectivo', pos: 'nouns' },
  ],
  19: [
    /* Урок 19: предлоги места + существительные из фраз + неправильные глаголы */
    { en: 'in', ru: 'В / внутри (место)', uk: 'В / всередині (місце)', es: 'en / dentro de', pos: 'adverbs' },
    { en: 'on', ru: 'На (поверхность)', uk: 'На (поверхня)', es: 'en / sobre', pos: 'adverbs' },
    { en: 'under', ru: 'Под', uk: 'Під', es: 'bajo / debajo de', pos: 'adverbs' },
    { en: 'near', ru: 'Рядом / около', uk: 'Поруч / біля', es: 'cerca de', pos: 'adverbs' },
    { en: 'next to', ru: 'Рядом с', uk: 'Поруч з', es: 'al lado de', pos: 'adverbs' },
    { en: 'behind', ru: 'За / позади', uk: 'За / позаду', es: 'detrás de', pos: 'adverbs' },
    { en: 'in front of', ru: 'Перед', uk: 'Перед', es: 'delante de', pos: 'adverbs' },
    { en: 'between', ru: 'Между', uk: 'Між', es: 'entre', pos: 'adverbs' },
    { en: 'inside', ru: 'Внутри', uk: 'Всередині', es: 'dentro (de)', pos: 'adverbs' },
    { en: 'outside', ru: 'Снаружи', uk: 'Зовні', es: 'fuera (de)', pos: 'adverbs' },
    { en: 'above', ru: 'Над / выше', uk: 'Над / вище', es: 'encima de', pos: 'adverbs' },
    { en: 'opposite', ru: 'Напротив', uk: 'Навпроти', es: 'enfrente de', pos: 'adverbs' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', es: 'mesa', pos: 'nouns' },
    { en: 'desk', ru: 'Рабочий стол', uk: 'Робочий стіл', es: 'escritorio', pos: 'nouns' },
    { en: 'chair', ru: 'Стул', uk: 'Стілець', es: 'silla', pos: 'nouns' },
    { en: 'bed', ru: 'Кровать', uk: 'Ліжко', es: 'cama', pos: 'nouns' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', es: 'puerta', pos: 'nouns' },
    { en: 'house', ru: 'Дом', uk: 'Будинок', es: 'casa', pos: 'nouns' },
    { en: 'shop', ru: 'Магазин', uk: 'Магазин', es: 'tienda', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', es: 'hotel', pos: 'nouns' },
    { en: 'bank', ru: 'Банк', uk: 'Банк', es: 'banco', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелёк', uk: 'Гаманець', es: 'cartera', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', es: 'pasaporte', pos: 'nouns' },
    { en: 'light', ru: 'Свет / лампа', uk: 'Світло / лампа', es: 'luz / lámpara', pos: 'nouns' },
    { en: 'put', ru: 'Класть / положить', uk: 'Класти / покласти', es: 'poner (put / put)', pos: 'irregular_verbs' },
    { en: 'stand', ru: 'Стоять', uk: 'Стояти', es: 'estar de pie (stood / stood)', pos: 'irregular_verbs' },
    { en: 'sit', ru: 'Сидеть', uk: 'Сидіти', es: 'sentarse (sat / sat)', pos: 'irregular_verbs' },
    { en: 'leave', ru: 'Оставлять / уходить', uk: 'Залишати / іти', es: 'dejar / irse (left / left)', pos: 'irregular_verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', es: 'encontrar (found / found)', pos: 'irregular_verbs' },
  ],
  20: [
    /* Урок 20: артикли a / an / the / нулевой артикль */
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', es: 'teléfono', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', es: 'bolsa', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', es: 'llave', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'boleto', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелёк', uk: 'Гаманець', es: 'billetera', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядка', uk: 'Зарядка', es: 'cargador', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', es: 'pasaporte', pos: 'nouns' },
    { en: 'email', ru: 'Письмо / имейл', uk: 'Лист / імейл', es: 'correo', pos: 'nouns' },
    { en: 'idea', ru: 'Идея', uk: 'Ідея', es: 'idea', pos: 'nouns' },
    { en: 'app', ru: 'Приложение', uk: 'Застосунок', es: 'aplicación', pos: 'nouns' },
    { en: 'umbrella', ru: 'Зонт', uk: 'Парасолька', es: 'paraguas', pos: 'nouns' },
    { en: 'cup', ru: 'Чашка', uk: 'Чашка', es: 'taza', pos: 'nouns' },
    { en: 'man', ru: 'Мужчина', uk: 'Чоловік', es: 'hombre', pos: 'nouns' },
    { en: 'option', ru: 'Вариант', uk: 'Варіант', es: 'opción', pos: 'nouns' },
    { en: 'inbox', ru: 'Папка входящих', uk: 'Папка вхідних', es: 'bandeja de entrada', pos: 'nouns' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', es: 'café', pos: 'nouns' },
    { en: 'water', ru: 'Вода', uk: 'Вода', es: 'agua', pos: 'nouns' },
    { en: 'money', ru: 'Деньги', uk: 'Гроші', es: 'dinero', pos: 'nouns' },
    { en: 'food', ru: 'Еда', uk: 'Їжа', es: 'comida', pos: 'nouns' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', es: 'comprar (bought / bought)', pos: 'irregular_verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', es: 'encontrar (found / found)', pos: 'irregular_verbs' },
    { en: 'bring', ru: 'Приносить', uk: 'Приносити', es: 'traer (brought / brought)', pos: 'irregular_verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', es: 'escribir (wrote / written)', pos: 'irregular_verbs' },
    { en: 'choose', ru: 'Выбирать', uk: 'Вибирати', es: 'elegir (chose / chosen)', pos: 'irregular_verbs' },
  ],
  21: [
    { en: 'no one', ru: 'Никто', uk: 'Ніхто', es: 'nadie', pos: 'pronouns' },
    { en: 'everybody', ru: 'Все', uk: 'Усі', es: 'todos', pos: 'pronouns' },
    { en: 'something', ru: 'Что-то', uk: 'Щось', es: 'algo', pos: 'pronouns' },
    { en: 'nothing', ru: 'Ничего', uk: 'Нічого', es: 'nada', pos: 'pronouns' },
    { en: 'everything', ru: 'Всё', uk: 'Все', es: 'todo', pos: 'pronouns' },
    { en: 'anything', ru: 'Что-нибудь', uk: 'Що-небудь', es: 'cualquier cosa', pos: 'pronouns' },
    { en: 'different', ru: 'Другой', uk: 'Інший', es: 'diferente', pos: 'adjectives' },
    { en: 'formal', ru: 'Торжественный', uk: 'Урочистий', es: 'formal', pos: 'adjectives' },
    { en: 'possible', ru: 'Возможный', uk: 'Можливий', es: 'posible', pos: 'adjectives' },
    { en: 'abandoned', ru: 'Заброшенный', uk: 'Покинутий', es: 'abandonado', pos: 'adjectives' },
    { en: 'crowded', ru: 'Переполненный', uk: 'Переповнений', es: 'atestado', pos: 'adjectives' },
    { en: 'valuable', ru: 'Ценный', uk: 'Цінний', es: 'valioso', pos: 'adjectives' },
    { en: 'favorite', ru: 'Любимый', uk: 'Улюблений', es: 'favorito', pos: 'adjectives' },
    { en: 'incident', ru: 'Происшествие', uk: 'Подія', es: 'incidente', pos: 'nouns' },
    { en: 'situation', ru: 'Ситуация', uk: 'Ситуація', es: 'situación', pos: 'nouns' },
    { en: 'mall', ru: 'Торговый центр', uk: 'Торговий центр', es: 'centro comercial', pos: 'nouns' },
    { en: 'ghost', ru: 'Привидение', uk: 'Привид', es: 'fantasma', pos: 'nouns' },
    { en: 'conversation', ru: 'Разговор', uk: 'Розмова', es: 'conversación', pos: 'nouns' },
    { en: 'explanation', ru: 'Объяснение', uk: 'Пояснення', es: 'explicación', pos: 'nouns' },
    { en: 'wind', ru: 'Ветер', uk: 'Вітер', es: 'viento', pos: 'nouns' },
    { en: 'sunglasses', ru: 'Солнечные очки', uk: 'Сонцезахисні окуляри', es: 'gafas de sol', pos: 'nouns' },
    { en: 'spoon', ru: 'Ложка', uk: 'Ложка', es: 'cuchara', pos: 'nouns' },
    { en: 'singer', ru: 'Певица', uk: 'Співачка', es: 'cantante', pos: 'nouns' },
    { en: 'excuse', ru: 'Оправдание', uk: 'Виправдання', es: 'excusa', pos: 'nouns' },
    { en: 'countryside', ru: 'Сельская местность', uk: 'Сільська місцевість', es: 'campo', pos: 'nouns' },
    { en: 'bar', ru: 'Бар', uk: 'Бар', es: 'bar', pos: 'nouns' },
    { en: 'believed', ru: 'Поверил(а)', uk: 'Повірив(ла)', es: 'creyó', pos: 'verbs' },
    { en: 'cave', ru: 'Пещера', uk: 'Печера', es: 'cueva', pos: 'nouns' },
    { en: 'fruit', ru: 'Фрукт / фрукты', uk: 'Фрукт / фрукти', es: 'fruta', pos: 'nouns' },
    { en: 'hid', ru: 'Спрятал', uk: 'Сховав', es: 'escondió', pos: 'irregular_verbs' },
    { en: 'knocked', ru: 'Постучал(а)', uk: 'Постукав(ла)', es: 'tocó', pos: 'verbs' },
    { en: 'laptop', ru: 'Ноутбук', uk: 'Ноутбук', es: 'portátil', pos: 'nouns' },
    { en: 'lot', ru: 'Много', uk: 'Багато', es: 'mucho', pos: 'adverbs' },
    { en: 'mat', ru: 'Коврик', uk: 'Килимок', es: 'estera', pos: 'nouns' },
    { en: 'notice', ru: 'Извещение', uk: 'Примітка', es: 'aviso', pos: 'nouns' },
    { en: 'recognized', ru: 'Распознал(а)', uk: 'Розпізнав(ла)', es: 'reconoció', pos: 'verbs' },
    { en: 'spilled', ru: 'Пролил(а)', uk: 'Пролив(ла)', es: 'derramó', pos: 'verbs' },
    { en: 'stole', ru: 'Украл', uk: 'Вкрав', es: 'robó', pos: 'irregular_verbs' },
    { en: 'visit', ru: 'Визит', uk: 'Візит', es: 'visita', pos: 'nouns' },
    { en: 'wants', ru: 'Хочет', uk: 'Хоче', es: 'quiere', pos: 'irregular_verbs' },
  ],
  22: LESSON_22_WORD_CARDS,
  23: [
    { en: 'personal', ru: 'Личный', uk: 'Особистий', es: 'personal', pos: 'adjectives' },
    { en: 'immediately', ru: 'Немедленно', uk: 'Негайно', es: 'inmediatamente', pos: 'adverbs' },
    { en: 'periodically', ru: 'Периодически', uk: 'Періодично', es: 'periódicamente', pos: 'adverbs' },
    { en: 'thrice', ru: 'Трижды', uk: 'Тричі', es: 'tres veces', pos: 'adverbs' },
    { en: 'highly', ru: 'Высоко', uk: 'Високо', es: 'sumamente', pos: 'adverbs' },
    { en: 'postman', ru: 'Почтальон', uk: 'Листоноша', es: 'cartero', pos: 'nouns' },
    { en: 'application', ru: 'Заявление', uk: 'Заява', es: 'solicitud', pos: 'nouns' },
    { en: 'department', ru: 'Отдел', uk: 'Відділ', es: 'departamento', pos: 'nouns' },
    { en: 'bill', ru: 'Счёт', uk: 'Рахунок', es: 'factura', pos: 'nouns' },
    { en: 'bin', ru: 'Корзина', uk: 'Кошик', es: 'contenedor', pos: 'nouns' },
    { en: 'directed', ru: 'Направленный', uk: 'Направлений', es: 'dirigido', pos: 'adjectives' },
    { en: 'easily', ru: 'Легко', uk: 'Легко', es: 'fácilmente', pos: 'adverbs' },
    { en: 'eaten', ru: 'Съеденный', uk: 'Зʼїдений', es: 'comido', pos: 'adjectives' },
    { en: 'end', ru: 'Конец', uk: 'Кінець', es: 'fin', pos: 'nouns' },
    { en: 'exercise', ru: 'Упражнение', uk: 'Вправа', es: 'ejercicio', pos: 'nouns' },
    { en: 'explained', ru: 'Объяснённый', uk: 'Пояснений', es: 'explicado', pos: 'adjectives' },
    { en: 'file', ru: 'Файл', uk: 'Файл', es: 'archivo', pos: 'nouns' },
    { en: 'filled', ru: 'Наполненный', uk: 'Наповнений', es: 'llenado', pos: 'adjectives' },
    { en: 'filmmaker', ru: 'Кинорежиссёр', uk: 'Кінорежисер', es: 'cineasta', pos: 'nouns' },
    { en: 'forgotten', ru: 'Забытый', uk: 'Забутий', es: 'olvidado', pos: 'adjectives' },
    { en: 'gardener', ru: 'Садовник', uk: 'Садівник', es: 'jardinero', pos: 'nouns' },
    { en: 'given', ru: 'Данный', uk: 'Даний', es: 'dado', pos: 'adjectives' },
    { en: 'idea', ru: 'Идея', uk: 'Ідея', es: 'idea', pos: 'nouns' },
    { en: 'invited', ru: 'Приглашённый', uk: 'Запрошений', es: 'invitado', pos: 'adjectives' },
    { en: 'learned', ru: 'Выученный', uk: 'Вивчений', es: 'aprendido', pos: 'adjectives' },
    { en: 'legend', ru: 'Легенда', uk: 'Легенда', es: 'leyenda', pos: 'nouns' },
    { en: 'management', ru: 'Руководство', uk: 'Керівництво', es: 'dirección', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча', uk: 'Зустріч', es: 'reunión', pos: 'nouns' },
    { en: 'paid', ru: 'Оплаченный', uk: 'Оплачений', es: 'pagado', pos: 'adjectives' },
    { en: 'patient', ru: 'Пациент', uk: 'Пацієнт', es: 'paciente', pos: 'nouns' },
    { en: 'prize', ru: 'Приз', uk: 'Приз', es: 'premio', pos: 'nouns' },
    { en: 'professional', ru: 'Профессиональный', uk: 'Професійний', es: 'profesional', pos: 'adjectives' },
    { en: 'protected', ru: 'Защищённый', uk: 'Захищений', es: 'protegido', pos: 'adjectives' },
    { en: 'repaired', ru: 'Починенный', uk: 'Відремонтований', es: 'reparado', pos: 'adjectives' },
    { en: 'report', ru: 'Отчёт', uk: 'Звіт', es: 'informe', pos: 'nouns' },
    { en: 'secretary', ru: 'Секретарь', uk: 'Секретар', es: 'secretaria', pos: 'nouns' },
    { en: 'security', ru: 'Охрана', uk: 'Охорона', es: 'seguridad', pos: 'nouns' },
    { en: 'signed', ru: 'Подписанный', uk: 'Підписаний', es: 'firmado', pos: 'adjectives' },
    { en: 'solved', ru: 'Решённый', uk: 'Вирішений', es: 'resuelto', pos: 'adjectives' },
    { en: 'supported', ru: 'Поддержанный', uk: 'Підтриманий', es: 'apoyado', pos: 'adjectives' },
    { en: 'taken', ru: 'Взятый', uk: 'Взятий', es: 'tomado', pos: 'adjectives' },
    { en: 'teacher', ru: 'Учитель', uk: 'Вчитель', es: 'profesor', pos: 'nouns' },
    { en: 'thrown', ru: 'Брошенный', uk: 'Кинутий', es: 'arrojado', pos: 'adjectives' },
    { en: 'tourist', ru: 'Турист', uk: 'Турист', es: 'turista', pos: 'nouns' },
    { en: 'treated', ru: 'Обработанный', uk: 'Оброблений', es: 'tratado', pos: 'adjectives' },
    { en: 'used', ru: 'Использованный', uk: 'Використаний', es: 'usado', pos: 'adjectives' },
    { en: 'winner', ru: 'Победитель', uk: 'Переможець', es: 'ganador', pos: 'nouns' },
    { en: 'written', ru: 'Написанный', uk: 'Написаний', es: 'escrito', pos: 'adjectives' },
  ],
  24: [
    { en: 'traditional', ru: 'Традиционный', uk: 'Традиційний', es: 'tradicional', pos: 'adjectives' },
    { en: 'suitable', ru: 'Подходящий', uk: 'Підходящий', es: 'adecuado', pos: 'adjectives' },
    { en: 'exotic', ru: 'Экзотический', uk: 'Екзотичний', es: 'exótico', pos: 'adjectives' },
    { en: 'grand', ru: 'Грандиозный', uk: 'Грандіозний', es: 'magnífico', pos: 'adjectives' },
    { en: 'massive', ru: 'Массивный', uk: 'Масивний', es: 'masivo', pos: 'adjectives' },
    { en: 'prestigious', ru: 'Престижный', uk: 'Престижний', es: 'prestigioso', pos: 'adjectives' },
    { en: 'scientific', ru: 'Научный', uk: 'Науковий', es: 'científico', pos: 'adjectives' },
    { en: 'natural', ru: 'Природный', uk: 'Природний', es: 'natural', pos: 'adjectives' },
    { en: 'just', ru: 'Только что', uk: 'Щойно', es: 'recién; acabar de', pos: 'adverbs' },
    { en: 'already', ru: 'Уже', uk: 'Вже', es: 'ya', pos: 'adverbs' },
    { en: 'yet', ru: 'Ещё (в отриц.)', uk: 'Ще (у запереченні)', es: 'todavía', pos: 'adverbs' },
    { en: 'ever', ru: 'Когда-либо', uk: 'Коли-небудь', es: 'alguna vez', pos: 'adverbs' },
    { en: 'never', ru: 'Никогда', uk: 'Ніколи', es: 'nunca', pos: 'adverbs' },
    { en: 'somewhere', ru: 'Где-то', uk: 'Десь', es: 'en algún lugar', pos: 'adverbs' },
    { en: 'concert', ru: 'Концерт', uk: 'Концерт', es: 'concierto', pos: 'nouns' },
    { en: 'review', ru: 'Отзыв', uk: 'Відгук', es: 'reseña', pos: 'nouns' },
    { en: 'environment', ru: 'Среда (окружающая)', uk: 'Середовище', es: 'medio ambiente', pos: 'nouns' },
    { en: 'anniversary', ru: 'Годовщина', uk: 'Річниця', es: 'aniversario', pos: 'nouns' },
    { en: 'recipe', ru: 'Рецепт', uk: 'Рецепт', es: 'receta', pos: 'nouns' },
    { en: 'gallery', ru: 'Галерея', uk: 'Галерея', es: 'galería', pos: 'nouns' },
    { en: 'ladder', ru: 'Лестница (стремянка)', uk: 'Драбина', es: 'escalera', pos: 'nouns' },
    { en: 'invitation', ru: 'Приглашение', uk: 'Запрошення', es: 'invitación', pos: 'nouns' },
    { en: 'grant', ru: 'Грант', uk: 'Грант', es: 'beca; subvención', pos: 'nouns' },
    { en: 'research', ru: 'Исследование', uk: 'Дослідження', es: 'investigación', pos: 'nouns' },
    { en: 'phenomenon', ru: 'Явление', uk: 'Явище', es: 'fenómeno', pos: 'nouns' },
    { en: 'actor', ru: 'Актёр', uk: 'Актор', es: 'actor', pos: 'nouns' },
    { en: 'aunt', ru: 'Тетя', uk: 'Тітка', es: 'tía', pos: 'nouns' },
    { en: 'baked', ru: 'Печёный', uk: 'Запечений', es: 'horneado', pos: 'adjectives' },
    { en: 'belongings', ru: 'Личные вещи', uk: 'Особисті речі', es: 'pertenencias', pos: 'nouns' },
    { en: 'blood', ru: 'Кровь', uk: 'Кров', es: 'sangre', pos: 'nouns' },
    { en: 'chief', ru: 'Главный', uk: 'Головний', es: 'principal', pos: 'adjectives' },
    { en: 'chosen', ru: 'Выбранный', uk: 'Вибраний', es: 'elegido', pos: 'adjectives' },
    { en: 'colleague', ru: 'Коллега', uk: 'Колега', es: 'colega', pos: 'nouns' },
    { en: 'created', ru: 'Созданный', uk: 'Створений', es: 'creado', pos: 'adjectives' },
    { en: 'driven', ru: 'Довезённый', uk: 'Довезений', es: 'conducido', pos: 'adjectives' },
    { en: 'drunk', ru: 'Выпитый', uk: 'Випитий', es: 'bebido', pos: 'adjectives' },
    { en: 'employee', ru: 'Сотрудник', uk: 'Співробітник', es: 'empleado', pos: 'nouns' },
    { en: 'latest', ru: 'Последний (самый новый)', uk: 'Останній (найновіший)', es: 'último', pos: 'adjectives' },
    { en: 'lent', ru: 'Одолжил', uk: 'Позичив', es: 'prestó', pos: 'irregular_verbs' },
    { en: 'magazine', ru: 'Журнал', uk: 'Журнал', es: 'revista', pos: 'nouns' },
    { en: 'mexican', ru: 'Мексиканский', uk: 'Мексиканський', es: 'mexicano', pos: 'adjectives' },
    { en: 'mobile', ru: 'Мобильный (телефон)', uk: 'Мобільний (телефон)', es: 'móvil', pos: 'nouns' },
    { en: 'parent', ru: 'Родитель', uk: 'Один з батьків', es: 'progenitor', pos: 'nouns' },
    { en: 'partner', ru: 'Партнёр', uk: 'Партнер', es: 'socio', pos: 'nouns' },
    { en: 'real', ru: 'Реальный', uk: 'Реальний', es: 'real', pos: 'adjectives' },
    { en: 'result', ru: 'Результат', uk: 'Результат', es: 'resultado', pos: 'nouns' },
    { en: 'seen', ru: 'Увиденный', uk: 'Побачений', es: 'visto', pos: 'adjectives' },
    { en: 'sport', ru: 'Спорт', uk: 'Спорт', es: 'deporte', pos: 'nouns' },
    { en: 'stolen', ru: 'Украденный', uk: 'Вкрадений', es: 'robado', pos: 'adjectives' },
    { en: 'stupid', ru: 'Глупый', uk: 'Дурний', es: 'estúpido', pos: 'adjectives' },
    { en: 'such', ru: 'Такой', uk: 'Такий', es: 'tal', pos: 'adjectives' },
    { en: 'tasted', ru: 'Испробованный', uk: 'Скуштуваний', es: 'probado', pos: 'adjectives' },
    { en: 'technology', ru: 'Технология', uk: 'Технологія', es: 'tecnología', pos: 'nouns' },
    { en: 'test', ru: 'Анализ (тест)', uk: 'Аналіз (тест)', es: 'análisis', pos: 'nouns' },
    { en: 'won', ru: 'Выигранный', uk: 'Виграний', es: 'ganado', pos: 'adjectives' },
    { en: 'yourself', ru: 'Сам; себя (возвр.)', uk: 'Сам; себе (зворотн.)', es: 'tú mismo', pos: 'pronouns' },
  ],
  25: [
    { en: 'cautious', ru: 'Осторожный', uk: 'Обережний', es: 'precavido', pos: 'adjectives' },
    { en: 'slippery', ru: 'Скользкий', uk: 'Слизький', es: 'resbaladizo', pos: 'adjectives' },
    { en: 'financial', ru: 'Финансовый', uk: 'Фінансовий', es: 'financiero', pos: 'adjectives' },
    { en: 'suspicious', ru: 'Подозрительный', uk: 'Підозрілий', es: 'sospechoso', pos: 'adjectives' },
    { en: 'successful', ru: 'Успешный', uk: 'Успішний', es: 'exitoso', pos: 'adjectives' },
    { en: 'unhealthy', ru: 'Вредный', uk: 'Шкідливий', es: 'malsano', pos: 'adjectives' },
    { en: 'loudly', ru: 'Громко', uk: 'Голосно', es: 'fuerte', pos: 'adverbs' },
    { en: 'still', ru: 'Все еще', uk: 'Все ще', es: 'aún', pos: 'adverbs' },
    { en: 'excursion', ru: 'Экскурсия', uk: 'Екскурсія', es: 'excursión', pos: 'nouns' },
    { en: 'complaint', ru: 'Жалоба', uk: 'Скарга', es: 'queja', pos: 'nouns' },
    { en: 'conflict', ru: 'Конфликт', uk: 'Конфлікт', es: 'conflicto', pos: 'nouns' },
    { en: 'playground', ru: 'Площадка', uk: 'Майданчик', es: 'patio de juegos', pos: 'nouns' },
    { en: 'platform', ru: 'Платформа', uk: 'Платформа', es: 'plataforma', pos: 'nouns' },
    { en: 'agreement', ru: 'Соглашение', uk: 'Угода', es: 'acuerdo', pos: 'nouns' },
    { en: 'deal', ru: 'Сделка', uk: 'Угода', es: 'trato', pos: 'nouns' },
    { en: 'inspector', ru: 'Инспектор', uk: 'Інспектор', es: 'inspector', pos: 'nouns' },
    { en: 'administration', ru: 'Администрация', uk: 'Адміністрація', es: 'administración', pos: 'nouns' },
    { en: 'animal', ru: 'Животное', uk: 'Тварина', es: 'animal', pos: 'nouns' },
    { en: 'answering', ru: 'Отвечает', uk: 'Відповідає', es: 'respondiendo', pos: 'verbs' },
    { en: 'celebrating', ru: 'Празднует', uk: 'Святкує', es: 'celebrando', pos: 'verbs' },
    { en: 'contract', ru: 'Контракт', uk: 'Контракт', es: 'contrato', pos: 'nouns' },
    { en: 'delayed', ru: 'Задержанный', uk: 'Затриманий', es: 'demorado', pos: 'adjectives' },
    { en: 'deleting', ru: 'Удаляет', uk: 'Видаляє', es: 'eliminando', pos: 'verbs' },
    { en: 'four', ru: 'Четыре', uk: 'Чотири', es: 'cuatro', pos: 'nouns' },
    { en: 'knocking', ru: 'Стучит', uk: 'Стукає', es: 'golpeando', pos: 'verbs' },
    { en: 'landscape', ru: 'Пейзаж', uk: 'Пейзаж', es: 'paisaje', pos: 'nouns' },
    { en: 'neighboring', ru: 'Соседний', uk: 'Сусідній', es: 'vecino', pos: 'adjectives' },
    { en: 'patrolling', ru: 'Патрулирует', uk: 'Патрулює', es: 'patrullando', pos: 'verbs' },
    { en: 'printing', ru: 'Печатает', uk: 'Друкує', es: 'imprimiendo', pos: 'verbs' },
    { en: 'reckless', ru: 'Неосторожный', uk: 'Нерозумний', es: 'imprudente', pos: 'adjectives' },
    { en: 'relative', ru: 'Родственник', uk: 'Родич', es: 'pariente', pos: 'nouns' },
    { en: 'scratching', ru: 'Царапает', uk: 'Дряпає', es: 'rascándose', pos: 'verbs' },
    { en: 'sending', ru: 'Отправляет', uk: 'Відправляє', es: 'enviando', pos: 'verbs' },
    { en: 'service', ru: 'Услуга', uk: 'Послуга', es: 'servicio', pos: 'nouns' },
    { en: 'setting', ru: 'Настройка', uk: 'Налаштування', es: 'ajuste', pos: 'nouns' },
    { en: 'shouting', ru: 'Кричит', uk: 'Кричить', es: 'gritando', pos: 'verbs' },
    { en: 'singing', ru: 'Поёт', uk: 'Співає', es: 'cantando', pos: 'verbs' },
    { en: 'speeding', ru: 'Превышение скорости', uk: 'Перевищення швидкості', es: 'exceso de velocidad', pos: 'nouns' },
    { en: 'state', ru: 'Состояние / государство', uk: 'Стан / держава', es: 'estado', pos: 'nouns' },
    { en: 'taking', ru: 'Берёт', uk: 'Бере', es: 'tomando', pos: 'verbs' },
    { en: 'tariff', ru: 'Тариф', uk: 'Тариф', es: 'arancel', pos: 'nouns' },
    { en: 'television', ru: 'Телевизор', uk: 'Телебачення', es: 'televisión', pos: 'nouns' },
    { en: 'telling', ru: 'Рассказывает', uk: 'Розповідає', es: 'contando', pos: 'verbs' },
    { en: 'unfamiliar', ru: 'Незнакомый', uk: 'Незнайомий', es: 'desconocido', pos: 'adjectives' },
  ],
  26: [
    { en: 'catch', ru: 'Ловить', uk: 'Ловити', es: 'atrapar', pos: 'irregular_verbs' },
    { en: 'run', ru: 'Бежать', uk: 'Бігти', es: 'correr', pos: 'irregular_verbs' },
    { en: 'heat', ru: 'Нагревать', uk: 'Нагрівати', es: 'calentar', pos: 'verbs' },
    { en: 'reduce', ru: 'Уменьшать', uk: 'Зменшувати', es: 'reducir', pos: 'verbs' },
    { en: 'replace', ru: 'Заменять', uk: 'Замінювати', es: 'reemplazar', pos: 'verbs' },
    { en: 'expand', ru: 'Расширяться', uk: 'Розширюватися', es: 'expandir', pos: 'verbs' },
    { en: 'enable', ru: 'Включать', uk: 'Ввімкнути', es: 'permitir', pos: 'verbs' },
    { en: 'happen', ru: 'Случаться', uk: 'Ставатися', es: 'suceder', pos: 'verbs' },
    { en: 'attract', ru: 'Притягивать', uk: 'Притягувати', es: 'atraer', pos: 'verbs' },
    { en: 'improve', ru: 'Улучшать', uk: 'Покращувати', es: 'mejorar', pos: 'verbs' },
    { en: 'hidden', ru: 'Скрытый', uk: 'Прихований', es: 'oculto', pos: 'adjectives' },
    { en: 'profitable', ru: 'Выгодный', uk: 'Вигідний', es: 'rentable', pos: 'adjectives' },
    { en: 'responsible', ru: 'Ответственный', uk: 'Відповідальний', es: 'responsable', pos: 'adjectives' },
    { en: 'automatic', ru: 'Автоматический', uk: 'Автоматичний', es: 'automático', pos: 'adjectives' },
    { en: 'successfully', ru: 'Успешно', uk: 'Успішно', es: 'exitosamente', pos: 'adverbs' },
    { en: 'strongly', ru: 'Сильно', uk: 'Сильно', es: 'fuertemente', pos: 'adverbs' },
    { en: 'regularly', ru: 'Регулярно', uk: 'Регулярно', es: 'regularmente', pos: 'adverbs' },
    { en: 'profit', ru: 'Прибыль', uk: 'Прибуток', es: 'ganancia', pos: 'nouns' },
    { en: 'strategy', ru: 'Стратегия', uk: 'Стратегія', es: 'estrategia', pos: 'nouns' },
    { en: 'oil', ru: 'Техническое масло', uk: 'Технічне масло', es: 'aceite', pos: 'nouns' },
    { en: 'interview', ru: 'Собеседование', uk: 'Співбесіда', es: 'entrevista', pos: 'nouns' },
    { en: 'navigator', ru: 'Навигатор', uk: 'Навігатор', es: 'navegador', pos: 'nouns' },
    { en: 'investor', ru: 'Инвестор', uk: 'Інвестор', es: 'inversor', pos: 'nouns' },
    { en: 'startup', ru: 'Стартап', uk: 'Стартап', es: 'startup', pos: 'nouns' },
    { en: 'capital', ru: 'Капитал', uk: 'Капітал', es: 'capital', pos: 'nouns' },
    { en: 'payment', ru: 'Оплата', uk: 'Оплата', es: 'pago', pos: 'nouns' },
    { en: 'magnet', ru: 'Магнит', uk: 'Магніт', es: 'imán', pos: 'nouns' },
    { en: 'trash', ru: 'Мусор', uk: 'Сміття', es: 'basura', pos: 'nouns' },
    { en: 'position', ru: 'Должность', uk: 'Посада', es: 'posición', pos: 'nouns' },
    { en: 'furnace', ru: 'Промышленная печь', uk: 'Промислова піч', es: 'horno', pos: 'nouns' },
    { en: 'parameter', ru: 'Параметр', uk: 'Параметр', es: 'parámetro', pos: 'nouns' },
    { en: 'crossroad', ru: 'Перекрёсток', uk: 'Перехрестя', es: 'encrucijada', pos: 'nouns' },
    { en: 'logo', ru: 'Логотип', uk: 'Логотип', es: 'logo', pos: 'nouns' },
    { en: 'fund', ru: 'Фонд', uk: 'Фонд', es: 'fondo', pos: 'nouns' },
    { en: 'permission', ru: 'Разрешение', uk: 'Дозвіл', es: 'permiso', pos: 'nouns' },
    { en: 'salt', ru: 'Соль', uk: 'Сіль', es: 'sal', pos: 'nouns' },
    { en: 'designer', ru: 'Дизайнер', uk: 'Дизайнер', es: 'diseñador', pos: 'nouns' },
    { en: 'temperature', ru: 'Температура', uk: 'Температура', es: 'temperatura', pos: 'nouns' },
    { en: 'additional', ru: 'Дополнительный', uk: 'Додатковий', es: 'adicional', pos: 'adjectives' },
    { en: 'adds', ru: 'Добавляет', uk: 'Додає', es: 'agrega', pos: 'verbs' },
    { en: 'attends', ru: 'Посещает', uk: 'Відвідує', es: 'asiste', pos: 'verbs' },
    { en: 'attracts', ru: 'Притягивает', uk: 'Притягує', es: 'atrae', pos: 'verbs' },
    { en: 'burns', ru: 'Горит', uk: 'Горить', es: 'arde', pos: 'verbs' },
    { en: 'butter', ru: 'Сливочное масло', uk: 'Вершкове масло', es: 'manteca', pos: 'nouns' },
    { en: 'cage', ru: 'Клетка', uk: 'Клітка', es: 'jaula', pos: 'nouns' },
    { en: 'changes', ru: 'Меняет', uk: 'Змінює', es: 'cambia', pos: 'verbs' },
    { en: 'club', ru: 'Клуб', uk: 'Гурток', es: 'club', pos: 'nouns' },
    { en: 'collect', ru: 'Собирать', uk: 'Збирати', es: 'recolectar', pos: 'verbs' },
    { en: 'comes', ru: 'Приходит', uk: 'Приходить', es: 'llega', pos: 'irregular_verbs' },
    { en: 'complete', ru: 'Завершать', uk: 'Завершувати', es: 'completar', pos: 'verbs' },
    { en: 'completes', ru: 'Завершает', uk: 'Завершує', es: 'completa', pos: 'verbs' },
    { en: 'creates', ru: 'Создаёт', uk: 'Створює', es: 'crea', pos: 'verbs' },
    { en: 'customer', ru: 'Клиент', uk: 'Клієнт', es: 'cliente', pos: 'nouns' },
    { en: 'die', ru: 'Умирать', uk: 'Вмирати', es: 'morir', pos: 'irregular_verbs' },
    { en: 'error', ru: 'Ошибка', uk: 'Помилка', es: 'error', pos: 'nouns' },
    { en: 'expands', ru: 'Расширяется', uk: 'Розширюється', es: 'se expande', pos: 'verbs' },
    { en: 'figure', ru: 'Рисунок / фигура', uk: 'Малюнок / фігура', es: 'figura', pos: 'nouns' },
    { en: 'fire', ru: 'Пожар', uk: 'Пожежа', es: 'fuego', pos: 'nouns' },
    { en: 'fixes', ru: 'Чинит', uk: 'Лагодить', es: 'arregla', pos: 'verbs' },
    { en: 'floats', ru: 'Плавает', uk: 'Плаває', es: 'flota', pos: 'verbs' },
    { en: 'generous', ru: 'Щедрый', uk: 'Щедрий', es: 'generoso', pos: 'adjectives' },
    { en: 'gets', ru: 'Получает', uk: 'Отримує', es: 'obtiene', pos: 'irregular_verbs' },
    { en: 'heats', ru: 'Нагревает', uk: 'Нагріває', es: 'calienta', pos: 'verbs' },
    { en: 'holds', ru: 'Держит', uk: 'Тримає', es: 'sostiene', pos: 'irregular_verbs' },
    { en: 'invest', ru: 'Инвестировать', uk: 'Інвестувати', es: 'invertir', pos: 'verbs' },
    { en: 'make', ru: 'Создавать / готовить', uk: 'Створювати / готувати', es: 'hacer', pos: 'irregular_verbs' },
    { en: 'melts', ru: 'Тает', uk: 'Тає', es: 'se derrite', pos: 'verbs' },
    { en: 'membership', ru: 'Подписка', uk: 'Членство', es: 'afiliación', pos: 'nouns' },
    { en: 'object', ru: 'Предмет', uk: 'Предмет', es: 'objeto', pos: 'nouns' },
    { en: 'overheats', ru: 'Перегревается', uk: 'Перегрівається', es: 'se sobrecalienta', pos: 'verbs' },
    { en: 'packet', ru: 'Упаковка', uk: 'Пакет', es: 'paquete', pos: 'nouns' },
    { en: 'pan', ru: 'Сковорода', uk: 'Сковорідка', es: 'sartén', pos: 'nouns' },
    { en: 'presses', ru: 'Нажимает', uk: 'Натискає', es: 'presiona', pos: 'verbs' },
    { en: 'provide', ru: 'Предоставлять', uk: 'Надавати', es: 'proporcionar', pos: 'verbs' },
    { en: 'provides', ru: 'Предоставляет', uk: 'Надає', es: 'proporciona', pos: 'verbs' },
    { en: 'reads', ru: 'Читает', uk: 'Читає', es: 'lee', pos: 'irregular_verbs' },
    { en: 'ruined', ru: 'Разрушенный', uk: 'Зруйнований', es: 'arruinado', pos: 'adjectives' },
    { en: 'sensor', ru: 'Датчик', uk: 'Датчик', es: 'sensor', pos: 'nouns' },
    { en: 'shows', ru: 'Показывает', uk: 'Показує', es: 'muestra', pos: 'verbs' },
    { en: 'significantly', ru: 'Значительно', uk: 'Суттєво', es: 'significativamente', pos: 'adverbs' },
    { en: 'signs', ru: 'Подписывает', uk: 'Підписує', es: 'firma', pos: 'verbs' },
    { en: 'smoothly', ru: 'Плавно', uk: 'Плавно', es: 'suavemente', pos: 'adverbs' },
    { en: 'solution', ru: 'Решение', uk: 'Рішення', es: 'solución', pos: 'nouns' },
    { en: 'speaking', ru: 'Разговорная речь', uk: 'Розмовна мова', es: 'expresión oral', pos: 'nouns' },
    { en: 'specialist', ru: 'Специалист', uk: 'Фахівець', es: 'especialista', pos: 'nouns' },
    { en: 'test', ru: 'Тест; проверка', uk: 'Тест; перевірка', es: 'prueba', pos: 'nouns' },
    { en: 'throws', ru: 'Бросает', uk: 'Кидає', es: 'lanza', pos: 'irregular_verbs' },
    { en: 'turns', ru: 'Поворачивает', uk: 'Повертає', es: 'gira', pos: 'verbs' },
    { en: 'vent', ru: 'Вентиляционное отверстие', uk: 'Вентиляційний отвір', es: 'respiradero', pos: 'nouns' },
    { en: 'wood', ru: 'Дерево (материал)', uk: 'Деревина (матеріал)', es: 'madera', pos: 'nouns' },
  ],
  27: [
    { en: 'say', ru: 'Говорить', uk: 'Говорити', es: 'decir', pos: 'irregular_verbs' },
    { en: 'tell', ru: 'Рассказывать', uk: 'Розповідати', es: 'contar', pos: 'irregular_verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', es: 'encontrar', pos: 'irregular_verbs' },
    { en: 'know', ru: 'Знать', uk: 'Знати', es: 'saber', pos: 'irregular_verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Відправляти', es: 'enviar', pos: 'irregular_verbs' },
    { en: 'bring', ru: 'Приносить', uk: 'Приносити', es: 'traer', pos: 'irregular_verbs' },
    { en: 'lose', ru: 'Терять', uk: 'Втрачати', es: 'perder', pos: 'irregular_verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', es: 'ver', pos: 'irregular_verbs' },
    { en: 'break', ru: 'Ломать', uk: 'Ламати', es: 'romper', pos: 'irregular_verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', es: 'olvidar', pos: 'irregular_verbs' },
    { en: 'make', ru: 'Делать', uk: 'Робити', es: 'hacer', pos: 'irregular_verbs' },
    { en: 'steal', ru: 'Красть', uk: 'Красти', es: 'robar', pos: 'irregular_verbs' },
    { en: 'pay', ru: 'Платить', uk: 'Платити', es: 'pagar', pos: 'irregular_verbs' },
    { en: 'take', ru: 'Брать', uk: 'Брати', es: 'tomar', pos: 'irregular_verbs' },
    { en: 'leave', ru: 'Оставлять', uk: 'Залишати', es: 'dejar', pos: 'irregular_verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', es: 'oír', pos: 'irregular_verbs' },
    { en: 'mention', ru: 'Упоминать', uk: 'Згадувати', es: 'mencionar', pos: 'verbs' },
    { en: 'reply', ru: 'Отвечать', uk: 'Відповідати', es: 'responder', pos: 'verbs' },
    { en: 'explain', ru: 'Объяснять', uk: 'Пояснювати', es: 'explicar', pos: 'verbs' },
    { en: 'confirm', ru: 'Подтверждать', uk: 'Підтверджувати', es: 'confirmar', pos: 'verbs' },
    { en: 'warn', ru: 'Предупреждать', uk: 'Попереджати', es: 'advertir', pos: 'verbs' },
    { en: 'announce', ru: 'Объявлять', uk: 'Оголошувати', es: 'anunciar', pos: 'verbs' },
    { en: 'remind', ru: 'Напоминать', uk: 'Нагадувати', es: 'recordar', pos: 'verbs' },
    { en: 'complain', ru: 'Жаловаться', uk: 'Скаржитися', es: 'quejarse', pos: 'verbs' },
    { en: 'promise', ru: 'Обещать', uk: 'Обіцяти', es: 'prometer', pos: 'verbs' },
    { en: 'admit', ru: 'Признавать', uk: 'Визнавати', es: 'admitir', pos: 'verbs' },
    { en: 'report', ru: 'Сообщать', uk: 'Повідомляти', es: 'informar', pos: 'verbs' },
    { en: 'state', ru: 'Утверждать', uk: 'Стверджувати', es: 'afirmar', pos: 'verbs' },
    { en: 'notice', ru: 'Замечать', uk: 'Помічати', es: 'notar', pos: 'verbs' },
    { en: 'contract', ru: 'Контракт', uk: 'Контракт', es: 'contrato', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', es: 'documento', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', es: 'contraseña', pos: 'nouns' },
    { en: 'invitation', ru: 'Приглашение', uk: 'Запрошення', es: 'invitación', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелек', uk: 'Гаманець', es: 'cartera', pos: 'nouns' },
    { en: 'witness', ru: 'Свидетель', uk: 'Свідок', es: 'testigo', pos: 'nouns' },
    { en: 'instruction', ru: 'Инструкция', uk: 'Інструкція', es: 'instrucción', pos: 'nouns' },
    { en: 'painting', ru: 'Картина', uk: 'Картина', es: 'cuadro', pos: 'nouns' },
    { en: 'exhibition', ru: 'Выставка', uk: 'Виставка', es: 'exposición', pos: 'nouns' },
    { en: 'experienced', ru: 'Опытный', uk: 'Досвідчений', es: 'experimentado', pos: 'adjectives' },
    { en: 'reliable', ru: 'Надежный', uk: 'Надійний', es: 'confiable', pos: 'adjectives' },
    { en: 'polite', ru: 'Вежливый', uk: 'Ввічливий', es: 'educado', pos: 'adjectives' },
    { en: 'attentive', ru: 'Внимательный', uk: 'Уважний', es: 'atento', pos: 'adjectives' },
    { en: 'qualified', ru: 'Квалифицированный', uk: 'Кваліфікований', es: 'cualificado', pos: 'adjectives' },
    { en: 'strict', ru: 'Строгий', uk: 'Суворий', es: 'estricto', pos: 'adjectives' },
    { en: 'honest', ru: 'Честный', uk: 'Чесний', es: 'honesto', pos: 'adjectives' },
    { en: 'immediately', ru: 'Немедленно', uk: 'Негайно', es: 'inmediatamente', pos: 'adverbs' },
    { en: 'previously', ru: 'Ранее', uk: 'Раніше', es: 'anteriormente', pos: 'adverbs' },
  ],
  28: [
    { en: 'achieve', ru: 'Достигать', uk: 'Досягати', es: 'lograr', pos: 'verbs' },
    { en: 'introduce', ru: 'Представлять; представляться', uk: 'Представляти; представлятися', es: 'presentar', pos: 'verbs' },
    { en: 'force', ru: 'Заставлять', uk: 'Змушувати', es: 'forzar', pos: 'verbs' },
    { en: 'treat', ru: 'Баловать; обращаться (с кем-л.)', uk: 'Балувати; ставитися (до когось)', es: 'mimar; tratar', pos: 'verbs' },
    { en: 'control', ru: 'Контролировать', uk: 'Контролювати', es: 'controlar', pos: 'verbs' },
    { en: 'behave', ru: 'Вести себя', uk: 'Поводитися', es: 'comportarse', pos: 'verbs' },
    { en: 'allow', ru: 'Позволять', uk: 'Дозволяти', es: 'permitir', pos: 'verbs' },
    { en: 'hurt', ru: 'Ранить; болеть', uk: 'Ранити; боліти', es: 'herir; doler', pos: 'irregular_verbs' },
    { en: 'ambitious', ru: 'Амбициозный', uk: 'Амбітний', es: 'ambicioso', pos: 'adjectives' },
    { en: 'challenging', ru: 'Сложный, трудный', uk: 'Складний, важкий', es: 'desafiante', pos: 'adjectives' },
    { en: 'digital', ru: 'Цифровой', uk: 'Цифровий', es: 'digital', pos: 'adjectives' },
    { en: 'calm', ru: 'Спокойный', uk: 'Спокійний', es: 'tranquilo', pos: 'adjectives' },
    { en: 'sincere', ru: 'Искренний', uk: 'Щирий', es: 'sincero', pos: 'adjectives' },
    { en: 'distant', ru: 'Далёкий; отдалённый', uk: 'Далекий; віддалений', es: 'distante', pos: 'adjectives' },
    { en: 'goal', ru: 'Цель', uk: 'Мета', es: 'meta', pos: 'nouns' },
    { en: 'blade', ru: 'Лезвие', uk: 'Лезо', es: 'cuchilla', pos: 'nouns' },
    { en: 'politician', ru: 'Политик', uk: 'Політик', es: 'político', pos: 'nouns' },
    { en: 'committee', ru: 'Комитет', uk: 'Комітет', es: 'comité', pos: 'nouns' },
    { en: 'modesty', ru: 'Скромность', uk: 'Скромність', es: 'modestia', pos: 'nouns' },
    { en: 'campaign', ru: 'Кампания', uk: 'Кампанія', es: 'campaña', pos: 'nouns' },
    { en: 'seatbelt', ru: 'Ремень безопасности', uk: 'Ремінь безпеки', es: 'cinturón de seguridad', pos: 'nouns' },
    { en: 'thoroughly', ru: 'Тщательно', uk: 'Ретельно', es: 'minuciosamente', pos: 'adverbs' },
    { en: 'meal', ru: 'Прием пищи', uk: 'Прийом їжі', es: 'comida', pos: 'nouns' },
    { en: 'proud', ru: 'Гордый', uk: 'Гордий', es: 'orgulloso', pos: 'adjectives' },
    { en: 'marathon', ru: 'Марафон', uk: 'Марафон', es: 'maratón', pos: 'nouns' },
    { en: 'again', ru: 'Снова', uk: 'Знову', es: 'de nuevo', pos: 'adverbs' },
    { en: 'tough', ru: 'Трудный / жёсткий', uk: 'Важкий / жорсткий', es: 'difícil', pos: 'adjectives' },
    { en: 'decided', ru: 'Решил(а)', uk: 'Вирішив(ла)', es: 'decidió', pos: 'verbs' },
    { en: 'praises', ru: 'Хвалит; похвала', uk: 'Хвалить; похвала', es: 'alaba; elogios', pos: 'verbs' },
    { en: 'study', ru: 'Исследование / занятия', uk: 'Дослідження / заняття', es: 'estudio', pos: 'nouns' },
    { en: 'world', ru: 'Мир', uk: 'Світ', es: 'mundo', pos: 'nouns' },
    { en: 'shaves', ru: 'Бреется (он)', uk: 'Голиться (він)', es: 'se afeita', pos: 'verbs' },
    { en: 'taught', ru: 'Учил, преподавал', uk: 'Вчив, викладав', es: 'enseñó', pos: 'verbs' },
    { en: 'stay', ru: 'Оставаться; пребывание', uk: 'Залишатися; перебування', es: 'permanecer', pos: 'verbs' },
    { en: 'critical', ru: 'Критический; критичный', uk: 'Критичний; критичний (важливий)', es: 'crítico', pos: 'adjectives' },
    { en: 'expert', ru: 'Эксперт', uk: 'Експерт', es: 'experto', pos: 'nouns' },
    { en: 'field', ru: 'Поле, область', uk: 'Поле, галузь', es: 'campo', pos: 'nouns' },
    { en: 'dissatisfied', ru: 'Недовольный', uk: 'Невдоволений', es: 'insatisfecho', pos: 'adjectives' },
    { en: 'citizen', ru: 'Гражданин', uk: 'Громадянин', es: 'ciudadano', pos: 'nouns' },
    { en: 'case', ru: 'Случай; дело; кейс', uk: 'Випадок; справа', es: 'caso', pos: 'nouns' },
    { en: 'reminds', ru: 'Напоминает', uk: 'Нагадує', es: 'recuerda', pos: 'verbs' },
    { en: 'exam', ru: 'Экзамен', uk: 'Екзамен', es: 'examen', pos: 'nouns' },
    { en: 'active', ru: 'Активный', uk: 'Активний', es: 'activo', pos: 'adjectives' },
    { en: 'volunteer', ru: 'Волонтёр', uk: 'Волонтер', es: 'voluntario', pos: 'nouns' },
    { en: 'leader', ru: 'Лидер', uk: 'Лідер', es: 'líder', pos: 'nouns' },
    { en: 'creative', ru: 'Творческий', uk: 'Творчий', es: 'creativo', pos: 'adjectives' },
    { en: 'speech', ru: 'Выступление; речь', uk: 'Виступ; промова', es: 'discurso', pos: 'nouns' },
    { en: 'lazy', ru: 'Ленивый', uk: 'Ледачий', es: 'perezoso', pos: 'adjectives' },
    { en: 'boy', ru: 'Мальчик', uk: 'Хлопчик', es: 'chico', pos: 'nouns' },
    { en: 'blames', ru: 'Винит', uk: 'Звинувачує', es: 'culpa', pos: 'verbs' },
    { en: 'annoying', ru: 'Раздражающий', uk: 'Дратівливий', es: 'irritante', pos: 'adjectives' },
  ],
  29: [
    { en: 'achievement', ru: 'Достижение', uk: 'Досягнення', es: 'logro', pos: 'nouns' },
    { en: 'ancient', ru: 'Древний', uk: 'Древній', es: 'antiguo', pos: 'adjectives' },
    { en: 'appetizer', ru: 'Закуска', uk: 'Закуска', es: 'aperitivo', pos: 'nouns' },
    { en: 'architect', ru: 'Архитектор', uk: 'Архітектор', es: 'arquitecto', pos: 'nouns' },
    { en: 'attic', ru: 'Чердак', uk: 'Горище', es: 'ático', pos: 'nouns' },
    { en: 'bitter', ru: 'Горький', uk: 'Гіркий', es: 'amargo', pos: 'adjectives' },
    { en: 'blueprint', ru: 'Чертеж', uk: 'Креслення', es: 'plano', pos: 'nouns' },
    { en: 'classical', ru: 'Классический', uk: 'Класичний', es: 'clásico', pos: 'adjectives' },
    { en: 'conference', ru: 'Конференция', uk: 'Конференція', es: 'conferencia', pos: 'nouns' },
    { en: 'design', ru: 'Проектировать', uk: 'Проєктувати', es: 'diseñar', pos: 'verbs' },
    { en: 'discuss', ru: 'Обсуждать', uk: 'Обговорювати', es: 'comentar', pos: 'verbs' },
    { en: 'doubt', ru: 'Сомнение; сомневаться', uk: 'Сумнів; сумніватися', es: 'duda; dudar', pos: 'verbs' },
    { en: 'engineer', ru: 'Инженер', uk: 'Інженер', es: 'ingeniero', pos: 'nouns' },
    { en: 'entrance', ru: 'Вход', uk: 'Вхід', es: 'entrada', pos: 'nouns' },
    { en: 'exotic', ru: 'Экзотический', uk: 'Екзотичний', es: 'exótico', pos: 'adjectives' },
    { en: 'guard', ru: 'Охранник', uk: 'Охоронець', es: 'guardia', pos: 'nouns' },
    { en: 'indifference', ru: 'Безразличие', uk: 'Байдужість', es: 'indiferencia', pos: 'nouns' },
    { en: 'landscape', ru: 'Пейзаж', uk: 'Пейзаж', es: 'paisaje', pos: 'nouns' },
    { en: 'lecture', ru: 'Лекция', uk: 'Лекція', es: 'charla; clase', pos: 'nouns' },
    { en: 'metropolis', ru: 'Мегаполис', uk: 'Мегаполіс', es: 'metrópoli', pos: 'nouns' },
    { en: 'novel', ru: 'Роман', uk: 'Роман', es: 'novela', pos: 'nouns' },
    { en: 'prestigious', ru: 'Престижный', uk: 'Престижний', es: 'prestigioso', pos: 'adjectives' },
    { en: 'rare', ru: 'Редкий', uk: 'Рідкісний', es: 'poco común', pos: 'adjectives' },
    { en: 'strategy', ru: 'Стратегия', uk: 'Стратегія', es: 'estrategia', pos: 'nouns' },
    { en: 'trust', ru: 'Доверять', uk: 'Довіряти', es: 'confiar', pos: 'verbs' },
    { en: 'unique', ru: 'Уникальный', uk: 'Унікальний', es: 'único', pos: 'adjectives' },
    { en: 'dwell', ru: 'Обитать', uk: 'Мешкати', es: 'habitar', pos: 'irregular_verbs' },
    { en: 'limit', ru: 'Ограничивать', uk: 'Обмежувати', es: 'limitar', pos: 'verbs' },
    { en: 'overcome', ru: 'Преодолевать', uk: 'Долати', es: 'superar', pos: 'irregular_verbs' },
    { en: 'fly', ru: 'Летать', uk: 'Літати', es: 'volar', pos: 'irregular_verbs' },
    { en: 'suburb', ru: 'Пригород', uk: 'Передмістя', es: 'suburbio', pos: 'nouns' },
    { en: 'drought', ru: 'Засуха', uk: 'Посуха', es: 'sequía', pos: 'nouns' },
    { en: 'temple', ru: 'Храм', uk: 'Храм', es: 'templo', pos: 'nouns' },
    { en: 'injury', ru: 'Травма', uk: 'Травма', es: 'lesión', pos: 'nouns' },
    { en: 'mentor', ru: 'Наставник', uk: 'Наставник', es: 'mentor', pos: 'nouns' },
    { en: 'factory', ru: 'Завод', uk: 'Завод', es: 'fábrica', pos: 'nouns' },
    { en: 'coast', ru: 'Побережье', uk: 'Узбережжя', es: 'costa', pos: 'nouns' },
    { en: 'theater', ru: 'Театр', uk: 'Театр', es: 'teatro', pos: 'nouns' },
    { en: 'marble', ru: 'Мрамор', uk: 'Мармур', es: 'mármol', pos: 'nouns' },
    { en: 'shelter', ru: 'Приют', uk: 'Притулок', es: 'refugio', pos: 'nouns' },
    { en: 'council', ru: 'Совет', uk: 'Рада', es: 'consejo', pos: 'nouns' },
    { en: 'kingdom', ru: 'Королевство', uk: 'Королівство', es: 'reino', pos: 'nouns' },
    { en: 'victory', ru: 'Победа', uk: 'Перемога', es: 'victoria', pos: 'nouns' },
    { en: 'humble', ru: 'Скромный', uk: 'Скромний', es: 'humilde', pos: 'adjectives' },
    { en: 'organic', ru: 'Органический', uk: 'Органічний', es: 'orgánico', pos: 'adjectives' },
    { en: 'fertile', ru: 'Плодородный', uk: 'Родючий', es: 'fértil', pos: 'adjectives' },
    { en: 'outstanding', ru: 'Выдающийся', uk: 'Видатний', es: 'sobresaliente', pos: 'adjectives' },
    { en: 'decisive', ru: 'Решающий', uk: 'Вирішальний', es: 'decisivo', pos: 'adjectives' },
    { en: 'childhood', ru: 'Детство', uk: 'Дитинство', es: 'infancia', pos: 'nouns' },
    { en: 'southern', ru: 'Южный', uk: 'Південний', es: 'meridional', pos: 'adjectives' },
    { en: 'solemn', ru: 'Торжественный', uk: 'Урочистий', es: 'solemne', pos: 'adjectives' },
    { en: 'cigarette', ru: 'Сигарета', uk: 'Сигарета', es: 'cigarrillo', pos: 'nouns' },
    { en: 'meditation', ru: 'Медитация', uk: 'Медитація', es: 'meditación', pos: 'nouns' },
    { en: 'philosophical', ru: 'Философский', uk: 'Філософський', es: 'filosófico', pos: 'adjectives' },
    { en: 'distance', ru: 'Расстояние', uk: 'Відстань', es: 'distancia', pos: 'nouns' },
    { en: 'opportunity', ru: 'Возможность', uk: 'Можливість', es: 'oportunidad', pos: 'nouns' },
    { en: 'opportunities', ru: 'Возможности', uk: 'Можливості', es: 'oportunidades', pos: 'nouns' },
    { en: 'knee', ru: 'Колено', uk: 'Коліно', es: 'rodilla', pos: 'nouns' },
    { en: 'development', ru: 'Развитие', uk: 'Розвиток', es: 'desarrollo', pos: 'nouns' },
    { en: 'antique', ru: 'Антикварный', uk: 'Антикварний', es: 'antiguo', pos: 'adjectives' },
    { en: 'university', ru: 'Университет', uk: 'Університет', es: 'universidad', pos: 'nouns' },
    { en: 'universities', ru: 'Университеты', uk: 'Університети', es: 'universidades', pos: 'nouns' },
    { en: 'loving', ru: 'Любящий, нежный', uk: 'Ласкавий, люблячий', es: 'cariñoso', pos: 'adjectives' },
    { en: 'award', ru: 'Награда', uk: 'Нагорода', es: 'premio', pos: 'nouns' },
    { en: 'rescuer', ru: 'Спасатель', uk: 'Рятувальник', es: 'rescatista', pos: 'nouns' },
    { en: 'dispute', ru: 'Спор', uk: 'Суперечка', es: 'disputa', pos: 'nouns' },
    { en: 'lend', ru: 'Одолжать', uk: 'Позичати (комусь)', es: 'prestar', pos: 'irregular_verbs' },
    { en: 'professor', ru: 'Профессор', uk: 'Професор', es: 'profesor', pos: 'nouns' },
    { en: 'pilot', ru: 'Пилот', uk: 'Пілот', es: 'piloto', pos: 'nouns' },
    { en: 'due', ru: 'Предстоящий; должный', uk: "Запланований; зобов'язаний", es: 'pendiente; debido', pos: 'adjectives' },
    { en: 'constant', ru: 'Постоянный', uk: 'Постійний', es: 'constante', pos: 'adjectives' },
    { en: 'practice', ru: 'Практика; практиковать', uk: 'Практика; практикувати', es: 'práctica', pos: 'nouns' },
    { en: 'pianist', ru: 'Пианист', uk: 'Піаніст', es: 'pianista', pos: 'nouns' },
    { en: 'jewelry', ru: 'Ювелирные изделия', uk: 'Ювелірні вироби', es: 'joyas', pos: 'nouns' },
    { en: 'social', ru: 'Социальный', uk: 'Соціальний', es: 'social', pos: 'adjectives' },
    { en: 'gathering', ru: 'Собрание', uk: 'Зібрання', es: 'reunión', pos: 'nouns' },
    { en: 'society', ru: 'Общество', uk: 'Суспільство', es: 'sociedad', pos: 'nouns' },
    { en: 'curious', ru: 'Любопытный', uk: 'Цікавий', es: 'curioso', pos: 'adjectives' },
    { en: 'cover', ru: 'Обложка; покрывать', uk: 'Обкладинка; покривати', es: 'cubierta; cubrir', pos: 'nouns' },
    { en: 'military', ru: 'Военный', uk: 'Воєнний', es: 'militar', pos: 'adjectives' },
    { en: 'obstacle', ru: 'Препятствие', uk: 'Перешкода', es: 'obstáculo', pos: 'nouns' },
    { en: 'ultimate', ru: 'Окончательный, в высшей степени', uk: 'Кінцевий, найвищий', es: 'último', pos: 'adjectives' },
    { en: 'elegant', ru: 'Изящный', uk: 'Елегантний', es: 'elegante', pos: 'adjectives' },
    { en: 'sculpture', ru: 'Скульптура', uk: 'Скульптура', es: 'escultura', pos: 'nouns' },
    { en: 'obvious', ru: 'Очевидный', uk: 'Очевидний', es: 'obvio', pos: 'adjectives' },
    { en: 'surgery', ru: 'Операция (мед.)', uk: 'Операція (мед.)', es: 'cirugía', pos: 'nouns' },
    { en: 'central', ru: 'Центральный', uk: 'Центральний', es: 'central', pos: 'adjectives' },
    { en: 'hospital', ru: 'Больница', uk: 'Лікарня', es: 'hospital', pos: 'nouns' },
    { en: 'devoted', ru: 'Преданный', uk: 'Відданий', es: 'dedicado', pos: 'adjectives' },
    { en: 'complicated', ru: 'Сложный', uk: 'Складний', es: 'complicado', pos: 'adjectives' },
    { en: 'fair', ru: 'Справедливый; ярмарка', uk: 'Справедливий; ярмарок', es: 'justo', pos: 'adjectives' },
    { en: 'prosperous', ru: 'Процветающий', uk: 'Процвітаючий', es: 'próspero', pos: 'adjectives' },
    { en: 'subtle', ru: 'Тонкий, едва заметный', uk: 'Тонкий, ледь помітний', es: 'sutil', pos: 'adjectives' },
    { en: 'final', ru: 'Финальный, последний', uk: 'Фінальний, останній', es: 'final', pos: 'adjectives' },
  ],
  30: [
    { en: 'documentary', ru: 'Документальный фильм', uk: 'Документальний фільм', es: 'documental', pos: 'nouns' },
    { en: 'innovative', ru: 'Инновационный', uk: 'Інноваційний', es: 'innovador', pos: 'adjectives' },
    { en: 'recently', ru: 'Недавно', uk: 'Нещодавно', es: 'recientemente', pos: 'adverbs' },
    { en: 'lay', ru: 'Класть; лёг (lay)', uk: 'Класти; лежав (форма lie/lay)', es: 'poner', pos: 'irregular_verbs' },
    { en: 'popular', ru: 'Популярный', uk: 'Популярний', es: 'popular', pos: 'adjectives' },
    { en: 'graphics', ru: 'Графика (комп.); изображение', uk: 'Графіка (комп.); зображення', es: 'gráficos', pos: 'nouns' },
    { en: 'exquisite', ru: 'Изысканный', uk: 'Вишуканий', es: 'exquisito', pos: 'adjectives' },
    { en: 'version', ru: 'Версия', uk: 'Версія', es: 'versión', pos: 'nouns' },
    { en: 'describes', ru: 'Описывает', uk: 'Описує', es: 'describe', pos: 'verbs' },
    { en: 'technological', ru: 'Технологический', uk: 'Технологічний', es: 'tecnológico', pos: 'adjectives' },
    { en: 'chain', ru: 'Цепочка; цепь', uk: 'Ланцюжок; ланцюг', es: 'cadena', pos: 'nouns' },
    { en: 'girl', ru: 'Девочка, девушка', uk: 'Дівчинка, дівчина', es: 'chica', pos: 'nouns' },
    { en: 'collapse', ru: 'Обрушиться; рухнуть', uk: 'Обвалитися; зруйнуватися', es: 'colapsar', pos: 'verbs' },
    { en: 'exhibited', ru: 'Выставил(а)', uk: 'Виставив(ла)', es: 'exhibió', pos: 'verbs' },
    { en: 'abstract', ru: 'Абстрактный, отвлечённый', uk: 'Абстрактний, відвлечений', es: 'abstracto', pos: 'adjectives' },
    { en: 'content', ru: 'Содержимое', uk: 'Вміст', es: 'contenido', pos: 'nouns' },
    { en: 'belonged', ru: 'Принадлежало', uk: 'Належало', es: 'pertenecía', pos: 'verbs' },
    { en: 'contains', ru: 'Содержит', uk: 'Містить', es: 'contiene', pos: 'verbs' },
    { en: 'quality', ru: 'Качество', uk: 'Якість', es: 'calidad', pos: 'nouns' },
    { en: 'recommended', ru: 'Рекомендовал', uk: 'Рекомендував', es: 'recomendado', pos: 'verbs' },
    { en: 'journalist', ru: 'Журналист', uk: 'Журналіст', es: 'periodista', pos: 'nouns' },
    { en: 'refused', ru: 'Отказался', uk: 'Відмовився', es: 'rechazado', pos: 'verbs' },
    { en: 'board', ru: 'Доска; борт; совет', uk: 'Дошка; борт; рада', es: 'junta', pos: 'nouns' },
    { en: 'thanked', ru: 'Поблагодарил', uk: 'Подякував', es: 'agradecido', pos: 'verbs' },
    { en: 'analyst', ru: 'Аналитик', uk: 'Аналітик', es: 'analista', pos: 'nouns' },
    { en: 'detected', ru: 'Обнаружил', uk: 'Виявив', es: 'detectado', pos: 'verbs' },
    { en: 'audit', ru: 'Аудит, проверка', uk: 'Аудит, перевірка', es: 'auditoría', pos: 'nouns' },
    { en: 'medical', ru: 'Медицинский', uk: 'Медичний', es: 'médico', pos: 'adjectives' },
    { en: 'mysterious', ru: 'Загадочный, таинственный', uk: 'Загадковий, таємничий', es: 'misterioso', pos: 'adjectives' },
    { en: 'electrician', ru: 'Электрик', uk: 'Електрик', es: 'electricista', pos: 'nouns' },
    { en: 'wiring', ru: 'Проводка (эл.)', uk: 'Проводка (ел.)', es: 'alambrado', pos: 'nouns' },
    { en: 'exhibit', ru: 'Экспонат', uk: 'Експонат', es: 'exhibición', pos: 'nouns' },
    { en: 'represent', ru: 'Представлять, олицетворять', uk: 'Представляти, втілювати', es: 'representar', pos: 'verbs' },
    { en: 'civilization', ru: 'Цивилизация (AmE)', uk: 'Цивілізація (AmE)', es: 'civilización', pos: 'nouns' },
    { en: 'arranged', ru: 'Организовал, устроил', uk: 'Організував, влаштував', es: 'organizado', pos: 'verbs' },
    { en: 'cheerful', ru: 'Весёлый', uk: 'Веселий', es: 'alegre', pos: 'adjectives' },
    { en: 'picnic', ru: 'Пикник', uk: 'Пікнік', es: 'picnic', pos: 'nouns' },
    { en: 'controversial', ru: 'Спорный', uk: 'Суперечливий', es: 'controversial', pos: 'adjectives' },
    { en: 'theory', ru: 'Теория', uk: 'Теорія', es: 'teoría', pos: 'nouns' },
    { en: 'argument', ru: 'Аргумент', uk: 'Аргумент', es: 'argumento', pos: 'nouns' },
    { en: 'caused', ru: 'Вызвало, привело', uk: 'Викликало, призвело', es: 'causado', pos: 'verbs' },
    { en: 'latte', ru: 'Латте (кофе)', uk: 'Лате (кава)', es: 'café con leche', pos: 'nouns' },
    { en: 'spy', ru: 'Шпион', uk: 'Шпигун', es: 'espía', pos: 'nouns' },
    { en: 'spies', ru: 'Шпионы', uk: 'Шпигуни', es: 'espías', pos: 'nouns' },
    { en: 'surgeon', ru: 'Хирург', uk: 'Хірург', es: 'cirujano', pos: 'nouns' },
    { en: 'operation', ru: 'Операция', uk: 'Операція', es: 'operación', pos: 'nouns' },
    { en: 'human', ru: 'Человеческий, человек', uk: 'Людський, людина', es: 'humano', pos: 'adjectives' },
    { en: 'jewel', ru: 'Драгоценность', uk: 'Коштовність', es: 'joya', pos: 'nouns' },
    { en: 'jeweler', ru: 'Ювелир (AmE)', uk: 'Ювелір (AmE: jeweler)', es: 'joyero', pos: 'nouns' },
    { en: 'edge', ru: 'Край', uk: 'Край', es: 'borde', pos: 'nouns' },
    { en: 'leading', ru: 'Ведущий, главный', uk: 'Провідний, головний', es: 'principal', pos: 'adjectives' },
    { en: 'celebrated', ru: 'Праздновал(а)', uk: 'Святкував(ла)', es: 'celebró', pos: 'verbs' },
    { en: 'author', ru: 'Автор', uk: 'Автор', es: 'autor', pos: 'nouns' },
    { en: 'published', ru: 'Опубликовали', uk: 'Опублікували', es: 'publicado', pos: 'verbs' },
    { en: 'landlord', ru: 'Арендодатель', uk: 'Орендодавець', es: 'propietario', pos: 'nouns' },
    { en: 'action', ru: 'Действие', uk: 'Дія', es: 'acción', pos: 'nouns' },
    { en: 'prevented', ru: 'Предотвратили', uk: 'Запобігли', es: 'prevenido', pos: 'verbs' },
    { en: 'terrible', ru: 'Ужасный', uk: 'Жахливий', es: 'horrible', pos: 'adjectives' },
    { en: 'disaster', ru: 'Катастрофа', uk: 'Катастрофа', es: 'desastre', pos: 'nouns' },
    { en: 'ceremony', ru: 'Церемония', uk: 'Церемонія', es: 'ceremonia', pos: 'nouns' },
    { en: 'distinguished', ru: 'Уважаемый; видный', uk: 'Поважаний; видатний', es: 'distinguido', pos: 'adjectives' },
    { en: 'diploma', ru: 'Диплом', uk: 'Диплом', es: 'diploma', pos: 'nouns' },
    { en: 'tradition', ru: 'Традиция', uk: 'Традиція', es: 'tradición', pos: 'nouns' },
    { en: 'preserved', ru: 'Сохранили', uk: 'Зберегли', es: 'en conserva', pos: 'verbs' },
    { en: 'developed', ru: 'Разработали, развили', uk: 'Розробили, розвинули', es: 'desarrollado', pos: 'verbs' },
    { en: 'major', ru: 'Крупный, основной; специальность (вуз)', uk: 'Крупний, основний; спеціальність (у виші)', es: 'importante', pos: 'adjectives' },
    { en: 'company', ru: 'Компания', uk: 'Компанія', es: 'empresa', pos: 'nouns' },
    { en: 'captain', ru: 'Капитан', uk: 'Капітан', es: 'capitán', pos: 'nouns' },
    { en: 'navigation', ru: 'Навигация', uk: 'Навігація', es: 'navegación', pos: 'nouns' },
    { en: 'skill', ru: 'Навык', uk: 'Навичка', es: 'habilidad', pos: 'nouns' },
    { en: 'storm', ru: 'Буря, шторм', uk: 'Буря, шторм', es: 'tormenta', pos: 'nouns' },
    { en: 'peaceful', ru: 'Мирный, спокойный', uk: 'Мирний, спокійний', es: 'pacífico', pos: 'adjectives' },
    { en: 'rose', ru: 'Роза', uk: 'Троянда', es: 'rosa', pos: 'nouns' },
    { en: 'bloom', ru: 'Цвести', uk: 'Цвісти', es: 'florecer', pos: 'verbs' },
  ],
  31: [
    { en: 'demand', ru: 'Требовать', uk: 'Вимагати', es: 'exigir', pos: 'verbs' },
    { en: 'conduct', ru: 'Проводить', uk: 'Проводити', es: 'dirigir', pos: 'verbs' },
    { en: 'verify', ru: 'Проверять', uk: 'Перевіряти', es: 'verificar', pos: 'verbs' },
    { en: 'shake', ru: 'Трясти', uk: 'Трусити', es: 'agitar', pos: 'irregular_verbs' },
    { en: 'carpenter', ru: 'Плотник', uk: 'Тесляр', es: 'carpintero', pos: 'nouns' },
    { en: 'supplier', ru: 'Поставщик', uk: 'Постачальник', es: 'proveedor', pos: 'nouns' },
    { en: 'tenant', ru: 'Жилец', uk: 'Мешканець', es: 'arrendatario', pos: 'nouns' },
    { en: 'thesis', ru: 'Диссертация', uk: 'Дисертація', es: 'tesis', pos: 'nouns' },
    { en: 'tremor', ru: 'Толчок', uk: 'Поштовх', es: 'temblor', pos: 'nouns' },
    { en: 'injection', ru: 'Инъекция', uk: "Ін'єкція", es: 'inyección', pos: 'nouns' },
    { en: 'forecast', ru: 'Прогноз', uk: 'Прогноз', es: 'pronóstico', pos: 'nouns' },
    { en: 'furious', ru: 'Разъяренный', uk: 'Розлючений', es: 'furioso', pos: 'adjectives' },
    { en: 'pale', ru: 'Бледный', uk: 'Блідий', es: 'pálido', pos: 'adjectives' },
    { en: 'painless', ru: 'Безболезненный', uk: 'Безболісний', es: 'sin dolor', pos: 'adjectives' },
    { en: 'perfectly', ru: 'Идеально', uk: 'Ідеально', es: 'perfectamente', pos: 'adverbs' },
    { en: 'efficiently', ru: 'Эффективно', uk: 'Ефективно', es: 'eficientemente', pos: 'adverbs' },
    { en: 'flight', ru: 'Полёт, рейс', uk: 'Політ, рейс', es: 'vuelo', pos: 'nouns' },
    { en: 'procedure', ru: 'Процедура', uk: 'Процедура', es: 'procedimiento', pos: 'nouns' },
    { en: 'raindrop', ru: 'Капля дождя', uk: 'Крапля дощу', es: 'gota de agua', pos: 'nouns' },
    { en: 'fall', ru: 'Падать; осень (AmE fall)', uk: 'Падати; осінь (AmE fall)', es: 'caer', pos: 'irregular_verbs' },
    { en: 'shoulder', ru: 'Плечо', uk: 'Плече', es: 'hombro', pos: 'nouns' },
    { en: 'jazz', ru: 'Джаз', uk: 'Джаз', es: 'jazz', pos: 'nouns' },
    { en: 'composition', ru: 'Сочинение, состав', uk: 'Твір, склад', es: 'composición', pos: 'nouns' },
    { en: 'earth', ru: 'Земля (планета); почва', uk: 'Земля; ґрунт', es: 'tierra', pos: 'nouns' },
    { en: 'unknown', ru: 'Неизвестный', uk: 'Невідомий', es: 'desconocido', pos: 'adjectives' },
    { en: 'slot', ru: 'Слот, щель', uk: 'Слот, щілина', es: 'ranura', pos: 'nouns' },
    { en: 'protester', ru: 'Протестующий', uk: 'Протестувальник', es: 'manifestante', pos: 'nouns' },
    { en: 'political', ru: 'Политический', uk: 'Політичний', es: 'político', pos: 'adjectives' },
    { en: 'slogan', ru: 'Лозунг', uk: 'Гасло', es: 'lema', pos: 'nouns' },
    { en: 'strike', ru: 'Удар; забастовка', uk: 'Удар; страйк', es: 'huelga', pos: 'nouns' },
    { en: 'lonely', ru: 'Одинокий', uk: 'Самотній', es: 'solitario', pos: 'adjectives' },
    { en: 'face', ru: 'Лицо; лицом к', uk: 'Обличчя; зіткнутися', es: 'rostro', pos: 'nouns' },
    { en: 'production', ru: 'Производство, постановка', uk: 'Виробництво, вистава', es: 'producción', pos: 'nouns' },
    { en: 'quota', ru: 'Квота, норма', uk: 'Квота, норма', es: 'cuota', pos: 'nouns' },
    { en: 'trunk', ru: 'Багажник; ствол', uk: 'Багажник; стовбур', es: 'trompa', pos: 'nouns' },
    { en: 'layer', ru: 'Слой', uk: 'Шар', es: 'capa', pos: 'nouns' },
    { en: 'genius', ru: 'Гений', uk: 'Геній', es: 'genio', pos: 'nouns' },
    { en: 'refund', ru: 'Возврат (денег)', uk: 'Повернення (коштів)', es: 'reembolso', pos: 'nouns' },
    { en: 'fabric', ru: 'Ткань', uk: 'Тканина', es: 'tela', pos: 'nouns' },
    { en: 'sensitive', ru: 'Чувствительный', uk: 'Чутливий', es: 'sensible', pos: 'adjectives' },
    { en: 'skin', ru: 'Кожа', uk: 'Шкіра', es: 'piel', pos: 'nouns' },
    { en: 'archaeologist', ru: 'Археолог (AmE)', uk: 'Археолог (AmE)', es: 'arqueólogo', pos: 'nouns' },
    { en: 'rewrite', ru: 'Переписать', uk: 'Переписати', es: 'volver a escribir', pos: 'verbs' },
    { en: 'graduation', ru: 'Выпуск (из учебного)', uk: 'Випуск (закінчення)', es: 'graduación', pos: 'nouns' },
    { en: 'violinist', ru: 'Скрипач(ка)', uk: 'Скрипаль(ка)', es: 'violinista', pos: 'nouns' },
    { en: 'melody', ru: 'Мелодия', uk: 'Мелодія', es: 'melodía', pos: 'nouns' },
    { en: 'square', ru: 'Площадь, квадратный', uk: 'Площа, квадратний', es: 'cuadrado', pos: 'nouns' },
    { en: 'steam', ru: 'Пар', uk: 'Пар', es: 'vapor', pos: 'nouns' },
    { en: 'mayor', ru: 'Мэр', uk: 'Мер', es: 'alcalde', pos: 'nouns' },
    { en: 'hit', ru: 'Ударять; хит', uk: 'Вдаряти; хіт', es: 'golpear', pos: 'verbs' },
    { en: 'arm', ru: 'Рука (от плеча до кисти)', uk: 'Рука (від плеча до кисті)', es: 'brazo', pos: 'nouns' },
    { en: 'hand', ru: 'Рука (кисть)', uk: 'Рука (кисть)', es: 'mano', pos: 'nouns' },
    { en: 'bare', ru: 'Голый, оголённый', uk: 'Голий, оголений', es: 'desnudo', pos: 'adjectives' },
  ],
  32: [
    // Словарь урока 32 (LESSON_32_VOCABULARY) + смысловые формы из фраз (00_rules.md)
    { en: 'tedious', ru: 'Скучный (утомительный)', uk: 'Нудний (втомлюючий)', es: 'tedioso', pos: 'adjectives' },
    { en: 'innovative', ru: 'Инновационный', uk: 'Інноваційний', es: 'innovador', pos: 'adjectives' },
    { en: 'steep', ru: 'Крутой', uk: 'Стрімкий', es: 'empinado', pos: 'adjectives' },
    { en: 'cliff', ru: 'Утёс, крутой обрыв', uk: 'Урвище, крутий обрив', es: 'acantilado', pos: 'nouns' },
    { en: 'equipment', ru: 'Оборудование', uk: 'Обладнання', es: 'equipo', pos: 'nouns' },
    { en: 'cautious', ru: 'Осторожный', uk: 'Обережний', es: 'prudente, cauteloso', pos: 'adjectives' },
    { en: 'narrow', ru: 'Узкий', uk: 'Вузький', es: 'estrecho', pos: 'adjectives' },
    { en: 'research', ru: 'Исследование', uk: 'Дослідження', es: 'investigación', pos: 'nouns' },
    { en: 'avoid', ru: 'Избегать', uk: 'Уникати', es: 'evitar', pos: 'verbs' },
    { en: 'warehouse', ru: 'Склад', uk: 'Склад', es: 'almacén', pos: 'nouns' },
    { en: 'goods', ru: 'Товары', uk: 'Товари', es: 'mercancías, bienes', pos: 'nouns' },
    { en: 'vital', ru: 'Жизненно важный', uk: 'Життєво важливий', es: 'vital', pos: 'adjectives' },
    { en: 'accidentally', ru: 'Случайно', uk: 'Випадково', es: 'accidentalmente', pos: 'adverbs' },
    { en: 'intern', ru: 'Стажер', uk: 'Стажер', es: 'becario, practicante', pos: 'nouns' },
    { en: 'opinion', ru: 'Мнение', uk: 'Думка', es: 'opinión', pos: 'nouns' },
    { en: 'confidential', ru: 'Конфиденциальный', uk: 'Конфіденційний', es: 'confidencial', pos: 'adjectives' },
    { en: 'accurate', ru: 'Точный', uk: 'Точний', es: 'preciso', pos: 'adjectives' },
    { en: 'testimony', ru: 'Показания', uk: 'Свідчення', es: 'testimonio', pos: 'nouns' },
    { en: 'trial', ru: 'Судебный процесс', uk: 'Судовий процес', es: 'juicio', pos: 'nouns' },
    { en: 'volunteer', ru: 'Волонтёр', uk: 'Волонтер', es: 'voluntario', pos: 'nouns' },
    { en: 'sincere', ru: 'Искренний', uk: 'Щирий', es: 'sincero', pos: 'adjectives' },
    { en: 'dedication', ru: 'Преданность', uk: 'Відданість', es: 'dedicación', pos: 'nouns' },
    { en: 'community', ru: 'Сообщество', uk: 'Громада', es: 'comunidad', pos: 'nouns' },
    { en: 'honesty', ru: 'Честность', uk: 'Чесність', es: 'honestidad', pos: 'nouns' },
    { en: 'justice', ru: 'Правосудие', uk: 'Правосуддя', es: 'justicia', pos: 'nouns' },
    { en: 'curious', ru: 'Любопытный', uk: 'Цікавий', es: 'curioso', pos: 'adjectives' },
    { en: 'negotiation', ru: 'Переговоры', uk: 'Переговори', es: 'negociación', pos: 'nouns' },
    { en: 'incompetent', ru: 'Некомпетентный', uk: 'Некомпетентний', es: 'incompetente', pos: 'adjectives' },
    { en: 'warning', ru: 'Предупреждение', uk: 'Попередження', es: 'advertencia', pos: 'nouns' },
    { en: 'steady', ru: 'Твёрдый (уверенный)', uk: 'Твердий (впевнений)', es: 'firme, seguro', pos: 'adjectives' },
    { en: 'grateful', ru: 'Признательный', uk: 'Вдячний', es: 'agradecido', pos: 'adjectives' },
    { en: 'audience', ru: 'Аудитория', uk: 'Аудиторія', es: 'público, asistentes', pos: 'nouns' },
    { en: 'structure', ru: 'Сооружение', uk: 'Споруда', es: 'estructura', pos: 'nouns' },
    { en: 'safety', ru: 'Безопасность', uk: 'Безпека', es: 'seguridad', pos: 'nouns' },
    { en: 'thoroughly', ru: 'Тщательно', uk: 'Ретельно', es: 'a fondo, minuciosamente', pos: 'adverbs' },
    { en: 'stranger', ru: 'Незнакомец', uk: 'Незнайомець', es: 'desconocido', pos: 'nouns' },
    { en: 'bold', ru: 'Смелый', uk: 'Сміливий', es: 'audaz', pos: 'adjectives' },
    { en: 'attic', ru: 'Чердак', uk: 'Горище', es: 'desván, buhardilla', pos: 'nouns' },
    { en: 'valuable', ru: 'Ценный', uk: 'Цінний', es: 'valioso', pos: 'adjectives' },
    { en: 'lecture', ru: 'Лекция', uk: 'Лекція', es: 'conferencia, clase magistral', pos: 'nouns' },
    { en: 'obstacle', ru: 'Препятствие', uk: 'Перешкода', es: 'obstáculo', pos: 'nouns' },
    { en: 'nimble', ru: 'Ловкий', uk: 'Спритний', es: 'ágil', pos: 'adjectives' },
    { en: 'statistical', ru: 'Статистический', uk: 'Статистичний', es: 'estadístico', pos: 'adjectives' },
    { en: 'conclusion', ru: 'Вывод', uk: 'Висновок', es: 'conclusión', pos: 'nouns' },
    { en: 'irresponsible', ru: 'Безответственный', uk: 'Безвідповідальний', es: 'irresponsable', pos: 'adjectives' },
    { en: 'vacate', ru: 'Освобождать, покидать (помещение)', uk: 'Звільняти, залишати (приміщення)', es: 'desalojar, dejar libre', pos: 'verbs' },
    { en: 'potential', ru: 'Потенциальный', uk: 'Потенційний', es: 'potencial', pos: 'adjectives' },
    { en: 'entirely', ru: 'Полностью', uk: 'Повністю', es: 'enteramente, por completo', pos: 'adverbs' },
    { en: 'refuse', ru: 'Отказываться', uk: 'Відмовлятися', es: 'negarse (a)', pos: 'verbs' },
    { en: 'guarantee', ru: 'Гарантировать', uk: 'Гарантувати', es: 'garantizar', pos: 'verbs' },
    { en: 'mouse', ru: 'Мышь', uk: 'Миша', es: 'ratón', pos: 'nouns' },
    { en: 'mice', ru: 'Мыши', uk: 'Миші', es: 'ratones', pos: 'nouns' },
    { en: 'half', ru: 'Половина', uk: 'Половина', es: 'mitad', pos: 'nouns' },
    { en: 'halves', ru: 'Половины', uk: 'Половини', es: 'mitades', pos: 'nouns' },
    { en: 'thief', ru: 'Вор', uk: 'Злодій', es: 'ladrón', pos: 'nouns' },
    { en: 'thieves', ru: 'Воры', uk: 'Злодії', es: 'ladrones', pos: 'nouns' },
    { en: 'lady', ru: 'Дама', uk: 'Дама', es: 'dama, señora', pos: 'nouns' },
    { en: 'ladies', ru: 'Дамы', uk: 'Дами', es: 'damas', pos: 'nouns' },
    { en: 'party', ru: 'Сторона (в суде)', uk: 'Сторона в суді', es: 'parte (jurídica)', pos: 'nouns' },
    { en: 'parties', ru: 'Стороны (в суде); вечеринки', uk: 'Сторони в суді; вечірки', es: 'partes (jur.); fiestas', pos: 'nouns' },
    { en: 'aggressively', ru: 'Агрессивно', uk: 'Агресивно', es: 'agresivamente', pos: 'adverbs' },
    { en: 'analyze', ru: 'Анализировать (AmE)', uk: 'Аналізувати (AmE)', es: 'analizar', pos: 'verbs' },
    { en: 'arrogantly', ru: 'Высокомерно', uk: 'Зарозуміло', es: 'arrogantemente', pos: 'adverbs' },
    { en: 'assignment', ru: 'Задание (в т.ч. домашнее)', uk: 'Завдання (у т. ч. домашнє)', es: 'tarea, asignación', pos: 'nouns' },
    { en: 'awful', ru: 'Ужасный', uk: 'Жахливий', es: 'horrible', pos: 'adjectives' },
    { en: 'circling', ru: 'Кружит', uk: 'Кружляє', es: 'dando vueltas', pos: 'verbs' },
    { en: 'climb', ru: 'Влезать, карабкаться', uk: 'Лізти, підніматися', es: 'trepar, escalar', pos: 'verbs' },
    { en: 'complaining', ru: 'Жалуется', uk: 'Скаржиться', es: 'quejándose', pos: 'verbs' },
    { en: 'concluded', ru: 'Завершённый; подведён итог', uk: 'Завершений; підбито підсумок', es: 'concluido', pos: 'adjectives' },
    { en: 'cyberattack', ru: 'Кибератака', uk: 'Кібератака', es: 'ciberataque', pos: 'nouns' },
    { en: 'damaged', ru: 'Повреждённый', uk: 'Пошкоджений', es: 'dañado', pos: 'adjectives' },
    { en: 'delicate', ru: 'Хрупкий; деликатный', uk: 'Крихкий; делікатний', es: 'delicado', pos: 'adjectives' },
    { en: 'depends', ru: 'Зависит', uk: 'Залежить', es: 'depende', pos: 'verbs' },
    { en: 'destroyed', ru: 'Разрушенный, уничтоженный', uk: 'Зруйнований', es: 'destruido', pos: 'adjectives' },
    { en: 'detective', ru: 'Детектив', uk: 'Детектив', es: 'detective', pos: 'nouns' },
    { en: 'earlier', ru: 'Раньше', uk: 'Раніше', es: 'antes', pos: 'adverbs' },
    { en: 'expect', ru: 'Ожидать', uk: 'Очікувати', es: 'esperar', pos: 'verbs' },
    { en: 'expected', ru: 'Ожидаемый; ожидали', uk: 'Очікуваний; очікували', es: 'esperado', pos: 'adjectives' },
    { en: 'extremely', ru: 'Чрезвычайно', uk: 'Надзвичайно', es: 'extremadamente', pos: 'adverbs' },
    { en: 'frightened', ru: 'Испуганный', uk: 'Переляканий', es: 'asustado', pos: 'adjectives' },
    { en: 'giving', ru: 'Даёт', uk: 'Дає', es: 'dando', pos: 'verbs' },
    { en: 'making', ru: 'Делает', uk: 'Робить', es: 'haciendo', pos: 'verbs' },
    { en: 'nest', ru: 'Гнездо', uk: 'Гніздо', es: 'nido', pos: 'nouns' },
    { en: 'package', ru: 'Посылка, упаковка', uk: 'Посилка, упаковка', es: 'paquete', pos: 'nouns' },
    { en: 'rather', ru: 'Скорее; довольно', uk: 'Радше; досить', es: 'bastante; preferiría (would rather)', pos: 'adverbs' },
    { en: 'rebuilt', ru: 'Восстановленный, перестроенный', uk: 'Відбудований, перебудований', es: 'reconstruido', pos: 'adjectives' },
    { en: 'relies', ru: 'Полагается, опирается', uk: 'Покладається, спирається', es: 'confía (en)', pos: 'verbs' },
    { en: 'rely', ru: 'Полагаться, опираться', uk: 'Покладатися, спиратися', es: 'confiar (en)', pos: 'verbs' },
    { en: 'representative', ru: 'Представитель', uk: 'Представник', es: 'representante', pos: 'nouns' },
    { en: 'securely', ru: 'Надёжно, безопасно', uk: 'Надійно, безпечно', es: 'de forma segura', pos: 'adverbs' },
    { en: 'several', ru: 'Несколько', uk: 'Кілька', es: 'varios', pos: 'adjectives' },
    { en: 'spot', ru: 'Место; тесный участок', uk: 'Місце; тісне місце', es: 'sitio; hueco', pos: 'nouns' },
    { en: 'surprised', ru: 'Удивлённый', uk: 'Здивований', es: 'sorprendido', pos: 'adjectives' },
    { en: 'vibration', ru: 'Вибрация', uk: 'Вібрація', es: 'vibración', pos: 'nouns' },
    { en: 'remote', ru: 'Отдалённый; пульт', uk: 'Віддалений; пульт', es: 'remoto', pos: 'adjectives' },
    { en: 'region', ru: 'Регион, область', uk: 'Регіон, область', es: 'región', pos: 'nouns' },
  ],
};

/** Лексикон всех поверхностных форм глаголов (verbs + irregular_verbs) для BFS-лемматизации словаря. */
function collectVerbSurfaceLexicon(raw: Record<number, Word[]>): Set<string> {
  const s = new Set<string>();
  for (const id of Object.keys(raw).map(Number)) {
    for (const w of raw[id] ?? []) {
      if (w.pos === 'verbs' || w.pos === 'irregular_verbs') {
        s.add(w.en.trim().toLowerCase());
      }
    }
  }
  return s;
}

function morphNeighborsForVerbLemma(lower: string, lex: Set<string>): string[] {
  const out = new Set<string>();
  const add = (x: string) => {
    if (x.length >= 2) out.add(x);
  };
  if (lower.endsWith('ies') && lower.length >= 4) add(lower.slice(0, -3) + 'y');
  if (/(ches|shes|xes|zes|oes|ses)$/.test(lower) && lower.length >= 4) add(lower.slice(0, -2));
  else if (lower.endsWith('es') && lower.length >= 4) add(lower.slice(0, -2));
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length >= 3) {
    const a = lower.slice(0, -1);
    if (lex.has(a)) add(a);
  }
  if (lower.endsWith('ing') && lower.length > 4) {
    const b = lower.slice(0, -3);
    add(b);
    add(b + 'e');
    if (b.length >= 2 && b[b.length - 1] === b[b.length - 2]) add(b.slice(0, -1));
  }
  if (lower.endsWith('ied')) add(lower.slice(0, -3) + 'y');
  else if (lower.endsWith('ed') && lower.length > 3) {
    add(lower.slice(0, -2));
    const st = lower.slice(0, -2);
    if (st.length >= 2) add(st + 'e');
  }
  return [...out];
}

/** Инфинитив / словарная форма для строк из уроков (только pos `verbs`). */
function canonicalLemmaVerb(lower: string, lex: Set<string>): string {
  const q = [lower];
  const seen = new Set<string>();
  const hits: string[] = [];
  while (q.length) {
    const cur = q.shift()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    if (lex.has(cur)) hits.push(cur);
    for (const nb of morphNeighborsForVerbLemma(cur, lex)) {
      if (!seen.has(nb)) q.push(nb);
    }
  }
  if (!hits.length) return lower;
  const minLen = Math.min(...hits.map((h) => h.length));
  let cand = hits.filter((h) => h.length === minLen);
  if (cand.length > 1 && cand.includes(lower)) {
    const others = cand.filter((h) => h !== lower);
    if (others.length) cand = others;
  }
  cand.sort((a, b) => a.localeCompare(b));
  return cand[0]!;
}

const NOUN_PLURAL_SURFACE_EXCEPTIONS = new Set([
  'belongings',
  'boots',
  'children',
  'genius',
  'glasses',
  'goods',
  'graphics',
  'groceries',
  'halves',
  'headphones',
  'knives',
  'leaves',
  'metropolis',
  'mice',
  'news',
  'overalls',
  'people',
  'scissors',
  'series',
  'shoes',
  'shelves',
  'sneakers',
  'species',
  'stairs',
  'sunglasses',
  'thesis',
  'thieves',
]);

const NOUN_LEMMA_GLOSS_OVERRIDES: Record<string, Pick<Word, 'ru' | 'uk' | 'es'>> = {
  book: { ru: 'Книга', uk: 'Книжка', es: 'libro' },
  cookie: { ru: 'Печенье', uk: 'Печиво', es: 'galleta' },
  name: { ru: 'Имя', uk: "Ім'я", es: 'nombre' },
  word: { ru: 'Слово', uk: 'Слово', es: 'palabra' },
};

function canonicalLemmaNoun(lower: string): string {
  if (NOUN_PLURAL_SURFACE_EXCEPTIONS.has(lower)) return lower;
  if (/[^aeiou]ies$/.test(lower) && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('ves') && lower.length > 4) return lower.slice(0, -3) + 'f';
  if (/(ches|shes|xes|zes|sses)$/.test(lower) && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('oes') && lower.length > 4) return lower.slice(0, -1);
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return lower.slice(0, -1);
  return lower;
}

function canonicalDictionaryEnglish(w: Word, verbLex: Set<string>): string {
  const lower = w.en.trim().toLowerCase();
  if (w.pos === 'verbs') return canonicalLemmaVerb(lower, verbLex);
  if (w.pos === 'nouns') return canonicalLemmaNoun(lower);
  return lower;
}

function bankDictionaryKey(w: Word, verbLex: Set<string>): string {
  return canonicalDictionaryEnglish(w, verbLex);
}

function mergeSurfaceToLemma(w: Word, lemma: string, singularNounGlosses?: Map<string, Word>): Word {
  const lem = lemma.trim().toLowerCase();
  if (w.en.trim().toLowerCase() === lem) return w;
  const esFromMap = LESSON_WORD_ES_BY_EN[lem]?.trim();
  const nounOverride = w.pos === 'nouns' ? NOUN_LEMMA_GLOSS_OVERRIDES[lem] : undefined;
  const singularNoun = w.pos === 'nouns' ? singularNounGlosses?.get(lem) : undefined;
  return {
    ...w,
    en: lem,
    ru: nounOverride?.ru ?? singularNoun?.ru ?? w.ru,
    uk: nounOverride?.uk ?? singularNoun?.uk ?? w.uk,
    es: nounOverride?.es ?? singularNoun?.es ?? esFromMap ?? w.es,
  };
}

/**
 * Слова урока для словаря/тренажёра: лемма EN для `verbs`, без повторов леммы внутри урока
 * и без повторов между уроками (первое вхождение по номеру урока сохраняется).
 * Строки `irregular_verbs` в исходнике не меняем — они по-прежнему в массиве урока, но в словаре/тренажёре скрыты.
 */
function buildWordsByLessonForBank(raw: Record<number, Word[]>): Record<number, Word[]> {
  const verbLex = collectVerbSurfaceLexicon(raw);
  const lessonIds = Object.keys(raw).map(Number).sort((a, b) => a - b);
  const singularNounGlosses = new Map<string, Word>();
  for (const lid of lessonIds) {
    for (const w of raw[lid] ?? []) {
      if (w.pos !== 'nouns') continue;
      const en = w.en.trim().toLowerCase();
      if (canonicalLemmaNoun(en) === en && !singularNounGlosses.has(en)) {
        singularNounGlosses.set(en, w);
      }
    }
  }
  const firstOcc = new Map<string, { lessonId: number; index: number }>();
  for (const lid of lessonIds) {
    const arr = raw[lid] ?? [];
    for (let i = 0; i < arr.length; i++) {
      const w = arr[i]!;
      if (w.pos === 'irregular_verbs') continue;
      const k = bankDictionaryKey(w, verbLex);
      if (!firstOcc.has(k)) firstOcc.set(k, { lessonId: lid, index: i });
    }
  }
  const out: Record<number, Word[]> = {};
  for (const lid of lessonIds) {
    const arr = raw[lid] ?? [];
    const rowOut: Word[] = [];
    for (let i = 0; i < arr.length; i++) {
      const w = arr[i]!;
      if (w.pos === 'irregular_verbs') {
        rowOut.push(w);
        continue;
      }
      const k = bankDictionaryKey(w, verbLex);
      const fo = firstOcc.get(k);
      if (!fo || fo.lessonId !== lid || fo.index !== i) continue;
      if (w.pos === 'verbs' || w.pos === 'nouns') {
        const lemma = canonicalDictionaryEnglish(w, verbLex);
        rowOut.push(mergeSurfaceToLemma(w, lemma, singularNounGlosses));
      } else {
        rowOut.push(w);
      }
    }
    out[lid] = rowOut;
  }
  return out;
}

const WORDS_BY_LESSON_FOR_BANK = buildWordsByLessonForBank(WORDS_BY_LESSON);

/**
 * Слова урока для словаря и тренажёра: без `irregular_verbs` (отдельный экран «Неправильные глаголы»)
 * и без дублей he/she/it (…s / …es), если в том же уроке уже есть соответствующая лемма.
 */
export function lessonWordBank(lessonId: number): Word[] {
  const raw = WORDS_BY_LESSON_FOR_BANK[lessonId] ?? WORDS_BY_LESSON_FOR_BANK[1]!;
  const noIrreg = raw.filter((w) => w.pos !== 'irregular_verbs');
  const ens = new Set(noIrreg.map((w) => w.en.toLowerCase()));
  return noIrreg.filter((w) => {
    if (w.pos !== 'verbs') return true;
    const l = w.en.toLowerCase();
    if (!l.endsWith('s')) return true;
    if (l.endsWith('ss')) return true;
    if (ens.has(l.slice(0, -1))) return false;
    if (l.endsWith('ies') && l.length >= 4) {
      const y = l.slice(0, -3) + 'y';
      if (ens.has(y)) return false;
    }
    if (l.endsWith('es') && l.length >= 4) {
      const stem = l.slice(0, -2);
      if (stem.length >= 2 && ens.has(stem)) return false;
    }
    return true;
  });
}

const groupByPOS = (words: Word[], lang: Lang) => {
  const map: Partial<Record<POS, Word[]>> = {};
  for (const w of words) {
    if (!map[w.pos]) map[w.pos] = [];
    map[w.pos]!.push(w);
  }
  return (['pronouns','verbs','irregular_verbs','adjectives','adverbs','nouns'] as POS[])
    .filter(k => map[k]?.length)
    .map(k => ({
      title: pickTriLang(lang, {
        ru: POS_LABELS_RU[k],
        uk: POS_LABELS_UK[k],
        es: POS_LABELS_ES[k],
      }),
      data: map[k]!,
    }));
};

const fy = <T,>(a: T[]): T[] => { const r=[...a]; for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];} return r; };

// Cross-lesson pool: deduped union of all lesson words for expanding distractors
const ALL_WORDS_FLAT: Word[] = (() => {
  const seen = new Set<string>();
  const result: Word[] = [];
  for (const id of Object.keys(WORDS_BY_LESSON).map(Number)) {
    for (const w of lessonWordBank(id)) {
      if (!seen.has(w.en)) {
        seen.add(w.en);
        result.push(w);
      }
    }
  }
  return result;
})();

const LESSON_WORD_BANK_EN_SET = new Set(ALL_WORDS_FLAT.map((w) => w.en));

/**
 * Старые ключи прогресса (мн. ч.) до singularize — см. scripts/singularize_lesson_vocab.py.
 * Плюс `jewels` → `jewel`, если осталось в сохранении после правок словаря.
 */
const LEGACY_PLURAL_WORD_COUNT_MERGES: Record<string, string> = {
  friends: 'friend',
  enemies: 'enemy',
  books: 'book',
  dishes: 'dish',
  keys: 'key',
  letters: 'letter',
  strangers: 'stranger',
  ads: 'ad',
  details: 'detail',
  masks: 'mask',
  messages: 'message',
  rules: 'rule',
  secrets: 'secret',
  tickets: 'ticket',
  vegetables: 'vegetable',
  cards: 'card',
  mistakes: 'mistake',
  taxes: 'tax',
  groceries: 'grocery bag',
  guests: 'guest',
  bookings: 'booking',
  chargers: 'charger',
  documents: 'document',
  mondays: 'Monday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  saturdays: 'Saturday',
  sundays: 'Sunday',
  thursdays: 'Thursday',
  tuesdays: 'Tuesday',
  wednesdays: 'Wednesday',
  weekends: 'weekend',
  apples: 'apple',
  cafes: 'cafe',
  cars: 'car',
  desserts: 'dessert',
  magazines: 'magazine',
  mountains: 'mountain',
  pens: 'pen',
  pharmacies: 'pharmacy',
  photos: 'photo',
  places: 'place',
  printers: 'printer',
  questions: 'question',
  stars: 'star',
  students: 'student',
  tasks: 'task',
  towels: 'towel',
  trees: 'tree',
  windows: 'window',
  days: 'day',
  hours: 'hour',
  minutes: 'minute',
  plants: 'plant',
  shelves: 'shelf',
  shoes: 'shoe',
  suitcases: 'suitcase',
  bags: 'bag',
  fruits: 'fruit',
  words: 'word',
  armchairs: 'armchair',
  boots: 'boot',
  gloves: 'glove',
  batteries: 'battery',
  papers: 'paper',
  terms: 'term',
  people: 'person',
  children: 'child',
  builders: 'builder',
  conditions: 'condition',
  farmers: 'farmer',
  flowers: 'flower',
  gardeners: 'gardener',
  gifts: 'gift',
  panels: 'panel',
  gates: 'gate',
  berries: 'berry',
  watches: 'watch',
  blueprints: 'blueprint',
  lamps: 'lamp',
  newspapers: 'newspaper',
  stairs: 'stair step',
  sneakers: 'sneaker',
  boxes: 'box',
  bushes: 'bush',
  clouds: 'cloud',
  forests: 'forest',
  hills: 'hill',
  parks: 'park',
  tables: 'table',
  employees: 'employee',
  crumbs: 'crumb',
  bananas: 'banana',
  blankets: 'blanket',
  buildings: 'building',
  clocks: 'clock',
  cookies: 'cookie',
  curtains: 'curtain',
  drones: 'drone',
  knives: 'knife',
  licenses: 'license',
  maps: 'map',
  mice: 'mouse',
  nuts: 'nut',
  ribbons: 'ribbon',
  rings: 'ring',
  scarves: 'scarf',
  tomatoes: 'tomato',
  tools: 'tool',
  addresses: 'address',
  bottles: 'bottle',
  clients: 'client',
  coins: 'coin',
  colleagues: 'colleague',
  deals: 'deal',
  drops: 'drop',
  folders: 'folder',
  hands: 'hand',
  jackets: 'jacket',
  leaflets: 'leaflet',
  parcels: 'parcel',
  plates: 'plate',
  problems: 'problem',
  socks: 'sock',
  snacks: 'snack',
  grapes: 'grape',
  pears: 'pear',
  jewels: 'jewel',
};

function mergeLegacyPluralLessonWordCounts(counts: Record<string, number>): { counts: Record<string, number>; dirty: boolean } {
  let dirty = false;
  const out = { ...counts };
  for (const [legacyPlural, canonical] of Object.entries(LEGACY_PLURAL_WORD_COUNT_MERGES)) {
    if (legacyPlural === canonical) continue;
    if (out[legacyPlural] == null) continue;
    if (LESSON_WORD_BANK_EN_SET.has(legacyPlural)) continue;
    if (!LESSON_WORD_BANK_EN_SET.has(canonical)) continue;
    const a = Number(out[canonical]) || 0;
    const b = Number(out[legacyPlural]) || 0;
    out[canonical] = Math.max(a, b);
    delete out[legacyPlural];
    dirty = true;
  }
  return { counts: dirty ? out : counts, dirty };
}

// 6 вариантов – правильный гарантирован, дистракторы того же POS
// Всегда берём часть из cross-lesson для разнообразия (не всегда одни и те же слова урока)
type RoundType = 'recognition' | 'context';

/** Слишком близко по смыслу к «cafe» — путают в узнавании EN. */
const CAFE_EN_DISTRACTOR_SKIP = new Set<string>(['place', 'places']);

/** issue в уроке 7 рядом с «проблема» во фразе — в шести кнопках путают с problem и answer (#error_reports). */
const ISSUE_RECOGNITION_DISTRACTOR_SKIP = new Set<string>(['answer', 'problem']);

const makeOptions = (correct: Word, all: Word[]): string[] => {
  const notMe = (w: Word) => w.en !== correct.en;
  const posOk = (w: Word) =>
    !(correct.en === 'cafe' && CAFE_EN_DISTRACTOR_SKIP.has(w.en)) &&
    !(correct.en === 'issue' && ISSUE_RECOGNITION_DISTRACTOR_SKIP.has(w.en));
  const lessonSamePos = fy(all.filter(w => notMe(w) && w.pos === correct.pos && posOk(w)));
  const fromLesson    = lessonSamePos.slice(0, Math.min(3, lessonSamePos.length));
  const fromCross = fy(
    ALL_WORDS_FLAT.filter(
      w =>
        notMe(w) &&
        w.pos === correct.pos &&
        posOk(w) &&
        !fromLesson.some(l => l.en === w.en),
    ),
  ).slice(0, 5 - fromLesson.length);
  let combined = [...fromLesson, ...fromCross];
  if (combined.length < 5) {
    const fallback = fy(
      [...all, ...ALL_WORDS_FLAT].filter(
        w => notMe(w) && posOk(w) && !combined.some(c => c.en === w.en),
      ),
    );
    combined = [...combined, ...fallback].slice(0, 5);
  }
  return fy([...combined.slice(0, 5).map(w => w.en), correct.en]);
};

interface Card {
  word: Word;
  options: string[];
  correctOption: string;
  roundIndex: number;  // 0 | 1 | 2 — какой именно раунд
  roundType: RoundType;
  question: string;
}

function wordTranslation(word: Word, lang: Lang): string {
  return lessonWordRecognitionPrompt(word, lang);
}

function buildCard(word: Word, roundIndex: number, all: Word[], lang: Lang): Card {
  const correctOption = word.en;
  const translation = wordTranslation(word, lang);
  const options = makeOptions(word, all);
  if (roundIndex === 1 && word.context) {
    return { word, options, correctOption, roundIndex, roundType: 'context', question: word.context };
  }
  return { word, options, correctOption, roundIndex, roundType: 'recognition', question: translation };
}

/** One source of truth for queue + counts (shuffle runs once). */
function makeTrainingQueueState(
  words: Word[],
  initialLearned: string[],
  initialCounts: Record<string, number>,
  lang: Lang,
): { counts: Record<string, number>; queue: Card[]; learnedCnt: number } {
  const notLearned = words.filter(w => !initialLearned.includes(w.en));
  const pool = notLearned.length > 0 ? notLearned : words;
  const cards: Card[] = [];
  for (const w of pool) {
    const done = Math.min(initialCounts[w.en] ?? 0, REQUIRED);
    for (let r = done; r < REQUIRED; r++) {
      cards.push(buildCard(w, r, pool, lang));
    }
  }
  return {
    counts: { ...initialCounts },
    queue: shuffleNoConsecutive(cards),
    learnedCnt: initialLearned.length,
  };
}

// ── Мини-гексагон ────────────────────────────────────────────────────────────
// Flat-top hex: flat edges at top/bottom, pointed left/right
function MiniHex({ filled, partial, size = 16 }: { filled: boolean; partial?: boolean; size?: number }) {
  const { theme: t, isDark } = useTheme();
  const w     = size;
  const h     = w * 0.866;  // √3/2
  const emptyColor = isDark ? t.bgSurface2 : t.textMuted + '55';
  const color = filled ? t.correct : partial ? t.correct + '55' : emptyColor;
  return <FlatTopHexFill width={w} height={h} fill={color} />;
}

// ── ТРЕНИРОВКА ───────────────────────────────────────────────────────────────
function Training({ words, storageKey, lessonId, lang, initialLearned, initialCounts, wordProgressVersion, onCountUpdate, userName: userNameProp = '', onNoEnergy }: { words:Word[]; storageKey:string; lessonId: number; lang: Lang; initialLearned:string[]; initialCounts:Record<string,number>; wordProgressVersion:number; onCountUpdate:(word:string, count:number)=>void; userName?: string; onNoEnergy: () => void }) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { theme:t, f, themeMode } = useTheme();
  const { s } = useLang();
  const router = useRouter();
  const ws = s.words;
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';

  const { energy: currentEnergy, isUnlimited: testerEnergyDisabled, spendOne } = useEnergy();
  const currentEnergyRef = useRef(currentEnergy);
  const testerEnergyDisabledRef = useRef(testerEnergyDisabled);
  const spendOneRef = useRef(spendOne);
  useEffect(() => { currentEnergyRef.current = currentEnergy; }, [currentEnergy]);
  useEffect(() => { testerEnergyDisabledRef.current = testerEnergyDisabled; }, [testerEnergyDisabled]);
  useEffect(() => { spendOneRef.current = spendOne; }, [spendOne]);

  const onNoEnergyRef = useRef(onNoEnergy);
  useEffect(() => { onNoEnergyRef.current = onNoEnergy; }, [onNoEnergy]);
  const [practiceRepeatConfirm, setPracticeRepeatConfirm] = useState(false);

  // Состояние прогресса слов (сколько раундов пройдено). Окно рисуется сразу; с диска подмешиваем после (см. effect).
  const [counts, setCounts] = useState<Record<string, number>>({ ...initialCounts });
  const [queue, setQueue] = useState<Card[]>(() => makeTrainingQueueState(words, initialLearned, initialCounts, lang).queue);
  const [qIdx,       setQIdx]       = useState(0);
  const [chosen,     setChosen]     = useState<string|null>(null);
  const [dotCount,   setDotCount]   = useState(0); // кружочки – обновляются сразу
  const [totalPts,   setTotalPts]   = useState(0);
  const [learnedCnt, setLearnedCnt] = useState(initialLearned.length);
  const sessionTouchedRef = useRef(false);
  const prevCardKeyRef = useRef('');
  // Счётчик ошибок на слово в этой сессии (для порога тренера: 2+ ошибки → активация)
  const wordMistakeCountRef = useRef<Record<string, number>>({});
  const [userName,   setUserName]   = useState(userNameProp);
  const [hapticsOn,  setHapticsOn]  = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [allDone,    setAllDone]    = useState(false);
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const [xpToastAmount, setXpToastAmount] = useState(3);
  const xpMultiplierRef = useRef(1);

  /** Снизу вверх + фейд; исчезновение — фейд и лёгкий подъём */
  const xpTranslateY = useRef(new Animated.Value(44)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const cardShownAt = useRef<number>(Date.now());
  const showXpToast = (amount: number = 3) => {
    setXpToastAmount(amount);
    const rise = 44;
    const easeIn = Easing.out(Easing.cubic);
    const easeOut = Easing.in(Easing.cubic);
    xpTranslateY.setValue(rise);
    xpOpacity.setValue(0);
    setXpToastVisible(true);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(xpTranslateY, { toValue: 0, duration: 420, easing: easeIn, useNativeDriver: true }),
        Animated.timing(xpOpacity, { toValue: 1, duration: 400, easing: easeIn, useNativeDriver: true }),
      ]),
      Animated.delay(1000),
      Animated.parallel([
        Animated.timing(xpOpacity, { toValue: 0, duration: 480, easing: easeOut, useNativeDriver: true }),
        Animated.timing(xpTranslateY, { toValue: -12, duration: 480, easing: easeOut, useNativeDriver: true }),
      ]),
    ]).start(() => setXpToastVisible(false));
  };

  // Блокировка: не даём запустить обработку дважды
  const locked = useRef(false);

  useEffect(() => {
    if (!userNameProp) AsyncStorage.getItem('user_name').then(n => { if(n) setUserName(n); });
    loadSettings().then(s => { setHapticsOn(s.haptics); setSpeechRate(s.speechRate ?? 1.0); });
    getCurrentMultiplier().then(m => { xpMultiplierRef.current = m; }).catch(() => {});
  }, [userNameProp]);

  useEffect(() => {
    if (!allDone) return;
    void playActivityCompletionModalSound();
  }, [allDone]);

  // AsyncStorage догнал: пересобрать очередь по сохранённому прогрессу, но только пока юзер ещё не ответил.
  useEffect(() => {
    if (wordProgressVersion < 1) return;
    if (sessionTouchedRef.current) return;
    if (Object.keys(initialCounts).length === 0) return;
    const s = makeTrainingQueueState(words, initialLearned, initialCounts, lang);
    setCounts(s.counts);
    setQueue(s.queue);
    setLearnedCnt(s.learnedCnt);
    setQIdx(0);
    setChosen(null);
    setAllDone(false);
    setTotalPts(0);
    locked.current = false;
    prevCardKeyRef.current = '';
  }, [wordProgressVersion, words, lang, initialLearned, initialCounts]);

  const current: Card | undefined = queue[qIdx % Math.max(queue.length, 1)];
  React.useEffect(() => {
    const key = current ? `${current.word.en}:${current.roundIndex}` : '';
    if (key && key !== prevCardKeyRef.current) {
      prevCardKeyRef.current = key;
      setDotCount(counts[current!.word.en] ?? 0);
      cardShownAt.current = Date.now();
    }
  }, [counts, current]);

  const handleChoice = async (opt: string) => {
    if (locked.current || chosen !== null || !current) return;
    // Блокируем если энергия кончилась
    if (!testerEnergyDisabledRef.current && currentEnergyRef.current <= 0) {
      onNoEnergyRef.current();
      return;
    }
    sessionTouchedRef.current = true;
    locked.current = true;

    setChosen(opt);
    const isRight = opt === current.correctOption;
    const wordEn = current.word.en;

    if (isRight) {
      setDotCount(c => Math.min(c + 1, REQUIRED));
      const prevCount = counts[wordEn] ?? 0;
      const newCount = prevCount + 1;
      const wordJustCompleted = newCount >= REQUIRED;
      const xpThisStep = wordJustCompleted ? POINTS_PER_CORRECT + POINTS_PER_LEARNED : POINTS_PER_CORRECT;
      const previewMultiplier = await getCurrentMultiplier().catch(() => xpMultiplierRef.current);
      xpMultiplierRef.current = previewMultiplier;
      showXpToast(Math.round(xpThisStep * previewMultiplier));
      setTotalPts(p => p + xpThisStep);
    }

    // Озвучиваем сразу на текущей карточке, чтобы звук не уезжал на следующий вопрос.
    speakAudio(wordEn, speechRate);
    if (!isRight && hapticsOn) {
      void hapticError();
    }

    setTimeout(() => {
      const newQueue = [...queue];

      if (isRight) {
        const prevCount = counts[wordEn] ?? 0;
        const newCount = prevCount + 1;
        const newCounts = { ...counts, [wordEn]: newCount };
        setCounts(newCounts);
        onCountUpdate(wordEn, newCount);

        // Сохраняем полный объект counts напрямую — без read-modify-write (нет race condition)
        void AsyncStorage.setItem(storageKey + '_words', JSON.stringify(newCounts));

        // Удаляем текущую карточку из очереди
        newQueue.splice(qIdx % newQueue.length, 1);

        const wordJustCompleted = newCount >= REQUIRED;
        if (userName) {
          void (async () => {
            try {
              await registerXP(POINTS_PER_CORRECT, 'vocabulary_learned', userName, lang);
              if (wordJustCompleted) {
                await registerXP(POINTS_PER_LEARNED, 'vocabulary_learned', userName, lang);
              }
            } catch {}
          })();
        }

        if (wordJustCompleted) {
          void bumpStatsDaily('words_learned', 1);
          // Слово выучено — убираем все оставшиеся карточки этого слова из очереди
          const finalQ = newQueue.filter(c => c.word.en !== current.word.en);
          const newLearned = Math.min(learnedCnt + 1, words.length);
          updateMultipleTaskProgress([{ type: 'words_learned' }, { type: 'daily_active' }]);
          if (finalQ.length === 0) {
            setLearnedCnt(newLearned); setQueue(finalQ); setAllDone(true);
            setChosen(null); locked.current = false;
            // Осколок за завершение раздела слов (единоразово)
            AsyncStorage.getItem(`${storageKey}_words_shards_granted`).then(done => {
              if (!done) {
                addShards('lesson_completed').catch(() => {});
                AsyncStorage.setItem(`${storageKey}_words_shards_granted`, '1').catch(() => {});
              }
            }).catch(() => {});
            return;
          }
          setLearnedCnt(newLearned);
          setQueue(finalQ);
          setQIdx(qIdx % finalQ.length);
        } else {
          const nextIdx = newQueue.length > 0 ? qIdx % newQueue.length : 0;
          setQueue(newQueue);
          setQIdx(nextIdx);
        }
      } else {
        // Ошибка — логируем в аналитику и перемещаем карточку вперёд
        logMistake(current.word.en, lessonId, 'lesson_words', 'wrong_pick');
        // Тренер: считаем ошибки; при 2-й — активируем слово в очереди
        const wKey = current.word.en;
        const prevCount = wordMistakeCountRef.current[wKey] ?? 0;
        const newCount = prevCount + 1;
        wordMistakeCountRef.current[wKey] = newCount;
        if (newCount === 2) {
          void activateWordForTrainer(wKey, current.word.ru, current.word.uk, lessonId);
        } else {
          void recordWordMistake(wKey, current.word.ru, current.word.uk, lessonId);
        }
        const resetCard = buildCard(current.word, current.roundIndex, words, lang);
        newQueue.splice(qIdx % newQueue.length, 1);
        const rem = newQueue.length;
        // currentNext — индекс следующей карточки после удаления текущей
        const currentNext = rem > 0 ? qIdx % rem : 0;
        // Вставляем не раньше чем через 2 позиции от currentNext
        const minInsert = Math.min(currentNext + 2, rem);
        const maxInsert = rem;
        const insertAt = minInsert + Math.floor(Math.random() * Math.max(maxInsert - minInsert + 1, 1));
        newQueue.splice(Math.min(insertAt, rem), 0, resetCard);
        setQueue(newQueue);
        setQIdx(currentNext);

        // Тратим энергию при ошибке
        if (!testerEnergyDisabledRef.current) {
          const energyBefore = currentEnergyRef.current;
          spendOneRef.current().then(success => {
            if (success && energyBefore === 1) {
              setTimeout(() => { onNoEnergyRef.current(); }, 800);
            }
          }).catch(() => {});
        }
      }

      setChosen(null);
      locked.current = false;
    }, isRight ? ANSWER_FEEDBACK_MS.correct : ANSWER_FEEDBACK_MS.wrong);
  };

  const startPractice = () => {
    // Пересобираем очередь со ВСЕМИ словами — прогресс не меняем
    const cards: Card[] = [];
    for (const w of words) {
      for (let r = 0; r < REQUIRED; r++) {
        cards.push(buildCard(w, r, words, lang));
      }
    }
    setQueue(shuffleNoConsecutive(cards));
    setQIdx(0);
    setChosen(null);
    setLearnedCnt(words.filter(w => (counts[w.en] ?? 0) >= REQUIRED).length);
    setAllDone(false);
    locked.current = false;
  };

  const progressMetrics = useMemo(() => vocabularyProgressMetrics(words, counts), [words, counts]);

  if (allDone || queue.length === 0) return (
    <>
      <View testID="lesson-words-complete" style={{ flex:1, justifyContent:'center', alignItems:'center', gap:16, padding:20 }}>
        <View style={{ width:80,height:80,borderRadius:40,backgroundColor:t.bgCard,borderWidth:1,borderColor:t.border,justifyContent:'center',alignItems:'center' }}>
          <Ionicons name="checkmark-done-outline" size={36} color={t.correct}/>
        </View>
        <Text style={{ color:t.textPrimary, fontSize:f.h1, fontWeight:'700' }}>{ws.allLearned}</Text>
        <Text style={{ color:t.textMuted, fontSize:f.bodyLg }}>{ws.learnedOf(words.length, words.length)}</Text>
        {totalPts > 0 && (
          <View style={{ flexDirection:'row',alignItems:'center',gap:6,backgroundColor:t.correctBg,borderRadius:10,paddingHorizontal:14,paddingVertical:8 }}>
            <Ionicons name="star" size={16} color={t.correct}/>
            <Text style={{ color:t.correct, fontSize:f.bodyLg, fontWeight:'700' }}>{ws.plusPoints(totalPts)}</Text>
          </View>
        )}
        <TouchableOpacity
          testID="lesson-words-complete-back"
          style={{ backgroundColor: t.correct, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '700' }}>{pickTriLang(lang, { ru: '← К уроку', uk: '← До уроку', es: '← A la lección' })}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="lesson-words-repeat"
          style={{ backgroundColor: t.bgCard, paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={() => {
            hapticTap();
            setPracticeRepeatConfirm(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={18} color={t.textSecond} />
          <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '600' }}>{pickTriLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Repetir' })}</Text>
        </TouchableOpacity>
      </View>
      <ThemedConfirmModal
        visible={practiceRepeatConfirm}
        title={pickTriLang(lang, { ru: 'Повторение', uk: 'Повторення', es: 'Repaso' })}
        message={
          pickTriLang(lang, {
            ru: 'Прогресс сохранён. Это просто тренировка — выученные слова не сбросятся.',
            uk: 'Прогрес збережено. Це просто тренування — виучені слова не скинуться.',
            es: 'El progreso está guardado. Es solo práctica: las palabras aprendidas no se reinician.',
          })
        }
        cancelLabel={pickTriLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
        confirmLabel={pickTriLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Repetir' })}
        onCancel={() => setPracticeRepeatConfirm(false)}
        onConfirm={() => {
          setPracticeRepeatConfirm(false);
          startPractice();
        }}
        confirmVariant="accent"
      />
    </>
  );

  if (!current) return null;

  const ROUND_CONFIG: Record<RoundType, { label: string; color: string; bg: string; icon: string }> = {
    recognition: {
      label: pickTriLang(lang, { ru: 'Узнавание', uk: 'Впізнавання', es: 'Reconocimiento' }),
      color: t.correct,
      bg: t.correctBg,
      icon: 'eye-outline',
    },
    context: {
      label: pickTriLang(lang, { ru: 'Контекст', uk: 'Контекст', es: 'Contexto' }),
      color: '#4A9EFF',
      bg: 'rgba(74,158,255,0.14)',
      icon: 'text-outline',
    },
  };
  const round = ROUND_CONFIG[current.roundType];

  return (
    <View testID="lesson-words-training" style={{ flex:1, paddingHorizontal:20, paddingTop:12 }}>

      {/* Прогресс: только % и полоска (счёт по верным ответам); без числовых «шагов» и «выучено» в интерфейсе */}
      <View style={{ width:'100%', marginBottom:14 }}>
        <View style={{ flexDirection:'row', justifyContent:'flex-end', marginBottom:5, alignItems:'flex-start' }}>
          <Text style={{ color:progressMetrics.pct>0?t.correct:t.textMuted, fontSize:f.label, fontWeight:'600' }}>
            {progressMetrics.pct}%
          </Text>
        </View>
        <View style={{ height:5, backgroundColor:t.border, borderRadius:3, overflow:'hidden' }}>
          <View style={{ height:'100%', width:`${progressMetrics.pct}%` as any, backgroundColor:t.correct, borderRadius:3 }}/>
        </View>
      </View>

      {/* Гексагоны */}
      <View style={{ flexDirection:'row', justifyContent:'center', alignItems:'center', marginBottom:18 }}>
        <View style={{ flexDirection:'row', gap:8 }}>
          {[0,1,2].map(i => <MiniHex key={i} filled={dotCount > i} size={22} />)}
        </View>
      </View>

      {/* Вопрос */}
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', gap:10 }}>
        {current.roundType === 'context' ? (
          <View style={{ alignItems:'center', gap:10, paddingHorizontal:4 }}>
            <Text style={{ color:t.textGhost, fontSize:f.sub, letterSpacing:0.5 }}>
              {pickTriLang(lang, { ru: 'Вставьте слово в предложение:', uk: 'Вставте слово у речення:', es: 'Coloca la palabra en la frase:' })}
            </Text>
            <View style={{ backgroundColor: round.bg, borderRadius:16, paddingHorizontal:20, paddingVertical:16, borderWidth:1, borderColor: round.color + '40' }}>
              {(() => {
                const parts = current.question.split('...');
                return (
                  <Text style={{ color:t.textPrimary, fontSize:22, fontWeight:'400', textAlign:'center', lineHeight:32 }}>
                    {parts[0]}
                    <Text style={{ color: round.color, fontWeight:'800', letterSpacing:1 }}>{'___'}</Text>
                    {parts[1] ?? ''}
                  </Text>
                );
              })()}
            </View>
          </View>
        ) : (
          <View style={{ alignItems:'center', gap:8 }}>
            <Text style={{ color:t.textGhost, fontSize:f.sub, letterSpacing:0.5 }}>
              {pickTriLang(lang, {
                ru: 'Выберите английский перевод:',
                uk: 'Оберіть англійський переклад:',
                es: 'Elige la traducción en inglés:',
              })}
            </Text>
            <Text
              style={{ color:t.textPrimary, fontSize:38, fontWeight:'300', textAlign:'center', lineHeight:46, maxWidth:'100%' }}
              numberOfLines={4}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {current.question}
            </Text>
          </View>
        )}
      </View>

      {/* Варианты ответов — 2 колонки */}
      <View style={{ width:'100%', flexDirection:'row', flexWrap:'wrap', gap:10, paddingBottom:16 }}>
        {current.options.map((opt, i) => {
          const isCorrect  = opt === current.correctOption;
          const isSelected = opt === chosen;
          let bg = t.bgCard, borderColor = t.border, tc = t.textSecond, bw = 1;
          if (chosen !== null) {
            if (isCorrect)       { bg = t.correctBg; borderColor = t.correct; tc = t.correct; bw = 1.5; }
            else if (isSelected) { bg = t.wrongBg;   borderColor = t.wrong;   tc = t.wrong;   bw = 1.5; }
          }
          return (
            <TouchableOpacity key={i}
              testID={isCorrect ? 'lesson-words-option-correct' : `lesson-words-option-${i}`}
              style={{ width:'48%', minHeight:68, paddingVertical:12, paddingHorizontal:10, borderRadius:16, alignItems:'center', justifyContent:'center', borderWidth:bw, backgroundColor:bg, borderColor }}
              onPress={() => { hapticTap(); handleChoice(opt); }}
              activeOpacity={0.72}
              disabled={chosen !== null}
            >
              {chosen !== null && isCorrect && (
                <View style={{ position:'absolute', top:7, right:8 }}>
                  <Ionicons name="checkmark-circle" size={15} color={t.correct} />
                </View>
              )}
              {chosen !== null && isSelected && !isCorrect && (
                <View style={{ position:'absolute', top:7, right:8 }}>
                  <Ionicons name="close-circle" size={15} color={t.wrong} />
                </View>
              )}
              <Text style={{ color:tc, fontSize:f.h2, fontWeight:'500', textAlign:'center' }} numberOfLines={2} adjustsFontSizeToFit>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {current && (
        <ReportErrorButton
          screen="lesson_words"
          dataId={`word_${current.correctOption.replace(/\s+/g,'_')}`}
          dataText={[
            `${pickTriLang(lang, { ru: 'Вопрос', uk: 'Питання', es: 'Pregunta' })}: ${current.question}`,
            `${pickTriLang(lang, { ru: 'Варианты', uk: 'Варіанти', es: 'Opciones' })}: ${current.options.map(o=>o===current.correctOption?`[✓${o}]`:o).join(' | ')}`,
          ].join('\n')}
          style={{ alignSelf: 'flex-end', marginBottom: 4 }}
        />
      )}

      {/* XP Toast */}
      {xpToastVisible && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', top: 100, alignSelf: 'center',
            backgroundColor: isLightTheme ? '#92400E' : '#FFC800', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
            transform: [{ translateY: xpTranslateY }], opacity: xpOpacity, zIndex: 99999, elevation: 24,
          }}
        >
          <Text style={{ color: isLightTheme ? '#FFF3C4' : '#000', fontWeight: '700', fontSize: 16 }}>+{xpToastAmount} XP</Text>
        </Animated.View>
      )}

    </View>
  );
}

// ── СПИСОК ───────────────────────────────────────────────────────────────────
function WordList({ words, learnedCounts, lang, speechRate, lessonId, onStartTraining }: { words:Word[]; learnedCounts:Record<string,number>; lang: Lang; speechRate:number; lessonId?: number; onStartTraining?: () => void; }) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { theme: t, f, ds, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { hPad } = useScreen();
  const sections = groupByPOS(words, lang);

  return (
    <View style={{ flex:1 }}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.en}
        contentContainerStyle={{ paddingBottom: ds.spacing.xxl }}
        ListFooterComponent={
          <ReportErrorButton
            screen="lesson_words"
            dataId={`wordlist_lesson_${lessonId ?? 0}`}
            dataText={pickTriLang(lang, {
              ru: `Словарь урока ${lessonId ?? ''}`,
              uk: `Словник уроку ${lessonId ?? ''}`,
              es: `Vocabulario de la lección ${lessonId ?? ''}`,
            })}
            style={{ alignSelf: 'flex-end', marginHorizontal: hPad, marginTop: ds.spacing.sm }}
          />
        }
        ListHeaderComponent={onStartTraining ? (
          <TouchableOpacity
            onPress={onStartTraining}
            style={{ marginHorizontal: hPad, marginTop: ds.spacing.md, marginBottom: ds.spacing.xs, backgroundColor:t.bgCard, borderRadius: ds.radius.lg, paddingVertical: ds.spacing.sm, alignItems:'center', borderWidth:1, borderColor:t.border, flexDirection:'row', justifyContent:'center', gap:8 }}
          >
            <Ionicons name="pencil-outline" size={18} color={t.textSecond} />
            <Text style={{ color:t.textSecond, fontSize:f.bodyLg, fontWeight:'600' }}>
              {pickTriLang(lang, { ru: 'Начать тренировку', uk: 'Почати тренування', es: 'Comenzar práctica' })}
            </Text>
          </TouchableOpacity>
        ) : null}
        renderSectionHeader={({ section }) => (
          <View style={{ backgroundColor:t.bgPrimary, paddingHorizontal:hPad, paddingTop:ds.spacing.md, paddingBottom:ds.spacing.sm }}>
            <Text style={{ color:sx.muted, fontSize:f.label, fontWeight:'600', textTransform:'uppercase', letterSpacing:1 }}>
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const count = learnedCounts[item.en] ?? 0;
          const tr = wordTranslation(item, lang);
          return (
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: t.border }}>
              <ScrollView
                horizontal
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingLeft: hPad,
                  paddingRight: hPad,
                  paddingVertical: ds.spacing.sm,
                }}
                contentInset={{ right: hPad }}
              >
                <View style={{ flexDirection: 'row', gap: 3, marginRight: ds.spacing.sm, alignItems: 'center', flexShrink: 0 }}>
                  {[0, 1, 2].map(i => (
                    <MiniHex key={i} filled={count > i} partial={count > i && count < REQUIRED} size={11} />
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => speakAudio(item.en, speechRate)}
                  activeOpacity={0.7}
                  style={{ flexShrink: 0, marginRight: ds.spacing.sm }}
                >
                  <Text
                    maxFontSizeMultiplier={1.35}
                    style={{ color: sx.primary, fontSize: f.bodyLg, fontWeight: '600', flexShrink: 0 }}
                  >
                    {item.en}
                  </Text>
                </TouchableOpacity>
                <View style={{ flexShrink: 0, marginRight: ds.spacing.sm }}>
                  <Text maxFontSizeMultiplier={1.35} style={{ color: sx.muted, fontSize: f.body, flexShrink: 0 }}>
                    {tr}
                  </Text>
                </View>
                <View style={{ flexShrink: 0, marginRight: hPad }}>
                  <AddToFlashcard en={item.en} ru={item.ru} uk={item.uk} es={item.es} source="word" />
                </View>
              </ScrollView>
            </View>
          );
        }}
      />
    </View>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────────
export default function LessonWords() {
  const router = useRouter();
  const { theme:t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { s, lang } = useLang();
  const { energy, maxEnergy, isUnlimited: energyUnlimited } = useEnergy();
  const canTrain = energyUnlimited || energy > 0;
  const { id } = useLocalSearchParams<{ id:string }>();
  const lessonId = parseInt(id || '1', 10);
  const words = useMemo(() => lessonWordBank(lessonId), [lessonId]);
  const storageKey = `lesson${lessonId}`;
  const ws = s.words;

  const [noEnergyModalOpen, setNoEnergyModalOpen] = useState(false);
  /** null = «авто»: при 0 энергии сразу Словарь, при наличии — Повторение, без кадра с неверной вкладкой */
  const [userTab, setUserTab] = useState<'train' | 'list' | null>(null);
  const tab = userTab !== null ? userTab : (canTrain ? 'train' : 'list');
  useEffect(() => {
    if (!canTrain) setUserTab(null);
  }, [canTrain]);
  useEffect(() => {
    if (energyUnlimited || energy > 0) setNoEnergyModalOpen(false);
  }, [energyUnlimited, energy]);
  useEffect(() => {
    if (tab === 'list') void loadFlashcards();
  }, [tab]);
  const [learnedCounts, setLearnedCounts] = useState<Record<string,number>>({});
  /** +1 после завершения чтения lessonN_words (в т.ч. пусто) — тренажёр подмешивает прогресс без спиннера. */
  const [wordProgressVersion, setWordProgressVersion] = useState(0);
  const [listSpeechRate, setListSpeechRate] = useState(1.0);
  const learnedListForTraining = useMemo(
    () => Object.keys(learnedCounts).filter(k => (learnedCounts[k] ?? 0) >= REQUIRED),
    [learnedCounts],
  );
  const [userName, setUserName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
  }, []);

  useLayoutEffect(() => {
    setLearnedCounts({});
    setWordProgressVersion(0);
    setUserTab(null);
  }, [lessonId, storageKey]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey + '_words')
      .then(v => {
        if (cancelled) return;
        if (v) {
          const data = JSON.parse(v);
          let counts: Record<string, number> = {};
          if (Array.isArray(data)) {
            data.forEach((w: string) => { counts[w] = REQUIRED; });
          } else {
            counts = data;
          }
          if (lessonId === 1 && Object.values(counts).some(c => c >= REQUIRED)) {
            const pronouns = ['I', 'you', 'he', 'she', 'we', 'it'];
            let migrated = false;
            for (const p of pronouns) {
              if (!counts[p] || counts[p] < REQUIRED) { counts[p] = REQUIRED; migrated = true; }
            }
            if (migrated) AsyncStorage.setItem(storageKey + '_words', JSON.stringify(counts));
          }
          const pluralMerged = mergeLegacyPluralLessonWordCounts(counts);
          if (pluralMerged.dirty) {
            counts = pluralMerged.counts;
            AsyncStorage.setItem(storageKey + '_words', JSON.stringify(counts)).catch(() => {});
          }
          setLearnedCounts(counts);
        }
      })
      .finally(() => { if (!cancelled) setWordProgressVersion(ver => ver + 1); });
    loadSettings().then(cfg => setListSpeechRate(cfg.speechRate ?? 1.0));
    return () => { cancelled = true; };
  }, [lessonId, storageKey]);

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:15, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TouchableOpacity testID="lesson-words-header-back" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={sx.primary}/>
        </TouchableOpacity>
        <Text style={{ color:sx.primary, fontSize:f.h2, fontWeight:'600' }}>{ws.title(lessonId)}</Text>
        <LessonEnergyLightning energyCount={energy} maxEnergy={maxEnergy} shouldShake={false} />
      </View>

      <View style={{ flex:1 }}>
        {tab === 'list' ? (
          <WordList
            words={words}
            learnedCounts={learnedCounts}
            lang={lang}
            speechRate={listSpeechRate}
            lessonId={lessonId}
            onStartTraining={() => {
              if (!canTrain) {
                setNoEnergyModalOpen(true);
                return;
              }
              setUserTab('train');
            }}
          />
        ) : (
          <Training
            key={storageKey}
            words={words}
            storageKey={storageKey}
            lessonId={lessonId}
            lang={lang}
            userName={userName}
            initialLearned={learnedListForTraining}
            initialCounts={learnedCounts}
            wordProgressVersion={wordProgressVersion}
            onCountUpdate={(word, count) => setLearnedCounts(prev => ({ ...prev, [word]: count }))}
            onNoEnergy={() => setNoEnergyModalOpen(true)}
          />
        )}
      </View>

      <View style={{ flexDirection:'row', borderTopWidth:0.5, borderTopColor:t.border }}>
        {(['train','list'] as const).map(key => {
          const isActive = tab === key;
          const label = key === 'train' ? ws.training : ws.wordList;
          const icon  = key === 'train'
            ? (isActive ? 'pencil'  : 'pencil-outline')
            : (isActive ? 'list'    : 'list-outline');
          return (
            <TouchableOpacity key={key}
              testID={key === 'train' ? 'lesson-words-tab-train' : 'lesson-words-tab-list'}
              style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:14, gap:8, borderTopWidth:isActive?2:0, borderTopColor:sx.second }}
              onPress={() => {
                if (key === 'train') {
                  if (!canTrain) {
                    setNoEnergyModalOpen(true);
                    return;
                  }
                }
                setUserTab(key);
              }}
            >
              <Ionicons name={icon as any} size={20} color={isActive?sx.primary:sx.ghost}/>
              <Text style={{ color:isActive?sx.primary:sx.ghost, fontSize:f.body, fontWeight:'500' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      </ContentWrap>

      <NoEnergyModal visible={noEnergyModalOpen} onClose={() => setNoEnergyModalOpen(false)} />
    </SafeAreaView>
    </ScreenGradient>
  );
}

export const LESSONS_WITH_WORDS: Set<number> = new Set(Object.keys(WORDS_BY_LESSON).map(Number));
export const WORD_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.keys(WORDS_BY_LESSON).map((k) => {
    const id = Number(k);
    return [id, lessonWordBank(id).length] as const;
  }),
);
export const WORD_KEYS_BY_LESSON: Record<number, Set<string>> = Object.fromEntries(
  Object.keys(WORDS_BY_LESSON).map((k) => {
    const id = Number(k);
    return [id, new Set(lessonWordBank(id).map((w: Word) => w.en))] as const;
  }),
);
