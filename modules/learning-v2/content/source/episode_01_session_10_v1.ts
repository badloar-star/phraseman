/** Dedicated Full B1 source for Session 10; it never inherits the old negative You-pack. */
import { APPROVED_FIRST_TEN_SESSION_SOURCES_V2 } from './approved_first_ten_source_v2';
import {
  EPISODE_01_SESSION_04_EXACT_INTRO_V2,
  EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2,
  EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2,
  EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2,
} from './episode_01_session_04_exact_v2';
import { LESSON1_SESSION_10_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const json = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const replace = <T>(value: T, pairs: readonly (readonly [string, string])[]): T => {
  const visit = (entry: unknown): unknown => {
    if (typeof entry === 'string') {
      let result = entry;
      for (const [from, to] of pairs) result = result.replaceAll(from, to);
      return result;
    }
    if (Array.isArray(entry)) return entry.map(visit);
    if (entry && typeof entry === 'object') return Object.fromEntries(Object.entries(entry as Record<string, unknown>).map(([key, child]) => [key, visit(child)]));
    return entry;
  };
  return visit(value) as T;
};
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });

const vocabulary = Object.freeze([
  replace(json(EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2[0]!), [['hungry', 'old'], ['thirsty', 'kind'], ['sick', 'funny'], ['Hungry', 'old'], ['Thirsty', 'kind'], ['Sick', 'funny'], ['state', 'description'], ['I am', 'She is'], ['I', 'She'], ['am', 'is'], ['you', 'he'], ['You', 'He']]),
  replace(json(EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2[1]!), [['hungry', 'old'], ['thirsty', 'kind'], ['sick', 'funny'], ['Hungry', 'old'], ['Thirsty', 'kind'], ['Sick', 'funny'], ['state', 'description'], ['I am', 'He is'], ['I', 'He'], ['am', 'is'], ['you', 'she'], ['You', 'She']]),
  replace(json(EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2[2]!), [['hungry', 'old'], ['thirsty', 'kind'], ['sick', 'funny'], ['Hungry', 'old'], ['Thirsty', 'kind'], ['Sick', 'funny'], ['state', 'description'], ['I am', 'She is'], ['I', 'She'], ['am', 'is'], ['you', 'he'], ['You', 'He']]),
] as const);

const phraseSeeds = [
  ['She', 'old', L('старая', 'стара', 'mayor', 'idosa', 'lớn tuổi', 'tua', 'yaşlı', 'stara')],
  ['He', 'kind', L('добрый', 'добрий', 'amable', 'gentil', 'tốt bụng', 'baik', 'nazik', 'miły')],
  ['She', 'funny', L('смешная', 'смішна', 'divertida', 'engraçada', 'vui tính', 'lucu', 'komik', 'zabawna')],
  ['She', 'ready', L('готова', 'готова', 'lista', 'pronta', 'sẵn sàng', 'siap', 'hazır', 'gotowa')],
] as const;
const phraseTraps = (correct: string, values: readonly string[], category: string) => values.map((value, index) => ({
  value,
  reasonCode: `s10:${correct}:not:${value}:${index}`,
  trapType: category === 'description' ? 'semantic_neighbor' : 'grammar',
  why: `${value} does not complete this sentence; use ${correct}.`,
}));
const phraseSource = (subject: string, ending: string, meaning: ReturnType<typeof L>) => {
  const subjectOptions = subject === 'She' ? ['He', 'It', 'I'] : ['She', 'It', 'I'];
  const endingOptions = ['old', 'kind', 'funny', 'ready', 'tall', 'short'].filter((value) => value !== ending).slice(0, 3);
  const words = [
    { correct: subject, category: 'third_person_pronoun', distractors: phraseTraps(subject, subjectOptions, 'subject') },
    { correct: 'is', category: 'copula', distractors: phraseTraps('is', ['am', 'are', 'be'], 'copula') },
    { correct: ending, category: 'description', distractors: phraseTraps(ending, endingOptions, 'description') },
  ];
  const english = `${subject} is ${ending}`;
  const localizedDetails = Object.fromEntries(Object.entries(meaning).map(([locale, localizedMeaning]) => [locale, {
    meaning: localizedMeaning,
    explanation: `${english}: ${subject} names the person, is links that person to ${ending}.`,
    distractors: words.flatMap((word) => word.distractors.map((trap) => ({ value: trap.value, reason: trap.why, trapType: trap.trapType }))),
    words: words.map((word) => ({ correct: word.correct, prompt: `Choose ${word.correct}.`, distractors: word.distractors.map((trap) => ({ value: trap.value, reason: trap.why, trapType: trap.trapType })) })),
  }]));
  return { id: `e01-s10-${subject.toLowerCase()}-is-${ending}`, english, russian: meaning.ru, explanation: `Say ${english} to describe another person. ${subject} comes before is, and ${ending} is the exact description, so the three words stay in this order.`, words, localizedDetails, features: ['copula_be'] };
};
const phrases = Object.freeze(phraseSeeds.map(([subject, ending, meaning]) => phraseSource(subject, ending, meaning)));

const intro = replace(json(EPISODE_01_SESSION_04_EXACT_INTRO_V2), [
  ['I am hungry', 'She is old'], ['I am thirsty', 'He is kind'], ['I am sick', 'She is funny'],
  ['I am', 'She is'], ['I', 'She'], ['am', 'is'], ['hungry', 'old'], ['thirsty', 'kind'], ['sick', 'funny'],
  ['you', 'he'], ['You', 'He'],
]) as any[];
const introBody = (page: any, body: ReturnType<typeof L>) => {
  page.body = body;
  page.bodyRuns = Object.fromEntries(Object.entries(body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]]));
};
introBody(intro[0], L('He is funny описывает другого человека. He называет его. Is соединяет его с новым описанием funny.', 'He is funny описує іншу людину. He називає його. Is поєднує його з новим описом funny.', 'He is funny describe a otra persona. He la nombra. Is la une con la nueva descripción funny.', 'He is funny descreve outra pessoa. He a nomeia. Is a liga à nova descrição funny.', 'He is funny mô tả người khác. He chỉ người đó. Is nối người đó với mô tả mới funny.', 'He is funny menggambarkan orang lain. He menunjuk orangnya. Is menghubungkannya dengan deskripsi baru funny.', 'He is funny başka birini tanımlar. He kişiyi gösterir. Is onu yeni funny tanımıyla bağlar.', 'He is funny opisuje inną osobę. He ją wskazuje. Is łączy ją z nowym opisem funny.'));
intro[0]!.question.choices = [L('He is funny', 'He is funny', 'He is funny', 'He is funny', 'He is funny', 'He is funny', 'He is funny', 'He is funny'), L('He funny is', 'He funny is', 'He funny is', 'He funny is', 'He funny is', 'He funny is', 'He funny is', 'He funny is'), L('He am funny', 'He am funny', 'He am funny', 'He am funny', 'He am funny', 'He am funny', 'He am funny', 'He am funny')];
intro[0]!.question.explanation = L('He is funny ставит is между He и funny.', 'He is funny ставить is між He та funny.', 'He is funny pone is entre He y funny.', 'He is funny põe is entre He e funny.', 'He is funny đặt is giữa He và funny.', 'He is funny menempatkan is di antara He dan funny.', 'He is funny, is sözcüğünü He ile funny arasına koyar.', 'He is funny stawia is między He a funny.');
introBody(intro[1], L('She is kind описывает другого человека. She называет её. Is соединяет её с новым описанием kind.', 'She is kind описує іншу людину. She називає її. Is поєднує її з новим описом kind.', 'She is kind describe a otra persona. She la nombra. Is la une con la nueva descripción kind.', 'She is kind descreve outra pessoa. She a nomeia. Is a liga à nova descrição kind.', 'She is kind mô tả người khác. She chỉ người đó. Is nối người đó với mô tả mới kind.', 'She is kind menggambarkan orang lain. She menunjuk orangnya. Is menghubungkannya dengan deskripsi baru kind.', 'She is kind başka birini tanımlar. She kişiyi gösterir. Is onu yeni kind tanımıyla bağlar.', 'She is kind opisuje inną osobę. She ją wskazuje. Is łączy ją z nowym opisem kind.'));
intro[1]!.question.choices = [L('She is kind', 'She is kind', 'She is kind', 'She is kind', 'She is kind', 'She is kind', 'She is kind', 'She is kind'), L('She kind is', 'She kind is', 'She kind is', 'She kind is', 'She kind is', 'She kind is', 'She kind is', 'She kind is'), L('She am kind', 'She am kind', 'She am kind', 'She am kind', 'She am kind', 'She am kind', 'She am kind', 'She am kind')];
intro[1]!.question.grammarFeatureId = 'affirmative_third_person_statement';
introBody(intro[2], L('He is old использует знакомый порядок. Сначала He. Затем is, а после него old.', 'He is old використовує знайомий порядок. Спочатку He. Потім is, а після нього old.', 'He is old usa el orden conocido. Primero He. Después is y luego old.', 'He is old usa a ordem conhecida. Primeiro He. Depois is e então old.', 'He is old dùng thứ tự đã biết. Trước là He. Sau đó là is rồi old.', 'He is old memakai urutan yang dikenal. Mula-mula He. Lalu is, kemudian old.', 'He is old bilinen sırayı kullanır. Önce He gelir. Sonra is, ardından old gelir.', 'He is old używa znanego szyku. Najpierw He. Potem is, a następnie old.'));
intro[2]!.question.choices = [L('He is old', 'He is old', 'He is old', 'He is old', 'He is old', 'He is old', 'He is old', 'He is old'), L('He old is', 'He old is', 'He old is', 'He old is', 'He old is', 'He old is', 'He old is', 'He old is'), L('He are old', 'He are old', 'He are old', 'He are old', 'He are old', 'He are old', 'He are old', 'He are old')];
intro[2]!.question.grammarFeatureId = 'affirmative_third_person_statement';
intro[2]!.question.explanation = L('He is old — правильный ответ, потому что после He ставится is, а затем описание old.', 'He is old — правильна відповідь, бо після He ставиться is, а потім опис old.', 'He is old es correcto porque después de He va is y luego la descripción old.', 'He is old está correto porque depois de He vem is e então a descrição old.', 'He is old đúng vì sau He là is rồi đến mô tả old.', 'He is old benar karena setelah He ada is lalu deskripsi old.', 'He is old doğrudur; He sonrasında is, sonra old tanımı gelir.', 'He is old jest poprawne, bo po He stoi is, a potem opis old.');

const legacyModeNativePractice = [
  replace(json(EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2[0]!), [['hungry', 'old'], ['thirsty', 'kind'], ['sick', 'funny'], ['you', 'he'], ['You', 'He']]),
  replace(json(EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2[1]!), [['hungry', 'kind'], ['thirsty', 'funny'], ['sick', 'old'], ['you', 'he'], ['You', 'He']]),
  replace(json(EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2[2]!), [['I am', 'She is'], ['I', 'She'], ['am', 'is'], ['hungry', 'funny'], ['thirsty', 'old'], ['sick', 'kind'], ['you', 'he'], ['You', 'He']]),
  replace(json(EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2[3]!), [['I am', 'She is'], ['I', 'She'], ['am', 'is'], ['here', 'old'], ['ready', 'ready'], ['you', 'he'], ['You', 'He']]),
  replace(json(EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2[4]!), [['hungry', 'old'], ['thirsty', 'kind'], ['sick', 'funny'], ['here', 'tall'], ['you', 'he'], ['You', 'He']]),
  replace(json(EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2[5]!), [['I am', 'He is'], ['I', 'He'], ['am', 'is'], ['ready', 'kind'], ['you', 'she'], ['You', 'She']]),
] as any[];
for (const [index, family] of ['listen_choose', 'scripted_repeat_compare', 'context_gap_grammar', 'listen_build_dictation', 'speed_match', 'phrase_builder'].entries()) {
  legacyModeNativePractice[index]!.family = family;
  legacyModeNativePractice[index]!.modePayload.family = family;
}
legacyModeNativePractice[0]!.target = { kind: 'vocabulary', sourceIndex: 0 };
legacyModeNativePractice[1]!.target = { kind: 'vocabulary', sourceIndex: 1 };
legacyModeNativePractice[2]!.target = { kind: 'phrase', sourceIndex: 2 };
legacyModeNativePractice[3]!.target = { kind: 'phrase', sourceIndex: 0 };
legacyModeNativePractice[4]!.target = { kind: 'phrase', sourceIndex: 1 };
legacyModeNativePractice[5]!.target = { kind: 'phrase', sourceIndex: 3 };

// This compact packet is authored from Session 10's own vocabulary and phrase
// records.  Do not revive the historical Session 4 payload by string rewrite.
const C = (text: string) => L(text, text, text, text, text, text, text, text);
const instructionCopy = Object.freeze({
  listen: L('Послушайте и выберите.', 'Послухайте й виберіть.', 'Escucha y elige.', 'Ouça e escolha.', 'Nghe rồi chọn.', 'Dengarkan lalu pilih.', 'Dinleyin ve seçin.', 'Posłuchaj i wybierz.'),
  repeat: L('Послушайте, скажите и сравните.', 'Послухайте, скажіть і порівняйте.', 'Escucha, dilo y compara.', 'Ouça, diga e compare.', 'Nghe, nói rồi so sánh.', 'Dengarkan, ucapkan, lalu bandingkan.', 'Dinleyin, söyleyin ve karşılaştırın.', 'Posłuchaj, powiedz i porównaj.'),
  gap: L('Выберите описание.', 'Виберіть опис.', 'Elige la descripción.', 'Escolha a descrição.', 'Chọn từ miêu tả.', 'Pilih kata sifatnya.', 'Tanımı seçin.', 'Wybierz opis.'),
  dictation: L('Послушайте и соберите фразу.', 'Послухайте й складіть фразу.', 'Escucha y construye la frase.', 'Ouça e monte a frase.', 'Nghe rồi ghép câu.', 'Dengarkan lalu susun kalimatnya.', 'Dinleyin ve cümleyi kurun.', 'Posłuchaj i ułóż zdanie.'),
  match: L('Соедините слова и значения.', 'З’єднайте слова та значення.', 'Une las palabras con sus significados.', 'Associe as palavras aos significados.', 'Nối từ với nghĩa.', 'Cocokkan kata dengan artinya.', 'Kelimeleri anlamlarıyla eşleştirin.', 'Połącz słowa z ich znaczeniami.'),
  build: L('Соберите фразу из целых слов.', 'Складіть фразу з цілих слів.', 'Construye la frase con palabras enteras.', 'Monte a frase com palavras inteiras.', 'Ghép câu bằng các từ hoàn chỉnh.', 'Susun kalimat dari kata-kata utuh.', 'Cümleyi bütün kelimelerle kurun.', 'Ułóż zdanie z całych słów.'),
});
const modeLocalized = (english: string, localized: ReturnType<typeof L>) => ({ en: english, ...localized });
const choiceFeedback = (answer: string, options: readonly string[]) => options.map((value, index) => ({ responseId: `s10:${answer}:${index}`, correct: value === answer, testedDimension: value === answer ? 'exact' : `contrast:${value}`, feedbackByLocale: modeLocalized(value === answer ? `${answer} is correct.` : `${value} is not ${answer}; choose ${answer}.`, C(value === answer ? `${answer} is correct.` : `${value} is not ${answer}; choose ${answer}.`)) }));
const phraseMeaning = (index: number) => modeLocalized(
  (phrases[index] as any).english,
  Object.fromEntries(Object.entries((phrases[index] as any).localizedDetails).map(([locale, detail]: any) => [locale, detail.meaning])) as ReturnType<typeof L>,
);
const withEnglishFeedback = <T extends readonly any[]>(entries: T, englishByResponseId: Readonly<Record<string, string>>) => entries.map((entry) => ({
  ...entry,
  feedbackByLocale: modeLocalized(englishByResponseId[entry.responseId] ?? 'Choose the exact answer for this task.', entry.feedbackByLocale),
}));
const oldListenFeedback = [
  { responseId: 's10:old:0', correct: true, testedDimension: 'meaning:old', feedbackByLocale: L('Верно: old — «старый».', 'Правильно: old — «старий».', 'Correcto: old significa «mayor».', 'Certo: old significa «idoso».', 'Đúng: old nghĩa là «lớn tuổi».', 'Benar: old berarti «tua».', 'Doğru: old «yaşlı» demektir.', 'Dobrze: old znaczy «stary».') },
  { responseId: 's10:old:1', correct: false, testedDimension: 'meaning:old_vs_kind', feedbackByLocale: L('Вы выбрали kind — «добрый». В аудио звучит old: описание возраста, не характера.', 'Ви вибрали kind — «добрий». В аудіо звучить old: це вік, а не характер.', 'Elegiste kind, «amable». En el audio suena old: habla de edad, no de carácter.', 'Você escolheu kind, «gentil». No áudio é old: fala da idade, não do caráter.', 'Bạn chọn kind, «tốt bụng». Âm thanh là old: nói về tuổi, không phải tính cách.', 'Kamu memilih kind, «baik». Audio mengatakan old: ini umur, bukan sifat.', 'Kind «nazik» demektir. Seste old duyulur: karakter değil, yaş anlatılır.', 'Wybrano kind, «miły». W nagraniu jest old: chodzi o wiek, nie o charakter.') },
  { responseId: 's10:old:2', correct: false, testedDimension: 'meaning:old_vs_funny', feedbackByLocale: L('Вы выбрали funny — «смешной». В аудио old: это «старый», не «смешной».', 'Ви вибрали funny — «смішний». В аудіо old: це «старий», не «смішний».', 'Elegiste funny, «divertido». El audio dice old: «mayor», no «divertido».', 'Você escolheu funny, «engraçado». O áudio diz old: «idoso», não «engraçado».', 'Bạn chọn funny, «vui tính». Âm thanh là old: «lớn tuổi», không phải «vui tính».', 'Kamu memilih funny, «lucu». Audio mengatakan old: «tua», bukan «lucu».', 'Funny «komik» demektir. Seste old var: «yaşlı», «komik» değil.', 'Wybrano funny, «zabawny». W nagraniu jest old: «stary», nie «zabawny».') },
  { responseId: 's10:old:3', correct: false, testedDimension: 'meaning:old_vs_ready', feedbackByLocale: L('Вы выбрали ready — «готов». В аудио old: возраст, а не готовность.', 'Ви вибрали ready — «готовий». В аудіо old: це вік, а не готовність.', 'Elegiste ready, «listo». El audio dice old: edad, no preparación.', 'Você escolheu ready, «pronto». O áudio diz old: idade, não preparação.', 'Bạn chọn ready, «sẵn sàng». Âm thanh là old: tuổi, không phải sự sẵn sàng.', 'Kamu memilih ready, «siap». Audio mengatakan old: umur, bukan kesiapan.', 'Ready «hazır» demektir. Seste old var: hazırlık değil, yaş anlatılır.', 'Wybrano ready, «gotowy». W nagraniu jest old: wiek, nie gotowość.') },
] as const;
const funnyGapFeedback = [
  { responseId: 's10:funny:0', correct: true, testedDimension: 'scene:funny', feedbackByLocale: L('Верно: в этой сцене она смешная — funny.', 'Правильно: у цій сцені вона смішна — funny.', 'Correcto: en esta escena ella es divertida — funny.', 'Certo: nesta cena ela é engraçada — funny.', 'Đúng: trong tình huống này cô ấy vui tính — funny.', 'Benar: dalam situasi ini dia lucu — funny.', 'Doğru: bu sahnede o komik — funny.', 'Dobrze: w tej scenie ona jest zabawna — funny.') },
  { responseId: 's10:funny:1', correct: false, testedDimension: 'scene:funny_vs_old', feedbackByLocale: L('Вы выбрали old — «старый». Сцена говорит, что она смешная, поэтому нужен funny.', 'Ви вибрали old — «старий». Сцена каже, що вона смішна, тому потрібне funny.', 'Elegiste old, «mayor». La escena dice que ella es divertida, por eso corresponde funny.', 'Você escolheu old, «idosa». A cena diz que ela é engraçada, então é funny.', 'Bạn chọn old, «lớn tuổi». Tình huống nói cô ấy vui tính, nên cần funny.', 'Kamu memilih old, «tua». Situasinya mengatakan dia lucu, jadi pilih funny.', 'Old «yaşlı» demektir. Sahne onun komik olduğunu söylüyor; funny gerekir.', 'Wybrano old, «stara». Scena mówi, że ona jest zabawna, więc potrzebne jest funny.') },
  { responseId: 's10:funny:2', correct: false, testedDimension: 'scene:funny_vs_kind', feedbackByLocale: L('Вы выбрали kind — «добрая». Сцена проверяет «смешная», поэтому нужен funny.', 'Ви вибрали kind — «добра». Сцена перевіряє «смішна», тому потрібне funny.', 'Elegiste kind, «amable». La escena comprueba «divertida», por eso va funny.', 'Você escolheu kind, «gentil». A cena pede «engraçada», então vai funny.', 'Bạn chọn kind, «tốt bụng». Tình huống kiểm tra «vui tính», nên là funny.', 'Kamu memilih kind, «baik». Situasi menanyakan «lucu», jadi pilih funny.', 'Kind «nazik» demektir. Sahne «komik»i soruyor; funny gerekir.', 'Wybrano kind, «miła». Scena sprawdza «zabawna», więc potrzebne jest funny.') },
  { responseId: 's10:funny:3', correct: false, testedDimension: 'scene:funny_vs_ready', feedbackByLocale: L('Вы выбрали ready — «готова». Сцена проверяет «смешная», поэтому нужен funny.', 'Ви вибрали ready — «готова». Сцена перевіряє «смішна», тому потрібне funny.', 'Elegiste ready, «lista». La escena comprueba «divertida», por eso va funny.', 'Você escolheu ready, «pronta». A cena pede «engraçada», então vai funny.', 'Bạn chọn ready, «sẵn sàng». Tình huống kiểm tra «vui tính», nên là funny.', 'Kamu memilih ready, «siap». Situasi menanyakan «lucu», jadi pilih funny.', 'Ready «hazır» demektir. Sahne «komik»i soruyor; funny gerekir.', 'Wybrano ready, «gotowa». Scena sprawdza «zabawna», więc potrzebne jest funny.') },
] as const;
const modeNativePractice = [
  { family: 'listen_choose', instruction: instructionCopy.listen, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: { family: 'listen_choose', referenceAudio: { audioTargetId: 'e01-s10-old', transcript: 'old' }, slowReferenceAudio: { audioTargetId: 'e01-s10-old-slow', transcript: 'old' }, localizedMeaningChoices: ['old', 'kind', 'funny', 'ready'].map((targetText, index) => ({ responseId: `s10:old:${index}`, targetText, meaningByLocale: null })), transcriptRevealPolicy: 'after_first_attempt', choiceFeedback: withEnglishFeedback(oldListenFeedback, { 's10:old:0': 'Correct: old describes age.', 's10:old:1': 'Kind means good-natured. The audio says old, which describes age.', 's10:old:2': 'Funny means amusing. The audio says old, which describes age.', 's10:old:3': 'Ready means prepared. The audio says old, which describes age.' }) } },
  { family: 'scripted_repeat_compare', instruction: C('Listen, say it, and compare.'), purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 1 }, modePayload: { family: 'scripted_repeat_compare', referenceAudio: { audioTargetId: 'e01-s10-kind', transcript: 'kind' }, slowReferenceAudio: { audioTargetId: 'e01-s10-kind-slow', transcript: 'kind' }, targetPhrase: 'kind', recordControlPolicy: 'hold_press_release_with_accessible_toggle', modelPlayback: 'reference_and_slow', learnerPlayback: 'available_after_capture', honestOutcomeStates: ['PASS_CONFIDENT', 'NEEDS_WORK_CONFIDENT', 'UNCERTAIN', 'INVALID_AUDIO_OR_SYSTEM'] } },
  { family: 'context_gap_grammar', instruction: C('Choose the description.'), purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 2 }, modePayload: { family: 'context_gap_grammar', localizedScene: phraseMeaning(2), gappedTargetPhrase: 'She is ___', gapOptions: ['funny', 'old', 'kind', 'ready'].map((text, index) => ({ responseId: `s10:funny:${index}`, text })), testedDimension: 'description:funny', choiceFeedback: withEnglishFeedback(funnyGapFeedback, { 's10:funny:0': 'Correct: the scene says she is funny.', 's10:funny:1': 'Old describes age. This scene says she is funny.', 's10:funny:2': 'Kind describes character. This scene says she is funny.', 's10:funny:3': 'Ready means prepared. This scene says she is funny.' }) } },
  { family: 'listen_build_dictation', instruction: C('Listen and build the phrase.'), purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: { family: 'listen_build_dictation', referenceAudio: { audioTargetId: 'e01-s10-she-old', transcript: 'She is old' }, slowReferenceAudio: { audioTargetId: 'e01-s10-she-old-slow', transcript: 'She is old' }, hiddenTargetPhrase: 'She is old', orderedTokens: ['She', 'is', 'old'], authoredDistractorTokens: ['He', 'kind', 'funny'], slotFeedback: choiceFeedback('She is old', ['She is old', 'He is old', 'She is kind']) } },
  { family: 'speed_match', instruction: C('Match the words and meanings.'), purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: { family: 'speed_match', pairGrid: vocabulary.map((item: any, index) => ({ pairId: `s10:${index}`, target: item.target, meaningByLocale: modeLocalized(item.target, item.meaning) })), leftColumn: ['s10:2', 's10:0', 's10:1'], rightColumn: ['s10:1', 's10:2', 's10:0'], pairingKey: 'pair_id', timerPolicy: { enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true }, finishStats: ['speed', 'accuracy', 'personal_best'] } },
  { family: 'phrase_builder', instruction: C('Build the phrase from whole words.'), purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: { family: 'phrase_builder', targetPhrase: 'She is ready', localizedMeaning: phraseMeaning(3), orderedTokens: ['She', 'is', 'ready'], authoredDistractorTokens: ['He', 'old', 'funny'], slotFeedback: choiceFeedback('She is ready', ['She is ready', 'He is ready', 'She is funny']) } },
] as any[];

export const EPISODE_01_SESSION_10_SOURCE: SessionSource = Object.freeze({
  ...APPROVED_FIRST_TEN_SESSION_SOURCES_V2[9]!,
  generationInputFingerprint: 'full-b1-exact-i-am-he-she-it-is-e01-s10-v2',
  sessionKindOverride: 'words_then_phrases',
  distractorAuthorship: 'manual',
  reviewConstructIds: ['affirmative_self_statement', 'affirmative_third_person_statement'],
  title: L('Она и он: новые описания', 'Вона й він: нові описи', 'Ella y él: descripciones nuevas', 'Ela e ele: novas descrições', 'Cô ấy và anh ấy: mô tả mới', 'Dia dan dia: deskripsi baru', 'O ve o: yeni tanımlar', 'Ona i on: nowe opisy'),
  summary: L('Новые слова old, kind и funny работают с уже знакомыми she is и he is.', 'Нові слова old, kind і funny працюють із уже знайомими she is та he is.', 'Las palabras old, kind y funny se usan con she is y he is.', 'As palavras old, kind e funny são usadas com she is e he is.', 'Các từ old, kind và funny dùng với she is và he is.', 'Kata old, kind, dan funny dipakai dengan she is dan he is.', 'Old, kind ve funny sözcükleri she is ve he is ile kullanılır.', 'Słowa old, kind i funny działają z she is i he is.'),
  learningGoal: L('Узнать old, kind и funny и описать другого человека через he is или she is.', 'Упізнати old, kind і funny та описати іншу людину через he is або she is.', 'Reconocer old, kind y funny y describir a otra persona con he is o she is.', 'Reconhecer old, kind e funny e descrever outra pessoa com he is ou she is.', 'Nhận ra old, kind và funny rồi mô tả người khác bằng he is hoặc she is.', 'Mengenali old, kind, dan funny lalu menggambarkan orang lain dengan he is atau she is.', 'Old, kind ve funny sözcüklerini tanıyıp başka birini he is ya da she is ile tanımlamak.', 'Rozpoznać old, kind i funny oraz opisać inną osobę przez he is albo she is.'),
  introPages: intro as any,
  newVocabulary: vocabulary as any,
  phrases: phrases as any,
  modeNativePlanId: LESSON1_SESSION_10_MODE_NATIVE_PLAN_ID_V2,
  modeNativePractice,
});
