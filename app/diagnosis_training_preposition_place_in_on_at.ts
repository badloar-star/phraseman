import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const tri = (
  ru: string,
  uk: string,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => ({
  ru,
  uk,
  es,
  'pt-BR': planned['pt-BR'] ?? es,
  vi: planned.vi ?? es,
  id: planned.id ?? es,
  tr: planned.tr ?? es,
  pl: planned.pl ?? es,
});

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
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'Не переводи “в/на” напрямую. Сначала представь место: внутри пространства, на поверхности или в точке/локации.',
      'Не перекладай “в/на” напряму. Спочатку уяви місце: всередині простору, на поверхні чи в точці/локації.',
      'No traduzcas “en” directamente. Primero imagina el lugar: dentro de un espacio, sobre una superficie o en un punto/ubicación.',
    ),
    microTask: tri('Выбери правильный предлог места.', 'Обери правильний прийменник місця.', 'Elige la preposición de lugar correcta.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Проверь картинку: in = внутри, on = поверхность/линия, at = точка или функциональная локация.',
        'Не зовсім. Перевір картинку: in = всередині, on = поверхня/лінія, at = точка або функціональна локація.',
        'No exactamente. Revisa la imagen: in = dentro, on = superficie/línea, at = punto o ubicación funcional.',
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Подсказка: здесь нужен блок "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
        `Підказка: тут потрібен блок "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
        `Pista: aquí necesitas el bloque "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
      ),
    ],
    fallbackExplanation: tri(
      'Карта места: in для пространства/контейнера/города, on для поверхности или улицы как линии, at для точки, адреса или места деятельности.',
      'Карта місця: in для простору/контейнера/міста, on для поверхні або вулиці як лінії, at для точки, адреси або місця діяльності.',
      'Mapa de lugar: in para espacio/contenedor/ciudad, on para superficie o calle como línea, at para punto, dirección o lugar de actividad.',
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
  title: tri('In / On / At: место', 'In / On / At: місце', 'In / On / At: lugar'),
  shortTitle: tri('In / On / At для места', 'In / On / At для місця', 'In / On / At para lugar'),
  shortDiagnosis: tri(
    'Ты путаешь in, on и at для места: внутри, поверхность или точка.',
    'Ти плутаєш in, on і at для місця: всередині, поверхня чи точка.',
    'Confundes in, on y at para lugar: dentro, superficie o punto.',
  ),
  diagnosisText: tri(
    'Ты путаешь in, on и at, когда говоришь о месте. Обычно проблема в том, что ты переводишь предлог как “в/на/у”, а английский смотрит на тип места: внутри пространства, на поверхности или в точке/локации.',
    'Ти плутаєш in, on і at, коли говориш про місце. Зазвичай проблема в тому, що ти перекладаєш прийменник як “в/на/у”, а англійська дивиться на тип місця: всередині простору, на поверхні або в точці/локації.',
    'Confundes in, on y at cuando hablas de lugar. Normalmente el problema es traducir la preposición como “en”, pero el inglés mira el tipo de lugar: dentro de un espacio, sobre una superficie o en un punto/ubicación.',
  ),
  mentalModel: tri(
    'In = внутри пространства. On = на поверхности или линии. At = в точке, месте события или адресной локации.',
    'In = всередині простору. On = на поверхні або лінії. At = у точці, місці події або адресній локації.',
    'In = dentro de un espacio. On = sobre una superficie o línea. At = en un punto, lugar de evento o ubicación.',
  ),
  contrastSet: ['in', 'on', 'at'],
  coreRule: tri(
    'in the room, in the car, in Dublin. on the table, on the wall, on the street. at home, at school, at the station, at 25 King Street.',
    'in the room, in the car, in Dublin. on the table, on the wall, on the street. at home, at school, at the station, at 25 King Street.',
    'in the room, in the car, in Dublin. on the table, on the wall, on the street. at home, at school, at the station, at 25 King Street.',
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
    { en: 'She is in the room.', ru: 'Она в комнате.', uk: 'Вона в кімнаті.', es: 'Ella está en la habitación.', 'pt-BR': 'Ela está no quarto.', vi: 'Cô ấy ở trong phòng.', id: 'Dia ada di dalam ruangan.', tr: 'O odada.', pl: 'Ona jest w pokoju.', why: tri('Room - пространство с границами. Она внутри комнаты, поэтому in.', 'Room - простір із межами. Вона всередині кімнати, тому in.', 'Room es un espacio con límites. Ella está dentro, por eso in.') },
    { en: 'The keys are on the table.', ru: 'Ключи на столе.', uk: 'Ключі на столі.', es: 'Las llaves están sobre la mesa.', 'pt-BR': 'As chaves estão sobre a mesa.', vi: 'Chìa khóa ở trên bàn.', id: 'Kunci-kunci ada di atas meja.', tr: 'Anahtarlar masanın üzerinde.', pl: 'Klucze są na stole.', why: tri('Table - поверхность. Ключи лежат на поверхности, поэтому on.', 'Table - поверхня. Ключі лежать на поверхні, тому on.', 'Table es una superficie. Las llaves están sobre la superficie, por eso on.') },
    { en: "I'll meet you at the station.", ru: 'Я встречу тебя на станции.', uk: 'Я зустріну тебе на станції.', es: 'Te veré en la estación.', 'pt-BR': 'Vou encontrar você na estação.', vi: 'Tôi sẽ gặp bạn ở nhà ga.', id: 'Saya akan bertemu denganmu di stasiun.', tr: 'Seninle istasyonda buluşacağım.', pl: 'Spotkam się z tobą na stacji.', why: tri('Station здесь воспринимается как точка встречи/локация, поэтому at.', 'Station тут сприймається як точка зустрічі/локація, тому at.', 'Station aquí se percibe como punto de encuentro, por eso at.') },
    { en: 'He lives in Dublin.', ru: 'Он живет в Дублине.', uk: 'Він живе в Дубліні.', es: 'Él vive en Dublín.', 'pt-BR': 'Ele mora em Dublin.', vi: 'Anh ấy sống ở Dublin.', id: 'Dia tinggal di Dublin.', tr: "Dublin'de yaşıyor.", pl: 'On mieszka w Dublinie.', why: tri('Dublin - город, большое пространство. С городами используется in.', 'Dublin - місто, великий простір. З містами використовується in.', 'Dublin es una ciudad, un espacio grande. Con ciudades usamos in.') },
    { en: 'The shop is on Main Street.', ru: 'Магазин находится на Мэйн-стрит.', uk: 'Магазин знаходиться на Мейн-стріт.', es: 'La tienda está en Main Street.', 'pt-BR': 'A loja fica na Main Street.', vi: 'Cửa hàng nằm trên phố Main.', id: 'Toko itu berada di Main Street.', tr: 'Dükkan Main Street üzerinde.', pl: 'Sklep jest przy Main Street.', why: tri('Street часто воспринимается как линия. Для улицы без номера обычно используется on.', 'Street часто сприймається як лінія. Для вулиці без номера зазвичай використовується on.', 'Street muchas veces se percibe como una línea. Sin número exacto normalmente usamos on.') },
    { en: 'The office is at 25 King Street.', ru: 'Офис находится по адресу 25 King Street.', uk: 'Офіс знаходиться за адресою 25 King Street.', es: 'La oficina está en 25 King Street.', 'pt-BR': 'O escritório fica no endereço 25 King Street.', vi: 'Văn phòng ở địa chỉ 25 King Street.', id: 'Kantornya berada di 25 King Street.', tr: 'Ofis 25 King Street adresinde.', pl: 'Biuro jest pod adresem 25 King Street.', why: tri('25 King Street - точный адрес. С точным адресом обычно используется at.', '25 King Street - точна адреса. З точною адресою зазвичай використовується at.', '25 King Street es una dirección exacta. Con dirección exacta usamos at.') },
    { en: 'She is at school.', ru: 'Она в школе.', uk: 'Вона в школі.', es: 'Ella está en la escuela.', 'pt-BR': 'Ela está na escola.', vi: 'Cô ấy đang ở trường.', id: 'Dia sedang di sekolah.', tr: 'O okulda.', pl: 'Ona jest w szkole.', why: tri('At school часто означает школу как место учебы/деятельности.', 'At school часто означає школу як місце навчання/діяльності.', 'At school muchas veces significa escuela como lugar funcional.') },
    { en: 'The picture is on the wall.', ru: 'Картина на стене.', uk: 'Картина на стіні.', es: 'El cuadro está en la pared.', 'pt-BR': 'O quadro está na parede.', vi: 'Bức tranh ở trên tường.', id: 'Gambar itu ada di dinding.', tr: 'Resim duvarda.', pl: 'Obraz jest na ścianie.', why: tri('Wall - поверхность. Картина находится на поверхности стены, поэтому on.', 'Wall - поверхня. Картина знаходиться на поверхні стіни, тому on.', 'Wall es una superficie. El cuadro está sobre la superficie, por eso on.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь in, on и at для места. Русское “в/на” не совпадает один в один с английской логикой.', 'Схоже, ти плутаєш in, on і at для місця. Українські “в/на” не збігаються один в один з англійською логікою.', 'Parece que confundes in, on y at para lugar. El español “en” no coincide exactamente con la lógica inglesa.') },
    { id: 'intro_rule', type: 'rule', text: tri('Главная модель: in - внутри, on - на поверхности, at - в точке/локации.', 'Головна модель: in - всередині, on - на поверхні, at - у точці/локації.', 'Modelo principal: in - dentro, on - sobre superficie, at - en un punto/ubicación.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не выбирай предлог по переводу. Выбирай по картинке: внутри пространства, на поверхности или точка на карте?', 'Не обирай прийменник за перекладом. Обирай за картинкою: всередині простору, на поверхні чи точка на мапі?', 'No elijas por traducción. Elige por la imagen: dentro de un espacio, sobre superficie o punto en el mapa?') },
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
    depth1: tri('Обычное объяснение: показываем тип места и правильный предлог.', 'Звичайне пояснення: показуємо тип місця і правильний прийменник.', 'Explicación normal: mostramos el tipo de lugar y la preposición correcta.'),
    depth2: tri('Проще: сводим выбор к картинке in/on/at.', 'Простіше: зводимо вибір до картинки in/on/at.', 'Más simple: reducimos la elección a la imagen in/on/at.'),
    depth3: tri('Еще проще: показываем готовый блок, например in the room, on the table, at school.', 'Ще простіше: показуємо готовий блок, наприклад in the room, on the table, at school.', 'Aún más simple: mostramos un bloque listo, por ejemplo in the room, on the table, at school.'),
    depth4: tri('Почти подсказка: прямо указываем тип места.', 'Майже підказка: прямо вказуємо тип місця.', 'Casi pista: indicamos directamente el tipo de lugar.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. Не переводи “в/на”. Сначала представь картинку: внутри пространства = in, на поверхности = on, точка/локация = at.', 'Зупинись. Не перекладай “в/на”. Спочатку уяви картинку: всередині простору = in, на поверхні = on, точка/локація = at.', 'Detente. No traduzcas “en”. Primero imagina la escena: dentro de espacio = in, sobre superficie = on, punto/ubicación = at.') },
    afterThreeWrongInSameExercise: { action: 'show_place_type_hint_then_retry', card: tri('Подсказка по типу места: система покажет, это внутри, поверхность или точка, но не выберет предлог за пользователя.', 'Підказка за типом місця: система покаже, це всередині, поверхня чи точка, але не вибере прийменник за користувача.', 'Pista de tipo de lugar: el sistema mostrará si es dentro, superficie o punto, pero no elegirá la preposición por el usuario.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери тип места. Потом система вернет тебя к in/on/at.', 'Режим підказки: спочатку обери тип місця. Потім система поверне тебе до in/on/at.', 'Modo guiado: primero elige el tipo de lugar. Luego el sistema te devuelve a in/on/at.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_place_001', prompt: tri('The room - это пространство внутри, поверхность или точка?', 'The room - це простір всередині, поверхня чи точка?', 'The room es espacio interior, superficie o punto?'), options: ['внутри пространства', 'поверхность', 'точка/локация'], correctIndex: 0, thenReturnToExerciseId: 'place_easy_001' },
      { id: 'guided_place_002', prompt: tri('The table в фразе The phone is ___ the table - это поверхность?', 'The table у фразі The phone is ___ the table - це поверхня?', 'The table en The phone is ___ the table es superficie?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'place_contrast_001' },
      { id: 'guided_place_003', prompt: tri('The station в фразе meet you ___ the station - это точка встречи?', 'The station у фразі meet you ___ the station - це точка зустрічі?', 'The station en meet you ___ the station es punto de encuentro?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'place_contrast_004' },
      { id: 'guided_place_004', prompt: tri('18 Park Road - это точный адрес или просто улица?', '18 Park Road - це точна адреса чи просто вулиця?', '18 Park Road es dirección exacta o solo calle?'), options: ['точный адрес', 'просто улица'], correctIndex: 0, thenReturnToExerciseId: 'place_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'preposition',
    microDiagnosisId: 'preposition_place_in_on_at',
    diagnosisLabel: tri('In / On / At для места', 'In / On / At для місця', 'In / On / At para lugar'),
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
    fallback: 'diagnosis_training_preposition_place_in_on_at_fallback',
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


