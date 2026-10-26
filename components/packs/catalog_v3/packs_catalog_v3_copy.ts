// ═══════════════════════════════════════════════════════════════════════════
// packs_catalog_v3_copy.ts — тексты каталога наборов на «Сцене» (9 языков, черновик до утверждения Переводчика).
//
// зачем (слово владельца 26.10: «никаких новых мелких подписей»): на экране только то, без чего не обойтись — заголовок конкурса, дни до конца,
// своё место, «Создать набор» и пустое состояние. Всё остальное — значки и числа. Переводы коротких слов — черновые: утверждает Переводчик.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../constants/i18n';

export type PacksCatalogV3TextKey = 'contestTitle' | 'myPlace' | 'notInContest' | 'create' | 'empty' | 'daysLeft' | 'cardsA11y' | 'likesA11y' | 'openPack';

export function packsCatalogV3Text(lang: Lang, key: PacksCatalogV3TextKey, n?: number): string {
  const num = String(n ?? 0);
  switch (key) {
    case 'contestTitle':
      return triLang(lang, {
        ru: 'Набор месяца', uk: 'Набір місяця', en: 'Pack of the month', es: 'Pack del mes',
        'pt-BR': 'Pacote do mês', vi: 'Bộ thẻ của tháng', id: 'Paket bulan ini', tr: 'Ayın paketi', pl: 'Zestaw miesiąca',
      });
    case 'myPlace':
      return triLang(lang, {
        ru: `Твоё место — ${num}`, uk: `Твоє місце — ${num}`, en: `Your place — ${num}`, es: `Tu puesto — ${num}`,
        'pt-BR': `Seu lugar — ${num}`, vi: `Hạng của bạn — ${num}`, id: `Peringkatmu — ${num}`, tr: `Sıran — ${num}`, pl: `Twoje miejsce — ${num}`,
      });
    case 'notInContest':
      return triLang(lang, {
        ru: 'Твоих наборов в конкурсе пока нет', uk: 'Твоїх наборів у конкурсі поки немає', en: 'None of your packs are in yet',
        es: 'Aún no tienes packs en el concurso', 'pt-BR': 'Você ainda não tem pacotes no concurso', vi: 'Bạn chưa có bộ thẻ nào tham gia',
        id: 'Belum ada paketmu di kontes', tr: 'Henüz yarışmada paketin yok', pl: 'Nie masz jeszcze zestawów w konkursie',
      });
    case 'create':
      return triLang(lang, {
        ru: 'Создать набор', uk: 'Створити набір', en: 'Create a pack', es: 'Crear un pack',
        'pt-BR': 'Criar um pacote', vi: 'Tạo bộ thẻ', id: 'Buat paket', tr: 'Paket oluştur', pl: 'Utwórz zestaw',
      });
    case 'empty':
      return triLang(lang, {
        ru: 'Здесь пока пусто', uk: 'Тут поки порожньо', en: 'Nothing here yet', es: 'Aún no hay nada',
        'pt-BR': 'Ainda não há nada aqui', vi: 'Chưa có gì ở đây', id: 'Belum ada apa-apa', tr: 'Burada henüz bir şey yok', pl: 'Na razie pusto',
      });
    case 'daysLeft':
      return triLang(lang, {
        ru: `${num} дн.`, uk: `${num} дн.`, en: `${num} d`, es: `${num} d`,
        'pt-BR': `${num} d`, vi: `${num} ngày`, id: `${num} hr`, tr: `${num} gün`, pl: `${num} dni`,
      });
    case 'cardsA11y':
      return triLang(lang, {
        ru: 'карточек', uk: 'карток', en: 'cards', es: 'tarjetas',
        'pt-BR': 'cartões', vi: 'thẻ', id: 'kartu', tr: 'kart', pl: 'kart',
      });
    case 'likesA11y':
      return triLang(lang, {
        ru: 'лайков', uk: 'лайків', en: 'likes', es: 'me gusta',
        'pt-BR': 'curtidas', vi: 'lượt thích', id: 'suka', tr: 'beğeni', pl: 'polubień',
      });
    case 'openPack':
      return triLang(lang, {
        ru: 'Открыть набор', uk: 'Відкрити набір', en: 'Open pack', es: 'Abrir pack',
        'pt-BR': 'Abrir pacote', vi: 'Mở bộ thẻ', id: 'Buka paket', tr: 'Paketi aç', pl: 'Otwórz zestaw',
      });
    default:
      return '';
  }
}
