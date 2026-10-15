// Тексты празднования доступа на Liquid Glass.
// зачем: владелец 2026-09-29 — «1 в 1 с макета» overlays-specialist.html
// (OS-CELEBRATION-*). Единственная подтверждённая польза — «Без расхода энергии»
// (см. HANDOVER §6: у Plus энергия не расходуется); остальные права не выдумываем,
// поэтому старые обещания («всё открыто», «11 преимуществ») ушли.
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWithCount, type PluralForms } from '../../constants/plural';

export type CelebrationCopy = ReturnType<typeof celebrationLiquidCopy>;

/** Что дал промокод: N дней или навсегда (из ответа сервера). */
export type PromoReward = Readonly<{ kind: 'days' | 'lifetime'; days?: number }>;

// зачем (владелец ~11:20 15.10, вопрос 9А overlays-campaigns-007/008): экран «Промокод применён» называет срок по-человечески — «Plus на 30 дней» / «Plus навсегда» по данным промокода;
// прежняя строка про срок «по записи аккаунта» убрана. Слово «день» склоняется по числу (ru/uk/pl — три формы).
const DAY_FORMS: Readonly<Record<string, PluralForms>> = {
  ru: { one: 'день', few: 'дня', many: 'дней' },
  uk: { one: 'день', few: 'дні', many: 'днів' },
  en: { one: 'day', few: 'days', many: 'days' },
  es: { one: 'día', few: 'días', many: 'días' },
  'pt-BR': { one: 'dia', few: 'dias', many: 'dias' },
  vi: { one: 'ngày', few: 'ngày', many: 'ngày' },
  id: { one: 'hari', few: 'hari', many: 'hari' },
  tr: { one: 'gün', few: 'gün', many: 'gün' },
  pl: { one: 'dzień', few: 'dni', many: 'dni' },
};

/** «Plus на 30 дней» / «Plus навсегда» на 9 языках; нет данных о сроке — null (строку не рисуем). */
export function promoDurationText(lang: Lang, tier: string, reward: PromoReward | null | undefined): string | null {
  if (!reward) return null;
  if (reward.kind === 'lifetime') {
    return triLang(lang, { ru: `${tier} навсегда`, uk: `${tier} назавжди`, en: `${tier} forever`, es: `${tier} para siempre`, 'pt-BR': `${tier} para sempre`, vi: `${tier} vĩnh viễn`, id: `${tier} selamanya`, tr: `Kalıcı ${tier}`, pl: `${tier} na zawsze` });
  }
  const n = Math.floor(Number(reward.days ?? 0));
  if (!Number.isFinite(n) || n <= 0) return null;
  const days = pluralWithCount(lang, n, DAY_FORMS[lang] ?? DAY_FORMS.en);
  return triLang(lang, { ru: `${tier} на ${days}`, uk: `${tier} на ${days}`, en: `${tier} for ${days}`, es: `${tier} por ${days}`, 'pt-BR': `${tier} por ${days}`, vi: `${tier} trong ${days}`, id: `${tier} selama ${days}`, tr: `${n} günlük ${tier}`, pl: `${tier} na ${days}` });
}

export function celebrationLiquidCopy(lang: Lang) {
  return {
    kicker: triLang(lang, { ru: 'Доступ подтверждён', uk: 'Доступ підтверджено', en: 'Access confirmed', es: 'Acceso confirmado', 'pt-BR': 'Acesso confirmado', vi: 'Đã xác nhận quyền truy cập', id: 'Akses dikonfirmasi', tr: 'Erişim onaylandı', pl: 'Dostęp potwierdzony' }),
    introSub: triLang(lang, { ru: 'Доступ подтверждён. Твой прогресс на месте.', uk: 'Доступ підтверджено. Твій прогрес на місці.', en: 'Access confirmed. Your progress is right where you left it.', es: 'Acceso confirmado. Tu progreso sigue en su lugar.', 'pt-BR': 'Acesso confirmado. Seu progresso está onde você deixou.', vi: 'Đã xác nhận quyền truy cập. Tiến độ của bạn vẫn còn nguyên.', id: 'Akses dikonfirmasi. Progresmu tetap di tempatnya.', tr: 'Erişim onaylandı. İlerlemen olduğu yerde duruyor.', pl: 'Dostęp potwierdzony. Twój postęp jest na miejscu.' }),
    benefitsTitle: triLang(lang, { ru: 'Занимайся без ожидания', uk: 'Займайся без очікування', en: 'Practice without waiting', es: 'Practica sin esperar', 'pt-BR': 'Estude sem esperar', vi: 'Học không phải chờ', id: 'Belajar tanpa menunggu', tr: 'Beklemeden çalış', pl: 'Ucz się bez czekania' }),
    benefitsSub: triLang(lang, { ru: 'Занятия не списывают энергию. Остальные права зависят от подтверждённого плана.', uk: 'Заняття не списують енергію. Інші права залежать від підтвердженого плану.', en: 'Lessons do not spend energy. Other rights depend on your confirmed plan.', es: 'Las clases no gastan energía. Los demás derechos dependen de tu plan confirmado.', 'pt-BR': 'As aulas não gastam energia. Os demais direitos dependem do seu plano confirmado.', vi: 'Các buổi học không tiêu hao năng lượng. Các quyền khác phụ thuộc vào gói đã xác nhận.', id: 'Sesi belajar tidak menghabiskan energi. Hak lainnya bergantung pada paket yang dikonfirmasi.', tr: 'Dersler enerji harcamaz. Diğer haklar onaylanan planına bağlıdır.', pl: 'Lekcje nie zużywają energii. Pozostałe prawa zależą od potwierdzonego planu.' }),
    benefitCardTitle: triLang(lang, { ru: 'Без расхода энергии', uk: 'Без витрати енергії', en: 'No energy spent', es: 'Sin gasto de energía', 'pt-BR': 'Sem gasto de energia', vi: 'Không tốn năng lượng', id: 'Tanpa energi terpakai', tr: 'Enerji harcanmaz', pl: 'Bez zużycia energii' }),
    benefitCardBody: triLang(lang, { ru: 'Уроки и тренировки не уменьшают запас энергии.', uk: 'Уроки й тренування не зменшують запас енергії.', en: 'Lessons and practice do not reduce your energy.', es: 'Las clases y los entrenamientos no reducen tu energía.', 'pt-BR': 'Aulas e treinos não reduzem sua energia.', vi: 'Bài học và luyện tập không làm giảm năng lượng của bạn.', id: 'Pelajaran dan latihan tidak mengurangi energimu.', tr: 'Dersler ve alıştırmalar enerjini azaltmaz.', pl: 'Lekcje i ćwiczenia nie zmniejszają zapasu energii.' }),
    finaleTitle: triLang(lang, { ru: 'Всё готово', uk: 'Усе готово', en: 'All set', es: 'Todo listo', 'pt-BR': 'Tudo pronto', vi: 'Mọi thứ đã sẵn sàng', id: 'Semua siap', tr: 'Hepsi hazır', pl: 'Wszystko gotowe' }),
    finaleSub: triLang(lang, { ru: 'Продолжай с того места, где остановился(ась).', uk: 'Продовжуй з того місця, де зупинився(лась).', en: 'Continue where you left off.', es: 'Continúa donde lo dejaste.', 'pt-BR': 'Continue de onde parou.', vi: 'Tiếp tục từ chỗ bạn đã dừng.', id: 'Lanjutkan dari tempat terakhirmu.', tr: 'Kaldığın yerden devam et.', pl: 'Kontynuuj od miejsca, w którym skończyłeś.' }),
    promoTitle: triLang(lang, { ru: 'Промокод применён', uk: 'Промокод застосовано', en: 'Promo code applied', es: 'Código aplicado', 'pt-BR': 'Código aplicado', vi: 'Đã áp dụng mã', id: 'Kode diterapkan', tr: 'Kod uygulandı', pl: 'Kod zastosowany' }),
    promoSub: triLang(lang, { ru: 'Доступ подтверждён. Условия сохранены в аккаунте.', uk: 'Доступ підтверджено. Умови збережено в акаунті.', en: 'Access confirmed. The terms are saved to your account.', es: 'Acceso confirmado. Las condiciones están guardadas en tu cuenta.', 'pt-BR': 'Acesso confirmado. As condições estão salvas na sua conta.', vi: 'Đã xác nhận quyền truy cập. Điều kiện được lưu trong tài khoản.', id: 'Akses dikonfirmasi. Ketentuan tersimpan di akunmu.', tr: 'Erişim onaylandı. Koşullar hesabında kayıtlı.', pl: 'Dostęp potwierdzony. Warunki zapisano na koncie.' }),
    promoCardTitle: triLang(lang, { ru: 'Подтверждённый промокод', uk: 'Підтверджений промокод', en: 'Confirmed promo code', es: 'Código confirmado', 'pt-BR': 'Código confirmado', vi: 'Mã đã xác nhận', id: 'Kode terkonfirmasi', tr: 'Onaylanan kod', pl: 'Potwierdzony kod' }),
    skip: triLang(lang, { ru: 'Пропустить', uk: 'Пропустити', en: 'Skip', es: 'Omitir', 'pt-BR': 'Pular', vi: 'Bỏ qua', id: 'Lewati', tr: 'Atla', pl: 'Pomiń' }),
    close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }),
    next: triLang(lang, { ru: 'Продолжить', uk: 'Продовжити', en: 'Continue', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Dalej' }),
    toLessons: triLang(lang, { ru: 'К занятиям', uk: 'До занять', en: 'To lessons', es: 'A las clases', 'pt-BR': 'Ir às aulas', vi: 'Đến bài học', id: 'Ke pelajaran', tr: 'Derslere git', pl: 'Do lekcji' }),
    promoLabel: triLang(lang, { ru: 'промокод', uk: 'промокод', en: 'promo code', es: 'código', 'pt-BR': 'código', vi: 'mã ưu đãi', id: 'kode promo', tr: 'promosyon kodu', pl: 'kod promocyjny' }),
    titleActivated: (tier: string) => triLang(lang, { ru: `${tier} активирован`, uk: `${tier} активовано`, en: `${tier} activated`, es: `${tier} activado`, 'pt-BR': `${tier} ativado`, vi: `Đã kích hoạt ${tier}`, id: `${tier} aktif`, tr: `${tier} etkinleştirildi`, pl: `${tier} aktywowany` }),
  };
}
