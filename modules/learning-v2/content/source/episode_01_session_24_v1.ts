/** Full B1 Session 24: chapter checkpoint, retrieval only. */
import { EPISODE_01_SESSION_16_SOURCE } from './episode_01_session_16_v1';
import { LESSON1_SESSION_08_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const authored = clone(EPISODE_01_SESSION_16_SOURCE) as any;
authored.requiredSessionOrdinal = 24;
authored.generationInputFingerprint = 'full-b1-exact-you-we-they-checkpoint-e01-s24-v1';
authored.sessionKindOverride = 'checkpoint';
authored.newVocabulary = [];
authored.newVocabularyExceptionReason = 'checkpoint_retrieval_only';
authored.reviewConstructIds = ['affirmative_you_we_they'];
authored.modeNativePlanId = LESSON1_SESSION_08_MODE_NATIVE_PLAN_ID_V2;
authored.title = L('Проверь: are', 'Перевір: are', 'Comprueba: are', 'Confira: are', 'Kiểm tra: are', 'Periksa: are', 'Kontrol et: are', 'Sprawdź: are');
authored.summary = L('Вспомни знакомые утвердительные фразы в новом порядке.', 'Згадай знайомі ствердні фрази в новому порядку.', 'Recuerda frases afirmativas conocidas en otro orden.', 'Lembre frases afirmativas conhecidas em outra ordem.', 'Nhớ lại các câu khẳng định quen thuộc theo thứ tự mới.', 'Ingat kalimat afirmatif yang dikenal dalam urutan baru.', 'Bilinen olumlu cümleleri yeni sırayla hatırla.', 'Przypomnij sobie znane zdania twierdzące w nowej kolejności.');
authored.learningGoal = L('Самостоятельно восстановить знакомую утвердительную фразу.', 'Самостійно відновити знайому ствердну фразу.', 'Reconstruir de forma autónoma una frase afirmativa conocida.', 'Reconstruir de forma autônoma uma frase afirmativa conhecida.', 'Tự khôi phục một câu khẳng định quen thuộc.', 'Membangun kembali kalimat afirmatif yang dikenal secara mandiri.', 'Bilinen bir olumlu cümleyi bağımsız olarak yeniden kurmak.', 'Samodzielnie odtworzyć znane zdanie twierdzące.');
const phrases = ['I am safe', 'He is lucky', 'It is clean', 'You are welcome', 'We are together', 'They are married', 'I am ready', 'She is famous', 'It is easy', 'You are early', 'We are careful', 'They are different', 'I am fine', 'He is rich', 'They are single'];
const subjects = ['I', 'He', 'It', 'You', 'We', 'They', 'She'];
const endings = phrases.map((phrase) => phrase.split(' ')[2]!);
const distractorsFor = (correct: string, position: number, phraseIndex: number) => {
  const pool = position === 0
    ? subjects.filter((value) => value !== correct)
    : position === 1
      ? ['am', 'is', 'are', 'be'].filter((value) => value !== correct)
      : endings.filter((value) => value !== correct);
  const start = position === 0 ? phraseIndex * 2 : phraseIndex;
  const values = Array.from({ length: 3 }, (_, offset) => pool[(start + offset) % pool.length]!);
  return values.map((value, optionIndex) => ({
    value,
    reasonCode: `s24:${phraseIndex}:${position}:${correct}:not:${value}:${optionIndex}`,
    trapType: position === 1 ? 'grammar' : 'semantic_neighbor',
    why: `${value} is not the exact word in this phrase; ${correct} is required here.`,
    reason: `${value} is not the exact word in this phrase; ${correct} is required here.`,
  }));
};
while (authored.phrases.length < phrases.length) authored.phrases.push(clone(authored.phrases[0]));
for (const [index, english] of phrases.entries()) {
  const phrase = authored.phrases[index]!;
  phrase.id = `e01-s24-${english.toLowerCase().replaceAll(' ', '-')}`;
  phrase.english = english;
  phrase.russian = english;
  phrase.words = english.split(' ').map((correct: string, position: number) => ({ ...clone(authored.phrases[0].words[position]), correct, distractors: distractorsFor(correct, position, index) }));
  phrase.features = ['copula_be', 'affirmative_you_we_they'];
  phrase.localizedDetails = Object.fromEntries(Object.entries(phrase.localizedDetails ?? {}).map(([locale, detail]: [string, any]) => [locale, {
    ...detail,
    meaning: english,
    explanation: `${english} is a known affirmative phrase to retrieve.`,
    words: phrase.words,
    distractors: phrase.words.flatMap((word: any) => word.distractors),
  }]));
}
const examples = ['You are welcome', 'We are together', 'They are married'];
for (const [index, page] of authored.introPages.entries()) {
  const example = examples[index]!;
  const body = L('Проверь знакомую форму: выбери всю правильную фразу.', 'Перевір знайому форму: обери всю правильну фразу.', 'Comprueba la forma conocida: elige la frase completa correcta.', 'Confira a forma conhecida: escolha a frase completa correta.', 'Kiểm tra mẫu quen thuộc: chọn cả câu đúng.', 'Periksa bentuk yang dikenal: pilih kalimat lengkap yang benar.', 'Bilinen biçimi kontrol et: doğru cümlenin tamamını seç.', 'Sprawdź znaną formę: wybierz całe poprawne zdanie.');
  for (const locale of Object.keys(body)) page.body[locale] = `${body[locale as keyof typeof body]} ${example}.`;
  page.question.choices[0] = L(example, example, example, example, example, example, example, example);
  page.question.grammarFeatureId = 'affirmative_you_we_they';
  page.question.explanation = page.body;
  page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]]));
}
export const EPISODE_01_SESSION_24_SOURCE: SessionSource = Object.freeze(authored);
