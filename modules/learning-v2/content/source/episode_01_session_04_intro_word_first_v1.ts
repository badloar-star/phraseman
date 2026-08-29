import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type { LocalizedIntroRunsSource, LocalizedSource, SessionSourceIntroPage } from './session_shard_from_source_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const CORRECT = ['You are here', 'You are ready', 'You are happy'] as const;
const WRONG = ['I am here', 'You am here', 'You here', 'You am ready', 'You ready', 'I am happy'] as const;
const TERMS = [...CORRECT, ...WRONG].sort((a, b) => b.length - a.length);

function runs(body: LocalizedSource): LocalizedIntroRunsSource {
  return Object.fromEntries(LOCALES.map((locale) => {
    const text = body[locale];
    const result: LearningV2IntroTextRunV1[] = [];
    let cursor = 0;
    while (cursor < text.length) {
      const term = TERMS.find((candidate) => text.startsWith(candidate, cursor));
      if (term) {
        result.push({ text: term, semantic: WRONG.includes(term as never) ? 'targetWrong' : 'targetCorrect' });
        cursor += term.length;
        continue;
      }
      let end = cursor + 1;
      while (end < text.length && !TERMS.some((candidate) => text.startsWith(candidate, end))) end += 1;
      result.push({ text: text.slice(cursor, end), semantic: 'explanation' });
      cursor = end;
    }
    return [locale, result];
  })) as unknown as LocalizedIntroRunsSource;
}

const targetChoice = (value: string): LocalizedSource => L(Object.fromEntries(LOCALES.map((locale) => [locale, value])) as unknown as LocalizedSource);

export const EPISODE_01_SESSION_04_WORD_FIRST_TITLE = L({
  ru: 'You are — говорим о собеседнике', uk: 'You are — говоримо про співрозмовника', es: 'You are: hablar de la otra persona',
  'pt-BR': 'You are: falar da outra pessoa', vi: 'You are: nói về người nghe', id: 'You are: berbicara tentang lawan bicara',
  tr: 'You are: karşıdaki kişiyi anlatmak', pl: 'You are — mówimy o rozmówcy',
});

export const EPISODE_01_SESSION_04_WORD_FIRST_SUMMARY = L({
  ru: 'You называет собеседника, а are соединяет его с местом или состоянием.', uk: 'You називає співрозмовника, а are поєднує його з місцем або станом.',
  es: 'You nombra al interlocutor y are lo une con un lugar o estado.', 'pt-BR': 'You nomeia o interlocutor, e are o liga a um lugar ou estado.',
  vi: 'You gọi người nghe, còn are nối người đó với địa điểm hoặc trạng thái.', id: 'You menyebut lawan bicara dan are menghubungkannya dengan tempat atau keadaan.',
  tr: 'You karşıdaki kişiyi adlandırır, are onu yer ya da durumla bağlar.', pl: 'You nazywa rozmówcę, a are łączy go z miejscem lub stanem.',
});

export const EPISODE_01_SESSION_04_WORD_FIRST_GOAL = L({
  ru: 'Научиться строить You are + состояние и не смешивать эту пару с I am.', uk: 'Навчитися будувати You are + стан і не змішувати цю пару з I am.',
  es: 'Construir You are + estado sin mezclar esta pareja con I am.', 'pt-BR': 'Construir You are + estado sem misturar essa dupla com I am.',
  vi: 'Tạo You are + trạng thái mà không trộn cặp này với I am.', id: 'Menyusun You are + keadaan tanpa mencampurnya dengan I am.',
  tr: 'You are + durum yapısını kurmak ve bu çifti I am ile karıştırmamak.', pl: 'Budować You are + stan bez mieszania tej pary z I am.',
});

const concept = L({
  ru: 'Когда говорите о собеседнике, начинайте с You: You are here — «вы здесь». I am here говорит уже о самом говорящем. Один человек — один точный ярлык.',
  uk: 'Коли говорите про співрозмовника, починайте з You: You are here — «ви тут». I am here говорить уже про самого мовця. Одна людина — одна точна позначка.',
  es: 'Al hablar de la otra persona, empieza con You: You are here significa «estás aquí». I am here habla de quien pronuncia la frase. Cada persona lleva su etiqueta.',
  'pt-BR': 'Ao falar da outra pessoa, comece com You: You are here significa «você está aqui». I am here fala de quem diz a frase. Cada pessoa tem sua etiqueta.',
  vi: 'Khi nói về người nghe, hãy bắt đầu bằng You: You are here nghĩa là “bạn ở đây”. I am here nói về chính người nói. Mỗi người có một nhãn riêng.',
  id: 'Saat berbicara tentang lawan bicara, mulai dengan You: You are here berarti “kamu di sini”. I am here berbicara tentang penutur. Setiap orang punya label sendiri.',
  tr: 'Karşıdaki kişiyi anlatırken You ile başlayın: You are here, “buradasın” demektir. I am here ise konuşanı anlatır. Her kişiye tek etiket.',
  pl: 'Gdy mówisz o rozmówcy, zacznij od You: You are here znaczy „jesteś tutaj”. I am here mówi o osobie wypowiadającej zdanie. Każda osoba ma własną etykietę.',
});

const formula = L({
  ru: 'После You ставьте are: You are ready. Am прикреплено к I, поэтому You am ready смешивает две разные пары. Короткая формула: You + are + состояние.',
  uk: 'Після You ставте are: You are ready. Am прикріплене до I, тому You am ready змішує дві різні пари. Коротка формула: You + are + стан.',
  es: 'Después de You va are: You are ready. Am pertenece a I, por eso You am ready mezcla dos parejas. Fórmula breve: You + are + estado.',
  'pt-BR': 'Depois de You vem are: You are ready. Am pertence a I; por isso You am ready mistura duas duplas. Fórmula curta: You + are + estado.',
  vi: 'Sau You dùng are: You are ready. Am đi với I, vì vậy You am ready đã trộn hai cặp. Công thức ngắn: You + are + trạng thái.',
  id: 'Setelah You gunakan are: You are ready. Am mengikuti I, jadi You am ready mencampur dua pasangan. Rumus singkat: You + are + keadaan.',
  tr: 'You sonrasında are gelir: You are ready. Am, I ile eşleşir; You am ready iki çifti karıştırır. Kısa formül: You + are + durum.',
  pl: 'Po You stawiaj are: You are ready. Am łączy się z I, więc You am ready miesza dwie pary. Krótki wzór: You + are + stan.',
});

const trap = L({
  ru: 'Русское «вы счастливы» обходится без отдельного слова между частями, английское — нет: You are happy. You happy теряет are, а I am happy меняет собеседника на говорящего.',
  uk: 'Українське «ви щасливі» обходиться без окремого слова між частинами, англійське — ні: You are happy. You happy втрачає are, а I am happy змінює співрозмовника на мовця.',
  es: 'En español basta «estás feliz», pero el inglés muestra la unión: You are happy. You happy pierde are; I am happy cambia al interlocutor por quien habla.',
  'pt-BR': 'Em português basta «você está feliz», mas o inglês mostra a ligação: You are happy. You happy perde are; I am happy troca o interlocutor por quem fala.',
  vi: 'Tiếng Anh phải giữ từ nối trong You are happy. You happy làm mất are, còn I am happy đổi người nghe thành người nói.',
  id: 'Bahasa Inggris harus mempertahankan penghubung dalam You are happy. You happy kehilangan are, sedangkan I am happy mengganti lawan bicara dengan penutur.',
  tr: 'İngilizce, You are happy içinde bağlantıyı açıkça korur. You happy are biçimini kaybeder; I am happy ise karşıdaki kişiyi konuşanla değiştirir.',
  pl: 'Angielski zachowuje łącznik w You are happy. You happy gubi are, a I am happy zamienia rozmówcę na osobę mówiącą.',
});

export const EPISODE_01_SESSION_04_WORD_FIRST_INTRO: readonly [SessionSourceIntroPage, SessionSourceIntroPage, SessionSourceIntroPage] = Object.freeze([
  { kind: 'concept', title: L({ ru: 'You указывает на собеседника', uk: 'You вказує на співрозмовника', es: 'You señala al interlocutor', 'pt-BR': 'You aponta para o interlocutor', vi: 'You chỉ người nghe', id: 'You menunjuk lawan bicara', tr: 'You karşıdaki kişiyi gösterir', pl: 'You wskazuje rozmówcę' }), body: concept, bodyRuns: runs(concept), question: {
    grammarFeatureId: 'second_person', testedDimension: 'second_person_subject',
    prompt: L({ ru: 'Какая английская фраза говорит о собеседнике?', uk: 'Яка англійська фраза говорить про співрозмовника?', es: '¿Qué frase inglesa habla del interlocutor?', 'pt-BR': 'Qual frase inglesa fala da outra pessoa?', vi: 'Câu tiếng Anh nào nói về người nghe?', id: 'Kalimat Inggris mana yang membahas lawan bicara?', tr: 'Hangi İngilizce cümle karşıdaki kişiyi anlatır?', pl: 'Które angielskie zdanie mówi o rozmówcy?' }),
    choices: [targetChoice('You are here'), targetChoice('I am here'), targetChoice('You am here')], correctChoiceIndex: 0,
    explanation: L({ ru: 'You are here начинается с you и поэтому говорит о собеседнике.', uk: 'You are here починається з you, тому говорить про співрозмовника.', es: 'You are here empieza con you y por eso habla del interlocutor.', 'pt-BR': 'You are here começa com you e fala da outra pessoa.', vi: 'You are here bắt đầu bằng you nên nói về người nghe.', id: 'You are here dimulai dengan you sehingga membahas lawan bicara.', tr: 'You are here, you ile başladığı için karşıdaki kişiyi anlatır.', pl: 'You are here zaczyna się od you, więc mówi o rozmówcy.' }),
  } },
  { kind: 'formula', title: L({ ru: 'После you нужна are', uk: 'Після you потрібна are', es: 'Después de you va are', 'pt-BR': 'Depois de you vem are', vi: 'Sau you cần are', id: 'Setelah you perlu are', tr: 'You sonrasında are gelir', pl: 'Po you potrzebne jest are' }), body: formula, bodyRuns: runs(formula), question: {
    grammarFeatureId: 'second_person', testedDimension: 'second_person_copula_are',
    prompt: L({ ru: 'Какая английская форма собрана правильно?', uk: 'Яка англійська форма складена правильно?', es: '¿Qué forma inglesa está completa?', 'pt-BR': 'Qual forma inglesa está completa?', vi: 'Dạng tiếng Anh nào hoàn chỉnh?', id: 'Bentuk Inggris mana yang lengkap?', tr: 'Hangi İngilizce biçim doğrudur?', pl: 'Która angielska forma jest kompletna?' }),
    choices: [targetChoice('You are ready'), targetChoice('You am ready'), targetChoice('You ready')], correctChoiceIndex: 0,
    explanation: L({ ru: 'После you ставится are, поэтому полная правильная форма — You are ready.', uk: 'Після you ставиться are, тому повна правильна форма — You are ready.', es: 'Después de you se usa are; por eso la forma completa es You are ready.', 'pt-BR': 'Depois de you usa-se are; por isso a forma completa é You are ready.', vi: 'Sau you phải dùng are, vì vậy dạng đầy đủ đúng là You are ready.', id: 'Setelah you harus digunakan are; bentuk lengkap yang benar ialah You are ready.', tr: 'You sonrasında are kullanılır; bu yüzden doğru tam biçim You are ready olur.', pl: 'Po you używa się are, dlatego pełna poprawna forma to You are ready.' }),
  } },
  { kind: 'trap', title: L({ ru: 'Не теряйте are', uk: 'Не губіть are', es: 'No pierdas are', 'pt-BR': 'Não perca are', vi: 'Đừng làm mất are', id: 'Jangan hilangkan are', tr: 'Are biçimini düşürmeyin', pl: 'Nie gub are' }), body: trap, bodyRuns: runs(trap), question: {
    grammarFeatureId: 'second_person', testedDimension: 'second_person_complete_word_order',
    prompt: L({ ru: 'Как правильно сказать собеседнику «вы счастливы»?', uk: 'Як правильно сказати співрозмовнику «ви щасливі»?', es: '¿Cómo dices correctamente «estás feliz»?', 'pt-BR': 'Como dizer corretamente «você está feliz»?', vi: 'Nói “bạn hạnh phúc” đúng cách nào?', id: 'Bagaimana mengatakan “kamu bahagia” dengan benar?', tr: 'Karşıdaki kişiye “mutlusun” nasıl doğru söylenir?', pl: 'Jak poprawnie powiedzieć rozmówcy „jesteś szczęśliwy”?' }),
    choices: [targetChoice('You are happy'), targetChoice('You happy'), targetChoice('I am happy')], correctChoiceIndex: 0,
    explanation: L({ ru: 'You are happy сохраняет и собеседника you, и обязательную форму are, поэтому фраза собрана полностью.', uk: 'You are happy зберігає і співрозмовника you, і обов’язкову форму are, тому фраза повна.', es: 'You are happy conserva you y la forma obligatoria are; por eso la frase está completa.', 'pt-BR': 'You are happy mantém you e a forma obrigatória are; por isso a frase está completa.', vi: 'You are happy giữ cả you lẫn are bắt buộc, vì vậy câu đã đầy đủ.', id: 'You are happy mempertahankan you dan are yang wajib, sehingga kalimatnya lengkap.', tr: 'You are happy hem you hem de zorunlu are biçimini korur; böylece cümle tamamlanır.', pl: 'You are happy zachowuje you i obowiązkowe are, więc zdanie jest kompletne.' }),
  } },
]);
