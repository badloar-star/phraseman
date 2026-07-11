/** Copy for the non-interrupting Compass surfaces that remain in the product. */
export interface CompassText {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}

export const COMPASS_PUSH_COMEBACK: CompassText = {
  ru: 'Давно не виделись. Всё твоё на месте.', uk: 'Давно не бачились. Усе твоє на місці.',
  es: 'Cuánto tiempo. Todo lo tuyo sigue aquí.', 'pt-BR': 'Quanto tempo. Tudo seu continua aqui.',
  vi: 'Lâu rồi không gặp. Mọi thứ của bạn vẫn còn.', id: 'Lama tak jumpa. Semua milikmu masih ada.',
  tr: 'Görüşmeyeli uzun oldu. Her şeyin yerinde.', pl: 'Dawno się nie widzieliśmy. Wszystko twoje czeka.',
};

export const COMPASS_PUSH_NEW_PHRASES: CompassText = {
  ru: 'В твоей теме — новые фразы. Откроем?', uk: 'У твоїй темі — нові фрази. Відкриємо?',
  es: 'Hay frases nuevas en tu tema. ¿Las abrimos?', 'pt-BR': 'Há frases novas no seu tema. Abrimos?',
  vi: 'Có câu mới trong chủ đề của bạn. Mở nhé?', id: 'Ada frasa baru di topikmu. Buka, yuk?',
  tr: 'Konunda yeni ifadeler var. Açalım mı?', pl: 'W twoim temacie są nowe frazy. Otworzymy?',
};

export const COMPASS_PUSH_STREAK_GAIN: CompassText = {
  ru: 'Пять минут — и серия растёт дальше.', uk: 'П’ять хвилин — і серія росте далі.',
  es: 'Cinco minutos y tu racha sigue creciendo.', 'pt-BR': 'Cinco minutos e sua sequência continua.',
  vi: 'Năm phút và chuỗi của bạn dài thêm.', id: 'Lima menit dan rangkaianmu makin panjang.',
  tr: 'Beş dakika ve serin uzamaya devam eder.', pl: 'Pięć minut i seria rośnie dalej.',
};

export const COMPASS_PUSH_STREAK_KEEP: CompassText = {
  ru: 'Серия {days} дней ждёт тебя сегодня.', uk: 'Серія {days} днів чекає на тебе сьогодні.',
  es: 'Tu racha de {days} días te espera hoy.', 'pt-BR': 'Sua sequência de {days} dias espera hoje.',
  vi: 'Chuỗi {days} ngày đang đợi bạn hôm nay.', id: 'Rangkaian {days} hari menunggumu hari ini.',
  tr: '{days} günlük serin bugün seni bekliyor.', pl: 'Seria {days} dni czeka na ciebie dziś.',
};

export const COMPASS_STATS_TITLE: CompassText = {
  ru: 'Твой путь с Компасом', uk: 'Твій шлях з Компасом', es: 'Tu camino con la Brújula',
  'pt-BR': 'Seu caminho com a Bússola', vi: 'Hành trình của bạn với La bàn',
  id: 'Perjalananmu bersama Kompas', tr: 'Pusula ile yolculuğun', pl: 'Twoja droga z Kompasem',
};

export const COMPASS_STATS_STREAK: CompassText = {
  ru: 'Серия с Компасом', uk: 'Серія з Компасом', es: 'Racha con la Brújula',
  'pt-BR': 'Sequência com a Bússola', vi: 'Chuỗi với La bàn', id: 'Rangkaian dengan Kompas',
  tr: 'Pusula serisi', pl: 'Seria z Kompasem',
};

export const COMPASS_STATS_DAYS: CompassText = {
  ru: 'Дней закрыто', uk: 'Днів закрито', es: 'Días completados', 'pt-BR': 'Dias concluídos',
  vi: 'Số ngày hoàn thành', id: 'Hari diselesaikan', tr: 'Tamamlanan gün', pl: 'Dni ukończone',
};

export const COMPASS_STATS_TOPICS: CompassText = {
  ru: 'Темы окрепли', uk: 'Теми зміцніли', es: 'Temas reforzados', 'pt-BR': 'Temas reforçados',
  vi: 'Chủ đề vững hơn', id: 'Topik menguat', tr: 'Güçlenen konular', pl: 'Tematy okrzepły',
};

export const COMPASS_TOPIC_STATUS: Record<'confident' | 'growing' | 'guided', CompassText> = {
  confident: { ru: 'уверенно', uk: 'упевнено', es: 'con seguridad', 'pt-BR': 'com firmeza', vi: 'vững vàng', id: 'percaya diri', tr: 'sağlam', pl: 'pewnie' },
  growing: { ru: 'крепнет', uk: 'міцніє', es: 'creciendo', 'pt-BR': 'crescendo', vi: 'đang vững', id: 'menguat', tr: 'gelişiyor', pl: 'krzepnie' },
  guided: { ru: 'ведём сюда', uk: 'ведемо сюди', es: 'vamos aquí', 'pt-BR': 'vamos por aqui', vi: 'dẫn vào đây', id: 'menuju ke sini', tr: 'buraya yönlendiriyoruz', pl: 'tu prowadzimy' },
};

export const COMPASS_TOPIC_LABEL: Record<string, CompassText> = {
  verb: { ru: 'Глаголы', uk: 'Дієслова', es: 'Verbos', 'pt-BR': 'Verbos', vi: 'Động từ', id: 'Kata kerja', tr: 'Fiiller', pl: 'Czasowniki' },
  noun: { ru: 'Существительные', uk: 'Іменники', es: 'Sustantivos', 'pt-BR': 'Substantivos', vi: 'Danh từ', id: 'Kata benda', tr: 'İsimler', pl: 'Rzeczowniki' },
  pronoun: { ru: 'Местоимения', uk: 'Займенники', es: 'Pronombres', 'pt-BR': 'Pronomes', vi: 'Đại từ', id: 'Kata ganti', tr: 'Zamirler', pl: 'Zaimki' },
  adjective: { ru: 'Прилагательные', uk: 'Прикметники', es: 'Adjetivos', 'pt-BR': 'Adjetivos', vi: 'Tính từ', id: 'Kata sifat', tr: 'Sıfatlar', pl: 'Przymiotniki' },
  adverb: { ru: 'Наречия', uk: 'Прислівники', es: 'Adverbios', 'pt-BR': 'Advérbios', vi: 'Trạng từ', id: 'Kata keterangan', tr: 'Zarflar', pl: 'Przysłówki' },
  preposition: { ru: 'Предлоги', uk: 'Прийменники', es: 'Preposiciones', 'pt-BR': 'Preposições', vi: 'Giới từ', id: 'Kata depan', tr: 'Edatlar', pl: 'Przyimki' },
  article: { ru: 'Артикли a/the', uk: 'Артиклі a/the', es: 'Artículos a/the', 'pt-BR': 'Artigos a/the', vi: 'Mạo từ a/the', id: 'Artikel a/the', tr: 'Artikeller a/the', pl: 'Przedimki a/the' },
  modal: { ru: 'Модальные', uk: 'Модальні', es: 'Modales', 'pt-BR': 'Modais', vi: 'Động từ khuyết thiếu', id: 'Modal', tr: 'Kipler', pl: 'Modalne' },
  conjunction: { ru: 'Союзы', uk: 'Сполучники', es: 'Conjunciones', 'pt-BR': 'Conjunções', vi: 'Liên từ', id: 'Konjungsi', tr: 'Bağlaçlar', pl: 'Spójniki' },
  syntax: { ru: 'Порядок слов', uk: 'Порядок слів', es: 'Orden de palabras', 'pt-BR': 'Ordem das palavras', vi: 'Trật tự từ', id: 'Urutan kata', tr: 'Kelime sırası', pl: 'Szyk zdania' },
};
