// ═══════════════════════════════════════════════════════════════════════════
// tournament_review.tsx — разбор ответов после турнира.
//
// зачем (владелец 2026-07-27): «после турнира можно смотреть свои ответы,
// ошибки и правильные варианты, чтобы проанализировать» — как было в арене,
// но в дизайне Learning V2.
//
// Устройство: сервер отдаёт разбор только когда турнир окончен и только СВОЙ
// (во время игры это была бы подсказка). Порядок — игровой: задание 3 в разборе
// это задание 3 в турнире, иначе номера врут.
//
// зачем 2026-08-03 (владелец: «показывай каждое задание как свёрнутую плашку, а
// при разворачивании увидим инфу»): раньше весь разбор вываливался списком —
// 10-15 карточек с вариантами и пояснениями, экран на несколько экранов
// прокрутки, и найти нужное задание было нельзя. Теперь список — оглавление:
// номер, фраза, значок верно/мимо. Открыта одна плашка за раз (решение
// владельца), деталь приходит по тапу.
//
// Layout stability: скелетон нужного размера до ответа сервера; раскрытие
// плашки идёт через animateNextLayoutTransition — контент не телепортируется.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlowText } from '../components/text-integrity/FlowText';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { animateNextLayoutTransition } from './smooth_layout';
import { safeRouterBack } from './navigation_back';
import TapScale from '../components/TapScale';
import {
  radius,
  useTournamentPalette,
  type TournamentV2,
} from '../components/ui/v2_theme';
import { V2Card, V2Counter, V2Cta } from '../components/ui/v2_ui';
import { TournamentBackdrop } from '../components/ui/V2Backdrop';
import { StarGlyph } from '../components/ui/V2Fx';
import { TournamentAudioButton } from '../components/tournament/TournamentAudioButton';
import ReportErrorButton from '../components/ReportErrorButton';
import {
  loadRoundReview,
  peekRoundReview,
  resolveTournamentRoomIdParam,
  type AggregateReviewItem,
  type ReviewItem,
  type SpeedMatchReviewPair,
} from './tournament_client';
import { triLang, type Lang } from '../constants/i18n';
import { useLang } from '../components/LangContext';

/** Человеческие названия режимов — локализованы под текущий язык интерфейса. */
function modeLabelFor(mode: string, lang: Lang): string {
  const labels: Record<string, ReturnType<typeof triLang<{ ru: string; uk: string; es: string }>>> = {
    listen_choose: triLang(lang, { ru: 'Выбор на слух', uk: 'Вибір на слух', es: 'Elegir de oído', 'pt-BR': 'Escolher de ouvido', vi: 'Chọn theo âm thanh', id: 'Pilih berdasarkan suara', tr: 'Kulaktan seçim', pl: 'Wybór ze słuchu' }),
    sound_contrast: triLang(lang, { ru: 'Пары звуков', uk: 'Пари звуків', es: 'Pares de sonidos', 'pt-BR': 'Pares de sons', vi: 'Cặp âm thanh', id: 'Pasangan suara', tr: 'Ses çiftleri', pl: 'Pary dźwięków' }),
    listen_build: triLang(lang, { ru: 'Диктант', uk: 'Диктант', es: 'Dictado', 'pt-BR': 'Ditado', vi: 'Chính tả', id: 'Dikte', tr: 'Dikte', pl: 'Dyktando' }),
    time_attack: triLang(lang, { ru: 'Серия на время', uk: 'Серія на час', es: 'Serie contrarreloj', 'pt-BR': 'Série contra o tempo', vi: 'Chuỗi tính giờ', id: 'Rentetan waktu', tr: 'Zamana karşı seri', pl: 'Seria na czas' }),
    speed_match: triLang(lang, { ru: 'Пары на скорость', uk: 'Пари на швидкість', es: 'Parejas contrarreloj', 'pt-BR': 'Pares contra o tempo', vi: 'Ghép cặp tốc độ', id: 'Pasangan kecepatan', tr: 'Hız çiftleri', pl: 'Pary na czas' }),
  };
  return labels[mode] ?? mode;
}

export default function TournamentReviewScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const styles = useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string | string[] }>();
  const roomId = resolveTournamentRoomIdParam(params.roomId);

  /**
   * зачем 2026-08-02 (владелец: «раздел разбор ошибок в конце турнира грузится
   * долго вместо мгновенного открытия»): экран стартовал с null и держал
   * скелетон до ответа сети — даже при повторном заходе в ту же комнату.
   * Разбор завершённого турнира неизменен, поэтому уже полученный показываем
   * СИНХРОННО с первого кадра (тот же приём, что peekStableId и
   * peekSeasonStandings в остальном приложении).
   */
  const [items, setItems] = useState<ReviewItem[] | null>(() => peekRoundReview(roomId));
  const [failed, setFailed] = useState(false);

  /**
   * Открытая плашка — ровно одна (решение владельца 2026-08-03).
   *
   * Состояние живёт на экране, а не в карточке: только так вторая плашка может
   * закрыть первую. Ключ — индекс задания: taskId в теории может повториться,
   * индекс уникален всегда.
   */
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const toggleCard = useCallback((index: number) => {
    // Вставка/схлопывание в потоке — только мягким переходом (Layout Stability).
    animateNextLayoutTransition();
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  const goBack = useCallback(() => safeRouterBack(router, '/(tabs)/home' as any), [router]);

  useEffect(() => {
    if (!roomId) { setFailed(true); return; }
    // Кэш уже отдал данные — сети здесь делать нечего.
    if (peekRoundReview(roomId)) return;
    let alive = true;
    void loadRoundReview(roomId)
      .then((response) => { if (alive) setItems(response?.items ?? []); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [roomId]);

  // Ошибки первыми: ради них экран и открывают. Внутри группы — по порядку игры.
  const ordered = useMemo(() => items ?? [], [items]);

  const correctCount = items?.filter((item) => item.correct).length ?? 0;
  const total = items?.length ?? 0;
  const mistakes = total - correctCount;

  return (
    <View style={styles.root}>
      <TournamentBackdrop variant="review" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TapScale
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={P.text} />
          </TapScale>
          {/* зачем: text-integrity — масштабирование шрифта не отключаем, шапка гибкая. */}
          <FlowText testID="review-title" provenance="authored" style={styles.title}>{triLang(lang, { ru: 'Разбор', uk: 'Розбір', es: 'Revisión', 'pt-BR': 'Revisão', vi: 'Xem lại', id: 'Tinjauan', tr: 'İnceleme', pl: 'Przegląd' })}</FlowText>
          <View style={styles.headerRight}>
            <V2Counter value={`${correctCount}/${total || '—'}`} tone="stars" />
          </View>
        </View>

        {failed ? (
          <V2Card pad={22}>
            <Text style={styles.emptyTitle}>{triLang(lang, { ru: 'Разбор недоступен', uk: 'Розбір недоступний', es: 'Revisión no disponible', 'pt-BR': 'Revisão indisponível', vi: 'Không có bản xem lại', id: 'Tinjauan tidak tersedia', tr: 'İnceleme kullanılamıyor', pl: 'Przegląd niedostępny' })}</Text>
            <Text style={styles.emptyText}>
              {triLang(lang, { ru: 'Он появляется после окончания турнира и только для его участников.', uk: 'Він з’являється після завершення турніру і лише для його учасників.', es: 'Aparece después de que termina el torneo y solo para sus participantes.', 'pt-BR': 'Aparece depois que o torneio termina e apenas para seus participantes.', vi: 'Nó xuất hiện sau khi giải đấu kết thúc và chỉ dành cho người tham gia.', id: 'Ini muncul setelah turnamen berakhir dan hanya untuk pesertanya.', tr: 'Turnuva bittikten sonra ve yalnızca katılımcılar için görünür.', pl: 'Pojawia się po zakończeniu turnieju i tylko dla jego uczestników.' })}
            </Text>
            <View style={styles.emptyAction}>
              <V2Cta tone="ghost" onPress={goBack}>{triLang(lang, { ru: 'К турнирам', uk: 'До турнірів', es: 'A los torneos', 'pt-BR': 'Para os torneios', vi: 'Đến giải đấu', id: 'Ke turnamen', tr: 'Turnuvalara git', pl: 'Do turniejów' })}</V2Cta>
            </View>
          </V2Card>
        ) : items === null ? (
          // Скелетон нужного размера: первый кадр совпадает с финальной
          // геометрией, карточки ниже не «прыгают» при загрузке.
          <View style={styles.skeletonList}>
            {[0, 1, 2].map((key) => <View key={key} style={styles.skeletonCard} />)}
          </View>
        ) : total === 0 ? (
          <V2Card pad={22}>
            <Text style={styles.emptyTitle}>{triLang(lang, { ru: 'Ответов нет', uk: 'Відповідей немає', es: 'Sin respuestas', 'pt-BR': 'Sem respostas', vi: 'Không có câu trả lời', id: 'Tidak ada jawaban', tr: 'Cevap yok', pl: 'Brak odpowiedzi' })}</Text>
            <Text style={styles.emptyText}>
              {triLang(lang, { ru: 'В этом турнире вы не успели ответить ни на один вопрос.', uk: 'У цьому турнірі ви не встигли відповісти на жодне питання.', es: 'En este torneo no llegaste a responder ninguna pregunta.', 'pt-BR': 'Neste torneio, você não conseguiu responder nenhuma pergunta.', vi: 'Trong giải đấu này, bạn chưa kịp trả lời câu hỏi nào.', id: 'Dalam turnamen ini, Anda belum sempat menjawab satu pun pertanyaan.', tr: 'Bu turnuvada hiçbir soruyu yanıtlayamadın.', pl: 'W tym turnieju nie zdążyłeś odpowiedzieć na żadne pytanie.' })}
            </Text>
          </V2Card>
        ) : (
          <>
            {/* зачем 2026-08-03: подпись раньше обещала «ошибки первыми в
                списке», хотя порядок игровой и ошибки идут вперемешку — она
                прямо врала. Теперь говорит только то, что правда. */}
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {mistakes === 0
                  ? triLang(lang, { ru: 'Все ответы верные', uk: 'Усі відповіді правильні', es: 'Todas las respuestas son correctas', 'pt-BR': 'Todas as respostas estão corretas', vi: 'Tất cả câu trả lời đều đúng', id: 'Semua jawaban benar', tr: 'Tüm cevaplar doğru', pl: 'Wszystkie odpowiedzi są poprawne' })
                  : triLang(lang, { ru: `Ошибок: ${mistakes} — нажмите задание, чтобы разобрать`, uk: `Помилок: ${mistakes} — натисніть завдання, щоб розібрати`, es: `Errores: ${mistakes} — toca una pregunta para revisarla`, 'pt-BR': `Erros: ${mistakes} — toque na pergunta para revisar`, vi: `Lỗi: ${mistakes} — nhấn vào câu hỏi để xem lại`, id: `Kesalahan: ${mistakes} — ketuk soal untuk meninjau`, tr: `Hatalar: ${mistakes} — incelemek için soruya dokun`, pl: `Błędy: ${mistakes} — dotknij zadanie, aby przejrzeć` })}
              </Text>
            </View>
            {ordered.map((item, index) => (
              <Animated.View
                key={`${item.taskId}-${index}`}
                entering={FadeIn.duration(200).delay(Math.min(index, 6) * 40)}
              >
                <ReviewCard
                  item={item}
                  number={index + 1}
                  expanded={openIndex === index}
                  onToggle={() => toggleCard(index)}
                  lang={lang}
                />
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Карточка одного вопроса ─────────────────────────────────────────────────

const ReviewCard = memo(function ReviewCard({
  item, number, expanded, onToggle, lang,
}: {
  item: ReviewItem;
  /** Номер задания в турнире — тот же, что был в игре. */
  number: number;
  expanded: boolean;
  onToggle: () => void;
  lang: Lang;
}) {
  const P = useTournamentPalette();
  const styles = useMemo(() => makeStyles(P), [P]);

  /**
   * Заголовок свёрнутой плашки. У аудио- и текстовых заданий это сама фраза; у
   * серии/пар фразы нет — там общий prompt, а если и его нет (старые комнаты),
   * честно показываем название режима вместо пустой строки.
   */
  const headline = item.phrase?.trim()
    || item.aggregatePrompt?.trim()
    || modeLabelFor(item.mode, lang);

  const isAudio = item.mode === 'listen_choose'
    || item.mode === 'sound_contrast'
    || item.mode === 'listen_build';
  const isBuild = item.mode === 'translate_build' || item.mode === 'listen_build';
  const isAggregateMode = item.mode === 'time_attack' || item.mode === 'speed_match';

  // Что игрок дал: индекс варианта или собранные слова.
  const givenIndex = typeof item.given === 'number' ? item.given
    : (item.given as { selectedIndex?: number } | null)?.selectedIndex;
  const givenTokens = Array.isArray(item.given)
    ? (item.given as string[])
    : (item.given as { tokens?: string[] } | null)?.tokens;

  return (
    <V2Card pad={18} style={styles.card}>
      {/* Свёрнутая плашка: номер задания, фраза и итог. Вся строка — цель
          нажатия, а не маленькая стрелка: попасть пальцем должно быть легко.
          зачем 2026-08-04 (владелец: «напротив каждого задания флажок чтобы
          пожаловаться на конкретное»): флажок — ОТДЕЛЬНЫЙ сосед справа от
          TapScale (не внутри неё), иначе тап по флажку разворачивал/сворачивал
          бы всю карточку вместо открытия своей модалки — два независимых
          жеста на одной строке требуют разных touch-таргетов. */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TapScale
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={triLang(lang, {
            ru: `Задание ${number}. ${headline}. ${item.correct ? 'Верно' : 'Ошибка'}`,
            uk: `Завдання ${number}. ${headline}. ${item.correct ? 'Правильно' : 'Помилка'}`,
            es: `Pregunta ${number}. ${headline}. ${item.correct ? 'Correcto' : 'Incorrecto'}`,
            'pt-BR': `Pergunta ${number}. ${headline}. ${item.correct ? 'Correto' : 'Incorreto'}`,
            vi: `Câu ${number}. ${headline}. ${item.correct ? 'Đúng' : 'Sai'}`,
            id: `Soal ${number}. ${headline}. ${item.correct ? 'Benar' : 'Salah'}`,
            tr: `Soru ${number}. ${headline}. ${item.correct ? 'Doğru' : 'Yanlış'}`,
            pl: `Zadanie ${number}. ${headline}. ${item.correct ? 'Poprawnie' : 'Błąd'}`,
        })}
        accessibilityHint={expanded
            ? triLang(lang, { ru: 'Свернуть задание', uk: 'Згорнути завдання', es: 'Contraer la pregunta', 'pt-BR': 'Recolher a pergunta', vi: 'Thu gọn câu hỏi', id: 'Ciutkan soal', tr: 'Soruyu daralt', pl: 'Zwiń zadanie' })
            : triLang(lang, { ru: 'Развернуть задание', uk: 'Розгорнути завдання', es: 'Expandir la pregunta', 'pt-BR': 'Expandir a pergunta', vi: 'Mở rộng câu hỏi', id: 'Perluas soal', tr: 'Soruyu genişlet', pl: 'Rozwiń zadanie' })}
        style={[styles.cardTop, { flex: 1 }]}
      >
        <Text style={styles.cardNumber}>{number}</Text>
        <FlowText testID="review-card-headline" provenance="external" style={styles.cardHeadline}>
          {headline}
        </FlowText>
        <View style={[styles.verdict, { backgroundColor: item.correct ? P.accentSoft : P.dangerSoft }]}>
          <Ionicons
            name={item.correct ? 'checkmark' : 'close'}
            size={14}
            color={item.correct ? P.accent : P.danger}
          />
          <Text style={[styles.verdictText, { color: item.correct ? P.accent : P.danger }]}>
            {item.correct
                ? triLang(lang, { ru: 'верно', uk: 'правильно', es: 'correcto', 'pt-BR': 'correto', vi: 'đúng', id: 'benar', tr: 'doğru', pl: 'poprawnie' })
                : item.timedOut
                  ? triLang(lang, { ru: 'Не успел', uk: 'Не встиг', es: 'Se acabó el tiempo', 'pt-BR': 'O tempo acabou', vi: 'Hết giờ', id: 'Waktu habis', tr: 'Süre doldu', pl: 'Nie zdążono' })
                  : triLang(lang, { ru: 'мимо', uk: 'повз', es: 'incorrecto', 'pt-BR': 'incorreto', vi: 'sai', id: 'salah', tr: 'yanlış', pl: 'błąd' })}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={P.ghost}
        />
      </TapScale>
      <ReportErrorButton
        testID={`tournament-review-flag-${item.taskId}`}
        variant="icon-flag"
        screen="tournament_review"
        dataId={`tournament_task_${item.taskId}`}
        dataText={headline}
        userAnswer={givenTokens && givenTokens.length > 0 ? givenTokens.join(' ') : undefined}
        style={{ marginLeft: 4 }}
      />
      </View>

      {!expanded ? null : (
        <>
      {/* Режим виден только внутри: в свёрнутом виде его место занимает фраза,
          ради которой плашку и открывают. */}
      <FlowText testID="review-mode-label" provenance="authored" style={styles.mode}>
        {modeLabelFor(item.mode, lang)}
      </FlowText>

      {item.speedMatchPairs ? (
        <SpeedMatchReviewPairs pairs={item.speedMatchPairs} styles={styles} P={P} lang={lang} />
      ) : item.aggregateItems ? (
        <>
          {item.aggregatePrompt ? <Text style={styles.phrase}>{item.aggregatePrompt}</Text> : null}
          <AggregateReviewRows parts={item.aggregateItems} styles={styles} P={P} lang={lang} />
        </>
      ) : isAggregateMode ? (
        <Text style={styles.skipped}>{triLang(lang, { ru: 'Детали серии не сохранены для этого турнира.', uk: 'Деталі серії не збережені для цього турніру.', es: 'Los detalles de la serie no se guardaron para este torneo.', 'pt-BR': 'Os detalhes da série não foram salvos para este torneio.', vi: 'Chi tiết chuỗi không được lưu cho giải đấu này.', id: 'Detail rentetan tidak disimpan untuk turnamen ini.', tr: 'Bu turnuva için seri detayları kaydedilmedi.', pl: 'Szczegóły serii nie zostały zapisane dla tego turnieju.' })}</Text>
      ) : (
        <>
      {/* В аудио-задании после турнира текст УЖЕ можно показать — игра
          окончена, и разбор без фразы бесполезен. Плюс кнопка переслушать. */}
      {isAudio ? (
        <View style={styles.audioRow}>
          <TournamentAudioButton audioUri={item.audioUri} autoPlay={false} size={56} />
          <Text style={styles.phrase}>{item.phrase}</Text>
        </View>
      ) : (
        <Text style={styles.phrase}>{item.phrase}</Text>
      )}

      {isBuild ? (
        <View style={styles.answers}>
          {givenTokens && givenTokens.length > 0 ? (
            <AnswerRow
              label={triLang(lang, { ru: 'Вы собрали', uk: 'Ви зібрали', es: 'Armaste', 'pt-BR': 'Você montou', vi: 'Bạn đã ghép', id: 'Anda menyusun', tr: 'Oluşturduğun', pl: 'Ułożyłeś' })}
              value={givenTokens.join(' ')}
              tone={item.correct ? 'ok' : 'bad'}
              styles={styles}
              P={P}
            />
          ) : (
            <AnswerRow
              label={triLang(lang, { ru: 'Вы собрали', uk: 'Ви зібрали', es: 'Armaste', 'pt-BR': 'Você montou', vi: 'Bạn đã ghép', id: 'Anda menyusun', tr: 'Oluşturduğun', pl: 'Ułożyłeś' })}
              value={triLang(lang, { ru: '— не успели', uk: '— не встигли', es: '— no llegaste a tiempo', 'pt-BR': '— não deu tempo', vi: '— không kịp', id: '— tidak sempat', tr: '— yetişemedin', pl: '— nie zdążyłeś' })}
              tone="muted"
              styles={styles}
              P={P}
            />
          )}
          {!item.correct && item.correctTokens.length > 0 ? (
            <AnswerRow
              label={triLang(lang, { ru: 'Правильно', uk: 'Правильно', es: 'Correcto', 'pt-BR': 'Correto', vi: 'Đúng', id: 'Benar', tr: 'Doğru', pl: 'Poprawnie' })}
              value={item.correctTokens.join(' ')}
              tone="ok"
              styles={styles}
              P={P}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.answers}>
          {item.options.map((option, index) => {
            const isCorrect = index === item.correctIndex;
            const isGiven = index === givenIndex;
            // Показываем ВСЕ варианты: видно не только верный, но и куда
            // именно увела ловушка — ради этого разбор и открывают.
            const tone = isCorrect ? 'ok' : isGiven ? 'bad' : 'muted';
            return (
              <AnswerRow
                key={`${option}-${index}`}
                label={isGiven
                    ? triLang(lang, { ru: 'Ваш ответ', uk: 'Ваша відповідь', es: 'Tu respuesta', 'pt-BR': 'Sua resposta', vi: 'Câu trả lời của bạn', id: 'Jawabanmu', tr: 'Cevabın', pl: 'Twoja odpowiedź' })
                    : isCorrect
                      ? triLang(lang, { ru: 'Правильно', uk: 'Правильно', es: 'Correcto', 'pt-BR': 'Correto', vi: 'Đúng', id: 'Benar', tr: 'Doğru', pl: 'Poprawnie' })
                      : ''}
                value={option}
                tone={tone}
                styles={styles}
                P={P}
              />
            );
          })}
          {givenIndex === undefined || givenIndex === null || givenIndex < 0 ? (
            <Text style={styles.skipped}>{triLang(lang, { ru: 'Ответа не было — время вышло', uk: 'Відповіді не було — час вийшов', es: 'No hubo respuesta: se acabó el tiempo', 'pt-BR': 'Não houve resposta: o tempo acabou', vi: 'Không có câu trả lời — hết giờ', id: 'Tidak ada jawaban — waktu habis', tr: 'Cevap verilmedi — süre doldu', pl: 'Nie było odpowiedzi — czas minął' })}</Text>
          ) : null}
        </View>
      )}
        </>
      )}

      {/* зачем 2026-08-03: раньше пояснение пряталось за вторым «Почему это
          верно» — аккордеон внутри аккордеона. Плашку уже открыли осознанно,
          прятать от неё разбор второй раз бессмысленно: показываем сразу. */}
      {item.explanation ? (
        <View style={styles.explanation}>
          <Text style={styles.explanationTitle}>{triLang(lang, { ru: 'Разбор', uk: 'Розбір', es: 'Explicación', 'pt-BR': 'Explicação', vi: 'Giải thích', id: 'Penjelasan', tr: 'Açıklama', pl: 'Wyjaśnienie' })}</Text>
          <Text style={styles.explanationText}>{item.explanation.ruleNote}</Text>
          <Text style={styles.exampleText}>{item.explanation.example}</Text>
          {!item.correct && typeof givenIndex === 'number'
            && item.explanation.wrongOptionReasons?.[givenIndex] ? (
              <Text style={styles.trapText}>{item.explanation.wrongOptionReasons[givenIndex]}</Text>
            ) : null}
        </View>
      ) : null}
        </>
      )}
    </V2Card>
  );
});

const AggregateReviewRows = memo(function AggregateReviewRows({
  parts, styles, P, lang,
}: {
  parts: AggregateReviewItem[];
  styles: ReturnType<typeof makeStyles>;
  P: TournamentV2;
  lang: Lang;
}) {
  const noAnswer = triLang(lang, { ru: '— нет ответа', uk: '— немає відповіді', es: '— sin respuesta', 'pt-BR': '— sem resposta', vi: '— không có câu trả lời', id: '— tidak ada jawaban', tr: '— cevap yok', pl: '— brak odpowiedzi' });
  return (
    <View style={styles.aggregateRows}>
      {parts.map((part, index) => {
        const selectedValue = part.selectedIndex === null ? noAnswer : part.options[part.selectedIndex] ?? noAnswer;
        const correctValue = part.correctIndex === null ? null : part.options[part.correctIndex] ?? null;
        const tone = part.selectedIndex === null ? 'muted' : part.correct ? 'ok' : 'bad';
        return (
          <View key={`${part.prompt}-${index}`} style={styles.aggregatePart}>
            <Text style={styles.aggregatePrompt}>{part.prompt || triLang(lang, { ru: `Часть ${index + 1}`, uk: `Частина ${index + 1}`, es: `Parte ${index + 1}`, 'pt-BR': `Parte ${index + 1}`, vi: `Phần ${index + 1}`, id: `Bagian ${index + 1}`, tr: `Bölüm ${index + 1}`, pl: `Część ${index + 1}` })}</Text>
            <AnswerRow
              label={part.selectedIndex === null
                  ? triLang(lang, { ru: 'Пропущено', uk: 'Пропущено', es: 'Omitido', 'pt-BR': 'Ignorado', vi: 'Đã bỏ qua', id: 'Dilewati', tr: 'Atlandı', pl: 'Pominięto' })
                  : part.correct
                    ? triLang(lang, { ru: 'Верно', uk: 'Правильно', es: 'Correcto', 'pt-BR': 'Correto', vi: 'Đúng', id: 'Benar', tr: 'Doğru', pl: 'Poprawnie' })
                    : triLang(lang, { ru: 'Ошибка', uk: 'Помилка', es: 'Error', 'pt-BR': 'Erro', vi: 'Sai', id: 'Salah', tr: 'Hata', pl: 'Błąd' })}
              value={selectedValue}
              tone={tone}
              styles={styles}
              P={P}
            />
            {!part.correct && correctValue ? (
              <AnswerRow label={triLang(lang, { ru: 'Правильно', uk: 'Правильно', es: 'Correcto', 'pt-BR': 'Correto', vi: 'Đúng', id: 'Benar', tr: 'Doğru', pl: 'Poprawnie' })} value={correctValue} tone="ok" styles={styles} P={P} />
            ) : null}
            {part.explanation ? (
              <View style={styles.partExplanation}>
                {part.explanation.ruleNote ? <Text style={styles.explanationText}>{part.explanation.ruleNote}</Text> : null}
                {part.explanation.example ? <Text style={styles.exampleText}>{part.explanation.example}</Text> : null}
                {!part.correct && part.selectedIndex !== null
                  && part.explanation.wrongOptionReasons?.[part.selectedIndex] ? (
                    <Text style={styles.trapText}>{part.explanation.wrongOptionReasons[part.selectedIndex]}</Text>
                  ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
});

const SpeedMatchReviewPairs = memo(function SpeedMatchReviewPairs({
  pairs, styles, P, lang,
}: {
  pairs: SpeedMatchReviewPair[];
  styles: ReturnType<typeof makeStyles>;
  P: TournamentV2;
  lang: Lang;
}) {
  const noAnswer = triLang(lang, { ru: '— нет ответа', uk: '— немає відповіді', es: '— sin respuesta', 'pt-BR': '— sem resposta', vi: '— không có câu trả lời', id: '— tidak ada jawaban', tr: '— cevap yok', pl: '— brak odpowiedzi' });
  return (
    <View style={styles.aggregateRows}>
      {pairs.map((pair, index) => (
        <View key={`${pair.english}-${index}`} style={styles.aggregatePart}>
          <Text style={styles.aggregatePrompt}>{pair.english || triLang(lang, { ru: `Пара ${index + 1}`, uk: `Пара ${index + 1}`, es: `Par ${index + 1}`, 'pt-BR': `Par ${index + 1}`, vi: `Cặp ${index + 1}`, id: `Pasangan ${index + 1}`, tr: `Çift ${index + 1}`, pl: `Para ${index + 1}` })}</Text>
          <AnswerRow
            label={pair.selectedRussian === null
                ? triLang(lang, { ru: 'Пропущено', uk: 'Пропущено', es: 'Omitido', 'pt-BR': 'Ignorado', vi: 'Đã bỏ qua', id: 'Dilewati', tr: 'Atlandı', pl: 'Pominięto' })
                : pair.correct
                  ? triLang(lang, { ru: 'Ваш ответ', uk: 'Ваша відповідь', es: 'Tu respuesta', 'pt-BR': 'Sua resposta', vi: 'Câu trả lời của bạn', id: 'Jawabanmu', tr: 'Cevabın', pl: 'Twoja odpowiedź' })
                  : triLang(lang, { ru: 'Ваш ответ — ошибка', uk: 'Ваша відповідь — помилка', es: 'Tu respuesta: incorrecta', 'pt-BR': 'Sua resposta: incorreta', vi: 'Câu trả lời của bạn — sai', id: 'Jawabanmu — salah', tr: 'Cevabın — hatalı', pl: 'Twoja odpowiedź — błędna' })}
            value={pair.selectedRussian ?? noAnswer}
            tone={pair.selectedRussian === null ? 'muted' : pair.correct ? 'ok' : 'bad'}
            styles={styles}
            P={P}
          />
          {!pair.correct ? (
            <AnswerRow label={triLang(lang, { ru: 'Правильная пара', uk: 'Правильна пара', es: 'Par correcto', 'pt-BR': 'Par correto', vi: 'Cặp đúng', id: 'Pasangan yang benar', tr: 'Doğru çift', pl: 'Poprawna para' })} value={pair.correctRussian} tone="ok" styles={styles} P={P} />
          ) : null}
          {pair.explanation ? (
            <View style={styles.partExplanation}>
              <Text style={styles.explanationText}>{pair.explanation.ruleNote}</Text>
              <Text style={styles.exampleText}>{pair.explanation.example}</Text>
              {!pair.correct && pair.selectedTrapReason
                ? <Text style={styles.trapText}>{pair.selectedTrapReason}</Text>
                : null}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
});

const AnswerRow = memo(function AnswerRow({
  label, value, tone, styles, P,
}: {
  label: string;
  value: string;
  tone: 'ok' | 'bad' | 'muted';
  styles: ReturnType<typeof makeStyles>;
  P: TournamentV2;
}) {
  const color = tone === 'ok' ? P.accent : tone === 'bad' ? P.danger : P.muted;
  const background = tone === 'ok' ? P.accentSoft : tone === 'bad' ? P.dangerSoft : 'transparent';
  return (
    <View style={[styles.answerRow, { backgroundColor: background }]}>
      <Text style={[styles.answerValue, { color: tone === 'muted' ? P.muted : P.text }]}>
        {value}
      </Text>
      {label ? (
        <FlowText testID="review-answer-label" provenance="authored" style={[styles.answerLabel, { color }]}>{label}</FlowText>
      ) : null}
    </View>
  );
});

const makeStyles = (P: TournamentV2) => StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  content: { paddingHorizontal: 16, gap: 12 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.3, color: P.text },
  headerRight: { marginLeft: 'auto' },

  summary: { paddingHorizontal: 4, paddingBottom: 2 },
  summaryText: { fontSize: 14, fontWeight: '700', color: P.muted },

  card: { gap: 12 },
  // Свёрнутая плашка: минимум 48 — комфортная цель нажатия по всей ширине.
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  cardNumber: {
    minWidth: 20,
    fontSize: 14,
    fontWeight: '900',
    color: P.ghost,
    fontVariant: ['tabular-nums'],
  },
  cardHeadline: { flex: 1, fontSize: 16, fontWeight: '800', color: P.text, lineHeight: 21 },
  mode: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: P.ghost,
  },
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  verdictText: { fontSize: 12.5, fontWeight: '800' },

  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  phrase: { flex: 1, fontSize: 18, fontWeight: '800', color: P.text, lineHeight: 24 },

  answers: { gap: 6 },
  aggregateRows: { gap: 12 },
  aggregatePart: { gap: 6, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: P.muted },
  aggregatePrompt: { color: P.text, fontSize: 15, fontWeight: '800', lineHeight: 20 },
  partExplanation: { gap: 3, paddingHorizontal: 4, paddingTop: 2 },
  explanation: { gap: 6, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: P.muted },
  explanationTitle: { color: P.text, fontSize: 14, fontWeight: '900' },
  explanationText: { color: P.text, fontSize: 14, lineHeight: 20 },
  exampleText: { color: P.muted, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  trapText: { color: P.danger, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.sm + 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  answerValue: { flex: 1, fontSize: 15, fontWeight: '700' },
  answerLabel: { fontSize: 12, fontWeight: '800' },
  skipped: { fontSize: 13, fontWeight: '700', color: P.ghost, paddingHorizontal: 4, paddingTop: 2 },

  skeletonList: { gap: 12 },
  skeletonCard: { height: 168, borderRadius: radius.lg - 2, backgroundColor: P.card, opacity: 0.5 },

  emptyTitle: { fontSize: 19, fontWeight: '900', color: P.text },
  emptyText: { fontSize: 14, fontWeight: '700', color: P.muted, marginTop: 6, lineHeight: 20 },
  emptyAction: { marginTop: 16 },
});
