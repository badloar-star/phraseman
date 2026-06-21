import { Ionicons } from '@expo/vector-icons';
import React, { memo, useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from './SafeLinearGradient';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import type { PlannedInterfaceLang } from '../constants/i18n';
import {
  RewardModalBackdrop,
  RewardModalPanelBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';

// 'gift'     — существующий free-юзер: текст обновления + блок подарка + кнопка «Получить 3 дня».
// 'announce' — премиум/VIP-юзер: ТОЛЬКО текст обновления, без подарка и без кнопки получения.
export type LoyaltyGiftModalVariant = 'gift' | 'announce';

type Props = {
  visible: boolean;
  variant?: LoyaltyGiftModalVariant;
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
  // Тап по блоку «год доступа за идею» — ведёт в Настройки → Идеи (закрывает модал).
  onIdeasPress?: () => void;
};

type HighlightCopy = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string };

type ModalCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  highlightsTitle: string;
  highlights: HighlightCopy[];
  giftEyebrow: string;
  giftTitle: string;
  giftBody: string;
  giftChips: string[];
  primaryCta: string;
  secondaryCta: string;
  footer: string;
  // Тексты для премиум/VIP (без подарка) — благодарим и закрываем.
  announcePrimaryCta: string;
  announceFooter: string;
  // Личная заметка от автора (одиночный разработчик за «мы»).
  personalNoteTitle: string;
  personalNoteBody: string;
  // Блок «год полного доступа за идею» (раздел Идеи в настройках).
  ideasTitle: string;
  ideasBody: string;
};

// Текст обновления + подарок за лояльность. Намеренно «мощный»: сначала вау-фичи,
// затем эмоциональный подарок «спасибо за то, что ты с нами с самого начала».
// Ключи: обязательны ru/uk/es, остальные языки интерфейса — опционально (как triLang).
const COPY: Record<'ru' | 'uk' | 'es', ModalCopy> & Partial<Record<PlannedInterfaceLang, ModalCopy>> = {
  ru: {
    eyebrow: 'Новая версия',
    title: 'Phraseman, которого ты ещё не видел',
    intro: 'Половина приложения переписана заново. Стало понятнее, живее и приятнее учиться. Вот что ты почувствуешь сразу:',
    highlightsTitle: 'Что изменилось',
    highlights: [
      { icon: 'compass', title: 'Подскажет, что учить сегодня', body: 'Больше не надо думать, с чего начать. Приложение само смотрит, что у тебя получается, а что ещё хромает — и каждый день предлагает именно то, что нужно тебе.' },
      { icon: 'sparkles', title: 'Очень много новых занятий', body: 'Добавлены тысячи новых фраз на каждый день: работа, дом, здоровье, путешествия, чувства. Хватит надолго — и всё про реальную жизнь, а не из учебника.' },
      { icon: 'chatbubbles', title: 'Диалоги: живая переписка по ролям', body: 'Выбираешь ситуацию — кафе, врач, собеседование — и переписываешься с её героем прямо в приложении, как в мессенджере. Каждый герой отвечает по-своему, с характером. Отличный способ заговорить без страха.' },
      { icon: 'volume-high', title: 'Приятный живой голос', body: 'Фразы озвучивает приятный голос, а не робот. Не успел расслышать? Замедли — и повтори в удобном темпе.' },
      { icon: 'trophy', title: 'Соревнуйся с другими', body: 'Хочешь азарта — сыграй против реального соперника. Подбор за секунды, таблица лучших и красивые награды за победы.' },
      { icon: 'bulb', title: 'Понятно объясняет промахи', body: 'Ответил неправильно — приложение спокойно покажет, почему. А если что-то всё ещё непонятно, одна кнопка объяснит совсем простыми словами.' },
      { icon: 'diamond', title: 'Коллекция красивых карточек', body: 'За занятия выпадают красивые карточки с картинками — как маленькие награды. Приятно собирать и приятно открывать новые.' },
    ],
    personalNoteTitle: 'Честно, по-настоящему',
    personalNoteBody: 'Я говорю «мы» — хотя за всем этим стоит один человек. Просто в одиночку такой объём звучит неправдоподобно. Но это так: ночи без сна и личное время — чтобы это обновление дошло до тебя. Спасибо, что ты здесь.',
    ideasTitle: 'Год полного доступа — за идею',
    ideasBody: 'У тебя есть мысль, как сделать Phraseman лучше? Поделись — и за яркую, живую идею открою тебе целый год полного доступа. Настройки → «Идеи». Серьёзно, это того стоит.',
    giftEyebrow: 'Спасибо, что ты с самого начала',
    giftTitle: 'Держи 3 дня — всё открыто',
    giftBody: 'Ты был с Phraseman ещё до этого обновления, и это дорогого стоит. В благодарность дарю тебе 3 дня, когда открыто всё — без единого замка и без ограничений. Просто подарок: ничего не спишется, подписка не включится. Зайди и почувствуй обновление во всю силу.',
    giftChips: ['Все занятия', 'Без замков', 'Без ограничений', 'Все темы', 'Подсказки', 'Тёмные стили'],
    primaryCta: 'Забрать 3 дня',
    secondaryCta: 'Может позже',
    footer: 'Это подарок. Ничего не спишется, подписка не включится.',
    announcePrimaryCta: 'Посмотреть, что нового',
    announceFooter: 'Спасибо, что остаёшься рядом. Всё новое уже открыто в твоём Premium.',
  },
  uk: {
    eyebrow: 'Нова версія',
    title: 'Phraseman, якого ти ще не бачив',
    intro: 'Половину застосунку переписано наново. Стало зрозуміліше, живіше й приємніше вчитися. Ось що ти відчуєш одразу:',
    highlightsTitle: 'Що змінилося',
    highlights: [
      { icon: 'compass', title: 'Підкаже, що вчити сьогодні', body: 'Більше не треба думати, з чого почати. Застосунок сам бачить, що в тебе виходить, а що ще кульгає — і щодня пропонує саме те, що потрібно тобі.' },
      { icon: 'sparkles', title: 'Дуже багато нових занять', body: 'Додано тисячі нових фраз на щодень: робота, дім, здоров’я, подорожі, почуття. Вистачить надовго — і все про реальне життя, а не з підручника.' },
      { icon: 'chatbubbles', title: 'Діалоги: жива переписка за ролями', body: 'Обираєш ситуацію — кафе, лікар, співбесіда — і листуєшся з її героєм прямо в застосунку, як у месенджері. Кожен герой відповідає по-своєму, з характером. Чудовий спосіб заговорити без страху.' },
      { icon: 'volume-high', title: 'Приємний живий голос', body: 'Фрази озвучує приємний голос, а не робот. Не встиг розчути? Сповільни — і повтори у зручному темпі.' },
      { icon: 'trophy', title: 'Змагайся з іншими', body: 'Хочеш азарту — зіграй проти реального суперника. Підбір за секунди, таблиця найкращих і гарні нагороди за перемоги.' },
      { icon: 'bulb', title: 'Зрозуміло пояснює промахи', body: 'Відповів неправильно — застосунок спокійно покаже, чому. А якщо щось усе ще незрозуміло, одна кнопка пояснить зовсім простими словами.' },
      { icon: 'diamond', title: 'Колекція гарних карток', body: 'За заняття випадають гарні картки з малюнками — наче маленькі нагороди. Приємно збирати й приємно відкривати нові.' },
    ],
    personalNoteTitle: 'Чесно, по-справжньому',
    personalNoteBody: 'Я кажу «ми» — хоча за всім цим стоїть одна людина. Просто наодинці такий обсяг звучить неправдоподібно. Та це так: ночі без сну й особистий час — щоб це оновлення дійшло до тебе. Дякую, що ти тут.',
    ideasTitle: 'Рік повного доступу — за ідею',
    ideasBody: 'Маєш думку, як зробити Phraseman кращим? Поділись — і за яскраву, живу ідею відкрию тобі цілий рік повного доступу. Налаштування → «Ідеї». Серйозно, воно того варте.',
    giftEyebrow: 'Дякую, що ти від самого початку',
    giftTitle: 'Тримай 3 дні — все відкрито',
    giftBody: 'Ти був з Phraseman ще до цього оновлення, і це дорогого варте. На знак подяки дарую тобі 3 дні, коли відкрито все — без жодного замка й без обмежень. Просто подарунок: нічого не спишеться, підписка не ввімкнеться. Зайди й відчуй оновлення на повну силу.',
    giftChips: ['Усі заняття', 'Без замків', 'Без обмежень', 'Усі теми', 'Підказки', 'Темні стилі'],
    primaryCta: 'Забрати 3 дні',
    secondaryCta: 'Можливо пізніше',
    footer: 'Це подарунок. Нічого не спишеться, підписка не ввімкнеться.',
    announcePrimaryCta: 'Подивитися, що нового',
    announceFooter: 'Дякую, що залишаєшся поруч. Усе нове вже відкрите у твоєму Premium.',
  },
  es: {
    eyebrow: 'Nueva versión',
    title: 'El Phraseman que aún no conocías',
    intro: 'Media app reescrita desde cero. Ahora es más clara, más viva y más agradable para aprender. Esto es lo que notarás enseguida:',
    highlightsTitle: 'Qué cambió',
    highlights: [
      { icon: 'compass', title: 'Te dice qué estudiar hoy', body: 'Ya no tienes que pensar por dónde empezar. La app ve qué se te da bien y qué aún cojea — y cada día te propone justo lo que necesitas.' },
      { icon: 'sparkles', title: 'Muchísimas prácticas nuevas', body: 'Miles de frases nuevas para el día a día: trabajo, casa, salud, viajes, sentimientos. Da para rato — y todo de la vida real, no de un libro de texto.' },
      { icon: 'chatbubbles', title: 'Diálogos: chatea según el rol', body: 'Eliges una situación — café, médico, entrevista — y chateas con su personaje dentro de la app, como en tu mensajería. Cada personaje responde a su manera, con carácter. Ideal para soltarte a hablar sin miedo.' },
      { icon: 'volume-high', title: 'Una voz humana y agradable', body: 'Las frases las dice una voz agradable, no un robot. ¿No la pillaste? Bájala — y repite a tu ritmo.' },
      { icon: 'trophy', title: 'Compite con otros', body: '¿Quieres emoción? Juega contra un rival real. Te emparejan en segundos, con tabla de mejores y bonitos premios al ganar.' },
      { icon: 'bulb', title: 'Explica los fallos con claridad', body: 'Si respondes mal, la app te muestra con calma por qué. Y si aún no lo ves, un botón te lo explica con palabras muy simples.' },
      { icon: 'diamond', title: 'Colección de cartas bonitas', body: 'Al practicar caen cartas bonitas con dibujos — como pequeños premios. Da gusto coleccionarlas y abrir nuevas.' },
    ],
    personalNoteTitle: 'Con honestidad',
    personalNoteBody: 'Digo «nosotros», aunque detrás de todo esto hay una sola persona. En solitario este volumen suena increíble. Pero es así: noches sin dormir y tiempo propio para que esta actualización llegue a ti. Gracias por estar aquí.',
    ideasTitle: 'Un año de acceso completo — por una idea',
    ideasBody: '¿Tienes una idea para mejorar Phraseman? Cuéntamela — y por una idea original y viva te abro un año entero de acceso completo. Ajustes → «Ideas». En serio, vale la pena.',
    giftEyebrow: 'Gracias por estar desde el inicio',
    giftTitle: 'Toma 3 días — todo abierto',
    giftBody: 'Estuviste con Phraseman antes de esta actualización, y eso vale mucho. En agradecimiento te regalo 3 días con todo abierto — sin ni un candado y sin límites. Solo un regalo: no se cobra nada, la suscripción no se activa. Entra y siente la app renovada al máximo.',
    giftChips: ['Todo abierto', 'Sin candados', 'Sin límites', 'Todos los temas', 'Pistas', 'Estilos oscuros'],
    primaryCta: 'Quiero mis 3 días',
    secondaryCta: 'Quizá luego',
    footer: 'Es un regalo. No se cobra nada, la suscripción no se activa.',
    announcePrimaryCta: 'Ver las novedades',
    announceFooter: 'Gracias por seguir aquí. Todo lo nuevo ya está abierto en tu Premium.',
  },
  'pt-BR': {
    eyebrow: 'Nova versão',
    title: 'O Phraseman que você ainda não viu',
    intro: 'Metade do app foi reescrita do zero. Ficou mais claro, mais vivo e mais gostoso de estudar. Veja o que você sente logo de cara:',
    highlightsTitle: 'O que mudou',
    highlights: [
      { icon: 'compass', title: 'Mostra o que estudar hoje', body: 'Você não precisa mais decidir por onde começar. O app vê o que está indo bem, o que ainda falha, e sugere todos os dias o treino certo para você.' },
      { icon: 'sparkles', title: 'Muitas práticas novas', body: 'Entraram milhares de frases para o dia a dia: trabalho, casa, saúde, viagens, sentimentos. Dura bastante — e tudo soa vida real, não livro didático.' },
      { icon: 'chatbubbles', title: 'Diálogos: conversa por papéis', body: 'Escolha uma situação — café, médico, entrevista — e converse com o personagem dentro do app, como num mensageiro. Cada um responde com seu próprio estilo.' },
      { icon: 'volume-high', title: 'Voz natural e agradável', body: 'As frases são faladas por uma voz agradável, não por um robô. Não ouviu bem? Diminua a velocidade e repita no seu ritmo.' },
      { icon: 'trophy', title: 'Compita com outras pessoas', body: 'Quer mais emoção? Jogue contra um rival real. Pareamento em segundos, ranking e recompensas bonitas pelas vitórias.' },
      { icon: 'bulb', title: 'Explica os erros com clareza', body: 'Errou uma resposta? O app mostra com calma o motivo. Se ainda estiver confuso, um botão explica em palavras bem simples.' },
      { icon: 'diamond', title: 'Coleção de cartas bonitas', body: 'Ao praticar, você recebe cartas bonitas com imagens — pequenas recompensas para colecionar e abrir com prazer.' },
    ],
    personalNoteTitle: 'Com honestidade',
    personalNoteBody: 'Eu digo “nós”, embora por trás disso esteja uma só pessoa. Sozinho, esse volume parece inacreditável. Mas é isso mesmo: noites sem dormir e tempo pessoal para esta atualização chegar até você. Obrigado por estar aqui.',
    ideasTitle: 'Um ano de acesso completo — por uma ideia',
    ideasBody: 'Tem uma ideia para melhorar o Phraseman? Conte para mim — e por uma ideia viva e original eu libero um ano inteiro de acesso completo. Configurações → “Ideias”. Sério, vale a pena.',
    giftEyebrow: 'Obrigado por estar desde o começo',
    giftTitle: 'Pegue 3 dias — tudo aberto',
    giftBody: 'Você já estava com o Phraseman antes desta atualização, e isso vale muito. Como agradecimento, dou 3 dias com tudo aberto — sem cadeados e sem limites. É só um presente: nada será cobrado, a assinatura não será ativada. Entre e sinta o app renovado em força total.',
    giftChips: ['Tudo aberto', 'Sem cadeados', 'Sem limites', 'Todos os temas', 'Dicas', 'Estilos escuros'],
    primaryCta: 'Pegar meus 3 dias',
    secondaryCta: 'Talvez depois',
    footer: 'É um presente. Nada será cobrado, a assinatura não será ativada.',
    announcePrimaryCta: 'Ver novidades',
    announceFooter: 'Obrigado por continuar por perto. Tudo novo já está aberto no seu Premium.',
  },
  vi: {
    eyebrow: 'Phiên bản mới',
    title: 'Phraseman mà bạn chưa từng thấy',
    intro: 'Một nửa ứng dụng đã được viết lại từ đầu. Việc học giờ rõ ràng hơn, sống động hơn và dễ chịu hơn. Đây là những điều bạn sẽ cảm nhận ngay:',
    highlightsTitle: 'Có gì thay đổi',
    highlights: [
      { icon: 'compass', title: 'Gợi ý hôm nay nên học gì', body: 'Bạn không cần tự nghĩ bắt đầu từ đâu nữa. Ứng dụng xem phần nào bạn làm tốt, phần nào còn yếu, rồi mỗi ngày gợi ý đúng thứ bạn cần.' },
      { icon: 'sparkles', title: 'Rất nhiều bài luyện mới', body: 'Đã thêm hàng nghìn cụm từ hằng ngày: công việc, nhà cửa, sức khỏe, du lịch, cảm xúc. Học được lâu — và đều là đời thực, không phải sách giáo khoa.' },
      { icon: 'chatbubbles', title: 'Đối thoại: nhắn tin theo vai', body: 'Chọn một tình huống — quán cà phê, bác sĩ, phỏng vấn — rồi trò chuyện với nhân vật ngay trong app như trong messenger. Mỗi nhân vật có cá tính riêng.' },
      { icon: 'volume-high', title: 'Giọng nói tự nhiên dễ nghe', body: 'Các cụm từ được đọc bằng giọng dễ nghe, không phải giọng máy. Chưa nghe kịp? Giảm tốc độ và lặp lại theo nhịp của bạn.' },
      { icon: 'trophy', title: 'Thi đấu với người khác', body: 'Muốn thêm cảm giác thử thách? Chơi với đối thủ thật. Ghép trận trong vài giây, có bảng xếp hạng và phần thưởng đẹp khi thắng.' },
      { icon: 'bulb', title: 'Giải thích lỗi dễ hiểu', body: 'Trả lời sai thì app sẽ bình tĩnh chỉ ra lý do. Nếu vẫn chưa rõ, một nút sẽ giải thích bằng lời thật đơn giản.' },
      { icon: 'diamond', title: 'Bộ sưu tập thẻ đẹp', body: 'Sau các buổi luyện, bạn nhận được thẻ đẹp có hình — như những phần thưởng nhỏ. Mở thẻ mới và sưu tầm rất vui.' },
    ],
    personalNoteTitle: 'Thật lòng',
    personalNoteBody: 'Tôi nói “chúng tôi”, dù phía sau tất cả chỉ có một người. Một mình làm khối lượng này nghe có vẻ khó tin. Nhưng đúng là vậy: những đêm thiếu ngủ và thời gian cá nhân để bản cập nhật này đến được với bạn. Cảm ơn bạn đã ở đây.',
    ideasTitle: 'Một năm truy cập đầy đủ — đổi lấy một ý tưởng',
    ideasBody: 'Bạn có ý tưởng giúp Phraseman tốt hơn? Hãy chia sẻ — và với một ý tưởng sống động, đáng giá, tôi sẽ mở cho bạn cả năm truy cập đầy đủ. Cài đặt → “Ý tưởng”. Thật đấy, rất đáng.',
    giftEyebrow: 'Cảm ơn vì đã ở đây từ đầu',
    giftTitle: 'Nhận 3 ngày — mở toàn bộ',
    giftBody: 'Bạn đã ở cùng Phraseman trước bản cập nhật này, và điều đó rất đáng quý. Để cảm ơn, tôi tặng bạn 3 ngày mở toàn bộ — không khóa, không giới hạn. Chỉ là quà tặng: không trừ tiền, không tự bật đăng ký. Hãy vào và cảm nhận bản cập nhật trọn vẹn.',
    giftChips: ['Mở toàn bộ', 'Không khóa', 'Không giới hạn', 'Tất cả chủ đề', 'Gợi ý', 'Giao diện tối'],
    primaryCta: 'Nhận 3 ngày',
    secondaryCta: 'Có thể để sau',
    footer: 'Đây là quà tặng. Không trừ tiền, đăng ký không tự bật.',
    announcePrimaryCta: 'Xem có gì mới',
    announceFooter: 'Cảm ơn bạn vẫn ở lại. Tất cả điều mới đã mở trong Premium của bạn.',
  },
  id: {
    eyebrow: 'Versi baru',
    title: 'Phraseman yang belum pernah kamu lihat',
    intro: 'Setengah aplikasi ditulis ulang dari awal. Sekarang belajar terasa lebih jelas, lebih hidup, dan lebih nyaman. Ini yang akan langsung terasa:',
    highlightsTitle: 'Yang berubah',
    highlights: [
      { icon: 'compass', title: 'Menyarankan apa yang dipelajari hari ini', body: 'Kamu tidak perlu bingung mulai dari mana. Aplikasi melihat apa yang sudah bagus dan apa yang masih lemah, lalu setiap hari menyarankan latihan yang tepat untukmu.' },
      { icon: 'sparkles', title: 'Banyak latihan baru', body: 'Ada ribuan frasa baru untuk keseharian: kerja, rumah, kesehatan, perjalanan, perasaan. Cukup untuk waktu lama — dan semuanya terasa nyata, bukan dari buku teks.' },
      { icon: 'chatbubbles', title: 'Dialog: chat sesuai peran', body: 'Pilih situasi — kafe, dokter, wawancara — lalu chat dengan tokohnya langsung di app, seperti di messenger. Setiap tokoh punya gaya dan karakter sendiri.' },
      { icon: 'volume-high', title: 'Suara alami yang nyaman', body: 'Frasa dibacakan oleh suara yang enak didengar, bukan robot. Kurang jelas? Perlambat dan ulangi dengan tempo yang nyaman.' },
      { icon: 'trophy', title: 'Bersaing dengan orang lain', body: 'Mau lebih seru? Main melawan lawan sungguhan. Pencocokan dalam hitungan detik, papan peringkat, dan hadiah cantik untuk kemenangan.' },
      { icon: 'bulb', title: 'Menjelaskan kesalahan dengan jelas', body: 'Jawaban salah? Aplikasi menunjukkan alasannya dengan tenang. Kalau masih belum paham, satu tombol menjelaskan dengan kata-kata paling sederhana.' },
      { icon: 'diamond', title: 'Koleksi kartu cantik', body: 'Setelah latihan, kamu mendapat kartu cantik bergambar — seperti hadiah kecil. Menyenangkan untuk dikumpulkan dan dibuka.' },
    ],
    personalNoteTitle: 'Jujur saja',
    personalNoteBody: 'Aku menulis “kami”, walau di balik semua ini hanya ada satu orang. Kalau sendirian, volume sebesar ini terdengar tidak masuk akal. Tapi memang begitu: malam tanpa tidur dan waktu pribadi agar pembaruan ini sampai kepadamu. Terima kasih sudah di sini.',
    ideasTitle: 'Akses penuh setahun — untuk satu ide',
    ideasBody: 'Punya ide untuk membuat Phraseman lebih baik? Ceritakan — dan untuk ide yang hidup dan menarik, aku akan membuka akses penuh selama setahun. Pengaturan → “Ide”. Serius, ini sepadan.',
    giftEyebrow: 'Terima kasih sudah bersama sejak awal',
    giftTitle: 'Ambil 3 hari — semua terbuka',
    giftBody: 'Kamu sudah bersama Phraseman sebelum pembaruan ini, dan itu sangat berarti. Sebagai terima kasih, aku memberimu 3 hari dengan semua terbuka — tanpa kunci dan tanpa batas. Hanya hadiah: tidak ada biaya, langganan tidak aktif. Masuk dan rasakan pembaruan ini sepenuhnya.',
    giftChips: ['Semua terbuka', 'Tanpa kunci', 'Tanpa batas', 'Semua tema', 'Petunjuk', 'Gaya gelap'],
    primaryCta: 'Ambil 3 hari saya',
    secondaryCta: 'Mungkin nanti',
    footer: 'Ini hadiah. Tidak ada biaya, langganan tidak aktif.',
    announcePrimaryCta: 'Lihat yang baru',
    announceFooter: 'Terima kasih tetap di sini. Semua yang baru sudah terbuka di Premium-mu.',
  },
  tr: {
    eyebrow: 'Yeni sürüm',
    title: 'Henüz görmediğin Phraseman',
    intro: 'Uygulamanın yarısı baştan yazıldı. Öğrenmek artık daha anlaşılır, daha canlı ve daha keyifli. İlk fark edeceğin şeyler:',
    highlightsTitle: 'Neler değişti',
    highlights: [
      { icon: 'compass', title: 'Bugün ne çalışacağını söyler', body: 'Nereden başlayacağını düşünmene gerek yok. Uygulama nelerde iyi olduğunu, nelerin aksadığını görür ve her gün tam ihtiyacın olan çalışmayı önerir.' },
      { icon: 'sparkles', title: 'Çok sayıda yeni çalışma', body: 'Günlük hayat için binlerce yeni ifade eklendi: iş, ev, sağlık, seyahat, duygular. Uzun süre yeter — hepsi gerçek hayat gibi, ders kitabı gibi değil.' },
      { icon: 'chatbubbles', title: 'Diyaloglar: role göre yazışma', body: 'Bir durum seç — kafe, doktor, mülakat — ve karakteriyle uygulamanın içinde mesajlaş. Her karakter kendi tarzıyla, kendi havasıyla cevap verir.' },
      { icon: 'volume-high', title: 'Hoş ve doğal ses', body: 'İfadeleri robot değil, hoş bir ses okur. Duyamadın mı? Yavaşlat ve kendi temponda tekrar et.' },
      { icon: 'trophy', title: 'Başkalarıyla yarış', body: 'Biraz heyecan istiyorsan gerçek bir rakibe karşı oyna. Saniyeler içinde eşleşme, lider tablosu ve galibiyetler için güzel ödüller.' },
      { icon: 'bulb', title: 'Hataları net açıklar', body: 'Yanlış cevap verdiğinde uygulama sakince nedenini gösterir. Hâlâ net değilse, tek tuşla çok basit sözlerle açıklar.' },
      { icon: 'diamond', title: 'Güzel kart koleksiyonu', body: 'Çalışmalardan sonra resimli güzel kartlar düşer — küçük ödüller gibi. Toplaması ve yenilerini açması keyifli.' },
    ],
    personalNoteTitle: 'Dürüstçe',
    personalNoteBody: '“Biz” diyorum, ama tüm bunların arkasında tek bir kişi var. Tek başına bu hacim pek inandırıcı gelmiyor. Ama öyle: uykusuz geceler ve kişisel zaman, bu güncelleme sana ulaşsın diye. Burada olduğun için teşekkürler.',
    ideasTitle: 'Bir fikir karşılığında bir yıl tam erişim',
    ideasBody: 'Phraseman’i daha iyi yapacak bir fikrin var mı? Anlat — canlı ve özgün bir fikir için sana bir yıl tam erişim açarım. Ayarlar → “Fikirler”. Ciddiyim, buna değer.',
    giftEyebrow: 'En başından beri burada olduğun için teşekkürler',
    giftTitle: '3 gün al — her şey açık',
    giftBody: 'Bu güncellemeden önce de Phraseman’leydin ve bu çok değerli. Teşekkür olarak sana 3 gün boyunca her şeyin açık olduğu erişim veriyorum — kilit yok, sınır yok. Sadece hediye: ücret alınmaz, abonelik başlamaz. Gir ve yenilenmiş uygulamayı tam gücüyle hisset.',
    giftChips: ['Her şey açık', 'Kilit yok', 'Sınır yok', 'Tüm temalar', 'İpuçları', 'Koyu stiller'],
    primaryCta: '3 günümü al',
    secondaryCta: 'Belki sonra',
    footer: 'Bu bir hediye. Ücret alınmaz, abonelik başlamaz.',
    announcePrimaryCta: 'Yeniliklere bak',
    announceFooter: 'Burada kalmaya devam ettiğin için teşekkürler. Tüm yenilikler Premium’unda zaten açık.',
  },
  pl: {
    eyebrow: 'Nowa wersja',
    title: 'Phraseman, którego jeszcze nie widziałeś',
    intro: 'Połowa aplikacji została przepisana od nowa. Nauka jest teraz jaśniejsza, żywsza i przyjemniejsza. To poczujesz od razu:',
    highlightsTitle: 'Co się zmieniło',
    highlights: [
      { icon: 'compass', title: 'Podpowie, czego uczyć się dziś', body: 'Nie musisz już myśleć, od czego zacząć. Aplikacja widzi, co wychodzi, co jeszcze kuleje, i codziennie proponuje dokładnie to, czego potrzebujesz.' },
      { icon: 'sparkles', title: 'Mnóstwo nowych ćwiczeń', body: 'Dodano tysiące nowych fraz na co dzień: praca, dom, zdrowie, podróże, emocje. Wystarczy na długo — i wszystko brzmi jak prawdziwe życie, nie podręcznik.' },
      { icon: 'chatbubbles', title: 'Dialogi: rozmowa w rolach', body: 'Wybierasz sytuację — kawiarnia, lekarz, rozmowa kwalifikacyjna — i piszesz z jej bohaterem w aplikacji jak w komunikatorze. Każdy odpowiada po swojemu.' },
      { icon: 'volume-high', title: 'Przyjemny naturalny głos', body: 'Frazy czyta przyjemny głos, nie robot. Nie zdążyłeś usłyszeć? Zwolnij i powtórz w wygodnym tempie.' },
      { icon: 'trophy', title: 'Rywalizuj z innymi', body: 'Chcesz trochę emocji? Zagraj z prawdziwym przeciwnikiem. Dobór w kilka sekund, tabela najlepszych i ładne nagrody za wygrane.' },
      { icon: 'bulb', title: 'Jasno tłumaczy błędy', body: 'Odpowiesz źle — aplikacja spokojnie pokaże dlaczego. Jeśli nadal coś jest niejasne, jeden przycisk wyjaśni bardzo prostymi słowami.' },
      { icon: 'diamond', title: 'Kolekcja ładnych kart', body: 'Za ćwiczenia wypadają ładne karty z obrazkami — małe nagrody. Miło je zbierać i otwierać nowe.' },
    ],
    personalNoteTitle: 'Szczerze',
    personalNoteBody: 'Piszę „my”, chociaż za tym wszystkim stoi jedna osoba. Samemu taka skala brzmi niewiarygodnie. Ale tak właśnie jest: nieprzespane noce i prywatny czas, żeby ta aktualizacja dotarła do ciebie. Dzięki, że tu jesteś.',
    ideasTitle: 'Rok pełnego dostępu — za pomysł',
    ideasBody: 'Masz pomysł, jak ulepszyć Phraseman? Podziel się — za żywy, ciekawy pomysł otworzę ci cały rok pełnego dostępu. Ustawienia → „Pomysły”. Serio, warto.',
    giftEyebrow: 'Dzięki, że jesteś od początku',
    giftTitle: 'Weź 3 dni — wszystko otwarte',
    giftBody: 'Byłeś z Phrasemanem jeszcze przed tą aktualizacją i to naprawdę dużo znaczy. W podziękowaniu daję ci 3 dni, gdy wszystko jest otwarte — bez kłódek i bez limitów. Po prostu prezent: nic nie zostanie pobrane, subskrypcja się nie włączy. Wejdź i poczuj odnowioną aplikację w pełnej sile.',
    giftChips: ['Wszystko otwarte', 'Bez kłódek', 'Bez limitów', 'Wszystkie motywy', 'Podpowiedzi', 'Ciemne style'],
    primaryCta: 'Odbierz 3 dni',
    secondaryCta: 'Może później',
    footer: 'To prezent. Nic nie zostanie pobrane, subskrypcja się nie włączy.',
    announcePrimaryCta: 'Zobacz nowości',
    announceFooter: 'Dzięki, że zostajesz. Wszystko nowe jest już otwarte w twoim Premium.',
  },
};

function LoyaltyGiftModal({ visible, variant = 'gift', onPrimaryPress, onSecondaryPress, onIdeasPress }: Props) {
  const { lang } = useLang();
  const { theme, themeMode } = useTheme();
  const copy = COPY[lang as keyof typeof COPY] ?? COPY.ru;
  // Премиум/VIP видят ТОЛЬКО текст обновления: без блока подарка и без кнопки получения.
  const isGift = variant === 'gift';

  // Воронка: показ модала — разные события для подарка и для анонса (премиум/VIP).
  useEffect(() => {
    if (!visible) return;
    void import('../app/analytics').then(({ trackEvent }) =>
      trackEvent(isGift ? 'loyalty_gift_offer_shown' : 'loyalty_update_announce_shown', {}),
    );
  }, [visible, isGift]);

  const accent = rewardModalAccentColor(themeMode, theme);
  const border = rewardModalPanelBorder(themeMode, theme);
  const softSurface = rewardModalSoftSurface(themeMode, theme);
  const textPrimary = '#FFFFFF';
  const textSecondary = 'rgba(255,255,255,0.78)';
  const textTertiary = 'rgba(255,255,255,0.62)';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onSecondaryPress ?? onPrimaryPress}
    >
      <View style={styles.overlay}>
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
        <SafeAreaView style={styles.safe}>
          <View style={[styles.panel, { borderColor: border }]}>
            <RewardModalPanelBackdrop themeMode={themeMode} intensity="strong" opacity={0.72} />
            <LinearGradient
              pointerEvents="none"
              colors={rewardModalPanelColors(themeMode, theme)}
              style={StyleSheet.absoluteFill}
            />
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={[styles.iconWrap, { backgroundColor: softSurface, borderColor: border }]}>
                <Ionicons name="rocket" size={28} color={accent} />
              </View>
              <Text style={[styles.eyebrow, { color: accent }]}>{copy.eyebrow}</Text>
              <Text style={[styles.title, { color: textPrimary }]}>{copy.title}</Text>
              <Text style={[styles.body, { color: textSecondary }]}>{copy.intro}</Text>

              <Text style={[styles.sectionLabel, { color: accent }]}>{copy.highlightsTitle}</Text>
              <View style={styles.highlights}>
                {copy.highlights.map((h) => (
                  <View key={h.title} style={[styles.highlightRow, { borderColor: border }]}>
                    <View style={[styles.highlightIcon, { backgroundColor: softSurface, borderColor: border }]}>
                      <Ionicons name={h.icon} size={18} color={accent} />
                    </View>
                    <View style={styles.highlightTextWrap}>
                      <Text style={[styles.highlightTitle, { color: textPrimary }]}>{h.title}</Text>
                      <Text style={[styles.highlightBody, { color: textTertiary }]}>{h.body}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={[styles.noteCard, { borderColor: border, backgroundColor: softSurface }]}>
                <View style={styles.noteHeader}>
                  <Ionicons name="heart" size={16} color={accent} />
                  <Text style={[styles.noteTitle, { color: textPrimary }]}>{copy.personalNoteTitle}</Text>
                </View>
                <Text style={[styles.noteBody, { color: textSecondary }]}>{copy.personalNoteBody}</Text>
              </View>

              <Pressable
                testID="loyalty-ideas-block"
                accessibilityRole="button"
                onPress={() => {
                  void import('../app/analytics').then(({ trackEvent }) => trackEvent('loyalty_ideas_block_tapped', {}));
                  onIdeasPress?.();
                }}
                style={[styles.ideasCard, { borderColor: accent, backgroundColor: softSurface }]}
              >
                <View style={styles.ideasHeader}>
                  <Ionicons name="bulb" size={17} color={accent} />
                  <Text style={[styles.ideasTitle, { color: textPrimary }]}>{copy.ideasTitle}</Text>
                </View>
                <Text style={[styles.ideasBody, { color: textSecondary }]}>{copy.ideasBody}</Text>
                <View style={styles.ideasArrowRow}>
                  <Ionicons name="arrow-forward" size={15} color={accent} />
                </View>
              </Pressable>

              {isGift ? (
                <View style={[styles.giftCard, { borderColor: accent, backgroundColor: softSurface }]}>
                  <Text style={[styles.giftEyebrow, { color: accent }]}>{copy.giftEyebrow}</Text>
                  <Text style={[styles.giftTitle, { color: textPrimary }]}>{copy.giftTitle}</Text>
                  <Text style={[styles.giftBody, { color: textSecondary }]}>{copy.giftBody}</Text>
                  <View style={styles.chips}>
                    {copy.giftChips.map((label) => (
                      <View key={label} style={[styles.chip, { backgroundColor: softSurface, borderColor: border }]}>
                        <Ionicons name="lock-open-outline" size={15} color={accent} />
                        <Text style={[styles.chipText, { color: textPrimary }]}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.footerBar, { borderTopColor: border }]}>
              <Pressable
                testID={isGift ? 'loyalty-gift-primary' : 'loyalty-announce-primary'}
                accessibilityRole="button"
                onPress={() => {
                  void import('../app/analytics').then(({ trackEvent }) =>
                    trackEvent(isGift ? 'loyalty_gift_offer_cta' : 'loyalty_update_announce_cta', {}),
                  );
                  onPrimaryPress();
                }}
                style={styles.primaryButton}
              >
                <LinearGradient
                  colors={rewardModalPrimaryButtonColors(themeMode)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryGradient}
                >
                  <Ionicons
                    name={isGift ? 'gift' : 'sparkles'}
                    size={19}
                    color={rewardModalPrimaryButtonText(themeMode)}
                  />
                  <Text style={[styles.primaryText, { color: rewardModalPrimaryButtonText(themeMode) }]}>
                    {isGift ? copy.primaryCta : copy.announcePrimaryCta}
                  </Text>
                </LinearGradient>
              </Pressable>
              {isGift ? (
                <Pressable
                  testID="loyalty-gift-secondary"
                  accessibilityRole="button"
                  onPress={() => {
                    void import('../app/analytics').then(({ trackEvent }) => trackEvent('loyalty_gift_offer_dismiss', {}));
                    onSecondaryPress?.();
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={[styles.secondaryText, { color: textSecondary }]}>{copy.secondaryCta}</Text>
                </Pressable>
              ) : null}
              <Text style={[styles.footer, { color: textTertiary }]}>
                {isGift ? copy.footer : copy.announceFooter}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default memo(LoyaltyGiftModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  safe: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  panel: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '92%',
    alignSelf: 'center',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    padding: 22,
    gap: 12,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: 0,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  highlights: {
    gap: 10,
  },
  highlightRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  highlightIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTextWrap: {
    flex: 1,
    gap: 3,
  },
  highlightTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  highlightBody: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: 0,
  },
  noteCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  noteBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: 0,
  },
  ideasCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 8,
  },
  ideasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ideasTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  ideasBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: 0,
  },
  ideasArrowRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  giftCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 10,
  },
  giftEyebrow: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  giftTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  giftBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: 0,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
  footerBar: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    overflow: 'hidden',
  },
  primaryGradient: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18,
  },
  primaryText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: 0,
  },
  footer: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
});
