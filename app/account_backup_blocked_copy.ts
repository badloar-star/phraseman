/*
 * Текст отказа local_progress_backup_blocked (AccountV2 S2d, координатор 04.10) — 9 языков.
 *
 * зачем: на телефоне уже ждёт сохранённый прогресс ДРУГОГО аккаунта, поэтому приложение не может
 * положить рядом копию текущего — повтор входа не поможет. Человеку нужно одно действие: сначала
 * переключиться на тот аккаунт (кнопка ведёт в окно «Сменить аккаунт?», тот же переход, что у
 * account_switch_required). Для настоящего сбоя связи остаётся local_progress_not_uploaded
 * (app/account_sync_copy.ts). Отдельный файл, потому что account_sync_copy.ts сейчас в работе AccountV2.
 */
import { triLang, type Lang } from '../constants/i18n';

export interface LocalProgressBackupBlockedCopy {
  readonly title: string;
  readonly body: string;
  readonly action: string;
}

export function localProgressBackupBlockedCopy(lang: Lang): LocalProgressBackupBlockedCopy {
  return {
    title: triLang(lang, {
      ru: 'На телефоне ждёт прогресс другого аккаунта',
      uk: 'На телефоні чекає прогрес іншого акаунта',
      en: 'Progress from another account is waiting on this phone',
      es: 'En este teléfono hay progreso de otra cuenta esperando',
      'pt-BR': 'Há progresso de outra conta esperando neste celular',
      vi: 'Tiến độ của một tài khoản khác đang chờ trên điện thoại này',
      id: 'Ada progres akun lain yang menunggu di ponsel ini',
      tr: 'Bu telefonda başka bir hesabın ilerlemesi bekliyor',
      pl: 'Na tym telefonie czeka postęp innego konta',
    }),
    body: triLang(lang, {
      ru: 'Сначала переключись на него в Настройках, чтобы ничего не потерять.',
      uk: 'Спочатку перемкнися на нього в Налаштуваннях, щоб нічого не втратити.',
      en: 'Switch to that account in Settings first so nothing gets lost.',
      es: 'Primero cambia a esa cuenta en Ajustes para no perder nada.',
      'pt-BR': 'Primeiro troque para essa conta em Ajustes para não perder nada.',
      vi: 'Hãy chuyển sang tài khoản đó trong Cài đặt trước để không mất gì.',
      id: 'Pindah dulu ke akun itu di Pengaturan agar tidak ada yang hilang.',
      tr: 'Hiçbir şey kaybolmasın diye önce Ayarlar’dan o hesaba geç.',
      pl: 'Najpierw przełącz się na to konto w Ustawieniach, żeby nic nie przepadło.',
    }),
    action: triLang(lang, {
      ru: 'Сменить аккаунт',
      uk: 'Змінити акаунт',
      en: 'Switch account',
      es: 'Cambiar de cuenta',
      'pt-BR': 'Trocar de conta',
      vi: 'Đổi tài khoản',
      id: 'Ganti akun',
      tr: 'Hesap değiştir',
      pl: 'Zmień konto',
    }),
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
