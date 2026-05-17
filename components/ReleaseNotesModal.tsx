import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';

const TEXT = {
  title: {
    ru: 'Большое обновление PhraseMan',
    uk: 'Велике оновлення PhraseMan',
    es: 'Gran actualización de PhraseMan',
    'pt-BR': 'Grande atualização do PhraseMan',
    vi: 'Bản cập nhật lớn của PhraseMan',
    id: 'Pembaruan besar PhraseMan',
    tr: 'PhraseMan büyük güncelleme',
    pl: 'Duża aktualizacja PhraseMan',
  },
  subtitle: {
    ru: 'Приложение стало взрослее, понятнее и немного серьёзнее.',
    uk: 'Застосунок став дорослішим, зрозумілішим і трохи серйознішим.',
    es: 'La app ahora es más clara, más útil y un poco más seria.',
    'pt-BR': 'O app ficou mais maduro, mais claro e um pouco mais sério.',
    vi: 'Ứng dụng trưởng thành hơn, rõ ràng hơn và nghiêm túc hơn một chút.',
    id: 'Aplikasi kini lebih matang, lebih jelas, dan sedikit lebih serius.',
    tr: 'Uygulama daha olgun, daha anlaşılır ve biraz daha ciddi oldu.',
    pl: 'Aplikacja stała się dojrzalsza, czytelniejsza i trochę poważniejsza.',
  },
  chips: {
    ru: ['Чат лиги', 'Призы за цель', 'Умнее тренировки', 'Сильнее аналитика'],
    uk: ['Чат ліги', 'Призи за ціль', 'Розумніші тренування', 'Сильніша аналітика'],
    es: ['Chat de liga', 'Premios por objetivo', 'Entrenos más inteligentes', 'Más analítica'],
    'pt-BR': ['Chat da liga', 'Prêmios por meta', 'Treinos mais inteligentes', 'Análises melhores'],
    vi: ['Chat giải đấu', 'Phần thưởng mục tiêu', 'Luyện tập thông minh hơn', 'Phân tích mạnh hơn'],
    id: ['Chat liga', 'Hadiah target', 'Latihan lebih pintar', 'Analitik lebih kuat'],
    tr: ['Lig sohbeti', 'Hedef ödülleri', 'Daha akıllı antrenman', 'Daha güçlü analiz'],
    pl: ['Czat ligi', 'Nagrody za cel', 'Mądrzejsze treningi', 'Lepsza analityka'],
  },
  body: {
    ru:
      'У нас большое обновление. Такое, после которого PhraseMan поправил воротник и сказал: «Ладно, теперь работаем серьёзно».\n\n'
      + 'Что нового: в лигах появился чат. Он живёт одну неделю — ровно столько, сколько текущая лига. Можно зайти, пожелать удачи другим участникам и сделать вид, что вы не собираетесь их обгонять по XP через пять минут.\n\n'
      + 'В лигах теперь есть ценные призы за выполнение цели. Не просто «молодец, держи уважение», а настоящая игровая награда за регулярность.\n\n'
      + 'Персональные тренировки стали умнее: приложение лучше замечает проблемные места и возвращает вас к ним без драмы, но с настойчивостью хорошего тренера.\n\n'
      + 'Аналитика тоже сильно выросла. Теперь проще понять, где вы ошибаетесь, что уже получается и куда двигаться дальше. Стало нагляднее, честнее и намного полезнее.\n\n'
      + 'Профиль стал заметнее: аватар, рамки и другие элементы кастомизации теперь помогают выглядеть так, будто прогресс у вас не только внутри, но и снаружи.\n\n'
      + 'Мы также улучшили уроки, фразы, переводы, арену, лиги и места, где приложение могло вести себя так, будто английский придумали в пятницу вечером.\n\n'
      + 'Теперь о важном. Есть неприятная новость: все уроки начиная с четвёртого переходят в Premium.\n\n'
      + 'Понимаем, это не тот момент, где хочется запускать салют. Но PhraseMan сильно вырос: пользователей больше, серверы работают больше, обновления требуют больше времени, а маленькая студия не умеет оплачивать всё одним «спасибо, вы лучшие». Мы проверяли. Банк не засчитал.\n\n'
      + 'Большая бесплатная часть остаётся доступной: можно учиться, тренироваться, играть, выполнять ежедневные задания, участвовать в лигах и знакомиться с форматом.\n\n'
      + 'Premium нужен, чтобы мы могли продолжать делать новые уроки, улучшать качество и держать приложение быстрым для всех.\n\n'
      + 'Спасибо за понимание. Мы не ставим замок ради замка. Мы делаем это, чтобы PhraseMan не остановился.',
    uk:
      'У нас велике оновлення. Таке, після якого PhraseMan поправив комір і сказав: «Гаразд, тепер працюємо серйозно».\n\n'
      + 'Що нового: у лігах з’явився чат. Він живе один тиждень — рівно стільки, скільки поточна ліга. Можна зайти, побажати удачі іншим учасникам і зробити вигляд, що ви не збираєтеся обганяти їх за XP через п’ять хвилин.\n\n'
      + 'У лігах тепер є цінні призи за виконання цілі. Не просто «молодець, тримай повагу», а справжня ігрова нагорода за регулярність.\n\n'
      + 'Персональні тренування стали розумнішими: застосунок краще помічає проблемні місця й повертає вас до них без драми, але з наполегливістю хорошого тренера.\n\n'
      + 'Аналітика теж сильно виросла. Тепер простіше зрозуміти, де ви помиляєтеся, що вже виходить і куди рухатися далі. Стало наочніше, чесніше й набагато корисніше.\n\n'
      + 'Профіль став помітнішим: аватар, рамки та інші елементи кастомізації тепер допомагають виглядати так, ніби прогрес у вас не лише всередині, а й зовні.\n\n'
      + 'Ми також покращили уроки, фрази, переклади, арену, ліги й місця, де застосунок міг поводитися так, ніби англійську вигадали в п’ятницю ввечері.\n\n'
      + 'Тепер про важливе. Є неприємна новина: усі уроки, починаючи з четвертого, переходять у Premium.\n\n'
      + 'Розуміємо, це не той момент, де хочеться запускати салют. Але PhraseMan сильно виріс: користувачів більше, сервери працюють більше, оновлення потребують більше часу, а маленька студія не вміє оплачувати все одним «дякуємо, ви найкращі». Ми перевіряли. Банк не зарахував.\n\n'
      + 'Велика безкоштовна частина залишається доступною: можна вчитися, тренуватися, грати, виконувати щоденні завдання, брати участь у лігах і знайомитися з форматом.\n\n'
      + 'Premium потрібен, щоб ми могли продовжувати робити нові уроки, покращувати якість і тримати застосунок швидким для всіх.\n\n'
      + 'Дякуємо за розуміння. Ми не ставимо замок заради замка. Ми робимо це, щоб PhraseMan не зупинився.',
    es:
      'Tenemos una actualización grande. De esas en las que PhraseMan se arregla el cuello de la camisa y dice: "Vale, ahora trabajamos en serio".\n\n'
      + 'Novedades: las ligas ahora tienen chat. Vive una semana, exactamente lo mismo que la liga actual. Puedes entrar, desear suerte a otros participantes y fingir que no vas a adelantarlos en XP dentro de cinco minutos.\n\n'
      + 'Las ligas ahora también tienen premios valiosos por completar el objetivo. No solo un "bien hecho, toma respeto", sino una recompensa real del juego por tu constancia.\n\n'
      + 'Los entrenamientos personales son más inteligentes: la app detecta mejor tus puntos débiles y te devuelve a ellos sin drama, pero con la insistencia de un buen entrenador.\n\n'
      + 'Las estadísticas también han crecido mucho. Ahora es más fácil entender dónde te equivocas, qué ya funciona y hacia dónde seguir. Todo es más claro, más honesto y mucho más útil.\n\n'
      + 'El perfil también destaca más: el avatar, los marcos y otros elementos de personalización ayudan a que tu progreso se vea por dentro y por fuera.\n\n'
      + 'También mejoramos lecciones, frases, traducciones, arena, ligas y lugares donde la app se comportaba como si el inglés se hubiera inventado un viernes por la noche.\n\n'
      + 'Ahora lo importante. Hay una noticia incómoda: todas las lecciones a partir de la cuarta pasan a Premium.\n\n'
      + 'Sabemos que no es el momento de lanzar fuegos artificiales. Pero PhraseMan ha crecido mucho: hay más usuarios, los servidores trabajan más, las actualizaciones requieren más tiempo y un estudio pequeño no puede pagarlo todo con un "gracias, son los mejores". Lo comprobamos. El banco no lo aceptó.\n\n'
      + 'Una gran parte gratuita sigue disponible: puedes aprender, entrenar, jugar, completar tareas diarias, participar en ligas y probar el formato.\n\n'
      + 'Premium nos ayuda a seguir creando lecciones nuevas, mejorar la calidad y mantener la app rápida para todos.\n\n'
      + 'Gracias por entenderlo. No ponemos un candado por ponerlo. Lo hacemos para que PhraseMan no se detenga.',
    'pt-BR':
      'Temos uma grande atualização. Daquelas em que o PhraseMan ajeita a gola e diz: "Certo, agora vamos trabalhar sério".\n\n'
      + 'O que há de novo: as ligas agora têm chat. Ele dura uma semana, exatamente o tempo da liga atual. Você pode entrar, desejar boa sorte aos outros participantes e fingir que não pretende passar todo mundo em XP daqui a cinco minutos.\n\n'
      + 'As ligas agora também têm prêmios valiosos por cumprir a meta. Não é só "muito bem, receba respeito", mas uma recompensa real do jogo pela regularidade.\n\n'
      + 'Os treinos pessoais ficaram mais inteligentes: o app percebe melhor seus pontos fracos e leva você de volta a eles sem drama, mas com a insistência de um bom treinador.\n\n'
      + 'A análise também cresceu bastante. Agora fica mais fácil entender onde você erra, o que já funciona e para onde seguir. Ficou mais claro, mais honesto e muito mais útil.\n\n'
      + 'O perfil também ficou mais visível: avatar, molduras e outros elementos de personalização ajudam seu progresso a aparecer por dentro e por fora.\n\n'
      + 'Também melhoramos lições, frases, traduções, arena, ligas e lugares em que o app podia se comportar como se o inglês tivesse sido inventado numa sexta-feira à noite.\n\n'
      + 'Agora o ponto importante. Há uma notícia desconfortável: todas as lições a partir da quarta passam para o Premium.\n\n'
      + 'Sabemos que este não é o momento de soltar fogos. Mas o PhraseMan cresceu muito: há mais usuários, os servidores trabalham mais, as atualizações exigem mais tempo e um estúdio pequeno não consegue pagar tudo com um "obrigado, vocês são incríveis". Nós testamos. O banco não aceitou.\n\n'
      + 'Uma grande parte gratuita continua disponível: você pode aprender, treinar, jogar, completar tarefas diárias, participar das ligas e conhecer o formato.\n\n'
      + 'O Premium nos ajuda a continuar criando novas lições, melhorar a qualidade e manter o app rápido para todos.\n\n'
      + 'Obrigado por entender. Não colocamos um cadeado por colocar. Fazemos isso para que o PhraseMan não pare.',
    vi:
      'Chúng ta có một bản cập nhật lớn. Kiểu cập nhật mà PhraseMan chỉnh lại cổ áo rồi nói: "Được rồi, giờ làm việc nghiêm túc".\n\n'
      + 'Có gì mới: các giải đấu giờ có chat. Chat tồn tại trong một tuần, đúng bằng thời gian của giải đấu hiện tại. Bạn có thể vào chúc người khác may mắn và giả vờ rằng mình không định vượt họ về XP sau năm phút nữa.\n\n'
      + 'Các giải đấu giờ cũng có phần thưởng giá trị khi hoàn thành mục tiêu. Không chỉ là "làm tốt lắm, nhận sự tôn trọng nhé", mà là phần thưởng thật trong game cho sự đều đặn.\n\n'
      + 'Các buổi luyện tập cá nhân thông minh hơn: ứng dụng nhận ra điểm yếu tốt hơn và đưa bạn quay lại luyện chúng, không kịch tính, nhưng kiên trì như một huấn luyện viên tốt.\n\n'
      + 'Phần phân tích cũng phát triển nhiều. Giờ bạn dễ hiểu hơn mình sai ở đâu, phần nào đã ổn và nên đi tiếp theo hướng nào. Rõ ràng hơn, thật hơn và hữu ích hơn nhiều.\n\n'
      + 'Hồ sơ cũng nổi bật hơn: avatar, khung và các yếu tố tùy chỉnh khác giúp tiến bộ của bạn được nhìn thấy cả bên trong lẫn bên ngoài.\n\n'
      + 'Chúng tôi cũng cải thiện bài học, cụm từ, bản dịch, arena, giải đấu và những chỗ ứng dụng từng hành xử như thể tiếng Anh được nghĩ ra vào tối thứ Sáu.\n\n'
      + 'Bây giờ là phần quan trọng. Có một tin không dễ chịu: tất cả bài học từ bài thứ tư trở đi sẽ chuyển sang Premium.\n\n'
      + 'Chúng tôi hiểu đây không phải lúc ai muốn ăn mừng. Nhưng PhraseMan đã lớn hơn rất nhiều: người dùng nhiều hơn, máy chủ chạy nhiều hơn, cập nhật cần nhiều thời gian hơn, và một studio nhỏ không thể chi trả mọi thứ chỉ bằng câu "cảm ơn, các bạn tuyệt lắm". Chúng tôi đã thử. Ngân hàng không chấp nhận.\n\n'
      + 'Một phần miễn phí lớn vẫn còn: bạn có thể học, luyện tập, chơi, làm nhiệm vụ hằng ngày, tham gia giải đấu và làm quen với cách học.\n\n'
      + 'Premium giúp chúng tôi tiếp tục tạo bài học mới, nâng chất lượng và giữ ứng dụng nhanh cho tất cả mọi người.\n\n'
      + 'Cảm ơn bạn đã thông cảm. Chúng tôi không đặt khóa chỉ để đặt khóa. Chúng tôi làm vậy để PhraseMan không dừng lại.',
    id:
      'Kami punya pembaruan besar. Jenis pembaruan ketika PhraseMan merapikan kerah dan berkata: "Oke, sekarang kita bekerja serius".\n\n'
      + 'Yang baru: liga sekarang punya chat. Chat ini aktif selama satu minggu, sama persis dengan durasi liga saat ini. Kamu bisa masuk, mendoakan peserta lain semoga berhasil, lalu pura-pura tidak akan menyalip XP mereka lima menit lagi.\n\n'
      + 'Liga sekarang juga punya hadiah bernilai untuk menyelesaikan target. Bukan cuma "bagus, ini rasa hormat", tapi hadiah game sungguhan untuk konsistensi.\n\n'
      + 'Latihan personal menjadi lebih pintar: aplikasi lebih baik mengenali titik lemahmu dan mengembalikanmu ke sana tanpa drama, tapi dengan ketekunan seperti pelatih yang baik.\n\n'
      + 'Analitik juga berkembang banyak. Sekarang lebih mudah memahami di mana kamu sering salah, apa yang sudah mulai berhasil, dan ke mana harus lanjut. Lebih jelas, lebih jujur, dan jauh lebih berguna.\n\n'
      + 'Profil juga lebih menonjol: avatar, bingkai, dan elemen kustomisasi lain membantu progresmu terlihat, bukan hanya terasa.\n\n'
      + 'Kami juga meningkatkan pelajaran, frasa, terjemahan, arena, liga, dan bagian-bagian tempat aplikasi dulu bisa bertingkah seolah bahasa Inggris ditemukan pada Jumat malam.\n\n'
      + 'Sekarang bagian pentingnya. Ada kabar yang kurang nyaman: semua pelajaran mulai dari pelajaran keempat akan masuk Premium.\n\n'
      + 'Kami paham ini bukan momen untuk menyalakan kembang api. Tapi PhraseMan sudah tumbuh banyak: pengguna lebih banyak, server bekerja lebih keras, pembaruan butuh lebih banyak waktu, dan studio kecil tidak bisa membayar semuanya hanya dengan "terima kasih, kalian hebat". Kami sudah mencoba. Bank tidak menerimanya.\n\n'
      + 'Bagian gratis yang besar tetap tersedia: kamu bisa belajar, berlatih, bermain, menyelesaikan tugas harian, ikut liga, dan mencoba formatnya.\n\n'
      + 'Premium membantu kami terus membuat pelajaran baru, meningkatkan kualitas, dan menjaga aplikasi tetap cepat untuk semua orang.\n\n'
      + 'Terima kasih sudah memahami. Kami tidak memasang kunci hanya demi memasang kunci. Kami melakukannya agar PhraseMan tidak berhenti.',
    tr:
      'Büyük bir güncellememiz var. PhraseMan yakasını düzeltip "Tamam, artık ciddi çalışıyoruz" dediği türden bir güncelleme.\n\n'
      + 'Yenilikler: liglerde artık sohbet var. Bir hafta yaşar; yani mevcut lig ne kadar sürüyorsa tam o kadar. Girip diğer katılımcılara şans dileyebilir ve beş dakika sonra XP ile onları geçmeyecekmiş gibi davranabilirsiniz.\n\n'
      + 'Liglerde hedefi tamamlayınca artık değerli ödüller de var. Sadece "aferin, saygımızı kazandın" değil; düzenli çalışmanın karşılığı olan gerçek bir oyun ödülü.\n\n'
      + 'Kişisel antrenmanlar daha akıllı hale geldi: uygulama zayıf noktalarınızı daha iyi fark ediyor ve sizi onlara geri getiriyor. Drama yok, ama iyi bir eğitmen kadar ısrar var.\n\n'
      + 'Analitik de ciddi şekilde gelişti. Artık nerede hata yaptığınızı, neyin işe yaradığını ve sonra nereye ilerlemeniz gerektiğini anlamak daha kolay. Daha anlaşılır, daha dürüst ve çok daha faydalı oldu.\n\n'
      + 'Profil de daha görünür hale geldi: avatar, çerçeveler ve diğer kişiselleştirme öğeleri ilerlemenizin yalnızca içeride değil dışarıda da görünmesine yardım ediyor.\n\n'
      + 'Ayrıca dersleri, ifadeleri, çevirileri, arenayı, ligleri ve uygulamanın İngilizce cuma akşamı icat edilmiş gibi davrandığı yerleri de iyileştirdik.\n\n'
      + 'Şimdi önemli kısım. Rahatsız edici bir haber var: dördüncü dersten itibaren tüm dersler Premium oluyor.\n\n'
      + 'Bunun kutlama yapmak isteyeceğiniz bir an olmadığını biliyoruz. Ama PhraseMan çok büyüdü: daha fazla kullanıcı var, sunucular daha fazla çalışıyor, güncellemeler daha çok zaman istiyor ve küçük bir stüdyo her şeyi "teşekkürler, harikasınız" ile ödeyemiyor. Denedik. Banka kabul etmedi.\n\n'
      + 'Büyük bir ücretsiz bölüm yine açık kalıyor: öğrenebilir, antrenman yapabilir, oynayabilir, günlük görevleri tamamlayabilir, liglere katılabilir ve formatı deneyebilirsiniz.\n\n'
      + 'Premium, yeni dersler yapmaya, kaliteyi artırmaya ve uygulamayı herkes için hızlı tutmaya devam etmemize yardımcı oluyor.\n\n'
      + 'Anlayışınız için teşekkürler. Sırf kilit koymuş olmak için kilit koymuyoruz. Bunu PhraseMan durmasın diye yapıyoruz.',
    pl:
      'Mamy dużą aktualizację. Taką, po której PhraseMan poprawia kołnierzyk i mówi: "Dobra, teraz pracujemy na serio".\n\n'
      + 'Co nowego: ligi mają teraz czat. Żyje przez tydzień, dokładnie tyle, ile obecna liga. Możesz wejść, życzyć innym powodzenia i udawać, że wcale nie zamierzasz wyprzedzić ich w XP za pięć minut.\n\n'
      + 'W ligach są też teraz wartościowe nagrody za wykonanie celu. Nie tylko "dobra robota, masz szacunek", ale prawdziwa nagroda w grze za regularność.\n\n'
      + 'Treningi personalne stały się mądrzejsze: aplikacja lepiej zauważa słabe miejsca i wraca z tobą do nich bez dramatu, ale z uporem dobrego trenera.\n\n'
      + 'Analityka też mocno urosła. Teraz łatwiej zrozumieć, gdzie robisz błędy, co już działa i dokąd iść dalej. Jest czytelniej, uczciwiej i dużo bardziej użytecznie.\n\n'
      + 'Profil stał się bardziej widoczny: avatar, ramki i inne elementy personalizacji pomagają pokazać postęp nie tylko w środku, ale też na zewnątrz.\n\n'
      + 'Poprawiliśmy też lekcje, frazy, tłumaczenia, arenę, ligi i miejsca, w których aplikacja zachowywała się tak, jakby angielski wymyślono w piątek wieczorem.\n\n'
      + 'Teraz ważna sprawa. Jest niewygodna wiadomość: wszystkie lekcje od czwartej przechodzą do Premium.\n\n'
      + 'Rozumiemy, że to nie jest moment na fajerwerki. Ale PhraseMan bardzo urósł: jest więcej użytkowników, serwery pracują więcej, aktualizacje wymagają więcej czasu, a małe studio nie potrafi opłacić wszystkiego jednym "dziękujemy, jesteście najlepsi". Sprawdziliśmy. Bank nie uznał.\n\n'
      + 'Duża część darmowa zostaje dostępna: możesz się uczyć, trenować, grać, wykonywać codzienne zadania, brać udział w ligach i poznać format.\n\n'
      + 'Premium pomaga nam dalej tworzyć nowe lekcje, podnosić jakość i utrzymywać aplikację szybką dla wszystkich.\n\n'
      + 'Dziękujemy za zrozumienie. Nie zakładamy blokady dla samej blokady. Robimy to, żeby PhraseMan się nie zatrzymał.',
  },
  cta: {
    ru: 'Понятно, продолжаем',
    uk: 'Зрозуміло, продовжуємо',
    es: 'Entendido, seguimos',
    'pt-BR': 'Entendi, continuar',
    vi: 'Đã hiểu, tiếp tục',
    id: 'Mengerti, lanjut',
    tr: 'Anladım, devam',
    pl: 'Rozumiem, kontynuuj',
  },
} as const;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ReleaseNotesModal({ visible, onClose }: Props) {
  const { f } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const cardAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  const title = useMemo(() => triLang(lang, {
    ru: TEXT.title.ru,
    uk: TEXT.title.uk,
    es: TEXT.title.es,
    'pt-BR': TEXT.title['pt-BR'],
    vi: TEXT.title.vi,
    id: TEXT.title.id,
    tr: TEXT.title.tr,
    pl: TEXT.title.pl,
  }), [lang]);
  const subtitle = useMemo(() => triLang(lang, {
    ru: TEXT.subtitle.ru,
    uk: TEXT.subtitle.uk,
    es: TEXT.subtitle.es,
    'pt-BR': TEXT.subtitle['pt-BR'],
    vi: TEXT.subtitle.vi,
    id: TEXT.subtitle.id,
    tr: TEXT.subtitle.tr,
    pl: TEXT.subtitle.pl,
  }), [lang]);
  const chips = useMemo(
    () => (lang === 'es' ? TEXT.chips.es : lang === 'uk' ? TEXT.chips.uk : TEXT.chips.ru),
    [lang],
  );
  const body = useMemo(() => triLang(lang, {
    ru: TEXT.body.ru,
    uk: TEXT.body.uk,
    es: TEXT.body.es,
    'pt-BR': TEXT.body['pt-BR'],
    vi: TEXT.body.vi,
    id: TEXT.body.id,
    tr: TEXT.body.tr,
    pl: TEXT.body.pl,
  }), [lang]);
  const paragraphs = useMemo(() => body.split('\n\n').filter(Boolean), [body]);
  const titleSize = Math.min(f.h2, 24);
  const bodySize = Math.min(f.body, 16);
  const captionSize = Math.min(f.caption, 13);
  const buttonSize = Math.min(f.bodyLg, 17);

  useEffect(() => {
    if (!visible) {
      cardAnim.setValue(0);
      glowAnim.setValue(0);
      shineAnim.setValue(0);
      return;
    }

    const enter = Animated.spring(cardAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 74,
      friction: 9,
    });
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(6800),
      ]),
    );

    enter.start();
    glowLoop.start();
    shineLoop.start();

    return () => {
      enter.stop();
      glowLoop.stop();
      shineLoop.stop();
    };
  }, [cardAnim, glowAnim, shineAnim, visible]);

  const closeOnce = () => {
    hapticTap();
    onClose();
  };

  const cardAnimatedStyle = {
    opacity: cardAnim,
    transform: [
      {
        translateY: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
      {
        scale: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };

  const iconAnimatedStyle = {
    transform: [
      {
        scale: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
      {
        rotate: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['-4deg', '5deg'],
        }),
      },
    ],
  };

  const shineAnimatedStyle = {
    opacity: shineAnim.interpolate({
      inputRange: [0, 0.25, 0.55, 1],
      outputRange: [0, 0.24, 0.08, 0],
    }),
    transform: [
      {
        translateX: shineAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-260, 260],
        }),
      },
      { rotate: '18deg' },
    ],
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeOnce}
    >
      <View style={[styles.root, { paddingBottom: insets.bottom }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeOnce}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            uk: 'Закрити',
            ru: 'Закрыть',
            es: 'Cerrar',
            'pt-BR': 'Fechar',
            vi: 'Đóng',
            id: 'Tutup',
            tr: 'Kapat',
            pl: 'Zamknij',
          })}
        />
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          <LinearGradient
            colors={['#111722', '#171A24', '#241F13']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View pointerEvents="none" style={[styles.shine, shineAnimatedStyle]} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator
            bounces
          >
          <View style={styles.hero}>
            <Animated.View style={[styles.iconHalo, iconAnimatedStyle]}>
              <LinearGradient colors={['#FFF1B8', '#F7C75F', '#D68A2E']} style={styles.iconBadge}>
                <Ionicons name="sparkles" size={25} color="#172033" />
              </LinearGradient>
            </Animated.View>
            <View style={styles.releasePill}>
              <Ionicons name="rocket-outline" size={14} color="#F9D77A" />
              <Text style={[styles.releasePillText, { fontSize: captionSize }]}>
                {lang === 'es' ? 'Nueva versión' : lang === 'uk' ? 'Нова версія' : 'Новая версия'}
              </Text>
            </View>
            <Text style={[styles.title, { fontSize: titleSize }]}>{title}</Text>
            <Text style={[styles.subtitle, { fontSize: bodySize }]}>{subtitle}</Text>
          </View>

          <View style={styles.chipsWrap}>
            {chips.map((chip, index) => (
              <View key={chip} style={styles.chip}>
                <View style={styles.chipIcon}>
                  <Ionicons
                    name={
                      index === 0
                        ? 'chatbubble-ellipses-outline'
                        : index === 1
                          ? 'trophy-outline'
                          : index === 3
                            ? 'analytics-outline'
                            : 'checkmark'
                    }
                    size={13}
                    color="#1B2330"
                  />
                </View>
                <Text style={[styles.chipText, { fontSize: captionSize }]} numberOfLines={2}>
                  {chip}
                </Text>
              </View>
            ))}
          </View>

            {paragraphs.map((paragraph, index) => {
              const premiumBlock = index === 2;
              return premiumBlock ? (
                <View key={paragraph} style={styles.premiumBlock}>
                  <View style={styles.premiumBlockIcon}>
                    <Ionicons name="lock-closed" size={15} color="#1B2330" />
                  </View>
                  <Text style={[styles.premiumBlockText, { fontSize: bodySize }]}>{paragraph}</Text>
                </View>
              ) : (
                <Text key={paragraph} style={[styles.body, { fontSize: bodySize }]}>
                  {paragraph}
                </Text>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={closeOnce}
            style={({ pressed }) => [
              styles.btn,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <LinearGradient colors={['#FFE08A', '#F7BE4F', '#E99D35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
              <Text style={[styles.btnText, { fontSize: buttonSize }]}>
                {triLang(lang, {
                  ru: TEXT.cta.ru,
                  uk: TEXT.cta.uk,
                  es: TEXT.cta.es,
                  'pt-BR': TEXT.cta['pt-BR'],
                  vi: TEXT.cta.vi,
                  id: TEXT.cta.id,
                  tr: TEXT.cta.tr,
                  pl: TEXT.cta.pl,
                })}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(3, 7, 18, 0.82)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    height: '88%',
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 199, 95, 0.34)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 18,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: -80,
    bottom: -80,
    width: 96,
    backgroundColor: '#FFF7CE',
  },
  hero: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(247, 199, 95, 0.22)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    paddingHorizontal: 16,
    paddingTop: 17,
    paddingBottom: 15,
    alignItems: 'center',
    marginBottom: 11,
  },
  iconHalo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247, 199, 95, 0.13)',
    marginBottom: 10,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releasePill: {
    minHeight: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(249, 215, 122, 0.34)',
    backgroundColor: 'rgba(249, 215, 122, 0.08)',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  releasePillText: {
    color: '#F9D77A',
    fontWeight: '800',
  },
  title: {
    textAlign: 'center',
    color: '#FFF7E3',
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 7,
  },
  subtitle: {
    color: '#C8D6EA',
    textAlign: 'center',
    lineHeight: 22,
  },
  chipsWrap: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(125, 146, 178, 0.23)',
    backgroundColor: 'rgba(255,255,255,0.052)',
    paddingHorizontal: 9,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#74A9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    color: '#DCE8FF',
    fontWeight: '700',
    lineHeight: 17,
    flexShrink: 1,
  },
  scroll: {
    alignSelf: 'stretch',
    flex: 1,
    marginBottom: 4,
  },
  scrollInner: {
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  body: {
    color: '#DDE7F6',
    textAlign: 'left',
    lineHeight: 23,
    marginBottom: 15,
  },
  premiumBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 215, 122, 0.38)',
    backgroundColor: 'rgba(249, 215, 122, 0.1)',
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 15,
  },
  premiumBlockIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F9D77A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  premiumBlockText: {
    flex: 1,
    color: '#FFE9A8',
    fontWeight: '800',
    lineHeight: 23,
  },
  btn: {
    width: '100%',
    borderRadius: 16,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#F7BE4F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  btnGradient: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  btnText: {
    color: '#121826',
    fontWeight: '900',
    textAlign: 'center',
  },
});
