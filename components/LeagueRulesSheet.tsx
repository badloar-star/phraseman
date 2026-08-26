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
 * Чего в текстах не должно быть (на этом провалились прошлые версии):
 *  • терминов, которых человек нигде не видел, — «зона вылета», «камбэк»;
 *  • процентов от неизвестного числа — «верхние 15%» (человек не знает, сколько
 *    людей в комнате, и посчитать не может). Вместо этого — «несколько человек
 *    с самым большим счётом», это правда и это понятно;
 *  • недосказанности: если названа руна — тут же сказано, откуда она берётся.
 *
 * Сверено с кодом, не выдумано: комната ~30 человек (limit в firestore_leagues),
 * 12 лиг от Медной до Высшей (CLUBS), зоны повышения и понижения — 15% списка
 * (LEAGUE_RESULT_ZONE_RATIO), последние два часа с удвоением для нижней зоны
 * (LEAGUE_HOT_HOURS_WINDOW_MS / LEAGUE_HOT_HOURS_MULTIPLIER), «неделя без единой
 * руны — понижение» (ветки iScored / inZeroZone в league_engine), бонус лиги
 * множит именно опыт, а не руны (xp_manager).
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
      ru: 'Это соревнование на неделю. Каждый понедельник вас собирают в комнату примерно на 30 человек, и все начинают с нуля. За каждое занятие в приложении вы получаете руны — они и есть ваш счёт в таблице. Чем больше занимаетесь, тем выше поднимаетесь.',
      uk: 'Це змагання на тиждень. Щопонеділка вас збирають у кімнату приблизно на 30 осіб, і всі починають з нуля. За кожне заняття в застосунку ви отримуєте руни — вони і є ваш рахунок у таблиці. Що більше займаєтесь, то вище піднімаєтесь.',
      en: "It's a weekly competition. Every Monday you're placed in a room of about 30 people, and everyone starts from zero. Every practice session in the app earns you runes — they're your score on the table. The more you practice, the higher you climb.",
      es: 'Es una competición semanal. Cada lunes te agrupan en una sala de unas 30 personas y todos empiezan desde cero. Por cada práctica en la app ganas runas: ellas son tu puntuación en la tabla. Cuanto más practicas, más subes.',
      'pt-BR': 'É uma competição de uma semana. Toda segunda você entra numa sala de cerca de 30 pessoas e todos começam do zero. A cada prática no app você ganha runas: elas são a sua pontuação na tabela. Quanto mais você pratica, mais sobe.',
      vi: 'Đây là cuộc thi kéo dài một tuần. Mỗi thứ Hai bạn được xếp vào phòng khoảng 30 người và tất cả đều bắt đầu từ 0. Mỗi buổi học trong ứng dụng mang lại cho bạn rune — đó chính là điểm của bạn trong bảng. Học càng nhiều, bạn càng lên cao.',
      id: 'Ini kompetisi selama sepekan. Setiap Senin kamu dikelompokkan dalam ruang berisi sekitar 30 orang dan semua mulai dari nol. Setiap sesi belajar di aplikasi memberimu rune — itulah nilaimu di tabel. Makin banyak belajar, makin tinggi posisimu.',
      tr: 'Bu, bir haftalık bir yarışma. Her pazartesi yaklaşık 30 kişilik bir odaya alınırsınız ve herkes sıfırdan başlar. Uygulamadaki her çalışma size rün kazandırır — tablodaki puanınız budur. Ne kadar çok çalışırsanız o kadar yükselirsiniz.',
      pl: 'To tygodniowe zawody. W każdy poniedziałek trafiasz do pokoju liczącego około 30 osób i wszyscy zaczynają od zera. Za każde ćwiczenie w aplikacji dostajesz runy — to twój wynik w tabeli. Im więcej ćwiczysz, tym wyżej jesteś.',
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
      ru: 'В ночь на понедельник неделя закрывается и таблица замирает. Несколько человек с самым большим счётом переходят в следующую лигу, а несколько с самым маленьким опускаются в предыдущую. Всего лиг двенадцать: от Медной до Высшей. Остальные остаются на месте и начинают новую неделю здесь же.',
      uk: 'У ніч на понеділок тиждень закривається і таблиця завмирає. Кілька людей із найбільшим рахунком переходять у наступну лігу, а кілька з найменшим опускаються в попередню. Усього ліг дванадцять: від Мідної до Вищої. Решта лишаються на місці й починають новий тиждень тут же.',
      en: 'The week closes on Monday night and the table freezes. A few people with the highest score move up to the next league, and a few with the lowest drop to the previous one. There are twelve leagues in total, from Copper to Supreme. Everyone else stays put and starts the new week right here.',
      es: 'La noche del domingo al lunes la semana se cierra y la tabla queda fija. Las personas con mayor puntuación pasan a la liga siguiente y las de menor puntuación bajan a la anterior. En total hay doce ligas, desde Cobre hasta la Suprema. El resto se queda y empieza aquí la semana nueva.',
      'pt-BR': 'Na virada para segunda a semana fecha e a tabela congela. As pessoas com maior pontuação passam para a liga seguinte e as de menor pontuação descem para a anterior. Ao todo são doze ligas, do Cobre até a Suprema. Os demais ficam e começam a nova semana aqui mesmo.',
      vi: 'Rạng sáng thứ Hai, tuần khép lại và bảng xếp hạng dừng. Vài người có điểm cao nhất lên hạng tiếp theo, còn vài người điểm thấp nhất xuống hạng trước đó. Có tất cả mười hai hạng, từ Đồng đến Cao nhất. Những người còn lại ở nguyên và bắt đầu tuần mới tại đây.',
      id: 'Menjelang Senin pekan ditutup dan tabel berhenti. Beberapa orang dengan nilai tertinggi naik ke liga berikutnya, dan beberapa dengan nilai terendah turun ke liga sebelumnya. Totalnya ada dua belas liga, dari Tembaga sampai Tertinggi. Sisanya tetap di sini dan memulai pekan baru.',
      tr: 'Pazartesiye geçen gece hafta kapanır ve tablo durur. En yüksek puanlı birkaç kişi bir üst lige geçer, en düşük puanlı birkaç kişi bir alt lige iner. Toplam on iki lig var: Bakırdan En Üst Lige kadar. Diğerleri yerinde kalır ve yeni haftaya burada başlar.',
      pl: 'W nocy z niedzieli na poniedziałek tydzień się zamyka, a tabela zastyga. Kilka osób z najwyższym wynikiem przechodzi do następnej ligi, a kilka z najniższym spada do poprzedniej. Lig jest dwanaście: od Miedzianej po Najwyższą. Reszta zostaje i zaczyna nowy tydzień tutaj.',
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
      ru: 'Если за всю неделю вы не заработали ни одной руны, вы опускаетесь в лигу ниже — даже если в комнате почти никто не занимался. Достаточно одного занятия за неделю, чтобы этого не случилось.',
      uk: 'Якщо за весь тиждень ви не заробили жодної руни, ви опускаєтесь у лігу нижче — навіть якщо в кімнаті майже ніхто не займався. Досить одного заняття за тиждень, щоб цього не сталося.',
      en: "If you don't earn a single rune the whole week, you drop to the league below — even if almost no one in the room practiced. Just one practice session a week is enough to avoid it.",
      es: 'Si en toda la semana no ganas ni una runa, bajas a la liga anterior, aunque casi nadie en la sala haya practicado. Basta con una sola práctica en la semana para evitarlo.',
      'pt-BR': 'Se durante a semana inteira você não ganhar nenhuma runa, desce para a liga anterior, mesmo que quase ninguém na sala tenha praticado. Basta uma única prática na semana para evitar isso.',
      vi: 'Nếu suốt cả tuần bạn không kiếm được rune nào, bạn sẽ xuống hạng — kể cả khi hầu như không ai trong phòng học cả. Chỉ cần một buổi học trong tuần là đủ để tránh điều đó.',
      id: 'Kalau sepanjang pekan kamu tidak mendapat satu rune pun, kamu turun ke liga sebelumnya — bahkan jika hampir tidak ada yang belajar di ruangan itu. Satu sesi belajar dalam sepekan sudah cukup untuk mencegahnya.',
      tr: 'Hafta boyunca tek bir rün bile kazanmazsanız bir alt lige inersiniz — odada neredeyse kimse çalışmamış olsa bile. Bunu önlemek için haftada tek bir çalışma yeterli.',
      pl: 'Jeśli przez cały tydzień nie zdobędziesz ani jednej runy, spadniesz do niższej ligi — nawet jeśli w pokoju prawie nikt nie ćwiczył. Wystarczy jedno ćwiczenie w tygodniu, żeby tego uniknąć.',
    }),
  },
  {
    id: 'boosts',
    icon: 'flame-outline',
    title: (lang) => triLang(lang, {
      ru: 'Двойные руны в конце недели',
      uk: 'Подвійні руни наприкінці тижня',
      en: 'Double runes at week end',
      es: 'Runas dobles al final de la semana',
      'pt-BR': 'Runas em dobro no fim da semana',
      vi: 'Rune nhân đôi cuối tuần',
      id: 'Rune ganda di akhir pekan',
      tr: 'Hafta sonunda çift rün',
      pl: 'Podwójne runy pod koniec tygodnia',
    }),
    body: (lang) => triLang(lang, {
      ru: 'В последние два часа недели тем, кто рискует опуститься в лигу ниже, руны начисляются вдвойне. Это шанс подтянуться в воскресенье вечером и остаться в своей лиге.',
      uk: 'В останні дві години тижня тим, хто ризикує опуститися в лігу нижче, руни нараховуються вдвічі. Це шанс підтягнутися в неділю ввечері й лишитися у своїй лізі.',
      en: 'In the last two hours of the week, anyone at risk of dropping a league earns double runes. It’s a chance to catch up on Sunday evening and stay in your league.',
      es: 'En las dos últimas horas de la semana, quienes corren riesgo de bajar de liga reciben runas dobles. Es la oportunidad de recuperar posiciones el domingo por la noche y quedarse en tu liga.',
      'pt-BR': 'Nas duas últimas horas da semana, quem corre risco de cair de liga recebe runas em dobro. É a chance de recuperar posições no domingo à noite e permanecer na sua liga.',
      vi: 'Trong hai giờ cuối của tuần, những người có nguy cơ xuống hạng được nhận rune gấp đôi. Đây là cơ hội bứt lên vào tối Chủ nhật và trụ lại hạng của mình.',
      id: 'Pada dua jam terakhir pekan, mereka yang terancam turun liga mendapat rune dua kali lipat. Ini kesempatan mengejar pada Minggu malam dan bertahan di liga yang sama.',
      tr: 'Haftanın son iki saatinde, bir alt lige düşme riski taşıyanlara rünler iki katı verilir. Bu, pazar akşamı toparlanıp kendi liginizde kalma şansıdır.',
      pl: 'W ostatnich dwóch godzinach tygodnia osoby zagrożone spadkiem dostają podwójne runy. To szansa, żeby w niedzielny wieczór nadrobić i zostać w swojej lidze.',
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
      ru: 'Кроме личного счёта у комнаты есть общая цель на неделю. Руны всех участников складываются вместе, и когда цель достигнута, награду получает каждый — даже те, кто внизу таблицы.',
      uk: 'Крім особистого рахунку, у кімнати є спільна мета на тиждень. Руни всіх учасників складаються разом, і коли мету досягнуто, нагороду отримує кожен — навіть ті, хто внизу таблиці.',
      en: "Besides your personal score, the room has a shared weekly goal. Everyone's runes are added together, and once the goal is reached, everyone gets the reward — even those at the bottom of the table.",
      es: 'Además de tu marcador personal, la sala tiene una meta común para la semana. Las runas de todos se suman y, cuando se alcanza la meta, todos reciben la recompensa, incluso quienes están abajo en la tabla.',
      'pt-BR': 'Além da sua pontuação pessoal, a sala tem uma meta comum da semana. As runas de todos se somam e, quando a meta é atingida, todo mundo ganha a recompensa, até quem está no fim da tabela.',
      vi: 'Ngoài điểm cá nhân, cả phòng còn có một mục tiêu chung trong tuần. Rune của mọi người được cộng lại, và khi đạt mục tiêu thì ai cũng nhận thưởng — kể cả những người ở cuối bảng.',
      id: 'Selain nilai pribadi, ruangan punya target bersama untuk sepekan. Rune semua anggota dijumlahkan, dan begitu target tercapai, semua orang mendapat hadiah — termasuk yang ada di dasar tabel.',
      tr: 'Kişisel puanınızın yanı sıra odanın haftalık ortak bir hedefi vardır. Herkesin rünleri toplanır ve hedefe ulaşıldığında ödülü herkes alır — tablonun altındakiler bile.',
      pl: 'Poza własnym wynikiem pokój ma wspólny cel na tydzień. Runy wszystkich sumują się, a gdy cel zostaje osiągnięty, nagrodę dostaje każdy — nawet osoby z dołu tabeli.',
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
      ru: 'Каждая следующая лига навсегда ускоряет ваш опыт: в самой первой прибавка небольшая, в самой высокой — больше чем вдвое. Это значит, что уровень в приложении растёт быстрее просто потому, что вы поднялись выше.',
      uk: 'Кожна наступна ліга назавжди прискорює ваш досвід: у найпершій надбавка невелика, у найвищій — більш ніж удвічі. Це означає, що рівень у застосунку росте швидше просто тому, що ви піднялися вище.',
      en: 'Every league up permanently speeds up your XP: the boost is small in the first league and more than double in the highest. That means your level in the app grows faster simply because you climbed higher.',
      es: 'Cada liga siguiente acelera tu experiencia para siempre: en la primera el aumento es pequeño y en la más alta es más del doble. Es decir, tu nivel en la app sube más rápido solo por haber ascendido.',
      'pt-BR': 'Cada liga seguinte acelera sua experiência para sempre: na primeira o acréscimo é pequeno e na mais alta passa do dobro. Ou seja, seu nível no app sobe mais rápido só porque você subiu de liga.',
      vi: 'Mỗi hạng cao hơn sẽ tăng tốc kinh nghiệm của bạn vĩnh viễn: ở hạng đầu tiên mức cộng thêm nhỏ, ở hạng cao nhất thì hơn gấp đôi. Nghĩa là cấp độ trong ứng dụng tăng nhanh hơn chỉ vì bạn đã lên hạng.',
      id: 'Setiap liga berikutnya mempercepat pengalamanmu selamanya: di liga pertama tambahannya kecil, di liga tertinggi lebih dari dua kali lipat. Artinya levelmu di aplikasi naik lebih cepat hanya karena kamu naik liga.',
      tr: 'Her üst lig deneyiminizi kalıcı olarak hızlandırır: ilk ligde ek küçüktür, en üst ligde iki katından fazladır. Yani uygulamadaki seviyeniz, sırf yükseldiğiniz için daha hızlı artar.',
      pl: 'Każda kolejna liga na stałe przyspiesza zdobywanie doświadczenia: w pierwszej dodatek jest niewielki, w najwyższej ponad dwukrotny. Twój poziom w aplikacji rośnie szybciej tylko dlatego, że awansowałeś.',
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

  const ctaLabel = triLang(lang, {
    ru: 'Понятно', uk: 'Зрозуміло', en: 'Got it', es: 'Entendido', 'pt-BR': 'Entendi',
    vi: 'Đã hiểu', id: 'Paham', tr: 'Anladım', pl: 'Jasne',
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
