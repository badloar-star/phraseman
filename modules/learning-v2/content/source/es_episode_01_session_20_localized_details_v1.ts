import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для 15
// фраз сессии 20 на восьми объяснительных локалях (без 'es'). Фабрика d()
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
  esQ: { ru: 'Какая связка нужна для оценки факта или ситуации?', uk: 'Яка зв’язка потрібна для оцінки факту чи ситуації?', en: 'Which linking word fits evaluating a fact or situation?', 'pt-BR': 'Qual ligação cabe à avaliação de um fato ou situação?', vi: 'Từ nối nào phù hợp khi đánh giá một sự thật hay tình huống?', id: 'Kata penghubung mana yang cocok untuk menilai fakta atau situasi?', tr: 'Bir gerçeği ya da durumu değerlendirmek için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do oceny faktu lub sytuacji?' },
  eresQ: { ru: 'Какая связка нужна для вопроса собеседнику напрямую?', uk: 'Яка зв’язка потрібна для питання співрозмовнику напряму?', en: 'Which linking word fits a question addressed directly to the listener?', 'pt-BR': 'Qual ligação cabe a uma pergunta direta ao interlocutor?', vi: 'Từ nối nào phù hợp khi hỏi trực tiếp người nghe?', id: 'Kata penghubung mana yang cocok untuk pertanyaan langsung ke pendengar?', tr: 'Doğrudan dinleyiciye sorulan bir soru için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do pytania wprost do słuchacza?' },
  somosQ: { ru: 'Какая связка нужна про нас вместе?', uk: 'Яка зв’язка потрібна про нас разом?', en: 'Which linking word fits about us together?', 'pt-BR': 'Qual ligação cabe para nós juntos?', vi: 'Từ nối nào phù hợp khi nói về chúng ta cùng nhau?', id: 'Kata penghubung mana yang cocok untuk kita bersama?', tr: 'Birlikte bizim hakkımızda hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do nas razem?' },
  siQ: { ru: 'Каким словом подтвердить факт?', uk: 'Яким словом підтвердити факт?', en: 'Which word confirms the fact?', 'pt-BR': 'Qual palavra confirma o fato?', vi: 'Từ nào xác nhận sự thật?', id: 'Kata mana yang mengonfirmasi fakta?', tr: 'Gerçeği hangi kelime doğrular?', pl: 'Jakim słowem potwierdzić fakt?' },
  noQ: { ru: 'Каким словом начать отрицание или возражение?', uk: 'Яким словом почати заперечення чи відмову?', en: 'Which word starts the negation or pushback?', 'pt-BR': 'Qual palavra inicia a negação ou contestação?', vi: 'Từ nào bắt đầu phủ định hay phản đối?', id: 'Kata mana yang memulai negasi atau sanggahan?', tr: 'Olumsuzlama ya da karşı çıkış hangi kelimeyle başlar?', pl: 'Jakim słowem zacząć przeczenie lub sprzeciw?' },
  deQ: { ru: 'Какое слово стоит после No в формуле согласия?', uk: 'Яке слово стоїть після No у формулі згоди?', en: 'Which word comes after No in the agreement formula?', 'pt-BR': 'Qual palavra vem depois de No na fórmula de concordância?', vi: 'Từ nào đứng sau No trong công thức đồng ý?', id: 'Kata mana yang muncul setelah No dalam rumus persetujuan?', tr: 'Onay formülünde No’dan sonra hangi kelime gelir?', pl: 'Jakie słowo stoi po No w formule zgody?' },
  acuerdoQ: { ru: 'Каким словом завершить формулу согласия?', uk: 'Яким словом завершити формулу згоди?', en: 'Which word completes the agreement formula?', 'pt-BR': 'Qual palavra completa a fórmula de concordância?', vi: 'Từ nào hoàn tất công thức đồng ý?', id: 'Kata mana yang melengkapi rumus persetujuan?', tr: 'Onay formülünü hangi kelime tamamlar?', pl: 'Jakie słowo kończy formułę zgody?' },
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
    ? { ru: 'Какой признак нужен для предмета мужского рода или по умолчанию?', uk: 'Яка ознака потрібна для предмета чоловічого роду чи за замовчуванням?', en: 'Which quality is needed for a masculine or default noun?', 'pt-BR': 'Qual qualidade é necessária para um substantivo masculino ou padrão?', vi: 'Đặc điểm nào cần cho danh từ giống đực hoặc mặc định?', id: 'Sifat mana yang diperlukan untuk kata benda maskulin atau default?', tr: 'Eril ya da varsayılan bir isim için hangi nitelik gerekir?', pl: 'Jaka cecha jest potrzebna dla rzeczownika męskiego lub domyślnego?' }
    : { ru: 'Какой признак нужен для предмета женского рода?', uk: 'Яка ознака потрібна для предмета жіночого роду?', en: 'Which quality is needed for a feminine noun?', 'pt-BR': 'Qual qualidade é necessária para um substantivo feminino?', vi: 'Đặc điểm nào cần cho danh từ giống cái?', id: 'Sifat mana yang diperlukan untuk kata benda feminin?', tr: 'Dişil bir isim için hangi nitelik gerekir?', pl: 'Jaka cecha jest potrzebna dla rzeczownika żeńskiego?' };
}

function esVsEresOrSoy(target: 'Es' | 'es'): { eres: Reasoned; soy: Reasoned } {
  const eresWord = target === 'Es' ? 'Eres' : 'eres';
  const soyWord = target === 'Es' ? 'Soy' : 'soy';
  return {
    eres: { value: eresWord, trapType: 'grammar', reason: {
      ru: `${eresWord} — обращение к собеседнику напрямую. Оценка факта или ситуации — только ${target}.`,
      uk: `${eresWord} — звернення до співрозмовника напряму. Оцінка факту чи ситуації — тільки ${target}.`,
      en: `${eresWord} addresses the listener directly. Evaluating a fact or situation needs only ${target}.`,
      'pt-BR': `${eresWord} fala com o interlocutor diretamente. Avaliar um fato ou situação precisa só de ${target}.`,
      vi: `${eresWord} nói trực tiếp với người nghe. Đánh giá một sự thật hay tình huống chỉ cần ${target}.`,
      id: `${eresWord} berbicara langsung dengan pendengar. Menilai fakta atau situasi hanya perlu ${target}.`,
      tr: `${eresWord} doğrudan dinleyiciyle konuşur. Bir gerçeği ya da durumu değerlendirmek yalnızca ${target} gerektirir.`,
      pl: `${eresWord} zwraca się bezpośrednio do słuchacza. Ocena faktu lub sytuacji wymaga tylko ${target}.`,
    }},
    soy: { value: soyWord, trapType: 'grammar', reason: {
      ru: `${soyWord} — про себя. Оценка факта или ситуации — только ${target}.`,
      uk: `${soyWord} — про себе. Оцінка факту чи ситуації — тільки ${target}.`,
      en: `${soyWord} is about the speaker. Evaluating a fact or situation needs only ${target}.`,
      'pt-BR': `${soyWord} é sobre quem fala. Avaliar um fato ou situação precisa só de ${target}.`,
      vi: `${soyWord} nói về người nói. Đánh giá một sự thật hay tình huống chỉ cần ${target}.`,
      id: `${soyWord} tentang penutur. Menilai fakta atau situasi hanya perlu ${target}.`,
      tr: `${soyWord} konuşan hakkındadır. Bir gerçeği ya da durumu değerlendirmek yalnızca ${target} gerektirir.`,
      pl: `${soyWord} dotyczy mówiącego. Ocena faktu lub sytuacji wymaga tylko ${target}.`,
    }},
  };
}

const M = {
  igual: { ru: '«всё равно» (безразличие)', uk: '«байдуже» (байдужість)', en: '"indifferent" (does not change things)', 'pt-BR': '"tanto faz" (indiferença)', vi: '"thờ ơ" (không thay đổi gì)', id: '"tidak peduli" (ketidakpedulian)', tr: '"fark etmez" (kayıtsızlık)', pl: '„wszystko jedno” (obojętność)' },
  verdad: { ru: '«правда» (подтверждение факта)', uk: '«правда» (підтвердження факту)', en: '"truth" (confirming a fact)', 'pt-BR': '"verdade" (confirmando um fato)', vi: '"sự thật" (xác nhận sự thật)', id: '"kebenaran" (mengonfirmasi fakta)', tr: '"gerçek" (bir gerçeği onaylamak)', pl: '„prawda” (potwierdzenie faktu)' },
  acuerdo: { ru: '«согласие» (согласие с мнением)', uk: '«згода» (згода з думкою)', en: '"agreement" (agreeing with an opinion)', 'pt-BR': '"concordância" (concordando com uma opinião)', vi: '"đồng ý" (đồng ý với ý kiến)', id: '"persetujuan" (setuju dengan pendapat)', tr: '"onay" (bir görüşe katılmak)', pl: '„zgoda” (zgoda z opinią)' },
  fácil: { ru: '«легко»', uk: '«легко»', en: '"easy"', 'pt-BR': '"fácil"', vi: '"dễ"', id: '"mudah"', tr: '"kolay"', pl: '„łatwo”' },
  dificil: { ru: '«трудно» (противоположный признак)', uk: '«важко» (протилежна ознака)', en: '"hard" (the opposite quality)', 'pt-BR': '"difícil" (a qualidade oposta)', vi: '"khó" (đặc điểm ngược lại)', id: '"sulit" (sifat sebaliknya)', tr: '"zor" (karşıt nitelik)', pl: '„trudno” (przeciwna cecha)' },
  importante: { ru: '«важно»', uk: '«важливо»', en: '"important"', 'pt-BR': '"importante"', vi: '"quan trọng"', id: '"penting"', tr: '"önemli"', pl: '„ważne”' },
  caro: { ru: '«дорого» (про цену)', uk: '«дорого» (про ціну)', en: '"expensive" (about price)', 'pt-BR': '"caro" (sobre preço)', vi: '"đắt" (về giá)', id: '"mahal" (tentang harga)', tr: '"pahalı" (fiyat hakkında)', pl: '„drogo” (o cenie)' },
  segura: { ru: '«уверенная» (другой признак)', uk: '«впевнена» (інша ознака)', en: '"confident" (a different quality)', 'pt-BR': '"confiante" (uma qualidade diferente)', vi: '"tự tin" (đặc điểm khác)', id: '"percaya diri" (sifat berbeda)', tr: '"kendinden emin" (farklı bir nitelik)', pl: '„pewna siebie” (inna cecha)' },
  unico: { ru: '«единственный» (другой признак)', uk: '«єдиний» (інша ознака)', en: '"unique" (a different quality)', 'pt-BR': '"único" (uma qualidade diferente)', vi: '"duy nhất" (đặc điểm khác)', id: '"unik" (sifat berbeda)', tr: '"eşsiz" (farklı bir nitelik)', pl: '„jedyny” (inna cecha)' },
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

function alreadyUsedWord(target: string, wrong: string, wrongUsage: Record<LocaleWithoutEs, string>): Reasoned {
  return { value: wrong, trapType: 'semantic_neighbor', reason: {
    ru: `${wrong} ${wrongUsage.ru}. Здесь нужно ${target}.`,
    uk: `${wrong} ${wrongUsage.uk}. Тут потрібно ${target}.`,
    en: `${wrong} ${wrongUsage.en}. Here you need ${target}.`,
    'pt-BR': `${wrong} ${wrongUsage['pt-BR']}. Aqui precisa de ${target}.`,
    vi: `${wrong} ${wrongUsage.vi}. Ở đây cần ${target}.`,
    id: `${wrong} ${wrongUsage.id}. Di sini perlu ${target}.`,
    tr: `${wrong} ${wrongUsage.tr}. Burada ${target} gerekir.`,
    pl: `${wrong} ${wrongUsage.pl}. Tutaj potrzebne jest ${target}.`,
  }};
}

function genderMismatch(correct: string, wrong: string, correctIsMasc: boolean): Reasoned {
  const wrongEnding = correctIsMasc ? '-a' : '-o';
  const correctEnding = correctIsMasc ? '-o' : '-a';
  const defaultNote = correctIsMasc
    ? { ru: ' Для предмета мужского рода или по умолчанию', uk: ' Для предмета чоловічого роду чи за замовчуванням', en: ' A masculine or default noun', 'pt-BR': ' Um substantivo masculino ou padrão', vi: ' Danh từ giống đực hoặc mặc định', id: ' Kata benda maskulin atau default', tr: ' Eril ya da varsayılan bir isim', pl: ' Rzeczownik męski lub domyślny' }
    : { ru: ' Для предмета женского рода', uk: ' Для предмета жіночого роду', en: ' A feminine noun', 'pt-BR': ' Um substantivo feminino', vi: ' Danh từ giống cái', id: ' Kata benda feminin', tr: ' Dişil bir isim', pl: ' Rzeczownik żeński' };
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма на ${wrongEnding}.${defaultNote.ru} требует форму на ${correctEnding}: ${correct}.`,
    uk: `${wrong} — форма на ${wrongEnding}.${defaultNote.uk} потребує форму на ${correctEnding}: ${correct}.`,
    en: `${wrong} ends in ${wrongEnding}.${defaultNote.en} needs the ${correctEnding} form: ${correct}.`,
    'pt-BR': `${wrong} termina em ${wrongEnding}.${defaultNote['pt-BR']} precisa da forma em ${correctEnding}: ${correct}.`,
    vi: `${wrong} kết thúc bằng ${wrongEnding}.${defaultNote.vi} cần dạng ${correctEnding}: ${correct}.`,
    id: `${wrong} berakhiran ${wrongEnding}.${defaultNote.id} memerlukan bentuk ${correctEnding}: ${correct}.`,
    tr: `${wrong}, ${wrongEnding} ile biter.${defaultNote.tr} ${correctEnding} biçimini gerektirir: ${correct}.`,
    pl: `${wrong} kończy się na ${wrongEnding}.${defaultNote.pl} wymaga formy na ${correctEnding}: ${correct}.`,
  }};
}

const esWord = (prompt: Record<LocaleWithoutEs, string> = T.esQ): WordSpec => {
  const { eres, soy } = esVsEresOrSoy('Es');
  return { correct: 'Es', prompt, d1: eres, d2: soy };
};
const esLowerWord = (prompt: Record<LocaleWithoutEs, string> = T.esQ): WordSpec => {
  const { eres, soy } = esVsEresOrSoy('es');
  return { correct: 'es', prompt, d1: eres, d2: soy };
};
const eresWord: WordSpec = {
  correct: 'Eres',
  prompt: T.eresQ,
  d1: { value: 'Es', trapType: 'grammar', reason: {
    ru: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — только Eres.',
    uk: 'Es — про предмет чи третю особу. Питання співрозмовнику напряму — тільки Eres.',
    en: 'Es is about a thing or third person. A question addressed directly to the listener needs only Eres.',
    'pt-BR': 'Es é sobre uma coisa ou terceira pessoa. Uma pergunta direta ao interlocutor precisa só de Eres.',
    vi: 'Es nói về một vật hay ngôi thứ ba. Hỏi trực tiếp người nghe chỉ cần Eres.',
    id: 'Es tentang benda atau orang ketiga. Pertanyaan langsung ke pendengar hanya perlu Eres.',
    tr: 'Es bir şey ya da üçüncü kişi hakkındadır. Doğrudan dinleyiciye sorulan bir soru yalnızca Eres gerektirir.',
    pl: 'Es dotyczy rzeczy lub trzeciej osoby. Pytanie wprost do słuchacza wymaga tylko Eres.',
  }},
  d2: { value: 'Soy', trapType: 'grammar', reason: {
    ru: 'Soy — про себя. Вопрос собеседнику — только Eres.',
    uk: 'Soy — про себе. Питання співрозмовнику — тільки Eres.',
    en: 'Soy is about the speaker. A question to the listener needs only Eres.',
    'pt-BR': 'Soy é sobre quem fala. Uma pergunta ao interlocutor precisa só de Eres.',
    vi: 'Soy nói về người nói. Hỏi người nghe chỉ cần Eres.',
    id: 'Soy tentang penutur. Pertanyaan ke pendengar hanya perlu Eres.',
    tr: 'Soy konuşan hakkındadır. Dinleyiciye soru yalnızca Eres gerektirir.',
    pl: 'Soy dotyczy mówiącego. Pytanie do słuchacza wymaga tylko Eres.',
  }},
};
const somosWord: WordSpec = {
  correct: 'Somos',
  prompt: T.somosQ,
  d1: { value: 'Son', trapType: 'grammar', reason: {
    ru: 'Son — «они» или вежливое «вы» много человек. Про себя вместе с кем-то — Somos.',
    uk: 'Son — «вони» або ввічливе «ви» багато людей. Про себе разом із кимось — Somos.',
    en: 'Son is "they" or the polite "you" for many people. About yourself with someone else — Somos.',
    'pt-BR': 'Son é "eles" ou o "você" educado para muitas pessoas. Sobre você mesmo com outra pessoa — Somos.',
    vi: 'Son là "họ" hay "bạn" lịch sự cho nhiều người. Về bản thân cùng ai đó — Somos.',
    id: 'Son adalah "mereka" atau "Anda" sopan untuk banyak orang. Tentang diri sendiri bersama orang lain — Somos.',
    tr: 'Son "onlar" ya da çok kişi için nazik "siz" demektir. Kendiniz ve bir başkası hakkında — Somos.',
    pl: 'Son to „oni” lub grzeczne „wy” dla wielu osób. O sobie razem z kimś — Somos.',
  }},
  d2: { value: 'Sois', trapType: 'grammar', reason: {
    ru: 'Sois — форма для vosotros, которую этот курс не использует. Про себя вместе с кем-то — Somos.',
    uk: 'Sois — форма для vosotros, яку цей курс не використовує. Про себе разом із кимось — Somos.',
    en: 'Sois is the vosotros form, which this course does not use. About yourself with someone else — Somos.',
    'pt-BR': 'Sois é a forma de vosotros, que este curso não usa. Sobre você mesmo com outra pessoa — Somos.',
    vi: 'Sois là dạng vosotros mà khóa học này không dùng. Về bản thân cùng ai đó — Somos.',
    id: 'Sois adalah bentuk vosotros, yang tidak dipakai kursus ini. Tentang diri sendiri bersama orang lain — Somos.',
    tr: 'Sois, bu kursun kullanmadığı vosotros biçimidir. Kendiniz ve bir başkası hakkında — Somos.',
    pl: 'Sois to forma vosotros, której ten kurs nie używa. O sobie razem z kimś — Somos.',
  }},
};
const siWord: WordSpec = {
  correct: 'Sí',
  prompt: T.siQ,
  d1: { value: 'No', trapType: 'semantic_neighbor', reason: {
    ru: 'No отрицает, а тут подтверждают факт. Нужно Sí, а не No.',
    uk: 'No заперечує, а тут підтверджують факт. Потрібно Sí, а не No.',
    en: 'No negates, but here you confirm the fact. You need Sí, not No.',
    'pt-BR': 'No nega, mas aqui se confirma o fato. Precisa de Sí, não de No.',
    vi: 'No phủ định, nhưng ở đây xác nhận sự thật. Cần Sí, không phải No.',
    id: 'No menyangkal, tetapi di sini mengonfirmasi fakta. Perlu Sí, bukan No.',
    tr: 'No olumsuzlar, ama burada gerçek doğrulanıyor. No değil, Sí gerekir.',
    pl: 'No zaprzecza, a tu potwierdza się fakt. Potrzebne jest Sí, nie No.',
  }},
  d2: { value: 'Nada', trapType: 'semantic_neighbor', reason: {
    ru: 'Nada означает «ничего», отдельное слово-предмет, не ответ на вопрос. Нужно Sí, а не Nada.',
    uk: 'Nada означає «нічого», окреме слово-предмет, не відповідь на питання. Потрібно Sí, а не Nada.',
    en: 'Nada means "nothing", a separate noun, not an answer to a question. You need Sí, not Nada.',
    'pt-BR': 'Nada significa "nada", um substantivo separado, não uma resposta a uma pergunta. Precisa de Sí, não de Nada.',
    vi: 'Nada nghĩa là "không có gì", một danh từ riêng, không phải câu trả lời cho câu hỏi. Cần Sí, không phải Nada.',
    id: 'Nada berarti "tidak ada", kata benda terpisah, bukan jawaban atas pertanyaan. Perlu Sí, bukan Nada.',
    tr: 'Nada "hiçbir şey" demektir, ayrı bir isimdir, bir sorunun cevabı değildir. Nada değil, Sí gerekir.',
    pl: 'Nada oznacza „nic”, osobny rzeczownik, nie odpowiedź na pytanie. Potrzebne jest Sí, nie Nada.',
  }},
};
const noWord: WordSpec = {
  correct: 'No',
  prompt: T.noQ,
  d1: { value: 'Nada', trapType: 'semantic_neighbor', reason: {
    ru: 'Nada — «ничего», отдельное слово-предмет. Отрицание — No.',
    uk: 'Nada — «нічого», окреме слово-предмет. Заперечення — No.',
    en: 'Nada is "nothing", a separate noun. Negation is No.',
    'pt-BR': 'Nada é "nada", um substantivo separado. Negação é No.',
    vi: 'Nada là "không có gì", một danh từ riêng. Phủ định là No.',
    id: 'Nada berarti "tidak ada", kata benda terpisah. Negasi adalah No.',
    tr: 'Nada "hiçbir şey" demektir, ayrı bir isimdir. Olumsuzlama No’dur.',
    pl: 'Nada to „nic”, osobny rzeczownik. Przeczenie to No.',
  }},
  d2: { value: 'Non', trapType: 'orthographic', reason: {
    ru: 'Non — не испанское слово. В испанском отрицание пишется No.',
    uk: 'Non — не іспанське слово. В іспанській заперечення пишеться No.',
    en: 'Non is not a Spanish word. In Spanish, negation is spelled No.',
    'pt-BR': 'Non não é uma palavra espanhola. Em espanhol, a negação se escreve No.',
    vi: 'Non không phải từ tiếng Tây Ban Nha. Trong tiếng Tây Ban Nha, phủ định viết là No.',
    id: 'Non bukan kata bahasa Spanyol. Dalam bahasa Spanyol, negasi ditulis No.',
    tr: 'Non İspanyolca bir kelime değildir. İspanyolcada olumsuzlama No olarak yazılır.',
    pl: 'Non nie jest hiszpańskim słowem. W hiszpańskim przeczenie pisze się No.',
  }},
};
const noLowerWord: WordSpec = {
  correct: 'no',
  prompt: T.noQ,
  d1: { value: 'nada', trapType: 'semantic_neighbor', reason: {
    ru: 'Nada — «ничего». Отрицание согласия — no.',
    uk: 'Nada — «нічого». Заперечення згоди — no.',
    en: 'Nada is "nothing". The negation of agreement is no.',
    'pt-BR': 'Nada é "nada". A negação da concordância é no.',
    vi: 'Nada là "không có gì". Phủ định sự đồng ý là no.',
    id: 'Nada berarti "tidak ada". Negasi persetujuan adalah no.',
    tr: 'Nada "hiçbir şey" demektir. Onayın olumsuzlanması no’dur.',
    pl: 'Nada to „nic”. Przeczenie zgody to no.',
  }},
  d2: { value: 'non', trapType: 'orthographic', reason: {
    ru: 'Non — не испанское слово. Отрицание пишется no.',
    uk: 'Non — не іспанське слово. Заперечення пишеться no.',
    en: 'Non is not a Spanish word. Negation is spelled no.',
    'pt-BR': 'Non não é uma palavra espanhola. A negação se escreve no.',
    vi: 'Non không phải từ tiếng Tây Ban Nha. Phủ định viết là no.',
    id: 'Non bukan kata bahasa Spanyol. Negasi ditulis no.',
    tr: 'Non İspanyolca bir kelime değildir. Olumsuzlama no olarak yazılır.',
    pl: 'Non nie jest hiszpańskim słowem. Przeczenie pisze się no.',
  }},
};
const deCapitalWord: WordSpec = {
  correct: 'De',
  prompt: T.deQ,
  d1: { value: 'Es', trapType: 'semantic_neighbor', reason: {
    ru: 'Es — связка «есть», а не часть формулы согласия. Формула согласия начинается с De.',
    uk: 'Es — зв’язка «є», а не частина формули згоди. Формула згоди починається з De.',
    en: 'Es is the linking word "is", not part of the agreement formula. The agreement formula starts with De.',
    'pt-BR': 'Es é a ligação "é", não parte da fórmula de concordância. A fórmula de concordância começa com De.',
    vi: 'Es là từ nối "là", không thuộc công thức đồng ý. Công thức đồng ý bắt đầu bằng De.',
    id: 'Es adalah kata penghubung "adalah", bukan bagian dari rumus persetujuan. Rumus persetujuan dimulai dengan De.',
    tr: 'Es "dir/dır" bağlacıdır, onay formülünün parçası değildir. Onay formülü De ile başlar.',
    pl: 'Es to łącznik „jest”, nie część formuły zgody. Formuła zgody zaczyna się od De.',
  }},
  d2: { value: 'No', trapType: 'semantic_neighbor', reason: {
    ru: 'No отрицает, а тут утверждается согласие. Формула согласия начинается с De.',
    uk: 'No заперечує, а тут стверджується згода. Формула згоди починається з De.',
    en: 'No negates, but here agreement is being stated. The agreement formula starts with De.',
    'pt-BR': 'No nega, mas aqui se afirma concordância. A fórmula de concordância começa com De.',
    vi: 'No phủ định, nhưng ở đây khẳng định sự đồng ý. Công thức đồng ý bắt đầu bằng De.',
    id: 'No menyangkal, tetapi di sini menyatakan persetujuan. Rumus persetujuan dimulai dengan De.',
    tr: 'No olumsuzlar, ama burada onay ifade ediliyor. Onay formülü De ile başlar.',
    pl: 'No zaprzecza, a tu stwierdza się zgodę. Formuła zgody zaczyna się od De.',
  }},
};
const deWord: WordSpec = {
  correct: 'de',
  prompt: T.deQ,
  d1: { value: 'muy', trapType: 'semantic_neighbor', reason: {
    ru: 'Muy означает «очень», не входит в формулу согласия. Нужно de.',
    uk: 'Muy означає «дуже», не входить у формулу згоди. Потрібно de.',
    en: 'Muy means "very", it is not part of the agreement formula. You need de.',
    'pt-BR': 'Muy significa "muito", não faz parte da fórmula de concordância. Precisa de de.',
    vi: 'Muy nghĩa là "rất", không thuộc công thức đồng ý. Cần de.',
    id: 'Muy berarti "sangat", bukan bagian dari rumus persetujuan. Perlu de.',
    tr: 'Muy "çok" demektir, onay formülüne dahil değildir. De gerekir.',
    pl: 'Muy znaczy „bardzo”, nie wchodzi w formułę zgody. Potrzebne jest de.',
  }},
  d2: { value: 'tan', trapType: 'semantic_neighbor', reason: {
    ru: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.',
    uk: 'Tan означає «настільки», не входить у формулу згоди. Потрібно de.',
    en: 'Tan means "so much", it is not part of the agreement formula. You need de.',
    'pt-BR': 'Tan significa "tão", não faz parte da fórmula de concordância. Precisa de de.',
    vi: 'Tan nghĩa là "đến mức", không thuộc công thức đồng ý. Cần de.',
    id: 'Tan berarti "sedemikian", bukan bagian dari rumus persetujuan. Perlu de.',
    tr: 'Tan "o kadar" demektir, onay formülüne dahil değildir. De gerekir.',
    pl: 'Tan znaczy „tak bardzo”, nie wchodzi w formułę zgody. Potrzebne jest de.',
  }},
};
const acuerdoWord = (thirdDistractorTarget?: string): WordSpec => ({
  correct: 'acuerdo',
  prompt: T.acuerdoQ,
  d1: { value: 'igual', trapType: 'semantic_neighbor', reason: {
    ru: 'Igual означает безразличие, а не (не)согласие. Нужно acuerdo.',
    uk: 'Igual означає байдужість, а не (не)згоду. Потрібно acuerdo.',
    en: 'Igual means indifference, not agreement (or the lack of it). You need acuerdo.',
    'pt-BR': 'Igual significa indiferença, não (não) concordância. Precisa de acuerdo.',
    vi: 'Igual nghĩa là thờ ơ, không phải (không) đồng ý. Cần acuerdo.',
    id: 'Igual berarti ketidakpedulian, bukan (tidak) setuju. Perlu acuerdo.',
    tr: 'Igual kayıtsızlık demektir, (olumsuz) onay değil. Acuerdo gerekir.',
    pl: 'Igual znaczy obojętność, nie (brak) zgody. Potrzebne jest acuerdo.',
  }},
  d2: thirdDistractorTarget
    ? alreadyUsedWord('acuerdo', thirdDistractorTarget, {
        ru: 'уже использовано выше в этой же фразе с другим смыслом',
        uk: 'уже використано вище в цій самій фразі з іншим сенсом',
        en: 'was already used above in this same phrase with a different meaning',
        'pt-BR': 'já foi usado acima nesta mesma frase com outro sentido',
        vi: 'đã được dùng ở trên trong cùng câu này với nghĩa khác',
        id: 'sudah dipakai di atas dalam frasa yang sama dengan makna berbeda',
        tr: 'bu ifadede yukarıda farklı bir anlamla zaten kullanıldı',
        pl: 'zostało już użyte wyżej w tej samej frazie w innym znaczeniu',
      })
    : wrongWord('acuerdo', 'verdad', M.verdad),
});

export const ES_SESSION_20_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s20-es-verdad-q': d(
    { ru: 'Это правда?', uk: 'Це правда?', en: 'Is it true?', 'pt-BR': 'É verdade?', vi: 'Điều đó có đúng không?', id: 'Apakah itu benar?', tr: 'Bu doğru mu?', pl: 'Czy to prawda?' },
    { ru: 'Прямой вопрос: соответствует ли заявление действительности. Es здесь безличное — речь о самом факте, а не о том, кто его произнёс.', uk: 'Прямe питання: чи відповідає заява дійсності. Es тут безособове — йдеться про сам факт, а не про того, хто його висловив.', en: 'A direct question: does the claim match reality. Es here is impersonal — it is about the fact itself, not who stated it.', 'pt-BR': 'Uma pergunta direta: a afirmação corresponde à realidade? Es aqui é impessoal — é sobre o próprio fato, não sobre quem o disse.', vi: 'Một câu hỏi trực tiếp: tuyên bố có đúng với thực tế không. Es ở đây phi nhân xưng — nói về chính sự thật, không phải người nói ra nó.', id: 'Pertanyaan langsung: apakah klaim itu sesuai kenyataan. Es di sini impersonal — tentang faktanya sendiri, bukan siapa yang mengatakannya.', tr: 'Doğrudan bir soru: iddia gerçeğe uyuyor mu. Buradaki Es kişisizdir — konuşanla değil, gerçeğin kendisiyle ilgilidir.', pl: 'Bezpośrednie pytanie: czy twierdzenie odpowiada rzeczywistości. Es jest tu bezosobowe — chodzi o sam fakt, nie o to, kto go wypowiedział.' },
    [esWord(T.esQ), { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'igual', M.igual), d2: wrongWord('verdad', 'acuerdo', M.acuerdo) }],
  ),
  'es-e01-s20-si-es-verdad': d(
    { ru: 'Да, это правда', uk: 'Так, це правда', en: 'Yes, it is true', 'pt-BR': 'Sim, é verdade', vi: 'Đúng, đó là sự thật', id: 'Ya, itu benar', tr: 'Evet, bu doğru', pl: 'Tak, to prawda' },
    { ru: 'Прямое подтверждение факта в ответ на вопрос ¿Es verdad? Sí стоит первым словом реплики, es verdad не меняется.', uk: 'Пряме підтвердження факту у відповідь на питання ¿Es verdad? Sí стоїть першим словом репліки, es verdad не змінюється.', en: 'A direct confirmation of the fact in reply to ¿Es verdad? Sí comes as the first word of the reply, es verdad does not change.', 'pt-BR': 'Uma confirmação direta do fato em resposta a ¿Es verdad? Sí vem como a primeira palavra da resposta, es verdad não muda.', vi: 'Xác nhận trực tiếp sự thật để đáp lại ¿Es verdad? Sí là từ đầu tiên của câu trả lời, es verdad không đổi.', id: 'Konfirmasi langsung atas fakta sebagai balasan atas ¿Es verdad? Sí adalah kata pertama dalam balasan, es verdad tidak berubah.', tr: '¿Es verdad? sorusuna doğrudan bir doğrulama. Sí, yanıtın ilk kelimesi olarak gelir, es verdad değişmez.', pl: 'Bezpośrednie potwierdzenie faktu w odpowiedzi na ¿Es verdad? Sí jest pierwszym słowem odpowiedzi, es verdad się nie zmienia.' },
    [siWord, esLowerWord(T.esQ), { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'igual', M.igual), d2: wrongWord('verdad', 'acuerdo', M.acuerdo) }],
  ),
  'es-e01-s20-no-es-verdad': d(
    { ru: 'Это неправда', uk: 'Це неправда', en: 'It is not true', 'pt-BR': 'Não é verdade', vi: 'Điều đó không đúng', id: 'Itu tidak benar', tr: 'Bu doğru değil', pl: 'To nieprawda' },
    { ru: 'Прямое опровержение заявления как ложного. No встаёт перед связкой es, признак verdad не меняется — та же схема отрицания, что и в предыдущих сессиях.', uk: 'Пряме спростування заяви як хибної. No стоїть перед зв’язкою es, ознака verdad не змінюється — та сама схема заперечення, що й у попередніх сесіях.', en: 'A direct refutation of a claim as false. No comes before the linking word es, the quality verdad does not change — the same negation pattern as before.', 'pt-BR': 'Uma refutação direta de uma afirmação como falsa. No vem antes da ligação es, a qualidade verdad não muda — o mesmo padrão de negação de antes.', vi: 'Bác bỏ trực tiếp một tuyên bố là sai. No đứng trước từ nối es, đặc điểm verdad không đổi — cùng khuôn mẫu phủ định như trước.', id: 'Sanggahan langsung atas klaim sebagai salah. No berada sebelum kata penghubung es, sifat verdad tidak berubah — pola negasi yang sama seperti sebelumnya.', tr: 'Bir iddianın yanlış olduğunu doğrudan çürütme. No, es bağlacından önce gelir, verdad niteliği değişmez — öncekiyle aynı olumsuzlama düzeni.', pl: 'Bezpośrednie obalenie twierdzenia jako fałszywego. No stoi przed łącznikiem es, cecha verdad się nie zmienia — ten sam wzorzec przeczenia co wcześniej.' },
    [noWord, esLowerWord(T.esQ), { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'igual', M.igual), d2: wrongWord('verdad', 'acuerdo', M.acuerdo) }],
  ),
  'es-e01-s20-es-igual-q': d(
    { ru: 'Разве это не всё равно?', uk: 'Хіба це не байдуже?', en: 'Does it even matter?', 'pt-BR': 'Isso importa?', vi: 'Điều đó có khác gì không?', id: 'Apakah itu penting?', tr: 'Fark eder mi ki?', pl: 'Czy to ma znaczenie?' },
    { ru: 'Вопрос о том, меняет ли заявление положение дел. Не спутать с ¿Es verdad? — здесь спрашивают про безразличие, а не про истинность.', uk: 'Питання про те, чи змінює заява стан справ. Не сплутати з ¿Es verdad? — тут запитують про байдужість, а не про істинність.', en: 'A question about whether the claim changes anything. Not to be confused with ¿Es verdad? — here the question is about indifference, not truth.', 'pt-BR': 'Uma pergunta sobre se a afirmação muda algo. Não confundir com ¿Es verdad? — aqui a pergunta é sobre indiferença, não sobre a verdade.', vi: 'Câu hỏi về việc tuyên bố có làm thay đổi gì không. Đừng nhầm với ¿Es verdad? — ở đây hỏi về sự thờ ơ, không phải tính đúng đắn.', id: 'Pertanyaan tentang apakah klaim itu mengubah sesuatu. Jangan disamakan dengan ¿Es verdad? — di sini pertanyaannya tentang ketidakpedulian, bukan kebenaran.', tr: 'İddianın bir şeyi değiştirip değiştirmediğine dair bir soru. ¿Es verdad? ile karıştırılmamalı — burada soru kayıtsızlıkla ilgilidir, doğrulukla değil.', pl: 'Pytanie o to, czy twierdzenie coś zmienia. Nie mylić z ¿Es verdad? — tu pytanie dotyczy obojętności, nie prawdziwości.' },
    [esWord(T.esQ), { correct: 'igual', prompt: qualityQ('igual'), d1: wrongWord('igual', 'verdad', M.verdad), d2: { value: 'iguala', trapType: 'grammar', reason: {
      ru: 'Igual не меняется по роду — формы iguala не существует.',
      uk: 'Igual не змінюється за родом — форми iguala не існує.',
      en: 'Igual never changes by gender — the form iguala does not exist.',
      'pt-BR': 'Igual nunca muda por gênero — a forma iguala não existe.',
      vi: 'Igual không đổi theo giống — dạng iguala không tồn tại.',
      id: 'Igual tidak berubah menurut gender — bentuk iguala tidak ada.',
      tr: 'Igual cinsiyete göre hiç değişmez — iguala biçimi yoktur.',
      pl: 'Igual nigdy nie zmienia się przez rodzaj — forma iguala nie istnieje.',
    }} }],
  ),
  'es-e01-s20-de-acuerdo': d(
    { ru: 'Согласен', uk: 'Згоден', en: 'Agreed', 'pt-BR': 'Concordo', vi: 'Đồng ý', id: 'Setuju', tr: 'Katılıyorum', pl: 'Zgadzam się' },
    { ru: 'Самостоятельная реплика согласия с чужим мнением о заявлении. Форма не меняется ни по роду, ни по числу — застывшая формула, как и в предыдущей сессии.', uk: 'Самостійна репліка згоди з чужою думкою про заяву. Форма не змінюється ні за родом, ні за числом — застигла формула, як і в попередній сесії.', en: 'A standalone reply agreeing with someone else\'s opinion about a claim. The form does not change by gender or number — a fixed formula, as in the previous topic.', 'pt-BR': 'Uma resposta independente concordando com a opinião de outra pessoa sobre uma afirmação. A forma não muda por gênero ou número — uma fórmula fixa, como no tema anterior.', vi: 'Một câu trả lời độc lập đồng ý với ý kiến của người khác về một tuyên bố. Dạng không đổi theo giống hay số — công thức cố định, như chủ đề trước.', id: 'Balasan mandiri yang setuju dengan pendapat orang lain tentang suatu klaim. Bentuknya tidak berubah menurut gender atau jumlah — rumus tetap, seperti topik sebelumnya.', tr: 'Bir iddia hakkında başkasının fikrine katılan bağımsız bir yanıt. Biçim cinsiyete ya da sayıya göre değişmez — önceki konudaki gibi sabit bir formül.', pl: 'Samodzielna odpowiedź zgadzająca się z czyjąś opinią o twierdzeniu. Forma nie zmienia się przez rodzaj ani liczbę — utrwalona formuła, jak w poprzednim temacie.' },
    [deCapitalWord, acuerdoWord()],
  ),
  'es-e01-s20-es-verdad-de-acuerdo': d(
    { ru: 'Это правда, согласен', uk: 'Це правда, згоден', en: 'It is true, agreed', 'pt-BR': 'É verdade, concordo', vi: 'Đó là sự thật, đồng ý', id: 'Itu benar, setuju', tr: 'Bu doğru, katılıyorum', pl: 'To prawda, zgadzam się' },
    { ru: 'Диалог из двух реплик: подтверждение факта и отдельное согласие с выводом из него. Es verdad оценивает сам факт, de acuerdo — реакция согласия, это разные вещи, произнесённые подряд.', uk: 'Діалог із двох реплік: підтвердження факту та окрема згода з висновком із нього. Es verdad оцінює сам факт, de acuerdo — реакція згоди, це різні речі, сказані підряд.', en: 'A two-line exchange: confirming the fact and separately agreeing with the conclusion from it. Es verdad evaluates the fact itself, de acuerdo is the agreement reaction — two different things said in a row.', 'pt-BR': 'Uma troca de duas falas: confirmar o fato e, separadamente, concordar com a conclusão dele. Es verdad avalia o próprio fato, de acuerdo é a reação de concordância — duas coisas diferentes ditas seguidas.', vi: 'Trao đổi hai câu: xác nhận sự thật và riêng biệt đồng ý với kết luận từ đó. Es verdad đánh giá chính sự thật, de acuerdo là phản ứng đồng ý — hai điều khác nhau nói liền nhau.', id: 'Pertukaran dua baris: mengonfirmasi fakta dan secara terpisah setuju dengan kesimpulannya. Es verdad menilai faktanya sendiri, de acuerdo adalah reaksi persetujuan — dua hal berbeda diucapkan berurutan.', tr: 'İki satırlık bir alışveriş: gerçeği doğrulamak ve ondan çıkan sonuca ayrıca katılmak. Es verdad gerçeğin kendisini değerlendirir, de acuerdo onay tepkisidir — art arda söylenen iki farklı şey.', pl: 'Wymiana dwóch kwestii: potwierdzenie faktu i osobna zgoda z wnioskiem z niego. Es verdad ocenia sam fakt, de acuerdo to reakcja zgody — dwie różne rzeczy powiedziane pod rząd.' },
    [esWord(T.esQ), { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'igual', M.igual), d2: alreadyUsedWord('verdad', 'acuerdo', {
      ru: 'уже используется дальше как отдельная реплика согласия',
      uk: 'уже використовується далі як окрема репліка згоди',
      en: 'is already used further along as a separate agreement reply',
      'pt-BR': 'já é usado mais adiante como uma resposta de concordância separada',
      vi: 'đã được dùng ở phía sau như một câu trả lời đồng ý riêng',
      id: 'sudah dipakai lebih lanjut sebagai balasan persetujuan terpisah',
      tr: 'ilerideki ayrı bir onay yanıtı olarak zaten kullanılıyor',
      pl: 'jest już użyte dalej jako osobna odpowiedź zgody',
    }) }, deWord, acuerdoWord('verdad')],
  ),
  'es-e01-s20-eres-de-acuerdo-es-verdad-q': d(
    { ru: 'Ты согласен? Это правда', uk: 'Ти згоден? Це правда', en: 'Are you agreed? It is true', 'pt-BR': 'Você concorda? É verdade', vi: 'Bạn đồng ý không? Đó là sự thật', id: 'Kamu setuju? Itu benar', tr: 'Katılıyor musun? Bu doğru', pl: 'Zgadzasz się? To prawda' },
    { ru: 'Вопрос собеседнику напрямую (Eres) и отдельное заявление о факте (Es verdad) — контраст двух связок внутри одной пары реплик, как учит эта тема.', uk: 'Питання співрозмовнику напряму (Eres) та окрема заява про факт (Es verdad) — контраст двох зв’язок усередині однієї пари реплік, як і вчить ця тема.', en: 'A question addressed directly to the listener (Eres) and a separate statement of fact (Es verdad) — a contrast of two linking words inside one exchange, as this topic teaches.', 'pt-BR': 'Uma pergunta direta ao interlocutor (Eres) e uma afirmação separada de fato (Es verdad) — um contraste de duas ligações dentro de uma mesma troca, como este tema ensina.', vi: 'Câu hỏi trực tiếp với người nghe (Eres) và một tuyên bố sự thật riêng biệt (Es verdad) — sự đối lập giữa hai từ nối trong cùng một cuộc trao đổi, đúng như chủ đề này dạy.', id: 'Pertanyaan langsung ke pendengar (Eres) dan pernyataan fakta terpisah (Es verdad) — kontras dua kata penghubung dalam satu pertukaran, seperti yang diajarkan topik ini.', tr: 'Doğrudan dinleyiciye sorulan bir soru (Eres) ve ayrı bir gerçek ifadesi (Es verdad) — bu konunun öğrettiği gibi, tek bir alışveriş içinde iki bağlacın karşıtlığı.', pl: 'Pytanie wprost do słuchacza (Eres) i osobne stwierdzenie faktu (Es verdad) — kontrast dwóch łączników w jednej wymianie kwestii, czego uczy ten temat.' },
    [eresWord, deWord, acuerdoWord(), esWord(T.esQ), { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'igual', M.igual), d2: alreadyUsedWord('verdad', 'acuerdo', {
      ru: 'уже стояло выше как часть вопроса',
      uk: 'уже стояло вище як частина питання',
      en: 'already appeared above as part of the question',
      'pt-BR': 'já apareceu acima como parte da pergunta',
      vi: 'đã xuất hiện ở trên như một phần của câu hỏi',
      id: 'sudah muncul di atas sebagai bagian dari pertanyaan',
      tr: 'yukarıda sorunun bir parçası olarak zaten geçti',
      pl: 'pojawiło się już wyżej jako część pytania',
    }) }],
  ),
  'es-e01-s20-no-es-verdad-de-acuerdo': d(
    { ru: 'Это неправда, не согласен', uk: 'Це неправда, не згоден', en: 'It is not true, disagree', 'pt-BR': 'Não é verdade, discordo', vi: 'Điều đó không đúng, không đồng ý', id: 'Itu tidak benar, tidak setuju', tr: 'Bu doğru değil, katılmıyorum', pl: 'To nieprawda, nie zgadzam się' },
    { ru: 'Двойное отрицание в двух отдельных репликах: сначала опровергают сам факт, потом отдельно отказывают в согласии с выводом. No встаёт перед каждой частью независимо.', uk: 'Подвійне заперечення у двох окремих репліках: спершу спростовують сам факт, потім окремо відмовляють у згоді з висновком. No стоїть перед кожною частиною незалежно.', en: 'A double negation in two separate replies: first the fact itself is refuted, then agreement with the conclusion is separately declined. No comes before each part independently.', 'pt-BR': 'Uma dupla negação em duas respostas separadas: primeiro o fato em si é refutado, depois a concordância com a conclusão é recusada separadamente. No vem antes de cada parte independentemente.', vi: 'Phủ định kép trong hai câu trả lời riêng biệt: trước tiên bác bỏ chính sự thật, sau đó riêng biệt từ chối đồng ý với kết luận. No đứng trước mỗi phần một cách độc lập.', id: 'Negasi ganda dalam dua balasan terpisah: pertama fakta itu sendiri disanggah, lalu persetujuan dengan kesimpulan ditolak secara terpisah. No berada sebelum setiap bagian secara independen.', tr: 'İki ayrı yanıtta çifte olumsuzlama: önce gerçeğin kendisi çürütülür, sonra sonuca katılım ayrıca reddedilir. No, her bölümden önce bağımsız olarak gelir.', pl: 'Podwójne przeczenie w dwóch osobnych odpowiedziach: najpierw obala się sam fakt, potem osobno odmawia się zgody z wnioskiem. No stoi przed każdą częścią niezależnie.' },
    [noWord, esLowerWord(T.esQ), { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'igual', M.igual), d2: alreadyUsedWord('verdad', 'acuerdo', {
      ru: 'используется дальше отдельно для согласия',
      uk: 'використовується далі окремо для згоди',
      en: 'is used further along separately for agreement',
      'pt-BR': 'é usado mais adiante separadamente para concordância',
      vi: 'được dùng ở phía sau riêng cho sự đồng ý',
      id: 'dipakai lebih lanjut secara terpisah untuk persetujuan',
      tr: 'ilerideki onay için ayrıca kullanılıyor',
      pl: 'jest używane dalej osobno dla zgody',
    }) }, noLowerWord, deWord, acuerdoWord('verdad')],
  ),
  'es-e01-s20-es-facil-es-verdad-q': d(
    { ru: 'Это легко? Это правда', uk: 'Це легко? Це правда', en: 'Is it easy? It is true', 'pt-BR': 'É fácil? É verdade', vi: 'Điều đó dễ không? Đó là sự thật', id: 'Apakah itu mudah? Itu benar', tr: 'Bu kolay mı? Bu doğru', pl: 'Czy to łatwe? To prawda' },
    { ru: 'Вопрос об одном признаке (сложность) и подтверждение другого (истинность) внутри одной пары реплик — оба используют одну и ту же связку es, потому что оба про безличную ситуацию.', uk: 'Питання про одну ознаку (складність) і підтвердження іншої (істинність) усередині однієї пари реплік — обидва використовують ту саму зв’язку es, бо обидва про безособову ситуацію.', en: 'A question about one quality (difficulty) and confirmation of another (truth) inside one exchange — both use the same linking word es, because both are about an impersonal situation.', 'pt-BR': 'Uma pergunta sobre uma qualidade (dificuldade) e a confirmação de outra (verdade) dentro de uma mesma troca — ambas usam a mesma ligação es, porque ambas são sobre uma situação impessoal.', vi: 'Câu hỏi về một đặc điểm (độ khó) và xác nhận đặc điểm khác (tính đúng đắn) trong cùng một cuộc trao đổi — cả hai đều dùng cùng từ nối es, vì cả hai đều nói về một tình huống phi nhân xưng.', id: 'Pertanyaan tentang satu sifat (kesulitan) dan konfirmasi sifat lain (kebenaran) dalam satu pertukaran — keduanya memakai kata penghubung es yang sama, karena keduanya tentang situasi impersonal.', tr: 'Bir alışveriş içinde bir nitelik (zorluk) hakkında soru ve başka bir nitelik (doğruluk) hakkında doğrulama — ikisi de aynı es bağlacını kullanır, çünkü ikisi de kişisiz bir durum hakkındadır.', pl: 'Pytanie o jedną cechę (trudność) i potwierdzenie innej (prawdziwość) w jednej wymianie — obie używają tego samego łącznika es, bo obie dotyczą bezosobowej sytuacji.' },
    [esWord(T.esQ), { correct: 'fácil', prompt: qualityQ('fácil'), d1: wrongWord('fácil', 'difícil', M.dificil), d2: wrongWord('fácil', 'importante', M.importante) }, esWord(T.esQ), { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'igual', M.igual), d2: alreadyUsedWord('verdad', 'fácil', {
      ru: 'уже стояло выше про сложность, а здесь нужно существительное про истинность',
      uk: 'уже стояло вище про складність, а тут потрібен іменник про істинність',
      en: 'already appeared above about difficulty, but here you need the noun about truth',
      'pt-BR': 'já apareceu acima sobre dificuldade, mas aqui precisa do substantivo sobre a verdade',
      vi: 'đã xuất hiện ở trên nói về độ khó, còn ở đây cần danh từ về tính đúng đắn',
      id: 'sudah muncul di atas tentang kesulitan, tetapi di sini perlu kata benda tentang kebenaran',
      tr: 'yukarıda zorlukla ilgili zaten geçti, ama burada doğrulukla ilgili isim gerekir',
      pl: 'pojawiło się już wyżej przy trudności, a tu potrzebny jest rzeczownik o prawdziwości',
    }) }],
  ),
  'es-e01-s20-somos-de-acuerdo-es-verdad': d(
    { ru: 'Мы согласны, это правда', uk: 'Ми згодні, це правда', en: 'We agree, it is true', 'pt-BR': 'Nós concordamos, é verdade', vi: 'Chúng tôi đồng ý, đó là sự thật', id: 'Kami setuju, itu benar', tr: 'Katılıyoruz, bu doğru', pl: 'Zgadzamy się, to prawda' },
    { ru: 'Согласие нескольких людей (somos) с заявлением, за которым следует отдельное подтверждение самого факта. De acuerdo не меняется по числу, es verdad не меняется вовсе.', uk: 'Згода кількох людей (somos) із заявою, за якою йде окреме підтвердження самого факту. De acuerdo не змінюється за числом, es verdad не змінюється взагалі.', en: 'Agreement from several people (somos) with a claim, followed by a separate confirmation of the fact itself. De acuerdo does not change by number, es verdad does not change at all.', 'pt-BR': 'Concordância de várias pessoas (somos) com uma afirmação, seguida de uma confirmação separada do próprio fato. De acuerdo não muda por número, es verdad não muda em nada.', vi: 'Sự đồng ý của nhiều người (somos) với một tuyên bố, tiếp theo là xác nhận riêng biệt về chính sự thật. De acuerdo không đổi theo số, es verdad không đổi chút nào.', id: 'Persetujuan dari beberapa orang (somos) atas suatu klaim, diikuti konfirmasi terpisah atas faktanya sendiri. De acuerdo tidak berubah menurut jumlah, es verdad sama sekali tidak berubah.', tr: 'Birkaç kişinin (somos) bir iddiaya katılması, ardından gerçeğin kendisinin ayrıca doğrulanması. De acuerdo sayıya göre değişmez, es verdad hiç değişmez.', pl: 'Zgoda kilku osób (somos) z twierdzeniem, po której następuje osobne potwierdzenie samego faktu. De acuerdo nie zmienia się przez liczbę, es verdad wcale się nie zmienia.' },
    [somosWord, deWord, acuerdoWord(), esLowerWord(T.esQ), { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'igual', M.igual), d2: alreadyUsedWord('verdad', 'acuerdo', {
      ru: 'уже использована выше как отдельная реплика согласия',
      uk: 'уже використана вище як окрема репліка згоди',
      en: 'was already used above as a separate agreement reply',
      'pt-BR': 'já foi usado acima como uma resposta de concordância separada',
      vi: 'đã được dùng ở trên như một câu trả lời đồng ý riêng',
      id: 'sudah dipakai di atas sebagai balasan persetujuan terpisah',
      tr: 'yukarıda ayrı bir onay yanıtı olarak zaten kullanıldı',
      pl: 'zostało już użyte wyżej jako osobna odpowiedź zgody',
    }) }],
  ),
  'es-e01-s20-es-importante-de-acuerdo-q': d(
    { ru: 'Это важно? Согласен', uk: 'Це важливо? Згоден', en: 'Is it important? Agreed', 'pt-BR': 'É importante? Concordo', vi: 'Điều đó quan trọng không? Đồng ý', id: 'Apakah itu penting? Setuju', tr: 'Bu önemli mi? Katılıyorum', pl: 'Czy to ważne? Zgadzam się' },
    { ru: 'Вопрос о значимости заявления и отдельная реплика согласия с этим выводом. Es importante оценивает саму ситуацию, de acuerdo — реакция на неё, не спутать одно с другим.', uk: 'Питання про значущість заяви та окрема репліка згоди з цим висновком. Es importante оцінює саму ситуацію, de acuerdo — реакція на неї, не сплутати одне з іншим.', en: 'A question about the significance of a claim and a separate reply agreeing with that conclusion. Es importante evaluates the situation itself, de acuerdo is the reaction to it — not to be confused with each other.', 'pt-BR': 'Uma pergunta sobre a importância de uma afirmação e uma resposta separada concordando com essa conclusão. Es importante avalia a própria situação, de acuerdo é a reação a ela — não confundir uma com a outra.', vi: 'Câu hỏi về tầm quan trọng của một tuyên bố và một câu trả lời riêng biệt đồng ý với kết luận đó. Es importante đánh giá chính tình huống, de acuerdo là phản ứng với nó — đừng nhầm lẫn hai cái.', id: 'Pertanyaan tentang pentingnya suatu klaim dan balasan terpisah yang setuju dengan kesimpulan itu. Es importante menilai situasinya sendiri, de acuerdo adalah reaksi terhadapnya — jangan sampai tertukar.', tr: 'Bir iddianın önemi hakkında bir soru ve o sonuca katılan ayrı bir yanıt. Es importante durumun kendisini değerlendirir, de acuerdo ona verilen tepkidir — birbirine karıştırılmamalı.', pl: 'Pytanie o znaczenie twierdzenia i osobna odpowiedź zgadzająca się z tym wnioskiem. Es importante ocenia samą sytuację, de acuerdo to reakcja na nią — nie mylić jednego z drugim.' },
    [esWord(T.esQ), { correct: 'importante', prompt: qualityQ('importante'), d1: wrongWord('importante', 'difícil', M.dificil), d2: wrongWord('importante', 'caro', M.caro) }, deWord, { correct: 'acuerdo', prompt: T.acuerdoQ, d1: wrongWord('acuerdo', 'igual', M.igual), d2: alreadyUsedWord('acuerdo', 'importante', {
      ru: 'уже стояло выше про значимость',
      uk: 'уже стояло вище про значущість',
      en: 'already appeared above about significance',
      'pt-BR': 'já apareceu acima sobre importância',
      vi: 'đã xuất hiện ở trên nói về tầm quan trọng',
      id: 'sudah muncul di atas tentang pentingnya',
      tr: 'yukarıda önemle ilgili zaten geçti',
      pl: 'pojawiło się już wyżej przy znaczeniu',
    }) }],
  ),
  'es-e01-s20-es-caro-no-es-igual': d(
    { ru: 'Это дорого, это не всё равно', uk: 'Це дорого, це не байдуже', en: 'It is expensive, it is not the same', 'pt-BR': 'É caro, não é a mesma coisa', vi: 'Nó đắt, không phải như nhau', id: 'Ini mahal, tidak sama saja', tr: 'Bu pahalı, fark etmez değil', pl: 'To drogie, to nie wszystko jedno' },
    { ru: 'Заявление о цене и отдельное возражение против безразличия к ней — цена имеет значение, а не «всё равно». No встаёт перед второй связкой es.', uk: 'Заява про ціну та окреме заперечення проти байдужості до неї — ціна має значення, а не «байдуже». No стоїть перед другою зв’язкою es.', en: 'A statement about price and a separate pushback against indifference to it — the price matters, it does not "not matter". No comes before the second linking word es.', 'pt-BR': 'Uma afirmação sobre o preço e uma contestação separada contra a indiferença a ele — o preço importa, não "tanto faz". No vem antes da segunda ligação es.', vi: 'Một tuyên bố về giá cả và một sự phản đối riêng biệt chống lại sự thờ ơ với nó — giá quan trọng, không phải "cũng vậy thôi". No đứng trước từ nối es thứ hai.', id: 'Pernyataan tentang harga dan sanggahan terpisah terhadap ketidakpedulian akan hal itu — harganya penting, bukan "sama saja". No berada sebelum kata penghubung es kedua.', tr: 'Fiyat hakkında bir ifade ve ona karşı kayıtsızlığa ayrı bir karşı çıkış — fiyat önemlidir, "fark etmez" değil. No, ikinci es bağlacından önce gelir.', pl: 'Stwierdzenie o cenie i osobny sprzeciw wobec obojętności na nią — cena ma znaczenie, to nie „wszystko jedno”. No stoi przed drugim łącznikiem es.' },
    [esWord(T.esQ), { correct: 'caro', prompt: genderQ(true), d1: genderMismatch('caro', 'cara', true), d2: wrongWord('caro', 'fácil', M.fácil) }, noLowerWord, esLowerWord(T.esQ), { correct: 'igual', prompt: qualityQ('igual'), d1: wrongWord('igual', 'verdad', M.verdad), d2: { value: 'iguala', trapType: 'grammar', reason: {
      ru: 'Igual не меняется по роду — формы iguala не существует.',
      uk: 'Igual не змінюється за родом — форми iguala не існує.',
      en: 'Igual never changes by gender — the form iguala does not exist.',
      'pt-BR': 'Igual nunca muda por gênero — a forma iguala não existe.',
      vi: 'Igual không đổi theo giống — dạng iguala không tồn tại.',
      id: 'Igual tidak berubah menurut gender — bentuk iguala tidak ada.',
      tr: 'Igual cinsiyete göre hiç değişmez — iguala biçimi yoktur.',
      pl: 'Igual nigdy nie zmienia się przez rodzaj — forma iguala nie istnieje.',
    }} }],
  ),
  'es-e01-s20-eres-verdadero-es-verdad-q': d(
    { ru: 'Ты настоящий? Это правда', uk: 'Ти справжній? Це правда', en: 'Are you genuine? It is true', 'pt-BR': 'Você é verdadeiro? É verdade', vi: 'Bạn có thật lòng không? Đó là sự thật', id: 'Apakah kamu tulus? Itu benar', tr: 'Sen gerçek misin? Bu doğru', pl: 'Jesteś prawdziwy? To prawda' },
    { ru: 'Вопрос об искренности собеседника напрямую (Eres) и отдельное подтверждение факта о ситуации (Es verdad) — снова контраст двух форм связки внутри одной пары реплик.', uk: 'Питання про щирість співрозмовника напряму (Eres) та окреме підтвердження факту про ситуацію (Es verdad) — знову контраст двох форм зв’язки всередині однієї пари реплік.', en: 'A question about the listener\'s sincerity addressed directly (Eres) and a separate confirmation of a fact about the situation (Es verdad) — again a contrast of two forms of the linking word inside one exchange.', 'pt-BR': 'Uma pergunta sobre a sinceridade do interlocutor, dirigida diretamente (Eres), e uma confirmação separada de um fato sobre a situação (Es verdad) — de novo um contraste de duas formas da ligação dentro de uma troca.', vi: 'Câu hỏi trực tiếp về sự chân thành của người nghe (Eres) và một xác nhận riêng biệt về sự thật của tình huống (Es verdad) — lại là sự đối lập giữa hai dạng của từ nối trong cùng một cuộc trao đổi.', id: 'Pertanyaan tentang ketulusan pendengar yang ditujukan langsung (Eres) dan konfirmasi terpisah atas fakta tentang situasi (Es verdad) — lagi-lagi kontras dua bentuk kata penghubung dalam satu pertukaran.', tr: 'Dinleyicinin samimiyeti hakkında doğrudan sorulan bir soru (Eres) ve durum hakkında ayrı bir gerçek doğrulaması (Es verdad) — yine tek bir alışveriş içinde bağlacın iki biçiminin karşıtlığı.', pl: 'Pytanie o szczerość słuchacza zadane wprost (Eres) i osobne potwierdzenie faktu o sytuacji (Es verdad) — znów kontrast dwóch form łącznika w jednej wymianie kwestii.' },
    [eresWord, { correct: 'verdadero', prompt: genderQ(true), d1: genderMismatch('verdadero', 'verdadera', true), d2: wrongWord('verdadero', 'único', M.unico) }, esWord(T.esQ), { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'igual', M.igual), d2: alreadyUsedWord('verdad', 'verdadero', {
      ru: 'уже стояло выше как признак собеседника, а здесь нужно существительное',
      uk: 'уже стояло вище як ознака співрозмовника, а тут потрібен іменник',
      en: 'already appeared above as a quality of the listener, but here you need the noun',
      'pt-BR': 'já apareceu acima como uma qualidade do interlocutor, mas aqui precisa do substantivo',
      vi: 'đã xuất hiện ở trên như một đặc điểm của người nghe, còn ở đây cần danh từ',
      id: 'sudah muncul di atas sebagai sifat pendengar, tetapi di sini perlu kata benda',
      tr: 'yukarıda dinleyicinin bir niteliği olarak zaten geçti, ama burada isim gerekir',
      pl: 'pojawiło się już wyżej jako cecha słuchacza, a tu potrzebny jest rzeczownik',
    }) }],
  ),
  'es-e01-s20-eres-unico-no-de-acuerdo': d(
    { ru: 'Ты единственный такой, не согласен', uk: 'Ти єдиний такий, не згоден', en: 'You are unique, disagree', 'pt-BR': 'Você é único, discordo', vi: 'Bạn là duy nhất, không đồng ý', id: 'Kamu unik, tidak setuju', tr: 'Sen eşsizsin, katılmıyorum', pl: 'Jesteś wyjątkowy, nie zgadzam się' },
    { ru: 'Утверждение о неповторимости собеседника мужского рода и отдельная реплика несогласия с этим выводом. No встаёт перед формулой de acuerdo целиком.', uk: 'Твердження про неповторність співрозмовника чоловічого роду та окрема репліка незгоди з цим висновком. No стоїть перед формулою de acuerdo цілком.', en: 'A statement about the listener\'s uniqueness (masculine) and a separate reply disagreeing with that conclusion. No comes before the whole de acuerdo formula.', 'pt-BR': 'Uma afirmação sobre a singularidade do interlocutor (masculino) e uma resposta separada discordando dessa conclusão. No vem antes de toda a fórmula de acuerdo.', vi: 'Một tuyên bố về sự độc nhất của người nghe (giống đực) và một câu trả lời riêng biệt không đồng ý với kết luận đó. No đứng trước toàn bộ công thức de acuerdo.', id: 'Pernyataan tentang keunikan pendengar (maskulin) dan balasan terpisah yang tidak setuju dengan kesimpulan itu. No berada sebelum seluruh rumus de acuerdo.', tr: 'Dinleyicinin (eril) benzersizliği hakkında bir ifade ve o sonuca katılmayan ayrı bir yanıt. No, tüm de acuerdo formülünden önce gelir.', pl: 'Stwierdzenie o wyjątkowości słuchacza (rodzaj męski) i osobna odpowiedź niezgadzająca się z tym wnioskiem. No stoi przed całą formułą de acuerdo.' },
    [eresWord, { correct: 'único', prompt: genderQ(true), d1: genderMismatch('único', 'única', true), d2: { value: 'unico', trapType: 'orthographic', reason: {
      ru: 'Unico без тильды над ú звучал бы и писался бы иначе. Нужна форма único с тильдой.',
      uk: 'Unico без тильди над ú звучало б і писалося б інакше. Потрібна форма único з тильдою.',
      en: 'Unico without the accent on ú would sound and be spelled differently. You need the form único with the accent.',
      'pt-BR': 'Unico sem o acento no ú soaria e se escreveria diferente. Precisa da forma único com o acento.',
      vi: 'Unico không có dấu trên ú sẽ đọc và viết khác đi. Cần dạng único có dấu.',
      id: 'Unico tanpa aksen di ú akan terdengar dan dieja berbeda. Perlu bentuk único dengan aksen.',
      tr: 'ú üzerinde vurgu olmadan unico farklı okunur ve yazılır. Vurgulu único biçimi gerekir.',
      pl: 'Unico bez akcentu nad ú brzmiałoby i pisałoby się inaczej. Potrzebna jest forma único z akcentem.',
    }} }, noLowerWord, deWord, acuerdoWord('único')],
  ),
  'es-e01-s20-es-bonita-es-verdad-q': d(
    { ru: 'Она красивая? Это правда', uk: 'Вона красива? Це правда', en: 'Is it pretty? It is true', 'pt-BR': 'É bonita? É verdade', vi: 'Nó đẹp không? Đó là sự thật', id: 'Apakah itu cantik? Itu benar', tr: 'Bu güzel mi? Bu doğru', pl: 'Jest ładna? To prawda' },
    { ru: 'Вопрос о внешности предмета женского рода и отдельное подтверждение факта о нём — обе части используют одну и ту же безличную связку es, потому что подлежащего-человека нет ни в одной из них.', uk: 'Питання про зовнішність предмета жіночого роду та окреме підтвердження факту про нього — обидві частини використовують ту саму безособову зв’язку es, бо підмета-людини немає в жодній із них.', en: 'A question about the appearance of a feminine object and a separate confirmation of a fact about it — both parts use the same impersonal linking word es, because neither has a human subject.', 'pt-BR': 'Uma pergunta sobre a aparência de um objeto feminino e uma confirmação separada de um fato sobre ele — ambas as partes usam a mesma ligação impessoal es, porque nenhuma tem sujeito humano.', vi: 'Câu hỏi về ngoại hình của một vật giống cái và một xác nhận riêng biệt về sự thật liên quan — cả hai phần đều dùng cùng từ nối phi nhân xưng es, vì không phần nào có chủ ngữ là người.', id: 'Pertanyaan tentang penampilan objek feminin dan konfirmasi terpisah atas fakta tentangnya — kedua bagian memakai kata penghubung impersonal es yang sama, karena tidak satu pun punya subjek manusia.', tr: 'Dişil bir nesnenin görünümü hakkında bir soru ve onunla ilgili bir gerçeğin ayrı doğrulanması — her iki bölüm de aynı kişisiz es bağlacını kullanır, çünkü ikisinde de insan özne yoktur.', pl: 'Pytanie o wygląd przedmiotu rodzaju żeńskiego i osobne potwierdzenie faktu na jego temat — obie części używają tego samego bezosobowego łącznika es, ponieważ żadna nie ma ludzkiego podmiotu.' },
    [esWord(T.esQ), { correct: 'bonita', prompt: genderQ(false), d1: genderMismatch('bonita', 'bonito', false), d2: wrongWord('bonita', 'segura', M.segura) }, esWord(T.esQ), { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'igual', M.igual), d2: alreadyUsedWord('verdad', 'bonita', {
      ru: 'уже стояло выше как признак предмета, а здесь нужно существительное',
      uk: 'уже стояло вище як ознака предмета, а тут потрібен іменник',
      en: 'already appeared above as a quality of the object, but here you need the noun',
      'pt-BR': 'já apareceu acima como uma qualidade do objeto, mas aqui precisa do substantivo',
      vi: 'đã xuất hiện ở trên như một đặc điểm của vật, còn ở đây cần danh từ',
      id: 'sudah muncul di atas sebagai sifat objek, tetapi di sini perlu kata benda',
      tr: 'yukarıda nesnenin bir niteliği olarak zaten geçti, ama burada isim gerekir',
      pl: 'pojawiło się już wyżej jako cecha przedmiotu, a tu potrzebny jest rzeczownik',
    }) }],
  ),
});
