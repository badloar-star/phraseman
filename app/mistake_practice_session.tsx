import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer } from 'expo-audio';
import { useManagedSpokenAudioPlayer } from '../hooks/use_managed_spoken_audio_player';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import ScreenGradient from '../components/ScreenGradient';
import { SpeakingPanel, buildSpeakingPanelTheme, type SpeakingPanelStatus } from '../components/SpeakingPanel';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import ReportErrorButton from '../components/ReportErrorButton';
import { matchesMistakePracticeAnswer } from './mistake_practice_answer_match';
import { mistakePracticeTokenOrder } from './mistake_practice_token_order';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { triLang, type Lang } from '../constants/i18n';
import { canonicalJsonV1, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';
import { MISTAKE_EXERCISE_MODE_REGISTRY } from '../modules/mistake-practice/exercise_mode_registry';
import {
  classifyMistakeVoiceVerdict,
  mistakeVoiceOutcomeToSessionAttemptVerdict,
} from '../modules/mistake-practice/voice_verdict';
import { SPEECH_PRONUNCIATION_PASS_THRESHOLD } from './pronunciation_scoring_client';
import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import { projectMistakes } from '../modules/mistake-practice/projection';
import {
  advanceMistakePracticeSession,
  type MistakePracticeLength,
  mistakePracticeProgress,
  mistakePracticeSessionCostsEnergy,
  type MistakePracticeSession,
  type MistakePracticeSessionEntry,
} from '../modules/mistake-practice/session';
import { appendMistakeEvent, loadMistakeEventJournal } from './mistake_practice_store';
import MistakeVerdictPanel from '../components/mistake-practice/MistakeVerdictPanel';
import MistakeSessionFinale, { type MistakeFinaleFixed } from '../components/mistake-practice/MistakeSessionFinale';
import { buildMistakeRewardsSnapshot, titleFor, type MistakeRewardsSnapshot, type MistakeTitleId } from '../modules/mistake-practice/rewards_model';
import MistakeEli5Modal from '../components/MistakeEli5Modal';
import AiExplainConsentModal from '../components/AiExplainConsentModal';
import { useMistakeExplain } from './use_mistake_explain';
import { prewarmMistakeSessionExplanations } from './mistake_explain_prewarm';
import { prepareMistakePracticeSession } from './mistake_practice_session_runtime';
import { trackMistakePracticeEvent } from './mistake_practice_analytics';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import {
  flushPendingMistakeCorrectionRewards,
  settleMistakePracticeAnswerRewards,
  settleMistakePracticeCompletionReward,
} from './mistake_practice_rewards';
import {
  clearMistakePracticeSession,
  saveMistakePracticeSession,
} from './mistake_practice_session_store';
import { getStableId } from './stable_id';
import { markPersonalPlanTaskCompleted } from './personal_plan_progress';
import { withOptionalPersonalPlanSunsetGuard } from '../components/personal_plan_sunset_guard';
import { checkAchievements } from './achievements';
import { getMistakePracticeAchievementSnapshot } from './mistake_practice_insights';
import SessionAttemptsHud from '../components/session_attempts/SessionAttemptsHud';
import PracticeRuneCounter from '../components/PracticeRuneCounter';
import LearningV2RuneFlight from '../components/LearningV2RuneFlight';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import { usePracticeRuneFlight } from '../hooks/usePracticeRuneFlight';
import { readDevPracticeRunesFakeState } from './dev_practice_runes_seed';
import { useSessionAttempts } from '../hooks/useSessionAttempts';
import { useSessionAttemptAutoReset } from '../hooks/useSessionAttemptAutoReset';
import { captureAccountGeneration } from './account_generation';
import { makeFeedbackAttemptId } from './feedback_attempt_identity';
import { SESSION_ATTEMPTS_MOTION } from '../constants/motionHybrid';

type Feedback = {
  correct: boolean;
  answer: string;
  explanation: string;
  stopForToday: boolean;
  /**
   * зачем (владелец 2026-09-14, макет промаха А): панель вердикта показывает
   * ответ ученика РЯДОМ с верным и подсвечивает расхождение — раньше своего
   * ответа на экране не было вовсе, и понять, что именно не так, было нельзя.
   */
  userAnswer: string;
  /** Цепочка «3 верных дня в 2 режимах» из проекции — правило стало видимым. */
  chain: { days: number; modes: number; gainedToday: boolean; corrected: boolean } | null;
};

const localDay = (atMs: number): string => {
  const date = new Date(atMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const sessionCopy = (lang: Lang) => triLang(lang, {
  ru: {
    listen: 'Прослушать', unsupported: 'Этот язык пока не поддерживается в разделе ошибок.',
    noLongerDue: 'Эта фраза уже не требует тренировки.', minFive: 'Готовых к разбору ошибок сейчас нет.',
    prepareFailed: 'Не удалось подготовить тренировку. Попробуй ещё раз.', noEnergy: 'Не хватает энергии для продолжения.',
    speechUncertain: 'Не удалось уверенно распознать речь. Попробуй ещё раз — энергия не потрачена.',
    speechRetry: 'Попробуй ещё раз — энергия не потрачена.', sessionEnded: 'Сессия закончена', back: 'Вернуться',
    sessionComplete: 'Сессия завершена', done: 'Готово', close: 'Закрыть', hideError: 'Скрыть ошибку',
    buildPhrase: 'Собери фразу', answerPlaceholder: 'Напиши ответ', holdToSpeak: 'Удерживай, чтобы говорить',
    holdAndSpeak: 'Удерживай и говори', correct: 'Верно', needsFix: 'Нужно поправить',
    correctAnswer: 'Правильный ответ', why: 'Почему так', stopToday: 'На сегодня хватит повторов этой ошибки — вернёмся к ней позже.',
    hidden: 'Ошибка скрыта', undo: 'Вернуть', continue: 'Продолжить', check: 'Проверить',
    hideTitle: 'Скрыть ошибку?', cancel: 'Отмена', hide: 'Скрыть',
    explanationWordOrder: 'Сверь порядок слов: в английской фразе позиция каждого слова меняет смысл.',
    explanationMissing: 'Проверь пропущенное слово и прочитай целую фразу ещё раз.',
    explanationMeaning: 'Свяжи значение со всей фразой, а не с одним знакомым словом.',
    explanationPronunciation: 'Скажи фразу спокойно и отчётливо, сохраняя ударение и окончания.',
    explanationListening: 'Сначала найди опорные слова на слух, затем восстанови полную фразу.',
    explanationDefault: 'Сравни свой вариант с правильной формой и обрати внимание на окончание и служебные слова.',
  },
  uk: {
    listen: 'Прослухати', unsupported: 'Ця мова поки не підтримується в розділі помилок.',
    noLongerDue: 'Цю фразу вже не потрібно тренувати.', minFive: 'Готових до розбору помилок зараз немає.',
    prepareFailed: 'Не вдалося підготувати тренування. Спробуй ще раз.', noEnergy: 'Недостатньо енергії для продовження.',
    speechUncertain: 'Не вдалося впевнено розпізнати мовлення. Спробуй ще раз — енергію не витрачено.',
    speechRetry: 'Спробуй ще раз — енергію не витрачено.', sessionEnded: 'Сесію завершено', back: 'Повернутися',
    sessionComplete: 'Сесію завершено', done: 'Готово', close: 'Закрити', hideError: 'Сховати помилку',
    buildPhrase: 'Склади фразу', answerPlaceholder: 'Напиши відповідь', holdToSpeak: 'Утримуй, щоб говорити',
    holdAndSpeak: 'Утримуй і говори', correct: 'Правильно', needsFix: 'Потрібно виправити',
    correctAnswer: 'Правильна відповідь', why: 'Чому так', stopToday: 'На сьогодні досить повторів цієї помилки — повернемося до неї пізніше.',
    hidden: 'Помилку сховано', undo: 'Повернути', continue: 'Продовжити', check: 'Перевірити',
    hideTitle: 'Сховати помилку?', cancel: 'Скасувати', hide: 'Сховати',
    explanationWordOrder: 'Звір порядок слів: в англійській фразі позиція кожного слова змінює зміст.',
    explanationMissing: 'Перевір пропущене слово й прочитай усю фразу ще раз.',
    explanationMeaning: 'Пов’яжи значення з усією фразою, а не з одним знайомим словом.',
    explanationPronunciation: 'Скажи фразу спокійно й чітко, зберігаючи наголос і закінчення.',
    explanationListening: 'Спочатку знайди опорні слова на слух, потім віднови повну фразу.',
    explanationDefault: 'Порівняй свій варіант із правильною формою та зверни увагу на закінчення і службові слова.',
  },
  en: {
    listen: 'Listen', unsupported: 'This language is not yet supported in the mistakes section.',
    noLongerDue: 'This phrase no longer needs practice.', minFive: 'There are no mistakes ready to practise right now.',
    prepareFailed: 'Could not prepare the practice. Try again.', noEnergy: 'Not enough energy to continue.',
    speechUncertain: 'Could not reliably recognize your speech. Try again — no energy was spent.',
    speechRetry: 'Try again — no energy was spent.', sessionEnded: 'Session ended', back: 'Back',
    sessionComplete: 'Session complete', done: 'Done', close: 'Close', hideError: 'Hide mistake',
    buildPhrase: 'Build the phrase', answerPlaceholder: 'Write your answer', holdToSpeak: 'Hold to speak',
    holdAndSpeak: 'Hold and speak', correct: 'Correct', needsFix: 'Needs fixing',
    correctAnswer: 'Correct answer', why: 'Why', stopToday: 'That\'s enough repeats of this mistake for today — we\'ll come back to it later.',
    hidden: 'Mistake hidden', undo: 'Undo', continue: 'Continue', check: 'Check',
    hideTitle: 'Hide this mistake?', cancel: 'Cancel', hide: 'Hide',
    explanationWordOrder: 'Check the word order: in an English sentence, each word\'s position changes the meaning.',
    explanationMissing: 'Check the missing word and read the whole phrase again.',
    explanationMeaning: 'Connect the meaning to the whole phrase, not just one familiar word.',
    explanationPronunciation: 'Say the phrase calmly and clearly, keeping the stress and endings.',
    explanationListening: 'First catch the key words by ear, then reconstruct the full phrase.',
    explanationDefault: 'Compare your answer with the correct form and pay attention to endings and function words.',
  },
  es: {
    listen: 'Escuchar', unsupported: 'Este idioma aún no está disponible en la sección de errores.',
    noLongerDue: 'Esta frase ya no necesita práctica.', minFive: 'Ahora mismo no hay errores listos para practicar.',
    prepareFailed: 'No se pudo preparar la práctica. Inténtalo de nuevo.', noEnergy: 'No tienes energía suficiente para continuar.',
    speechUncertain: 'No se pudo reconocer el habla con seguridad. Inténtalo de nuevo; no se gastó energía.',
    speechRetry: 'Inténtalo de nuevo; no se gastó energía.', sessionEnded: 'La sesión terminó', back: 'Volver',
    sessionComplete: 'Sesión completada', done: 'Listo', close: 'Cerrar', hideError: 'Ocultar error',
    buildPhrase: 'Construye la frase', answerPlaceholder: 'Escribe la respuesta', holdToSpeak: 'Mantén pulsado para hablar',
    holdAndSpeak: 'Mantén pulsado y habla', correct: 'Correcto', needsFix: 'Hay que corregirlo',
    correctAnswer: 'Respuesta correcta', why: 'Por qué', stopToday: 'Ya es suficiente por hoy; volveremos a este error más tarde.',
    hidden: 'Error ocultado', undo: 'Deshacer', continue: 'Continuar', check: 'Comprobar',
    hideTitle: '¿Ocultar este error?', cancel: 'Cancelar', hide: 'Ocultar',
    explanationWordOrder: 'Revisa el orden: en inglés, la posición de cada palabra cambia el sentido.',
    explanationMissing: 'Comprueba la palabra omitida y vuelve a leer la frase completa.',
    explanationMeaning: 'Relaciona el significado con toda la frase, no solo con una palabra conocida.',
    explanationPronunciation: 'Di la frase con calma y claridad, manteniendo el acento y las terminaciones.',
    explanationListening: 'Primero identifica las palabras clave al escuchar y luego reconstruye la frase completa.',
    explanationDefault: 'Compara tu respuesta con la forma correcta y fíjate en las terminaciones y palabras auxiliares.',
  },
  'pt-BR': {
    listen: 'Ouvir', unsupported: 'Este idioma ainda não é suportado na seção de erros.',
    noLongerDue: 'Esta frase não precisa mais de prática.', minFive: 'No momento não há erros prontos para praticar.',
    prepareFailed: 'Não foi possível preparar o treino. Tente novamente.', noEnergy: 'Energia insuficiente para continuar.',
    speechUncertain: 'Não foi possível reconhecer a fala com segurança. Tente novamente — a energia não foi gasta.',
    speechRetry: 'Tente novamente — a energia não foi gasta.', sessionEnded: 'Sessão encerrada', back: 'Voltar',
    sessionComplete: 'Sessão concluída', done: 'Pronto', close: 'Fechar', hideError: 'Ocultar erro',
    buildPhrase: 'Monte a frase', answerPlaceholder: 'Escreva a resposta', holdToSpeak: 'Segure para falar',
    holdAndSpeak: 'Segure e fale', correct: 'Correto', needsFix: 'Precisa corrigir',
    correctAnswer: 'Resposta correta', why: 'Por que', stopToday: 'Chega de repetições desse erro por hoje — voltaremos a ele mais tarde.',
    hidden: 'Erro ocultado', undo: 'Desfazer', continue: 'Continuar', check: 'Verificar',
    hideTitle: 'Ocultar este erro?', cancel: 'Cancelar', hide: 'Ocultar',
    explanationWordOrder: 'Confira a ordem das palavras: em inglês, a posição de cada palavra muda o sentido.',
    explanationMissing: 'Verifique a palavra que faltou e leia a frase inteira de novo.',
    explanationMeaning: 'Relacione o significado com a frase toda, não só com uma palavra conhecida.',
    explanationPronunciation: 'Diga a frase com calma e clareza, mantendo o acento e as terminações.',
    explanationListening: 'Primeiro identifique as palavras-chave ao ouvir e depois reconstrua a frase completa.',
    explanationDefault: 'Compare sua resposta com a forma correta e preste atenção nas terminações e palavras auxiliares.',
  },
  vi: {
    listen: 'Nghe', unsupported: 'Ngôn ngữ này chưa được hỗ trợ trong phần lỗi sai.',
    noLongerDue: 'Cụm từ này không còn cần luyện tập nữa.', minFive: 'Hiện chưa có lỗi nào sẵn sàng để luyện.',
    prepareFailed: 'Không thể chuẩn bị buổi luyện tập. Hãy thử lại.', noEnergy: 'Không đủ năng lượng để tiếp tục.',
    speechUncertain: 'Không thể nhận diện giọng nói một cách chắc chắn. Hãy thử lại — năng lượng chưa bị trừ.',
    speechRetry: 'Hãy thử lại — năng lượng chưa bị trừ.', sessionEnded: 'Buổi học đã kết thúc', back: 'Quay lại',
    sessionComplete: 'Đã hoàn thành buổi học', done: 'Xong', close: 'Đóng', hideError: 'Ẩn lỗi',
    buildPhrase: 'Ghép câu', answerPlaceholder: 'Viết câu trả lời', holdToSpeak: 'Giữ để nói',
    holdAndSpeak: 'Giữ và nói', correct: 'Đúng', needsFix: 'Cần sửa lại',
    correctAnswer: 'Đáp án đúng', why: 'Vì sao', stopToday: 'Hôm nay đã đủ lần lặp lại lỗi này — ta sẽ quay lại sau.',
    hidden: 'Đã ẩn lỗi', undo: 'Hoàn tác', continue: 'Tiếp tục', check: 'Kiểm tra',
    hideTitle: 'Ẩn lỗi này?', cancel: 'Hủy', hide: 'Ẩn',
    explanationWordOrder: 'Kiểm tra trật tự từ: trong câu tiếng Anh, vị trí mỗi từ thay đổi ý nghĩa.',
    explanationMissing: 'Kiểm tra từ bị thiếu và đọc lại toàn bộ câu.',
    explanationMeaning: 'Liên kết ý nghĩa với cả câu, không chỉ với một từ quen thuộc.',
    explanationPronunciation: 'Nói câu một cách bình tĩnh và rõ ràng, giữ đúng trọng âm và đuôi từ.',
    explanationListening: 'Trước tiên hãy tìm các từ khóa khi nghe, sau đó khôi phục lại toàn bộ câu.',
    explanationDefault: 'So sánh câu trả lời của bạn với dạng đúng và chú ý đến đuôi từ và từ chức năng.',
  },
  id: {
    listen: 'Dengarkan', unsupported: 'Bahasa ini belum didukung di bagian kesalahan.',
    noLongerDue: 'Frasa ini tidak lagi perlu dilatih.', minFive: 'Saat ini belum ada kesalahan yang siap dilatih.',
    prepareFailed: 'Gagal menyiapkan latihan. Coba lagi.', noEnergy: 'Energi tidak cukup untuk melanjutkan.',
    speechUncertain: 'Tidak dapat mengenali ucapan dengan yakin. Coba lagi — energi tidak terpakai.',
    speechRetry: 'Coba lagi — energi tidak terpakai.', sessionEnded: 'Sesi berakhir', back: 'Kembali',
    sessionComplete: 'Sesi selesai', done: 'Selesai', close: 'Tutup', hideError: 'Sembunyikan kesalahan',
    buildPhrase: 'Susun kalimat', answerPlaceholder: 'Tulis jawaban', holdToSpeak: 'Tahan untuk berbicara',
    holdAndSpeak: 'Tahan dan bicara', correct: 'Benar', needsFix: 'Perlu diperbaiki',
    correctAnswer: 'Jawaban benar', why: 'Mengapa begitu', stopToday: 'Cukup pengulangan kesalahan ini untuk hari ini — kita kembali lagi nanti.',
    hidden: 'Kesalahan disembunyikan', undo: 'Batalkan', continue: 'Lanjutkan', check: 'Periksa',
    hideTitle: 'Sembunyikan kesalahan ini?', cancel: 'Batal', hide: 'Sembunyikan',
    explanationWordOrder: 'Periksa urutan kata: dalam kalimat bahasa Inggris, posisi setiap kata mengubah arti.',
    explanationMissing: 'Periksa kata yang hilang dan baca ulang seluruh kalimat.',
    explanationMeaning: 'Hubungkan arti dengan seluruh kalimat, bukan hanya satu kata yang dikenal.',
    explanationPronunciation: 'Ucapkan kalimat dengan tenang dan jelas, jaga tekanan dan akhiran kata.',
    explanationListening: 'Cari dulu kata kunci saat mendengarkan, lalu susun ulang kalimat lengkapnya.',
    explanationDefault: 'Bandingkan jawabanmu dengan bentuk yang benar dan perhatikan akhiran serta kata bantu.',
  },
  tr: {
    listen: 'Dinle', unsupported: 'Bu dil hatalar bölümünde henüz desteklenmiyor.',
    noLongerDue: 'Bu ifade artık pratiğe gerek duymuyor.', minFive: 'Şu anda çalışmaya hazır hata yok.',
    prepareFailed: 'Pratik hazırlanamadı. Tekrar dene.', noEnergy: 'Devam etmek için yeterli enerji yok.',
    speechUncertain: 'Konuşma güvenilir şekilde tanınamadı. Tekrar dene — enerji harcanmadı.',
    speechRetry: 'Tekrar dene — enerji harcanmadı.', sessionEnded: 'Oturum sona erdi', back: 'Geri dön',
    sessionComplete: 'Oturum tamamlandı', done: 'Tamam', close: 'Kapat', hideError: 'Hatayı gizle',
    buildPhrase: 'Cümleyi oluştur', answerPlaceholder: 'Cevabı yaz', holdToSpeak: 'Konuşmak için basılı tut',
    holdAndSpeak: 'Basılı tut ve konuş', correct: 'Doğru', needsFix: 'Düzeltilmesi gerekiyor',
    correctAnswer: 'Doğru cevap', why: 'Neden böyle', stopToday: 'Bu hata için bugünlük bu kadar tekrar yeter — sonra döneriz.',
    hidden: 'Hata gizlendi', undo: 'Geri al', continue: 'Devam et', check: 'Kontrol et',
    hideTitle: 'Bu hata gizlensin mi?', cancel: 'Vazgeç', hide: 'Gizle',
    explanationWordOrder: 'Kelime sırasını kontrol et: İngilizce cümlede her kelimenin konumu anlamı değiştirir.',
    explanationMissing: 'Eksik kelimeyi kontrol et ve tüm cümleyi tekrar oku.',
    explanationMeaning: 'Anlamı tüm cümleyle ilişkilendir, sadece bildiğin bir kelimeyle değil.',
    explanationPronunciation: 'Cümleyi sakin ve net söyle, vurguyu ve ekleri koru.',
    explanationListening: 'Önce dinlerken anahtar kelimeleri bul, sonra tüm cümleyi yeniden kur.',
    explanationDefault: 'Cevabını doğru formla karşılaştır ve eklere ve yardımcı kelimelere dikkat et.',
  },
  pl: {
    listen: 'Odsłuchaj', unsupported: 'Ten język nie jest jeszcze obsługiwany w sekcji błędów.',
    noLongerDue: 'Ta fraza nie wymaga już treningu.', minFive: 'Na razie nie ma błędów gotowych do ćwiczenia.',
    prepareFailed: 'Nie udało się przygotować treningu. Spróbuj ponownie.', noEnergy: 'Za mało energii, aby kontynuować.',
    speechUncertain: 'Nie udało się pewnie rozpoznać mowy. Spróbuj ponownie — energia nie została zużyta.',
    speechRetry: 'Spróbuj ponownie — energia nie została zużyta.', sessionEnded: 'Sesja zakończona', back: 'Wróć',
    sessionComplete: 'Sesja zakończona', done: 'Gotowe', close: 'Zamknij', hideError: 'Ukryj błąd',
    buildPhrase: 'Ułóż zdanie', answerPlaceholder: 'Wpisz odpowiedź', holdToSpeak: 'Przytrzymaj, aby mówić',
    holdAndSpeak: 'Przytrzymaj i mów', correct: 'Poprawnie', needsFix: 'Trzeba poprawić',
    correctAnswer: 'Poprawna odpowiedź', why: 'Dlaczego tak', stopToday: 'Na dziś wystarczy powtórek tego błędu — wrócimy do niego później.',
    hidden: 'Błąd ukryty', undo: 'Cofnij', continue: 'Kontynuuj', check: 'Sprawdź',
    hideTitle: 'Ukryć ten błąd?', cancel: 'Anuluj', hide: 'Ukryj',
    explanationWordOrder: 'Sprawdź szyk wyrazów: w angielskim zdaniu pozycja każdego słowa zmienia znaczenie.',
    explanationMissing: 'Sprawdź brakujące słowo i przeczytaj całe zdanie jeszcze raz.',
    explanationMeaning: 'Połącz znaczenie z całym zdaniem, a nie tylko ze znanym słowem.',
    explanationPronunciation: 'Powiedz zdanie spokojnie i wyraźnie, zachowując akcent i końcówki.',
    explanationListening: 'Najpierw znajdź słowa kluczowe ze słuchu, potem odtwórz całe zdanie.',
    explanationDefault: 'Porównaj swoją odpowiedź z poprawną formą i zwróć uwagę na końcówki i słowa pomocnicze.',
  },
});

const explanationFor = (entry: MistakePracticeSessionEntry, copy: ReturnType<typeof sessionCopy>): string => {
  if (entry.facet === 'word_order') return copy.explanationWordOrder;
  if (entry.facet === 'missing_token') return copy.explanationMissing;
  if (entry.facet === 'meaning') return copy.explanationMeaning;
  if (entry.facet === 'pronunciation') return copy.explanationPronunciation;
  if (entry.facet === 'listening') return copy.explanationListening;
  return copy.explanationDefault;
};

function ListeningPlayback({ audioRef, color, foreground, accessibilityLabel }: Readonly<{
  audioRef: string;
  color: string;
  foreground: string;
  accessibilityLabel: string;
}>) {
  const player = useAudioPlayer({ uri: audioRef });
  // зачем (аудит карты владения звуком, 2026-09-15): этот плеер играл МИМО
  // общего владения аудиотрактом. На ЭТОМ ЖЕ экране живёт микрофон
  // (SpeakingPanel ниже), поэтому звук из динамика мог зазвучать прямо во время
  // записи ответа и попасть в неё. Плюс он не уважал тумблер голоса в
  // настройках и не уступал звук другому экрану. Управляемый плеер закрывает
  // всё три пункта одним подключением.
  const managedPlayer = useManagedSpokenAudioPlayer(player);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => { void managedPlayer.playFromStart(); }}
      style={[styles.audioButton, { backgroundColor: color }]}
    >
      <Ionicons name="volume-high" size={24} color={foreground} />
    </Pressable>
  );
}

function MistakePracticeScreenFrame({ children, centered = false }: Readonly<{
  children: React.ReactNode;
  centered?: boolean;
}>) {
  return (
    <ScreenGradient>
      <SafeAreaView style={styles.screen}>
        {centered ? <View style={[styles.screen, styles.center]}>{children}</View> : children}
      </SafeAreaView>
    </ScreenGradient>
  );
}

function MistakePracticeSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    length?: string;
    lessonId?: string;
    planTaskId?: string;
    planInstanceId?: string;
    planId?: string;
    planDayIndex?: string;
    focusMistakeId?: string;
    returnTo?: string;
    maxReviewSessionId?: string;
    devRunesSeed?: string | string[];
    devJumpToFinale?: string | string[];
  }>();
  // зачем (владелец, 2026-08-27): DEV-хаб «Проверка рун» открывает НАСТОЯЩИЙ
  // экран, но счётчик стартует со случайного числа вместо реальной копилки.
  // Диск и сеть в этом режиме не трогаются (см. hooks/usePracticeRunes).
  const devRunesFake = useMemo(
    () => readDevPracticeRunesFakeState(params.devRunesSeed),
    [params.devRunesSeed],
  );
  const devJumpToFinale = (Array.isArray(params.devJumpToFinale) ? params.devJumpToFinale[0] : params.devJumpToFinale) === '1';
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const copy = useMemo(() => sessionCopy(lang), [lang]);
  const { studyTarget } = useStudyTarget();
  const [attemptSessionId] = useState(makeFeedbackAttemptId);
  const accountToken = useMemo(() => captureAccountGeneration(), []);
  const { hasPremiumAccess } = usePremium();
  const { confirmSpendOne, acknowledgeSessionStart } = useEnergy();
  const mistakeEnergyIntent = useEnergySessionIntent('mistake_practice', studyTarget, attemptSessionId);
  // зачем: ref — чтобы эффект подготовки сессии не пересоздавался из-за confirmSpendOne
  // и не готовил сессию заново (это лишние чтения журнала ошибок).
  const confirmSpendOneRef = useRef(confirmSpendOne);
  useEffect(() => { confirmSpendOneRef.current = confirmSpendOne; }, [confirmSpendOne]);
  const [accountScope, setAccountScope] = useState<string | null>(null);
  const [session, setSession] = useState<MistakePracticeSession | null>(null);
  const [pendingSession, setPendingSession] = useState<MistakePracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [builderTokenIndexes, setBuilderTokenIndexes] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // зачем (владелец, 2026-08-27): DEV-хаб открывает СРАЗУ экран завершения.
  const [complete, setComplete] = useState(devJumpToFinale);
  // зачем (владелец, 2026-08-27): sessionId уникален на каждую сессию отработки
  // ошибок (новый набор актуальных ошибок каждый раз) — «повторное прохождение»
  // здесь концептуально не применимо, поэтому completionOrdinal фиксирован.
  // enabled=false, пока session ещё не гидрирован (sessionId недоступен).
  const practiceRunes = usePracticeRunes({
    activity: 'mistake_practice',
    sessionKey: session?.sessionId ?? '',
    completionOrdinal: 1,
    enabled: session !== null,
    devFakeStartRunes: devRunesFake?.runes,
  });
  const runeFlight = usePracticeRuneFlight();
  useEffect(() => {
    // зачем (аудит 2026-08-28): earningsRef ещё null до конца гидратации —
    // settle() тогда тихо выходит и копилка не зачитывается никогда (DEV-хаб
    // ставит complete=true синхронно на первом рендере, раньше гидратации).
    if (complete && !practiceRunes.hydrating) void practiceRunes.settle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, practiceRunes.hydrating]);
  const [submitting, setSubmitting] = useState(false);
  const [speechHeld, setSpeechHeld] = useState(false);
  const [speechRecovery, setSpeechRecovery] = useState<string | null>(null);
  const [earnedXp, setEarnedXp] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);
  // зачем (макет финала А): фразы, ушедшие навсегда ИМЕННО в этой сессии —
  // они «уезжают» на полку в финале со штампом «Навсегда».
  const [fixedNow, setFixedNow] = useState<readonly MistakeFinaleFixed[]>([]);
  const [rewardsSnapshot, setRewardsSnapshot] = useState<MistakeRewardsSnapshot | null>(null);
  const fixedNowRef = useRef<readonly MistakeFinaleFixed[]>([]);
  const [newTitle, setNewTitle] = useState<MistakeTitleId | null>(null);
  useEffect(() => { fixedNowRef.current = fixedNow; }, [fixedNow]);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [hideConfirmVisible, setHideConfirmVisible] = useState(false);
  const [hiddenUndo, setHiddenUndo] = useState<Readonly<{
    entry: MistakePracticeSessionEntry;
    nextSession: MistakePracticeSession;
    hiddenEventId: string;
  }> | null>(null);
  const analyticsSessionRef = useRef<MistakePracticeSession | null>(null);
  const analyticsCompletedRef = useRef(false);
  const submissionLatchRef = useRef(false);
  const attempts = useSessionAttempts({
    token: accountToken,
    sessionId: `mistake-practice:${session?.sessionId ?? attemptSessionId}`,
    initialQuestionId: 'mistake-practice:loading',
  });
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const attemptsModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceNeutralSequenceRef = useRef(0);
  useEffect(() => () => {
    if (attemptsModalTimerRef.current) clearTimeout(attemptsModalTimerRef.current);
  }, []);

  const requestedLength: MistakePracticeLength =
    params.length === '10' || params.length === '15' || params.length === 'all' ? params.length : '5';
  const focusedMistakeId = typeof params.focusMistakeId === 'string'
    ? params.focusMistakeId.trim()
    : '';
  const entrySource = params.lessonId
    ? 'learning_v2'
    : params.planTaskId
      ? 'personal_plan'
      : focusedMistakeId
        ? 'correction'
        : 'cards';
  const persistSession = entrySource === 'cards';
  const returnToMaxReview = params.returnTo === 'max_voice_review';
  const leavePractice = () => {
    if (returnToMaxReview) {
      markNextNavigationAsReplace();
      router.replace({
        pathname: '/max_voice_review',
        params: typeof params.maxReviewSessionId === 'string'
          ? { sessionId: params.maxReviewSessionId }
          : {},
      } as any);
      return;
    }
    safeRouterBack(router, '/flashcards' as never);
  };

  useEffect(() => {
    analyticsSessionRef.current = session;
  }, [session]);

  useEffect(() => () => {
    const active = analyticsSessionRef.current;
    if (!active || analyticsCompletedRef.current) return;
    trackMistakePracticeEvent('mistake_practice_session_abandoned', {
      study_target: studyTarget,
      entry_source: entrySource,
      practice_session_id: active.sessionId,
      initial_count: active.initialCount,
      answered_count: active.answeredAttemptIds.length,
    });
  }, [entrySource, studyTarget]);

  useEffect(() => {
    // зачем (владелец 2026-09-14): раздел больше не «только Plus» - дневной
    // лимит (1 сессия/сутки) решается на входе в хабе (useMistakePracticeStartGate),
    // а не здесь; повторный вход в сохранённую сессию лимит не тратит.
    console.log('[MISTAKES-GATE] session:mount', JSON.stringify({ // guard-ok: трассировка входа (правило «сперва логи»)
      entrySource, requestedLength, focusMistakeId: focusedMistakeId || null, plus: hasPremiumAccess,
    }));
    if (studyTarget !== 'en' && studyTarget !== 'fr') {
      setLoadError(copy.unsupported);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const scope = await getStableId();
      void flushPendingMistakeCorrectionRewards({ accountScope: scope, studyTarget });
      const prepared = await prepareMistakePracticeSession({
        accountScope: scope,
        studyTarget,
        requestedLength,
        persistSession,
        lessonId: params.lessonId,
        focusMistakeId: focusedMistakeId,
      });
      if (!cancelled) {
        // зачем (владелец 2026-09-14): короткие наборы (1-4 ошибки) без энергии,
        // от 5 - как раньше 10 ⚡ один раз при старте.
        const costsEnergy = mistakePracticeSessionCostsEnergy(prepared.session.initialCount);
        console.log('[MISTAKES-GATE] session:energy', JSON.stringify({ // guard-ok: ветвление энергии (правило «сперва логи»)
          resumed: prepared.resumed, initialCount: prepared.session.initialCount, costsEnergy,
        }));
        if (!prepared.resumed && costsEnergy) {
          const energyResult = await confirmSpendOneRef.current(mistakeEnergyIntent);
          if (cancelled) return;
          if (energyResult === 'cancelled' || energyResult === 'insufficient') {
            safeRouterBack(router, '/flashcards' as never);
            return;
          }
          if (energyResult === 'spent') void acknowledgeSessionStart(mistakeEnergyIntent.operationId);
        }
        trackMistakePracticeEvent('mistake_practice_session_started', {
          study_target: studyTarget,
          entry_source: entrySource,
          practice_session_id: prepared.session.sessionId,
          initial_count: prepared.session.initialCount,
          resumed: prepared.resumed,
        });
        setAccountScope(scope);
        setSession(prepared.session);
        setLoading(false);
      }
    })().catch((error: unknown) => {
      if (cancelled) return;
      const code = error instanceof Error ? error.message : '';
      console.warn('[MISTAKES-GATE] session:prepare:catch', JSON.stringify({ code, entrySource, requestedLength })); // guard-ok: лог в catch обязателен
      if (code === 'stale_account_generation') return;
      setLoadError(
        code === 'mistake_practice_focus_unavailable'
          ? copy.noLongerDue
          : code === 'mistake_practice_no_ready_mistakes'
            ? copy.minFive
            : copy.prepareFailed,
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [acknowledgeSessionStart, copy, entrySource, focusedMistakeId, hasPremiumAccess, mistakeEnergyIntent, params.lessonId, persistSession, requestedLength, router, studyTarget]);

  const entry = session?.queue[session.cursor] ?? null;
  const builderDisplayOrder = useMemo(
    () => mistakePracticeTokenOrder(
      entry?.exercise.tokens ?? [],
      entry?.exercise.exerciseId ?? '',
      entry?.exercise.correctAnswer.trim().split(/\s+/).filter(Boolean).length ?? 0,
    ),
    [entry?.exercise.tokens, entry?.exercise.exerciseId, entry?.exercise.correctAnswer],
  );
  useEffect(() => {
    if (!entry) return;
    attempts.updateQuestion(`${entry.mistakeId}:${entry.exercise.exerciseId}`);
  }, [attempts.updateQuestion, entry]);
  // зачем (баг владельца 2026-09-14: «Мои ошибки» показывали 10/10 сразу при
  // открытии): формула переехала в mistakePracticeProgress рядом с сессией —
  // там её сторожит тест. Подробности класса бага — в комментарии к функции.
  const progress = useMemo(() => (session ? mistakePracticeProgress(session) : 0), [session]);
  const answerValue = entry?.exercise.renderer === 'builder'
    ? builderTokenIndexes.map((index) => entry.exercise.tokens?.[index] ?? '').join(' ')
    : input;
  // зачем: панель вердикта показывает ответ ученика, но к моменту показа поля
  // уже очищены — держим последнее отправленное значение в ref.
  const answerValueRef = useRef('');
  useEffect(() => { answerValueRef.current = answerValue; }, [answerValue]);
  const speakingTheme = useMemo(() => buildSpeakingPanelTheme(t), [t]);

  /**
   * Живой разбор именно этого ответа — тот же механизм, что в уроках
   * (use_mistake_explain + серверный кэш explainMistake).
   *
   * зачем (владелец 2026-09-14): раньше раздел показывал одну из шести
   * заготовок по типу ошибки и ответ человека не анализировал вовсе. Объяснение
   * САМОЙ фразы при этом греется заранее (mistake_explain_prewarm), поэтому
   * ожидание здесь короткое, а не с нуля.
   */
  const mistakeExplain = useMistakeExplain({
    active: feedback !== null && !feedback.correct && feedback.userAnswer.trim().length > 0,
    phraseKey: `${session?.sessionId ?? ''}:${entry?.exercise.exerciseId ?? ''}:${feedback?.userAnswer ?? ''}`,
    // Синтетический lessonId: раздел ошибок не принадлежит уроку, но кэш
    // серверный ключуется парой (фраза, ответ) — номер лишь бакетирует.
    lessonId: 0,
    phraseId: entry?.exercise.exerciseId ?? '',
    studyTarget,
    interfaceLang: lang,
    prompt: entry?.exercise.prompt ?? '',
    userAnswer: feedback?.userAnswer ?? '',
    targetAnswer: feedback?.answer ?? '',
  });
  const liveExplanation = mistakeExplain.aiMistakeState === 'ready' ? mistakeExplain.aiMistakeText : null;

  // Прогрев объяснений всей очереди, пока человек отвечает на первое задание.
  useEffect(() => {
    if (!session) return;
    void prewarmMistakeSessionExplanations({
      sessionId: session.sessionId,
      queue: session.queue,
      studyTarget,
      interfaceLang: lang,
    });
  }, [lang, session, studyTarget]);

  const submitVerdict = useCallback(async (correct: boolean) => {
    if (!session || !entry || !accountScope || submitting || feedback || submissionLatchRef.current) return;
    submissionLatchRef.current = true;
    setSubmitting(true);
    try {
      const attemptId = `${session.sessionId}:position:${session.cursor}`;
      const result = advanceMistakePracticeSession(session, { attemptId, correct });
      if (result.kind === 'duplicate') return;
      // зачем (владелец, 2026-08-27): руна — за ошибку (mistakeId), засчитана
      // один раз за сессию. Ошибся снова на повторном показе той же ошибки —
      // руны не будет; переответил правильно — засчитается (копилка платит
      // только за факт, а не за порядок попыток).
      if (correct) {
        const awarded = practiceRunes.onCorrectAnswer(entry.mistakeId);
        if (awarded > 0) runeFlight.fly(awarded);
      }
      // зачем: владелец 2026-08-23 — энергия НЕ тратится за ошибки. За отработку
      // ошибок платятся 10 ⚡ один раз при старте сессии (эффект подготовки выше).
      if (!correct) {
        setWrongAnswers((value) => value + 1);
      }
      const occurredAtMs = Date.now();
      const modeDefinition = MISTAKE_EXERCISE_MODE_REGISTRY[entry.exercise.mode];
      const independent = modeDefinition.countsAsIndependentProduction;
      const journalBefore = await loadMistakeEventJournal({
        accountScope,
        studyTarget: studyTarget as 'en' | 'fr',
      });
      const beforeStatus = projectMistakes(journalBefore.events).items.get(entry.mistakeId)?.status ?? 'active';
      const eventId = `mistake-practice:v1:${sha256Utf8(canonicalJsonV1({ attemptId, type: 'practice_answered' }))}`;
      const event: MistakeEvent = {
        eventId,
        mistakeId: entry.mistakeId,
        cycleId: entry.cycleId,
        type: 'practice_answered',
        occurredAtMs,
        studyTarget: studyTarget as 'en' | 'fr',
        payload: {
          correct,
          independent,
          localDay: localDay(occurredAtMs),
          mode: entry.exercise.mode,
          support: modeDefinition.support,
          exerciseId: entry.exercise.exerciseId,
          sessionId: session.sessionId,
        },
      };
      const write = await appendMistakeEvent({ accountScope, studyTarget: studyTarget as 'en' | 'fr', event });
      trackMistakePracticeEvent('mistake_practice_answered', {
        study_target: studyTarget,
        entry_source: entrySource,
        practice_session_id: session.sessionId,
        exercise_mode: entry.exercise.mode,
        support: entry.support,
        correct,
        attempt_number: session.answeredAttemptIds.length + 1,
      });
      const afterStatus = projectMistakes(write.journal.events).items.get(entry.mistakeId)?.status ?? beforeStatus;
      void settleMistakePracticeAnswerRewards({
        accountScope,
        studyTarget: studyTarget as 'en' | 'fr',
        mistakeId: entry.mistakeId,
        cycleId: entry.cycleId,
        attemptId,
        correct,
        independent,
        support: modeDefinition.support,
        beforeStatus,
        afterStatus,
      }).then((reward) => {
        if (reward.xp > 0) setEarnedXp((value) => value + reward.xp);
        if (reward.starGranted) {
          setEarnedStars((value) => value + 1);
          setFixedNow((current) => current.some((item) => item.mistakeId === entry.mistakeId)
            ? current
            : [...current, { mistakeId: entry.mistakeId, phrase: entry.exercise.correctAnswer, meaning: entry.exercise.prompt || null }]);
        }
        if (reward.starGranted && (studyTarget === 'en' || studyTarget === 'fr')) {
          void getMistakePracticeAchievementSnapshot(studyTarget).then((snapshot) =>
            checkAchievements({
              type: 'mistake_practice_progress',
              ...snapshot,
              studyTarget,
            }),
          );
        }
      }).catch((error: unknown) => {
        // Learning evidence is already durable. Reward delivery is replay-safe
        // and must never block corrective feedback or consume another attempt.
        // зачем (правило владельца «запрет немого catch»): раньше здесь молчали,
        // и непришедшая награда выглядела бы как «так задумано».
        // guard-ok: лог в catch обязателен (правило владельца «сперва логи»)
        console.warn('[MISTAKES-GATE] reward:catch — награда догонит при следующем запуске', JSON.stringify({
          mistakeId: entry.mistakeId.slice(-12),
          message: error instanceof Error ? error.message : String(error),
        }));
      });
      if (persistSession) {
        await saveMistakePracticeSession({
          accountScope,
          studyTarget: studyTarget as 'en' | 'fr',
          session: result.session,
        });
      }
      setPendingSession(result.session);
      const attemptEffect = attempts.registerVerdict({
        answerAttemptId: attemptId,
        verdict: correct ? 'correct' : 'pedagogical_wrong',
      });
      // зачем (макет промаха А): цепочка «3 дня в 2 режимах» берётся из той же
      // проекции, что решает статус — не из отдельного счётчика, иначе экран и
      // правило разойдутся. Показываем её только за самостоятельный ответ:
      // подсказанный день в цепочку не идёт (см. projection.ts).
      const afterItem = projectMistakes(write.journal.events).items.get(entry.mistakeId);
      const chain = correct && independent && afterItem
        ? {
          days: Math.min(3, afterItem.qualifyingDays.length),
          // зачем (аудит 2026-09-15): без числа режимов панель обещала «ещё один
          // день в другом режиме» там, где нужно два дня или режим уже второй.
          modes: new Set(afterItem.qualifyingModes).size,
          gainedToday: true,
          corrected: afterStatus === 'corrected',
        }
        : null;
      setFeedback({
        correct,
        answer: entry.exercise.feedbackAnswer,
        explanation: explanationFor(entry, copy),
        stopForToday: result.requeue?.kind === 'stop_for_today',
        userAnswer: answerValueRef.current,
        chain,
      });
      if (attemptEffect === 'attempts_exhausted') {
        // Stop the held capture before the automatic same-card reset.
        setSpeechHeld(false);
      }
    } finally {
      submissionLatchRef.current = false;
      setSubmitting(false);
    }
  }, [accountScope, copy, entry, entrySource, feedback, persistSession, session, studyTarget, submitting, attempts.registerVerdict]);

  const continueAfterFeedback = useCallback(() => {
    if (!pendingSession) return;
    const finished = pendingSession.cursor >= pendingSession.queue.length;
    setSession(pendingSession);
    setPendingSession(null);
    setFeedback(null);
    setInput('');
    setBuilderTokenIndexes([]);
    setSpeechRecovery(null);
    if (finished) {
      analyticsCompletedRef.current = true;
      trackMistakePracticeEvent('mistake_practice_session_completed', {
        study_target: studyTarget,
        entry_source: entrySource,
        practice_session_id: pendingSession.sessionId,
        initial_count: pendingSession.initialCount,
        answered_count: pendingSession.answeredAttemptIds.length,
        wrong_count: wrongAnswers,
      });
      setComplete(true);
      if (accountScope && (studyTarget === 'en' || studyTarget === 'fr')) {
        // зачем (макет финала А): серия и звание считаются из журнала ПОСЛЕ
        // того, как награды за исправления записаны — иначе сегодняшнее
        // исправление не попало бы в свою же серию.
        void flushPendingMistakeCorrectionRewards({ accountScope, studyTarget })
          .then(() => loadMistakeEventJournal({ accountScope, studyTarget: studyTarget as 'en' | 'fr' }))
          .then((journal) => {
            const snapshot = buildMistakeRewardsSnapshot(journal.events);
            setRewardsSnapshot(snapshot);
            // Звание «поднялось», если до этой сессии его ещё не было.
            const before = titleFor(Math.max(0, snapshot.corrected - fixedNowRef.current.length));
            if (snapshot.title && snapshot.title.id !== before?.id) setNewTitle(snapshot.title.id);
          })
          .catch((error: unknown) => {
            console.warn('[MISTAKES-REWARD] finale:catch — финал покажем без итогов серии', error instanceof Error ? error.message : String(error)); // guard-ok: лог в catch обязателен
          });
        if (params.planTaskId) {
          void markPersonalPlanTaskCompleted({
            taskId: params.planTaskId,
            planId: params.planId,
            planInstanceId: params.planInstanceId,
            studyTarget,
            dayIndex: Number.isSafeInteger(Number(params.planDayIndex))
              ? Number(params.planDayIndex)
              : undefined,
          });
        }
        void settleMistakePracticeCompletionReward({
          sessionId: pendingSession.sessionId,
          initialCount: pendingSession.initialCount,
          studyTarget,
        }).then((xp) => {
          if (xp > 0) setEarnedXp((value) => value + xp);
        }).catch(() => undefined);
        void getMistakePracticeAchievementSnapshot(studyTarget).then((snapshot) =>
          checkAchievements({
            type: 'mistake_practice_progress',
            ...snapshot,
            perfectSession: pendingSession.initialCount >= 5 && wrongAnswers === 0,
            studyTarget,
          }),
        );
        if (persistSession) void clearMistakePracticeSession({ accountScope, studyTarget });
      }
    }
  }, [accountScope, entrySource, params.planDayIndex, params.planId, params.planInstanceId, params.planTaskId, pendingSession, persistSession, studyTarget, wrongAnswers]);

  const onSpeechStatus = useCallback((status: SpeakingPanelStatus) => {
    if (status === 'denied' || status === 'unavailable' || status === 'no_speech' || status === 'stalled') {
      attempts.registerVerdict({
        answerAttemptId: `${session?.sessionId ?? attemptSessionId}:voice-status:${status}:${voiceNeutralSequenceRef.current++}`,
        verdict: mistakeVoiceOutcomeToSessionAttemptVerdict(status),
      });
      setSpeechRecovery(copy.speechUncertain);
    } else {
      setSpeechRecovery(null);
    }
  }, [attemptSessionId, attempts.registerVerdict, copy, session?.sessionId]);

  const onSpeechClose = useCallback(() => {
    setSpeechHeld(false);
    attempts.registerVerdict({
      answerAttemptId: `${session?.sessionId ?? attemptSessionId}:voice-close:${voiceNeutralSequenceRef.current++}`,
      verdict: 'cancelled',
    });
  }, [attemptSessionId, attempts.registerVerdict, session?.sessionId]);

  const resetMistakePracticeAfterSessionRuneForfeit = useCallback(() => {
    setShowAttemptsModal(false);
    setSpeechHeld(false);
  }, []);

  // зачем (2026-09-03): без hydrated автосброс молча не запускался и экран
  // намертво замирал под блокировщиком ввода после трёх ошибок.
  useSessionAttemptAutoReset({
    phase: attempts.state.phase,
    hydrated: attempts.hydrated,
    inventoryTrusted: attempts.inventoryTrusted,
    giftCount: attempts.giftCount,
    recoverWithGift: attempts.recoverWithGift,
    forfeitSessionRunes: practiceRunes.forfeitPendingRunes,
    restoreAttempts: attempts.restoreAfterSessionRuneForfeit,
    onRestored: resetMistakePracticeAfterSessionRuneForfeit,
  });

  const endExhaustedMistakePractice = useCallback(() => {
    attempts.endAttemptsSession();
    setSpeechHeld(false);
    setShowAttemptsModal(false);
    leavePractice();
  }, [attempts.endAttemptsSession, leavePractice]);

  const hideCurrentMistake = useCallback(async () => {
    if (!session || !entry || !accountScope || submissionLatchRef.current) return;
    submissionLatchRef.current = true;
    try {
      const occurredAtMs = Date.now();
      const hiddenEventId = `mistake-practice:v1:${sha256Utf8(canonicalJsonV1({
        cursor: session.cursor,
        sessionId: session.sessionId,
        type: 'hidden',
      }))}`;
      await appendMistakeEvent({
        accountScope,
        studyTarget: studyTarget as 'en' | 'fr',
        event: {
          eventId: hiddenEventId,
          mistakeId: entry.mistakeId,
          cycleId: entry.cycleId,
          type: 'hidden',
          occurredAtMs,
          studyTarget: studyTarget as 'en' | 'fr',
          payload: { sessionId: session.sessionId },
        },
      });
      trackMistakePracticeEvent('mistake_practice_hidden', {
        study_target: studyTarget,
        entry_source: entrySource,
        exercise_mode: entry.exercise.mode,
      });
      const nextSession: MistakePracticeSession = Object.freeze({
        ...session,
        cursor: session.cursor + 1,
      });
      if (persistSession) {
        await saveMistakePracticeSession({
          accountScope,
          studyTarget: studyTarget as 'en' | 'fr',
          session: nextSession,
        });
      }
      setHiddenUndo({ entry, nextSession, hiddenEventId });
      setHideConfirmVisible(false);
    } finally {
      submissionLatchRef.current = false;
    }
  }, [accountScope, entry, entrySource, persistSession, session, studyTarget]);

  const undoHiddenMistake = useCallback(async () => {
    if (!hiddenUndo || !accountScope || submissionLatchRef.current) return;
    submissionLatchRef.current = true;
    try {
      const occurredAtMs = Date.now();
      await appendMistakeEvent({
        accountScope,
        studyTarget: studyTarget as 'en' | 'fr',
        event: {
          eventId: `mistake-practice:v1:${sha256Utf8(canonicalJsonV1({
            hiddenEventId: hiddenUndo.hiddenEventId,
            type: 'restored',
          }))}`,
          mistakeId: hiddenUndo.entry.mistakeId,
          cycleId: hiddenUndo.entry.cycleId,
          type: 'restored',
          occurredAtMs,
          studyTarget: studyTarget as 'en' | 'fr',
          payload: { hiddenEventId: hiddenUndo.hiddenEventId },
        },
      });
      trackMistakePracticeEvent('mistake_practice_restored', {
        study_target: studyTarget,
        entry_source: entrySource,
        exercise_mode: hiddenUndo.entry.exercise.mode,
      });
      if (persistSession && session) {
        await saveMistakePracticeSession({
          accountScope,
          studyTarget: studyTarget as 'en' | 'fr',
          session,
        });
      }
      setHiddenUndo(null);
    } finally {
      submissionLatchRef.current = false;
    }
  }, [accountScope, entrySource, hiddenUndo, persistSession, session, studyTarget]);

  const continueAfterHidden = useCallback(() => {
    if (!hiddenUndo) return;
    const next = hiddenUndo.nextSession;
    setSession(next);
    setHiddenUndo(null);
    setInput('');
    setBuilderTokenIndexes([]);
    setSpeechRecovery(null);
    if (next.cursor >= next.queue.length) {
      analyticsCompletedRef.current = true;
      setComplete(true);
      if (persistSession && accountScope && (studyTarget === 'en' || studyTarget === 'fr')) {
        void clearMistakePracticeSession({ accountScope, studyTarget });
      }
    }
  }, [accountScope, hiddenUndo, persistSession, studyTarget]);

  if (loading) {
    return <MistakePracticeScreenFrame centered><ActivityIndicator color={t.accent} /></MistakePracticeScreenFrame>;
  }

  if (loadError || !session || (!entry && !complete)) {
    return (
      <MistakePracticeScreenFrame centered>
        <Ionicons name="alert-circle-outline" size={48} color={t.wrong} />
        <Text style={[styles.errorTitle, { color: t.textPrimary, fontSize: f.h3 }]}>{loadError ?? copy.sessionEnded}</Text>
        <Pressable style={[styles.primaryButton, { backgroundColor: t.accent }]} onPress={leavePractice}>
          <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>{copy.back}</Text>
        </Pressable>
      </MistakePracticeScreenFrame>
    );
  }

  if (complete) {
    return (
      <MistakePracticeScreenFrame>
        <MistakeSessionFinale
          lang={lang}
          answered={session?.initialCount ?? 0}
          total={session?.initialCount ?? 0}
          perfect={(session?.initialCount ?? 0) >= 1 && wrongAnswers === 0}
          xp={devRunesFake ? devRunesFake.secondary : earnedXp}
          runes={practiceRunes.runes}
          fixed={fixedNow}
          rewards={rewardsSnapshot}
          newTitle={newTitle}
          onDone={leavePractice}
        />
      </MistakePracticeScreenFrame>
    );
  }

  if (!entry) return null;

  return (
    <MistakePracticeScreenFrame>
      {/* Руны за отработку (владелец, 2026-08-27): шапка ниже фиксированной
          высоты и уже плотная (крестик/попытки/прогресс/скрыть/репорт) —
          добавление сюда же сжало бы остальные элементы. */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 14, paddingTop: 4 }}>
        <View ref={runeFlight.counterRef} collapsable={false}>
          <PracticeRuneCounter
            runes={practiceRunes.runes}
            lang={lang}
            backgroundColor={t.bgCard}
            color={t.textPrimary}
            testID="mistake-practice-runes"
          />
        </View>
      </View>
      <View style={styles.header}>
        <Pressable accessibilityLabel={copy.close} onPress={leavePractice} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={t.textMuted} />
        </Pressable>
        <SessionAttemptsHud
          remaining={attempts.state.remainingAttempts}
          locale={lang}
          testID="mistake-practice-session-attempts"
        />
        <View style={[styles.progressTrack, { backgroundColor: t.bgSurface2 }]}>
          <View style={[styles.progressFill, { backgroundColor: t.accent, width: `${session.initialCount > 0 ? Math.min(100, (progress / session.initialCount) * 100) : 0}%` }]} />
        </View>
        <Text style={[styles.counter, { color: t.textMuted, fontSize: f.caption }]}>{progress}/{session.initialCount}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.hideError}
          onPress={() => setHideConfirmVisible(true)}
          style={styles.headerButton}
        >
          <Ionicons name="eye-off-outline" size={22} color={t.textMuted} />
        </Pressable>
        {/* зачем: разбор собственных ошибок — самое обидное место для
            бага: если задание составлено неверно, человек ошибётся снова и
            снова, а сообщить об этом было негде. */}
        <ReportErrorButton
          screen="mistake_practice"
          dataId={`mistake_${entry.exercise.exerciseId ?? 'unknown'}`}
          dataText={`${entry.exercise.prompt}
OK: ${entry.exercise.correctAnswer}`}
          variant="icon-flag"
          accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке в задании', uk: 'Повідомити про помилку у завданні', en: 'Report an error in the exercise', es: 'Informar de un error en el ejercicio', 'pt-BR': 'Relatar erro no exercício', vi: 'Báo lỗi trong bài tập', id: 'Laporkan kesalahan pada latihan', tr: 'Alıştırmadaki hatayı bildir', pl: 'Zgłoś błąd w zadaniu' })}
          testID="mistake-practice-report"
        />
      </View>

      {/* Источник полёта рун (владелец, 2026-08-27) */}
      <View ref={runeFlight.originRef} collapsable={false} style={{ flex: 1 }}>
      <ScrollView decelerationRate="fast" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.prompt, { color: t.textPrimary, fontSize: f.h3 }]}>{entry.exercise.prompt}</Text>

        {!feedback && !hiddenUndo && (entry.exercise.renderer === 'choices' || entry.exercise.renderer === 'fill_gap' || entry.exercise.renderer === 'matching') ? (
          <View style={styles.optionList}>
            {(entry.exercise.options ?? [entry.exercise.correctAnswer]).map((option) => (
              <Pressable
                key={option}
                style={[styles.option, { backgroundColor: t.bgCard }]}
                onPress={() => void submitVerdict(matchesMistakePracticeAnswer(option, entry.exercise.correctAnswer, studyTarget))}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{option}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!feedback && !hiddenUndo && entry.exercise.renderer === 'builder' ? (
          <>
            <View style={[styles.builderAnswer, { backgroundColor: t.bgCard }]}>
              <Text style={{ color: builderTokenIndexes.length ? t.textPrimary : t.textGhost, fontSize: f.body }}>
                {builderTokenIndexes.map((index) => entry.exercise.tokens?.[index] ?? '').join(' ') || copy.buildPhrase}
              </Text>
              {builderTokenIndexes.length ? (
                <Pressable onPress={() => setBuilderTokenIndexes([])}><Ionicons name="refresh" size={20} color={t.textMuted} /></Pressable>
              ) : null}
            </View>
            <View style={styles.tokens}>
              {builderDisplayOrder.map((index) => (
                <Pressable
                  key={index}
                  disabled={builderTokenIndexes.includes(index)}
                  style={[styles.token, { backgroundColor: t.bgSurface2, opacity: builderTokenIndexes.includes(index) ? 0.28 : 1 }]}
                  onPress={() => setBuilderTokenIndexes((current) => [...current, index])}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body }}>{entry.exercise.tokens?.[index]}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {!feedback && !hiddenUndo && (entry.exercise.renderer === 'typing' || entry.exercise.renderer === 'listening') ? (
          <>
            {entry.exercise.renderer === 'listening' && entry.exercise.audioRef ? (
              <ListeningPlayback audioRef={entry.exercise.audioRef} color={t.accent} foreground={t.correctText} accessibilityLabel={copy.listen} />
            ) : null}
            <TextInput
              value={input}
              onChangeText={setInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={copy.answerPlaceholder}
              placeholderTextColor={t.textGhost}
              style={[styles.input, { backgroundColor: t.bgCard, color: t.textPrimary, fontSize: f.body }]}
            />
          </>
        ) : null}

        {!feedback && !hiddenUndo && entry.exercise.renderer === 'speech' ? (
          <View style={styles.speechArea}>
            <SpeakingPanel
              targetText={entry.exercise.correctAnswer}
              lang={lang}
              theme={speakingTheme}
              recognitionLocale={studyTarget === 'fr' ? 'fr-FR' : 'en-US'}
              presentation="inline"
              holdActive={speechHeld}
              onScore={({ score }) => {
                const verdict = classifyMistakeVoiceVerdict({
                  status: 'scored',
                  score,
                  threshold: SPEECH_PRONUNCIATION_PASS_THRESHOLD,
                });
                trackMistakePracticeEvent('mistake_practice_voice_outcome', {
                  study_target: studyTarget,
                  entry_source: entrySource,
                  voice_outcome: verdict,
                });
                const attemptsVerdict = mistakeVoiceOutcomeToSessionAttemptVerdict(verdict);
                if (attemptsVerdict === 'correct') void submitVerdict(true);
                else if (attemptsVerdict === 'pedagogical_wrong') void submitVerdict(false);
                else setSpeechRecovery(copy.speechRetry);
              }}
              onClose={onSpeechClose}
              onStatusChange={onSpeechStatus}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.holdToSpeak}
              onPressIn={() => setSpeechHeld(true)}
              onPressOut={() => setSpeechHeld(false)}
              style={[styles.micButton, { backgroundColor: t.accent }]}
            >
              <Ionicons name="mic" size={26} color={t.correctText} />
              <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>{copy.holdAndSpeak}</Text>
            </Pressable>
            {speechRecovery ? <Text style={[styles.recovery, { color: t.textMuted, fontSize: f.sub }]}>{speechRecovery}</Text> : null}
          </View>
        ) : null}

        {feedback ? (
          <MistakeVerdictPanel
            lang={lang}
            correct={feedback.correct}
            userAnswer={feedback.userAnswer}
            correctAnswer={feedback.answer}
            explanation={liveExplanation ?? feedback.explanation}
            explanationLoading={mistakeExplain.aiMistakeState === 'loading'}
            chain={feedback.chain}
            stopForToday={feedback.stopForToday}
            onExplainSimpler={liveExplanation ? mistakeExplain.eli5.onOpen : undefined}
          />
        ) : null}
        {hiddenUndo ? (
          <View style={[styles.feedback, { backgroundColor: t.bgSurface2 }]}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{copy.hidden}</Text>
          </View>
        ) : null}
      </ScrollView>
      </View>

      {hiddenUndo ? (
        <View style={styles.undoRow}>
          <Pressable style={[styles.undoButton, { backgroundColor: t.bgSurface2 }]} onPress={() => void undoHiddenMistake()}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{copy.undo}</Text>
          </Pressable>
          <Pressable style={[styles.undoButton, { backgroundColor: t.accent }]} onPress={continueAfterHidden}>
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>{copy.continue}</Text>
          </Pressable>
        </View>
      ) : feedback ? (
        <Pressable style={[styles.bottomButton, { backgroundColor: t.accent }]} onPress={continueAfterFeedback}>
          <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>{copy.continue}</Text>
        </Pressable>
      ) : entry.exercise.renderer !== 'choices' && entry.exercise.renderer !== 'fill_gap' && entry.exercise.renderer !== 'matching' && entry.exercise.renderer !== 'speech' ? (
        <Pressable
          disabled={!answerValue.trim() || submitting}
          style={[styles.bottomButton, { backgroundColor: answerValue.trim() ? t.accent : t.bgSurface2 }]}
          onPress={() => void submitVerdict(matchesMistakePracticeAnswer(answerValue, entry.exercise.correctAnswer, studyTarget))}
        >
          <Text style={{ color: answerValue.trim() ? t.correctText : t.textGhost, fontSize: f.body, fontWeight: '700' }}>{copy.check}</Text>
        </Pressable>
      ) : null}
      <MistakeEli5Modal
        visible={mistakeExplain.eli5.open}
        onClose={mistakeExplain.eli5.onClose}
        lang={lang}
        state={mistakeExplain.eli5.state}
        text={mistakeExplain.eli5.text}
        onRetry={mistakeExplain.eli5.onRetry}
      />
      <AiExplainConsentModal
        visible={mistakeExplain.consentGate.visible}
        lang={lang}
        onAccept={mistakeExplain.consentGate.onAccept}
        onDecline={mistakeExplain.consentGate.onDecline}
      />
      <ThemedConfirmModal
        visible={hideConfirmVisible}
        title={copy.hideTitle}
        cancelLabel={copy.cancel}
        confirmLabel={copy.hide}
        destructive
        onCancel={() => setHideConfirmVisible(false)}
        onConfirm={() => void hideCurrentMistake()}
        testIDPrefix="mistake-practice-hide"
      />
      {runeFlight.flight && (
        <LearningV2RuneFlight
          key={runeFlight.flight.key}
          from={runeFlight.flight.from}
          to={runeFlight.flight.to}
          count={runeFlight.flight.count}
          onDone={runeFlight.clearFlight}
        />
      )}
    </MistakePracticeScreenFrame>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 },
  header: { height: 62, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  counter: { minWidth: 36, fontWeight: '700' },
  content: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 120, gap: 20 },
  prompt: { fontWeight: '700', lineHeight: 34 },
  optionList: { gap: 11 },
  option: { minHeight: 58, borderRadius: 18, paddingHorizontal: 18, justifyContent: 'center' },
  input: { minHeight: 58, borderRadius: 18, paddingHorizontal: 18 },
  audioButton: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  builderAnswer: { minHeight: 76, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  token: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center' },
  speechArea: { minHeight: 260, gap: 14 },
  micButton: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  recovery: { textAlign: 'center' },
  feedback: { borderRadius: 20, padding: 18, gap: 10 },
  feedbackHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  feedbackLabel: { marginTop: 4, fontWeight: '700', textTransform: 'uppercase' },
  bottomButton: { position: 'absolute', left: 22, right: 22, bottom: 22, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  undoRow: { position: 'absolute', left: 22, right: 22, bottom: 22, flexDirection: 'row', gap: 10 },
  undoButton: { flex: 1, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { minWidth: 180, minHeight: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  errorTitle: { textAlign: 'center', fontWeight: '700' },
});

export default withOptionalPersonalPlanSunsetGuard(MistakePracticeSessionScreen, ['planTaskId']);
