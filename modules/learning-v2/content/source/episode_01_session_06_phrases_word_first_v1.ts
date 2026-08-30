import type { EpisodeSourcePhrase, EpisodeSourcePhraseLocalizedDetails, EpisodeSourceWord } from './episode_01_source_v1';
import { EPISODE_01_SESSION_01_WORD_FIRST_PHRASES } from './episode_01_session_01_phrases_word_first_v1';
import { EPISODE_01_SESSION_04_READINESS_PHRASES } from './episode_01_session_04_phrases_word_first_v1';
import { EPISODE_01_SESSION_06_VOCABULARY_V1 } from './episode_01_session_06_vocabulary_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];
type NovelTarget = 'a' | 'an' | 'teacher' | 'artist';
type Copy = Readonly<{ meaning: string; explanation: string }>;

const PHRASE_COPY: Readonly<Record<string, Readonly<Record<Locale, Copy>>>> = {
  'I am a teacher': {
    ru: { meaning: 'Я учитель / учительница', explanation: 'Так прямо называют свою профессию. Teacher начинается согласным /t/, поэтому перед ним стоит a; I am сохраняется в полной форме.' }, uk: { meaning: 'Я вчитель / учителька', explanation: 'Так прямо називають свою професію. Teacher починається приголосним /t/, тому перед ним стоїть a; I am зберігається в повній формі.' }, es: { meaning: 'Soy profesor / profesora', explanation: 'Así se nombra directamente la profesión. Teacher empieza por la consonante /t/, por eso lleva a; I am permanece completo.' }, 'pt-BR': { meaning: 'Sou professor / professora', explanation: 'Assim se nomeia diretamente a profissão. Teacher começa com a consoante /t/, por isso leva a; I am fica na forma completa.' }, vi: { meaning: 'Tôi là giáo viên', explanation: 'Câu này nói trực tiếp nghề của người nói. Teacher bắt đầu bằng phụ âm /t/ nên dùng a; I am giữ dạng đầy đủ.' }, id: { meaning: 'Saya seorang guru', explanation: 'Kalimat ini menyebut profesi secara langsung. Teacher dimulai konsonan /t/, sehingga memakai a; I am tetap dalam bentuk penuh.' }, tr: { meaning: 'Öğretmenim', explanation: 'Bu söz mesleği doğrudan bildirir. Teacher ünsüz /t/ ile başladığı için önünde a vardır; I am tam biçimde kalır.' }, pl: { meaning: 'Jestem nauczycielem / nauczycielką', explanation: 'Tak bezpośrednio nazywa się swój zawód. Teacher zaczyna się spółgłoską /t/, dlatego stoi przed nim a; I am pozostaje pełne.' },
  },
  "I'm a teacher": {
    ru: { meaning: 'Я учитель / учительница', explanation: 'Это та же профессия в разговорной короткой форме. I’m сохраняет I am, а согласный /t/ в teacher требует a.' }, uk: { meaning: 'Я вчитель / учителька', explanation: 'Це та сама професія в розмовній короткій формі. I’m зберігає I am, а приголосний /t/ у teacher вимагає a.' }, es: { meaning: 'Soy profesor / profesora', explanation: 'Es la misma profesión en forma conversacional breve. I’m conserva I am y la consonante /t/ de teacher exige a.' }, 'pt-BR': { meaning: 'Sou professor / professora', explanation: 'É a mesma profissão na forma curta de conversa. I’m preserva I am, e a consoante /t/ de teacher exige a.' }, vi: { meaning: 'Tôi là giáo viên', explanation: 'Đây là cùng nghề đó ở dạng nói ngắn. I’m giữ I am, còn phụ âm /t/ trong teacher cần a.' }, id: { meaning: 'Saya seorang guru', explanation: 'Ini profesi yang sama dalam bentuk percakapan singkat. I’m mempertahankan I am dan konsonan /t/ pada teacher memerlukan a.' }, tr: { meaning: 'Öğretmenim', explanation: 'Aynı meslek konuşma dilindeki kısa biçimle söylenir. I’m, I am yapısını korur; teacher içindeki /t/ ünsüzü a ister.' }, pl: { meaning: 'Jestem nauczycielem / nauczycielką', explanation: 'To ten sam zawód w krótkiej formie mówionej. I’m zachowuje I am, a spółgłoska /t/ w teacher wymaga a.' },
  },
  'I am an artist': {
    ru: { meaning: 'Я художник / художница; артист / артистка', explanation: 'Artist начинается гласным звуком /ɑː/, поэтому перед профессией нужен an. I am остаётся полной связкой говорящего с профессией.' }, uk: { meaning: 'Я художник / художниця; артист / артистка', explanation: 'Artist починається голосним звуком /ɑː/, тому перед професією потрібен an. I am лишається повною зв’язкою мовця з професією.' }, es: { meaning: 'Soy artista', explanation: 'Artist empieza por el sonido vocálico /ɑː/, por eso la profesión necesita an. I am sigue como enlace completo con la profesión.' }, 'pt-BR': { meaning: 'Sou artista', explanation: 'Artist começa com o som vocálico /ɑː/, por isso a profissão precisa de an. I am continua como ligação completa com a profissão.' }, vi: { meaning: 'Tôi là nghệ sĩ', explanation: 'Artist bắt đầu bằng âm nguyên âm /ɑː/ nên trước nghề cần an. I am vẫn là phần nối đầy đủ giữa người nói và nghề.' }, id: { meaning: 'Saya seorang seniman', explanation: 'Artist dimulai bunyi vokal /ɑː/, sehingga profesi itu memerlukan an. I am tetap menjadi penghubung penuh dengan profesi.' }, tr: { meaning: 'Sanatçıyım', explanation: 'Artist ünlü /ɑː/ sesiyle başlar; bu yüzden meslek önünde an gerekir. I am konuşanı mesleğe tam biçimde bağlar.' }, pl: { meaning: 'Jestem artystą / artystką', explanation: 'Artist zaczyna się dźwiękiem samogłoskowym /ɑː/, dlatego przed zawodem potrzebne jest an. I am pozostaje pełnym łącznikiem.' },
  },
  "I'm an artist": {
    ru: { meaning: 'Я художник / художница; артист / артистка', explanation: 'Короткое I’m не меняет выбор артикля. Artist всё ещё начинается гласным звуком, поэтому после сокращения остаётся an.' }, uk: { meaning: 'Я художник / художниця; артист / артистка', explanation: 'Коротке I’m не змінює вибір артикля. Artist і далі починається голосним звуком, тому після скорочення лишається an.' }, es: { meaning: 'Soy artista', explanation: 'La forma corta I’m no cambia el artículo. Artist sigue empezando por sonido vocálico, así que después de la contracción permanece an.' }, 'pt-BR': { meaning: 'Sou artista', explanation: 'A forma curta I’m não muda o artigo. Artist continua começando com som vocálico, então an permanece depois da contração.' }, vi: { meaning: 'Tôi là nghệ sĩ', explanation: 'Dạng ngắn I’m không làm đổi mạo từ. Artist vẫn bắt đầu bằng âm nguyên âm nên sau dạng rút gọn vẫn là an.' }, id: { meaning: 'Saya seorang seniman', explanation: 'Bentuk singkat I’m tidak mengubah artikel. Artist tetap dimulai bunyi vokal, sehingga an tetap dipakai setelah kontraksi.' }, tr: { meaning: 'Sanatçıyım', explanation: 'Kısa I’m biçimi artikel seçimini değiştirmez. Artist hâlâ ünlü sesle başlar; bu yüzden kısaltmadan sonra an kalır.' }, pl: { meaning: 'Jestem artystą / artystką', explanation: 'Krótkie I’m nie zmienia wyboru rodzajnika. Artist nadal zaczyna się samogłoską, więc po skrócie pozostaje an.' },
  },
};

const ARTICLE_PROMPT: Readonly<Record<'a' | 'an', Readonly<Record<Locale, string>>>> = {
  a: { ru: 'Выберите артикль перед согласным звуком.', uk: 'Оберіть артикль перед приголосним звуком.', es: 'Elige el artículo ante sonido consonántico.', 'pt-BR': 'Escolha o artigo antes de som consonantal.', vi: 'Chọn mạo từ trước âm phụ âm.', id: 'Pilih artikel sebelum bunyi konsonan.', tr: 'Ünsüz ses önündeki artikeli seçin.', pl: 'Wybierz rodzajnik przed spółgłoską.' },
  an: { ru: 'Выберите артикль перед гласным звуком.', uk: 'Оберіть артикль перед голосним звуком.', es: 'Elige el artículo ante sonido vocálico.', 'pt-BR': 'Escolha o artigo antes de som vocálico.', vi: 'Chọn mạo từ trước âm nguyên âm.', id: 'Pilih artikel sebelum bunyi vokal.', tr: 'Ünlü ses önündeki artikeli seçin.', pl: 'Wybierz rodzajnik przed samogłoską.' },
};
const NOUN_PROMPT: Readonly<Record<'teacher' | 'artist', Readonly<Record<Locale, string>>>> = {
  teacher: { ru: 'Выберите профессию «учитель».', uk: 'Оберіть професію «вчитель».', es: 'Elige la profesión «profesor».', 'pt-BR': 'Escolha a profissão «professor».', vi: 'Chọn nghề “giáo viên”.', id: 'Pilih profesi “guru”.', tr: '“Öğretmen” mesleğini seçin.', pl: 'Wybierz zawód „nauczyciel”.' },
  artist: { ru: 'Выберите профессию «художник / артист».', uk: 'Оберіть професію «художник / артист».', es: 'Elige la profesión «artista».', 'pt-BR': 'Escolha a profissão «artista».', vi: 'Chọn nghề “nghệ sĩ”.', id: 'Pilih profesi “seniman”.', tr: '“Sanatçı” mesleğini seçin.', pl: 'Wybierz zawód „artysta”.' },
};

function novelEntry(target: NovelTarget) {
  const entry = EPISODE_01_SESSION_06_VOCABULARY_V1.find((item) => item.target === target);
  if (!entry) throw new Error(`session_06_vocabulary_missing:${target}`);
  return entry;
}
function novelWord(target: NovelTarget, category: string): EpisodeSourceWord {
  const entry = novelEntry(target);
  return { correct: target, category, distractors: entry.contacts.build_form.distractors.map((trap) => ({ value: trap.value, reasonCode: `${trap.trapType}:${target}:${trap.value}`, trapType: trap.trapType, why: trap.feedback.ru ?? '' })) };
}
function localizedNovelWord(target: NovelTarget, locale: Locale) {
  const entry = novelEntry(target);
  const prompt = target === 'a' || target === 'an' ? ARTICLE_PROMPT[target][locale] : NOUN_PROMPT[target][locale];
  return { correct: target, prompt, distractors: entry.contacts.build_form.distractors.map((trap) => ({ value: trap.value, reason: trap.feedback[locale] ?? '', trapType: trap.trapType })) };
}

const I_AM_MODEL = EPISODE_01_SESSION_01_WORD_FIRST_PHRASES[0]!;
const IM_MODEL = EPISODE_01_SESSION_04_READINESS_PHRASES[0]!;
function knownRootWords(contracted: boolean): readonly EpisodeSourceWord[] {
  return contracted ? [IM_MODEL.words[0]!] : [I_AM_MODEL.words[0]!, I_AM_MODEL.words[1]!];
}
function knownLocalizedWords(contracted: boolean, locale: Locale): readonly EpisodeSourcePhraseLocalizedDetails['words'][number][] {
  const model = contracted ? IM_MODEL : I_AM_MODEL;
  const count = contracted ? 1 : 2;
  return model.localizedDetails![locale]!.words.slice(0, count);
}

function phrase(english: keyof typeof PHRASE_COPY, article: 'a' | 'an', noun: 'teacher' | 'artist', contracted: boolean): EpisodeSourcePhrase {
  const localizedDetails = Object.fromEntries(LOCALES.map((locale) => {
    const words = [...knownLocalizedWords(contracted, locale), localizedNovelWord(article, locale), localizedNovelWord(noun, locale)];
    return [locale, { ...PHRASE_COPY[english][locale], distractors: words.flatMap((word) => word.distractors), words } satisfies EpisodeSourcePhraseLocalizedDetails];
  })) as NonNullable<EpisodeSourcePhrase['localizedDetails']>;
  return {
    id: `e01-s06-${contracted ? 'im' : 'i-am'}-${article}-${noun}`,
    english,
    russian: PHRASE_COPY[english].ru.meaning,
    explanation: PHRASE_COPY[english].ru.explanation,
    words: [...knownRootWords(contracted), novelWord(article, 'indefinite_article'), novelWord(noun, 'profession_noun')],
    localizedDetails,
    features: ['copula_be', 'first_person_singular', 'indefinite_article', 'profession_noun', ...(contracted ? ['contraction_im'] : [])],
  };
}

export const EPISODE_01_SESSION_06_WORD_FIRST_PHRASES: readonly EpisodeSourcePhrase[] = Object.freeze([
  phrase('I am a teacher', 'a', 'teacher', false),
  phrase("I'm a teacher", 'a', 'teacher', true),
  phrase('I am an artist', 'an', 'artist', false),
  phrase("I'm an artist", 'an', 'artist', true),
]);
