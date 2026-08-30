import type { EpisodeSourcePhrase, EpisodeSourcePhraseLocalizedDetails, EpisodeSourceWord } from './episode_01_source_v1';
import { EPISODE_01_SESSION_01_WORD_FIRST_PHRASES } from './episode_01_session_01_phrases_word_first_v1';
import { EPISODE_01_SESSION_03_WORD_FIRST_PHRASES } from './episode_01_session_03_phrases_word_first_v1';
import { EPISODE_01_SESSION_04_READINESS_PHRASES } from './episode_01_session_04_phrases_word_first_v1';
import { EPISODE_01_SESSION_06_WORD_FIRST_PHRASES } from './episode_01_session_06_phrases_word_first_v1';
import { EPISODE_01_SESSION_09_VOCABULARY_V1 } from './episode_01_session_09_vocabulary_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];
type Copy = Readonly<{ meaning: string; explanation: string }>;

const COPY: Readonly<Record<string, Readonly<Record<Locale, Copy>>>> = {
  'You are here': {
    ru: { meaning: 'Ты здесь / Вы здесь', explanation: 'Так прямо сообщают собеседнику его место. You называет адресата, are связывает его с here; ни одно слово нельзя убрать.' },
    uk: { meaning: 'Ти тут / Ви тут', explanation: 'Так прямо повідомляють співрозмовнику його місце. You називає адресата, are поєднує його з here; жодне слово не можна прибрати.' },
    es: { meaning: 'Estás aquí / Está aquí / Están aquí', explanation: 'La frase sitúa directamente al interlocutor. You lo nombra y are lo enlaza con here; ninguna pieza desaparece.' },
    'pt-BR': { meaning: 'Você está aqui / Vocês estão aqui', explanation: 'A frase localiza diretamente o interlocutor. You o nomeia e are o liga a here; nenhuma parte desaparece.' },
    vi: { meaning: 'Bạn ở đây / Các bạn ở đây', explanation: 'Câu nói trực tiếp nơi của người nghe. You chỉ người nghe, are nối với here và không được bỏ phần nào.' },
    id: { meaning: 'Kamu di sini / Anda di sini / Kalian di sini', explanation: 'Kalimat menyatakan tempat lawan bicara. You menunjuknya dan are menghubungkannya dengan here; semua bagian diperlukan.' },
    tr: { meaning: 'Buradasın / Buradasınız', explanation: 'Cümle muhatabın yerini doğrudan bildirir. You muhatabı gösterir, are onu here ile bağlar; hiçbir parça atılmaz.' },
    pl: { meaning: 'Jesteś tutaj / Jesteście tutaj', explanation: 'Zdanie bezpośrednio podaje miejsce rozmówcy. You wskazuje adresata, a are łączy go z here; żadna część nie znika.' },
  },
  'You are ready': {
    ru: { meaning: 'Ты готов / Вы готовы', explanation: 'Ready описывает готовность именно собеседника, поэтому начало меняется на you are. Связка are обязательна: You are ready — утверждение, а не вопрос.' },
    uk: { meaning: 'Ти готовий / Ви готові', explanation: 'Ready описує готовність саме співрозмовника, тому початок змінюється на you are. Зв’язка are обов’язкова: You are ready — твердження, а не питання.' },
    es: { meaning: 'Estás listo / Está listo / Están listos', explanation: 'Ready describe la disponibilidad del interlocutor, por eso la base es you are. Are es obligatorio y You are ready sigue siendo una afirmación.' },
    'pt-BR': { meaning: 'Você está pronto / Vocês estão prontos', explanation: 'Ready descreve a prontidão do interlocutor, então a base é you are. Are é obrigatório, e You are ready continua sendo afirmação.' },
    vi: { meaning: 'Bạn đã sẵn sàng / Các bạn đã sẵn sàng', explanation: 'Ready mô tả sự sẵn sàng của người nghe nên phần đầu là you are. Are bắt buộc và You are ready vẫn là câu khẳng định.' },
    id: { meaning: 'Kamu siap / Anda siap / Kalian siap', explanation: 'Ready menggambarkan kesiapan lawan bicara, sehingga dasarnya you are. Are wajib dan You are ready tetap sebuah pernyataan.' },
    tr: { meaning: 'Hazırsın / Hazırsınız', explanation: 'Ready muhatabın hazır oluşunu anlatır; bu yüzden temel you are olur. Are zorunludur ve You are ready bir bildirimdir.' },
    pl: { meaning: 'Jesteś gotowy / Jesteście gotowi', explanation: 'Ready opisuje gotowość rozmówcy, dlatego podstawą jest you are. Are jest obowiązkowe, a You are ready pozostaje twierdzeniem.' },
  },
  'You are happy': {
    ru: { meaning: 'Ты счастлив / Вы счастливы', explanation: 'Happy называет радостное состояние человека перед нами. You are переносит описание на собеседника и сохраняет правильное согласование вместо I am.' },
    uk: { meaning: 'Ти щасливий / Ви щасливі', explanation: 'Happy називає радісний стан людини перед нами. You are переносить опис на співрозмовника й зберігає правильне узгодження замість I am.' },
    es: { meaning: 'Estás feliz / Está feliz / Están felices', explanation: 'Happy nombra el estado alegre del interlocutor. You are dirige la descripción a esa persona y mantiene la concordancia correcta.' },
    'pt-BR': { meaning: 'Você está feliz / Vocês estão felizes', explanation: 'Happy nomeia o estado alegre do interlocutor. You are dirige a descrição a essa pessoa e mantém a concordância correta.' },
    vi: { meaning: 'Bạn vui / Các bạn vui', explanation: 'Happy gọi tên trạng thái vui của người nghe. You are hướng mô tả tới người đó và giữ dạng phù hợp.' },
    id: { meaning: 'Kamu bahagia / Anda bahagia / Kalian bahagia', explanation: 'Happy menyebut keadaan gembira lawan bicara. You are mengarahkan deskripsi kepadanya dengan bentuk yang sesuai.' },
    tr: { meaning: 'Mutlusun / Mutlusunuz', explanation: 'Happy muhatabın sevinçli durumunu adlandırır. You are açıklamayı karşıdaki kişiye yöneltir ve doğru uyumu korur.' },
    pl: { meaning: 'Jesteś szczęśliwy / Jesteście szczęśliwi', explanation: 'Happy nazywa radosny stan rozmówcy. You are kieruje opis do tej osoby i zachowuje właściwą zgodność.' },
  },
  'You are sad': {
    ru: { meaning: 'Ты грустишь / Вы грустите', explanation: 'Sad сообщает о грустном состоянии собеседника, не говорящего. Поэтому перед ним стоит You are, а знакомое I am здесь изменило бы человека.' },
    uk: { meaning: 'Ти сумний / Ви сумні', explanation: 'Sad повідомляє про сумний стан співрозмовника, а не мовця. Тому перед ним стоїть You are; I am змінило б людину.' },
    es: { meaning: 'Estás triste / Está triste / Están tristes', explanation: 'Sad describe la tristeza del interlocutor, no del hablante. Por eso aparece You are; I am cambiaría la persona.' },
    'pt-BR': { meaning: 'Você está triste / Vocês estão tristes', explanation: 'Sad descreve a tristeza do interlocutor, não de quem fala. Por isso vem You are; I am mudaria a pessoa.' },
    vi: { meaning: 'Bạn buồn / Các bạn buồn', explanation: 'Sad mô tả nỗi buồn của người nghe chứ không phải người nói. Vì thế cần You are; I am sẽ đổi người.' },
    id: { meaning: 'Kamu sedih / Anda sedih / Kalian sedih', explanation: 'Sad menggambarkan kesedihan lawan bicara, bukan penutur. Karena itu digunakan You are; I am akan mengubah orang.' },
    tr: { meaning: 'Üzgünsün / Üzgünsünüz', explanation: 'Sad konuşanın değil, muhatabın üzgün durumunu anlatır. Bu nedenle You are gelir; I am kişiyi değiştirir.' },
    pl: { meaning: 'Jesteś smutny / Jesteście smutni', explanation: 'Sad opisuje smutek rozmówcy, nie mówiącego. Dlatego stoi przed nim You are; I am zmieniłoby osobę.' },
  },
  'You are tired': {
    ru: { meaning: 'Ты устал / Вы устали', explanation: 'Tired описывает нехватку сил у собеседника. Начало You are показывает, что речь идёт о нём; am после you было бы ошибкой согласования.' },
    uk: { meaning: 'Ти втомився / Ви втомилися', explanation: 'Tired описує брак сил у співрозмовника. Початок You are показує, що йдеться про нього; am після you було б помилкою узгодження.' },
    es: { meaning: 'Estás cansado / Está cansado / Están cansados', explanation: 'Tired describe el cansancio del interlocutor. You are muestra de quién se habla; am después de you rompería la concordancia.' },
    'pt-BR': { meaning: 'Você está cansado / Vocês estão cansados', explanation: 'Tired descreve o cansaço do interlocutor. You are mostra de quem se fala; am depois de you quebraria a concordância.' },
    vi: { meaning: 'Bạn mệt / Các bạn mệt', explanation: 'Tired mô tả sự mệt của người nghe. You are cho biết đang nói về ai; am sau you sẽ sai dạng.' },
    id: { meaning: 'Kamu lelah / Anda lelah / Kalian lelah', explanation: 'Tired menggambarkan kelelahan lawan bicara. You are menunjukkan orangnya; am setelah you tidak sesuai.' },
    tr: { meaning: 'Yorgunsun / Yorgunsunuz', explanation: 'Tired muhatabın yorgunluğunu anlatır. You are kimin anlatıldığını gösterir; you sonrasında am uyumsuz olur.' },
    pl: { meaning: 'Jesteś zmęczony / Jesteście zmęczeni', explanation: 'Tired opisuje zmęczenie rozmówcy. You are pokazuje, o kim mowa; am po you łamałoby zgodność.' },
  },
  'You are fine': {
    ru: { meaning: 'У тебя всё хорошо / У вас всё хорошо', explanation: 'Fine даёт спокойную положительную оценку состояния собеседника. You are сохраняет адресата и связку, поэтому фраза звучит цельно и грамматически полно.' },
    uk: { meaning: 'У тебе все гаразд / У вас усе гаразд', explanation: 'Fine дає спокійну позитивну оцінку стану співрозмовника. You are зберігає адресата й зв’язку, тому фраза повна.' },
    es: { meaning: 'Estás bien / Está bien / Están bien', explanation: 'Fine ofrece una valoración positiva y tranquila del interlocutor. You are conserva al destinatario y el enlace, dejando una frase completa.' },
    'pt-BR': { meaning: 'Você está bem / Vocês estão bem', explanation: 'Fine oferece uma avaliação positiva e tranquila do interlocutor. You are mantém o destinatário e a ligação numa frase completa.' },
    vi: { meaning: 'Bạn ổn / Các bạn ổn', explanation: 'Fine đánh giá tích cực và bình tĩnh trạng thái người nghe. You are giữ người nghe và từ nối để câu hoàn chỉnh.' },
    id: { meaning: 'Kamu baik-baik saja / Anda baik-baik saja', explanation: 'Fine memberi penilaian tenang dan positif tentang lawan bicara. You are mempertahankan orang dan penghubung dalam kalimat lengkap.' },
    tr: { meaning: 'İyisin / İyisiniz', explanation: 'Fine muhatabın durumuna sakin ve olumlu bir değerlendirme verir. You are kişiyi ve bağı koruyarak tam cümle kurar.' },
    pl: { meaning: 'Wszystko u ciebie dobrze / Wszystko u państwa dobrze', explanation: 'Fine spokojnie i pozytywnie ocenia stan rozmówcy. You are zachowuje adresata i łącznik, tworząc pełne zdanie.' },
  },
  'You are busy': {
    ru: { meaning: 'Ты занят / Вы заняты', explanation: 'Busy говорит, что собеседник сейчас занят делами. You are направляет состояние к нему; are нельзя заменить коротким артиклем a.' },
    uk: { meaning: 'Ти зайнятий / Ви зайняті', explanation: 'Busy говорить, що співрозмовник зараз зайнятий справами. You are спрямовує стан до нього; are не можна замінити артиклем a.' },
    es: { meaning: 'Estás ocupado / Está ocupado / Están ocupados', explanation: 'Busy indica que el interlocutor está ocupado ahora. You are dirige el estado hacia esa persona; a no puede sustituir a are.' },
    'pt-BR': { meaning: 'Você está ocupado / Vocês estão ocupados', explanation: 'Busy indica que o interlocutor está ocupado agora. You are dirige o estado a essa pessoa; a não substitui are.' },
    vi: { meaning: 'Bạn bận / Các bạn bận', explanation: 'Busy nói rằng người nghe đang bận. You are hướng trạng thái tới người đó; a không thể thay are.' },
    id: { meaning: 'Kamu sibuk / Anda sibuk / Kalian sibuk', explanation: 'Busy menyatakan lawan bicara sedang sibuk. You are mengarahkan keadaan kepadanya; a tidak dapat menggantikan are.' },
    tr: { meaning: 'Meşgulsün / Meşgulsünüz', explanation: 'Busy muhatabın şu anda meşgul olduğunu söyler. You are durumu ona yöneltir; a artikeli are yerine geçemez.' },
    pl: { meaning: 'Jesteś zajęty / Jesteście zajęci', explanation: 'Busy mówi, że rozmówca jest teraz zajęty. You are kieruje stan do tej osoby; rodzajnik a nie zastępuje are.' },
  },
  'You are a teacher': {
    ru: { meaning: 'Ты учитель / Вы учитель', explanation: 'Здесь собеседнику приписывается профессия, поэтому после You are сохраняется артикль a перед teacher. Are связывает человека с ролью, а a оформляет одно название профессии.' },
    uk: { meaning: 'Ти вчитель / Ви вчитель', explanation: 'Тут співрозмовнику приписують професію, тому після You are зберігається артикль a перед teacher. Are поєднує людину з роллю, а a оформлює назву професії.' },
    es: { meaning: 'Eres profesor / Es profesor / Son profesores', explanation: 'La frase atribuye una profesión al interlocutor, por eso a permanece antes de teacher. Are une a la persona con la función y a presenta una profesión singular.' },
    'pt-BR': { meaning: 'Você é professor / Vocês são professores', explanation: 'A frase atribui profissão ao interlocutor, por isso a permanece antes de teacher. Are liga a pessoa à função, e a apresenta profissão singular.' },
    vi: { meaning: 'Bạn là giáo viên / Các bạn là giáo viên', explanation: 'Câu gán nghề cho người nghe nên a vẫn đứng trước teacher. Are nối người với vai trò, còn a đánh dấu một tên nghề.' },
    id: { meaning: 'Kamu seorang guru / Anda seorang guru', explanation: 'Kalimat memberi profesi kepada lawan bicara, sehingga a tetap sebelum teacher. Are menghubungkan orang dengan peran dan a menandai profesi tunggal.' },
    tr: { meaning: 'Öğretmensin / Öğretmensiniz', explanation: 'Cümle muhataba meslek bildirir; bu yüzden teacher önünde a kalır. Are kişiyi role bağlar, a tekil meslek adını kurar.' },
    pl: { meaning: 'Jesteś nauczycielem / Jesteście nauczycielami', explanation: 'Zdanie przypisuje rozmówcy zawód, dlatego a zostaje przed teacher. Are łączy osobę z rolą, a a wprowadza jeden zawód.' },
  },
  'You are an artist': {
    ru: { meaning: 'Ты художник / Вы художник; Ты артист / Вы артист', explanation: 'Artist начинается гласным звуком, поэтому знакомый an остаётся и после You are. Are согласуется с you, а an подготавливает плавный переход к названию профессии.' },
    uk: { meaning: 'Ти художник / Ви художник; Ти артист / Ви артист', explanation: 'Artist починається голосним звуком, тому знайомий an лишається й після You are. Are узгоджується з you, а an готує перехід до професії.' },
    es: { meaning: 'Eres artista / Es artista / Son artistas', explanation: 'Artist empieza con sonido vocálico, así que an permanece después de You are. Are concuerda con you y an prepara la transición a la profesión.' },
    'pt-BR': { meaning: 'Você é artista / Vocês são artistas', explanation: 'Artist começa com som vocálico, então an permanece depois de You are. Are concorda com you e an prepara a passagem para a profissão.' },
    vi: { meaning: 'Bạn là nghệ sĩ / Các bạn là nghệ sĩ', explanation: 'Artist bắt đầu bằng âm nguyên âm nên an vẫn đứng sau You are. Are phù hợp với you, còn an nối mượt tới tên nghề.' },
    id: { meaning: 'Kamu seorang seniman / Anda seorang seniman', explanation: 'Artist dimulai bunyi vokal, sehingga an tetap setelah You are. Are sesuai dengan you dan an menyiapkan perpindahan ke profesi.' },
    tr: { meaning: 'Sanatçısın / Sanatçısınız', explanation: 'Artist ünlü sesle başlar; bu yüzden You are sonrasında an kalır. Are, you ile uyumludur; an meslek adına akıcı geçiş hazırlar.' },
    pl: { meaning: 'Jesteś artystą / Jesteście artystami', explanation: 'Artist zaczyna się samogłoską, więc an pozostaje po You are. Are zgadza się z you, a an przygotowuje płynne przejście do zawodu.' },
  },
};

function vocab(target: 'you' | 'are') {
  const entry = EPISODE_01_SESSION_09_VOCABULARY_V1.find((item) => item.target === target);
  if (!entry) throw new Error(`session_09_vocabulary_missing:${target}`);
  return entry;
}
function rootVocabWord(target: 'you' | 'are'): EpisodeSourceWord {
  const entry = vocab(target);
  return { correct: target, category: target === 'you' ? 'personal_pronoun' : 'copula_be', distractors: entry.contacts.build_form.distractors.map((trap) => ({ value: trap.value, reasonCode: `${trap.trapType}:${target}:${trap.value}`, trapType: trap.trapType, why: trap.feedback.ru ?? '' })) };
}
function localizedVocabWord(target: 'you' | 'are', locale: Locale) {
  const entry = vocab(target);
  return { correct: target, prompt: target === 'you' ? entry.contacts.retrieve_meaning.guidance[locale]! : entry.contacts.build_form.guidance[locale]!, distractors: entry.contacts.build_form.distractors.map((trap) => ({ value: trap.value, reason: trap.feedback[locale] ?? '', trapType: trap.trapType })) };
}

const TAIL_MODELS: Readonly<Record<string, EpisodeSourcePhrase>> = Object.freeze({
  here: EPISODE_01_SESSION_01_WORD_FIRST_PHRASES[0]!, ready: EPISODE_01_SESSION_01_WORD_FIRST_PHRASES[1]!,
  happy: EPISODE_01_SESSION_03_WORD_FIRST_PHRASES[0]!, sad: EPISODE_01_SESSION_03_WORD_FIRST_PHRASES[1]!,
  tired: EPISODE_01_SESSION_03_WORD_FIRST_PHRASES[2]!, fine: EPISODE_01_SESSION_03_WORD_FIRST_PHRASES[3]!,
  busy: EPISODE_01_SESSION_04_READINESS_PHRASES[5]!, teacher: EPISODE_01_SESSION_06_WORD_FIRST_PHRASES[0]!,
  artist: EPISODE_01_SESSION_06_WORD_FIRST_PHRASES[2]!,
});

function phrase(english: keyof typeof COPY): EpisodeSourcePhrase {
  const tailKey = english.split(' ').at(-1)!;
  const tailModel = TAIL_MODELS[tailKey]!;
  const profession = tailKey === 'teacher' || tailKey === 'artist';
  const rootTail = tailModel.words.slice(profession ? 2 : -1);
  const localizedDetails = Object.fromEntries(LOCALES.map((locale) => {
    const tail = tailModel.localizedDetails![locale]!.words.slice(profession ? 2 : -1);
    const words = [localizedVocabWord('you', locale), localizedVocabWord('are', locale), ...tail];
    return [locale, { ...COPY[english][locale], words, distractors: words.flatMap((word) => word.distractors) } satisfies EpisodeSourcePhraseLocalizedDetails];
  })) as NonNullable<EpisodeSourcePhrase['localizedDetails']>;
  return Object.freeze({
    id: `e01-s09-${english.toLocaleLowerCase('en').replace(/[^a-z]+/gu, '-')}`,
    english, russian: COPY[english].ru.meaning, explanation: COPY[english].ru.explanation,
    words: [rootVocabWord('you'), rootVocabWord('are'), ...rootTail], localizedDetails,
    features: [...new Set(['second_person', 'copula_be', ...tailModel.features.filter((feature) => feature !== 'first_person_singular')])],
  });
}

export const EPISODE_01_SESSION_09_WORD_FIRST_PHRASES: readonly EpisodeSourcePhrase[] = Object.freeze([
  phrase('You are here'), phrase('You are ready'), phrase('You are happy'), phrase('You are sad'), phrase('You are tired'),
  phrase('You are fine'), phrase('You are busy'), phrase('You are a teacher'), phrase('You are an artist'),
]);
