/** Dedicated Full B1 Session 12 affirmative application; legacy meeting content is excluded. */
import { EPISODE_01_SESSION_11_SOURCE } from './episode_01_session_11_v1';
import { LESSON1_SESSION_12_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [['e01-s11', 'e01-s12'], ['smart', 'loud'], ['Smart', 'Loud'], ['strong', 'friendly'], ['Strong', 'Friendly'], ['quiet', 'helpful'], ['Quiet', 'Helpful']];
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') { let text = item; for (const [from, to] of pairs) text = text.replaceAll(from, to); return text; }
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)]));
    return item;
  };
  return visit(value) as T;
};
const authored = {
  ...replace(clone(EPISODE_01_SESSION_11_SOURCE)),
  requiredSessionOrdinal: 12,
  generationInputFingerprint: 'full-b1-exact-i-am-he-she-it-is-e01-s12-v2',
  modeNativePlanId: LESSON1_SESSION_12_MODE_NATIVE_PLAN_ID_V2,
} as any;
const meanings = [
  { ru: 'громкий', uk: 'гучний', es: 'ruidoso', 'pt-BR': 'barulhento', vi: 'ồn ào', id: 'keras', tr: 'gürültülü', pl: 'głośny' },
  { ru: 'дружелюбный', uk: 'дружній', es: 'amable', 'pt-BR': 'amigável', vi: 'thân thiện', id: 'ramah', tr: 'arkadaş canlısı', pl: 'przyjazny' },
  { ru: 'готовый помочь', uk: 'готовий допомогти', es: 'servicial', 'pt-BR': 'prestativo', vi: 'hay giúp đỡ', id: 'suka menolong', tr: 'yardımsever', pl: 'pomocny' },
] as const;
const introQuestions = [
  {
    title: L('Скажите о себе', 'Скажіть про себе', 'Habla de ti', 'Fale de você', 'Nói về bạn', 'Bicarakan dirimu', 'Kendinizden söz edin', 'Powiedz o sobie'),
    prompt: L('Какая фраза говорит о вас?', 'Яка фраза говорить про вас?', '¿Qué frase habla de ti?', 'Qual frase fala de você?', 'Câu nào nói về bạn?', 'Kalimat mana yang berbicara tentang dirimu?', 'Hangi cümle sizden söz eder?', 'Które zdanie mówi o tobie?'),
    explanation: L('I am ready: I называет говорящего, а am стоит перед знакомым описанием ready.', 'I am ready: I називає того, хто говорить, а am стоїть перед знайомим описом ready.', 'I am ready: I nombra a quien habla y am va antes de la descripción conocida ready.', 'I am ready: I nomeia quem fala e am vem antes da descrição conhecida ready.', 'I am ready: I chỉ người đang nói và am đứng trước phần mô tả quen thuộc ready.', 'I am ready: I menunjuk orang yang berbicara dan am berada sebelum deskripsi yang sudah dikenal, ready.', 'I am ready: I konuşanı gösterir ve am, bilinen ready tanımından önce gelir.', 'I am ready: I wskazuje osobę mówiącą, a am stoi przed znanym opisem ready.'),
  },
  {
    title: L('Опишите её', 'Опишіть її', 'Descríbela', 'Descreva-a', 'Mô tả cô ấy', 'Gambarkan dia', 'Onu tanımlayın', 'Opisz ją teraz'),
    prompt: L('Какая фраза говорит о ней?', 'Яка фраза говорить про неї?', '¿Qué frase habla de ella?', 'Qual frase fala dela?', 'Câu nào nói về cô ấy?', 'Kalimat mana yang berbicara tentang dia?', 'Hangi cümle ondan söz eder?', 'Które zdanie mówi o niej?'),
    explanation: L('She is friendly: She называет женщину, is стоит перед описанием friendly.', 'She is friendly: She називає жінку, а is стоїть перед описом friendly.', 'She is friendly: She nombra a una mujer e is va antes de friendly.', 'She is friendly: She nomeia uma mulher e is vem antes de friendly.', 'She is friendly: She chỉ một người nữ và is đứng trước friendly.', 'She is friendly: She menunjuk seorang perempuan dan is berada sebelum friendly.', 'She is friendly: She bir kadını gösterir ve is, friendly sözcüğünden önce gelir.', 'She is friendly: She wskazuje kobietę, a is stoi przed friendly.'),
  },
  {
    title: L('Не меняйте is', 'Не змінюйте is', 'No cambies is', 'Não mude is', 'Đừng đổi is', 'Jangan ubah is', 'Is sözcüğünü değiştirmeyin', 'Nie zmieniaj is'),
    prompt: L('Какая фраза сохраняет is после He?', 'Яка фраза зберігає is після He?', '¿Qué frase conserva is después de He?', 'Qual frase mantém is depois de He?', 'Câu nào giữ is sau He?', 'Kalimat mana yang mempertahankan is setelah He?', 'Hangi cümle He’den sonra is sözcüğünü korur?', 'Które zdanie zachowuje is po He?'),
    explanation: L('He is loud: с He нужна форма is, а loud остаётся описанием в конце.', 'He is loud: з He потрібна форма is, а loud лишається описом наприкінці.', 'He is loud: con He se usa is y loud queda como descripción al final.', 'He is loud: com He usa-se is, e loud fica como descrição no fim.', 'He is loud: với He phải dùng is, còn loud là phần mô tả ở cuối.', 'He is loud: dengan He diperlukan is, sedangkan loud adalah deskripsi di akhir.', 'He is loud: He ile is gerekir; loud ise sonda kalan tanımdır.', 'He is loud: z He używa się is, a loud zostaje opisem na końcu.'),
  },
] as const;
for (const [index, copy] of introQuestions.entries()) {
  const page = authored.introPages[index]!;
  page.title = copy.title;
  page.question.prompt = copy.prompt;
  page.question.explanation = copy.explanation;
  page.question.grammarFeatureId = index === 0
    ? 'affirmative_self_statement'
    : 'affirmative_third_person_statement';
  page.question.testedDimension = index === 0
    ? 'third_person_meaning'
    : index === 1
      ? 'third_person_is_order'
      : 'third_person_is_trap';
}
const selfIntroBody = L(
  'I am ready говорит о вас. I называет говорящего. Am соединяет I со знакомым словом ready.',
  'I am ready говорить про вас. I називає того, хто говорить. Am поєднує I зі знайомим словом ready.',
  'I am ready habla de ti. I nombra a quien habla. Am une I con la palabra conocida ready.',
  'I am ready fala de você. I nomeia quem fala. Am liga I à palavra conhecida ready.',
  'I am ready nói về bạn. I chỉ người đang nói. Am nối I với từ quen thuộc ready.',
  'I am ready berbicara tentang dirimu. I menunjuk orang yang berbicara. Am menghubungkan I dengan kata yang sudah dikenal, ready.',
  'I am ready kendinizden söz eder. I konuşanı gösterir. Am, I ile bilinen ready sözcüğünü bağlar.',
  'I am ready mówi o tobie. I wskazuje osobę mówiącą. Am łączy I ze znanym słowem ready.',
);
authored.introPages[0].body = selfIntroBody;
authored.introPages[0].bodyRuns = Object.fromEntries(
  Object.entries(selfIntroBody).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]]),
);
authored.introPages[0].question.choices = [
  L('I am ready', 'I am ready', 'I am ready', 'I am ready', 'I am ready', 'I am ready', 'I am ready', 'I am ready'),
  L('I ready am', 'I ready am', 'I ready am', 'I ready am', 'I ready am', 'I ready am', 'I ready am', 'I ready am'),
  L('I is ready', 'I is ready', 'I is ready', 'I is ready', 'I is ready', 'I is ready', 'I is ready', 'I is ready'),
];
const phraseCopy = [
  {
    meaning: L('Она громкая.', 'Вона гучна.', 'Ella es ruidosa.', 'Ela é barulhenta.', 'Cô ấy ồn ào.', 'Dia berisik.', 'O gürültülü.', 'Ona jest głośna.'),
    explanation: L('She — это она, is соединяет её с описанием loud: громкая.', 'She — це вона, is поєднує її з описом loud: гучна.', 'She significa ella; is la une con loud: ruidosa.', 'She significa ela; is liga ela a loud: barulhenta.', 'She là cô ấy; is nối cô ấy với loud: ồn ào.', 'She berarti dia perempuan; is menghubungkannya dengan loud: berisik.', 'She, kadın için kullanılır; is onu loud: gürültülü tanımıyla bağlar.', 'She oznacza ją, a is łączy ją z loud: głośna.'),
  },
  {
    meaning: L('Он дружелюбный.', 'Він дружній.', 'Él es amable.', 'Ele é amigável.', 'Anh ấy thân thiện.', 'Dia ramah.', 'O arkadaş canlısı.', 'On jest przyjazny.'),
    explanation: L('He — это он, is соединяет его с friendly: дружелюбный.', 'He — це він, is поєднує його з friendly: дружній.', 'He significa él; is lo une con friendly: amable.', 'He significa ele; is liga ele a friendly: amigável.', 'He là anh ấy; is nối anh ấy với friendly: thân thiện.', 'He berarti dia laki-laki; is menghubungkannya dengan friendly: ramah.', 'He, erkek için kullanılır; is onu friendly: arkadaş canlısı tanımıyla bağlar.', 'He oznacza jego, a is łączy go z friendly: przyjazny.'),
  },
  {
    meaning: L('Она готова помочь.', 'Вона готова допомогти.', 'Ella ayuda con gusto.', 'Ela gosta de ajudar.', 'Cô ấy hay giúp đỡ.', 'Dia suka menolong.', 'O yardımsever.', 'Ona jest pomocna.'),
    explanation: L('She — это она, is соединяет её с helpful: готова помочь.', 'She — це вона, is поєднує її з helpful: готова допомогти.', 'She significa ella; is la une con helpful: ayuda con gusto.', 'She significa ela; is liga ela a helpful: gosta de ajudar.', 'She là cô ấy; is nối cô ấy với helpful: hay giúp đỡ.', 'She berarti dia perempuan; is menghubungkannya dengan helpful: suka menolong.', 'She, kadın için kullanılır; is onu helpful: yardımsever tanımıyla bağlar.', 'She oznacza ją, a is łączy ją z helpful: pomocna.'),
  },
  {
    meaning: L('Она готова.', 'Вона готова.', 'Ella está lista.', 'Ela está pronta.', 'Cô ấy sẵn sàng.', 'Dia siap.', 'O hazır.', 'Ona jest gotowa.'),
    explanation: L('She — это она, is соединяет её со знакомым ready: готова.', 'She — це вона, is поєднує її зі знайомим ready: готова.', 'She significa ella; is la une con ready: lista.', 'She significa ela; is liga ela a ready: pronta.', 'She là cô ấy; is nối cô ấy với ready: sẵn sàng.', 'She berarti dia perempuan; is menghubungkannya dengan ready: siap.', 'She, kadın için kullanılır; is onu bilinen ready: hazır tanımıyla bağlar.', 'She oznacza ją, a is łączy ją ze znanym ready: gotowa.'),
  },
] as const;
for (const [index, copy] of phraseCopy.entries()) {
  const phrase = authored.phrases[index]!;
  phrase.russian = copy.meaning.ru;
  for (const locale of Object.keys(copy.meaning)) {
    phrase.localizedDetails[locale].meaning = (copy.meaning as any)[locale];
    phrase.localizedDetails[locale].explanation = (copy.explanation as any)[locale];
  }
}
const modePractice = authored.modeNativePractice as any[];
modePractice[0].instruction = L('Послушайте слово и выберите его значение.', 'Послухайте слово та виберіть його значення.', 'Escucha la palabra y elige su significado.', 'Ouça a palavra e escolha seu significado.', 'Nghe từ rồi chọn nghĩa của nó.', 'Dengarkan kata lalu pilih artinya.', 'Sözcüğü dinleyin ve anlamını seçin.', 'Posłuchaj słowa i wybierz jego znaczenie.');
modePractice[1].instruction = L('Послушайте, скажите слово и сравните.', 'Послухайте, скажіть слово й порівняйте.', 'Escucha, di la palabra y compara.', 'Ouça, diga a palavra e compare.', 'Nghe, nói từ đó rồi so sánh.', 'Dengarkan, ucapkan katanya, lalu bandingkan.', 'Dinleyin, sözcüğü söyleyin ve karşılaştırın.', 'Posłuchaj, powiedz słowo i porównaj.');
modePractice[2].instruction = L('Выберите описание для неё.', 'Оберіть опис для неї.', 'Elige la descripción para ella.', 'Escolha a descrição para ela.', 'Chọn phần mô tả cho cô ấy.', 'Pilih deskripsi untuknya.', 'Onun için tanımı seçin.', 'Wybierz opis dla niej.');
modePractice[3].instruction = L('Послушайте и соберите фразу.', 'Послухайте й складіть фразу.', 'Escucha y construye la frase.', 'Ouça e monte a frase.', 'Nghe rồi ghép câu.', 'Dengarkan lalu susun kalimatnya.', 'Dinleyin ve cümleyi kurun.', 'Posłuchaj i ułóż zdanie.');
modePractice[4].instruction = L('Соедините слова и значения.', 'З’єднайте слова та значення.', 'Une las palabras con sus significados.', 'Una as palavras aos significados.', 'Nối từ với nghĩa của chúng.', 'Pasangkan kata dengan artinya.', 'Sözcükleri anlamlarıyla eşleştirin.', 'Połącz słowa z ich znaczeniami.');
modePractice[5].instruction = L('Соберите фразу из целых слов.', 'Складіть фразу з цілих слів.', 'Construye la frase con palabras completas.', 'Monte a frase com palavras inteiras.', 'Ghép câu bằng các từ hoàn chỉnh.', 'Susun kalimat dari kata utuh.', 'Cümleyi tam sözcüklerle kurun.', 'Ułóż zdanie z całych słów.');
modePractice[2].modePayload.localizedScene = L('Она готова помочь.', 'Вона готова допомогти.', 'Ella ayuda con gusto.', 'Ela gosta de ajudar.', 'Cô ấy hay giúp đỡ.', 'Dia suka menolong.', 'O yardımsever.', 'Ona jest pomocna.');
modePractice[2].modePayload.gappedTargetPhrase = 'She is ___';
modePractice[4].modePayload.pairGrid = [
  { pairId: 's12:loud', target: 'loud', meaningByLocale: L('громкий', 'гучний', 'ruidoso', 'barulhento', 'ồn ào', 'keras', 'gürültülü', 'głośny') },
  { pairId: 's12:friendly', target: 'friendly', meaningByLocale: L('дружелюбный', 'дружній', 'amable', 'amigável', 'thân thiện', 'ramah', 'arkadaş canlısı', 'przyjazny') },
  { pairId: 's12:helpful', target: 'helpful', meaningByLocale: L('готовый помочь', 'готовий допомогти', 'servicial', 'prestativo', 'hay giúp đỡ', 'suka menolong', 'yardımsever', 'pomocny') },
  { pairId: 's12:ready', target: 'ready', meaningByLocale: L('готовый', 'готовий', 'listo', 'pronto', 'sẵn sàng', 'siap', 'hazır', 'gotowy') },
];
modePractice[4].modePayload.leftColumn = ['s12:helpful', 's12:loud', 's12:ready', 's12:friendly'];
modePractice[4].modePayload.rightColumn = ['s12:ready', 's12:friendly', 's12:loud', 's12:helpful'];
for (const practice of modePractice) {
  practice.modePayload && Object.values(practice.modePayload).forEach((value: any) => {
    if (Array.isArray(value)) value.forEach((entry) => {
      if (entry?.responseId) entry.responseId = String(entry.responseId).replaceAll('s10:', 's12:');
    });
  });
}
for (const [index, item] of (authored.newVocabulary as any[]).entries()) {
  const meaning = meanings[index]!;
  item.meaning = meaning;
  item.contacts.recognize.guidance = { ru: `Слушайте ${item.target}: это «${meaning.ru}».`, uk: `Послухайте ${item.target}: це «${meaning.uk}».`, es: `Escucha ${item.target}: significa «${meaning.es}».`, 'pt-BR': `Ouça ${item.target}: significa “${meaning['pt-BR']}”.`, vi: `Nghe ${item.target}: nghĩa là “${meaning.vi}”.`, id: `Dengarkan ${item.target}: artinya “${meaning.id}”.`, tr: `${item.target} sözcüğünü dinleyin: “${meaning.tr}” demektir.`, pl: `Posłuchaj ${item.target}: znaczy „${meaning.pl}”.` };
  item.contacts.retrieve_meaning.guidance = { ru: `Выберите ${item.target}: «${meaning.ru}».`, uk: `Оберіть ${item.target}: «${meaning.uk}».`, es: `Elige ${item.target}: «${meaning.es}».`, 'pt-BR': `Escolha ${item.target}: “${meaning['pt-BR']}”.`, vi: `Chọn ${item.target}: “${meaning.vi}”.`, id: `Pilih ${item.target}: “${meaning.id}”.`, tr: `${item.target} sözcüğünü seçin: “${meaning.tr}”.`, pl: `Wybierz ${item.target}: „${meaning.pl}”.` };
}
export const EPISODE_01_SESSION_12_SOURCE: SessionSource = Object.freeze(authored);
