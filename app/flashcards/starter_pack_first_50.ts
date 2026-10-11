/**
 * Стартовый набор «Первые 50 слов» — герой хаба Карточек у новичка («Начни здесь · Hello · Первые 50 слов · Начать»).
 *
 * зачем (координатор 11.10, макет cards-v2.html `hubNew`): у человека без своих карточек хабу нечего предложить
 * сразу. Набор встроен в приложение — ни чтений Firestore, ни сети, открывается мгновенно и офлайн.
 * Тренировка берёт его как обычную колоду `pack:starter_first_50` (deck_sources.loadPackDeckCards).
 *
 * Только английский как язык изучения: по D160 встроенный банк — английский, другим языкам его не подставляем.
 * Для остальных языков `starterPackAvailable` = false, и хаб показывает прежний вариант героя.
 */
import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import type { CardItem, FlashcardSourceLocaleMap } from './types';

export const STARTER_FIRST_50_PACK_ID = 'starter_first_50';
export const STARTER_FIRST_50_DECK_ID = `pack:${STARTER_FIRST_50_PACK_ID}` as const;

export const STARTER_FIRST_50_TITLE = {
  ru: 'Первые 50 слов',
  uk: 'Перші 50 слів',
  en: 'First 50 words',
  es: 'Primeras 50 palabras',
  'pt-BR': 'Primeiras 50 palavras',
  vi: '50 từ đầu tiên',
  id: '50 kata pertama',
  tr: 'İlk 50 kelime',
  pl: 'Pierwsze 50 słów',
} as const;

// [en, ru, uk, es, pt-BR, vi, id, tr, pl]
type Row = readonly [string, string, string, string, string, string, string, string, string];

const ROWS: readonly Row[] = [
  ['Hello', 'Привет', 'Привіт', 'Hola', 'Olá', 'Xin chào', 'Halo', 'Merhaba', 'Cześć'],
  ['Goodbye', 'До свидания', 'До побачення', 'Adiós', 'Tchau', 'Tạm biệt', 'Selamat tinggal', 'Hoşça kal', 'Do widzenia'],
  ['Yes', 'Да', 'Так', 'Sí', 'Sim', 'Vâng', 'Ya', 'Evet', 'Tak'],
  ['No', 'Нет', 'Ні', 'No', 'Não', 'Không', 'Tidak', 'Hayır', 'Nie'],
  ['Please', 'Пожалуйста', 'Будь ласка', 'Por favor', 'Por favor', 'Làm ơn', 'Tolong', 'Lütfen', 'Proszę'],
  ['Thank you', 'Спасибо', 'Дякую', 'Gracias', 'Obrigado', 'Cảm ơn', 'Terima kasih', 'Teşekkür ederim', 'Dziękuję'],
  ['Sorry', 'Извини', 'Вибач', 'Lo siento', 'Desculpe', 'Xin lỗi', 'Maaf', 'Özür dilerim', 'Przepraszam'],
  ['Excuse me', 'Простите', 'Перепрошую', 'Disculpe', 'Com licença', 'Cho tôi hỏi', 'Permisi', 'Affedersiniz', 'Przepraszam bardzo'],
  ['Good morning', 'Доброе утро', 'Доброго ранку', 'Buenos días', 'Bom dia', 'Chào buổi sáng', 'Selamat pagi', 'Günaydın', 'Dzień dobry'],
  ['Good night', 'Спокойной ночи', 'На добраніч', 'Buenas noches', 'Boa noite', 'Chúc ngủ ngon', 'Selamat tidur', 'İyi geceler', 'Dobranoc'],
  ['How are you?', 'Как дела?', 'Як справи?', '¿Cómo estás?', 'Como vai?', 'Bạn khỏe không?', 'Apa kabar?', 'Nasılsın?', 'Jak się masz?'],
  ["I'm fine", 'У меня всё хорошо', 'У мене все добре', 'Estoy bien', 'Estou bem', 'Tôi khỏe', 'Saya baik-baik saja', 'İyiyim', 'U mnie dobrze'],
  ["What's your name?", 'Как тебя зовут?', 'Як тебе звати?', '¿Cómo te llamas?', 'Qual é o seu nome?', 'Bạn tên là gì?', 'Siapa namamu?', 'Adın ne?', 'Jak masz na imię?'],
  ['My name is…', 'Меня зовут…', 'Мене звати…', 'Me llamo…', 'Meu nome é…', 'Tôi tên là…', 'Nama saya…', 'Benim adım…', 'Mam na imię…'],
  ['Nice to meet you', 'Приятно познакомиться', 'Приємно познайомитися', 'Mucho gusto', 'Prazer em conhecer você', 'Rất vui được gặp bạn', 'Senang bertemu denganmu', 'Tanıştığıma memnun oldum', 'Miło cię poznać'],
  ["I don't understand", 'Я не понимаю', 'Я не розумію', 'No entiendo', 'Não entendo', 'Tôi không hiểu', 'Saya tidak mengerti', 'Anlamıyorum', 'Nie rozumiem'],
  ['Can you help me?', 'Можешь мне помочь?', 'Можеш мені допомогти?', '¿Puedes ayudarme?', 'Você pode me ajudar?', 'Bạn giúp tôi được không?', 'Bisa bantu saya?', 'Bana yardım edebilir misin?', 'Możesz mi pomóc?'],
  ['Where is…?', 'Где…?', 'Де…?', '¿Dónde está…?', 'Onde fica…?', '… ở đâu?', 'Di mana…?', '… nerede?', 'Gdzie jest…?'],
  ['How much is it?', 'Сколько это стоит?', 'Скільки це коштує?', '¿Cuánto cuesta?', 'Quanto custa?', 'Cái này bao nhiêu tiền?', 'Berapa harganya?', 'Bu ne kadar?', 'Ile to kosztuje?'],
  ['water', 'вода', 'вода', 'agua', 'água', 'nước', 'air', 'su', 'woda'],
  ['food', 'еда', 'їжа', 'comida', 'comida', 'đồ ăn', 'makanan', 'yemek', 'jedzenie'],
  ['coffee', 'кофе', 'кава', 'café', 'café', 'cà phê', 'kopi', 'kahve', 'kawa'],
  ['tea', 'чай', 'чай', 'té', 'chá', 'trà', 'teh', 'çay', 'herbata'],
  ['friend', 'друг', 'друг', 'amigo', 'amigo', 'bạn', 'teman', 'arkadaş', 'przyjaciel'],
  ['family', 'семья', "сім'я", 'familia', 'família', 'gia đình', 'keluarga', 'aile', 'rodzina'],
  ['home', 'дом', 'дім', 'casa', 'casa', 'nhà', 'rumah', 'ev', 'dom'],
  ['work', 'работа', 'робота', 'trabajo', 'trabalho', 'công việc', 'pekerjaan', 'iş', 'praca'],
  ['today', 'сегодня', 'сьогодні', 'hoy', 'hoje', 'hôm nay', 'hari ini', 'bugün', 'dzisiaj'],
  ['tomorrow', 'завтра', 'завтра', 'mañana', 'amanhã', 'ngày mai', 'besok', 'yarın', 'jutro'],
  ['yesterday', 'вчера', 'вчора', 'ayer', 'ontem', 'hôm qua', 'kemarin', 'dün', 'wczoraj'],
  ['now', 'сейчас', 'зараз', 'ahora', 'agora', 'bây giờ', 'sekarang', 'şimdi', 'teraz'],
  ['time', 'время', 'час', 'tiempo', 'tempo', 'thời gian', 'waktu', 'zaman', 'czas'],
  ['day', 'день', 'день', 'día', 'dia', 'ngày', 'hari', 'gün', 'dzień'],
  ['good', 'хороший', 'гарний', 'bueno', 'bom', 'tốt', 'baik', 'iyi', 'dobry'],
  ['bad', 'плохой', 'поганий', 'malo', 'ruim', 'tệ', 'buruk', 'kötü', 'zły'],
  ['big', 'большой', 'великий', 'grande', 'grande', 'to', 'besar', 'büyük', 'duży'],
  ['small', 'маленький', 'маленький', 'pequeño', 'pequeno', 'nhỏ', 'kecil', 'küçük', 'mały'],
  ['I want', 'Я хочу', 'Я хочу', 'Quiero', 'Eu quero', 'Tôi muốn', 'Saya mau', 'İstiyorum', 'Chcę'],
  ['I like it', 'Мне нравится', 'Мені подобається', 'Me gusta', 'Eu gosto', 'Tôi thích nó', 'Saya suka', 'Beğendim', 'Podoba mi się'],
  ['I need', 'Мне нужно', 'Мені потрібно', 'Necesito', 'Eu preciso', 'Tôi cần', 'Saya butuh', 'İhtiyacım var', 'Potrzebuję'],
  ["Let's go", 'Пойдём', 'Ходімо', 'Vamos', 'Vamos', 'Đi thôi', 'Ayo pergi', 'Hadi gidelim', 'Chodźmy'],
  ['Wait', 'Подожди', 'Зачекай', 'Espera', 'Espere', 'Đợi đã', 'Tunggu', 'Bekle', 'Poczekaj'],
  ['Of course', 'Конечно', 'Звісно', 'Claro', 'Claro', 'Tất nhiên', 'Tentu saja', 'Tabii ki', 'Oczywiście'],
  ['Maybe', 'Может быть', 'Можливо', 'Quizás', 'Talvez', 'Có lẽ', 'Mungkin', 'Belki', 'Może'],
  ['Okay', 'Ладно', 'Гаразд', 'De acuerdo', 'Tá bom', 'Được', 'Oke', 'Tamam', 'Dobra'],
  ['Welcome', 'Добро пожаловать', 'Ласкаво просимо', 'Bienvenido', 'Bem-vindo', 'Chào mừng', 'Selamat datang', 'Hoş geldin', 'Witaj'],
  ['See you later', 'Увидимся', 'Побачимося', 'Hasta luego', 'Até mais', 'Hẹn gặp lại', 'Sampai jumpa', 'Görüşürüz', 'Do zobaczenia'],
  ['Again, please', 'Ещё раз, пожалуйста', 'Ще раз, будь ласка', 'Otra vez, por favor', 'De novo, por favor', 'Làm ơn nói lại', 'Sekali lagi, tolong', 'Bir daha, lütfen', 'Jeszcze raz, proszę'],
  ["I'm hungry", 'Я голоден / голодна', 'Я голодний / голодна', 'Tengo hambre', 'Estou com fome', 'Tôi đói', 'Saya lapar', 'Acıktım', 'Jestem głodny / głodna'],
  ['Where is the toilet?', 'Где туалет?', 'Де туалет?', '¿Dónde está el baño?', 'Onde fica o banheiro?', 'Nhà vệ sinh ở đâu?', 'Di mana toiletnya?', 'Tuvalet nerede?', 'Gdzie jest toaleta?'],
];

let cached: CardItem[] | null = null;

/** 50 карточек набора; порядок фиксирован (первая — Hello, как в макете). */
export function starterFirst50CardItems(): CardItem[] {
  if (cached) return cached;
  cached = ROWS.map(([en, ru, uk, es, ptBr, vi, id, tr, pl], i) => {
    const sourceLocales: FlashcardSourceLocaleMap = { 'pt-BR': ptBr, vi, id, tr, pl };
    return {
      id: `${STARTER_FIRST_50_PACK_ID}_${String(i + 1).padStart(2, '0')}`,
      en,
      ru,
      uk,
      es,
      sourceLocales,
      categoryId: 'situations',
      isSystem: true,
      source: 'starter',
      sourceId: STARTER_FIRST_50_PACK_ID,
    };
  });
  return cached;
}

/** Набор есть только для английского как языка изучения (D160). */
export function starterPackAvailable(studyTarget?: RuntimeStudyTarget): boolean {
  return storageStudyTarget(studyTarget) === 'en';
}

export function isStarterPackId(packId: string): boolean {
  return packId === STARTER_FIRST_50_PACK_ID;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
