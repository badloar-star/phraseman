import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  SectionList,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddToFlashcard from '../components/AddToFlashcard';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { updateMultipleTaskProgress } from './daily_tasks';
import { loadSettings } from './settings_edu';
import { registerXP } from './xp_manager';

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const REQUIRED = 3;
const POINTS_PER_CORRECT = 3;
const POINTS_PER_LEARNED = 5;

type POS = 'pronouns'|'verbs'|'irregular_verbs'|'adjectives'|'adverbs'|'nouns';
interface Word { en:string; ru:string; uk:string; pos:POS; context?:string; definition?:string; }

const POS_LABELS_RU: Record<POS,string> = {
  pronouns:'Местоимения', verbs:'Глаголы (to-be)', irregular_verbs:'Неправильные глаголы', adjectives:'Прилагательные',
  adverbs:'Наречия', nouns:'Существительные',
};
const POS_LABELS_UK: Record<POS,string> = {
  pronouns:'Займенники', verbs:'Дієслова (to-be)', irregular_verbs:'Неправильні дієслова', adjectives:'Прикметники',
  adverbs:'Прислівники', nouns:'Іменники',
};

// LESSON VOCABULARY
const WORDS_BY_LESSON: Record<number, Word[]> = {
  1: [
    { en: 'here', ru: 'Здесь', uk: 'Тут', pos: 'adverbs' },
    { en: 'ready', ru: 'Готовый', uk: 'Готовий', pos: 'adjectives' },
    { en: 'busy', ru: 'Занятый', uk: 'Зайнятий', pos: 'adjectives' },
    { en: 'home', ru: 'Дома', uk: 'Вдома', pos: 'nouns' },
    { en: 'together', ru: 'Вместе', uk: 'Разом', pos: 'adverbs' },
    { en: 'they', ru: 'Они', uk: 'Вони', pos: 'pronouns' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', pos: 'adjectives' },
    { en: 'okay', ru: 'В порядке (хорошо)', uk: 'В порядку (добре)', pos: 'adjectives' },
    { en: 'right', ru: 'Правый (верный)', uk: 'Правий (вірний)', pos: 'adjectives' },
    { en: 'safe', ru: 'Безопасный', uk: 'Безпечний', pos: 'adjectives' },
    { en: 'sick', ru: 'Больной', uk: 'Хворий', pos: 'adjectives' },
    { en: 'cheap', ru: 'Дешевый', uk: 'Дешевий', pos: 'adjectives' },
    { en: 'upset', ru: 'Расстроенный', uk: 'Засмучений', pos: 'adjectives' },
    { en: 'late', ru: 'Поздний (опоздавший)', uk: 'Пізній (той, що запізнився)', pos: 'adjectives' },
    { en: 'work', ru: 'Работа', uk: 'Робота', pos: 'nouns' },
    { en: 'way', ru: 'Путь', uk: 'Шлях', pos: 'nouns' },
    { en: 'car', ru: 'Машина', uk: 'Машина', pos: 'nouns' },
    { en: 'holiday', ru: 'Отпуск', uk: 'Відпустка', pos: 'nouns' },
    { en: 'free', ru: 'Бесплатный', uk: 'Безкоштовний', pos: 'adjectives' },
    { en: 'line', ru: 'Очередь', uk: 'Черга', pos: 'nouns' },
    { en: 'elevator', ru: 'Лифт', uk: 'Ліфт', pos: 'nouns' },
    { en: 'kitchen', ru: 'Кухня', uk: 'Кухня', pos: 'nouns' },
    { en: 'very', ru: 'Очень', uk: 'Дуже', pos: 'adverbs' },
    { en: 'kind', ru: 'Добрый', uk: 'Добрий', pos: 'adjectives' },
    { en: 'urgent', ru: 'Срочный', uk: 'Терміновий', pos: 'adjectives' },
    { en: 'shocked', ru: 'Шокированный', uk: 'Шокований', pos: 'adjectives' },
    { en: 'taxi', ru: 'Такси', uk: 'Таксі', pos: 'nouns' },
    { en: 'married', ru: 'Замужняя (женатый)', uk: 'Заміжня (одружений)', pos: 'adjectives' },
    { en: 'outside', ru: 'Снаружи (на улице)', uk: 'Зовні (на вулиці)', pos: 'adverbs' },
    { en: 'airport', ru: 'Аэропорт', uk: 'Аеропорт', pos: 'nouns' },
    { en: 'train', ru: 'Поезд', uk: 'Поїзд', pos: 'nouns' },
    { en: 'bathroom', ru: 'Ванная комната', uk: 'Ванна кімната', pos: 'nouns' },
    { en: 'shop', ru: 'Магазин', uk: 'Магазин', pos: 'nouns' },
    { en: 'gym', ru: 'Спортзал', uk: 'Спортзал', pos: 'nouns' },
    { en: 'bus', ru: 'Автобус', uk: 'Автобус', pos: 'nouns' },
    { en: 'near', ru: 'Рядом', uk: 'Поруч', pos: 'adverbs' },
    { en: 'desperate', ru: 'В отчаянии (безнадежный)', uk: 'У розпачі (безнадійний)', pos: 'adjectives' },
    { en: 'list', ru: 'Список', uk: 'Список', pos: 'nouns' },
    { en: 'pharmacy', ru: 'Аптека', uk: 'Аптека', pos: 'nouns' },
    { en: 'abroad', ru: 'За границей', uk: 'За кордоном', pos: 'adverbs' },
    { en: 'broken', ru: 'Сломанный', uk: 'Зламаний', pos: 'adjectives' },
    { en: 'empty', ru: 'Пустой', uk: 'Порожній', pos: 'adjectives' },
  ],
  2: [
    // Phrases 1-5
    { en: 'hungry', ru: 'Голодный', uk: 'Голодний', pos: 'adjectives' },
    { en: 'sure', ru: 'Уверенный', uk: 'Впевнений', pos: 'adjectives' },
    { en: 'expensive', ru: 'Дорогой (по цене)', uk: 'Дорогий (за ціною)', pos: 'adjectives' },
    { en: 'not', ru: 'Не', uk: 'Не', pos: 'adverbs' },
    // Phrases 6-10
    { en: 'doctor', ru: 'Врач', uk: 'Лікар', pos: 'nouns' },
    { en: 'scary', ru: 'Страшный', uk: 'Страшний', pos: 'adjectives' },
    { en: 'alone', ru: 'Один (одинокий)', uk: 'Один (самотній)', pos: 'adjectives' },
    // Phrases 11-15
    { en: 'danger', ru: 'Опасность', uk: 'Небезпека', pos: 'nouns' },
    { en: 'angry', ru: 'Сердитый (злой)', uk: 'Сердитий (злий)', pos: 'adjectives' },
    { en: 'open', ru: 'Открытый', uk: 'Відкритий', pos: 'adjectives' },
    // Phrases 16-20
    // Phrases 21-25
    { en: 'joke', ru: 'Шутка', uk: 'Жарт', pos: 'nouns' },
    { en: 'school', ru: 'Школа', uk: 'Школа', pos: 'nouns' },
    // Phrases 26-30
    { en: 'afraid', ru: 'Боящийся (испуганный)', uk: 'Той, хто боїться (переляканий)', pos: 'adjectives' },
    { en: 'far', ru: 'Далекий', uk: 'Далекий', pos: 'adjectives' },
    { en: 'enemy', ru: 'Враг', uk: 'Ворог', pos: 'nouns' },
    // Phrases 31-35
    { en: 'office', ru: 'Офис', uk: 'Офіс', pos: 'nouns' },
    { en: 'mood', ru: 'Настроение', uk: 'Настрій', pos: 'nouns' },
    { en: 'true', ru: 'Правда (истинный)', uk: 'Правда (істинний)', pos: 'adjectives' },
    { en: 'trap', ru: 'Ловушка', uk: 'Пастка', pos: 'nouns' },
    // Phrases 36-40
    // Phrases 41-45
    { en: 'guilty', ru: 'Виноватый', uk: 'Винний', pos: 'adjectives' },
    { en: 'dangerous', ru: 'Опасный', uk: 'Небезпечний', pos: 'adjectives' },
    { en: 'building', ru: 'Здание', uk: 'Будівля', pos: 'nouns' },
    { en: 'mean', ru: 'Злой (подлый)', uk: 'Злий (підлий)', pos: 'adjectives' },
    // Phrases 46-50
    { en: 'serious', ru: 'Серьезный', uk: 'Серйозний', pos: 'adjectives' },
  ],
  3: [
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', pos: 'verbs' },
    { en: 'live', ru: 'Жить', uk: 'Жити', pos: 'verbs' },
    { en: 'drink', ru: 'Пить', uk: 'Пити', pos: 'verbs' },
    { en: 'speak', ru: 'Говорить', uk: 'Говорити', pos: 'verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', pos: 'verbs' },
    { en: 'know', ru: 'Знать', uk: 'Знати', pos: 'verbs' },
    { en: 'eat', ru: 'Есть', uk: 'Їсти', pos: 'verbs' },
    { en: 'believe', ru: 'Верить', uk: 'Вірити', pos: 'verbs' },
    { en: 'love', ru: 'Любить', uk: 'Любити', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', pos: 'verbs' },
    { en: 'cost', ru: 'Стоить', uk: 'Коштувати', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', pos: 'verbs' },
    { en: 'come', ru: 'Приходить', uk: 'Приходити', pos: 'verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', pos: 'verbs' },
    { en: 'listen', ru: 'Слушать', uk: 'Слухати', pos: 'verbs' },
    { en: 'wash', ru: 'Мыть', uk: 'Мити', pos: 'verbs' },
    { en: 'drive', ru: 'Водить', uk: 'Водити', pos: 'verbs' },
    { en: 'deserve', ru: 'Заслуживать', uk: 'Заслуговувати', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', pos: 'verbs' },
    { en: 'feel', ru: 'Чувствовать', uk: 'Відчувати', pos: 'verbs' },
    { en: 'promise', ru: 'Обещать', uk: 'Обіцяти', pos: 'verbs' },
    { en: 'travel', ru: 'Путешествовать', uk: 'Подорожувати', pos: 'verbs' },
    { en: 'seem', ru: 'Казаться', uk: 'Здаватися', pos: 'verbs' },
    { en: 'value', ru: 'Ценить', uk: 'Цінувати', pos: 'verbs' },
    { en: 'teach', ru: 'Преподавать', uk: 'Викладати', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', pos: 'verbs' },
    { en: 'remember', ru: 'Помнить', uk: 'Пам\'ятати', pos: 'verbs' },
    { en: 'wear', ru: 'Носить', uk: 'Носити', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', pos: 'verbs' },
    { en: 'use', ru: 'Пользоваться', uk: 'Користуватися', pos: 'verbs' },
    { en: 'take', ru: 'Брать', uk: 'Брати', pos: 'verbs' },
    { en: 'look', ru: 'Выглядеть', uk: 'Виглядати', pos: 'verbs' },
    { en: 'sound', ru: 'Звучать', uk: 'Звучати', pos: 'verbs' },
    { en: 'news', ru: 'Новости', uk: 'Новини', pos: 'nouns' },
    { en: 'people', ru: 'Люди', uk: 'Люди', pos: 'nouns' },
    { en: 'answer', ru: 'Ответ', uk: 'Відповідь', pos: 'nouns' },
    { en: 'meat', ru: 'Мясо', uk: 'М\'ясо', pos: 'nouns' },
    { en: 'music', ru: 'Музыка', uk: 'Музика', pos: 'nouns' },
    { en: 'food', ru: 'Еда', uk: 'Їжа', pos: 'nouns' },
    { en: 'dollar', ru: 'Доллар', uk: 'Долар', pos: 'nouns' },
    { en: 'book', ru: 'Книга', uk: 'Книга', pos: 'nouns' },
    { en: 'letter', ru: 'Письмо', uk: 'Лист', pos: 'nouns' },
    { en: 'dish', ru: 'Посуда', uk: 'Посуд', pos: 'nouns' },
    { en: 'pain', ru: 'Боль', uk: 'Біль', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', pos: 'nouns' },
    { en: 'glasses', ru: 'Очки', uk: 'Окуляри', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', pos: 'nouns' },
    { en: 'internet', ru: 'Интернет', uk: 'Інтернет', pos: 'nouns' },
    { en: 'rest', ru: 'Отдых', uk: 'Відпочинок', pos: 'nouns' },
    { en: 'terms', ru: 'Условия', uk: 'Умови', pos: 'nouns' },
    { en: 'problem', ru: 'Проблема', uk: 'Проблема', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', pos: 'nouns' },
    { en: 'friend', ru: 'Друг', uk: 'Друг', pos: 'nouns' },
    { en: 'often', ru: 'Часто', uk: 'Часто', pos: 'adverbs' },
  ],
  4: [
    { en: 'smoke', ru: 'Курить', uk: 'Курити', pos: 'verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', pos: 'verbs' },
    { en: 'pay', ru: 'Платить', uk: 'Платити', pos: 'verbs' },
    { en: 'like', ru: 'Любить (нравиться)', uk: 'Любити (подобатися)', pos: 'verbs' },
    { en: 'sell', ru: 'Продавать', uk: 'Продавати', pos: 'verbs' },
    { en: 'lose', ru: 'Терять', uk: 'Втрачати', pos: 'verbs' },
    { en: 'change', ru: 'Менять', uk: 'Змінювати', pos: 'verbs' },
    { en: 'spend', ru: 'Тратить', uk: 'Витрачати', pos: 'verbs' },
    { en: 'break', ru: 'Нарушать (ломать)', uk: 'Порушувати (ламати)', pos: 'verbs' },
    { en: 'waste', ru: 'Тратить впустую', uk: 'Витрачати марно', pos: 'verbs' },
    { en: 'close', ru: 'Закрывать', uk: 'Зачиняти', pos: 'verbs' },
    { en: 'ask', ru: 'Просить (спрашивать)', uk: 'Просити (питати)', pos: 'verbs' },
    { en: 'milk', ru: 'Молоко', uk: 'Молоко', pos: 'nouns' },
    { en: 'sugar', ru: 'Сахар', uk: 'Цукор', pos: 'nouns' },
    { en: 'number', ru: 'Номер', uk: 'Номер', pos: 'nouns' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', pos: 'nouns' },
    { en: 'mask', ru: 'Маска', uk: 'Маска', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', pos: 'nouns' },
    { en: 'risk', ru: 'Риск', uk: 'Ризик', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', pos: 'nouns' },
    { en: 'rule', ru: 'Правило', uk: 'Правило', pos: 'nouns' },
    { en: 'hope', ru: 'Надежда', uk: 'Надія', pos: 'nouns' },
    { en: 'opinion', ru: 'Мнение', uk: 'Думка', pos: 'nouns' },
    { en: 'fear', ru: 'Страх', uk: 'Страх', pos: 'nouns' },
    { en: 'money', ru: 'Деньги', uk: 'Гроші', pos: 'nouns' },
    { en: 'advice', ru: 'Совет', uk: 'Порада', pos: 'nouns' },
    { en: 'detail', ru: 'Деталь', uk: 'Деталь', pos: 'nouns' },
    { en: 'ad', ru: 'Рекламное объявление', uk: 'Рекламне оголошення', pos: 'nouns' },
    { en: 'breakfast', ru: 'Завтрак', uk: 'Сніданок', pos: 'nouns' },
    { en: 'law', ru: 'Закон', uk: 'Закон', pos: 'nouns' },
    { en: 'tie', ru: 'Галстук', uk: 'Краватка', pos: 'nouns' },
    { en: 'window', ru: 'Окно', uk: 'Вікно', pos: 'nouns' },
    { en: 'wine', ru: 'Вино', uk: 'Вино', pos: 'nouns' },
    { en: 'fine', ru: 'Штраф', uk: 'Штраф', pos: 'nouns' },
    { en: 'juice', ru: 'Сок', uk: 'Сік', pos: 'nouns' },
    { en: 'fish', ru: 'Рыба', uk: 'Риба', pos: 'nouns' },
    { en: 'TV', ru: 'Телевизор', uk: 'Телевізор', pos: 'nouns' },
    { en: 'map', ru: 'Карта', uk: 'Карта', pos: 'nouns' },
    { en: 'bread', ru: 'Хлеб', uk: 'Хліб', pos: 'nouns' },
    { en: 'alcohol', ru: 'Алкоголь', uk: 'Алкоголь', pos: 'nouns' },
    { en: 'spicy', ru: 'Острый (о еде)', uk: 'Гострий (про їжу)', pos: 'adjectives' },
  ],
  5: [
    { en: 'find', ru: 'Находить', uk: 'Знаходити', pos: 'verbs' },
    { en: 'go', ru: 'Идти', uk: 'Йти', pos: 'verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', pos: 'verbs' },
    { en: 'sing', ru: 'Петь', uk: 'Співати', pos: 'verbs' },
    { en: 'sleep', ru: 'Спать', uk: 'Спати', pos: 'verbs' },
    { en: 'English', ru: 'Английский язык', uk: 'Англійська мова', pos: 'nouns' },
    { en: 'computer', ru: 'Компьютер', uk: 'Комп\'ютер', pos: 'nouns' },
    { en: 'code', ru: 'Код', uk: 'Код', pos: 'nouns' },
    { en: 'card', ru: 'Карта', uk: 'Картка', pos: 'nouns' },
    { en: 'commission', ru: 'Комиссия', uk: 'Комісія', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', pos: 'nouns' },
    { en: 'room', ru: 'Номер', uk: 'Номер', pos: 'nouns' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', pos: 'nouns' },
    { en: 'pizza', ru: 'Пицца', uk: 'Піца', pos: 'nouns' },
    { en: 'vegetables', ru: 'Овощи', uk: 'Овочі', pos: 'nouns' },
    { en: 'tea', ru: 'Чай', uk: 'Чай', pos: 'nouns' },
    { en: 'job', ru: 'Работа', uk: 'Робота', pos: 'nouns' },
    { en: 'difference', ru: 'Разница', uk: 'Різниця', pos: 'nouns' },
    { en: 'mistake', ru: 'Ошибка', uk: 'Помилка', pos: 'nouns' },
    { en: 'luck', ru: 'Удача', uk: 'Удача', pos: 'nouns' },
    { en: 'noise', ru: 'Шум', uk: 'Шум', pos: 'nouns' },
    { en: 'tax', ru: 'Налог', uk: 'Податок', pos: 'nouns' },
    { en: 'tomorrow', ru: 'Завтра', uk: 'Завтра', pos: 'adverbs' },
    { en: 'well', ru: 'Хорошо', uk: 'Добре', pos: 'adverbs' },
    { en: 'inside', ru: 'Внутрь', uk: 'Всередину', pos: 'adverbs' },
    { en: 'correctly', ru: 'Правильно', uk: 'Правильно', pos: 'adverbs' },
    { en: 'enough', ru: 'Достаточно', uk: 'Достатньо', pos: 'adverbs' },
  ],
  6: [
    { en: 'start', ru: 'Начинать', uk: 'Починати', pos: 'verbs' },
    { en: 'cry', ru: 'Плакать', uk: 'Плакати', pos: 'verbs' },
    { en: 'wait', ru: 'Ждать', uk: 'Чекати', pos: 'verbs' },
    { en: 'pronounce', ru: 'Произносить', uk: 'Вимовляти', pos: 'verbs' },
    { en: 'sign', ru: 'Подписывать', uk: 'Підписувати', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Відправляти', pos: 'verbs' },
    { en: 'do', ru: 'Делать', uk: 'Робити', pos: 'verbs' },
    { en: 'want', ru: 'Хотеть', uk: 'Хотіти', pos: 'verbs' },
    { en: 'leave', ru: 'Уходить (покидать)', uk: 'Йти (покидати)', pos: 'verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', pos: 'verbs' },
    { en: 'keep', ru: 'Хранить (держать)', uk: 'Зберігати (тримати)', pos: 'verbs' },
    { en: 'carry', ru: 'Носить (в руках/при себе)', uk: 'Носити (в руках/при собі)', pos: 'verbs' },
    { en: 'ship', ru: 'Отправлять (груз/посылку)', uk: 'Відправляти (вантаж/посилку)', pos: 'verbs' },
    { en: 'meet', ru: 'Встречать', uk: 'Зустрічати', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', pos: 'verbs' },
    { en: 'put', ru: 'Класть', uk: 'Класти', pos: 'verbs' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', pos: 'nouns' },
    { en: 'report', ru: 'Отчет', uk: 'Звіт', pos: 'nouns' },
    { en: 'exit', ru: 'Выход', uk: 'Вихід', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', pos: 'nouns' },
    { en: 'parcel', ru: 'Посылка', uk: 'Посилка', pos: 'nouns' },
    { en: 'guest', ru: 'Гость', uk: 'Гість', pos: 'nouns' },
    { en: 'mail', ru: 'Почта', uk: 'Пошта', pos: 'nouns' },
    { en: 'groceries', ru: 'Продукты (бакалея)', uk: 'Продукти', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча', uk: 'Зустріч', pos: 'nouns' },
    { en: 'luggage', ru: 'Багаж', uk: 'Багаж', pos: 'nouns' },
    { en: 'lunch', ru: 'Обед', uk: 'Обід', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', pos: 'nouns' },
    { en: 'bill', ru: 'Счет (в ресторане)', uk: 'Рахунок', pos: 'nouns' },
    { en: 'confirmation', ru: 'Подтверждение', uk: 'Підтвердження', pos: 'nouns' },
    { en: 'this', ru: 'Этот (эта)', uk: 'Цей (ця)', pos: 'adjectives' },
    { en: 'where', ru: 'Где', uk: 'Де', pos: 'adverbs' },
    { en: 'what', ru: 'Что', uk: 'Що', pos: 'adverbs' },
    { en: 'when', ru: 'Когда', uk: 'Коли', pos: 'adverbs' },
    { en: 'why', ru: 'Почему', uk: 'Чому', pos: 'adverbs' },
    { en: 'how', ru: 'Как', uk: 'Як', pos: 'adverbs' },
    { en: 'much', ru: 'Много', uk: 'Багато', pos: 'adverbs' },
    { en: 'usually', ru: 'Обычно', uk: 'Зазвичай', pos: 'adverbs' },
    { en: 'now', ru: 'Сейчас', uk: 'Зараз', pos: 'adverbs' },
    { en: 'slowly', ru: 'Медленно', uk: 'Повільно', pos: 'adverbs' },
    { en: 'always', ru: 'Всегда', uk: 'Завжди', pos: 'adverbs' },
  ],
  7: [
    { en: 'have', ru: 'Иметь', uk: 'Мати', pos: 'verbs' },
    { en: 'has', ru: 'Имеет', uk: 'Має', pos: 'verbs' },
    { en: 'does', ru: 'Делает', uk: 'Робить', pos: 'verbs' },
    { en: 'insurance', ru: 'Страховка', uk: 'Страховка', pos: 'nouns' },
    { en: 'driver', ru: 'Водитель', uk: 'Водій', pos: 'nouns' },
    { en: 'license', ru: 'Лицензия', uk: 'Ліцензія', pos: 'nouns' },
    { en: 'allergy', ru: 'Аллергия', uk: 'Алергія', pos: 'nouns' },
    { en: 'reservation', ru: 'Бронирование', uk: 'Бронювання', pos: 'nouns' },
    { en: 'lighter', ru: 'Зажигалка', uk: 'Запальничка', pos: 'nouns' },
    { en: 'pass', ru: 'Пропуск', uk: 'Перепустка', pos: 'nouns' },
    { en: 'tablet', ru: 'Планшет', uk: 'Планшет', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядка', uk: 'Зарядка', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', pos: 'nouns' },
    { en: 'menu', ru: 'Меню', uk: 'Меню', pos: 'nouns' },
    { en: 'device', ru: 'Устройство', uk: 'Пристрій', pos: 'nouns' },
    { en: 'discount', ru: 'Скидка', uk: 'Знижка', pos: 'nouns' },
    { en: 'city', ru: 'Город', uk: 'Місто', pos: 'nouns' },
    { en: 'policy', ru: 'Полис', uk: 'Поліс', pos: 'nouns' },
    { en: 'Wi-Fi', ru: 'Вай-фай', uk: 'Вай-фай', pos: 'nouns' },
    { en: 'first-aid', ru: 'Первая помощь', uk: 'Перша допомога', pos: 'nouns' },
    { en: 'kit', ru: 'Набор', uk: 'Набір', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', pos: 'nouns' },
    { en: 'booking', ru: 'Бронирование', uk: 'Бронювання', pos: 'nouns' },
    { en: 'spare', ru: 'Запасной', uk: 'Запасний', pos: 'adjectives' },
    { en: 'appetite', ru: 'Аппетит', uk: 'Апетит', pos: 'nouns' },
    { en: 'international', ru: 'Международный', uk: 'Міжнародний', pos: 'adjectives' },
    { en: 'question', ru: 'Вопрос', uk: 'Питання', pos: 'nouns' },
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', pos: 'nouns' },
    { en: 'nut', ru: 'Орех', uk: 'Горіх', pos: 'nouns' },
    { en: 'return', ru: 'Обратный', uk: 'Зворотний', pos: 'adjectives' },
    { en: 'seafood', ru: 'Морепродукты', uk: 'Морепродукти', pos: 'nouns' },
    { en: 'with', ru: 'С', uk: 'З', pos: 'adverbs' },
    { en: 'business', ru: 'Бизнес', uk: 'Бізнес', pos: 'nouns' },
    { en: 'plan', ru: 'План', uk: 'План', pos: 'nouns' },
    { en: 'power', ru: 'Мощность', uk: 'Потужність', pos: 'nouns' },
    { en: 'bank', ru: 'Банк', uk: 'Банк', pos: 'nouns' },
    { en: 'prescription', ru: 'Рецепт', uk: 'Рецепт', pos: 'nouns' },
    { en: 'access', ru: 'Доступ', uk: 'Доступ', pos: 'nouns' },
    { en: 'for', ru: 'Для', uk: 'Для', pos: 'adverbs' },
  ],
  8: [
    { en: 'walk', ru: 'Гулять (ходить пешком)', uk: 'Гуляти (йти пішки)', pos: 'verbs' },
    { en: 'arrive', ru: 'Прибывать', uk: 'Прибувати', pos: 'verbs' },
    { en: 'relax', ru: 'Отдыхать (расслабляться)', uk: 'Відпочивати (розслаблятися)', pos: 'verbs' },
    { en: 'depart', ru: 'Отправляться', uk: 'Відправлятися', pos: 'verbs' },
    { en: 'visit', ru: 'Посещать', uk: 'Відвідувати', pos: 'verbs' },
    { en: 'on', ru: 'В (с днями недели)', uk: 'В (з днями тижня)', pos: 'adverbs' },
    { en: 'at', ru: 'В (с точным временем)', uk: 'О (з точним часом)', pos: 'adverbs' },
    { en: 'in', ru: 'В (с месяцами/частями дня)', uk: 'В (з місяцями/частинами дня)', pos: 'adverbs' },
    { en: 'Monday', ru: 'Понедельник', uk: 'Понеділок', pos: 'nouns' },
    { en: 'eight', ru: 'Восемь', uk: 'Вісім', pos: 'nouns' },
    { en: "o'clock", ru: 'Часов (ровно)', uk: 'Година (рівно)', pos: 'nouns' },
    { en: 'July', ru: 'Июль', uk: 'Липень', pos: 'nouns' },
    { en: 'morning', ru: 'Утро', uk: 'Ранок', pos: 'nouns' },
    { en: 'noon', ru: 'Полдень', uk: 'Південь', pos: 'nouns' },
    { en: 'Friday', ru: 'Пятница', uk: "П'ятниця", pos: 'nouns' },
    { en: 'midnight', ru: 'Полночь', uk: 'Північ', pos: 'nouns' },
    { en: 'winter', ru: 'Зима', uk: 'Зима', pos: 'nouns' },
    { en: 'evening', ru: 'Вечер', uk: 'Вечір', pos: 'nouns' },
    { en: 'seven', ru: 'Семь', uk: 'Сім', pos: 'nouns' },
    { en: 'PM', ru: 'После полудня (вечера)', uk: 'Після полудня (вечора)', pos: 'nouns' },
    { en: 'sport', ru: 'Спорт', uk: 'Спорт', pos: 'nouns' },
    { en: 'Tuesday', ru: 'Вторник', uk: 'Вівторок', pos: 'nouns' },
    { en: 'night', ru: 'Ночь', uk: 'Ніч', pos: 'nouns' },
    { en: 'August', ru: 'Август', uk: 'Серпень', pos: 'nouns' },
    { en: 'June', ru: 'Июнь', uk: 'Червень', pos: 'nouns' },
    { en: 'nine', ru: 'Девять', uk: "Дев'ять", pos: 'nouns' },
    { en: 'thirty', ru: 'Тридцать', uk: 'Тридцять', pos: 'nouns' },
    { en: 'Thursday', ru: 'Четверг', uk: 'Четвер', pos: 'nouns' },
    { en: 'vacation', ru: 'Отпуск', uk: 'Відпустка', pos: 'nouns' },
    { en: 'spring', ru: 'Весна', uk: 'Весна', pos: 'nouns' },
    { en: 'ten', ru: 'Десять', uk: 'Десять', pos: 'nouns' },
    { en: 'fifteen', ru: 'Пятнадцать', uk: "П'ятнадцять", pos: 'nouns' },
    { en: 'Sunday', ru: 'Воскресенье', uk: 'Неділя', pos: 'nouns' },
    { en: 'Saturday', ru: 'Суббота', uk: 'Субота', pos: 'nouns' },
    { en: 'six', ru: 'Шесть', uk: 'Шість', pos: 'nouns' },
    { en: 'one', ru: 'Один', uk: 'Один', pos: 'nouns' },
    { en: 'Wednesday', ru: 'Среда', uk: 'Середа', pos: 'nouns' },
    { en: 'day off', ru: 'Выходной', uk: 'Вихідний', pos: 'nouns' },
    { en: 'weekend', ru: 'Выходные', uk: 'Вихідні', pos: 'nouns' },
    { en: 'two', ru: 'Два', uk: 'Два', pos: 'nouns' },
    { en: 'rent', ru: 'Аренда', uk: 'Оренда', pos: 'nouns' },
    { en: 'January', ru: 'Январь', uk: 'Січень', pos: 'nouns' },
    { en: 'five', ru: 'Пять', uk: "П'ять", pos: 'nouns' },
    { en: 'birthday', ru: 'День рождения', uk: 'День народження', pos: 'nouns' },
    { en: 'October', ru: 'Октябрь', uk: 'Жовтень', pos: 'nouns' },
    { en: 'May', ru: 'Май', uk: 'Травень', pos: 'nouns' },
    { en: 'March', ru: 'Март', uk: 'Березень', pos: 'nouns' },
    { en: 'parent', ru: 'Родитель', uk: 'Батько (один з батьків)', pos: 'nouns' },
    { en: 'afternoon', ru: 'День (время после полудня)', uk: 'День (час після полудня)', pos: 'nouns' },
    { en: 'September', ru: 'Сентябрь', uk: 'Вересень', pos: 'nouns' },
    { en: 'project', ru: 'Проект', uk: 'Проєкт', pos: 'nouns' },
    { en: 'AM', ru: 'Утра (до полудня)', uk: 'Ранку (до полудня)', pos: 'nouns' },
    { en: 'December', ru: 'Декабрь', uk: 'Грудень', pos: 'nouns' },
    { en: 'April', ru: 'Апрель', uk: 'Квітень', pos: 'nouns' },
  ],
  9: [
    { en: 'bed', ru: 'Кровать', uk: 'Ліжко', pos: 'nouns' },
    { en: 'park', ru: 'Парк', uk: 'Парк', pos: 'nouns' },
    { en: 'fridge', ru: 'Холодильник', uk: 'Холодильник', pos: 'nouns' },
    { en: 'lift', ru: 'Лифт', uk: 'Ліфт', pos: 'nouns' },
    { en: 'street', ru: 'Улица', uk: 'Вулиця', pos: 'nouns' },
    { en: 'option', ru: 'Вариант (опция)', uk: 'Варіант (опція)', pos: 'nouns' },
    { en: 'towel', ru: 'Полотенце', uk: 'Рушник', pos: 'nouns' },
    { en: 'space', ru: 'Место (пространство)', uk: 'Місце (простір)', pos: 'nouns' },
    { en: 'parking lot', ru: 'Парковка', uk: 'Парковка', pos: 'nouns' },
    { en: 'printer', ru: 'Принтер', uk: 'Принтер', pos: 'nouns' },
    { en: 'shelf', ru: 'Полка', uk: 'Полиця', pos: 'nouns' },
    { en: 'district', ru: 'Район', uk: 'Район', pos: 'nouns' },
    { en: 'first aid kit', ru: 'Аптечка', uk: 'Аптечка', pos: 'nouns' },
    { en: 'tree', ru: 'Дерево', uk: 'Дерево', pos: 'nouns' },
    { en: 'ice', ru: 'Лед', uk: 'Лід', pos: 'nouns' },
    { en: 'glass', ru: 'Стакан', uk: 'Склянка', pos: 'nouns' },
    { en: 'photo', ru: 'Фотография', uk: 'Фотографія', pos: 'nouns' },
    { en: 'wall', ru: 'Стена', uk: 'Стіна', pos: 'nouns' },
    { en: 'swimming pool', ru: 'Бассейн', uk: 'Басейн', pos: 'nouns' },
    { en: 'garden', ru: 'Сад', uk: 'Сад', pos: 'nouns' },
    { en: 'suitcase', ru: 'Чемодан', uk: 'Валіза', pos: 'nouns' },
    { en: 'plate', ru: 'Тарелка', uk: 'Тарілка', pos: 'nouns' },
    { en: 'living room', ru: 'Гостиная', uk: 'Вітальня', pos: 'nouns' },
    { en: 'information', ru: 'Информация', uk: 'Інформація', pos: 'nouns' },
    { en: 'apartment', ru: 'Квартира', uk: 'Квартира', pos: 'nouns' },
    { en: 'coffee machine', ru: 'Кофемашина', uk: 'Кавомашина', pos: 'nouns' },
    { en: 'pen', ru: 'Ручка', uk: 'Ручка', pos: 'nouns' },
    { en: 'desk', ru: 'Письменный стол', uk: 'Письмовий стіл', pos: 'nouns' },
    { en: 'place', ru: 'Место', uk: 'Місце', pos: 'nouns' },
    { en: 'library', ru: 'Библиотека', uk: 'Бібліотека', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелек', uk: 'Гаманець', pos: 'nouns' },
    { en: 'dessert', ru: 'Десерт', uk: 'Десерт', pos: 'nouns' },
    { en: 'phone charger', ru: 'Зарядка для телефона', uk: 'Зарядка для телефону', pos: 'nouns' },
    { en: 'backpack', ru: 'Рюкзак', uk: 'Рюкзак', pos: 'nouns' },
    { en: 'cafe', ru: 'Кафе', uk: 'Кафе', pos: 'nouns' },
    { en: 'task', ru: 'Задача', uk: 'Завдання', pos: 'nouns' },
    { en: 'furniture', ru: 'Мебель', uk: 'Меблі', pos: 'nouns' },
    { en: 'supermarket', ru: 'Супермаркет', uk: 'Супермаркет', pos: 'nouns' },
    { en: 'paper', ru: 'Бумага', uk: 'Папір', pos: 'nouns' },
    { en: 'museum', ru: 'Музей', uk: 'Музей', pos: 'nouns' },
    { en: 'link', ru: 'Ссылка', uk: 'Посилання', pos: 'nouns' },
    { en: 'email', ru: 'Электронное письмо', uk: 'Електронний лист', pos: 'nouns' },
    { en: 'student', ru: 'Студент', uk: 'Студент', pos: 'nouns' },
    { en: 'group', ru: 'Группа', uk: 'Група', pos: 'nouns' },
    { en: 'video', ru: 'Видео', uk: 'Відео', pos: 'nouns' },
    { en: 'profile', ru: 'Профиль', uk: 'Профіль', pos: 'nouns' },
    { en: 'house', ru: 'Дом', uk: 'Будинок', pos: 'nouns' },
    { en: 'message', ru: 'Сообщение', uk: 'Повідомлення', pos: 'nouns' },
    { en: 'mountain', ru: 'Гора', uk: 'Гора', pos: 'nouns' },
    { en: 'country', ru: 'Страна', uk: 'Країна', pos: 'nouns' },
  ],
  10: [
    { en: 'translate', ru: 'Переводить', uk: 'Перекладати', pos: 'verbs' },
    { en: 'fix', ru: 'Чинить (ремонтировать)', uk: 'Лагодити (ремонтувати)', pos: 'verbs' },
    { en: 'learn', ru: 'Учить (изучать)', uk: 'Вчити (вивчати)', pos: 'verbs' },
    { en: 'save', ru: 'Экономить (сохранять)', uk: 'Економити (зберігати)', pos: 'verbs' },
    { en: 'show', ru: 'Показывать', uk: 'Показувати', pos: 'verbs' },
    { en: 'clean', ru: 'Чистить', uk: 'Чистити', pos: 'verbs' },
    { en: 'respect', ru: 'Уважать', uk: 'Поважати', pos: 'verbs' },
    { en: 'protect', ru: 'Защищать', uk: 'Захищати', pos: 'verbs' },
    { en: 'repair', ru: 'Чинить (ремонтировать)', uk: 'Лагодити (ремонтувати)', pos: 'verbs' },
    { en: 'print', ru: 'Печатать', uk: 'Друкувати', pos: 'verbs' },
    { en: 'obey', ru: 'Соблюдать (повиноваться)', uk: 'Дотримуватися (підкорятися)', pos: 'verbs' },
    { en: 'explain', ru: 'Объяснять', uk: 'Пояснювати', pos: 'verbs' },
    { en: 'discuss', ru: 'Обсуждать', uk: 'Обговорювати', pos: 'verbs' },
    { en: 'move', ru: 'Переносить (двигать)', uk: 'Переносити (рухати)', pos: 'verbs' },
    { en: 'reserve', ru: 'Бронировать (резервировать)', uk: 'Бронювати (резервувати)', pos: 'verbs' },
    { en: 'organize', ru: 'Организовывать', uk: 'Організовувати', pos: 'verbs' },
    { en: 'can', ru: 'Мочь (уметь)', uk: 'Могти (вміти)', pos: 'verbs' },
    { en: 'must', ru: 'Должен', uk: 'Повинен', pos: 'verbs' },
    { en: 'word', ru: 'Слово', uk: 'Слово', pos: 'nouns' },
    { en: 'downstairs', ru: 'Внизу (на нижнем этаже)', uk: 'Внизу (на нижньому поверсі)', pos: 'adverbs' },
    { en: 'energy', ru: 'Энергия', uk: 'Енергія', pos: 'nouns' },
    { en: 'month', ru: 'Месяц', uk: 'Місяць', pos: 'nouns' },
    { en: 'suit', ru: 'Костюм', uk: 'Костюм', pos: 'nouns' },
    { en: 'truck', ru: 'Грузовик', uk: 'Вантажівка', pos: 'nouns' },
    { en: 'station', ru: 'Вокзал (станция)', uk: 'Вокзал (станція)', pos: 'nouns' },
    { en: 'light', ru: 'Свет', uk: 'Світло', pos: 'nouns' },
    { en: 'soup', ru: 'Суп', uk: 'Суп', pos: 'nouns' },
    { en: 'nature', ru: 'Природа', uk: 'Природа', pos: 'nouns' },
    { en: 'bicycle', ru: 'Велосипед', uk: 'Велосипед', pos: 'nouns' },
    { en: 'uniform', ru: 'Униформа', uk: 'Уніформа', pos: 'nouns' },
    { en: 'coat', ru: 'Пальто', uk: 'Пальто', pos: 'nouns' },
    { en: 'cloakroom', ru: 'Гардероб', uk: 'Гардероб', pos: 'nouns' },
    { en: 'medicine', ru: 'Лекарство', uk: 'Ліки', pos: 'nouns' },
    { en: 'water', ru: 'Вода', uk: 'Вода', pos: 'nouns' },
    { en: 'reception', ru: 'Приемная (ресепшн)', uk: 'Приймальня (ресепшн)', pos: 'nouns' },
    { en: 'gift', ru: 'Подарок', uk: 'Подарунок', pos: 'nouns' },
    { en: 'sister', ru: 'Сестра', uk: 'Сестра', pos: 'nouns' },
    { en: 'restaurant', ru: 'Ресторан', uk: 'Ресторан', pos: 'nouns' },
    { en: 'data', ru: 'Данные', uk: 'Дані', pos: 'nouns' },
    { en: 'express', ru: 'Экспресс', uk: 'Експрес', pos: 'nouns' },
    { en: 'new', ru: 'Новый', uk: 'Новий', pos: 'adjectives' },
    { en: 'delicious', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'private', ru: 'Личный (приватный)', uk: 'Особистий (приватний)', pos: 'adjectives' },
    { en: 'today', ru: 'Сегодня', uk: 'Сьогодні', pos: 'adverbs' },
    { en: 'daily', ru: 'Ежедневно', uk: 'Щодня', pos: 'adverbs' },
    { en: 'every', ru: 'Каждый', uk: 'Кожен', pos: 'adverbs' },
    { en: 'many', ru: 'Много', uk: 'Багато', pos: 'adjectives' },
    { en: 'some', ru: 'Несколько (немного)', uk: 'Кілька (трохи)', pos: 'adjectives' },
    { en: 'good', ru: 'Хороший', uk: 'Хороший', pos: 'adjectives' },
    { en: 'vegetarian', ru: 'Вегетарианский', uk: 'Вегетаріанський', pos: 'adjectives' },
    { en: 'big', ru: 'Большой', uk: 'Великий', pos: 'adjectives' },
    { en: 'quiet', ru: 'Тихий', uk: 'Тихий', pos: 'adjectives' },
    { en: 'fresh', ru: 'Свежий', uk: 'Свіжий', pos: 'adjectives' },
    { en: 'famous', ru: 'Знаменитый', uk: 'Знаменитий', pos: 'adjectives' },
    { en: 'useful', ru: 'Полезный', uk: 'Корисний', pos: 'adjectives' },
    { en: 'old', ru: 'Старый', uk: 'Старий', pos: 'adjectives' },
    { en: 'beautiful', ru: 'Красивый', uk: 'Красивий', pos: 'adjectives' },
    { en: 'his', ru: 'Его', uk: 'Його', pos: 'pronouns' },
    { en: 'her', ru: 'Ее', uk: 'Її', pos: 'pronouns' },
    { en: 'their', ru: 'Их', uk: 'Їхній', pos: 'pronouns' },
  ],
  11: [
    { en: 'paint', ru: 'Красить', uk: 'Фарбувати', pos: 'verbs' },
    { en: 'delete', ru: 'Удалять', uk: 'Видалити', pos: 'verbs' },
    { en: 'confirm', ru: 'Подтверждать', uk: 'Підтверджувати', pos: 'verbs' },
    { en: 'upload', ru: 'Загружать (в сеть)', uk: 'Завантажувати (у мережу)', pos: 'verbs' },
    { en: 'charge', ru: 'Заряжать', uk: 'Заряджати', pos: 'verbs' },
    { en: 'iron', ru: 'Гладить', uk: 'Прасувати', pos: 'verbs' },
    { en: 'deliver', ru: 'Доставлять', uk: 'Доставляти', pos: 'verbs' },
    { en: 'postpone', ru: 'Переносить (откладывать)', uk: 'Переносити (відкладати)', pos: 'verbs' },
    { en: 'stop', ru: 'Останавливать', uk: 'Зупиняти', pos: 'verbs' },
    { en: 'wrap', ru: 'Упаковывать', uk: 'Запаковувати', pos: 'verbs' },
    { en: 'attend', ru: 'Посещать (присутствовать)', uk: 'Відвідувати (бути присутнім)', pos: 'verbs' },
    { en: 'pack', ru: 'Паковать', uk: 'Пакувати', pos: 'verbs' },
    { en: 'install', ru: 'Устанавливать', uk: 'Встановлювати', pos: 'verbs' },
    { en: 'brush', ru: 'Расчесывать (щеткой)', uk: 'Розчісувати (щіткою)', pos: 'verbs' },
    { en: 'hour', ru: 'Час', uk: 'Година', pos: 'nouns' },
    { en: 'week', ru: 'Неделя', uk: 'Тиждень', pos: 'nouns' },
    { en: 'day', ru: 'День', uk: 'День', pos: 'nouns' },
    { en: 'minute', ru: 'Минута', uk: 'Хвилина', pos: 'nouns' },
    { en: 'shoe', ru: 'Обувь', uk: 'Взуття', pos: 'nouns' },
    { en: 'file', ru: 'Файл', uk: 'Файл', pos: 'nouns' },
    { en: 'laptop', ru: 'Ноутбук', uk: 'Ноутбук', pos: 'nouns' },
    { en: 'shirt', ru: 'Рубашка', uk: 'Сорочка', pos: 'nouns' },
    { en: 'item', ru: 'Товар (позиция)', uk: 'Товар', pos: 'nouns' },
    { en: 'lecture', ru: 'Лекция', uk: 'Лекція', pos: 'nouns' },
    { en: 'notification', ru: 'Уведомление', uk: 'Сповіщення', pos: 'nouns' },
    { en: 'salad', ru: 'Салат', uk: 'Салат', pos: 'nouns' },
    { en: 'movie', ru: 'Фильм', uk: 'Фільм', pos: 'nouns' },
    { en: 'man', ru: 'Человек (мужчина)', uk: 'Людина (чоловік)', pos: 'nouns' },
    { en: 'keyboard', ru: 'Клавиатура', uk: 'Клавіатура', pos: 'nouns' },
    { en: 'thing', ru: 'Вещь', uk: 'Річ', pos: 'nouns' },
    { en: 'woman', ru: 'Женщина', uk: 'Жінка', pos: 'nouns' },
    { en: 'hair', ru: 'Волосы', uk: 'Волосся', pos: 'nouns' },
    { en: 'program', ru: 'Программа', uk: 'Програма', pos: 'nouns' },
    { en: 'carpet', ru: 'Ковер', uk: 'Килим', pos: 'nouns' },
    { en: 'wonderful', ru: 'Чудесный', uk: 'Чудовий', pos: 'adjectives' },
    { en: 'dirty', ru: 'Грязный', uk: 'Брудний', pos: 'adjectives' },
    { en: 'white', ru: 'Белый', uk: 'Білий', pos: 'adjectives' },
    { en: 'difficult', ru: 'Сложный', uk: 'Складний', pos: 'adjectives' },
    { en: 'long', ru: 'Длинный', uk: 'Довгий', pos: 'adjectives' },
    { en: 'yesterday', ru: 'Вчера', uk: 'Вчора', pos: 'adverbs' },
    { en: 'ago', ru: 'Тому (назад)', uk: 'Тому', pos: 'adverbs' },
  ],
  12: [
    { en: 'build', ru: 'Строить', uk: 'Будувати', pos: 'verbs' },
    { en: 'bring', ru: 'Приносить', uk: 'Приносити', pos: 'verbs' },
    { en: 'make', ru: 'Делать (создавать)', uk: 'Робити (створювати)', pos: 'verbs' },
    { en: 'give', ru: 'Давать', uk: 'Давати', pos: 'verbs' },
    { en: 'tell', ru: 'Рассказывать (говорить)', uk: 'Розповідати (говорити)', pos: 'verbs' },
    { en: 'say', ru: 'Сказать', uk: 'Сказати', pos: 'verbs' },
    { en: 'boat', ru: 'Лодка', uk: 'Човен', pos: 'nouns' },
    { en: 'cake', ru: 'Торт (пирожное)', uk: 'Торт (тістечко)', pos: 'nouns' },
    { en: 'fence', ru: 'Забор', uk: 'Паркан', pos: 'nouns' },
    { en: 'headphones', ru: 'Наушники', uk: 'Навушники', pos: 'nouns' },
    { en: 'sandwich', ru: 'Бутерброд', uk: 'Бутерброд', pos: 'nouns' },
    { en: 'umbrella', ru: 'Зонт', uk: 'Парасолька', pos: 'nouns' },
    { en: 'apple', ru: 'Яблоко', uk: 'Яблуко', pos: 'nouns' },
    { en: 'article', ru: 'Статья', uk: 'Стаття', pos: 'nouns' },
    { en: 'jacket', ru: 'Куртка', uk: 'Куртка', pos: 'nouns' },
    { en: 'story', ru: 'История (рассказ)', uk: 'Історія (розповідь)', pos: 'nouns' },
    { en: 'neighbor', ru: 'Сосед', uk: 'Сусід', pos: 'nouns' },
    { en: 'sofa', ru: 'Диван', uk: 'Диван', pos: 'nouns' },
    { en: 'picture', ru: 'Картина (рисунок)', uk: 'Картина (малюнок)', pos: 'nouns' },
    { en: 'pastry', ru: 'Выпечка', uk: 'Випічка', pos: 'nouns' },
    { en: 'box', ru: 'Ящик (коробка)', uk: 'Ящик (коробка)', pos: 'nouns' },
    { en: 'gloves', ru: 'Перчатки', uk: 'Рукавички', pos: 'nouns' },
    { en: 'bird', ru: 'Птица', uk: 'Птах', pos: 'nouns' },
    { en: 'fruit', ru: 'Фрукт', uk: 'Фрукт', pos: 'nouns' },
    { en: 'text', ru: 'Текст', uk: 'Текст', pos: 'nouns' },
    { en: 'topic', ru: 'Тема', uk: 'Тема', pos: 'nouns' },
    { en: 'bridge', ru: 'Мост', uk: 'Міст', pos: 'nouns' },
    { en: 'boots', ru: 'Ботинки', uk: 'Черевики', pos: 'nouns' },
    { en: 'hot', ru: 'Горячий', uk: 'Гарячий', pos: 'adjectives' },
    { en: 'cold', ru: 'Холодный', uk: 'Холодний', pos: 'adjectives' },
    { en: 'comfortable', ru: 'Удобный', uk: 'Зручний', pos: 'adjectives' },
    { en: 'funny', ru: 'Забавный (смешной)', uk: 'Кумедний (смішний)', pos: 'adjectives' },
    { en: 'noisy', ru: 'Шумный', uk: 'Шумний', pos: 'adjectives' },
    { en: 'soft', ru: 'Мягкий', uk: 'М\'який', pos: 'adjectives' },
    { en: 'warm', ru: 'Теплый', uk: 'Теплий', pos: 'adjectives' },
    { en: 'heavy', ru: 'Тяжелый', uk: 'Важкий', pos: 'adjectives' },
    { en: 'tasty', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'strange', ru: 'Странный', uk: 'Дивний', pos: 'adjectives' },
    { en: 'juicy', ru: 'Сочный', uk: 'Соковитий', pos: 'adjectives' },
    { en: 'interesting', ru: 'Интересный', uk: 'Цікавий', pos: 'adjectives' },
    { en: 'sweet', ru: 'Сладкий', uk: 'Солодкий', pos: 'adjectives' },
    { en: 'loud', ru: 'Громкий', uk: 'Гучний', pos: 'adjectives' },
    { en: 'wooden', ru: 'Деревянный', uk: 'Дерев\'яний', pos: 'adjectives' },
    { en: 'rare', ru: 'Редкий', uk: 'Рідкісний', pos: 'adjectives' },
    { en: 'short', ru: 'Короткий', uk: 'Короткий', pos: 'adjectives' },
  ],
  13: [
    // Verbs
    { en: 'prepare', ru: 'Готовить (подготавливать)', uk: 'Готувати (підготувати)', pos: 'verbs' },
    { en: 'choose', ru: 'Выбирать', uk: 'Вибирати', pos: 'verbs' },
    { en: 'cut', ru: 'Резать', uk: 'Різати', pos: 'verbs' },
    { en: 'shut', ru: 'Закрывать', uk: 'Зачиняти', pos: 'verbs' },
    { en: 'get', ru: 'Получать', uk: 'Отримувати', pos: 'verbs' },
    // Nouns
    { en: 'year', ru: 'Год', uk: 'Рік', pos: 'nouns' },
    { en: 'dress', ru: 'Платье', uk: 'Сукня', pos: 'nouns' },
    { en: 'truth', ru: 'Истина (правда)', uk: 'Істина (правда)', pos: 'nouns' },
    { en: 'center', ru: 'Центр', uk: 'Центр', pos: 'nouns' },
    { en: 'armchair', ru: 'Кресло', uk: 'Крісло', pos: 'nouns' },
    { en: 'artist', ru: 'Художник (артист)', uk: 'Художник (артист)', pos: 'nouns' },
    { en: 'hat', ru: 'Шапка (шляпа)', uk: 'Шапка (капелюх)', pos: 'nouns' },
    { en: 'newspaper', ru: 'Газета', uk: 'Газета', pos: 'nouns' },
    { en: 'balloon', ru: 'Воздушный шар', uk: 'Повітряна куля', pos: 'nouns' },
    { en: 'manager', ru: 'Менеджер', uk: 'Менеджер', pos: 'nouns' },
    { en: 'shoes', ru: 'Туфли (обувь)', uk: 'Туфлі (взуття)', pos: 'nouns' },
    { en: 'coolness', ru: 'Прохлада', uk: 'Прохолода', pos: 'nouns' },
    { en: 'song', ru: 'Песня', uk: 'Пісня', pos: 'nouns' },
    { en: 'scheme', ru: 'Схема', uk: 'Схема', pos: 'nouns' },
    { en: 'reason', ru: 'Причина', uk: 'Причина', pos: 'nouns' },
    { en: 'mother', ru: 'Мать', uk: 'Мати', pos: 'nouns' },
    // Adjectives
    { en: 'blue', ru: 'Синий', uk: 'Синій', pos: 'adjectives' },
    { en: 'simple', ru: 'Простой', uk: 'Простий', pos: 'adjectives' },
    { en: 'healthy', ru: 'Полезный (здоровый)', uk: 'Корисний (здоровий)', pos: 'adjectives' },
    { en: 'boring', ru: 'Скучный', uk: 'Нудний', pos: 'adjectives' },
    { en: 'powerful', ru: 'Мощный', uk: 'Потужний', pos: 'adjectives' },
    { en: 'golden', ru: 'Золотой', uk: 'Золотий', pos: 'adjectives' },
    { en: 'secret', ru: 'Секретный', uk: 'Секретний', pos: 'adjectives' },
    { en: 'official', ru: 'Официальный', uk: 'Офіційний', pos: 'adjectives' },
    { en: 'extra', ru: 'Лишний (дополнительный)', uk: 'Зайвий (додатковий)', pos: 'adjectives' },
    { en: 'pleasant', ru: 'Приятный', uk: 'Приємний', pos: 'adjectives' },
    { en: 'leather', ru: 'Кожаный', uk: 'Шкіряний', pos: 'adjectives' },
    // Adverbs
    { en: 'soon', ru: 'Скоро', uk: 'Скоро', pos: 'adverbs' },
    { en: 'later', ru: 'Позже', uk: 'Пізніше', pos: 'adverbs' },
  ],
  14: [
    { en: 'happy', ru: 'Счастливый', uk: 'Щасливий', pos: 'adjectives' },
    { en: 'tall', ru: 'Высокий', uk: 'Високий', pos: 'adjectives' },
    { en: 'slow', ru: 'Медленный', uk: 'Повільний', pos: 'adjectives' },
    { en: 'better', ru: 'Лучше', uk: 'Краще', pos: 'adverbs' },
    { en: 'flashlight', ru: 'Фонарик', uk: 'Ліхтарик', pos: 'nouns' },
    { en: 'sauce', ru: 'Соус', uk: 'Соус', pos: 'nouns' },
    { en: 'fast', ru: 'Быстрый', uk: 'Швидкий', pos: 'adjectives' },
    { en: 'ripe', ru: 'Спелый', uk: 'Стиглий', pos: 'adjectives' },
    { en: 'bright', ru: 'Яркий', uk: 'Яскравий', pos: 'adjectives' },
    { en: 'color', ru: 'Цвет', uk: 'Колір', pos: 'nouns' },
    { en: 'thin', ru: 'Тонкий', uk: 'Тонкий', pos: 'adjectives' },
    { en: 'notebook', ru: 'Тетрадь', uk: 'Зошит', pos: 'nouns' },
    { en: 'wide', ru: 'Широкий', uk: 'Широкий', pos: 'adjectives' },
    { en: 'deep', ru: 'Глубокий', uk: 'Глибокий', pos: 'adjectives' },
    { en: 'lake', ru: 'Озеро', uk: 'Озеро', pos: 'nouns' },
    { en: 'pear', ru: 'Груша', uk: 'Груша', pos: 'nouns' },
    { en: 'beach', ru: 'Пляж', uk: 'Пляж', pos: 'nouns' },
    { en: 'mustard', ru: 'Горчица', uk: 'Гірчиця', pos: 'nouns' },
    { en: 'bitter', ru: 'Горький', uk: 'Гіркий', pos: 'adjectives' },
    { en: 'chocolate', ru: 'Шоколад', uk: 'Шоколад', pos: 'nouns' },
    { en: 'dark', ru: 'Темный', uk: 'Темний', pos: 'adjectives' },
    { en: 'salty', ru: 'Соленый', uk: 'Солоний', pos: 'adjectives' },
    { en: 'snack', ru: 'Закуска', uk: 'Закуска', pos: 'nouns' },
    { en: 'narrow', ru: 'Узкий', uk: 'Вузький', pos: 'adjectives' },
    { en: 'passage', ru: 'Проход', uk: 'Прохід', pos: 'nouns' },
    { en: 'grape', ru: 'Виноград', uk: 'Виноград', pos: 'nouns' },
    { en: 'road', ru: 'Дорога', uk: 'Дорога', pos: 'nouns' },
    { en: 'lantern', ru: 'Фонарь', uk: 'Ліхтар', pos: 'nouns' },
    { en: 'yard', ru: 'Двор', uk: 'Двір', pos: 'nouns' },
    { en: 'small', ru: 'Маленький', uk: 'Маленький', pos: 'adjectives' },
    { en: 'river', ru: 'Река', uk: 'Річка', pos: 'nouns' },
    { en: 'pillow', ru: 'Подушка', uk: 'Подушка', pos: 'nouns' },
    { en: 'mirror', ru: 'Зеркало', uk: 'Дзеркало', pos: 'nouns' },
    { en: 'orange', ru: 'Апельсин', uk: 'Апельсин', pos: 'nouns' },
    { en: 'large', ru: 'Большой', uk: 'Великий', pos: 'adjectives' },
    { en: 'basket', ru: 'Корзина', uk: 'Кошик', pos: 'nouns' },
  ],
  15: [
    { en: 'glove', ru: 'Перчатка', uk: 'Рукавичка', pos: 'nouns' },
    { en: 'chair', ru: 'Стул', uk: 'Стілець', pos: 'nouns' },
    { en: 'cozy', ru: 'Уютный', uk: 'Затишний', pos: 'adjectives' },
    { en: 'modern', ru: 'Современный', uk: 'Сучасний', pos: 'adjectives' },
    { en: 'silver', ru: 'Серебряный', uk: 'Срібний', pos: 'adjectives' },
    { en: 'folder', ru: 'Папка', uk: 'Папка', pos: 'nouns' },
    { en: 'red', ru: 'Красный', uk: 'Червоний', pos: 'adjectives' },
    { en: 'tomato', ru: 'Помидор', uk: 'Томат', pos: 'nouns' },
    { en: 'envelope', ru: 'Конверт', uk: 'Конверт', pos: 'nouns' },
    { en: 'plastic', ru: 'Пластиковый', uk: 'Пластиковий', pos: 'adjectives' },
    { en: 'container', ru: 'Контейнер', uk: 'Контейнер', pos: 'nouns' },
    { en: 'wireless', ru: 'Беспроводной', uk: 'Бездротовий', pos: 'adjectives' },
    { en: 'woolen', ru: 'Шерстяной', uk: 'Вовняний', pos: 'adjectives' },
    { en: 'blanket', ru: 'Одеяло', uk: 'Ковдра', pos: 'nouns' },
    { en: 'reliable', ru: 'Надежный', uk: 'Надійний', pos: 'adjectives' },
    { en: 'steel', ru: 'Стальной', uk: 'Сталевий', pos: 'adjectives' },
    { en: 'lock', ru: 'Замок', uk: 'Замок', pos: 'nouns' },
    { en: 'tool', ru: 'Инструмент', uk: 'Інструмент', pos: 'nouns' },
    { en: 'crunchy', ru: 'Хрустящий', uk: 'Хрусткий', pos: 'adjectives' },
    { en: 'metal', ru: 'Металлический', uk: 'Металевий', pos: 'adjectives' },
    { en: 'hammer', ru: 'Молоток', uk: 'Молоток', pos: 'nouns' },
    { en: 'sharp', ru: 'Острый', uk: 'Гострий', pos: 'adjectives' },
    { en: 'knife', ru: 'Нож', uk: 'Ніж', pos: 'nouns' },
    { en: 'silk', ru: 'Шелковый', uk: 'Шовковий', pos: 'adjectives' },
    { en: 'ribbon', ru: 'Лента', uk: 'Стрічка', pos: 'nouns' },
    { en: 'unmanned', ru: 'Беспилотный', uk: 'Безпілотний', pos: 'adjectives' },
    { en: 'drone', ru: 'Дрон', uk: 'Дрон', pos: 'nouns' },
    { en: 'account', ru: 'Аккаунт', uk: 'Акаунт', pos: 'nouns' },
    { en: 'crumbs', ru: 'Крошки', uk: 'Крихти', pos: 'nouns' },
    { en: 'floor', ru: 'Пол', uk: 'Підлога', pos: 'nouns' },
    { en: 'clock', ru: 'Часы (настенные)', uk: 'Годинник', pos: 'nouns' },
    { en: 'hook', ru: 'Крючок', uk: 'Гачок', pos: 'nouns' },
    { en: 'external', ru: 'Внешний', uk: 'Зовнішній', pos: 'adjectives' },
    { en: 'battery', ru: 'Аккумулятор', uk: 'Акумулятор', pos: 'nouns' },
    { en: 'strong', ru: 'Сильный', uk: 'Сильний', pos: 'adjectives' },
    { en: 'unpleasant', ru: 'Неприятный', uk: 'Неприємний', pos: 'adjectives' },
    { en: 'smell', ru: 'Запах', uk: 'Запах', pos: 'nouns' },
    { en: 'ring', ru: 'Кольцо', uk: 'Каблучка', pos: 'nouns' },
    { en: 'dusty', ru: 'Пыльный', uk: 'Запилений', pos: 'adjectives' },
    { en: 'attic', ru: 'Чердак', uk: 'Горище', pos: 'nouns' },
    { en: 'curtain', ru: 'Штора', uk: 'Штора', pos: 'nouns' },
    { en: 'soy', ru: 'Соевый', uk: 'Соєвий', pos: 'adjectives' },
    { en: 'boot', ru: 'Сапог', uk: 'Чобіт', pos: 'nouns' },
    { en: 'round', ru: 'Круглый', uk: 'Круглий', pos: 'adjectives' },
    { en: 'rug', ru: 'Коврик', uk: 'Килимок', pos: 'nouns' },
    { en: 'oat', ru: 'Овсяный', uk: 'Вівсяний', pos: 'adjectives' },
    { en: 'cookie', ru: 'Печенье', uk: 'Печиво', pos: 'nouns' },
    { en: 'scarf', ru: 'Платок (шарф)', uk: 'Хустка (шарф)', pos: 'nouns' },
    { en: 'sweater', ru: 'Свитер', uk: 'Светр', pos: 'nouns' },
    { en: 'mouse', ru: 'Мышь (компьютерная)', uk: 'Миша (комп\'ютерна)', pos: 'nouns' },
    { en: 'yellow', ru: 'Желтый', uk: 'Жовтий', pos: 'adjectives' },
    { en: 'banana', ru: 'Банан', uk: 'Банан', pos: 'nouns' },
  ],
  16: [
    { en: 'wake up', ru: 'Просыпаться', uk: 'Прокидатися', pos: 'verbs' },
    { en: 'put on', ru: 'Надевать', uk: 'Надягати', pos: 'verbs' },
    { en: 'look for', ru: 'Искать', uk: 'Шукати', pos: 'verbs' },
    { en: 'take off', ru: 'Снимать (одежду)', uk: 'Знімати (одяг)', pos: 'verbs' },
    { en: 'go back', ru: 'Возвращаться', uk: 'Повертатися', pos: 'verbs' },
    { en: 'get into', ru: 'Садиться в (транспорт)', uk: 'Сідати в (транспорт)', pos: 'verbs' },
    { en: 'get out', ru: 'Выходить из', uk: 'Виходити з', pos: 'verbs' },
    { en: 'turn on', ru: 'Включать', uk: 'Вмикати', pos: 'verbs' },
    { en: 'turn off', ru: 'Выключать', uk: 'Вимикати', pos: 'verbs' },
    { en: 'get up', ru: 'Вставать', uk: 'Вставати', pos: 'verbs' },
    { en: 'look after', ru: 'Присматривать за', uk: 'Доглядати за', pos: 'verbs' },
    { en: 'throw away', ru: 'Выбрасывать', uk: 'Викидати', pos: 'verbs' },
    { en: 'give out', ru: 'Раздавать', uk: 'Роздавати', pos: 'verbs' },
    { en: 'try on', ru: 'Примерять', uk: 'Приміряти', pos: 'verbs' },
    { en: 'fill in', ru: 'Вписывать (заполнять)', uk: 'Вписувати (заповнювати)', pos: 'verbs' },
    { en: 'drop in', ru: 'Заглянуть', uk: 'Заглянути', pos: 'verbs' },
    { en: 'give back', ru: 'Возвращать', uk: 'Повертати', pos: 'verbs' },
    { en: 'take away', ru: 'Уносить (убирать)', uk: 'Забирати (прибирати)', pos: 'verbs' },
    { en: 'go away', ru: 'Уходить', uk: 'Йти геть', pos: 'verbs' },
    { en: 'find out', ru: 'Выяснять (узнавать)', uk: 'Дізнаватися (з\'ясовувати)', pos: 'verbs' },
    { en: 'sit down', ru: 'Садиться', uk: 'Сідати', pos: 'verbs' },
    { en: 'call back', ru: 'Перезванивать', uk: 'Передзвонювати', pos: 'verbs' },
    { en: 'clean up', ru: 'Убирать (наводить порядок)', uk: 'Прибирати', pos: 'verbs' },
    { en: 'bring out', ru: 'Выносить (блюдо)', uk: 'Виносити (страву)', pos: 'verbs' },
    { en: 'see off', ru: 'Провожать', uk: 'Проводжати', pos: 'verbs' },
    { en: 'pull on', ru: 'Натягивать (одежду)', uk: 'Натягувати (одяг)', pos: 'verbs' },
    { en: 'pull off', ru: 'Снимать (с трудом)', uk: 'Знімати (із зусиллям)', pos: 'verbs' },
    { en: 'get back', ru: 'Возвращаться', uk: 'Повертатися', pos: 'verbs' },
    { en: 'deal with', ru: 'Иметь дело с', uk: 'Мати справу з', pos: 'verbs' },
    { en: 'look in', ru: 'Заглянуть (к кому-то)', uk: 'Зазирнути', pos: 'verbs' },
    { en: 'hang up', ru: 'Вешать (подвешивать)', uk: 'Вішати', pos: 'verbs' },
    { en: 'go on', ru: 'Продолжать', uk: 'Продовжувати', pos: 'verbs' },
    { en: 'hand over', ru: 'Передавать (вручать)', uk: 'Передавати (вручати)', pos: 'verbs' },
    { en: 'come across', ru: 'Наткнуться на', uk: 'Натрапити на', pos: 'verbs' },
    { en: 'put away', ru: 'Убирать (на место)', uk: 'Прибирати (ховати)', pos: 'verbs' },
    { en: 'pick up', ru: 'Поднимать (подбирать)', uk: 'Підбирати (піднімати)', pos: 'verbs' },
    { en: 'clear away', ru: 'Убирать (начисто)', uk: 'Прибирати (звільняти місце)', pos: 'verbs' },
    { en: 'early', ru: 'Рано', uk: 'Рано', pos: 'adverbs' },
    { en: 'quickly', ru: 'Быстро', uk: 'Швидко', pos: 'adverbs' },
    { en: 'personally', ru: 'Лично', uk: 'Особисто', pos: 'adverbs' },
    { en: 'without', ru: 'Без', uk: 'Без', pos: 'adverbs' },
    { en: 'uncomfortable', ru: 'Неудобный', uk: 'Незручний', pos: 'adjectives' },
    { en: 'polite', ru: 'Вежливый', uk: 'Ввічливий', pos: 'adjectives' },
    { en: 'protective', ru: 'Защитный', uk: 'Захисний', pos: 'adjectives' },
    { en: 'experienced', ru: 'Опытный', uk: 'Досвідчений', pos: 'adjectives' },
    { en: 'technical', ru: 'Технический', uk: 'Технічний', pos: 'adjectives' },
    { en: 'wet', ru: 'Мокрый', uk: 'Мокрий', pos: 'adjectives' },
    { en: 'necessary', ru: 'Необходимый', uk: 'Необхідний', pos: 'adjectives' },
    { en: 'woollen', ru: 'Шерстяной', uk: 'Вовняний', pos: 'adjectives' },
    { en: 'honest', ru: 'Честный', uk: 'Чесний', pos: 'adjectives' },
    { en: 'stuffy', ru: 'Душный', uk: 'Душний', pos: 'adjectives' },
    { en: 'correct', ru: 'Правильный', uk: 'Правильний', pos: 'adjectives' },
    { en: 'lost', ru: 'Потерянный', uk: 'Загублений', pos: 'adjectives' },
    { en: 'guard', ru: 'Охранник', uk: 'Охоронець', pos: 'nouns' },
    { en: 'entrance', ru: 'Вход', uk: 'Вхід', pos: 'nouns' },
    { en: 'magazine', ru: 'Журнал', uk: 'Журнал', pos: 'nouns' },
    { en: 'leaflet', ru: 'Листовка', uk: 'Листівка', pos: 'nouns' },
    { en: 'company', ru: 'Компания', uk: 'Компанія', pos: 'nouns' },
    { en: 'client', ru: 'Клиент', uk: 'Клієнт', pos: 'nouns' },
    { en: 'village', ru: 'Деревня', uk: 'Село', pos: 'nouns' },
    { en: 'master', ru: 'Мастер', uk: 'Майстер', pos: 'nouns' },
    { en: 'corner', ru: 'Угол', uk: 'Ріг', pos: 'nouns' },
    { en: 'clothing', ru: 'Одежда', uk: 'Одяг', pos: 'nouns' },
    { en: 'courier', ru: 'Курьер', uk: 'Кур\'єр', pos: 'nouns' },
    { en: 'coin', ru: 'Монета', uk: 'Монета', pos: 'nouns' },
    { en: 'forest', ru: 'Лес', uk: 'Ліс', pos: 'nouns' },
    { en: 'cupboard', ru: 'Шкаф (для посуды)', uk: 'Шафа (для посуду)', pos: 'nouns' },
    { en: 'grass', ru: 'Трава', uk: 'Трава', pos: 'nouns' },
    { en: 'colleague', ru: 'Коллега', uk: 'Колега', pos: 'nouns' },
    { en: 'tableware', ru: 'Посуда', uk: 'Посуд', pos: 'nouns' },
    { en: 'sink', ru: 'Раковина', uk: 'Раковина', pos: 'nouns' },
    { en: 'sock', ru: 'Носок', uk: 'Шкарпетка', pos: 'nouns' },
    { en: 'owner', ru: 'Владелец', uk: 'Власник', pos: 'nouns' },
    { en: 'machine', ru: 'Машина (механизм)', uk: 'Машина (механізм)', pos: 'nouns' },
    { en: 'bottle', ru: 'Бутылка', uk: 'Пляшка', pos: 'nouns' },
  ],
  17: [
    { en: 'pour', ru: 'Наливать', uk: 'Наливати', pos: 'verbs' },
    { en: 'hang', ru: 'Вешать', uk: 'Вішати', pos: 'verbs' },
    { en: 'throw', ru: 'Бросать', uk: 'Кидати', pos: 'verbs' },
    { en: 'pick', ru: 'Выбирать (собирать)', uk: 'Обирати (збирати)', pos: 'verbs' },
    { en: 'cross', ru: 'Переходить (пересекать)', uk: 'Переходити', pos: 'verbs' },
    { en: 'slice', ru: 'Нарезать (ломтиками)', uk: 'Нарізати', pos: 'verbs' },
    { en: 'draw', ru: 'Рисовать (карандашом/линиями)', uk: 'Малювати', pos: 'verbs' },
    { en: 'brew', ru: 'Заваривать', uk: 'Заварювати', pos: 'verbs' },
    { en: 'create', ru: 'Создавать', uk: 'Створювати', pos: 'verbs' },
    { en: 'trim', ru: 'Подрезать', uk: 'Підрізати', pos: 'verbs' },
    { en: 'set', ru: 'Накрывать (на стол)', uk: 'Накривати', pos: 'verbs' },
    { en: 'hardworking', ru: 'Трудолюбивый', uk: 'Працьовитий', pos: 'adjectives' },
    { en: 'huge', ru: 'Огромный', uk: 'Величезний', pos: 'adjectives' },
    { en: 'fragile', ru: 'Хрупкий', uk: 'Крихкий', pos: 'adjectives' },
    { en: 'attentive', ru: 'Внимательный', uk: 'Уважний', pos: 'adjectives' },
    { en: 'classical', ru: 'Классический', uk: 'Класичний', pos: 'adjectives' },
    { en: 'ancient', ru: 'Древний (старинный)', uk: 'Стародавній', pos: 'adjectives' },
    { en: 'stylish', ru: 'Стильный', uk: 'Стильний', pos: 'adjectives' },
    { en: 'skillful', ru: 'Умелый', uk: 'Вмілий', pos: 'adjectives' },
    { en: 'homemade', ru: 'Домашний (самодельный)', uk: 'Домашній', pos: 'adjectives' },
    { en: 'porcelain', ru: 'Фарфоровый', uk: 'Порцеляновий', pos: 'adjectives' },
    { en: 'secure', ru: 'Безопасный', uk: 'Безпечний', pos: 'adjectives' },
    { en: 'unique', ru: 'Уникальный', uk: 'Унікальний', pos: 'adjectives' },
    { en: 'convenient', ru: 'Удобный', uk: 'Зручний', pos: 'adjectives' },
    { en: 'complex', ru: 'Сложный', uk: 'Складний', pos: 'adjectives' },
    { en: 'local', ru: 'Местный', uk: 'Місцевий', pos: 'adjectives' },
    { en: 'happily', ru: 'Весело (счастливо)', uk: 'Весело (щасливо)', pos: 'adverbs' },
    { en: 'behind', ru: 'Позади (за)', uk: 'Позаду', pos: 'adverbs' },
    { en: 'through', ru: 'Через', uk: 'Через', pos: 'adverbs' },
    { en: 'garage', ru: 'Гараж', uk: 'Гараж', pos: 'nouns' },
    { en: 'boss', ru: 'Начальник', uk: 'Начальник', pos: 'nouns' },
    { en: 'moment', ru: 'Момент', uk: 'Момент', pos: 'nouns' },
    { en: 'condition', ru: 'Условие', uk: 'Умова', pos: 'nouns' },
    { en: 'app', ru: 'Приложение', uk: 'Додаток', pos: 'nouns' },
    { en: 'receptionist', ru: 'Администратор (на ресепшене)', uk: 'Адміністратор', pos: 'nouns' },
    { en: 'skirt', ru: 'Юбка', uk: 'Спідниця', pos: 'nouns' },
    { en: 'warehouse', ru: 'Склад', uk: 'Склад', pos: 'nouns' },
    { en: 'flower', ru: 'Цветок', uk: 'Квітка', pos: 'nouns' },
    { en: 'pot', ru: 'Горшок', uk: 'Горщик', pos: 'nouns' },
    { en: 'waiter', ru: 'Официант', uk: 'Офіціант', pos: 'nouns' },
    { en: 'pie', ru: 'Пирог', uk: 'Пиріг', pos: 'nouns' },
    { en: 'engineer', ru: 'Инженер', uk: 'Інженер', pos: 'nouns' },
    { en: 'panel', ru: 'Панель', uk: 'Панель', pos: 'nouns' },
    { en: 'roof', ru: 'Крыша', uk: 'Дах', pos: 'nouns' },
    { en: 'tumbler', ru: 'Стакан', uk: 'Склянка', pos: 'nouns' },
    { en: 'website', ru: 'Сайт', uk: 'Сайт', pos: 'nouns' },
    { en: 'worker', ru: 'Рабочий', uk: 'Робітник', pos: 'nouns' },
    { en: 'workshop', ru: 'Мастерская', uk: 'Майстерня', pos: 'nouns' },
    { en: 'chef', ru: 'Повар', uk: 'Кухар', pos: 'nouns' },
    { en: 'guide', ru: 'Гид', uk: 'Гід', pos: 'nouns' },
    { en: 'church', ru: 'Церковь', uk: 'Церква', pos: 'nouns' },
    { en: 'crossing', ru: 'Переход', uk: 'Перехід', pos: 'nouns' },
    { en: 'contract', ru: 'Контракт', uk: 'Контракт', pos: 'nouns' },
    { en: 'study', ru: 'Кабинет', uk: 'Кабінет', pos: 'nouns' },
    { en: 'fountain', ru: 'Фонтан', uk: 'Фонтан', pos: 'nouns' },
    { en: 'strawberry', ru: 'Клубника', uk: 'Полуниця', pos: 'nouns' },
    { en: 'market', ru: 'Рынок', uk: 'Ринок', pos: 'nouns' },
    { en: 'gardener', ru: 'Садовник', uk: 'Садівник', pos: 'nouns' },
    { en: 'bush', ru: 'Куст', uk: 'Кущ', pos: 'nouns' },
    { en: 'pool', ru: 'Бассейн', uk: 'Басейн', pos: 'nouns' },
    { en: 'backyard', ru: 'Задний двор', uk: 'Задній двір', pos: 'nouns' },
    { en: 'mechanic', ru: 'Механик', uk: 'Механік', pos: 'nouns' },
    { en: 'engine', ru: 'Двигатель', uk: 'Двигун', pos: 'nouns' },
    { en: 'daughter', ru: 'Дочь', uk: 'Донька', pos: 'nouns' },
    { en: 'castle', ru: 'Замок', uk: 'Замок', pos: 'nouns' },
    { en: 'sheet', ru: 'Лист (бумаги)', uk: 'Аркуш', pos: 'nouns' },
    { en: 'teapot', ru: 'Чайник (для заварки)', uk: 'Чайник', pos: 'nouns' },
    { en: 'vacancy', ru: 'Вакансия', uk: 'Вакансія', pos: 'nouns' },
    { en: 'consultant', ru: 'Консультант', uk: 'Консультант', pos: 'nouns' },
    { en: 'hall', ru: 'Зал', uk: 'Зал', pos: 'nouns' },
    { en: 'service', ru: 'Сервис', uk: 'Сервіс', pos: 'nouns' },
    { en: 'architect', ru: 'Архитектор', uk: 'Архітектор', pos: 'nouns' },
    { en: 'design', ru: 'Дизайн', uk: 'Дизайн', pos: 'nouns' },
  ],
  18: [
    { en: 'press', ru: 'Нажимать', uk: 'Натискати', pos: 'verbs' },
    { en: 'push', ru: 'Толкать', uk: 'Штовхати', pos: 'verbs' },
    { en: 'invite', ru: 'Приглашать', uk: 'Запрошувати', pos: 'verbs' },
    { en: 'feed', ru: 'Кормить', uk: 'Годувати', pos: 'verbs' },
    { en: 'hide', ru: 'Прятать', uk: 'Ховати', pos: 'verbs' },
    { en: 'touch', ru: 'Трогать', uk: 'Чіпати', pos: 'verbs' },
    { en: 'hard', ru: 'Твёрдый', uk: 'Твердий', pos: 'adjectives' },
    { en: 'detailed', ru: 'Подробный', uk: 'Докладний', pos: 'adjectives' },
    { en: 'strict', ru: 'Строгий', uk: 'Суворий', pos: 'adjectives' },
    { en: 'public', ru: 'Общественный', uk: 'Громадський', pos: 'adjectives' },
    { en: 'sour', ru: 'Кислый', uk: 'Кислий', pos: 'adjectives' },
    { en: 'thick', ru: 'Густой', uk: 'Густий', pos: 'adjectives' },
    { en: 'precise', ru: 'Точный', uk: 'Точний', pos: 'adjectives' },
    { en: 'useless', ru: 'Бесполезный', uk: 'Марний', pos: 'adjectives' },
    { en: 'spacious', ru: 'Просторный', uk: 'Просторний', pos: 'adjectives' },
    { en: 'special', ru: 'Специальный', uk: 'Спеціальний', pos: 'adjectives' },
    { en: 'stray', ru: 'Бездомный', uk: 'Бездомний', pos: 'adjectives' },
    { en: 'button', ru: 'Кнопка', uk: 'Кнопка', pos: 'nouns' },
    { en: 'drawer', ru: 'Ящик', uk: 'Ящик', pos: 'nouns' },
    { en: 'page', ru: 'Страница', uk: 'Сторінка', pos: 'nouns' },
    { en: 'bags', ru: 'Сумки', uk: 'Сумки', pos: 'nouns' },
    { en: 'corridor', ru: 'Коридор', uk: 'Коридор', pos: 'nouns' },
    { en: 'cheese', ru: 'Сыр', uk: 'Сир', pos: 'nouns' },
    { en: 'tools', ru: 'Инструменты', uk: 'Інструменти', pos: 'nouns' },
    { en: 'delegation', ru: 'Делегация', uk: 'Делегація', pos: 'nouns' },
    { en: 'gates', ru: 'Ворота', uk: 'Ворота', pos: 'nouns' },
    { en: 'wardrobe', ru: 'Шкаф', uk: 'Шафа', pos: 'nouns' },
    { en: 'cup', ru: 'Стакан/Кружка', uk: 'Стакан/Кружка', pos: 'nouns' },
    { en: 'blueprint', ru: 'Чертёж', uk: 'Креслення', pos: 'nouns' },
    { en: 'kettle', ru: 'Чайник', uk: 'Чайник', pos: 'nouns' },
    { en: 'surface', ru: 'Поверхность', uk: 'Поверхня', pos: 'nouns' },
    { en: 'event', ru: 'Мероприятие', uk: 'Захід', pos: 'nouns' },
    { en: 'overalls', ru: 'Спецодежда', uk: 'Спецодяг', pos: 'nouns' },
    { en: 'hallway', ru: 'Коридор/Прихожая', uk: 'Коридор/Передпокій', pos: 'nouns' },
    { en: 'dog', ru: 'Собака', uk: 'Собака', pos: 'nouns' },
    { en: 'sunset', ru: 'Закат', uk: 'Захід сонця', pos: 'nouns' },
    { en: 'camera', ru: 'Камера', uk: 'Камера', pos: 'nouns' },
    { en: 'journey', ru: 'Поездка', uk: 'Подорож', pos: 'nouns' },
    { en: 'wicket', ru: 'Калитка', uk: 'Хвіртка', pos: 'nouns' },
    { en: 'gifts', ru: 'Подарки', uk: 'Подарунки', pos: 'nouns' },
    { en: 'fir-tree', ru: 'Ель', uk: 'Ялинка', pos: 'nouns' },
    { en: 'pavement', ru: 'Тротуар', uk: 'Тротуар', pos: 'nouns' },
    { en: 'berries', ru: 'Ягоды', uk: 'Ягоди', pos: 'nouns' },
    { en: 'shift', ru: 'Смена', uk: 'Зміна', pos: 'nouns' },
    { en: 'watches', ru: 'Часы', uk: 'Годинники', pos: 'nouns' },
    { en: 'bedroom', ru: 'Спальня', uk: 'Спальня', pos: 'nouns' },
    { en: 'flash-drive', ru: 'Флешка', uk: 'Флешка', pos: 'nouns' },
    { en: 'agent', ru: 'Средство', uk: 'Засіб', pos: 'nouns' },
    { en: 'axe', ru: 'Топор', uk: 'Сокира', pos: 'nouns' },
    { en: 'children', ru: 'Дети', uk: 'Діти', pos: 'nouns' },
    { en: 'lamp', ru: 'Лампа', uk: 'Лампа', pos: 'nouns' },
    { en: 'family', ru: 'Семья', uk: 'Сім\'я', pos: 'nouns' },
  ],
  19: [
    { en: 'lie', ru: 'Лежать', uk: 'Лежати', pos: 'irregular_verbs' },
    { en: 'stand', ru: 'Стоять', uk: 'Стояти', pos: 'irregular_verbs' },
    { en: 'sit', ru: 'Сидеть', uk: 'Сидіти', pos: 'irregular_verbs' },
    { en: 'grow', ru: 'Расти', uk: 'Рости', pos: 'irregular_verbs' },
    { en: 'grey', ru: 'Серый', uk: 'Сірий', pos: 'adjectives' },
    { en: 'black', ru: 'Черный', uk: 'Чорний', pos: 'adjectives' },
    { en: 'low', ru: 'Низкий', uk: 'Низький', pos: 'adjectives' },
    { en: 'sandy', ru: 'Песчаный', uk: 'Піщаний', pos: 'adjectives' },
    { en: 'tight', ru: 'Тесный', uk: 'Тісний', pos: 'adjectives' },
    { en: 'rocky', ru: 'Скалистый', uk: 'Скелястий', pos: 'adjectives' },
    { en: 'brave', ru: 'Смелый', uk: 'Сміливий', pos: 'adjectives' },
    { en: 'thorny', ru: 'Колючий', uk: 'Колючий', pos: 'adjectives' },
    { en: 'briefcase', ru: 'Портфель', uk: 'Портфель', pos: 'nouns' },
    { en: 'hill', ru: 'Холм', uk: 'Пагорб', pos: 'nouns' },
    { en: 'motorcycle', ru: 'Мотоцикл', uk: 'Мотоцикл', pos: 'nouns' },
    { en: 'shore', ru: 'Берег', uk: 'Берег', pos: 'nouns' },
    { en: 'campfire', ru: 'Костер', uk: 'Багаття', pos: 'nouns' },
    { en: 'stairs', ru: 'Лестница', uk: 'Сходи', pos: 'nouns' },
    { en: 'flat', ru: 'Квартира', uk: 'Квартира', pos: 'nouns' },
    { en: 'lighthouse', ru: 'Маяк', uk: 'Маяк', pos: 'nouns' },
    { en: 'island', ru: 'Остров', uk: 'Острів', pos: 'nouns' },
    { en: 'oak', ru: 'Дуб', uk: 'Дуб', pos: 'nouns' },
    { en: 'rainbow', ru: 'Радуга', uk: 'Веселка', pos: 'nouns' },
    { en: 'sea', ru: 'Море', uk: 'Море', pos: 'nouns' },
    { en: 'basement', ru: 'Подвал', uk: 'Підвал', pos: 'nouns' },
    { en: 'shed', ru: 'Сарай', uk: 'Сарай', pos: 'nouns' },
    { en: 'sneakers', ru: 'Кроссовки', uk: 'Кросівки', pos: 'nouns' },
    { en: 'bench', ru: 'Скамейка', uk: 'Лавка', pos: 'nouns' },
    { en: 'vegetable', ru: 'Овощ', uk: 'Овоч', pos: 'nouns' },
    { en: 'bookstore', ru: 'Книжный магазин', uk: 'Книжковий магазин', pos: 'nouns' },
    { en: 'musician', ru: 'Музыкант', uk: 'Музикант', pos: 'nouns' },
    { en: 'guitar', ru: 'Гитара', uk: 'Гітара', pos: 'nouns' },
    { en: 'fireplace', ru: 'Камин', uk: 'Камін', pos: 'nouns' },
    { en: 'ball', ru: 'Мяч', uk: "М'яч", pos: 'nouns' },
    { en: 'path', ru: 'Тропинка', uk: 'Стежка', pos: 'nouns' },
    { en: 'niece', ru: 'Племянница', uk: 'Племінниця', pos: 'nouns' },
    { en: 'lane', ru: 'Переулок', uk: 'Провулок', pos: 'nouns' },
    { en: 'chess', ru: 'Шахматы', uk: 'Шахи', pos: 'nouns' },
    { en: 'cloud', ru: 'Облако', uk: 'Хмара', pos: 'nouns' },
    { en: 'sun', ru: 'Солнце', uk: 'Сонце', pos: 'nouns' },
  ],
  20: [
    { en: 'somebody', ru: 'Кто-то', uk: 'Хтось', pos: 'pronouns' },
    { en: 'nobody', ru: 'Никто', uk: 'Ніхто', pos: 'pronouns' },
    { en: 'unusual', ru: 'Необычный', uk: 'Незвичайний', pos: 'adjectives' },
    { en: 'Italian', ru: 'Итальянский', uk: 'Італійський', pos: 'adjectives' },
    { en: 'essay', ru: 'Эссе', uk: 'Есе', pos: 'nouns' },
    { en: 'souvenir', ru: 'Сувенир', uk: 'Сувенір', pos: 'nouns' },
    { en: 'kiosk', ru: 'Киоск', uk: 'Кіоск', pos: 'nouns' },
  ],
  21: [
    { en: 'steal', ru: 'Красть', uk: 'Красти', pos: 'irregular_verbs' },
    { en: 'someone', ru: 'Кто-то', uk: 'Хтось', pos: 'pronouns' },
    { en: 'no one', ru: 'Никто', uk: 'Ніхто', pos: 'pronouns' },
    { en: 'everyone', ru: 'Все (каждый)', uk: 'Усі (кожен)', pos: 'pronouns' },
    { en: 'everybody', ru: 'Все', uk: 'Усі', pos: 'pronouns' },
    { en: 'anyone', ru: 'Кто-нибудь', uk: 'Хто-небудь', pos: 'pronouns' },
    { en: 'something', ru: 'Что-то', uk: 'Щось', pos: 'pronouns' },
    { en: 'nothing', ru: 'Ничего', uk: 'Нічого', pos: 'pronouns' },
    { en: 'everything', ru: 'Всё', uk: 'Все', pos: 'pronouns' },
    { en: 'anything', ru: 'Что-нибудь', uk: 'Що-небудь', pos: 'pronouns' },
    { en: 'anonymous', ru: 'Анонимный', uk: 'Анонімний', pos: 'adjectives' },
    { en: 'different', ru: 'Другой', uk: 'Інший', pos: 'adjectives' },
    { en: 'formal', ru: 'Торжественный', uk: 'Урочистий', pos: 'adjectives' },
    { en: 'possible', ru: 'Возможный', uk: 'Можливий', pos: 'adjectives' },
    { en: 'sunny', ru: 'Солнечный', uk: 'Сонячний', pos: 'adjectives' },
    { en: 'tired', ru: 'Уставший', uk: 'Втомлений', pos: 'adjectives' },
    { en: 'abandoned', ru: 'Заброшенный', uk: 'Покинутий', pos: 'adjectives' },
    { en: 'crowded', ru: 'Переполненный', uk: 'Переповнений', pos: 'adjectives' },
    { en: 'valuable', ru: 'Ценный', uk: 'Цінний', pos: 'adjectives' },
    { en: 'favorite', ru: 'Любимый', uk: 'Улюблений', pos: 'adjectives' },
    { en: 'incident', ru: 'Происшествие', uk: 'Подія', pos: 'nouns' },
    { en: 'situation', ru: 'Ситуация', uk: 'Ситуація', pos: 'nouns' },
    { en: 'mall', ru: 'Торговый центр', uk: 'Торговий центр', pos: 'nouns' },
    { en: 'ghost', ru: 'Привидение', uk: 'Привид', pos: 'nouns' },
    { en: 'conversation', ru: 'Разговор', uk: 'Розмова', pos: 'nouns' },
    { en: 'explanation', ru: 'Объяснение', uk: 'Пояснення', pos: 'nouns' },
    { en: 'wind', ru: 'Ветер', uk: 'Вітер', pos: 'nouns' },
    { en: 'trip', ru: 'Поездка', uk: 'Поїздка', pos: 'nouns' },
    { en: 'sunglasses', ru: 'Солнечные очки', uk: 'Сонцезахисні окуляри', pos: 'nouns' },
    { en: 'spoon', ru: 'Ложка', uk: 'Ложка', pos: 'nouns' },
    { en: 'singer', ru: 'Певица', uk: 'Співачка', pos: 'nouns' },
    { en: 'excuse', ru: 'Оправдание', uk: 'Виправдання', pos: 'nouns' },
    { en: 'countryside', ru: 'Сельская местность', uk: 'Сільська місцевість', pos: 'nouns' },
    { en: 'party', ru: 'Вечеринка', uk: 'Вечірка', pos: 'nouns' },
  ],
  22: [
    { en: 'ride', ru: 'Ездить', uk: 'Їздити', pos: 'irregular_verbs' },
    { en: 'enjoy', ru: 'Наслаждаться', uk: 'Насолоджуватися', pos: 'verbs' },
    { en: 'avoid', ru: 'Избегать', uk: 'Уникати', pos: 'verbs' },
    { en: 'suggest', ru: 'Предлагать', uk: 'Пропонувати', pos: 'verbs' },
    { en: 'consider', ru: 'Рассматривать', uk: 'Розглядати', pos: 'verbs' },
    { en: 'imagine', ru: 'Воображать', uk: 'Уявляти', pos: 'verbs' },
    { en: 'appreciate', ru: 'Ценить', uk: 'Цінувати', pos: 'verbs' },
    { en: 'mention', ru: 'Упоминать', uk: 'Згадувати', pos: 'verbs' },
    { en: 'dislike', ru: 'Не любить', uk: 'Не любити', pos: 'verbs' },
    { en: 'hate', ru: 'Ненавидеть', uk: 'Ненавидіти', pos: 'verbs' },
    { en: 'include', ru: 'Включать', uk: 'Включати', pos: 'verbs' },
    { en: 'require', ru: 'Требовать', uk: 'Вимагати', pos: 'verbs' },
    { en: 'refreshing', ru: 'Освежающий', uk: 'Освіжаючий', pos: 'adjectives' },
    { en: 'historical', ru: 'Исторический', uk: 'Історичний', pos: 'adjectives' },
    { en: 'picturesque', ru: 'Живописный', uk: 'Мальовничий', pos: 'adjectives' },
    { en: 'harmful', ru: 'Вредный', uk: 'Шкідливий', pos: 'adjectives' },
    { en: 'loyal', ru: 'Лояльный', uk: 'Лояльний', pos: 'adjectives' },
    { en: 'cosy', ru: 'Уютный', uk: 'Затишний', pos: 'adjectives' },
    { en: 'industrial', ru: 'Промышленный', uk: 'Промисловий', pos: 'adjectives' },
    { en: 'talented', ru: 'Талантливый', uk: 'Талановитий', pos: 'adjectives' },
    { en: 'swimming', ru: 'Плавание', uk: 'Плавання', pos: 'nouns' },
    { en: 'cooking', ru: 'Готовка', uk: 'Готування', pos: 'nouns' },
    { en: 'dancing', ru: 'Танцы', uk: 'Танці', pos: 'nouns' },
    { en: 'painting', ru: 'Рисование', uk: 'Малювання', pos: 'nouns' },
    { en: 'jogging', ru: 'Бег трусцой', uk: 'Біг підтюпцем', pos: 'nouns' },
    { en: 'economy', ru: 'Экономика', uk: 'Економіка', pos: 'nouns' },
    { en: 'landscape', ru: 'Пейзаж', uk: 'Пейзаж', pos: 'nouns' },
    { en: 'patience', ru: 'Терпение', uk: 'Терпіння', pos: 'nouns' },
    { en: 'feedback', ru: 'Обратная связь', uk: 'Зворотний зв\'язок', pos: 'nouns' },
    { en: 'equipment', ru: 'Оборудование', uk: 'Обладнання', pos: 'nouns' },
    { en: 'laboratory', ru: 'Лаборатория', uk: 'Лабораторія', pos: 'nouns' },
    { en: 'conference', ru: 'Конференция', uk: 'Конференція', pos: 'nouns' },
    { en: 'auction', ru: 'Аукцион', uk: 'Аукціон', pos: 'nouns' },
    { en: 'mechanism', ru: 'Механизм', uk: 'Механізм', pos: 'nouns' },
    { en: 'plant', ru: 'Завод', uk: 'Завод', pos: 'nouns' },
    { en: 'studio', ru: 'Студия', uk: 'Студія', pos: 'nouns' },
    { en: 'collect', ru: 'Коллекционировать', uk: 'Колекціонувати', pos: 'verbs' },
    { en: 'photograph', ru: 'Фотографировать', uk: 'Фотографувати', pos: 'verbs' },
    { en: 'forbid', ru: 'Запрещать', uk: 'Забороняти', pos: 'irregular_verbs' },
    { en: 'strictly', ru: 'Строго', uk: 'Суворо', pos: 'adverbs' },
    { en: 'forbidden', ru: 'Запрещено', uk: 'Заборонено', pos: 'adjectives' },
    { en: 'wild', ru: 'Дикий', uk: 'Дикий', pos: 'adjectives' },
    { en: 'mushroom', ru: 'Гриб', uk: 'Гриб', pos: 'nouns' },
    { en: 'stamp', ru: 'Марка', uk: 'Марка', pos: 'nouns' },
    { en: 'animal', ru: 'Животное', uk: 'Тварина', pos: 'nouns' },
  ],
  23: [
    { en: 'belong', ru: 'Принадлежать', uk: 'Належати', pos: 'verbs' },
    { en: 'fill', ru: 'Наполнять', uk: 'Наповнювати', pos: 'verbs' },
    { en: 'support', ru: 'Поддерживать', uk: 'Підтримувати', pos: 'verbs' },
    { en: 'personal', ru: 'Личный', uk: 'Особистий', pos: 'adjectives' },
    { en: 'legal', ru: 'Юридический', uk: 'Юридичний', pos: 'adjectives' },
    { en: 'skilful', ru: 'Умелый', uk: 'Вмілий', pos: 'adjectives' },
    { en: 'immediately', ru: 'Немедленно', uk: 'Негайно', pos: 'adverbs' },
    { en: 'periodically', ru: 'Периодически', uk: 'Періодично', pos: 'adverbs' },
    { en: 'thrice', ru: 'Трижды', uk: 'Тричі', pos: 'adverbs' },
    { en: 'highly', ru: 'Высоко', uk: 'Високо', pos: 'adverbs' },
    { en: 'secretary', ru: 'Секретарь', uk: 'Секретар', pos: 'nouns' },
    { en: 'scientist', ru: 'Ученый', uk: 'Вчений', pos: 'nouns' },
    { en: 'tourist', ru: 'Турист', uk: 'Турист', pos: 'nouns' },
    { en: 'lawyer', ru: 'Юрист', uk: 'Юрист', pos: 'nouns' },
    { en: 'employee', ru: 'Сотрудник', uk: 'Співробітник', pos: 'nouns' },
    { en: 'director', ru: 'Директор', uk: 'Директор', pos: 'nouns' },
    { en: 'postman', ru: 'Почтальон', uk: 'Листоноша', pos: 'nouns' },
    { en: 'application', ru: 'Заявление', uk: 'Заява', pos: 'nouns' },
    { en: 'department', ru: 'Отдел', uk: 'Відділ', pos: 'nouns' },
  ],
  24: [
    { en: 'lend', ru: 'Одалживать', uk: 'Позичати', pos: 'irregular_verbs' },
    { en: 'win', ru: 'Выигрывать', uk: 'Вигравати', pos: 'irregular_verbs' },
    { en: 'receive', ru: 'Получать', uk: 'Отримувати', pos: 'verbs' },
    { en: 'bake', ru: 'Выпекать', uk: 'Пекти', pos: 'verbs' },
    { en: 'taste', ru: 'Пробовать на вкус', uk: 'Куштувати', pos: 'verbs' },
    { en: 'traditional', ru: 'Традиционный', uk: 'Традиційний', pos: 'adjectives' },
    { en: 'whole', ru: 'Целый', uk: 'Цілий', pos: 'adjectives' },
    { en: 'suitable', ru: 'Подходящий', uk: 'Підходящий', pos: 'adjectives' },
    { en: 'exotic', ru: 'Экзотический', uk: 'Екзотичний', pos: 'adjectives' },
    { en: 'grand', ru: 'Грандиозный', uk: 'Грандіозний', pos: 'adjectives' },
    { en: 'massive', ru: 'Массивный', uk: 'Масивний', pos: 'adjectives' },
    { en: 'prestigious', ru: 'Престижный', uk: 'Престижний', pos: 'adjectives' },
    { en: 'scientific', ru: 'Научный', uk: 'Науковий', pos: 'adjectives' },
    { en: 'natural', ru: 'Природный', uk: 'Природний', pos: 'adjectives' },
    { en: 'foreign', ru: 'Иностранный', uk: 'Іноземний', pos: 'adjectives' },
    { en: 'just', ru: 'Только что', uk: 'Щойно', pos: 'adverbs' },
    { en: 'already', ru: 'Уже', uk: 'Вже', pos: 'adverbs' },
    { en: 'yet', ru: 'Еще (в отриц.)', uk: 'Ще', pos: 'adverbs' },
    { en: 'ever', ru: 'Когда-либо', uk: 'Коли-небудь', pos: 'adverbs' },
    { en: 'never', ru: 'Никогда', uk: 'Ніколи', pos: 'adverbs' },
    { en: 'before', ru: 'Раньше', uk: 'Раніше', pos: 'adverbs' },
    { en: 'somewhere', ru: 'Где-то', uk: 'Десь', pos: 'adverbs' },
    { en: 'cinema', ru: 'Кинотеатр', uk: 'Кінотеатр', pos: 'nouns' },
    { en: 'concert', ru: 'Концерт', uk: 'Концерт', pos: 'nouns' },
    { en: 'review', ru: 'Отзыв', uk: 'Відгук', pos: 'nouns' },
    { en: 'technology', ru: 'Технология', uk: 'Технологія', pos: 'nouns' },
    { en: 'environment', ru: 'Среда (окружающая)', uk: 'Середовище', pos: 'nouns' },
    { en: 'result', ru: 'Результат', uk: 'Результат', pos: 'nouns' },
    { en: 'anniversary', ru: 'Годовщина', uk: 'Річниця', pos: 'nouns' },
    { en: 'recipe', ru: 'Рецепт', uk: 'Рецепт', pos: 'nouns' },
    { en: 'gallery', ru: 'Галерея', uk: 'Галерея', pos: 'nouns' },
    { en: 'neighbour', ru: 'Сосед', uk: 'Сусід', pos: 'nouns' },
    { en: 'ladder', ru: 'Лестница (стремянка)', uk: 'Драбина', pos: 'nouns' },
    { en: 'invitation', ru: 'Приглашение', uk: 'Запрошення', pos: 'nouns' },
    { en: 'grant', ru: 'Грант', uk: 'Грант', pos: 'nouns' },
    { en: 'research', ru: 'Исследование', uk: 'Дослідження', pos: 'nouns' },
    { en: 'partner', ru: 'Партнер', uk: 'Партнер', pos: 'nouns' },
    { en: 'centre', ru: 'Центр', uk: 'Центр', pos: 'nouns' },
    { en: 'phenomenon', ru: 'Явление', uk: 'Явище', pos: 'nouns' },
  ],
  25: [
    { en: 'shout', ru: 'Кричать', uk: 'Кричати', pos: 'verbs' },
    { en: 'knock', ru: 'Стучать', uk: 'Стукати', pos: 'verbs' },
    { en: 'celebrate', ru: 'Праздновать', uk: 'Святкувати', pos: 'verbs' },
    { en: 'patrol', ru: 'Патрулировать', uk: 'Патрулювати', pos: 'verbs' },
    { en: 'scratch', ru: 'Царапать', uk: 'Дряпати', pos: 'verbs' },
    { en: 'amazing', ru: 'Удивительный', uk: 'Дивовижний', pos: 'adjectives' },
    { en: 'cautious', ru: 'Осторожный', uk: 'Обережний', pos: 'adjectives' },
    { en: 'slippery', ru: 'Скользкий', uk: 'Слизький', pos: 'adjectives' },
    { en: 'financial', ru: 'Финансовый', uk: 'Фінансовий', pos: 'adjectives' },
    { en: 'suspicious', ru: 'Подозрительный', uk: 'Підозрілий', pos: 'adjectives' },
    { en: 'annual', ru: 'Годовой', uk: 'Річний', pos: 'adjectives' },
    { en: 'successful', ru: 'Успешный', uk: 'Успішний', pos: 'adjectives' },
    { en: 'sad', ru: 'Грустный', uk: 'Сумний', pos: 'adjectives' },
    { en: 'unhealthy', ru: 'Вредный', uk: 'Шкідливий', pos: 'adjectives' },
    { en: 'loudly', ru: 'Громко', uk: 'Голосно', pos: 'adverbs' },
    { en: 'still', ru: 'Все еще', uk: 'Все ще', pos: 'adverbs' },
    { en: 'excursion', ru: 'Экскурсия', uk: 'Екскурсія', pos: 'nouns' },
    { en: 'system', ru: 'Система', uk: 'Система', pos: 'nouns' },
    { en: 'complaint', ru: 'Жалоба', uk: 'Скарга', pos: 'nouns' },
    { en: 'conflict', ru: 'Конфликт', uk: 'Конфлікт', pos: 'nouns' },
    { en: 'playground', ru: 'Площадка', uk: 'Майданчик', pos: 'nouns' },
    { en: 'parking', ru: 'Парковка', uk: 'Парковка', pos: 'nouns' },
    { en: 'platform', ru: 'Платформа', uk: 'Платформа', pos: 'nouns' },
    { en: 'agreement', ru: 'Соглашение', uk: 'Угода', pos: 'nouns' },
    { en: 'deal', ru: 'Сделка', uk: 'Угода', pos: 'nouns' },
    { en: 'issue', ru: 'Вопрос', uk: 'Питання', pos: 'nouns' },
    { en: 'inspector', ru: 'Инспектор', uk: 'Інспектор', pos: 'nouns' },
  ],
  26: [
    { en: 'catch', ru: 'Ловить', uk: 'Ловити', pos: 'irregular_verbs' },
    { en: 'run', ru: 'Запускать', uk: 'Запускати', pos: 'irregular_verbs' },
    { en: 'burn', ru: 'Гореть', uk: 'Горіти', pos: 'irregular_verbs' },
    { en: 'hold', ru: 'Держать', uk: 'Тримати', pos: 'irregular_verbs' },
    { en: 'heat', ru: 'Нагревать', uk: 'Нагрівати', pos: 'verbs' },
    { en: 'enter', ru: 'Вводить', uk: 'Вводити', pos: 'verbs' },
    { en: 'offer', ru: 'Предлагать', uk: 'Пропонувати', pos: 'verbs' },
    { en: 'accept', ru: 'Принимать', uk: 'Приймати', pos: 'verbs' },
    { en: 'reduce', ru: 'Уменьшать', uk: 'Зменшувати', pos: 'verbs' },
    { en: 'replace', ru: 'Заменять', uk: 'Замінювати', pos: 'verbs' },
    { en: 'float', ru: 'Плавать', uk: 'Плавати', pos: 'verbs' },
    { en: 'melt', ru: 'Плавиться', uk: 'Плавитися', pos: 'verbs' },
    { en: 'expand', ru: 'Расширяться', uk: 'Розширюватися', pos: 'verbs' },
    { en: 'enable', ru: 'Включать', uk: 'Ввімкнути', pos: 'verbs' },
    { en: 'happen', ru: 'Случаться', uk: 'Ставатися', pos: 'verbs' },
    { en: 'complete', ru: 'Завершать', uk: 'Завершувати', pos: 'verbs' },
    { en: 'attract', ru: 'Притягивать', uk: 'Притягувати', pos: 'verbs' },
    { en: 'improve', ru: 'Улучшать', uk: 'Покращувати', pos: 'verbs' },
    { en: 'hidden', ru: 'Скрытый', uk: 'Прихований', pos: 'adjectives' },
    { en: 'profitable', ru: 'Выгодный', uk: 'Вигідний', pos: 'adjectives' },
    { en: 'responsible', ru: 'Ответственный', uk: 'Відповідальний', pos: 'adjectives' },
    { en: 'automatic', ru: 'Автоматический', uk: 'Автоматичний', pos: 'adjectives' },
    { en: 'successfully', ru: 'Успешно', uk: 'Успішно', pos: 'adverbs' },
    { en: 'strongly', ru: 'Сильно', uk: 'Сильно', pos: 'adverbs' },
    { en: 'regularly', ru: 'Регулярно', uk: 'Регулярно', pos: 'adverbs' },
    { en: 'profit', ru: 'Прибыль', uk: 'Прибуток', pos: 'nouns' },
    { en: 'strategy', ru: 'Стратегия', uk: 'Стратегія', pos: 'nouns' },
    { en: 'oil', ru: 'Техническое масло', uk: 'Технічне масло', pos: 'nouns' },
    { en: 'error', ru: 'Ошибка', uk: 'Помилка', pos: 'nouns' },
    { en: 'price', ru: 'Цена', uk: 'Ціна', pos: 'nouns' },
    { en: 'interview', ru: 'Собеседование', uk: 'Співбесіда', pos: 'nouns' },
    { en: 'navigator', ru: 'Навигатор', uk: 'Навігатор', pos: 'nouns' },
    { en: 'investor', ru: 'Инвестор', uk: 'Інвестор', pos: 'nouns' },
    { en: 'startup', ru: 'Стартап', uk: 'Стартап', pos: 'nouns' },
    { en: 'capital', ru: 'Капитал', uk: 'Капітал', pos: 'nouns' },
    { en: 'payment', ru: 'Оплата', uk: 'Оплата', pos: 'nouns' },
    { en: 'magnet', ru: 'Магнит', uk: 'Магніт', pos: 'nouns' },
    { en: 'rubbish', ru: 'Мусор', uk: 'Сміття', pos: 'nouns' },
    { en: 'term', ru: 'Термин', uk: 'Термін', pos: 'nouns' },
    { en: 'position', ru: 'Должность', uk: 'Посада', pos: 'nouns' },
    { en: 'furnace', ru: 'Промышленная печь', uk: 'Промислова піч', pos: 'nouns' },
    { en: 'parameter', ru: 'Параметр', uk: 'Параметр', pos: 'nouns' },
    { en: 'crossroads', ru: 'Перекресток', uk: 'Перехрестя', pos: 'nouns' },
    { en: 'logo', ru: 'Логотип', uk: 'Логотип', pos: 'nouns' },
    { en: 'funds', ru: 'Средства', uk: 'Кошти', pos: 'nouns' },
    { en: 'permission', ru: 'Разрешение', uk: 'Дозвіл', pos: 'nouns' },
    { en: 'sensor', ru: 'Датчик', uk: 'Датчик', pos: 'nouns' },
    { en: 'salt', ru: 'Соль', uk: 'Сіль', pos: 'nouns' },
    { en: 'designer', ru: 'Дизайнер', uk: 'Дизайнер', pos: 'nouns' },
    { en: 'temperature', ru: 'Температура', uk: 'Температура', pos: 'nouns' },
  ],
  27: [
    { en: 'reply', ru: 'Отвечать', uk: 'Відповідати', pos: 'verbs' },
    { en: 'warn', ru: 'Предупреждать', uk: 'Попереджати', pos: 'verbs' },
    { en: 'announce', ru: 'Объявлять', uk: 'Оголошувати', pos: 'verbs' },
    { en: 'remind', ru: 'Напоминать', uk: 'Нагадувати', pos: 'verbs' },
    { en: 'complain', ru: 'Жаловаться', uk: 'Скаржитися', pos: 'verbs' },
    { en: 'admit', ru: 'Признавать', uk: 'Визнавати', pos: 'verbs' },
    { en: 'state', ru: 'Утверждать', uk: 'Стверджувати', pos: 'verbs' },
    { en: 'notice', ru: 'Замечать', uk: 'Помічати', pos: 'verbs' },
    { en: 'witness', ru: 'Свидетель', uk: 'Свідок', pos: 'nouns' },
    { en: 'instruction', ru: 'Инструкция', uk: 'Інструкція', pos: 'nouns' },
    { en: 'exhibition', ru: 'Выставка', uk: 'Виставка', pos: 'nouns' },
    { en: 'qualified', ru: 'Квалифицированный', uk: 'Кваліфікований', pos: 'adjectives' },
    { en: 'previously', ru: 'Ранее', uk: 'Раніше', pos: 'adverbs' },
  ],
  28: [
    { en: 'achieve', ru: 'Достигать', uk: 'Досягати', pos: 'verbs' },
    { en: 'introduce', ru: 'Представлять', uk: 'Представляти', pos: 'verbs' },
    { en: 'force', ru: 'Заставлять', uk: 'Змушувати', pos: 'verbs' },
    { en: 'decide', ru: 'Решать', uk: 'Вирішувати', pos: 'verbs' },
    { en: 'praise', ru: 'Хвалить', uk: 'Хвалити', pos: 'verbs' },
    { en: 'shave', ru: 'Бриться', uk: 'Голитися', pos: 'verbs' },
    { en: 'justify', ru: 'Оправдывать', uk: 'Виправдовувати', pos: 'verbs' },
    { en: 'provide', ru: 'Обеспечивать', uk: 'Забезпечувати', pos: 'verbs' },
    { en: 'treat', ru: 'Баловать', uk: 'Балувати', pos: 'verbs' },
    { en: 'fasten', ru: 'Пристегивать', uk: 'Пристібати', pos: 'verbs' },
    { en: 'control', ru: 'Контролировать', uk: 'Контролювати', pos: 'verbs' },
    { en: 'behave', ru: 'Вести себя', uk: 'Поводитися', pos: 'verbs' },
    { en: 'allow', ru: 'Позволять', uk: 'Дозволяти', pos: 'verbs' },
    { en: 'blame', ru: 'Винить', uk: 'Звинувачувати', pos: 'verbs' },
    { en: 'hurt', ru: 'Ранить', uk: 'Поранити', pos: 'irregular_verbs' },
    { en: 'wake', ru: 'Просыпаться', uk: 'Прокидатися', pos: 'irregular_verbs' },
    { en: 'ambitious', ru: 'Амбициозный', uk: 'Амбітний', pos: 'adjectives' },
    { en: 'challenging', ru: 'Сложный', uk: 'Складний', pos: 'adjectives' },
    { en: 'excellent', ru: 'Отличный', uk: 'Відмінний', pos: 'adjectives' },
    { en: 'digital', ru: 'Цифровой', uk: 'Цифровий', pos: 'adjectives' },
    { en: 'calm', ru: 'Спокойный', uk: 'Спокійний', pos: 'adjectives' },
    { en: 'sincere', ru: 'Искренний', uk: 'Щирий', pos: 'adjectives' },
    { en: 'distant', ru: 'Далекий', uk: 'Далекий', pos: 'adjectives' },
    { en: 'goal', ru: 'Цель', uk: 'Мета', pos: 'nouns' },
    { en: 'charity', ru: 'Благотворительность', uk: 'Благодійність', pos: 'nouns' },
    { en: 'blade', ru: 'Лезвие', uk: 'Лезо', pos: 'nouns' },
    { en: 'politician', ru: 'Политик', uk: 'Політик', pos: 'nouns' },
    { en: 'committee', ru: 'Комитет', uk: 'Комітет', pos: 'nouns' },
    { en: 'modesty', ru: 'Скромность', uk: 'Скромність', pos: 'nouns' },
    { en: 'volunteer', ru: 'Волонтер', uk: 'Волонтер', pos: 'nouns' },
    { en: 'campaign', ru: 'Кампания', uk: 'Кампанія', pos: 'nouns' },
    { en: 'seatbelt', ru: 'Ремень безопасности', uk: 'Пасок безпеки', pos: 'nouns' },
    { en: 'speech', ru: 'Выступление', uk: 'Виступ', pos: 'nouns' },
  ],
  29: [
    { en: 'trust', ru: 'Доверять', uk: 'Довіряти', pos: 'verbs' },
    { en: 'dwell', ru: 'Обитать', uk: 'Мешкати', pos: 'verbs' },
    { en: 'perform', ru: 'Исполнять', uk: 'Виконувати', pos: 'verbs' },
    { en: 'ignore', ru: 'Игнорировать', uk: 'Ігнорувати', pos: 'verbs' },
    { en: 'limit', ru: 'Ограничивать', uk: 'Обмежувати', pos: 'verbs' },
    { en: 'overcome', ru: 'Преодолевать', uk: 'Долати', pos: 'irregular_verbs' },
    { en: 'fly', ru: 'Летать', uk: 'Літати', pos: 'irregular_verbs' },
    { en: 'suburb', ru: 'Пригород', uk: 'Передмістя', pos: 'nouns' },
    { en: 'drought', ru: 'Засуха', uk: 'Посуха', pos: 'nouns' },
    { en: 'temple', ru: 'Храм', uk: 'Храм', pos: 'nouns' },
    { en: 'injury', ru: 'Травма', uk: 'Травма', pos: 'nouns' },
    { en: 'mentor', ru: 'Наставник', uk: 'Наставник', pos: 'nouns' },
    { en: 'factory', ru: 'Завод', uk: 'Завод', pos: 'nouns' },
    { en: 'appetizer', ru: 'Закуска', uk: 'Закуска', pos: 'nouns' },
    { en: 'award', ru: 'Награда', uk: 'Нагорода', pos: 'nouns' },
    { en: 'coast', ru: 'Побережье', uk: 'Узбережжя', pos: 'nouns' },
    { en: 'dispute', ru: 'Спор', uk: 'Суперечка', pos: 'nouns' },
    { en: 'theater', ru: 'Театр', uk: 'Театр', pos: 'nouns' },
    { en: 'sculpture', ru: 'Скульптура', uk: 'Скульптура', pos: 'nouns' },
    { en: 'marble', ru: 'Мрамор', uk: 'Мармур', pos: 'nouns' },
    { en: 'shelter', ru: 'Приют', uk: 'Притулок', pos: 'nouns' },
    { en: 'council', ru: 'Совет', uk: 'Рада', pos: 'nouns' },
    { en: 'kingdom', ru: 'Королевство', uk: 'Королівство', pos: 'nouns' },
    { en: 'victory', ru: 'Победа', uk: 'Перемога', pos: 'nouns' },
    { en: 'humble', ru: 'Скромный', uk: 'Скромний', pos: 'adjectives' },
    { en: 'organic', ru: 'Органический', uk: 'Органічний', pos: 'adjectives' },
    { en: 'fertile', ru: 'Плодородный', uk: 'Родючий', pos: 'adjectives' },
    { en: 'outstanding', ru: 'Выдающийся', uk: 'Видатний', pos: 'adjectives' },
    { en: 'decisive', ru: 'Решающий', uk: 'Вирішальний', pos: 'adjectives' },
  ],
  30: [
    { en: 'locate', ru: 'Располагаться', uk: 'Розташовуватися', pos: 'verbs' },
    { en: 'inspire', ru: 'Вдохновлять', uk: 'Надихати', pos: 'verbs' },
    { en: 'manage', ru: 'Управлять', uk: 'Управляти', pos: 'verbs' },
    { en: 'describe', ru: 'Описывать', uk: 'Описувати', pos: 'verbs' },
    { en: 'lead', ru: 'Вести', uk: 'Вести', pos: 'irregular_verbs' },
    { en: 'neighborhood', ru: 'Район', uk: 'Район', pos: 'nouns' },
    { en: 'tournament', ru: 'Турнир', uk: 'Турнір', pos: 'nouns' },
    { en: 'headquarters', ru: 'Штаб-квартира', uk: 'Штаб-квартира', pos: 'nouns' },
    { en: 'documentary', ru: 'Документальный фильм', uk: 'Документальний фільм', pos: 'nouns' },
    { en: 'candidate', ru: 'Кандидат', uk: 'Кандидат', pos: 'nouns' },
    { en: 'deadline', ru: 'Срок', uk: 'Дедлайн', pos: 'nouns' },
    { en: 'fluent', ru: 'Свободно владеющий', uk: 'Вільний', pos: 'adjectives' },
    { en: 'innovative', ru: 'Инновационный', uk: 'Інноваційний', pos: 'adjectives' },
    { en: 'globally', ru: 'Глобально', uk: 'Глобально', pos: 'adverbs' },
    { en: 'recently', ru: 'Недавно', uk: 'Нещодавно', pos: 'adverbs' },
  ],
  31: [
    { en: 'expect', ru: 'Ожидать', uk: 'Очікувати', pos: 'verbs' },
    { en: 'demand', ru: 'Требовать', uk: 'Вимагати', pos: 'verbs' },
    { en: 'conduct', ru: 'Проводить', uk: 'Проводити', pos: 'verbs' },
    { en: 'verify', ru: 'Проверять', uk: 'Перевіряти', pos: 'verbs' },
    { en: 'let', ru: 'Позволять', uk: 'Дозволяти', pos: 'irregular_verbs' },
    { en: 'shake', ru: 'Трясти', uk: 'Трусити', pos: 'irregular_verbs' },
    { en: 'carpenter', ru: 'Плотник', uk: 'Тесляр', pos: 'nouns' },
    { en: 'supplier', ru: 'Поставщик', uk: 'Постачальник', pos: 'nouns' },
    { en: 'cave', ru: 'Пещера', uk: 'Печера', pos: 'nouns' },
    { en: 'tenant', ru: 'Жилец', uk: 'Мешканець', pos: 'nouns' },
    { en: 'landlord', ru: 'Арендодатель', uk: 'Орендодавець', pos: 'nouns' },
    { en: 'thesis', ru: 'Диссертация', uk: 'Дисертація', pos: 'nouns' },
    { en: 'tremor', ru: 'Толчок', uk: 'Поштовх', pos: 'nouns' },
    { en: 'injection', ru: 'Инъекция', uk: 'Ін\'єкція', pos: 'nouns' },
    { en: 'forecast', ru: 'Прогноз', uk: 'Прогноз', pos: 'nouns' },
    { en: 'furious', ru: 'Разъяренный', uk: 'Розлючений', pos: 'adjectives' },
    { en: 'pale', ru: 'Бледный', uk: 'Блідий', pos: 'adjectives' },
    { en: 'nervous', ru: 'Нервный', uk: 'Нервовий', pos: 'adjectives' },
    { en: 'painless', ru: 'Безболезненный', uk: 'Безболісний', pos: 'adjectives' },
    { en: 'perfectly', ru: 'Идеально', uk: 'Ідеально', pos: 'adverbs' },
    { en: 'efficiently', ru: 'Эффективно', uk: 'Ефективно', pos: 'adverbs' },
  ],
  32: [
    { en: 'vacate', ru: 'Освобождать', uk: 'Звільняти', pos: 'verbs' },
    { en: 'refuse', ru: 'Отказываться', uk: 'Відмовлятися', pos: 'verbs' },
    { en: 'guarantee', ru: 'Гарантировать', uk: 'Гарантувати', pos: 'verbs' },
    { en: 'be', ru: 'Быть', uk: 'Бути', pos: 'irregular_verbs' },
    { en: 'cliff', ru: 'Скала', uk: 'Скеля', pos: 'nouns' },
    { en: 'goods', ru: 'Товары', uk: 'Товари', pos: 'nouns' },
    { en: 'intern', ru: 'Стажер', uk: 'Стажер', pos: 'nouns' },
    { en: 'testimony', ru: 'Показания', uk: 'Свідчення', pos: 'nouns' },
    { en: 'trial', ru: 'Судебный процесс', uk: 'Судовий процес', pos: 'nouns' },
    { en: 'dedication', ru: 'Преданность', uk: 'Відданість', pos: 'nouns' },
    { en: 'community', ru: 'Сообщество', uk: 'Громада', pos: 'nouns' },
    { en: 'negotiation', ru: 'Переговоры', uk: 'Переговори', pos: 'nouns' },
    { en: 'warning', ru: 'Предупреждение', uk: 'Попередження', pos: 'nouns' },
    { en: 'audience', ru: 'Аудитория', uk: 'Аудиторія', pos: 'nouns' },
    { en: 'structure', ru: 'Сооружение', uk: 'Споруда', pos: 'nouns' },
    { en: 'stranger', ru: 'Незнакомец', uk: 'Незнайомець', pos: 'nouns' },
    { en: 'obstacle', ru: 'Препятствие', uk: 'Перешкода', pos: 'nouns' },
    { en: 'conclusion', ru: 'Вывод', uk: 'Висновок', pos: 'nouns' },
    { en: 'tedious', ru: 'Скучный (утомительный)', uk: 'Нудний (втомлюючий)', pos: 'adjectives' },
    { en: 'steep', ru: 'Крутой', uk: 'Стрімкий', pos: 'adjectives' },
    { en: 'vital', ru: 'Жизненно важный', uk: 'Життєво важливий', pos: 'adjectives' },
    { en: 'confidential', ru: 'Конфиденциальный', uk: 'Конфіденційний', pos: 'adjectives' },
    { en: 'accurate', ru: 'Точный', uk: 'Точний', pos: 'adjectives' },
    { en: 'curious', ru: 'Любопытный', uk: 'Цікавий', pos: 'adjectives' },
    { en: 'incompetent', ru: 'Некомпетентный', uk: 'Некомпетентний', pos: 'adjectives' },
    { en: 'bold', ru: 'Смелый', uk: 'Сміливий', pos: 'adjectives' },
    { en: 'nimble', ru: 'Ловкий', uk: 'Спритний', pos: 'adjectives' },
    { en: 'irresponsible', ru: 'Безответственный', uk: 'Безвідповідальний', pos: 'adjectives' },
    { en: 'potential', ru: 'Потенциальный', uk: 'Потенційний', pos: 'adjectives' },
    { en: 'grateful', ru: 'Признательный', uk: 'Вдячний', pos: 'adjectives' },
    { en: 'accidentally', ru: 'Случайно', uk: 'Випадково', pos: 'adverbs' },
    { en: 'thoroughly', ru: 'Тщательно', uk: 'Ретельно', pos: 'adverbs' },
    { en: 'entirely', ru: 'Полностью', uk: 'Повністю', pos: 'adverbs' },
  ],
};

const groupByPOS = (words: Word[], lang: 'ru'|'uk') => {
  const labels = lang === 'uk' ? POS_LABELS_UK : POS_LABELS_RU;
  const map: Partial<Record<POS, Word[]>> = {};
  for (const w of words) {
    if (!map[w.pos]) map[w.pos] = [];
    map[w.pos]!.push(w);
  }
  return (['pronouns','verbs','irregular_verbs','adjectives','adverbs','nouns'] as POS[])
    .filter(k => map[k]?.length)
    .map(k => ({ title: labels[k], data: map[k]! }));
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

function buildCard(word: Word, roundIndex: number, all: Word[], lang: 'ru' | 'uk'): Card {
  const correctOption = word.en;
  const translation = lang === 'uk' ? word.uk : word.ru;
  const options = makeOptions(word, all);
  if (roundIndex === 1 && word.context) {
    return { word, options, correctOption, roundIndex, roundType: 'context', question: word.context };
  }
  return { word, options, correctOption, roundIndex, roundType: 'recognition', question: translation };
}

// ── Мини-гексагон ────────────────────────────────────────────────────────────
// Flat-top hex: flat edges at top/bottom, pointed left/right
function MiniHex({ filled, partial, size = 16 }: { filled: boolean; partial?: boolean; size?: number }) {
  const { theme: t } = useTheme();
  const w     = size;
  const h     = w * 0.866;  // √3/2
  const tip   = w / 4;
  const mid   = w / 2;
  const color = filled ? t.correct : partial ? t.correct + '55' : t.bgSurface2;
  return (
    <View style={{ flexDirection: 'row', width: w, height: h }}>
      <View style={{ width: 0, height: 0, borderTopWidth: h/2, borderBottomWidth: h/2, borderRightWidth: tip, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: color, marginRight: -1 }} />
      <View style={{ width: mid + 2, height: h, backgroundColor: color }} />
      <View style={{ width: 0, height: 0, borderTopWidth: h/2, borderBottomWidth: h/2, borderLeftWidth: tip, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color, marginLeft: -1 }} />
    </View>
  );
}

// ── ТРЕНИРОВКА ───────────────────────────────────────────────────────────────
function Training({ words, storageKey, lang, initialLearned, initialCounts, onCountUpdate }: { words:Word[]; storageKey:string; lang:'ru'|'uk'; initialLearned:string[]; initialCounts:Record<string,number>; onCountUpdate:(word:string, count:number)=>void }) {
  const { theme:t, f } = useTheme();
  const { s } = useLang();
  const router = useRouter();
  const ws = s.words;

  // Состояние прогресса слов (сколько раундов пройдено)
  const [counts, setCounts] = useState<Record<string,number>>({ ...initialCounts });

  const [queue, setQueue] = useState<Card[]>(() => {
    const notLearned = words.filter(w => !initialLearned.includes(w.en));
    const pool = notLearned.length > 0 ? notLearned : words;
    // Строим ВСЕ раунды для всех слов и перемешиваем полностью
    const cards: Card[] = [];
    for (const w of pool) {
      const done = Math.min(initialCounts[w.en] ?? 0, REQUIRED);
      for (let r = done; r < REQUIRED; r++) {
        cards.push(buildCard(w, r, pool, lang));
      }
    }
    return shuffle(cards);
  });
  const [qIdx,       setQIdx]       = useState(0);
  const [chosen,     setChosen]     = useState<string|null>(null);
  const [dotCount,   setDotCount]   = useState(0); // кружочки – обновляются сразу
  const [totalPts,   setTotalPts]   = useState(0);
  const [learnedCnt, setLearnedCnt] = useState(initialLearned.length);
  const [userName,   setUserName]   = useState('');
  const [hapticsOn,  setHapticsOn]  = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [allDone,    setAllDone]    = useState(false);
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const [xpToastAmount, setXpToastAmount] = useState(3);

  const xpAnim = useRef(new Animated.ValueXY({ x: 0, y: 60 })).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const cardShownAt = useRef<number>(Date.now());

  const showXpToast = (amount: number = 3) => {
    setXpToastAmount(amount);
    xpAnim.setValue({ x: 0, y: 60 });
    xpOpacity.setValue(0);
    setXpToastVisible(true);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(xpAnim, { toValue: { x: 0, y: 0 }, duration: 200, useNativeDriver: true }),
        Animated.timing(xpOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(400),
      Animated.timing(xpOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setXpToastVisible(false));
  };

  // Блокировка: не даём запустить обработку дважды
  const locked = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if(n) setUserName(n); });
    loadSettings().then(s => { setHapticsOn(s.haptics); setSpeechRate(s.speechRate ?? 1.0); });
  }, []);

  const current: Card | undefined = queue[qIdx % Math.max(queue.length, 1)];
  const prevCardKeyRef = React.useRef('');
  React.useEffect(() => {
    const key = current ? `${current.word.en}:${current.roundIndex}` : '';
    if (key && key !== prevCardKeyRef.current) {
      prevCardKeyRef.current = key;
      setDotCount(counts[current!.word.en] ?? 0);
      cardShownAt.current = Date.now();
    }
  }, [current?.word.en, current?.roundIndex]);

  const handleChoice = async (opt: string) => {
    if (locked.current || chosen !== null || !current) return;
    locked.current = true;

    setChosen(opt);
    const isRight = opt === current.correctOption;
    if (isRight) setDotCount(c => Math.min(c + 1, REQUIRED));

    Speech.speak(current.word.en, { language: 'en-US', rate: speechRate });
    if (!isRight) {
      try { if(hapticsOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }

    setTimeout(async () => {
      const newQueue = [...queue];

      if (isRight) {
        const prevCount = counts[current.word.en] ?? 0;
        const newCount = prevCount + 1;
        const newCounts = { ...counts, [current.word.en]: newCount };
        setCounts(newCounts);
        onCountUpdate(current.word.en, newCount);

        // Сохраняем полный объект counts напрямую — без read-modify-write (нет race condition)
        AsyncStorage.setItem(storageKey + '_words', JSON.stringify(newCounts));

        // Удаляем текущую карточку из очереди
        newQueue.splice(qIdx % newQueue.length, 1);

        // +3 XP за каждый правильный ответ
        if (userName) {
          registerXP(POINTS_PER_CORRECT, 'vocabulary_learned', userName, lang);
          setTotalPts(p => p + POINTS_PER_CORRECT);
        }
        showXpToast(POINTS_PER_CORRECT);

        if (newCount >= REQUIRED) {
          // Слово выучено — убираем все оставшиеся карточки этого слова из очереди
          const finalQ = newQueue.filter(c => c.word.en !== current.word.en);
          const newLearned = Math.min(learnedCnt + 1, words.length);
          updateMultipleTaskProgress([{ type: 'words_learned' }, { type: 'daily_active' }]);
          showXpToast(POINTS_PER_LEARNED);
          if (userName) {
            try { await registerXP(POINTS_PER_LEARNED, 'vocabulary_learned', userName, lang); } catch {}
            setTotalPts(p => p + POINTS_PER_LEARNED);
          }
          if (finalQ.length === 0) {
            setLearnedCnt(newLearned); setQueue(finalQ); setAllDone(true);
            setChosen(null); locked.current = false; return;
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
        // Ошибка — перемещаем карточку в случайную позицию (не сразу)
        const resetCard = buildCard(current.word, current.roundIndex, words, lang);
        newQueue.splice(qIdx % newQueue.length, 1);
        const rem = newQueue.length;
        const gap = Math.min(3, rem);
        const insertAt = rem <= gap ? rem : gap + Math.floor(Math.random() * (rem - gap + 1));
        newQueue.splice(insertAt, 0, resetCard);
        setQueue(newQueue);
        setQIdx(qIdx % newQueue.length);
      }

      setChosen(null);
      locked.current = false;
    }, 900);
  };

  const startPractice = () => {
    // Пересобираем очередь со ВСЕМИ словами — прогресс не меняем
    const cards: Card[] = [];
    for (const w of words) {
      for (let r = 0; r < REQUIRED; r++) {
        cards.push(buildCard(w, r, words, lang));
      }
    }
    setQueue(shuffle(cards));
    setQIdx(0);
    setChosen(null);
    setLearnedCnt(0);
    setAllDone(false);
    locked.current = false;
  };

  if (allDone || queue.length === 0) return (
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
        <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '700' }}>{lang === 'uk' ? '← До уроку' : '← К уроку'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ backgroundColor: t.bgCard, paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        onPress={() => {
          hapticTap();
          Alert.alert(
            lang === 'uk' ? 'Повторення' : 'Повторение',
            lang === 'uk'
              ? 'Прогрес збережено. Це просто тренування — виучені слова не скинуться.'
              : 'Прогресс сохранён. Это просто тренировка — выученные слова не сбросятся.',
            [
              { text: lang === 'uk' ? 'Відміна' : 'Отмена', style: 'cancel' },
              { text: lang === 'uk' ? 'Повторити' : 'Повторить', onPress: startPractice },
            ]
          );
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh-outline" size={18} color={t.textSecond} />
        <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '600' }}>{lang === 'uk' ? 'Повторити' : 'Повторить'}</Text>
      </TouchableOpacity>
    </View>
  );

  if (!current) return null;

  const displayLearned = Math.min(learnedCnt, words.length);

  const ROUND_CONFIG: Record<RoundType, { label: string; color: string; bg: string; icon: string }> = {
    recognition: {
      label: lang === 'uk' ? 'Впізнавання' : 'Узнавание',
      color: t.correct,
      bg: t.correctBg,
      icon: 'eye-outline',
    },
    context: {
      label: lang === 'uk' ? 'Контекст' : 'Контекст',
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
              {lang === 'uk' ? 'Вставте слово у речення:' : 'Вставьте слово в предложение:'}
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
              {lang === 'uk' ? 'Оберіть англійський переклад:' : 'Выберите английский перевод:'}
            </Text>
            <Text style={{ color:t.textPrimary, fontSize:38, fontWeight:'300', textAlign:'center', lineHeight:46 }}>
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

      {/* XP Toast */}
      {xpToastVisible && (
        <Animated.View pointerEvents="none" style={{ position:'absolute', top:100, alignSelf:'center', backgroundColor:'#FFC800', borderRadius:20, paddingHorizontal:20, paddingVertical:10, transform:[{translateY:xpAnim.y}], opacity:xpOpacity, zIndex:999 }}>
          <Text style={{ color:'#000', fontWeight:'700', fontSize:16 }}>+{xpToastAmount} XP</Text>
        </Animated.View>
      )}

    </View>
  );
}

// ── СПИСОК ───────────────────────────────────────────────────────────────────
function WordList({ words, learnedCounts, lang, speechRate, onStartTraining }: { words:Word[]; learnedCounts:Record<string,number>; lang:'ru'|'uk'; speechRate:number; onStartTraining?: () => void; }) {
  const { theme:t, f } = useTheme();
  const sections = groupByPOS(words, lang);
  const isUK = lang === 'uk';

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.en}
      contentContainerStyle={{ paddingBottom:30 }}
      ListHeaderComponent={onStartTraining ? (
        <TouchableOpacity
          onPress={onStartTraining}
          style={{ marginHorizontal:16, marginTop:14, marginBottom:4, backgroundColor:t.bgCard, borderRadius:14, paddingVertical:13, alignItems:'center', borderWidth:1, borderColor:t.border, flexDirection:'row', justifyContent:'center', gap:8 }}
        >
          <Ionicons name="pencil-outline" size={18} color={t.textSecond} />
          <Text style={{ color:t.textSecond, fontSize:f.bodyLg, fontWeight:'600' }}>{isUK ? 'Почати тренування' : 'Начать тренировку'}</Text>
        </TouchableOpacity>
      ) : null}
      renderSectionHeader={({ section }) => (
        <View style={{ backgroundColor:t.bgPrimary, paddingHorizontal:20, paddingTop:16, paddingBottom:8 }}>
          <Text style={{ color:t.textMuted, fontSize:f.label, fontWeight:'600', textTransform:'uppercase', letterSpacing:1 }}>
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item }) => {
        const count = learnedCounts[item.en] ?? 0;
        const learned = count >= REQUIRED;
        const tr = lang === 'uk' ? item.uk : item.ru;
        return (
          <View
            style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingVertical:14, borderBottomWidth:0.5, borderBottomColor:t.border }}
          >
            <View style={{ flexDirection:'row', gap:3, marginRight:12, alignItems:'center' }}>
              {[0,1,2].map(i => (
                <MiniHex key={i} filled={count > i} partial={count > i && count < REQUIRED} size={11} />
              ))}
            </View>
            <TouchableOpacity style={{ flex:1 }} onPress={() => Speech.speak(item.en, { language: 'en-US', rate: speechRate })}>
              <Text style={{ color:t.textPrimary, fontSize:f.bodyLg }}>{item.en}</Text>
            </TouchableOpacity>
            <Text style={{ color:t.textMuted, fontSize:f.body, marginRight:8 }}>{tr}</Text>
            <AddToFlashcard en={item.en} ru={item.ru} uk={item.uk} source="word" />
          </View>
        );
      }}
    />
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────────
export default function LessonWords() {
  const router = useRouter();
  const { theme:t, f } = useTheme();
  const { s, lang } = useLang();
  const { id } = useLocalSearchParams<{ id:string }>();
  const lessonId = parseInt(id || '1', 10);
  const words = WORDS_BY_LESSON[lessonId] || WORDS_BY_LESSON[1];
  const storageKey = `lesson${lessonId}`;
  const ws = s.words;

  const [tab, setTab]              = useState<'train'|'list'>('train');
  const [learnedCounts, setLearnedCounts] = useState<Record<string,number>>({});
  const learnedWords = Object.keys(learnedCounts).filter(k => learnedCounts[k] >= REQUIRED);
  const [listSpeechRate, setListSpeechRate] = useState(1.0);

  useEffect(() => {
    AsyncStorage.getItem(storageKey + '_words').then(v => {
      if (!v) return;
      const data = JSON.parse(v);
      if (Array.isArray(data)) {
        // старый формат string[] → конвертируем
        const counts: Record<string,number> = {};
        data.forEach((w: string) => { counts[w] = REQUIRED; });
        setLearnedCounts(counts);
      } else {
        setLearnedCounts(data);
      }
    });
    loadSettings().then(cfg => setListSpeechRate(cfg.speechRate ?? 1.0));
  }, [storageKey]);

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:15, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{ color:t.textPrimary, fontSize:f.h2, fontWeight:'600' }}>{ws.title(lessonId)}</Text>
        <View style={{ width:28 }}/>
      </View>

      <View style={{ flex:1 }}>
        {tab === 'train'
          ? <Training
            words={words}
            storageKey={storageKey}
            lang={lang}
            initialLearned={Object.keys(learnedCounts).filter(k => learnedCounts[k] >= REQUIRED)}
            initialCounts={learnedCounts}
            onCountUpdate={(word, count) => setLearnedCounts(prev => ({ ...prev, [word]: count }))}
          />
          : <WordList words={words} learnedCounts={learnedCounts} lang={lang} speechRate={listSpeechRate} onStartTraining={() => setTab('train')} />
        }
      </View>

      <View style={{ flexDirection:'row', borderTopWidth:0.5, borderTopColor:t.border }}>
        {(['train','list'] as const).map(key => {
          const isActive = tab === key;
          const label = key === 'train'
            ? (lang === 'uk' ? 'Повторення' : 'Повторение')
            : (lang === 'uk' ? 'Словник' : 'Словарь');
          const icon  = key === 'train'
            ? (isActive ? 'pencil'  : 'pencil-outline')
            : (isActive ? 'list'    : 'list-outline');
          return (
            <TouchableOpacity key={key}
              style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:14, gap:8, borderTopWidth:isActive?2:0, borderTopColor:t.textSecond }}
              onPress={() => setTab(key)}
            >
              <Ionicons name={icon as any} size={20} color={isActive?t.textSecond:t.textGhost}/>
              <Text style={{ color:isActive?t.textSecond:t.textGhost, fontSize:f.body, fontWeight:'500' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}

export const LESSONS_WITH_WORDS: Set<number> = new Set(Object.keys(WORDS_BY_LESSON).map(Number));
export const WORD_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.entries(WORDS_BY_LESSON).map(([k, v]) => [Number(k), v.length])
);
