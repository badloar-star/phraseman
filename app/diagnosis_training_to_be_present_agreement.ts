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

const tri = (ru: string, uk: string, es: string, planned: Partial<Record<keyof typeof PLANNED_LOCALE_FALLBACK, string>> = {}): TriText => {
  return {
    ru,
    uk,
    es,
  'pt-BR': planned['pt-BR'] ?? PLANNED_LOCALE_FALLBACK['pt-BR'],
  vi: planned.vi ?? PLANNED_LOCALE_FALLBACK.vi,
  id: planned.id ?? PLANNED_LOCALE_FALLBACK.id,
  tr: planned.tr ?? PLANNED_LOCALE_FALLBACK.tr,
  pl: planned.pl ?? PLANNED_LOCALE_FALLBACK.pl,
  };
};

function beStep(input: {
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
      'Am, is и are зависят от того, о ком говорим. В английском это слово нельзя пропускать перед состоянием, профессией или местом.',
      'Am, is та are залежать від того, про кого говоримо. В англійській це слово не можна пропускати перед станом, професією або місцем.',
      'Be cambia según el subject: I am, he/she/it is, you/we/they are. En inglés no omitimos be antes de estado, rol o lugar.',
      {
        'pt-BR': 'Be muda de acordo com o sujeito: I am, he/she/it is, you/we/they are. Em inglês não omitimos be antes de estado, papel ou lugar.',
        vi: 'Be thay đổi theo chủ ngữ: I am, he/she/it is, you/we/they are. Trong tiếng Anh không bỏ be trước trạng thái, vai trò hoặc nơi chốn.',
        id: 'Be berubah sesuai subjek: I am, he/she/it is, you/we/they are. Dalam bahasa Inggris, be tidak dihilangkan sebelum keadaan, peran, atau tempat.',
        tr: 'Be özneye göre değişir: I am, he/she/it is, you/we/they are. İngilizcede durum, rol veya yerden önce be atlanmaz.',
        pl: 'Be zmienia się zależnie od podmiotu: I am, he/she/it is, you/we/they are. W angielskim nie pomijamy be przed stanem, rolą albo miejscem.',
      },
    ),
    microTask: tri('Выбери am, is или are.', 'Обери am, is або are.', 'Elige la forma correcta de be.', {
      'pt-BR': 'Escolha a forma correta de be.',
      vi: 'Chọn dạng đúng của be.',
      id: 'Pilih bentuk be yang benar.',
      tr: 'Doğru be biçimini seç.',
      pl: 'Wybierz poprawną formę be.',
    }),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Сначала найди, о ком говорим: I идет с am, he/she/it или один предмет — с is, you/we/they или несколько предметов — с are.',
        'Не зовсім. Спочатку знайди, про кого говоримо: I йде з am, he/she/it або один предмет — з is, you/we/they або кілька предметів — з are.',
        'No exactamente. Encuentra el subject y elige: I = am, he/she/it/one thing = is, you/we/they/plural = are.',
        {
          'pt-BR': 'Não exatamente. Primeiro encontre o sujeito e escolha: I = am, he/she/it/uma coisa = is, you/we/they/plural = are.',
          vi: 'Chưa hẳn. Trước tiên tìm chủ ngữ rồi chọn: I = am, he/she/it/một vật = is, you/we/they/số nhiều = are.',
          id: 'Belum tepat. Temukan subjeknya dulu lalu pilih: I = am, he/she/it/satu benda = is, you/we/they/jamak = are.',
          tr: 'Tam değil. Önce özneyi bul ve seç: I = am, he/she/it/tek şey = is, you/we/they/çoğul = are.',
          pl: 'Nie do końca. Najpierw znajdź podmiot i wybierz: I = am, he/she/it/jedna rzecz = is, you/we/they/liczba mnoga = are.',
        },
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(`Подсказка: правильная форма - "${input.correctAnswer}".`, `Підказка: правильна форма - "${input.correctAnswer}".`, `Pista: la forma correcta es "${input.correctAnswer}".`, {
        'pt-BR': `Dica: a forma correta é "${input.correctAnswer}".`,
        vi: `Gợi ý: dạng đúng là "${input.correctAnswer}".`,
        id: `Petunjuk: bentuk yang benar adalah "${input.correctAnswer}".`,
        tr: `İpucu: doğru biçim "${input.correctAnswer}".`,
        pl: `Podpowiedź: poprawna forma to "${input.correctAnswer}".`,
      }),
    ],
    fallbackExplanation: tri(
      'Карта простая: I am. He/she/it is. You/we/they are. Если дальше идет состояние, место или роль, am/is/are почти точно нужны.',
      'Карта проста: I am. He/she/it is. You/we/they are. Якщо далі йде стан, місце або роль, am/is/are майже точно потрібні.',
      'Mapa de be: I am. He/she/it is. You/we/they are. Si después del subject hay adjective, place o role, casi seguro necesitas be.',
      {
        'pt-BR': 'Mapa de be: I am. He/she/it is. You/we/they are. Se depois do sujeito vem adjetivo, lugar ou papel, quase sempre você precisa de be.',
        vi: 'Bản đồ be: I am. He/she/it is. You/we/they are. Nếu sau chủ ngữ là tính từ, nơi chốn hoặc vai trò, gần như chắc chắn cần be.',
        id: 'Peta be: I am. He/she/it is. You/we/they are. Jika setelah subjek ada adjektiva, tempat, atau peran, hampir pasti perlu be.',
        tr: 'Be haritası: I am. He/she/it is. You/we/they are. Özneden sonra sıfat, yer veya rol geliyorsa neredeyse kesin be gerekir.',
        pl: 'Mapa be: I am. He/she/it is. You/we/they are. Jeśli po podmiocie jest przymiotnik, miejsce albo rola, prawie na pewno potrzebujesz be.',
      },
    ),
    focusWords: input.focusWords,
  };
}

const options = ['am', 'is', 'are', 'no be'];

export const TO_BE_PRESENT_AGREEMENT_TRAINING: DiagnosisTraining = {
  id: 'to_be_present_agreement',
  category: 'to-be',
  version: '1.0.0',
  status: 'active',
  priority: 9,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Am / Is / Are: кто с кем идет', 'Am / Is / Are: хто з ким іде', 'Am / Is / Are: qué forma usar', {
    'pt-BR': 'Am / Is / Are: qual forma usar',
    vi: 'Am / Is / Are: dùng dạng nào',
    id: 'Am / Is / Are: bentuk mana yang dipakai',
    tr: 'Am / Is / Are: hangi biçim kullanılır',
    pl: 'Am / Is / Are: której formy użyć',
  }),
  shortTitle: tri('Am / Is / Are', 'Am / Is / Are', 'Am / Is / Are', {
    'pt-BR': 'Am / Is / Are',
    vi: 'Am / Is / Are',
    id: 'Am / Is / Are',
    tr: 'Am / Is / Are',
    pl: 'Am / Is / Are',
  }),
  shortDiagnosis: tri('Ты путаешь am, is и are в настоящем времени.', 'Ти плутаєш am, is і are у теперішньому часі.', 'Confundes am, is y are en presente.', {
    'pt-BR': 'Você confunde am, is e are no presente.',
    vi: 'Bạn nhầm am, is và are ở hiện tại.',
    id: 'Kamu mencampur am, is, dan are dalam bentuk sekarang.',
    tr: 'Şimdiki zamanda am, is ve are biçimlerini karıştırıyorsun.',
    pl: 'Mylisz am, is i are w czasie teraźniejszym.',
  }),
  diagnosisText: tri(
    'Ты путаешь am, is и are в настоящем времени. В русском часто нет отдельного слова "есть" в таких фразах, а в английском его нужно ставить: I am, he is, they are.',
    'Ти плутаєш am, is і are у теперішньому часі. Українською часто немає окремого слова "є" в таких фразах, а в англійській його потрібно ставити: I am, he is, they are.',
    'Confundes am, is y are en presente. En español muchas veces be se siente diferente, pero el inglés casi siempre necesita una forma de be: I am, he is, they are.',
    {
      'pt-BR': 'Você confunde am, is e are no presente. Em português muitas vezes be parece diferente, mas o inglês quase sempre precisa de uma forma de be: I am, he is, they are.',
      vi: 'Bạn nhầm am, is và are ở hiện tại. Trong tiếng Việt thường không có một từ riêng giống be trong các câu này, nhưng tiếng Anh cần nó: I am, he is, they are.',
      id: 'Kamu mencampur am, is, dan are dalam bentuk sekarang. Dalam bahasa Indonesia sering tidak ada kata terpisah seperti be di kalimat seperti ini, tetapi bahasa Inggris membutuhkannya: I am, he is, they are.',
      tr: 'Şimdiki zamanda am, is ve are biçimlerini karıştırıyorsun. Türkçede bu tür cümlelerde ayrı bir be kelimesi hissedilmeyebilir, ama İngilizce bunu ister: I am, he is, they are.',
      pl: 'Mylisz am, is i are w czasie teraźniejszym. Po polsku często nie ma osobnego słowa be w takich zdaniach, ale angielski go potrzebuje: I am, he is, they are.',
    },
  ),
  mentalModel: tri(
    'Смотри, о ком говорим. I = am. He/she/it или один предмет = is. You/we/they или несколько предметов = are.',
    'Дивись, про кого говоримо. I = am. He/she/it або один предмет = is. You/we/they або кілька предметів = are.',
    'Be cambia según el subject. I = am. He/she/it/one thing = is. You/we/they/plural = are.',
    {
      'pt-BR': 'Be muda de acordo com o sujeito. I = am. He/she/it/uma coisa = is. You/we/they/plural = are.',
      vi: 'Be thay đổi theo chủ ngữ. I = am. He/she/it/một vật = is. You/we/they/số nhiều = are.',
      id: 'Be berubah sesuai subjek. I = am. He/she/it/satu benda = is. You/we/they/jamak = are.',
      tr: 'Be özneye göre değişir. I = am. He/she/it/tek şey = is. You/we/they/çoğul = are.',
      pl: 'Be zmienia się zależnie od podmiotu. I = am. He/she/it/jedna rzecz = is. You/we/they/liczba mnoga = are.',
    },
  ),
  contrastSet: ['am', 'is', 'are', 'no be'],
  coreRule: tri(
    'I am ready. He is tired. She is at home. It is cold. You are right. We are here. They are busy.',
    'I am ready. He is tired. She is at home. It is cold. You are right. We are here. They are busy.',
    'I am ready. He is tired. She is at home. It is cold. You are right. We are here. They are busy.',
    {
      'pt-BR': 'I am ready. He is tired. She is at home. It is cold. You are right. We are here. They are busy.',
      vi: 'I am ready. He is tired. She is at home. It is cold. You are right. We are here. They are busy.',
      id: 'I am ready. He is tired. She is at home. It is cold. You are right. We are here. They are busy.',
      tr: 'I am ready. He is tired. She is at home. It is cold. You are right. We are here. They are busy.',
      pl: 'I am ready. He is tired. She is at home. It is cold. You are right. We are here. They are busy.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Если говорим о роли, ставим am/is/are: He is a doctor.',
      'Если говорим о качестве или состоянии, тоже ставим am/is/are: She is tired, I am ready.',
      'Если говорим, где кто-то находится, am/is/are обычно нужны: They are at home.',
      'I всегда идет с am.',
      'He/she/it и один предмет идут с is.',
      'You/we/they и множественное число идут с are.',
      'В вопросе am/is/are выходит вперед: Is she ready?',
      'В отрицании not идет после am/is/are: They are not here.',
    ],
    uk: [
      'Якщо говоримо про роль, ставимо am/is/are: He is a doctor.',
      'Якщо говоримо про якість або стан, теж ставимо am/is/are: She is tired, I am ready.',
      'Якщо говоримо, де хтось перебуває, am/is/are зазвичай потрібні: They are at home.',
      'I завжди йде з am.',
      'He/she/it і один предмет ідуть з is.',
      'You/we/they і множина йдуть з are.',
      'У питанні am/is/are виходить вперед: Is she ready?',
      'У запереченні not іде після am/is/are: They are not here.',
    ],
    es: [
      'Be se necesita con rol: He is a doctor.',
      'Be se necesita con cualidad/estado: She is tired, I am ready.',
      'Be se necesita con lugar: They are at home.',
      'I siempre va con am.',
      'He/she/it y una cosa singular van con is.',
      'You/we/they y plural van con are.',
      'En pregunta, be va al principio: Is she ready?',
      'En negación, not va después de be: They are not here.',
    ],
    'pt-BR': [
      'Use be para papel ou função: He is a doctor.',
      'Use be para qualidade ou estado: She is tired, I am ready.',
      'Use be para lugar: They are at home.',
      'I sempre usa am.',
      'He/she/it e uma coisa no singular usam is.',
      'You/we/they e plural usam are.',
      'Em perguntas, be vai para o início: Is she ready?',
      'Em negativas, not vem depois de be: They are not here.',
    ],
    vi: [
      'Dùng be khi nói về vai trò: He is a doctor.',
      'Dùng be khi nói về tính chất hoặc trạng thái: She is tired, I am ready.',
      'Dùng be khi nói về nơi chốn: They are at home.',
      'I luôn đi với am.',
      'He/she/it và một vật số ít đi với is.',
      'You/we/they và số nhiều đi với are.',
      'Trong câu hỏi, be đứng ở đầu: Is she ready?',
      'Trong câu phủ định, not đứng sau be: They are not here.',
    ],
    id: [
      'Gunakan be untuk peran: He is a doctor.',
      'Gunakan be untuk sifat atau keadaan: She is tired, I am ready.',
      'Gunakan be untuk tempat: They are at home.',
      'I selalu memakai am.',
      'He/she/it dan satu benda tunggal memakai is.',
      'You/we/they dan bentuk jamak memakai are.',
      'Dalam pertanyaan, be pindah ke awal: Is she ready?',
      'Dalam kalimat negatif, not berada setelah be: They are not here.',
    ],
    tr: [
      'Rol veya meslek için be kullan: He is a doctor.',
      'Nitelik veya durum için be kullan: She is tired, I am ready.',
      'Yer bildirirken be kullan: They are at home.',
      'I her zaman am alır.',
      'He/she/it ve tekil bir şey is alır.',
      'You/we/they ve çoğul are alır.',
      'Soruda be başa gelir: Is she ready?',
      'Olumsuzda not, be sonrasına gelir: They are not here.',
    ],
    pl: [
      'Użyj be przy roli albo zawodzie: He is a doctor.',
      'Użyj be przy cesze albo stanie: She is tired, I am ready.',
      'Użyj be przy miejscu: They are at home.',
      'I zawsze łączy się z am.',
      'He/she/it i jedna rzecz w liczbie pojedynczej łączą się z is.',
      'You/we/they i liczba mnoga łączą się z are.',
      'W pytaniu be idzie na początek: Is she ready?',
      'W przeczeniu not stoi po be: They are not here.',
    ],
  },
  examples: [
    { en: 'I am ready.', ru: 'Я готов.', uk: 'Я готовий.', es: 'Estoy listo.', 'pt-BR': 'Estou pronto.', vi: 'Tôi đã sẵn sàng.', id: 'Saya siap.', tr: 'Hazırım.', pl: 'Jestem gotowy.', why: tri('I всегда требует am.', 'I завжди потребує am.', 'I siempre necesita am.', { 'pt-BR': 'I sempre precisa de am.', vi: 'I luôn cần am.', id: 'I selalu membutuhkan am.', tr: 'I her zaman am ister.', pl: 'I zawsze wymaga am.' }) },
    { en: 'She is tired.', ru: 'Она устала.', uk: 'Вона втомлена.', es: 'Ella está cansada.', 'pt-BR': 'Ela está cansada.', vi: 'Cô ấy mệt.', id: 'Dia lelah.', tr: 'O yorgun.', pl: 'Ona jest zmęczona.', why: tri('She идет с is. Tired - состояние.', 'She йде з is. Tired - стан.', 'She va con is. Tired es estado.', { 'pt-BR': 'She vai com is. Tired é estado.', vi: 'She đi với is. Tired là trạng thái.', id: 'She memakai is. Tired adalah keadaan.', tr: 'She, is ile gider. Tired bir durumdur.', pl: 'She łączy się z is. Tired to stan.' }) },
    { en: 'They are at home.', ru: 'Они дома.', uk: 'Вони вдома.', es: 'Están en casa.', 'pt-BR': 'Eles estão em casa.', vi: 'Họ đang ở nhà.', id: 'Mereka ada di rumah.', tr: 'Onlar evde.', pl: 'Oni są w domu.', why: tri('They идет с are. At home - место.', 'They йде з are. At home - місце.', 'They va con are. At home es lugar.', { 'pt-BR': 'They vai com are. At home é lugar.', vi: 'They đi với are. At home là nơi chốn.', id: 'They memakai are. At home adalah tempat.', tr: 'They, are ile gider. At home yer bildirir.', pl: 'They łączy się z are. At home to miejsce.' }) },
    { en: 'It is cold today.', ru: 'Сегодня холодно.', uk: 'Сьогодні холодно.', es: 'Hace frío hoy.', 'pt-BR': 'Está frio hoje.', vi: 'Hôm nay trời lạnh.', id: 'Hari ini dingin.', tr: 'Bugün hava soğuk.', pl: 'Dziś jest zimno.', why: tri('Для погоды часто используется it is.', 'Для погоди часто використовується it is.', 'Para clima muchas veces usamos it is.', { 'pt-BR': 'Para clima, muitas vezes usamos it is.', vi: 'Với thời tiết, thường dùng it is.', id: 'Untuk cuaca, sering dipakai it is.', tr: 'Hava durumu için sık sık it is kullanılır.', pl: 'Przy pogodzie często używamy it is.' }) },
    { en: 'You are right.', ru: 'Ты прав.', uk: 'Ти правий.', es: 'Tienes razón.', 'pt-BR': 'Você está certo.', vi: 'Bạn đúng.', id: 'Kamu benar.', tr: 'Haklısın.', pl: 'Masz rację.', why: tri('You всегда идет с are.', 'You завжди йде з are.', 'You siempre va con are.', { 'pt-BR': 'You sempre vai com are.', vi: 'You luôn đi với are.', id: 'You selalu memakai are.', tr: 'You her zaman are ile gider.', pl: 'You zawsze łączy się z are.' }) },
    { en: 'The lesson is difficult.', ru: 'Урок сложный.', uk: 'Урок складний.', es: 'La lección es difícil.', 'pt-BR': 'A lição é difícil.', vi: 'Bài học này khó.', id: 'Pelajaran ini sulit.', tr: 'Ders zor.', pl: 'Lekcja jest trudna.', why: tri('The lesson — это один урок, поэтому is.', 'The lesson — це один урок, тому is.', 'The lesson = one thing, por eso is.', { 'pt-BR': 'The lesson é uma coisa só, por isso usamos is.', vi: 'The lesson là một bài học, nên dùng is.', id: 'The lesson adalah satu hal, jadi memakai is.', tr: 'The lesson tek bir şeydir, bu yüzden is kullanılır.', pl: 'The lesson to jedna rzecz, dlatego używamy is.' }) },
    { en: 'The books are on the table.', ru: 'Книги на столе.', uk: 'Книги на столі.', es: 'Los libros están sobre la mesa.', 'pt-BR': 'Os livros estão sobre a mesa.', vi: 'Những cuốn sách ở trên bàn.', id: 'Buku-buku ada di atas meja.', tr: 'Kitaplar masanın üzerinde.', pl: 'Książki są na stole.', why: tri('Books — это несколько книг, поэтому are.', 'Books — це кілька книжок, тому are.', 'Books = plural, por eso are.', { 'pt-BR': 'Books é plural, por isso usamos are.', vi: 'Books là số nhiều, nên dùng are.', id: 'Books adalah jamak, jadi memakai are.', tr: 'Books çoğuldur, bu yüzden are kullanılır.', pl: 'Books to liczba mnoga, dlatego używamy are.' }) },
    { en: 'Is she ready?', ru: 'Она готова?', uk: 'Вона готова?', es: 'Está lista?', 'pt-BR': 'Ela está pronta?', vi: 'Cô ấy sẵn sàng chưa?', id: 'Apakah dia siap?', tr: 'O hazır mı?', pl: 'Czy ona jest gotowa?', why: tri('В вопросе is выходит вперед.', 'У питанні is виходить вперед.', 'En pregunta, is va al principio.', { 'pt-BR': 'Na pergunta, is vai para a frente.', vi: 'Trong câu hỏi, is đi lên đầu.', id: 'Dalam pertanyaan, is maju ke depan.', tr: 'Soruda is öne gelir.', pl: 'W pytaniu is idzie na początek.' }) },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь am, is и are или пропускаешь это маленькое слово там, где английский без него разваливается.', 'Схоже, ти плутаєш am, is і are або пропускаєш це маленьке слово там, де англійська без нього розвалюється.', 'Parece que confundes am, is y are u omites be donde el inglés lo necesita.', { 'pt-BR': 'Parece que você confunde am, is e are ou omite essa palavrinha onde o inglês precisa dela.', vi: 'Có vẻ bạn nhầm am, is và are hoặc bỏ từ nhỏ này ở nơi tiếng Anh cần nó.', id: 'Sepertinya kamu mencampur am, is, dan are atau menghilangkan kata kecil ini saat bahasa Inggris membutuhkannya.', tr: 'Am, is ve are biçimlerini karıştırıyor ya da İngilizcenin ihtiyaç duyduğu yerde bu küçük kelimeyi atlıyorsun gibi görünüyor.', pl: 'Wygląda na to, że mylisz am, is i are albo pomijasz to małe słowo tam, gdzie angielski go potrzebuje.' }) },
    { id: 'intro_rule', type: 'rule', text: tri('Карта: I am. He/she/it is. You/we/they are.', 'Карта: I am. He/she/it is. You/we/they are.', 'Mapa: I am. He/she/it is. You/we/they are.', { 'pt-BR': 'Mapa: I am. He/she/it is. You/we/they are.', vi: 'Bản đồ: I am. He/she/it is. You/we/they are.', id: 'Peta: I am. He/she/it is. You/we/they are.', tr: 'Harita: I am. He/she/it is. You/we/they are.', pl: 'Mapa: I am. He/she/it is. You/we/they are.' }) },
    { id: 'intro_warning', type: 'warning', text: tri('Не говорим She at home. Полная английская фраза: She is at home.', 'Не кажемо She at home. Повна англійська фраза: She is at home.', 'No omitas be: no She at home, sino She is at home.', { 'pt-BR': 'Não omita be: não She at home, mas She is at home.', vi: 'Đừng bỏ be: không phải She at home, mà là She is at home.', id: 'Jangan hilangkan be: bukan She at home, tetapi She is at home.', tr: 'Be kelimesini atlama: She at home değil, She is at home.', pl: 'Nie pomijaj be: nie She at home, tylko She is at home.' }) },
  ],
  steps: [
    beStep({ id: 'be_present_easy_001', order: 1, difficulty: 'easy', targetSkill: 'i_am', sentence: 'I ___ ready.', translation: tri('Я готов.', 'Я готовий.', 'Estoy listo.', { 'pt-BR': 'Estou pronto.', vi: 'Tôi đã sẵn sàng.', id: 'Saya siap.', tr: 'Hazırım.', pl: 'Jestem gotowy.' }), options, correctAnswer: 'am', correctFeedback: tri('Да. I всегда идет с am.', 'Так. I завжди йде з am.', 'Sí. I siempre va con am.', { 'pt-BR': 'Sim. I sempre vai com am.', vi: 'Đúng. I luôn đi với am.', id: 'Ya. I selalu memakai am.', tr: 'Evet. I her zaman am ile gider.', pl: 'Tak. I zawsze łączy się z am.' }), wrong: { is: tri('Is используется с he/she/it. С I нужна форма am.', 'Is використовується з he/she/it. З I потрібна форма am.', 'Is se usa con he/she/it. Con I necesitamos am.', { 'pt-BR': 'Is é usado com he/she/it. Com I precisamos de am.', vi: 'Is dùng với he/she/it. Với I cần am.', id: 'Is dipakai dengan he/she/it. Dengan I perlu am.', tr: 'Is, he/she/it ile kullanılır. I ile am gerekir.', pl: 'Is używamy z he/she/it. Z I potrzebne jest am.' }), are: tri('Are используется с you/we/they. С I нужна форма am.', 'Are використовується з you/we/they. З I потрібна форма am.', 'Are se usa con you/we/they. Con I necesitamos am.', { 'pt-BR': 'Are é usado com you/we/they. Com I precisamos de am.', vi: 'Are dùng với you/we/they. Với I cần am.', id: 'Are dipakai dengan you/we/they. Dengan I perlu am.', tr: 'Are, you/we/they ile kullanılır. I ile am gerekir.', pl: 'Are używamy z you/we/they. Z I potrzebne jest am.' }), 'no be': tri('I ready неправильно. После I нужна связка: I am ready.', 'I ready неправильно. Після I потрібна зв’язка: I am ready.', 'I ready es incorrecto. Antes de ready necesitamos be: I am ready.', { 'pt-BR': 'I ready está incorreto. Depois de I precisamos da ligação: I am ready.', vi: 'I ready là sai. Sau I cần từ nối: I am ready.', id: 'I ready salah. Setelah I perlu penghubung: I am ready.', tr: 'I ready yanlıştır. I sonrasında bağ gerekir: I am ready.', pl: 'I ready jest niepoprawne. Po I potrzebny jest łącznik: I am ready.' }) }, retry: [tri('I имеет свою форму: am.', 'I має свою форму: am.', 'I tiene su propia forma: am.', { 'pt-BR': 'I tem sua própria forma: am.', vi: 'I có dạng riêng: am.', id: 'I punya bentuk sendiri: am.', tr: 'I kendi biçimine sahiptir: am.', pl: 'I ma własną formę: am.' }), tri('I am. Всегда.', 'I am. Завжди.', 'I am. Siempre.', { 'pt-BR': 'I am. Sempre.', vi: 'I am. Luôn luôn.', id: 'I am. Selalu.', tr: 'I am. Her zaman.', pl: 'I am. Zawsze.' }), tri('Подсказка: I am ready.', 'Підказка: I am ready.', 'Pista: I am ready.', { 'pt-BR': 'Dica: I am ready.', vi: 'Gợi ý: I am ready.', id: 'Petunjuk: I am ready.', tr: 'İpucu: I am ready.', pl: 'Podpowiedź: I am ready.' })], focusWords: ['I', 'am'] }),
    beStep({ id: 'be_present_easy_002', order: 2, difficulty: 'easy', targetSkill: 'she_is', sentence: 'She ___ tired.', translation: tri('Она устала.', 'Вона втомлена.', 'Ella está cansada.', { 'pt-BR': 'Ela está cansada.', vi: 'Cô ấy mệt.', id: 'Dia lelah.', tr: 'O yorgun.', pl: 'Ona jest zmęczona.' }), options, correctAnswer: 'is', correctFeedback: tri('Да. She идет с is.', 'Так. She йде з is.', 'Sí. She va con is.', { 'pt-BR': 'Sim. She vai com is.', vi: 'Đúng. She đi với is.', id: 'Ya. She memakai is.', tr: 'Evet. She, is ile gider.', pl: 'Tak. She łączy się z is.' }), wrong: { am: tri('Am используется только с I. С she нужна is.', 'Am використовується тільки з I. З she потрібна is.', 'Am se usa solo con I. Con she necesitamos is.', { 'pt-BR': 'Am é usado só com I. Com she precisamos de is.', vi: 'Am chỉ dùng với I. Với she cần is.', id: 'Am hanya dipakai dengan I. Dengan she perlu is.', tr: 'Am sadece I ile kullanılır. She ile is gerekir.', pl: 'Am używamy tylko z I. Z she potrzebne jest is.' }), are: tri('Are используется с you/we/they. С she нужна is.', 'Are використовується з you/we/they. З she потрібна is.', 'Are se usa con you/we/they. Con she necesitamos is.', { 'pt-BR': 'Are é usado com you/we/they. Com she precisamos de is.', vi: 'Are dùng với you/we/they. Với she cần is.', id: 'Are dipakai dengan you/we/they. Dengan she perlu is.', tr: 'Are, you/we/they ile kullanılır. She ile is gerekir.', pl: 'Are używamy z you/we/they. Z she potrzebne jest is.' }), 'no be': tri('She tired неправильно. Нужно She is tired.', 'She tired неправильно. Потрібно She is tired.', 'She tired es incorrecto. Necesitamos She is tired.', { 'pt-BR': 'She tired está incorreto. Precisamos de She is tired.', vi: 'She tired là sai. Cần She is tired.', id: 'She tired salah. Perlu She is tired.', tr: 'She tired yanlıştır. She is tired gerekir.', pl: 'She tired jest niepoprawne. Potrzebne jest She is tired.' }) }, retry: [tri('She = is.', 'She = is.', 'She = is.', { 'pt-BR': 'She = is.', vi: 'She = is.', id: 'She = is.', tr: 'She = is.', pl: 'She = is.' }), tri('She is tired.', 'She is tired.', 'She is tired.', { 'pt-BR': 'She is tired.', vi: 'She is tired.', id: 'She is tired.', tr: 'She is tired.', pl: 'She is tired.' }), tri('Подсказка: She is tired.', 'Підказка: She is tired.', 'Pista: She is tired.', { 'pt-BR': 'Dica: She is tired.', vi: 'Gợi ý: She is tired.', id: 'Petunjuk: She is tired.', tr: 'İpucu: She is tired.', pl: 'Podpowiedź: She is tired.' })], focusWords: ['she', 'is'] }),
    beStep({ id: 'be_present_easy_003', order: 3, difficulty: 'easy', targetSkill: 'they_are', sentence: 'They ___ busy.', translation: tri('Они заняты.', 'Вони зайняті.', 'Están ocupados.', { 'pt-BR': 'Eles estão ocupados.', vi: 'Họ bận.', id: 'Mereka sibuk.', tr: 'Onlar meşgul.', pl: 'Oni są zajęci.' }), options, correctAnswer: 'are', correctFeedback: tri('Да. They идет с are.', 'Так. They йде з are.', 'Sí. They va con are.', { 'pt-BR': 'Sim. They vai com are.', vi: 'Đúng. They đi với are.', id: 'Ya. They memakai are.', tr: 'Evet. They, are ile gider.', pl: 'Tak. They łączy się z are.' }), wrong: { am: tri('Am используется только с I. They требует are.', 'Am використовується тільки з I. They потребує are.', 'Am se usa solo con I. They necesita are.', { 'pt-BR': 'Am é usado só com I. They exige are.', vi: 'Am chỉ dùng với I. They cần are.', id: 'Am hanya dipakai dengan I. They membutuhkan are.', tr: 'Am sadece I ile kullanılır. They are ister.', pl: 'Am używamy tylko z I. They wymaga are.' }), is: tri('Is используется с he/she/it. С they нужна форма are.', 'Is використовується з he/she/it. З they потрібна форма are.', 'Is se usa con he/she/it. They es plural, por eso are.', { 'pt-BR': 'Is é usado com he/she/it. They é plural, por isso usamos are.', vi: 'Is dùng với he/she/it. They là số nhiều, nên dùng are.', id: 'Is dipakai dengan he/she/it. They jamak, jadi memakai are.', tr: 'Is, he/she/it ile kullanılır. They çoğuldur, bu yüzden are gerekir.', pl: 'Is używamy z he/she/it. They to liczba mnoga, dlatego potrzebne jest are.' }), 'no be': tri('They busy неправильно. Нужно They are busy.', 'They busy неправильно. Потрібно They are busy.', 'They busy es incorrecto. Necesitamos They are busy.', { 'pt-BR': 'They busy está incorreto. Precisamos de They are busy.', vi: 'They busy là sai. Cần They are busy.', id: 'They busy salah. Perlu They are busy.', tr: 'They busy yanlıştır. They are busy gerekir.', pl: 'They busy jest niepoprawne. Potrzebne jest They are busy.' }) }, retry: [tri('They = are.', 'They = are.', 'They = are.', { 'pt-BR': 'They = are.', vi: 'They = are.', id: 'They = are.', tr: 'They = are.', pl: 'They = are.' }), tri('They are busy.', 'They are busy.', 'They are busy.', { 'pt-BR': 'They are busy.', vi: 'They are busy.', id: 'They are busy.', tr: 'They are busy.', pl: 'They are busy.' }), tri('Подсказка: They are busy.', 'Підказка: They are busy.', 'Pista: They are busy.', { 'pt-BR': 'Dica: They are busy.', vi: 'Gợi ý: They are busy.', id: 'Petunjuk: They are busy.', tr: 'İpucu: They are busy.', pl: 'Podpowiedź: They are busy.' })], focusWords: ['they', 'are'] }),
    beStep({ id: 'be_present_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'you_are', sentence: 'You ___ right.', translation: tri('Ты прав.', 'Ти правий.', 'Tienes razón.', { 'pt-BR': 'Você está certo.', vi: 'Bạn đúng.', id: 'Kamu benar.', tr: 'Haklısın.', pl: 'Masz rację.' }), options, correctAnswer: 'are', correctFeedback: tri('Да. You всегда идет с are.', 'Так. You завжди йде з are.', 'Sí. You siempre va con are.', { 'pt-BR': 'Sim. You sempre vai com are.', vi: 'Đúng. You luôn đi với are.', id: 'Ya. You selalu memakai are.', tr: 'Evet. You her zaman are ile gider.', pl: 'Tak. You zawsze łączy się z are.' }), wrong: { am: tri('Am только с I. You требует are.', 'Am тільки з I. You потребує are.', 'Am solo con I. You necesita are.', { 'pt-BR': 'Am é só com I. You exige are.', vi: 'Am chỉ đi với I. You cần are.', id: 'Am hanya untuk I. You membutuhkan are.', tr: 'Am sadece I ile kullanılır. You are ister.', pl: 'Am jest tylko z I. You wymaga are.' }), is: tri('Is не используется с you. Нужно are.', 'Is не використовується з you. Потрібно are.', 'Is no se usa con you. Necesitamos are.', { 'pt-BR': 'Is não é usado com you. Precisamos de are.', vi: 'Is không dùng với you. Cần are.', id: 'Is tidak dipakai dengan you. Perlu are.', tr: 'Is, you ile kullanılmaz. Are gerekir.', pl: 'Is nie używa się z you. Potrzebne jest are.' }), 'no be': tri('You right неправильно. Нужно You are right.', 'You right неправильно. Потрібно You are right.', 'You right es incorrecto. Necesitamos You are right.', { 'pt-BR': 'You right está incorreto. Precisamos de You are right.', vi: 'You right là sai. Cần You are right.', id: 'You right salah. Perlu You are right.', tr: 'You right yanlıştır. You are right gerekir.', pl: 'You right jest niepoprawne. Potrzebne jest You are right.' }) }, retry: [tri('You = are.', 'You = are.', 'You = are.', { 'pt-BR': 'You = are.', vi: 'You = are.', id: 'You = are.', tr: 'You = are.', pl: 'You = are.' }), tri('Даже один человек: you are.', 'Навіть одна людина: you are.', 'Incluso una persona: you are.', { 'pt-BR': 'Mesmo uma pessoa: you are.', vi: 'Dù là một người: you are.', id: 'Bahkan satu orang: you are.', tr: 'Tek kişi olsa bile: you are.', pl: 'Nawet jedna osoba: you are.' }), tri('Подсказка: You are right.', 'Підказка: You are right.', 'Pista: You are right.', { 'pt-BR': 'Dica: You are right.', vi: 'Gợi ý: You are right.', id: 'Petunjuk: You are right.', tr: 'İpucu: You are right.', pl: 'Podpowiedź: You are right.' })], focusWords: ['you', 'are'] }),
    beStep({ id: 'be_present_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'it_is', sentence: 'It ___ cold today.', translation: tri('Сегодня холодно.', 'Сьогодні холодно.', 'Hace frío hoy.', { 'pt-BR': 'Está frio hoje.', vi: 'Hôm nay trời lạnh.', id: 'Hari ini dingin.', tr: 'Bugün hava soğuk.', pl: 'Dziś jest zimno.' }), options, correctAnswer: 'is', correctFeedback: tri('Да. It идет с is.', 'Так. It йде з is.', 'Sí. It va con is.', { 'pt-BR': 'Sim. It vai com is.', vi: 'Đúng. It đi với is.', id: 'Ya. It memakai is.', tr: 'Evet. It, is ile gider.', pl: 'Tak. It łączy się z is.' }), wrong: { am: tri('Am только с I. It требует is.', 'Am тільки з I. It потребує is.', 'Am solo con I. It necesita is.', { 'pt-BR': 'Am é só com I. It exige is.', vi: 'Am chỉ đi với I. It cần is.', id: 'Am hanya untuk I. It membutuhkan is.', tr: 'Am sadece I ile kullanılır. It is ister.', pl: 'Am jest tylko z I. It wymaga is.' }), are: tri('Are с you/we/they. С it нужна форма is.', 'Are з you/we/they. З it потрібна форма is.', 'Are con you/we/they. It es one thing/situation, por eso is.', { 'pt-BR': 'Are é com you/we/they. It é uma coisa ou situação, por isso usamos is.', vi: 'Are dùng với you/we/they. It là một vật/tình huống, nên dùng is.', id: 'Are untuk you/we/they. It adalah satu hal/situasi, jadi memakai is.', tr: 'Are, you/we/they ile kullanılır. It tek şey/durumdur, bu yüzden is gerekir.', pl: 'Are jest z you/we/they. It to jedna rzecz/sytuacja, dlatego używamy is.' }), 'no be': tri('It cold today неправильно. Нужно It is cold today.', 'It cold today неправильно. Потрібно It is cold today.', 'It cold today es incorrecto. Necesitamos It is cold today.', { 'pt-BR': 'It cold today está incorreto. Precisamos de It is cold today.', vi: 'It cold today là sai. Cần It is cold today.', id: 'It cold today salah. Perlu It is cold today.', tr: 'It cold today yanlıştır. It is cold today gerekir.', pl: 'It cold today jest niepoprawne. Potrzebne jest It is cold today.' }) }, retry: [tri('It = is.', 'It = is.', 'It = is.', { 'pt-BR': 'It = is.', vi: 'It = is.', id: 'It = is.', tr: 'It = is.', pl: 'It = is.' }), tri('It is cold.', 'It is cold.', 'It is cold.', { 'pt-BR': 'It is cold.', vi: 'It is cold.', id: 'It is cold.', tr: 'It is cold.', pl: 'It is cold.' }), tri('Подсказка: It is cold today.', 'Підказка: It is cold today.', 'Pista: It is cold today.', { 'pt-BR': 'Dica: It is cold today.', vi: 'Gợi ý: It is cold today.', id: 'Petunjuk: It is cold today.', tr: 'İpucu: It is cold today.', pl: 'Podpowiedź: It is cold today.' })], focusWords: ['it', 'is'] }),
    beStep({ id: 'be_present_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'we_are', sentence: 'We ___ ready to start.', translation: tri('Мы готовы начать.', 'Ми готові почати.', 'Estamos listos para empezar.', { 'pt-BR': 'Estamos prontos para começar.', vi: 'Chúng tôi đã sẵn sàng bắt đầu.', id: 'Kami siap untuk mulai.', tr: 'Başlamaya hazırız.', pl: 'Jesteśmy gotowi zacząć.' }), options, correctAnswer: 'are', correctFeedback: tri('Да. We идет с are.', 'Так. We йде з are.', 'Sí. We va con are.', { 'pt-BR': 'Sim. We vai com are.', vi: 'Đúng. We đi với are.', id: 'Ya. We memakai are.', tr: 'Evet. We, are ile gider.', pl: 'Tak. We łączy się z are.' }), wrong: { am: tri('Am только с I. We требует are.', 'Am тільки з I. We потребує are.', 'Am solo con I. We necesita are.', { 'pt-BR': 'Am é só com I. We exige are.', vi: 'Am chỉ đi với I. We cần are.', id: 'Am hanya untuk I. We membutuhkan are.', tr: 'Am sadece I ile kullanılır. We are ister.', pl: 'Am jest tylko z I. We wymaga are.' }), is: tri('Is с he/she/it. We требует are.', 'Is з he/she/it. We потребує are.', 'Is con he/she/it. We necesita are.', { 'pt-BR': 'Is é com he/she/it. We exige are.', vi: 'Is dùng với he/she/it. We cần are.', id: 'Is untuk he/she/it. We membutuhkan are.', tr: 'Is, he/she/it ile kullanılır. We are ister.', pl: 'Is jest z he/she/it. We wymaga are.' }), 'no be': tri('We ready неправильно. Нужно We are ready.', 'We ready неправильно. Потрібно We are ready.', 'We ready es incorrecto. Necesitamos We are ready.', { 'pt-BR': 'We ready está incorreto. Precisamos de We are ready.', vi: 'We ready là sai. Cần We are ready.', id: 'We ready salah. Perlu We are ready.', tr: 'We ready yanlıştır. We are ready gerekir.', pl: 'We ready jest niepoprawne. Potrzebne jest We are ready.' }) }, retry: [tri('We = are.', 'We = are.', 'We = are.', { 'pt-BR': 'We = are.', vi: 'We = are.', id: 'We = are.', tr: 'We = are.', pl: 'We = are.' }), tri('We are ready.', 'We are ready.', 'We are ready.', { 'pt-BR': 'We are ready.', vi: 'We are ready.', id: 'We are ready.', tr: 'We are ready.', pl: 'We are ready.' }), tri('Подсказка: We are ready to start.', 'Підказка: We are ready to start.', 'Pista: We are ready to start.', { 'pt-BR': 'Dica: We are ready to start.', vi: 'Gợi ý: We are ready to start.', id: 'Petunjuk: We are ready to start.', tr: 'İpucu: We are ready to start.', pl: 'Podpowiedź: We are ready to start.' })], focusWords: ['we', 'are'] }),
    beStep({ id: 'be_present_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'be_with_place_singular', sentence: 'She ___ at home.', translation: tri('Она дома.', 'Вона вдома.', 'Ella está en casa.', { 'pt-BR': 'Ela está em casa.', vi: 'Cô ấy đang ở nhà.', id: 'Dia ada di rumah.', tr: 'O evde.', pl: 'Ona jest w domu.' }), options, correctAnswer: 'is', correctFeedback: tri('Да. She идет с is. В английском “дома” не цепляется сразу к she.', 'Так. She йде з is. В англійській “вдома” не чіпляється одразу до she.', 'Sí. She va con is. At home es lugar, necesitamos be.', { 'pt-BR': 'Sim. She vai com is. At home é lugar, então precisamos de be.', vi: 'Đúng. She đi với is. At home là nơi chốn, nên cần be.', id: 'Ya. She memakai is. At home adalah tempat, jadi perlu be.', tr: 'Evet. She, is ile gider. At home yer bildirir, bu yüzden be gerekir.', pl: 'Tak. She łączy się z is. At home to miejsce, więc potrzebujemy be.' }), wrong: { am: tri('Am только с I. She требует is.', 'Am тільки з I. She потребує is.', 'Am solo con I. She necesita is.', { 'pt-BR': 'Am é só com I. She exige is.', vi: 'Am chỉ đi với I. She cần is.', id: 'Am hanya untuk I. She membutuhkan is.', tr: 'Am sadece I ile kullanılır. She is ister.', pl: 'Am jest tylko z I. She wymaga is.' }), are: tri('Are с you/we/they. She требует is.', 'Are з you/we/they. She потребує is.', 'Are con you/we/they. She necesita is.', { 'pt-BR': 'Are é com you/we/they. She exige is.', vi: 'Are dùng với you/we/they. She cần is.', id: 'Are untuk you/we/they. She membutuhkan is.', tr: 'Are, you/we/they ile kullanılır. She is ister.', pl: 'Are jest z you/we/they. She wymaga is.' }), 'no be': tri('She at home неправильно. Нужно She is at home.', 'She at home неправильно. Потрібно She is at home.', 'She at home es incorrecto. Necesitamos She is at home.', { 'pt-BR': 'She at home está incorreto. Precisamos de She is at home.', vi: 'She at home là sai. Cần She is at home.', id: 'She at home salah. Perlu She is at home.', tr: 'She at home yanlıştır. She is at home gerekir.', pl: 'She at home jest niepoprawne. Potrzebne jest She is at home.' }) }, retry: [tri('Она дома = She is at home.', 'Вона вдома = She is at home.', 'Ella en casa = She is at home.', { 'pt-BR': 'Ela está em casa = She is at home.', vi: 'Cô ấy ở nhà = She is at home.', id: 'Dia di rumah = She is at home.', tr: 'O evde = She is at home.', pl: 'Ona jest w domu = She is at home.' }), tri('She is.', 'She is.', 'She is.', { 'pt-BR': 'She is.', vi: 'She is.', id: 'She is.', tr: 'She is.', pl: 'She is.' }), tri('Подсказка: She is at home.', 'Підказка: She is at home.', 'Pista: She is at home.', { 'pt-BR': 'Dica: She is at home.', vi: 'Gợi ý: She is at home.', id: 'Petunjuk: She is at home.', tr: 'İpucu: She is at home.', pl: 'Podpowiedź: She is at home.' })], focusWords: ['she', 'is'] }),
    beStep({ id: 'be_present_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'be_with_place_plural', sentence: 'They ___ in the office.', translation: tri('Они в офисе.', 'Вони в офісі.', 'Están en la oficina.', { 'pt-BR': 'Eles estão no escritório.', vi: 'Họ đang ở văn phòng.', id: 'Mereka ada di kantor.', tr: 'Onlar ofiste.', pl: 'Oni są w biurze.' }), options, correctAnswer: 'are', correctFeedback: tri('Да. They идет с are. In the office добавляется уже после связки.', 'Так. They йде з are. In the office додається вже після зв’язки.', 'Sí. They va con are. In the office es lugar.', { 'pt-BR': 'Sim. They vai com are. In the office vem depois da ligação.', vi: 'Đúng. They đi với are. In the office thêm sau từ nối.', id: 'Ya. They memakai are. In the office ditambahkan setelah penghubung.', tr: 'Evet. They, are ile gider. In the office bağdan sonra eklenir.', pl: 'Tak. They łączy się z are. In the office dodajemy po łączniku.' }), wrong: { am: tri('Am только с I. They требует are.', 'Am тільки з I. They потребує are.', 'Am solo con I. They necesita are.', { 'pt-BR': 'Am é só com I. They exige are.', vi: 'Am chỉ đi với I. They cần are.', id: 'Am hanya untuk I. They membutuhkan are.', tr: 'Am sadece I ile kullanılır. They are ister.', pl: 'Am jest tylko z I. They wymaga are.' }), is: tri('Is с he/she/it. They требует are.', 'Is з he/she/it. They потребує are.', 'Is con he/she/it. They necesita are.', { 'pt-BR': 'Is é com he/she/it. They exige are.', vi: 'Is dùng với he/she/it. They cần are.', id: 'Is untuk he/she/it. They membutuhkan are.', tr: 'Is, he/she/it ile kullanılır. They are ister.', pl: 'Is jest z he/she/it. They wymaga are.' }), 'no be': tri('They in the office неправильно. Нужно They are in the office.', 'They in the office неправильно. Потрібно They are in the office.', 'They in the office es incorrecto. Necesitamos They are in the office.', { 'pt-BR': 'They in the office está incorreto. Precisamos de They are in the office.', vi: 'They in the office là sai. Cần They are in the office.', id: 'They in the office salah. Perlu They are in the office.', tr: 'They in the office yanlıştır. They are in the office gerekir.', pl: 'They in the office jest niepoprawne. Potrzebne jest They are in the office.' }) }, retry: [tri('They = are.', 'They = are.', 'They = are.', { 'pt-BR': 'They = are.', vi: 'They = are.', id: 'They = are.', tr: 'They = are.', pl: 'They = are.' }), tri('Они в офисе = They are in the office.', 'Вони в офісі = They are in the office.', 'Lugar también necesita be.', { 'pt-BR': 'Eles estão no escritório = They are in the office.', vi: 'Họ ở văn phòng = They are in the office.', id: 'Mereka di kantor = They are in the office.', tr: 'Onlar ofiste = They are in the office.', pl: 'Oni są w biurze = They are in the office.' }), tri('Подсказка: They are in the office.', 'Підказка: They are in the office.', 'Pista: They are in the office.', { 'pt-BR': 'Dica: They are in the office.', vi: 'Gợi ý: They are in the office.', id: 'Petunjuk: They are in the office.', tr: 'İpucu: They are in the office.', pl: 'Podpowiedź: They are in the office.' })], focusWords: ['they', 'are'] }),
    beStep({ id: 'be_present_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'be_with_place_object', sentence: 'The keys ___ on the table.', translation: tri('Ключи на столе.', 'Ключі на столі.', 'Las llaves están sobre la mesa.', { 'pt-BR': 'As chaves estão sobre a mesa.', vi: 'Những chiếc chìa khóa ở trên bàn.', id: 'Kunci-kunci ada di atas meja.', tr: 'Anahtarlar masanın üzerinde.', pl: 'Klucze są na stole.' }), options, correctAnswer: 'are', correctFeedback: tri('Да. The keys — это они, поэтому are.', 'Так. The keys — це вони, тому are.', 'Sí. The keys = plural/they. Por eso are.', { 'pt-BR': 'Sim. The keys é plural/they, por isso usamos are.', vi: 'Đúng. The keys là số nhiều/they, nên dùng are.', id: 'Ya. The keys itu jamak/they, jadi memakai are.', tr: 'Evet. The keys çoğuldur/they gibidir, bu yüzden are kullanılır.', pl: 'Tak. The keys to liczba mnoga/they, dlatego używamy are.' }), wrong: { am: tri('Am только с I. Keys — это “они”, поэтому are.', 'Am тільки з I. Keys — це “вони”, тому are.', 'Am solo con I. Keys es plural, por eso are.', { 'pt-BR': 'Am é só com I. Keys é plural, por isso usamos are.', vi: 'Am chỉ đi với I. Keys là số nhiều, nên dùng are.', id: 'Am hanya untuk I. Keys jamak, jadi memakai are.', tr: 'Am sadece I ile kullanılır. Keys çoğuldur, bu yüzden are gerekir.', pl: 'Am jest tylko z I. Keys to liczba mnoga, dlatego potrzebne jest are.' }), is: tri('Is нужен для одного предмета. Keys — это несколько ключей, поэтому are.', 'Is потрібен для одного предмета. Keys — це кілька ключів, тому are.', 'Is se usa para una cosa. Keys es plural, por eso are.', { 'pt-BR': 'Is é para uma coisa. Keys é plural, por isso usamos are.', vi: 'Is dùng cho một vật. Keys là số nhiều, nên dùng are.', id: 'Is untuk satu benda. Keys jamak, jadi memakai are.', tr: 'Is tek bir şey içindir. Keys çoğuldur, bu yüzden are gerekir.', pl: 'Is jest dla jednej rzeczy. Keys to liczba mnoga, dlatego używamy are.' }), 'no be': tri('The keys on the table неправильно как полное предложение. Нужно are.', 'The keys on the table неправильно як повне речення. Потрібно are.', 'The keys on the table es incorrecto como oración completa. Necesitamos are.', { 'pt-BR': 'The keys on the table está incorreto como frase completa. Precisamos de are.', vi: 'The keys on the table là sai nếu là câu đầy đủ. Cần are.', id: 'The keys on the table salah sebagai kalimat lengkap. Perlu are.', tr: 'The keys on the table tam cümle olarak yanlıştır. Are gerekir.', pl: 'The keys on the table jest niepoprawne jako pełne zdanie. Potrzebne jest are.' }) }, retry: [tri('Keys = they.', 'Keys = they.', 'Keys = they.', { 'pt-BR': 'Keys = they.', vi: 'Keys = they.', id: 'Keys = they.', tr: 'Keys = they.', pl: 'Keys = they.' }), tri('The keys are.', 'The keys are.', 'The keys are.', { 'pt-BR': 'The keys are.', vi: 'The keys are.', id: 'The keys are.', tr: 'The keys are.', pl: 'The keys are.' }), tri('Подсказка: The keys are on the table.', 'Підказка: The keys are on the table.', 'Pista: The keys are on the table.', { 'pt-BR': 'Dica: The keys are on the table.', vi: 'Gợi ý: The keys are on the table.', id: 'Petunjuk: The keys are on the table.', tr: 'İpucu: The keys are on the table.', pl: 'Podpowiedź: The keys are on the table.' })], focusWords: ['keys', 'are'] }),
    beStep({ id: 'be_present_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'singular_noun_is', sentence: 'The lesson ___ difficult.', translation: tri('Урок сложный.', 'Урок складний.', 'La lección es difícil.', { 'pt-BR': 'A lição é difícil.', vi: 'Bài học này khó.', id: 'Pelajaran ini sulit.', tr: 'Ders zor.', pl: 'Lekcja jest trudna.' }), options, correctAnswer: 'is', correctFeedback: tri('Да. The lesson — это один урок. Один предмет идет с is.', 'Так. The lesson — це один урок. Один предмет іде з is.', 'Sí. The lesson = one thing/it. Una cosa va con is.', { 'pt-BR': 'Sim. The lesson é uma coisa só/it. Uma coisa vai com is.', vi: 'Đúng. The lesson là một vật/it. Một vật đi với is.', id: 'Ya. The lesson adalah satu hal/it. Satu hal memakai is.', tr: 'Evet. The lesson tek bir şey/it gibidir. Tek şey is ile gider.', pl: 'Tak. The lesson to jedna rzecz/it. Jedna rzecz łączy się z is.' }), wrong: { am: tri('Am только с I. The lesson — один урок, поэтому is.', 'Am тільки з I. The lesson — один урок, тому is.', 'Am solo con I. The lesson es one thing, por eso is.', { 'pt-BR': 'Am é só com I. The lesson é uma coisa só, por isso usamos is.', vi: 'Am chỉ đi với I. The lesson là một bài học, nên dùng is.', id: 'Am hanya untuk I. The lesson adalah satu hal, jadi memakai is.', tr: 'Am sadece I ile kullanılır. The lesson tek şeydir, bu yüzden is gerekir.', pl: 'Am jest tylko z I. The lesson to jedna rzecz, dlatego używamy is.' }), are: tri('Are нужно для нескольких людей или предметов. The lesson — один урок, поэтому is.', 'Are потрібне для кількох людей або предметів. The lesson — один урок, тому is.', 'Are es para plural. The lesson es singular, por eso is.', { 'pt-BR': 'Are é para plural. The lesson é singular, por isso usamos is.', vi: 'Are dùng cho số nhiều. The lesson là số ít, nên dùng is.', id: 'Are untuk jamak. The lesson tunggal, jadi memakai is.', tr: 'Are çoğul içindir. The lesson tekildir, bu yüzden is gerekir.', pl: 'Are jest dla liczby mnogiej. The lesson jest w liczbie pojedynczej, dlatego używamy is.' }), 'no be': tri('The lesson difficult неправильно. Нужно is.', 'The lesson difficult неправильно. Потрібно is.', 'The lesson difficult es incorrecto. Necesitamos is.', { 'pt-BR': 'The lesson difficult está incorreto. Precisamos de is.', vi: 'The lesson difficult là sai. Cần is.', id: 'The lesson difficult salah. Perlu is.', tr: 'The lesson difficult yanlıştır. Is gerekir.', pl: 'The lesson difficult jest niepoprawne. Potrzebne jest is.' }) }, retry: [tri('The lesson = it.', 'The lesson = it.', 'The lesson = it.', { 'pt-BR': 'The lesson = it.', vi: 'The lesson = it.', id: 'The lesson = it.', tr: 'The lesson = it.', pl: 'The lesson = it.' }), tri('Один урок = is.', 'Один урок = is.', 'One thing = is.', { 'pt-BR': 'Uma lição = is.', vi: 'Một bài học = is.', id: 'Satu pelajaran = is.', tr: 'Bir ders = is.', pl: 'Jedna lekcja = is.' }), tri('Подсказка: The lesson is difficult.', 'Підказка: The lesson is difficult.', 'Pista: The lesson is difficult.', { 'pt-BR': 'Dica: The lesson is difficult.', vi: 'Gợi ý: The lesson is difficult.', id: 'Petunjuk: The lesson is difficult.', tr: 'İpucu: The lesson is difficult.', pl: 'Podpowiedź: The lesson is difficult.' })], focusWords: ['lesson', 'is'] }),
    beStep({ id: 'be_present_mixed_002', order: 11, difficulty: 'mixed_review', targetSkill: 'be_question_order', sentence: '___ she ready?', translation: tri('Она готова?', 'Вона готова?', 'Está lista?', { 'pt-BR': 'Ela está pronta?', vi: 'Cô ấy sẵn sàng chưa?', id: 'Apakah dia siap?', tr: 'O hazır mı?', pl: 'Czy ona jest gotowa?' }), options: ['Am', 'Is', 'Are', 'Does'], correctAnswer: 'Is', correctFeedback: tri('Да. She идет с is. В вопросе is выходит вперед.', 'Так. She йде з is. У питанні is виходить вперед.', 'Sí. She va con is. En pregunta, is va al principio.', { 'pt-BR': 'Sim. She vai com is. Na pergunta, is vai para a frente.', vi: 'Đúng. She đi với is. Trong câu hỏi, is đi lên đầu.', id: 'Ya. She memakai is. Dalam pertanyaan, is maju ke depan.', tr: 'Evet. She, is ile gider. Soruda is öne gelir.', pl: 'Tak. She łączy się z is. W pytaniu is idzie na początek.' }), wrong: { Am: tri('Am только с I. С she нужна Is.', 'Am тільки з I. З she потрібна Is.', 'Am solo con I. Con she necesitamos Is.', { 'pt-BR': 'Am é só com I. Com she precisamos de Is.', vi: 'Am chỉ đi với I. Với she cần Is.', id: 'Am hanya untuk I. Dengan she perlu Is.', tr: 'Am sadece I ile kullanılır. She ile Is gerekir.', pl: 'Am jest tylko z I. Z she potrzebne jest Is.' }), Are: tri('Are с you/we/they. С she нужна Is.', 'Are з you/we/they. З she потрібна Is.', 'Are con you/we/they. Con she necesitamos Is.', { 'pt-BR': 'Are é com you/we/they. Com she precisamos de Is.', vi: 'Are dùng với you/we/they. Với she cần Is.', id: 'Are untuk you/we/they. Dengan she perlu Is.', tr: 'Are, you/we/they ile kullanılır. She ile Is gerekir.', pl: 'Are jest z you/we/they. Z she potrzebne jest Is.' }), Does: tri('Ready здесь прилагательное, поэтому Does не подходит. Мы спрашиваем “она готова?”: Is she ready?', 'Does тут не підходить: ми питаємо “вона готова?”, тому Is she ready?', 'Does se usa con verbos normales. Ready es adjective, por eso Is she ready?', { 'pt-BR': 'Does é usado com verbos normais. Ready é adjetivo, por isso perguntamos: Is she ready?', vi: 'Does dùng với động từ thường. Ready là tính từ, nên hỏi: Is she ready?', id: 'Does dipakai dengan verba biasa. Ready adalah adjektiva, jadi: Is she ready?', tr: 'Does normal fiillerle kullanılır. Ready sıfattır, bu yüzden: Is she ready?', pl: 'Does używamy ze zwykłymi czasownikami. Ready to przymiotnik, dlatego: Is she ready?' }) }, retry: [tri('She is ready -> Is she ready?', 'She is ready -> Is she ready?', 'She is ready -> Is she ready?', { 'pt-BR': 'She is ready -> Is she ready?', vi: 'She is ready -> Is she ready?', id: 'She is ready -> Is she ready?', tr: 'She is ready -> Is she ready?', pl: 'She is ready -> Is she ready?' }), tri('В вопросе is ставим перед she.', 'У питанні is ставимо перед she.', 'Pregunta con be: be al principio.', { 'pt-BR': 'Em pergunta com be, colocamos be no início.', vi: 'Trong câu hỏi với be, đặt be lên đầu.', id: 'Dalam pertanyaan dengan be, be berada di awal.', tr: 'Be ile soruda be başa gelir.', pl: 'W pytaniu z be stawiamy be na początku.' }), tri('Подсказка: Is she ready?', 'Підказка: Is she ready?', 'Pista: Is she ready?', { 'pt-BR': 'Dica: Is she ready?', vi: 'Gợi ý: Is she ready?', id: 'Petunjuk: Is she ready?', tr: 'İpucu: Is she ready?', pl: 'Podpowiedź: Is she ready?' })], focusWords: ['is', 'she'] }),
    beStep({ id: 'be_present_mixed_003', order: 12, difficulty: 'mixed_review', targetSkill: 'mixed_be_agreement', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Elige la pareja correcta.', { 'pt-BR': 'Escolha o par correto.', vi: 'Chọn cặp đúng.', id: 'Pilih pasangan yang benar.', tr: 'Doğru çifti seç.', pl: 'Wybierz poprawną parę.' }), options: ['I am ready / They are ready', 'I is ready / They are ready', 'I am ready / They is ready', 'I ready / They ready'], correctAnswer: 'I am ready / They are ready', correctFeedback: tri('Да. I идет с am. They идет с are.', 'Так. I йде з am. They йде з are.', 'Sí. I va con am. They va con are.', { 'pt-BR': 'Sim. I vai com am. They vai com are.', vi: 'Đúng. I đi với am. They đi với are.', id: 'Ya. I memakai am. They memakai are.', tr: 'Evet. I am ile, They are ile gider.', pl: 'Tak. I łączy się z am. They łączy się z are.' }), wrong: { 'I is ready / They are ready': tri('They are правильно, но I is неправильно. С I всегда am.', 'They are правильно, але I is неправильно. З I завжди am.', 'They are está bien, pero I is es incorrecto. Con I siempre am.', { 'pt-BR': 'They are está correto, mas I is está incorreto. Com I sempre usamos am.', vi: 'They are đúng, nhưng I is sai. Với I luôn dùng am.', id: 'They are benar, tetapi I is salah. Dengan I selalu am.', tr: 'They are doğru, ama I is yanlıştır. I ile her zaman am kullanılır.', pl: 'They are jest poprawne, ale I is jest niepoprawne. Z I zawsze używamy am.' }), 'I am ready / They is ready': tri('I am правильно, но They is неправильно. They требует are.', 'I am правильно, але They is неправильно. They потребує are.', 'I am está bien, pero They is es incorrecto. They necesita are.', { 'pt-BR': 'I am está correto, mas They is está incorreto. They precisa de are.', vi: 'I am đúng, nhưng They is sai. They cần are.', id: 'I am benar, tetapi They is salah. They membutuhkan are.', tr: 'I am doğru, ama They is yanlıştır. They are ister.', pl: 'I am jest poprawne, ale They is jest niepoprawne. They wymaga are.' }), 'I ready / They ready': tri('В обеих фразах не хватает связки: I am ready / They are ready.', 'В обох фразах бракує зв’язки: I am ready / They are ready.', 'En ambas frases falta be: I am ready / They are ready.', { 'pt-BR': 'Nas duas frases falta be: I am ready / They are ready.', vi: 'Cả hai câu đều thiếu be: I am ready / They are ready.', id: 'Di kedua frasa kurang be: I am ready / They are ready.', tr: 'İki ifadede de be eksik: I am ready / They are ready.', pl: 'W obu frazach brakuje be: I am ready / They are ready.' }) }, retry: [tri('I = am.', 'I = am.', 'I = am.', { 'pt-BR': 'I = am.', vi: 'I = am.', id: 'I = am.', tr: 'I = am.', pl: 'I = am.' }), tri('They = are.', 'They = are.', 'They = are.', { 'pt-BR': 'They = are.', vi: 'They = are.', id: 'They = are.', tr: 'They = are.', pl: 'They = are.' }), tri('Подсказка: I am ready / They are ready.', 'Підказка: I am ready / They are ready.', 'Pista: I am ready / They are ready.', { 'pt-BR': 'Dica: I am ready / They are ready.', vi: 'Gợi ý: I am ready / They are ready.', id: 'Petunjuk: I am ready / They are ready.', tr: 'İpucu: I am ready / They are ready.', pl: 'Podpowiedź: I am ready / They are ready.' })], focusWords: ['am', 'are'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['i_am_error', 'he_she_it_is_error', 'you_we_they_are_error', 'missing_be_before_adjective', 'missing_be_before_place', 'singular_plural_be_confusion', 'question_order_be_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем, о ком говорим, и нужную форму am/is/are.', 'Звичайне пояснення: показуємо, про кого говоримо, і потрібну форму am/is/are.', 'Explicación normal: mostramos subject y la forma correcta de be.', { 'pt-BR': 'Explicação normal: mostramos o sujeito e a forma correta de be.', vi: 'Giải thích thường: hiển thị chủ ngữ và dạng be đúng.', id: 'Penjelasan biasa: tampilkan subjek dan bentuk be yang benar.', tr: 'Normal açıklama: özneyi ve doğru be biçimini gösteriyoruz.', pl: 'Zwykłe wyjaśnienie: pokazujemy podmiot i poprawną formę be.' }),
    depth2: tri('Проще: I / he-she-it / you-we-they.', 'Простіше: I / he-she-it / you-we-they.', 'Más simple: I / he-she-it / you-we-they.', { 'pt-BR': 'Mais simples: I / he-she-it / you-we-they.', vi: 'Đơn giản hơn: I / he-she-it / you-we-they.', id: 'Lebih sederhana: I / he-she-it / you-we-they.', tr: 'Daha basit: I / he-she-it / you-we-they.', pl: 'Prościej: I / he-she-it / you-we-they.' }),
    depth3: tri('Готовая пара: I am, she is, they are.', 'Готова пара: I am, she is, they are.', 'Pareja lista: I am, she is, they are.', { 'pt-BR': 'Par pronto: I am, she is, they are.', vi: 'Cặp có sẵn: I am, she is, they are.', id: 'Pasangan siap pakai: I am, she is, they are.', tr: 'Hazır çift: I am, she is, they are.', pl: 'Gotowa para: I am, she is, they are.' }),
    depth4: tri('Почти подсказка: прямо указываем am/is/are.', 'Майже підказка: прямо вказуємо am/is/are.', 'Casi pista: indicamos am/is/are directamente.', { 'pt-BR': 'Quase uma dica: indicamos am/is/are diretamente.', vi: 'Gần như là gợi ý: chỉ thẳng am/is/are.', id: 'Hampir seperti petunjuk: langsung tunjukkan am/is/are.', tr: 'Neredeyse ipucu: am/is/are biçimini doğrudan gösteriyoruz.', pl: 'Prawie podpowiedź: wskazujemy am/is/are wprost.' }),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. I = am. He/she/it или один предмет = is. You/we/they или несколько предметов = are.', 'Зупинись. I = am. He/she/it або один предмет = is. You/we/they або кілька предметів = are.', 'Detente. I = am. He/she/it/one thing = is. You/we/they/many things = are.', { 'pt-BR': 'Pare. I = am. He/she/it ou uma coisa = is. You/we/they ou várias coisas = are.', vi: 'Dừng lại. I = am. He/she/it hoặc một vật = is. You/we/they hoặc nhiều vật = are.', id: 'Berhenti. I = am. He/she/it atau satu benda = is. You/we/they atau banyak benda = are.', tr: 'Dur. I = am. He/she/it ya da tek şey = is. You/we/they ya da çok şey = are.', pl: 'Zatrzymaj się. I = am. He/she/it albo jedna rzecz = is. You/we/they albo wiele rzeczy = are.' }) },
    afterThreeWrongInSameExercise: { action: 'show_subject_be_hint_then_retry', card: tri('Система покажет, о ком говорится, но не выберет am/is/are за пользователя.', 'Система покаже, про кого йдеться, але не вибере am/is/are за користувача.', 'El sistema mostrará el grupo del subject, pero no elegirá la forma be.', { 'pt-BR': 'O sistema vai mostrar o grupo do sujeito, mas não vai escolher a forma de be pelo usuário.', vi: 'Hệ thống sẽ hiển thị nhóm chủ ngữ, nhưng không chọn dạng be thay cho người dùng.', id: 'Sistem akan menunjukkan kelompok subjek, tetapi tidak akan memilih bentuk be untuk pengguna.', tr: 'Sistem özne grubunu gösterecek, ama be biçimini kullanıcının yerine seçmeyecek.', pl: 'System pokaże grupę podmiotu, ale nie wybierze formy be za użytkownika.' }) },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери, о ком говорим. Потом вернемся к am/is/are.', 'Режим підказки: спочатку обери, про кого говоримо. Потім повернемося до am/is/are.', 'Modo guiado: primero elige el grupo del subject. Luego volvemos a am/is/are.', { 'pt-BR': 'Modo guiado: primeiro escolha de quem estamos falando. Depois voltamos para am/is/are.', vi: 'Chế độ gợi ý: trước tiên chọn đang nói về ai. Sau đó quay lại am/is/are.', id: 'Mode panduan: pertama pilih siapa yang sedang dibicarakan. Lalu kembali ke am/is/are.', tr: 'İpuculu mod: önce kimden bahsettiğimizi seç. Sonra am/is/are konusuna döneriz.', pl: 'Tryb z podpowiedzią: najpierw wybierz, o kim mówimy. Potem wrócimy do am/is/are.' }) },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_be_present_001', prompt: tri('Какое слово ставим после I?', 'Яке слово ставимо після I?', 'I va con qué forma de be?', { 'pt-BR': 'Qual palavra colocamos depois de I?', vi: 'Sau I đặt từ nào?', id: 'Kata apa yang kita pakai setelah I?', tr: 'I sonrasında hangi kelime gelir?', pl: 'Jakie słowo stawiamy po I?' }), options: ['am', 'is', 'are'], correctIndex: 0, thenReturnToExerciseId: 'be_present_easy_001' },
      { id: 'guided_be_present_002', prompt: tri('She относится к какой группе?', 'She належить до якої групи?', 'She pertenece a qué grupo?', { 'pt-BR': 'She pertence a qual grupo?', vi: 'She thuộc nhóm nào?', id: 'She termasuk kelompok mana?', tr: 'She hangi gruba girer?', pl: 'Do której grupy należy She?' }), options: ['I', 'he/she/it', 'they'], correctIndex: 1, thenReturnToExerciseId: 'be_present_easy_002' },
      { id: 'guided_be_present_003', prompt: tri('The keys — это один предмет или несколько?', 'The keys — це один предмет чи кілька?', 'The keys es una cosa singular o plural?', { 'pt-BR': 'The keys é uma coisa só ou plural?', vi: 'The keys là một vật hay số nhiều?', id: 'The keys itu satu benda atau jamak?', tr: 'The keys tek bir şey mi, çoğul mu?', pl: 'The keys to jedna rzecz czy liczba mnoga?' }), options: ['one thing', 'plural'], correctIndex: 1, thenReturnToExerciseId: 'be_present_contrast_006' },
      { id: 'guided_be_present_004', prompt: tri('В вопросе is выходит перед she?', 'У питанні is виходить перед she?', 'En pregunta con be, be va al principio?', { 'pt-BR': 'Na pergunta, is vai antes de she?', vi: 'Trong câu hỏi, is đứng trước she không?', id: 'Dalam pertanyaan, apakah is maju sebelum she?', tr: 'Soruda is, she önüne gelir mi?', pl: 'Czy w pytaniu is idzie przed she?' }), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'be_present_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'to-be',
    microDiagnosisId: 'to_be_present_agreement',
    diagnosisLabel: tri('Am / Is / Are в настоящем', 'Am / Is / Are у теперішньому', 'Am / Is / Are en presente', { 'pt-BR': 'Am / Is / Are no presente', vi: 'Am / Is / Are ở hiện tại', id: 'Am / Is / Are dalam bentuk sekarang', tr: 'Şimdiki zamanda Am / Is / Are', pl: 'Am / Is / Are w czasie teraźniejszym' }),
    contrastSet: ['am', 'is', 'are', 'no be'],
    focusWords: ['am', 'is', 'are'],
    focusPatterns: ['i_am', 'she_is', 'they_are', 'you_are', 'it_is', 'we_are', 'be_with_place_singular', 'be_with_place_plural', 'singular_noun_is', 'be_question_order', 'mixed_be_agreement'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_to_be_present_agreement_start',
    answer: 'diagnosis_training_to_be_present_agreement_answer',
    mastery: 'diagnosis_training_to_be_present_agreement_mastery',
    recovery: 'diagnosis_training_to_be_present_agreement_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'to-be', microDiagnosisId: 'to_be_present_agreement', contrastSet: ['am', 'is', 'are', 'no be'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logSubjectGroup: true, logBeForm: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=to-be&microDiagnosisId=to_be_present_agreement',
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
