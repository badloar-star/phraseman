/**
 * cards-2.0 (E5): единый экран результата сессии Карточек (§3.10 мастер-плана).
 * Встраиваемый компонент (НЕ роут): сессии рендерят его вместо своего done-блока.
 *
 * зачем (владелец 05.10 11:10, решение 3): вид — свой итог раздела по cards-section.html
 * (CardsSessionResultV2), а не общий экран завершения. Здесь — логика: звук/хаптика финала,
 * недельный гейт оценки, подписи кнопок.
 */
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useMomentsV3Enabled } from '../../components/streak/moments/use_moments_v3_flag';
import { useStreakMilestoneHold, streakMilestoneHostLoadFailed } from '../streak_milestone_pending';
// зачем (координатор 15.10): рубеж серии виден и тем, кто учит только карточки — тот же ленивый хост, что на итоге урока
// зачем (R64, слот #36): сбой ленивой загрузки отпускает рубеж — иначе окна итога ждали вечно
const StreakMilestoneHost = lazy(() => import('../../components/streak/moments/StreakMilestoneHost').catch(streakMilestoneHostLoadFailed));
import { useLang } from '../../components/LangContext';
import FeedbackRatingCard from '../../components/FeedbackRatingCard';
import { triLang } from '../../constants/i18n';
import { shouldPromptFeedback, markFeedbackPrompted } from '../feedback_prompt_throttle';
import { fcHaptic, playSfx } from './SoundService';
import CardsSessionResultV2 from './CardsSessionResultV2';
import type { CardsResultMistake } from './session_result_mistakes';

export type SessionResultScreenProps = {
  /** Верных ответов (по попыткам). */
  correct: number;
  /** Ошибок. */
  wrong: number;
  /**
   * Руны, заработанные в сессии (владелец, 2026-08-27). Опционален и не
   * влияет на существующие вызовы без него; все активные режимы карточек
   * передают сюда итог своей копилки практики.
   */
  runesGained?: number;
  /** Сколько карточек «Ещё учу» — для CTA второго раунда. */
  learnLeft: number;
  /** Рестарт с ошибочными карточками; без него CTA «Добить» скрыт. */
  onRetryWrong?: () => void;
  onDone: () => void;
  /** Акцент экрана сессии (words #4A9EFF / phrases #40C080 / arena #E05050). */
  accentColor?: string;
  /** E12 (блиц): текст CTA повтора («Ещё разок!») — показывает кнопку даже при learnLeft=0. */
  retryLabel?: string;
  // зачем (PM-086, владелец 2026-09-24): retryShowsEnergyCost удалён — жил
  // только ради ценника энергии над кнопкой повтора, JSX-вывод которого
  // уже был убран раньше нас; проп остался неиспользуемым мёртвым кодом.
  /** E12 (блиц): пилюля счёта очков под заголовком («Счёт: 1250»). */
  scoreText?: string;
  /**
   * Владелец 2026-08-25: блок оценки звёздами + текст, тот же что на экране
   * MAX. Опционален и без него ничего не меняется — только сессии, которые
   * явно передали entityId, получают карточку (троттлинг раз в неделю на
   * раздел живёт внутри, через shouldPromptFeedback).
   */
  feedback?: {
    entityId: string;
    entityLabel?: string | null;
  };
  /** «Блиц · Сохранённые» — режим и набор над счётом (макет `.ov`). */
  overline?: string;
  /** Когда началась тренировка (Date.now()); время в итоге = монтирование итога − старт. */
  startedAtMs?: number;
  /** Точная длительность, если режим знает её сам (Блиц: длина раунда); главнее startedAtMs. */
  durationSec?: number;
  /** Карточки с ошибками для «Что исправить»; без него секции нет. */
  mistakes?: readonly CardsResultMistake[];
  testID?: string;
};

function SessionResultScreenImpl({
  correct,
  wrong,
  runesGained = 0,
  learnLeft,
  onRetryWrong,
  onDone,
  accentColor,
  retryLabel,
  scoreText,
  feedback,
  overline,
  startedAtMs,
  durationSec: durationSecProp,
  mistakes,
  testID = 'fc-session-result',
}: SessionResultScreenProps) {
  const { lang } = useLang();
  const momentsV3 = useMomentsV3Enabled();
  const milestoneHoldRaw = useStreakMilestoneHold();
  const milestoneHold = momentsV3 && milestoneHoldRaw;
  // Время фиксируется один раз — в кадр появления итога, а не на каждый рендер.
  const [durationSec] = useState<number | null>(() => {
    if (typeof durationSecProp === 'number' && Number.isFinite(durationSecProp)) return Math.max(0, durationSecProp);
    return typeof startedAtMs === 'number' && startedAtMs > 0 ? Math.max(0, (Date.now() - startedAtMs) / 1000) : null;
  });

  // SFX/хаптика финала сессии (§5, E9).
  useEffect(() => {
    playSfx('session_complete');
    fcHaptic('finish');
  }, []);

  // Троттлинг: не чаще раза в неделю на раздел (владелец 2026-08-25) — гейт
  // решается один раз при монтировании экрана результата, не на каждый рендер.
  const [showFeedback, setShowFeedback] = useState(false);
  useEffect(() => {
    if (!feedback) return;
    let cancelled = false;
    void shouldPromptFeedback('vocab').then((allowed) => {
      if (cancelled || !allowed) return;
      setShowFeedback(true);
      void markFeedbackPrompted('vocab');
    }).catch((error: unknown) => {
      // Оценка необязательна: без гейта просто не показываем её, но причину пишем.
      console.warn('[FC-RESULT] feedback_gate_failed', error instanceof Error ? error.message : String(error)); // guard-ok: сбой гейта обязан логироваться
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback?.entityId]);

  // зачем (Карточки 2.0 12.10, cards-v2.html «Итог»): с ошибками основная кнопка — «Повторить ошибки» (без числа), без ошибок / у Блица — «Ещё раз» (retryLabel сессии).
  const retryWrongLabel = learnLeft > 0
    ? triLang(lang, { ru: 'Повторить ошибки', uk: 'Повторити помилки', en: 'Retry mistakes', es: 'Repetir errores', 'pt-BR': 'Repetir erros', vi: 'Làm lại câu sai', id: 'Ulangi kesalahan', tr: 'Hataları tekrarla', pl: 'Powtórz błędy' })
    : retryLabel;
  void accentColor; void scoreText; // зачем: прежние пропсы вызовов; в макете итога Карточек нет ни акцента режима, ни строки счёта (владелец 04.10 — только монеты)
  return (
    <>
    <CardsSessionResultV2
      testID={testID}
      overline={overline}
      correct={correct}
      wrong={wrong}
      coinsGained={runesGained}
      durationSec={durationSec}
      mistakes={mistakes}
      retryLabel={onRetryWrong && retryWrongLabel ? retryWrongLabel : undefined}
      onRetry={onRetryWrong && retryWrongLabel ? () => { fcHaptic('tap'); onRetryWrong(); } : undefined}
      onDone={() => { fcHaptic('tap'); onDone(); }}
      feedbackSlot={feedback && showFeedback ? (
        <FeedbackRatingCard
            kind="vocab"
            entityId={feedback.entityId}
            entityLabel={feedback.entityLabel}
            lang={lang}
            title={triLang(lang, { ru: 'Слова того стоили?', en: 'Were these words worth it?', uk: 'Слова були варті того?', es: '¿Valieron la pena estas palabras?',
              'pt-BR': 'As palavras valeram a pena?', vi: 'Những từ này có đáng học không?',
              id: 'Kata-katanya sepadan?', tr: 'Bu kelimeler değdi mi?', pl: 'Czy te słowa były warte?',
            })}
            placeholder={triLang(lang, { ru: 'Каких слов не хватило? Какие лишние?', en: 'Which words were missing? Which were pointless?', uk: 'Яких слів забракло? Які зайві?', es: '¿Qué palabras faltaron? ¿Cuáles sobraban?',
              'pt-BR': 'Que palavras faltaram? Quais sobraram?', vi: 'Thiếu những từ nào? Từ nào thừa?',
              id: 'Kata apa yang kurang? Mana yang tak perlu?', tr: 'Hangi kelimeler eksikti? Hangileri gereksiz?', pl: 'Jakich słów zabrakło? Które zbędne?',
            })}
            sendLabel={triLang(lang, { ru: 'Отправить', en: 'Send', uk: 'Надіслати', es: 'Enviar', 'pt-BR': 'Enviar',
              vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij',
            })}
            thanksLabel={triLang(lang, { ru: 'Спасибо! Отзыв отправлен', en: 'Thanks! Feedback sent', uk: 'Дякуємо! Відгук надіслано', es: '¡Gracias! Comentario enviado',
              'pt-BR': 'Obrigado! Comentário enviado', vi: 'Cảm ơn! Đã gửi phản hồi',
              id: 'Terima kasih! Masukan terkirim', tr: 'Teşekkürler! Geri bildirim gönderildi', pl: 'Dziękujemy! Opinia wysłana',
            })}
            ratingA11yLabel={triLang(lang, { ru: 'Оценка', en: 'Rating', uk: 'Оцінка', es: 'Valoración', 'pt-BR': 'Avaliação',
              vi: 'Đánh giá', id: 'Penilaian', tr: 'Puan', pl: 'Ocena',
            })}
            testID={`${testID}-feedback`}
            presentation="liquid-glass-rate"
          />
      ) : undefined}
    />
    {milestoneHold ? (
      <Suspense fallback={null}>
        <StreakMilestoneHost lang={lang} />
      </Suspense>
    ) : null}
    </>
  );
}

const SessionResultScreen = React.memo(SessionResultScreenImpl);
export { SessionResultScreen };
export default SessionResultScreen;
