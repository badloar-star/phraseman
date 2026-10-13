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
      uk: 'Спочатку перемкнися на нього в Параметрах, щоб нічого не втратити.',
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

/**
 * Тот же отказ для ГОСТЯ в онбординге.
 * зачем (аудит Онбординга, Дизайн caeeb9cd9; координатор 12.10): общий текст отправлял гостя «в Настройки»,
 * а из онбординга туда не попасть, и кнопки смены аккаунта там нет. Говорим только правду и то, что можно
 * сделать прямо здесь: локальный прогресс не стёрт (вход отменён до стирания), можно продолжать без входа.
 * Заголовок общий («войти не получится»): код покрывает и чужую копию на телефоне, и нехватку места, и удаление.
 */
export function localProgressBackupBlockedGuestCopy(lang: Lang): LocalProgressBackupBlockedCopy {
  return {
    title: triLang(lang, {
      ru: 'Сейчас войти не получится',
      uk: 'Зараз увійти не вийде',
      en: "You can't sign in right now",
      es: 'Ahora no se puede iniciar sesión',
      'pt-BR': 'Não dá para entrar agora',
      vi: 'Hiện chưa thể đăng nhập',
      id: 'Belum bisa masuk sekarang',
      tr: 'Şu an giriş yapılamıyor',
      pl: 'Teraz nie da się zalogować',
    }),
    body: triLang(lang, {
      ru: 'Начатое на этом телефоне цело — продолжай без входа.',
      uk: 'Розпочате на цьому телефоні ціле — продовжуй без входу.',
      en: 'What you started on this phone is safe — keep going without signing in.',
      es: 'Lo que empezaste en este teléfono está a salvo: sigue sin iniciar sesión.',
      'pt-BR': 'O que você começou neste celular está salvo — continue sem entrar.',
      vi: 'Phần bạn đã bắt đầu trên điện thoại này vẫn an toàn — hãy tiếp tục mà không cần đăng nhập.',
      id: 'Yang kamu mulai di ponsel ini aman — lanjutkan tanpa masuk.',
      tr: 'Bu telefonda başladıkların güvende — giriş yapmadan devam et.',
      pl: 'Postęp z tego telefonu jest bezpieczny — kontynuuj bez logowania.',
    }),
    action: localProgressBackupBlockedCopy(lang).action,
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
