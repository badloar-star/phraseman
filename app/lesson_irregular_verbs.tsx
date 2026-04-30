import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudio } from '../hooks/use-audio';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  InteractionManager,
  Keyboard,
  ScrollView,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { stringsForLang, useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { triLang, type Lang } from '../constants/i18n';
import { useTheme } from '../components/ThemeContext';
import XpGainBadge from '../components/XpGainBadge';
import { useEnergy } from '../components/EnergyContext';
import LessonEnergyLightning from '../components/LessonEnergyLightning';
import NoEnergyModal from '../components/NoEnergyModal';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { updateMultipleTaskProgress } from './daily_tasks';
import { MOTION_SCALE } from '../constants/motion';
import { loadSettings } from './settings_edu';
import { IRREGULAR_VERBS_BY_LESSON, IrregularVerb } from './irregular_verbs_data';
import { registerXP } from './xp_manager';
import { addShards } from './shards_system';
import ReportErrorButton from '../components/ReportErrorButton';
import AddToFlashcard from '../components/AddToFlashcard';

export { IRREGULAR_VERB_COUNT_BY_LESSON, LESSONS_WITH_IRREGULAR_VERBS } from './irregular_verbs_data';

const REQUIRED = 3;
const POINTS_PER_VERB = 3;
/** Как в «Словаре»: короткая пауза на подсветку; озвучка правильного ответа — сразу при тапе (не после таймера). */
const ANSWER_FEEDBACK_MS = { correct: 800, wrong: 400 } as const;
export const GLOBAL_IRREGULAR_KEY = 'irregular_verbs_global';

// ── Mini hexagon ──────────────────────────────────────────────────────────────
function MiniHex({ filled, size = 16 }: { filled: boolean; size?: number }) {
  const { theme: t } = useTheme();
  const w = size; const h = w * 0.866; const tip = w / 4; const mid = w / 2;
  const c = filled ? t.correct : t.bgSurface2;
  return (
    <View style={{ flexDirection: 'row', width: w, height: h }}>
      <View style={{ width: 0, height: 0, borderTopWidth: h/2, borderBottomWidth: h/2, borderRightWidth: tip, borderTopColor:'transparent', borderBottomColor:'transparent', borderRightColor: c, marginRight: -1 }} />
      <View style={{ width: mid + 2, height: h, backgroundColor: c }} />
      <View style={{ width: 0, height: 0, borderTopWidth: h/2, borderBottomWidth: h/2, borderLeftWidth: tip, borderTopColor:'transparent', borderBottomColor:'transparent', borderLeftColor: c, marginLeft: -1 }} />
    </View>
  );
}

// ── Learn Tab (One-form-at-a-time tap mechanic) ────────────────────────────────
type BtnState = 'idle' | 'correct' | 'wrong';

const FORM_SEQ = ['past', 'pp', 'base'] as const;
type FormKey = typeof FORM_SEQ[number];

function formRowMeta(lang: Lang): Record<FormKey, { label: string; color: string; bg: string }> {
  const sv = stringsForLang(lang).verbs;
  return {
    base: { label: `V1 · ${sv.base}`, color: '#4CAF50', bg: 'rgba(76,175,80,0.14)' },
    past: { label: `V2 · ${sv.past}`, color: '#4A9EFF', bg: 'rgba(74,158,255,0.14)' },
    pp:   { label: `V3 · ${sv.pp}`, color: '#C084FC', bg: 'rgba(192,132,252,0.14)' },
  };
}

/** Equivalentes en español (estándar neutro) por lemma — alineados con el sentido pedagógico de ru/uk en datos. */
const IRREGULAR_VERB_ES_BY_BASE: Record<string, string> = {
  be: 'Ser / estar',
  break: 'Romper',
  build: 'Construir',
  drink: 'Beber',
  speak: 'Hablar',
  understand: 'Entender',
  know: 'Saber / conocer',
  eat: 'Comer',
  buy: 'Comprar',
  read: 'Leer',
  come: 'Venir',
  write: 'Escribir',
  drive: 'Conducir',
  feel: 'Sentir',
  forget: 'Olvidar',
  take: 'Tomar',
  teach: 'Enseñar',
  wear: 'Llevar (puesto)',
  cost: 'Costar',
  see: 'Ver',
  pay: 'Pagar',
  sell: 'Vender',
  lose: 'Perder',
  spend: 'Gastar',
  do: 'Hacer',
  send: 'Enviar',
  go: 'Ir',
  find: 'Encontrar',
  hear: 'Oír',
  sing: 'Cantar',
  sleep: 'Dormir',
  leave: 'Salir / dejar',
  keep: 'Mantener',
  meet: 'Conocer',
  put: 'Poner',
  get: 'Conseguir',
  have: 'Tener',
  spring: 'Saltar',
  show: 'Mostrar',
  choose: 'Elegir',
  bring: 'Traer',
  make: 'Hacer',
  give: 'Dar',
  tell: 'Contar',
  say: 'Decir',
  cut: 'Cortar',
  shut: 'Cerrar',
  seek: 'Buscar',
  fight: 'Pelear / luchar',
  light: 'Encender',
  sweep: 'Barrer',
  weep: 'Llorar',
  bend: 'Doblar',
  split: 'Partir',
  stink: 'Oler mal',
  kneel: 'Arrodillarse',
  spill: 'Derramar',
  deal: 'Tratar (con)',
  hang: 'Colgar',
  lay: 'Poner',
  stick: 'Pegar',
  tear: 'Rasgar',
  set: 'Colocar',
  flee: 'Huir',
  shine: 'Brillar',
  sting: 'Picar',
  strive: 'Esforzarse',
  thrive: 'Prosperar',
  cling: 'Aferrarse',
  fling: 'Arrojar',
  sling: 'Lanzar',
  let: 'Dejar',
  shrink: 'Encogerse',
  slink: 'Escabullirse',
  strew: 'Esparcir',
  slay: 'Matar',
  smite: 'Golpear',
  lie: 'Estar echado',
  stand: 'Estar de pie',
  steal: 'Robar',
  ride: 'Montar',
  forbid: 'Prohibir',
  lend: 'Prestar',
  win: 'Ganar',
  catch: 'Atrapar',
  run: 'Correr',
  burn: 'Arder',
  hold: 'Sostener',
  hurt: 'Herir',
  dwell: 'Residir',
  overcome: 'Superar',
  fly: 'Volar',
  lead: 'Guiar',
  begin: 'Empezar',
  fall: 'Caer',
  shake: 'Sacudir',
  hit: 'Golpear',
};

function irregularVerbTranslation(verb: IrregularVerb, lang: Lang): string {
  if (lang === 'uk') return verb.uk;
  if (lang === 'es') return IRREGULAR_VERB_ES_BY_BASE[verb.base] ?? verb.ru;
  return verb.ru;
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Extra distractors if the lesson pool is too small to build 3 unique wrong answers
const OPTION_FALLBACK_POOL: readonly string[] = [
  'went', 'took', 'saw', 'came', 'gave', 'knew', 'found', 'left', 'held', 'bought', 'sold', 'drove', 'wrote', 'spoke', 'ate', 'drank', 'told', 'sent', 'built', 'fought', 'flew', 'drew', 'grew', 'paid', 'shut', 'slept', 'brought', 'caught', 'taught', 'wore', 'won', 'forgot', 'chose', 'broke', 'fell', 'stole', 'swam', 'rose', 'woke', 'began',
];

// Returns 4 options: correct + 3 distractors.
// Priority: unique forms of the same verb (V1/V2/V3 excluding correct), then similar-form from other verbs.
function make4Options(correct: string, verb: IrregularVerb, allVerbs: IrregularVerb[], formKey: FormKey): string[] {
  const score = (w: string) => {
    if (!w || !correct) return 0;
    let s = 0;
    if (w[0] === correct[0]) s += 2;
    if (w.slice(-2) === correct.slice(-2)) s += 3;
    if (w.slice(-3) === correct.slice(-3)) s += 2;
    return s;
  };

  const correctLow = (correct || '').toLowerCase();

  // Unique forms of the same verb (excluding the correct answer)
  const ownForms = [verb.base, verb.past, verb.pp]
    .filter(f => f.toLowerCase() !== correctLow);
  const uniqueOwn = [...new Set(ownForms)];

  // External candidates: same form from other verbs, similar to correct
  const candidates = allVerbs
    .filter(v => v.base !== verb.base)
    .map(v => v[formKey])
    .filter((f): f is string => typeof f === 'string' && f.length > 0)
    .filter(f => f.toLowerCase() !== correctLow);
  const deduped = [...new Set(candidates)];
  const sorted = shuffleArr(deduped).sort((a, b) => score(b) - score(a));

  // Fill up to 3 distractors: own forms first, then external
  const seen = new Set<string>([correctLow]);
  const distractors: string[] = [];
  for (const w of [...shuffleArr(uniqueOwn), ...sorted]) {
    if (distractors.length >= 3) break;
    if (!w) continue;
    const k = w.toLowerCase();
    if (!seen.has(k)) { seen.add(k); distractors.push(w); }
  }

  const out: string[] = [correct, ...distractors];
  for (const w of OPTION_FALLBACK_POOL) {
    if (out.length >= 4) break;
    const k = w.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(w); }
  }
  let pad = 0;
  while (out.length < 4) {
    const filler = `opt${pad++}`;
    if (!seen.has(filler)) { seen.add(filler); out.push(filler); }
  }

  return shuffleArr(out);
}

function initialOptionsForFirstStep(verbs: IrregularVerb[], allVerbs: IrregularVerb[]): string[] {
  if (verbs.length === 0) return [];
  const v0 = verbs[0];
  const correct = v0.past;
  return make4Options(correct, v0, allVerbs, 'past');
}

function LearnTab({ verbs, allVerbs, lang, initCounts, onUpdate, onReset, lessonId, onNoEnergy }: {
  verbs: IrregularVerb[];
  allVerbs: IrregularVerb[];
  lang: Lang;
  initCounts: Record<string, number>;
  onUpdate: (base: string, count: number) => void;
  onReset: () => void;
  lessonId?: number;
  onNoEnergy: () => void;
}) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { theme: t, f, themeMode } = useTheme();
  const router = useRouter();
  const pack = stringsForLang(lang);
  const formMeta = formRowMeta(lang);
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';

  const { energy: currentEnergy, isUnlimited: testerEnergyDisabled, spendOne } = useEnergy();
  const currentEnergyRef = useRef(currentEnergy);
  const testerEnergyDisabledRef = useRef(testerEnergyDisabled);
  const spendOneRef = useRef(spendOne);
  useEffect(() => { currentEnergyRef.current = currentEnergy; }, [currentEnergy]);
  useEffect(() => { testerEnergyDisabledRef.current = testerEnergyDisabled; }, [testerEnergyDisabled]);
  useEffect(() => { spendOneRef.current = spendOne; }, [spendOne]);

  const onNoEnergyRef = useRef(onNoEnergy);
  useEffect(() => { onNoEnergyRef.current = onNoEnergy; }, [onNoEnergy]);

  const [queue, setQueue] = useState<IrregularVerb[]>(() => [...verbs]);
  const [pos, setPos] = useState(0);
  // step: 0=ask past, 1=ask pp, 2=ask base (mirrors original FORM_SEQ order)
  const [step, setStep] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({ ...initCounts });
  const [learnedCnt, setLearnedCnt] = useState(0);
  const [totalPts, setTotalPts] = useState(0);
  const [allDone, setAllDone] = useState(verbs.length === 0);
  const [userName, setUserName] = useState('');

  const [options, setOptions] = useState<string[]>(() => initialOptionsForFirstStep(verbs, allVerbs));
  const [btnStates, setBtnStates] = useState<BtnState[]>(['idle', 'idle', 'idle', 'idle']);
  const [phase, setPhase] = useState<'answering' | 'feedback'>('answering');
  const [feedbackCorrect, setFeedbackCorrect] = useState(true);
  const hadErrorThisVerb = useRef(false);

  const xpTranslateY = useRef(new Animated.Value(40)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const [xpToastAmount, setXpToastAmount] = useState(POINTS_PER_VERB);
  const locked = useRef(false);
  const [speechRate, setSpeechRate] = useState(0.9);
  const showXpToast = useCallback((amount: number = POINTS_PER_VERB) => {
    const a = Number.isFinite(amount) && amount >= 0 ? amount : POINTS_PER_VERB;
    setXpToastAmount(a);
    xpTranslateY.setValue(40);
    xpOpacity.setValue(0);
    setXpToastVisible(true);
    const easeIn = Easing.out(Easing.cubic);
    const easeOut = Easing.in(Easing.cubic);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(xpTranslateY, { toValue: 0, duration: 420, easing: easeIn, useNativeDriver: true }),
        Animated.timing(xpOpacity, { toValue: 1, duration: 400, easing: easeIn, useNativeDriver: true }),
      ]),
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(xpOpacity, { toValue: 0, duration: 480, easing: easeOut, useNativeDriver: true }),
        Animated.timing(xpTranslateY, { toValue: -12, duration: 480, easing: easeOut, useNativeDriver: true }),
      ]),
    ]).start(() => setXpToastVisible(false));
  }, [xpOpacity, xpTranslateY]);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
    loadSettings().then(s => setSpeechRate(s.speechRate ?? 0.9));
  }, []);

  const buildStep = useCallback((verb: IrregularVerb, stepIdx: number) => {
    const form = FORM_SEQ[stepIdx];
    const correct = form === 'past' ? verb.past : form === 'pp' ? verb.pp : verb.base;
    setOptions(make4Options(correct, verb, allVerbs, form));
    setBtnStates(['idle', 'idle', 'idle', 'idle']);
    setPhase('answering');
    locked.current = false;
  }, [allVerbs]);

  const initVerb = useCallback((verb: IrregularVerb) => {
    setStep(0);
    hadErrorThisVerb.current = false;
    buildStep(verb, 0);
  }, [buildStep]);

  // До useEffect варианты были [] → первый кадр рисовал пустой низ. useLayoutEffect + начальный state — всегда 4 кнопки.
  useLayoutEffect(() => {
    if (queue.length > 0) initVerb(queue[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goNextVerb = useCallback((curQueue: IrregularVerb[], curPos: number) => {
    if (curQueue.length === 0) {
      setAllDone(true);
      // Осколок за завершение раздела неправильных глаголов (единоразово) — глобальная модалка в _layout
      const key = `lesson${lessonId ?? 0}_irregular_shards_granted`;
      void AsyncStorage.getItem(key).then(done => {
        if (!done) {
          void addShards('lesson_completed').catch(() => {});
          void AsyncStorage.setItem(key, '1');
        }
      }).catch(() => {});
      return;
    }
    setPos(curPos % curQueue.length);
    setQueue(curQueue);
    initVerb(curQueue[curPos % curQueue.length]);
  }, [initVerb, lessonId]);

  const handleTap = useCallback(async (word: string, btnIdx: number) => {
    if (locked.current || phase !== 'answering') return;
    // Блокируем если энергия кончилась
    if (!testerEnergyDisabledRef.current && currentEnergyRef.current <= 0) {
      onNoEnergyRef.current();
      return;
    }
    locked.current = true;

    const verb = queue[pos % Math.max(queue.length, 1)];
    if (!verb) return;
    const form = FORM_SEQ[step];
    const correct = form === 'past' ? verb.past : form === 'pp' ? verb.pp : verb.base;
    const isCorrect = word === correct;

    // Show feedback on buttons
    const newStates: BtnState[] = options.map((opt, i) => {
      if (opt === correct) return 'correct';
      if (i === btnIdx && !isCorrect) return 'wrong';
      return 'idle';
    });
    setBtnStates(newStates);
    setFeedbackCorrect(isCorrect);
    setPhase('feedback');

    if (isCorrect) {
      void hapticSuccess();
      InteractionManager.runAfterInteractions(() => {
        speakAudio(correct, speechRate);
      });
    } else {
      void hapticError();
      hadErrorThisVerb.current = true;

      // Тратим энергию при ошибке
      if (!testerEnergyDisabledRef.current) {
        const energyBefore = currentEnergyRef.current;
        spendOneRef.current().then(success => {
          if (success && energyBefore === 1) {
            setTimeout(() => { onNoEnergyRef.current(); }, 800);
          }
        }).catch(() => {});
      }
    }

    // Advance after short delay (озвучка — сразу выше, без ожидания таймера)
    setTimeout(async () => {
      const nextStep = step + 1;
      if (nextStep < FORM_SEQ.length) {
        // Next form of same verb
        setStep(nextStep);
        buildStep(verb, nextStep);
      } else {
        // Verb complete (все 3 формы отвечены)
        const noErrors = !hadErrorThisVerb.current && isCorrect;
        if (noErrors) {
          // Correct — mark as learned
          const newCount = 3;
          const newCounts = { ...counts, [verb.base]: newCount };
          setCounts(newCounts);
          onUpdate(verb.base, newCount);
          AsyncStorage.getItem(GLOBAL_IRREGULAR_KEY).then(raw => {
            const g: Record<string, number> = raw ? JSON.parse(raw) : {};
            g[verb.base] = newCount;
            AsyncStorage.setItem(GLOBAL_IRREGULAR_KEY, JSON.stringify(g));
          });
          setLearnedCnt(c => c + 1);
          updateMultipleTaskProgress([{ type: 'verb_learned' }, { type: 'daily_active' }]);
          showXpToast(POINTS_PER_VERB);
          if (userName) {
            setTotalPts(p => p + POINTS_PER_VERB);
            registerXP(POINTS_PER_VERB, 'verb_learned', userName, lang)
              .then((r) => {
                const d = r?.finalDelta;
                if (typeof d === 'number' && Number.isFinite(d) && d >= 0) {
                  setXpToastAmount(d);
                }
              })
              .catch(() => {});
          }
          const nq = [...queue];
          nq.splice(pos % nq.length, 1);
          goNextVerb(nq, pos % Math.max(nq.length - 1, 1));
        } else {
          // Had errors — put verb back at end of queue for retry
          const nq = [...queue];
          const current = nq.splice(pos % nq.length, 1)[0];
          nq.push(current);
          goNextVerb(nq, pos % Math.max(nq.length, 1));
        }
      }
    }, isCorrect ? ANSWER_FEEDBACK_MS.correct : ANSWER_FEEDBACK_MS.wrong);
  }, [phase, queue, pos, step, options, counts, userName, lang, onUpdate, showXpToast, buildStep, goNextVerb, speakAudio, speechRate]);

  if (allDone) return (
    <>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 20 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="checkmark-done-outline" size={36} color={t.correct} />
        </View>
        <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '700' }}>
          {triLang(lang, {
            ru: 'Все глаголы выучены!',
            uk: 'Всі дієслова вивчено!',
            es: '¡Has aprendido todos los verbos!',
          })}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: f.bodyLg }}>{learnedCnt} / {verbs.length}</Text>
        {totalPts > 0 && (
          <View style={{ flexDirection: 'row', gap: 6, backgroundColor: t.correctBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Ionicons name="star" size={16} color={t.correct} />
            <Text style={{ color: t.correct, fontSize: f.bodyLg, fontWeight: '700' }}>{pack.words.plusPoints(totalPts)}</Text>
          </View>
        )}
        <TouchableOpacity
          style={{ backgroundColor: t.correct, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '700' }}>
            {triLang(lang, { ru: '← К уроку', uk: '← До уроку', es: '← Volver a la lección' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: t.bgCard, paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={() => { hapticTap(); onReset(); }}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={18} color={t.textSecond} />
          <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '600' }}>
            {triLang(lang, { ru: 'Начать заново', uk: 'Спочатку', es: 'Desde el principio' })}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const verb = queue[pos % Math.max(queue.length, 1)];
  if (!verb) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center' }}>
          {triLang(lang, {
            ru: 'Что-то пошло не так. Вернитесь к уроку или откройте вкладку «Словарь» и нажмите «Начать тренировку» снова.',
            uk: 'Щось пішло не так. Поверніться до уроку або відкрийте вкладку «Словник» і натисніть «Почати тренування» знову.',
            es: 'Algo salió mal. Vuelve a la lección o abre «Vocabulario» y pulsa «Empieza a practicar» otra vez.',
          })}
        </Text>
      </View>
    );
  }

  const form = FORM_SEQ[step];
  const meta = formMeta[form];
  const correctAnswer = form === 'past' ? verb.past : form === 'pp' ? verb.pp : verb.base;

  // Context chain — show known forms, blank for current
  const chainForms: { key: FormKey; value: string; isTarget: boolean }[] = [
    { key: 'base', value: verb.base, isTarget: form === 'base' },
    { key: 'past', value: verb.past, isTarget: form === 'past' },
    { key: 'pp',   value: verb.pp,   isTarget: form === 'pp'   },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* XP Toast */}
      {xpToastVisible && (
        <Animated.View style={{
          position: 'absolute', top: 50, alignSelf: 'center', zIndex: 999,
          backgroundColor: isLightTheme ? '#92400E' : '#FFC800', borderRadius: 20,
          paddingHorizontal: 18, paddingVertical: 8,
          opacity: xpOpacity,
          transform: [{ translateY: xpTranslateY }],
        }}>
          <XpGainBadge
            amount={xpToastAmount}
            visible={xpToastVisible}
            noInnerAnimation
            style={{ color: isLightTheme ? '#FFF3C4' : '#000', fontSize: 16, fontWeight: '800' }}
          />
        </Animated.View>
      )}

      {/* ── Top card area ── */}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, justifyContent: 'space-between' }}>

        {/* Progress */}
        <View style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: t.textMuted, fontSize: f.label }}>
              {triLang(lang, {
                ru: `${learnedCnt} / ${verbs.length} выучено`,
                uk: `${learnedCnt} / ${verbs.length} вивчено`,
                es: `${learnedCnt} / ${verbs.length} aprendidos`,
              })}
            </Text>
            <Text style={{ color: learnedCnt > 0 ? t.correct : t.textMuted, fontSize: f.label, fontWeight: '600' }}>
              {Math.min(Math.round((learnedCnt / Math.max(verbs.length, 1)) * 100), 100)}%
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: t.border, borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.min((learnedCnt / Math.max(verbs.length, 1)) * 100, 100)}%` as any, backgroundColor: t.correct, borderRadius: 2 }} />
          </View>
        </View>

        {/* Card */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          {/* Form badge */}
          <View style={{ backgroundColor: meta.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: meta.color + '60' }}>
            <Text style={{ color: meta.color, fontSize: f.label, fontWeight: '700', letterSpacing: 0.4 }}>{meta.label}</Text>
          </View>

          {/* Translation */}
          <Text style={{ color: t.textGhost, fontSize: f.body, textAlign: 'center' }}>
            {irregularVerbTranslation(verb, lang)}
          </Text>

          {/* Chain with blank */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {chainForms.map((cf, i) => (
              <React.Fragment key={cf.key}>
                {i > 0 && <Text style={{ color: t.textGhost, fontSize: f.bodyLg }}>→</Text>}
                {cf.isTarget ? (
                  <View style={{
                    borderBottomWidth: 2,
                    borderBottomColor: phase === 'feedback'
                      ? (feedbackCorrect ? meta.color : t.wrong)
                      : meta.color,
                    paddingHorizontal: 8, paddingBottom: 2, minWidth: 60, alignItems: 'center',
                  }}>
                    <Text style={{
                      color: phase === 'feedback'
                        ? (feedbackCorrect ? meta.color : t.wrong)
                        : meta.color,
                      fontSize: f.h1, fontWeight: '700', letterSpacing: 0.5,
                    }}>
                      {phase === 'feedback' ? correctAnswer : '?'}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '400' }}>{cf.value}</Text>
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Step dots — aligned to visual chain order (base→past→pp) */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {chainForms.map((cf, i) => {
              const isDone = (FORM_SEQ.slice(0, step) as readonly string[]).includes(cf.key);
              return (
                <View key={i} style={{
                  width: cf.isTarget ? 20 : 8, height: 8, borderRadius: 4,
                  backgroundColor: isDone ? t.correct : cf.isTarget ? meta.color : t.border,
                }} />
              );
            })}
          </View>
        </View>
      </View>

      {/* ── Bottom buttons (sticky, thumb zone) ── */}
      <View style={{
        paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12,
        gap: 10,
        borderTopWidth: 0.5, borderTopColor: t.border,
        backgroundColor: t.bgPrimary,
      }}>
        {[options.slice(0, 2), options.slice(2, 4)].map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', gap: 10 }}>
            {row.map((word, colIdx) => {
              const idx = rowIdx * 2 + colIdx;
              const state = btnStates[idx];
              const bg = state === 'correct' ? t.correctBg
                       : state === 'wrong'   ? 'rgba(240,84,84,0.15)'
                       : t.bgCard;
              const border = state === 'correct' ? t.correct
                           : state === 'wrong'   ? t.wrong
                           : t.border;
              const color = state === 'correct' ? t.correct
                          : state === 'wrong'   ? t.wrong
                          : t.textPrimary;
              return (
                <TouchableOpacity
                  key={idx}
                  disabled={phase !== 'answering'}
                  onPress={() => { hapticTap(); handleTap(word, idx); }}
                  activeOpacity={0.75}
                  style={{
                    flex: 1, paddingVertical: 16, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: bg, borderWidth: 1.5, borderColor: border,
                  }}
                >
                  <Text style={{ color, fontSize: f.bodyLg, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>
                    {word}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {verb && (
        <ReportErrorButton
          screen="lesson_irregular_verbs"
          dataId={`irregular_verb_${verb.base}`}
          dataText={[
            triLang(lang, {
              ru: `Глагол: ${verb.base} / ${verb.past} / ${verb.pp}`,
              uk: `Дієслово: ${verb.base} / ${verb.past} / ${verb.pp}`,
              es: `Verbo: ${verb.base} / ${verb.past} / ${verb.pp}`,
            }),
            triLang(lang, {
              ru: `Целевая форма: ${form}`,
              uk: `Цільова форма: ${form}`,
              es: `Forma objetivo: ${form}`,
            }),
            triLang(lang, {
              ru: `Варианты: ${options.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              uk: `Варіанти: ${options.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              es: `Opciones: ${options.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
            }),
          ].join('\n')}
          style={{ alignSelf: 'flex-end', marginTop: 4, marginBottom: 4 }}
        />
      )}

    </View>
  );
}

// ── Dictionary Tab ────────────────────────────────────────────────────────────
const COL = { base: 130, past: 110, pp: 130, tr: 260, save: 40 };
const TABLE_W = COL.base + COL.past + COL.pp + COL.tr + COL.save + 32;

function IrregVerbsScrollTable({ t, f, lang, allVerbs, globalCounts, speechRate, lessonId }: {
  t: any; f: any; lang: Lang;
  allVerbs: IrregularVerb[];
  globalCounts: Record<string, number>;
  speechRate: number;
  lessonId?: number;
}) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [containerW, setContainerW] = useState(0);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const sv = stringsForLang(lang).verbs;
  const tapCloseHint = stringsForLang(lang).words.listTapToClose;
  const canScroll = containerW > 0 && TABLE_W > containerW;
  const thumbW = canScroll ? Math.max(40, (containerW / TABLE_W) * (containerW - 32)) : 0;
  const trackW = containerW - 32;
  const thumbTranslate = canScroll
    ? scrollX.interpolate({ inputRange: [0, TABLE_W - containerW], outputRange: [0, trackW - thumbW], extrapolate: 'clamp' })
    : new Animated.Value(0);

  return (
    <View onLayout={e => setContainerW(e.nativeEvent.layout.width)} style={{ position:'relative' }}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={true}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        <View style={{ minWidth: TABLE_W }}>
          <View style={{ flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: t.border }}>
            <Text style={{ width: COL.base, color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>{sv.base}</Text>
            <Text style={{ width: COL.past, color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>{sv.past}</Text>
            <Text style={{ width: COL.pp,   color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>{sv.pp}</Text>
            <Text style={{ width: COL.tr,   color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>{sv.tr}</Text>
            <View style={{ width: COL.save }} />
          </View>
          {allVerbs.map(verb => {
            const count = globalCounts[verb.base] ?? 0;
            const learned = count >= REQUIRED;
            return (
              <View
                key={verb.base}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: t.border }}
              >
                <TouchableOpacity
                  onPress={() => speakAudio(verb.base, speechRate)}
                  activeOpacity={0.6}
                  style={{ width: COL.base, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[0, 1, 2].map(i => <MiniHex key={i} filled={count > i} size={9} />)}
                  </View>
                  <Text style={{ color: learned ? t.correct : t.textPrimary, fontSize: f.body, fontWeight: '600', flexShrink: 0 }}>{verb.base}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => speakAudio(verb.past, speechRate)}
                  activeOpacity={0.6}
                  style={{ width: COL.past }}
                >
                  <Text style={{ color: t.textSecond, fontSize: f.body, flexShrink: 0 }}>{verb.past}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => speakAudio(verb.pp, speechRate)}
                  activeOpacity={0.6}
                  style={{ width: COL.pp }}
                >
                  <Text style={{ color: t.textSecond, fontSize: f.body, flexShrink: 0 }}>{verb.pp}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTooltip(irregularVerbTranslation(verb, lang))} activeOpacity={0.7} style={{ width: COL.tr }}>
                  <Text style={{ color: t.textMuted, fontSize: f.sub, flexShrink: 0 }}>{irregularVerbTranslation(verb, lang)}</Text>
                </TouchableOpacity>
                <View style={{ width: COL.save, alignItems: 'center', justifyContent: 'center' }}>
                  <AddToFlashcard
                    en={`${verb.base} / ${verb.past} / ${verb.pp}`}
                    ru={verb.ru}
                    uk={verb.uk}
                    source="verb"
                    size={18}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Кастомный индикатор горизонтального скролла */}
      {canScroll && (
        <View style={{ height: 4, marginTop: 4, marginHorizontal: 16, backgroundColor: t.border, borderRadius: 2, overflow: 'hidden' }}>
          <Animated.View style={{ height: 4, width: thumbW, borderRadius: 2, backgroundColor: '#4A90E2', transform: [{ translateX: thumbTranslate }] }} />
        </View>
      )}

      <ReportErrorButton
        screen="lesson_irregular_verbs"
        dataId={`irregular_verbs_list_lesson_${lessonId ?? 0}`}
        dataText={triLang(lang, {
          ru: `Список неправильных глаголов урока ${lessonId ?? ''}`,
          uk: `Список неправильних дієслів уроку ${lessonId ?? ''}`,
          es: `Lista de verbos irregulares de la lección ${lessonId ?? ''}`,
        })}
        style={{ alignSelf: 'flex-end', marginHorizontal: 16, marginTop: 8 }}
      />

      {tooltip !== null && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setTooltip(null)}
          style={{ position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:99 }}
        >
          <View style={{ position:'absolute', top:40, left:16, right:16, backgroundColor:t.bgCard, borderRadius:12, paddingHorizontal:16, paddingVertical:12, elevation:12, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.25, shadowRadius:8, borderWidth:1, borderColor:t.border }}>
            <Text style={{ color:t.textPrimary, fontSize:f.bodyLg, lineHeight:22 }}>{tooltip}</Text>
            <Text style={{ color:t.textMuted, fontSize:f.sub, marginTop:4 }}>{tapCloseHint}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DictTab({ allVerbs, globalCounts, lang, speechRate, lessonId, onStartLearn }: {
  allVerbs: IrregularVerb[];
  globalCounts: Record<string, number>;
  lang: Lang;
  speechRate: number;
  lessonId?: number;
  onStartLearn: () => void;
}) {
  const { theme: t, f } = useTheme();
  const pack = stringsForLang(lang);
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
      <TouchableOpacity
        onPress={onStartLearn}
        style={{ margin: 16, marginBottom: 12, backgroundColor: t.bgCard, borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: t.border, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
      >
        <Ionicons name="pencil-outline" size={18} color={t.textSecond} />
        <Text style={{ color: t.textSecond, fontSize: f.bodyLg, fontWeight: '600' }}>
          {pack.words.listStartTraining}
        </Text>
      </TouchableOpacity>

      <IrregVerbsScrollTable t={t} f={f} lang={lang} allVerbs={allVerbs} globalCounts={globalCounts} speechRate={speechRate} lessonId={lessonId} />
    </ScrollView>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function LessonIrregularVerbs() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const rootPack = stringsForLang(lang);
  const { energy, maxEnergy, isUnlimited: energyUnlimited } = useEnergy();
  const canTrain = energyUnlimited || energy > 0;
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = parseInt(id || '1', 10);
  const allVerbs = IRREGULAR_VERBS_BY_LESSON[lessonId] || [];
  const allVerbsFlat: IrregularVerb[] = Object.values(IRREGULAR_VERBS_BY_LESSON).flat();

  const [noEnergyModalOpen, setNoEnergyModalOpen] = useState(false);
  useEffect(() => {
    if (energyUnlimited || energy > 0) setNoEnergyModalOpen(false);
  }, [energyUnlimited, energy]);

  /** null = по умолчанию «Словарь»; при 0 энергии нельзя остаться в «Учить» */
  const [userTab, setUserTab] = useState<null | 'dict' | 'learn'>(null);
  const tab: 'dict' | 'learn' = userTab !== null ? userTab : 'dict';
  const [globalCounts, setGlobalCounts] = useState<Record<string, number>>({});
  const [speechRate, setSpeechRate] = useState(0.9);
  const [practiceAll, setPracticeAll] = useState(false);
  const [learnTabKey, setLearnTabKey] = useState(0);

  useEffect(() => {
    if (!canTrain) {
      setUserTab(null);
      setPracticeAll(false);
    }
  }, [canTrain]);

  useLayoutEffect(() => {
    setUserTab(null);
    setPracticeAll(false);
  }, [lessonId]);

  useEffect(() => {
    AsyncStorage.getItem(GLOBAL_IRREGULAR_KEY).then(raw => {
      try { setGlobalCounts(raw ? JSON.parse(raw) : {}); } catch {}
    });
    loadSettings().then(s => setSpeechRate(s.speechRate ?? 0.9));
  }, []);

  const verbsToLearn = allVerbs.filter(v => (globalCounts[v.base] ?? 0) < REQUIRED);
  // В режиме practiceAll тренируем все глаголы урока (прогресс не меняется)
  const verbsForLearnTab = practiceAll ? allVerbs : verbsToLearn;
  const title = triLang(lang, {
    ru: 'Неправильные глаголы',
    uk: 'Неправильні дієслова',
    es: rootPack.lessonMenu.verbs,
  });

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TouchableOpacity onPress={() => { hapticTap(); Keyboard.dismiss(); router.back(); }}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '600' }}>{lessonId}. {title}</Text>
            <LessonEnergyLightning energyCount={energy} maxEnergy={maxEnergy} shouldShake={false} />
          </View>

          <View style={{ flex: 1 }}>
            {tab === 'learn' || practiceAll
              ? <LearnTab
                  key={learnTabKey}
                  verbs={verbsForLearnTab}
                  allVerbs={allVerbsFlat}
                  lang={lang}
                  initCounts={globalCounts}
                  lessonId={lessonId}
                  onUpdate={(base, count) => setGlobalCounts(prev => ({ ...prev, [base]: count }))}
                  onReset={() => {
                    setPracticeAll(true);
                    setLearnTabKey(k => k + 1);
                  }}
                  onNoEnergy={() => setNoEnergyModalOpen(true)}
                />
              : <DictTab
                  allVerbs={allVerbs}
                  globalCounts={globalCounts}
                  lang={lang}
                  speechRate={speechRate}
                  lessonId={lessonId}
                  onStartLearn={() => {
                    if (!canTrain) {
                      setNoEnergyModalOpen(true);
                      return;
                    }
                    setUserTab('learn');
                  }}
                />
            }
          </View>

          {/* Tab bar — Словарь first, Учить second */}
          <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: t.border }}>
            {(['dict', 'learn'] as const).map(key => {
              const isActive = tab === key;
              const label = key === 'dict'
                ? triLang(lang, {
                    ru: 'Словарь',
                    uk: 'Словник',
                    es: rootPack.lessonMenu.vocab,
                  })
                : triLang(lang, {
                    ru: 'Учить',
                    uk: 'Учити',
                    es: rootPack.words.training,
                  });
              const icon: any = key === 'dict'
                ? (isActive ? 'list' : 'list-outline')
                : (isActive ? 'flash' : 'flash-outline');
              return (
                <TouchableOpacity key={key}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 8, borderTopWidth: isActive ? 2 : 0, borderTopColor: t.textSecond }}
                  onPress={() => {
                    Keyboard.dismiss();
                    if (key === 'learn') {
                      if (!canTrain) {
                        setNoEnergyModalOpen(true);
                        return;
                      }
                    }
                    setUserTab(key);
                    if (key === 'dict') setPracticeAll(false);
                  }}
                >
                  <Ionicons name={icon} size={20} color={isActive ? t.textSecond : t.textGhost} />
                  <Text style={{ color: isActive ? t.textSecond : t.textGhost, fontSize: f.body, fontWeight: '500' }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ContentWrap>

        <NoEnergyModal visible={noEnergyModalOpen} onClose={() => setNoEnergyModalOpen(false)} />
      </SafeAreaView>
    </ScreenGradient>
  );
}
