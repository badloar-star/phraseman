// ═══════════════════════════════════════════════════════════════════════════
// packs_catalog_v3_screens_copy.ts — тексты экранов макета «Наборов»: экран набора, подача набора, «Условия участия», праздничное окно (черновик).
//
// зачем (слово владельца через координатора 26.10: «минимум кнопок, без мелких подписей»): только то, без чего экран непонятен. Языки ru/uk/en/es — как требует triLang,
// остальные пять берут en (запасной путь словаря); полные переводы утверждает Переводчик после одобрения макета владельцем. Размеры призов НЕ выдуманы: «Plus и монеты» —
// как сказал владелец, числа призов решает он.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../constants/i18n';

export type PackScreensTextKey =
  | 'back' | 'addToMine' | 'added' | 'cards'
  | 'submitTitle' | 'nameField' | 'publish' | 'aiChecking' | 'aiApply'
  | 'rulesTitle' | 'rule1' | 'rule2' | 'rule3' | 'prizes' | 'prizeFirst' | 'prizeOther' | 'gotIt'
  | 'win1' | 'win2' | 'win3' | 'winMonth' | 'claim' | 'claimCoins';

export function packScreensText(lang: Lang, key: PackScreensTextKey): string {
  switch (key) {
    case 'back': return triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás' });
    case 'addToMine': return triLang(lang, { ru: 'Добавить себе', uk: 'Додати собі', en: 'Add to mine', es: 'Añadir a los míos' });
    case 'added': return triLang(lang, { ru: 'Добавлено', uk: 'Додано', en: 'Added', es: 'Añadido' });
    case 'cards': return triLang(lang, { ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas' });
    case 'submitTitle': return triLang(lang, { ru: 'Новый набор', uk: 'Новий набір', en: 'New pack', es: 'Nuevo pack' });
    case 'nameField': return triLang(lang, { ru: 'Название набора', uk: 'Назва набору', en: 'Pack name', es: 'Nombre del pack' });
    case 'publish': return triLang(lang, { ru: 'Опубликовать и участвовать', uk: 'Опублікувати й брати участь', en: 'Publish and take part', es: 'Publicar y participar' });
    case 'aiChecking': return triLang(lang, { ru: 'ИИ проверяет', uk: 'ШІ перевіряє', en: 'AI is checking', es: 'La IA revisa' });
    case 'aiApply': return triLang(lang, { ru: 'Исправить', uk: 'Виправити', en: 'Fix', es: 'Corregir' });
    case 'rulesTitle': return triLang(lang, { ru: 'Условия участия', uk: 'Умови участі', en: 'How to take part', es: 'Cómo participar' });
    case 'rule1': return triLang(lang, { ru: 'Участвуют все новые наборы месяца', uk: 'Беруть участь усі нові набори місяця', en: 'Every new pack of the month takes part', es: 'Participan todos los packs nuevos del mes' });
    case 'rule2': return triLang(lang, { ru: 'Голос — лайк. Один человек — один лайк', uk: 'Голос — лайк. Одна людина — один лайк', en: 'A vote is a like. One person, one like', es: 'Un voto es un me gusta. Una persona, un me gusta' });
    case 'rule3': return triLang(lang, { ru: 'Итоги — в последний день месяца', uk: 'Підсумки — в останній день місяця', en: 'Results come on the last day of the month', es: 'Los resultados llegan el último día del mes' });
    case 'prizes': return triLang(lang, { ru: 'Призы', uk: 'Призи', en: 'Prizes', es: 'Premios' });
    case 'prizeFirst': return triLang(lang, { ru: 'Plus и монеты', uk: 'Plus і монети', en: 'Plus and coins', es: 'Plus y monedas' });
    case 'prizeOther': return triLang(lang, { ru: 'Монеты', uk: 'Монети', en: 'Coins', es: 'Monedas' });
    case 'gotIt': return triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', en: 'Got it', es: 'Entendido' });
    case 'win1': return triLang(lang, { ru: 'Твой набор — первый!', uk: 'Твій набір — перший!', en: 'Your pack is first!', es: '¡Tu pack es el primero!' });
    case 'win2': return triLang(lang, { ru: 'Твой набор — второй!', uk: 'Твій набір — другий!', en: 'Your pack is second!', es: '¡Tu pack es el segundo!' });
    case 'win3': return triLang(lang, { ru: 'Твой набор — третий!', uk: 'Твій набір — третій!', en: 'Your pack is third!', es: '¡Tu pack es el tercero!' });
    case 'winMonth': return triLang(lang, { ru: 'Набор месяца', uk: 'Набір місяця', en: 'Pack of the month', es: 'Pack del mes' });
    case 'claim': return triLang(lang, { ru: 'Забрать приз', uk: 'Забрати приз', en: 'Claim the prize', es: 'Recoger el premio' });
    case 'claimCoins': return triLang(lang, { ru: 'Забрать монеты', uk: 'Забрати монети', en: 'Claim the coins', es: 'Recoger las monedas' });
    default: return '';
  }
}
