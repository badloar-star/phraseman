import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const tri = (
  ru: string,
  uk: string,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (planned[locale]) copy[locale] = planned[locale];
  }
  return copy;
};

const PLACE_STEP_TRANSLATIONS: Record<string, Record<PlannedTrainingLocale, string>> = {
  place_easy_001: {
    'pt-BR': 'Ela está no quarto.',
    vi: 'Cô ấy ở trong phòng.',
    id: 'Dia ada di dalam ruangan.',
    tr: 'O odada.',
    pl: 'Ona jest w pokoju.',
  },
  place_easy_002: {
    'pt-BR': 'Os documentos estão na caixa.',
    vi: 'Tài liệu ở trong hộp.',
    id: 'Dokumen-dokumen ada di dalam kotak.',
    tr: 'Belgeler kutunun içinde.',
    pl: 'Dokumenty są w pudełku.',
  },
  place_easy_003: {
    'pt-BR': 'Ele mora na Irlanda.',
    vi: 'Anh ấy sống ở Ireland.',
    id: 'Dia tinggal di Irlandia.',
    tr: "O İrlanda'da yaşıyor.",
    pl: 'On mieszka w Irlandii.',
  },
  place_contrast_001: {
    'pt-BR': 'O telefone está sobre a mesa.',
    vi: 'Điện thoại ở trên bàn.',
    id: 'Telepon ada di atas meja.',
    tr: 'Telefon masanın üzerinde.',
    pl: 'Telefon jest na stole.',
  },
  place_contrast_002: {
    'pt-BR': 'Há um quadro na parede.',
    vi: 'Có một bức tranh trên tường.',
    id: 'Ada gambar di dinding.',
    tr: 'Duvarda bir resim var.',
    pl: 'Na ścianie jest obraz.',
  },
  place_contrast_003: {
    'pt-BR': 'O café fica na Main Street.',
    vi: 'Quán cà phê nằm trên phố Main.',
    id: 'Kafe itu berada di Main Street.',
    tr: 'Kafe Main Street üzerinde.',
    pl: 'Kawiarnia jest przy Main Street.',
  },
  place_contrast_004: {
    'pt-BR': 'Vou encontrar você na estação.',
    vi: 'Tôi sẽ gặp bạn ở nhà ga.',
    id: 'Saya akan bertemu denganmu di stasiun.',
    tr: 'Seninle istasyonda buluşacağım.',
    pl: 'Spotkam się z tobą na stacji.',
  },
  place_contrast_005: {
    'pt-BR': 'Ela está no trabalho agora.',
    vi: 'Bây giờ cô ấy đang ở nơi làm việc.',
    id: 'Dia sedang di tempat kerja sekarang.',
    tr: 'O şu anda işte.',
    pl: 'Ona jest teraz w pracy.',
  },
  place_contrast_006: {
    'pt-BR': 'Eu fiquei em casa ontem.',
    vi: 'Hôm qua tôi ở nhà.',
    id: 'Saya tetap di rumah kemarin.',
    tr: 'Dün evde kaldım.',
    pl: 'Wczoraj zostałem w domu.',
  },
  place_mixed_001: {
    'pt-BR': 'Eles abriram um novo escritório em Dublin.',
    vi: 'Họ đã mở một văn phòng mới ở Dublin.',
    id: 'Mereka membuka kantor baru di Dublin.',
    tr: "Dublin'de yeni bir ofis açtılar.",
    pl: 'Otworzyli nowe biuro w Dublinie.',
  },
  place_mixed_002: {
    'pt-BR': 'A reunião é no endereço 18 Park Road.',
    vi: 'Cuộc họp ở địa chỉ 18 Park Road.',
    id: 'Rapatnya di alamat 18 Park Road.',
    tr: 'Toplantı 18 Park Road adresinde.',
    pl: 'Spotkanie jest pod adresem 18 Park Road.',
  },
  place_mixed_003: {
    'pt-BR': 'Há uma farmácia nesta rua.',
    vi: 'Có một hiệu thuốc trên con phố này.',
    id: 'Ada apotek di jalan ini.',
    tr: 'Bu sokakta bir eczane var.',
    pl: 'Na tej ulicy jest apteka.',
  },
  place_mixed_004: {
    'pt-BR': 'Meu filho está na escola agora.',
    vi: 'Con trai tôi bây giờ đang ở trường.',
    id: 'Anak laki-laki saya sedang di sekolah sekarang.',
    tr: 'Oğlum şu anda okulda.',
    pl: 'Mój syn jest teraz w szkole.',
  },
  place_mixed_005: {
    'pt-BR': 'Ela deixou a bolsa no carro.',
    vi: 'Cô ấy để túi trong xe.',
    id: 'Dia meninggalkan tasnya di dalam mobil.',
    tr: 'Çantasını arabada bıraktı.',
    pl: 'Zostawiła torbę w samochodzie.',
  },
  place_mixed_006: {
    'pt-BR': 'As chaves estão sobre a mesa, e John espera junto à porta.',
    vi: 'Chìa khóa ở trên bàn, còn John đang chờ ở cửa.',
    id: 'Kunci ada di atas meja, dan John menunggu di pintu.',
    tr: 'Anahtarlar masanın üzerinde, John da kapıda bekliyor.',
    pl: 'Klucze są na stole, a John czeka przy drzwiach.',
  },
};

const PLACE_SKILL_HINTS: Record<string, Record<PlannedTrainingLocale, string>> = {
  inside_space_in: {
    'pt-BR': 'É um espaço com limites: quando algo está dentro dele, usamos in.',
    vi: 'Đó là không gian có ranh giới: khi ở bên trong, dùng in.',
    id: 'Ini ruang berbatas: ketika sesuatu ada di dalamnya, gunakan in.',
    tr: 'Bu sınırları olan bir alan: içinde olunca in kullanılır.',
    pl: 'To przestrzeń z granicami: gdy coś jest w środku, używamy in.',
  },
  inside_container_in: {
    'pt-BR': 'É um recipiente: quando algo está dentro dele, usamos in.',
    vi: 'Đó là vật chứa: khi thứ gì ở bên trong, dùng in.',
    id: 'Ini wadah: ketika sesuatu ada di dalamnya, gunakan in.',
    tr: 'Bu bir kap/konteyner: içinde olunca in kullanılır.',
    pl: 'To pojemnik: gdy coś jest w środku, używamy in.',
  },
  city_country_in: {
    'pt-BR': 'Países e territórios grandes são tratados como espaço, então usamos in.',
    vi: 'Quốc gia và vùng lãnh thổ lớn được xem như không gian, nên dùng in.',
    id: 'Negara dan wilayah besar dianggap ruang, jadi gunakan in.',
    tr: 'Ülkeler ve büyük bölgeler alan gibi düşünülür, bu yüzden in kullanılır.',
    pl: 'Kraje i duże obszary traktujemy jak przestrzeń, więc używamy in.',
  },
  city_in: {
    'pt-BR': 'Cidades são espaços grandes, então usamos in.',
    vi: 'Thành phố là không gian lớn, nên dùng in.',
    id: 'Kota adalah ruang besar, jadi gunakan in.',
    tr: 'Şehirler geniş alanlardır, bu yüzden in kullanılır.',
    pl: 'Miasta to duże przestrzenie, więc używamy in.',
  },
  surface_on: {
    'pt-BR': 'É uma superfície: quando algo fica sobre ela, usamos on.',
    vi: 'Đó là bề mặt: khi thứ gì ở trên đó, dùng on.',
    id: 'Ini permukaan: ketika sesuatu berada di atasnya, gunakan on.',
    tr: 'Bu bir yüzey: üzerinde olunca on kullanılır.',
    pl: 'To powierzchnia: gdy coś leży na niej, używamy on.',
  },
  vertical_surface_on: {
    'pt-BR': 'A parede também é superfície vertical, então usamos on.',
    vi: 'Tường cũng là bề mặt thẳng đứng, nên dùng on.',
    id: 'Dinding juga permukaan vertikal, jadi gunakan on.',
    tr: 'Duvar da dikey bir yüzeydir, bu yüzden on kullanılır.',
    pl: 'Ściana też jest powierzchnią pionową, więc używamy on.',
  },
  street_on: {
    'pt-BR': 'Uma rua sem número exato funciona como linha, então usamos on.',
    vi: 'Đường phố không có số nhà cụ thể được xem như đường tuyến, nên dùng on.',
    id: 'Jalan tanpa nomor tepat dipandang sebagai garis, jadi gunakan on.',
    tr: 'Kesin numarası olmayan sokak çizgi gibi düşünülür, bu yüzden on kullanılır.',
    pl: 'Ulica bez dokładnego numeru działa jak linia, więc używamy on.',
  },
  point_location_at: {
    'pt-BR': 'Aqui o lugar funciona como ponto de encontro/local, então usamos at.',
    vi: 'Ở đây nơi đó là điểm gặp/vị trí, nên dùng at.',
    id: 'Di sini tempat itu berfungsi sebagai titik temu/lokasi, jadi gunakan at.',
    tr: 'Burada yer buluşma noktası/konum gibi çalışır, bu yüzden at kullanılır.',
    pl: 'Tutaj miejsce działa jak punkt spotkania/lokalizacja, więc używamy at.',
  },
  functional_place_at: {
    'pt-BR': 'É um lugar de atividade, não só um espaço físico, então usamos at.',
    vi: 'Đó là nơi hoạt động, không chỉ là không gian vật lý, nên dùng at.',
    id: 'Ini tempat kegiatan, bukan sekadar ruang fisik, jadi gunakan at.',
    tr: 'Bu sadece fiziksel alan değil, etkinlik yeridir; bu yüzden at kullanılır.',
    pl: 'To miejsce aktywności, nie tylko fizyczna przestrzeń, więc używamy at.',
  },
  home_at: {
    'pt-BR': 'At home é um bloco fixo para "em casa"; sem the.',
    vi: 'At home là cụm cố định cho "ở nhà"; không có the.',
    id: 'At home adalah frasa tetap untuk "di rumah"; tanpa the.',
    tr: 'At home "evde" için sabit kalıptır; the yoktur.',
    pl: 'At home to stały blok dla "w domu"; bez the.',
  },
  exact_address_at: {
    'pt-BR': 'Número + rua forma endereço exato, então usamos at.',
    vi: 'Số nhà + tên đường là địa chỉ chính xác, nên dùng at.',
    id: 'Nomor + jalan membentuk alamat tepat, jadi gunakan at.',
    tr: 'Numara + sokak kesin adres oluşturur, bu yüzden at kullanılır.',
    pl: 'Numer + ulica tworzą dokładny adres, więc używamy at.',
  },
  school_function_at: {
    'pt-BR': 'School como lugar de estudo/atividade normalmente usa at.',
    vi: 'School như nơi học/hoạt động thường dùng at.',
    id: 'School sebagai tempat belajar/kegiatan biasanya memakai at.',
    tr: 'School eğitim/etkinlik yeri olarak genelde at alır.',
    pl: 'School jako miejsce nauki/aktywności zwykle łączy się z at.',
  },
  inside_vehicle_in: {
    'pt-BR': 'O carro funciona como recipiente: dentro dele usamos in.',
    vi: 'Xe hoạt động như vật chứa: ở bên trong thì dùng in.',
    id: 'Mobil berfungsi seperti wadah: di dalamnya gunakan in.',
    tr: 'Araba konteyner gibi düşünülür: içinde olunca in kullanılır.',
    pl: 'Samochód działa jak pojemnik: gdy coś jest w środku, używamy in.',
  },
  mixed_place_type_recognition: {
    'pt-BR': 'Separe em duas imagens: superfície pede on; ponto de espera pede at.',
    vi: 'Tách thành hai hình dung: bề mặt dùng on; điểm chờ dùng at.',
    id: 'Pisahkan menjadi dua gambar: permukaan memakai on; titik tunggu memakai at.',
    tr: 'İki sahneye ayır: yüzey on ister; bekleme noktası at ister.',
    pl: 'Rozdziel na dwa obrazy: powierzchnia wymaga on, punkt oczekiwania wymaga at.',
  },
};

const PLACE_GENERIC_HINTS: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'Escolha pela imagem do lugar, não pela tradução direta.',
  vi: 'Hãy chọn theo hình dung nơi chốn, không theo bản dịch trực tiếp.',
  id: 'Pilih berdasarkan gambaran tempat, bukan terjemahan langsung.',
  tr: 'Doğrudan çeviriye göre değil, yerin görüntüsüne göre seç.',
  pl: 'Wybieraj według obrazu miejsca, nie według bezpośredniego tłumaczenia.',
};

function fillPlanned(copy: TriText, planned: Partial<Record<PlannedTrainingLocale, string>>): TriText {
  const next: TriText = { ...copy };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] && planned[locale]) next[locale] = planned[locale];
  }
  return next;
}

function plannedPlaceFeedback(input: {
  id: string;
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): Record<PlannedTrainingLocale, string> {
  const phrase = `${input.correctAnswer} ${input.focusWords.join(' / ')}`.trim();
  const hints = PLACE_SKILL_HINTS[input.targetSkill] ?? PLACE_GENERIC_HINTS;
  return {
    'pt-BR': `Use "${phrase}". ${hints['pt-BR']}`,
    vi: `Dùng "${phrase}". ${hints.vi}`,
    id: `Gunakan "${phrase}". ${hints.id}`,
    tr: `"${phrase}" kullan. ${hints.tr}`,
    pl: `Użyj "${phrase}". ${hints.pl}`,
  };
}

function placeStep(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  options: string[];
  correctAnswer: string;
  correctFeedback: TriText;
  wrong: Record<string, TriText>;
  retry: [TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  const correctIndex = input.options.findIndex((option) => option === input.correctAnswer);
  const plannedFeedback = plannedPlaceFeedback(input);
  const plannedTranslation = PLACE_STEP_TRANSLATIONS[input.id] ?? plannedFeedback;
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: fillPlanned(input.translation, plannedTranslation),
    explanationBlock: tri(
      'Не переводи “в/на” напрямую. Сначала представь место: внутри пространства, на поверхности или в точке/локации.',
      'Не перекладай “в/на” напряму. Спочатку уяви місце: всередині простору, на поверхні чи в точці/локації.',
      'No traduzcas “en” directamente. Primero imagina el lugar: dentro de un espacio, sobre una superficie o en un punto/ubicación.',
      {
        'pt-BR': 'Não traduza "em/na" diretamente. Primeiro imagine o lugar: dentro de um espaço, sobre uma superfície ou em um ponto/local.',
        vi: 'Đừng dịch trực tiếp "ở/trên". Trước tiên hãy hình dung nơi đó: bên trong không gian, trên bề mặt hay tại một điểm/vị trí.',
        id: 'Jangan menerjemahkan "di" secara langsung. Bayangkan dulu tempatnya: di dalam ruang, di atas permukaan, atau di titik/lokasi.',
        tr: '"-de/-da" anlamını doğrudan çevirme. Önce yeri hayal et: bir alanın içinde mi, bir yüzeyde mi, yoksa bir nokta/konumda mı?',
        pl: 'Nie tłumacz "w/na" bezpośrednio. Najpierw wyobraź sobie miejsce: wewnątrz przestrzeni, na powierzchni czy w punkcie/lokalizacji.',
      },
    ),
    microTask: tri('Выбери правильный предлог места.', 'Обери правильний прийменник місця.', 'Elige la preposición de lugar correcta.', {
      'pt-BR': 'Escolha a preposição de lugar correta.',
      vi: 'Chọn giới từ chỉ nơi chốn đúng.',
      id: 'Pilih preposisi tempat yang benar.',
      tr: 'Doğru yer edatını seç.',
      pl: 'Wybierz właściwy przyimek miejsca.',
    }),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: fillPlanned(input.correctFeedback, plannedFeedback),
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, fillPlanned(input.wrong[option] ?? tri(
        'Не совсем. Проверь картинку: in = внутри, on = поверхность/линия, at = точка или функциональная локация.',
        'Не зовсім. Перевір картинку: in = всередині, on = поверхня/лінія, at = точка або функціональна локація.',
        'No exactamente. Revisa la imagen: in = dentro, on = superficie/línea, at = punto o ubicación funcional.',
        {
          'pt-BR': 'Não exatamente. Revise a imagem: in = dentro, on = superfície/linha, at = ponto ou local funcional.',
          vi: 'Chưa đúng hẳn. Hãy xem lại hình dung: in = bên trong, on = bề mặt/đường, at = điểm hoặc vị trí chức năng.',
          id: 'Belum tepat. Periksa gambarnya: in = di dalam, on = permukaan/garis, at = titik atau lokasi fungsional.',
          tr: 'Tam değil. Görseli kontrol et: in = içeride, on = yüzey/çizgi, at = nokta veya işlevsel konum.',
          pl: 'Nie do końca. Sprawdź obraz: in = w środku, on = powierzchnia/linia, at = punkt albo lokalizacja funkcjonalna.',
        },
      ), plannedFeedback)])),
    retryFeedback: [
      fillPlanned(input.retry[0], plannedFeedback),
      fillPlanned(input.retry[1], plannedFeedback),
      fillPlanned(input.retry[2], plannedFeedback),
      tri(
        `Подсказка: здесь нужен блок "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
        `Підказка: тут потрібен блок "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
        `Pista: aquí necesitas el bloque "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
        {
          'pt-BR': `Dica: aqui você precisa do bloco "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
          vi: `Gợi ý: ở đây cần cụm "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
          id: `Petunjuk: di sini perlu frasa "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
          tr: `İpucu: burada "${input.correctAnswer} ${input.focusWords[0] ?? ''}" kalıbı gerekli.`.trim(),
          pl: `Wskazówka: tutaj potrzebujesz bloku "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
        },
      ),
    ],
    fallbackExplanation: tri(
      'Карта места: in для пространства/контейнера/города, on для поверхности или улицы как линии, at для точки, адреса или места деятельности.',
      'Карта місця: in для простору/контейнера/міста, on для поверхні або вулиці як лінії, at для точки, адреси або місця діяльності.',
      'Mapa de lugar: in para espacio/contenedor/ciudad, on para superficie o calle como línea, at para punto, dirección o lugar de actividad.',
      {
        'pt-BR': 'Mapa de lugar: in para espaço/recipiente/cidade, on para superfície ou rua como linha, at para ponto, endereço ou local de atividade.',
        vi: 'Bản đồ nơi chốn: in cho không gian/vật chứa/thành phố, on cho bề mặt hoặc con đường như một đường tuyến, at cho điểm, địa chỉ hoặc nơi hoạt động.',
        id: 'Peta tempat: in untuk ruang/wadah/kota, on untuk permukaan atau jalan sebagai garis, at untuk titik, alamat, atau tempat kegiatan.',
        tr: 'Yer haritası: in alan/konteyner/şehir için, on yüzey veya çizgi gibi sokak için, at nokta, adres ya da etkinlik yeri için.',
        pl: 'Mapa miejsca: in dla przestrzeni/pojemnika/miasta, on dla powierzchni albo ulicy jako linii, at dla punktu, adresu lub miejsca aktywności.',
      },
    ),
    focusWords: input.focusWords,
  };
}

export const PREPOSITION_PLACE_IN_ON_AT_TRAINING: DiagnosisTraining = {
  id: 'preposition_place_in_on_at',
  category: 'preposition',
  version: '1.0.0',
  status: 'active',
  priority: 5,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('In / On / At: место', 'In / On / At: місце', 'In / On / At: lugar', {
    'pt-BR': 'In / On / At: lugar',
    vi: 'In / On / At: nơi chốn',
    id: 'In / On / At: tempat',
    tr: 'In / On / At: yer',
    pl: 'In / On / At: miejsce',
  }),
  shortTitle: tri('In / On / At для места', 'In / On / At для місця', 'In / On / At para lugar', {
    'pt-BR': 'In / On / At para lugar',
    vi: 'In / On / At cho nơi chốn',
    id: 'In / On / At untuk tempat',
    tr: 'Yer için In / On / At',
    pl: 'In / On / At dla miejsca',
  }),
  shortDiagnosis: tri(
    'Ты путаешь in, on и at для места: внутри, поверхность или точка.',
    'Ти плутаєш in, on і at для місця: всередині, поверхня чи точка.',
    'Confundes in, on y at para lugar: dentro, superficie o punto.',
    {
      'pt-BR': 'Você confunde in, on e at para lugar: dentro, superfície ou ponto.',
      vi: 'Bạn nhầm in, on và at cho nơi chốn: bên trong, bề mặt hay điểm.',
      id: 'Kamu mencampur in, on, dan at untuk tempat: di dalam, permukaan, atau titik.',
      tr: 'Yer için in, on ve at karışıyor: içerisi, yüzey veya nokta.',
      pl: 'Mylisz in, on i at dla miejsca: wnętrze, powierzchnia albo punkt.',
    },
  ),
  diagnosisText: tri(
    'Ты путаешь in, on и at, когда говоришь о месте. Обычно проблема в том, что ты переводишь предлог как “в/на/у”, а английский смотрит на тип места: внутри пространства, на поверхности или в точке/локации.',
    'Ти плутаєш in, on і at, коли говориш про місце. Зазвичай проблема в тому, що ти перекладаєш прийменник як “в/на/у”, а англійська дивиться на тип місця: всередині простору, на поверхні або в точці/локації.',
    'Confundes in, on y at cuando hablas de lugar. Normalmente el problema es traducir la preposición como “en”, pero el inglés mira el tipo de lugar: dentro de un espacio, sobre una superficie o en un punto/ubicación.',
    {
      'pt-BR': 'Você confunde in, on e at quando fala de lugar. Normalmente o problema é traduzir a preposição como "em", mas o inglês olha o tipo de lugar: dentro de um espaço, sobre uma superfície ou em um ponto/local.',
      vi: 'Bạn nhầm in, on và at khi nói về nơi chốn. Vấn đề thường là dịch giới từ thành "ở/trên", còn tiếng Anh nhìn vào kiểu nơi chốn: bên trong không gian, trên bề mặt hay tại một điểm/vị trí.',
      id: 'Kamu mencampur in, on, dan at saat berbicara tentang tempat. Biasanya masalahnya adalah menerjemahkan preposisi sebagai "di", padahal bahasa Inggris melihat jenis tempat: di dalam ruang, di atas permukaan, atau di titik/lokasi.',
      tr: 'Yer hakkında konuşurken in, on ve at karışıyor. Sorun genelde edatı "-de/-da" diye çevirmek; İngilizce ise yer türüne bakar: alanın içinde, yüzeyde ya da bir nokta/konumda.',
      pl: 'Mylisz in, on i at, gdy mówisz o miejscu. Problem zwykle polega na tłumaczeniu przyimka jako "w/na", a angielski patrzy na typ miejsca: wewnątrz przestrzeni, na powierzchni albo w punkcie/lokalizacji.',
    },
  ),
  mentalModel: tri(
    'In = внутри пространства. On = на поверхности или линии. At = в точке, месте события или адресной локации.',
    'In = всередині простору. On = на поверхні або лінії. At = у точці, місці події або адресній локації.',
    'In = dentro de un espacio. On = sobre una superficie o línea. At = en un punto, lugar de evento o ubicación.',
    {
      'pt-BR': 'In = dentro de um espaço. On = sobre uma superfície ou linha. At = em um ponto, local de evento ou endereço.',
      vi: 'In = bên trong không gian. On = trên bề mặt hoặc đường tuyến. At = tại một điểm, nơi diễn ra sự kiện hoặc vị trí địa chỉ.',
      id: 'In = di dalam ruang. On = di atas permukaan atau garis. At = di titik, tempat acara, atau lokasi alamat.',
      tr: 'In = bir alanın içinde. On = yüzeyde veya çizgide. At = noktada, etkinlik yerinde veya adres konumunda.',
      pl: 'In = wewnątrz przestrzeni. On = na powierzchni albo linii. At = w punkcie, miejscu wydarzenia albo lokalizacji adresowej.',
    },
  ),
  contrastSet: ['in', 'on', 'at'],
  coreRule: tri(
    'in the room, in the car, in Dublin. on the table, on the wall, on the street. at home, at school, at the station, at 25 King Street.',
    'in the room, in the car, in Dublin. on the table, on the wall, on the street. at home, at school, at the station, at 25 King Street.',
    'in the room, in the car, in Dublin. on the table, on the wall, on the street. at home, at school, at the station, at 25 King Street.',
    {
      'pt-BR': 'in the room, in the car, in Dublin. on the table, on the wall, on the street. at home, at school, at the station, at 25 King Street.',
      vi: 'in the room, in the car, in Dublin. on the table, on the wall, on the street. at home, at school, at the station, at 25 King Street.',
      id: 'in the room, in the car, in Dublin. on the table, on the wall, on the street. at home, at school, at the station, at 25 King Street.',
      tr: 'in the room, in the car, in Dublin. on the table, on the wall, on the street. at home, at school, at the station, at 25 King Street.',
      pl: 'in the room, in the car, in Dublin. on the table, on the wall, on the street. at home, at school, at the station, at 25 King Street.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'In используется, когда объект внутри пространства: in the room, in the box, in the car.',
      'In также используется с городами, странами и районами: in Dublin, in Ireland, in the city centre.',
      'On используется, когда объект на поверхности: on the table, on the wall, on the floor.',
      'On также используется с улицами и линиями: on Main Street, on the road, on the coast.',
      'At используется, когда место воспринимается как точка или локация события: at home, at school, at work, at the station.',
      'At используется с точным адресом: at 25 King Street.',
      'Не переводи “в” автоматически как in. Сначала реши: внутри, на поверхности или в точке.',
      'Одно и то же слово может менять предлог по смыслу: in the school = внутри здания, at school = на учебе.',
    ],
    uk: [
      'In використовується, коли об’єкт всередині простору: in the room, in the box, in the car.',
      'In також використовується з містами, країнами та районами: in Dublin, in Ireland, in the city centre.',
      'On використовується, коли об’єкт на поверхні: on the table, on the wall, on the floor.',
      'On також використовується з вулицями та лініями: on Main Street, on the road, on the coast.',
      'At використовується, коли місце сприймається як точка або локація події: at home, at school, at work, at the station.',
      'At використовується з точною адресою: at 25 King Street.',
      'Не перекладай “в” автоматично як in. Спочатку виріши: всередині, на поверхні чи в точці.',
      'Одне й те саме слово може змінювати прийменник за змістом: in the school = всередині будівлі, at school = на навчанні.',
    ],
    es: [
      'In se usa cuando algo está dentro de un espacio: in the room, in the box, in the car.',
      'In también se usa con ciudades, países y zonas: in Dublin, in Ireland, in the city centre.',
      'On se usa cuando algo está sobre una superficie: on the table, on the wall, on the floor.',
      'On también se usa con calles y líneas: on Main Street, on the road, on the coast.',
      'At se usa cuando el lugar se percibe como punto o ubicación de actividad: at home, at school, at work, at the station.',
      'At se usa con dirección exacta: at 25 King Street.',
      'No traduzcas “en” automáticamente como in. Primero decide: dentro, sobre superficie o en punto.',
      'La misma palabra puede cambiar de preposición según el sentido: in the school = dentro del edificio, at school = actividad escolar.',
    ],
    'pt-BR': [
      'In é usado quando o objeto está dentro de um espaço: in the room, in the box, in the car.',
      'In também é usado com cidades, países e áreas: in Dublin, in Ireland, in the city centre.',
      'On é usado quando o objeto está sobre uma superfície: on the table, on the wall, on the floor.',
      'On também é usado com ruas e linhas: on Main Street, on the road, on the coast.',
      'At é usado quando o lugar é visto como ponto ou local de atividade: at home, at school, at work, at the station.',
      'At é usado com endereço exato: at 25 King Street.',
      'Não traduza "em" automaticamente como in. Primeiro decida: dentro, na superfície ou em um ponto.',
      'A mesma palavra pode mudar de preposição conforme o sentido: in the school = dentro do prédio, at school = na atividade escolar.',
    ],
    vi: [
      'In dùng khi vật ở bên trong một không gian: in the room, in the box, in the car.',
      'In cũng dùng với thành phố, quốc gia và khu vực: in Dublin, in Ireland, in the city centre.',
      'On dùng khi vật ở trên bề mặt: on the table, on the wall, on the floor.',
      'On cũng dùng với đường phố và đường tuyến: on Main Street, on the road, on the coast.',
      'At dùng khi nơi được xem như một điểm hoặc nơi diễn ra hoạt động: at home, at school, at work, at the station.',
      'At dùng với địa chỉ chính xác: at 25 King Street.',
      'Đừng tự động dịch "ở/trong" thành in. Trước tiên hãy quyết định: bên trong, trên bề mặt hay tại một điểm.',
      'Cùng một từ có thể đổi giới từ theo nghĩa: in the school = bên trong tòa nhà, at school = ở trường như hoạt động học.',
    ],
    id: [
      'In digunakan ketika objek berada di dalam suatu ruang: in the room, in the box, in the car.',
      'In juga digunakan dengan kota, negara, dan area: in Dublin, in Ireland, in the city centre.',
      'On digunakan ketika objek berada di atas permukaan: on the table, on the wall, on the floor.',
      'On juga digunakan dengan jalan dan garis: on Main Street, on the road, on the coast.',
      'At digunakan ketika tempat dipandang sebagai titik atau lokasi kegiatan: at home, at school, at work, at the station.',
      'At digunakan dengan alamat yang tepat: at 25 King Street.',
      'Jangan otomatis menerjemahkan "di" sebagai in. Tentukan dulu: di dalam, di permukaan, atau di titik.',
      'Kata yang sama bisa berganti preposisi sesuai makna: in the school = di dalam gedung, at school = kegiatan sekolah.',
    ],
    tr: [
      'In, nesne bir alanın içindeyse kullanılır: in the room, in the box, in the car.',
      'In şehirler, ülkeler ve bölgelerle de kullanılır: in Dublin, in Ireland, in the city centre.',
      'On, nesne bir yüzeyin üzerindeyse kullanılır: on the table, on the wall, on the floor.',
      'On sokaklar ve çizgilerle de kullanılır: on Main Street, on the road, on the coast.',
      'At, yer bir nokta veya etkinlik yeri gibi görülüyorsa kullanılır: at home, at school, at work, at the station.',
      'At kesin adresle kullanılır: at 25 King Street.',
      '"-de/-da" anlamını otomatik olarak in yapma. Önce karar ver: içeride mi, yüzeyde mi, noktada mı?',
      'Aynı kelime anlama göre edat değiştirebilir: in the school = binanın içinde, at school = okul etkinliği/öğrenim yeri.',
    ],
    pl: [
      'In używa się, gdy obiekt jest wewnątrz przestrzeni: in the room, in the box, in the car.',
      'In używa się też z miastami, krajami i obszarami: in Dublin, in Ireland, in the city centre.',
      'On używa się, gdy obiekt jest na powierzchni: on the table, on the wall, on the floor.',
      'On używa się też z ulicami i liniami: on Main Street, on the road, on the coast.',
      'At używa się, gdy miejsce jest punktem albo miejscem aktywności: at home, at school, at work, at the station.',
      'At używa się z dokładnym adresem: at 25 King Street.',
      'Nie tłumacz automatycznie "w/na" jako in. Najpierw zdecyduj: w środku, na powierzchni czy w punkcie.',
      'To samo słowo może zmienić przyimek zależnie od sensu: in the school = w budynku, at school = w szkole jako aktywności.',
    ],
  },
  examples: [
    { en: 'She is in the room.', ru: 'Она в комнате.', uk: 'Вона в кімнаті.', es: 'Ella está en la habitación.', 'pt-BR': 'Ela está no quarto.', vi: 'Cô ấy ở trong phòng.', id: 'Dia ada di dalam ruangan.', tr: 'O odada.', pl: 'Ona jest w pokoju.', why: tri('Room - пространство с границами. Она внутри комнаты, поэтому in.', 'Room - простір із межами. Вона всередині кімнати, тому in.', 'Room es un espacio con límites. Ella está dentro, por eso in.', { 'pt-BR': 'Room é um espaço com limites. Ela está dentro, por isso in.', vi: 'Room là không gian có ranh giới. Cô ấy ở bên trong, vì vậy dùng in.', id: 'Room adalah ruang berbatas. Dia ada di dalamnya, jadi gunakan in.', tr: 'Room sınırları olan bir alandır. O içeride, bu yüzden in.', pl: 'Room to przestrzeń z granicami. Ona jest w środku, więc używamy in.' }) },
    { en: 'The keys are on the table.', ru: 'Ключи на столе.', uk: 'Ключі на столі.', es: 'Las llaves están sobre la mesa.', 'pt-BR': 'As chaves estão sobre a mesa.', vi: 'Chìa khóa ở trên bàn.', id: 'Kunci-kunci ada di atas meja.', tr: 'Anahtarlar masanın üzerinde.', pl: 'Klucze są na stole.', why: tri('Table - поверхность. Ключи лежат на поверхности, поэтому on.', 'Table - поверхня. Ключі лежать на поверхні, тому on.', 'Table es una superficie. Las llaves están sobre la superficie, por eso on.', { 'pt-BR': 'Table é uma superfície. As chaves estão sobre a superfície, por isso on.', vi: 'Table là bề mặt. Chìa khóa nằm trên bề mặt, vì vậy dùng on.', id: 'Table adalah permukaan. Kunci ada di atas permukaan, jadi gunakan on.', tr: 'Table bir yüzeydir. Anahtarlar yüzeyin üzerinde, bu yüzden on.', pl: 'Table to powierzchnia. Klucze leżą na powierzchni, więc używamy on.' }) },
    { en: "I'll meet you at the station.", ru: 'Я встречу тебя на станции.', uk: 'Я зустріну тебе на станції.', es: 'Te veré en la estación.', 'pt-BR': 'Vou encontrar você na estação.', vi: 'Tôi sẽ gặp bạn ở nhà ga.', id: 'Saya akan bertemu denganmu di stasiun.', tr: 'Seninle istasyonda buluşacağım.', pl: 'Spotkam się z tobą na stacji.', why: tri('Station здесь воспринимается как точка встречи/локация, поэтому at.', 'Station тут сприймається як точка зустрічі/локація, тому at.', 'Station aquí se percibe como punto de encuentro, por eso at.', { 'pt-BR': 'Station aqui é visto como ponto de encontro/local, por isso at.', vi: 'Station ở đây được xem như điểm gặp/vị trí, vì vậy dùng at.', id: 'Station di sini dipandang sebagai titik temu/lokasi, jadi gunakan at.', tr: 'Station burada buluşma noktası/konum gibi görülür, bu yüzden at.', pl: 'Station jest tu punktem spotkania/lokalizacją, więc używamy at.' }) },
    { en: 'He lives in Dublin.', ru: 'Он живет в Дублине.', uk: 'Він живе в Дубліні.', es: 'Él vive en Dublín.', 'pt-BR': 'Ele mora em Dublin.', vi: 'Anh ấy sống ở Dublin.', id: 'Dia tinggal di Dublin.', tr: "Dublin'de yaşıyor.", pl: 'On mieszka w Dublinie.', why: tri('Dublin - город, большое пространство. С городами используется in.', 'Dublin - місто, великий простір. З містами використовується in.', 'Dublin es una ciudad, un espacio grande. Con ciudades usamos in.', { 'pt-BR': 'Dublin é uma cidade, um espaço grande. Com cidades usamos in.', vi: 'Dublin là một thành phố, một không gian lớn. Với thành phố dùng in.', id: 'Dublin adalah kota, ruang yang luas. Dengan kota gunakan in.', tr: 'Dublin bir şehir, geniş bir alandır. Şehirlerle in kullanılır.', pl: 'Dublin to miasto, duża przestrzeń. Z miastami używamy in.' }) },
    { en: 'The shop is on Main Street.', ru: 'Магазин находится на Мэйн-стрит.', uk: 'Магазин знаходиться на Мейн-стріт.', es: 'La tienda está en Main Street.', 'pt-BR': 'A loja fica na Main Street.', vi: 'Cửa hàng nằm trên phố Main.', id: 'Toko itu berada di Main Street.', tr: 'Dükkan Main Street üzerinde.', pl: 'Sklep jest przy Main Street.', why: tri('Street часто воспринимается как линия. Для улицы без номера обычно используется on.', 'Street часто сприймається як лінія. Для вулиці без номера зазвичай використовується on.', 'Street muchas veces se percibe como una línea. Sin número exacto normalmente usamos on.', { 'pt-BR': 'Street muitas vezes é visto como uma linha. Sem número exato, normalmente usamos on.', vi: 'Street thường được xem như một đường tuyến. Không có số nhà cụ thể thì thường dùng on.', id: 'Street sering dipandang sebagai garis. Tanpa nomor tepat, biasanya gunakan on.', tr: 'Street çoğu zaman çizgi gibi düşünülür. Kesin numara yoksa genelde on kullanılır.', pl: 'Street często traktuje się jak linię. Bez dokładnego numeru zwykle używamy on.' }) },
    { en: 'The office is at 25 King Street.', ru: 'Офис находится по адресу 25 King Street.', uk: 'Офіс знаходиться за адресою 25 King Street.', es: 'La oficina está en 25 King Street.', 'pt-BR': 'O escritório fica no endereço 25 King Street.', vi: 'Văn phòng ở địa chỉ 25 King Street.', id: 'Kantornya berada di 25 King Street.', tr: 'Ofis 25 King Street adresinde.', pl: 'Biuro jest pod adresem 25 King Street.', why: tri('25 King Street - точный адрес. С точным адресом обычно используется at.', '25 King Street - точна адреса. З точною адресою зазвичай використовується at.', '25 King Street es una dirección exacta. Con dirección exacta usamos at.', { 'pt-BR': '25 King Street é um endereço exato. Com endereço exato usamos at.', vi: '25 King Street là địa chỉ chính xác. Với địa chỉ chính xác dùng at.', id: '25 King Street adalah alamat tepat. Dengan alamat tepat gunakan at.', tr: '25 King Street kesin adrestir. Kesin adresle at kullanılır.', pl: '25 King Street to dokładny adres. Z dokładnym adresem używamy at.' }) },
    { en: 'She is at school.', ru: 'Она в школе.', uk: 'Вона в школі.', es: 'Ella está en la escuela.', 'pt-BR': 'Ela está na escola.', vi: 'Cô ấy đang ở trường.', id: 'Dia sedang di sekolah.', tr: 'O okulda.', pl: 'Ona jest w szkole.', why: tri('At school часто означает школу как место учебы/деятельности.', 'At school часто означає школу як місце навчання/діяльності.', 'At school muchas veces significa escuela como lugar funcional.', { 'pt-BR': 'At school muitas vezes significa escola como lugar de estudo/atividade.', vi: 'At school thường nghĩa là trường như nơi học/hoạt động.', id: 'At school sering berarti sekolah sebagai tempat belajar/kegiatan.', tr: 'At school çoğu zaman okulu eğitim/etkinlik yeri olarak anlatır.', pl: 'At school często oznacza szkołę jako miejsce nauki/aktywności.' }) },
    { en: 'The picture is on the wall.', ru: 'Картина на стене.', uk: 'Картина на стіні.', es: 'El cuadro está en la pared.', 'pt-BR': 'O quadro está na parede.', vi: 'Bức tranh ở trên tường.', id: 'Gambar itu ada di dinding.', tr: 'Resim duvarda.', pl: 'Obraz jest na ścianie.', why: tri('Wall - поверхность. Картина находится на поверхности стены, поэтому on.', 'Wall - поверхня. Картина знаходиться на поверхні стіни, тому on.', 'Wall es una superficie. El cuadro está sobre la superficie, por eso on.', { 'pt-BR': 'Wall é uma superfície. O quadro está na superfície da parede, por isso on.', vi: 'Wall là bề mặt. Bức tranh nằm trên bề mặt tường, vì vậy dùng on.', id: 'Wall adalah permukaan. Gambar ada di permukaan dinding, jadi gunakan on.', tr: 'Wall bir yüzeydir. Resim duvarın yüzeyinde, bu yüzden on.', pl: 'Wall to powierzchnia. Obraz jest na powierzchni ściany, więc używamy on.' }) },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь in, on и at для места. Русское “в/на” не совпадает один в один с английской логикой.', 'Схоже, ти плутаєш in, on і at для місця. Українські “в/на” не збігаються один в один з англійською логікою.', 'Parece que confundes in, on y at para lugar. El español “en” no coincide exactamente con la lógica inglesa.', { 'pt-BR': 'Parece que você confunde in, on e at para lugar. O português "em/na" não coincide exatamente com a lógica do inglês.', vi: 'Có vẻ bạn đang nhầm in, on và at cho nơi chốn. Tiếng Việt "ở/trên" không trùng hoàn toàn với logic tiếng Anh.', id: 'Sepertinya kamu mencampur in, on, dan at untuk tempat. Bahasa Indonesia "di" tidak selalu sama dengan logika bahasa Inggris.', tr: 'Yer için in, on ve at karışıyor gibi görünüyor. Türkçedeki "-de/-da" İngilizce mantığıyla bire bir örtüşmez.', pl: 'Wygląda na to, że mylisz in, on i at dla miejsca. Polskie "w/na" nie pokrywa się jeden do jednego z logiką angielską.' }) },
    { id: 'intro_rule', type: 'rule', text: tri('Главная модель: in - внутри, on - на поверхности, at - в точке/локации.', 'Головна модель: in - всередині, on - на поверхні, at - у точці/локації.', 'Modelo principal: in - dentro, on - sobre superficie, at - en un punto/ubicación.', { 'pt-BR': 'Modelo principal: in = dentro, on = sobre superfície, at = em um ponto/local.', vi: 'Mô hình chính: in = bên trong, on = trên bề mặt, at = tại điểm/vị trí.', id: 'Model utama: in = di dalam, on = di atas permukaan, at = di titik/lokasi.', tr: 'Ana model: in = içeride, on = yüzeyde, at = nokta/konumda.', pl: 'Główny model: in = w środku, on = na powierzchni, at = w punkcie/lokalizacji.' }) },
    { id: 'intro_warning', type: 'warning', text: tri('Не выбирай предлог по переводу. Выбирай по картинке: внутри пространства, на поверхности или точка на карте?', 'Не обирай прийменник за перекладом. Обирай за картинкою: всередині простору, на поверхні чи точка на мапі?', 'No elijas por traducción. Elige por la imagen: dentro de un espacio, sobre superficie o punto en el mapa?', { 'pt-BR': 'Não escolha pela tradução. Escolha pela imagem: dentro de um espaço, sobre uma superfície ou ponto no mapa?', vi: 'Đừng chọn theo bản dịch. Hãy chọn theo hình dung: bên trong không gian, trên bề mặt hay điểm trên bản đồ?', id: 'Jangan memilih berdasarkan terjemahan. Pilih berdasarkan gambarnya: di dalam ruang, di atas permukaan, atau titik di peta?', tr: 'Çeviriye göre seçme. Görsele göre seç: alanın içinde mi, yüzeyde mi, haritada bir nokta mı?', pl: 'Nie wybieraj według tłumaczenia. Wybierz według obrazu: wewnątrz przestrzeni, na powierzchni czy punkt na mapie?' }) },
  ],
  steps: [
    placeStep({ id: 'place_easy_001', order: 1, difficulty: 'easy', targetSkill: 'inside_space_in', sentence: 'She is ___ the room.', translation: tri('Она в комнате.', 'Вона в кімнаті.', 'Ella está en la habitación.'), options: ['in', 'on', 'at', 'to'], correctAnswer: 'in', correctFeedback: tri('Да. Room - пространство с границами. Она внутри комнаты, поэтому in the room.', 'Так. Room - простір із межами. Вона всередині кімнати, тому in the room.', 'Sí. Room es un espacio con límites. Ella está dentro, por eso in the room.'), wrong: { on: tri('On нужен для поверхности: on the table, on the wall. Room - пространство, и она внутри него. Нужен in.', 'On потрібен для поверхні: on the table, on the wall. Room - простір, і вона всередині нього. Потрібен in.', 'On se usa para superficie. Room es espacio y ella está dentro. Necesitamos in.'), at: tri('At показывает точку/локацию, но здесь важно физически внутри комнаты. Поэтому in.', 'At показує точку/локацію, але тут важливо фізично всередині кімнати. Тому in.', 'At muestra punto/ubicación, pero aquí importa estar dentro de la habitación. Por eso in.'), to: tri('To показывает движение к месту. Здесь она уже находится внутри. Нужен in.', 'To показує рух до місця. Тут вона вже знаходиться всередині. Потрібен in.', 'To muestra movimiento hacia un lugar. Aquí ella ya está dentro. Necesitamos in.') }, retry: [tri('Комната окружает человека. Внутри пространства = in.', 'Кімната оточує людину. Всередині простору = in.', 'La habitación rodea a la persona. Dentro de espacio = in.'), tri('Внутри комнаты - in the room.', 'Всередині кімнати - in the room.', 'Dentro de la habitación - in the room.'), tri('Подсказка: in the room.', 'Підказка: in the room.', 'Pista: in the room.')], focusWords: ['the room'] }),
    placeStep({ id: 'place_easy_002', order: 2, difficulty: 'easy', targetSkill: 'inside_container_in', sentence: 'The documents are ___ the box.', translation: tri('Документы в коробке.', 'Документи в коробці.', 'Los documentos están en la caja.'), options: ['in', 'on', 'at', 'over'], correctAnswer: 'in', correctFeedback: tri('Да. Box - контейнер. Документы внутри коробки, поэтому in the box.', 'Так. Box - контейнер. Документи всередині коробки, тому in the box.', 'Sí. Box es contenedor. Los documentos están dentro, por eso in the box.'), wrong: { on: tri('On the box означало бы на поверхности коробки. Здесь документы внутри коробки, поэтому in.', 'On the box означало б на поверхні коробки. Тут документи всередині коробки, тому in.', 'On the box sería sobre la caja. Aquí están dentro, por eso in.'), at: tri('At the box звучит как точка рядом с коробкой. Но документы внутри контейнера. Нужен in.', 'At the box звучить як точка біля коробки. Але документи всередині контейнера. Потрібен in.', 'At the box suena como punto junto a la caja. Pero están dentro. Necesitamos in.'), over: tri('Over означает над/сверху, но не внутри. Здесь документы в коробке, поэтому in.', 'Over означає над/зверху, але не всередині. Тут документи в коробці, тому in.', 'Over significa encima, no dentro. Aquí están en la caja, por eso in.') }, retry: [tri('Коробка - контейнер. Внутри контейнера = in.', 'Коробка - контейнер. Всередині контейнера = in.', 'La caja es contenedor. Dentro = in.'), tri('Inside the box = in the box.', 'Inside the box = in the box.', 'Inside the box = in the box.'), tri('Подсказка: in the box.', 'Підказка: in the box.', 'Pista: in the box.')], focusWords: ['the box'] }),
    placeStep({ id: 'place_easy_003', order: 3, difficulty: 'easy', targetSkill: 'city_country_in', sentence: 'He lives ___ Ireland.', translation: tri('Он живет в Ирландии.', 'Він живе в Ірландії.', 'Él vive en Irlanda.'), options: ['in', 'on', 'at', 'inside'], correctAnswer: 'in', correctFeedback: tri('Да. Ireland - страна, большая территория. Со странами используется in.', 'Так. Ireland - країна, велика територія. З країнами використовується in.', 'Sí. Ireland es un país, un territorio grande. Con países usamos in.'), wrong: { on: tri('On используется для поверхности или линии. Страна воспринимается как территория, поэтому in Ireland.', 'On використовується для поверхні або лінії. Країна сприймається як територія, тому in Ireland.', 'On se usa para superficie o línea. Un país es territorio, por eso in Ireland.'), at: tri('At может быть с точкой/локацией. Но страна - большое пространство, поэтому in Ireland.', 'At може бути з точкою/локацією. Але країна - великий простір, тому in Ireland.', 'At puede usarse con punto. Pero un país es espacio grande, por eso in Ireland.'), inside: tri('Inside буквально значит “внутри”, но со странами стандартный предлог - in.', 'Inside буквально означає “всередині”, але з країнами стандартний прийменник - in.', 'Inside significa literalmente dentro, pero con países usamos in.') }, retry: [tri('Страна = территория. Территория = in.', 'Країна = територія. Територія = in.', 'País = territorio. Territorio = in.'), tri('Готовый блок: in Ireland.', 'Готовий блок: in Ireland.', 'Bloque listo: in Ireland.'), tri('Подсказка: lives in Ireland.', 'Підказка: lives in Ireland.', 'Pista: lives in Ireland.')], focusWords: ['Ireland'] }),
    placeStep({ id: 'place_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'surface_on', sentence: 'The phone is ___ the table.', translation: tri('Телефон на столе.', 'Телефон на столі.', 'El teléfono está sobre la mesa.'), options: ['in', 'on', 'at', 'under'], correctAnswer: 'on', correctFeedback: tri('Да. Table - поверхность. Телефон лежит на поверхности, поэтому on the table.', 'Так. Table - поверхня. Телефон лежить на поверхні, тому on the table.', 'Sí. Table es una superficie. El teléfono está sobre ella, por eso on the table.'), wrong: { in: tri('In the table звучало бы так, будто телефон внутри стола. Здесь он на поверхности, поэтому on.', 'In the table звучало б так, ніби телефон всередині столу. Тут він на поверхні, тому on.', 'In the table sonaría como dentro de la mesa. Aquí está sobre la superficie, por eso on.'), at: tri('At the table может значить “у стола” как локация. Но предмет лежит на поверхности, поэтому on.', 'At the table може означати “біля столу” як локація. Але предмет лежить на поверхні, тому on.', 'At the table puede ser ubicación alrededor. Pero el objeto está sobre la superficie, por eso on.'), under: tri('Under означает под столом. Здесь телефон на столе, поэтому on.', 'Under означає під столом. Тут телефон на столі, тому on.', 'Under significa debajo de la mesa. Aquí está sobre la mesa, por eso on.') }, retry: [tri('Предмет касается поверхности стола. Поверхность = on.', 'Предмет торкається поверхні столу. Поверхня = on.', 'El objeto toca la superficie. Superficie = on.'), tri('На поверхности - on the table.', 'На поверхні - on the table.', 'Sobre la superficie - on the table.'), tri('Подсказка: on the table.', 'Підказка: on the table.', 'Pista: on the table.')], focusWords: ['the table'] }),
    placeStep({ id: 'place_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'vertical_surface_on', sentence: 'There is a picture ___ the wall.', translation: tri('На стене есть картина.', 'На стіні є картина.', 'Hay un cuadro en la pared.'), options: ['in', 'on', 'at', 'over'], correctAnswer: 'on', correctFeedback: tri('Да. Wall - вертикальная поверхность. Картина находится на поверхности стены, поэтому on the wall.', 'Так. Wall - вертикальна поверхня. Картина знаходиться на поверхні стіни, тому on the wall.', 'Sí. Wall es superficie vertical. El cuadro está sobre ella, por eso on the wall.'), wrong: { in: tri('In the wall возможно, если что-то внутри стены, например труба. Картина на поверхности стены, поэтому on.', 'In the wall можливе, якщо щось всередині стіни. Картина на поверхні стіни, тому on.', 'In the wall sería dentro de la pared. El cuadro está sobre la superficie, por eso on.'), at: tri('At the wall может значить у стены как точка. Но картина прикреплена к поверхности, поэтому on.', 'At the wall може означати біля стіни як точку. Але картина на поверхні, тому on.', 'At the wall puede ser junto a la pared. Pero el cuadro está en la superficie, por eso on.'), over: tri('Over значит над/выше. Если картина висит на поверхности стены, нужен on.', 'Over означає над/вище. Якщо картина висить на поверхні стіни, потрібен on.', 'Over significa por encima. Si está en la pared, necesitamos on.') }, retry: [tri('Стена тоже поверхность. Поверхность = on.', 'Стіна теж поверхня. Поверхня = on.', 'La pared también es superficie. Superficie = on.'), tri('Wall = surface. Surface = on.', 'Wall = surface. Surface = on.', 'Wall = surface. Surface = on.'), tri('Подсказка: on the wall.', 'Підказка: on the wall.', 'Pista: on the wall.')], focusWords: ['the wall'] }),
    placeStep({ id: 'place_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'street_on', sentence: 'The cafe is ___ Main Street.', translation: tri('Кафе находится на Мэйн-стрит.', 'Кафе знаходиться на Мейн-стріт.', 'El café está en Main Street.'), options: ['in', 'on', 'at', 'inside'], correctAnswer: 'on', correctFeedback: tri('Да. Улица без точного номера часто воспринимается как линия. Поэтому on Main Street.', 'Так. Вулиця без точного номера часто сприймається як лінія. Тому on Main Street.', 'Sí. Una calle sin número exacto se percibe como línea. Por eso on Main Street.'), wrong: { in: tri('In используется для города/района. С улицей без номера обычно on Main Street.', 'In використовується для міста/району. З вулицею без номера зазвичай on Main Street.', 'In se usa para ciudad/zona. Con calle sin número normalmente on Main Street.'), at: tri('At нужен с точным адресом: at 25 Main Street. Здесь только название улицы, поэтому on Main Street.', 'At потрібен із точною адресою: at 25 Main Street. Тут тільки назва вулиці, тому on Main Street.', 'At se usa con dirección exacta. Aquí solo hay calle, por eso on Main Street.'), inside: tri('Inside Main Street звучит неправильно. Улица как линия - on Main Street.', 'Inside Main Street звучить неправильно. Вулиця як лінія - on Main Street.', 'Inside Main Street suena incorrecto. Calle como línea - on Main Street.') }, retry: [tri('Улица без номера = линия. Линия = on.', 'Вулиця без номера = лінія. Лінія = on.', 'Calle sin número = línea. Línea = on.'), tri('Запомни: on Main Street.', 'Запам’ятай: on Main Street.', 'Recuerda: on Main Street.'), tri('Подсказка: on Main Street.', 'Підказка: on Main Street.', 'Pista: on Main Street.')], focusWords: ['Main Street'] }),
    placeStep({ id: 'place_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'point_location_at', sentence: "I'll meet you ___ the station.", translation: tri('Я встречу тебя на станции.', 'Я зустріну тебе на станції.', 'Te veré en la estación.'), options: ['in', 'on', 'at', 'into'], correctAnswer: 'at', correctFeedback: tri('Да. Station здесь место встречи, точка на карте. Для такой локации используется at.', 'Так. Station тут місце зустрічі, точка на мапі. Для такої локації використовується at.', 'Sí. Station aquí es punto de encuentro. Para esta ubicación usamos at.'), wrong: { in: tri('In the station возможно, если подчеркиваешь, что человек внутри здания. Но meet you at the station = место встречи.', 'In the station можливе, якщо підкреслюєш, що людина всередині будівлі. Але meet you at the station = місце зустрічі.', 'In the station puede enfatizar dentro del edificio. Pero meet at the station = punto de encuentro.'), on: tri('On the station звучит как физически сверху на станции. Здесь нужна локация: at.', 'On the station звучить як фізично зверху на станції. Тут потрібна локація: at.', 'On the station suena como encima de la estación. Aquí necesitamos ubicación: at.'), into: tri('Into показывает движение внутрь. Здесь речь о месте встречи, не о движении. Нужен at.', 'Into показує рух всередину. Тут йдеться про місце зустрічі, не про рух. Потрібен at.', 'Into muestra movimiento hacia dentro. Aquí hablamos de lugar de encuentro. Necesitamos at.') }, retry: [tri('Место встречи как точка = at.', 'Місце зустрічі як точка = at.', 'Lugar de encuentro como punto = at.'), tri('Meet at the station.', 'Meet at the station.', 'Meet at the station.'), tri('Подсказка: at the station.', 'Підказка: at the station.', 'Pista: at the station.')], focusWords: ['the station'] }),
    placeStep({ id: 'place_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'functional_place_at', sentence: 'She is ___ work now.', translation: tri('Она сейчас на работе.', 'Вона зараз на роботі.', 'Ella está en el trabajo ahora.'), options: ['in', 'on', 'at', 'inside'], correctAnswer: 'at', correctFeedback: tri('Да. At work - устойчивый блок: на работе как месте деятельности.', 'Так. At work - сталий блок: на роботі як місці діяльності.', 'Sí. At work es un bloque fijo: trabajo como lugar de actividad.'), wrong: { in: tri('In work в этом смысле не подходит. Если говорим “на работе”, стандартно: at work.', 'In work у цьому сенсі не підходить. Якщо говоримо “на роботі”, стандартно: at work.', 'In work no encaja aquí. Para “en el trabajo”: at work.'), on: tri('On work здесь не подходит. Work как место деятельности идет с at: at work.', 'On work тут не підходить. Work як місце діяльності йде з at: at work.', 'On work no encaja. Work como lugar de actividad va con at.'), inside: tri('Inside work звучит неправильно. Фраза “на работе” по-английски: at work.', 'Inside work звучить неправильно. Фраза “на роботі” англійською: at work.', 'Inside work suena incorrecto. En inglés: at work.') }, retry: [tri('Работа как место деятельности = at work.', 'Робота як місце діяльності = at work.', 'Trabajo como lugar de actividad = at work.'), tri('Запомни блок: at work.', 'Запам’ятай блок: at work.', 'Recuerda el bloque: at work.'), tri('Подсказка: She is at work.', 'Підказка: She is at work.', 'Pista: She is at work.')], focusWords: ['work'] }),
    placeStep({ id: 'place_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'home_at', sentence: 'I stayed ___ home yesterday.', translation: tri('Я вчера остался дома.', 'Я вчора залишився вдома.', 'Me quedé en casa ayer.'), options: ['in', 'on', 'at', 'inside'], correctAnswer: 'at', correctFeedback: tri('Да. At home - устойчивый блок. Обрати внимание: без the.', 'Так. At home - сталий блок. Зверни увагу: без the.', 'Sí. At home es un bloque fijo. Ojo: sin the.'), wrong: { in: tri('In home в таком смысле неправильно. Стандартная фраза: at home.', 'In home у такому сенсі неправильно. Стандартна фраза: at home.', 'In home en este sentido es incorrecto. La frase estándar es at home.'), on: tri('On home не подходит. Дом как место нахождения в этой фразе - at home.', 'On home не підходить. Дім як місце перебування в цій фразі - at home.', 'On home no encaja. Casa como lugar donde estás: at home.'), inside: tri('Inside home звучит неестественно. “Дома” по-английски обычно at home.', 'Inside home звучить неприродно. “Вдома” англійською зазвичай at home.', 'Inside home suena poco natural. “En casa” normalmente es at home.') }, retry: [tri('Дома = at home. Это готовый блок.', 'Вдома = at home. Це готовий блок.', 'En casa = at home. Es un bloque listo.'), tri('Запомни: at home.', 'Запам’ятай: at home.', 'Recuerda: at home.'), tri('Подсказка: stayed at home.', 'Підказка: stayed at home.', 'Pista: stayed at home.')], focusWords: ['home'] }),
    placeStep({ id: 'place_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'city_in', sentence: 'They opened a new office ___ Dublin.', translation: tri('Они открыли новый офис в Дублине.', 'Вони відкрили новий офіс у Дубліні.', 'Abrieron una nueva oficina en Dublín.'), options: ['in', 'on', 'at', 'over'], correctAnswer: 'in', correctFeedback: tri('Да. Dublin - город, территория. С городами используется in.', 'Так. Dublin - місто, територія. З містами використовується in.', 'Sí. Dublin es una ciudad, un territorio. Con ciudades usamos in.'), wrong: { on: tri('On используется с улицами: on Main Street. Но Dublin - город, поэтому in Dublin.', 'On використовується з вулицями: on Main Street. Але Dublin - місто, тому in Dublin.', 'On se usa con calles. Pero Dublin es ciudad, por eso in Dublin.'), at: tri('At может быть с точкой/адресом. Но город - большое место, поэтому in Dublin.', 'At може бути з точкою/адресою. Але місто - велике місце, тому in Dublin.', 'At puede ir con punto/dirección. Pero ciudad = lugar amplio, por eso in Dublin.'), over: tri('Over означает над/сверху. Для города нужен in.', 'Over означає над/зверху. Для міста потрібен in.', 'Over significa encima. Para una ciudad necesitamos in.') }, retry: [tri('Город = большое пространство. Большое пространство = in.', 'Місто = великий простір. Великий простір = in.', 'Ciudad = espacio grande. Espacio grande = in.'), tri('Готовый блок: in Dublin.', 'Готовий блок: in Dublin.', 'Bloque listo: in Dublin.'), tri('Подсказка: office in Dublin.', 'Підказка: office in Dublin.', 'Pista: office in Dublin.')], focusWords: ['Dublin'] }),
    placeStep({ id: 'place_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'exact_address_at', sentence: 'The meeting is ___ 18 Park Road.', translation: tri('Встреча по адресу 18 Park Road.', 'Зустріч за адресою 18 Park Road.', 'La reunión es en 18 Park Road.'), options: ['in', 'on', 'at', 'inside'], correctAnswer: 'at', correctFeedback: tri('Да. 18 Park Road - точный адрес. С точным адресом обычно используется at.', 'Так. 18 Park Road - точна адреса. З точною адресою зазвичай використовується at.', 'Sí. 18 Park Road es una dirección exacta. Con dirección exacta usamos at.'), wrong: { in: tri('In подходит для города/района. Но 18 Park Road - точный адрес, поэтому at.', 'In підходить для міста/району. Але 18 Park Road - точна адреса, тому at.', 'In sirve para ciudad/zona. Pero 18 Park Road es dirección exacta, por eso at.'), on: tri('On Park Road было бы для улицы без номера. Но 18 Park Road - точный адрес, поэтому at.', 'On Park Road було б для вулиці без номера. Але 18 Park Road - точна адреса, тому at.', 'On Park Road sería calle sin número. Pero 18 Park Road es dirección exacta, por eso at.'), inside: tri('Inside 18 Park Road не звучит как стандартное указание адреса. Точный адрес - at.', 'Inside 18 Park Road не звучить як стандартне вказання адреси. Точна адреса - at.', 'Inside 18 Park Road no suena como dirección estándar. Dirección exacta - at.') }, retry: [tri('Есть номер дома. Номер + улица = точный адрес = at.', 'Є номер будинку. Номер + вулиця = точна адреса = at.', 'Hay número. Número + calle = dirección exacta = at.'), tri('Точный адрес - at 18 Park Road.', 'Точна адреса - at 18 Park Road.', 'Dirección exacta - at 18 Park Road.'), tri('Подсказка: at 18 Park Road.', 'Підказка: at 18 Park Road.', 'Pista: at 18 Park Road.')], focusWords: ['18 Park Road'] }),
    placeStep({ id: 'place_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'street_on', sentence: 'There is a pharmacy ___ this street.', translation: tri('На этой улице есть аптека.', 'На цій вулиці є аптека.', 'Hay una farmacia en esta calle.'), options: ['in', 'on', 'at', 'into'], correctAnswer: 'on', correctFeedback: tri('Да. Street воспринимается как линия. Для улицы обычно используется on.', 'Так. Street сприймається як лінія. Для вулиці зазвичай використовується on.', 'Sí. Street se percibe como línea. Para calle normalmente usamos on.'), wrong: { in: tri('In this street не лучший вариант в стандартном контексте. Улица как линия - on this street.', 'In this street не найкращий варіант у стандартному контексті. Вулиця як лінія - on this street.', 'In this street no es la mejor opción estándar. Calle como línea - on this street.'), at: tri('At нужен для точной точки или адреса. Здесь просто улица, поэтому on this street.', 'At потрібен для точної точки або адреси. Тут просто вулиця, тому on this street.', 'At se usa para punto exacto o dirección. Aquí solo es la calle, por eso on this street.'), into: tri('Into показывает движение внутрь. Здесь аптека находится на улице, поэтому on.', 'Into показує рух всередину. Тут аптека знаходиться на вулиці, тому on.', 'Into muestra movimiento hacia dentro. Aquí la farmacia está en la calle, por eso on.') }, retry: [tri('Улица = линия. На линии = on.', 'Вулиця = лінія. На лінії = on.', 'Calle = línea. En la línea = on.'), tri('Запомни: on this street.', 'Запам’ятай: on this street.', 'Recuerda: on this street.'), tri('Подсказка: pharmacy on this street.', 'Підказка: pharmacy on this street.', 'Pista: pharmacy on this street.')], focusWords: ['this street'] }),
    placeStep({ id: 'place_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'school_function_at', sentence: 'My son is ___ school now.', translation: tri('Мой сын сейчас в школе.', 'Мій син зараз у школі.', 'Mi hijo está en la escuela ahora.'), options: ['in', 'on', 'at', 'inside'], correctAnswer: 'at', correctFeedback: tri('Да. At school часто означает “в школе” как место учебы/занятия, не просто внутри здания.', 'Так. At school часто означає “у школі” як місце навчання/заняття, не просто всередині будівлі.', 'Sí. At school significa escuela como actividad, no solo dentro del edificio.'), wrong: { in: tri('In the school возможно, если важно, что он внутри здания школы. Но “на учебе” - at school.', 'In the school можливе, якщо важливо, що він всередині будівлі школи. Але “на навчанні” - at school.', 'In the school puede ser dentro del edificio. Pero actividad escolar normalmente es at school.'), on: tri('On school звучит неправильно, если не имеется в виду физически сверху на школе. Здесь нужно at school.', 'On school звучить неправильно, якщо не мається на увазі фізично зверху на школі. Тут потрібно at school.', 'On school suena incorrecto salvo que sea encima de la escuela. Aquí necesitamos at school.'), inside: tri('Inside school возможно в физическом смысле, но естественная фраза “в школе сейчас” - at school.', 'Inside school можливе у фізичному сенсі, але природна фраза “у школі зараз” - at school.', 'Inside school puede funcionar físicamente, pero la frase natural es at school.') }, retry: [tri('Школа как место учебы = at school.', 'Школа як місце навчання = at school.', 'Escuela como lugar de estudio = at school.'), tri('Запомни блок: at school.', 'Запам’ятай блок: at school.', 'Recuerda el bloque: at school.'), tri('Подсказка: is at school.', 'Підказка: is at school.', 'Pista: is at school.')], focusWords: ['school'] }),
    placeStep({ id: 'place_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'inside_vehicle_in', sentence: 'She left her bag ___ the car.', translation: tri('Она оставила сумку в машине.', 'Вона залишила сумку в машині.', 'Ella dejó su bolso en el coche.'), options: ['in', 'on', 'at', 'onto'], correctAnswer: 'in', correctFeedback: tri('Да. Car здесь пространство/контейнер. Сумка внутри машины, поэтому in the car.', 'Так. Car тут простір/контейнер. Сумка всередині машини, тому in the car.', 'Sí. Car funciona como contenedor. El bolso está dentro, por eso in the car.'), wrong: { on: tri('On the car означало бы на поверхности машины, например на крыше. Здесь сумка внутри, поэтому in.', 'On the car означало б на поверхні машини, наприклад на даху. Тут сумка всередині, тому in.', 'On the car sería sobre el coche. Aquí está dentro, por eso in.'), at: tri('At the car означало бы возле машины как точка. Но сумка внутри машины, поэтому in.', 'At the car означало б біля машини як точка. Але сумка всередині машини, тому in.', 'At the car sería junto al coche. Pero el bolso está dentro, por eso in.'), onto: tri('Onto показывает движение на поверхность. Здесь сумка осталась внутри машины. Нужен in.', 'Onto показує рух на поверхню. Тут сумка залишилась всередині машини. Потрібен in.', 'Onto muestra movimiento hacia una superficie. Aquí quedó dentro del coche. Necesitamos in.') }, retry: [tri('Машина как контейнер. Внутри контейнера = in.', 'Машина як контейнер. Всередині контейнера = in.', 'Coche como contenedor. Dentro = in.'), tri('Inside the car = in the car.', 'Inside the car = in the car.', 'Inside the car = in the car.'), tri('Подсказка: in the car.', 'Підказка: in the car.', 'Pista: in the car.')], focusWords: ['the car'] }),
    placeStep({ id: 'place_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_place_type_recognition', sentence: 'The keys are ___ the table, and John is waiting ___ the door.', translation: tri('Ключи на столе, а Джон ждет у двери.', 'Ключі на столі, а Джон чекає біля дверей.', 'Las llaves están sobre la mesa, y John espera en la puerta.'), options: ['in / in', 'on / at', 'at / on', 'on / in'], correctAnswer: 'on / at', correctFeedback: tri('Да. The table - поверхность, поэтому on the table. The door здесь точка/место ожидания, поэтому at the door.', 'Так. The table - поверхня, тому on the table. The door тут точка/місце очікування, тому at the door.', 'Sí. The table es superficie, por eso on. The door es punto de espera, por eso at.'), wrong: { 'in / in': tri('In подходит для внутреннего пространства, но ключи не внутри стола, а человек не внутри двери. Нужна пара on / at.', 'In підходить для внутрішнього простору, але ключі не всередині столу, а людина не всередині дверей. Потрібна пара on / at.', 'In sirve para espacio interior, pero las llaves no están dentro de la mesa ni John dentro de la puerta. Necesitamos on / at.'), 'at / on': tri('Ты поменял местами. Table - поверхность = on. Door как место ожидания = at.', 'Ти поміняв місцями. Table - поверхня = on. Door як місце очікування = at.', 'Los invertiste. Table = superficie = on. Door como lugar de espera = at.'), 'on / in': tri('Первая часть правильная: on the table. Но waiting in the door неправильно: человек ждет у двери, поэтому at the door.', 'Перша частина правильна: on the table. Але waiting in the door неправильно: людина чекає біля дверей, тому at the door.', 'La primera parte está bien. Pero waiting in the door no funciona: la persona espera at the door.') }, retry: [tri('Раздели на две картинки: ключи на поверхности = on. Джон ждет у точки = at.', 'Розділи на дві картинки: ключі на поверхні = on. Джон чекає біля точки = at.', 'Divide en dos imágenes: llaves sobre superficie = on. John espera en un punto = at.'), tri('Table = on. Door = at.', 'Table = on. Door = at.', 'Table = on. Door = at.'), tri('Подсказка: on the table, at the door.', 'Підказка: on the table, at the door.', 'Pista: on the table, at the door.')], focusWords: ['the table', 'the door'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['inside_space_wrong_preposition', 'surface_wrong_preposition', 'point_location_wrong_preposition', 'city_country_wrong_preposition', 'street_address_confusion', 'functional_place_confusion'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем тип места и правильный предлог.', 'Звичайне пояснення: показуємо тип місця і правильний прийменник.', 'Explicación normal: mostramos el tipo de lugar y la preposición correcta.', { 'pt-BR': 'Explicação normal: mostramos o tipo de lugar e a preposição correta.', vi: 'Giải thích bình thường: hiển thị kiểu nơi chốn và giới từ đúng.', id: 'Penjelasan biasa: tampilkan jenis tempat dan preposisi yang benar.', tr: 'Normal açıklama: yer türünü ve doğru edatı gösteririz.', pl: 'Zwykłe wyjaśnienie: pokazujemy typ miejsca i właściwy przyimek.' }),
    depth2: tri('Проще: сводим выбор к картинке in/on/at.', 'Простіше: зводимо вибір до картинки in/on/at.', 'Más simple: reducimos la elección a la imagen in/on/at.', { 'pt-BR': 'Mais simples: reduzimos a escolha à imagem in/on/at.', vi: 'Đơn giản hơn: đưa lựa chọn về hình dung in/on/at.', id: 'Lebih sederhana: pilihan diringkas menjadi gambar in/on/at.', tr: 'Daha basit: seçimi in/on/at görseline indiririz.', pl: 'Prościej: sprowadzamy wybór do obrazu in/on/at.' }),
    depth3: tri('Еще проще: показываем готовый блок, например in the room, on the table, at school.', 'Ще простіше: показуємо готовий блок, наприклад in the room, on the table, at school.', 'Aún más simple: mostramos un bloque listo, por ejemplo in the room, on the table, at school.', { 'pt-BR': 'Ainda mais simples: mostramos um bloco pronto, por exemplo in the room, on the table, at school.', vi: 'Đơn giản hơn nữa: hiển thị cụm có sẵn, ví dụ in the room, on the table, at school.', id: 'Lebih sederhana lagi: tampilkan frasa siap pakai, misalnya in the room, on the table, at school.', tr: 'Daha da basit: hazır kalıp gösteririz, örneğin in the room, on the table, at school.', pl: 'Jeszcze prościej: pokazujemy gotowy blok, np. in the room, on the table, at school.' }),
    depth4: tri('Почти подсказка: прямо указываем тип места.', 'Майже підказка: прямо вказуємо тип місця.', 'Casi pista: indicamos directamente el tipo de lugar.', { 'pt-BR': 'Quase dica: indicamos diretamente o tipo de lugar.', vi: 'Gần như gợi ý: chỉ thẳng kiểu nơi chốn.', id: 'Hampir petunjuk: langsung tunjukkan jenis tempatnya.', tr: 'Neredeyse ipucu: yer türünü doğrudan belirtiriz.', pl: 'Prawie podpowiedź: wskazujemy bezpośrednio typ miejsca.' }),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. Не переводи “в/на”. Сначала представь картинку: внутри пространства = in, на поверхности = on, точка/локация = at.', 'Зупинись. Не перекладай “в/на”. Спочатку уяви картинку: всередині простору = in, на поверхні = on, точка/локація = at.', 'Detente. No traduzcas “en”. Primero imagina la escena: dentro de espacio = in, sobre superficie = on, punto/ubicación = at.', { 'pt-BR': 'Pare. Não traduza "em/na". Primeiro imagine a cena: dentro de espaço = in, sobre superfície = on, ponto/local = at.', vi: 'Dừng lại. Đừng dịch "ở/trên". Trước tiên hãy hình dung: bên trong không gian = in, trên bề mặt = on, điểm/vị trí = at.', id: 'Berhenti. Jangan menerjemahkan "di". Bayangkan dulu: di dalam ruang = in, di atas permukaan = on, titik/lokasi = at.', tr: 'Dur. "-de/-da" diye çevirme. Önce sahneyi düşün: alanın içinde = in, yüzeyde = on, nokta/konum = at.', pl: 'Zatrzymaj się. Nie tłumacz "w/na". Najpierw wyobraź sobie scenę: w przestrzeni = in, na powierzchni = on, punkt/lokalizacja = at.' }) },
    afterThreeWrongInSameExercise: { action: 'show_place_type_hint_then_retry', card: tri('Подсказка по типу места: система покажет, это внутри, поверхность или точка, но не выберет предлог за пользователя.', 'Підказка за типом місця: система покаже, це всередині, поверхня чи точка, але не вибере прийменник за користувача.', 'Pista de tipo de lugar: el sistema mostrará si es dentro, superficie o punto, pero no elegirá la preposición por el usuario.', { 'pt-BR': 'Dica de tipo de lugar: o sistema mostrará se é dentro, superfície ou ponto, mas não escolherá a preposição pelo usuário.', vi: 'Gợi ý kiểu nơi chốn: hệ thống sẽ cho biết đó là bên trong, bề mặt hay điểm, nhưng không chọn giới từ thay người dùng.', id: 'Petunjuk jenis tempat: sistem akan menunjukkan apakah ini di dalam, permukaan, atau titik, tetapi tidak memilih preposisi untuk pengguna.', tr: 'Yer türü ipucu: sistem bunun içerisi, yüzey veya nokta olduğunu gösterecek, ama edatı kullanıcı adına seçmeyecek.', pl: 'Podpowiedź typu miejsca: system pokaże, czy to wnętrze, powierzchnia czy punkt, ale nie wybierze przyimka za użytkownika.' }) },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери тип места. Потом система вернет тебя к in/on/at.', 'Режим підказки: спочатку обери тип місця. Потім система поверне тебе до in/on/at.', 'Modo guiado: primero elige el tipo de lugar. Luego el sistema te devuelve a in/on/at.', { 'pt-BR': 'Modo guiado: primeiro escolha o tipo de lugar. Depois o sistema devolve você para in/on/at.', vi: 'Chế độ hướng dẫn: trước tiên chọn kiểu nơi chốn. Sau đó hệ thống đưa bạn quay lại in/on/at.', id: 'Mode terpandu: pilih dulu jenis tempat. Lalu sistem mengembalikanmu ke in/on/at.', tr: 'Rehberli mod: önce yer türünü seç. Sonra sistem seni in/on/at seçimine döndürür.', pl: 'Tryb prowadzenia: najpierw wybierz typ miejsca. Potem system wróci z tobą do in/on/at.' }) },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_place_001', prompt: tri('The room - это пространство внутри, поверхность или точка?', 'The room - це простір всередині, поверхня чи точка?', 'The room es espacio interior, superficie o punto?', { 'pt-BR': 'The room é espaço interior, superfície ou ponto?', vi: 'The room là không gian bên trong, bề mặt hay điểm?', id: 'The room itu ruang bagian dalam, permukaan, atau titik?', tr: 'The room iç alan mı, yüzey mi, nokta mı?', pl: 'The room to przestrzeń wewnętrzna, powierzchnia czy punkt?' }), options: ['внутри пространства', 'поверхность', 'точка/локация'], correctIndex: 0, thenReturnToExerciseId: 'place_easy_001' },
      { id: 'guided_place_002', prompt: tri('The table в фразе The phone is ___ the table - это поверхность?', 'The table у фразі The phone is ___ the table - це поверхня?', 'The table en The phone is ___ the table es superficie?', { 'pt-BR': 'The table em The phone is ___ the table é uma superfície?', vi: 'The table trong The phone is ___ the table có phải là bề mặt không?', id: 'The table dalam The phone is ___ the table adalah permukaan?', tr: 'The phone is ___ the table cümlesinde the table bir yüzey mi?', pl: 'Czy the table w zdaniu The phone is ___ the table to powierzchnia?' }), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'place_contrast_001' },
      { id: 'guided_place_003', prompt: tri('The station в фразе meet you ___ the station - это точка встречи?', 'The station у фразі meet you ___ the station - це точка зустрічі?', 'The station en meet you ___ the station es punto de encuentro?', { 'pt-BR': 'The station em meet you ___ the station é ponto de encontro?', vi: 'The station trong meet you ___ the station có phải là điểm gặp không?', id: 'The station dalam meet you ___ the station adalah titik temu?', tr: 'meet you ___ the station ifadesinde the station buluşma noktası mı?', pl: 'Czy the station w meet you ___ the station to punkt spotkania?' }), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'place_contrast_004' },
      { id: 'guided_place_004', prompt: tri('18 Park Road - это точный адрес или просто улица?', '18 Park Road - це точна адреса чи просто вулиця?', '18 Park Road es dirección exacta o solo calle?', { 'pt-BR': '18 Park Road é endereço exato ou apenas rua?', vi: '18 Park Road là địa chỉ chính xác hay chỉ là tên đường?', id: '18 Park Road itu alamat tepat atau hanya jalan?', tr: '18 Park Road kesin adres mi yoksa sadece sokak mı?', pl: 'Czy 18 Park Road to dokładny adres czy tylko ulica?' }), options: ['точный адрес', 'просто улица'], correctIndex: 0, thenReturnToExerciseId: 'place_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'preposition',
    microDiagnosisId: 'preposition_place_in_on_at',
    diagnosisLabel: tri('In / On / At для места', 'In / On / At для місця', 'In / On / At para lugar', {
      'pt-BR': 'In / On / At para lugar',
      vi: 'In / On / At cho nơi chốn',
      id: 'In / On / At untuk tempat',
      tr: 'Yer için In / On / At',
      pl: 'In / On / At dla miejsca',
    }),
    contrastSet: ['in', 'on', 'at'],
    focusWords: ['in', 'on', 'at'],
    focusPatterns: ['inside_space_in', 'inside_container_in', 'city_country_in', 'surface_on', 'vertical_surface_on', 'street_on', 'point_location_at', 'functional_place_at', 'home_at', 'exact_address_at', 'school_function_at', 'mixed_place_type_recognition'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_preposition_place_in_on_at_start',
    answer: 'diagnosis_training_preposition_place_in_on_at_answer',
    mastery: 'diagnosis_training_preposition_place_in_on_at_mastery',
    recovery: 'diagnosis_training_preposition_place_in_on_at_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'preposition', microDiagnosisId: 'preposition_place_in_on_at', contrastSet: ['in', 'on', 'at'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logPlaceType: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=preposition&microDiagnosisId=preposition_place_in_on_at',
  },
  qualityChecklist: {
    hasStableId: true,
    hasCategory: true,
    hasMultilingualTitle: true,
    hasPlainDiagnosisText: true,
    hasMentalModel: true,
    hasContrastSet: true,
    hasAtLeastSixExamples: true,
    hasAtLeastTwelveExercises: true,
    hasEasyContrastMixedStructure: true,
    hasDistractorSpecificFeedback: true,
    hasRetryFeedbackLevels: true,
    hasGuidedModeForRepeatedMistakes: true,
    hasMasteryRules: true,
    hasSmartTrainerConfig: true,
    hasAnalyticsPayload: true,
    hasFallbackRoute: true,
  },
};
