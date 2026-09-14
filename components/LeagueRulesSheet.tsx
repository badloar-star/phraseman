/**
 * LeagueRulesSheet — шторка «Как устроена лига».
 *
 * зачем (владелец, 2026-08-24): «когда юзер заходит в лигу, надо модал-лист
 * снизу, который расскажет что такое лига, как тут повышаться и понижаться и
 * всё остальное; текст продуман и взвешен, с юморком, красивый стиль; кнопка
 * вопрос кругленькая в правом верхнем углу его вызывает».
 *
 * Показ: автоматически ОДИН раз (feature_intro_registry — ключ живёт по
 * аккаунту и переживает перезапуск) и в любой момент по кнопке «?».
 *
 * Стиль строго по дому: RN Modal + reanimated drag-to-dismiss по паттерну
 * ExplainSheet (тяга вниз 1:1, вверх резина ×0.12, закрытие 88px/velocity 900),
 * тон вместо обводки, никаких подписей-расшифровок мелким шрифтом.
 * Движение: кривая 0.32/0.72/0/1 (та же, что у остальных листов дома).
 *
 * Валюта лиги зовётся «рунами» — так решил владелец 2026-08-24, и так же
 * теперь подписана строка таблицы (LeagueLeaderboardRow показывает ассет руны
 * вместо букв «XP»). Прежняя редакция этой шапки ссылалась на константу
 * RUNES_LEAGUE_START_WEEK_ID и «неделю перехода» — в коде такой константы нет
 * и не было, переход не поэтапный. Слова «очки» в текстах лиги быть не должно.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from './ThemeContext';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import TonalSurface from './TonalSurface';

const SHEET_HIDDEN = 340;

type RuleSection = Readonly<{
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: (lang: Lang) => string;
  body: (lang: Lang) => string;
}>;

/**
 * Разделы объяснялки.
 *
 * зачем (владелец, 2026-08-24, четвёртая редакция): «так же ничего не понятно,
 * напиши доступно всё». Предыдущая редакция буквально исполнила просьбу «фразы
 * по 3-4 слова» и превратилась в телеграф: «Верх — выше. Ноль — вниз.» — набор
 * слов, из которого человек не понимает НИЧЕГО. Краткость победила смысл, и это
 * была ошибка.
 *
 * Правило этой редакции: доступно и ПОЛНО. Каждый раздел объясняет свою вещь до
 * конца обычными словами — что происходит, когда, и что с этим делать. Экономии
 * на словах нет: лучше два простых предложения, чем одно загадочное.
 *
 * зачем (владелец, 2026-09-14, пятая редакция): «перепиши нормально, в
 * дружелюбном стиле». Прежняя редакция была верной, но читалась как инструкция
 * к бытовой технике. Первая попытка живого тона ушла в другую крайность и была
 * отклонена владельцем как ГРУБАЯ: «ты едешь вниз», «комната бездельничала»,
 * «отговорка не работает» — это укор читателю, а не юмор.
 *
 * Правило тона: тепло и на «ты», подшучиваем над СИТУАЦИЕЙ, никогда над
 * человеком. Ни одной формулировки, где читатель ленивый, отстающий или
 * виноватый; понижение описываем спокойно («лига меняется на предыдущую»), а
 * рядом сразу даём выход («хватит одного занятия»). Сравнения вроде «тридцать
 * таких же» запрещены — звучит уничижительно.
 *
 * Снято по прямому решению владельца: две фразы о том, что подарочные и
 * видео-руны не двигают таблицу. Сторож требовал их дословно — он правится
 * вместе с текстом, иначе охранял бы отменённое правило.
 *
 * Точность механики не пострадала: 12 лиг, ~30 человек, зоны перехода, ноль рун
 * за неделю = понижение, воскресное удвоение, общая цель комнаты.
 *
 * Чего в текстах не должно быть (на этом провалились прошлые версии):
 *  • внутренних соревновательных терминов, которых человек нигде не видел;
 *  • процентов от неизвестного числа — «верхние 15%» (человек не знает, сколько
 *    людей в комнате, и посчитать не может). Вместо этого — «несколько человек
 *    с самым большим счётом», это правда и это понятно;
 *  • недосказанности: если названа руна — тут же сказано, откуда она берётся.
 *
 * Сверено с кодом, не выдумано: комната ~30 человек (limit в firestore_leagues),
 * 12 лиг от Медной до Высшей (CLUBS), зоны повышения и понижения — 15% списка
 * (LEAGUE_RESULT_ZONE_RATIO), Супервоскресенье удваивает руны за занятия, игры и
 * видео весь UTC-день независимо от ранга; видео-руны не двигают таблицу,
 * «неделя без единой
 * руны — понижение» (ветки iScored / inZeroZone в league_engine), бонус лиги
 * множит именно опыт, а не руны (xp_manager), и каждая лига выше стартовой даёт
 * +10 к постоянному запасу энергии (LEAGUE_ENERGY_PER_LEVEL в energy_contract:
 * 100 в Медной, 210 в Высшей — отсюда «больше вдвое» в разделе про бонусы).
 */
const SECTIONS: readonly RuleSection[] = [
  {
    id: 'what',
    icon: 'people-outline',
    title: (lang) => triLang(lang, {
      ru: 'Что такое лига',
      uk: 'Що таке ліга',
      en: 'What is a league',
      es: 'Qué es la liga',
      'pt-BR': 'O que é a liga',
      vi: 'Giải đấu là gì',
      id: 'Apa itu liga',
      tr: 'Lig nedir',
      pl: 'Czym jest liga',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Каждый понедельник собирается новая компания примерно на тридцать человек, и все начинают с нуля — у всех чистый лист. Дальше всё просто: занимайся, играй, собирай руны. Они и есть твой счёт на эту неделю.',
      uk: 'Щопонеділка збирається нова компанія приблизно на тридцять людей, і всі починають з нуля — у всіх чистий аркуш. Далі все просто: займайся, грай, збирай руни. Вони і є твій рахунок на цей тиждень.',
      en: 'Every Monday a new group of about thirty people comes together, and everyone starts from zero — a clean slate for all. After that it is simple: practise, play, collect runes. They are your score for the week.',
      es: 'Cada lunes se forma un grupo nuevo de unas treinta personas y todos empiezan desde cero: borrón y cuenta nueva para todos. Después es sencillo: practica, juega, reúne runas. Ellas son tu puntuación de la semana.',
      'pt-BR': 'Toda segunda se forma um grupo novo de cerca de trinta pessoas e todos começam do zero: página em branco para todo mundo. Depois é simples: pratique, jogue, junte runas. Elas são a sua pontuação da semana.',
      vi: 'Mỗi thứ Hai lại có một nhóm mới khoảng ba mươi người, và tất cả đều bắt đầu từ 0 — ai cũng có một trang giấy trắng. Sau đó thì đơn giản: học, chơi, gom rune. Chúng chính là điểm của bạn trong tuần.',
      id: 'Setiap Senin terbentuk kelompok baru berisi sekitar tiga puluh orang, dan semua mulai dari nol — semua dapat lembaran baru. Setelah itu gampang: belajar, main, kumpulkan rune. Itulah nilaimu pekan ini.',
      tr: 'Her pazartesi otuz kişilik yeni bir grup oluşur ve herkes sıfırdan başlar — herkes için tertemiz bir sayfa. Sonrası basit: çalış, oyna, rün topla. Haftalık puanın onlar.',
      pl: 'W każdy poniedziałek tworzy się nowa grupa około trzydziestu osób i wszyscy zaczynają od zera — każdy ma czystą kartę. Dalej jest prosto: ćwicz, graj, zbieraj runy. To twój wynik na ten tydzień.',
    }),
  },
  {
    id: 'promotion',
    icon: 'trending-up',
    title: (lang) => triLang(lang, {
      ru: 'Как перейти в лигу выше',
      uk: 'Як перейти в лігу вище',
      en: 'How to move up a league',
      es: 'Cómo subir de liga',
      'pt-BR': 'Como subir de liga',
      vi: 'Cách lên hạng',
      tr: 'Üst lige nasıl çıkılır',
      id: 'Cara naik ke liga berikutnya',
      pl: 'Jak awansować do wyższej ligi',
    }),
    body: (lang) => triLang(lang, {
      ru: 'В ночь на понедельник неделя закрывается и таблица замирает. Те, у кого счёт самый большой, переходят в лигу выше. Те, у кого он самый маленький, возвращаются в предыдущую. Остальные остаются здесь же и начинают новую неделю. Лиг двенадцать, от Медной до Высшей: путь наверх неблизкий, зато новая попытка появляется каждую неделю.',
      uk: 'У ніч на понеділок тиждень закривається і таблиця завмирає. Ті, у кого рахунок найбільший, переходять у лігу вище. Ті, у кого він найменший, повертаються в попередню. Решта лишаються тут же і починають новий тиждень. Ліг дванадцять, від Мідної до Вищої: шлях нагору неблизький, зате нова спроба з’являється щотижня.',
      en: 'On Monday night the week closes and the table freezes. Those with the highest score move up a league. Those with the lowest go back to the previous one. Everyone else stays here and starts a new week. There are twelve leagues, from Copper to Supreme: the way up is long, but a fresh attempt arrives every week.',
      es: 'La noche del domingo al lunes la semana se cierra y la tabla queda fija. Quienes tienen la puntuación más alta pasan a la liga siguiente. Quienes tienen la más baja vuelven a la anterior. El resto se queda aquí y empieza una semana nueva. Hay doce ligas, de Cobre a Suprema: el camino es largo, pero cada semana hay un intento nuevo.',
      'pt-BR': 'Na virada para segunda a semana fecha e a tabela congela. Quem tem a maior pontuação passa para a liga seguinte. Quem tem a menor volta para a anterior. Os demais ficam aqui e começam uma semana nova. São doze ligas, do Cobre à Suprema: o caminho é longo, mas toda semana surge uma nova tentativa.',
      vi: 'Rạng sáng thứ Hai, tuần khép lại và bảng xếp hạng dừng. Ai có điểm cao nhất sẽ lên hạng. Ai có điểm thấp nhất quay lại hạng trước đó. Những người còn lại ở đây và bắt đầu tuần mới. Có mười hai hạng, từ Đồng đến Cao nhất: đường lên khá dài, nhưng mỗi tuần lại có một cơ hội mới.',
      id: 'Menjelang Senin pekan ditutup dan tabel berhenti. Yang nilainya tertinggi naik ke liga berikutnya. Yang nilainya terendah kembali ke liga sebelumnya. Sisanya tetap di sini dan memulai pekan baru. Ada dua belas liga, dari Tembaga sampai Tertinggi: jalannya panjang, tapi kesempatan baru datang tiap pekan.',
      tr: 'Pazartesiye geçen gece hafta kapanır ve tablo durur. Puanı en yüksek olanlar bir üst lige geçer. Puanı en düşük olanlar bir önceki lige döner. Diğerleri burada kalır ve yeni haftaya başlar. On iki lig var, Bakırdan En Üst Lige: yol uzun ama her hafta yeni bir şans geliyor.',
      pl: 'W nocy z niedzieli na poniedziałek tydzień się zamyka, a tabela zastyga. Osoby z najwyższym wynikiem przechodzą do wyższej ligi. Osoby z najniższym wracają do poprzedniej. Reszta zostaje tutaj i zaczyna nowy tydzień. Lig jest dwanaście, od Miedzianej po Najwyższą: droga w górę jest długa, ale nowa próba pojawia się co tydzień.',
    }),
  },
  {
    id: 'zero',
    icon: 'alert-circle-outline',
    title: (lang) => triLang(lang, {
      ru: 'Почему нельзя пропускать неделю',
      uk: 'Чому не можна пропускати тиждень',
      en: "Why you shouldn't skip a week",
      es: 'Por qué no conviene saltarse la semana',
      'pt-BR': 'Por que não vale pular a semana',
      vi: 'Vì sao không nên bỏ cả tuần',
      id: 'Kenapa jangan melewatkan sepekan',
      tr: 'Haftayı boş geçirmemek neden önemli',
      pl: 'Dlaczego nie warto opuszczać tygodnia',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Если за всю неделю не набралось ни одной руны, лига меняется на предыдущую — даже когда в компании было тихо и почти никто не занимался. Но защититься легко: хватит одного занятия за семь дней. Буквально одного — и неделя уже засчитана.',
      uk: 'Якщо за весь тиждень не набралося жодної руни, ліга змінюється на попередню — навіть коли в компанії було тихо і майже ніхто не займався. Але захиститися легко: вистачить одного заняття за сім днів. Буквально одного — і тиждень уже зараховано.',
      en: 'If the whole week goes by without a single rune, the league changes to the previous one — even when things were quiet and almost nobody practised. But it is easy to stay safe: one session in seven days is enough. Literally one, and the week counts.',
      es: 'Si pasa toda la semana sin una sola runa, la liga cambia a la anterior, incluso cuando el grupo estuvo tranquilo y casi nadie practicó. Pero protegerse es fácil: basta una práctica en siete días. Una sola, y la semana ya cuenta.',
      'pt-BR': 'Se a semana inteira passar sem nenhuma runa, a liga muda para a anterior — mesmo quando o grupo ficou quieto e quase ninguém praticou. Mas é fácil se proteger: basta uma prática em sete dias. Literalmente uma, e a semana já conta.',
      vi: 'Nếu cả tuần trôi qua mà không có rune nào, hạng sẽ đổi về hạng trước đó — kể cả khi cả nhóm đều yên ắng và gần như không ai học. Nhưng giữ an toàn rất dễ: chỉ cần một buổi học trong bảy ngày. Đúng một buổi, và tuần đó đã được tính.',
      id: 'Kalau sepanjang pekan tidak terkumpul satu rune pun, liganya berubah ke liga sebelumnya — bahkan ketika suasananya sepi dan hampir tidak ada yang belajar. Tapi menjaganya mudah: satu sesi dalam tujuh hari sudah cukup. Benar-benar satu, dan pekan itu terhitung.',
      tr: 'Hafta boyunca tek bir rün bile birikmezse lig bir öncekine döner — ortalık sakin geçmiş ve neredeyse kimse çalışmamış olsa bile. Ama korunmak kolay: yedi günde bir çalışma yeterli. Gerçekten bir tane, ve hafta sayılmış olur.',
      pl: 'Jeśli przez cały tydzień nie uzbiera się ani jedna runa, liga zmienia się na poprzednią — nawet gdy było cicho i prawie nikt nie ćwiczył. Ale łatwo się zabezpieczyć: wystarczy jedno ćwiczenie w siedem dni. Dosłownie jedno, i tydzień jest zaliczony.',
    }),
  },
  {
    id: 'boosts',
    icon: 'flame-outline',
    title: (lang) => triLang(lang, {
      ru: 'Супервоскресенье',
      uk: 'Супернеділя',
      en: 'Super Sunday',
      es: 'Súper Domingo',
      'pt-BR': 'Super Domingo',
      vi: 'Chủ Nhật Siêu Cấp',
      id: 'Minggu Super',
      tr: 'Süper Pazar',
      pl: 'Super Niedziela',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Воскресенье работает за двоих: руны за занятия, игры и просмотр видео удваиваются. Весь день, для всех, готовиться заранее не нужно. Отличный момент, чтобы спокойно подтянуть счёт перед закрытием недели.',
      uk: 'Неділя працює за двох: руни за заняття, ігри та перегляд відео подвоюються. Цілий день, для всіх, готуватися заздалегідь не потрібно. Чудова мить, щоб спокійно підтягнути рахунок перед закриттям тижня.',
      en: 'Sunday works double: runes from lessons, games and video watching are doubled. All day, for everyone, no preparation needed. A great moment to calmly pull your score up before the week closes.',
      es: 'El domingo rinde el doble: las runas de lecciones, juegos y vídeos se duplican. Todo el día, para todos, sin preparar nada. Un momento estupendo para subir tranquilamente tu puntuación antes de que cierre la semana.',
      'pt-BR': 'Domingo rende em dobro: as runas de lições, jogos e vídeos são duplicadas. O dia inteiro, para todos, sem precisar preparar nada. Um ótimo momento para subir a pontuação com calma antes de a semana fechar.',
      vi: 'Chủ nhật làm việc gấp đôi: rune từ bài học, trò chơi và xem video đều nhân đôi. Cả ngày, cho mọi người, không cần chuẩn bị trước. Thời điểm tuyệt vời để thong thả kéo điểm lên trước khi tuần khép lại.',
      id: 'Hari Minggu bekerja dua kali lipat: rune dari pelajaran, permainan, dan menonton video digandakan. Seharian, untuk semua, tanpa persiapan. Saat yang bagus untuk menaikkan nilai dengan tenang sebelum pekan ditutup.',
      tr: 'Pazar iki katı çalışır: ders, oyun ve video izleme rünleri ikiye katlanır. Gün boyu, herkes için, önceden hazırlık gerekmez. Hafta kapanmadan puanını sakince yukarı çekmek için harika bir an.',
      pl: 'Niedziela pracuje za dwoje: runy za lekcje, gry i oglądanie filmów są podwajane. Cały dzień, dla wszystkich, bez wcześniejszych przygotowań. Świetny moment, żeby spokojnie podciągnąć wynik przed zamknięciem tygodnia.',
    }),
  },
  {
    id: 'chest',
    icon: 'cube-outline',
    title: (lang) => triLang(lang, {
      ru: 'Общая цель комнаты',
      uk: 'Спільна мета кімнати',
      en: "The room's shared goal",
      es: 'La meta común de la sala',
      'pt-BR': 'A meta comum da sala',
      vi: 'Mục tiêu chung của phòng',
      id: 'Target bersama satu ruangan',
      tr: 'Odanın ortak hedefi',
      pl: 'Wspólny cel pokoju',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Кроме личного счёта у всей компании есть общая цель на неделю: руны каждого складываются в один счётчик. Когда цель достигнута, награду получают все — независимо от места в таблице. Приятный случай, когда вы не только соперники, но и одна команда.',
      uk: 'Крім особистого рахунку, у всієї компанії є спільна мета на тиждень: руни кожного складаються в один лічильник. Коли мети досягнуто, нагороду отримують усі — незалежно від місця в таблиці. Приємний випадок, коли ви не тільки суперники, а й одна команда.',
      en: 'Besides your own score, the whole group has a shared weekly goal: everyone’s runes add up in one counter. Once the goal is reached, everyone gets the reward — wherever they stand in the table. A nice case where you are not only rivals but also one team.',
      es: 'Además de tu marcador personal, todo el grupo tiene una meta común para la semana: las runas de cada uno se suman en un contador. Cuando se alcanza la meta, la recompensa es para todos, sin importar el puesto. Un caso agradable en el que no sois solo rivales, sino también un equipo.',
      'pt-BR': 'Além da sua pontuação, o grupo todo tem uma meta comum da semana: as runas de cada um se somam em um contador. Quando a meta é atingida, a recompensa é de todos — não importa a posição na tabela. Um caso agradável em que vocês não são só rivais, mas também um time.',
      vi: 'Ngoài điểm cá nhân, cả nhóm còn có một mục tiêu chung trong tuần: rune của mọi người cộng lại vào một bộ đếm. Khi đạt mục tiêu, tất cả đều nhận thưởng — bất kể đang đứng ở đâu trên bảng. Thật dễ chịu khi các bạn không chỉ là đối thủ mà còn là một đội.',
      id: 'Selain nilai pribadi, seluruh kelompok punya target bersama untuk sepekan: rune setiap orang dijumlahkan dalam satu penghitung. Begitu target tercapai, semua mendapat hadiah — di posisi mana pun berada. Momen menyenangkan ketika kalian bukan hanya rival, tapi juga satu tim.',
      tr: 'Kişisel puanının yanı sıra tüm grubun haftalık ortak bir hedefi var: herkesin rünleri tek bir sayaçta toplanır. Hedefe ulaşıldığında ödülü herkes alır — tablodaki sırası ne olursa olsun. Yalnızca rakip değil, aynı zamanda bir takım olduğunuz güzel bir durum.',
      pl: 'Poza własnym wynikiem cała grupa ma wspólny cel na tydzień: runy każdego sumują się w jednym liczniku. Gdy cel zostanie osiągnięty, nagrodę dostają wszyscy — niezależnie od miejsca w tabeli. Miły przypadek, gdy jesteście nie tylko rywalami, ale też jedną drużyną.',
    }),
  },
  {
    id: 'bonus',
    icon: 'ribbon-outline',
    title: (lang) => triLang(lang, {
      ru: 'Что даёт высокая лига',
      uk: 'Що дає висока ліга',
      en: 'What a high league gives you',
      es: 'Qué aporta una liga alta',
      'pt-BR': 'O que uma liga alta traz',
      vi: 'Hạng cao mang lại gì',
      id: 'Apa untungnya liga tinggi',
      tr: 'Yüksek lig ne kazandırır',
      pl: 'Co daje wysoka liga',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Высокая лига — не только красивый значок. Опыт начисляется быстрее: в первой прибавка скромная, в высшей — больше чем вдвое. А ещё каждая лига выше добавляет +10 к запасу энергии: наверху его вдвое больше, и ждать восстановления приходится заметно реже. Запас держится вместе с лигой: вернулся в предыдущую — вернутся и эти десять.',
      uk: 'Висока ліга — не тільки гарний значок. Досвід нараховується швидше: у першій надбавка скромна, у найвищій — більш ніж удвічі. А ще кожна ліга вище додає +10 до запасу енергії: нагорі його вдвічі більше, і чекати відновлення доводиться помітно рідше. Запас тримається разом із лігою: повернувся в попередню — повернуться й ці десять.',
      en: 'A high league is more than a nice badge. XP comes in faster: modest in the first league, more than double at the top. Every league up also adds +10 to your energy reserve: at the top it is twice as large, so you wait for it to refill far less often. The reserve travels with the league: go back to the previous one and those ten go back too.',
      es: 'Una liga alta no es solo una insignia bonita. La experiencia entra más rápido: modesta en la primera, más del doble en la más alta. Además, cada liga superior suma +10 a tu reserva de energía: arriba es el doble y esperas a que se recargue mucho menos. La reserva va con la liga: si vuelves a la anterior, esos diez vuelven también.',
      'pt-BR': 'Liga alta não é só um selo bonito. A experiência entra mais rápido: modesta na primeira, mais que o dobro no topo. E cada liga acima soma +10 à reserva de energia: lá em cima ela é o dobro e você espera a recarga bem menos. A reserva acompanha a liga: se voltar para a anterior, esses dez voltam junto.',
      vi: 'Hạng cao không chỉ là một huy hiệu đẹp. Kinh nghiệm vào nhanh hơn: hạng đầu khiêm tốn, hạng cao nhất hơn gấp đôi. Mỗi hạng cao hơn còn cộng +10 vào kho năng lượng: trên đỉnh kho gấp đôi, nên bạn ít phải chờ hồi hơn hẳn. Kho năng lượng đi cùng hạng: quay lại hạng trước thì mười điểm đó cũng quay lại.',
      id: 'Liga tinggi bukan sekadar lencana cantik. Pengalaman masuk lebih cepat: sederhana di liga pertama, lebih dari dua kali lipat di puncak. Setiap liga di atas juga menambah +10 cadangan energi: di puncak jadi dua kali lipat, jadi kamu jauh lebih jarang menunggu isi ulang. Cadangannya mengikuti liga: kembali ke liga sebelumnya, sepuluh itu ikut kembali.',
      tr: 'Yüksek lig sadece şık bir rozet değil. Deneyim daha hızlı birikir: ilk ligde mütevazı, en üstte iki katından fazla. Ayrıca her üst lig enerji deponu +10 artırır: tepede depo iki katı, yani dolmasını çok daha az beklersin. Depo ligle birlikte gider: bir önceki lige dönersen o on birim de geri döner.',
      pl: 'Wysoka liga to nie tylko ładna odznaka. Doświadczenie wpada szybciej: w pierwszej skromnie, na szczycie ponad dwa razy więcej. Każda wyższa liga dokłada też +10 do zapasu energii: na górze jest go dwa razy więcej i znacznie rzadziej czekasz na odnowienie. Zapas idzie razem z ligą: wrócisz do poprzedniej — wrócą też te dziesięć.',
    }),
  },
];

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  lang: Lang;
}>;

export default function LeagueRulesSheet({ visible, onClose, lang }: Props) {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: viewportHeight } = useWindowDimensions();

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const sheetOpacity = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    dragTranslateY.value = 0;
    backdropO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    sheetOpacity.value = withTiming(1, { duration: 220 });
    sheetY.value = withTiming(0, { duration: 380, easing: REasing.bezier(0.32, 0.72, 0, 1) });
  }, [visible, backdropO, sheetY, sheetOpacity, dragTranslateY]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const dismissSheet = useCallback(() => {
    void hapticTap();
    backdropO.value = withTiming(0, { duration: 200 });
    sheetOpacity.value = withTiming(0, { duration: 180 });
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 240, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(closeRef.current)();
    });
  }, [backdropO, sheetOpacity, sheetY]);

  const closeAfterSwipe = useCallback(() => {
    closeRef.current();
  }, []);

  const swipeOffDistance = useMemo(() => Math.max(480, viewportHeight * 0.6), [viewportHeight]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-32, 32])
        .onUpdate((e) => {
          'worklet';
          const ty = e.translationY;
          dragTranslateY.value = ty < 0 ? ty * 0.12 : ty;
        })
        .onEnd((e) => {
          'worklet';
          const shouldClose = dragTranslateY.value > 88 || e.velocityY > 900;
          if (shouldClose) {
            dragTranslateY.value = withTiming(swipeOffDistance, { duration: 260 }, (finished) => {
              if (finished) runOnJS(closeAfterSwipe)();
            });
          } else {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
          }
        }),
    [closeAfterSwipe, dragTranslateY, swipeOffDistance],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

  const closeLabel = triLang(lang, {
    ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
    vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });

  const title = triLang(lang, {
    ru: 'Как устроена лига',
    uk: 'Як влаштована ліга',
    en: 'How the league works',
    es: 'Cómo funciona la liga',
    'pt-BR': 'Como a liga funciona',
    vi: 'Giải đấu hoạt động thế nào',
    id: 'Cara kerja liga',
    tr: 'Lig nasıl işler',
    pl: 'Jak działa liga',
  });

  // зачем (аудит по Библии, 2026-08-26): «Понятно» — реакция, а не действие
  // (Правило 1: в кнопке глагол). Лист с правилами лиги закрывается — так и говорим.
  const ctaLabel = triLang(lang, {
    ru: 'Закрыть правила', uk: 'Закрити правила', en: 'Close rules', es: 'Cerrar reglas', 'pt-BR': 'Fechar regras',
    vi: 'Đóng luật chơi', id: 'Tutup aturan', tr: 'Kuralları kapat', pl: 'Zamknij zasady',
  });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} accessibilityLabel={closeLabel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: t.bgCard,
                shadowColor: t.accent,
                maxHeight: viewportHeight * 0.86,
                paddingBottom: 16 + bottomInset,
              },
              sheetStyle,
            ]}
          >
            <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />

            <View style={[styles.grab, { backgroundColor: t.border }]} />

            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.numMd }]}>
              {title}
            </Text>

            {/* зачем (владелец, 2026-08-24): полные тексты длиннее прежних
                телеграфных, и содержимое гарантированно не влезает в 86%
                высоты. Полосу прокрутки скрывать больше нельзя — без неё
                человек не догадается, что ниже есть ещё разделы, и решит,
                что объяснение обрывается.

                bounces СОЗНАТЕЛЬНО остаётся выключенным: pan-жест шторки
                (тяга вниз = закрыть) не связан со списком через
                simultaneousWithExternalGesture, и отдача сверху дала бы
                перехват — лист закрывался бы вместо прокрутки. */}
            <ScrollView decelerationRate="fast"
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
              bounces={false}
            >
              {/* guard-ok: 6 статичных секций, список не растёт от данных — FlatList здесь дороже самой отрисовки */}
              {SECTIONS.map((section) => (
                <View key={section.id} style={styles.row}>
                  <View style={[styles.medal, { backgroundColor: t.bgPrimary }]}>
                    <Ionicons name={section.icon} size={20} color={t.gold} />
                  </View>
                  <View style={styles.rowBody}>
                    {/* зачем: f.body и f.sub в шкале равны (14), поэтому иерархию
                        внутри секции держат вес и тон, а не кегль: заголовок —
                        bodyLg/900 основным цветом, текст — body/500 вторичным. */}
                    <Text style={[styles.rowTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                      {section.title(lang)}
                    </Text>
                    <Text
                      style={[
                        styles.rowText,
                        // guard-ok: тело раздела объяснялки, а не подпись-расшифровка под названием пункта
                        { color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.55 },
                      ]}
                    >
                      {section.body(lang)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
              onPress={dismissSheet}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: t.accent,
                  // Тактильный отклик нажатия — правило дома (кнопка обязана «слышать» палец).
                  transform: [{ scale: pressed ? 0.975 : 1 }],
                },
              ]}
            >
              {/* зачем: t.correctText — домовой токен текста НА акценте (см. AiConsentSheetModal);
                  хардкод белого проваливал бы контраст в светлых темах. */}
              <Text style={[styles.ctaText, { color: t.correctText, fontSize: f.body }]}>
                {ctaLabel}
              </Text>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,8,18,0.68)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowOpacity: 0.18,
    shadowRadius: 18, // мягкая тень листа; ниже — уже не читается край шторки на тёмной подложке
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  grab: { width: 34, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  title: { fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 6 },
  row: { flexDirection: 'row', gap: 13, marginBottom: 18 },
  medal: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontWeight: '800', marginBottom: 4 },
  rowText: { fontWeight: '500' },
  cta: {
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  ctaText: { fontWeight: '900' },
});
