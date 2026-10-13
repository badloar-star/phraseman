import React, { memo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

import { DebugLogger } from '../../app/debug-logger';
import { safeRouterBack } from '../../app/navigation_back';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang } from '../../constants/i18n';
import { useEnergy } from '../EnergyContext';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { emitEnergyToast } from './energy_toasts';
import EnergyMistakeHud from './EnergyMistakeHud';
import EnergyStopSheet from './EnergyStopSheet';

const TAG = '[ENERGY-HUD]';

/**
 * Всё, что шапке занятия нужно от `useSessionAttempts` в режиме энергии Б (контракт Ядра, 11.10):
 * хозяин передаёт объект `attempts` целиком — лишние поля игнорируются.
 */
export type SessionAttemptsEnergyModel = Readonly<{
  mistakeChargeActive: boolean;
  /** Растёт на 1 РОВНО при списании энергии за ошибку. */
  energyLossSeq: number;
  state: Readonly<{ phase: string }>;
  /** Вернуть занятие из остановки на тот же вопрос — после подтверждённого Plus. */
  resumeAfterPlus: () => unknown;
}>;

type Props = Readonly<{
  attempts: SessionAttemptsEnergyModel;
  locale: string;
  testID: string;
  /** Выйти из остановленного занятия. По умолчанию — назад по стеку: состояние занятия уже сохранено Ядром. */
  onStoppedExit?: () => void;
}>;

/**
 * Режим Б (макет energy-modes-states.html, кадры Б1–Б6): вместо сердечек — пилюля энергии, ошибка трясёт её и вылетает «−1»,
 * ошибка на последней энергии останавливает занятие карточкой «Энергия закончилась». У Plus энергия не тратится — пилюли нет.
 * Подписка на энергию и роутер живут здесь, а не в SessionAttemptsHud: режим А остаётся ровно таким, каким был.
 */
function EnergyAttemptsHud({ attempts, testID, onStoppedExit }: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const { energy, bonusEnergy, maxEnergy, isUnlimited } = useEnergy();
  const have = energy + bonusEnergy;
  const stopped = attempts.state.phase === 'stopped_no_energy';
  const { resumeAfterPlus } = attempts;

  // зачем (макет Б3): на последней энергии предупреждаем один раз за заход на единицу — «следующая ошибка остановит занятие».
  // Не предупреждаем у Plus и в остановке; ушли с единицы (восстановилась, потратилась) — следующий заход на неё предупредит снова.
  const warnedAtOneRef = useRef(false);
  const lastEnergy = have === 1 && !isUnlimited && attempts.state.phase === 'active';
  useEffect(() => {
    if (!lastEnergy) { warnedAtOneRef.current = false; return; }
    if (warnedAtOneRef.current) return;
    warnedAtOneRef.current = true;
    DebugLogger.info(TAG, `последняя энергия → предупреждение testID=${testID}`);
    emitEnergyToast('last_energy');
  }, [lastEnergy, testID]);

  const onResume = useCallback(() => { resumeAfterPlus(); }, [resumeAfterPlus]);
  const onExit = useCallback(() => {
    DebugLogger.info(TAG, `выход из остановленного занятия testID=${testID} customExit=${String(Boolean(onStoppedExit))}`);
    // зачем (координатор 12.10, сторож navigation_back_underlay): голый router.back() мог вернуть в закрытое одноразовое
    // занятие или в чужой раздел; safeRouterBack выбирает безопасную цель из истории (иначе Главная) и пишет [NAV-BACK].
    if (onStoppedExit) onStoppedExit(); else safeRouterBack(router);
  }, [onStoppedExit, router, testID]);

  const label = triLang(lang, {
    ru: `Энергия: ${have} из ${maxEnergy}`, uk: `Енергія: ${have} з ${maxEnergy}`, en: `Energy: ${have} of ${maxEnergy}`,
    es: `Energía: ${have} de ${maxEnergy}`, 'pt-BR': `Energia: ${have} de ${maxEnergy}`, vi: `Năng lượng: ${have}/${maxEnergy}`,
    id: `Energi: ${have} dari ${maxEnergy}`, tr: `Enerji: ${have}/${maxEnergy}`, pl: `Energia: ${have} z ${maxEnergy}`,
  });

  // Plus: энергия не тратится ни в одном режиме, остановки нет — шапка без пилюли (макет Б6: после покупки пилюля уходит).
  // Карточку остановки оставляем смонтированной: пока она открыта и Plus только что подтвердился, ей нужно успеть вызвать onResume.
  return (
    <>
      {isUnlimited ? null : (
        <EnergyMistakeHud
          energy={have}
          maxEnergy={maxEnergy}
          lossSeq={attempts.energyLossSeq}
          accent={g.accentTextSafe}
          muted={g.secondary}
          textColor={g.text}
          bad={t.wrong}
          plate={g.opaqueControl}
          // зачем (вердикты Макетов 7c831a193, energy-modes-003/009/010; координатор 13.10): кромка пилюли нейтральная, как `--g-edge` образца energy-modes-states (белый 13 % / чёрный 12 %), а не цвет темы
          // (на «Авроре» она шла мятной, на красной энергии — красной). Красный пульс последней энергии — отдельная анимация образца (`gwarn`), он остаётся.
          edge={g.isLight ? 'rgba(0,0,0,0.12)' /* theme-exempt: нейтральная кромка образца */ : 'rgba(255,255,255,0.13)' /* theme-exempt: нейтральная кромка образца */}
          accessibilityLabel={label}
          testID={testID}
        />
      )}
      <EnergyStopSheet visible={stopped} onResume={onResume} onExit={onExit} />
    </>
  );
}

export default memo(EnergyAttemptsHud);
