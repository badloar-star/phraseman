import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudio } from '../hooks/use-audio';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { registerXP } from './xp_manager';
import { addShards } from './shards_system';
import ReportErrorButton from '../components/ReportErrorButton';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { lessonWordRecognitionPrompt } from './lesson_words_spanish_gloss';

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
 * После верного: почти сразу (ozвучка не блокирует таймер — вынесена в конец callback).
 * Неверно: дольше, чтобы увидеть ошибку.
 */
const ANSWER_FEEDBACK_MS = { correct: 800, wrong: 400 } as const;

type POS = 'pronouns'|'verbs'|'irregular_verbs'|'adjectives'|'adverbs'|'nouns';
interface Word { en:string; ru:string; uk:string; es:string; pos:POS; context?:string; definition?:string; }

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

const WORDS_BY_LESSON: Record<number, Word[]> = {
  1: [
    { en: 'I', ru: 'Я', uk: 'Я', es: 'Yo', pos: 'pronouns' },
    { en: 'you', ru: 'Ты / Вы', uk: 'Ти / Ви', es: 'Tú / usted', pos: 'pronouns' },
    { en: 'he', ru: 'Он', uk: 'Він', es: 'Él', pos: 'pronouns' },
    { en: 'she', ru: 'Она', uk: 'Вона', es: 'Ella', pos: 'pronouns' },
    { en: 'we', ru: 'Мы', uk: 'Ми', es: 'Nosotros, nosotras', pos: 'pronouns' },
    { en: 'it', ru: 'Это / Оно', uk: 'Це / Воно', es: 'Eso / ello', pos: 'pronouns' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', es: 'aquí', pos: 'adverbs' },
    { en: 'ready', ru: 'Готовый', uk: 'Готовий', es: 'listo', pos: 'adjectives' },
    { en: 'busy', ru: 'Занятый', uk: 'Зайнятий', es: 'ocupado', pos: 'adjectives' },
    { en: 'home', ru: 'Дома', uk: 'Вдома', es: 'En casa', pos: 'nouns' },
    { en: 'together', ru: 'Вместе', uk: 'Разом', es: 'juntos', pos: 'adverbs' },
    { en: 'they', ru: 'Они', uk: 'Вони', es: 'Ellos / ellas', pos: 'pronouns' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', es: 'importante', pos: 'adjectives' },
    { en: 'okay', ru: 'В порядке (хорошо)', uk: 'В порядку (добре)', es: 'vale / bien', pos: 'adjectives' },
    { en: 'right', ru: 'Правый (верный)', uk: 'Правий (вірний)', es: 'Correcto; a la derecha', pos: 'adjectives' },
    { en: 'safe', ru: 'Безопасный', uk: 'Безпечний', es: 'seguro', pos: 'adjectives' },
    { en: 'sick', ru: 'Больной', uk: 'Хворий', es: 'enfermo', pos: 'adjectives' },
    { en: 'cheap', ru: 'Дешевый', uk: 'Дешевий', es: 'barato', pos: 'adjectives' },
    { en: 'upset', ru: 'Расстроенный', uk: 'Засмучений', es: 'decepcionado', pos: 'adjectives' },
    { en: 'late', ru: 'Поздний (опоздавший)', uk: 'Пізній (той, що запізнився)', es: 'tarde', pos: 'adjectives' },
    { en: 'work', ru: 'Работа', uk: 'Робота', es: 'Trabajo', pos: 'nouns' },
    { en: 'way', ru: 'Путь', uk: 'Шлях', es: 'Camino; forma', pos: 'nouns' },
    { en: 'car', ru: 'Машина', uk: 'Машина', es: 'Coche', pos: 'nouns' },
    { en: 'free', ru: 'Бесплатный', uk: 'Безкоштовний', es: 'gratis', pos: 'adjectives' },
    { en: 'line', ru: 'Очередь', uk: 'Черга', es: 'Cola', pos: 'nouns' },
    { en: 'elevator', ru: 'Лифт', uk: 'Ліфт', es: 'ascensor', pos: 'nouns' },
    { en: 'kitchen', ru: 'Кухня', uk: 'Кухня', es: 'cocina', pos: 'nouns' },
    { en: 'very', ru: 'Очень', uk: 'Дуже', es: 'muy', pos: 'adverbs' },
    { en: 'kind', ru: 'Добрый', uk: 'Добрий', es: 'amable', pos: 'adjectives' },
    { en: 'urgent', ru: 'Срочный', uk: 'Терміновий', es: 'urgente', pos: 'adjectives' },
    { en: 'shocked', ru: 'Шокированный', uk: 'Шокований', es: 'sorprendido', pos: 'adjectives' },
    { en: 'taxi', ru: 'Такси', uk: 'Таксі', es: 'Taxi', pos: 'nouns' },
    { en: 'married', ru: 'Замужняя (женатый)', uk: 'Заміжня (одружений)', es: 'casado', pos: 'adjectives' },
    { en: 'outside', ru: 'Снаружи (на улице)', uk: 'Зовні (на вулиці)', es: 'afuera', pos: 'adverbs' },
    { en: 'airport', ru: 'Аэропорт', uk: 'Аеропорт', es: 'aeropuerto', pos: 'nouns' },
    { en: 'train', ru: 'Поезд', uk: 'Поїзд', es: 'tren', pos: 'nouns' },
    { en: 'bathroom', ru: 'Ванная комната', uk: 'Ванна кімната', es: 'baño', pos: 'nouns' },
    { en: 'gym', ru: 'Спортзал', uk: 'Спортзал', es: 'gimnasio', pos: 'nouns' },
    { en: 'bus', ru: 'Автобус', uk: 'Автобус', es: 'autobús', pos: 'nouns' },
    { en: 'near', ru: 'Рядом', uk: 'Поруч', es: 'cerca', pos: 'adverbs' },
    { en: 'list', ru: 'Список', uk: 'Список', es: 'lista', pos: 'nouns' },
    { en: 'pharmacy', ru: 'Аптека', uk: 'Аптека', es: 'farmacia', pos: 'nouns' },
    { en: 'abroad', ru: 'За границей', uk: 'За кордоном', es: 'en el extranjero', pos: 'adverbs' },
    { en: 'broken', ru: 'Сломанный', uk: 'Зламаний', es: 'roto', pos: 'adjectives' },
    { en: 'empty', ru: 'Пустой', uk: 'Порожній', es: 'vacío', pos: 'adjectives' },
    { en: 'happy', ru: 'Счастливый', uk: 'Щасливий', es: 'feliz', pos: 'adjectives' },
    { en: 'friends', ru: 'Друзья', uk: 'Друзі', es: 'amigos', pos: 'nouns' },
    { en: 'vacation', ru: 'Отпуск', uk: 'Відпустка', es: 'vacaciones', pos: 'nouns' },
    { en: 'fine', ru: 'Хорошо (в порядке)', uk: 'Добре (в порядку)', es: 'bien', pos: 'adjectives' },
    { en: 'smart', ru: 'Умный', uk: 'Розумний', es: 'inteligente', pos: 'adjectives' },
    { en: 'store', ru: 'Магазин', uk: 'Магазин', es: 'Tienda', pos: 'nouns' },
    { en: 'tired', ru: 'Усталый', uk: 'Втомлений', es: 'cansado', pos: 'adjectives' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', es: 'hotel', pos: 'nouns' },
    { en: 'hungry', ru: 'Голодный', uk: 'Голодний', es: 'hambriento', pos: 'adjectives' },
    { en: 'angry', ru: 'Злой', uk: 'Злий', es: 'enojado', pos: 'adjectives' },
    { en: 'school', ru: 'Школа', uk: 'Школа', es: 'escuela', pos: 'nouns' },
    { en: 'nervous', ru: 'Нервный', uk: 'Нервовий', es: 'nervioso', pos: 'adjectives' },
  ],
  2: [
    // Phrases 1-5
    { en: 'enemies', ru: 'Враги', uk: 'Вороги', es: 'enemigos', pos: 'nouns' },
    { en: 'wrong', ru: 'Неправильный', uk: 'Неправильний', es: 'equivocado', pos: 'adjectives' },
    { en: 'park', ru: 'Парк', uk: 'Парк', es: 'parque', pos: 'nouns' },
    { en: 'sure', ru: 'Уверенный', uk: 'Впевнений', es: 'seguro', pos: 'adjectives' },
    { en: 'expensive', ru: 'Дорогой (по цене)', uk: 'Дорогий (за ціною)', es: 'caro', pos: 'adjectives' },
    // Phrases 6-10
    { en: 'doctor', ru: 'Врач', uk: 'Лікар', es: 'doctor', pos: 'nouns' },
    { en: 'scary', ru: 'Страшный', uk: 'Страшний', es: 'aterrador', pos: 'adjectives' },
    { en: 'alone', ru: 'Один (одинокий)', uk: 'Один (самотній)', es: 'solo', pos: 'adjectives' },
    // Phrases 11-15
    { en: 'danger', ru: 'Опасность', uk: 'Небезпека', es: 'peligro', pos: 'nouns' },
    { en: 'open', ru: 'Открытый', uk: 'Відкритий', es: 'abierto', pos: 'adjectives' },
    // Phrases 16-20
    // Phrases 21-25
    { en: 'joke', ru: 'Шутка', uk: 'Жарт', es: 'broma', pos: 'nouns' },
    // Phrases 26-30
    { en: 'afraid', ru: 'Боящийся (испуганный)', uk: 'Той, хто боїться (переляканий)', es: 'asustado', pos: 'adjectives' },
    { en: 'far', ru: 'Далекий', uk: 'Далекий', es: 'lejos', pos: 'adjectives' },
    // Phrases 31-35
    { en: 'office', ru: 'Офис', uk: 'Офіс', es: 'oficina', pos: 'nouns' },
    { en: 'mood', ru: 'Настроение', uk: 'Настрій', es: 'ánimo', pos: 'nouns' },
    { en: 'true', ru: 'Правда (истинный)', uk: 'Правда (істинний)', es: 'verdadero', pos: 'adjectives' },
    { en: 'trap', ru: 'Ловушка', uk: 'Пастка', es: 'trampa', pos: 'nouns' },
    // Phrases 36-40
    // Phrases 41-45
    { en: 'guilty', ru: 'Виноватый', uk: 'Винний', es: 'culpable', pos: 'adjectives' },
    { en: 'dangerous', ru: 'Опасный', uk: 'Небезпечний', es: 'peligroso', pos: 'adjectives' },
    { en: 'building', ru: 'Здание', uk: 'Будівля', es: 'edificio', pos: 'verbs' },
    { en: 'mean', ru: 'Злой (подлый)', uk: 'Злий (підлий)', es: 'malvado', pos: 'adjectives' },
    // Phrases 46-50
    { en: 'serious', ru: 'Серьезный', uk: 'Серйозний', es: 'grave', pos: 'adjectives' },
    { en: 'enemy', ru: 'Враг', uk: 'Ворог', es: 'enemigo', pos: 'nouns' },
  ],
  3: [
    { en: 'accept', ru: 'Принимать', uk: 'Приймати', es: 'aceptar', pos: 'verbs' },
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', es: 'entender', pos: 'irregular_verbs' },
    { en: 'live', ru: 'Жить', uk: 'Жити', es: 'vivir', pos: 'verbs' },
    { en: 'drink', ru: 'Пить', uk: 'Пити', es: 'beber', pos: 'irregular_verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', es: 'ver', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', es: 'llamar', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', es: 'cocinar', pos: 'verbs' },
    { en: 'cost', ru: 'Стоить', uk: 'Коштувати', es: 'costar', pos: 'irregular_verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', es: 'ayudar', pos: 'verbs' },
    { en: 'know', ru: 'Знать', uk: 'Знати', es: 'saber', pos: 'irregular_verbs' },
    { en: 'believe', ru: 'Верить', uk: 'Вірити', es: 'creer', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', es: 'comprar', pos: 'irregular_verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', es: 'leer', pos: 'irregular_verbs' },
    { en: 'come', ru: 'Приходить', uk: 'Приходити', es: 'venir', pos: 'irregular_verbs' },
    { en: 'listen', ru: 'Слушать', uk: 'Слухати', es: 'escuchar', pos: 'verbs' },
    { en: 'drive', ru: 'Водить', uk: 'Водити', es: 'conducir', pos: 'irregular_verbs' },
    { en: 'deserve', ru: 'Заслуживать', uk: 'Заслуговувати', es: 'merecer', pos: 'verbs' },
    { en: 'feel', ru: 'Чувствовать', uk: 'Відчувати', es: 'sentir', pos: 'irregular_verbs' },
    { en: 'promise', ru: 'Обещать', uk: 'Обіцяти', es: 'prometer', pos: 'verbs' },
    { en: 'travel', ru: 'Путешествовать', uk: 'Подорожувати', es: 'viajar', pos: 'verbs' },
    { en: 'value', ru: 'Ценить', uk: 'Цінувати', es: 'valorar', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', es: 'olvidar', pos: 'irregular_verbs' },
    { en: 'love', ru: 'Любить', uk: 'Любити', es: 'amar', pos: 'verbs' },
    { en: 'remember', ru: 'Помнить', uk: 'Пам\\\'ятати', es: 'recordar', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', es: 'pedir', pos: 'verbs' },
    { en: 'look', ru: 'Выглядеть', uk: 'Виглядати', es: 'mirar', pos: 'verbs' },
    { en: 'seem', ru: 'Казаться', uk: 'Здаватися', es: 'parecer', pos: 'verbs' },
    { en: 'sound', ru: 'Звучать', uk: 'Звучати', es: 'sonar', pos: 'verbs' },
    { en: 'use', ru: 'Использовать', uk: 'Використовувати', es: 'usar', pos: 'verbs' },
    { en: 'wait', ru: 'Ждать', uk: 'Чекати', es: 'esperar', pos: 'verbs' },
    { en: 'wash', ru: 'Мыть', uk: 'Мити', es: 'lavar', pos: 'verbs' },
    { en: 'news', ru: 'Новости', uk: 'Новини', es: 'noticias', pos: 'nouns' },
    { en: 'people', ru: 'Люди', uk: 'Люди', es: 'gente', pos: 'nouns' },
    { en: 'answer', ru: 'Ответ', uk: 'Відповідь', es: 'respuesta', pos: 'nouns' },
    { en: 'meat', ru: 'Мясо', uk: 'М\\\'ясо', es: 'carne', pos: 'nouns' },
    { en: 'music', ru: 'Музыка', uk: 'Музика', es: 'música', pos: 'nouns' },
    { en: 'food', ru: 'Еда', uk: 'Їжа', es: 'alimento', pos: 'nouns' },
    { en: 'dollar', ru: 'Доллар', uk: 'Долар', es: 'dólar', pos: 'nouns' },
    { en: 'pain', ru: 'Боль', uk: 'Біль', es: 'dolor', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', es: 'tiempo', pos: 'nouns' },
    { en: 'glasses', ru: 'Очки', uk: 'Окуляри', es: 'anteojos', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', es: 'contraseña', pos: 'nouns' },
    { en: 'internet', ru: 'Интернет', uk: 'Інтернет', es: 'Internet', pos: 'nouns' },
    { en: 'rest', ru: 'Отдых', uk: 'Відпочинок', es: 'descanso', pos: 'nouns' },
    { en: 'terms', ru: 'Условия', uk: 'Умови', es: 'términos', pos: 'nouns' },
    { en: 'problem', ru: 'Проблема', uk: 'Проблема', es: 'problema', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', es: 'Dirección', pos: 'nouns' },
    { en: 'often', ru: 'Часто', uk: 'Часто', es: 'a menudo', pos: 'adverbs' },
    { en: 'speak', ru: 'Говорить', uk: 'Говорити', es: 'hablar', pos: 'irregular_verbs' },
    { en: 'eat', ru: 'Есть (употреблять в пищу)', uk: 'Їсти', es: 'comer', pos: 'irregular_verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', es: 'escribir', pos: 'irregular_verbs' },
    { en: 'teach', ru: 'Преподавать', uk: 'Викладати', es: 'enseñar', pos: 'irregular_verbs' },
    { en: 'wear', ru: 'Носить (одежду)', uk: 'Носити (одяг)', es: 'tener puesto', pos: 'irregular_verbs' },
    { en: 'take', ru: 'Брать', uk: 'Брати', es: 'tomar', pos: 'irregular_verbs' },
    { en: 'london', ru: 'Лондон', uk: 'Лондон', es: 'Londres', pos: 'nouns' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', es: 'café', pos: 'nouns' },
    { en: 'english', ru: 'Английский язык', uk: 'Англійська мова', es: 'Inglés', pos: 'nouns' },
    { en: 'book', ru: 'Книга', uk: 'Книга', es: 'libro', pos: 'nouns' },
    { en: 'letter', ru: 'Письмо', uk: 'Лист', es: 'carta', pos: 'nouns' },
    { en: 'dish', ru: 'Блюдо', uk: 'Страва', es: 'plato', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', es: 'cena', pos: 'nouns' },
    { en: 'math', ru: 'Математика', uk: 'Математика', es: 'Matemáticas', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', es: 'llave', pos: 'nouns' },
    { en: 'pizza', ru: 'Пицца', uk: 'Піца', es: 'pizza', pos: 'nouns' },
    { en: 'tea', ru: 'Чай', uk: 'Чай', es: 'té', pos: 'nouns' },
    { en: 'strange', ru: 'Странный', uk: 'Дивний', es: 'extraño', pos: 'adjectives' },
    { en: 'great', ru: 'Отличный', uk: 'Чудовий', es: 'excelente', pos: 'adjectives' },
    { en: 'good', ru: 'Хороший', uk: 'Хороший', es: 'bueno', pos: 'adjectives' },
    { en: 'books', ru: 'Книги', uk: 'Книги', es: 'libros', pos: 'nouns' },
    { en: 'calls', ru: 'Звонить', uk: 'Телефонувати', es: 'llamadas', pos: 'nouns' },
    { en: 'cooks', ru: 'Готовить', uk: 'Готувати', es: 'cocineros', pos: 'nouns' },
    { en: 'costs', ru: 'Стоить', uk: 'Коштувати', es: 'costos', pos: 'nouns' },
    { en: 'dishes', ru: 'Блюда', uk: 'Страви', es: 'platos', pos: 'nouns' },
    { en: 'drinks', ru: 'Пить', uk: 'Пити', es: 'bebidas', pos: 'nouns' },
    { en: 'eats', ru: 'Есть (употреблять в пищу)', uk: 'Їсти', es: 'come', pos: 'nouns' },
    { en: 'helps', ru: 'Помогать', uk: 'Допомагати', es: 'ayuda', pos: 'nouns' },
    { en: 'keys', ru: 'Ключи', uk: 'Ключі', es: 'llaves', pos: 'nouns' },
    { en: 'knows', ru: 'Знать', uk: 'Знати', es: 'sabe', pos: 'nouns' },
    { en: 'letters', ru: 'Письма', uk: 'Листи', es: 'letras', pos: 'nouns' },
    { en: 'lives', ru: 'Жить', uk: 'Жити', es: 'vidas', pos: 'nouns' },
    { en: 'loves', ru: 'Любить', uk: 'Любити', es: 'ama', pos: 'nouns' },
    { en: 'remembers', ru: 'Помнить', uk: "Пам'ятати", es: 'recuerda', pos: 'nouns' },
    { en: 'seems', ru: 'Казаться', uk: 'Здаватися', es: 'parece', pos: 'nouns' },
    { en: 'sounds', ru: 'Звучать', uk: 'Звучати', es: 'sonidos', pos: 'nouns' },
    { en: 'speaks', ru: 'Говорить', uk: 'Говорити', es: 'habla', pos: 'nouns' },
    { en: 'takes', ru: 'Берёт · брать', uk: 'Бере · брати', es: 'toma · tomar', pos: 'nouns' },
    { en: 'teaches', ru: 'Преподавать', uk: 'Викладати', es: 'enseña', pos: 'nouns' },
    { en: 'uses', ru: 'Использовать', uk: 'Використовувати', es: 'usos', pos: 'nouns' },
    { en: 'washes', ru: 'Мыть', uk: 'Мити', es: 'lava', pos: 'nouns' },
    { en: 'wears', ru: 'Носить (одежду)', uk: 'Носити (одяг)', es: 'viste', pos: 'nouns' },
    { en: 'writes', ru: 'Писать', uk: 'Писати', es: 'escribe', pos: 'nouns' },
  ],
  4: [
    { en: 'smoke', ru: 'Курить', uk: 'Курити', es: 'fumar', pos: 'verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', es: 'ver', pos: 'irregular_verbs' },
    { en: 'pay', ru: 'Платить', uk: 'Платити', es: 'pagar', pos: 'irregular_verbs' },
    { en: 'like', ru: 'Любить (нравиться)', uk: 'Любити (подобатися)', es: 'como', pos: 'verbs' },
    { en: 'sell', ru: 'Продавать', uk: 'Продавати', es: 'vender', pos: 'irregular_verbs' },
    { en: 'lose', ru: 'Терять', uk: 'Втрачати', es: 'perder', pos: 'irregular_verbs' },
    { en: 'change', ru: 'Менять', uk: 'Змінювати', es: 'cambiar', pos: 'verbs' },
    { en: 'spend', ru: 'Тратить', uk: 'Витрачати', es: 'gastar', pos: 'irregular_verbs' },
    { en: 'break', ru: 'Нарушать (ломать)', uk: 'Порушувати (ламати)', es: 'romper', pos: 'irregular_verbs' },
    { en: 'waste', ru: 'Тратить впустую', uk: 'Витрачати марно', es: 'desperdiciar', pos: 'verbs' },
    { en: 'close', ru: 'Закрывать', uk: 'Зачиняти', es: 'cerca', pos: 'verbs' },
    { en: 'ask', ru: 'Просить (спрашивать)', uk: 'Просити (питати)', es: 'preguntar', pos: 'verbs' },
    { en: 'trust', ru: 'Доверять', uk: 'Довіряти', es: 'confianza', pos: 'verbs' },
    { en: 'share', ru: 'Делиться', uk: 'Ділитися', es: 'compartir', pos: 'verbs' },
    { en: 'carry', ru: 'Носить (нести)', uk: 'Носити (нести)', es: 'llevar', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Надсилати', es: 'enviar', pos: 'irregular_verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', es: 'controlar', pos: 'verbs' },
    { en: 'need', ru: 'Нуждаться', uk: 'Потребувати', es: 'necesidad', pos: 'verbs' },
    { en: 'own', ru: 'Иметь (владеть)', uk: 'Мати (володіти)', es: 'propio', pos: 'verbs' },
    { en: 'skip', ru: 'Пропускать', uk: 'Пропускати', es: 'saltar', pos: 'verbs' },
    { en: 'milk', ru: 'Молоко', uk: 'Молоко', es: 'leche', pos: 'nouns' },
    { en: 'sugar', ru: 'Сахар', uk: 'Цукор', es: 'azúcar', pos: 'nouns' },
    { en: 'number', ru: 'Номер', uk: 'Номер', es: 'número', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', es: 'dinero', pos: 'nouns' },
    { en: 'risk', ru: 'Риск', uk: 'Ризик', es: 'riesgo', pos: 'nouns' },
    { en: 'hope', ru: 'Надежда', uk: 'Надія', es: 'esperanza', pos: 'nouns' },
    { en: 'opinion', ru: 'Мнение', uk: 'Думка', es: 'opinión', pos: 'nouns' },
    { en: 'fear', ru: 'Страх', uk: 'Страх', es: 'miedo', pos: 'nouns' },
    { en: 'money', ru: 'Деньги', uk: 'Гроші', es: 'dinero', pos: 'nouns' },
    { en: 'advice', ru: 'Совет', uk: 'Порада', es: 'consejo', pos: 'nouns' },
    { en: 'breakfast', ru: 'Завтрак', uk: 'Сніданок', es: 'desayuno', pos: 'nouns' },
    { en: 'law', ru: 'Закон', uk: 'Закон', es: 'ley', pos: 'nouns' },
    { en: 'tie', ru: 'Галстук', uk: 'Краватка', es: 'corbata', pos: 'nouns' },
    { en: 'window', ru: 'Окно', uk: 'Вікно', es: 'ventana', pos: 'nouns' },
    { en: 'wine', ru: 'Вино', uk: 'Вино', es: 'vino', pos: 'nouns' },
    { en: 'TV', ru: 'Телевизор', uk: 'Телевізор', es: 'televisor', pos: 'nouns' },
    { en: 'map', ru: 'Карта', uk: 'Карта', es: 'mapa', pos: 'nouns' },
    { en: 'alcohol', ru: 'Алкоголь', uk: 'Алкоголь', es: 'alcohol', pos: 'nouns' },
    { en: 'message', ru: 'Сообщение', uk: 'Повідомлення', es: 'mensaje', pos: 'nouns' },
    { en: 'strangers', ru: 'Незнакомцы', uk: 'Незнайомці', es: 'extraños', pos: 'nouns' },
    { en: 'secret', ru: 'Секрет', uk: 'Секрет', es: 'secreto', pos: 'nouns' },
    { en: 'spicy', ru: 'Острый (о еде)', uk: 'Гострий (про їжу)', es: 'picante', pos: 'adjectives' },
    { en: 'ads', ru: 'Объявления', uk: 'Оголошення', es: 'anuncios', pos: 'nouns' },
    { en: 'details', ru: 'Деталями', uk: 'Реквізити', es: 'detalles', pos: 'nouns' },
    { en: 'masks', ru: 'Маска', uk: 'Маска', es: 'mascarillas', pos: 'nouns' },
    { en: 'messages', ru: 'Сообщение', uk: 'Повідомлення', es: 'mensajes', pos: 'nouns' },
    { en: 'rules', ru: 'Правило', uk: 'Правило', es: 'normas', pos: 'nouns' },
    { en: 'secrets', ru: 'Секрет', uk: 'Секрет', es: 'misterios', pos: 'nouns' },
    { en: 'tickets', ru: 'Билет', uk: 'Квиток', es: 'entradas', pos: 'nouns' },
  ],
  5: [
    { en: 'do', ru: 'Делать', uk: 'Робити', es: 'hacer', pos: 'irregular_verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', es: 'encontrar', pos: 'irregular_verbs' },
    { en: 'go', ru: 'Идти', uk: 'Йти', es: 'ir', pos: 'irregular_verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', es: 'escuchar', pos: 'irregular_verbs' },
    { en: 'sing', ru: 'Петь', uk: 'Співати', es: 'cantar', pos: 'verbs' },
    { en: 'sleep', ru: 'Спать', uk: 'Спати', es: 'dormir', pos: 'irregular_verbs' },
    { en: 'code', ru: 'Код', uk: 'Код', es: 'código', pos: 'nouns' },
    { en: 'commission', ru: 'Комиссия', uk: 'Комісія', es: 'comisión', pos: 'nouns' },
    { en: 'room', ru: 'Номер', uk: 'Номер', es: 'habitación', pos: 'nouns' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', es: 'mesa', pos: 'nouns' },
    { en: 'vegetables', ru: 'Овощи', uk: 'Овочі', es: 'verduras', pos: 'nouns' },
    { en: 'job', ru: 'Работа', uk: 'Робота', es: 'trabajo', pos: 'nouns' },
    { en: 'difference', ru: 'Разница', uk: 'Різниця', es: 'diferencia', pos: 'nouns' },
    { en: 'luck', ru: 'Удача', uk: 'Удача', es: 'suerte', pos: 'nouns' },
    { en: 'noise', ru: 'Шум', uk: 'Шум', es: 'ruido', pos: 'nouns' },
    { en: 'mask', ru: 'Маска', uk: 'Маска', es: 'mascarilla', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'boleto', pos: 'nouns' },
    { en: 'price', ru: 'Цена', uk: 'Ціна', es: 'precio', pos: 'nouns' },
    { en: 'credit', ru: 'Кредит', uk: 'Кредит', es: 'crédito', pos: 'nouns' },
    { en: 'card', ru: 'Карта (карточка)', uk: 'Картка', es: 'tarjeta', pos: 'nouns' },
    { en: 'rule', ru: 'Правило', uk: 'Правило', es: 'regla', pos: 'nouns' },
    { en: 'tax', ru: 'Налог', uk: 'Податок', es: 'impuesto', pos: 'nouns' },
    { en: 'mistake', ru: 'Ошибка', uk: 'Помилка', es: 'error', pos: 'nouns' },
    { en: 'tomorrow', ru: 'Завтра', uk: 'Завтра', es: 'mañana', pos: 'adverbs' },
    { en: 'much', ru: 'Много', uk: 'Багато', es: 'mucho', pos: 'adverbs' },
    { en: 'well', ru: 'Хорошо', uk: 'Добре', es: 'Bueno', pos: 'adverbs' },
    { en: 'inside', ru: 'Внутрь', uk: 'Всередину', es: 'adentro', pos: 'adverbs' },
    { en: 'correctly', ru: 'Правильно', uk: 'Правильно', es: 'correctamente', pos: 'adverbs' },
    { en: 'enough', ru: 'Достаточно', uk: 'Достатньо', es: 'suficiente', pos: 'adverbs' },
    { en: 'cold', ru: 'Холодный', uk: 'Холодний', es: 'frío', pos: 'adjectives' },
    { en: 'cards', ru: 'Карта (карточка)', uk: 'Картка', es: 'tarjetas', pos: 'nouns' },
    { en: 'mistakes', ru: 'Ошибка', uk: 'Помилка', es: 'errores', pos: 'nouns' },
    { en: 'taxes', ru: 'Налог', uk: 'Податок', es: 'impuestos', pos: 'nouns' },
  ],
  6: [
    { en: 'start', ru: 'Начинать', uk: 'Починати', es: 'comenzar', pos: 'verbs' },
    { en: 'cry', ru: 'Плакать', uk: 'Плакати', es: 'llorar', pos: 'verbs' },
    { en: 'pronounce', ru: 'Произносить', uk: 'Вимовляти', es: 'pronunciar', pos: 'verbs' },
    { en: 'sign', ru: 'Подписывать', uk: 'Підписувати', es: 'firmar', pos: 'verbs' },
    { en: 'want', ru: 'Хотеть', uk: 'Хотіти', es: 'desear', pos: 'verbs' },
    { en: 'leave', ru: 'Уходить (покидать)', uk: 'Йти (покидати)', es: 'dejar', pos: 'irregular_verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', es: 'finalizar', pos: 'verbs' },
    { en: 'keep', ru: 'Хранить (держать)', uk: 'Зберігати (тримати)', es: 'mantener', pos: 'irregular_verbs' },
    { en: 'ship', ru: 'Отправлять (груз / посылку)', uk: 'Відправляти (вантаж / посилку)', es: 'barco', pos: 'verbs' },
    { en: 'meet', ru: 'Встречать', uk: 'Зустрічати', es: 'encontrarse', pos: 'irregular_verbs' },
    { en: 'put', ru: 'Класть', uk: 'Класти', es: 'poner', pos: 'irregular_verbs' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', es: 'puerta', pos: 'nouns' },
    { en: 'report', ru: 'Отчет', uk: 'Звіт', es: 'informe', pos: 'nouns' },
    { en: 'exit', ru: 'Выход', uk: 'Вихід', es: 'salida', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', es: 'bolsa', pos: 'nouns' },
    { en: 'parcel', ru: 'Посылка', uk: 'Посилка', es: 'parcela', pos: 'nouns' },
    { en: 'mail', ru: 'Почта', uk: 'Пошта', es: 'correo', pos: 'nouns' },
    { en: 'groceries', ru: 'Продукты (бакалея)', uk: 'Продукти', es: 'comestibles', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча', uk: 'Зустріч', es: 'reunión', pos: 'verbs' },
    { en: 'luggage', ru: 'Багаж', uk: 'Багаж', es: 'equipaje', pos: 'nouns' },
    { en: 'lunch', ru: 'Обед', uk: 'Обід', es: 'almuerzo', pos: 'nouns' },
    { en: 'bill', ru: 'Счет (в ресторане)', uk: 'Рахунок', es: 'factura', pos: 'nouns' },
    { en: 'confirmation', ru: 'Подтверждение', uk: 'Підтвердження', es: 'confirmación', pos: 'nouns' },
    { en: 'this', ru: 'Этот (эта)', uk: 'Цей (ця)', es: 'este', pos: 'adjectives' },
    { en: 'where', ru: 'Где', uk: 'Де', es: 'dónde', pos: 'adverbs' },
    { en: 'what', ru: 'Что', uk: 'Що', es: 'qué', pos: 'adverbs' },
    { en: 'when', ru: 'Когда', uk: 'Коли', es: 'cuando', pos: 'adverbs' },
    { en: 'why', ru: 'Почему', uk: 'Чому', es: 'por qué', pos: 'adverbs' },
    { en: 'how', ru: 'Как', uk: 'Як', es: 'cómo', pos: 'adverbs' },
    { en: 'usually', ru: 'Обычно', uk: 'Зазвичай', es: 'generalmente', pos: 'adverbs' },
    { en: 'now', ru: 'Сейчас', uk: 'Зараз', es: 'ahora', pos: 'adverbs' },
    { en: 'slowly', ru: 'Медленно', uk: 'Повільно', es: 'despacio', pos: 'adverbs' },
    { en: 'always', ru: 'Всегда', uk: 'Завжди', es: 'siempre', pos: 'adverbs' },
    { en: 'get', ru: 'Получать', uk: 'Отримувати', es: 'conseguir', pos: 'irregular_verbs' },
    { en: 'guests', ru: 'Гости', uk: 'Гості', es: 'huéspedes', pos: 'nouns' },
    { en: 'shop', ru: 'Рабочие', uk: 'Магазин', es: 'comercio', pos: 'nouns' },
    { en: 'cafe', ru: 'Кафе (заведение)', uk: 'Кафе (заклад)', es: 'cafetería', pos: 'nouns' },
  ],
  7: [
    { en: 'have', ru: 'Иметь', uk: 'Мати', es: 'tener', pos: 'irregular_verbs' },
    { en: 'has', ru: 'Имеет', uk: 'Має', es: 'tiene', pos: 'verbs' },
    { en: 'does', ru: 'Делает', uk: 'Робить', es: 'hace', pos: 'verbs' },
    { en: 'insurance', ru: 'Страховка', uk: 'Страховка', es: 'seguro', pos: 'nouns' },
    { en: 'driver', ru: 'Водитель', uk: 'Водій', es: 'conductor', pos: 'nouns' },
    { en: 'license', ru: 'Лицензия', uk: 'Ліцензія', es: 'licencia', pos: 'nouns' },
    { en: 'allergy', ru: 'Аллергия', uk: 'Алергія', es: 'alergia', pos: 'nouns' },
    { en: 'reservation', ru: 'Бронирование', uk: 'Бронювання', es: 'reserva', pos: 'nouns' },
    { en: 'lighter', ru: 'Зажигалка', uk: 'Запальничка', es: 'encendedor', pos: 'nouns' },
    { en: 'pass', ru: 'Пропуск', uk: 'Перепустка', es: 'pase', pos: 'nouns' },
    { en: 'tablet', ru: 'Планшет', uk: 'Планшет', es: 'tableta', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядка', uk: 'Зарядка', es: 'cargador', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', es: 'pasaporte', pos: 'nouns' },
    { en: 'menu', ru: 'Меню', uk: 'Меню', es: 'menú', pos: 'nouns' },
    { en: 'device', ru: 'Устройство', uk: 'Пристрій', es: 'dispositivo', pos: 'nouns' },
    { en: 'discount', ru: 'Скидка', uk: 'Знижка', es: 'descuento', pos: 'nouns' },
    { en: 'city', ru: 'Город', uk: 'Місто', es: 'ciudad', pos: 'nouns' },
    { en: 'policy', ru: 'Полис', uk: 'Поліс', es: 'política', pos: 'nouns' },
    { en: 'Wi-Fi', ru: 'Вай-фай', uk: 'Вай-фай', es: 'wifi', pos: 'nouns' },
    { en: 'first-aid', ru: 'Первая помощь', uk: 'Перша допомога', es: 'primeros auxilios', pos: 'nouns' },
    { en: 'kit', ru: 'Набор', uk: 'Набір', es: 'equipo', pos: 'nouns' },
    { en: 'booking', ru: 'Бронирование', uk: 'Бронювання', es: 'reserva', pos: 'verbs' },
    { en: 'spare', ru: 'Запасной', uk: 'Запасний', es: 'repuesto', pos: 'adjectives' },
    { en: 'appetite', ru: 'Аппетит', uk: 'Апетит', es: 'apetito', pos: 'nouns' },
    { en: 'international', ru: 'Международный', uk: 'Міжнародний', es: 'internacional', pos: 'adjectives' },
    { en: 'question', ru: 'Вопрос', uk: 'Питання', es: 'pregunta', pos: 'nouns' },
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', es: 'teléfono', pos: 'nouns' },
    { en: 'nut', ru: 'Орех', uk: 'Горіх', es: 'tuerca', pos: 'nouns' },
    { en: 'return', ru: 'Обратный', uk: 'Зворотний', es: 'devolver', pos: 'adjectives' },
    { en: 'seafood', ru: 'Морепродукты', uk: 'Морепродукти', es: 'mariscos', pos: 'nouns' },
    { en: 'power', ru: 'Мощность', uk: 'Потужність', es: 'fuerza', pos: 'nouns' },
    { en: 'bank', ru: 'Банк', uk: 'Банк', es: 'banco', pos: 'nouns' },
    { en: 'prescription', ru: 'Рецепт', uk: 'Рецепт', es: 'receta médica', pos: 'nouns' },
    { en: 'access', ru: 'Доступ', uk: 'Доступ', es: 'acceso', pos: 'nouns' },
    { en: 'all', ru: 'Все', uk: 'Усяку', es: 'todo', pos: 'nouns' },
    { en: 'backpack', ru: 'Рюкзак', uk: 'Рюкзак', es: 'mochila', pos: 'nouns' },
    { en: 'bicycle', ru: 'Велосипед', uk: 'Велосипед', es: 'bicicleta', pos: 'nouns' },
    { en: 'bookings', ru: 'Бронирование', uk: 'Бронювання', es: 'reservas', pos: 'nouns' },
    { en: 'chargers', ru: 'Зарядка', uk: 'Зарядка', es: 'cargadores', pos: 'nouns' },
    { en: 'documents', ru: 'Документы', uk: 'Документи', es: 'documentos', pos: 'nouns' },
    { en: 'dog', ru: 'Собака', uk: 'Собака', es: 'perro', pos: 'nouns' },
    { en: 'guide', ru: 'Гид', uk: 'Гід', es: 'guía', pos: 'nouns' },
    { en: 'headache', ru: 'Головная боль', uk: 'Головний біль', es: 'dolor de cabeza', pos: 'nouns' },
    { en: 'issue', ru: 'Вопрос', uk: 'Питання', es: 'asunto', pos: 'nouns' },
    { en: 'needed', ru: 'Нуждаться', uk: 'Потребувати', es: 'necesario', pos: 'verbs' },
    { en: 'pen', ru: 'Соответствует', uk: 'Ручка', es: 'bolígrafo', pos: 'nouns' },
    { en: 'plan', ru: 'План', uk: 'Плану', es: 'plan', pos: 'nouns' },
    { en: 'suitcase', ru: 'Чемодан', uk: 'Валіза', es: 'maleta', pos: 'nouns' },
    { en: 'umbrella', ru: 'Зонт', uk: 'Парасолька', es: 'paraguas', pos: 'nouns' },
  ],
  8: [
    { en: 'walk', ru: 'Гулять (ходить пешком)', uk: 'Гуляти (йти пішки)', es: 'caminar', pos: 'verbs' },
    { en: 'relax', ru: 'Отдыхать (расслабляться)', uk: 'Відпочивати (розслаблятися)', es: 'relajarse', pos: 'verbs' },
    { en: 'Monday', ru: 'Понедельник', uk: 'Понеділок', es: 'Lunes', pos: 'nouns' },
    { en: 'eight', ru: 'Восемь', uk: 'Вісім', es: 'ocho', pos: 'nouns' },
    { en: "o'clock", ru: 'Часов (ровно)', uk: 'Година (рівно)', es: 'en punto', pos: 'nouns' },
    { en: 'morning', ru: 'Утро', uk: 'Ранок', es: 'mañana', pos: 'verbs' },
    { en: 'noon', ru: 'Полдень', uk: 'Полудень', es: 'mediodía', pos: 'nouns' },
    { en: 'Friday', ru: 'Пятница', uk: "П'ятниця", es: 'Viernes', pos: 'nouns' },
    { en: 'midnight', ru: 'Полночь', uk: 'Опівніч', es: 'medianoche', pos: 'nouns' },
    { en: 'winter', ru: 'Зима', uk: 'Зима', es: 'invierno', pos: 'nouns' },
    { en: 'evening', ru: 'Вечер', uk: 'Вечір', es: 'atardecer', pos: 'verbs' },
    { en: 'seven', ru: 'Семь', uk: 'Сім', es: 'Siete', pos: 'nouns' },
    { en: 'PM', ru: 'После полудня (вечера)', uk: 'Після полудня (вечора)', es: 'p. m.', pos: 'nouns' },
    { en: 'sport', ru: 'Спорт', uk: 'Спорт', es: 'deporte', pos: 'nouns' },
    { en: 'night', ru: 'Ночь', uk: 'Ніч', es: 'noche', pos: 'nouns' },
    { en: 'August', ru: 'Август', uk: 'Серпень', es: 'Agosto', pos: 'nouns' },
    { en: 'June', ru: 'Июнь', uk: 'Червень', es: 'Junio', pos: 'nouns' },
    { en: 'nine', ru: 'Девять', uk: "Дев'ять", es: 'nueve', pos: 'nouns' },
    { en: 'thirty', ru: 'Тридцать', uk: 'Тридцять', es: 'treinta', pos: 'nouns' },
    { en: 'spring', ru: 'Весна', uk: 'Весна', es: 'primavera', pos: 'verbs' },
    { en: 'ten', ru: 'Десять', uk: 'Десять', es: 'diez', pos: 'nouns' },
    { en: 'fifteen', ru: 'Пятнадцать', uk: "П'ятнадцять", es: 'quince', pos: 'nouns' },
    { en: 'Saturday', ru: 'Суббота', uk: 'Субота', es: 'Sábado', pos: 'nouns' },
    { en: 'six', ru: 'Шесть', uk: 'Шість', es: 'seis', pos: 'nouns' },
    { en: 'two', ru: 'Два', uk: 'Два', es: 'dos', pos: 'nouns' },
    { en: 'AM', ru: 'Утра (до полудня)', uk: 'Ранок (до полудня)', es: 'a. m.', pos: 'nouns' },
    { en: 'December', ru: 'Декабрь', uk: 'Грудень', es: 'Diciembre', pos: 'nouns' },
    { en: 'April', ru: 'Апрель', uk: 'Квітень', es: 'Abril', pos: 'nouns' },
    { en: 'afternoon', ru: 'День', uk: 'Полудень', es: 'tarde', pos: 'nouns' },
    { en: 'arrive', ru: 'Прибывать', uk: 'Прибувати', es: 'llegar', pos: 'verbs' },
    { en: 'arrives', ru: 'Прибывает', uk: 'Прибуває', es: 'llega', pos: 'verbs' },
    { en: 'birthday', ru: 'День рождения', uk: 'День народження', es: 'cumpleaños', pos: 'nouns' },
    { en: 'checks', ru: 'Проверять', uk: 'Перевіряти', es: 'cheques', pos: 'nouns' },
    { en: 'class', ru: 'Класс', uk: 'Клас', es: 'clase', pos: 'nouns' },
    { en: 'closes', ru: 'Закрывать', uk: 'Зачиняти', es: 'cierra', pos: 'nouns' },
    { en: 'day', ru: 'День', uk: 'День', es: 'día', pos: 'nouns' },
    { en: 'departs', ru: 'Отправление', uk: 'Відправляється', es: 'sale', pos: 'nouns' },
    { en: 'finishes', ru: 'Заканчивать', uk: 'Закінчувати', es: 'termina', pos: 'nouns' },
    { en: 'five', ru: 'Пять', uk: "П'ять", es: 'cinco', pos: 'adjectives' },
    { en: 'january', ru: 'Январь', uk: 'Січень', es: 'enero', pos: 'nouns' },
    { en: 'july', ru: 'Июль', uk: 'Липень', es: 'julio', pos: 'nouns' },
    { en: 'leaves', ru: 'Уходить (покидать)', uk: 'Йти (покидати)', es: 'se va', pos: 'nouns' },
    { en: 'march', ru: 'Март', uk: 'Березень', es: 'marzo', pos: 'nouns' },
    { en: 'mondays', ru: 'Понедельник', uk: 'Понеділок', es: 'Los lunes', pos: 'nouns' },
    { en: 'mother', ru: 'Мать', uk: 'Мати', es: 'madre', pos: 'nouns' },
    { en: 'october', ru: 'Октябрь', uk: 'Жовтень', es: 'octubre', pos: 'nouns' },
    { en: 'one', ru: 'Один', uk: 'Один', es: 'uno', pos: 'nouns' },
    { en: 'pays', ru: 'Платить', uk: 'Платити', es: 'paga', pos: 'nouns' },
    { en: 'rent', ru: 'Аренда', uk: 'Оренда', es: 'alquiler', pos: 'nouns' },
    { en: 'runs', ru: 'Запускать', uk: 'Запускати', es: 'corre', pos: 'nouns' },
    { en: 'saturdays', ru: 'Суббота', uk: 'Субота', es: 'Los sábados', pos: 'nouns' },
    { en: 'september', ru: 'Сентябрь', uk: 'Вересень', es: 'septiembre', pos: 'nouns' },
    { en: 'shower', ru: 'Показывать', uk: 'Показувати', es: 'ducha', pos: 'nouns' },
    { en: 'summer', ru: 'Лето', uk: 'Літо', es: 'verano', pos: 'nouns' },
    { en: 'sundays', ru: 'Воскресенье', uk: 'Неділя', es: 'Los domingos', pos: 'nouns' },
    { en: 'thursday', ru: 'Четверг', uk: 'Четвер', es: 'Jueves', pos: 'nouns' },
    { en: 'thursdays', ru: 'По четвергам', uk: 'Четвер', es: 'Los jueves', pos: 'nouns' },
    { en: 'tuesdays', ru: 'Вторникам', uk: 'Вівторок', es: 'Los martes', pos: 'nouns' },
    { en: 'visits', ru: 'Просмотры', uk: 'Наставництва', es: 'visitas', pos: 'nouns' },
    { en: 'wake', ru: 'Просыпаться', uk: 'Прокидатися', es: 'despertarse', pos: 'nouns' },
    { en: 'wednesdays', ru: 'Средам', uk: 'Середа', es: 'Los miércoles', pos: 'nouns' },
    { en: 'weekends', ru: 'По выходным дням', uk: 'Вихідні', es: 'Fines de semana', pos: 'nouns' },
    { en: 'works', ru: 'Работа', uk: 'Робота', es: 'obras', pos: 'nouns' },
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
    { en: 'district', ru: 'Район', uk: 'Район', es: 'distrito', pos: 'nouns' },
    { en: 'first aid kit', ru: 'Аптечка', uk: 'Аптечка', es: 'botiquín de primeros auxilios', pos: 'nouns' },
    { en: 'ice', ru: 'Лед', uk: 'Лід', es: 'hielo', pos: 'nouns' },
    { en: 'glass', ru: 'Стакан', uk: 'Склянка', es: 'vaso', pos: 'nouns' },
    { en: 'wall', ru: 'Стена', uk: 'Стіна', es: 'muro', pos: 'nouns' },
    { en: 'swimming pool', ru: 'Бассейн', uk: 'Басейн', es: 'piscina', pos: 'nouns' },
    { en: 'garden', ru: 'Сад', uk: 'Сад', es: 'jardín', pos: 'nouns' },
    { en: 'plate', ru: 'Тарелка', uk: 'Тарілка', es: 'lámina', pos: 'nouns' },
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
    { en: 'any', ru: 'Любой', uk: 'Будь-хто', es: 'cualquier', pos: 'nouns' },
    { en: 'apples', ru: 'Яблоко', uk: 'Яблуко', es: 'manzanas', pos: 'nouns' },
    { en: 'beautiful', ru: 'Красивый', uk: 'Гарний', es: 'hermoso', pos: 'adjectives' },
    { en: 'bedroom', ru: 'Спальня', uk: 'Спальня', es: 'dormitorio', pos: 'nouns' },
    { en: 'big', ru: 'Большой', uk: 'Великий', es: 'grande', pos: 'nouns' },
    { en: 'cafes', ru: 'Кафе', uk: 'Кафе', es: 'cafés', pos: 'nouns' },
    { en: 'cars', ru: 'Машина', uk: 'Машина', es: 'carros', pos: 'nouns' },
    { en: 'classroom', ru: 'Класс', uk: 'Класна кімната', es: 'aula', pos: 'nouns' },
    { en: 'clean', ru: 'Чистить', uk: 'Чистити', es: 'limpio', pos: 'nouns' },
    { en: 'clock', ru: 'Часы', uk: 'Години', es: 'reloj', pos: 'nouns' },
    { en: 'desserts', ru: 'Десерты', uk: 'Десерти', es: 'postres', pos: 'nouns' },
    { en: 'famous', ru: 'Известный', uk: 'Відомий', es: 'famoso', pos: 'adjectives' },
    { en: 'film', ru: 'Пленка', uk: 'Фільм', es: 'película', pos: 'nouns' },
    { en: 'machine', ru: 'Машина (механизм)', uk: 'Машина (механізм)', es: 'máquina', pos: 'nouns' },
    { en: 'magazines', ru: 'Журналы', uk: 'Магазини', es: 'revistas', pos: 'nouns' },
    { en: 'many', ru: 'Много', uk: 'Багато', es: 'muchos', pos: 'nouns' },
    { en: 'mirror', ru: 'Зеркало', uk: 'Дзеркало', es: 'espejo', pos: 'nouns' },
    { en: 'mountains', ru: 'Горы', uk: 'ГОРИ', es: 'montañas', pos: 'nouns' },
    { en: 'new', ru: 'Новый', uk: 'Новий', es: 'nuevo', pos: 'nouns' },
    { en: 'note', ru: 'Примечание', uk: 'Примітка', es: 'nota', pos: 'nouns' },
    { en: 'old', ru: 'Старый', uk: 'Старий', es: 'viejo', pos: 'nouns' },
    { en: 'pens', ru: 'Ручки', uk: 'У шприц-ручках', es: 'bolígrafos', pos: 'nouns' },
    { en: 'pharmacies', ru: 'Аптека', uk: 'Аптека', es: 'farmacias', pos: 'nouns' },
    { en: 'photos', ru: 'Фото', uk: 'Фото', es: 'fotos', pos: 'nouns' },
    { en: 'places', ru: 'Мест', uk: 'Місць', es: 'lugares', pos: 'nouns' },
    { en: 'pocket', ru: 'Карман', uk: 'Кишеня', es: 'bolsillo', pos: 'nouns' },
    { en: 'pool', ru: 'Бассейн', uk: 'Басейн', es: 'piscina', pos: 'nouns' },
    { en: 'printers', ru: 'Печатать', uk: 'Друкувати', es: 'impresoras', pos: 'nouns' },
    { en: 'questions', ru: 'Вопрос', uk: 'Питання', es: 'preguntas', pos: 'nouns' },
    { en: 'quiet', ru: 'Тихий', uk: 'Тихий', es: 'tranquilo', pos: 'nouns' },
    { en: 'sky', ru: 'Небо', uk: 'Небо', es: 'cielo', pos: 'nouns' },
    { en: 'some', ru: 'Некоторые', uk: 'Деякі', es: 'alguno', pos: 'nouns' },
    { en: 'stars', ru: 'Звезды', uk: 'Зірки', es: 'estrellas', pos: 'nouns' },
    { en: 'students', ru: 'Учащихся', uk: 'Здобувачів вищої освіти', es: 'estudiantes', pos: 'nouns' },
    { en: 'tasks', ru: 'Задачи', uk: 'Завдання', es: 'tareas', pos: 'nouns' },
    { en: 'there', ru: 'Там', uk: 'Там', es: 'allá', pos: 'adverbs' },
    { en: 'towels', ru: 'Полотенце', uk: 'Рушник', es: 'toallas', pos: 'nouns' },
    { en: 'toy', ru: 'Игрушка', uk: 'Іграшка', es: 'juguete', pos: 'nouns' },
    { en: 'trees', ru: 'Деревья', uk: 'Деревами', es: 'árboles', pos: 'nouns' },
    { en: 'useful', ru: 'Полезный', uk: 'Корисне', es: 'útil', pos: 'adjectives' },
    { en: 'windows', ru: 'Окно', uk: 'Вікно', es: 'ventanas', pos: 'nouns' },
  ],
  10: [
    { en: 'translate', ru: 'Переводить', uk: 'Перекладати', es: 'traducir', pos: 'verbs' },
    { en: 'fix', ru: 'Чинить (ремонтировать)', uk: 'Лагодити (ремонтувати)', es: 'arreglar', pos: 'verbs' },
    { en: 'learn', ru: 'Учить (изучать)', uk: 'Вчити (вивчати)', es: 'aprender', pos: 'verbs' },
    { en: 'save', ru: 'Экономить (сохранять)', uk: 'Економити (зберігати)', es: 'ahorrar', pos: 'verbs' },
    { en: 'show', ru: 'Показывать', uk: 'Показувати', es: 'espectáculo', pos: 'irregular_verbs' },
    { en: 'respect', ru: 'Уважать', uk: 'Поважати', es: 'respeto', pos: 'verbs' },
    { en: 'protect', ru: 'Защищать', uk: 'Захищати', es: 'proteger', pos: 'verbs' },
    { en: 'repair', ru: 'Чинить (ремонтировать)', uk: 'Лагодити (ремонтувати)', es: 'reparar', pos: 'verbs' },
    { en: 'print', ru: 'Печатать', uk: 'Друкувати', es: 'imprimir', pos: 'verbs' },
    { en: 'obey', ru: 'Соблюдать (повиноваться)', uk: 'Дотримуватися (підкорятися)', es: 'cumplir', pos: 'verbs' },
    { en: 'explain', ru: 'Объяснять', uk: 'Пояснювати', es: 'explicar', pos: 'verbs' },
    { en: 'discuss', ru: 'Обсуждать', uk: 'Обговорювати', es: 'conversar', pos: 'verbs' },
    { en: 'move', ru: 'Переносить (двигать)', uk: 'Переносити (рухати)', es: 'mover', pos: 'verbs' },
    { en: 'reserve', ru: 'Бронировать (резервировать)', uk: 'Бронювати (резервувати)', es: 'reservar', pos: 'verbs' },
    { en: 'organize', ru: 'Организовывать', uk: 'Організовувати', es: 'organizar', pos: 'verbs' },
    { en: 'can', ru: 'Мочь (уметь)', uk: 'Могти (вміти)', es: 'poder', pos: 'verbs' },
    { en: 'must', ru: 'Должен', uk: 'Повинен', es: 'debe', pos: 'verbs' },
    { en: 'downstairs', ru: 'Внизу (на нижнем этаже)', uk: 'Внизу (на нижньому поверсі)', es: 'abajo', pos: 'adverbs' },
    { en: 'energy', ru: 'Энергия', uk: 'Енергія', es: 'energía', pos: 'nouns' },
    { en: 'month', ru: 'Месяц', uk: 'Місяць', es: 'mes', pos: 'nouns' },
    { en: 'suit', ru: 'Костюм', uk: 'Костюм', es: 'traje', pos: 'nouns' },
    { en: 'truck', ru: 'Грузовик', uk: 'Вантажівка', es: 'camión', pos: 'nouns' },
    { en: 'station', ru: 'Вокзал (станция)', uk: 'Вокзал (станція)', es: 'estación', pos: 'nouns' },
    { en: 'light', ru: 'Свет (освещение)', uk: 'Світло (освітлення)', es: 'luz', pos: 'nouns' },
    { en: 'soup', ru: 'Суп', uk: 'Суп', es: 'sopa', pos: 'nouns' },
    { en: 'nature', ru: 'Природа', uk: 'Природа', es: 'naturaleza', pos: 'nouns' },
    { en: 'uniform', ru: 'Униформа', uk: 'Уніформа', es: 'uniforme', pos: 'nouns' },
    { en: 'coat', ru: 'Пальто', uk: 'Пальто', es: 'abrigo', pos: 'nouns' },
    { en: 'cloakroom', ru: 'Гардероб', uk: 'Гардероб', es: 'guardarropa', pos: 'nouns' },
    { en: 'medicine', ru: 'Лекарство', uk: 'Ліки', es: 'medicamento', pos: 'nouns' },
    { en: 'water', ru: 'Вода', uk: 'Вода', es: 'agua', pos: 'nouns' },
    { en: 'reception', ru: 'Приемная (ресепшн)', uk: 'Приймальня (ресепшн)', es: 'recepción', pos: 'nouns' },
    { en: 'gift', ru: 'Подарок', uk: 'Подарунок', es: 'regalo', pos: 'nouns' },
    { en: 'sister', ru: 'Сестра', uk: 'Сестра', es: 'hermana', pos: 'nouns' },
    { en: 'restaurant', ru: 'Ресторан', uk: 'Ресторан', es: 'restaurante', pos: 'nouns' },
    { en: 'data', ru: 'Данные', uk: 'Дані', es: 'datos', pos: 'nouns' },
    { en: 'express', ru: 'Экспресс', uk: 'Експрес', es: 'expresar', pos: 'nouns' },
    { en: 'delicious', ru: 'Вкусный', uk: 'Смачний', es: 'delicioso', pos: 'adjectives' },
    { en: 'private', ru: 'Личный (приватный)', uk: 'Особистий (приватний)', es: 'privado', pos: 'adjectives' },
    { en: 'today', ru: 'Сегодня', uk: 'Сьогодні', es: 'hoy', pos: 'adverbs' },
    { en: 'daily', ru: 'Ежедневно', uk: 'Щодня', es: 'a diario', pos: 'adverbs' },
    { en: 'every', ru: 'Каждый', uk: 'Кожен', es: 'cada', pos: 'adverbs' },
    { en: 'her', ru: 'Ее', uk: 'Її', es: 'su', pos: 'pronouns' },
    { en: 'able', ru: 'Способный', uk: '-able', es: 'capaz', pos: 'adjectives' },
    { en: 'attend', ru: 'Посещать', uk: 'Увага', es: 'asistir', pos: 'nouns' },
    { en: 'bring', ru: 'Приносить', uk: 'Приносити', es: 'traer', pos: 'verbs' },
    { en: 'cannot', ru: 'Не может', uk: 'Не вміють', es: 'no puede', pos: 'nouns' },
    { en: 'choose', ru: 'Выбирать', uk: 'Вибирати', es: 'elegir', pos: 'irregular_verbs' },
    { en: 'computer', ru: 'компьютер', uk: "комп'ютер", es: 'ordenador', pos: 'nouns' },
    { en: 'decision', ru: 'Решение', uk: 'Рішення', es: 'decisión', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Позначення', es: 'documento', pos: 'nouns' },
    { en: 'early', ru: 'Рано', uk: 'Рано', es: 'temprano', pos: 'adverbs' },
    { en: 'enter', ru: 'Вводить', uk: 'Вводити', es: 'introducir', pos: 'nouns' },
    { en: 'fast', ru: 'Быстрыми', uk: 'Швидкий', es: 'rápido', pos: 'nouns' },
    { en: 'file', ru: 'Файл', uk: 'Файл', es: 'archivo', pos: 'nouns' },
    { en: 'holiday', ru: 'Отдых', uk: 'Пропуск', es: 'día festivo', pos: 'nouns' },
    { en: 'ignore', ru: 'Игнорировать', uk: 'Ігнорувати', es: 'ignorar', pos: 'nouns' },
    { en: 'join', ru: 'Объединяйте', uk: 'Долучись', es: 'unirse', pos: 'nouns' },
    { en: 'later', ru: 'Позже', uk: 'Пізніше', es: 'más tarde', pos: 'nouns' },
    { en: 'option', ru: 'Под заказ', uk: 'Опція', es: 'opción', pos: 'nouns' },
    { en: 'papers', ru: 'Бумажек', uk: 'Документи', es: 'papeles', pos: 'nouns' },
    { en: 'photo', ru: 'Фото', uk: 'Фото', es: 'foto', pos: 'nouns' },
    { en: 'project', ru: 'Проектные', uk: 'Проект', es: 'proyecto', pos: 'nouns' },
    { en: 'study', ru: 'Кабинет', uk: 'Кабінет', es: 'despacho', pos: 'nouns' },
    { en: 'system', ru: 'Система', uk: 'Система', es: 'sistema', pos: 'nouns' },
    { en: 'task', ru: 'Технологической', uk: 'Завдання', es: 'tarea', pos: 'nouns' },
    { en: 'tonight', ru: 'Сегодня вечером', uk: 'Сьогодні ввечері', es: 'esta noche', pos: 'nouns' },
  ],
  11: [
    { en: 'week', ru: 'Неделя', uk: 'Тиждень', es: 'semana', pos: 'nouns' },
    { en: 'laptop', ru: 'Ноутбук', uk: 'Ноутбук', es: 'computadora portátil', pos: 'nouns' },
    { en: 'shirt', ru: 'Рубашка', uk: 'Сорочка', es: 'camisa', pos: 'nouns' },
    { en: 'item', ru: 'Товар (позиция)', uk: 'Товар', es: 'artículo', pos: 'nouns' },
    { en: 'lecture', ru: 'Лекция', uk: 'Лекція', es: 'conferencia', pos: 'nouns' },
    { en: 'notification', ru: 'Уведомление', uk: 'Сповіщення', es: 'notificación', pos: 'nouns' },
    { en: 'salad', ru: 'Салат', uk: 'Салат', es: 'ensalada', pos: 'nouns' },
    { en: 'movie', ru: 'Фильм', uk: 'Фільм', es: 'película', pos: 'nouns' },
    { en: 'man', ru: 'Человек (мужчина)', uk: 'Людина (чоловік)', es: 'hombre', pos: 'nouns' },
    { en: 'keyboard', ru: 'Клавиатура', uk: 'Клавіатура', es: 'teclado', pos: 'nouns' },
    { en: 'woman', ru: 'Женщина', uk: 'Жінка', es: 'mujer', pos: 'nouns' },
    { en: 'hair', ru: 'Волосы', uk: 'Волосся', es: 'cabello', pos: 'nouns' },
    { en: 'program', ru: 'Программа', uk: 'Програма', es: 'programa', pos: 'nouns' },
    { en: 'carpet', ru: 'Ковер', uk: 'Килим', es: 'alfombra', pos: 'nouns' },
    { en: 'wonderful', ru: 'Чудесный', uk: 'Чудовий', es: 'maravilloso', pos: 'adjectives' },
    { en: 'dirty', ru: 'Грязный', uk: 'Брудний', es: 'sucio', pos: 'adjectives' },
    { en: 'white', ru: 'Белый', uk: 'Білий', es: 'blanco', pos: 'adjectives' },
    { en: 'difficult', ru: 'Сложный', uk: 'Складний', es: 'difícil', pos: 'adjectives' },
    { en: 'long', ru: 'Длинный', uk: 'Довгий', es: 'largo', pos: 'adjectives' },
    { en: 'yesterday', ru: 'Вчера', uk: 'Вчора', es: 'ayer', pos: 'adverbs' },
    { en: 'ago', ru: 'Тому (назад)', uk: 'Тому', es: 'atrás', pos: 'adverbs' },
    { en: 'answered', ru: 'Ответ', uk: 'Відповідь', es: 'respondió', pos: 'verbs' },
    { en: 'attended', ru: 'Участвовал', uk: 'Відвідане', es: 'asistió', pos: 'verbs' },
    { en: 'batteries', ru: 'Аккумулятор', uk: 'Акумулятор', es: 'baterias', pos: 'nouns' },
    { en: 'booked', ru: 'Книга', uk: 'Книга', es: 'reservado', pos: 'verbs' },
    { en: 'brushed', ru: 'Обработан (очищен) щеточной машиной', uk: 'Щіткою', es: 'cepillado', pos: 'verbs' },
    { en: 'called', ru: 'Звонить', uk: 'Телефонувати', es: 'llamado', pos: 'verbs' },
    { en: 'canceled', ru: 'Аннули-рованного', uk: 'Скасованих', es: 'cancelado', pos: 'verbs' },
    { en: 'changed', ru: 'Менять', uk: 'Змінювати', es: 'cambió', pos: 'verbs' },
    { en: 'charged', ru: 'Они взяли с нас 60 $ за бутылку', uk: 'Нараховано', es: 'cargado', pos: 'verbs' },
    { en: 'checked', ru: 'Проверять', uk: 'Перевіряти', es: 'comprobado', pos: 'verbs' },
    { en: 'cleaned', ru: 'Чистить', uk: 'Чистити', es: 'limpiado', pos: 'verbs' },
    { en: 'closed', ru: 'Закрывать', uk: 'Зачиняти', es: 'cerrado', pos: 'verbs' },
    { en: 'confirmed', ru: 'Подтверждено', uk: 'Підтверджено', es: 'confirmado', pos: 'verbs' },
    { en: 'cooked', ru: 'Готовить', uk: 'Готувати', es: 'cocido', pos: 'verbs' },
    { en: 'days', ru: 'Дней', uk: 'Днів', es: 'días', pos: 'nouns' },
    { en: 'deleted', ru: 'Удалено', uk: 'Видалено', es: 'eliminado', pos: 'verbs' },
    { en: 'delivered', ru: 'Введено в эксплуатацию', uk: 'Що надаються', es: 'entregado', pos: 'verbs' },
    { en: 'discussed', ru: 'Обсуждать', uk: 'Обговорювати', es: 'discutido', pos: 'verbs' },
    { en: 'finished', ru: 'Заканчивать', uk: 'Закінчувати', es: 'finalizado', pos: 'verbs' },
    { en: 'fixed', ru: 'Чинить (ремонтировать)', uk: 'Лагодити (ремонтувати)', es: 'fijado', pos: 'verbs' },
    { en: 'friend', ru: 'Дружище', uk: 'Друг', es: 'amigo', pos: 'nouns' },
    { en: 'helped', ru: 'Помогать', uk: 'Допомагати', es: 'ayudó', pos: 'verbs' },
    { en: 'hours', ru: 'Часы', uk: 'Години', es: 'horas', pos: 'nouns' },
    { en: 'ironed', ru: 'Выглаженный', uk: 'Прасується', es: 'planchado', pos: 'verbs' },
    { en: 'last', ru: 'Последний', uk: 'Останній', es: 'último', pos: 'nouns' },
    { en: 'locked', ru: 'Замок', uk: 'Замок', es: 'bloqueado', pos: 'verbs' },
    { en: 'mailed', ru: 'Почта', uk: 'Пошта', es: 'blindado', pos: 'verbs' },
    { en: 'minutes', ru: 'Минут', uk: 'Хвилин', es: 'minutos', pos: 'nouns' },
    { en: 'missed', ru: 'Пропущено', uk: 'Пропущено', es: 'omitido', pos: 'verbs' },
    { en: 'moved', ru: 'Переносить (двигать)', uk: 'Переносити (рухати)', es: 'emocionado', pos: 'verbs' },
    { en: 'opened', ru: 'Открытый', uk: 'Відкритий', es: 'abierto', pos: 'verbs' },
    { en: 'ordered', ru: 'Заказывать', uk: 'Замовляти', es: 'ordenado', pos: 'verbs' },
    { en: 'packed', ru: 'Выравнивание данных', uk: 'Упаковано', es: 'lleno', pos: 'verbs' },
    { en: 'painted', ru: 'Окрашенный', uk: 'ФАРБОВАНО', es: 'pintado', pos: 'verbs' },
    { en: 'parked', ru: 'Парк', uk: 'Парк', es: 'estacionado', pos: 'verbs' },
    { en: 'plants', ru: 'Завод', uk: 'Завод', es: 'plantas', pos: 'nouns' },
    { en: 'prepared', ru: 'Готовить (подготавливать)', uk: 'Готувати (підготувати)', es: 'preparado', pos: 'verbs' },
    { en: 'present', ru: 'Есть', uk: 'Наявний', es: 'presente', pos: 'nouns' },
    { en: 'printed', ru: 'Печатать', uk: 'Друкувати', es: 'impreso', pos: 'verbs' },
    { en: 'printer', ru: 'Печатать', uk: 'Друкувати', es: 'impresora', pos: 'nouns' },
    { en: 'rented', ru: 'Ное, арендован', uk: 'Орендовано', es: 'alquilado', pos: 'verbs' },
    { en: 'returned', ru: 'Обратный', uk: 'Зворотний', es: 'regresó', pos: 'verbs' },
    { en: 'saved', ru: 'Экономить (сохранять)', uk: 'Економити (зберігати)', es: 'salvado', pos: 'verbs' },
    { en: 'shelves', ru: 'Полки', uk: 'Полиці', es: 'estantes', pos: 'nouns' },
    { en: 'shoes', ru: 'Туфли (обувь)', uk: 'Туфлі (взуття)', es: 'zapatos', pos: 'nouns' },
    { en: 'suitcases', ru: 'Чемодан', uk: 'Валіза', es: 'maletas', pos: 'nouns' },
    { en: 'sunday', ru: 'Воскресенье', uk: 'Неділя', es: 'Domingo', pos: 'nouns' },
    { en: 'three', ru: 'Три', uk: 'Три', es: 'tres', pos: 'nouns' },
    { en: 'tuesday', ru: 'Вторник', uk: 'Вівторок', es: 'Martes', pos: 'nouns' },
    { en: 'turned', ru: 'Превратятся', uk: 'Перевернутий', es: 'transformado', pos: 'verbs' },
    { en: 'uploaded', ru: 'Загружен', uk: 'Завантажено', es: 'subido', pos: 'verbs' },
    { en: 'visited', ru: 'Посетил', uk: 'Відвідане', es: 'visitado', pos: 'verbs' },
    { en: 'washed', ru: 'Мыть', uk: 'Мити', es: 'lavado', pos: 'verbs' },
    { en: 'watched', ru: 'Смотреть', uk: 'Дивитися', es: 'observó', pos: 'verbs' },
    { en: 'watered', ru: 'Вода', uk: 'Вода', es: 'regado', pos: 'verbs' },
  ],
  12: [
    { en: 'boat', ru: 'Лодка', uk: 'Човен', es: 'bote', pos: 'nouns' },
    { en: 'cake', ru: 'Торт (пирожное)', uk: 'Торт (тістечко)', es: 'pastel', pos: 'nouns' },
    { en: 'fence', ru: 'Забор', uk: 'Паркан', es: 'cerca', pos: 'nouns' },
    { en: 'headphones', ru: 'Наушники', uk: 'Навушники', es: 'auriculares', pos: 'nouns' },
    { en: 'sandwich', ru: 'Бутерброд', uk: 'Бутерброд', es: 'sándwich', pos: 'nouns' },
    { en: 'apple', ru: 'Яблоко', uk: 'Яблуко', es: 'manzana', pos: 'nouns' },
    { en: 'article', ru: 'Статья', uk: 'Стаття', es: 'artículo', pos: 'nouns' },
    { en: 'jacket', ru: 'Куртка', uk: 'Куртка', es: 'chaqueta', pos: 'nouns' },
    { en: 'story', ru: 'История (рассказ)', uk: 'Історія (розповідь)', es: 'historia', pos: 'nouns' },
    { en: 'neighbor', ru: 'Сосед', uk: 'Сусід', es: 'vecino', pos: 'nouns' },
    { en: 'sofa', ru: 'Диван', uk: 'Диван', es: 'sofá', pos: 'nouns' },
    { en: 'picture', ru: 'Картина (рисунок)', uk: 'Картина (малюнок)', es: 'imagen', pos: 'nouns' },
    { en: 'pastry', ru: 'Выпечка', uk: 'Випічка', es: 'pasteles', pos: 'nouns' },
    { en: 'box', ru: 'Ящик (коробка)', uk: 'Ящик (коробка)', es: 'caja', pos: 'nouns' },
    { en: 'gloves', ru: 'Перчатки', uk: 'Рукавички', es: 'guantes', pos: 'nouns' },
    { en: 'bird', ru: 'Птица', uk: 'Птах', es: 'pájaro', pos: 'nouns' },
    { en: 'text', ru: 'Текст', uk: 'Текст', es: 'texto', pos: 'nouns' },
    { en: 'topic', ru: 'Тема', uk: 'Тема', es: 'tema', pos: 'nouns' },
    { en: 'bridge', ru: 'Мост', uk: 'Міст', es: 'puente', pos: 'nouns' },
    { en: 'boots', ru: 'Ботинки', uk: 'Черевики', es: 'botas', pos: 'nouns' },
    { en: 'hot', ru: 'Горячий', uk: 'Гарячий', es: 'caliente', pos: 'adjectives' },
    { en: 'comfortable', ru: 'Удобный', uk: 'Зручний', es: 'cómodo', pos: 'adjectives' },
    { en: 'funny', ru: 'Забавный (смешной)', uk: 'Кумедний (смішний)', es: 'divertido', pos: 'adjectives' },
    { en: 'noisy', ru: 'Шумный', uk: 'Шумний', es: 'ruidoso', pos: 'adjectives' },
    { en: 'soft', ru: 'Мягкий', uk: 'М\\\'який', es: 'suave', pos: 'adjectives' },
    { en: 'warm', ru: 'Теплый', uk: 'Теплий', es: 'cálido', pos: 'adjectives' },
    { en: 'heavy', ru: 'Тяжелый', uk: 'Важкий', es: 'pesado', pos: 'adjectives' },
    { en: 'tasty', ru: 'Вкусный', uk: 'Смачний', es: 'sabroso', pos: 'adjectives' },
    { en: 'juicy', ru: 'Сочный', uk: 'Соковитий', es: 'jugoso', pos: 'adjectives' },
    { en: 'interesting', ru: 'Интересный', uk: 'Цікавий', es: 'interesante', pos: 'verbs' },
    { en: 'sweet', ru: 'Сладкий', uk: 'Солодкий', es: 'dulce', pos: 'adjectives' },
    { en: 'loud', ru: 'Громкий', uk: 'Гучний', es: 'alto', pos: 'adjectives' },
    { en: 'wooden', ru: 'Деревянный', uk: 'Дерев\\\'яний', es: 'de madera', pos: 'adjectives' },
    { en: 'rare', ru: 'Редкий', uk: 'Рідкісний', es: 'extraño', pos: 'adjectives' },
    { en: 'short', ru: 'Короткий', uk: 'Короткий', es: 'corto', pos: 'adjectives' },
    { en: 'ate', ru: 'Есть', uk: 'Їсти', es: 'comió', pos: 'nouns' },
    { en: 'bags', ru: 'Сумки', uk: 'Сумки', es: 'bolsas', pos: 'nouns' },
    { en: 'blue', ru: 'Синий', uk: 'Синій', es: 'azul', pos: 'nouns' },
    { en: 'bought', ru: 'Покупать', uk: 'Купувати', es: 'compró', pos: 'nouns' },
    { en: 'bread', ru: 'Хлеб', uk: 'Хліб', es: 'pan', pos: 'nouns' },
    { en: 'brought', ru: 'Приносить', uk: 'Приносити', es: 'trajo', pos: 'nouns' },
    { en: 'built', ru: 'Строить · построили', uk: 'Будувати · збудували', es: 'construido', pos: 'verbs' },
    { en: 'came', ru: 'Приходить', uk: 'Приходити', es: 'vino', pos: 'nouns' },
    { en: 'chose', ru: 'Выбирать', uk: 'Вибирати', es: 'eligió', pos: 'nouns' },
    { en: 'drank', ru: 'Пить', uk: 'Пити', es: 'bebió', pos: 'nouns' },
    { en: 'felt', ru: 'Чувствовать', uk: 'Відчувати', es: 'sintió', pos: 'nouns' },
    { en: 'forgot', ru: 'Забывать', uk: 'Забувати', es: 'olvidó', pos: 'nouns' },
    { en: 'found', ru: 'Находить', uk: 'Знаходити', es: 'encontró', pos: 'nouns' },
    { en: 'fresh', ru: 'Свежий', uk: 'Свіжий', es: 'fresco', pos: 'nouns' },
    { en: 'fruits', ru: 'Плодиков', uk: 'Фрукти', es: 'frutas', pos: 'nouns' },
    { en: 'gave', ru: 'Давать', uk: 'Давати', es: 'dio', pos: 'nouns' },
    { en: 'got', ru: 'Получать', uk: 'Отримувати', es: 'consiguió', pos: 'nouns' },
    { en: 'heard', ru: 'Слышать', uk: 'Чути', es: 'escuchó', pos: 'nouns' },
    { en: 'juice', ru: 'Сок', uk: 'Сік', es: 'jugo', pos: 'nouns' },
    { en: 'kept', ru: 'Хранить', uk: 'Зберігати', es: 'conservó', pos: 'nouns' },
    { en: 'knew', ru: 'Знать', uk: 'Знати', es: 'sabía', pos: 'nouns' },
    { en: 'left', ru: 'Уходить', uk: 'Йти', es: 'izquierda', pos: 'nouns' },
    { en: 'lost', ru: 'Потерянный', uk: 'Загублений', es: 'perdido', pos: 'nouns' },
    { en: 'made', ru: 'Создавать / готовить', uk: 'Створювати / готувати', es: 'hecho', pos: 'nouns' },
    { en: 'met', ru: 'Встречать', uk: 'Зустрічати', es: 'conoció', pos: 'nouns' },
    { en: 'red', ru: 'Красный', uk: 'Червоний', es: 'rojo', pos: 'verbs' },
    { en: 'said', ru: 'Сказать', uk: 'Сказати', es: 'dicho', pos: 'nouns' },
    { en: 'saw', ru: 'Видеть', uk: 'Бачити', es: 'sierra', pos: 'nouns' },
    { en: 'sent', ru: 'Отправлять', uk: 'Відправляти', es: 'enviado', pos: 'nouns' },
    { en: 'slept', ru: 'Спать', uk: 'Спати', es: 'durmió', pos: 'nouns' },
    { en: 'sold', ru: 'Продавать', uk: 'Продавати', es: 'vendido', pos: 'nouns' },
    { en: 'song', ru: 'Песня', uk: 'Пісня', es: 'canción', pos: 'nouns' },
    { en: 'spent', ru: 'Тратить', uk: 'Витрачати', es: 'gastado', pos: 'nouns' },
    { en: 'told', ru: 'Рассказывать', uk: 'Розповідати', es: 'dijo', pos: 'nouns' },
    { en: 'took', ru: 'Брать', uk: 'Брати', es: 'tomó', pos: 'nouns' },
    { en: 'understood', ru: 'Понимать', uk: 'Розуміти', es: 'comprendido', pos: 'nouns' },
    { en: 'wednesday', ru: 'Среда', uk: 'Середа', es: 'Miércoles', pos: 'nouns' },
    { en: 'went', ru: 'Идти', uk: 'Йти', es: 'fue', pos: 'nouns' },
    { en: 'words', ru: 'Слова', uk: 'Слів', es: 'palabras', pos: 'nouns' },
    { en: 'wore', ru: 'Носить', uk: 'Носити', es: 'vistió', pos: 'nouns' },
    { en: 'wrote', ru: 'Писать', uk: 'Писати', es: 'escribió', pos: 'nouns' },
  ],
  13: [
    // Verbs
    { en: 'prepare', ru: 'Готовить (подготавливать)', uk: 'Готувати (підготувати)', es: 'preparar', pos: 'verbs' },
    { en: 'cut', ru: 'Резать', uk: 'Різати', es: 'cortar', pos: 'irregular_verbs' },
    { en: 'shut', ru: 'Закрывать', uk: 'Зачиняти', es: 'cerrar', pos: 'irregular_verbs' },
    // Nouns
    { en: 'year', ru: 'Год', uk: 'Рік', es: 'año', pos: 'nouns' },
    { en: 'dress', ru: 'Платье', uk: 'Сукня', es: 'vestido', pos: 'nouns' },
    { en: 'truth', ru: 'Истина (правда)', uk: 'Істина (правда)', es: 'verdad', pos: 'nouns' },
    { en: 'center', ru: 'Центр', uk: 'Центр', es: 'centro', pos: 'nouns' },
    { en: 'artist', ru: 'Художник (артист)', uk: 'Художник (артист)', es: 'artista', pos: 'nouns' },
    { en: 'hat', ru: 'Шапка (шляпа)', uk: 'Шапка (капелюх)', es: 'sombrero', pos: 'nouns' },
    { en: 'newspaper', ru: 'Газета', uk: 'Газета', es: 'periódico', pos: 'nouns' },
    { en: 'balloon', ru: 'Воздушный шар', uk: 'Повітряна куля', es: 'globo', pos: 'nouns' },
    { en: 'manager', ru: 'Менеджер', uk: 'Менеджер', es: 'gerente', pos: 'nouns' },
    { en: 'coolness', ru: 'Прохлада', uk: 'Прохолода', es: 'frescura', pos: 'nouns' },
    { en: 'scheme', ru: 'Схема', uk: 'Схема', es: 'esquema', pos: 'nouns' },
    { en: 'reason', ru: 'Причина', uk: 'Причина', es: 'razón', pos: 'nouns' },
    // Adjectives
    { en: 'simple', ru: 'Простой', uk: 'Простий', es: 'simple', pos: 'adjectives' },
    { en: 'healthy', ru: 'Полезный (здоровый)', uk: 'Корисний (здоровий)', es: 'saludable', pos: 'adjectives' },
    { en: 'boring', ru: 'Скучный', uk: 'Нудний', es: 'aburrido', pos: 'verbs' },
    { en: 'powerful', ru: 'Мощный', uk: 'Потужний', es: 'poderoso', pos: 'adjectives' },
    { en: 'golden', ru: 'Золотой', uk: 'Золотий', es: 'dorado', pos: 'adjectives' },
    { en: 'official', ru: 'Официальный', uk: 'Офіційний', es: 'oficial', pos: 'adjectives' },
    { en: 'extra', ru: 'Лишний (дополнительный)', uk: 'Зайвий (додатковий)', es: 'extra', pos: 'adjectives' },
    { en: 'pleasant', ru: 'Приятный', uk: 'Приємний', es: 'agradable', pos: 'adjectives' },
    { en: 'leather', ru: 'Кожаный', uk: 'Шкіряний', es: 'cuero', pos: 'adjectives' },
    // Adverbs
    { en: 'soon', ru: 'Скоро', uk: 'Скоро', es: 'pronto', pos: 'adverbs' },
    { en: 'armchairs', ru: 'Кресла', uk: 'Крісла', es: 'sillones', pos: 'nouns' },
    { en: 'blow', ru: 'Ударять', uk: 'Удар', es: 'golpe', pos: 'nouns' },
    { en: 'build', ru: 'Строить', uk: 'Будувати', es: 'construir', pos: 'irregular_verbs' },
    { en: 'hour', ru: 'Час', uk: 'Година', es: 'hora', pos: 'nouns' },
    { en: 'next', ru: 'След', uk: 'Наступний', es: 'próximo', pos: 'nouns' },
    { en: 'paint', ru: 'Рисовать', uk: 'Фарбувати', es: 'pintura', pos: 'nouns' },
    { en: 'place', ru: 'Место', uk: 'Місце', es: 'lugar', pos: 'nouns' },
    { en: 'shopping', ru: 'Шопинг', uk: 'Похід по магазинах', es: 'compras', pos: 'verbs' },
    { en: 'tell', ru: 'Рассказывать', uk: 'Розповідати', es: 'decir', pos: 'irregular_verbs' },
  ],
  14: [
    { en: 'better', ru: 'Лучше', uk: 'Краще', es: 'mejor', pos: 'adverbs' },
    { en: 'flashlight', ru: 'Фонарик', uk: 'Ліхтарик', es: 'linterna', pos: 'nouns' },
    { en: 'sauce', ru: 'Соус', uk: 'Соус', es: 'salsa', pos: 'nouns' },
    { en: 'bright', ru: 'Яркий', uk: 'Яскравий', es: 'brillante', pos: 'adjectives' },
    { en: 'color', ru: 'Цвет', uk: 'Колір', es: 'color', pos: 'nouns' },
    { en: 'notebook', ru: 'Тетрадь', uk: 'Зошит', es: 'cuaderno', pos: 'nouns' },
    { en: 'lake', ru: 'Озеро', uk: 'Озеро', es: 'lago', pos: 'nouns' },
    { en: 'beach', ru: 'Пляж', uk: 'Пляж', es: 'playa', pos: 'nouns' },
    { en: 'mustard', ru: 'Горчица', uk: 'Гірчиця', es: 'mostaza', pos: 'nouns' },
    { en: 'bitter', ru: 'Горький', uk: 'Гіркий', es: 'amargo', pos: 'adjectives' },
    { en: 'chocolate', ru: 'Шоколад', uk: 'Шоколад', es: 'chocolate', pos: 'nouns' },
    { en: 'dark', ru: 'Темный', uk: 'Темний', es: 'oscuro', pos: 'adjectives' },
    { en: 'snack', ru: 'Закуска', uk: 'Закуска', es: 'bocadillo', pos: 'nouns' },
    { en: 'passage', ru: 'Проход', uk: 'Прохід', es: 'paso', pos: 'nouns' },
    { en: 'road', ru: 'Дорога', uk: 'Дорога', es: 'camino', pos: 'nouns' },
    { en: 'lantern', ru: 'Фонарь', uk: 'Ліхтар', es: 'linterna', pos: 'nouns' },
    { en: 'yard', ru: 'Двор', uk: 'Двір', es: 'patio', pos: 'nouns' },
    { en: 'small', ru: 'Маленький', uk: 'Маленький', es: 'pequeño', pos: 'adjectives' },
    { en: 'river', ru: 'Река', uk: 'Річка', es: 'río', pos: 'nouns' },
    { en: 'pillow', ru: 'Подушка', uk: 'Подушка', es: 'almohada', pos: 'nouns' },
    { en: 'orange', ru: 'Апельсин', uk: 'Апельсин', es: 'naranja', pos: 'nouns' },
    { en: 'large', ru: 'Большой', uk: 'Великий', es: 'grande', pos: 'adjectives' },
    { en: 'basket', ru: 'Корзина', uk: 'Кошик', es: 'cesta', pos: 'nouns' },
    { en: 'armchair', ru: 'Кресло', uk: 'Крісло', es: 'sillón', pos: 'nouns' },
    { en: 'biggest', ru: 'Самый большой', uk: 'Найбільший', es: 'más grande', pos: 'adjectives' },
    { en: 'brighter', ru: 'Более яркий / ярче', uk: 'Яскравіший', es: 'más brillante', pos: 'adjectives' },
    { en: 'cheaper', ru: 'Дешевле · более дешёвый', uk: 'Дешевший', es: 'más barato', pos: 'adjectives' },
    { en: 'cheapest', ru: 'Самый дешёвый', uk: 'Найдешевший', es: 'el más barato', pos: 'adjectives' },
    { en: 'coldest', ru: 'Самый холодный', uk: 'Найхолодніший', es: 'más frío', pos: 'adjectives' },
    { en: 'darker', ru: 'Темнее', uk: 'Темніший', es: 'más oscuro', pos: 'adjectives' },
    { en: 'deeper', ru: 'Глубже · более глубокий', uk: 'Глибший', es: 'más profundo', pos: 'adjectives' },
    { en: 'fastest', ru: 'Самый быстрый', uk: 'Найшвидший', es: 'el más rápido', pos: 'adjectives' },
    { en: 'fish', ru: 'Рыба', uk: 'Риба', es: 'pez', pos: 'nouns' },
    { en: 'freshest', ru: 'Самый свежий', uk: 'Найсвіжіший', es: 'más fresco', pos: 'adjectives' },
    { en: 'grapes', ru: 'Виноград', uk: 'Виноград', es: 'uvas', pos: 'nouns' },
    { en: 'happier', ru: 'Счастливее · более счастливый', uk: 'Щасливіший', es: 'más feliz', pos: 'adjectives' },
    { en: 'heaviest', ru: 'Самый тяжелый', uk: 'Найважчий', es: 'más pesado', pos: 'adjectives' },
    { en: 'hottest', ru: 'Самый жаркий', uk: 'Найгарячіший', es: 'el más caliente', pos: 'adjectives' },
    { en: 'juicier', ru: 'Сочнее', uk: 'Соковитіший', es: 'más jugoso', pos: 'adjectives' },
    { en: 'lightest', ru: 'Самый лёгкий (о весе)', uk: 'Найлегший (за вагою)', es: 'el más ligero', pos: 'adjectives' },
    { en: 'liked', ru: 'Любить (нравиться)', uk: 'Подобатися (мин.: сподобалося)', es: 'gustar (p. ej. gustó)', pos: 'verbs' },
    { en: 'looks', ru: 'Выглядеть', uk: 'Виглядати (виглядає)', es: 'parecer', pos: 'verbs' },
    { en: 'more', ru: 'Более', uk: 'Більше', es: 'más', pos: 'adjectives' },
    { en: 'most', ru: 'Наиболее', uk: 'Найбільш', es: 'lo más', pos: 'adjectives' },
    { en: 'narrower', ru: 'Узже · более узкий', uk: 'Вужчий', es: 'más estrecho', pos: 'adjectives' },
    { en: 'path', ru: 'Тропинка', uk: 'Стежка', es: 'camino', pos: 'nouns' },
    { en: 'pears', ru: 'Груши', uk: 'Груші', es: 'peras', pos: 'nouns' },
    { en: 'quieter', ru: 'Тише', uk: 'Тихіший', es: 'más silencioso', pos: 'adjectives' },
    { en: 'quietest', ru: 'Самый тихий', uk: 'Найтихіший', es: 'más silencioso', pos: 'adjectives' },
    { en: 'riper', ru: 'Более спелый', uk: 'Стигліший', es: 'más maduro', pos: 'adjectives' },
    { en: 'safest', ru: 'Самый безопасный', uk: 'Найбезпечніший', es: 'más seguro', pos: 'adjectives' },
    { en: 'saltiest', ru: 'Самый соленый', uk: 'Найсолоніший', es: 'más salado', pos: 'adjectives' },
    { en: 'shorter', ru: 'Короче', uk: 'Коротший', es: 'más corto', pos: 'adjectives' },
    { en: 'shortest', ru: 'Самый короткий', uk: 'Найкоротший', es: 'el más corto', pos: 'adjectives' },
    { en: 'slower', ru: 'Медленнее · более медленный', uk: 'Повільніший', es: 'más lento', pos: 'adjectives' },
    { en: 'snacks', ru: 'Закуска', uk: 'Перекуси / закуски', es: 'bocadillos', pos: 'nouns' },
    { en: 'softer', ru: 'Мягче', uk: 'М’якший', es: 'más suave', pos: 'adjectives' },
    { en: 'softest', ru: 'Самый мягкий', uk: 'Найм’якіший', es: 'más suave', pos: 'adjectives' },
    { en: 'spicier', ru: 'Острее', uk: 'Гостріший', es: 'más picante', pos: 'adjectives' },
    { en: 'stronger', ru: 'Сильнее', uk: 'Сильніший', es: 'más fuerte', pos: 'adjectives' },
    { en: 'sweeter', ru: 'Слаще', uk: 'Солодший', es: 'más dulce', pos: 'adjectives' },
    { en: 'tallest', ru: 'Самый высокий', uk: 'Найвищий', es: 'más alto', pos: 'adjectives' },
    { en: 'tastiest', ru: 'Самый вкусный', uk: 'Найсмачніший', es: 'más sabroso', pos: 'adjectives' },
    { en: 'thinner', ru: 'Тоньше', uk: 'Тонший', es: 'más fino', pos: 'adjectives' },
    { en: 'tried', ru: 'Пытался / пыталась', uk: 'Спробував', es: 'intentó', pos: 'verbs' },
    { en: 'walked', ru: 'Гулял, ходил (прош.)', uk: 'Йти пішки (мин.: йшов / ходив)', es: 'caminó', pos: 'verbs' },
    { en: 'wider', ru: 'Шире · более широкий', uk: 'Ширший', es: 'más ancho', pos: 'adjectives' },
  ],
  15: [
    { en: 'chair', ru: 'Стул', uk: 'Стілець', es: 'silla', pos: 'nouns' },
    { en: 'cozy', ru: 'Уютный', uk: 'Затишний', es: 'acogedor', pos: 'adjectives' },
    { en: 'modern', ru: 'Современный', uk: 'Сучасний', es: 'moderno', pos: 'adjectives' },
    { en: 'silver', ru: 'Серебряный', uk: 'Срібний', es: 'plata', pos: 'adjectives' },
    { en: 'folder', ru: 'Папка', uk: 'Папка', es: 'carpeta', pos: 'nouns' },
    { en: 'envelope', ru: 'Конверт', uk: 'Конверт', es: 'sobre', pos: 'nouns' },
    { en: 'plastic', ru: 'Пластиковый', uk: 'Пластиковий', es: 'plástico', pos: 'adjectives' },
    { en: 'container', ru: 'Контейнер', uk: 'Контейнер', es: 'recipiente', pos: 'nouns' },
    { en: 'wireless', ru: 'Беспроводной', uk: 'Бездротовий', es: 'inalámbrico', pos: 'adjectives' },
    { en: 'woolen', ru: 'Шерстяной', uk: 'Вовняний', es: 'de lana', pos: 'adjectives' },
    { en: 'reliable', ru: 'Надежный', uk: 'Надійний', es: 'confiable', pos: 'adjectives' },
    { en: 'steel', ru: 'Стальной', uk: 'Сталевий', es: 'acero', pos: 'adjectives' },
    { en: 'lock', ru: 'Замок', uk: 'Замок', es: 'cerradura', pos: 'nouns' },
    { en: 'crunchy', ru: 'Хрустящий', uk: 'Хрусткий', es: 'crujiente', pos: 'adjectives' },
    { en: 'metal', ru: 'Металлический', uk: 'Металевий', es: 'metal', pos: 'adjectives' },
    { en: 'hammer', ru: 'Молоток', uk: 'Молоток', es: 'martillo', pos: 'nouns' },
    { en: 'sharp', ru: 'Острый', uk: 'Гострий', es: 'afilado', pos: 'adjectives' },
    { en: 'silk', ru: 'Шелковый', uk: 'Шовковий', es: 'seda', pos: 'adjectives' },
    { en: 'unmanned', ru: 'Беспилотный', uk: 'Безпілотний', es: 'no tripulado', pos: 'adjectives' },
    { en: 'account', ru: 'Аккаунт', uk: 'Акаунт', es: 'cuenta', pos: 'nouns' },
    { en: 'crumbs', ru: 'Крошки', uk: 'Крихти', es: 'migajas', pos: 'nouns' },
    { en: 'floor', ru: 'Пол', uk: 'Підлога', es: 'piso', pos: 'nouns' },
    { en: 'hook', ru: 'Крючок', uk: 'Гачок', es: 'gancho', pos: 'nouns' },
    { en: 'external', ru: 'Внешний', uk: 'Зовнішній', es: 'externo', pos: 'adjectives' },
    { en: 'battery', ru: 'Аккумулятор', uk: 'Акумулятор', es: 'batería', pos: 'nouns' },
    { en: 'strong', ru: 'Сильный', uk: 'Сильний', es: 'fuerte', pos: 'adjectives' },
    { en: 'unpleasant', ru: 'Неприятный', uk: 'Неприємний', es: 'desagradable', pos: 'adjectives' },
    { en: 'smell', ru: 'Запах', uk: 'Запах', es: 'olor', pos: 'nouns' },
    { en: 'dusty', ru: 'Пыльный', uk: 'Запилений', es: 'polvoriento', pos: 'adjectives' },
    { en: 'attic', ru: 'Чердак', uk: 'Горище', es: 'ático', pos: 'nouns' },
    { en: 'soy', ru: 'Соевый', uk: 'Соєвий', es: 'soja', pos: 'adjectives' },
    { en: 'round', ru: 'Круглый', uk: 'Круглий', es: 'redondo', pos: 'adjectives' },
    { en: 'rug', ru: 'Коврик', uk: 'Килимок', es: 'alfombra', pos: 'nouns' },
    { en: 'oat', ru: 'Овсяный', uk: 'Вівсяний', es: 'avena', pos: 'adjectives' },
    { en: 'sweater', ru: 'Свитер', uk: 'Светр', es: 'suéter', pos: 'nouns' },
    { en: 'yellow', ru: 'Желтый', uk: 'Жовтий', es: 'amarillo', pos: 'adjectives' },
    { en: 'bananas', ru: 'Бананы', uk: 'Банани', es: 'plátanos', pos: 'nouns' },
    { en: 'black', ru: 'Черный', uk: 'Чорний', es: 'negro', pos: 'nouns' },
    { en: 'blankets', ru: 'Одеяла', uk: 'Одіяла', es: 'mantas', pos: 'nouns' },
    { en: 'buildings', ru: 'Здания', uk: 'Будівлі', es: 'edificios', pos: 'nouns' },
    { en: 'clocks', ru: 'Часы, за исключением наручных', uk: 'Годинник', es: 'relojes', pos: 'nouns' },
    { en: 'cookies', ru: 'Печенье', uk: 'Печиво', es: 'galletas', pos: 'nouns' },
    { en: 'curtains', ru: 'Шторы', uk: 'Штори', es: 'cortinas', pos: 'nouns' },
    { en: 'driving', ru: 'Водить', uk: 'Водити', es: 'conduciendo', pos: 'verbs' },
    { en: 'drones', ru: 'Беспилотники', uk: 'Дрони', es: 'drones', pos: 'nouns' },
    { en: 'hers', ru: 'Ее', uk: 'Її', es: 'suyo', pos: 'pronouns' },
    { en: 'iron', ru: 'Утюг', uk: 'Праска', es: 'plancha', pos: 'nouns' },
    { en: 'knives', ru: 'Ножи', uk: 'Ножі', es: 'cuchillos', pos: 'nouns' },
    { en: 'licenses', ru: 'Лицензия', uk: 'Ліцензія', es: 'licencias', pos: 'nouns' },
    { en: 'maps', ru: 'Карты', uk: 'Карти', es: 'mapas', pos: 'nouns' },
    { en: 'mice', ru: 'Мыши', uk: 'Миші', es: 'ratones', pos: 'nouns' },
    { en: 'mine', ru: 'Мой', uk: 'Мій', es: 'mío', pos: 'pronouns' },
    { en: 'nuts', ru: 'Орех', uk: 'Горіх', es: 'nueces', pos: 'nouns' },
    { en: 'ours', ru: 'Наши', uk: 'Наші', es: 'nuestro', pos: 'pronouns' },
    { en: 'paper', ru: 'Бумага', uk: 'Папір', es: 'papel', pos: 'nouns' },
    { en: 'ribbons', ru: 'Ленты', uk: 'Стрічки', es: 'cintas', pos: 'nouns' },
    { en: 'rings', ru: 'Кольца', uk: 'Кільця', es: 'anillos', pos: 'nouns' },
    { en: 'ripe', ru: 'Спелый', uk: 'Стиглий', es: 'maduro', pos: 'nouns' },
    { en: 'salty', ru: 'Солёный', uk: 'Солоний', es: 'salado', pos: 'nouns' },
    { en: 'scarves', ru: 'Шарфы', uk: 'Шарфи, хустки', es: 'bufandas', pos: 'nouns' },
    { en: 'theirs', ru: 'Их', uk: 'Їхній', es: 'suyo', pos: 'pronouns' },
    { en: 'thin', ru: 'Тонкий', uk: 'Тонкий', es: 'delgado', pos: 'nouns' },
    { en: 'tomatoes', ru: 'Помидоры', uk: 'Помідори', es: 'tomates', pos: 'nouns' },
    { en: 'tools', ru: 'Инструменты', uk: 'Інструменти', es: 'herramientas', pos: 'nouns' },
    { en: 'yours', ru: 'Твой · ваш', uk: 'Твій · ваш', es: 'tuyo', pos: 'pronouns' },
  ],
  16: [
    { en: 'quickly', ru: 'Быстро', uk: 'Швидко', es: 'rápidamente', pos: 'adverbs' },
    { en: 'personally', ru: 'Лично', uk: 'Особисто', es: 'personalmente', pos: 'adverbs' },
    { en: 'uncomfortable', ru: 'Неудобный', uk: 'Незручний', es: 'incómodo', pos: 'adjectives' },
    { en: 'polite', ru: 'Вежливый', uk: 'Ввічливий', es: 'educado', pos: 'adjectives' },
    { en: 'protective', ru: 'Защитный', uk: 'Захисний', es: 'protector', pos: 'adjectives' },
    { en: 'experienced', ru: 'Опытный', uk: 'Досвідчений', es: 'experimentado', pos: 'adjectives' },
    { en: 'technical', ru: 'Технический', uk: 'Технічний', es: 'técnico', pos: 'adjectives' },
    { en: 'wet', ru: 'Мокрый', uk: 'Мокрий', es: 'húmedo', pos: 'adjectives' },
    { en: 'necessary', ru: 'Необходимый', uk: 'Необхідний', es: 'necesario', pos: 'adjectives' },
    { en: 'woollen', ru: 'Шерстяной', uk: 'Вовняний', es: 'de lana', pos: 'adjectives' },
    { en: 'honest', ru: 'Честный', uk: 'Чесний', es: 'honesto', pos: 'adjectives' },
    { en: 'stuffy', ru: 'Душный', uk: 'Душний', es: 'cargado', pos: 'adjectives' },
    { en: 'correct', ru: 'Правильный', uk: 'Правильний', es: 'correcto', pos: 'adjectives' },
    { en: 'guard', ru: 'Охранник', uk: 'Охоронець', es: 'guardia', pos: 'nouns' },
    { en: 'entrance', ru: 'Вход', uk: 'Вхід', es: 'entrada', pos: 'nouns' },
    { en: 'company', ru: 'Компания', uk: 'Компанія', es: 'compañía', pos: 'nouns' },
    { en: 'village', ru: 'Деревня', uk: 'Село', es: 'aldea', pos: 'nouns' },
    { en: 'master', ru: 'Мастер', uk: 'Майстер', es: 'maestro', pos: 'nouns' },
    { en: 'corner', ru: 'Угол', uk: 'Ріг', es: 'esquina', pos: 'nouns' },
    { en: 'clothing', ru: 'Одежда', uk: 'Одяг', es: 'ropa', pos: 'verbs' },
    { en: 'courier', ru: 'Курьер', uk: 'Кур\\\'єр', es: 'mensajero', pos: 'nouns' },
    { en: 'forest', ru: 'Лес', uk: 'Ліс', es: 'bosque', pos: 'nouns' },
    { en: 'cupboard', ru: 'Шкаф (для посуды)', uk: 'Шафа (для посуду)', es: 'armario', pos: 'nouns' },
    { en: 'grass', ru: 'Трава', uk: 'Трава', es: 'césped', pos: 'nouns' },
    { en: 'tableware', ru: 'Посуда', uk: 'Посуд', es: 'vajilla', pos: 'nouns' },
    { en: 'sink', ru: 'Раковина', uk: 'Мийка · умивальник', es: 'fregadero', pos: 'nouns' },
    { en: 'owner', ru: 'Владелец', uk: 'Власник', es: 'dueño', pos: 'nouns' },
    { en: 'addresses', ru: 'Адрес', uk: 'Адреса', es: 'direcciones', pos: 'nouns' },
    { en: 'away', ru: 'Пройти', uk: 'Подалі', es: 'lejos', pos: 'adverbs' },
    { en: 'back', ru: 'Назад', uk: 'Назад', es: 'atrás', pos: 'adverbs' },
    { en: 'balcony', ru: 'Балкон', uk: 'Балкон', es: 'balcón', pos: 'nouns' },
    { en: 'bottles', ru: 'Бутылки', uk: 'Пляшки', es: 'botellas', pos: 'nouns' },
    { en: 'brings', ru: 'Приносить', uk: 'Приносити', es: 'trae', pos: 'nouns' },
    { en: 'clear', ru: 'Ясный · понятный', uk: 'Ясний · зрозумілий', es: 'claro', pos: 'nouns' },
    { en: 'clients', ru: 'Клиенты', uk: 'Клієнти', es: 'clientela', pos: 'nouns' },
    { en: 'coins', ru: 'Монеты', uk: 'Монети', es: 'monedas', pos: 'nouns' },
    { en: 'colleagues', ru: 'Коллеги', uk: 'Колеги', es: 'colegas', pos: 'nouns' },
    { en: 'deals', ru: 'Сделка', uk: 'Угода', es: 'ofertas', pos: 'nouns' },
    { en: 'drops', ru: 'Капли', uk: 'Краплі', es: 'gotas', pos: 'nouns' },
    { en: 'fills', ru: 'Заливка', uk: 'Заповнює', es: 'llena', pos: 'nouns' },
    { en: 'finds', ru: 'Находить', uk: 'Знаходити', es: 'encuentra', pos: 'nouns' },
    { en: 'folders', ru: 'Папка', uk: 'Папка', es: 'carpetas', pos: 'nouns' },
    { en: 'give', ru: 'Давать', uk: 'Давати', es: 'dar', pos: 'irregular_verbs' },
    { en: 'green', ru: 'Зеленый', uk: 'Зелений', es: 'verde', pos: 'nouns' },
    { en: 'hands', ru: 'Руки', uk: 'Руки', es: 'manos', pos: 'nouns' },
    { en: 'hang', ru: 'Вешать / Висеть', uk: 'Вішати / Висіти', es: 'colgar', pos: 'irregular_verbs' },
    { en: 'herself', ru: 'Сама / себя', uk: 'Сама / себе', es: 'sí misma', pos: 'pronouns' },
    { en: 'jackets', ru: 'Куртка', uk: 'Куртка', es: 'chaquetas', pos: 'nouns' },
    { en: 'knife', ru: 'Нож', uk: 'Ніж', es: 'cuchillo', pos: 'nouns' },
    { en: 'leaflets', ru: 'Листовки', uk: 'Листівок', es: 'folletos', pos: 'nouns' },
    { en: 'myself', ru: 'Себя / сам', uk: 'Себе / сам', es: 'mí mismo', pos: 'pronouns' },
    { en: 'parcels', ru: 'Посылка', uk: 'Посилка', es: 'paquetes', pos: 'nouns' },
    { en: 'person', ru: 'Человек', uk: 'Людина', es: 'persona', pos: 'nouns' },
    { en: 'pick', ru: 'Выбирать', uk: 'Обирати', es: 'elegir', pos: 'verbs' },
    { en: 'plates', ru: 'Тарелка', uk: 'Тарілка', es: 'platos', pos: 'nouns' },
    { en: 'problems', ru: 'Проблема', uk: 'Проблема', es: 'problemas', pos: 'nouns' },
    { en: 'pull', ru: 'Тянуть', uk: 'Тягнути', es: 'jalar', pos: 'verbs' },
    { en: 'pulls', ru: 'Тянет', uk: 'Тягне', es: 'tira', pos: 'nouns' },
    { en: 'puts', ru: 'Класть', uk: 'Класти', es: 'pone', pos: 'nouns' },
    { en: 'rarely', ru: 'Редко', uk: 'Рідко', es: 'casi nunca', pos: 'adverbs' },
    { en: 'seldom', ru: 'Редко', uk: 'Рідко', es: 'rara vez', pos: 'nouns' },
    { en: 'sit', ru: 'Сидеть', uk: 'Сидіти', es: 'sentarse', pos: 'nouns' },
    { en: 'sits', ru: 'Сидеть', uk: 'Сидіти', es: 'se sienta', pos: 'nouns' },
    { en: 'socks', ru: 'Носки', uk: 'Шкарпетки', es: 'medias', pos: 'nouns' },
    { en: 'sometimes', ru: 'Иногда', uk: 'Іноді', es: 'a veces', pos: 'adverbs' },
    { en: 'stop', ru: 'Остановиться', uk: 'Зупинитися', es: 'detener', pos: 'verbs' },
    { en: 'throw', ru: 'Бросать', uk: 'Кидати', es: 'tirar', pos: 'verbs' },
    { en: 'try', ru: 'Пытаться', uk: 'Намагатися', es: 'intentar', pos: 'nouns' },
    { en: 'turn', ru: 'Поворачивать', uk: 'Повернути', es: 'doblar', pos: 'verbs' },
    { en: 'waiter', ru: 'Официант', uk: 'Офіціант', es: 'mesero', pos: 'nouns' },
  ],
  17: [
    { en: 'hardworking', ru: 'Трудолюбивый', uk: 'Працьовитий', es: 'trabajo duro', pos: 'adjectives' },
    { en: 'huge', ru: 'Огромный', uk: 'Величезний', es: 'enorme', pos: 'adjectives' },
    { en: 'fragile', ru: 'Хрупкий', uk: 'Крихкий', es: 'frágil', pos: 'adjectives' },
    { en: 'attentive', ru: 'Внимательный', uk: 'Уважний', es: 'atento', pos: 'adjectives' },
    { en: 'classical', ru: 'Классический', uk: 'Класичний', es: 'clásico', pos: 'adjectives' },
    { en: 'ancient', ru: 'Древний (старинный)', uk: 'Стародавній', es: 'antiguo', pos: 'adjectives' },
    { en: 'stylish', ru: 'Стильный', uk: 'Стильний', es: 'elegante', pos: 'adjectives' },
    { en: 'skillful', ru: 'Умелый', uk: 'Вмілий', es: 'hábil', pos: 'adjectives' },
    { en: 'homemade', ru: 'Домашний (самодельный)', uk: 'Домашній', es: 'casero', pos: 'adjectives' },
    { en: 'porcelain', ru: 'Фарфоровый', uk: 'Порцеляновий', es: 'porcelana', pos: 'adjectives' },
    { en: 'secure', ru: 'Безопасный', uk: 'Безпечний', es: 'seguro', pos: 'adjectives' },
    { en: 'unique', ru: 'Уникальный', uk: 'Унікальний', es: 'único', pos: 'adjectives' },
    { en: 'convenient', ru: 'Удобный', uk: 'Зручний', es: 'conveniente', pos: 'adjectives' },
    { en: 'complex', ru: 'Сложный', uk: 'Складний', es: 'complejo', pos: 'adjectives' },
    { en: 'local', ru: 'Местный', uk: 'Місцевий', es: 'local', pos: 'adjectives' },
    { en: 'happily', ru: 'Весело (счастливо)', uk: 'Весело (щасливо)', es: 'felizmente', pos: 'adverbs' },
    { en: 'garage', ru: 'Гараж', uk: 'Гараж', es: 'cochera', pos: 'nouns' },
    { en: 'boss', ru: 'Начальник', uk: 'Начальник', es: 'jefe', pos: 'nouns' },
    { en: 'moment', ru: 'Момент', uk: 'Момент', es: 'momento', pos: 'nouns' },
    { en: 'app', ru: 'Приложение', uk: 'Додаток', es: 'aplicación', pos: 'nouns' },
    { en: 'receptionist', ru: 'Администратор (на ресепшене)', uk: 'Адміністратор', es: 'recepcionista', pos: 'nouns' },
    { en: 'skirt', ru: 'Юбка', uk: 'Спідниця', es: 'falda', pos: 'nouns' },
    { en: 'warehouse', ru: 'Склад', uk: 'Склад', es: 'depósito', pos: 'nouns' },
    { en: 'pot', ru: 'Горшок', uk: 'Горщик', es: 'olla', pos: 'nouns' },
    { en: 'pie', ru: 'Пирог', uk: 'Пиріг', es: 'pastel', pos: 'nouns' },
    { en: 'engineer', ru: 'Инженер', uk: 'Інженер', es: 'ingeniero', pos: 'nouns' },
    { en: 'roof', ru: 'Крыша', uk: 'Дах', es: 'techo', pos: 'nouns' },
    { en: 'tumbler', ru: 'Стакан', uk: 'Склянка', es: 'vaso', pos: 'nouns' },
    { en: 'website', ru: 'Сайт', uk: 'Сайт', es: 'sitio web', pos: 'nouns' },
    { en: 'worker', ru: 'Рабочий', uk: 'Робітник', es: 'obrero', pos: 'nouns' },
    { en: 'workshop', ru: 'Мастерская', uk: 'Майстерня', es: 'taller', pos: 'nouns' },
    { en: 'chef', ru: 'Повар', uk: 'Кухар', es: 'cocinero', pos: 'nouns' },
    { en: 'church', ru: 'Церковь', uk: 'Церква', es: 'iglesia', pos: 'nouns' },
    { en: 'crossing', ru: 'Переход', uk: 'Перехід', es: 'cruce', pos: 'verbs' },
    { en: 'contract', ru: 'Контракт', uk: 'Контракт', es: 'contrato', pos: 'nouns' },
    { en: 'fountain', ru: 'Фонтан', uk: 'Фонтан', es: 'fuente', pos: 'nouns' },
    { en: 'strawberry', ru: 'Клубника', uk: 'Полуниця', es: 'fresa', pos: 'nouns' },
    { en: 'market', ru: 'Рынок', uk: 'Ринок', es: 'mercado', pos: 'nouns' },
    { en: 'bush', ru: 'Куст', uk: 'Кущ', es: 'arbusto', pos: 'nouns' },
    { en: 'backyard', ru: 'Задний двор', uk: 'Задній двір', es: 'patio interior', pos: 'nouns' },
    { en: 'mechanic', ru: 'Механик', uk: 'Механік', es: 'mecánico', pos: 'nouns' },
    { en: 'engine', ru: 'Двигатель', uk: 'Двигун', es: 'motor', pos: 'nouns' },
    { en: 'daughter', ru: 'Дочь', uk: 'Донька', es: 'hija', pos: 'nouns' },
    { en: 'castle', ru: 'Замок', uk: 'Замок', es: 'castillo', pos: 'nouns' },
    { en: 'sheet', ru: 'Лист (бумаги)', uk: 'Аркуш', es: 'hoja', pos: 'nouns' },
    { en: 'teapot', ru: 'Чайник (для заварки)', uk: 'Чайник', es: 'tetera', pos: 'nouns' },
    { en: 'vacancy', ru: 'Вакансия', uk: 'Вакансія', es: 'vacante', pos: 'nouns' },
    { en: 'consultant', ru: 'Консультант', uk: 'Консультант', es: 'consultor', pos: 'nouns' },
    { en: 'hall', ru: 'Зал', uk: 'Зал', es: 'sala', pos: 'nouns' },
    { en: 'service', ru: 'Сервис', uk: 'Сервіс', es: 'servicio', pos: 'nouns' },
    { en: 'architect', ru: 'Архитектор', uk: 'Архітектор', es: 'arquitecto', pos: 'nouns' },
    { en: 'design', ru: 'Дизайн', uk: 'Дизайн', es: 'diseño', pos: 'nouns' },
    { en: 'best', ru: 'Лучший', uk: 'Найкращий', es: 'mejor', pos: 'adjectives' },
    { en: 'brewing', ru: 'Заваривание', uk: 'Пивоваріння', es: 'fabricación de cerveza', pos: 'verbs' },
    { en: 'brick', ru: 'Кирпич', uk: 'Цегла', es: 'ladrillo', pos: 'nouns' },
    { en: 'bringing', ru: 'Приносить', uk: 'Приносити', es: 'trayendo', pos: 'verbs' },
    { en: 'brother', ru: 'Брат', uk: 'Брат', es: 'hermano', pos: 'nouns' },
    { en: 'builders', ru: 'Строители', uk: 'Будівельників', es: 'constructores', pos: 'nouns' },
    { en: 'buying', ru: 'Покупать', uk: 'Купувати', es: 'comprar', pos: 'verbs' },
    { en: 'carrying', ru: 'Носить (нести)', uk: 'Носити (нести)', es: 'que lleva', pos: 'verbs' },
    { en: 'checking', ru: 'Проверять', uk: 'Перевіряти', es: 'de cheques', pos: 'verbs' },
    { en: 'children', ru: 'Дети', uk: 'Діти', es: 'niños', pos: 'nouns' },
    { en: 'choosing', ru: 'Выбирать', uk: 'Вибирати', es: 'eligiendo', pos: 'verbs' },
    { en: 'cleaning', ru: 'Чистить', uk: 'Чистити', es: 'limpieza', pos: 'verbs' },
    { en: 'client', ru: 'Клиент', uk: 'Клієнт', es: 'cliente', pos: 'nouns' },
    { en: 'coin', ru: 'Монета', uk: 'Монета', es: 'moneda', pos: 'nouns' },
    { en: 'conditions', ru: 'Условия', uk: 'Умови', es: 'condiciones', pos: 'nouns' },
    { en: 'cooking', ru: 'Готовка', uk: 'Готування', es: 'cocinando', pos: 'verbs' },
    { en: 'creating', ru: 'Создание', uk: 'Створення', es: 'creando', pos: 'verbs' },
    { en: 'cutting', ru: 'Резка', uk: 'Різання', es: 'corte', pos: 'verbs' },
    { en: 'deep', ru: 'Глубокий', uk: 'Глибокий', es: 'profundo', pos: 'adjectives' },
    { en: 'delivering', ru: 'Доставка', uk: 'Викладання', es: 'entregando', pos: 'verbs' },
    { en: 'dessert', ru: 'Десерт', uk: 'Десерт', es: 'postre', pos: 'nouns' },
    { en: 'discussing', ru: 'Обсуждать', uk: 'Обговорювати', es: 'que se discute', pos: 'verbs' },
    { en: 'drawing', ru: 'Рисунок', uk: 'Малюнок', es: 'dibujo', pos: 'verbs' },
    { en: 'elder', ru: 'Старший (о родственнике)', uk: 'Старший (про родича)', es: 'mayor', pos: 'adjectives' },
    { en: 'explaining', ru: 'Объяснять', uk: 'Пояснювати', es: 'explicando', pos: 'verbs' },
    { en: 'farmers', ru: 'Фермеров', uk: 'Фермери', es: 'agricultores', pos: 'nouns' },
    { en: 'fixing', ru: 'Чинить (ремонтировать)', uk: 'Лагодити (ремонтувати)', es: 'fijación', pos: 'verbs' },
    { en: 'flowers', ru: 'Цветы', uk: 'Квіти', es: 'flores', pos: 'nouns' },
    { en: 'front', ru: 'Лицевая сторона', uk: 'Перед (передня частина)', es: 'frente', pos: 'nouns' },
    { en: 'gardeners', ru: 'Садовники', uk: 'Садівники', es: 'jardineros', pos: 'nouns' },
    { en: 'gifts', ru: 'Подарки', uk: 'Подарунки', es: 'regalos', pos: 'nouns' },
    { en: 'hanging', ru: 'Вешать / Висеть', uk: 'Вішати / Висіти', es: 'colgante', pos: 'verbs' },
    { en: 'listening', ru: 'Слушать', uk: 'Слухати', es: 'escuchando', pos: 'verbs' },
    { en: 'little', ru: 'Маленький', uk: 'Малий', es: 'pequeño', pos: 'adjectives' },
    { en: 'looking', ru: 'Выглядеть', uk: 'Виглядати', es: 'mirando', pos: 'verbs' },
    { en: 'main', ru: 'Главный', uk: 'Головний', es: 'principal', pos: 'adjectives' },
    { en: 'ordering', ru: 'Заказывать', uk: 'Замовляти', es: 'ordenar', pos: 'verbs' },
    { en: 'packing', ru: 'Упаковка', uk: 'Пакування', es: 'embalaje', pos: 'verbs' },
    { en: 'painting', ru: 'Рисование', uk: 'Малювання', es: 'cuadro', pos: 'verbs' },
    { en: 'panels', ru: 'Панели', uk: 'Панелі', es: 'paneles', pos: 'nouns' },
    { en: 'pedestrian', ru: 'Пешеход', uk: 'Пішохід', es: 'peatonal', pos: 'nouns' },
    { en: 'picking', ru: 'Выбор', uk: 'Вибір', es: 'cosecha', pos: 'verbs' },
    { en: 'playing', ru: 'Играть', uk: 'Грати', es: 'jugando', pos: 'verbs' },
    { en: 'pouring', ru: 'Заливка', uk: 'Виливання', es: 'torrencial', pos: 'verbs' },
    { en: 'reading', ru: 'Читать', uk: 'Читати', es: 'lectura', pos: 'verbs' },
    { en: 'repairing', ru: 'Чинить (ремонтировать)', uk: 'Лагодити (ремонтувати)', es: 'reparando', pos: 'verbs' },
    { en: 'setting', ru: 'Настройка', uk: 'Установка', es: 'configuración', pos: 'verbs' },
    { en: 'showing', ru: 'Показывать', uk: 'Показувати', es: 'demostración', pos: 'verbs' },
    { en: 'signing', ru: 'Подписывать', uk: 'Підписувати', es: 'firma', pos: 'verbs' },
    { en: 'slicing', ru: 'Срез', uk: 'Нарізування', es: 'rebanar', pos: 'verbs' },
    { en: 'solar', ru: 'Солнечный', uk: 'Сонячний', es: 'solar', pos: 'adjectives' },
    { en: 'talented', ru: 'Талантливый', uk: 'Талановитий', es: 'talentoso', pos: 'adjectives' },
    { en: 'tall', ru: 'Высокий', uk: 'Високий', es: 'alto', pos: 'adjectives' },
    { en: 'throwing', ru: 'Бросание', uk: 'Метання', es: 'lanzamiento', pos: 'verbs' },
    { en: 'tourist', ru: 'Турист', uk: 'Турист', es: 'turístico', pos: 'nouns' },
    { en: 'translating', ru: 'Переводить', uk: 'Перекладати', es: 'traductorio', pos: 'verbs' },
    { en: 'trimming', ru: 'Отделка', uk: 'Обрізка', es: 'guarnición', pos: 'verbs' },
    { en: 'trying', ru: 'Пробуя', uk: 'Намагатися', es: 'intentando', pos: 'verbs' },
    { en: 'washing', ru: 'Мыть', uk: 'Мити', es: 'lavado', pos: 'verbs' },
    { en: 'watching', ru: 'Смотреть', uk: 'Дивитися', es: 'mirando', pos: 'verbs' },
    { en: 'watering', ru: 'Поливать', uk: 'Поливати', es: 'regando', pos: 'verbs' },
    { en: 'writing', ru: 'Писать', uk: 'Писати', es: 'escribiendo', pos: 'verbs' },
    { en: 'younger', ru: 'Младше', uk: 'Молодший', es: 'más joven', pos: 'adjectives' },
  ],
  18: [
    { en: 'press', ru: 'Нажимать', uk: 'Натискати', es: 'prensa', pos: 'verbs' },
    { en: 'push', ru: 'Толкать', uk: 'Штовхати', es: 'empujar', pos: 'verbs' },
    { en: 'invite', ru: 'Приглашать', uk: 'Запрошувати', es: 'invitar', pos: 'verbs' },
    { en: 'feed', ru: 'Кормить', uk: 'Годувати', es: 'alimentar', pos: 'verbs' },
    { en: 'hide', ru: 'Прятать', uk: 'Ховати', es: 'esconder', pos: 'verbs' },
    { en: 'touch', ru: 'Трогать', uk: 'Чіпати', es: 'tocar', pos: 'verbs' },
    { en: 'hard', ru: 'Твёрдый', uk: 'Твердий', es: 'duro', pos: 'adjectives' },
    { en: 'detailed', ru: 'Подробный', uk: 'Докладний', es: 'detallado', pos: 'adjectives' },
    { en: 'strict', ru: 'Строгий', uk: 'Суворий', es: 'estricto', pos: 'adjectives' },
    { en: 'public', ru: 'Общественный', uk: 'Громадський', es: 'público', pos: 'adjectives' },
    { en: 'sour', ru: 'Кислый', uk: 'Кислий', es: 'agrio', pos: 'adjectives' },
    { en: 'thick', ru: 'Густой', uk: 'Густий', es: 'grueso', pos: 'adjectives' },
    { en: 'precise', ru: 'Точный', uk: 'Точний', es: 'preciso', pos: 'adjectives' },
    { en: 'useless', ru: 'Бесполезный', uk: 'Марний', es: 'inútil', pos: 'adjectives' },
    { en: 'spacious', ru: 'Просторный', uk: 'Просторний', es: 'espacioso', pos: 'adjectives' },
    { en: 'special', ru: 'Специальный', uk: 'Спеціальний', es: 'especial', pos: 'adjectives' },
    { en: 'stray', ru: 'Бездомный', uk: 'Бездомний', es: 'extraviado', pos: 'adjectives' },
    { en: 'button', ru: 'Кнопка', uk: 'Кнопка', es: 'botón', pos: 'nouns' },
    { en: 'drawer', ru: 'Ящик', uk: 'Ящик', es: 'cajón', pos: 'nouns' },
    { en: 'page', ru: 'Страница', uk: 'Сторінка', es: 'página', pos: 'nouns' },
    { en: 'corridor', ru: 'Коридор', uk: 'Коридор', es: 'corredor', pos: 'nouns' },
    { en: 'cheese', ru: 'Сыр', uk: 'Сир', es: 'queso', pos: 'nouns' },
    { en: 'delegation', ru: 'Делегация', uk: 'Делегація', es: 'delegación', pos: 'nouns' },
    { en: 'gates', ru: 'Ворота', uk: 'Ворота', es: 'puertas', pos: 'nouns' },
    { en: 'wardrobe', ru: 'Шкаф', uk: 'Шафа', es: 'armario', pos: 'nouns' },
    { en: 'cup', ru: 'Стакан / Кружка', uk: 'Стакан / Кружка', es: 'taza', pos: 'nouns' },
    { en: 'kettle', ru: 'Чайник', uk: 'Чайник', es: 'pava', pos: 'nouns' },
    { en: 'surface', ru: 'Поверхность', uk: 'Поверхня', es: 'superficie', pos: 'nouns' },
    { en: 'event', ru: 'Мероприятие', uk: 'Захід', es: 'evento', pos: 'nouns' },
    { en: 'overalls', ru: 'Спецодежда', uk: 'Спецодяг', es: 'mono', pos: 'nouns' },
    { en: 'hallway', ru: 'Коридор / Прихожая', uk: 'Коридор / Передпокій', es: 'pasillo', pos: 'nouns' },
    { en: 'sunset', ru: 'Закат', uk: 'Захід сонця', es: 'atardecer', pos: 'nouns' },
    { en: 'camera', ru: 'Камера', uk: 'Камера', es: 'cámara', pos: 'nouns' },
    { en: 'journey', ru: 'Поездка', uk: 'Подорож', es: 'viaje', pos: 'nouns' },
    { en: 'wicket', ru: 'Калитка', uk: 'Хвіртка', es: 'postigo', pos: 'nouns' },
    { en: 'fir-tree', ru: 'Ель', uk: 'Ялинка', es: 'abeto', pos: 'nouns' },
    { en: 'sidewalk', ru: 'Тротуар', uk: 'Тротуар', es: 'acera', pos: 'nouns' },
    { en: 'berries', ru: 'Ягоды', uk: 'Ягоди', es: 'bayas', pos: 'nouns' },
    { en: 'shift', ru: 'Смена', uk: 'Зміна', es: 'cambio', pos: 'nouns' },
    { en: 'watches', ru: 'Часы', uk: 'Годинники', es: 'relojes', pos: 'nouns' },
    { en: 'flash-drive', ru: 'Флешка', uk: 'Флешка', es: 'unidad flash', pos: 'nouns' },
    { en: 'agent', ru: 'Средство', uk: 'Засіб', es: 'agente', pos: 'nouns' },
    { en: 'axe', ru: 'Топор', uk: 'Сокира', es: 'hacha', pos: 'nouns' },
    { en: 'family', ru: 'Семья', uk: 'Сім\\\'я', es: 'familia', pos: 'nouns' },
    { en: 'blueprints', ru: 'Чертежи', uk: 'Креслення', es: 'planos', pos: 'nouns' },
    { en: 'bottle', ru: 'Бутылка', uk: 'Пляшка', es: 'botella', pos: 'nouns' },
    { en: 'charity', ru: 'Благотворительность', uk: 'Благодійність', es: 'caridad', pos: 'nouns' },
    { en: 'conference', ru: 'Конференция', uk: 'Конференція', es: 'conferencia', pos: 'nouns' },
    { en: 'confirm', ru: 'Подтверждать', uk: 'Підтверджувати', es: 'confirmar', pos: 'nouns' },
    { en: 'fir', ru: 'Пихта', uk: 'Ялиця', es: 'abeto', pos: 'nouns' },
    { en: 'flash', ru: 'Вспышка', uk: 'Спалах', es: 'destello', pos: 'nouns' },
    { en: 'lamps', ru: 'Светильники', uk: 'Лампи', es: 'lámparas', pos: 'nouns' },
    { en: 'let', ru: 'Позволять', uk: 'Дозволяти', es: 'dejar', pos: 'irregular_verbs' },
    { en: 'messenger', ru: 'Посыльный', uk: 'Месенджер', es: 'mensajero', pos: 'nouns' },
    { en: 'narrow', ru: 'Узкий', uk: 'Вузький', es: 'angosto', pos: 'adjectives' },
    { en: 'newspapers', ru: 'Газета', uk: 'Газета', es: 'periódicos', pos: 'nouns' },
    { en: 'other', ru: 'Другие', uk: 'Інше', es: 'otro', pos: 'nouns' },
    { en: 'panel', ru: 'Панель', uk: 'Панель', es: 'panel', pos: 'nouns' },
    { en: 'please', ru: 'Пожалуйста', uk: 'Будь ласка', es: 'Por favor', pos: 'adverbs' },
    { en: 'pour', ru: 'Наливать', uk: 'Наливати', es: 'derramar', pos: 'nouns' },
    { en: 'thing', ru: 'Предмет', uk: 'Речі', es: 'cosa', pos: 'verbs' },
    { en: 'tree', ru: 'Дерево', uk: 'Дерево', es: 'árbol', pos: 'nouns' },
    { en: 'young', ru: 'Молодой', uk: 'Молодий', es: 'joven', pos: 'adjectives' },
  ],
  19: [
    { en: 'lie', ru: 'Лежать', uk: 'Лежати', es: 'mentir', pos: 'irregular_verbs' },
    { en: 'stand', ru: 'Стоять', uk: 'Стояти', es: 'pararse', pos: 'irregular_verbs' },
    { en: 'gray', ru: 'Серый', uk: 'Сірий', es: 'gris', pos: 'adjectives' },
    { en: 'low', ru: 'Низкий', uk: 'Низький', es: 'bajo', pos: 'adjectives' },
    { en: 'sandy', ru: 'Песчаный', uk: 'Піщаний', es: 'arenoso', pos: 'adjectives' },
    { en: 'tight', ru: 'Тесный', uk: 'Тісний', es: 'ajustado', pos: 'adjectives' },
    { en: 'rocky', ru: 'Скалистый', uk: 'Скелястий', es: 'rocoso', pos: 'adjectives' },
    { en: 'brave', ru: 'Смелый', uk: 'Сміливий', es: 'corajudo', pos: 'adjectives' },
    { en: 'thorny', ru: 'Колючий', uk: 'Колючий', es: 'espinoso', pos: 'adjectives' },
    { en: 'briefcase', ru: 'Портфель', uk: 'Портфель', es: 'maletín', pos: 'nouns' },
    { en: 'motorcycle', ru: 'Мотоцикл', uk: 'Мотоцикл', es: 'motocicleta', pos: 'nouns' },
    { en: 'shore', ru: 'Берег', uk: 'Берег', es: 'costa', pos: 'nouns' },
    { en: 'campfire', ru: 'Костер', uk: 'Багаття', es: 'hoguera', pos: 'nouns' },
    { en: 'stairs', ru: 'Лестница', uk: 'Сходи', es: 'escaleras', pos: 'nouns' },
    { en: 'lighthouse', ru: 'Маяк', uk: 'Маяк', es: 'faro', pos: 'nouns' },
    { en: 'island', ru: 'Остров', uk: 'Острів', es: 'isla', pos: 'nouns' },
    { en: 'oak', ru: 'Дуб', uk: 'Дуб', es: 'roble', pos: 'nouns' },
    { en: 'rainbow', ru: 'Радуга', uk: 'Веселка', es: 'arcoíris', pos: 'nouns' },
    { en: 'sea', ru: 'Море', uk: 'Море', es: 'mar', pos: 'nouns' },
    { en: 'basement', ru: 'Подвал', uk: 'Підвал', es: 'sótano', pos: 'nouns' },
    { en: 'shed', ru: 'Сарай', uk: 'Сарай', es: 'cobertizo', pos: 'nouns' },
    { en: 'sneakers', ru: 'Кроссовки', uk: 'Кросівки', es: 'zapatillas', pos: 'nouns' },
    { en: 'bench', ru: 'Скамейка', uk: 'Лавка', es: 'banco', pos: 'nouns' },
    { en: 'bookstore', ru: 'Книжный магазин', uk: 'Книжковий магазин', es: 'librería', pos: 'nouns' },
    { en: 'musician', ru: 'Музыкант', uk: 'Музикант', es: 'músico', pos: 'nouns' },
    { en: 'guitar', ru: 'Гитара', uk: 'Гітара', es: 'guitarra', pos: 'nouns' },
    { en: 'fireplace', ru: 'Камин', uk: 'Камін', es: 'chimenea', pos: 'nouns' },
    { en: 'ball', ru: 'Мяч', uk: "М'яч", es: 'pelota', pos: 'nouns' },
    { en: 'niece', ru: 'Племянница', uk: 'Племінниця', es: 'sobrina', pos: 'nouns' },
    { en: 'lane', ru: 'Переулок', uk: 'Провулок', es: 'carril', pos: 'nouns' },
    { en: 'chess', ru: 'Шахматы', uk: 'Шахи', es: 'ajedrez', pos: 'nouns' },
    { en: 'sun', ru: 'Солнце', uk: 'Сонце', es: 'sol', pos: 'nouns' },
    { en: 'baby', ru: 'Ребёнок', uk: 'Немовля', es: 'bebé', pos: 'nouns' },
    { en: 'boxes', ru: 'Ящик (коробка)', uk: 'Ящик (коробка)', es: 'cajas', pos: 'nouns' },
    { en: 'bushes', ru: 'Куст', uk: 'Кущ', es: 'arbustos', pos: 'nouns' },
    { en: 'cat', ru: 'Кот', uk: 'Кіт', es: 'gato', pos: 'nouns' },
    { en: 'clouds', ru: 'Облака', uk: 'Хмарно', es: 'nubes', pos: 'nouns' },
    { en: 'construction', ru: 'Строительной', uk: 'Конструкція', es: 'construcción', pos: 'nouns' },
    { en: 'curtain', ru: 'Занавеска', uk: 'Штори', es: 'cortina', pos: 'nouns' },
    { en: 'dear', ru: 'Дорогой', uk: 'Боже!', es: 'estimado', pos: 'nouns' },
    { en: 'dining', ru: 'Питание', uk: '<g id="1">ЇДАЛЬНЯ / < / g>', es: 'comida', pos: 'verbs' },
    { en: 'forests', ru: 'Лес', uk: 'Ліс', es: 'bosques', pos: 'nouns' },
    { en: 'gold', ru: 'Золотой', uk: 'Золотийcolor', es: 'oro', pos: 'nouns' },
    { en: 'grow', ru: 'Расти', uk: 'Рости', es: 'crecer', pos: 'nouns' },
    { en: 'hangs', ru: 'Вешать / Висеть', uk: 'Вішати / Висіти', es: 'cuelga', pos: 'nouns' },
    { en: 'hides', ru: 'Прятать', uk: 'Ховати', es: 'se esconde', pos: 'nouns' },
    { en: 'hills', ru: 'Холмы', uk: '"Пагорби"', es: 'sierras', pos: 'nouns' },
    { en: 'jumps', ru: '&#10;&#10;Прыжки', uk: 'Стрибки', es: 'salta', pos: 'nouns' },
    { en: 'lies', ru: 'Лежать', uk: 'Лежати', es: 'mentiras', pos: 'nouns' },
    { en: 'opposite', ru: 'Напротив', uk: 'Протилежний', es: 'opuesto', pos: 'nouns' },
    { en: 'parks', ru: 'Парк', uk: 'Парк', es: 'parques', pos: 'nouns' },
    { en: 'play', ru: 'Пьеса', uk: 'Грати', es: 'jugar', pos: 'nouns' },
    { en: 'plays', ru: 'Играет', uk: 'На монітор', es: 'juega', pos: 'nouns' },
    { en: 'poster', ru: 'Постер', uk: 'Плакат', es: 'póster', pos: 'nouns' },
    { en: 'sad', ru: 'Грустный', uk: 'Сумний', es: 'triste', pos: 'nouns' },
    { en: 'sail', ru: 'Плавать под парусом', uk: 'Плавати морем', es: 'navegar', pos: 'nouns' },
    { en: 'sails', ru: 'Паруса [такелаж]', uk: 'Вітрила', es: 'paño', pos: 'nouns' },
    { en: 'scarf', ru: 'Шарф', uk: 'Шарф', es: 'bufanda', pos: 'nouns' },
    { en: 'set', ru: 'Накрывать (на стол) / Ставить', uk: 'Накривати / Ставити', es: 'colocar', pos: 'irregular_verbs' },
    { en: 'site', ru: 'Площадке', uk: 'Сайт', es: 'sitio', pos: 'nouns' },
    { en: 'sleeps', ru: 'Спать', uk: 'Спати', es: 'duerme', pos: 'nouns' },
    { en: 'son', ru: 'Сын', uk: 'Син', es: 'hijo', pos: 'nouns' },
    { en: 'stands', ru: 'Стоять', uk: 'Стояти', es: 'se encuentra', pos: 'nouns' },
    { en: 'stone', ru: 'Камень', uk: 'Камінь', es: 'piedra', pos: 'nouns' },
    { en: 'tables', ru: 'Стол', uk: 'Стіл', es: 'mesas', pos: 'nouns' },
    { en: 'top', ru: 'Верх', uk: 'Верхній', es: 'arriba', pos: 'nouns' },
    { en: 'waits', ru: 'Ждать', uk: 'Чекати', es: 'murga', pos: 'nouns' },
    { en: 'wicker', ru: 'Плетеный', uk: 'Лоза', es: 'mimbre', pos: 'nouns' },
    { en: 'wide', ru: 'Широкий', uk: 'Широкий', es: 'ancho', pos: 'nouns' },
  ],
  20: [
    { en: 'somebody', ru: 'Кто-то', uk: 'Хтось', es: 'alguien', pos: 'pronouns' },
    { en: 'nobody', ru: 'Никто', uk: 'Ніхто', es: 'nadie', pos: 'pronouns' },
    { en: 'unusual', ru: 'Необычный', uk: 'Незвичайний', es: 'inusual', pos: 'adjectives' },
    { en: 'Italian', ru: 'Итальянский', uk: 'Італійський', es: 'italiano', pos: 'adjectives' },
    { en: 'essay', ru: 'Эссе', uk: 'Есе', es: 'ensayo', pos: 'nouns' },
    { en: 'souvenir', ru: 'Сувенир', uk: 'Сувенір', es: 'recuerdo', pos: 'nouns' },
    { en: 'kiosk', ru: 'Киоск', uk: 'Кіоск', es: 'quiosco', pos: 'nouns' },
    { en: 'advertisement', ru: 'Реклама', uk: 'Реклама', es: 'anuncio', pos: 'nouns' },
    { en: 'amazing', ru: 'Удивительный', uk: 'Дивовижний', es: 'asombroso', pos: 'verbs' },
    { en: 'anonymous', ru: 'Анонимный', uk: 'Анонімний', es: 'anónimo', pos: 'adjectives' },
    { en: 'anyone', ru: 'Кто-нибудь', uk: 'Хто-небудь', es: 'alguien', pos: 'nouns' },
    { en: 'blanket', ru: 'Одеяло', uk: 'Ковдра', es: 'frazada', pos: 'nouns' },
    { en: 'boutique', ru: 'Бутики', uk: 'Магазин', es: 'boutique', pos: 'nouns' },
    { en: 'business', ru: 'Бизнес', uk: 'Бізнес', es: 'negocio', pos: 'nouns' },
    { en: 'cabin', ru: 'ССП"', uk: 'Кабіна', es: 'cabina', pos: 'nouns' },
    { en: 'cinema', ru: 'Кинотеатр', uk: 'Кінотеатр', es: 'cine', pos: 'nouns' },
    { en: 'concrete', ru: 'Бетон', uk: 'Бетон', es: 'concreto', pos: 'nouns' },
    { en: 'director', ru: 'Директор', uk: 'Директор', es: 'director', pos: 'nouns' },
    { en: 'dropped', ru: 'Упали', uk: 'Скасована', es: 'abandonó', pos: 'verbs' },
    { en: 'eagle', ru: 'Орел', uk: 'Орел', es: 'águila', pos: 'nouns' },
    { en: 'employees', ru: 'Сотрудников', uk: 'Працівники', es: 'empleados', pos: 'nouns' },
    { en: 'enormous', ru: 'Огромный', uk: 'Величезний', es: 'enorme', pos: 'adjectives' },
    { en: 'everyone', ru: 'Все (каждый)', uk: 'Усі (кожен)', es: 'todos', pos: 'nouns' },
    { en: 'excellent', ru: 'Отличный', uk: 'Відмінний', es: 'excelente', pos: 'nouns' },
    { en: 'exhibition', ru: 'Выставка', uk: 'Виставка', es: 'exhibición', pos: 'nouns' },
    { en: 'guest', ru: 'Гость (ей)', uk: 'Гість', es: 'invitado', pos: 'nouns' },
    { en: 'helmet', ru: 'Каска', uk: 'Шолом', es: 'casco', pos: 'nouns' },
    { en: 'high', ru: 'Высокая', uk: 'Високий', es: 'alto', pos: 'nouns' },
    { en: 'hole', ru: 'Отб', uk: 'Отвір', es: 'agujero', pos: 'nouns' },
    { en: 'ocean', ru: 'Океан', uk: 'Океан', es: 'océano', pos: 'nouns' },
    { en: 'party', ru: 'Вечеринка', uk: 'Вечірка', es: 'fiesta', pos: 'nouns' },
    { en: 'plant', ru: 'Завод', uk: 'Завод', es: 'planta', pos: 'nouns' },
    { en: 'port', ru: 'Порт', uk: 'Порт', es: 'puerto', pos: 'nouns' },
    { en: 'porch', ru: 'Крыльцо (веранда)', uk: 'Ґанок (ганок)', es: 'porche', pos: 'nouns' },
    { en: 'rainy', ru: 'Дождь', uk: 'Дощеподібпа', es: 'lluvioso', pos: 'nouns' },
    { en: 'received', ru: 'Полученного', uk: 'Отримано', es: 'recibió', pos: 'verbs' },
    { en: 'ring', ru: 'Смазка', uk: 'Кільце', es: 'anillo', pos: 'verbs' },
    { en: 'rock', ru: 'Скала', uk: 'Скеля', es: 'roca', pos: 'nouns' },
    { en: 'safety', ru: 'Безопасностью', uk: 'Безпека', es: 'seguridad', pos: 'nouns' },
    { en: 'shark', ru: 'Акула', uk: 'Акула', es: 'tiburón', pos: 'nouns' },
    { en: 'single', ru: 'Одинарная', uk: 'Одиночне', es: 'soltero', pos: 'nouns' },
    { en: 'someone', ru: 'Кто-то', uk: 'Хтось', es: 'alguien', pos: 'nouns' },
    { en: 'student', ru: 'Учащаяся', uk: 'Учня*', es: 'alumno', pos: 'nouns' },
    { en: 'studio', ru: 'Студия', uk: 'Студія', es: 'estudio', pos: 'nouns' },
    { en: 'sunny', ru: 'Солнечный', uk: 'Сонячний', es: 'soleado', pos: 'nouns' },
    { en: 'tower', ru: 'Башня', uk: 'Вежа', es: 'torre', pos: 'nouns' },
    { en: 'trip', ru: 'Поездка', uk: 'Поїздка', es: 'viaje', pos: 'nouns' },
    { en: 'van', ru: 'Фургон', uk: 'Товариства', es: 'furgoneta', pos: 'nouns' },
    { en: 'weather', ru: 'Метео', uk: 'Погода', es: 'clima', pos: 'nouns' },
    { en: 'whole', ru: 'Целый', uk: 'Цілий', es: 'entero', pos: 'nouns' },
  ],
  21: [
    { en: 'no one', ru: 'Никто', uk: 'Ніхто', es: 'nadie', pos: 'pronouns' },
    { en: 'everybody', ru: 'Все', uk: 'Усі', es: 'todos', pos: 'pronouns' },
    { en: 'something', ru: 'Что-то', uk: 'Щось', es: 'algo', pos: 'verbs' },
    { en: 'nothing', ru: 'Ничего', uk: 'Нічого', es: 'nada', pos: 'verbs' },
    { en: 'everything', ru: 'Всё', uk: 'Все', es: 'todo', pos: 'verbs' },
    { en: 'anything', ru: 'Что-нибудь', uk: 'Що-небудь', es: 'cualquier cosa', pos: 'verbs' },
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
    { en: 'excuse', ru: 'Оправдание', uk: 'Виправдання', es: 'disculpar', pos: 'nouns' },
    { en: 'countryside', ru: 'Сельская местность', uk: 'Сільська місцевість', es: 'campo', pos: 'nouns' },
    { en: 'bar', ru: 'Бар', uk: 'Бар', es: 'bar', pos: 'nouns' },
    { en: 'believed', ru: 'Верить', uk: 'Вірити', es: 'creyó', pos: 'verbs' },
    { en: 'cave', ru: 'Пещера', uk: 'Печера', es: 'cueva', pos: 'nouns' },
    { en: 'fruit', ru: 'Фрукт', uk: 'Фрукт', es: 'fruta', pos: 'nouns' },
    { en: 'hid', ru: 'Спрятал / а', uk: 'Сховалися', es: 'escondido', pos: 'nouns' },
    { en: 'knocked', ru: 'Постучано', uk: 'Постукав', es: 'golpeado', pos: 'verbs' },
    { en: 'laptops', ru: 'Ноутбук', uk: 'Ноутбук', es: 'portátiles', pos: 'nouns' },
    { en: 'lot', ru: 'Сильно', uk: 'Лот', es: 'lote', pos: 'nouns' },
    { en: 'mat', ru: 'Коврик', uk: 'Килимок', es: 'estera', pos: 'nouns' },
    { en: 'notice', ru: 'Извещение', uk: 'Примітка', es: 'aviso', pos: 'nouns' },
    { en: 'recognized', ru: 'Признано', uk: 'Розпізнаний', es: 'conocido', pos: 'verbs' },
    { en: 'spilled', ru: 'Проливать / Ронять жидкость', uk: 'Проливати / Роняти рідину', es: 'derramado', pos: 'verbs' },
    { en: 'stole', ru: 'Красть', uk: 'Красти', es: 'robó', pos: 'nouns' },
    { en: 'visit', ru: 'Посещать', uk: 'Візит', es: 'visita', pos: 'nouns' },
    { en: 'wants', ru: 'Хотеть', uk: 'Хотіти', es: 'quiere', pos: 'nouns' },
  ],
  22: [
    { en: 'avoid', ru: 'Избегать', uk: 'Уникати', es: 'evitar', pos: 'verbs' },
    { en: 'consider', ru: 'Рассматривать', uk: 'Розглядати', es: 'considerar', pos: 'verbs' },
    { en: 'imagine', ru: 'Воображать', uk: 'Уявляти', es: 'imaginar', pos: 'verbs' },
    { en: 'appreciate', ru: 'Ценить', uk: 'Цінувати', es: 'agradecer', pos: 'verbs' },
    { en: 'dislike', ru: 'Не любить', uk: 'Не любити', es: 'aversión', pos: 'verbs' },
    { en: 'hate', ru: 'Ненавидеть', uk: 'Ненавидіти', es: 'odiar', pos: 'verbs' },
    { en: 'include', ru: 'Включать', uk: 'Включати', es: 'incluir', pos: 'verbs' },
    { en: 'refreshing', ru: 'Освежающий', uk: 'Освіжаючий', es: 'refrescante', pos: 'verbs' },
    { en: 'historical', ru: 'Исторический', uk: 'Історичний', es: 'histórico', pos: 'adjectives' },
    { en: 'picturesque', ru: 'Живописный', uk: 'Мальовничий', es: 'pintoresco', pos: 'adjectives' },
    { en: 'harmful', ru: 'Вредный', uk: 'Шкідливий', es: 'dañino', pos: 'adjectives' },
    { en: 'loyal', ru: 'Лояльный', uk: 'Лояльний', es: 'leal', pos: 'adjectives' },
    { en: 'industrial', ru: 'Промышленный', uk: 'Промисловий', es: 'industrial', pos: 'adjectives' },
    { en: 'dancing', ru: 'Танцы', uk: 'Танці', es: 'baile', pos: 'verbs' },
    { en: 'jogging', ru: 'Бег трусцой', uk: 'Біг підтюпцем', es: 'correr', pos: 'verbs' },
    { en: 'swimming', ru: 'Плавание', uk: 'Плавання', es: 'nadar', pos: 'verbs' },
    { en: 'economy', ru: 'Экономика', uk: 'Економіка', es: 'economía', pos: 'nouns' },
    { en: 'patience', ru: 'Терпение', uk: 'Терпіння', es: 'paciencia', pos: 'nouns' },
    { en: 'feedback', ru: 'Обратная связь', uk: 'Зворотний зв\\\'язок', es: 'comentario', pos: 'nouns' },
    { en: 'equipment', ru: 'Оборудование', uk: 'Обладнання', es: 'equipo', pos: 'nouns' },
    { en: 'laboratory', ru: 'Лаборатория', uk: 'Лабораторія', es: 'laboratorio', pos: 'nouns' },
    { en: 'auction', ru: 'Аукцион', uk: 'Аукціон', es: 'subasta', pos: 'nouns' },
    { en: 'mechanism', ru: 'Механизм', uk: 'Механізм', es: 'mecanismo', pos: 'nouns' },
    { en: 'strictly', ru: 'Строго', uk: 'Суворо', es: 'estrictamente', pos: 'adverbs' },
    { en: 'forbidden', ru: 'Запрещено', uk: 'Заборонено', es: 'prohibido', pos: 'adjectives' },
    { en: 'wild', ru: 'Дикий', uk: 'Дикий', es: 'salvaje', pos: 'adjectives' },
    { en: 'activity', ru: 'Деятельностью', uk: 'Діяльність', es: 'actividad', pos: 'nouns' },
    { en: 'album', ru: 'Альбом', uk: 'Альбом', es: 'álbum', pos: 'nouns' },
    { en: 'animals', ru: 'О животных', uk: 'Тварини', es: 'animales', pos: 'nouns' },
    { en: 'annual', ru: 'Годовой', uk: 'Річний', es: 'anual', pos: 'adjectives' },
    { en: 'artifacts', ru: 'Артефакты', uk: 'Артефакти', es: 'artefactos', pos: 'nouns' },
    { en: 'attending', ru: 'Присутствующий', uk: 'Леч', es: 'asistiendo', pos: 'verbs' },
    { en: 'attention', ru: 'Внимания', uk: 'УВАГУ!', es: 'atención', pos: 'nouns' },
    { en: 'calmed', ru: 'Спокойный', uk: 'Спокійний', es: 'calmado', pos: 'verbs' },
    { en: 'changing', ru: 'Менять', uk: 'Змінювати', es: 'cambio', pos: 'verbs' },
    { en: 'chemicals', ru: 'Химические вещества', uk: 'Хімікати', es: 'quimicos', pos: 'nouns' },
    { en: 'collecting', ru: 'Сбор', uk: 'Забір', es: 'coleccionando', pos: 'verbs' },
    { en: 'cultures', ru: 'Культур', uk: 'Культури', es: 'culturas', pos: 'nouns' },
    { en: 'enjoy', ru: 'Наслаждаться', uk: 'Насолоджуватися', es: 'disfrutar', pos: 'nouns' },
    { en: 'enjoyable', ru: 'Приятный', uk: 'Приємний', es: 'agradable', pos: 'adjectives' },
    { en: 'foreign', ru: 'Иностранный', uk: 'Іноземний', es: 'extranjero', pos: 'nouns' },
    { en: 'full', ru: 'Полный', uk: 'Повну', es: 'lleno', pos: 'nouns' },
    { en: 'future', ru: 'Будущий', uk: 'Майбутній', es: 'futuro', pos: 'nouns' },
    { en: 'gives', ru: 'Давать', uk: 'Давати', es: 'da', pos: 'nouns' },
    { en: 'having', ru: 'Иметь', uk: 'Мати', es: 'teniendo', pos: 'verbs' },
    { en: 'hobby', ru: 'Хобби', uk: 'Хобі', es: 'pasatiempo', pos: 'nouns' },
    { en: 'holding', ru: 'Держать', uk: 'Тримати', es: 'tenencia', pos: 'verbs' },
    { en: 'idea', ru: 'Идея', uk: 'Ідея', es: 'idea', pos: 'nouns' },
    { en: 'ignoring', ru: 'Игнорировать', uk: 'Ігнорувати', es: 'postergación', pos: 'verbs' },
    { en: 'includes', ru: 'Включать', uk: 'Включати', es: 'incluye', pos: 'nouns' },
    { en: 'keeps', ru: 'Хранить (держать)', uk: 'Зберігати (тримати)', es: 'mantiene', pos: 'nouns' },
    { en: 'landscapes', ru: 'Ландшафт', uk: '«Пейзажі»', es: 'paisajes', pos: 'nouns' },
    { en: 'languages', ru: 'Языки', uk: 'Мови', es: 'idiomas', pos: 'nouns' },
    { en: 'lawyer', ru: 'Юрист', uk: 'Юрист', es: 'abogado', pos: 'nouns' },
    { en: 'learning', ru: 'Учить (изучать)', uk: 'Вчити (вивчати)', es: 'aprendiendo', pos: 'verbs' },
    { en: 'legal', ru: 'Юридический', uk: 'Юридичний', es: 'legal', pos: 'adjectives' },
    { en: 'life', ru: 'Жизнь', uk: 'Життядажсжаж', es: 'vida', pos: 'nouns' },
    { en: 'likes', ru: 'Любить (нравиться)', uk: 'Любити (подобатися)', es: 'gustos', pos: 'nouns' },
    { en: 'mentioned', ru: 'Отмеченной', uk: 'Вказана', es: 'mencionado', pos: 'verbs' },
    { en: 'mind', ru: 'Возражать', uk: 'Розум', es: 'mente', pos: 'nouns' },
    { en: 'mountain', ru: 'Гора', uk: 'Гірська місцевість', es: 'montaña', pos: 'nouns' },
    { en: 'moving', ru: 'Переносить (двигать)', uk: 'Переносити (рухати)', es: 'emocionante', pos: 'verbs' },
    { en: 'mushrooms', ru: 'Грибы', uk: 'Гриби', es: 'hongos', pos: 'nouns' },
    { en: 'offer', ru: 'Предлагать', uk: 'Пропонувати', es: 'oferta', pos: 'nouns' },
    { en: 'opens', ru: 'Открытый', uk: 'Відкритий', es: 'abre', pos: 'nouns' },
    { en: 'opportunities', ru: 'Возможности', uk: 'Можливостями', es: 'oportunidades', pos: 'nouns' },
    { en: 'photographing', ru: 'Фотография', uk: 'Фотографирования', es: 'fotografiando', pos: 'verbs' },
    { en: 'plane', ru: 'Уровень', uk: 'ЛітакUnknown type of vehicle', es: 'avión', pos: 'nouns' },
    { en: 'positive', ru: 'Позитивного', uk: 'Заперечна', es: 'positivo', pos: 'adjectives' },
    { en: 'prefer', ru: 'Предпочитать', uk: 'Підняти пріоритет', es: 'preferir', pos: 'nouns' },
    { en: 'products', ru: 'Продукции', uk: 'Товари', es: 'productos', pos: 'nouns' },
    { en: 'lines', ru: 'Очереди', uk: 'Черги', es: 'pauta', pos: 'nouns' },
    { en: 'receiving', ru: 'Получение', uk: 'Установа', es: 'recepción', pos: 'verbs' },
    { en: 'relaxes', ru: 'Отдыхать (расслабляться)', uk: 'Відпочивати (розслаблятися)', es: 'relaja', pos: 'nouns' },
    { en: 'requires', ru: 'Требование', uk: 'Необхідно', es: 'requiere', pos: 'nouns' },
    { en: 'rescheduling', ru: 'Отсрочка погашения; пересмотр сроков (погашения); реструктуризация (задолженности)', uk: 'Перепланування', es: 'reprogramación', pos: 'verbs' },
    { en: 'riding', ru: 'Ездить', uk: 'Їздити', es: 'equitación', pos: 'verbs' },
    { en: 'schedule', ru: 'Выполнения', uk: 'Розклад', es: 'cronograma', pos: 'nouns' },
    { en: 'science', ru: 'Наука', uk: 'Наука', es: 'ciencia', pos: 'nouns' },
    { en: 'selling', ru: 'Продавать', uk: 'Продавати', es: 'venta', pos: 'verbs' },
    { en: 'smoking', ru: 'Курить', uk: 'Курити', es: 'de fumar', pos: 'verbs' },
    { en: 'souvenirs', ru: 'Сувенир', uk: 'Сувенір', es: 'recuerdos', pos: 'nouns' },
    { en: 'spending', ru: 'Тратить', uk: 'Витрачати', es: 'gasto', pos: 'verbs' },
    { en: 'stage', ru: 'Стадии', uk: 'Етап', es: 'escenario', pos: 'nouns' },
    { en: 'stamps', ru: 'Штампы', uk: 'Марки', es: 'sellos', pos: 'nouns' },
    { en: 'stressed', ru: '50 000 крб', uk: 'Підкреслив', es: 'estresado', pos: 'verbs' },
    { en: 'studying', ru: 'Кабинет', uk: 'Кабінет', es: 'estudiando', pos: 'verbs' },
    { en: 'suggest', ru: 'Предложить', uk: 'Запропонувати', es: 'sugerir', pos: 'nouns' },
    { en: 'suggested', ru: 'Рекомендуемые', uk: 'РЕКОМЕНДОВАНИЙ', es: 'sugerido', pos: 'verbs' },
    { en: 'talking', ru: 'Разговаривать', uk: 'Розмовляти', es: 'hablando', pos: 'verbs' },
    { en: 'teaching', ru: 'Преподавать', uk: 'Викладати', es: 'enseñanza', pos: 'verbs' },
    { en: 'team', ru: 'Команда', uk: 'Команда', es: 'equipo', pos: 'nouns' },
    { en: 'technician', ru: 'Техник', uk: 'Тех. спеціаліст', es: 'técnico', pos: 'nouns' },
    { en: 'term', ru: 'Семестр', uk: 'Семестр', es: 'término', pos: 'nouns' },
    { en: 'too', ru: '', uk: 'Теж', es: 'también', pos: 'nouns' },
    { en: 'toys', ru: 'Игрушки', uk: 'Іграшки', es: 'juguetes', pos: 'nouns' },
    { en: 'transport', ru: 'Транспорт', uk: 'Приміськoгo спoлучення', es: 'transporte', pos: 'nouns' },
    { en: 'traveling', ru: 'Путешествовать', uk: 'Подорожувати', es: 'de viaje', pos: 'verbs' },
    { en: 'using', ru: 'Используя', uk: 'Використання', es: 'usando', pos: 'verbs' },
    { en: 'visiting', ru: 'При посещении', uk: 'Відвідування', es: 'visitante', pos: 'verbs' },
    { en: 'waiting', ru: 'Ждать', uk: 'Чекати', es: 'espera', pos: 'verbs' },
    { en: 'walking', ru: 'Гулять (ходить пешком)', uk: 'Гуляти (йти пішки)', es: 'caminando', pos: 'verbs' },
    { en: 'working', ru: 'Работа', uk: 'Робота', es: 'laboral', pos: 'verbs' },
    { en: 'worried', ru: 'Беспокойство', uk: 'Турбота', es: 'preocupado', pos: 'verbs' },
  ],
  23: [
    { en: 'personal', ru: 'Личный', uk: 'Особистий', es: 'personal', pos: 'adjectives' },
    { en: 'immediately', ru: 'Немедленно', uk: 'Негайно', es: 'inmediatamente', pos: 'adverbs' },
    { en: 'periodically', ru: 'Периодически', uk: 'Періодично', es: 'periódicamente', pos: 'adverbs' },
    { en: 'thrice', ru: 'Трижды', uk: 'Тричі', es: 'tres veces', pos: 'adverbs' },
    { en: 'highly', ru: 'Высоко', uk: 'Високо', es: 'muy', pos: 'adverbs' },
    { en: 'postman', ru: 'Почтальон', uk: 'Листоноша', es: 'cartero', pos: 'nouns' },
    { en: 'application', ru: 'Заявление', uk: 'Заява', es: 'solicitud', pos: 'nouns' },
    { en: 'department', ru: 'Отдел', uk: 'Відділ', es: 'departamento', pos: 'nouns' },
    { en: 'bills', ru: 'Счет (в ресторане)', uk: 'Рахунок', es: 'facturas', pos: 'nouns' },
    { en: 'bin', ru: 'Мусорный бак', uk: 'Смітник', es: 'papelera', pos: 'nouns' },
    { en: 'directed', ru: 'Направлен', uk: 'Направлено', es: 'dirigido', pos: 'verbs' },
    { en: 'easily', ru: 'Без труда', uk: 'Легко', es: 'fácilmente', pos: 'adverbs' },
    { en: 'eaten', ru: 'Есть · съел · съеденный', uk: 'Їсти · їв · зʼїджений', es: 'comido', pos: 'verbs' },
    { en: 'end', ru: 'Конец', uk: 'Кінець', es: 'fin', pos: 'nouns' },
    { en: 'exercise', ru: 'Практика', uk: 'Вправа', es: 'ejercicio', pos: 'nouns' },
    { en: 'explained', ru: 'Объяснять', uk: 'Пояснювати', es: 'explicado', pos: 'verbs' },
    { en: 'files', ru: 'Файл', uk: 'Файл', es: 'archivos', pos: 'nouns' },
    { en: 'filled', ru: 'Заполненный', uk: 'Заповнено', es: 'completado', pos: 'verbs' },
    { en: 'filmmaker', ru: 'Кинорежиссёр', uk: 'Кінорежисер', es: 'cineasta', pos: 'nouns' },
    { en: 'forgotten', ru: 'Забыть · забыл · забытый', uk: 'Забути · забув · забутий', es: 'olvidado', pos: 'verbs' },
    { en: 'gardener', ru: 'Садовник', uk: 'Садівник', es: 'jardinero', pos: 'nouns' },
    { en: 'given', ru: 'Дать · дал · данный', uk: 'Дати · дав · даний', es: 'dado', pos: 'verbs' },
    { en: 'ideas', ru: 'Идеи', uk: 'Ідеї', es: 'ideas', pos: 'nouns' },
    { en: 'invited', ru: 'Приглашать', uk: 'Запрошувати', es: 'invitado', pos: 'verbs' },
    { en: 'learned', ru: 'Учить (изучать)', uk: 'Вчити (вивчати)', es: 'aprendió', pos: 'verbs' },
    { en: 'legend', ru: 'Условные обозначения', uk: 'Умовні позначення', es: 'leyenda', pos: 'nouns' },
    { en: 'management', ru: 'Управление', uk: 'Управління', es: 'gestión', pos: 'nouns' },
    { en: 'meetings', ru: 'Встреча', uk: 'Зустріч', es: 'reuniones', pos: 'nouns' },
    { en: 'paid', ru: 'Платить · заплатили · оплаченный', uk: 'Платити · заплатили · оплачений', es: 'pagado', pos: 'verbs' },
    { en: 'patients', ru: 'Пациенты', uk: 'Пацієнти', es: 'pacientes', pos: 'nouns' },
    { en: 'prizes', ru: 'Призов', uk: 'Премії', es: 'premios', pos: 'nouns' },
    { en: 'professional', ru: 'Профессиональный', uk: 'Професійний', es: 'profesional', pos: 'adjectives' },
    { en: 'protected', ru: 'Защищать', uk: 'Захищати', es: 'protegido', pos: 'verbs' },
    { en: 'repaired', ru: 'Чинить (ремонтировать)', uk: 'Лагодити (ремонтувати)', es: 'reparado', pos: 'verbs' },
    { en: 'reports', ru: 'Отчет', uk: 'Звіт', es: 'informes', pos: 'nouns' },
    { en: 'secretaries', ru: 'Секретари', uk: 'Секретарі', es: 'secretarias', pos: 'nouns' },
    { en: 'security', ru: 'Безопасность', uk: 'Безпека', es: 'seguridad', pos: 'nouns' },
    { en: 'signed', ru: 'Подписывать', uk: 'Підписувати', es: 'firmado', pos: 'verbs' },
    { en: 'solved', ru: 'Решенный', uk: 'Вирішено', es: 'resuelto', pos: 'verbs' },
    { en: 'supported', ru: 'Поддерживать', uk: 'Підтримувати', es: 'apoyado', pos: 'verbs' },
    { en: 'taken', ru: 'Взять · взял · взятый', uk: 'Взяти · взяв · взятий', es: 'tomado', pos: 'verbs' },
    { en: 'teacher', ru: 'Учитель', uk: 'Вчитель', es: 'maestro', pos: 'nouns' },
    { en: 'thrown', ru: 'Кинутый · брошенный', uk: 'Кинутий', es: 'arrojado', pos: 'nouns' },
    { en: 'tourists', ru: 'Туристы', uk: 'Туристи', es: 'turistas', pos: 'nouns' },
    { en: 'treated', ru: 'Баловать', uk: 'Балувати', es: 'tratado', pos: 'verbs' },
    { en: 'used', ru: 'Используется', uk: 'Використано', es: 'usado', pos: 'verbs' },
    { en: 'winners', ru: 'Победители', uk: 'Переможці', es: 'ganadores', pos: 'nouns' },
    { en: 'written', ru: 'Написать · написал · написанный', uk: 'Написати · написав · написаний', es: 'escrito', pos: 'verbs' },
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
    { en: 'just', ru: 'Только что', uk: 'Щойно', es: 'justo', pos: 'adverbs' },
    { en: 'already', ru: 'Уже', uk: 'Вже', es: 'ya', pos: 'adverbs' },
    { en: 'yet', ru: 'Еще (в отриц.)', uk: 'Ще', es: 'todavía', pos: 'adverbs' },
    { en: 'ever', ru: 'Когда-либо', uk: 'Коли-небудь', es: 'alguna vez', pos: 'adverbs' },
    { en: 'never', ru: 'Никогда', uk: 'Ніколи', es: 'nunca', pos: 'adverbs' },
    { en: 'somewhere', ru: 'Где-то', uk: 'Десь', es: 'en algún lugar', pos: 'adverbs' },
    { en: 'concert', ru: 'Концерт', uk: 'Концерт', es: 'concierto', pos: 'nouns' },
    { en: 'review', ru: 'Отзыв', uk: 'Відгук', es: 'revisar', pos: 'nouns' },
    { en: 'environment', ru: 'Среда (окружающая)', uk: 'Середовище', es: 'ambiente', pos: 'nouns' },
    { en: 'anniversary', ru: 'Годовщина', uk: 'Річниця', es: 'aniversario', pos: 'nouns' },
    { en: 'recipe', ru: 'Рецепт', uk: 'Рецепт', es: 'receta', pos: 'nouns' },
    { en: 'gallery', ru: 'Галерея', uk: 'Галерея', es: 'galería', pos: 'nouns' },
    { en: 'ladder', ru: 'Лестница (стремянка)', uk: 'Драбина', es: 'escalera', pos: 'nouns' },
    { en: 'invitation', ru: 'Приглашение', uk: 'Запрошення', es: 'invitación', pos: 'nouns' },
    { en: 'grant', ru: 'Грант', uk: 'Грант', es: 'conceder', pos: 'nouns' },
    { en: 'research', ru: 'Исследование', uk: 'Дослідження', es: 'investigación', pos: 'nouns' },
    { en: 'phenomenon', ru: 'Явление', uk: 'Явище', es: 'fenómeno', pos: 'nouns' },
    { en: 'actor', ru: 'Актёр', uk: 'Актор', es: 'actor', pos: 'nouns' },
    { en: 'aunt', ru: 'Тетя', uk: 'Тітка', es: 'tía', pos: 'nouns' },
    { en: 'baked', ru: 'Печеный', uk: 'Запечений', es: 'horneado', pos: 'verbs' },
    { en: 'belongings', ru: 'Имущество', uk: 'Речі', es: 'pertenencias', pos: 'nouns' },
    { en: 'blood', ru: 'Кровь', uk: 'Кров', es: 'sangre', pos: 'nouns' },
    { en: 'chief', ru: 'Начальник', uk: 'Керівник', es: 'jefe', pos: 'nouns' },
    { en: 'chosen', ru: 'Выбрать · выбрал · выбранный', uk: 'Вибрати · вибрав · вибраний', es: 'preferido', pos: 'verbs' },
    { en: 'colleague', ru: 'Коллега', uk: 'Колега', es: 'colega', pos: 'nouns' },
    { en: 'created', ru: 'Созданный', uk: 'Створений', es: 'creado', pos: 'verbs' },
    { en: 'driven', ru: 'Везти · вёз · везённый', uk: 'Везти · віз · везений', es: 'conducido', pos: 'verbs' },
    { en: 'drunk', ru: 'Пить · выпил · пьяный', uk: 'Пити · випив · п\\\'яний', es: 'ebrio', pos: 'verbs' },
    { en: 'employee', ru: 'Сотрудник', uk: 'Працівник', es: 'empleado', pos: 'nouns' },
    { en: 'latest', ru: 'Последние', uk: 'Останні оголошення', es: 'el último', pos: 'nouns' },
    { en: 'lent', ru: 'Одалживать', uk: 'Позичати', es: 'prestado', pos: 'nouns' },
    { en: 'magazine', ru: 'Журнал', uk: 'Журнал', es: 'revista', pos: 'nouns' },
    { en: 'mexican', ru: 'Мексиканский', uk: 'Мексиканський', es: 'mexicano', pos: 'nouns' },
    { en: 'mobile', ru: 'Мобильный', uk: 'Мобільна', es: 'móvil', pos: 'nouns' },
    { en: 'parents', ru: 'Родители', uk: 'Батьки', es: 'padres', pos: 'nouns' },
    { en: 'partners', ru: 'Партн', uk: 'Партнери', es: 'fogonadura', pos: 'nouns' },
    { en: 'real', ru: 'Реальный', uk: 'Реальний', es: 'real', pos: 'adjectives' },
    { en: 'results', ru: 'Проектирования', uk: 'Результати', es: 'resultados', pos: 'nouns' },
    { en: 'seen', ru: 'Видеть', uk: 'Бачити', es: 'visto', pos: 'nouns' },
    { en: 'sports', ru: 'Спорт', uk: 'Спорт', es: 'deportes', pos: 'nouns' },
    { en: 'stolen', ru: 'Красть', uk: 'Красти', es: 'robado', pos: 'nouns' },
    { en: 'stupid', ru: 'Глупый', uk: 'Дурний', es: 'estúpido', pos: 'nouns' },
    { en: 'such', ru: 'Такие', uk: 'Отакий', es: 'semejante', pos: 'nouns' },
    { en: 'tasted', ru: 'Дегустированный', uk: 'Скуштував (ла)', es: 'probado', pos: 'verbs' },
    { en: 'technologies', ru: 'Технологии', uk: 'Використання технологій', es: 'tecnologías', pos: 'nouns' },
    { en: 'tests', ru: 'Испытаний', uk: 'Випробуваннях', es: 'pruebas', pos: 'nouns' },
    { en: 'won', ru: 'Выиграть · выиграл · выигранный', uk: 'Виграти · виграв · виграний', es: 'ganado', pos: 'verbs' },
    { en: 'yourself', ru: 'Собой', uk: 'Себе', es: 'tú mismo', pos: 'nouns' },
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
    { en: 'deal', ru: 'Сделка', uk: 'Угода', es: 'trato', pos: 'irregular_verbs' },
    { en: 'inspector', ru: 'Инспектор', uk: 'Інспектор', es: 'inspector', pos: 'nouns' },
    { en: 'administration', ru: 'Администрация', uk: 'Адміністрація', es: 'administración', pos: 'nouns' },
    { en: 'animal', ru: 'Животное', uk: 'Тварина', es: 'animal', pos: 'nouns' },
    { en: 'answering', ru: 'Отвечать', uk: 'Відповідати', es: 'respondiendo', pos: 'verbs' },
    { en: 'celebrating', ru: 'Праздновать', uk: 'Святкувати', es: 'celebrando', pos: 'verbs' },
    { en: 'contracts', ru: 'Контракт', uk: 'Контракт', es: 'contratos', pos: 'nouns' },
    { en: 'delayed', ru: 'Задержанный', uk: 'Затриманий', es: 'demorado', pos: 'adjectives' },
    { en: 'deleting', ru: 'Удаление', uk: 'Видалення', es: 'eliminando', pos: 'verbs' },
    { en: 'four', ru: 'Четыре', uk: 'Чотири', es: 'cuatro', pos: 'nouns' },
    { en: 'knocking', ru: 'Стучать', uk: 'Стукати', es: 'golpes', pos: 'verbs' },
    { en: 'landscape', ru: 'Пейзаж', uk: 'Пейзаж', es: 'paisaje', pos: 'nouns' },
    { en: 'neighboring', ru: 'Соседний', uk: 'Сусідній', es: 'vecino', pos: 'adjectives' },
    { en: 'patrolling', ru: 'Патрулировать', uk: 'Патрулювати', es: 'patrullando', pos: 'verbs' },
    { en: 'printing', ru: 'Печатать', uk: 'Друкувати', es: 'impresión', pos: 'verbs' },
    { en: 'reckless', ru: 'Неосторожный', uk: 'Нерозумний', es: 'imprudente', pos: 'adjectives' },
    { en: 'relatives', ru: 'Родственники', uk: 'Родичі', es: 'parientes', pos: 'nouns' },
    { en: 'scratching', ru: 'Скретчинг', uk: 'ПОДРЯПИНИ', es: 'rascarse', pos: 'verbs' },
    { en: 'sending', ru: 'Отправлять', uk: 'Відправляти', es: 'envío', pos: 'verbs' },
    { en: 'services', ru: 'Услуги', uk: 'Послуги', es: 'servicios', pos: 'nouns' },
    { en: 'settings', ru: 'Настройки', uk: 'Налаштування', es: 'ajustes', pos: 'nouns' },
    { en: 'shouting', ru: 'Крик', uk: 'Часто кричить на когось', es: 'gritos', pos: 'verbs' },
    { en: 'singing', ru: 'Петь', uk: 'Співати', es: 'cantando', pos: 'verbs' },
    { en: 'speeding', ru: 'Ограничении скорости', uk: 'Прискорення', es: 'exceso de velocidad', pos: 'verbs' },
    { en: 'state', ru: 'Состояние / государство', uk: 'Стан / держава', es: 'estado', pos: 'nouns' },
    { en: 'taking', ru: 'Брать', uk: 'Брати', es: 'tomando', pos: 'verbs' },
    { en: 'tariff', ru: 'Тариф', uk: 'Тариф', es: 'arancel', pos: 'nouns' },
    { en: 'television', ru: 'Телевизор', uk: 'Телебачення', es: 'televisión', pos: 'nouns' },
    { en: 'telling', ru: 'Рассказывать', uk: 'Розповідати', es: 'narración', pos: 'verbs' },
    { en: 'unfamiliar', ru: 'Незнакомый', uk: 'Незнайомий', es: 'desconocido', pos: 'adjectives' },
  ],
  26: [
    { en: 'catch', ru: 'Ловить', uk: 'Ловити', es: 'atrapar', pos: 'irregular_verbs' },
    { en: 'run', ru: 'Запускать', uk: 'Запускати', es: 'correr', pos: 'irregular_verbs' },
    { en: 'heat', ru: 'Нагревать', uk: 'Нагрівати', es: 'calor', pos: 'verbs' },
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
    { en: 'startup', ru: 'Стартап', uk: 'Стартап', es: 'puesta en marcha', pos: 'nouns' },
    { en: 'capital', ru: 'Капитал', uk: 'Капітал', es: 'capital', pos: 'nouns' },
    { en: 'payment', ru: 'Оплата', uk: 'Оплата', es: 'pago', pos: 'nouns' },
    { en: 'magnet', ru: 'Магнит', uk: 'Магніт', es: 'imán', pos: 'nouns' },
    { en: 'trash', ru: 'Мусор', uk: 'Сміття', es: 'basura', pos: 'nouns' },
    { en: 'position', ru: 'Должность', uk: 'Посада', es: 'posición', pos: 'nouns' },
    { en: 'furnace', ru: 'Промышленная печь', uk: 'Промислова піч', es: 'horno', pos: 'nouns' },
    { en: 'parameter', ru: 'Параметр', uk: 'Параметр', es: 'parámetro', pos: 'nouns' },
    { en: 'crossroads', ru: 'Перекресток', uk: 'Перехрестя', es: 'encrucijada', pos: 'nouns' },
    { en: 'logo', ru: 'Логотип', uk: 'Логотип', es: 'logo', pos: 'nouns' },
    { en: 'funds', ru: 'Средства', uk: 'Кошти', es: 'fondos', pos: 'nouns' },
    { en: 'permission', ru: 'Разрешение', uk: 'Дозвіл', es: 'permiso', pos: 'nouns' },
    { en: 'salt', ru: 'Соль', uk: 'Сіль', es: 'sal', pos: 'nouns' },
    { en: 'designer', ru: 'Дизайнер', uk: 'Дизайнер', es: 'diseñador', pos: 'nouns' },
    { en: 'temperature', ru: 'Температура', uk: 'Температура', es: 'temperatura', pos: 'nouns' },
    { en: 'additional', ru: 'Дополнительная', uk: 'Додаткових', es: 'adicional', pos: 'adjectives' },
    { en: 'adds', ru: 'Прирост', uk: 'Додає', es: 'agrega', pos: 'nouns' },
    { en: 'attends', ru: 'Участие / s', uk: 'Відвідує', es: 'asiste', pos: 'nouns' },
    { en: 'attracts', ru: 'Притягивать', uk: 'Притягувати', es: 'atrae', pos: 'nouns' },
    { en: 'burns', ru: 'Гореть', uk: 'Горіти', es: 'quemaduras', pos: 'nouns' },
    { en: 'butter', ru: 'Сливочное масло', uk: 'Вершкове масло', es: 'manteca', pos: 'nouns' },
    { en: 'cage', ru: 'Клетка', uk: 'Обойма (військ)', es: 'jaula', pos: 'nouns' },
    { en: 'changes', ru: 'Менять', uk: 'Змінювати', es: 'cambios', pos: 'nouns' },
    { en: 'clubs', ru: 'Клубы', uk: 'Гуртки', es: 'clubs', pos: 'nouns' },
    { en: 'collect', ru: 'Сбор', uk: 'Збирати', es: 'recolectar', pos: 'nouns' },
    { en: 'comes', ru: 'Приходить', uk: 'Приходити', es: 'llega', pos: 'nouns' },
    { en: 'complete', ru: '«полное»', uk: 'Завершено', es: 'completo', pos: 'nouns' },
    { en: 'completes', ru: 'Завершить', uk: 'Завершує', es: 'completa', pos: 'nouns' },
    { en: 'creates', ru: 'Создает', uk: 'Створює', es: 'crea', pos: 'nouns' },
    { en: 'customers', ru: 'Клиенты', uk: 'Клієнтів', es: 'clientes', pos: 'nouns' },
    { en: 'die', ru: 'Умирать', uk: 'Вмирати', es: 'morir', pos: 'verbs' },
    { en: 'errors', ru: 'Ошибок', uk: 'Помилки', es: 'errores', pos: 'nouns' },
    { en: 'expands', ru: 'Расширяться', uk: 'Розширюватися', es: 'se expande', pos: 'nouns' },
    { en: 'figures', ru: 'РИСУНКИ', uk: 'Не сприйматиме серйозно', es: 'figuras', pos: 'nouns' },
    { en: 'fire', ru: 'Пожар', uk: 'Пожежа', es: 'fuego', pos: 'nouns' },
    { en: 'fixes', ru: 'Чинить (ремонтировать)', uk: 'Лагодити (ремонтувати)', es: 'arreglos', pos: 'nouns' },
    { en: 'floats', ru: 'Плавает', uk: 'Плаває', es: 'flota', pos: 'nouns' },
    { en: 'generous', ru: 'Щедро', uk: 'Насичений', es: 'generoso', pos: 'adjectives' },
    { en: 'gets', ru: 'Получать', uk: 'Отримувати', es: 'obtiene', pos: 'nouns' },
    { en: 'heats', ru: 'Нагревать', uk: 'Нагрівати', es: 'calienta', pos: 'nouns' },
    { en: 'holds', ru: 'Держать', uk: 'Тримати', es: 'sostiene', pos: 'nouns' },
    { en: 'invest', ru: 'Инвестиция', uk: 'Інвестиція', es: 'inversión', pos: 'nouns' },
    { en: 'make', ru: 'Создавать / готовить', uk: 'Створювати / готувати', es: 'hacer', pos: 'irregular_verbs' },
    { en: 'melts', ru: 'Плавится', uk: 'Плавиться', es: 'se derrite', pos: 'nouns' },
    { en: 'membership', ru: 'Подписка', uk: 'Членство', es: 'afiliación', pos: 'nouns' },
    { en: 'object', ru: 'объект', uk: "об'єкт", es: 'objeto', pos: 'nouns' },
    { en: 'objects', ru: 'Предмет', uk: 'Предмети', es: 'objetos', pos: 'nouns' },
    { en: 'overheats', ru: 'Перегревы', uk: 'Перегрівається', es: 'se sobrecalienta', pos: 'nouns' },
    { en: 'packet', ru: 'Упаковка', uk: 'Пакет', es: 'paquete', pos: 'nouns' },
    { en: 'pan', ru: 'Соответствует', uk: 'Панорамування', es: 'sartén', pos: 'nouns' },
    { en: 'presses', ru: 'Нажимать', uk: 'Натискати', es: 'prensas', pos: 'nouns' },
    { en: 'provide', ru: 'Обеспечивать', uk: 'Забезпечувати', es: 'proporcionar', pos: 'nouns' },
    { en: 'provides', ru: 'Обеспечивать', uk: 'Забезпечувати', es: 'proporciona', pos: 'nouns' },
    { en: 'reads', ru: 'Читать', uk: 'Читати', es: 'lee', pos: 'nouns' },
    { en: 'ruined', ru: 'Руины', uk: 'Зруйнований', es: 'arruinado', pos: 'verbs' },
    { en: 'sensors', ru: 'Датчиков', uk: 'Датчики', es: 'sensores', pos: 'nouns' },
    { en: 'shows', ru: 'Показывать', uk: 'Показувати', es: 'muestra', pos: 'nouns' },
    { en: 'significantly', ru: 'Значимо', uk: 'Значительно', es: 'de modo significativo', pos: 'adverbs' },
    { en: 'signs', ru: 'Подписывать', uk: 'Підписувати', es: 'señales', pos: 'nouns' },
    { en: 'smoothly', ru: 'Замедленно', uk: 'Плавно', es: 'suavemente', pos: 'adverbs' },
    { en: 'solution', ru: 'Раствор (Корчемкин)', uk: 'Рішення', es: 'solución', pos: 'nouns' },
    { en: 'speaking', ru: 'Говорить', uk: 'Говорити', es: 'discurso', pos: 'verbs' },
    { en: 'specialist', ru: 'Специалист', uk: 'Спеціаліст у готелях', es: 'especialista', pos: 'nouns' },
    { en: 'test', ru: 'На целостность', uk: 'Тест', es: 'prueba', pos: 'nouns' },
    { en: 'throws', ru: 'БРОСКИ', uk: 'Кидки', es: 'lanza', pos: 'nouns' },
    { en: 'turns', ru: 'Поворачивает', uk: 'Повертає', es: 'vueltas', pos: 'verbs' },
    { en: 'vents', ru: 'Вентиляционные отверстия', uk: 'Вентиляційні отвори', es: 'respiraderos', pos: 'nouns' },
    { en: 'wood', ru: 'Дерево', uk: 'Деревини', es: 'madera', pos: 'nouns' },
  ],
  27: [
    { en: 'witness', ru: 'Свидетель', uk: 'Свідок', es: 'testigo', pos: 'nouns' },
    { en: 'instruction', ru: 'Инструкция', uk: 'Інструкція', es: 'instrucción', pos: 'nouns' },
    { en: 'qualified', ru: 'Квалифицированный', uk: 'Кваліфікований', es: 'calificado', pos: 'adjectives' },
    { en: 'administrator', ru: 'Администратора', uk: 'Адміністратор', es: 'administrador', pos: 'nouns' },
    { en: 'admitted', ru: 'Допущенных', uk: 'Допуск', es: 'aceptado', pos: 'verbs' },
    { en: 'announce', ru: 'Сообщить', uk: 'Оголосити', es: 'anunciar', pos: 'nouns' },
    { en: 'complained', ru: 'Донос', uk: 'Скаржився', es: 'se quejó', pos: 'verbs' },
    { en: 'electricity', ru: 'Электричество', uk: 'Електроенергія', es: 'electricidad', pos: 'nouns' },
    { en: 'electronic', ru: 'Электронная', uk: 'Електроніка', es: 'electrónico', pos: 'adjectives' },
    { en: 'following', ru: 'Подписки', uk: 'Наступний', es: 'siguiente', pos: 'verbs' },
    { en: 'hire', ru: 'Нанимать', uk: 'Найняти', es: 'contratar', pos: 'nouns' },
    { en: 'instructions', ru: 'Инструкция', uk: 'Інструкція', es: 'instrucciones', pos: 'nouns' },
    { en: 'ministry', ru: 'Министерство', uk: 'Міністерство', es: 'ministerio', pos: 'nouns' },
    { en: 'noticed', ru: 'Заметить', uk: 'Помічено', es: 'observó', pos: 'verbs' },
    { en: 'partner', ru: 'Партнер', uk: 'Партнер', es: 'pareja', pos: 'nouns' },
    { en: 'perform', ru: 'Исполнять', uk: 'Виконувати', es: 'llevar a cabo', pos: 'nouns' },
    { en: 'previous', ru: 'Предыдущий', uk: 'Попередній', es: 'anterior', pos: 'adjectives' },
    { en: 'promised', ru: 'Обещать', uk: 'Обіцяти', es: 'prometido', pos: 'verbs' },
    { en: 'reminded', ru: 'Напоминание отправлено', uk: 'Нагадали', es: 'recordado', pos: 'verbs' },
    { en: 'replied', ru: 'Ответил', uk: 'Відповів (відповіла)', es: 'respondió', pos: 'verbs' },
    { en: 'reply', ru: 'Ответ (на запрос)', uk: 'Відповідати', es: 'responder', pos: 'adverbs' },
    { en: 'reported', ru: 'Отчет', uk: 'Звіт', es: 'reportado', pos: 'verbs' },
    { en: 'say', ru: 'Сказать', uk: 'Сказати', es: 'decir', pos: 'irregular_verbs' },
    { en: 'seat', ru: 'Место', uk: 'Місце', es: 'asiento', pos: 'nouns' },
    { en: 'solve', ru: 'Решать', uk: 'Вирішувати', es: 'resolver', pos: 'nouns' },
    { en: 'species', ru: 'Виды', uk: 'Видів', es: 'especies', pos: 'nouns' },
    { en: 'stated', ru: 'Заявлено', uk: 'Заявлено', es: 'fijado', pos: 'verbs' },
    { en: 'twice', ru: 'Раз', uk: 'Два рази', es: 'dos veces', pos: 'nouns' },
    { en: 'vacant', ru: 'Свободный', uk: 'Залишити місце судді вакантним', es: 'vacante', pos: 'nouns' },
    { en: 'warned', ru: 'Уведомленный', uk: 'Попереджено', es: 'prevenido', pos: 'verbs' },
    { en: 'wise', ru: 'Показания', uk: 'Мудрий', es: 'inteligente', pos: 'nouns' },
  ],
  28: [
    { en: 'achieve', ru: 'Достигать', uk: 'Досягати', es: 'lograr', pos: 'verbs' },
    { en: 'introduce', ru: 'Представлять', uk: 'Представляти', es: 'introducir', pos: 'verbs' },
    { en: 'force', ru: 'Заставлять', uk: 'Змушувати', es: 'fuerza', pos: 'verbs' },
    { en: 'treat', ru: 'Баловать', uk: 'Балувати', es: 'tratar', pos: 'verbs' },
    { en: 'control', ru: 'Контролировать', uk: 'Контролювати', es: 'control', pos: 'verbs' },
    { en: 'behave', ru: 'Вести себя', uk: 'Поводитися', es: 'comportarse', pos: 'verbs' },
    { en: 'allow', ru: 'Позволять', uk: 'Дозволяти', es: 'permitir', pos: 'verbs' },
    { en: 'hurt', ru: 'Ранить', uk: 'Поранити', es: 'herir', pos: 'irregular_verbs' },
    { en: 'ambitious', ru: 'Амбициозный', uk: 'Амбітний', es: 'ambicioso', pos: 'adjectives' },
    { en: 'challenging', ru: 'Сложный', uk: 'Складний', es: 'desafiante', pos: 'verbs' },
    { en: 'digital', ru: 'Цифровой', uk: 'Цифровий', es: 'digital', pos: 'adjectives' },
    { en: 'calm', ru: 'Спокойный', uk: 'Спокійний', es: 'calma', pos: 'adjectives' },
    { en: 'sincere', ru: 'Искренний', uk: 'Щирий', es: 'sincero', pos: 'adjectives' },
    { en: 'distant', ru: 'Далекий', uk: 'Далекий', es: 'distante', pos: 'adjectives' },
    { en: 'goal', ru: 'Цель', uk: 'Мета', es: 'meta', pos: 'nouns' },
    { en: 'blade', ru: 'Лезвие', uk: 'Лезо', es: 'cuchilla', pos: 'nouns' },
    { en: 'politician', ru: 'Политик', uk: 'Політик', es: 'político', pos: 'nouns' },
    { en: 'committee', ru: 'Комитет', uk: 'Комітет', es: 'comité', pos: 'nouns' },
    { en: 'modesty', ru: 'Скромность', uk: 'Скромність', es: 'modestia', pos: 'nouns' },
    { en: 'campaign', ru: 'Кампания', uk: 'Кампанія', es: 'campaña', pos: 'nouns' },
    { en: 'seatbelt', ru: 'Ремень безопасности', uk: 'Пасок безпеки', es: 'cinturón de seguridad', pos: 'nouns' },
    { en: 'thoroughly', ru: 'Тщательно', uk: 'Ретельно', es: 'minuciosamente', pos: 'adverbs' },
    { en: 'meal', ru: 'Прием пищи', uk: 'Прийом їжі', es: 'comida', pos: 'nouns' },
    { en: 'proud', ru: 'Гордый', uk: 'Гордий', es: 'orgulloso', pos: 'adjectives' },
    { en: 'marathon', ru: 'Марафон', uk: 'Марафон', es: 'maratón', pos: 'nouns' },
    { en: 'again', ru: 'Снова', uk: 'Знову', es: 'de nuevo', pos: 'adverbs' },
    { en: 'tough', ru: 'Трудный / жёсткий', uk: 'Важкий / жорсткий', es: 'difícil', pos: 'adjectives' },
    { en: 'decided', ru: 'Решительный; решил', uk: 'Рішучий; вирішив', es: 'decidido', pos: 'verbs' },
    { en: 'praises', ru: 'Хвалит; похвалы', uk: 'Хвалить; похвали', es: 'alabanzas', pos: 'verbs' },
    { en: 'studies', ru: 'Занятия; учит', uk: 'Заняття; вчить', es: 'estudios', pos: 'nouns' },
    { en: 'world', ru: 'Мир', uk: 'Світ', es: 'mundo', pos: 'nouns' },
    { en: 'shaves', ru: 'Бреется (он)', uk: 'Голить (він)', es: 'se afeita', pos: 'verbs' },
    { en: 'taught', ru: 'Учил, преподавал', uk: 'Вчив, викладав', es: 'enseñó', pos: 'verbs' },
    { en: 'stay', ru: 'Оставаться; пребывание', uk: 'Залишатися; перебування', es: 'permanecer', pos: 'verbs' },
    { en: 'critical', ru: 'Критический; критичный', uk: 'Критичний; критичний (важливий)', es: 'crítico', pos: 'adjectives' },
    { en: 'expert', ru: 'Эксперт', uk: 'Експерт', es: 'experto', pos: 'nouns' },
    { en: 'field', ru: 'Поле, область', uk: 'Поле, галузь', es: 'campo', pos: 'nouns' },
    { en: 'dissatisfied', ru: 'Недовольный', uk: 'Невдоволений', es: 'insatisfecho', pos: 'adjectives' },
    { en: 'citizens', ru: 'Граждане', uk: 'Громадяни', es: 'ciudadanos', pos: 'nouns' },
    { en: 'case', ru: 'Случай; дело; кейс', uk: 'Випадок; справа', es: 'caso', pos: 'nouns' },
    { en: 'reminds', ru: 'Напоминает', uk: 'Нагадує', es: 'recuerda', pos: 'verbs' },
    { en: 'exam', ru: 'Экзамен', uk: 'Екзамен', es: 'examen', pos: 'nouns' },
    { en: 'active', ru: 'Активный', uk: 'Активний', es: 'activo', pos: 'adjectives' },
    { en: 'volunteers', ru: 'Волонтёры', uk: 'Волонтери', es: 'voluntarios', pos: 'nouns' },
    { en: 'leader', ru: 'Лидер', uk: 'Лідер', es: 'líder', pos: 'nouns' },
    { en: 'creative', ru: 'Творческий', uk: 'Творчий', es: 'creativo', pos: 'adjectives' },
    { en: 'speeches', ru: 'Речи', uk: 'Промови', es: 'discursos', pos: 'nouns' },
    { en: 'lazy', ru: 'Ленивый', uk: 'Ледачий', es: 'perezoso', pos: 'adjectives' },
    { en: 'boy', ru: 'Мальчик', uk: 'Хлопчик', es: 'chico', pos: 'nouns' },
    { en: 'blames', ru: 'Винит', uk: 'Звинувачує', es: 'culpas', pos: 'verbs' },
    { en: 'annoying', ru: 'Раздражающий', uk: 'Дратівливий', es: 'irritante', pos: 'adjectives' },
  ],
  29: [
    { en: 'dwell', ru: 'Обитать', uk: 'Мешкати', es: 'habitar', pos: 'irregular_verbs' },
    { en: 'limit', ru: 'Ограничивать', uk: 'Обмежувати', es: 'límite', pos: 'verbs' },
    { en: 'overcome', ru: 'Преодолевать', uk: 'Долати', es: 'superar', pos: 'irregular_verbs' },
    { en: 'fly', ru: 'Летать', uk: 'Літати', es: 'volar', pos: 'adverbs' },
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
    { en: 'council', ru: 'Совет', uk: 'Рада', es: 'concejo', pos: 'nouns' },
    { en: 'kingdom', ru: 'Королевство', uk: 'Королівство', es: 'reino', pos: 'nouns' },
    { en: 'victory', ru: 'Победа', uk: 'Перемога', es: 'victoria', pos: 'nouns' },
    { en: 'humble', ru: 'Скромный', uk: 'Скромний', es: 'humilde', pos: 'adjectives' },
    { en: 'organic', ru: 'Органический', uk: 'Органічний', es: 'orgánico', pos: 'adjectives' },
    { en: 'fertile', ru: 'Плодородный', uk: 'Родючий', es: 'fértil', pos: 'adjectives' },
    { en: 'outstanding', ru: 'Выдающийся', uk: 'Видатний', es: 'pendiente', pos: 'verbs' },
    { en: 'decisive', ru: 'Решающий', uk: 'Вирішальний', es: 'decisivo', pos: 'adjectives' },
    { en: 'childhood', ru: 'Детство', uk: 'Дитинство', es: 'infancia', pos: 'nouns' },
    { en: 'southern', ru: 'Южный', uk: 'Південний', es: 'del sur', pos: 'adjectives' },
    { en: 'solemn', ru: 'Торжественный', uk: 'Святковий, урочистий', es: 'solemne', pos: 'adjectives' },
    { en: 'cigarettes', ru: 'Сигареты', uk: 'Сигарети', es: 'cigarrillos', pos: 'nouns' },
    { en: 'meditation', ru: 'Медитация', uk: 'Медитація', es: 'meditación', pos: 'nouns' },
    { en: 'philosophical', ru: 'Философский', uk: 'Філософський', es: 'filosófico', pos: 'adjectives' },
    { en: 'distances', ru: 'Расстояния', uk: 'Відстані', es: 'distancias', pos: 'nouns' },
    { en: 'opportunity', ru: 'Возможность', uk: 'Можливість', es: 'oportunidad', pos: 'nouns' },
    { en: 'knee', ru: 'Колено', uk: 'Коліно', es: 'rodilla', pos: 'nouns' },
    { en: 'development', ru: 'Развитие; застройка', uk: 'Розвиток; забудова', es: 'desarrollo', pos: 'nouns' },
    { en: 'antique', ru: 'Антиквариат, старинный', uk: 'Антикваріат, старовинний', es: 'antigüedad', pos: 'adjectives' },
    { en: 'university', ru: 'Университет', uk: 'Університет', es: 'universidad', pos: 'nouns' },
    { en: 'loving', ru: 'Любящий, нежный', uk: 'Ласкавий, люблячий', es: 'cariñoso', pos: 'adjectives' },
    { en: 'awards', ru: 'Награды', uk: 'Нагороди', es: 'premios', pos: 'nouns' },
    { en: 'rescuers', ru: 'Спасатели', uk: 'Рятувальники', es: 'rescatistas', pos: 'nouns' },
    { en: 'disputes', ru: 'Споры', uk: 'Суперечки', es: 'disputas', pos: 'nouns' },
    { en: 'lend', ru: 'Давать в долг', uk: 'Позичати (комусь)', es: 'prestar', pos: 'irregular_verbs' },
    { en: 'professor', ru: 'Профессор', uk: 'Професор', es: 'profesor', pos: 'nouns' },
    { en: 'theories', ru: 'Теории', uk: 'Теорії', es: 'teorías', pos: 'nouns' },
    { en: 'pilots', ru: 'Пилоты', uk: 'Пілоти', es: 'pilotos', pos: 'nouns' },
    { en: 'due', ru: 'Должный (предстоящий, из-за)', uk: 'Саме час; зобов\\\'язаний', es: 'pendiente', pos: 'adjectives' },
    { en: 'constant', ru: 'Постоянный', uk: 'Постійний', es: 'constante', pos: 'adjectives' },
    { en: 'practice', ru: 'Практика; практиковать', uk: 'Практика; практикувати', es: 'práctica', pos: 'nouns' },
    { en: 'pianist', ru: 'Пианист', uk: 'Піаніст', es: 'pianista', pos: 'nouns' },
    { en: 'jewelry', ru: 'Ювелирные изделия', uk: 'Ювелірні вироби', es: 'joyas', pos: 'nouns' },
    { en: 'social', ru: 'Социальный', uk: 'Соціальний', es: 'social', pos: 'adjectives' },
    { en: 'gatherings', ru: 'Собрания, встречи', uk: 'Зібрання, вечірки', es: 'reuniones', pos: 'nouns' },
    { en: 'society', ru: 'Общество', uk: 'Суспільство', es: 'sociedad', pos: 'nouns' },
    { en: 'curious', ru: 'Любопытный', uk: 'Цікавий', es: 'curioso', pos: 'adjectives' },
    { en: 'cover', ru: 'Обложка; покрывать', uk: 'Обкладинка; покривати', es: 'cubierta; cubrir', pos: 'nouns' },
    { en: 'military', ru: 'Военный', uk: 'Воєнний', es: 'militar', pos: 'adjectives' },
    { en: 'obstacles', ru: 'Препятствия', uk: 'Перешкоди', es: 'obstáculos', pos: 'nouns' },
    { en: 'ultimate', ru: 'Окончательный, в высшей степени', uk: 'Кінцевий, найвищий', es: 'último', pos: 'adjectives' },
    { en: 'elegant', ru: 'Изящный', uk: 'Елегантний', es: 'elegante', pos: 'adjectives' },
    { en: 'sculptures', ru: 'Скульптуры', uk: 'Скульптури', es: 'esculturas', pos: 'nouns' },
    { en: 'obvious', ru: 'Очевидный', uk: 'Очевидний', es: 'obvio', pos: 'adjectives' },
    { en: 'surgeries', ru: 'Операции (мед.)', uk: 'Операції (мед.)', es: 'cirugías', pos: 'nouns' },
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
    { en: 'graphics', ru: 'Графика (изобр.)', uk: 'Графіка', es: 'gráficos', pos: 'nouns' },
    { en: 'exquisite', ru: 'Изысканный', uk: 'Вишуканий', es: 'exquisito', pos: 'adjectives' },
    { en: 'version', ru: 'Версия', uk: 'Версія', es: 'versión', pos: 'nouns' },
    { en: 'describes', ru: 'Описывает', uk: 'Описує', es: 'describe', pos: 'verbs' },
    { en: 'technological', ru: 'Технологический', uk: 'Технологічний', es: 'tecnológico', pos: 'adjectives' },
    { en: 'chain', ru: 'Цепь, сеть', uk: 'Ланцюг, мережа', es: 'cadena', pos: 'nouns' },
    { en: 'girl', ru: 'Девочка, девушка', uk: 'Дівчинка, дівчина', es: 'chica', pos: 'nouns' },
    { en: 'collapse', ru: 'Рушиться, обвал', uk: 'Зруйнуватися, обвал', es: 'colapsar', pos: 'verbs' },
    { en: 'exhibited', ru: 'Выставлял, экспонировал', uk: 'Виставляв, експонував', es: 'expuesto', pos: 'verbs' },
    { en: 'abstract', ru: 'Абстрактный, отвлечённый', uk: 'Абстрактний, відвлечений', es: 'abstracto', pos: 'adjectives' },
    { en: 'contents', ru: 'Содержимое', uk: 'Вміст', es: 'contenido', pos: 'nouns' },
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
    { en: 'exhibits', ru: 'Экспонаты, выставляет', uk: 'Експонати; експонує', es: 'exhibiciones', pos: 'nouns' },
    { en: 'represent', ru: 'Представлять, олицетворять', uk: 'Представляти, втілювати', es: 'representar', pos: 'verbs' },
    { en: 'civilization', ru: 'Цивилизация (AmE)', uk: 'Цивілізація (AmE)', es: 'civilización', pos: 'nouns' },
    { en: 'arranged', ru: 'Организовал, устроил', uk: 'Організував, влаштував', es: 'organizado', pos: 'verbs' },
    { en: 'cheerful', ru: 'Весёлый', uk: 'Веселий', es: 'alegre', pos: 'adjectives' },
    { en: 'picnic', ru: 'Пикник', uk: 'Пікнік', es: 'picnic', pos: 'nouns' },
    { en: 'controversial', ru: 'Спорный', uk: 'Суперечливий', es: 'controversial', pos: 'adjectives' },
    { en: 'theory', ru: 'Теория', uk: 'Теорія', es: 'teoría', pos: 'nouns' },
    { en: 'arguments', ru: 'Аргументы, ссоры', uk: 'Аргументи, сварки', es: 'argumentos', pos: 'nouns' },
    { en: 'caused', ru: 'Вызвало, привело', uk: 'Викликало, призвело', es: 'causado', pos: 'verbs' },
    { en: 'latte', ru: 'Латте (кофе)', uk: 'Лате (кава)', es: 'café con leche', pos: 'nouns' },
    { en: 'spy', ru: 'Шпион, шпионить', uk: 'Шпигун, шпигувати', es: 'espiar', pos: 'nouns' },
    { en: 'surgeon', ru: 'Хирург', uk: 'Хірург', es: 'cirujano', pos: 'nouns' },
    { en: 'operation', ru: 'Операция', uk: 'Операція', es: 'operación', pos: 'nouns' },
    { en: 'human', ru: 'Человеческий, человек', uk: 'Людський, людина', es: 'humano', pos: 'adjectives' },
    { en: 'jewels', ru: 'Драгоценности', uk: 'Коштовності', es: 'joyas', pos: 'nouns' },
    { en: 'jeweler', ru: 'Ювелир (AmE)', uk: 'Ювелір (AmE: jeweler)', es: 'joyero', pos: 'nouns' },
    { en: 'edges', ru: 'Края', uk: 'Краї', es: 'bordes', pos: 'nouns' },
    { en: 'leading', ru: 'Ведущий, главный', uk: 'Провідний, головний', es: 'principal', pos: 'adjectives' },
    { en: 'celebrated', ru: 'Праздновали; прославленный', uk: 'Святкували; прославлений', es: 'célebre', pos: 'verbs' },
    { en: 'author', ru: 'Автор', uk: 'Автор', es: 'autor', pos: 'nouns' },
    { en: 'published', ru: 'Опубликовали', uk: 'Опублікували', es: 'publicado', pos: 'verbs' },
    { en: 'landlord', ru: 'Арендодатель', uk: 'Орендодавець', es: 'propietario', pos: 'nouns' },
    { en: 'action', ru: 'Действие', uk: 'Дія', es: 'acción', pos: 'nouns' },
    { en: 'prevented', ru: 'Предотвратили', uk: 'Запобігли', es: 'prevenido', pos: 'verbs' },
    { en: 'terrible', ru: 'Ужасный', uk: 'Жахливий', es: 'horrible', pos: 'adjectives' },
    { en: 'disaster', ru: 'Катастрофа', uk: 'Катастрофа', es: 'desastre', pos: 'nouns' },
    { en: 'ceremony', ru: 'Церемония', uk: 'Церемонія', es: 'ceremonia', pos: 'nouns' },
    { en: 'distinguished', ru: 'Уважаемый; отличались', uk: 'Поважаний; відрізнялися', es: 'distinguido', pos: 'adjectives' },
    { en: 'diplomas', ru: 'Дипломы', uk: 'Дипломи', es: 'diplomas', pos: 'nouns' },
    { en: 'traditions', ru: 'Традиции', uk: 'Традиції', es: 'tradiciones', pos: 'nouns' },
    { en: 'preserved', ru: 'Сохранили', uk: 'Зберегли', es: 'en conserva', pos: 'verbs' },
    { en: 'developed', ru: 'Разработали, развили', uk: 'Розробили, розвинули', es: 'desarrollado', pos: 'verbs' },
    { en: 'major', ru: 'Крупный, основной; специальность (вуз)', uk: 'Крупний, основний; мажор', es: 'importante', pos: 'adjectives' },
    { en: 'companies', ru: 'Компании', uk: 'Компанії', es: 'empresas', pos: 'nouns' },
    { en: 'captain', ru: 'Капитан', uk: 'Капітан', es: 'capitán', pos: 'nouns' },
    { en: 'navigation', ru: 'Навигация', uk: 'Навігація', es: 'navegación', pos: 'nouns' },
    { en: 'skills', ru: 'Навыки', uk: 'Навички', es: 'habilidades', pos: 'nouns' },
    { en: 'storm', ru: 'Буря, шторм', uk: 'Буря, шторм', es: 'tormenta', pos: 'nouns' },
    { en: 'peaceful', ru: 'Мирный, спокойный', uk: 'Мирний, спокійний', es: 'pacífico', pos: 'adjectives' },
    { en: 'roses', ru: 'Розы', uk: 'Троянди', es: 'rosas', pos: 'nouns' },
    { en: 'bloom', ru: 'Цвести, цветение', uk: 'Цвісти, цвітіння', es: 'floración', pos: 'verbs' },
  ],
  31: [
    { en: 'demand', ru: 'Требовать', uk: 'Вимагати', es: 'demanda', pos: 'verbs' },
    { en: 'conduct', ru: 'Проводить', uk: 'Проводити', es: 'conducta', pos: 'verbs' },
    { en: 'verify', ru: 'Проверять', uk: 'Перевіряти', es: 'verificar', pos: 'verbs' },
    { en: 'shake', ru: 'Трясти', uk: 'Трусити', es: 'agitar', pos: 'irregular_verbs' },
    { en: 'carpenter', ru: 'Плотник', uk: 'Тесляр', es: 'carpintero', pos: 'nouns' },
    { en: 'supplier', ru: 'Поставщик', uk: 'Постачальник', es: 'proveedor', pos: 'nouns' },
    { en: 'tenant', ru: 'Жилец', uk: 'Мешканець', es: 'arrendatario', pos: 'nouns' },
    { en: 'thesis', ru: 'Диссертация', uk: 'Дисертація', es: 'tesis', pos: 'nouns' },
    { en: 'tremor', ru: 'Толчок', uk: 'Поштовх', es: 'temblor', pos: 'nouns' },
    { en: 'injection', ru: 'Инъекция', uk: 'Ін\\\'єкція', es: 'inyección', pos: 'nouns' },
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
    { en: 'protesters', ru: 'Протестующие', uk: 'Протестувальники', es: 'manifestantes', pos: 'nouns' },
    { en: 'political', ru: 'Политический', uk: 'Політичний', es: 'político', pos: 'adjectives' },
    { en: 'slogans', ru: 'Лозунги', uk: 'Гасла', es: 'lemas', pos: 'nouns' },
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
    { en: 'refuse', ru: 'Отказываться', uk: 'Відмовлятися', es: 'rechazar', pos: 'verbs' },
    { en: 'guarantee', ru: 'Гарантировать', uk: 'Гарантувати', es: 'garantizar', pos: 'verbs' },
    { en: 'be', ru: 'Быть', uk: 'Бути', es: 'ser', pos: 'irregular_verbs' },
    { en: 'cliff', ru: 'Скала', uk: 'Скеля', es: 'acantilado', pos: 'nouns' },
    { en: 'goods', ru: 'Товары', uk: 'Товари', es: 'bienes', pos: 'nouns' },
    { en: 'intern', ru: 'Стажер', uk: 'Стажер', es: 'interno', pos: 'nouns' },
    { en: 'testimony', ru: 'Показания', uk: 'Свідчення', es: 'testimonio', pos: 'nouns' },
    { en: 'trial', ru: 'Судебный процесс', uk: 'Судовий процес', es: 'ensayo', pos: 'nouns' },
    { en: 'dedication', ru: 'Преданность', uk: 'Відданість', es: 'dedicación', pos: 'nouns' },
    { en: 'community', ru: 'Сообщество', uk: 'Громада', es: 'comunidad', pos: 'nouns' },
    { en: 'warning', ru: 'Предупреждение', uk: 'Попередження', es: 'advertencia', pos: 'verbs' },
    { en: 'audience', ru: 'Аудитория', uk: 'Аудиторія', es: 'audiencia', pos: 'nouns' },
    { en: 'structure', ru: 'Сооружение', uk: 'Споруда', es: 'estructura', pos: 'nouns' },
    { en: 'stranger', ru: 'Незнакомец', uk: 'Незнайомець', es: 'extraño', pos: 'nouns' },
    { en: 'obstacle', ru: 'Препятствие', uk: 'Перешкода', es: 'obstáculo', pos: 'nouns' },
    { en: 'tedious', ru: 'Скучный (утомительный)', uk: 'Нудний (втомлюючий)', es: 'tedioso', pos: 'adjectives' },
    { en: 'steep', ru: 'Крутой', uk: 'Стрімкий', es: 'empinado', pos: 'adjectives' },
    { en: 'vital', ru: 'Жизненно важный', uk: 'Життєво важливий', es: 'vital', pos: 'adjectives' },
    { en: 'confidential', ru: 'Конфиденциальный', uk: 'Конфіденційний', es: 'confidencial', pos: 'adjectives' },
    { en: 'accurate', ru: 'Точный', uk: 'Точний', es: 'preciso', pos: 'adjectives' },
    { en: 'incompetent', ru: 'Некомпетентный', uk: 'Некомпетентний', es: 'incompetente', pos: 'adjectives' },
    { en: 'bold', ru: 'Смелый', uk: 'Сміливий', es: 'atrevido', pos: 'adjectives' },
    { en: 'nimble', ru: 'Ловкий', uk: 'Спритний', es: 'ágil', pos: 'adjectives' },
    { en: 'irresponsible', ru: 'Безответственный', uk: 'Безвідповідальний', es: 'irresponsable', pos: 'adjectives' },
    { en: 'potential', ru: 'Потенциальный', uk: 'Потенційний', es: 'potencial', pos: 'adjectives' },
    { en: 'grateful', ru: 'Признательный', uk: 'Вдячний', es: 'agradecido', pos: 'adjectives' },
    { en: 'accidentally', ru: 'Случайно', uk: 'Випадково', es: 'accidentalmente', pos: 'adverbs' },
    { en: 'entirely', ru: 'Полностью', uk: 'Повністю', es: 'enteramente', pos: 'adverbs' },
    { en: 'making', ru: 'Делая; изготовление', uk: 'Роблячи; виготовлення', es: 'haciendo', pos: 'verbs' },
    { en: 'nest', ru: 'Гнездо', uk: 'Гніздо', es: 'nido', pos: 'nouns' },
    { en: 'aggressively', ru: 'Агрессивно', uk: 'Агресивно', es: 'agresivamente', pos: 'adverbs' },
    { en: 'vibration', ru: 'Вибрация', uk: 'Вібрація', es: 'vibración', pos: 'nouns' },
    { en: 'representative', ru: 'Представитель', uk: 'Представник', es: 'representante', pos: 'nouns' },
    { en: 'earlier', ru: 'Раньше', uk: 'Раніше', es: 'más temprano', pos: 'adverbs' },
    { en: 'destroyed', ru: 'Разрушили', uk: 'Зруйнували', es: 'destruido', pos: 'verbs' },
    { en: 'detective', ru: 'Детектив', uk: 'Детектив', es: 'detective', pos: 'nouns' },
    { en: 'frightened', ru: 'Испуганный', uk: 'Переляканий', es: 'atemorizado', pos: 'adjectives' },
    { en: 'rather', ru: 'Скорее; довольно', uk: 'Аніж; досить', es: 'bastante', pos: 'adverbs' },
    { en: 'surprised', ru: 'Удивлённый', uk: 'Здивований', es: 'sorprendido', pos: 'adjectives' },
    { en: 'mouse', ru: 'Мышь', uk: 'Миша', es: 'ratón', pos: 'nouns' },
    { en: 'complaining', ru: 'Жалуется', uk: 'Скаржиться', es: 'quejándose', pos: 'verbs' },
    { en: 'depends', ru: 'Зависит', uk: 'Залежить', es: 'depende', pos: 'verbs' },
    { en: 'circling', ru: 'Кружит, облетает', uk: 'Кружить, облітає', es: 'dando vueltas', pos: 'verbs' },
    { en: 'half', ru: 'Половина, наполовину', uk: 'Половина, наполовину', es: 'medio', pos: 'nouns' },
    { en: 'expect', ru: 'Ожидать', uk: 'Очікувати', es: 'esperar', pos: 'verbs' },
    { en: 'rely', ru: 'Полагаться', uk: 'Покладатися', es: 'confiar', pos: 'verbs' },
    { en: 'delicate', ru: 'Хрупкий, деликатный', uk: 'Крихкий, делікатний', es: 'delicado', pos: 'adjectives' },
    { en: 'negotiations', ru: 'Переговоры', uk: 'Переговори', es: 'negociaciones', pos: 'nouns' },
    { en: 'concluded', ru: 'Завершил, сделал вывод', uk: 'Завершив, зробив висновок', es: 'concluyó', pos: 'verbs' },
    { en: 'steady', ru: 'Ровный, устойчивый', uk: 'Рівний, сталий', es: 'estable', pos: 'adjectives' },
    { en: 'relies', ru: 'Полагается', uk: 'Покладається', es: 'se basa', pos: 'verbs' },
    { en: 'awful', ru: 'Ужасный', uk: 'Жахливий', es: 'horrible', pos: 'adjectives' },
    { en: 'extremely', ru: 'Чрезвычайно', uk: 'Надзвичайно', es: 'extremadamente', pos: 'adverbs' },
    { en: 'rebuilt', ru: 'Восстановили', uk: 'Відбудували', es: 'reconstruido', pos: 'verbs' },
    { en: 'arrogantly', ru: 'Высокомерно', uk: 'Зарозуміло', es: 'arrogantemente', pos: 'adverbs' },
    { en: 'expected', ru: 'Ожидалось, ожидал', uk: 'Очікувалося', es: 'esperado', pos: 'verbs' },
    { en: 'giving', ru: 'Даяние, давая', uk: 'Дарування, даючи', es: 'dando', pos: 'verbs' },
    { en: 'assignments', ru: 'Задания, назначения', uk: 'Завдання, призначення', es: 'asignaciones', pos: 'nouns' },
    { en: 'several', ru: 'Несколько', uk: 'Кілька', es: 'varios', pos: 'adjectives' },
    { en: 'analyze', ru: 'Анализировать (AmE)', uk: 'Аналізувати (AmE: analyze)', es: 'analizar', pos: 'verbs' },
    { en: 'statistical', ru: 'Статистический', uk: 'Статистичний', es: 'estadístico', pos: 'adjectives' },
    { en: 'conclusions', ru: 'Выводы, заключения', uk: 'Висновки', es: 'conclusiones', pos: 'nouns' },
    { en: 'spot', ru: 'Место, пятно; заметить', uk: 'Місце, пляма; помітити', es: 'lugar', pos: 'nouns' },
    { en: 'thief', ru: 'Вор', uk: 'Злодій', es: 'ladrón', pos: 'nouns' },
    { en: 'climb', ru: 'Влезать, карабкаться', uk: 'Лізти, підніматися', es: 'trepar', pos: 'verbs' },
    { en: 'lady', ru: 'Леди, дама', uk: 'Пані, дама', es: 'dama', pos: 'nouns' },
    { en: 'damaged', ru: 'Повреждённый', uk: 'Пошкоджений', es: 'dañado', pos: 'adjectives' },
    { en: 'package', ru: 'Посылка, упаковка', uk: 'Посилка, упаковка', es: 'paquete', pos: 'nouns' },
    { en: 'remote', ru: 'Удалённый, пульт', uk: 'Віддалений, пульт', es: 'remoto', pos: 'adjectives' },
    { en: 'region', ru: 'Регион, область', uk: 'Регіон, область', es: 'región', pos: 'nouns' },
    { en: 'parties', ru: 'Стороны; вечеринки', uk: 'Сторони; вечірки', es: 'partes; fiestas', pos: 'nouns' },
    { en: 'vacated', ru: 'Освободил, покинул', uk: 'Звільнив, залишив', es: 'desocupado', pos: 'verbs' },
    { en: 'cyberattacks', ru: 'Кибератаки', uk: 'Кібер-атаки', es: 'ciberataques', pos: 'nouns' },
    { en: 'securely', ru: 'Надёжно', uk: 'Надійно', es: 'de forma segura', pos: 'adverbs' },
  ],
};

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
  for (const lw of Object.values(WORDS_BY_LESSON)) {
    for (const w of lw) {
      if (!seen.has(w.en)) { seen.add(w.en); result.push(w); }
    }
  }
  return result;
})();

// 6 вариантов – правильный гарантирован, дистракторы того же POS
// Всегда берём часть из cross-lesson для разнообразия (не всегда одни и те же слова урока)
type RoundType = 'recognition' | 'context';

const makeOptions = (correct: Word, all: Word[]): string[] => {
  const notMe = (w: Word) => w.en !== correct.en;
  const lessonSamePos = fy(all.filter(w => notMe(w) && w.pos === correct.pos));
  const fromLesson    = lessonSamePos.slice(0, Math.min(3, lessonSamePos.length));
  const fromCross = fy(
    ALL_WORDS_FLAT.filter(w => notMe(w) && w.pos === correct.pos && !fromLesson.some(l => l.en === w.en))
  ).slice(0, 5 - fromLesson.length);
  let combined = [...fromLesson, ...fromCross];
  if (combined.length < 5) {
    const fallback = fy(
      [...all, ...ALL_WORDS_FLAT].filter(w => notMe(w) && !combined.some(c => c.en === w.en))
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
  const tip   = w / 4;
  const mid   = w / 2;
  const emptyColor = isDark ? t.bgSurface2 : t.textMuted + '55';
  const color = filled ? t.correct : partial ? t.correct + '55' : emptyColor;
  return (
    <View style={{ flexDirection: 'row', width: w, height: h }}>
      <View style={{ width: 0, height: 0, borderTopWidth: h/2, borderBottomWidth: h/2, borderRightWidth: tip, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: color, marginRight: -1 }} />
      <View style={{ width: mid + 2, height: h, backgroundColor: color }} />
      <View style={{ width: 0, height: 0, borderTopWidth: h/2, borderBottomWidth: h/2, borderLeftWidth: tip, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color, marginLeft: -1 }} />
    </View>
  );
}

// ── ТРЕНИРОВКА ───────────────────────────────────────────────────────────────
function Training({ words, storageKey, lang, initialLearned, initialCounts, wordProgressVersion, onCountUpdate, userName: userNameProp = '', onNoEnergy }: { words:Word[]; storageKey:string; lang: Lang; initialLearned:string[]; initialCounts:Record<string,number>; wordProgressVersion:number; onCountUpdate:(word:string, count:number)=>void; userName?: string; onNoEnergy: () => void }) {
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
  const [userName,   setUserName]   = useState(userNameProp);
  const [hapticsOn,  setHapticsOn]  = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [allDone,    setAllDone]    = useState(false);
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const [xpToastAmount, setXpToastAmount] = useState(3);

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
  }, [userNameProp]);

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
      // Тост в том же кадре, что и подсветка — иначе смена queue в setTimeout сбрасывала анимацию / не было отрисовки
      showXpToast(xpThisStep);
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
          const p1 = registerXP(POINTS_PER_CORRECT, 'vocabulary_learned', userName, lang)
            .then(r => { setXpToastAmount(r.finalDelta); return r; })
            .catch(() => null);
          if (wordJustCompleted) {
            void p1.then(() =>
              registerXP(POINTS_PER_LEARNED, 'vocabulary_learned', userName, lang)
                .then(r2 => { setXpToastAmount(r2.finalDelta); })
                .catch(() => {}),
            );
          }
        }

        if (wordJustCompleted) {
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
        // Ошибка — перемещаем карточку в позицию минимум 2 вперёд от текущей
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
    setLearnedCnt(0);
    setAllDone(false);
    locked.current = false;
  };

  if (allDone || queue.length === 0) return (
    <>
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', gap:16, padding:20 }}>
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
          style={{ backgroundColor: t.correct, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '700' }}>{pickTriLang(lang, { ru: '← К уроку', uk: '← До уроку', es: '← A la lección' })}</Text>
        </TouchableOpacity>
        <TouchableOpacity
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

  const displayLearned = Math.min(learnedCnt, words.length);

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
    <View style={{ flex:1, paddingHorizontal:20, paddingTop:12 }}>

      {/* Прогресс */}
      <View style={{ width:'100%', marginBottom:14 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:5 }}>
          <Text style={{ color:t.textMuted, fontSize:f.label }}>
            {ws.learnedOf(displayLearned, words.length)}
          </Text>
          <Text style={{ color:displayLearned>0?t.correct:t.textMuted, fontSize:f.label, fontWeight:'600' }}>
            {Math.min(Math.round(displayLearned/words.length*100), 100)}%
          </Text>
        </View>
        <View style={{ height:5, backgroundColor:t.border, borderRadius:3, overflow:'hidden' }}>
          <View style={{ height:'100%', width:`${Math.min((displayLearned/words.length)*100, 100)}%` as any, backgroundColor:t.correct, borderRadius:3 }}/>
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
  const { theme: t, f, ds } = useTheme();
  const { hPad } = useScreen();
  const sections = groupByPOS(words, lang);
  const [tooltip, setTooltip] = useState<string | null>(null);

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
            <Text style={{ color:t.textMuted, fontSize:f.label, fontWeight:'600', textTransform:'uppercase', letterSpacing:1 }}>
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
                showsHorizontalScrollIndicator
                contentContainerStyle={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: hPad,
                  paddingVertical: ds.spacing.sm,
                }}
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
                    style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600', flexShrink: 0 }}
                  >
                    {item.en}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flexShrink: 0, marginRight: ds.spacing.sm }}
                  onPress={() => setTooltip(tr)}
                  activeOpacity={0.7}
                >
                  <Text maxFontSizeMultiplier={1.35} style={{ color: t.textMuted, fontSize: f.body, flexShrink: 0 }}>
                    {tr}
                  </Text>
                </TouchableOpacity>
                <View style={{ flexShrink: 0 }}>
                  <AddToFlashcard en={item.en} ru={item.ru} uk={item.uk} es={item.es} source="word" />
                </View>
              </ScrollView>
            </View>
          );
        }}
      />
      {tooltip !== null && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setTooltip(null)}
          style={{ position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:99 }}
        >
          <View style={{ position:'absolute', top:80, left:16, right:60, backgroundColor:t.bgCard, borderRadius:12, paddingHorizontal:16, paddingVertical:12, elevation:12, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.25, shadowRadius:8, borderWidth:1, borderColor:t.border }}>
            <Text style={{ color:t.textPrimary, fontSize:f.bodyLg, lineHeight:22 }}>{tooltip}</Text>
            <Text style={{ color:t.textMuted, fontSize:f.sub, marginTop:4 }}>{pickTriLang(lang, { ru: 'Нажмите, чтобы закрыть', uk: 'Натисніть, щоб закрити', es: 'Toca para cerrar' })}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────────
export default function LessonWords() {
  const router = useRouter();
  const { theme:t, f } = useTheme();
  const { s, lang } = useLang();
  const { energy, maxEnergy, isUnlimited: energyUnlimited } = useEnergy();
  const canTrain = energyUnlimited || energy > 0;
  const { id } = useLocalSearchParams<{ id:string }>();
  const lessonId = parseInt(id || '1', 10);
  const words = WORDS_BY_LESSON[lessonId] || WORDS_BY_LESSON[1];
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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{ color:t.textPrimary, fontSize:f.h2, fontWeight:'600' }}>{ws.title(lessonId)}</Text>
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
              style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:14, gap:8, borderTopWidth:isActive?2:0, borderTopColor:t.textSecond }}
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
              <Ionicons name={icon as any} size={20} color={isActive?t.textSecond:t.textGhost}/>
              <Text style={{ color:isActive?t.textSecond:t.textGhost, fontSize:f.body, fontWeight:'500' }}>{label}</Text>
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
  Object.entries(WORDS_BY_LESSON).map(([k, v]) => [Number(k), v.length])
);
export const WORD_KEYS_BY_LESSON: Record<number, Set<string>> = Object.fromEntries(
  Object.entries(WORDS_BY_LESSON).map(([k, v]) => [Number(k), new Set(v.map((w: Word) => w.en))])
);

