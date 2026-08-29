import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { useLang } from './LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { getRunesBalance, peekRunes } from '../app/runes_system';
import { subscribeAppSnapshot } from '../app/app_snapshot_store';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from '../app/account_generation';
import HomeRuneBalance from './home/HomeRuneBalance';
import { runeAmount } from '../constants/runes';
import { triLang, type Lang } from '../constants/i18n';

/**
 * RuneBalanceChip — общий счётчик «сколько у меня рун» для экранов вне Главной.
 *
 * зачем (владелец, 2026-08-24): «в разделе Арена и в разделе Лига цель лиги
 * должна быть иконка с общим счётом рун обязательно». Раньше баланс рун жил
 * только в шапке Главной (HomeRuneBalance) — игрок, зайдя в Арену или увидев
 * цель лиги, не понимал, сколько у него валюты, ради которой он играет.
 *
 * Почему отдельный компонент, а не копипаста HomeRuneBalance: тот — «глупая»
 * отрисовка (иконка + число), баланс ему передают снаружи. Главная держит его
 * в состоянии экрана, потому что там же живёт анимация полёта глифов. Экранам
 * вне Главной такое состояние заводить незачем, поэтому чип подписывается сам,
 * а рисует всё тем же HomeRuneBalance — ассет и формат числа не расходятся.
 *
 * Firestore не читается: источник — снапшот приложения (peekRunes синхронный),
 * авторитетное чтение поднимает локальную проекцию с диска. Стоимости нет.
 */

/**
 * Подпись для скринридера: «Баланс: 12 рун».
 *
 * Слово склоняется общим runeAmount — своей таблицы форм НЕ заводим: она уже
 * есть в constants/runes.ts и разошлась бы (наивный вариант читал «1 рун»
 * вместо «1 руна»). Префикс идёт через triLang, как все строки проекта.
 */
function balanceLabel(lang: Lang, balance: number): string {
  const prefix = triLang(lang, {
    ru: 'Баланс', uk: 'Баланс', en: 'Balance', es: 'Saldo', 'pt-BR': 'Saldo',
    vi: 'Số dư', id: 'Saldo', tr: 'Bakiye', pl: 'Saldo',
  });
  return `${prefix}: ${runeAmount(lang, balance)}`;
}

type Props = Readonly<{
  /** Цвет числа — только из токенов темы экрана, золотой не хардкодится. */
  color: string;
  /**
   * Экран реально показан пользователю (не премаунт таба).
   *
   * зачем (аудит 2026-08-24): getRunesBalance() берёт блокировку перехода
   * аккаунта, читает состояние телефона, проверяет отпечатки операций и делает
   * 3+ чтения AsyncStorage. На премаунте таба Арены это работа впустую и удар
   * по холодному старту. Показ при этом НЕ страдает: первый кадр всё равно
   * рисуется синхронно из снапшота (peekRunes), а подписка на кошелёк живёт
   * всегда — свежие начисления видны сразу.
   */
  active?: boolean;
  /** Размер иконки; число подстраивается под него. */
  size?: number;
  /** Тап ведёт в раздел «Руны». Выключается там, где чип уже внутри кнопки. */
  interactive?: boolean;
  testID?: string;
}>;

export const RuneBalanceChip = memo(function RuneBalanceChip({
  color,
  active = true,
  size = 26,
  interactive = true,
  testID = 'rune-balance-chip',
}: Props) {
  const router = useRouter();
  const { lang } = useLang();
  // Первый кадр — синхронно из снапшота: никакого «0 и прыжок» (Performance Bible).
  const [balance, setBalance] = useState(() => peekRunes());

  // Авторитетное чтение вынесено в ref-функцию: её зовут ДВА разных эффекта
  // (вход на экран и смена аккаунта), а сама подписка при этом не пересоздаётся.
  //
  // зачем (аудит 2026-08-24): getRunesBalance() берёт блокировку перехода
  // аккаунта, читает состояние телефона, проверяет отпечатки операций и делает
  // 3+ чтения AsyncStorage. Держать это на премаунте таба Арены — работа впустую.
  const activeRef = useRef(active);
  activeRef.current = active;
  const cancelledRef = useRef(false);
  const reconcile = useCallback((token = captureAccountGeneration()) => {
    const stableId = token.stableId?.trim();
    if (!stableId) return;
    void getRunesBalance().then((value) => {
      // Поздний ответ не затирает свежее значение: ни после размонтирования,
      // ни после очередной смены аккаунта.
      if (cancelledRef.current || !isCurrentAccountGeneration(token, stableId)) return;
      setBalance(value.balance);
    });
  }, []);

  // Подписка на кошелёк — ОДИН раз на жизнь компонента. Слушатель снапшота
  // дешёвый, а пересоздавать его на каждое сворачивание приложения или
  // переключение таба (active меняется и там, и там) — лишняя работа и риск
  // пропустить начисление в момент между отпиской и подпиской.
  useEffect(() => {
    cancelledRef.current = false;
    // Слушаем снапшот напрямую, а НЕ subscribeRunesBalance.
    //
    // зачем (аудит 2026-08-24): subscribeRunesBalance побочно эмитит глобальное
    // событие `runes_balance_updated`, на которое рассчитана анимация полёта
    // глифов. Второй подписчик заставил бы событие вылетать ДВАЖДЫ на одно
    // начисление — сегодня слушателей нет и вреда не видно, но анимация
    // сработала бы дважды, как только её подключат. Главная по этой же причине
    // читает снапшот напрямую.
    const unsubscribe = subscribeAppSnapshot(() => setBalance(peekRunes()));
    // Смена аккаунта: обнуляем показ, чтобы чужой баланс не мелькнул на экране
    // нового пользователя, и сразу перечитываем под нового — иначе игрок видел бы
    // ноль до первого начисления. guard-ok: это НЕ понижение баланса — кошелёк
    // живёт на сервере и в снапшоте, здесь только локальный сброс отображения
    // (класс бага «чужие пиксели после смены аккаунта»,
    // см. project_account_generation_stale_cache_class).
    const accountSubscription = subscribeAccountGeneration((token) => {
      setBalance(0);
      if (activeRef.current && token.phase === 'active') reconcile(token);
    });
    return () => {
      cancelledRef.current = true;
      unsubscribe();
      accountSubscription.remove();
    };
  }, [reconcile]);

  // Вход на экран (и возврат из фона) — перечитать кошелёк.
  useEffect(() => {
    if (active) reconcile();
  }, [active, reconcile]);

  // Хаптик в onPressIn, действие в onPress: iOS Taptic Engine нужна фора ~50 мс
  // на прогрев (правило hooks/use-haptics.ts). В onPress отклик ощущается вялым.
  const warmHaptic = useCallback(() => { void hapticTap(); }, []);
  const openWallet = useCallback(() => {
    router.push('/runes_wallet');
  }, [router]);

  const label = balanceLabel(lang, balance);
  // Ассет руны и формат числа живут в ОДНОМ месте — HomeRuneBalance. Здесь только
  // подписка на кошелёк и переход в раздел «Руны».
  //
  // standaloneA11y={false}: озвучивает обёртка (кнопка или View ниже). Иначе
  // скринридер нашёл бы ДВА фокусируемых элемента на одном чипе и прочитал
  // баланс дважды.
  const body = (
    <HomeRuneBalance
      testID={`${testID}-value`}
      balance={balance}
      color={color}
      iconSize={size}
      valueSize={Math.round(size * 0.54)}
      reserveTapHeight={false}
      standaloneA11y={false}
      accessibilityLabel={label}
    />
  );

  if (!interactive) {
    return (
      <View testID={testID} accessible accessibilityLabel={label} style={styles.container}>
        {body}
      </View>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.75}
      hitSlop={8}
      onPressIn={warmHaptic}
      onPress={openWallet}
      style={styles.container}
    >
      {body}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  // 44 — минимальная тап-цель; иконка ниже, высоту держит контейнер.
  container: { flexShrink: 0, minHeight: 44, justifyContent: 'center' },
});

export default RuneBalanceChip;
