/*
 * Текст статуса account_switch_still_running (Дизайн, 04.10) — 9 языков, без жаргона.
 *
 * зачем: оверлей «стираю» после 45 с не обрывает смену аккаунта, а показывает статус «ещё идёт»
 * (app/account_switch_deadline.ts). Смена возобновляется на следующем старте
 * (resumePendingAccountSwitchQuarantine), поэтому честно говорим «можно закрыть — закончим при
 * следующем запуске», а не прежнее «не закрывай приложение».
 * Отдельный модуль, потому что account_switch_deadline.ts сейчас в работе AccountV2: подключают
 * они — заменой accountSwitchStillRunningDraft(lang) на accountSwitchStillRunningCopy(lang).
 */
import { triLang, type Lang } from '../constants/i18n';

export type AccountSwitchStillRunningText = Readonly<{ key: 'account_switch_still_running'; title: string; body: string }>;

export function accountSwitchStillRunningCopy(lang: Lang): AccountSwitchStillRunningText {
  return {
    key: 'account_switch_still_running',
    title: triLang(lang, {
      ru: 'Смена аккаунта ещё идёт',
      uk: 'Зміна акаунта ще триває',
      en: 'Still switching accounts',
      es: 'El cambio de cuenta sigue en curso',
      'pt-BR': 'A troca de conta ainda está em andamento',
      vi: 'Vẫn đang đổi tài khoản',
      id: 'Pergantian akun masih berjalan',
      tr: 'Hesap değişikliği sürüyor',
      pl: 'Zmiana konta wciąż trwa',
    }),
    body: triLang(lang, {
      ru: 'Связь медленная. Прогресс в безопасности: если закрыть приложение, смена завершится при следующем запуске.',
      uk: 'Зв’язок повільний. Прогрес у безпеці: якщо закрити застосунок, зміна завершиться під час наступного запуску.',
      en: 'The connection is slow. Your progress is safe: if you close the app, the switch will finish the next time you open it.',
      es: 'La conexión es lenta. Tu progreso está a salvo: si cierras la app, el cambio terminará la próxima vez que la abras.',
      'pt-BR': 'A conexão está lenta. Seu progresso está seguro: se você fechar o app, a troca termina na próxima vez que abrir.',
      vi: 'Kết nối chậm. Tiến độ của bạn vẫn an toàn: nếu đóng ứng dụng, việc đổi tài khoản sẽ hoàn tất ở lần mở tiếp theo.',
      id: 'Koneksi lambat. Progresmu aman: jika aplikasi ditutup, pergantian akan selesai saat aplikasi dibuka lagi.',
      tr: 'Bağlantı yavaş. İlerlemen güvende: uygulamayı kapatırsan değişiklik bir sonraki açılışta tamamlanır.',
      pl: 'Połączenie jest wolne. Twój postęp jest bezpieczny: jeśli zamkniesz aplikację, zmiana dokończy się przy następnym uruchomieniu.',
    }),
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
