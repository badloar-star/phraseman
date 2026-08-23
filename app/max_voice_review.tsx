import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { glassFill } from '../components/GlassSurface';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { trackEvent } from './analytics';
import type { TranscriptTurn } from './max_call_transcript';
import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';
import { submitMaxVoiceFeedback } from './max_voice_feedback_client';
import {
  drainOneMaxFinalize,
  readLastMaxVoiceReviewReceipt,
  readMaxVoiceReviewReceipt,
} from './max_voice_finalize_client';
import { listPendingMaxFinalize } from './max_voice_finalize_outbox';
import type {
  MaxVoiceFinalizeEnvelopeV1,
  MaxVoiceReviewReceiptV1,
} from './max_voice_finalize_types';
import { projectMaxReview } from './max_voice_review_projection';
import { getStableId } from './stable_id';

/** The local handoff is temporary; the durable receipt is the review source of truth. */
export interface MaxCallResult {
  history: TranscriptTurn[];
  durationSec: number;
  speechSec: number;
  format: 'scenario' | 'companion' | 'trial' | 'tutor';
  scenarioId?: string;
  tutor?: {
    name: string;
    homework: string[];
    nextTopic: string;
    languagePreference: string;
    safetyFlags: { kind: string; note: string }[];
    homeworkItems: { text: string; meaning: string }[];
    phraseResults: { text: string; result: 'pass' | 'needs_work' | 'uncertain' | 'invalid' }[];
    sceneOutcome: string;
    goalProgress: { goalId: string; mastery: number; evidence?: 'scene' | 'novel_context'; sceneId?: string } | null;
    goal: { id: string; level: string; title: { en: string; ru: string; uk: string } & Partial<Record<Lang, string>>; mastery: number; sceneIds: string[] } | null;
    lessonsSoFar: number;
  };
  cefr?: string;
  devMode?: boolean;
  studyTarget?: string;
  sessionId?: string;
  personaName: string;
  endReason: 'completed' | 'capped' | 'dropped' | 'background' | 'failed';
  dayRemainingSec: number | null;
}

let lastMaxCallResult: MaxCallResult | null = null;

export function setLastMaxCallResult(result: MaxCallResult): void {
  lastMaxCallResult = result;
}

export function getLastMaxCallResult(): MaxCallResult | null {
  return lastMaxCallResult;
}

type ReviewState =
  | { kind: 'loading' }
  | { kind: 'ready'; receipt: MaxVoiceReviewReceiptV1 }
  | { kind: 'pending'; envelope: MaxVoiceFinalizeEnvelopeV1 }
  | { kind: 'empty' }
  | { kind: 'error' };

function formatDuration(totalSec: number): string {
  const seconds = Math.max(0, Math.round(totalSec));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function copy(lang: Lang) {
  return {
    title: triLang(lang, { ru: 'Разбор разговора', uk: 'Розбір розмови', es: 'Análisis de la conversación', 'pt-BR': 'Análise da conversa', vi: 'Đánh giá cuộc trò chuyện', id: 'Ulasan percakapan', tr: 'Konuşma değerlendirmesi', pl: 'Podsumowanie rozmowy' }),
    // зачем (владелец 2026-08-23): «ключевой вопрос — как прошёл разговор, что
    // понравилось, что улучшить». Спрашиваем именно так, одним живым вопросом.
    feedbackTitle: triLang(lang, { ru: 'Как прошёл разговор?', uk: 'Як пройшла розмова?', es: '¿Cómo fue la conversación?', 'pt-BR': 'Como foi a conversa?', vi: 'Cuộc trò chuyện thế nào?', id: 'Bagaimana percakapannya?', tr: 'Konuşma nasıl geçti?', pl: 'Jak poszła rozmowa?' }),
    feedbackPlaceholder: triLang(lang, { ru: 'Что понравилось, что улучшить?', uk: 'Що сподобалось, що покращити?', es: '¿Qué te gustó y qué mejorarías?', 'pt-BR': 'Do que gostou e o que melhorar?', vi: 'Bạn thích gì và nên cải thiện gì?', id: 'Apa yang disukai dan perlu diperbaiki?', tr: 'Neyi beğendin, ne düzelmeli?', pl: 'Co się podobało, co poprawić?' }),
    feedbackSend: triLang(lang, { ru: 'Отправить', uk: 'Надіслати', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' }),
    feedbackThanks: triLang(lang, { ru: 'Спасибо! Отзыв отправлен', uk: 'Дякуємо! Відгук надіслано', es: '¡Gracias! Comentario enviado', 'pt-BR': 'Obrigado! Comentário enviado', vi: 'Cảm ơn! Đã gửi phản hồi', id: 'Terima kasih! Masukan terkirim', tr: 'Teşekkürler! Geri bildirim gönderildi', pl: 'Dziękujemy! Opinia wysłana' }),
    feedbackFailed: triLang(lang, { ru: 'Не отправилось. Попробуйте ещё раз', uk: 'Не надіслалося. Спробуйте ще раз', es: 'No se envió. Inténtalo de nuevo', 'pt-BR': 'Não enviou. Tente novamente', vi: 'Chưa gửi được. Thử lại nhé', id: 'Gagal terkirim. Coba lagi', tr: 'Gönderilemedi. Tekrar deneyin', pl: 'Nie wysłano. Spróbuj ponownie' }),
    feedbackRating: triLang(lang, { ru: 'Оценка', uk: 'Оцінка', es: 'Valoración', 'pt-BR': 'Avaliação', vi: 'Đánh giá', id: 'Penilaian', tr: 'Puan', pl: 'Ocena' }),
    completed: triLang(lang, { ru: 'Разговор завершён', uk: 'Розмову завершено', es: 'Conversación completada', 'pt-BR': 'Conversa concluída', vi: 'Đã hoàn thành cuộc trò chuyện', id: 'Percakapan selesai', tr: 'Konuşma tamamlandı', pl: 'Rozmowa zakończona' }),
    worked: triLang(lang, { ru: 'Что получилось', uk: 'Що вдалося', es: 'Lo que salió bien', 'pt-BR': 'O que deu certo', vi: 'Điều bạn làm tốt', id: 'Yang sudah bagus', tr: 'İyi yaptıkların', pl: 'Co poszło dobrze' }),
    fix: triLang(lang, { ru: 'Что поправить', uk: 'Що виправити', es: 'Qué corregir', 'pt-BR': 'O que corrigir', vi: 'Điều cần sửa', id: 'Yang perlu diperbaiki', tr: 'Neyi düzeltmeli', pl: 'Co poprawić' }),
    said: triLang(lang, { ru: 'Ты сказал', uk: 'Ти сказав', es: 'Dijiste', 'pt-BR': 'Você disse', vi: 'Bạn đã nói', id: 'Kamu berkata', tr: 'Şunu söyledin', pl: 'Powiedziałeś' }),
    say: triLang(lang, { ru: 'Лучше сказать', uk: 'Краще сказати', es: 'Mejor di', 'pt-BR': 'Melhor dizer', vi: 'Nên nói', id: 'Lebih baik katakan', tr: 'Şöyle söyle', pl: 'Lepiej powiedzieć' }),
    noFix: triLang(lang, { ru: 'Критичной ошибки для отдельной тренировки нет.', uk: 'Критичної помилки для окремого тренування немає.', es: 'No hay un error importante que practicar por separado.', 'pt-BR': 'Não há um erro importante para praticar separadamente.', vi: 'Không có lỗi quan trọng nào cần luyện riêng.', id: 'Tidak ada kesalahan penting yang perlu dilatih terpisah.', tr: 'Ayrı çalışılması gereken önemli bir hata yok.', pl: 'Nie ma ważnego błędu do osobnego ćwiczenia.' }),
    practice: triLang(lang, { ru: 'Потренировать эту фразу', uk: 'Потренувати цю фразу', es: 'Practicar esta frase', 'pt-BR': 'Praticar esta frase', vi: 'Luyện câu này', id: 'Latih kalimat ini', tr: 'Bu ifadeyi çalış', pl: 'Przećwicz to zdanie' }),
    tomorrow: triLang(lang, { ru: 'Что делать завтра', uk: 'Що робити завтра', es: 'Qué hacer mañana', 'pt-BR': 'O que fazer amanhã', vi: 'Ngày mai làm gì', id: 'Yang dilakukan besok', tr: 'Yarın ne yapmalı', pl: 'Co zrobić jutro' }),
    targetPhrase: triLang(lang, { ru: 'Целевая фраза', uk: 'Цільова фраза', es: 'Frase objetivo', 'pt-BR': 'Frase-alvo', vi: 'Câu mục tiêu', id: 'Frasa target', tr: 'Hedef ifade', pl: 'Fraza docelowa' }),
    next: triLang(lang, { ru: 'Следующий разговор', uk: 'Наступна розмова', es: 'Próxima conversación', 'pt-BR': 'Próxima conversa', vi: 'Cuộc trò chuyện tiếp theo', id: 'Percakapan berikutnya', tr: 'Sonraki konuşma', pl: 'Następna rozmowa' }),
    details: triLang(lang, { ru: 'Детали', uk: 'Деталі', es: 'Detalles', 'pt-BR': 'Detalhes', vi: 'Chi tiết', id: 'Detail', tr: 'Ayrıntılar', pl: 'Szczegóły' }),
    hideDetails: triLang(lang, { ru: 'Скрыть детали', uk: 'Сховати деталі', es: 'Ocultar detalles', 'pt-BR': 'Ocultar detalhes', vi: 'Ẩn chi tiết', id: 'Sembunyikan detail', tr: 'Ayrıntıları gizle', pl: 'Ukryj szczegóły' }),
    pending: triLang(lang, { ru: 'Разбор будет готов после подключения', uk: 'Розбір буде готовий після підключення', es: 'El análisis estará listo cuando vuelvas a conectarte', 'pt-BR': 'A análise ficará pronta após a conexão', vi: 'Bản đánh giá sẽ sẵn sàng khi có kết nối', id: 'Ulasan akan siap setelah terhubung', tr: 'Değerlendirme bağlantıdan sonra hazır olacak', pl: 'Podsumowanie będzie gotowe po połączeniu' }),
    pendingLong: triLang(lang, { ru: 'Разбор готовится дольше обычного. Он сохранится и появится здесь — можно вернуться позже.', uk: 'Розбір готується довше, ніж зазвичай. Він збережеться і з’явиться тут — можна повернутися пізніше.', es: 'El análisis está tardando más de lo habitual. Se guardará y aparecerá aquí; puedes volver más tarde.', 'pt-BR': 'A análise está demorando mais que o normal. Ela será salva e aparecerá aqui; você pode voltar depois.', vi: 'Bản đánh giá đang mất nhiều thời gian hơn bình thường. Nó sẽ được lưu và hiện ở đây — bạn có thể quay lại sau.', id: 'Ulasan memakan waktu lebih lama dari biasanya. Ulasan akan tersimpan dan muncul di sini — kamu bisa kembali nanti.', tr: 'Değerlendirme normalden uzun sürüyor. Kaydedilecek ve burada görünecek — daha sonra dönebilirsin.', pl: 'Podsumowanie przygotowuje się dłużej niż zwykle. Zapisze się i pojawi tutaj — możesz wrócić później.' }),
    endedBackground: triLang(lang, { ru: 'Разговор завершился, потому что приложение свернулось', uk: 'Розмова завершилася, бо застосунок згорнувся', es: 'La conversación terminó porque la app pasó a segundo plano', 'pt-BR': 'A conversa terminou porque o app foi para segundo plano', vi: 'Cuộc trò chuyện kết thúc vì ứng dụng chạy nền', id: 'Percakapan berakhir karena aplikasi berpindah ke latar belakang', tr: 'Uygulama arka plana alındığı için konuşma sona erdi', pl: 'Rozmowa zakończyła się, bo aplikacja przeszła w tło' }),
    temporary: triLang(lang, { ru: 'Временно на этом устройстве', uk: 'Тимчасово на цьому пристрої', es: 'Temporalmente en este dispositivo', 'pt-BR': 'Temporariamente neste dispositivo', vi: 'Tạm thời trên thiết bị này', id: 'Sementara di perangkat ini', tr: 'Geçici olarak bu cihazda', pl: 'Tymczasowo na tym urządzeniu' }),
    transcript: triLang(lang, { ru: 'Текст разговора', uk: 'Текст розмови', es: 'Texto de la conversación', 'pt-BR': 'Texto da conversa', vi: 'Nội dung cuộc trò chuyện', id: 'Teks percakapan', tr: 'Konuşma metni', pl: 'Tekst rozmowy' }),
    speakingTime: triLang(lang, { ru: 'Ты говорил', uk: 'Ти говорив', es: 'Hablaste', 'pt-BR': 'Você falou', vi: 'Bạn đã nói', id: 'Kamu berbicara', tr: 'Sen konuştun', pl: 'Mówiłeś' }),
    duration: triLang(lang, { ru: 'Длительность разговора', uk: 'Тривалість розмови', es: 'Duración de la conversación', 'pt-BR': 'Duração da conversa', vi: 'Thời lượng cuộc trò chuyện', id: 'Durasi percakapan', tr: 'Konuşma süresi', pl: 'Czas rozmowy' }),
    goalProgress: triLang(lang, { ru: 'Цель использована увереннее', uk: 'Ціль використано впевненіше', es: 'Usaste el objetivo con más seguridad', 'pt-BR': 'Você usou o objetivo com mais confiança', vi: 'Bạn đã dùng mục tiêu tự tin hơn', id: 'Kamu memakai tujuan dengan lebih yakin', tr: 'Hedefi daha güvenli kullandın', pl: 'Cel został użyty pewniej' }),
    retry: triLang(lang, { ru: 'Проверить ещё раз', uk: 'Перевірити ще раз', es: 'Comprobar de nuevo', 'pt-BR': 'Verificar novamente', vi: 'Kiểm tra lại', id: 'Periksa lagi', tr: 'Tekrar kontrol et', pl: 'Sprawdź ponownie' }),
    home: triLang(lang, { ru: 'На главную', uk: 'На головну', es: 'Ir al inicio', 'pt-BR': 'Ir ao início', vi: 'Về trang chính', id: 'Ke beranda', tr: 'Ana sayfa', pl: 'Strona główna' }),
    callAgain: triLang(lang, { ru: 'Позвонить ещё раз', uk: 'Подзвонити ще раз', es: 'Llamar otra vez', 'pt-BR': 'Ligar de novo', vi: 'Gọi lại', id: 'Telepon lagi', tr: 'Tekrar ara', pl: 'Zadzwoń ponownie' }),
    missing: triLang(lang, { ru: 'Разбор этого разговора не найден.', uk: 'Розбір цієї розмови не знайдено.', es: 'No se encontró el análisis de esta conversación.', 'pt-BR': 'A análise desta conversa não foi encontrada.', vi: 'Không tìm thấy bản đánh giá cuộc trò chuyện này.', id: 'Ulasan percakapan ini tidak ditemukan.', tr: 'Bu konuşmanın değerlendirmesi bulunamadı.', pl: 'Nie znaleziono podsumowania tej rozmowy.' }),
    closeHint: triLang(lang, { ru: 'Закрывает разбор и возвращает на главную.', uk: 'Закриває розбір і повертає на головну.', es: 'Cierra el análisis y vuelve al inicio.', 'pt-BR': 'Fecha a análise e volta ao início.', vi: 'Đóng đánh giá và về trang chính.', id: 'Menutup ulasan dan kembali ke beranda.', tr: 'Değerlendirmeyi kapatıp ana sayfaya döner.', pl: 'Zamyka podsumowanie i wraca na stronę główną.' }),
    retryHint: triLang(lang, { ru: 'Снова проверяет, готов ли разбор.', uk: 'Знову перевіряє, чи готовий розбір.', es: 'Comprueba de nuevo si el análisis está listo.', 'pt-BR': 'Verifica novamente se a análise está pronta.', vi: 'Kiểm tra lại xem đánh giá đã sẵn sàng chưa.', id: 'Memeriksa lagi apakah ulasan sudah siap.', tr: 'Değerlendirmenin hazır olup olmadığını tekrar denetler.', pl: 'Ponownie sprawdza, czy podsumowanie jest gotowe.' }),
    practiceHint: triLang(lang, { ru: 'Открывает короткую тренировку этой фразы.', uk: 'Відкриває коротке тренування цієї фрази.', es: 'Abre una práctica breve de esta frase.', 'pt-BR': 'Abre uma prática curta desta frase.', vi: 'Mở bài luyện ngắn cho câu này.', id: 'Membuka latihan singkat untuk kalimat ini.', tr: 'Bu ifade için kısa alıştırmayı açar.', pl: 'Otwiera krótkie ćwiczenie tego zdania.' }),
    detailsHint: triLang(lang, { ru: 'Показывает время и временный текст разговора, если он ещё обрабатывается.', uk: 'Показує час і тимчасовий текст розмови, якщо він ще обробляється.', es: 'Muestra tiempos y el texto temporal mientras se procesa.', 'pt-BR': 'Mostra tempos e o texto temporário durante o processamento.', vi: 'Hiện thời gian và nội dung tạm thời khi đang xử lý.', id: 'Menampilkan waktu dan teks sementara saat masih diproses.', tr: 'İşleme sürerken süreleri ve geçici metni gösterir.', pl: 'Pokazuje czas i tymczasowy tekst podczas przetwarzania.' }),
    transcriptHint: triLang(lang, { ru: 'Разворачивает временный текст только на этом устройстве.', uk: 'Розгортає тимчасовий текст лише на цьому пристрої.', es: 'Despliega el texto temporal guardado solo en este dispositivo.', 'pt-BR': 'Expande o texto temporário salvo só neste dispositivo.', vi: 'Mở nội dung tạm thời chỉ lưu trên thiết bị này.', id: 'Membuka teks sementara yang hanya ada di perangkat ini.', tr: 'Yalnızca bu cihazdaki geçici metni açar.', pl: 'Rozwija tymczasowy tekst zapisany tylko na tym urządzeniu.' }),
    callAgainHint: triLang(lang, { ru: 'Открывает подготовку нового разговора с MAX.', uk: 'Відкриває підготовку нової розмови з MAX.', es: 'Abre la preparación de una nueva conversación con MAX.', 'pt-BR': 'Abre a preparação de uma nova conversa com o MAX.', vi: 'Mở phần chuẩn bị cho cuộc trò chuyện mới với MAX.', id: 'Membuka persiapan percakapan baru dengan MAX.', tr: 'MAX ile yeni konuşma hazırlığını açar.', pl: 'Otwiera przygotowanie nowej rozmowy z MAX.' }),
  };
}

export default function MaxVoiceReview() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const localResult = getLastMaxCallResult();
  const requestedSessionId = typeof params.sessionId === 'string' && params.sessionId.trim()
    ? params.sessionId.trim()
    : localResult?.sessionId ?? '';
  const c = useMemo(() => copy(lang), [lang]);
  // Отзыв о звонке: локальное состояние, сеть догоняет фоном (Optimistic UI).
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [reviewState, setReviewState] = useState<ReviewState>({ kind: 'loading' });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [practiceOpening, setPracticeOpening] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  // зачем: аудит 2026-08-22 — «ожидание» опрашивало сервер каждые 3с вечно;
  // после минуты переходим в ручной режим с честным объяснением и кнопкой.
  const [slowPending, setSlowPending] = useState(false);
  const pendingSinceRef = useRef<number | null>(null);
  const readyAnnouncedRef = useRef<string | null>(null);
  const readyTitleRef = useRef<Text>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    void (async () => {
      try {
        const accountKey = await getStableId();
        const exact = requestedSessionId
          ? await readMaxVoiceReviewReceipt(accountKey, requestedSessionId)
          : await readLastMaxVoiceReviewReceipt(accountKey);
        if (cancelled) return;
        if (exact) {
          setReviewState({ kind: 'ready', receipt: exact });
          return;
        }

        const pending = await listPendingMaxFinalize(accountKey);
        const envelope = requestedSessionId
          ? pending.find((item) => item.sessionId === requestedSessionId)
          : pending[pending.length - 1];
        if (!envelope) {
          setReviewState({ kind: 'empty' });
          return;
        }
        setReviewState({ kind: 'pending', envelope });
        if (pendingSinceRef.current === null) pendingSinceRef.current = Date.now();
        const outcome = await drainOneMaxFinalize(accountKey, envelope.sessionId);
        if (cancelled) return;
        if (outcome.status === 'ready') {
          setReviewState({ kind: 'ready', receipt: outcome.receipt });
          return;
        }
        if (Date.now() - pendingSinceRef.current > 60_000) {
          // Авто-опрос ограничен минутой; дальше — ручная кнопка «Проверить ещё раз».
          setSlowPending(true);
        } else {
          retryTimer = setTimeout(() => setReloadTick((value) => value + 1), 3_000);
        }
      } catch {
        if (!cancelled) setReviewState({ kind: 'error' });
      }
    })();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [requestedSessionId, reloadTick]);

  useEffect(() => {
    if (reviewState.kind !== 'ready' || readyAnnouncedRef.current === reviewState.receipt.sessionId) return;
    readyAnnouncedRef.current = reviewState.receipt.sessionId;
    const frame = requestAnimationFrame(() => {
      const node = findNodeHandle(readyTitleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
      else void AccessibilityInfo.announceForAccessibility(c.title);
    });
    return () => cancelAnimationFrame(frame);
  }, [c.title, reviewState]);

  const homeworkSavedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!localResult || localResult.format !== 'tutor') return;
    const sessionId = localResult.sessionId ?? 'local';
    if (homeworkSavedForRef.current === sessionId) return;
    homeworkSavedForRef.current = sessionId;
    void Promise.all((localResult.tutor?.homeworkItems ?? []).map(async (item, index) => {
      try {
        await captureCurrentAccountObjectiveAttempt({
          attemptId: `max-tutor-homework:${sessionId}:${index}`,
          studyTarget: localResult.studyTarget === 'fr' ? 'fr' : 'en',
          verdict: 'wrong',
          objective: true,
          content: {
            sourceKind: 'voice_review',
            sourceId: `${sessionId}:homework:${index}`,
            canonicalTarget: item.text,
            ...(item.meaning ? { sourceMeaning: item.meaning } : {}),
          },
          facet: { kind: 'form', expected: item.text },
        });
      } catch {
        // One local practice-item failure must not block the review.
      }
    }));
  }, [localResult]);

  const projection = reviewState.kind === 'ready' ? projectMaxReview(reviewState.receipt) : null;
  const pendingRequest = reviewState.kind === 'pending' ? reviewState.envelope.request : null;
  const durationSec = projection?.durationSec ?? pendingRequest?.durationSec ?? localResult?.durationSec ?? 0;
  const speechSec = reviewState.kind === 'ready'
    ? reviewState.receipt.speechSec ?? localResult?.speechSec ?? null
    : pendingRequest?.speechSec ?? localResult?.speechSec ?? null;
  const pendingHistory = reviewState.kind === 'pending' ? reviewState.envelope.request.history : [];
  const activeSessionId = projection?.sessionId ?? (reviewState.kind === 'pending'
    ? reviewState.envelope.sessionId
    : requestedSessionId);

  const goHome = () => {
    hapticTap();
    router.replace('/(tabs)/home' as any);
  };

  const callAgain = () => {
    hapticTap();
    const nextParams: Record<string, string> = {};
    if (localResult) {
      nextParams.format = localResult.format;
      if (localResult.scenarioId) nextParams.scenarioId = localResult.scenarioId;
      if (localResult.cefr) nextParams.cefr = localResult.cefr;
      if (localResult.devMode) nextParams.devMode = '1';
    }
    router.replace({ pathname: '/max_call_prestart', params: nextParams } as any);
  };

  const practiceCorrection = async () => {
    const correction = projection?.correction;
    if (!correction || practiceOpening) return;
    hapticTap();
    setPracticeOpening(true);
    try {
      const captured = await captureCurrentAccountObjectiveAttempt({
        attemptId: `max-review-correction:${activeSessionId}`,
        studyTarget: localResult?.studyTarget === 'fr' ? 'fr' : 'en',
        verdict: 'wrong',
        objective: true,
        content: {
          sourceKind: 'voice_review',
          sourceId: `${activeSessionId}:correction`,
          canonicalTarget: correction.target,
          sourceMeaning: correction.explanation,
        },
        facet: { kind: 'form', expected: correction.target },
      });
      void trackEvent('max_tutor_review_practice_started', { session_id: activeSessionId });
      router.push({
        pathname: '/mistake_practice_session',
        params: {
          focusMistakeId: captured.mistakeId,
          returnTo: 'max_voice_review',
          maxReviewSessionId: activeSessionId,
        },
      } as any);
    } catch {
      setPracticeOpening(false);
    }
  };

  const card = { backgroundColor: glassFill(t.bgSurface, 0.48), borderRadius: 20, padding: 18, marginTop: 14 } as const;

  /**
   * Отправка отзыва — оптимистичная: экран сразу говорит «спасибо», сеть догоняет
   * фоном. Ошибка откатывает состояние и возвращает текст, чтобы человек не
   * потерял написанное. Повторный тап заблокирован флагом отправки.
   */
  const sendFeedback = async (): Promise<void> => {
    const message = feedbackText.trim();
    if (feedbackState === 'sending' || (message === '' && feedbackRating === 0)) return;
    hapticTap();
    const sentText = message;
    const sentRating = feedbackRating;
    setFeedbackState('sending');
    setFeedbackText('');
    try {
      await submitMaxVoiceFeedback({
        sessionId: requestedSessionId || 'unknown',
        message: sentText,
        rating: sentRating,
        lang,
        cefr: localResult?.cefr ?? null,
        format: localResult?.format ?? null,
        callSeconds: localResult?.durationSec ?? 0,
      });
      setFeedbackState('sent');
      void trackEvent('max_voice_feedback_sent', { rating: sentRating, hasText: sentText !== '' });
    } catch {
      // Откат: возвращаем текст и оценку, человек не потерял написанное.
      setFeedbackText(sentText);
      setFeedbackState('failed');
    }
  };

  if (reviewState.kind === 'loading') {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={{ color: t.textSecond, fontSize: f.bodyLg, fontWeight: '800' }}>{c.title}</Text>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (reviewState.kind === 'empty' || reviewState.kind === 'error') {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="document-text-outline" size={40} color={t.textMuted} />
          <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '900', textAlign: 'center', marginTop: 16 }} maxFontSizeMultiplier={2}>
            {reviewState.kind === 'error' ? c.pending : c.missing}
          </Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={c.retry} accessibilityHint={c.retryHint} onPress={() => setReloadTick((value) => value + 1)} style={{ minHeight: 52, justifyContent: 'center', paddingHorizontal: 22, marginTop: 18, borderRadius: 16, backgroundColor: t.accent }}>
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}>{c.retry}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={c.home} accessibilityHint={c.closeHint} onPress={goHome} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 20, marginTop: 8 }}>
            <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '800' }}>{c.home}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const goalImproved = projection?.goal
    ? projection.goal.masteryAfter > projection.goal.masteryBefore
    : false;

  // зачем: аудит 2026-08-22 — урок, оборванный сворачиванием приложения,
  // выглядел как нормально завершённый; человек не понимал, почему он короткий.
  const endedInBackground = (reviewState.kind === 'ready'
    ? reviewState.receipt.endReason
    : pendingRequest?.endReason ?? localResult?.endReason) === 'background';

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={c.home} accessibilityHint={c.closeHint} onPress={goHome} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgCard }}>
            <Ionicons name="close" size={22} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h3, fontWeight: '900', marginLeft: 12 }} maxFontSizeMultiplier={2}>{c.title}</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* зачем (владелец 2026-08-23): «на экране результатов в самом верху
              добавь окно ввода фидбека с кнопкой отправить». Стоит первым: пока
              впечатление свежее, человек ещё готов написать. */}
          <View testID="max-voice-review-feedback" style={{ ...card, marginTop: 8 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }} maxFontSizeMultiplier={2}>
              {c.feedbackTitle}
            </Text>
            {feedbackState === 'sent' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Ionicons name="checkmark-circle" size={20} color={t.correctText} />
                <Text accessibilityLiveRegion="polite" style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }} maxFontSizeMultiplier={2}>
                  {c.feedbackThanks}
                </Text>
              </View>
            ) : (
              <>
                <View accessibilityRole="radiogroup" accessibilityLabel={c.feedbackRating} style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={`star-${star}`}
                      testID={`max-voice-feedback-star-${star}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: feedbackRating >= star }}
                      accessibilityLabel={`${c.feedbackRating} ${star}`}
                      onPress={() => {
                        hapticTap();
                        setFeedbackRating(star);
                        if (feedbackState === 'failed') setFeedbackState('idle');
                      }}
                      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons
                        name={feedbackRating >= star ? 'star' : 'star-outline'}
                        size={26}
                        color={feedbackRating >= star ? t.gold : t.textGhost}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  testID="max-voice-feedback-input"
                  accessibilityLabel={c.feedbackTitle}
                  value={feedbackText}
                  onChangeText={(value) => {
                    setFeedbackText(value);
                    if (feedbackState === 'failed') setFeedbackState('idle');
                  }}
                  placeholder={c.feedbackPlaceholder}
                  placeholderTextColor={t.textGhost}
                  multiline
                  maxLength={2000}
                  maxFontSizeMultiplier={2}
                  style={{
                    color: t.textPrimary,
                    fontSize: f.body,
                    fontWeight: '600',
                    lineHeight: Math.round(f.body * 1.4),
                    backgroundColor: glassFill(t.bgCard, 0.7),
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingTop: 12,
                    paddingBottom: 12,
                    marginTop: 12,
                    minHeight: 92,
                    textAlignVertical: 'top',
                  }}
                />
                {feedbackState === 'failed' ? (
                  <Text accessibilityLiveRegion="polite" style={{ color: t.wrongText, fontSize: f.sub, fontWeight: '800', marginTop: 10 }} maxFontSizeMultiplier={2}>
                    {c.feedbackFailed}
                  </Text>
                ) : null}
                <TouchableOpacity
                  testID="max-voice-feedback-send"
                  accessibilityRole="button"
                  accessibilityLabel={c.feedbackSend}
                  accessibilityState={{ disabled: feedbackState === 'sending' || (feedbackText.trim() === '' && feedbackRating === 0) }}
                  disabled={feedbackState === 'sending' || (feedbackText.trim() === '' && feedbackRating === 0)}
                  onPress={() => { void sendFeedback(); }}
                  style={{
                    marginTop: 12,
                    minHeight: 48,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: feedbackText.trim() === '' && feedbackRating === 0 ? glassFill(t.bgCard, 0.6) : t.accent,
                    opacity: feedbackState === 'sending' ? 0.7 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: feedbackText.trim() === '' && feedbackRating === 0 ? t.textGhost : t.onAccent,
                      fontSize: f.body,
                      fontWeight: '900',
                    }}
                    maxFontSizeMultiplier={2}
                  >
                    {c.feedbackSend}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View testID="max-voice-review-hero" style={{ ...card, marginTop: 8, backgroundColor: t.accentBg }}>
            <Text style={{ color: t.accent, fontSize: f.label, fontWeight: '900', textTransform: 'uppercase' }} maxFontSizeMultiplier={2}>{c.completed}</Text>
            <Text ref={readyTitleRef} accessibilityRole="header" style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', lineHeight: Math.round(f.h2 * 1.25), marginTop: 8 }} maxFontSizeMultiplier={2}>
              {projection?.hero || c.completed}
            </Text>
            {goalImproved ? <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '800', marginTop: 10 }} maxFontSizeMultiplier={2}>{c.goalProgress}</Text> : null}
            {endedInBackground ? (
              <Text testID="max-voice-review-background-note" style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', marginTop: 10 }} maxFontSizeMultiplier={2}>{c.endedBackground}</Text>
            ) : null}
            {reviewState.kind === 'pending' ? (
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {slowPending ? null : <ActivityIndicator size="small" color={t.accent} />}
                  <Text accessibilityLiveRegion="polite" style={{ flex: 1, color: t.textSecond, fontSize: f.body, fontWeight: '700', lineHeight: Math.round(f.body * 1.4) }} maxFontSizeMultiplier={2}>
                    {slowPending ? c.pendingLong : c.pending}
                  </Text>
                </View>
                {slowPending ? (
                  <TouchableOpacity
                    testID="max-voice-review-recheck"
                    accessibilityRole="button"
                    accessibilityLabel={c.retry}
                    accessibilityHint={c.retryHint}
                    onPress={() => { hapticTap(); setReloadTick((value) => value + 1); }}
                    style={{ minHeight: 48, borderRadius: 14, backgroundColor: t.bgCard, marginTop: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}
                  >
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }} maxFontSizeMultiplier={2}>{c.retry}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>

          <View testID="max-voice-review-worked" style={card}>
            <Text style={{ color: t.accent, fontSize: f.h3, fontWeight: '900' }} maxFontSizeMultiplier={2}>{c.worked}</Text>
            {(projection?.worked ?? []).map((item, index) => (
              <View key={`worked-${index}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 }}>
                <Ionicons name="checkmark-circle" size={22} color={t.accent} />
                <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', lineHeight: Math.round(f.bodyLg * 1.38) }} maxFontSizeMultiplier={2}>{item}</Text>
              </View>
            ))}
            {!projection ? <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 10 }}>{c.pending}</Text> : null}
          </View>

          <View testID="max-voice-review-fix" style={card}>
            <Text style={{ color: t.gold, fontSize: f.h3, fontWeight: '900' }} maxFontSizeMultiplier={2}>{c.fix}</Text>
            {projection?.correction ? (
              <>
                <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', marginTop: 14, textTransform: 'uppercase' }} maxFontSizeMultiplier={2}>{c.said}</Text>
                <Text style={{ color: t.textSecond, fontSize: f.bodyLg, marginTop: 4, textDecorationLine: 'line-through' }} maxFontSizeMultiplier={2}>{projection.correction.said}</Text>
                <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', marginTop: 14, textTransform: 'uppercase' }} maxFontSizeMultiplier={2}>{c.say}</Text>
                <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '900', marginTop: 4 }} maxFontSizeMultiplier={2}>{projection.correction.target}</Text>
                <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.45), marginTop: 10 }} maxFontSizeMultiplier={2}>{projection.correction.explanation}</Text>
                <TouchableOpacity testID="max-voice-review-practice" accessibilityRole="button" accessibilityLabel={c.practice} accessibilityHint={c.practiceHint} accessibilityState={{ busy: practiceOpening, disabled: practiceOpening }} disabled={practiceOpening} onPress={() => void practiceCorrection()} style={{ minHeight: 54, borderRadius: 16, backgroundColor: t.accent, marginTop: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
                  {/* зачем: аудит 2026-08-22 — busy был только в accessibility, зрячий не видел отклика */}
                  {practiceOpening
                    ? <ActivityIndicator size="small" color={t.correctText} />
                    : <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900', textAlign: 'center' }} maxFontSizeMultiplier={2}>{c.practice}</Text>}
                </TouchableOpacity>
              </>
            ) : <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.45), marginTop: 12 }} maxFontSizeMultiplier={2}>{projection ? c.noFix : c.pending}</Text>}
          </View>

          <View testID="max-voice-review-tomorrow" style={card}>
            <Text style={{ color: t.accent, fontSize: f.h3, fontWeight: '900' }} maxFontSizeMultiplier={2}>{c.tomorrow}</Text>
            {(projection?.tomorrowActions ?? []).map((action, index) => (
              <View key={`tomorrow-${index}`} testID={`max-voice-review-tomorrow-action-${index}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 14 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '900' }}>{index + 1}</Text></View>
                <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', lineHeight: Math.round(f.bodyLg * 1.38) }} maxFontSizeMultiplier={2}>{action}</Text>
              </View>
            ))}
            {projection?.targetPhrase ? (
              <View testID="max-voice-review-target-phrase" style={{ borderRadius: 16, backgroundColor: t.accentBg, padding: 14, marginTop: 18 }}>
                <Text style={{ color: t.accent, fontSize: f.label, fontWeight: '900', textTransform: 'uppercase' }} maxFontSizeMultiplier={2}>{c.targetPhrase}</Text>
                <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '900', marginTop: 6 }} maxFontSizeMultiplier={2}>{projection.targetPhrase}</Text>
              </View>
            ) : null}
            {projection?.nextConversation ? (
              <View testID="max-voice-review-next-topic" style={{ borderTopWidth: 1, borderTopColor: t.border, paddingTop: 14, marginTop: 16 }}>
                <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', textTransform: 'uppercase' }} maxFontSizeMultiplier={2}>{c.next}</Text>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800', marginTop: 5 }} maxFontSizeMultiplier={2}>{projection.nextConversation}</Text>
              </View>
            ) : null}
            {!projection ? <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 12 }}>{c.pending}</Text> : null}
          </View>

          <TouchableOpacity testID="max-voice-review-details-toggle" accessibilityRole="button" accessibilityLabel={detailsOpen ? c.hideDetails : c.details} accessibilityHint={c.detailsHint} accessibilityState={{ expanded: detailsOpen }} onPress={() => { hapticTap(); setDetailsOpen((value) => !value); }} style={{ minHeight: 54, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '900' }}>{detailsOpen ? c.hideDetails : c.details}</Text>
            <Ionicons name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.textSecond} />
          </TouchableOpacity>

          {detailsOpen ? (
            <View testID="max-voice-review-details" style={card}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {speechSec !== null ? <View style={{ flex: 1 }}><Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900' }}>{formatDuration(speechSec)}</Text><Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 4 }} maxFontSizeMultiplier={2}>{c.speakingTime}</Text></View> : null}
                <View style={{ flex: 1 }}><Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900' }}>{formatDuration(durationSec)}</Text><Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 4 }} maxFontSizeMultiplier={2}>{c.duration}</Text></View>
              </View>
              {reviewState.kind === 'pending' && pendingHistory.length > 0 ? (
                <View style={{ marginTop: 18 }}>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={c.transcript} accessibilityHint={c.transcriptHint} accessibilityState={{ expanded: transcriptOpen }} onPress={() => setTranscriptOpen((value) => !value)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}><Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>{c.transcript}</Text><Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 3 }}>{c.temporary}</Text></View>
                    <Ionicons name={transcriptOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.textMuted} />
                  </TouchableOpacity>
                  {transcriptOpen ? <View testID="max-voice-review-transcript-content" style={{ marginTop: 8 }}>{pendingHistory.map((turn, index) => <Text key={`transcript-${index}`} style={{ color: turn.role === 'user' ? t.textPrimary : t.textMuted, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.45), marginTop: index === 0 ? 0 : 8 }} maxFontSizeMultiplier={2}>{turn.text}</Text>)}</View> : null}
                </View>
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity accessibilityRole="button" accessibilityLabel={c.home} accessibilityHint={c.closeHint} onPress={goHome} style={{ minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: t.border, marginTop: 18, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '900' }}>{c.home}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={c.callAgain} accessibilityHint={c.callAgainHint} onPress={callAgain} style={{ minHeight: 58, borderRadius: 18, backgroundColor: t.accent, marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="call" size={20} color={t.correctText} /><Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '900' }}>{c.callAgain}</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
