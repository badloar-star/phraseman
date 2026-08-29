import type { EpisodeSourcePhrase, EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import { EPISODE_01_SESSION_01_WORD_FIRST_PHRASES } from './episode_01_session_01_phrases_word_first_v1';
import { EPISODE_01_SESSION_02_MODE_NATIVE_PHRASES } from './episode_01_session_02_affirmative_phrases_v1';
import { EPISODE_01_SESSION_04_STATE_DISTRACTORS } from './episode_01_session_04_vocabulary_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];
type State = keyof typeof EPISODE_01_SESSION_04_STATE_DISTRACTORS;
type StateCopy = Readonly<{ meaning: string; full: string; short: string; prompt: string }>;

const COPY: Readonly<Record<State, Readonly<Record<Locale, StateCopy>>>> = {
  set: {
    ru: { meaning: 'Я готов', full: 'Так говорят, когда всё нужное уже подготовлено и можно начинать. I am сохраняет полный знакомый каркас, а set даёт точный зелёный свет.', short: 'Так же сообщают о полной готовности, но живее и короче. I’m уже содержит I am, а set завершает сообщение.', prompt: 'Выберите состояние «готов».' },
    uk: { meaning: 'Я готовий', full: 'Так говорять, коли все потрібне вже підготовлено й можна починати. I am зберігає повний знайомий каркас, а set дає точне зелене світло.', short: 'Так само повідомляють про повну готовність, але жвавіше й коротше. I’m уже містить I am, а set завершує повідомлення.', prompt: 'Оберіть стан «готовий».' },
    es: { meaning: 'Estoy listo', full: 'Se usa cuando todo lo necesario está preparado y se puede empezar. I am conserva la estructura completa conocida y set da la luz verde exacta.', short: 'Comunica la misma preparación de forma más breve y natural. I’m ya contiene I am y set completa el mensaje.', prompt: 'Elige el estado «listo».' },
    'pt-BR': { meaning: 'Estou pronto', full: 'Usa-se quando tudo o que era necessário está preparado e já dá para começar. I am mantém a estrutura completa conhecida, e set dá o sinal verde.', short: 'Comunica a mesma prontidão de forma mais curta e natural. I’m já contém I am, e set completa a mensagem.', prompt: 'Escolha o estado «pronto».' },
    vi: { meaning: 'Tôi sẵn sàng', full: 'Câu này dùng khi mọi thứ cần thiết đã chuẩn bị xong và có thể bắt đầu. I am giữ khung đầy đủ đã quen, còn set bật đèn xanh chính xác.', short: 'Câu này báo cùng trạng thái sẵn sàng nhưng ngắn và tự nhiên hơn. I’m đã chứa I am, còn set hoàn tất thông điệp.', prompt: 'Chọn trạng thái “sẵn sàng”.' },
    id: { meaning: 'Saya siap', full: 'Semua yang diperlukan sudah siap dan kegiatan bisa mulai. I am memakai bentuk lengkap; set memberi lampu hijau.', short: 'Kalimat ini menyampaikan kesiapan yang sama dengan lebih singkat dan alami. I’m sudah memuat I am, lalu set menyelesaikan pesan.', prompt: 'Pilih keadaan “siap”.' },
    tr: { meaning: 'Hazırım', full: 'Gereken her şey hazırlandığında ve başlanabildiğinde söylenir. I am bilinen tam kalıbı korur, set ise kesin yeşil ışığı verir.', short: 'Aynı hazır olma durumunu daha kısa ve doğal bildirir. I’m zaten I am içerir, set mesajı tamamlar.', prompt: '“Hazır” durumunu seçin.' },
    pl: { meaning: 'Jestem gotowy', full: 'Tak mówi się, gdy wszystko potrzebne przygotowane i można zaczynać. I am zachowuje znany pełny schemat, a set daje dokładne zielone światło.', short: 'Ten sam stan gotowości podaje krócej i naturalniej. I’m zawiera już I am, a set kończy komunikat.', prompt: 'Wybierz stan „gotowy”.' },
  },
  done: {
    ru: { meaning: 'Я закончил', full: 'Так сообщают, что дело завершено и галочку уже можно ставить. I am связывает говорящего с результатом, а done закрывает задачу.', short: 'Это короткое живое сообщение о завершении. I’m сохраняет I am внутри, а done говорит, что работа закончена.', prompt: 'Выберите состояние «закончил».' },
    uk: { meaning: 'Я закінчив', full: 'Так повідомляють, що справу завершено й позначку вже можна ставити. I am пов’язує мовця з результатом, а done закриває завдання.', short: 'Це коротке живе повідомлення про завершення. I’m зберігає I am усередині, а done каже, що роботу завершено.', prompt: 'Оберіть стан «закінчив».' },
    es: { meaning: 'He terminado', full: 'Se usa para comunicar que la tarea terminó y ya se puede marcar. I am enlaza al hablante con el resultado y done cierra la tarea.', short: 'Es un mensaje breve y natural de finalización. I’m conserva I am dentro y done indica que el trabajo terminó.', prompt: 'Elige el estado «terminado».' },
    'pt-BR': { meaning: 'Terminei', full: 'Usa-se para dizer que a tarefa acabou e já pode receber a marca. I am liga quem fala ao resultado, e done encerra a tarefa.', short: 'É uma mensagem curta e natural de conclusão. I’m mantém I am por dentro, e done diz que o trabalho terminou.', prompt: 'Escolha o estado «terminei».' },
    vi: { meaning: 'Tôi làm xong rồi', full: 'Câu này cho biết công việc đã hoàn tất và có thể đánh dấu. I am nối người nói với kết quả, còn done đóng nhiệm vụ lại.', short: 'Đây là thông báo hoàn tất ngắn và tự nhiên. I’m giữ I am bên trong, còn done báo công việc đã xong.', prompt: 'Chọn trạng thái “đã xong”.' },
    id: { meaning: 'Saya sudah selesai', full: 'Kalimat ini menyatakan tugas selesai dan sudah bisa dicentang. I am menghubungkan penutur dengan hasil, sedangkan done menutup tugas.', short: 'Ini pesan penyelesaian yang singkat dan alami. I’m menyimpan I am, lalu done menyatakan pekerjaan selesai.', prompt: 'Pilih keadaan “selesai”.' },
    tr: { meaning: 'Bitirdim', full: 'İşin tamamlandığını ve artık işaretlenebileceğini bildirir. I am konuşanı sonuca bağlar, done görevi kapatır.', short: 'Tamamlanmayı kısa ve doğal biçimde bildirir. I’m içinde I am korunur, done işin bittiğini söyler.', prompt: '“Bitirdim” durumunu seçin.' },
    pl: { meaning: 'Skończyłem', full: 'Tak informuje się, że zadanie skończone i można je zaznaczyć. I am łączy mówiącego z wynikiem, a done zamyka zadanie.', short: 'To krótki i naturalny komunikat o zakończeniu. I’m zachowuje I am, a done mówi, że praca skończona.', prompt: 'Wybierz stan „skończyłem”.' },
  },
  free: {
    ru: { meaning: 'Я свободен', full: 'Так говорят, когда в расписании есть время и можно откликнуться. I am называет состояние полностью, а free сообщает о доступности.', short: 'Так же сообщают о свободном времени, но короче. I’m сохраняет связь I am, а free оставляет расписание открытым.', prompt: 'Выберите состояние «свободен».' },
    uk: { meaning: 'Я вільний', full: 'Так говорять, коли в розкладі є час і можна відгукнутися. I am називає стан повністю, а free повідомляє про доступність.', short: 'Так само повідомляють про вільний час, але коротше. I’m зберігає зв’язок I am, а free лишає розклад відкритим.', prompt: 'Оберіть стан «вільний».' },
    es: { meaning: 'Estoy libre', full: 'Se usa cuando hay tiempo en la agenda y se puede responder. I am nombra el estado de forma completa y free comunica disponibilidad.', short: 'Comunica el mismo tiempo libre de forma más breve. I’m conserva el enlace I am y free deja la agenda abierta.', prompt: 'Elige el estado «libre».' },
    'pt-BR': { meaning: 'Estou livre', full: 'Usa-se quando há tempo na agenda e dá para responder. I am nomeia o estado por inteiro, e free comunica disponibilidade.', short: 'Comunica o mesmo tempo livre de forma mais curta. I’m preserva a ligação I am, e free deixa a agenda aberta.', prompt: 'Escolha o estado «livre».' },
    vi: { meaning: 'Tôi đang rảnh', full: 'Câu này dùng khi lịch có thời gian và người nói có thể đáp lại. I am nêu trạng thái đầy đủ, còn free báo sự rảnh rỗi.', short: 'Câu này báo cùng thời gian rảnh nhưng ngắn hơn. I’m giữ liên kết I am, còn free để lịch mở.', prompt: 'Chọn trạng thái “đang rảnh”.' },
    id: { meaning: 'Saya sedang luang', full: 'Kalimat ini dipakai saat jadwal memiliki waktu dan penutur bisa merespons. I am menyatakan keadaan lengkap, sedangkan free menyampaikan ketersediaan.', short: 'Kalimat ini menyatakan waktu luang yang sama dengan lebih singkat. I’m mempertahankan I am, dan free membiarkan jadwal terbuka.', prompt: 'Pilih keadaan “sedang luang”.' },
    tr: { meaning: 'Boşum', full: 'Takvimde zaman olduğunda ve yanıt verilebildiğinde söylenir. I am durumu tam adlandırır, free uygunluğu bildirir.', short: 'Aynı boş zamanı daha kısa bildirir. I’m, I am bağını korur; free takvimi açık bırakır.', prompt: '“Boş” durumunu seçin.' },
    pl: { meaning: 'Jestem wolny', full: 'Tak mówi się, gdy w kalendarzu jest czas i można odpowiedzieć. I am podaje pełny stan, a free komunikuje dostępność.', short: 'Ten sam wolny czas podaje krócej. I’m zachowuje połączenie I am, a free zostawia kalendarz otwarty.', prompt: 'Wybierz stan „wolny”.' },
  },
};

function knownPhrase(source: readonly EpisodeSourcePhrase[], english: string): EpisodeSourcePhrase {
  const phrase = source.find((entry) => entry.english === english);
  if (!phrase) throw new Error(`session_04_known_phrase_missing:${english}`);
  return phrase;
}
const FULL_BASE = knownPhrase(EPISODE_01_SESSION_01_WORD_FIRST_PHRASES, 'I am here');
const KNOWN_BASES = Object.freeze({
  here: FULL_BASE,
  ready: knownPhrase(EPISODE_01_SESSION_01_WORD_FIRST_PHRASES, 'I am ready'),
  happy: knownPhrase(EPISODE_01_SESSION_02_MODE_NATIVE_PHRASES, 'I am happy'),
});

const YOU_ARE_COPY: Readonly<Record<Locale, Readonly<{
  youPrompt: string; youI: string; youMe: string; youYour: string;
  arePrompt: string; areAm: string; areIs: string; areOur: string; rule: string;
}>>> = {
  ru: { youPrompt: 'Выберите английское «ты / вы».', youI: 'I называет говорящего; для собеседника нужно you.', youMe: 'Me означает «меня / мне»; собеседника называет правильная форма You.', youYour: 'Your означает «твой / ваш» и требует предмет после себя; здесь нужно you.', arePrompt: 'Выберите форму после you.', areAm: 'Am работает после I; после you нужна форма are.', areIs: 'Is работает после he, she или it; после you нужна are.', areOur: 'Our означает «наш» и не является формой глагола; после you ставится are.', rule: 'You называет собеседника, are соединяет его с состоянием.' },
  uk: { youPrompt: 'Оберіть англійське «ти / ви».', youI: 'I називає мовця; для співрозмовника потрібне you.', youMe: 'Me означає «мене / мені»; співрозмовника називає правильна форма You.', youYour: 'Your означає «твій / ваш» і потребує предмета після себе; тут потрібне you.', arePrompt: 'Оберіть форму після you.', areAm: 'Am працює після I; після you потрібна форма are.', areIs: 'Is працює після he, she або it; після you потрібна are.', areOur: 'Our означає «наш» і не є формою дієслова; після you ставиться are.', rule: 'You називає співрозмовника, are поєднує його зі станом.' },
  es: { youPrompt: 'Elige el «tú / usted» inglés.', youI: 'I nombra a quien habla; para la otra persona se usa you.', youMe: 'Me significa «me / a mí»; la forma correcta para el interlocutor es You.', youYour: 'Your significa «tu / su» y necesita un nombre después; aquí corresponde you.', arePrompt: 'Elige la forma que sigue a you.', areAm: 'Am acompaña a I; después de you corresponde are.', areIs: 'Is acompaña a he, she o it; después de you corresponde are.', areOur: 'Our significa «nuestro» y no es una forma verbal; después de you va are.', rule: 'You nombra al interlocutor y are lo une con un estado.' },
  'pt-BR': { youPrompt: 'Escolha o «você» inglês.', youI: 'I nomeia quem fala; para a outra pessoa usa-se you.', youMe: 'Me significa «me / mim»; a forma correta para o interlocutor é You.', youYour: 'Your significa «seu / sua» e precisa de um nome depois; aqui entra you.', arePrompt: 'Escolha a forma depois de you.', areAm: 'Am acompanha I; depois de you entra are.', areIs: 'Is acompanha he, she ou it; depois de you entra are.', areOur: 'Our significa «nosso» e não é forma verbal; depois de you entra are.', rule: 'You nomeia o interlocutor, e are o liga a um estado.' },
  vi: { youPrompt: 'Chọn đại từ tiếng Anh nghĩa là “bạn”.', youI: 'I chỉ người nói; để gọi người nghe cần you.', youMe: 'Me chỉ “tôi” ở vị trí nhận tác động; dạng đúng để gọi người nghe là You.', youYour: 'Your nghĩa là “của bạn” và cần danh từ theo sau; ở đây cần you.', arePrompt: 'Chọn dạng đứng sau you.', areAm: 'Am đi với I; sau you phải dùng are.', areIs: 'Is đi với he, she hoặc it; sau you phải dùng are.', areOur: 'Our nghĩa là “của chúng ta”, không phải dạng động từ; sau you dùng are.', rule: 'You gọi người nghe, còn are nối người đó với trạng thái.' },
  id: { youPrompt: 'Pilih kata Inggris untuk “kamu / Anda”.', youI: 'I menyebut penutur; untuk lawan bicara diperlukan you.', youMe: 'Me berarti “saya” sebagai penerima; bentuk tepat untuk lawan bicara adalah You.', youYour: 'Your berarti “milikmu” dan memerlukan kata benda setelahnya; di sini perlu you.', arePrompt: 'Pilih bentuk setelah you.', areAm: 'Am mengikuti I; setelah you diperlukan are.', areIs: 'Is mengikuti he, she, atau it; setelah you diperlukan are.', areOur: 'Our berarti “milik kita” dan bukan bentuk kata kerja; setelah you gunakan are.', rule: 'You menyebut lawan bicara, sedangkan are menghubungkannya dengan keadaan.' },
  tr: { youPrompt: 'İngilizce “sen / siz” biçimini seçin.', youI: 'I konuşanı adlandırır; karşıdaki kişi için you gerekir.', youMe: 'Me “beni / bana” demektir; karşıdaki kişi için doğru biçim You olur.', youYour: 'Your “senin / sizin” demektir ve ardından ad ister; burada you gerekir.', arePrompt: 'You sonrasındaki biçimi seçin.', areAm: 'Am, I ile kullanılır; you sonrasında are gerekir.', areIs: 'Is, he, she veya it ile kullanılır; you sonrasında are gerekir.', areOur: 'Our “bizim” demektir ve fiil biçimi değildir; you sonrasında are gelir.', rule: 'You karşıdaki kişiyi adlandırır, are onu durumla bağlar.' },
  pl: { youPrompt: 'Wybierz angielskie „ty / wy”.', youI: 'I nazywa mówiącego; dla rozmówcy potrzebne jest you.', youMe: 'Me znaczy „mnie / mi”; poprawną formą dla rozmówcy jest You.', youYour: 'Your znaczy „twój / wasz” i wymaga rzeczownika; tutaj potrzebne jest you.', arePrompt: 'Wybierz formę po you.', areAm: 'Am łączy się z I; po you potrzebne jest are.', areIs: 'Is łączy się z he, she albo it; po you potrzebne jest are.', areOur: 'Our znaczy „nasz” i nie jest formą czasownika; po you stawia się are.', rule: 'You nazywa rozmówcę, a are łączy go ze stanem.' },
};

const YOU_MEANING = Object.freeze({
  set: { ru: 'Вы готовы', uk: 'Ви готові', es: 'Estás listo', 'pt-BR': 'Você está pronto', vi: 'Bạn đã sẵn sàng', id: 'Kamu siap', tr: 'Hazırsın', pl: 'Jesteś gotowy' },
  done: { ru: 'Вы закончили', uk: 'Ви закінчили', es: 'Has terminado', 'pt-BR': 'Você terminou', vi: 'Bạn đã xong', id: 'Kamu sudah selesai', tr: 'Bitirdin', pl: 'Skończyłeś' },
  free: { ru: 'Вы свободны', uk: 'Ви вільні', es: 'Estás libre', 'pt-BR': 'Você está livre', vi: 'Bạn đang rảnh', id: 'Kamu sedang luang', tr: 'Boşsun', pl: 'Jesteś wolny' },
  here: { ru: 'Вы здесь', uk: 'Ви тут', es: 'Estás aquí', 'pt-BR': 'Você está aqui', vi: 'Bạn ở đây', id: 'Kamu di sini', tr: 'Buradasın', pl: 'Jesteś tutaj' },
  ready: { ru: 'Вы готовы', uk: 'Ви готові', es: 'Estás preparado', 'pt-BR': 'Você está preparado', vi: 'Bạn sẵn sàng', id: 'Kamu siap', tr: 'Hazırsın', pl: 'Jesteś gotowy' },
  happy: { ru: 'Вы счастливы', uk: 'Ви щасливі', es: 'Estás feliz', 'pt-BR': 'Você está feliz', vi: 'Bạn hạnh phúc', id: 'Kamu bahagia', tr: 'Mutlusun', pl: 'Jesteś szczęśliwy' },
} satisfies Readonly<Record<string, Readonly<Record<Locale, string>>>>);

const YOU_WORD: EpisodeSourcePhrase['words'][number] = { correct: 'You', category: 'second_person_pronoun', distractors: [
  { value: 'I', reasonCode: 'speaker_not_addressee', trapType: 'grammar', why: YOU_ARE_COPY.ru.youI },
  { value: 'me', reasonCode: 'object_not_subject', trapType: 'grammar', why: YOU_ARE_COPY.ru.youMe },
  { value: 'your', reasonCode: 'possessive_not_pronoun', trapType: 'grammar', why: YOU_ARE_COPY.ru.youYour },
] };
const ARE_WORD: EpisodeSourcePhrase['words'][number] = { correct: 'are', category: 'copula', distractors: [
  { value: 'am', reasonCode: 'first_person_agreement', trapType: 'grammar', why: YOU_ARE_COPY.ru.areAm },
  { value: 'is', reasonCode: 'third_person_agreement', trapType: 'grammar', why: YOU_ARE_COPY.ru.areIs },
  { value: 'our', reasonCode: 'possessive_sound_trap', trapType: 'phonetic', why: YOU_ARE_COPY.ru.areOur },
] };

function stateWord(state: State): EpisodeSourcePhrase['words'][number] {
  const copy = COPY[state].ru;
  return {
    correct: state,
    category: 'state_adjective',
    distractors: EPISODE_01_SESSION_04_STATE_DISTRACTORS[state].map((entry) => ({
      value: entry.value,
      reasonCode: entry.reasonCode,
      trapType: entry.trapType,
      why: entry.feedback.ru,
    })),
  };
}

type TargetState = State | keyof typeof KNOWN_BASES;

function lexicalWord(state: TargetState): EpisodeSourcePhrase['words'][number] {
  if (state in EPISODE_01_SESSION_04_STATE_DISTRACTORS) return stateWord(state as State);
  return KNOWN_BASES[state as keyof typeof KNOWN_BASES].words.at(-1)!;
}

function lexicalDetails(state: TargetState, locale: Locale): EpisodeSourcePhraseLocalizedDetails['words'][number] {
  if (state in EPISODE_01_SESSION_04_STATE_DISTRACTORS) {
    const item = state as State;
    return { correct: item, prompt: COPY[item][locale].prompt, distractors: EPISODE_01_SESSION_04_STATE_DISTRACTORS[item].map((entry) => ({ value: entry.value, reason: entry.feedback[locale]!, trapType: entry.trapType })) };
  }
  const detail = KNOWN_BASES[state as keyof typeof KNOWN_BASES].localizedDetails?.[locale]?.words.at(-1);
  if (!detail) throw new Error(`session_04_known_word_details_missing:${state}:${locale}`);
  return detail;
}

function details(state: TargetState): NonNullable<EpisodeSourcePhrase['localizedDetails']> {
  return Object.fromEntries(LOCALES.map((locale) => {
    const copy = YOU_ARE_COPY[locale];
    const you = { correct: 'You', prompt: copy.youPrompt, distractors: [{ value: 'I', reason: copy.youI, trapType: 'grammar' as const }, { value: 'me', reason: copy.youMe, trapType: 'grammar' as const }, { value: 'your', reason: copy.youYour, trapType: 'grammar' as const }] };
    const are = { correct: 'are', prompt: copy.arePrompt, distractors: [{ value: 'am', reason: copy.areAm, trapType: 'grammar' as const }, { value: 'is', reason: copy.areIs, trapType: 'grammar' as const }, { value: 'our', reason: copy.areOur, trapType: 'phonetic' as const }] };
    const words: EpisodeSourcePhraseLocalizedDetails['words'] = [you, are, lexicalDetails(state, locale)];
    return [locale, { meaning: YOU_MEANING[state][locale], explanation: `${copy.rule} You are ${state}.`, distractors: words.flatMap((word) => word.distractors), words } satisfies EpisodeSourcePhraseLocalizedDetails];
  })) as NonNullable<EpisodeSourcePhrase['localizedDetails']>;
}

function phrase(state: TargetState): EpisodeSourcePhrase {
  const english = `You are ${state}`;
  return { id: `e01-s04-you-are-${state}`, english, russian: YOU_MEANING[state].ru, explanation: `Так говорят о месте или состоянии собеседника. ${YOU_ARE_COPY.ru.rule} Точная форма: ${english}.`, words: [YOU_WORD, ARE_WORD, lexicalWord(state)], localizedDetails: details(state), features: ['copula_be', 'second_person', 'state_adjective'] };
}

export const EPISODE_01_SESSION_04_READINESS_PHRASES: readonly EpisodeSourcePhrase[] = Object.freeze([
  phrase('set'), phrase('done'), phrase('free'), phrase('here'), phrase('ready'), phrase('happy'),
]);
