import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer } from 'expo-audio';
import { useManagedSpokenAudioPlayer } from '../hooks/use_managed_spoken_audio_player';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassRim } from '../components/mistakes-panel/GlassRim';
import { useScaledTextStyles } from '../hooks/useLineScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useLv2Glass, type Lv2Glass } from '../components/learning-v2/LearningV2Glass';
import { BackButton, glassButtonFill, Panel, PanelCta, PanelDock, SheetRow } from '../components/mistakes-panel/PanelKit';
import { PanelSheet } from '../components/mistakes-panel/PanelSheet';
import { mpColors, mixDark, themePair } from '../components/mistakes-panel/panelPaint';
import { LinearGradient } from '../components/SafeLinearGradient';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useMistakePracticeStartGate } from '../hooks/useMistakePracticeStartGate';
import { mistakeSourceLabel } from './mistake_facet_copy';
import { mistakeFacetExplanation } from './mistake_facet_explanations';
import { loadMistakeDetail, type MistakeDetail, type MistakeTimelineEntry } from './mistake_detail_model';
import { hideMistake, type MistakeHideReason } from './mistake_hide';
import { markMistakeHiddenLocally, unmarkMistakeHiddenLocally } from './mistake_local_hidden';
import { peekMistakeDetailDraft } from './mistake_detail_draft';
import { normalizeMistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { trackMistakePracticeEvent } from './mistake_practice_analytics';
import { actionToastTri, emitAppEvent } from './events';
import { safeRouterBack } from './navigation_back';
import ReportErrorButton, { REPORT_ERROR_ENABLED } from '../components/ReportErrorButton';
import { getStableId } from './stable_id';

/**
 * Карточка одной ошибки — «Ошибка», «Ошибка — шаги и история», «Меню ошибки» (макет docs/design/v2-app/mistakes-panel.html, вариант Б «Панель»).
 *
 * зачем (владелец: «1 в 1, без малейших потерь»): цветная шапка с фразой, переводом и тремя числами (ошибки · исправление · последняя), панель
 * «Ваш ответ / Правильно», затем либо «Почему это ошибка» (отработок ещё не было), либо шаги исправления и история; кнопка «Отработать»
 * запускает отработку ТОЛЬКО этой ошибки (focusMistakeId). Меню «⋯»: «Я это знаю» и «Удалить из ошибок» скрывают ошибку (событие 'hidden',
 * можно вернуть), «Сообщить о неточности» открывает ту же форму жалобы, что и на экране задания (ReportErrorButton).
 */

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { back: 'Назад', listen: 'Послушать', menu: 'Меню', toFix: 'исправление', errors: 'ошибки', last: 'последняя', yours: 'Твой ответ', right: 'Правильно', why: 'Почему это ошибка', fixing: 'Исправление', of: 'из', practise: 'Отработать', notReady: 'Вернёмся к ней позже', captured: 'Ошибся', rightOk: 'Верно', rightSelf: 'Верно, сам', wrong: 'Промах', hidden: 'Скрыта', restored: 'Возвращена', done: 'Исправлено навсегда', noData: 'Эта ошибка больше не отслеживается', know: 'Я это знаю', report: 'Сообщить о неточности', remove: 'Удалить из ошибок', hideFailed: 'Не удалось убрать ошибку. Попробуй ещё раз.' },
  uk: { back: 'Назад', listen: 'Послухати', menu: 'Меню', toFix: 'виправлення', errors: 'помилки', last: 'остання', yours: 'Твоя відповідь', right: 'Правильно', why: 'Чому це помилка', fixing: 'Виправлення', of: 'з', practise: 'Відпрацювати', notReady: 'Повернемося до неї пізніше', captured: 'Помилився', rightOk: 'Правильно', rightSelf: 'Правильно, сам', wrong: 'Промах', hidden: 'Прихована', restored: 'Повернена', done: 'Виправлено назавжди', noData: 'Ця помилка більше не відстежується', know: 'Я це знаю', report: 'Повідомити про неточність', remove: 'Видалити з помилок', hideFailed: 'Не вдалося прибрати помилку. Спробуй ще раз.' },
  en: { back: 'Back', listen: 'Listen', menu: 'Menu', toFix: 'to fix', errors: 'mistakes', last: 'last', yours: 'Your answer', right: 'Correct', why: 'Why it is a mistake', fixing: 'Fixing', of: 'of', practise: 'Practice', notReady: "We'll come back to it later", captured: 'Got it wrong', rightOk: 'Correct', rightSelf: 'Correct, on your own', wrong: 'Miss', hidden: 'Hidden', restored: 'Restored', done: 'Fixed for good', noData: 'This mistake is no longer tracked', know: 'I know this', report: 'Report an inaccuracy', remove: 'Remove from mistakes', hideFailed: 'Could not remove the mistake. Please try again.' },
  es: { back: 'Atrás', listen: 'Escuchar', menu: 'Menú', toFix: 'corrección', errors: 'errores', last: 'último', yours: 'Tu respuesta', right: 'Correcto', why: 'Por qué es un error', fixing: 'Corrección', of: 'de', practise: 'Practicar', notReady: 'Volveremos a él más tarde', captured: 'Te equivocaste', rightOk: 'Correcto', rightSelf: 'Correcto, solo', wrong: 'Fallo', hidden: 'Oculto', restored: 'Restaurado', done: 'Corregido para siempre', noData: 'Este error ya no se sigue', know: 'Ya lo sé', report: 'Informar de una inexactitud', remove: 'Quitar de errores', hideFailed: 'No se pudo quitar el error. Inténtalo de nuevo.' },
  'pt-BR': { back: 'Voltar', listen: 'Ouvir', menu: 'Menu', toFix: 'correção', errors: 'erros', last: 'último', yours: 'Sua resposta', right: 'Correto', why: 'Por que é um erro', fixing: 'Correção', of: 'de', practise: 'Praticar', notReady: 'Voltamos a ele mais tarde', captured: 'Você errou', rightOk: 'Correto', rightSelf: 'Correto, sozinho', wrong: 'Erro', hidden: 'Oculto', restored: 'Restaurado', done: 'Corrigido para sempre', noData: 'Este erro não é mais acompanhado', know: 'Eu já sei', report: 'Relatar imprecisão', remove: 'Remover dos erros', hideFailed: 'Não foi possível remover o erro. Tente de novo.' },
  vi: { back: 'Quay lại', listen: 'Nghe', menu: 'Menu', toFix: 'sửa', errors: 'lỗi', last: 'gần nhất', yours: 'Câu của bạn', right: 'Đúng', why: 'Vì sao đây là lỗi', fixing: 'Sửa lỗi', of: 'trên', practise: 'Luyện', notReady: 'Ta sẽ quay lại sau', captured: 'Bạn đã sai', rightOk: 'Đúng', rightSelf: 'Đúng, tự làm', wrong: 'Sai', hidden: 'Đã ẩn', restored: 'Đã khôi phục', done: 'Đã sửa hẳn', noData: 'Lỗi này không còn được theo dõi', know: 'Tôi biết rồi', report: 'Báo điều chưa chính xác', remove: 'Xóa khỏi lỗi', hideFailed: 'Không xóa được lỗi. Hãy thử lại.' },
  id: { back: 'Kembali', listen: 'Dengar', menu: 'Menu', toFix: 'perbaikan', errors: 'kesalahan', last: 'terakhir', yours: 'Jawabanmu', right: 'Benar', why: 'Mengapa ini salah', fixing: 'Perbaikan', of: 'dari', practise: 'Latih', notReady: 'Kita kembali lagi nanti', captured: 'Kamu salah', rightOk: 'Benar', rightSelf: 'Benar, sendiri', wrong: 'Salah', hidden: 'Disembunyikan', restored: 'Dikembalikan', done: 'Diperbaiki selamanya', noData: 'Kesalahan ini tidak lagi dilacak', know: 'Aku sudah tahu', report: 'Laporkan ketidakakuratan', remove: 'Hapus dari kesalahan', hideFailed: 'Gagal menghapus kesalahan. Coba lagi.' },
  tr: { back: 'Geri', listen: 'Dinle', menu: 'Menü', toFix: 'düzeltme', errors: 'hata', last: 'son', yours: 'Cevabın', right: 'Doğru', why: 'Neden hata', fixing: 'Düzeltme', of: '/', practise: 'Çalış', notReady: 'Buna sonra döneriz', captured: 'Yanlış yaptın', rightOk: 'Doğru', rightSelf: 'Doğru, kendin', wrong: 'Hata', hidden: 'Gizlendi', restored: 'Geri alındı', done: 'Kalıcı olarak düzeltildi', noData: 'Bu hata artık takip edilmiyor', know: 'Bunu biliyorum', report: 'Yanlışlığı bildir', remove: 'Hatalardan kaldır', hideFailed: 'Hata kaldırılamadı. Tekrar dene.' },
  pl: { back: 'Wstecz', listen: 'Posłuchaj', menu: 'Menu', toFix: 'poprawa', errors: 'błędy', last: 'ostatni', yours: 'Twoja odpowiedź', right: 'Dobrze', why: 'Dlaczego to błąd', fixing: 'Poprawa', of: 'z', practise: 'Przećwicz', notReady: 'Wrócimy do niego później', captured: 'Pomyłka', rightOk: 'Dobrze', rightSelf: 'Dobrze, samodzielnie', wrong: 'Pomyłka', hidden: 'Ukryty', restored: 'Przywrócony', done: 'Poprawione na zawsze', noData: 'Ten błąd nie jest już śledzony', know: 'Już to znam', report: 'Zgłoś nieścisłość', remove: 'Usuń z błędów', hideFailed: 'Nie udało się usunąć błędu. Spróbuj ponownie.' },
});

function ListenRound({ g, audioRef, label }: Readonly<{ g: Lv2Glass; audioRef: string; label: string }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const player = useAudioPlayer({ uri: audioRef });
  // зачем (аудит карты владения звуком, 2026-09-15): плеер играл МИМО общего владения аудиотрактом — не глушился записью микрофона, не уважал
  // тумблер голоса в настройках и не уступал звук другому экрану. Управляемый плеер вводит его в ту же границу владения, что и вся озвучка.
  const managedPlayer = useManagedSpokenAudioPlayer(player);
  return (
    <Pressable
      testID="mistake-detail-listen"
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => { hapticTap(); void managedPlayer.playFromStart(); }}
      style={({ pressed }) => [styles.listen, { backgroundColor: g.hairlineSoft }, pressed && styles.pressed]}>
      <Ionicons name="volume-high" size={18} color={g.text} />
    </Pressable>
  );
}

function AnswerRow({ g, label, value, color, strike, right, first }: Readonly<{ g: Lv2Glass; label: string; value: string; color: string; strike?: boolean; right?: React.ReactNode; first?: boolean }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <View style={styles.answerRow}>
      {first ? null : <View pointerEvents="none" style={[styles.histLine, { backgroundColor: g.hairlineSoft }]} />}
      <Text style={[styles.answerLabel, { color: g.secondary }]}>{label}</Text>
      <Text style={[styles.answerValue, { color }, strike && styles.strike]}>{value}</Text>
      {right}
    </View>
  );
}

export default function MistakeDetailScreen() {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ mistakeId?: string }>();
  const g = useLv2Glass();
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const copy = useMemo(() => copyFor(lang), [lang]);
  // зачем (22.09): подмена испанского/немецкого на английский — карточка ошибки открывалась из чужого журнала. Язык журнала подменять нельзя.
  const target = normalizeMistakeStudyTarget(studyTarget);
  const mistakeId = typeof params.mistakeId === 'string' ? params.mistakeId : '';
  const [detail, setDetail] = useState<MistakeDetail | null | 'missing'>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const gate = useMistakePracticeStartGate('mistakes_hub_start');
  const openingRef = useRef(false);
  const hidingRef = useRef(false);
  // зачем (решение владельца 04.10): «Сообщить о неточности» в меню открывает ту же форму жалобы, что и на экране задания.
  const reportOpenRef = useRef<(() => void) | null>(null);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    openingRef.current = false;
    if (!mistakeId) { setDetail('missing'); return () => { cancelled = true; }; }
    void (async () => {
      const accountScope = await getStableId();
      const next = await loadMistakeDetail({ accountScope, studyTarget: target, mistakeId });
      if (!cancelled) setDetail(next ?? 'missing');
    })().catch((error: unknown) => {
      console.warn('[MISTAKES-HUB] detail:catch', error instanceof Error ? error.message : String(error)); // guard-ok: лог в катче обязателен
      if (!cancelled) setDetail('missing');
    });
    return () => { cancelled = true; };
  }, [mistakeId, target]));

  const practise = useCallback(() => {
    if (openingRef.current || detail === null || detail === 'missing' || !detail.ready) {
      // зачем (аудит Optimistic UI Уроков, 13.10): «Отработать» молча не срабатывала — теперь причина в журнале
      console.log('[MISTAKE-DETAIL] practise:ignored', JSON.stringify({ opening: openingRef.current, detail: detail === null ? 'null' : detail === 'missing' ? 'missing' : (detail.ready ? 'ready' : 'not_ready') })); // guard-ok: редкий ранний выход
      return;
    }
    hapticTap();
    if (!gate.tryStartSession(1)) return; // одна ошибка — бесплатно, энергию не проверяем
    openingRef.current = true;
    trackMistakePracticeEvent('mistake_practice_setup_started', {
      study_target: target, entry_source: 'mistake_detail', requested_length: '1', ready_count: 1, session_count: 1, costs_energy: false,
    });
    router.push({ pathname: '/mistake_practice_session', params: { focusMistakeId: detail.mistakeId } } as never);
  }, [detail, gate, router, target]);

  // зачем (координатор 05.10, «Правильно — переводом»: направление задания, по правилу «сперва логи»): что именно показано на детали ошибки.
  // phraseScript/meaningScript — алфавит (latin|cyrillic|other), чтобы по логу видно направление: строка «Правильно» = фраза или перевод.
  useEffect(() => {
    if (detail === null || detail === 'missing') return;
    const script = (value: string | null | undefined): string => {
      if (!value) return 'none';
      if (/[Ѐ-ӿ]/.test(value)) return 'cyrillic';
      if (/[A-Za-z]/.test(value)) return 'latin';
      return 'other';
    };
    console.log('[MISTAKE-DETAIL] direction', JSON.stringify({
      mistakeId: detail.mistakeId.slice(-8),
      facet: detail.facet,
      sourceGroup: detail.sourceGroup,
      status: detail.status,
      correctRowShows: 'phrase',
      phraseScript: script(detail.phrase),
      meaningScript: script(detail.meaning),
      givenScript: script(detail.given),
      hasGiven: detail.given !== null,
      hasMeaning: detail.meaning !== null,
      hasPractice: detail.hasPractice,
      // зачем (Дизайн 05.10, 007/017: нет «послушать», шаги исправления «не засчитаны»): от чего зависят кнопка и шаги.
      hasAudio: detail.audioRef !== null,
      qualifyingDays: detail.qualifyingDays,
      timelineKinds: detail.timeline.reduce<Record<string, number>>((acc, entry) => ({ ...acc, [entry.kind]: (acc[entry.kind] ?? 0) + 1 }), {}),
      shows: detail.hasPractice ? 'steps_and_history' : 'why',
    }));
  }, [detail]);

  const goBack = useCallback(() => safeRouterBack(router, '/mistakes_list' as never), [router]);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // зачем (Optimistic UI): шторка закрывается и экран уходит назад сразу, запись события идёт фоном; при отказе — понятное сообщение.
  const hide = useCallback((reason: MistakeHideReason) => {
    if (hidingRef.current || detail === null || detail === 'missing') return;
    hidingRef.current = true;
    hapticTap();
    setMenuOpen(false);
    trackMistakePracticeEvent('mistake_practice_hidden', { study_target: target, reason });
    // зачем (аудит Optimistic UI п.2): список после «назад» не показывает скрытую ни на кадр — пометка до записи журнала.
    markMistakeHiddenLocally(detail.mistakeId);
    goBack();
    void (async () => {
      const accountScope = await getStableId();
      const result = await hideMistake({ accountScope, studyTarget: target, mistakeId: detail.mistakeId, reason });
      if (!result.ok && result.reason === 'write_failed') {
        unmarkMistakeHiddenLocally(detail.mistakeId);
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: copy.hideFailed, uk: copyFor('uk').hideFailed, en: copyFor('en').hideFailed, es: copyFor('es').hideFailed,
          'pt-BR': copyFor('pt-BR').hideFailed, vi: copyFor('vi').hideFailed, id: copyFor('id').hideFailed, tr: copyFor('tr').hideFailed, pl: copyFor('pl').hideFailed,
        }));
      }
    })().finally(() => { hidingRef.current = false; });
  }, [copy.hideFailed, detail, goBack, target]);

  const loaded = detail !== null && detail !== 'missing';
  // зачем (аудит Optimistic UI п.3): пока журнал читается — шапка из черновика строки списка, а не пустой экран с «‹».
  const draft = useMemo(() => peekMistakeDetailDraft(mistakeId), [mistakeId]);
  const shown = loaded ? detail : detail === null ? draft : null;
  const dateOf = (atMs: number) => new Date(atMs).toLocaleDateString(lang === 'en' ? 'en-GB' : lang, { day: 'numeric', month: 'short' });
  const [accentA, accentB] = themePair(g);
  const labelOf = (event: MistakeTimelineEntry): string => {
    if (event.kind === 'captured') return event.sourceGroup ? mistakeSourceLabel(lang, event.sourceGroup) : copy.captured;
    if (event.kind === 'practice_right') return event.independent ? copy.rightSelf : copy.rightOk;
    if (event.kind === 'practice_wrong') return copy.wrong;
    if (event.kind === 'corrected') return copy.done;
    return event.kind === 'hidden' ? copy.hidden : copy.restored;
  };

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} decelerationRate="fast">
          {!shown ? (
            <View style={[styles.plain, { paddingTop: insets.top + 8 }]}>
              <View style={styles.topbar}><BackButton g={g} label={copy.back} onPress={goBack} /></View>
              {detail === 'missing' ? <Text style={[styles.missing, { color: g.secondary }]}>{copy.noData}</Text> : null}
            </View>
          ) : (
            <>
              <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
                <LinearGradient
                  pointerEvents="none"
                  colors={[mixDark(accentA, g.deepBase, 0.55), mixDark(accentB, g.deepBaseAlt, 0.38)]}
                  start={{ x: 0.42, y: 0.01 }}
                  end={{ x: 0.58, y: 0.99 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.heroBar}>
                  <BackButton g={g} label={copy.back} onPress={goBack} />
                  {loaded && detail.status === 'active' ? (
                    <Pressable testID="mistake-detail-menu" accessibilityRole="button" accessibilityLabel={copy.menu} hitSlop={8} onPress={() => { hapticTap(); setMenuOpen(true); }} style={({ pressed }) => [styles.round, { backgroundColor: glassButtonFill(g) }, pressed && styles.pressed]}>
                      <Ionicons name="ellipsis-horizontal" size={20} color={g.text} />
                      <GlassRim radius={21} />
                    </Pressable>
                  ) : <View style={styles.round} />}
                </View>
                <Text style={[styles.phrase, { color: g.text }]}>{shown.phrase}</Text>
                {shown.meaning ? <Text style={[styles.meaning, { color: `${g.text}CC` }]}>{shown.meaning}</Text> : null}
                <View style={styles.stats}>
                  <View style={styles.stat}>
                    <Text style={[styles.statNum, { color: g.text }]}>{`×${shown.captureCount}`}</Text>
                    <Text style={[styles.statLabel, { color: g.secondary }]}>{copy.errors}</Text>
                  </View>
                  <View style={[styles.stat, styles.statSep]}>
                    <Text style={[styles.statNum, { color: g.text }]}>{`${shown.status === 'corrected' ? 3 : shown.qualifyingDays}/3`}</Text>
                    <Text style={[styles.statLabel, { color: g.secondary }]}>{copy.toFix}</Text>
                  </View>
                  <View style={[styles.stat, styles.statSep]}>
                    <Text style={[styles.statNum, { color: g.text }]}>{loaded ? dateOf(detail.lastCapturedAtMs) : '—'}</Text>
                    <Text style={[styles.statLabel, { color: g.secondary }]}>{copy.last}</Text>
                  </View>
                </View>
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.heroEdge]} />
              </View>

              {loaded ? (
              <View style={styles.body}>
                <Panel g={g}>
                  {detail.given ? <AnswerRow g={g} first label={copy.yours} value={detail.given} color={mpColors(g).badText} strike /> : null}
                  <AnswerRow
                    g={g}
                    first={!detail.given}
                    label={copy.right}
                    value={detail.phrase}
                    color={mpColors(g).okText}
                    right={detail.audioRef ? <ListenRound g={g} audioRef={detail.audioRef} label={copy.listen} /> : null}
                  />
                </Panel>

                {detail.hasPractice ? (
                  <>
                    <Panel g={g} style={styles.panelGap}>
                      <View style={styles.fixHead}>
                        <Text style={[styles.fixTitle, { color: g.text }]}>{copy.fixing}</Text>
                        <Text style={[styles.fixCount, { color: g.secondary }]}>{`${detail.status === 'corrected' ? 3 : detail.qualifyingDays} ${copy.of} 3`}</Text>
                      </View>
                      <View style={styles.steps}>
                        {[0, 1, 2].map((index) => {
                          const done = index < (detail.status === 'corrected' ? 3 : detail.qualifyingDays);
                          return (
                            <React.Fragment key={`step-${index}`}>
                              {index > 0 ? <View style={[styles.stepLine, { backgroundColor: done ? g.accent : g.hairlineSoft }]} /> : null}
                              <View style={[styles.stepDot, { backgroundColor: done ? g.accent : g.glassEdge }]}>
                                {done ? <Ionicons name="checkmark" size={15} color={g.accentInk} /> : <Text style={[styles.stepNum, { color: g.secondary }]}>{index + 1}</Text>}
                              </View>
                            </React.Fragment>
                          );
                        })}
                      </View>
                    </Panel>
                    <Panel g={g} style={styles.panelGap}>
                      {detail.timeline.slice().reverse().map((event, index) => (
                        <View key={`${event.kind}-${event.atMs}-${index}`} style={styles.histRow}>
                          {index > 0 ? <View pointerEvents="none" style={styles.histLine} /> : null}
                          <Text style={[styles.histText, { color: g.text }]}>{labelOf(event)}</Text>
                          <Text style={[styles.histDate, { color: g.secondary }]}>{dateOf(event.atMs)}</Text>
                        </View>
                      ))}
                    </Panel>
                  </>
                ) : (
                  <Panel g={g} style={styles.panelGap}>
                    <Pressable testID="mistake-detail-why" accessibilityRole="button" accessibilityState={{ expanded: whyOpen }} onPress={() => {
                      hapticTap();
                      // зачем (координатор 04.10, «Почему» = общая фраза): здесь разбор ИИ не запрашивается —
                      // текст статический по типу ошибки. Лог фиксирует источник, чтобы это было видно в журнале.
                      if (!whyOpen) console.log(`[MISTAKE-EXPLAIN] detail:why_static facet=${detail.facet} ai=not_requested`); // guard-ok
                      setWhyOpen((value) => !value);
                    }} style={({ pressed }) => [styles.whyRow, pressed && styles.pressed]}>
                      <Text style={[styles.whyTitle, { color: g.text }]}>{copy.why}</Text>
                      <Ionicons name={whyOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={g.secondary} />
                    </Pressable>
                    {whyOpen ? <Text style={[styles.whyText, { color: g.text }]}>{mistakeFacetExplanation(lang, detail.facet)}</Text> : null}
                  </Panel>
                )}
              </View>
              ) : null}
            </>
          )}
        </ScrollView>
        {loaded && detail.status === 'active' ? (
          <PanelDock>
            <PanelCta g={g} testID="mistake-detail-practise" label={detail.ready ? copy.practise : copy.notReady} disabled={!detail.ready} onPress={practise} />
          </PanelDock>
        ) : null}
        {loaded ? (
          <ReportErrorButton
            hideTrigger
            openRef={reportOpenRef}
            screen="mistake_detail"
            dataId={`mistake_${detail.mistakeId}`}
            dataText={`${detail.phrase}${detail.meaning ? `
${detail.meaning}` : ''}`}
            userAnswer={detail.given ?? undefined}
          />
        ) : null}
        <PanelSheet visible={menuOpen} onClose={closeMenu} testID="mistake-detail-sheet">
          <SheetRow g={g} testID="mistake-detail-know" icon="checkmark" title={copy.know} onPress={() => hide('known')} />
          {/* решение 6 (05.10): пункт жалобы — только тестерам и разработке, как и сама форма. */}
          {REPORT_ERROR_ENABLED ? <SheetRow g={g} testID="mistake-detail-report" icon="flag-outline" title={copy.report} onPress={() => { setMenuOpen(false); reportOpenRef.current?.(); }} /> : null}
          <SheetRow g={g} testID="mistake-detail-remove" icon="trash-outline" title={copy.remove} danger onPress={() => hide('removed')} />
        </PanelSheet>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingBottom: 140 },
  pressed: { opacity: 0.82 },
  plain: { paddingHorizontal: 20 },
  topbar: { minHeight: 44, flexDirection: 'row', alignItems: 'center' },
  missing: { marginTop: 40, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  hero: { paddingHorizontal: 24, paddingBottom: 28, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' },
  heroEdge: { borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  heroBar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  phrase: { marginTop: 14, fontSize: 42, lineHeight: 46, fontWeight: '700', letterSpacing: -1 },
  meaning: { marginTop: 6, fontSize: 20, lineHeight: 24 },
  stats: { marginTop: 22, flexDirection: 'row' },
  stat: { flex: 1 },
  statSep: { paddingLeft: 16, borderLeftWidth: 0 },
  statNum: { fontSize: 26, lineHeight: 31, fontWeight: '700' },
  statLabel: { fontSize: 13, lineHeight: 17 },
  body: { paddingHorizontal: 20, paddingTop: 22 },
  panelGap: { marginTop: 12 },
  answerRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14 },
  answerLabel: { width: 90, fontSize: 16, lineHeight: 20 },
  answerValue: { flex: 1, fontSize: 20, lineHeight: 24, fontWeight: '700' },
  strike: { textDecorationLine: 'line-through' },
  histLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 1 },
  fixHead: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fixTitle: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  fixCount: { fontSize: 16, lineHeight: 20 },
  steps: { marginTop: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  stepLine: { flex: 1, height: 2 },
  histRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  histText: { flex: 1, fontSize: 16, lineHeight: 20 },
  histDate: { fontSize: 16, lineHeight: 20 },
  whyRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  whyTitle: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  whyText: { paddingBottom: 16, fontSize: 16, lineHeight: 23 },
  listen: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
