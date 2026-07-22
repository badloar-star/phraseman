/**
 * Текст и ссылки для «Пригласить друга» (реферал 7+7).
 *
 * Главная цель — чтобы получатель легко ОТКРЫЛ ссылку (в т.ч. в браузере): поэтому invite-ссылку
 * всегда кладём ОТДЕЛЬНОЙ строкой — любой мессенджер (WhatsApp/Telegram/SMS) делает её кликабельной,
 * друг жмёт → открывается invite-страница → редирект в нужный стор (Android несёт код через Install
 * Referrer; iOS кладёт код в буфер по клику). Над ссылкой — короткий зазывной текст на 8 языках.
 *
 * Platform-specific app/store routing lives on the invite page itself; the shared text intentionally contains
 * exactly one public https link so messengers do not render a stack of competing links.
 */
import { buildReferralShareLinks } from './referral_bootstrap';
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
 * Базовый вид: зазывная фраза + КОД открытым текстом + invite-ссылка ОТДЕЛЬНОЙ строкой
 * (кликабельна и открывается в браузере). Используется на web и как ядро для мобильных.
 *
 * Код обязан быть виден в сообщении: до 2026-07-04 он жил только внутри URL (?ref=…),
 * и когда авто-атрибуция не срабатывала (iOS без буфера, Android без Install Referrer),
 * другу физически нечего было ввести вручную — «введи мой код» без кода.
 */
function buildReferralInviteShare(lang: InviteShareLang, inviteHttps: string, refCode: string): ReferralInviteShare {
  const body = pickBody(lang, inviteHttps);
  // Явно проговариваем условие и награду пригласившему — чтобы друг понял, что сделать.
  const condition = label(lang, {
    ru: 'Установи приложение, введи мой код и пройди первый урок полностью — я получу 1 прокрут. В рулетке можно выиграть Plus от 1 дня до 365 дней.',
    uk: 'Встанови застосунок, введи мій код і пройди перший урок повністю — я отримаю 1 прокрут. У рулетці можна виграти Plus від 1 до 365 днів.',
    es: 'Instala la app, introduce mi código y completa la primera lección: recibiré 1 giro con premios Plus de 1 a 365 días.',
    'pt-BR': 'Instale o app, insira meu código e conclua a primeira lição: receberei 1 giro com prêmios Plus de 1 a 365 dias.',
    vi: 'Cài ứng dụng, nhập mã của mình và hoàn thành bài học đầu tiên — mình nhận 1 lượt quay với giải Plus từ 1 đến 365 ngày.',
    id: 'Pasang aplikasi, masukkan kodeku, dan selesaikan pelajaran pertama — aku mendapat 1 putaran dengan hadiah Plus 1–365 hari.',
    tr: 'Uygulamayı kur, kodumu gir ve ilk dersi bitir — 1 çevirme kazanırım. Rulette 1–365 gün Plus var.',
    pl: 'Zainstaluj aplikację, wpisz mój kod i ukończ pierwszą lekcję — dostanę 1 los z nagrodą Plus od 1 do 365 dni.',
  });
  const codeLabel = label(lang, {
    ru: 'Мой код: ',
    uk: 'Мій код: ',
    es: 'Mi código: ',
    'pt-BR': 'Meu código: ',
    vi: 'Mã của mình: ',
    id: 'Kode saya: ',
    tr: 'Kodum: ',
    pl: 'Mój kod: ',
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
  const code = refCode.trim().toUpperCase();
  const codeLine = code.length >= 4 ? `${codeLabel}${code}\n\n` : '';
  return {
    message: `${body}\n\n${condition}\n\n${codeLine}${open}\n${inviteHttps}`,
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
  // Кэш-код первым: Share должен открываться сразу после тапа. Серверный ensure
  // (2 round-trip'а: auth-link + ensure-код) нужен только когда кода ещё нет —
  // иначе на медленной сети системный шеринг открывался с многосекундной задержкой.
  let refCode = await getReferralCode();
  if (!refCode || refCode.trim().length < 4) {
    refCode = await generateReferralCode(params.userName || 'User');
  }
  if (!refCode || refCode.trim().length < 4) return null;
  const { https: inviteHttps } = buildReferralShareLinks(refCode);
  const { lang } = params;
  // One public invite URL is enough: the landing page handles app-open/store routing.
  return buildReferralInviteShare(lang, inviteHttps, refCode);
}

/* expo-router route shim: utility module under app/ */
export default function __RouteShim() {
  return null;
}
