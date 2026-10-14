import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { DebugLogger } from '../../app/debug-logger';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang } from '../../constants/i18n';
import { LUM } from '../../constants/motionHybrid';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { soundDirector } from '../../modules/audio/sound_director';
import { useEnergy } from '../EnergyContext';
import EnergyIcon from '../EnergyIcon';
import { emitEnergyToast } from './energy_toasts';
import { useLang } from '../LangContext';
import HybridAlertShell, { CascadeItem } from '../modal_fx/HybridAlertShell';
import { useTheme } from '../ThemeContext';

const TAG = '[ENERGY-NEEDED]';

type Props = Readonly<{
  visible: boolean;
  /** «Подожду» / назад / тап по фону: закрыть шторку, остаться на экране списка. */
  onWait: () => void;
  /** «Продолжить с Plus»: хозяин открывает пейвол (у NoEnergyModal свой порядок «закрыть окно → открыть пейвол»). */
  onPlus: () => void;
  /**
   * Энергии стало достаточно, пока шторка открыта (прошло время восстановления). Задан — экран идёт дальше сам;
   * не задан — шторка просто закрывается через onWait (макет Б8: кнопка «Начать занятие» оживает).
   */
  onRestored?: () => void;
  /** Сколько энергии нужно на старт (в режиме Б — 1). */
  required?: number;
}>;

/** «09:00» / «1:02:03» — как у окна курса. */
function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const ss = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
}

/**
 * Таймер тикает раз в секунду собственным интервалом — перерисовывается только он, экран под шторкой не трогается.
 * Те же часы, что у шкалы энергии: остаток до ближайшей единицы по recoveryEndsAtMs, плюс полные интервалы за каждую недостающую сверх первой.
 */
const Countdown = memo(function Countdown({ missingUnits, color }: { missingUnits: number; color: string }) {
  const { recoveryEndsAtMs, recoveryIntervalMs, timeUntilNextMs } = useEnergy();
  const [mountedAt] = useState(() => Date.now());
  const [now, setNow] = useState(mountedAt);
  // зачем: запасной срок, если часы восстановления неизвестны (recoveryEndsAtMs = 0), фиксируется ОДИН раз от момента показа —
  // две отдельные выборки Date.now() давали «09:01» вместо «09:00» из-за миллисекундной разницы.
  const [fallbackDeadline] = useState(() => mountedAt + (timeUntilNextMs || recoveryIntervalMs));
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  let leftMs = fallbackDeadline - now;
  if (recoveryEndsAtMs > 0 && recoveryIntervalMs > 0) {
    const startedAt = recoveryEndsAtMs - recoveryIntervalMs;
    const elapsed = Math.max(0, now - startedAt);
    const step = elapsed % recoveryIntervalMs;
    const next = step === 0 && elapsed > 0 ? recoveryIntervalMs : recoveryIntervalMs - step;
    leftMs = next + Math.max(0, missingUnits - 1) * recoveryIntervalMs;
  }
  return <Text testID="energy-needed-timer" style={[styles.timer, { color }]} maxFontSizeMultiplier={1.15}>{formatClock(leftMs)}</Text>;
});

/**
 * «Нужна энергия» (режим Б, макет energy-modes-states.html, кадр Б7, `.gsh`): вышел с нулём — новое занятие не начать,
 * пока не восстановилась хотя бы 1 энергия. Шторка снизу с тикающим таймером, пятью ячейками энергии и «Продолжить с Plus».
 */
function EnergyNeededSheet({ visible, onWait, onPlus, onRestored, required = 1 }: Props) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReduceMotion();
  const { energy, bonusEnergy, maxEnergy } = useEnergy();
  const have = energy + bonusEnergy;
  const missing = Math.max(0, required - have);

  useEffect(() => {
    if (!visible) return;
    DebugLogger.info(TAG, `шторка показана energy=${energy} bonus=${bonusEnergy} max=${maxEnergy} required=${required}`);
    soundDirector.request('pm.energy.empty', { scope: 'energy-needed-sheet', dedupeKey: 'visible' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // зачем (макет Б8): энергия вернулась — «Энергия восстановилась» и можно начинать. Взводится, когда шторку показали при нехватке, и
  // остаётся взведённой после «Подожду»: хозяин держит компонент смонтированным даже при visible=false, так что тост придёт и на экране списка.
  // Если шторка ещё открыта — она идёт дальше сама (onRestored) или закрывается (onWait).
  const armedRef = useRef(false);
  useEffect(() => {
    if (visible && missing > 0) armedRef.current = true;
    if (!armedRef.current || missing > 0) return;
    armedRef.current = false;
    DebugLogger.info(TAG, `энергия восстановилась have=${have} required=${required} visible=${String(visible)} → тост${visible ? ` + ${onRestored ? 'onRestored' : 'onWait'}` : ''}`);
    emitEnergyToast('energy_restored');
    if (visible) (onRestored ?? onWait)();
  }, [visible, missing, have, required, onRestored, onWait]);

  const title = triLang(lang, {
    ru: 'Нужна энергия', uk: 'Потрібна енергія', en: 'Energy needed', es: 'Necesitas energía',
    'pt-BR': 'Precisa de energia', vi: 'Cần năng lượng', id: 'Butuh energi', tr: 'Enerji gerekli', pl: 'Potrzebna energia',
  });
  const sub = triLang(lang, {
    ru: `Чтобы начать занятие, нужна ${required} энергия. Следующая вернётся через`,
    uk: `Щоб почати заняття, потрібна ${required} енергія. Наступна повернеться через`,
    en: `You need ${required} energy to start a lesson. The next one comes back in`,
    es: `Necesitas ${required} de energía para empezar. La siguiente vuelve en`,
    'pt-BR': `Você precisa de ${required} de energia para começar. A próxima volta em`,
    vi: `Cần ${required} năng lượng để bắt đầu bài học. Đơn vị tiếp theo sẽ hồi sau`,
    id: `Butuh ${required} energi untuk memulai pelajaran. Berikutnya pulih dalam`,
    tr: `Derse başlamak için ${required} enerji gerekir. Bir sonraki şu sürede yenilenir:`,
    pl: `Do rozpoczęcia lekcji potrzebna ${required} energia. Następna wróci za`,
  });
  const caption = triLang(lang, {
    ru: `энергия ${have} из ${maxEnergy}`, uk: `енергія ${have} з ${maxEnergy}`, en: `energy ${have} of ${maxEnergy}`,
    es: `energía ${have} de ${maxEnergy}`, 'pt-BR': `energia ${have} de ${maxEnergy}`, vi: `năng lượng ${have}/${maxEnergy}`,
    id: `energi ${have} dari ${maxEnergy}`, tr: `enerji ${have}/${maxEnergy}`, pl: `energia ${have} z ${maxEnergy}`,
  });
  const cta = triLang(lang, {
    ru: 'Продолжить с Plus', uk: 'Продовжити з Plus', en: 'Continue with Plus', es: 'Continuar con Plus',
    'pt-BR': 'Continuar com o Plus', vi: 'Tiếp tục với Plus', id: 'Lanjut dengan Plus', tr: 'Plus ile devam et', pl: 'Kontynuuj z Plus',
  });
  const wait = triLang(lang, {
    ru: 'Подожду', uk: 'Зачекаю', en: 'I’ll wait', es: 'Esperaré', 'pt-BR': 'Vou esperar', vi: 'Tôi sẽ chờ', id: 'Saya tunggu', tr: 'Bekleyeceğim', pl: 'Poczekam',
  });

  const cascade = (delay: number, key: string, node: React.ReactNode) => (
    <CascadeItem key={key} delay={delay} reduceMotion={reduceMotion}>{node}</CascadeItem>
  );
  const dots = Array.from({ length: Math.max(1, Math.floor(maxEnergy)) }, (_, i) => i < have);

  return (
    <HybridAlertShell
      visible={visible}
      onRequestClose={() => { DebugLogger.info(TAG, 'back/фон → onWait()'); onWait(); }}
      placement="bottom"
      shadowColor="#000000" // theme-exempt: тень шторки — чёрная в любой теме
      backdropColor="rgba(0,0,0,0.6)" // theme-exempt: затемнение под шторкой — тёмный скрим в любой теме
      testID="energy-needed-sheet"
    >
      <View style={[styles.sheet, { backgroundColor: g.opaqueSheet }]}>
        {cascade(LUM.ladder[1], 'title', (
          <Text accessibilityRole="header" style={[styles.title, { color: g.text }]} testID="energy-needed-title">{title}</Text>
        ))}
        {cascade(LUM.ladder[2], 'sub', (
          <Text style={[styles.sub, { color: g.secondary }]}>{sub}</Text>
        ))}
        {cascade(LUM.ladder[2], 'timer', (
          <View style={styles.timerBox}>
            {visible ? <Countdown missingUnits={Math.max(1, missing)} color={g.text} /> : null}
            <Text style={[styles.caption, { color: g.secondary }]} testID="energy-needed-caption">{caption}</Text>
          </View>
        ))}
        {cascade(LUM.ladder[2], 'dots', (
          <View style={styles.dots} accessible={false}>
            {dots.map((on, i) => (
              <View key={`slot-${i}`} style={[styles.dot, { backgroundColor: on ? g.accent : g.opaqueControl }]}>
                <EnergyIcon filled={on} themeColor={on ? g.accentInk : g.secondary} tintColor={on ? g.accentInk : g.secondary} size={15} animateChange={false} animateLoop={false} />
              </View>
            ))}
          </View>
        ))}
        {cascade(LUM.ladder[3], 'actions', (
          <View style={styles.actions}>
            <TouchableOpacity
              testID="energy-needed-plus"
              accessibilityRole="button"
              accessibilityLabel={cta}
              onPress={() => { hapticTap(); DebugLogger.info(TAG, 'тап «Продолжить с Plus»'); onPlus(); }}
              activeOpacity={0.82}
              style={[styles.cta, { backgroundColor: g.accent }]}
            >
              <Text style={[styles.ctaLabel, { color: g.accentInk }]}>{cta}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="energy-needed-wait"
              accessibilityRole="button"
              accessibilityLabel={wait}
              onPress={() => { hapticTap(); DebugLogger.info(TAG, 'тап «Подожду»'); onWait(); }}
              activeOpacity={0.7}
              style={[styles.wait, { backgroundColor: g.buttonFill }]}
            >
              <Text style={[styles.waitLabel, { color: g.text }]}>{wait}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </HybridAlertShell>
  );
}

const styles = StyleSheet.create({
  // макет energy-modes-states.html `.gsh`: шторка r30 сверху, отступы 8/16/30, заголовок 27/32/700, таймер 44/50/800, ячейки 30, кнопка 58 r29.
  sheet: { width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 22, paddingHorizontal: 16, paddingBottom: 30 },
  title: { fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  sub: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 6, paddingHorizontal: 4 },
  timerBox: { alignItems: 'center', marginTop: 14 },
  timer: { fontSize: 44, lineHeight: 50, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch', marginTop: 14 },
  cta: { minHeight: 58, borderRadius: 29, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  wait: { marginTop: 10, minHeight: 44, borderRadius: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  waitLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
});

export default memo(EnergyNeededSheet);
