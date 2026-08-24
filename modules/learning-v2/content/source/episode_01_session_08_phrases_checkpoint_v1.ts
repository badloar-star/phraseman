import type { EpisodeSourcePhrase, EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import { EPISODE_01_SESSION_01_WORD_FIRST_PHRASES } from './episode_01_session_01_phrases_word_first_v1';
import { EPISODE_01_SESSION_02_WORD_FIRST_PHRASES } from './episode_01_session_02_phrases_word_first_v1';
import { EPISODE_01_SESSION_03_WORD_FIRST_PHRASES } from './episode_01_session_03_phrases_word_first_v1';
import { EPISODE_01_SESSION_04_WORD_FIRST_PHRASES } from './episode_01_session_04_phrases_word_first_v1';
import { EPISODE_01_SESSION_06_WORD_FIRST_PHRASES } from './episode_01_session_06_phrases_word_first_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];
type Copy = Readonly<{ meaning: string; explanation: string }>;

const KNOWN = [
  ...EPISODE_01_SESSION_01_WORD_FIRST_PHRASES,
  ...EPISODE_01_SESSION_02_WORD_FIRST_PHRASES,
  ...EPISODE_01_SESSION_03_WORD_FIRST_PHRASES,
  ...EPISODE_01_SESSION_04_WORD_FIRST_PHRASES,
  ...EPISODE_01_SESSION_06_WORD_FIRST_PHRASES,
] as const;

const NOVEL_COPY: Readonly<Record<string, Readonly<Record<Locale, Copy>>>> = {
  "I'm not happy": {
    ru: { meaning: 'Я не рад / не рада', explanation: 'Короткое I’m сохраняет связку am, а not сразу после неё отрицает состояние happy. Порядок I’m not happy нельзя переставлять по русской фразе.' },
    uk: { meaning: 'Я не радий / не рада', explanation: 'Коротке I’m зберігає зв’язку am, а not одразу після неї заперечує стан happy. Порядок I’m not happy не можна міняти за українською фразою.' },
    es: { meaning: 'No estoy feliz', explanation: 'I’m conserva am dentro de la contracción y not niega directamente happy. El orden I’m not happy se mantiene aunque el español empiece por la negación.' },
    'pt-BR': { meaning: 'Não estou feliz', explanation: 'I’m preserva am dentro da contração, e not nega diretamente happy. A ordem I’m not happy permanece mesmo que o português comece pela negação.' },
    vi: { meaning: 'Tôi không vui', explanation: 'I’m vẫn chứa am, còn not đứng ngay sau để phủ định happy. Trật tự I’m not happy không đổi theo cách tiếng Việt đặt từ phủ định.' },
    id: { meaning: 'Saya tidak bahagia', explanation: 'I’m tetap menyimpan am dan not sesudahnya menyangkal happy. Urutan I’m not happy tidak dipindahkan mengikuti susunan bahasa Indonesia.' },
    tr: { meaning: 'Mutlu değilim', explanation: 'I’m kısaltmanın içinde am bağını korur; ardından gelen not, happy durumunu olumsuz yapar. Türkçe son ek kullansa da I’m not happy sırası değişmez.' },
    pl: { meaning: 'Nie jestem szczęśliwy / szczęśliwa', explanation: 'I’m zachowuje am w skrócie, a stojące po nim not przeczy stanowi happy. Szyk I’m not happy pozostaje angielski mimo polskiego początku z nie.' },
  },
  'I am not tired': {
    ru: { meaning: 'Я не устал / не устала', explanation: 'Полная связка I am остаётся перед отрицанием, поэтому not ставится после am. Tired завершает сообщение о состоянии: I am not tired.' },
    uk: { meaning: 'Я не втомився / не втомилася', explanation: 'Повна зв’язка I am лишається перед запереченням, тому not стоїть після am. Tired завершує повідомлення про стан: I am not tired.' },
    es: { meaning: 'No estoy cansado / cansada', explanation: 'El enlace completo I am va antes de la negación, por eso not aparece después de am. Tired cierra el estado en I am not tired.' },
    'pt-BR': { meaning: 'Não estou cansado / cansada', explanation: 'A ligação completa I am vem antes da negação, por isso not fica depois de am. Tired completa o estado em I am not tired.' },
    vi: { meaning: 'Tôi không mệt', explanation: 'Cụm nối đầy đủ I am đứng trước phần phủ định nên not phải theo sau am. Tired khép lại trạng thái trong I am not tired.' },
    id: { meaning: 'Saya tidak lelah', explanation: 'Penghubung lengkap I am mendahului negasi, sehingga not berada setelah am. Tired menutup keterangan keadaan dalam I am not tired.' },
    tr: { meaning: 'Yorgun değilim', explanation: 'Tam I am bağı olumsuzluktan önce gelir; bu nedenle not, am sonrasında durur. Tired durumu tamamlar: I am not tired.' },
    pl: { meaning: 'Nie jestem zmęczony / zmęczona', explanation: 'Pełne I am stoi przed przeczeniem, dlatego not pojawia się po am. Tired zamyka opis stanu w I am not tired.' },
  },
  "I'm not fine": {
    ru: { meaning: 'У меня не всё хорошо', explanation: 'I’m — цельная короткая связка, а not отрицает следующую оценку fine. Фраза I’m not fine сообщает о состоянии без второго am.' },
    uk: { meaning: 'У мене не все гаразд', explanation: 'I’m — цілісна коротка зв’язка, а not заперечує наступну оцінку fine. Фраза I’m not fine повідомляє про стан без другого am.' },
    es: { meaning: 'No estoy bien', explanation: 'I’m funciona como enlace corto completo y not niega la valoración fine. I’m not fine expresa el estado sin añadir otro am.' },
    'pt-BR': { meaning: 'Não estou bem', explanation: 'I’m funciona como ligação curta completa, e not nega a avaliação fine. I’m not fine expressa o estado sem acrescentar outro am.' },
    vi: { meaning: 'Tôi không ổn', explanation: 'I’m là cụm nối ngắn hoàn chỉnh, còn not phủ định đánh giá fine. I’m not fine nói về trạng thái mà không thêm một am nữa.' },
    id: { meaning: 'Saya sedang tidak baik', explanation: 'I’m adalah penghubung singkat yang lengkap dan not menyangkal fine. I’m not fine menyatakan keadaan tanpa menambahkan am kedua.' },
    tr: { meaning: 'İyi değilim', explanation: 'I’m tek başına tam bir kısa bağdır; not ardından gelen fine değerlendirmesini olumsuz yapar. I’m not fine içinde ikinci bir am kullanılmaz.' },
    pl: { meaning: 'Nie czuję się dobrze', explanation: 'I’m jest pełnym krótkim łącznikiem, a not przeczy ocenie fine. I’m not fine opisuje stan bez dodawania drugiego am.' },
  },
  'I am not busy': {
    ru: { meaning: 'Я не занят / не занята', explanation: 'В полной форме отрицание встаёт после связки: I am not. Busy остаётся состоянием, которое отрицается, поэтому порядок I am not busy фиксирован.' },
    uk: { meaning: 'Я не зайнятий / не зайнята', explanation: 'У повній формі заперечення стоїть після зв’язки: I am not. Busy лишається станом, який заперечують, тому порядок I am not busy фіксований.' },
    es: { meaning: 'No estoy ocupado / ocupada', explanation: 'En la forma completa la negación sigue al enlace: I am not. Busy es el estado negado, por eso el orden I am not busy queda fijo.' },
    'pt-BR': { meaning: 'Não estou ocupado / ocupada', explanation: 'Na forma completa, a negação segue a ligação: I am not. Busy é o estado negado, então a ordem I am not busy permanece fixa.' },
    vi: { meaning: 'Tôi không bận', explanation: 'Ở dạng đầy đủ, phủ định theo sau từ nối: I am not. Busy là trạng thái bị phủ định nên thứ tự I am not busy phải được giữ nguyên.' },
    id: { meaning: 'Saya tidak sibuk', explanation: 'Dalam bentuk lengkap, negasi mengikuti penghubung: I am not. Busy adalah keadaan yang disangkal, sehingga urutan I am not busy tetap.' },
    tr: { meaning: 'Meşgul değilim', explanation: 'Tam biçimde olumsuzluk bağdan sonra gelir: I am not. Busy olumsuzlanan durumdur; bu nedenle I am not busy sırası sabittir.' },
    pl: { meaning: 'Nie jestem zajęty / zajęta', explanation: 'W pełnej formie przeczenie stoi po łączniku: I am not. Busy jest negowanym stanem, dlatego szyk I am not busy pozostaje stały.' },
  },
  "I'm not here": {
    ru: { meaning: 'Меня здесь нет', explanation: 'I’m уже содержит I am, поэтому not ставится сразу после сокращения. Here называет место, которое отрицается: I’m not here.' },
    uk: { meaning: 'Мене тут немає', explanation: 'I’m уже містить I am, тому not стоїть одразу після скорочення. Here називає місце, яке заперечують: I’m not here.' },
    es: { meaning: 'No estoy aquí', explanation: 'I’m ya contiene I am, así que not va justo después de la contracción. Here nombra el lugar negado en I’m not here.' },
    'pt-BR': { meaning: 'Não estou aqui', explanation: 'I’m já contém I am, portanto not vem logo após a contração. Here nomeia o lugar negado em I’m not here.' },
    vi: { meaning: 'Tôi không ở đây', explanation: 'I’m đã chứa I am nên not đứng ngay sau dạng rút gọn. Here chỉ nơi bị phủ định trong I’m not here.' },
    id: { meaning: 'Saya tidak di sini', explanation: 'I’m sudah memuat I am, sehingga not berada tepat setelah kontraksi. Here menyebut tempat yang disangkal dalam I’m not here.' },
    tr: { meaning: 'Burada değilim', explanation: 'I’m zaten I am bağını içerir; bu yüzden not kısaltmanın hemen ardından gelir. Here, I’m not here içinde olumsuzlanan yeri bildirir.' },
    pl: { meaning: 'Nie ma mnie tutaj', explanation: 'I’m zawiera już I am, więc not stoi zaraz po skrócie. Here nazywa negowane miejsce w I’m not here.' },
  },
  "I'm not ready": {
    ru: { meaning: 'Я не готов / не готова', explanation: 'Короткая связка I’m остаётся перед not, а ready завершает отрицательное сообщение о готовности. В I’m not ready нельзя вернуть второй am.' },
    uk: { meaning: 'Я не готовий / не готова', explanation: 'Коротка зв’язка I’m лишається перед not, а ready завершує заперечне повідомлення про готовність. В I’m not ready не можна повертати друге am.' },
    es: { meaning: 'No estoy listo / lista', explanation: 'El enlace corto I’m queda antes de not y ready completa la negación de disponibilidad. I’m not ready no admite un segundo am.' },
    'pt-BR': { meaning: 'Não estou pronto / pronta', explanation: 'A ligação curta I’m fica antes de not, e ready completa a negação de prontidão. I’m not ready não recebe um segundo am.' },
    vi: { meaning: 'Tôi chưa sẵn sàng', explanation: 'Cụm nối ngắn I’m đứng trước not, còn ready hoàn tất ý phủ định về sự sẵn sàng. I’m not ready không thêm am thứ hai.' },
    id: { meaning: 'Saya belum siap', explanation: 'Penghubung singkat I’m berada sebelum not dan ready melengkapi negasi kesiapan. I’m not ready tidak memakai am kedua.' },
    tr: { meaning: 'Hazır değilim', explanation: 'Kısa I’m bağı not önünde kalır; ready hazır olma durumunun olumsuzluğunu tamamlar. I’m not ready içine ikinci bir am eklenmez.' },
    pl: { meaning: 'Nie jestem gotowy / gotowa', explanation: 'Krótki łącznik I’m stoi przed not, a ready kończy przeczenie gotowości. W I’m not ready nie dodaje się drugiego am.' },
  },
};

function findKnown(english: string): EpisodeSourcePhrase {
  const phrase = KNOWN.find((entry) => entry.english === english);
  if (!phrase) throw new Error(`episode_01_session_08_known_phrase_missing:${english}`);
  return phrase;
}

function cloneKnown(english: string, index: number): EpisodeSourcePhrase {
  return Object.freeze({ ...findKnown(english), id: `e01-s08-check-${String(index + 1).padStart(2, '0')}` });
}

function composeNegative(english: keyof typeof NOVEL_COPY, index: number): EpisodeSourcePhrase {
  const contracted = english.startsWith("I'm");
  const state = english.split(' ').at(-1)!;
  const prefix = findKnown(contracted ? "I'm not busy" : 'I am not sad');
  const stateModel = findKnown(state === 'busy' ? "I'm busy" : `I am ${state}`);
  const rootWords = [...prefix.words.slice(0, -1), stateModel.words.at(-1)!];
  const localizedDetails = Object.fromEntries(LOCALES.map((locale) => {
    const prefixDetail = prefix.localizedDetails![locale]!;
    const stateDetail = stateModel.localizedDetails![locale]!;
    const words = [...prefixDetail.words.slice(0, -1), stateDetail.words.at(-1)!];
    return [locale, {
      ...NOVEL_COPY[english][locale],
      words,
      distractors: words.flatMap((word) => word.distractors),
    } satisfies EpisodeSourcePhraseLocalizedDetails];
  })) as NonNullable<EpisodeSourcePhrase['localizedDetails']>;
  return Object.freeze({
    id: `e01-s08-check-${String(index + 1).padStart(2, '0')}`,
    english,
    russian: NOVEL_COPY[english].ru.meaning,
    explanation: NOVEL_COPY[english].ru.explanation,
    words: rootWords,
    localizedDetails,
    features: [...new Set([...prefix.features, ...stateModel.features])],
  });
}

const ORDER = [
  'I am here', 'I am ready', 'I am not sad',
  "I'm not happy", 'I am not tired', "I'm not fine", 'I am not busy', "I'm not here", "I'm not ready",
  'I am a teacher', "I'm an artist", 'I am happy', "I'm tired", 'I am fine', "I'm busy",
] as const;

export const EPISODE_01_SESSION_08_CHECKPOINT_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(ORDER.map((english, index) =>
    Object.hasOwn(NOVEL_COPY, english) ? composeNegative(english as keyof typeof NOVEL_COPY, index) : cloneKnown(english, index),
  ));
