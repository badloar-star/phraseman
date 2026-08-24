import type {
  LocalizedIntroRunsSource,
  LocalizedSource,
} from "./session_shard_from_source_v1";

type Locale = "ru" | "uk" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";
const LOCALES: readonly Locale[] = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"];
const L = (value: Record<Locale, string>): LocalizedSource => value as LocalizedSource;

export const EPISODE_01_SESSION_17_EDITORIAL_INTRO_V1: readonly LocalizedSource[] = Object.freeze([
  L({
    ru: "He и she заменяют имя, когда уже понятно, о ком говорят. He указывает на мужчину или мальчика, а she — на женщину или девочку. В английской фразе одного местоимения и признака недостаточно: между ними обязательно появляется is. Поэтому «он готов» звучит He is ready., а выбор he или she меняет человека, но не форму is.",
    uk: "He і she замінюють ім’я, коли вже зрозуміло, про кого йдеться. He вказує на чоловіка або хлопця, а she — на жінку або дівчину. В англійському вислові самого займенника й ознаки недостатньо: між ними обов’язково з’являється is. Тому «він готовий» звучить He is ready., а вибір he чи she змінює людину, але не форму is.",
    es: "He y she sustituyen un nombre cuando ya está claro de quién se habla. He señala a un hombre o un niño, mientras she señala a una mujer o una niña. En inglés no basta con juntar el pronombre y la cualidad: entre ambos debe aparecer is. Por eso «él está listo» se expresa como He is ready.; cambiar he por she cambia a la persona, pero no cambia is.",
    "pt-BR": "He e she substituem o nome quando já está claro de quem se fala. He aponta para um homem ou menino, enquanto she aponta para uma mulher ou menina. Em inglês não basta juntar o pronome e a característica: is precisa aparecer entre os dois. Por isso «ele está pronto» fica He is ready.; trocar he por she muda a pessoa, mas não muda is.",
    vi: "He và she thay cho tên người khi người nghe đã biết ta đang nói về ai. He chỉ nam giới hoặc bé trai, còn she chỉ nữ giới hoặc bé gái. Trong tiếng Anh, chỉ ghép đại từ với đặc điểm là chưa đủ; is bắt buộc phải đứng giữa hai phần ấy. Vì vậy “anh ấy sẵn sàng” là He is ready.; đổi he thành she sẽ đổi người được nhắc tới nhưng is vẫn giữ nguyên.",
    id: "He dan she menggantikan nama ketika orang yang dibicarakan sudah jelas. He menunjuk laki-laki atau anak lelaki, sedangkan she menunjuk perempuan atau anak perempuan. Dalam bahasa Inggris, kata ganti dan sifat tidak boleh langsung ditempelkan; is wajib berada di antaranya. Karena itu “dia laki-laki siap” menjadi He is ready.; mengganti he dengan she mengubah orangnya, tetapi bentuk is tetap sama.",
    tr: "He ve she, kimden söz edildiği belliyken kişinin adının yerini tutar. He bir erkek ya da oğlanı, she ise bir kadın ya da kızı gösterir. İngilizcede zamir ile özellik yan yana bırakılmaz; aralarında mutlaka is bulunur. Bu yüzden “o hazır” anlamındaki erkek kişi için He is ready. denir; he yerine she seçmek kişiyi değiştirir, is biçimini değiştirmez.",
    pl: "He i she zastępują imię, gdy wiadomo już, o kim mówimy. He wskazuje mężczyznę albo chłopca, a she kobietę albo dziewczynę. Po angielsku nie wystarczy postawić zaimka obok cechy: pomiędzy nimi musi znaleźć się is. Dlatego „on jest gotowy” to He is ready.; wybór he albo she zmienia osobę, lecz nie zmienia formy is.",
  }),
  L({
    ru: "Фраза о другом человеке собирается в три ясные части: сначала he или she, затем is, потом состояние. В She is ready. слово she называет женщину или девочку, is связывает её с описанием, а ready сообщает, что она готова. С другим состоянием каркас остаётся тем же: She is tired. значит «она устала». Если человек меняется, выбирается другое местоимение, но рядом с he и she всё равно остаётся is.",
    uk: "Вислів про іншу людину складається з трьох чітких частин: спочатку he або she, потім is, далі стан. У She is ready. слово she називає жінку або дівчину, is поєднує її з описом, а ready повідомляє, що вона готова. З іншим станом каркас не змінюється: She is tired. означає «вона втомилася». Коли змінюється людина, обираємо інший займенник, але біля he та she все одно лишається is.",
    es: "Una frase sobre otra persona se forma con tres piezas claras: primero he o she, después is y al final el estado. En She is ready., she identifica a una mujer o una niña, is la une con la descripción y ready dice que está lista. Con otro estado se conserva la misma estructura: She is tired. significa que está cansada. Si cambia la persona, cambia el pronombre, pero tanto he como she siguen usando is.",
    "pt-BR": "Uma frase sobre outra pessoa tem três partes claras: primeiro he ou she, depois is e, por fim, o estado. Em She is ready., she identifica uma mulher ou menina, is faz a ligação e ready informa que ela está pronta. Com outro estado, a estrutura continua igual: She is tired. significa que ela está cansada. Quando a pessoa muda, muda-se o pronome, mas he e she continuam acompanhados de is.",
    vi: "Câu nói về người khác có ba phần rõ ràng: trước hết là he hoặc she, tiếp theo là is, cuối cùng là trạng thái. Trong She is ready., she chỉ một phụ nữ hoặc bé gái, is nối người ấy với lời miêu tả, còn ready cho biết cô ấy đã sẵn sàng. Khi trạng thái đổi, khung câu vẫn giữ nguyên: She is tired. nghĩa là cô ấy mệt. Người được nói tới có thể đổi, nhưng cả he lẫn she đều vẫn đi với is.",
    id: "Kalimat tentang orang lain tersusun dari tiga bagian yang jelas: he atau she, lalu is, kemudian keadaannya. Dalam She is ready., she menunjuk perempuan atau anak perempuan, is menghubungkannya dengan keterangan, dan ready menyatakan bahwa ia siap. Jika keadaannya berubah, kerangkanya tetap sama: She is tired. berarti ia lelah. Orangnya dapat berubah, tetapi he maupun she tetap memakai is.",
    tr: "Başka biri hakkındaki cümle üç açık parçayla kurulur: önce he ya da she, sonra is, en sonda durum. She is ready. cümlesinde she kadın ya da kızı gösterir, is onu açıklamaya bağlar, ready ise hazır olduğunu söyler. Durum değiştiğinde kalıp değişmez: She is tired. onun yorgun olduğunu bildirir. Kişiye göre zamir değişir, fakat he ve she yanında yine is kullanılır.",
    pl: "Zdanie o innej osobie składa się z trzech wyraźnych części: najpierw he albo she, następnie is, a na końcu stan. W She is ready. zaimek she wskazuje kobietę albo dziewczynę, is łączy ją z opisem, a ready mówi, że jest gotowa. Przy innym stanie szkielet pozostaje ten sam: She is tired. znaczy, że jest zmęczona. Osoba może się zmienić, lecz zarówno he, jak i she nadal wymagają is.",
  }),
  L({
    ru: "Самая частая ловушка — перенести короткое русское «он устал» и сказать He tired. В английском такая пара не становится полноценным сообщением, потому что между человеком и состоянием пропала связка. Форма are тоже не спасает фразу: He are tired. смешивает he с формой для you, we и they. Правильный вариант — He is tired.; is подходит третьему лицу в единственном числе и удерживает весь смысл вместе.",
    uk: "Найчастіша пастка — перенести коротке українське «він втомився» й сказати He tired. В англійській така пара не стає повним повідомленням, бо між людиною та станом зникла зв’язка. Форма are теж не виправляє вислів: He are tired. змішує he з формою для you, we та they. Правильний варіант — He is tired.; is підходить третій особі в однині й тримає весь зміст разом.",
    es: "La trampa más frecuente es copiar una frase breve como «él cansado» y decir He tired. En inglés esas dos palabras no forman un mensaje completo porque falta la unión entre la persona y su estado. Are tampoco arregla la frase: He are tired. mezcla he con la forma propia de you, we y they. La opción correcta es He is tired.; is corresponde a la tercera persona singular y mantiene unida toda la idea.",
    "pt-BR": "A armadilha mais comum é copiar uma forma curta como «ele cansado» e dizer He tired. Em inglês essas duas palavras não formam uma mensagem completa, pois falta a ligação entre a pessoa e o estado. Are também não resolve: He are tired. mistura he com a forma usada por you, we e they. A forma correta é He is tired.; is acompanha a terceira pessoa do singular e mantém a ideia inteira ligada.",
    vi: "Bẫy thường gặp nhất là bê nguyên cách nói ngắn rồi tạo thành He tired. Trong tiếng Anh, hai từ ấy chưa phải một thông điệp hoàn chỉnh vì thiếu từ nối giữa người và trạng thái. Dùng are cũng không sửa được câu: He are tired. đã ghép he với dạng dành cho you, we và they. Câu đúng là He is tired.; is phù hợp với ngôi thứ ba số ít và nối toàn bộ ý lại với nhau.",
    id: "Jebakan yang paling sering terjadi ialah menyalin pola pendek lalu mengatakan He tired. Dalam bahasa Inggris, dua kata itu belum menjadi pesan lengkap karena penghubung antara orang dan keadaannya hilang. Are juga tidak memperbaikinya: He are tired. mencampur he dengan bentuk untuk you, we, dan they. Bentuk yang benar ialah He is tired.; is cocok untuk orang ketiga tunggal dan menyatukan seluruh makna.",
    tr: "En yaygın tuzak, ana dildeki kısa yapıyı taşıyıp He tired. demektir. İngilizcede bu iki sözcük tam bir ileti oluşturmaz; kişiyle durumu birbirine bağlayan parça eksiktir. Are kullanmak da cümleyi düzeltmez: He are tired. he zamirini you, we ve they ile kullanılan biçimle karıştırır. Doğru cümle He is tired. olur; üçüncü tekil kişiyle is kullanılır ve bütün anlam birbirine bağlanır.",
    pl: "Najczęstsza pułapka polega na skopiowaniu krótkiej konstrukcji i powiedzeniu He tired. Po angielsku te dwa słowa nie tworzą pełnego komunikatu, ponieważ brakuje łącznika między osobą a jej stanem. Forma are także nie naprawia zdania: He are tired. miesza he z formą używaną przy you, we i they. Poprawnie mówimy He is tired.; is pasuje do trzeciej osoby liczby pojedynczej i spaja cały sens.",
  }),
]);

const TARGETS = [
  { correct: ["He", "she", "He is ready.", "is"], wrong: [] },
  { correct: ["he", "she", "is", "She is ready.", "She is tired."], wrong: [] },
  { correct: ["He is tired.", "is"], wrong: ["He tired.", "He are tired.", "are"] },
] as const;

function semanticRuns(text: string, correct: readonly string[], wrong: readonly string[]) {
  const terms = [
    ...correct.map((value) => ({ value, semantic: "targetCorrect" as const })),
    ...wrong.map((value) => ({ value, semantic: "targetWrong" as const })),
  ].sort((a, b) => b.value.length - a.value.length);
  const runs: { text: string; semantic: "explanation" | "targetCorrect" | "targetWrong" }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let next: { index: number; value: string; semantic: "targetCorrect" | "targetWrong" } | null = null;
    for (const term of terms) {
      const index = text.indexOf(term.value, cursor);
      if (index >= 0 && (!next || index < next.index || (index === next.index && term.value.length > next.value.length))) next = { index, ...term };
    }
    if (!next) { runs.push({ text: text.slice(cursor), semantic: "explanation" }); break; }
    if (next.index > cursor) runs.push({ text: text.slice(cursor, next.index), semantic: "explanation" });
    runs.push({ text: next.value, semantic: next.semantic });
    cursor = next.index + next.value.length;
  }
  return Object.freeze(runs);
}

export const EPISODE_01_SESSION_17_EDITORIAL_RUNS_V1: readonly LocalizedIntroRunsSource[] =
  Object.freeze(EPISODE_01_SESSION_17_EDITORIAL_INTRO_V1.map((body, index) =>
    Object.freeze(Object.fromEntries(LOCALES.map((locale) => [
      locale,
      semanticRuns(body[locale], TARGETS[index]!.correct, TARGETS[index]!.wrong),
    ])) as LocalizedIntroRunsSource),
  ));
