/**
 * Текст и ссылки для «Пригласить друга» (реферал 7+7).
 *
 * Главная цель — чтобы получатель легко ОТКРЫЛ ссылку (в т.ч. в браузере): поэтому invite-ссылку
 * всегда кладём ОТДЕЛЬНОЙ строкой — любой мессенджер (WhatsApp/Telegram/SMS) делает её кликабельной,
 * друг жмёт → открывается invite-страница → редирект в нужный стор (Android несёт код через Install
 * Referrer; iOS кладёт код в буфер по клику). Над ссылкой — короткий зазывной текст на 8 языках.
 *
 * Android: добавляем ещё Play-ссылку с Install Referrer и app-deeplink (для уже установленного).
 * iOS: App Store-ссылка + та же https-ссылка с ref (Universal Link), плюс phraseman:// как запас.
 */
import { Platform } from 'react-native';
import { STORE_URL_IOS } from './config';
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

/** Детерминированно (без Math.random — она запрещена в части окружений) выбираем фразу по длине ссылки. */
function pickBody(lang: InviteShareLang, seed: string): string {
  const arr = BODY_BY_LANG[lang];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length] as string;
}

export type ReferralInviteShare = { message: string; url: string };

function label(lang: InviteShareLang, copy: Record<InviteShareLang, string>): string {
  return copy[lang];
}

/**
 * Базовый вид: зазывная фраза + invite-ссылка ОТДЕЛЬНОЙ строкой (кликабельна и открывается в браузере).
 * Используется на web и как ядро для мобильных вариантов.
 */
function buildReferralInviteShare(lang: InviteShareLang, inviteHttps: string): ReferralInviteShare {
  const body = pickBody(lang, inviteHttps);
  // Явно проговариваем условие и взаимный бонус — чтобы друг понял, что сделать.
  const condition = label(lang, {
    ru: 'Установи приложение, введи мой код и пройди один урок полностью — мы оба получим по 7 дней полного доступа.',
    uk: 'Встанови застосунок, введи мій код і пройди один урок повністю — ми обидва отримаємо по 7 днів повного доступу.',
    es: 'Instala la app, introduce mi código y completa una lección: los dos recibiremos 7 días de acceso completo.',
    'pt-BR': 'Instale o app, insira meu código e conclua uma lição — nós dois ganhamos 7 dias de acesso completo.',
    vi: 'Cài ứng dụng, nhập mã của mình và hoàn thành một bài học — cả hai cùng nhận 7 ngày truy cập đầy đủ.',
    id: 'Pasang aplikasi, masukkan kodeku, dan selesaikan satu pelajaran — kita berdua dapat 7 hari akses penuh.',
    tr: 'Uygulamayı kur, kodumu gir ve bir dersi tamamen bitir — ikimiz de 7 gün tam erişim kazanırız.',
    pl: 'Zainstaluj aplikację, wpisz mój kod i ukończ jedną lekcję — oboje dostaniemy po 7 dni pełnego dostępu.',
  });
  const open = label(lang, {
    ru: 'Открой приглашение: ',
    uk: 'Відкрий запрошення: ',
    es: 'Abre la invitación: ',
    'pt-BR': 'Abra o convite: ',
    vi: 'Mở lời mời: ',
    id: 'Buka undangan: ',
    tr: 'Davet bağlantısını aç: ',
    pl: 'Otwórz zaproszenie: ',
  });
  return {
    message: `${body}\n\n${condition}\n\n${open}\n${inviteHttps}`,
    url: inviteHttps,
  };
}

/**
 * Готовит { message, url } для системного Share после выдачи серверного ref-кода.
 * Ссылка всегда отдельной строкой → её легко открыть, в т.ч. в браузере.
 * @returns `null` если нет кода (обычно не вошли в Google/Apple / нет сети).
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
  // База: зазывная фраза + invite-ссылка ОТДЕЛЬНОЙ строкой (открывается в браузере).
  const base = buildReferralInviteShare(lang, inviteHttps);

  if (Platform.OS === 'ios') {
    // iOS: добавляем App Store-ссылку (та же https-ссылка с ref — Universal Link несёт код).
    const store = label(lang, {
      ru: 'Скачай в App Store: ',
      uk: 'Завантаж у App Store: ',
      es: 'Descarga en App Store: ',
      'pt-BR': 'Baixe na App Store: ',
      vi: 'Tải trên App Store: ',
      id: 'Unduh di App Store: ',
      tr: 'App Store’dan indir: ',
      pl: 'Pobierz z App Store: ',
    });
    return {
      message: `${base.message}\n${store}\n${STORE_URL_IOS}`,
      url: inviteHttps,
    };
  }
  // web / прочее (не Android): зазывная фраза + кликабельная invite-ссылка — её и открывают в браузере.
  if (Platform.OS !== 'android') return buildReferralInviteShare(lang, inviteHttps);
  if (Platform.OS === 'android') {
    // Android: добавляем строку для уже установленного приложения и Play-ссылку с Install Referrer.
    const inApp = label(lang, {
      ru: 'Уже установлено? Открой в приложении: ',
      uk: 'Уже встановлено? Відкрий у застосунку: ',
      es: '¿Ya instalada? Ábrela en la app: ',
      'pt-BR': 'Já instalado? Abra no app: ',
      vi: 'Đã cài? Mở trong ứng dụng: ',
      id: 'Sudah terpasang? Buka di aplikasi: ',
      tr: 'Zaten yüklü mü? Uygulamada aç: ',
      pl: 'Już zainstalowane? Otwórz w aplikacji: ',
    });
    const install = label(lang, {
      ru: 'Нет приложения — установи: ',
      uk: 'Немає застосунку — встанови: ',
      es: 'Si no la tienes, instálala: ',
      'pt-BR': 'Não tem o app? Instale: ',
      vi: 'Chưa có ứng dụng? Cài đặt: ',
      id: 'Belum punya? Pasang: ',
      tr: 'Uygulama yoksa yükle: ',
      pl: 'Nie masz aplikacji? Zainstaluj: ',
    });
    const storeUrl = buildPlayStoreUrlWithInstallReferral(refCode);
    return {
      message: `${base.message}\n${inApp}\n${appDeepLink}\n${install}\n${storeUrl}`,
      url: inviteHttps,
    };
  }
  return base;
}

/* expo-router route shim: utility module under app/ */
export default function __RouteShim() {
  return null;
}
