/** Full B1 Session 17: first use of you / we / they + are. */
import { EPISODE_01_SESSION_09_SOURCE } from './episode_01_session_09_v1';
import { LESSON1_SESSION_17_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const authored = clone(EPISODE_01_SESSION_09_SOURCE) as any;
authored.requiredSessionOrdinal = 17;
authored.generationInputFingerprint = 'full-b1-exact-you-we-they-are-e01-s17-v1';
authored.modeNativePlanId = LESSON1_SESSION_17_MODE_NATIVE_PLAN_ID_V2;
authored.title = L('You, we, they — are', 'You, we, they — are', 'You, we, they — are', 'You, we, they — are', 'You, we, they — are', 'You, we, they — are', 'You, we, they — are', 'You, we, they — are');
authored.summary = L('Назови себя с другими людьми: you, we или they + are.', 'Назви себе з іншими людьми: you, we або they + are.', 'Habla de ti con otras personas: you, we o they + are.', 'Fale de você com outras pessoas: you, we ou they + are.', 'Nói về bạn cùng người khác: you, we hoặc they + are.', 'Bicarakan dirimu dengan orang lain: you, we, atau they + are.', 'Kendini başkalarıyla birlikte anlat: you, we ya da they + are.', 'Powiedz o sobie z innymi: you, we albo they + are.');
authored.learningGoal = L('Составить утвердительную фразу с you, we или they + are.', 'Скласти ствердну фразу з you, we або they + are.', 'Formar una frase afirmativa con you, we o they + are.', 'Formar uma frase afirmativa com you, we ou they + are.', 'Tạo câu khẳng định với you, we hoặc they + are.', 'Membuat kalimat afirmatif dengan you, we, atau they + are.', 'You, we ya da they + are ile olumlu cümle kurmak.', 'Ułożyć zdanie twierdzące z you, we albo they + are.');

const lexical = [
  ['welcome', L('добро пожаловать', 'ласкаво просимо', 'bienvenido', 'bem-vindo', 'được chào đón', 'selamat datang', 'hoş geldin', 'mile widziany')],
  ['safe', L('в безопасности', 'у безпеці', 'a salvo', 'em segurança', 'an toàn', 'aman', 'güvende', 'bezpieczny')],
  ['right', L('прав', 'маєш рацію', 'tienes razón', 'tem razão', 'đúng', 'benar', 'haklı', 'masz rację')],
] as const;
const feedback = (wrong: string, target: string) => L(
  `${wrong} — другое знакомое слово; здесь нужно ${target}.`, `${wrong} — інше знайоме слово; тут потрібне ${target}.`, `${wrong} es otra palabra conocida; aquí se necesita ${target}.`, `${wrong} é outra palavra conhecida; aqui é preciso ${target}.`, `${wrong} là từ quen thuộc khác; ở đây cần ${target}.`, `${wrong} adalah kata yang sudah dikenal; di sini perlu ${target}.`, `${wrong} başka bilinen bir sözcüktür; burada ${target} gerekir.`, `${wrong} to inne znane słowo; tutaj potrzebne jest ${target}.`);
for (const [index, [target, meaning]] of lexical.entries()) {
  const entry = authored.newVocabulary[index]!;
  entry.id = `e01-s17-word-${target}`; entry.target = target; entry.meaning = meaning;
  for (const stage of Object.values(entry.contacts) as any[]) {
    for (const locale of Object.keys(stage.guidance)) stage.guidance[locale] = `${target}: ${meaning[locale as keyof typeof meaning]}.`;
    stage.distractors = ['easy', 'difficult', 'important'].map((value, trapIndex) => ({ value, reasonCode: `s17:${target}:${trapIndex}`, trapType: 'semantic_neighbor', feedback: feedback(value, target) }));
  }
}
const known = { easy: L('лёгкий', 'легкий', 'fácil', 'fácil', 'dễ', 'mudah', 'kolay', 'łatwy'), difficult: L('трудный', 'важкий', 'difícil', 'difícil', 'khó', 'sulit', 'zor', 'trudny'), important: L('важный', 'важливий', 'importante', 'importante', 'quan trọng', 'penting', 'önemli', 'ważny'), tall: L('высокий', 'високий', 'alto', 'alto', 'cao', 'tinggi', 'uzun boylu', 'wysoki'), short: L('низкий', 'низький', 'bajo', 'baixo', 'thấp', 'pendek', 'kısa boylu', 'niski'), young: L('молодой', 'молодий', 'joven', 'jovem', 'trẻ', 'muda', 'genç', 'młody') };
const meanings = { ...Object.fromEntries(lexical), ...known } as Record<string, ReturnType<typeof L>>;
const rows = [['You', 'welcome'], ['We', 'safe'], ['They', 'right'], ['You', 'easy'], ['We', 'difficult'], ['They', 'important'], ['You', 'tall'], ['We', 'short'], ['They', 'young']] as const;
const word = (correct: string, distractors: readonly string[], category: string, phrase: string) => ({ correct, category, distractors: distractors.map((value, index) => ({ value, reasonCode: `s17:${phrase}:${correct}:${index}`, trapType: 'semantic_neighbor', why: `${value} changes the intended subject or meaning; this exact phrase needs ${correct}: ${phrase}.` })) });
authored.phrases = rows.map(([subject, ending], index) => {
  const english = `${subject} are ${ending}`; const meaning = meanings[ending]!;
  const endings = Object.keys(meanings).filter((value) => value !== ending);
  const choices = [...endings.slice(index % endings.length), ...endings.slice(0, index % endings.length)].slice(0, 3);
  const words = [word(subject, [...['You', 'We', 'They'].filter((value) => value !== subject), 'I'], 'plural_pronoun', english), word('are', ['am', 'is', 'be'], 'copula', english), word(ending, choices, 'description', english)];
  const localizedWords = words.map((item) => ({ ...item, distractors: item.distractors.map((distractor) => ({ value: distractor.value, reason: distractor.why, trapType: distractor.trapType })) }));
  return { id: `e01-s17-${subject.toLowerCase()}-are-${ending}`, english, russian: meaning.ru, explanation: `${english} is a complete present-time statement. ${subject} names the people in this situation, and are links them to ${ending}; use this order whenever you describe you, we, or they.`, words, localizedDetails: Object.fromEntries(Object.keys(meaning).map((locale) => [locale, { meaning: meaning[locale as keyof typeof meaning], explanation: `${english} uses are because the subject is you, we, or they.`, words: localizedWords, distractors: localizedWords.flatMap((item) => item.distractors) }])), features: ['copula_be', 'plural_reference', 'affirmative_you_we_they'] };
});
const intro = [
  ['concept', L('С you, we и they говорим о тебе, о нас или о других людях. После каждого из этих слов используется are.', 'З you, we і they говоримо про тебе, про нас або про інших людей. Після кожного з них уживаємо are.', 'Con you, we y they hablamos de ti, de nosotros o de otras personas. Después de estas palabras usamos are.', 'Com you, we e they falamos de você, de nós ou de outras pessoas. Depois delas usamos are.', 'You, we và they nói về bạn, chúng ta hoặc những người khác. Sau chúng dùng are.', 'You, we, dan they membicarakan kamu, kita, atau orang lain. Setelahnya gunakan are.', 'You, we ve they sen, biz ya da başkaları için kullanılır. Bunlardan sonra are gelir.', 'You, we i they mówią o tobie, nas lub innych osobach. Po nich używamy are.')],
  ['formula', L('Порядок простой: you, we или they + are + описание.', 'Порядок простий: you, we або they + are + опис.', 'El orden es simple: you, we o they + are + descripción.', 'A ordem é simples: you, we ou they + are + descrição.', 'Trật tự đơn giản: you, we hoặc they + are + mô tả.', 'Urutannya sederhana: you, we, atau they + are + keterangan.', 'Sıra basittir: you, we ya da they + are + açıklama.', 'Kolejność jest prosta: you, we albo they + are + opis.')],
  ['trap', L('Не ставьте is после you, we или they. Здесь нужна are.', 'Не ставте is після you, we або they. Тут потрібне are.', 'No pongas is después de you, we o they. Aquí se necesita are.', 'Não use is depois de you, we ou they. Aqui é preciso are.', 'Đừng đặt is sau you, we hoặc they. Ở đây cần are.', 'Jangan gunakan is setelah you, we, atau they. Di sini perlu are.', 'You, we ya da they sonrası is kullanmayın. Burada are gerekir.', 'Nie stawiaj is po you, we ani they. Tutaj potrzebne jest are.')],
] as const;
const introTitles = [L('Кого мы называем', 'Кого ми називаємо', 'A quién nombramos', 'Quem nomeamos', 'Chủ thể được nói đến', 'Siapa yang disebut', 'Kimi anlatıyoruz', 'Kogo nazywamy'), L('Форма с are', 'Форма з are', 'La forma con are', 'A forma com are', 'Dùng are đúng', 'Bentuk dengan are', 'Are biçimi', 'Forma z are'), L('Не меняй are на is', 'Не міняй are на is', 'No cambies are por is', 'Não troque are por is', 'Đừng đổi are thành is', 'Jangan ganti are dengan is', 'Are yerine is kullanma', 'Nie zmieniaj are na is')] as const;
authored.introPages = intro.map(([kind, body], index) => { const correct = index === 0 ? 'You are safe' : index === 1 ? 'We are right' : 'They are welcome'; return { kind, title: introTitles[index]!, body, bodyRuns: Object.fromEntries(Object.entries(body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]])), question: { grammarFeatureId: index === 0 ? 'second_person' : 'plural_reference', testedDimension: ['second_person_subject', 'second_person_copula_are', 'second_person_complete_word_order'][index]!, prompt: L('Выбери правильную английскую фразу.', 'Обери правильну англійську фразу.', 'Elige la frase inglesa correcta.', 'Escolha a frase inglesa correta.', 'Chọn câu tiếng Anh đúng.', 'Pilih kalimat bahasa Inggris yang benar.', 'Doğru İngilizce cümleyi seçin.', 'Wybierz poprawne zdanie po angielsku.'), choices: [L(correct, correct, correct, correct, correct, correct, correct, correct), L('You is safe', 'You is safe', 'You is safe', 'You is safe', 'You is safe', 'You is safe', 'You is safe', 'You is safe'), L('Safe are you', 'Safe are you', 'Safe are you', 'Safe are you', 'Safe are you', 'Safe are you', 'Safe are you', 'Safe are you')], correctChoiceIndex: 0, explanation: body } }; });
for (const [index, page] of authored.introPages.entries()) {
  const example = index === 0 ? 'You are safe' : index === 1 ? 'We are right' : 'They are welcome';
  for (const locale of Object.keys(page.body)) page.body[locale] = `${page.body[locale]} ${example}.`;
  page.question.explanation = page.body;
  page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]]));
}
export const EPISODE_01_SESSION_17_SOURCE: SessionSource = Object.freeze(authored);
