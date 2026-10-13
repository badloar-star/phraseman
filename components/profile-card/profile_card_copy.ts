// ─── Визитка 2.0: тексты ru/uk/en/es + pt-BR/vi/id/tr/pl (profile_card_copy_more.ts) ─
// зачем: тексты сняты с макета profile-card-pro.html дословно (ru). Пять языков —
// отдельной таблицей по тем же ключам; нет ключа — английский.
import { triLang, type Lang } from '../../constants/i18n';
import { PC_MORE } from './profile_card_copy_more';

type Four = Readonly<{ ru: string; uk: string; en: string; es: string }>;

export function t4(lang: Lang, copy: Four): string {
  const more = MORE_BY_COPY.get(copy);
  return triLang(lang, {
    ru: copy.ru, uk: copy.uk, es: copy.es, en: copy.en,
    'pt-BR': more?.['pt-BR'] ?? copy.en,
    vi: more?.vi ?? copy.en,
    id: more?.id ?? copy.en,
    tr: more?.tr ?? copy.en,
    pl: more?.pl ?? copy.en,
  });
}

export function formatCoins(value: number): string {
  return Math.max(0, Math.trunc(value)).toLocaleString('ru-RU').replace(/ /g, ' ');
}

export const PC = {
  close: { ru: 'Закрыть визитку', uk: 'Закрити візитку', en: 'Close card', es: 'Cerrar tarjeta' },
  more: { ru: 'Ещё: пожаловаться на игрока', uk: 'Ще: поскаржитися на гравця', en: 'More: report player', es: 'Más: reportar jugador' },
  share: { ru: 'Поделиться визиткой', uk: 'Поділитися візиткою', en: 'Share card', es: 'Compartir tarjeta' },
  rank: { ru: 'ранг', uk: 'ранг', en: 'rank', es: 'rango' },
  addFriend: { ru: 'Добавить в друзья', uk: 'Додати в друзі', en: 'Add friend', es: 'Añadir amigo' },
  requestSent: { ru: 'Заявка отправлена', uk: 'Заявку надіслано', en: 'Request sent', es: 'Solicitud enviada' },
  friends: { ru: 'Вы друзья', uk: 'Ви друзі', en: 'Friends', es: 'Amigos' },
  like: { ru: 'Лайк за активность', uk: 'Вподобання за активність', en: 'Like for activity', es: 'Me gusta por actividad' },
  upgrade: { ru: 'Повысить ранг', uk: 'Підвищити ранг', en: 'Upgrade rank', es: 'Subir rango' },
  upgrading: { ru: 'Повышаем ранг…', uk: 'Підвищуємо ранг…', en: 'Upgrading…', es: 'Subiendo rango…' },
  maxRank: { ru: 'Высший ранг', uk: 'Найвищий ранг', en: 'Top rank', es: 'Rango máximo' },
  more2: { ru: 'ещё', uk: 'ще', en: 'need', es: 'faltan' },
  proCard: { ru: 'Про визитка', uk: 'Про візитка', en: 'Pro card', es: 'Tarjeta Pro' },
  style: { ru: 'Стиль', uk: 'Стиль', en: 'Style', es: 'Estilo' },
  free: { ru: 'бесплатно', uk: 'безкоштовно', en: 'free', es: 'gratis' },
  freeCap: { ru: 'Бесплатно', uk: 'Безкоштовно', en: 'Free', es: 'Gratis' },
  lock: { ru: 'Свой текст — в Про визитке', uk: 'Свій текст — у Про візитці', en: 'Your own text — with a Pro card', es: 'Tu texto — en la tarjeta Pro' },
  addBio: { ru: 'Добавить свой текст', uk: 'Додати свій текст', en: 'Add your text', es: 'Añadir tu texto' },
  editBio: { ru: 'Изменить текст визитки', uk: 'Змінити текст візитки', en: 'Edit card text', es: 'Editar texto de la tarjeta' },
  newRank: { ru: 'Новый ранг', uk: 'Новий ранг', en: 'New rank', es: 'Nuevo rango' },
  // Покупка / стиль
  sheetBuy: { ru: 'Про визитка', uk: 'Про візитка', en: 'Pro card', es: 'Tarjeta Pro' },
  sheetStyle: { ru: 'Стиль визитки', uk: 'Стиль візитки', en: 'Card style', es: 'Estilo de la tarjeta' },
  youHave: { ru: 'У тебя', uk: 'У тебе', en: 'You have', es: 'Tienes' },
  buyFor: { ru: 'Взять за', uk: 'Взяти за', en: 'Get for', es: 'Obtener por' },
  needMore: { ru: 'Нужно ещё', uk: 'Потрібно ще', en: 'Need', es: 'Faltan' },
  coinsWord: { ru: 'монет', uk: 'монет', en: 'coins', es: 'monedas' },
  applyStyle: { ru: 'Применить стиль', uk: 'Застосувати стиль', en: 'Apply style', es: 'Aplicar estilo' },
  styleA11y: { ru: 'Стиль', uk: 'Стиль', en: 'Style', es: 'Estilo' },
  bought: { ru: 'Про визитка твоя', uk: 'Про візитка твоя', en: 'The Pro card is yours', es: 'La tarjeta Pro es tuya' },
  // Текст
  sheetText: { ru: 'Текст визитки', uk: 'Текст візитки', en: 'Card text', es: 'Texto de la tarjeta' },
  textHint: { ru: 'Его увидят все, кто откроет твою визитку', uk: 'Його побачать усі, хто відкриє твою візитку', en: 'Everyone who opens your card will see it', es: 'Lo verá quien abra tu tarjeta' },
  cancel: { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar' },
  save: { ru: 'Сохранить', uk: 'Зберегти', en: 'Save', es: 'Guardar' },
  // Ошибки и итоги
  notEnough: { ru: 'Монет недостаточно. Баланс проверен и обновлён.', uk: 'Монет недостатньо. Баланс перевірено й оновлено.', en: 'Not enough coins. Your balance was verified.', es: 'No hay monedas suficientes. Saldo verificado.' },
  balanceUnknown: { ru: 'Не удалось подтвердить баланс. Попробуй позже.', uk: 'Не вдалося підтвердити баланс. Спробуй пізніше.', en: 'Could not verify the balance. Try later.', es: 'No se pudo verificar el saldo. Inténtalo más tarde.' },
  rankChanged: { ru: 'Ранг изменился. Данные обновлены.', uk: 'Ранг змінився. Дані оновлено.', en: 'Your rank changed. Refreshed.', es: 'Tu rango cambió. Actualizado.' },
  rankAlready: { ru: 'Ранг уже повышен. Монеты повторно не списаны.', uk: 'Ранг уже підвищено. Монети повторно не списано.', en: 'Rank already upgraded. No second charge.', es: 'Rango ya subido. Sin segundo cobro.' },
  accountChanged: { ru: 'Аккаунт изменился. Ничего не списано.', uk: 'Акаунт змінився. Нічого не списано.', en: 'The account changed. Nothing was charged.', es: 'La cuenta cambió. No se cobró nada.' },
  failedNoCharge: { ru: 'Не получилось. Монеты не списаны.', uk: 'Не вийшло. Монети не списано.', en: 'Did not work. No coins were charged.', es: 'No funcionó. No se cobraron monedas.' },
  alreadyPro: { ru: 'Про визитка уже твоя. Второй раз не списано.', uk: 'Про візитка вже твоя. Вдруге не списано.', en: 'The Pro card is already yours. No second charge.', es: 'La tarjeta Pro ya es tuya. Sin segundo cobro.' },
  styleFailed: { ru: 'Стиль не сменился. Попробуй ещё раз.', uk: 'Стиль не змінився. Спробуй ще раз.', en: 'Style did not change. Try again.', es: 'El estilo no cambió. Inténtalo de nuevo.' },
  bioSaved: { ru: 'Текст визитки сохранён', uk: 'Текст візитки збережено', en: 'Card text saved', es: 'Texto guardado' },
  bioProfanity: { ru: 'Текст не сохранён: убери грубые слова', uk: 'Текст не збережено: прибери грубі слова', en: 'Not saved: please remove rude words', es: 'No guardado: quita las palabras groseras' },
  bioTooLong: { ru: 'Текст не сохранён: не больше 80 символов', uk: 'Текст не збережено: не більше 80 символів', en: 'Not saved: 80 characters max', es: 'No guardado: máximo 80 caracteres' },
  bioLineBreak: { ru: 'Текст не сохранён: только одна строка', uk: 'Текст не збережено: лише один рядок', en: 'Not saved: one line only', es: 'No guardado: solo una línea' },
  bioControl: { ru: 'Текст не сохранён: в нём есть невидимые символы', uk: 'Текст не збережено: у ньому є невидимі символи', en: 'Not saved: it contains invisible characters', es: 'No guardado: contiene caracteres invisibles' },
  bioRate: { ru: 'Текст можно менять раз в минуту. Попробуй чуть позже', uk: 'Текст можна змінювати раз на хвилину. Спробуй трохи пізніше', en: 'You can change the text once a minute. Try again shortly', es: 'Puedes cambiar el texto una vez por minuto' },
  bioPro: { ru: 'Свой текст доступен только с Про визиткой', uk: 'Свій текст доступний лише з Про візиткою', en: 'Your own text needs a Pro card', es: 'Tu texto requiere la tarjeta Pro' },
  bioOffline: { ru: 'Нет связи. Текст не сохранён', uk: 'Немає зв’язку. Текст не збережено', en: 'No connection. Text not saved', es: 'Sin conexión. Texto no guardado' },
  bioFailed: { ru: 'Текст не сохранён. Попробуй ещё раз', uk: 'Текст не збережено. Спробуй ще раз', en: 'Text not saved. Try again', es: 'Texto no guardado. Inténtalo de nuevo' },
  shareText: { ru: 'Моя визитка в PhraseMan', uk: 'Моя візитка в PhraseMan', en: 'My PhraseMan card', es: 'Mi tarjeta de PhraseMan' },
  rankUnknown: { ru: 'Ранг игрока пока недоступен', uk: 'Ранг гравця поки недоступний', en: 'Player rank is not available yet', es: 'Rango aún no disponible' },
  activityLiked: { ru: 'Активность отмечена', uk: 'Активність відзначено', en: 'Activity liked', es: 'Actividad marcada' },
} as const satisfies Record<string, Four>;

// Сопоставление «объект текста → переводы» по ключу PC (ленивое, без копий строк).
const MORE_BY_COPY: ReadonlyMap<Four, (typeof PC_MORE)[string]> = new Map(
  Object.entries(PC).flatMap(([key, copy]) => (PC_MORE[key] ? [[copy as Four, PC_MORE[key]] as const] : [])),
);
