// ═══════════════════════════════════════════════════════════════════════════
// DialogueIncomingCall.tsx — m16 «Диалог: звонок → брифинг → переписка», шаг «Входящий звонок» (эталон engagement-moments-v3-all.html `callStep`).
//
// зачем (владелец 15.10: «сразу делаем и сразу включаем»; звонок одобрен 14.10): человек сначала «берёт трубку», потом видит ВСЕ задания и только потом говорит —
// страх «что от меня хотят» снят до первого слова. Экран поверх брифинга: «Входящий · диалог A1», плитка собеседника выпрыгивает (emPop), два кольца расходятся
// (emRing 1,6 с, второе с 0,55 с), «{Имя} звонит», название сцены; «Потом» — назад, «Ответить» пульсирует (emPulse 1,2 с) и открывает брифинг (проявление 420 мс).
// Ничего не пишет и не тратит (энергия — по-прежнему на «Начать диалог» брифинга). reduced-motion — без колец и пульса. Журнал [MOMENT-m16].
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { triLang, type Lang } from '../../constants/i18n';
import { hapticLightImpact } from '../../hooks/use-haptics';
import { LinearGradient } from '../SafeLinearGradient';
import type { DialogueGlass } from './glass/DialogueGlassKit';

const LOG = '[MOMENT-m16]';
const EASE = Easing.bezier(0.2, 1, 0.3, 1); // --em-ease
const EASE_POP = Easing.bezier(0.3, 1.6, 0.5, 1); // --em-ease-pop
/** Тайминги образца, мс. */
export const INCOMING_CALL_TIMELINE = { pop: 500, ring: 1600, ring2Delay: 550, pulse: 1200, reveal: 420, textUp: 500 } as const;

export function incomingCallText(lang: Lang) {
  return {
    incoming: (lvl: string) => triLang(lang, { ru: `Входящий · диалог ${lvl}`, uk: `Вхідний · діалог ${lvl}`, en: `Incoming · ${lvl} dialogue`, es: `Llamada entrante · diálogo ${lvl}`, 'pt-BR': `Chamada recebida · diálogo ${lvl}`, vi: `Cuộc gọi đến · hội thoại ${lvl}`, id: `Panggilan masuk · dialog ${lvl}`, tr: `Gelen arama · ${lvl} diyalog`, pl: `Połączenie przychodzące · dialog ${lvl}`, fr: `Appel entrant · dialogue ${lvl}`, de: `Eingehender Anruf · Dialog ${lvl}` }),
    calling: (name: string) => triLang(lang, { ru: `${name} звонит`, uk: `${name} телефонує`, en: `${name} is calling`, es: `${name} te llama`, 'pt-BR': `${name} está ligando`, vi: `${name} đang gọi`, id: `${name} menelepon`, tr: `${name} arıyor`, pl: `${name} dzwoni`, fr: `${name} t’appelle`, de: `${name} ruft an` }),
    partner: triLang(lang, { ru: 'Собеседник', uk: 'Співрозмовник', en: 'Your partner', es: 'Tu interlocutor', 'pt-BR': 'Seu parceiro', vi: 'Người trò chuyện', id: 'Lawan bicara', tr: 'Muhatabın', pl: 'Rozmówca', fr: 'Ton interlocuteur', de: 'Dein Gegenüber' }),
    later: triLang(lang, { ru: 'Потом', uk: 'Потім', en: 'Later', es: 'Luego', 'pt-BR': 'Depois', vi: 'Để sau', id: 'Nanti', tr: 'Sonra', pl: 'Później', fr: 'Plus tard', de: 'Später' }),
    answer: triLang(lang, { ru: 'Ответить', uk: 'Відповісти', en: 'Answer', es: 'Contestar', 'pt-BR': 'Atender', vi: 'Trả lời', id: 'Jawab', tr: 'Cevapla', pl: 'Odbierz', fr: 'Répondre', de: 'Annehmen' }),
  };
}

function playCue(event: 'sheet_open' | 'tap'): void {
  hapticLightImpact().catch((error: unknown) => console.warn(`${LOG} хаптик не сработал (${error instanceof Error ? error.message : String(error)})`)); // guard-ok: причина отказа хаптика
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isSoundV2Enabled } = require('../../modules/sound_v2/sound_v2_flag') as typeof import('../../modules/sound_v2/sound_v2_flag');
    if (!isSoundV2Enabled()) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { playEvent } = require('../../modules/sound_v2/sound_bank') as typeof import('../../modules/sound_v2/sound_bank');
    const result = playEvent(event);
    if (!result.played) console.log(`${LOG} звук ${event} не сыграл: ${String(result.reason)}`); // guard-ok: причина отказа движка
  } catch (error) {
    console.warn(`${LOG} звук ${event} не сыграл (${error instanceof Error ? error.message : String(error)})`); // guard-ok: причина отказа
  }
}

const Ring = memo(function Ring({ delay, color, run }: { delay: number; color: string; run: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!run) return undefined;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: INCOMING_CALL_TIMELINE.ring, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(t);
  }, [delay, run, t]);
  // emRing: scale .6 → 2,2, opacity .9 → 0
  const st = useAnimatedStyle(() => ({ opacity: run ? 0.9 * (1 - t.value) : 0, transform: [{ scale: 0.6 + 1.6 * t.value }] }));
  return <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.ring, { shadowColor: color, backgroundColor: 'transparent', borderColor: color }, st]} />; // guard-ok: расходящееся кольцо звонка эталона, не контейнер
});

export type DialogueIncomingCallProps = Readonly<{
  lang: Lang;
  glass: DialogueGlass;
  partnerName: string | null;
  cefr: string;
  sceneTitle: string;
  onAnswer: () => void;
  onLater: () => void;
}>;

function DialogueIncomingCall({ lang, glass, partnerName, cefr, sceneTitle, onAnswer, onLater }: DialogueIncomingCallProps) {
  const reduced = useReducedMotion();
  const c = incomingCallText(lang);
  const name = partnerName ?? c.partner;
  const accent = (glass as DialogueGlass & { accentGraphic?: string }).accentGraphic ?? glass.cta;
  const pop = useSharedValue(reduced ? 1 : 0);
  const text = useSharedValue(reduced ? 1 : 0);
  const pulse = useSharedValue(0);
  const fade = useSharedValue(1);
  const doneRef = useRef(false);

  useEffect(() => {
    console.log(`${LOG} звонок показан: собеседник=${partnerName ?? 'нет имени'} уровень=${cefr} сцена=${sceneTitle.slice(0, 40)} reducedMotion=${String(reduced)}`); // guard-ok: единичный журнал показа
    playCue('sheet_open');
    if (reduced) return undefined;
    pop.value = withTiming(1, { duration: INCOMING_CALL_TIMELINE.pop, easing: EASE_POP });
    text.value = withDelay(200, withTiming(1, { duration: INCOMING_CALL_TIMELINE.textUp, easing: EASE }));
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: INCOMING_CALL_TIMELINE.pulse / 2 }), withTiming(0, { duration: INCOMING_CALL_TIMELINE.pulse / 2 })), -1, false);
    return () => { cancelAnimation(pulse); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий входа играет один раз
  }, []);

  // зачем (аудит Optimistic UI): тап срабатывает один раз; кнопка сразу нажата, слой проявляет брифинг 420 мс и только потом уходит
  const answer = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    console.log(`${LOG} «Ответить» → брифинг`); // guard-ok: журнал выбора
    playCue('tap');
    cancelAnimation(pulse);
    pulse.value = 0;
    if (reduced) { onAnswer(); return; }
    fade.value = withTiming(0, { duration: INCOMING_CALL_TIMELINE.reveal, easing: EASE }, (finished) => { if (finished) runOnJS(onAnswer)(); });
  }, [fade, onAnswer, pulse, reduced]);
  const later = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    console.log(`${LOG} «Потом» → назад`); // guard-ok: журнал выбора
    onLater();
  }, [onLater]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const popStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 1.4), transform: [{ scale: 0.4 + 0.6 * pop.value }] }));
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value, transform: [{ translateY: (1 - text.value) * 18 }] }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * pulse.value }] }));

  return (
    <Reanimated.View style={[StyleSheet.absoluteFill, s.root, fadeStyle]} testID="dialogue-v2-incoming-call" accessibilityViewIsModal>
      {/* `.call`: фон bg2 → bg на 60 % — токены темы */}
      <LinearGradient colors={[glass.bgTop ?? glass.bg, glass.bg]} locations={[0, 0.6]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.body}>
          <Text style={[s.over, { color: glass.secondary }]}>{c.incoming(cefr)}</Text>
          <Reanimated.View style={[s.avatarWrap, popStyle]}>
            {reduced ? null : <><Ring delay={0} color={accent} run /><Ring delay={INCOMING_CALL_TIMELINE.ring2Delay} color={accent} run /></>}
            <View style={[s.avatar, { backgroundColor: glass.opaqueControl }]}>
              <Ionicons name="chatbubbles-outline" size={52} color={glass.text} />
            </View>
          </Reanimated.View>
          <Reanimated.View style={textStyle}>
            <Text accessibilityRole="header" style={[s.title, { color: glass.text }]}>{c.calling(name)}</Text>
            <Text style={[s.sub, { color: glass.secondary }]}>{sceneTitle}</Text>
          </Reanimated.View>
        </View>
        <View style={s.btns}>
          <View style={s.btnCol}>
            <Pressable testID="dialogue-v2-incoming-later" accessibilityRole="button" accessibilityLabel={c.later} onPress={later} hitSlop={8}
              style={({ pressed }) => [s.round, { backgroundColor: glass.opaqueControl, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
              <Ionicons name="close" size={28} color={glass.text} />
            </Pressable>
            <Text style={[s.lbl, { color: glass.secondary }]}>{c.later}</Text>
          </View>
          <View style={s.btnCol}>
            <Reanimated.View style={pulseStyle}>
              <Pressable testID="dialogue-v2-incoming-answer" accessibilityRole="button" accessibilityLabel={c.answer} onPress={answer} hitSlop={8}
                style={({ pressed }) => [s.round, { backgroundColor: glass.cta, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
                <Ionicons name="mic" size={28} color={glass.ctaInk} />
              </Pressable>
            </Reanimated.View>
            <Text style={[s.lbl, { color: glass.secondary }]}>{c.answer}</Text>
          </View>
        </View>
      </SafeAreaView>
    </Reanimated.View>
  );
}

const s = StyleSheet.create({
  root: { zIndex: 50 },
  safe: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  // `.ov`
  over: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' },
  avatarWrap: { marginTop: 22, width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 104, height: 104, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  // `.ring`: круг, светящаяся кромка 2 px цветом акцента
  ring: { borderRadius: 52, borderWidth: 2 }, // guard-ok: расходящееся кольцо звонка (эффект эталона .ring), не контейнер
  // `.h-lg` / `.p`
  title: { marginTop: 18, fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  sub: { marginTop: 4, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  btns: { flexDirection: 'row', justifyContent: 'space-evenly', paddingBottom: 36, paddingHorizontal: 24 },
  btnCol: { alignItems: 'center', gap: 8 },
  round: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  lbl: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
});

export default memo(DialogueIncomingCall);

/**
 * m16: строка задания брифинга после «Ответить» — всплывает по очереди (эталон `.goalline.brow`: с 120 мс через 100 мс, прозрачность 260 мс,
 * сдвиг 10 → 0 и scale .98 → 1 пружиной cubic-bezier(.34,1.56,.64,1) 420 мс). active=false — строка сразу на месте (как раньше).
 */
export const BriefingRevealRow = memo(function BriefingRevealRow({ index, active, children }: { index: number; active: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(active && !reduced ? 0 : 1);
  const o = useSharedValue(active && !reduced ? 0 : 1);
  useEffect(() => {
    if (!active || reduced) return;
    const delay = 120 + index * 100;
    o.value = withDelay(delay, withTiming(1, { duration: 260, easing: EASE }));
    v.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.bezier(0.34, 1.56, 0.64, 1) }));
  }, [active, index, o, reduced, v]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: (1 - v.value) * 10 }, { scale: 0.98 + 0.02 * v.value }] }));
  return <Reanimated.View style={st}>{children}</Reanimated.View>;
});
