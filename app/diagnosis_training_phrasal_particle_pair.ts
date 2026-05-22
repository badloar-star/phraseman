// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.
import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const tri = (
  ru: string,
  uk = ru,
  es = ru,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (planned[locale]) copy[locale] = planned[locale];
  }
  return copy;
};

const CONTRAST = [
  'turn on',
  'turn off',
  'look up',
  'look for',
  'pick up',
  'give up',
  'find out',
  'run out of',
  'put on',
  'take off',
  'carry on',
  'fill in',
];

const option = (text: string) => ({ id: text, text });

const defaultWrong = (correctAnswer: string): TriText => tri(
  `С этой частицей получается другой смысл. Здесь нужна пара "${correctAnswer}".`,
  `З цією часткою виходить інший сенс. Тут потрібна пара "${correctAnswer}".`,
  `That choice makes a different meaning. Here we need the pair with "${correctAnswer}".`,
  {
    'pt-BR': `Essa partícula cria outro sentido. Aqui precisamos do par com "${correctAnswer}".`,
    vi: `Phần này tạo nghĩa khác. Ở đây cần cặp với "${correctAnswer}".`,
    id: `Partikel ini membuat makna lain. Di sini kita perlu pasangan dengan "${correctAnswer}".`,
    tr: `Bu parça başka bir anlam oluşturur. Burada "${correctAnswer}" ikilisi gerekiyor.`,
    pl: `Ta cząstka tworzy inne znaczenie. Tutaj potrzebna jest para z "${correctAnswer}".`,
  },
);

const retry = (line: string, pair: string): [TriText, TriText, TriText, TriText] => [
  tri(line, line, 'Choose the meaning first, then the second part.', {
    'pt-BR': 'Escolha primeiro o sentido, depois a segunda parte.',
    vi: 'Chọn nghĩa trước, rồi chọn phần thứ hai.',
    id: 'Pilih maknanya dulu, lalu bagian kedua.',
    tr: 'Önce anlamı seç, sonra ikinci parçayı.',
    pl: 'Najpierw wybierz znaczenie, potem drugą część.',
  }),
  tri(
    'Не выбирай на слух. Сначала смысл, потом короткая часть после глагола.',
    'Не вибирай навмання. Спочатку сенс, потім коротка частка після дієслова.',
    'Do not choose by sound. Choose the meaning first, then the second part.',
    {
      'pt-BR': 'Não escolha pelo som. Escolha primeiro o sentido, depois a parte curta depois do verbo.',
      vi: 'Đừng chọn theo âm thanh. Hãy chọn nghĩa trước, rồi chọn phần ngắn sau động từ.',
      id: 'Jangan memilih dari bunyinya. Pilih maknanya dulu, lalu bagian pendek setelah kata kerja.',
      tr: 'Sese göre seçme. Önce anlamı, sonra fiilden sonraki kısa parçayı seç.',
      pl: 'Nie wybieraj po brzmieniu. Najpierw wybierz znaczenie, potem krótką część po czasowniku.',
    },
  ),
  tri(
    `Держи пару целиком: ${pair}.`,
    `Тримай пару цілком: ${pair}.`,
    `Keep the whole pair together: ${pair}.`,
    {
      'pt-BR': `Mantenha o par inteiro: ${pair}.`,
      vi: `Giữ cả cặp cùng nhau: ${pair}.`,
      id: `Ingat seluruh pasangannya: ${pair}.`,
      tr: `İkiliyi birlikte tut: ${pair}.`,
      pl: `Trzymaj całą parę razem: ${pair}.`,
    },
  ),
  tri(
    `Почти подсказка: нужна пара "${pair}".`,
    `Майже підказка: потрібна пара "${pair}".`,
    `Almost a hint: the needed pair is "${pair}".`,
    {
      'pt-BR': `Quase uma dica: o par necessário é "${pair}".`,
      vi: `Gần như gợi ý rồi: cặp cần dùng là "${pair}".`,
      id: `Hampir menjadi petunjuk: pasangan yang dibutuhkan adalah "${pair}".`,
      tr: `Neredeyse ipucu: gereken ikili "${pair}".`,
      pl: `Prawie podpowiedź: potrzebna para to "${pair}".`,
    },
  ),
];

function phrasalStep(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  options: string[];
  correctAnswer: string;
  pair: string;
  correctFeedback: TriText;
  wrong: Record<string, TriText>;
  retryLine: string;
  focusWords: string[];
}): DiagnosisTrainingStep {
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'Смотри не на первое слово отдельно, а на всю пару. Короткая часть после глагола часто меняет смысл всей фразы.',
      'Дивись не на перше слово окремо, а на всю пару. Коротка частка після дієслова часто змінює сенс усієї фрази.',
      'Look at the whole pair, not at the first word alone. The short second part often changes the meaning of the whole phrase.',
      {
        'pt-BR': 'Olhe para o par inteiro, não só para a primeira palavra. A parte curta depois do verbo muitas vezes muda o sentido da frase toda.',
        vi: 'Hãy nhìn cả cặp, đừng chỉ nhìn từ đầu tiên. Phần ngắn sau động từ thường đổi nghĩa của cả câu.',
        id: 'Lihat seluruh pasangan, bukan hanya kata pertama. Bagian pendek setelah kata kerja sering mengubah makna seluruh frasa.',
        tr: 'İlk kelimeye tek başına değil, bütün ikiliye bak. Fiilden sonraki kısa parça çoğu zaman tüm ifadenin anlamını değiştirir.',
        pl: 'Patrz na całą parę, nie tylko na pierwsze słowo. Krótka część po czasowniku często zmienia sens całej frazy.',
      },
    ),
    microTask: tri(
      'Выбери короткую часть, которая дает нужный смысл.',
      'Вибери коротку частку, яка дає потрібний сенс.',
      'Choose the second part that gives the right meaning.',
      {
        'pt-BR': 'Escolha a parte curta que dá o sentido certo.',
        vi: 'Chọn phần thứ hai tạo ra nghĩa đúng.',
        id: 'Pilih bagian kedua yang memberi makna yang tepat.',
        tr: 'Doğru anlamı veren ikinci parçayı seç.',
        pl: 'Wybierz krótką część, która daje właściwe znaczenie.',
      },
    ),
    sentence: input.sentence,
    answerOptions: input.options.map(option),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((item) => item === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((item) => item !== input.correctAnswer)
        .map((item) => [item, input.wrong[item] ?? defaultWrong(input.correctAnswer)]),
    ),
    retryFeedback: retry(input.retryLine, input.pair),
    fallbackExplanation: tri(
      'Не переводи первый глагол отдельно. Turn on = включить. Turn off = выключить. Look up = найти информацию. Look for = искать. Pick up = поднять или забрать человека.',
      'Не перекладай перше дієслово окремо. Turn on = увімкнути. Turn off = вимкнути. Look up = знайти інформацію. Look for = шукати. Pick up = підняти або забрати людину.',
      'Do not translate the first verb alone. Turn on = switch on. Turn off = switch off. Look up = find information. Look for = search. Pick up = lift or collect.',
      {
        'pt-BR': 'Não traduza o primeiro verbo sozinho. Turn on = ligar. Turn off = desligar. Look up = consultar informação. Look for = procurar. Pick up = levantar ou buscar alguém.',
        vi: 'Đừng dịch riêng động từ đầu tiên. Turn on = bật. Turn off = tắt. Look up = tra cứu thông tin. Look for = tìm kiếm. Pick up = nhặt lên hoặc đón ai đó.',
        id: 'Jangan menerjemahkan kata kerja pertama sendirian. Turn on = menyalakan. Turn off = mematikan. Look up = mencari informasi. Look for = mencari. Pick up = mengangkat atau menjemput.',
        tr: 'İlk fiili tek başına çevirme. Turn on = açmak. Turn off = kapatmak. Look up = bilgiye bakmak. Look for = aramak. Pick up = kaldırmak ya da birini almak.',
        pl: 'Nie tłumacz pierwszego czasownika osobno. Turn on = włączyć. Turn off = wyłączyć. Look up = sprawdzić informację. Look for = szukać. Pick up = podnieść albo odebrać kogoś.',
      },
    ),
    focusWords: input.focusWords,
  };
}

export const PHRASAL_PARTICLE_PAIR_TRAINING: DiagnosisTraining = {
  id: 'phrasal_particle_pair',
  category: 'phrasal_particle',
  version: '1.0.0',
  status: 'active',
  priority: 37,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Turn on / look up: учи пару целиком', 'Turn on / look up: вчи пару цілком', 'Turn on / look up: learn the whole pair', {
    'pt-BR': 'Turn on / look up: aprenda o par inteiro',
    vi: 'Turn on / look up: học cả cặp',
    id: 'Turn on / look up: pelajari seluruh pasangan',
    tr: 'Turn on / look up: ikiliyi bütün olarak öğren',
    pl: 'Turn on / look up: ucz się całej pary',
  }),
  shortTitle: tri('Пара, не одно слово', 'Пара, не одне слово', 'Whole pair', {
    'pt-BR': 'O par inteiro',
    vi: 'Cả cặp',
    id: 'Seluruh pasangan',
    tr: 'Bütün ikili',
    pl: 'Cała para',
  }),
  shortDiagnosis: tri(
    'Ты видишь первое слово, но теряешь короткую часть после него. Из-за этого фраза меняет смысл.',
    'Ти бачиш перше слово, але губиш коротку частку після нього. Через це фраза змінює сенс.',
    'You see the first word, but lose the second part. That changes the meaning.',
    {
      'pt-BR': 'Você vê a primeira palavra, mas perde a parte curta depois dela. Por isso a frase muda de sentido.',
      vi: 'Bạn thấy từ đầu tiên, nhưng bỏ lỡ phần ngắn sau nó. Vì vậy câu đổi nghĩa.',
      id: 'Kamu melihat kata pertama, tetapi melewatkan bagian pendek setelahnya. Karena itu frasanya berubah makna.',
      tr: 'İlk kelimeyi görüyorsun ama ardından gelen kısa parçayı kaçırıyorsun. Bu yüzden ifade anlam değiştiriyor.',
      pl: 'Widzisz pierwsze słowo, ale gubisz krótką część po nim. Przez to fraza zmienia znaczenie.',
    },
  ),
  diagnosisText: tri(
    'Ошибка не в том, что ты не знаешь turn или look. Смысл живет в паре: turn on, turn off, look up, look for.',
    'Помилка не в тому, що ти не знаєш turn або look. Сенс живе в парі: turn on, turn off, look up, look for.',
    'The mistake is not that you do not know turn or look. The meaning lives in the pair: turn on, turn off, look up, look for.',
    {
      'pt-BR': 'O erro não é não saber turn ou look. O sentido está no par: turn on, turn off, look up, look for.',
      vi: 'Lỗi không phải là bạn không biết turn hay look. Nghĩa nằm trong cả cặp: turn on, turn off, look up, look for.',
      id: 'Masalahnya bukan karena kamu tidak tahu turn atau look. Maknanya ada pada pasangannya: turn on, turn off, look up, look for.',
      tr: 'Hata turn ya da look kelimesini bilmemek değil. Anlam ikilide yaşar: turn on, turn off, look up, look for.',
      pl: 'Błąd nie polega na tym, że nie znasz turn albo look. Znaczenie jest w parze: turn on, turn off, look up, look for.',
    },
  ),
  mentalModel: tri(
    'Думай готовыми блоками, а не отдельными словами. Turn сам по себе еще не дает смысл: turn on = включить, turn off = выключить. Сначала выбирай смысл, потом пару.',
    'Думай готовими блоками, а не окремими словами. Turn саме по собі ще не дає сенс: turn on = увімкнути, turn off = вимкнути. Спочатку вибирай сенс, потім пару.',
    'Think in ready-made blocks, not separate words. Turn alone is not enough: turn on = switch on, turn off = switch off. Choose the meaning first, then the pair.',
    {
      'pt-BR': 'Pense em blocos prontos, não em palavras separadas. Turn sozinho ainda não basta: turn on = ligar, turn off = desligar. Escolha primeiro o sentido, depois o par.',
      vi: 'Hãy nghĩ bằng các cụm cố định, không phải từng từ riêng lẻ. Turn một mình chưa đủ nghĩa: turn on = bật, turn off = tắt. Chọn nghĩa trước, rồi chọn cặp.',
      id: 'Pikirkan sebagai blok siap pakai, bukan kata terpisah. Turn saja belum cukup: turn on = menyalakan, turn off = mematikan. Pilih maknanya dulu, lalu pasangannya.',
      tr: 'Tek tek kelimeler yerine hazır bloklar olarak düşün. Turn tek başına yetmez: turn on = açmak, turn off = kapatmak. Önce anlamı, sonra ikiliyi seç.',
      pl: 'Myśl gotowymi blokami, nie osobnymi słowami. Samo turn nie wystarcza: turn on = włączyć, turn off = wyłączyć. Najpierw wybierz znaczenie, potem parę.',
    },
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Сначала назови смысл: включить, выключить, найти информацию, искать, забрать, сдаться, узнать, закончиться. Потом выбирай пару.',
    'Спочатку назви сенс: увімкнути, вимкнути, знайти інформацію, шукати, забрати, здатися, дізнатися, закінчитися. Потім вибирай пару.',
    'Name the meaning first: switch on, switch off, find information, search, collect, give up, discover, run out. Then choose the pair.',
    {
      'pt-BR': 'Primeiro diga o sentido: ligar, desligar, consultar informação, procurar, buscar alguém, desistir, descobrir, ficar sem algo. Depois escolha o par.',
      vi: 'Trước tiên gọi tên nghĩa: bật, tắt, tra cứu thông tin, tìm kiếm, đón ai đó, bỏ cuộc, tìm ra, hết thứ gì đó. Sau đó chọn cặp.',
      id: 'Sebutkan maknanya dulu: menyalakan, mematikan, mencari informasi, mencari, menjemput, menyerah, mengetahui, kehabisan. Lalu pilih pasangannya.',
      tr: 'Önce anlamı söyle: açmak, kapatmak, bilgiye bakmak, aramak, birini almak, vazgeçmek, öğrenmek, bitmek. Sonra ikiliyi seç.',
      pl: 'Najpierw nazwij znaczenie: włączyć, wyłączyć, sprawdzić informację, szukać, odebrać kogoś, poddać się, dowiedzieć się, skończyć się. Potem wybierz parę.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Смысл нужно брать из пары целиком.',
      'Turn on = включить, turn off = выключить.',
      'Look up = найти информацию, look for = искать кого-то или что-то.',
      'Pick up = поднять или забрать человека.',
      'Give up = сдаться или перестать пытаться.',
      'Find out = узнать информацию.',
      'Run out of = что-то закончилось.',
    ],
    uk: [
      'Сенс потрібно брати з пари цілком.',
      'Turn on = увімкнути, turn off = вимкнути.',
      'Look up = знайти інформацію, look for = шукати когось або щось.',
      'Pick up = підняти або забрати людину.',
      'Give up = здатися або перестати намагатися.',
      'Find out = дізнатися інформацію.',
      'Run out of = щось закінчилося.',
    ],
    es: [
      'Take the meaning from the whole pair.',
      'Turn on = switch on, turn off = switch off.',
      'Look up = find information, look for = search.',
      'Pick up = lift or collect a person.',
      'Give up = stop trying.',
      'Find out = discover information.',
      'Run out of = have none left.',
    ],
    'pt-BR': [
      'Pegue o sentido do par inteiro.',
      'Turn on = ligar, turn off = desligar.',
      'Look up = consultar informação, look for = procurar alguém ou algo.',
      'Pick up = levantar algo ou buscar uma pessoa.',
      'Give up = desistir ou parar de tentar.',
      'Find out = descobrir informação.',
      'Run out of = ficar sem algo.',
    ],
    vi: [
      'Lấy nghĩa từ cả cụm, không chỉ từ đầu tiên.',
      'Turn on = bật, turn off = tắt.',
      'Look up = tra cứu thông tin, look for = tìm ai đó hoặc thứ gì đó.',
      'Pick up = nhặt lên hoặc đón một người.',
      'Give up = bỏ cuộc hoặc ngừng cố gắng.',
      'Find out = tìm ra thông tin.',
      'Run out of = hết thứ gì đó.',
    ],
    id: [
      'Ambil makna dari seluruh pasangan kata.',
      'Turn on = menyalakan, turn off = mematikan.',
      'Look up = mencari informasi, look for = mencari seseorang atau sesuatu.',
      'Pick up = mengangkat atau menjemput seseorang.',
      'Give up = menyerah atau berhenti mencoba.',
      'Find out = mengetahui informasi.',
      'Run out of = kehabisan sesuatu.',
    ],
    tr: [
      'Anlamı bütün ikiliden çıkar.',
      'Turn on = açmak, turn off = kapatmak.',
      'Look up = bilgiye bakmak, look for = birini veya bir şeyi aramak.',
      'Pick up = kaldırmak ya da birini almaya gitmek.',
      'Give up = vazgeçmek veya denemeyi bırakmak.',
      'Find out = bilgi öğrenmek.',
      'Run out of = bir şeyin bitmesi.',
    ],
    pl: [
      'Sens bierz z całej pary.',
      'Turn on = włączyć, turn off = wyłączyć.',
      'Look up = sprawdzić informację, look for = szukać kogoś lub czegoś.',
      'Pick up = podnieść albo odebrać kogoś.',
      'Give up = poddać się albo przestać próbować.',
      'Find out = dowiedzieć się informacji.',
      'Run out of = coś się skończyło.',
    ],
  },
  examples: [
    { en: 'Please turn on the light.', ru: 'Пожалуйста, включи свет.', uk: 'Будь ласка, увімкни світло.', es: 'Please turn on the light.', 'pt-BR': 'Por favor, acenda a luz.', vi: 'Làm ơn bật đèn.', id: 'Tolong nyalakan lampunya.', tr: 'Lütfen ışığı aç.', pl: 'Proszę, włącz światło.', why: tri('Turn on = включить.', 'Turn on = увімкнути.', 'Turn on = switch on.', { 'pt-BR': 'Turn on = ligar.', vi: 'Turn on = bật.', id: 'Turn on = menyalakan.', tr: 'Turn on = açmak.', pl: 'Turn on = włączyć.' }) },
    { en: 'Please turn off the TV.', ru: 'Пожалуйста, выключи телевизор.', uk: 'Будь ласка, вимкни телевізор.', es: 'Please turn off the TV.', 'pt-BR': 'Por favor, desligue a TV.', vi: 'Làm ơn tắt TV.', id: 'Tolong matikan TV.', tr: 'Lütfen televizyonu kapat.', pl: 'Proszę, wyłącz telewizor.', why: tri('Turn off = выключить.', 'Turn off = вимкнути.', 'Turn off = switch off.', { 'pt-BR': 'Turn off = desligar.', vi: 'Turn off = tắt.', id: 'Turn off = mematikan.', tr: 'Turn off = kapatmak.', pl: 'Turn off = wyłączyć.' }) },
    { en: 'I looked up the word.', ru: 'Я нашел слово в словаре.', uk: 'Я знайшов слово у словнику.', es: 'I looked up the word.', 'pt-BR': 'Consultei a palavra no dicionário.', vi: 'Tôi đã tra từ đó trong từ điển.', id: 'Saya mencari kata itu di kamus.', tr: 'Kelimeyi sözlükte aradım.', pl: 'Sprawdziłem słowo w słowniku.', why: tri('Look up = найти информацию.', 'Look up = знайти інформацію.', 'Look up = find information.', { 'pt-BR': 'Look up = consultar informação.', vi: 'Look up = tra cứu thông tin.', id: 'Look up = mencari informasi.', tr: 'Look up = bilgiye bakmak.', pl: 'Look up = sprawdzić informację.' }) },
    { en: 'I am looking for my keys.', ru: 'Я ищу ключи.', uk: 'Я шукаю ключі.', es: 'I am looking for my keys.', 'pt-BR': 'Estou procurando minhas chaves.', vi: 'Tôi đang tìm chìa khóa của mình.', id: 'Saya sedang mencari kunci saya.', tr: 'Anahtarlarımı arıyorum.', pl: 'Szukam swoich kluczy.', why: tri('Look for = искать.', 'Look for = шукати.', 'Look for = search.', { 'pt-BR': 'Look for = procurar.', vi: 'Look for = tìm kiếm.', id: 'Look for = mencari.', tr: 'Look for = aramak.', pl: 'Look for = szukać.' }) },
    { en: 'Can you pick me up at six?', ru: 'Можешь забрать меня в шесть?', uk: 'Можеш забрати мене о шостій?', es: 'Can you pick me up at six?', 'pt-BR': 'Você pode me buscar às seis?', vi: 'Bạn có thể đón tôi lúc sáu giờ không?', id: 'Bisakah kamu menjemput saya jam enam?', tr: 'Beni saat altıda alabilir misin?', pl: 'Możesz mnie odebrać o szóstej?', why: tri('Pick up здесь = забрать человека.', 'Pick up тут = забрати людину.', 'Pick up here = collect a person.', { 'pt-BR': 'Pick up aqui = buscar uma pessoa.', vi: 'Pick up ở đây = đón một người.', id: 'Pick up di sini = menjemput seseorang.', tr: 'Pick up burada = birini almak.', pl: 'Pick up tutaj = odebrać kogoś.' }) },
    { en: 'Do not give up.', ru: 'Не сдавайся.', uk: 'Не здавайся.', es: 'Do not give up.', 'pt-BR': 'Não desista.', vi: 'Đừng bỏ cuộc.', id: 'Jangan menyerah.', tr: 'Vazgeçme.', pl: 'Nie poddawaj się.', why: tri('Give up = перестать пытаться.', 'Give up = перестати намагатися.', 'Give up = stop trying.', { 'pt-BR': 'Give up = desistir.', vi: 'Give up = bỏ cuộc.', id: 'Give up = menyerah.', tr: 'Give up = vazgeçmek.', pl: 'Give up = poddać się.' }) },
    { en: 'We ran out of coffee.', ru: 'У нас закончился кофе.', uk: 'У нас закінчилася кава.', es: 'We ran out of coffee.', 'pt-BR': 'Ficamos sem café.', vi: 'Chúng ta hết cà phê rồi.', id: 'Kopi kita habis.', tr: 'Kahvemiz bitti.', pl: 'Skończyła nam się kawa.', why: tri('Run out of = запас закончился.', 'Run out of = запас закінчився.', 'Run out of = have none left.', { 'pt-BR': 'Run out of = ficar sem algo.', vi: 'Run out of = hết thứ gì đó.', id: 'Run out of = kehabisan sesuatu.', tr: 'Run out of = bir şeyin bitmesi.', pl: 'Run out of = coś się skończyło.' }) },
    { en: 'I found out the answer.', ru: 'Я узнал ответ.', uk: 'Я дізнався відповідь.', es: 'I found out the answer.', 'pt-BR': 'Descobri a resposta.', vi: 'Tôi đã tìm ra câu trả lời.', id: 'Saya mengetahui jawabannya.', tr: 'Cevabı öğrendim.', pl: 'Dowiedziałem się, jaka jest odpowiedź.', why: tri('Find out = узнать информацию.', 'Find out = дізнатися інформацію.', 'Find out = discover information.', { 'pt-BR': 'Find out = descobrir informação.', vi: 'Find out = tìm ra thông tin.', id: 'Find out = mengetahui informasi.', tr: 'Find out = bilgi öğrenmek.', pl: 'Find out = dowiedzieć się informacji.' }) },
  ],
  introBlocks: [
    {
      id: 'intro_pair',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты видишь первый глагол, но выбираешь вторую часть на слух. Из-за этого "включить" легко превращается в "выключить".',
        'Схоже, ти бачиш перше дієслово, але вибираєш другу частку навмання. Через це "увімкнути" легко перетворюється на "вимкнути".',
        'It looks like you see the first verb, but choose the second part by sound. That can turn switch on into switch off.',
        {
          'pt-BR': 'Parece que você vê o primeiro verbo, mas escolhe a segunda parte pelo som. Assim, "ligar" pode virar facilmente "desligar".',
          vi: 'Có vẻ bạn thấy động từ đầu tiên, nhưng chọn phần thứ hai theo âm thanh. Vì vậy "bật" rất dễ thành "tắt".',
          id: 'Sepertinya kamu melihat kata kerja pertama, tetapi memilih bagian kedua dari bunyinya. Akibatnya, "menyalakan" mudah berubah menjadi "mematikan".',
          tr: 'İlk fiili görüyorsun ama ikinci parçayı sese göre seçiyorsun gibi. Bu yüzden "açmak" kolayca "kapatmak" olur.',
          pl: 'Wygląda na to, że widzisz pierwszy czasownik, ale drugą część wybierasz po brzmieniu. Przez to "włączyć" łatwo zmienia się w "wyłączyć".',
        },
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Мини-правило: не переводи turn, look, pick отдельно. Сначала спроси: какой смысл нужен?',
        'Міні-правило: не перекладай turn, look, pick окремо. Спочатку запитай: який сенс потрібен?',
        'Small rule: do not translate turn, look, pick alone. Ask: what meaning do I need?',
        {
          'pt-BR': 'Regra pequena: não traduza turn, look, pick sozinhos. Primeiro pergunte: qual sentido eu preciso?',
          vi: 'Quy tắc nhỏ: đừng dịch riêng turn, look, pick. Trước tiên hãy hỏi: mình cần nghĩa nào?',
          id: 'Aturan kecil: jangan menerjemahkan turn, look, pick sendirian. Tanyakan dulu: makna apa yang dibutuhkan?',
          tr: 'Küçük kural: turn, look, pick kelimelerini tek başına çevirme. Önce sor: hangi anlam gerekiyor?',
          pl: 'Mała zasada: nie tłumacz osobno turn, look, pick. Najpierw zapytaj: jakiego znaczenia potrzebuję?',
        },
      ),
    },
    {
      id: 'intro_pairs',
      type: 'contrast',
      text: tri(
        'Тренируем не отдельный глагол, а пару целиком: turn on, look for, give up.',
        'Тренуємо не окреме дієслово, а пару цілком: turn on, look for, give up.',
        'We train pairs: turn on / turn off, look up / look for, pick up, give up, find out, run out of.',
        {
          'pt-BR': 'Treinamos pares: turn on / turn off, look up / look for, pick up, give up, find out, run out of.',
          vi: 'Chúng ta luyện các cặp: turn on / turn off, look up / look for, pick up, give up, find out, run out of.',
          id: 'Kita melatih pasangan: turn on / turn off, look up / look for, pick up, give up, find out, run out of.',
          tr: 'İkilileri çalışıyoruz: turn on / turn off, look up / look for, pick up, give up, find out, run out of.',
          pl: 'Ćwiczymy pary: turn on / turn off, look up / look for, pick up, give up, find out, run out of.',
        },
      ),
    },
  ],
  steps: [
    phrasalStep({ id: 'phrasal_easy_001', order: 1, difficulty: 'easy', targetSkill: 'turn_on', sentence: 'Please turn ___ the light.', translation: tri('Пожалуйста, включи свет.', 'Будь ласка, увімкни світло.', 'Please turn on the light.', { 'pt-BR': 'Por favor, acenda a luz.', vi: 'Làm ơn bật đèn.', id: 'Tolong nyalakan lampunya.', tr: 'Lütfen ışığı aç.', pl: 'Proszę, włącz światło.' }), options: ['on', 'off', 'up', 'out'], correctAnswer: 'on', pair: 'turn on', correctFeedback: tri('Да. Turn on = включить.', 'Так. Turn on = увімкнути.', 'Yes. Turn on = switch on.', { 'pt-BR': 'Sim. Turn on = ligar.', vi: 'Đúng. Turn on = bật.', id: 'Ya. Turn on = menyalakan.', tr: 'Evet. Turn on = açmak.', pl: 'Tak. Turn on = włączyć.' }), wrong: { off: tri('Turn off значит выключить. Здесь нужно включить: turn on.', 'Turn off означає вимкнути. Тут потрібно увімкнути: turn on.', 'Turn off means switch off. Here we need switch on: turn on.', { 'pt-BR': 'Turn off significa desligar. Aqui precisamos ligar: turn on.', vi: 'Turn off nghĩa là tắt. Ở đây cần bật: turn on.', id: 'Turn off berarti mematikan. Di sini kita perlu menyalakan: turn on.', tr: 'Turn off kapatmak demektir. Burada açmak gerekiyor: turn on.', pl: 'Turn off znaczy wyłączyć. Tutaj trzeba włączyć: turn on.' }), up: tri('Turn up чаще про громкость или силу. Свет включаем: turn on.', 'Turn up частіше про гучність або силу. Світло вмикаємо: turn on.', 'Turn up is usually about volume or intensity. For a light, use turn on.', { 'pt-BR': 'Turn up geralmente é sobre volume ou intensidade. Para luz, use turn on.', vi: 'Turn up thường nói về âm lượng hoặc mức độ. Với đèn, dùng turn on.', id: 'Turn up biasanya tentang volume atau intensitas. Untuk lampu, gunakan turn on.', tr: 'Turn up genelde ses veya yoğunluk içindir. Işık için turn on kullanılır.', pl: 'Turn up zwykle dotyczy głośności albo intensywności. Do światła użyj turn on.' }), out: tri('Turn out дает другой смысл. Для света нужно turn on.', 'Turn out дає інший сенс. Для світла потрібно turn on.', 'Turn out gives a different meaning. For a light, use turn on.', { 'pt-BR': 'Turn out dá outro sentido. Para luz, precisamos de turn on.', vi: 'Turn out tạo nghĩa khác. Với đèn, cần turn on.', id: 'Turn out memberi makna lain. Untuk lampu, gunakan turn on.', tr: 'Turn out başka bir anlam verir. Işık için turn on gerekir.', pl: 'Turn out daje inne znaczenie. Do światła potrzebne jest turn on.' }) }, retryLine: 'Нужен смысл: включить.', focusWords: ['turn on'] }),
    phrasalStep({ id: 'phrasal_easy_002', order: 2, difficulty: 'easy', targetSkill: 'turn_off', sentence: 'Please turn ___ the TV.', translation: tri('Пожалуйста, выключи телевизор.', 'Будь ласка, вимкни телевізор.', 'Please turn off the TV.', { 'pt-BR': 'Por favor, desligue a TV.', vi: 'Làm ơn tắt TV.', id: 'Tolong matikan TV.', tr: 'Lütfen televizyonu kapat.', pl: 'Proszę, wyłącz telewizor.' }), options: ['off', 'on', 'up', 'in'], correctAnswer: 'off', pair: 'turn off', correctFeedback: tri('Да. Turn off = выключить.', 'Так. Turn off = вимкнути.', 'Yes. Turn off = switch off.', { 'pt-BR': 'Sim. Turn off = desligar.', vi: 'Đúng. Turn off = tắt.', id: 'Ya. Turn off = mematikan.', tr: 'Evet. Turn off = kapatmak.', pl: 'Tak. Turn off = wyłączyć.' }), wrong: { on: tri('Turn on значит включить. Здесь нужен обратный смысл: turn off.', 'Turn on означає увімкнути. Тут потрібен протилежний сенс: turn off.', 'Turn on means switch on. Here we need the opposite: turn off.', { 'pt-BR': 'Turn on significa ligar. Aqui precisamos do sentido oposto: turn off.', vi: 'Turn on nghĩa là bật. Ở đây cần nghĩa ngược lại: turn off.', id: 'Turn on berarti menyalakan. Di sini kita perlu kebalikannya: turn off.', tr: 'Turn on açmak demektir. Burada ters anlam gerekiyor: turn off.', pl: 'Turn on znaczy włączyć. Tutaj potrzebne jest przeciwieństwo: turn off.' }), up: tri('Turn up значит сделать громче или сильнее.', 'Turn up означає зробити голосніше або сильніше.', 'Turn up means make louder or stronger.', { 'pt-BR': 'Turn up significa aumentar o volume ou a intensidade.', vi: 'Turn up nghĩa là làm to hơn hoặc mạnh hơn.', id: 'Turn up berarti membuat lebih keras atau lebih kuat.', tr: 'Turn up sesi ya da yoğunluğu artırmak demektir.', pl: 'Turn up znaczy pogłośnić albo wzmocnić.' }), in: tri('Turn in не подходит для телевизора. Нужно turn off.', 'Turn in не підходить для телевізора. Потрібно turn off.', 'Turn in does not fit a TV. We need turn off.', { 'pt-BR': 'Turn in não combina com TV. Precisamos de turn off.', vi: 'Turn in không hợp với TV. Cần turn off.', id: 'Turn in tidak cocok untuk TV. Kita perlu turn off.', tr: 'Turn in televizyon için uygun değil. Turn off gerekiyor.', pl: 'Turn in nie pasuje do telewizora. Potrzebne jest turn off.' }) }, retryLine: 'Нужен смысл: выключить.', focusWords: ['turn off'] }),
    phrasalStep({ id: 'phrasal_easy_003', order: 3, difficulty: 'easy', targetSkill: 'look_up_information', sentence: 'I need to look ___ this word.', translation: tri('Мне нужно найти это слово в словаре.', 'Мені потрібно знайти це слово у словнику.', 'I need to look up this word.', { 'pt-BR': 'Preciso consultar esta palavra no dicionário.', vi: 'Tôi cần tra từ này trong từ điển.', id: 'Saya perlu mencari kata ini di kamus.', tr: 'Bu kelimeye sözlükte bakmam gerekiyor.', pl: 'Muszę sprawdzić to słowo w słowniku.' }), options: ['up', 'for', 'at', 'after'], correctAnswer: 'up', pair: 'look up', correctFeedback: tri('Да. Look up = найти информацию.', 'Так. Look up = знайти інформацію.', 'Yes. Look up = find information.', { 'pt-BR': 'Sim. Look up = consultar informação.', vi: 'Đúng. Look up = tra cứu thông tin.', id: 'Ya. Look up = mencari informasi.', tr: 'Evet. Look up = bilgiye bakmak.', pl: 'Tak. Look up = sprawdzić informację.' }), wrong: { for: tri('Look for = искать предмет или человека. Слово в словаре = look up.', 'Look for = шукати предмет або людину. Слово у словнику = look up.', 'Look for = search for a thing or person. A word in a dictionary = look up.', { 'pt-BR': 'Look for = procurar uma coisa ou pessoa. Uma palavra no dicionário = look up.', vi: 'Look for = tìm một vật hoặc người. Một từ trong từ điển = look up.', id: 'Look for = mencari benda atau orang. Kata di kamus = look up.', tr: 'Look for bir şeyi ya da birini aramaktır. Sözlükte kelime = look up.', pl: 'Look for = szukać rzeczy albo osoby. Słowo w słowniku = look up.' }), at: tri('Look at = смотреть на что-то. Это другой смысл.', 'Look at = дивитися на щось. Це інший сенс.', 'Look at = watch or look at something. That is a different meaning.', { 'pt-BR': 'Look at = olhar para algo. É outro sentido.', vi: 'Look at = nhìn vào thứ gì đó. Đó là nghĩa khác.', id: 'Look at = melihat sesuatu. Itu makna lain.', tr: 'Look at bir şeye bakmaktır. Bu başka bir anlam.', pl: 'Look at = patrzeć na coś. To inne znaczenie.' }), after: tri('Look after = заботиться. Это не про словарь.', 'Look after = піклуватися. Це не про словник.', 'Look after = take care of. This is not about a dictionary.', { 'pt-BR': 'Look after = cuidar. Isto não é sobre dicionário.', vi: 'Look after = chăm sóc. Câu này không nói về từ điển.', id: 'Look after = merawat. Ini bukan tentang kamus.', tr: 'Look after ilgilenmek demektir. Bu sözlükle ilgili değil.', pl: 'Look after = opiekować się. To nie jest o słowniku.' }) }, retryLine: 'Нужен смысл: найти информацию.', focusWords: ['look up'] }),
    phrasalStep({ id: 'phrasal_easy_004', order: 4, difficulty: 'easy', targetSkill: 'look_for_search', sentence: 'I am looking ___ my keys.', translation: tri('Я ищу свои ключи.', 'Я шукаю свої ключі.', 'I am looking for my keys.', { 'pt-BR': 'Estou procurando minhas chaves.', vi: 'Tôi đang tìm chìa khóa của mình.', id: 'Saya sedang mencari kunci saya.', tr: 'Anahtarlarımı arıyorum.', pl: 'Szukam swoich kluczy.' }), options: ['for', 'up', 'after', 'into'], correctAnswer: 'for', pair: 'look for', correctFeedback: tri('Да. Look for = искать.', 'Так. Look for = шукати.', 'Yes. Look for = search for something.', { 'pt-BR': 'Sim. Look for = procurar.', vi: 'Đúng. Look for = tìm kiếm.', id: 'Ya. Look for = mencari.', tr: 'Evet. Look for = aramak.', pl: 'Tak. Look for = szukać.' }), wrong: { up: tri('Look up = найти информацию в словаре или интернете. Ключи ищем: look for.', 'Look up = знайти інформацію у словнику або інтернеті. Ключі шукаємо: look for.', 'Look up = find information in a dictionary or online. For keys, use look for.', { 'pt-BR': 'Look up = consultar informação no dicionário ou na internet. Para chaves, use look for.', vi: 'Look up = tra cứu thông tin trong từ điển hoặc trên mạng. Với chìa khóa, dùng look for.', id: 'Look up = mencari informasi di kamus atau internet. Untuk kunci, gunakan look for.', tr: 'Look up sözlükte ya da internette bilgiye bakmaktır. Anahtarlar için look for kullanılır.', pl: 'Look up = sprawdzić informację w słowniku albo internecie. Do kluczy użyj look for.' }), after: tri('Look after = заботиться. Ключи не нужно воспитывать, их нужно найти.', 'Look after = піклуватися. Ключі не треба виховувати, їх треба знайти.', 'Look after = take care of. Keys need finding, not caring for.', { 'pt-BR': 'Look after = cuidar. Chaves precisam ser encontradas, não cuidadas.', vi: 'Look after = chăm sóc. Chìa khóa cần được tìm, không cần chăm sóc.', id: 'Look after = merawat. Kunci perlu ditemukan, bukan dirawat.', tr: 'Look after ilgilenmek demektir. Anahtarlar bulunur, onlarla ilgilenilmez.', pl: 'Look after = opiekować się. Klucze trzeba znaleźć, nie opiekować się nimi.' }), into: tri('Look into = изучить проблему. Ключи ищем: look for.', 'Look into = вивчити проблему. Ключі шукаємо: look for.', 'Look into = investigate a problem. For keys, use look for.', { 'pt-BR': 'Look into = investigar um problema. Para chaves, use look for.', vi: 'Look into = tìm hiểu một vấn đề. Với chìa khóa, dùng look for.', id: 'Look into = menyelidiki masalah. Untuk kunci, gunakan look for.', tr: 'Look into bir sorunu incelemektir. Anahtarlar için look for kullanılır.', pl: 'Look into = zbadać problem. Do kluczy użyj look for.' }) }, retryLine: 'Нужен смысл: искать предмет.', focusWords: ['look for'] }),
    phrasalStep({ id: 'phrasal_contrast_001', order: 5, difficulty: 'contrast', targetSkill: 'pick_up_collect', sentence: 'Can you pick me ___ at six?', translation: tri('Можешь забрать меня в шесть?', 'Можеш забрати мене о шостій?', 'Can you pick me up at six?', { 'pt-BR': 'Você pode me buscar às seis?', vi: 'Bạn có thể đón tôi lúc sáu giờ không?', id: 'Bisakah kamu menjemput saya jam enam?', tr: 'Beni saat altıda alabilir misin?', pl: 'Możesz mnie odebrać o szóstej?' }), options: ['up', 'out', 'off', 'on'], correctAnswer: 'up', pair: 'pick up', correctFeedback: tri('Да. Pick up здесь = забрать человека.', 'Так. Pick up тут = забрати людину.', 'Yes. Pick up here = collect a person.', { 'pt-BR': 'Sim. Pick up aqui = buscar uma pessoa.', vi: 'Đúng. Pick up ở đây = đón một người.', id: 'Ya. Pick up di sini = menjemput seseorang.', tr: 'Evet. Pick up burada = birini almak.', pl: 'Tak. Pick up tutaj = odebrać kogoś.' }), wrong: { out: tri('Pick out = выбрать из нескольких вариантов.', 'Pick out = вибрати з кількох варіантів.', 'Pick out = choose from several options.', { 'pt-BR': 'Pick out = escolher entre várias opções.', vi: 'Pick out = chọn từ vài lựa chọn.', id: 'Pick out = memilih dari beberapa pilihan.', tr: 'Pick out birkaç seçenek arasından seçmek demektir.', pl: 'Pick out = wybrać spośród kilku opcji.' }), off: tri('Pick off дает другой смысл. Забрать человека = pick up.', 'Pick off дає інший сенс. Забрати людину = pick up.', 'Pick off gives a different meaning. Collect a person = pick up.', { 'pt-BR': 'Pick off dá outro sentido. Buscar uma pessoa = pick up.', vi: 'Pick off tạo nghĩa khác. Đón một người = pick up.', id: 'Pick off memberi makna lain. Menjemput seseorang = pick up.', tr: 'Pick off başka bir anlam verir. Birini almak = pick up.', pl: 'Pick off daje inne znaczenie. Odebrać kogoś = pick up.' }), on: tri('Pick on = придираться к кому-то. Это не "забрать".', 'Pick on = чіплятися до когось. Це не "забрати".', 'Pick on = criticize or bully someone. It is not collect.', { 'pt-BR': 'Pick on = implicar com alguém. Não é "buscar".', vi: 'Pick on = bắt nạt hoặc soi mói ai đó. Không phải "đón".', id: 'Pick on = mengganggu atau mengkritik seseorang. Bukan "menjemput".', tr: 'Pick on birine takılmak ya da zorbalık etmek demektir. "Almak" değildir.', pl: 'Pick on = czepiać się kogoś. To nie znaczy "odebrać".' }) }, retryLine: 'Нужен смысл: забрать человека.', focusWords: ['pick up'] }),
    phrasalStep({ id: 'phrasal_contrast_002', order: 6, difficulty: 'contrast', targetSkill: 'give_up_stop_trying', sentence: 'Do not give ___. Try again.', translation: tri('Не сдавайся. Попробуй еще раз.', 'Не здавайся. Спробуй ще раз.', 'Do not give up. Try again.', { 'pt-BR': 'Não desista. Tente de novo.', vi: 'Đừng bỏ cuộc. Hãy thử lại.', id: 'Jangan menyerah. Coba lagi.', tr: 'Vazgeçme. Tekrar dene.', pl: 'Nie poddawaj się. Spróbuj jeszcze raz.' }), options: ['up', 'back', 'out', 'in'], correctAnswer: 'up', pair: 'give up', correctFeedback: tri('Да. Give up = сдаться или перестать пытаться.', 'Так. Give up = здатися або перестати намагатися.', 'Yes. Give up = stop trying.', { 'pt-BR': 'Sim. Give up = desistir ou parar de tentar.', vi: 'Đúng. Give up = bỏ cuộc hoặc ngừng cố gắng.', id: 'Ya. Give up = menyerah atau berhenti mencoba.', tr: 'Evet. Give up = vazgeçmek ya da denemeyi bırakmak.', pl: 'Tak. Give up = poddać się albo przestać próbować.' }), wrong: { back: tri('Give back = вернуть. Здесь про "не сдавайся".', 'Give back = повернути. Тут про "не здавайся".', 'Give back = return something. Here the meaning is do not stop trying.', { 'pt-BR': 'Give back = devolver. Aqui o sentido é "não desista".', vi: 'Give back = trả lại. Ở đây nghĩa là "đừng bỏ cuộc".', id: 'Give back = mengembalikan. Di sini maknanya "jangan menyerah".', tr: 'Give back geri vermek demektir. Burada anlam "vazgeçme".', pl: 'Give back = oddać. Tutaj chodzi o "nie poddawaj się".' }), out: tri('Give out = раздать или перестать работать. Здесь нужно give up.', 'Give out = роздати або перестати працювати. Тут потрібно give up.', 'Give out = distribute or stop working. Here we need give up.', { 'pt-BR': 'Give out = distribuir ou parar de funcionar. Aqui precisamos de give up.', vi: 'Give out = phát ra/phân phát hoặc ngừng hoạt động. Ở đây cần give up.', id: 'Give out = membagikan atau berhenti berfungsi. Di sini kita perlu give up.', tr: 'Give out dağıtmak ya da çalışmayı bırakmak demektir. Burada give up gerekiyor.', pl: 'Give out = rozdać albo przestać działać. Tutaj potrzebne jest give up.' }), in: tri('Give in = уступить. Близко, но готовая фраза "не сдавайся" = do not give up.', 'Give in = поступитися. Близько, але готова фраза "не здавайся" = do not give up.', 'Give in = yield. Close, but do not stop trying = do not give up.', { 'pt-BR': 'Give in = ceder. É próximo, mas "não desista" = do not give up.', vi: 'Give in = nhượng bộ. Gần nghĩa, nhưng "đừng bỏ cuộc" = do not give up.', id: 'Give in = mengalah. Mirip, tetapi "jangan menyerah" = do not give up.', tr: 'Give in boyun eğmek demektir. Yakın, ama "vazgeçme" = do not give up.', pl: 'Give in = ustąpić. Blisko, ale "nie poddawaj się" = do not give up.' }) }, retryLine: 'Нужен смысл: не сдаваться.', focusWords: ['give up'] }),
    phrasalStep({ id: 'phrasal_contrast_003', order: 7, difficulty: 'contrast', targetSkill: 'find_out_discover', sentence: 'I need to find ___ the truth.', translation: tri('Мне нужно узнать правду.', 'Мені потрібно дізнатися правду.', 'I need to find out the truth.', { 'pt-BR': 'Preciso descobrir a verdade.', vi: 'Tôi cần tìm ra sự thật.', id: 'Saya perlu mengetahui kebenarannya.', tr: 'Gerçeği öğrenmem gerekiyor.', pl: 'Muszę poznać prawdę.' }), options: ['out', 'up', 'off', 'for'], correctAnswer: 'out', pair: 'find out', correctFeedback: tri('Да. Find out = узнать информацию.', 'Так. Find out = дізнатися інформацію.', 'Yes. Find out = discover information.', { 'pt-BR': 'Sim. Find out = descobrir informação.', vi: 'Đúng. Find out = tìm ra thông tin.', id: 'Ya. Find out = mengetahui informasi.', tr: 'Evet. Find out = bilgi öğrenmek.', pl: 'Tak. Find out = dowiedzieć się informacji.' }), wrong: { up: tri('Find up не нужна пара. Узнать информацию = find out.', 'Find up не потрібна пара. Дізнатися інформацію = find out.', 'Find up is not the pair we need. Discover information = find out.', { 'pt-BR': 'Find up não é o par necessário. Descobrir informação = find out.', vi: 'Find up không phải cặp cần dùng. Tìm ra thông tin = find out.', id: 'Find up bukan pasangan yang dibutuhkan. Mengetahui informasi = find out.', tr: 'Find up gereken ikili değil. Bilgi öğrenmek = find out.', pl: 'Find up nie jest potrzebną parą. Dowiedzieć się informacji = find out.' }), off: tri('Find off не дает нужный смысл.', 'Find off не дає потрібний сенс.', 'Find off does not give the needed meaning.', { 'pt-BR': 'Find off não dá o sentido necessário.', vi: 'Find off không tạo nghĩa cần thiết.', id: 'Find off tidak memberi makna yang dibutuhkan.', tr: 'Find off gereken anlamı vermez.', pl: 'Find off nie daje potrzebnego znaczenia.' }), for: tri('Find for не подходит. Нужно find out the truth.', 'Find for не підходить. Потрібно find out the truth.', 'Find for does not fit. We need find out the truth.', { 'pt-BR': 'Find for não combina. Precisamos de find out the truth.', vi: 'Find for không phù hợp. Cần find out the truth.', id: 'Find for tidak cocok. Kita perlu find out the truth.', tr: 'Find for uygun değil. Find out the truth gerekiyor.', pl: 'Find for nie pasuje. Potrzebne jest find out the truth.' }) }, retryLine: 'Нужен смысл: узнать информацию.', focusWords: ['find out'] }),
    phrasalStep({ id: 'phrasal_contrast_004', order: 8, difficulty: 'contrast', targetSkill: 'run_out_of_supply', sentence: 'We ran ___ coffee.', translation: tri('У нас закончился кофе.', 'У нас закінчилася кава.', 'We ran out of coffee.', { 'pt-BR': 'Ficamos sem café.', vi: 'Chúng ta hết cà phê rồi.', id: 'Kopi kita habis.', tr: 'Kahvemiz bitti.', pl: 'Skończyła nam się kawa.' }), options: ['out of', 'into', 'over', 'away'], correctAnswer: 'out of', pair: 'run out of', correctFeedback: tri('Да. Run out of = что-то закончилось.', 'Так. Run out of = щось закінчилося.', 'Yes. Run out of = have none left.', { 'pt-BR': 'Sim. Run out of = ficar sem algo.', vi: 'Đúng. Run out of = hết thứ gì đó.', id: 'Ya. Run out of = kehabisan sesuatu.', tr: 'Evet. Run out of = bir şeyin bitmesi.', pl: 'Tak. Run out of = coś się skończyło.' }), wrong: { into: tri('Run into = случайно встретить или врезаться.', 'Run into = випадково зустріти або врізатися.', 'Run into = meet by chance or crash into.', { 'pt-BR': 'Run into = encontrar por acaso ou bater em algo.', vi: 'Run into = tình cờ gặp hoặc đâm vào.', id: 'Run into = bertemu tanpa sengaja atau menabrak.', tr: 'Run into tesadüfen karşılaşmak ya da çarpmak demektir.', pl: 'Run into = spotkać przypadkiem albo wpaść na coś.' }), over: tri('Run over = переехать или быстро просмотреть.', 'Run over = переїхати або швидко переглянути.', 'Run over = hit with a vehicle or review quickly.', { 'pt-BR': 'Run over = atropelar ou revisar rapidamente.', vi: 'Run over = cán qua hoặc xem nhanh.', id: 'Run over = menabrak dengan kendaraan atau meninjau cepat.', tr: 'Run over araçla çarpmak ya da hızlıca gözden geçirmek demektir.', pl: 'Run over = przejechać albo szybko przejrzeć.' }), away: tri('Run away = убежать. Кофе здесь просто закончился.', 'Run away = втекти. Кава тут просто закінчилася.', 'Run away = escape. Here the coffee is gone.', { 'pt-BR': 'Run away = fugir. Aqui o café simplesmente acabou.', vi: 'Run away = bỏ chạy. Ở đây cà phê chỉ là hết rồi.', id: 'Run away = melarikan diri. Di sini kopinya habis.', tr: 'Run away kaçmak demektir. Burada kahve sadece bitti.', pl: 'Run away = uciec. Tutaj kawa po prostu się skończyła.' }) }, retryLine: 'Нужен смысл: запас закончился.', focusWords: ['run out of'] }),
    phrasalStep({ id: 'phrasal_mixed_001', order: 9, difficulty: 'mixed_review', targetSkill: 'put_on_clothes', sentence: 'Put ___ your jacket. It is cold.', translation: tri('Надень куртку. Холодно.', 'Одягни куртку. Холодно.', 'Put on your jacket. It is cold.', { 'pt-BR': 'Vista sua jaqueta. Está frio.', vi: 'Mặc áo khoác vào. Trời lạnh.', id: 'Pakai jaketmu. Ini dingin.', tr: 'Ceketini giy. Hava soğuk.', pl: 'Załóż kurtkę. Jest zimno.' }), options: ['on', 'off', 'up', 'out'], correctAnswer: 'on', pair: 'put on', correctFeedback: tri('Да. Put on = надеть одежду.', 'Так. Put on = одягнути одяг.', 'Yes. Put on = put clothes on your body.', { 'pt-BR': 'Sim. Put on = vestir uma roupa.', vi: 'Đúng. Put on = mặc quần áo vào.', id: 'Ya. Put on = memakai pakaian.', tr: 'Evet. Put on = kıyafet giymek.', pl: 'Tak. Put on = założyć ubranie.' }), wrong: { off: tri('Put off = отложить. Одежду надевают: put on.', 'Put off = відкласти. Одяг одягають: put on.', 'Put off = postpone. For clothes, use put on.', { 'pt-BR': 'Put off = adiar. Para roupas, use put on.', vi: 'Put off = trì hoãn. Với quần áo, dùng put on.', id: 'Put off = menunda. Untuk pakaian, gunakan put on.', tr: 'Put off ertelemek demektir. Kıyafet için put on kullanılır.', pl: 'Put off = odłożyć. Do ubrań użyj put on.' }), up: tri('Put up = поднять или разместить. Куртку надевают: put on.', 'Put up = підняти або розмістити. Куртку одягають: put on.', 'Put up = raise or place. For a jacket, use put on.', { 'pt-BR': 'Put up = levantar ou colocar em algum lugar. Para jaqueta, use put on.', vi: 'Put up = nâng lên hoặc đặt lên. Với áo khoác, dùng put on.', id: 'Put up = mengangkat atau memasang. Untuk jaket, gunakan put on.', tr: 'Put up kaldırmak ya da yerleştirmek demektir. Ceket için put on kullanılır.', pl: 'Put up = podnieść albo umieścić. Do kurtki użyj put on.' }), out: tri('Put out = погасить или вынести. Это не про куртку.', 'Put out = загасити або винести. Це не про куртку.', 'Put out = extinguish or put outside. This is not about a jacket.', { 'pt-BR': 'Put out = apagar ou pôr para fora. Isto não é sobre jaqueta.', vi: 'Put out = dập tắt hoặc đưa ra ngoài. Câu này không nói về áo khoác.', id: 'Put out = memadamkan atau mengeluarkan. Ini bukan tentang jaket.', tr: 'Put out söndürmek ya da dışarı koymak demektir. Bu ceketle ilgili değil.', pl: 'Put out = zgasić albo wynieść. To nie jest o kurtce.' }) }, retryLine: 'Нужен смысл: надеть одежду.', focusWords: ['put on'] }),
    phrasalStep({ id: 'phrasal_mixed_002', order: 10, difficulty: 'mixed_review', targetSkill: 'take_off_clothes', sentence: 'Take ___ your shoes before you come in.', translation: tri('Сними обувь перед тем, как войти.', 'Зніми взуття перед тим, як зайти.', 'Take off your shoes before you come in.', { 'pt-BR': 'Tire os sapatos antes de entrar.', vi: 'Cởi giày trước khi vào.', id: 'Lepas sepatumu sebelum masuk.', tr: 'İçeri girmeden önce ayakkabılarını çıkar.', pl: 'Zdejmij buty, zanim wejdziesz.' }), options: ['off', 'on', 'up', 'out'], correctAnswer: 'off', pair: 'take off', correctFeedback: tri('Да. Take off = снять одежду или обувь.', 'Так. Take off = зняти одяг або взуття.', 'Yes. Take off = remove clothes or shoes.', { 'pt-BR': 'Sim. Take off = tirar roupa ou calçado.', vi: 'Đúng. Take off = cởi quần áo hoặc giày.', id: 'Ya. Take off = melepas pakaian atau sepatu.', tr: 'Evet. Take off = kıyafet ya da ayakkabı çıkarmak.', pl: 'Tak. Take off = zdjąć ubranie albo buty.' }), wrong: { on: tri('Take on = взять на себя задачу. Обувь снимают: take off.', 'Take on = взяти на себе завдання. Взуття знімають: take off.', 'Take on = accept a task. For shoes, use take off.', { 'pt-BR': 'Take on = assumir uma tarefa. Para sapatos, use take off.', vi: 'Take on = nhận một nhiệm vụ. Với giày, dùng take off.', id: 'Take on = menerima tugas. Untuk sepatu, gunakan take off.', tr: 'Take on bir görevi üstlenmek demektir. Ayakkabı için take off kullanılır.', pl: 'Take on = podjąć się zadania. Do butów użyj take off.' }), up: tri('Take up = начать занятие или занять место.', 'Take up = почати заняття або зайняти місце.', 'Take up = start an activity or use space.', { 'pt-BR': 'Take up = começar uma atividade ou ocupar espaço.', vi: 'Take up = bắt đầu một hoạt động hoặc chiếm chỗ.', id: 'Take up = memulai kegiatan atau memakai ruang.', tr: 'Take up bir etkinliğe başlamak ya da yer kaplamak demektir.', pl: 'Take up = zacząć zajęcie albo zajmować miejsce.' }), out: tri('Take out = вынести или достать. С обувью нужно take off.', 'Take out = винести або дістати. З взуттям потрібно take off.', 'Take out = remove from a place or take outside. For shoes, use take off.', { 'pt-BR': 'Take out = tirar de um lugar ou levar para fora. Para sapatos, use take off.', vi: 'Take out = lấy ra hoặc mang ra ngoài. Với giày, dùng take off.', id: 'Take out = mengeluarkan atau membawa keluar. Untuk sepatu, gunakan take off.', tr: 'Take out bir yerden çıkarmak ya da dışarı götürmek demektir. Ayakkabı için take off kullanılır.', pl: 'Take out = wyjąć albo wynieść. Do butów użyj take off.' }) }, retryLine: 'Нужен смысл: снять.', focusWords: ['take off'] }),
    phrasalStep({ id: 'phrasal_mixed_003', order: 11, difficulty: 'mixed_review', targetSkill: 'carry_on_continue', sentence: 'Please carry ___ with your work.', translation: tri('Пожалуйста, продолжай работу.', 'Будь ласка, продовжуй роботу.', 'Please carry on with your work.', { 'pt-BR': 'Por favor, continue com seu trabalho.', vi: 'Làm ơn tiếp tục công việc của bạn.', id: 'Tolong lanjutkan pekerjaanmu.', tr: 'Lütfen çalışmana devam et.', pl: 'Proszę, kontynuuj swoją pracę.' }), options: ['on', 'out', 'off', 'up'], correctAnswer: 'on', pair: 'carry on', correctFeedback: tri('Да. Carry on = продолжать.', 'Так. Carry on = продовжувати.', 'Yes. Carry on = continue.', { 'pt-BR': 'Sim. Carry on = continuar.', vi: 'Đúng. Carry on = tiếp tục.', id: 'Ya. Carry on = melanjutkan.', tr: 'Evet. Carry on = devam etmek.', pl: 'Tak. Carry on = kontynuować.' }), wrong: { out: tri('Carry out = выполнить план или задачу.', 'Carry out = виконати план або завдання.', 'Carry out = complete a plan or task.', { 'pt-BR': 'Carry out = executar um plano ou tarefa.', vi: 'Carry out = thực hiện một kế hoạch hoặc nhiệm vụ.', id: 'Carry out = melaksanakan rencana atau tugas.', tr: 'Carry out bir planı ya da görevi yerine getirmek demektir.', pl: 'Carry out = wykonać plan albo zadanie.' }), off: tri('Carry off = справиться с чем-то сложным. Здесь нужно продолжать.', 'Carry off = впоратися з чимось складним. Тут потрібно продовжувати.', 'Carry off = succeed at something difficult. Here we need continue.', { 'pt-BR': 'Carry off = conseguir fazer algo difícil. Aqui precisamos de continuar.', vi: 'Carry off = làm được điều khó. Ở đây cần nghĩa tiếp tục.', id: 'Carry off = berhasil melakukan sesuatu yang sulit. Di sini kita perlu melanjutkan.', tr: 'Carry off zor bir şeyi başarmak demektir. Burada devam etmek gerekiyor.', pl: 'Carry off = poradzić sobie z czymś trudnym. Tutaj trzeba kontynuować.' }), up: tri('Carry up не дает нужный смысл. Продолжать = carry on.', 'Carry up не дає потрібний сенс. Продовжувати = carry on.', 'Carry up does not give the needed meaning. Continue = carry on.', { 'pt-BR': 'Carry up não dá o sentido necessário. Continuar = carry on.', vi: 'Carry up không tạo nghĩa cần thiết. Tiếp tục = carry on.', id: 'Carry up tidak memberi makna yang dibutuhkan. Melanjutkan = carry on.', tr: 'Carry up gereken anlamı vermez. Devam etmek = carry on.', pl: 'Carry up nie daje potrzebnego znaczenia. Kontynuować = carry on.' }) }, retryLine: 'Нужен смысл: продолжать.', focusWords: ['carry on'] }),
    phrasalStep({ id: 'phrasal_mixed_004', order: 12, difficulty: 'mixed_review', targetSkill: 'fill_in_form', sentence: 'Please fill ___ this form.', translation: tri('Пожалуйста, заполни эту форму.', 'Будь ласка, заповни цю форму.', 'Please fill in this form.', { 'pt-BR': 'Por favor, preencha este formulário.', vi: 'Làm ơn điền mẫu này.', id: 'Tolong isi formulir ini.', tr: 'Lütfen bu formu doldur.', pl: 'Proszę, wypełnij ten formularz.' }), options: ['in', 'out', 'up', 'off'], correctAnswer: 'in', pair: 'fill in', correctFeedback: tri('Да. Fill in = заполнить форму.', 'Так. Fill in = заповнити форму.', 'Yes. Fill in = complete a form.', { 'pt-BR': 'Sim. Fill in = preencher um formulário.', vi: 'Đúng. Fill in = điền mẫu.', id: 'Ya. Fill in = mengisi formulir.', tr: 'Evet. Fill in = form doldurmak.', pl: 'Tak. Fill in = wypełnić formularz.' }), wrong: { out: tri('Fill out тоже может значить заполнить форму, но здесь тренируем пару fill in.', 'Fill out теж може означати заповнити форму, але тут тренуємо пару fill in.', 'Fill out can also mean complete a form, but this item trains fill in.', { 'pt-BR': 'Fill out também pode significar preencher um formulário, mas aqui treinamos fill in.', vi: 'Fill out cũng có thể nghĩa là điền mẫu, nhưng ở đây luyện fill in.', id: 'Fill out juga bisa berarti mengisi formulir, tetapi item ini melatih fill in.', tr: 'Fill out da form doldurmak anlamına gelebilir, ama burada fill in çalışıyoruz.', pl: 'Fill out też może znaczyć wypełnić formularz, ale tutaj ćwiczymy fill in.' }), up: tri('Fill up = наполнить до конца, например бак или стакан.', 'Fill up = наповнити до кінця, наприклад бак або склянку.', 'Fill up = fill completely, for example a tank or a glass.', { 'pt-BR': 'Fill up = encher completamente, por exemplo um tanque ou copo.', vi: 'Fill up = làm đầy hoàn toàn, ví dụ bình xăng hoặc cốc.', id: 'Fill up = mengisi sampai penuh, misalnya tangki atau gelas.', tr: 'Fill up tamamen doldurmak demektir, örneğin depo ya da bardak.', pl: 'Fill up = napełnić do pełna, na przykład bak albo szklankę.' }), off: tri('Fill off не нужная пара. Для формы здесь нужно in.', 'Fill off не потрібна пара. Для форми тут потрібно in.', 'Fill off is not the needed pair. For a form here, use in.', { 'pt-BR': 'Fill off não é o par necessário. Para formulário aqui, use in.', vi: 'Fill off không phải cặp cần dùng. Với mẫu này, dùng in.', id: 'Fill off bukan pasangan yang dibutuhkan. Untuk formulir di sini, gunakan in.', tr: 'Fill off gereken ikili değil. Burada form için in gerekir.', pl: 'Fill off nie jest potrzebną parą. Do formularza tutaj użyj in.' }) }, retryLine: 'Нужен смысл: заполнить форму.', focusWords: ['fill in'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['turn_on_off_confusion', 'look_up_for_confusion', 'pair_meaning_unit'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем пару и смысл второй части.', 'Звичайне пояснення: показуємо пару і сенс другої частки.', 'Normal explanation: show the pair and the meaning of the second part.', {
      'pt-BR': 'Explicação normal: mostramos o par e o sentido da segunda parte.',
      vi: 'Giải thích bình thường: hiển thị cặp và nghĩa của phần thứ hai.',
      id: 'Penjelasan biasa: tampilkan pasangan dan makna bagian kedua.',
      tr: 'Normal açıklama: ikiliyi ve ikinci parçanın anlamını gösteririz.',
      pl: 'Zwykłe wyjaśnienie: pokazujemy parę i znaczenie drugiej części.',
    }),
    depth2: tri('Проще: не первое слово отдельно, а вся пара.', 'Простіше: не перше слово окремо, а вся пара.', 'Simpler: not the first word alone, but the whole pair.', {
      'pt-BR': 'Mais simples: não a primeira palavra sozinha, mas o par inteiro.',
      vi: 'Đơn giản hơn: không phải từ đầu tiên riêng lẻ, mà là cả cặp.',
      id: 'Lebih sederhana: bukan kata pertama saja, tetapi seluruh pasangan.',
      tr: 'Daha basit: ilk kelime tek başına değil, bütün ikili.',
      pl: 'Prościej: nie pierwsze słowo osobno, tylko cała para.',
    }),
    depth3: tri('Сравни две пары: turn on = включить, turn off = выключить.', 'Порівняй дві пари: turn on = увімкнути, turn off = вимкнути.', 'Compare two pairs: turn on = switch on, turn off = switch off.', {
      'pt-BR': 'Compare dois pares: turn on = ligar, turn off = desligar.',
      vi: 'So sánh hai cặp: turn on = bật, turn off = tắt.',
      id: 'Bandingkan dua pasangan: turn on = menyalakan, turn off = mematikan.',
      tr: 'İki ikiliyi karşılaştır: turn on = açmak, turn off = kapatmak.',
      pl: 'Porównaj dwie pary: turn on = włączyć, turn off = wyłączyć.',
    }),
    depth4: tri('Почти подсказка: выбираем пару под смысл фразы.', 'Майже підказка: вибираємо пару під сенс фрази.', 'Almost a hint: choose the pair for the meaning of the sentence.', {
      'pt-BR': 'Quase uma dica: escolha o par pelo sentido da frase.',
      vi: 'Gần như gợi ý: chọn cặp theo nghĩa của câu.',
      id: 'Hampir menjadi petunjuk: pilih pasangan sesuai makna kalimat.',
      tr: 'Neredeyse ipucu: ikiliyi cümlenin anlamına göre seç.',
      pl: 'Prawie podpowiedź: wybierz parę pod znaczenie zdania.',
    }),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card' },
    afterThreeWrongInSameExercise: { action: 'show_pair_meaning_hint_then_retry' },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode' },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_phrasal_001', prompt: tri('Нужен смысл "включить". Какая пара?', 'Потрібен сенс "увімкнути". Яка пара?', 'We need switch on. Which pair?', { 'pt-BR': 'Precisamos do sentido "ligar". Qual é o par?', vi: 'Cần nghĩa "bật". Cặp nào đúng?', id: 'Kita perlu makna "menyalakan". Pasangan mana?', tr: '"Açmak" anlamı gerekiyor. Hangi ikili?', pl: 'Potrzebujemy znaczenia "włączyć". Która para?' }), options: ['turn on', 'turn off'], correctIndex: 0, thenReturnToExerciseId: 'phrasal_easy_001' },
      { id: 'guided_phrasal_002', prompt: tri('Нужен смысл "искать ключи". Какая пара?', 'Потрібен сенс "шукати ключі". Яка пара?', 'We need search for keys. Which pair?', { 'pt-BR': 'Precisamos do sentido "procurar as chaves". Qual é o par?', vi: 'Cần nghĩa "tìm chìa khóa". Cặp nào đúng?', id: 'Kita perlu makna "mencari kunci". Pasangan mana?', tr: '"Anahtarları aramak" anlamı gerekiyor. Hangi ikili?', pl: 'Potrzebujemy znaczenia "szukać kluczy". Która para?' }), options: ['look up', 'look for'], correctIndex: 1, thenReturnToExerciseId: 'phrasal_easy_004' },
      { id: 'guided_phrasal_003', prompt: tri('Нужен смысл "не сдаваться". Какая пара?', 'Потрібен сенс "не здаватися". Яка пара?', 'We need not stop trying. Which pair?', { 'pt-BR': 'Precisamos do sentido "não desistir". Qual é o par?', vi: 'Cần nghĩa "không bỏ cuộc". Cặp nào đúng?', id: 'Kita perlu makna "jangan menyerah". Pasangan mana?', tr: '"Vazgeçmemek" anlamı gerekiyor. Hangi ikili?', pl: 'Potrzebujemy znaczenia "nie poddawać się". Która para?' }), options: ['give up', 'give back'], correctIndex: 0, thenReturnToExerciseId: 'phrasal_contrast_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'phrasal_particle',
    microDiagnosisId: 'phrasal_particle_pair',
    diagnosisLabel: tri('Готовые пары', 'Готові пари', 'Ready-made pairs', {
      'pt-BR': 'Pares prontos',
      vi: 'Cặp cố định',
      id: 'Pasangan siap pakai',
      tr: 'Hazır ikililer',
      pl: 'Gotowe pary',
    }),
    contrastSet: CONTRAST,
    focusWords: CONTRAST,
    focusPatterns: ['turn_on', 'turn_off', 'look_up_information', 'look_for_search', 'pick_up_collect', 'give_up_stop_trying', 'find_out_discover', 'run_out_of_supply', 'put_on_clothes', 'take_off_clothes', 'carry_on_continue', 'fill_in_form'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_phrasal_particle_pair_start',
    answer: 'diagnosis_training_phrasal_particle_pair_answer',
    mastery: 'diagnosis_training_phrasal_particle_pair_mastery',
    recovery: 'diagnosis_training_phrasal_particle_pair_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'phrasal_particle',
      microDiagnosisId: 'phrasal_particle_pair',
      contrastSet: CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logParticleChoice: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=phrasal_particle&microDiagnosisId=phrasal_particle_pair',
  },
  qualityChecklist: {
    hasStableId: true,
    hasCategory: true,
    hasMultilingualTitle: true,
    hasPlainDiagnosisText: true,
    hasMentalModel: true,
    hasContrastSet: true,
    hasAtLeastSixExamples: true,
    hasAtLeastTwelveExercises: true,
    hasEasyContrastMixedStructure: true,
    hasDistractorSpecificFeedback: true,
    hasRetryFeedbackLevels: true,
    hasGuidedModeForRepeatedMistakes: true,
    hasMasteryRules: true,
    hasSmartTrainerConfig: true,
    hasAnalyticsPayload: true,
    hasFallbackRoute: true,
  },
};
