import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 21 "Предмет — он или она" / noun_gender, builtOn: [17, 18],
// recalls: [3, 18]): единственное word-first слово — libro, «книга»,
// СУЩЕСТВИТЕЛЬНОЕ мужского рода (не прилагательное, как во всех прежних
// word-first сессиях). Проверено grep по всем es_episode_01_session_*.ts —
// libro/casa/mesa/coche/perro/gato ни разу не встречались раньше, слово
// действительно новое. Выбран мужской род на -o (не casa/mesa на -a) —
// самый регулярный, учебниковый паттерн для ПЕРВОГО урока о роде
// существительных: ученик уже знает формулу -o/-a у прилагательных (сессия
// 3), здесь та же формула переносится на сами слова-предметы. El/la — не
// отдельная word-first единица (это служебные слова-артикли, как no/de в
// прошлых сессиях), а обычные позиционные токены внутри фраз ниже.
//
// Категория 'noun' — впервые в этом курсе. У прилагательных (bonito/bonita,
// caro/cara) меняется САМО слово по контексту описываемого; у
// существительного род ЗАФИКСИРОВАН раз и навсегда — libro никогда не
// становится "la libro". Поэтому build_form здесь учит не смену окончания
// (окончания менять нельзя), а согласование АРТИКЛЯ и ПРИЛАГАТЕЛЬНОГО с
// уже данным родом существительного — el libro caro, никогда la libro cara.
const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

export const ES_EPISODE_01_SESSION_21_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'es-e01-s21-word-libro',
    target: 'libro',
    meaning: L({
      ru: 'книга — предмет мужского рода',
      uk: 'книга — предмет чоловічого роду',
      es: 'book — a masculine-gender thing',
      'pt-BR': 'book — a masculine-gender thing',
      vi: 'book — a masculine-gender thing',
      id: 'book — a masculine-gender thing',
      tr: 'book — a masculine-gender thing',
      pl: 'book — a masculine-gender thing',
    }),
    features: ['noun_gender'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Libro звучит с ударением на первый слог — LI-bro, два слога. Она начинается с того же звука l, что и слово la, но заканчивается на -o, а не тянется дольше, как barato или bonito.',
          uk: 'Libro звучить з наголосом на перший склад — LI-bro, два склади. Вона починається з того ж звука l, що й слово la, але коротша за barato чи bonito.',
          es: 'Libro has two syllables with stress on the first — LI-bro. It starts with the same l sound as the word la, but is shorter than barato or bonito.',
          'pt-BR': 'Libro has two syllables with stress on the first — LI-bro. It starts with the same l sound as the word la, but is shorter than barato or bonito.',
          vi: 'Libro has two syllables with stress on the first — LI-bro. It starts with the same l sound as the word la, but is shorter than barato or bonito.',
          id: 'Libro has two syllables with stress on the first — LI-bro. It starts with the same l sound as the word la, but is shorter than barato or bonito.',
          tr: 'Libro has two syllables with stress on the first — LI-bro. It starts with the same l sound as the word la, but is shorter than barato or bonito.',
          pl: 'Libro has two syllables with stress on the first — LI-bro. It starts with the same l sound as the word la, but is shorter than barato or bonito.',
        }),
        [
          {
            value: 'libre',
            reasonCode: 'libro_recognize_libre_wrong_ending',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Libre заканчивается на -e и означает «свободный» — совсем другое слово. Libro заканчивается на -o.',
              uk: 'Libre закінчується на -e і означає «вільний» — зовсім інше слово. Libro закінчується на -o.',
              es: 'Libre ends in -e and means "free" — a completely different word. Libro ends in -o.',
              'pt-BR': 'Libre ends in -e and means "free" — a completely different word. Libro ends in -o.',
              vi: 'Libre ends in -e and means "free" — a completely different word. Libro ends in -o.',
              id: 'Libre ends in -e and means "free" — a completely different word. Libro ends in -o.',
              tr: 'Libre ends in -e and means "free" — a completely different word. Libro ends in -o.',
              pl: 'Libre ends in -e and means "free" — a completely different word. Libro ends in -o.',
            }),
          },
          {
            value: 'litro',
            reasonCode: 'libro_recognize_litro_similar_sound',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Litro звучит очень похоже, но это «литр», мера объёма, а не книга. Libro начинается со звука b после l, litro — со звука t.',
              uk: 'Litro звучить дуже схоже, але це «літр», міра об’єму, а не книга. Libro починається зі звука b після l, litro — зі звука t.',
              es: 'Litro sounds very similar, but it means "liter," a measure of volume, not a book. Libro has a b sound after l, litro has a t sound.',
              'pt-BR': 'Litro sounds very similar, but it means "liter," a measure of volume, not a book. Libro has a b sound after l, litro has a t sound.',
              vi: 'Litro sounds very similar, but it means "liter," a measure of volume, not a book. Libro has a b sound after l, litro has a t sound.',
              id: 'Litro sounds very similar, but it means "liter," a measure of volume, not a book. Libro has a b sound after l, litro has a t sound.',
              tr: 'Litro sounds very similar, but it means "liter," a measure of volume, not a book. Libro has a b sound after l, litro has a t sound.',
              pl: 'Litro sounds very similar, but it means "liter," a measure of volume, not a book. Libro has a b sound after l, litro has a t sound.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Libro называет конкретный предмет — книгу, вещь с обложкой и страницами, а не признак вроде «дорого» или «красиво». Это существительное, а не прилагательное: оно само по себе называет вещь, у него уже есть свой род.',
          uk: 'Libro називає конкретний предмет — книгу, річ з обкладинкою і сторінками, а не ознаку на кшталт «дорого» чи «красиво». Це іменник, а не прикметник: він сам собою називає річ, у нього вже є свій рід.',
          es: 'Libro names a specific thing — a book, an object with a cover and pages, not a quality like "expensive" or "pretty." It is a noun, not an adjective: it names a thing by itself, and it already has its own gender.',
          'pt-BR': 'Libro names a specific thing — a book, an object with a cover and pages, not a quality like "expensive" or "pretty." It is a noun, not an adjective: it names a thing by itself, and it already has its own gender.',
          vi: 'Libro names a specific thing — a book, an object with a cover and pages, not a quality like "expensive" or "pretty." It is a noun, not an adjective: it names a thing by itself, and it already has its own gender.',
          id: 'Libro names a specific thing — a book, an object with a cover and pages, not a quality like "expensive" or "pretty." It is a noun, not an adjective: it names a thing by itself, and it already has its own gender.',
          tr: 'Libro names a specific thing — a book, an object with a cover and pages, not a quality like "expensive" or "pretty." It is a noun, not an adjective: it names a thing by itself, and it already has its own gender.',
          pl: 'Libro names a specific thing — a book, an object with a cover and pages, not a quality like "expensive" or "pretty." It is a noun, not an adjective: it names a thing by itself, and it already has its own gender.',
        }),
        [
          {
            value: 'caro',
            reasonCode: 'libro_meaning_caro_quality_not_thing',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Caro — это признак «дорого», он описывает вещь, но сам вещью не является. Нужно libro — сама вещь.',
              uk: 'Caro — це ознака «дорого», вона описує річ, але сама річчю не є. Потрібно libro — сама річ.',
              es: 'Caro is the quality "expensive" — it describes a thing but is not a thing itself. Libro is needed — the thing itself.',
              'pt-BR': 'Caro is the quality "expensive" — it describes a thing but is not a thing itself. Libro is needed — the thing itself.',
              vi: 'Caro is the quality "expensive" — it describes a thing but is not a thing itself. Libro is needed — the thing itself.',
              id: 'Caro is the quality "expensive" — it describes a thing but is not a thing itself. Libro is needed — the thing itself.',
              tr: 'Caro is the quality "expensive" — it describes a thing but is not a thing itself. Libro is needed — the thing itself.',
              pl: 'Caro is the quality "expensive" — it describes a thing but is not a thing itself. Libro is needed — the thing itself.',
            }),
          },
          {
            value: 'verdad',
            reasonCode: 'libro_meaning_verdad_wrong_noun',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Verdad означает «правда» — тоже существительное, но совсем другой предмет разговора, не книга. Нужно libro.',
              uk: 'Verdad означає «правда» — теж іменник, але зовсім інший предмет розмови, не книга. Потрібно libro.',
              es: 'Verdad means "truth" — also a noun, but a completely different thing being talked about, not a book. Libro is needed.',
              'pt-BR': 'Verdad means "truth" — also a noun, but a completely different thing being talked about, not a book. Libro is needed.',
              vi: 'Verdad means "truth" — also a noun, but a completely different thing being talked about, not a book. Libro is needed.',
              id: 'Verdad means "truth" — also a noun, but a completely different thing being talked about, not a book. Libro is needed.',
              tr: 'Verdad means "truth" — also a noun, but a completely different thing being talked about, not a book. Libro is needed.',
              pl: 'Verdad means "truth" — also a noun, but a completely different thing being talked about, not a book. Libro is needed.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Libro пишется пятью буквами: l-i-b-r-o, без тильды. В отличие от caro/cara, у libro нет пары на -a — это фиксированный мужской род, поэтому рядом с ним всегда стоит el, а признак берёт форму на -o: el libro caro, никогда la libro cara.',
          uk: 'Libro пишеться п’ятьма літерами: l-i-b-r-o, без тильди. На відміну від caro/cara, у libro немає пари на -a — це фіксований чоловічий рід, тому поряд з ним завжди стоїть el, а ознака бере форму на -o: el libro caro, ніколи la libro cara.',
          es: 'Libro is spelled with five letters: l-i-b-r-o, no tilde. Unlike caro/cara, libro has no -a pair — it is fixed masculine gender, so el always stands next to it, and the quality takes the -o form: el libro caro, never la libro cara.',
          'pt-BR': 'Libro is spelled with five letters: l-i-b-r-o, no tilde. Unlike caro/cara, libro has no -a pair — it is fixed masculine gender, so el always stands next to it, and the quality takes the -o form: el libro caro, never la libro cara.',
          vi: 'Libro is spelled with five letters: l-i-b-r-o, no tilde. Unlike caro/cara, libro has no -a pair — it is fixed masculine gender, so el always stands next to it, and the quality takes the -o form: el libro caro, never la libro cara.',
          id: 'Libro is spelled with five letters: l-i-b-r-o, no tilde. Unlike caro/cara, libro has no -a pair — it is fixed masculine gender, so el always stands next to it, and the quality takes the -o form: el libro caro, never la libro cara.',
          tr: 'Libro is spelled with five letters: l-i-b-r-o, no tilde. Unlike caro/cara, libro has no -a pair — it is fixed masculine gender, so el always stands next to it, and the quality takes the -o form: el libro caro, never la libro cara.',
          pl: 'Libro is spelled with five letters: l-i-b-r-o, no tilde. Unlike caro/cara, libro has no -a pair — it is fixed masculine gender, so el always stands next to it, and the quality takes the -o form: el libro caro, never la libro cara.',
        }),
        [
          {
            value: 'libra',
            reasonCode: 'libro_form_libra_no_such_pair',
            trapType: 'grammar',
            feedback: L({
              ru: 'Libra не существует как пара к libro — это не прилагательное вроде barato/barata, а существительное с фиксированным родом. Пишется всегда libro.',
              uk: 'Libra не існує як пара до libro — це не прикметник на кшталт barato/barata, а іменник із фіксованим родом. Пишеться завжди libro.',
              es: 'Libra does not exist as a pair to libro — it is not an adjective like barato/barata, it is a noun with fixed gender. It is always spelled libro.',
              'pt-BR': 'Libra não existe como par de libro — não é um adjetivo como barato/barata, é um substantivo com gênero fixo. Sempre se escreve libro.',
              vi: 'Libra không tồn tại như một cặp với libro — nó không phải tính từ như barato/barata, mà là danh từ có giống cố định. Luôn viết là libro.',
              id: 'Libra tidak ada sebagai pasangan libro — ini bukan kata sifat seperti barato/barata, melainkan kata benda dengan gender tetap. Selalu dieja libro.',
              tr: 'Libra, libro’nun bir eşi olarak mevcut değildir — barato/barata gibi bir sıfat değil, sabit cinsiyetli bir isimdir. Her zaman libro olarak yazılır.',
              pl: 'Libra nie istnieje jako para do libro — to nie przymiotnik jak barato/barata, lecz rzeczownik o stałym rodzaju. Zawsze pisze się libro.',
            }),
          },
          {
            value: 'librro',
            reasonCode: 'libro_form_double_letter_typo',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Проверьте написание внимательно: нужна ровно одна буква -r-, без удвоения — libro, а не librro.',
              uk: 'Перевірте написання уважно: потрібна рівно одна літера -r-, без подвоєння — libro, а не librro.',
              es: 'Check the spelling carefully: exactly one letter -r- is needed, no doubling — libro, not librro.',
              'pt-BR': 'Check the spelling carefully: exactly one letter -r- is needed, no doubling — libro, not librro.',
              vi: 'Check the spelling carefully: exactly one letter -r- is needed, no doubling — libro, not librro.',
              id: 'Check the spelling carefully: exactly one letter -r- is needed, no doubling — libro, not librro.',
              tr: 'Check the spelling carefully: exactly one letter -r- is needed, no doubling — libro, not librro.',
              pl: 'Check the spelling carefully: exactly one letter -r- is needed, no doubling — libro, not librro.',
            }),
          },
        ],
      ),
    },
  },
]);
