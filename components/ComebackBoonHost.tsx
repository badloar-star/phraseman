/**
 * ComebackBoonHost — модал «День возвращения» (Weekly Boon comeback).
 *
 * Если пользователь пропустил 2+ дня (зона, которую streak_repair не ловит), при
 * возврате — объёмный сундук-награда (общий BoonChestModal): бесплатная заморозка
 * серии на сегодня + осколки. Монтируется из _layout.tsx внутри
 * OverlayArbiterProvider; видимость — через useOverlayVisible('comebackDay', …).
 */
import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { useOverlayVisible } from './OverlayArbiter';
import { triLang, type Lang } from '../constants/i18n';
import { emitAppEvent } from '../app/events';
import { getTodayKey } from '../app/daily_tasks';
import { checkComebackEligible, markComebackGranted } from '../app/boons/comeback';
import { COMEBACK_REWARD, grantBoonReward } from '../app/boons/boon_rewards';
import { isStreakFreezeActiveToday, parseStreakFreeze } from '../app/streak_freeze';
import { getThemedShardIcon } from '../constants/levelGiftRewardIcons';
import BoonChestModal from './BoonChestModal';

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

export default function ComebackBoonHost() {
  const { themeMode } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);

  const [wantShow, setWantShow] = useState(false);
  const grantedRef = useRef(false);
  const visible = useOverlayVisible('comebackDay', wantShow);

  useEffect(() => {
    let alive = true;
    checkComebackEligible()
      .then((eligible) => {
        if (alive && eligible) setWantShow(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const claim = async () => {
    if (grantedRef.current) return;
    grantedRef.current = true;
    // Повторная проверка против стора (защита от двойной выдачи, если хост
    // перемонтировался или приложение закрылось до markComebackGranted).
    if (!(await checkComebackEligible())) return;
    const todayKey = getTodayKey();
    // Бесплатная заморозка серии на сегодня + осколки. Не перетираем уже активную
    // заморозку (платную) — если сегодня уже защищён, оставляем как есть.
    try {
      const existing = parseStreakFreeze(await AsyncStorage.getItem('streak_freeze'));
      if (!isStreakFreezeActiveToday(existing, todayKey)) {
        await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: todayKey }));
        emitAppEvent('streak_freeze_updated', { active: true });
      }
    } catch {
      // best-effort
    }
    await grantBoonReward(COMEBACK_REWARD, 'boon_comeback');
    await markComebackGranted(todayKey);
  };

  if (!visible) return null;

  const title = L(
    'Ты вернулся. Хорошо.', 'Ти повернувся. Добре.', 'Volviste. Bien.', 'Você voltou. Que bom.',
    'Bạn quay lại rồi. Tốt.', 'Kamu kembali. Bagus.', 'Geri döndün. Güzel.', 'Wróciłeś. Dobrze.',
  );
  const rewardLine = L(
    `Серия под защитой и ${COMEBACK_REWARD.shards} осколков твои`,
    `Серія під захистом і ${COMEBACK_REWARD.shards} осколків твої`,
    `Racha protegida y ${COMEBACK_REWARD.shards} fragmentos tuyos`,
    `Sequência protegida e ${COMEBACK_REWARD.shards} fragmentos seus`,
    `Chuỗi được bảo vệ và ${COMEBACK_REWARD.shards} mảnh là của bạn`,
    `Streak aman dan ${COMEBACK_REWARD.shards} serpihan jadi milikmu`,
    `Serin korumada ve ${COMEBACK_REWARD.shards} parça senin`,
    `Seria chroniona i ${COMEBACK_REWARD.shards} odłamków twoje`,
  );
  const tapHint = L(
    'Нажми, чтобы открыть', 'Натисни, щоб відкрити', 'Toca para abrir', 'Toque para abrir',
    'Nhấn để mở', 'Ketuk untuk membuka', 'Açmak için dokun', 'Dotknij, aby otworzyć',
  );
  const claimCta = L('Продолжить', 'Продовжити', 'Continuar', 'Continuar', 'Tiếp tục', 'Lanjut', 'Devam et', 'Kontynuuj');
  const closeLabel = L('Закрыть', 'Закрити', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij');

  return (
    <BoonChestModal
      visible={visible}
      rarity="common"
      rewardIcon={getThemedShardIcon(themeMode)}
      title={title}
      rewardLine={rewardLine}
      tapHint={tapHint}
      claimCta={claimCta}
      closeLabel={closeLabel}
      onClaim={() => { void claim(); }}
      onClose={() => setWantShow(false)}
    />
  );
}
