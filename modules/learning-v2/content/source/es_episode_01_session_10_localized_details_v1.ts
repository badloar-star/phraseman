import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-24): ручной перевод и разбор для
// 15 фраз сессии 10 на восьми объяснительных локалях (без 'es'). Тема
// вопроса без инверсии живёт в phrase.english (¿...?) и на intro-страницах,
// здесь — только позиционный разбор ser-связки и признака.
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;
type Details = EpisodeSourcePhraseLocalizedDetails;

// зачем фабрика вместо буквального объекта на каждую локаль: 8 локалей ×
// 15 фраз × (meaning+explanation+2 top distractors+2 words×2 distractors)
// это ~1000 строк текста — фабрика с общими паттернами "X — про Y, вопрос
// нужен Z" держит формулировки короткими, но проходящими gate-проверку
// (why обязан содержать literal value И literal correct).
function d(
  meaning: Record<LocaleWithoutEs, string>,
  explanation: Record<LocaleWithoutEs, string>,
  w1correct: string,
  w1prompt: Record<LocaleWithoutEs, string>,
  w1d1: { value: string; trapType: Details['distractors'][number]['trapType']; reason: Record<LocaleWithoutEs, string> },
  w1d2: { value: string; trapType: Details['distractors'][number]['trapType']; reason: Record<LocaleWithoutEs, string> },
  w2correct: string,
  w2prompt: Record<LocaleWithoutEs, string>,
  w2d1: { value: string; trapType: Details['distractors'][number]['trapType']; reason: Record<LocaleWithoutEs, string> },
  w2d2: { value: string; trapType: Details['distractors'][number]['trapType']; reason: Record<LocaleWithoutEs, string> },
): Readonly<Record<LocaleWithoutEs, Details>> {
  const locales: readonly LocaleWithoutEs[] = ['ru', 'uk', 'en', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
  const out = {} as Record<LocaleWithoutEs, Details>;
  for (const l of locales) {
    out[l] = {
      meaning: meaning[l],
      explanation: explanation[l],
      distractors: [
        { value: w1d1.value, reason: w1d1.reason[l], trapType: w1d1.trapType },
        { value: w1d2.value, reason: w1d2.reason[l], trapType: w1d2.trapType },
        { value: w2d1.value, reason: w2d1.reason[l], trapType: w2d1.trapType },
        { value: w2d2.value, reason: w2d2.reason[l], trapType: w2d2.trapType },
      ],
      words: [
        {
          correct: w1correct,
          prompt: w1prompt[l],
          distractors: [
            { value: w1d1.value, reason: w1d1.reason[l], trapType: w1d1.trapType },
            { value: w1d2.value, reason: w1d2.reason[l], trapType: w1d2.trapType },
          ],
        },
        {
          correct: w2correct,
          prompt: w2prompt[l],
          distractors: [
            { value: w2d1.value, reason: w2d1.reason[l], trapType: w2d1.trapType },
            { value: w2d2.value, reason: w2d2.reason[l], trapType: w2d2.trapType },
          ],
        },
      ],
    };
  }
  return Object.freeze(out);
}

const T = {
  eresQ: { ru: 'Какая связка нужна при вопросе собеседнику?', uk: 'Яка зв’язка потрібна при питанні співрозмовнику?', en: 'Which linking word fits a question to the listener?', 'pt-BR': 'Qual ligação cabe numa pergunta ao interlocutor?', vi: 'Từ nối nào phù hợp khi hỏi người nghe?', id: 'Kata penghubung mana yang cocok untuk bertanya kepada pendengar?', tr: 'Dinleyiciye soru için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do pytania do słuchacza?' },
  esQ: { ru: 'Какая связка нужна для безличной оценки?', uk: 'Яка зв’язка потрібна для безособової оцінки?', en: 'Which linking word fits an impersonal evaluation?', 'pt-BR': 'Qual ligação cabe numa avaliação impessoal?', vi: 'Từ nối nào phù hợp cho đánh giá phi nhân xưng?', id: 'Kata penghubung mana yang cocok untuk penilaian impersonal?', tr: 'Kişisiz değerlendirme için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do bezosobowej oceny?' },
  soyQ: { ru: 'Какая связка нужна, когда спрашивают о себе?', uk: 'Яка зв’язка потрібна, коли запитують про себе?', en: 'Which linking word fits asking about oneself?', 'pt-BR': 'Qual ligação cabe ao perguntar sobre si mesmo?', vi: 'Từ nối nào phù hợp khi hỏi về chính mình?', id: 'Kata penghubung mana yang cocok saat bertanya tentang diri sendiri?', tr: 'Kendisi hakkında soru için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do pytania o siebie?' },
} as const;

function esVsEres(target: 'Eres' | 'Es'): { value: string; trapType: 'grammar'; reason: Record<LocaleWithoutEs, string> } {
  if (target === 'Eres') {
    return { value: 'Es', trapType: 'grammar', reason: { ru: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — только Eres.', uk: 'Es — про предмет чи третю особу. Питання співрозмовнику напряму — тільки Eres.', en: 'Es is about a thing or a third person. A question addressed directly to the listener needs only Eres.', 'pt-BR': 'Es é sobre uma coisa ou terceira pessoa. Uma pergunta ao interlocutor precisa só de Eres.', vi: 'Es nói về một vật hay ngôi thứ ba. Câu hỏi trực tiếp với người nghe chỉ cần Eres.', id: 'Es tentang benda atau orang ketiga. Pertanyaan langsung kepada pendengar hanya perlu Eres.', tr: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciye doğrudan soru yalnızca Eres gerektirir.', pl: 'Es dotyczy rzeczy lub trzeciej osoby. Pytanie do słuchacza wymaga tylko Eres.' } };
  }
  return { value: 'Eres', trapType: 'grammar', reason: { ru: 'Eres — про собеседника напрямую. Безличная оценка предмета — только Es.', uk: 'Eres — про співрозмовника напряму. Безособова оцінка предмета — тільки Es.', en: 'Eres addresses the listener directly. An impersonal evaluation of a thing needs only Es.', 'pt-BR': 'Eres fala com o interlocutor diretamente. Uma avaliação impessoal de uma coisa precisa só de Es.', vi: 'Eres nói trực tiếp với người nghe. Đánh giá phi nhân xưng về một vật chỉ cần Es.', id: 'Eres berbicara langsung dengan pendengar. Penilaian impersonal atas benda hanya perlu Es.', tr: 'Eres doğrudan dinleyiciyle konuşur. Bir şeyin kişisiz değerlendirmesi yalnızca Es gerektirir.', pl: 'Eres zwraca się bezpośrednio do słuchacza. Bezosobowa ocena rzeczy wymaga tylko Es.' } };
}

function soyVsOther(target: 'Eres' | 'Es'): { value: string; trapType: 'grammar'; reason: Record<LocaleWithoutEs, string> } {
  if (target === 'Eres') {
    return { value: 'Soy', trapType: 'grammar', reason: { ru: 'Soy — про себя. Вопрос собеседнику — только Eres.', uk: 'Soy — про себе. Питання співрозмовнику — тільки Eres.', en: 'Soy is about the speaker. A question to the listener needs only Eres.', 'pt-BR': 'Soy é sobre quem fala. Uma pergunta ao interlocutor precisa só de Eres.', vi: 'Soy nói về người nói. Câu hỏi với người nghe chỉ cần Eres.', id: 'Soy tentang penutur. Pertanyaan kepada pendengar hanya perlu Eres.', tr: 'Soy konuşan hakkındadır. Dinleyiciye soru yalnızca Eres gerektirir.', pl: 'Soy dotyczy mówiącego. Pytanie do słuchacza wymaga tylko Eres.' } };
  }
  return { value: 'Soy', trapType: 'grammar', reason: { ru: 'Soy — про себя. Безличная оценка предмета — только Es.', uk: 'Soy — про себе. Безособова оцінка предмета — тільки Es.', en: 'Soy is about the speaker. An impersonal evaluation of a thing needs only Es.', 'pt-BR': 'Soy é sobre quem fala. Uma avaliação impessoal de uma coisa precisa só de Es.', vi: 'Soy nói về người nói. Đánh giá phi nhân xưng về một vật chỉ cần Es.', id: 'Soy tentang penutur. Penilaian impersonal atas benda hanya perlu Es.', tr: 'Soy konuşan hakkındadır. Bir şeyin kişisiz değerlendirmesi yalnızca Es gerektirir.', pl: 'Soy dotyczy mówiącego. Bezosobowa ocena rzeczy wymaga tylko Es.' } };
}

function othersVsSoy(other: 'Eres' | 'Es'): { value: string; trapType: 'grammar'; reason: Record<LocaleWithoutEs, string> } {
  if (other === 'Eres') {
    return { value: 'Eres', trapType: 'grammar', reason: { ru: 'Eres — про собеседника. Вопрос о себе самом — только Soy.', uk: 'Eres — про співрозмовника. Питання про себе самого — тільки Soy.', en: 'Eres is about the listener. A question about oneself needs only Soy.', 'pt-BR': 'Eres é sobre o interlocutor. Uma pergunta sobre si mesmo precisa só de Soy.', vi: 'Eres nói về người nghe. Câu hỏi về chính mình chỉ cần Soy.', id: 'Eres tentang pendengar. Pertanyaan tentang diri sendiri hanya perlu Soy.', tr: 'Eres dinleyici hakkındadır. Kendisi hakkında soru yalnızca Soy gerektirir.', pl: 'Eres dotyczy słuchacza. Pytanie o siebie samego wymaga tylko Soy.' } };
  }
  return { value: 'Es', trapType: 'grammar', reason: { ru: 'Es — про предмет или третье лицо. Вопрос о себе самом — только Soy.', uk: 'Es — про предмет чи третю особу. Питання про себе самого — тільки Soy.', en: 'Es is about a thing or a third person. A question about oneself needs only Soy.', 'pt-BR': 'Es é sobre uma coisa ou terceira pessoa. Uma pergunta sobre si mesmo precisa só de Soy.', vi: 'Es nói về một vật hay ngôi thứ ba. Câu hỏi về chính mình chỉ cần Soy.', id: 'Es tentang benda atau orang ketiga. Pertanyaan tentang diri sendiri hanya perlu Soy.', tr: 'Es bir şey ya da üçüncü kişi hakkındadır. Kendisi hakkında soru yalnızca Soy gerektirir.', pl: 'Es dotyczy rzeczy lub trzeciej osoby. Pytanie o siebie samego wymaga tylko Soy.' } };
}

function genderPair(masc: string, fem: string, correctIsMasc: boolean): { value: string; trapType: 'grammar'; reason: Record<LocaleWithoutEs, string> } {
  const wrong = correctIsMasc ? fem : masc;
  const correct = correctIsMasc ? masc : fem;
  const wrongEnding = correctIsMasc ? '-a' : '-o';
  const correctEnding = correctIsMasc ? '-o' : '-a';
  return {
    value: wrong,
    trapType: 'grammar',
    reason: {
      ru: `${wrong} — форма на ${wrongEnding}. Нужна форма ${correct} на ${correctEnding}.`,
      uk: `${wrong} — форма на ${wrongEnding}. Потрібна форма ${correct} на ${correctEnding}.`,
      en: `${wrong} ends in ${wrongEnding}. The needed form is ${correct}, ending in ${correctEnding}.`,
      'pt-BR': `${wrong} termina em ${wrongEnding}. A forma necessária é ${correct}, terminada em ${correctEnding}.`,
      vi: `${wrong} kết thúc bằng ${wrongEnding}. Dạng cần là ${correct}, kết thúc bằng ${correctEnding}.`,
      id: `${wrong} berakhiran ${wrongEnding}. Bentuk yang diperlukan adalah ${correct}, berakhiran ${correctEnding}.`,
      tr: `${wrong}, ${wrongEnding} ile biter. Gereken biçim ${correct}, ${correctEnding} ile biter.`,
      pl: `${wrong} kończy się na ${wrongEnding}. Potrzebna jest forma ${correct}, zakończona na ${correctEnding}.`,
    },
  };
}

function semanticNeighbor(correct: string, wrong: string, wrongMeaning: Record<LocaleWithoutEs, string>): { value: string; trapType: 'semantic_neighbor'; reason: Record<LocaleWithoutEs, string> } {
  return {
    value: wrong,
    trapType: 'semantic_neighbor',
    reason: {
      ru: `${wrong} — это ${wrongMeaning.ru}, другой признак. Здесь нужно ${correct}.`,
      uk: `${wrong} — це ${wrongMeaning.uk}, інша ознака. Тут потрібно ${correct}.`,
      en: `${wrong} means ${wrongMeaning.en}, a different quality. Here you need ${correct}.`,
      'pt-BR': `${wrong} significa ${wrongMeaning['pt-BR']}, uma qualidade diferente. Aqui é preciso ${correct}.`,
      vi: `${wrong} nghĩa là ${wrongMeaning.vi}, đặc điểm khác. Ở đây cần ${correct}.`,
      id: `${wrong} berarti ${wrongMeaning.id}, sifat berbeda. Di sini perlu ${correct}.`,
      tr: `${wrong}, ${wrongMeaning.tr} demektir, farklı bir niteliktir. Burada ${correct} gerekir.`,
      pl: `${wrong} znaczy ${wrongMeaning.pl}, inna cecha. Tu potrzebne jest ${correct}.`,
    },
  };
}

function accentTrap(correct: string, wrong: string): { value: string; trapType: 'orthographic'; reason: Record<LocaleWithoutEs, string> } {
  return {
    value: wrong,
    trapType: 'orthographic',
    reason: {
      ru: `${wrong} без тильды над ú звучал бы иначе. Нужна форма ${correct} с тильдой.`,
      uk: `${wrong} без тильди над ú звучав би інакше. Потрібна форма ${correct} з тильдою.`,
      en: `${wrong} without the tilde over ú would sound different. The needed form is ${correct}, with the tilde.`,
      'pt-BR': `${wrong} sem o til sobre ú soaria diferente. A forma necessária é ${correct}, com o til.`,
      vi: `${wrong} không có dấu ngã trên ú sẽ nghe khác. Dạng cần là ${correct}, có dấu ngã.`,
      id: `${wrong} tanpa tilde di atas ú akan terdengar berbeda. Bentuk yang diperlukan adalah ${correct}, dengan tilde.`,
      tr: `${wrong}, ú üzerinde tilde olmadan farklı duyulurdu. Gereken biçim ${correct}, tilde ile.`,
      pl: `${wrong} bez tyldy nad ú brzmiałoby inaczej. Potrzebna jest forma ${correct}, z tyldą.`,
    },
  };
}

export const ES_SESSION_10_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s10-eres-bonito': d(
    { ru: 'Ты красивый?', uk: 'Ти красивий?', en: 'Are you pretty?', 'pt-BR': 'Você é bonito?', vi: 'Bạn có đẹp trai không?', id: 'Apakah kamu tampan?', tr: 'Sen yakışıklı mısın?', pl: 'Jesteś przystojny?' },
    { ru: 'Так спрашивают собеседника мужского рода о его внешности напрямую. Порядок слов тот же, что в утверждении — вопросом фразу делают только знаки ¿...? и интонация.', uk: 'Так запитують співрозмовника чоловічого роду про його зовнішність напряму. Порядок слів той самий, що й у твердженні — питанням фразу роблять лише знаки ¿...? та інтонація.', en: 'This is how you ask a masculine listener about their looks directly. The word order is the same as in the statement — only the marks ¿...? and intonation turn it into a question.', 'pt-BR': 'É assim que se pergunta a um interlocutor masculino sobre sua aparência diretamente. A ordem das palavras é a mesma da afirmação — só os sinais ¿...? e a entonação viram a frase em pergunta.', vi: 'Đây là cách hỏi người nghe giống đực về ngoại hình trực tiếp. Trật tự từ giống câu khẳng định — chỉ dấu ¿...? và ngữ điệu biến nó thành câu hỏi.', id: 'Beginilah cara menanyakan penampilan pendengar maskulin secara langsung. Urutan katanya sama seperti pernyataan — hanya tanda ¿...? dan intonasi yang mengubahnya jadi pertanyaan.', tr: 'Eril bir dinleyiciye dış görünüşü doğrudan böyle sorulur. Kelime sırası ifadedekiyle aynıdır — yalnızca ¿...? işaretleri ve tonlama onu soruya dönüştürür.', pl: 'Tak pyta się słuchacza rodzaju męskiego o jego wygląd wprost. Kolejność słów jest taka sama jak w twierdzeniu — pytaniem czynią frazę tylko znaki ¿...? i intonacja.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'bonito', { ru: 'Какой признак нужен для собеседника мужского рода?', uk: 'Яка ознака потрібна для співрозмовника чоловічого роду?', en: 'Which quality fits a masculine listener?', 'pt-BR': 'Qual qualidade cabe a um interlocutor masculino?', vi: 'Đặc điểm nào phù hợp cho người nghe giống đực?', id: 'Sifat mana yang cocok untuk pendengar maskulin?', tr: 'Eril bir dinleyici için hangi nitelik uyar?', pl: 'Jaka cecha pasuje do słuchacza rodzaju męskiego?' },
    genderPair('bonito', 'bonita', true),
    semanticNeighbor('bonito', 'rápido', { ru: '«быстрый»', uk: '«швидкий»', en: '"fast"', 'pt-BR': '"rápido"', vi: '"nhanh"', id: '"cepat"', tr: '"hızlı"', pl: '„szybki”' }),
  ),
  'es-e01-s10-eres-bonita': d(
    { ru: 'Ты красивая?', uk: 'Ти красива?', en: 'Are you pretty? (feminine)', 'pt-BR': 'Você é bonita?', vi: 'Bạn xinh đẹp không?', id: 'Apakah kamu cantik?', tr: 'Sen güzel misin?', pl: 'Jesteś ładna?' },
    { ru: 'Тот же вопрос, но собеседница женского рода. Меняется только концовка признака, порядок слов и знаки ¿...? остаются теми же.', uk: 'Те саме питання, але співрозмовниця жіночого роду. Змінюється лише закінчення ознаки, порядок слів і знаки ¿...? лишаються тими самими.', en: 'The same question, but about a feminine listener. Only the ending of the quality changes — word order and the marks ¿...? stay the same.', 'pt-BR': 'A mesma pergunta, mas sobre uma interlocutora feminina. Só a terminação da qualidade muda — a ordem das palavras e os sinais ¿...? ficam os mesmos.', vi: 'Cùng câu hỏi, nhưng về người nghe giống cái. Chỉ đuôi đặc điểm đổi — trật tự từ và dấu ¿...? vẫn giữ nguyên.', id: 'Pertanyaan yang sama, tetapi tentang pendengar feminin. Hanya akhiran sifat yang berubah — urutan kata dan tanda ¿...? tetap sama.', tr: 'Aynı soru, ama dişil bir dinleyici hakkında. Sadece niteliğin sonu değişir — kelime sırası ve ¿...? işaretleri aynı kalır.', pl: 'To samo pytanie, ale o słuchaczce rodzaju żeńskiego. Zmienia się tylko końcówka cechy — kolejność słów i znaki ¿...? zostają te same.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'bonita', { ru: 'Какой признак нужен для собеседницы?', uk: 'Яка ознака потрібна для співрозмовниці?', en: 'Which quality fits a feminine listener?', 'pt-BR': 'Qual qualidade cabe a uma interlocutora feminina?', vi: 'Đặc điểm nào phù hợp cho người nghe giống cái?', id: 'Sifat mana yang cocok untuk pendengar feminin?', tr: 'Dişil bir dinleyici için hangi nitelik uyar?', pl: 'Jaka cecha pasuje do słuchaczki?' },
    genderPair('bonito', 'bonita', false),
    semanticNeighbor('bonita', 'única', { ru: '«единственная»', uk: '«єдина»', en: '"unique"', 'pt-BR': '"única"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyna”' }),
  ),
  'es-e01-s10-eres-rapido': d(
    { ru: 'Ты быстрый?', uk: 'Ти швидкий?', en: 'Are you fast?', 'pt-BR': 'Você é rápido?', vi: 'Bạn có nhanh không?', id: 'Apakah kamu cepat?', tr: 'Sen hızlı mısın?', pl: 'Jesteś szybki?' },
    { ru: 'Вопрос про темп собеседника мужского рода — например, перед соревнованием. Слова стоят в том же порядке, что и в утверждении.', uk: 'Питання про темп співрозмовника чоловічого роду — наприклад, перед змаганням. Слова стоять у тому самому порядку, що й у твердженні.', en: 'A question about a masculine listener\'s pace — before a race, for example. The words keep the same order as in the statement.', 'pt-BR': 'Uma pergunta sobre o ritmo de um interlocutor masculino — antes de uma corrida, por exemplo. As palavras ficam na mesma ordem da afirmação.', vi: 'Câu hỏi về tốc độ người nghe giống đực — trước một cuộc đua chẳng hạn. Các từ giữ cùng trật tự như câu khẳng định.', id: 'Pertanyaan tentang kecepatan pendengar maskulin — sebelum lomba, misalnya. Kata-katanya tetap dalam urutan yang sama seperti pernyataan.', tr: 'Eril bir dinleyicinin temposu hakkında bir soru — bir yarıştan önce mesela. Kelimeler ifadedekiyle aynı sırada kalır.', pl: 'Pytanie o tempo słuchacza rodzaju męskiego — na przykład przed wyścigiem. Słowa zachowują tę samą kolejność co w twierdzeniu.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'rápido', { ru: 'Какой признак нужен для собеседника мужского рода?', uk: 'Яка ознака потрібна для співрозмовника чоловічого роду?', en: 'Which quality fits a masculine listener?', 'pt-BR': 'Qual qualidade cabe a um interlocutor masculino?', vi: 'Đặc điểm nào phù hợp cho người nghe giống đực?', id: 'Sifat mana yang cocok untuk pendengar maskulin?', tr: 'Eril bir dinleyici için hangi nitelik uyar?', pl: 'Jaka cecha pasuje do słuchacza rodzaju męskiego?' },
    genderPair('rápido', 'rápida', true),
    semanticNeighbor('rápido', 'bonito', { ru: '«красивый»', uk: '«красивий»', en: '"pretty"', 'pt-BR': '"bonito"', vi: '"đẹp trai"', id: '"tampan"', tr: '"yakışıklı"', pl: '„przystojny”' }),
  ),
  'es-e01-s10-eres-rapida': d(
    { ru: 'Ты быстрая?', uk: 'Ти швидка?', en: 'Are you fast? (feminine)', 'pt-BR': 'Você é rápida?', vi: 'Bạn có nhanh không? (giống cái)', id: 'Apakah kamu cepat? (feminin)', tr: 'Sen hızlı mısın? (dişil)', pl: 'Jesteś szybka?' },
    { ru: 'Тот же вопрос о темпе, но собеседница женского рода. Меняется только концовка признака, сама связка eres и порядок слов остаются теми же.', uk: 'Те саме питання про темп, але співрозмовниця жіночого роду. Змінюється лише закінчення ознаки, сама зв’язка eres і порядок слів лишаються тими самими.', en: 'The same question about pace, but a feminine listener. Only the ending of the quality changes — eres itself and the word order stay the same.', 'pt-BR': 'A mesma pergunta sobre ritmo, mas uma interlocutora feminina. Só a terminação da qualidade muda — eres em si e a ordem das palavras ficam iguais.', vi: 'Cùng câu hỏi về tốc độ, nhưng người nghe giống cái. Chỉ đuôi đặc điểm đổi — bản thân eres và trật tự từ vẫn giữ nguyên.', id: 'Pertanyaan yang sama tentang kecepatan, tetapi pendengar feminin. Hanya akhiran sifat yang berubah — eres sendiri dan urutan kata tetap sama.', tr: 'Tempo hakkında aynı soru, ama dişil bir dinleyici. Sadece niteliğin sonu değişir — eres’in kendisi ve kelime sırası aynı kalır.', pl: 'To samo pytanie o tempo, ale o słuchaczce. Zmienia się tylko końcówka cechy — samo eres i kolejność słów zostają te same.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'rápida', { ru: 'Какой признак нужен для собеседницы?', uk: 'Яка ознака потрібна для співрозмовниці?', en: 'Which quality fits a feminine listener?', 'pt-BR': 'Qual qualidade cabe a uma interlocutora feminina?', vi: 'Đặc điểm nào phù hợp cho người nghe giống cái?', id: 'Sifat mana yang cocok untuk pendengar feminin?', tr: 'Dişil bir dinleyici için hangi nitelik uyar?', pl: 'Jaka cecha pasuje do słuchaczki?' },
    genderPair('rápido', 'rápida', false),
    semanticNeighbor('rápida', 'verdadera', { ru: '«истинная»', uk: '«істинна»', en: '"true"', 'pt-BR': '"verdadeira"', vi: '"đúng"', id: '"benar"', tr: '"doğru"', pl: '„prawdziwa”' }),
  ),
  'es-e01-s10-eres-unico': d(
    { ru: 'Ты единственный такой?', uk: 'Ти єдиний такий?', en: 'Are you one of a kind?', 'pt-BR': 'Você é único?', vi: 'Bạn có phải là duy nhất không?', id: 'Apakah kamu satu-satunya?', tr: 'Sen eşsiz misin?', pl: 'Jesteś jedyny w swoim rodzaju?' },
    { ru: 'Вопрос о неповторимости собеседника мужского рода. Тильда над ú остаётся на месте, как и в утверждении — вопрос её не убирает.', uk: 'Питання про неповторність співрозмовника чоловічого роду. Тильда над ú лишається на місці, як і у твердженні — питання її не прибирає.', en: 'A question about a masculine listener\'s uniqueness. The tilde over ú stays in place, just like in the statement — the question does not remove it.', 'pt-BR': 'Uma pergunta sobre a singularidade de um interlocutor masculino. O til sobre ú permanece no lugar, como na afirmação — a pergunta não o remove.', vi: 'Câu hỏi về sự độc đáo của người nghe giống đực. Dấu ngã trên ú vẫn giữ nguyên như trong câu khẳng định — câu hỏi không bỏ nó đi.', id: 'Pertanyaan tentang keunikan pendengar maskulin. Tilde di atas ú tetap di tempatnya, seperti pada pernyataan — pertanyaan tidak menghapusnya.', tr: 'Eril bir dinleyicinin eşsizliği hakkında bir soru. Ú üzerindeki tilde ifadedeki gibi yerinde kalır — soru onu kaldırmaz.', pl: 'Pytanie o wyjątkowość słuchacza rodzaju męskiego. Tylda nad ú zostaje na miejscu, tak jak w twierdzeniu — pytanie jej nie usuwa.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'único', { ru: 'Какой признак нужен для собеседника мужского рода?', uk: 'Яка ознака потрібна для співрозмовника чоловічого роду?', en: 'Which quality fits a masculine listener?', 'pt-BR': 'Qual qualidade cabe a um interlocutor masculino?', vi: 'Đặc điểm nào phù hợp cho người nghe giống đực?', id: 'Sifat mana yang cocok untuk pendengar maskulin?', tr: 'Eril bir dinleyici için hangi nitelik uyar?', pl: 'Jaka cecha pasuje do słuchacza rodzaju męskiego?' },
    genderPair('único', 'única', true),
    accentTrap('único', 'unico'),
  ),
  'es-e01-s10-eres-unica': d(
    { ru: 'Ты единственная такая?', uk: 'Ти єдина така?', en: 'Are you one of a kind? (feminine)', 'pt-BR': 'Você é única?', vi: 'Bạn có phải là duy nhất không? (giống cái)', id: 'Apakah kamu satu-satunya? (feminin)', tr: 'Sen eşsiz misin? (dişil)', pl: 'Jesteś jedyna w swoim rodzaju?' },
    { ru: 'Тот же вопрос о неповторимости, но собеседница женского рода. Тильда над ú остаётся на месте в обеих формах — она отмечает ударение, а не род.', uk: 'Те саме питання про неповторність, але співрозмовниця жіночого роду. Тильда над ú лишається на місці в обох формах — вона позначає наголос, а не рід.', en: 'The same question about uniqueness, but a feminine listener. The tilde over ú stays in both forms — it marks the stress, not the gender.', 'pt-BR': 'A mesma pergunta sobre singularidade, mas uma interlocutora feminina. O til sobre ú permanece nas duas formas — ele marca o acento, não o gênero.', vi: 'Cùng câu hỏi về sự độc đáo, nhưng người nghe giống cái. Dấu ngã trên ú vẫn giữ ở cả hai dạng — nó đánh dấu trọng âm, không phải giống.', id: 'Pertanyaan yang sama tentang keunikan, tetapi pendengar feminin. Tilde di atas ú tetap di kedua bentuk — itu menandai tekanan, bukan gender.', tr: 'Eşsizlik hakkında aynı soru, ama dişil bir dinleyici. Ú üzerindeki tilde her iki biçimde de kalır — cinsiyeti değil vurguyu işaretler.', pl: 'To samo pytanie o wyjątkowość, ale o słuchaczce. Tylda nad ú zostaje w obu formach — oznacza akcent, nie rodzaj.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'única', { ru: 'Какой признак нужен для собеседницы?', uk: 'Яка ознака потрібна для співрозмовниці?', en: 'Which quality fits a feminine listener?', 'pt-BR': 'Qual qualidade cabe a uma interlocutora feminina?', vi: 'Đặc điểm nào phù hợp cho người nghe giống cái?', id: 'Sifat mana yang cocok untuk pendengar feminin?', tr: 'Dişil bir dinleyici için hangi nitelik uyar?', pl: 'Jaka cecha pasuje do słuchaczki?' },
    genderPair('único', 'única', false),
    accentTrap('única', 'unica'),
  ),
  'es-e01-s10-es-bonito': d(
    { ru: 'Это красиво?', uk: 'Це красиво?', en: 'Is it pretty?', 'pt-BR': 'É bonito?', vi: 'Cái đó có đẹp không?', id: 'Apakah itu bagus?', tr: 'Bu güzel mi?', pl: 'Czy to ładne?' },
    { ru: 'Безличная оценка внешнего вида предмета — например, картины или вида из окна. Es здесь не про собеседника, а про то, что перед глазами.', uk: 'Безособова оцінка зовнішнього вигляду предмета — наприклад, картини чи виду з вікна. Es тут не про співрозмовника, а про те, що перед очима.', en: 'An impersonal evaluation of a thing\'s appearance — a painting or a view from a window, for example. Es here is not about the listener, but about what is in front of the eyes.', 'pt-BR': 'Uma avaliação impessoal da aparência de uma coisa — um quadro ou a vista de uma janela, por exemplo. Es aqui não é sobre o interlocutor, é sobre o que está diante dos olhos.', vi: 'Đánh giá phi nhân xưng về vẻ ngoài của một vật — một bức tranh hay khung cảnh từ cửa sổ chẳng hạn. Es ở đây không nói về người nghe, mà về thứ trước mắt.', id: 'Penilaian impersonal tentang penampilan suatu benda — lukisan atau pemandangan dari jendela, misalnya. Es di sini bukan tentang pendengar, tetapi tentang apa yang ada di depan mata.', tr: 'Bir şeyin görünümünün kişisiz değerlendirmesi — bir tablo ya da pencereden görünen manzara mesela. Buradaki Es dinleyici hakkında değil, gözün önündeki şey hakkındadır.', pl: 'Bezosobowa ocena wyglądu rzeczy — na przykład obrazu lub widoku z okna. Es tutaj nie dotyczy słuchacza, lecz tego, co jest przed oczami.' },
    'Es', T.esQ, esVsEres('Es'), soyVsOther('Es'),
    'bonito', { ru: 'Какой признак нужен для оценки предмета?', uk: 'Яка ознака потрібна для оцінки предмета?', en: 'Which quality fits evaluating a thing?', 'pt-BR': 'Qual qualidade cabe para avaliar uma coisa?', vi: 'Đặc điểm nào phù hợp để đánh giá một vật?', id: 'Sifat mana yang cocok untuk menilai benda?', tr: 'Bir şeyi değerlendirmek için hangi nitelik uyar?', pl: 'Jaka cecha pasuje do oceny rzeczy?' },
    genderPair('bonito', 'bonita', true),
    semanticNeighbor('bonito', 'fácil', { ru: '«лёгкий»', uk: '«легкий»', en: '"easy"', 'pt-BR': '"fácil"', vi: '"dễ"', id: '"mudah"', tr: '"kolay"', pl: '„łatwy”' }),
  ),
  'es-e01-s10-es-rapido': d(
    { ru: 'Это быстро?', uk: 'Це швидко?', en: 'Is it fast?', 'pt-BR': 'É rápido?', vi: 'Cái đó có nhanh không?', id: 'Apakah itu cepat?', tr: 'Bu hızlı mı?', pl: 'Czy to szybkie?' },
    { ru: 'Безличная оценка темпа процесса или транспорта — например, поезда или интернета. Es про сам предмет, не про собеседника.', uk: 'Безособова оцінка темпу процесу чи транспорту — наприклад, поїзда чи інтернету. Es про сам предмет, не про співрозмовника.', en: 'An impersonal evaluation of a process\'s or vehicle\'s pace — a train or the internet, for example. Es is about the thing itself, not the listener.', 'pt-BR': 'Uma avaliação impessoal do ritmo de um processo ou transporte — um trem ou a internet, por exemplo. Es é sobre a própria coisa, não sobre o interlocutor.', vi: 'Đánh giá phi nhân xưng về tốc độ của một quá trình hay phương tiện — tàu hỏa hay internet chẳng hạn. Es nói về chính vật đó, không phải người nghe.', id: 'Penilaian impersonal tentang kecepatan suatu proses atau kendaraan — kereta atau internet, misalnya. Es tentang benda itu sendiri, bukan pendengar.', tr: 'Bir sürecin ya da aracın temposunun kişisiz değerlendirmesi — bir tren ya da internet mesela. Es dinleyici hakkında değil, şeyin kendisi hakkındadır.', pl: 'Bezosobowa ocena tempa procesu lub pojazdu — na przykład pociągu lub internetu. Es dotyczy samej rzeczy, nie słuchacza.' },
    'Es', T.esQ, esVsEres('Es'), soyVsOther('Es'),
    'rápido', { ru: 'Какой признак нужен для оценки темпа?', uk: 'Яка ознака потрібна для оцінки темпу?', en: 'Which quality fits evaluating pace?', 'pt-BR': 'Qual qualidade cabe para avaliar o ritmo?', vi: 'Đặc điểm nào phù hợp để đánh giá tốc độ?', id: 'Sifat mana yang cocok untuk menilai kecepatan?', tr: 'Tempoyu değerlendirmek için hangi nitelik uyar?', pl: 'Jaka cecha pasuje do oceny tempa?' },
    genderPair('rápido', 'rápida', true),
    semanticNeighbor('rápido', 'verdad', { ru: '«правда» (существительное)', uk: '«правда» (іменник)', en: '"truth" (a noun)', 'pt-BR': '"verdade" (substantivo)', vi: '"sự thật" (danh từ)', id: '"kebenaran" (kata benda)', tr: '"gerçek" (isim)', pl: '„prawda” (rzeczownik)' }),
  ),
  'es-e01-s10-es-facil': d(
    { ru: 'Это легко?', uk: 'Це легко?', en: 'Is it easy?', 'pt-BR': 'É fácil?', vi: 'Cái đó có dễ không?', id: 'Apakah itu mudah?', tr: 'Bu kolay mı?', pl: 'Czy to łatwe?' },
    { ru: 'Тот же безличный es из первой сессии, но теперь как вопрос — оценивают что-то, спрашивая мнение собеседника, а не подтверждая своё.', uk: 'Той самий безособовий es з першої сесії, але тепер як питання — оцінюють щось, запитуючи думку співрозмовника, а не підтверджуючи свою.', en: 'The same impersonal es from the first session, but now as a question — you evaluate something by asking the listener\'s opinion, not confirming your own.', 'pt-BR': 'O mesmo es impessoal da primeira sessão, mas agora como pergunta — você avalia algo perguntando a opinião do interlocutor, não confirmando a sua.', vi: 'Cùng es phi nhân xưng, nhưng giờ là câu hỏi — bạn đánh giá điều gì đó bằng cách hỏi ý kiến người nghe, không xác nhận ý kiến của mình.', id: 'Es impersonal yang sama, tetapi sekarang sebagai pertanyaan — Anda menilai sesuatu dengan menanyakan pendapat pendengar, bukan menegaskan pendapat sendiri.', tr: 'Aynı kişisiz es, ama şimdi soru olarak — kendi görüşünüzü onaylamak yerine dinleyicinin görüşünü sorarak bir şeyi değerlendiriyorsunuz.', pl: 'To samo bezosobowe es, ale teraz jako pytanie — oceniasz coś, pytając o opinię słuchacza, a nie potwierdzając własną.' },
    'Es', T.esQ, esVsEres('Es'), soyVsOther('Es'),
    'fácil', { ru: 'Какой признак нужен для оценки сложности?', uk: 'Яка ознака потрібна для оцінки складності?', en: 'Which quality fits evaluating difficulty?', 'pt-BR': 'Qual qualidade cabe para avaliar a dificuldade?', vi: 'Đặc điểm nào phù hợp để đánh giá độ khó?', id: 'Sifat mana yang cocok untuk menilai kesulitan?', tr: 'Zorluğu değerlendirmek için hangi nitelik uyar?', pl: 'Jaka cecha pasuje do oceny trudności?' },
    { value: 'difícil', trapType: 'semantic_neighbor', reason: { ru: 'Difícil значит противоположное — «трудно». Вопрос о лёгкости — fácil.', uk: 'Difícil означає протилежне — «важко». Питання про легкість — fácil.', en: 'Difícil means the opposite — "hard". A question about ease needs fácil.', 'pt-BR': 'Difícil significa o oposto — "difícil". Uma pergunta sobre facilidade precisa de fácil.', vi: 'Difícil nghĩa là ngược lại — "khó". Câu hỏi về sự dễ dàng cần fácil.', id: 'Difícil berarti kebalikannya — "sulit". Pertanyaan tentang kemudahan perlu fácil.', tr: 'Difícil tam tersini ifade eder — "zor". Kolaylık hakkında soru fácil gerektirir.', pl: 'Difícil znaczy przeciwieństwo — „trudne”. Pytanie o łatwość wymaga fácil.' } },
    semanticNeighbor('fácil', 'verdad', { ru: '«правда» (существительное)', uk: '«правда» (іменник)', en: '"truth" (a noun)', 'pt-BR': '"verdade" (substantivo)', vi: '"sự thật" (danh từ)', id: '"kebenaran" (kata benda)', tr: '"gerçek" (isim)', pl: '„prawda” (rzeczownik)' }),
  ),
  'es-e01-s10-es-dificil': d(
    { ru: 'Это трудно?', uk: 'Це важко?', en: 'Is it hard?', 'pt-BR': 'É difícil?', vi: 'Cái đó có khó không?', id: 'Apakah itu sulit?', tr: 'Bu zor mu?', pl: 'Czy to trudne?' },
    { ru: 'Вопрос о сложности — противоположность предыдущего. Difícil — уже знакомое слово из первой сессии, здесь оно просто оборачивается в вопрос.', uk: 'Питання про складність — протилежність попереднього. Difícil — уже знайоме слово з першої сесії, тут воно просто обгортається в питання.', en: 'A question about difficulty — the opposite of the previous one. Difícil is already known from the first session, here it is simply wrapped into a question.', 'pt-BR': 'Uma pergunta sobre dificuldade — o oposto da anterior. Difícil já é conhecido da primeira sessão, aqui ele só se transforma em pergunta.', vi: 'Câu hỏi về độ khó — ngược lại với câu trước. Difícil đã quen thuộc từ buổi đầu tiên, ở đây nó chỉ đơn giản được bọc thành câu hỏi.', id: 'Pertanyaan tentang kesulitan — kebalikan dari sebelumnya. Difícil sudah dikenal dari sesi pertama, di sini hanya dibungkus jadi pertanyaan.', tr: 'Zorluk hakkında bir soru — öncekinin tersi. Difícil ilk oturumdan zaten tanıdıktır, burada sadece soruya sarılır.', pl: 'Pytanie o trudność — przeciwieństwo poprzedniego. Difícil jest już znane z pierwszej sesji, tu po prostu owinięte w pytanie.' },
    'Es', T.esQ, esVsEres('Es'), soyVsOther('Es'),
    'difícil', { ru: 'Какой признак нужен для оценки трудности?', uk: 'Яка ознака потрібна для оцінки труднощів?', en: 'Which quality fits evaluating hardship?', 'pt-BR': 'Qual qualidade cabe para avaliar a dificuldade?', vi: 'Đặc điểm nào phù hợp để đánh giá khó khăn?', id: 'Sifat mana yang cocok untuk menilai kesulitan?', tr: 'Zorluğu değerlendirmek için hangi nitelik uyar?', pl: 'Jaka cecha pasuje do oceny trudności?' },
    { value: 'fácil', trapType: 'semantic_neighbor', reason: { ru: 'Fácil значит противоположное — «легко». Вопрос о трудности — difícil.', uk: 'Fácil означає протилежне — «легко». Питання про труднощі — difícil.', en: 'Fácil means the opposite — "easy". A question about hardship needs difícil.', 'pt-BR': 'Fácil significa o oposto — "fácil". Uma pergunta sobre dificuldade precisa de difícil.', vi: 'Fácil nghĩa là ngược lại — "dễ". Câu hỏi về khó khăn cần difícil.', id: 'Fácil berarti kebalikannya — "mudah". Pertanyaan tentang kesulitan perlu difícil.', tr: 'Fácil tam tersini ifade eder — "kolay". Zorluk hakkında soru difícil gerektirir.', pl: 'Fácil znaczy przeciwieństwo — „łatwe”. Pytanie o trudność wymaga difícil.' } },
    semanticNeighbor('difícil', 'igual', { ru: '«одинаково»', uk: '«однаково»', en: '"the same"', 'pt-BR': '"igual"', vi: '"như nhau"', id: '"sama"', tr: '"aynı"', pl: '„tak samo”' }),
  ),
  'es-e01-s10-es-verdad': d(
    { ru: 'Это правда?', uk: 'Це правда?', en: 'Is it true?', 'pt-BR': 'É verdade?', vi: 'Có đúng không?', id: 'Apakah itu benar?', tr: 'Bu doğru mu?', pl: 'Czy to prawda?' },
    { ru: 'Тот же порядок слов, что и в утверждении Es verdad — вопрос не переставляет es и verdad местами, только добавляет знаки ¿ и ? по краям.', uk: 'Той самий порядок слів, що й у твердженні Es verdad — питання не міняє es та verdad місцями, лише додає знаки ¿ і ? по краях.', en: 'The same word order as the statement Es verdad — the question does not swap es and verdad, it only adds the marks ¿ and ? on the edges.', 'pt-BR': 'A mesma ordem de palavras da afirmação Es verdad — a pergunta não troca es e verdad de lugar, só adiciona os sinais ¿ e ? nas bordas.', vi: 'Cùng trật tự từ như câu khẳng định Es verdad — câu hỏi không đảo es và verdad, chỉ thêm dấu ¿ và ? ở hai đầu.', id: 'Urutan kata yang sama seperti pernyataan Es verdad — pertanyaan tidak menukar es dan verdad, hanya menambahkan tanda ¿ dan ? di kedua sisi.', tr: 'Es verdad ifadesiyle aynı kelime sırası — soru es ve verdad’ı yer değiştirmez, yalnızca kenarlara ¿ ve ? işaretlerini ekler.', pl: 'Ta sama kolejność słów co w twierdzeniu Es verdad — pytanie nie zamienia es i verdad miejscami, tylko dodaje znaki ¿ i ? na krawędziach.' },
    'Es', T.esQ, esVsEres('Es'), soyVsOther('Es'),
    'verdad', { ru: 'Какое слово нужно для подтверждения чужих слов?', uk: 'Яке слово потрібне для підтвердження чужих слів?', en: 'Which word confirms someone else\'s words?', 'pt-BR': 'Qual palavra confirma as palavras de outra pessoa?', vi: 'Từ nào xác nhận lời của người khác?', id: 'Kata mana yang mengonfirmasi kata-kata orang lain?', tr: 'Başkasının sözlerini doğrulayan kelime hangisidir?', pl: 'Które słowo potwierdza czyjeś słowa?' },
    { value: 'verdadero', trapType: 'grammar', reason: { ru: 'Verdadero — признак предмета, «истинный». Устойчивая реакция — именно verdad, существительное.', uk: 'Verdadero — ознака предмета, «істинний». Стала реакція — саме verdad, іменник.', en: 'Verdadero is a quality of a thing, "true". The fixed reaction needs exactly verdad, a noun.', 'pt-BR': 'Verdadero é uma qualidade de uma coisa, "verdadeiro". A reação fixa precisa exatamente de verdad, um substantivo.', vi: 'Verdadero là đặc điểm của một vật, "chân thực". Phản ứng cố định cần chính xác verdad, danh từ.', id: 'Verdadero adalah sifat suatu benda, "sejati". Reaksi tetap memerlukan tepat verdad, kata benda.', tr: 'Verdadero bir şeyin niteliğidir, "gerçek". Sabit tepki tam olarak verdad’ı, bir ismi gerektirir.', pl: 'Verdadero to cecha rzeczy, „prawdziwy”. Utrwalona reakcja wymaga dokładnie verdad, rzeczownika.' } },
    semanticNeighbor('verdad', 'fácil', { ru: '«лёгкий»', uk: '«легкий»', en: '"easy"', 'pt-BR': '"fácil"', vi: '"dễ"', id: '"mudah"', tr: '"kolay"', pl: '„łatwy”' }),
  ),
  'es-e01-s10-es-unico': d(
    { ru: 'Это единственное такое?', uk: 'Це єдине таке?', en: 'Is it one of a kind?', 'pt-BR': 'É único?', vi: 'Cái đó có duy nhất không?', id: 'Apakah itu satu-satunya?', tr: 'Bu eşsiz mi?', pl: 'Czy to jedyne w swoim rodzaju?' },
    { ru: 'Безличная оценка неповторимости предмета — например, изделия ручной работы. Тильда над ú остаётся на месте и в вопросе.', uk: 'Безособова оцінка неповторності предмета — наприклад, виробу ручної роботи. Тильда над ú лишається на місці і в питанні.', en: 'An impersonal evaluation of a thing\'s uniqueness — a handmade item, for example. The tilde over ú stays in place in the question too.', 'pt-BR': 'Uma avaliação impessoal da singularidade de uma coisa — um objeto artesanal, por exemplo. O til sobre ú permanece no lugar também na pergunta.', vi: 'Đánh giá phi nhân xưng về sự độc đáo của một vật — món đồ thủ công chẳng hạn. Dấu ngã trên ú vẫn giữ nguyên cả trong câu hỏi.', id: 'Penilaian impersonal tentang keunikan suatu benda — barang buatan tangan, misalnya. Tilde di atas ú tetap di tempatnya juga dalam pertanyaan.', tr: 'Bir şeyin eşsizliğinin kişisiz değerlendirmesi — el yapımı bir eşya mesela. Ú üzerindeki tilde soruda da yerinde kalır.', pl: 'Bezosobowa ocena wyjątkowości rzeczy — na przykład wyrobu ręcznego. Tylda nad ú zostaje na miejscu także w pytaniu.' },
    'Es', T.esQ, esVsEres('Es'), soyVsOther('Es'),
    'único', { ru: 'Какой признак нужен для оценки предмета?', uk: 'Яка ознака потрібна для оцінки предмета?', en: 'Which quality fits evaluating a thing?', 'pt-BR': 'Qual qualidade cabe para avaliar uma coisa?', vi: 'Đặc điểm nào phù hợp để đánh giá một vật?', id: 'Sifat mana yang cocok untuk menilai benda?', tr: 'Bir şeyi değerlendirmek için hangi nitelik uyar?', pl: 'Jaka cecha pasuje do oceny rzeczy?' },
    genderPair('único', 'única', true),
    accentTrap('único', 'unico'),
  ),
  'es-e01-s10-soy-verdadero': d(
    { ru: 'Я настоящий?', uk: 'Я справжній?', en: 'Am I genuine?', 'pt-BR': 'Eu sou verdadeiro?', vi: 'Tôi có thật lòng không?', id: 'Apakah aku tulus?', tr: 'Ben gerçek miyim?', pl: 'Jestem prawdziwy?' },
    { ru: 'Редкий философский вопрос себе — искренен ли я в том, что говорю. Verdadero здесь согласуется с говорящим мужского рода, а не с предметом.', uk: 'Рідкісне філософське питання про себе — чи щирий я в тому, що кажу. Verdadero тут узгоджується з мовцем чоловічого роду, а не з предметом.', en: 'A rare philosophical question to oneself — whether I am sincere in what I say. Verdadero here agrees with a masculine speaker, not with a thing.', 'pt-BR': 'Uma pergunta filosófica rara para si mesmo — se sou sincero no que digo. Verdadero aqui concorda com um falante masculino, não com uma coisa.', vi: 'Câu hỏi triết học hiếm gặp cho chính mình — liệu tôi có chân thành trong lời nói không. Verdadero ở đây hòa hợp với người nói giống đực, không phải với vật.', id: 'Pertanyaan filosofis langka untuk diri sendiri — apakah aku tulus dalam ucapanku. Verdadero di sini sesuai dengan penutur maskulin, bukan dengan benda.', tr: 'Kendine nadir bir felsefi soru — söylediklerimde samimi miyim. Buradaki verdadero eril bir konuşanla uyumludur, bir şeyle değil.', pl: 'Rzadkie filozoficzne pytanie do siebie — czy jestem szczery w tym, co mówię. Verdadero zgadza się tu z mówiącym rodzaju męskiego, nie z rzeczą.' },
    'Soy', T.soyQ, othersVsSoy('Eres'), othersVsSoy('Es'),
    'verdadero', { ru: 'Какой признак нужен, когда мужчина спрашивает о своей искренности?', uk: 'Яка ознака потрібна, коли чоловік запитує про свою щирість?', en: 'Which quality fits when a man asks about his own sincerity?', 'pt-BR': 'Qual qualidade cabe quando um homem pergunta sobre sua própria sinceridade?', vi: 'Đặc điểm nào phù hợp khi một người đàn ông hỏi về sự chân thành của chính mình?', id: 'Sifat mana yang cocok saat seorang pria bertanya tentang ketulusannya sendiri?', tr: 'Bir erkek kendi samimiyeti hakkında sorduğunda hangi nitelik uyar?', pl: 'Jaka cecha pasuje, gdy mężczyzna pyta o własną szczerość?' },
    genderPair('verdadero', 'verdadera', true),
    semanticNeighbor('verdadero', 'único', { ru: '«единственный»', uk: '«єдиний»', en: '"unique"', 'pt-BR': '"único"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyny”' }),
  ),
  'es-e01-s10-soy-rapido': d(
    { ru: 'Я быстрый?', uk: 'Я швидкий?', en: 'Am I fast?', 'pt-BR': 'Eu sou rápido?', vi: 'Tôi có nhanh không?', id: 'Apakah aku cepat?', tr: 'Ben hızlı mıyım?', pl: 'Jestem szybki?' },
    { ru: 'Редкий, но живой вопрос себе или третьему лицу о своей же скорости — например, после пробежки, спрашивая у тренера. Soy остаётся про говорящего даже в вопросе.', uk: 'Рідкісне, але живе питання про себе чи третій особі про свою ж швидкість — наприклад, після пробіжки, запитуючи в тренера. Soy лишається про мовця навіть у питанні.', en: 'A rare but real question about oneself, to a third party — after a run, asking the coach, for example. Soy stays about the speaker even in a question.', 'pt-BR': 'Uma pergunta rara mas viva sobre si mesmo, a um terceiro — depois de uma corrida, perguntando ao treinador, por exemplo. Soy continua sobre quem fala mesmo na pergunta.', vi: 'Câu hỏi hiếm nhưng có thật về chính mình, với người thứ ba — sau khi chạy, hỏi huấn luyện viên chẳng hạn. Soy vẫn nói về người nói ngay cả trong câu hỏi.', id: 'Pertanyaan yang jarang tapi nyata tentang diri sendiri, kepada pihak ketiga — setelah lari, bertanya kepada pelatih, misalnya. Soy tetap tentang penutur bahkan dalam pertanyaan.', tr: 'Kendisi hakkında nadir ama gerçek bir soru, üçüncü bir kişiye — koşudan sonra antrenöre sormak gibi. Soy soruda bile konuşan hakkında kalır.', pl: 'Rzadkie, ale prawdziwe pytanie o siebie, skierowane do osoby trzeciej — na przykład po biegu, pytając trenera. Soy w pytaniu wciąż dotyczy mówiącego.' },
    'Soy', T.soyQ, othersVsSoy('Eres'), othersVsSoy('Es'),
    'rápido', { ru: 'Какой признак нужен, когда мужчина спрашивает о себе?', uk: 'Яка ознака потрібна, коли чоловік запитує про себе?', en: 'Which quality fits when a man asks about himself?', 'pt-BR': 'Qual qualidade cabe quando um homem pergunta sobre si mesmo?', vi: 'Đặc điểm nào phù hợp khi một người đàn ông hỏi về chính mình?', id: 'Sifat mana yang cocok saat seorang pria bertanya tentang dirinya sendiri?', tr: 'Bir erkek kendisi hakkında sorduğunda hangi nitelik uyar?', pl: 'Jaka cecha pasuje, gdy mężczyzna pyta o siebie?' },
    genderPair('rápido', 'rápida', true),
    semanticNeighbor('rápido', 'bonito', { ru: '«красивый»', uk: '«красивий»', en: '"pretty"', 'pt-BR': '"bonito"', vi: '"đẹp trai"', id: '"tampan"', tr: '"yakışıklı"', pl: '„przystojny”' }),
  ),
  'es-e01-s10-soy-bonita': d(
    { ru: 'Я красивая?', uk: 'Я красива?', en: 'Am I pretty? (feminine)', 'pt-BR': 'Eu sou bonita?', vi: 'Tôi có xinh không?', id: 'Apakah aku cantik?', tr: 'Ben güzel miyim?', pl: 'Jestem ładna?' },
    { ru: 'Вопрос о собственной внешности — женщина спрашивает мнение вслух. Soy остаётся про говорящую даже в вопросе, порядок слов не меняется.', uk: 'Питання про власну зовнішність — жінка запитує думку вголос. Soy лишається про мовицю навіть у питанні, порядок слів не змінюється.', en: 'A question about one\'s own looks — a woman asks for an opinion out loud. Soy stays about the speaker even in a question, the word order does not change.', 'pt-BR': 'Uma pergunta sobre a própria aparência — uma mulher pergunta a opinião em voz alta. Soy continua sobre quem fala mesmo na pergunta, a ordem das palavras não muda.', vi: 'Câu hỏi về ngoại hình của chính mình — một phụ nữ hỏi ý kiến to tiếng. Soy vẫn nói về người nói ngay cả trong câu hỏi, trật tự từ không đổi.', id: 'Pertanyaan tentang penampilan sendiri — seorang wanita meminta pendapat dengan lantang. Soy tetap tentang penutur bahkan dalam pertanyaan, urutan kata tidak berubah.', tr: 'Kendi görünüşü hakkında bir soru — bir kadın yüksek sesle fikir sorar. Soy soruda bile konuşan hakkında kalır, kelime sırası değişmez.', pl: 'Pytanie o własny wygląd — kobieta pyta o opinię na głos. Soy w pytaniu wciąż dotyczy mówiącej, kolejność słów się nie zmienia.' },
    'Soy', T.soyQ, othersVsSoy('Eres'), othersVsSoy('Es'),
    'bonita', { ru: 'Какой признак нужен, когда женщина спрашивает о себе?', uk: 'Яка ознака потрібна, коли жінка запитує про себе?', en: 'Which quality fits when a woman asks about herself?', 'pt-BR': 'Qual qualidade cabe quando uma mulher pergunta sobre si mesma?', vi: 'Đặc điểm nào phù hợp khi một phụ nữ hỏi về chính mình?', id: 'Sifat mana yang cocok saat seorang wanita bertanya tentang dirinya sendiri?', tr: 'Bir kadın kendisi hakkında sorduğunda hangi nitelik uyar?', pl: 'Jaka cecha pasuje, gdy kobieta pyta o siebie?' },
    genderPair('bonito', 'bonita', false),
    semanticNeighbor('bonita', 'rápida', { ru: '«быстрая»', uk: '«швидка»', en: '"fast"', 'pt-BR': '"rápida"', vi: '"nhanh"', id: '"cepat"', tr: '"hızlı"', pl: '„szybka”' }),
  ),
});
