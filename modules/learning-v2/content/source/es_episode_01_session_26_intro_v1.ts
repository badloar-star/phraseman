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
  ru: 'Признак уже умел меняться по роду: bonito становился bonita. Теперь он учится меняться ещё и по числу: bonito становится bonitos, если речь о нескольких мужского рода, bonita — bonitas для нескольких женского рода. Rápidos звучит как rápido с добавленным -s на конце — тот же признак, но теперь про группу, а не про одного человека. Обе оси работают независимо друг от друга: сначала выбирают род, потом добавляют число. Ответ прост: признак согласуется и с родом, и с числом одновременно, а не с чем-то одним.',
  uk: 'Ознака вже вміла змінюватися за родом: bonito ставало bonita. Тепер вона вчиться змінюватися ще й за числом: bonito стає bonitos, якщо йдеться про кількох чоловічого роду, bonita — bonitas для кількох жіночого роду. Rápidos звучить як rápido з доданим -s наприкінці — та сама ознака, але тепер про групу, а не про одну людину. Обидві осі працюють незалежно одна від одної: спершу обирають рід, потім додають число. Відповідь проста: ознака узгоджується і з родом, і з числом одночасно, а не з чимось одним.',
  es: 'The quality already knew how to change by gender: bonito became bonita. Now it learns to change by number too: bonito becomes bonitos when talking about several masculine people, bonita becomes bonitas for several feminine people. Rápidos sounds like rápido with an added -s at the end — the same quality, but now about a group, not one person. Both axes work independently of each other: gender is chosen first, then number is added. The answer is simple: the quality agrees with both gender and number at once, not just one of them.',
  'pt-BR': 'A qualidade já sabia mudar por gênero: bonito virava bonita. Agora ela aprende a mudar também por número: bonito vira bonitos ao falar de vários homens, bonita vira bonitas para várias mulheres. Rápidos soa como rápido com um -s adicionado no final — a mesma qualidade, mas agora sobre um grupo, não uma pessoa. Os dois eixos funcionam de forma independente um do outro: primeiro se escolhe o gênero, depois se adiciona o número. A resposta é simples: a qualidade concorda com gênero e número ao mesmo tempo, não apenas com um deles.',
  vi: 'Đặc điểm đã biết đổi theo giống: bonito trở thành bonita. Giờ nó học cách đổi theo số nữa: bonito trở thành bonitos khi nói về nhiều người giống đực, bonita trở thành bonitas cho nhiều người giống cái. Rápidos nghe như rápido với -s thêm vào cuối — cùng đặc điểm, nhưng giờ về một nhóm, không phải một người. Cả hai trục hoạt động độc lập với nhau: giống được chọn trước, rồi số được thêm vào. Câu trả lời rất đơn giản: đặc điểm hòa hợp với cả giống lẫn số cùng lúc, không chỉ một trong hai.',
  id: 'Sifat itu sudah tahu cara berubah menurut gender: bonito menjadi bonita. Sekarang ia belajar berubah menurut jumlah juga: bonito menjadi bonitos saat membicarakan beberapa orang maskulin, bonita menjadi bonitas untuk beberapa orang feminin. Rápidos terdengar seperti rápido dengan tambahan -s di akhir — sifat yang sama, tetapi sekarang tentang kelompok, bukan satu orang. Kedua sumbu bekerja secara independen satu sama lain: gender dipilih dulu, lalu jumlah ditambahkan. Jawabannya sederhana: sifat itu sesuai dengan gender dan jumlah sekaligus, bukan hanya salah satunya.',
  tr: 'Nitelik zaten cinsiyete göre değişmeyi biliyordu: bonito, bonita oluyordu. Şimdi sayıya göre de değişmeyi öğreniyor: bonito, birkaç eril kişiden bahsederken bonitos olur, bonita birkaç dişil kişi için bonitas olur. Rápidos, sonuna -s eklenmiş rápido gibi duyulur — aynı nitelik, ama artık bir grup hakkında, tek bir kişi değil. İki eksen birbirinden bağımsız çalışır: önce cinsiyet seçilir, sonra sayı eklenir. Cevap basittir: nitelik hem cinsiyete hem sayıya aynı anda uyum sağlar, yalnızca birine değil.',
  pl: 'Cecha już umiała zmieniać się przez rodzaj: bonito stawało się bonita. Teraz uczy się zmieniać też przez liczbę: bonito staje się bonitos, gdy mowa o kilku mężczyznach, bonita staje się bonitas dla kilku kobiet. Rápidos brzmi jak rápido z dodanym -s na końcu — ta sama cecha, ale teraz o grupie, nie o jednej osobie. Obie osie działają niezależnie od siebie: najpierw wybiera się rodzaj, potem dodaje liczbę. Odpowiedź jest prosta: cecha zgadza się jednocześnie z rodzajem i liczbą, a nie tylko z jednym z nich.',
});

const FORMULA_BODY = L({
  ru: 'Формула проста: признак на гласную (-o, -a, -e) получает простое -s во множественном числе — rápido → rápidos, bonita → bonitas, único → únicos. Признак на согласную получает -es — fácil → fáciles, difícil → difíciles, потому что просто -s после согласной звучало бы неудобно. Связка тоже меняется по числу: somos для группы, включающей говорящего, вместо soy для одного. Ответ прост: гласная концовка даёт -s, согласная концовка даёт -es, и это правило работает всегда одинаково.',
  uk: 'Формула проста: ознака на голосну (-o, -a, -e) отримує просте -s у множині — rápido → rápidos, bonita → bonitas, único → únicos. Ознака на приголосну отримує -es — fácil → fáciles, difícil → difíciles, бо просто -s після приголосної звучало б незручно. Зв’язка теж змінюється за числом: somos для групи, що включає мовця, замість soy для одного. Відповідь проста: голосна концовка дає -s, приголосна концовка дає -es, і це правило працює завжди однаково.',
  es: 'The formula is simple: a quality ending in a vowel (-o, -a, -e) gets a simple -s in the plural — rápido → rápidos, bonita → bonitas, único → únicos. A quality ending in a consonant gets -es — fácil → fáciles, difícil → difíciles, because just -s after a consonant would sound awkward. The linking word changes by number too: somos for a group including the speaker, instead of soy for one. The answer is simple: a vowel ending gives -s, a consonant ending gives -es, and this rule always works the same way.',
  'pt-BR': 'A fórmula é simples: uma qualidade terminada em vogal (-o, -a, -e) recebe um simples -s no plural — rápido → rápidos, bonita → bonitas, único → únicos. Uma qualidade terminada em consoante recebe -es — fácil → fáciles, difícil → difíciles, porque apenas -s depois de uma consoante soaria estranho. A ligação também muda por número: somos para um grupo incluindo quem fala, em vez de soy para um. A resposta é simples: uma terminação vogal dá -s, uma terminação consoante dá -es, e essa regra sempre funciona do mesmo jeito.',
  vi: 'Công thức rất đơn giản: đặc điểm kết thúc bằng nguyên âm (-o, -a, -e) nhận -s đơn giản ở số nhiều — rápido → rápidos, bonita → bonitas, único → únicos. Đặc điểm kết thúc bằng phụ âm nhận -es — fácil → fáciles, difícil → difíciles, vì chỉ -s sau phụ âm sẽ nghe khó xử. Từ nối cũng đổi theo số: somos cho một nhóm bao gồm người nói, thay vì soy cho một người. Câu trả lời rất đơn giản: đuôi nguyên âm cho -s, đuôi phụ âm cho -es, và quy tắc này luôn hoạt động giống nhau.',
  id: 'Rumusnya sederhana: sifat yang berakhiran vokal (-o, -a, -e) mendapat -s sederhana dalam bentuk jamak — rápido → rápidos, bonita → bonitas, único → únicos. Sifat yang berakhiran konsonan mendapat -es — fácil → fáciles, difícil → difíciles, karena hanya -s setelah konsonan akan terdengar janggal. Kata penghubung juga berubah menurut jumlah: somos untuk kelompok termasuk penutur, bukan soy untuk satu orang. Jawabannya sederhana: akhiran vokal memberi -s, akhiran konsonan memberi -es, dan aturan ini selalu bekerja dengan cara yang sama.',
  tr: 'Formül basittir: sesli harfle biten (-o, -a, -e) bir nitelik çoğulda basit bir -s alır — rápido → rápidos, bonita → bonitas, único → únicos. Ünsüzle biten bir nitelik -es alır — fácil → fáciles, difícil → difíciles, çünkü bir ünsüzden sonra sadece -s garip duyulurdu. Bağlaç da sayıya göre değişir: konuşanı içeren bir grup için soy yerine somos. Cevap basittir: sesli harf sonu -s verir, ünsüz sonu -es verir, ve bu kural her zaman aynı şekilde çalışır.',
  pl: 'Formuła jest prosta: cecha kończąca się na samogłoskę (-o, -a, -e) otrzymuje proste -s w liczbie mnogiej — rápido → rápidos, bonita → bonitas, único → únicos. Cecha kończąca się na spółgłoskę otrzymuje -es — fácil → fáciles, difícil → difíciles, bo samo -s po spółgłosce brzmiałoby niezręcznie. Łącznik też zmienia się przez liczbę: somos dla grupy z mówiącym w środku, zamiast soy dla jednej osoby. Odpowiedź jest prosta: końcówka samogłoskowa daje -s, końcówka spółgłoskowa daje -es, i ta reguła zawsze działa tak samo.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — забыть про число и оставить признак в единственном числе рядом с somos: Somos rápido вместо Somos rápidos звучит неверно, потому что связка уже показывает группу, а признак остаётся один. Вторая ловушка — добавить -s туда, где нужно -es: fácils вместо fáciles режет слух, потому что после согласной -l простого -s недостаточно. Третья ловушка — перепутать порядок согласования: сначала род, потом число, а не наоборот — rápidas получается из rápida плюс -s, а не из rápidos минус -o плюс -a. Проверка простая: признак должен совпадать с связкой и по роду, и по числу одновременно.',
  uk: 'Найчастіша помилка — забути про число і лишити ознаку в однині поряд із somos: Somos rápido замість Somos rápidos звучить неправильно, бо зв’язка вже показує групу, а ознака лишається одна. Друга пастка — додати -s там, де потрібно -es: fácils замість fáciles ріже слух, бо після приголосної -l простого -s недостатньо. Третя пастка — переплутати порядок узгодження: спершу рід, потім число, а не навпаки — rápidas виходить із rápida плюс -s, а не з rápidos мінус -o плюс -a. Перевірка проста: ознака має збігатися зі зв’язкою і за родом, і за числом одночасно.',
  es: 'The most common mistake is forgetting about number and leaving the quality singular next to somos: Somos rápido instead of Somos rápidos sounds wrong, because the linking word already shows a group, while the quality stays alone. The second trap is adding -s where -es is needed: fácils instead of fáciles sounds off, because after the consonant -l a plain -s is not enough. The third trap is mixing up the order of agreement: gender first, then number, not the other way around — rápidas comes from rápida plus -s, not from rápidos minus -o plus -a. The check is simple: the quality must match the linking word in both gender and number at the same time.',
  'pt-BR': 'O erro mais comum é esquecer o número e deixar a qualidade no singular ao lado de somos: Somos rápido em vez de Somos rápidos soa errado, porque a ligação já mostra um grupo, enquanto a qualidade fica sozinha. A segunda armadilha é adicionar -s onde precisa de -es: fácils em vez de fáciles soa estranho, porque depois da consoante -l um simples -s não basta. A terceira armadilha é confundir a ordem da concordância: primeiro gênero, depois número, não o contrário — rápidas vem de rápida mais -s, não de rápidos menos -o mais -a. A checagem é simples: a qualidade precisa combinar com a ligação em gênero e número ao mesmo tempo.',
  vi: 'Lỗi phổ biến nhất là quên mất số nhiều và để đặc điểm ở số ít bên cạnh somos: Somos rápido thay vì Somos rápidos nghe sai, vì từ nối đã thể hiện một nhóm, trong khi đặc điểm vẫn đứng một mình. Cái bẫy thứ hai là thêm -s vào nơi cần -es: fácils thay vì fáciles nghe không ổn, vì sau phụ âm -l chỉ -s là không đủ. Cái bẫy thứ ba là nhầm lẫn thứ tự hòa hợp: giống trước, số sau, không phải ngược lại — rápidas đến từ rápida cộng -s, không phải từ rápidos trừ -o cộng -a. Cách kiểm tra đơn giản: đặc điểm phải khớp với từ nối cả về giống lẫn số cùng lúc.',
  id: 'Kesalahan paling umum adalah lupa tentang jumlah dan membiarkan sifat tetap tunggal di samping somos: Somos rápido alih-alih Somos rápidos terdengar salah, karena kata penghubung sudah menunjukkan kelompok, sementara sifatnya tetap sendiri. Jebakan kedua adalah menambahkan -s di tempat yang seharusnya -es: fácils alih-alih fáciles terdengar aneh, karena setelah konsonan -l, -s saja tidak cukup. Jebakan ketiga adalah tertukar urutan kesesuaian: gender dulu, baru jumlah, bukan sebaliknya — rápidas berasal dari rápida ditambah -s, bukan dari rápidos dikurangi -o ditambah -a. Pengecekannya sederhana: sifat harus cocok dengan kata penghubung dalam gender dan jumlah sekaligus.',
  tr: 'En yaygın hata, sayıyı unutmak ve niteliği somos yanında tekil bırakmaktır: Somos rápido, Somos rápidos yerine yanlış duyulur, çünkü bağlaç zaten bir grup gösterirken nitelik tek başına kalır. İkinci tuzak, -es gereken yere -s eklemektir: fácils, fáciles yerine kulağa tuhaf gelir, çünkü ünsüz -l\'den sonra sadece -s yeterli değildir. Üçüncü tuzak, uyum sırasını karıştırmaktır: önce cinsiyet, sonra sayı, tersi değil — rápidas, rápidos eksi -o artı -a\'dan değil, rápida artı -s\'den gelir. Kontrol basittir: nitelik, bağlaçla hem cinsiyette hem sayıda aynı anda eşleşmelidir.',
  pl: 'Najczęstszym błędem jest zapomnienie o liczbie i pozostawienie cechy w liczbie pojedynczej obok somos: Somos rápido zamiast Somos rápidos brzmi źle, bo łącznik już pokazuje grupę, a cecha zostaje sama. Drugą pułapką jest dodanie -s tam, gdzie potrzebne jest -es: fácils zamiast fáciles brzmi nie tak, bo po spółgłosce -l samo -s nie wystarcza. Trzecia pułapka to pomylenie kolejności zgody: najpierw rodzaj, potem liczba, a nie odwrotnie — rápidas powstaje z rápida plus -s, a nie z rápidos minus -o plus -a. Sprawdzenie jest proste: cecha musi zgadzać się z łącznikiem jednocześnie pod względem rodzaju i liczby.',
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
      ru: R({ text: 'Признак уже умел меняться по роду: bonito становился bonita. Теперь он учится меняться ещё и по числу: bonito становится ', semantic: 'explanation' }, { text: 'bonitos', semantic: 'targetCorrect' }, { text: ', если речь о нескольких мужского рода, bonita — ', semantic: 'explanation' }, { text: 'bonitas', semantic: 'targetCorrect' }, { text: ' для нескольких женского рода. ', semantic: 'explanation' }, { text: 'Rápidos', semantic: 'targetCorrect' }, { text: ' звучит как rápido с добавленным -s на конце — тот же признак, но теперь про группу, а не про одного человека. Обе оси работают независимо друг от друга: сначала выбирают род, потом добавляют число. Ответ прост: признак согласуется и с родом, и с числом одновременно, а не с чем-то одним.', semantic: 'explanation' }),
      uk: R({ text: 'Ознака вже вміла змінюватися за родом: bonito ставало bonita. Тепер вона вчиться змінюватися ще й за числом: bonito стає ', semantic: 'explanation' }, { text: 'bonitos', semantic: 'targetCorrect' }, { text: ', якщо йдеться про кількох чоловічого роду, bonita — ', semantic: 'explanation' }, { text: 'bonitas', semantic: 'targetCorrect' }, { text: ' для кількох жіночого роду. ', semantic: 'explanation' }, { text: 'Rápidos', semantic: 'targetCorrect' }, { text: ' звучить як rápido з доданим -s наприкінці — та сама ознака, але тепер про групу, а не про одну людину. Обидві осі працюють незалежно одна від одної: спершу обирають рід, потім додають число. Відповідь проста: ознака узгоджується і з родом, і з числом одночасно, а не з чимось одним.', semantic: 'explanation' }),
      es: R({ text: 'The quality already knew how to change by gender: bonito became bonita. Now it learns to change by number too: bonito becomes ', semantic: 'explanation' }, { text: 'bonitos', semantic: 'targetCorrect' }, { text: ' when talking about several masculine people, bonita becomes ', semantic: 'explanation' }, { text: 'bonitas', semantic: 'targetCorrect' }, { text: ' for several feminine people. ', semantic: 'explanation' }, { text: 'Rápidos', semantic: 'targetCorrect' }, { text: ' sounds like rápido with an added -s at the end — the same quality, but now about a group, not one person. Both axes work independently of each other: gender is chosen first, then number is added. The answer is simple: the quality agrees with both gender and number at once, not just one of them.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A qualidade já sabia mudar por gênero: bonito virava bonita. Agora ela aprende a mudar também por número: bonito vira ', semantic: 'explanation' }, { text: 'bonitos', semantic: 'targetCorrect' }, { text: ' ao falar de vários homens, bonita vira ', semantic: 'explanation' }, { text: 'bonitas', semantic: 'targetCorrect' }, { text: ' para várias mulheres. ', semantic: 'explanation' }, { text: 'Rápidos', semantic: 'targetCorrect' }, { text: ' soa como rápido com um -s adicionado no final — a mesma qualidade, mas agora sobre um grupo, não uma pessoa. Os dois eixos funcionam de forma independente um do outro: primeiro se escolhe o gênero, depois se adiciona o número. A resposta é simples: a qualidade concorda com gênero e número ao mesmo tempo, não apenas com um deles.', semantic: 'explanation' }),
      vi: R({ text: 'Đặc điểm đã biết đổi theo giống: bonito trở thành bonita. Giờ nó học cách đổi theo số nữa: bonito trở thành ', semantic: 'explanation' }, { text: 'bonitos', semantic: 'targetCorrect' }, { text: ' khi nói về nhiều người giống đực, bonita trở thành ', semantic: 'explanation' }, { text: 'bonitas', semantic: 'targetCorrect' }, { text: ' cho nhiều người giống cái. ', semantic: 'explanation' }, { text: 'Rápidos', semantic: 'targetCorrect' }, { text: ' nghe như rápido với -s thêm vào cuối — cùng đặc điểm, nhưng giờ về một nhóm, không phải một người. Cả hai trục hoạt động độc lập với nhau: giống được chọn trước, rồi số được thêm vào. Câu trả lời rất đơn giản: đặc điểm hòa hợp với cả giống lẫn số cùng lúc, không chỉ một trong hai.', semantic: 'explanation' }),
      id: R({ text: 'Sifat itu sudah tahu cara berubah menurut gender: bonito menjadi bonita. Sekarang ia belajar berubah menurut jumlah juga: bonito menjadi ', semantic: 'explanation' }, { text: 'bonitos', semantic: 'targetCorrect' }, { text: ' saat membicarakan beberapa orang maskulin, bonita menjadi ', semantic: 'explanation' }, { text: 'bonitas', semantic: 'targetCorrect' }, { text: ' untuk beberapa orang feminin. ', semantic: 'explanation' }, { text: 'Rápidos', semantic: 'targetCorrect' }, { text: ' terdengar seperti rápido dengan tambahan -s di akhir — sifat yang sama, tetapi sekarang tentang kelompok, bukan satu orang. Kedua sumbu bekerja secara independen satu sama lain: gender dipilih dulu, lalu jumlah ditambahkan. Jawabannya sederhana: sifat itu sesuai dengan gender dan jumlah sekaligus, bukan hanya salah satunya.', semantic: 'explanation' }),
      tr: R({ text: 'Nitelik zaten cinsiyete göre değişmeyi biliyordu: bonito, bonita oluyordu. Şimdi sayıya göre de değişmeyi öğreniyor: bonito, birkaç eril kişiden bahsederken ', semantic: 'explanation' }, { text: 'bonitos', semantic: 'targetCorrect' }, { text: ' olur, bonita birkaç dişil kişi için ', semantic: 'explanation' }, { text: 'bonitas', semantic: 'targetCorrect' }, { text: ' olur. ', semantic: 'explanation' }, { text: 'Rápidos', semantic: 'targetCorrect' }, { text: ', sonuna -s eklenmiş rápido gibi duyulur — aynı nitelik, ama artık bir grup hakkında, tek bir kişi değil. İki eksen birbirinden bağımsız çalışır: önce cinsiyet seçilir, sonra sayı eklenir. Cevap basittir: nitelik hem cinsiyete hem sayıya aynı anda uyum sağlar, yalnızca birine değil.', semantic: 'explanation' }),
      pl: R({ text: 'Cecha już umiała zmieniać się przez rodzaj: bonito stawało się bonita. Teraz uczy się zmieniać też przez liczbę: bonito staje się ', semantic: 'explanation' }, { text: 'bonitos', semantic: 'targetCorrect' }, { text: ', gdy mowa o kilku mężczyznach, bonita staje się ', semantic: 'explanation' }, { text: 'bonitas', semantic: 'targetCorrect' }, { text: ' dla kilku kobiet. ', semantic: 'explanation' }, { text: 'Rápidos', semantic: 'targetCorrect' }, { text: ' brzmi jak rápido z dodanym -s na końcu — ta sama cecha, ale teraz o grupie, nie o jednej osobie. Obie osie działają niezależnie od siebie: najpierw wybiera się rodzaj, potem dodaje liczbę. Odpowiedź jest prosta: cecha zgadza się jednocześnie z rodzajem i liczbą, a nie tylko z jednym z nich.', semantic: 'explanation' }),
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
        L({ ru: 'Признак согласуется и с родом, и с числом одновременно', uk: 'Ознака узгоджується і з родом, і з числом одночасно', es: 'The quality agrees with both gender and number at once', 'pt-BR': 'A qualidade concorda com gênero e número ao mesmo tempo', vi: 'Đặc điểm hòa hợp với cả giống lẫn số cùng lúc', id: 'Sifat itu sesuai dengan gender dan jumlah sekaligus', tr: 'Nitelik hem cinsiyete hem sayıya aynı anda uyum sağlar', pl: 'Cecha zgadza się jednocześnie z rodzajem i liczbą' }),
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
      ru: R({ text: 'Формула проста: признак на гласную (-o, -a, -e) получает простое -s во множественном числе — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas, único → únicos. Признак на согласную получает -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ', difícil → difíciles, потому что просто -s после согласной звучало бы неудобно. Связка тоже меняется по числу: somos для группы, включающей говорящего, вместо soy для одного. Ответ прост: гласная концовка даёт -s, согласная концовка даёт -es, и это правило работает всегда одинаково.', semantic: 'explanation' }),
      uk: R({ text: 'Формула проста: ознака на голосну (-o, -a, -e) отримує просте -s у множині — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas, único → únicos. Ознака на приголосну отримує -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ', difícil → difíciles, бо просто -s після приголосної звучало б незручно. Зв’язка теж змінюється за числом: somos для групи, що включає мовця, замість soy для одного. Відповідь проста: голосна концовка дає -s, приголосна концовка дає -es, і це правило працює завжди однаково.', semantic: 'explanation' }),
      es: R({ text: 'The formula is simple: a quality ending in a vowel (-o, -a, -e) gets a simple -s in the plural — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas, único → únicos. A quality ending in a consonant gets -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ', difícil → difíciles, because just -s after a consonant would sound awkward. The linking word changes by number too: somos for a group including the speaker, instead of soy for one. The answer is simple: a vowel ending gives -s, a consonant ending gives -es, and this rule always works the same way.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é simples: uma qualidade terminada em vogal (-o, -a, -e) recebe um simples -s no plural — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas, único → únicos. Uma qualidade terminada em consoante recebe -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ', difícil → difíciles, porque apenas -s depois de uma consoante soaria estranho. A ligação também muda por número: somos para um grupo incluindo quem fala, em vez de soy para um. A resposta é simples: uma terminação vogal dá -s, uma terminação consoante dá -es, e essa regra sempre funciona do mesmo jeito.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức rất đơn giản: đặc điểm kết thúc bằng nguyên âm (-o, -a, -e) nhận -s đơn giản ở số nhiều — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas, único → únicos. Đặc điểm kết thúc bằng phụ âm nhận -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ', difícil → difíciles, vì chỉ -s sau phụ âm sẽ nghe khó xử. Từ nối cũng đổi theo số: somos cho một nhóm bao gồm người nói, thay vì soy cho một người. Câu trả lời rất đơn giản: đuôi nguyên âm cho -s, đuôi phụ âm cho -es, và quy tắc này luôn hoạt động giống nhau.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sederhana: sifat yang berakhiran vokal (-o, -a, -e) mendapat -s sederhana dalam bentuk jamak — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas, único → únicos. Sifat yang berakhiran konsonan mendapat -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ', difícil → difíciles, karena hanya -s setelah konsonan akan terdengar janggal. Kata penghubung juga berubah menurut jumlah: somos untuk kelompok termasuk penutur, bukan soy untuk satu orang. Jawabannya sederhana: akhiran vokal memberi -s, akhiran konsonan memberi -es, dan aturan ini selalu bekerja dengan cara yang sama.', semantic: 'explanation' }),
      tr: R({ text: 'Formül basittir: sesli harfle biten (-o, -a, -e) bir nitelik çoğulda basit bir -s alır — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas, único → únicos. Ünsüzle biten bir nitelik -es alır — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ', difícil → difíciles, çünkü bir ünsüzden sonra sadece -s garip duyulurdu. Bağlaç da sayıya göre değişir: konuşanı içeren bir grup için soy yerine somos. Cevap basittir: sesli harf sonu -s verir, ünsüz sonu -es verir, ve bu kural her zaman aynı şekilde çalışır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest prosta: cecha kończąca się na samogłoskę (-o, -a, -e) otrzymuje proste -s w liczbie mnogiej — rápido → ', semantic: 'explanation' }, { text: 'rápidos', semantic: 'targetCorrect' }, { text: ', bonita → bonitas, único → únicos. Cecha kończąca się na spółgłoskę otrzymuje -es — fácil → ', semantic: 'explanation' }, { text: 'fáciles', semantic: 'targetCorrect' }, { text: ', difícil → difíciles, bo samo -s po spółgłosce brzmiałoby niezręcznie. Łącznik też zmienia się przez liczbę: somos dla grupy z mówiącym w środku, zamiast soy dla jednej osoby. Odpowiedź jest prosta: końcówka samogłoskowa daje -s, końcówka spółgłoskowa daje -es, i ta reguła zawsze działa tak samo.', semantic: 'explanation' }),
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
      ru: R({ text: 'Самая частая ошибка — забыть про число и оставить признак в единственном числе рядом с somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' звучит неверно, потому что связка уже показывает группу, а признак остаётся один. Вторая ловушка — добавить -s туда, где нужно -es: fácils вместо fáciles режет слух, потому что после согласной -l простого -s недостаточно. Третья ловушка — перепутать порядок согласования: сначала род, потом число, а не наоборот — rápidas получается из rápida плюс -s, а не из rápidos минус -o плюс -a. Проверка простая: признак должен совпадать с связкой и по роду, и по числу одновременно.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — забути про число і лишити ознаку в однині поряд із somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' звучить неправильно, бо зв’язка вже показує групу, а ознака лишається одна. Друга пастка — додати -s там, де потрібно -es: fácils замість fáciles ріже слух, бо після приголосної -l простого -s недостатньо. Третя пастка — переплутати порядок узгодження: спершу рід, потім число, а не навпаки — rápidas виходить із rápida плюс -s, а не з rápidos мінус -o плюс -a. Перевірка проста: ознака має збігатися зі зв’язкою і за родом, і за числом одночасно.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is forgetting about number and leaving the quality singular next to somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' sounds wrong, because the linking word already shows a group, while the quality stays alone. The second trap is adding -s where -es is needed: fácils instead of fáciles sounds off, because after the consonant -l a plain -s is not enough. The third trap is mixing up the order of agreement: gender first, then number, not the other way around — rápidas comes from rápida plus -s, not from rápidos minus -o plus -a. The check is simple: the quality must match the linking word in both gender and number at the same time.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é esquecer o número e deixar a qualidade no singular ao lado de somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' soa errado, porque a ligação já mostra um grupo, enquanto a qualidade fica sozinha. A segunda armadilha é adicionar -s onde precisa de -es: fácils em vez de fáciles soa estranho, porque depois da consoante -l um simples -s não basta. A terceira armadilha é confundir a ordem da concordância: primeiro gênero, depois número, não o contrário — rápidas vem de rápida mais -s, não de rápidos menos -o mais -a. A checagem é simples: a qualidade precisa combinar com a ligação em gênero e número ao mesmo tempo.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là quên mất số nhiều và để đặc điểm ở số ít bên cạnh somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' nghe sai, vì từ nối đã thể hiện một nhóm, trong khi đặc điểm vẫn đứng một mình. Cái bẫy thứ hai là thêm -s vào nơi cần -es: fácils thay vì fáciles nghe không ổn, vì sau phụ âm -l chỉ -s là không đủ. Cái bẫy thứ ba là nhầm lẫn thứ tự hòa hợp: giống trước, số sau, không phải ngược lại — rápidas đến từ rápida cộng -s, không phải từ rápidos trừ -o cộng -a. Cách kiểm tra đơn giản: đặc điểm phải khớp với từ nối cả về giống lẫn số cùng lúc.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum adalah lupa tentang jumlah dan membiarkan sifat tetap tunggal di samping somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' terdengar salah, karena kata penghubung sudah menunjukkan kelompok, sementara sifatnya tetap sendiri. Jebakan kedua adalah menambahkan -s di tempat yang seharusnya -es: fácils alih-alih fáciles terdengar aneh, karena setelah konsonan -l, -s saja tidak cukup. Jebakan ketiga adalah tertukar urutan kesesuaian: gender dulu, baru jumlah, bukan sebaliknya — rápidas berasal dari rápida ditambah -s, bukan dari rápidos dikurangi -o ditambah -a. Pengecekannya sederhana: sifat harus cocok dengan kata penghubung dalam gender dan jumlah sekaligus.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, sayıyı unutmak ve niteliği somos yanında tekil bırakmaktır: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ', ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' yerine yanlış duyulur, çünkü bağlaç zaten bir grup gösterirken nitelik tek başına kalır. İkinci tuzak, -es gereken yere -s eklemektir: fácils, fáciles yerine kulağa tuhaf gelir, çünkü ünsüz -l\'den sonra sadece -s yeterli değildir. Üçüncü tuzak, uyum sırasını karıştırmaktır: önce cinsiyet, sonra sayı, tersi değil — rápidas, rápidos eksi -o artı -a\'dan değil, rápida artı -s\'den gelir. Kontrol basittir: nitelik, bağlaçla hem cinsiyette hem sayıda aynı anda eşleşmelidir.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszym błędem jest zapomnienie o liczbie i pozostawienie cechy w liczbie pojedynczej obok somos: ', semantic: 'explanation' }, { text: 'Somos rápido', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' brzmi źle, bo łącznik już pokazuje grupę, a cecha zostaje sama. Drugą pułapką jest dodanie -s tam, gdzie potrzebne jest -es: fácils zamiast fáciles brzmi nie tak, bo po spółgłosce -l samo -s nie wystarcza. Trzecia pułapka to pomylenie kolejności zgody: najpierw rodzaj, potem liczba, a nie odwrotnie — rápidas powstaje z rápida plus -s, a nie z rápidos minus -o plus -a. Sprawdzenie jest proste: cecha musi zgadzać się z łącznikiem jednocześnie pod względem rodzaju i liczby.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Почему Somos rápido звучит неверно?',
        uk: 'Чому Somos rápido звучить неправильно?',
        es: 'Why does Somos rápido sound wrong?',
        'pt-BR': 'Por que Somos rápido soa errado?',
        vi: 'Tại sao Somos rápido nghe sai?',
        id: 'Mengapa Somos rápido terdengar salah?',
        tr: 'Somos rápido neden yanlış duyulur?',
        pl: 'Dlaczego Somos rápido brzmi źle?',
      }),
      choices: [
        L({ ru: 'Связка уже показывает группу, а признак остаётся один', uk: 'Зв’язка вже показує групу, а ознака лишається одна', es: 'The linking word already shows a group, while the quality stays alone', 'pt-BR': 'A ligação já mostra um grupo, enquanto a qualidade fica sozinha', vi: 'Từ nối đã thể hiện một nhóm, trong khi đặc điểm vẫn đứng một mình', id: 'Kata penghubung sudah menunjukkan kelompok, sementara sifatnya tetap sendiri', tr: 'Bağlaç zaten bir grup gösterirken nitelik tek başına kalır', pl: 'Łącznik już pokazuje grupę, a cecha zostaje sama' }),
        L({ ru: 'Rápido — неправильное слово', uk: 'Rápido — неправильне слово', es: 'Rápido is the wrong word', 'pt-BR': 'Rápido é a palavra errada', vi: 'Rápido là từ sai', id: 'Rápido adalah kata yang salah', tr: 'Rápido yanlış kelimedir', pl: 'Rápido to złe słowo' }),
        L({ ru: 'Somos — неправильная связка', uk: 'Somos — неправильна зв’язка', es: 'Somos is the wrong linking word', 'pt-BR': 'Somos é a ligação errada', vi: 'Somos là từ nối sai', id: 'Somos adalah kata penghubung yang salah', tr: 'Somos yanlış bağlaçtır', pl: 'Somos to zły łącznik' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Связка уже показывает группу, а признак остаётся один — дело не в самом слове rápido и не в связке somos, а в их несогласованном числе.',
        uk: 'Зв’язка вже показує групу, а ознака лишається одна — річ не в самому слові rápido і не в зв’язці somos, а в їхньому неузгодженому числі.',
        es: 'The linking word already shows a group, while the quality stays alone — the issue is not the word rápido itself or the linking word somos, but their mismatched number.',
        'pt-BR': 'A ligação já mostra um grupo, enquanto a qualidade fica sozinha — o problema não é a palavra rápido em si nem a ligação somos, mas o número não combinado entre elas.',
        vi: 'Từ nối đã thể hiện một nhóm, trong khi đặc điểm vẫn đứng một mình — vấn đề không phải ở bản thân từ rápido hay từ nối somos, mà ở việc số của chúng không khớp nhau.',
        id: 'Kata penghubung sudah menunjukkan kelompok, sementara sifatnya tetap sendiri — masalahnya bukan pada kata rápido itu sendiri atau kata penghubung somos, melainkan pada jumlah keduanya yang tidak cocok.',
        tr: 'Bağlaç zaten bir grup gösterirken nitelik tek başına kalır — sorun rápido kelimesinin kendisinde ya da somos bağlacında değil, ikisinin sayısının uyuşmamasındadır.',
        pl: 'Łącznik już pokazuje grupę, a cecha zostaje sama — problem nie leży w samym słowie rápido ani w łączniku somos, lecz w ich niezgodnej liczbie.',
      }),
    },
  },
];
