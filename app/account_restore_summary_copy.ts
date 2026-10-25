/**
 * Тексты окна «Восстановить аккаунт?» со сводкой (координатор 25.10, макет account-delete-variant-b §3, владелец «Да, так»).
 *
 * зачем: строки ×9 — от Переводчика (docs/work/tasks/delete-variant-b-mockup-strings-2026-10-25.md, «Окно 3»), формы
 * числа — общим pluralWord. Связка «3 из 32» в таблице Переводчика не дана: моя, на вычитку Переводчику (vi, tr — «3/32»,
 * там «из» в такой подписи не говорят).
 */
import { triLang, type Lang } from '../constants/i18n';
import { pluralWord } from '../constants/plural';
import type { AccountRestoreSummary } from './account_delete_restore_client';

export type AccountRestoreSummaryCell = Readonly<{ value: string; label: string }>;

function dayWord(lang: Lang, n: number): string {
  return triLang(lang, {
    ru: pluralWord('ru', n, { one: 'день', few: 'дня', many: 'дней' }),
    uk: pluralWord('uk', n, { one: 'день', few: 'дні', many: 'днів' }),
    en: pluralWord('en', n, { one: 'day', few: 'days', many: 'days' }),
    es: pluralWord('es', n, { one: 'día', few: 'días', many: 'días' }),
    'pt-BR': pluralWord('pt-BR', n, { one: 'dia', few: 'dias', many: 'dias' }),
    vi: 'ngày',
    id: 'hari',
    tr: 'gün',
    pl: pluralWord('pl', n, { one: 'dzień', few: 'dni', many: 'dni' }),
  });
}

/** «Аккаунт удалится через 11 дней. Весь прогресс ещё на месте.» */
export function accountRestoreSummaryMessage(lang: Lang, rawDays: number): string {
  const n = Math.max(1, Math.trunc(Number.isFinite(rawDays) ? rawDays : 1));
  const days = `${n} ${dayWord(lang, n)}`;
  return triLang(lang, {
    ru: `Аккаунт удалится через ${days}. Весь прогресс ещё на месте.`,
    uk: `Акаунт видалиться через ${days}. Увесь прогрес ще на місці.`,
    en: `Your account will be deleted in ${days}. All your progress is still here.`,
    es: `La cuenta se eliminará en ${days}. Todo tu progreso sigue aquí.`,
    'pt-BR': `A conta será excluída em ${days}. Todo o seu progresso ainda está aqui.`,
    vi: `Tài khoản sẽ bị xóa sau ${days}. Toàn bộ tiến độ vẫn còn nguyên.`,
    id: `Akun akan dihapus dalam ${days}. Semua progresmu masih ada.`,
    tr: `Hesap ${days} sonra silinecek. Tüm ilerlemen hâlâ yerinde.`,
    pl: `Konto zostanie usunięte za ${days}. Cały postęp wciąż jest na miejscu.`,
  });
}

/** Три ячейки плашки: «12 дней · серия», «140 · фраз», «3 из 32 · уроков». */
export function accountRestoreSummaryCells(lang: Lang, summary: AccountRestoreSummary): readonly AccountRestoreSummaryCell[] {
  const streak = summary.streakDays;
  const phrases = summary.phrasesLearned;
  const { currentLesson: c, lessonTotal: t } = summary;
  return [
    {
      value: `${streak} ${dayWord(lang, streak)}`,
      label: triLang(lang, { ru: 'серия', uk: 'серія', en: 'streak', es: 'racha', 'pt-BR': 'sequência', vi: 'chuỗi', id: 'rangkaian', tr: 'seri', pl: 'seria' }),
    },
    {
      value: String(phrases),
      label: triLang(lang, {
        ru: pluralWord('ru', phrases, { one: 'фраза', few: 'фразы', many: 'фраз' }),
        uk: pluralWord('uk', phrases, { one: 'вислів', few: 'вислови', many: 'висловів' }),
        en: pluralWord('en', phrases, { one: 'phrase', few: 'phrases', many: 'phrases' }),
        es: pluralWord('es', phrases, { one: 'frase', few: 'frases', many: 'frases' }),
        'pt-BR': pluralWord('pt-BR', phrases, { one: 'frase', few: 'frases', many: 'frases' }),
        vi: 'câu',
        id: 'frasa',
        tr: 'ifade',
        pl: pluralWord('pl', phrases, { one: 'zwrot', few: 'zwroty', many: 'zwrotów' }),
      }),
    },
    {
      value: triLang(lang, {
        ru: `${c} из ${t}`, uk: `${c} з ${t}`, en: `${c} of ${t}`, es: `${c} de ${t}`, 'pt-BR': `${c} de ${t}`,
        vi: `${c}/${t}`, id: `${c} dari ${t}`, tr: `${c}/${t}`, pl: `${c} z ${t}`,
      }),
      label: triLang(lang, { ru: 'уроков', uk: 'уроків', en: 'lessons', es: 'lecciones', 'pt-BR': 'lições', vi: 'bài học', id: 'pelajaran', tr: 'ders', pl: 'lekcji' }),
    },
  ];
}
