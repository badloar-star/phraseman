import { triLang, type Lang } from '../constants/i18n';

type WeeklyReviewLocalizedCopy = Record<Lang, string>;

const L = (lang: Lang, values: WeeklyReviewLocalizedCopy): string => triLang(lang, values);

export function weeklyReviewCopy(lang: Lang) {
  return {
    title: L(lang, { ru: 'Сигнал Компаса', uk: 'Сигнал Компаса', es: 'Señal de Compass', 'pt-BR': 'Sinal do Compass', vi: 'Tín hiệu Compass', id: 'Sinyal Compass', tr: 'Compass sinyali', pl: 'Sygnał Compass' }),
    aiBadge: L(lang, { ru: 'AI-разбор', uk: 'AI-розбір', es: 'Análisis IA', 'pt-BR': 'Análise IA', vi: 'Phân tích AI', id: 'Analisis AI', tr: 'AI analizi', pl: 'Analiza AI' }),
    snapshot: L(lang, { ru: 'Снимок практики', uk: 'Знімок практики', es: 'Vista de práctica', 'pt-BR': 'Visão da prática', vi: 'Ảnh chụp luyện tập', id: 'Ringkasan latihan', tr: 'Pratik özeti', pl: 'Migawka praktyki' }),
    signals: L(lang, { ru: 'сигналов', uk: 'сигналів', es: 'señales', 'pt-BR': 'sinais', vi: 'tín hiệu', id: 'sinyal', tr: 'sinyal', pl: 'sygnałów' }),
    activeDays: L(lang, { ru: 'активных дней', uk: 'активних днів', es: 'días activos', 'pt-BR': 'dias ativos', vi: 'ngày hoạt động', id: 'hari aktif', tr: 'aktif gün', pl: 'aktywnych dni' }),
    due: L(lang, { ru: 'ждут повтора', uk: 'чекають повтору', es: 'para repasar', 'pt-BR': 'para revisar', vi: 'cần ôn lại', id: 'perlu diulang', tr: 'tekrar bekliyor', pl: 'do powtórki' }),
    sources: L(lang, { ru: 'источника учтено', uk: 'джерела враховано', es: 'fuentes usadas', 'pt-BR': 'fontes usadas', vi: 'nguồn đã dùng', id: 'sumber digunakan', tr: 'kaynak kullanıldı', pl: 'źródła użyte' }),
    collecting: L(lang, { ru: 'Собираем данные для точного разбора', uk: 'Збираємо дані для точного розбору', es: 'Reunimos datos para un análisis preciso', 'pt-BR': 'Coletando dados para uma análise precisa', vi: 'Đang thu thập dữ liệu để phân tích chính xác', id: 'Mengumpulkan data untuk analisis yang tepat', tr: 'Net bir analiz için veri toplanıyor', pl: 'Zbieramy dane do dokładnej analizy' }),
    enough: L(lang, { ru: 'Данных уже достаточно для персонального разбора', uk: 'Даних уже достатньо для персонального розбору', es: 'Ya hay datos para un análisis personal', 'pt-BR': 'Já há dados para uma análise pessoal', vi: 'Đã đủ dữ liệu cho phân tích cá nhân', id: 'Data sudah cukup untuk analisis pribadi', tr: 'Kişisel analiz için yeterli veri var', pl: 'Danych wystarczy do osobistej analizy' }),
    ready: L(lang, { ru: 'AI-разбор готов', uk: 'AI-розбір готовий', es: 'El análisis IA está listo', 'pt-BR': 'A análise IA está pronta', vi: 'Phân tích AI đã sẵn sàng', id: 'Analisis AI siap', tr: 'AI analizi hazır', pl: 'Analiza AI jest gotowa' }),
    updating: L(lang, { ru: 'Компас обновляет разбор…', uk: 'Компас оновлює розбір…', es: 'Compass actualiza el análisis…', 'pt-BR': 'Compass está atualizando…', vi: 'Compass đang cập nhật…', id: 'Compass sedang memperbarui…', tr: 'Compass analizi güncelliyor…', pl: 'Compass aktualizuje analizę…' }),
    unavailable: L(lang, { ru: 'Сейчас обновить не удалось — прошлый разбор сохранён', uk: 'Зараз оновити не вдалося — попередній розбір збережено', es: 'No se pudo actualizar; guardamos el análisis anterior', 'pt-BR': 'Não foi possível atualizar; a análise anterior foi salva', vi: 'Chưa thể cập nhật; bản phân tích trước vẫn được giữ', id: 'Belum dapat memperbarui; analisis lama tetap tersimpan', tr: 'Şimdilik güncellenemedi; önceki analiz saklandı', pl: 'Nie udało się odświeżyć; poprzednia analiza została' }),
    nextUpdate: L(lang, { ru: 'Следующее обновление доступно через 24 часа', uk: 'Наступне оновлення доступне через 24 години', es: 'La próxima actualización estará disponible en 24 horas', 'pt-BR': 'A próxima atualização estará disponível em 24 horas', vi: 'Bản cập nhật tiếp theo có sau 24 giờ', id: 'Pembaruan berikutnya tersedia dalam 24 jam', tr: 'Sonraki güncelleme 24 saat içinde', pl: 'Następna aktualizacja za 24 godziny' }),
    valueTitle: L(lang, { ru: 'В полном разборе ты получишь', uk: 'У повному розборі ти отримаєш', es: 'En el análisis completo obtendrás', 'pt-BR': 'Na análise completa você recebe', vi: 'Trong bản phân tích đầy đủ', id: 'Dalam analisis lengkap', tr: 'Tam analizde şunları alırsın', pl: 'W pełnej analizie otrzymasz' }),
    values: [
      L(lang, { ru: 'закономерности в практике', uk: 'закономірності у практиці', es: 'patrones de práctica', 'pt-BR': 'padrões de prática', vi: 'mẫu luyện tập', id: 'pola latihan', tr: 'pratik kalıpları', pl: 'wzorce w praktyce' }),
      L(lang, { ru: 'возможные причины и приоритеты', uk: 'можливі причини та пріоритети', es: 'posibles causas y prioridades', 'pt-BR': 'possíveis causas e prioridades', vi: 'nguyên nhân và ưu tiên có thể', id: 'kemungkinan sebab dan prioritas', tr: 'olası nedenler ve öncelikler', pl: 'możliwe przyczyny i priorytety' }),
      L(lang, { ru: 'пошаговый план', uk: 'покроковий план', es: 'un plan paso a paso', 'pt-BR': 'um plano passo a passo', vi: 'kế hoạch từng bước', id: 'rencana langkah demi langkah', tr: 'adım adım plan', pl: 'plan krok po kroku' }),
      L(lang, { ru: 'точные упражнения из твоей практики', uk: 'точні вправи з твоєї практики', es: 'ejercicios precisos de tu práctica', 'pt-BR': 'exercícios exatos da sua prática', vi: 'bài tập chính xác từ luyện tập của bạn', id: 'latihan tepat dari praktikmu', tr: 'pratiğine özel net alıştırmalar', pl: 'dokładne ćwiczenia z twojej praktyki' }),
    ],
    cta: L(lang, { ru: 'Открыть полный AI-разбор', uk: 'Відкрити повний AI-розбір', es: 'Abrir análisis IA completo', 'pt-BR': 'Abrir análise IA completa', vi: 'Mở phân tích AI đầy đủ', id: 'Buka analisis AI lengkap', tr: 'Tam AI analizini aç', pl: 'Otwórz pełną analizę AI' }),
    expand: L(lang, { ru: 'Показать полный разбор', uk: 'Показати повний розбір', es: 'Mostrar análisis completo', 'pt-BR': 'Mostrar análise completa', vi: 'Xem phân tích đầy đủ', id: 'Tampilkan analisis lengkap', tr: 'Tam analizi göster', pl: 'Pokaż pełną analizę' }),
    collapse: L(lang, { ru: 'Свернуть разбор', uk: 'Згорнути розбір', es: 'Ocultar análisis', 'pt-BR': 'Recolher análise', vi: 'Thu gọn phân tích', id: 'Tutup analisis', tr: 'Analizi daralt', pl: 'Zwiń analizę' }),
    patterns: L(lang, { ru: 'Что повторяется', uk: 'Що повторюється', es: 'Qué se repite', 'pt-BR': 'O que se repete', vi: 'Điều đang lặp lại', id: 'Yang berulang', tr: 'Tekrarlananlar', pl: 'Co się powtarza' }),
    improvements: L(lang, { ru: 'Что уже стало лучше', uk: 'Що вже стало краще', es: 'Qué ya mejoró', 'pt-BR': 'O que já melhorou', vi: 'Điều đã tốt hơn', id: 'Yang sudah membaik', tr: 'İyileşenler', pl: 'Co już się poprawiło' }),
    priorities: L(lang, { ru: 'Главные приоритеты', uk: 'Головні пріоритети', es: 'Prioridades principales', 'pt-BR': 'Prioridades principais', vi: 'Ưu tiên chính', id: 'Prioritas utama', tr: 'Ana öncelikler', pl: 'Główne priorytety' }),
    plan: L(lang, { ru: 'План действий', uk: 'План дій', es: 'Plan de acción', 'pt-BR': 'Plano de ação', vi: 'Kế hoạch hành động', id: 'Rencana tindakan', tr: 'Eylem planı', pl: 'Plan działania' }),
  };
}
