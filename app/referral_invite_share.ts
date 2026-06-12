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
import type { Lang } from '../constants/i18n';

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

const BODY_PT_BR = [
  'Bora aprender inglês no Phraseman comigo! É treino para o cérebro, mas sem sofrimento. 🔥',
  'Achei um jeito divertido de estudar inglês: Phraseman. Entra pelo link e vamos evoluir juntos. 🚀',
] as const;

const BODY_VI = [
  'Cùng mình học tiếng Anh trên Phraseman nhé! Vui, gọn và dễ duy trì mỗi ngày. 🔥',
  'Mình đang luyện tiếng Anh bằng Phraseman. Vào link này để cùng tiến bộ nhé. 🚀',
] as const;

const BODY_ID = [
  'Ayo belajar bahasa Inggris bareng di Phraseman! Latihannya ringan, tapi terasa hasilnya. 🔥',
  'Aku pakai Phraseman buat naik level bahasa Inggris. Masuk lewat tautan ini dan latihan bareng. 🚀',
] as const;

const BODY_TR = [
  'Phraseman’da benimle İngilizce çalışmaya var mısın? Kısa, eğlenceli ve işe yarıyor. 🔥',
  'İngilizcemi Phraseman ile geliştiriyorum. Linkten katıl, birlikte ilerleyelim. 🚀',
] as const;

const BODY_PL = [
  'Chodź uczyć się angielskiego ze mną w Phraseman! Krótko, konkretnie i bez męki. 🔥',
  'Ćwiczę angielski w Phraseman. Wejdź z tego linku i róbmy postępy razem. 🚀',
] as const;

export type InviteShareLang = Lang;

const BODY_BY_LANG: Record<InviteShareLang, readonly string[]> = {
  ru: BODY_RU,
  uk: BODY_UK,
  es: BODY_ES,
  'pt-BR': BODY_PT_BR,
  vi: BODY_VI,
  id: BODY_ID,
  tr: BODY_TR,
  pl: BODY_PL,
};

function pickBody(lang: InviteShareLang): string {
  const arr = BODY_BY_LANG[lang];
  return arr[Math.floor(Math.random() * arr.length)] as string;
}

export type ReferralInviteShare = { message: string; url: string };

function label(lang: InviteShareLang, copy: Record<InviteShareLang, string>): string {
  return copy[lang];
}

function buildReferralInviteShare(lang: InviteShareLang, inviteHttps: string): ReferralInviteShare {
  const body = pickBody(lang);
  const line1 = label(lang, { ru: 'Открой приглашение: ', uk: 'Відкрий запрошення: ', es: 'Abre la invitación: ', 'pt-BR': 'Abra o convite: ', vi: 'Mở lời mời: ', id: 'Buka undangan: ', tr: 'Davet bağlantısını aç: ', pl: 'Otwórz zaproszenie: ' }) + inviteHttps;
  return {
    message: `${body}\n\n${line1}`,
    url: inviteHttps,
  };
}

/** Android: primary web invite for installed users, Play URL only for installation. */
function buildAndroidInviteShare(
  lang: InviteShareLang,
  inviteHttps: string,
  appDeepLink: string,
  refCode: string,
): ReferralInviteShare {
  const body = pickBody(lang);
  const storeUrl = buildPlayStoreUrlWithInstallReferral(refCode);
  const line1 = label(lang, { ru: 'Открой приглашение: ', uk: 'Відкрий запрошення: ', es: 'Abre la invitación: ', 'pt-BR': 'Abra o convite: ', vi: 'Mở lời mời: ', id: 'Buka undangan: ', tr: 'Davet bağlantısını aç: ', pl: 'Otwórz zaproszenie: ' }) + inviteHttps;
  const line2 = label(lang, { ru: 'Если приложение уже установлено: ', uk: 'Якщо застосунок уже встановлено: ', es: 'Si ya tienes la app: ', 'pt-BR': 'Se o app já estiver instalado: ', vi: 'Nếu ứng dụng đã được cài đặt: ', id: 'Jika aplikasi sudah terpasang: ', tr: 'Uygulama zaten yüklüyse: ', pl: 'Jeśli aplikacja jest już zainstalowana: ' }) + appDeepLink;
  const line3 = label(lang, { ru: 'Если нужно установить: ', uk: 'Якщо треба встановити: ', es: 'Si necesitas instalarla: ', 'pt-BR': 'Se precisar instalar: ', vi: 'Nếu cần cài đặt: ', id: 'Jika perlu memasang: ', tr: 'Yüklemen gerekiyorsa: ', pl: 'Jeśli trzeba zainstalować: ' }) + storeUrl;
  return {
    message: `${body}\n\n${line1}\n${line2}\n${line3}`,
    url: inviteHttps,
  };
}

/**
 * iOS: ссылка на App Store + отдельная https/phraseman ссылка с ref (как в URL), без аналога Play Install Referrer.
 * phraseman:// — запасной вариант, если ссылка открылась, а Universal Links не сработали.
 */
function buildIosInviteShare(lang: InviteShareLang, inviteHttps: string, appDeepLink: string): ReferralInviteShare {
  const body = pickBody(lang);
  const line1 = label(lang, { ru: 'Скачай в App Store: ', uk: 'Завантаж у App Store: ', es: 'Descarga en App Store: ', 'pt-BR': 'Baixe na App Store: ', vi: 'Tải trên App Store: ', id: 'Unduh di App Store: ', tr: 'App Store’dan indir: ', pl: 'Pobierz z App Store: ' }) + STORE_URL_IOS;
  const line2 = label(lang, { ru: 'После установки нажми (бонус вам обоим): ', uk: 'Після встановлення натисни (бонус на двох): ', es: 'Después de instalar, abre este enlace (bonificación para los dos): ', 'pt-BR': 'Depois de instalar, abra este link (bônus para vocês dois): ', vi: 'Sau khi cài đặt, mở liên kết này (cả hai cùng nhận thưởng): ', id: 'Setelah memasang, buka tautan ini (bonus untuk kalian berdua): ', tr: 'Yükledikten sonra bu bağlantıyı aç (ikinize de bonus): ', pl: 'Po instalacji otwórz ten link (bonus dla was obojga): ' }) + inviteHttps;
  const line3 = label(lang, { ru: 'Или открой в приложении: ', uk: 'Або відкрий у застосунку: ', es: 'O ábrelo desde la app: ', 'pt-BR': 'Ou abra no app: ', vi: 'Hoặc mở trong ứng dụng: ', id: 'Atau buka di aplikasi: ', tr: 'Ya da uygulamada aç: ', pl: 'Albo otwórz w aplikacji: ' }) + appDeepLink;
  return {
    message: `${body}\n\n${line1}\n${line2}\n${line3}`,
    url: inviteHttps,
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
  return buildReferralInviteShare(lang, inviteHttps);

  if (Platform.OS === 'android') {
    return buildAndroidInviteShare(lang, inviteHttps, appDeepLink, refCode);
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
