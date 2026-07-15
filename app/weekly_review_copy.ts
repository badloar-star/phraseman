import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';

type WeeklyReviewCopyValues = {
  ru: string;
  uk: string;
  es: string;
} & Record<PlannedInterfaceLang, string>;

const L = (lang: Lang, values: WeeklyReviewCopyValues): string => triLang(lang, values);

export function weeklyReviewCopy(lang: Lang) {
  return {
    title: L(lang, { ru: 'Сигнал Компаса', uk: 'Сигнал Компаса', es: 'Señal de Compass', 'pt-BR': 'Sinal do Compass', vi: 'Tín hiệu Compass', id: 'Sinyal Compass', tr: 'Compass sinyali', pl: 'Sygnał Compass' }),
    freeTitle: L(lang, { ru: 'Персональный разбор практики', uk: 'Персональний розбір практики', es: 'Análisis personal de práctica', 'pt-BR': 'Análise pessoal da prática', vi: 'Phân tích luyện tập cá nhân', id: 'Analisis latihan pribadi', tr: 'Kişisel pratik analizi', pl: 'Osobista analiza ćwiczeń' }),
    freeBody: L(lang, { ru: 'Покажет, какие ошибки повторяются и что повторить первым.', uk: 'Покаже, які помилки повторюються і що повторити спочатку.', es: 'Muestra qué errores se repiten y qué repasar primero.', 'pt-BR': 'Mostra quais erros se repetem e o que revisar primeiro.', vi: 'Cho biết lỗi nào lặp lại và nên ôn gì trước.', id: 'Menunjukkan kesalahan berulang dan apa yang perlu diulang lebih dulu.', tr: 'Tekrarlanan hataları ve önce neyi çalışman gerektiğini gösterir.', pl: 'Pokazuje powtarzające się błędy i co najpierw powtórzyć.' }),
    snapshot: L(lang, { ru: 'Снимок практики', uk: 'Знімок практики', es: 'Vista de práctica', 'pt-BR': 'Visão da prática', vi: 'Ảnh chụp luyện tập', id: 'Ringkasan latihan', tr: 'Pratik özeti', pl: 'Migawka praktyki' }),
    signals: L(lang, { ru: 'сигналов', uk: 'сигналів', es: 'señales', 'pt-BR': 'sinais', vi: 'tín hiệu', id: 'sinyal', tr: 'sinyal', pl: 'sygnałów' }),
    activeDays: L(lang, { ru: 'активных дней', uk: 'активних днів', es: 'días activos', 'pt-BR': 'dias ativos', vi: 'ngày hoạt động', id: 'hari aktif', tr: 'aktif gün', pl: 'aktywnych dni' }),
    due: L(lang, { ru: 'ждут повтора', uk: 'чекають повтору', es: 'para repasar', 'pt-BR': 'para revisar', vi: 'cần ôn lại', id: 'perlu diulang', tr: 'tekrar bekliyor', pl: 'do powtórki' }),
    sources: L(lang, { ru: 'источника учтено', uk: 'джерела враховано', es: 'fuentes usadas', 'pt-BR': 'fontes usadas', vi: 'nguồn đã dùng', id: 'sumber digunakan', tr: 'kaynak kullanıldı', pl: 'źródła użyte' }),
    collecting: L(lang, { ru: 'Собираем данные для точного разбора', uk: 'Збираємо дані для точного розбору', es: 'Reunimos datos para un análisis preciso', 'pt-BR': 'Coletando dados para uma análise precisa', vi: 'Đang thu thập dữ liệu để phân tích chính xác', id: 'Mengumpulkan data untuk analisis yang tepat', tr: 'Net bir analiz için veri toplanıyor', pl: 'Zbieramy dane do dokładnej analizy' }),
    enough: L(lang, { ru: 'Данных уже достаточно для персонального разбора', uk: 'Даних уже достатньо для персонального розбору', es: 'Ya hay datos para un análisis personal', 'pt-BR': 'Já há dados para uma análise pessoal', vi: 'Đã đủ dữ liệu cho phân tích cá nhân', id: 'Data sudah cukup untuk analisis pribadi', tr: 'Kişisel analiz için yeterli veri var', pl: 'Danych wystarczy do osobistej analizy' }),
    ready: L(lang, { ru: 'Разбор готов', uk: 'Розбір готовий', es: 'El análisis está listo', 'pt-BR': 'A análise está pronta', vi: 'Phân tích đã sẵn sàng', id: 'Analisis siap', tr: 'Analiz hazır', pl: 'Analiza jest gotowa' }),
    updating: L(lang, { ru: 'Компас обновляет рекомендации…', uk: 'Компас оновлює рекомендації…', es: 'Compass actualiza las recomendaciones…', 'pt-BR': 'Compass está atualizando as recomendações…', vi: 'Compass đang cập nhật đề xuất…', id: 'Compass sedang memperbarui rekomendasi…', tr: 'Compass önerileri güncelliyor…', pl: 'Compass aktualizuje zalecenia…' }),
    unavailable: L(lang, { ru: 'Сейчас обновить не удалось — прошлый разбор сохранён', uk: 'Зараз оновити не вдалося — попередній розбір збережено', es: 'No se pudo actualizar; guardamos el análisis anterior', 'pt-BR': 'Não foi possível atualizar; a análise anterior foi salva', vi: 'Chưa thể cập nhật; bản phân tích trước vẫn được giữ', id: 'Belum dapat memperbarui; analisis lama tetap tersimpan', tr: 'Şimdilik güncellenemedi; önceki analiz saklandı', pl: 'Nie udało się odświeżyć; poprzednia analiza została' }),
    nextUpdate: L(lang, { ru: 'Следующее обновление доступно через 24 часа', uk: 'Наступне оновлення доступне через 24 години', es: 'La próxima actualización estará disponible en 24 horas', 'pt-BR': 'A próxima atualização estará disponível em 24 horas', vi: 'Bản cập nhật tiếp theo có sau 24 giờ', id: 'Pembaruan berikutnya tersedia dalam 24 jam', tr: 'Sonraki güncelleme 24 saat içinde', pl: 'Następna aktualizacja za 24 godziny' }),
    patterns: L(lang, { ru: 'Что повторяется', uk: 'Що повторюється', es: 'Qué se repite', 'pt-BR': 'O que se repete', vi: 'Điều đang lặp lại', id: 'Yang berulang', tr: 'Tekrarlananlar', pl: 'Co się powtarza' }),
    improvements: L(lang, { ru: 'Что уже стало лучше', uk: 'Що вже стало краще', es: 'Qué ya mejoró', 'pt-BR': 'O que já melhorou', vi: 'Điều đã tốt hơn', id: 'Yang sudah membaik', tr: 'İyileşenler', pl: 'Co już się poprawiło' }),
    priorities: L(lang, { ru: 'Главные приоритеты', uk: 'Головні пріоритети', es: 'Prioridades principales', 'pt-BR': 'Prioridades principais', vi: 'Ưu tiên chính', id: 'Prioritas utama', tr: 'Ana öncelikler', pl: 'Główne priorytety' }),
    plan: L(lang, { ru: 'План действий', uk: 'План дій', es: 'Plan de acción', 'pt-BR': 'Plano de ação', vi: 'Kế hoạch hành động', id: 'Rencana tindakan', tr: 'Eylem planı', pl: 'Plan działania' }),
  };
}
