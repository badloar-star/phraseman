import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для
// 15 фраз сессии 11 на восьми объяснительных локалях (без 'es'). Три
// позиционных токена (no/eres-es-soy/признак) на фразу.
//
// зачем top-level distractors содержит ВСЕ дистракторы фразы (урок сессии
// 10): errorExplanationByLocale в session_package_from_shard_v1.ts строит
// "value — reason" маркеры из phrase.localizedDetails[locale].distractors
// (не .words[].distractors) — неполный список даёт fallback в английский
// каталог lesson1_distractor_catalog_v2.ts и крашится на испанских словах.
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;
type Details = EpisodeSourcePhraseLocalizedDetails;
type Trap = Details['distractors'][number]['trapType'];
type Reasoned = { value: string; trapType: Trap; reason: Record<LocaleWithoutEs, string> };

function d(
  meaning: Record<LocaleWithoutEs, string>,
  explanation: Record<LocaleWithoutEs, string>,
  w1correct: string, w1prompt: Record<LocaleWithoutEs, string>, w1d1: Reasoned, w1d2: Reasoned,
  w2correct: string, w2prompt: Record<LocaleWithoutEs, string>, w2d1: Reasoned, w2d2: Reasoned,
  w3correct: string, w3prompt: Record<LocaleWithoutEs, string>, w3d1: Reasoned, w3d2: Reasoned,
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
        { value: w3d1.value, reason: w3d1.reason[l], trapType: w3d1.trapType },
        { value: w3d2.value, reason: w3d2.reason[l], trapType: w3d2.trapType },
      ],
      words: [
        { correct: w1correct, prompt: w1prompt[l], distractors: [
          { value: w1d1.value, reason: w1d1.reason[l], trapType: w1d1.trapType },
          { value: w1d2.value, reason: w1d2.reason[l], trapType: w1d2.trapType },
        ]},
        { correct: w2correct, prompt: w2prompt[l], distractors: [
          { value: w2d1.value, reason: w2d1.reason[l], trapType: w2d1.trapType },
          { value: w2d2.value, reason: w2d2.reason[l], trapType: w2d2.trapType },
        ]},
        { correct: w3correct, prompt: w3prompt[l], distractors: [
          { value: w3d1.value, reason: w3d1.reason[l], trapType: w3d1.trapType },
          { value: w3d2.value, reason: w3d2.reason[l], trapType: w3d2.trapType },
        ]},
      ],
    };
  }
  return Object.freeze(out);
}

const T = {
  noQ: { ru: 'Какое слово нужно для отрицания?', uk: 'Яке слово потрібне для заперечення?', en: 'Which word is needed for negation?', 'pt-BR': 'Qual palavra é necessária para a negação?', vi: 'Từ nào cần để phủ định?', id: 'Kata mana yang diperlukan untuk negasi?', tr: 'Olumsuzlama için hangi kelime gerekir?', pl: 'Jakie słowo jest potrzebne do przeczenia?' },
  eresQ: { ru: 'Какая связка нужна при обращении к собеседнику?', uk: 'Яка зв’язка потрібна при зверненні до співрозмовника?', en: 'Which linking word fits addressing the listener?', 'pt-BR': 'Qual ligação cabe ao falar com o interlocutor?', vi: 'Từ nối nào phù hợp khi nói với người nghe?', id: 'Kata penghubung mana yang cocok saat berbicara dengan pendengar?', tr: 'Dinleyiciye hitap etmek için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do zwracania się do słuchacza?' },
  esQ: { ru: 'Какая связка нужна для безличной оценки?', uk: 'Яка зв’язка потрібна для безособової оцінки?', en: 'Which linking word fits an impersonal evaluation?', 'pt-BR': 'Qual ligação cabe numa avaliação impessoal?', vi: 'Từ nối nào phù hợp cho đánh giá phi nhân xưng?', id: 'Kata penghubung mana yang cocok untuk penilaian impersonal?', tr: 'Kişisiz değerlendirme için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do bezosobowej oceny?' },
  soyQ: { ru: 'Какая связка нужна, когда говорят о себе?', uk: 'Яка зв’язка потрібна, коли кажуть про себе?', en: 'Which linking word fits talking about oneself?', 'pt-BR': 'Qual ligação cabe ao falar de si mesmo?', vi: 'Từ nối nào phù hợp khi nói về chính mình?', id: 'Kata penghubung mana yang cocok saat berbicara tentang diri sendiri?', tr: 'Kendisi hakkında konuşmak için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do mówienia o sobie?' },
} as const;

const noNada: Reasoned = { value: 'Nada', trapType: 'semantic_neighbor', reason: { ru: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', uk: 'Nada — «нічого», окреме слово-предмет. Заперечення зв’язки — no.', en: 'Nada means "nothing", a separate word for a thing. Negating the linking word needs no.', 'pt-BR': 'Nada significa "nada", uma palavra separada para uma coisa. Negar a ligação precisa de no.', vi: 'Nada nghĩa là "không có gì", một từ riêng chỉ vật. Phủ định từ nối cần no.', id: 'Nada berarti "tidak ada apa-apa", kata terpisah untuk benda. Menegasikan kata penghubung perlu no.', tr: 'Nada "hiçbir şey" demektir, bir şey için ayrı bir kelimedir. Bağlacı olumsuzlamak no gerektirir.', pl: 'Nada znaczy „nic”, osobne słowo oznaczające rzecz. Zaprzeczenie łącznika wymaga no.' } };
const noNunca: Reasoned = { value: 'Nunca', trapType: 'semantic_neighbor', reason: { ru: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', uk: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — no.', en: 'Nunca means "never", about frequency in time. Simple negation needs no.', 'pt-BR': 'Nunca significa "nunca", sobre frequência no tempo. A negação simples precisa de no.', vi: 'Nunca nghĩa là "không bao giờ", về tần suất thời gian. Phủ định đơn giản cần no.', id: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Negasi sederhana perlu no.', tr: 'Nunca "asla" demektir, zamandaki sıklıkla ilgilidir. Basit olumsuzlama no gerektirir.', pl: 'Nunca znaczy „nigdy”, dotyczy częstotliwości w czasie. Proste przeczenie wymaga no.' } };
const noNon: Reasoned = { value: 'Non', trapType: 'orthographic', reason: { ru: 'Non — не испанское слово. В испанском отрицание пишется no.', uk: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', en: 'Non is not a Spanish word. Spanish negation is spelled no.', 'pt-BR': 'Non não é uma palavra em espanhol. A negação em espanhol se escreve no.', vi: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là no.', id: 'Non bukan kata bahasa Spanyol. Negasi bahasa Spanyol dieja no.', tr: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzlama no şeklinde yazılır.', pl: 'Non to nie hiszpańskie słowo. Hiszpańskie przeczenie pisze się no.' } };

function esVsEres(target: 'Eres' | 'Es' | 'Soy', low: boolean): Reasoned {
  const c = (s: string) => (low ? s.toLowerCase() : s);
  if (target === 'Eres') {
    return { value: c('Es'), trapType: 'grammar', reason: { ru: 'Es — про предмет или третье лицо. Отрицание к собеседнику напрямую — только eres.', uk: 'Es — про предмет чи третю особу. Заперечення до співрозмовника напряму — тільки eres.', en: 'Es is about a thing or a third person. Negation addressed directly to the listener needs only eres.', 'pt-BR': 'Es é sobre uma coisa ou terceira pessoa. A negação ao interlocutor precisa só de eres.', vi: 'Es nói về một vật hay ngôi thứ ba. Phủ định trực tiếp với người nghe chỉ cần eres.', id: 'Es tentang benda atau orang ketiga. Negasi langsung kepada pendengar hanya perlu eres.', tr: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciye doğrudan olumsuzlama yalnızca eres gerektirir.', pl: 'Es dotyczy rzeczy lub trzeciej osoby. Przeczenie do słuchacza wymaga tylko eres.' } };
  }
  if (target === 'Es') {
    return { value: c('Eres'), trapType: 'grammar', reason: { ru: 'Eres — про собеседника напрямую. Безличная оценка предмета — только es.', uk: 'Eres — про співрозмовника напряму. Безособова оцінка предмета — тільки es.', en: 'Eres addresses the listener directly. An impersonal evaluation of a thing needs only es.', 'pt-BR': 'Eres fala com o interlocutor diretamente. Uma avaliação impessoal de uma coisa precisa só de es.', vi: 'Eres nói trực tiếp với người nghe. Đánh giá phi nhân xưng về một vật chỉ cần es.', id: 'Eres berbicara langsung dengan pendengar. Penilaian impersonal atas benda hanya perlu es.', tr: 'Eres doğrudan dinleyiciyle konuşur. Bir şeyin kişisiz değerlendirmesi yalnızca es gerektirir.', pl: 'Eres zwraca się bezpośrednio do słuchacza. Bezosobowa ocena rzeczy wymaga tylko es.' } };
  }
  return { value: c('Eres'), trapType: 'grammar', reason: { ru: 'Eres — про собеседника. Говорящий про себя — только soy.', uk: 'Eres — про співрозмовника. Мовець про себе — тільки soy.', en: 'Eres is about the listener. The speaker talking about themselves needs only soy.', 'pt-BR': 'Eres é sobre o interlocutor. Quem fala sobre si mesmo precisa só de soy.', vi: 'Eres nói về người nghe. Người nói về chính mình chỉ cần soy.', id: 'Eres tentang pendengar. Penutur tentang dirinya sendiri hanya perlu soy.', tr: 'Eres dinleyici hakkındadır. Konuşan kendisi hakkında konuşurken yalnızca soy gerektirir.', pl: 'Eres dotyczy słuchacza. Mówiący o sobie wymaga tylko soy.' } };
}

function otherVs(target: 'Eres' | 'Es' | 'Soy'): Reasoned {
  if (target === 'Eres') {
    return { value: 'soy', trapType: 'grammar', reason: { ru: 'Soy — про себя. Отрицание к собеседнику — eres.', uk: 'Soy — про себе. Заперечення до співрозмовника — eres.', en: 'Soy is about the speaker. Negation to the listener needs eres.', 'pt-BR': 'Soy é sobre quem fala. A negação ao interlocutor precisa de eres.', vi: 'Soy nói về người nói. Phủ định với người nghe cần eres.', id: 'Soy tentang penutur. Negasi kepada pendengar perlu eres.', tr: 'Soy konuşan hakkındadır. Dinleyiciye olumsuzlama eres gerektirir.', pl: 'Soy dotyczy mówiącego. Przeczenie do słuchacza wymaga eres.' } };
  }
  if (target === 'Es') {
    return { value: 'soy', trapType: 'grammar', reason: { ru: 'Soy — про себя. Безличная оценка предмета — es.', uk: 'Soy — про себе. Безособова оцінка предмета — es.', en: 'Soy is about the speaker. An impersonal evaluation of a thing needs es.', 'pt-BR': 'Soy é sobre quem fala. A avaliação impessoal de uma coisa precisa de es.', vi: 'Soy nói về người nói. Đánh giá phi nhân xưng về một vật cần es.', id: 'Soy tentang penutur. Penilaian impersonal atas benda perlu es.', tr: 'Soy konuşan hakkındadır. Bir şeyin kişisiz değerlendirmesi es gerektirir.', pl: 'Soy dotyczy mówiącego. Bezosobowa ocena rzeczy wymaga es.' } };
  }
  return { value: 'es', trapType: 'grammar', reason: { ru: 'Es — про предмет или третье лицо. Говорящий про себя — soy.', uk: 'Es — про предмет чи третю особу. Мовець про себе — soy.', en: 'Es is about a thing or a third person. The speaker talking about themselves needs soy.', 'pt-BR': 'Es é sobre uma coisa ou terceira pessoa. Quem fala sobre si mesmo precisa de soy.', vi: 'Es nói về một vật hay ngôi thứ ba. Người nói về chính mình cần soy.', id: 'Es tentang benda atau orang ketiga. Penutur tentang dirinya sendiri perlu soy.', tr: 'Es bir şey ya da üçüncü kişi hakkındadır. Konuşan kendisi hakkında soy gerektirir.', pl: 'Es dotyczy rzeczy lub trzeciej osoby. Mówiący o sobie wymaga soy.' } };
}

function genderPair(masc: string, fem: string, correctIsMasc: boolean): Reasoned {
  const wrong = correctIsMasc ? fem : masc;
  const correct = correctIsMasc ? masc : fem;
  const wrongEnding = correctIsMasc ? '-a' : '-o';
  const correctEnding = correctIsMasc ? '-o' : '-a';
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма на ${wrongEnding}. Нужна форма ${correct} на ${correctEnding}.`,
    uk: `${wrong} — форма на ${wrongEnding}. Потрібна форма ${correct} на ${correctEnding}.`,
    en: `${wrong} ends in ${wrongEnding}. The needed form is ${correct}, ending in ${correctEnding}.`,
    'pt-BR': `${wrong} termina em ${wrongEnding}. A forma necessária é ${correct}, terminada em ${correctEnding}.`,
    vi: `${wrong} kết thúc bằng ${wrongEnding}. Dạng cần là ${correct}, kết thúc bằng ${correctEnding}.`,
    id: `${wrong} berakhiran ${wrongEnding}. Bentuk yang diperlukan adalah ${correct}, berakhiran ${correctEnding}.`,
    tr: `${wrong}, ${wrongEnding} ile biter. Gereken biçim ${correct}, ${correctEnding} ile biter.`,
    pl: `${wrong} kończy się na ${wrongEnding}. Potrzebna jest forma ${correct}, zakończona na ${correctEnding}.`,
  }};
}

function semanticNeighbor(correct: string, wrong: string, wrongMeaning: Record<LocaleWithoutEs, string>): Reasoned {
  return { value: wrong, trapType: 'semantic_neighbor', reason: {
    ru: `${wrong} — это ${wrongMeaning.ru}, другой признак. Здесь нужно ${correct}.`,
    uk: `${wrong} — це ${wrongMeaning.uk}, інша ознака. Тут потрібно ${correct}.`,
    en: `${wrong} means ${wrongMeaning.en}, a different quality. Here you need ${correct}.`,
    'pt-BR': `${wrong} significa ${wrongMeaning['pt-BR']}, uma qualidade diferente. Aqui é preciso ${correct}.`,
    vi: `${wrong} nghĩa là ${wrongMeaning.vi}, đặc điểm khác. Ở đây cần ${correct}.`,
    id: `${wrong} berarti ${wrongMeaning.id}, sifat berbeda. Di sini perlu ${correct}.`,
    tr: `${wrong}, ${wrongMeaning.tr} demektir, farklı bir niteliktir. Burada ${correct} gerekir.`,
    pl: `${wrong} znaczy ${wrongMeaning.pl}, inna cecha. Tu potrzebne jest ${correct}.`,
  }};
}

function accentTrap(correct: string, wrong: string): Reasoned {
  return { value: wrong, trapType: 'orthographic', reason: {
    ru: `${wrong} без тильды над ú звучал бы иначе. Нужна форма ${correct} с тильдой.`,
    uk: `${wrong} без тильди над ú звучав би інакше. Потрібна форма ${correct} з тильдою.`,
    en: `${wrong} without the tilde over ú would sound different. The needed form is ${correct}, with the tilde.`,
    'pt-BR': `${wrong} sem o til sobre ú soaria diferente. A forma necessária é ${correct}, com o til.`,
    vi: `${wrong} không có dấu ngã trên ú sẽ nghe khác. Dạng cần là ${correct}, có dấu ngã.`,
    id: `${wrong} tanpa tilde di atas ú akan terdengar berbeda. Bentuk yang diperlukan adalah ${correct}, dengan tilde.`,
    tr: `${wrong}, ú üzerinde tilde olmadan farklı duyulurdu. Gereken biçim ${correct}, tilde ile.`,
    pl: `${wrong} bez tyldy nad ú brzmiałoby inaczej. Potrzebna jest forma ${correct}, z tyldą.`,
  }};
}

const wordAndGenderPrompt = (word: string) => ({
  ru: `Какой признак нужен для ${word}?`, uk: `Яка ознака потрібна для ${word}?`, en: `Which quality fits ${word}?`, 'pt-BR': `Qual qualidade cabe a ${word}?`, vi: `Đặc điểm nào phù hợp cho ${word}?`, id: `Sifat mana yang cocok untuk ${word}?`, tr: `${word} için hangi nitelik uyar?`, pl: `Jaka cecha pasuje do ${word}?`,
});

export const ES_SESSION_11_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s11-no-eres-bonito': d(
    { ru: 'Ты не красивый', uk: 'Ти не красивий', en: "You aren't pretty", 'pt-BR': 'Você não é bonito', vi: 'Bạn không đẹp trai', id: 'Kamu tidak tampan', tr: 'Sen yakışıklı değilsin', pl: 'Nie jesteś przystojny' },
    { ru: 'Прямое возражение на комплимент или самооценку собеседника мужского рода. No встаёт перед eres, признак не меняется — та же формула, что и No es fácil.', uk: 'Пряме заперечення на комплімент чи самооцінку співрозмовника чоловічого роду. No стоїть перед eres, ознака не змінюється — та сама формула, що й No es fácil.', en: "A direct objection to a compliment or a masculine listener's self-assessment. No goes before eres, the quality stays the same — the same formula as No es fácil.", 'pt-BR': 'Uma objeção direta a um elogio ou à autoavaliação de um interlocutor masculino. No fica antes de eres, a qualidade não muda — a mesma fórmula de No es fácil.', vi: 'Phản đối trực tiếp lời khen hay tự đánh giá của người nghe giống đực. No đứng trước eres, đặc điểm không đổi — cùng công thức với No es fácil.', id: 'Keberatan langsung terhadap pujian atau penilaian diri pendengar maskulin. No berada sebelum eres, sifatnya tidak berubah — rumus yang sama dengan No es fácil.', tr: 'Eril bir dinleyicinin bir iltifata ya da kendi değerlendirmesine doğrudan bir itiraz. No, eres’ten önce gelir, nitelik değişmez — No es fácil ile aynı formül.', pl: 'Bezpośredni sprzeciw wobec komplementu lub samooceny słuchacza rodzaju męskiego. No stoi przed eres, cecha się nie zmienia — ta sama formuła co No es fácil.' },
    'No', T.noQ, noNada, noNon,
    'eres', T.eresQ, esVsEres('Eres', false), otherVs('Eres'),
    'bonito', wordAndGenderPrompt('bonito'), genderPair('bonito', 'bonita', true), semanticNeighbor('bonito', 'rápido', { ru: '«быстрый»', uk: '«швидкий»', en: '"fast"', 'pt-BR': '"rápido"', vi: '"nhanh"', id: '"cepat"', tr: '"hızlı"', pl: '„szybki”' }),
  ),
  'es-e01-s11-no-eres-bonita': d(
    { ru: 'Ты не красивая', uk: 'Ти не красива', en: "You aren't pretty (feminine)", 'pt-BR': 'Você não é bonita', vi: 'Bạn không xinh đẹp', id: 'Kamu tidak cantik', tr: 'Sen güzel değilsin', pl: 'Nie jesteś ładna' },
    { ru: 'Тот же ответ, но собеседница женского рода. Меняется только концовка признака — no и eres остаются теми же.', uk: 'Та сама відповідь, але співрозмовниця жіночого роду. Змінюється лише закінчення ознаки — no та eres лишаються тими самими.', en: 'The same reply, but about a feminine listener. Only the ending of the quality changes — no and eres stay the same.', 'pt-BR': 'A mesma resposta, mas sobre uma interlocutora feminina. Só a terminação da qualidade muda — no e eres ficam os mesmos.', vi: 'Cùng câu trả lời, nhưng về người nghe giống cái. Chỉ đuôi đặc điểm đổi — no và eres vẫn giữ nguyên.', id: 'Jawaban yang sama, tetapi tentang pendengar feminin. Hanya akhiran sifat yang berubah — no dan eres tetap sama.', tr: 'Aynı cevap, ama dişil bir dinleyici hakkında. Sadece niteliğin sonu değişir — no ve eres aynı kalır.', pl: 'Ta sama odpowiedź, ale o słuchaczce. Zmienia się tylko końcówka cechy — no i eres zostają te same.' },
    'No', T.noQ, noNada, noNon,
    'eres', T.eresQ, esVsEres('Eres', false), otherVs('Eres'),
    'bonita', wordAndGenderPrompt('bonita'), genderPair('bonito', 'bonita', false), semanticNeighbor('bonita', 'única', { ru: '«единственная»', uk: '«єдина»', en: '"unique"', 'pt-BR': '"única"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyna”' }),
  ),
  'es-e01-s11-no-eres-rapido': d(
    { ru: 'Ты не быстрый', uk: 'Ти не швидкий', en: "You aren't fast", 'pt-BR': 'Você não é rápido', vi: 'Bạn không nhanh', id: 'Kamu tidak cepat', tr: 'Sen hızlı değilsin', pl: 'Nie jesteś szybki' },
    { ru: 'Отрицание темпа собеседника мужского рода — например, при разборе результата забега. No перед eres, признак не меняется.', uk: 'Заперечення темпу співрозмовника чоловічого роду — наприклад, при розборі результату забігу. No перед eres, ознака не змінюється.', en: "A denial of a masculine listener's pace — reviewing a race result, for example. No goes before eres, the quality stays the same.", 'pt-BR': 'Uma negação do ritmo de um interlocutor masculino — analisando o resultado de uma corrida, por exemplo. No fica antes de eres, a qualidade não muda.', vi: 'Phủ định tốc độ của người nghe giống đực — khi xem lại kết quả cuộc đua chẳng hạn. No đứng trước eres, đặc điểm không đổi.', id: 'Penyangkalan kecepatan pendengar maskulin — meninjau hasil lomba, misalnya. No berada sebelum eres, sifatnya tidak berubah.', tr: 'Eril bir dinleyicinin temposunun reddi — bir yarış sonucunu değerlendirirken mesela. No, eres’ten önce gelir, nitelik değişmez.', pl: 'Zaprzeczenie tempa słuchacza rodzaju męskiego — na przykład przy omawianiu wyniku wyścigu. No stoi przed eres, cecha się nie zmienia.' },
    'No', T.noQ, noNunca, noNon,
    'eres', T.eresQ, esVsEres('Eres', false), otherVs('Eres'),
    'rápido', wordAndGenderPrompt('rápido'), genderPair('rápido', 'rápida', true), semanticNeighbor('rápido', 'verdadero', { ru: '«истинный»', uk: '«істинний»', en: '"true"', 'pt-BR': '"verdadeiro"', vi: '"đúng"', id: '"benar"', tr: '"doğru"', pl: '„prawdziwy”' }),
  ),
  'es-e01-s11-no-eres-rapida': d(
    { ru: 'Ты не быстрая', uk: 'Ти не швидка', en: "You aren't fast (feminine)", 'pt-BR': 'Você não é rápida', vi: 'Bạn không nhanh (giống cái)', id: 'Kamu tidak cepat (feminin)', tr: 'Sen hızlı değilsin (dişil)', pl: 'Nie jesteś szybka' },
    { ru: 'Тот же ответ о темпе, но собеседница женского рода. Меняется только концовка признака.', uk: 'Та сама відповідь про темп, але співрозмовниця жіночого роду. Змінюється лише закінчення ознаки.', en: 'The same reply about pace, but a feminine listener. Only the ending of the quality changes.', 'pt-BR': 'A mesma resposta sobre ritmo, mas uma interlocutora feminina. Só a terminação da qualidade muda.', vi: 'Cùng câu trả lời về tốc độ, nhưng người nghe giống cái. Chỉ đuôi đặc điểm đổi.', id: 'Jawaban yang sama tentang kecepatan, tetapi pendengar feminin. Hanya akhiran sifat yang berubah.', tr: 'Tempo hakkında aynı cevap, ama dişil bir dinleyici. Sadece niteliğin sonu değişir.', pl: 'Ta sama odpowiedź o tempie, ale o słuchaczce. Zmienia się tylko końcówka cechy.' },
    'No', T.noQ, noNunca, noNon,
    'eres', T.eresQ, esVsEres('Eres', false), otherVs('Eres'),
    'rápida', wordAndGenderPrompt('rápida'), genderPair('rápido', 'rápida', false), semanticNeighbor('rápida', 'verdadera', { ru: '«истинная»', uk: '«істинна»', en: '"true"', 'pt-BR': '"verdadeira"', vi: '"đúng"', id: '"benar"', tr: '"doğru"', pl: '„prawdziwa”' }),
  ),
  'es-e01-s11-no-eres-unico': d(
    { ru: 'Ты не единственный такой', uk: 'Ти не єдиний такий', en: "You aren't one of a kind", 'pt-BR': 'Você não é único', vi: 'Bạn không phải là duy nhất', id: 'Kamu bukan satu-satunya', tr: 'Sen eşsiz değilsin', pl: 'Nie jesteś jedyny w swoim rodzaju' },
    { ru: 'Отрицание неповторимости собеседника мужского рода — например, в споре о том, кто особенный. Тильда над ú остаётся на месте и в отрицании.', uk: 'Заперечення неповторності співрозмовника чоловічого роду — наприклад, у суперечці про те, хто особливий. Тильда над ú лишається на місці і в запереченні.', en: "A denial of a masculine listener's uniqueness — arguing about who is special, for example. The tilde over ú stays in place in the negation too.", 'pt-BR': 'Uma negação da singularidade de um interlocutor masculino — discutindo quem é especial, por exemplo. O til sobre ú permanece no lugar também na negação.', vi: 'Phủ định sự độc đáo của người nghe giống đực — tranh cãi về việc ai đặc biệt chẳng hạn. Dấu ngã trên ú vẫn giữ nguyên cả trong phủ định.', id: 'Penyangkalan keunikan pendengar maskulin — berdebat tentang siapa yang istimewa, misalnya. Tilde di atas ú tetap di tempatnya juga dalam negasi.', tr: 'Eril bir dinleyicinin eşsizliğinin reddi — kimin özel olduğu tartışılırken mesela. Ú üzerindeki tilde olumsuzlamada da yerinde kalır.', pl: 'Zaprzeczenie wyjątkowości słuchacza rodzaju męskiego — na przykład w sporze o to, kto jest wyjątkowy. Tylda nad ú zostaje na miejscu także w przeczeniu.' },
    'No', T.noQ, noNada, noNon,
    'eres', T.eresQ, esVsEres('Eres', false), otherVs('Eres'),
    'único', wordAndGenderPrompt('único'), genderPair('único', 'única', true), accentTrap('único', 'unico'),
  ),
  'es-e01-s11-no-eres-unica': d(
    { ru: 'Ты не единственная такая', uk: 'Ти не єдина така', en: "You aren't one of a kind (feminine)", 'pt-BR': 'Você não é única', vi: 'Bạn không phải là duy nhất (giống cái)', id: 'Kamu bukan satu-satunya (feminin)', tr: 'Sen eşsiz değilsin (dişil)', pl: 'Nie jesteś jedyna w swoim rodzaju' },
    { ru: 'Тот же ответ о неповторимости, но собеседница женского рода. Тильда над ú остаётся на месте в обеих формах.', uk: 'Та сама відповідь про неповторність, але співрозмовниця жіночого роду. Тильда над ú лишається на місці в обох формах.', en: 'The same reply about uniqueness, but a feminine listener. The tilde over ú stays in both forms.', 'pt-BR': 'A mesma resposta sobre singularidade, mas uma interlocutora feminina. O til sobre ú permanece nas duas formas.', vi: 'Cùng câu trả lời về sự độc đáo, nhưng người nghe giống cái. Dấu ngã trên ú vẫn giữ ở cả hai dạng.', id: 'Jawaban yang sama tentang keunikan, tetapi pendengar feminin. Tilde di atas ú tetap di kedua bentuk.', tr: 'Eşsizlik hakkında aynı cevap, ama dişil bir dinleyici. Ú üzerindeki tilde her iki biçimde de kalır.', pl: 'Ta sama odpowiedź o wyjątkowości, ale o słuchaczce. Tylda nad ú zostaje w obu formach.' },
    'No', T.noQ, noNada, noNon,
    'eres', T.eresQ, esVsEres('Eres', false), otherVs('Eres'),
    'única', wordAndGenderPrompt('única'), genderPair('único', 'única', false), accentTrap('única', 'unica'),
  ),
  'es-e01-s11-no-es-bonito': d(
    { ru: 'Это некрасиво', uk: 'Це некрасиво', en: "It isn't pretty", 'pt-BR': 'Não é bonito', vi: 'Cái đó không đẹp', id: 'Itu tidak bagus', tr: 'Bu güzel değil', pl: 'To nie jest ładne' },
    { ru: 'Безличное отрицание внешнего вида предмета или ситуации — например, неаккуратного результата работы. Es здесь не про собеседника.', uk: 'Безособове заперечення зовнішнього вигляду предмета чи ситуації — наприклад, неохайного результату роботи. Es тут не про співрозмовника.', en: "An impersonal denial of a thing's appearance — sloppy work, for example. Es here is not about the listener.", 'pt-BR': 'Uma negação impessoal da aparência de uma coisa — um trabalho malfeito, por exemplo. Es aqui não é sobre o interlocutor.', vi: 'Phủ định phi nhân xưng về vẻ ngoài của một vật — công việc cẩu thả chẳng hạn. Es ở đây không nói về người nghe.', id: 'Penyangkalan impersonal tentang penampilan suatu benda — pekerjaan yang berantakan, misalnya. Es di sini bukan tentang pendengar.', tr: 'Bir şeyin görünümünün kişisiz reddi — özensiz bir iş mesela. Buradaki Es dinleyici hakkında değildir.', pl: 'Bezosobowe zaprzeczenie wyglądu rzeczy — na przykład niechlujnej pracy. Es tutaj nie dotyczy słuchacza.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres('Es', true), otherVs('Es'),
    'bonito', wordAndGenderPrompt('bonito'), genderPair('bonito', 'bonita', true), semanticNeighbor('bonito', 'fácil', { ru: '«лёгкий»', uk: '«легкий»', en: '"easy"', 'pt-BR': '"fácil"', vi: '"dễ"', id: '"mudah"', tr: '"kolay"', pl: '„łatwy”' }),
  ),
  'es-e01-s11-no-es-facil': d(
    { ru: 'Это не легко', uk: 'Це не легко', en: "It isn't easy", 'pt-BR': 'Não é fácil', vi: 'Cái đó không dễ', id: 'Itu tidak mudah', tr: 'Bu kolay değil', pl: 'To nie jest łatwe' },
    { ru: 'Прямое возражение на оценку кого-то другого — уже знакомая фраза из второй сессии, здесь встречается как recall внутри новой темы.', uk: 'Пряме заперечення на оцінку когось іншого — вже знайома фраза з другої сесії, тут трапляється як recall всередині нової теми.', en: 'A direct objection to someone else\'s evaluation — a phrase already known from the second session, here it appears as a recall inside a new topic.', 'pt-BR': 'Uma objeção direta à avaliação de outra pessoa — uma frase já conhecida da segunda sessão, aqui aparece como recall dentro de um tema novo.', vi: 'Phản đối trực tiếp đánh giá của người khác — cụm từ đã quen từ buổi thứ hai, ở đây xuất hiện như một recall trong chủ đề mới.', id: 'Keberatan langsung terhadap penilaian orang lain — frasa yang sudah dikenal dari sesi kedua, di sini muncul sebagai recall dalam topik baru.', tr: 'Başkasının değerlendirmesine doğrudan bir itiraz — ikinci oturumdan zaten tanıdık bir ifade, burada yeni bir konu içinde recall olarak görünür.', pl: 'Bezpośredni sprzeciw wobec czyjejś oceny — fraza już znana z drugiej sesji, tu pojawia się jako recall w nowym temacie.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres('Es', true), otherVs('Es'),
    'fácil', wordAndGenderPrompt('fácil'), { value: 'difícil', trapType: 'semantic_neighbor', reason: { ru: 'Difícil значит противоположное — «трудно». Отрицание лёгкости — fácil.', uk: 'Difícil означає протилежне — «важко». Заперечення легкості — fácil.', en: 'Difícil means the opposite — "hard". Negating ease needs fácil.', 'pt-BR': 'Difícil significa o oposto — "difícil". A negação de facilidade precisa de fácil.', vi: 'Difícil nghĩa là ngược lại — "khó". Phủ định sự dễ dàng cần fácil.', id: 'Difícil berarti kebalikannya — "sulit". Negasi kemudahan perlu fácil.', tr: 'Difícil tam tersini ifade eder — "zor". Kolaylığın olumsuzlanması fácil gerektirir.', pl: 'Difícil znaczy przeciwieństwo — „trudne”. Zaprzeczenie łatwości wymaga fácil.' } },
    semanticNeighbor('fácil', 'verdad', { ru: '«правда» (существительное)', uk: '«правда» (іменник)', en: '"truth" (a noun)', 'pt-BR': '"verdade" (substantivo)', vi: '"sự thật" (danh từ)', id: '"kebenaran" (kata benda)', tr: '"gerçek" (isim)', pl: '„prawda” (rzeczownik)' }),
  ),
  'es-e01-s11-no-es-verdad': d(
    { ru: 'Это неправда', uk: 'Це неправда', en: "It isn't true", 'pt-BR': 'Não é verdade', vi: 'Điều đó không đúng', id: 'Itu tidak benar', tr: 'Bu doğru değil', pl: 'To nieprawda' },
    { ru: 'Прямое опровержение чужих слов — та же формула, что и No es fácil, здесь как recall из второй сессии внутри новой темы отрицания.', uk: 'Пряме спростування чужих слів — та сама формула, що й No es fácil, тут як recall з другої сесії всередині нової теми заперечення.', en: 'A direct refutation of someone else\'s words — the same formula as No es fácil, here as a recall from the second session inside the new negation topic.', 'pt-BR': 'Uma refutação direta das palavras de outra pessoa — a mesma fórmula de No es fácil, aqui como recall da segunda sessão dentro do novo tema de negação.', vi: 'Phản bác trực tiếp lời của người khác — cùng công thức với No es fácil, ở đây như một recall từ buổi thứ hai trong chủ đề phủ định mới.', id: 'Sanggahan langsung terhadap kata-kata orang lain — rumus yang sama dengan No es fácil, di sini sebagai recall dari sesi kedua dalam topik negasi baru.', tr: 'Başkasının sözlerine doğrudan bir çürütme — No es fácil ile aynı formül, burada yeni olumsuzlama konusu içinde ikinci oturumdan bir recall olarak.', pl: 'Bezpośrednie obalenie czyichś słów — ta sama formuła co No es fácil, tu jako recall z drugiej sesji w nowym temacie przeczenia.' },
    'No', T.noQ, noNunca, noNon,
    'es', T.esQ, esVsEres('Es', true), otherVs('Es'),
    'verdad', { ru: 'Какое слово нужно для опровержения чужих слов?', uk: 'Яке слово потрібне для спростування чужих слів?', en: 'Which word refutes someone else\'s words?', 'pt-BR': 'Qual palavra refuta as palavras de outra pessoa?', vi: 'Từ nào phản bác lời của người khác?', id: 'Kata mana yang menyanggah kata-kata orang lain?', tr: 'Başkasının sözlerini çürüten kelime hangisidir?', pl: 'Które słowo obala czyjeś słowa?' },
    { value: 'verdadero', trapType: 'grammar', reason: { ru: 'Verdadero — признак предмета, «истинный». Устойчивая реакция — именно verdad, существительное.', uk: 'Verdadero — ознака предмета, «істинний». Стала реакція — саме verdad, іменник.', en: 'Verdadero is a quality of a thing, "true". The fixed reaction needs exactly verdad, a noun.', 'pt-BR': 'Verdadero é uma qualidade de uma coisa, "verdadeiro". A reação fixa precisa exatamente de verdad, um substantivo.', vi: 'Verdadero là đặc điểm của một vật, "chân thực". Phản ứng cố định cần chính xác verdad, danh từ.', id: 'Verdadero adalah sifat suatu benda, "sejati". Reaksi tetap memerlukan tepat verdad, kata benda.', tr: 'Verdadero bir şeyin niteliğidir, "gerçek". Sabit tepki tam olarak verdad’ı, bir ismi gerektirir.', pl: 'Verdadero to cecha rzeczy, „prawdziwy”. Utrwalona reakcja wymaga dokładnie verdad, rzeczownika.' } },
    { value: 'mentira', trapType: 'semantic_neighbor', reason: { ru: 'Mentira значит «ложь» само по себе — сказали бы Es mentira. Здесь отрицание готовой фразы Es verdad, нужно verdad.', uk: 'Mentira означає «брехня» саме по собі — сказали б Es mentira. Тут заперечення готової фрази Es verdad, потрібно verdad.', en: 'Mentira means "lie" on its own — you would say Es mentira. Here it is a negation of the ready phrase Es verdad, so verdad is needed.', 'pt-BR': 'Mentira significa "mentira" por si só — diriam Es mentira. Aqui é a negação da frase pronta Es verdad, precisa de verdad.', vi: 'Mentira nghĩa là "lời nói dối" tự nó — sẽ nói Es mentira. Ở đây là phủ định câu có sẵn Es verdad, cần verdad.', id: 'Mentira berarti "kebohongan" dengan sendirinya — akan dikatakan Es mentira. Di sini adalah negasi frasa jadi Es verdad, perlu verdad.', tr: 'Mentira kendi başına "yalan" demektir — Es mentira denirdi. Burada hazır ifade Es verdad’ın olumsuzlanmasıdır, verdad gerekir.', pl: 'Mentira samo w sobie znaczy „kłamstwo” — powiedziano by Es mentira. Tu jest to zaprzeczenie gotowej frazy Es verdad, potrzebne jest verdad.' } },
  ),
  'es-e01-s11-no-es-unica': d(
    { ru: 'Это не единственная такая', uk: 'Це не єдина така', en: "It isn't one of a kind (feminine)", 'pt-BR': 'Não é única', vi: 'Cái đó không phải là duy nhất (giống cái)', id: 'Itu bukan satu-satunya (feminin)', tr: 'Bu eşsiz değil (dişil)', pl: 'To nie jest jedyna w swoim rodzaju' },
    { ru: 'Тот же ответ о неповторимости, но про предмет женского рода — например, серию открыток. Тильда над ú остаётся на месте в обеих формах.', uk: 'Та сама відповідь про неповторність, але про предмет жіночого роду — наприклад, серію листівок. Тильда над ú лишається на місці в обох формах.', en: 'The same reply about uniqueness, but about a feminine-gender thing — a series of postcards, for example. The tilde over ú stays in both forms.', 'pt-BR': 'A mesma resposta sobre singularidade, mas sobre uma coisa de gênero feminino — uma série de cartões-postais, por exemplo. O til sobre ú permanece nas duas formas.', vi: 'Cùng câu trả lời về sự độc đáo, nhưng về một vật giống cái — một bộ bưu thiếp chẳng hạn. Dấu ngã trên ú vẫn giữ ở cả hai dạng.', id: 'Jawaban yang sama tentang keunikan, tetapi tentang benda bergender feminin — serangkaian kartu pos, misalnya. Tilde di atas ú tetap di kedua bentuk.', tr: 'Eşsizlik hakkında aynı cevap, ama dişil cinsiyetteki bir şey hakkında — bir kartpostal serisi mesela. Ú üzerindeki tilde her iki biçimde de kalır.', pl: 'Ta sama odpowiedź o wyjątkowości, ale o rzeczy rodzaju żeńskiego — na przykład serii pocztówek. Tylda nad ú zostaje w obu formach.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres('Es', true), otherVs('Es'),
    'única', wordAndGenderPrompt('única'), genderPair('único', 'única', false), accentTrap('única', 'unica'),
  ),
  'es-e01-s11-no-es-rapido': d(
    { ru: 'Это не быстро', uk: 'Це не швидко', en: "It isn't fast", 'pt-BR': 'Não é rápido', vi: 'Cái đó không nhanh', id: 'Itu tidak cepat', tr: 'Bu hızlı değil', pl: 'To nie jest szybkie' },
    { ru: 'Безличное отрицание темпа процесса или транспорта — например, медленного интернета. Es про сам предмет, не про собеседника.', uk: 'Безособове заперечення темпу процесу чи транспорту — наприклад, повільного інтернету. Es про сам предмет, не про співрозмовника.', en: "An impersonal denial of a process's or vehicle's pace — slow internet, for example. Es is about the thing itself, not the listener.", 'pt-BR': 'Uma negação impessoal do ritmo de um processo ou transporte — internet lenta, por exemplo. Es é sobre a própria coisa, não sobre o interlocutor.', vi: 'Phủ định phi nhân xưng về tốc độ của một quá trình hay phương tiện — internet chậm chẳng hạn. Es nói về chính vật đó, không phải người nghe.', id: 'Penyangkalan impersonal tentang kecepatan suatu proses atau kendaraan — internet lambat, misalnya. Es tentang benda itu sendiri, bukan pendengar.', tr: 'Bir sürecin ya da aracın temposunun kişisiz reddi — yavaş internet mesela. Es dinleyici hakkında değil, şeyin kendisi hakkındadır.', pl: 'Bezosobowe zaprzeczenie tempa procesu lub pojazdu — na przykład wolnego internetu. Es dotyczy samej rzeczy, nie słuchacza.' },
    'No', T.noQ, noNunca, noNon,
    'es', T.esQ, esVsEres('Es', true), otherVs('Es'),
    'rápido', wordAndGenderPrompt('rápido'), genderPair('rápido', 'rápida', true), semanticNeighbor('rápido', 'único', { ru: '«единственный»', uk: '«єдиний»', en: '"unique"', 'pt-BR': '"único"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyny”' }),
  ),
  'es-e01-s11-no-es-unico': d(
    { ru: 'Это не единственное такое', uk: 'Це не єдине таке', en: "It isn't one of a kind", 'pt-BR': 'Não é único', vi: 'Cái đó không duy nhất', id: 'Itu bukan satu-satunya', tr: 'Bu eşsiz değil', pl: 'To nie jest jedyne w swoim rodzaju' },
    { ru: 'Безличное отрицание неповторимости предмета — например, серийного изделия. Тильда над ú остаётся на месте и в отрицании.', uk: 'Безособове заперечення неповторності предмета — наприклад, серійного виробу. Тильда над ú лишається на місці і в запереченні.', en: "An impersonal denial of a thing's uniqueness — a mass-produced item, for example. The tilde over ú stays in place in the negation too.", 'pt-BR': 'Uma negação impessoal da singularidade de uma coisa — um item produzido em série, por exemplo. O til sobre ú permanece no lugar também na negação.', vi: 'Phủ định phi nhân xưng về sự độc đáo của một vật — món hàng sản xuất hàng loạt chẳng hạn. Dấu ngã trên ú vẫn giữ nguyên cả trong phủ định.', id: 'Penyangkalan impersonal tentang keunikan suatu benda — barang produksi massal, misalnya. Tilde di atas ú tetap di tempatnya juga dalam negasi.', tr: 'Bir şeyin eşsizliğinin kişisiz reddi — seri üretim bir eşya mesela. Ú üzerindeki tilde olumsuzlamada da yerinde kalır.', pl: 'Bezosobowe zaprzeczenie wyjątkowości rzeczy — na przykład produktu seryjnego. Tylda nad ú zostaje na miejscu także w przeczeniu.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres('Es', true), otherVs('Es'),
    'único', wordAndGenderPrompt('único'), genderPair('único', 'única', true), accentTrap('único', 'unico'),
  ),
  'es-e01-s11-no-soy-rapido': d(
    { ru: 'Я не быстрый', uk: 'Я не швидкий', en: "I'm not fast", 'pt-BR': 'Eu não sou rápido', vi: 'Tôi không nhanh', id: 'Aku tidak cepat', tr: 'Ben hızlı değilim', pl: 'Nie jestem szybki' },
    { ru: 'Отрицание собственного качества из первой сессии — уже знакомая фраза, здесь встречается как recall внутри темы отрицания связки.', uk: 'Заперечення власної якості з першої сесії — вже знайома фраза, тут трапляється як recall всередині теми заперечення зв’язки.', en: 'A denial of one\'s own quality from the first session — a phrase already known, here it appears as a recall inside the topic of negating the linking word.', 'pt-BR': 'Uma negação da própria qualidade da primeira sessão — uma frase já conhecida, aqui aparece como recall dentro do tema de negação da ligação.', vi: 'Phủ định đặc điểm của chính mình từ buổi đầu tiên — cụm từ đã quen, ở đây xuất hiện như một recall trong chủ đề phủ định từ nối.', id: 'Penyangkalan sifat sendiri dari sesi pertama — frasa yang sudah dikenal, di sini muncul sebagai recall dalam topik negasi kata penghubung.', tr: 'Birinci oturumdan kendi niteliğinin reddi — zaten tanıdık bir ifade, burada bağlacın olumsuzlanması konusu içinde bir recall olarak görünür.', pl: 'Zaprzeczenie własnej cechy z pierwszej sesji — fraza już znana, tu pojawia się jako recall w temacie przeczenia łącznika.' },
    'No', T.noQ, noNunca, noNon,
    'soy', T.soyQ, esVsEres('Soy', true), otherVs('Soy'),
    'rápido', wordAndGenderPrompt('rápido'), genderPair('rápido', 'rápida', true), semanticNeighbor('rápido', 'bonito', { ru: '«красивый»', uk: '«красивий»', en: '"pretty"', 'pt-BR': '"bonito"', vi: '"đẹp trai"', id: '"tampan"', tr: '"yakışıklı"', pl: '„przystojny”' }),
  ),
  'es-e01-s11-no-soy-bonita': d(
    { ru: 'Я не красивая', uk: 'Я не красива', en: "I'm not pretty (feminine)", 'pt-BR': 'Eu não sou bonita', vi: 'Tôi không xinh', id: 'Aku tidak cantik', tr: 'Ben güzel değilim', pl: 'Nie jestem ładna' },
    { ru: 'Отрицание собственной внешности — женщина возражает на комплимент. No перед soy, признак не меняется.', uk: 'Заперечення власної зовнішності — жінка заперечує комплімент. No перед soy, ознака не змінюється.', en: 'A denial of one\'s own looks — a woman objecting to a compliment. No goes before soy, the quality stays the same.', 'pt-BR': 'Uma negação da própria aparência — uma mulher objetando a um elogio. No fica antes de soy, a qualidade não muda.', vi: 'Phủ định ngoại hình của chính mình — một phụ nữ phản đối lời khen. No đứng trước soy, đặc điểm không đổi.', id: 'Penyangkalan penampilan sendiri — seorang wanita keberatan atas pujian. No berada sebelum soy, sifatnya tidak berubah.', tr: 'Kendi görünüşünün reddi — bir kadının bir iltifata itiraz etmesi. No, soy’dan önce gelir, nitelik değişmez.', pl: 'Zaprzeczenie własnego wyglądu — kobieta sprzeciwia się komplementowi. No stoi przed soy, cecha się nie zmienia.' },
    'No', T.noQ, noNada, noNon,
    'soy', T.soyQ, esVsEres('Soy', true), otherVs('Soy'),
    'bonita', wordAndGenderPrompt('bonita'), genderPair('bonito', 'bonita', false), semanticNeighbor('bonita', 'rápida', { ru: '«быстрая»', uk: '«швидка»', en: '"fast"', 'pt-BR': '"rápida"', vi: '"nhanh"', id: '"cepat"', tr: '"hızlı"', pl: '„szybka”' }),
  ),
  'es-e01-s11-no-soy-verdadero': d(
    { ru: 'Я не настоящий', uk: 'Я не справжній', en: "I'm not genuine", 'pt-BR': 'Eu não sou verdadeiro', vi: 'Tôi không thật lòng', id: 'Aku tidak tulus', tr: 'Ben gerçek değilim', pl: 'Nie jestem prawdziwy' },
    { ru: 'Философское отрицание собственной искренности. Verdadero здесь согласуется с говорящим мужского рода, no встаёт перед soy.', uk: 'Філософське заперечення власної щирості. Verdadero тут узгоджується з мовцем чоловічого роду, no стоїть перед soy.', en: 'A philosophical denial of one\'s own sincerity. Verdadero here agrees with a masculine speaker, no goes before soy.', 'pt-BR': 'Uma negação filosófica da própria sinceridade. Verdadero aqui concorda com um falante masculino, no fica antes de soy.', vi: 'Phủ định triết học về sự chân thành của chính mình. Verdadero ở đây hòa hợp với người nói giống đực, no đứng trước soy.', id: 'Penyangkalan filosofis atas ketulusan sendiri. Verdadero di sini sesuai dengan penutur maskulin, no berada sebelum soy.', tr: 'Kendi samimiyetinin felsefi reddi. Buradaki verdadero eril bir konuşanla uyumludur, no soy’dan önce gelir.', pl: 'Filozoficzne zaprzeczenie własnej szczerości. Verdadero zgadza się tu z mówiącym rodzaju męskiego, no stoi przed soy.' },
    'No', T.noQ, noNunca, noNon,
    'soy', T.soyQ, esVsEres('Soy', true), otherVs('Soy'),
    'verdadero', wordAndGenderPrompt('verdadero'), genderPair('verdadero', 'verdadera', true), semanticNeighbor('verdadero', 'único', { ru: '«единственный»', uk: '«єдиний»', en: '"unique"', 'pt-BR': '"único"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyny”' }),
  ),
});
