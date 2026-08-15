// All interface text. `es` is a UI/source language for learning English.
import { SPANISH_UI_LOCALE_ENABLED } from '../app/config';
import {
  ACTIVE_INTERFACE_SOURCE_LOCALES,
  PLANNED_INTERFACE_SOURCE_LOCALES,
  type HeisenbergSourceLocale,
  type RegisteredInterfaceSourceLocale,
} from '../app/source_locales';

export type Lang = RegisteredInterfaceSourceLocale;
export type PlannedInterfaceLang = Exclude<HeisenbergSourceLocale, 'es'>;
export type InterfaceLanguageOptionCode = Lang | PlannedInterfaceLang;
export type PlannedTriLangCopy = Partial<Record<PlannedInterfaceLang, string>>;

export const INTERFACE_LANGS = ACTIVE_INTERFACE_SOURCE_LOCALES satisfies readonly Lang[];
export const PLANNED_INTERFACE_LANGS = PLANNED_INTERFACE_SOURCE_LOCALES satisfies readonly PlannedInterfaceLang[];

export const INTERFACE_LANGUAGE_OPTIONS = [
  { code: 'ru', native: 'Русский' },
  { code: 'uk', native: 'Українська' },
  { code: 'es', native: 'Español' },
  { code: 'pt-BR', native: 'Português (Brasil)' },
  { code: 'vi', native: 'Tiếng Việt' },
  { code: 'id', native: 'Bahasa Indonesia' },
  { code: 'tr', native: 'Türkçe' },
  { code: 'pl', native: 'Polski' },
] as const satisfies readonly { code: InterfaceLanguageOptionCode; native: string }[];

/**
 * Языки интерфейса, реально готовые к показу пользователю (полностью
 * переведены, не падают в русский фолбэк).
 *
 * Это ОТДЕЛЬНЫЙ от контентного охвата гейт: source-локали могут быть
 * "active" для квизов/паков, но интерфейс на них ещё не готов. Добавлять
 * сюда язык только когда его UI-перевод завершён.
 *
 * Все зарегистрированные языки ниже — часть пользовательского релиза.
 */
export const INTERFACE_LANG_READY_FOR_PROD: readonly InterfaceLanguageOptionCode[] = [
  'ru',
  'uk',
  'es',
  'pt-BR',
  'vi',
  'id',
  'tr',
  'pl',
];

export function isInterfaceLangEnabled(lang: InterfaceLanguageOptionCode): lang is Lang {
  if (lang === 'es') return SPANISH_UI_LOCALE_ENABLED;
  return INTERFACE_LANG_READY_FOR_PROD.includes(lang);
}

function normalizeInterfaceLangCandidate(value: string): InterfaceLanguageOptionCode | null {
  const raw = value.trim();
  if (!raw) return null;
  const lower = raw.replace(/_/g, '-').toLowerCase();
  if (lower === 'pt' || lower === 'pt-br') return 'pt-BR';
  const base = lower.split('-')[0];
  if (base === 'ru') return 'ru';
  if (base === 'uk') return 'uk';
  if (base === 'es') return 'es';
  if (base === 'vi') return 'vi';
  if (base === 'id') return 'id';
  if (base === 'tr') return 'tr';
  if (base === 'pl') return 'pl';
  return null;
}

export function coerceInterfaceLang(value: unknown): Lang | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeInterfaceLangCandidate(value);
  return normalized && isInterfaceLangEnabled(normalized) ? normalized : null;
}

export function resolveBootstrapLocaleFromDeviceLocale(deviceLocale: unknown): Lang {
  const normalized = typeof deviceLocale === 'string'
    ? normalizeInterfaceLangCandidate(deviceLocale)
    : null;
  return normalized && isInterfaceLangEnabled(normalized) ? normalized : 'ru';
}

export function getDeviceBootstrapLocale(): Lang {
  try {
    return resolveBootstrapLocaleFromDeviceLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'ru';
  }
}

export type InterfaceLanguageOption = (typeof INTERFACE_LANGUAGE_OPTIONS)[number];

/**
 * Опции языка интерфейса для экрана настроек.
 *
 * В store- и dev-сборках показываются все готовые языки интерфейса. Язык
 * исключается только если его нет в релизном списке готовности.
 */
export function getVisibleInterfaceLanguageOptions(
  storeRelease: boolean,
): readonly InterfaceLanguageOption[] {
  if (!storeRelease) return INTERFACE_LANGUAGE_OPTIONS;
  return INTERFACE_LANGUAGE_OPTIONS.filter((item) =>
    isInterfaceLangEnabled(item.code),
  );
}

export const T = {
  ru: {
    // Табы
    tabLessons:   'Учёба',
    tabSettings:  'Настройки',

    // Список уроков
    lessonN:      (n: number) => `Урок ${n}`,
    locked:       'Ещё не открыто',

    // Меню урока
    continueLesson:   'Продолжить',
    learnWords:       'Новые слова',
    learnVerbs:       'Формы глаголов',
    lessonDescription:'О чём этот урок',

    // Урок
    noArticle:  'без артикля',

    oops:       'Почти!',
    hint:       'Подсказка',
    help:       'Помощь',
    oral:       'Вслух',
    next:       'Продолжить',
    typeAnswer: 'Напиши ответ...',

    // Квизы
    selectLevel:  'Выбери уровень',
    easy:         'Лёгкий',
    medium:       'Средний',
    hard:         'Сложный',
    playAgain:    'Ещё раз',
    selectLevel2: 'Сменить уровень',
    fixErrors:    'Разбери промахи',
    correct:      'верно',
    reviewDone:   'Все разобрано. Молодец.',

    // Новые слова
    training:     'Повторение',
    wordList:     'Все фразы раунда',
    allLearned:   'Все фразы — твои. Раунд закрыт.',
    wordsInLesson:(n: number) => `${n} фраз — осваиваем`,

    // Настройки
    settings:       'Настройки',
    learningSettings:'Как ты осваиваешь',
    autoCheck:      'Автопроверка',
    autoCheckSub:   'Проверяет ответ, когда введёшь последнее слово',
    voiceOut:       'Произносить вслух',
    voiceOutSub:    'Приложение прочитает фразу после ответа',
    autoAdvance:    'Переход без паузы',
    autoAdvanceSub: 'Автоматически переходит к следующему при верном ответе',
    hardMode:       'Только клавиатура',
    hardModeSub:    'Пишешь всё сам — без подсказок',
    speed:          'Скорость речи',
    speedHint:      'Отпусти — услышишь пример',
    slow:           'Медленнее',
    fast:           'Быстрее',
    helpMenu:       'Помощь',

    // Онбординг
    chooseLanguage: 'Выбери язык',
    enterName:      'Как тебя зовут?',
    namePlaceholder:'Имя или никнейм...',
    continueBtn:    'Продолжить',
    nameRequired:   'Напиши своё имя — и продолжим',

    // Онбординг: цель
    whyLearnEnglish: 'Зачем тебе английский?',
    goalTourism:     'Путешествия',
    goalWork:        'Карьера и работа',
    goalEmigration:  'Переезд за рубеж',
    goalHobby:       'Для себя',

    // Онбординг: интенсивность
    hoursPerDay:     'Сколько времени в день готов тратить?',
    min5:            '5 минут — лёгкий старт',
    min15:           '15 минут — хороший темп',
    min30:           '30 минут — быстрый путь',
    min60:           '60+ минут — полное погружение',

    // Онбординг: уровень
    currentLevel:    'Как ты сейчас говоришь по-английски?',
    levelA1:         'Начинаю с нуля',
    levelA2:         'Знаю базу',
    levelB1:         'Могу разговаривать',
    levelB2:         'Понимаю фильмы и подкасты',

    // Онбординг: напоминания
    preferredTime:   'В какое время тебе удобнее учить?',
    setNotifications: 'Напоминай мне в {time}',

    // Онбординг: завершение
    congratulations: 'Готово!',
    onboardingComplete: 'Начнём прямо сейчас.',
    step:            (n: number, total: number) => `${n} из ${total} шагов`,
  },
  uk: {
    tabLessons:   'Уроки',
    tabSettings:  'Налаштування',

    lessonN:      (n: number) => `Урок ${n}`,
    locked:       'Недоступно',

    continueLesson:   'Продовжити урок',
    learnWords:       'Вчити нові слова',
    learnVerbs:       'Вчити форми дієслів',
    lessonDescription:'Опис уроку',

    noArticle:  'без артикля',

    oops:       'Ой, помилився',
    hint:       'Підказка',
    help:       'Допомога',
    oral:       'Усно',
    next:       'Далі',
    typeAnswer: 'Введіть відповідь...',

    selectLevel:  'Оберіть рівень',
    easy:         'Легко',
    medium:       'Середньо',
    hard:         'Складно',
    playAgain:    'Пройти знову',
    selectLevel2: 'Обрати рівень',
    fixErrors:    'Виправ помилки',
    correct:      'правильно',
    reviewDone:   'Всі помилки виправлено!',

    training:     'Тренування',
    wordList:     'Список слів',
    allLearned:   'Всі слова вивчено!',
    wordsInLesson:(n: number) => `${n} слів у цьому уроці`,

    settings:       'Налаштування',
    learningSettings:'Налаштування навчання',
    autoCheck:      'Автоперевірка',
    autoCheckSub:   'Перевіряти при наборі останнього слова',
    voiceOut:       'Озвучити відповідь',
    voiceOutSub:    'Вимовляти фразу після відповіді',
    autoAdvance:    'Автоперехід',
    autoAdvanceSub: 'Перехід до наступного тесту при правильній відповіді',
    hardMode:       'Складний режим',
    hardModeSub:    'Введення речення вручну з клавіатури',
    speed:          'Швидкість вимови',
    speedHint:      'Відпусти повзунок — пролунає приклад',
    slow:           'Повільно',
    fast:           'Швидко',
    helpMenu:       'Допомога',

    chooseLanguage: 'Оберіть мову',
    enterName:      'Введіть ваше ім\'я або нікнейм',
    namePlaceholder:'Ваше ім\'я...',
    continueBtn:    'Продовжити',
    nameRequired:   'Введіть ім\'я щоб продовжити',

    // Онбординг: цель
    whyLearnEnglish: 'Навіщо ти вчиш англійську?',
    goalTourism:     'Туризм',
    goalWork:        'Робота',
    goalEmigration:  'Еміграція',
    goalHobby:       'Хобі',

    // Онбординг: інтенсивність
    hoursPerDay:     'Скільки часу на день?',
    min5:            '5 хвилин',
    min15:           '15 хвилин',
    min30:           '30 хвилин',
    min60:           '60+ хвилин',

    // Онбординг: рівень
    currentLevel:    'Твій поточний рівень?',
    levelA1:         'Початківець (ніколи не вчив)',
    levelA2:         'Основи (знаю абетку)',
    levelB1:         'Середній (можу розмовляти)',
    levelB2:         'Добре (розумію фільми)',

    // Онбординг: нагадування
    preferredTime:   'Коли зазвичай вільний?',
    setNotifications: 'Нагадувати мені в {time} кожен день',

    // Онбординг: завершення
    congratulations: 'Вітаємо!',
    onboardingComplete: 'Ти завершив онбординг',
    step:            (n: number, total: number) => `${n} з ${total} кроків`,
  },
  es: {
    tabLessons:   'Lecciones',
    tabSettings:  'Ajustes',

    lessonN:      (n: number) => `Lección ${n}`,
    locked:       'No disponible',

    continueLesson:   'Continuar la lección',
    learnWords:       'Aprender palabras nuevas',
    learnVerbs:       'Aprender las formas verbales',
    lessonDescription:'Descripción de la lección',

    noArticle:  'sin artículo',

    oops:       'Uy, me equivoqué',
    hint:       'Pista',
    help:       'Ayuda',
    oral:       'En voz alta',
    next:       'Siguiente',
    typeAnswer: 'Escribe tu respuesta...',

    selectLevel:  'Elige el nivel',
    easy:         'Fácil',
    medium:       'Medio',
    hard:         'Difícil',
    playAgain:    'Intentar de nuevo',
    selectLevel2: 'Elegir otro nivel',
    fixErrors:    'Corrige los errores',
    correct:      'bien',
    reviewDone:   '¡Todos los errores corregidos!',

    training:     'Práctica',
    wordList:     'Lista de palabras',
    allLearned:   '¡Has aprendido todas las palabras!',
    wordsInLesson:(n: number) => `${n} palabras en esta lección`,

    settings:       'Ajustes',
    learningSettings:'Ajustes del aprendizaje',
    autoCheck:      'Comprobación automática',
    autoCheckSub:   'Comprobar al escribir la última palabra',
    voiceOut:       'Leer respuestas en voz alta',
    voiceOutSub:    'La app reproduce la frase después de responder',
    autoAdvance:    'Siguiente automático',
    autoAdvanceSub: 'Pasar a la siguiente pregunta si la respuesta es correcta',
    hardMode:       'Modo teclado',
    hardModeSub:    'Escribir la frase completa con el teclado',
    speed:          'Velocidad de la voz',
    speedHint:      'Suelta el control deslizante para escuchar un ejemplo',
    slow:           'Lenta',
    fast:           'Rápida',
    helpMenu:       'Ayuda',

    chooseLanguage: 'Elige el idioma',
    enterName:      'Escribe tu nombre o apodo',
    namePlaceholder:'Tu nombre...',
    continueBtn:    'Continuar',
    nameRequired:   'Escribe tu nombre para continuar',

    whyLearnEnglish: '¿Para qué estudias inglés?',
    goalTourism:     'el turismo',
    goalWork:        'el trabajo',
    goalEmigration:  'la emigración',
    goalHobby:       'el ocio',

    hoursPerDay:     '¿Cuánto tiempo al día?',
    min5:            '5 minutos',
    min15:           '15 minutos',
    min30:           '30 minutos',
    min60:           '60+ minutos',

    currentLevel:    '¿Cuál es tu nivel ahora mismo?',
    levelA1:         'Principiante (empiezo de cero o casi)',
    levelA2:         'Elemental (léxico básico; lectura con apoyo)',
    levelB1:         'Intermedio (mantengo conversaciones sencillas)',
    levelB2:         'Intermedio alto (comprendo audio auténtico con contexto)',

    preferredTime:   '¿A qué hora sueles tener un rato libre?',
    setNotifications: 'Avísame cada día a las {time}',

    congratulations: '¡Felicidades!',
    onboardingComplete: 'Has completado la configuración inicial',
    step:            (n: number, total: number) => `${n} de ${total} pasos`,
  },
  'pt-BR': {
    tabLessons:   'Lições',
    tabSettings:  'Configurações',

    lessonN:      (n: number) => `Lição ${n}`,
    locked:       'Indisponível',

    continueLesson:   'Continuar a lição',
    learnWords:       'Aprender palavras novas',
    learnVerbs:       'Aprender formas verbais',
    lessonDescription:'Descrição da lição',

    noArticle:  'sem artigo',

    oops:       'Ops, errei',
    hint:       'Dica',
    help:       'Ajuda',
    oral:       'Em voz alta',
    next:       'Próximo',
    typeAnswer: 'Digite sua resposta...',

    selectLevel:  'Escolha o nível',
    easy:         'Fácil',
    medium:       'Médio',
    hard:         'Difícil',
    playAgain:    'Tentar de novo',
    selectLevel2: 'Escolher outro nível',
    fixErrors:    'Corrigir erros',
    correct:      'certo',
    reviewDone:   'Todos os erros foram corrigidos!',

    training:     'Treino',
    wordList:     'Lista de palavras',
    allLearned:   'Você aprendeu todas as palavras!',
    wordsInLesson:(n: number) => `${n} palavras nesta lição`,

    settings:       'Configurações',
    learningSettings:'Configurações de estudo',
    autoCheck:      'Correção automática',
    autoCheckSub:   'Verificar ao digitar a última palavra',
    voiceOut:       'Ler respostas em voz alta',
    voiceOutSub:    'Reproduzir a frase depois da resposta',
    autoAdvance:    'Avanço automático',
    autoAdvanceSub: 'Ir para a próxima pergunta quando a resposta estiver correta',
    hardMode:       'Modo teclado',
    hardModeSub:    'Digitar a frase inteira manualmente',
    speed:          'Velocidade da voz',
    speedHint:      'Solte o controle para ouvir um exemplo',
    slow:           'Devagar',
    fast:           'Rápido',
    helpMenu:       'Ajuda',

    chooseLanguage: 'Escolha o idioma',
    enterName:      'Digite seu nome ou apelido',
    namePlaceholder:'Seu nome...',
    continueBtn:    'Continuar',
    nameRequired:   'Digite um nome para continuar',

    whyLearnEnglish: 'Por que você está aprendendo inglês?',
    goalTourism:     'turismo',
    goalWork:        'trabalho',
    goalEmigration:  'emigração',
    goalHobby:       'hobby',

    hoursPerDay:     'Quanto tempo por dia?',
    min5:            '5 minutos',
    min15:           '15 minutos',
    min30:           '30 minutos',
    min60:           '60+ minutos',

    currentLevel:    'Qual é o seu nível agora?',
    levelA1:         'Iniciante (nunca estudei)',
    levelA2:         'Básico (sei o alfabeto)',
    levelB1:         'Intermediário (consigo conversar)',
    levelB2:         'Bom (entendo filmes)',

    preferredTime:   'Quando você costuma ter tempo livre?',
    setNotifications: 'Lembre-me todos os dias às {time}',

    congratulations: 'Parabéns!',
    onboardingComplete: 'Você concluiu a configuração inicial',
    step:            (n: number, total: number) => `${n} de ${total} passos`,
  },
  vi: {
    tabLessons:   'Bài học',
    tabSettings:  'Cài đặt',

    lessonN:      (n: number) => `Bài ${n}`,
    locked:       'Chưa khả dụng',

    continueLesson:   'Tiếp tục bài học',
    learnWords:       'Học từ mới',
    learnVerbs:       'Học dạng động từ',
    lessonDescription:'Mô tả bài học',

    noArticle:  'không có mạo từ',

    oops:       'Ôi, sai rồi',
    hint:       'Gợi ý',
    help:       'Trợ giúp',
    oral:       'Nói thành tiếng',
    next:       'Tiếp theo',
    typeAnswer: 'Nhập câu trả lời...',

    selectLevel:  'Chọn cấp độ',
    easy:         'Dễ',
    medium:       'Trung bình',
    hard:         'Khó',
    playAgain:    'Làm lại',
    selectLevel2: 'Chọn cấp độ khác',
    fixErrors:    'Sửa lỗi',
    correct:      'đúng',
    reviewDone:   'Đã sửa tất cả lỗi!',

    training:     'Luyện tập',
    wordList:     'Danh sách từ',
    allLearned:   'Bạn đã học hết các từ!',
    wordsInLesson:(n: number) => `${n} từ trong bài này`,

    settings:       'Cài đặt',
    learningSettings:'Cài đặt học tập',
    autoCheck:      'Tự động kiểm tra',
    autoCheckSub:   'Kiểm tra khi nhập từ cuối cùng',
    voiceOut:       'Đọc câu trả lời',
    voiceOutSub:    'Phát câu sau khi trả lời',
    autoAdvance:    'Tự động chuyển tiếp',
    autoAdvanceSub: 'Chuyển sang câu tiếp theo khi trả lời đúng',
    hardMode:       'Chế độ bàn phím',
    hardModeSub:    'Tự nhập cả câu bằng bàn phím',
    speed:          'Tốc độ giọng đọc',
    speedHint:      'Thả thanh trượt để nghe ví dụ',
    slow:           'Chậm',
    fast:           'Nhanh',
    helpMenu:       'Trợ giúp',

    chooseLanguage: 'Chọn ngôn ngữ',
    enterName:      'Nhập tên hoặc biệt danh',
    namePlaceholder:'Tên của bạn...',
    continueBtn:    'Tiếp tục',
    nameRequired:   'Nhập tên để tiếp tục',

    whyLearnEnglish: 'Vì sao bạn học tiếng Anh?',
    goalTourism:     'du lịch',
    goalWork:        'công việc',
    goalEmigration:  'di cư',
    goalHobby:       'sở thích',

    hoursPerDay:     'Bao nhiêu thời gian mỗi ngày?',
    min5:            '5 phút',
    min15:           '15 phút',
    min30:           '30 phút',
    min60:           '60+ phút',

    currentLevel:    'Trình độ hiện tại của bạn?',
    levelA1:         'Mới bắt đầu (chưa từng học)',
    levelA2:         'Cơ bản (biết bảng chữ cái)',
    levelB1:         'Trung cấp (có thể trò chuyện)',
    levelB2:         'Khá tốt (hiểu phim)',

    preferredTime:   'Bạn thường rảnh lúc nào?',
    setNotifications: 'Nhắc tôi mỗi ngày lúc {time}',

    congratulations: 'Chúc mừng!',
    onboardingComplete: 'Bạn đã hoàn tất thiết lập ban đầu',
    step:            (n: number, total: number) => `${n} / ${total} bước`,
  },
  id: {
    tabLessons:   'Pelajaran',
    tabSettings:  'Pengaturan',

    lessonN:      (n: number) => `Pelajaran ${n}`,
    locked:       'Tidak tersedia',

    continueLesson:   'Lanjutkan pelajaran',
    learnWords:       'Pelajari kata baru',
    learnVerbs:       'Pelajari bentuk kata kerja',
    lessonDescription:'Deskripsi pelajaran',

    noArticle:  'tanpa artikel',

    oops:       'Ups, salah',
    hint:       'Petunjuk',
    help:       'Bantuan',
    oral:       'Lisan',
    next:       'Berikutnya',
    typeAnswer: 'Ketik jawaban...',

    selectLevel:  'Pilih level',
    easy:         'Mudah',
    medium:       'Sedang',
    hard:         'Sulit',
    playAgain:    'Coba lagi',
    selectLevel2: 'Pilih level lain',
    fixErrors:    'Perbaiki kesalahan',
    correct:      'benar',
    reviewDone:   'Semua kesalahan sudah diperbaiki!',

    training:     'Latihan',
    wordList:     'Daftar kata',
    allLearned:   'Semua kata sudah dipelajari!',
    wordsInLesson:(n: number) => `${n} kata di pelajaran ini`,

    settings:       'Pengaturan',
    learningSettings:'Pengaturan belajar',
    autoCheck:      'Periksa otomatis',
    autoCheckSub:   'Periksa saat mengetik kata terakhir',
    voiceOut:       'Bacakan jawaban',
    voiceOutSub:    'Putar frasa setelah menjawab',
    autoAdvance:    'Lanjut otomatis',
    autoAdvanceSub: 'Pindah ke pertanyaan berikutnya saat jawaban benar',
    hardMode:       'Mode keyboard',
    hardModeSub:    'Ketik seluruh kalimat secara manual',
    speed:          'Kecepatan suara',
    speedHint:      'Lepaskan slider untuk mendengar contoh',
    slow:           'Lambat',
    fast:           'Cepat',
    helpMenu:       'Bantuan',

    chooseLanguage: 'Pilih bahasa',
    enterName:      'Masukkan nama atau nama panggilan',
    namePlaceholder:'Nama kamu...',
    continueBtn:    'Lanjutkan',
    nameRequired:   'Masukkan nama untuk melanjutkan',

    whyLearnEnglish: 'Untuk apa kamu belajar bahasa Inggris?',
    goalTourism:     'pariwisata',
    goalWork:        'pekerjaan',
    goalEmigration:  'emigrasi',
    goalHobby:       'hobi',

    hoursPerDay:     'Berapa lama per hari?',
    min5:            '5 menit',
    min15:           '15 menit',
    min30:           '30 menit',
    min60:           '60+ menit',

    currentLevel:    'Level kamu sekarang?',
    levelA1:         'Pemula (belum pernah belajar)',
    levelA2:         'Dasar (tahu alfabet)',
    levelB1:         'Menengah (bisa bercakap-cakap)',
    levelB2:         'Baik (paham film)',

    preferredTime:   'Kapan biasanya kamu punya waktu luang?',
    setNotifications: 'Ingatkan saya setiap hari pukul {time}',

    congratulations: 'Selamat!',
    onboardingComplete: 'Kamu sudah menyelesaikan pengaturan awal',
    step:            (n: number, total: number) => `${n} dari ${total} langkah`,
  },
  tr: {
    tabLessons:   'Dersler',
    tabSettings:  'Ayarlar',

    lessonN:      (n: number) => `Ders ${n}`,
    locked:       'Kullanılamaz',

    continueLesson:   'Derse devam et',
    learnWords:       'Yeni kelimeler öğren',
    learnVerbs:       'Fiil biçimlerini öğren',
    lessonDescription:'Ders açıklaması',

    noArticle:  'articlesız',

    oops:       'Oops, hata yaptım',
    hint:       'İpucu',
    help:       'Yardım',
    oral:       'Sesli',
    next:       'Sonraki',
    typeAnswer: 'Cevabını yaz...',

    selectLevel:  'Seviye seç',
    easy:         'Kolay',
    medium:       'Orta',
    hard:         'Zor',
    playAgain:    'Tekrar dene',
    selectLevel2: 'Başka seviye seç',
    fixErrors:    'Hataları düzelt',
    correct:      'doğru',
    reviewDone:   'Tüm hatalar düzeltildi!',

    training:     'Alıştırma',
    wordList:     'Kelime listesi',
    allLearned:   'Tüm kelimeleri öğrendin!',
    wordsInLesson:(n: number) => `Bu derste ${n} kelime`,

    settings:       'Ayarlar',
    learningSettings:'Öğrenme ayarları',
    autoCheck:      'Otomatik kontrol',
    autoCheckSub:   'Son kelime yazılınca kontrol et',
    voiceOut:       'Cevabı seslendir',
    voiceOutSub:    'Cevaptan sonra ifadeyi oynat',
    autoAdvance:    'Otomatik geçiş',
    autoAdvanceSub: 'Doğru cevaptan sonra sonraki soruya geç',
    hardMode:       'Klavye modu',
    hardModeSub:    'Cümleyi klavyeyle elle yaz',
    speed:          'Ses hızı',
    speedHint:      'Örneği dinlemek için kaydırıcıyı bırak',
    slow:           'Yavaş',
    fast:           'Hızlı',
    helpMenu:       'Yardım',

    chooseLanguage: 'Dil seç',
    enterName:      'Adını veya takma adını gir',
    namePlaceholder:'Adın...',
    continueBtn:    'Devam et',
    nameRequired:   'Devam etmek için ad gir',

    whyLearnEnglish: 'Neden İngilizce öğreniyorsun?',
    goalTourism:     'turizm',
    goalWork:        'iş',
    goalEmigration:  'göç',
    goalHobby:       'hobi',

    hoursPerDay:     'Günde ne kadar zaman?',
    min5:            '5 dakika',
    min15:           '15 dakika',
    min30:           '30 dakika',
    min60:           '60+ dakika',

    currentLevel:    'Şu anki seviyen?',
    levelA1:         'Başlangıç (hiç çalışmadım)',
    levelA2:         'Temel (alfabeyi biliyorum)',
    levelB1:         'Orta (konuşabiliyorum)',
    levelB2:         'İyi (filmleri anlıyorum)',

    preferredTime:   'Genelde ne zaman boş olursun?',
    setNotifications: 'Her gün {time} saatinde hatırlat',

    congratulations: 'Tebrikler!',
    onboardingComplete: 'İlk kurulumu tamamladın',
    step:            (n: number, total: number) => `${n} / ${total} adım`,
  },
  pl: {
    tabLessons:   'Lekcje',
    tabSettings:  'Ustawienia',

    lessonN:      (n: number) => `Lekcja ${n}`,
    locked:       'Niedostępne',

    continueLesson:   'Kontynuuj lekcję',
    learnWords:       'Ucz się nowych słów',
    learnVerbs:       'Ucz się form czasowników',
    lessonDescription:'Opis lekcji',

    noArticle:  'bez rodzajnika',

    oops:       'Ups, błąd',
    hint:       'Podpowiedź',
    help:       'Pomoc',
    oral:       'Na głos',
    next:       'Dalej',
    typeAnswer: 'Wpisz odpowiedź...',

    selectLevel:  'Wybierz poziom',
    easy:         'Łatwy',
    medium:       'Średni',
    hard:         'Trudny',
    playAgain:    'Spróbuj ponownie',
    selectLevel2: 'Wybierz inny poziom',
    fixErrors:    'Popraw błędy',
    correct:      'poprawnie',
    reviewDone:   'Wszystkie błędy poprawione!',

    training:     'Trening',
    wordList:     'Lista słów',
    allLearned:   'Wszystkie słowa są już nauczone!',
    wordsInLesson:(n: number) => `${n} słów w tej lekcji`,

    settings:       'Ustawienia',
    learningSettings:'Ustawienia nauki',
    autoCheck:      'Automatyczne sprawdzanie',
    autoCheckSub:   'Sprawdzaj po wpisaniu ostatniego słowa',
    voiceOut:       'Odczytaj odpowiedź',
    voiceOutSub:    'Odtwarzaj frazę po odpowiedzi',
    autoAdvance:    'Automatyczne przejście',
    autoAdvanceSub: 'Przejdź do następnego pytania po poprawnej odpowiedzi',
    hardMode:       'Tryb klawiatury',
    hardModeSub:    'Wpisuj całe zdanie ręcznie',
    speed:          'Szybkość wymowy',
    speedHint:      'Puść suwak, aby usłyszeć przykład',
    slow:           'Wolno',
    fast:           'Szybko',
    helpMenu:       'Pomoc',

    chooseLanguage: 'Wybierz język',
    enterName:      'Wpisz imię albo nick',
    namePlaceholder:'Twoje imię...',
    continueBtn:    'Kontynuuj',
    nameRequired:   'Wpisz imię, aby kontynuować',

    whyLearnEnglish: 'Po co uczysz się angielskiego?',
    goalTourism:     'turystyka',
    goalWork:        'praca',
    goalEmigration:  'emigracja',
    goalHobby:       'hobby',

    hoursPerDay:     'Ile czasu dziennie?',
    min5:            '5 minut',
    min15:           '15 minut',
    min30:           '30 minut',
    min60:           '60+ minut',

    currentLevel:    'Twój obecny poziom?',
    levelA1:         'Początkujący (nigdy się nie uczyłem)',
    levelA2:         'Podstawy (znam alfabet)',
    levelB1:         'Średni (mogę rozmawiać)',
    levelB2:         'Dobry (rozumiem filmy)',

    preferredTime:   'Kiedy zwykle masz wolną chwilę?',
    setNotifications: 'Przypominaj mi codziennie o {time}',

    congratulations: 'Gratulacje!',
    onboardingComplete: 'Konfiguracja początkowa zakończona',
    step:            (n: number, total: number) => `${n} z ${total} kroków`,
  },
} as const;

export type Strings = typeof T['ru'];
type WidenTriLangValue<T> =
  T extends string ? string :
  T extends number ? number :
  T extends boolean ? boolean :
  T extends (...args: infer Args) => infer Return ? (...args: Args) => Return :
  T extends readonly (infer Item)[] ? readonly WidenTriLangValue<Item>[] :
  T extends object ? { [K in keyof T]: WidenTriLangValue<T[K]> } :
  T;

/** Интерфейсные значения для всех активных языков. */
export function triLang<const T extends { ru: unknown; uk: unknown; es: unknown } & Partial<Record<PlannedInterfaceLang, unknown>>>(
  lang: Lang,
  txt: T,
): WidenTriLangValue<T[keyof T]> {
  if (lang === 'uk') return txt.uk as WidenTriLangValue<T[keyof T]>;
  if (lang === 'es' && isInterfaceLangEnabled(lang)) return txt.es as WidenTriLangValue<T[keyof T]>;
  if (lang !== 'ru' && lang in txt) return (txt[lang as keyof T] ?? txt.es) as WidenTriLangValue<T[keyof T]>;
  return txt.ru as WidenTriLangValue<T[keyof T]>;
}

/** Ключ строк в `T` для текущего языка интерфейса (RU / UK / ES). */
export function legacyRuUk(lang: Lang): 'ru' | 'uk' | 'es' {
  if (lang === 'uk') return 'uk';
  if (lang === 'es' && isInterfaceLangEnabled(lang)) return 'es';
  return 'ru';
}

/** Пакеты UI с полными строками RU / UK / ES (магазин осколков, paywall и т.д.). */
export type UiBundleLang = 'ru' | 'uk' | 'es';

export function bundleLang(lang: Lang): UiBundleLang {
  if (lang === 'uk') return 'uk';
  if (lang === 'es' && isInterfaceLangEnabled(lang)) return 'es';
  return 'ru';
}
