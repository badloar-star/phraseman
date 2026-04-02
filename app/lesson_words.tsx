import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
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
const POINTS_PER_WORD = 3;

type POS = 'pronouns'|'verbs'|'irregular_verbs'|'adjectives'|'adverbs'|'nouns';
interface Word { en:string; ru:string; uk:string; pos:POS; }

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
    { en: 'ready', ru: 'Готовый', uk: 'Готовий', pos: 'adjectives' },
    { en: 'not', ru: 'Не', uk: 'Не', pos: 'adverbs' },
    // Phrases 6-10
    { en: 'home', ru: 'Дома', uk: 'Вдома', pos: 'nouns' },
    { en: 'doctor', ru: 'Врач', uk: 'Лікар', pos: 'nouns' },
    { en: 'scary', ru: 'Страшный', uk: 'Страшний', pos: 'adjectives' },
    { en: 'busy', ru: 'Занятый', uk: 'Зайнятий', pos: 'adjectives' },
    { en: 'alone', ru: 'Один (одинокий)', uk: 'Один (самотній)', pos: 'adjectives' },
    // Phrases 11-15
    { en: 'danger', ru: 'Опасность', uk: 'Небезпека', pos: 'nouns' },
    { en: 'angry', ru: 'Сердитый (злой)', uk: 'Сердитий (злий)', pos: 'adjectives' },
    { en: 'married', ru: 'Замужняя (женатый)', uk: 'Заміжня (одружений)', pos: 'adjectives' },
    { en: 'open', ru: 'Открытый', uk: 'Відкритий', pos: 'adjectives' },
    // Phrases 16-20
    { en: 'list', ru: 'Список', uk: 'Список', pos: 'nouns' },
    { en: 'free', ru: 'Бесплатный', uk: 'Безкоштовний', pos: 'adjectives' },
    { en: 'right', ru: 'Правый (верный)', uk: 'Правий (вірний)', pos: 'adjectives' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', pos: 'adverbs' },
    // Phrases 21-25
    { en: 'joke', ru: 'Шутка', uk: 'Жарт', pos: 'nouns' },
    { en: 'okay', ru: 'В порядке', uk: 'В порядку', pos: 'adjectives' },
    { en: 'taxi', ru: 'Такси', uk: 'Таксі', pos: 'nouns' },
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
    { en: 'important', ru: 'Важный', uk: 'Важливо', pos: 'adjectives' },
    { en: 'way', ru: 'Путь (дорога)', uk: 'Шлях (дорога)', pos: 'nouns' },
    { en: 'sick', ru: 'Больной', uk: 'Хворий', pos: 'adjectives' },
    { en: 'car', ru: 'Машина', uk: 'Машина', pos: 'nouns' },
    // Phrases 41-45
    { en: 'guilty', ru: 'Виноватый', uk: 'Винний', pos: 'adjectives' },
    { en: 'elevator', ru: 'Лифт', uk: 'Ліфт', pos: 'nouns' },
    { en: 'dangerous', ru: 'Опасный', uk: 'Небезпечний', pos: 'adjectives' },
    { en: 'building', ru: 'Здание', uk: 'Будівля', pos: 'nouns' },
    { en: 'mean', ru: 'Злой (подлый)', uk: 'Злий (підлий)', pos: 'adjectives' },
    // Phrases 46-50
    { en: 'serious', ru: 'Серьезный', uk: 'Серйозний', pos: 'adjectives' },
    { en: 'together', ru: 'Вместе', uk: 'Разом', pos: 'adverbs' },
  ],
  3: [
    { en: 'work', ru: 'Работать', uk: 'Працювати', pos: 'verbs' },
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
    { en: 'home', ru: 'Домой', uk: 'Додому', pos: 'nouns' },
    { en: 'letter', ru: 'Письмо', uk: 'Лист', pos: 'nouns' },
    { en: 'dish', ru: 'Посуда', uk: 'Посуд', pos: 'nouns' },
    { en: 'car', ru: 'Машина', uk: 'Машина', pos: 'nouns' },
    { en: 'pain', ru: 'Боль', uk: 'Біль', pos: 'nouns' },
    { en: 'help', ru: 'Помощь', uk: 'Допомога', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', pos: 'nouns' },
    { en: 'glasses', ru: 'Очки', uk: 'Окуляри', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', pos: 'nouns' },
    { en: 'internet', ru: 'Интернет', uk: 'Інтернет', pos: 'nouns' },
    { en: 'rest', ru: 'Отдых', uk: 'Відпочинок', pos: 'nouns' },
    { en: 'terms', ru: 'Условия', uk: 'Умови', pos: 'nouns' },
    { en: 'problem', ru: 'Проблема', uk: 'Проблема', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', pos: 'nouns' },
    { en: 'taxi', ru: 'Такси', uk: 'Таксі', pos: 'nouns' },
    { en: 'friend', ru: 'Друг', uk: 'Друг', pos: 'nouns' },
    { en: 'late', ru: 'Поздно', uk: 'Пізно', pos: 'adverbs' },
    { en: 'often', ru: 'Часто', uk: 'Часто', pos: 'adverbs' },
  ],
  4: [
    { en: 'drink', ru: 'Пить', uk: 'Пити', pos: 'verbs' },
    { en: 'listen', ru: 'Слушать', uk: 'Слухати', pos: 'verbs' },
    { en: 'smoke', ru: 'Курить', uk: 'Курити', pos: 'verbs' },
    { en: 'eat', ru: 'Есть', uk: 'Їсти', pos: 'verbs' },
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', pos: 'verbs' },
    { en: 'live', ru: 'Жить', uk: 'Жити', pos: 'verbs' },
    { en: 'work', ru: 'Работать', uk: 'Працювати', pos: 'verbs' },
    { en: 'know', ru: 'Знать', uk: 'Знати', pos: 'verbs' },
    { en: 'remember', ru: 'Помнить', uk: 'Пам\'ятати', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', pos: 'verbs' },
    { en: 'use', ru: 'Использовать', uk: 'Використовувати', pos: 'verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', pos: 'verbs' },
    { en: 'wear', ru: 'Носить', uk: 'Носити', pos: 'verbs' },
    { en: 'pay', ru: 'Платить', uk: 'Платити', pos: 'verbs' },
    { en: 'like', ru: 'Любить (нравиться)', uk: 'Любити (подобатися)', pos: 'verbs' },
    { en: 'sell', ru: 'Продавать', uk: 'Продавати', pos: 'verbs' },
    { en: 'drive', ru: 'Водить', uk: 'Водити', pos: 'verbs' },
    { en: 'lose', ru: 'Терять', uk: 'Втрачати', pos: 'verbs' },
    { en: 'change', ru: 'Менять', uk: 'Змінювати', pos: 'verbs' },
    { en: 'feel', ru: 'Чувствовать', uk: 'Відчувати', pos: 'verbs' },
    { en: 'spend', ru: 'Тратить', uk: 'Витрачати', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', pos: 'verbs' },
    { en: 'believe', ru: 'Верить', uk: 'Вірити', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', pos: 'verbs' },
    { en: 'break', ru: 'Нарушать (ломать)', uk: 'Порушувати (ламати)', pos: 'verbs' },
    { en: 'waste', ru: 'Тратить впустую', uk: 'Витрачати марно', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', pos: 'verbs' },
    { en: 'take', ru: 'Брать', uk: 'Брати', pos: 'verbs' },
    { en: 'close', ru: 'Закрывать', uk: 'Зачиняти', pos: 'verbs' },
    { en: 'ask', ru: 'Просить (спрашивать)', uk: 'Просити (питати)', pos: 'verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', pos: 'verbs' },
    { en: 'milk', ru: 'Молоко', uk: 'Молоко', pos: 'nouns' },
    { en: 'sugar', ru: 'Сахар', uk: 'Цукор', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', pos: 'nouns' },
    { en: 'meat', ru: 'Мясо', uk: 'М\'ясо', pos: 'nouns' },
    { en: 'number', ru: 'Номер', uk: 'Номер', pos: 'nouns' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', pos: 'nouns' },
    { en: 'problem', ru: 'Проблема', uk: 'Проблема', pos: 'nouns' },
    { en: 'mask', ru: 'Маска', uk: 'Маска', pos: 'nouns' },
    { en: 'food', ru: 'Еда', uk: 'Їжа', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', pos: 'nouns' },
    { en: 'risk', ru: 'Риск', uk: 'Ризик', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', pos: 'nouns' },
    { en: 'rule', ru: 'Правило', uk: 'Правило', pos: 'nouns' },
    { en: 'bus', ru: 'Автобус', uk: 'Автобус', pos: 'nouns' },
    { en: 'hope', ru: 'Надежда', uk: 'Надія', pos: 'nouns' },
    { en: 'opinion', ru: 'Мнение', uk: 'Думка', pos: 'nouns' },
    { en: 'fear', ru: 'Страх', uk: 'Страх', pos: 'nouns' },
    { en: 'money', ru: 'Деньги', uk: 'Гроші', pos: 'nouns' },
    { en: 'advice', ru: 'Совет', uk: 'Порада', pos: 'nouns' },
    { en: 'detail', ru: 'Деталь', uk: 'Деталь', pos: 'nouns' },
    { en: 'ad', ru: 'Рекламное объявление', uk: 'Рекламне оголошення', pos: 'nouns' },
    { en: 'breakfast', ru: 'Завтрак', uk: 'Сніданок', pos: 'nouns' },
    { en: 'law', ru: 'Закон', uk: 'Закон', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', pos: 'nouns' },
    { en: 'news', ru: 'Новости', uk: 'Новини', pos: 'nouns' },
    { en: 'tie', ru: 'Галстук', uk: 'Краватка', pos: 'nouns' },
    { en: 'window', ru: 'Окно', uk: 'Вікно', pos: 'nouns' },
    { en: 'wine', ru: 'Вино', uk: 'Вино', pos: 'nouns' },
    { en: 'fine', ru: 'Штраф', uk: 'Штраф', pos: 'nouns' },
    { en: 'help', ru: 'Помощь', uk: 'Допомога', pos: 'nouns' },
    { en: 'juice', ru: 'Сок', uk: 'Сік', pos: 'nouns' },
    { en: 'fish', ru: 'Рыба', uk: 'Риба', pos: 'nouns' },
    { en: 'TV', ru: 'Телевизор', uk: 'Телевізор', pos: 'nouns' },
    { en: 'map', ru: 'Карта', uk: 'Карта', pos: 'nouns' },
    { en: 'bread', ru: 'Хлеб', uk: 'Хліб', pos: 'nouns' },
    { en: 'watch', ru: 'Наручные часы', uk: 'Наручний годинник', pos: 'nouns' },
    { en: 'alcohol', ru: 'Алкоголь', uk: 'Алкоголь', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', pos: 'nouns' },
    { en: 'spicy', ru: 'Острый (о еде)', uk: 'Гострий (про їжу)', pos: 'adjectives' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', pos: 'adverbs' },
  ],
  5: [
    { en: 'drink', ru: 'Пить', uk: 'Пити', pos: 'verbs' },
    { en: 'live', ru: 'Жить', uk: 'Жити', pos: 'verbs' },
    { en: 'work', ru: 'Работать', uk: 'Працювати', pos: 'verbs' },
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', pos: 'verbs' },
    { en: 'know', ru: 'Знать', uk: 'Знати', pos: 'verbs' },
    { en: 'cost', ru: 'Стоить', uk: 'Коштувати', pos: 'verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', pos: 'verbs' },
    { en: 'drive', ru: 'Водить', uk: 'Водити', pos: 'verbs' },
    { en: 'eat', ru: 'Есть', uk: 'Їсти', pos: 'verbs' },
    { en: 'feel', ru: 'Чувствовать', uk: 'Відчувати', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', pos: 'verbs' },
    { en: 'go', ru: 'Идти', uk: 'Йти', pos: 'verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', pos: 'verbs' },
    { en: 'speak', ru: 'Говорить', uk: 'Говорити', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', pos: 'verbs' },
    { en: 'lose', ru: 'Терять', uk: 'Втрачати', pos: 'verbs' },
    { en: 'pay', ru: 'Платить', uk: 'Платити', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', pos: 'verbs' },
    { en: 'sell', ru: 'Продавать', uk: 'Продавати', pos: 'verbs' },
    { en: 'sing', ru: 'Петь', uk: 'Співати', pos: 'verbs' },
    { en: 'sleep', ru: 'Спать', uk: 'Спати', pos: 'verbs' },
    { en: 'take', ru: 'Брать', uk: 'Брати', pos: 'verbs' },
    { en: 'wear', ru: 'Носить', uk: 'Носити', pos: 'verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', pos: 'verbs' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', pos: 'nouns' },
    { en: 'English', ru: 'Английский язык', uk: 'Англійська мова', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', pos: 'nouns' },
    { en: 'money', ru: 'Деньги', uk: 'Гроші', pos: 'nouns' },
    { en: 'computer', ru: 'Компьютер', uk: 'Комп\'ютер', pos: 'nouns' },
    { en: 'mask', ru: 'Маска', uk: 'Маска', pos: 'nouns' },
    { en: 'code', ru: 'Код', uk: 'Код', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', pos: 'nouns' },
    { en: 'card', ru: 'Карта', uk: 'Картка', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', pos: 'nouns' },
    { en: 'commission', ru: 'Комиссия', uk: 'Комісія', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', pos: 'nouns' },
    { en: 'room', ru: 'Номер', uk: 'Номер', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', pos: 'nouns' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', pos: 'nouns' },
    { en: 'pizza', ru: 'Пицца', uk: 'Піца', pos: 'nouns' },
    { en: 'vegetables', ru: 'Овощи', uk: 'Овочі', pos: 'nouns' },
    { en: 'tea', ru: 'Чай', uk: 'Чай', pos: 'nouns' },
    { en: 'job', ru: 'Работа', uk: 'Робота', pos: 'nouns' },
    { en: 'difference', ru: 'Разница', uk: 'Різниця', pos: 'nouns' },
    { en: 'mistake', ru: 'Ошибка', uk: 'Помилка', pos: 'nouns' },
    { en: 'risk', ru: 'Риск', uk: 'Ризик', pos: 'nouns' },
    { en: 'luck', ru: 'Удача', uk: 'Удача', pos: 'nouns' },
    { en: 'noise', ru: 'Шум', uk: 'Шум', pos: 'nouns' },
    { en: 'tax', ru: 'Налог', uk: 'Податок', pos: 'nouns' },
    { en: 'tomorrow', ru: 'Завтра', uk: 'Завтра', pos: 'adverbs' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', pos: 'adverbs' },
    { en: 'well', ru: 'Хорошо', uk: 'Добре', pos: 'adverbs' },
    { en: 'inside', ru: 'Внутрь', uk: 'Всередину', pos: 'adverbs' },
    { en: 'correctly', ru: 'Правильно', uk: 'Правильно', pos: 'adverbs' },
    { en: 'enough', ru: 'Достаточно', uk: 'Достатньо', pos: 'adverbs' },
  ],
  6: [
    { en: 'live', ru: 'Жить', uk: 'Жити', pos: 'verbs' },
    { en: 'eat', ru: 'Есть', uk: 'Їсти', pos: 'verbs' },
    { en: 'start', ru: 'Начинать', uk: 'Починати', pos: 'verbs' },
    { en: 'cry', ru: 'Плакать', uk: 'Плакати', pos: 'verbs' },
    { en: 'work', ru: 'Работать', uk: 'Працювати', pos: 'verbs' },
    { en: 'cost', ru: 'Стоить', uk: 'Коштувати', pos: 'verbs' },
    { en: 'drink', ru: 'Пить', uk: 'Пити', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', pos: 'verbs' },
    { en: 'wait', ru: 'Ждать', uk: 'Чекати', pos: 'verbs' },
    { en: 'pronounce', ru: 'Произносить', uk: 'Вимовляти', pos: 'verbs' },
    { en: 'go', ru: 'Идти', uk: 'Йти', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', pos: 'verbs' },
    { en: 'come', ru: 'Приходить', uk: 'Приходити', pos: 'verbs' },
    { en: 'close', ru: 'Закрывать', uk: 'Зачиняти', pos: 'verbs' },
    { en: 'pay', ru: 'Платить', uk: 'Платити', pos: 'verbs' },
    { en: 'open', ru: 'Открывать', uk: 'Відчиняти', pos: 'verbs' },
    { en: 'sign', ru: 'Подписывать', uk: 'Підписувати', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Відправляти', pos: 'verbs' },
    { en: 'do', ru: 'Делать', uk: 'Робити', pos: 'verbs' },
    { en: 'want', ru: 'Хотеть', uk: 'Хотіти', pos: 'verbs' },
    { en: 'leave', ru: 'Уходить (покидать)', uk: 'Йти (покидати)', pos: 'verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', pos: 'verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', pos: 'verbs' },
    { en: 'keep', ru: 'Хранить (держать)', uk: 'Зберігати (тримати)', pos: 'verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', pos: 'verbs' },
    { en: 'carry', ru: 'Носить (в руках/при себе)', uk: 'Носити (в руках/при собі)', pos: 'verbs' },
    { en: 'ship', ru: 'Отправлять (груз/посылку)', uk: 'Відправляти (вантаж/посилку)', pos: 'verbs' },
    { en: 'meet', ru: 'Встречать', uk: 'Зустрічати', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', pos: 'verbs' },
    { en: 'ask', ru: 'Просить (с предлогом for)', uk: 'Просити', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', pos: 'verbs' },
    { en: 'wear', ru: 'Носить (одежду)', uk: 'Носити (одяг)', pos: 'verbs' },
    { en: 'book', ru: 'Бронировать', uk: 'Бронювати', pos: 'verbs' },
    { en: 'speak', ru: 'Говорить', uk: 'Говорити', pos: 'verbs' },
    { en: 'put', ru: 'Класть', uk: 'Класти', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', pos: 'verbs' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', pos: 'nouns' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', pos: 'nouns' },
    { en: 'window', ru: 'Окно', uk: 'Вікно', pos: 'nouns' },
    { en: 'home', ru: 'Дом (домой)', uk: 'Дім (додому)', pos: 'nouns' },
    { en: 'report', ru: 'Отчет', uk: 'Звіт', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', pos: 'nouns' },
    { en: 'exit', ru: 'Выход', uk: 'Вихід', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', pos: 'nouns' },
    { en: 'parcel', ru: 'Посылка', uk: 'Посилка', pos: 'nouns' },
    { en: 'guest', ru: 'Гость', uk: 'Гість', pos: 'nouns' },
    { en: 'help', ru: 'Помощь', uk: 'Допомога', pos: 'nouns' },
    { en: 'mail', ru: 'Почта', uk: 'Пошта', pos: 'nouns' },
    { en: 'groceries', ru: 'Продукты (бакалея)', uk: 'Продукти', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча', uk: 'Зустріч', pos: 'nouns' },
    { en: 'luggage', ru: 'Багаж', uk: 'Багаж', pos: 'nouns' },
    { en: 'way', ru: 'Путь (дорога)', uk: 'Шлях (дорога)', pos: 'nouns' },
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
    { en: 'do', ru: 'Делать', uk: 'Робити', pos: 'verbs' },
    { en: 'does', ru: 'Делает', uk: 'Робит', pos: 'verbs' },
    { en: 'insurance', ru: 'Страховка', uk: 'Страховка', pos: 'nouns' },
    { en: 'driver', ru: 'Водитель', uk: 'Водій', pos: 'nouns' },
    { en: 'license', ru: 'Лицензия', uk: 'Ліцензія', pos: 'nouns' },
    { en: 'free', ru: 'Свободный', uk: 'Вільний', pos: 'adjectives' },
    { en: 'time', ru: 'Время', uk: 'Час', pos: 'nouns' },
    { en: 'allergy', ru: 'Аллергия', uk: 'Алергія', pos: 'nouns' },
    { en: 'reservation', ru: 'Бронирование', uk: 'Бронювання', pos: 'nouns' },
    { en: 'lighter', ru: 'Зажигалка', uk: 'Запальничка', pos: 'nouns' },
    { en: 'pass', ru: 'Пропуск', uk: 'Перепустка', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', pos: 'nouns' },
    { en: 'tablet', ru: 'Планшет', uk: 'Планшет', pos: 'nouns' },
    { en: 'change', ru: 'Сдача', uk: 'Решта', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядка', uk: 'Зарядка', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', pos: 'nouns' },
    { en: 'menu', ru: 'Меню', uk: 'Меню', pos: 'nouns' },
    { en: 'device', ru: 'Устройство', uk: 'Пристрій', pos: 'nouns' },
    { en: 'discount', ru: 'Скидка', uk: 'Знижка', pos: 'nouns' },
    { en: 'city', ru: 'Город', uk: 'Місто', pos: 'nouns' },
    { en: 'map', ru: 'Карта', uk: 'Карта', pos: 'nouns' },
    { en: 'policy', ru: 'Полис', uk: 'Поліс', pos: 'nouns' },
    { en: 'Wi-Fi', ru: 'Вай-фай', uk: 'Вай-фай', pos: 'nouns' },
    { en: 'first-aid', ru: 'Первая помощь', uk: 'Перша допомога', pos: 'nouns' },
    { en: 'kit', ru: 'Набор', uk: 'Набір', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', pos: 'nouns' },
    { en: 'booking', ru: 'Бронирование', uk: 'Бронювання', pos: 'nouns' },
    { en: 'spare', ru: 'Запасной', uk: 'Запасний', pos: 'adjectives' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', pos: 'nouns' },
    { en: 'appetite', ru: 'Аппетит', uk: 'Апетит', pos: 'nouns' },
    { en: 'international', ru: 'Международный', uk: 'Міжнародний', pos: 'adjectives' },
    { en: 'question', ru: 'Вопрос', uk: 'Питання', pos: 'nouns' },
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', pos: 'nouns' },
    { en: 'nut', ru: 'Орех', uk: 'Горіх', pos: 'nouns' },
    { en: 'break', ru: 'Перерыв', uk: 'Перерва', pos: 'nouns' },
    { en: 'return', ru: 'Обратный', uk: 'Зворотний', pos: 'adjectives' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', pos: 'nouns' },
    { en: 'seafood', ru: 'Морепродукты', uk: 'Морепродукти', pos: 'nouns' },
    { en: 'with', ru: 'С', uk: 'З', pos: 'prepositions' },
    { en: 'number', ru: 'Номер', uk: 'Номер', pos: 'nouns' },
    { en: 'business', ru: 'Бизнес', uk: 'Бізнес', pos: 'nouns' },
    { en: 'card', ru: 'Карта', uk: 'Картка', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', pos: 'nouns' },
    { en: 'plan', ru: 'План', uk: 'План', pos: 'nouns' },
    { en: 'confirmation', ru: 'Подтверждение', uk: 'Підтвердження', pos: 'nouns' },
    { en: 'power', ru: 'Мощность', uk: 'Потужність', pos: 'nouns' },
    { en: 'bank', ru: 'Банк', uk: 'Банк', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', pos: 'nouns' },
    { en: 'this', ru: 'Этот', uk: 'Цей', pos: 'adjectives' },
    { en: 'prescription', ru: 'Рецепт', uk: 'Рецепт', pos: 'nouns' },
    { en: 'access', ru: 'Доступ', uk: 'Доступ', pos: 'nouns' },
    { en: 'for', ru: 'Для', uk: 'Для', pos: 'prepositions' },
    { en: 'lunch', ru: 'Обед', uk: 'Обід', pos: 'nouns' },
  ],
  8: [
    { en: 'work', ru: 'Работать', uk: 'Працювати', pos: 'verbs' },
    { en: 'leave', ru: 'Уходить', uk: 'Йти (залишати)', pos: 'verbs' },
    { en: 'pay', ru: 'Платить', uk: 'Платити', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Дзвонити', pos: 'verbs' },
    { en: 'rest', ru: 'Отдыхать', uk: 'Відпочивати', pos: 'verbs' },
    { en: 'travel', ru: 'Путешествовать', uk: 'Подорожувати', pos: 'verbs' },
    { en: 'walk', ru: 'Гулять (ходить пешком)', uk: 'Гуляти (йти пішки)', pos: 'verbs' },
    { en: 'drink', ru: 'Пить', uk: 'Пити', pos: 'verbs' },
    { en: 'arrive', ru: 'Прибывать', uk: 'Прибувати', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', pos: 'verbs' },
    { en: 'relax', ru: 'Отдыхать (расслабляться)', uk: 'Відпочивати (розслаблятися)', pos: 'verbs' },
    { en: 'book', ru: 'Бронировать (заказывать)', uk: 'Бронювати (замовляти)', pos: 'verbs' },
    { en: 'meet', ru: 'Встречаться', uk: 'Зустрічатися', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', pos: 'verbs' },
    { en: 'close', ru: 'Закрывать', uk: 'Зачиняти', pos: 'verbs' },
    { en: 'come', ru: 'Приходить', uk: 'Приходити', pos: 'verbs' },
    { en: 'depart', ru: 'Отправляться', uk: 'Відправлятися', pos: 'verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', pos: 'verbs' },
    { en: 'have', ru: 'Иметь', uk: 'Мати', pos: 'verbs' },
    { en: 'visit', ru: 'Посещать', uk: 'Відвідувати', pos: 'verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', pos: 'verbs' },
    { en: 'shop', ru: 'Делать покупки', uk: 'Робити покупки', pos: 'verbs' },
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
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', pos: 'nouns' },
    { en: 'train', ru: 'Поезд', uk: 'Поїзд', pos: 'nouns' },
    { en: 'seven', ru: 'Семь', uk: 'Сім', pos: 'nouns' },
    { en: 'PM', ru: 'После полудня (вечера)', uk: 'Після полудня (вечора)', pos: 'nouns' },
    { en: 'sport', ru: 'Спорт', uk: 'Спорт', pos: 'nouns' },
    { en: 'Tuesday', ru: 'Вторник', uk: 'Вівторок', pos: 'nouns' },
    { en: 'mail', ru: 'Почта', uk: 'Пошта', pos: 'nouns' },
    { en: 'night', ru: 'Ночь', uk: 'Ніч', pos: 'nouns' },
    { en: 'August', ru: 'Август', uk: 'Серпень', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', pos: 'nouns' },
    { en: 'June', ru: 'Июнь', uk: 'Червень', pos: 'nouns' },
    { en: 'nine', ru: 'Девять', uk: "Дев'ять", pos: 'nouns' },
    { en: 'thirty', ru: 'Тридцать', uk: 'Тридцять', pos: 'nouns' },
    { en: 'Thursday', ru: 'Четверг', uk: 'Четвер', pos: 'nouns' },
    { en: 'food', ru: 'Еда', uk: 'Їжа', pos: 'nouns' },
    { en: 'vacation', ru: 'Отпуск', uk: 'Відпустка', pos: 'nouns' },
    { en: 'spring', ru: 'Весна', uk: 'Весна', pos: 'nouns' },
    { en: 'home', ru: 'Дом (домой)', uk: 'Дім (додому)', pos: 'nouns' },
    { en: 'ten', ru: 'Десять', uk: 'Десять', pos: 'nouns' },
    { en: 'fifteen', ru: 'Пятнадцать', uk: "П'ятнадцять", pos: 'nouns' },
    { en: 'Sunday', ru: 'Воскресенье', uk: 'Неділя', pos: 'nouns' },
    { en: 'breakfast', ru: 'Завтрак', uk: 'Сніданок', pos: 'nouns' },
    { en: 'Saturday', ru: 'Суббота', uk: 'Субота', pos: 'nouns' },
    { en: 'taxi', ru: 'Такси', uk: 'Таксі', pos: 'nouns' },
    { en: 'six', ru: 'Шесть', uk: 'Шість', pos: 'nouns' },
    { en: 'one', ru: 'Один', uk: 'Один', pos: 'nouns' },
    { en: 'gym', ru: 'Спортзал', uk: 'Спортзал', pos: 'nouns' },
    { en: 'Wednesday', ru: 'Среда', uk: 'Середа', pos: 'nouns' },
    { en: 'news', ru: 'Новости', uk: 'Новини', pos: 'nouns' },
    { en: 'day off', ru: 'Выходной', uk: 'Вихідний', pos: 'nouns' },
    { en: 'weekend', ru: 'Выходные', uk: 'Вихідні', pos: 'nouns' },
    { en: 'break', ru: 'Перерыв', uk: 'Перерва', pos: 'nouns' },
    { en: 'two', ru: 'Два', uk: 'Два', pos: 'nouns' },
    { en: 'rent', ru: 'Аренда', uk: 'Оренда', pos: 'nouns' },
    { en: 'January', ru: 'Январь', uk: 'Січень', pos: 'nouns' },
    { en: 'five', ru: 'Пять', uk: "П'ять", pos: 'nouns' },
    { en: 'birthday', ru: 'День рождения', uk: 'День народження', pos: 'nouns' },
    { en: 'October', ru: 'Октябрь', uk: 'Жовтень', pos: 'nouns' },
    { en: 'table', ru: 'Столик', uk: 'Столик', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', pos: 'nouns' },
    { en: 'May', ru: 'Май', uk: 'Травень', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', pos: 'nouns' },
    { en: 'March', ru: 'Март', uk: 'Березень', pos: 'nouns' },
    { en: 'parent', ru: 'Родитель', uk: 'Батько (один з батьків)', pos: 'nouns' },
    { en: 'tea', ru: 'Чай', uk: 'Чай', pos: 'nouns' },
    { en: 'afternoon', ru: 'День (время после полудня)', uk: 'День (час після полудня)', pos: 'nouns' },
    { en: 'September', ru: 'Сентябрь', uk: 'Вересень', pos: 'nouns' },
    { en: 'project', ru: 'Проект', uk: 'Проєкт', pos: 'nouns' },
    { en: 'AM', ru: 'Утра (до полудня)', uk: 'Ранку (до полудня)', pos: 'nouns' },
    { en: 'pizza', ru: 'Пицца', uk: 'Піца', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча', uk: 'Зустріч', pos: 'nouns' },
    { en: 'December', ru: 'Декабрь', uk: 'Грудень', pos: 'nouns' },
    { en: 'April', ru: 'Апрель', uk: 'Квітень', pos: 'nouns' },
  ],
  9: [
    { en: 'bed', ru: 'Кровать', uk: 'Ліжко', pos: 'nouns' },
    { en: 'room', ru: 'Комната', uk: 'Кімната', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', pos: 'nouns' },
    { en: 'park', ru: 'Парк', uk: 'Парк', pos: 'nouns' },
    { en: 'city', ru: 'Город', uk: 'Місто', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', pos: 'nouns' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', pos: 'nouns' },
    { en: 'milk', ru: 'Молоко', uk: 'Молоко', pos: 'nouns' },
    { en: 'fridge', ru: 'Холодильник', uk: 'Холодильник', pos: 'nouns' },
    { en: 'lift', ru: 'Лифт', uk: 'Ліфт', pos: 'nouns' },
    { en: 'building', ru: 'Здание', uk: 'Будівля', pos: 'nouns' },
    { en: 'street', ru: 'Улица', uk: 'Вулиця', pos: 'nouns' },
    { en: 'pharmacy', ru: 'Аптека', uk: 'Аптека', pos: 'nouns' },
    { en: 'airport', ru: 'Аэропорт', uk: 'Аеропорт', pos: 'nouns' },
    { en: 'option', ru: 'Вариант (опция)', uk: 'Варіант (опція)', pos: 'nouns' },
    { en: 'menu', ru: 'Меню', uk: 'Меню', pos: 'nouns' },
    { en: 'towel', ru: 'Полотенце', uk: 'Рушник', pos: 'nouns' },
    { en: 'bathroom', ru: 'Ванная комната', uk: 'Ванна кімната', pos: 'nouns' },
    { en: 'space', ru: 'Место (пространство)', uk: 'Місце (простір)', pos: 'nouns' },
    { en: 'parking lot', ru: 'Парковка', uk: 'Парковка', pos: 'nouns' },
    { en: 'sugar', ru: 'Сахар', uk: 'Цукор', pos: 'nouns' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', pos: 'nouns' },
    { en: 'printer', ru: 'Принтер', uk: 'Принтер', pos: 'nouns' },
    { en: 'office', ru: 'Офис', uk: 'Офіс', pos: 'nouns' },
    { en: 'book', ru: 'Книга', uk: 'Книга', pos: 'nouns' },
    { en: 'shelf', ru: 'Полка', uk: 'Полиця', pos: 'nouns' },
    { en: 'district', ru: 'Район', uk: 'Район', pos: 'nouns' },
    { en: 'first aid kit', ru: 'Аптечка', uk: 'Аптечка', pos: 'nouns' },
    { en: 'car', ru: 'Машина', uk: 'Машина', pos: 'nouns' },
    { en: 'tree', ru: 'Дерево', uk: 'Дерево', pos: 'nouns' },
    { en: 'ice', ru: 'Лед', uk: 'Лід', pos: 'nouns' },
    { en: 'glass', ru: 'Стакан', uk: 'Склянка', pos: 'nouns' },
    { en: 'photo', ru: 'Фотография', uk: 'Фотографія', pos: 'nouns' },
    { en: 'wall', ru: 'Стена', uk: 'Стіна', pos: 'nouns' },
    { en: 'swimming pool', ru: 'Бассейн', uk: 'Басейн', pos: 'nouns' },
    { en: 'garden', ru: 'Сад', uk: 'Сад', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядное устройство', uk: 'Зарядний пристрій', pos: 'nouns' },
    { en: 'suitcase', ru: 'Чемодан', uk: 'Валіза', pos: 'nouns' },
    { en: 'plate', ru: 'Тарелка', uk: 'Тарілка', pos: 'nouns' },
    { en: 'living room', ru: 'Гостиная', uk: 'Вітальня', pos: 'nouns' },
    { en: 'information', ru: 'Информация', uk: 'Інформація', pos: 'nouns' },
    { en: 'letter', ru: 'Письмо', uk: 'Лист', pos: 'nouns' },
    { en: 'window', ru: 'Окно', uk: 'Вікно', pos: 'nouns' },
    { en: 'apartment', ru: 'Квартира', uk: 'Квартира', pos: 'nouns' },
    { en: 'coffee machine', ru: 'Кофемашина', uk: 'Кавомашина', pos: 'nouns' },
    { en: 'pen', ru: 'Ручка', uk: 'Ручка', pos: 'nouns' },
    { en: 'desk', ru: 'Письменный стол', uk: 'Письмовий стіл', pos: 'nouns' },
    { en: 'place', ru: 'Место', uk: 'Місце', pos: 'nouns' },
    { en: 'library', ru: 'Библиотека', uk: 'Бібліотека', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелек', uk: 'Гаманець', pos: 'nouns' },
    { en: 'dessert', ru: 'Десерт', uk: 'Десерт', pos: 'nouns' },
    { en: 'phone charger', ru: 'Зарядка для телефона', uk: 'Зарядка для телефону', pos: 'nouns' },
    { en: 'backpack', ru: 'Рюкзак', uk: 'Рюкзак', pos: 'nouns' },
    { en: 'cafe', ru: 'Кафе', uk: 'Кафе', pos: 'nouns' },
    { en: 'gym', ru: 'Спортзал', uk: 'Спортзал', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', pos: 'nouns' },
    { en: 'task', ru: 'Задача', uk: 'Завдання', pos: 'nouns' },
    { en: 'list', ru: 'Список', uk: 'Список', pos: 'nouns' },
    { en: 'furniture', ru: 'Мебель', uk: 'Меблі', pos: 'nouns' },
    { en: 'supermarket', ru: 'Супермаркет', uk: 'Супермаркет', pos: 'nouns' },
    { en: 'paper', ru: 'Бумага', uk: 'Папір', pos: 'nouns' },
    { en: 'kitchen', ru: 'Кухня', uk: 'Кухня', pos: 'nouns' },
    { en: 'museum', ru: 'Музей', uk: 'Музей', pos: 'nouns' },
    { en: 'link', ru: 'Ссылка', uk: 'Посилання', pos: 'nouns' },
    { en: 'email', ru: 'Электронное письмо', uk: 'Електронний лист', pos: 'nouns' },
    { en: 'mistake', ru: 'Ошибка', uk: 'Помилка', pos: 'nouns' },
    { en: 'order', ru: 'Заказ', uk: 'Замовлення', pos: 'nouns' },
    { en: 'student', ru: 'Студент', uk: 'Студент', pos: 'nouns' },
    { en: 'group', ru: 'Группа', uk: 'Група', pos: 'nouns' },
    { en: 'map', ru: 'Карта', uk: 'Карта', pos: 'nouns' },
    { en: 'video', ru: 'Видео', uk: 'Відео', pos: 'nouns' },
    { en: 'profile', ru: 'Профиль', uk: 'Профіль', pos: 'nouns' },
    { en: 'house', ru: 'Дом', uk: 'Будинок', pos: 'nouns' },
    { en: 'question', ru: 'Вопрос', uk: 'Запитання', pos: 'nouns' },
    { en: 'message', ru: 'Сообщение', uk: 'Повідомлення', pos: 'nouns' },
    { en: 'internet', ru: 'Интернет', uk: 'Інтернет', pos: 'nouns' },
    { en: 'mountain', ru: 'Гора', uk: 'Гора', pos: 'nouns' },
    { en: 'country', ru: 'Страна', uk: 'Країна', pos: 'nouns' },
  ],
  10: [
    { en: 'translate', ru: 'Переводить', uk: 'Перекладати', pos: 'verbs' },
    { en: 'sign', ru: 'Подписывать', uk: 'Підписувати', pos: 'verbs' },
    { en: 'fix', ru: 'Чинить (ремонтировать)', uk: 'Лагодити (ремонтувати)', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить (еду)', uk: 'Готувати (їжу)', pos: 'verbs' },
    { en: 'book', ru: 'Бронировать', uk: 'Бронювати', pos: 'verbs' },
    { en: 'come', ru: 'Приходить', uk: 'Приходити', pos: 'verbs' },
    { en: 'use', ru: 'Использовать', uk: 'Використовувати', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', pos: 'verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Надсилати', pos: 'verbs' },
    { en: 'meet', ru: 'Встречать', uk: 'Зустрічати', pos: 'verbs' },
    { en: 'learn', ru: 'Учить (изучать)', uk: 'Вчити (вивчати)', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', pos: 'verbs' },
    { en: 'wear', ru: 'Носить (одежду)', uk: 'Носити (одяг)', pos: 'verbs' },
    { en: 'wait', ru: 'Ждать', uk: 'Чекати', pos: 'verbs' },
    { en: 'save', ru: 'Экономить (сохранять)', uk: 'Економити (зберігати)', pos: 'verbs' },
    { en: 'show', ru: 'Показывать', uk: 'Показувати', pos: 'verbs' },
    { en: 'pay', ru: 'Платить', uk: 'Платити', pos: 'verbs' },
    { en: 'keep', ru: 'Хранить (держать)', uk: 'Зберігати (тримати)', pos: 'verbs' },
    { en: 'clean', ru: 'Чистить', uk: 'Чистити', pos: 'verbs' },
    { en: 'respect', ru: 'Уважать', uk: 'Поважати', pos: 'verbs' },
    { en: 'drive', ru: 'Водить (машину)', uk: 'Водити (машину)', pos: 'verbs' },
    { en: 'protect', ru: 'Защищать', uk: 'Захищати', pos: 'verbs' },
    { en: 'repair', ru: 'Чинить (ремонтировать)', uk: 'Лагодити (ремонтувати)', pos: 'verbs' },
    { en: 'print', ru: 'Печатать', uk: 'Друкувати', pos: 'verbs' },
    { en: 'obey', ru: 'Соблюдать (повиноваться)', uk: 'Дотримуватися (підкорятися)', pos: 'verbs' },
    { en: 'explain', ru: 'Объяснять', uk: 'Пояснювати', pos: 'verbs' },
    { en: 'leave', ru: 'Оставлять', uk: 'Залишати', pos: 'verbs' },
    { en: 'take', ru: 'Принимать (лекарство)', uk: 'Приймати (ліки)', pos: 'verbs' },
    { en: 'discuss', ru: 'Обсуждать', uk: 'Обговорювати', pos: 'verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', pos: 'verbs' },
    { en: 'move', ru: 'Переносить (двигать)', uk: 'Переносити (рухати)', pos: 'verbs' },
    { en: 'return', ru: 'Возвращать', uk: 'Повертати', pos: 'verbs' },
    { en: 'reserve', ru: 'Бронировать (резервировать)', uk: 'Бронювати (резервувати)', pos: 'verbs' },
    { en: 'organize', ru: 'Организовывать', uk: 'Організовувати', pos: 'verbs' },
    { en: 'can', ru: 'Мочь (уметь)', uk: 'Могти (вміти)', pos: 'verbs' },
    { en: 'must', ru: 'Должен', uk: 'Повинен', pos: 'verbs' },
    { en: 'document', ru: 'Документ', uk: 'Документ', pos: 'nouns' },
    { en: 'paper', ru: 'Бумага (документ)', uk: 'Папір (документ)', pos: 'nouns' },
    { en: 'computer', ru: 'Компьютер', uk: "Комп'ютер", pos: 'nouns' },
    { en: 'groceries', ru: 'Продукты (бакалея)', uk: 'Продукти (бакалія)', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', pos: 'nouns' },
    { en: 'room', ru: 'Номер (комната)', uk: 'Номер (кімната)', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', pos: 'nouns' },
    { en: 'email', ru: 'Электронная почта', uk: 'Електронна пошта', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', pos: 'nouns' },
    { en: 'taxi', ru: 'Такси', uk: 'Таксі', pos: 'nouns' },
    { en: 'report', ru: 'Отчет', uk: 'Звіт', pos: 'nouns' },
    { en: 'airport', ru: 'Аэропорт', uk: 'Аеропорт', pos: 'nouns' },
    { en: 'word', ru: 'Слово', uk: 'Слово', pos: 'nouns' },
    { en: 'luggage', ru: 'Багаж', uk: 'Багаж', pos: 'nouns' },
    { en: 'mask', ru: 'Маска', uk: 'Маска', pos: 'nouns' },
    { en: 'downstairs', ru: 'Внизу (на нижнем этаже)', uk: 'Внизу (на нижньому поверсі)', pos: 'adverbs' },
    { en: 'energy', ru: 'Энергия', uk: 'Енергія', pos: 'nouns' },
    { en: 'way', ru: 'Путь (дорога)', uk: 'Шлях (дорога)', pos: 'nouns' },
    { en: 'rent', ru: 'Арендная плата', uk: 'Орендна плата', pos: 'nouns' },
    { en: 'month', ru: 'Месяц', uk: 'Місяць', pos: 'nouns' },
    { en: 'safe', ru: 'Сейф', uk: 'Сейф', pos: 'nouns' },
    { en: 'suit', ru: 'Костюм', uk: 'Костюм', pos: 'nouns' },
    { en: 'rule', ru: 'Правило', uk: 'Правило', pos: 'nouns' },
    { en: 'truck', ru: 'Грузовик', uk: 'Вантажівка', pos: 'nouns' },
    { en: 'tie', ru: 'Галстук', uk: 'Краватка', pos: 'nouns' },
    { en: 'work', ru: 'Работа', uk: 'Робота', pos: 'nouns' },
    { en: 'station', ru: 'Вокзал (станция)', uk: 'Вокзал (станція)', pos: 'nouns' },
    { en: 'light', ru: 'Свет', uk: 'Світло', pos: 'nouns' },
    { en: 'soup', ru: 'Суп', uk: 'Суп', pos: 'nouns' },
    { en: 'nature', ru: 'Природа', uk: 'Природа', pos: 'nouns' },
    { en: 'bicycle', ru: 'Велосипед', uk: 'Велосипед', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', pos: 'nouns' },
    { en: 'place', ru: 'Место', uk: 'Місце', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', pos: 'nouns' },
    { en: 'law', ru: 'Закон', uk: 'Закон', pos: 'nouns' },
    { en: 'uniform', ru: 'Униформа', uk: 'Уніформа', pos: 'nouns' },
    { en: 'school', ru: 'Школа', uk: 'Школа', pos: 'nouns' },
    { en: 'coat', ru: 'Пальто', uk: 'Пальто', pos: 'nouns' },
    { en: 'cloakroom', ru: 'Гардероб', uk: 'Гардероб', pos: 'nouns' },
    { en: 'medicine', ru: 'Лекарство', uk: 'Ліки', pos: 'nouns' },
    { en: 'project', ru: 'Проект', uk: 'Проєкт', pos: 'nouns' },
    { en: 'water', ru: 'Вода', uk: 'Вода', pos: 'nouns' },
    { en: 'reception', ru: 'Приемная (ресепшн)', uk: 'Приймальня (ресепшн)', pos: 'nouns' },
    { en: 'gift', ru: 'Подарок', uk: 'Подарунок', pos: 'nouns' },
    { en: 'sister', ru: 'Сестра', uk: 'Сестра', pos: 'nouns' },
    { en: 'photo', ru: 'Фотография', uk: 'Фотографія', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча (собрание)', uk: 'Зустріч (зібрання)', pos: 'nouns' },
    { en: 'library', ru: 'Библиотека', uk: 'Бібліотека', pos: 'nouns' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', pos: 'nouns' },
    { en: 'restaurant', ru: 'Ресторан', uk: 'Ресторан', pos: 'nouns' },
    { en: 'data', ru: 'Данные', uk: 'Дані', pos: 'nouns' },
    { en: 'holiday', ru: 'Праздник', uk: 'Свято', pos: 'nouns' },
    { en: 'express', ru: 'Экспресс', uk: 'Експрес', pos: 'nouns' },
    { en: 'mail', ru: 'Почта', uk: 'Пошта', pos: 'nouns' },
    { en: 'new', ru: 'Новый', uk: 'Новий', pos: 'adjectives' },
    { en: 'delicious', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'private', ru: 'Личный (приватный)', uk: 'Особистий (приватний)', pos: 'adjectives' },
    { en: 'today', ru: 'Сегодня', uk: 'Сьогодні', pos: 'adverbs' },
    { en: 'now', ru: 'Сейчас', uk: 'Зараз', pos: 'adverbs' },
    { en: 'tomorrow', ru: 'Завтра', uk: 'Завтра', pos: 'adverbs' },
    { en: 'daily', ru: 'Ежедневно', uk: 'Щодня', pos: 'adverbs' },
    { en: 'every', ru: 'Каждый', uk: 'Кожен', pos: 'adverbs' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', pos: 'adverbs' },
    { en: 'many', ru: 'Много', uk: 'Багато', pos: 'adjectives' },
    { en: 'some', ru: 'Несколько (немного)', uk: 'Кілька (трохи)', pos: 'adjectives' },
    { en: 'free', ru: 'Свободный (бесплатный)', uk: 'Вільний (безкоштовний)', pos: 'adjectives' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', pos: 'adjectives' },
    { en: 'good', ru: 'Хороший', uk: 'Хороший', pos: 'adjectives' },
    { en: 'vegetarian', ru: 'Вегетарианский', uk: 'Вегетаріанський', pos: 'adjectives' },
    { en: 'big', ru: 'Большой', uk: 'Великий', pos: 'adjectives' },
    { en: 'new', ru: 'Новый', uk: 'Новий', pos: 'adjectives' },
    { en: 'cheap', ru: 'Дешевый', uk: 'Дешевий', pos: 'adjectives' },
    { en: 'quiet', ru: 'Тихий', uk: 'Тихий', pos: 'adjectives' },
    { en: 'fresh', ru: 'Свежий', uk: 'Свіжий', pos: 'adjectives' },
    { en: 'clean', ru: 'Чистый', uk: 'Чистий', pos: 'adjectives' },
    { en: 'famous', ru: 'Знаменитый', uk: 'Знаменитий', pos: 'adjectives' },
    { en: 'useful', ru: 'Полезный', uk: 'Корисний', pos: 'adjectives' },
    { en: 'old', ru: 'Старый', uk: 'Старий', pos: 'adjectives' },
    { en: 'delicious', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'beautiful', ru: 'Красивый', uk: 'Красивий', pos: 'adjectives' },
    { en: 'his', ru: 'Его', uk: 'Його', pos: 'pronouns' },
    { en: 'her', ru: 'Ее', uk: 'Її', pos: 'pronouns' },
    { en: 'their', ru: 'Их', uk: 'Їхній', pos: 'pronouns' },
  ],
  11: [
    { en: 'book', ru: 'Бронировать', uk: 'Бронювати', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', pos: 'verbs' },
    { en: 'visit', ru: 'Посещать (навещать)', uk: 'Відвідувати', pos: 'verbs' },
    { en: 'paint', ru: 'Красить', uk: 'Фарбувати', pos: 'verbs' },
    { en: 'open', ru: 'Открывать', uk: 'Відкривати', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', pos: 'verbs' },
    { en: 'park', ru: 'Парковаться', uk: 'Паркуватися', pos: 'verbs' },
    { en: 'discuss', ru: 'Обсуждать', uk: 'Обговорювати', pos: 'verbs' },
    { en: 'clean', ru: 'Чистить', uk: 'Чистити', pos: 'verbs' },
    { en: 'delete', ru: 'Удалять', uk: 'Видалити', pos: 'verbs' },
    { en: 'confirm', ru: 'Подтверждать', uk: 'Підтверджувати', pos: 'verbs' },
    { en: 'upload', ru: 'Загружать (в сеть)', uk: 'Завантажувати (у мережу)', pos: 'verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', pos: 'verbs' },
    { en: 'charge', ru: 'Заряжать', uk: 'Заряджати', pos: 'verbs' },
    { en: 'save', ru: 'Сохранять', uk: 'Зберігати', pos: 'verbs' },
    { en: 'iron', ru: 'Гладить', uk: 'Прасувати', pos: 'verbs' },
    { en: 'deliver', ru: 'Доставлять', uk: 'Доставляти', pos: 'verbs' },
    { en: 'rent', ru: 'Арендовать', uk: 'Орендувати', pos: 'verbs' },
    { en: 'wash', ru: 'Мыть', uk: 'Мити', pos: 'verbs' },
    { en: 'postpone', ru: 'Переносить (откладывать)', uk: 'Переносити (відкладати)', pos: 'verbs' },
    { en: 'fix', ru: 'Чинить (ремонтировать)', uk: 'Лагодити (ремонтувати)', pos: 'verbs' },
    { en: 'stop', ru: 'Останавливать', uk: 'Зупиняти', pos: 'verbs' },
    { en: 'change', ru: 'Менять', uk: 'Змінювати', pos: 'verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', pos: 'verbs' },
    { en: 'wrap', ru: 'Упаковывать', uk: 'Запаковувати', pos: 'verbs' },
    { en: 'print', ru: 'Печатать', uk: 'Друкувати', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Дзвонити', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', pos: 'verbs' },
    { en: 'attend', ru: 'Посещать (присутствовать)', uk: 'Відвідувати (бути присутнім)', pos: 'verbs' },
    { en: 'pack', ru: 'Паковать', uk: 'Пакувати', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', pos: 'verbs' },
    { en: 'install', ru: 'Устанавливать', uk: 'Встановлювати', pos: 'verbs' },
    { en: 'answer', ru: 'Отвечать', uk: 'Відповідати', pos: 'verbs' },
    { en: 'brush', ru: 'Расчесывать (щеткой)', uk: 'Розчісувати (щіткою)', pos: 'verbs' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', pos: 'nouns' },
    { en: 'hour', ru: 'Час', uk: 'Година', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', pos: 'nouns' },
    { en: 'evening', ru: 'Вечер', uk: 'Вечір', pos: 'nouns' },
    { en: 'friend', ru: 'Друг', uk: 'Друг', pos: 'nouns' },
    { en: 'week', ru: 'Неделя', uk: 'Тиждень', pos: 'nouns' },
    { en: 'wall', ru: 'Стена', uk: 'Стіна', pos: 'nouns' },
    { en: 'day', ru: 'День', uk: 'День', pos: 'nouns' },
    { en: 'window', ru: 'Окно', uk: 'Вікно', pos: 'nouns' },
    { en: 'morning', ru: 'Утро', uk: 'Ранок', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', pos: 'nouns' },
    { en: 'car', ru: 'Машина', uk: 'Машина', pos: 'nouns' },
    { en: 'minute', ru: 'Минута', uk: 'Хвилина', pos: 'nouns' },
    { en: 'project', ru: 'Проект', uk: 'Проєкт', pos: 'nouns' },
    { en: 'monday', ru: 'Понедельник', uk: 'Понеділок', pos: 'nouns' },
    { en: 'shoe', ru: 'Обувь', uk: 'Взуття', pos: 'nouns' },
    { en: 'file', ru: 'Файл', uk: 'Файл', pos: 'nouns' },
    { en: 'report', ru: 'Отчет', uk: 'Звіт', pos: 'nouns' },
    { en: 'laptop', ru: 'Ноутбук', uk: 'Ноутбук', pos: 'nouns' },
    { en: 'saturday', ru: 'Суббота', uk: 'Субота', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', pos: 'nouns' },
    { en: 'shirt', ru: 'Рубашка', uk: 'Сорочка', pos: 'nouns' },
    { en: 'parcel', ru: 'Посылка', uk: 'Посилка', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', pos: 'nouns' },
    { en: 'apartment', ru: 'Квартира', uk: 'Квартира', pos: 'nouns' },
    { en: 'month', ru: 'Месяц', uk: 'Місяць', pos: 'nouns' },
    { en: 'message', ru: 'Сообщение', uk: 'Повідомлення', pos: 'nouns' },
    { en: 'item', ru: 'Товар (позиция)', uk: 'Товар', pos: 'nouns' },
    { en: 'dish', ru: 'Посуда (блюдо)', uk: 'Посуд (блюдо)', pos: 'nouns' },
    { en: 'shelf', ru: 'Полка', uk: 'Полиця', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча', uk: 'Зустріч', pos: 'nouns' },
    { en: 'printer', ru: 'Принтер', uk: 'Принтер', pos: 'nouns' },
    { en: 'lecture', ru: 'Лекция', uk: 'Лекція', pos: 'nouns' },
    { en: 'thursday', ru: 'Четверг', uk: 'Четвер', pos: 'nouns' },
    { en: 'suitcase', ru: 'Чемодан', uk: 'Валіза', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', pos: 'nouns' },
    { en: 'computer', ru: 'Компьютер', uk: 'Комп\'ютер', pos: 'nouns' },
    { en: 'notification', ru: 'Уведомление', uk: 'Сповіщення', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', pos: 'nouns' },
    { en: 'vegetables', ru: 'Овощи', uk: 'Овочі', pos: 'nouns' },
    { en: 'salad', ru: 'Салат', uk: 'Салат', pos: 'nouns' },
    { en: 'movie', ru: 'Фильм', uk: 'Фільм', pos: 'nouns' },
    { en: 'gift', ru: 'Подарок', uk: 'Подарунок', pos: 'nouns' },
    { en: 'doctor', ru: 'Врач', uk: 'Лікар', pos: 'nouns' },
    { en: 'man', ru: 'Человек (мужчина)', uk: 'Людина (чоловік)', pos: 'nouns' },
    { en: 'work', ru: 'Работа', uk: 'Робота', pos: 'nouns' },
    { en: 'soup', ru: 'Суп', uk: 'Суп', pos: 'nouns' },
    { en: 'keyboard', ru: 'Клавиатура', uk: 'Клавіатура', pos: 'nouns' },
    { en: 'thing', ru: 'Вещь', uk: 'Річ', pos: 'nouns' },
    { en: 'woman', ru: 'Женщина', uk: 'Жінка', pos: 'nouns' },
    { en: 'hair', ru: 'Волосы', uk: 'Волосся', pos: 'nouns' },
    { en: 'program', ru: 'Программа', uk: 'Програма', pos: 'nouns' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', pos: 'nouns' },
    { en: 'carpet', ru: 'Ковер', uk: 'Килим', pos: 'nouns' },
    { en: 'sunday', ru: 'Воскресенье', uk: 'Неділя', pos: 'nouns' },
    { en: 'email', ru: 'Электронное письмо', uk: 'Електронний лист', pos: 'nouns' },
    { en: 'tuesday', ru: 'Вторник', uk: 'Вівторок', pos: 'nouns' },
    { en: 'photo', ru: 'Фотография', uk: 'Фотографія', pos: 'nouns' },
    { en: 'wonderful', ru: 'Чудесный', uk: 'Чудовий', pos: 'adjectives' },
    { en: 'dirty', ru: 'Грязный', uk: 'Брудний', pos: 'adjectives' },
    { en: 'old', ru: 'Старый', uk: 'Старий', pos: 'adjectives' },
    { en: 'white', ru: 'Белый', uk: 'Білий', pos: 'adjectives' },
    { en: 'difficult', ru: 'Сложный', uk: 'Складний', pos: 'adjectives' },
    { en: 'delicious', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', pos: 'adjectives' },
    { en: 'long', ru: 'Длинный', uk: 'Довгий', pos: 'adjectives' },
    { en: 'new', ru: 'Новый', uk: 'Новий', pos: 'adjectives' },
    { en: 'yesterday', ru: 'Вчера', uk: 'Вчора', pos: 'adverbs' },
    { en: 'ago', ru: 'Тому (назад)', uk: 'Тому', pos: 'adverbs' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', pos: 'adverbs' },
  ],
  12: [
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', pos: 'verbs' },
    { en: 'drink', ru: 'Пить', uk: 'Пити', pos: 'verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', pos: 'verbs' },
    { en: 'sell', ru: 'Продавать', uk: 'Продавати', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Відправляти', pos: 'verbs' },
    { en: 'eat', ru: 'Есть', uk: 'Їсти', pos: 'verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', pos: 'verbs' },
    { en: 'build', ru: 'Строить', uk: 'Будувати', pos: 'verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', pos: 'verbs' },
    { en: 'bring', ru: 'Приносить', uk: 'Приносити', pos: 'verbs' },
    { en: 'go', ru: 'Идти (ехать)', uk: 'Йти (їхати)', pos: 'verbs' },
    { en: 'make', ru: 'Делать (создавать)', uk: 'Робити (створювати)', pos: 'verbs' },
    { en: 'give', ru: 'Давать', uk: 'Давати', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', pos: 'verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', pos: 'verbs' },
    { en: 'spend', ru: 'Тратить (расходовать)', uk: 'Витрачати', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', pos: 'verbs' },
    { en: 'lose', ru: 'Терять', uk: 'Втрачати', pos: 'verbs' },
    { en: 'leave', ru: 'Покидать (уходить)', uk: 'Покидати (йти)', pos: 'verbs' },
    { en: 'meet', ru: 'Встречать', uk: 'Зустрічати', pos: 'verbs' },
    { en: 'sleep', ru: 'Спать', uk: 'Спати', pos: 'verbs' },
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', pos: 'verbs' },
    { en: 'wear', ru: 'Носить (надевать)', uk: 'Носити (одягати)', pos: 'verbs' },
    { en: 'tell', ru: 'Рассказывать (говорить)', uk: 'Розповідати (говорити)', pos: 'verbs' },
    { en: 'say', ru: 'Сказать', uk: 'Сказати', pos: 'verbs' },
    { en: 'bread', ru: 'Хлеб', uk: 'Хліб', pos: 'nouns' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', pos: 'nouns' },
    { en: 'boat', ru: 'Лодка', uk: 'Човен', pos: 'nouns' },
    { en: 'cake', ru: 'Торт (пирожное)', uk: 'Торт (тістечко)', pos: 'nouns' },
    { en: 'fence', ru: 'Забор', uk: 'Паркан', pos: 'nouns' },
    { en: 'letter', ru: 'Письмо', uk: 'Лист', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', pos: 'nouns' },
    { en: 'headphones', ru: 'Наушники', uk: 'Навушники', pos: 'nouns' },
    { en: 'gym', ru: 'Спортзал', uk: 'Спортзал', pos: 'nouns' },
    { en: 'sandwich', ru: 'Бутерброд', uk: 'Бутерброд', pos: 'nouns' },
    { en: 'advice', ru: 'Совет', uk: 'Порада', pos: 'nouns' },
    { en: 'juice', ru: 'Сок', uk: 'Сік', pos: 'nouns' },
    { en: 'umbrella', ru: 'Зонт', uk: 'Парасолька', pos: 'nouns' },
    { en: 'noise', ru: 'Шум', uk: 'Шум', pos: 'nouns' },
    { en: 'money', ru: 'Деньги', uk: 'Гроші', pos: 'nouns' },
    { en: 'apple', ru: 'Яблуко', uk: 'Яблуко', pos: 'nouns' },
    { en: 'article', ru: 'Статья', uk: 'Стаття', pos: 'nouns' },
    { en: 'saturday', ru: 'Суббота', uk: 'Субота', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелек', uk: 'Гаманець', pos: 'nouns' },
    { en: 'bed', ru: 'Кровать', uk: 'Ліжко', pos: 'nouns' },
    { en: 'task', ru: 'Задача (задание)', uk: 'Задача (завдання)', pos: 'nouns' },
    { en: 'jacket', ru: 'Куртка', uk: 'Куртка', pos: 'nouns' },
    { en: 'story', ru: 'История (рассказ)', uk: 'Історія (розповідь)', pos: 'nouns' },
    { en: 'city', ru: 'Город', uk: 'Місто', pos: 'nouns' },
    { en: 'neighbor', ru: 'Сосед', uk: 'Сусід', pos: 'nouns' },
    { en: 'sofa', ru: 'Диван', uk: 'Диван', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', pos: 'nouns' },
    { en: 'picture', ru: 'Картина (рисунок)', uk: 'Картина (малюнок)', pos: 'nouns' },
    { en: 'wednesday', ru: 'Среда', uk: 'Середа', pos: 'nouns' },
    { en: 'pastry', ru: 'Выпечка', uk: 'Випічка', pos: 'nouns' },
    { en: 'tea', ru: 'Чай', uk: 'Чай', pos: 'nouns' },
    { en: 'box', ru: 'Ящик (коробка)', uk: 'Ящик (коробка)', pos: 'nouns' },
    { en: 'milk', ru: 'Молоко', uk: 'Молоко', pos: 'nouns' },
    { en: 'gloves', ru: 'Перчатки', uk: 'Рукавички', pos: 'nouns' },
    { en: 'bird', ru: 'Птица', uk: 'Птах', pos: 'nouns' },
    { en: 'garden', ru: 'Сад', uk: 'Сад', pos: 'nouns' },
    { en: 'fruit', ru: 'Фрукт', uk: 'Фрукт', pos: 'nouns' },
    { en: 'text', ru: 'Текст', uk: 'Текст', pos: 'nouns' },
    { en: 'bus', ru: 'Автобус', uk: 'Автобус', pos: 'nouns' },
    { en: 'topic', ru: 'Тема', uk: 'Тема', pos: 'nouns' },
    { en: 'home', ru: 'Дом', uk: 'Вдома', pos: 'nouns' },
    { en: 'music', ru: 'Музыка', uk: 'Музика', pos: 'nouns' },
    { en: 'bridge', ru: 'Мост', uk: 'Міст', pos: 'nouns' },
    { en: 'boots', ru: 'Ботинки', uk: 'Черевики', pos: 'nouns' },
    { en: 'fresh', ru: 'Свежий', uk: 'Свіжий', pos: 'adjectives' },
    { en: 'hot', ru: 'Горячий', uk: 'Гарячий', pos: 'adjectives' },
    { en: 'cold', ru: 'Холодный', uk: 'Холодний', pos: 'adjectives' },
    { en: 'comfortable', ru: 'Удобный', uk: 'Зручний', pos: 'adjectives' },
    { en: 'useful', ru: 'Полезный', uk: 'Корисний', pos: 'adjectives' },
    { en: 'funny', ru: 'Забавный (смешной)', uk: 'Кумедний (смішний)', pos: 'adjectives' },
    { en: 'noisy', ru: 'Шумный', uk: 'Шумний', pos: 'adjectives' },
    { en: 'soft', ru: 'Мягкий', uk: 'М\'який', pos: 'adjectives' },
    { en: 'warm', ru: 'Теплый', uk: 'Теплий', pos: 'adjectives' },
    { en: 'heavy', ru: 'Тяжелый', uk: 'Важкий', pos: 'adjectives' },
    { en: 'beautiful', ru: 'Красивый', uk: 'Красивий', pos: 'adjectives' },
    { en: 'tasty', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'strange', ru: 'Странный', uk: 'Дивний', pos: 'adjectives' },
    { en: 'juicy', ru: 'Сочный', uk: 'Соковитий', pos: 'adjectives' },
    { en: 'interesting', ru: 'Интересный', uk: 'Цікавий', pos: 'adjectives' },
    { en: 'sweet', ru: 'Сладкий', uk: 'Солодкий', pos: 'adjectives' },
    { en: 'loud', ru: 'Громкий', uk: 'Гучний', pos: 'adjectives' },
    { en: 'wooden', ru: 'Деревянный', uk: 'Дерев\'яний', pos: 'adjectives' },
    { en: 'rare', ru: 'Редкий', uk: 'Рідкісний', pos: 'adjectives' },
    { en: 'short', ru: 'Короткий', uk: 'Короткий', pos: 'adjectives' },
    { en: 'right', ru: 'Правильный', uk: 'Правильний', pos: 'adjectives' },
  ],
  13: [
    // Verbs
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', pos: 'verbs' },
    { en: 'meet', ru: 'Встречать', uk: 'Зустрічати', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', pos: 'verbs' },
    { en: 'bring', ru: 'Приносить', uk: 'Приносити', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Надсилати', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить (еду)', uk: 'Готувати (їжу)', pos: 'verbs' },
    { en: 'wear', ru: 'Носить (одевать)', uk: 'Носити (одягати)', pos: 'verbs' },
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', pos: 'verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', pos: 'verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', pos: 'verbs' },
    { en: 'sell', ru: 'Продавать', uk: 'Продавати', pos: 'verbs' },
    { en: 'drink', ru: 'Пить', uk: 'Пити', pos: 'verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', pos: 'verbs' },
    { en: 'eat', ru: 'Есть', uk: 'Їсти', pos: 'verbs' },
    { en: 'build', ru: 'Строить', uk: 'Будувати', pos: 'verbs' },
    { en: 'lose', ru: 'Терять', uk: 'Втрачати', pos: 'verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', pos: 'verbs' },
    { en: 'prepare', ru: 'Готовить (подготавливать)', uk: 'Готувати (підготувати)', pos: 'verbs' },
    { en: 'choose', ru: 'Выбирать', uk: 'Вибирати', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', pos: 'verbs' },
    { en: 'show', ru: 'Показывать', uk: 'Показувати', pos: 'verbs' },
    { en: 'tell', ru: 'Рассказывать (говорить)', uk: 'Розповідати (говорити)', pos: 'verbs' },
    { en: 'know', ru: 'Знать', uk: 'Знати', pos: 'verbs' },
    { en: 'cut', ru: 'Резать', uk: 'Різати', pos: 'verbs' },
    { en: 'feel', ru: 'Чувствовать', uk: 'Відчувати', pos: 'verbs' },
    { en: 'leave', ru: 'Оставлять', uk: 'Залишати', pos: 'verbs' },
    { en: 'sing', ru: 'Петь', uk: 'Співати', pos: 'verbs' },
    { en: 'shut', ru: 'Закрывать', uk: 'Зачиняти', pos: 'verbs' },
    { en: 'get', ru: 'Получать', uk: 'Отримувати', pos: 'verbs' },
    { en: 'discuss', ru: 'Обсуждать', uk: 'Обговорювати', pos: 'verbs' },
    // Nouns
    { en: 'house', ru: 'Дом', uk: 'Будинок', pos: 'nouns' },
    { en: 'year', ru: 'Год', uk: 'Рік', pos: 'nouns' },
    { en: 'doctor', ru: 'Врач', uk: 'Лікар', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', pos: 'nouns' },
    { en: 'message', ru: 'Сообщение', uk: 'Повідомлення', pos: 'nouns' },
    { en: 'minute', ru: 'Минута', uk: 'Хвилина', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', pos: 'nouns' },
    { en: 'dress', ru: 'Платье', uk: 'Сукня', pos: 'nouns' },
    { en: 'truth', ru: 'Истина (правда)', uk: 'Істина (правда)', pos: 'nouns' },
    { en: 'book', ru: 'Книга', uk: 'Книга', pos: 'nouns' },
    { en: 'report', ru: 'Отчет', uk: 'Звіт', pos: 'nouns' },
    { en: 'bridge', ru: 'Мост', uk: 'Міст', pos: 'nouns' },
    { en: 'car', ru: 'Машина', uk: 'Машина', pos: 'nouns' },
    { en: 'month', ru: 'Місяць', uk: 'Місяць', pos: 'nouns' },
    { en: 'fruit', ru: 'Фрукт', uk: 'Фрукт', pos: 'nouns' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', pos: 'nouns' },
    { en: 'place', ru: 'Место', uk: 'Місце', pos: 'nouns' },
    { en: 'afternoon', ru: 'День (после полудня)', uk: 'День (після полудня)', pos: 'nouns' },
    { en: 'salad', ru: 'Салат', uk: 'Салат', pos: 'nouns' },
    { en: 'center', ru: 'Центр', uk: 'Центр', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', pos: 'nouns' },
    { en: 'news', ru: 'Новость (новости)', uk: 'Новина (новини)', pos: 'nouns' },
    { en: 'breakfast', ru: 'Завтрак', uk: 'Сніданок', pos: 'nouns' },
    { en: 'armchair', ru: 'Кресло', uk: 'Крісло', pos: 'nouns' },
    { en: 'artist', ru: 'Художник (артист)', uk: 'Художник (артист)', pos: 'nouns' },
    { en: 'hat', ru: 'Шапка (шляпа)', uk: 'Шапка (капелюх)', pos: 'nouns' },
    { en: 'story', ru: 'История (рассказ)', uk: 'Історія (розповідь)', pos: 'nouns' },
    { en: 'newspaper', ru: 'Газета', uk: 'Газета', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', pos: 'nouns' },
    { en: 'computer', ru: 'Компьютер', uk: 'Комп\'ютер', pos: 'nouns' },
    { en: 'order', ru: 'Заказ', uk: 'Замовлення', pos: 'nouns' },
    { en: 'tuesday', ru: 'Вторник', uk: 'Вівторок', pos: 'nouns' },
    { en: 'photo', ru: 'Фотография', uk: 'Фотографія', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', pos: 'nouns' },
    { en: 'water', ru: 'Вода', uk: 'Вода', pos: 'nouns' },
    { en: 'balloon', ru: 'Воздушный шар', uk: 'Повітряна куля', pos: 'nouns' },
    { en: 'cake', ru: 'Торт (пирожное)', uk: 'Торт (тістечко)', pos: 'nouns' },
    { en: 'information', ru: 'Информация', uk: 'Інформація', pos: 'nouns' },
    { en: 'manager', ru: 'Менеджер', uk: 'Менеджер', pos: 'nouns' },
    { en: 'shoes', ru: 'Туфли (обувь)', uk: 'Туфлі (взуття)', pos: 'nouns' },
    { en: 'coolness', ru: 'Прохлада', uk: 'Прохолода', pos: 'nouns' },
    { en: 'song', ru: 'Песня', uk: 'Пісня', pos: 'nouns' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', pos: 'nouns' },
    { en: 'card', ru: 'Карта', uk: 'Картка', pos: 'nouns' },
    { en: 'monday', ru: 'Понедельник', uk: 'Понеділок', pos: 'nouns' },
    { en: 'money', ru: 'Деньги', uk: 'Гроші', pos: 'nouns' },
    { en: 'gift', ru: 'Подарок', uk: 'Подарунок', pos: 'nouns' },
    { en: 'detail', ru: 'Деталь', uk: 'Деталь', pos: 'nouns' },
    { en: 'wall', ru: 'Стена', uk: 'Стіна', pos: 'nouns' },
    { en: 'bread', ru: 'Хлеб', uk: 'Хліб', pos: 'nouns' },
    { en: 'shop', ru: 'Магазин', uk: 'Магазин', pos: 'nouns' },
    { en: 'wednesday', ru: 'Среда', uk: 'Середа', pos: 'nouns' },
    { en: 'scheme', ru: 'Схема', uk: 'Схема', pos: 'nouns' },
    { en: 'hour', ru: 'Час', uk: 'Година', pos: 'nouns' },
    { en: 'reason', ru: 'Причина', uk: 'Причина', pos: 'nouns' },
    { en: 'mother', ru: 'Мать', uk: 'Мати', pos: 'nouns' },
    // Adjectives
    { en: 'old', ru: 'Старый', uk: 'Старий', pos: 'adjectives' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', pos: 'adjectives' },
    { en: 'long', ru: 'Длинный', uk: 'Довгий', pos: 'adjectives' },
    { en: 'delicious', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'blue', ru: 'Синий', uk: 'Синій', pos: 'adjectives' },
    { en: 'simple', ru: 'Простой', uk: 'Простий', pos: 'adjectives' },
    { en: 'interesting', ru: 'Интересный', uk: 'Цікавий', pos: 'adjectives' },
    { en: 'short', ru: 'Короткий', uk: 'Короткий', pos: 'adjectives' },
    { en: 'famous', ru: 'Знаменитый', uk: 'Знаменитий', pos: 'adjectives' },
    { en: 'fresh', ru: 'Свежий', uk: 'Свіжий', pos: 'adjectives' },
    { en: 'hot', ru: 'Горячий', uk: 'Гарячий', pos: 'adjectives' },
    { en: 'quiet', ru: 'Тихий', uk: 'Тихий', pos: 'adjectives' },
    { en: 'new', ru: 'Новый', uk: 'Новий', pos: 'adjectives' },
    { en: 'healthy', ru: 'Полезный (здоровый)', uk: 'Корисний (здоровий)', pos: 'adjectives' },
    { en: 'comfortable', ru: 'Удобный', uk: 'Зручний', pos: 'adjectives' },
    { en: 'warm', ru: 'Теплый', uk: 'Теплий', pos: 'adjectives' },
    { en: 'boring', ru: 'Скучный', uk: 'Нудний', pos: 'adjectives' },
    { en: 'cheap', ru: 'Дешевый', uk: 'Дешевий', pos: 'adjectives' },
    { en: 'cold', ru: 'Холодный', uk: 'Холодний', pos: 'adjectives' },
    { en: 'powerful', ru: 'Мощный', uk: 'Потужний', pos: 'adjectives' },
    { en: 'golden', ru: 'Золотой', uk: 'Золотий', pos: 'adjectives' },
    { en: 'tasty', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'secret', ru: 'Секретный', uk: 'Секретний', pos: 'adjectives' },
    { en: 'beautiful', ru: 'Красивый', uk: 'Красивий', pos: 'adjectives' },
    { en: 'heavy', ru: 'Тяжелый', uk: 'Важкий', pos: 'adjectives' },
    { en: 'official', ru: 'Официальный', uk: 'Офіційний', pos: 'adjectives' },
    { en: 'extra', ru: 'Лишний (дополнительный)', uk: 'Зайвий (додатковий)', pos: 'adjectives' },
    { en: 'pleasant', ru: 'Приятный', uk: 'Приємний', pos: 'adjectives' },
    { en: 'big', ru: 'Большой', uk: 'Великий', pos: 'adjectives' },
    { en: 'leather', ru: 'Кожаный', uk: 'Шкіряний', pos: 'adjectives' },
    // Adverbs
    { en: 'tomorrow', ru: 'Завтра', uk: 'Завтра', pos: 'adverbs' },
    { en: 'soon', ru: 'Скоро', uk: 'Скоро', pos: 'adverbs' },
    { en: 'later', ru: 'Позже', uk: 'Пізніше', pos: 'adverbs' },
    { en: 'today', ru: 'Сегодня', uk: 'Сьогодні', pos: 'adverbs' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', pos: 'adverbs' },
    { en: 'much', ru: 'Много (с неисчисляемыми)', uk: 'Багато (з незлічуваними)', pos: 'adverbs' },
  ],
  14: [
    { en: 'movie', ru: 'Фильм', uk: 'Фільм', pos: 'nouns' },
    { en: 'interesting', ru: 'Интересный', uk: 'Цікавий', pos: 'adjectives' },
    { en: 'look', ru: 'Выглядеть', uk: 'Виглядати', pos: 'verbs' },
    { en: 'happy', ru: 'Счастливый', uk: 'Щасливий', pos: 'adjectives' },
    { en: 'cheap', ru: 'Дешевый', uk: 'Дешевий', pos: 'adjectives' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', pos: 'nouns' },
    { en: 'tall', ru: 'Высокий', uk: 'Високий', pos: 'adjectives' },
    { en: 'expensive', ru: 'Дорогой', uk: 'Дорогий', pos: 'adjectives' },
    { en: 'slow', ru: 'Медленный', uk: 'Повільний', pos: 'adjectives' },
    { en: 'short', ru: 'Короткий', uk: 'Короткий', pos: 'adjectives' },
    { en: 'way', ru: 'Путь', uk: 'Шлях', pos: 'nouns' },
    { en: 'comfortable', ru: 'Удобный', uk: 'Зручний', pos: 'adjectives' },
    { en: 'shoe', ru: 'Туфля', uk: 'Туфля', pos: 'nouns' },
    { en: 'big', ru: 'Большой', uk: 'Великий', pos: 'adjectives' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', pos: 'nouns' },
    { en: 'feel', ru: 'Чувствовать', uk: 'Відчувати', pos: 'verbs' },
    { en: 'better', ru: 'Лучше', uk: 'Краще', pos: 'adverbs' },
    { en: 'beautiful', ru: 'Красивый', uk: 'Красивий', pos: 'adjectives' },
    { en: 'dress', ru: 'Платье', uk: 'Сукня', pos: 'nouns' },
    { en: 'powerful', ru: 'Мощный', uk: 'Потужний', pos: 'adjectives' },
    { en: 'flashlight', ru: 'Фонарик', uk: 'Ліхтарик', pos: 'nouns' },
    { en: 'safe', ru: 'Безопасный', uk: 'Безпечний', pos: 'adjectives' },
    { en: 'place', ru: 'Место', uk: 'Місце', pos: 'nouns' },
    { en: 'prepare', ru: 'Готовить', uk: 'Готувати', pos: 'verbs' },
    { en: 'spicy', ru: 'Острый', uk: 'Гострий', pos: 'adjectives' },
    { en: 'sauce', ru: 'Соус', uk: 'Соус', pos: 'nouns' },
    { en: 'heavy', ru: 'Тяжелый', uk: 'Важкий', pos: 'adjectives' },
    { en: 'box', ru: 'Коробка', uk: 'Коробка', pos: 'nouns' },
    { en: 'fast', ru: 'Быстрый', uk: 'Швидкий', pos: 'adjectives' },
    { en: 'light', ru: 'Легкий', uk: 'Легкий', pos: 'adjectives' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', pos: 'nouns' },
    { en: 'fresh', ru: 'Свежий', uk: 'Свіжий', pos: 'adjectives' },
    { en: 'fish', ru: 'Рыба', uk: 'Риба', pos: 'nouns' },
    { en: 'serious', ru: 'Серьезный', uk: 'Серйозний', pos: 'adjectives' },
    { en: 'ripe', ru: 'Спелый', uk: 'Стиглий', pos: 'adjectives' },
    { en: 'apple', ru: 'Яблоко', uk: 'Яблуко', pos: 'nouns' },
    { en: 'quiet', ru: 'Тихий', uk: 'Тихий', pos: 'adjectives' },
    { en: 'room', ru: 'Комната', uk: 'Кімната', pos: 'nouns' },
    { en: 'job', ru: 'Работа', uk: 'Робота', pos: 'nouns' },
    { en: 'soft', ru: 'Мягкий', uk: 'М\'який', pos: 'adjectives' },
    { en: 'bread', ru: 'Хлеб', uk: 'Хліб', pos: 'nouns' },
    { en: 'bright', ru: 'Яркий', uk: 'Яскравий', pos: 'adjectives' },
    { en: 'color', ru: 'Цвет', uk: 'Колір', pos: 'nouns' },
    { en: 'thin', ru: 'Тонкий', uk: 'Тонкий', pos: 'adjectives' },
    { en: 'notebook', ru: 'Тетрадь', uk: 'Зошит', pos: 'nouns' },
    { en: 'home', ru: 'Дом', uk: 'Дім', pos: 'nouns' },
    { en: 'wide', ru: 'Широкий', uk: 'Широкий', pos: 'adjectives' },
    { en: 'bed', ru: 'Кровать', uk: 'Ліжко', pos: 'nouns' },
    { en: 'cold', ru: 'Холодный', uk: 'Холодний', pos: 'adjectives' },
    { en: 'water', ru: 'Вода', uk: 'Вода', pos: 'nouns' },
    { en: 'deep', ru: 'Глубокий', uk: 'Глибокий', pos: 'adjectives' },
    { en: 'lake', ru: 'Озеро', uk: 'Озеро', pos: 'nouns' },
    { en: 'juicy', ru: 'Сочный', uk: 'Соковитий', pos: 'adjectives' },
    { en: 'pear', ru: 'Груша', uk: 'Груша', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', pos: 'nouns' },
    { en: 'beach', ru: 'Пляж', uk: 'Пляж', pos: 'nouns' },
    { en: 'hot', ru: 'Острый (о вкусе)', uk: 'Гострий', pos: 'adjectives' },
    { en: 'mustard', ru: 'Горчица', uk: 'Гірчиця', pos: 'nouns' },
    { en: 'bitter', ru: 'Горький', uk: 'Гіркий', pos: 'adjectives' },
    { en: 'chocolate', ru: 'Шоколад', uk: 'Шоколад', pos: 'nouns' },
    { en: 'armchair', ru: 'Кресло', uk: 'Крісло', pos: 'nouns' },
    { en: 'tasty', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'soup', ru: 'Суп', uk: 'Суп', pos: 'nouns' },
    { en: 'dark', ru: 'Темный', uk: 'Темний', pos: 'adjectives' },
    { en: 'suit', ru: 'Костюм', uk: 'Костюм', pos: 'nouns' },
    { en: 'salty', ru: 'Соленый', uk: 'Солоний', pos: 'adjectives' },
    { en: 'snack', ru: 'Закуска', uk: 'Закуска', pos: 'nouns' },
    { en: 'narrow', ru: 'Узкий', uk: 'Вузький', pos: 'adjectives' },
    { en: 'passage', ru: 'Проход', uk: 'Прохід', pos: 'nouns' },
    { en: 'grape', ru: 'Виноград', uk: 'Виноград', pos: 'nouns' },
    { en: 'road', ru: 'Дорога', uk: 'Дорога', pos: 'nouns' },
    { en: 'bridge', ru: 'Мост', uk: 'Міст', pos: 'nouns' },
    { en: 'lantern', ru: 'Фонарь', uk: 'Ліхтар', pos: 'nouns' },
    { en: 'yard', ru: 'Двор', uk: 'Двір', pos: 'nouns' },
    { en: 'juice', ru: 'Сок', uk: 'Сік', pos: 'nouns' },
    { en: 'small', ru: 'Маленький', uk: 'Маленький', pos: 'adjectives' },
    { en: 'shop', ru: 'Магазин', uk: 'Магазин', pos: 'nouns' },
    { en: 'clean', ru: 'Чистый', uk: 'Чистий', pos: 'adjectives' },
    { en: 'river', ru: 'Река', uk: 'Річка', pos: 'nouns' },
    { en: 'pillow', ru: 'Подушка', uk: 'Подушка', pos: 'nouns' },
    { en: 'suitcase', ru: 'Чемодан', uk: 'Валіза', pos: 'nouns' },
    { en: 'long', ru: 'Длинный', uk: 'Довгий', pos: 'adjectives' },
    { en: 'mirror', ru: 'Зеркало', uk: 'Дзеркало', pos: 'nouns' },
    { en: 'bathroom', ru: 'Ванная комната', uk: 'Ванна кімната', pos: 'nouns' },
    { en: 'apartment', ru: 'Квартира', uk: 'Квартира', pos: 'nouns' },
    { en: 'orange', ru: 'Апельсин', uk: 'Апельсин', pos: 'nouns' },
    { en: 'large', ru: 'Большой', uk: 'Великий', pos: 'adjectives' },
    { en: 'basket', ru: 'Корзина', uk: 'Кошик', pos: 'nouns' },
  ],
  15: [
    { en: 'umbrella', ru: 'Зонт', uk: 'Парасоля', pos: 'nouns' },
    { en: 'leather', ru: 'Кожа (материал)', uk: 'Шкіра (матеріал)', pos: 'nouns' },
    { en: 'glove', ru: 'Перчатка', uk: 'Рукавичка', pos: 'nouns' },
    { en: 'empty', ru: 'Пустой', uk: 'Порожній', pos: 'adjectives' },
    { en: 'glass', ru: 'Стакан', uk: 'Склянка', pos: 'nouns' },
    { en: 'broken', ru: 'Сломанный', uk: 'Зламаний', pos: 'adjectives' },
    { en: 'chair', ru: 'Стул', uk: 'Стілець', pos: 'nouns' },
    { en: 'cozy', ru: 'Уютный', uk: 'Затишний', pos: 'adjectives' },
    { en: 'house', ru: 'Дом', uk: 'Будинок', pos: 'nouns' },
    { en: 'modern', ru: 'Современный', uk: 'Сучасний', pos: 'adjectives' },
    { en: 'office', ru: 'Офис', uk: 'Офіс', pos: 'nouns' },
    { en: 'building', ru: 'Здание', uk: 'Будівля', pos: 'nouns' },
    { en: 'silver', ru: 'Серебряный', uk: 'Срібний', pos: 'adjectives' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', pos: 'nouns' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', pos: 'adjectives' },
    { en: 'document', ru: 'Документ', uk: 'Документ', pos: 'nouns' },
    { en: 'folder', ru: 'Папка', uk: 'Папка', pos: 'nouns' },
    { en: 'ripe', ru: 'Спелый', uk: 'Стиглий', pos: 'adjectives' },
    { en: 'red', ru: 'Красный', uk: 'Червоний', pos: 'adjectives' },
    { en: 'tomato', ru: 'Помидор', uk: 'Томат', pos: 'nouns' },
    { en: 'white', ru: 'Белый', uk: 'Білий', pos: 'adjectives' },
    { en: 'envelope', ru: 'Конверт', uk: 'Конверт', pos: 'nouns' },
    { en: 'plastic', ru: 'Пластиковый', uk: 'Пластиковий', pos: 'adjectives' },
    { en: 'container', ru: 'Контейнер', uk: 'Контейнер', pos: 'nouns' },
    { en: 'expensive', ru: 'Дорогой', uk: 'Дорогий', pos: 'adjectives' },
    { en: 'wireless', ru: 'Беспроводной', uk: 'Бездротовий', pos: 'adjectives' },
    { en: 'headphones', ru: 'Наушники', uk: 'Навушники', pos: 'nouns' },
    { en: 'wooden', ru: 'Деревянный', uk: 'Дерев\'яний', pos: 'adjectives' },
    { en: 'fence', ru: 'Забор', uk: 'Паркан', pos: 'nouns' },
    { en: 'towel', ru: 'Полотенце', uk: 'Рушник', pos: 'nouns' },
    { en: 'bathroom', ru: 'Ванная комната', uk: 'Ванна кімната', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелек', uk: 'Гаманець', pos: 'nouns' },
    { en: 'soft', ru: 'Мягкий', uk: 'М\'який', pos: 'adjectives' },
    { en: 'woolen', ru: 'Шерстяной', uk: 'Вовняний', pos: 'adjectives' },
    { en: 'blanket', ru: 'Одеяло', uk: 'Ковдра', pos: 'nouns' },
    { en: 'reliable', ru: 'Надежный', uk: 'Надійний', pos: 'adjectives' },
    { en: 'steel', ru: 'Стальной', uk: 'Сталевий', pos: 'adjectives' },
    { en: 'lock', ru: 'Замок', uk: 'Замок', pos: 'nouns' },
    { en: 'useful', ru: 'Полезный', uk: 'Корисний', pos: 'adjectives' },
    { en: 'tool', ru: 'Инструмент', uk: 'Інструмент', pos: 'nouns' },
    { en: 'salty', ru: 'Соленый', uk: 'Солоний', pos: 'adjectives' },
    { en: 'crunchy', ru: 'Хрустящий', uk: 'Хрусткий', pos: 'adjectives' },
    { en: 'nut', ru: 'Орех', uk: 'Горіх', pos: 'nouns' },
    { en: 'heavy', ru: 'Тяжелый', uk: 'Важкий', pos: 'adjectives' },
    { en: 'metal', ru: 'Металлический', uk: 'Металевий', pos: 'adjectives' },
    { en: 'hammer', ru: 'Молоток', uk: 'Молоток', pos: 'nouns' },
    { en: 'bitter', ru: 'Горький', uk: 'Гіркий', pos: 'adjectives' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', pos: 'nouns' },
    { en: 'sharp', ru: 'Острый', uk: 'Гострий', pos: 'adjectives' },
    { en: 'kitchen', ru: 'Кухня', uk: 'Кухня', pos: 'nouns' },
    { en: 'knife', ru: 'Нож', uk: 'Ніж', pos: 'nouns' },
    { en: 'sofa', ru: 'Диван', uk: 'Диван', pos: 'nouns' },
    { en: 'silk', ru: 'Шелковый', uk: 'Шовковий', pos: 'adjectives' },
    { en: 'ribbon', ru: 'Лента', uk: 'Стрічка', pos: 'nouns' },
    { en: 'dirty', ru: 'Грязный', uk: 'Брудний', pos: 'adjectives' },
    { en: 'unmanned', ru: 'Беспилотный', uk: 'Безпілотний', pos: 'adjectives' },
    { en: 'drone', ru: 'Дрон', uk: 'Дрон', pos: 'nouns' },
    { en: 'account', ru: 'Аккаунт', uk: 'Акаунт', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', pos: 'nouns' },
    { en: 'crumbs', ru: 'Крошки', uk: 'Крихти', pos: 'nouns' },
    { en: 'floor', ru: 'Пол', uk: 'Підлога', pos: 'nouns' },
    { en: 'wall', ru: 'Стена', uk: 'Стіна', pos: 'nouns' },
    { en: 'clock', ru: 'Часы (настенные)', uk: 'Годинник', pos: 'nouns' },
    { en: 'hook', ru: 'Крючок', uk: 'Гачок', pos: 'nouns' },
    { en: 'external', ru: 'Внешний', uk: 'Зовнішній', pos: 'adjectives' },
    { en: 'battery', ru: 'Аккумулятор', uk: 'Акумулятор', pos: 'nouns' },
    { en: 'strong', ru: 'Сильный', uk: 'Сильний', pos: 'adjectives' },
    { en: 'unpleasant', ru: 'Неприятный', uk: 'Неприємний', pos: 'adjectives' },
    { en: 'smell', ru: 'Запах', uk: 'Запах', pos: 'nouns' },
    { en: 'thin', ru: 'Тонкий', uk: 'Тонкий', pos: 'adjectives' },
    { en: 'golden', ru: 'Золотой', uk: 'Золотий', pos: 'adjectives' },
    { en: 'ring', ru: 'Кольцо', uk: 'Каблучка', pos: 'nouns' },
    { en: 'dusty', ru: 'Пыльный', uk: 'Запилений', pos: 'adjectives' },
    { en: 'attic', ru: 'Чердак', uk: 'Горище', pos: 'nouns' },
    { en: 'curtain', ru: 'Штора', uk: 'Штора', pos: 'nouns' },
    { en: 'living room', ru: 'Гостиная', uk: 'Вітальня', pos: 'nouns' },
    { en: 'spicy', ru: 'Острый (пряный)', uk: 'Гострий (пряний)', pos: 'adjectives' },
    { en: 'soy', ru: 'Соевый', uk: 'Соєвий', pos: 'adjectives' },
    { en: 'sauce', ru: 'Соус', uk: 'Соус', pos: 'nouns' },
    { en: 'spare', ru: 'Запасной', uk: 'Запасний', pos: 'adjectives' },
    { en: 'boot', ru: 'Сапог', uk: 'Чобіт', pos: 'nouns' },
    { en: 'round', ru: 'Круглый', uk: 'Круглий', pos: 'adjectives' },
    { en: 'rug', ru: 'Коврик', uk: 'Килимок', pos: 'nouns' },
    { en: 'oat', ru: 'Овсяный', uk: 'Вівсяний', pos: 'adjectives' },
    { en: 'cookie', ru: 'Печенье', uk: 'Печиво', pos: 'nouns' },
    { en: 'scarf', ru: 'Платок (шарф)', uk: 'Хустка (шарф)', pos: 'nouns' },
    { en: 'sweater', ru: 'Свитер', uk: 'Светр', pos: 'nouns' },
    { en: 'mouse', ru: 'Мышь (компьютерная)', uk: 'Миша (комп\'ютерна)', pos: 'nouns' },
    { en: 'backpack', ru: 'Рюкзак', uk: 'Рюкзак', pos: 'nouns' },
    { en: 'map', ru: 'Карта', uk: 'Карта', pos: 'nouns' },
    { en: 'yellow', ru: 'Желтый', uk: 'Жовтий', pos: 'adjectives' },
    { en: 'banana', ru: 'Банан', uk: 'Банан', pos: 'nouns' },
    { en: 'iron', ru: 'Железный', uk: 'Залізний', pos: 'adjectives' },
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
    { en: 'late', ru: 'Поздно', uk: 'Пізно', pos: 'adverbs' },
    { en: 'together', ru: 'Вместе', uk: 'Разом', pos: 'adverbs' },
    { en: 'personally', ru: 'Лично', uk: 'Особисто', pos: 'adverbs' },
    { en: 'without', ru: 'Без', uk: 'Без', pos: 'adverbs' },
    { en: 'warm', ru: 'Теплый', uk: 'Теплий', pos: 'adjectives' },
    { en: 'uncomfortable', ru: 'Неудобный', uk: 'Незручний', pos: 'adjectives' },
    { en: 'empty', ru: 'Пустой', uk: 'Порожній', pos: 'adjectives' },
    { en: 'noisy', ru: 'Шумный', uk: 'Шумний', pos: 'adjectives' },
    { en: 'soft', ru: 'Мягкий', uk: 'М\'який', pos: 'adjectives' },
    { en: 'reliable', ru: 'Надежный', uk: 'Надійний', pos: 'adjectives' },
    { en: 'polite', ru: 'Вежливый', uk: 'Ввічливий', pos: 'adjectives' },
    { en: 'free', ru: 'Бесплатный', uk: 'Безкоштовний', pos: 'adjectives' },
    { en: 'leather', ru: 'Кожаный', uk: 'Шкіряний', pos: 'adjectives' },
    { en: 'cozy', ru: 'Уютный', uk: 'Затишний', pos: 'adjectives' },
    { en: 'boring', ru: 'Скучный', uk: 'Нудний', pos: 'adjectives' },
    { en: 'dirty', ru: 'Грязный', uk: 'Брудний', pos: 'adjectives' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', pos: 'adjectives' },
    { en: 'kind', ru: 'Добрый', uk: 'Добрий', pos: 'adjectives' },
    { en: 'quiet', ru: 'Тихий', uk: 'Тихий', pos: 'adjectives' },
    { en: 'delicious', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'protective', ru: 'Защитный', uk: 'Захисний', pos: 'adjectives' },
    { en: 'heavy', ru: 'Тяжелый', uk: 'Важкий', pos: 'adjectives' },
    { en: 'experienced', ru: 'Опытный', uk: 'Досвідчений', pos: 'adjectives' },
    { en: 'technical', ru: 'Технический', uk: 'Технічний', pos: 'adjectives' },
    { en: 'wet', ru: 'Мокрый', uk: 'Мокрий', pos: 'adjectives' },
    { en: 'sharp', ru: 'Острый', uk: 'Гострий', pos: 'adjectives' },
    { en: 'ripe', ru: 'Спелый', uk: 'Стиглий', pos: 'adjectives' },
    { en: 'secret', ru: 'Секретный', uk: 'Секретний', pos: 'adjectives' },
    { en: 'rare', ru: 'Редкий', uk: 'Рідкісний', pos: 'adjectives' },
    { en: 'necessary', ru: 'Необходимый', uk: 'Необхідний', pos: 'adjectives' },
    { en: 'woollen', ru: 'Шерстяной', uk: 'Вовняний', pos: 'adjectives' },
    { en: 'honest', ru: 'Честный', uk: 'Чесний', pos: 'adjectives' },
    { en: 'stuffy', ru: 'Душный', uk: 'Душний', pos: 'adjectives' },
    { en: 'modern', ru: 'Современный', uk: 'Сучасний', pos: 'adjectives' },
    { en: 'correct', ru: 'Правильный', uk: 'Правильний', pos: 'adjectives' },
    { en: 'plastic', ru: 'Пластиковый', uk: 'Пластиковий', pos: 'adjectives' },
    { en: 'paper', ru: 'Бумажный', uk: 'Паперовий', pos: 'adjectives' },
    { en: 'lost', ru: 'Потерянный', uk: 'Загублений', pos: 'adjectives' },
    { en: 'winter', ru: 'Зима (зимний)', uk: 'Зима (зимовий)', pos: 'nouns' },
    { en: 'coat', ru: 'Пальто', uk: 'Пальто', pos: 'nouns' },
    { en: 'shoe', ru: 'Туфля (обувь)', uk: 'Туфля (взуття)', pos: 'nouns' },
    { en: 'city', ru: 'Город', uk: 'Місто', pos: 'nouns' },
    { en: 'taxi', ru: 'Такси', uk: 'Таксі', pos: 'nouns' },
    { en: 'building', ru: 'Здание', uk: 'Будівля', pos: 'nouns' },
    { en: 'light', ru: 'Свет', uk: 'Світло', pos: 'nouns' },
    { en: 'computer', ru: 'Компьютер', uk: 'Комп\'ютер', pos: 'nouns' },
    { en: 'sofa', ru: 'Диван', uk: 'Диван', pos: 'nouns' },
    { en: 'guard', ru: 'Охранник', uk: 'Охоронець', pos: 'nouns' },
    { en: 'entrance', ru: 'Вход', uk: 'Вхід', pos: 'nouns' },
    { en: 'magazine', ru: 'Журнал', uk: 'Журнал', pos: 'nouns' },
    { en: 'leaflet', ru: 'Листовка', uk: 'Листівка', pos: 'nouns' },
    { en: 'jacket', ru: 'Куртка', uk: 'Куртка', pos: 'nouns' },
    { en: 'data', ru: 'Данные', uk: 'Дані', pos: 'nouns' },
    { en: 'shop', ru: 'Магазин', uk: 'Магазин', pos: 'nouns' },
    { en: 'way', ru: 'Путь', uk: 'Шлях', pos: 'nouns' },
    { en: 'library', ru: 'Библиотека', uk: 'Бібліотека', pos: 'nouns' },
    { en: 'plate', ru: 'Тарелка', uk: 'Тарілка', pos: 'nouns' },
    { en: 'company', ru: 'Компания', uk: 'Компанія', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', pos: 'nouns' },
    { en: 'armchair', ru: 'Кресло', uk: 'Крісло', pos: 'nouns' },
    { en: 'neighbor', ru: 'Сосед', uk: 'Сусід', pos: 'nouns' },
    { en: 'garden', ru: 'Сад', uk: 'Сад', pos: 'nouns' },
    { en: 'client', ru: 'Клиент', uk: 'Клієнт', pos: 'nouns' },
    { en: 'kitchen', ru: 'Кухня', uk: 'Кухня', pos: 'nouns' },
    { en: 'village', ru: 'Деревня', uk: 'Село', pos: 'nouns' },
    { en: 'dish', ru: 'Блюдо', uk: 'Страва', pos: 'nouns' },
    { en: 'guest', ru: 'Гость', uk: 'Гість', pos: 'nouns' },
    { en: 'glove', ru: 'Перчатка', uk: 'Рукавичка', pos: 'nouns' },
    { en: 'apartment', ru: 'Квартира', uk: 'Квартира', pos: 'nouns' },
    { en: 'master', ru: 'Мастер', uk: 'Майстер', pos: 'nouns' },
    { en: 'corner', ru: 'Угол', uk: 'Ріг', pos: 'nouns' },
    { en: 'clothing', ru: 'Одежда', uk: 'Одяг', pos: 'nouns' },
    { en: 'chair', ru: 'Стул', uk: 'Стілець', pos: 'nouns' },
    { en: 'break', ru: 'Перерыв', uk: 'Перерва', pos: 'nouns' },
    { en: 'courier', ru: 'Курьер', uk: 'Кур\'єр', pos: 'nouns' },
    { en: 'parcel', ru: 'Посылка', uk: 'Посилка', pos: 'nouns' },
    { en: 'coin', ru: 'Монета', uk: 'Монета', pos: 'nouns' },
    { en: 'forest', ru: 'Лес', uk: 'Ліс', pos: 'nouns' },
    { en: 'knife', ru: 'Нож', uk: 'Ніж', pos: 'nouns' },
    { en: 'cupboard', ru: 'Шкаф (для посуды)', uk: 'Шафа (для посуду)', pos: 'nouns' },
    { en: 'grass', ru: 'Трава', uk: 'Трава', pos: 'nouns' },
    { en: 'rule', ru: 'Правило', uk: 'Правило', pos: 'nouns' },
    { en: 'colleague', ru: 'Коллега', uk: 'Колега', pos: 'nouns' },
    { en: 'tableware', ru: 'Посуда', uk: 'Посуд', pos: 'nouns' },
    { en: 'sink', ru: 'Раковина', uk: 'Раковина', pos: 'nouns' },
    { en: 'sock', ru: 'Носок', uk: 'Шкарпетка', pos: 'nouns' },
    { en: 'folder', ru: 'Папка', uk: 'Папка', pos: 'nouns' },
    { en: 'afternoon', ru: 'День (время после полудня)', uk: 'День (після полудня)', pos: 'nouns' },
    { en: 'owner', ru: 'Владелец', uk: 'Власник', pos: 'nouns' },
    { en: 'office', ru: 'Офис', uk: 'Офіс', pos: 'nouns' },
    { en: 'machine', ru: 'Машина (механизм)', uk: 'Машина (механізм)', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', pos: 'nouns' },
    { en: 'bottle', ru: 'Бутылка', uk: 'Пляшка', pos: 'nouns' },
  ],
  17: [
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', pos: 'verbs' },
    { en: 'repair', ru: 'Ремонтировать', uk: 'Ремонтувати', pos: 'verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', pos: 'verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', pos: 'verbs' },
    { en: 'paint', ru: 'Рисовать (красками)', uk: 'Малювати (фарбами)', pos: 'verbs' },
    { en: 'build', ru: 'Строить', uk: 'Будувати', pos: 'verbs' },
    { en: 'wash', ru: 'Мыть', uk: 'Мити', pos: 'verbs' },
    { en: 'discuss', ru: 'Обсуждать', uk: 'Обговорювати', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', pos: 'verbs' },
    { en: 'translate', ru: 'Переводить', uk: 'Перекладати', pos: 'verbs' },
    { en: 'bring', ru: 'Приносить', uk: 'Приносити', pos: 'verbs' },
    { en: 'choose', ru: 'Выбирать', uk: 'Обирати', pos: 'verbs' },
    { en: 'pour', ru: 'Наливать', uk: 'Наливати', pos: 'verbs' },
    { en: 'carry', ru: 'Нести (переносить)', uk: 'Нести', pos: 'verbs' },
    { en: 'cut', ru: 'Резать', uk: 'Різати', pos: 'verbs' },
    { en: 'hang', ru: 'Вешать', uk: 'Вішати', pos: 'verbs' },
    { en: 'water', ru: 'Поливать (водой)', uk: 'Поливати', pos: 'verbs' },
    { en: 'throw', ru: 'Бросать', uk: 'Кидати', pos: 'verbs' },
    { en: 'pick', ru: 'Выбирать (собирать)', uk: 'Обирати (збирати)', pos: 'verbs' },
    { en: 'deliver', ru: 'Доставлять', uk: 'Доставляти', pos: 'verbs' },
    { en: 'cross', ru: 'Переходить (пересекать)', uk: 'Переходити', pos: 'verbs' },
    { en: 'sign', ru: 'Подписывать', uk: 'Підписувати', pos: 'verbs' },
    { en: 'fix', ru: 'Чинить', uk: 'Лагодити', pos: 'verbs' },
    { en: 'slice', ru: 'Нарезать (ломтиками)', uk: 'Нарізати', pos: 'verbs' },
    { en: 'draw', ru: 'Рисовать (карандашом/линиями)', uk: 'Малювати', pos: 'verbs' },
    { en: 'brew', ru: 'Заваривать', uk: 'Заварювати', pos: 'verbs' },
    { en: 'explain', ru: 'Объяснять', uk: 'Пояснювати', pos: 'verbs' },
    { en: 'create', ru: 'Создавать', uk: 'Створювати', pos: 'verbs' },
    { en: 'trim', ru: 'Подрезать', uk: 'Підрізати', pos: 'verbs' },
    { en: 'clean', ru: 'Чистить', uk: 'Чистити', pos: 'verbs' },
    { en: 'pack', ru: 'Упаковывать', uk: 'Пакувати', pos: 'verbs' },
    { en: 'set', ru: 'Накрывать (на стол)', uk: 'Накривати', pos: 'verbs' },
    { en: 'hardworking', ru: 'Трудолюбивый', uk: 'Працьовитий', pos: 'adjectives' },
    { en: 'modern', ru: 'Современный', uk: 'Сучасний', pos: 'adjectives' },
    { en: 'huge', ru: 'Огромный', uk: 'Величезний', pos: 'adjectives' },
    { en: 'fragile', ru: 'Хрупкий', uk: 'Крихкий', pos: 'adjectives' },
    { en: 'fresh', ru: 'Свежий', uk: 'Свіжий', pos: 'adjectives' },
    { en: 'comfortable', ru: 'Удобный (комфортный)', uk: 'Зручний', pos: 'adjectives' },
    { en: 'attentive', ru: 'Внимательный', uk: 'Уважний', pos: 'adjectives' },
    { en: 'hot', ru: 'Горячий', uk: 'Гарячий', pos: 'adjectives' },
    { en: 'cold', ru: 'Холодный', uk: 'Холодний', pos: 'adjectives' },
    { en: 'cozy', ru: 'Уютный', uk: 'Затишний', pos: 'adjectives' },
    { en: 'strong', ru: 'Сильный', uk: 'Сильний', pos: 'adjectives' },
    { en: 'heavy', ru: 'Тяжелый', uk: 'Важкий', pos: 'adjectives' },
    { en: 'classical', ru: 'Классический', uk: 'Класичний', pos: 'adjectives' },
    { en: 'wireless', ru: 'Беспроводной', uk: 'Бездротовий', pos: 'adjectives' },
    { en: 'juicy', ru: 'Сочный', uk: 'Соковитий', pos: 'adjectives' },
    { en: 'ancient', ru: 'Древний (старинный)', uk: 'Стародавній', pos: 'adjectives' },
    { en: 'stylish', ru: 'Стильный', uk: 'Стильний', pos: 'adjectives' },
    { en: 'dark', ru: 'Темный', uk: 'Темний', pos: 'adjectives' },
    { en: 'urgent', ru: 'Срочный', uk: 'Терміновий', pos: 'adjectives' },
    { en: 'busy', ru: 'Оживленный', uk: 'Жвавий', pos: 'adjectives' },
    { en: 'quiet', ru: 'Тихий', uk: 'Тихий', pos: 'adjectives' },
    { en: 'ripe', ru: 'Спелый', uk: 'Стиглий', pos: 'adjectives' },
    { en: 'skillful', ru: 'Умелый', uk: 'Вмілий', pos: 'adjectives' },
    { en: 'tall', ru: 'Высокий', uk: 'Високий', pos: 'adjectives' },
    { en: 'deep', ru: 'Глубокий', uk: 'Глибокий', pos: 'adjectives' },
    { en: 'reliable', ru: 'Надежный', uk: 'Надійний', pos: 'adjectives' },
    { en: 'sweet', ru: 'Сладкий', uk: 'Солодкий', pos: 'adjectives' },
    { en: 'homemade', ru: 'Домашний (самодельный)', uk: 'Домашній', pos: 'adjectives' },
    { en: 'porcelain', ru: 'Фарфоровый', uk: 'Порцеляновий', pos: 'adjectives' },
    { en: 'secure', ru: 'Безопасный', uk: 'Безпечний', pos: 'adjectives' },
    { en: 'unique', ru: 'Уникальный', uk: 'Унікальний', pos: 'adjectives' },
    { en: 'convenient', ru: 'Удобный', uk: 'Зручний', pos: 'adjectives' },
    { en: 'bright', ru: 'Светлый (яркий)', uk: 'Світлий', pos: 'adjectives' },
    { en: 'complex', ru: 'Сложный', uk: 'Складний', pos: 'adjectives' },
    { en: 'difficult', ru: 'Трудный', uk: 'Важкий', pos: 'adjectives' },
    { en: 'soft', ru: 'Мягкий', uk: 'М\'який', pos: 'adjectives' },
    { en: 'local', ru: 'Местный', uk: 'Місцевий', pos: 'adjectives' },
    { en: 'round', ru: 'Круглый', uk: 'Круглий', pos: 'adjectives' },
    { en: 'happily', ru: 'Весело (счастливо)', uk: 'Весело (щасливо)', pos: 'adverbs' },
    { en: 'outside', ru: 'Снаружи (на улице)', uk: 'Зовні (на вулиці)', pos: 'adverbs' },
    { en: 'now', ru: 'Сейчас', uk: 'Зараз', pos: 'adverbs' },
    { en: 'behind', ru: 'Позади (за)', uk: 'Позаду', pos: 'adverbs' },
    { en: 'through', ru: 'Через', uk: 'Через', pos: 'adverbs' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', pos: 'nouns' },
    { en: 'article', ru: 'Статья', uk: 'Стаття', pos: 'nouns' },
    { en: 'newspaper', ru: 'Газета', uk: 'Газета', pos: 'nouns' },
    { en: 'bicycle', ru: 'Велосипед', uk: 'Велосипед', pos: 'nouns' },
    { en: 'garage', ru: 'Гараж', uk: 'Гараж', pos: 'nouns' },
    { en: 'boss', ru: 'Начальник', uk: 'Начальник', pos: 'nouns' },
    { en: 'show', ru: 'Передача (шоу)', uk: 'Передача (шоу)', pos: 'nouns' },
    { en: 'moment', ru: 'Момент', uk: 'Момент', pos: 'nouns' },
    { en: 'picture', ru: 'Картина', uk: 'Картина', pos: 'nouns' },
    { en: 'building', ru: 'Здание', uk: 'Будівля', pos: 'nouns' },
    { en: 'garden', ru: 'Сад', uk: 'Сад', pos: 'nouns' },
    { en: 'condition', ru: 'Условие', uk: 'Умова', pos: 'nouns' },
    { en: 'vegetables', ru: 'Овощи', uk: 'Овочі', pos: 'nouns' },
    { en: 'app', ru: 'Приложение', uk: 'Додаток', pos: 'nouns' },
    { en: 'receptionist', ru: 'Администратор (на ресепшене)', uk: 'Адміністратор', pos: 'nouns' },
    { en: 'booking', ru: 'Бронь (бронирование)', uk: 'Бронювання', pos: 'nouns' },
    { en: 'project', ru: 'Проект', uk: 'Проект', pos: 'nouns' },
    { en: 'skirt', ru: 'Юбка', uk: 'Спідниця', pos: 'nouns' },
    { en: 'truck', ru: 'Грузовик', uk: 'Вантажівка', pos: 'nouns' },
    { en: 'warehouse', ru: 'Склад', uk: 'Склад', pos: 'nouns' },
    { en: 'gift', ru: 'Подарок', uk: 'Подарунок', pos: 'nouns' },
    { en: 'box', ru: 'Коробка', uk: 'Коробка', pos: 'nouns' },
    { en: 'wall', ru: 'Стена', uk: 'Стіна', pos: 'nouns' },
    { en: 'flower', ru: 'Цветок', uk: 'Квітка', pos: 'nouns' },
    { en: 'pot', ru: 'Горшок', uk: 'Горщик', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', pos: 'nouns' },
    { en: 'airport', ru: 'Аэропорт', uk: 'Аеропорт', pos: 'nouns' },
    { en: 'waiter', ru: 'Официант', uk: 'Офіціант', pos: 'nouns' },
    { en: 'pie', ru: 'Пирог', uk: 'Пиріг', pos: 'nouns' },
    { en: 'sofa', ru: 'Диван', uk: 'Диван', pos: 'nouns' },
    { en: 'furniture', ru: 'Мебель', uk: 'Меблі', pos: 'nouns' },
    { en: 'center', ru: 'Центр', uk: 'Центр', pos: 'nouns' },
    { en: 'engineer', ru: 'Инженер', uk: 'Інженер', pos: 'nouns' },
    { en: 'panel', ru: 'Панель', uk: 'Панель', pos: 'nouns' },
    { en: 'roof', ru: 'Крыша', uk: 'Дах', pos: 'nouns' },
    { en: 'juice', ru: 'Сок', uk: 'Сік', pos: 'nouns' },
    { en: 'tumbler', ru: 'Стакан', uk: 'Склянка', pos: 'nouns' },
    { en: 'apartment', ru: 'Квартира', uk: 'Квартира', pos: 'nouns' },
    { en: 'website', ru: 'Сайт', uk: 'Сайт', pos: 'nouns' },
    { en: 'worker', ru: 'Рабочий', uk: 'Робітник', pos: 'nouns' },
    { en: 'tool', ru: 'Инструмент', uk: 'Інструмент', pos: 'nouns' },
    { en: 'workshop', ru: 'Мастерская', uk: 'Майстерня', pos: 'nouns' },
    { en: 'headphones', ru: 'Наушники', uk: 'Навушники', pos: 'nouns' },
    { en: 'chef', ru: 'Повар', uk: 'Кухар', pos: 'nouns' },
    { en: 'tomato', ru: 'Помидор', uk: 'Томат', pos: 'nouns' },
    { en: 'salad', ru: 'Салат', uk: 'Салат', pos: 'nouns' },
    { en: 'guide', ru: 'Гид', uk: 'Гід', pos: 'nouns' },
    { en: 'church', ru: 'Церковь', uk: 'Церква', pos: 'nouns' },
    { en: 'glasses', ru: 'Очки', uk: 'Окуляри', pos: 'nouns' },
    { en: 'mirror', ru: 'Зеркало', uk: 'Дзеркало', pos: 'nouns' },
    { en: 'courier', ru: 'Курьер', uk: 'Кур\'єр', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', pos: 'nouns' },
    { en: 'crossing', ru: 'Переход', uk: 'Перехід', pos: 'nouns' },
    { en: 'contract', ru: 'Контракт', uk: 'Контракт', pos: 'nouns' },
    { en: 'study', ru: 'Кабинет', uk: 'Кабінет', pos: 'nouns' },
    { en: 'coin', ru: 'Монета', uk: 'Монета', pos: 'nouns' },
    { en: 'fountain', ru: 'Фонтан', uk: 'Фонтан', pos: 'nouns' },
    { en: 'strawberry', ru: 'Клубника', uk: 'Полуниця', pos: 'nouns' },
    { en: 'market', ru: 'Рынок', uk: 'Ринок', pos: 'nouns' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', pos: 'nouns' },
    { en: 'corner', ru: 'Угол', uk: 'Куток', pos: 'nouns' },
    { en: 'restaurant', ru: 'Ресторан', uk: 'Ресторан', pos: 'nouns' },
    { en: 'shelf', ru: 'Полка', uk: 'Полиця', pos: 'nouns' },
    { en: 'paper', ru: 'Бумага', uk: 'Папір', pos: 'nouns' },
    { en: 'gardener', ru: 'Садовник', uk: 'Садівник', pos: 'nouns' },
    { en: 'bush', ru: 'Куст', uk: 'Кущ', pos: 'nouns' },
    { en: 'neighbor', ru: 'Сосед', uk: 'Сусід', pos: 'nouns' },
    { en: 'pool', ru: 'Бассейн', uk: 'Басейн', pos: 'nouns' },
    { en: 'backyard', ru: 'Задний двор', uk: 'Задній двір', pos: 'nouns' },
    { en: 'mechanic', ru: 'Механик', uk: 'Механік', pos: 'nouns' },
    { en: 'engine', ru: 'Двигатель', uk: 'Двигун', pos: 'nouns' },
    { en: 'pear', ru: 'Груша', uk: 'Груша', pos: 'nouns' },
    { en: 'dessert', ru: 'Десерт', uk: 'Десерт', pos: 'nouns' },
    { en: 'daughter', ru: 'Дочь', uk: 'Донька', pos: 'nouns' },
    { en: 'castle', ru: 'Замок', uk: 'Замок', pos: 'nouns' },
    { en: 'sheet', ru: 'Лист (бумаги)', uk: 'Аркуш', pos: 'nouns' },
    { en: 'teapot', ru: 'Чайник (для заварки)', uk: 'Чайник', pos: 'nouns' },
    { en: 'vacancy', ru: 'Вакансия', uk: 'Вакансія', pos: 'nouns' },
    { en: 'consultant', ru: 'Консультант', uk: 'Консультант', pos: 'nouns' },
    { en: 'hall', ru: 'Зал', uk: 'Зал', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', pos: 'nouns' },
    { en: 'service', ru: 'Сервис', uk: 'Сервіс', pos: 'nouns' },
    { en: 'architect', ru: 'Архитектор', uk: 'Архітектор', pos: 'nouns' },
    { en: 'design', ru: 'Дизайн', uk: 'Дизайн', pos: 'nouns' },
  ],
  18: [
    { en: 'pass', ru: 'Передавать', uk: 'Передавати', pos: 'verbs' },
    { en: 'press', ru: 'Нажимать', uk: 'Натискати', pos: 'verbs' },
    { en: 'pour', ru: 'Наливать', uk: 'Наливати', pos: 'verbs' },
    { en: 'put', ru: 'Класть', uk: 'Класти', pos: 'verbs' },
    { en: 'discuss', ru: 'Обсуждать', uk: 'Обговорювати', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', pos: 'verbs' },
    { en: 'leave', ru: 'Оставлять', uk: 'Залишати', pos: 'verbs' },
    { en: 'bring', ru: 'Приносить', uk: 'Приносити', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', pos: 'verbs' },
    { en: 'close', ru: 'Закрывать', uk: 'Закривати', pos: 'verbs' },
    { en: 'cut', ru: 'Резать', uk: 'Різати', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', pos: 'verbs' },
    { en: 'meet', ru: 'Встречать', uk: 'Зустрічати', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Відправляти', pos: 'verbs' },
    { en: 'park', ru: 'Парковать', uk: 'Паркувати', pos: 'verbs' },
    { en: 'hang', ru: 'Вешать', uk: 'Вішати', pos: 'verbs' },
    { en: 'drink', ru: 'Пить', uk: 'Пити', pos: 'verbs' },
    { en: 'take', ru: 'Брать', uk: 'Брати', pos: 'verbs' },
    { en: 'choose', ru: 'Выбирать', uk: 'Обирати', pos: 'verbs' },
    { en: 'push', ru: 'Толкать', uk: 'Штовхати', pos: 'verbs' },
    { en: 'show', ru: 'Показывать', uk: 'Показувати', pos: 'verbs' },
    { en: 'invite', ru: 'Приглашать', uk: 'Запрошувати', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', pos: 'verbs' },
    { en: 'feed', ru: 'Кормить', uk: 'Годувати', pos: 'verbs' },
    { en: 'build', ru: 'Строить', uk: 'Будувати', pos: 'verbs' },
    { en: 'hide', ru: 'Прятать', uk: 'Ховати', pos: 'verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', pos: 'verbs' },
    { en: 'throw', ru: 'Бросать', uk: 'Кидати', pos: 'verbs' },
    { en: 'confirm', ru: 'Подтверждать', uk: 'Підтверджувати', pos: 'verbs' },
    { en: 'eat', ru: 'Есть', uk: 'Їсти', pos: 'verbs' },
    { en: 'reserve', ru: 'Резервировать', uk: 'Резервувати', pos: 'verbs' },
    { en: 'touch', ru: 'Трогать', uk: 'Чіпати', pos: 'verbs' },
    { en: 'lose', ru: 'Терять', uk: 'Губити', pos: 'verbs' },
    { en: 'repair', ru: 'Ремонтировать', uk: 'Ремонтувати', pos: 'verbs' },
    { en: 'spend', ru: 'Тратить', uk: 'Витрачати', pos: 'verbs' },
    { en: 'move', ru: 'Двигать', uk: 'Пересувати', pos: 'verbs' },
    { en: 'save', ru: 'Сохранять', uk: 'Зберігати', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', pos: 'verbs' },
    { en: 'clean', ru: 'Чистить', uk: 'Чистити', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', pos: 'verbs' },
    { en: 'break', ru: 'Ломать', uk: 'Ламати', pos: 'verbs' },
    { en: 'open', ru: 'Открывать', uk: 'Відкривати', pos: 'verbs' },
    { en: 'sharp', ru: 'Острый', uk: 'Гострий', pos: 'adjectives' },
    { en: 'fresh', ru: 'Свежий', uk: 'Свіжий', pos: 'adjectives' },
    { en: 'leather', ru: 'Кожаный', uk: 'Шкіряний', pos: 'adjectives' },
    { en: 'quiet', ru: 'Тихий', uk: 'Тихий', pos: 'adjectives' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', pos: 'adjectives' },
    { en: 'official', ru: 'Официальный', uk: 'Офіційний', pos: 'adjectives' },
    { en: 'heavy', ru: 'Тяжёлый', uk: 'Важкий', pos: 'adjectives' },
    { en: 'narrow', ru: 'Узкий', uk: 'Вузький', pos: 'adjectives' },
    { en: 'bright', ru: 'Яркий/Светлый', uk: 'Яскравий/Світлий', pos: 'adjectives' },
    { en: 'convenient', ru: 'Удобный', uk: 'Зручний', pos: 'adjectives' },
    { en: 'hard', ru: 'Твёрдый', uk: 'Твердий', pos: 'adjectives' },
    { en: 'detailed', ru: 'Подробный', uk: 'Докладний', pos: 'adjectives' },
    { en: 'strict', ru: 'Строгий', uk: 'Суворий', pos: 'adjectives' },
    { en: 'private', ru: 'Частный', uk: 'Приватний', pos: 'adjectives' },
    { en: 'winter', ru: 'Зимний', uk: 'Зимовий', pos: 'adjectives' },
    { en: 'cold', ru: 'Холодный', uk: 'Холодний', pos: 'adjectives' },
    { en: 'round', ru: 'Круглый', uk: 'Круглий', pos: 'adjectives' },
    { en: 'comfortable', ru: 'Удобный', uk: 'Зручний', pos: 'adjectives' },
    { en: 'secret', ru: 'Секретный', uk: 'Секретний', pos: 'adjectives' },
    { en: 'experienced', ru: 'Опытный', uk: 'Досвідчений', pos: 'adjectives' },
    { en: 'famous', ru: 'Известный', uk: 'Відомий', pos: 'adjectives' },
    { en: 'strong', ru: 'Сильный', uk: 'Сильний', pos: 'adjectives' },
    { en: 'extra', ru: 'Лишний', uk: 'Зайвий', pos: 'adjectives' },
    { en: 'public', ru: 'Общественный', uk: 'Громадський', pos: 'adjectives' },
    { en: 'expensive', ru: 'Дорогой', uk: 'Дорогий', pos: 'adjectives' },
    { en: 'polite', ru: 'Вежливый', uk: 'Ввічливий', pos: 'adjectives' },
    { en: 'empty', ru: 'Пустой', uk: 'Порожній', pos: 'adjectives' },
    { en: 'broken', ru: 'Сломанный', uk: 'Зламаний', pos: 'adjectives' },
    { en: 'cozy', ru: 'Уютный', uk: 'Затишний', pos: 'adjectives' },
    { en: 'sour', ru: 'Кислый', uk: 'Кислий', pos: 'adjectives' },
    { en: 'thick', ru: 'Густой', uk: 'Густий', pos: 'adjectives' },
    { en: 'noisy', ru: 'Шумный', uk: 'Шумний', pos: 'adjectives' },
    { en: 'precise', ru: 'Точный', uk: 'Точний', pos: 'adjectives' },
    { en: 'useless', ru: 'Бесполезный', uk: 'Марний', pos: 'adjectives' },
    { en: 'spacious', ru: 'Просторный', uk: 'Просторний', pos: 'adjectives' },
    { en: 'external', ru: 'Внешний', uk: 'Зовнішній', pos: 'adjectives' },
    { en: 'spicy', ru: 'Острый (о еде)', uk: 'Гострий (про їжу)', pos: 'adjectives' },
    { en: 'cheap', ru: 'Дешёвый', uk: 'Дешевий', pos: 'adjectives' },
    { en: 'fragile', ru: 'Хрупкий', uk: 'Крихкий', pos: 'adjectives' },
    { en: 'special', ru: 'Специальный', uk: 'Спеціальний', pos: 'adjectives' },
    { en: 'stray', ru: 'Бездомный', uk: 'Бездомний', pos: 'adjectives' },
    { en: 'tasty', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'large', ru: 'Большой', uk: 'Великий', pos: 'adjectives' },
    { en: 'knife', ru: 'Нож', uk: 'Ніж', pos: 'nouns' },
    { en: 'chef', ru: 'Повар', uk: 'Кухар', pos: 'nouns' },
    { en: 'button', ru: 'Кнопка', uk: 'Кнопка', pos: 'nouns' },
    { en: 'panel', ru: 'Панель', uk: 'Панель', pos: 'nouns' },
    { en: 'juice', ru: 'Сок', uk: 'Сік', pos: 'nouns' },
    { en: 'glass', ru: 'Стакан', uk: 'Стакан', pos: 'nouns' },
    { en: 'gloves', ru: 'Перчатки', uk: 'Рукавички', pos: 'nouns' },
    { en: 'drawer', ru: 'Ящик', uk: 'Ящик', pos: 'nouns' },
    { en: 'office', ru: 'Офис', uk: 'Офіс', pos: 'nouns' },
    { en: 'page', ru: 'Страница', uk: 'Сторінка', pos: 'nouns' },
    { en: 'bags', ru: 'Сумки', uk: 'Сумки', pos: 'nouns' },
    { en: 'corridor', ru: 'Коридор', uk: 'Коридор', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', pos: 'nouns' },
    { en: 'study', ru: 'Кабинет', uk: 'Кабінет', pos: 'nouns' },
    { en: 'map', ru: 'Карта', uk: 'Карта', pos: 'nouns' },
    { en: 'shop', ru: 'Магазин', uk: 'Магазин', pos: 'nouns' },
    { en: 'window', ru: 'Окно', uk: 'Вікно', pos: 'nouns' },
    { en: 'cheese', ru: 'Сыр', uk: 'Сир', pos: 'nouns' },
    { en: 'tools', ru: 'Инструменты', uk: 'Інструменти', pos: 'nouns' },
    { en: 'snack', ru: 'Перекус', uk: 'Перекус', pos: 'nouns' },
    { en: 'shoes', ru: 'Туфли', uk: 'Туфлі', pos: 'nouns' },
    { en: 'box', ru: 'Коробка', uk: 'Коробка', pos: 'nouns' },
    { en: 'delegation', ru: 'Делегация', uk: 'Делегація', pos: 'nouns' },
    { en: 'gates', ru: 'Ворота', uk: 'Ворота', pos: 'nouns' },
    { en: 'report', ru: 'Отчёт', uk: 'Звіт', pos: 'nouns' },
    { en: 'manager', ru: 'Менеджер', uk: 'Менеджер', pos: 'nouns' },
    { en: 'exit', ru: 'Выход', uk: 'Вихід', pos: 'nouns' },
    { en: 'coat', ru: 'Пальто', uk: 'Пальто', pos: 'nouns' },
    { en: 'wardrobe', ru: 'Шкаф', uk: 'Шафа', pos: 'nouns' },
    { en: 'water', ru: 'Вода', uk: 'Вода', pos: 'nouns' },
    { en: 'cup', ru: 'Стакан/Кружка', uk: 'Стакан/Кружка', pos: 'nouns' },
    { en: 'newspaper', ru: 'Газета', uk: 'Газета', pos: 'nouns' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', pos: 'nouns' },
    { en: 'armchair', ru: 'Кресло', uk: 'Крісло', pos: 'nouns' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', pos: 'nouns' },
    { en: 'passage', ru: 'Проход', uk: 'Прохід', pos: 'nouns' },
    { en: 'blueprint', ru: 'Чертёж', uk: 'Креслення', pos: 'nouns' },
    { en: 'engineer', ru: 'Инженер', uk: 'Інженер', pos: 'nouns' },
    { en: 'workshop', ru: 'Мастерская', uk: 'Майстерня', pos: 'nouns' },
    { en: 'kettle', ru: 'Чайник', uk: 'Чайник', pos: 'nouns' },
    { en: 'surface', ru: 'Поверхность', uk: 'Поверхня', pos: 'nouns' },
    { en: 'artist', ru: 'Художник', uk: 'Художник', pos: 'nouns' },
    { en: 'event', ru: 'Мероприятие', uk: 'Захід', pos: 'nouns' },
    { en: 'hammer', ru: 'Молоток', uk: 'Молоток', pos: 'nouns' },
    { en: 'worker', ru: 'Рабочий', uk: 'Робітник', pos: 'nouns' },
    { en: 'overalls', ru: 'Спецодежда', uk: 'Спецодяг', pos: 'nouns' },
    { en: 'letter', ru: 'Письмо', uk: 'Лист', pos: 'nouns' },
    { en: 'desk', ru: 'Рабочий стол', uk: 'Робочий стіл', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', pos: 'nouns' },
    { en: 'shelf', ru: 'Полка', uk: 'Полиця', pos: 'nouns' },
    { en: 'hallway', ru: 'Коридор/Прихожая', uk: 'Коридор/Передпокій', pos: 'nouns' },
    { en: 'dog', ru: 'Собака', uk: 'Собака', pos: 'nouns' },
    { en: 'park', ru: 'Парк', uk: 'Парк', pos: 'nouns' },
    { en: 'fence', ru: 'Забор', uk: 'Паркан', pos: 'nouns' },
    { en: 'garden', ru: 'Сад', uk: 'Сад', pos: 'nouns' },
    { en: 'photo', ru: 'Фото', uk: 'Фото', pos: 'nouns' },
    { en: 'sunset', ru: 'Закат', uk: 'Захід сонця', pos: 'nouns' },
    { en: 'camera', ru: 'Камера', uk: 'Камера', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', pos: 'nouns' },
    { en: 'journey', ru: 'Поездка', uk: 'Подорож', pos: 'nouns' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', pos: 'nouns' },
    { en: 'restaurant', ru: 'Ресторан', uk: 'Ресторан', pos: 'nouns' },
    { en: 'lock', ru: 'Замок', uk: 'Замок', pos: 'nouns' },
    { en: 'wicket', ru: 'Калитка', uk: 'Хвіртка', pos: 'nouns' },
    { en: 'gifts', ru: 'Подарки', uk: 'Подарунки', pos: 'nouns' },
    { en: 'fir-tree', ru: 'Ель', uk: 'Ялинка', pos: 'nouns' },
    { en: 'message', ru: 'Сообщение', uk: 'Повідомлення', pos: 'nouns' },
    { en: 'neighbor', ru: 'Сосед', uk: 'Сусід', pos: 'nouns' },
    { en: 'bottle', ru: 'Бутылка', uk: 'Пляшка', pos: 'nouns' },
    { en: 'pavement', ru: 'Тротуар', uk: 'Тротуар', pos: 'nouns' },
    { en: 'booking', ru: 'Бронирование', uk: 'Бронювання', pos: 'nouns' },
    { en: 'link', ru: 'Ссылка', uk: 'Посилання', pos: 'nouns' },
    { en: 'berries', ru: 'Ягоды', uk: 'Ягоди', pos: 'nouns' },
    { en: 'forest', ru: 'Лес', uk: 'Ліс', pos: 'nouns' },
    { en: 'terms', ru: 'Условия', uk: 'Умови', pos: 'nouns' },
    { en: 'computer', ru: 'Компьютер', uk: 'Комп\'ютер', pos: 'nouns' },
    { en: 'shift', ru: 'Смена', uk: 'Зміна', pos: 'nouns' },
    { en: 'parcel', ru: 'Посылка', uk: 'Посилка', pos: 'nouns' },
    { en: 'watches', ru: 'Часы', uk: 'Годинники', pos: 'nouns' },
    { en: 'money', ru: 'Деньги', uk: 'Гроші', pos: 'nouns' },
    { en: 'furniture', ru: 'Мебель', uk: 'Меблі', pos: 'nouns' },
    { en: 'bedroom', ru: 'Спальня', uk: 'Спальня', pos: 'nouns' },
    { en: 'file', ru: 'Файл', uk: 'Файл', pos: 'nouns' },
    { en: 'flash-drive', ru: 'Флешка', uk: 'Флешка', pos: 'nouns' },
    { en: 'food', ru: 'Еда', uk: 'Їжа', pos: 'nouns' },
    { en: 'cafe', ru: 'Кафе', uk: 'Кафе', pos: 'nouns' },
    { en: 'sofa', ru: 'Диван', uk: 'Диван', pos: 'nouns' },
    { en: 'agent', ru: 'Средство', uk: 'Засіб', pos: 'nouns' },
    { en: 'axe', ru: 'Топор', uk: 'Сокира', pos: 'nouns' },
    { en: 'children', ru: 'Дети', uk: 'Діти', pos: 'nouns' },
    { en: 'backyard', ru: 'Задний двор', uk: 'Задній двір', pos: 'nouns' },
    { en: 'lamp', ru: 'Лампа', uk: 'Лампа', pos: 'nouns' },
    { en: 'pie', ru: 'Пирог', uk: 'Пиріг', pos: 'nouns' },
    { en: 'family', ru: 'Семья', uk: 'Сім\'я', pos: 'nouns' },
    { en: 'kitchen', ru: 'Кухня', uk: 'Кухня', pos: 'nouns' },
    { en: 'cupboard', ru: 'Шкаф', uk: 'Шафа', pos: 'nouns' },
  ],
  19: [
    { en: 'lie', ru: 'Лежать', uk: 'Лежати', pos: 'irregular_verbs' },
    { en: 'hang', ru: 'Вешать', uk: 'Вішати', pos: 'irregular_verbs' },
    { en: 'hide', ru: 'Прятаться', uk: 'Ховатися', pos: 'irregular_verbs' },
    { en: 'stand', ru: 'Стоять', uk: 'Стояти', pos: 'irregular_verbs' },
    { en: 'sit', ru: 'Сидеть', uk: 'Сидіти', pos: 'irregular_verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', pos: 'irregular_verbs' },
    { en: 'grow', ru: 'Расти', uk: 'Рости', pos: 'irregular_verbs' },
    { en: 'put', ru: 'Класть', uk: 'Класти', pos: 'irregular_verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', pos: 'irregular_verbs' },
    { en: 'leave', ru: 'Оставлять', uk: 'Залишати', pos: 'irregular_verbs' },
    { en: 'grey', ru: 'Серый', uk: 'Сірий', pos: 'adjectives' },
    { en: 'soft', ru: 'Мягкий', uk: "М'який", pos: 'adjectives' },
    { en: 'black', ru: 'Черный', uk: 'Чорний', pos: 'adjectives' },
    { en: 'tall', ru: 'Высокий', uk: 'Високий', pos: 'adjectives' },
    { en: 'white', ru: 'Белый', uk: 'Білий', pos: 'adjectives' },
    { en: 'wooden', ru: 'Деревянный', uk: "Дерев'яний", pos: 'adjectives' },
    { en: 'low', ru: 'Низкий', uk: 'Низький', pos: 'adjectives' },
    { en: 'dirty', ru: 'Грязный', uk: 'Брудний', pos: 'adjectives' },
    { en: 'sandy', ru: 'Песчаный', uk: 'Піщаний', pos: 'adjectives' },
    { en: 'free', ru: 'Свободный', uk: 'Вільний', pos: 'adjectives' },
    { en: 'experienced', ru: 'Опытный', uk: 'Досвідчений', pos: 'adjectives' },
    { en: 'tight', ru: 'Тесный', uk: 'Тісний', pos: 'adjectives' },
    { en: 'noisy', ru: 'Шумный', uk: 'Шумний', pos: 'adjectives' },
    { en: 'empty', ru: 'Пустой', uk: 'Порожній', pos: 'adjectives' },
    { en: 'ripe', ru: 'Спелый', uk: 'Стиглий', pos: 'adjectives' },
    { en: 'modern', ru: 'Современный', uk: 'Сучасний', pos: 'adjectives' },
    { en: 'dangerous', ru: 'Опасный', uk: 'Небезпечний', pos: 'adjectives' },
    { en: 'rocky', ru: 'Скалистый', uk: 'Скелястий', pos: 'adjectives' },
    { en: 'dark', ru: 'Темный', uk: 'Темний', pos: 'adjectives' },
    { en: 'brave', ru: 'Смелый', uk: 'Сміливий', pos: 'adjectives' },
    { en: 'thorny', ru: 'Колючий', uk: 'Колючий', pos: 'adjectives' },
    { en: 'thick', ru: 'Густой', uk: 'Густий', pos: 'adjectives' },
    { en: 'heavy', ru: 'Тяжелый', uk: 'Важкий', pos: 'adjectives' },
    { en: 'narrow', ru: 'Узкий', uk: 'Вузький', pos: 'adjectives' },
    { en: 'bright', ru: 'Яркий', uk: 'Яскравий', pos: 'adjectives' },
    { en: 'often', ru: 'Часто', uk: 'Часто', pos: 'adverbs' },
    { en: 'slowly', ru: 'Медленно', uk: 'Повільно', pos: 'adverbs' },
    { en: 'pillow', ru: 'Подушка', uk: 'Подушка', pos: 'nouns' },
    { en: 'corner', ru: 'Угол', uk: 'Куток', pos: 'nouns' },
    { en: 'basket', ru: 'Корзина', uk: 'Кошик', pos: 'nouns' },
    { en: 'bank', ru: 'Банк', uk: 'Банк', pos: 'nouns' },
    { en: 'mirror', ru: 'Зеркало', uk: 'Дзеркало', pos: 'nouns' },
    { en: 'briefcase', ru: 'Портфель', uk: 'Портфель', pos: 'nouns' },
    { en: 'pharmacy', ru: 'Аптека', uk: 'Аптека', pos: 'nouns' },
    { en: 'village', ru: 'Деревня', uk: 'Село', pos: 'nouns' },
    { en: 'hill', ru: 'Холм', uk: 'Пагорб', pos: 'nouns' },
    { en: 'motorcycle', ru: 'Мотоцикл', uk: 'Мотоцикл', pos: 'nouns' },
    { en: 'garage', ru: 'Гараж', uk: 'Гараж', pos: 'nouns' },
    { en: 'curtain', ru: 'Занавеска', uk: 'Завіса', pos: 'nouns' },
    { en: 'towel', ru: 'Полотенце', uk: 'Рушник', pos: 'nouns' },
    { en: 'hook', ru: 'Крючок', uk: 'Гачок', pos: 'nouns' },
    { en: 'sink', ru: 'Раковина', uk: 'Раковина', pos: 'nouns' },
    { en: 'tool', ru: 'Инструмент', uk: 'Інструмент', pos: 'nouns' },
    { en: 'shore', ru: 'Берег', uk: 'Берег', pos: 'nouns' },
    { en: 'campfire', ru: 'Костер', uk: 'Багаття', pos: 'nouns' },
    { en: 'courier', ru: 'Курьер', uk: "Кур'єр", pos: 'nouns' },
    { en: 'entrance', ru: 'Вход', uk: 'Вхід', pos: 'nouns' },
    { en: 'building', ru: 'Здание', uk: 'Будівля', pos: 'nouns' },
    { en: 'stairs', ru: 'Лестница', uk: 'Сходи', pos: 'nouns' },
    { en: 'flat', ru: 'Квартира', uk: 'Квартира', pos: 'nouns' },
    { en: 'market', ru: 'Рынок', uk: 'Ринок', pos: 'nouns' },
    { en: 'lighthouse', ru: 'Маяк', uk: 'Маяк', pos: 'nouns' },
    { en: 'island', ru: 'Остров', uk: 'Острів', pos: 'nouns' },
    { en: 'armchair', ru: 'Кресло', uk: 'Крісло', pos: 'nouns' },
    { en: 'oak', ru: 'Дуб', uk: 'Дуб', pos: 'nouns' },
    { en: 'scarf', ru: 'Шарф', uk: 'Шарф', pos: 'nouns' },
    { en: 'rainbow', ru: 'Радуга', uk: 'Веселка', pos: 'nouns' },
    { en: 'sea', ru: 'Море', uk: 'Море', pos: 'nouns' },
    { en: 'basement', ru: 'Подвал', uk: 'Підвал', pos: 'nouns' },
    { en: 'bicycle', ru: 'Велосипед', uk: 'Велосипед', pos: 'nouns' },
    { en: 'fence', ru: 'Забор', uk: 'Паркан', pos: 'nouns' },
    { en: 'shed', ru: 'Сарай', uk: 'Сарай', pos: 'nouns' },
    { en: 'sneakers', ru: 'Кроссовки', uk: 'Кросівки', pos: 'nouns' },
    { en: 'bench', ru: 'Скамейка', uk: 'Лавка', pos: 'nouns' },
    { en: 'waiter', ru: 'Официант', uk: 'Офіціант', pos: 'nouns' },
    { en: 'vegetable', ru: 'Овощ', uk: 'Овоч', pos: 'nouns' },
    { en: 'fridge', ru: 'Холодильник', uk: 'Холодильник', pos: 'nouns' },
    { en: 'sign', ru: 'Вывеска', uk: 'Вивіска', pos: 'nouns' },
    { en: 'bookstore', ru: 'Книжный магазин', uk: 'Книжковий магазин', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелек', uk: 'Гаманець', pos: 'nouns' },
    { en: 'musician', ru: 'Музыкант', uk: 'Музикант', pos: 'nouns' },
    { en: 'guitar', ru: 'Гитара', uk: 'Гітара', pos: 'nouns' },
    { en: 'bridge', ru: 'Мост', uk: 'Міст', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', pos: 'nouns' },
    { en: 'fireplace', ru: 'Камин', uk: 'Камін', pos: 'nouns' },
    { en: 'ball', ru: 'Мяч', uk: "М'яч", pos: 'nouns' },
    { en: 'bush', ru: 'Куст', uk: 'Кущ', pos: 'nouns' },
    { en: 'path', ru: 'Тропинка', uk: 'Стежка', pos: 'nouns' },
    { en: 'forest', ru: 'Лес', uk: 'Ліс', pos: 'nouns' },
    { en: 'niece', ru: 'Племянница', uk: 'Племінниця', pos: 'nouns' },
    { en: 'beach', ru: 'Пляж', uk: 'Пляж', pos: 'nouns' },
    { en: 'driver', ru: 'Водитель', uk: 'Водій', pos: 'nouns' },
    { en: 'truck', ru: 'Грузовик', uk: 'Вантажівка', pos: 'nouns' },
    { en: 'lane', ru: 'Переулок', uk: 'Провулок', pos: 'nouns' },
    { en: 'chess', ru: 'Шахматы', uk: 'Шахи', pos: 'nouns' },
    { en: 'watch', ru: 'Часы', uk: 'Годинник', pos: 'nouns' },
    { en: 'cloud', ru: 'Облако', uk: 'Хмара', pos: 'nouns' },
    { en: 'sun', ru: 'Солнце', uk: 'Сонце', pos: 'nouns' },
    { en: 'blanket', ru: 'Одеяло', uk: 'Ковдра', pos: 'nouns' },
  ],
  20: [
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', pos: 'irregular_verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', pos: 'irregular_verbs' },
    { en: 'drink', ru: 'Пить', uk: 'Пити', pos: 'irregular_verbs' },
    { en: 'leave', ru: 'Оставлять', uk: 'Залишати', pos: 'irregular_verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', pos: 'irregular_verbs' },
    { en: 'eat', ru: 'Есть', uk: 'Їсти', pos: 'irregular_verbs' },
    { en: 'build', ru: 'Строить', uk: 'Будувати', pos: 'irregular_verbs' },
    { en: 'get', ru: 'Получать', uk: 'Отримувати', pos: 'irregular_verbs' },
    { en: 'take', ru: 'Брать', uk: 'Брати', pos: 'irregular_verbs' },
    { en: 'bring', ru: 'Приносить', uk: 'Приносити', pos: 'irregular_verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', pos: 'irregular_verbs' },
    { en: 'wear', ru: 'Носить', uk: 'Носити', pos: 'irregular_verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Відправляти', pos: 'irregular_verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', pos: 'irregular_verbs' },
    { en: 'somebody', ru: 'Кто-то', uk: 'Хтось', pos: 'pronouns' },
    { en: 'nobody', ru: 'Никто', uk: 'Ніхто', pos: 'pronouns' },
    { en: 'every', ru: 'Каждый', uk: 'Кожен', pos: 'pronouns' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', pos: 'adjectives' },
    { en: 'unusual', ru: 'Необычный', uk: 'Незвичайний', pos: 'adjectives' },
    { en: 'short', ru: 'Короткий', uk: 'Короткий', pos: 'adjectives' },
    { en: 'clean', ru: 'Чистый', uk: 'Чистий', pos: 'adjectives' },
    { en: 'delicious', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'orange', ru: 'Оранжевый', uk: 'Помаранчевий', pos: 'adjectives' },
    { en: 'leather', ru: 'Кожаный', uk: 'Шкіряний', pos: 'adjectives' },
    { en: 'Italian', ru: 'Итальянский', uk: 'Італійський', pos: 'adjectives' },
    { en: 'document', ru: 'Документ', uk: 'Документ', pos: 'nouns' },
    { en: 'briefcase', ru: 'Портфель', uk: 'Портфель', pos: 'nouns' },
    { en: 'student', ru: 'Студент', uk: 'Студент', pos: 'nouns' },
    { en: 'essay', ru: 'Эссе', uk: 'Есе', pos: 'nouns' },
    { en: 'paper', ru: 'Бумага', uk: 'Папір', pos: 'nouns' },
    { en: 'souvenir', ru: 'Сувенир', uk: 'Сувенір', pos: 'nouns' },
    { en: 'kiosk', ru: 'Киоск', uk: 'Кіоск', pos: 'nouns' },
    { en: 'backpack', ru: 'Рюкзак', uk: 'Рюкзак', pos: 'nouns' },
    { en: 'bench', ru: 'Скамейка', uk: 'Лавка', pos: 'nouns' },
    { en: 'lunch', ru: 'Обед', uk: 'Обід', pos: 'nouns' },
    { en: 'restaurant', ru: 'Ресторан', uk: 'Ресторан', pos: 'nouns' },
  ],
  21: [
    { en: 'know', ru: 'Знать', uk: 'Знати', pos: 'irregular_verbs' },
    { en: 'bring', ru: 'Приносить', uk: 'Приносити', pos: 'irregular_verbs' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', pos: 'irregular_verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', pos: 'irregular_verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', pos: 'irregular_verbs' },
    { en: 'come', ru: 'Приходить', uk: 'Приходити', pos: 'irregular_verbs' },
    { en: 'steal', ru: 'Красть', uk: 'Красти', pos: 'irregular_verbs' },
    { en: 'hide', ru: 'Прятать', uk: 'Ховати', pos: 'irregular_verbs' },
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', pos: 'irregular_verbs' },
    { en: 'put', ru: 'Класть', uk: 'Класти', pos: 'irregular_verbs' },
    { en: 'send', ru: 'Посылать', uk: 'Надсилати', pos: 'irregular_verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', pos: 'irregular_verbs' },
    { en: 'leave', ru: 'Оставлять', uk: 'Залишати', pos: 'irregular_verbs' },
    { en: 'feel', ru: 'Чувствовать', uk: 'Почуватися', pos: 'irregular_verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', pos: 'irregular_verbs' },
    { en: 'somebody', ru: 'Кто-то', uk: 'Хтось', pos: 'pronouns' },
    { en: 'nobody', ru: 'Никто', uk: 'Ніхто', pos: 'pronouns' },
    { en: 'someone', ru: 'Кто-то', uk: 'Хтось', pos: 'pronouns' },
    { en: 'no one', ru: 'Никто', uk: 'Ніхто', pos: 'pronouns' },
    { en: 'everyone', ru: 'Все (каждый)', uk: 'Усі (кожен)', pos: 'pronouns' },
    { en: 'everybody', ru: 'Все', uk: 'Усі', pos: 'pronouns' },
    { en: 'anyone', ru: 'Кто-нибудь', uk: 'Хто-небудь', pos: 'pronouns' },
    { en: 'something', ru: 'Что-то', uk: 'Щось', pos: 'pronouns' },
    { en: 'nothing', ru: 'Ничего', uk: 'Нічого', pos: 'pronouns' },
    { en: 'everything', ru: 'Всё', uk: 'Все', pos: 'pronouns' },
    { en: 'anything', ru: 'Что-нибудь', uk: 'Що-небудь', pos: 'pronouns' },
    { en: 'interesting', ru: 'Интересный', uk: 'Цікавий', pos: 'adjectives' },
    { en: 'empty', ru: 'Пустой', uk: 'Порожній', pos: 'adjectives' },
    { en: 'useful', ru: 'Полезный', uk: 'Корисний', pos: 'adjectives' },
    { en: 'difficult', ru: 'Трудный', uk: 'Складний', pos: 'adjectives' },
    { en: 'unusual', ru: 'Необычный', uk: 'Незвичайний', pos: 'adjectives' },
    { en: 'heavy', ru: 'Тяжелый', uk: 'Важкий', pos: 'adjectives' },
    { en: 'fragile', ru: 'Хрупкий', uk: 'Тендітний', pos: 'adjectives' },
    { en: 'anonymous', ru: 'Анонимный', uk: 'Анонімний', pos: 'adjectives' },
    { en: 'strong', ru: 'Сильный', uk: 'Сильний', pos: 'adjectives' },
    { en: 'different', ru: 'Другой', uk: 'Інший', pos: 'adjectives' },
    { en: 'silver', ru: 'Серебряный', uk: 'Срібний', pos: 'adjectives' },
    { en: 'formal', ru: 'Торжественный', uk: 'Урочистий', pos: 'adjectives' },
    { en: 'grey', ru: 'Серый', uk: 'Сірий', pos: 'adjectives' },
    { en: 'possible', ru: 'Возможный', uk: 'Можливий', pos: 'adjectives' },
    { en: 'beautiful', ru: 'Прекрасный', uk: 'Прекрасний', pos: 'adjectives' },
    { en: 'sunny', ru: 'Солнечный', uk: 'Сонячний', pos: 'adjectives' },
    { en: 'wet', ru: 'Мокрый', uk: 'Мокрий', pos: 'adjectives' },
    { en: 'famous', ru: 'Знаменитый', uk: 'Знаменитий', pos: 'adjectives' },
    { en: 'tired', ru: 'Уставший', uk: 'Втомлений', pos: 'adjectives' },
    { en: 'abandoned', ru: 'Заброшенный', uk: 'Покинутий', pos: 'adjectives' },
    { en: 'dirty', ru: 'Грязный', uk: 'Брудний', pos: 'adjectives' },
    { en: 'crowded', ru: 'Переполненный', uk: 'Переповнений', pos: 'adjectives' },
    { en: 'official', ru: 'Официальный', uk: 'Офіційний', pos: 'adjectives' },
    { en: 'valuable', ru: 'Ценный', uk: 'Цінний', pos: 'adjectives' },
    { en: 'sharp', ru: 'Острый', uk: 'Гострий', pos: 'adjectives' },
    { en: 'loud', ru: 'Громкий', uk: 'Гучний', pos: 'adjectives' },
    { en: 'narrow', ru: 'Узкий', uk: 'Вузький', pos: 'adjectives' },
    { en: 'favorite', ru: 'Любимый', uk: 'Улюблений', pos: 'adjectives' },
    { en: 'wooden', ru: 'Деревянный', uk: "Дерев'яний", pos: 'adjectives' },
    { en: 'iron', ru: 'Железный', uk: 'Залізний', pos: 'adjectives' },
    { en: 'tasty', ru: 'Вкусный', uk: 'Смачний', pos: 'adjectives' },
    { en: 'secret', ru: 'Секретный', uk: 'Секретний', pos: 'adjectives' },
    { en: 'strange', ru: 'Странный', uk: 'Дивний', pos: 'adjectives' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', pos: 'nouns' },
    { en: 'code', ru: 'Код', uk: 'Код', pos: 'nouns' },
    { en: 'laptop', ru: 'Ноутбук', uk: 'Ноутбук', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча', uk: 'Зустріч', pos: 'nouns' },
    { en: 'garden', ru: 'Сад', uk: 'Сад', pos: 'nouns' },
    { en: 'office', ru: 'Офис', uk: 'Офіс', pos: 'nouns' },
    { en: 'message', ru: 'Сообщение', uk: 'Повідомлення', pos: 'nouns' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', pos: 'nouns' },
    { en: 'incident', ru: 'Происшествие', uk: 'Подія', pos: 'nouns' },
    { en: 'truth', ru: 'Правда', uk: 'Правда', pos: 'nouns' },
    { en: 'situation', ru: 'Ситуация', uk: 'Ситуація', pos: 'nouns' },
    { en: 'lecture', ru: 'Лекция', uk: 'Лекція', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', pos: 'nouns' },
    { en: 'mall', ru: 'Торговый центр', uk: 'Торговий центр', pos: 'nouns' },
    { en: 'ghost', ru: 'Привидение', uk: 'Привид', pos: 'nouns' },
    { en: 'conversation', ru: 'Разговор', uk: 'Розмова', pos: 'nouns' },
    { en: 'holiday', ru: 'Праздник', uk: 'Свято', pos: 'nouns' },
    { en: 'safe', ru: 'Сейф', uk: 'Сейф', pos: 'nouns' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', pos: 'nouns' },
    { en: 'dress', ru: 'Платье', uk: 'Сукня', pos: 'nouns' },
    { en: 'call', ru: 'Звонок', uk: 'Дзвінок', pos: 'nouns' },
    { en: 'task', ru: 'Задача', uk: 'Завдання', pos: 'nouns' },
    { en: 'explanation', ru: 'Объяснение', uk: 'Пояснення', pos: 'nouns' },
    { en: 'letter', ru: 'Письмо', uk: 'Лист', pos: 'nouns' },
    { en: 'wind', ru: 'Ветер', uk: 'Вітер', pos: 'nouns' },
    { en: 'trip', ru: 'Поездка', uk: 'Поїздка', pos: 'nouns' },
    { en: 'law', ru: 'Закон', uk: 'Закон', pos: 'nouns' },
    { en: 'sunglasses', ru: 'Солнечные очки', uk: 'Сонцезахисні окуляри', pos: 'nouns' },
    { en: 'spoon', ru: 'Ложка', uk: 'Ложка', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', pos: 'nouns' },
    { en: 'kitchen', ru: 'Кухня', uk: 'Кухня', pos: 'nouns' },
    { en: 'clothing', ru: 'Одежда', uk: 'Одяг', pos: 'nouns' },
    { en: 'basket', ru: 'Корзина', uk: 'Кошик', pos: 'nouns' },
    { en: 'juice', ru: 'Сок', uk: 'Сік', pos: 'nouns' },
    { en: 'carpet', ru: 'Ковер', uk: 'Килим', pos: 'nouns' },
    { en: 'singer', ru: 'Певица', uk: 'Співачка', pos: 'nouns' },
    { en: 'walk', ru: 'Прогулка', uk: 'Прогулянка', pos: 'nouns' },
    { en: 'building', ru: 'Здание', uk: 'Будівля', pos: 'nouns' },
    { en: 'dish', ru: 'Тарелка', uk: 'Тарілка', pos: 'nouns' },
    { en: 'sink', ru: 'Раковина', uk: 'Раковина', pos: 'nouns' },
    { en: 'jacket', ru: 'Куртка', uk: 'Куртка', pos: 'nouns' },
    { en: 'excuse', ru: 'Оправдание', uk: 'Виправдання', pos: 'nouns' },
    { en: 'visit', ru: 'Визит', uk: 'Візит', pos: 'nouns' },
    { en: 'workshop', ru: 'Мастерская', uk: 'Майстерня', pos: 'nouns' },
    { en: 'stairs', ru: 'Лестница', uk: 'Сходи', pos: 'nouns' },
    { en: 'knife', ru: 'Нож', uk: 'Ніж', pos: 'nouns' },
    { en: 'noise', ru: 'Шум', uk: 'Шум', pos: 'nouns' },
    { en: 'street', ru: 'Улица', uk: 'Вулиця', pos: 'nouns' },
    { en: 'snack', ru: 'Закуска', uk: 'Закуска', pos: 'nouns' },
    { en: 'countryside', ru: 'Сельская местность', uk: 'Сільська місцевість', pos: 'nouns' },
    { en: 'party', ru: 'Вечеринка', uk: 'Вечірка', pos: 'nouns' },
    { en: 'basement', ru: 'Подвал', uk: 'Підвал', pos: 'nouns' },
    { en: 'coin', ru: 'Монета', uk: 'Монета', pos: 'nouns' },
    { en: 'shelf', ru: 'Полка', uk: 'Полиця', pos: 'nouns' },
  ],
  22: [
    { en: 'write', ru: 'Писать', uk: 'Писати', pos: 'irregular_verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', pos: 'irregular_verbs' },
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', pos: 'irregular_verbs' },
    { en: 'ride', ru: 'Ездить', uk: 'Їздити', pos: 'irregular_verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', pos: 'irregular_verbs' },
    { en: 'keep', ru: 'Держать', uk: 'Тримати', pos: 'irregular_verbs' },
    { en: 'take', ru: 'Брать', uk: 'Брати', pos: 'irregular_verbs' },
    { en: 'have', ru: 'Иметь', uk: 'Мати', pos: 'irregular_verbs' },
    { en: 'sell', ru: 'Продавать', uk: 'Продавати', pos: 'irregular_verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', pos: 'verbs' },
    { en: 'stop', ru: 'Прекращать', uk: 'Припиняти', pos: 'verbs' },
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
    { en: 'discuss', ru: 'Обсуждать', uk: 'Обговорювати', pos: 'verbs' },
    { en: 'refreshing', ru: 'Освежающий', uk: 'Освіжаючий', pos: 'adjectives' },
    { en: 'spicy', ru: 'Острый', uk: 'Гострий', pos: 'adjectives' },
    { en: 'reliable', ru: 'Надежный', uk: 'Надійний', pos: 'adjectives' },
    { en: 'complex', ru: 'Сложный', uk: 'Складний', pos: 'adjectives' },
    { en: 'historical', ru: 'Исторический', uk: 'Історичний', pos: 'adjectives' },
    { en: 'ancient', ru: 'Древний', uk: 'Стародавній', pos: 'adjectives' },
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
    { en: 'feedback', ru: 'Обратная связь', uk: 'Зворотній зв\'язок', pos: 'nouns' },
    { en: 'equipment', ru: 'Оборудование', uk: 'Обладнання', pos: 'nouns' },
    { en: 'laboratory', ru: 'Лаборатория', uk: 'Лабораторія', pos: 'nouns' },
    { en: 'conference', ru: 'Конференция', uk: 'Конференція', pos: 'nouns' },
    { en: 'contract', ru: 'Контракт', uk: 'Контракт', pos: 'nouns' },
    { en: 'auction', ru: 'Аукцион', uk: 'Аукціон', pos: 'nouns' },
    { en: 'souvenir', ru: 'Сувенир', uk: 'Сувенір', pos: 'nouns' },
    { en: 'mechanism', ru: 'Механизм', uk: 'Механізм', pos: 'nouns' },
    { en: 'castle', ru: 'Замок', uk: 'Замок', pos: 'nouns' },
    { en: 'plant', ru: 'Завод', uk: 'Завод', pos: 'nouns' },
    { en: 'studio', ru: 'Студия', uk: 'Студія', pos: 'nouns' },
    { en: 'furniture', ru: 'Мебель', uk: 'Меблі', pos: 'nouns' },
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
const makeOptions = (correct: Word, all: Word[]): string[] => {
  const notMe = (w: Word) => w.en !== correct.en;
  // Из текущего урока (не более 3 — чтобы не повторялись одни и те же дистракторы)
  const lessonSamePos = fy(all.filter(w => notMe(w) && w.pos === correct.pos));
  const fromLesson    = lessonSamePos.slice(0, Math.min(3, lessonSamePos.length));
  // Из других уроков (добираем до 5)
  const fromCross = fy(
    ALL_WORDS_FLAT.filter(w => notMe(w) && w.pos === correct.pos && !fromLesson.some(l => l.en === w.en))
  ).slice(0, 5 - fromLesson.length);
  let combined = [...fromLesson, ...fromCross];
  // Если всё равно < 5, заполняем любыми словами урока/cross
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
  correctCount: number;
}

function buildCard(word: Word, correctCount: number, all: Word[]): Card {
  return { word, options: makeOptions(word, all), correctCount };
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

  const [queue,      setQueue]      = useState<Card[]>(() => {
    const notLearned = words.filter(w => !initialLearned.includes(w.en));
    const pool = notLearned.length > 0 ? notLearned : words;
    return shuffle([...pool]).map(w => buildCard(w, initialCounts[w.en] ?? 0, words));
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

  const xpAnim = useRef(new Animated.ValueXY({ x: 0, y: 60 })).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;

  const showXpToast = () => {
    xpAnim.setValue({ x: 0, y: 60 });
    xpOpacity.setValue(0);
    setXpToastVisible(true);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(xpAnim, { toValue: { x: 0, y: 0 }, duration: 200, useNativeDriver: true }),
        Animated.timing(xpOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(800),
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
  const prevEnRef = React.useRef('');
  React.useEffect(() => {
    if (current && current.word.en !== prevEnRef.current) {
      prevEnRef.current = current.word.en;
      setDotCount(current.correctCount);
    }
  }, [current?.word.en]);

  const handleChoice = async (opt: string) => {
    if (locked.current || chosen !== null || !current) return;
    locked.current = true;

    setChosen(opt);
    const isRight = opt === current.word.en;
    if (isRight) setDotCount(c => Math.min(c + 1, REQUIRED)); // сразу показать заполнение

    Speech.speak(current.word.en, { language: 'en-US', rate: speechRate });
    if (!isRight) {
      try { if(hapticsOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }

    setTimeout(async () => {
      // Все изменения очереди – внутри одного setTimeout, один ре-рендер
      const newQueue = [...queue];

      if (isRight) {
        const newCount = current.correctCount + 1;

        if (newCount >= REQUIRED) {
          // Выучено – удаляем из очереди
          newQueue.splice(qIdx % newQueue.length, 1);
          const newLearned = Math.min(learnedCnt + 1, words.length);

          const saved = await AsyncStorage.getItem(storageKey + '_words');
          const counts: Record<string,number> = saved ? JSON.parse(saved) : {};
          counts[current.word.en] = REQUIRED;
          AsyncStorage.setItem(storageKey + '_words', JSON.stringify(counts));
          onCountUpdate(current.word.en, REQUIRED);
          updateMultipleTaskProgress([{ type: 'words_learned' }, { type: 'daily_active' }]);
          showXpToast(); // Show toast for XP
          if (userName) {
            await registerXP(POINTS_PER_WORD, 'vocabulary_learned', userName, lang);
            setTotalPts(p => p + POINTS_PER_WORD);
          }

          if (newQueue.length === 0) {
            setLearnedCnt(newLearned);
            setQueue(newQueue);
            setAllDone(true);
            setChosen(null);
            locked.current = false;
            return;
          }

          const nextIdx = (qIdx % newQueue.length);
          setLearnedCnt(newLearned);
          setQueue(newQueue);
          setQIdx(nextIdx);
        } else {
          // Не выучено ещё – сохраняем частичный прогресс
          AsyncStorage.getItem(storageKey + '_words').then(saved => {
            const counts: Record<string,number> = saved ? JSON.parse(saved) : {};
            counts[current.word.en] = newCount;
            AsyncStorage.setItem(storageKey + '_words', JSON.stringify(counts));
          });
          onCountUpdate(current.word.en, newCount);
          const updated = buildCard(current.word, newCount, words);
          newQueue.splice(qIdx % newQueue.length, 1);
          newQueue.push(updated);
          const nextIdx = qIdx % newQueue.length;
          setQueue(newQueue);
          setQIdx(nextIdx);
        }
      } else {
        // Ошибка – перемещаем в конец с новыми вариантами
        const resetCard = buildCard(current.word, current.correctCount, words);
        newQueue.splice(qIdx % newQueue.length, 1);
        newQueue.push(resetCard);
        const nextIdx = qIdx % newQueue.length;
        setQueue(newQueue);
        setQIdx(nextIdx);
      }

      setChosen(null);
      locked.current = false;
    }, 900);
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
    </View>
  );

  if (!current) return null;

  const question = lang === 'uk' ? current.word.uk : current.word.ru;

  const displayLearned = Math.min(learnedCnt, words.length);

  return (
    <View style={{ flex:1, paddingHorizontal:20, paddingTop:12 }}>
      {/* Прогресс — вверху */}
      <View style={{ width:'100%', marginBottom:16 }}>
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

      {/* 3 гексагона */}
      <View style={{ flexDirection:'row', gap:10, marginBottom:20, justifyContent:'center', alignItems:'center' }}>
        {[0,1,2].map(i => (
          <MiniHex key={i} filled={dotCount > i} size={22} />
        ))}
      </View>

      {/* Вопрос — занимает всё свободное пространство, центрируется */}
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <Text style={{ color:t.textPrimary, fontSize:36, fontWeight:'300', textAlign:'center' }}>
          {question}
        </Text>
      </View>

      {/* 6 вариантов в 2 колонки — внизу */}
      <View style={{ width:'100%', flexDirection:'row', flexWrap:'wrap', gap:10, paddingBottom: 16 }}>
        {current.options.map((opt, i) => {
          const isCorrect  = opt === current.word.en;
          const isSelected = opt === chosen;
          let bg=t.bgCard, border=t.border, tc=t.textSecond;
          if (chosen !== null) {
            if (isCorrect)        { bg=t.correctBg; border=t.correct; tc=t.correct; }
            else if (isSelected)  { bg=t.wrongBg;   border=t.wrong;   tc=t.wrong;   }
          }
          return (
            <TouchableOpacity key={i}
              style={{ width:'48%', minHeight:64, paddingVertical:12, paddingHorizontal:8, borderRadius:14, alignItems:'center', justifyContent:'center', borderWidth:1, backgroundColor:bg, borderColor:border }}
              onPress={() => { hapticTap(); handleChoice(opt); }}
              activeOpacity={0.8}
              disabled={chosen !== null}
            >
              <Text style={{ color:tc, fontSize:f.h2, fontWeight:'500', textAlign:'center' }} numberOfLines={2} adjustsFontSizeToFit>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {xpToastVisible && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 110,
            alignSelf: 'center',
            backgroundColor: '#FFC800',
            borderRadius: 20,
            paddingHorizontal: 20,
            paddingVertical: 10,
            transform: [{ translateY: xpAnim.y }],
            opacity: xpOpacity,
            zIndex: 999,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>+3 XP</Text>
        </Animated.View>
      )}

    </View>
  );
}

// ── СПИСОК ───────────────────────────────────────────────────────────────────
function WordList({ words, learnedCounts, lang, speechRate, onStartTraining }: { words:Word[]; learnedCounts:Record<string,number>; lang:'ru'|'uk'; speechRate:number; onStartTraining?: () => void }) {
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
            <Text style={{ flex:1, color:t.textPrimary, fontSize:f.bodyLg }}>{item.en}</Text>
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
