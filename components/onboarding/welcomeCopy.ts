// welcomeCopy.ts — тексты приветствия B-3 (3 экрана с персонажем) на 9 языках.
// зачем (владелец 04.11): экран 1 прежний; экраны 2 и 3 — БЕЗ заголовков, ничего про ранги и открытие разделов. Тексты экранов 2–3 — Переводчик; экран 1 и кнопки — черновик Дизайна, на вычитку.
import { triLang, type Lang } from '../../constants/i18n';

export type WelcomeReply = Readonly<{ title: string; body: string; coinAfter: number | null }>;

type Nine = Readonly<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>>;
const pick = (lang: Lang, copy: Nine): string => triLang(lang, copy);

const COIN_WORD: Nine = { ru: 'монеты', uk: 'монети', en: 'coins', es: 'monedas', 'pt-BR': 'moedas', vi: 'xu', id: 'koin', tr: 'koin', pl: 'monety' };

/** `language` — название выбранного языка обучения на языке интерфейса (подставляет хост). */
export function welcomeReplies(language: string, lang: Lang = 'ru'): readonly WelcomeReply[] {
  const title1 = pick(lang, { ru: 'Привет! Я рядом.', uk: 'Привіт! Я поруч.', en: 'Hi! I’m here.', es: '¡Hola! Estoy contigo.', 'pt-BR': 'Oi! Estou aqui.', vi: 'Chào bạn! Mình ở đây.', id: 'Hai! Aku di sini.', tr: 'Merhaba! Yanındayım.', pl: 'Cześć! Jestem obok.' });
  const first = pick(lang, {
    ru: `Спасибо за скачивание PhraseMan. Давай учить языки вместе! Сейчас у тебя выбран ${language}.`,
    uk: `Дякуємо за завантаження PhraseMan. Давай вчити мови разом! Зараз у тебе обрано ${language}.`,
    en: `Thanks for downloading PhraseMan. Let’s learn languages together! You have ${language} selected.`,
    es: `Gracias por descargar PhraseMan. ¡Aprendamos idiomas juntos! Ahora tienes elegido ${language}.`,
    'pt-BR': `Obrigado por baixar o PhraseMan. Vamos aprender idiomas juntos! Agora você escolheu ${language}.`,
    vi: `Cảm ơn bạn đã tải PhraseMan. Cùng học ngoại ngữ nhé! Hiện bạn đang chọn ${language}.`,
    id: `Terima kasih sudah mengunduh PhraseMan. Yuk belajar bahasa bersama! Sekarang kamu memilih ${language}.`,
    tr: `PhraseMan’i indirdiğin için teşekkürler. Birlikte dil öğrenelim! Şu anda ${language} seçili.`,
    pl: `Dzięki za pobranie PhraseMan. Uczmy się języków razem! Teraz masz wybrany ${language}.`,
  });
  const second = pick(lang, {
    ru: 'Начинай с обычных уроков. За занятия получаешь монеты.',
    uk: 'Починай зі звичайних уроків. За заняття отримуєш монети.',
    en: 'Start with regular lessons. You earn coins for each lesson.',
    es: 'Empiece con las lecciones normales. Por cada lección recibe monedas.',
    'pt-BR': 'Comece pelas lições normais. Por cada lição você ganha moedas.',
    vi: 'Bắt đầu từ các bài học thường. Học xong bạn nhận được xu.',
    id: 'Mulai dari pelajaran biasa. Dari setiap pelajaran Anda mendapat koin.',
    tr: 'Normal derslerle başlayın. Derslerden koin kazanırsınız.',
    pl: 'Zacznij od zwykłych lekcji. Za lekcje dostajesz monety.',
  });
  const third = pick(lang, {
    ru: 'За монеты можно повышать свой уровень. Попробуем первый урок?',
    uk: 'За монети можна підвищувати свій рівень. Спробуємо перший урок?',
    en: 'You can level up with coins. Shall we try the first lesson?',
    es: 'Con monedas puede subir de nivel. ¿Probamos la primera lección?',
    'pt-BR': 'Com moedas você sobe de nível. Vamos tentar a primeira lição?',
    vi: 'Bạn có thể lên cấp bằng xu. Thử bài học đầu tiên nhé?',
    id: 'Dengan koin Anda bisa naik level. Coba pelajaran pertama?',
    tr: 'Koinlerle seviye atlayabilirsiniz. İlk dersi deneyelim mi?',
    pl: 'Za monety możesz podnosić swój poziom. Spróbujemy pierwszej lekcji?',
  });
  const word = pick(lang, COIN_WORD);
  const at = second.indexOf(word);
  return [
    { title: title1, body: first, coinAfter: null },
    { title: '', body: second, coinAfter: at < 0 ? null : at + word.length },
    { title: '', body: third, coinAfter: null },
  ];
}

export function welcomeUi(lang: Lang): Readonly<{ skip: string; next: string; start: string; hint: string; showAll: string; character: string }> {
  return {
    skip: pick(lang, { ru: 'Пропустить', uk: 'Пропустити', en: 'Skip', es: 'Omitir', 'pt-BR': 'Pular', vi: 'Bỏ qua', id: 'Lewati', tr: 'Atla', pl: 'Pomiń' }),
    next: pick(lang, { ru: 'Дальше', uk: 'Далі', en: 'Next', es: 'Siguiente', 'pt-BR': 'Avançar', vi: 'Tiếp', id: 'Lanjut', tr: 'İleri', pl: 'Dalej' }),
    start: pick(lang, { ru: 'Начать занятие', uk: 'Почати заняття', en: 'Start lesson', es: 'Empezar lección', 'pt-BR': 'Começar a lição', vi: 'Bắt đầu bài học', id: 'Mulai pelajaran', tr: 'Derse başla', pl: 'Zacznij lekcję' }),
    hint: pick(lang, { ru: 'Нажми на текст, чтобы показать его целиком.', uk: 'Торкнися тексту, щоб показати його повністю.', en: 'Tap the text to show it all.', es: 'Toca el texto para verlo completo.', 'pt-BR': 'Toque no texto para ver tudo.', vi: 'Chạm vào chữ để hiện đầy đủ.', id: 'Ketuk teks untuk menampilkannya penuh.', tr: 'Tamamını görmek için metne dokun.', pl: 'Dotknij tekstu, aby pokazać całość.' }),
    showAll: pick(lang, { ru: 'Показать реплику целиком', uk: 'Показати репліку повністю', en: 'Show the whole line', es: 'Mostrar la frase completa', 'pt-BR': 'Mostrar a fala completa', vi: 'Hiện cả câu', id: 'Tampilkan seluruh kalimat', tr: 'Cümlenin tamamını göster', pl: 'Pokaż całą wypowiedź' }),
    character: pick(lang, { ru: 'Персонаж PhraseMan', uk: 'Персонаж PhraseMan', en: 'PhraseMan character', es: 'Personaje de PhraseMan', 'pt-BR': 'Personagem do PhraseMan', vi: 'Nhân vật PhraseMan', id: 'Karakter PhraseMan', tr: 'PhraseMan karakteri', pl: 'Postać PhraseMan' }),
  };
}

export function visibleReply(reply: WelcomeReply, count: number): string { return Array.from(reply.body).slice(0, Math.max(0, count)).join(''); }
export function nextWelcomeAction(step: number): { step: number; start: boolean } { return step >= 2 ? { step: 2, start: true } : { step: step + 1, start: false }; }
