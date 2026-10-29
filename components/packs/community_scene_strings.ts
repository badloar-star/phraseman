// community_scene_strings.ts — тексты конкурса на главной Сообщества (этап «До конца конкурса», шторка «Условия участия») на 9 языках.
// зачем (координатор 29.10, Переводчик): CommunityScene говорил LP(ru, en) = { ru, uk: en, es: en, en } — украинец, испанец и ещё 5 языков
// видели английский. Ключ — русская строка из вызова LP(…), поэтому вызовы на экране не меняются; «N место» и «N дней» разбираются по шаблону.
// «Сердечко» (голос в конкурсе): corazón / coração / trái tim / hati / kalp / serduszko.
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWord } from '../../constants/plural';

type Nine = Readonly<{ uk: string; es: string; ptBr: string; vi: string; id: string; tr: string; pl: string }>;

const BY_RU: Readonly<Record<string, Nine>> = {
  'Создавай и делись': { uk: 'Створюй і ділися', es: 'Crea y comparte', ptBr: 'Crie e compartilhe', vi: 'Tạo và chia sẻ', id: 'Buat dan bagikan', tr: 'Oluştur ve paylaş', pl: 'Twórz i udostępniaj' },
  'Опубликованные наборы доступны другим участникам: они могут добавлять их себе и учиться по твоим карточкам. Участвовать можно каждый месяц, пока набор не занял призовое место.': {
    uk: 'Опубліковані набори доступні іншим учасникам: вони можуть додавати їх собі й учитися за твоїми картками. Брати участь можна щомісяця, доки набір не посів призове місце.',
    es: 'Los packs publicados están disponibles para otros participantes: pueden añadirlos y estudiar con tus tarjetas. Un pack puede participar cada mes hasta que gane un premio.',
    ptBr: 'Os pacotes publicados ficam disponíveis para outros participantes: eles podem adicioná-los e estudar com os seus cartões. Um pacote pode participar todo mês até ganhar um prêmio.',
    vi: 'Bộ thẻ đã đăng sẽ hiển thị với người khác: họ có thể thêm về và học bằng thẻ của bạn. Bộ thẻ được tham gia mỗi tháng cho đến khi đạt giải.',
    id: 'Paket yang diterbitkan bisa dilihat peserta lain: mereka bisa menambahkannya dan belajar dengan kartumu. Paket boleh ikut setiap bulan sampai meraih hadiah.',
    tr: 'Yayınlanan paketler diğer katılımcılara açıktır: onları ekleyip kartlarınla çalışabilirler. Bir paket ödül kazanana kadar her ay yarışabilir.',
    pl: 'Opublikowane zestawy są dostępne dla innych uczestników: mogą je dodać i uczyć się z twoich kart. Zestaw może brać udział co miesiąc, dopóki nie zdobędzie nagrody.',
  },
  'Лучшие выбирают участники': { uk: 'Найкращих обирають учасники', es: 'Los participantes eligen a los mejores', ptBr: 'Os participantes escolhem os melhores', vi: 'Người tham gia chọn bộ hay nhất', id: 'Peserta memilih yang terbaik', tr: 'En iyileri katılımcılar seçer', pl: 'Najlepsze wybierają uczestnicy' },
  'Понравился набор? Поставь ему сердечко. Место в конкурсе зависит только от новых сердечек за текущий месяц. Один участник может поставить набору одно сердечко.': {
    uk: 'Сподобався набір? Постав йому сердечко. Місце в конкурсі залежить лише від нових сердечок за поточний місяць. Один учасник може поставити набору одне сердечко.',
    es: '¿Te gusta un pack? Dale un corazón. El puesto en el concurso depende solo de los corazones nuevos de este mes. Cada participante puede dar un corazón por pack.',
    ptBr: 'Gostou de um pacote? Dê um coração. A colocação no concurso depende só dos corações novos deste mês. Cada participante pode dar um coração por pacote.',
    vi: 'Thích một bộ thẻ? Hãy thả trái tim. Thứ hạng chỉ tính trái tim mới trong tháng này. Mỗi người chỉ thả được một trái tim cho mỗi bộ.',
    id: 'Suka sebuah paket? Beri hati. Peringkat hanya dihitung dari hati baru bulan ini. Setiap peserta bisa memberi satu hati per paket.',
    tr: 'Bir paketi beğendin mi? Ona kalp ver. Sıralama yalnızca bu ayki yeni kalplere bağlıdır. Her katılımcı bir pakete bir kalp verebilir.',
    pl: 'Podoba ci się zestaw? Daj mu serduszko. Miejsce w konkursie zależy tylko od nowych serduszek w tym miesiącu. Każdy uczestnik może dać zestawowi jedno serduszko.',
  },
  'Три лучших набора — три награды': { uk: 'Три найкращі набори — три нагороди', es: 'Tres mejores packs, tres premios', ptBr: 'Três melhores pacotes, três prêmios', vi: 'Ba bộ hay nhất, ba giải thưởng', id: 'Tiga paket terbaik, tiga hadiah', tr: 'En iyi üç paket, üç ödül', pl: 'Trzy najlepsze zestawy, trzy nagrody' },
  'В конце месяца авторы трёх наборов с наибольшим числом сердечек получают награды:': {
    uk: 'Наприкінці місяця автори трьох наборів із найбільшою кількістю сердечок отримують нагороди:',
    es: 'Al final del mes, los autores de los tres packs con más corazones reciben premios:',
    ptBr: 'No fim do mês, os autores dos três pacotes com mais corações recebem prêmios:',
    vi: 'Cuối tháng, tác giả của ba bộ thẻ nhiều trái tim nhất nhận thưởng:',
    id: 'Di akhir bulan, pembuat tiga paket dengan hati terbanyak mendapat hadiah:',
    tr: 'Ay sonunda en çok kalp alan üç paketin yazarları ödül alır:',
    pl: 'Na koniec miesiąca autorzy trzech zestawów z największą liczbą serduszek dostają nagrody:',
  },
  'Закрыть': { uk: 'Закрити', es: 'Cerrar', ptBr: 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' },
  'Как участвовать': { uk: 'Як брати участь', es: 'Cómo participar', ptBr: 'Como participar', vi: 'Cách tham gia', id: 'Cara ikut', tr: 'Nasıl katılırsın', pl: 'Jak wziąć udział' },
  'Делись наборами, учись с другими и получай награды.': { uk: 'Ділися наборами, учися з іншими й отримуй нагороди.', es: 'Comparte packs, aprende con otros y gana premios.', ptBr: 'Compartilhe pacotes, aprenda com outros e ganhe prêmios.', vi: 'Chia sẻ bộ thẻ, học cùng mọi người và nhận thưởng.', id: 'Bagikan paket, belajar bersama, dan dapatkan hadiah.', tr: 'Paket paylaş, başkalarıyla öğren ve ödül kazan.', pl: 'Udostępniaj zestawy, ucz się z innymi i zdobywaj nagrody.' },
  'Plus на 3 месяца': { uk: 'Plus на 3 місяці', es: 'Plus por 3 meses', ptBr: 'Plus por 3 meses', vi: 'Plus 3 tháng', id: 'Plus 3 bulan', tr: '3 ay Plus', pl: 'Plus na 3 miesiące' },
  'Plus на 2 месяца': { uk: 'Plus на 2 місяці', es: 'Plus por 2 meses', ptBr: 'Plus por 2 meses', vi: 'Plus 2 tháng', id: 'Plus 2 bulan', tr: '2 ay Plus', pl: 'Plus na 2 miesiące' },
  'Plus на 1 месяц': { uk: 'Plus на 1 місяць', es: 'Plus por 1 mes', ptBr: 'Plus por 1 mês', vi: 'Plus 1 tháng', id: 'Plus 1 bulan', tr: '1 ay Plus', pl: 'Plus na 1 miesiąc' },
  '2000 монет': { uk: '2000 монет', es: '2000 monedas', ptBr: '2000 moedas', vi: '2000 xu', id: '2000 koin', tr: '2000 jeton', pl: '2000 monet' },
  '1000 монет': { uk: '1000 монет', es: '1000 monedas', ptBr: '1000 moedas', vi: '1000 xu', id: '1000 koin', tr: '1000 jeton', pl: '1000 monet' },
  'Первый конкурс — с 1 ноября 2026 года. Далее — каждый календарный месяц по UTC. Старые сердечки не переносятся в рейтинг нового месяца. Набор может участвовать снова, пока ни разу не занял 1, 2 или 3 место. После любого призового места он больше не участвует. Чужому набору можно поставить сердечко сразу, без добавления себе; сердечко можно убрать. Собственный набор поддержать нельзя.': {
    uk: 'Перший конкурс — з 1 листопада 2026 року. Далі — щокалендарного місяця за UTC. Старі сердечка не переносяться в рейтинг нового місяця. Набір може брати участь знову, доки жодного разу не посів 1, 2 чи 3 місце. Після будь-якого призового місця він більше не бере участі. Чужому набору можна поставити сердечко одразу, без додавання собі; сердечко можна прибрати. Підтримати власний набір не можна.',
    es: 'El primer concurso empieza el 1 de noviembre de 2026. Después, cada mes natural según la hora UTC. Los corazones antiguos no pasan a la clasificación del mes nuevo. Un pack puede participar de nuevo mientras no haya quedado 1.º, 2.º o 3.º. Tras cualquier premio, ya no participa. Puedes dar un corazón al pack de otra persona sin añadirlo antes, y puedes quitarlo. No puedes apoyar tu propio pack.',
    ptBr: 'O primeiro concurso começa em 1º de novembro de 2026. Depois, a cada mês do calendário, pelo horário UTC. Corações antigos não passam para a classificação do mês novo. Um pacote pode participar de novo enquanto não tiver ficado em 1º, 2º ou 3º lugar. Depois de qualquer prêmio, ele não participa mais. Você pode dar um coração ao pacote de outra pessoa sem adicioná-lo antes, e pode tirar o coração. Não é possível apoiar o próprio pacote.',
    vi: 'Cuộc thi đầu tiên bắt đầu từ 1/11/2026, sau đó diễn ra mỗi tháng dương lịch theo giờ UTC. Trái tim cũ không được tính sang bảng xếp hạng tháng mới. Bộ thẻ được tham gia lại nếu chưa từng đạt hạng 1, 2 hoặc 3. Sau khi đạt bất kỳ giải nào, bộ thẻ không tham gia nữa. Bạn có thể thả tim cho bộ của người khác mà không cần thêm về, và có thể bỏ tim. Không thể ủng hộ bộ của chính mình.',
    id: 'Kontes pertama dimulai 1 November 2026, lalu setiap bulan kalender menurut waktu UTC. Hati lama tidak dibawa ke peringkat bulan baru. Paket boleh ikut lagi selama belum pernah meraih peringkat 1, 2, atau 3. Setelah meraih hadiah apa pun, paket tidak ikut lagi. Kamu bisa memberi hati pada paket orang lain tanpa menambahkannya dulu, dan bisa membatalkannya. Paket sendiri tidak bisa didukung.',
    tr: 'İlk yarışma 1 Kasım 2026’da başlar, sonra her takvim ayında UTC saatine göre yapılır. Eski kalpler yeni ayın sıralamasına geçmez. Bir paket hiç 1., 2. ya da 3. olmadıysa yeniden katılabilir. Herhangi bir ödülden sonra artık katılmaz. Başkasının paketine eklemeden kalp verebilir ve kalbini geri alabilirsin. Kendi paketini destekleyemezsin.',
    pl: 'Pierwszy konkurs rusza 1 listopada 2026 r. Potem — co miesiąc kalendarzowy według czasu UTC. Stare serduszka nie przechodzą do rankingu nowego miesiąca. Zestaw może startować ponownie, dopóki ani razu nie zajął 1., 2. ani 3. miejsca. Po każdej nagrodzie już nie startuje. Cudzemu zestawowi możesz dać serduszko od razu, bez dodawania go do siebie; serduszko można cofnąć. Własnego zestawu nie można wspierać.',
  },
  'Итоги фиксируются после окончания месяца. При равном числе сердечек выше набор, опубликованный раньше. Снятые с публикации наборы и наборы без сердечек призов не получают. Если подходящих наборов меньше трёх, награждаются только они. Приз каждого набора можно получить один раз; при сбое сети он сохраняется.': {
    uk: 'Підсумки фіксуються після закінчення місяця. За однакової кількості сердечок вище набір, опублікований раніше. Зняті з публікації набори й набори без сердечок призів не отримують. Якщо відповідних наборів менше трьох, нагороджують лише їх. Приз кожного набору можна отримати один раз; у разі збою мережі він зберігається.',
    es: 'Los resultados se fijan al terminar el mes. Si hay empate en corazones, gana el pack publicado antes. Los packs retirados y los que no tienen corazones no reciben premio. Si hay menos de tres packs que cumplan, solo ellos reciben premio. El premio de cada pack se puede recibir una vez; si falla la conexión, se guarda.',
    ptBr: 'Os resultados são definidos depois do fim do mês. Em caso de empate em corações, fica à frente o pacote publicado antes. Pacotes despublicados e pacotes sem corações não ganham prêmios. Se houver menos de três pacotes válidos, só eles são premiados. O prêmio de cada pacote pode ser recebido uma vez; se a conexão falhar, ele fica guardado.',
    vi: 'Kết quả được chốt sau khi tháng kết thúc. Nếu bằng số trái tim, bộ đăng sớm hơn xếp trên. Bộ đã gỡ và bộ không có trái tim nào sẽ không nhận giải. Nếu có ít hơn ba bộ hợp lệ, chỉ các bộ đó được thưởng. Giải của mỗi bộ chỉ nhận được một lần; nếu mất mạng, giải vẫn được giữ lại.',
    id: 'Hasil ditetapkan setelah bulan berakhir. Jika jumlah hati sama, paket yang terbit lebih dulu berada di atas. Paket yang ditarik dan paket tanpa hati tidak mendapat hadiah. Jika paket yang memenuhi syarat kurang dari tiga, hanya paket itu yang diberi hadiah. Hadiah tiap paket bisa diambil sekali; jika koneksi gagal, hadiah tetap tersimpan.',
    tr: 'Sonuçlar ay bittikten sonra kesinleşir. Kalp sayısı eşitse önce yayınlanan paket öne geçer. Yayından kaldırılan ve hiç kalbi olmayan paketler ödül almaz. Uygun paket üçten azsa yalnızca onlar ödüllendirilir. Her paketin ödülü bir kez alınabilir; bağlantı koparsa ödül saklanır.',
    pl: 'Wyniki są ustalane po zakończeniu miesiąca. Przy równej liczbie serduszek wyżej jest zestaw opublikowany wcześniej. Zestawy wycofane z publikacji i bez serduszek nie dostają nagród. Jeśli pasujących zestawów jest mniej niż trzy, nagradzane są tylko one. Nagrodę każdego zestawu można odebrać raz; przy awarii sieci zostaje zachowana.',
  },
  'Понятно': { uk: 'Зрозуміло', es: 'Entendido', ptBr: 'Entendi', vi: 'Đã hiểu', id: 'Mengerti', tr: 'Anladım', pl: 'Jasne' },
  'До начала конкурса': { uk: 'До початку конкурсу', es: 'Empieza en', ptBr: 'Começa em', vi: 'Bắt đầu sau', id: 'Dimulai dalam', tr: 'Başlamasına', pl: 'Start za' },
  'До конца конкурса': { uk: 'До кінця конкурсу', es: 'Termina en', ptBr: 'Termina em', vi: 'Kết thúc sau', id: 'Berakhir dalam', tr: 'Bitmesine', pl: 'Koniec za' },
  'Условия участия': { uk: 'Умови участі', es: 'Cómo participar', ptBr: 'Como participar', vi: 'Thể lệ', id: 'Syarat ikut', tr: 'Katılım koşulları', pl: 'Zasady udziału' },
  'Твой набор': { uk: 'Твій набір', es: 'Tu pack', ptBr: 'Seu pacote', vi: 'Bộ thẻ của bạn', id: 'Paketmu', tr: 'Paketin', pl: 'Twój zestaw' },
  'место': { uk: 'місце', es: 'puesto', ptBr: 'lugar', vi: 'hạng', id: 'peringkat', tr: 'sıra', pl: 'miejsce' },
  'Место свободно': { uk: 'Місце вільне', es: 'Puesto libre', ptBr: 'Lugar livre', vi: 'Còn trống', id: 'Masih kosong', tr: 'Boş sıra', pl: 'Wolne miejsce' },
};

/** «1 место» — номер места в конкурсе. */
export function communityPlaceLabel(lang: Lang, n: number): string {
  return triLang(lang, { ru: `${n} место`, uk: `${n} місце`, en: `Place ${n}`, es: `Puesto ${n}`, 'pt-BR': `${n}º lugar`, vi: `Hạng ${n}`, id: `Peringkat ${n}`, tr: `${n}. sıra`, pl: `${n}. miejsce` });
}

/** «12 дней» — сколько дней до начала/конца конкурса (с формой слова для каждого языка). */
export function communityDaysLabel(lang: Lang, n: number): string {
  const w = (one: string, few: string, many: string) => `${n} ${pluralWord(lang, n, { one, few, many })}`;
  return triLang(lang, {
    ru: w('день', 'дня', 'дней'), uk: w('день', 'дні', 'днів'), en: w('day', 'days', 'days'), es: w('día', 'días', 'días'),
    'pt-BR': w('dia', 'dias', 'dias'), vi: `${n} ngày`, id: `${n} hari`, tr: `${n} gün`, pl: w('dzień', 'dni', 'dni'),
  });
}

/**
 * Текст по русскому ключу и английскому варианту из вызова LP(ru, en) на экране.
 * «N место» и «N день/дня/дней» узнаются по шаблону. Нет перевода — английский для всех, кроме ru (как было) и предупреждение в dev.
 */
export function communitySceneText(lang: Lang, ru: string, en: string): string {
  const place = ru.match(/^(\d+) место$/);
  if (place) return communityPlaceLabel(lang, Number(place[1]));
  const days = ru.match(/^(\d+) (?:день|дня|дней)$/);
  if (days) return communityDaysLabel(lang, Number(days[1]));
  const t = BY_RU[ru];
  if (!t) {
    // голый __DEV__ в тестах — ReferenceError, поэтому через typeof
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`[COMMUNITY-SCENE-I18N] нет перевода для «${ru.slice(0, 60)}» — показываю английский`);
    return triLang(lang, { ru, uk: en, en, es: en });
  }
  return triLang(lang, { ru, uk: t.uk, en, es: t.es, 'pt-BR': t.ptBr, vi: t.vi, id: t.id, tr: t.tr, pl: t.pl });
}
