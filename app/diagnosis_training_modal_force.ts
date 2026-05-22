// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.
import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const tri = (
  ru: string,
  uk = ru,
  es = 'Este entrenamiento está disponible para este idioma de interfaz.',
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (planned[locale]) copy[locale] = planned[locale];
  }
  return copy;
};

const CONTRAST_SET = [
  'can',
  'could',
  'should',
  'must',
  'have to',
  "mustn't",
  "don't have to",
  'may',
  'might',
];

const option = (text: string) => ({ id: text, text });

const retry = (line: string): [TriText, TriText, TriText, TriText] => [
  tri(line, line, 'First choose the meaning: allowed, advisable, required, forbidden, not required, or possible.', {
    'pt-BR': 'Primeiro escolha o sentido: permitido, aconselhável, obrigatório, proibido, não obrigatório ou possível.',
    vi: 'Trước tiên chọn nghĩa: được phép, nên làm, bắt buộc, bị cấm, không bắt buộc hoặc có thể.',
    id: 'Pilih maknanya dulu: diizinkan, disarankan, wajib, dilarang, tidak wajib, atau mungkin.',
    tr: 'Önce anlamı seç: izin, tavsiye, zorunluluk, yasak, zorunlu değil ya da olasılık.',
    pl: 'Najpierw wybierz znaczenie: dozwolone, wskazane, wymagane, zakazane, niewymagane albo możliwe.',
  }),
  tri(
    'Сначала выбери смысл: можно, стоит, надо, запрещено, не обязательно или возможно.',
    'Спочатку вибери сенс: можна, варто, треба, заборонено, не обовʼязково або можливо.',
    'First choose the meaning: allowed, advisable, required, forbidden, not required, or possible.',
    {
      'pt-BR': 'Primeiro escolha o sentido: permitido, aconselhável, obrigatório, proibido, não obrigatório ou possível.',
      vi: 'Trước tiên chọn nghĩa: được phép, nên làm, bắt buộc, bị cấm, không bắt buộc hoặc có thể.',
      id: 'Pilih maknanya dulu: diizinkan, disarankan, wajib, dilarang, tidak wajib, atau mungkin.',
      tr: 'Önce anlamı seç: izin, tavsiye, zorunluluk, yasak, zorunlu değil ya da olasılık.',
      pl: 'Najpierw wybierz znaczenie: dozwolone, wskazane, wymagane, zakazane, niewymagane albo możliwe.',
    },
  ),
  tri(
    "Самая опасная пара: mustn't = нельзя, don't have to = не обязательно.",
    "Найнебезпечніша пара: mustn't = не можна, don't have to = не обовʼязково.",
    "The most dangerous pair: mustn't = forbidden, don't have to = not required.",
    {
      'pt-BR': "O par mais perigoso: mustn't = proibido, don't have to = não obrigatório.",
      vi: "Cặp dễ nhầm nhất: mustn't = bị cấm, don't have to = không bắt buộc.",
      id: "Pasangan paling berbahaya: mustn't = dilarang, don't have to = tidak wajib.",
      tr: "En tehlikeli ikili: mustn't = yasak, don't have to = zorunlu değil.",
      pl: "Najbardziej ryzykowna para: mustn't = zakazane, don't have to = niewymagane.",
    },
  ),
  tri(
    'Не переводи все одним словом "можно". Смотри на силу фразы.',
    'Не перекладай усе одним словом "можна". Дивись на силу фрази.',
    'Do not translate everything as "can". Look at the force of the phrase.',
    {
      'pt-BR': 'Não traduza tudo como "can". Observe a força da frase.',
      vi: 'Đừng dịch mọi thứ thành "can". Hãy nhìn lực nghĩa của câu.',
      id: 'Jangan menerjemahkan semuanya sebagai "can". Lihat kekuatan makna frasanya.',
      tr: 'Her şeyi "can" diye çevirme. Cümlenin gücüne bak.',
      pl: 'Nie tłumacz wszystkiego jako "can". Patrz na siłę zdania.',
    },
  ),
];

const defaultWrong = (correctAnswer: string): TriText => tri(
  `Не та сила. Здесь нужно "${correctAnswer}": смысл фразы другой.`,
  `Не та сила. Тут потрібно "${correctAnswer}": сенс фрази інший.`,
  `Wrong force. We need "${correctAnswer}": the meaning is different.`,
  {
    'pt-BR': `Força errada. Precisamos de "${correctAnswer}": o sentido da frase é outro.`,
    vi: `Sai lực nghĩa. Ở đây cần "${correctAnswer}": nghĩa của câu khác.`,
    id: `Kekuatan maknanya salah. Kita perlu "${correctAnswer}": maknanya berbeda.`,
    tr: `Yanlış güç. Burada "${correctAnswer}" gerekiyor: cümlenin anlamı farklı.`,
    pl: `Zła siła znaczenia. Potrzebne jest "${correctAnswer}": sens zdania jest inny.`,
  },
);

function step(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  options: string[];
  correctAnswer: string;
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
      'Здесь важно не само слово, а сила: разрешение, совет, правило, запрет, отсутствие обязанности или вероятность.',
      'Тут важливе не саме слово, а сила: дозвіл, порада, правило, заборона, відсутність обовʼязку або ймовірність.',
      'Here the word itself is not enough; choose the force: permission, advice, rule, prohibition, no obligation, or probability.',
      {
        'pt-BR': 'Aqui a palavra sozinha não basta; escolha a força: permissão, conselho, regra, proibição, ausência de obrigação ou probabilidade.',
        vi: 'Ở đây bản thân từ chưa đủ; hãy chọn lực nghĩa: cho phép, lời khuyên, quy tắc, cấm, không bắt buộc hoặc khả năng.',
        id: 'Di sini kata saja tidak cukup; pilih kekuatannya: izin, saran, aturan, larangan, tidak wajib, atau kemungkinan.',
        tr: 'Burada kelimenin kendisi yetmez; gücü seç: izin, tavsiye, kural, yasak, zorunlu olmama ya da olasılık.',
        pl: 'Tutaj samo słowo nie wystarcza; wybierz siłę: pozwolenie, radę, regułę, zakaz, brak obowiązku albo prawdopodobieństwo.',
      },
    ),
    microTask: tri(
      'Выбери слово с нужной силой.',
      'Вибери слово з потрібною силою.',
      'Choose the word with the right force.',
      {
        'pt-BR': 'Escolha a palavra com a força certa.',
        vi: 'Chọn từ có lực nghĩa đúng.',
        id: 'Pilih kata dengan kekuatan makna yang tepat.',
        tr: 'Doğru güce sahip kelimeyi seç.',
        pl: 'Wybierz słowo o właściwej sile.',
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
    retryFeedback: retry(input.retryLine),
    fallbackExplanation: tri(
      "Can = можно/умею. Could = раньше мог или вежливая просьба. Should = стоит. Must/have to = надо. Mustn't = нельзя. Don't have to = не обязательно. May/might = возможно.",
      "Can = можна/вмію. Could = раніше міг або ввічливе прохання. Should = варто. Must/have to = треба. Mustn't = не можна. Don't have to = не обовʼязково. May/might = можливо.",
      "Can = allowed/able. Could = past ability or polite request. Should = advisable. Must/have to = required. Mustn't = forbidden. Don't have to = not required. May/might = possible.",
      {
        'pt-BR': "Can = permitido/capaz. Could = habilidade no passado ou pedido educado. Should = aconselhável. Must/have to = obrigatório. Mustn't = proibido. Don't have to = não obrigatório. May/might = possível.",
        vi: "Can = được phép/có khả năng. Could = khả năng trong quá khứ hoặc yêu cầu lịch sự. Should = nên. Must/have to = bắt buộc. Mustn't = bị cấm. Don't have to = không bắt buộc. May/might = có thể.",
        id: "Can = boleh/mampu. Could = kemampuan masa lalu atau permintaan sopan. Should = disarankan. Must/have to = wajib. Mustn't = dilarang. Don't have to = tidak wajib. May/might = mungkin.",
        tr: "Can = izin/yapabilme. Could = geçmiş beceri ya da kibar rica. Should = tavsiye. Must/have to = zorunlu. Mustn't = yasak. Don't have to = zorunlu değil. May/might = mümkün.",
        pl: "Can = dozwolone/umieć. Could = umiejętność w przeszłości albo uprzejma prośba. Should = wskazane. Must/have to = wymagane. Mustn't = zakazane. Don't have to = niewymagane. May/might = możliwe.",
      },
    ),
    focusWords: input.focusWords,
  };
}

export const MODAL_FORCE_TRAINING: DiagnosisTraining = {
  id: 'modal_force',
  category: 'modal',
  version: '1.0.0',
  status: 'active',
  priority: 38,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Can / Should / Must: выбираем силу', 'Can / Should / Must: вибираємо силу', 'Can / Should / Must: choose the force', {
    'pt-BR': 'Can / Should / Must: escolha a força',
    vi: 'Can / Should / Must: chọn lực nghĩa',
    id: 'Can / Should / Must: pilih kekuatannya',
    tr: 'Can / Should / Must: gücü seç',
    pl: 'Can / Should / Must: wybierz siłę',
  }),
  shortTitle: tri('Сила can/should/must', 'Сила can/should/must', 'Force of can/should/must', {
    'pt-BR': 'Força de can/should/must',
    vi: 'Lực của can/should/must',
    id: 'Kekuatan can/should/must',
    tr: 'can/should/must gücü',
    pl: 'Siła can/should/must',
  }),
  shortDiagnosis: tri(
    'Ты выбираешь похожее слово, но меняешь смысл: можно, стоит, надо, нельзя или не обязательно.',
    'Ти вибираєш схоже слово, але змінюєш сенс: можна, варто, треба, не можна або не обовʼязково.',
    'You choose a similar word, but change the meaning: allowed, advisable, required, forbidden, or not required.',
    {
      'pt-BR': 'Você escolhe uma palavra parecida, mas muda o sentido: permitido, aconselhável, obrigatório, proibido ou não obrigatório.',
      vi: 'Bạn chọn một từ giống giống, nhưng đổi nghĩa: được phép, nên làm, bắt buộc, bị cấm hoặc không bắt buộc.',
      id: 'Kamu memilih kata yang mirip, tetapi mengubah makna: diizinkan, disarankan, wajib, dilarang, atau tidak wajib.',
      tr: 'Benzer bir kelime seçiyorsun ama anlamı değiştiriyorsun: izin, tavsiye, zorunluluk, yasak ya da zorunlu değil.',
      pl: 'Wybierasz podobne słowo, ale zmieniasz sens: dozwolone, wskazane, wymagane, zakazane albo niewymagane.',
    },
  ),
  diagnosisText: tri(
    'Ошибка здесь не в действии после модального слова. Ошибка в силе фразы: совет превращается в приказ, а запрет - в "не обязательно".',
    'Помилка тут не в дії після модального слова. Помилка в силі фрази: порада перетворюється на наказ, а заборона - на "не обовʼязково".',
    'The mistake is not in the action after the modal word. The mistake is the force: advice can become an order, and prohibition can become "not required".',
    {
      'pt-BR': 'O erro não está na ação depois do modal. O erro está na força da frase: conselho pode virar ordem, e proibição pode virar "não obrigatório".',
      vi: 'Lỗi không nằm ở hành động sau động từ khuyết thiếu. Lỗi nằm ở lực nghĩa: lời khuyên có thể thành mệnh lệnh, và lệnh cấm có thể thành "không bắt buộc".',
      id: 'Kesalahannya bukan pada tindakan setelah modal. Kesalahannya ada pada kekuatan makna: saran bisa menjadi perintah, dan larangan bisa menjadi "tidak wajib".',
      tr: 'Hata modal kelimeden sonraki eylemde değil. Hata cümlenin gücünde: tavsiye emre, yasak da "zorunlu değil" anlamına dönüşebilir.',
      pl: 'Błąd nie jest w czynności po czasowniku modalnym. Błąd jest w sile zdania: rada może stać się nakazem, a zakaz może stać się "niewymagane".',
    },
  ),
  mentalModel: tri(
    'Думай шкалой: can = можно, should = стоит, must/have to = надо, must not = нельзя, do not have to = не обязательно, might = возможно.',
    'Думай шкалою: can = можна, should = варто, must/have to = треба, must not = не можна, do not have to = не обовʼязково, might = можливо.',
    'Think as a scale: can = allowed, should = advisable, must/have to = required, must not = forbidden, do not have to = not required, might = possible.',
    {
      'pt-BR': 'Pense como uma escala: can = permitido, should = aconselhável, must/have to = obrigatório, must not = proibido, do not have to = não obrigatório, might = possível.',
      vi: 'Hãy nghĩ như một thang mức độ: can = được phép, should = nên, must/have to = bắt buộc, must not = bị cấm, do not have to = không bắt buộc, might = có thể.',
      id: 'Pikirkan sebagai skala: can = diizinkan, should = disarankan, must/have to = wajib, must not = dilarang, do not have to = tidak wajib, might = mungkin.',
      tr: 'Bunu bir ölçek gibi düşün: can = izin, should = tavsiye, must/have to = zorunluluk, must not = yasak, do not have to = zorunlu değil, might = olasılık.',
      pl: 'Myśl o tym jak o skali: can = dozwolone, should = wskazane, must/have to = wymagane, must not = zakazane, do not have to = niewymagane, might = możliwe.',
    },
  ),
  contrastSet: CONTRAST_SET,
  coreRule: tri(
    "Главная ловушка: mustn't не равно don't have to. Mustn't = нельзя. Don't have to = можно, но не обязательно.",
    "Головна пастка: mustn't не дорівнює don't have to. Mustn't = не можна. Don't have to = можна, але не обовʼязково.",
    "Main trap: mustn't is not don't have to. Mustn't = forbidden. Don't have to = allowed, but not required.",
    {
      'pt-BR': "Armadilha principal: mustn't não é don't have to. Mustn't = proibido. Don't have to = permitido, mas não obrigatório.",
      vi: "Bẫy chính: mustn't không giống don't have to. Mustn't = bị cấm. Don't have to = được phép, nhưng không bắt buộc.",
      id: "Jebakan utama: mustn't bukan don't have to. Mustn't = dilarang. Don't have to = boleh, tetapi tidak wajib.",
      tr: "Ana tuzak: mustn't, don't have to değildir. Mustn't = yasak. Don't have to = izin var ama zorunlu değil.",
      pl: "Główna pułapka: mustn't to nie don't have to. Mustn't = zakazane. Don't have to = dozwolone, ale niewymagane.",
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Can часто значит можно или умею.',
      'Could может быть вежливой просьбой или прошлой способностью.',
      'Should звучит как совет.',
      'Must и have to звучат как надо.',
      "Mustn't значит нельзя.",
      "Don't have to значит не обязательно.",
      'May и might часто про вероятность или возможность.',
    ],
    uk: [
      'Can часто означає можна або вмію.',
      'Could може бути ввічливим проханням або минулою здатністю.',
      'Should звучить як порада.',
      'Must і have to звучать як треба.',
      "Mustn't означає не можна.",
      "Don't have to означає не обовʼязково.",
      'May і might часто про ймовірність або можливість.',
    ],
    es: [
      'Can often means allowed or able.',
      'Could can be a polite request or past ability.',
      'Should sounds like advice.',
      'Must and have to sound like requirement.',
      "Mustn't means forbidden.",
      "Don't have to means not required.",
      'May and might often mean possibility.',
    ],
    'pt-BR': [
      'Can muitas vezes significa permitido ou capaz.',
      'Could pode ser um pedido educado ou habilidade no passado.',
      'Should soa como conselho.',
      'Must e have to soam como obrigação.',
      "Mustn't significa proibido.",
      "Don't have to significa que não é obrigatório.",
      'May e might muitas vezes indicam possibilidade.',
    ],
    vi: [
      'Can thường nghĩa là được phép hoặc có khả năng.',
      'Could có thể là lời yêu cầu lịch sự hoặc khả năng trong quá khứ.',
      'Should nghe như lời khuyên.',
      'Must và have to nghe như yêu cầu bắt buộc.',
      "Mustn't nghĩa là bị cấm.",
      "Don't have to nghĩa là không bắt buộc.",
      'May và might thường nói về khả năng có thể xảy ra.',
    ],
    id: [
      'Can sering berarti boleh atau mampu.',
      'Could bisa menjadi permintaan sopan atau kemampuan masa lalu.',
      'Should terdengar seperti saran.',
      'Must dan have to terdengar seperti kewajiban.',
      "Mustn't berarti dilarang.",
      "Don't have to berarti tidak wajib.",
      'May dan might sering berarti kemungkinan.',
    ],
    tr: [
      'Can çoğu zaman izinli olmak veya yapabilmek demektir.',
      'Could kibar rica veya geçmişteki beceri olabilir.',
      'Should tavsiye gibi duyulur.',
      'Must ve have to zorunluluk gibi duyulur.',
      "Mustn't yasak demektir.",
      "Don't have to zorunlu değil demektir.",
      'May ve might çoğu zaman olasılık anlatır.',
    ],
    pl: [
      'Can często znaczy, że coś jest dozwolone albo możliwe.',
      'Could może być uprzejmą prośbą albo umiejętnością z przeszłości.',
      'Should brzmi jak rada.',
      'Must i have to brzmią jak obowiązek.',
      "Mustn't znaczy zakazane.",
      "Don't have to znaczy, że coś nie jest obowiązkowe.",
      'May i might często oznaczają możliwość.',
    ],
  },
  examples: [
    { en: 'You can sit here.', ru: 'Ты можешь сесть здесь.', uk: 'Ти можеш сісти тут.', es: 'Puedes sentarte aquí.', 'pt-BR': 'Você pode sentar aqui.', vi: 'Bạn có thể ngồi ở đây.', id: 'Kamu boleh duduk di sini.', tr: 'Buraya oturabilirsin.', pl: 'Możesz tu usiąść.', why: tri('Can дает разрешение.', 'Can дає дозвіл.', 'Can gives permission.', { 'pt-BR': 'Can dá permissão.', vi: 'Can cho phép.', id: 'Can memberi izin.', tr: 'Can izin verir.', pl: 'Can daje pozwolenie.' }) },
    { en: 'Could you help me?', ru: 'Не могли бы вы мне помочь?', uk: 'Не могли б ви мені допомогти?', es: '¿Podría ayudarme?', 'pt-BR': 'Você poderia me ajudar?', vi: 'Bạn có thể giúp tôi được không?', id: 'Bisakah Anda membantu saya?', tr: 'Bana yardım edebilir misiniz?', pl: 'Czy mógłbyś mi pomóc?', why: tri('Could делает просьбу мягче.', 'Could робить прохання мʼякшим.', 'Could makes the request softer.', { 'pt-BR': 'Could deixa o pedido mais suave.', vi: 'Could làm lời yêu cầu mềm hơn.', id: 'Could membuat permintaan lebih sopan.', tr: 'Could ricayı daha yumuşak yapar.', pl: 'Could zmiękcza prośbę.' }) },
    { en: 'You should rest.', ru: 'Тебе стоит отдохнуть.', uk: 'Тобі варто відпочити.', es: 'Deberías descansar.', 'pt-BR': 'Você deveria descansar.', vi: 'Bạn nên nghỉ ngơi.', id: 'Kamu sebaiknya beristirahat.', tr: 'Dinlenmelisin.', pl: 'Powinieneś odpocząć.', why: tri('Should звучит как совет.', 'Should звучить як порада.', 'Should sounds like advice.', { 'pt-BR': 'Should soa como conselho.', vi: 'Should nghe như lời khuyên.', id: 'Should terdengar seperti saran.', tr: 'Should tavsiye gibi duyulur.', pl: 'Should brzmi jak rada.' }) },
    { en: 'You must wear a helmet.', ru: 'Ты должен надеть шлем.', uk: 'Ти повинен одягнути шолом.', es: 'Debes usar casco.', 'pt-BR': 'Você deve usar capacete.', vi: 'Bạn phải đội mũ bảo hiểm.', id: 'Kamu harus memakai helm.', tr: 'Kask takmalısın.', pl: 'Musisz nosić kask.', why: tri('Must звучит как строгое правило.', 'Must звучить як суворе правило.', 'Must sounds like a strong rule.', { 'pt-BR': 'Must soa como uma regra forte.', vi: 'Must nghe như quy tắc nghiêm.', id: 'Must terdengar seperti aturan kuat.', tr: 'Must güçlü bir kural gibi duyulur.', pl: 'Must brzmi jak silna reguła.' }) },
    { en: 'You must not smoke here.', ru: 'Здесь нельзя курить.', uk: 'Тут не можна курити.', es: 'No debes fumar aquí.', 'pt-BR': 'Você não deve fumar aqui.', vi: 'Bạn không được hút thuốc ở đây.', id: 'Kamu tidak boleh merokok di sini.', tr: 'Burada sigara içmemelisin.', pl: 'Nie wolno ci tu palić.', why: tri('Must not значит запрещено.', 'Must not означає заборонено.', 'Must not means forbidden.', { 'pt-BR': 'Must not significa proibido.', vi: 'Must not nghĩa là bị cấm.', id: 'Must not berarti dilarang.', tr: 'Must not yasak demektir.', pl: 'Must not znaczy zakazane.' }) },
    { en: "You don't have to come early.", ru: 'Тебе не обязательно приходить рано.', uk: 'Тобі не обовʼязково приходити рано.', es: 'No tienes que venir temprano.', 'pt-BR': 'Você não precisa chegar cedo.', vi: 'Bạn không cần đến sớm.', id: 'Kamu tidak harus datang lebih awal.', tr: 'Erken gelmek zorunda değilsin.', pl: 'Nie musisz przychodzić wcześnie.', why: tri('Do not have to значит не обязательно.', 'Do not have to означає не обовʼязково.', 'Do not have to means not required.', { 'pt-BR': 'Do not have to significa não obrigatório.', vi: 'Do not have to nghĩa là không bắt buộc.', id: 'Do not have to berarti tidak wajib.', tr: 'Do not have to zorunlu değil demektir.', pl: 'Do not have to znaczy niewymagane.' }) },
    { en: 'She might be at home.', ru: 'Возможно, она дома.', uk: 'Можливо, вона вдома.', es: 'Puede que ella esté en casa.', 'pt-BR': 'Ela talvez esteja em casa.', vi: 'Có lẽ cô ấy đang ở nhà.', id: 'Dia mungkin ada di rumah.', tr: 'Evde olabilir.', pl: 'Ona może być w domu.', why: tri('Might дает неполную уверенность.', 'Might дає неповну впевненість.', 'Might gives uncertainty.', { 'pt-BR': 'Might mostra incerteza.', vi: 'Might cho thấy sự không chắc chắn.', id: 'Might menunjukkan ketidakpastian.', tr: 'Might belirsizlik verir.', pl: 'Might pokazuje niepewność.' }) },
    { en: 'When I was five, I could swim.', ru: 'Когда мне было пять, я умел плавать.', uk: 'Коли мені було пʼять, я вмів плавати.', es: 'Cuando tenía cinco años, sabía nadar.', 'pt-BR': 'Quando eu tinha cinco anos, eu sabia nadar.', vi: 'Khi tôi năm tuổi, tôi biết bơi.', id: 'Saat saya berumur lima tahun, saya bisa berenang.', tr: 'Beş yaşındayken yüzebiliyordum.', pl: 'Kiedy miałem pięć lat, umiałem pływać.', why: tri('Could здесь про то, что умел раньше.', 'Could тут про те, що вмів раніше.', 'Could here means was able before.', { 'pt-BR': 'Could aqui fala de habilidade no passado.', vi: 'Could ở đây nói về khả năng trước đây.', id: 'Could di sini berarti mampu di masa lalu.', tr: 'Could burada geçmişte yapabilmek demektir.', pl: 'Could tutaj oznacza umiejętność w przeszłości.' }) },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Слова похожи, но сила разная. You should rest не равно You must rest.', 'Слова схожі, але сила різна. You should rest не дорівнює You must rest.', 'The words are similar, but the force is different. You should rest is not You must rest.', { 'pt-BR': 'As palavras são parecidas, mas a força é diferente. You should rest não é You must rest.', vi: 'Các từ giống nhau, nhưng lực nghĩa khác nhau. You should rest không giống You must rest.', id: 'Kata-katanya mirip, tetapi kekuatannya berbeda. You should rest bukan You must rest.', tr: 'Kelimeler benzer, ama güç farklı. You should rest, You must rest değildir.', pl: 'Słowa są podobne, ale siła jest inna. You should rest to nie You must rest.' }) },
    { id: 'intro_scale', type: 'rule', text: tri("Шкала: can -> should -> must/have to. Отдельно: mustn't = нельзя, don't have to = не обязательно.", "Шкала: can -> should -> must/have to. Окремо: mustn't = не можна, don't have to = не обовʼязково.", "Scale: can -> should -> must/have to. Separately: mustn't = forbidden, don't have to = not required.", { 'pt-BR': "Escala: can -> should -> must/have to. Separado: mustn't = proibido, don't have to = não obrigatório.", vi: "Thang mức độ: can -> should -> must/have to. Riêng: mustn't = bị cấm, don't have to = không bắt buộc.", id: "Skala: can -> should -> must/have to. Terpisah: mustn't = dilarang, don't have to = tidak wajib.", tr: "Ölçek: can -> should -> must/have to. Ayrı olarak: mustn't = yasak, don't have to = zorunlu değil.", pl: "Skala: can -> should -> must/have to. Osobno: mustn't = zakazane, don't have to = niewymagane." }) },
    { id: 'intro_probability', type: 'contrast', text: tri('May/might держи отдельно: это возможно, а не правило.', 'May/might тримай окремо: це можливо, а не правило.', 'Keep may/might separate: possible, not a rule.', { 'pt-BR': 'Mantenha may/might separados: é possibilidade, não regra.', vi: 'Tách may/might riêng: đó là khả năng, không phải quy tắc.', id: 'Pisahkan may/might: itu kemungkinan, bukan aturan.', tr: 'May/might ayrı dursun: bu olasılık, kural değil.', pl: 'May/might trzymaj osobno: to możliwość, nie reguła.' }) },
  ],
  steps: [
    step({ id: 'modal_force_easy_001', order: 1, difficulty: 'easy', targetSkill: 'can_permission', sentence: 'You ___ sit here. This seat is free.', translation: tri('Можно сесть здесь. Место свободно.', 'Можна сісти тут. Місце вільне.', 'You can sit here. This seat is free.', { 'pt-BR': 'Você pode sentar aqui. Este lugar está livre.', vi: 'Bạn có thể ngồi ở đây. Ghế này còn trống.', id: 'Kamu boleh duduk di sini. Kursi ini kosong.', tr: 'Buraya oturabilirsin. Bu yer boş.', pl: 'Możesz tu usiąść. To miejsce jest wolne.' }), options: ['can', 'must', 'should', "mustn't"], correctAnswer: 'can', correctFeedback: tri('Да. Здесь разрешение: You can sit here.', 'Так. Тут дозвіл: You can sit here.', 'Yes. This is permission: You can sit here.', { 'pt-BR': 'Sim. Aqui é permissão: You can sit here.', vi: 'Đúng. Đây là sự cho phép: You can sit here.', id: 'Ya. Ini izin: You can sit here.', tr: 'Evet. Burada izin var: You can sit here.', pl: 'Tak. To pozwolenie: You can sit here.' }), wrong: { must: tri('Must звучит так, будто человек обязан сесть. Здесь просто разрешение: can.', 'Must звучить так, ніби людина зобовʼязана сісти. Тут просто дозвіл: can.', 'Must sounds like an obligation to sit. Here it is just permission: can.', { 'pt-BR': 'Must soa como obrigação de sentar. Aqui é apenas permissão: can.', vi: 'Must nghe như bắt buộc phải ngồi. Ở đây chỉ là cho phép: can.', id: 'Must terdengar seperti kewajiban untuk duduk. Di sini hanya izin: can.', tr: 'Must oturma zorunluluğu gibi duyulur. Burada sadece izin var: can.', pl: 'Must brzmi jak obowiązek siadania. Tutaj jest tylko pozwolenie: can.' }), should: tri('Should звучит как совет сесть. Здесь смысл "можно": can.', 'Should звучить як порада сісти. Тут сенс "можна": can.', 'Should sounds like advice to sit. Here the meaning is allowed: can.', { 'pt-BR': 'Should soa como conselho para sentar. Aqui o sentido é permitido: can.', vi: 'Should nghe như lời khuyên nên ngồi. Ở đây nghĩa là được phép: can.', id: 'Should terdengar seperti saran untuk duduk. Di sini maknanya diizinkan: can.', tr: 'Should oturma tavsiyesi gibi duyulur. Burada anlam izin: can.', pl: 'Should brzmi jak rada, żeby usiąść. Tutaj sens to dozwolone: can.' }), "mustn't": tri("Mustn't значит нельзя. Это противоположный смысл.", "Mustn't означає не можна. Це протилежний сенс.", "Mustn't means forbidden. That is the opposite meaning.", { 'pt-BR': "Mustn't significa proibido. É o sentido oposto.", vi: "Mustn't nghĩa là bị cấm. Đó là nghĩa ngược lại.", id: "Mustn't berarti dilarang. Itu makna sebaliknya.", tr: "Mustn't yasak demektir. Bu zıt anlam.", pl: "Mustn't znaczy zakazane. To przeciwne znaczenie." }) }, retryLine: 'Нужно мягкое разрешение: can.', focusWords: ['can'] }),
    step({ id: 'modal_force_easy_002', order: 2, difficulty: 'easy', targetSkill: 'should_advice', sentence: 'You ___ rest. You look tired.', translation: tri('Тебе стоит отдохнуть. Ты выглядишь уставшим.', 'Тобі варто відпочити. Ти виглядаєш втомленим.', 'You should rest. You look tired.', { 'pt-BR': 'Você deveria descansar. Você parece cansado.', vi: 'Bạn nên nghỉ ngơi. Trông bạn có vẻ mệt.', id: 'Kamu sebaiknya beristirahat. Kamu terlihat lelah.', tr: 'Dinlenmelisin. Yorgun görünüyorsun.', pl: 'Powinieneś odpocząć. Wyglądasz na zmęczonego.' }), options: ['should', 'must', 'can', "don't have to"], correctAnswer: 'should', correctFeedback: tri('Да. Should дает совет: You should rest.', 'Так. Should дає пораду: You should rest.', 'Yes. Should gives advice: You should rest.', { 'pt-BR': 'Sim. Should dá conselho: You should rest.', vi: 'Đúng. Should đưa ra lời khuyên: You should rest.', id: 'Ya. Should memberi saran: You should rest.', tr: 'Evet. Should tavsiye verir: You should rest.', pl: 'Tak. Should daje radę: You should rest.' }), wrong: { must: tri('Must слишком строго. Здесь дружеский совет: should.', 'Must занадто суворо. Тут дружня порада: should.', 'Must is too strong. This is friendly advice: should.', { 'pt-BR': 'Must é forte demais. Aqui é um conselho amigável: should.', vi: 'Must quá mạnh. Ở đây là lời khuyên thân thiện: should.', id: 'Must terlalu kuat. Ini saran ramah: should.', tr: 'Must çok sert. Burada dostça bir tavsiye var: should.', pl: 'Must jest zbyt mocne. Tutaj to przyjazna rada: should.' }), can: tri('Can значит можно или умеешь, но не дает совет.', 'Can означає можна або вмієш, але не дає пораду.', 'Can means allowed or able, but it does not give advice.', { 'pt-BR': 'Can significa permitido ou capaz, mas não dá conselho.', vi: 'Can nghĩa là được phép hoặc có khả năng, nhưng không đưa ra lời khuyên.', id: 'Can berarti boleh atau mampu, tetapi tidak memberi saran.', tr: 'Can izin ya da beceri demektir, ama tavsiye vermez.', pl: 'Can znaczy dozwolone albo umieć, ale nie daje rady.' }), "don't have to": tri("Don't have to значит не обязательно. Здесь человеку стоит отдохнуть.", "Don't have to означає не обовʼязково. Тут людині варто відпочити.", "Don't have to means not required. Here the person should rest.", { 'pt-BR': "Don't have to significa não obrigatório. Aqui a pessoa deveria descansar.", vi: "Don't have to nghĩa là không bắt buộc. Ở đây người đó nên nghỉ ngơi.", id: "Don't have to berarti tidak wajib. Di sini orang itu sebaiknya beristirahat.", tr: "Don't have to zorunlu değil demektir. Burada kişi dinlenmeli.", pl: "Don't have to znaczy niewymagane. Tutaj ta osoba powinna odpocząć." }) }, retryLine: 'Совет = should.', focusWords: ['should'] }),
    step({ id: 'modal_force_easy_003', order: 3, difficulty: 'easy', targetSkill: 'must_rule', sentence: 'You ___ wear a helmet here. It is the rule.', translation: tri('Здесь надо надеть шлем. Это правило.', 'Тут треба одягнути шолом. Це правило.', 'You must wear a helmet here. It is the rule.', { 'pt-BR': 'Você deve usar capacete aqui. É a regra.', vi: 'Bạn phải đội mũ bảo hiểm ở đây. Đó là quy định.', id: 'Kamu harus memakai helm di sini. Itu aturannya.', tr: 'Burada kask takmalısın. Kural bu.', pl: 'Musisz tu nosić kask. To reguła.' }), options: ['must', 'can', 'might', "don't have to"], correctAnswer: 'must', correctFeedback: tri('Да. Правило требует must.', 'Так. Правило потребує must.', 'Yes. A rule needs must.', { 'pt-BR': 'Sim. Uma regra pede must.', vi: 'Đúng. Quy tắc cần must.', id: 'Ya. Aturan membutuhkan must.', tr: 'Evet. Kural must gerektirir.', pl: 'Tak. Reguła wymaga must.' }), wrong: { can: tri('Can дает разрешение, но не обязательное правило.', 'Can дає дозвіл, але не обовʼязкове правило.', 'Can gives permission, not a required rule.', { 'pt-BR': 'Can dá permissão, não uma regra obrigatória.', vi: 'Can cho phép, không phải quy tắc bắt buộc.', id: 'Can memberi izin, bukan aturan wajib.', tr: 'Can izin verir, zorunlu bir kural değildir.', pl: 'Can daje pozwolenie, nie obowiązkową regułę.' }), might: tri('Might значит возможно. Здесь правило: must.', 'Might означає можливо. Тут правило: must.', 'Might means possible. Here it is a rule: must.', { 'pt-BR': 'Might significa possível. Aqui é uma regra: must.', vi: 'Might nghĩa là có thể. Ở đây là quy tắc: must.', id: 'Might berarti mungkin. Di sini ini aturan: must.', tr: 'Might mümkün demektir. Burada kural var: must.', pl: 'Might znaczy możliwe. Tutaj jest reguła: must.' }), "don't have to": tri("Don't have to значит не обязательно. Здесь наоборот: надо.", "Don't have to означає не обовʼязково. Тут навпаки: треба.", "Don't have to means not required. Here it is the opposite: required.", { 'pt-BR': "Don't have to significa não obrigatório. Aqui é o contrário: obrigatório.", vi: "Don't have to nghĩa là không bắt buộc. Ở đây ngược lại: bắt buộc.", id: "Don't have to berarti tidak wajib. Di sini kebalikannya: wajib.", tr: "Don't have to zorunlu değil demektir. Burada tam tersi: zorunlu.", pl: "Don't have to znaczy niewymagane. Tutaj jest odwrotnie: wymagane." }) }, retryLine: 'Строгое правило = must.', focusWords: ['must'] }),
    step({ id: 'modal_force_easy_004', order: 4, difficulty: 'easy', targetSkill: 'must_not_prohibition', sentence: 'You ___ smoke here. It is forbidden.', translation: tri('Здесь нельзя курить. Это запрещено.', 'Тут не можна курити. Це заборонено.', 'You must not smoke here. It is forbidden.', { 'pt-BR': 'Você não pode fumar aqui. É proibido.', vi: 'Bạn không được hút thuốc ở đây. Việc này bị cấm.', id: 'Kamu tidak boleh merokok di sini. Itu dilarang.', tr: 'Burada sigara içmemelisin. Bu yasak.', pl: 'Nie wolno ci tu palić. To zakazane.' }), options: ["mustn't", "don't have to", 'should', 'may'], correctAnswer: "mustn't", correctFeedback: tri("Да. Mustn't значит нельзя.", "Так. Mustn't означає не можна.", "Yes. Mustn't means forbidden.", { 'pt-BR': "Sim. Mustn't significa proibido.", vi: "Đúng. Mustn't nghĩa là bị cấm.", id: "Ya. Mustn't berarti dilarang.", tr: "Evet. Mustn't yasak demektir.", pl: "Tak. Mustn't znaczy zakazane." }), wrong: { "don't have to": tri("Don't have to значит не обязательно, но можно. Здесь нельзя, поэтому mustn't.", "Don't have to означає не обовʼязково, але можна. Тут не можна, тому mustn't.", "Don't have to means not required, but allowed. Here it is forbidden, so use mustn't.", { 'pt-BR': "Don't have to significa não obrigatório, mas permitido. Aqui é proibido, então use mustn't.", vi: "Don't have to nghĩa là không bắt buộc nhưng được phép. Ở đây bị cấm, nên dùng mustn't.", id: "Don't have to berarti tidak wajib, tetapi boleh. Di sini dilarang, jadi gunakan mustn't.", tr: "Don't have to zorunlu değil ama izin var demektir. Burada yasak, bu yüzden mustn't.", pl: "Don't have to znaczy niewymagane, ale dozwolone. Tutaj jest zakazane, więc użyj mustn't." }), should: tri("Should не делает сильный запрет. Здесь нужно mustn't.", "Should не створює сильної заборони. Тут потрібно mustn't.", "Should does not make a strong prohibition. Here we need mustn't.", { 'pt-BR': "Should não cria uma proibição forte. Aqui precisamos de mustn't.", vi: "Should không tạo lệnh cấm mạnh. Ở đây cần mustn't.", id: "Should tidak membuat larangan kuat. Di sini kita perlu mustn't.", tr: "Should güçlü bir yasak oluşturmaz. Burada mustn't gerekiyor.", pl: "Should nie tworzy silnego zakazu. Tutaj potrzebne jest mustn't." }), may: tri('May звучит как можно или возможно. Здесь запрет.', 'May звучить як можна або можливо. Тут заборона.', 'May sounds like allowed or possible. Here it is forbidden.', { 'pt-BR': 'May soa como permitido ou possível. Aqui é proibido.', vi: 'May nghe như được phép hoặc có thể. Ở đây là bị cấm.', id: 'May terdengar seperti diizinkan atau mungkin. Di sini dilarang.', tr: 'May izin ya da olasılık gibi duyulur. Burada yasak var.', pl: 'May brzmi jak dozwolone albo możliwe. Tutaj jest zakazane.' }) }, retryLine: "Запрещено = mustn't.", focusWords: ["mustn't"] }),
    step({ id: 'modal_force_contrast_001', order: 5, difficulty: 'contrast', targetSkill: 'no_obligation', sentence: 'You ___ come early. The meeting starts at ten.', translation: tri('Не обязательно приходить рано. Встреча в десять.', 'Не обовʼязково приходити рано. Зустріч о десятій.', "You don't have to come early. The meeting starts at ten.", { 'pt-BR': 'Você não precisa chegar cedo. A reunião começa às dez.', vi: 'Bạn không cần đến sớm. Cuộc họp bắt đầu lúc mười giờ.', id: 'Kamu tidak harus datang lebih awal. Rapat mulai jam sepuluh.', tr: 'Erken gelmek zorunda değilsin. Toplantı onda başlıyor.', pl: 'Nie musisz przychodzić wcześnie. Spotkanie zaczyna się o dziesiątej.' }), options: ["don't have to", "mustn't", 'should', 'can'], correctAnswer: "don't have to", correctFeedback: tri("Да. Don't have to = не обязательно.", "Так. Don't have to = не обовʼязково.", "Yes. Don't have to = not required.", { 'pt-BR': "Sim. Don't have to = não obrigatório.", vi: "Đúng. Don't have to = không bắt buộc.", id: "Ya. Don't have to = tidak wajib.", tr: "Evet. Don't have to = zorunlu değil.", pl: "Tak. Don't have to = niewymagane." }), wrong: { "mustn't": tri("Mustn't значит запрещено. Здесь просто не обязательно.", "Mustn't означає заборонено. Тут просто не обовʼязково.", "Mustn't means forbidden. Here it is simply not required.", { 'pt-BR': "Mustn't significa proibido. Aqui é apenas não obrigatório.", vi: "Mustn't nghĩa là bị cấm. Ở đây chỉ là không bắt buộc.", id: "Mustn't berarti dilarang. Di sini hanya tidak wajib.", tr: "Mustn't yasak demektir. Burada sadece zorunlu değil.", pl: "Mustn't znaczy zakazane. Tutaj po prostu niewymagane." }), should: tri('Should советует прийти рано. Здесь обратный смысл.', 'Should радить прийти рано. Тут протилежний сенс.', 'Should advises coming early. Here the meaning is the opposite.', { 'pt-BR': 'Should aconselha chegar cedo. Aqui o sentido é o oposto.', vi: 'Should khuyên đến sớm. Ở đây nghĩa ngược lại.', id: 'Should menyarankan datang lebih awal. Di sini maknanya sebaliknya.', tr: 'Should erken gelmeyi tavsiye eder. Burada anlam bunun tersi.', pl: 'Should radzi przyjść wcześnie. Tutaj sens jest przeciwny.' }), can: tri('Can значит можешь, но не показывает отсутствие обязанности так ясно.', 'Can означає можеш, але не показує відсутність обовʼязку так чітко.', 'Can means you can, but it does not show lack of obligation clearly enough.', { 'pt-BR': 'Can significa que você pode, mas não mostra tão claramente a falta de obrigação.', vi: 'Can nghĩa là bạn có thể, nhưng không thể hiện rõ việc không bắt buộc.', id: 'Can berarti kamu bisa, tetapi tidak menunjukkan kurangnya kewajiban dengan cukup jelas.', tr: 'Can yapabilirsin demektir, ama zorunluluk olmadığını yeterince net göstermez.', pl: 'Can znaczy, że możesz, ale nie pokazuje tak jasno braku obowiązku.' }) }, retryLine: "Не обязательно = don't have to.", focusWords: ["don't have to"] }),
    step({ id: 'modal_force_contrast_002', order: 6, difficulty: 'contrast', targetSkill: 'polite_request', sentence: '___ you help me, please?', translation: tri('Не могли бы вы помочь?', 'Чи не могли б ви допомогти?', 'Could you help me, please?', { 'pt-BR': 'Você poderia me ajudar, por favor?', vi: 'Bạn có thể giúp tôi được không?', id: 'Bisakah Anda membantu saya?', tr: 'Bana yardım edebilir misiniz lütfen?', pl: 'Czy mógłbyś mi pomóc, proszę?' }), options: ['Could', 'Must', 'Should', 'May'], correctAnswer: 'Could', correctFeedback: tri('Да. Could делает просьбу вежливой.', 'Так. Could робить прохання ввічливим.', 'Yes. Could makes the request polite.', { 'pt-BR': 'Sim. Could deixa o pedido educado.', vi: 'Đúng. Could làm lời yêu cầu lịch sự hơn.', id: 'Ya. Could membuat permintaan sopan.', tr: 'Evet. Could ricayı kibar yapar.', pl: 'Tak. Could sprawia, że prośba jest uprzejma.' }), wrong: { Must: tri('Must you help me звучит как требование, не просьба.', 'Must you help me звучить як вимога, не прохання.', 'Must you help me sounds like a demand, not a request.', { 'pt-BR': 'Must you help me soa como exigência, não pedido.', vi: 'Must you help me nghe như yêu cầu bắt buộc, không phải lời nhờ.', id: 'Must you help me terdengar seperti tuntutan, bukan permintaan.', tr: 'Must you help me rica değil, talep gibi duyulur.', pl: 'Must you help me brzmi jak żądanie, nie prośba.' }), Should: tri('Should you help me звучит как вопрос о совете.', 'Should you help me звучить як питання про пораду.', 'Should you help me sounds like a question about advice.', { 'pt-BR': 'Should you help me soa como pergunta sobre conselho.', vi: 'Should you help me nghe như câu hỏi về lời khuyên.', id: 'Should you help me terdengar seperti pertanyaan tentang saran.', tr: 'Should you help me tavsiye hakkında bir soru gibi duyulur.', pl: 'Should you help me brzmi jak pytanie o radę.' }), May: tri('May I... подходит, когда ты просишь разрешение себе. Здесь просьба к человеку: Could you...?', 'May I... підходить, коли ти просиш дозвіл собі. Тут прохання до людини: Could you...?', 'May I... fits when you ask permission for yourself. Here you ask another person: Could you...?', { 'pt-BR': 'May I... serve quando você pede permissão para si. Aqui é pedido a outra pessoa: Could you...?', vi: 'May I... dùng khi bạn xin phép cho bản thân. Ở đây bạn nhờ người khác: Could you...?', id: 'May I... cocok saat kamu meminta izin untuk diri sendiri. Di sini kamu meminta orang lain: Could you...?', tr: 'May I... kendin için izin isterken uygundur. Burada başka birinden rica ediyorsun: Could you...?', pl: 'May I... pasuje, gdy prosisz o pozwolenie dla siebie. Tutaj prosisz inną osobę: Could you...?' }) }, retryLine: 'Вежливая просьба = Could you...?', focusWords: ['could'] }),
    step({ id: 'modal_force_contrast_003', order: 7, difficulty: 'contrast', targetSkill: 'possibility_might', sentence: 'She ___ be at home, but I am not sure.', translation: tri('Она, возможно, дома, но я не уверен.', 'Вона, можливо, вдома, але я не впевнений.', 'She might be at home, but I am not sure.', { 'pt-BR': 'Ela talvez esteja em casa, mas não tenho certeza.', vi: 'Có lẽ cô ấy đang ở nhà, nhưng tôi không chắc.', id: 'Dia mungkin ada di rumah, tetapi saya tidak yakin.', tr: 'Evde olabilir, ama emin değilim.', pl: 'Ona może być w domu, ale nie jestem pewien.' }), options: ['might', 'must', 'can', "mustn't"], correctAnswer: 'might', correctFeedback: tri('Да. Might показывает возможность без уверенности.', 'Так. Might показує можливість без впевненості.', 'Yes. Might shows uncertain possibility.', { 'pt-BR': 'Sim. Might mostra possibilidade sem certeza.', vi: 'Đúng. Might cho thấy khả năng nhưng không chắc chắn.', id: 'Ya. Might menunjukkan kemungkinan tanpa kepastian.', tr: 'Evet. Might kesin olmayan olasılık gösterir.', pl: 'Tak. Might pokazuje możliwość bez pewności.' }), wrong: { must: tri('Must звучит как почти уверенный вывод. Здесь я не уверен.', 'Must звучить як майже впевнений висновок. Тут я не впевнений.', 'Must sounds like a strong conclusion. Here I am not sure.', { 'pt-BR': 'Must soa como conclusão quase certa. Aqui eu não tenho certeza.', vi: 'Must nghe như kết luận gần như chắc chắn. Ở đây tôi không chắc.', id: 'Must terdengar seperti kesimpulan kuat. Di sini saya tidak yakin.', tr: 'Must neredeyse kesin sonuç gibi duyulur. Burada emin değilim.', pl: 'Must brzmi jak mocny wniosek. Tutaj nie jestem pewien.' }), can: tri('Can часто про разрешение или общую возможность. Здесь нужна неполная уверенность: might.', 'Can часто про дозвіл або загальну можливість. Тут потрібна неповна впевненість: might.', 'Can is often about permission or general possibility. Here we need uncertainty: might.', { 'pt-BR': 'Can muitas vezes fala de permissão ou possibilidade geral. Aqui precisamos de incerteza: might.', vi: 'Can thường nói về sự cho phép hoặc khả năng chung. Ở đây cần sự không chắc chắn: might.', id: 'Can sering tentang izin atau kemungkinan umum. Di sini kita perlu ketidakpastian: might.', tr: 'Can çoğu zaman izin ya da genel olasılık anlatır. Burada belirsizlik gerekiyor: might.', pl: 'Can często dotyczy pozwolenia albo ogólnej możliwości. Tutaj potrzebna jest niepewność: might.' }), "mustn't": tri("Mustn't значит запрещено. Это не про вероятность.", "Mustn't означає заборонено. Це не про ймовірність.", "Mustn't means forbidden. This is not about probability.", { 'pt-BR': "Mustn't significa proibido. Isto não é sobre probabilidade.", vi: "Mustn't nghĩa là bị cấm. Đây không nói về xác suất.", id: "Mustn't berarti dilarang. Ini bukan tentang kemungkinan.", tr: "Mustn't yasak demektir. Bu olasılıkla ilgili değil.", pl: "Mustn't znaczy zakazane. To nie dotyczy prawdopodobieństwa." }) }, retryLine: 'Не уверен, но возможно = might.', focusWords: ['might'] }),
    step({ id: 'modal_force_contrast_004', order: 8, difficulty: 'contrast', targetSkill: 'past_ability_could', sentence: 'When I was a child, I ___ run very fast.', translation: tri('Когда я был ребенком, я умел быстро бегать.', 'Коли я був дитиною, я вмів швидко бігати.', 'When I was a child, I could run very fast.', { 'pt-BR': 'Quando eu era criança, eu conseguia correr muito rápido.', vi: 'Khi còn nhỏ, tôi có thể chạy rất nhanh.', id: 'Saat saya kecil, saya bisa berlari sangat cepat.', tr: 'Çocukken çok hızlı koşabiliyordum.', pl: 'Kiedy byłem dzieckiem, umiałem bardzo szybko biegać.' }), options: ['could', 'can', 'must', 'should'], correctAnswer: 'could', correctFeedback: tri('Да. Could здесь значит умел раньше.', 'Так. Could тут означає вмів раніше.', 'Yes. Could here means was able before.', { 'pt-BR': 'Sim. Could aqui significa que conseguia antes.', vi: 'Đúng. Could ở đây nghĩa là từng có thể làm trước đây.', id: 'Ya. Could di sini berarti mampu dulu.', tr: 'Evet. Could burada eskiden yapabiliyordu demektir.', pl: 'Tak. Could tutaj znaczy, że kiedyś umiał.' }), wrong: { can: tri('Can про сейчас или вообще. Здесь прошлое: when I was a child, I could.', 'Can про зараз або загалом. Тут минуле: when I was a child, I could.', 'Can is for now or generally. Here it is past: when I was a child, I could.', { 'pt-BR': 'Can é para agora ou em geral. Aqui é passado: when I was a child, I could.', vi: 'Can dùng cho hiện tại hoặc nói chung. Ở đây là quá khứ: when I was a child, I could.', id: 'Can untuk sekarang atau secara umum. Di sini masa lalu: when I was a child, I could.', tr: 'Can şimdi ya da genel durum içindir. Burada geçmiş var: when I was a child, I could.', pl: 'Can jest o teraz albo ogólnie. Tutaj jest przeszłość: when I was a child, I could.' }), must: tri('Must значит надо, не умел.', 'Must означає треба, не вмів.', 'Must means required, not was able.', { 'pt-BR': 'Must significa obrigatório, não que conseguia.', vi: 'Must nghĩa là bắt buộc, không phải từng có thể.', id: 'Must berarti wajib, bukan mampu.', tr: 'Must zorunlu demektir, yapabiliyordu değil.', pl: 'Must znaczy wymagane, nie że umiał.' }), should: tri('Should значит стоит, не умел.', 'Should означає варто, не вмів.', 'Should means advisable, not was able.', { 'pt-BR': 'Should significa aconselhável, não que conseguia.', vi: 'Should nghĩa là nên, không phải từng có thể.', id: 'Should berarti disarankan, bukan mampu.', tr: 'Should tavsiye demektir, yapabiliyordu değil.', pl: 'Should znaczy wskazane, nie że umiał.' }) }, retryLine: 'Мог раньше = could.', focusWords: ['could'] }),
    step({ id: 'modal_force_mixed_001', order: 9, difficulty: 'mixed_review', targetSkill: 'external_requirement_have_to', sentence: 'I ___ work tomorrow. My boss asked me.', translation: tri('Мне надо работать завтра. Начальник попросил.', 'Мені треба працювати завтра. Начальник попросив.', 'I have to work tomorrow. My boss asked me.', { 'pt-BR': 'Tenho que trabalhar amanhã. Meu chefe pediu.', vi: 'Tôi phải làm việc ngày mai. Sếp đã yêu cầu.', id: 'Saya harus bekerja besok. Bos saya meminta.', tr: 'Yarın çalışmak zorundayım. Patronum istedi.', pl: 'Muszę jutro pracować. Szef mnie poprosił.' }), options: ['have to', 'should', 'might', "don't have to"], correctAnswer: 'have to', correctFeedback: tri('Да. Have to подходит для внешнего требования.', 'Так. Have to підходить для зовнішньої вимоги.', 'Yes. Have to fits an outside requirement.', { 'pt-BR': 'Sim. Have to combina com exigência externa.', vi: 'Đúng. Have to phù hợp với yêu cầu từ bên ngoài.', id: 'Ya. Have to cocok untuk tuntutan dari luar.', tr: 'Evet. Have to dış zorunluluk için uygundur.', pl: 'Tak. Have to pasuje do zewnętrznego wymogu.' }), wrong: { should: tri('Should звучит как совет, а boss asked me делает это обязанностью.', 'Should звучить як порада, а boss asked me робить це обовʼязком.', 'Should sounds like advice, but boss asked me makes it a requirement.', { 'pt-BR': 'Should soa como conselho, mas boss asked me torna isso uma obrigação.', vi: 'Should nghe như lời khuyên, nhưng boss asked me biến nó thành nghĩa vụ.', id: 'Should terdengar seperti saran, tetapi boss asked me menjadikannya kewajiban.', tr: 'Should tavsiye gibi duyulur, ama boss asked me bunu zorunluluk yapar.', pl: 'Should brzmi jak rada, ale boss asked me robi z tego obowiązek.' }), might: tri('Might значит возможно. Здесь надо работать.', 'Might означає можливо. Тут треба працювати.', 'Might means possible. Here work is required.', { 'pt-BR': 'Might significa possível. Aqui trabalhar é obrigatório.', vi: 'Might nghĩa là có thể. Ở đây việc làm là bắt buộc.', id: 'Might berarti mungkin. Di sini bekerja wajib.', tr: 'Might olasılık demektir. Burada çalışmak zorunlu.', pl: 'Might znaczy możliwe. Tutaj praca jest wymagana.' }), "don't have to": tri("Don't have to значит не обязательно. Здесь наоборот: have to.", "Don't have to означає не обовʼязково. Тут навпаки: have to.", "Don't have to means not required. Here it is the opposite: have to.", { 'pt-BR': "Don't have to significa não obrigatório. Aqui é o contrário: have to.", vi: "Don't have to nghĩa là không bắt buộc. Ở đây ngược lại: have to.", id: "Don't have to berarti tidak wajib. Di sini kebalikannya: have to.", tr: "Don't have to zorunlu değil demektir. Burada tam tersi: have to.", pl: "Don't have to znaczy niewymagane. Tutaj jest odwrotnie: have to." }) }, retryLine: 'Внешнее надо = have to.', focusWords: ['have to'] }),
    step({ id: 'modal_force_mixed_002', order: 10, difficulty: 'mixed_review', targetSkill: 'may_formal_permission', sentence: '___ I ask a question?', translation: tri('Можно задать вопрос?', 'Можна поставити питання?', 'May I ask a question?', { 'pt-BR': 'Posso fazer uma pergunta?', vi: 'Tôi có thể hỏi một câu không?', id: 'Bolehkah saya bertanya?', tr: 'Bir soru sorabilir miyim?', pl: 'Czy mogę zadać pytanie?' }), options: ['May', 'Must', 'Should', "Mustn't"], correctAnswer: 'May', correctFeedback: tri('Да. May I...? звучит как вежливый запрос разрешения.', 'Так. May I...? звучить як ввічливий запит дозволу.', 'Yes. May I...? sounds like polite permission.', { 'pt-BR': 'Sim. May I...? soa como pedido educado de permissão.', vi: 'Đúng. May I...? nghe như lời xin phép lịch sự.', id: 'Ya. May I...? terdengar seperti permintaan izin yang sopan.', tr: 'Evet. May I...? kibar izin isteği gibi duyulur.', pl: 'Tak. May I...? brzmi jak uprzejma prośba o pozwolenie.' }), wrong: { Must: tri('Must I ask? значит "я обязан спросить?"', 'Must I ask? означає "я зобовʼязаний спитати?"', 'Must I ask? means am I required to ask?', { 'pt-BR': 'Must I ask? significa "sou obrigado a perguntar?"', vi: 'Must I ask? nghĩa là "tôi có bắt buộc phải hỏi không?"', id: 'Must I ask? berarti "apakah saya wajib bertanya?"', tr: 'Must I ask? "sormak zorunda mıyım?" demektir.', pl: 'Must I ask? znaczy "czy muszę zapytać?"' }), Should: tri('Should I ask? значит "стоит ли спросить?"', 'Should I ask? означає "чи варто спитати?"', 'Should I ask? means is it advisable to ask?', { 'pt-BR': 'Should I ask? significa "seria aconselhável perguntar?"', vi: 'Should I ask? nghĩa là "có nên hỏi không?"', id: 'Should I ask? berarti "apakah sebaiknya saya bertanya?"', tr: 'Should I ask? "sormam iyi olur mu?" demektir.', pl: 'Should I ask? znaczy "czy warto zapytać?"' }), "Mustn't": tri("Mustn't I ask? здесь не подходит. Нужно May I...?", "Mustn't I ask? тут не підходить. Потрібно May I...?", "Mustn't I ask? does not fit here. Use May I...?", { 'pt-BR': "Mustn't I ask? não combina aqui. Use May I...?", vi: "Mustn't I ask? không phù hợp ở đây. Dùng May I...?", id: "Mustn't I ask? tidak cocok di sini. Gunakan May I...?", tr: "Mustn't I ask? burada uygun değil. May I...? kullan.", pl: "Mustn't I ask? tutaj nie pasuje. Użyj May I...?" }) }, retryLine: 'Вежливо спросить разрешение = May I...?', focusWords: ['may'] }),
    step({ id: 'modal_force_mixed_003', order: 11, difficulty: 'mixed_review', targetSkill: 'strong_deduction_must', sentence: 'You ___ be tired after that long trip.', translation: tri('Ты, должно быть, устал после долгой поездки.', 'Ти, мабуть, втомився після довгої подорожі.', 'You must be tired after that long trip.', { 'pt-BR': 'Você deve estar cansado depois dessa viagem longa.', vi: 'Chắc bạn mệt sau chuyến đi dài đó.', id: 'Kamu pasti lelah setelah perjalanan panjang itu.', tr: 'O uzun yolculuktan sonra yorgun olmalısın.', pl: 'Musisz być zmęczony po tej długiej podróży.' }), options: ['must', 'can', "mustn't", "don't have to"], correctAnswer: 'must', correctFeedback: tri('Да. Must здесь значит сильный вывод: должно быть.', 'Так. Must тут означає сильний висновок: мабуть.', 'Yes. Must here means a strong conclusion.', { 'pt-BR': 'Sim. Must aqui significa uma conclusão forte.', vi: 'Đúng. Must ở đây là một kết luận mạnh.', id: 'Ya. Must di sini berarti kesimpulan kuat.', tr: 'Evet. Must burada güçlü sonuç demektir.', pl: 'Tak. Must tutaj oznacza mocny wniosek.' }), wrong: { can: tri('Can не дает сильный вывод. Здесь говорящий почти уверен.', 'Can не дає сильний висновок. Тут мовець майже впевнений.', 'Can does not give a strong conclusion. Here the speaker is almost sure.', { 'pt-BR': 'Can não dá uma conclusão forte. Aqui quem fala está quase certo.', vi: 'Can không tạo kết luận mạnh. Ở đây người nói gần như chắc chắn.', id: 'Can tidak memberi kesimpulan kuat. Di sini pembicara hampir yakin.', tr: 'Can güçlü bir sonuç vermez. Burada konuşan kişi neredeyse emin.', pl: 'Can nie daje mocnego wniosku. Tutaj mówiący jest prawie pewien.' }), "mustn't": tri("Mustn't значит запрещено. Усталость нельзя запретить.", "Mustn't означає заборонено. Втому не можна заборонити.", "Mustn't means forbidden. You cannot forbid tiredness.", { 'pt-BR': "Mustn't significa proibido. Não dá para proibir o cansaço.", vi: "Mustn't nghĩa là bị cấm. Không thể cấm sự mệt mỏi.", id: "Mustn't berarti dilarang. Kamu tidak bisa melarang rasa lelah.", tr: "Mustn't yasak demektir. Yorgunluğu yasaklayamazsın.", pl: "Mustn't znaczy zakazane. Nie da się zakazać zmęczenia." }), "don't have to": tri("Don't have to значит не обязательно. Это не вывод о состоянии.", "Don't have to означає не обовʼязково. Це не висновок про стан.", "Don't have to means not required. This is not a conclusion about a state.", { 'pt-BR': "Don't have to significa não obrigatório. Isto não é conclusão sobre um estado.", vi: "Don't have to nghĩa là không bắt buộc. Đây không phải kết luận về trạng thái.", id: "Don't have to berarti tidak wajib. Ini bukan kesimpulan tentang keadaan.", tr: "Don't have to zorunlu değil demektir. Bu bir durum hakkında sonuç değil.", pl: "Don't have to znaczy niewymagane. To nie jest wniosek o stanie." }) }, retryLine: 'Сильный вывод = must.', focusWords: ['must'] }),
    step({ id: 'modal_force_mixed_004', order: 12, difficulty: 'mixed_review', targetSkill: 'should_not_advice', sentence: 'You ___ eat so much sugar.', translation: tri('Тебе не стоит есть так много сахара.', 'Тобі не варто їсти так багато цукру.', "You shouldn't eat so much sugar.", { 'pt-BR': 'Você não deveria comer tanto açúcar.', vi: 'Bạn không nên ăn quá nhiều đường.', id: 'Kamu sebaiknya tidak makan gula sebanyak itu.', tr: 'Bu kadar çok şeker yememelisin.', pl: 'Nie powinieneś jeść tyle cukru.' }), options: ["shouldn't", "mustn't", "don't have to", 'may not'], correctAnswer: "shouldn't", correctFeedback: tri("Да. Shouldn't дает совет не делать.", "Так. Shouldn't дає пораду не робити.", "Yes. Shouldn't gives advice not to do it.", { 'pt-BR': "Sim. Shouldn't dá conselho para não fazer.", vi: "Đúng. Shouldn't đưa ra lời khuyên không nên làm.", id: "Ya. Shouldn't memberi saran untuk tidak melakukannya.", tr: "Evet. Shouldn't yapmama tavsiyesi verir.", pl: "Tak. Shouldn't daje radę, żeby tego nie robić." }), wrong: { "mustn't": tri("Mustn't звучит как строгий запрет. Здесь совет о здоровье.", "Mustn't звучить як сувора заборона. Тут порада про здоровʼя.", "Mustn't sounds like a strict prohibition. Here it is health advice.", { 'pt-BR': "Mustn't soa como proibição rígida. Aqui é conselho de saúde.", vi: "Mustn't nghe như lệnh cấm nghiêm. Ở đây là lời khuyên về sức khỏe.", id: "Mustn't terdengar seperti larangan ketat. Di sini ini saran kesehatan.", tr: "Mustn't katı yasak gibi duyulur. Burada sağlık tavsiyesi var.", pl: "Mustn't brzmi jak ścisły zakaz. Tutaj to rada zdrowotna." }), "don't have to": tri("Don't have to значит не обязан есть сахар. Здесь смысл: лучше не ешь.", "Don't have to означає не зобовʼязаний їсти цукор. Тут сенс: краще не їж.", "Don't have to means you are not required to eat sugar. Here the meaning is: better not.", { 'pt-BR': "Don't have to significa que você não é obrigado a comer açúcar. Aqui o sentido é: melhor não comer.", vi: "Don't have to nghĩa là bạn không bắt buộc phải ăn đường. Ở đây nghĩa là: tốt hơn là không ăn.", id: "Don't have to berarti kamu tidak wajib makan gula. Di sini maknanya: sebaiknya jangan.", tr: "Don't have to şeker yemek zorunda değilsin demektir. Burada anlam: yemesen daha iyi.", pl: "Don't have to znaczy, że nie musisz jeść cukru. Tutaj sens jest: lepiej nie jedz." }), 'may not': tri('May not не дает нужный совет. Здесь нужно should not.', 'May not не дає потрібну пораду. Тут потрібно should not.', 'May not does not give the needed advice. Here we need should not.', { 'pt-BR': 'May not não dá o conselho necessário. Aqui precisamos de should not.', vi: 'May not không đưa ra lời khuyên cần thiết. Ở đây cần should not.', id: 'May not tidak memberi saran yang dibutuhkan. Di sini kita perlu should not.', tr: 'May not gereken tavsiyeyi vermez. Burada should not gerekiyor.', pl: 'May not nie daje potrzebnej rady. Tutaj potrzebne jest should not.' }) }, retryLine: 'Мягкий совет не делать = should not.', focusWords: ["shouldn't"] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['permission_vs_obligation', 'prohibition_vs_no_obligation', 'advice_vs_rule', 'possibility_vs_rule'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем силу выбранного слова.', 'Показуємо силу вибраного слова.', 'Show the force of the chosen word.', {
      'pt-BR': 'Mostramos a força da palavra escolhida.',
      vi: 'Hiển thị lực nghĩa của từ đã chọn.',
      id: 'Tampilkan kekuatan kata yang dipilih.',
      tr: 'Seçilen kelimenin gücünü gösteririz.',
      pl: 'Pokazujemy siłę wybranego słowa.',
    }),
    depth2: tri('Проще: можно, стоит, надо, нельзя, не обязательно или возможно.', 'Простіше: можна, варто, треба, не можна, не обовʼязково або можливо.', 'Simpler: allowed, advisable, required, forbidden, not required, or possible.', {
      'pt-BR': 'Mais simples: permitido, aconselhável, obrigatório, proibido, não obrigatório ou possível.',
      vi: 'Đơn giản hơn: được phép, nên làm, bắt buộc, bị cấm, không bắt buộc hoặc có thể.',
      id: 'Lebih sederhana: diizinkan, disarankan, wajib, dilarang, tidak wajib, atau mungkin.',
      tr: 'Daha basit: izin, tavsiye, zorunluluk, yasak, zorunlu değil ya da olasılık.',
      pl: 'Prościej: dozwolone, wskazane, wymagane, zakazane, niewymagane albo możliwe.',
    }),
    depth3: tri("Сравни пару mustn't / don't have to.", "Порівняй пару mustn't / don't have to.", "Compare mustn't / don't have to.", {
      'pt-BR': "Compare mustn't / don't have to.",
      vi: "So sánh mustn't / don't have to.",
      id: "Bandingkan mustn't / don't have to.",
      tr: "Mustn't / don't have to ikilisini karşılaştır.",
      pl: "Porównaj mustn't / don't have to.",
    }),
    depth4: tri('Даем почти прямую смысловую подсказку.', 'Даємо майже пряму смислову підказку.', 'Give an almost direct meaning hint.', {
      'pt-BR': 'Damos uma dica de sentido quase direta.',
      vi: 'Đưa ra gợi ý nghĩa gần như trực tiếp.',
      id: 'Berikan petunjuk makna yang hampir langsung.',
      tr: 'Neredeyse doğrudan bir anlam ipucu veririz.',
      pl: 'Dajemy prawie bezpośrednią podpowiedź znaczenia.',
    }),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri("Can = можно. Should = стоит. Must/have to = надо. Mustn't = нельзя. Don't have to = не обязательно. Might = возможно.", "Can = можна. Should = варто. Must/have to = треба. Mustn't = не можна. Don't have to = не обовʼязково. Might = можливо.", "Can = allowed. Should = advisable. Must/have to = required. Mustn't = forbidden. Don't have to = not required. Might = possible.", {
        'pt-BR': "Can = permitido. Should = aconselhável. Must/have to = obrigatório. Mustn't = proibido. Don't have to = não obrigatório. Might = possível.",
        vi: "Can = được phép. Should = nên. Must/have to = bắt buộc. Mustn't = bị cấm. Don't have to = không bắt buộc. Might = có thể.",
        id: "Can = diizinkan. Should = disarankan. Must/have to = wajib. Mustn't = dilarang. Don't have to = tidak wajib. Might = mungkin.",
        tr: "Can = izin. Should = tavsiye. Must/have to = zorunluluk. Mustn't = yasak. Don't have to = zorunlu değil. Might = olasılık.",
        pl: "Can = dozwolone. Should = wskazane. Must/have to = wymagane. Mustn't = zakazane. Don't have to = niewymagane. Might = możliwe.",
      }),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_force_scale_then_retry',
      card: tri("Запомни пару: mustn't = нельзя, don't have to = не обязательно.", "Запамʼятай пару: mustn't = не можна, don't have to = не обовʼязково.", "Remember the pair: mustn't = forbidden, don't have to = not required.", {
        'pt-BR': "Lembre o par: mustn't = proibido, don't have to = não obrigatório.",
        vi: "Hãy nhớ cặp này: mustn't = bị cấm, don't have to = không bắt buộc.",
        id: "Ingat pasangan ini: mustn't = dilarang, don't have to = tidak wajib.",
        tr: "İkiliyi unutma: mustn't = yasak, don't have to = zorunlu değil.",
        pl: "Zapamiętaj parę: mustn't = zakazane, don't have to = niewymagane.",
      }),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri('Guided mode: сначала выбери смысл, потом слово.', 'Guided mode: спочатку вибери сенс, потім слово.', 'Guided mode: first choose the meaning, then the word.', {
        'pt-BR': 'Modo guiado: primeiro escolha o sentido, depois a palavra.',
        vi: 'Chế độ hướng dẫn: chọn nghĩa trước, rồi chọn từ.',
        id: 'Mode terpandu: pilih maknanya dulu, lalu katanya.',
        tr: 'Rehberli mod: önce anlamı, sonra kelimeyi seç.',
        pl: 'Tryb prowadzony: najpierw wybierz znaczenie, potem słowo.',
      }),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_modal_force_001', prompt: tri('You should rest: это совет или приказ?', 'You should rest: це порада чи наказ?', 'You should rest: advice or order?', { 'pt-BR': 'You should rest: conselho ou ordem?', vi: 'You should rest: lời khuyên hay mệnh lệnh?', id: 'You should rest: saran atau perintah?', tr: 'You should rest: tavsiye mi emir mi?', pl: 'You should rest: rada czy rozkaz?' }), options: ['advice', 'order'], correctIndex: 0, thenReturnToExerciseId: 'modal_force_easy_002' },
      { id: 'guided_modal_force_002', prompt: tri("Mustn't: запрещено или не обязательно?", "Mustn't: заборонено чи не обовʼязково?", "Mustn't: forbidden or not required?", { 'pt-BR': "Mustn't: proibido ou não obrigatório?", vi: "Mustn't: bị cấm hay không bắt buộc?", id: "Mustn't: dilarang atau tidak wajib?", tr: "Mustn't: yasak mı zorunlu değil mi?", pl: "Mustn't: zakazane czy niewymagane?" }), options: ['forbidden', 'not required'], correctIndex: 0, thenReturnToExerciseId: 'modal_force_easy_004' },
      { id: 'guided_modal_force_003', prompt: tri("Don't have to: запрет или не обязательно?", "Don't have to: заборона чи не обовʼязково?", "Don't have to: forbidden or not required?", { 'pt-BR': "Don't have to: proibido ou não obrigatório?", vi: "Don't have to: bị cấm hay không bắt buộc?", id: "Don't have to: dilarang atau tidak wajib?", tr: "Don't have to: yasak mı zorunlu değil mi?", pl: "Don't have to: zakazane czy niewymagane?" }), options: ['forbidden', 'not required'], correctIndex: 1, thenReturnToExerciseId: 'modal_force_contrast_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'modal',
    microDiagnosisId: 'modal_force',
    diagnosisLabel: tri('Сила can/should/must', 'Сила can/should/must', 'Force of can/should/must', {
      'pt-BR': 'Força de can/should/must',
      vi: 'Lực của can/should/must',
      id: 'Kekuatan can/should/must',
      tr: 'can/should/must gücü',
      pl: 'Siła can/should/must',
    }),
    contrastSet: CONTRAST_SET,
    focusWords: ['can', 'could', 'should', 'must', 'have to', "mustn't", "don't have to", 'may', 'might'],
    focusPatterns: ['can_permission', 'should_advice', 'must_rule', 'must_not_prohibition', 'no_obligation', 'polite_request', 'possibility_might', 'past_ability_could', 'external_requirement_have_to', 'may_formal_permission', 'strong_deduction_must', 'should_not_advice'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_modal_force_start',
    answer: 'diagnosis_training_modal_force_answer',
    mastery: 'diagnosis_training_modal_force_mastery',
    recovery: 'diagnosis_training_modal_force_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'modal', microDiagnosisId: 'modal_force', contrastSet: CONTRAST_SET, logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=modal&microDiagnosisId=modal_force',
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
