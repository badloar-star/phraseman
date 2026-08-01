// Weekly Boons — локализованные тексты бонусов (8 языков).
//
// СТИЛЬ по Библии Phraseman: «ИГРА» (Game Voice) — язык наград и владения:
// «твоё», «открыто», «разблокировано», короткие строки, один эмодзи максимум
// (огонь/молния/звезда — не смайлики), на «ты», без пафоса и без loss-framing
// («защити серию», не «пропустишь»). Запрещённые слова Библии не используются
// (урок→раунд/сессия, ошибка→попытка, статистика→результаты, бесплатно→попробуй).

import { triLang, type Lang } from '../../constants/i18n';
import type { BoonId } from './boon_types';

export interface BoonCopy {
  emoji: string;
  title: string;
  subtitle: string;
  /** Развёрнутое описание для модалки: несколько абзацев простыми словами. */
  detail: readonly string[];
}

type TriText = { ru: string; uk: string; es: string } & Partial<
  Record<'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>
>;

/** Многострочное описание (абзацы) на каждый язык. Обязателен ru, остальные опц. */
type TriParagraphs = { ru: string[]; uk: string[]; es: string[] } & Partial<
  Record<'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string[]>
>;

interface BoonCopySource {
  emoji: string;
  title: TriText;
  subtitle: TriText;
  /**
   * Развёрнутое описание подарка для модалки (по тапу на плашку). Простыми словами,
   * по Библии (Game Voice, на «ты», без loss-framing). День недели НЕ упоминается —
   * расписание задаётся в «Пульте» и может меняться.
   */
  detail: TriParagraphs;
}

const BOON_COPY: Record<BoonId, BoonCopySource> = {
  streak_saver: {
    emoji: '🛡',
    title: {
      ru: 'Серия под щитом',
      uk: 'Серія під щитом',
      es: 'Racha protegida',
      'pt-BR': 'Sequência protegida',
      vi: 'Chuỗi được bảo vệ',
      id: 'Streak terlindungi',
      tr: 'Seri kalkan altında',
      pl: 'Seria pod tarczą',
    },
    subtitle: {
      ru: 'Сегодня твоя серия под защитой. Заходи спокойно.',
      uk: 'Сьогодні твоя серія під захистом. Заходь спокійно.',
      es: 'Hoy tu racha está a salvo. Entra tranquilo.',
      'pt-BR': 'Hoje sua sequência está segura. Entre tranquilo.',
      vi: 'Hôm nay chuỗi của bạn an toàn. Cứ thoải mái.',
      id: 'Hari ini streak-mu aman. Santai saja.',
      tr: 'Bugün serin güvende. Rahatça gir.',
      pl: 'Dziś twoja seria jest bezpieczna. Wejdź spokojnie.',
    },
    detail: {
      ru: [
        'Твоя серия — это огонёк рядом со счётчиком дней. Обычно он гаснет, если за день не позаниматься. Сегодня этого не случится.',
        'Мы поставили на сегодня бесплатный щит. Даже если ты вообще не зайдёшь в занятия — серия сохранится и завтра продолжится как ни в чём не бывало.',
        'Ничего нажимать не нужно — щит уже работает. Это наш подарок, чтобы ты мог выдохнуть и не бояться потерять прогресс.',
      ],
      uk: [
        'Твоя серія — це вогник поряд із лічильником днів. Зазвичай він гасне, якщо за день не позайматися. Сьогодні цього не станеться.',
        'Ми поставили на сьогодні безкоштовний щит. Навіть якщо ти зовсім не зайдеш у заняття — серія збережеться й завтра продовжиться як ні в чому не бувало.',
        'Нічого натискати не треба — щит уже працює. Це наш подарунок, щоб ти міг видихнути й не боятися втратити прогрес.',
      ],
      es: [
        'Tu racha es la llamita junto al contador de días. Normalmente se apaga si un día no practicas. Hoy eso no pasará.',
        'Hemos puesto un escudo gratis para hoy. Aunque no entres a practicar, tu racha se mantiene y mañana sigue como si nada.',
        'No tienes que tocar nada: el escudo ya está activo. Es nuestro regalo para que respires tranquilo y no temas perder tu progreso.',
      ],
      'pt-BR': [
        'Sua sequência é a chama ao lado do contador de dias. Normalmente ela apaga se você não praticar no dia. Hoje isso não vai acontecer.',
        'Colocamos um escudo grátis para hoje. Mesmo que você não entre para praticar, sua sequência se mantém e amanhã continua como sempre.',
        'Não precisa tocar em nada: o escudo já está ativo. É o nosso presente para você relaxar e não ter medo de perder o progresso.',
      ],
      vi: [
        'Chuỗi của bạn là ngọn lửa nhỏ cạnh bộ đếm ngày. Bình thường nó sẽ tắt nếu một ngày bạn không luyện tập. Hôm nay thì không.',
        'Chúng tôi đã đặt một lá chắn miễn phí cho hôm nay. Dù bạn không vào luyện tập, chuỗi vẫn được giữ và ngày mai tiếp tục như thường.',
        'Bạn không cần làm gì — lá chắn đã bật rồi. Đây là món quà để bạn thở phào và không sợ mất tiến độ.',
      ],
      id: [
        'Streak-mu adalah nyala api di sebelah penghitung hari. Biasanya padam kalau sehari kamu tidak berlatih. Hari ini tidak akan.',
        'Kami pasang perisai gratis untuk hari ini. Walau kamu tidak masuk berlatih, streak tetap terjaga dan besok lanjut seperti biasa.',
        'Tak perlu menekan apa pun — perisainya sudah aktif. Ini hadiah kami supaya kamu tenang dan tak takut kehilangan progres.',
      ],
      tr: [
        'Serin, gün sayacının yanındaki küçük alev. Normalde bir gün çalışmazsan söner. Bugün sönmeyecek.',
        'Bugün için ücretsiz bir kalkan koyduk. Hiç çalışmaya girmesen bile serin korunur ve yarın hiçbir şey olmamış gibi devam eder.',
        'Bir şeye dokunmana gerek yok — kalkan zaten aktif. Bu, rahat bir nefes alıp ilerlemeni kaybetmekten korkmaman için hediyemiz.',
      ],
      pl: [
        'Twoja seria to płomyk obok licznika dni. Zwykle gaśnie, jeśli przez dzień nie poćwiczysz. Dziś tak się nie stanie.',
        'Założyliśmy na dziś darmową tarczę. Nawet jeśli w ogóle nie wejdziesz w ćwiczenia, seria zostaje i jutro leci dalej jak gdyby nigdy nic.',
        'Nic nie musisz klikać — tarcza już działa. To nasz prezent, żebyś odetchnął i nie bał się stracić postępu.',
      ],
    },
  },
  mystery_monday: {
    emoji: '🎁',
    title: {
      ru: 'Сундук недели',
      uk: 'Скриня тижня',
      es: 'Cofre de la semana',
      'pt-BR': 'Baú da semana',
      vi: 'Rương của tuần',
      id: 'Peti minggu ini',
      tr: 'Haftanın sandığı',
      pl: 'Skrzynia tygodnia',
    },
    subtitle: {
      ru: 'Внутри награда. Открой и забери своё.',
      uk: 'Усередині нагорода. Відкрий і забери своє.',
      es: 'Dentro hay una recompensa. Ábrelo y es tuyo.',
      'pt-BR': 'Dentro tem recompensa. Abra e pegue o seu.',
      vi: 'Bên trong có phần thưởng. Mở ra và nhận đi.',
      id: 'Ada hadiah di dalam. Buka dan ambil milikmu.',
      tr: 'İçinde ödül var. Aç ve seninki olsun.',
      pl: 'W środku nagroda. Otwórz i bierz swoje.',
    },
    detail: {
      ru: [
        'Сегодня тебя ждёт сундук с сюрпризом. Что внутри — заранее неизвестно: иногда жемчужины, иногда что-то приятное сверху.',
        'Открыть можно один раз. Просто загляни в приложение — сундук сам предложит себя открыть, и награда сразу станет твоей.',
        'Это маленький праздник без всяких условий: ничего покупать не нужно, подарок уже приготовлен для тебя.',
      ],
      uk: [
        'Сьогодні на тебе чекає скриня із сюрпризом. Що всередині — заздалегідь невідомо: інколи жемчужини, інколи щось приємне понад те.',
        'Відкрити можна один раз. Просто зазирни в застосунок — скриня сама запропонує відкрити її, і нагорода одразу стане твоєю.',
        'Це маленьке свято без жодних умов: нічого купувати не треба, подарунок уже приготовлено для тебе.',
      ],
      es: [
        'Hoy te espera un cofre sorpresa. Lo que hay dentro es un misterio: a veces perlas, a veces algo extra agradable.',
        'Se abre una sola vez. Solo entra a la app: el cofre te pedirá abrirlo y la recompensa será tuya al instante.',
        'Es una pequeña fiesta sin condiciones: no hay que comprar nada, el regalo ya está listo para ti.',
      ],
      'pt-BR': [
        'Hoje tem um baú surpresa esperando por você. O que tem dentro é mistério: às vezes perlas, às vezes algo extra bacana.',
        'Dá pra abrir uma vez. É só entrar no app: o baú vai se oferecer para abrir e a recompensa já vira sua.',
        'É uma pequena festa sem condições: não precisa comprar nada, o presente já está pronto para você.',
      ],
      vi: [
        'Hôm nay có một rương bất ngờ đang chờ bạn. Bên trong là bí mật: đôi khi là xu, đôi khi là thứ gì đó vui hơn.',
        'Chỉ mở được một lần. Cứ vào ứng dụng — rương sẽ tự mời bạn mở, và phần thưởng lập tức là của bạn.',
        'Đây là một niềm vui nhỏ không kèm điều kiện: không cần mua gì, quà đã sẵn sàng cho bạn.',
      ],
      id: [
        'Hari ini ada peti kejutan menunggumu. Isinya rahasia: kadang serpihan, kadang sesuatu yang lebih menyenangkan.',
        'Bisa dibuka sekali. Cukup masuk ke aplikasi — peti akan menawarkan dirinya untuk dibuka, dan hadiah langsung jadi milikmu.',
        'Ini pesta kecil tanpa syarat: tak perlu beli apa pun, hadiahnya sudah disiapkan untukmu.',
      ],
      tr: [
        'Bugün seni bir sürpriz sandığı bekliyor. İçinde ne var, önceden belli değil: bazen jetonlar, bazen üstüne güzel bir şey.',
        'Bir kez açılır. Uygulamaya girmen yeter — sandık kendini açmanı isteyecek ve ödül anında senin olacak.',
        'Bu, koşulsuz küçük bir kutlama: hiçbir şey satın almana gerek yok, hediye senin için çoktan hazır.',
      ],
      pl: [
        'Dziś czeka na ciebie skrzynia-niespodzianka. Co jest w środku, nie wiadomo z góry: czasem monety, czasem coś miłego ekstra.',
        'Otwierasz raz. Po prostu wejdź do aplikacji — skrzynia sama zaproponuje otwarcie, a nagroda od razu będzie twoja.',
        'To małe święto bez żadnych warunków: nic nie trzeba kupować, prezent już jest dla ciebie gotowy.',
      ],
    },
  },
  turbo_regen: {
    emoji: '⚡',
    title: {
      ru: 'Заряд на максимум',
      uk: 'Заряд на максимум',
      es: 'Carga al máximo',
      'pt-BR': 'Carga no máximo',
      vi: 'Sạc tối đa',
      id: 'Isi penuh ekstra',
      tr: 'Tam şarj',
      pl: 'Ładowanie na maksa',
    },
    subtitle: {
      ru: 'Заряд возвращается вдвое быстрее весь день.',
      uk: 'Заряд повертається вдвічі швидше весь день.',
      es: 'La carga vuelve el doble de rápido. Dale más.',
      'pt-BR': 'A carga volta o dobro mais rápido. Vá mais longe.',
      vi: 'Năng lượng hồi gấp đôi. Chơi lâu hơn.',
      id: 'Daya pulih dua kali cepat. Lanjut lebih lama.',
      tr: 'Şarj iki kat hızlı döner. Daha çok devam et.',
      pl: 'Ładunek wraca dwa razy szybciej. Graj dłużej.',
    },
    detail: {
      ru: [
        'Заряд — это твоя энергия для занятий. Обычно после того, как он кончился, нужно ждать, пока он восстановится. Сегодня ждать придётся вдвое меньше.',
        'Это значит, что ты можешь заниматься почти без перерывов: заряд набегает в два раза быстрее весь день.',
        'Отличный повод пройти больше, чем обычно, и подтянуть всё, до чего давно не доходили руки.',
      ],
      uk: [
        'Заряд — це твоя енергія для занять. Зазвичай, коли він закінчився, треба чекати, поки відновиться. Сьогодні чекати вдвічі менше.',
        'Це означає, що ти можеш займатися майже без перерв: заряд набігає вдвічі швидше весь день.',
        'Чудовий привід пройти більше, ніж зазвичай, і підтягнути все, до чого давно не доходили руки.',
      ],
      es: [
        'La carga es tu energía para practicar. Normalmente, cuando se acaba, hay que esperar a que se recupere. Hoy esperas la mitad.',
        'Eso significa que puedes practicar casi sin pausas: la carga se repone el doble de rápido todo el día.',
        'Buena excusa para avanzar más de lo habitual y repasar todo eso que tenías pendiente.',
      ],
      'pt-BR': [
        'A carga é a sua energia para praticar. Normalmente, quando acaba, é preciso esperar ela voltar. Hoje você espera a metade.',
        'Isso significa que dá pra praticar quase sem pausas: a carga volta o dobro mais rápido o dia todo.',
        'Ótima desculpa para avançar mais do que o normal e revisar tudo que estava em falta.',
      ],
      vi: [
        'Năng lượng là sức để bạn luyện tập. Bình thường khi hết, bạn phải chờ nó hồi lại. Hôm nay chỉ chờ một nửa thời gian.',
        'Nghĩa là bạn có thể luyện gần như không nghỉ: năng lượng hồi nhanh gấp đôi suốt cả ngày.',
        'Lý do tuyệt vời để học nhiều hơn mọi khi và ôn lại những gì còn dang dở.',
      ],
      id: [
        'Daya adalah energimu untuk berlatih. Biasanya kalau habis, kamu harus menunggu sampai pulih. Hari ini menunggunya separuh saja.',
        'Artinya kamu bisa berlatih nyaris tanpa jeda: daya terisi dua kali lebih cepat sepanjang hari.',
        'Alasan bagus untuk maju lebih jauh dari biasanya dan mengulang semua yang sempat tertunda.',
      ],
      tr: [
        'Şarj, çalışmak için enerjin. Normalde bitince dolmasını beklemen gerekir. Bugün yarı yarıya bekleyeceksin.',
        'Yani neredeyse hiç ara vermeden çalışabilirsin: şarj gün boyu iki kat hızlı dolar.',
        'Her zamankinden fazla ilerlemek ve elinin değmediği yerleri toparlamak için harika bir fırsat.',
      ],
      pl: [
        'Ładunek to twoja energia do ćwiczeń. Zwykle, gdy się skończy, trzeba czekać, aż wróci. Dziś czekasz o połowę krócej.',
        'To znaczy, że możesz ćwiczyć niemal bez przerw: ładunek wraca dwa razy szybciej przez cały dzień.',
        'Świetny pretekst, żeby zrobić więcej niż zwykle i nadrobić to, na co dawno nie było czasu.',
      ],
    },
  },
  energy_free_window: {
    emoji: '🔋',
    title: {
      ru: 'Вечер без лимитов',
      uk: 'Вечір без лімітів',
      es: 'Noche sin límites',
      'pt-BR': 'Noite sem limites',
      vi: 'Tối không giới hạn',
      id: 'Malam tanpa batas',
      tr: 'Sınırsız akşam',
      pl: 'Wieczór bez limitów',
    },
    subtitle: {
      ru: 'С 19:00 до 22:00 заряд не тратится.',
      uk: 'З 19:00 до 22:00 заряд не витрачається.',
      es: 'De 19:00 a 22:00 no gastas carga. Aprovecha.',
      'pt-BR': 'Das 19h às 22h a carga não acaba. Aproveite.',
      vi: 'Từ 19:00 đến 22:00 không tốn năng lượng. Tận hưởng.',
      id: 'Pukul 19.00–22.00 daya tak terpakai.',
      tr: '19:00–22:00 arası şarj harcanmaz.',
      pl: 'Od 19:00 do 22:00 ładunek się nie zużywa. Korzystaj.',
    },
    detail: {
      ru: [
        'Сегодня вечером, с 19:00 до 22:00 по твоему времени, заниматься можно сколько угодно — заряд при этом не уходит совсем.',
        'В это окно ты можешь проходить занятие за занятием подряд, не оглядываясь на энергию. Идеально, чтобы устроить большой вечерний марафон.',
        'Заходи в эти три часа и бери от вечера максимум — это полностью бесплатно.',
      ],
      uk: [
        'Сьогодні ввечері, з 19:00 до 22:00 за твоїм часом, займатися можна скільки завгодно — заряд при цьому не витрачається зовсім.',
        'У це вікно ти можеш проходити заняття за заняттям поспіль, не озираючись на енергію. Ідеально, щоб влаштувати великий вечірній марафон.',
        'Заходь у ці три години й бери від вечора максимум — це повністю безкоштовно.',
      ],
      es: [
        'Esta noche, de 19:00 a 22:00 en tu hora, puedes practicar todo lo que quieras: la carga no baja para nada.',
        'En esa franja puedes encadenar práctica tras práctica sin mirar la energía. Perfecto para un gran maratón de noche.',
        'Entra en esas tres horas y aprovecha la noche al máximo: es totalmente gratis.',
      ],
      'pt-BR': [
        'Hoje à noite, das 19h às 22h no seu horário, dá pra praticar o quanto quiser: a carga nem mexe.',
        'Nessa janela você emenda uma prática na outra sem olhar a energia. Perfeito pra fazer um maratona à noite.',
        'Entre nessas três horas e aproveite a noite ao máximo: é totalmente de graça.',
      ],
      vi: [
        'Tối nay, từ 19:00 đến 22:00 theo giờ của bạn, luyện bao nhiêu cũng được — năng lượng hoàn toàn không hao.',
        'Trong khung giờ này bạn có thể học liên tục mà chẳng cần để ý năng lượng. Quá hợp để làm một buổi marathon buổi tối.',
        'Vào trong ba tiếng này và tận dụng tối đa buổi tối — hoàn toàn miễn phí.',
      ],
      id: [
        'Malam ini, pukul 19.00–22.00 waktu kamu, kamu bisa berlatih sepuasnya — daya sama sekali tak berkurang.',
        'Di jendela ini kamu bisa lanjut latihan demi latihan tanpa memikirkan energi. Pas banget untuk maraton malam.',
        'Masuk di tiga jam ini dan manfaatkan malammu sepenuhnya — sepenuhnya gratis.',
      ],
      tr: [
        'Bu akşam, kendi saatinle 19:00–22:00 arası istediğin kadar çalışabilirsin — şarj hiç azalmaz.',
        'Bu aralıkta enerjiye bakmadan arka arkaya çalışabilirsin. Büyük bir akşam maratonu için ideal.',
        'Bu üç saatte gir ve akşamdan en iyi şekilde yararlan — tamamen ücretsiz.',
      ],
      pl: [
        'Dziś wieczorem, od 19:00 do 22:00 twojego czasu, możesz ćwiczyć do woli — ładunek w ogóle się nie zużywa.',
        'W tym oknie robisz ćwiczenie za ćwiczeniem bez oglądania się na energię. Idealnie na duży wieczorny maraton.',
        'Wejdź w te trzy godziny i wyciśnij z wieczoru maksimum — całkowicie za darmo.',
      ],
    },
  },
  double_xp: {
    emoji: '✖️2',
    title: {
      ru: 'Двойной опыт',
      uk: 'Подвійний досвід',
      es: 'Experiencia doble',
      'pt-BR': 'Experiência dobrada',
      vi: 'Kinh nghiệm nhân đôi',
      id: 'XP ganda',
      tr: 'Çift tecrübe',
      pl: 'Podwójne XP',
    },
    subtitle: {
      ru: 'Весь опыт сегодня ×2. Лучший день рвануть в лиге.',
      uk: 'Весь досвід сьогодні ×2. Найкращий день рвонути в лізі.',
      es: 'Hoy toda la XP es ×2. El día para subir en tu liga.',
      'pt-BR': 'Hoje toda XP é ×2. O dia pra subir na liga.',
      vi: 'Hôm nay XP ×2. Ngày tuyệt để leo hạng.',
      id: 'Hari ini semua XP ×2. Hari terbaik naik liga.',
      tr: 'Bugün tüm XP ×2. Ligde yükselme günü.',
      pl: 'Dziś całe XP ×2. Dzień, by skoczyć w lidze.',
    },
    detail: {
      ru: [
        'Опыт — это очки, по которым ты растёшь в уровне и поднимаешься в лиге. Сегодня за каждое занятие ты получаешь их в два раза больше.',
        'Считать ничего не надо — мы сами удваиваем всё, что ты заработаешь за день. Чем больше пройдёшь, тем заметнее рывок.',
        'Это лучший день, чтобы обогнать соперников в лиге и быстро прибавить уровень.',
      ],
      uk: [
        'Досвід — це очки, за якими ти ростеш у рівні й піднімаєшся в лізі. Сьогодні за кожне заняття ти отримуєш їх удвічі більше.',
        'Рахувати нічого не треба — ми самі подвоюємо все, що ти заробиш за день. Чим більше пройдеш, тим помітніший ривок.',
        'Це найкращий день, щоб обігнати суперників у лізі й швидко додати рівень.',
      ],
      es: [
        'La XP son los puntos con los que subes de nivel y avanzas en tu liga. Hoy ganas el doble por cada práctica.',
        'No tienes que calcular nada: duplicamos todo lo que ganes en el día. Cuanto más practiques, mayor el salto.',
        'Es el mejor día para adelantar a tus rivales en la liga y subir de nivel rápido.',
      ],
      'pt-BR': [
        'A XP são os pontos com que você sobe de nível e avança na liga. Hoje você ganha o dobro a cada prática.',
        'Não precisa calcular nada: a gente dobra tudo o que você ganhar no dia. Quanto mais praticar, maior o salto.',
        'É o melhor dia para passar os rivais na liga e subir de nível rápido.',
      ],
      vi: [
        'Kinh nghiệm là điểm giúp bạn lên cấp và leo hạng trong giải. Hôm nay mỗi buổi luyện cho gấp đôi điểm.',
        'Không cần tính toán gì — chúng tôi tự nhân đôi mọi điểm bạn kiếm trong ngày. Càng học nhiều, bước nhảy càng lớn.',
        'Đây là ngày tuyệt nhất để vượt đối thủ trong giải và lên cấp thật nhanh.',
      ],
      id: [
        'XP adalah poin yang membuatmu naik level dan naik liga. Hari ini setiap latihan memberi dua kali lipat.',
        'Tak perlu menghitung — kami yang menggandakan semua yang kamu dapat hari ini. Makin banyak berlatih, makin besar lonjakannya.',
        'Ini hari terbaik untuk menyalip lawan di liga dan naik level dengan cepat.',
      ],
      tr: [
        'Tecrübe, seviye atladığın ve ligde yükseldiğin puanlar. Bugün her çalışmada iki katını kazanıyorsun.',
        'Hesap yapmana gerek yok — gün boyu kazandığın her şeyi biz ikiye katlıyoruz. Ne kadar çok çalışırsan sıçrama o kadar büyük.',
        'Ligde rakipleri geçmek ve hızlıca seviye atlamak için en iyi gün.',
      ],
      pl: [
        'Doświadczenie to punkty, dzięki którym rośniesz w poziomie i pniesz się w lidze. Dziś za każde ćwiczenie dostajesz ich dwa razy więcej.',
        'Nic nie musisz liczyć — sami podwajamy wszystko, co zdobędziesz w ciągu dnia. Im więcej zrobisz, tym większy skok.',
        'To najlepszy dzień, żeby wyprzedzić rywali w lidze i szybko podbić poziom.',
      ],
    },
  },
  flashcard_friday: {
    emoji: '🃏',
    title: {
      ru: 'Колода в подарок',
      uk: 'Колода в подарунок',
      es: 'Mazo de regalo',
      'pt-BR': 'Baralho de presente',
      vi: 'Bộ thẻ tặng bạn',
      id: 'Dek hadiah',
      tr: 'Hediye deste',
      pl: 'Talia w prezencie',
    },
    subtitle: {
      ru: 'Набор фраз открыт на 48 часов. Забирай.',
      uk: 'Набір фраз відкрито на 48 годин. Забирай.',
      es: 'Un set de frases abierto 48 horas. Es tuyo.',
      'pt-BR': 'Um conjunto de frases aberto por 48 horas. Pegue.',
      vi: 'Bộ cụm từ mở trong 48 giờ. Nhận ngay.',
      id: 'Set frasa terbuka 48 jam. Ambil.',
      tr: '48 saatliğine ifade seti açık. Kap.',
      pl: 'Zestaw fraz otwarty na 48 godzin. Bierz.',
    },
    detail: {
      ru: [
        'Тебе открыли целый набор карточек с фразами — бесплатно и сразу. Это готовая колода, по которой удобно учить и повторять.',
        'Доступ к ней действует 48 часов. За это время можешь пройти её сколько угодно раз и закрепить как следует.',
        'Открывать ничего не нужно — набор уже ждёт тебя в карточках. Загляни и начни, пока время идёт.',
      ],
      uk: [
        'Тобі відкрили цілий набір карток із фразами — безкоштовно й одразу. Це готова колода, якою зручно вчити й повторювати.',
        'Доступ до неї діє 48 годин. За цей час можеш пройти її скільки завгодно разів і закріпити як слід.',
        'Відкривати нічого не треба — набір уже чекає на тебе в картках. Зазирни й починай, поки час іде.',
      ],
      es: [
        'Te abrimos un set entero de tarjetas con frases, gratis y al momento. Es un mazo listo para aprender y repasar cómodo.',
        'El acceso dura 48 horas. En ese tiempo puedes repetirlo las veces que quieras y fijarlo bien.',
        'No tienes que abrir nada: el set ya te espera en las tarjetas. Entra y empieza mientras corre el tiempo.',
      ],
      'pt-BR': [
        'Liberamos um conjunto inteiro de cartões com frases, grátis e na hora. É um baralho pronto pra aprender e revisar com facilidade.',
        'O acesso dura 48 horas. Nesse tempo dá pra repetir quantas vezes quiser e fixar de verdade.',
        'Não precisa abrir nada: o conjunto já te espera nos cartões. Entre e comece enquanto o tempo corre.',
      ],
      vi: [
        'Bạn được mở hẳn một bộ thẻ cụm từ — miễn phí và ngay lập tức. Đây là bộ thẻ sẵn sàng để học và ôn cho tiện.',
        'Quyền dùng kéo dài 48 giờ. Trong thời gian đó bạn có thể học lại bao nhiêu lần tùy thích và ghi nhớ thật chắc.',
        'Không cần mở gì cả — bộ thẻ đã chờ bạn trong mục thẻ. Vào và bắt đầu khi thời gian còn chạy.',
      ],
      id: [
        'Kami buka satu set penuh kartu frasa — gratis dan langsung. Ini dek siap pakai untuk belajar dan mengulang dengan nyaman.',
        'Aksesnya berlaku 48 jam. Selama itu kamu bisa mengulanginya sesukamu dan benar-benar menguatkannya.',
        'Tak perlu membuka apa pun — setnya sudah menunggumu di kartu. Masuk dan mulai selagi waktu berjalan.',
      ],
      tr: [
        'Sana ifadelerle dolu bir kart setini açtık — ücretsiz ve hemen. Öğrenmesi ve tekrar etmesi kolay, hazır bir deste.',
        'Erişim 48 saat sürüyor. Bu sürede istediğin kadar tekrar edip iyice pekiştirebilirsin.',
        'Bir şey açmana gerek yok — set seni kartlarda bekliyor. Süre işlerken gir ve başla.',
      ],
      pl: [
        'Otworzyliśmy ci cały zestaw fiszek z frazami — za darmo i od razu. To gotowa talia, którą wygodnie się uczyć i powtarzać.',
        'Dostęp działa 48 godzin. W tym czasie możesz przerobić ją dowolnie wiele razy i porządnie utrwalić.',
        'Nic nie musisz otwierać — zestaw już czeka na ciebie w fiszkach. Zajrzyj i zacznij, póki czas leci.',
      ],
    },
  },
  speaking_saturday: {
    emoji: '🗣',
    title: {
      ru: 'День голоса',
      uk: 'День голосу',
      es: 'Día de la voz',
      'pt-BR': 'Dia da voz',
      vi: 'Ngày luyện nói',
      id: 'Hari bicara',
      tr: 'Konuşma günü',
      pl: 'Dzień głosu',
    },
    subtitle: {
      ru: 'Произношение открыто для всех. Пора заговорить.',
      uk: 'Вимова відкрита для всіх. Час заговорити.',
      es: 'La pronunciación está abierta para todos. A hablar.',
      'pt-BR': 'A pronúncia está aberta para todos. Hora de falar.',
      vi: 'Phần luyện nói mở cho mọi người. Cất tiếng nào.',
      id: 'Mode bicara terbuka untuk semua. Saatnya ngomong.',
      tr: 'Telaffuz herkese açık. Konuşma zamanı.',
      pl: 'Wymowa otwarta dla wszystkich. Czas mówić.',
    },
    detail: {
      ru: [
        'Сегодня тебе открыт режим, где можно тренировать произношение вслух: говоришь фразу — и приложение слушает и подсказывает.',
        'Это лучший способ перестать стесняться и привыкнуть произносить вслух. Сегодня он доступен полностью, без ограничений.',
        'Найди занятия с микрофоном и проговори несколько фраз — почувствуешь, как речь становится увереннее.',
      ],
      uk: [
        'Сьогодні тобі відкрито режим, де можна тренувати вимову вголос: кажеш фразу — і застосунок слухає та підказує.',
        'Це найкращий спосіб перестати соромитися й звикнути говорити вголос. Сьогодні він доступний повністю, без обмежень.',
        'Знайди заняття з мікрофоном і промов кілька фраз — відчуєш, як мовлення стає впевненішим.',
      ],
      es: [
        'Hoy tienes abierto el modo para practicar la pronunciación en voz alta: dices una frase y la app te escucha y te corrige.',
        'Es la mejor forma de perder la vergüenza y acostumbrarte a hablar en voz alta. Hoy está disponible por completo, sin límites.',
        'Busca las prácticas con micrófono y di unas cuantas frases: notarás cómo tu habla gana seguridad.',
      ],
      'pt-BR': [
        'Hoje você tem aberto o modo de treinar a pronúncia em voz alta: você fala uma frase e o app escuta e dá dicas.',
        'É o melhor jeito de perder a vergonha e se acostumar a falar em voz alta. Hoje está liberado por completo, sem limites.',
        'Procure as práticas com microfone e diga algumas frases: você vai sentir a fala ficar mais confiante.',
      ],
      vi: [
        'Hôm nay bạn được mở chế độ luyện phát âm thành tiếng: bạn nói một câu, ứng dụng nghe và gợi ý cho bạn.',
        'Đây là cách tốt nhất để hết ngại và quen nói thành tiếng. Hôm nay nó mở hoàn toàn, không giới hạn.',
        'Tìm các bài có micro và nói vài câu — bạn sẽ thấy giọng nói tự tin hơn.',
      ],
      id: [
        'Hari ini terbuka mode latihan pengucapan dengan suara: kamu ucapkan sebuah frasa, aplikasi mendengarkan dan memberi masukan.',
        'Ini cara terbaik untuk berhenti malu dan terbiasa bicara lantang. Hari ini terbuka sepenuhnya, tanpa batas.',
        'Cari latihan dengan mikrofon dan ucapkan beberapa frasa — kamu akan merasa bicaramu makin percaya diri.',
      ],
      tr: [
        'Bugün telaffuzu sesli çalışabileceğin mod açık: bir ifade söylüyorsun, uygulama dinleyip ipucu veriyor.',
        'Bu, çekingenliği bırakıp sesli konuşmaya alışmanın en iyi yolu. Bugün sınırsız, tam olarak açık.',
        'Mikrofonlu çalışmaları bul ve birkaç ifade söyle — konuşmanın daha kendinden emin olduğunu hissedeceksin.',
      ],
      pl: [
        'Dziś masz otwarty tryb, w którym ćwiczysz wymowę na głos: mówisz frazę, a aplikacja słucha i podpowiada.',
        'To najlepszy sposób, by przestać się krępować i przyzwyczaić do mówienia na głos. Dziś jest dostępny w pełni, bez ograniczeń.',
        'Znajdź ćwiczenia z mikrofonem i powiedz kilka fraz — poczujesz, jak twoja mowa staje się pewniejsza.',
      ],
    },
  },
};

/** Локализованный текст бонуса для текущего языка интерфейса. */
export function getBoonCopy(id: BoonId, lang: Lang): BoonCopy {
  const src = BOON_COPY[id];
  // triLang всегда падает на src.*.ru (обязательная строка), но из-за опциональных
  // ключей TS виден тип string|undefined — страхуемся явным fallback на ru.
  return {
    emoji: src.emoji,
    title: triLang(lang, src.title) ?? src.title.ru,
    subtitle: triLang(lang, src.subtitle) ?? src.subtitle.ru,
    detail: triLang(lang, src.detail) ?? src.detail.ru,
  };
}

// «Сундук недели» (mystery_monday) — разовая недельная награда: после получения
// нельзя зазывать «открой и забери своё» (создаёт ощущение второго сундука).
// Эти copy показываются плашкой/модалкой ТОЛЬКО когда сундук уже забран на неделе.

const MYSTERY_CLAIMED_SUBTITLE: TriText = {
  ru: 'Награда уже забрана. Новый сундук — на следующей неделе.',
  uk: 'Нагороду вже забрано. Нова скриня — наступного тижня.',
  es: 'Recompensa ya recogida. El próximo cofre, la semana que viene.',
  'pt-BR': 'Recompensa já coletada. O próximo baú vem na semana que vem.',
  vi: 'Đã nhận phần thưởng. Rương mới sẽ có vào tuần sau.',
  id: 'Hadiah sudah diambil. Peti berikutnya minggu depan.',
  tr: 'Ödül zaten alındı. Yeni sandık gelecek hafta.',
  pl: 'Nagroda już odebrana. Nowa skrzynia w przyszłym tygodniu.',
};

const MYSTERY_CLAIMED_DETAIL: TriParagraphs = {
  ru: [
    'Сундук этой недели ты уже открыл — награда зачислена тебе на счёт.',
    'Новый сундук появится на следующей неделе. Ничего делать не нужно — он сам предложит себя открыть.',
  ],
  uk: [
    'Скриню цього тижня ти вже відкрив — нагороду зараховано на твій рахунок.',
    'Нова скриня з’явиться наступного тижня. Нічого робити не треба — вона сама запропонує відкрити її.',
  ],
  es: [
    'El cofre de esta semana ya lo abriste: la recompensa ya está en tu cuenta.',
    'El próximo cofre aparecerá la semana que viene. No tienes que hacer nada: se ofrecerá solo para abrirse.',
  ],
  'pt-BR': [
    'O baú desta semana você já abriu — a recompensa já está na sua conta.',
    'O próximo baú aparece na semana que vem. Não precisa fazer nada — ele vai se oferecer para abrir.',
  ],
  vi: [
    'Rương tuần này bạn đã mở — phần thưởng đã được cộng vào tài khoản.',
    'Rương mới sẽ xuất hiện vào tuần sau. Bạn không cần làm gì — nó sẽ tự mời bạn mở.',
  ],
  id: [
    'Peti minggu ini sudah kamu buka — hadiahnya sudah masuk ke akunmu.',
    'Peti baru muncul minggu depan. Kamu tidak perlu melakukan apa pun — peti akan menawarkan dirinya untuk dibuka.',
  ],
  tr: [
    'Bu haftanın sandığını zaten açtın — ödül hesabına eklendi.',
    'Yeni sandık gelecek hafta gelir. Bir şey yapmana gerek yok — kendisi açılmayı önerecek.',
  ],
  pl: [
    'Skrzynię z tego tygodnia już otworzyłeś — nagroda trafiła na twoje konto.',
    'Nowa skrzynia pojawi się w przyszłym tygodniu. Nic nie musisz robić — sama zaproponuje otwarcie.',
  ],
};

/** Подзаголовок плашки «Сундук недели» ПОСЛЕ того, как награда забрана на этой неделе. */
export function getMysteryChestClaimedSubtitle(lang: Lang): string {
  return triLang(lang, MYSTERY_CLAIMED_SUBTITLE) ?? MYSTERY_CLAIMED_SUBTITLE.ru;
}

/** Абзацы детальной модалки «Сундук недели» ПОСЛЕ получения награды на этой неделе. */
export function getMysteryChestClaimedDetail(lang: Lang): readonly string[] {
  return triLang(lang, MYSTERY_CLAIMED_DETAIL) ?? MYSTERY_CLAIMED_DETAIL.ru;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
