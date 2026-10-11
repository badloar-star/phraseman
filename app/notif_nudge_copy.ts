/**
 * Тексты окна «Включи напоминания» (нудж после пропущенных дней) на 9 языках.
 *
 * зачем (координатор 12.10): в app/_layout.tsx окно было написано цепочкой `lang === 'es' ? … : lang === 'uk' ? … : по-русски` —
 * португальцы, вьетнамцы, индонезийцы, турки и поляки получали русский. Строки вынесены сюда, чтобы не плодить правки в _layout.tsx
 * (его правит Ядро) и покрыть тестом. Род нейтральный: «Без практики: 3 дня», а не «Ты пропустил».
 */
import type { Lang } from '../constants/i18n';
import { onboardingDaysWord, onboardingLangKey, type OnboardingLangKey } from '../components/onboarding/clean_onboarding_dates';

export type NotifNudgeCopy = Readonly<{
  title: string;
  body: string;
  points: string[];
  confirmLabel: string;
  cancelLabel: string;
}>;

type Entry = Readonly<{
  title: (n: number, days: string) => string;
  body: string;
  points: readonly [string, string, string];
  confirmLabel: string;
  cancelLabel: string;
}>;

const COPY: Readonly<Record<OnboardingLangKey, Entry>> = {
  ru: {
    title: (n, days) => `Без практики: ${n} ${days}`,
    body: 'Чтобы не срывать серию, включи напоминания. Мы напомним вовремя и без спама.',
    points: ['Напоминания в нужное время', 'Поддержка цепочки и прогресса', 'Отключается в любой момент'],
    confirmLabel: 'Включить напоминания',
    cancelLabel: 'Позже',
  },
  uk: {
    title: (n, days) => `Без практики: ${n} ${days}`,
    body: 'Щоб не зривати серію, увімкни нагадування. Ми нагадаємо вчасно і без спаму.',
    points: ['Нагадування в потрібний час', 'Підтримка стріку та прогресу', 'Вимикається в будь-який момент'],
    confirmLabel: 'Увімкнути нагадування',
    cancelLabel: 'Пізніше',
  },
  en: {
    title: (n, days) => `${n} ${days} without practice`,
    body: 'To keep your streak, turn on reminders. We’ll nudge you on time, no spam.',
    points: ['Reminders at the right time', 'Helps keep your streak and progress', 'You can turn them off anytime'],
    confirmLabel: 'Turn on reminders',
    cancelLabel: 'Later',
  },
  es: {
    title: (n, days) => `Llevas ${n} ${days} sin practicar`,
    body: 'Para no perder la racha, activa los recordatorios. Te avisaremos a tiempo, sin molestar.',
    points: ['Recordatorios en el momento adecuado', 'Te ayudan a mantener la racha y el progreso', 'Puedes desactivarlos en cualquier momento'],
    confirmLabel: 'Activar recordatorios',
    cancelLabel: 'Más tarde',
  },
  'pt-BR': {
    title: (n, days) => `Você está há ${n} ${days} sem praticar`,
    body: 'Para não perder a sequência, ative os lembretes. Avisamos na hora certa, sem spam.',
    points: ['Lembretes na hora certa', 'Ajudam a manter a sequência e o progresso', 'Você pode desativar quando quiser'],
    confirmLabel: 'Ativar lembretes',
    cancelLabel: 'Mais tarde',
  },
  vi: {
    title: (n, days) => `Bạn đã ${n} ${days} chưa luyện tập`,
    body: 'Để không mất chuỗi ngày học, hãy bật nhắc nhở. Chúng tôi nhắc đúng lúc, không spam.',
    points: ['Nhắc nhở đúng lúc', 'Giúp giữ chuỗi ngày và tiến độ', 'Tắt bất cứ lúc nào'],
    confirmLabel: 'Bật nhắc nhở',
    cancelLabel: 'Để sau',
  },
  id: {
    title: (n, days) => `Sudah ${n} ${days} kamu tidak berlatih`,
    body: 'Supaya rangkaian belajarmu tidak putus, aktifkan pengingat. Kami mengingatkan tepat waktu, tanpa spam.',
    points: ['Pengingat di waktu yang tepat', 'Membantu menjaga rangkaian dan progres', 'Bisa dimatikan kapan saja'],
    confirmLabel: 'Aktifkan pengingat',
    cancelLabel: 'Nanti',
  },
  tr: {
    title: (n) => `${n} gündür çalışmadın`,
    body: 'Serini bozmamak için hatırlatmaları aç. Zamanında ve spam olmadan hatırlatırız.',
    points: ['Doğru zamanda hatırlatmalar', 'Seri ve ilerlemeni korumana yardım eder', 'İstediğin zaman kapatabilirsin'],
    confirmLabel: 'Hatırlatmaları aç',
    cancelLabel: 'Sonra',
  },
  pl: {
    title: (n, days) => `Bez ćwiczeń: ${n} ${days}`,
    body: 'Aby nie przerwać serii, włącz przypomnienia. Przypomnimy w porę i bez spamu.',
    points: ['Przypomnienia o właściwej porze', 'Pomagają utrzymać serię i postępy', 'Możesz je wyłączyć w dowolnym momencie'],
    confirmLabel: 'Włącz przypomnienia',
    cancelLabel: 'Później',
  },
};

export function notifNudgeCopy(lang: Lang | string, missedDays: number): NotifNudgeCopy {
  const key = onboardingLangKey(lang);
  const entry = COPY[key];
  const n = Math.max(1, Math.round(missedDays));
  return {
    title: entry.title(n, onboardingDaysWord(n, key)),
    body: entry.body,
    points: [...entry.points],
    confirmLabel: entry.confirmLabel,
    cancelLabel: entry.cancelLabel,
  };
}
