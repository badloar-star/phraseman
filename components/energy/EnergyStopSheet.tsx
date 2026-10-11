import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DebugLogger } from '../../app/debug-logger';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang } from '../../constants/i18n';
import { LUM } from '../../constants/motionHybrid';
import { hapticTap, hapticWarning } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { soundDirector } from '../../modules/audio/sound_director';
import { useEnergy, useEnergyCountdown } from '../EnergyContext';
import EnergyIcon from '../EnergyIcon';
import { useLang } from '../LangContext';
import HybridAlertShell, { CascadeItem } from '../modal_fx/HybridAlertShell';
import { useTheme } from '../ThemeContext';

const TAG = '[ENERGY-STOP]';

type Props = Readonly<{
  /** Фаза `stopped_no_energy` у занятия (режим Б, ошибка на последней энергии). */
  visible: boolean;
  /** Выйти из остановленного занятия. Состояние занятия хозяин сохраняет сам (ТЗ: «продолжить с того же места»). */
  onExit: () => void;
  /** Plus оформлен, пока шторка открыта: хозяин вызывает `attempts.resumeAfterPlus()` — занятие идёт с того же вопроса. */
  onResume: () => void;
  /** Контекст пейвола Plus; по умолчанию общий `no_energy`. */
  paywallContext?: string;
}>;

/**
 * Остановка занятия в режиме Б (ТЗ владельца 11.10): ошибка на последней энергии — занятие не идёт дальше,
 * пока не восстановится энергия или не оформлен Plus. Это не наказание: тон спокойный, главное действие — «Продолжить с Plus сейчас».
 * Закрыть шторку жестом/«назад» нельзя (случайный выход не должен терять место) — только явная кнопка «Выйти».
 */
function EnergyStopSheet({ visible, onExit, onResume, paywallContext = 'no_energy' }: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const { liquidGlassThemeId, f } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReduceMotion();
  const { isUnlimited, recoveryIntervalMs } = useEnergy();
  const { formattedTime } = useEnergyCountdown({ visible });
  const resumedRef = useRef(false);

  useEffect(() => {
    if (!visible) { resumedRef.current = false; return; }
    DebugLogger.info(TAG, `шторка показана isUnlimited=${String(isUnlimited)} next=${formattedTime || '—'} intervalMs=${recoveryIntervalMs}`);
    soundDirector.request('pm.energy.empty', { scope: 'energy-stop-sheet', dedupeKey: 'visible' });
    hapticWarning().catch((error: unknown) => {
      DebugLogger.warn(TAG, `haptic не сработал: ${error instanceof Error ? error.message : String(error)}`);
    });
    // зачем: isUnlimited/formattedTime намеренно не в deps — лог и звук только на показ, не на каждый тик таймера.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // зачем: оформили Plus (пейвол поверх шторки закрылся покупкой) → занятие продолжается само, без лишнего тапа. Один раз на показ.
  useEffect(() => {
    if (!visible || !isUnlimited || resumedRef.current) return;
    resumedRef.current = true;
    DebugLogger.info(TAG, 'Plus подтверждён при открытой шторке → onResume()');
    onResume();
  }, [visible, isUnlimited, onResume]);

  const title = triLang(lang, {
    ru: 'Энергия закончилась', uk: 'Енергія закінчилась', en: 'Out of energy', es: 'Se acabó la energía',
    'pt-BR': 'A energia acabou', vi: 'Hết năng lượng', id: 'Energi habis', tr: 'Enerji bitti', pl: 'Energia się skończyła',
  });
  const time = formattedTime || triLang(lang, {
    ru: 'несколько минут', uk: 'кілька хвилин', en: 'a few minutes', es: 'unos minutos',
    'pt-BR': 'alguns minutos', vi: 'vài phút', id: 'beberapa menit', tr: 'birkaç dakika', pl: 'kilka minut',
  });
  const body = triLang(lang, {
    ru: `Занятие остановлено. Следующая энергия вернётся через ${time}.`,
    uk: `Заняття зупинено. Наступна енергія повернеться через ${time}.`,
    en: `The lesson is paused. Your next energy comes back in ${time}.`,
    es: `La lección está en pausa. Tu próxima energía vuelve en ${time}.`,
    'pt-BR': `A lição está pausada. Sua próxima energia volta em ${time}.`,
    vi: `Bài học đã tạm dừng. Năng lượng tiếp theo sẽ hồi sau ${time}.`,
    id: `Pelajaran dijeda. Energi berikutnya pulih dalam ${time}.`,
    tr: `Ders duraklatıldı. Bir sonraki enerji ${time} içinde yenilenir.`,
    pl: `Lekcja jest wstrzymana. Następna energia wróci za ${time}.`,
  });
  const cta = triLang(lang, {
    ru: 'Продолжить с Plus сейчас', uk: 'Продовжити з Plus зараз', en: 'Continue with Plus now', es: 'Continuar con Plus ahora',
    'pt-BR': 'Continuar com o Plus agora', vi: 'Tiếp tục với Plus ngay', id: 'Lanjut dengan Plus sekarang', tr: 'Plus ile şimdi devam et', pl: 'Kontynuuj z Plus teraz',
  });
  const exit = triLang(lang, {
    ru: 'Выйти', uk: 'Вийти', en: 'Exit', es: 'Salir', 'pt-BR': 'Sair', vi: 'Thoát', id: 'Keluar', tr: 'Çık', pl: 'Wyjdź',
  });

  const cascade = (delay: number, key: string, node: React.ReactNode) => (
    <CascadeItem key={key} delay={delay} reduceMotion={reduceMotion}>{node}</CascadeItem>
  );

  const openPlus = () => {
    hapticTap();
    DebugLogger.info(TAG, `тап «${cta}» → /premium_modal context=${paywallContext}`);
    router.push({ pathname: '/premium_modal', params: { context: paywallContext, source: 'energy_stop_sheet' } } as never);
  };
  const leave = () => {
    hapticTap();
    DebugLogger.info(TAG, 'тап «Выйти» → onExit()');
    onExit();
  };

  return (
    <HybridAlertShell
      visible={visible}
      onRequestClose={() => { DebugLogger.info(TAG, 'back/жест проигнорирован: закрыть можно только кнопкой'); }}
      dismissible={false}
      placement="bottom"
      shadowColor="#000000" // theme-exempt: тень шторки — чёрная в любой теме
      backdropColor="rgba(0,0,0,0.6)" // theme-exempt: затемнение под шторкой — тёмный скрим в любой теме
      testID="energy-stop-sheet"
    >
      <View style={[styles.card, { backgroundColor: g.opaqueSheet }]}>
        {cascade(LUM.ladder[1], 'icon', (
          <View style={[styles.iconPlate, { backgroundColor: g.opaqueControl }]}>
            <EnergyIcon filled={false} themeColor={g.accent} tintColor={g.secondary} size={30} animateChange={false} animateLoop={false} />
          </View>
        ))}
        {cascade(LUM.ladder[2], 'title', (
          <Text accessibilityRole="header" style={[styles.title, { color: g.text, fontSize: f.h2 }]} testID="energy-stop-title">{title}</Text>
        ))}
        {cascade(LUM.ladder[2], 'body', (
          <Text style={[styles.body, { color: g.secondary, fontSize: f.body }]} testID="energy-stop-body">{body}</Text>
        ))}
        {cascade(LUM.ladder[3], 'actions', (
          <View style={styles.actions}>
            <TouchableOpacity
              testID="energy-stop-plus"
              accessibilityRole="button"
              accessibilityLabel={cta}
              onPress={openPlus}
              activeOpacity={0.82}
              style={[styles.cta, { backgroundColor: g.accent }]}
            >
              <Text style={[styles.ctaLabel, { color: g.accentInk, fontSize: f.body }]}>{cta}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="energy-stop-exit"
              accessibilityRole="button"
              accessibilityLabel={exit}
              onPress={leave}
              activeOpacity={0.7}
              style={styles.exit}
            >
              <Text style={[styles.exitLabel, { color: g.secondary, fontSize: f.body }]}>{exit}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </HybridAlertShell>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderRadius: 26, paddingTop: 24, paddingHorizontal: 22, paddingBottom: 12, alignItems: 'center', gap: 12 },
  iconPlate: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', textAlign: 'center' },
  body: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', marginTop: 10, gap: 4 },
  cta: { minHeight: 52, borderRadius: 26, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { fontWeight: '700', textAlign: 'center' },
  exit: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  exitLabel: { fontWeight: '600', textAlign: 'center' },
});

export default memo(EnergyStopSheet);
