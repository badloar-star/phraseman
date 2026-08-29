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
import { useOverlayVisible } from './OverlayArbiter';
import { triLang, type Lang } from '../constants/i18n';
import { emitAppEvent } from '../app/events';
import { getUtcDayKey } from '../app/local_date';
import { checkComebackEligible, COMEBACK_GRANTED_KEY } from '../app/boons/comeback';
import { COMEBACK_REWARD, grantBoonReward } from '../app/boons/boon_rewards';
import { isStreakFreezeActiveToday, parseStreakFreeze } from '../app/streak_freeze';
import BoonChestModal from './BoonChestModal';
import { DebugLogger } from '../app/debug-logger';

function makeL(lang: Lang) {
  return (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

export default function ComebackBoonHost() {
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
    const todayKey = getUtcDayKey();
    // Бесплатная заморозка серии на сегодня + осколки. Не перетираем уже активную
    // заморозку (платную) — если сегодня уже защищён, оставляем как есть.
    let freezeWrite: readonly [string, string] | null = null;
    try {
      const existing = parseStreakFreeze(await AsyncStorage.getItem('streak_freeze'));
      if (!isStreakFreezeActiveToday(existing, todayKey)) {
        freezeWrite = ['streak_freeze', JSON.stringify({ active: true, date: todayKey })];
      }
    } catch (e) {
      // best-effort
      DebugLogger.error('ComebackBoonHost:existing', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    const granted = await grantBoonReward(
      COMEBACK_REWARD,
      'boon_comeback',
      todayKey,
      [
        [COMEBACK_GRANTED_KEY, todayKey],
        ...(freezeWrite ? [freezeWrite] : []),
      ],
    );
    if (granted && freezeWrite) emitAppEvent('streak_freeze_updated', { active: true });
  };

  if (!visible) return null;

  // зачем: прежнее «Ты вернулся. Хорошо.» звучало сухо и почти укоризненно —
  // рядом с подарком это читалось как «мы тебе не особо рады». Тон радостный.
  const title = L(
    'С возвращением! Мы скучали', 'З поверненням! Ми сумували', 'Welcome back! We missed you', '¡Bienvenido de vuelta! Te echábamos de menos', 'Bem-vindo de volta! Sentimos sua falta',
    'Chào mừng trở lại! Chúng tôi đã nhớ bạn', 'Selamat datang kembali! Kami merindukanmu', 'Tekrar hoş geldin! Seni özledik', 'Witaj z powrotem! Tęskniliśmy',
  );
  // зачем (владелец, 2026-08-26): наградой была 1 жемчужина — заменена на спин
  // общей рулетки. Защита серии осталась: она идёт отдельной выдачей.
  const cbSpins = Math.max(1, Math.floor(Number(COMEBACK_REWARD.spins) || 1));
  const cbOne = cbSpins % 10 === 1 && cbSpins % 100 !== 11;
  const cbFew = cbSpins % 10 >= 2 && cbSpins % 10 <= 4 && (cbSpins % 100 < 12 || cbSpins % 100 > 14);
  const cbRuSpin = cbOne ? 'спин' : cbFew ? 'спина' : 'спинов';
  const cbUkSpin = cbOne ? 'спін' : cbFew ? 'спіни' : 'спінів';
  const rewardLine = L(
    `Серия под защитой и ${cbSpins} ${cbRuSpin} ${cbOne ? 'твой' : 'твои'}`,
    `Серія під захистом і ${cbSpins} ${cbUkSpin} ${cbOne ? 'твій' : 'твої'}`,
    `Streak protected and ${cbSpins} ${cbSpins === 1 ? 'spin' : 'spins'} yours`,
    `Racha protegida y ${cbSpins} ${cbSpins === 1 ? 'giro tuyo' : 'giros tuyos'}`,
    `Sequência protegida e ${cbSpins} ${cbSpins === 1 ? 'giro seu' : 'giros seus'}`,
    `Chuỗi được bảo vệ và ${cbSpins} lượt quay là của bạn`,
    `Streak aman dan ${cbSpins} putaran jadi milikmu`,
    `Serin korumada ve ${cbSpins} çevirme senin`,
    `Seria chroniona i ${cbSpins} ${cbSpins === 1 ? 'spin twój' : 'spinów twoje'}`,
  );
  const tapHint = L(
    'Нажми, чтобы открыть', 'Натисни, щоб відкрити', 'Tap to open', 'Toca para abrir', 'Toque para abrir',
    'Nhấn để mở', 'Ketuk untuk membuka', 'Açmak için dokun', 'Dotknij, aby otworzyć',
  );
  const claimCta = L('Продолжить', 'Продовжити', 'Continue', 'Continuar', 'Continuar', 'Tiếp tục', 'Lanjut', 'Devam et', 'Kontynuuj');
  const closeLabel = L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij');

  return (
    <BoonChestModal
      visible={visible}
      rarity="common"
      title={title}
      rewardLine={rewardLine}
      rewardArt="spin"
      tapHint={tapHint}
      claimCta={claimCta}
      closeLabel={closeLabel}
      onClaim={() => { void claim(); }}
      onClose={() => setWantShow(false)}
    />
  );
}
