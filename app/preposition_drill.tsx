import KitProgressFill from '../components/KitProgressFill';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { PracticeBackButton, PracticeHeaderTitle } from '../components/practice/PracticeChrome';
import { PracticeCta, PracticeQuestionCard, PracticeStatePanel } from '../components/practice/PracticeStates';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import { useFirstQuestionEnergyGate } from '../hooks/useFirstQuestionEnergyGate';
import { canChargePreparedTrainingEntry } from './energy_contract';
import EnergyBar from '../components/EnergyBar';
import NoEnergyModal from '../components/NoEnergyModal';
import ReportErrorButton from '../components/ReportErrorButton';
import BouncyScrollView from '../components/BouncyScrollView';
import ClozeGapText from '../components/ClozeGapText';
import { useAudio } from '../hooks/use-audio';
import fk from './feedback/feedback_kit';
import V2DoneScreen, { type V2DoneError } from '../components/completion/V2DoneScreen';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import { pluralWord } from '../constants/plural';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { getLessonPrepositionPack } from './lesson_prepositions';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { withLessonRuntimeAccessBoundary } from './lesson_runtime_access_boundary';
import { loadSettings } from './settings_edu';
import { lessonPrepositionProgressKey } from './target_storage_keys';
import {
  frenchVocabularyGateCopy,
  vocabularyContentAvailableForTarget,
} from './vocabulary_target_gate';
import { safeRouterBack } from './navigation_back';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее


type PrepositionProgress = {
  answeredIds: string[];
  wrongIds: string[];
};

function FrenchPrepositionDrillUnavailable({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const copy = frenchVocabularyGateCopy('preposition_drill', lang);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingBottom: 40 }}>
      <View style={{ width: 61, height: 61, borderRadius: 16, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="shield-checkmark-outline" size={26} color={glass.text} />
      </View>
      <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center', marginTop: 18 }}>
        {copy.title}
      </Text>
      <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 8 }}>
        {copy.body}
      </Text>
      <PracticeCta
        glass={glass}
        size="small"
        testID="preposition-drill-french-source-gate-back"
        label={copy.action}
        onPress={onBack}
        style={{ marginTop: 22 }}
      />
    </View>
  );
}

function PrepositionDrillScreen() {
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const lessonId = parseInt(id || '0', 10) || 0;
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  const { theme: t, ds, liquidGlassThemeId } = useTheme();
  // зачем (владелец 2026-09-30): «Тренажёр предлогов» 1:1 по макету learn.html (I1–I5, Liquid Glass); только вид.
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const scrollRef = useRef<ScrollView>(null);
  const isLightTheme = false;

  const pack = useMemo(() => getLessonPrepositionPack(lessonId, studyTarget), [lessonId, studyTarget]);
  const frenchPrepositionBlocked = !vocabularyContentAvailableForTarget(studyTarget, 'preposition_drill');
  const progressKey = lessonPrepositionProgressKey(lessonId, studyTarget);
  const [itemIdx, setItemIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  // зачем (макет итога предлогов): ошибки «было → верно» за прогон — локально, без сети.
  const runErrorsRef = useRef<V2DoneError[]>([]);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [progressReadyForKey, setProgressReadyForKey] = useState<string | null>(null);
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const [voiceOut, setVoiceOut] = useState(true);
  const [speechRate, setSpeechRate] = useState(0.9);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadSettings().then(s => { setVoiceOut(s.voiceOut); setSpeechRate(s.speechRate); });
    });
    return () => task.cancel();
  }, []);
  useEffect(() => () => { stopAudio(); }, [stopAudio]);

  // Perfect-bonus is granted once per lesson on the first clean pass

  const activeItems = useMemo(() => {
    if (!pack) return [];
    if (!reviewMode) return pack.items;
    const wrongSet = new Set(wrongIds);
    return pack.items.filter(x => wrongSet.has(x.id));
  }, [pack, reviewMode, wrongIds]);
  const item = activeItems[itemIdx];
  const total = activeItems.length;
  const done = total > 0 && itemIdx >= total;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // зачем (владелец 13.10 «Начислять»): тренажёр предлогов всегда давал +0. Монеты — как за урок той же длины: +3 за верный
  // ответ, +1 на повторном проходе; зачёт одной серверной распиской на итоге (тот же usePracticeRunes, что у уроков и глаголов).
  const prepositionRunes = usePracticeRunes({
    activity: 'lesson',
    sessionKey: `prep_${studyTarget}_${lessonId}`,
    completionOrdinal: 1,
    enabled: lessonId > 0 && Boolean(pack),
  });
  const prepositionSettledPassRef = useRef(false);
  // зачем (ревью Авторизации 13.10): итог повтора внутри экрана показывает +0 — поздравляем фактом, а не прошлым проходом.
  const [repeatRunWithoutCoins, setRepeatRunWithoutCoins] = useState(false);
  useEffect(() => {
    if (!done || prepositionRunes.hydrating || prepositionSettledPassRef.current) return;
    prepositionSettledPassRef.current = true;
    console.log(`[COINS-EARN] prep: итог урок=${lessonId} верно=${correctCount}/${total} монеты=+${prepositionRunes.runes} → зачёт`); // guard-ok: итог
    void prepositionRunes.settle().catch((error: unknown) => {
      console.warn('[COINS-EARN] prep: зачёт не прошёл — копилка повторит при следующем запуске', error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачёт один раз на проход; монеты печатаются как снимок
  }, [done, prepositionRunes.hydrating]);

  // ── Энергия: 1 ⚡ только за доступное начатое упражнение ────────────────
  const { energyReady } = useEnergy();
  const drillEnergyIntent = useEnergySessionIntent('preposition_drill', String(lessonId));

  const [noEnergyModalOpen, setNoEnergyModalOpen] = useState(false);

  // Ждём заряд и прогресс: завершённый/пустой урок не является новым занятием.
  // зачем: D72/D87/PM-084 — единый гейт первого вопроса. Латч по operationId
  // внутри гейта: смена баланса после списания второй раз не спишет, уход до
  // показа первого задания вернёт энергию.
  useFirstQuestionEnergyGate({
    intent: drillEnergyIntent,
    screen: 'preposition_drill',
    firstQuestionVisible: canChargePreparedTrainingEntry({
      energyReady,
      hasPlayableItems: !frenchPrepositionBlocked && progressReadyForKey === progressKey && Boolean(item),
    }),
    onInsufficient: () => setNoEnergyModalOpen(true),
    onCancelled: () => safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any),
  });

  const onCloseEnergyModal = useCallback(() => {
    setNoEnergyModalOpen(false);
    // Модал показываем только когда вход НЕ оплачен (не хватило заряда) — значит
    // закрытие всегда означает выход из тренажёра.
    safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any);
  }, [router, lessonId]);

  useEffect(() => {
    if (!pack) return;
    setProgressReadyForKey(null);
    setReviewMode(false);
    setSelected(null);
    setIsCorrect(false);
    AsyncStorage.getItem(progressKey).then(raw => {
      try {
        const saved: PrepositionProgress = raw
          ? JSON.parse(raw)
          : { answeredIds: [], wrongIds: [] };
        const validIds = new Set(pack.items.map(x => x.id));
        const savedAnswered = Array.isArray(saved.answeredIds)
          ? saved.answeredIds.filter(id => validIds.has(id))
          : [];
        const savedWrong = Array.isArray(saved.wrongIds)
          ? saved.wrongIds.filter(id => validIds.has(id))
          : [];
        setAnsweredIds(savedAnswered);
        setWrongIds(savedWrong);
        setItemIdx(Math.min(savedAnswered.length, pack.items.length));
        setCorrectCount(Math.max(0, savedAnswered.length - savedWrong.length));
      } catch {
        setAnsweredIds([]);
        setWrongIds([]);
        setItemIdx(0);
        setCorrectCount(0);
      }
    }).catch(noteSwallowedHandler('preposition_drill:useEffect.getItem')).finally(() => setProgressReadyForKey(progressKey));
  }, [pack, progressKey]);

  const saveProgress = (nextAnswered: string[], nextWrong: string[]) => {
    const payload: PrepositionProgress = { answeredIds: nextAnswered, wrongIds: nextWrong };
    AsyncStorage.setItem(progressKey, JSON.stringify(payload)).catch(noteSwallowedHandler('preposition_drill:saveProgress.setItem'));
  };

  // зачем: D140 (владелец 2026-10-01) — коллекции («Сокровищница») удалены целиком:
  // дропа карточки за закрытый раздел больше нет.
  const speakSentenceEn = useCallback((template: string, prep: string) => {
    if (!voiceOut) return;
    const line = template.replace(/__/g, prep).replace(/\s+/g, ' ').trim();
    if (!line) return;
    InteractionManager.runAfterInteractions(() => {
      speakAudio(line, speechRate, { language: 'en-US' });
    });
  }, [speakAudio, speechRate, voiceOut]);

  /** Після відповіді пояснення може займати екран — докручуємо вниз до «Дальше», зірок і репорта (Android). */
  useEffect(() => {
    if (selected === null || !item) return;
    const t1 = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 160);
    const t2 = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 420);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [selected, item?.id, isCorrect]);

  const title = triLang(lang, {
    uk: 'Тренажер прийменників',
    ru: 'Тренажер предлогов',
    en: 'Preposition trainer',
    es: 'Práctica de preposiciones',
    'pt-BR': 'Prática de preposições',
    vi: 'Luyện giới từ',
    id: 'Latihan preposisi',
    tr: 'Edat alıştırması',
    pl: 'Ćwiczenie przyimków',
  });
  const subtitle = triLang(lang, {
    uk: `Урок ${lessonId}: прийменники цього уроку`,
    ru: `Урок ${lessonId}: предлоги этого урока`,
    en: `Lesson ${lessonId}: prepositions from this lesson`,
    es: `Lección ${lessonId}: preposiciones de esta lección`,
    'pt-BR': `Lição ${lessonId}: preposições desta lição`,
    vi: `Bài ${lessonId}: giới từ của bài này`,
    id: `Pelajaran ${lessonId}: preposisi di pelajaran ini`,
    tr: `Ders ${lessonId}: bu dersin edatları`,
    pl: `Lekcja ${lessonId}: przyimki z tej lekcji`,
  });
  const backToLesson = () => safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any);
  // Шапка макета `.hd`: круглая «‹» 34/44, заголовок 20/700 + подзаголовок 15, энергия справа.
  const headerNode = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 12 }}>
      <PracticeBackButton
        glass={glass}
        color={glass.text}
        accessibilityLabel={triLang(lang, { ru: 'Назад', en: 'Back', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
        onPress={() => { fk.tap(); backToLesson(); }}
      />
      <PracticeHeaderTitle glass={glass} title={title} subtitle={subtitle} />
      <EnergyBar size={30} glass />
    </View>
  );

  if (frenchPrepositionBlocked) {
    return (
      <ScreenGradient>
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: bottomInset }}>
          <ContentWrap>
            <FrenchPrepositionDrillUnavailable
              lang={lang}
              onBack={() => router.replace({ pathname: '/lesson_menu', params: { id: lessonId } } as any)}
            />
          </ContentWrap>
        </View>
      </ScreenGradient>
    );
  }

  if (!pack) {
    // Пустое состояние (макет prepEmpty): плитка со значком, название, кнопка «К уроку».
    return (
      <ScreenGradient>
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: bottomInset }}>
          <ContentWrap>
            {headerNode}
            <PracticeStatePanel
              glass={glass}
              icon="key-outline"
              title={triLang(lang, {
                uk: 'У цьому уроці немає прийменників',
                ru: 'В этом уроке нет предлогов',
                en: 'This lesson has no prepositions',
                es: 'En esta lección no hay preposiciones.',
                'pt-BR': 'Esta lição não tem preposições.',
                vi: 'Bài học này không có giới từ.',
                id: 'Tidak ada preposisi dalam pelajaran ini.',
                tr: 'Bu derste edat yok.',
                pl: 'W tej lekcji nie ma przyimków.',
              })}
              message=""
              action={{
                label: triLang(lang, { ru: 'К уроку', uk: 'До уроку', en: 'To lesson', es: 'A la lección', 'pt-BR': 'Para a lição', vi: 'Về bài học', id: 'Ke pelajaran', tr: 'Derse', pl: 'Do lekcji' }),
                onPress: () => { fk.tap(); backToLesson(); },
              }}
            />
          </ContentWrap>
        </View>
      </ScreenGradient>
    );
  }

  const prepositionsLabel = pack.newPrepositions.map(p => p.text).join(', ');

  const onAnswer = (option: string) => {
    if (selected) return;
    // зачем: 10 ⚡ уже списаны за вход в тренажёр, внутри энергия не тратится —
    // проверка баланса на каждом ответе оборвала бы оплаченную сессию.
    const ok = option === item.correct;
    setSelected(option);
    setIsCorrect(ok);
    speakSentenceEn(item.sentenceTemplate, item.correct);
    // [FeedbackKit] Вердикт ответа (звук+вибра). fk.correct/fk.wrong дают тот же
    // haptic + тёплый/мягкий звук. Экономика/прогресс ниже считаются как раньше.
    if (ok) {
      fk.verdict({ correct: true });
      setCorrectCount(v => v + 1);
      // зачем (ревью Авторизации 13.10, 🔴): монеты — только в проходе, за который списана энергия (вход в экран). После зачёта
      // «Ещё раз» / «Повторить ошибки» идут без энергии — и без монет, иначе это бесконечный фарм (в т.ч. «провалить нарочно → повторить ошибки»).
      if (prepositionSettledPassRef.current) {
        console.log(`[COINS-EARN] prep: верно урок=${lessonId} item=${item.id} +0 (повтор после итога — проход без энергии, монет нет)`); // guard-ok: ветка
      } else {
        const coins = prepositionRunes.onCorrectAnswer(item.id);
        console.log(`[COINS-EARN] prep: верно урок=${lessonId} item=${item.id} +${coins} (${coins === 0 ? 'уже засчитан в этом проходе' : 'в копилку'})`); // guard-ok: начисление
      }
      const nextAnswered = answeredIds.includes(item.id) ? answeredIds : [...answeredIds, item.id];
      const nextWrong = reviewMode ? wrongIds.filter(id => id !== item.id) : wrongIds;
      setAnsweredIds(nextAnswered);
      setWrongIds(nextWrong);
      saveProgress(nextAnswered, nextWrong);
    } else {
      fk.verdict({ correct: false });
      runErrorsRef.current = [...runErrorsRef.current, { label: item.sentenceTemplate.replace(/_{2,}/g, '…'), was: option, ok: item.correct }];
      const nextAnswered = answeredIds.includes(item.id) ? answeredIds : [...answeredIds, item.id];
      const nextWrong = wrongIds.includes(item.id) ? wrongIds : [...wrongIds, item.id];
      setAnsweredIds(nextAnswered);
      setWrongIds(nextWrong);
      saveProgress(nextAnswered, nextWrong);

      // зачем: владелец 2026-08-23 — энергия НЕ тратится за ошибки. Заряд уже
      // списан один раз за вход в тренажёр (эффект старта выше).
    }
  };

  const goNext = () => {
    stopAudio();
    setSelected(null);
    setIsCorrect(false);
    setItemIdx(v => v + 1);
  };

  // зачем (ревью Авторизации 13.10, 🔴): нового прохода копилки после итога больше НЕТ — повтор внутри экрана энергию не платит,
  // поэтому и монет не даёт. Новый оплачиваемый проход — только повторный вход в тренажёр (снова гейт энергии), как у уроков.
  const logRepeatWithoutCoins = (kind: 'wrong' | 'all') => {
    setRepeatRunWithoutCoins(true);
    console.log(`[COINS-EARN] prep: повтор ${kind} урок=${lessonId} — без монет (энергия за вход уже списана, проход зачтён=${String(prepositionSettledPassRef.current)})`); // guard-ok: ветка
  };

  const restartWrong = () => {
    logRepeatWithoutCoins('wrong');
    stopAudio();
    setReviewMode(true);
    setItemIdx(0);
    setSelected(null);
    setIsCorrect(false);
    setCorrectCount(0);
    runErrorsRef.current = [];
  };

  const restartAll = () => {
    logRepeatWithoutCoins('all');
    stopAudio();
    setReviewMode(false);
    setItemIdx(0);
    setSelected(null);
    setIsCorrect(false);
    setCorrectCount(0);
    runErrorsRef.current = [];
  };

  const scrollBottomPad =
    bottomInset + ds.spacing.xl + (effectiveOs === 'android' ? ds.spacing.lg + 8 : ds.spacing.sm);

  /** Один слот `__` в шаблоне; после ответа показываем правильное слово в тексте (= item.correct), чтобы текст совпадал с блоком «Верно» и меньше ловить баги обрезки Android у `__`. */
  const renderSentenceCard = () => {
    if (!item) return null;
    const tpl = item.sentenceTemplate;
    const baseStyle = { color: glass.text, fontSize: 24, fontWeight: '600' as const, lineHeight: 32, textAlign: 'center' as const };
    if (selected === null || !tpl.includes('__')) {
      return <ClozeGapText text={tpl} style={baseStyle} gapColor={glass.secondary} />;
    }
    const [before, ...rest] = tpl.split('__');
    const after = rest.join('__'); // если в шаблоне когда-нибудь окажется больше одного маркера
    const fill = (
      <Text style={{ ...baseStyle, fontWeight: '700', color: t.correct }}>{item.correct}</Text>
    );
    return (
      <Text style={baseStyle}>
        {before}
        {fill}
        {after}
      </Text>
    );
  };

  return (
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: bottomInset }}>
        <ContentWrap>
        {headerNode}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>

          {!done && item ? (
            <View style={{ flex: 1 }}>
              <BouncyScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                decelerationRate="fast"
                contentContainerStyle={{ paddingBottom: scrollBottomPad }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
                removeClippedSubviews={effectiveOs === 'android' ? false : undefined}
              >
              {/* Полоса прогресса + «Вызов 3 / 12» (макет prep) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22 }}>
                <View style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: glass.opaqueControl }}>
                  <KitProgressFill ratio={total > 0 ? (itemIdx + 1) / total : 0} style={{ backgroundColor: glass.accentGraphic }} />
                </View>
                <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  {triLang(lang, {
                    uk: 'Завдання',
                    ru: 'Вызов',
                    en: 'Challenge',
                    es: 'Ejercicio',
                    'pt-BR': 'Exercício',
                    vi: 'Bài tập',
                    id: 'Latihan',
                    tr: 'Alıştırma',
                    pl: 'Ćwiczenie',
                  })} {itemIdx + 1} / {total}
                </Text>
              </View>

              <PracticeQuestionCard
                glass={glass}
                minHeight={140}
                style={{ marginTop: 26, ...(effectiveOs === 'android' ? { elevation: 2 } : {}) }}
                kicker={triLang(lang, {
                  ru: 'Вставь предлог',
                  en: 'Fill in the preposition',
                  uk: 'Встав прийменник',
                  es: 'Completa con la preposición',
                  'pt-BR': 'Complete com a preposição',
                  vi: 'Điền giới từ',
                  id: 'Isi preposisi',
                  tr: 'Edatı yerleştir',
                  pl: 'Wstaw przyimek',
                })}
              >
                <View style={{ marginTop: 14 }}>{renderSentenceCard()}</View>
              </PracticeQuestionCard>

              {/* Варианты — 2 колонки (макет opts2), знак верно/неверно у правого края */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 22 }}>
              {item.options.map((opt, optIdx) => {
                const isSel = selected === opt;
                const showCorrect = selected !== null && opt === item.correct;
                const showWrong = isSel && !showCorrect;
                const dim = selected !== null && !showCorrect && !isSel;
                const tone = showCorrect ? t.correct : showWrong ? t.wrong : glass.text;
                return (
                  <View
                    key={`${item.id}:${optIdx}:${opt}`}
                    collapsable={effectiveOs === 'android' ? false : undefined}
                    style={{ width: '48%' }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={opt}
                      onPress={() => onAnswer(opt)}
                      disabled={selected !== null}
                      style={({ pressed }) => ({
                        minHeight: 56, borderRadius: 16, paddingVertical: 10, paddingHorizontal: showCorrect || showWrong ? 34 : 12,
                        alignItems: 'center', justifyContent: 'center',
                        // guard-ok: 1 px полупрозрачная кромка `.opt` макета (исключение PhraseMan 2.0).
                        borderWidth: StyleSheet.hairlineWidth, // guard-ok
                        borderColor: glass.line,
                        backgroundColor: pressed ? glass.selected : glass.opaqueCard,
                        opacity: dim ? 0.4 : 1,
                        transform: [{ scale: pressed && selected === null ? 0.98 : 1 }],
                      })}
                    >
                      {(showCorrect || showWrong) && (
                        <View pointerEvents="none" style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
                          <Ionicons name={showCorrect ? 'checkmark' : 'close'} size={18} color={tone} />
                        </View>
                      )}
                      <Text style={{ color: tone, fontSize: 16, lineHeight: 21, fontWeight: '600' }} maxFontSizeMultiplier={1.2}>{opt}</Text>
                    </Pressable>
                  </View>
                );
              })}
              </View>

              {selected !== null && (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 18, minHeight: 22 }}>
                    <Ionicons name={isCorrect ? 'checkmark' : 'close'} size={20} color={isCorrect ? t.correct : t.wrong} />
                    <Text style={{ color: isCorrect ? t.correct : t.wrong, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>
                      {isCorrect
                        ? triLang(lang, {
                          uk: 'Правильно',
                          ru: 'Верно',
                          en: 'Correct',
                          es: 'Correcto',
                          'pt-BR': 'Correto',
                          vi: 'Đúng',
                          id: 'Benar',
                          tr: 'Doğru',
                          pl: 'Poprawnie',
                        })
                        : triLang(lang, {
                          uk: 'Майже',
                          ru: 'Почти',
                          en: 'Not quite',
                          es: 'Incorrecto',
                          'pt-BR': 'Incorreto',
                          vi: 'Sai',
                          id: 'Salah',
                          tr: 'Yanlış',
                          pl: 'Niepoprawnie',
                        })}
                    </Text>
                  </View>
                  <View style={{
                    marginTop: 14, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: glass.opaqueCard,
                    // guard-ok: 1 px полупрозрачная кромка `.why` макета (исключение PhraseMan 2.0).
                    borderWidth: StyleSheet.hairlineWidth, // guard-ok
                    borderColor: glass.line,
                  }}>
                    <Text style={{ color: glass.text, fontSize: 16, lineHeight: 22 }}>
                      {triLang(lang, {
                        uk: item.explainUK,
                        ru: item.explainRU,
                        en: item.explainES ?? item.explainRU,
                        es: item.explainES ?? item.explainRU,
                        'pt-BR': item.explainPtBr ?? item.explainES ?? item.explainRU,
                        vi: item.explainVi ?? item.explainES ?? item.explainRU,
                        id: item.explainId ?? item.explainES ?? item.explainRU,
                        tr: item.explainTr ?? item.explainES ?? item.explainRU,
                        pl: item.explainPl ?? item.explainES ?? item.explainRU,
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {/* Кнопка репорта — в конце прокрутки */}
              <ReportErrorButton
                screen="lesson_prepositions"
                dataId={`prep_drill_lesson_${lessonId}_${item.id}`}
                dataText={[
                  triLang(lang, {
                    uk: `Урок ${lessonId}, нові прийменники: ${prepositionsLabel}`,
                    ru: `Урок ${lessonId}, новые предлоги: ${prepositionsLabel}`,
                    en: `Lesson ${lessonId}, new prepositions: ${prepositionsLabel}`,
                    es: `Lección ${lessonId}, nuevas preposiciones: ${prepositionsLabel}`,
                    'pt-BR': `Lição ${lessonId}, novas preposições: ${prepositionsLabel}`,
                    vi: `Bài ${lessonId}, giới từ mới: ${prepositionsLabel}`,
                    id: `Pelajaran ${lessonId}, preposisi baru: ${prepositionsLabel}`,
                    tr: `Ders ${lessonId}, yeni edatlar: ${prepositionsLabel}`,
                    pl: `Lekcja ${lessonId}, nowe przyimki: ${prepositionsLabel}`,
                  }),
                  triLang(lang, {
                    uk: `Завдання: ${item.sentenceTemplate}`,
                    ru: `Вызов: ${item.sentenceTemplate}`,
                    en: `Challenge: ${item.sentenceTemplate}`,
                    es: `Ejercicio: ${item.sentenceTemplate}`,
                    'pt-BR': `Exercício: ${item.sentenceTemplate}`,
                    vi: `Bài tập: ${item.sentenceTemplate}`,
                    id: `Latihan: ${item.sentenceTemplate}`,
                    tr: `Alıştırma: ${item.sentenceTemplate}`,
                    pl: `Ćwiczenie: ${item.sentenceTemplate}`,
                  }),
                  triLang(lang, {
                    uk: `Варіанти: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    ru: `Варианты: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    en: `Options: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    es: `Opciones: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    'pt-BR': `Opções: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    vi: `Lựa chọn: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    id: `Pilihan: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    tr: `Seçenekler: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    pl: `Opcje: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                  }),
                ].join('\n')}
                style={{ alignSelf: 'center', marginTop: ds.spacing.md, marginBottom: ds.spacing.sm }}
                textColor={glass.secondary}
              />
              </BouncyScrollView>
              {selected !== null ? (
                // Кнопка «Продолжить →» закреплена под прокруткой (макет `.fx`).
                <View style={{ paddingTop: 10, paddingBottom: 12 }}>
                  <PracticeCta
                    glass={glass}
                    trailingArrow
                    onPress={() => { fk.tap(); goNext(); }}
                    label={triLang(lang, {
                      uk: 'Продовжити',
                      ru: 'Продолжить',
                      en: 'Next',
                      es: 'Siguiente',
                      'pt-BR': 'Próximo',
                      vi: 'Tiếp theo',
                      id: 'Berikutnya',
                      tr: 'Sonraki',
                      pl: 'Dalej',
                    })}
                  />
                </View>
              ) : null}
            </View>
          ) : (
            // зачем (владелец 01.10): итог предлогов = общий экран завершения 2.0 по макету learn.html.
            <V2DoneScreen
              testID="preposition-drill-complete"
              title={triLang(lang, { ru: 'Предлоги отработаны', uk: 'Прийменники відпрацьовано', en: 'Prepositions practiced', es: 'Preposiciones practicadas', 'pt-BR': 'Preposições praticadas', vi: 'Đã luyện giới từ', id: 'Preposisi dilatih', tr: 'Edatlar çalışıldı', pl: 'Przyimki przećwiczone' })}
              subtitle={triLang(lang, {
                ru: `Тренажёр предлогов · Урок ${lessonId} · ${total} ${pluralWord(lang, total, { one: 'вызов', few: 'вызова', many: 'вызовов' })}`,
                uk: `Тренажер прийменників · Урок ${lessonId} · ${total} ${pluralWord(lang, total, { one: 'завдання', few: 'завдання', many: 'завдань' })}`,
                en: `Preposition drill · Lesson ${lessonId} · ${total} challenges`,
                es: `Preposiciones · Lección ${lessonId} · ${total} retos`,
                'pt-BR': `Preposições · Lição ${lessonId} · ${total} desafios`,
                vi: `Giới từ · Bài ${lessonId} · ${total} thử thách`,
                id: `Preposisi · Pelajaran ${lessonId} · ${total} tantangan`,
                tr: `Edatlar · Ders ${lessonId} · ${total} görev`,
                pl: `Przyimki · Lekcja ${lessonId} · ${total} ${pluralWord(lang, total, { one: 'zadanie', few: 'zadania', many: 'zadań' })}`,
              })}
              stars={null}
              correct={total > 0 ? correctCount : null}
              wrong={total > 0 ? Math.max(0, total - correctCount) : null}
              coinsGained={repeatRunWithoutCoins ? 0 : prepositionRunes.runes}
              errors={runErrorsRef.current}
              primaryLabel={wrongIds.length > 0 && !reviewMode
                ? triLang(lang, { ru: 'Закрепить промахи', uk: 'Закріпити промахи', en: 'Fix mistakes', es: 'Repasar fallos', 'pt-BR': 'Corrigir erros', vi: 'Sửa lỗi', id: 'Perbaiki kesalahan', tr: 'Hataları düzelt', pl: 'Popraw błędy' })
                : triLang(lang, { ru: 'К уроку', uk: 'До уроку', en: 'To the lesson', es: 'A la lección', 'pt-BR': 'Para a lição', vi: 'Về bài học', id: 'Ke pelajaran', tr: 'Derse', pl: 'Do lekcji' })}
              onPrimary={() => { fk.tap(); if (wrongIds.length > 0 && !reviewMode) restartWrong(); else backToLesson(); }}
              secondaryLabel={wrongIds.length > 0 && !reviewMode
                ? triLang(lang, { ru: 'К уроку', uk: 'До уроку', en: 'To the lesson', es: 'A la lección', 'pt-BR': 'Para a lição', vi: 'Về bài học', id: 'Ke pelajaran', tr: 'Derse', pl: 'Do lekcji' })
                : triLang(lang, { ru: 'Ещё раз', uk: 'Ще раз', en: 'Again', es: 'Otra vez', 'pt-BR': 'De novo', vi: 'Làm lại', id: 'Ulangi', tr: 'Tekrar', pl: 'Jeszcze raz' })}
              onSecondary={() => { fk.tap(); if (wrongIds.length > 0 && !reviewMode) backToLesson(); else restartAll(); }}
              onClose={() => { fk.tap(); backToLesson(); }}
            />
          )}
          {/* зачем (владелец 01.10, макет): вспышки поверх итога нет — итог сам показывает результат. */}
        </View>
        </ContentWrap>

        <NoEnergyModal variant="learn" visible={noEnergyModalOpen} onClose={onCloseEnergyModal} activity="preposition_drill" />
      </View>
    </ScreenGradient>
  );
}

export default withLessonRuntimeAccessBoundary(PrepositionDrillScreen, { defaultLessonId: 0 });
