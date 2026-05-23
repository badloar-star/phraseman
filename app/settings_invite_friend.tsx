import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { hapticTap } from '../hooks/use-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORE_URL } from './config';
import { isReferralCloudEnabled } from './referral_cloud';
import { buildCloudReferralInviteShare } from './referral_invite_share';
import { updateMultipleTaskProgress } from './daily_tasks';
import { enqueueThemedBlockingInfoAlert } from './themed_blocking_alert_queue';
import { useEffectivePlatformOS } from './platform_ui_preview';
import type { Lang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';

const REFEREE_BONUS = 15;
const REFERRER_BONUS = 20;
const MONTHLY_LIMIT = 30;

const COPY = {
  ru: {
    title: 'Пригласить друга',
    heroTitle: 'Зови друга — \nполучите бонус оба',
    heroSub: 'Phraseman становится веселее с друзьями. А ещё за это мы насыпем вам обоим осколки знаний.',
    stepsTitle: 'Как это работает',
    step1Title: 'Отправь свою ссылку',
    step1Body: 'Поделись приглашением в любом мессенджере. Друг сможет перейти по ссылке и установить Phraseman.',
    step2Title: 'Друг пройдёт первый урок',
    step2Body: 'Ему нужно установить Phraseman по твоей ссылке и закончить урок 1 минимум на бронзу.',
    step2TitleIos: 'Друг вводит ваш код',
    step2BodyIos:
      'Во вкладке «Друзья» он вводит ваш персональный код. Дальше — закончить урок 1 минимум на бронзу.',
    step3Title: 'Прилетят бонусы — обоим',
    step3Body: `Тебе +${REFERRER_BONUS} осколков знаний, другу +${REFEREE_BONUS}. Зачисляются автоматически, как только урок засчитан.`,
    smallPrint: `Бонусы начисляются один раз за каждого нового друга. В месяц можно получить награду максимум за ${MONTHLY_LIMIT} приглашений.`,
    cta: 'Отправить приглашение',
    preparing: '',
    needAuthTitle: 'Нужен вход',
    needAuth: 'Войди через Google или Apple, чтобы ссылка учитывала приглашение и вы оба получили бонусы.',
  },
  uk: {
    title: 'Запросити друга',
    heroTitle: 'Клич друга —\nотримаєте бонус обидва',
    heroSub: 'Phraseman цікавіше з друзями. А ще за це ми насиплемо вам обом уламки знань.',
    stepsTitle: 'Як це працює',
    step1Title: 'Надішли своє посилання',
    step1Body: 'Поділись запрошенням у будь-якому месенджері. Друг зможе перейти за посиланням і встановити Phraseman.',
    step2Title: 'Друг пройде перший урок',
    step2Body: 'Йому треба встановити Phraseman за твоїм посиланням і закінчити урок 1 щонайменше на бронзу.',
    step2TitleIos: 'Друг вводить твій код',
    step2BodyIos:
      'У вкладці «Друзі» він вводить твій персональний код. Далі — закінчити урок 1 щонайменше на бронзу.',
    step3Title: 'Прилетять бонуси — обом',
    step3Body: `Тобі +${REFERRER_BONUS} уламків знань, другу +${REFEREE_BONUS}. Нараховуються автоматично, щойно урок зараховано.`,
    smallPrint: `Бонуси нараховуються один раз за кожного нового друга. На місяць можна отримати нагороду максимум за ${MONTHLY_LIMIT} запрошень.`,
    cta: 'Надіслати запрошення',
    preparing: '',
    needAuthTitle: 'Потрібен вхід',
    needAuth: 'Увійди через Google або Apple, щоб посилання враховувало запрошення і ви обоє отримали бонуси.',
  },
  es: {
    title: 'Invitar a un amigo',
    heroTitle: 'Invita a un amigo —\nbonificación para ambos',
    heroSub:
      'Phraseman es mejor con amigos. Además, ambos reciben fragmentos de conocimiento.',
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
    step3Title: 'Bonificación para ambos',
    step3Body: `Tú +${REFERRER_BONUS} fragmentos de conocimiento, tu amigo +${REFEREE_BONUS}. Se abonan automáticamente en cuanto la lección queda completada.`,
    smallPrint: `La bonificación se concede una vez por cada amigo nuevo. Cada mes, como máximo ${MONTHLY_LIMIT} invitaciones con recompensa.`,
    cta: 'Enviar invitación',
    preparing: '',
    needAuthTitle: 'Inicia sesión',
    needAuth:
      'Entra con Google o Apple para que el enlace registre la invitación y ambos reciban la bonificación.',
  },
  'pt-BR': {
    title: 'Convidar amigo',
    heroTitle: 'Chame um amigo —\nbônus para os dois',
    heroSub: 'Phraseman fica melhor com amigos. E vocês dois ainda ganham fragmentos de conhecimento.',
    stepsTitle: 'Como funciona',
    step1Title: 'Envie seu link',
    step1Body: 'Compartilhe o convite em qualquer mensageiro. Seu amigo pode abrir o link e instalar o Phraseman.',
    step2Title: 'Seu amigo conclui a primeira lição',
    step2Body: 'Ele precisa instalar o Phraseman pelo seu link e terminar a lição 1 com pelo menos bronze.',
    step2TitleIos: 'Seu amigo digita seu código',
    step2BodyIos: 'Na aba "Amigos", ele digita seu código pessoal. Depois, termina a lição 1 com pelo menos bronze.',
    step3Title: 'Bônus para os dois',
    step3Body: `Você +${REFERRER_BONUS} fragmentos de conhecimento, seu amigo +${REFEREE_BONUS}. O crédito é automático assim que a lição conta.`,
    smallPrint: `O bônus é concedido uma vez para cada novo amigo. Por mês, você pode receber recompensa por no máximo ${MONTHLY_LIMIT} convites.`,
    cta: 'Enviar convite',
    preparing: '',
    needAuthTitle: 'Login necessário',
    needAuth: 'Entre com Google ou Apple para que o link registre o convite e vocês dois recebam os bônus.',
  },
  vi: {
    title: 'Mời bạn bè',
    heroTitle: 'Mời bạn —\ncả hai cùng nhận thưởng',
    heroSub: 'Phraseman vui hơn khi học cùng bạn bè. Và cả hai sẽ nhận mảnh kiến thức.',
    stepsTitle: 'Cách hoạt động',
    step1Title: 'Gửi liên kết của bạn',
    step1Body: 'Chia sẻ lời mời qua bất kỳ ứng dụng nhắn tin nào. Bạn của bạn có thể mở liên kết và cài Phraseman.',
    step2Title: 'Bạn của bạn hoàn thành bài 1',
    step2Body: 'Người đó cần cài Phraseman từ liên kết của bạn và hoàn thành bài 1 ít nhất mức đồng.',
    step2TitleIos: 'Bạn của bạn nhập mã',
    step2BodyIos: 'Trong tab "Bạn bè", người đó nhập mã cá nhân của bạn. Sau đó hoàn thành bài 1 ít nhất mức đồng.',
    step3Title: 'Thưởng cho cả hai',
    step3Body: `Bạn +${REFERRER_BONUS} mảnh kiến thức, bạn của bạn +${REFEREE_BONUS}. Tự động cộng khi bài học được tính.`,
    smallPrint: `Thưởng chỉ được cộng một lần cho mỗi bạn mới. Mỗi tháng tối đa ${MONTHLY_LIMIT} lời mời có thưởng.`,
    cta: 'Gửi lời mời',
    preparing: '',
    needAuthTitle: 'Cần đăng nhập',
    needAuth: 'Đăng nhập bằng Google hoặc Apple để liên kết ghi nhận lời mời và cả hai nhận thưởng.',
  },
  'id': {
    title: 'Undang teman',
    heroTitle: 'Ajak teman —\nkeduanya dapat bonus',
    heroSub: 'Phraseman lebih seru bersama teman. Kalian berdua juga mendapat shard pengetahuan.',
    stepsTitle: 'Cara kerjanya',
    step1Title: 'Kirim tautanmu',
    step1Body: 'Bagikan undangan lewat aplikasi pesan apa pun. Temanmu bisa membuka tautan dan memasang Phraseman.',
    step2Title: 'Teman menyelesaikan pelajaran pertama',
    step2Body: 'Ia perlu memasang Phraseman dari tautanmu dan menyelesaikan pelajaran 1 minimal perunggu.',
    step2TitleIos: 'Teman memasukkan kodemu',
    step2BodyIos: 'Di tab "Teman", ia memasukkan kode pribadimu. Setelah itu menyelesaikan pelajaran 1 minimal perunggu.',
    step3Title: 'Bonus untuk berdua',
    step3Body: `Kamu +${REFERRER_BONUS} shard pengetahuan, temanmu +${REFEREE_BONUS}. Otomatis masuk setelah pelajaran tercatat.`,
    smallPrint: `Bonus diberikan satu kali untuk setiap teman baru. Per bulan maksimal ${MONTHLY_LIMIT} undangan berhadiah.`,
    cta: 'Kirim undangan',
    preparing: '',
    needAuthTitle: 'Perlu masuk',
    needAuth: 'Masuk dengan Google atau Apple agar tautan mencatat undangan dan kalian berdua mendapat bonus.',
  },
  tr: {
    title: 'Arkadaş davet et',
    heroTitle: 'Arkadaşını çağır —\nikiniz de bonus alın',
    heroSub: 'Phraseman arkadaşlarla daha eğlenceli. Ayrıca ikinize de bilgi parçaları veririz.',
    stepsTitle: 'Nasıl çalışır',
    step1Title: 'Bağlantını gönder',
    step1Body: 'Davetini herhangi bir mesajlaşma uygulamasında paylaş. Arkadaşın bağlantıyı açıp Phraseman’i kurabilir.',
    step2Title: 'Arkadaşın ilk dersi bitirir',
    step2Body: 'Phraseman’i senin bağlantından kurup 1. dersi en az bronz seviyede bitirmesi gerekir.',
    step2TitleIos: 'Arkadaşın kodunu girer',
    step2BodyIos: '"Arkadaşlar" sekmesinde kişisel kodunu girer. Sonra 1. dersi en az bronz seviyede bitirir.',
    step3Title: 'Bonus ikinize de gelir',
    step3Body: `Sana +${REFERRER_BONUS} bilgi parçası, arkadaşına +${REFEREE_BONUS}. Ders sayıldığı anda otomatik yüklenir.`,
    smallPrint: `Bonus her yeni arkadaş için bir kez verilir. Ayda en fazla ${MONTHLY_LIMIT} davet için ödül alınabilir.`,
    cta: 'Davet gönder',
    preparing: '',
    needAuthTitle: 'Giriş gerekli',
    needAuth: 'Bağlantının daveti sayması ve ikinizin de bonus alması için Google veya Apple ile giriş yap.',
  },
  pl: {
    title: 'Zaproś znajomego',
    heroTitle: 'Zaproś znajomego —\nbonus dla was obojga',
    heroSub: 'Phraseman jest ciekawszy ze znajomymi. Do tego oboje dostaniecie odłamki wiedzy.',
    stepsTitle: 'Jak to działa',
    step1Title: 'Wyślij swój link',
    step1Body: 'Udostępnij zaproszenie w dowolnym komunikatorze. Znajomy otworzy link i zainstaluje Phraseman.',
    step2Title: 'Znajomy kończy pierwszą lekcję',
    step2Body: 'Musi zainstalować Phraseman z twojego linku i ukończyć lekcję 1 co najmniej na brąz.',
    step2TitleIos: 'Znajomy wpisuje twój kod',
    step2BodyIos: 'W zakładce "Znajomi" wpisuje twój osobisty kod. Potem kończy lekcję 1 co najmniej na brąz.',
    step3Title: 'Bonus dla obojga',
    step3Body: `Ty +${REFERRER_BONUS} odłamków wiedzy, znajomy +${REFEREE_BONUS}. Naliczane automatycznie, gdy lekcja zostanie zaliczona.`,
    smallPrint: `Bonus przysługuje raz za każdego nowego znajomego. Miesięcznie możesz otrzymać nagrodę maksymalnie za ${MONTHLY_LIMIT} zaproszeń.`,
    cta: 'Wyślij zaproszenie',
    preparing: '',
    needAuthTitle: 'Wymagane logowanie',
    needAuth: 'Zaloguj się przez Google lub Apple, aby link zapisał zaproszenie i oboje otrzymacie bonusy.',
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
  const { theme: t, f } = useTheme();

  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useSafeAreaInsets();
  const bottomPad =
    Math.max(insets.bottom, effectiveOs === 'ios' ? 10 : 28) + 8;
  const copyLang = lang as Lang;
  const tx = COPY[copyLang] ?? COPY.ru;

  const [busy, setBusy] = useState(false);

  const onSendInvite = useCallback(async () => {
    if (busy) return;
    hapticTap();
    setBusy(true);
    try {
      if (!isReferralCloudEnabled()) {
        const pool = OFFLINE_SHARE_BODIES_BY_LANG[copyLang] ?? OFFLINE_SHARE_BODIES_BY_LANG.ru;
        const msg = pool[Math.floor(Math.random() * pool.length)];
        const r = await Share.share({ message: msg });
        if (shouldCountInviteShare(r)) {
          void updateMultipleTaskProgress(
            [{ type: 'invite_friend', increment: 1 }],
            { studyTarget },
          ).catch(() => {});
        }
        return;
      }
      const userName = (await AsyncStorage.getItem('user_name')) || 'User';
      const share = await buildCloudReferralInviteShare({ lang, userName });
      if (!share) {
        await enqueueThemedBlockingInfoAlert(tx.needAuthTitle, tx.needAuth, 'OK');
        return;
      }
      const message =
        share.url && !share.message.includes(share.url)
          ? `${share.message}\n${share.url}`
          : share.message;
      const r = await Share.share({ message, url: share.url });
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
  }, [busy, lang, studyTarget, tx.needAuth, tx.needAuthTitle]);

  const isIos = effectiveOs === 'ios';
  const scrollBottomPad = 100 + Math.max(insets.bottom, 16);

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
            style={{ marginRight: 12, padding: 4 }}
          >
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <Text
            style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', flex: 1 }}
            numberOfLines={1}
          >
            {tx.title}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: scrollBottomPad }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 18 }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: t.correctBg,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: t.correct,
                marginBottom: 14,
              }}
            >
              <Ionicons name="gift" size={46} color={t.correct} />
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
            style={{
              backgroundColor: t.bgCard,
              borderRadius: 16,
              padding: 4,
              borderWidth: 1,
              borderColor: t.border,
              marginBottom: 18,
            }}
          >
            <Step
              n={1}
              title={tx.step1Title}
              body={tx.step1Body}
              icon="paper-plane-outline"
              t={t}
              f={f}
            />
            <Divider color={t.border} />
            <Step
              n={2}
              title={isIos ? tx.step2TitleIos : tx.step2Title}
              body={isIos ? tx.step2BodyIos : tx.step2Body}
              icon="school-outline"
              t={t}
              f={f}
            />
            <Divider color={t.border} />
            <Step
              n={3}
              title={tx.step3Title}
              body={tx.step3Body}
              icon="diamond-outline"
              t={t}
              f={f}
              accent
            />
          </View>

          <View
            style={{
              backgroundColor: t.bgCard,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: t.border,
              flexDirection: 'row',
              gap: 10,
            }}
          >
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
        </ScrollView>

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
              backgroundColor: busy ? t.textGhost : t.correct,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="share-social" size={20} color={t.correctText} />
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
              {tx.cta}
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
  accent,
}: {
  n: number;
  title: string;
  body: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  t: ReturnType<typeof useTheme>['theme'];
  f: ReturnType<typeof useTheme>['f'];
  accent?: boolean;
}) {
  const accentColor = accent ? t.correct : t.textPrimary;
  return (
    <View style={{ flexDirection: 'row', padding: 14, gap: 14 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: accent ? t.correctBg : t.bgPrimary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: accent ? t.correct : t.border,
        }}
      >
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
