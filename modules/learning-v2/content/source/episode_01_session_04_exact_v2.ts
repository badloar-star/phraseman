/**
 * Dedicated Full B1 learner-facing source for Session 4.
 *
 * This intentionally has no dependency on the historical `You are` pack.
 * Each practice step has a different target/family pairing; the single grid
 * is the only Speed Match in the session.
 */
import type { LearningV2Localized } from '../generator_course_contract';
import type {
  LearningV2ModeAudioReferenceV1,
  LearningV2ModeChoiceFeedbackV1,
  LearningV2ModeNativePayloadV1,
} from '../../contracts/mode_native_payload_v1';
import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import {
  expandLocalized,
  type LocalizedSource,
  type SessionModeNativePracticeSourceV1,
  type SessionSourceIntroPage,
  type SessionVocabularySourceV1,
} from './session_shard_from_source_v1';
import {
  EPISODE_01_SESSION_04_EXACT_GOAL_V2,
  EPISODE_01_SESSION_04_EXACT_SUMMARY_V2,
  EPISODE_01_SESSION_04_EXACT_TITLE_V2,
  EPISODE_01_SESSION_04_EXACT_WORDS_V2,
} from './episode_01_session_04_content_v2';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const L = (value: LocalizedSource): LearningV2Localized<string> => expandLocalized(value);
const word = (value: string): LocalizedSource => ({ ru: value, uk: value, es: value, 'pt-BR': value, vi: value, id: value, tr: value, pl: value });
const audio = (audioTargetId: string, transcript: string): LearningV2ModeAudioReferenceV1 => ({ audioTargetId, transcript });
const feedback = (responseId: string, correct: boolean, testedDimension: string, feedbackByLocale: LearningV2Localized<string>): LearningV2ModeChoiceFeedbackV1 => ({ responseId, correct, testedDimension, feedbackByLocale });

const vocabularyCopy = Object.freeze({
  hungry: {
    recognize: { ru: 'Услышьте hungry: это состояние, когда хочется есть.', uk: 'Почуйте hungry: це стан, коли хочеться їсти.', es: 'Escucha hungry: es el estado de querer comer.', 'pt-BR': 'Ouça hungry: é o estado de querer comer.', vi: 'Nghe hungry: đây là trạng thái muốn ăn.', id: 'Dengarkan hungry: ini keadaan ingin makan.', tr: 'Hungry sözcüğünü duyun: yemek isteme durumudur.', pl: 'Usłysz hungry: to stan, gdy chce się jeść.' },
    meaning: { ru: 'Выберите слово для состояния «голоден».', uk: 'Оберіть слово для стану «голодний».', es: 'Elige la palabra para el estado «hambriento».', 'pt-BR': 'Escolha a palavra para o estado «com fome».', vi: 'Chọn từ cho trạng thái “đói”.', id: 'Pilih kata untuk keadaan “lapar”.', tr: '“Aç” durumu için sözcüğü seçin.', pl: 'Wybierz słowo dla stanu „głodny”.' },
    form: { ru: 'Выберите целое слово hungry.', uk: 'Оберіть ціле слово hungry.', es: 'Elige la palabra completa hungry.', 'pt-BR': 'Escolha a palavra inteira hungry.', vi: 'Chọn cả từ hungry.', id: 'Pilih kata lengkap hungry.', tr: 'Hungry sözcüğünün tamamını seçin.', pl: 'Wybierz całe słowo hungry.' },
  },
  thirsty: {
    recognize: { ru: 'Услышьте thirsty: это состояние, когда хочется пить.', uk: 'Почуйте thirsty: це стан, коли хочеться пити.', es: 'Escucha thirsty: es el estado de querer beber.', 'pt-BR': 'Ouça thirsty: é o estado de querer beber.', vi: 'Nghe thirsty: đây là trạng thái muốn uống.', id: 'Dengarkan thirsty: ini keadaan ingin minum.', tr: 'Thirsty sözcüğünü duyun: içmek isteme durumudur.', pl: 'Usłysz thirsty: to stan, gdy chce się pić.' },
    meaning: { ru: 'Выберите слово для состояния «хочется пить».', uk: 'Оберіть слово для стану «хочеться пити».', es: 'Elige la palabra para «tener sed».', 'pt-BR': 'Escolha a palavra para «estar com sede».', vi: 'Chọn từ cho trạng thái “khát”.', id: 'Pilih kata untuk keadaan “haus”.', tr: '“Susamış” durumu için sözcüğü seçin.', pl: 'Wybierz słowo dla stanu „spragniony”.' },
    form: { ru: 'Выберите целое слово thirsty.', uk: 'Оберіть ціле слово thirsty.', es: 'Elige la palabra completa thirsty.', 'pt-BR': 'Escolha a palavra inteira thirsty.', vi: 'Chọn cả từ thirsty.', id: 'Pilih kata lengkap thirsty.', tr: 'Thirsty sözcüğünün tamamını seçin.', pl: 'Wybierz całe słowo thirsty.' },
  },
  sick: {
    recognize: { ru: 'Услышьте sick: это состояние, когда человек болен.', uk: 'Почуйте sick: це стан, коли людина хвора.', es: 'Escucha sick: es el estado de estar enfermo.', 'pt-BR': 'Ouça sick: é o estado de estar doente.', vi: 'Nghe sick: đây là trạng thái bị ốm.', id: 'Dengarkan sick: ini keadaan sedang sakit.', tr: 'Sick sözcüğünü duyun: hasta olma durumudur.', pl: 'Usłysz sick: to stan, gdy ktoś jest chory.' },
    meaning: { ru: 'Выберите слово для состояния «болен».', uk: 'Оберіть слово для стану «хворий».', es: 'Elige la palabra para el estado «enfermo».', 'pt-BR': 'Escolha a palavra para o estado «doente».', vi: 'Chọn từ cho trạng thái “ốm”.', id: 'Pilih kata untuk keadaan “sakit”.', tr: '“Hasta” durumu için sözcüğü seçin.', pl: 'Wybierz słowo dla stanu „chory”.' },
    form: { ru: 'Выберите целое слово sick.', uk: 'Оберіть ціле слово sick.', es: 'Elige la palabra completa sick.', 'pt-BR': 'Escolha a palavra inteira sick.', vi: 'Chọn cả từ sick.', id: 'Pilih kata lengkap sick.', tr: 'Sick sözcüğünün tamamını seçin.', pl: 'Wybierz całe słowo sick.' },
  },
} satisfies Record<string, Record<string, LocalizedSource>>);

const wordDistractors = Object.freeze({ hungry: ['happy', 'thirsty', 'sick'], thirsty: ['hungry', 'thirteen', 'sick'], sick: ['six', 'thick', 'hungry'] } as const);
function distractorFeedback(target: string, wrong: string): LocalizedSource {
  return {
    ru: `${wrong} не называет состояние «${target}». Здесь нужно ${target}.`, uk: `${wrong} не називає стан «${target}». Тут потрібне ${target}.`, es: `${wrong} no nombra este estado; aquí se necesita ${target}.`, 'pt-BR': `${wrong} não nomeia esse estado; aqui é preciso ${target}.`, vi: `${wrong} không gọi tên trạng thái này; ở đây cần ${target}.`, id: `${wrong} bukan nama keadaan ini; di sini perlu ${target}.`, tr: `${wrong} bu durumu adlandırmaz; burada ${target} gerekir.`, pl: `${wrong} nie nazywa tego stanu; tutaj potrzebne jest ${target}.`,
  };
}
function vocabularyItem(index: number): SessionVocabularySourceV1 {
  const item = EPISODE_01_SESSION_04_EXACT_WORDS_V2[index]!;
  const copy = vocabularyCopy[item.target]!;
  const distractors = wordDistractors[item.target as keyof typeof wordDistractors];
  const contact = (stage: 'recognize' | 'retrieve_meaning' | 'build_form', guidance: LocalizedSource) => ({ guidance, distractors: distractors.map((value, position) => ({ value, reasonCode: `${item.target}:${stage}:${position}`, trapType: position === 1 ? 'phonetic' as const : 'semantic_neighbor' as const, feedback: distractorFeedback(item.target, value) })) });
  return { id: item.id, target: item.target, meaning: item.meaning, features: ['state_adjective', 'first_person_state'], contacts: { recognize: contact('recognize', copy.recognize), retrieve_meaning: contact('retrieve_meaning', copy.meaning), build_form: contact('build_form', copy.form) } };
}
export const EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2 = Object.freeze([vocabularyItem(0), vocabularyItem(1), vocabularyItem(2)]);

type PhraseKey = 'hungry' | 'thirsty' | 'sick' | 'here' | 'ready' | 'happy' | 'fine';
const phraseMeanings: Record<PhraseKey, LocalizedSource> = {
  hungry: { ru: 'Я голоден', uk: 'Я голодний', es: 'Tengo hambre', 'pt-BR': 'Estou com fome', vi: 'Tôi đói', id: 'Saya lapar', tr: 'Açım', pl: 'Jestem głodny' },
  thirsty: { ru: 'Мне хочется пить', uk: 'Мені хочеться пити', es: 'Tengo sed', 'pt-BR': 'Estou com sede', vi: 'Tôi khát', id: 'Saya haus', tr: 'Susadım', pl: 'Chce mi się pić' },
  sick: { ru: 'Я болен', uk: 'Я хворий', es: 'Estoy enfermo', 'pt-BR': 'Estou doente', vi: 'Tôi bị ốm', id: 'Saya sakit', tr: 'Hastayım', pl: 'Jestem chory' },
  here: { ru: 'Я здесь', uk: 'Я тут', es: 'Estoy aquí', 'pt-BR': 'Estou aqui', vi: 'Tôi ở đây', id: 'Saya di sini', tr: 'Buradayım', pl: 'Jestem tutaj' },
  ready: { ru: 'Я готов', uk: 'Я готовий', es: 'Estoy listo', 'pt-BR': 'Estou pronto', vi: 'Tôi sẵn sàng', id: 'Saya siap', tr: 'Hazırım', pl: 'Jestem gotowy' },
  happy: { ru: 'Я счастлив', uk: 'Я щасливий', es: 'Estoy feliz', 'pt-BR': 'Estou feliz', vi: 'Tôi vui', id: 'Saya vui', tr: 'Mutluyum', pl: 'Jestem szczęśliwy' },
  fine: { ru: 'Со мной всё хорошо', uk: 'Зі мною все добре', es: 'Estoy bien', 'pt-BR': 'Estou bem', vi: 'Tôi ổn', id: 'Saya baik-baik saja', tr: 'İyiyim', pl: 'Mam się dobrze' },
};
const phraseOrder: readonly PhraseKey[] = ['hungry', 'thirsty', 'sick', 'here', 'ready', 'happy', 'fine'];
function phrase(key: PhraseKey): EpisodeSourcePhrase {
  const english = `I am ${key}`;
  const candidates = phraseOrder.filter((candidate) => candidate !== key);
  const offset = phraseOrder.indexOf(key) % candidates.length;
  const options = [...candidates.slice(offset), ...candidates.slice(0, offset)].slice(0, 3);
  const localizedDetails = Object.fromEntries(LOCALES.map((locale) => {
    const meaning = phraseMeanings[key][locale];
    const why = (value: string) => `${value} is a different state; this phrase needs ${key}, not ${value}.`;
    const iReason = (value: string) => `${value} cannot name the speaker here; the correct first word is I, not ${value}.`;
    const amReason = (value: string) => `${value} cannot follow I in this sentence; the correct link after I is am, not ${value}.`;
    return [locale, { meaning, explanation: `Say ${english} when this is your state. I names the speaker and am links that speaker to ${key}.`, distractors: [{ value: 'am', reason: 'The correct phrase keeps I before am, not am as a replacement for I.', trapType: 'grammar' as const }, { value: 'is', reason: 'The correct phrase uses I am; is cannot replace am after I.', trapType: 'grammar' as const }, ...options.map((value) => ({ value, reason: why(value), trapType: 'semantic_neighbor' as const }))], words: [ { correct: 'I', prompt: 'Choose I.', distractors: [{ value: 'you', reason: iReason('you'), trapType: 'grammar' as const }, { value: 'me', reason: iReason('me'), trapType: 'grammar' as const }, { value: 'my', reason: iReason('my'), trapType: 'grammar' as const }] }, { correct: 'am', prompt: 'Choose the word after I.', distractors: [{ value: 'is', reason: amReason('is'), trapType: 'grammar' as const }, { value: 'are', reason: amReason('are'), trapType: 'grammar' as const }, { value: 'an', reason: amReason('an'), trapType: 'grammar' as const }] }, { correct: key, prompt: 'Choose the exact state.', distractors: options.map((value) => ({ value, reason: why(value), trapType: 'semantic_neighbor' as const })) } ] }];
  })) as NonNullable<EpisodeSourcePhrase['localizedDetails']>;
  return { id: `e01-s04-phrase-${key}`, english, russian: phraseMeanings[key].ru, explanation: `Say ${english} when this is your state and another person needs to understand how you are. I names the speaker, so the message is about you rather than a listener. Am is the fixed link after I, and ${key} supplies the exact state without changing that order.`, words: [{ correct: 'I', category: 'first_person_pronoun', distractors: ['you', 'me', 'my'].map((value) => ({ value, reasonCode: `speaker:not_${value}`, trapType: 'grammar' as const, why: `${value} does not name the speaker here; the correct word is I, not ${value}.` })) }, { correct: 'am', category: 'copula', distractors: ['is', 'are', 'an'].map((value) => ({ value, reasonCode: `copula:not_${value}`, trapType: 'grammar' as const, why: `${value} cannot follow I in this sentence; the correct link is am, not ${value}.` })) }, { correct: key, category: 'state_adjective', distractors: options.map((value) => ({ value, reasonCode: `state:not_${key}`, trapType: 'semantic_neighbor' as const, why: `${value} is a different state; the correct word is ${key}, not ${value}.` })) }], localizedDetails, features: ['copula_be', 'first_person_singular', 'affirmative_state'] };
}
export const EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2 = Object.freeze(phraseOrder.map(phrase));

const page = (kind: SessionSourceIntroPage['kind'], title: LocalizedSource, body: LocalizedSource, testedDimension: string, choices: readonly [string, string, string], correctChoiceIndex: 0 | 1 | 2, explanation: LocalizedSource): SessionSourceIntroPage => {
  const correct = choices[correctChoiceIndex];
  const groundedBody = Object.fromEntries(LOCALES.map((locale) => [locale, `${body[locale]!} ${correct}.`])) as LocalizedSource;
  const causalExplanation = Object.fromEntries(LOCALES.map((locale) => [locale, `${explanation[locale]!} ${correct} is correct because it follows the order explained above.`])) as LocalizedSource;
  return { kind, title, body: groundedBody, bodyRuns: Object.fromEntries(LOCALES.map((locale) => [locale, [{ text: groundedBody[locale]!, semantic: 'explanation' as const }]])), question: { grammarFeatureId: 'affirmative_self_statement', testedDimension, prompt: title, choices: [word(choices[0]), word(choices[1]), word(choices[2])], correctChoiceIndex, explanation: causalExplanation } };
};
export const EPISODE_01_SESSION_04_EXACT_INTRO_V2 = Object.freeze([
  page('concept', { ru: 'Скажи о своём состоянии', uk: 'Скажи про свій стан', es: 'Di tu estado', 'pt-BR': 'Diga seu estado', vi: 'Nói về trạng thái của bạn', id: 'Katakan keadaanmu', tr: 'Durumunu söyle', pl: 'Powiedz o swoim stanie' }, { ru: 'I am уже называет говорящего. После него можно назвать новое состояние: hungry, thirsty или sick.', uk: 'I am уже називає мовця. Після нього можна назвати новий стан: hungry, thirsty або sick.', es: 'I am ya nombra a quien habla. Después puedes añadir hungry, thirsty o sick.', 'pt-BR': 'I am já nomeia quem fala. Depois você pode acrescentar hungry, thirsty ou sick.', vi: 'I am đã chỉ người nói. Sau đó có thể thêm hungry, thirsty hoặc sick.', id: 'I am sudah menyebut penutur. Setelahnya dapat ditambah hungry, thirsty, atau sick.', tr: 'I am zaten konuşanı gösterir. Ardından hungry, thirsty ya da sick eklenebilir.', pl: 'I am już wskazuje mówiącego. Potem można dodać hungry, thirsty albo sick.' }, 'new_state_after_i_am', ['hungry', 'you', 'is'], 0, { ru: 'Hungry — новое состояние после I am.', uk: 'Hungry — новий стан після I am.', es: 'Hungry es un estado nuevo después de I am.', 'pt-BR': 'Hungry é um novo estado depois de I am.', vi: 'Hungry là trạng thái mới sau I am.', id: 'Hungry adalah keadaan baru setelah I am.', tr: 'Hungry, I am sonrasındaki yeni durumdur.', pl: 'Hungry to nowy stan po I am.' }),
  page('formula', { ru: 'I am + состояние', uk: 'I am + стан', es: 'I am + estado', 'pt-BR': 'I am + um estado', vi: 'I am + trạng thái', id: 'I am + keadaan', tr: 'I am + durum', pl: 'I am + stan' }, { ru: 'Сохрани I am и добавь одно состояние. Так получается I am thirsty.', uk: 'Збережи I am і додай один стан. Так виходить I am thirsty.', es: 'Conserva I am y añade un estado. Así se forma I am thirsty.', 'pt-BR': 'Mantenha I am e acrescente um estado. Assim se forma I am thirsty.', vi: 'Giữ I am rồi thêm một trạng thái. Ta có I am thirsty.', id: 'Pertahankan I am lalu tambah satu keadaan. Hasilnya I am thirsty.', tr: 'I am yapısını koru ve bir durum ekle. I am thirsty böyle olur.', pl: 'Zachowaj I am i dodaj jeden stan. Tak powstaje I am thirsty.' }, 'affirmative_i_am_order', ['I am thirsty', 'I thirsty am', 'I is thirsty'], 0, { ru: 'После I идёт am, затем состояние.', uk: 'Після I йде am, потім стан.', es: 'Después de I va am y luego el estado.', 'pt-BR': 'Depois de I vem am e depois o estado.', vi: 'Sau I là am rồi đến trạng thái.', id: 'Setelah I ada am, lalu keadaan.', tr: 'I sonrasında am, sonra durum gelir.', pl: 'Po I jest am, a potem stan.' }),
  page('trap', { ru: 'Не меняй am', uk: 'Не змінюй am', es: 'No cambies am', 'pt-BR': 'Não mude am', vi: 'Đừng đổi am', id: 'Jangan ubah am', tr: 'Am sözcüğünü değiştirme', pl: 'Nie zmieniaj am' }, { ru: 'Sick — новое состояние, но начало остаётся I am. I is sick не подходит к I.', uk: 'Sick — новий стан, але початок лишається I am. I is sick не підходить до I.', es: 'Sick es nuevo, pero el inicio sigue siendo I am. I is sick no corresponde a I.', 'pt-BR': 'Sick é novo, mas o início continua I am. I is sick não combina com I.', vi: 'Sick là từ mới, nhưng phần đầu vẫn là I am. I is sick không đi với I.', id: 'Sick adalah kata baru, tetapi awalnya tetap I am. I is sick tidak cocok dengan I.', tr: 'Sick yenidir ama başlangıç I am olarak kalır. I is sick, I ile kullanılmaz.', pl: 'Sick jest nowe, ale początek pozostaje I am. I is sick nie pasuje do I.' }, 'i_am_not_is', ['I am sick', 'I is sick', 'I are sick'], 0, { ru: 'Только am соединяется с I в этой фразе.', uk: 'Лише am поєднується з I в цій фразі.', es: 'Solo am se une con I en esta frase.', 'pt-BR': 'Somente am se liga a I nesta frase.', vi: 'Chỉ am đi với I trong câu này.', id: 'Hanya am yang dipakai dengan I di kalimat ini.', tr: 'Bu cümlede I ile yalnız am kullanılır.', pl: 'W tym zdaniu z I łączy się tylko am.' }),
] as const);

const instruction = (_ru: string): LocalizedSource => ({ ru: 'Выполните задание.', uk: 'Виконайте завдання.', es: 'Completa la actividad.', 'pt-BR': 'Conclua a atividade.', vi: 'Hoàn thành hoạt động.', id: 'Selesaikan kegiatan.', tr: 'Etkinliği tamamlayın.', pl: 'Wykonaj zadanie.' });
function vocabFeedback(index: number, stage: 'recognize' | 'retrieve_meaning' | 'build_form') { const item = EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2[index]!; const unit = item.contacts[stage]; return [feedback(`${item.id}:${stage}:correct`, true, stage, L(unit.guidance)), ...unit.distractors.map((entry) => feedback(`${item.id}:${stage}:${entry.reasonCode}`, false, `${entry.trapType}:${entry.reasonCode}`, L(entry.feedback)))]; }
function wordListen(index: number): LearningV2ModeNativePayloadV1 { const item = EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2[index]!; return { family: 'listen_choose', referenceAudio: audio(item.id, item.target), slowReferenceAudio: audio(`${item.id}-slow`, item.target), localizedMeaningChoices: [{ responseId: `${item.id}:recognize:correct`, targetText: item.target, meaningByLocale: null }, ...item.contacts.recognize.distractors.map((entry) => ({ responseId: `${item.id}:recognize:${entry.reasonCode}`, targetText: entry.value, meaningByLocale: null }))], transcriptRevealPolicy: 'after_first_attempt', choiceFeedback: vocabFeedback(index, 'recognize') }; }
function wordRepeat(index: number): LearningV2ModeNativePayloadV1 { const item = EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2[index]!; return { family: 'scripted_repeat_compare', referenceAudio: audio(item.id, item.target), slowReferenceAudio: audio(`${item.id}-slow`, item.target), targetPhrase: item.target, recordControlPolicy: 'hold_press_release_with_accessible_toggle', modelPlayback: 'reference_and_slow', learnerPlayback: 'available_after_capture', honestOutcomeStates: ['PASS_CONFIDENT', 'NEEDS_WORK_CONFIDENT', 'UNCERTAIN', 'INVALID_AUDIO_OR_SYSTEM'] }; }
function wordGap(index: number, stage: 'retrieve_meaning' | 'build_form'): LearningV2ModeNativePayloadV1 { const item = EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2[index]!; const unit = item.contacts[stage]; return { family: 'context_gap_grammar', localizedScene: L(item.meaning), gappedTargetPhrase: '___', gapOptions: [{ responseId: `${item.id}:${stage}:correct`, text: item.target }, ...unit.distractors.map((entry) => ({ responseId: `${item.id}:${stage}:${entry.reasonCode}`, text: entry.value }))], testedDimension: `${stage}:${item.target}`, choiceFeedback: vocabFeedback(index, stage) }; }
function phraseFeedback(index: number) { const item = EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2[index]!; const detail = (field: 'explanation' | 'distractors', value?: string) => Object.fromEntries(LOCALES.map((locale) => [locale, value ? item.localizedDetails![locale]!.distractors.find((entry) => entry.value === value)?.reason ?? item.localizedDetails![locale]!.explanation : item.localizedDetails![locale]!.explanation])) as LearningV2Localized<string>; const wrong = [...new Set(item.words.flatMap((entry) => entry.distractors.map((distractor) => distractor.value)))]; return [feedback(`${item.id}:correct`, true, 'phrase_assembly', detail('explanation')), ...wrong.map((value) => feedback(`${item.id}:wrong:${value}`, false, `phrase:${value}`, detail('distractors', value)))]; }
function phrasePayload(index: number, family: 'phrase_builder' | 'listen_build_dictation' | 'scripted_repeat_compare' | 'listen_choose' | 'context_gap_grammar'): LearningV2ModeNativePayloadV1 { const item = EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2[index]!; const tokens = item.english.split(' '); const choices = phraseOrder.filter((key) => key !== phraseOrder[index]!).slice(0, 3); if (family === 'phrase_builder') return { family, targetPhrase: item.english, localizedMeaning: L(Object.fromEntries(LOCALES.map((locale) => [locale, item.localizedDetails![locale]!.meaning])) as LocalizedSource), orderedTokens: tokens, authoredDistractorTokens: choices, slotFeedback: phraseFeedback(index) }; if (family === 'listen_build_dictation') return { family, referenceAudio: audio(item.id, item.english), slowReferenceAudio: audio(`${item.id}-slow`, item.english), hiddenTargetPhrase: item.english, orderedTokens: tokens, authoredDistractorTokens: choices, slotFeedback: phraseFeedback(index) }; if (family === 'scripted_repeat_compare') return { family, referenceAudio: audio(item.id, item.english), slowReferenceAudio: audio(`${item.id}-slow`, item.english), targetPhrase: item.english, recordControlPolicy: 'hold_press_release_with_accessible_toggle', modelPlayback: 'reference_and_slow', learnerPlayback: 'available_after_capture', honestOutcomeStates: ['PASS_CONFIDENT', 'NEEDS_WORK_CONFIDENT', 'UNCERTAIN', 'INVALID_AUDIO_OR_SYSTEM'] }; if (family === 'listen_choose') { const options = [item.english, ...choices.map((key) => `I am ${key}`)]; return { family, referenceAudio: audio(item.id, item.english), slowReferenceAudio: audio(`${item.id}-slow`, item.english), localizedMeaningChoices: options.map((targetText, option) => ({ responseId: `${item.id}:listen:${option}`, targetText, meaningByLocale: null })), transcriptRevealPolicy: 'after_first_attempt', choiceFeedback: options.map((targetText, option) => feedback(`${item.id}:listen:${option}`, option === 0, option === 0 ? 'exact_phrase' : `contrast:${targetText}`, option === 0 ? L(Object.fromEntries(LOCALES.map((locale) => [locale, item.localizedDetails![locale]!.explanation])) as LocalizedSource) : L(distractorFeedback(item.english, targetText)))) }; } return { family, localizedScene: L(Object.fromEntries(LOCALES.map((locale) => [locale, item.localizedDetails![locale]!.meaning])) as LocalizedSource), gappedTargetPhrase: 'I am ___', gapOptions: [ { responseId: `${item.id}:gap:correct`, text: phraseOrder[index]! }, ...choices.map((key) => ({ responseId: `${item.id}:gap:${key}`, text: key })) ], testedDimension: `state:${phraseOrder[index]}`, choiceFeedback: [feedback(`${item.id}:gap:correct`, true, 'state', L(Object.fromEntries(LOCALES.map((locale) => [locale, item.localizedDetails![locale]!.explanation])) as LocalizedSource)), ...choices.map((key) => feedback(`${item.id}:gap:${key}`, false, `state:${key}`, L(distractorFeedback(phraseOrder[index]!, key))))] }; }

const speedIds = ['s04-hungry', 's04-thirsty', 's04-sick', 's04-here'] as const;
const speedPayload: LearningV2ModeNativePayloadV1 = { family: 'speed_match', pairGrid: [
  ...EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2.map((item, index) => ({ pairId: speedIds[index]!, target: item.target, meaningByLocale: L(item.meaning) })),
  { pairId: speedIds[3], target: 'here', meaningByLocale: L(phraseMeanings.here) },
], leftColumn: [speedIds[2], speedIds[0], speedIds[3], speedIds[1]], rightColumn: [speedIds[1], speedIds[3], speedIds[0], speedIds[2]], pairingKey: 'pair_id', timerPolicy: { enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true }, finishStats: ['speed', 'accuracy', 'personal_best'] };
export const EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2: readonly SessionModeNativePracticeSourceV1[] = Object.freeze([
  { family: 'listen_choose', instruction: instruction('Послушайте и выберите слово.'), purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 1 }, modePayload: wordListen(1) },
  { family: 'scripted_repeat_compare', instruction: instruction('Послушайте, произнесите и сравните.'), purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 2 }, modePayload: wordRepeat(2) },
  { family: 'context_gap_grammar', instruction: instruction('Выберите состояние.'), purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: phrasePayload(0, 'context_gap_grammar') },
  { family: 'listen_build_dictation', instruction: instruction('Послушайте фразу и соберите её.'), purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: phrasePayload(3, 'listen_build_dictation') },
  { family: 'speed_match', instruction: instruction('Соедините слова с их значениями.'), purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'vocabulary_grid', sourceIndices: [0, 1, 2] }, modePayload: speedPayload },
  { family: 'phrase_builder', instruction: instruction('Соберите фразу из целых слов.'), purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 4 }, modePayload: phrasePayload(4, 'phrase_builder') },
]);

export { EPISODE_01_SESSION_04_EXACT_TITLE_V2, EPISODE_01_SESSION_04_EXACT_SUMMARY_V2, EPISODE_01_SESSION_04_EXACT_GOAL_V2 };
