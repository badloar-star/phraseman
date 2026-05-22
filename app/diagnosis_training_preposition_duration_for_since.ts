import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const tri = (
  ru: string,
  uk: string,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (planned[locale]) copy[locale] = planned[locale];
  }
  return copy;
};

const DURATION_STEP_TRANSLATIONS: Record<string, Record<PlannedTrainingLocale, string>> = {
  duration_easy_001: {
    'pt-BR': 'Eu esperei por duas horas.',
    vi: 'Tôi đã chờ trong hai giờ.',
    id: 'Saya menunggu selama dua jam.',
    tr: 'İki saat bekledim.',
    pl: 'Czekałem dwie godziny.',
  },
  duration_easy_002: {
    'pt-BR': 'Ela ficou lá por uma semana.',
    vi: 'Cô ấy đã ở đó một tuần.',
    id: 'Dia tinggal di sana selama seminggu.',
    tr: 'Orada bir hafta kaldı.',
    pl: 'Została tam przez tydzień.',
  },
  duration_easy_003: {
    'pt-BR': 'Não o vejo desde segunda-feira.',
    vi: 'Tôi chưa gặp anh ấy từ thứ Hai.',
    id: 'Saya belum melihatnya sejak hari Senin.',
    tr: 'Pazartesiden beri onu görmedim.',
    pl: 'Nie widziałem go od poniedziałku.',
  },
  duration_contrast_001: {
    'pt-BR': 'Eles moram aqui desde 2020.',
    vi: 'Họ đã sống ở đây từ năm 2020.',
    id: 'Mereka sudah tinggal di sini sejak 2020.',
    tr: "2020'den beri burada yaşıyorlar.",
    pl: 'Mieszkają tu od 2020 roku.',
  },
  duration_contrast_002: {
    'pt-BR': 'Nós nos conhecemos há dez anos.',
    vi: 'Chúng tôi đã biết nhau được mười năm.',
    id: 'Kami sudah saling mengenal selama sepuluh tahun.',
    tr: 'On yıldır birbirimizi tanıyoruz.',
    pl: 'Znamy się od dziesięciu lat.',
  },
  duration_contrast_003: {
    'pt-BR': 'Ela trabalha aqui desde março.',
    vi: 'Cô ấy đã làm việc ở đây từ tháng Ba.',
    id: 'Dia bekerja di sini sejak Maret.',
    tr: 'Marttan beri burada çalışıyor.',
    pl: 'Pracuje tu od marca.',
  },
  duration_contrast_004: {
    'pt-BR': 'Estou cansado há dias.',
    vi: 'Tôi đã mệt mấy ngày rồi.',
    id: 'Saya sudah lelah selama berhari-hari.',
    tr: 'Günlerdir yorgunum.',
    pl: 'Jestem zmęczony od kilku dni.',
  },
  duration_contrast_005: {
    'pt-BR': 'Ele está doente desde a semana passada.',
    vi: 'Anh ấy bị ốm từ tuần trước.',
    id: 'Dia sakit sejak minggu lalu.',
    tr: 'Geçen haftadan beri hasta.',
    pl: 'Jest chory od zeszłego tygodnia.',
  },
  duration_contrast_006: {
    'pt-BR': 'O bebê dormiu por três horas.',
    vi: 'Em bé đã ngủ trong ba giờ.',
    id: 'Bayi itu tidur selama tiga jam.',
    tr: 'Bebek üç saat uyudu.',
    pl: 'Dziecko spało trzy godziny.',
  },
  duration_mixed_001: {
    'pt-BR': 'Eu a conheço desde que éramos crianças.',
    vi: 'Tôi đã biết cô ấy từ khi chúng tôi còn nhỏ.',
    id: 'Saya sudah mengenalnya sejak kami masih anak-anak.',
    tr: 'Onu çocukluğumuzdan beri tanıyorum.',
    pl: 'Znam ją od czasu, gdy byliśmy dziećmi.',
  },
  duration_mixed_002: {
    'pt-BR': 'Estarei pronto em dez minutos.',
    vi: 'Tôi sẽ sẵn sàng sau mười phút nữa.',
    id: 'Saya akan siap dalam sepuluh menit.',
    tr: 'On dakika içinde hazır olacağım.',
    pl: 'Będę gotowy za dziesięć minut.',
  },
  duration_mixed_003: {
    'pt-BR': 'Ele trabalhou em Londres por cinco anos.',
    vi: 'Anh ấy đã làm việc ở London trong năm năm.',
    id: 'Dia bekerja di London selama lima tahun.',
    tr: "Londra'da beş yıl çalıştı.",
    pl: 'Pracował w Londynie przez pięć lat.',
  },
  duration_mixed_004: {
    'pt-BR': 'Não comi nada desde o café da manhã.',
    vi: 'Tôi chưa ăn gì từ bữa sáng.',
    id: 'Saya belum makan apa pun sejak sarapan.',
    tr: 'Kahvaltıdan beri hiçbir şey yemedim.',
    pl: 'Nie jadłem nic od śniadania.',
  },
  duration_mixed_005: {
    'pt-BR': 'Nós conversamos por muito tempo.',
    vi: 'Chúng tôi đã nói chuyện rất lâu.',
    id: 'Kami berbicara lama sekali.',
    tr: 'Uzun süre konuştuk.',
    pl: 'Rozmawialiśmy długo.',
  },
  duration_mixed_006: {
    'pt-BR': 'Ela mora em Cork desde 2019, então está lá há cinco anos.',
    vi: 'Cô ấy sống ở Cork từ năm 2019, nên cô ấy đã ở đó được năm năm.',
    id: 'Dia tinggal di Cork sejak 2019, jadi dia sudah di sana selama lima tahun.',
    tr: "2019'dan beri Cork'ta yaşıyor, yani beş yıldır orada.",
    pl: 'Mieszka w Cork od 2019 roku, więc jest tam od pięciu lat.',
  },
};

const DURATION_SKILL_HINTS: Record<string, Record<PlannedTrainingLocale, string>> = {
  duration_for: {
    'pt-BR': 'Depois do espaço vem uma duração; duração usa for.',
    vi: 'Sau chỗ trống là độ dài thời gian; độ dài dùng for.',
    id: 'Setelah bagian kosong ada durasi; durasi memakai for.',
    tr: 'Boşluktan sonra süre gelir; süre for alır.',
    pl: 'Po luce jest długość czasu; długość używa for.',
  },
  start_point_since: {
    'pt-BR': 'Depois do espaço vem ponto de início; ponto de início usa since.',
    vi: 'Sau chỗ trống là điểm bắt đầu; điểm bắt đầu dùng since.',
    id: 'Setelah bagian kosong ada titik awal; titik awal memakai since.',
    tr: 'Boşluktan sonra başlangıç noktası gelir; başlangıç since alır.',
    pl: 'Po luce jest punkt startu; punkt startu używa since.',
  },
  present_perfect_duration_for: {
    'pt-BR': 'O estado dura por um período; em Present Perfect, duração usa for.',
    vi: 'Trạng thái kéo dài trong một khoảng; với Present Perfect, độ dài dùng for.',
    id: 'Keadaan berlangsung selama periode; dalam Present Perfect, durasi memakai for.',
    tr: 'Durum bir süre boyunca devam eder; Present Perfect ile süre for alır.',
    pl: 'Stan trwa przez okres; w Present Perfect długość używa for.',
  },
  present_perfect_start_since: {
    'pt-BR': 'O estado começou em um ponto; em Present Perfect, início usa since.',
    vi: 'Trạng thái bắt đầu tại một điểm; với Present Perfect, điểm bắt đầu dùng since.',
    id: 'Keadaan mulai pada satu titik; dalam Present Perfect, awal memakai since.',
    tr: 'Durum bir noktada başladı; Present Perfect ile başlangıç since alır.',
    pl: 'Stan zaczął się w punkcie; w Present Perfect start używa since.',
  },
  since_clause: {
    'pt-BR': 'A oração inteira mostra o momento de início; use since.',
    vi: 'Cả mệnh đề cho biết thời điểm bắt đầu; dùng since.',
    id: 'Seluruh klausa menunjukkan titik awal; gunakan since.',
    tr: 'Tüm yan cümle başlangıç anını gösterir; since kullan.',
    pl: 'Całe zdanie podrzędne pokazuje moment startu; użyj since.',
  },
  for_vs_in_future: {
    'pt-BR': 'Aqui é um momento futuro depois de um período; "daqui a" usa in.',
    vi: 'Ở đây là thời điểm tương lai sau một khoảng; "sau nữa" dùng in.',
    id: 'Ini titik waktu masa depan setelah periode; gunakan in.',
    tr: 'Burada bir süreden sonraki gelecek an var; in kullan.',
    pl: 'To przyszły moment po okresie; użyj in.',
  },
  mixed_for_since_pair: {
    'pt-BR': 'Separe: ano de início usa since; duração usa for.',
    vi: 'Tách ra: năm bắt đầu dùng since; độ dài dùng for.',
    id: 'Pisahkan: tahun awal memakai since; durasi memakai for.',
    tr: 'Ayır: başlangıç yılı since alır; süre for alır.',
    pl: 'Rozdziel: rok startu używa since; długość używa for.',
  },
};

const DURATION_GENERIC_HINTS: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'Pergunte: é duração ou ponto de início?',
  vi: 'Hãy hỏi: đó là độ dài hay điểm bắt đầu?',
  id: 'Tanyakan: ini durasi atau titik awal?',
  tr: 'Sor: süre mi, başlangıç noktası mı?',
  pl: 'Zapytaj: długość czasu czy punkt startu?',
};

function fillPlanned(copy: TriText, planned: Partial<Record<PlannedTrainingLocale, string>>): TriText {
  const next: TriText = { ...copy };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] && planned[locale]) next[locale] = planned[locale];
  }
  return next;
}

function plannedDurationFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): Record<PlannedTrainingLocale, string> {
  const focus = input.focusWords.join(' / ');
  const hints = DURATION_SKILL_HINTS[input.targetSkill] ?? DURATION_GENERIC_HINTS;
  return {
    'pt-BR': `Use "${input.correctAnswer}"${focus ? ` com ${focus}` : ''}. ${hints['pt-BR']}`,
    vi: `Dùng "${input.correctAnswer}"${focus ? ` với ${focus}` : ''}. ${hints.vi}`,
    id: `Gunakan "${input.correctAnswer}"${focus ? ` dengan ${focus}` : ''}. ${hints.id}`,
    tr: `"${input.correctAnswer}" kullan${focus ? ` (${focus})` : ''}. ${hints.tr}`,
    pl: `Użyj "${input.correctAnswer}"${focus ? ` z ${focus}` : ''}. ${hints.pl}`,
  };
}

function durationStep(input: {
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
  retry: [TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  const correctIndex = input.options.findIndex((option) => option === input.correctAnswer);
  const plannedFeedback = plannedDurationFeedback(input);
  const plannedTranslation = DURATION_STEP_TRANSLATIONS[input.id] ?? plannedFeedback;
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: fillPlanned(input.translation, plannedTranslation),
    explanationBlock: tri(
      'Не переводи for/since напрямую. Сначала спроси: после пропуска длительность или точка начала?',
      'Не перекладай for/since напряму. Спочатку запитай: після пропуску тривалість чи точка початку?',
      'No traduzcas for/since directamente. Primero pregunta: después del hueco hay duración o punto de inicio?',
      {
        'pt-BR': 'Não traduza for/since diretamente. Primeiro pergunte: depois do espaço há duração ou ponto de início?',
        vi: 'Đừng dịch trực tiếp for/since. Trước tiên hãy hỏi: sau chỗ trống là độ dài hay điểm bắt đầu?',
        id: 'Jangan menerjemahkan for/since secara langsung. Tanyakan dulu: setelah bagian kosong ada durasi atau titik awal?',
        tr: 'For/since doğrudan çevirme. Önce sor: boşluktan sonra süre mi var, başlangıç noktası mı?',
        pl: 'Nie tłumacz for/since bezpośrednio. Najpierw zapytaj: po luce jest długość czasu czy punkt startu?',
      },
    ),
    microTask: tri('Выбери правильный предлог длительности/старта.', 'Обери правильний прийменник тривалості/старту.', 'Elige la preposición correcta de duración/inicio.', {
      'pt-BR': 'Escolha a preposição correta de duração/início.',
      vi: 'Chọn giới từ đúng cho độ dài/điểm bắt đầu.',
      id: 'Pilih preposisi durasi/awal yang benar.',
      tr: 'Süre/başlangıç için doğru edatı seç.',
      pl: 'Wybierz właściwy przyimek długości/startu.',
    }),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: fillPlanned(input.correctFeedback, plannedFeedback),
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, fillPlanned(input.wrong[option] ?? tri(
        'Не совсем. For отвечает “как долго?”, since отвечает “с какого момента?”.',
        'Не зовсім. For відповідає “як довго?”, since відповідає “з якого моменту?”.',
        'No exactamente. For responde “cuánto tiempo?”, since responde “desde qué momento?”.',
      ), plannedFeedback)])),
    retryFeedback: [
      fillPlanned(input.retry[0], plannedFeedback),
      fillPlanned(input.retry[1], plannedFeedback),
      fillPlanned(input.retry[2], plannedFeedback),
      tri(
        `Подсказка: здесь нужен блок "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
        `Підказка: тут потрібен блок "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
        `Pista: aquí necesitas el bloque "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
        {
          'pt-BR': `Dica: aqui você precisa do bloco "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
          vi: `Gợi ý: ở đây cần cụm "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
          id: `Petunjuk: di sini perlu frasa "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
          tr: `İpucu: burada "${input.correctAnswer} ${input.focusWords[0] ?? ''}" kalıbı gerekli.`.trim(),
          pl: `Wskazówka: tutaj potrzebujesz bloku "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
        },
      ),
    ],
    fallbackExplanation: tri(
      'Проверка простая: если дальше отрезок времени, выбирай for. Если дальше точка старта, выбирай since. Примеры: for two hours, since Monday.',
      'Перевірка проста: якщо далі відрізок часу, обирай for. Якщо далі точка старту, обирай since. Приклади: for two hours, since Monday.',
      'Simple check: if it is a length of time, choose for. If it is a starting point, choose since. Examples: for two hours, since Monday.',
      {
        'pt-BR': 'A verificação é simples: se vem um período de tempo, escolha for. Se vem ponto de início, escolha since. Exemplos: for two hours, since Monday.',
        vi: 'Cách kiểm tra đơn giản: nếu phía sau là một khoảng thời gian, chọn for. Nếu là điểm bắt đầu, chọn since. Ví dụ: for two hours, since Monday.',
        id: 'Pemeriksaannya sederhana: jika berikutnya panjang waktu, pilih for. Jika titik awal, pilih since. Contoh: for two hours, since Monday.',
        tr: 'Kontrol basit: sonra zaman uzunluğu geliyorsa for seç. Başlangıç noktası geliyorsa since seç. Örnekler: for two hours, since Monday.',
        pl: 'Sprawdzenie jest proste: jeśli dalej jest odcinek czasu, wybierz for. Jeśli punkt startu, wybierz since. Przykłady: for two hours, since Monday.',
      },
    ),
    focusWords: input.focusWords,
  };
}

export const PREPOSITION_DURATION_FOR_SINCE_TRAINING: DiagnosisTraining = {
  id: 'preposition_duration_for_since',
  category: 'preposition',
  version: '1.0.0',
  status: 'active',
  priority: 6,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('For / Since: длительность и старт', 'For / Since: тривалість і старт', 'For / Since: duración y punto de inicio', {
    'pt-BR': 'For / Since: duração e ponto de início',
    vi: 'For / Since: độ dài và điểm bắt đầu',
    id: 'For / Since: durasi dan titik awal',
    tr: 'For / Since: süre ve başlangıç',
    pl: 'For / Since: długość i start',
  }),
  shortTitle: tri('For / Since', 'For / Since', 'For / Since', {
    'pt-BR': 'For / Since',
    vi: 'For / Since',
    id: 'For / Since',
    tr: 'For / Since',
    pl: 'For / Since',
  }),
  shortDiagnosis: tri(
    'Ты путаешь for и since: длительность или точка начала.',
    'Ти плутаєш for і since: тривалість чи точка початку.',
    'Confundes for y since: duración o punto de inicio.',
    {
      'pt-BR': 'Você confunde for e since: duração ou ponto de início.',
      vi: 'Bạn nhầm for và since: độ dài hay điểm bắt đầu.',
      id: 'Kamu mencampur for dan since: durasi atau titik awal.',
      tr: 'For ve since karışıyor: süre mi başlangıç noktası mı.',
      pl: 'Mylisz for i since: długość czasu czy punkt startu.',
    },
  ),
  diagnosisText: tri(
    'Ты путаешь for и since. Обычно проблема в том, что оба могут переводиться как “уже/в течение/с”, но английский различает две вещи: сколько длится действие и когда оно началось.',
    'Ти плутаєш for і since. Зазвичай проблема в тому, що обидва можуть перекладатися схоже, але англійська розрізняє дві речі: скільки триває дія і коли вона почалася.',
    'Confundes for y since. Normalmente el problema es que ambos pueden traducirse de forma parecida, pero el inglés distingue dos cosas: cuánto dura la acción y cuándo empezó.',
    {
      'pt-BR': 'Você confunde for e since. Normalmente o problema é que os dois podem soar parecidos na tradução, mas o inglês distingue duas coisas: quanto tempo a ação dura e quando ela começou.',
      vi: 'Bạn nhầm for và since. Vấn đề thường là cả hai có thể dịch khá giống nhau, nhưng tiếng Anh phân biệt hai điều: hành động kéo dài bao lâu và bắt đầu khi nào.',
      id: 'Kamu mencampur for dan since. Biasanya masalahnya adalah keduanya bisa terdengar mirip dalam terjemahan, tetapi bahasa Inggris membedakan dua hal: berapa lama tindakan berlangsung dan kapan dimulai.',
      tr: 'For ve since karışıyor. Sorun genelde ikisinin çeviride benzer duyulabilmesi; İngilizce ise iki şeyi ayırır: eylem ne kadar sürüyor ve ne zaman başladı.',
      pl: 'Mylisz for i since. Problem zwykle polega na tym, że oba mogą brzmieć podobnie w tłumaczeniu, ale angielski rozróżnia dwie rzeczy: jak długo trwa działanie i kiedy się zaczęło.',
    },
  ),
  mentalModel: tri(
    'Думай как о двух полках времени. For отвечает на вопрос "как долго длилось": for two hours, for three years. Since отвечает на вопрос "с какого момента началось": since Monday, since 2020.',
    'Думай як про дві полиці часу. For відповідає на питання "як довго тривало": for two hours, for three years. Since відповідає на питання "з якого моменту почалося": since Monday, since 2020.',
    'Think of two time shelves. For answers "how long": for two hours, for three years. Since answers "since what starting point": since Monday, since 2020.',
    {
      'pt-BR': 'Pense em duas prateleiras de tempo. For responde "por quanto tempo": for two hours, for three years. Since responde "desde que ponto de início": since Monday, since 2020.',
      vi: 'Hãy nghĩ như hai kệ thời gian. For trả lời "bao lâu": for two hours, for three years. Since trả lời "từ điểm bắt đầu nào": since Monday, since 2020.',
      id: 'Bayangkan dua rak waktu. For menjawab "berapa lama": for two hours, for three years. Since menjawab "sejak titik awal apa": since Monday, since 2020.',
      tr: 'İki zaman rafı gibi düşün. For "ne kadar süre" sorusunu cevaplar: for two hours, for three years. Since "hangi başlangıç noktasından beri" sorusunu cevaplar: since Monday, since 2020.',
      pl: 'Myśl o dwóch półkach czasu. For odpowiada na "jak długo": for two hours, for three years. Since odpowiada na "od jakiego punktu startu": since Monday, since 2020.',
    },
  ),
  contrastSet: ['for', 'since'],
  coreRule: tri(
    'for two days, for three years, for a long time. since Monday, since 2020, since I moved here.',
    'for two days, for three years, for a long time. since Monday, since 2020, since I moved here.',
    'for two days, for three years, for a long time. since Monday, since 2020, since I moved here.',
    {
      'pt-BR': 'for two days, for three years, for a long time. since Monday, since 2020, since I moved here.',
      vi: 'for two days, for three years, for a long time. since Monday, since 2020, since I moved here.',
      id: 'for two days, for three years, for a long time. since Monday, since 2020, since I moved here.',
      tr: 'for two days, for three years, for a long time. since Monday, since 2020, since I moved here.',
      pl: 'for two days, for three years, for a long time. since Monday, since 2020, since I moved here.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'For отвечает на вопрос “как долго?”: for two hours, for five years.',
      'Since отвечает на вопрос “с какого момента?”: since Monday, since 2020.',
      'For обычно идет с длительностью: two days, three weeks, a long time.',
      'Since обычно идет с точкой старта: Monday, 2020, yesterday, I moved here.',
      'С Present Perfect часто используются оба: I have lived here for three years / since 2021.',
      'For не означает дедлайн. For two hours = в течение двух часов, не через два часа.',
      'Since не означает длительность. Since three years неправильно, если хочешь сказать “три года”.',
    ],
    uk: [
      'For відповідає на питання “як довго?”: for two hours, for five years.',
      'Since відповідає на питання “з якого моменту?”: since Monday, since 2020.',
      'For зазвичай іде з тривалістю: two days, three weeks, a long time.',
      'Since зазвичай іде з точкою старту: Monday, 2020, yesterday, I moved here.',
      'З Present Perfect часто використовуються обидва: I have lived here for three years / since 2021.',
      'For не означає дедлайн. For two hours = протягом двох годин, не через дві години.',
      'Since не означає тривалість. Since three years неправильно, якщо хочеш сказати “три роки”.',
    ],
    es: [
      'For responde a “cuánto tiempo?”: for two hours, for five years.',
      'Since responde a “desde qué momento?”: since Monday, since 2020.',
      'For normalmente va con duración: two days, three weeks, a long time.',
      'Since normalmente va con punto de inicio: Monday, 2020, yesterday, I moved here.',
      'Con Present Perfect se usan mucho ambos: I have lived here for three years / since 2021.',
      'For no significa fecha límite. For two hours = durante dos horas, no dentro de dos horas.',
      'Since no significa duración. Since three years es incorrecto si quieres decir “tres años”.',
    ],
    'pt-BR': [
      'For responde a "por quanto tempo?": for two hours, for five years.',
      'Since responde a "desde quando?": since Monday, since 2020.',
      'For normalmente vem com duração: two days, three weeks, a long time.',
      'Since normalmente vem com ponto de início: Monday, 2020, yesterday, I moved here.',
      'Com Present Perfect, os dois aparecem muito: I have lived here for three years / since 2021.',
      'For não significa prazo final. For two hours = durante duas horas, não daqui a duas horas.',
      'Since não significa duração. Since three years está errado se você quer dizer "três anos".',
    ],
    vi: [
      'For trả lời câu hỏi "bao lâu?": for two hours, for five years.',
      'Since trả lời câu hỏi "từ thời điểm nào?": since Monday, since 2020.',
      'For thường đi với khoảng thời gian: two days, three weeks, a long time.',
      'Since thường đi với điểm bắt đầu: Monday, 2020, yesterday, I moved here.',
      'Với Present Perfect, cả hai đều rất hay dùng: I have lived here for three years / since 2021.',
      'For không có nghĩa là hạn chót. For two hours = trong hai giờ, không phải sau hai giờ nữa.',
      'Since không có nghĩa là độ dài thời gian. Since three years sai nếu bạn muốn nói "ba năm".',
    ],
    id: [
      'For menjawab "berapa lama?": for two hours, for five years.',
      'Since menjawab "sejak kapan?": since Monday, since 2020.',
      'For biasanya dipakai dengan durasi: two days, three weeks, a long time.',
      'Since biasanya dipakai dengan titik awal: Monday, 2020, yesterday, I moved here.',
      'Dengan Present Perfect, keduanya sering dipakai: I have lived here for three years / since 2021.',
      'For bukan berarti batas waktu. For two hours = selama dua jam, bukan dalam dua jam lagi.',
      'Since bukan berarti durasi. Since three years salah jika maksudmu "tiga tahun".',
    ],
    tr: [
      'For "ne kadar süre?" sorusuna cevap verir: for two hours, for five years.',
      'Since "hangi zamandan beri?" sorusuna cevap verir: since Monday, since 2020.',
      'For genellikle süreyle gelir: two days, three weeks, a long time.',
      'Since genellikle başlangıç noktasıyla gelir: Monday, 2020, yesterday, I moved here.',
      'Present Perfect ile ikisi de sık kullanılır: I have lived here for three years / since 2021.',
      'For son tarih demek değildir. For two hours = iki saat boyunca, iki saat sonra değil.',
      'Since süre demek değildir. "Üç yıl" demek istiyorsan since three years yanlıştır.',
    ],
    pl: [
      'For odpowiada na pytanie "jak długo?": for two hours, for five years.',
      'Since odpowiada na pytanie "od jakiego momentu?": since Monday, since 2020.',
      'For zwykle łączy się z długością czasu: two days, three weeks, a long time.',
      'Since zwykle łączy się z punktem startu: Monday, 2020, yesterday, I moved here.',
      'W Present Perfect często używa się obu: I have lived here for three years / since 2021.',
      'For nie oznacza terminu. For two hours = przez dwie godziny, nie za dwie godziny.',
      'Since nie oznacza długości czasu. Since three years jest błędne, jeśli chcesz powiedzieć "trzy lata".',
    ],
  },
  examples: [
    { en: 'I have lived here for three years.', ru: 'Я живу здесь три года.', uk: 'Я живу тут три роки.', es: 'He vivido aquí durante tres años.', 'pt-BR': 'Moro aqui há três anos.', vi: 'Tôi đã sống ở đây được ba năm.', id: 'Saya sudah tinggal di sini selama tiga tahun.', tr: 'Üç yıldır burada yaşıyorum.', pl: 'Mieszkam tu od trzech lat.', why: tri('Three years отвечает на “как долго?”. Это длительность, поэтому for.', 'Three years відповідає на “як довго?”. Це тривалість, тому for.', 'Three years responde a “cuánto tiempo?”. Es duración, por eso for.', { 'pt-BR': 'Three years responde a "por quanto tempo?". É duração, por isso for.', vi: 'Three years trả lời "bao lâu?". Đó là độ dài, vì vậy dùng for.', id: 'Three years menjawab "berapa lama?". Ini durasi, jadi gunakan for.', tr: 'Three years "ne kadar süre?" sorusunu cevaplar. Bu süredir, bu yüzden for.', pl: 'Three years odpowiada na "jak długo?". To długość czasu, więc for.' }) },
    { en: 'I have lived here since 2021.', ru: 'Я живу здесь с 2021 года.', uk: 'Я живу тут з 2021 року.', es: 'He vivido aquí desde 2021.', 'pt-BR': 'Moro aqui desde 2021.', vi: 'Tôi đã sống ở đây từ năm 2021.', id: 'Saya sudah tinggal di sini sejak 2021.', tr: "2021'den beri burada yaşıyorum.", pl: 'Mieszkam tu od 2021 roku.', why: tri('2021 - точка старта. Поэтому since.', '2021 - точка старту. Тому since.', '2021 es punto de inicio. Por eso since.', { 'pt-BR': '2021 é ponto de início. Por isso since.', vi: '2021 là điểm bắt đầu. Vì vậy dùng since.', id: '2021 adalah titik awal. Jadi gunakan since.', tr: '2021 başlangıç noktasıdır. Bu yüzden since.', pl: '2021 to punkt startu. Dlatego since.' }) },
    { en: 'She has worked here for six months.', ru: 'Она работает здесь шесть месяцев.', uk: 'Вона працює тут шість місяців.', es: 'Ella ha trabajado aquí durante seis meses.', 'pt-BR': 'Ela trabalha aqui há seis meses.', vi: 'Cô ấy đã làm việc ở đây được sáu tháng.', id: 'Dia sudah bekerja di sini selama enam bulan.', tr: 'Altı aydır burada çalışıyor.', pl: 'Pracuje tu od sześciu miesięcy.', why: tri('Six months - длительность. Поэтому for six months.', 'Six months - тривалість. Тому for six months.', 'Six months es duración. Por eso for six months.', { 'pt-BR': 'Six months é duração. Por isso for six months.', vi: 'Six months là độ dài. Vì vậy dùng for six months.', id: 'Six months adalah durasi. Jadi for six months.', tr: 'Six months süredir. Bu yüzden for six months.', pl: 'Six months to długość czasu. Dlatego for six months.' }) },
    { en: 'She has worked here since March.', ru: 'Она работает здесь с марта.', uk: 'Вона працює тут з березня.', es: 'Ella trabaja aquí desde marzo.', 'pt-BR': 'Ela trabalha aqui desde março.', vi: 'Cô ấy đã làm việc ở đây từ tháng Ba.', id: 'Dia bekerja di sini sejak Maret.', tr: 'Marttan beri burada çalışıyor.', pl: 'Pracuje tu od marca.', why: tri('March - момент начала. Поэтому since March.', 'March - момент початку. Тому since March.', 'March es momento de inicio. Por eso since March.', { 'pt-BR': 'March é momento de início. Por isso since March.', vi: 'March là thời điểm bắt đầu. Vì vậy dùng since March.', id: 'March adalah momen awal. Jadi since March.', tr: 'March başlangıç anıdır. Bu yüzden since March.', pl: 'March to moment startu. Dlatego since March.' }) },
    { en: 'We waited for two hours.', ru: 'Мы ждали два часа.', uk: 'Ми чекали дві години.', es: 'Esperamos durante dos horas.', 'pt-BR': 'Esperamos por duas horas.', vi: 'Chúng tôi đã chờ trong hai giờ.', id: 'Kami menunggu selama dua jam.', tr: 'İki saat bekledik.', pl: 'Czekaliśmy dwie godziny.', why: tri('Two hours - сколько длилось ожидание. Это длительность, поэтому for.', 'Two hours - скільки тривало очікування. Це тривалість, тому for.', 'Two hours indica cuánto duró la espera. Es duración, por eso for.', { 'pt-BR': 'Two hours mostra quanto durou a espera. É duração, por isso for.', vi: 'Two hours cho biết việc chờ kéo dài bao lâu. Đó là độ dài, vì vậy dùng for.', id: 'Two hours menunjukkan berapa lama penantian berlangsung. Ini durasi, jadi for.', tr: 'Two hours beklemenin ne kadar sürdüğünü gösterir. Bu süredir, bu yüzden for.', pl: 'Two hours pokazuje, jak długo trwało czekanie. To długość czasu, więc for.' }) },
    { en: "I haven't seen him since Monday.", ru: 'Я не видел его с понедельника.', uk: 'Я не бачив його з понеділка.', es: 'No lo he visto desde el lunes.', 'pt-BR': 'Não o vejo desde segunda-feira.', vi: 'Tôi chưa gặp anh ấy từ thứ Hai.', id: 'Saya belum melihatnya sejak hari Senin.', tr: 'Pazartesiden beri onu görmedim.', pl: 'Nie widziałem go od poniedziałku.', why: tri('Monday - точка старта периода без встречи. Поэтому since Monday.', 'Monday - точка старту періоду без зустрічі. Тому since Monday.', 'Monday es el punto de inicio del período sin verlo. Por eso since Monday.', { 'pt-BR': 'Monday é ponto de início do período sem vê-lo. Por isso since Monday.', vi: 'Monday là điểm bắt đầu của khoảng thời gian không gặp. Vì vậy dùng since Monday.', id: 'Monday adalah titik awal periode tanpa bertemu. Jadi since Monday.', tr: 'Monday görüşmeme döneminin başlangıç noktasıdır. Bu yüzden since Monday.', pl: 'Monday to punkt startu okresu bez spotkania. Dlatego since Monday.' }) },
    { en: 'They stayed there for a week.', ru: 'Они пробыли там неделю.', uk: 'Вони пробули там тиждень.', es: 'Se quedaron allí durante una semana.', 'pt-BR': 'Eles ficaram lá por uma semana.', vi: 'Họ đã ở đó một tuần.', id: 'Mereka tinggal di sana selama seminggu.', tr: 'Orada bir hafta kaldılar.', pl: 'Zostali tam przez tydzień.', why: tri('A week - длительность пребывания. Поэтому for a week.', 'A week - тривалість перебування. Тому for a week.', 'A week es duración de la estancia. Por eso for a week.', { 'pt-BR': 'A week é duração da estadia. Por isso for a week.', vi: 'A week là độ dài thời gian ở lại. Vì vậy dùng for a week.', id: 'A week adalah durasi tinggal. Jadi for a week.', tr: 'A week kalış süresidir. Bu yüzden for a week.', pl: 'A week to długość pobytu. Dlatego for a week.' }) },
    { en: 'I have known her since we were children.', ru: 'Я знаю её с тех пор, как мы были детьми.', uk: 'Я знаю її з тих часів, коли ми були дітьми.', es: 'La conozco desde que éramos niños.', 'pt-BR': 'Eu a conheço desde que éramos crianças.', vi: 'Tôi đã biết cô ấy từ khi chúng tôi còn nhỏ.', id: 'Saya sudah mengenalnya sejak kami masih anak-anak.', tr: 'Onu çocukluğumuzdan beri tanıyorum.', pl: 'Znam ją od czasu, gdy byliśmy dziećmi.', why: tri('Since может стоять перед целым предложением, если оно показывает момент начала.', 'Since може стояти перед цілим реченням, якщо воно показує момент початку.', 'Since puede ir antes de una oración completa si muestra el momento de inicio.', { 'pt-BR': 'Since pode vir antes de uma oração inteira se ela mostra o momento de início.', vi: 'Since có thể đứng trước cả một mệnh đề nếu mệnh đề đó chỉ thời điểm bắt đầu.', id: 'Since bisa berdiri sebelum klausa penuh jika klausa itu menunjukkan momen awal.', tr: 'Since, başlangıç anını gösteriyorsa tam bir cümlenin önünde durabilir.', pl: 'Since może stać przed całym zdaniem, jeśli pokazuje ono moment startu.' }) },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь for и since. В переводе они часто звучат похоже, но в английском это два разных вопроса.', 'Схоже, ти плутаєш for і since. У перекладі вони часто звучать схоже, але в англійській це два різні питання.', 'Parece que confundes for y since. En traducción a veces suenan parecido, pero en inglés son dos preguntas diferentes.', { 'pt-BR': 'Parece que você confunde for e since. Na tradução eles muitas vezes soam parecidos, mas em inglês são duas perguntas diferentes.', vi: 'Có vẻ bạn đang nhầm for và since. Khi dịch, chúng thường nghe giống nhau, nhưng trong tiếng Anh đó là hai câu hỏi khác nhau.', id: 'Sepertinya kamu mencampur for dan since. Dalam terjemahan keduanya sering terdengar mirip, tetapi dalam bahasa Inggris itu dua pertanyaan berbeda.', tr: 'For ve since karışıyor gibi. Çeviride çoğu zaman benzer duyulur, ama İngilizcede iki farklı sorudur.', pl: 'Wygląda na to, że mylisz for i since. W tłumaczeniu często brzmią podobnie, ale po angielsku to dwa różne pytania.' }) },
    { id: 'intro_rule', type: 'rule', text: tri('For отвечает “как долго?”. Since отвечает “с какого момента?”.', 'For відповідає “як довго?”. Since відповідає “з якого моменту?”.', 'For responde “cuánto tiempo?”. Since responde “desde qué momento?”.', { 'pt-BR': 'For responde "por quanto tempo?". Since responde "desde que momento?".', vi: 'For trả lời "bao lâu?". Since trả lời "từ thời điểm nào?".', id: 'For menjawab "berapa lama?". Since menjawab "sejak momen apa?".', tr: 'For "ne kadar süre?" sorusunu cevaplar. Since "hangi andan beri?" sorusunu cevaplar.', pl: 'For odpowiada na "jak długo?". Since odpowiada na "od jakiego momentu?".' }) },
    { id: 'intro_warning', type: 'warning', text: tri('Не смотри на перевод. Смотри на слово после пропуска: длительность - for, точка старта - since.', 'Не дивись на переклад. Дивись на слово після пропуску: тривалість - for, точка старту - since.', 'No mires la traducción. Mira la palabra después del hueco: duración - for, punto de inicio - since.', { 'pt-BR': 'Não olhe para a tradução. Olhe para a palavra depois do espaço: duração - for, ponto de início - since.', vi: 'Đừng nhìn vào bản dịch. Hãy nhìn từ sau chỗ trống: độ dài - for, điểm bắt đầu - since.', id: 'Jangan lihat terjemahannya. Lihat kata setelah bagian kosong: durasi - for, titik awal - since.', tr: 'Çeviriye bakma. Boşluktan sonraki kelimeye bak: süre - for, başlangıç noktası - since.', pl: 'Nie patrz na tłumaczenie. Patrz na słowo po luce: długość czasu - for, punkt startu - since.' }) },
  ],
  steps: [
    durationStep({ id: 'duration_easy_001', order: 1, difficulty: 'easy', targetSkill: 'duration_for', sentence: 'I waited ___ two hours.', translation: tri('Я ждал два часа.', 'Я чекав дві години.', 'Esperé durante dos horas.'), options: ['for', 'since', 'from', 'during'], correctAnswer: 'for', correctFeedback: tri('Да. Two hours показывает, сколько длилось ожидание. Длительность = for.', 'Так. Two hours показує, скільки тривало очікування. Тривалість = for.', 'Sí. Two hours muestra cuánto duró la espera. Duración = for.'), wrong: { since: tri('Since нужен для точки старта: since Monday. Two hours - это длительность, поэтому for.', 'Since потрібен для точки старту: since Monday. Two hours - це тривалість, тому for.', 'Since se usa con punto de inicio: since Monday. Two hours es duración, por eso for.'), from: tri('From показывает начало диапазона. Здесь нет начальной точки, только длительность. Нужен for.', 'From показує початок діапазону. Тут немає початкової точки, тільки тривалість. Потрібен for.', 'From muestra inicio de rango. Aquí solo hay duración. Necesitamos for.'), during: tri('During обычно идет с событием: during the meeting. С количеством времени естественно for two hours.', 'During зазвичай іде з подією: during the meeting. З кількістю часу природно for two hours.', 'During normalmente va con evento. Con cantidad de tiempo usamos for two hours.') }, retry: [tri('Two hours отвечает на “как долго?”. Как долго = for.', 'Two hours відповідає на “як довго?”. Як довго = for.', 'Two hours responde a “cuánto tiempo?”. Cuánto tiempo = for.'), tri('Длительность: for two hours.', 'Тривалість: for two hours.', 'Duración: for two hours.'), tri('Подсказка: waited for two hours.', 'Підказка: waited for two hours.', 'Pista: waited for two hours.')], focusWords: ['two hours'] }),
    durationStep({ id: 'duration_easy_002', order: 2, difficulty: 'easy', targetSkill: 'duration_for', sentence: 'She stayed there ___ a week.', translation: tri('Она пробыла там неделю.', 'Вона пробула там тиждень.', 'Ella se quedó allí una semana.'), options: ['for', 'since', 'from', 'until'], correctAnswer: 'for', correctFeedback: tri('Да. A week - длительность пребывания. Поэтому for a week.', 'Так. A week - тривалість перебування. Тому for a week.', 'Sí. A week es duración de la estancia. Por eso for a week.'), wrong: { since: tri('Since нужен для точки начала. A week - длительность, поэтому for.', 'Since потрібен для точки початку. A week - тривалість, тому for.', 'Since se usa con punto de inicio. A week es duración, por eso for.'), from: tri('From требует точку начала. A week говорит, сколько длилось. Поэтому for.', 'From потребує точку початку. A week говорить, скільки тривало. Тому for.', 'From necesita punto de inicio. A week dice cuánto duró. Por eso for.'), until: tri('Until показывает конечную точку. A week - длительность, не конец. Нужен for.', 'Until показує кінцеву точку. A week - тривалість, не кінець. Потрібен for.', 'Until muestra punto final. A week es duración. Necesitamos for.') }, retry: [tri('A week = сколько времени. Сколько времени = for.', 'A week = скільки часу. Скільки часу = for.', 'A week = cuánto tiempo. Cuánto tiempo = for.'), tri('Запомни: for a week.', 'Запам’ятай: for a week.', 'Recuerda: for a week.'), tri('Подсказка: stayed for a week.', 'Підказка: stayed for a week.', 'Pista: stayed for a week.')], focusWords: ['a week'] }),
    durationStep({ id: 'duration_easy_003', order: 3, difficulty: 'easy', targetSkill: 'start_point_since', sentence: "I haven't seen him ___ Monday.", translation: tri('Я не видел его с понедельника.', 'Я не бачив його з понеділка.', 'No lo he visto desde el lunes.'), options: ['for', 'since', 'during', 'until'], correctAnswer: 'since', correctFeedback: tri('Да. Monday - точка старта периода. С точки старта используется since.', 'Так. Monday - точка старту періоду. З точкою старту використовується since.', 'Sí. Monday es punto de inicio. Con punto de inicio usamos since.'), wrong: { for: tri('For нужен для длительности: for two days. Monday - точка начала. Нужен since.', 'For потрібен для тривалості: for two days. Monday - точка початку. Потрібен since.', 'For se usa con duración. Monday es punto de inicio. Necesitamos since.'), during: tri('During Monday не выражает “с понедельника до сейчас”. Нужен since Monday.', 'During Monday не виражає “з понеділка до зараз”. Потрібен since Monday.', 'During Monday no expresa “desde el lunes hasta ahora”. Necesitamos since Monday.'), until: tri('Until Monday означает “до понедельника”. Здесь наоборот: с понедельника до сейчас.', 'Until Monday означає “до понеділка”. Тут навпаки: з понеділка до зараз.', 'Until Monday significa hasta el lunes. Aquí es desde el lunes hasta ahora.') }, retry: [tri('Monday отвечает на “с какого момента?”. С какого момента = since.', 'Monday відповідає на “з якого моменту?”. З якого моменту = since.', 'Monday responde a “desde qué momento?”. Desde qué momento = since.'), tri('Старт: since Monday.', 'Старт: since Monday.', 'Inicio: since Monday.'), tri('Подсказка: since Monday.', 'Підказка: since Monday.', 'Pista: since Monday.')], focusWords: ['Monday'] }),
    durationStep({ id: 'duration_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'start_point_since', sentence: 'They have lived here ___ 2020.', translation: tri('Они живут здесь с 2020 года.', 'Вони живуть тут з 2020 року.', 'Viven aquí desde 2020.'), options: ['for', 'since', 'during', 'in'], correctAnswer: 'since', correctFeedback: tri('Да. 2020 - год начала. Это точка старта, поэтому since 2020.', 'Так. 2020 - рік початку. Це точка старту, тому since 2020.', 'Sí. 2020 es el año de inicio. Por eso since 2020.'), wrong: { for: tri('For 2020 неправильно: 2020 - не длительность. For требует период: for three years.', 'For 2020 неправильно: 2020 - не тривалість. For потребує період: for three years.', 'For 2020 es incorrecto: 2020 no es duración. For necesita período.'), during: tri('During 2020 = в течение 2020 года. Здесь с 2020 до сейчас, поэтому since.', 'During 2020 = протягом 2020 року. Тут з 2020 до зараз, тому since.', 'During 2020 = durante el año 2020. Aquí es desde 2020 hasta ahora.'), in: tri('In 2020 было бы для события: moved here in 2020. Have lived here требует since.', 'In 2020 було б для події. Have lived here потребує since.', 'In 2020 sería para un evento. Have lived here necesita since.') }, retry: [tri('2020 - начало периода. Начало = since.', '2020 - початок періоду. Початок = since.', '2020 es inicio del período. Inicio = since.'), tri('С 2020 года = since 2020.', 'З 2020 року = since 2020.', 'Desde 2020 = since 2020.'), tri('Подсказка: since 2020.', 'Підказка: since 2020.', 'Pista: since 2020.')], focusWords: ['2020'] }),
    durationStep({ id: 'duration_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'duration_for', sentence: 'We have known each other ___ ten years.', translation: tri('Мы знаем друг друга десять лет.', 'Ми знаємо одне одного десять років.', 'Nos conocemos desde hace diez años.'), options: ['for', 'since', 'from', 'during'], correctAnswer: 'for', correctFeedback: tri('Да. Ten years - длительность. Поэтому for ten years.', 'Так. Ten years - тривалість. Тому for ten years.', 'Sí. Ten years es duración. Por eso for ten years.'), wrong: { since: tri('Since ten years неправильно. Since требует старт: since 2014. Ten years - длительность.', 'Since ten years неправильно. Since потребує старт: since 2014. Ten years - тривалість.', 'Since ten years es incorrecto. Since necesita inicio. Ten years es duración.'), from: tri('From требует начальную точку. Ten years - не старт, а длительность. Нужен for.', 'From потребує початкову точку. Ten years - не старт, а тривалість. Потрібен for.', 'From necesita punto de inicio. Ten years es duración. Necesitamos for.'), during: tri('During ten years звучит неестественно здесь. С количеством времени используется for.', 'During ten years звучить неприродно тут. З кількістю часу використовується for.', 'During ten years suena poco natural. Con cantidad de tiempo usamos for.') }, retry: [tri('Ten years отвечает на “как долго?”. Значит for.', 'Ten years відповідає на “як довго?”. Значить for.', 'Ten years responde a “cuánto tiempo?”. Entonces for.'), tri('Длительность = for ten years.', 'Тривалість = for ten years.', 'Duración = for ten years.'), tri('Подсказка: known each other for ten years.', 'Підказка: known each other for ten years.', 'Pista: known each other for ten years.')], focusWords: ['ten years'] }),
    durationStep({ id: 'duration_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'start_point_since', sentence: 'She has worked here ___ March.', translation: tri('Она работает здесь с марта.', 'Вона працює тут з березня.', 'Ella trabaja aquí desde marzo.'), options: ['for', 'since', 'during', 'by'], correctAnswer: 'since', correctFeedback: tri('Да. March - момент начала работы. Точка старта = since.', 'Так. March - момент початку роботи. Точка старту = since.', 'Sí. March es inicio del trabajo. Punto de inicio = since.'), wrong: { for: tri('For March неправильно: March - не длительность. Длительность была бы for three months.', 'For March неправильно: March - не тривалість. Тривалість була б for three months.', 'For March es incorrecto: March no es duración. La duración sería for three months.'), during: tri('During March = в течение марта. Здесь она работает с марта до сейчас: since.', 'During March = протягом березня. Тут вона працює з березня до зараз: since.', 'During March = durante marzo. Aquí trabaja desde marzo hasta ahora: since.'), by: tri('By March означает “к марту”. Здесь март - начало периода. Нужен since.', 'By March означає “до березня”. Тут березень - початок періоду. Потрібен since.', 'By March significa para marzo. Aquí marzo es inicio. Necesitamos since.') }, retry: [tri('March отвечает на “с какого месяца?”. С какого момента = since.', 'March відповідає на “з якого місяця?”. З якого моменту = since.', 'March responde a “desde qué mes?”. Desde qué momento = since.'), tri('Старт: since March.', 'Старт: since March.', 'Inicio: since March.'), tri('Подсказка: since March.', 'Підказка: since March.', 'Pista: since March.')], focusWords: ['March'] }),
    durationStep({ id: 'duration_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'present_perfect_duration_for', sentence: 'I have been tired ___ days.', translation: tri('Я уставший уже несколько дней.', 'Я втомлений уже кілька днів.', 'Estoy cansado desde hace días.'), options: ['for', 'since', 'from', 'in'], correctAnswer: 'for', correctFeedback: tri('Да. Days здесь означает длительность: несколько дней. Поэтому for days.', 'Так. Days тут означає тривалість: кілька днів. Тому for days.', 'Sí. Days aquí significa duración. Por eso for days.'), wrong: { since: tri('Since days неправильно. Since требует точку начала: since Monday. Days здесь длительность.', 'Since days неправильно. Since потребує точку початку: since Monday. Days тут тривалість.', 'Since days es incorrecto. Since necesita punto de inicio. Days es duración.'), from: tri('From требует стартовую точку. Days показывает длительность. Нужен for.', 'From потребує стартову точку. Days показує тривалість. Потрібен for.', 'From necesita punto de inicio. Days muestra duración. Necesitamos for.'), in: tri('In days может значить “через несколько дней”. Здесь состояние длится несколько дней. Нужен for.', 'In days може означати “через кілька днів”. Тут стан триває кілька днів. Потрібен for.', 'In days puede significar dentro de unos días. Aquí el estado dura días. Necesitamos for.') }, retry: [tri('Состояние длится несколько дней. Длится сколько? for days.', 'Стан триває кілька днів. Триває скільки? for days.', 'El estado dura varios días. Dura cuánto? for days.'), tri('Длительность = for days.', 'Тривалість = for days.', 'Duración = for days.'), tri('Подсказка: tired for days.', 'Підказка: tired for days.', 'Pista: tired for days.')], focusWords: ['days'] }),
    durationStep({ id: 'duration_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'present_perfect_start_since', sentence: 'He has been sick ___ last week.', translation: tri('Он болеет с прошлой недели.', 'Він хворіє з минулого тижня.', 'Está enfermo desde la semana pasada.'), options: ['for', 'since', 'during', 'within'], correctAnswer: 'since', correctFeedback: tri('Да. Last week - точка старта состояния. Поэтому since last week.', 'Так. Last week - точка старту стану. Тому since last week.', 'Sí. Last week es punto de inicio. Por eso since last week.'), wrong: { for: tri('For last week звучит неправильно. For требует длительность: for a week. Last week - старт.', 'For last week звучить неправильно. For потребує тривалість: for a week. Last week - старт.', 'For last week suena incorrecto. For necesita duración: for a week. Last week es inicio.'), during: tri('During last week = в течение прошлой недели. Здесь с прошлой недели до сейчас: since.', 'During last week = протягом минулого тижня. Тут з минулого тижня до зараз: since.', 'During last week = durante la semana pasada. Aquí desde la semana pasada: since.'), within: tri('Within означает “в пределах периода”. Здесь нужен старт состояния: since last week.', 'Within означає “у межах періоду”. Тут потрібен старт стану: since last week.', 'Within significa dentro de un período. Aquí necesitamos inicio: since last week.') }, retry: [tri('Last week показывает, когда состояние началось. Началось когда? since.', 'Last week показує, коли стан почався. Почався коли? since.', 'Last week muestra cuándo empezó. Empezó cuándo? since.'), tri('Старт состояния = since last week.', 'Старт стану = since last week.', 'Inicio del estado = since last week.'), tri('Подсказка: sick since last week.', 'Підказка: sick since last week.', 'Pista: sick since last week.')], focusWords: ['last week'] }),
    durationStep({ id: 'duration_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'duration_for', sentence: 'The baby slept ___ three hours.', translation: tri('Ребёнок спал три часа.', 'Дитина спала три години.', 'El bebé durmió tres horas.'), options: ['for', 'since', 'at', 'by'], correctAnswer: 'for', correctFeedback: tri('Да. Three hours показывает длительность сна. Поэтому for three hours.', 'Так. Three hours показує тривалість сну. Тому for three hours.', 'Sí. Three hours muestra duración del sueño. Por eso for three hours.'), wrong: { since: tri('Since three hours неправильно. Since требует начало: since 3 o’clock. Three hours - длительность.', 'Since three hours неправильно. Since потребує початок: since 3 o’clock. Three hours - тривалість.', 'Since three hours es incorrecto. Since necesita inicio. Three hours es duración.'), at: tri('At используется для точного времени: at 3 o’clock. Здесь длительность, поэтому for.', 'At використовується для точного часу. Тут тривалість, тому for.', 'At se usa con hora exacta. Aquí es duración, por eso for.'), by: tri('By three hours не выражает длительность сна. Нужен for.', 'By three hours не виражає тривалість сну. Потрібен for.', 'By three hours no expresa duración del sueño. Necesitamos for.') }, retry: [tri('Спал сколько? Три часа. Длительность = for.', 'Спав скільки? Три години. Тривалість = for.', 'Durmió cuánto? Tres horas. Duración = for.'), tri('For three hours.', 'For three hours.', 'For three hours.'), tri('Подсказка: slept for three hours.', 'Підказка: slept for three hours.', 'Pista: slept for three hours.')], focusWords: ['three hours'] }),
    durationStep({ id: 'duration_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'since_clause', sentence: 'I have known her ___ we were children.', translation: tri('Я знаю её с тех пор, как мы были детьми.', 'Я знаю її з тих часів, коли ми були дітьми.', 'La conozco desde que éramos niños.'), options: ['for', 'since', 'during', 'from'], correctAnswer: 'since', correctFeedback: tri('Да. We were children показывает момент начала через целое предложение. Since может стоять перед clause.', 'Так. We were children показує момент початку через ціле речення. Since може стояти перед clause.', 'Sí. We were children muestra el inicio con una oración completa. Since puede ir antes.'), wrong: { for: tri('For не ставится перед целым предложением we were children в таком смысле. Нужен since.', 'For не ставиться перед цілим реченням we were children у такому сенсі. Потрібен since.', 'For no va antes de we were children con este sentido. Necesitamos since.'), during: tri('During our childhood было бы возможно. Но перед предложением естественно since.', 'During our childhood було б можливо. Але перед реченням природно since.', 'During our childhood sería posible. Pero antes de la oración, lo natural es since.'), from: tri('From обычно не работает перед такой clause. Нужен since we were children.', 'From зазвичай не працює перед такою clause. Потрібен since we were children.', 'From normalmente no funciona antes de esta clause. Necesitamos since we were children.') }, retry: [tri('We were children показывает, когда началось знакомство. С момента начала = since.', 'We were children показує, коли почалося знайомство. З моменту початку = since.', 'We were children muestra cuándo empezó. Desde el inicio = since.'), tri('Since + предложение: since we were children.', 'Since + речення: since we were children.', 'Since + oración: since we were children.'), tri('Подсказка: since we were children.', 'Підказка: since we were children.', 'Pista: since we were children.')], focusWords: ['we were children'] }),
    durationStep({ id: 'duration_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'for_vs_in_future', sentence: "I'll be ready ___ ten minutes.", translation: tri('Я буду готов через десять минут.', 'Я буду готовий через десять хвилин.', 'Estaré listo en diez minutos.'), options: ['for', 'since', 'in', 'during'], correctAnswer: 'in', correctFeedback: tri('Да. In ten minutes означает через десять минут. Это будущий момент, не длительность действия.', 'Так. In ten minutes означає через десять хвилин. Це майбутній момент, не тривалість дії.', 'Sí. In ten minutes significa dentro de diez minutos. Es momento futuro, no duración.'), wrong: { for: tri('For ten minutes = в течение десяти минут. “Через десять минут” = in ten minutes.', 'For ten minutes = протягом десяти хвилин. “Через десять хвилин” = in ten minutes.', 'For ten minutes = durante diez minutos. Dentro de diez minutos = in ten minutes.'), since: tri('Since нужен для точки старта. Ten minutes здесь показывает будущий момент. Нужен in.', 'Since потрібен для точки старту. Ten minutes тут показує майбутній момент. Потрібен in.', 'Since se usa para inicio. Ten minutes aquí muestra momento futuro. Necesitamos in.'), during: tri('During ten minutes звучит неестественно здесь. Для “через десять минут” нужен in.', 'During ten minutes звучить неприродно тут. Для “через десять хвилин” потрібен in.', 'During ten minutes suena poco natural. Para dentro de diez minutos usamos in.') }, retry: [tri('Через десять минут = in ten minutes. В течение десяти минут = for ten minutes.', 'Через десять хвилин = in ten minutes. Протягом десяти хвилин = for ten minutes.', 'Dentro de diez minutos = in ten minutes. Durante diez minutos = for ten minutes.'), tri('Будущий момент через период = in.', 'Майбутній момент через період = in.', 'Momento futuro después de un período = in.'), tri('Подсказка: ready in ten minutes.', 'Підказка: ready in ten minutes.', 'Pista: ready in ten minutes.')], focusWords: ['ten minutes'] }),
    durationStep({ id: 'duration_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'duration_for', sentence: 'He worked in London ___ five years.', translation: tri('Он работал в Лондоне пять лет.', 'Він працював у Лондоні п’ять років.', 'Trabajó en Londres durante cinco años.'), options: ['for', 'since', 'from', 'by'], correctAnswer: 'for', correctFeedback: tri('Да. Five years показывает длительность работы. Поэтому for five years.', 'Так. Five years показує тривалість роботи. Тому for five years.', 'Sí. Five years muestra duración del trabajo. Por eso for five years.'), wrong: { since: tri('Since five years неправильно. Since требует старт: since 2018. Five years - длительность.', 'Since five years неправильно. Since потребує старт: since 2018. Five years - тривалість.', 'Since five years es incorrecto. Since necesita inicio. Five years es duración.'), from: tri('From требует старт или диапазон. Здесь только длительность. Нужен for.', 'From потребує старт або діапазон. Тут тільки тривалість. Потрібен for.', 'From necesita inicio o rango. Aquí solo hay duración. Necesitamos for.'), by: tri('By five years не выражает “работал пять лет”. Нужен worked for five years.', 'By five years не виражає “працював п’ять років”. Потрібен worked for five years.', 'By five years no expresa trabajó cinco años. Necesitamos worked for five years.') }, retry: [tri('Работал сколько? Пять лет. Сколько времени = for.', 'Працював скільки? П’ять років. Скільки часу = for.', 'Trabajó cuánto tiempo? Cinco años. Cuánto tiempo = for.'), tri('Длительность работы = for five years.', 'Тривалість роботи = for five years.', 'Duración del trabajo = for five years.'), tri('Подсказка: worked for five years.', 'Підказка: worked for five years.', 'Pista: worked for five years.')], focusWords: ['five years'] }),
    durationStep({ id: 'duration_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'start_point_since', sentence: "I haven't eaten anything ___ breakfast.", translation: tri('Я ничего не ел с завтрака.', 'Я нічого не їв зі сніданку.', 'No he comido nada desde el desayuno.'), options: ['for', 'since', 'during', 'until'], correctAnswer: 'since', correctFeedback: tri('Да. Breakfast здесь точка старта периода без еды. Поэтому since breakfast.', 'Так. Breakfast тут точка старту періоду без їжі. Тому since breakfast.', 'Sí. Breakfast aquí es punto de inicio del período sin comer. Por eso since breakfast.'), wrong: { for: tri('For breakfast значит “на завтрак” в другом контексте. Здесь breakfast - точка начала, поэтому since.', 'For breakfast означає “на сніданок” в іншому контексті. Тут breakfast - точка початку, тому since.', 'For breakfast significa para el desayuno. Aquí breakfast es punto de inicio, por eso since.'), during: tri('During breakfast = во время завтрака. Здесь с момента завтрака до сейчас. Нужен since.', 'During breakfast = під час сніданку. Тут з моменту сніданку до зараз. Потрібен since.', 'During breakfast = durante el desayuno. Aquí desde el desayuno hasta ahora. Necesitamos since.'), until: tri('Until breakfast = до завтрака. Здесь наоборот: после завтрака до сейчас. Нужен since.', 'Until breakfast = до сніданку. Тут навпаки: після сніданку до зараз. Потрібен since.', 'Until breakfast = hasta el desayuno. Aquí es desde el desayuno hasta ahora.') }, retry: [tri('Breakfast здесь момент, после которого ты не ел. Момент старта = since.', 'Breakfast тут момент, після якого ти не їв. Момент старту = since.', 'Breakfast aquí es el momento después del cual no comiste. Punto de inicio = since.'), tri('С завтрака = since breakfast.', 'Зі сніданку = since breakfast.', 'Desde el desayuno = since breakfast.'), tri('Подсказка: since breakfast.', 'Підказка: since breakfast.', 'Pista: since breakfast.')], focusWords: ['breakfast'] }),
    durationStep({ id: 'duration_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'duration_for', sentence: 'We talked ___ a long time.', translation: tri('Мы долго разговаривали.', 'Ми довго розмовляли.', 'Hablamos durante mucho tiempo.'), options: ['for', 'since', 'from', 'within'], correctAnswer: 'for', correctFeedback: tri('Да. A long time - длительность. Поэтому for a long time.', 'Так. A long time - тривалість. Тому for a long time.', 'Sí. A long time es duración. Por eso for a long time.'), wrong: { since: tri('Since a long time неправильно. Since требует точку начала. A long time - длительность.', 'Since a long time неправильно. Since потребує точку початку. A long time - тривалість.', 'Since a long time es incorrecto. Since necesita punto de inicio. A long time es duración.'), from: tri('From требует точку начала. A long time не старт, а длительность. Нужен for.', 'From потребує точку початку. A long time не старт, а тривалість. Потрібен for.', 'From necesita punto de inicio. A long time es duración. Necesitamos for.'), within: tri('Within a long time не выражает “долго разговаривали”. Нужен for a long time.', 'Within a long time не виражає “довго розмовляли”. Потрібен for a long time.', 'Within a long time no expresa hablar mucho tiempo. Necesitamos for a long time.') }, retry: [tri('A long time отвечает на “как долго?”. Значит for.', 'A long time відповідає на “як довго?”. Значить for.', 'A long time responde a “cuánto tiempo?”. Entonces for.'), tri('Долго = for a long time.', 'Довго = for a long time.', 'Mucho tiempo = for a long time.'), tri('Подсказка: talked for a long time.', 'Підказка: talked for a long time.', 'Pista: talked for a long time.')], focusWords: ['a long time'] }),
    durationStep({ id: 'duration_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_for_since_pair', sentence: 'She has lived in Cork ___ 2019, so she has been there ___ five years.', translation: tri('Она живет в Корке с 2019 года, так что она там уже пять лет.', 'Вона живе в Корку з 2019 року, тож вона там уже п’ять років.', 'Ella vive en Cork desde 2019, así que lleva allí cinco años.'), options: ['for / since', 'since / for', 'from / since', 'during / for'], correctAnswer: 'since / for', correctFeedback: tri('Да. 2019 - точка старта, поэтому since 2019. Five years - длительность, поэтому for five years.', 'Так. 2019 - точка старту, тому since 2019. Five years - тривалість, тому for five years.', 'Sí. 2019 es punto de inicio, por eso since. Five years es duración, por eso for.'), wrong: { 'for / since': tri('Ты поменял местами. 2019 - старт, значит since. Five years - длительность, значит for.', 'Ти поміняв місцями. 2019 - старт, значить since. Five years - тривалість, значить for.', 'Los invertiste. 2019 es inicio: since. Five years es duración: for.'), 'from / since': tri('From 2019 возможно в диапазонах, но с has lived до настоящего естественно since. Five years требует for.', 'From 2019 можливе в діапазонах, але з has lived до теперішнього природно since. Five years потребує for.', 'From 2019 puede funcionar en rangos, pero con has lived lo natural es since. Five years necesita for.'), 'during / for': tri('During 2019 = в течение 2019 года. Здесь с 2019 до сейчас, поэтому since 2019.', 'During 2019 = протягом 2019 року. Тут з 2019 до зараз, тому since 2019.', 'During 2019 = durante 2019. Aquí desde 2019 hasta ahora, por eso since 2019.') }, retry: [tri('Раздели: 2019 = когда началось = since. Five years = сколько длится = for.', 'Розділи: 2019 = коли почалося = since. Five years = скільки триває = for.', 'Divide: 2019 = cuándo empezó = since. Five years = cuánto dura = for.'), tri('Старт since, длительность for.', 'Старт since, тривалість for.', 'Inicio since, duración for.'), tri('Подсказка: since 2019 / for five years.', 'Підказка: since 2019 / for five years.', 'Pista: since 2019 / for five years.')], focusWords: ['2019', 'five years'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['duration_since_error', 'start_point_for_error', 'present_perfect_duration_confusion', 'since_clause_confusion', 'for_vs_in_future_confusion', 'specific_start_vs_duration_confusion'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем, это длительность или точка старта.', 'Звичайне пояснення: показуємо, це тривалість чи точка старту.', 'Explicación normal: mostramos si es duración o punto de inicio.', { 'pt-BR': 'Explicação normal: mostramos se é duração ou ponto de início.', vi: 'Giải thích bình thường: cho biết đó là độ dài hay điểm bắt đầu.', id: 'Penjelasan biasa: tunjukkan ini durasi atau titik awal.', tr: 'Normal açıklama: bunun süre mi başlangıç noktası mı olduğunu gösteririz.', pl: 'Zwykłe wyjaśnienie: pokazujemy, czy to długość czasu, czy punkt startu.' }),
    depth2: tri('Проще: сводим выбор к двум вопросам “как долго?” и “с какого момента?”.', 'Простіше: зводимо вибір до двох питань “як довго?” і “з якого моменту?”.', 'Más simple: reducimos la elección a dos preguntas “cuánto tiempo?” y “desde cuándo?”.', { 'pt-BR': 'Mais simples: reduzimos a escolha a duas perguntas: "por quanto tempo?" e "desde que momento?".', vi: 'Đơn giản hơn: thu lựa chọn về hai câu hỏi "bao lâu?" và "từ thời điểm nào?".', id: 'Lebih sederhana: pilihan dipersempit menjadi dua pertanyaan "berapa lama?" dan "sejak kapan?".', tr: 'Daha basit: seçimi iki soruya indiririz: "ne kadar süre?" ve "hangi andan beri?".', pl: 'Prościej: sprowadzamy wybór do dwóch pytań: "jak długo?" i "od jakiego momentu?".' }),
    depth3: tri('Еще проще: показываем готовую пару for + period, since + start.', 'Ще простіше: показуємо готову пару for + period, since + start.', 'Aún más simple: mostramos la pareja for + period, since + start.', { 'pt-BR': 'Ainda mais simples: mostramos o par pronto for + period, since + start.', vi: 'Đơn giản hơn nữa: cho cặp có sẵn for + period, since + start.', id: 'Lebih sederhana lagi: tampilkan pasangan siap pakai for + period, since + start.', tr: 'Daha da basit: hazır çifti gösteririz: for + period, since + start.', pl: 'Jeszcze prościej: pokazujemy gotową parę for + period, since + start.' }),
    depth4: tri('Почти подсказка: прямо указываем, что после пропуска стоит длительность или старт.', 'Майже підказка: прямо вказуємо, що після пропуску стоїть тривалість або старт.', 'Casi pista: indicamos directamente si después del hueco hay duración o inicio.', { 'pt-BR': 'Quase uma dica: indicamos diretamente se depois do espaço há duração ou início.', vi: 'Gần như gợi ý: chỉ thẳng sau chỗ trống là độ dài hay điểm bắt đầu.', id: 'Hampir petunjuk: langsung tunjukkan setelah bagian kosong ada durasi atau awal.', tr: 'Neredeyse ipucu: boşluktan sonra süre mi başlangıç mı olduğunu doğrudan belirtiriz.', pl: 'Prawie podpowiedź: wprost wskazujemy, czy po luce jest długość czasu, czy start.' }),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. Не переводи. После пропуска длительность или точка начала? Длительность = for. Точка начала = since.', 'Зупинись. Не перекладай. Після пропуску тривалість чи точка початку? Тривалість = for. Точка початку = since.', 'Detente. No traduzcas. Después del hueco hay duración o punto de inicio? Duración = for. Punto de inicio = since.', { 'pt-BR': 'Pare. Não traduza. Depois do espaço há duração ou ponto de início? Duração = for. Ponto de início = since.', vi: 'Dừng lại. Đừng dịch. Sau chỗ trống là độ dài hay điểm bắt đầu? Độ dài = for. Điểm bắt đầu = since.', id: 'Berhenti. Jangan terjemahkan. Setelah bagian kosong ada durasi atau titik awal? Durasi = for. Titik awal = since.', tr: 'Dur. Çevirme. Boşluktan sonra süre mi var, başlangıç noktası mı? Süre = for. Başlangıç noktası = since.', pl: 'Zatrzymaj się. Nie tłumacz. Po luce jest długość czasu czy punkt startu? Długość = for. Punkt startu = since.' }) },
    afterThreeWrongInSameExercise: { action: 'show_duration_start_hint_then_retry', card: tri('Подсказка по смыслу: система покажет, это “как долго” или “с какого момента”, но не выберет ответ за пользователя.', 'Підказка за змістом: система покаже, це “як довго” чи “з якого моменту”, але не вибере відповідь за користувача.', 'Pista de significado: el sistema mostrará si es “cuánto tiempo” o “desde cuándo”, pero no elegirá la respuesta.', { 'pt-BR': 'Dica de sentido: o sistema vai mostrar se é "por quanto tempo" ou "desde que momento", mas não escolherá a resposta pelo usuário.', vi: 'Gợi ý theo nghĩa: hệ thống sẽ cho biết đó là "bao lâu" hay "từ thời điểm nào", nhưng không chọn đáp án thay người dùng.', id: 'Petunjuk makna: sistem akan menunjukkan ini "berapa lama" atau "sejak kapan", tetapi tidak memilih jawaban untuk pengguna.', tr: 'Anlam ipucu: sistem bunun "ne kadar süre" mi "hangi andan beri" mi olduğunu gösterecek, ama kullanıcı yerine cevabı seçmeyecek.', pl: 'Podpowiedź znaczeniowa: system pokaże, czy to "jak długo", czy "od jakiego momentu", ale nie wybierze odpowiedzi za użytkownika.' }) },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери тип времени: длительность или старт. Потом система вернет тебя к for/since.', 'Режим підказки: спочатку обери тип часу: тривалість чи старт. Потім система поверне тебе до for/since.', 'Modo guiado: primero elige el tipo de tiempo: duración o inicio. Luego el sistema te devuelve a for/since.', { 'pt-BR': 'Modo guiado: primeiro escolha o tipo de tempo: duração ou início. Depois o sistema leva você de volta a for/since.', vi: 'Chế độ gợi ý: trước tiên chọn loại thời gian: độ dài hay điểm bắt đầu. Sau đó hệ thống đưa bạn quay lại for/since.', id: 'Mode terpandu: pertama pilih jenis waktu: durasi atau awal. Lalu sistem mengembalikanmu ke for/since.', tr: 'Rehberli mod: önce zaman türünü seç: süre mi başlangıç mı. Sonra sistem seni for/since seçimine geri götürür.', pl: 'Tryb prowadzony: najpierw wybierz typ czasu: długość czy start. Potem system wróci z tobą do for/since.' }) },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_duration_001', prompt: tri('Two hours - это длительность или точка начала?', 'Two hours - це тривалість чи точка початку?', 'Two hours es duración o punto de inicio?', { 'pt-BR': 'Two hours é duração ou ponto de início?', vi: 'Two hours là độ dài hay điểm bắt đầu?', id: 'Two hours itu durasi atau titik awal?', tr: 'Two hours süre mi başlangıç noktası mı?', pl: 'Two hours to długość czasu czy punkt startu?' }), options: ['длительность', 'точка начала'], correctIndex: 0, thenReturnToExerciseId: 'duration_easy_001' },
      { id: 'guided_duration_002', prompt: tri("Monday в фразе I haven't seen him ___ Monday - это длительность или точка начала?", "Monday у фразі I haven't seen him ___ Monday - це тривалість чи точка початку?", "Monday en I haven't seen him ___ Monday es duración o punto de inicio?", { 'pt-BR': "Monday em I haven't seen him ___ Monday é duração ou ponto de início?", vi: "Monday trong câu I haven't seen him ___ Monday là độ dài hay điểm bắt đầu?", id: "Monday dalam I haven't seen him ___ Monday itu durasi atau titik awal?", tr: "I haven't seen him ___ Monday cümlesindeki Monday süre mi başlangıç noktası mı?", pl: "Monday we frazie I haven't seen him ___ Monday to długość czasu czy punkt startu?" }), options: ['длительность', 'точка начала'], correctIndex: 1, thenReturnToExerciseId: 'duration_easy_003' },
      { id: 'guided_duration_003', prompt: tri('Five years - это “как долго” или “с какого момента”?', 'Five years - це “як довго” чи “з якого моменту”?', 'Five years es “cuánto tiempo” o “desde cuándo”?', { 'pt-BR': 'Five years é "por quanto tempo" ou "desde que momento"?', vi: 'Five years là "bao lâu" hay "từ thời điểm nào"?', id: 'Five years itu "berapa lama" atau "sejak kapan"?', tr: 'Five years "ne kadar süre" mi "hangi andan beri" mi?', pl: 'Five years to "jak długo" czy "od jakiego momentu"?' }), options: ['как долго', 'с какого момента'], correctIndex: 0, thenReturnToExerciseId: 'duration_contrast_002' },
      { id: 'guided_duration_004', prompt: tri('2019 - это “как долго” или “с какого момента”?', '2019 - це “як довго” чи “з якого моменту”?', '2019 es “cuánto tiempo” o “desde cuándo”?', { 'pt-BR': '2019 é "por quanto tempo" ou "desde que momento"?', vi: '2019 là "bao lâu" hay "từ thời điểm nào"?', id: '2019 itu "berapa lama" atau "sejak kapan"?', tr: '2019 "ne kadar süre" mi "hangi andan beri" mi?', pl: '2019 to "jak długo" czy "od jakiego momentu"?' }), options: ['как долго', 'с какого момента'], correctIndex: 1, thenReturnToExerciseId: 'duration_contrast_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'preposition',
    microDiagnosisId: 'preposition_duration_for_since',
    diagnosisLabel: tri('For / Since: длительность и старт', 'For / Since: тривалість і старт', 'For / Since: duración e inicio', {
      'pt-BR': 'For / Since: duração e início',
      vi: 'For / Since: độ dài và điểm bắt đầu',
      id: 'For / Since: durasi dan awal',
      tr: 'For / Since: süre ve başlangıç',
      pl: 'For / Since: długość i start',
    }),
    contrastSet: ['for', 'since'],
    focusWords: ['for', 'since'],
    focusPatterns: ['duration_for', 'start_point_since', 'present_perfect_duration_for', 'present_perfect_start_since', 'since_clause', 'for_vs_in_future', 'mixed_for_since_pair'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_preposition_duration_for_since_start',
    answer: 'diagnosis_training_preposition_duration_for_since_answer',
    mastery: 'diagnosis_training_preposition_duration_for_since_mastery',
    recovery: 'diagnosis_training_preposition_duration_for_since_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'preposition', microDiagnosisId: 'preposition_duration_for_since', contrastSet: ['for', 'since'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logDurationType: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=preposition&microDiagnosisId=preposition_duration_for_since',
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
