import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import CompassDepthSurface from '../components/CompassDepthSurface';
import ScreenGradient from '../components/ScreenGradient';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { STORE_URL } from './config';
import { buildCloudReferralInviteShare } from './referral_invite_share';
import { updateMultipleTaskProgress } from './daily_tasks';
import { useEffectivePlatformOS } from './platform_ui_preview';
import type { Lang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import BouncyScrollView from '../components/BouncyScrollView';
import { useReferralRouletteEnabled } from './referral_roulette_flag';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';

const MONTHLY_LIMIT = 30;

const COPY = {
  ru: {
    title: 'Пригласить друга',
    heroTitle: 'Зови друга —\nполучи прокрут рулетки',
    heroSub: 'За друга, который введёт твой код и закончит первый урок, тебе начислится 1 прокрут. Приз — Plus от 1 дня до 365 дней.',
    stepsTitle: 'Как это работает',
    step1Title: 'Отправь свою ссылку',
    step1Body: 'Поделись приглашением в любом мессенджере. Друг сможет перейти по ссылке и установить Phraseman.',
    step2Title: 'Друг пройдёт первый урок',
    step2Body: 'Ему нужно установить Phraseman по твоей ссылке и закончить урок 1 минимум на бронзу.',
    step2TitleIos: 'Друг вводит ваш код',
    step2BodyIos:
      'Во вкладке «Друзья» он вводит ваш персональный код. Дальше — закончить урок 1 минимум на бронзу.',
    step3Title: 'Крути рулетку',
    step3Body: 'После первого урока друга тебе автоматически начислится 1 прокрут. В рулетке можно выиграть Plus от 1 дня до 365 дней.',
    smallPrint: `Один прокрут начисляется один раз за каждого нового друга. В месяц учитывается не больше ${MONTHLY_LIMIT} приглашений.`,
    cta: 'Отправить приглашение',
    preparing: 'Готовим приглашение…',
    unavailable: 'Этот раздел временно недоступен.',
    needAuthTitle: 'Нужен вход',
    needAuth: 'Войди через Google или Apple, чтобы ссылка учитывала приглашение и тебе начислился прокрут.',
  },
  uk: {
    title: 'Запросити друга',
    heroTitle: 'Клич друга —\nотримай прокрут рулетки',
    heroSub: 'За друга, який введе твій код і закінчить перший урок, ти отримаєш 1 прокрут. Приз — Plus від 1 до 365 днів.',
    stepsTitle: 'Як це працює',
    step1Title: 'Надішли своє посилання',
    step1Body: 'Поділись запрошенням у будь-якому месенджері. Друг зможе перейти за посиланням і встановити Phraseman.',
    step2Title: 'Друг пройде перший урок',
    step2Body: 'Йому треба встановити Phraseman за твоїм посиланням і закінчити урок 1 щонайменше на бронзу.',
    step2TitleIos: 'Друг вводить твій код',
    step2BodyIos:
      'У вкладці «Друзі» він вводить твій персональний код. Далі — закінчити урок 1 щонайменше на бронзу.',
    step3Title: 'Крути рулетку',
    step3Body: 'Після першого уроку друга тобі автоматично нарахується 1 прокрут. У рулетці можна виграти Plus від 1 до 365 днів.',
    smallPrint: `Один прокрут нараховується один раз за кожного нового друга. На місяць враховується не більше ${MONTHLY_LIMIT} запрошень.`,
    cta: 'Надіслати запрошення',
    preparing: 'Готуємо запрошення…',
    unavailable: 'Цей розділ тимчасово недоступний.',
    needAuthTitle: 'Потрібен вхід',
    needAuth: 'Увійди через Google або Apple, щоб посилання враховувало запрошення і тобі нарахувався прокрут.',
  },
  es: {
    title: 'Invitar a un amigo',
    heroTitle: 'Invita a un amigo —\nconsigue 1 giro',
    heroSub:
      'Cuando use tu código y termine la primera lección, recibirás 1 giro. El premio es Plus de 1 a 365 días.',
    stepsTitle: 'Cómo funciona',
    step1Title: 'Envía tu enlace',
    step1Body:
      'Comparte la invitación por el chat que prefieras. Tu amigo abre el enlace e instala Phraseman.',
    step2Title: 'Tu amigo completa la lección 1',
    step2Body:
      'Debe instalar Phraseman desde tu enlace y terminar la lección 1 con al menos bronce.',
    step2TitleIos: 'Tu amigo introduce tu código',
    step2BodyIos:
      'En «Amigos» puede introducir tu código personal. Luego debe terminar la lección 1 con al menos bronce.',
    step3Title: 'Gira la ruleta',
    step3Body: 'El giro se acredita automáticamente al completar tu amigo la primera lección. Puedes ganar de 1 a 365 días de Plus.',
    smallPrint: `Se acredita 1 giro una vez por cada amigo nuevo. Se cuentan como máximo ${MONTHLY_LIMIT} invitaciones al mes.`,
    cta: 'Enviar invitación',
    preparing: 'Preparando la invitación…',
    unavailable: 'Esta sección no está disponible temporalmente.',
    needAuthTitle: 'Inicia sesión',
    needAuth:
      'Entra con Google o Apple para que el enlace registre la invitación y recibas el giro.',
  },
  'pt-BR': {
    title: 'Convidar amigo',
    heroTitle: 'Chame um amigo —\nganhe 1 giro',
    heroSub: 'Quando ele usar seu código e concluir a primeira lição, você recebe 1 giro. O prêmio é Plus de 1 a 365 dias.',
    stepsTitle: 'Como funciona',
    step1Title: 'Envie seu link',
    step1Body: 'Compartilhe o convite em qualquer mensageiro. Seu amigo pode abrir o link e instalar o Phraseman.',
    step2Title: 'Seu amigo conclui a primeira lição',
    step2Body: 'Ele precisa instalar o Phraseman pelo seu link e terminar a lição 1 com pelo menos bronze.',
    step2TitleIos: 'Seu amigo digita seu código',
    step2BodyIos: 'Na aba "Amigos", ele digita seu código pessoal. Depois, termina a lição 1 com pelo menos bronze.',
    step3Title: 'Gire a roleta',
    step3Body: 'O giro é creditado automaticamente quando seu amigo conclui a primeira lição. Você pode ganhar de 1 a 365 dias de Plus.',
    smallPrint: `É creditado 1 giro uma vez por cada amigo novo. No máximo ${MONTHLY_LIMIT} convites contam por mês.`,
    cta: 'Enviar convite',
    preparing: 'Preparando o convite…',
    unavailable: 'Esta seção está temporariamente indisponível.',
    needAuthTitle: 'Login necessário',
    needAuth: 'Entre com Google ou Apple para que o link registre o convite e você receba o giro.',
  },
  vi: {
    title: 'Mời bạn bè',
    heroTitle: 'Mời bạn —\nnhận 1 lượt quay',
    heroSub: 'Khi bạn bè nhập mã và hoàn thành bài học đầu tiên, bạn nhận 1 lượt quay. Giải Plus từ 1 đến 365 ngày.',
    stepsTitle: 'Cách hoạt động',
    step1Title: 'Gửi liên kết của bạn',
    step1Body: 'Chia sẻ lời mời qua bất kỳ ứng dụng nhắn tin nào. Bạn của bạn có thể mở liên kết và cài Phraseman.',
    step2Title: 'Bạn của bạn hoàn thành bài 1',
    step2Body: 'Người đó cần cài Phraseman từ liên kết của bạn và hoàn thành bài 1 ít nhất mức đồng.',
    step2TitleIos: 'Bạn của bạn nhập mã',
    step2BodyIos: 'Trong tab "Bạn bè", người đó nhập mã cá nhân của bạn. Sau đó hoàn thành bài 1 ít nhất mức đồng.',
    step3Title: 'Quay vòng quay',
    step3Body: 'Lượt quay tự động được cộng khi bạn bè hoàn thành bài học đầu tiên. Bạn có thể thắng từ 1 đến 365 ngày Plus.',
    smallPrint: `Mỗi bạn mới chỉ cộng 1 lượt quay một lần. Tối đa ${MONTHLY_LIMIT} lời mời được tính mỗi tháng.`,
    cta: 'Gửi lời mời',
    preparing: 'Đang chuẩn bị lời mời…',
    unavailable: 'Mục này tạm thời không khả dụng.',
    needAuthTitle: 'Cần đăng nhập',
    needAuth: 'Đăng nhập bằng Google hoặc Apple để liên kết ghi nhận lời mời và bạn nhận lượt quay.',
  },
  'id': {
    title: 'Undang teman',
    heroTitle: 'Ajak teman —\ndapat 1 putaran',
    heroSub: 'Saat teman memasukkan kodemu dan menyelesaikan pelajaran pertama, kamu mendapat 1 putaran. Hadiah Plus 1–365 hari.',
    stepsTitle: 'Cara kerjanya',
    step1Title: 'Kirim tautanmu',
    step1Body: 'Bagikan undangan lewat aplikasi pesan apa pun. Temanmu bisa membuka tautan dan memasang Phraseman.',
    step2Title: 'Teman menyelesaikan pelajaran pertama',
    step2Body: 'Ia perlu memasang Phraseman dari tautanmu dan menyelesaikan pelajaran 1 minimal perunggu.',
    step2TitleIos: 'Teman memasukkan kodemu',
    step2BodyIos: 'Di tab "Teman", ia memasukkan kode pribadimu. Setelah itu menyelesaikan pelajaran 1 minimal perunggu.',
    step3Title: 'Putar roulette',
    step3Body: 'Putaran otomatis masuk saat teman menyelesaikan pelajaran pertama. Kamu bisa menang 1–365 hari Plus.',
    smallPrint: `Setiap teman baru memberi 1 putaran satu kali. Maksimal ${MONTHLY_LIMIT} undangan dihitung per bulan.`,
    cta: 'Kirim undangan',
    preparing: 'Menyiapkan undangan…',
    unavailable: 'Bagian ini sementara tidak tersedia.',
    needAuthTitle: 'Perlu masuk',
    needAuth: 'Masuk dengan Google atau Apple agar tautan mencatat undangan dan kamu mendapat putaran.',
  },
  tr: {
    title: 'Arkadaş davet et',
    heroTitle: 'Arkadaşını çağır —\n1 çevirme kazan',
    heroSub: 'Arkadaşın kodunu girip ilk dersi bitirdiğinde 1 çevirme kazanırsın. Ödül 1–365 gün Plus.',
    stepsTitle: 'Nasıl çalışır',
    step1Title: 'Bağlantını gönder',
    step1Body: 'Davetini herhangi bir mesajlaşma uygulamasında paylaş. Arkadaşın bağlantıyı açıp Phraseman’i kurabilir.',
    step2Title: 'Arkadaşın ilk dersi bitirir',
    step2Body: 'Phraseman’i senin bağlantından kurup 1. dersi en az bronz seviyede bitirmesi gerekir.',
    step2TitleIos: 'Arkadaşın kodunu girer',
    step2BodyIos: '"Arkadaşlar" sekmesinde kişisel kodunu girer. Sonra 1. dersi en az bronz seviyede bitirir.',
    step3Title: 'Ruleti çevir',
    step3Body: 'Arkadaşın ilk dersi bitirdiğinde çevirme otomatik yüklenir. 1–365 gün Plus kazanabilirsin.',
    smallPrint: `Her yeni arkadaş bir kez 1 çevirme kazandırır. Ayda en fazla ${MONTHLY_LIMIT} davet sayılır.`,
    cta: 'Davet gönder',
    preparing: 'Davet hazırlanıyor…',
    unavailable: 'Bu bölüm geçici olarak kullanılamıyor.',
    needAuthTitle: 'Giriş gerekli',
    needAuth: 'Bağlantının daveti sayması ve çevirmenin gelmesi için Google veya Apple ile giriş yap.',
  },
  pl: {
    title: 'Zaproś znajomego',
    heroTitle: 'Zaproś znajomego —\nzdobądź 1 los',
    heroSub: 'Gdy znajomy wpisze twój kod i ukończy pierwszą lekcję, dostaniesz 1 los. Nagroda to Plus od 1 do 365 dni.',
    stepsTitle: 'Jak to działa',
    step1Title: 'Wyślij swój link',
    step1Body: 'Udostępnij zaproszenie w dowolnym komunikatorze. Znajomy otworzy link i zainstaluje Phraseman.',
    step2Title: 'Znajomy kończy pierwszą lekcję',
    step2Body: 'Musi zainstalować Phraseman z twojego linku i ukończyć lekcję 1 co najmniej na brąz.',
    step2TitleIos: 'Znajomy wpisuje twój kod',
    step2BodyIos: 'W zakładce "Znajomi" wpisuje twój osobisty kod. Potem kończy lekcję 1 co najmniej na brąz.',
    step3Title: 'Zakręć ruletką',
    step3Body: 'Los zostanie dodany automatycznie, gdy znajomy ukończy pierwszą lekcję. Możesz wygrać od 1 do 365 dni Plus.',
    smallPrint: `Każdy nowy znajomy daje 1 los tylko raz. Miesięcznie liczy się maksymalnie ${MONTHLY_LIMIT} zaproszeń.`,
    cta: 'Wyślij zaproszenie',
    preparing: 'Przygotowujemy zaproszenie…',
    unavailable: 'Sekcja jest chwilowo niedostępna.',
    needAuthTitle: 'Wymagane logowanie',
    needAuth: 'Zaloguj się przez Google lub Apple, aby link zapisał zaproszenie i dodał los.',
  },
};

const OFFLINE_SHARE_BODIES_RU = [
  `Хватит смотреть мемы, пошли учить английский в Phraseman! Со мной ты хотя бы поймёшь, о чём шутят в оригинале. 🔥 ${STORE_URL}`,
  `Нашёл Phraseman — это как фитнес для мозга, только без одышки. Залетай, будем тупить вместе (но на английском)! 🧠🚀 ${STORE_URL}`,
  `Секретный ингредиент моего английского — Phraseman. Дарю ссылку, пока я не стал слишком умным для этой компании. 😉 ${STORE_URL}`,
  `Хватит гуглить перевод мемов! 😂 Качай Phraseman и начни понимать английский как родной. Погнали со мной! ${STORE_URL}`,
  `Нашёл идеальный способ учить английский без боли и страданий — Phraseman. 🚀 Присоединяйся, будем качаться вместе! ${STORE_URL}`,
  `Эй, не хочешь прокачать свой English? 🇬🇧 В Phraseman это реально весело. Залетай по ссылке! ${STORE_URL}`,
  `Если даже я учу английский в Phraseman, то у тебя вообще нет оправданий. Качай и погнали! 😜 ${STORE_URL}`,
  `Хочешь зарабатывать больше? Учи английский! Phraseman — самый кайфовый способ это сделать. Проверено! 📈✨ ${STORE_URL}`,
];

const OFFLINE_SHARE_BODIES_UK = [
  `Досить дивитися меми, ходімо вчити англійську у Phraseman! Зі мною ти хоча б зрозумієш, про що жартують в оригіналі. 🔥 ${STORE_URL}`,
  `Знайшов Phraseman — це як фітнес для мозку, тільки без задишки. Залітай, будемо тупити разом (але англійською)! 🧠🚀 ${STORE_URL}`,
  `Секретний інгредієнт моєї англійської — Phraseman. Дарую посилання, поки я не став занадто розумним для цієї компанії. 😉 ${STORE_URL}`,
  `Досить гуглити переклад мемів! 😂 Качай Phraseman і почни розуміти англійську як рідну. Погнали зі мною! ${STORE_URL}`,
  `Знайшов ідеальний спосіб вчити англійську без болю та страждань — Phraseman. 🚀 Приєднуйся, будемо качатися разом! ${STORE_URL}`,
  `Гей, не хочеш прокачати свій English? 🇬🇧 У Phraseman це реально весело. Залітай за посиланням! ${STORE_URL}`,
  `Якщо навіть я вчу англійську у Phraseman, то в тебе взагалі немає виправдань. Качай і погнали! 😜 ${STORE_URL}`,
  `Хочеш заробляти більше? Вчи англійську! Phraseman — найкайфовіший спосіб це зробити. Перевірено! 📈✨ ${STORE_URL}`,
];

/** Не считаем задание «Пригласи друга», если пользователь закрыл системный Share без отправки (iOS). */
function shouldCountInviteShare(result: { action?: string } | undefined): boolean {
  if (result == null) return true;
  return result.action !== Share.dismissedAction;
}

const OFFLINE_SHARE_BODIES_ES = [
  `Deja los memes un rato y ven a estudiar inglés con Phraseman. Conmigo al menos entenderás por qué ríen en el original 🔥 ${STORE_URL}`,
  `Probé Phraseman: entrenamiento para el cerebro, sin drama. ¡Únete y practicamos en inglés! 🧠🚀 ${STORE_URL}`,
  `Mi secreto para el inglés: Phraseman. Te paso el enlace antes de que me ponga demasiado listo 😉 ${STORE_URL}`,
  `Ya basta de buscar en Google la traducción de los memes 😂 Instala Phraseman y empieza a entender inglés de verdad. ¡Vamos! ${STORE_URL}`,
  `Encontré forma de estudiar inglés sin sufrir: Phraseman. 🚀 Únete y subimos de nivel juntos ${STORE_URL}`,
  `¿Te animas a mejorar tu inglés? 🇬🇧 En Phraseman es muy entretenido. Entra por el enlace ${STORE_URL}`,
  `Si hasta yo estudio aquí, tú no tienes excusa. Instala Phraseman ya 😜 ${STORE_URL}`,
  `¿Más oportunidades laborales? Aprende inglés. Phraseman funciona de verdad 📈✨ ${STORE_URL}`,
];

const OFFLINE_SHARE_BODIES_PT_BR = [
  `Deixe os memes por um minuto e venha estudar inglês no Phraseman. Comigo você pelo menos entende a piada no original 🔥 ${STORE_URL}`,
  `Achei o Phraseman: treino para o cérebro, sem sofrimento. Entra e vamos praticar inglês juntos! 🧠🚀 ${STORE_URL}`,
  `Meu segredo para o inglês é o Phraseman. Estou mandando o link antes de ficar esperto demais 😉 ${STORE_URL}`,
  `Chega de procurar tradução de meme 😂 Instale o Phraseman e comece a entender inglês de verdade. Bora! ${STORE_URL}`,
];

const OFFLINE_SHARE_BODIES_VI = [
  `Tạm rời meme một chút và học tiếng Anh với Phraseman nhé. Ít nhất bạn sẽ hiểu trò đùa trong bản gốc 🔥 ${STORE_URL}`,
  `Mình tìm thấy Phraseman: luyện não mà không căng thẳng. Vào học tiếng Anh cùng mình nhé! 🧠🚀 ${STORE_URL}`,
  `Bí quyết tiếng Anh của mình là Phraseman. Gửi bạn liên kết trước khi mình thông minh quá mức 😉 ${STORE_URL}`,
  `Đừng tra bản dịch meme mãi nữa 😂 Cài Phraseman và bắt đầu hiểu tiếng Anh thật sự. Đi thôi! ${STORE_URL}`,
];

const OFFLINE_SHARE_BODIES_ID = [
  `Berhenti sebentar dari meme dan belajar bahasa Inggris di Phraseman. Bareng aku, kamu akan paham lelucon aslinya 🔥 ${STORE_URL}`,
  `Aku menemukan Phraseman: latihan otak tanpa drama. Gabung, kita latihan bahasa Inggris bareng! 🧠🚀 ${STORE_URL}`,
  `Rahasia bahasa Inggrisku adalah Phraseman. Ini tautannya sebelum aku jadi terlalu pintar 😉 ${STORE_URL}`,
  `Cukup cari terjemahan meme terus 😂 Pasang Phraseman dan mulai pahami bahasa Inggris sungguhan. Ayo! ${STORE_URL}`,
];

const OFFLINE_SHARE_BODIES_TR = [
  `Mizahlara biraz ara verip Phraseman'de İngilizce çalışmaya gel. En azından şakayı orijinalinden anlayacaksın 🔥 ${STORE_URL}`,
  `Phraseman'i buldum: stres yapmadan beyin antrenmanı. Gel, İngilizceyi birlikte çalışalım! 🧠🚀 ${STORE_URL}`,
  `İngilizce sırrım Phraseman. Çok fazla akıllanmadan linki gönderiyorum 😉 ${STORE_URL}`,
  `Mizah çevirisi aramayı bırak 😂 Phraseman'i kur ve İngilizceyi gerçekten anlamaya başla. Hadi! ${STORE_URL}`,
];

const OFFLINE_SHARE_BODIES_PL = [
  `Zostaw na chwilę memy i chodź uczyć się angielskiego w Phraseman. Przynajmniej zrozumiesz żart w oryginale 🔥 ${STORE_URL}`,
  `Znalazłem Phraseman: trening dla mózgu bez dramatu. Dołącz i ćwiczmy angielski razem! 🧠🚀 ${STORE_URL}`,
  `Mój sekret do angielskiego to Phraseman. Wysyłam link, zanim zrobię się zbyt mądry 😉 ${STORE_URL}`,
  `Koniec z ciągłym szukaniem tłumaczeń memów 😂 Zainstaluj Phraseman i zacznij naprawdę rozumieć angielski. Lecimy! ${STORE_URL}`,
];

const OFFLINE_SHARE_BODIES_BY_LANG: Record<Lang, readonly string[]> = {
  ru: OFFLINE_SHARE_BODIES_RU,
  uk: OFFLINE_SHARE_BODIES_UK,
  es: OFFLINE_SHARE_BODIES_ES,
  'pt-BR': OFFLINE_SHARE_BODIES_PT_BR,
  vi: OFFLINE_SHARE_BODIES_VI,
  id: OFFLINE_SHARE_BODIES_ID,
  tr: OFFLINE_SHARE_BODIES_TR,
  pl: OFFLINE_SHARE_BODIES_PL,
};

export default function SettingsInviteFriend() {
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = false;

  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const rouletteOn = useReferralRouletteEnabled();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const bottomPad =
    Math.max(bottomInset, effectiveOs === 'ios' ? 10 : 28) + 8;
  const copyLang = lang as Lang;
  const tx = COPY[copyLang] ?? COPY.ru;

  const [busy, setBusy] = useState(false);
  const inviteAccountKey = accountScopeKey(captureAccountGeneration());

  const onSendInvite = useCallback(async () => {
    if (!rouletteOn || busy) return;
    const requestToken = captureAccountGeneration();
    const requestIsCurrent = () => accountScopeKey(requestToken) === inviteAccountKey
      && isCurrentAccountGeneration(requestToken);
    if (!requestIsCurrent()) return;
    hapticTap();
    setBusy(true);
    try {
      // Главное: шарим персональную инвайт-ссылку с реф-кодом — на Android она несёт код через
      // Install Referrer (друг попадает в рефералы автоматически), на iOS друг вводит код вручную.
      // Тот же билдер, что и на экране «Друзья» (buildCloudReferralInviteShare).
      let name = 'User';
      try {
        name = (await AsyncStorage.getItem('profile_name'))?.trim() || 'User';
      } catch { /* имя — только сид для кода, не критично */ }
      if (!requestIsCurrent()) return;
      const cloud = await buildCloudReferralInviteShare({ lang: copyLang, userName: name }).catch(() => null);
      if (!requestIsCurrent()) return;

      let r: { action?: string } | undefined;
      if (cloud?.message) {
        r = await Share.share({ message: cloud.message });
      } else {
        // Фолбэк — только если кода нет (не вошёл через Google/Apple или нет сети):
        // обычная ссылка на стор без атрибуции, чтобы кнопка хоть что-то делала.
        const pool = OFFLINE_SHARE_BODIES_BY_LANG[copyLang] ?? OFFLINE_SHARE_BODIES_BY_LANG.ru;
        const msg = pool[Math.floor(Math.random() * pool.length)];
        r = await Share.share({ message: msg });
      }

      if (!requestIsCurrent()) return;
      if (shouldCountInviteShare(r)) {
        void updateMultipleTaskProgress(
          [{ type: 'invite_friend', increment: 1 }],
          { studyTarget },
        ).catch(() => {});
      }
    } catch {
    } finally {
      setBusy(false);
    }
  }, [busy, copyLang, inviteAccountKey, rouletteOn, studyTarget]);

  const isIos = effectiveOs === 'ios';
  const scrollBottomPad = 100 + Math.max(bottomInset, 16);

  if (!rouletteOn) {
    return (
      <ScreenGradient artBackdrop="settings">
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={tx.title} onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
            </TouchableOpacity>
          </View>
          <View testID="settings-invite-friend-off" style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: bottomPad }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}>
              {COPY[copyLang]?.title ?? COPY.ru.title}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 23, fontWeight: '400', textAlign: 'center', marginTop: 8 }}>
              {tx.unavailable}
            </Text>
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient artBackdrop="settings">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: t.border,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              hapticTap();
              safeRouterBack(router, '/(tabs)/settings' as any);
            }}
            style={{
              marginRight: 12,
              width: 38,
              height: 38,
              borderRadius: isCompassTheme ? 8 : 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : 'transparent',
              borderWidth: 0,
              borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent',
              overflow: 'hidden',
              ...(isCompassTheme ? compassShadow(1) : {}),
            }}
          >
            {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <Text
            style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', flex: 1 }}
            numberOfLines={1}
          >
            {tx.title}
          </Text>
        </View>

        <BouncyScrollView
          decelerationRate="normal"
          contentContainerStyle={{ padding: 20, paddingBottom: scrollBottomPad }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 18 }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: isCompassTheme ? 12 : 44,
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.correctBg,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 0,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.correct,
                marginBottom: 14,
                overflow: 'hidden',
                ...(isCompassTheme ? compassShadow(2) : {}),
              }}
            >
              {isCompassTheme ? <CompassDepthSurface radius={12} selected /> : null}
              <Ionicons name="gift" size={46} color={isCompassTheme ? COMPASS_RICH.champagne : t.correct} />
            </View>
            <Text
              style={{
                color: t.textPrimary,
                fontSize: f.h2,
                fontWeight: '800',
                textAlign: 'center',
                lineHeight: f.h2 * 1.25,
                marginBottom: 8,
              }}
            >
              {tx.heroTitle}
            </Text>
            <Text
              style={{
                color: t.textSecond,
                fontSize: f.body,
                textAlign: 'center',
                lineHeight: f.body * 1.45,
              }}
            >
              {tx.heroSub}
            </Text>
          </View>

          <Text
            style={{
              color: t.textMuted,
              fontSize: f.caption,
              fontWeight: '700',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginTop: 8,
              marginBottom: 10,
              marginLeft: 2,
            }}
          >
            {tx.stepsTitle}
          </Text>

          <View
            style={[
              {
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderRadius: isCompassTheme ? 10 : 16,
                padding: 4,
                borderWidth: 0,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border,
                marginBottom: 18,
                overflow: 'hidden',
              },
              isCompassTheme && compassShadow(2),
            ]}
          >
            {isCompassTheme ? <CompassDepthSurface radius={10} selected /> : null}
            <Step
              n={1}
              title={tx.step1Title}
              body={tx.step1Body}
              icon="paper-plane-outline"
              t={t}
              f={f}
              isCompassTheme={isCompassTheme}
            />
            <Divider color={t.border} />
            <Step
              n={2}
              title={isIos ? tx.step2TitleIos : tx.step2Title}
              body={isIos ? tx.step2BodyIos : tx.step2Body}
              icon="school-outline"
              t={t}
              f={f}
              isCompassTheme={isCompassTheme}
            />
            <Divider color={t.border} />
            <Step
              n={3}
              title={tx.step3Title}
              body={tx.step3Body}
              icon="diamond-outline"
              t={t}
              f={f}
              isCompassTheme={isCompassTheme}
              accent
            />
          </View>

          <View
            style={[
              {
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderRadius: isCompassTheme ? 8 : 14,
                padding: 14,
                borderWidth: 0,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                flexDirection: 'row',
                gap: 10,
                overflow: 'hidden',
              },
              isCompassTheme && compassShadow(1),
            ]}
          >
            {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={t.textMuted}
              style={{ marginTop: 1 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: t.textMuted,
                  fontSize: f.caption,
                  lineHeight: f.caption * 1.45,
                }}
              >
                {tx.smallPrint}
              </Text>
            </View>
          </View>
        </BouncyScrollView>

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: bottomPad,
            backgroundColor: 'transparent',
            borderTopWidth: 0.5,
            borderTopColor: t.border,
          }}
        >
          <TouchableOpacity
            onPress={onSendInvite}
            disabled={busy}
            activeOpacity={0.85}
            style={{
              backgroundColor: isCompassTheme ? (busy ? COMPASS_RICH.charcoalSoft : COMPASS_RICH.champagne) : busy ? t.textGhost : t.correct,
              borderRadius: isCompassTheme ? 9 : 16,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
              borderWidth: 0,
              borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent',
              overflow: 'hidden',
              ...(isCompassTheme ? compassShadow(2) : {}),
            }}
          >
            {isCompassTheme ? <CompassDepthSurface radius={9} cream={!busy} quiet={busy} /> : null}
            <Ionicons name="share-social" size={20} color={isCompassTheme ? COMPASS_RICH.textDark : t.correctText} />
            <Text style={{ color: isCompassTheme ? COMPASS_RICH.textDark : t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
              {busy ? tx.preparing : tx.cta}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

function Step({
  n,
  title,
  body,
  icon,
  t,
  f,
  isCompassTheme,
  accent,
}: {
  n: number;
  title: string;
  body: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  t: ReturnType<typeof useTheme>['theme'];
  f: ReturnType<typeof useTheme>['f'];
  isCompassTheme?: boolean;
  accent?: boolean;
}) {
  const accentColor = isCompassTheme ? (accent ? COMPASS_RICH.textDark : COMPASS_RICH.champagne) : accent ? t.correct : t.textPrimary;
  return (
    <View style={{ flexDirection: 'row', padding: 14, gap: 14 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: isCompassTheme ? 8 : 20,
          backgroundColor: isCompassTheme ? (accent ? COMPASS_RICH.champagne : COMPASS_RICH.charcoalSoft) : accent ? t.correctBg : t.bgPrimary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 0,
          borderColor: isCompassTheme ? (accent ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet) : accent ? t.correct : t.border,
          overflow: 'hidden',
          ...(isCompassTheme ? compassShadow(1) : {}),
        }}
      >
        {isCompassTheme ? <CompassDepthSurface radius={8} cream={accent} quiet={!accent} /> : null}
        <Ionicons name={icon} size={20} color={accentColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: t.textMuted,
            fontSize: f.caption,
            fontWeight: '700',
            marginBottom: 2,
            letterSpacing: 0.4,
          }}
        >
          {String(n).padStart(2, '0')}
        </Text>
        <Text
          style={{
            color: accentColor,
            fontSize: f.bodyLg,
            fontWeight: '700',
            marginBottom: 4,
          }}
        >
          {title}
        </Text>
        <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.4 }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={{ height: 1, backgroundColor: color, marginHorizontal: 14, opacity: 0.5 }} />;
}
