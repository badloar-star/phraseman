import type { EpisodeSourcePhrase, EpisodeSourcePhraseLocalizedDetails, EpisodeSourceWord } from './episode_01_source_v1';
import { EPISODE_01_SESSION_02_WORD_FIRST_PHRASES } from './episode_01_session_02_phrases_word_first_v1';
import { EPISODE_01_SESSION_09_WORD_FIRST_PHRASES } from './episode_01_session_09_phrases_word_first_v1';
import { EPISODE_01_SESSION_10_VOCABULARY_V1 } from './episode_01_session_10_vocabulary_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];
type Copy = Readonly<{ meaning: string; explanation: string }>;

const COPY: Readonly<Record<string, Readonly<Record<Locale, Copy>>>> = {
  'You are not alone': {
    ru: { meaning: 'Ты не один / Вы не одни', explanation: 'Фраза спокойно сообщает собеседнику, что рядом есть поддержка или другие люди. Not отрицает именно состояние alone и остаётся после are.' },
    uk: { meaning: 'Ти не сам / Ви не самі', explanation: 'Фраза спокійно повідомляє співрозмовнику, що поруч є підтримка або інші люди. Not заперечує саме стан alone й лишається після are.' },
    es: { meaning: 'No estás solo / No está solo / No están solos', explanation: 'La frase tranquiliza al interlocutor al indicar que tiene compañía o apoyo. Not niega exactamente alone y permanece después de are.' },
    'pt-BR': { meaning: 'Você não está sozinho / Vocês não estão sozinhos', explanation: 'A frase tranquiliza o interlocutor ao dizer que existe companhia ou apoio. Not nega especificamente alone e continua depois de are.' },
    vi: { meaning: 'Bạn không một mình / Các bạn không một mình', explanation: 'Câu nói trấn an người nghe rằng có người ở bên hoặc hỗ trợ. Not phủ định đúng trạng thái alone và vẫn đứng sau are.' },
    id: { meaning: 'Kamu tidak sendirian / Anda tidak sendirian / Kalian tidak sendirian', explanation: 'Kalimat menenangkan lawan bicara bahwa ada teman atau dukungan. Not menegasikan tepat keadaan alone dan tetap sesudah are.' },
    tr: { meaning: 'Yalnız değilsin / Yalnız değilsiniz', explanation: 'Cümle muhataba yanında destek ya da başka insanlar bulunduğunu sakin biçimde söyler. Not doğrudan alone durumunu olumsuzlar ve are sonrasında kalır.' },
    pl: { meaning: 'Nie jesteś sam / Nie jesteście sami', explanation: 'Zdanie uspokaja rozmówcę, że ma obok siebie ludzi lub wsparcie. Not zaprzecza dokładnie stanowi alone i pozostaje po are.' },
  },
  'You are not tired': {
    ru: { meaning: 'Ты не устал / Вы не устали', explanation: 'Здесь отрицается усталость собеседника, а не сам человек. Полная опора You are сохраняется, и not ставится прямо перед tired.' },
    uk: { meaning: 'Ти не втомився / Ви не втомилися', explanation: 'Тут заперечується втома співрозмовника, а не сама людина. Повна опора You are зберігається, а not стоїть просто перед tired.' },
    es: { meaning: 'No estás cansado / No está cansado / No están cansados', explanation: 'Se niega el cansancio del interlocutor, no su identidad. La base completa You are se conserva y not aparece justo antes de tired.' },
    'pt-BR': { meaning: 'Você não está cansado / Vocês não estão cansados', explanation: 'A frase nega o cansaço do interlocutor, não a pessoa. A base inteira You are permanece, e not fica imediatamente antes de tired.' },
    vi: { meaning: 'Bạn không mệt / Các bạn không mệt', explanation: 'Câu phủ định trạng thái mệt của người nghe chứ không phủ định con người. Khung You are được giữ nguyên và not đứng ngay trước tired.' },
    id: { meaning: 'Kamu tidak lelah / Anda tidak lelah / Kalian tidak lelah', explanation: 'Yang ditolak ialah rasa lelah lawan bicara, bukan orangnya. Kerangka lengkap You are tetap ada dan not berada tepat sebelum tired.' },
    tr: { meaning: 'Yorgun değilsin / Yorgun değilsiniz', explanation: 'Olumsuzlanan şey muhatabın yorgunluk durumudur, kişinin kendisi değildir. You are dayanağı korunur ve not doğrudan tired önünde durur.' },
    pl: { meaning: 'Nie jesteś zmęczony / Nie jesteście zmęczeni', explanation: 'Przeczenie dotyczy zmęczenia rozmówcy, nie jego osoby. Pełna podstawa You are zostaje, a not stoi bezpośrednio przed tired.' },
  },
  'You are not busy': {
    ru: { meaning: 'Ты не занят / Вы не заняты', explanation: 'Фраза сообщает, что у собеседника сейчас нет занятости. Are не исчезает перед отрицанием: правильная середина всегда are not busy.' },
    uk: { meaning: 'Ти не зайнятий / Ви не зайняті', explanation: 'Фраза повідомляє, що співрозмовник зараз не зайнятий. Are не зникає перед запереченням: правильна середина завжди are not busy.' },
    es: { meaning: 'No estás ocupado / No está ocupado / No están ocupados', explanation: 'La frase indica que el interlocutor no está ocupado ahora. Are no desaparece ante la negación: el tramo correcto es are not busy.' },
    'pt-BR': { meaning: 'Você não está ocupado / Vocês não estão ocupados', explanation: 'A frase informa que o interlocutor não está ocupado agora. Are não some diante da negação: o trecho correto é are not busy.' },
    vi: { meaning: 'Bạn không bận / Các bạn không bận', explanation: 'Câu cho biết người nghe hiện không bận. Are không biến mất khi phủ định; phần giữa đúng luôn là are not busy.' },
    id: { meaning: 'Kamu tidak sibuk / Anda tidak sibuk / Kalian tidak sibuk', explanation: 'Kalimat menyatakan lawan bicara sedang tidak sibuk. Are tidak hilang saat dinegasikan; susunan tengah yang tepat ialah are not busy.' },
    tr: { meaning: 'Meşgul değilsin / Meşgul değilsiniz', explanation: 'Cümle muhatabın şu anda meşgul olmadığını bildirir. Olumsuzlukta are kaybolmaz; doğru orta bölüm are not busy olur.' },
    pl: { meaning: 'Nie jesteś zajęty / Nie jesteście zajęci', explanation: 'Zdanie mówi, że rozmówca nie jest teraz zajęty. Are nie znika przy przeczeniu; poprawny środek to zawsze are not busy.' },
  },
  'You are not ready': {
    ru: { meaning: 'Ты не готов / Вы не готовы', explanation: 'Ready называет готовность, а not показывает её отсутствие. Порядок You are not ready остаётся утверждением о собеседнике, не вопросом.' },
    uk: { meaning: 'Ти не готовий / Ви не готові', explanation: 'Ready називає готовність, а not показує її відсутність. Порядок You are not ready лишається твердженням про співрозмовника, не питанням.' },
    es: { meaning: 'No estás listo / No está listo / No están listos', explanation: 'Ready nombra la preparación y not indica que falta. El orden You are not ready sigue siendo una afirmación sobre el interlocutor, no una pregunta.' },
    'pt-BR': { meaning: 'Você não está pronto / Vocês não estão prontos', explanation: 'Ready nomeia a prontidão, e not mostra que ela falta. A ordem You are not ready continua sendo afirmação sobre o interlocutor, não pergunta.' },
    vi: { meaning: 'Bạn chưa sẵn sàng / Các bạn chưa sẵn sàng', explanation: 'Ready gọi tên sự sẵn sàng còn not cho biết trạng thái đó chưa có. You are not ready vẫn là câu khẳng định về người nghe, không phải câu hỏi.' },
    id: { meaning: 'Kamu belum siap / Anda belum siap / Kalian belum siap', explanation: 'Ready menamai kesiapan dan not menunjukkan kesiapan itu belum ada. Urutan You are not ready tetap pernyataan tentang lawan bicara, bukan pertanyaan.' },
    tr: { meaning: 'Hazır değilsin / Hazır değilsiniz', explanation: 'Ready hazır olma durumunu, not ise bunun bulunmadığını gösterir. You are not ready sırası muhatap hakkında bildirimdir; soru değildir.' },
    pl: { meaning: 'Nie jesteś gotowy / Nie jesteście gotowi', explanation: 'Ready nazywa gotowość, a not pokazuje jej brak. Szyk You are not ready nadal jest twierdzeniem o rozmówcy, a nie pytaniem.' },
  },
  'You are not here': {
    ru: { meaning: 'Тебя здесь нет / Вас здесь нет', explanation: 'Естественный перевод меняет форму, но английская фраза остаётся полной. You are not here отрицает присутствие здесь и сохраняет are.' },
    uk: { meaning: 'Тебе тут немає / Вас тут немає', explanation: 'Природний переклад змінює форму, але англійська фраза лишається повною. You are not here заперечує присутність тут і зберігає are.' },
    es: { meaning: 'No estás aquí / No está aquí / No están aquí', explanation: 'La traducción natural cambia de forma, pero la frase inglesa permanece completa. You are not here niega la presencia aquí y conserva are.' },
    'pt-BR': { meaning: 'Você não está aqui / Vocês não estão aqui', explanation: 'A tradução natural pode mudar de forma, mas o inglês fica completo. You are not here nega a presença aqui e mantém are.' },
    vi: { meaning: 'Bạn không ở đây / Các bạn không ở đây', explanation: 'Cách nói tự nhiên có thể khác cấu trúc, nhưng câu tiếng Anh vẫn đầy đủ. You are not here phủ định việc có mặt ở đây và giữ are.' },
    id: { meaning: 'Kamu tidak di sini / Anda tidak di sini / Kalian tidak di sini', explanation: 'Terjemahan alami dapat berbeda bentuk, tetapi kalimat Inggris tetap lengkap. You are not here menolak keberadaan di sini dan mempertahankan are.' },
    tr: { meaning: 'Burada değilsin / Burada değilsiniz', explanation: 'Doğal çeviri biçim değiştirebilir, ancak İngilizce yapı eksilmez. You are not here burada bulunmayı olumsuzlar ve are bağını korur.' },
    pl: { meaning: 'Nie ma cię tutaj / Nie ma was tutaj', explanation: 'Naturalny przekład zmienia formę, lecz angielskie zdanie pozostaje pełne. You are not here zaprzecza obecności tutaj i zachowuje are.' },
  },
  'You are not fine': {
    ru: { meaning: 'Ты не в порядке / Вы не в порядке', explanation: 'Fine описывает общее самочувствие, а not снимает это положительное описание. Связка остаётся на месте: You are not fine.' },
    uk: { meaning: 'Ти не в порядку / Ви не в порядку', explanation: 'Fine описує загальне самопочуття, а not заперечує це позитивне описання. Зв’язка лишається на місці: You are not fine.' },
    es: { meaning: 'No estás bien / No está bien / No están bien', explanation: 'Fine describe un bienestar general y not rechaza esa descripción positiva. El enlace permanece en su sitio: You are not fine.' },
    'pt-BR': { meaning: 'Você não está bem / Vocês não estão bem', explanation: 'Fine descreve o bem-estar geral, e not nega essa descrição positiva. A ligação continua em seu lugar: You are not fine.' },
    vi: { meaning: 'Bạn không ổn / Các bạn không ổn', explanation: 'Fine mô tả trạng thái ổn nói chung, còn not phủ định mô tả tích cực đó. Từ nối vẫn ở đúng chỗ: You are not fine.' },
    id: { meaning: 'Kamu tidak baik-baik saja / Anda tidak baik-baik saja', explanation: 'Fine menggambarkan keadaan umum yang baik dan not menolak gambaran positif itu. Penghubung tetap di tempatnya: You are not fine.' },
    tr: { meaning: 'İyi değilsin / İyi değilsiniz', explanation: 'Fine genel olarak iyi olma durumunu, not ise bu olumlu açıklamanın geçerli olmadığını anlatır. Bağ yerinde kalır: You are not fine.' },
    pl: { meaning: 'Nie czujesz się dobrze / Nie czujecie się dobrze', explanation: 'Fine opisuje ogólne dobre samopoczucie, a not zaprzecza temu pozytywnemu opisowi. Łącznik zostaje na miejscu: You are not fine.' },
  },
  'You are not happy': {
    ru: { meaning: 'Ты не счастлив / Вы не счастливы', explanation: 'Not отрицает радостное состояние happy, но не требует другой связки. С собеседником сохраняется are: You are not happy.' },
    uk: { meaning: 'Ти не щасливий / Ви не щасливі', explanation: 'Not заперечує радісний стан happy, але не потребує іншої зв’язки. Зі співрозмовником зберігається are: You are not happy.' },
    es: { meaning: 'No estás feliz / No está feliz / No están felices', explanation: 'Not niega el estado alegre happy, pero no exige otro enlace. Con el interlocutor se conserva are: You are not happy.' },
    'pt-BR': { meaning: 'Você não está feliz / Vocês não estão felizes', explanation: 'Not nega o estado alegre happy, mas não exige outra ligação. Com o interlocutor, are continua presente: You are not happy.' },
    vi: { meaning: 'Bạn không vui / Các bạn không vui', explanation: 'Not phủ định trạng thái vui happy nhưng không đổi từ nối. Với người nghe, are vẫn được giữ: You are not happy.' },
    id: { meaning: 'Kamu tidak bahagia / Anda tidak bahagia / Kalian tidak bahagia', explanation: 'Not menegasikan keadaan bahagia happy tanpa mengganti penghubung. Bersama lawan bicara, are tetap dipakai: You are not happy.' },
    tr: { meaning: 'Mutlu değilsin / Mutlu değilsiniz', explanation: 'Not, happy ile anlatılan mutluluk durumunu olumsuzlar ama bağı değiştirmez. Muhatapla are korunur: You are not happy.' },
    pl: { meaning: 'Nie jesteś szczęśliwy / Nie jesteście szczęśliwi', explanation: 'Not zaprzecza radosnemu stanowi happy, lecz nie wymaga innego łącznika. Przy rozmówcy zostaje are: You are not happy.' },
  },
  'You are not sad': {
    ru: { meaning: 'Ты не грустный / Вы не грустные', explanation: 'Фраза снимает описание sad с собеседника. Not занимает место между are и sad, поэтому вся конструкция остаётся ясной и полной.' },
    uk: { meaning: 'Ти не сумний / Ви не сумні', explanation: 'Фраза заперечує опис sad щодо співрозмовника. Not стоїть між are і sad, тому вся конструкція лишається ясною та повною.' },
    es: { meaning: 'No estás triste / No está triste / No están tristes', explanation: 'La frase rechaza la descripción sad aplicada al interlocutor. Not ocupa el lugar entre are y sad, de modo que la construcción queda clara y completa.' },
    'pt-BR': { meaning: 'Você não está triste / Vocês não estão tristes', explanation: 'A frase rejeita a descrição sad para o interlocutor. Not ocupa o espaço entre are e sad, deixando a construção clara e completa.' },
    vi: { meaning: 'Bạn không buồn / Các bạn không buồn', explanation: 'Câu phủ định mô tả sad đối với người nghe. Not đứng giữa are và sad nên toàn bộ cấu trúc vẫn rõ ràng và đầy đủ.' },
    id: { meaning: 'Kamu tidak sedih / Anda tidak sedih / Kalian tidak sedih', explanation: 'Kalimat menolak keterangan sad tentang lawan bicara. Not berada di antara are dan sad sehingga susunan tetap jelas dan lengkap.' },
    tr: { meaning: 'Üzgün değilsin / Üzgün değilsiniz', explanation: 'Cümle muhatap için sad açıklamasını olumsuzlar. Not, are ile sad arasındaki yerini alır; böylece yapı açık ve eksiksiz kalır.' },
    pl: { meaning: 'Nie jesteś smutny / Nie jesteście smutni', explanation: 'Zdanie odrzuca opis sad wobec rozmówcy. Not zajmuje miejsce między are i sad, dzięki czemu konstrukcja jest jasna i pełna.' },
  },
};

type LocalizedPhraseWord = NonNullable<NonNullable<EpisodeSourcePhrase['localizedDetails']>[Locale]>['words'][number];
// зачем union (2026-08-30): локализованная ветка обязана отдавать форму
// details.words (reason-поле), а корневая — EpisodeSourceWord.
function vocabularyWord(locale?: Locale): EpisodeSourceWord | LocalizedPhraseWord {
  const entry = EPISODE_01_SESSION_10_VOCABULARY_V1[0]!;
  const details = entry.contacts.build_form;
  if (locale) {
    return {
      correct: entry.target,
      prompt: details.guidance[locale]!,
      distractors: details.distractors.map((trap) => ({
        value: trap.value,
        reason: trap.feedback[locale]!,
        trapType: trap.trapType,
      })),
    };
  }
  return {
    correct: entry.target,
    category: 'state',
    distractors: details.distractors.map((trap) => ({
      value: trap.value,
      reasonCode: `${trap.trapType}:alone:${trap.value}`,
      trapType: trap.trapType,
      why: trap.feedback.ru!,
    })),
  };
}

const NOT_MODEL = EPISODE_01_SESSION_02_WORD_FIRST_PHRASES[0]!;
const POSITIVE = Object.fromEntries(EPISODE_01_SESSION_09_WORD_FIRST_PHRASES.map((phrase) => [phrase.english, phrase])) as Readonly<Record<string, EpisodeSourcePhrase>>;

function phrase(english: keyof typeof COPY): EpisodeSourcePhrase {
  const positiveEnglish = english.replace(' are not ', ' are ');
  const positive = POSITIVE[positiveEnglish];
  const isAlone = english === 'You are not alone';
  if (!positive && !isAlone) throw new Error(`missing_positive_model:${english}`);
  const rootBase = positive?.words.slice(0, 2) ?? POSITIVE['You are here']!.words.slice(0, 2);
  // зачем каст (2026-08-30): без locale ветка отдаёт EpisodeSourceWord;
  // union в сигнатуре нужен только локализованной ветке.
  const rootTail = isAlone ? [vocabularyWord() as EpisodeSourceWord] : positive!.words.slice(2);
  const localizedDetails = Object.fromEntries(LOCALES.map((locale) => {
    const baseWords = positive?.localizedDetails?.[locale]?.words.slice(0, 2) ?? POSITIVE['You are here']!.localizedDetails![locale]!.words.slice(0, 2);
    const tail = isAlone ? [vocabularyWord(locale)] : positive!.localizedDetails![locale]!.words.slice(2);
    const notWord = NOT_MODEL.localizedDetails![locale]!.words[2]!;
    const words: LocalizedPhraseWord[] = [...baseWords, notWord, ...(tail as LocalizedPhraseWord[])];
    return [locale, { ...COPY[english][locale], words, distractors: words.flatMap((word) => word.distractors) } satisfies EpisodeSourcePhraseLocalizedDetails];
  })) as NonNullable<EpisodeSourcePhrase['localizedDetails']>;
  const notWord = NOT_MODEL.words[2]!;
  const words = [...rootBase, notWord, ...rootTail];
  return Object.freeze({
    id: `e01-s10-${english.toLocaleLowerCase('en').replace(/[^a-z]+/gu, '-')}`,
    english,
    russian: COPY[english].ru.meaning,
    explanation: COPY[english].ru.explanation,
    words,
    localizedDetails,
    features: [...new Set(['second_person', 'copula_be', 'negation_not', ...(positive?.features ?? ['state_adjective'])])],
  });
}

export const EPISODE_01_SESSION_10_WORD_FIRST_PHRASES: readonly EpisodeSourcePhrase[] = Object.freeze([
  phrase('You are not alone'), phrase('You are not tired'), phrase('You are not busy'), phrase('You are not ready'),
  phrase('You are not here'), phrase('You are not fine'), phrase('You are not happy'), phrase('You are not sad'),
]);
