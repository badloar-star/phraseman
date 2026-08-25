import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для 15
// фраз сессии 25 на восьми объяснительных локалях (без 'es'). Фабрика d()
// скопирована по прецеденту сессии 17 (es_episode_01_session_17_localized_details_v1.ts)
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
  somosQ: { ru: 'Какая связка нужна для группы, включая говорящего?', uk: 'Яка зв’язка потрібна для групи, включно з мовцем?', en: 'Which linking word fits a group that includes the speaker?', 'pt-BR': 'Qual ligação cabe a um grupo que inclui quem fala?', vi: 'Từ nối nào phù hợp với nhóm gồm cả người nói?', id: 'Kata penghubung mana yang cocok untuk kelompok yang mencakup penutur?', tr: 'Konuşanı da içeren bir grup için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do grupy, w tym do mówiącego?' },
  somosLowerQ: { ru: 'Какая связка нужна после No для группы, включая говорящего?', uk: 'Яка зв’язка потрібна після No для групи, включно з мовцем?', en: 'Which linking word is needed after No for a group that includes the speaker?', 'pt-BR': 'Qual ligação é necessária depois de No para um grupo que inclui quem fala?', vi: 'Từ nối nào cần sau No cho nhóm gồm cả người nói?', id: 'Kata penghubung mana yang diperlukan setelah No untuk kelompok yang mencakup penutur?', tr: 'Konuşanı da içeren bir grup için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No dla grupy, w tym dla mówiącego?' },
  eresQ: { ru: 'Какая связка нужна при обращении к собеседнику?', uk: 'Яка зв’язка потрібна при зверненні до співрозмовника?', en: 'Which linking word is needed when addressing the listener?', 'pt-BR': 'Qual ligação é necessária ao falar com o interlocutor?', vi: 'Từ nối nào cần khi nói với người nghe?', id: 'Kata penghubung mana yang diperlukan saat berbicara dengan pendengar?', tr: 'Dinleyiciyle konuşurken hangi bağlayıcı gerekir?', pl: 'Jaki łącznik jest potrzebny przy zwracaniu się do słuchacza?' },
  esQ: { ru: 'Какая связка нужна для оценки предмета или ситуации?', uk: 'Яка зв’язка потрібна для оцінки предмета чи ситуації?', en: 'Which linking word fits evaluating a thing or situation?', 'pt-BR': 'Qual ligação cabe à avaliação de uma coisa ou situação?', vi: 'Từ nối nào phù hợp khi đánh giá một vật hay tình huống?', id: 'Kata penghubung mana yang cocok untuk menilai benda atau situasi?', tr: 'Bir şeyi ya da durumu değerlendirmek için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do oceny rzeczy lub sytuacji?' },
  soyQ: { ru: 'Какая связка нужна, когда говоришь только о себе?', uk: 'Яка зв’язка потрібна, коли говориш тільки про себе?', en: 'Which linking word is needed when talking only about yourself?', 'pt-BR': 'Qual ligação é necessária ao falar só de si mesmo?', vi: 'Từ nối nào cần khi chỉ nói về bản thân?', id: 'Kata penghubung mana yang diperlukan saat berbicara hanya tentang diri sendiri?', tr: 'Yalnızca kendinden bahsederken hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny, gdy mówi się tylko o sobie?' },
  noQ: { ru: 'Каким словом начать возражение?', uk: 'Яким словом почати заперечення?', en: 'Which word starts the pushback?', 'pt-BR': 'Qual palavra inicia a contestação?', vi: 'Từ nào bắt đầu lời phản đối?', id: 'Kata mana yang memulai sanggahan?', tr: 'Karşı çıkış hangi kelimeyle başlar?', pl: 'Jakim słowem zacząć sprzeciw?' },
} as const;

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
    ? { ru: 'Какой признак нужен для собеседника мужского рода?', uk: 'Яка ознака потрібна для співрозмовника чоловічого роду?', en: 'Which quality is needed for a masculine listener?', 'pt-BR': 'Qual qualidade é necessária para um interlocutor masculino?', vi: 'Đặc điểm nào cần cho người nghe giống đực?', id: 'Sifat mana yang diperlukan untuk pendengar maskulin?', tr: 'Eril bir dinleyici için hangi nitelik gerekir?', pl: 'Jaka cecha jest potrzebna dla słuchacza męskiego?' }
    : { ru: 'Какой признак нужен для предмета мужского рода или по умолчанию?', uk: 'Яка ознака потрібна для предмета чоловічого роду чи за замовчуванням?', en: 'Which quality is needed for a masculine or default noun?', 'pt-BR': 'Qual qualidade é necessária para um substantivo masculino ou padrão?', vi: 'Đặc điểm nào cần cho danh từ giống đực hoặc mặc định?', id: 'Sifat mana yang diperlukan untuk kata benda maskulin atau default?', tr: 'Eril ya da varsayılan bir isim için hangi nitelik gerekir?', pl: 'Jaka cecha jest potrzebna dla rzeczownika męskiego lub domyślnego?' };
}

// зачем centered on number-shift, не person-shift: связка somos отмечена
// distractor'ом number_mismatch против soy (то же лицо, другое число) и
// agreement_person_mismatch против son (другое лицо, то же число во
// множественном) — обе ошибки требуют разных обоснований по прецеденту
// esVsEresOrSoy из сессии 17.
function somosVsSoyOrSon(target: 'Somos' | 'somos'): { d1: Reasoned; d2: Reasoned } {
  const soyWord = target === 'Somos' ? 'Soy' : 'soy';
  const sonWord = target === 'Somos' ? 'Son' : 'son';
  return {
    d1: { value: soyWord, trapType: 'grammar', reason: {
      ru: `${soyWord} — только о себе одном. Про группу, включая говорящего, — только ${target}.`,
      uk: `${soyWord} — тільки про себе одного. Про групу, включно з мовцем, — тільки ${target}.`,
      en: `${soyWord} is only about the speaker alone. A group that includes the speaker needs only ${target}.`,
      'pt-BR': `${soyWord} é só sobre quem fala sozinho. Um grupo que inclui quem fala precisa só de ${target}.`,
      vi: `${soyWord} chỉ nói về một mình người nói. Nhóm gồm cả người nói chỉ cần ${target}.`,
      id: `${soyWord} hanya tentang penutur sendirian. Kelompok yang mencakup penutur hanya perlu ${target}.`,
      tr: `${soyWord} yalnızca konuşanın kendisi hakkındadır. Konuşanı da içeren bir grup yalnızca ${target} gerektirir.`,
      pl: `${soyWord} dotyczy tylko samego mówiącego. Grupa obejmująca mówiącego wymaga tylko ${target}.`,
    }},
    d2: { value: sonWord, trapType: 'grammar', reason: {
      ru: `${sonWord} — «они», без говорящего в составе группы. Про себя вместе с кем-то — ${target}.`,
      uk: `${sonWord} — «вони», без мовця в складі групи. Про себе разом із кимось — ${target}.`,
      en: `${sonWord} means "they", without the speaker in the group. Talking about yourself together with others needs ${target}.`,
      'pt-BR': `${sonWord} significa "eles", sem quem fala no grupo. Falar de si mesmo junto com outros precisa de ${target}.`,
      vi: `${sonWord} nghĩa là "họ", không có người nói trong nhóm. Nói về bản thân cùng người khác cần ${target}.`,
      id: `${sonWord} berarti "mereka", tanpa penutur dalam kelompok. Berbicara tentang diri sendiri bersama orang lain memerlukan ${target}.`,
      tr: `${sonWord} "onlar" demektir, gruba konuşan dahil değildir. Kendinden başkalarıyla birlikte bahsetmek ${target} gerektirir.`,
      pl: `${sonWord} znaczy „oni”, bez mówiącego w grupie. Mówienie o sobie razem z kimś wymaga ${target}.`,
    }},
  };
}

function eresVsEsOrSomos(target: 'Eres' | 'eres'): { d1: Reasoned; d2: Reasoned } {
  const esWord = target === 'Eres' ? 'Es' : 'es';
  return {
    d1: { value: esWord, trapType: 'grammar', reason: {
      ru: `${esWord} — про предмет или третье лицо. Обращение к собеседнику напрямую — только ${target}.`,
      uk: `${esWord} — про предмет чи третю особу. Звернення до співрозмовника напряму — тільки ${target}.`,
      en: `${esWord} is about a thing or a third person. Addressing the listener directly needs only ${target}.`,
      'pt-BR': `${esWord} é sobre uma coisa ou terceira pessoa. Falar com o interlocutor diretamente precisa só de ${target}.`,
      vi: `${esWord} nói về một vật hay ngôi thứ ba. Nói trực tiếp với người nghe chỉ cần ${target}.`,
      id: `${esWord} tentang benda atau orang ketiga. Berbicara langsung dengan pendengar hanya perlu ${target}.`,
      tr: `${esWord} bir şey ya da üçüncü kişi hakkındadır. Dinleyiciyle doğrudan konuşmak yalnızca ${target} gerektirir.`,
      pl: `${esWord} dotyczy rzeczy lub trzeciej osoby. Zwracanie się bezpośrednio do słuchacza wymaga tylko ${target}.`,
    }},
    d2: { value: 'Somos', trapType: 'grammar', reason: {
      ru: 'Somos — про группу с говорящим. Первая реплика — только о собеседнике одном, нужна ' + target + '.',
      uk: 'Somos — про групу з мовцем. Перша репліка — тільки про співрозмовника одного, потрібна ' + target + '.',
      en: 'Somos is about a group with the speaker in it. The first line is only about the listener alone, so it needs ' + target + '.',
      'pt-BR': 'Somos é sobre um grupo com quem fala dentro dele. A primeira fala é só sobre o interlocutor sozinho, precisa de ' + target + '.',
      vi: 'Somos nói về nhóm có người nói ở trong. Câu đầu chỉ nói về một mình người nghe, cần ' + target + '.',
      id: 'Somos tentang kelompok dengan penutur di dalamnya. Baris pertama hanya tentang pendengar sendirian, perlu ' + target + '.',
      tr: 'Somos, içinde konuşanın da bulunduğu bir grup hakkındadır. İlk cümle yalnızca dinleyicinin kendisi hakkındadır, ' + target + ' gerekir.',
      pl: 'Somos dotyczy grupy z mówiącym w środku. Pierwsza kwestia dotyczy tylko samego słuchacza, potrzebne jest ' + target + '.',
    }},
  };
}

function esVsEresOrSomos(target: 'Es' | 'es'): { d1: Reasoned; d2: Reasoned } {
  const eresWord = target === 'Es' ? 'Eres' : 'eres';
  return {
    d1: { value: eresWord, trapType: 'grammar', reason: {
      ru: `${eresWord} — обращение к собеседнику напрямую. Подтверждение факта или оценка ситуации — только ${target}.`,
      uk: `${eresWord} — звернення до співрозмовника напряму. Підтвердження факту чи оцінка ситуації — тільки ${target}.`,
      en: `${eresWord} addresses the listener directly. Confirming a fact or evaluating a situation needs only ${target}.`,
      'pt-BR': `${eresWord} fala com o interlocutor diretamente. Confirmar um fato ou avaliar uma situação precisa só de ${target}.`,
      vi: `${eresWord} nói trực tiếp với người nghe. Xác nhận sự thật hay đánh giá tình huống chỉ cần ${target}.`,
      id: `${eresWord} berbicara langsung dengan pendengar. Mengonfirmasi fakta atau menilai situasi hanya perlu ${target}.`,
      tr: `${eresWord} doğrudan dinleyiciyle konuşur. Bir gerçeği doğrulamak ya da durumu değerlendirmek yalnızca ${target} gerektirir.`,
      pl: `${eresWord} zwraca się bezpośrednio do słuchacza. Potwierdzenie faktu lub ocena sytuacji wymaga tylko ${target}.`,
    }},
    d2: { value: 'Somos', trapType: 'grammar', reason: {
      ru: 'Somos — про группу с говорящим. Первая реплика — про ситуацию или предмет, а не про людей, нужна ' + target + '.',
      uk: 'Somos — про групу з мовцем. Перша репліка — про ситуацію чи предмет, а не про людей, потрібна ' + target + '.',
      en: 'Somos is about a group with the speaker in it. The first line is about a situation or thing, not people, so it needs ' + target + '.',
      'pt-BR': 'Somos é sobre um grupo com quem fala dentro dele. A primeira fala é sobre uma situação ou coisa, não sobre pessoas, precisa de ' + target + '.',
      vi: 'Somos nói về nhóm có người nói ở trong. Câu đầu nói về tình huống hay vật, không phải con người, cần ' + target + '.',
      id: 'Somos tentang kelompok dengan penutur di dalamnya. Baris pertama tentang situasi atau benda, bukan orang, perlu ' + target + '.',
      tr: 'Somos, içinde konuşanın da bulunduğu bir grup hakkındadır. İlk cümle bir durum ya da şey hakkındadır, insanlar hakkında değil, ' + target + ' gerekir.',
      pl: 'Somos dotyczy grupy z mówiącym w środku. Pierwsza kwestia dotyczy sytuacji lub rzeczy, nie ludzi, potrzebne jest ' + target + '.',
    }},
  };
}

function soyVsSomosOrEres(): { d1: Reasoned; d2: Reasoned } {
  return {
    d1: { value: 'Somos', trapType: 'grammar', reason: {
      ru: 'Somos — про группу с говорящим. Первая реплика — только о себе одном, нужна Soy.',
      uk: 'Somos — про групу з мовцем. Перша репліка — тільки про себе одного, потрібна Soy.',
      en: 'Somos is about a group with the speaker in it. The first line is only about the speaker alone, so it needs Soy.',
      'pt-BR': 'Somos é sobre um grupo com quem fala dentro dele. A primeira fala é só sobre quem fala sozinho, precisa de Soy.',
      vi: 'Somos nói về nhóm có người nói ở trong. Câu đầu chỉ nói về một mình người nói, cần Soy.',
      id: 'Somos tentang kelompok dengan penutur di dalamnya. Baris pertama hanya tentang penutur sendirian, perlu Soy.',
      tr: 'Somos, içinde konuşanın da bulunduğu bir grup hakkındadır. İlk cümle yalnızca konuşanın kendisi hakkındadır, Soy gerekir.',
      pl: 'Somos dotyczy grupy z mówiącym w środku. Pierwsza kwestia dotyczy tylko samego mówiącego, potrzebne jest Soy.',
    }},
    d2: { value: 'Eres', trapType: 'grammar', reason: {
      ru: 'Eres — обращение к собеседнику. Признание о себе — только Soy.',
      uk: 'Eres — звернення до співрозмовника. Визнання про себе — тільки Soy.',
      en: 'Eres addresses the listener. Talking about yourself needs only Soy.',
      'pt-BR': 'Eres fala com o interlocutor. Falar de si mesmo precisa só de Soy.',
      vi: 'Eres nói với người nghe. Nói về bản thân chỉ cần Soy.',
      id: 'Eres berbicara dengan pendengar. Berbicara tentang diri sendiri hanya perlu Soy.',
      tr: 'Eres dinleyiciyle konuşur. Kendinden bahsetmek yalnızca Soy gerektirir.',
      pl: 'Eres zwraca się do słuchacza. Mówienie o sobie wymaga tylko Soy.',
    }},
  };
}

const M = {
  verdad: { ru: '«правда» (подтверждение факта)', uk: '«правда» (підтвердження факту)', en: '"truth" (confirming a fact)', 'pt-BR': '"verdade" (confirmando um fato)', vi: '"sự thật" (xác nhận sự thật)', id: '"kebenaran" (mengonfirmasi fakta)', tr: '"gerçek" (bir gerçeği onaylamak)', pl: '„prawda” (potwierdzenie faktu)' },
  igual: { ru: '«всё равно» (безразличие)', uk: '«байдуже» (байдужість)', en: '"indifferent" (does not change things)', 'pt-BR': '"tanto faz" (indiferença)', vi: '"thờ ơ" (không thay đổi gì)', id: '"tidak peduli" (ketidakpedulian)', tr: '"fark etmez" (kayıtsızlık)', pl: '„wszystko jedno” (obojętność)' },
  dificil: { ru: '«трудно» (противоположный признак)', uk: '«важко» (протилежна ознака)', en: '"hard" (the opposite quality)', 'pt-BR': '"difícil" (a qualidade oposta)', vi: '"khó" (đặc điểm ngược lại)', id: '"sulit" (sifat sebaliknya)', tr: '"zor" (karşıt nitelik)', pl: '„trudno” (przeciwna cecha)' },
  importante: { ru: '«важно»', uk: '«важливо»', en: '"important"', 'pt-BR': '"importante"', vi: '"quan trọng"', id: '"penting"', tr: '"önemli"', pl: '„ważne”' },
  caro: { ru: '«дорого» (про цену)', uk: '«дорого» (про ціну)', en: '"expensive" (about price)', 'pt-BR': '"caro" (sobre preço)', vi: '"đắt" (về giá)', id: '"mahal" (tentang harga)', tr: '"pahalı" (fiyat hakkında)', pl: '„drogo” (o cenie)' },
  unico: { ru: '«единственный» (другой признак)', uk: '«єдиний» (інша ознака)', en: '"unique" (a different quality)', 'pt-BR': '"único" (uma qualidade diferente)', vi: '"duy nhất" (đặc điểm khác)', id: '"unik" (sifat berbeda)', tr: '"eşsiz" (farklı bir nitelik)', pl: '„jedyny” (inna cecha)' },
  verdadero: { ru: '«истинный» (другой признак)', uk: '«істинний» (інша ознака)', en: '"true" (a different quality)', 'pt-BR': '"verdadeiro" (uma qualidade diferente)', vi: '"đúng" (đặc điểm khác)', id: '"benar" (sifat berbeda)', tr: '"doğru" (farklı bir nitelik)', pl: '„prawdziwy” (inna cecha)' },
  facil: { ru: '«легко»', uk: '«легко»', en: '"easy"', 'pt-BR': '"fácil"', vi: '"dễ"', id: '"mudah"', tr: '"kolay"', pl: '„łatwo”' },
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
  const note = { ru: ' О собеседнике мужского рода нужна форма на', uk: ' Про співрозмовника чоловічого роду потрібна форма на', en: ' A masculine listener needs the', 'pt-BR': ' Um interlocutor masculino precisa da forma em', vi: ' Người nghe giống đực cần dạng', id: ' Pendengar maskulin memerlukan bentuk', tr: ' Eril bir dinleyici', pl: ' Słuchacz męski wymaga formy na' };
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма женского рода, с ${wrongEnding}.${note.ru} ${correctEnding}: ${correct}.`,
    uk: `${wrong} — форма жіночого роду, з ${wrongEnding}.${note.uk} ${correctEnding}: ${correct}.`,
    en: `${wrong} is the feminine form, ending in ${wrongEnding}.${note.en} ${correctEnding} form: ${correct}.`,
    'pt-BR': `${wrong} é a forma feminina, terminada em ${wrongEnding}.${note['pt-BR']} ${correctEnding}: ${correct}.`,
    vi: `${wrong} là dạng giống cái, kết thúc bằng ${wrongEnding}.${note.vi} ${correctEnding}: ${correct}.`,
    id: `${wrong} adalah bentuk feminin, berakhiran ${wrongEnding}.${note.id} ${correctEnding}: ${correct}.`,
    tr: `${wrong}, ${wrongEnding} ile biten dişil biçimdir.${note.tr} ${correctEnding} biçimini gerektirir: ${correct}.`,
    pl: `${wrong} to forma żeńska, zakończona na ${wrongEnding}.${note.pl} ${correctEnding}: ${correct}.`,
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
// сессии — так как así использует пару verdad/igual, acuerdo обязан
// варьировать второй дистрактор по фразам (caro/importante/difícil/fácil),
// сохраняя точное совпадение с массивом distractors в phrases-файле.
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

export const ES_SESSION_25_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s25-somos-asi': d(
    { ru: 'Мы такие', uk: 'Ми такі', en: 'That is how we are', 'pt-BR': 'Somos assim', vi: 'Chúng tôi là như vậy', id: 'Kami begitu', tr: 'Biz böyleyiz', pl: 'Tacy jesteśmy' },
    { ru: 'Так говорят о себе вместе с кем-то ещё — о характере или привычке целой группы. Así не меняется никогда, а связка somos показывает, что речь о нескольких людях, включая говорящего.', uk: 'Так говорять про себе разом із кимось іще — про характер чи звичку цілої групи. Así не змінюється ніколи, а зв’язка somos показує, що йдеться про кількох людей, включно з мовцем.', en: 'This is how you talk about yourself together with others — about the character or habit of an entire group. Así never changes, and the linking word somos shows that several people are meant, including the speaker.', 'pt-BR': 'É assim que se fala de si mesmo junto com outros — sobre o caráter ou hábito de um grupo inteiro. Así nunca muda, e a ligação somos mostra que se trata de várias pessoas, incluindo quem fala.', vi: 'Đây là cách nói về bản thân cùng với người khác — về tính cách hay thói quen của cả một nhóm. Así không bao giờ đổi, và từ nối somos cho thấy đang nói về nhiều người, kể cả người nói.', id: 'Beginilah cara berbicara tentang diri sendiri bersama orang lain — tentang karakter atau kebiasaan seluruh kelompok. Así tidak pernah berubah, dan kata penghubung somos menunjukkan bahwa yang dimaksud beberapa orang, termasuk penutur.', tr: 'Kendinden başkalarıyla birlikte böyle bahsedilir — tüm bir grubun karakteri ya da alışkanlığı hakkında. Así asla değişmez, ve bağlaç somos, konuşan da dahil olmak üzere birkaç kişiden bahsedildiğini gösterir.', pl: 'Tak mówi się o sobie razem z innymi — o charakterze lub przyzwyczajeniu całej grupy. Así nigdy się nie zmienia, a łącznik somos pokazuje, że mowa o kilku osobach, w tym o mówiącym.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSoyOrSon('Somos') },
      asiWord(),
    ],
  ),
  'es-e01-s25-no-somos-asi': d(
    { ru: 'Мы не такие', uk: 'Ми не такі', en: 'That is not how we are', 'pt-BR': 'Não somos assim', vi: 'Chúng tôi không phải như vậy', id: 'Kami tidak begitu', tr: 'Biz öyle değiliz', pl: 'Nie tacy jesteśmy' },
    { ru: 'Отрицание группового описания — возражение на чужое обобщение о нас. No встаёт перед связкой, así остаётся без изменений, как и в отрицаниях от одного лица.', uk: 'Заперечення групового опису — заперечення на чуже узагальнення про нас. No стає перед зв’язкою, así лишається без змін, як і в запереченнях від однієї особи.', en: 'This negates a description of the group — pushing back on someone else\'s generalization about us. No comes before the linking word, así stays unchanged, just as in negations from a single person.', 'pt-BR': 'Isso nega uma descrição do grupo — contestando a generalização de outra pessoa sobre nós. No vem antes da ligação, así fica sem mudanças, assim como nas negações de uma só pessoa.', vi: 'Đây là phủ định mô tả về nhóm — phản bác lời khái quát của người khác về chúng tôi. No đứng trước từ nối, así không đổi, giống như trong phủ định của một người.', id: 'Ini menegasikan deskripsi kelompok — menyanggah generalisasi orang lain tentang kami. No berada sebelum kata penghubung, así tetap tidak berubah, sama seperti dalam negasi dari satu orang.', tr: 'Bu, grup hakkındaki bir tanımı olumsuzlar — başkasının bizim hakkımızdaki genellemesine karşı çıkar. No bağlaçtan önce gelir, así değişmeden kalır, tıpkı tek bir kişinin olumsuzlamalarında olduğu gibi.', pl: 'To zaprzecza opisowi grupy — sprzeciwia się cudzemu uogólnieniu na nasz temat. No stoi przed łącznikiem, así pozostaje bez zmian, tak jak w przeczeniach od jednej osoby.' },
    [
      negationWord,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSoyOrSon('somos') },
      asiWord(),
    ],
  ),
  'es-e01-s25-somos-asi-verdad-q': d(
    { ru: 'Мы такие, правда?', uk: 'Ми такі, правда?', en: 'We are like that, right?', 'pt-BR': 'Somos assim, verdade?', vi: 'Chúng tôi là như vậy, đúng không?', id: 'Kami begitu, benar kan?', tr: 'Biz böyleyiz, değil mi?', pl: 'Tacy jesteśmy, prawda?' },
    { ru: 'Утверждение о группе с хвостовым вопросом-подтверждением. Recall слова verdad из первой сессии в новой роли — не как отдельная реакция, а как короткий вопрос «правда?» в конце фразы.', uk: 'Твердження про групу з хвостовим питанням-підтвердженням. Recall слова verdad із першої сесії в новій ролі — не як окрема реакція, а як коротке питання «правда?» наприкінці фрази.', en: 'A statement about the group with a tag question confirming it. Recall of the word verdad from the first session in a new role — not as a standalone reaction, but as a short "right?" at the end of the phrase.', 'pt-BR': 'Uma afirmação sobre o grupo com uma pergunta de confirmação no final. Recall da palavra verdad da primeira sessão em um papel novo — não como reação isolada, mas como um curto "não é?" no fim da frase.', vi: 'Một câu khẳng định về nhóm kèm câu hỏi đuôi xác nhận. Ôn lại từ verdad từ bài đầu tiên trong vai trò mới — không phải phản ứng độc lập, mà là câu hỏi ngắn "đúng không?" ở cuối câu.', id: 'Sebuah pernyataan tentang kelompok dengan pertanyaan penegas di akhir. Mengingat kembali kata verdad dari sesi pertama dalam peran baru — bukan sebagai reaksi berdiri sendiri, melainkan pertanyaan pendek "benar kan?" di akhir frasa.', tr: 'Grup hakkında bir ifade ve sonunda onu doğrulayan bir etiket soru. İlk oturumdan verdad kelimesinin yeni bir rolde hatırlanması — bağımsız bir tepki olarak değil, ifadenin sonunda kısa bir "değil mi?" olarak.', pl: 'Stwierdzenie o grupie z pytaniem potwierdzającym na końcu. Przypomnienie słowa verdad z pierwszej sesji w nowej roli — nie jako samodzielna reakcja, lecz jako krótkie „prawda?” na końcu frazy.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSoyOrSon('Somos') },
      { correct: 'así', prompt: qualityQ('así'), d1: wrongWord('así', 'igual', M.igual), d2: wrongWord('así', 'importante', M.importante) },
      { correct: 'verdad', prompt: { ru: 'Каким коротким вопросом подтвердить сказанное?', uk: 'Яким коротким питанням підтвердити сказане?', en: 'Which short question confirms what was just said?', 'pt-BR': 'Qual pergunta curta confirma o que foi dito?', vi: 'Câu hỏi ngắn nào xác nhận điều vừa nói?', id: 'Pertanyaan pendek mana yang menegaskan apa yang baru dikatakan?', tr: 'Az önce söyleneni hangi kısa soru doğrular?', pl: 'Jakie krótkie pytanie potwierdza to, co powiedziano?' }, d1: wrongWord('verdad', 'acuerdo', { ru: '«согласие» (с чужим мнением)', uk: '«згода» (з чужою думкою)', en: '"agreement" (with someone else\'s opinion)', 'pt-BR': '"acordo" (com a opinião de outra pessoa)', vi: '"đồng ý" (với ý kiến người khác)', id: '"persetujuan" (dengan pendapat orang lain)', tr: '"onay" (başkasının görüşüyle)', pl: '„zgoda” (z cudzą opinią)' }), d2: wrongWord('verdad', 'igual', M.igual) },
    ],
  ),
  'es-e01-s25-eres-asi-somos-asi': d(
    { ru: 'Ты такой, мы такие', uk: 'Ти такий, ми такі', en: 'You are like that, we are like that', 'pt-BR': 'Você é assim, somos assim', vi: 'Bạn là như vậy, chúng tôi cũng vậy', id: 'Kamu begitu, kami begitu', tr: 'Sen böylesin, biz böyleyiz', pl: 'Ty jesteś taki, my jesteśmy tacy' },
    { ru: 'Диалог из двух реплик: признание собеседника и присоединение к нему. Recall связки eres из сессии про собеседника, ответ — уже новая somos, признак así не меняется ни разу.', uk: 'Діалог із двох реплік: визнання співрозмовника і приєднання до нього. Recall зв’язки eres із сесії про співрозмовника, відповідь — уже нова somos, ознака así не змінюється жодного разу.', en: 'A two-line dialogue: acknowledging the listener and joining them. Recall of the linking word eres from the listener session, the reply is the new somos — the quality así never changes.', 'pt-BR': 'Um diálogo de duas falas: reconhecer o interlocutor e se juntar a ele. Recall da ligação eres da sessão do interlocutor, a resposta é a nova somos — a qualidade así nunca muda.', vi: 'Đoạn hội thoại hai câu: công nhận người nghe và tham gia cùng họ. Ôn lại từ nối eres từ bài về người nghe, câu trả lời là somos mới — đặc điểm así không bao giờ đổi.', id: 'Dialog dua baris: mengakui pendengar dan bergabung dengannya. Mengingat kembali kata penghubung eres dari sesi pendengar, jawabannya adalah somos yang baru — sifat así tidak pernah berubah.', tr: 'İki cümlelik bir diyalog: dinleyiciyi kabul etmek ve ona katılmak. Dinleyici oturumundan bağlaç eres’in hatırlanması, yanıt ise yeni somos’tur — nitelik así asla değişmez.', pl: 'Dialog z dwóch kwestii: uznanie słuchacza i dołączenie do niego. Przypomnienie łącznika eres z sesji o słuchaczu, odpowiedzią jest nowe somos — cecha así nigdy się nie zmienia.' },
    [
      { correct: 'Eres', prompt: T.eresQ, ...eresVsEsOrSomos('Eres') },
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSoyOrSon('somos') },
      asiWord(),
    ],
  ),
  'es-e01-s25-es-asi-somos-de-acuerdo': d(
    { ru: 'Это так, мы согласны', uk: 'Це так, ми згодні', en: 'That is so, we agree', 'pt-BR': 'É assim, concordamos', vi: 'Đúng vậy, chúng tôi đồng ý', id: 'Begitulah, kami setuju', tr: 'Bu böyle, biz aynı fikirdeyiz', pl: 'Tak właśnie jest, zgadzamy się' },
    { ru: 'Диалог из подтверждения факта и группового согласия с ним. Recall связки es из сессии про предмет или ситуацию, ответ — somos перед формулой de acuerdo, которая не меняется ни по роду, ни по числу.', uk: 'Діалог із підтвердження факту й групової згоди з ним. Recall зв’язки es із сесії про предмет чи ситуацію, відповідь — somos перед формулою de acuerdo, яка не змінюється ні за родом, ні за числом.', en: 'A dialogue confirming a fact and the group agreeing with it. Recall of the linking word es from the thing-or-situation session, the reply is somos before the formula de acuerdo, which never changes for gender or number.', 'pt-BR': 'Um diálogo de confirmação de um fato e concordância do grupo com ele. Recall da ligação es da sessão de coisa ou situação, a resposta é somos antes da fórmula de acuerdo, que nunca muda em gênero nem número.', vi: 'Đoạn hội thoại xác nhận một sự thật và nhóm đồng ý với nó. Ôn lại từ nối es từ bài về vật hay tình huống, câu trả lời là somos trước công thức de acuerdo, không bao giờ đổi theo giống hay số.', id: 'Dialog mengonfirmasi fakta dan kelompok setuju dengannya. Mengingat kembali kata penghubung es dari sesi benda atau situasi, jawabannya adalah somos sebelum rumus de acuerdo, yang tidak pernah berubah untuk gender atau jumlah.', tr: 'Bir gerçeği doğrulayan ve grubun onunla aynı fikirde olduğu bir diyalog. Şey-veya-durum oturumundan bağlaç es’in hatırlanması, yanıt cinsiyet ya da sayı için asla değişmeyen de acuerdo formülünden önce somos’tur.', pl: 'Dialog potwierdzający fakt i zgodę grupy z nim. Przypomnienie łącznika es z sesji o rzeczy lub sytuacji, odpowiedzią jest somos przed formułą de acuerdo, która nigdy nie zmienia się ani rodzajem, ani liczbą.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsEresOrSomos('Es') },
      asiWord(),
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSoyOrSon('somos') },
      deWord,
      acuerdoWordWith('caro', M.caro),
    ],
  ),
  'es-e01-s25-soy-asi-somos-de-acuerdo': d(
    { ru: 'Я такой, мы согласны', uk: 'Я такий, ми згодні', en: 'I am like that, we agree', 'pt-BR': 'Sou assim, concordamos', vi: 'Tôi là như vậy, chúng tôi đồng ý', id: 'Saya begitu, kami setuju', tr: 'Ben böyleyim, biz aynı fikirdeyiz', pl: 'Taki jestem, zgadzamy się' },
    { ru: 'Диалог из личного признания и группового согласия. Recall связки soy из первой сессии, ответ снова somos перед неизменяемой формулой de acuerdo — та же смена числа, что и в прошлых фразах.', uk: 'Діалог з особистого визнання й групової згоди. Recall зв’язки soy з першої сесії, відповідь знову somos перед незмінною формулою de acuerdo — та сама зміна числа, що й у попередніх фразах.', en: 'A dialogue of a personal admission and group agreement. Recall of the linking word soy from the first session, the reply is again somos before the invariable formula de acuerdo — the same number shift as in earlier phrases.', 'pt-BR': 'Um diálogo de uma admissão pessoal e concordância do grupo. Recall da ligação soy da primeira sessão, a resposta é de novo somos antes da fórmula invariável de acuerdo — a mesma troca de número das frases anteriores.', vi: 'Đoạn hội thoại thừa nhận cá nhân và sự đồng ý của nhóm. Ôn lại từ nối soy từ bài đầu tiên, câu trả lời lại là somos trước công thức bất biến de acuerdo — cùng sự thay đổi về số như các câu trước.', id: 'Dialog pengakuan pribadi dan persetujuan kelompok. Mengingat kembali kata penghubung soy dari sesi pertama, jawabannya lagi-lagi somos sebelum rumus de acuerdo yang tak berubah — perubahan jumlah yang sama seperti pada frasa sebelumnya.', tr: 'Kişisel bir itiraf ve grup onayından oluşan bir diyalog. İlk oturumdan bağlaç soy’un hatırlanması, yanıt yine değişmez de acuerdo formülünden önce somos’tur — önceki ifadelerdekiyle aynı sayı değişimi.', pl: 'Dialog osobistego przyznania i zgody grupy. Przypomnienie łącznika soy z pierwszej sesji, odpowiedzią znów jest somos przed niezmienną formułą de acuerdo — ta sama zmiana liczby co w poprzednich frazach.' },
    [
      { correct: 'Soy', prompt: T.soyQ, ...soyVsSomosOrEres() },
      asiWord(),
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSoyOrSon('somos') },
      deWord,
      { correct: 'acuerdo', prompt: ACUERDO_PROMPT, d1: wrongWord('acuerdo', 'verdad', M.verdad), d2: wrongWord('acuerdo', 'importante', M.importante) },
    ],
  ),
  'es-e01-s25-somos-de-acuerdo-q': d(
    { ru: 'Мы согласны?', uk: 'Ми згодні?', en: 'Do we agree?', 'pt-BR': 'Concordamos?', vi: 'Chúng tôi có đồng ý không?', id: 'Apakah kami setuju?', tr: 'Aynı fikirde miyiz?', pl: 'Czy się zgadzamy?' },
    { ru: 'Вопрос о согласии сразу нескольких людей — сомнение в общем мнении. Формула de acuerdo не меняется, вопросом фразу делают только знаки ¿...? и интонация.', uk: 'Питання про згоду одразу кількох людей — сумнів у спільній думці. Формула de acuerdo не змінюється, питанням фразу роблять лише знаки ¿...? та інтонація.', en: 'A question about the agreement of several people at once — doubting a shared opinion. The formula de acuerdo does not change; only the ¿...? marks and intonation make it a question.', 'pt-BR': 'Uma pergunta sobre a concordância de várias pessoas de uma vez — duvidando de uma opinião compartilhada. A fórmula de acuerdo não muda; só os sinais ¿...? e a entonação tornam a frase uma pergunta.', vi: 'Câu hỏi về sự đồng ý của nhiều người cùng lúc — nghi ngờ ý kiến chung. Công thức de acuerdo không đổi; chỉ có dấu ¿...? và ngữ điệu biến câu thành câu hỏi.', id: 'Pertanyaan tentang persetujuan beberapa orang sekaligus — meragukan pendapat bersama. Rumus de acuerdo tidak berubah; hanya tanda ¿...? dan intonasi yang menjadikannya pertanyaan.', tr: 'Aynı anda birkaç kişinin onayı hakkında bir soru — ortak bir görüşten şüphe duymak. de acuerdo formülü değişmez; cümleyi soru yapan yalnızca ¿...? işaretleri ve tonlamadır.', pl: 'Pytanie o zgodę kilku osób naraz — wątpliwość we wspólną opinię. Formuła de acuerdo się nie zmienia; pytaniem czyni frazę tylko znak ¿...? i intonacja.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSoyOrSon('Somos') },
      deWord,
      acuerdoWordWith('caro', M.caro),
    ],
  ),
  'es-e01-s25-eres-verdadero-somos-asi': d(
    { ru: 'Ты настоящий, мы такие', uk: 'Ти справжній, ми такі', en: 'You are genuine, we are like that', 'pt-BR': 'Você é verdadeiro, somos assim', vi: 'Bạn là chân thật, chúng tôi cũng vậy', id: 'Kamu tulus, kami begitu', tr: 'Sen samimisin, biz böyleyiz', pl: 'Jesteś prawdziwy, tacy jesteśmy' },
    { ru: 'Диалог о честности собеседника мужского рода и присоединении к этому качеству всей группой. Recall прилагательного verdadero из четвёртой сессии, ответ — уже somos así, а не единственное число.', uk: 'Діалог про чесність співрозмовника чоловічого роду і приєднання до цієї якості всією групою. Recall прикметника verdadero з четвертої сесії, відповідь — уже somos así, а не однина.', en: 'A dialogue about the honesty of a masculine listener and the whole group joining that quality. Recall of the adjective verdadero from the fourth session, the reply is now somos así, not the singular.', 'pt-BR': 'Um diálogo sobre a honestidade de um interlocutor masculino e o grupo inteiro se juntando a essa qualidade. Recall do adjetivo verdadero da quarta sessão, a resposta agora é somos así, não o singular.', vi: 'Đoạn hội thoại về sự trung thực của người nghe giống đực và cả nhóm cùng tham gia đặc điểm đó. Ôn lại tính từ verdadero từ bài thứ tư, câu trả lời giờ là somos así, không phải số ít.', id: 'Dialog tentang kejujuran pendengar maskulin dan seluruh kelompok bergabung dengan sifat itu. Mengingat kembali kata sifat verdadero dari sesi keempat, jawabannya sekarang somos así, bukan tunggal.', tr: 'Eril bir dinleyicinin dürüstlüğü hakkında ve tüm grubun bu niteliğe katılması hakkında bir diyalog. Dördüncü oturumdan sıfat verdadero’nun hatırlanması, yanıt artık tekil değil somos así’dir.', pl: 'Dialog o uczciwości słuchacza rodzaju męskiego i dołączeniu do tej cechy przez całą grupę. Przypomnienie przymiotnika verdadero z czwartej sesji, odpowiedzią jest teraz somos así, a nie liczba pojedyncza.' },
    [
      { correct: 'Eres', prompt: T.eresQ, ...eresVsEsOrSomos('Eres') },
      { correct: 'verdadero', prompt: genderQ(true), d1: genderMismatch('verdadero', 'verdadera', false), d2: wrongWord('verdadero', 'único', M.unico) },
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSoyOrSon('somos') },
      asiWord(),
    ],
  ),
  'es-e01-s25-es-verdad-somos-de-acuerdo': d(
    { ru: 'Это правда, мы согласны', uk: 'Це правда, ми згодні', en: 'That is true, we agree', 'pt-BR': 'É verdade, concordamos', vi: 'Đó là sự thật, chúng tôi đồng ý', id: 'Itu benar, kami setuju', tr: 'Bu doğru, biz aynı fikirdeyiz', pl: 'To prawda, zgadzamy się' },
    { ru: 'Диалог из подтверждения факта и группового согласия — recall фразы Es verdad из первой сессии, здесь она звучит как контраст с somos de acuerdo: подтверждение факта, а потом отдельное согласие уже нескольких людей.', uk: 'Діалог із підтвердження факту й групової згоди — recall фрази Es verdad із першої сесії, тут вона звучить як контраст із somos de acuerdo: підтвердження факту, а потім окрема згода вже кількох людей.', en: 'A dialogue of confirming a fact and the group agreeing — recall of the phrase Es verdad from the first session; here it contrasts with somos de acuerdo: confirming a fact, then separate agreement from several people.', 'pt-BR': 'Um diálogo de confirmação de fato e concordância do grupo — recall da frase Es verdad da primeira sessão; aqui ela contrasta com somos de acuerdo: confirmar um fato, depois uma concordância separada de várias pessoas.', vi: 'Đoạn hội thoại xác nhận sự thật và sự đồng ý của nhóm — ôn lại câu Es verdad từ bài đầu tiên; ở đây nó tương phản với somos de acuerdo: xác nhận sự thật, rồi sự đồng ý riêng của nhiều người.', id: 'Dialog mengonfirmasi fakta dan persetujuan kelompok — mengingat kembali frasa Es verdad dari sesi pertama; di sini ia kontras dengan somos de acuerdo: mengonfirmasi fakta, lalu persetujuan terpisah dari beberapa orang.', tr: 'Bir gerçeği doğrulama ve grubun onayından oluşan bir diyalog — ilk oturumdan Es verdad ifadesinin hatırlanması; burada somos de acuerdo ile karşıtlık oluşturur: bir gerçeği doğrulamak, sonra birkaç kişinin ayrı onayı.', pl: 'Dialog potwierdzenia faktu i zgody grupy — przypomnienie frazy Es verdad z pierwszej sesji; tu kontrastuje z somos de acuerdo: potwierdzenie faktu, a potem osobna zgoda kilku osób.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsEresOrSomos('Es') },
      { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'acuerdo', { ru: '«согласие» (с мнением)', uk: '«згода» (з думкою)', en: '"agreement" (with an opinion)', 'pt-BR': '"acordo" (com uma opinião)', vi: '"đồng ý" (với ý kiến)', id: '"persetujuan" (dengan pendapat)', tr: '"onay" (bir görüşle)', pl: '„zgoda” (z opinią)' }), d2: wrongWord('verdad', 'igual', M.igual) },
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSoyOrSon('somos') },
      deWord,
      acuerdoWordWith('difícil', M.dificil),
    ],
  ),
  'es-e01-s25-eres-unico-no-somos-iguales-somos-asi': d(
    { ru: 'Ты единственный такой, мы такие', uk: 'Ти єдиний такий, ми такі', en: 'You are one of a kind, we are like that', 'pt-BR': 'Você é único, somos assim', vi: 'Bạn có một không hai, chúng tôi cũng vậy', id: 'Kamu satu-satunya, kami begitu', tr: 'Sen eşsizsin, biz böyleyiz', pl: 'Jesteś jedyny w swoim rodzaju, tacy jesteśmy' },
    { ru: 'Диалог о неповторимости собеседника мужского рода и присоединении к этому качеству всей группой. Recall прилагательного único из шестой сессии, ответ — somos así, а не единственное число soy así.', uk: 'Діалог про неповторність співрозмовника чоловічого роду і приєднання до цієї якості всією групою. Recall прикметника único із шостої сесії, відповідь — somos así, а не однина soy así.', en: 'A dialogue about the uniqueness of a masculine listener and the whole group joining that quality. Recall of the adjective único from the sixth session, the reply is somos así, not the singular soy así.', 'pt-BR': 'Um diálogo sobre a singularidade de um interlocutor masculino e o grupo inteiro se juntando a essa qualidade. Recall do adjetivo único da sexta sessão, a resposta é somos así, não o singular soy así.', vi: 'Đoạn hội thoại về sự độc nhất của người nghe giống đực và cả nhóm cùng tham gia đặc điểm đó. Ôn lại tính từ único từ bài thứ sáu, câu trả lời là somos así, không phải số ít soy así.', id: 'Dialog tentang keunikan pendengar maskulin dan seluruh kelompok bergabung dengan sifat itu. Mengingat kembali kata sifat único dari sesi keenam, jawabannya somos así, bukan tunggal soy así.', tr: 'Eril bir dinleyicinin eşsizliği hakkında ve tüm grubun bu niteliğe katılması hakkında bir diyalog. Altıncı oturumdan sıfat único’nun hatırlanması, yanıt tekil soy así değil somos así’dir.', pl: 'Dialog o wyjątkowości słuchacza rodzaju męskiego i dołączeniu do tej cechy przez całą grupę. Przypomnienie przymiotnika único z szóstej sesji, odpowiedzią jest somos así, a nie liczba pojedyncza soy así.' },
    [
      { correct: 'Eres', prompt: T.eresQ, ...eresVsEsOrSomos('Eres') },
      { correct: 'único', prompt: genderQ(true), d1: genderMismatch('único', 'única', false), d2: wrongWord('único', 'verdadero', M.verdadero) },
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSoyOrSon('somos') },
      asiWord(),
    ],
  ),
  'es-e01-s25-no-eres-asi-no-somos-de-acuerdo': d(
    { ru: 'Ты не такой, мы не согласны', uk: 'Ти не такий, ми не згодні', en: 'You are not like that, we do not agree', 'pt-BR': 'Você não é assim, não concordamos', vi: 'Bạn không phải như vậy, chúng tôi không đồng ý', id: 'Kamu tidak begitu, kami tidak setuju', tr: 'Sen öyle değilsin, biz aynı fikirde değiliz', pl: 'Nie jesteś taki, nie zgadzamy się' },
    { ru: 'Двойное отрицание в диалоге: возражение собеседнику и отказ в согласии всей группой. No встаёт перед каждой связкой отдельно, así и de acuerdo не меняются ни разу.', uk: 'Подвійне заперечення в діалозі: заперечення співрозмовнику й відмова в згоді всією групою. No стає перед кожною зв’язкою окремо, así і de acuerdo не змінюються жодного разу.', en: 'A double negation in the dialogue: pushing back on the listener and the whole group refusing to agree. No comes before each linking word separately; así and de acuerdo never change.', 'pt-BR': 'Uma dupla negação no diálogo: contestar o interlocutor e o grupo inteiro recusando concordar. No vem antes de cada ligação separadamente; así e de acuerdo nunca mudam.', vi: 'Phủ định kép trong hội thoại: phản bác người nghe và cả nhóm từ chối đồng ý. No đứng trước mỗi từ nối riêng biệt; así và de acuerdo không bao giờ đổi.', id: 'Negasi ganda dalam dialog: menyanggah pendengar dan seluruh kelompok menolak setuju. No berada sebelum setiap kata penghubung secara terpisah; así dan de acuerdo tidak pernah berubah.', tr: 'Diyalogda çifte olumsuzlama: dinleyiciye karşı çıkmak ve tüm grubun onaylamayı reddetmesi. No her bağlaçtan önce ayrı ayrı gelir; así ve de acuerdo asla değişmez.', pl: 'Podwójne przeczenie w dialogu: sprzeciw wobec słuchacza i odmowa zgody całej grupy. No stoi przed każdym łącznikiem osobno; así i de acuerdo nigdy się nie zmieniają.' },
    [
      negationWord,
      { correct: 'eres', prompt: T.eresQ, ...eresVsEsOrSomos('eres') },
      asiWord(),
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSoyOrSon('somos') },
      deWord,
      acuerdoWordWith('fácil', M.facil),
    ],
  ),
  'es-e01-s25-es-importante-somos-de-acuerdo': d(
    { ru: 'Это важно, мы согласны', uk: 'Це важливо, ми згодні', en: 'That is important, we agree', 'pt-BR': 'É importante, concordamos', vi: 'Điều đó quan trọng, chúng tôi đồng ý', id: 'Itu penting, kami setuju', tr: 'Bu önemli, biz aynı fikirdeyiz', pl: 'To ważne, zgadzamy się' },
    { ru: 'Диалог из оценки значимости и группового согласия с ней. Recall прилагательного importante из первой сессии, ответ — somos перед формулой de acuerdo, которая не меняется ни по роду, ни по числу.', uk: 'Діалог з оцінки значущості й групової згоди з нею. Recall прикметника importante з першої сесії, відповідь — somos перед формулою de acuerdo, яка не змінюється ні за родом, ні за числом.', en: 'A dialogue evaluating significance and the group agreeing with it. Recall of the adjective importante from the first session, the reply is somos before the formula de acuerdo, which never changes for gender or number.', 'pt-BR': 'Um diálogo de avaliação de importância e concordância do grupo com ela. Recall do adjetivo importante da primeira sessão, a resposta é somos antes da fórmula de acuerdo, que nunca muda em gênero nem número.', vi: 'Đoạn hội thoại đánh giá tầm quan trọng và sự đồng ý của nhóm với nó. Ôn lại tính từ importante từ bài đầu tiên, câu trả lời là somos trước công thức de acuerdo, không bao giờ đổi theo giống hay số.', id: 'Dialog menilai kepentingan dan kelompok setuju dengannya. Mengingat kembali kata sifat importante dari sesi pertama, jawabannya adalah somos sebelum rumus de acuerdo, yang tidak pernah berubah untuk gender atau jumlah.', tr: 'Önemi değerlendiren ve grubun onunla aynı fikirde olduğu bir diyalog. İlk oturumdan sıfat importante’nin hatırlanması, yanıt cinsiyet ya da sayı için asla değişmeyen de acuerdo formülünden önce somos’tur.', pl: 'Dialog oceny znaczenia i zgody grupy z nią. Przypomnienie przymiotnika importante z pierwszej sesji, odpowiedzią jest somos przed formułą de acuerdo, która nigdy nie zmienia się ani rodzajem, ani liczbą.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsEresOrSomos('Es') },
      { correct: 'importante', prompt: qualityQ('importante'), d1: wrongWord('importante', 'difícil', M.dificil), d2: wrongWord('importante', 'caro', M.caro) },
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSoyOrSon('somos') },
      deWord,
      acuerdoWordWith('caro', M.caro),
    ],
  ),
  'es-e01-s25-eres-rapido-somos-asi': d(
    { ru: 'Ты быстрый, мы такие', uk: 'Ти швидкий, ми такі', en: 'You are fast, we are like that', 'pt-BR': 'Você é rápido, somos assim', vi: 'Bạn nhanh nhẹn, chúng tôi cũng vậy', id: 'Kamu cepat, kami begitu', tr: 'Sen hızlısın, biz böyleyiz', pl: 'Jesteś szybki, tacy jesteśmy' },
    { ru: 'Диалог о темпе собеседника мужского рода и присоединении к этому качеству всей группой. Recall прилагательного rápido из пятой сессии, ответ — somos así, показывая, что признак относится теперь к нескольким людям.', uk: 'Діалог про темп співрозмовника чоловічого роду і приєднання до цієї якості всією групою. Recall прикметника rápido з п’ятої сесії, відповідь — somos así, показуючи, що ознака стосується тепер кількох людей.', en: 'A dialogue about the pace of a masculine listener and the whole group joining that quality. Recall of the adjective rápido from the fifth session, the reply is somos así, showing the quality now belongs to several people.', 'pt-BR': 'Um diálogo sobre o ritmo de um interlocutor masculino e o grupo inteiro se juntando a essa qualidade. Recall do adjetivo rápido da quinta sessão, a resposta é somos así, mostrando que a qualidade agora pertence a várias pessoas.', vi: 'Đoạn hội thoại về tốc độ của người nghe giống đực và cả nhóm cùng tham gia đặc điểm đó. Ôn lại tính từ rápido từ bài thứ năm, câu trả lời là somos así, cho thấy đặc điểm giờ thuộc về nhiều người.', id: 'Dialog tentang kecepatan pendengar maskulin dan seluruh kelompok bergabung dengan sifat itu. Mengingat kembali kata sifat rápido dari sesi kelima, jawabannya somos así, menunjukkan sifat itu kini milik beberapa orang.', tr: 'Eril bir dinleyicinin temposu hakkında ve tüm grubun bu niteliğe katılması hakkında bir diyalog. Beşinci oturumdan sıfat rápido’nun hatırlanması, yanıt somos así’dir, niteliğin artık birkaç kişiye ait olduğunu gösterir.', pl: 'Dialog o tempie słuchacza rodzaju męskiego i dołączeniu do tej cechy przez całą grupę. Przypomnienie przymiotnika rápido z piątej sesji, odpowiedzią jest somos así, pokazujące, że cecha należy teraz do kilku osób.' },
    [
      { correct: 'Eres', prompt: T.eresQ, ...eresVsEsOrSomos('Eres') },
      { correct: 'rápido', prompt: genderQ(true), d1: genderMismatch('rápido', 'rápida', false), d2: wrongWord('rápido', 'verdadero', M.verdadero) },
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSoyOrSon('somos') },
      asiWord(),
    ],
  ),
  'es-e01-s25-es-caro-no-somos-de-acuerdo': d(
    { ru: 'Это дорого, мы не согласны', uk: 'Це дорого, ми не згодні', en: 'That is expensive, we do not agree', 'pt-BR': 'É caro, não concordamos', vi: 'Cái đó đắt, chúng tôi không đồng ý', id: 'Itu mahal, kami tidak setuju', tr: 'Bu pahalı, biz aynı fikirde değiliz', pl: 'To drogie, nie zgadzamy się' },
    { ru: 'Диалог из оценки цены и группового несогласия с ней. Recall прилагательного caro из восемнадцатой сессии, ответ — no перед somos de acuerdo, где отрицается вся групповая реакция целиком.', uk: 'Діалог з оцінки ціни й групової незгоди з нею. Recall прикметника caro з вісімнадцятої сесії, відповідь — no перед somos de acuerdo, де заперечується вся групова реакція цілком.', en: 'A dialogue evaluating price and the group disagreeing with it. Recall of the adjective caro from the eighteenth session, the reply is no before somos de acuerdo, negating the whole group reaction.', 'pt-BR': 'Um diálogo de avaliação de preço e discordância do grupo. Recall do adjetivo caro da décima oitava sessão, a resposta é no antes de somos de acuerdo, negando toda a reação do grupo.', vi: 'Đoạn hội thoại đánh giá giá cả và sự không đồng ý của nhóm. Ôn lại tính từ caro từ bài thứ mười tám, câu trả lời là no trước somos de acuerdo, phủ định toàn bộ phản ứng của nhóm.', id: 'Dialog menilai harga dan ketidaksetujuan kelompok. Mengingat kembali kata sifat caro dari sesi kedelapan belas, jawabannya adalah no sebelum somos de acuerdo, menegasikan seluruh reaksi kelompok.', tr: 'Fiyatı değerlendiren ve grubun aynı fikirde olmadığı bir diyalog. On sekizinci oturumdan sıfat caro’nun hatırlanması, yanıt tüm grup tepkisini olumsuzlayan somos de acuerdo’dan önce no’dur.', pl: 'Dialog oceny ceny i braku zgody grupy. Przypomnienie przymiotnika caro z osiemnastej sesji, odpowiedzią jest no przed somos de acuerdo, przeczące całej reakcji grupy.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsEresOrSomos('Es') },
      { correct: 'caro', prompt: genderQ(false), d1: genderMismatch('caro', 'cara', false), d2: wrongWord('caro', 'fácil', M.facil) },
      negationWord,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSoyOrSon('somos') },
      deWord,
      acuerdoWordWith('difícil', M.dificil),
    ],
  ),
  'es-e01-s25-eres-dificil-no-somos-de-acuerdo': d(
    { ru: 'Ты трудный, мы не согласны', uk: 'Ти важкий, ми не згодні', en: 'You are difficult, we do not agree', 'pt-BR': 'Você é difícil, não concordamos', vi: 'Bạn khó tính, chúng tôi không đồng ý', id: 'Kamu sulit, kami tidak setuju', tr: 'Sen zorsun, biz aynı fikirde değiliz', pl: 'Jesteś trudny, nie zgadzamy się' },
    { ru: 'Диалог о характере собеседника мужского рода и групповом несогласии с этой оценкой. Recall прилагательного difícil из второй сессии, ответ — no перед somos de acuerdo, где отрицается вся групповая реакция целиком.', uk: 'Діалог про характер співрозмовника чоловічого роду й групову незгоду з цією оцінкою. Recall прикметника difícil із другої сесії, відповідь — no перед somos de acuerdo, де заперечується вся групова реакція цілком.', en: 'A dialogue about the character of a masculine listener and the group disagreeing with that assessment. Recall of the adjective difícil from the second session, the reply is no before somos de acuerdo, negating the whole group reaction.', 'pt-BR': 'Um diálogo sobre o caráter de um interlocutor masculino e a discordância do grupo com essa avaliação. Recall do adjetivo difícil da segunda sessão, a resposta é no antes de somos de acuerdo, negando toda a reação do grupo.', vi: 'Đoạn hội thoại về tính cách của người nghe giống đực và sự không đồng ý của nhóm với đánh giá đó. Ôn lại tính từ difícil từ bài thứ hai, câu trả lời là no trước somos de acuerdo, phủ định toàn bộ phản ứng của nhóm.', id: 'Dialog tentang karakter pendengar maskulin dan ketidaksetujuan kelompok dengan penilaian itu. Mengingat kembali kata sifat difícil dari sesi kedua, jawabannya adalah no sebelum somos de acuerdo, menegasikan seluruh reaksi kelompok.', tr: 'Eril bir dinleyicinin karakteri hakkında ve grubun bu değerlendirmeyle aynı fikirde olmadığı bir diyalog. İkinci oturumdan sıfat difícil’in hatırlanması, yanıt tüm grup tepkisini olumsuzlayan somos de acuerdo’dan önce no’dur.', pl: 'Dialog o charakterze słuchacza rodzaju męskiego i braku zgody grupy z tą oceną. Przypomnienie przymiotnika difícil z drugiej sesji, odpowiedzią jest no przed somos de acuerdo, przeczące całej reakcji grupy.' },
    [
      { correct: 'Eres', prompt: T.eresQ, ...eresVsEsOrSomos('Eres') },
      { correct: 'difícil', prompt: qualityQ('difícil'), d1: wrongWord('difícil', 'fácil', M.facil), d2: wrongWord('difícil', 'caro', M.caro) },
      negationWord,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSoyOrSon('somos') },
      deWord,
      acuerdoWordWith('importante', M.importante),
    ],
  ),
});
