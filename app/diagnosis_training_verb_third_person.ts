import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const PLANNED_LOCALE_FALLBACK = {
  'pt-BR': 'Este treino está sendo preparado para este idioma.',
  vi: 'Bài luyện này đang được chuẩn bị cho ngôn ngữ này.',
  id: 'Latihan ini sedang disiapkan untuk bahasa ini.',
  tr: 'Bu alıştırma bu dil için hazırlanıyor.',
  pl: 'To ćwiczenie jest przygotowywane dla tego języka.',
} as const;

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

const tri = (ru: string, uk: string, es: string, planned: Partial<Record<keyof typeof PLANNED_LOCALE_FALLBACK, string>> = {}): TriText => ({
  ru,
  uk,
  es,
  'pt-BR': planned['pt-BR'] ?? PLANNED_LOCALE_FALLBACK['pt-BR'],
  vi: planned.vi ?? PLANNED_LOCALE_FALLBACK.vi,
  id: planned.id ?? PLANNED_LOCALE_FALLBACK.id,
  tr: planned.tr ?? PLANNED_LOCALE_FALLBACK.tr,
  pl: planned.pl ?? PLANNED_LOCALE_FALLBACK.pl,
});

function thirdStep(input: {
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
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'В обычном утверждении he, she и it добавляют к действию маленький хвост: -s, -es или особую форму has.',
      'У звичайному ствердженні he, she та it додають до дії маленький хвіст: -s, -es або особливу форму has.',
      'En afirmación de Present Simple, solo he/she/it añade una marca al verbo: -s, -es o la forma especial has.',
      {
        'pt-BR': 'Em afirmações no Present Simple, só he/she/it adiciona uma marca ao verbo: -s, -es ou a forma especial has.',
        vi: 'Trong câu khẳng định Present Simple, chỉ he/she/it thêm dấu vào động từ: -s, -es hoặc dạng đặc biệt has.',
        id: 'Dalam afirmasi Present Simple, hanya he/she/it menambahkan tanda pada verba: -s, -es, atau bentuk khusus has.',
        tr: 'Present Simple olumlu cümlede yalnızca he/she/it fiile bir işaret ekler: -s, -es veya özel has biçimi.',
        pl: 'W twierdzeniu Present Simple tylko he/she/it dodaje znak do czasownika: -s, -es albo specjalną formę has.',
      },
    ),
    microTask: tri(
      'Выбери форму действия под того, кто его делает.',
      'Обери форму дії під того, хто її робить.',
      'Elige la forma del verbo que encaja con el subject.',
      {
        'pt-BR': 'Escolha a forma do verbo que combina com o sujeito.',
        vi: 'Chọn dạng động từ hợp với chủ ngữ.',
        id: 'Pilih bentuk verba yang cocok dengan subjek.',
        tr: 'Özneye uyan fiil biçimini seç.',
        pl: 'Wybierz formę czasownika pasującą do podmiotu.',
      },
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Сначала найди, кто делает действие: he/she/it обычно дают хвост -s или -es, а I/you/we/they оставляют действие простым.',
        'Не зовсім. Спочатку знайди, хто робить дію: he/she/it зазвичай дають хвіст -s або -es, а I/you/we/they залишають дію простою.',
        'No exactamente. Primero encuentra el subject: he/she/it necesita -s/-es, pero I/you/we/they usan base verb.',
        {
          'pt-BR': 'Não exatamente. Primeiro encontre o sujeito: he/she/it precisa de -s/-es, mas I/you/we/they usam base verb.',
          vi: 'Chưa hẳn. Trước tiên tìm chủ ngữ: he/she/it cần -s/-es, còn I/you/we/they dùng base verb.',
          id: 'Belum tepat. Pertama temukan subjeknya: he/she/it perlu -s/-es, tetapi I/you/we/they memakai base verb.',
          tr: 'Tam değil. Önce özneyi bul: he/she/it -s/-es ister, ama I/you/we/they base verb kullanır.',
          pl: 'Nie do końca. Najpierw znajdź podmiot: he/she/it potrzebuje -s/-es, ale I/you/we/they używają base verb.',
        },
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Подсказка: правильный блок - "${input.correctAnswer}".`,
        `Підказка: правильний блок - "${input.correctAnswer}".`,
        `Pista: el bloque correcto es "${input.correctAnswer}".`,
        {
          'pt-BR': `Dica: o bloco correto é "${input.correctAnswer}".`,
          vi: `Gợi ý: khối đúng là "${input.correctAnswer}".`,
          id: `Petunjuk: blok yang benar adalah "${input.correctAnswer}".`,
          tr: `İpucu: doğru blok "${input.correctAnswer}".`,
          pl: `Podpowiedź: poprawny blok to "${input.correctAnswer}".`,
        },
      ),
    ],
    fallbackExplanation: tri(
      'Проверь две вещи: это утверждение или вопрос? В обычном утверждении he/she/it добавляют -s или -es. После does действие снова без хвоста.',
      'Перевір дві речі: це ствердження чи питання? У звичайному ствердженні he/she/it додають -s або -es. Після does дія знову без хвоста.',
      'Revisa dos cosas: es afirmación o pregunta? Si es afirmación y subject = he/she/it, necesitas verb+s/es. Después de does la forma vuelve a ser simple.',
      {
        'pt-BR': 'Verifique duas coisas: é afirmação ou pergunta? Em afirmação comum, he/she/it adiciona -s ou -es. Depois de does, o verbo volta sem cauda.',
        vi: 'Kiểm tra hai điều: đây là câu khẳng định hay câu hỏi? Trong câu khẳng định thường, he/she/it thêm -s hoặc -es. Sau does, động từ lại không có đuôi.',
        id: 'Periksa dua hal: ini afirmasi atau pertanyaan? Dalam afirmasi biasa, he/she/it menambahkan -s atau -es. Setelah does, verba kembali tanpa ekor.',
        tr: 'İki şeyi kontrol et: bu olumlu cümle mi, soru mu? Normal olumlu cümlede he/she/it -s veya -es ekler. Does sonrasında fiil yine eksiz olur.',
        pl: 'Sprawdź dwie rzeczy: to twierdzenie czy pytanie? W zwykłym twierdzeniu he/she/it dodaje -s albo -es. Po does czasownik znów jest bez końcówki.',
      },
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_THIRD_PERSON_TRAINING: DiagnosisTraining = {
  id: 'verb_third_person',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 8,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('He / She / It: глагол с -s', 'He / She / It: дієслово з -s', 'He / She / It: verbo con -s', {
    'pt-BR': 'He / She / It: verbo com -s',
    vi: 'He / She / It: động từ có -s',
    id: 'He / She / It: verba dengan -s',
    tr: 'He / She / It: -s alan fiil',
    pl: 'He / She / It: czasownik z -s',
  }),
  shortTitle: tri('He / She / It + -s', 'He / She / It + -s', 'He / She / It + -s', {
    'pt-BR': 'He / She / It + -s',
    vi: 'He / She / It + -s',
    id: 'He / She / It + -s',
    tr: 'He / She / It + -s',
    pl: 'He / She / It + -s',
  }),
  shortDiagnosis: tri(
    'Ты забываешь маленький хвост -s/-es после he, she и it.',
    'Ти забуваєш маленький хвіст -s/-es після he, she та it.',
    'Olvidas -s/-es en afirmaciones de Present Simple con he/she/it.',
    {
      'pt-BR': 'Você esquece o pequeno -s/-es nas afirmações de Present Simple com he/she/it.',
      vi: 'Bạn quên đuôi nhỏ -s/-es trong câu khẳng định Present Simple với he/she/it.',
      id: 'Kamu lupa ekor kecil -s/-es dalam afirmasi Present Simple dengan he/she/it.',
      tr: 'He/she/it ile Present Simple olumlu cümlede küçük -s/-es ekini unutuyorsun.',
      pl: 'Zapominasz małe -s/-es w twierdzeniach Present Simple z he/she/it.',
    },
  ),
  diagnosisText: tri(
    'Ты забываешь -s/-es после he, she, it в обычных утверждениях. Смысл понятен, но форма звучит незаконченно: в английском после he/she/it действие часто получает маленький хвост.',
    'Ти забуваєш -s/-es після he, she, it у звичайних ствердженнях. Зміст зрозумілий, але форма звучить незавершено: в англійській після he/she/it дія часто отримує маленький хвіст.',
    'Olvidas -s/-es después de he, she, it en afirmaciones de Present Simple. No es un error de significado, sino de forma: he/she/it necesita una pequeña marca gramatical en el verbo.',
    {
      'pt-BR': 'Você esquece -s/-es depois de he, she, it em afirmações de Present Simple. Não é erro de sentido, mas de forma: he/she/it precisa de uma pequena marca gramatical no verbo.',
      vi: 'Bạn quên -s/-es sau he, she, it trong câu khẳng định Present Simple. Đây không phải lỗi nghĩa, mà là lỗi dạng: he/she/it cần một dấu ngữ pháp nhỏ trên động từ.',
      id: 'Kamu lupa -s/-es setelah he, she, it dalam afirmasi Present Simple. Ini bukan kesalahan makna, melainkan bentuk: he/she/it perlu tanda gramatikal kecil pada verba.',
      tr: 'Present Simple olumlu cümlede he, she, it sonrasında -s/-es ekini unutuyorsun. Bu anlam hatası değil, biçim hatasıdır: he/she/it fiilde küçük bir gramer işareti ister.',
      pl: 'Zapominasz -s/-es po he, she, it w twierdzeniach Present Simple. To nie błąd znaczenia, tylko formy: he/she/it potrzebuje małego znaku gramatycznego przy czasowniku.',
    },
  ),
  mentalModel: tri(
    'Сначала спроси: кто делает действие? I, you, we, they оставляют действие простым. He, she, it обычно добавляют -s или -es.',
    'Спочатку запитай: хто робить дію? I, you, we, they залишають дію простою. He, she, it зазвичай додають -s або -es.',
    'En afirmación de Present Simple: I/you/we/they usan verbo simple. He/she/it añade -s o -es: I work, she works. They go, he goes.',
    {
      'pt-BR': 'Em afirmação de Present Simple: I/you/we/they usam verbo simples. He/she/it adiciona -s ou -es: I work, she works. They go, he goes.',
      vi: 'Trong câu khẳng định Present Simple: I/you/we/they dùng động từ dạng đơn giản. He/she/it thêm -s hoặc -es: I work, she works. They go, he goes.',
      id: 'Dalam afirmasi Present Simple: I/you/we/they memakai verba sederhana. He/she/it menambahkan -s atau -es: I work, she works. They go, he goes.',
      tr: 'Present Simple olumlu cümlede: I/you/we/they yalın fiil kullanır. He/she/it -s veya -es ekler: I work, she works. They go, he goes.',
      pl: 'W twierdzeniu Present Simple: I/you/we/they używają prostego czasownika. He/she/it dodaje -s albo -es: I work, she works. They go, he goes.',
    },
  ),
  contrastSet: ['base verb', 'verb+s', 'verb+es', 'has', 'does'],
  coreRule: tri(
    'Для I/you/we/they действие остается простым. Для he/she/it добавь -s, иногда -es; у have отдельная форма has.',
    'Для I/you/we/they дія залишається простою. Для he/she/it додай -s, іноді -es; у have окрема форма has.',
    'I work, you work, we work, they work. Pero: he works, she works, it works. Después de -o, -ch, -sh, -s, -x muchas veces añadimos -es: goes, watches, finishes. Have cambia a has.',
    {
      'pt-BR': 'I work, you work, we work, they work. Mas: he works, she works, it works. Depois de -o, -ch, -sh, -s, -x muitas vezes adicionamos -es: goes, watches, finishes. Have vira has.',
      vi: 'I work, you work, we work, they work. Nhưng: he works, she works, it works. Sau -o, -ch, -sh, -s, -x thường thêm -es: goes, watches, finishes. Have đổi thành has.',
      id: 'I work, you work, we work, they work. Tetapi: he works, she works, it works. Setelah -o, -ch, -sh, -s, -x sering ditambah -es: goes, watches, finishes. Have menjadi has.',
      tr: 'I work, you work, we work, they work. Ama: he works, she works, it works. -o, -ch, -sh, -s, -x sonrasında çoğu zaman -es ekleriz: goes, watches, finishes. Have, has olur.',
      pl: 'I work, you work, we work, they work. Ale: he works, she works, it works. Po -o, -ch, -sh, -s, -x często dodajemy -es: goes, watches, finishes. Have zmienia się w has.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'В обычном утверждении he/she/it требуют -s или -es на действии.',
      'С I/you/we/they действие остается простым.',
      'С he/she/it к действию обычно добавляется -s: works, lives, costs.',
      'После do/does/don\'t/doesn\'t -s не ставится. Это отдельная граница.',
      'После -o, -ch, -sh, -s, -x часто добавляем -es: goes, watches, washes, passes, fixes.',
      'Если слово заканчивается на согласную + y, y меняется на ies: study -> studies.',
      'Have меняется на has с he/she/it: I have, she has.',
    ],
    uk: [
      'У звичайному ствердженні he/she/it потребують -s або -es на дії.',
      'З I/you/we/they дія залишається простою.',
      'З he/she/it до дії зазвичай додається -s: works, lives, costs.',
      'Після do/does/don\'t/doesn\'t -s не ставиться. Це окрема межа.',
      'Після -o, -ch, -sh, -s, -x часто додаємо -es: goes, watches, washes, passes, fixes.',
      'Якщо слово закінчується на приголосну + y, y змінюється на ies: study -> studies.',
      'Have змінюється на has з he/she/it: I have, she has.',
    ],
    es: [
      'En afirmación de Present Simple, he/she/it necesita -s o -es en el verbo.',
      'I/you/we/they usan base verb: I work, they live.',
      'He/she/it usan verb+s: he works, she lives, it costs.',
      'Después de do/does/don\'t/doesn\'t no ponemos -s. Es otro límite.',
      'Después de -o, -ch, -sh, -s, -x muchas veces añadimos -es: goes, watches, washes, passes, fixes.',
      'Si el verbo termina en consonant + y, y cambia a ies: study -> studies.',
      'Have cambia a has con he/she/it: I have, she has.',
    ],
    'pt-BR': [
      'Em afirmações no Present Simple, he/she/it precisa de -s ou -es no verbo.',
      'I/you/we/they usam base verb: I work, they live.',
      'He/she/it usam verb+s: he works, she lives, it costs.',
      "Depois de do/does/don't/doesn't não colocamos -s. É outro limite.",
      'Depois de -o, -ch, -sh, -s, -x muitas vezes adicionamos -es: goes, watches, washes, passes, fixes.',
      'Se o verbo termina em consoante + y, y muda para ies: study -> studies.',
      'Have muda para has com he/she/it: I have, she has.',
    ],
    vi: [
      'Trong câu khẳng định Present Simple, he/she/it cần -s hoặc -es ở động từ.',
      'I/you/we/they dùng base verb: I work, they live.',
      'He/she/it dùng verb+s: he works, she lives, it costs.',
      "Sau do/does/don't/doesn't không thêm -s. Đó là một ranh giới khác.",
      'Sau -o, -ch, -sh, -s, -x thường thêm -es: goes, watches, washes, passes, fixes.',
      'Nếu động từ kết thúc bằng phụ âm + y, y đổi thành ies: study -> studies.',
      'Have đổi thành has với he/she/it: I have, she has.',
    ],
    id: [
      'Dalam afirmasi Present Simple, he/she/it membutuhkan -s atau -es pada verba.',
      'I/you/we/they memakai base verb: I work, they live.',
      'He/she/it memakai verb+s: he works, she lives, it costs.',
      "Setelah do/does/don't/doesn't kita tidak menambahkan -s. Itu batas yang berbeda.",
      'Setelah -o, -ch, -sh, -s, -x sering tambahkan -es: goes, watches, washes, passes, fixes.',
      'Jika verba berakhir dengan consonant + y, y berubah menjadi ies: study -> studies.',
      'Have berubah menjadi has dengan he/she/it: I have, she has.',
    ],
    tr: [
      'Present Simple olumlu cümlede he/she/it fiilde -s veya -es ister.',
      'I/you/we/they base verb kullanır: I work, they live.',
      'He/she/it verb+s kullanır: he works, she lives, it costs.',
      "Do/does/don't/doesn't sonrasında -s koymayız. Bu ayrı bir sınırdır.",
      '-o, -ch, -sh, -s, -x sonrasında çoğu zaman -es ekleriz: goes, watches, washes, passes, fixes.',
      'Fiil consonant + y ile bitiyorsa y, ies olur: study -> studies.',
      'Have, he/she/it ile has olur: I have, she has.',
    ],
    pl: [
      'W twierdzeniu Present Simple he/she/it potrzebuje -s albo -es przy czasowniku.',
      'I/you/we/they używają base verb: I work, they live.',
      'He/she/it używają verb+s: he works, she lives, it costs.',
      "Po do/does/don't/doesn't nie stawiamy -s. To osobna granica.",
      'Po -o, -ch, -sh, -s, -x często dodajemy -es: goes, watches, washes, passes, fixes.',
      'Jeśli czasownik kończy się na consonant + y, y zmienia się w ies: study -> studies.',
      'Have zmienia się w has z he/she/it: I have, she has.',
    ],
  },
  examples: [
    { en: 'She works every day.', ru: 'Она работает каждый день.', uk: 'Вона працює щодня.', es: 'Ella trabaja todos los días.', 'pt-BR': 'Ela trabalha todos os dias.', vi: 'Cô ấy làm việc mỗi ngày.', id: 'Dia bekerja setiap hari.', tr: 'Her gün çalışır.', pl: 'Ona pracuje codziennie.', why: tri('She = he/she/it group. В утверждении нужен works.', 'She = he/she/it group. У ствердженні потрібно works.', 'She = grupo he/she/it. En afirmación necesitamos works.', { 'pt-BR': 'She = grupo he/she/it. Em afirmação precisamos de works.', vi: 'She = nhóm he/she/it. Trong câu khẳng định cần works.', id: 'She = kelompok he/she/it. Dalam afirmasi perlu works.', tr: 'She = he/she/it grubu. Olumlu cümlede works gerekir.', pl: 'She = grupa he/she/it. W twierdzeniu potrzebne jest works.' }) },
    { en: 'He lives in Dublin.', ru: 'Он живет в Дублине.', uk: 'Він живе в Дубліні.', es: 'Él vive en Dublín.', 'pt-BR': 'Ele mora em Dublin.', vi: 'Anh ấy sống ở Dublin.', id: 'Dia tinggal di Dublin.', tr: 'Dublin’de yaşar.', pl: 'On mieszka w Dublinie.', why: tri('He требует -s: live -> lives.', 'He потребує -s: live -> lives.', 'He necesita -s: live -> lives.', { 'pt-BR': 'He precisa de -s: live -> lives.', vi: 'He cần -s: live -> lives.', id: 'He membutuhkan -s: live -> lives.', tr: 'He -s ister: live -> lives.', pl: 'He wymaga -s: live -> lives.' }) },
    { en: 'It costs ten euros.', ru: 'Это стоит десять евро.', uk: 'Це коштує десять євро.', es: 'Cuesta diez euros.', 'pt-BR': 'Isso custa dez euros.', vi: 'Nó có giá mười euro.', id: 'Itu harganya sepuluh euro.', tr: 'On avro tutar.', pl: 'To kosztuje dziesięć euro.', why: tri('It требует -s: costs.', 'It потребує -s: costs.', 'It necesita -s: costs.', { 'pt-BR': 'It precisa de -s: costs.', vi: 'It cần -s: costs.', id: 'It membutuhkan -s: costs.', tr: 'It -s ister: costs.', pl: 'It wymaga -s: costs.' }) },
    { en: 'My brother watches films at night.', ru: 'Мой брат смотрит фильмы ночью.', uk: 'Мій брат дивиться фільми вночі.', es: 'Mi hermano ve películas de noche.', 'pt-BR': 'Meu irmão assiste a filmes à noite.', vi: 'Anh trai tôi xem phim vào ban đêm.', id: 'Saudara laki-laki saya menonton film pada malam hari.', tr: 'Kardeşim geceleri film izler.', pl: 'Mój brat ogląda filmy w nocy.', why: tri('My brother = he. Watch -> watches после -ch.', 'My brother = he. Watch -> watches після -ch.', 'My brother = he. Watch -> watches después de -ch.', { 'pt-BR': 'My brother = he. Watch -> watches depois de -ch.', vi: 'My brother = he. Watch -> watches sau -ch.', id: 'My brother = he. Watch -> watches setelah -ch.', tr: 'My brother = he. -ch sonrasında watch -> watches.', pl: 'My brother = he. Po -ch watch -> watches.' }) },
    { en: 'She studies English.', ru: 'Она учит английский.', uk: 'Вона вчить англійську.', es: 'Ella estudia inglés.', 'pt-BR': 'Ela estuda inglês.', vi: 'Cô ấy học tiếng Anh.', id: 'Dia belajar bahasa Inggris.', tr: 'İngilizce çalışır.', pl: 'Ona uczy się angielskiego.', why: tri('Study заканчивается на consonant + y: studies.', 'Study закінчується на consonant + y: studies.', 'Study termina en consonant + y: studies.', { 'pt-BR': 'Study termina em consoante + y: studies.', vi: 'Study kết thúc bằng phụ âm + y: studies.', id: 'Study berakhir dengan konsonan + y: studies.', tr: 'Study consonant + y ile biter: studies.', pl: 'Study kończy się na consonant + y: studies.' }) },
    { en: 'He has a car.', ru: 'У него есть машина.', uk: 'У нього є машина.', es: 'Él tiene coche.', 'pt-BR': 'Ele tem um carro.', vi: 'Anh ấy có một chiếc xe.', id: 'Dia punya mobil.', tr: 'Onun bir arabası var.', pl: 'On ma samochód.', why: tri('Have с he/she/it становится has.', 'Have з he/she/it стає has.', 'Have con he/she/it cambia a has.', { 'pt-BR': 'Have com he/she/it vira has.', vi: 'Have với he/she/it đổi thành has.', id: 'Have dengan he/she/it menjadi has.', tr: 'Have, he/she/it ile has olur.', pl: 'Have z he/she/it zmienia się w has.' }) },
    { en: 'They work from home.', ru: 'Они работают из дома.', uk: 'Вони працюють з дому.', es: 'Ellos trabajan desde casa.', 'pt-BR': 'Eles trabalham de casa.', vi: 'Họ làm việc tại nhà.', id: 'Mereka bekerja dari rumah.', tr: 'Evden çalışırlar.', pl: 'Oni pracują z domu.', why: tri('They не получает -s. Нужен base verb.', 'They не отримує -s. Потрібен base verb.', 'They no recibe -s. Necesita base verb.', { 'pt-BR': 'They não recebe -s. Precisa de base verb.', vi: 'They không nhận -s. Cần base verb.', id: 'They tidak mendapat -s. Perlu base verb.', tr: 'They -s almaz. Base verb gerekir.', pl: 'They nie dostaje -s. Potrzebny jest base verb.' }) },
    { en: 'Does she work here?', ru: 'Она здесь работает?', uk: 'Вона тут працює?', es: 'Ella trabaja aquí?', 'pt-BR': 'Ela trabalha aqui?', vi: 'Cô ấy có làm việc ở đây không?', id: 'Apakah dia bekerja di sini?', tr: 'Burada çalışıyor mu?', pl: 'Czy ona tu pracuje?', why: tri('После does основной глагол без -s. Это граница с утверждением She works.', 'Після does основне дієслово без -s. Це межа зі ствердженням She works.', 'Después de does el verbo va sin -s. Es el límite con She works.', { 'pt-BR': 'Depois de does, o verbo principal vai sem -s. É o limite com She works.', vi: 'Sau does, động từ chính không có -s. Đây là ranh giới với She works.', id: 'Setelah does, verba utama tanpa -s. Ini batas dengan She works.', tr: 'Does sonrasında ana fiil -s almaz. She works ile sınır buradadır.', pl: 'Po does główny czasownik idzie bez -s. To granica z She works.' }) },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты забываешь маленькую -s после he, she, it.', 'Схоже, ти забуваєш маленьку -s після he, she, it.', 'Parece que olvidas la pequeña -s después de he, she, it.', { 'pt-BR': 'Parece que você esquece o pequeno -s depois de he, she, it.', vi: 'Có vẻ bạn quên đuôi -s nhỏ sau he, she, it.', id: 'Sepertinya kamu lupa -s kecil setelah he, she, it.', tr: 'He, she, it sonrasında küçük -s ekini unutuyor gibisin.', pl: 'Wygląda na to, że zapominasz małe -s po he, she, it.' }) },
    { id: 'intro_rule', type: 'rule', text: tri('Обычное утверждение + he/she/it = добавь к действию -s или -es.', 'Звичайне ствердження + he/she/it = додай до дії -s або -es.', 'Present Simple + afirmación + he/she/it = añade -s o -es.', { 'pt-BR': 'Present Simple + afirmação + he/she/it = adicione -s ou -es.', vi: 'Present Simple + câu khẳng định + he/she/it = thêm -s hoặc -es.', id: 'Present Simple + afirmasi + he/she/it = tambahkan -s atau -es.', tr: 'Present Simple + olumlu cümle + he/she/it = -s veya -es ekle.', pl: 'Present Simple + twierdzenie + he/she/it = dodaj -s albo -es.' }) },
    { id: 'intro_warning', type: 'warning', text: tri('Но не ставь -s после does: She works, но Does she work?', 'Але не став -s після does: She works, але Does she work?', 'Pero no pongas -s después de does: She works, pero Does she work?', { 'pt-BR': 'Mas não coloque -s depois de does: She works, mas Does she work?', vi: 'Nhưng đừng thêm -s sau does: She works, nhưng Does she work?', id: 'Tetapi jangan pakai -s setelah does: She works, tetapi Does she work?', tr: 'Ama does sonrasında -s koyma: She works, ama Does she work?', pl: 'Ale nie stawiaj -s po does: She works, ale Does she work?' }) },
  ],
  steps: [
    thirdStep({ id: 'third_s_easy_001', order: 1, difficulty: 'easy', targetSkill: 'basic_third_person_s', sentence: 'She ___ every day.', translation: tri('Она работает каждый день.', 'Вона працює щодня.', 'Ella trabaja todos los días.', { 'pt-BR': 'Ela trabalha todos os dias.', vi: 'Cô ấy làm việc mỗi ngày.', id: 'Dia bekerja setiap hari.', tr: 'Her gün çalışır.', pl: 'Ona pracuje codziennie.' }), options: ['work', 'works', 'working', 'does work'], correctAnswer: 'works', correctFeedback: tri('Да. She в утверждении требует -s: works.', 'Так. She у ствердженні потребує -s: works.', 'Sí. She en afirmación necesita -s: works.', { 'pt-BR': 'Sim. She em afirmação precisa de -s: works.', vi: 'Đúng. She trong câu khẳng định cần -s: works.', id: 'Ya. She dalam afirmasi perlu -s: works.', tr: 'Evet. Olumlu cümlede she -s ister: works.', pl: 'Tak. She w twierdzeniu potrzebuje -s: works.' }), wrong: { work: tri('Work подходит для I/you/we/they. Здесь she, поэтому works.', 'Work підходить для I/you/we/they. Тут she, тому works.', 'Work va con I/you/we/they. Aquí hay she, por eso works.', { 'pt-BR': 'Work serve para I/you/we/they. Aqui é she, por isso works.', vi: 'Work hợp với I/you/we/they. Ở đây là she, nên works.', id: 'Work cocok untuk I/you/we/they. Di sini she, jadi works.', tr: 'Work, I/you/we/they ile olur. Burada she var, bu yüzden works.', pl: 'Work pasuje do I/you/we/they. Tutaj jest she, więc works.' }), working: tri('Форма с -ing нужна вместе с be. Здесь обычное действие, поэтому нужен вариант с -s.', 'Форма з -ing потрібна разом з be. Тут звичайна дія, тому потрібен варіант з -s.', 'Working necesita be: She is working. Aquí es Present Simple: works.', { 'pt-BR': 'Working precisa de be: She is working. Aqui é Present Simple: works.', vi: 'Working cần be: She is working. Ở đây là Present Simple: works.', id: 'Working perlu be: She is working. Di sini Present Simple: works.', tr: 'Working be ister: She is working. Burada Present Simple: works.', pl: 'Working potrzebuje be: She is working. Tutaj jest Present Simple: works.' }), 'does work': tri('Does work возможно для усиления, но обычное утверждение: She works.', 'Does work можливе для підсилення, але звичайне ствердження: She works.', 'Does work puede ser énfasis, pero la afirmación normal es She works.', { 'pt-BR': 'Does work pode ser ênfase, mas a afirmação normal é She works.', vi: 'Does work có thể dùng để nhấn mạnh, nhưng câu khẳng định thường là She works.', id: 'Does work bisa untuk penekanan, tetapi afirmasi normalnya She works.', tr: 'Does work vurgu olabilir, ama normal olumlu cümle She works.', pl: 'Does work może być emfatyczne, ale zwykłe twierdzenie to She works.' }) }, retry: [tri('She = нужен -s.', 'She = потрібен -s.', 'She = necesita -s.', { 'pt-BR': 'She = precisa de -s.', vi: 'She = cần -s.', id: 'She = perlu -s.', tr: 'She = -s gerekir.', pl: 'She = potrzebuje -s.' }), tri('I work, но she works.', 'I work, але she works.', 'I work, pero she works.', { 'pt-BR': 'I work, mas she works.', vi: 'I work, nhưng she works.', id: 'I work, tetapi she works.', tr: 'I work, ama she works.', pl: 'I work, ale she works.' }), tri('Подсказка: She works.', 'Підказка: She works.', 'Pista: She works.', { 'pt-BR': 'Dica: She works.', vi: 'Gợi ý: She works.', id: 'Petunjuk: She works.', tr: 'İpucu: She works.', pl: 'Podpowiedź: She works.' })], focusWords: ['she', 'works'] }),
    thirdStep({ id: 'third_s_easy_002', order: 2, difficulty: 'easy', targetSkill: 'basic_third_person_s', sentence: 'He ___ near the station.', translation: tri('Он живет возле станции.', 'Він живе біля станції.', 'Él vive cerca de la estación.', { 'pt-BR': 'Ele mora perto da estação.', vi: 'Anh ấy sống gần nhà ga.', id: 'Dia tinggal dekat stasiun.', tr: 'İstasyonun yakınında yaşar.', pl: 'On mieszka blisko stacji.' }), options: ['live', 'lives', 'living', 'is live'], correctAnswer: 'lives', correctFeedback: tri('Да. He требует -s: lives.', 'Так. He потребує -s: lives.', 'Sí. He necesita -s: lives.', { 'pt-BR': 'Sim. He precisa de -s: lives.', vi: 'Đúng. He cần -s: lives.', id: 'Ya. He perlu -s: lives.', tr: 'Evet. He -s ister: lives.', pl: 'Tak. He potrzebuje -s: lives.' }), wrong: { live: tri('Live подходит для I/you/we/they. С he нужно lives.', 'Live підходить для I/you/we/they. З he потрібно lives.', 'Live va con I/you/we/they. Con he necesitamos lives.', { 'pt-BR': 'Live serve para I/you/we/they. Com he precisamos de lives.', vi: 'Live hợp với I/you/we/they. Với he cần lives.', id: 'Live cocok untuk I/you/we/they. Dengan he perlu lives.', tr: 'Live, I/you/we/they ile olur. He ile lives gerekir.', pl: 'Live pasuje do I/you/we/they. Z he potrzebne jest lives.' }), living: tri('Living требует is. Здесь обычное утверждение: He lives.', 'Living потребує is. Тут звичайне ствердження: He lives.', 'Living necesita is. Aquí es afirmación normal: He lives.', { 'pt-BR': 'Living precisa de is. Aqui é afirmação normal: He lives.', vi: 'Living cần is. Ở đây là câu khẳng định thường: He lives.', id: 'Living perlu is. Di sini afirmasi normal: He lives.', tr: 'Living is ister. Burada normal olumlu cümle: He lives.', pl: 'Living potrzebuje is. Tutaj jest zwykłe twierdzenie: He lives.' }), 'is live': tri('Is live неправильно. С be было бы is living, но здесь lives.', 'Is live неправильно. З be було б is living, але тут lives.', 'Is live es incorrecto. Con be sería is living, pero aquí lives.', { 'pt-BR': 'Is live está incorreto. Com be seria is living, mas aqui é lives.', vi: 'Is live là sai. Với be sẽ là is living, nhưng ở đây là lives.', id: 'Is live salah. Dengan be menjadi is living, tetapi di sini lives.', tr: 'Is live yanlıştır. Be ile is living olurdu, ama burada lives gerekir.', pl: 'Is live jest niepoprawne. Z be byłoby is living, ale tutaj jest lives.' }) }, retry: [tri('He = lives, не live.', 'He = lives, не live.', 'He = lives, no live.', { 'pt-BR': 'He = lives, não live.', vi: 'He = lives, không phải live.', id: 'He = lives, bukan live.', tr: 'He = lives, live değil.', pl: 'He = lives, nie live.' }), tri('He lives.', 'He lives.', 'He lives.', { 'pt-BR': 'He lives.', vi: 'He lives.', id: 'He lives.', tr: 'He lives.', pl: 'He lives.' }), tri('Подсказка: He lives near the station.', 'Підказка: He lives near the station.', 'Pista: He lives near the station.', { 'pt-BR': 'Dica: He lives near the station.', vi: 'Gợi ý: He lives near the station.', id: 'Petunjuk: He lives near the station.', tr: 'İpucu: He lives near the station.', pl: 'Podpowiedź: He lives near the station.' })], focusWords: ['he', 'lives'] }),
    thirdStep({ id: 'third_s_easy_003', order: 3, difficulty: 'easy', targetSkill: 'basic_third_person_s', sentence: 'It ___ too much.', translation: tri('Это стоит слишком дорого.', 'Це коштує занадто дорого.', 'Cuesta demasiado.', { 'pt-BR': 'Custa demais.', vi: 'Nó có giá quá cao.', id: 'Itu terlalu mahal.', tr: 'Çok pahalıya mal olur.', pl: 'To kosztuje za dużo.' }), options: ['cost', 'costs', 'costing', 'does cost'], correctAnswer: 'costs', correctFeedback: tri('Да. It требует -s: costs.', 'Так. It потребує -s: costs.', 'Sí. It necesita -s: costs.', { 'pt-BR': 'Sim. It precisa de -s: costs.', vi: 'Đúng. It cần -s: costs.', id: 'Ya. It perlu -s: costs.', tr: 'Evet. It -s ister: costs.', pl: 'Tak. It potrzebuje -s: costs.' }), wrong: { cost: tri('Cost без -s подходит после does или с they/we/you/I. Здесь it в утверждении, поэтому costs.', 'Cost без -s підходить після does або з they/we/you/I. Тут it у ствердженні, тому costs.', 'Cost sin -s va después de does o con they/we/you/I. Aquí it está en afirmación, por eso costs.', { 'pt-BR': 'Cost sem -s serve depois de does ou com they/we/you/I. Aqui it está em afirmação, por isso costs.', vi: 'Cost không có -s dùng sau does hoặc với they/we/you/I. Ở đây it trong câu khẳng định, nên costs.', id: 'Cost tanpa -s cocok setelah does atau dengan they/we/you/I. Di sini it dalam afirmasi, jadi costs.', tr: 'Cost -s olmadan does sonrasında veya they/we/you/I ile olur. Burada it olumlu cümlede, bu yüzden costs.', pl: 'Cost bez -s pasuje po does albo z they/we/you/I. Tutaj it jest w twierdzeniu, więc costs.' }), costing: tri('Costing нужен в другой структуре: It is costing. Здесь It costs.', 'Costing потрібен в іншій структурі: It is costing. Тут It costs.', 'Costing necesita otra estructura: It is costing. Aquí It costs.', { 'pt-BR': 'Costing precisa de outra estrutura: It is costing. Aqui é It costs.', vi: 'Costing cần cấu trúc khác: It is costing. Ở đây là It costs.', id: 'Costing perlu struktur lain: It is costing. Di sini It costs.', tr: 'Costing başka yapı ister: It is costing. Burada It costs.', pl: 'Costing potrzebuje innej struktury: It is costing. Tutaj jest It costs.' }), 'does cost': tri('Does cost возможно для усиления, но обычный вариант: It costs.', 'Does cost можливе для підсилення, але звичайний варіант: It costs.', 'Does cost puede ser énfasis, pero la opción normal es It costs.', { 'pt-BR': 'Does cost pode ser ênfase, mas a opção normal é It costs.', vi: 'Does cost có thể dùng để nhấn mạnh, nhưng dạng thường là It costs.', id: 'Does cost bisa untuk penekanan, tetapi pilihan normalnya It costs.', tr: 'Does cost vurgu olabilir, ama normal seçenek It costs.', pl: 'Does cost może być emfatyczne, ale zwykła opcja to It costs.' }) }, retry: [tri('It = добавь -s.', 'It = додай -s.', 'It = añade -s.', { 'pt-BR': 'It = adicione -s.', vi: 'It = thêm -s.', id: 'It = tambahkan -s.', tr: 'It = -s ekle.', pl: 'It = dodaj -s.' }), tri('Cost -> costs.', 'Cost -> costs.', 'Cost -> costs.', { 'pt-BR': 'Cost -> costs.', vi: 'Cost -> costs.', id: 'Cost -> costs.', tr: 'Cost -> costs.', pl: 'Cost -> costs.' }), tri('Подсказка: It costs too much.', 'Підказка: It costs too much.', 'Pista: It costs too much.', { 'pt-BR': 'Dica: It costs too much.', vi: 'Gợi ý: It costs too much.', id: 'Petunjuk: It costs too much.', tr: 'İpucu: It costs too much.', pl: 'Podpowiedź: It costs too much.' })], focusWords: ['it', 'costs'] }),
    thirdStep({ id: 'third_s_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'plural_subject_base', sentence: 'They ___ from home.', translation: tri('Они работают из дома.', 'Вони працюють з дому.', 'Ellos trabajan desde casa.', { 'pt-BR': 'Eles trabalham de casa.', vi: 'Họ làm việc tại nhà.', id: 'Mereka bekerja dari rumah.', tr: 'Evden çalışırlar.', pl: 'Oni pracują z domu.' }), options: ['work', 'works', 'working', 'does work'], correctAnswer: 'work', correctFeedback: tri('Да. They не получает -s: work.', 'Так. They не отримує -s: work.', 'Sí. They no recibe -s: work.', { 'pt-BR': 'Sim. They não recebe -s: work.', vi: 'Đúng. They không nhận -s: work.', id: 'Ya. They tidak mendapat -s: work.', tr: 'Evet. They -s almaz: work.', pl: 'Tak. They nie dostaje -s: work.' }), wrong: { works: tri('Works нужен с he/she/it. They = plural, поэтому work.', 'Works потрібен з he/she/it. They = plural, тому work.', 'Works va con he/she/it. They = plural, por eso work.', { 'pt-BR': 'Works é para he/she/it. They = plural, por isso work.', vi: 'Works dùng với he/she/it. They = số nhiều, nên work.', id: 'Works untuk he/she/it. They = jamak, jadi work.', tr: 'Works he/she/it ile kullanılır. They = çoğul, bu yüzden work.', pl: 'Works jest dla he/she/it. They = liczba mnoga, więc work.' }), working: tri('Форма с -ing требует are. Здесь обычное утверждение про they, поэтому действие остается простым.', 'Форма з -ing потребує are. Тут звичайне ствердження про they, тому дія залишається простою.', 'Working necesita are: They are working. Aquí They work.', { 'pt-BR': 'Working precisa de are: They are working. Aqui é They work.', vi: 'Working cần are: They are working. Ở đây là They work.', id: 'Working perlu are: They are working. Di sini They work.', tr: 'Working are ister: They are working. Burada They work.', pl: 'Working potrzebuje are: They are working. Tutaj jest They work.' }), 'does work': tri('Does используется с he/she/it. С they обычное утверждение: They work.', 'Does використовується з he/she/it. З they звичайне ствердження: They work.', 'Does se usa con he/she/it. Con they la afirmación normal es They work.', { 'pt-BR': 'Does é usado com he/she/it. Com they, a afirmação normal é They work.', vi: 'Does dùng với he/she/it. Với they, câu khẳng định thường là They work.', id: 'Does dipakai dengan he/she/it. Dengan they, afirmasi normalnya They work.', tr: 'Does he/she/it ile kullanılır. They ile normal olumlu cümle They work.', pl: 'Does używamy z he/she/it. Z they zwykłe twierdzenie to They work.' }) }, retry: [tri('They = без -s.', 'They = без -s.', 'They = sin -s.', { 'pt-BR': 'They = sem -s.', vi: 'They = không có -s.', id: 'They = tanpa -s.', tr: 'They = -s yok.', pl: 'They = bez -s.' }), tri('They work.', 'They work.', 'They work.', { 'pt-BR': 'They work.', vi: 'They work.', id: 'They work.', tr: 'They work.', pl: 'They work.' }), tri('Подсказка: They work from home.', 'Підказка: They work from home.', 'Pista: They work from home.', { 'pt-BR': 'Dica: They work from home.', vi: 'Gợi ý: They work from home.', id: 'Petunjuk: They work from home.', tr: 'İpucu: They work from home.', pl: 'Podpowiedź: They work from home.' })], focusWords: ['they', 'work'] }),
    thirdStep({ id: 'third_s_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'third_person_s_vs_plural', sentence: 'My sister ___ in a hospital.', translation: tri('Моя сестра работает в больнице.', 'Моя сестра працює в лікарні.', 'Mi hermana trabaja en un hospital.', { 'pt-BR': 'Minha irmã trabalha em um hospital.', vi: 'Chị gái tôi làm việc trong bệnh viện.', id: 'Saudara perempuan saya bekerja di rumah sakit.', tr: 'Kız kardeşim hastanede çalışır.', pl: 'Moja siostra pracuje w szpitalu.' }), options: ['work', 'works', 'working', 'do work'], correctAnswer: 'works', correctFeedback: tri('Да. My sister = she. Нужен works.', 'Так. My sister = she. Потрібно works.', 'Sí. My sister = she. Necesitamos works.', { 'pt-BR': 'Sim. My sister = she. Precisamos de works.', vi: 'Đúng. My sister = she. Cần works.', id: 'Ya. My sister = she. Perlu works.', tr: 'Evet. My sister = she. Works gerekir.', pl: 'Tak. My sister = she. Potrzebne jest works.' }), wrong: { work: tri('My sister = she. В утверждении нужен works, не work.', 'My sister = she. У ствердженні потрібно works, не work.', 'My sister = she. En afirmación necesitamos works, no work.', { 'pt-BR': 'My sister = she. Em afirmação precisamos de works, não work.', vi: 'My sister = she. Trong câu khẳng định cần works, không phải work.', id: 'My sister = she. Dalam afirmasi perlu works, bukan work.', tr: 'My sister = she. Olumlu cümlede works gerekir, work değil.', pl: 'My sister = she. W twierdzeniu potrzebne jest works, nie work.' }), working: tri('Working требует is. Здесь My sister works.', 'Working потребує is. Тут My sister works.', 'Working necesita is. Aquí My sister works.', { 'pt-BR': 'Working precisa de is. Aqui é My sister works.', vi: 'Working cần is. Ở đây là My sister works.', id: 'Working perlu is. Di sini My sister works.', tr: 'Working is ister. Burada My sister works.', pl: 'Working potrzebuje is. Tutaj jest My sister works.' }), 'do work': tri('Do work не подходит для обычного утверждения с my sister. Нужно works.', 'Do work не підходить для звичайного ствердження з my sister. Потрібно works.', 'Do work no encaja con my sister en afirmación normal. Necesitamos works.', { 'pt-BR': 'Do work não combina com my sister em afirmação normal. Precisamos de works.', vi: 'Do work không hợp với my sister trong câu khẳng định thường. Cần works.', id: 'Do work tidak cocok dengan my sister dalam afirmasi normal. Perlu works.', tr: 'Do work my sister ile normal olumlu cümlede uymaz. Works gerekir.', pl: 'Do work nie pasuje do my sister w zwykłym twierdzeniu. Potrzebne jest works.' }) }, retry: [tri('My sister = she.', 'My sister = she.', 'My sister = she.', { 'pt-BR': 'My sister = she.', vi: 'My sister = she.', id: 'My sister = she.', tr: 'My sister = she.', pl: 'My sister = she.' }), tri('Sister -> she -> works.', 'Sister -> she -> works.', 'Sister -> she -> works.', { 'pt-BR': 'Sister -> she -> works.', vi: 'Sister -> she -> works.', id: 'Sister -> she -> works.', tr: 'Sister -> she -> works.', pl: 'Sister -> she -> works.' }), tri('Подсказка: My sister works.', 'Підказка: My sister works.', 'Pista: My sister works.', { 'pt-BR': 'Dica: My sister works.', vi: 'Gợi ý: My sister works.', id: 'Petunjuk: My sister works.', tr: 'İpucu: My sister works.', pl: 'Podpowiedź: My sister works.' })], focusWords: ['sister', 'works'] }),
    thirdStep({ id: 'third_s_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'plural_subject_base', sentence: 'My friends ___ English well.', translation: tri('Мои друзья хорошо говорят по-английски.', 'Мої друзі добре говорять англійською.', 'Mis amigos hablan bien inglés.', { 'pt-BR': 'Meus amigos falam inglês bem.', vi: 'Bạn bè tôi nói tiếng Anh tốt.', id: 'Teman-teman saya berbicara bahasa Inggris dengan baik.', tr: 'Arkadaşlarım iyi İngilizce konuşur.', pl: 'Moi znajomi dobrze mówią po angielsku.' }), options: ['speak', 'speaks', 'speaking', 'does speak'], correctAnswer: 'speak', correctFeedback: tri('Да. My friends = they. Нужен speak.', 'Так. My friends = they. Потрібно speak.', 'Sí. My friends = they. Necesitamos speak.', { 'pt-BR': 'Sim. My friends = they. Precisamos de speak.', vi: 'Đúng. My friends = they. Cần speak.', id: 'Ya. My friends = they. Perlu speak.', tr: 'Evet. My friends = they. Speak gerekir.', pl: 'Tak. My friends = they. Potrzebne jest speak.' }), wrong: { speaks: tri('Speaks нужен с he/she/it. Но friends — это несколько людей, поэтому действие остается простым.', 'Speaks потрібен з he/she/it. Але friends — це кілька людей, тому дія залишається простою.', 'Speaks va con he/she/it. My friends es plural, por eso speak.', { 'pt-BR': 'Speaks é para he/she/it. My friends é plural, por isso speak.', vi: 'Speaks dùng với he/she/it. My friends là số nhiều, nên speak.', id: 'Speaks untuk he/she/it. My friends jamak, jadi speak.', tr: 'Speaks he/she/it ile kullanılır. My friends çoğuldur, bu yüzden speak.', pl: 'Speaks jest dla he/she/it. My friends to liczba mnoga, więc speak.' }), speaking: tri('Speaking требует are. Здесь общий факт: speak.', 'Speaking потребує are. Тут загальний факт: speak.', 'Speaking necesita are. Aquí es hecho general: speak.', { 'pt-BR': 'Speaking precisa de are. Aqui é um fato geral: speak.', vi: 'Speaking cần are. Ở đây là sự thật chung: speak.', id: 'Speaking perlu are. Di sini fakta umum: speak.', tr: 'Speaking are ister. Burada genel gerçek: speak.', pl: 'Speaking potrzebuje are. Tutaj jest ogólny fakt: speak.' }), 'does speak': tri('Does не используется с my friends. Нужен speak.', 'Does не використовується з my friends. Потрібно speak.', 'Does no se usa con my friends. Necesitamos speak.', { 'pt-BR': 'Does não é usado com my friends. Precisamos de speak.', vi: 'Does không dùng với my friends. Cần speak.', id: 'Does tidak dipakai dengan my friends. Perlu speak.', tr: 'Does my friends ile kullanılmaz. Speak gerekir.', pl: 'Does nie używa się z my friends. Potrzebne jest speak.' }) }, retry: [tri('Friends = they.', 'Friends = they.', 'Friends = they.', { 'pt-BR': 'Friends = they.', vi: 'Friends = they.', id: 'Friends = they.', tr: 'Friends = they.', pl: 'Friends = they.' }), tri('Несколько людей = без -s.', 'Кілька людей = без -s.', 'Plural subject = sin -s.', { 'pt-BR': 'Sujeito plural = sem -s.', vi: 'Chủ ngữ số nhiều = không có -s.', id: 'Subjek jamak = tanpa -s.', tr: 'Çoğul özne = -s yok.', pl: 'Podmiot w liczbie mnogiej = bez -s.' }), tri('Подсказка: My friends speak English.', 'Підказка: My friends speak English.', 'Pista: My friends speak English.', { 'pt-BR': 'Dica: My friends speak English.', vi: 'Gợi ý: My friends speak English.', id: 'Petunjuk: My friends speak English.', tr: 'İpucu: My friends speak English.', pl: 'Podpowiedź: My friends speak English.' })], focusWords: ['friends', 'speak'] }),
    thirdStep({ id: 'third_s_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'es_ending', sentence: 'He ___ to the gym every morning.', translation: tri('Он ходит в спортзал каждое утро.', 'Він ходить у спортзал щоранку.', 'Él va al gimnasio cada mañana.', { 'pt-BR': 'Ele vai à academia toda manhã.', vi: 'Anh ấy đi đến phòng gym mỗi sáng.', id: 'Dia pergi ke gym setiap pagi.', tr: 'Her sabah spor salonuna gider.', pl: 'On chodzi na siłownię każdego ranka.' }), options: ['go', 'goes', 'gos', 'going'], correctAnswer: 'goes', correctFeedback: tri('Да. Go с he становится goes.', 'Так. Go з he стає goes.', 'Sí. Go con he se vuelve goes.', { 'pt-BR': 'Sim. Go com he vira goes.', vi: 'Đúng. Go với he thành goes.', id: 'Ya. Go dengan he menjadi goes.', tr: 'Evet. Go, he ile goes olur.', pl: 'Tak. Go z he zmienia się w goes.' }), wrong: { go: tri('Go подходит для I/you/we/they. С he нужно goes.', 'Go підходить для I/you/we/they. З he потрібно goes.', 'Go va con I/you/we/they. Con he necesitamos goes.', { 'pt-BR': 'Go serve para I/you/we/they. Com he precisamos de goes.', vi: 'Go hợp với I/you/we/they. Với he cần goes.', id: 'Go cocok untuk I/you/we/they. Dengan he perlu goes.', tr: 'Go, I/you/we/they ile olur. He ile goes gerekir.', pl: 'Go pasuje do I/you/we/they. Z he potrzebne jest goes.' }), gos: tri('Gos неправильная форма. У go форма third person singular - goes.', 'Gos неправильна форма. У go форма third person singular - goes.', 'Gos es incorrecto. La forma third person singular de go es goes.', { 'pt-BR': 'Gos está incorreto. A forma third person singular de go é goes.', vi: 'Gos là dạng sai. Dạng third person singular của go là goes.', id: 'Gos salah. Bentuk third person singular dari go adalah goes.', tr: 'Gos yanlıştır. Go fiilinin third person singular biçimi goes.', pl: 'Gos jest niepoprawne. Forma third person singular od go to goes.' }), going: tri('Going требует is. Здесь привычка every morning: goes.', 'Going потребує is. Тут звичка every morning: goes.', 'Going necesita is. Aquí es hábito every morning: goes.', { 'pt-BR': 'Going precisa de is. Aqui é hábito com every morning: goes.', vi: 'Going cần is. Ở đây là thói quen với every morning: goes.', id: 'Going perlu is. Di sini kebiasaan dengan every morning: goes.', tr: 'Going is ister. Burada every morning ile alışkanlık var: goes.', pl: 'Going potrzebuje is. Tutaj jest nawyk z every morning: goes.' }) }, retry: [tri('Go + he = goes.', 'Go + he = goes.', 'Go + he = goes.', { 'pt-BR': 'Go + he = goes.', vi: 'Go + he = goes.', id: 'Go + he = goes.', tr: 'Go + he = goes.', pl: 'Go + he = goes.' }), tri('После -o часто -es.', 'Після -o часто -es.', 'Después de -o muchas veces -es.', { 'pt-BR': 'Depois de -o, muitas vezes vem -es.', vi: 'Sau -o thường thêm -es.', id: 'Setelah -o sering ditambah -es.', tr: '-o sonrasında çoğu zaman -es gelir.', pl: 'Po -o często dodajemy -es.' }), tri('Подсказка: He goes to the gym.', 'Підказка: He goes to the gym.', 'Pista: He goes to the gym.', { 'pt-BR': 'Dica: He goes to the gym.', vi: 'Gợi ý: He goes to the gym.', id: 'Petunjuk: He goes to the gym.', tr: 'İpucu: He goes to the gym.', pl: 'Podpowiedź: He goes to the gym.' })], focusWords: ['he', 'goes'] }),
    thirdStep({ id: 'third_s_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'es_ending', sentence: 'She ___ TV after work.', translation: tri('Она смотрит телевизор после работы.', 'Вона дивиться телевізор після роботи.', 'Ella ve la tele después del trabajo.', { 'pt-BR': 'Ela assiste TV depois do trabalho.', vi: 'Cô ấy xem TV sau giờ làm.', id: 'Dia menonton TV setelah bekerja.', tr: 'İşten sonra televizyon izler.', pl: 'Ona ogląda telewizję po pracy.' }), options: ['watch', 'watchs', 'watches', 'watching'], correctAnswer: 'watches', correctFeedback: tri('Да. Watch заканчивается на -ch, поэтому watches.', 'Так. Watch закінчується на -ch, тому watches.', 'Sí. Watch termina en -ch, por eso watches.', { 'pt-BR': 'Sim. Watch termina em -ch, por isso watches.', vi: 'Đúng. Watch kết thúc bằng -ch, nên watches.', id: 'Ya. Watch berakhir dengan -ch, jadi watches.', tr: 'Evet. Watch -ch ile biter, bu yüzden watches.', pl: 'Tak. Watch kończy się na -ch, dlatego watches.' }), wrong: { watch: tri('Watch без окончания подходит для I/you/we/they. С she нужно watches.', 'Watch без закінчення підходить для I/you/we/they. З she потрібно watches.', 'Watch sin terminación va con I/you/we/they. Con she necesitamos watches.', { 'pt-BR': 'Watch sem terminação serve para I/you/we/they. Com she precisamos de watches.', vi: 'Watch không có đuôi hợp với I/you/we/they. Với she cần watches.', id: 'Watch tanpa akhiran cocok untuk I/you/we/they. Dengan she perlu watches.', tr: 'Watch eksiz olarak I/you/we/they ile olur. She ile watches gerekir.', pl: 'Watch bez końcówki pasuje do I/you/we/they. Z she potrzebne jest watches.' }), watchs: tri('Watchs неправильно. После -ch добавляем -es: watches.', 'Watchs неправильно. Після -ch додаємо -es: watches.', 'Watchs es incorrecto. Después de -ch añadimos -es: watches.', { 'pt-BR': 'Watchs está incorreto. Depois de -ch adicionamos -es: watches.', vi: 'Watchs là sai. Sau -ch thêm -es: watches.', id: 'Watchs salah. Setelah -ch tambahkan -es: watches.', tr: 'Watchs yanlıştır. -ch sonrasında -es ekleriz: watches.', pl: 'Watchs jest niepoprawne. Po -ch dodajemy -es: watches.' }), watching: tri('Watching требует is. Здесь привычное действие: watches.', 'Watching потребує is. Тут звична дія: watches.', 'Watching necesita is. Aquí es acción habitual: watches.', { 'pt-BR': 'Watching precisa de is. Aqui é ação habitual: watches.', vi: 'Watching cần is. Ở đây là hành động thường lệ: watches.', id: 'Watching perlu is. Di sini tindakan kebiasaan: watches.', tr: 'Watching is ister. Burada alışkanlık eylemi var: watches.', pl: 'Watching potrzebuje is. Tutaj jest czynność zwyczajowa: watches.' }) }, retry: [tri('Watch + she = watches.', 'Watch + she = watches.', 'Watch + she = watches.', { 'pt-BR': 'Watch + she = watches.', vi: 'Watch + she = watches.', id: 'Watch + she = watches.', tr: 'Watch + she = watches.', pl: 'Watch + she = watches.' }), tri('После -ch: -es.', 'Після -ch: -es.', 'Después de -ch: -es.', { 'pt-BR': 'Depois de -ch: -es.', vi: 'Sau -ch: -es.', id: 'Setelah -ch: -es.', tr: '-ch sonrasında: -es.', pl: 'Po -ch: -es.' }), tri('Подсказка: She watches TV.', 'Підказка: She watches TV.', 'Pista: She watches TV.', { 'pt-BR': 'Dica: She watches TV.', vi: 'Gợi ý: She watches TV.', id: 'Petunjuk: She watches TV.', tr: 'İpucu: She watches TV.', pl: 'Podpowiedź: She watches TV.' })], focusWords: ['she', 'watches'] }),
    thirdStep({ id: 'third_s_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'ies_ending', sentence: 'My daughter ___ English at school.', translation: tri('Моя дочь учит английский в школе.', 'Моя донька вчить англійську в школі.', 'Mi hija estudia inglés en la escuela.', { 'pt-BR': 'Minha filha estuda inglês na escola.', vi: 'Con gái tôi học tiếng Anh ở trường.', id: 'Putri saya belajar bahasa Inggris di sekolah.', tr: 'Kızım okulda İngilizce çalışır.', pl: 'Moja córka uczy się angielskiego w szkole.' }), options: ['study', 'studys', 'studies', 'studying'], correctAnswer: 'studies', correctFeedback: tri('Да. Daughter = she. Study -> studies.', 'Так. Daughter = she. Study -> studies.', 'Sí. Daughter = she. Study -> studies.', { 'pt-BR': 'Sim. Daughter = she. Study -> studies.', vi: 'Đúng. Daughter = she. Study -> studies.', id: 'Ya. Daughter = she. Study -> studies.', tr: 'Evet. Daughter = she. Study -> studies.', pl: 'Tak. Daughter = she. Study -> studies.' }), wrong: { study: tri('Study подходит для I/you/we/they. Daughter = she, поэтому studies.', 'Study підходить для I/you/we/they. Daughter = she, тому studies.', 'Study va con I/you/we/they. Daughter = she, por eso studies.', { 'pt-BR': 'Study serve para I/you/we/they. Daughter = she, por isso studies.', vi: 'Study hợp với I/you/we/they. Daughter = she, nên studies.', id: 'Study cocok untuk I/you/we/they. Daughter = she, jadi studies.', tr: 'Study, I/you/we/they ile olur. Daughter = she, bu yüzden studies.', pl: 'Study pasuje do I/you/we/they. Daughter = she, więc studies.' }), studys: tri('Studys неправильно. После согласной и y хвост меняется на ies: studies.', 'Studys неправильно. Після приголосної та y хвіст змінюється на ies: studies.', 'Studys es incorrecto. Consonant + y cambia a ies: studies.', { 'pt-BR': 'Studys está incorreto. Depois de consoante + y, a cauda muda para ies: studies.', vi: 'Studys là sai. Sau phụ âm + y, đuôi đổi thành ies: studies.', id: 'Studys salah. Setelah konsonan + y, ekor berubah menjadi ies: studies.', tr: 'Studys yanlıştır. Consonant + y sonrasında ek ies olur: studies.', pl: 'Studys jest niepoprawne. Po consonant + y końcówka zmienia się w ies: studies.' }), studying: tri('Форма с -ing требует is. Здесь обычное утверждение, поэтому нужен вариант studies.', 'Форма з -ing потребує is. Тут звичайне ствердження, тому потрібен варіант studies.', 'Studying necesita is. Aquí es Present Simple: studies.', { 'pt-BR': 'Studying precisa de is. Aqui é Present Simple: studies.', vi: 'Studying cần is. Ở đây là Present Simple: studies.', id: 'Studying perlu is. Di sini Present Simple: studies.', tr: 'Studying is ister. Burada Present Simple: studies.', pl: 'Studying potrzebuje is. Tutaj jest Present Simple: studies.' }) }, retry: [tri('Daughter = she.', 'Daughter = she.', 'Daughter = she.', { 'pt-BR': 'Daughter = she.', vi: 'Daughter = she.', id: 'Daughter = she.', tr: 'Daughter = she.', pl: 'Daughter = she.' }), tri('Study -> studies.', 'Study -> studies.', 'Study -> studies.', { 'pt-BR': 'Study -> studies.', vi: 'Study -> studies.', id: 'Study -> studies.', tr: 'Study -> studies.', pl: 'Study -> studies.' }), tri('Подсказка: My daughter studies English.', 'Підказка: My daughter studies English.', 'Pista: My daughter studies English.', { 'pt-BR': 'Dica: My daughter studies English.', vi: 'Gợi ý: My daughter studies English.', id: 'Petunjuk: My daughter studies English.', tr: 'İpucu: My daughter studies English.', pl: 'Podpowiedź: My daughter studies English.' })], focusWords: ['daughter', 'studies'] }),
    thirdStep({ id: 'third_s_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'have_has', sentence: 'He ___ a new car.', translation: tri('У него есть новая машина.', 'У нього є нова машина.', 'Él tiene un coche nuevo.', { 'pt-BR': 'Ele tem um carro novo.', vi: 'Anh ấy có một chiếc xe mới.', id: 'Dia punya mobil baru.', tr: 'Onun yeni bir arabası var.', pl: 'On ma nowy samochód.' }), options: ['have', 'has', 'haves', 'having'], correctAnswer: 'has', correctFeedback: tri('Да. Have с he/she/it становится has.', 'Так. Have з he/she/it стає has.', 'Sí. Have con he/she/it se vuelve has.', { 'pt-BR': 'Sim. Have com he/she/it vira has.', vi: 'Đúng. Have với he/she/it đổi thành has.', id: 'Ya. Have dengan he/she/it menjadi has.', tr: 'Evet. Have, he/she/it ile has olur.', pl: 'Tak. Have z he/she/it zmienia się w has.' }), wrong: { have: tri('Have подходит для I/you/we/they. С he нужна форма has.', 'Have підходить для I/you/we/they. З he потрібна форма has.', 'Have va con I/you/we/they. Con he necesitamos has.', { 'pt-BR': 'Have serve para I/you/we/they. Com he precisamos de has.', vi: 'Have hợp với I/you/we/they. Với he cần has.', id: 'Have cocok untuk I/you/we/they. Dengan he perlu has.', tr: 'Have, I/you/we/they ile olur. He ile has gerekir.', pl: 'Have pasuje do I/you/we/they. Z he potrzebne jest has.' }), haves: tri('Haves неправильно. У have особая форма: has.', 'Haves неправильно. У have особлива форма: has.', 'Haves es incorrecto. Have tiene forma especial: has.', { 'pt-BR': 'Haves está incorreto. Have tem uma forma especial: has.', vi: 'Haves là sai. Have có dạng đặc biệt: has.', id: 'Haves salah. Have punya bentuk khusus: has.', tr: 'Haves yanlıştır. Have özel biçime sahiptir: has.', pl: 'Haves jest niepoprawne. Have ma specjalną formę: has.' }), having: tri('Having здесь не подходит. Нужно He has.', 'Having тут не підходить. Потрібно He has.', 'Having no encaja aquí. Necesitamos He has.', { 'pt-BR': 'Having não combina aqui. Precisamos de He has.', vi: 'Having không hợp ở đây. Cần He has.', id: 'Having tidak cocok di sini. Perlu He has.', tr: 'Having burada uymaz. He has gerekir.', pl: 'Having tutaj nie pasuje. Potrzebne jest He has.' }) }, retry: [tri('He + have = has.', 'He + have = has.', 'He + have = has.', { 'pt-BR': 'He + have = has.', vi: 'He + have = has.', id: 'He + have = has.', tr: 'He + have = has.', pl: 'He + have = has.' }), tri('He has.', 'He has.', 'He has.', { 'pt-BR': 'He has.', vi: 'He has.', id: 'He has.', tr: 'He has.', pl: 'He has.' }), tri('Подсказка: He has a new car.', 'Підказка: He has a new car.', 'Pista: He has a new car.', { 'pt-BR': 'Dica: He has a new car.', vi: 'Gợi ý: He has a new car.', id: 'Petunjuk: He has a new car.', tr: 'İpucu: He has a new car.', pl: 'Podpowiedź: He has a new car.' })], focusWords: ['he', 'has'] }),
    thirdStep({ id: 'third_s_mixed_002', order: 11, difficulty: 'mixed_review', targetSkill: 'does_boundary_no_s', sentence: 'Does she ___ English?', translation: tri('Она учит английский?', 'Вона вчить англійську?', 'Ella estudia inglés?', { 'pt-BR': 'Ela estuda inglês?', vi: 'Cô ấy học tiếng Anh không?', id: 'Apakah dia belajar bahasa Inggris?', tr: 'İngilizce çalışıyor mu?', pl: 'Czy ona uczy się angielskiego?' }), options: ['study', 'studies', 'studys', 'studying'], correctAnswer: 'study', correctFeedback: tri('Да. После does основной глагол возвращается в base form: study.', 'Так. Після does основне дієслово повертається в base form: study.', 'Sí. Después de does el verbo vuelve a base form: study.', { 'pt-BR': 'Sim. Depois de does, o verbo principal volta para base form: study.', vi: 'Đúng. Sau does, động từ chính quay về base form: study.', id: 'Ya. Setelah does, verba utama kembali ke base form: study.', tr: 'Evet. Does sonrasında ana fiil base form olur: study.', pl: 'Tak. Po does główny czasownik wraca do base form: study.' }), wrong: { studies: tri('Studies правильно в утверждении: She studies. Но после does нужно study.', 'Studies правильно у ствердженні: She studies. Але після does потрібно study.', 'Studies es correcto en afirmación: She studies. Pero después de does necesitamos study.', { 'pt-BR': 'Studies está correto em afirmação: She studies. Mas depois de does precisamos de study.', vi: 'Studies đúng trong câu khẳng định: She studies. Nhưng sau does cần study.', id: 'Studies benar dalam afirmasi: She studies. Tetapi setelah does perlu study.', tr: 'Studies olumlu cümlede doğrudur: She studies. Ama does sonrasında study gerekir.', pl: 'Studies jest poprawne w twierdzeniu: She studies. Ale po does potrzebne jest study.' }), studys: tri('Studys неправильная форма, а после does нужен простой study.', 'Studys неправильна форма, а після does потрібне просте study.', 'Studys es forma incorrecta y después de does necesitamos study simple.', { 'pt-BR': 'Studys é forma incorreta, e depois de does precisamos de study simples.', vi: 'Studys là dạng sai, và sau does cần study đơn giản.', id: 'Studys adalah bentuk salah, dan setelah does perlu study sederhana.', tr: 'Studys yanlış biçimdir; does sonrasında yalın study gerekir.', pl: 'Studys to niepoprawna forma, a po does potrzebne jest proste study.' }), studying: tri('После does не ставим -ing. Правильно: Does she study?', 'Після does не ставимо -ing. Правильно: Does she study?', 'Después de does no ponemos -ing. Correcto: Does she study?', { 'pt-BR': 'Depois de does não colocamos -ing. Correto: Does she study?', vi: 'Sau does không đặt -ing. Đúng là: Does she study?', id: 'Setelah does jangan pakai -ing. Benar: Does she study?', tr: 'Does sonrasında -ing koymayız. Doğru: Does she study?', pl: 'Po does nie stawiamy -ing. Poprawnie: Does she study?' }) }, retry: [tri('После does - без -s.', 'Після does - без -s.', 'Después de does - sin -s.', { 'pt-BR': 'Depois de does - sem -s.', vi: 'Sau does - không có -s.', id: 'Setelah does - tanpa -s.', tr: 'Does sonrasında -s yok.', pl: 'Po does - bez -s.' }), tri('She studies, но Does she study?', 'She studies, але Does she study?', 'She studies, pero Does she study?', { 'pt-BR': 'She studies, mas Does she study?', vi: 'She studies, nhưng Does she study?', id: 'She studies, tetapi Does she study?', tr: 'She studies, ama Does she study?', pl: 'She studies, ale Does she study?' }), tri('Подсказка: Does she study English?', 'Підказка: Does she study English?', 'Pista: Does she study English?', { 'pt-BR': 'Dica: Does she study English?', vi: 'Gợi ý: Does she study English?', id: 'Petunjuk: Does she study English?', tr: 'İpucu: Does she study English?', pl: 'Podpowiedź: Does she study English?' })], focusWords: ['does', 'study'] }),
    thirdStep({ id: 'third_s_mixed_003', order: 12, difficulty: 'mixed_review', targetSkill: 'mixed_es_ies_has_review', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Elige la oración correcta.', { 'pt-BR': 'Escolha a frase correta.', vi: 'Chọn câu đúng.', id: 'Pilih kalimat yang benar.', tr: 'Doğru cümleyi seç.', pl: 'Wybierz poprawne zdanie.' }), options: ['She study and has a job.', 'She studies and has a job.', 'She studies and have a job.', 'She studys and haves a job.'], correctAnswer: 'She studies and has a job.', correctFeedback: tri('Да. She требует studies и has.', 'Так. She потребує studies і has.', 'Sí. She necesita studies y has.', { 'pt-BR': 'Sim. She precisa de studies e has.', vi: 'Đúng. She cần studies và has.', id: 'Ya. She perlu studies dan has.', tr: 'Evet. She studies ve has ister.', pl: 'Tak. She potrzebuje studies i has.' }), wrong: { 'She study and has a job.': tri('Has правильный, но study должен стать studies.', 'Has правильний, але study має стати studies.', 'Has está bien, pero study debe convertirse en studies.', { 'pt-BR': 'Has está correto, mas study deve virar studies.', vi: 'Has đúng, nhưng study phải thành studies.', id: 'Has benar, tetapi study harus menjadi studies.', tr: 'Has doğru, ama study studies olmalı.', pl: 'Has jest poprawne, ale study musi zmienić się w studies.' }), 'She studies and have a job.': tri('Studies правильный, но have с she должен стать has.', 'Studies правильний, але have з she має стати has.', 'Studies está bien, pero have con she debe ser has.', { 'pt-BR': 'Studies está correto, mas have com she deve virar has.', vi: 'Studies đúng, nhưng have với she phải thành has.', id: 'Studies benar, tetapi have dengan she harus menjadi has.', tr: 'Studies doğru, ama she ile have has olmalı.', pl: 'Studies jest poprawne, ale have z she musi być has.' }), 'She studys and haves a job.': tri('Обе формы неправильные: study -> studies, have -> has.', 'Обидві форми неправильні: study -> studies, have -> has.', 'Las dos formas son incorrectas: study -> studies, have -> has.', { 'pt-BR': 'As duas formas estão incorretas: study -> studies, have -> has.', vi: 'Cả hai dạng đều sai: study -> studies, have -> has.', id: 'Kedua bentuk salah: study -> studies, have -> has.', tr: 'İki biçim de yanlış: study -> studies, have -> has.', pl: 'Obie formy są niepoprawne: study -> studies, have -> has.' }) }, retry: [tri('She + study = studies.', 'She + study = studies.', 'She + study = studies.', { 'pt-BR': 'She + study = studies.', vi: 'She + study = studies.', id: 'She + study = studies.', tr: 'She + study = studies.', pl: 'She + study = studies.' }), tri('She + have = has.', 'She + have = has.', 'She + have = has.', { 'pt-BR': 'She + have = has.', vi: 'She + have = has.', id: 'She + have = has.', tr: 'She + have = has.', pl: 'She + have = has.' }), tri('Подсказка: She studies and has a job.', 'Підказка: She studies and has a job.', 'Pista: She studies and has a job.', { 'pt-BR': 'Dica: She studies and has a job.', vi: 'Gợi ý: She studies and has a job.', id: 'Petunjuk: She studies and has a job.', tr: 'İpucu: She studies and has a job.', pl: 'Podpowiedź: She studies and has a job.' })], focusWords: ['studies', 'has'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['missing_third_person_s', 'wrong_s_with_plural_subject', 'es_ending_error', 'ies_ending_error', 'have_has_error', 'does_question_confusion'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем, кто делает действие, и какая форма нужна.', 'Звичайне пояснення: показуємо, хто робить дію, і яка форма потрібна.', 'Explicación normal: mostramos subject y forma del verbo.', { 'pt-BR': 'Explicação normal: mostramos o sujeito e a forma do verbo.', vi: 'Giải thích thường: hiển thị chủ ngữ và dạng động từ.', id: 'Penjelasan biasa: tampilkan subjek dan bentuk verba.', tr: 'Normal açıklama: özneyi ve fiil biçimini gösteriyoruz.', pl: 'Zwykłe wyjaśnienie: pokazujemy podmiot i formę czasownika.' }),
    depth2: tri('Проще: делим на he/she/it и все остальные варианты.', 'Простіше: ділимо на he/she/it і всі інші варіанти.', 'Más simple: dividimos subject en he/she/it y todos los demás.', { 'pt-BR': 'Mais simples: dividimos o sujeito em he/she/it e todos os outros.', vi: 'Đơn giản hơn: chia chủ ngữ thành he/she/it và tất cả nhóm còn lại.', id: 'Lebih sederhana: bagi subjek menjadi he/she/it dan semua yang lain.', tr: 'Daha basit: özneyi he/she/it ve diğerleri diye ayırıyoruz.', pl: 'Prościej: dzielimy podmiot na he/she/it i wszystkie pozostałe.' }),
    depth3: tri('Еще проще: с I действие простое, с she появляется хвост -s.', 'Ще простіше: з I дія проста, з she зʼявляється хвіст -s.', 'Aún más simple: I work / she works.', { 'pt-BR': 'Ainda mais simples: I work / she works.', vi: 'Đơn giản hơn nữa: I work / she works.', id: 'Lebih sederhana lagi: I work / she works.', tr: 'Daha da basit: I work / she works.', pl: 'Jeszcze prościej: I work / she works.' }),
    depth4: tri('Почти подсказка: прямо указываем, нужен ли -s.', 'Майже підказка: прямо вказуємо, чи потрібна -s.', 'Casi pista: indicamos directamente si hace falta -s.', { 'pt-BR': 'Quase uma dica: indicamos diretamente se precisa de -s.', vi: 'Gần như là gợi ý: chỉ thẳng có cần -s hay không.', id: 'Hampir seperti petunjuk: langsung tunjukkan apakah perlu -s.', tr: 'Neredeyse ipucu: -s gerekip gerekmediğini doğrudan gösteriyoruz.', pl: 'Prawie podpowiedź: wskazujemy wprost, czy potrzebne jest -s.' }),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. Сначала найди, кто делает действие. He/she/it или один предмет в утверждении = нужен хвост -s/-es. I/you/we/they или несколько людей/вещей = действие простое.', 'Зупинись. Спочатку знайди, хто робить дію. He/she/it або один предмет у ствердженні = потрібен хвіст -s/-es. I/you/we/they або кілька людей/речей = дія проста.', 'Detente. Primero encuentra el subject. He/she/it o una cosa singular en afirmación = -s/-es. I/you/we/they o plural = base verb.', { 'pt-BR': 'Pare. Primeiro encontre o sujeito. He/she/it ou uma coisa singular em afirmação = precisa de -s/-es. I/you/we/they ou plural = base verb.', vi: 'Dừng lại. Trước tiên tìm chủ ngữ. He/she/it hoặc một vật số ít trong câu khẳng định = cần -s/-es. I/you/we/they hoặc số nhiều = base verb.', id: 'Berhenti. Pertama temukan subjeknya. He/she/it atau satu benda dalam afirmasi = perlu -s/-es. I/you/we/they atau jamak = base verb.', tr: 'Dur. Önce özneyi bul. Olumlu cümlede he/she/it veya tek şey = -s/-es gerekir. I/you/we/they veya çoğul = base verb.', pl: 'Zatrzymaj się. Najpierw znajdź podmiot. He/she/it albo jedna rzecz w twierdzeniu = potrzebne -s/-es. I/you/we/they albo liczba mnoga = base verb.' }) },
    afterThreeWrongInSameExercise: { action: 'show_subject_group_hint_then_retry', card: tri('Подсказка: система покажет, кто делает действие, но не выберет форму за пользователя.', 'Підказка: система покаже, хто робить дію, але не вибере форму за користувача.', 'Pista de subject: el sistema mostrará el grupo del subject, pero no elegirá la forma.', { 'pt-BR': 'Dica de sujeito: o sistema vai mostrar o grupo do sujeito, mas não vai escolher a forma.', vi: 'Gợi ý chủ ngữ: hệ thống sẽ hiển thị nhóm chủ ngữ, nhưng không chọn dạng thay bạn.', id: 'Petunjuk subjek: sistem akan menunjukkan kelompok subjek, tetapi tidak memilih bentuknya.', tr: 'Özne ipucu: sistem özne grubunu gösterecek, ama biçimi seçmeyecek.', pl: 'Podpowiedź podmiotu: system pokaże grupę podmiotu, ale nie wybierze formy.' }) },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери, кто делает действие. Потом вернемся к форме глагола.', 'Режим підказки: спочатку обери, хто робить дію. Потім повернемося до форми дієслова.', 'Modo guiado: primero elige el grupo del subject. Luego volvemos a la forma del verbo.', { 'pt-BR': 'Modo guiado: primeiro escolha o grupo do sujeito. Depois voltamos para a forma do verbo.', vi: 'Chế độ gợi ý: trước tiên chọn nhóm chủ ngữ. Sau đó quay lại dạng động từ.', id: 'Mode panduan: pertama pilih kelompok subjek. Lalu kita kembali ke bentuk verba.', tr: 'İpuculu mod: önce özne grubunu seç. Sonra fiil biçimine döneriz.', pl: 'Tryb z podpowiedzią: najpierw wybierz grupę podmiotu. Potem wrócimy do formy czasownika.' }) },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_third_s_001', prompt: tri('She относится к группе he/she/it или I/you/we/they?', 'She належить до групи he/she/it чи I/you/we/they?', 'She pertenece al grupo he/she/it o I/you/we/they?', { 'pt-BR': 'She pertence ao grupo he/she/it ou I/you/we/they?', vi: 'She thuộc nhóm he/she/it hay I/you/we/they?', id: 'She termasuk kelompok he/she/it atau I/you/we/they?', tr: 'She, he/she/it grubuna mı I/you/we/they grubuna mı girer?', pl: 'She należy do grupy he/she/it czy I/you/we/they?' }), options: ['he/she/it', 'I/you/we/they'], correctIndex: 0, thenReturnToExerciseId: 'third_s_easy_001' },
      { id: 'guided_third_s_002', prompt: tri('They требует глагол с -s в утверждении?', 'They потребує дієслово з -s у ствердженні?', 'They necesita verbo con -s en afirmación?', { 'pt-BR': 'They precisa de verbo com -s em afirmação?', vi: 'They có cần động từ với -s trong câu khẳng định không?', id: 'Apakah They perlu verba dengan -s dalam afirmasi?', tr: 'They olumlu cümlede -s alan fiil ister mi?', pl: 'Czy They wymaga czasownika z -s w twierdzeniu?' }), options: ['да', 'нет'], correctIndex: 1, thenReturnToExerciseId: 'third_s_contrast_001' },
      { id: 'guided_third_s_003', prompt: tri('My sister можно заменить на she?', 'My sister можна замінити на she?', 'My sister se puede reemplazar por she?', { 'pt-BR': 'My sister pode ser trocado por she?', vi: 'My sister có thể thay bằng she không?', id: 'Apakah My sister bisa diganti dengan she?', tr: 'My sister yerine she kullanılabilir mi?', pl: 'Czy My sister można zastąpić she?' }), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'third_s_contrast_002' },
      { id: 'guided_third_s_004', prompt: tri('После does основной глагол должен быть с -s?', 'Після does основне дієслово має бути з -s?', 'Después de does, el verbo principal debe tener -s?', { 'pt-BR': 'Depois de does, o verbo principal deve ter -s?', vi: 'Sau does, động từ chính có cần -s không?', id: 'Setelah does, apakah verba utama harus memakai -s?', tr: 'Does sonrasında ana fiil -s almalı mı?', pl: 'Czy po does główny czasownik powinien mieć -s?' }), options: ['да', 'нет'], correctIndex: 1, thenReturnToExerciseId: 'third_s_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_third_person',
    diagnosisLabel: tri('He / She / It + -s', 'He / She / It + -s', 'He / She / It + -s', { 'pt-BR': 'He / She / It + -s', vi: 'He / She / It + -s', id: 'He / She / It + -s', tr: 'He / She / It + -s', pl: 'He / She / It + -s' }),
    contrastSet: ['base verb', 'verb+s', 'verb+es', 'has', 'does'],
    focusWords: ['works', 'goes', 'studies', 'has'],
    focusPatterns: ['basic_third_person_s', 'plural_subject_base', 'third_person_s_vs_plural', 'es_ending', 'ies_ending', 'have_has', 'does_boundary_no_s', 'mixed_es_ies_has_review'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_verb_third_person_start',
    answer: 'diagnosis_training_verb_third_person_answer',
    mastery: 'diagnosis_training_verb_third_person_mastery',
    recovery: 'diagnosis_training_verb_third_person_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'verb', microDiagnosisId: 'verb_third_person', contrastSet: ['base verb', 'verb+s', 'verb+es', 'has', 'does'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logSubjectGroup: true, logVerbForm: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_third_person',
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
