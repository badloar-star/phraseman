import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для 15
// фраз сессии 27 на восьми объяснительных локалях (без 'es'). Фабрика d()
// скопирована по прецеденту сессий 17/25 (es_episode_01_session_25_localized_details_v1.ts)
// — общий список distractors на верхнем уровне phrase.localizedDetails[locale]
// собирается из всех позиций слов, как того требует errorExplanationByLocale.
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;
type Details = EpisodeSourcePhraseLocalizedDetails;
type Trap = Details['distractors'][number]['trapType'];
type Reasoned = { value: string; trapType: Trap; reason: Record<LocaleWithoutEs, string> };
type WordSpec = { correct: string; prompt: Record<LocaleWithoutEs, string>; d1: Reasoned; d2: Reasoned };

function d(
  meaning: Record<LocaleWithoutEs, string>,
  explanation: Record<LocaleWithoutEs, string>,
  words: readonly WordSpec[],
): Readonly<Record<LocaleWithoutEs, Details>> {
  const locales: readonly LocaleWithoutEs[] = ['ru', 'uk', 'en', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
  const out = {} as Record<LocaleWithoutEs, Details>;
  for (const l of locales) {
    out[l] = {
      meaning: meaning[l],
      explanation: explanation[l],
      distractors: words.flatMap((w) => [
        { value: w.d1.value, reason: w.d1.reason[l], trapType: w.d1.trapType },
        { value: w.d2.value, reason: w.d2.reason[l], trapType: w.d2.trapType },
      ]),
      words: words.map((w) => ({
        correct: w.correct,
        prompt: w.prompt[l],
        distractors: [
          { value: w.d1.value, reason: w.d1.reason[l], trapType: w.d1.trapType },
          { value: w.d2.value, reason: w.d2.reason[l], trapType: w.d2.trapType },
        ],
      })),
    };
  }
  return Object.freeze(out);
}

const T = {
  sonQ: { ru: 'Какая связка нужна для группы БЕЗ говорящего внутри?', uk: 'Яка зв’язка потрібна для групи БЕЗ мовця всередині?', en: 'Which linking word fits a group WITHOUT the speaker inside?', 'pt-BR': 'Qual ligação cabe a um grupo SEM quem fala dentro?', vi: 'Từ nối nào phù hợp với nhóm KHÔNG có người nói ở trong?', id: 'Kata penghubung mana yang cocok untuk kelompok TANPA penutur di dalamnya?', tr: 'İçinde konuşan OLMAYAN bir grup için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do grupy BEZ mówiącego w środku?' },
  sonLowerQ: { ru: 'Какая связка нужна после No для группы без говорящего?', uk: 'Яка зв’язка потрібна після No для групи без мовця?', en: 'Which linking word is needed after No for a group without the speaker?', 'pt-BR': 'Qual ligação é necessária depois de No para um grupo sem quem fala?', vi: 'Từ nối nào cần sau No cho nhóm không có người nói?', id: 'Kata penghubung mana yang diperlukan setelah No untuk kelompok tanpa penutur?', tr: 'Konuşan olmayan bir grup için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No dla grupy bez mówiącego?' },
  sonAnswerQ: { ru: 'Какой связкой ответить про другую группу без говорящего?', uk: 'Якою зв’язкою відповісти про іншу групу без мовця?', en: 'Which linking word answers about another group without the speaker?', 'pt-BR': 'Qual ligação responde sobre outro grupo sem quem fala?', vi: 'Từ nối nào trả lời về nhóm khác không có người nói?', id: 'Kata penghubung mana yang menjawab tentang kelompok lain tanpa penutur?', tr: 'Konuşan olmayan başka bir grup hakkında hangi bağlaç yanıt verir?', pl: 'Jaki łącznik odpowiada o innej grupie bez mówiącego?' },
  esQ: { ru: 'Какая связка нужна для оценки одного предмета, человека или ситуации?', uk: 'Яка зв’язка потрібна для оцінки одного предмета, людини чи ситуації?', en: 'Which linking word fits evaluating a single thing, person, or situation?', 'pt-BR': 'Qual ligação cabe à avaliação de uma coisa, pessoa ou situação?', vi: 'Từ nối nào phù hợp khi đánh giá một vật, người hay tình huống?', id: 'Kata penghubung mana yang cocok untuk menilai satu benda, orang, atau situasi?', tr: 'Tek bir şeyi, kişiyi ya da durumu değerlendirmek için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do oceny jednej rzeczy, osoby lub sytuacji?' },
  somosQ: { ru: 'Какая связка нужна для группы, включая говорящего?', uk: 'Яка зв’язка потрібна для групи, включно з мовцем?', en: 'Which linking word fits a group that includes the speaker?', 'pt-BR': 'Qual ligação cabe a um grupo que inclui quem fala?', vi: 'Từ nối nào phù hợp với nhóm gồm cả người nói?', id: 'Kata penghubung mana yang cocok untuk kelompok yang mencakup penutur?', tr: 'Konuşanı da içeren bir grup için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do grupy, w tym do mówiącego?' },
  noQ: { ru: 'Каким словом начать возражение?', uk: 'Яким словом почати заперечення?', en: 'Which word starts the pushback?', 'pt-BR': 'Qual palavra inicia a contestação?', vi: 'Từ nào bắt đầu lời phản đối?', id: 'Kata mana yang memulai sanggahan?', tr: 'Karşı çıkış hangi kelimeyle başlar?', pl: 'Jakim słowem zacząć sprzeciw?' },
  tambienQ: { ru: 'Каким словом показать, что признак относится и к другой группе тоже?', uk: 'Яким словом показати, що ознака стосується й іншої групи теж?', en: 'Which word shows that the quality applies to the other group too?', 'pt-BR': 'Qual palavra mostra que a qualidade também vale para o outro grupo?', vi: 'Từ nào cho thấy đặc điểm cũng áp dụng cho nhóm khác?', id: 'Kata mana yang menunjukkan bahwa sifat itu juga berlaku untuk kelompok lain?', tr: 'Niteliğin diğer grup için de geçerli olduğunu hangi kelime gösterir?', pl: 'Jakie słowo pokazuje, że cecha dotyczy też innej grupy?' },
} as const;

const tambienWord: WordSpec = {
  correct: 'también',
  prompt: T.tambienQ,
  d1: { value: 'igual', trapType: 'semantic_neighbor', reason: {
    ru: 'Igual означает «всё равно» — другой смысл, не «тоже». Нужно también.',
    uk: 'Igual означає «байдуже» — інший сенс, не «теж». Потрібно también.',
    en: 'Igual means "indifferent" — a different meaning, not "too". You need también.',
    'pt-BR': 'Igual significa "tanto faz" — um sentido diferente, não "também". Precisa de también.',
    vi: 'Igual nghĩa là "thờ ơ" — một nghĩa khác, không phải "cũng vậy". Cần también.',
    id: 'Igual berarti "tidak peduli" — makna yang berbeda, bukan "juga". Perlu también.',
    tr: 'Igual "fark etmez" demektir — farklı bir anlam, "de/da" değil. también gerekir.',
    pl: 'Igual znaczy „wszystko jedno” — inne znaczenie, nie „też”. Potrzebne jest también.',
  }},
  d2: { value: 'muy', trapType: 'semantic_neighbor', reason: {
    ru: 'Muy означает «очень», не «тоже». Нужно también.',
    uk: 'Muy означає «дуже», не «теж». Потрібно también.',
    en: 'Muy means "very", not "too". You need también.',
    'pt-BR': 'Muy significa "muito", não "também". Precisa de también.',
    vi: 'Muy nghĩa là "rất", không phải "cũng vậy". Cần también.',
    id: 'Muy berarti "sangat", bukan "juga". Perlu también.',
    tr: 'Muy "çok" demektir, "de/da" değil. también gerekir.',
    pl: 'Muy znaczy „bardzo”, nie „też”. Potrzebne jest también.',
  }},
};

function qualityQ(word: string): Record<LocaleWithoutEs, string> {
  return {
    ru: `Какой признак нужен: «${word}»?`,
    uk: `Яка ознака потрібна: «${word}»?`,
    en: `Which quality is needed: "${word}"?`,
    'pt-BR': `Qual qualidade é necessária: "${word}"?`,
    vi: `Đặc điểm nào cần: "${word}"?`,
    id: `Sifat mana yang diperlukan: "${word}"?`,
    tr: `Hangi nitelik gerekir: "${word}"?`,
    pl: `Jaka cecha jest potrzebna: „${word}”?`,
  };
}

function genderQ(masc: boolean): Record<LocaleWithoutEs, string> {
  return masc
    ? { ru: 'Какой признак нужен по умолчанию, для группы мужского рода?', uk: 'Яка ознака потрібна за замовчуванням, для групи чоловічого роду?', en: 'Which quality is needed by default, for a masculine group?', 'pt-BR': 'Qual qualidade é necessária por padrão, para um grupo masculino?', vi: 'Đặc điểm nào cần theo mặc định, cho nhóm giống đực?', id: 'Sifat mana yang diperlukan secara default, untuk kelompok maskulin?', tr: 'Varsayılan olarak, eril bir grup için hangi nitelik gerekir?', pl: 'Jaka cecha jest potrzebna domyślnie, dla grupy rodzaju męskiego?' }
    : { ru: 'Какой признак нужен для группы женского рода?', uk: 'Яка ознака потрібна для групи жіночого роду?', en: 'Which quality is needed for a feminine group?', 'pt-BR': 'Qual qualidade é necessária para um grupo feminino?', vi: 'Đặc điểm nào cần cho nhóm giống cái?', id: 'Sifat mana yang diperlukan untuk kelompok feminin?', tr: 'Dişil bir grup için hangi nitelik gerekir?', pl: 'Jaka cecha jest potrzebna dla grupy rodzaju żeńskiego?' };
}

function singularGenderQ(masc: boolean): Record<LocaleWithoutEs, string> {
  return masc
    ? { ru: 'Какой признак нужен для одного человека мужского рода или по умолчанию?', uk: 'Яка ознака потрібна для однієї людини чоловічого роду чи за замовчуванням?', en: 'Which quality is needed for one masculine or default person?', 'pt-BR': 'Qual qualidade é necessária para uma pessoa masculina ou padrão?', vi: 'Đặc điểm nào cần cho một người giống đực hoặc mặc định?', id: 'Sifat mana yang diperlukan untuk satu orang maskulin atau default?', tr: 'Tek bir eril ya da varsayılan kişi için hangi nitelik gerekir?', pl: 'Jaka cecha jest potrzebna dla jednej osoby rodzaju męskiego lub domyślnie?' }
    : { ru: 'Какой признак нужен для одной женщины?', uk: 'Яка ознака потрібна для однієї жінки?', en: 'Which quality is needed for one woman?', 'pt-BR': 'Qual qualidade é necessária para uma mulher?', vi: 'Đặc điểm nào cần cho một người phụ nữ?', id: 'Sifat mana yang diperlukan untuk satu wanita?', tr: 'Tek bir kadın için hangi nitelik gerekir?', pl: 'Jaka cecha jest potrzebna dla jednej kobiety?' };
}

// зачем centered on person-shift, не number-shift (в отличие от сессии 25,
// где somos отмечалась против soy/son): связка son отмечена distractor'ом
// number_mismatch против es (то же лицо, другое число) и
// agreement_person_mismatch против somos (то же число во множественном,
// другое лицо — включает ли говорящего) — обе ошибки требуют разных
// обоснований по прецеденту somosVsSoyOrSon из сессии 25.
function sonVsEsOrSomos(target: 'Son' | 'son'): { d1: Reasoned; d2: Reasoned } {
  const esWord = target === 'Son' ? 'Es' : 'es';
  const somosWord = target === 'Son' ? 'Somos' : 'somos';
  return {
    d1: { value: esWord, trapType: 'grammar', reason: {
      ru: `${esWord} — только об одном предмете или человеке. Про нескольких «они» — только ${target}.`,
      uk: `${esWord} — тільки про один предмет чи людину. Про кількох «вони» — тільки ${target}.`,
      en: `${esWord} is only about one thing or person. Several "they" need only ${target}.`,
      'pt-BR': `${esWord} é só sobre uma coisa ou pessoa. Vários "eles" precisam só de ${target}.`,
      vi: `${esWord} chỉ nói về một vật hay một người. Nhiều "họ" chỉ cần ${target}.`,
      id: `${esWord} hanya tentang satu benda atau orang. Beberapa "mereka" hanya perlu ${target}.`,
      tr: `${esWord} yalnızca bir şey ya da kişi hakkındadır. Birkaç "onlar" yalnızca ${target} gerektirir.`,
      pl: `${esWord} dotyczy tylko jednej rzeczy lub osoby. Kilku „oni” potrzebuje tylko ${target}.`,
    }},
    d2: { value: somosWord, trapType: 'grammar', reason: {
      ru: `${somosWord} включает самого говорящего в группу. Про «них» без говорящего внутри — ${target}.`,
      uk: `${somosWord} включає самого мовця в групу. Про «них» без мовця всередині — ${target}.`,
      en: `${somosWord} includes the speaker in the group. "They" without the speaker inside need ${target}.`,
      'pt-BR': `${somosWord} inclui quem fala no grupo. "Eles" sem quem fala dentro precisam de ${target}.`,
      vi: `${somosWord} bao gồm chính người nói trong nhóm. "Họ" mà không có người nói ở trong cần ${target}.`,
      id: `${somosWord} mencakup penutur itu sendiri dalam kelompok. "Mereka" tanpa penutur di dalamnya perlu ${target}.`,
      tr: `${somosWord}, konuşanın kendisini de gruba dahil eder. İçinde konuşan olmayan "onlar" ${target} gerektirir.`,
      pl: `${somosWord} obejmuje samego mówiącego w grupie. „Oni” bez mówiącego w środku potrzebują ${target}.`,
    }},
  };
}

function esVsEresOrSon(target: 'Es' | 'es'): { d1: Reasoned; d2: Reasoned } {
  const eresWord = target === 'Es' ? 'Eres' : 'eres';
  const sonWord = target === 'Es' ? 'Son' : 'son';
  return {
    d1: { value: eresWord, trapType: 'grammar', reason: {
      ru: `${eresWord} — обращение к собеседнику напрямую. Оценка третьего лица — только ${target}.`,
      uk: `${eresWord} — звернення до співрозмовника напряму. Оцінка третьої особи — тільки ${target}.`,
      en: `${eresWord} addresses the listener directly. Evaluating a third person needs only ${target}.`,
      'pt-BR': `${eresWord} fala com o interlocutor diretamente. Avaliar uma terceira pessoa precisa só de ${target}.`,
      vi: `${eresWord} nói trực tiếp với người nghe. Đánh giá ngôi thứ ba chỉ cần ${target}.`,
      id: `${eresWord} berbicara langsung dengan pendengar. Menilai orang ketiga hanya perlu ${target}.`,
      tr: `${eresWord} doğrudan dinleyiciyle konuşur. Üçüncü kişiyi değerlendirmek yalnızca ${target} gerektirir.`,
      pl: `${eresWord} zwraca się bezpośrednio do słuchacza. Ocena trzeciej osoby wymaga tylko ${target}.`,
    }},
    d2: { value: sonWord, trapType: 'grammar', reason: {
      ru: `${sonWord} — про нескольких. Первая реплика — только об одном, нужна ${target}.`,
      uk: `${sonWord} — про кількох. Перша репліка — тільки про одного, потрібна ${target}.`,
      en: `${sonWord} is about several. The first line is only about one, so it needs ${target}.`,
      'pt-BR': `${sonWord} é sobre vários. A primeira fala é só sobre um, precisa de ${target}.`,
      vi: `${sonWord} nói về nhiều. Câu đầu chỉ nói về một, cần ${target}.`,
      id: `${sonWord} tentang beberapa. Baris pertama hanya tentang satu, perlu ${target}.`,
      tr: `${sonWord} birkaçı hakkındadır. İlk cümle yalnızca biri hakkındadır, ${target} gerekir.`,
      pl: `${sonWord} dotyczy kilku. Pierwsza kwestia dotyczy tylko jednego, potrzebne jest ${target}.`,
    }},
  };
}

function somosVsSonForAnswer(): { d1: Reasoned; d2: Reasoned } {
  return {
    d1: { value: 'Son', trapType: 'grammar', reason: {
      ru: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — Somos.',
      uk: 'Son — «вони», без мовця в складі групи. Про себе разом із кимось — Somos.',
      en: 'Son means "they", without the speaker in the group. Talking about yourself together with others needs Somos.',
      'pt-BR': 'Son significa "eles", sem quem fala no grupo. Falar de si mesmo junto com outros precisa de Somos.',
      vi: 'Son nghĩa là "họ", không có người nói trong nhóm. Nói về bản thân cùng người khác cần Somos.',
      id: 'Son berarti "mereka", tanpa penutur dalam kelompok. Berbicara tentang diri sendiri bersama orang lain memerlukan Somos.',
      tr: 'Son "onlar" demektir, gruba konuşan dahil değildir. Kendinden başkalarıyla birlikte bahsetmek Somos gerektirir.',
      pl: 'Son znaczy „oni”, bez mówiącego w grupie. Mówienie o sobie razem z kimś wymaga Somos.',
    }},
    d2: { value: 'Soy', trapType: 'grammar', reason: {
      ru: 'Soy — только о себе одном. Про группу, включая говорящего, — Somos.',
      uk: 'Soy — тільки про себе одного. Про групу, включно з мовцем, — Somos.',
      en: 'Soy is only about the speaker alone. A group that includes the speaker needs Somos.',
      'pt-BR': 'Soy é só sobre quem fala sozinho. Um grupo que inclui quem fala precisa de Somos.',
      vi: 'Soy chỉ nói về một mình người nói. Nhóm gồm cả người nói cần Somos.',
      id: 'Soy hanya tentang penutur sendirian. Kelompok yang mencakup penutur perlu Somos.',
      tr: 'Soy yalnızca konuşanın kendisi hakkındadır. Konuşanı da içeren bir grup Somos gerektirir.',
      pl: 'Soy dotyczy tylko samego mówiącego. Grupa obejmująca mówiącego wymaga Somos.',
    }},
  };
}

function sonVsSomosForAnswer(): { d1: Reasoned; d2: Reasoned } {
  return {
    d1: { value: 'somos', trapType: 'grammar', reason: {
      ru: 'Somos включает говорящего в группу. Про другую группу без говорящего — son.',
      uk: 'Somos включає мовця в групу. Про іншу групу без мовця — son.',
      en: 'Somos includes the speaker in the group. Another group without the speaker needs son.',
      'pt-BR': 'Somos inclui quem fala no grupo. Outro grupo sem quem fala precisa de son.',
      vi: 'Somos bao gồm người nói trong nhóm. Nhóm khác không có người nói cần son.',
      id: 'Somos mencakup penutur dalam kelompok. Kelompok lain tanpa penutur perlu son.',
      tr: 'Somos, konuşanı gruba dahil eder. Konuşan olmayan başka bir grup son gerektirir.',
      pl: 'Somos obejmuje mówiącego w grupie. Inna grupa bez mówiącego potrzebuje son.',
    }},
    d2: { value: 'es', trapType: 'grammar', reason: {
      ru: 'Es — только об одном. Про несколько человек — son.',
      uk: 'Es — тільки про одного. Про кількох людей — son.',
      en: 'Es is only about one. Several people need son.',
      'pt-BR': 'Es é só sobre um. Várias pessoas precisam de son.',
      vi: 'Es chỉ nói về một người. Nhiều người cần son.',
      id: 'Es hanya tentang satu orang. Beberapa orang perlu son.',
      tr: 'Es yalnızca bir kişi hakkındadır. Birkaç kişi son gerektirir.',
      pl: 'Es dotyczy tylko jednej osoby. Kilka osób potrzebuje son.',
    }},
  };
}

const M = {
  verdad: { ru: '«правда» (подтверждение факта)', uk: '«правда» (підтвердження факту)', en: '"truth" (confirming a fact)', 'pt-BR': '"verdade" (confirmando um fato)', vi: '"sự thật" (xác nhận sự thật)', id: '"kebenaran" (mengonfirmasi fakta)', tr: '"gerçek" (bir gerçeği onaylamak)', pl: '„prawda” (potwierdzenie faktu)' },
  igual: { ru: '«всё равно» (безразличие)', uk: '«байдуже» (байдужість)', en: '"indifferent" (does not change things)', 'pt-BR': '"tanto faz" (indiferença)', vi: '"thờ ơ" (không thay đổi gì)', id: '"tidak peduli" (ketidakpedulian)', tr: '"fark etmez" (kayıtsızlık)', pl: '„wszystko jedno” (obojętność)' },
  dificil: { ru: '«трудно» (противоположный признак)', uk: '«важко» (протилежна ознака)', en: '"hard" (the opposite quality)', 'pt-BR': '"difícil" (a qualidade oposta)', vi: '"khó" (đặc điểm ngược lại)', id: '"sulit" (sifat sebaliknya)', tr: '"zor" (karşıt nitelik)', pl: '„trudno” (przeciwna cecha)' },
  importante: { ru: '«важно»', uk: '«важливо»', en: '"important"', 'pt-BR': '"importante"', vi: '"quan trọng"', id: '"penting"', tr: '"önemli"', pl: '„ważne”' },
  caro: { ru: '«дорого» (про цену)', uk: '«дорого» (про ціну)', en: '"expensive" (about price)', 'pt-BR': '"caro" (sobre preço)', vi: '"đắt" (về giá)', id: '"mahal" (tentang harga)', tr: '"pahalı" (fiyat hakkında)', pl: '„drogo” (o cenie)' },
  facil: { ru: '«легко»', uk: '«легко»', en: '"easy"', 'pt-BR': '"fácil"', vi: '"dễ"', id: '"mudah"', tr: '"kolay"', pl: '„łatwo”' },
  lento: { ru: '«медленный» (противоположный признак)', uk: '«повільний» (протилежна ознака)', en: '"slow" (the opposite quality)', 'pt-BR': '"lento" (a qualidade oposta)', vi: '"chậm" (đặc điểm ngược lại)', id: '"lambat" (sifat sebaliknya)', tr: '"yavaş" (karşıt nitelik)', pl: '„wolno” (przeciwna cecha)' },
} as const;

function wrongWord(target: string, wrong: string, wrongMeaning: Record<LocaleWithoutEs, string>): Reasoned {
  return { value: wrong, trapType: 'semantic_neighbor', reason: {
    ru: `${wrong} означает ${wrongMeaning.ru} — другой смысл, не то, что нужно здесь. Нужно ${target}.`,
    uk: `${wrong} означає ${wrongMeaning.uk} — інший сенс, не те, що потрібно тут. Потрібно ${target}.`,
    en: `${wrong} means ${wrongMeaning.en} — a different meaning, not what is needed here. You need ${target}.`,
    'pt-BR': `${wrong} significa ${wrongMeaning['pt-BR']} — um sentido diferente, não o que é preciso aqui. Precisa de ${target}.`,
    vi: `${wrong} nghĩa là ${wrongMeaning.vi} — một nghĩa khác, không phải điều cần ở đây. Cần ${target}.`,
    id: `${wrong} berarti ${wrongMeaning.id} — makna yang berbeda, bukan yang diperlukan di sini. Perlu ${target}.`,
    tr: `${wrong}, ${wrongMeaning.tr} demektir — farklı bir anlam, burada gereken bu değil. ${target} gerekir.`,
    pl: `${wrong} znaczy ${wrongMeaning.pl} — inne znaczenie, nie to, czego tu trzeba. Potrzebne jest ${target}.`,
  }};
}

function genderMismatch(correct: string, wrong: string, correctIsMasc: boolean): Reasoned {
  const wrongEnding = correctIsMasc ? '-a' : '-o';
  const correctEnding = correctIsMasc ? '-o' : '-a';
  const note = { ru: ' По умолчанию нужна форма на', uk: ' За замовчуванням потрібна форма на', en: ' By default the', 'pt-BR': ' Por padrão precisa da forma em', vi: ' Theo mặc định cần dạng', id: ' Secara default memerlukan bentuk', tr: ' Varsayılan olarak', pl: ' Domyślnie wymagana jest forma na' };
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма женского рода, с ${wrongEnding}.${note.ru} ${correctEnding}: ${correct}.`,
    uk: `${wrong} — форма жіночого роду, з ${wrongEnding}.${note.uk} ${correctEnding}: ${correct}.`,
    en: `${wrong} is the feminine form, ending in ${wrongEnding}.${note.en} ${correctEnding} form is needed: ${correct}.`,
    'pt-BR': `${wrong} é a forma feminina, terminada em ${wrongEnding}.${note['pt-BR']} ${correctEnding}: ${correct}.`,
    vi: `${wrong} là dạng giống cái, kết thúc bằng ${wrongEnding}.${note.vi} ${correctEnding}: ${correct}.`,
    id: `${wrong} adalah bentuk feminin, berakhiran ${wrongEnding}.${note.id} ${correctEnding}: ${correct}.`,
    tr: `${wrong}, ${wrongEnding} ile biten dişil biçimdir.${note.tr} ${correctEnding} biçimi gerekir: ${correct}.`,
    pl: `${wrong} to forma żeńska, zakończona na ${wrongEnding}.${note.pl} ${correctEnding}: ${correct}.`,
  }};
}

function genderMismatchToFem(correct: string, wrong: string): Reasoned {
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма мужского рода. О женщине нужна форма на -a: ${correct}.`,
    uk: `${wrong} — форма чоловічого роду. Про жінку потрібна форма на -a: ${correct}.`,
    en: `${wrong} is the masculine form. A woman needs the -a form: ${correct}.`,
    'pt-BR': `${wrong} é a forma masculina. Sobre uma mulher precisa da forma em -a: ${correct}.`,
    vi: `${wrong} là dạng giống đực. Về một phụ nữ cần dạng -a: ${correct}.`,
    id: `${wrong} adalah bentuk maskulin. Untuk wanita memerlukan bentuk -a: ${correct}.`,
    tr: `${wrong} eril biçimdir. Bir kadın için -a biçimi gerekir: ${correct}.`,
    pl: `${wrong} to forma męska. O kobiecie mowa wymaga formy na -a: ${correct}.`,
  }};
}

const negationWord: WordSpec = {
  correct: 'No',
  prompt: T.noQ,
  d1: { value: 'Nada', trapType: 'semantic_neighbor', reason: {
    ru: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.',
    uk: 'Nada — «нічого», окреме слово-предмет. Заперечення зв’язки — No.',
    en: 'Nada means "nothing", a separate word for a thing. Negating the linking word needs No.',
    'pt-BR': 'Nada significa "nada", uma palavra separada para uma coisa. Negar a ligação precisa de No.',
    vi: 'Nada nghĩa là "không có gì", một từ riêng chỉ vật. Phủ định từ nối cần No.',
    id: 'Nada berarti "tidak ada apa-apa", kata terpisah untuk benda. Menegasikan kata penghubung perlu No.',
    tr: 'Nada "hiçbir şey" demektir, bir şey için ayrı bir kelimedir. Bağlacı olumsuzlamak No gerektirir.',
    pl: 'Nada znaczy „nic”, osobne słowo oznaczające rzecz. Zaprzeczenie łącznika wymaga No.',
  }},
  d2: { value: 'Non', trapType: 'orthographic', reason: {
    ru: 'Non — не испанское слово. В испанском отрицание пишется No.',
    uk: 'Non — не іспанське слово. В іспанській заперечення пишеться No.',
    en: 'Non is not a Spanish word. Spanish spells the negation No.',
    'pt-BR': 'Non não é uma palavra espanhola. Em espanhol a negação se escreve No.',
    vi: 'Non không phải là từ tiếng Tây Ban Nha. Trong tiếng Tây Ban Nha phủ định viết là No.',
    id: 'Non bukan kata bahasa Spanyol. Dalam bahasa Spanyol negasi ditulis No.',
    tr: 'Non İspanyolca bir kelime değildir. İspanyolcada olumsuzlama No olarak yazılır.',
    pl: 'Non nie jest hiszpańskim słowem. W hiszpańskim przeczenie zapisuje się No.',
  }},
};

const nuncaNegationWord: WordSpec = {
  correct: 'No',
  prompt: T.noQ,
  d1: { value: 'Nunca', trapType: 'semantic_neighbor', reason: {
    ru: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.',
    uk: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — No.',
    en: 'Nunca means "never", about frequency in time. Simple negation needs No.',
    'pt-BR': 'Nunca significa "nunca", sobre frequência no tempo. Negação simples precisa de No.',
    vi: 'Nunca nghĩa là "không bao giờ", về tần suất thời gian. Phủ định đơn giản cần No.',
    id: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Negasi sederhana perlu No.',
    tr: 'Nunca "asla" demektir, zaman sıklığı hakkındadır. Basit olumsuzlama No gerektirir.',
    pl: 'Nunca znaczy „nigdy”, dotyczy częstotliwości w czasie. Proste przeczenie wymaga No.',
  }},
  d2: { value: 'Non', trapType: 'orthographic', reason: {
    ru: 'Non — не испанское слово. В испанском отрицание пишется No.',
    uk: 'Non — не іспанське слово. В іспанській заперечення пишеться No.',
    en: 'Non is not a Spanish word. Spanish spells the negation No.',
    'pt-BR': 'Non não é uma palavra espanhola. Em espanhol a negação se escreve No.',
    vi: 'Non không phải là từ tiếng Tây Ban Nha. Trong tiếng Tây Ban Nha phủ định viết là No.',
    id: 'Non bukan kata bahasa Spanyol. Dalam bahasa Spanyol negasi ditulis No.',
    tr: 'Non İspanyolca bir kelime değildir. İspanyolcada olumsuzlama No olarak yazılır.',
    pl: 'Non nie jest hiszpańskim słowem. W hiszpańskim przeczenie zapisuje się No.',
  }},
};

const deWord: WordSpec = {
  correct: 'de',
  prompt: { ru: 'Какое слово стоит внутри формулы согласия?', uk: 'Яке слово стоїть усередині формули згоди?', en: 'Which word sits inside the agreement formula?', 'pt-BR': 'Qual palavra fica dentro da fórmula de concordância?', vi: 'Từ nào nằm trong công thức đồng ý?', id: 'Kata mana yang berada di dalam rumus persetujuan?', tr: 'Onay formülünün içinde hangi kelime bulunur?', pl: 'Jakie słowo znajduje się wewnątrz formuły zgody?' },
  d1: { value: 'muy', trapType: 'semantic_neighbor', reason: {
    ru: 'Muy означает «очень», не входит в формулу согласия. Нужно de.',
    uk: 'Muy означає «дуже», не входить у формулу згоди. Потрібно de.',
    en: 'Muy means "very" and is not part of the agreement formula. You need de.',
    'pt-BR': 'Muy significa "muito" e não faz parte da fórmula de concordância. Precisa de de.',
    vi: 'Muy nghĩa là "rất" và không thuộc công thức đồng ý. Cần de.',
    id: 'Muy berarti "sangat" dan bukan bagian dari rumus persetujuan. Perlu de.',
    tr: 'Muy "çok" demektir ve onay formülünün parçası değildir. de gerekir.',
    pl: 'Muy znaczy „bardzo” i nie jest częścią formuły zgody. Potrzebne jest de.',
  }},
  d2: { value: 'tan', trapType: 'semantic_neighbor', reason: {
    ru: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.',
    uk: 'Tan означає «настільки», не входить у формулу згоди. Потрібно de.',
    en: 'Tan means "so much" and is not part of the agreement formula. You need de.',
    'pt-BR': 'Tan significa "tão" e não faz parte da fórmula de concordância. Precisa de de.',
    vi: 'Tan nghĩa là "đến mức" và không thuộc công thức đồng ý. Cần de.',
    id: 'Tan berarti "sedemikian" dan bukan bagian dari rumus persetujuan. Perlu de.',
    tr: 'Tan "o kadar" demektir ve onay formülünün parçası değildir. de gerekir.',
    pl: 'Tan znaczy „tak bardzo” i nie jest częścią formuły zgody. Potrzebne jest de.',
  }},
};

const ACUERDO_PROMPT: Record<LocaleWithoutEs, string> = { ru: 'Какое слово заканчивает формулу согласия?', uk: 'Яке слово завершує формулу згоди?', en: 'Which word finishes the agreement formula?', 'pt-BR': 'Qual palavra termina a fórmula de concordância?', vi: 'Từ nào kết thúc công thức đồng ý?', id: 'Kata mana yang mengakhiri rumus persetujuan?', tr: 'Onay formülünü hangi kelime tamamlar?', pl: 'Jakie słowo kończy formułę zgody?' };

// зачем фабрика, а не константа: gate distractor_option_set_copied запрещает
// одинаковый набор дистракторов у разных ответов (así и acuerdo) в одной
// сессии — так же, как в сессии 25, второй дистрактор acuerdo варьируется
// по фразам (caro/importante/difícil/fácil), сохраняя точное совпадение с
// массивом distractors в phrases-файле.
const acuerdoWordWith = (altWord: string, altMeaning: Record<LocaleWithoutEs, string>): WordSpec => ({
  correct: 'acuerdo',
  prompt: ACUERDO_PROMPT,
  d1: wrongWord('acuerdo', altWord, altMeaning),
  d2: wrongWord('acuerdo', 'verdad', M.verdad),
});

const asiWord = (prompt: Record<LocaleWithoutEs, string> = qualityQ('así')): WordSpec => ({
  correct: 'así',
  prompt,
  d1: wrongWord('así', 'verdad', M.verdad),
  d2: wrongWord('así', 'igual', M.igual),
});

export const ES_SESSION_27_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s27-son-asi': d(
    { ru: 'Они такие', uk: 'Вони такі', en: 'That is how they are', 'pt-BR': 'São assim', vi: 'Họ là như vậy', id: 'Mereka begitu', tr: 'Onlar böyle', pl: 'Tacy są' },
    { ru: 'Так говорят о характере группы людей, в которую не входит сам говорящий — просто «они». Así не меняется никогда, а связка son показывает третье лицо множественного числа.', uk: 'Так говорять про характер групи людей, до якої не входить сам мовець — просто «вони». Así не змінюється ніколи, а зв’язка son показує третю особу множини.', en: 'This is how you talk about the character of a group that does not include the speaker — simply "them". Así never changes, and the linking word son shows the third-person plural.', 'pt-BR': 'É assim que se fala do caráter de um grupo do qual quem fala não faz parte — simplesmente "eles". Así nunca muda, e a ligação son mostra a terceira pessoa do plural.', vi: 'Đây là cách nói về tính cách của một nhóm mà người nói không thuộc về — đơn giản là "họ". Así không bao giờ đổi, và từ nối son cho thấy ngôi thứ ba số nhiều.', id: 'Beginilah cara berbicara tentang karakter kelompok yang tidak mencakup penutur — sekadar "mereka". Así tidak pernah berubah, dan kata penghubung son menunjukkan orang ketiga jamak.', tr: 'Konuşanın dahil olmadığı bir grubun karakteri hakkında böyle bahsedilir — yalnızca "onlar". Así asla değişmez, ve bağlaç son üçüncü çoğul şahsı gösterir.', pl: 'Tak mówi się o charakterze grupy, do której nie należy sam mówiący — po prostu „oni”. Así nigdy się nie zmienia, a łącznik son pokazuje trzecią osobę liczby mnogiej.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsEsOrSomos('Son') },
      asiWord(),
    ],
  ),
  'es-e01-s27-no-son-asi': d(
    { ru: 'Они не такие', uk: 'Вони не такі', en: 'That is not how they are', 'pt-BR': 'Não são assim', vi: 'Họ không phải như vậy', id: 'Mereka tidak begitu', tr: 'Onlar öyle değil', pl: 'Nie tacy są' },
    { ru: 'Отрицание группового описания — возражение чужому обобщению о них. No встаёт перед связкой, así остаётся без изменений, как и во всех прошлых отрицаниях.', uk: 'Заперечення групового опису — заперечення чужому узагальненню про них. No стає перед зв’язкою, así лишається без змін, як і в усіх минулих запереченнях.', en: 'This negates a description of the group — pushing back on someone else\'s generalization about them. No comes before the linking word, así stays unchanged, as in all earlier negations.', 'pt-BR': 'Isso nega uma descrição do grupo — contestando a generalização de outra pessoa sobre eles. No vem antes da ligação, así fica sem mudanças, como em todas as negações anteriores.', vi: 'Đây là phủ định mô tả về nhóm — phản bác lời khái quát của người khác về họ. No đứng trước từ nối, así không đổi, giống như trong mọi phủ định trước đó.', id: 'Ini menegasikan deskripsi kelompok — menyanggah generalisasi orang lain tentang mereka. No berada sebelum kata penghubung, así tetap tidak berubah, seperti pada semua negasi sebelumnya.', tr: 'Bu, grup hakkındaki bir tanımı olumsuzlar — başkasının onlar hakkındaki genellemesine karşı çıkar. No bağlaçtan önce gelir, así değişmeden kalır, tıpkı önceki tüm olumsuzlamalarda olduğu gibi.', pl: 'To zaprzecza opisowi grupy — sprzeciwia się cudzemu uogólnieniu na ich temat. No stoi przed łącznikiem, así pozostaje bez zmian, jak we wszystkich wcześniejszych przeczeniach.' },
    [
      negationWord,
      { correct: 'son', prompt: T.sonLowerQ, ...sonVsEsOrSomos('son') },
      asiWord(),
    ],
  ),
  'es-e01-s27-son-asi-verdad-q': d(
    { ru: 'Они такие, правда?', uk: 'Вони такі, правда?', en: 'They are like that, right?', 'pt-BR': 'São assim, verdade?', vi: 'Họ là như vậy, đúng không?', id: 'Mereka begitu, benar kan?', tr: 'Onlar böyle, değil mi?', pl: 'Tacy są, prawda?' },
    { ru: 'Утверждение о группе без говорящего внутри с хвостовым вопросом-подтверждением. Recall слова verdad из первой сессии — не как отдельная реакция, а как короткий вопрос «правда?» в конце фразы.', uk: 'Твердження про групу без мовця всередині з хвостовим питанням-підтвердженням. Recall слова verdad із першої сесії — не як окрема реакція, а як коротке питання «правда?» наприкінці фрази.', en: 'A statement about a group without the speaker inside, with a tag question confirming it. Recall of the word verdad from the first session — not as a standalone reaction, but as a short "right?" at the end of the phrase.', 'pt-BR': 'Uma afirmação sobre um grupo sem quem fala dentro, com uma pergunta de confirmação no final. Recall da palavra verdad da primeira sessão — não como reação isolada, mas como um curto "não é?" no fim da frase.', vi: 'Một câu khẳng định về nhóm không có người nói ở trong, kèm câu hỏi đuôi xác nhận. Ôn lại từ verdad từ bài đầu tiên — không phải phản ứng độc lập, mà là câu hỏi ngắn "đúng không?" ở cuối câu.', id: 'Sebuah pernyataan tentang kelompok tanpa penutur di dalamnya, dengan pertanyaan penegas di akhir. Mengingat kembali kata verdad dari sesi pertama — bukan sebagai reaksi berdiri sendiri, melainkan pertanyaan pendek "benar kan?" di akhir frasa.', tr: 'İçinde konuşan olmayan bir grup hakkında bir ifade ve sonunda onu doğrulayan bir etiket soru. İlk oturumdan verdad kelimesinin hatırlanması — bağımsız bir tepki olarak değil, ifadenin sonunda kısa bir "değil mi?" olarak.', pl: 'Stwierdzenie o grupie bez mówiącego w środku, z pytaniem potwierdzającym na końcu. Przypomnienie słowa verdad z pierwszej sesji — nie jako samodzielna reakcja, lecz jako krótkie „prawda?” na końcu frazy.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsEsOrSomos('Son') },
      { correct: 'así', prompt: qualityQ('así'), d1: wrongWord('así', 'igual', M.igual), d2: wrongWord('así', 'importante', M.importante) },
      { correct: 'verdad', prompt: { ru: 'Каким коротким вопросом подтвердить сказанное?', uk: 'Яким коротким питанням підтвердити сказане?', en: 'Which short question confirms what was just said?', 'pt-BR': 'Qual pergunta curta confirma o que foi dito?', vi: 'Câu hỏi ngắn nào xác nhận điều vừa nói?', id: 'Pertanyaan pendek mana yang menegaskan apa yang baru dikatakan?', tr: 'Az önce söyleneni hangi kısa soru doğrular?', pl: 'Jakie krótkie pytanie potwierdza to, co powiedziano?' }, d1: wrongWord('verdad', 'acuerdo', { ru: '«согласие» (с чужим мнением)', uk: '«згода» (з чужою думкою)', en: '"agreement" (with someone else\'s opinion)', 'pt-BR': '"acordo" (com a opinião de outra pessoa)', vi: '"đồng ý" (với ý kiến người khác)', id: '"persetujuan" (dengan pendapat orang lain)', tr: '"onay" (başkasının görüşüyle)', pl: '„zgoda” (z cudzą opinią)' }), d2: wrongWord('verdad', 'igual', M.igual) },
    ],
  ),
  'es-e01-s27-es-rapido-son-rapidos': d(
    { ru: 'Он быстрый; они быстрые', uk: 'Він швидкий; вони швидкі', en: 'He is fast; they are fast', 'pt-BR': 'Ele é rápido; são rápidos', vi: 'Anh ấy nhanh; họ nhanh', id: 'Dia cepat; mereka cepat', tr: 'O hızlı; onlar hızlı', pl: 'On jest szybki; oni są szybcy' },
    { ru: 'Диалог из оценки одного и обобщения на группу без говорящего. Recall связки es из сессии про предмет или третье лицо единственного числа, ответ — son перед формой множественного числа rápidos.', uk: 'Діалог із оцінки одного та узагальнення на групу без мовця. Recall зв’язки es із сесії про предмет чи третю особу однини, відповідь — son перед формою множини rápidos.', en: 'A dialogue evaluating one person and generalizing to a group without the speaker. Recall of the linking word es from the thing-or-third-person-singular session, the reply is son before the plural form rápidos.', 'pt-BR': 'Um diálogo de avaliação de uma pessoa e generalização para um grupo sem quem fala. Recall da ligação es da sessão de coisa ou terceira pessoa do singular, a resposta é son antes da forma plural rápidos.', vi: 'Đoạn hội thoại đánh giá một người và khái quát cho một nhóm không có người nói. Ôn lại từ nối es từ bài về vật hay ngôi thứ ba số ít, câu trả lời là son trước dạng số nhiều rápidos.', id: 'Dialog menilai satu orang dan menggeneralisasi ke kelompok tanpa penutur. Mengingat kembali kata penghubung es dari sesi benda atau orang ketiga tunggal, jawabannya adalah son sebelum bentuk jamak rápidos.', tr: 'Bir kişiyi değerlendiren ve konuşan olmayan bir gruba genelleyen bir diyalog. Şey-veya-üçüncü-tekil-şahıs oturumundan bağlaç es’in hatırlanması, yanıt çoğul biçim rápidos’tan önce son’dur.', pl: 'Dialog oceniający jedną osobę i uogólniający na grupę bez mówiącego. Przypomnienie łącznika es z sesji o rzeczy lub trzeciej osobie liczby pojedynczej, odpowiedzią jest son przed formą mnogą rápidos.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsEresOrSon('Es') },
      { correct: 'rápido', prompt: singularGenderQ(true), d1: genderMismatch('rápido', 'rápida', false), d2: wrongWord('rápido', 'lento', M.lento) },
      { correct: 'son', prompt: T.sonAnswerQ, ...sonVsSomosForAnswer() },
      { correct: 'rápidos', prompt: genderQ(true), d1: { value: 'rápido', trapType: 'grammar', reason: {
        ru: 'Rápido — форма единственного числа. Ответ про группу — форма множественного числа: rápidos.',
        uk: 'Rápido — форма однини. Відповідь про групу — форма множини: rápidos.',
        en: 'Rápido is the singular form. The reply about a group needs the plural form: rápidos.',
        'pt-BR': 'Rápido é a forma singular. A resposta sobre um grupo precisa da forma plural: rápidos.',
        vi: 'Rápido là dạng số ít. Câu trả lời về nhóm cần dạng số nhiều: rápidos.',
        id: 'Rápido adalah bentuk tunggal. Jawaban tentang kelompok memerlukan bentuk jamak: rápidos.',
        tr: 'Rápido tekil biçimdir. Grup hakkındaki yanıt çoğul biçim gerektirir: rápidos.',
        pl: 'Rápido to forma pojedyncza. Odpowiedź o grupie wymaga formy mnogiej: rápidos.',
      }}, d2: genderMismatch('rápidos', 'rápidas', false) },
    ],
  ),
  'es-e01-s27-somos-rapidos-son-rapidos-tambien': d(
    { ru: 'Мы быстрые, они тоже быстрые', uk: 'Ми швидкі, вони теж швидкі', en: 'We are fast, they are fast too', 'pt-BR': 'Somos rápidos, são rápidos também', vi: 'Chúng tôi nhanh, họ cũng nhanh', id: 'Kami cepat, mereka juga cepat', tr: 'Biz hızlıyız, onlar da hızlı', pl: 'Jesteśmy szybcy, oni też są szybcy' },
    { ru: 'Диалог из утверждения о своей группе и признания того же качества за другой группой. Recall связки somos из сессии про говорящего с группой, ответ — son о группе без говорящего, признак rápidos не меняется.', uk: 'Діалог із твердження про свою групу й визнання тієї ж якості за іншою групою. Recall зв’язки somos із сесії про мовця з групою, відповідь — son про групу без мовця, ознака rápidos не змінюється.', en: 'A dialogue stating something about one\'s own group and acknowledging the same quality in another group. Recall of the linking word somos from the speaker-with-group session, the reply is son about a group without the speaker, the quality rápidos does not change.', 'pt-BR': 'Um diálogo afirmando algo sobre o próprio grupo e reconhecendo a mesma qualidade em outro grupo. Recall da ligação somos da sessão de quem fala com o grupo, a resposta é son sobre um grupo sem quem fala, a qualidade rápidos não muda.', vi: 'Đoạn hội thoại khẳng định điều gì đó về nhóm của mình và công nhận cùng đặc điểm đó ở nhóm khác. Ôn lại từ nối somos từ bài về người nói cùng nhóm, câu trả lời là son về nhóm không có người nói, đặc điểm rápidos không đổi.', id: 'Dialog menyatakan sesuatu tentang kelompok sendiri dan mengakui sifat yang sama pada kelompok lain. Mengingat kembali kata penghubung somos dari sesi penutur dengan kelompok, jawabannya adalah son tentang kelompok tanpa penutur, sifat rápidos tidak berubah.', tr: 'Kendi grubu hakkında bir şey belirten ve aynı niteliği başka bir grupta kabul eden bir diyalog. Konuşan-grupla oturumundan bağlaç somos’un hatırlanması, yanıt konuşan olmayan bir grup hakkında son’dur, nitelik rápidos değişmez.', pl: 'Dialog stwierdzający coś o własnej grupie i uznający tę samą cechę w innej grupie. Przypomnienie łącznika somos z sesji o mówiącym z grupą, odpowiedzią jest son o grupie bez mówiącego, cecha rápidos się nie zmienia.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonForAnswer() },
      { correct: 'rápidos', prompt: genderQ(true), d1: { value: 'rápido', trapType: 'grammar', reason: {
        ru: 'Rápido — форма единственного числа. Про группу нужна форма множественного числа: rápidos.',
        uk: 'Rápido — форма однини. Про групу потрібна форма множини: rápidos.',
        en: 'Rápido is the singular form. A group needs the plural form: rápidos.',
        'pt-BR': 'Rápido é a forma singular. Um grupo precisa da forma plural: rápidos.',
        vi: 'Rápido là dạng số ít. Nhóm cần dạng số nhiều: rápidos.',
        id: 'Rápido adalah bentuk tunggal. Kelompok memerlukan bentuk jamak: rápidos.',
        tr: 'Rápido tekil biçimdir. Grup çoğul biçim gerektirir: rápidos.',
        pl: 'Rápido to forma pojedyncza. Grupa wymaga formy mnogiej: rápidos.',
      }}, d2: genderMismatch('rápidos', 'rápidas', false) },
      { correct: 'son', prompt: T.sonAnswerQ, ...sonVsSomosForAnswer() },
      { correct: 'rápidos', prompt: genderQ(true), d1: { value: 'rápido', trapType: 'grammar', reason: {
        ru: 'Rápido — форма единственного числа. Про другую группу тоже нужна форма множественного числа: rápidos.',
        uk: 'Rápido — форма однини. Про іншу групу теж потрібна форма множини: rápidos.',
        en: 'Rápido is the singular form. The other group also needs the plural form: rápidos.',
        'pt-BR': 'Rápido é a forma singular. O outro grupo também precisa da forma plural: rápidos.',
        vi: 'Rápido là dạng số ít. Nhóm khác cũng cần dạng số nhiều: rápidos.',
        id: 'Rápido adalah bentuk tunggal. Kelompok lain juga memerlukan bentuk jamak: rápidos.',
        tr: 'Rápido tekil biçimdir. Diğer grup da çoğul biçim gerektirir: rápidos.',
        pl: 'Rápido to forma pojedyncza. Inna grupa również wymaga formy mnogiej: rápidos.',
      }}, d2: genderMismatch('rápidos', 'rápidas', false) },
      tambienWord,
    ],
  ),
  'es-e01-s27-son-de-acuerdo': d(
    { ru: 'Они согласны', uk: 'Вони згодні', en: 'They agree', 'pt-BR': 'Concordam', vi: 'Họ đồng ý', id: 'Mereka setuju', tr: 'Onlar aynı fikirde', pl: 'Oni się zgadzają' },
    { ru: 'Так говорят о согласии группы людей, в которую говорящий не входит. De acuerdo не меняется никогда, а связка son показывает, что согласны именно «они», а не «мы».', uk: 'Так говорять про згоду групи людей, до якої мовець не входить. De acuerdo не змінюється ніколи, а зв’язка son показує, що згодні саме «вони», а не «ми».', en: 'This is how you talk about the agreement of a group the speaker is not part of. De acuerdo never changes, and the linking word son shows it is "they", not "we", who agree.', 'pt-BR': 'É assim que se fala da concordância de um grupo do qual quem fala não faz parte. De acuerdo nunca muda, e a ligação son mostra que quem concorda são "eles", não "nós".', vi: 'Đây là cách nói về sự đồng ý của một nhóm mà người nói không thuộc về. De acuerdo không bao giờ đổi, và từ nối son cho thấy chính "họ" đồng ý, không phải "chúng tôi".', id: 'Beginilah cara berbicara tentang persetujuan kelompok yang tidak mencakup penutur. De acuerdo tidak pernah berubah, dan kata penghubung son menunjukkan bahwa yang setuju adalah "mereka", bukan "kami".', tr: 'Konuşanın parçası olmadığı bir grubun onayı hakkında böyle bahsedilir. De acuerdo asla değişmez, ve bağlaç son, aynı fikirde olanın "biz" değil "onlar" olduğunu gösterir.', pl: 'Tak mówi się o zgodzie grupy, do której mówiący nie należy. De acuerdo nigdy się nie zmienia, a łącznik son pokazuje, że zgadzają się właśnie „oni”, a nie „my”.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsEsOrSomos('Son') },
      deWord,
      acuerdoWordWith('caro', M.caro),
    ],
  ),
  'es-e01-s27-son-de-acuerdo-q-es-verdad': d(
    { ru: 'Они согласны? Это правда', uk: 'Вони згодні? Це правда', en: 'Do they agree? That is true', 'pt-BR': 'Concordam? É verdade', vi: 'Họ có đồng ý không? Đó là sự thật', id: 'Apakah mereka setuju? Itu benar', tr: 'Onlar aynı fikirde mi? Bu doğru', pl: 'Czy się zgadzają? To prawda' },
    { ru: 'Вопрос о согласии группы людей без говорящего внутри и подтверждение факта в ответ. Формула de acuerdo не меняется в вопросе, а Es verdad — recall безличной реакции из первой сессии.', uk: 'Питання про згоду групи людей без мовця всередині й підтвердження факту у відповідь. Формула de acuerdo не змінюється в питанні, а Es verdad — recall безособової реакції з першої сесії.', en: 'A question about the agreement of a group without the speaker inside, and a confirmation of a fact in reply. The formula de acuerdo does not change in the question, and Es verdad is a recall of the impersonal reaction from the first session.', 'pt-BR': 'Uma pergunta sobre a concordância de um grupo sem quem fala dentro, e uma confirmação de fato como resposta. A fórmula de acuerdo não muda na pergunta, e Es verdad é um recall da reação impessoal da primeira sessão.', vi: 'Câu hỏi về sự đồng ý của một nhóm không có người nói ở trong, và xác nhận sự thật để trả lời. Công thức de acuerdo không đổi trong câu hỏi, còn Es verdad là ôn lại phản ứng vô nhân xưng từ bài đầu tiên.', id: 'Pertanyaan tentang persetujuan kelompok tanpa penutur di dalamnya, dan konfirmasi fakta sebagai jawaban. Rumus de acuerdo tidak berubah dalam pertanyaan, dan Es verdad adalah mengingat kembali reaksi impersonal dari sesi pertama.', tr: 'İçinde konuşan olmayan bir grubun onayı hakkında bir soru ve yanıt olarak bir gerçeğin doğrulanması. de acuerdo formülü soruda değişmez, ve Es verdad ilk oturumdan kişisiz tepkinin hatırlanmasıdır.', pl: 'Pytanie o zgodę grupy bez mówiącego w środku i potwierdzenie faktu w odpowiedzi. Formuła de acuerdo nie zmienia się w pytaniu, a Es verdad to przypomnienie bezosobowej reakcji z pierwszej sesji.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsEsOrSomos('Son') },
      deWord,
      acuerdoWordWith('importante', M.importante),
      { correct: 'Es', prompt: T.esQ, ...esVsEresOrSon('Es') },
      { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'igual', M.igual), d2: wrongWord('verdad', 'acuerdo', { ru: '«согласие» (с мнением)', uk: '«згода» (з думкою)', en: '"agreement" (with an opinion)', 'pt-BR': '"acordo" (com uma opinião)', vi: '"đồng ý" (với ý kiến)', id: '"persetujuan" (dengan pendapat)', tr: '"onay" (bir görüşle)', pl: '„zgoda” (z opinią)' }) },
    ],
  ),
  'es-e01-s27-no-son-de-acuerdo': d(
    { ru: 'Они не согласны', uk: 'Вони не згодні', en: 'They do not agree', 'pt-BR': 'Não concordam', vi: 'Họ không đồng ý', id: 'Mereka tidak setuju', tr: 'Onlar aynı fikirde değil', pl: 'Nie zgadzają się' },
    { ru: 'Отрицание группового согласия — говорящий сообщает, что «они» против. No встаёт перед связкой, de acuerdo остаётся неизменной формулой, как и в прошлых отрицаниях.', uk: 'Заперечення групової згоди — мовець повідомляє, що «вони» проти. No стає перед зв’язкою, de acuerdo лишається незмінною формулою, як і в минулих запереченнях.', en: 'This negates group agreement — the speaker reports that "they" are against it. No comes before the linking word, de acuerdo remains an unchanged formula, as in earlier negations.', 'pt-BR': 'Isso nega a concordância do grupo — quem fala relata que "eles" são contra. No vem antes da ligação, de acuerdo permanece uma fórmula inalterada, como em negações anteriores.', vi: 'Đây là phủ định sự đồng ý của nhóm — người nói cho biết "họ" phản đối. No đứng trước từ nối, de acuerdo vẫn là công thức không đổi, giống như trong các phủ định trước đó.', id: 'Ini menegasikan persetujuan kelompok — penutur melaporkan bahwa "mereka" menentang. No berada sebelum kata penghubung, de acuerdo tetap menjadi rumus yang tidak berubah, seperti pada negasi sebelumnya.', tr: 'Bu, grup onayını olumsuzlar — konuşan "onların" karşı olduğunu bildirir. No bağlaçtan önce gelir, de acuerdo önceki olumsuzlamalarda olduğu gibi değişmeyen bir formül olarak kalır.', pl: 'To zaprzecza zgodzie grupy — mówiący donosi, że „oni” są przeciw. No stoi przed łącznikiem, de acuerdo pozostaje niezmienną formułą, jak we wcześniejszych przeczeniach.' },
    [
      negationWord,
      { correct: 'son', prompt: T.sonLowerQ, ...sonVsEsOrSomos('son') },
      deWord,
      acuerdoWordWith('fácil', M.facil),
    ],
  ),
  'es-e01-s27-es-bonita-son-bonitas': d(
    { ru: 'Она красивая; они красивые', uk: 'Вона красива; вони красиві', en: 'She is pretty; they are pretty', 'pt-BR': 'Ela é bonita; são bonitas', vi: 'Cô ấy đẹp; họ đẹp', id: 'Dia cantik; mereka cantik', tr: 'O güzel; onlar güzel', pl: 'Ona jest ładna; one są ładne' },
    { ru: 'Диалог из оценки внешности одной женщины и обобщения на группу женского рода без говорящего. Recall связки es и признака bonita, ответ — son перед формой множественного числа bonitas.', uk: 'Діалог із оцінки зовнішності однієї жінки та узагальнення на групу жіночого роду без мовця. Recall зв’язки es і ознаки bonita, відповідь — son перед формою множини bonitas.', en: 'A dialogue evaluating the looks of one woman and generalizing to a feminine group without the speaker. Recall of the linking word es and the quality bonita, the reply is son before the plural form bonitas.', 'pt-BR': 'Um diálogo de avaliação da aparência de uma mulher e generalização para um grupo feminino sem quem fala. Recall da ligação es e da qualidade bonita, a resposta é son antes da forma plural bonitas.', vi: 'Đoạn hội thoại đánh giá ngoại hình của một phụ nữ và khái quát cho nhóm giống cái không có người nói. Ôn lại từ nối es và đặc điểm bonita, câu trả lời là son trước dạng số nhiều bonitas.', id: 'Dialog menilai penampilan satu wanita dan menggeneralisasi ke kelompok feminin tanpa penutur. Mengingat kembali kata penghubung es dan sifat bonita, jawabannya adalah son sebelum bentuk jamak bonitas.', tr: 'Bir kadının görünüşünü değerlendiren ve konuşan olmayan dişil bir gruba genelleyen bir diyalog. Bağlaç es ve nitelik bonita’nın hatırlanması, yanıt çoğul biçim bonitas’tan önce son’dur.', pl: 'Dialog oceniający wygląd jednej kobiety i uogólniający na grupę rodzaju żeńskiego bez mówiącego. Przypomnienie łącznika es i cechy bonita, odpowiedzią jest son przed formą mnogą bonitas.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsEresOrSon('Es') },
      { correct: 'bonita', prompt: singularGenderQ(false), d1: genderMismatchToFem('bonita', 'bonito'), d2: wrongWord('bonita', 'cara', M.caro) },
      { correct: 'son', prompt: T.sonAnswerQ, ...sonVsSomosForAnswer() },
      { correct: 'bonitas', prompt: genderQ(false), d1: { value: 'bonitos', trapType: 'grammar', reason: {
        ru: 'Bonitos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: bonitas.',
        uk: 'Bonitos — форма чоловічого роду множини. Для групи жіночого роду потрібна форма на -as: bonitas.',
        en: 'Bonitos is the masculine plural form. A feminine group needs the -as form: bonitas.',
        'pt-BR': 'Bonitos é a forma masculina plural. Um grupo feminino precisa da forma em -as: bonitas.',
        vi: 'Bonitos là dạng số nhiều giống đực. Nhóm giống cái cần dạng -as: bonitas.',
        id: 'Bonitos adalah bentuk jamak maskulin. Kelompok feminin memerlukan bentuk -as: bonitas.',
        tr: 'Bonitos eril çoğul biçimdir. Dişil bir grup -as biçimi gerektirir: bonitas.',
        pl: 'Bonitos to forma męska mnoga. Grupa rodzaju żeńskiego wymaga formy na -as: bonitas.',
      }}, d2: { value: 'bonita', trapType: 'grammar', reason: {
        ru: 'Bonita — форма единственного числа. Про группу нужна форма множественного числа: bonitas.',
        uk: 'Bonita — форма однини. Про групу потрібна форма множини: bonitas.',
        en: 'Bonita is the singular form. A group needs the plural form: bonitas.',
        'pt-BR': 'Bonita é a forma singular. Um grupo precisa da forma plural: bonitas.',
        vi: 'Bonita là dạng số ít. Nhóm cần dạng số nhiều: bonitas.',
        id: 'Bonita adalah bentuk tunggal. Kelompok memerlukan bentuk jamak: bonitas.',
        tr: 'Bonita tekil biçimdir. Grup çoğul biçim gerektirir: bonitas.',
        pl: 'Bonita to forma pojedyncza. Grupa wymaga formy mnogiej: bonitas.',
      }} },
    ],
  ),
  'es-e01-s27-son-unicos': d(
    { ru: 'Они единственные в своём роде', uk: 'Вони єдині в своєму роді', en: 'They are one of a kind', 'pt-BR': 'São únicos', vi: 'Họ có một không hai', id: 'Mereka satu-satunya', tr: 'Onlar eşsiz', pl: 'Są jedyni w swoim rodzaju' },
    { ru: 'Так говорят о неповторимости группы мужского рода или смешанной по умолчанию, в которую говорящий не входит. Тильда над ú остаётся на месте, окончание -os показывает множественное число.', uk: 'Так говорять про неповторність групи чоловічого роду чи змішаної за замовчуванням, до якої мовець не входить. Тильда над ú лишається на місці, закінчення -os показує множину.', en: 'This is how you talk about the uniqueness of a masculine or default-mixed group the speaker is not part of. The accent over ú stays in place, the ending -os shows the plural.', 'pt-BR': 'É assim que se fala da singularidade de um grupo masculino ou misto por padrão do qual quem fala não faz parte. O acento sobre ú permanece no lugar, a terminação -os mostra o plural.', vi: 'Đây là cách nói về sự độc nhất của một nhóm giống đực hoặc hỗn hợp mặc định mà người nói không thuộc về. Dấu trên ú vẫn giữ nguyên, đuôi -os cho thấy số nhiều.', id: 'Beginilah cara berbicara tentang keunikan kelompok maskulin atau campuran default yang tidak mencakup penutur. Aksen di atas ú tetap ada, akhiran -os menunjukkan jamak.', tr: 'Konuşanın parçası olmadığı eril ya da varsayılan karma bir grubun eşsizliği hakkında böyle bahsedilir. ú üzerindeki aksan yerinde kalır, -os sonu çoğulu gösterir.', pl: 'Tak mówi się o wyjątkowości grupy rodzaju męskiego lub domyślnie mieszanej, do której mówiący nie należy. Akcent nad ú pozostaje na miejscu, końcówka -os pokazuje liczbę mnogą.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsEsOrSomos('Son') },
      { correct: 'únicos', prompt: genderQ(true), d1: genderMismatch('únicos', 'únicas', false), d2: { value: 'unicos', trapType: 'orthographic', reason: {
        ru: 'Unicos без тильды над ú звучал бы и писался бы иначе. Нужна форма с тильдой: únicos.',
        uk: 'Unicos без тильди над ú звучало б і писалося б інакше. Потрібна форма з тильдою: únicos.',
        en: 'Unicos without the accent over ú would sound and look different. The accented form is needed: únicos.',
        'pt-BR': 'Unicos sem o acento sobre ú soaria e se escreveria diferente. Precisa da forma com acento: únicos.',
        vi: 'Unicos không có dấu trên ú sẽ đọc và viết khác đi. Cần dạng có dấu: únicos.',
        id: 'Unicos tanpa aksen di atas ú akan terdengar dan terlihat berbeda. Diperlukan bentuk dengan aksen: únicos.',
        tr: 'ú üzerinde aksan olmayan unicos farklı okunur ve yazılırdı. Aksanlı biçim gerekir: únicos.',
        pl: 'Unicos bez akcentu nad ú brzmiałoby i zapisywałoby się inaczej. Potrzebna jest forma z akcentem: únicos.',
      }} },
    ],
  ),
  'es-e01-s27-son-unicas': d(
    { ru: 'Они единственные в своём роде (о группе женского рода)', uk: 'Вони єдині в своєму роді (про групу жіночого роду)', en: 'They are one of a kind (a feminine group)', 'pt-BR': 'São únicas', vi: 'Họ có một không hai (nhóm giống cái)', id: 'Mereka satu-satunya (kelompok feminin)', tr: 'Onlar eşsiz (dişil grup)', pl: 'Są jedyne w swoim rodzaju (grupa żeńska)' },
    { ru: 'Та же неповторимость, но про группу женского рода без говорящего внутри. Único переходит сразу в обе формы согласования: единственное → множественное и мужской → женский род.', uk: 'Та сама неповторність, але про групу жіночого роду без мовця всередині. Único переходить одразу в обидві форми узгодження: однина → множина і чоловічий → жіночий рід.', en: 'The same uniqueness, but for a feminine group without the speaker inside. Único shifts along both agreement axes at once: singular → plural and masculine → feminine.', 'pt-BR': 'A mesma singularidade, mas para um grupo feminino sem quem fala dentro. Único muda ao mesmo tempo em ambos os eixos de concordância: singular → plural e masculino → feminino.', vi: 'Cùng sự độc nhất đó, nhưng cho nhóm giống cái không có người nói ở trong. Único chuyển đổi cả hai trục hòa hợp cùng lúc: số ít → số nhiều và giống đực → giống cái.', id: 'Keunikan yang sama, tetapi untuk kelompok feminin tanpa penutur di dalamnya. Único berubah pada kedua sumbu kesesuaian sekaligus: tunggal → jamak dan maskulin → feminin.', tr: 'Aynı eşsizlik, ama içinde konuşan olmayan dişil bir grup için. Único her iki uyum eksenini birden değiştirir: tekil → çoğul ve eril → dişil.', pl: 'Ta sama wyjątkowość, ale dla grupy rodzaju żeńskiego bez mówiącego w środku. Único zmienia się jednocześnie na obu osiach: liczba pojedyncza → mnoga i rodzaj męski → żeński.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsEsOrSomos('Son') },
      { correct: 'únicas', prompt: genderQ(false), d1: { value: 'únicos', trapType: 'grammar', reason: {
        ru: 'Únicos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: únicas.',
        uk: 'Únicos — форма чоловічого роду множини. Для групи жіночого роду потрібна форма на -as: únicas.',
        en: 'Únicos is the masculine plural form. A feminine group needs the -as form: únicas.',
        'pt-BR': 'Únicos é a forma masculina plural. Um grupo feminino precisa da forma em -as: únicas.',
        vi: 'Únicos là dạng số nhiều giống đực. Nhóm giống cái cần dạng -as: únicas.',
        id: 'Únicos adalah bentuk jamak maskulin. Kelompok feminin memerlukan bentuk -as: únicas.',
        tr: 'Únicos eril çoğul biçimdir. Dişil bir grup -as biçimi gerektirir: únicas.',
        pl: 'Únicos to forma męska mnoga. Grupa rodzaju żeńskiego wymaga formy na -as: únicas.',
      }}, d2: { value: 'única', trapType: 'grammar', reason: {
        ru: 'Única — форма единственного числа. Про группу нужна форма множественного числа: únicas.',
        uk: 'Única — форма однини. Про групу потрібна форма множини: únicas.',
        en: 'Única is the singular form. A group needs the plural form: únicas.',
        'pt-BR': 'Única é a forma singular. Um grupo precisa da forma plural: únicas.',
        vi: 'Única là dạng số ít. Nhóm cần dạng số nhiều: únicas.',
        id: 'Única adalah bentuk tunggal. Kelompok memerlukan bentuk jamak: únicas.',
        tr: 'Única tekil biçimdir. Grup çoğul biçim gerektirir: únicas.',
        pl: 'Única to forma pojedyncza. Grupa wymaga formy mnogiej: únicas.',
      }} },
    ],
  ),
  'es-e01-s27-son-dificiles': d(
    { ru: 'Они сложные (в общении)', uk: 'Вони складні (у спілкуванні)', en: 'They are difficult (to deal with)', 'pt-BR': 'São difíceis', vi: 'Họ khó (khi giao tiếp)', id: 'Mereka sulit (diajak berhubungan)', tr: 'Onlar zor (iletişimde)', pl: 'Są trudni (w kontakcie)' },
    { ru: 'Difícil заканчивается на согласную -l, поэтому во множественном числе получает не -s, а -es: difíciles. Признак не различается по роду — форма одна и для мужчин, и для женщин.', uk: 'Difícil закінчується на приголосну -l, тому в множині отримує не -s, а -es: difíciles. Ознака не розрізняється за родом — форма одна й для чоловіків, і для жінок.', en: 'Difícil ends in the consonant -l, so in the plural it takes -es, not -s: difíciles. The quality does not vary by gender — one form fits both men and women.', 'pt-BR': 'Difícil termina em consoante -l, então no plural recebe -es, não -s: difíciles. A qualidade não varia por gênero — uma forma serve tanto para homens quanto para mulheres.', vi: 'Difícil kết thúc bằng phụ âm -l, nên ở số nhiều nhận -es, không phải -s: difíciles. Đặc điểm này không phân biệt giống — một dạng dùng cho cả nam và nữ.', id: 'Difícil berakhiran konsonan -l, jadi dalam bentuk jamak mendapat -es, bukan -s: difíciles. Sifat ini tidak berbeda menurut gender — satu bentuk untuk pria maupun wanita.', tr: 'Difícil sessiz -l ile biter, bu yüzden çoğulda -s değil -es alır: difíciles. Nitelik cinsiyete göre değişmez — hem erkekler hem kadınlar için tek biçim vardır.', pl: 'Difícil kończy się spółgłoską -l, więc w liczbie mnogiej otrzymuje -es, a nie -s: difíciles. Cecha nie różni się rodzajem — jedna forma pasuje i do mężczyzn, i do kobiet.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsEsOrSomos('Son') },
      { correct: 'difíciles', prompt: qualityQ('difíciles'), d1: wrongWord('difíciles', 'fáciles', M.facil), d2: { value: 'difícil', trapType: 'grammar', reason: {
        ru: 'Difícil — форма единственного числа. Про группу нужна форма множественного числа: difíciles.',
        uk: 'Difícil — форма однини. Про групу потрібна форма множини: difíciles.',
        en: 'Difícil is the singular form. A group needs the plural form: difíciles.',
        'pt-BR': 'Difícil é a forma singular. Um grupo precisa da forma plural: difíciles.',
        vi: 'Difícil là dạng số ít. Nhóm cần dạng số nhiều: difíciles.',
        id: 'Difícil adalah bentuk tunggal. Kelompok memerlukan bentuk jamak: difíciles.',
        tr: 'Difícil tekil biçimdir. Grup çoğul biçim gerektirir: difíciles.',
        pl: 'Difícil to forma pojedyncza. Grupa wymaga formy mnogiej: difíciles.',
      }} },
    ],
  ),
  'es-e01-s27-no-son-faciles': d(
    { ru: 'Они не простые (в общении)', uk: 'Вони не прості (у спілкуванні)', en: 'They are not easy (to deal with)', 'pt-BR': 'Não são fáceis', vi: 'Họ không dễ (khi giao tiếp)', id: 'Mereka tidak mudah (diajak berhubungan)', tr: 'Onlar kolay değil (iletişimde)', pl: 'Nie są prości (w kontakcie)' },
    { ru: 'Отрицание согласной формы множественного числа без говорящего внутри группы. No встаёт перед son, fáciles сохраняет окончание -es, как и в утвердительной форме.', uk: 'Заперечення приголосної форми множини без мовця всередині групи. No стає перед son, fáciles зберігає закінчення -es, як і в стверджувальній формі.', en: 'A negation of the consonant plural form for a group without the speaker inside. No comes before son, fáciles keeps the -es ending, just as in the affirmative form.', 'pt-BR': 'Uma negação da forma plural consonantal para um grupo sem quem fala dentro. No vem antes de son, fáciles mantém a terminação -es, assim como na forma afirmativa.', vi: 'Phủ định dạng số nhiều phụ âm cho nhóm không có người nói ở trong. No đứng trước son, fáciles giữ đuôi -es, giống như trong dạng khẳng định.', id: 'Negasi bentuk jamak konsonan untuk kelompok tanpa penutur di dalamnya. No berada sebelum son, fáciles mempertahankan akhiran -es, sama seperti dalam bentuk afirmatif.', tr: 'Konuşan olmayan bir grup için sessiz çoğul biçimin olumsuzlanması. No son’dan önce gelir, fáciles olumlu biçimde olduğu gibi -es sonunu korur.', pl: 'Zaprzeczenie spółgłoskowej formy mnogiej dla grupy bez mówiącego w środku. No stoi przed son, fáciles zachowuje końcówkę -es, tak jak w formie twierdzącej.' },
    [
      nuncaNegationWord,
      { correct: 'son', prompt: T.sonLowerQ, ...sonVsEsOrSomos('son') },
      { correct: 'fáciles', prompt: qualityQ('fáciles'), d1: { value: 'facil', trapType: 'orthographic', reason: {
        ru: 'Facil без ударения над a читалось бы иначе. Нужна форма множественного числа с ударением: fáciles.',
        uk: 'Facil без наголосу над a читалося б інакше. Потрібна форма множини з наголосом: fáciles.',
        en: 'Facil without the accent over a would sound different. The accented plural form is needed: fáciles.',
        'pt-BR': 'Facil sem o acento sobre a soaria diferente. Precisa da forma plural com acento: fáciles.',
        vi: 'Facil không có dấu trên a sẽ đọc khác đi. Cần dạng số nhiều có dấu: fáciles.',
        id: 'Facil tanpa aksen di atas a akan terdengar berbeda. Diperlukan bentuk jamak dengan aksen: fáciles.',
        tr: 'a üzerinde aksan olmayan facil farklı okunurdu. Aksanlı çoğul biçim gerekir: fáciles.',
        pl: 'Facil bez akcentu nad a brzmiałoby inaczej. Potrzebna jest forma mnoga z akcentem: fáciles.',
      }}, d2: wrongWord('fáciles', 'difíciles', M.dificil) },
    ],
  ),
  'es-e01-s27-es-caro-son-caros': d(
    { ru: 'Это дорого; они дорогие', uk: 'Це дорого; вони дорогі', en: 'It is expensive; they are expensive', 'pt-BR': 'É caro; são caros', vi: 'Cái đó đắt; chúng đắt', id: 'Itu mahal; mereka mahal', tr: 'Bu pahalı; onlar pahalı', pl: 'To drogie; one są drogie' },
    { ru: 'Диалог из оценки цены одного предмета и обобщения на несколько предметов. Recall связки es и признака caro из восемнадцатой сессии, ответ — son перед формой множественного числа caros.', uk: 'Діалог із оцінки ціни одного предмета й узагальнення на кілька предметів. Recall зв’язки es і ознаки caro з вісімнадцятої сесії, відповідь — son перед формою множини caros.', en: 'A dialogue evaluating the price of one thing and generalizing to several things. Recall of the linking word es and the quality caro from the eighteenth session, the reply is son before the plural form caros.', 'pt-BR': 'Um diálogo de avaliação do preço de uma coisa e generalização para várias coisas. Recall da ligação es e da qualidade caro da décima oitava sessão, a resposta é son antes da forma plural caros.', vi: 'Đoạn hội thoại đánh giá giá của một vật và khái quát cho nhiều vật. Ôn lại từ nối es và đặc điểm caro từ bài thứ mười tám, câu trả lời là son trước dạng số nhiều caros.', id: 'Dialog menilai harga satu benda dan menggeneralisasi ke beberapa benda. Mengingat kembali kata penghubung es dan sifat caro dari sesi kedelapan belas, jawabannya adalah son sebelum bentuk jamak caros.', tr: 'Bir şeyin fiyatını değerlendiren ve birkaç şeye genelleyen bir diyalog. On sekizinci oturumdan bağlaç es ve nitelik caro’nun hatırlanması, yanıt çoğul biçim caros’tan önce son’dur.', pl: 'Dialog oceniający cenę jednej rzeczy i uogólniający na kilka rzeczy. Przypomnienie łącznika es i cechy caro z osiemnastej sesji, odpowiedzią jest son przed formą mnogą caros.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsEresOrSon('Es') },
      { correct: 'caro', prompt: singularGenderQ(true), d1: genderMismatch('caro', 'cara', false), d2: wrongWord('caro', 'fácil', M.facil) },
      { correct: 'son', prompt: T.sonAnswerQ, ...sonVsSomosForAnswer() },
      { correct: 'caros', prompt: genderQ(true), d1: { value: 'caro', trapType: 'grammar', reason: {
        ru: 'Caro — форма единственного числа. Про несколько предметов нужна форма множественного числа: caros.',
        uk: 'Caro — форма однини. Про кілька предметів потрібна форма множини: caros.',
        en: 'Caro is the singular form. Several things need the plural form: caros.',
        'pt-BR': 'Caro é a forma singular. Várias coisas precisam da forma plural: caros.',
        vi: 'Caro là dạng số ít. Nhiều vật cần dạng số nhiều: caros.',
        id: 'Caro adalah bentuk tunggal. Beberapa benda memerlukan bentuk jamak: caros.',
        tr: 'Caro tekil biçimdir. Birkaç şey çoğul biçim gerektirir: caros.',
        pl: 'Caro to forma pojedyncza. Kilka rzeczy wymaga formy mnogiej: caros.',
      }}, d2: genderMismatch('caros', 'caras', false) },
    ],
  ),
  'es-e01-s27-somos-de-acuerdo-son-de-acuerdo-tambien': d(
    { ru: 'Мы согласны, они тоже согласны', uk: 'Ми згодні, вони теж згодні', en: 'We agree, they agree too', 'pt-BR': 'Concordamos, concordam também', vi: 'Chúng tôi đồng ý, họ cũng đồng ý', id: 'Kami setuju, mereka juga setuju', tr: 'Biz aynı fikirdeyiz, onlar da aynı fikirde', pl: 'Zgadzamy się, oni też się zgadzają' },
    { ru: 'Диалог из группового согласия говорящего и признания того же согласия за другой группой. Recall связки somos из сессии про говорящего с группой, ответ — son о другой группе, формула de acuerdo не меняется.', uk: 'Діалог із групової згоди мовця й визнання тієї ж згоди за іншою групою. Recall зв’язки somos із сесії про мовця з групою, відповідь — son про іншу групу, формула de acuerdo не змінюється.', en: 'A dialogue about the speaker\'s group agreeing and acknowledging the same agreement in another group. Recall of the linking word somos from the speaker-with-group session, the reply is son about another group, the formula de acuerdo does not change.', 'pt-BR': 'Um diálogo sobre a concordância do grupo de quem fala e o reconhecimento da mesma concordância em outro grupo. Recall da ligação somos da sessão de quem fala com o grupo, a resposta é son sobre outro grupo, a fórmula de acuerdo não muda.', vi: 'Đoạn hội thoại về sự đồng ý của nhóm người nói và công nhận cùng sự đồng ý đó ở nhóm khác. Ôn lại từ nối somos từ bài về người nói cùng nhóm, câu trả lời là son về nhóm khác, công thức de acuerdo không đổi.', id: 'Dialog tentang persetujuan kelompok penutur dan pengakuan persetujuan yang sama pada kelompok lain. Mengingat kembali kata penghubung somos dari sesi penutur dengan kelompok, jawabannya adalah son tentang kelompok lain, rumus de acuerdo tidak berubah.', tr: 'Konuşanın grubunun onayı ve aynı onayın başka bir grupta kabul edilmesi hakkında bir diyalog. Konuşan-grupla oturumundan bağlaç somos’un hatırlanması, yanıt başka bir grup hakkında son’dur, de acuerdo formülü değişmez.', pl: 'Dialog o zgodzie grupy mówiącego i uznaniu tej samej zgody w innej grupie. Przypomnienie łącznika somos z sesji o mówiącym z grupą, odpowiedzią jest son o innej grupie, formuła de acuerdo się nie zmienia.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonForAnswer() },
      deWord,
      acuerdoWordWith('caro', M.caro),
      { correct: 'son', prompt: T.sonAnswerQ, ...sonVsSomosForAnswer() },
      deWord,
      acuerdoWordWith('difícil', M.dificil),
      tambienWord,
    ],
  ),
});
