import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { DebugLogger } from '../../app/debug-logger';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang } from '../../constants/i18n';
import { LUM } from '../../constants/motionHybrid';
import { hapticTap, hapticWarning } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { soundDirector } from '../../modules/audio/sound_director';
import { useEnergy, useEnergyCountdown } from '../EnergyContext';
import EnergyIcon from '../EnergyIcon';
import { emitEnergyToast } from './energy_toasts';
import { isDevEnergyStopPlusGranted } from '../../app/dev_energy_stop_flag';
import { useLang } from '../LangContext';
import HybridAlertShell, { CascadeItem } from '../modal_fx/HybridAlertShell';
import { useTheme } from '../ThemeContext';

const TAG = '[ENERGY-STOP]';

type Props = Readonly<{
  /** Фаза `stopped_no_energy` у занятия (режим Б, ошибка на последней энергии). */
  visible: boolean;
  /** Выйти из остановленного занятия. Состояние занятия хозяин сохраняет сам (ТЗ: «продолжить с того же места»). */
  onExit: () => void;
  /** Plus оформлен, пока карточка открыта: хозяин вызывает `attempts.resumeAfterPlus()` — занятие идёт с того же вопроса. */
  onResume: () => void;
  /** Контекст пейвола Plus; по умолчанию общий `no_energy`. */
  paywallContext?: string;
}>;

/**
 * Остановка занятия в режиме Б (ТЗ владельца 11.10; макет energy-modes-states.html, кадр Б4, `.gmod`): ошибка на последней энергии —
 * занятие не идёт дальше, пока не восстановится энергия или не оформлен Plus. Это пауза, а не наказание: тон спокойный,
 * главное действие — «Продолжить с Plus». Закрыть жестом/«назад» нельзя (случайный выход не должен терять место) — только кнопка «Выйти из занятия».
 */
function EnergyStopSheet({ visible, onExit, onResume, paywallContext = 'no_energy' }: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReduceMotion();
  const { isUnlimited, recoveryIntervalMs } = useEnergy();
  const { formattedTime } = useEnergyCountdown({ visible });
  const resumedRef = useRef(false);
  // зачем (R1_PAYWALL_UX): быстрый второй тап по «Продолжить с Plus» до перерисовки открывал бы окно Plus дважды (стек из двух пейволов); сбрасывается, когда экран занятия снова в фокусе.
  const plusOpeningRef = useRef(false);
  // зачем (ревью Ядра п.2): экран Plus открывается маршрутом ПОВЕРХ нативного окна — карточка остановки перекрыла бы его, и кнопка казалась бы
  // мёртвой. Поэтому перед переходом карточку прячем, а когда экран занятия снова в фокусе (пейвол закрыт) — возвращаем, если остановка ещё есть.
  const [plusOpen, setPlusOpen] = useState(false);
  useFocusEffect(useCallback(() => { setPlusOpen(false); plusOpeningRef.current = false; }, []));

  useEffect(() => {
    if (!visible) { resumedRef.current = false; return; }
    DebugLogger.info(TAG, `карточка показана isUnlimited=${String(isUnlimited)} next=${formattedTime || '—'} intervalMs=${recoveryIntervalMs}`);
    soundDirector.request('pm.energy.empty', { scope: 'energy-stop-sheet', dedupeKey: 'visible' });
    hapticWarning().catch((error: unknown) => {
      DebugLogger.warn(TAG, `haptic не сработал: ${error instanceof Error ? error.message : String(error)}`);
    });
    // зачем: isUnlimited/formattedTime намеренно не в deps — лог и звук только на показ, не на каждый тик таймера.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // зачем: оформили Plus (пейвол поверх карточки закрылся покупкой) → занятие продолжается само, без лишнего тапа. Один раз на показ.
  useEffect(() => {
    if (!visible || !isUnlimited || resumedRef.current) return;
    resumedRef.current = true;
    DebugLogger.info(TAG, 'Plus подтверждён при открытой карточке → onResume()');
    emitEnergyToast('plus_resumed'); // макет Б6: «Plus активирован — продолжаем с того же вопроса»
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
    ru: `Занятие остановлено, а не потеряно. Продолжи с Plus сейчас — вернёшься на тот же вопрос. Или подожди: +1 энергия вернётся через ${time}.`,
    uk: `Заняття зупинено, а не втрачено. Продовж з Plus зараз — повернешся до того самого питання. Або зачекай: +1 енергія повернеться через ${time}.`,
    en: `Your lesson is paused, not lost. Continue with Plus now and pick up at the same question. Or wait: +1 energy comes back in ${time}.`,
    es: `La lección está en pausa, no perdida. Continúa con Plus ahora y vuelve a la misma pregunta. O espera: +1 de energía vuelve en ${time}.`,
    'pt-BR': `A lição está pausada, não perdida. Continue com o Plus agora e volte à mesma pergunta. Ou espere: +1 de energia volta em ${time}.`,
    vi: `Bài học đã tạm dừng, chưa mất. Tiếp tục với Plus ngay để quay lại đúng câu hỏi đó. Hoặc chờ: +1 năng lượng sẽ hồi sau ${time}.`,
    id: `Pelajaran dijeda, bukan hilang. Lanjutkan dengan Plus sekarang dan kembali ke pertanyaan yang sama. Atau tunggu: +1 energi pulih dalam ${time}.`,
    tr: `Ders duraklatıldı, kaybolmadı. Plus ile şimdi devam et, aynı soruya dön. Ya da bekle: +1 enerji ${time} içinde yenilenir.`,
    pl: `Lekcja jest wstrzymana, nie utracona. Kontynuuj z Plus teraz i wróć do tego samego pytania. Albo poczekaj: +1 energia wróci za ${time}.`,
  });
  const cta = triLang(lang, {
    ru: 'Продолжить с Plus', uk: 'Продовжити з Plus', en: 'Continue with Plus', es: 'Continuar con Plus',
    'pt-BR': 'Continuar com o Plus', vi: 'Tiếp tục với Plus', id: 'Lanjut dengan Plus', tr: 'Plus ile devam et', pl: 'Kontynuuj z Plus',
  });
  const exit = triLang(lang, {
    ru: 'Выйти из занятия', uk: 'Вийти із заняття', en: 'Leave the lesson', es: 'Salir de la lección', 'pt-BR': 'Sair da lição',
    vi: 'Thoát bài học', id: 'Keluar dari pelajaran', tr: 'Dersten çık', pl: 'Wyjdź z lekcji',
  });

  const cascade = (delay: number, key: string, node: React.ReactNode) => (
    <CascadeItem key={key} delay={delay} reduceMotion={reduceMotion}>{node}</CascadeItem>
  );

  const openPlus = () => {
    if (plusOpeningRef.current) {
      DebugLogger.info(TAG, 'повторный тап «Продолжить с Plus» проигнорирован: окно Plus уже открывается');
      return;
    }
    hapticTap();
    // зачем (координатор 12.10, energy-modes-006): dev `energy_stop=plus_granted` — Plus только в памяти вместо пейвола;
    // эффект выше (isUnlimited) продолжит занятие сам, как после настоящей покупки. В стор-сборке геттер false.
    if (isDevEnergyStopPlusGranted()) {
      DebugLogger.info(TAG, 'dev energy_stop=plus_granted: Plus выдаётся в памяти, пейвол не открывается');
      // Динамические импорты: dev-ветка не тянет конфиг/хранилище в экран (и в изолированные тесты шторки).
      void Promise.all([import('../../app/stable_id'), import('../../app/dev_vip_override'), import('../../app/events')])
        .then(async ([{ getStableId }, vip, { emitAppEvent }]) => {
          const ok = vip.setDevVipOverride(await getStableId(), vip.devMemoryPlusValues(Date.now()), 'energy_stop_plus');
          DebugLogger.info(TAG, `dev Plus в памяти: ${ok ? 'выдан' : 'отклонён'}`);
          if (ok) emitAppEvent('premium_access_changed', { active: true, source: 'vip' });
        })
        .catch((error: unknown) => {
          DebugLogger.warn(TAG, `dev Plus в памяти не выдан: ${error instanceof Error ? error.message : String(error)}`);
        });
      return;
    }
    DebugLogger.info(TAG, `тап «${cta}» → /premium_modal context=${paywallContext}`);
    plusOpeningRef.current = true;
    setPlusOpen(true);
    router.push({ pathname: '/premium_modal', params: { context: paywallContext, source: 'energy_stop_sheet' } } as never);
  };
  const leave = () => {
    hapticTap();
    DebugLogger.info(TAG, 'тап «Выйти из занятия» → onExit()');
    onExit();
  };

  return (
    <HybridAlertShell
      visible={visible && !plusOpen}
      onRequestClose={() => { DebugLogger.info(TAG, 'back/жест проигнорирован: закрыть можно только кнопкой'); }}
      dismissible={false}
      shadowColor="#000000" // theme-exempt: тень карточки — чёрная в любой теме
      backdropColor="rgba(0,0,0,0.6)" // theme-exempt: затемнение под карточкой — тёмный скрим в любой теме
      testID="energy-stop-sheet"
    >
      <View style={[styles.card, { backgroundColor: g.opaqueSheet }]}>
        {cascade(LUM.ladder[1], 'icon', (
          <View style={[styles.iconPlate, { backgroundColor: g.opaqueControl }]}>
            <EnergyIcon filled themeColor={g.secondary} tintColor={g.secondary} size={28} animateChange={false} animateLoop={false} />
          </View>
        ))}
        {cascade(LUM.ladder[2], 'title', (
          <Text accessibilityRole="header" style={[styles.title, { color: g.text }]} testID="energy-stop-title">{title}</Text>
        ))}
        {cascade(LUM.ladder[2], 'body', (
          <Text style={[styles.body, { color: g.secondary }]} testID="energy-stop-body">{body}</Text>
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
              <Text style={[styles.ctaLabel, { color: g.accentInk }]}>{cta}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="energy-stop-exit"
              accessibilityRole="button"
              accessibilityLabel={exit}
              onPress={leave}
              activeOpacity={0.7}
              style={[styles.exit, { backgroundColor: g.buttonFill }]}
            >
              <Text style={[styles.exitLabel, { color: g.text }]}>{exit}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </HybridAlertShell>
  );
}

const styles = StyleSheet.create({
  // макет energy-modes-states.html `.gmod`: карточка r26, отступы 22/20/18, плита 56 r18, заголовок 23/29/800, кнопки 52 r26.
  card: { width: '100%', borderRadius: 26, paddingTop: 22, paddingHorizontal: 20, paddingBottom: 18 },
  iconPlate: { width: 56, height: 56, borderRadius: 18, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 23, lineHeight: 29, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 8 },
  actions: { alignSelf: 'stretch' },
  cta: { marginTop: 16, minHeight: 52, borderRadius: 26, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  exit: { marginTop: 8, minHeight: 52, borderRadius: 26, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  exitLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
});

export default memo(EnergyStopSheet);
