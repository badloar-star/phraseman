import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer } from 'expo-audio';
import { useManagedSpokenAudioPlayer } from '../hooks/use_managed_spoken_audio_player';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { useLv2Glass } from '../components/learning-v2/LearningV2Glass';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useMistakePracticeStartGate } from '../hooks/useMistakePracticeStartGate';
import { mistakeFacetLabel, mistakeSourceLabel } from './mistake_facet_copy';
import { loadMistakeDetail, type MistakeDetail, type MistakeTimelineEntry } from './mistake_detail_model';
import { normalizeMistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { trackMistakePracticeEvent } from './mistake_practice_analytics';
import { safeRouterBack } from './navigation_back';
import { getStableId } from './stable_id';

/**
 * Карточка одной ошибки (макет Б): фраза, тип, хроника попыток, сколько
 * осталось до «исправлено», уже побеждённые похожие фразы и отработка
 * ТОЛЬКО этой ошибки (focusMistakeId — механизм был в коде, входа не было).
 */

// зачем (§126/§130, жалоба «17 не уменьшается», 04.10): правило ухода ошибки словами человека — ровно то,
// что считает проекция (bc60bac61): 3 разных дня верных ответов, неверный ответ обнуляет; голос нужен,
// только если для этой ошибки он возможен (requiredModes = 2). Иначе экран обещал бы недостижимое.
const ruleCopyFor = (lang: Lang, requiredModes: 1 | 2): string => (requiredModes === 2
  ? triLang(lang, {
    ru: 'Ответь верно в 3 разных дня, хотя бы раз голосом и раз печатью, — и ошибка уйдёт. Неверный ответ начинает счёт заново.',
    uk: 'Дай правильну відповідь у 3 різні дні, хоча б раз голосом і раз письмово, — і помилка зникне. Неправильна відповідь починає рахунок заново.',
    en: 'Answer correctly on 3 different days, at least once by voice and once by typing, and the mistake goes away. A wrong answer restarts the count.',
    es: 'Responde bien en 3 días distintos, al menos una vez con la voz y otra escribiendo, y el error desaparecerá. Una respuesta incorrecta reinicia la cuenta.',
    'pt-BR': 'Responda certo em 3 dias diferentes, pelo menos uma vez falando e outra digitando, e o erro some. Uma resposta errada recomeça a contagem.',
    vi: 'Trả lời đúng vào 3 ngày khác nhau, ít nhất một lần bằng giọng nói và một lần bằng cách gõ, lỗi sẽ biến mất. Trả lời sai sẽ đếm lại từ đầu.',
    id: 'Jawab benar di 3 hari berbeda, minimal sekali dengan suara dan sekali dengan mengetik, dan kesalahan akan hilang. Jawaban salah memulai hitungan dari awal.',
    tr: '3 farklı günde, en az bir kez sesle ve bir kez yazarak doğru cevap ver, hata kaybolsun. Yanlış cevap sayımı baştan başlatır.',
    pl: 'Odpowiedz poprawnie w 3 różne dni, choć raz głosem i raz pisząc, a błąd zniknie. Błędna odpowiedź zaczyna liczenie od nowa.',
  })
  : triLang(lang, {
    ru: 'Ответь верно в 3 разных дня — и ошибка уйдёт. Неверный ответ начинает счёт заново.',
    uk: 'Дай правильну відповідь у 3 різні дні — і помилка зникне. Неправильна відповідь починає рахунок заново.',
    en: 'Answer correctly on 3 different days and the mistake goes away. A wrong answer restarts the count.',
    es: 'Responde bien en 3 días distintos y el error desaparecerá. Una respuesta incorrecta reinicia la cuenta.',
    'pt-BR': 'Responda certo em 3 dias diferentes e o erro some. Uma resposta errada recomeça a contagem.',
    vi: 'Trả lời đúng vào 3 ngày khác nhau, lỗi sẽ biến mất. Trả lời sai sẽ đếm lại từ đầu.',
    id: 'Jawab benar di 3 hari berbeda dan kesalahan akan hilang. Jawaban salah memulai hitungan dari awal.',
    tr: '3 farklı günde doğru cevap ver, hata kaybolsun. Yanlış cevap sayımı baştan başlatır.',
    pl: 'Odpowiedz poprawnie w 3 różne dni, a błąd zniknie. Błędna odpowiedź zaczyna liczenie od nowa.',
  }));

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { back: 'Назад', listen: 'Послушать', history: 'Хроника', toFix: 'До исправления', dayLeft: 'один день', daysLeft: 'дня', needMode: 'Нужен верный ответ в другом режиме', fixed: 'Исправлено навсегда', solved: 'Похожие фразы, где ты уже прав', practise: 'Отработать эту ошибку', notReady: 'Вернёмся к ней позже', misses: 'промахов', captured: 'Ошибся', right: 'Верно', rightSelf: 'Верно, сам', wrong: 'Промах', hidden: 'Скрыта', restored: 'Возвращена', done: 'Исправлено навсегда', noData: 'Эта ошибка больше не отслеживается' },
  uk: { back: 'Назад', listen: 'Послухати', history: 'Хроніка', toFix: 'До виправлення', dayLeft: 'один день', daysLeft: 'дні', needMode: 'Потрібна правильна відповідь в іншому режимі', fixed: 'Виправлено назавжди', solved: 'Схожі фрази, де ти вже маєш рацію', practise: 'Відпрацювати цю помилку', notReady: 'Повернемося до неї пізніше', misses: 'промахів', captured: 'Помилився', right: 'Правильно', rightSelf: 'Правильно, сам', wrong: 'Промах', hidden: 'Прихована', restored: 'Повернена', done: 'Виправлено назавжди', noData: 'Ця помилка більше не відстежується' },
  en: { back: 'Back', listen: 'Listen', history: 'History', toFix: 'To being fixed', dayLeft: 'one day', daysLeft: 'days', needMode: 'Needs a correct answer in a different mode', fixed: 'Fixed for good', solved: 'Similar phrases you already get right', practise: 'Practise this mistake', notReady: "We'll come back to it later", misses: 'misses', captured: 'Got it wrong', right: 'Correct', rightSelf: 'Correct, on your own', wrong: 'Miss', hidden: 'Hidden', restored: 'Restored', done: 'Fixed for good', noData: 'This mistake is no longer tracked' },
  es: { back: 'Atrás', listen: 'Escuchar', history: 'Historial', toFix: 'Para corregirlo', dayLeft: 'un día', daysLeft: 'días', needMode: 'Falta una respuesta correcta en otro modo', fixed: 'Corregido para siempre', solved: 'Frases parecidas que ya aciertas', practise: 'Practicar este error', notReady: 'Volveremos a él más tarde', misses: 'fallos', captured: 'Te equivocaste', right: 'Correcto', rightSelf: 'Correcto, solo', wrong: 'Fallo', hidden: 'Oculto', restored: 'Restaurado', done: 'Corregido para siempre', noData: 'Este error ya no se sigue' },
  'pt-BR': { back: 'Voltar', listen: 'Ouvir', history: 'Histórico', toFix: 'Para corrigir', dayLeft: 'um dia', daysLeft: 'dias', needMode: 'Falta um acerto em outro modo', fixed: 'Corrigido para sempre', solved: 'Frases parecidas que você já acerta', practise: 'Praticar este erro', notReady: 'Voltamos a ele mais tarde', misses: 'erros', captured: 'Você errou', right: 'Correto', rightSelf: 'Correto, sozinho', wrong: 'Erro', hidden: 'Oculto', restored: 'Restaurado', done: 'Corrigido para sempre', noData: 'Este erro não é mais acompanhado' },
  vi: { back: 'Quay lại', listen: 'Nghe', history: 'Lịch sử', toFix: 'Để sửa hẳn', dayLeft: 'một ngày', daysLeft: 'ngày', needMode: 'Cần một câu đúng ở chế độ khác', fixed: 'Đã sửa hẳn', solved: 'Câu tương tự bạn đã làm đúng', practise: 'Luyện lỗi này', notReady: 'Ta sẽ quay lại sau', misses: 'lần sai', captured: 'Bạn đã sai', right: 'Đúng', rightSelf: 'Đúng, tự làm', wrong: 'Sai', hidden: 'Đã ẩn', restored: 'Đã khôi phục', done: 'Đã sửa hẳn', noData: 'Lỗi này không còn được theo dõi' },
  id: { back: 'Kembali', listen: 'Dengar', history: 'Riwayat', toFix: 'Sampai diperbaiki', dayLeft: 'satu hari', daysLeft: 'hari', needMode: 'Perlu jawaban benar di mode lain', fixed: 'Diperbaiki selamanya', solved: 'Frasa serupa yang sudah kamu kuasai', practise: 'Latih kesalahan ini', notReady: 'Kita kembali lagi nanti', misses: 'kesalahan', captured: 'Kamu salah', right: 'Benar', rightSelf: 'Benar, sendiri', wrong: 'Salah', hidden: 'Disembunyikan', restored: 'Dikembalikan', done: 'Diperbaiki selamanya', noData: 'Kesalahan ini tidak lagi dilacak' },
  tr: { back: 'Geri', listen: 'Dinle', history: 'Geçmiş', toFix: 'Düzelmesine', dayLeft: 'bir gün', daysLeft: 'gün', needMode: 'Başka bir modda doğru cevap gerek', fixed: 'Kalıcı olarak düzeltildi', solved: 'Zaten doğru yaptığın benzer ifadeler', practise: 'Bu hatayı çalış', notReady: 'Buna sonra döneriz', misses: 'hata', captured: 'Yanlış yaptın', right: 'Doğru', rightSelf: 'Doğru, kendin', wrong: 'Hata', hidden: 'Gizlendi', restored: 'Geri alındı', done: 'Kalıcı olarak düzeltildi', noData: 'Bu hata artık takip edilmiyor' },
  pl: { back: 'Wstecz', listen: 'Posłuchaj', history: 'Historia', toFix: 'Do poprawienia', dayLeft: 'jeden dzień', daysLeft: 'dni', needMode: 'Potrzebna dobra odpowiedź w innym trybie', fixed: 'Poprawione na zawsze', solved: 'Podobne frazy, które już robisz dobrze', practise: 'Przećwicz ten błąd', notReady: 'Wrócimy do niego później', misses: 'pomyłek', captured: 'Pomyłka', right: 'Dobrze', rightSelf: 'Dobrze, samodzielnie', wrong: 'Pomyłka', hidden: 'Ukryty', restored: 'Przywrócony', done: 'Poprawione na zawsze', noData: 'Ten błąd nie jest już śledzony' },
});

function ListenButton({ audioRef, label }: Readonly<{ audioRef: string; label: string }>) {
  const g = useLv2Glass();
  const player = useAudioPlayer({ uri: audioRef });
  // зачем (аудит карты владения звуком, 2026-09-15): плеер играл МИМО общего
  // владения аудиотрактом — не глушился записью микрофона, не уважал тумблер
  // голоса в настройках и не уступал звук другому экрану. Управляемый плеер
  // вводит его в ту же границу владения, что и вся остальная озвучка.
  const managedPlayer = useManagedSpokenAudioPlayer(player);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => { hapticTap(); void managedPlayer.playFromStart(); }}
      style={[styles.iconButton, { backgroundColor: g.opaqueCard }]}
    >
      <Ionicons name="volume-high" size={22} color={g.text} />
    </Pressable>
  );
}

const timelineTone = (kind: MistakeTimelineEntry['kind']): 'bad' | 'good' | 'gold' | 'plain' =>
  kind === 'captured' || kind === 'practice_wrong' ? 'bad'
    : kind === 'practice_right' ? 'good'
      : kind === 'corrected' ? 'gold' : 'plain';

export default function MistakeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mistakeId?: string }>();
  const { f } = useTheme();
  const g = useLv2Glass();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const copy = useMemo(() => copyFor(lang), [lang]);
  // зачем (22.09): подмена испанского/немецкого на английский — карточка
  // ошибки открывалась из чужого журнала. Язык журнала подменять нельзя.
  const target = normalizeMistakeStudyTarget(studyTarget);
  const mistakeId = typeof params.mistakeId === 'string' ? params.mistakeId : '';
  const [detail, setDetail] = useState<MistakeDetail | null | 'missing'>(null);
  const gate = useMistakePracticeStartGate('mistakes_hub_start');
  const openingRef = useRef(false);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    openingRef.current = false;
    if (!mistakeId) { setDetail('missing'); return () => { cancelled = true; }; }
    void (async () => {
      const accountScope = await getStableId();
      const next = await loadMistakeDetail({ accountScope, studyTarget: target, mistakeId });
      if (!cancelled) setDetail(next ?? 'missing');
    })().catch((error: unknown) => {
      console.warn('[MISTAKES-HUB] detail:catch', error instanceof Error ? error.message : String(error)); // guard-ok: лог в catch обязателен
      if (!cancelled) setDetail('missing');
    });
    return () => { cancelled = true; };
  }, [mistakeId, target]));

  const practise = useCallback(() => {
    if (openingRef.current || detail === null || detail === 'missing' || !detail.ready) return;
    hapticTap();
    if (!gate.tryStartSession()) return;
    openingRef.current = true;
    trackMistakePracticeEvent('mistake_practice_setup_started', {
      study_target: target, entry_source: 'mistake_detail', requested_length: '1', ready_count: 1, session_count: 1, costs_energy: false,
    });
    router.push({ pathname: '/mistake_practice_session', params: { focusMistakeId: detail.mistakeId } } as never);
  }, [detail, gate, router, target]);

  const loaded = detail !== null && detail !== 'missing';
  const dateOf = (atMs: number) => new Date(atMs).toLocaleDateString(lang === 'en' ? 'en-GB' : lang, { day: 'numeric', month: 'short' });

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.back} hitSlop={10} onPress={() => safeRouterBack(router, '/mistakes_list' as never)} style={[styles.iconButton, { backgroundColor: g.opaqueCard }]}>
            <Ionicons name="chevron-back" size={24} color={g.text} />
          </Pressable>
          <View style={{ flex: 1 }} />
          {loaded && detail.audioRef ? <ListenButton audioRef={detail.audioRef} label={copy.listen} /> : null}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {detail === 'missing' ? (
            <View style={[styles.card, { backgroundColor: g.opaqueCard }]}>
              <Text style={{ color: g.secondary, fontSize: f.body, fontWeight: '700' }}>{copy.noData}</Text>
            </View>
          ) : !loaded ? (
            <View style={{ gap: 12 }}>
              <SkeletonBlock width="80%" height={32} borderRadius={12} />
              <SkeletonBlock width="56%" height={20} borderRadius={10} />
              <SkeletonBlock width="100%" height={120} borderRadius={22} />
              <SkeletonBlock width="100%" height={200} borderRadius={22} />
            </View>
          ) : (
            <>
              <View style={styles.hero}>
                <Text style={[styles.phrase, { color: g.text, fontSize: f.h2 }]}>{detail.phrase}</Text>
                {detail.meaning ? (
                  <Text style={[styles.meaning, { color: g.secondary, fontSize: f.bodyLg }]}>{detail.meaning}</Text>
                ) : null}
                <View style={styles.tagRow}>
                  <View style={[styles.tag, { backgroundColor: g.badFill }]}>
                    <Text style={[styles.tagText, { color: g.bad, fontSize: f.label }]}>{mistakeFacetLabel(lang, detail.facet)}</Text>
                  </View>
                  {detail.sourceGroup ? (
                    <View style={[styles.tag, { backgroundColor: g.opaqueControl }]}>
                      <Text style={[styles.tagText, { color: g.text, fontSize: f.label }]}>{mistakeSourceLabel(lang, detail.sourceGroup)}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.tag, { backgroundColor: g.opaqueControl }]}>
                    <Text style={[styles.tagText, { color: g.text, fontSize: f.label }]}>×{detail.captureCount}</Text>
                  </View>
                </View>
              </View>

              {/* Сколько осталось: правило «3 дня в 2 режимах» словами и полосами. */}
              <View style={[styles.card, { backgroundColor: g.opaqueCard }]}>
                <View style={styles.progressRow}>
                  <Text style={[styles.cardTitle, { color: g.text, fontSize: f.bodyLg, flex: 1 }]}>
                    {detail.status === 'corrected' ? copy.fixed : copy.toFix}
                  </Text>
                  {detail.status !== 'corrected' ? (
                    <Text style={[styles.progressNum, { color: g.cta }]}>
                      {detail.qualifyingDays}<Text style={{ color: g.secondary, fontSize: f.body }}>/3</Text>
                    </Text>
                  ) : null}
                </View>
                <View style={styles.chainSteps}>
                  {[0, 1, 2].map((index) => (
                    <View key={`step-${index}`} style={[styles.chainStep, { backgroundColor: index < detail.qualifyingDays ? g.cta : g.opaqueControl }]} />
                  ))}
                </View>
                {detail.status !== 'corrected' ? (
                  <Text testID="mistake-detail-rule" style={[styles.hint, { color: g.secondary, fontSize: f.sub }]}>{ruleCopyFor(lang, detail.requiredModes)}</Text>
                ) : null}
              </View>

              <View style={[styles.card, { backgroundColor: g.opaqueCard }]}>
                <Text style={[styles.cardTitle, { color: g.text, fontSize: f.bodyLg }]}>{copy.history}</Text>
                <View style={styles.timeline}>
                  {detail.timeline.map((event, index) => {
                    const tone = timelineTone(event.kind);
                    const color = tone === 'bad' ? g.bad : tone === 'good' ? g.good : tone === 'gold' ? g.text : g.secondary;
                    const background = tone === 'bad' ? g.badFill : tone === 'good' ? g.goodFill : tone === 'gold' ? g.opaqueControl : g.opaqueControl;
                    const label = event.kind === 'captured' ? copy.captured
                      : event.kind === 'practice_right' ? (event.independent ? copy.rightSelf : copy.right)
                        : event.kind === 'practice_wrong' ? copy.wrong
                          : event.kind === 'corrected' ? copy.done
                            : event.kind === 'hidden' ? copy.hidden : copy.restored;
                    return (
                      <View key={`${event.kind}-${event.atMs}-${index}`} style={styles.timelineRow}>
                        <View style={[styles.timelineDot, { backgroundColor: background }]}>
                          <Ionicons
                            name={tone === 'bad' ? 'close' : tone === 'gold' ? 'star' : tone === 'good' ? 'checkmark' : 'ellipse-outline'}
                            size={13}
                            color={color}
                          />
                        </View>
                        <Text style={[styles.timelineText, { color: g.text, fontSize: f.sub }]}>
                          {label}{event.sourceGroup ? ` · ${mistakeSourceLabel(lang, event.sourceGroup)}` : ''}
                        </Text>
                        <Text style={[styles.timelineDate, { color: g.secondary, fontSize: f.sub }]}>{dateOf(event.atMs)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {detail.solvedNeighbours.length > 0 ? (
                <View style={[styles.card, { backgroundColor: g.opaqueCard }]}>
                  <Text style={[styles.cardTitle, { color: g.text, fontSize: f.bodyLg }]}>{copy.solved}</Text>
                  <View style={{ gap: 8 }}>
                    {detail.solvedNeighbours.map((neighbour) => (
                      <View key={neighbour.phrase} style={styles.neighbourRow}>
                        <View style={[styles.neighbourMark, { backgroundColor: g.goodFill }]}>
                          <Ionicons name="checkmark" size={16} color={g.good} />
                        </View>
                        <Text style={[styles.neighbourText, { color: g.text, fontSize: f.body }]}>{neighbour.phrase}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        {loaded && detail.status === 'active' ? (
          <View style={styles.dock}>
            <Pressable
              testID="mistake-detail-practise"
              accessibilityRole="button"
              accessibilityState={{ disabled: !detail.ready }}
              disabled={!detail.ready}
              onPress={practise}
              style={({ pressed }) => [
                styles.primary,
                { backgroundColor: detail.ready ? g.cta : g.opaqueControl, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <Text style={{ color: detail.ready ? g.ctaInk : g.mutedText, fontSize: f.body, fontWeight: '800' }}>
                {detail.ready ? copy.practise : copy.notReady}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 130, gap: 12 },
  hero: { gap: 8, paddingHorizontal: 2 },
  phrase: { fontWeight: '900', letterSpacing: -0.6, lineHeight: 36 },
  meaning: { fontWeight: '700' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tag: { height: 32, borderRadius: 16, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  tagText: { fontWeight: '800' },
  card: { borderRadius: 22, padding: 18, gap: 12 },
  cardTitle: { fontWeight: '900', letterSpacing: -0.2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressNum: { fontSize: 30, fontWeight: '900', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  chainSteps: { flexDirection: 'row', gap: 6 },
  chainStep: { flex: 1, height: 10, borderRadius: 5 },
  hint: { fontWeight: '700', lineHeight: 21 },
  timeline: { gap: 10 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 28 },
  timelineDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  timelineText: { flex: 1, flexShrink: 1, fontWeight: '700' },
  timelineDate: { fontWeight: '800', fontVariant: ['tabular-nums'], alignSelf: 'center' },
  neighbourRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  neighbourMark: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  neighbourText: { flex: 1, flexShrink: 1, fontWeight: '800' },
  dock: { position: 'absolute', left: 16, right: 16, bottom: 22 },
  primary: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
