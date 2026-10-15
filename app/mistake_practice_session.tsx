import Ionicons from '@expo/vector-icons/Ionicons';
import SkeletonBlock from '../components/SkeletonShimmer';
import { facetsFromParam } from '../components/mistakes-panel/mistakeGroups';
import { Panel, PanelCta, SheetRow } from '../components/mistakes-panel/PanelKit';
import { PanelSheet } from '../components/mistakes-panel/PanelSheet';
import { buildMistakeAnswerDiff } from './mistake_answer_diff';
import { AnswerField, AnswerSlot, OptionGrid, QuestionBlock, DiffValue, ResultRow, RoundButton, StepDots, Token, Tray, fieldInputStyle, type OptionMark } from '../components/mistakes-panel/PracticeKit';
import { mpColors } from '../components/mistakes-panel/panelPaint';
import { practiceCopyFor } from '../components/mistakes-panel/practiceCopy';
import { hapticTap } from '../hooks/use-haptics';
import { LOAD_GATE_TOTAL_MS } from './load_gate_config';
import { actionToastTri, emitAppEvent } from './events';
import { useAudioPlayer } from 'expo-audio';
import { useManagedSpokenAudioPlayer } from '../hooks/use_managed_spoken_audio_player';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useScaledTextStyles } from '../hooks/useLineScale';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import { useLang } from '../components/LangContext';
import { useMomentsV3Enabled } from '../components/streak/moments/use_moments_v3_flag';
import { useStreakMilestoneHold } from './streak_milestone_pending';
// зачем (координатор 15.10): рубеж серии на итоге «Моих ошибок» — тот же ленивый хост
const StreakMilestoneHost = lazy(() => import('../components/streak/moments/StreakMilestoneHost'));
import { usePremium } from '../components/PremiumContext';
import ScreenGradient from '../components/ScreenGradient';
import { SpeakingPanel, buildSpeakingPanelTheme, type SpeakingPanelStatus } from '../components/SpeakingPanel';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { useLv2Glass } from '../components/learning-v2/LearningV2Glass';
import ReportErrorButton, { REPORT_ERROR_ENABLED } from '../components/ReportErrorButton';
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
import { useSpeechUnavailableOnDevice } from './speech_device_availability';
import SpeechUnavailableNote from '../components/SpeechUnavailableNote';
import { isMistakeStudyTargetValue, type MistakeEvent } from '../modules/mistake-practice/contracts';
import { cleanMistakeExplanation } from './mistake_explanation_text';
import { projectMistakes, requiredModesForMistake } from '../modules/mistake-practice/projection';
import {
  advanceMistakePracticeSession,
  type MistakePracticeLength,
  mistakePracticeProgress,
  mistakePracticeAnsweredProgress,
  mistakePracticeSessionCostsEnergy,
  parseMistakeRetryIdsParam,
  type MistakePracticeSession,
  type MistakePracticeSessionEntry,
} from '../modules/mistake-practice/session';
import { appendMistakeEvent } from './mistake_practice_store';
import { createMistakeAnswerJournal, type MistakeAnswerJournal } from './mistake_practice_answer_journal';
import MistakeSessionFinale, { type MistakeFinaleFixed } from '../components/mistake-practice/MistakeSessionFinale';
import MistakeEli5Modal from '../components/MistakeEli5Modal';
import AiExplainConsentModal from '../components/AiExplainConsentModal';
import { useMistakeExplain } from './use_mistake_explain';
import { IS_STORE_RELEASE } from './config';
import { prewarmMistakeSessionExplanations } from './mistake_explain_prewarm';
import { commitPreparedMistakePracticeSession, prepareMistakePracticeSession } from './mistake_practice_session_runtime';
import { trackMistakePracticeEvent } from './mistake_practice_analytics';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import {
  flushPendingMistakeCorrectionRewards,
  settleMistakePracticeAnswerRewards,
} from './mistake_practice_rewards';
import {
  clearMistakePracticeSession,
  saveMistakePracticeSession,
} from './mistake_practice_session_store';
import { getStableId } from './stable_id';
import { checkAchievements } from './achievements';
import { getMistakePracticeAchievementSnapshot } from './mistake_practice_insights';
import CoinRewardFlight from '../components/rewards/CoinRewardFlight';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import { useCoinRewardFlight } from '../hooks/useCoinRewardFlight';
import { readDevPracticeRunesFakeState } from './dev_practice_runes_seed';
import { useSessionAttempts } from '../hooks/useSessionAttempts';
import SessionAttemptsHud from '../components/session_attempts/SessionAttemptsHud';
import { useSessionAttemptAutoReset } from '../hooks/useSessionAttemptAutoReset';
import { captureAccountGeneration } from './account_generation';
import { makeFeedbackAttemptId } from './feedback_attempt_identity';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
// зачем (PM-134): SESSION_ATTEMPTS_MOTION был мёртвым импортом — константа анимации нигде не читалась в этом экране

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
  chain: { days: number; modes: number; requiredModes: 1 | 2; gainedToday: boolean; corrected: boolean } | null;
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
    speechUncertain: 'Не расслышал. Попробуй ещё раз — энергия не потрачена.',
    speechRetry: 'Попробуй ещё раз — энергия не потрачена.', sessionEnded: 'Сессия закончена', back: 'Вернуться',
    unavailable: 'Сейчас недоступно', tryAgain: 'Попробовать снова',
    sessionComplete: 'Сессия завершена', done: 'Готово', close: 'Закрыть', hideError: 'Скрыть ошибку',
    buildPhrase: 'Собери фразу', answerPlaceholder: 'Напиши ответ', holdToSpeak: 'Удерживай, чтобы говорить',
    holdAndSpeak: 'Удерживай и говори', correct: 'Верно', needsFix: 'Нужно поправить',
    correctAnswer: 'Правильный ответ', why: 'Почему так', stopToday: 'На сегодня хватит повторов этой ошибки — вернёмся к ней позже.',
    hidden: 'Ошибка скрыта', undo: 'Вернуть', continue: 'Продолжить', check: 'Проверить',
    hideTitle: 'Скрыть ошибку?', cancel: 'Отмена', hide: 'Скрыть',
    explanationWordOrder: 'Сверь порядок слов: в этой фразе позиция каждого слова меняет смысл.', // D188: язык ошибки — любой из пяти
    explanationMissing: 'Проверь пропущенное слово и прочитай целую фразу ещё раз.',
    explanationMeaning: 'Свяжи значение со всей фразой, а не с одним знакомым словом.',
    explanationPronunciation: 'Скажи фразу спокойно и отчётливо, сохраняя ударение и окончания.',
    explanationListening: 'Сначала найди опорные слова на слух, затем восстанови полную фразу.',
    explanationDefault: 'Сравни свой вариант с правильной формой и обрати внимание на окончание и служебные слова.',
  },
  uk: {
    listen: 'Прослухати', unsupported: 'Ця мова поки не підтримується в розділі помилок.',
    noLongerDue: 'Цей вислів уже не потрібно тренувати.', minFive: 'Готових до розбору помилок зараз немає.',
    prepareFailed: 'Не вдалося підготувати тренування. Спробуй ще раз.', noEnergy: 'Недостатньо енергії для продовження.',
    speechUncertain: 'Не розчув. Спробуй ще раз — енергію не витрачено.',
    speechRetry: 'Спробуй ще раз — енергію не витрачено.', sessionEnded: 'Сесію завершено', back: 'Повернутися',
    unavailable: 'Зараз недоступно', tryAgain: 'Спробувати ще',
    sessionComplete: 'Сесію завершено', done: 'Готово', close: 'Закрити', hideError: 'Сховати помилку',
    buildPhrase: 'Склади фразу', answerPlaceholder: 'Напиши відповідь', holdToSpeak: 'Утримуй, щоб говорити',
    holdAndSpeak: 'Утримуй і говори', correct: 'Правильно', needsFix: 'Потрібно виправити',
    correctAnswer: 'Правильна відповідь', why: 'Чому так', stopToday: 'На сьогодні досить повторів цієї помилки — повернемося до неї пізніше.',
    hidden: 'Помилку сховано', undo: 'Повернути', continue: 'Продовжити', check: 'Перевірити',
    hideTitle: 'Сховати помилку?', cancel: 'Скасувати', hide: 'Сховати',
    explanationWordOrder: 'Звір порядок слів: у цьому вислові позиція кожного слова змінює зміст.',
    explanationMissing: 'Перевір пропущене слово й прочитай увесь вислів ще раз.',
    explanationMeaning: 'Пов’яжи значення з усім висловом, а не з одним знайомим словом.',
    explanationPronunciation: 'Скажи вислів спокійно й чітко, зберігаючи наголос і закінчення.',
    explanationListening: 'Спочатку знайди опорні слова на слух, потім віднови повний вислів.',
    explanationDefault: 'Порівняй свій варіант із правильною формою та зверни увагу на закінчення і службові слова.',
  },
  en: {
    listen: 'Listen', unsupported: 'This language is not yet supported in the mistakes section.',
    noLongerDue: 'This phrase no longer needs practice.', minFive: 'There are no mistakes ready to practise right now.',
    prepareFailed: 'Could not prepare the practice. Try again.', noEnergy: 'Not enough energy to continue.',
    speechUncertain: "Didn't catch that. Try again — no energy was spent.",
    speechRetry: 'Try again — no energy was spent.', sessionEnded: 'Session ended', back: 'Back',
    unavailable: 'Not available right now', tryAgain: 'Try again',
    sessionComplete: 'Session complete', done: 'Done', close: 'Close', hideError: 'Hide mistake',
    buildPhrase: 'Build the phrase', answerPlaceholder: 'Write your answer', holdToSpeak: 'Hold to speak',
    holdAndSpeak: 'Hold and speak', correct: 'Correct', needsFix: 'Needs fixing',
    correctAnswer: 'Correct answer', why: 'Why', stopToday: 'That\'s enough repeats of this mistake for today — we\'ll come back to it later.',
    hidden: 'Mistake hidden', undo: 'Undo', continue: 'Continue', check: 'Check',
    hideTitle: 'Hide this mistake?', cancel: 'Cancel', hide: 'Hide',
    explanationWordOrder: 'Check the word order: in this sentence, each word\'s position changes the meaning.',
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
    speechUncertain: 'No te he entendido. Inténtalo de nuevo; no se gastó energía.',
    speechRetry: 'Inténtalo de nuevo; no se gastó energía.', sessionEnded: 'La sesión terminó', back: 'Volver',
    unavailable: 'No disponible ahora', tryAgain: 'Intentar de nuevo',
    sessionComplete: 'Sesión completada', done: 'Listo', close: 'Cerrar', hideError: 'Ocultar error',
    buildPhrase: 'Construye la frase', answerPlaceholder: 'Escribe la respuesta', holdToSpeak: 'Mantén pulsado para hablar',
    holdAndSpeak: 'Mantén pulsado y habla', correct: 'Correcto', needsFix: 'Hay que corregirlo',
    correctAnswer: 'Respuesta correcta', why: 'Por qué', stopToday: 'Ya es suficiente por hoy; volveremos a este error más tarde.',
    hidden: 'Error ocultado', undo: 'Deshacer', continue: 'Continuar', check: 'Comprobar',
    hideTitle: '¿Ocultar este error?', cancel: 'Cancelar', hide: 'Ocultar',
    explanationWordOrder: 'Revisa el orden: en esta frase, la posición de cada palabra cambia el sentido.',
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
    speechUncertain: 'Não entendi. Tente de novo — a energia não foi gasta.',
    speechRetry: 'Tente novamente — a energia não foi gasta.', sessionEnded: 'Sessão encerrada', back: 'Voltar',
    unavailable: 'Indisponível agora', tryAgain: 'Tentar de novo',
    sessionComplete: 'Sessão concluída', done: 'Pronto', close: 'Fechar', hideError: 'Ocultar erro',
    buildPhrase: 'Monte a frase', answerPlaceholder: 'Escreva a resposta', holdToSpeak: 'Segure para falar',
    holdAndSpeak: 'Segure e fale', correct: 'Correto', needsFix: 'Precisa corrigir',
    correctAnswer: 'Resposta correta', why: 'Por que', stopToday: 'Chega de repetições desse erro por hoje — voltaremos a ele mais tarde.',
    hidden: 'Erro ocultado', undo: 'Desfazer', continue: 'Continuar', check: 'Verificar',
    hideTitle: 'Ocultar este erro?', cancel: 'Cancelar', hide: 'Ocultar',
    explanationWordOrder: 'Confira a ordem das palavras: nesta frase, a posição de cada palavra muda o sentido.',
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
    speechUncertain: 'Chưa nghe rõ. Hãy thử lại — năng lượng chưa bị trừ.',
    speechRetry: 'Hãy thử lại — năng lượng chưa bị trừ.', sessionEnded: 'Buổi học đã kết thúc', back: 'Quay lại',
    unavailable: 'Hiện chưa khả dụng', tryAgain: 'Thử lại',
    sessionComplete: 'Đã hoàn thành buổi học', done: 'Xong', close: 'Đóng', hideError: 'Ẩn lỗi',
    buildPhrase: 'Ghép câu', answerPlaceholder: 'Viết câu trả lời', holdToSpeak: 'Giữ để nói',
    holdAndSpeak: 'Giữ và nói', correct: 'Đúng', needsFix: 'Cần sửa lại',
    correctAnswer: 'Đáp án đúng', why: 'Vì sao', stopToday: 'Hôm nay đã đủ lần lặp lại lỗi này — ta sẽ quay lại sau.',
    hidden: 'Đã ẩn lỗi', undo: 'Hoàn tác', continue: 'Tiếp tục', check: 'Kiểm tra',
    hideTitle: 'Ẩn lỗi này?', cancel: 'Hủy', hide: 'Ẩn',
    explanationWordOrder: 'Kiểm tra trật tự từ: trong câu này, vị trí mỗi từ thay đổi ý nghĩa.',
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
    speechUncertain: 'Belum terdengar jelas. Coba lagi — energi tidak terpakai.',
    speechRetry: 'Coba lagi — energi tidak terpakai.', sessionEnded: 'Sesi berakhir', back: 'Kembali',
    unavailable: 'Belum tersedia sekarang', tryAgain: 'Coba lagi',
    sessionComplete: 'Sesi selesai', done: 'Selesai', close: 'Tutup', hideError: 'Sembunyikan kesalahan',
    buildPhrase: 'Susun kalimat', answerPlaceholder: 'Tulis jawaban', holdToSpeak: 'Tahan untuk berbicara',
    holdAndSpeak: 'Tahan dan bicara', correct: 'Benar', needsFix: 'Perlu diperbaiki',
    correctAnswer: 'Jawaban benar', why: 'Mengapa begitu', stopToday: 'Cukup pengulangan kesalahan ini untuk hari ini — kita kembali lagi nanti.',
    hidden: 'Kesalahan disembunyikan', undo: 'Batalkan', continue: 'Lanjutkan', check: 'Periksa',
    hideTitle: 'Sembunyikan kesalahan ini?', cancel: 'Batal', hide: 'Sembunyikan',
    explanationWordOrder: 'Periksa urutan kata: dalam kalimat ini, posisi setiap kata mengubah arti.',
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
    speechUncertain: 'Anlaşılmadı. Tekrar dene — enerji harcanmadı.',
    speechRetry: 'Tekrar dene — enerji harcanmadı.', sessionEnded: 'Oturum sona erdi', back: 'Geri dön',
    unavailable: 'Şu anda kullanılamıyor', tryAgain: 'Tekrar dene',
    sessionComplete: 'Oturum tamamlandı', done: 'Tamam', close: 'Kapat', hideError: 'Hatayı gizle',
    buildPhrase: 'Cümleyi oluştur', answerPlaceholder: 'Cevabı yaz', holdToSpeak: 'Konuşmak için basılı tut',
    holdAndSpeak: 'Basılı tut ve konuş', correct: 'Doğru', needsFix: 'Düzeltilmesi gerekiyor',
    correctAnswer: 'Doğru cevap', why: 'Neden böyle', stopToday: 'Bu hata için bugünlük bu kadar tekrar yeter — sonra döneriz.',
    hidden: 'Hata gizlendi', undo: 'Geri al', continue: 'Devam et', check: 'Kontrol et',
    hideTitle: 'Bu hata gizlensin mi?', cancel: 'Vazgeç', hide: 'Gizle',
    explanationWordOrder: 'Kelime sırasını kontrol et: bu cümlede her kelimenin konumu anlamı değiştirir.',
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
    speechUncertain: 'Nie dosłyszałem. Spróbuj ponownie — energia nie została zużyta.',
    speechRetry: 'Spróbuj ponownie — energia nie została zużyta.', sessionEnded: 'Sesja zakończona', back: 'Wróć',
    unavailable: 'Teraz niedostępne', tryAgain: 'Spróbuj ponownie',
    sessionComplete: 'Sesja zakończona', done: 'Gotowe', close: 'Zamknij', hideError: 'Ukryj błąd',
    buildPhrase: 'Ułóż zdanie', answerPlaceholder: 'Wpisz odpowiedź', holdToSpeak: 'Przytrzymaj, aby mówić',
    holdAndSpeak: 'Przytrzymaj i mów', correct: 'Poprawnie', needsFix: 'Trzeba poprawić',
    correctAnswer: 'Poprawna odpowiedź', why: 'Dlaczego tak', stopToday: 'Na dziś wystarczy powtórek tego błędu — wrócimy do niego później.',
    hidden: 'Błąd ukryty', undo: 'Cofnij', continue: 'Kontynuuj', check: 'Sprawdź',
    hideTitle: 'Ukryć ten błąd?', cancel: 'Anuluj', hide: 'Ukryj',
    explanationWordOrder: 'Sprawdź szyk wyrazów: w tym zdaniu pozycja każdego słowa zmienia znaczenie.',
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
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
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

// зачем (D158 / PM-214, 04.10): первый кадр загрузки = геометрия задания (шапка, вопрос, варианты),
// а не спиннер на весь экран — правило владельца «нет спиннера на весь экран» и Performance Bible.
function MistakePracticeLoadingSkeleton() {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <View accessibilityRole="progressbar" testID="mistake-practice-loading" style={{ flex: 1 }}>
      <View style={styles.topbar}>
        <SkeletonBlock width={42} height={42} borderRadius={21} />
        <View style={styles.topRight}>
          <SkeletonBlock width={48} height={16} borderRadius={8} />
          <SkeletonBlock width={42} height={42} borderRadius={21} />
        </View>
      </View>
      <View style={[styles.content, { alignItems: 'center', gap: 14, paddingTop: 30 }]}>
        <SkeletonBlock width="44%" height={18} borderRadius={9} />
        <SkeletonBlock width="68%" height={44} borderRadius={14} />
      </View>
      {/* зачем: геометрия «стакана» из макета (две колонки по 62) — первый кадр равен финальному, без прыжка. */}
      <View style={styles.skelTray}>
        <View style={styles.skelGrid}>
          {[0, 1, 2, 3].map((index) => <SkeletonBlock key={`cell-${index}`} width="48.6%" height={62} borderRadius={18} />)}
        </View>
      </View>
    </View>
  );
}

function MistakePracticeScreenFrame({ children, centered = false }: Readonly<{
  children: React.ReactNode;
  centered?: boolean;
}>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  // зачем (сверка mistakes-panel-010, 04.10): SafeAreaView из react-native на Android не даёт отступов —
  // шапка задания (✕, счётчик, ⋯) лежала под часами и значками строки состояния. Отступы — из стабильных
  // safe-area insets проекта (Performance Bible: insets только через useStableSafeAreaInsets).
  const insets = useStableSafeAreaInsets();
  return (
    <ScreenGradient>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {centered ? <View style={[styles.screen, styles.center]}>{children}</View> : children}
      </View>
    </ScreenGradient>
  );
}

function MistakePracticeSessionScreen() {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{
    length?: string;
    lessonId?: string;
    planTaskId?: string;
    planInstanceId?: string;
    planId?: string;
    planDayIndex?: string;
    focusMistakeId?: string;
    /** Группа типов из окна «Перед отработкой» хаба (meaning / grammar / sound); без параметра — все. */
    facetGroup?: string;
    /** 'corrected' — «Повторить исправленные» (владелец 04.10); без параметра — обычная отработка. */
    pool?: string;
    /** «Ещё N» (координатор 04.10): id ошибок через запятую — только неверные из прошлой сессии. */
    mistakeIds?: string | string[];
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
  const g = useLv2Glass();
  const { lang } = useLang();
  const copy = useMemo(() => sessionCopy(lang), [lang]);
  const { studyTarget } = useStudyTarget();
  const pcopy = useMemo(() => practiceCopyFor(lang, studyTarget), [lang, studyTarget]);
  const [attemptSessionId] = useState(makeFeedbackAttemptId);
  const accountToken = useMemo(() => captureAccountGeneration(), []);
  const { hasPremiumAccess } = usePremium();
  const { confirmSpendOne, acknowledgeSessionStart } = useEnergy();
  const mistakeEnergyIntent = useEnergySessionIntent('mistake_practice', studyTarget, attemptSessionId);
  // зачем: ref — чтобы эффект подготовки сессии не пересоздавался из-за confirmSpendOne
  // и не готовил сессию заново (это лишние чтения журнала ошибок).
  const confirmSpendOneRef = useRef(confirmSpendOne);
  // зачем (D158): потолок 12 с покрывает только подготовку. Окно подтверждения энергии — выбор человека,
  // его не обрываем; а подготовку, брошенную по потолку, поздний ответ уже не оживляет (энергия не списана).
  const prepareStageRef = useRef<'preparing' | 'abandoned' | 'confirming'>('preparing');
  useEffect(() => { confirmSpendOneRef.current = confirmSpendOne; }, [confirmSpendOne]);
  const [accountScope, setAccountScope] = useState<string | null>(null);
  const [session, setSession] = useState<MistakePracticeSession | null>(null);
  const [pendingSession, setPendingSession] = useState<MistakePracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  // зачем (D158): «Сейчас недоступно» + тихая «Попробовать снова» вместо вечного спиннера/красной ошибки.
  const [loadRevision, setLoadRevision] = useState(0);
  const [loadRetriable, setLoadRetriable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [builderTokenIndexes, setBuilderTokenIndexes] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // зачем (владелец, 2026-08-27): DEV-хаб открывает СРАЗУ экран завершения.
  const [complete, setComplete] = useState(devJumpToFinale);
  const milestoneMomentsV3 = useMomentsV3Enabled();
  const milestoneHoldRaw = useStreakMilestoneHold();
  const milestoneHold = milestoneMomentsV3 && milestoneHoldRaw;
  // зачем (владелец, 2026-08-27): sessionId уникален на каждую сессию отработки
  // ошибок (новый набор актуальных ошибок каждый раз) — «повторное прохождение»
  // здесь концептуально не применимо, поэтому completionOrdinal фиксирован.
  // enabled=false, пока session ещё не гидрирован (sessionId недоступен).
  // зачем (владелец 04.10, «Повторить исправленные»): повтор собирается из исправленных ошибок и платит 1 монету за верный ответ.
  const reviewPool = params.pool === 'corrected' ? 'corrected' as const : undefined;
  // зачем: маршрут — недоверенный ввод; разбор один раз на значение параметра, мусор — в лог.
  const retryIdsKey = Array.isArray(params.mistakeIds) ? params.mistakeIds.join(',') : (params.mistakeIds ?? '');
  const retryIds = useMemo(() => {
    const parsed = parseMistakeRetryIdsParam(retryIdsKey);
    if (retryIdsKey) {
      console.log('[MISTAKE-RETRY] route', JSON.stringify({ accepted: parsed.ids.length, dropped: parsed.dropped, overLimit: parsed.overLimit }));
    }
    return parsed;
  }, [retryIdsKey]);
  const practiceRunes = usePracticeRunes({
    activity: 'mistake_practice',
    repeatPriceOnly: reviewPool === 'corrected',
    sessionKey: session?.sessionId ?? '',
    completionOrdinal: 1,
    enabled: session !== null,
    devFakeStartRunes: devRunesFake?.runes,
  });
  const runeFlight = useCoinRewardFlight();
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
  const [earnedStars, setEarnedStars] = useState(0);
  // зачем (макет финала А): фразы, ушедшие навсегда ИМЕННО в этой сессии —
  // они «уезжают» на полку в финале со штампом «Навсегда».
  const [fixedNow, setFixedNow] = useState<readonly MistakeFinaleFixed[]>([]);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  // зачем (макет «Панель», итог: «Ещё повторить N» и кнопка «Ещё N»): какие ошибки ЭТОЙ сессии получили неверный ответ (без повторов).
  const [missedIds, setMissedIds] = useState<readonly string[]>([]);
  const [hideConfirmVisible, setHideConfirmVisible] = useState(false);
  // зачем (макет «Панель»): меню «⋯» на экране задания (скрыть ошибку, сообщить об ошибке в задании), «Почему» в «стакане»,
  // «Не могу сейчас говорить» — переход голосового задания на печать той же фразы.
  const [menuOpen, setMenuOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [speechSkipped, setSpeechSkipped] = useState(false);
  const reportOpenRef = useRef<(() => void) | null>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [hiddenUndo, setHiddenUndo] = useState<Readonly<{
    entry: MistakePracticeSessionEntry;
    nextSession: MistakePracticeSession;
    hiddenEventId: string;
  }> | null>(null);
  const analyticsSessionRef = useRef<MistakePracticeSession | null>(null);
  const analyticsCompletedRef = useRef(false);
  const submissionLatchRef = useRef(false);
  // зачем (аудит Optimistic UI Уроков, координатор 13.10): «Скрыть»/«Вернуть» меняют экран сразу, а запись на диск идёт фоном по очереди. hideOpRef — последняя фоновая запись скрытия (true — записана),
  // undoInFlightRef — идёт запись «вернуть»; пока любая идёт, верные/неверные ответы не принимаются (порядок событий в журнале, как раньше держал диалог).
  const hideOpRef = useRef<Promise<boolean> | null>(null);
  const undoInFlightRef = useRef(false);
  const verdictTapAtRef = useRef(0);
  // зачем (§126, «Мои ошибки» 15–18 с на ответ): журнал ответов живёт в памяти, запись — фоном по очереди (см. модуль)
  const answerJournalRef = useRef<{ key: string; journal: MistakeAnswerJournal } | null>(null);
  const getAnswerJournal = useCallback((scope: string, target: 'en' | 'fr'): MistakeAnswerJournal => {
    const key = `${scope}:${target}`;
    if (answerJournalRef.current?.key !== key) {
      answerJournalRef.current = { key, journal: createMistakeAnswerJournal({ accountScope: scope, studyTarget: target }) };
    }
    return answerJournalRef.current.journal;
  }, []);
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
      : focusedMistakeId
        ? 'correction'
        : 'cards';
  const persistSession = entrySource === 'cards';
  const leavePractice = () => {
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
    // зачем (22.09): здесь тренажёр ошибок ОТКАЗЫВАЛ испанскому и немецкому
    // экраном «не поддерживается» — при том что язык предлагается на выборе.
    // Отказ оставляем только для языка вне курса (теоретический случай).
    if (!isMistakeStudyTargetValue(studyTarget)) {
      if (__DEV__) console.warn('[MISTAKES-GATE] session:unsupported', JSON.stringify({ studyTarget }));
      setLoadError(copy.unsupported);
      setLoading(false);
      return;
    }
    let cancelled = false;
    prepareStageRef.current = 'preparing';
    void (async () => {
      const scope = await getStableId();
      void flushPendingMistakeCorrectionRewards({ accountScope: scope, studyTarget });
      const prepared = await prepareMistakePracticeSession({
        accountScope: scope,
        studyTarget,
        requestedLength,
        persistSession,
        deferNewSessionSave: true,
        lessonId: params.lessonId,
        focusMistakeId: focusedMistakeId,
        facets: facetsFromParam(params.facetGroup),
        pool: reviewPool,
        mistakeIds: retryIds.ids,
      });
      if (!cancelled && prepareStageRef.current === 'abandoned') {
        console.warn('[MISTAKES-GATE] session:prepare:late_after_ceiling → ignored', JSON.stringify({ resumed: prepared.resumed })); // guard-ok
        return;
      }
      if (!cancelled) prepareStageRef.current = 'confirming';
      if (!cancelled) {
        // зачем (владелец 2026-09-14): короткие наборы (1-4 ошибки) без энергии,
        // от 5 — 1 ⚡ один раз при старте (ENERGY_SESSION_COST, app/energy_contract.ts); повтор исправленных стоит столько же.
        const costsEnergy = mistakePracticeSessionCostsEnergy(prepared.session.initialCount);
        console.log('[MISTAKES-GATE] session:energy', JSON.stringify({ // guard-ok: ветвление энергии (правило «сперва логи»)
          resumed: prepared.resumed, initialCount: prepared.session.initialCount, costsEnergy,
        }));
        if (!prepared.resumed && costsEnergy) {
          const energyResult = await confirmSpendOneRef.current(mistakeEnergyIntent);
          // зачем (§123): какая ветка и почему — продолжение без списания допустимо ТОЛЬКО для
          // сессии, за которую энергия списана; отменённая не сохраняется и при следующем входе
          // снова просит энергию.
          console.log('[MISTAKES-GATE] session:energy_result', JSON.stringify({ // guard-ok
            energyResult, sessionId: prepared.session.sessionId, needsSave: prepared.needsSave, cancelledEffect: cancelled,
          }));
          if (cancelled) return;
          if (energyResult === 'cancelled' || energyResult === 'insufficient') {
            console.log('[MISTAKES-GATE] session:not_paid → not saved', JSON.stringify({ energyResult })); // guard-ok
            safeRouterBack(router, '/flashcards' as never);
            return;
          }
          if (energyResult === 'spent') void acknowledgeSessionStart(mistakeEnergyIntent.operationId);
        }
        if (prepared.needsSave) {
          // Оплачена (spent/unlimited) или бесплатная (короткий набор) — теперь её можно продолжать.
          // зачем (координатор §123, 04.10): сохраняем СРАЗУ после списания — между spent и этой записью
          // нет других await (подтверждение старта уходит фоном). Если приложение убито ровно в этом окне,
          // следующий вход попросит энергию ещё раз: в пользу сервера, не пользователя — принято.
          try {
            await commitPreparedMistakePracticeSession({ accountScope: scope, studyTarget, session: prepared.session });
            console.log('[MISTAKES-GATE] session:saved_after_payment', JSON.stringify({ sessionId: prepared.session.sessionId, costsEnergy })); // guard-ok
          } catch (error) {
            // Сохранение не удалось — играем дальше без «продолжения»: следующий вход начнёт заново.
            console.warn('[MISTAKES-GATE] session:save_after_payment_failed', error instanceof Error ? error.message : String(error)); // guard-ok
            if (cancelled) return;
            if (error instanceof Error && error.message === 'stale_account_generation') throw error;
          }
          if (cancelled) return;
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
      if (prepareStageRef.current === 'abandoned') {
        console.warn('[MISTAKES-GATE] session:prepare:late_error_after_ceiling → ignored', error instanceof Error ? error.message : String(error)); // guard-ok
        return;
      }
      const code = error instanceof Error ? error.message : '';
      console.warn('[MISTAKES-GATE] session:prepare:catch', JSON.stringify({ code, entrySource, requestedLength })); // guard-ok: лог в catch обязателен
      if (code === 'stale_account_generation') {
        // зачем (PM-214): раньше немой return оставлял спиннер навсегда. Аккаунт сменился — спокойно
        // «Сейчас недоступно» с «Попробовать снова» (повтор возьмёт новый аккаунт).
        console.warn('[MISTAKES-GATE] session:prepare:stale_account → unavailable', JSON.stringify({ entrySource })); // guard-ok
        setLoadRetriable(true);
        setLoadError(copy.unavailable);
        setLoading(false);
        return;
      }
      setLoadRetriable(code !== 'mistake_practice_focus_unavailable' && code !== 'mistake_practice_no_ready_mistakes');
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
  }, [acknowledgeSessionStart, copy, entrySource, focusedMistakeId, hasPremiumAccess, loadRevision, mistakeEnergyIntent, params.facetGroup, params.lessonId, persistSession, retryIds, reviewPool, requestedLength, router, studyTarget]);

  // зачем (D158): подготовка, не ответившая ни успехом, ни ошибкой, не держит экран вечно.
  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => {
      if (prepareStageRef.current !== 'preparing') {
        console.warn('[MISTAKES-GATE] session:prepare:ceiling skipped', JSON.stringify({ stage: prepareStageRef.current })); // guard-ok
        return;
      }
      prepareStageRef.current = 'abandoned';
      console.warn('[MISTAKES-GATE] session:prepare:ceiling → unavailable', JSON.stringify({ ceilingMs: LOAD_GATE_TOTAL_MS, loadRevision })); // guard-ok
      setLoadRetriable(true);
      setLoadError(copy.unavailable);
      setLoading(false);
    }, LOAD_GATE_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [copy, loadRevision, loading]);

  const retryPrepare = useCallback(() => {
    console.warn('[MISTAKES-GATE] session:prepare:retry', JSON.stringify({ loadRevision })); // guard-ok
    setLoadError(null);
    setLoadRetriable(false);
    setLoading(true);
    setLoadRevision((value) => value + 1);
  }, [loadRevision]);

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
  // зачем (п.70, решено по рекомендации): шапка «n / N» — пройденные вопросы, а не закрытые ошибки.
  const answeredProgress = useMemo(() => (session ? mistakePracticeAnsweredProgress(session) : { answered: 0, total: 0 }), [session]);
  // зачем (сверка 02:30, «счётчик 1/12 не сдвигается после верного»): сперва логи — откуда индекс, кто и когда его меняет, что видит шторка.
  useEffect(() => {
    if (!session) return;
    const remaining = new Set(session.queue.slice(session.cursor).map((item) => item.mistakeId));
    const closedIds = session.queue.slice(0, session.cursor).map((item) => item.mistakeId).filter((id) => !remaining.has(id));
    console.log('[MISTAKE-SESSION] counter', JSON.stringify({
      shown: progress,
      header: `${answeredProgress.answered}/${answeredProgress.total}`,
      initialCount: session.initialCount,
      cursor: session.cursor,
      queueLength: session.queue.length,
      closedUnique: new Set(closedIds).size,
      answered: session.answeredAttemptIds.length,
      pendingCursor: pendingSession ? pendingSession.cursor : null,
      pendingWouldShow: pendingSession ? mistakePracticeProgress(pendingSession) : null,
      feedbackShown: feedback !== null,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- печатаем при смене сессии/шторки, остальное — снимок значений
  }, [session, feedback !== null]);
  // зачем (§SPEECH-NA, владелец 04.10): на устройстве без распознавателя голосовое
  // задание «Моих ошибок» превращается в печать той же фразы — ошибка всё равно
  // отрабатывается и засчитывается, а микрофон не обещает того, что не умеет.
  const speechNa = useSpeechUnavailableOnDevice();
  const renderer = entry?.exercise.renderer === 'speech' && (speechNa || speechSkipped) ? 'typing' : entry?.exercise.renderer;
  const speechReplacedByTyping = entry?.exercise.renderer === 'speech' && speechNa;
  const speechSwapLoggedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!entry || !speechReplacedByTyping) return;
    const key = `${entry.mistakeId}:${entry.exercise.exerciseId}`;
    if (speechSwapLoggedRef.current === key) return;
    speechSwapLoggedRef.current = key;
    console.warn('[SPEECH-AVAIL] mistakes: speech exercise → typing on device without recognizer', JSON.stringify({ key }));
  }, [entry, speechReplacedByTyping]);
  const answerValue = renderer === 'builder'
    ? builderTokenIndexes.map((index) => entry?.exercise.tokens?.[index] ?? '').join(' ')
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
    // зачем (журнал 15): в уроке разбор запускается тапом, а на этом экране текст «Почему» грузится сам, как раньше (нет кнопки разбора).
    autoStart: true,
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
  // зачем: D158 - локальный шаблон (ИИ не ответил) здесь не подменяет разбор: у экрана есть свой feedback.explanation.
  const liveExplanation = mistakeExplain.aiMistakeState === 'ready' && !mistakeExplain.aiMistakeFallback ? mistakeExplain.aiMistakeText : null;

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

  // зачем (координатор 05.10, «направление задания RU→EN вместо EN→RU», по правилу «сперва логи»): что показано в задании — алфавит вопроса и ответа.
  useEffect(() => {
    if (!entry) return;
    const script = (value: string | null | undefined): string => {
      if (!value) return 'none';
      if (/[Ѐ-ӿ]/.test(value)) return 'cyrillic';
      if (/[A-Za-z]/.test(value)) return 'latin';
      return 'other';
    };
    console.log('[MISTAKE-SESSION] exercise:direction', JSON.stringify({
      cursor: session?.cursor ?? null,
      mode: entry.exercise.mode,
      facet: entry.facet,
      promptScript: script(entry.exercise.prompt),
      answerScript: script(entry.exercise.correctAnswer),
      optionScripts: (entry.exercise.options ?? []).map(script),
      direction: `${script(entry.exercise.prompt)}->${script(entry.exercise.correctAnswer)}`,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- печатаем при смене задания
  }, [entry?.exercise.exerciseId, session?.cursor]);

  // коммит шторки и первый кадр после него — когда человек реально видит вердикт
  useEffect(() => {
    if (!feedback || !verdictTapAtRef.current) return;
    const tapAt = verdictTapAtRef.current;
    // зачем: tray_committed дважды на ответ — вторая причина печатается: chain пришёл следом (дорисовка точек) или другое изменение feedback
    console.log('[MISTAKE-SESSION] verdict:stage', JSON.stringify({ stage: 'tray_committed', sinceTapMs: Date.now() - tapAt, correct: feedback.correct, chain: feedback.chain ? 'set' : 'null' }));
    const raf = requestAnimationFrame(() => {
      console.log('[MISTAKE-SESSION] verdict:stage', JSON.stringify({ stage: 'first_frame_after_commit', sinceTapMs: Date.now() - tapAt }));
    });
    return () => cancelAnimationFrame(raf);
  }, [feedback]);

  const submitVerdict = useCallback(async (correct: boolean) => {
    if (!session || !entry || !accountScope || submitting || feedback || submissionLatchRef.current || hideOpRef.current || undoInFlightRef.current) {
      // зачем (аудит Optimistic UI Уроков, 13.10; «ранний выход пишет причину»): тап по «Верно/Неверно» молча терялся — теперь видно, какое условие его остановило
      console.log('[MISTAKE-SESSION] verdict:ignored', JSON.stringify({ session: !!session, entry: !!entry, accountScope: !!accountScope, submitting, feedback: !!feedback, latch: submissionLatchRef.current, hideWriting: !!hideOpRef.current, undoWriting: undoInFlightRef.current })); // guard-ok: редкий ранний выход, одна строка
      return;
    }
    // зачем (сверка 22:33, «шторка вердикта на экране через 1,2–2,2 с, хотя verdict:shown 0–1 мс»): метка тапа для логов по этапам —
    // тап → вычисление → setState → коммит шторки → первый кадр. Значения печатаются в [MISTAKE-SESSION] verdict:stage.
    verdictTapAtRef.current = Date.now();
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
        // зачем (координатор 04.10, «верный повтор не засчитан: итог 0/1 верно»): ошибка, на которую в итоге ответили верно
        // (после повторного показа), в итог идёт как верная и в «Ещё N» не попадает.
        setMissedIds((ids) => {
          const next = ids.filter((id) => id !== entry.mistakeId);
          console.log('[MISTAKE-SESSION] missed:recovered', JSON.stringify({ mistakeId: entry.mistakeId.slice(-8), before: ids.length, after: next.length }));
          return next;
        });
      }
      // зачем: владелец 2026-08-23 — энергия НЕ тратится за ошибки. За отработку
      // ошибок платится 1 ⚡ один раз при старте сессии (эффект подготовки выше).
      if (!correct) {
        setWrongAnswers((value) => value + 1);
        setMissedIds((ids) => (ids.includes(entry.mistakeId) ? ids : [...ids, entry.mistakeId]));
      }
      // зачем (координатор 04.10, «шторка «Верно» через ~2 с»): вердикт — Optimistic UI. Шторка и курсор обновляются СРАЗУ,
      // до чтения журнала с диска; цепочка «N дня из 3» (нужна проекция журнала) дорисуется следом, когда журнал прочитан.
      const tVerdict = Date.now();
      setPendingSession(result.session);
      const attemptEffect = attempts.registerVerdict({
        answerAttemptId: attemptId,
        verdict: correct ? 'correct' : 'pedagogical_wrong',
      });
      setFeedback({
        correct,
        answer: entry.exercise.feedbackAnswer,
        explanation: explanationFor(entry, copy),
        stopForToday: result.requeue?.kind === 'stop_for_today',
        userAnswer: answerValueRef.current,
        chain: null,
      });
      if (attemptEffect === 'attempts_exhausted') {
        // Stop the held capture before the automatic same-card reset.
        setSpeechHeld(false);
      }
      console.log('[MISTAKE-SESSION] verdict:stage', JSON.stringify({ stage: 'setState_done', sinceTapMs: Date.now() - verdictTapAtRef.current }));
      console.log('[MISTAKE-SESSION] verdict:shown', JSON.stringify({ attemptId, correct, attemptEffect, ms: Date.now() - tVerdict, cursorAfter: result.session.cursor, queueLength: result.session.queue.length }));
      const occurredAtMs = Date.now();
      const modeDefinition = MISTAKE_EXERCISE_MODE_REGISTRY[entry.exercise.mode];
      const independent = modeDefinition.countsAsIndependentProduction;
      const answerJournal = getAnswerJournal(accountScope, studyTarget as 'en' | 'fr');
      // зачем (аудит Optimistic UI «Главная и Уроки», 12.10): сбой чтения журнала ДО записи ответа обрывал функцию — ответ не
      // попадал в журнал вовсе. Статус «до» нужен лишь для награды; при сбое считаем 'active', а запись ответа идёт дальше.
      let journalBefore: Awaited<ReturnType<typeof answerJournal.current>> | null = null;
      try {
        journalBefore = await answerJournal.current();
      } catch (error: unknown) {
        console.warn('[MISTAKE-SESSION] journal:current_failed — статус «до» = active, ответ записываем', error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
      }
      const beforeStatus = (journalBefore ? projectMistakes(journalBefore.events).items.get(entry.mistakeId)?.status : undefined) ?? 'active';
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
          // зачем (владелец 04.10): ответ в повторе исправленной — журнал знает, что это закрепление (projection.ts).
          ...(session.pool === 'corrected' ? { review: true } : {}),
        },
      };
      // зачем (§126): вердикт не ждёт запись — событие сразу в журнал в памяти, запись фоном (очередь, повтор, лог)
      const recorded = answerJournal.record(event);
      const write = { journal: recorded.journal };
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
      void recorded.done.then((written) => {
        if (!written) throw new Error('mistake_journal_write_failed');
        return settleMistakePracticeAnswerRewards({
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
      });
      }).then((reward) => {
        if (reward.starGranted) {
          setEarnedStars((value) => value + 1);
          setFixedNow((current) => current.some((item) => item.mistakeId === entry.mistakeId)
            ? current
            : [...current, { mistakeId: entry.mistakeId, phrase: entry.exercise.correctAnswer, meaning: entry.exercise.prompt || null }]);
        }
        // зачем (22.09): проверка языка здесь лишняя — экран уже отсёк язык вне
        // курса на входе (isMistakeStudyTargetValue). Прежний узкий список
        // отнимал достижения у испанского и немецкого.
        if (reward.starGranted) {
          void getMistakePracticeAchievementSnapshot(studyTarget).then((snapshot) =>
            checkAchievements({
              type: 'mistake_practice_progress',
              ...snapshot,
              studyTarget,
            }),
          ).catch((error: unknown) => {
            console.warn('[MISTAKES-GATE] achievements:catch (ответ)', error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
          });
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
        // сессия сохраняется после журнала, тоже фоном: порядок «сначала свидетельство, потом курсор» сохранён
        void recorded.done.then(() => saveMistakePracticeSession({
          accountScope,
          studyTarget: studyTarget as 'en' | 'fr',
          session: result.session,
        })).catch((error: unknown) => {
          console.warn('[MISTAKES-GATE] session:save:catch', error instanceof Error ? error.message : String(error));
        });
      }
      // зачем (макет промаха А): цепочка «3 дня в 2 режимах» берётся из той же
      // проекции, что решает статус — не из отдельного счётчика, иначе экран и
      // правило разойдутся. Показываем её только за самостоятельный ответ:
      // подсказанный день в цепочку не идёт (см. projection.ts).
      const afterItem = projectMistakes(write.journal.events).items.get(entry.mistakeId);
      // зачем (сверка 15–18, кадр «Верно»): три точки-шага справа от «Верно» стоят и после ответа на выбор (распознавание) — тогда они показывают
      // текущую цепочку без нового дня (gainedToday=false); подсказанный ответ день не добавляет (projection.ts).
      const chain = correct && afterItem
        ? {
          days: Math.min(3, afterItem.qualifyingDays.length),
          // зачем (аудит 2026-09-15): без числа режимов панель обещала «ещё один
          // день в другом режиме» там, где нужно два дня или режим уже второй.
          modes: new Set(afterItem.qualifyingModes).size,
          // зачем (§130): второй режим обещаем только там, где он для этой ошибки возможен (как в правиле).
          requiredModes: requiredModesForMistake(afterItem),
          gainedToday: independent,
          corrected: afterStatus === 'corrected',
        }
        : null;
      // дорисовываем цепочку в уже показанную шторку (если её за это время не закрыли)
      // зачем (сверка 02:30, «коммит шторки дважды»): для неверного ответа цепочки нет (chain=null) — новый объект feedback вызвал бы лишний ре-рендер шторки впустую
      setFeedback((current) => (current && current.chain === null && chain !== null ? { ...current, chain } : current));
      console.log('[MISTAKE-SESSION] verdict:chain', JSON.stringify({ attemptId, chain, afterStatus, ms: Date.now() - tVerdict }));
    } finally {
      submissionLatchRef.current = false;
      setSubmitting(false);
    }
  }, [accountScope, copy, entry, entrySource, feedback, getAnswerJournal, persistSession, session, studyTarget, submitting, attempts.registerVerdict]);

  const continueAfterFeedback = useCallback(() => {
    if (!pendingSession) return;
    const finished = pendingSession.cursor >= pendingSession.queue.length;
    setSession(pendingSession);
    setPendingSession(null);
    setFeedback(null);
    setWhyOpen(false);
    setSpeechSkipped(false);
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
      // зачем (22.09): узкий список языков отнимал итоги серии у испанского и
      // немецкого. Язык вне курса уже отсечён на входе в экран.
      if (accountScope) {
        // зачем (владелец 04.10: звания и серию «убрать совсем»): итог показывает только числа сессии и монеты; награды за исправления
        // по-прежнему дописываются ПОСЛЕ записи журнала (монеты за исправление догоняют фоном).
        void (answerJournalRef.current?.journal.whenIdle() ?? Promise.resolve())
          .then(() => flushPendingMistakeCorrectionRewards({ accountScope, studyTarget }))
          .catch((error: unknown) => {
            console.warn('[MISTAKES-REWARD] finale:catch — монеты за исправление догонят при следующем запуске', error instanceof Error ? error.message : String(error)); // guard-ok: лог в catch обязателен
          });
        void getMistakePracticeAchievementSnapshot(studyTarget).then((snapshot) =>
          checkAchievements({
            type: 'mistake_practice_progress',
            ...snapshot,
            perfectSession: pendingSession.initialCount >= 5 && wrongAnswers === 0,
            studyTarget,
          }),
        ).catch((error: unknown) => {
          console.warn('[MISTAKES-GATE] achievements:catch (итог)', error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
        });
        if (persistSession) void clearMistakePracticeSession({ accountScope, studyTarget, pool: reviewPool });
      }
    }
  }, [accountScope, entrySource, params.planDayIndex, params.planId, params.planInstanceId, params.planTaskId, pendingSession, persistSession, reviewPool, studyTarget, wrongAnswers]);

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
    hydrationTrusted: attempts.hydrationTrusted,
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

  const hideToast = useCallback(() => emitAppEvent('action_toast', actionToastTri('error', {
    ru: 'Не удалось скрыть ошибку. Попробуй ещё раз.',
    uk: 'Не вдалося приховати помилку. Спробуй ще раз.',
    es: 'No se pudo ocultar el error. Inténtalo de nuevo.', en: 'Couldn\'t hide the mistake. Try again.',
    'pt-BR': 'Não foi possível ocultar o erro. Tente de novo.', vi: 'Không ẩn được lỗi. Hãy thử lại.', id: 'Kesalahan tidak bisa disembunyikan. Coba lagi.', tr: 'Hata gizlenemedi. Tekrar dene.', pl: 'Nie udało się ukryć błędu. Spróbuj ponownie.',
  })), []);

  const restoreToast = useCallback(() => emitAppEvent('action_toast', actionToastTri('error', {
    ru: 'Не удалось вернуть ошибку. Попробуй ещё раз.',
    uk: 'Не вдалося повернути помилку. Спробуй ще раз.',
    es: 'No se pudo restaurar el error. Inténtalo de nuevo.', en: 'Couldn\'t restore the mistake. Try again.',
    'pt-BR': 'Não foi possível restaurar o erro. Tente de novo.', vi: 'Không khôi phục được lỗi. Hãy thử lại.', id: 'Kesalahan tidak bisa dikembalikan. Coba lagi.', tr: 'Hata geri getirilemedi. Tekrar dene.', pl: 'Nie udało się przywrócić błędu. Spróbuj ponownie.',
  })), []);

  // зачем (аудит Optimistic UI Уроков, 13.10): диалог «Скрыть» висел, пока шли whenIdle → запись события → запись сессии. Теперь экран «Ошибка скрыта» появляется В ТОТ ЖЕ кадр,
  // запись идёт фоном; сбой → откат (панель скрытия исчезает, задание на месте) + тост. Двойной тап: hideOpRef/undoInFlightRef/latch; каждый ранний выход пишет причину.
  const hideCurrentMistake = useCallback(async () => {
    if (!session || !entry || !accountScope) {
      console.log('[MISTAKE-HIDE] ignored', JSON.stringify({ reason: 'no_context', session: !!session, entry: !!entry, accountScope: !!accountScope })); // guard-ok: редкий ранний выход
      return;
    }
    if (submissionLatchRef.current || hideOpRef.current || undoInFlightRef.current) {
      console.log('[MISTAKE-HIDE] ignored', JSON.stringify({ reason: 'busy', verdictLatch: submissionLatchRef.current, hideWriting: !!hideOpRef.current, undoWriting: undoInFlightRef.current })); // guard-ok: двойной тап
      return;
    }
    const tapAt = Date.now();
    const occurredAtMs = tapAt;
    const hiddenEventId = `mistake-practice:v1:${sha256Utf8(canonicalJsonV1({
      cursor: session.cursor,
      sessionId: session.sessionId,
      type: 'hidden',
    }))}`;
    const nextSession: MistakePracticeSession = Object.freeze({
      ...session,
      cursor: session.cursor + 1,
    });
    // Мгновенный локальный шаг: панель «Ошибка скрыта» и закрытый диалог — до любой записи.
    setHiddenUndo({ entry, nextSession, hiddenEventId });
    setHideConfirmVisible(false);
    console.log('[MISTAKE-HIDE] optimistic', JSON.stringify({ mistakeId: entry.mistakeId, cursor: session.cursor, shownInMs: Date.now() - tapAt })); // guard-ok: одна строка на действие
    const op = (async (): Promise<boolean> => {
      try {
        await answerJournalRef.current?.journal.whenIdle();
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
        answerJournalRef.current?.journal.invalidate();
        trackMistakePracticeEvent('mistake_practice_hidden', {
          study_target: studyTarget,
          entry_source: entrySource,
          exercise_mode: entry.exercise.mode,
        });
        if (persistSession) {
          await saveMistakePracticeSession({
            accountScope,
            studyTarget: studyTarget as 'en' | 'fr',
            session: nextSession,
          });
        }
        console.log('[MISTAKE-HIDE] written', JSON.stringify({ mistakeId: entry.mistakeId, writeMs: Date.now() - tapAt })); // guard-ok: итог записи
        return true;
      } catch (error: unknown) {
        // зачем (аудит Optimistic UI, 04.10 + 13.10): отказ записи «скрыть» — откат ТОЛЬКО своей панели (по id события) и понятный тост; событие могло не записаться, поэтому ошибка остаётся на экране.
        console.warn('[MISTAKES-GATE] hide:failed', error instanceof Error ? error.message : String(error));
        setHiddenUndo((cur) => (cur && cur.hiddenEventId === hiddenEventId ? null : cur));
        hideToast();
        return false;
      }
    })();
    hideOpRef.current = op;
    void op.finally(() => { if (hideOpRef.current === op) hideOpRef.current = null; });
  }, [accountScope, entry, entrySource, hideToast, persistSession, session, studyTarget]);

  // зачем (там же): «Вернуть» — задание появляется сразу; запись события «restored» идёт фоном ПОСЛЕ записи скрытия (если она ещё идёт). Сбой → панель скрытия возвращается + тост.
  const undoHiddenMistake = useCallback(async () => {
    if (!hiddenUndo || !accountScope) {
      console.log('[MISTAKE-HIDE] undo:ignored', JSON.stringify({ reason: 'no_context', hiddenUndo: !!hiddenUndo, accountScope: !!accountScope })); // guard-ok: редкий ранний выход
      return;
    }
    if (undoInFlightRef.current) {
      console.log('[MISTAKE-HIDE] undo:ignored', JSON.stringify({ reason: 'already_restoring' })); // guard-ok: двойной тап
      return;
    }
    undoInFlightRef.current = true;
    const undoState = hiddenUndo;
    const tapAt = Date.now();
    setHiddenUndo(null);
    console.log('[MISTAKE-HIDE] undo:optimistic', JSON.stringify({ mistakeId: undoState.entry.mistakeId, hideStillWriting: !!hideOpRef.current, shownInMs: Date.now() - tapAt })); // guard-ok: одна строка на действие
    try {
      const hideWritten = hideOpRef.current ? await hideOpRef.current : true;
      if (!hideWritten) {
        // Скрытие не записалось и уже откатилось само (тост показан) — возвращать нечего.
        console.log('[MISTAKE-HIDE] undo:skipped', JSON.stringify({ reason: 'hide_not_written' })); // guard-ok: причина раннего выхода
        return;
      }
      await answerJournalRef.current?.journal.whenIdle();
      await appendMistakeEvent({
        accountScope,
        studyTarget: studyTarget as 'en' | 'fr',
        event: {
          eventId: `mistake-practice:v1:${sha256Utf8(canonicalJsonV1({
            hiddenEventId: undoState.hiddenEventId,
            type: 'restored',
          }))}`,
          mistakeId: undoState.entry.mistakeId,
          cycleId: undoState.entry.cycleId,
          type: 'restored',
          occurredAtMs: tapAt,
          studyTarget: studyTarget as 'en' | 'fr',
          payload: { hiddenEventId: undoState.hiddenEventId },
        },
      });
      answerJournalRef.current?.journal.invalidate();
      trackMistakePracticeEvent('mistake_practice_restored', {
        study_target: studyTarget,
        entry_source: entrySource,
        exercise_mode: undoState.entry.exercise.mode,
      });
      if (persistSession && session) {
        await saveMistakePracticeSession({
          accountScope,
          studyTarget: studyTarget as 'en' | 'fr',
          session,
        });
      }
      console.log('[MISTAKE-HIDE] undo:written', JSON.stringify({ mistakeId: undoState.entry.mistakeId, writeMs: Date.now() - tapAt })); // guard-ok: итог записи
    } catch (error: unknown) {
      console.warn('[MISTAKES-GATE] restore:failed', error instanceof Error ? error.message : String(error));
      // Откат: панель «Ошибка скрыта» возвращается (если за это время не появилась другая), человек видит, что вернуть не вышло.
      setHiddenUndo((cur) => cur ?? undoState);
      restoreToast();
    } finally {
      undoInFlightRef.current = false;
    }
  }, [accountScope, entrySource, hiddenUndo, persistSession, restoreToast, session, studyTarget]);

  // зачем (там же): «Продолжить» не ждёт запись скрытия, но и не уходит дальше, пока скрытие не записано: если запись упадёт, задание останется на месте (панель скрытия откатилась).
  const continueAfterHidden = useCallback(() => {
    if (!hiddenUndo) {
      console.log('[MISTAKE-HIDE] continue:ignored', JSON.stringify({ reason: 'no_hidden_state' })); // guard-ok: редкий ранний выход
      return;
    }
    const target = hiddenUndo;
    const goOn = () => {
      const next = target.nextSession;
      setSession(next);
      setHiddenUndo(null);
      setInput('');
      setBuilderTokenIndexes([]);
      setSpeechRecovery(null);
      if (next.cursor >= next.queue.length) {
        analyticsCompletedRef.current = true;
        setComplete(true);
        // зачем (22.09): без этого сохранённая сессия испанского/немецкого не
        // очищалась и всплывала снова. Язык вне курса отсечён на входе в экран.
        if (persistSession && accountScope) {
          void clearMistakePracticeSession({ accountScope, studyTarget, pool: reviewPool });
        }
      }
    };
    const writing = hideOpRef.current;
    if (!writing) {
      goOn();
      return;
    }
    console.log('[MISTAKE-HIDE] continue:waiting', JSON.stringify({ reason: 'hide_still_writing' })); // guard-ok: ждём запись скрытия, не больше пары десятков мс
    void writing.then((written) => {
      if (!written) {
        console.log('[MISTAKE-HIDE] continue:cancelled', JSON.stringify({ reason: 'hide_not_written' })); // guard-ok: скрытие откатилось, остаёмся на задании
        return;
      }
      goOn();
    });
  }, [accountScope, hiddenUndo, persistSession, reviewPool, studyTarget]);

  if (loading) {
    return <MistakePracticeScreenFrame><MistakePracticeLoadingSkeleton /></MistakePracticeScreenFrame>;
  }

  if (loadError || !session || (!entry && !complete)) {
    return (
      <MistakePracticeScreenFrame centered>
        {/* зачем (D158): спокойно — без красного значка ошибки; повтор только там, где он имеет смысл. */}
        <Text accessibilityRole="header" style={[styles.errorTitle, { color: g.text, fontSize: f.h3 }]}>{loadError ?? copy.sessionEnded}</Text>
        {/* зачем (координатор 03.10, D158 «тихо везде»): сбой — не повод для акцента. «Попробовать снова» — тихая кнопка,
            «Вернуться» — текстовая ссылка. Акцент остаётся только когда занятие закончилось (действие с результатом). */}
        <View style={styles.errorActions}>
          {loadError && loadRetriable ? (
            <PanelCta g={g} ghost testID="mistake-practice-try-again" label={copy.tryAgain} onPress={retryPrepare} />
          ) : null}
          {loadError && loadRetriable ? (
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.textLink, pressed && { opacity: 0.6 }]} onPress={leavePractice}>
              <Text style={{ color: g.secondary, fontSize: f.body, fontWeight: '700' }}>{copy.back}</Text>
            </Pressable>
          ) : (
            <PanelCta g={g} label={copy.back} onPress={leavePractice} />
          )}
        </View>
      </MistakePracticeScreenFrame>
    );
  }

  // зачем (макет «Панель», итог: «Ещё N»; владелец 04.10): тап — сразу новая отработка ровно по ошибкам ЭТОЙ сессии с неверным ответом.
  // Маршрут ВСЕГДА без pool (даже после «Повторить исправленные»): неверный ответ переводит ошибку в активные, с pool=corrected все id отсеялись бы.
  // Цену списывает сам экран сессии по общим правилам (от 5 ошибок 1 ⚡, 1–4 бесплатно).
  const startMissedAgain = () => {
    if (missedIds.length < 1) return;
    hapticTap();
    trackMistakePracticeEvent('mistake_practice_setup_started', {
      study_target: studyTarget,
      entry_source: 'mistake_finale_more',
      requested_length: 'all',
      ready_count: missedIds.length,
      session_count: missedIds.length,
      costs_energy: mistakePracticeSessionCostsEnergy(missedIds.length),
    });
    markNextNavigationAsReplace();
    router.replace({ pathname: '/mistake_practice_session', params: { mistakeIds: missedIds.join(','), length: 'all' } } as never);
  };

  if (complete) {
    return (
      <MistakePracticeScreenFrame>
        <MistakeSessionFinale
          lang={lang}
          answered={session?.initialCount ?? 0}
          total={session?.initialCount ?? 0}
          wrong={missedIds.length}
          onMore={missedIds.length > 0 ? startMissedAgain : undefined}
          runes={practiceRunes.runes}
          fixed={fixedNow}
          onDone={leavePractice}
        />
        {milestoneHold ? (
          <Suspense fallback={null}>
            <StreakMilestoneHost lang={lang} />
          </Suspense>
        ) : null}
      </MistakePracticeScreenFrame>
    );
  }

  if (!entry) return null;

  const isChoice = renderer === 'choices' || renderer === 'fill_gap' || renderer === 'matching';
  const options = entry.exercise.options ?? [entry.exercise.correctAnswer];
  const kindLabel = renderer === 'builder' ? pcopy.kindBuild
    : renderer === 'fill_gap' ? pcopy.kindGap
      : renderer === 'listening' ? pcopy.kindListen
        : renderer === 'speech' ? pcopy.kindSay
          : renderer === 'typing' ? pcopy.kindType
            : pcopy.kindChoose;
  const feedbackOptions = (() => {
    const right = entry.exercise.correctAnswer;
    if (!feedback) return options;
    const other = !feedback.correct && feedback.userAnswer && feedback.userAnswer !== right
      ? feedback.userAnswer
      : options.find((option) => option !== right);
    return other ? [right, other] : [right];
  })();
  const marks: Record<string, OptionMark> | undefined = feedback && isChoice
    ? { [entry.exercise.correctAnswer]: 'ok', ...(feedback.correct ? {} : { [feedback.userAnswer]: 'no' as const }) }
    : undefined;
  const whyText = cleanMistakeExplanation(liveExplanation ?? feedback?.explanation ?? '', { lang, answers: [feedback?.answer ?? '', feedback?.userAnswer ?? ''] });
  // зачем (владелец 2026-09-14): «твой ответ» и «верный» стоят рядом с подсветкой расхождения; разметку даёт чистая функция buildMistakeAnswerDiff.
  const diff = feedback && !feedback.correct ? buildMistakeAnswerDiff({ userAnswer: feedback.userAnswer, correctAnswer: feedback.answer }) : null;
  const canCheck = answerValue.trim().length > 0 && !submitting;

  // ---- «стакан» внизу экрана: зависит от состояния задания ----
  const tray = (() => {
    if (hiddenUndo) {
      return (
        <Tray g={g} testID="mistake-practice-tray-hidden">
          <Text style={[styles.trayNote, { color: g.text }]}>{copy.hidden}</Text>
          <View style={styles.trayRow}>
            <PanelCta g={g} ghost flex label={copy.undo} onPress={() => void undoHiddenMistake()} />
            <PanelCta g={g} flex label={copy.continue} onPress={continueAfterHidden} />
          </View>
        </Tray>
      );
    }
    if (feedback && whyOpen && !feedback.correct && diff) {
      return (
        <Tray g={g} testID="mistake-practice-tray-why">
          <View style={styles.whyHead}>
            <Text style={[styles.whyTitle, { color: g.text }]}>{`${pcopy.whyTitle} «${feedback.answer}»`}</Text>
            <RoundButton g={g} icon="close" label={pcopy.understood} onPress={() => setWhyOpen(false)} />
          </View>
          <Panel g={g}>
            {feedback.userAnswer.trim() ? (
              <View style={styles.whyRow}>
                <Text style={[styles.whyLabel, { color: g.secondary }]}>{pcopy.yourChoice}</Text>
                <DiffValue g={g} segments={diff.mine} baseColor={g.text} style={styles.whyValue} />
              </View>
            ) : null}
            {/* зачем (Сверка mistakes-panel-016, .pr + .pr): строки панели «Почему» разделены линией 1 px */}
            <View style={[styles.whyRowText, feedback.userAnswer.trim() ? [styles.whyDivider, { borderTopWidth: StyleSheet.hairlineWidth /* shadow-ok: разделитель-линия между строками разбора */, borderTopColor: g.dividerTone }] : null]}>
              <Text testID="mistake-verdict-explanation" style={[styles.whyBody, { color: g.text }]}>
                {whyText || (mistakeExplain.aiMistakeState === 'loading' ? pcopy.thinking : '')}
              </Text>
            </View>
            <View style={[styles.whyRow, styles.whyDivider, { borderTopWidth: StyleSheet.hairlineWidth /* shadow-ok: разделитель-линия между строками разбора */, borderTopColor: g.dividerTone }]}>
              <Text style={[styles.whyLabel, { color: g.secondary }]}>{pcopy.correct}</Text>
              <DiffValue g={g} segments={diff.correct} baseColor={mpColors(g).okText} style={styles.whyValue} />
            </View>
          </Panel>
          <View style={[styles.trayRow, styles.trayRowGap]}>
            {liveExplanation ? <PanelCta g={g} ghost flex testID="mistake-verdict-simpler" label={pcopy.simpler} onPress={mistakeExplain.eli5.onOpen} /> : null}
            <PanelCta g={g} flex label={pcopy.understood} onPress={() => setWhyOpen(false)} />
          </View>
        </Tray>
      );
    }
    if (feedback) {
      return (
        <Tray g={g} testID="mistake-practice-tray-feedback">
          <ResultRow
            g={g}
            ok={feedback.correct}
            label={feedback.correct ? pcopy.rightOk : pcopy.almost}
            right={feedback.chain ? <StepDots g={g} compact n={feedback.chain.corrected ? 3 : feedback.chain.days} /> : null}
          />
          {/* зачем (сверка 15–18): в шторке «Верно»/«Неверно» по макету только два варианта — верный и выбранный (при верном — первый другой). */}
          {isChoice ? <OptionGrid g={g} options={feedbackOptions} marks={marks} disabled /> : null}
          {!feedback.correct ? (
            <>
              {!isChoice ? (
                <View style={styles.answerLine}>
                  <Text style={[styles.whyLabel, { color: g.secondary }]}>{pcopy.correct}</Text>
                  <Text style={[styles.whyValue, { color: mpColors(g).okText }]}>{feedback.answer}</Text>
                </View>
              ) : null}
              <Text testID="mistake-verdict-text" style={[styles.trayWhy, { color: g.text }]}>{whyText}</Text>
              <View style={styles.trayRow}>
                {/* зачем (Сверка mistakes-panel-015/016, .row2 .cta2 flex:1): «Почему» / «Объясни проще» делят строку 50/50 с главной кнопкой */}
                <PanelCta g={g} ghost flex testID="mistake-practice-why" label={pcopy.why} onPress={() => setWhyOpen(true)} />
                <PanelCta g={g} flex testID="mistake-practice-next" label={pcopy.next} onPress={continueAfterFeedback} />
              </View>
            </>
          ) : (
            <View style={isChoice ? styles.trayCtaGap : undefined}>
              <PanelCta g={g} testID="mistake-practice-next" label={pcopy.next} onPress={continueAfterFeedback} />
            </View>
          )}
          {feedback.stopForToday ? <Text style={[styles.trayStop, { color: g.secondary }]}>{triLang(lang, { ru: 'Повторим эту фразу завтра: три попытки подряд утомляют, а не учат.', uk: 'Повторимо цей вислів завтра: три спроби поспіль втомлюють, а не вчать.', en: "We'll come back to this phrase tomorrow: three tries in a row tire you out rather than teach.", es: 'Volveremos a esta frase mañana: tres intentos seguidos cansan, no enseñan.', 'pt-BR': 'Voltamos a esta frase amanhã: três tentativas seguidas cansam, não ensinam.', vi: 'Ta sẽ quay lại câu này vào ngày mai: ba lần liên tiếp làm mệt chứ không giúp học.', id: 'Kita ulang frasa ini besok: tiga kali berturut-turut melelahkan, bukan mengajarkan.', tr: 'Bu ifadeye yarın döneriz: üst üste üç deneme öğretmez, yorar.', pl: 'Wrócimy do tej frazy jutro: trzy próby pod rząd męczą, a nie uczą.' })}</Text> : null}
        </Tray>
      );
    }
    if (isChoice) {
      return (
        <Tray g={g} testID="mistake-practice-tray-choices">
          <OptionGrid
            g={g}
            options={options}
            testIDPrefix="mistake-practice-option"
            // зачем (координатор 13.10, mistakes-panel-014/015): признак верного варианта — только для робота dev-сборки
            devIsCorrect={__DEV__ && !IS_STORE_RELEASE ? (option) => matchesMistakePracticeAnswer(option, entry.exercise.correctAnswer, studyTarget) : undefined}
            disabled={submitting} onPick={(option) => { answerValueRef.current = option; void submitVerdict(matchesMistakePracticeAnswer(option, entry.exercise.correctAnswer, studyTarget)); }} />
        </Tray>
      );
    }
    if (renderer === 'builder') {
      return (
        <Tray g={g} testID="mistake-practice-tray-builder">
          <View style={styles.tokenPool}>
            {builderDisplayOrder.map((index) => (
              <Token key={index} g={g} label={entry.exercise.tokens?.[index] ?? ''} used={builderTokenIndexes.includes(index)} onPress={() => setBuilderTokenIndexes((current) => [...current, index])} />
            ))}
          </View>
          <PanelCta g={g} testID="mistake-practice-check" label={pcopy.check} disabled={!canCheck} onPress={() => void submitVerdict(matchesMistakePracticeAnswer(answerValue, entry.exercise.correctAnswer, studyTarget))} />
        </Tray>
      );
    }
    if (renderer === 'speech') {
      return (
        <Tray g={g} testID="mistake-practice-tray-speech">
          <PanelCta g={g} ghost testID="mistake-practice-skip-speak" label={pcopy.skipSpeak} onPress={() => { setSpeechHeld(false); setSpeechSkipped(true); }} />
        </Tray>
      );
    }
    return (
      <Tray g={g} testID="mistake-practice-tray-typing">
        <PanelCta g={g} testID="mistake-practice-check" label={pcopy.check} disabled={!canCheck} onPress={() => void submitVerdict(matchesMistakePracticeAnswer(answerValue, entry.exercise.correctAnswer, studyTarget))} />
      </Tray>
    );
  })();

  return (
    <MistakePracticeScreenFrame>
      <View style={styles.topbar}>
        {/* зачем (DQA / PM-134 A2, 04.10): у крестика роль кнопки — диктор объявляет «Закрыть, кнопка». */}
        <RoundButton g={g} icon="close" label={copy.close} onPress={leavePractice} testID="mistake-practice-close" />
        <View style={styles.topRight}>
          {/* зачем (Ядро 12.10, сторож session_attempts_screen_wiring_gate): сердечки на отработке ошибок работали, а индикатора не было. Режим энергии Б здесь не включён — HUD покажет сердечки. */}
          <SessionAttemptsHud remaining={attempts.state.remainingAttempts} attempts={attempts} locale={lang} testID="mistake-practice-attempts" />
          <Text style={[styles.counter, { color: g.secondary }]}>{`${answeredProgress.answered} / ${answeredProgress.total}`}</Text>
          <RoundButton g={g} icon="ellipsis-horizontal" label={pcopy.menu} onPress={() => { hapticTap(); setMenuOpen(true); }} testID="mistake-practice-menu" />
        </View>
      </View>
      {/* зачем (решение владельца 04.10): счётчика монет в шапке нет, но полёт монет остаётся — летит в эту точку у правого края шапки. */}
      <View ref={runeFlight.counterRef} collapsable={false} pointerEvents="none" style={styles.runeAnchor} />

      {/* Источник полёта рун (владелец, 2026-08-27) */}
      <View ref={runeFlight.originRef} collapsable={false} style={{ flex: 1 }}>
        <ScrollView decelerationRate="fast" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <QuestionBlock g={g} kind={kindLabel} value={entry.exercise.prompt} hint={entry.exercise.hint} />

          {!feedback && !hiddenUndo && renderer === 'builder' ? (
            <AnswerSlot style={styles.slotGap}>
              {builderTokenIndexes.map((index, position) => (
                <Token key={`${index}-${position}`} g={g} label={entry.exercise.tokens?.[index] ?? ''} />
              ))}
              {builderTokenIndexes.length ? (
                <Pressable
                  // зачем (DQA / PM-134 A2, 04.10): кнопка сброса была немой для диктора — роль и подпись.
                  accessibilityRole="button"
                  accessibilityLabel={pcopy.resetAria}
                  hitSlop={8}
                  onPress={() => setBuilderTokenIndexes([])}
                  style={styles.slotReset}
                ><Ionicons name="refresh" size={20} color={g.secondary} /></Pressable>
              ) : null}
            </AnswerSlot>
          ) : null}

          {!feedback && !hiddenUndo && (renderer === 'typing' || renderer === 'listening') ? (
            <View style={styles.fieldWrap}>
              {speechReplacedByTyping ? (
                <SpeechUnavailableNote lang={lang} color={g.secondary} testID="mistakes-speech-unavailable" />
              ) : null}
              {entry.exercise.renderer === 'listening' && entry.exercise.audioRef ? (
                <ListeningPlayback audioRef={entry.exercise.audioRef} color={g.accentText} foreground={g.accentInk} accessibilityLabel={copy.listen} />
              ) : null}
              <AnswerField>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={copy.answerPlaceholder}
                  placeholder={copy.answerPlaceholder}
                  placeholderTextColor={g.mutedText}
                  style={[fieldInputStyle, { color: g.text }]}
                />
              </AnswerField>
            </View>
          ) : null}

          {!feedback && !hiddenUndo && renderer === 'speech' ? (
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
                style={({ pressed }) => [styles.mic, { backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 18, blurRadius: 34, spreadDistance: -12, color: `${g.accent}B3` }] }, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="mic" size={32} color={g.accentInk} />
              </Pressable>
              <Text style={[styles.micLabel, { color: g.secondary }]}>{pcopy.holdToSpeak}</Text>
              {speechRecovery ? <Text style={[styles.recovery, { color: g.secondary, fontSize: f.sub }]}>{speechRecovery}</Text> : null}
            </View>
          ) : null}
        </ScrollView>
      </View>

      {tray}

      <PanelSheet visible={menuOpen} onClose={closeMenu} testID="mistake-practice-sheet">
        <SheetRow g={g} testID="mistake-practice-menu-hide" icon="eye-off-outline" title={pcopy.hideItem} onPress={() => { setMenuOpen(false); setHideConfirmVisible(true); }} />
        {/* решение 6 (05.10): пункт жалобы — только тестерам и разработке, как и сама форма. */}
        {REPORT_ERROR_ENABLED ? <SheetRow g={g} testID="mistake-practice-menu-report" icon="flag-outline" title={pcopy.reportItem} onPress={() => { setMenuOpen(false); reportOpenRef.current?.(); }} /> : null}
      </PanelSheet>
      {/* зачем: ту же форму жалобы, что была кнопкой-флажком в шапке, теперь открывает пункт меню «⋯»; сама кнопка не рисуется. */}
      <ReportErrorButton
        hideTrigger
        openRef={reportOpenRef}
        screen="mistake_practice"
        dataId={`mistake_${entry.exercise.exerciseId ?? 'unknown'}`}
        dataText={`${entry.exercise.prompt}${entry.exercise.hint ? `\n${entry.exercise.hint}` : ''}
OK: ${entry.exercise.correctAnswer}`}
        userAnswer={feedback?.userAnswer || undefined}
        testID="mistake-practice-report-form"
      />
      <MistakeEli5Modal
        visible={mistakeExplain.eli5.open}
        onClose={mistakeExplain.eli5.onClose}
        lang={lang}
        state={mistakeExplain.eli5.state}
        text={mistakeExplain.eli5.text}
        onRetry={mistakeExplain.eli5.onRetry}
        fallback={mistakeExplain.eli5.fallback}
        onRefresh={mistakeExplain.eli5.onRefresh}
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
        <CoinRewardFlight
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

const baseStyles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 },
  header: { minHeight: 62, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  topbar: { minHeight: 44, marginTop: 6, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skelTray: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 34 },
  skelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  runeAnchor: { position: 'absolute', top: 24, right: 70, width: 1, height: 1 },
  errorActions: { alignSelf: 'stretch', gap: 12, paddingHorizontal: 20 },
  trayNote: { fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center', marginBottom: 14 },
  trayRow: { flexDirection: 'row', gap: 10 },
  trayRowGap: { marginTop: 16 },
  trayCtaGap: { marginTop: 16 },
  trayWhy: { marginTop: 14, marginBottom: 16, paddingHorizontal: 2, fontSize: 16, lineHeight: 23 },
  trayStop: { marginTop: 12, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  whyHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  whyTitle: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  whyRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14 },
  whyRowText: { paddingVertical: 12 },
  whyDivider: {},
  whyLabel: { width: 90, fontSize: 16, lineHeight: 20 },
  whyValue: { flex: 1, fontSize: 19, lineHeight: 24, fontWeight: '700' },
  whyBody: { fontSize: 16, lineHeight: 23 },
  strike: { textDecorationLine: 'line-through' },
  answerLine: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tokenPool: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  slotGap: { marginTop: 26 },
  slotReset: { marginLeft: 'auto', padding: 4 },
  fieldWrap: { marginTop: 26, gap: 14 },
  mic: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  micLabel: { marginTop: 16, fontSize: 16, lineHeight: 20, textAlign: 'center' },
  headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  counter: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingBottom: 340 },
  prompt: { fontWeight: '700', lineHeight: 34 },
  // зачем: контейнер content держит gap 20 — без подтягивания перевод повис бы
  // ровно между заданием и вариантами, не примыкая ни к чему. Пара
  // «задание + перевод» обязана читаться одним блоком.
  promptHint: { marginTop: -12, lineHeight: 26 },
  optionList: { gap: 11 },
  option: { minHeight: 58, borderRadius: 18, paddingHorizontal: 18, justifyContent: 'center' },
  input: { minHeight: 58, borderRadius: 18, paddingHorizontal: 18 },
  audioButton: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  builderAnswer: { minHeight: 76, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  token: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center' },
  speechArea: { marginTop: 44, gap: 0 },
  micButton: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  recovery: { textAlign: 'center' },
  feedback: { borderRadius: 20, padding: 18, gap: 10 },
  feedbackHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  feedbackLabel: { marginTop: 4, fontWeight: '700', textTransform: 'uppercase' },
  bottomButton: { position: 'absolute', left: 22, right: 22, bottom: 22, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  undoRow: { position: 'absolute', left: 22, right: 22, bottom: 22, flexDirection: 'row', gap: 10 },
  undoButton: { flex: 1, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { minWidth: 180, minHeight: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  quietButton: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  textLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  errorTitle: { textAlign: 'center', fontWeight: '700' },
});

export default MistakePracticeSessionScreen;
