// зачем (запас R1 №6, координатор 13.10): единый источник кадров и подписей скриншотов магазинов 2.0 — из него рисуется
// store-screenshots.html и генерируется STORE_SCREENSHOTS_2_0.md, чтобы страница и спека не расходились.
// Порядок: сначала то, что доступно бесплатно (первые 2–3 кадра видны без свайпа и решают установку), без кадров пейвола.
window.STORE = {
  langs: [
    ['ru', 'Русский'], ['uk', 'Українська'], ['en', 'English'], ['es', 'Español'], ['pt-BR', 'Português (BR)'],
    ['vi', 'Tiếng Việt'], ['id', 'Bahasa Indonesia'], ['tr', 'Türkçe'], ['pl', 'Polski'],
  ],
  sizes: {
    ios: { w: 1290, h: 2796, name: 'App Store 6,7″ — 1290 × 2796' },
    play: { w: 1080, h: 1920, name: 'Google Play — 1080 × 1920' },
  },
  frames: [
    {
      n: 1, src: 'store/src/01.png', screen: 'Урок — «Собери фразу»', mockup: 'learn.html №29 (D2)', state: 'урок 3, собрано «She works …»', access: 'бесплатно (уроки 1–3)',
      tone: ['#0E3B2E', '#121216'],
      cap: {
        ru: 'Говори фразами целиком, а не по словам', uk: 'Говори фразами цілком, а не по словах',
        en: 'Speak in real phrases, not single words', es: 'Habla con frases reales, no con palabras sueltas',
        'pt-BR': 'Fale com frases prontas, não com palavras soltas', vi: 'Nói bằng cả câu, không phải từng từ rời',
        id: 'Bicara dengan frasa utuh, bukan kata per kata', tr: 'Tek tek kelimeyle değil, hazır cümlelerle konuş',
        pl: 'Mów całymi zwrotami, nie pojedynczymi słowami',
      },
    },
    {
      n: 2, src: 'store/src/02.png', screen: 'Диалог с собеседником', mockup: 'dialogs.html №31', state: 'разговор идёт, «Перевод / Почему так» под репликой', access: 'бесплатно с лимитом реплик',
      tone: ['#2B1F4E', '#121216'],
      cap: {
        ru: 'Тренируй живой разговор с собеседником', uk: 'Тренуй живу розмову зі співрозмовником',
        en: 'Practise real conversations', es: 'Practica conversaciones reales',
        'pt-BR': 'Pratique conversas de verdade', vi: 'Luyện hội thoại thật',
        id: 'Latih percakapan sungguhan', tr: 'Gerçek sohbetlerle pratik yap', pl: 'Ćwicz prawdziwe rozmowy',
      },
    },
    {
      n: 3, src: 'store/src/03.png', screen: 'Главная — «Сегодня»', mockup: 'shadow-style-etalon.html №1', state: 'серия 2 дня, урок в процессе, задания дня', access: 'бесплатно',
      tone: ['#103A3A', '#121216'],
      cap: {
        ru: '15 минут в день — и привычка держится', uk: '15 хвилин на день — і звичка тримається',
        en: '15 minutes a day keeps the habit going', es: '15 minutos al día y el hábito se mantiene',
        'pt-BR': '15 minutos por dia e o hábito fica', vi: '15 phút mỗi ngày để giữ thói quen',
        id: '15 menit sehari, kebiasaan tetap jalan', tr: 'Günde 15 dakika, alışkanlık bozulmaz', pl: '15 minut dziennie i nawyk zostaje',
      },
    },
    {
      n: 4, src: 'store/src/04.png', screen: 'Карточки — Блиц', mockup: 'cards-v2.html №31', state: 'Блиц, таймер 0:42, выбор перевода', access: 'бесплатно с лимитом тренировок',
      tone: ['#3A2A12', '#121216'],
      cap: {
        ru: 'Сохраняй фразы и повторяй их за минуту', uk: 'Зберігай фрази й повторюй їх за хвилину',
        en: 'Save phrases and review them in a minute', es: 'Guarda frases y repásalas en un minuto',
        'pt-BR': 'Salve frases e revise em um minuto', vi: 'Lưu câu và ôn lại trong một phút',
        id: 'Simpan frasa dan ulangi dalam semenit', tr: 'Cümleleri kaydet, bir dakikada tekrar et',
        pl: 'Zapisuj zwroty i powtarzaj je w minutę',
      },
    },
    {
      n: 5, src: 'store/src/05.png', screen: 'Шпиль', mockup: 'spire.html №4', state: 'башня, я на 4 этаже, друзья недели', access: 'бесплатно (тратит энергию)',
      tone: ['#1E2433', '#121216'],
      cap: {
        ru: 'Поднимайся в Шпиле вместе с друзьями', uk: 'Піднімайся у Шпилі разом із друзями',
        en: 'Climb the Spire with your friends', es: 'Sube la Aguja con tus amigos',
        'pt-BR': 'Suba a Torre com seus amigos', vi: 'Leo Tháp cùng bạn bè',
        id: 'Naiki Menara bersama teman', tr: 'Arkadaşlarınla Kule’ye tırman', pl: 'Wspinaj się na Wieżę z przyjaciółmi',
      },
    },
    {
      n: 6, src: 'store/src/06.png', screen: 'Урок — «Простыми словами»', mockup: 'learn.html №37 (D10)', state: 'шторка разбора фразы', access: 'бесплатно (ИИ-разбор: 3 в день, без лимита — Plus)',
      tone: ['#33203A', '#121216'],
      cap: {
        ru: 'Понятно, почему говорят именно так', uk: 'Зрозуміло, чому кажуть саме так',
        en: 'See why it’s said that way', es: 'Entiende por qué se dice así',
        'pt-BR': 'Entenda por que se diz assim', vi: 'Hiểu vì sao người ta nói như vậy',
        id: 'Pahami kenapa diucapkan begitu', tr: 'Neden böyle söylendiğini anla', pl: 'Zrozum, dlaczego mówi się właśnie tak',
      },
    },
    {
      n: 7, src: 'store/src/07.png', screen: 'Урок — «Устно», результат', mockup: 'learn.html №35 (D8)', state: 'фраза сказана, «Отлично», «Фраза засчитана»', access: 'бесплатно с дневным лимитом (без лимита — Plus)',
      tone: ['#0F2E40', '#121216'],
      cap: {
        ru: 'Говори вслух — приложение слышит произношение', uk: 'Говори вголос — застосунок чує вимову',
        en: 'Speak out loud — the app hears your pronunciation', es: 'Habla en voz alta: la app escucha tu pronunciación',
        'pt-BR': 'Fale em voz alta: o app ouve sua pronúncia', vi: 'Nói to lên — ứng dụng nghe phát âm của bạn',
        id: 'Ucapkan keras — aplikasi mendengar pelafalanmu', tr: 'Sesli söyle, uygulama telaffuzunu dinlesin',
        pl: 'Mów na głos — aplikacja słyszy twoją wymowę',
      },
    },
  ],
};
