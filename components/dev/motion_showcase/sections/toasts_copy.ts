// ─── Витрина движения · словарь демо-тостов ───
// зачем: демо-тексты тостов витрины переведены на все 8 языков интерфейса,
// как боевые (actionToastTri). Вынесены словарём, чтобы сторож i18n видел
// перевод, а не «сырые» русские литералы в компоненте.

const RU = {
  success_1: 'Готово — прогресс сохранён',
  error_1: 'Что-то пошло не так — попробуй ещё раз',
  info_1: 'Новая версия урока уже доступна',
  warning_1: '🔥 Цепочка 5 дн. сгорит в полночь — позанимайся, чтобы сохранить',
  reward_1: 'Награда получена — +15 осколков',
};

const UK: typeof RU = {
  success_1: 'Готово — прогрес збережено',
  error_1: 'Щось пішло не так — спробуй ще раз',
  info_1: 'Нова версія уроку вже доступна',
  warning_1: '🔥 Серія 5 дн. згорить опівночі — позаймайся, щоб зберегти',
  reward_1: 'Нагороду отримано — +15 скалок',
};

const ES: typeof RU = {
  success_1: 'Listo — progreso guardado',
  error_1: 'Algo salió mal — inténtalo de nuevo',
  info_1: 'Ya está disponible la nueva versión de la lección',
  warning_1: '🔥 Tu racha de 5 días se pierde a medianoche — practica para mantenerla',
  reward_1: 'Premio obtenido — +15 fragmentos',
};

const PT_BR: typeof RU = {
  success_1: 'Pronto — progresso salvo',
  error_1: 'Algo deu errado — tente novamente',
  info_1: 'Nova versão da lição já disponível',
  warning_1: '🔥 Sua sequência de 5 dias acaba à meia-noite — pratique para manter',
  reward_1: 'Prêmio recebido — +15 fragmentos',
};

const VI: typeof RU = {
  success_1: 'Xong — đã lưu tiến trình',
  error_1: 'Có lỗi xảy ra — hãy thử lại',
  info_1: 'Phiên bản bài học mới đã sẵn sàng',
  warning_1: '🔥 Chuỗi 5 ngày sẽ mất lúc nửa đêm — hãy luyện tập để giữ',
  reward_1: 'Đã nhận phần thưởng — +15 mảnh',
};

const ID: typeof RU = {
  success_1: 'Selesai — progres disimpan',
  error_1: 'Ada yang salah — coba lagi',
  info_1: 'Versi baru pelajaran sudah tersedia',
  warning_1: '🔥 Streak 5 hari hilang tengah malam — berlatihlah untuk mempertahankan',
  reward_1: 'Hadiah diterima — +15 pecahan',
};

const TR: typeof RU = {
  success_1: 'Tamam — ilerleme kaydedildi',
  error_1: 'Bir şeyler ters gitti — tekrar dene',
  info_1: 'Dersin yeni sürümü artık kullanılabilir',
  warning_1: '🔥 5 günlük serin gece yarısı sönecek — sürdürmek için çalış',
  reward_1: 'Ödül alındı — +15 parça',
};

const PL: typeof RU = {
  success_1: 'Gotowe — postęp zapisany',
  error_1: 'Coś poszło nie tak — spróbuj ponownie',
  info_1: 'Nowa wersja lekcji jest już dostępna',
  warning_1: '🔥 Seria 5 dni zniknie o północy — poćwicz, by ją utrzymać',
  reward_1: 'Nagroda odebrana — +15 odłamków',
};

type Key = keyof typeof RU;

export function copy(key: Key) {
  return {
    ru: RU[key], uk: UK[key], es: ES[key], 'pt-BR': PT_BR[key],
    vi: VI[key], id: ID[key], tr: TR[key], pl: PL[key],
  } as const;
}
