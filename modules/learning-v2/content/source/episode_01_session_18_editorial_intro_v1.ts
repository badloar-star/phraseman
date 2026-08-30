import type { LocalizedIntroRunsSource, LocalizedSource } from "./session_shard_from_source_v1";
// зачем (2026-08-30): body типизирован Partial по локалям — отсутствие
// локали обязано падать с кодом (session_18), а не давать undefined в раны.
function requireEditorialLocaleText(text: string | undefined, locale: string): string {
  if (!text) throw new Error(`session_18_editorial_locale_missing:${locale}`);
  return text;
}


type Locale = "ru" | "uk" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";
const LOCALES: readonly Locale[] = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"];
const L = (value: Record<Locale, string>): LocalizedSource => value as LocalizedSource;

export const EPISODE_01_SESSION_18_EDITORIAL_INTRO_V1: readonly LocalizedSource[] = Object.freeze([
  L({
    ru: "Чтобы отрицать состояние другого человека, английский сохраняет связку is и ставит not сразу после неё. Фраза He is not ready. означает «он не готов»: he называет мужчину, is удерживает связь, а not отменяет готовность. Русское «не» стоит перед словом «готов», но английское not ориентируется не на перевод, а на is. Поэтому порядок he + is + not нельзя разрывать или переставлять.",
    uk: "Щоб заперечити стан іншої людини, англійська зберігає зв’язку is і ставить not одразу після неї. Вислів He is not ready. означає «він не готовий»: he називає чоловіка, is тримає зв’язок, а not заперечує готовність. Українське «не» стоїть перед словом «готовий», але англійське not орієнтується на is. Тому порядок he + is + not не можна розривати чи міняти.",
    es: "Para negar el estado de otra persona, el inglés conserva is y coloca not justo después. He is not ready. significa «él no está listo»: he identifica al hombre, is mantiene la relación y not niega la disposición. En español no aparece una pieza separada después de está, porque no se integra antes del verbo. En inglés la posición sí es visible: he + is + not, sin desplazar ni borrar is.",
    "pt-BR": "Para negar o estado de outra pessoa, o inglês mantém is e coloca not logo depois. He is not ready. significa «ele não está pronto»: he identifica o homem, is faz a ligação e not nega a prontidão. Em português, não aparece antes de está; por isso é tentador copiar essa posição. O inglês organiza a negação de outro modo: he + is + not, sem apagar nem deslocar is.",
    vi: "Khi phủ định trạng thái của người khác, tiếng Anh vẫn giữ is và đặt not ngay sau đó. He is not ready. có nghĩa là “anh ấy chưa sẵn sàng”: he chỉ người nam, is nối người với trạng thái, còn not phủ định trạng thái ấy. Tiếng Việt đặt “không” trực tiếp trước phần miêu tả nên dễ bỏ quên is. Trong tiếng Anh, thứ tự phải nhìn thấy rõ: he + is + not.",
    id: "Untuk menyangkal keadaan orang lain, bahasa Inggris tetap memakai is lalu menaruh not tepat sesudahnya. He is not ready. berarti “dia laki-laki belum siap”: he menunjukkan orangnya, is menghubungkan, dan not menyangkal kesiapan. Bahasa Indonesia dapat memakai tidak langsung sebelum sifat, sehingga is mudah terlupa. Dalam bahasa Inggris urutannya harus tetap he + is + not.",
    tr: "Başka birinin durumunu olumsuz yaparken İngilizce is sözcüğünü korur ve not sözcüğünü hemen arkasına koyar. He is not ready. “erkek kişi hazır değil” demektir: he kişiyi, is bağlantıyı, not ise olumsuzluğu gösterir. Türkçede olumsuzluk değil ile sonda kurulur; bu sıra İngilizceye taşınmaz. İngilizcede görünür sıra he + is + not olarak kalır.",
    pl: "Aby zaprzeczyć stanowi innej osoby, angielski zachowuje is i stawia not bezpośrednio po nim. He is not ready. znaczy „on nie jest gotowy”: he wskazuje mężczyznę, is tworzy połączenie, a not je neguje. Po polsku nie stoi przed jest, lecz po angielsku not ma inne miejsce. Trzeba więc zachować widoczny szyk he + is + not, bez usuwania is.",
  }),
  L({
    ru: "Каркас отрицания состоит из четырёх частей: человек + is + not + состояние. В She is not ready. слово she показывает, что речь о женщине или девочке, затем is связывает её с описанием, not отрицает его, а ready называет сам признак. Последнее слово можно заменить: She is not tired. сообщает, что она не устала. Но середина is not остаётся вместе и всегда стоит после he или she.",
    uk: "Каркас заперечення має чотири частини: людина + is + not + стан. У She is not ready. слово she показує, що йдеться про жінку або дівчину, is поєднує її з описом, not заперечує його, а ready називає саму ознаку. Останнє слово можна змінити: She is not tired. повідомляє, що вона не втомилася. Проте середина is not лишається разом після he або she.",
    es: "La negación tiene cuatro piezas: persona + is + not + estado. En She is not ready., she identifica a una mujer o una niña, is la une con la descripción, not la niega y ready nombra la cualidad. La última palabra puede cambiar: She is not tired. dice que ella no está cansada. Lo estable es el centro is not, que aparece después de he o she y antes del estado.",
    "pt-BR": "A negação tem quatro partes: pessoa + is + not + estado. Em She is not ready., she identifica uma mulher ou menina, is liga essa pessoa à descrição, not nega a informação e ready nomeia a característica. A palavra final pode mudar: She is not tired. diz que ela não está cansada. O centro is not permanece unido, depois de he ou she e antes do estado.",
    vi: "Câu phủ định có bốn phần: người + is + not + trạng thái. Trong She is not ready., she chỉ người nữ, is nối người ấy với lời miêu tả, not phủ định, còn ready nêu đặc điểm. Có thể thay từ cuối: She is not tired. cho biết cô ấy không mệt. Phần giữa is not vẫn đi liền nhau, đứng sau he hoặc she và trước trạng thái cần phủ định.",
    id: "Kalimat negatif memiliki empat bagian: orang + is + not + keadaan. Dalam She is not ready., she menunjuk perempuan, is menghubungkannya dengan keterangan, not menyangkal, dan ready menyebut sifatnya. Kata terakhir dapat berubah: She is not tired. berarti ia tidak lelah. Bagian tengah is not tetap berdampingan setelah he atau she dan sebelum keadaan.",
    tr: "Olumsuz cümle dört parçadan oluşur: kişi + is + not + durum. She is not ready. içinde she kadın kişiyi gösterir, is onu açıklamaya bağlar, not olumsuzluk kurar, ready ise durumu adlandırır. Son sözcük değişebilir: She is not tired. onun yorgun olmadığını söyler. Ortadaki is not birlikte kalır; he ya da she sonrasında gelir.",
    pl: "Przeczenie składa się z czterech części: osoba + is + not + stan. W She is not ready. zaimek she wskazuje kobietę, is łączy ją z opisem, not zaprzecza, a ready nazywa cechę. Ostatnie słowo można zmienić: She is not tired. mówi, że ona nie jest zmęczona. Środek is not pozostaje razem, po he lub she i przed opisem.",
  }),
  L({
    ru: "Главная ловушка — поставить not перед связкой и получить He not is tired. Такой порядок похож на дословное «он не есть усталый», но английское отрицание так не строится. Нельзя и выбрасывать связку: He not tired. всё равно остаётся без формы is. Правильная фраза He is not tired. сначала соединяет he и состояние через is, а затем not превращает это сообщение в отрицательное.",
    uk: "Головна пастка — поставити not перед зв’язкою й отримати He not is tired. Такий порядок нагадує дослівне «він не є втомлений», але англійське заперечення так не будується. Не можна й викидати зв’язку: He not tired. усе одно лишається без is. Правильний вислів He is not tired. спочатку ставить is після he, а not уже заперечує стан.",
    es: "La trampa principal es colocar not antes de is y formar He not is tired. Esa posición puede parecerse al orden de «él no está cansado», pero el inglés no pone not delante de la cópula. Tampoco vale borrar is: He not tired. sigue incompleto. La forma correcta He is not tired. mantiene is después de he y coloca not entre la cópula y el estado que se niega.",
    "pt-BR": "A principal armadilha é colocar not antes de is e formar He not is tired. Essa ordem pode parecer uma cópia de «ele não está cansado», mas o inglês não põe not antes da cópula. Apagar is também não resolve: He not tired. continua incompleto. Em He is not tired., is vem depois de he e not fica entre a ligação e o estado negado.",
    vi: "Bẫy chính là đưa not lên trước is và tạo thành He not is tired. Trật tự này dễ xuất hiện khi bám theo “anh ấy không mệt”, nhưng tiếng Anh không đặt not trước từ nối. Bỏ hẳn is cũng sai: He not tired. vẫn thiếu phần bắt buộc. Câu He is not tired. giữ is ngay sau he rồi đặt not trước trạng thái cần phủ định.",
    id: "Jebakan utama ialah menaruh not sebelum is sehingga terbentuk He not is tired. Urutan itu mudah muncul ketika menyalin “dia tidak lelah”, tetapi bahasa Inggris tidak meletakkan not di depan penghubung. Menghapus is juga salah: He not tired. tetap tidak lengkap. Bentuk He is not tired. menaruh is setelah he, lalu not sebelum keadaan yang disangkal.",
    tr: "Temel tuzak, not sözcüğünü is önüne getirip He not is tired. demektir. Bu sıra Türkçedeki “o yorgun değil” yapısından hareketle cazip gelebilir, fakat İngilizce olumsuzluk böyle kurulmaz. Is tamamen atılırsa He not tired. eksik kalır. Doğru He is not tired. cümlesinde is he sonrasında, not ise durumdan hemen önce durur.",
    pl: "Główna pułapka to postawienie not przed is i utworzenie He not is tired. Taki szyk może kusić przez polskie „on nie jest zmęczony”, lecz angielski nie stawia not przed łącznikiem. Nie wolno też usunąć is: He not tired. nadal jest niepełne. Poprawne He is not tired. zachowuje is po he, a not umieszcza przed negowanym stanem.",
  }),
]);

const TARGETS = [
  { correct: ["He is not ready.", "he", "is", "not"], wrong: [] },
  { correct: ["She is not ready.", "She is not tired.", "he", "she", "is not"], wrong: [] },
  { correct: ["He is not tired.", "is", "not"], wrong: ["He not is tired.", "He not tired."] },
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

export const EPISODE_01_SESSION_18_EDITORIAL_RUNS_V1: readonly LocalizedIntroRunsSource[] = Object.freeze(
  EPISODE_01_SESSION_18_EDITORIAL_INTRO_V1.map((body, index) => Object.freeze(
    Object.fromEntries(LOCALES.map((locale) => [locale, semanticRuns(requireEditorialLocaleText(body[locale], locale), TARGETS[index]!.correct, TARGETS[index]!.wrong)])) as unknown as LocalizedIntroRunsSource,
  )),
);
