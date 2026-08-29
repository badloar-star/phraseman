import { LEARNING_V2_INTERFACE_LOCALES, type LearningV2Localized } from '../generator_course_contract';
import type { LearningV2ModeAudioReferenceV1, LearningV2ModeChoiceFeedbackV1, LearningV2ModeNativePayloadV1 } from '../../contracts/mode_native_payload_v1';
import { expandLocalized, UNTRANSLATED_MARKER, type LocalizedSource, type SessionModeNativePracticeSourceV1 } from './session_shard_from_source_v1';
import { EPISODE_01_SESSION_01_VOCABULARY_V1 } from './episode_01_session_01_vocabulary_v1';
import { EPISODE_01_SESSION_01_PHRASE_THIRD_DISTRACTOR_FEEDBACK } from './episode_01_session_01_mode_native_v1';
import { EPISODE_01_SESSION_02_VOCABULARY_V1 } from './episode_01_session_02_vocabulary_v1';
import { EPISODE_01_SESSION_03_VOCABULARY_V1 } from './episode_01_session_03_vocabulary_v1';
import { EPISODE_01_SESSION_03_CONTRACTION_PHRASES } from './episode_01_session_03_phrases_word_first_v1';

const vocabulary = EPISODE_01_SESSION_03_VOCABULARY_V1;
const phrases = EPISODE_01_SESSION_03_CONTRACTION_PHRASES;
const L = (value: LocalizedSource): LearningV2Localized<string> => expandLocalized(value);
// Кнопка ответа проверяет одно решение. Полные словарные варианты остаются в
// карточках и редакторских объяснениях, но не превращают одну кнопку в список.
const ATOMIC_PHRASE_OPTION_MEANINGS = Object.freeze([
  { ru: 'Я здесь', uk: 'Я тут', es: 'Estoy aquí', 'pt-BR': 'Estou aqui', vi: 'Tôi ở đây', id: 'Saya di sini', tr: 'Buradayım', pl: 'Jestem tutaj' },
  { ru: 'Я готов', uk: 'Я готовий', es: 'Estoy listo', 'pt-BR': 'Estou pronto', vi: 'Tôi sẵn sàng', id: 'Saya siap', tr: 'Hazırım', pl: 'Jestem gotowy' },
  { ru: 'Я счастлив', uk: 'Я щасливий', es: 'Estoy feliz', 'pt-BR': 'Estou feliz', vi: 'Tôi vui', id: 'Saya senang', tr: 'Mutluyum', pl: 'Jestem szczęśliwy' },
  { ru: 'Мне грустно', uk: 'Мені сумно', es: 'Estoy triste', 'pt-BR': 'Estou triste', vi: 'Tôi buồn', id: 'Saya sedih', tr: 'Üzgünüm', pl: 'Jest mi smutno' },
  { ru: 'Я устал', uk: 'Я втомився', es: 'Estoy cansado', 'pt-BR': 'Estou cansado', vi: 'Tôi mệt', id: 'Saya lelah', tr: 'Yorgunum', pl: 'Jestem zmęczony' },
  { ru: 'Я в порядке', uk: 'У мене все гаразд', es: 'Estoy bien', 'pt-BR': 'Estou bem', vi: 'Tôi ổn', id: 'Saya baik-baik saja', tr: 'İyiyim', pl: 'Wszystko u mnie dobrze' },
] satisfies readonly LocalizedSource[]);
const ATOMIC_SPEED_MEANINGS = Object.freeze({
  I: { ru: 'я', uk: 'я', es: 'yo', 'pt-BR': 'eu', vi: 'tôi', id: 'saya', tr: 'ben', pl: 'ja' },
  am: { ru: 'есть', uk: 'є', es: 'soy', 'pt-BR': 'sou', vi: 'là', id: 'adalah', tr: '-im', pl: 'jestem' },
  here: { ru: 'здесь', uk: 'тут', es: 'aquí', 'pt-BR': 'aqui', vi: 'ở đây', id: 'di sini', tr: 'burada', pl: 'tutaj' },
  ready: { ru: 'готов', uk: 'готовий', es: 'listo', 'pt-BR': 'pronto', vi: 'sẵn sàng', id: 'siap', tr: 'hazır', pl: 'gotowy' },
  happy: { ru: 'счастливый', uk: 'щасливий', es: 'feliz', 'pt-BR': 'feliz', vi: 'vui vẻ', id: 'senang', tr: 'mutlu', pl: 'szczęśliwy' },
  sad: { ru: 'грустный', uk: 'сумний', es: 'triste', 'pt-BR': 'triste', vi: 'buồn', id: 'sedih', tr: 'üzgün', pl: 'smutny' },
  tired: { ru: 'уставший', uk: 'втомлений', es: 'cansado', 'pt-BR': 'cansado', vi: 'mệt', id: 'lelah', tr: 'yorgun', pl: 'zmęczony' },
  fine: { ru: 'нормально', uk: 'нормально', es: 'bien', 'pt-BR': 'bem', vi: 'ổn', id: 'baik-baik saja', tr: 'iyi', pl: 'w porządku' },
} satisfies Readonly<Record<string, LocalizedSource>>);
const INSTRUCTION = Object.freeze({
  hearForm: { ru: 'Послушайте и выберите точную запись короткой формы.', uk: 'Послухайте й виберіть точний запис короткої форми.', es: 'Escucha y elige la escritura exacta de la forma corta.', 'pt-BR': 'Ouça e escolha a escrita exata da forma curta.', vi: 'Nghe và chọn cách viết chính xác của dạng ngắn.', id: 'Dengarkan dan pilih ejaan tepat bentuk singkatnya.', tr: 'Dinleyin ve kısa biçimin doğru yazımını seçin.', pl: 'Posłuchaj i wybierz dokładny zapis krótkiej formy.' },
  chooseForm: { ru: 'Поставьте короткую форму, которая сохраняет I am.', uk: 'Поставте коротку форму, яка зберігає I am.', es: 'Coloca la forma corta que conserva I am.', 'pt-BR': 'Coloque a forma curta que preserva I am.', vi: 'Điền dạng ngắn vẫn giữ nghĩa I am.', id: 'Masukkan bentuk singkat yang tetap memuat I am.', tr: 'I am anlamını koruyan kısa biçimi yerleştirin.', pl: 'Wstaw krótką formę, która zachowuje I am.' },
  buildForm: { ru: 'Соберите I’m из трёх видимых частей.', uk: 'Складіть I’m із трьох видимих частин.', es: 'Construye I’m con sus tres partes visibles.', 'pt-BR': 'Monte I’m com as três partes visíveis.', vi: 'Ghép I’m từ ba phần nhìn thấy.', id: 'Susun I’m dari tiga bagian yang terlihat.', tr: 'I’m biçimini görünen üç parçadan kurun.', pl: 'Ułóż I’m z trzech widocznych części.' },
  listenBuild: { ru: 'Послушайте фразу и соберите только то, что прозвучало.', uk: 'Послухайте фразу й складіть лише те, що прозвучало.', es: 'Escucha la frase y construye solo lo que oyes.', 'pt-BR': 'Ouça a frase e monte apenas o que foi dito.', vi: 'Nghe câu rồi ghép đúng những gì vừa nghe.', id: 'Dengarkan kalimat lalu susun hanya yang terdengar.', tr: 'Cümleyi dinleyin ve yalnızca duyduğunuzu kurun.', pl: 'Posłuchaj zdania i ułóż tylko to, co słychać.' },
  repeat: { ru: 'Послушайте целую фразу, произнесите её и сравните с образцом.', uk: 'Послухайте цілу фразу, вимовте її та порівняйте зі зразком.', es: 'Escucha la frase completa, repítela y compárala con el modelo.', 'pt-BR': 'Ouça a frase inteira, repita e compare com o modelo.', vi: 'Nghe cả câu, đọc lại rồi so sánh với mẫu.', id: 'Dengarkan seluruh kalimat, ucapkan, lalu bandingkan dengan contoh.', tr: 'Tam cümleyi dinleyin, söyleyin ve örnekle karşılaştırın.', pl: 'Posłuchaj całego zdania, powiedz je i porównaj ze wzorem.' },
  listenChoose: { ru: 'Послушайте и выберите целую фразу, которая прозвучала.', uk: 'Послухайте й виберіть цілу фразу, яка прозвучала.', es: 'Escucha y elige la frase completa que se dijo.', 'pt-BR': 'Ouça e escolha a frase inteira que foi dita.', vi: 'Nghe và chọn đúng cả câu vừa được nói.', id: 'Dengarkan dan pilih seluruh kalimat yang diucapkan.', tr: 'Dinleyin ve söylenen tam cümleyi seçin.', pl: 'Posłuchaj i wybierz całe wypowiedziane zdanie.' },
  speed: { ru: 'Соедините знакомые английские слова с их значениями.', uk: 'З’єднайте знайомі англійські слова з їхніми значеннями.', es: 'Une las palabras inglesas conocidas con sus significados.', 'pt-BR': 'Ligue as palavras inglesas conhecidas aos seus significados.', vi: 'Ghép các từ tiếng Anh đã quen với đúng nghĩa.', id: 'Pasangkan kata-kata Inggris yang sudah dikenal dengan artinya.', tr: 'Bildiğiniz İngilizce sözcükleri anlamlarıyla eşleştirin.', pl: 'Połącz znane angielskie słowa z ich znaczeniami.' },
  buildPhrase: { ru: 'Соберите короткую фразу без лишнего am.', uk: 'Складіть коротку фразу без зайвого am.', es: 'Construye la frase corta sin añadir otro am.', 'pt-BR': 'Monte a frase curta sem acrescentar outro am.', vi: 'Ghép câu ngắn mà không thêm am.', id: 'Susun kalimat singkat tanpa menambah am.', tr: 'İkinci am eklemeden kısa cümleyi kurun.', pl: 'Ułóż krótkie zdanie bez dodatkowego am.' },
} satisfies Readonly<Record<string, LocalizedSource>>);

function audio(id: string, transcript: string): LearningV2ModeAudioReferenceV1 {
  return Object.freeze({ audioTargetId: id, transcript });
}
const WORD_AUDIO = audio('e01-s03-contraction-im', "I'm");
const WORD_SLOW_AUDIO = audio('e01-s03-contraction-im-slow', "I'm");
const PHRASE_AUDIO = phrases.map((phrase) => audio(phrase.id, phrase.english));
const PHRASE_SLOW_AUDIO = phrases.map((phrase) => audio(`${phrase.id}-slow`, phrase.english));

function feedback(responseId: string, correct: boolean, testedDimension: string, feedbackByLocale: LearningV2Localized<string>): LearningV2ModeChoiceFeedbackV1 {
  return Object.freeze({ responseId, correct, testedDimension, feedbackByLocale });
}

function localizedPhraseField(index: number, field: 'meaning' | 'explanation'): LearningV2Localized<string> {
  const phrase = phrases[index];
  if (!phrase?.localizedDetails) throw new Error(`session_03_phrase_details_missing:${index}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const detail = phrase.localizedDetails?.[locale];
    if (locale === 'en' && !detail) return [locale, `${UNTRANSLATED_MARKER}${phrase.localizedDetails!.ru[field]}`];
    if (!detail) throw new Error(`session_03_phrase_locale_missing:${index}:${locale}`);
    return [locale, detail[field]];
  })) as LearningV2Localized<string>;
}

function atomicPhraseOptionMeaning(index: number): LearningV2Localized<string> {
  const meaning = ATOMIC_PHRASE_OPTION_MEANINGS[index];
  if (!meaning) throw new Error(`session_03_atomic_phrase_meaning_missing:${index}`);
  return L(meaning);
}

function localizedDistractorFeedback(index: number, value: string): LearningV2Localized<string> {
  const phrase = phrases[index]!;
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const reason = phrase.localizedDetails?.[locale]?.distractors.find((entry) => entry.value === value)?.reason
      ?? EPISODE_01_SESSION_01_PHRASE_THIRD_DISTRACTOR_FEEDBACK[value]?.[locale];
    if (locale === 'en' && !reason) {
      const ru = phrase.localizedDetails?.ru?.distractors.find((entry) => entry.value === value)?.reason;
      if (!ru) throw new Error(`session_03_distractor_ru_missing:${index}:${value}`);
      return [locale, `${UNTRANSLATED_MARKER}${ru}`];
    }
    if (!reason) throw new Error(`session_03_distractor_locale_missing:${index}:${locale}:${value}`);
    return [locale, reason];
  })) as LearningV2Localized<string>;
}

function contractionFeedback(stage: 'recognize' | 'retrieve_meaning' | 'build_form'): readonly LearningV2ModeChoiceFeedbackV1[] {
  const item = vocabulary[0]!;
  const contact = item.contacts[stage];
  return Object.freeze([
    feedback(`${item.id}:${stage}:correct`, true, stage, L(contact.guidance)),
    ...contact.distractors.map((entry) => feedback(`${item.id}:${stage}:${entry.reasonCode}`, false, `${entry.trapType}:${entry.reasonCode}`, L(entry.feedback))),
  ]);
}

function phraseBuilderFeedback(index: number): readonly LearningV2ModeChoiceFeedbackV1[] {
  const phrase = phrases[index]!;
  const values = [...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))];
  return Object.freeze([
    feedback(`${phrase.id}:builder:correct`, true, 'phrase_assembly', localizedPhraseField(index, 'explanation')),
    ...values.map((value) => feedback(`${phrase.id}:builder:${value}`, false, `phrase_assembly:${value}`, localizedDistractorFeedback(index, value))),
  ]);
}

const LISTEN_CONTRAST = Object.freeze({
  '2:3': { ru: 'Вы выбрали I’m sad — «мне грустно». В записи звучит I’m happy: последнее слово говорит о радости, а не о грусти.', uk: 'Ви обрали I’m sad — «мені сумно». У записі звучить I’m happy: останнє слово говорить про радість, а не про смуток.', es: 'Elegiste I’m sad: «estoy triste». En el audio se oye I’m happy; la última palabra expresa alegría, no tristeza.', 'pt-BR': 'Você escolheu I’m sad: «estou triste». No áudio aparece I’m happy; a última palavra expressa alegria, não tristeza.', vi: 'Bạn chọn I’m sad, nghĩa là “tôi buồn”. Âm thanh nói I’m happy; từ cuối diễn tả niềm vui chứ không phải nỗi buồn.', id: 'Kamu memilih I’m sad, artinya “saya sedih”. Audio mengatakan I’m happy; kata terakhir menyatakan senang, bukan sedih.', tr: 'I’m sad, yani “üzgünüm” seçildi. Kayda I’m happy söyleniyor; son sözcük üzüntüyü değil sevinci bildiriyor.', pl: 'Wybrano I’m sad, czyli „jest mi smutno”. W nagraniu słychać I’m happy; ostatnie słowo mówi o radości, nie o smutku.' },
  '2:4': { ru: 'Вы выбрали I’m tired — «я устал / устала». В записи звучит I’m happy: там радость, а не усталость.', uk: 'Ви обрали I’m tired — «я втомився / втомилася». У записі звучить I’m happy: там радість, а не втома.', es: 'Elegiste I’m tired: «estoy cansado / cansada». El audio dice I’m happy; expresa alegría, no cansancio.', 'pt-BR': 'Você escolheu I’m tired: «estou cansado / cansada». O áudio diz I’m happy; expressa alegria, não cansaço.', vi: 'Bạn chọn I’m tired, nghĩa là “tôi mệt”. Âm thanh nói I’m happy; đó là niềm vui, không phải sự mệt mỏi.', id: 'Kamu memilih I’m tired, artinya “saya lelah”. Audio mengatakan I’m happy; itu rasa senang, bukan lelah.', tr: 'I’m tired, yani “yorgunum” seçildi. Kayda I’m happy söyleniyor; bu yorgunluğu değil sevinci anlatıyor.', pl: 'Wybrano I’m tired, czyli „jestem zmęczony / zmęczona”. Nagranie mówi I’m happy; chodzi o radość, nie zmęczenie.' },
  '2:5': { ru: 'Вы выбрали I’m fine — спокойное «я в порядке». В записи звучит I’m happy: это именно радость, а не просто нормальное состояние.', uk: 'Ви обрали I’m fine — спокійне «я в порядку». У записі звучить I’m happy: це саме радість, а не просто нормальний стан.', es: 'Elegiste I’m fine: un tranquilo «estoy bien». El audio dice I’m happy; habla de alegría, no solo de estar bien.', 'pt-BR': 'Você escolheu I’m fine: um tranquilo «estou bem». O áudio diz I’m happy; fala de alegria, não apenas de estar bem.', vi: 'Bạn chọn I’m fine, một câu “tôi ổn” bình thản. Âm thanh nói I’m happy; đó là niềm vui, không chỉ là trạng thái ổn.', id: 'Kamu memilih I’m fine, yaitu “saya baik-baik saja”. Audio mengatakan I’m happy; itu rasa senang, bukan sekadar baik-baik saja.', tr: 'I’m fine, yani sakin bir “iyiyim” seçildi. Kayda I’m happy söyleniyor; yalnız iyi olmayı değil sevinci anlatıyor.', pl: 'Wybrano I’m fine, czyli spokojne „wszystko w porządku”. Nagranie mówi I’m happy; chodzi o radość, nie tylko dobry stan.' },
  '1:2': { ru: 'Вы выбрали I’m happy — «я рад / рада». В записи звучит I’m ready: человек сообщает о готовности, а не о настроении.', uk: 'Ви обрали I’m happy — «я радий / рада». У записі звучить I’m ready: людина повідомляє про готовність, а не про настрій.', es: 'Elegiste I’m happy: «estoy feliz». El audio dice I’m ready; la persona está preparada, no describe su ánimo.', 'pt-BR': 'Você escolheu I’m happy: «estou feliz». O áudio diz I’m ready; a pessoa está pronta, não descreve o humor.', vi: 'Bạn chọn I’m happy, nghĩa là “tôi vui”. Âm thanh nói I’m ready; người nói đang sẵn sàng, không nói về tâm trạng.', id: 'Kamu memilih I’m happy, artinya “saya senang”. Audio mengatakan I’m ready; penutur menyatakan kesiapan, bukan suasana hati.', tr: 'I’m happy, yani “mutluyum” seçildi. Kayda I’m ready söyleniyor; konuşan ruh hâlini değil hazır olduğunu bildiriyor.', pl: 'Wybrano I’m happy, czyli „jestem szczęśliwy / szczęśliwa”. Nagranie mówi I’m ready; osoba jest gotowa, nie opisuje nastroju.' },
  '1:3': { ru: 'Вы выбрали I’m sad — «мне грустно». В записи звучит I’m ready: речь о готовности начать, а не о грусти.', uk: 'Ви обрали I’m sad — «мені сумно». У записі звучить I’m ready: йдеться про готовність почати, а не про смуток.', es: 'Elegiste I’m sad: «estoy triste». El audio dice I’m ready; habla de estar preparado, no de tristeza.', 'pt-BR': 'Você escolheu I’m sad: «estou triste». O áudio diz I’m ready; fala de estar pronto, não de tristeza.', vi: 'Bạn chọn I’m sad, nghĩa là “tôi buồn”. Âm thanh nói I’m ready; đó là sự sẵn sàng bắt đầu, không phải nỗi buồn.', id: 'Kamu memilih I’m sad, artinya “saya sedih”. Audio mengatakan I’m ready; itu kesiapan untuk mulai, bukan kesedihan.', tr: 'I’m sad, yani “üzgünüm” seçildi. Kayda I’m ready söyleniyor; üzüntü değil, başlamaya hazır olma anlatılıyor.', pl: 'Wybrano I’m sad, czyli „jest mi smutno”. Nagranie mówi I’m ready; chodzi o gotowość do startu, nie o smutek.' },
  '1:4': { ru: 'Вы выбрали I’m tired — «я устал / устала». В записи звучит I’m ready: человек готов начать, а не сообщает об усталости.', uk: 'Ви обрали I’m tired — «я втомився / втомилася». У записі звучить I’m ready: людина готова почати, а не повідомляє про втому.', es: 'Elegiste I’m tired: «estoy cansado / cansada». El audio dice I’m ready; la persona está preparada para empezar, no cansada.', 'pt-BR': 'Você escolheu I’m tired: «estou cansado / cansada». O áudio diz I’m ready; a pessoa está pronta para começar, não cansada.', vi: 'Bạn chọn I’m tired, nghĩa là “tôi mệt”. Âm thanh nói I’m ready; người nói sẵn sàng bắt đầu, không nói mình mệt.', id: 'Kamu memilih I’m tired, artinya “saya lelah”. Audio mengatakan I’m ready; penutur siap mulai, bukan sedang lelah.', tr: 'I’m tired, yani “yorgunum” seçildi. Kayda I’m ready söyleniyor; konuşan yorgunluğunu değil başlamaya hazır olduğunu söylüyor.', pl: 'Wybrano I’m tired, czyli „jestem zmęczony / zmęczona”. Nagranie mówi I’m ready; osoba jest gotowa zacząć, nie zmęczona.' },
  '0:1': { ru: 'Вы выбрали I’m ready — «я готов / готова». В записи звучит I’m here: человек сообщает, где он находится, а не готовность.', uk: 'Ви обрали I’m ready — «я готовий / готова». У записі звучить I’m here: людина повідомляє, де вона перебуває, а не про готовність.', es: 'Elegiste I’m ready: «estoy listo / lista». El audio dice I’m here; indica dónde está la persona, no si está preparada.', 'pt-BR': 'Você escolheu I’m ready: «estou pronto / pronta». O áudio diz I’m here; indica onde a pessoa está, não se está preparada.', vi: 'Bạn chọn I’m ready, nghĩa là “tôi sẵn sàng”. Âm thanh nói I’m here; câu đó chỉ nơi người nói đang ở, không phải sự sẵn sàng.', id: 'Kamu memilih I’m ready, artinya “saya siap”. Audio mengatakan I’m here; kalimat itu menunjukkan tempat, bukan kesiapan.', tr: 'I’m ready, yani “hazırım” seçildi. Kayda I’m here söyleniyor; bu hazır olmayı değil kişinin bulunduğu yeri bildiriyor.', pl: 'Wybrano I’m ready, czyli „jestem gotowy / gotowa”. Nagranie mówi I’m here; wskazuje miejsce osoby, nie jej gotowość.' },
  '0:2': { ru: 'Вы выбрали I’m happy — «я рад / рада». В записи звучит I’m here: это сообщение о месте, а не о радости.', uk: 'Ви обрали I’m happy — «я радий / рада». У записі звучить I’m here: це повідомлення про місце, а не про радість.', es: 'Elegiste I’m happy: «estoy feliz». El audio dice I’m here; comunica un lugar, no alegría.', 'pt-BR': 'Você escolheu I’m happy: «estou feliz». O áudio diz I’m here; comunica um lugar, não alegria.', vi: 'Bạn chọn I’m happy, nghĩa là “tôi vui”. Âm thanh nói I’m here; câu đó cho biết vị trí, không nói về niềm vui.', id: 'Kamu memilih I’m happy, artinya “saya senang”. Audio mengatakan I’m here; itu menyatakan tempat, bukan rasa senang.', tr: 'I’m happy, yani “mutluyum” seçildi. Kayda I’m here söyleniyor; bu sevinci değil konumu bildiriyor.', pl: 'Wybrano I’m happy, czyli „jestem szczęśliwy / szczęśliwa”. Nagranie mówi I’m here; informuje o miejscu, nie o radości.' },
  '0:3': { ru: 'Вы выбрали I’m sad — «мне грустно». В записи звучит I’m here: человек говорит о своём месте, а не о грусти.', uk: 'Ви обрали I’m sad — «мені сумно». У записі звучить I’m here: людина говорить про своє місце, а не про смуток.', es: 'Elegiste I’m sad: «estoy triste». El audio dice I’m here; la persona indica dónde está, no que esté triste.', 'pt-BR': 'Você escolheu I’m sad: «estou triste». O áudio diz I’m here; a pessoa indica onde está, não que esteja triste.', vi: 'Bạn chọn I’m sad, nghĩa là “tôi buồn”. Âm thanh nói I’m here; người nói cho biết mình ở đâu, không nói về nỗi buồn.', id: 'Kamu memilih I’m sad, artinya “saya sedih”. Audio mengatakan I’m here; penutur memberi tahu tempatnya, bukan kesedihan.', tr: 'I’m sad, yani “üzgünüm” seçildi. Kayda I’m here söyleniyor; konuşan üzüntüsünü değil bulunduğu yeri söylüyor.', pl: 'Wybrano I’m sad, czyli „jest mi smutno”. Nagranie mówi I’m here; osoba podaje swoje miejsce, nie mówi o smutku.' },
} satisfies Readonly<Record<string, LocalizedSource>>);

function listenContrastFeedback(correctIndex: number, candidateIndex: number): LearningV2Localized<string> {
  const authored = LISTEN_CONTRAST[`${correctIndex}:${candidateIndex}`];
  if (!authored) throw new Error(`session_03_listen_contrast_missing:${correctIndex}:${candidateIndex}`);
  return L(authored);
}

function hearContraction(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  return Object.freeze({
    family: 'listen_choose', referenceAudio: WORD_AUDIO, slowReferenceAudio: WORD_SLOW_AUDIO,
    localizedMeaningChoices: Object.freeze([
      { responseId: `${item.id}:recognize:correct`, targetText: "I'm", meaningByLocale: null },
      ...item.contacts.recognize.distractors.map((entry) => ({ responseId: `${item.id}:recognize:${entry.reasonCode}`, targetText: entry.value, meaningByLocale: null })),
    ]),
    transcriptRevealPolicy: 'after_first_attempt', choiceFeedback: contractionFeedback('recognize'),
  });
}

function chooseContraction(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  return Object.freeze({
    family: 'context_gap_grammar', localizedScene: L({ ru: 'Говорящий сообщает: «Я готов / готова».', uk: 'Мовець повідомляє: «Я готовий / готова».', es: 'La persona dice: «Estoy listo / lista».', 'pt-BR': 'A pessoa diz: «Estou pronto / pronta».', vi: 'Người nói cho biết: “Tôi sẵn sàng”.', id: 'Penutur menyatakan: “Saya siap”.', tr: 'Konuşan kişi “Hazırım” diyor.', pl: 'Mówiąca osoba mówi: „Jestem gotowy / gotowa”.' }),
    gappedTargetPhrase: '___ ready',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:retrieve_meaning:correct`, text: "I'm" },
      ...item.contacts.retrieve_meaning.distractors.map((entry) => ({ responseId: `${item.id}:retrieve_meaning:${entry.reasonCode}`, text: entry.value })),
    ]), testedDimension: 'contraction_im_complete_affirmative_frame', choiceFeedback: contractionFeedback('retrieve_meaning'),
  });
}

function buildContraction(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  return Object.freeze({
    family: 'phrase_builder', targetPhrase: "I'm", localizedMeaning: L(item.meaning),
    orderedTokens: Object.freeze(["I'm"]),
    authoredDistractorTokens: Object.freeze(['a', 'am', 'Im']),
    slotFeedback: contractionFeedback('build_form'),
  });
}

function fullPhraseBuilder(index: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[index]!;
  return Object.freeze({ family: 'phrase_builder', targetPhrase: phrase.english, localizedMeaning: localizedPhraseField(index, 'meaning'), orderedTokens: Object.freeze(phrase.english.split(' ')), authoredDistractorTokens: Object.freeze([...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))]), slotFeedback: phraseBuilderFeedback(index) });
}
function listenBuild(index: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[index]!;
  return Object.freeze({ family: 'listen_build_dictation', referenceAudio: PHRASE_AUDIO[index]!, slowReferenceAudio: PHRASE_SLOW_AUDIO[index]!, hiddenTargetPhrase: phrase.english, orderedTokens: Object.freeze(phrase.english.split(' ')), authoredDistractorTokens: Object.freeze([...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))]), slotFeedback: phraseBuilderFeedback(index) });
}
function repeat(index: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[index]!;
  return Object.freeze({ family: 'scripted_repeat_compare', referenceAudio: PHRASE_AUDIO[index]!, slowReferenceAudio: PHRASE_SLOW_AUDIO[index]!, targetPhrase: phrase.english, recordControlPolicy: 'hold_press_release_with_accessible_toggle', modelPlayback: 'reference_and_slow', learnerPlayback: 'available_after_capture', honestOutcomeStates: Object.freeze(['PASS_CONFIDENT', 'NEEDS_WORK_CONFIDENT', 'UNCERTAIN', 'INVALID_AUDIO_OR_SYSTEM'] as const) });
}
function listenChoose(index: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[index]!;
  const alternatives = [index, (index + 1) % phrases.length, (index + 2) % phrases.length, (index + 3) % phrases.length];
  return Object.freeze({
    family: 'listen_choose', referenceAudio: PHRASE_AUDIO[index]!, slowReferenceAudio: PHRASE_SLOW_AUDIO[index]!,
    localizedMeaningChoices: Object.freeze(alternatives.map((candidateIndex, option) => ({ responseId: `${phrase.id}:listen:${option === 0 ? 'correct' : `phrase_${candidateIndex}`}`, targetText: phrases[candidateIndex]!.english, meaningByLocale: atomicPhraseOptionMeaning(candidateIndex) }))),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: Object.freeze(alternatives.map((candidateIndex, option) => feedback(
      `${phrase.id}:listen:${option === 0 ? 'correct' : `phrase_${candidateIndex}`}`,
      option === 0,
      option === 0 ? 'listening_exact_phrase' : `listening_last_word:${phrases[candidateIndex]!.english}`,
      option === 0
        ? localizedPhraseField(index, 'explanation')
        : listenContrastFeedback(index, candidateIndex),
    ))),
  });
}
function context(index: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[index]!;
  const item = vocabulary[0]!;
  return Object.freeze({ family: 'context_gap_grammar', localizedScene: localizedPhraseField(index, 'meaning'), gappedTargetPhrase: `___ ${phrase.english.split(' ')[1]}`, gapOptions: Object.freeze([{ responseId: `${phrase.id}:gap:correct`, text: "I'm" }, ...item.contacts.build_form.distractors.map((entry) => ({ responseId: `${phrase.id}:gap:${entry.reasonCode}`, text: entry.value }))]), testedDimension: 'contraction_im_without_duplicate_copula', choiceFeedback: Object.freeze([feedback(`${phrase.id}:gap:correct`, true, 'contraction_im', localizedPhraseField(index, 'explanation')), ...item.contacts.build_form.distractors.map((entry) => feedback(`${phrase.id}:gap:${entry.reasonCode}`, false, `${entry.trapType}:${entry.reasonCode}`, L(entry.feedback)))]) });
}

const SPEED_WORDS = Object.freeze(
  [...EPISODE_01_SESSION_01_VOCABULARY_V1, ...EPISODE_01_SESSION_02_VOCABULARY_V1]
    .filter((word) => ['here', 'ready', 'happy', 'tired'].includes(word.target)),
);
const SPEED_IDS = SPEED_WORDS.map((word) => `e01-s03-pair-${word.target.toLowerCase()}`);
const speedMatch: LearningV2ModeNativePayloadV1 = Object.freeze({
  family: 'speed_match', pairGrid: Object.freeze(SPEED_WORDS.map((word, index) => {
    const meaning = ATOMIC_SPEED_MEANINGS[word.target];
    if (!meaning) throw new Error(`session_03_atomic_speed_meaning_missing:${word.target}`);
    return { pairId: SPEED_IDS[index]!, target: word.target, meaningByLocale: L(meaning) };
  })),
  leftColumn: Object.freeze([SPEED_IDS[2]!, SPEED_IDS[0]!, SPEED_IDS[3]!, SPEED_IDS[1]!]),
  rightColumn: Object.freeze([SPEED_IDS[1]!, SPEED_IDS[3]!, SPEED_IDS[0]!, SPEED_IDS[2]!]),
  pairingKey: 'pair_id', timerPolicy: Object.freeze({ enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true }), finishStats: Object.freeze(['speed', 'accuracy', 'personal_best'] as const),
});

export const EPISODE_01_SESSION_03_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'listen_choose', instruction: INSTRUCTION.hearForm, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: hearContraction() },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.chooseForm, purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: chooseContraction() },
  { family: 'phrase_builder', instruction: INSTRUCTION.buildForm, purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: buildContraction() },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuild, purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: listenBuild(0) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeat, purpose: 'guided_practice', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: repeat(1) },
  { family: 'listen_choose', instruction: INSTRUCTION.listenChoose, purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 2 }, modePayload: listenChoose(2) },
  { family: 'speed_match', instruction: INSTRUCTION.speed, purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'vocabulary_grid', sourceIndices: [], knownItems: SPEED_WORDS }, modePayload: speedMatch },
  { family: 'phrase_builder', instruction: INSTRUCTION.buildPhrase, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: fullPhraseBuilder(3) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.chooseForm, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 4 }, modePayload: context(4) },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuild, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 5 }, modePayload: listenBuild(5) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeat, purpose: 'near_transfer', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: repeat(0) },
  { family: 'listen_choose', instruction: INSTRUCTION.listenChoose, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: listenChoose(1) },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuild, purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 2 }, modePayload: listenBuild(2) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.chooseForm, purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: context(3) },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuild, purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 4 }, modePayload: listenBuild(4) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeat, purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 5 }, modePayload: repeat(5) },
  { family: 'listen_choose', instruction: INSTRUCTION.listenChoose, purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: listenChoose(0) },
]);
