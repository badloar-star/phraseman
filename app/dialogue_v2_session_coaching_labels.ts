import { triLang, type Lang } from '../constants/i18n';

// зачем (владелец 2026-09-30, макет dialogs.html C3–C35): подписи разбора хода V2 (D112),
// месячного остатка (D111: «на сегодня» из макета заменено на месячный смысл), стены
// лимита, завершения сцены, ошибок по причинам и сбоев голоса — на 11 языках интерфейса.
// Отдельный файл, чтобы маршрут сессии не разрастался.

export type DialogueV2SessionCoachingLabels = Readonly<{
  translate: string;
  hideTranslation: string;
  why: string;
  better: string;
  hint: string;
  goalKicker: (index: number, total: number) => string;
  quotaA11y: (remaining: number, total: number) => string;
  wallTitle: string;
  wallMessage: (total: number) => string;
  wallReview: string;
  wallPlus: string;
  endVeil: string;
  summary: string;
  serviceError: string;
  rateLimited: string;
  pausedTitle: string;
  pausedMessage: string;
  voiceNotHeard: string;
  voiceDenied: string;
  voiceUnavailable: string;
  openSettings: string;
  whyExhausted: string;
  /** Отметка под пузырём, упёршимся в лимит (dialogs-035): сервер реплику не принял. */
  unsent: string;
  openPlus: string;
}>;

export function dialogueV2SessionCoachingLabels(lang: Lang): DialogueV2SessionCoachingLabels {
  return Object.freeze({
    translate: triLang(lang, { ru: 'Перевод', uk: 'Переклад', en: 'Translate', es: 'Traducir', 'pt-BR': 'Traduzir', vi: 'Dịch', id: 'Terjemahkan', tr: 'Çevir', pl: 'Tłumacz', fr: 'Traduire', de: 'Übersetzen' }),
    hideTranslation: triLang(lang, { ru: 'Скрыть перевод', uk: 'Сховати переклад', en: 'Hide translation', es: 'Ocultar traducción', 'pt-BR': 'Ocultar tradução', vi: 'Ẩn bản dịch', id: 'Sembunyikan terjemahan', tr: 'Çeviriyi gizle', pl: 'Ukryj tłumaczenie', fr: 'Masquer la traduction', de: 'Übersetzung ausblenden' }),
    why: triLang(lang, { ru: 'Почему так', uk: 'Чому так', en: 'Why', es: 'Por qué', 'pt-BR': 'Por quê', vi: 'Vì sao', id: 'Kenapa', tr: 'Neden', pl: 'Dlaczego', fr: 'Pourquoi', de: 'Warum' }),
    better: triLang(lang, { ru: 'Лучше так', uk: 'Краще так', en: 'Better', es: 'Mejor así', 'pt-BR': 'Melhor assim', vi: 'Nói hay hơn', id: 'Lebih baik', tr: 'Daha iyisi', pl: 'Lepiej tak', fr: 'Mieux', de: 'Besser so' }),
    hint: triLang(lang, { ru: 'Подсказка', uk: 'Підказка', en: 'Hint', es: 'Pista', 'pt-BR': 'Dica', vi: 'Gợi ý', id: 'Petunjuk', tr: 'İpucu', pl: 'Podpowiedź', fr: 'Indice', de: 'Tipp' }),
    goalKicker: (index: number, total: number) => triLang(lang, {
      ru: `Цель ${index} из ${total}`, uk: `Ціль ${index} з ${total}`, en: `Goal ${index} of ${total}`,
      es: `Objetivo ${index} de ${total}`, 'pt-BR': `Objetivo ${index} de ${total}`, vi: `Mục tiêu ${index}/${total}`,
      id: `Tujuan ${index} dari ${total}`, tr: `Hedef ${index}/${total}`, pl: `Cel ${index} z ${total}`,
      fr: `Objectif ${index} sur ${total}`, de: `Ziel ${index} von ${total}`,
    }),
    quotaA11y: (remaining: number, total: number) => triLang(lang, {
      ru: `В этом месяце осталось ${remaining} из ${total} ответов`, uk: `Цього місяця залишилось ${remaining} з ${total} відповідей`,
      en: `${remaining} of ${total} replies left this month`, es: `${remaining === 1 ? 'Queda' : 'Quedan'} ${remaining} de ${total} respuestas este mes`,
      'pt-BR': `${remaining === 1 ? 'Resta' : 'Restam'} ${remaining} de ${total} respostas este mês`, vi: `Tháng này còn ${remaining}/${total} lượt trả lời`,
      id: `Sisa ${remaining} dari ${total} balasan bulan ini`, tr: `Bu ay ${total} yanıttan ${remaining} kaldı`,
      pl: `W tym miesiącu zostało ${remaining} z ${total} odpowiedzi`, fr: `Il reste ${remaining} réponses sur ${total} ce mois-ci`,
      de: `Diesen Monat noch ${remaining} von ${total} Antworten`,
    }),
    wallTitle: triLang(lang, { ru: 'На этот месяц всё', uk: 'На цей місяць усе', en: "That's it for this month", es: 'Eso es todo este mes', 'pt-BR': 'É tudo por este mês', vi: 'Tháng này hết lượt rồi', id: 'Sampai di sini bulan ini', tr: 'Bu aylık bu kadar', pl: 'Na ten miesiąc to wszystko', fr: 'C’est tout pour ce mois-ci', de: 'Das war’s für diesen Monat' }),
    wallMessage: (total: number) => triLang(lang, {
      ru: `Бесплатные ${total} ответов на этот месяц закончились. Новые — с 1-го числа.`,
      uk: `Безкоштовні ${total} відповідей на цей місяць скінчилися. Нові — з 1-го числа.`,
      en: `Your ${total} free replies for this month are used up. New ones arrive on the 1st.`,
      es: `Se acabaron tus ${total} respuestas gratis de este mes. Vuelven el día 1.`,
      'pt-BR': `Suas ${total} respostas grátis deste mês acabaram. Novas chegam no dia 1.`,
      vi: `Đã hết ${total} lượt trả lời miễn phí tháng này. Lượt mới có từ ngày 1.`,
      id: `${total} balasan gratis bulan ini sudah habis. Yang baru mulai tanggal 1.`,
      tr: `Bu ayki ${total} ücretsiz yanıtın bitti. Yenileri ayın 1’inde gelir.`,
      pl: `Darmowe ${total} odpowiedzi na ten miesiąc się skończyły. Nowe od 1. dnia miesiąca.`,
      fr: `Tes ${total} réponses gratuites du mois sont épuisées. Les nouvelles arrivent le 1er.`,
      de: `Deine ${total} kostenlosen Antworten für diesen Monat sind aufgebraucht. Neue gibt es am 1.`,
    }),
    wallReview: triLang(lang, { ru: 'Итоги', uk: 'Підсумки', en: 'Summary', es: 'Resumen', 'pt-BR': 'Resumo', vi: 'Tổng kết', id: 'Ringkasan', tr: 'Özet', pl: 'Podsumowanie', fr: 'Bilan', de: 'Auswertung' }),
    wallPlus: 'Plus',
    endVeil: triLang(lang, { ru: 'Нажми, чтобы перейти к итогу', uk: 'Натисни, щоб перейти до підсумку', en: 'Tap to see the summary', es: 'Toca para ver el resumen', 'pt-BR': 'Toque para ver o resumo', vi: 'Chạm để xem tổng kết', id: 'Ketuk untuk melihat ringkasan', tr: 'Özeti görmek için dokun', pl: 'Dotknij, aby zobaczyć podsumowanie', fr: 'Touche pour voir le bilan', de: 'Tippe für die Auswertung' }),
    summary: triLang(lang, { ru: 'Итоги', uk: 'Підсумки', en: 'Summary', es: 'Resumen', 'pt-BR': 'Resumo', vi: 'Tổng kết', id: 'Ringkasan', tr: 'Özet', pl: 'Podsumowanie', fr: 'Bilan', de: 'Auswertung' }),
    // зачем (Ядро, dialogs-035): пузырь, упёршийся в лимит, остаётся на экране, но сервер его не принял — честная отметка под ним.
    unsent: triLang(lang, { ru: 'Не отправлено', uk: 'Не надіслано', en: 'Not sent', es: 'No enviado', 'pt-BR': 'Não enviada', vi: 'Chưa gửi', id: 'Belum terkirim', tr: 'Gönderilmedi', pl: 'Nie wysłano', fr: 'Non envoyé', de: 'Nicht gesendet' }),
    serviceError: triLang(lang, {
      ru: 'Сервис диалогов временно недоступен. Сообщение не отправлено. Попробуй ещё раз.',
      uk: 'Сервіс діалогів тимчасово недоступний. Повідомлення не надіслано. Спробуй ще раз.',
      en: 'The dialogue service is temporarily unavailable. Your message was not sent. Try again.',
      es: 'El servicio de diálogos no está disponible. El mensaje no se envió. Inténtalo de nuevo.',
      'pt-BR': 'O serviço de diálogos está indisponível. A mensagem não foi enviada. Tente de novo.',
      vi: 'Dịch vụ hội thoại tạm thời không khả dụng. Tin nhắn chưa được gửi. Thử lại nhé.',
      id: 'Layanan dialog sedang tidak tersedia. Pesan belum terkirim. Coba lagi.',
      tr: 'Diyalog hizmeti geçici olarak kullanılamıyor. Mesaj gönderilmedi. Tekrar dene.',
      pl: 'Usługa dialogów jest chwilowo niedostępna. Wiadomość nie została wysłana. Spróbuj ponownie.',
      fr: 'Le service de dialogue est momentanément indisponible. Message non envoyé. Réessaie.',
      de: 'Der Dialogdienst ist gerade nicht verfügbar. Die Nachricht wurde nicht gesendet. Versuch es erneut.',
    }),
    rateLimited: triLang(lang, {
      ru: 'Слишком много сообщений подряд. Подожди немного и попробуй ещё раз.',
      uk: 'Забагато повідомлень поспіль. Зачекай трохи й спробуй ще раз.',
      en: 'Too many messages in a row. Wait a moment and try again.',
      es: 'Demasiados mensajes seguidos. Espera un poco e inténtalo de nuevo.',
      'pt-BR': 'Mensagens demais seguidas. Espere um pouco e tente de novo.',
      vi: 'Bạn gửi quá nhiều tin liên tiếp. Đợi một chút rồi thử lại.',
      id: 'Terlalu banyak pesan beruntun. Tunggu sebentar lalu coba lagi.',
      tr: 'Arka arkaya çok fazla mesaj. Biraz bekleyip tekrar dene.',
      pl: 'Za dużo wiadomości pod rząd. Poczekaj chwilę i spróbuj ponownie.',
      fr: 'Trop de messages d’affilée. Attends un peu et réessaie.',
      de: 'Zu viele Nachrichten hintereinander. Warte kurz und versuch es erneut.',
    }),
    pausedTitle: triLang(lang, { ru: 'Диалоги на паузе', uk: 'Діалоги на паузі', en: 'Dialogues are paused', es: 'Diálogos en pausa', 'pt-BR': 'Diálogos em pausa', vi: 'Hội thoại tạm dừng', id: 'Dialog dijeda', tr: 'Diyaloglar duraklatıldı', pl: 'Dialogi wstrzymane', fr: 'Dialogues en pause', de: 'Dialoge pausiert' }),
    pausedMessage: triLang(lang, {
      ru: 'Собеседники сейчас недоступны. Загляни чуть позже.', uk: 'Співрозмовники зараз недоступні. Зазирни трохи згодом.',
      en: 'Conversation partners are unavailable right now. Check back a little later.',
      es: 'Los interlocutores no están disponibles ahora. Vuelve un poco más tarde.',
      'pt-BR': 'Os interlocutores estão indisponíveis agora. Volte daqui a pouco.',
      vi: 'Hiện chưa có người trò chuyện. Quay lại sau một chút nhé.',
      id: 'Lawan bicara sedang tidak tersedia. Coba lagi nanti.',
      tr: 'Sohbet ortakları şu an kullanılamıyor. Biraz sonra tekrar bak.',
      pl: 'Rozmówcy są teraz niedostępni. Zajrzyj trochę później.',
      fr: 'Les interlocuteurs sont indisponibles pour le moment. Reviens un peu plus tard.',
      de: 'Die Gesprächspartner sind gerade nicht erreichbar. Schau etwas später wieder vorbei.',
    }),
    voiceNotHeard: triLang(lang, { ru: 'Не удалось расслышать. Попробуй ещё раз', uk: 'Не вдалося розчути. Спробуй ще раз', en: "Couldn't catch that. Try again", es: 'No te he oído bien. Inténtalo de nuevo', 'pt-BR': 'Não deu para ouvir. Tente de novo', vi: 'Chưa nghe rõ. Thử lại nhé', id: 'Tidak terdengar jelas. Coba lagi', tr: 'Anlaşılamadı. Tekrar dene', pl: 'Nie udało się usłyszeć. Spróbuj ponownie', fr: 'Je n’ai pas bien entendu. Réessaie', de: 'Nicht verstanden. Versuch es noch einmal' }),
    voiceDenied: triLang(lang, { ru: 'Нужен доступ к микрофону', uk: 'Потрібен доступ до мікрофона', en: 'Microphone access needed', es: 'Se necesita acceso al micrófono', 'pt-BR': 'É preciso acesso ao microfone', vi: 'Cần quyền dùng micro', id: 'Perlu akses mikrofon', tr: 'Mikrofon izni gerekli', pl: 'Potrzebny dostęp do mikrofonu', fr: 'Accès au micro nécessaire', de: 'Mikrofonzugriff erforderlich' }),
    voiceUnavailable: triLang(lang, { ru: 'Голосовой ввод недоступен на этом устройстве', uk: 'Голосове введення недоступне на цьому пристрої', en: 'Voice input is not available on this device', es: 'La entrada de voz no está disponible en este dispositivo', 'pt-BR': 'A entrada por voz não está disponível neste aparelho', vi: 'Thiết bị này không hỗ trợ nhập giọng nói', id: 'Input suara tidak tersedia di perangkat ini', tr: 'Bu cihazda sesli giriş kullanılamıyor', pl: 'Wprowadzanie głosowe jest niedostępne na tym urządzeniu', fr: 'La saisie vocale n’est pas disponible sur cet appareil', de: 'Spracheingabe ist auf diesem Gerät nicht verfügbar' }),
    openSettings: triLang(lang, { ru: 'Открыть настройки', uk: 'Відкрити налаштування', en: 'Open settings', es: 'Abrir ajustes', 'pt-BR': 'Abrir ajustes', vi: 'Mở cài đặt', id: 'Buka pengaturan', tr: 'Ayarları aç', pl: 'Otwórz ustawienia', fr: 'Ouvrir les réglages', de: 'Einstellungen öffnen' }),
    whyExhausted: triLang(lang, {
      ru: 'Бесплатные разборы на сегодня закончились. У бесплатного — 3 разбора в день, завтра снова.',
      uk: 'Безкоштовні розбори на сьогодні скінчилися. Безкоштовно — 3 розбори на день, завтра знову.',
      en: 'You have used today’s free explanations. Free gives 3 a day — more tomorrow.',
      es: 'Se acabaron las explicaciones gratis de hoy. Son 3 al día; mañana hay más.',
      'pt-BR': 'As explicações grátis de hoje acabaram. São 3 por dia; amanhã tem mais.',
      vi: 'Đã hết lượt giải thích miễn phí hôm nay. Mỗi ngày có 3 lượt, mai lại có.',
      id: 'Penjelasan gratis hari ini sudah habis. Gratis 3 per hari, besok ada lagi.',
      tr: 'Bugünkü ücretsiz açıklamalar bitti. Günde 3 tane, yarın yine var.',
      pl: 'Darmowe wyjaśnienia na dziś się skończyły. Są 3 dziennie — jutro znowu.',
      fr: 'Les explications gratuites du jour sont épuisées. 3 par jour, à demain.',
      de: 'Die kostenlosen Erklärungen für heute sind aufgebraucht. 3 pro Tag – morgen wieder.',
    }),
    openPlus: triLang(lang, { ru: 'Открыть Plus', uk: 'Відкрити Plus', en: 'Open Plus', es: 'Abrir Plus', 'pt-BR': 'Abrir Plus', vi: 'Mở Plus', id: 'Buka Plus', tr: 'Plus’ı aç', pl: 'Otwórz Plus', fr: 'Ouvrir Plus', de: 'Plus öffnen' }),
  });
}
