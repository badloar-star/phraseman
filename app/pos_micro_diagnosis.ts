import { normalizeRawCategory, normalizeTokenKey, type WordCategory } from './pos_taxonomy';
import type { PhraseMistakeInput, PhraseMistakeSignal } from './phrase_analytics';

export type PosMicroDiagnosisId =
  | 'article_a_an'
  | 'article_the_specific'
  | 'article_zero'
  | 'preposition_time_in_on_at'
  | 'preposition_place_in_on_at'
  | 'preposition_duration_for_since'
  | 'preposition_direction_to_into_from'
  | 'preposition_common_verb_patterns'
  | 'object_order_give_me_it'
  | 'word_order_basic_statement'
  | 'word_order_basic_question'
  | 'imperative_basic'
  | 'condition_zero_first'
  | 'condition_second_basic'
  | 'relative_clauses_who_which_that'
  | 'reported_speech_basic'
  | 'preposition_time_place'
  | 'preposition_direction'
  | 'verb_third_person'
  | 'verb_present_simple_negative_question'
  | 'verb_present_continuous_basic'
  | 'verb_present_simple_vs_continuous'
  | 'verb_past_simple_regular_irregular'
  | 'verb_past_simple_negative_question'
  | 'verb_present_perfect_basic'
  | 'present_perfect_vs_past_simple'
  | 'present_perfect_questions_negatives'
  | 'present_perfect_for_since'
  | 'past_continuous_basic'
  | 'past_simple_vs_past_continuous'
  | 'used_to_basic'
  | 'future_present_continuous_arrangements'
  | 'verb_was_were'
  | 'future_will_going_to'
  | 'infinitive_vs_gerund_basic'
  | 'too_enough'
  | 'modifier_very_really_quite'
  | 'verb_present_simple_statement'
  | 'verb_tense'
  | 'verb_after_modal'
  | 'to_be_present_agreement'
  | 'to_be_agreement'
  | 'there_is_are'
  | 'modal_may_might_probability'
  | 'modal_can_could_ability_request'
  | 'modal_should_must_have_to'
  | 'modal_base_form'
  | 'modal_force'
  | 'pronoun_case'
  | 'pronoun_possessive'
  | 'adjective_comparison'
  | 'adjective_vs_adverb'
  | 'adverb_frequency_position'
  | 'conjunction_logic'
  | 'quantifier_some_any'
  | 'determiner_this_that_these_those'
  | 'phrasal_particle_pair'
  | 'noun_singular_plural_basic'
  | 'noun_possessive_apostrophe_s'
  | 'noun_number'
  | 'noun_meaning'
  | 'category_general';

export interface MicroDiagnosisLabel {
  ru: string;
  uk: string;
  es: string;
  'pt-BR'?: string;
  vi?: string;
  id?: string;
  tr?: string;
  pl?: string;
}

export interface PosMicroDiagnosis {
  id: PosMicroDiagnosisId;
  category: WordCategory;
  label: MicroDiagnosisLabel;
  coachLine: MicroDiagnosisLabel;
  evidenceCount: number;
  totalCount: number;
  focusWords: string[];
}

const LABELS: Record<PosMicroDiagnosisId, { label: MicroDiagnosisLabel; coachLine: MicroDiagnosisLabel }> = {
  article_a_an: {
    label: {
      ru: 'a/an перед звуком',
      uk: 'a/an перед звуком',
      es: 'a/an antes del sonido',
      'pt-BR': "a/an antes do som",
      vi: "a/an trước âm",
      id: "a/an sebelum bunyi",
      tr: "sese göre a/an",
      pl: "a/an przed dźwiękiem",
    },
    coachLine: {
      ru: 'Похоже, ломается выбор между a и an: здесь решает первый звук следующего слова.',
      uk: 'Схоже, ламається вибір між a та an: тут вирішує перший звук наступного слова.',
      es: 'Parece que falla la elección entre a y an: manda el primer sonido de la palabra siguiente.',
      'pt-BR': "Parece que a escolha entre a e an está falhando: aqui manda o primeiro som da palavra seguinte.",
      vi: "Có vẻ lựa chọn giữa a và an đang bị sai: ở đây âm đầu của từ tiếp theo quyết định.",
      id: "Sepertinya pilihan antara a dan an bermasalah: yang menentukan adalah bunyi pertama kata berikutnya.",
      tr: "a ile an arasındaki seçim aksıyor gibi: burada sonraki kelimenin ilk sesi belirleyici.",
      pl: "Wygląda na problem z wyborem między a i an: decyduje pierwszy dźwięk następnego słowa.",
    },
  },
  article_the_specific: {
    label: {
      ru: 'the для известного предмета',
      uk: 'the для відомого предмета',
      es: 'the para algo conocido',
      'pt-BR': "the para algo conhecido",
      vi: "the cho vật đã biết",
      id: "the untuk hal yang sudah diketahui",
      tr: "bilinen şey için the",
      pl: "the dla znanej rzeczy",
    },
    coachLine: {
      ru: 'Сигнал не просто про артикли: чаще всего теряется идея “уже известное / конкретное”.',
      uk: 'Сигнал не просто про артиклі: найчастіше губиться ідея “вже відоме / конкретне”.',
      es: 'La señal no es solo artículos: se pierde la idea de algo conocido o específico.',
      'pt-BR': "O sinal não é só sobre artigos: a ideia de algo já conhecido ou específico está se perdendo.",
      vi: "Tín hiệu không chỉ là mạo từ: ý “đã biết / cụ thể” thường bị mất.",
      id: "Sinyalnya bukan sekadar artikel: ide “sudah diketahui / spesifik” sering hilang.",
      tr: "Sinyal sadece artikellerle ilgili değil: “zaten bilinen / belirli” fikri kayboluyor.",
      pl: "To nie tylko artykuły: gubi się idea czegoś znanego lub konkretnego.",
    },
  },
  article_zero: {
    label: {
      ru: 'нулевой артикль',
      uk: 'нульовий артикль',
      es: 'artículo cero',
      'pt-BR': "artigo zero",
      vi: "mạo từ zero",
      id: "artikel nol",
      tr: "sıfır artikel",
      pl: "przedimek zerowy",
    },
    coachLine: {
      ru: 'Похоже, проблема в выборе между артиклем и его отсутствием.',
      uk: 'Схоже, проблема у виборі між артиклем і його відсутністю.',
      es: 'Parece que el problema está entre usar artículo o no usarlo.',
      'pt-BR': "Parece que o problema está entre usar artigo e não usar artigo.",
      vi: "Có vẻ vấn đề nằm ở việc chọn dùng mạo từ hay không dùng mạo từ.",
      id: "Sepertinya masalahnya ada pada memilih memakai artikel atau tidak memakainya.",
      tr: "Sorun artikel kullanmakla hiç artikel kullanmamak arasında gibi.",
      pl: "Wygląda na problem z wyborem między użyciem przedimka a jego brakiem.",
    },
  },
  preposition_time_in_on_at: {
    label: {
      ru: 'in/on/at для времени',
      uk: 'in/on/at для часу',
      es: 'in/on/at para tiempo',
      'pt-BR': "in/on/at para tempo",
      vi: "in/on/at cho thời gian",
      id: "in/on/at untuk waktu",
      tr: "zaman için in/on/at",
      pl: "in/on/at dla czasu",
    },
    coachLine: {
      ru: 'Похоже, путается размер времени: точная точка, день или широкий период.',
      uk: 'Схоже, плутається розмір часу: точна точка, день або широкий період.',
      es: 'Parece que se mezcla el tamaño del tiempo: punto exacto, día o período amplio.',
      'pt-BR': "Parece que o tamanho do tempo se mistura: ponto exato, dia ou período amplo.",
      vi: "Có vẻ đang nhầm kích thước thời gian: điểm chính xác, ngày hay khoảng thời gian rộng.",
      id: "Sepertinya ukuran waktu tercampur: titik tepat, hari, atau periode yang luas.",
      tr: "Zaman ölçeği karışıyor gibi: kesin nokta, gün ya da geniş dönem.",
      pl: "Wygląda na mieszanie skali czasu: dokładny punkt, dzień albo szeroki okres.",
    },
  },
  preposition_place_in_on_at: {
    label: {
      ru: 'in/on/at для места',
      uk: 'in/on/at для місця',
      es: 'in/on/at para lugar',
      'pt-BR': "in/on/at para lugar",
      vi: "in/on/at cho nơi chốn",
      id: "in/on/at untuk tempat",
      tr: "yer için in/on/at",
      pl: "in/on/at dla miejsca",
    },
    coachLine: {
      ru: 'Похоже, путается место: точка, поверхность или пространство внутри.',
      uk: 'Схоже, плутається місце: точка, поверхня або простір усередині.',
      es: 'Parece que se mezcla lugar: punto, superficie o espacio interior.',
      'pt-BR': "Parece que o lugar se mistura: ponto, superfície ou espaço interno.",
      vi: "Có vẻ nơi chốn bị nhầm: điểm, bề mặt hay không gian bên trong.",
      id: "Sepertinya tempat tercampur: titik, permukaan, atau ruang di dalam.",
      tr: "Yer ilişkisi karışıyor gibi: nokta, yüzey ya da iç alan.",
      pl: "Wygląda na mieszanie miejsca: punkt, powierzchnia albo przestrzeń wewnątrz.",
    },
  },
  preposition_duration_for_since: {
    label: {
      ru: 'for/since для длительности',
      uk: 'for/since для тривалості',
      es: 'for/since para duración',
      'pt-BR': "for/since para duração",
      vi: "for/since cho thời lượng",
      id: "for/since untuk durasi",
      tr: "süre için for/since",
      pl: "for/since dla trwania",
    },
    coachLine: {
      ru: 'Похоже, путается выбор: сколько длится или с какого момента началось.',
      uk: 'Схоже, плутається вибір: скільки триває чи з якого моменту почалося.',
      es: 'Parece que se mezcla la elección: cuánto dura o desde qué momento empezó.',
      'pt-BR': "Parece que a escolha se mistura: quanto tempo dura ou desde que momento começou.",
      vi: "Có vẻ đang nhầm lựa chọn: kéo dài bao lâu hay bắt đầu từ thời điểm nào.",
      id: "Sepertinya pilihannya tercampur: berapa lama berlangsung atau sejak kapan dimulai.",
      tr: "Seçim karışıyor gibi: ne kadar sürdüğü mü, hangi andan başladığı mı.",
      pl: "Wygląda na mylenie wyboru: jak długo trwa albo od kiedy się zaczęło.",
    },
  },
  preposition_direction_to_into_from: {
    label: {
      ru: 'To / Into / From / Out of',
      uk: 'To / Into / From / Out of',
      es: 'To / Into / From / Out of',
      'pt-BR': "To / Into / From / Out of",
      vi: "To / Into / From / Out of",
      id: "To / Into / From / Out of",
      tr: "To / Into / From / Out of",
      pl: "To / Into / From / Out of",
    },
    coachLine: {
      ru: 'Signal looks like direction prepositions: destination to, movement into, source from, or inside-to-outside out of.',
      uk: 'Signal looks like direction prepositions: destination to, movement into, source from, or inside-to-outside out of.',
      es: 'La senal apunta a preposiciones de direccion: to, into, from u out of.',
      'pt-BR': "O sinal aponta para preposições de direção: destino to, movimento para dentro into, origem from ou saída out of.",
      vi: "Tín hiệu giống giới từ chỉ hướng: đích to, đi vào into, nguồn from hoặc từ trong ra ngoài out of.",
      id: "Sinyalnya mengarah ke preposisi arah: tujuan to, gerak masuk into, asal from, atau keluar dari dalam out of.",
      tr: "Sinyal yön edatlarına benziyor: hedef to, içeri hareket into, kaynak from ya da içeriden dışarı out of.",
      pl: "Sygnał wygląda na przyimki kierunku: cel to, ruch do środka into, źródło from albo wyjście out of.",
    },
  },
  preposition_common_verb_patterns: {
    label: {
      ru: 'Verb + Preposition',
      uk: 'Verb + Preposition',
      es: 'Verb + Preposition',
      'pt-BR': "Verb + Preposition",
      vi: "Verb + Preposition",
      id: "Verb + Preposition",
      tr: "Verb + Preposition",
      pl: "Verb + Preposition",
    },
    coachLine: {
      ru: 'Signal looks like fixed verb + preposition patterns: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.',
      uk: 'Signal looks like fixed verb + preposition patterns: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.',
      es: 'La senal apunta a patrones fijos de verbo + preposicion: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.',
      'pt-BR': "O sinal aponta para padrões fixos verb + preposition: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.",
      vi: "Tín hiệu giống các mẫu cố định verb + preposition: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.",
      id: "Sinyalnya mengarah ke pola tetap verb + preposition: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.",
      tr: "Sinyal sabit verb + preposition kalıplarına benziyor: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.",
      pl: "Sygnał wygląda na stałe wzorce verb + preposition: listen to, wait for, depend on, look at, talk to, think about, ask for, believe in.",
    },
  },
  object_order_give_me_it: {
    label: {
      ru: 'Object Order',
      uk: 'Object Order',
      es: 'Object Order',
      'pt-BR': "ordem dos objetos",
      vi: "thứ tự tân ngữ",
      id: "urutan objek",
      tr: "nesne sırası",
      pl: "szyk dopełnień",
    },
    coachLine: {
      ru: 'Signal looks like two-object word order: give me the book, give it to me, send it to her, buy it for me.',
      uk: 'Signal looks like two-object word order: give me the book, give it to me, send it to her, buy it for me.',
      es: 'La senal apunta al orden de dos objetos: give me the book, give it to me, send it to her, buy it for me.',
      'pt-BR': "O sinal aponta para a ordem com dois objetos: give me the book, give it to me, send it to her, buy it for me.",
      vi: "Tín hiệu giống thứ tự hai tân ngữ: give me the book, give it to me, send it to her, buy it for me.",
      id: "Sinyalnya mengarah ke urutan dua objek: give me the book, give it to me, send it to her, buy it for me.",
      tr: "Sinyal iki nesneli sözcük sırasına benziyor: give me the book, give it to me, send it to her, buy it for me.",
      pl: "Sygnał wygląda na szyk z dwoma dopełnieniami: give me the book, give it to me, send it to her, buy it for me.",
    },
  },
  word_order_basic_statement: {
    label: {
      ru: 'Basic Word Order',
      uk: 'Basic Word Order',
      es: 'Basic Word Order',
      'pt-BR': "ordem básica das palavras",
      vi: "trật tự từ cơ bản",
      id: "urutan kata dasar",
      tr: "temel kelime sırası",
      pl: "podstawowy szyk zdania",
    },
    coachLine: {
      ru: 'Signal looks like basic English statement word order: subject + verb + object/place/time.',
      uk: 'Signal looks like basic English statement word order: subject + verb + object/place/time.',
      es: 'La senal apunta al orden basico de la afirmacion: subject + verb + object/place/time.',
      'pt-BR': "O sinal aponta para a ordem básica da afirmação em inglês: subject + verb + object/place/time.",
      vi: "Tín hiệu giống trật tự câu khẳng định tiếng Anh cơ bản: subject + verb + object/place/time.",
      id: "Sinyalnya mengarah ke urutan dasar kalimat pernyataan bahasa Inggris: subject + verb + object/place/time.",
      tr: "Sinyal temel İngilizce düz cümle sırasına benziyor: subject + verb + object/place/time.",
      pl: "Sygnał wygląda na podstawowy szyk zdania oznajmującego po angielsku: subject + verb + object/place/time.",
    },
  },
  word_order_basic_question: {
    label: {
      ru: 'Question Word Order',
      uk: 'Question Word Order',
      es: 'Question Word Order',
      'pt-BR': "ordem das perguntas",
      vi: "trật tự từ trong câu hỏi",
      id: "urutan kata pertanyaan",
      tr: "soru kelime sırası",
      pl: "szyk pytania",
    },
    coachLine: {
      ru: 'Signal looks like English question word order: helper + subject + verb, or question word + helper + subject + verb.',
      uk: 'Signal looks like English question word order: helper + subject + verb, or question word + helper + subject + verb.',
      es: 'La senal apunta al orden de preguntas: helper + subject + verb.',
      'pt-BR': "O sinal aponta para a ordem de perguntas em inglês: helper + subject + verb, ou question word + helper + subject + verb.",
      vi: "Tín hiệu giống trật tự câu hỏi tiếng Anh: helper + subject + verb, hoặc question word + helper + subject + verb.",
      id: "Sinyalnya mengarah ke urutan pertanyaan bahasa Inggris: helper + subject + verb, atau question word + helper + subject + verb.",
      tr: "Sinyal İngilizce soru sırasına benziyor: helper + subject + verb ya da question word + helper + subject + verb.",
      pl: "Sygnał wygląda na angielski szyk pytania: helper + subject + verb albo question word + helper + subject + verb.",
    },
  },
  imperative_basic: {
    label: {
      ru: 'Imperative',
      uk: 'Imperative',
      es: 'Imperative',
      'pt-BR': "imperativo",
      vi: "mệnh lệnh thức",
      id: "imperatif",
      tr: "emir kipi",
      pl: "tryb rozkazujący",
    },
    coachLine: {
      ru: "Signal looks like imperative structure: base verb command, don't + base verb, please, or let's.",
      uk: "Signal looks like imperative structure: base verb command, don't + base verb, please, or let's.",
      es: "La senal apunta al imperativo: verbo base, don't + verbo base, please o let's.",
      'pt-BR': "O sinal aponta para o imperativo: comando com base verb, don't + base verb, please ou let's.",
      vi: "Tín hiệu giống cấu trúc mệnh lệnh: base verb command, don't + base verb, please hoặc let's.",
      id: "Sinyalnya mengarah ke imperatif: perintah dengan base verb, don't + base verb, please, atau let's.",
      tr: "Sinyal emir yapısına benziyor: base verb komutu, don't + base verb, please ya da let's.",
      pl: "Sygnał wygląda na tryb rozkazujący: base verb command, don't + base verb, please albo let's.",
    },
  },
  condition_zero_first: {
    label: {
      ru: 'Zero / First Conditional',
      uk: 'Zero / First Conditional',
      es: 'Zero / First Conditional',
      'pt-BR': "Zero / First Conditional",
      vi: "Zero / First Conditional",
      id: "Zero / First Conditional",
      tr: "Zero / First Conditional",
      pl: "Zero / First Conditional",
    },
    coachLine: {
      ru: 'Signal looks like zero/first conditional: if + present, will in the main clause, no will after if/when/unless.',
      uk: 'Signal looks like zero/first conditional: if + present, will in the main clause, no will after if/when/unless.',
      es: 'La senal apunta a zero/first conditional: if + presente, will en la principal y no will tras if/when/unless.',
      'pt-BR': "O sinal aponta para zero/first conditional: if + present, will na oração principal, sem will depois de if/when/unless.",
      vi: "Tín hiệu giống zero/first conditional: if + present, will ở mệnh đề chính, không dùng will sau if/when/unless.",
      id: "Sinyalnya mengarah ke zero/first conditional: if + present, will di klausa utama, tanpa will setelah if/when/unless.",
      tr: "Sinyal zero/first conditional yapısına benziyor: if + present, ana cümlede will, if/when/unless sonrasında will yok.",
      pl: "Sygnał wygląda na zero/first conditional: if + present, will w zdaniu głównym, bez will po if/when/unless.",
    },
  },
  condition_second_basic: {
    label: {
      ru: 'Second Conditional',
      uk: 'Second Conditional',
      es: 'Second Conditional',
      'pt-BR': "Second Conditional",
      vi: "Second Conditional",
      id: "Second Conditional",
      tr: "Second Conditional",
      pl: "Second Conditional",
    },
    coachLine: {
      ru: 'Signal looks like Second Conditional: unreal if + past simple with would + base verb, or If I were you advice.',
      uk: 'Signal looks like Second Conditional: unreal if + past simple with would + base verb, or If I were you advice.',
      es: 'La senal apunta al Second Conditional: if irreal + pasado simple con would + verbo base.',
      'pt-BR': "O sinal aponta para Second Conditional: if irreal + past simple com would + base verb, ou conselho If I were you.",
      vi: "Tín hiệu giống Second Conditional: if giả định + past simple với would + base verb, hoặc lời khuyên If I were you.",
      id: "Sinyalnya mengarah ke Second Conditional: if tidak nyata + past simple dengan would + base verb, atau saran If I were you.",
      tr: "Sinyal Second Conditional yapısına benziyor: gerçek dışı if + past simple ve would + base verb, ya da If I were you tavsiyesi.",
      pl: "Sygnał wygląda na Second Conditional: nierealne if + past simple z would + base verb albo rada If I were you.",
    },
  },
  relative_clauses_who_which_that: {
    label: {
      ru: 'Who / Which / That',
      uk: 'Who / Which / That',
      es: 'Who / Which / That',
      'pt-BR': "Who / Which / That",
      vi: "Who / Which / That",
      id: "Who / Which / That",
      tr: "Who / Which / That",
      pl: "Who / Which / That",
    },
    coachLine: {
      ru: 'Signal looks like relative clauses: who for people, which for things, that in defining clauses, or whose for possession.',
      uk: 'Signal looks like relative clauses: who for people, which for things, that in defining clauses, or whose for possession.',
      es: 'La senal apunta a relative clauses: who para personas, which para cosas, that en defining clauses y whose para posesion.',
      'pt-BR': "O sinal aponta para relative clauses: who para pessoas, which para coisas, that em defining clauses ou whose para posse.",
      vi: "Tín hiệu giống relative clauses: who cho người, which cho vật, that trong defining clauses, hoặc whose cho sở hữu.",
      id: "Sinyalnya mengarah ke relative clauses: who untuk orang, which untuk benda, that dalam defining clauses, atau whose untuk kepemilikan.",
      tr: "Sinyal relative clauses yapısına benziyor: insanlar için who, şeyler için which, defining clauses içinde that, sahiplik için whose.",
      pl: "Sygnał wygląda na relative clauses: who dla ludzi, which dla rzeczy, that w defining clauses albo whose dla posiadania.",
    },
  },
  reported_speech_basic: {
    label: {
      ru: 'Reported Speech',
      uk: 'Reported Speech',
      es: 'Reported Speech',
      'pt-BR': "Reported Speech",
      vi: "Reported Speech",
      id: "Reported Speech",
      tr: "Reported Speech",
      pl: "Reported Speech",
    },
    coachLine: {
      ru: 'Signal looks like reported speech: said that, told someone that, asked if/where, pronoun shift, backshift, or normal reported question order.',
      uk: 'Signal looks like reported speech: said that, told someone that, asked if/where, pronoun shift, backshift, or normal reported question order.',
      es: 'La senal apunta a reported speech: said that, told someone that, asked if/where, pronoun shift, backshift u orden normal.',
      'pt-BR': "O sinal aponta para reported speech: said that, told someone that, asked if/where, mudança de pronome, backshift ou ordem normal de pergunta relatada.",
      vi: "Tín hiệu giống reported speech: said that, told someone that, asked if/where, đổi đại từ, backshift hoặc trật tự câu hỏi gián tiếp.",
      id: "Sinyalnya mengarah ke reported speech: said that, told someone that, asked if/where, perubahan pronomina, backshift, atau urutan normal pertanyaan tak langsung.",
      tr: "Sinyal reported speech yapısına benziyor: said that, told someone that, asked if/where, zamir değişimi, backshift ya da normal dolaylı soru sırası.",
      pl: "Sygnał wygląda na reported speech: said that, told someone that, asked if/where, zmiana zaimka, backshift albo normalny szyk pytania zależnego.",
    },
  },
  preposition_time_place: {
    label: {
      ru: 'in/on/at для времени и места',
      uk: 'in/on/at для часу й місця',
      es: 'in/on/at para tiempo y lugar',
      'pt-BR': "in/on/at para tempo e lugar",
      vi: "in/on/at cho thời gian và nơi chốn",
      id: "in/on/at untuk waktu dan tempat",
      tr: "zaman ve yer için in/on/at",
      pl: "in/on/at dla czasu i miejsca",
    },
    coachLine: {
      ru: 'Ошибки сходятся вокруг коротких предлогов in/on/at: нужно закрепить тип связи.',
      uk: 'Помилки сходяться навколо коротких прийменників in/on/at: треба закріпити тип зв’язку.',
      es: 'Los errores se concentran en in/on/at: hay que fijar el tipo de relación.',
      'pt-BR': "Os erros se concentram em in/on/at: é preciso fixar o tipo de relação.",
      vi: "Lỗi tập trung quanh in/on/at: cần củng cố loại quan hệ.",
      id: "Kesalahan berpusat pada in/on/at: jenis relasinya perlu diperkuat.",
      tr: "Hatalar in/on/at etrafında toplanıyor: ilişki türünü pekiştirmek gerekiyor.",
      pl: "Błędy skupiają się wokół in/on/at: trzeba utrwalić typ relacji.",
    },
  },
  preposition_direction: {
    label: {
      ru: 'направление и связь',
      uk: 'напрям і зв’язок',
      es: 'dirección y relación',
      'pt-BR': "direção e relação",
      vi: "hướng và quan hệ",
      id: "arah dan relasi",
      tr: "yön ve ilişki",
      pl: "kierunek i relacja",
    },
    coachLine: {
      ru: 'Похоже, путается не слово, а связь: куда, откуда, для чего или с чем.',
      uk: 'Схоже, плутається не слово, а зв’язок: куди, звідки, для чого або з чим.',
      es: 'Parece que falla la relación: hacia dónde, desde dónde, para qué o con qué.',
      'pt-BR': "Parece que falha não a palavra, mas a relação: para onde, de onde, para quê ou com o quê.",
      vi: "Có vẻ sai không phải từ, mà là quan hệ: đi đâu, từ đâu, để làm gì hoặc với gì.",
      id: "Sepertinya yang bermasalah bukan katanya, melainkan relasinya: ke mana, dari mana, untuk apa, atau dengan apa.",
      tr: "Sorun kelimede değil ilişkide gibi: nereye, nereden, ne için ya da neyle.",
      pl: "Wygląda na to, że myli się nie słowo, lecz relacja: dokąd, skąd, po co albo z czym.",
    },
  },
  verb_third_person: {
    label: {
      ru: '3-е лицо: does / -s',
      uk: '3-тя особа: does / -s',
      es: '3a persona: does / -s',
      'pt-BR': "3a pessoa: does / -s",
      vi: "ngôi thứ 3: does / -s",
      id: "orang ke-3: does / -s",
      tr: "3. tekil kişi: does / -s",
      pl: "3. osoba: does / -s",
    },
    coachLine: {
      ru: 'Это не “глаголы вообще”: сигнал похож на he/she/it, does и окончание -s.',
      uk: 'Це не “дієслова взагалі”: сигнал схожий на he/she/it, does і закінчення -s.',
      es: 'No es “verbos en general”: la señal apunta a he/she/it, does y la -s.',
      'pt-BR': "Não é “verbos em geral”: o sinal aponta para he/she/it, does e a terminação -s.",
      vi: "Đây không phải “động từ nói chung”: tín hiệu hướng tới he/she/it, does và đuôi -s.",
      id: "Ini bukan “kata kerja secara umum”: sinyalnya mengarah ke he/she/it, does, dan akhiran -s.",
      tr: "Bu “genel olarak fiiller” değil: sinyal he/she/it, does ve -s ekine işaret ediyor.",
      pl: "To nie „czasowniki ogólnie”: sygnał wskazuje na he/she/it, does i końcówkę -s.",
    },
  },
  verb_present_simple_negative_question: {
    label: {
      ru: 'does + базовый глагол',
      uk: 'does + базове дієслово',
      es: 'does + verbo base',
      'pt-BR': "does + verbo base",
      vi: "does + động từ nguyên mẫu",
      id: "does + kata kerja dasar",
      tr: "does + fiilin yalın hali",
      pl: "does + czasownik bazowy",
    },
    coachLine: {
      ru: 'Сигнал похож на Present Simple вопрос или отрицание: do/does уже несет грамматику, поэтому основной глагол остается базовым.',
      uk: 'Сигнал схожий на питання або заперечення Present Simple: do/does уже несе граматику, тому основне дієслово лишається базовим.',
      es: 'La señal apunta a preguntas o negativas en Present Simple: do/does lleva la gramática y el verbo principal queda en base.',
      'pt-BR': "O sinal aponta para pergunta ou negativa no Present Simple: do/does já carrega a gramática, então o verbo principal fica na base.",
      vi: "Tín hiệu giống câu hỏi hoặc phủ định Present Simple: do/does đã mang ngữ pháp, nên động từ chính ở dạng gốc.",
      id: "Sinyalnya mengarah ke pertanyaan atau negatif Present Simple: do/does sudah membawa tata bahasa, jadi kata kerja utama tetap bentuk dasar.",
      tr: "Sinyal Present Simple soru ya da olumsuza benziyor: do/does grameri taşır, ana fiil yalın kalır.",
      pl: "Sygnał wygląda na pytanie lub przeczenie w Present Simple: do/does niesie gramatykę, więc główny czasownik zostaje w formie bazowej.",
    },
  },
  verb_present_continuous_basic: {
    label: {
      ru: 'Present Continuous: am/is/are + -ing',
      uk: 'Present Continuous: am/is/are + -ing',
      es: 'Present Continuous: am/is/are + -ing',
      'pt-BR': "Present Continuous: am/is/are + -ing",
      vi: "Present Continuous: am/is/are + -ing",
      id: "Present Continuous: am/is/are + -ing",
      tr: "Present Continuous: am/is/are + -ing",
      pl: "Present Continuous: am/is/are + -ing",
    },
    coachLine: {
      ru: 'Signal looks like Present Continuous: action now, am/is/are + -ing, or a missing be before -ing.',
      uk: 'Signal looks like Present Continuous: action now, am/is/are + -ing, or a missing be before -ing.',
      es: 'La senal apunta a Present Continuous: accion ahora, am/is/are + -ing, o falta be antes de -ing.',
      'pt-BR': "O sinal aponta para Present Continuous: ação agora, am/is/are + -ing ou falta de be antes de -ing.",
      vi: "Tín hiệu giống Present Continuous: hành động đang diễn ra, am/is/are + -ing, hoặc thiếu be trước -ing.",
      id: "Sinyalnya mengarah ke Present Continuous: aksi sekarang, am/is/are + -ing, atau be yang hilang sebelum -ing.",
      tr: "Sinyal Present Continuous yapısına benziyor: şu anki eylem, am/is/are + -ing ya da -ing öncesinde eksik be.",
      pl: "Sygnał wygląda na Present Continuous: czynność teraz, am/is/are + -ing albo brak be przed -ing.",
    },
  },
  verb_present_simple_vs_continuous: {
    label: {
      ru: 'Present Simple vs Continuous',
      uk: 'Present Simple vs Continuous',
      es: 'Present Simple vs Continuous',
      'pt-BR': "Present Simple vs Continuous",
      vi: "Present Simple vs Continuous",
      id: "Present Simple vs Continuous",
      tr: "Present Simple vs Continuous",
      pl: "Present Simple vs Continuous",
    },
    coachLine: {
      ru: 'Signal looks like a Simple vs Continuous contrast: normally/every day/usually versus now/right now/at the moment.',
      uk: 'Signal looks like a Simple vs Continuous contrast: normally/every day/usually versus now/right now/at the moment.',
      es: 'La senal apunta a contraste Simple vs Continuous: normally/every day/usually frente a now/right now/at the moment.',
      'pt-BR': "O sinal aponta para contraste Simple vs Continuous: normally/every day/usually contra now/right now/at the moment.",
      vi: "Tín hiệu giống tương phản Simple vs Continuous: normally/every day/usually so với now/right now/at the moment.",
      id: "Sinyalnya mengarah ke kontras Simple vs Continuous: normally/every day/usually dibanding now/right now/at the moment.",
      tr: "Sinyal Simple vs Continuous karşıtlığına benziyor: normally/every day/usually ile now/right now/at the moment.",
      pl: "Sygnał wygląda na kontrast Simple vs Continuous: normally/every day/usually kontra now/right now/at the moment.",
    },
  },
  verb_past_simple_regular_irregular: {
    label: {
      ru: 'Past Simple: regular / irregular',
      uk: 'Past Simple: regular / irregular',
      es: 'Past Simple: regular / irregular',
      'pt-BR': "Past Simple: regular / irregular",
      vi: "Past Simple: regular / irregular",
      id: "Past Simple: regular / irregular",
      tr: "Past Simple: regular / irregular",
      pl: "Past Simple: regular / irregular",
    },
    coachLine: {
      ru: 'Signal looks like Past Simple: yesterday/last night/ago, regular -ed, irregular past form, or a wrong form like goed.',
      uk: 'Signal looks like Past Simple: yesterday/last night/ago, regular -ed, irregular past form, or a wrong form like goed.',
      es: 'La senal apunta a Past Simple: yesterday/last night/ago, regular -ed, irregular past form o una forma como goed.',
      'pt-BR': "O sinal aponta para Past Simple: yesterday/last night/ago, regular -ed, forma irregular do passado ou forma errada como goed.",
      vi: "Tín hiệu giống Past Simple: yesterday/last night/ago, đuôi regular -ed, dạng quá khứ bất quy tắc hoặc dạng sai như goed.",
      id: "Sinyalnya mengarah ke Past Simple: yesterday/last night/ago, regular -ed, bentuk lampau irregular, atau bentuk salah seperti goed.",
      tr: "Sinyal Past Simple yapısına benziyor: yesterday/last night/ago, regular -ed, irregular past form ya da goed gibi yanlış form.",
      pl: "Sygnał wygląda na Past Simple: yesterday/last night/ago, regular -ed, irregular past form albo błędna forma typu goed.",
    },
  },
  verb_past_simple_negative_question: {
    label: {
      ru: "Past Simple: Did / Didn't",
      uk: "Past Simple: Did / Didn't",
      es: "Past Simple: Did / Didn't",
      'pt-BR': "Past Simple: Did / Didn't",
      vi: "Past Simple: Did / Didn't",
      id: "Past Simple: Did / Didn't",
      tr: "Past Simple: Did / Didn't",
      pl: "Past Simple: Did / Didn't",
    },
    coachLine: {
      ru: "Signal looks like Past Simple question/negative: did/didn't + base verb, not did went or didn't bought.",
      uk: "Signal looks like Past Simple question/negative: did/didn't + base verb, not did went or didn't bought.",
      es: "La senal apunta a pregunta/negacion en Past Simple: did/didn't + base verb.",
      'pt-BR': "O sinal aponta para pergunta/negativa em Past Simple: did/didn't + base verb, não did went nem didn't bought.",
      vi: "Tín hiệu giống câu hỏi/phủ định Past Simple: did/didn't + base verb, không phải did went hay didn't bought.",
      id: "Sinyalnya mengarah ke pertanyaan/negatif Past Simple: did/didn't + base verb, bukan did went atau didn't bought.",
      tr: "Sinyal Past Simple soru/olumsuza benziyor: did/didn't + base verb, did went ya da didn't bought değil.",
      pl: "Sygnał wygląda na pytanie/przeczenie w Past Simple: did/didn't + base verb, nie did went ani didn't bought.",
    },
  },
  verb_present_perfect_basic: {
    label: {
      ru: 'Present Perfect',
      uk: 'Present Perfect',
      es: 'Present Perfect',
      'pt-BR': "Present Perfect",
      vi: "Present Perfect",
      id: "Present Perfect",
      tr: "Present Perfect",
      pl: "Present Perfect",
    },
    coachLine: {
      ru: 'Signal looks like Present Perfect: have/has + V3, already/yet, ever/never, result now, or a contrast with Past Simple time markers.',
      uk: 'Signal looks like Present Perfect: have/has + V3, already/yet, ever/never, result now, or a contrast with Past Simple time markers.',
      es: 'La senal apunta a Present Perfect: have/has + V3, already/yet, ever/never o contraste con Past Simple.',
      'pt-BR': "O sinal aponta para Present Perfect: have/has + V3, already/yet, ever/never, resultado agora ou contraste com Past Simple.",
      vi: "Tín hiệu giống Present Perfect: have/has + V3, already/yet, ever/never, kết quả hiện tại hoặc tương phản với Past Simple.",
      id: "Sinyalnya mengarah ke Present Perfect: have/has + V3, already/yet, ever/never, hasil sekarang, atau kontras dengan Past Simple.",
      tr: "Sinyal Present Perfect yapısına benziyor: have/has + V3, already/yet, ever/never, şimdi sonuç ya da Past Simple karşıtlığı.",
      pl: "Sygnał wygląda na Present Perfect: have/has + V3, already/yet, ever/never, rezultat teraz albo kontrast z Past Simple.",
    },
  },
  present_perfect_vs_past_simple: {
    label: {
      ru: 'Present Perfect vs Past Simple',
      uk: 'Present Perfect vs Past Simple',
      es: 'Present Perfect vs Past Simple',
      'pt-BR': "Present Perfect vs Past Simple",
      vi: "Present Perfect vs Past Simple",
      id: "Present Perfect vs Past Simple",
      tr: "Present Perfect vs Past Simple",
      pl: "Present Perfect vs Past Simple",
    },
    coachLine: {
      ru: 'Signal looks like a Present Perfect vs Past Simple contrast: result/experience now versus finished past time such as yesterday, last week, in 2020, or ago.',
      uk: 'Signal looks like a Present Perfect vs Past Simple contrast: result/experience now versus finished past time such as yesterday, last week, in 2020, or ago.',
      es: 'La senal apunta a contraste Present Perfect vs Past Simple: resultado/experiencia ahora frente a tiempo pasado terminado.',
      'pt-BR': "O sinal aponta para contraste Present Perfect vs Past Simple: resultado/experiência agora contra tempo passado terminado.",
      vi: "Tín hiệu giống tương phản Present Perfect vs Past Simple: kết quả/kinh nghiệm hiện tại so với thời điểm quá khứ đã kết thúc.",
      id: "Sinyalnya mengarah ke kontras Present Perfect vs Past Simple: hasil/pengalaman sekarang dibanding waktu lampau yang selesai.",
      tr: "Sinyal Present Perfect vs Past Simple karşıtlığına benziyor: şimdi sonuç/deneyim ile bitmiş geçmiş zaman.",
      pl: "Sygnał wygląda na kontrast Present Perfect vs Past Simple: rezultat/doświadczenie teraz kontra zakończony czas przeszły.",
    },
  },
  present_perfect_questions_negatives: {
    label: {
      ru: 'Present Perfect: вопросы и отрицания',
      uk: 'Present Perfect: питання і заперечення',
      es: 'Present Perfect questions/negatives',
      'pt-BR': "Present Perfect: perguntas/negativas",
      vi: "Present Perfect: câu hỏi/phủ định",
      id: "Present Perfect: pertanyaan/negatif",
      tr: "Present Perfect: soru/olumsuz",
      pl: "Present Perfect: pytania/przeczenia",
    },
    coachLine: {
      ru: "Signal looks like Present Perfect question/negative structure: Have/Has + subject + V3, or haven't/hasn't + V3.",
      uk: "Signal looks like Present Perfect question/negative structure: Have/Has + subject + V3, or haven't/hasn't + V3.",
      es: "La senal apunta a preguntas/negaciones de Present Perfect: Have/Has + subject + V3 o haven't/hasn't + V3.",
      'pt-BR': "O sinal aponta para perguntas/negativas de Present Perfect: Have/Has + subject + V3 ou haven't/hasn't + V3.",
      vi: "Tín hiệu giống câu hỏi/phủ định Present Perfect: Have/Has + subject + V3 hoặc haven't/hasn't + V3.",
      id: "Sinyalnya mengarah ke pertanyaan/negatif Present Perfect: Have/Has + subject + V3 atau haven't/hasn't + V3.",
      tr: "Sinyal Present Perfect soru/olumsuza benziyor: Have/Has + subject + V3 ya da haven't/hasn't + V3.",
      pl: "Sygnał wygląda na pytania/przeczenia w Present Perfect: Have/Has + subject + V3 albo haven't/hasn't + V3.",
    },
  },
  present_perfect_for_since: {
    label: {
      ru: 'Present Perfect: For / Since',
      uk: 'Present Perfect: For / Since',
      es: 'Present Perfect: for/since',
      'pt-BR': "Present Perfect: for/since",
      vi: "Present Perfect: for/since",
      id: "Present Perfect: for/since",
      tr: "Present Perfect: for/since",
      pl: "Present Perfect: for/since",
    },
    coachLine: {
      ru: 'Signal looks like Present Perfect with for/since: for + duration, since + starting point, or a continuing situation from past to now.',
      uk: 'Signal looks like Present Perfect with for/since: for + duration, since + starting point, or a continuing situation from past to now.',
      es: 'La senal apunta a Present Perfect con for/since: duracion frente a punto inicial.',
      'pt-BR': "O sinal aponta para Present Perfect com for/since: duração contra ponto inicial.",
      vi: "Tín hiệu giống Present Perfect với for/since: thời lượng so với điểm bắt đầu.",
      id: "Sinyalnya mengarah ke Present Perfect dengan for/since: durasi dibanding titik awal.",
      tr: "Sinyal for/since ile Present Perfect yapısına benziyor: süre ile başlangıç noktası.",
      pl: "Sygnał wygląda na Present Perfect z for/since: trwanie kontra punkt początkowy.",
    },
  },
  past_continuous_basic: {
    label: {
      ru: 'Past Continuous',
      uk: 'Past Continuous',
      es: 'Past Continuous',
      'pt-BR': "Past Continuous",
      vi: "Past Continuous",
      id: "Past Continuous",
      tr: "Past Continuous",
      pl: "Past Continuous",
    },
    coachLine: {
      ru: 'Signal looks like Past Continuous: was/were + verb-ing for an action in progress at a past moment.',
      uk: 'Signal looks like Past Continuous: was/were + verb-ing for an action in progress at a past moment.',
      es: 'La senal apunta a Past Continuous: was/were + verb-ing para una accion en proceso en el pasado.',
      'pt-BR': "O sinal aponta para Past Continuous: was/were + verb-ing para uma ação em processo no passado.",
      vi: "Tín hiệu giống Past Continuous: was/were + verb-ing cho hành động đang diễn ra trong quá khứ.",
      id: "Sinyalnya mengarah ke Past Continuous: was/were + verb-ing untuk aksi yang sedang berlangsung di masa lalu.",
      tr: "Sinyal Past Continuous yapısına benziyor: geçmişte sürmekte olan eylem için was/were + verb-ing.",
      pl: "Sygnał wygląda na Past Continuous: was/were + verb-ing dla czynności trwającej w przeszłości.",
    },
  },
  past_simple_vs_past_continuous: {
    label: {
      ru: 'Past Simple vs Past Continuous',
      uk: 'Past Simple vs Past Continuous',
      es: 'Past Simple vs Past Continuous',
      'pt-BR': "Past Simple vs Past Continuous",
      vi: "Past Simple vs Past Continuous",
      id: "Past Simple vs Past Continuous",
      tr: "Past Simple vs Past Continuous",
      pl: "Past Simple vs Past Continuous",
    },
    coachLine: {
      ru: 'Signal looks like a Past Simple vs Past Continuous contrast: finished event or sequence versus background process.',
      uk: 'Signal looks like a Past Simple vs Past Continuous contrast: finished event or sequence versus background process.',
      es: 'La senal apunta a contraste entre Past Simple y Past Continuous: evento terminado frente a proceso de fondo.',
      'pt-BR': "O sinal aponta para contraste entre Past Simple e Past Continuous: evento terminado contra processo de fundo.",
      vi: "Tín hiệu giống tương phản Past Simple và Past Continuous: sự kiện đã xong so với quá trình nền.",
      id: "Sinyalnya mengarah ke kontras Past Simple dan Past Continuous: peristiwa selesai dibanding proses latar.",
      tr: "Sinyal Past Simple ile Past Continuous karşıtlığına benziyor: bitmiş olay ile arka plan süreci.",
      pl: "Sygnał wygląda na kontrast Past Simple i Past Continuous: zakończone wydarzenie kontra proces w tle.",
    },
  },
  used_to_basic: {
    label: {
      ru: 'Used to',
      uk: 'Used to',
      es: 'Used to',
      'pt-BR': "Used to",
      vi: "Used to",
      id: "Used to",
      tr: "Used to",
      pl: "Used to",
    },
    coachLine: {
      ru: 'Signal looks like used to: a past habit/state no longer true, did not use to, did you use to, or be used to confusion.',
      uk: 'Signal looks like used to: a past habit/state no longer true, did not use to, did you use to, or be used to confusion.',
      es: 'La senal apunta a used to: habito/estado pasado que ya no es verdad, o confusion con be used to.',
      'pt-BR': "O sinal aponta para used to: hábito/estado passado que já não é verdadeiro, ou confusão com be used to.",
      vi: "Tín hiệu giống used to: thói quen/trạng thái trong quá khứ không còn đúng, hoặc nhầm với be used to.",
      id: "Sinyalnya mengarah ke used to: kebiasaan/keadaan masa lalu yang tidak berlaku lagi, atau tertukar dengan be used to.",
      tr: "Sinyal used to yapısına benziyor: artık doğru olmayan geçmiş alışkanlık/durum ya da be used to ile karışma.",
      pl: "Sygnał wygląda na used to: dawny nawyk/stan, który już nie jest prawdziwy, albo pomyłka z be used to.",
    },
  },
  future_present_continuous_arrangements: {
    label: {
      ru: 'Present Continuous for Future',
      uk: 'Present Continuous for Future',
      es: 'Present Continuous for Future',
      'pt-BR': "Present Continuous para futuro",
      vi: "Present Continuous cho tương lai",
      id: "Present Continuous untuk masa depan",
      tr: "gelecek için Present Continuous",
      pl: "Present Continuous dla przyszłości",
    },
    coachLine: {
      ru: 'Signal looks like Present Continuous for a future arrangement: am/is/are + -ing with tomorrow, tonight, next week, or another future marker.',
      uk: 'Signal looks like Present Continuous for a future arrangement: am/is/are + -ing with tomorrow, tonight, next week, or another future marker.',
      es: 'La senal apunta a Present Continuous para planes futuros: am/is/are + -ing con marcador futuro.',
      'pt-BR': "O sinal aponta para Present Continuous em planos futuros: am/is/are + -ing com marcador de futuro.",
      vi: "Tín hiệu giống Present Continuous cho kế hoạch tương lai: am/is/are + -ing với dấu hiệu tương lai.",
      id: "Sinyalnya mengarah ke Present Continuous untuk rencana masa depan: am/is/are + -ing dengan penanda masa depan.",
      tr: "Sinyal gelecek planları için Present Continuous yapısına benziyor: gelecek belirteciyle am/is/are + -ing.",
      pl: "Sygnał wygląda na Present Continuous dla planów przyszłych: am/is/are + -ing ze znacznikiem przyszłości.",
    },
  },
  verb_was_were: {
    label: {
      ru: 'Was / Were',
      uk: 'Was / Were',
      es: 'Was / Were',
      'pt-BR': "Was / Were",
      vi: "Was / Were",
      id: "Was / Were",
      tr: "Was / Were",
      pl: "Was / Were",
    },
    coachLine: {
      ru: 'Signal looks like past be: was/were agreement, past markers with is/are, negatives, or question order.',
      uk: 'Signal looks like past be: was/were agreement, past markers with is/are, negatives, or question order.',
      es: 'La senal apunta a past be: concordancia was/were, marcadores pasados con is/are, negacion u orden de pregunta.',
      'pt-BR': "O sinal aponta para past be: concordância was/were, marcadores de passado com is/are, negativa ou ordem de pergunta.",
      vi: "Tín hiệu giống past be: hòa hợp was/were, dấu hiệu quá khứ với is/are, phủ định hoặc trật tự câu hỏi.",
      id: "Sinyalnya mengarah ke past be: kesesuaian was/were, penanda lampau dengan is/are, negatif, atau urutan pertanyaan.",
      tr: "Sinyal past be yapısına benziyor: was/were uyumu, is/are ile geçmiş belirteçleri, olumsuzluk ya da soru sırası.",
      pl: "Sygnał wygląda na past be: zgodność was/were, znaczniki przeszłości z is/are, przeczenie albo szyk pytania.",
    },
  },
  future_will_going_to: {
    label: {
      ru: 'Will / Going to',
      uk: 'Will / Going to',
      es: 'Will / Going to',
      'pt-BR': "Will / Going to",
      vi: "Will / Going to",
      id: "Will / Going to",
      tr: "Will / Going to",
      pl: "Will / Going to",
    },
    coachLine: {
      ru: 'Signal looks like future will/going to: instant decision, promise, prediction, plan, evidence, or a structure error like will to / missing be.',
      uk: 'Signal looks like future will/going to: instant decision, promise, prediction, plan, evidence, or a structure error like will to / missing be.',
      es: 'La senal apunta a futuro will/going to: decision, promesa, prediccion, plan, evidencia o error de estructura.',
      'pt-BR': "O sinal aponta para futuro will/going to: decisão, promessa, previsão, plano, evidência ou erro de estrutura.",
      vi: "Tín hiệu giống tương lai will/going to: quyết định, lời hứa, dự đoán, kế hoạch, bằng chứng hoặc lỗi cấu trúc.",
      id: "Sinyalnya mengarah ke future will/going to: keputusan, janji, prediksi, rencana, bukti, atau kesalahan struktur.",
      tr: "Sinyal future will/going to yapısına benziyor: karar, söz, tahmin, plan, kanıt ya da yapı hatası.",
      pl: "Sygnał wygląda na future will/going to: decyzja, obietnica, przewidywanie, plan, dowód albo błąd struktury.",
    },
  },
  infinitive_vs_gerund_basic: {
    label: {
      ru: 'Infinitive vs Gerund',
      uk: 'Infinitive vs Gerund',
      es: 'Infinitive vs Gerund',
      'pt-BR': "Infinitive vs Gerund",
      vi: "Infinitive vs Gerund",
      id: "Infinitive vs Gerund",
      tr: "Infinitive vs Gerund",
      pl: "Infinitive vs Gerund",
    },
    coachLine: {
      ru: 'Signal looks like verb pattern choice: want/need/decide/plan + to do, but enjoy/finish/avoid/mind + doing.',
      uk: 'Signal looks like verb pattern choice: want/need/decide/plan + to do, but enjoy/finish/avoid/mind + doing.',
      es: 'La senal apunta a elegir patron verbal: to do o doing.',
      'pt-BR': "O sinal aponta para escolher o padrão verbal: to do ou doing.",
      vi: "Tín hiệu giống việc chọn mẫu động từ: to do hay doing.",
      id: "Sinyalnya mengarah ke pemilihan pola kata kerja: to do atau doing.",
      tr: "Sinyal fiil kalıbı seçimine benziyor: to do mu doing mi.",
      pl: "Sygnał wygląda na wybór wzorca czasownika: to do albo doing.",
    },
  },
  too_enough: {
    label: {
      ru: 'Too / Enough',
      uk: 'Too / Enough',
      es: 'Too / Enough',
      'pt-BR': "Too / Enough",
      vi: "Too / Enough",
      id: "Too / Enough",
      tr: "Too / Enough",
      pl: "Too / Enough",
    },
    coachLine: {
      ru: 'Signal looks like too/enough: too before adjective/adverb, enough after adjective/adverb, enough before noun, plus too much/too many.',
      uk: 'Signal looks like too/enough: too before adjective/adverb, enough after adjective/adverb, enough before noun, plus too much/too many.',
      es: 'La senal apunta a too/enough: posicion, significado y too much/too many.',
      'pt-BR': "O sinal aponta para too/enough: posição, significado e too much/too many.",
      vi: "Tín hiệu giống too/enough: vị trí, nghĩa và too much/too many.",
      id: "Sinyalnya mengarah ke too/enough: posisi, makna, dan too much/too many.",
      tr: "Sinyal too/enough yapısına benziyor: konum, anlam ve too much/too many.",
      pl: "Sygnał wygląda na too/enough: pozycja, znaczenie i too much/too many.",
    },
  },
  modifier_very_really_quite: {
    label: {
      ru: 'Very / Really / Quite',
      uk: 'Very / Really / Quite',
      es: 'Very / Really / Quite',
      'pt-BR': "Very / Really / Quite",
      vi: "Very / Really / Quite",
      id: "Very / Really / Quite",
      tr: "Very / Really / Quite",
      pl: "Very / Really / Quite",
    },
    coachLine: {
      ru: 'Signal looks like degree modifiers: very for neutral strength, really for emotional strength, quite for softer/moderate strength, and too for a problem.',
      uk: 'Signal looks like degree modifiers: very for neutral strength, really for emotional strength, quite for softer/moderate strength, and too for a problem.',
      es: 'La senal apunta a modificadores de grado: very, really, quite o too.',
      'pt-BR': "O sinal aponta para modificadores de grau: very, really, quite ou too.",
      vi: "Tín hiệu giống trạng từ chỉ mức độ: very, really, quite hoặc too.",
      id: "Sinyalnya mengarah ke modifier derajat: very, really, quite, atau too.",
      tr: "Sinyal derece belirteçlerine benziyor: very, really, quite ya da too.",
      pl: "Sygnał wygląda na modyfikatory stopnia: very, really, quite albo too.",
    },
  },
  verb_present_simple_statement: {
    label: {
      ru: 'Present Simple: утверждения',
      uk: 'Present Simple: ствердження',
      es: 'Present Simple: afirmaciones',
      'pt-BR': "Present Simple: afirmações",
      vi: "Present Simple: câu khẳng định",
      id: "Present Simple: pernyataan",
      tr: "Present Simple: düz cümleler",
      pl: "Present Simple: zdania twierdzące",
    },
    coachLine: {
      ru: 'Сигнал похож на Present Simple statement: привычка, факт, расписание, base verb или he/she/it + -s.',
      uk: 'Сигнал схожий на Present Simple statement: звичка, факт, розклад, base verb або he/she/it + -s.',
      es: 'La señal apunta a Present Simple statement: hábito, hecho, horario, base verb o he/she/it + -s.',
      'pt-BR': "O sinal aponta para Present Simple statement: hábito, fato, horário, base verb ou he/she/it + -s.",
      vi: "Tín hiệu giống Present Simple statement: thói quen, sự thật, lịch trình, base verb hoặc he/she/it + -s.",
      id: "Sinyalnya mengarah ke Present Simple statement: kebiasaan, fakta, jadwal, base verb, atau he/she/it + -s.",
      tr: "Sinyal Present Simple statement yapısına benziyor: alışkanlık, gerçek, program, base verb ya da he/she/it + -s.",
      pl: "Sygnał wygląda na Present Simple statement: nawyk, fakt, rozkład, base verb albo he/she/it + -s.",
    },
  },
  verb_tense: {
    label: {
      ru: 'форма и время глагола',
      uk: 'форма й час дієслова',
      es: 'forma y tiempo verbal',
      'pt-BR': "forma e tempo verbal",
      vi: "dạng và thì của động từ",
      id: "bentuk dan tense kata kerja",
      tr: "fiil biçimi ve zaman",
      pl: "forma i czas czasownika",
    },
    coachLine: {
      ru: 'Паттерн похож на смешение времени или формы глагола.',
      uk: 'Патерн схожий на змішування часу або форми дієслова.',
      es: 'El patrón parece mezcla de tiempo o forma verbal.',
      'pt-BR': "O padrão parece mistura de tempo ou forma verbal.",
      vi: "Mẫu lỗi có vẻ là nhầm thì hoặc dạng động từ.",
      id: "Polanya tampak seperti campuran tense atau bentuk kata kerja.",
      tr: "Kalıp fiil zamanı ya da fiil biçimi karışmasına benziyor.",
      pl: "Wzorzec wygląda na mieszanie czasu lub formy czasownika.",
    },
  },
  verb_after_modal: {
    label: {
      ru: 'глагол после modal',
      uk: 'дієслово після modal',
      es: 'verbo después de modal',
      'pt-BR': "verbo depois de modal",
      vi: "động từ sau modal",
      id: "kata kerja setelah modal",
      tr: "modal sonrası fiil",
      pl: "czasownik po modal",
    },
    coachLine: {
      ru: 'После can/must/should нужен базовый глагол: без to и без -s.',
      uk: 'Після can/must/should потрібна базова форма: без to і без -s.',
      es: 'Después de can/must/should va la forma base: sin to y sin -s.',
      'pt-BR': "Depois de can/must/should vem a forma base: sem to e sem -s.",
      vi: "Sau can/must/should dùng dạng gốc: không to và không -s.",
      id: "Setelah can/must/should memakai bentuk dasar: tanpa to dan tanpa -s.",
      tr: "can/must/should sonrasında yalın biçim gelir: to yok, -s yok.",
      pl: "Po can/must/should idzie forma bazowa: bez to i bez -s.",
    },
  },
  to_be_agreement: {
    label: {
      ru: 'am/is/are и лицо',
      uk: 'am/is/are та особа',
      es: 'am/is/are y persona',
      'pt-BR': "am/is/are e pessoa",
      vi: "am/is/are và ngôi",
      id: "am/is/are dan orang",
      tr: "am/is/are ve kişi",
      pl: "am/is/are i osoba",
    },
    coachLine: {
      ru: 'Сигнал указывает на согласование to be с подлежащим и временем.',
      uk: 'Сигнал вказує на узгодження to be з підметом і часом.',
      es: 'La señal apunta a concordancia de to be con sujeto y tiempo.',
      'pt-BR': "O sinal aponta para a concordância de to be com sujeito e tempo.",
      vi: "Tín hiệu giống sự hòa hợp của to be với chủ ngữ và thì.",
      id: "Sinyalnya mengarah ke kesesuaian to be dengan subjek dan tense.",
      tr: "Sinyal to be fiilinin özne ve zamanla uyumuna benziyor.",
      pl: "Sygnał wskazuje na zgodność to be z podmiotem i czasem.",
    },
  },
  to_be_present_agreement: {
    label: {
      ru: 'am/is/are в настоящем',
      uk: 'am/is/are у теперішньому',
      es: 'am/is/are en presente',
      'pt-BR': "am/is/are no presente",
      vi: "am/is/are ở hiện tại",
      id: "am/is/are dalam present",
      tr: "şimdiki zamanda am/is/are",
      pl: "am/is/are w czasie teraźniejszym",
    },
    coachLine: {
      ru: 'Похоже, путается форма be в настоящем: I am, he/she/it is, you/we/they are.',
      uk: 'Схоже, плутається форма be у теперішньому: I am, he/she/it is, you/we/they are.',
      es: 'Parece que se mezcla be en presente: I am, he/she/it is, you/we/they are.',
      'pt-BR': "Parece que be no presente se mistura: I am, he/she/it is, you/we/they are.",
      vi: "Có vẻ be ở hiện tại bị nhầm: I am, he/she/it is, you/we/they are.",
      id: "Sepertinya be dalam present tercampur: I am, he/she/it is, you/we/they are.",
      tr: "Şimdiki zamanda be karışıyor gibi: I am, he/she/it is, you/we/they are.",
      pl: "Wygląda na mylenie be w teraźniejszości: I am, he/she/it is, you/we/they are.",
    },
  },
  there_is_are: {
    label: {
      ru: 'There is / There are',
      uk: 'There is / There are',
      es: 'There is / There are',
      'pt-BR': "There is / There are",
      vi: "There is / There are",
      id: "There is / There are",
      tr: "There is / There are",
      pl: "There is / There are",
    },
    coachLine: {
      ru: 'Pohzhe, problema v there is / there are: odin/uncountable ili plural, existence a ne possession.',
      uk: 'Skhozhe, problema v there is / there are: odyn/uncountable chy plural, existence a ne possession.',
      es: 'Parece un problema de there is / there are: uno/uncountable o plural, existencia y no posesion.',
      'pt-BR': "Parece um problema de there is / there are: singular/uncountable ou plural, existência e não posse.",
      vi: "Có vẻ là vấn đề there is / there are: một/không đếm được hoặc số nhiều, diễn tả sự tồn tại chứ không phải sở hữu.",
      id: "Sepertinya masalah there is / there are: satu/uncountable atau plural, keberadaan dan bukan kepemilikan.",
      tr: "There is / there are sorunu gibi: tekil/sayılamayan ya da çoğul, varlık bildirir; sahiplik değil.",
      pl: "Wygląda na problem z there is / there are: liczba pojedyncza/niepoliczalne albo mnoga, istnienie, nie posiadanie.",
    },
  },
  modal_should_must_have_to: {
    label: {
      ru: 'Should / Must / Have to',
      uk: 'Should / Must / Have to',
      es: 'Should / Must / Have to',
      'pt-BR': "Should / Must / Have to",
      vi: "Should / Must / Have to",
      id: "Should / Must / Have to",
      tr: "Should / Must / Have to",
      pl: "Should / Must / Have to",
    },
    coachLine: {
      ru: 'Signal looks like should/must/have to: advice, strong obligation, external necessity, prohibition, or no obligation.',
      uk: 'Signal looks like should/must/have to: advice, strong obligation, external necessity, prohibition, or no obligation.',
      es: 'La senal apunta a should/must/have to: consejo, obligacion, necesidad externa, prohibicion o ausencia de obligacion.',
      'pt-BR': "O sinal aponta para should/must/have to: conselho, obrigação, necessidade externa, proibição ou ausência de obrigação.",
      vi: "Tín hiệu giống should/must/have to: lời khuyên, nghĩa vụ, nhu cầu bên ngoài, cấm đoán hoặc không bắt buộc.",
      id: "Sinyalnya mengarah ke should/must/have to: saran, kewajiban, kebutuhan eksternal, larangan, atau tidak adanya kewajiban.",
      tr: "Sinyal should/must/have to yapısına benziyor: tavsiye, zorunluluk, dış gereklilik, yasak ya da zorunluluk yokluğu.",
      pl: "Sygnał wygląda na should/must/have to: rada, obowiązek, zewnętrzna konieczność, zakaz albo brak obowiązku.",
    },
  },
  modal_can_could_ability_request: {
    label: {
      ru: 'Can / Could',
      uk: 'Can / Could',
      es: 'Can / Could',
      'pt-BR': "Can / Could",
      vi: "Can / Could",
      id: "Can / Could",
      tr: "Can / Could",
      pl: "Can / Could",
    },
    coachLine: {
      ru: 'Signal looks like can/could: ability now, ability in the past, negative ability, permission, or request politeness.',
      uk: 'Signal looks like can/could: ability now, ability in the past, negative ability, permission, or request politeness.',
      es: 'La senal apunta a can/could: habilidad presente, habilidad pasada, permiso o peticion cortes.',
      'pt-BR': "O sinal aponta para can/could: habilidade presente, habilidade passada, permissão ou pedido educado.",
      vi: "Tín hiệu giống can/could: khả năng hiện tại, khả năng quá khứ, sự cho phép hoặc lời yêu cầu lịch sự.",
      id: "Sinyalnya mengarah ke can/could: kemampuan sekarang, kemampuan masa lalu, izin, atau permintaan sopan.",
      tr: "Sinyal can/could yapısına benziyor: şimdiki yetenek, geçmiş yetenek, izin ya da kibar rica.",
      pl: "Sygnał wygląda na can/could: obecna umiejętność, dawna umiejętność, pozwolenie albo uprzejma prośba.",
    },
  },
  modal_may_might_probability: {
    label: {
      ru: 'May / Might',
      uk: 'May / Might',
      es: 'May / Might',
      'pt-BR': "May / Might",
      vi: "May / Might",
      id: "May / Might",
      tr: "May / Might",
      pl: "May / Might",
    },
    coachLine: {
      ru: 'Signal looks like may/might probability: possibility, uncertainty, may not/might not, or confusion with can/will.',
      uk: 'Signal looks like may/might probability: possibility, uncertainty, may not/might not, or confusion with can/will.',
      es: 'La senal apunta a probabilidad con may/might: posibilidad, incertidumbre o confusion con can/will.',
      'pt-BR': "O sinal aponta para probabilidade com may/might: possibilidade, incerteza ou confusão com can/will.",
      vi: "Tín hiệu giống xác suất với may/might: khả năng, sự không chắc chắn hoặc nhầm với can/will.",
      id: "Sinyalnya mengarah ke probabilitas dengan may/might: kemungkinan, ketidakpastian, atau tertukar dengan can/will.",
      tr: "Sinyal may/might ile olasılığa benziyor: ihtimal, belirsizlik ya da can/will ile karışma.",
      pl: "Sygnał wygląda na prawdopodobieństwo z may/might: możliwość, niepewność albo pomyłka z can/will.",
    },
  },
  modal_base_form: {
    label: {
      ru: 'base form после modal',
      uk: 'base form після modal',
      es: 'base form tras modal',
      'pt-BR': "base form depois de modal",
      vi: "base form sau modal",
      id: "base form setelah modal",
      tr: "modal sonrası base form",
      pl: "base form po modal",
    },
    coachLine: {
      ru: 'Модалка уже несёт грамматику: следующий глагол остаётся в базовой форме.',
      uk: 'Модальне слово вже несе граматику: наступне дієслово лишається в базовій формі.',
      es: 'El modal ya lleva la gramática: el verbo siguiente queda en forma base.',
      'pt-BR': "O modal já carrega a gramática: o verbo seguinte fica na forma base.",
      vi: "Modal đã mang ngữ pháp: động từ sau nó ở base form.",
      id: "Modal sudah membawa tata bahasa: kata kerja berikutnya tetap base form.",
      tr: "Modal zaten grameri taşır: sonraki fiil base form kalır.",
      pl: "Modal niesie już gramatykę: następny czasownik zostaje w base form.",
    },
  },
  modal_force: {
    label: {
      ru: 'сила modal: can/must/should',
      uk: 'сила modal: can/must/should',
      es: 'fuerza modal: can/must/should',
      'pt-BR': "força modal: can/must/should",
      vi: "lực modal: can/must/should",
      id: "kekuatan modal: can/must/should",
      tr: "modal gücü: can/must/should",
      pl: "siła modal: can/must/should",
    },
    coachLine: {
      ru: 'Похоже, путается не действие, а степень: можно, нужно, стоит или запрещено.',
      uk: 'Схоже, плутається не дія, а ступінь: можна, треба, варто або заборонено.',
      es: 'Parece que falla la fuerza: posibilidad, obligación, consejo o prohibición.',
      'pt-BR': "Parece que a força falha: possibilidade, obrigação, conselho ou proibição.",
      vi: "Có vẻ đang sai lực nghĩa: khả năng, nghĩa vụ, lời khuyên hoặc cấm đoán.",
      id: "Sepertinya kekuatannya keliru: kemungkinan, kewajiban, saran, atau larangan.",
      tr: "Anlam gücü aksıyor gibi: olasılık, zorunluluk, tavsiye ya da yasak.",
      pl: "Wygląda na błąd siły znaczenia: możliwość, obowiązek, rada albo zakaz.",
    },
  },
  pronoun_case: {
    label: {
      ru: 'местоимение: кто / кому',
      uk: 'займенник: хто / кому',
      es: 'pronombre: sujeto / objeto',
      'pt-BR': "pronome: sujeito / objeto",
      vi: "đại từ: chủ ngữ / tân ngữ",
      id: "pronomina: subjek / objek",
      tr: "zamir: özne / nesne",
      pl: "zaimek: podmiot / dopełnienie",
    },
    coachLine: {
      ru: 'Паттерн похож на путаницу I/me, he/him, they/them.',
      uk: 'Патерн схожий на плутанину I/me, he/him, they/them.',
      es: 'El patrón apunta a I/me, he/him, they/them.',
      'pt-BR': "O padrão aponta para I/me, he/him, they/them.",
      vi: "Mẫu lỗi hướng tới I/me, he/him, they/them.",
      id: "Polanya mengarah ke I/me, he/him, they/them.",
      tr: "Kalıp I/me, he/him, they/them ayrımına işaret ediyor.",
      pl: "Wzorzec wskazuje na I/me, he/him, they/them.",
    },
  },
  pronoun_possessive: {
    label: {
      ru: 'притяжательные: my/mine',
      uk: 'присвійні: my/mine',
      es: 'posesivos: my/mine',
      'pt-BR': "possessivos: my/mine",
      vi: "sở hữu: my/mine",
      id: "posesif: my/mine",
      tr: "iyelik: my/mine",
      pl: "dzierżawcze: my/mine",
    },
    coachLine: {
      ru: 'Сигнал указывает на принадлежность: my перед noun, mine без noun.',
      uk: 'Сигнал вказує на належність: my перед noun, mine без noun.',
      es: 'La señal apunta a posesivos: my antes de noun, mine sin noun.',
      'pt-BR': "O sinal aponta para possessivos: my antes de noun, mine sem noun.",
      vi: "Tín hiệu giống sở hữu: my đứng trước noun, mine không có noun.",
      id: "Sinyalnya mengarah ke posesif: my sebelum noun, mine tanpa noun.",
      tr: "Sinyal iyelik yapısına benziyor: noun öncesinde my, noun olmadan mine.",
      pl: "Sygnał wygląda na formy dzierżawcze: my przed noun, mine bez noun.",
    },
  },
  adjective_comparison: {
    label: {
      ru: 'сравнение: -er / more / than',
      uk: 'порівняння: -er / more / than',
      es: 'comparación: -er / more / than',
      'pt-BR': "comparação: -er / more / than",
      vi: "so sánh: -er / more / than",
      id: "perbandingan: -er / more / than",
      tr: "karşılaştırma: -er / more / than",
      pl: "porównanie: -er / more / than",
    },
    coachLine: {
      ru: 'Это похоже на ошибку в сравнительной или превосходной форме.',
      uk: 'Це схоже на помилку у вищому або найвищому ступені.',
      es: 'Parece un error de comparativo o superlativo.',
      'pt-BR': "Parece um erro de comparativo ou superlativo.",
      vi: "Có vẻ là lỗi so sánh hơn hoặc so sánh nhất.",
      id: "Sepertinya kesalahan comparative atau superlative.",
      tr: "Comparative ya da superlative hatası gibi.",
      pl: "Wygląda na błąd stopnia wyższego albo najwyższego.",
    },
  },
  adjective_vs_adverb: {
    label: {
      ru: 'adjective vs adverb',
      uk: 'adjective vs adverb',
      es: 'adjective vs adverb',
      'pt-BR': "adjective vs adverb",
      vi: "adjective vs adverb",
      id: "adjective vs adverb",
      tr: "adjective vs adverb",
      pl: "adjective vs adverb",
    },
    coachLine: {
      ru: 'Похоже, путается описание предмета и описание действия: quick или quickly.',
      uk: 'Схоже, плутається опис предмета й опис дії: quick або quickly.',
      es: 'Parece confusión entre describir cosa y acción: quick o quickly.',
      'pt-BR': "Parece confusão entre descrever uma coisa e descrever uma ação: quick ou quickly.",
      vi: "Có vẻ nhầm giữa mô tả sự vật và mô tả hành động: quick hay quickly.",
      id: "Sepertinya bingung antara menjelaskan benda dan tindakan: quick atau quickly.",
      tr: "Bir şeyi mi yoksa eylemi mi anlattığı karışıyor gibi: quick mı quickly mi.",
      pl: "Wygląda na mylenie opisu rzeczy i czynności: quick czy quickly.",
    },
  },
  adverb_frequency_position: {
    label: {
      ru: 'место наречия частоты',
      uk: 'місце прислівника частоти',
      es: 'posición del adverbio de frecuencia',
      'pt-BR': "posição do advérbio de frequência",
      vi: "vị trí trạng từ tần suất",
      id: "posisi adverbia frekuensi",
      tr: "sıklık zarfının yeri",
      pl: "miejsce przysłówka częstotliwości",
    },
    coachLine: {
      ru: 'Сигнал похож на always/often/usually: с обычным глаголом перед ним, с be после него.',
      uk: 'Сигнал схожий на always/often/usually: зі звичайним дієсловом перед ним, з be після нього.',
      es: 'La señal apunta a always/often/usually: antes del verbo normal, después de be.',
      'pt-BR': "O sinal aponta para always/often/usually: antes do verbo normal, depois de be.",
      vi: "Tín hiệu giống always/often/usually: trước động từ thường, sau be.",
      id: "Sinyalnya mengarah ke always/often/usually: sebelum kata kerja biasa, setelah be.",
      tr: "Sinyal always/often/usually konumuna benziyor: normal fiilden önce, be sonrasında.",
      pl: "Sygnał wygląda na always/often/usually: przed zwykłym czasownikiem, po be.",
    },
  },
  conjunction_logic: {
    label: {
      ru: 'логика связи: and/but/because/if',
      uk: 'логіка зв’язку: and/but/because/if',
      es: 'lógica: and/but/because/if',
      'pt-BR': "lógica: and/but/because/if",
      vi: "logic: and/but/because/if",
      id: "logika: and/but/because/if",
      tr: "mantık: and/but/because/if",
      pl: "logika: and/but/because/if",
    },
    coachLine: {
      ru: 'Похоже, проблема в связи идей: причина, контраст, условие или добавление.',
      uk: 'Схоже, проблема у зв’язку ідей: причина, контраст, умова або додавання.',
      es: 'Parece un problema de conexión: causa, contraste, condición o suma.',
      'pt-BR': "Parece um problema de conexão: causa, contraste, condição ou soma.",
      vi: "Có vẻ là vấn đề liên kết: nguyên nhân, tương phản, điều kiện hoặc cộng thêm.",
      id: "Sepertinya masalah koneksi: sebab, kontras, kondisi, atau penambahan.",
      tr: "Bağlantı sorunu gibi: neden, karşıtlık, koşul ya da ekleme.",
      pl: "Wygląda na problem z połączeniem: przyczyna, kontrast, warunek albo dodanie.",
    },
  },
  quantifier_some_any: {
    label: {
      ru: 'some / any / no',
      uk: 'some / any / no',
      es: 'some / any / no',
      'pt-BR': "some / any / no",
      vi: "some / any / no",
      id: "some / any / no",
      tr: "some / any / no",
      pl: "some / any / no",
    },
    coachLine: {
      ru: 'Pohоже, problema v some/any/no: pozitivnoe kolichestvo, otritsanie, obychnyi vopros, prosba ili predlozhenie.',
      uk: 'Skhozhe, problema v some/any/no: pozytyvna kilkist, zaperechennia, zvychaine pytannia, prokhannia abo propozytsiia.',
      es: 'Parece un problema de some/any/no: cantidad positiva, negacion, pregunta normal, peticion u oferta.',
      'pt-BR': "Parece um problema de some/any/no: quantidade positiva, negação, pergunta normal, pedido ou oferta.",
      vi: "Có vẻ là vấn đề some/any/no: lượng khẳng định, phủ định, câu hỏi thường, lời nhờ hoặc lời đề nghị.",
      id: "Sepertinya masalah some/any/no: jumlah positif, negatif, pertanyaan biasa, permintaan, atau tawaran.",
      tr: "Some/any/no sorunu gibi: olumlu miktar, olumsuzluk, normal soru, rica ya da teklif.",
      pl: "Wygląda na problem z some/any/no: ilość twierdząca, przeczenie, zwykłe pytanie, prośba albo oferta.",
    },
  },
  determiner_this_that_these_those: {
    label: {
      ru: 'this / that / these / those',
      uk: 'this / that / these / those',
      es: 'this / that / these / those',
      'pt-BR': "this / that / these / those",
      vi: "this / that / these / those",
      id: "this / that / these / those",
      tr: "this / that / these / those",
      pl: "this / that / these / those",
    },
    coachLine: {
      ru: 'Pohzhe, problema v this/that/these/those: odin ili mnogo, blizko ili daleko.',
      uk: 'Skhozhe, problema v this/that/these/those: odyn chy bahato, blyzko chy daleko.',
      es: 'Parece un problema de this/that/these/those: uno o varios, cerca o lejos.',
      'pt-BR': "Parece um problema de this/that/these/those: um ou vários, perto ou longe.",
      vi: "Có vẻ là vấn đề this/that/these/those: một hay nhiều, gần hay xa.",
      id: "Sepertinya masalah this/that/these/those: satu atau banyak, dekat atau jauh.",
      tr: "This/that/these/those sorunu gibi: tek mi çok mu, yakın mı uzak mı.",
      pl: "Wygląda na problem z this/that/these/those: jedno czy wiele, blisko czy daleko.",
    },
  },
  phrasal_particle_pair: {
    label: {
      ru: 'phrasal verb: глагол + частица',
      uk: 'phrasal verb: дієслово + частка',
      es: 'phrasal verb: verbo + partícula',
      'pt-BR': "phrasal verb: verbo + partícula",
      vi: "phrasal verb: động từ + particle",
      id: "phrasal verb: kata kerja + partikel",
      tr: "phrasal verb: fiil + parçacık",
      pl: "phrasal verb: czasownik + partykuła",
    },
    coachLine: {
      ru: 'Сигнал в паре целиком: частица меняет смысл глагола.',
      uk: 'Сигнал у парі цілком: частка змінює сенс дієслова.',
      es: 'La señal está en la pareja completa: la partícula cambia el verbo.',
      'pt-BR': "O sinal está no par completo: a partícula muda o verbo.",
      vi: "Tín hiệu nằm ở cả cặp: particle làm đổi nghĩa động từ.",
      id: "Sinyalnya ada pada pasangan lengkap: partikel mengubah kata kerja.",
      tr: "Sinyal bütün ikilide: parçacık fiilin anlamını değiştirir.",
      pl: "Sygnał jest w całej parze: partykuła zmienia czasownik.",
    },
  },
  noun_singular_plural_basic: {
    label: {
      ru: 'Singular / Plural Nouns',
      uk: 'Singular / Plural Nouns',
      es: 'Singular / Plural Nouns',
      'pt-BR': "Singular / Plural Nouns",
      vi: "Singular / Plural Nouns",
      id: "Singular / Plural Nouns",
      tr: "Singular / Plural Nouns",
      pl: "Singular / Plural Nouns",
    },
    coachLine: {
      ru: 'Pohzhe, problema v noun number: a book, two books, these lessons, irregular plural ili uncountable.',
      uk: 'Skhozhe, problema v noun number: a book, two books, these lessons, irregular plural abo uncountable.',
      es: 'Parece un problema de noun number: a book, two books, these lessons, irregular plural o uncountable.',
      'pt-BR': "Parece um problema de noun number: a book, two books, these lessons, irregular plural ou uncountable.",
      vi: "Có vẻ là vấn đề noun number: a book, two books, these lessons, irregular plural hoặc uncountable.",
      id: "Sepertinya masalah noun number: a book, two books, these lessons, irregular plural, atau uncountable.",
      tr: "Noun number sorunu gibi: a book, two books, these lessons, irregular plural ya da uncountable.",
      pl: "Wygląda na problem z noun number: a book, two books, these lessons, irregular plural albo uncountable.",
    },
  },
  noun_possessive_apostrophe_s: {
    label: {
      ru: "Possessive 's",
      uk: "Possessive 's",
      es: "Possessive 's",
      'pt-BR': "Possessive 's",
      vi: "Possessive 's",
      id: "Possessive 's",
      tr: "Possessive 's",
      pl: "Possessive 's",
    },
    coachLine: {
      ru: "Signal looks like noun possession: owner's thing, singular 's, plural s', irregular plural 's, or 's vs is.",
      uk: "Signal looks like noun possession: owner's thing, singular 's, plural s', irregular plural 's, or 's vs is.",
      es: "La senal apunta a posesion con sustantivos: 's, s' o 's como is.",
      'pt-BR': "O sinal aponta para posse com substantivos: 's, s' ou 's como is.",
      vi: "Tín hiệu giống sở hữu với danh từ: 's, s' hoặc 's nghĩa là is.",
      id: "Sinyalnya mengarah ke kepemilikan dengan noun: 's, s', atau 's sebagai is.",
      tr: "Sinyal isimlerle iyeliğe benziyor: 's, s' ya da is anlamındaki 's.",
      pl: "Sygnał wygląda na posiadanie z rzeczownikami: 's, s' albo 's jako is.",
    },
  },
  noun_number: {
    label: {
      ru: 'число существительного',
      uk: 'число іменника',
      es: 'número del sustantivo',
      'pt-BR': "número do substantivo",
      vi: "số của danh từ",
      id: "jumlah kata benda",
      tr: "ismin sayısı",
      pl: "liczba rzeczownika",
    },
    coachLine: {
      ru: 'Похоже, ошибка в единственном/множественном числе или счётности.',
      uk: 'Схоже, помилка в однині/множині або злічуваності.',
      es: 'Parece error de singular/plural o contabilidad.',
      'pt-BR': "Parece erro de singular/plural ou contabilidade.",
      vi: "Có vẻ là lỗi số ít/số nhiều hoặc đếm được/không đếm được.",
      id: "Sepertinya kesalahan singular/plural atau countability.",
      tr: "Tekil/çoğul ya da sayılabilirlik hatası gibi.",
      pl: "Wygląda na błąd liczby pojedynczej/mnogiej albo policzalności.",
    },
  },
  noun_meaning: {
    label: {
      ru: 'точный предмет или роль',
      uk: 'точний предмет або роль',
      es: 'objeto o rol exacto',
      'pt-BR': "objeto ou papel exato",
      vi: "đồ vật hoặc vai trò chính xác",
      id: "objek atau peran yang tepat",
      tr: "tam nesne ya da rol",
      pl: "dokładny przedmiot lub rola",
    },
    coachLine: {
      ru: 'Сигнал в выборе конкретного предмета, человека, места или роли.',
      uk: 'Сигнал у виборі конкретного предмета, людини, місця або ролі.',
      es: 'La señal está en elegir objeto, persona, lugar o rol exacto.',
      'pt-BR': "O sinal está em escolher o objeto, pessoa, lugar ou papel exato.",
      vi: "Tín hiệu nằm ở việc chọn đúng đồ vật, người, nơi chốn hoặc vai trò.",
      id: "Sinyalnya ada pada pemilihan objek, orang, tempat, atau peran yang tepat.",
      tr: "Sinyal doğru nesneyi, kişiyi, yeri ya da rolü seçmede.",
      pl: "Sygnał tkwi w wyborze dokładnego przedmiotu, osoby, miejsca albo roli.",
    },
  },
  category_general: {
    label: {
      ru: 'общий паттерн',
      uk: 'загальний патерн',
      es: 'patrón general',
      'pt-BR': "padrão geral",
      vi: "mẫu chung",
      id: "pola umum",
      tr: "genel kalıp",
      pl: "ogólny wzorzec",
    },
    coachLine: {
      ru: 'Сигнал устойчивый, но пока без более узкого подтипа.',
      uk: 'Сигнал сталий, але поки без вужчого підтипу.',
      es: 'La señal es estable, pero todavía sin subtipo más estrecho.',
      'pt-BR': "O sinal é estável, mas ainda sem subtipo mais estreito.",
      vi: "Tín hiệu ổn định, nhưng chưa có subtype hẹp hơn.",
      id: "Sinyalnya stabil, tetapi belum ada subtype yang lebih sempit.",
      tr: "Sinyal istikrarlı, ama henüz daha dar bir alt tür yok.",
      pl: "Sygnał jest stabilny, ale jeszcze bez węższego podtypu.",
    },
  },
};

const TIME_PLACE_PREPS = new Set(['in', 'on', 'at']);
const DURATION_PREPS = new Set(['for', 'since']);
const CORE_DIRECTION_PREPS = new Set(['to', 'from', 'into', 'out of', 'in', 'toward', 'towards']);
const DIRECTION_PREPS = new Set(['to', 'from', 'into', 'onto', 'through', 'across', 'toward', 'towards', 'for', 'with', 'by', 'of']);
const COMMON_VERB_PATTERN_PREPS = new Set(['to', 'for', 'on', 'at', 'about', 'in', 'from']);
const COMMON_VERB_PATTERN_RE = /\b(listen|listens|listened|listening|wait|waits|waited|waiting|depend|depends|depended|depending|look|looks|looked|looking|talk|talks|talked|talking|think|thinks|thought|thinking|ask|asks|asked|asking|believe|believes|believed|believing)\b/;
const COMMON_VERB_PATTERN_CHUNK_RE = /\b(listen(?:s|ed|ing)?\s+to|wait(?:s|ed|ing)?\s+for|depend(?:s|ed|ing)?\s+on|look(?:s|ed|ing)?\s+(?:at|for)|talk(?:s|ed|ing)?\s+(?:to|about)|think(?:s|ing)?\s+about|thought\s+about|ask(?:s|ed|ing)?\s+(?:for|about)|believe(?:s|d|ing)?\s+in)\b/;
const DURATION_FOR_PHRASE_RE = /\bfor\s+(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:second|minute|hour|day|week|month|year)s?\b/;
const MODALS = new Set(['can', 'could', 'must', 'should', 'may', 'might', 'will', 'would', 'shall']);
const SUBJECT_PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
const OBJECT_PRONOUNS = new Set(['me', 'him', 'her', 'us', 'them']);
const POSSESSIVE_PRONOUNS = new Set(['my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs']);
const FREQUENCY_ADVERBS = new Set(['always', 'often', 'usually', 'sometimes', 'never', 'rarely', 'seldom']);
const CONJUNCTIONS = new Set(['and', 'but', 'because', 'if', 'when', 'although', 'though', 'while', 'unless', 'until', 'so']);
const QUANTIFIERS = new Set(['some', 'any', 'no', 'none', 'something', 'anything', 'someone', 'anyone', 'somebody', 'anybody', 'nothing', 'nobody']);
const DEMONSTRATIVES = new Set(['this', 'that', 'these', 'those']);
const EXISTENTIAL_FORMS = new Set(['there', 'there is', 'there are', "there isn't", "there aren't", 'is there', 'are there']);
const PHRASAL_PARTICLES = new Set(['up', 'off', 'on', 'out', 'over', 'back', 'away', 'down', 'in']);
const PAST_SIMPLE_FORMS = new Set(['worked', 'opened', 'called', 'went', 'saw', 'bought', 'came', 'studied', 'stopped', 'lived']);
const PAST_SIMPLE_WRONG_FORMS = new Set(['goed', 'buyed', 'seed', 'studyed', 'stoped', 'liveed', 'did went', 'did worked', 'did bought']);
const PAST_BE_FORMS = new Set(['was', 'were', "wasn't", "weren't", 'was not', 'were not', 'was there', 'were there']);
const PRESENT_BE_FORMS = new Set(['am', 'is', 'are', "isn't", "aren't", 'is not', 'are not']);
const FUTURE_FORMS = new Set(['going to', 'am going to', 'is going to', 'are going to', 'am going', 'is going', 'are going', 'will to', 'am will', 'is will', 'are will']);
const OBJECT_ORDER_VERB_RE = /\b(give|gives|gave|given|send|sends|sent|show|shows|showed|shown|tell|tells|told|bring|brings|brought|buy|buys|bought|make|makes|made|get|gets|got)\b/;
const OBJECT_ORDER_BAD_PRONOUN_RE = /\b(?:give|send|show|tell|bring|buy|make|get)(?:s|ed)?\s+(?:me|him|her|us|them)\s+(?:it|them)\b/;
const OBJECT_ORDER_TO_FIRST_RE = /\b(?:give|send|show|tell|bring)(?:s|ed)?\s+to\s+(?:me|him|her|us|them)\b/;
const OBJECT_ORDER_FOR_FIRST_RE = /\b(?:buy|make|get)(?:s|ed)?\s+for\s+(?:me|him|her|us|them)\b/;
const BASIC_WORD_ORDER_OBJECT_FIRST_RE = /\b(?:coffee\s+i\s+like|books\s+she\s+reads|a\s+film\s+i\s+watched|english\s+we\s+study|music\s+i\s+listen|tea\s+he\s+drinks|the\s+file\s+i\s+sent)\b/;
const BASIC_WORD_ORDER_VERB_FIRST_RE = /\b(?:like\s+i|reads\s+she|live\s+they|drinks\s+he|bought\s+she|went\s+we|sent\s+i|listen\s+i)\b/;
const BASIC_WORD_ORDER_INSIDE_CORE_RE = /\b(?:i\s+coffee\s+like|she\s+books\s+reads|they\s+in\s+dublin\s+live|i\s+books\s+read|she\s+every\s+day\s+drinks|i\s+yesterday\s+watched|i\s+watched\s+yesterday\s+a\s+film|i\s+at\s+home\s+work|they\s+me\s+often\s+call|i\s+from\s+work\s+sent)\b/;
const BASIC_QUESTION_WORD_ORDER_RE = /\b(?:you\s+work|you\s+speak\s+english|she\s+speaks\s+english|she\s+called\s+you|where\s+you\s+live|what\s+you\s+bought|where\s+you\s+are|what\s+you\s+can\s+do|do\s+you\s+are|do\s+you\s+can|does\s+he\s+likes|does\s+she\s+speaks|did\s+you\s+went|did\s+you\s+bought|did\s+she\s+called|are\s+you\s+speak|where\s+are\s+you\s+live|what\s+can\s+do\s+you)\b/;
const INFINITIVE_GERUND_RE = /\b(?:want|wants|wanted|need|needs|needed|decide|decides|decided|plan|plans|planned|agree|agrees|agreed)\s+(?:to\s+\w+|\w+ing|\w+|to\s+\w+ing)\b|\b(?:enjoy|enjoys|enjoyed|finish|finishes|finished|avoid|avoids|avoided|mind|minds|minded)\s+(?:to\s+\w+|\w+ing|\w+|to\s+\w+ing)\b/;
const TOO_ENOUGH_RE = /\b(?:too\s+(?:hot|expensive|fast|tired|small|much|many)|(?:good|old|fast|hot)\s+enough|enough\s+(?:time|money|chairs|people)|(?:enough\s+(?:good|old|fast|small)|(?:time|money|chairs)\s+enough|too\s+much\s+(?:small|hot|people)|too\s+many\s+(?:noise|time)|many\s+enough|small\s+too))\b/;
const VERY_REALLY_QUITE_RE = /\b(?:(?:very|really|quite)\s+(?:useful|fast|important|tired|interesting|good|difficult|hot|perfect)|(?:useful|fast|important|tired|interesting|good|difficult|hot)\s+(?:very|really|quite)|(?:very|really|quite)\s+(?:much|many)\s+\w+|(?:many|much)\s+(?:useful|tired|difficult|important|interesting)|very\s+money|quite\s+money|really\s+money)\b/;

function signalFromInput(input: PhraseMistakeInput): PhraseMistakeSignal | null {
  return typeof input === 'string' ? null : input;
}

function tokenOf(signal: PhraseMistakeSignal): string {
  return normalizeTokenKey(signal.tokenText || signal.expected || '');
}

function pickedOf(signal: PhraseMistakeSignal): string {
  return normalizeTokenKey(signal.picked || '');
}

function rawOf(signal: PhraseMistakeSignal): string {
  return normalizeRawCategory(`${signal.rawCategory ?? ''} ${signal.grammarTag ?? ''}`);
}

function hasRaw(raw: string, ...parts: string[]): boolean {
  return parts.some((part) => raw.includes(part));
}

function hasCommonVerbPatternSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'verb preposition',
      'verb + preposition',
      'common verb pattern',
      'fixed verb pattern',
      'listen to',
      'wait for',
      'depend on',
      'look at',
      'look for',
      'talk to',
      'talk about',
      'think about',
      'ask for',
      'ask about',
      'believe in',
    )
  ) {
    return true;
  }

  if (hasRaw(raw, 'duration', 'for_since', 'present perfect') || DURATION_FOR_PHRASE_RE.test(phrase)) {
    return false;
  }

  return (
    COMMON_VERB_PATTERN_CHUNK_RE.test(phrase) ||
    (COMMON_VERB_PATTERN_RE.test(phrase) && (COMMON_VERB_PATTERN_PREPS.has(token) || COMMON_VERB_PATTERN_PREPS.has(picked)))
  );
}

function hasObjectOrderSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'object_order',
      'object order',
      'double_object',
      'double object',
      'indirect_object',
      'indirect object',
      'give_me_it',
      'send_her_it',
      'show_me_it',
      'pronoun_object_order',
      'wrong_to_order',
      'to_for_confusion',
      'mixed_pattern',
      'give it to me',
      'send it to her',
      'buy it for me',
    )
  ) {
    return true;
  }

  return (
    OBJECT_ORDER_BAD_PRONOUN_RE.test(phrase) ||
    OBJECT_ORDER_TO_FIRST_RE.test(phrase) ||
    OBJECT_ORDER_FOR_FIRST_RE.test(phrase) ||
    (OBJECT_ORDER_VERB_RE.test(phrase) && (
      /\b(me|him|her|us|them)\s+(it|them)\b/.test(phrase) ||
      /\b(it|them)\s+(to|for)\s+(me|him|her|us|them)\b/.test(phrase) ||
      ['to', 'for', 'it', 'them', 'me', 'him', 'her', 'us'].includes(token) ||
      ['to', 'for', 'it', 'them', 'me', 'him', 'her', 'us'].includes(picked)
    ))
  );
}

function hasBasicWordOrderSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'basic_word_order',
      'word_order_basic',
      'statement_word_order',
      'sentence_order',
      'subject_verb_object',
      'svo',
      'object_first',
      'verb_before_subject',
      'missing_subject',
      'place_before_object',
      'time_inside_core',
      'adverb_frequency_position',
      'be_adverb_position',
      'russian_ukrainian_order_transfer',
      'sentence_part_order',
      'moved_element',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`;
  return (
    BASIC_WORD_ORDER_OBJECT_FIRST_RE.test(combined) ||
    BASIC_WORD_ORDER_VERB_FIRST_RE.test(combined) ||
    BASIC_WORD_ORDER_INSIDE_CORE_RE.test(combined) ||
    /\b(?:work\s+usually|call\s+often\s+me|always\s+she\s+is|she\s+always\s+is|busy\s+is\s+always)\b/.test(combined)
  );
}

function hasBasicQuestionOrderSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'question_order',
      'question_word_order',
      'basic_question_order',
      'word_order_basic_question',
      'do_question',
      'does_question',
      'did_question',
      'be_question',
      'modal_question',
      'question_word',
      'subject_auxiliary_inversion',
      'missing_auxiliary_question',
      'statement_order_question',
      'does_plus_s',
      'did_plus_past',
      'do_with_be',
      'do_with_modal',
      'question_word_no_aux',
      'question_word_no_inversion',
      'wrong_auxiliary_choice',
      'wrong_modal_question_order',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`;
  return BASIC_QUESTION_WORD_ORDER_RE.test(combined);
}

function hasImperativeSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'imperative',
      'imperative_basic',
      'command',
      'instruction',
      'negative imperative',
      'positive imperative',
      'base verb imperative',
      'unnecessary you imperative',
      'to_before_imperative',
      'no_instead_of_dont',
      'dont_to',
      'dont_plus_ing',
      'dont_be',
      'lets_to',
      'please_wrong_order',
      'please wait',
      'lets go',
      "let's go",
      'dont touch',
      "don't touch",
      'dont open',
      "don't open",
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\b(?:no|not|doesn't|aren't)\s+(?:touch|open|forget|be|wait|go|turn)\b/.test(combined) ||
    /\bdon't\s+(?:to\s+\w+|\w+ing|\w+s|are\b)\b/.test(combined) ||
    /\b(?:to\s+)?(?:open|wait|turn|sit|go|be|start|stop)\b/.test(combined) && hasRaw(raw, 'command', 'instruction', 'imperative') ||
    /\b(?:you\s+(?:open|wait|turn|please)|to\s+(?:open|wait|turn|be)|(?:open|wait|turn)ing)\b/.test(combined) ||
    /\b(?:please\s+(?:to\s+\w+|\w+ing)|to\s+please|don't\s+please)\b/.test(combined) ||
    /\b(?:let's\s+to|let\s+go|let\s+start|let's\s+\w+ing|let's\s+\w+s)\b/.test(combined)
  );
}

function hasZeroFirstConditionalSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'condition_zero_first',
      'zero conditional',
      'first conditional',
      'zero_first',
      'if clause',
      'main clause',
      'will_in_if_clause',
      'will in if clause',
      'no will after if',
      'if will',
      'if it will',
      'if i will',
      'unless',
      'when future',
      'will_in_time_clause',
      'unless meaning',
      'when_if_confusion',
      'if + present',
      'will + base',
      'if rains',
      'if it rains',
      'if i have time',
      'unless you hurry',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\bif\s+\w+\s+will\b/.test(combined) ||
    /\bif\s+(?:it|i|you|he|she|we|they)\s+will\b/.test(combined) ||
    /\bwhen\s+(?:it|i|you|he|she|we|they)\s+will\b/.test(combined) ||
    /\bunless\s+(?:it|i|you|he|she|we|they)\s+will\b/.test(combined) ||
    /\bif\s+(?:it\s+rains|i\s+have|you\s+heat|you\s+press|i\s+finish|you\s+don't\s+hurry)\b/.test(combined) ||
    /\bunless\s+you\s+hurry\b/.test(combined) ||
    /\bwhen\s+i\s+get\b/.test(combined)
  );
}

function hasSecondConditionalSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'condition_second_basic',
      'second conditional',
      'second_conditional',
      'if + past simple',
      'if + past',
      'would + base',
      'unreal present',
      'unlikely future',
      'unreal condition',
      'if i were',
      'if i had',
      'if he were',
      'if she knew',
      'if it rained',
      'would_to',
      'would_plus_past',
      'would_in_if_clause',
      'will_in_if_second_conditional',
      'first_second_conditional_confusion',
      'if_i_was_instead_of_were',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\bif\s+(?:i|he|she|it|we|they|you)\s+would\b/.test(combined) ||
    /\bif\s+(?:i|he|she|it|we|they|you)\s+will\b/.test(combined) && /\bwould\b/.test(combined) ||
    /\bif\s+(?:i\s+had|he\s+had|she\s+knew|i\s+knew|it\s+rained|i\s+were|he\s+were)\b/.test(combined) ||
    /\bif\s+i\s+was\s+you\b/.test(combined) ||
    /\bif\s+i\s+were\s+you\b/.test(combined) ||
    /\bwould\s+(?:to\s+\w+|\w+ed|\w+s|\w+ing)\b/.test(combined) ||
    /\bwouldn't\s+\w+ed\b/.test(combined)
  );
}

function hasRelativeClauseSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'relative_clauses_who_which_that',
      'relative clause',
      'relative pronoun',
      'who_for_thing',
      'which_for_person',
      'duplicate_subject',
      'duplicate_object',
      'whose_confusion',
      'that_after_comma',
      'object_relative_omission',
      'subject_relative_omission',
      'relative_clause_word_order',
      'who which that',
      'who/which/that',
      'whose',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\b(?:man|woman|person|brother|sister|teacher|friend)\s+which\b/.test(combined) ||
    /\b(?:phone|book|idea|app|thing|car|house)\s+who\b/.test(combined) ||
    /\b(?:who|which|that)\s+(?:he|she|it|they)\s+(?:called|helped|broke|created|lives|works)\b/.test(combined) ||
    /\b(?:person|phone|book|app)\s+(?:where|what)\b/.test(combined) ||
    /\b(?:woman|man|person)\s+whose\s+\w+\b/.test(combined) ||
    /\bmy\s+\w+,\s+that\b/.test(combined) ||
    /\bthe\s+(?:phone|book|app)\s+i\s+\w+\s+it\b/.test(combined) ||
    /\bthe\s+(?:person|man|woman)\s+that\s+i\s+\w+\s+(?:him|her)\b/.test(combined)
  );
}

function hasReportedSpeechSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'reported_speech_basic',
      'reported speech',
      'reported_speech',
      'direct speech',
      'said that',
      'told someone that',
      'asked if',
      'asked where',
      'asked what',
      'reported question',
      'reported_question',
      'pronoun shift',
      'tense backshift',
      'backshift',
      'missing_pronoun_shift',
      'missing_backshift',
      'reported_question_word_order',
      'did_in_reported_question',
      'yes_no_question_missing_if',
      'told_without_object',
      'said_with_object',
      'will_not_backshifted',
      'can_not_backshifted',
      'direct_speech_left_inside_report',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\b(?:he|she|they)\s+said\s+that\s+(?:i\s+am|i\s+will|i\s+can|he\s+is|she\s+is)\b/.test(combined) ||
    /\b(?:he|she|they)\s+said\s+(?:i\s+am|i\s+will|i\s+can)\b/.test(combined) ||
    /\b(?:he|she)\s+told\s+that\b/.test(combined) ||
    /\b(?:he|she)\s+said\s+(?:me|him|her|us)\b/.test(combined) ||
    /\basked\s+(?:was|is|are|do|does|did|will|can)\s+(?:i|you|he|she|we|they)\b/.test(combined) ||
    /\basked\s+(?:if|where|what|when|why|how)\s+(?:was|is|are|do|does|did|will|can)\s+(?:i|you|he|she|we|they)\b/.test(combined) ||
    /\basked\s+(?:where|what|when)\s+(?:did|do|does)\s+(?:i|you|he|she|we|they)\b/.test(combined) ||
    /\basked\s+if\s+(?:was|were|is|are)\s+(?:i|you|he|she|we|they)\b/.test(combined) ||
    /\b(?:would|could|couldn't)\s+\w+ed\b/.test(combined) ||
    /\bwhen\s+will\s+i\s+\w+\b/.test(combined)
  );
}

function hasPrepositionTimePlaceSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'in_on_at_time_place_confusion',
      'in with day',
      'in_with_day',
      'on with exact time',
      'on_with_exact_time',
      'at with month year',
      'at_with_month_year',
      'on with enclosed place',
      'on_with_enclosed_place',
      'in with surface',
      'in_with_surface',
      'at in city',
      'at_in_city',
      'fixed_expression_error',
      'time_place_scale_error',
    )
  ) {
    return true;
  }

  if (!hasRaw(raw, 'mixed', 'combined', 'bucket', 'scale')) {
    return false;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\b(?:in|on|at|to)\s+(?:the\s+)?room\b/.test(combined) ||
    /\b(?:in|on|at|to)\s+(?:the\s+)?table\b/.test(combined) ||
    /\b(?:in|on|at|to)\s+(?:the\s+)?door\b/.test(combined) ||
    /\b(?:in|on|at|to)\s+(?:monday|mondays|may\s+5th|1990|8(?:\s+o'clock)?)\b/.test(combined) ||
    /\b(?:in|on|at|to)\s+dublin\b/.test(combined) ||
    /\b(?:in|on|at|to)\s+(?:work|the\s+bus|the\s+car|the\s+evening)\b/.test(combined)
  );
}

function hasBroadDirectionPrepositionSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (hasRaw(raw, 'preposition_direction_to_into_from')) {
    return false;
  }

  if (
    hasRaw(
      raw,
      'to_into_confusion',
      'into_in_confusion',
      'onto_on_confusion',
      'from_out_of_confusion',
      'to_home_error',
      'arrive_to_error',
      'out_from_error',
      'direction_location_confusion',
      'wrong_origin_destination_error',
      'onto',
      'out_from',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\b(?:go|goes|going|went|come|came)\s+to\s+home\b/.test(combined) ||
    /\barriv(?:e|es|ed|ing)\s+to\s+\w+\b/.test(combined) ||
    /\bout\s+from\s+(?:the\s+)?(?:car|room|bag|house)\b/.test(combined) ||
    /\b(?:put|puts|putting|jump|jumps|jumped|move|moves|moved)\b[^.?!]*\bonto\b/.test(combined) ||
    /\b(?:put|puts|putting|jump|jumps|jumped|move|moves|moved)\b[^.?!]*\bon\s+(?:the\s+)?(?:table|sofa|chair)\b/.test(combined)
  );
}

function hasInfinitiveGerundSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'infinitive gerund',
      'infinitive_vs_gerund',
      'infinitive vs gerund',
      'gerund infinitive',
      'to do doing',
      'to + base verb',
      'verb ing',
      'verb-ing',
      'governing verb',
      'required verb pattern',
      'chosen verb form',
      'want gerund',
      'need gerund',
      'decide gerund',
      'plan gerund',
      'agree gerund',
      'enjoy to',
      'finish to',
      'avoid to',
      'mind to',
      'to plus ing',
      'to_plus_ing',
      'gerund pattern',
      'want_to',
      'need_to',
      'decide_to',
      'plan_to',
      'enjoy_doing',
      'finish_doing',
      'avoid_doing',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`;
  return INFINITIVE_GERUND_RE.test(combined);
}

function hasPastSimpleNegativeQuestionSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'past simple negative question',
      'past_simple_negative_question',
      'did didnt',
      'did_didnt',
      'did + base',
      'did base',
      'didnt base',
      'didn t base',
      'did plus past',
      'did_plus_past',
      'didnt plus past',
      'didnt_plus_past',
      'did not plus past',
      'did not base',
      'missing did question',
      'missing_did_question',
      'do instead of did',
      'do_instead_of_did',
      'does instead of did',
      'does_instead_of_did',
      'question word no did',
      'question_word_no_did',
      'base after did',
      'verb form after did',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`;
  return (
    /\b(?:did|didn't|didnt|did not)\s+\w+(?:ed|went|saw|bought|came|worked|called|lived)\b/.test(combined) ||
    /\b(?:do|does|don't|doesn't)\s+\w+(?:ed|went|saw|bought|came)\b/.test(combined) ||
    /\b(?:what|where|when|why|how)\s+(?:you|he|she|it|we|they)\s+\w+(?:ed|went|saw|bought|came)\b/.test(combined) ||
    /\b(?:you|he|she|it|we|they)\s+(?:went|called|worked|bought|saw)\?\b/.test(combined)
  );
}

function hasPresentPerfectSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'present perfect',
      'present_perfect',
      'have has v3',
      'have_has_v3',
      'have + v3',
      'has + v3',
      'past participle',
      'past_participle',
      'have has agreement',
      'have_has_agreement',
      'missing have has',
      'missing_have_has',
      'wrong past participle',
      'wrong_past_participle',
      'have plus past simple',
      'have_plus_past_simple',
      'have saw',
      'have_saw',
      'has saw',
      'has_saw',
      'have did',
      'have_did',
      'has did',
      'has_did',
      'already yet',
      'already_yet',
      'yet position',
      'yet_position',
      'already position',
      'already_position',
      'ever never',
      'ever_never',
      'result now',
      'result_now',
      'life experience',
      'life_experience',
      'time marker',
      'time_marker',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\b(?:have|has|haven't|hasn't|have not|has not)\s+(?:already\s+)?(?:done|seen|been|finished|left|lost|bought|tried|gone)\b/.test(combined) ||
    /\b(?:have|has|haven't|hasn't|have not|has not)\s+(?:saw|did|was|were|go|see|do|buy|try|lose)\b/.test(combined) ||
    /\b(?:have|has)\s+(?:you|i|we|they|he|she|it)\s+(?:ever\s+)?(?:done|seen|been|tried|finished|gone)\b/.test(combined) ||
    /\b(?:already|yet|ever|never)\b/.test(combined) && /\b(?:have|has|haven't|hasn't|done|seen|been|finished|tried|lost)\b/.test(combined)
  );
}

function hasPresentPerfectVsPastSimpleSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'present perfect vs past simple',
      'present_perfect_vs_past_simple',
      'perfect vs past',
      'perfect_vs_past',
      'present perfect with finished time',
      'present_perfect_with_finished_time',
      'finished time',
      'finished_time',
      'have seen yesterday',
      'have_seen_yesterday',
      'perfect yesterday',
      'perfect_yesterday',
      'past simple instead of experience',
      'past_simple_instead_of_experience',
      'past simple instead of result',
      'past_simple_instead_of_result',
      'result now vs time',
      'result_now_vs_time',
      'life experience vs specific time',
      'specific time marker',
      'specific_time_marker',
      'did ever been',
      'did_ever_been',
      'when present perfect',
      'when_present_perfect',
      'already yet past simple',
      'already_yet_past_simple',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  const finishedTime = /\b(?:yesterday|last\s+(?:night|week|month|year)|\d+\s+days?\s+ago|ago|in\s+\d{4})\b/.test(combined);
  const perfectForm = /\b(?:have|has|haven't|hasn't|have not|has not)\s+(?:ever\s+|never\s+|already\s+)?(?:been|seen|done|tried|finished|lost|left|gone|bought|went)\b/.test(combined);
  const experienceMarker = /\b(?:ever|never)\b/.test(combined);
  const alreadyYet = /\b(?:already|yet)\b/.test(combined);

  return (
    (finishedTime && perfectForm) ||
    (finishedTime && /\b(?:have|has)\b/.test(combined) && /\b(?:lost|seen|been|finished|tried|left|went)\b/.test(combined)) ||
    (experienceMarker && /\b(?:did|do|does)\b/.test(combined) && /\b(?:been|tried|saw|was|were)\b/.test(combined)) ||
    (alreadyYet && /\b(?:did|didn't|do|does)\b/.test(combined) && /\b(?:finished|tried|done)\b/.test(combined))
  );
}

function hasPresentPerfectQuestionsNegativesSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'present perfect questions negatives',
      'present_perfect_questions_negatives',
      'present perfect question',
      'present_perfect_question',
      'present perfect negative',
      'present_perfect_negative',
      'question order have',
      'question_order_have',
      'question order have has',
      'question_order_have_has',
      'did instead of have',
      'did_instead_of_have',
      'do with present perfect',
      'do_with_present_perfect',
      'negative have has agreement',
      'negative_have_has_agreement',
      'haven t plus base',
      'haven_t_plus_base',
      'havent plus base',
      'havent_plus_base',
      'haven t plus past simple',
      'haven_t_plus_past_simple',
      'hasn t plus base',
      'hasn_t_plus_base',
      'ever question',
      'ever_question',
      'yet question',
      'yet_question',
      'double negative never',
      'double_negative_never',
      'have you finished',
      'has she called',
      'haven t seen',
      'hasn t called',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\b(?:have|has)\s+(?:i|you|we|they|he|she|it)\s+(?:ever\s+)?(?:done|seen|been|finished|called|left|started|tried)\b/.test(combined) ||
    /\b(?:haven't|hasn't|havent|hasnt|have not|has not)\s+(?:done|seen|been|finished|called|left|started|tried)\b/.test(combined) ||
    /\b(?:did|do|does)\s+(?:i|you|we|they|he|she|it)\s+(?:have\s+)?(?:done|seen|been|finished|called|saw|tried)\b/.test(combined) ||
    /\b(?:i|you|we|they|he|she|it)\s+(?:have|has)\s+(?:ever\s+)?(?:done|seen|been|finished|called|tried)\?\b/.test(combined) ||
    /\b(?:haven't|hasn't|havent|hasnt)\s+(?:see|saw|do|did|call|finish|try)\b/.test(combined) ||
    /\b(?:haven't|hasn't|havent|hasnt)\s+never\b/.test(combined)
  );
}

function hasPresentPerfectForSinceSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'present perfect for since',
      'present_perfect_for_since',
      'for since',
      'for_since',
      'since duration',
      'since_duration',
      'for starting point',
      'for_starting_point',
      'for start point',
      'how long',
      'how_long',
      'continuing situation',
      'continuing_situation',
      'started in past continues now',
      'started_in_past_and_continues_now',
      'since clause',
      'since_clause',
      'finished period confusion',
      'finished_period_confusion',
      'have lived for',
      'has worked since',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\bsince\s+(?:\d+\s+)?(?:years?|months?|weeks?|days?|minutes?|hours?|a\s+long\s+time)\b/.test(combined) ||
    /\bfor\s+(?:\d{4}|monday|tuesday|wednesday|thursday|friday|saturday|sunday|yesterday|last\s+(?:week|month|year|night))\b/.test(combined) ||
    /\b(?:have|has|haven't|hasn't|have not|has not)\s+\w+\s+(?:for|since)\b/.test(combined) ||
    /\bhow\s+long\s+(?:have|has|did|do|does)\b/.test(combined) ||
    /\b(?:for|since)\s+(?:three|five|six|twenty|\d+|a\s+long|2020|2021|monday|last\s+week)\b/.test(combined)
  );
}

function hasPastSimpleVsPastContinuousSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'past simple vs past continuous',
      'past_simple_vs_past_continuous',
      'past simple continuous',
      'past_simple_continuous',
      'fact vs process',
      'fact_vs_process',
      'completed action',
      'completed_action',
      'background action',
      'background_action',
      'background process',
      'background_process',
      'interrupted action confusion',
      'interrupted_action_confusion',
      'parallel actions',
      'parallel_actions',
      'sequence vs background',
      'sequence_vs_background',
      'past continuous instead of past simple',
      'past_continuous_instead_of_past_simple',
      'past simple instead of background process',
      'past_simple_instead_of_background_process',
      'past simple instead of past continuous',
      'past_simple_instead_of_past_continuous',
      'process vs event',
      'process_vs_event',
      'when while',
      'when_while',
      'at 8 yesterday',
      'at that moment',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  const hasContinuousForm = /\b(?:was|were|wasn't|weren't|was not|were not)\s+\w+ing\b/.test(combined);
  const hasPastSimpleEvent = /\b(?:worked|called|rang|arrived|entered|came|opened|watched|slept|cooked|had|came in)\b/.test(combined);
  const hasContrastMarker = /\b(?:when|while|at\s+that\s+moment|at\s+\d+(?:\s+\w+)?\s+yesterday|at\s+\d+|yesterday|last\s+night)\b/.test(combined);
  const hasBadContrastForm = /\b(?:was|were)\s+\w+ed\b/.test(combined) || /\b\w+ing\s+(?:yesterday|when|while|at\s+\d+)\b/.test(combined);

  return (
    (hasContrastMarker && hasContinuousForm && hasPastSimpleEvent) ||
    (hasContrastMarker && hasBadContrastForm) ||
    /\b(?:i|he|she|it|you|we|they)\s+(?:worked|watched|slept|cooked|had)\s+(?:when|while|at\s+\d+|at\s+that\s+moment)\b/.test(combined) ||
    /\b(?:came|opened|called|entered|rang)\b.*\b(?:was|were)\s+\w+ing\b/.test(combined)
  );
}

function hasUsedToSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'used to',
      'used_to',
      'used_to_basic',
      'past habit',
      'past_habit',
      'past state',
      'past_state',
      'not true now',
      'not_true_now',
      'didnt use to',
      "didn't use to",
      'didnt_used_to',
      'did you use to',
      'did_you_use_to',
      'did you used to',
      'did_you_used_to',
      'use to',
      'used to plus ing',
      'used_to_plus_ing',
      'used to missing to',
      'used_to_missing_to',
      'be used to',
      'be_used_to',
      'be used to confusion',
      'be_used_to_confusion',
      'current habit',
      'wrong current habit',
      'wrong_current_habit',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\b(?:used|use)\s+to\s+\w+\b/.test(combined) ||
    /\bdid(?:n't| not)?\s+(?:used|use)\s+to\b/.test(combined) ||
    /\bdid\s+(?:you|i|he|she|it|we|they)\s+(?:used|use)\s+to\b/.test(combined) ||
    /\b(?:am|is|are|was|were|be|been)\s+used\s+to\s+\w+(?:ing)?\b/.test(combined) ||
    /\bused\s+to\s+\w+ing\b/.test(combined) ||
    /\bused\s+to\s+to\s+\w+\b/.test(combined)
  );
}

function hasFuturePresentContinuousArrangementSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'future present continuous',
      'future_present_continuous',
      'future_present_continuous_arrangements',
      'present continuous for future',
      'present_continuous_future',
      'future arrangement',
      'future_arrangement',
      'future arrangements',
      'arrangement',
      'arranged plan',
      'arranged_plan',
      'tomorrow arrangement',
      'future marker',
      'future_marker',
      'missing be future arrangement',
      'missing_be_future_arrangement',
      'be plus base',
      'be_plus_base',
      'will instead of arrangement',
      'will_instead_of_arrangement',
      'going to vs arrangement',
      'going_to_vs_arrangement',
      'present now future confusion',
      'present_now_future_confusion',
      'present simple schedule confusion',
      'present_simple_schedule_confusion',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  const futureMarker = /\b(?:tomorrow|tonight|next\s+(?:week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|on\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|at\s+\d+(?::\d+)?(?:\s*(?:am|pm))?\s+tomorrow|tomorrow\s+(?:morning|afternoon|evening))\b/.test(combined);
  const beIng = /\b(?:am|is|are|am not|isn't|aren't|is not|are not)\s+\w+ing\b/.test(combined);
  const missingBeIng = /\b(?:i|you|he|she|it|we|they)\s+\w+ing\s+(?:tomorrow|tonight|next\s+\w+|on\s+\w+|at\s+\d+)/.test(combined);
  const bePlusBase = /\b(?:am|is|are)\s+(?:meet|see|fly|come|leave|work|call|have|go|do)\b/.test(combined);

  return (
    (futureMarker && beIng) ||
    (futureMarker && missingBeIng) ||
    (futureMarker && bePlusBase) ||
    /\b(?:will|going to|am going to|is going to|are going to)\b.*\b(?:tomorrow|tonight|next\s+\w+|on\s+\w+|at\s+\d+)\b/.test(combined) &&
      /\b(?:meeting|seeing|flying|coming|leaving|working|having|going out)\b/.test(combined)
  );
}

function hasPastContinuousSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'past continuous',
      'past_continuous',
      'past continuous basic',
      'past_continuous_basic',
      'was were ing',
      'was_were_ing',
      'was + verb-ing',
      'were + verb-ing',
      'missing was were',
      'missing_was_were',
      'was were agreement',
      'was_were_agreement',
      'was were plus base',
      'was_were_plus_base',
      'past simple instead of past continuous',
      'past_simple_instead_of_past_continuous',
      'ing without was were',
      'ing_without_was_were',
      'process vs completed',
      'process_vs_completed',
      'at 8 yesterday',
      'at that moment',
      'interrupted action',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\b(?:was|were|wasn't|weren't|was not|were not)\s+\w+ing\b/.test(combined) ||
    /\b(?:was|were|wasn't|weren't)\s+(?:work|wait|watch|sleep|listen|rain|have|talk)\b/.test(combined) ||
    /\b(?:i|he|she|it|you|we|they)\s+\w+ing\s+(?:at\s+that\s+moment|at\s+\d+|when|while|yesterday)\b/.test(combined) ||
    /\b(?:at\s+\d+(?:\s+\w+)?\s+(?:yesterday|last\s+night)|at\s+that\s+moment|while)\b/.test(combined) &&
      /\b(?:working|waiting|watching|sleeping|raining|having|talking|listening|worked|waited|watched|slept|had)\b/.test(combined)
  );
}

function hasTooEnoughSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'too enough',
      'too_enough',
      'too + adjective',
      'too_adjective',
      'too adjective',
      'adjective + enough',
      'adjective_enough',
      'adjective enough',
      'enough + noun',
      'enough_noun',
      'enough noun',
      'too much',
      'too_much',
      'too many',
      'too_many',
      'not enough',
      'not_enough',
      'too to structure',
      'too_to_structure',
      'enough before adjective',
      'enough_before_adjective',
      'enough after noun',
      'enough_after_noun',
      'too after adjective',
      'too_after_adjective',
      'too much many',
      'too_much_many',
      'modifier position',
      'modifier_position',
      'word type',
      'word_type',
      'meaning type',
      'meaning_type',
      'degree modifier',
      'degree_modifier',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`;
  return TOO_ENOUGH_RE.test(combined);
}

function hasVeryReallyQuiteSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'very really quite',
      'very_really_quite',
      'modifier very really quite',
      'modifier_very_really_quite',
      'very + adjective',
      'very_adjective',
      'really + adjective',
      'really_adjective',
      'quite + adjective',
      'quite_adjective',
      'intensifier position',
      'intensifier_position',
      'intensity meaning',
      'intensity_meaning',
      'very too',
      'very_too',
      'too instead of very',
      'too_instead_of_very',
      'very with noun',
      'very_with_noun',
      'quite meaning',
      'quite_meaning',
      'really position',
      'really_position',
      'strong adjective modifier',
      'strong_adjective_modifier',
      'quite overstatement',
      'quite_overstatement',
    )
  ) {
    return true;
  }

  const modifierTokens = new Set(['very', 'really', 'quite']);
  const combined = `${phrase} ${token} ${picked}`;
  return modifierTokens.has(token) || modifierTokens.has(picked) || VERY_REALLY_QUITE_RE.test(combined);
}

function hasPossessiveApostropheSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'possessive apostrophe',
      'possessive_apostrophe',
      'apostrophe s',
      'apostrophe_s',
      'possessive s',
      'possessive_s',
      'singular possessive',
      'plural possessive',
      'plural possessive s',
      'apostrophe position',
      'owner thing',
      'owner_number',
      'possessive pattern',
      's vs is',
      'possessive is confusion',
      'missing apostrophe',
      'missing_apostrophe',
      'wrong word order possessive',
      'irregular plural possessive',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`;
  return (
    /\b(?:john|anna|teacher|friend|student|parent|child|children|men|man|dog|brother|sister|mother|father)s?\s+(?:phone|car|book|bag|house|answers|toys|shoes|food)\b/.test(combined) ||
    /\b(?:john|anna|teacher|friend|student|parent|child|children|men|man|dog|brother|sister|mother|father)'s\s+\w+\b/.test(combined) ||
    /\b(?:friends|students|parents|teachers|dogs|brothers|sisters)'\s+\w+\b/.test(combined) ||
    /\b(?:phone|car|book|bag|house|answers|toys|shoes)'s\s+(?:john|anna|teacher|friend|student|parent|child|children|men|man|dog|brother|sister|mother|father)\b/.test(combined)
  );
}

function hasShouldMustHaveToSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'should must have to',
      'modal_should_must_have_to',
      'should/must/have to',
      'should advice',
      'should_advice',
      'must rule',
      'must_rule',
      'must obligation',
      'have to external',
      'external necessity',
      'external_necessity',
      'dont have to',
      "don't have to",
      'dont_have_to',
      'doesnt have to',
      "doesn't have to",
      'doesnt_have_to',
      'mustnt',
      "mustn't",
      'mustnt_prohibition',
      'prohibition',
      'shouldnt',
      "shouldn't",
      'shouldnt_advice',
      'dont have to mustnt',
      'dont_have_to_mustnt_confusion',
      'question have to',
      'question_have_to',
      'do you have to',
      'does she have to',
      'have to agreement',
      'has to',
      'has_to',
      'modal meaning',
      'obligation strength',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\b(?:should|shouldn't|must|mustn't)\s+(?:to\s+)?\w+(?:s|ing)?\b/.test(combined) ||
    /\b(?:have|has|had)\s+to\s+\w+\b/.test(combined) ||
    /\b(?:don't|doesn't|do not|does not)\s+have\s+to\b/.test(combined) ||
    /\b(?:do|does)\s+(?:you|i|he|she|it|we|they)\s+have\s+to\b/.test(combined) ||
    /\b(?:have|has)\s+(?:you|i|he|she|it|we|they)\s+to\b/.test(combined) ||
    /\b(?:mustn't|mustnt|don't have to|doesn't have to|shouldn't|shouldnt)\b/.test(combined)
  );
}

function hasCanCouldAbilityRequestSignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'modal_can_could_ability_request',
      'can could',
      'can/could',
      'can ability',
      'could ability',
      'present ability',
      'past ability',
      'can present ability',
      'could past ability',
      'can_for_past_ability',
      'could_for_present_ability',
      'can_to_error',
      'could_to_error',
      'cant couldnt',
      "can't couldn't",
      'cant_couldnt_time_confusion',
      'polite request',
      'request politeness',
      'permission could',
      'could i',
      'could you',
      'can you',
      'can drive',
      'can speak',
      'could swim',
      'couldnt',
      "couldn't",
      'couldnt_past_negative',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\b(?:can|can't|cannot|could|couldn't|couldnt)\s+(?:to\s+)?\w+(?:s|ed|ing)?\b/.test(combined) ||
    /\b(?:can|could)\s+(?:i|you|he|she|it|we|they)\s+\w+\b/.test(combined) ||
    /\b(?:do|does|did|am|are|is|was|were)\s+(?:i|you|he|she|it|we|they)?\s*(?:can|could)\b/.test(combined) ||
    /\b(?:can to|could to|cans|coulds|don't can|doesn't can|am not can|is can|are could|was could)\b/.test(combined)
  );
}

function hasMayMightProbabilitySignal(raw: string, phrase: string, token: string, picked: string): boolean {
  if (
    hasRaw(
      raw,
      'modal_may_might_probability',
      'may might',
      'may/might',
      'may probability',
      'might probability',
      'probability modal',
      'possibility modal',
      'uncertainty',
      'may_not',
      'might_not',
      'may not',
      'might not',
      'may_to_error',
      'might_to_error',
      'can_probability_confusion',
      'will_probability_confusion',
      'maybe_modal_confusion',
      'wrong_uncertainty_strength',
      'may be busy',
      'may rain',
      'might come',
      'might work',
    )
  ) {
    return true;
  }

  const combined = `${phrase} ${token} ${picked}`.toLowerCase();
  return (
    /\b(?:may|might)\s+(?:not\s+)?(?:to\s+)?\w+(?:s|ed|ing)?\b/.test(combined) ||
    /\b(?:doesn't|don't|does|do)\s+(?:may|might)\b/.test(combined) ||
    /\b(?:may|might)\s+(?:doesn't|don't|does|do)\b/.test(combined) ||
    /\b(?:maybe\s+\w+|not\s+may|not\s+might|may to|might to|may\s+\w+s\b|might\s+\w+s\b)\b/.test(combined)
  );
}

function classifySignal(category: WordCategory, signal: PhraseMistakeSignal): PosMicroDiagnosisId {
  const token = tokenOf(signal);
  const picked = pickedOf(signal);
  const raw = rawOf(signal);
  const phrase = normalizeTokenKey(signal.phrase);

  if (
    (category === 'modifier' || category === 'adverb' || category === 'adjective') &&
    hasVeryReallyQuiteSignal(raw, phrase, token, picked)
  ) {
    return 'modifier_very_really_quite';
  }

  if (
    (category === 'modifier' || category === 'adverb' || category === 'determiner' || category === 'adjective') &&
    hasTooEnoughSignal(raw, phrase, token, picked)
  ) {
    return 'too_enough';
  }

  if (
    hasRaw(raw, 'object_order', 'double_object', 'indirect_object', 'give_me_it', 'send_her_it', 'show_me_it', 'pronoun_object_order')
  ) {
    return 'object_order_give_me_it';
  }
  if (category === 'syntax' && hasBasicQuestionOrderSignal(raw, phrase, token, picked)) {
    return 'word_order_basic_question';
  }
  if (category === 'syntax' && hasSecondConditionalSignal(raw, phrase, token, picked)) {
    return 'condition_second_basic';
  }
  if (category === 'syntax' && hasRelativeClauseSignal(raw, phrase, token, picked)) {
    return 'relative_clauses_who_which_that';
  }
  if (category === 'syntax' && hasReportedSpeechSignal(raw, phrase, token, picked)) {
    return 'reported_speech_basic';
  }
  if (category === 'syntax' && hasZeroFirstConditionalSignal(raw, phrase, token, picked)) {
    return 'condition_zero_first';
  }
  if (category === 'syntax' && hasImperativeSignal(raw, phrase, token, picked)) {
    return 'imperative_basic';
  }
  if (category === 'syntax' && hasBasicWordOrderSignal(raw, phrase, token, picked)) {
    return 'word_order_basic_statement';
  }

  switch (category) {
    case 'syntax':
      if (hasSecondConditionalSignal(raw, phrase, token, picked)) return 'condition_second_basic';
      if (hasRelativeClauseSignal(raw, phrase, token, picked)) return 'relative_clauses_who_which_that';
      if (hasReportedSpeechSignal(raw, phrase, token, picked)) return 'reported_speech_basic';
      if (hasZeroFirstConditionalSignal(raw, phrase, token, picked)) return 'condition_zero_first';
      if (hasImperativeSignal(raw, phrase, token, picked)) return 'imperative_basic';
      if (hasObjectOrderSignal(raw, phrase, token, picked)) return 'object_order_give_me_it';
      if (hasBasicQuestionOrderSignal(raw, phrase, token, picked)) return 'word_order_basic_question';
      if (hasBasicWordOrderSignal(raw, phrase, token, picked) || hasRaw(raw, 'word_order', 'word order', 'syntax')) return 'word_order_basic_statement';
      return 'word_order_basic_statement';
    case 'article':
      if (DEMONSTRATIVES.has(token) || DEMONSTRATIVES.has(picked) || hasRaw(raw, 'demonstrative', 'this', 'that', 'these', 'those')) return 'determiner_this_that_these_those';
      if (QUANTIFIERS.has(token) || QUANTIFIERS.has(picked) || hasRaw(raw, 'determiner', 'quantifier', 'some', 'any')) return 'quantifier_some_any';
      if (token === '-' || picked === '-' || hasRaw(raw, 'zero', 'no_article')) return 'article_zero';
      if (token === 'the' || picked === 'the') return 'article_the_specific';
      if (token === 'a' || token === 'an' || picked === 'a' || picked === 'an') return 'article_a_an';
      return 'article_the_specific';
    case 'preposition':
      if (hasCommonVerbPatternSignal(raw, phrase, token, picked)) {
        return 'preposition_common_verb_patterns';
      }
      if (hasPrepositionTimePlaceSignal(raw, phrase, token, picked)) {
        return 'preposition_time_place';
      }
      if (
        DURATION_PREPS.has(token) ||
        DURATION_PREPS.has(picked) ||
        hasRaw(raw, 'duration', 'since', 'for_since', 'present perfect')
      ) {
        return 'preposition_duration_for_since';
      }
      if (hasBroadDirectionPrepositionSignal(raw, phrase, token, picked)) {
        return 'preposition_direction';
      }
      if (
        hasRaw(
          raw,
          'direction',
          'movement',
          'destination',
          'source',
          'origin',
          'recipient',
          'inside movement',
          'outside movement',
          'in vs into',
          'to into',
          'from out',
          'out of',
        ) ||
        /\b(out of|into)\b/.test(phrase) ||
        ((token === 'to' || token === 'from' || token === 'into' || token === 'out of' || picked === 'to' || picked === 'from' || picked === 'into' || picked === 'out of') && !hasRaw(raw, 'duration')) ||
        ((CORE_DIRECTION_PREPS.has(token) || CORE_DIRECTION_PREPS.has(picked)) && /\b(go|goes|going|went|walk|walked|drive|drove|come|came|send|sent|give|gave|put|take|took|get|got|move|moved)\b/.test(phrase))
      ) {
        return 'preposition_direction_to_into_from';
      }
      if (hasRaw(raw, 'place', 'lugar', 'location')) {
        return 'preposition_place_in_on_at';
      }
      if (
        TIME_PLACE_PREPS.has(token) ||
        TIME_PLACE_PREPS.has(picked) ||
        hasRaw(raw, 'time', 'tiempo', 'час')
      ) {
        return 'preposition_time_in_on_at';
      }
      if (DIRECTION_PREPS.has(token) || DIRECTION_PREPS.has(picked) || hasRaw(raw, 'direction', 'movement', 'naprav', 'napryam')) {
        return 'preposition_direction';
      }
      return 'preposition_time_place';
    case 'verb':
      if (hasRaw(raw, 'modal base', 'after modal', 'base form after modal', 'modal structure')) return 'modal_base_form';
      if (hasPastSimpleNegativeQuestionSignal(raw, phrase, token, picked)) {
        return 'verb_past_simple_negative_question';
      }
      if (hasUsedToSignal(raw, phrase, token, picked)) {
        return 'used_to_basic';
      }
      if (hasFuturePresentContinuousArrangementSignal(raw, phrase, token, picked)) {
        return 'future_present_continuous_arrangements';
      }
      if (hasPastSimpleVsPastContinuousSignal(raw, phrase, token, picked)) {
        return 'past_simple_vs_past_continuous';
      }
      if (hasPastContinuousSignal(raw, phrase, token, picked)) {
        return 'past_continuous_basic';
      }
      if (hasPresentPerfectVsPastSimpleSignal(raw, phrase, token, picked)) {
        return 'present_perfect_vs_past_simple';
      }
      if (hasPresentPerfectForSinceSignal(raw, phrase, token, picked)) {
        return 'present_perfect_for_since';
      }
      if (hasPresentPerfectQuestionsNegativesSignal(raw, phrase, token, picked)) {
        return 'present_perfect_questions_negatives';
      }
      if (hasPresentPerfectSignal(raw, phrase, token, picked)) {
        return 'verb_present_perfect_basic';
      }
      if (hasInfinitiveGerundSignal(raw, phrase, token, picked)) {
        return 'infinitive_vs_gerund_basic';
      }
      if (
        hasRaw(
          raw,
          'future will',
          'will going to',
          'will/going to',
          'future form',
          'future structure',
          'instant decision',
          'promise',
          'prediction',
          'plan',
          'intention',
          'evidence',
          'going to',
          'will to',
          'missing be going to',
          'double future',
          'will plus ing',
          'will_plus_ing',
        ) ||
        FUTURE_FORMS.has(token) ||
        FUTURE_FORMS.has(picked) ||
        /\b(will to|going to|am going to|is going to|are going to|am will|is will|are will|will \w+ing|will \w+ed)\b/.test(phrase)
      ) {
        return 'future_will_going_to';
      }
      if (hasRaw(raw, 'modal') || MODALS.has(picked) || MODALS.has(token)) return 'verb_after_modal';
      if (
        hasRaw(raw, 'was were', 'was/were', 'past be', 'past to be', 'be past', 'wasnt', 'werent', 'wasn', 'weren', 'there was', 'there were') ||
        PAST_BE_FORMS.has(token) ||
        PAST_BE_FORMS.has(picked) ||
        ((PRESENT_BE_FORMS.has(token) || PRESENT_BE_FORMS.has(picked)) && /\b(yesterday|last night|last week|last month|this morning|in 2020|ago)\b/.test(phrase))
      ) {
        return 'verb_was_were';
      }
      if (
        hasRaw(raw, 'past simple', 'regular past', 'irregular past', 'past marker', 'past form', 'regular ed', 'y_to_ied', 'double consonant', 'goed', 'buyed', 'did went', 'did worked') ||
        /\b(yesterday|last night|last week|last month|two days ago|three days ago|ago|before|in 2020)\b/.test(phrase) ||
        PAST_SIMPLE_FORMS.has(token) ||
        PAST_SIMPLE_FORMS.has(picked) ||
        PAST_SIMPLE_WRONG_FORMS.has(picked) ||
        PAST_SIMPLE_WRONG_FORMS.has(token)
      ) {
        return 'verb_past_simple_regular_irregular';
      }
      if (
        hasRaw(raw, 'simple vs continuous', 'present simple vs continuous', 'habit vs now', 'normally or now', 'usually vs now', 'simple continuous contrast', 'tense contrast') ||
        (/\b(every day|usually|often|always|on mondays|on sundays)\b/.test(phrase) && /\b(now|right now|at the moment|this month)\b/.test(phrase))
      ) {
        return 'verb_present_simple_vs_continuous';
      }
      if (
        hasRaw(raw, 'present continuous', 'continuous', 'progressive', 'be plus ing', 'be_plus_ing', 'missing be before ing', 'missing_be_before_ing', 'right now', 'at the moment') ||
        /\b(now|right now|at the moment)\b/.test(phrase) ||
        ((/ing$/.test(token) || /ing$/.test(picked)) && (hasRaw(raw, 'continuous', 'progressive') || /\b(am|is|are|working|studying|waiting|reading|talking|watching)\b/.test(phrase)))
      ) {
        return 'verb_present_continuous_basic';
      }
      if (
        token === 'do' ||
        token === 'does' ||
        picked === 'do' ||
        picked === 'does' ||
        picked === "don't" ||
        picked === "doesn't" ||
        hasRaw(raw, 'negative', 'question', 'отриц', 'вопрос')
      ) {
        return 'verb_present_simple_negative_question';
      }
      if (
        hasRaw(raw, 'present simple statement', 'present simple affirmative', 'habit', 'routine', 'schedule', 'fact', 'state verb', 'be plus base', 'be_plus_base', 'ing instead') ||
        /\b(every day|every morning|every evening|usually|often|always|on mondays|on sundays)\b/.test(phrase)
      ) {
        return 'verb_present_simple_statement';
      }
      if (/(s|es)$/.test(token) || token === 'does' || picked === 'does' || /\b(he|she|it)\b/.test(phrase)) return 'verb_third_person';
      return 'verb_tense';
    case 'to-be':
      if (EXISTENTIAL_FORMS.has(token) || EXISTENTIAL_FORMS.has(picked) || hasRaw(raw, 'existential', 'there is', 'there are', 'is there', 'are there', 'hay')) {
        return 'there_is_are';
      }
      if (token === 'was' || token === 'were' || picked === 'was' || picked === 'were' || hasRaw(raw, 'past')) {
        return 'verb_was_were';
      }
      return 'to_be_present_agreement';
    case 'existential':
      return 'there_is_are';
    case 'modal':
      if (hasMayMightProbabilitySignal(raw, phrase, token, picked)) {
        return 'modal_may_might_probability';
      }
      if (hasCanCouldAbilityRequestSignal(raw, phrase, token, picked)) {
        return 'modal_can_could_ability_request';
      }
      if (hasShouldMustHaveToSignal(raw, phrase, token, picked)) {
        return 'modal_should_must_have_to';
      }
      if (
        hasRaw(raw, 'base', 'structure', 'after modal', 'infinitive', 'question', 'negative') ||
        token === 'to' ||
        picked === 'to' ||
        /\b(can|could|must|should|may|might|would|will|shall)\s+(to\s+)?\w+(s|ed|ing)\b/.test(phrase)
      ) {
        return 'modal_base_form';
      }
      if (MODALS.has(token) || MODALS.has(picked)) return 'modal_force';
      return 'modal_base_form';
    case 'pronoun':
      if (
        hasRaw(raw, 'case', 'subject', 'object', 'after verb', 'after preposition') ||
        SUBJECT_PRONOUNS.has(token) ||
        OBJECT_PRONOUNS.has(token) ||
        SUBJECT_PRONOUNS.has(picked) ||
        OBJECT_PRONOUNS.has(picked)
      ) {
        return 'pronoun_case';
      }
      if (POSSESSIVE_PRONOUNS.has(token) || POSSESSIVE_PRONOUNS.has(picked) || hasRaw(raw, 'possess')) return 'pronoun_possessive';
      return 'pronoun_case';
    case 'adjective':
      if (hasRaw(raw, 'compar', 'superlat') || /(er|est)$/.test(token) || token === 'more' || picked === 'more') return 'adjective_comparison';
      return 'adjective_vs_adverb';
    case 'adverb':
      if (hasVeryReallyQuiteSignal(raw, phrase, token, picked)) return 'modifier_very_really_quite';
      if (FREQUENCY_ADVERBS.has(token) || FREQUENCY_ADVERBS.has(picked)) return 'adverb_frequency_position';
      return 'adjective_vs_adverb';
    case 'modifier':
      if (hasVeryReallyQuiteSignal(raw, phrase, token, picked)) return 'modifier_very_really_quite';
      return 'too_enough';
    case 'conjunction':
      if (CONJUNCTIONS.has(token) || CONJUNCTIONS.has(picked)) return 'conjunction_logic';
      return 'conjunction_logic';
    case 'determiner':
      if (DEMONSTRATIVES.has(token) || DEMONSTRATIVES.has(picked) || hasRaw(raw, 'demonstrative', 'this', 'that', 'these', 'those', 'near', 'far', 'singular', 'plural')) return 'determiner_this_that_these_those';
      if (QUANTIFIERS.has(token) || QUANTIFIERS.has(picked) || hasRaw(raw, 'determiner', 'quantifier', 'some', 'any', 'no')) return 'quantifier_some_any';
      return 'quantifier_some_any';
    case 'phrasal_particle':
      if (PHRASAL_PARTICLES.has(token) || PHRASAL_PARTICLES.has(picked) || hasRaw(raw, 'phrasal')) return 'phrasal_particle_pair';
      return 'phrasal_particle_pair';
    case 'noun':
      if (hasPossessiveApostropheSignal(raw, phrase, token, picked)) {
        return 'noun_possessive_apostrophe_s';
      }
      if (
        /(s|es|ies)$/.test(token) ||
        /(s|es|ies)$/.test(picked) ||
        hasRaw(raw, 'plural', 'singular', 'count', 'uncountable', 'number', 'many', 'few', 'two', 'three', 'a/an', 'article', 'irregular')
      ) {
        return 'noun_singular_plural_basic';
      }
      return 'noun_meaning';
    default:
      return 'category_general';
  }
}

export function getMicroDiagnosisLabel(id?: PosMicroDiagnosisId | null): MicroDiagnosisLabel | null {
  if (!id) return null;
  return LABELS[id]?.label ?? null;
}

export function getMicroDiagnosisCoachLine(id?: PosMicroDiagnosisId | null): MicroDiagnosisLabel | null {
  if (!id) return null;
  return LABELS[id]?.coachLine ?? null;
}

export function inferMicroDiagnosisForMistakes(
  mistakes: PhraseMistakeInput[],
  category: WordCategory,
  extraWords: string[] = [],
): PosMicroDiagnosis | null {
  const counts = new Map<PosMicroDiagnosisId, number>();
  const focus = new Map<string, number>();
  let total = 0;

  for (const input of mistakes) {
    const signal = signalFromInput(input);
    if (!signal) continue;
    total += 1;
    const id = classifySignal(category, signal);
    counts.set(id, (counts.get(id) ?? 0) + 1);
    const word = tokenOf(signal);
    if (word) focus.set(word, (focus.get(word) ?? 0) + 1);
  }

  for (const word of extraWords) {
    const clean = normalizeTokenKey(word);
    if (clean) focus.set(clean, (focus.get(clean) ?? 0) + 1);
  }

  const [id, evidenceCount] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? ['category_general', 0];
  const meta = LABELS[id] ?? LABELS.category_general;

  return {
    id,
    category,
    label: meta.label,
    coachLine: meta.coachLine,
    evidenceCount,
    totalCount: total,
    focusWords: [...focus.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([word]) => word)
      .slice(0, 4),
  };
}
