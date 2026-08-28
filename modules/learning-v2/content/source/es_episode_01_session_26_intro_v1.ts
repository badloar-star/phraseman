import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 26 "Много: и признак меняется" / plural_agreement, builtOn: [3, 25],
// recalls: [3, 25]): интро НЕ упоминает "сессию/урок/главу/курс/экран/
// карточку" ни в каком контексте — вместо этого прямо говорит о том, что
// признак меняется по числу так же, как уже менялся по роду. Каждое
// bodyRuns собрано ИЗ ТОГО ЖЕ текста, что и body, — никаких отдельных
// черновиков (Lesson 2 этого конвейера, уже ловилась в сессиях 17/24).
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_26_WORD_FIRST_TITLE = L({
  ru: 'Много: и признак меняется',
  uk: 'Багато: і ознака змінюється',
  es: 'Many: the quality changes too',
  'pt-BR': 'Muitos: a qualidade também muda',
  vi: 'Nhiều: đặc điểm cũng đổi',
  id: 'Banyak: sifatnya juga berubah',
  tr: 'Çok: nitelik de değişir',
  pl: 'Wielu: cecha też się zmienia',
});

export const ES_EPISODE_01_SESSION_26_WORD_FIRST_SUMMARY = L({
  ru: 'Признак согласуется не только с родом, но и с числом — окончание -s или -es добавляется, когда речь о нескольких.',
  uk: 'Ознака узгоджується не лише з родом, а й із числом — закінчення -s або -es додається, коли йдеться про кількох.',
  es: 'The quality agrees not only with gender, but with number too — the ending -s or -es is added when talking about several.',
  'pt-BR': 'A qualidade concorda não só com o gênero, mas também com o número — a terminação -s ou -es é adicionada ao falar de vários.',
  vi: 'Đặc điểm hòa hợp không chỉ với giống, mà cả với số — đuôi -s hoặc -es được thêm vào khi nói về nhiều người.',
  id: 'Sifat itu sesuai bukan hanya dengan gender, tetapi juga dengan jumlah — akhiran -s atau -es ditambahkan saat membicarakan beberapa.',
  tr: 'Nitelik yalnızca cinsiyete değil, sayıya da uyum sağlar — birden fazlasından bahsederken -s veya -es eki eklenir.',
  pl: 'Cecha zgadza się nie tylko z rodzajem, ale i z liczbą — końcówkę -s lub -es dodaje się, gdy mowa o kilku.',
});

export const ES_EPISODE_01_SESSION_26_WORD_FIRST_GOAL = L({
  ru: 'Правильно согласовать признак сразу по двум осям — роду и числу — говоря о группе людей или предметов.',
  uk: 'Правильно узгодити ознаку одразу за двома осями — родом і числом — говорячи про групу людей чи предметів.',
  es: 'Correctly agree a quality on two axes at once — gender and number — when talking about a group of people or things.',
  'pt-BR': 'Concordar corretamente uma qualidade em dois eixos ao mesmo tempo — gênero e número — ao falar de um grupo de pessoas ou coisas.',
  vi: 'Hòa hợp đúng một đặc điểm trên hai trục cùng lúc — giống và số — khi nói về một nhóm người hay vật.',
  id: 'Menyesuaikan sifat dengan benar pada dua sumbu sekaligus — gender dan jumlah — saat membicarakan kelompok orang atau benda.',
  tr: 'Bir grup insan ya da şey hakkında konuşurken bir niteliği aynı anda iki eksende — cinsiyet ve sayı — doğru şekilde uyumlu hale getirmek.',
  pl: 'Poprawnie dopasować cechę na dwóch osiach naraz — rodzaju i liczby — mówiąc o grupie ludzi lub rzeczy.',
});

const CONCEPT_BODY = L({
  ru: 'Признак уже умел меняться по роду: bonito становился bonita. Теперь он учится меняться ещё и по числу: rápido становится rápidos, если речь о нескольких мужского рода. Обе оси работают независимо: сначала выбирают род, потом добавляют число. Признак согласуется и с родом, и с числом одновременно.',
  uk: 'Ознака вже вміла змінюватися за родом: bonito ставало bonita. Тепер вона вчиться змінюватися ще й за числом: rápido стає rápidos, якщо йдеться про кількох чоловічого роду. Обидві осі працюють незалежно: спершу обирають рід, потім додають число. Ознака узгоджується і з родом, і з числом одночасно.',
  es: 'The quality already knew how to change by gender: bonito became bonita. Now it learns to change by number too: rápido becomes rápidos when talking about several masculine people. Both axes work independently: gender is chosen first, then number is added. The quality agrees with gender and number at once.',
  'pt-BR': 'A qualidade já sabia mudar por gênero: bonito virava bonita. Agora ela aprende a mudar também por número: rápido vira rápidos ao falar de vários homens. Os dois eixos funcionam de forma independente: primeiro se escolhe o gênero, depois se adiciona o número. A qualidade concorda com gênero e número ao mesmo tempo.',
  vi: 'Đặc điểm đã biết đổi theo giống: bonito trở thành bonita. Giờ nó học cách đổi theo số nữa: rápido trở thành rápidos khi nói về nhiều người giống đực. Cả hai trục hoạt động độc lập: giống được chọn trước, rồi số được thêm vào. Đặc điểm hòa hợp với cả giống lẫn số cùng lúc.',
  id: 'Sifat itu sudah tahu cara berubah menurut gender: bonito menjadi bonita. Sekarang ia belajar berubah menurut jumlah: rápido menjadi rápidos untuk beberapa orang maskulin. Kedua sumbu bekerja independen: gender dulu, lalu jumlah. Sifat sesuai dengan gender dan jumlah sekaligus.',
  tr: 'Nitelik zaten cinsiyete göre değişmeyi biliyordu: bonito, bonita oluyordu. Şimdi sayıya göre de değişmeyi öğreniyor: rápido, birkaç eril kişiden bahsederken rápidos olur. İki eksen birbirinden bağımsız çalışır: önce cinsiyet seçilir, sonra sayı eklenir. Nitelik hem cinsiyete hem sayıya aynı anda uyum sağlar.',
  pl: 'Cecha już umiała zmieniać się przez rodzaj: bonito stawało się bonita. Teraz uczy się zmieniać też przez liczbę: rápido staje się rápidos, gdy mowa o kilku mężczyznach. Obie osie działają niezależnie: najpierw wybiera się rodzaj, potem dodaje liczbę. Cecha zgadza się jednocześnie z rodzajem i liczbą.',
});

const FORMULA_BODY = L({
  ru: 'Формула проста: признак на гласную получает -s во множественном числе — rápido → rápidos, bonita → bonitas. Признак на согласную получает -es — fácil → fáciles: просто -s звучало бы неудобно. Связка тоже меняется: somos вместо soy. Гласная даёт -s, согласная — -es.',
  uk: 'Формула проста: ознака на голосну отримує -s у множині — rápido → rápidos, bonita → bonitas. Ознака на приголосну отримує -es — fácil → fáciles: просто -s звучало б незручно. Зв’язка теж змінюється: somos замість soy. Голосна дає -s, приголосна — -es.',
  es: 'The formula is simple: a vowel-ending quality gets -s in the plural — rápido → rápidos, bonita → bonitas. A consonant-ending quality gets -es — fácil → fáciles: plain -s would sound awkward. The linking word changes too: somos instead of soy. A vowel gives -s, a consonant gives -es.',
  'pt-BR': 'A fórmula é simples: qualidade terminada em vogal recebe -s no plural — rápido → rápidos, bonita → bonitas. Terminada em consoante recebe -es — fácil → fáciles: só -s soaria estranho. A ligação também muda: somos em vez de soy. Vogal dá -s, consoante dá -es.',
  vi: 'Công thức đơn giản: đặc điểm kết thúc bằng nguyên âm nhận -s ở số nhiều — rápido → rápidos, bonita → bonitas. Kết thúc bằng phụ âm nhận -es — fácil → fáciles: chỉ -s sẽ nghe khó xử. Từ nối cũng đổi: somos thay vì soy. Nguyên âm cho -s, phụ âm cho -es.',
  id: 'Rumusnya sederhana: sifat berakhiran vokal mendapat -s dalam bentuk jamak — rápido → rápidos, bonita → bonitas. Berakhiran konsonan mendapat -es — fácil → fáciles: -s saja akan terdengar janggal. Kata penghubung juga berubah: somos, bukan soy. Vokal memberi -s, konsonan memberi -es.',
  tr: 'Formül basittir: sesli harfle biten nitelik çoğulda -s alır — rápido → rápidos, bonita → bonitas. Ünsüzle biten -es alır — fácil → fáciles: sadece -s garip duyulurdu. Bağlaç da değişir: soy yerine somos. Sesli harf -s verir, ünsüz -es verir.',
  pl: 'Formuła jest prosta: cecha na samogłoskę otrzymuje -s w liczbie mnogiej — rápido → rápidos, bonita → bonitas. Na spółgłoskę otrzymuje -es — fácil → fáciles: samo -s brzmiałoby niezręcznie. Łącznik też się zmienia: somos zamiast soy. Samogłoska daje -s, spółgłoska -es.',
});

const TRAP_BODY = L({
  ru: 'Частая ошибка — забыть про число и оставить признак в единственном числе рядом с somos: Somos rápido вместо Somos rápidos звучит неверно. Вторая ловушка — поставить -s вместо нужного -es на согласную концовку признака. Проверка простая: признак должен совпадать со связкой и по роду, и по числу одновременно.',
  uk: 'Часта помилка — забути про число і лишити ознаку в однині поряд із somos: Somos rápido замість Somos rápidos звучить неправильно. Друга пастка — поставити -s замість потрібного -es на приголосну концовку ознаки. Перевірка проста: ознака має збігатися зі зв’язкою і за родом, і за числом одночасно.',
  es: 'A common mistake is forgetting about number and leaving the quality singular next to somos: Somos rápido instead of Somos rápidos sounds wrong. The second trap is putting -s instead of the needed -es on a consonant ending. The check is simple: the quality must match the linking word in both gender and number.',
  'pt-BR': 'Um erro comum é esquecer o número e deixar a qualidade no singular ao lado de somos: Somos rápido em vez de Somos rápidos soa errado. A segunda armadilha é usar -s em vez do -es necessário numa terminação em consoante. A checagem é simples: a qualidade precisa combinar com a ligação em gênero e número.',
  vi: 'Lỗi thường gặp là quên số nhiều và để đặc điểm ở số ít bên cạnh somos: Somos rápido thay vì Somos rápidos nghe sai. Bẫy thứ hai là dùng -s thay vì -es cần thiết cho đuôi phụ âm. Cách kiểm tra đơn giản: đặc điểm phải khớp với từ nối cả về giống lẫn số.',
  id: 'Kesalahan umum adalah lupa jumlah dan membiarkan sifat tunggal di samping somos: Somos rápido, bukan Somos rápidos, terdengar salah. Jebakan kedua: memakai -s, bukan -es yang diperlukan, pada akhiran konsonan. Sifat harus cocok dengan kata penghubung dalam gender dan jumlah.',
  tr: 'Yaygın bir hata, sayıyı unutup niteliği somos yanında tekil bırakmaktır: Somos rápidos yerine Somos rápido yanlış duyulur. İkinci tuzak, ünsüz sonuna gereken -es yerine -s koymaktır. Kontrol basittir: nitelik, bağlaçla hem cinsiyette hem sayıda eşleşmelidir.',
  pl: 'Częsty błąd to zapomnienie o liczbie i pozostawienie cechy w liczbie pojedynczej obok somos: Somos rápido zamiast Somos rápidos brzmi źle. Druga pułapka to postawienie -s zamiast potrzebnego -es na końcówce spółgłoskowej. Sprawdzenie jest proste: cecha musi zgadzać się z łącznikiem rodzajem i liczbą.',
});

export const ES_EPISODE_01_SESSION_26_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Признак теперь меняется и по числу',
      uk: 'Ознака тепер змінюється і за числом',
      es: 'The quality now changes by number too',
      'pt-BR': 'A qualidade agora muda por número também',
      vi: 'Đặc điểm giờ cũng đổi theo số',
      id: 'Sifat sekarang juga berubah menurut jumlah',
      tr: 'Nitelik artık sayıya göre de değişir',
      pl: 'Cecha teraz zmienia się też przez liczbę',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Признак уже умел меняться по роду: bonito становился bonita. Теперь он учится меняться ещё и по числу: rápido становится ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', если речь о нескольких мужского рода. Обе оси работают независимо: сначала выбирают род, потом добавляют число. Признак согласуется и с родом, и с числом одновременно.', semantic: 'explanation' }),
      uk: R({ text: 'Ознака вже вміла змінюватися за родом: bonito ставало bonita. Тепер вона вчиться змінюватися ще й за числом: rápido стає ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', якщо йдеться про кількох чоловічого роду. Обидві осі працюють незалежно: спершу обирають рід, потім додають число. Ознака узгоджується і з родом, і з числом одночасно.', semantic: 'explanation' }),
      es: R({ text: 'The quality already knew how to change by gender: bonito became bonita. Now it learns to change by number too: rápido becomes ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ' when talking about several masculine people. Both axes work independently: gender is chosen first, then number is added. The quality agrees with gender and number at once.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A qualidade já sabia mudar por gênero: bonito virava bonita. Agora ela aprende a mudar também por número: rápido vira ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ' ao falar de vários homens. Os dois eixos funcionam de forma independente: primeiro se escolhe o gênero, depois se adiciona o número. A qualidade concorda com gênero e número ao mesmo tempo.', semantic: 'explanation' }),
      vi: R({ text: 'Đặc điểm đã biết đổi theo giống: bonito trở thành bonita. Giờ nó học cách đổi theo số nữa: rápido trở thành ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ' khi nói về nhiều người giống đực. Cả hai trục hoạt động độc lập: giống được chọn trước, rồi số được thêm vào. Đặc điểm hòa hợp với cả giống lẫn số cùng lúc.', semantic: 'explanation' }),
      id: R({ text: 'Sifat itu sudah tahu cara berubah menurut gender: bonito menjadi bonita. Sekarang ia belajar berubah menurut jumlah: rápido menjadi ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ' untuk beberapa orang maskulin. Kedua sumbu bekerja independen: gender dulu, lalu jumlah. Sifat sesuai dengan gender dan jumlah sekaligus.', semantic: 'explanation' }),
      tr: R({ text: 'Nitelik zaten cinsiyete göre değişmeyi biliyordu: bonito, bonita oluyordu. Şimdi sayıya göre de değişmeyi öğreniyor: rápido, birkaç eril kişiden bahsederken ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ' olur. İki eksen birbirinden bağımsız çalışır: önce cinsiyet seçilir, sonra sayı eklenir. Nitelik hem cinsiyete hem sayıya aynı anda uyum sağlar.', semantic: 'explanation' }),
      pl: R({ text: 'Cecha już umiała zmieniać się przez rodzaj: bonito stawało się bonita. Teraz uczy się zmieniać też przez liczbę: rápido staje się ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', gdy mowa o kilku mężczyznach. Obie osie działają niezależnie: najpierw wybiera się rodzaj, potem dodaje liczbę. Cecha zgadza się jednocześnie z rodzajem i liczbą.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что происходит с признаком, когда речь о нескольких людях?',
        uk: 'Що відбувається з ознакою, коли йдеться про кількох людей?',
        es: 'What happens to the quality when talking about several people?',
        'pt-BR': 'O que acontece com a qualidade ao falar de várias pessoas?',
        vi: 'Điều gì xảy ra với đặc điểm khi nói về nhiều người?',
        id: 'Apa yang terjadi pada sifat saat membicarakan beberapa orang?',
        tr: 'Birkaç kişiden bahsederken niteliğe ne olur?',
        pl: 'Co dzieje się z cechą, gdy mowa o kilku osobach?',
      }),
      choices: [
        L({ ru: 'Признак согласуется и с родом, и с числом одновременно', uk: 'Ознака узгоджується і з родом, і з числом одночасно', es: 'The quality agrees with gender and number at once', 'pt-BR': 'A qualidade concorda com gênero e número ao mesmo tempo', vi: 'Đặc điểm hòa hợp với cả giống lẫn số cùng lúc', id: 'Sifat sesuai dengan gender dan jumlah sekaligus', tr: 'Nitelik hem cinsiyete hem sayıya aynı anda uyum sağlar', pl: 'Cecha zgadza się jednocześnie z rodzajem i liczbą' }),
        L({ ru: 'Признак остаётся неизменным', uk: 'Ознака лишається незмінною', es: 'The quality stays unchanged', 'pt-BR': 'A qualidade permanece inalterada', vi: 'Đặc điểm giữ nguyên không đổi', id: 'Sifat itu tetap tidak berubah', tr: 'Nitelik değişmeden kalır', pl: 'Cecha pozostaje niezmieniona' }),
        L({ ru: 'Меняется только связка, а признак нет', uk: 'Змінюється лише зв’язка, а ознака ні', es: 'Only the linking word changes, not the quality', 'pt-BR': 'Só a ligação muda, não a qualidade', vi: 'Chỉ từ nối đổi, đặc điểm thì không', id: 'Hanya kata penghubung yang berubah, sifatnya tidak', tr: 'Yalnızca bağlaç değişir, nitelik değişmez', pl: 'Zmienia się tylko łącznik, a nie cecha' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Признак согласуется и с родом, и с числом одновременно — он не остаётся неизменным и меняется не только связка.',
        uk: 'Ознака узгоджується і з родом, і з числом одночасно — вона не лишається незмінною, і змінюється не лише зв’язка.',
        es: 'The quality agrees with both gender and number at once — it does not stay unchanged, and it is not only the linking word that changes.',
        'pt-BR': 'A qualidade concorda com gênero e número ao mesmo tempo — ela não permanece inalterada, e não é só a ligação que muda.',
        vi: 'Đặc điểm hòa hợp với cả giống lẫn số cùng lúc — nó không giữ nguyên không đổi, và không chỉ từ nối mới đổi.',
        id: 'Sifat itu sesuai dengan gender dan jumlah sekaligus — ia tidak tetap tidak berubah, dan bukan hanya kata penghubung yang berubah.',
        tr: 'Nitelik hem cinsiyete hem sayıya aynı anda uyum sağlar — değişmeden kalmaz ve yalnızca bağlaç değişmez.',
        pl: 'Cecha zgadza się jednocześnie z rodzajem i liczbą — nie pozostaje niezmieniona i nie zmienia się tylko łącznik.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Гласная даёт -s, согласная даёт -es',
      uk: 'Голосна дає -s, приголосна дає -es',
      es: 'A vowel gives -s, a consonant gives -es',
      'pt-BR': 'Vogal dá -s, consoante dá -es',
      vi: 'Nguyên âm cho -s, phụ âm cho -es',
      id: 'Vokal memberi -s, konsonan memberi -es',
      tr: 'Sesli harf -s verir, ünsüz -es verir',
      pl: 'Samogłoska daje -s, spółgłoska daje -es',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула проста: признак на гласную получает -s во множественном числе — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas. Признак на согласную получает -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ': просто -s звучало бы неудобно. Связка тоже меняется: somos вместо soy. Гласная даёт -s, согласная — -es.', semantic: 'explanation' }),
      uk: R({ text: 'Формула проста: ознака на голосну отримує -s у множині — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas. Ознака на приголосну отримує -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ': просто -s звучало б незручно. Зв’язка теж змінюється: somos замість soy. Голосна дає -s, приголосна — -es.', semantic: 'explanation' }),
      es: R({ text: 'The formula is simple: a vowel-ending quality gets -s in the plural — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas. A consonant-ending quality gets -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ': plain -s would sound awkward. The linking word changes too: somos instead of soy. A vowel gives -s, a consonant gives -es.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é simples: qualidade terminada em vogal recebe -s no plural — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas. Terminada em consoante recebe -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ': só -s soaria estranho. A ligação também muda: somos em vez de soy. Vogal dá -s, consoante dá -es.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức đơn giản: đặc điểm kết thúc bằng nguyên âm nhận -s ở số nhiều — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas. Kết thúc bằng phụ âm nhận -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ': chỉ -s sẽ nghe khó xử. Từ nối cũng đổi: somos thay vì soy. Nguyên âm cho -s, phụ âm cho -es.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sederhana: sifat berakhiran vokal mendapat -s dalam bentuk jamak — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas. Berakhiran konsonan mendapat -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ': -s saja akan terdengar janggal. Kata penghubung juga berubah: somos, bukan soy. Vokal memberi -s, konsonan memberi -es.', semantic: 'explanation' }),
      tr: R({ text: 'Formül basittir: sesli harfle biten nitelik çoğulda -s alır — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas. Ünsüzle biten -es alır — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ': sadece -s garip duyulurdu. Bağlaç da değişir: soy yerine somos. Sesli harf -s verir, ünsüz -es verir.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest prosta: cecha na samogłoskę otrzymuje -s w liczbie mnogiej — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas. Na spółgłoskę otrzymuje -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ': samo -s brzmiałoby niezręcznie. Łącznik też się zmienia: somos zamiast soy. Samogłoska daje -s, spółgłoska -es.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какое окончание получает признак на согласную во множественном числе?',
        uk: 'Яке закінчення отримує ознака на приголосну в множині?',
        es: 'Which ending does a consonant-ending quality get in the plural?',
        'pt-BR': 'Qual terminação uma qualidade terminada em consoante recebe no plural?',
        vi: 'Đặc điểm kết thúc bằng phụ âm nhận đuôi nào ở số nhiều?',
        id: 'Akhiran apa yang didapat sifat berakhiran konsonan dalam bentuk jamak?',
        tr: 'Ünsüzle biten bir nitelik çoğulda hangi eki alır?',
        pl: 'Jaką końcówkę otrzymuje cecha kończąca się na spółgłoskę w liczbie mnogiej?',
      }),
      choices: [
        L({ ru: 'Получает -es', uk: 'Отримує -es', es: 'gets -es', 'pt-BR': 'recebe -es', vi: 'nhận -es', id: 'mendapat -es', tr: '-es alır', pl: 'otrzymuje -es' }),
        L({ ru: 'Получает простое -s', uk: 'Отримує просте -s', es: 'It gets a simple -s', 'pt-BR': 'Ela recebe um simples -s', vi: 'Nó nhận -s đơn giản', id: 'Ia mendapat -s sederhana', tr: 'O basit bir -s alır', pl: 'Otrzymuje proste -s' }),
        L({ ru: 'Не меняется вовсе', uk: 'Не змінюється взагалі', es: 'It does not change at all', 'pt-BR': 'Ela não muda em nada', vi: 'Nó không đổi chút nào', id: 'Sama sekali tidak berubah', tr: 'Hiç değişmez', pl: 'W ogóle się nie zmienia' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Признак на согласную получает -es — не простое -s и не остаётся без изменений, потому что после согласной -s звучало бы неудобно.',
        uk: 'Ознака на приголосну отримує -es — не просте -s і не лишається без змін, бо після приголосної -s звучало б незручно.',
        es: 'A consonant-ending quality gets -es — not a simple -s and not left unchanged, because after a consonant -s would sound awkward.',
        'pt-BR': 'Uma qualidade terminada em consoante recebe -es — não um simples -s e não fica sem mudança, porque depois de uma consoante -s soaria estranho.',
        vi: 'Đặc điểm kết thúc bằng phụ âm nhận -es — không phải -s đơn giản và không giữ nguyên, vì sau phụ âm -s sẽ nghe khó xử.',
        id: 'Sifat berakhiran konsonan mendapat -es — bukan -s sederhana dan tidak tetap tidak berubah, karena setelah konsonan -s akan terdengar janggal.',
        tr: 'Ünsüzle biten bir nitelik -es alır — basit bir -s almaz ve değişmeden kalmaz, çünkü bir ünsüzden sonra -s garip duyulurdu.',
        pl: 'Cecha kończąca się na spółgłoskę otrzymuje -es — nie proste -s i nie zostaje bez zmian, bo po spółgłosce -s brzmiałoby niezręcznie.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Число легко забыть рядом с somos',
      uk: 'Число легко забути поряд із somos',
      es: 'Number is easy to forget next to somos',
      'pt-BR': 'É fácil esquecer o número ao lado de somos',
      vi: 'Dễ quên mất số bên cạnh somos',
      id: 'Jumlah mudah terlupakan di samping somos',
      tr: 'Somos yanında sayı kolayca unutulur',
      pl: 'Liczbę łatwo zapomnieć obok somos',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Частая ошибка — забыть про число и оставить признак в единственном числе рядом с somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' звучит неверно. Вторая ловушка — поставить -s вместо нужного -es на согласную концовку признака. Проверка простая: признак должен совпадать со связкой и по роду, и по числу одновременно.', semantic: 'explanation' }),
      uk: R({ text: 'Часта помилка — забути про число і лишити ознаку в однині поряд із somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' звучить неправильно. Друга пастка — поставити -s замість потрібного -es на приголосну концовку ознаки. Перевірка проста: ознака має збігатися зі зв’язкою і за родом, і за числом одночасно.', semantic: 'explanation' }),
      es: R({ text: 'A common mistake is forgetting about number and leaving the quality singular next to somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' sounds wrong. The second trap is putting -s instead of the needed -es on a consonant ending. The check is simple: the quality must match the linking word in both gender and number.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um erro comum é esquecer o número e deixar a qualidade no singular ao lado de somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' soa errado. A segunda armadilha é usar -s em vez do -es necessário numa terminação em consoante. A checagem é simples: a qualidade precisa combinar com a ligação em gênero e número.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi thường gặp là quên số nhiều và để đặc điểm ở số ít bên cạnh somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' nghe sai. Bẫy thứ hai là dùng -s thay vì -es cần thiết cho đuôi phụ âm. Cách kiểm tra đơn giản: đặc điểm phải khớp với từ nối cả về giống lẫn số.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan umum adalah lupa jumlah dan membiarkan sifat tunggal di samping somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ', bukan ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ', terdengar salah. Jebakan kedua: memakai -s, bukan -es yang diperlukan, pada akhiran konsonan. Sifat harus cocok dengan kata penghubung dalam gender dan jumlah.', semantic: 'explanation' }),
      tr: R({ text: 'Yaygın bir hata, sayıyı unutup niteliği somos yanında tekil bırakmaktır: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' yanlış duyulur. İkinci tuzak, ünsüz sonuna gereken -es yerine -s koymaktır. Kontrol basittir: nitelik, bağlaçla hem cinsiyette hem sayıda eşleşmelidir.', semantic: 'explanation' }),
      pl: R({ text: 'Częsty błąd to zapomnienie o liczbie i pozostawienie cechy w liczbie pojedynczej obok somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' brzmi źle. Druga pułapka to postawienie -s zamiast potrzebnego -es na końcówce spółgłoskowej. Sprawdzenie jest proste: cecha musi zgadzać się z łącznikiem rodzajem i liczbą.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно сказать о группе мужского рода?',
        uk: 'Як правильно сказати про групу чоловічого роду?',
        es: 'What is the correct way to talk about a masculine group?',
        'pt-BR': 'Qual é a forma correta de falar de um grupo masculino?',
        vi: 'Cách đúng để nói về một nhóm giống đực là gì?',
        id: 'Bagaimana cara yang benar untuk membicarakan kelompok maskulin?',
        tr: 'Eril bir grup hakkında konuşmanın doğru yolu nedir?',
        pl: 'Jak poprawnie mówić o grupie rodzaju męskiego?',
      }),
      choices: [
        L({ ru: 'Somos rápidos', uk: 'Somos rápidos', es: 'Somos rápidos', 'pt-BR': 'Somos rápidos', vi: 'Somos rápidos', id: 'Somos rápidos', tr: 'Somos rápidos', pl: 'Somos rápidos' }),
        L({ ru: 'Somos rápido', uk: 'Somos rápido', es: 'Somos rápido', 'pt-BR': 'Somos rápido', vi: 'Somos rápido', id: 'Somos rápido', tr: 'Somos rápido', pl: 'Somos rápido' }),
        L({ ru: 'Somos fácil', uk: 'Somos fácil', es: 'Somos fácil', 'pt-BR': 'Somos fácil', vi: 'Somos fácil', id: 'Somos fácil', tr: 'Somos fácil', pl: 'Somos fácil' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Somos rápidos верно: связка уже показывает группу, а признак должен получить окончание множественного числа -s, а не остаться один.',
        uk: 'Somos rápidos правильно: зв’язка вже показує групу, а ознака має отримати закінчення множини -s, а не лишатися одна.',
        es: 'Somos rápidos is correct: the linking word already shows a group, so the quality must get the plural ending -s, not stay alone.',
        'pt-BR': 'Somos rápidos está correto: a ligação já mostra um grupo, então a qualidade precisa da terminação plural -s, não pode ficar sozinha.',
        vi: 'Somos rápidos đúng: từ nối đã thể hiện một nhóm, nên đặc điểm phải nhận đuôi số nhiều -s, không được đứng một mình.',
        id: 'Somos rápidos benar: kata penghubung sudah menunjukkan kelompok, jadi sifat harus mendapat akhiran jamak -s, bukan tetap sendiri.',
        tr: 'Somos rápidos doğrudur: bağlaç zaten bir grup gösterir, bu yüzden nitelik tek başına kalmamalı, çoğul -s ekini almalıdır.',
        pl: 'Somos rápidos jest poprawne: łącznik już pokazuje grupę, więc cecha musi otrzymać końcówkę liczby mnogiej -s, a nie zostać sama.',
      }),
    },
  },
];
