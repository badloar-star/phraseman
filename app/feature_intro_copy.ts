import { triLang, type Lang } from '../constants/i18n';
import type { FeatureIntroDef } from './feature_intro_registry';
import { mistakePracticeExplanation } from './mistake_practice_intro_copy';

export const featureGuideTitle = (lang: Lang) => triLang(lang, {
  ru: 'Как пользоваться', uk: 'Як користуватися', en: 'How it works', es: 'Cómo funciona',
  'pt-BR': 'Como funciona', vi: 'Cách sử dụng', id: 'Cara menggunakan', tr: 'Nasıl kullanılır', pl: 'Jak to działa',
});
export const featureIntroClose = (lang: Lang) => triLang(lang, {
  ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
});
export const APPROVED_FEATURE_INTROS: readonly FeatureIntroDef[] = [{
  id: 'mistake_practice_help', trigger: 'condition', icon: 'refresh-circle-outline', family: 'premiere', art: 'mistake_practice',
  title: lang => triLang(lang, { ru: 'Работа над ошибками', uk: 'Робота над помилками', en: 'Mistake practice', es: 'Practicar errores', 'pt-BR': 'Praticar erros', vi: 'Luyện lỗi sai', id: 'Latihan kesalahan', tr: 'Hata çalışması', pl: 'Praca nad błędami' }),
  body: mistakePracticeExplanation,
  ctaLabel: featureIntroClose,
}, {
  id: 'league_rules_first_visit', trigger: 'first_visit', screenRoute: '/club_screen', icon: 'trophy', family: 'premiere', art: 'league',
  title: lang => triLang(lang, {
    ru: 'Твоя неделя в Лиге', uk: 'Твій тиждень у Лізі', en: 'Your week in the League', es: 'Tu semana en la Liga',
    'pt-BR': 'Sua semana na Liga', vi: 'Tuần của bạn trong Giải đấu', id: 'Pekanmu di Liga', tr: 'Ligindeki haftan', pl: 'Twój tydzień w Lidze',
  }),
  body: lang => triLang(lang, {
    ru: 'Занимайся и набирай руны, которые учитываются в Лиге. По итогам недели таблица определит твой результат.',
    uk: 'Займайся та збирай руни, які зараховуються в Лізі. Наприкінці тижня таблиця визначить твій результат.',
    en: 'Practise and earn runes that count towards the League. Your position at the end of the week determines your result.',
    es: 'Practica y consigue runas que cuenten para la Liga. Tu posición al final de la semana determina el resultado.',
    'pt-BR': 'Pratique e ganhe runas que contam para a Liga. Sua posição no fim da semana determina o resultado.',
    vi: 'Luyện tập và kiếm rune được tính vào Giải đấu. Vị trí cuối tuần quyết định kết quả của bạn.',
    id: 'Berlatih dan kumpulkan rune yang dihitung di Liga. Posisimu di akhir pekan menentukan hasilnya.',
    tr: 'Çalış ve Lige sayılan rünler kazan. Hafta sonundaki sıran sonucunu belirler.',
    pl: 'Ćwicz i zdobywaj runy liczące się w Lidze. Pozycja na koniec tygodnia określa wynik.',
  }),
  ctaLabel: lang => triLang(lang, {
    ru: 'К таблице', uk: 'До таблиці', en: 'See the standings', es: 'Ver clasificación', 'pt-BR': 'Ver classificação',
    vi: 'Xem bảng xếp hạng', id: 'Lihat klasemen', tr: 'Sıralamayı gör', pl: 'Zobacz tabelę',
  }),
}, {
  id: 'cards_swipe_help', trigger: 'first_visit', screenRoute: '/flashcards_swipe', icon: 'albums', family: 'orbit', art: 'cards_swipe',
  title: lang => triLang(lang, {
    ru: 'Карточки в движении', uk: 'Картки в русі', en: 'Cards in motion', es: 'Tarjetas en movimiento', 'pt-BR': 'Cartões em movimento',
    vi: 'Thẻ chuyển động', id: 'Kartu bergerak', tr: 'Hareketli kartlar', pl: 'Karty w ruchu',
  }),
  body: lang => triLang(lang, {
    ru: 'Смахни карточку влево или вправо. Кнопки под ней выполняют те же действия: акробатика пальцами не обязательна.',
    uk: 'Змахни картку вліво або вправо. Кнопки під нею виконують ті самі дії: акробатика пальцями необов’язкова.',
    en: 'Swipe left or right. The buttons below the card do the same things: finger acrobatics are optional.',
    es: 'Desliza a izquierda o derecha. Los botones bajo la tarjeta hacen lo mismo, sin acrobacias.',
    'pt-BR': 'Deslize para a esquerda ou direita. Os botões abaixo do cartão fazem o mesmo, sem acrobacias.',
    vi: 'Vuốt trái hoặc phải. Các nút dưới thẻ thực hiện cùng thao tác, không cần múa ngón tay.',
    id: 'Geser ke kiri atau kanan. Tombol di bawah kartu melakukan hal yang sama, tanpa akrobat jari.',
    tr: 'Sola veya sağa kaydır. Kartın altındaki düğmeler de aynı işlemleri yapar, parmak akrobasisi şart değil.',
    pl: 'Przesuń w lewo lub w prawo. Przyciski pod kartą robią to samo, bez akrobacji palcami.',
  }),
  ctaLabel: lang => triLang(lang, {
    ru: 'Понятно, попробуем', uk: 'Зрозуміло, спробуймо', en: 'Got it, let’s try', es: 'Entendido, vamos', 'pt-BR': 'Entendi, vamos tentar',
    vi: 'Hiểu rồi, thử thôi', id: 'Paham, ayo coba', tr: 'Anladım, deneyelim', pl: 'Jasne, spróbujmy',
  }),
}];
