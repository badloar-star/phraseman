/**
 * Текст и ссылки для «Пригласить друга» в настройках.
 *
 * Android: одна ссылка на Google Play с Install Referrer (`ref=код` внутри) — бонус подхватывается при первой установке.
 * iOS: у App Store нет такого механизма; в тот же текст добавляем https‑приглашение (и при желании phraseman://) — ref только в URL, не отдельной строкой «код: …».
 */
import { Platform } from 'react-native';
import { STORE_URL_ANDROID, STORE_URL_IOS } from './config';
import { buildPlayStoreUrlWithInstallReferral, buildReferralShareLinks } from './referral_bootstrap';
import { generateReferralCode, getReferralCode } from './referral_system';

const BODY_RU = [
  'Хватит смотреть мемы, пошли учить английский в Phraseman! Со мной ты хотя бы поймёшь, о чём шутят в оригинале. 🔥',
  'Нашёл Phraseman — это как фитнес для мозга, только без одышки. Залетай, будем тупить вместе (но на английском)! 🧠🚀',
  'Секретный ингредиент моего английского — Phraseman. Дарю ссылку, пока я не стал слишком умным для этой компании. 😉',
  'Хватит гуглить перевод мемов! 😂 Качай Phraseman и начни понимать английский как родной. Погнали со мной!',
  'Нашёл идеальный способ учить английский без боли и страданий — Phraseman. 🚀 Присоединяйся, будем качаться вместе!',
  'Эй, не хочешь прокачать свой English? 🇬🇧 В Phraseman это реально весело. Залетай по ссылке!',
  'Если даже я учу английский в Phraseman, то у тебя вообще нет оправданий. Качай и погнали! 😜',
  'Хочешь зарабатывать больше? Учи английский! Phraseman — самый кайфовый способ это сделать. Проверено! 📈✨',
] as const;

const BODY_UK = [
  'Досить дивитися меми, ходімо вчити англійську у Phraseman! Зі мною ти хоча б зрозумієш, про що жартують в оригіналі. 🔥',
  'Знайшов Phraseman — це як фітнес для мозку, тільки без задишки. Залітай, будемо тупити разом (але англійською)! 🧠🚀',
  'Секретний інгредієнт моєї англійської — Phraseman. Дарую посилання, поки я не став занадто розумним для цієї компанії. 😉',
  'Досить гуглити переклад мемів! 😂 Качай Phraseman і почни розуміти англійську як рідну. Погнали зі мною!',
  'Знайшов ідеальний спосіб вчити англійську без болю та страждань — Phraseman. 🚀 Приєднуйся, будемо качатися разом!',
  'Гей, не хочеш прокачати свій English? 🇬🇧 У Phraseman це реально весело. Залітай за посиланням!',
  'Якщо навіть я вчу англійську у Phraseman, то в тебе взагалі немає виправдань. Качай і погнали! 😜',
  'Хочеш заробляти більше? Вчи англійську! Phraseman — найкайфовіший спосіб це зробити. Перевірено! 📈✨',
] as const;

const BODY_ES = [
  'Deja los memes un rato y ven a estudiar inglés con Phraseman. Conmigo, al menos entenderás por qué se ríen en el original. 🔥',
  'Probé Phraseman: entrenamiento para el cerebro, sin drama. ¡Únete y practiquemos en inglés! 🧠🚀',
  'Mi secreto para el inglés: Phraseman. Te paso el enlace antes de que me ponga demasiado listo. 😉',
  'Ya basta de buscar en Google la traducción de los memes. 😂 Instala Phraseman y empieza a entender inglés de verdad. ¡Vamos!',
  'Encontré una forma de estudiar inglés sin sufrir: Phraseman. 🚀 Únete y subamos de nivel juntos.',
  '¿Te animas a mejorar tu inglés? 🇬🇧 En Phraseman es muy entretenido. Entra desde el enlace.',
  'Si hasta yo estudio inglés aquí, tú no tienes excusa. Instala Phraseman ya. 😜',
  '¿Más oportunidades laborales? Aprende inglés. Phraseman funciona de verdad. 📈✨',
] as const;

export type InviteShareLang = 'ru' | 'uk' | 'es';

function pickBody(lang: InviteShareLang): string {
  const arr = lang === 'uk' ? BODY_UK : lang === 'es' ? BODY_ES : BODY_RU;
  return arr[Math.floor(Math.random() * arr.length)] as string;
}

export type ReferralInviteShare = { message: string; url: string };

/** Android: Play с Install Referrer; в сообщении только магазин, без второй ссылки. */
function buildAndroidInviteShare(lang: InviteShareLang, refCode: string): ReferralInviteShare {
  const body = pickBody(lang);
  const storeUrl = buildPlayStoreUrlWithInstallReferral(refCode);
  const line1 =
    (lang === 'uk' ? 'Завантаж застосунок: ' : lang === 'es' ? 'Descarga la app: ' : 'Скачай приложение: ') +
    storeUrl;
  return {
    message: `${body}\n\n${line1}`,
    url: storeUrl,
  };
}

/**
 * iOS: ссылка на App Store + отдельная https/phraseman ссылка с ref (как в URL), без аналога Play Install Referrer.
 * phraseman:// — запасной вариант, если ссылка открылась, а Universal Links не сработали.
 */
function buildIosInviteShare(lang: InviteShareLang, inviteHttps: string, appDeepLink: string): ReferralInviteShare {
  const body = pickBody(lang);
  const line1 =
    (lang === 'uk'
      ? 'Завантаж у App Store: '
      : lang === 'es'
        ? 'Descarga en App Store: '
        : 'Скачай в App Store: ') + STORE_URL_IOS;
  const line2 =
    lang === 'uk'
      ? 'Після встановлення натисни (бонус на двох): ' + inviteHttps
      : lang === 'es'
        ? 'Después de instalar, abre este enlace (bonificación para los dos): ' + inviteHttps
        : 'После установки нажми (бонус вам обоим): ' + inviteHttps;
  const line3 =
    lang === 'uk'
      ? 'Або відкрий у застосунку: ' + appDeepLink
      : lang === 'es'
        ? 'O ábrelo desde la app: ' + appDeepLink
        : 'Или открой в приложении: ' + appDeepLink;
  return {
    message: `${body}\n\n${line1}\n${line2}\n${line3}`,
    url: STORE_URL_IOS,
  };
}

/**
 * Готовит { message, url } для Share после выдачи серверного ref-кода.
 * @returns `null` если нет кода (обычно не вошли в Google/Apple).
 */
export async function buildCloudReferralInviteShare(params: {
  lang: InviteShareLang;
  userName: string;
}): Promise<ReferralInviteShare | null> {
  await generateReferralCode(params.userName || 'User');
  const refCode = await getReferralCode();
  if (!refCode) return null;
  const { https: inviteHttps, app: appDeepLink } = buildReferralShareLinks(refCode);
  const { lang } = params;

  if (Platform.OS === 'android') {
    return buildAndroidInviteShare(lang, refCode);
  }
  if (Platform.OS === 'ios') {
    return buildIosInviteShare(lang, inviteHttps, appDeepLink);
  }
  // web / прочие: нет Play Referrer; используем приглашение по https
  return {
    message: `${pickBody(lang)}\n\n${inviteHttps}`,
    url: inviteHttps,
  };
}

/* expo-router route shim: utility module under app/ */
export default function __RouteShim() {
  return null;
}
