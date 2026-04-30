import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { hapticTap } from '../hooks/use-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORE_URL } from './config';
import { isReferralCloudEnabled } from './referral_cloud';
import { buildCloudReferralInviteShare } from './referral_invite_share';

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
    step3Title: 'Прилетят бонусы — обоим',
    step3Body: `Тебе +${REFERRER_BONUS} осколков знаний, другу +${REFEREE_BONUS}. Зачисляются автоматически, как только урок засчитан.`,
    smallPrint: `Бонусы начисляются один раз за каждого нового друга. В месяц можно получить награду максимум за ${MONTHLY_LIMIT} приглашений.`,
    cta: 'Отправить приглашение',
    preparing: 'Готовим ссылку…',
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
    step3Title: 'Прилетять бонуси — обом',
    step3Body: `Тобі +${REFERRER_BONUS} уламків знань, другу +${REFEREE_BONUS}. Нараховуються автоматично, щойно урок зараховано.`,
    smallPrint: `Бонуси нараховуються один раз за кожного нового друга. На місяць можна отримати нагороду максимум за ${MONTHLY_LIMIT} запрошень.`,
    cta: 'Надіслати запрошення',
    preparing: 'Готуємо посилання…',
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
    step3Title: 'Bonificación para ambos',
    step3Body: `Tú +${REFERRER_BONUS} fragmentos de conocimiento, tu amigo +${REFEREE_BONUS}. Se abonan automáticamente en cuanto la lección queda completada.`,
    smallPrint: `La bonificación se concede una vez por cada amigo nuevo. Cada mes, como máximo ${MONTHLY_LIMIT} invitaciones con recompensa.`,
    cta: 'Enviar invitación',
    preparing: 'Preparando enlace…',
    needAuthTitle: 'Inicia sesión',
    needAuth:
      'Entra con Google o Apple para que el enlace registre la invitación y ambos reciban la bonificación.',
  },
};

const FALLBACK_BODIES_RU = [
  `Хватит смотреть мемы, пошли учить английский в Phraseman! Со мной ты хотя бы поймёшь, о чём шутят в оригинале. 🔥 ${STORE_URL}`,
  `Нашёл Phraseman — это как фитнес для мозга, только без одышки. Залетай, будем тупить вместе (но на английском)! 🧠🚀 ${STORE_URL}`,
  `Секретный ингредиент моего английского — Phraseman. Дарю ссылку, пока я не стал слишком умным для этой компании. 😉 ${STORE_URL}`,
  `Хватит гуглить перевод мемов! 😂 Качай Phraseman и начни понимать английский как родной. Погнали со мной! ${STORE_URL}`,
  `Нашёл идеальный способ учить английский без боли и страданий — Phraseman. 🚀 Присоединяйся, будем качаться вместе! ${STORE_URL}`,
  `Эй, не хочешь прокачать свой English? 🇬🇧 В Phraseman это реально весело. Залетай по ссылке! ${STORE_URL}`,
  `Если даже я учу английский в Phraseman, то у тебя вообще нет оправданий. Качай и погнали! 😜 ${STORE_URL}`,
  `Хочешь зарабатывать больше? Учи английский! Phraseman — самый кайфовый способ это сделать. Проверено! 📈✨ ${STORE_URL}`,
];

const FALLBACK_BODIES_UK = [
  `Досить дивитися меми, ходімо вчити англійську у Phraseman! Зі мною ти хоча б зрозумієш, про що жартують в оригіналі. 🔥 ${STORE_URL}`,
  `Знайшов Phraseman — це як фітнес для мозку, тільки без задишки. Залітай, будемо тупити разом (але англійською)! 🧠🚀 ${STORE_URL}`,
  `Секретний інгредієнт моєї англійської — Phraseman. Дарую посилання, поки я не став занадто розумним для цієї компанії. 😉 ${STORE_URL}`,
  `Досить гуглити переклад мемів! 😂 Качай Phraseman і почни розуміти англійську як рідну. Погнали зі мною! ${STORE_URL}`,
  `Знайшов ідеальний спосіб вчити англійську без болю та страждань — Phraseman. 🚀 Приєднуйся, будемо качатися разом! ${STORE_URL}`,
  `Гей, не хочеш прокачати свій English? 🇬🇧 У Phraseman це реально весело. Залітай за посиланням! ${STORE_URL}`,
  `Якщо навіть я вчу англійську у Phraseman, то в тебе взагалі немає виправдань. Качай і погнали! 😜 ${STORE_URL}`,
  `Хочеш заробляти більше? Вчи англійську! Phraseman — найкайфовіший спосіб це зробити. Перевірено! 📈✨ ${STORE_URL}`,
];

const FALLBACK_BODIES_ES = [
  `Deja los memes un rato y ven a estudiar inglés con Phraseman. Conmigo al menos entenderás por qué ríen en el original 🔥 ${STORE_URL}`,
  `Probé Phraseman: entrenamiento para el cerebro, sin drama. ¡Únete y practicamos en inglés! 🧠🚀 ${STORE_URL}`,
  `Mi secreto para el inglés: Phraseman. Te paso el enlace antes de que me ponga demasiado listo 😉 ${STORE_URL}`,
  `Ya basta de buscar en Google la traducción de los memes 😂 Instala Phraseman y empieza a entender inglés de verdad. ¡Vamos! ${STORE_URL}`,
  `Encontré forma de estudiar inglés sin sufrir: Phraseman. 🚀 Únete y subimos de nivel juntos ${STORE_URL}`,
  `¿Te animas a mejorar tu inglés? 🇬🇧 En Phraseman es muy entretenido. Entra por el enlace ${STORE_URL}`,
  `Si hasta yo estudio aquí, tú no tienes excusa. Instala Phraseman ya 😜 ${STORE_URL}`,
  `¿Más oportunidades laborales? Aprende inglés. Phraseman funciona de verdad 📈✨ ${STORE_URL}`,
];

export default function SettingsInviteFriend() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const copyLang = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const tx = COPY[copyLang];

  const [busy, setBusy] = useState(false);

  const onSendInvite = useCallback(async () => {
    if (busy) return;
    hapticTap();
    setBusy(true);
    try {
      if (!isReferralCloudEnabled()) {
        const pool =
          lang === 'uk' ? FALLBACK_BODIES_UK : lang === 'es' ? FALLBACK_BODIES_ES : FALLBACK_BODIES_RU;
        const msg = pool[Math.floor(Math.random() * pool.length)];
        await Share.share({ message: msg });
        return;
      }
      const userName = (await AsyncStorage.getItem('user_name')) || 'User';
      const share = await buildCloudReferralInviteShare({ lang, userName });
      if (!share) {
        Alert.alert(tx.needAuthTitle, tx.needAuth);
        return;
      }
      const message =
        share.url && !share.message.includes(share.url)
          ? `${share.message}\n${share.url}`
          : share.message;
      await Share.share({ message, url: share.url });
    } catch {
    } finally {
      setBusy(false);
    }
  }, [busy, lang, tx.needAuth, tx.needAuthTitle]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={['top', 'left', 'right']}>
      <ScreenGradient>
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
              router.back();
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
          contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
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
              title={tx.step2Title}
              body={tx.step2Body}
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
            paddingBottom: Platform.OS === 'ios' ? 28 : 18,
            backgroundColor: t.bgPrimary,
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
            {busy ? (
              <ActivityIndicator color={t.correctText} />
            ) : (
              <Ionicons name="share-social" size={20} color={t.correctText} />
            )}
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
              {busy ? tx.preparing : tx.cta}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenGradient>
    </SafeAreaView>
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
