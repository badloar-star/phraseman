import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { getAppSnapshot, subscribeAppSnapshot } from './app_snapshot_store';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from './account_generation';
import { coinRankRowForDisplay, coinRankTitle } from './coin_rank_table_v1';
import { DebugLogger } from './debug-logger';
import { actionToastTri, emitAppEvent } from './events';
import { safeRouterBack } from './navigation_back';
import { getRunesBalanceRead, peekRunes } from './runes_system';
import { getDevCoinBalanceOverride } from './dev_coin_rank';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { coinRankCatalogTitle } from '../components/coins/CoinRankCatalog';
import KitSpinner from '../components/v2/KitSpinner';
import { GlassRim } from '../components/mistakes-panel/GlassRim';
import CoinRankUpgradeCeremony from '../components/level_up/CoinRankUpgradeCeremony';
import V2Backdrop from '../components/v2/V2Backdrop';
import { V2GlassSheen, useV2GlassStyle } from '../components/v2/V2Glass';
import V2Pressable from '../components/v2/V2Pressable';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang, type Lang } from '../constants/i18n';
import { formatCoinsForLang, missingCoinsWord } from './coin_number_format';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { V2, V2_TYPE } from '../constants/v2Style';
import {
  isCoinRankCeremonyBindingCurrent,
  isCoinRankOperationBindingCurrent,
  isCoinRankUpgradeEligible,
} from '../hooks/coin_rank_upgrade_guard';
import { useCoinRankUpgrade } from '../hooks/use_coin_rank_upgrade';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

type AccountToken = ReturnType<typeof captureAccountGeneration>;

function activeOwner(token: AccountToken): string | null {
  if (token.phase !== 'active') return null;
  const stableId = token.stableId?.trim() ?? '';
  return stableId || null;
}

/**
 * The same local wallet projection used by Home and RuneBalanceChip, with one
 * extra fail-closed state: null while there is no active account owner.
 */
type CoinBalanceProjection = Readonly<{
  balance: number | null;
  ownerKey: string | null;
  forceBalanceReconcile: () => Promise<'durable' | 'unavailable'>;
}>;

// зачем (эмулятор 01.10): на холодном старте снимок прогресса ещё читается с диска и
// peekRunes() даёт 0 — экран показывал «0 монет» и гасил кнопку. Нет прогресса — баланс неизвестен.
function peekKnownRunes(): number | null {
  return getAppSnapshot().progress != null ? peekRunes() : null;
}

function useCoinBalance(): CoinBalanceProjection {
  const initialTokenRef = useRef<AccountToken>(captureAccountGeneration());
  const ownerRef = useRef<string | null>(activeOwner(initialTokenRef.current));
  const generationRef = useRef<number>(initialTokenRef.current.generation);
  const forcedBlockRef = useRef(false);
  const [ownerKey, setOwnerKey] = useState<string | null>(() => (
    ownerRef.current ? `${ownerRef.current}:${generationRef.current}` : null
  ));
  const [balance, setBalance] = useState<number | null>(() => (
    ownerRef.current ? peekKnownRunes() : null
  ));

  const reconcile = useCallback((token: AccountToken = captureAccountGeneration()) => {
    const owner = activeOwner(token);
    if (!owner || ownerRef.current !== owner) return;
    void getRunesBalanceRead()
      .then((read) => {
        if (ownerRef.current !== owner || !isCurrentAccountGeneration(token, owner)) return;
        if (!forcedBlockRef.current) setBalance(read.wallet.balance);
      })
      .catch(noteSwallowedHandler('coin_rank:useCallback.getRunesBalanceRead'));
  }, []);

  const forceBalanceReconcile = useCallback(async (): Promise<'durable' | 'unavailable'> => {
    const token = captureAccountGeneration();
    const owner = activeOwner(token);
    if (!owner || ownerRef.current !== owner || generationRef.current !== token.generation) return 'unavailable';
    forcedBlockRef.current = true;
    // зачем (координатор 15.10, аудит Optimistic UI п.5): раньше баланс обнулялся ДО ответа — число мигало «—» на время сверки.
    // Держим прежнее значение до ответа (кнопку покупки на это время держит занятость операции); ответ «не подтверждено» →
    // «—», как раньше (покупка выключена, тост объясняет); подтверждено → новое число.
    const sameOwner = (): boolean => ownerRef.current === owner && generationRef.current === token.generation && isCurrentAccountGeneration(token, owner);
    try {
      const read = await getRunesBalanceRead();
      if (!sameOwner()) return 'unavailable';
      if (read.quality !== 'durable') {
        DebugLogger.warn('[COIN-RANK-UPGRADE]', `баланс: сверка не подтверждена (quality=${read.quality}) — показываем «—»`);
        setBalance(null);
        return 'unavailable';
      }
      forcedBlockRef.current = false;
      setBalance(read.wallet.balance);
      return 'durable';
    } catch (error) {
      // зачем: немой catch запрещён — причина отказа сверки в журнал.
      DebugLogger.warn('[COIN-RANK-UPGRADE]', `баланс: принудительная сверка упала ${String(error)} — показываем «—»`);
      if (sameOwner()) setBalance(null);
      return 'unavailable';
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribeSnapshot = subscribeAppSnapshot(() => {
      if (!mounted) return;
      const token = captureAccountGeneration();
      const owner = activeOwner(token);
      if (forcedBlockRef.current
        || !owner
        || ownerRef.current !== owner
        || generationRef.current !== token.generation
        || !isCurrentAccountGeneration(token, owner)) return;
      setBalance(peekKnownRunes());
    });
    const accountSubscription = subscribeAccountGeneration((token) => {
      if (!mounted) return;
      const nextOwner = activeOwner(token);
      const ownerChanged = ownerRef.current !== nextOwner || generationRef.current !== token.generation;
      ownerRef.current = nextOwner;
      generationRef.current = token.generation;
      if (ownerChanged) {
        forcedBlockRef.current = false;
        setBalance(null);
        setOwnerKey(nextOwner ? `${nextOwner}:${token.generation}` : null);
      }
      if (nextOwner) reconcile(token);
    });
    if (ownerRef.current) reconcile(initialTokenRef.current);
    return () => {
      mounted = false;
      unsubscribeSnapshot();
      accountSubscription.remove();
    };
  }, [reconcile]);

  // зачем (Авторизация 12.10, coins-003/004): dev `coins=N` — баланс только для показа; повышение при подмене отказывает до сервера (use_coin_rank_upgrade)
  const devBalance = getDevCoinBalanceOverride();
  return { balance: devBalance ?? balance, ownerKey, forceBalanceReconcile };
}

function formatCoins(value: number, lang: Lang): string {
  return formatCoinsForLang(value, lang);
}

export default function CoinRankScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const p = useV2Palette();
  const glass = useV2GlassStyle();
  // зачем (темы 2.0): без useMemo — токены зависят ещё от уровня цвета и оформления; поиск кэширован.
  const g = liquidGlassTokens(liquidGlassThemeId);
  const { balance, ownerKey, forceBalanceReconcile } = useCoinBalance();
  const {
    rankBinding,
    rank,
    next,
    isMaxRank,
    upgrading,
    upgrade,
    ceremony,
    dismissCeremony,
  } = useCoinRankUpgrade();
  const rankBindingRef = useRef(rankBinding);
  rankBindingRef.current = rankBinding;
  const reconciliationBlockedRef = useRef(false);
  const [balanceReconciling, setBalanceReconciling] = useState(false);
  const current = rank === null ? null : coinRankRowForDisplay(rank);
  const canUpgrade = isCoinRankUpgradeEligible({
    rank,
    balance,
    nextPrice: next?.priceToReach ?? null,
    upgrading,
    balanceReconciling: balanceReconciling || reconciliationBlockedRef.current,
  });

  useEffect(() => {
    reconciliationBlockedRef.current = false;
    setBalanceReconciling(false);
  }, [ownerKey]);

  // зачем (PM-128, эмулятор 01.10): раньше `lang === 'ru' ? … : English` — украинский,
  // португальский и остальные видели экран по-английски. Теперь все 9 языков интерфейса.
  // зачем: паритет с макетом coins.html PAY-01 — заголовок «Повысить ранг», тексты состояний дословно;
  // для языков без отдельного перевода берём английский (как в тостах ниже).
  // зачем (координатор 15.10, R54): у pt-BR/vi/id/tr/pl были английские подписи — теперь свой перевод для каждого из 9 языков.
  const tl = (ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string) => triLang(lang, {
    ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl,
  });
  // зачем (coins-005): карточки с кромкой GlassRim (светлая линия сверху + кольцо) — токены темы.
  const copy = useMemo(() => ({
    // зачем (владелец 11.10, журнал 35): видимая ссылка на отдельный экран каталога рангов.
    allRanks: triLang(lang, { ru: 'Все ранги', uk: 'Усі ранги', en: 'All ranks', es: 'Todos los rangos', 'pt-BR': 'Todos os ranks', vi: 'Tất cả hạng', id: 'Semua peringkat', tr: 'Tüm rütbeler', pl: 'Wszystkie rangi' }),
    close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }),
    title: triLang(lang, { ru: 'Повысить ранг', uk: 'Підвищити ранг', en: 'Upgrade rank', es: 'Subir de rango', 'pt-BR': 'Subir de rank', vi: 'Nâng hạng', id: 'Naik peringkat', tr: 'Rütbeyi yükselt', pl: 'Awansuj' }),
    rank: triLang(lang, { ru: 'Ранг', uk: 'Ранг', en: 'Rank', es: 'Rango', 'pt-BR': 'Rank', vi: 'Hạng', id: 'Peringkat', tr: 'Rütbe', pl: 'Ranga' }),
    balance: triLang(lang, { ru: 'Твой баланс', uk: 'Твій баланс', en: 'Your balance', es: 'Tu saldo', 'pt-BR': 'Seu saldo', vi: 'Số dư của bạn', id: 'Saldo kamu', tr: 'Bakiyen', pl: 'Twoje saldo' }),
    coins: triLang(lang, { ru: 'монет', uk: 'монет', en: 'coins', es: 'monedas', 'pt-BR': 'moedas', vi: 'xu', id: 'koin', tr: 'jeton', pl: 'monet' }),
    cost: triLang(lang, { ru: 'Стоимость повышения', uk: 'Вартість підвищення', en: 'Upgrade cost', es: 'Coste de la mejora', 'pt-BR': 'Custo da promoção', vi: 'Chi phí nâng hạng', id: 'Biaya naik peringkat', tr: 'Yükseltme bedeli', pl: 'Koszt awansu' }),
    costNote: tl('Монеты списываются один раз', 'Монети списуються один раз', 'Coins are charged once', 'Las monedas se descuentan una vez', 'As moedas são descontadas uma vez', 'Xu chỉ bị trừ một lần', 'Koin dipotong sekali', 'Jetonlar bir kez düşülür', 'Monety są pobierane jednorazowo'),
    upgrade: triLang(lang, { ru: 'Повысить ранг', uk: 'Підвищити ранг', en: 'Upgrade rank', es: 'Subir de rango', 'pt-BR': 'Subir de rank', vi: 'Nâng hạng', id: 'Naik peringkat', tr: 'Rütbeyi yükselt', pl: 'Awansuj' }),
    upgradeFor: tl('Повысить за', 'Підвищити за', 'Upgrade for', 'Subir por', 'Subir por', 'Nâng hạng với', 'Naik dengan', 'Yükselt:', 'Awansuj za'),
    ceremonyNote: tl('Церемония начнётся только после подтверждённого повышения.', 'Церемонія почнеться лише після підтвердженого підвищення.', 'The ceremony starts only after the upgrade is confirmed.', 'La ceremonia empieza solo tras confirmar la mejora.', 'A celebração começa só depois da promoção confirmada.', 'Lễ mừng chỉ bắt đầu sau khi nâng hạng được xác nhận.', 'Perayaan dimulai setelah kenaikan dikonfirmasi.', 'Kutlama ancak yükseltme onaylanınca başlar.', 'Świętowanie zacznie się dopiero po potwierdzeniu awansu.'),
    shortTitle: tl('Не хватает', 'Не вистачає', 'Missing', 'Faltan', 'Faltam', 'Còn thiếu', 'Kurang', 'Eksik:', 'Brakuje'),
    shortNote: tl('Продолжай практику. Покупка монет за деньги не предлагается.', 'Продовжуй практику. Купівля монет за гроші не пропонується.', 'Keep practicing. Buying coins for money is not offered.', 'Sigue practicando. No se ofrece comprar monedas con dinero.', 'Continue praticando. Não vendemos moedas por dinheiro.', 'Hãy tiếp tục luyện tập. Không bán xu bằng tiền.', 'Terus berlatih. Koin tidak dijual dengan uang.', 'Pratiğe devam et. Jeton parayla satılmaz.', 'Ćwicz dalej. Monet nie da się kupić za pieniądze.'),
    pendingTitle: tl('Проверяем повышение', 'Перевіряємо підвищення', 'Checking the upgrade', 'Comprobando la mejora', 'Verificando a promoção', 'Đang kiểm tra nâng hạng', 'Memeriksa kenaikan', 'Yükseltme kontrol ediliyor', 'Sprawdzamy awans'),
    pendingNote: tl('Не закрывай приложение. Повторный тап не создаёт новое списание.', 'Не закривай застосунок. Повторний дотик не створює нового списання.', 'Do not close the app. Tapping again will not charge twice.', 'No cierres la app. Volver a tocar no genera otro cargo.', 'Não feche o app. Tocar de novo não cobra outra vez.', 'Đừng đóng ứng dụng. Chạm lại sẽ không bị trừ lần nữa.', 'Jangan tutup aplikasi. Mengetuk lagi tidak memotong dua kali.', 'Uygulamayı kapatma. Tekrar dokunmak ikinci kez düşmez.', 'Nie zamykaj aplikacji. Ponowne dotknięcie nie pobierze drugi raz.'),
    pendingCta: tl('Повышение проверяется…', 'Підвищення перевіряється…', 'Upgrade is being checked…', 'Comprobando la mejora…', 'Verificando a promoção…', 'Đang kiểm tra nâng hạng…', 'Memeriksa kenaikan…', 'Yükseltme kontrol ediliyor…', 'Sprawdzamy awans…'),
    max: triLang(lang, { ru: 'Достигнут максимальный ранг', uk: 'Досягнуто максимального рангу', en: 'Maximum rank reached', es: 'Has alcanzado el rango máximo', 'pt-BR': 'Rank máximo alcançado', vi: 'Đã đạt hạng cao nhất', id: 'Peringkat maksimum tercapai', tr: 'En yüksek rütbeye ulaşıldı', pl: 'Osiągnięto najwyższą rangę' }),
  }), [lang]);

  // зачем (координатор 12.10, EN_READINESS): было `uk: ru` — украинцу 8 тостов повышения ранга показывались по-русски.
  // Сигнатура (type, ru, uk, en): украинский — свой текст; pt-BR/vi/id/tr/pl — английский запасной до решения после R1.
  const showToast = useCallback((
    type: 'success' | 'error' | 'info' | 'warning',
    ru: string,
    uk: string,
    en: string,
    es: string,
    ptBR: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => {
    // зачем (координатор 15.10, R54): тосты es/pt-BR/vi/id/tr/pl были английскими — у каждого языка свой текст.
    emitAppEvent('action_toast', actionToastTri(type, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl }));
  }, []);

  const handleUpgrade = useCallback(async () => {
    // зачем (Сверка chain21, coins-004: после тапа нет «Проверяем повышение»): каждый ранний выход называет причину — раньше выход был немым
    if (!canUpgrade || reconciliationBlockedRef.current) {
      DebugLogger.info('[COIN-RANK-UPGRADE]', `экран: тап отклонён до хука canUpgrade=${String(canUpgrade)} rank=${String(rank)} balance=${String(balance)} nextPrice=${String(next?.priceToReach ?? null)} upgrading=${String(upgrading)} reconciling=${String(balanceReconciling)} blocked=${String(reconciliationBlockedRef.current)}`);
      return;
    }
    if (!rankBinding) {
      DebugLogger.info('[COIN-RANK-UPGRADE]', 'экран: тап отклонён — нет привязки ранга к владельцу (rankBinding=null)');
      return;
    }
    const operationBinding = Object.freeze({
      ownerStableId: rankBinding.ownerStableId,
      accountGeneration: rankBinding.accountGeneration,
      rank: rankBinding.rank,
    });
    const operationStillCurrent = () => (
      isCoinRankOperationBindingCurrent(
        operationBinding,
        rankBindingRef.current,
        captureAccountGeneration(),
      )
    );
    if (!operationStillCurrent()) {
      const generation = captureAccountGeneration();
      DebugLogger.info('[COIN-RANK-UPGRADE]', `экран: тап отклонён — привязка ранга не текущая bindingGen=${String(rankBinding.accountGeneration)} gen=${String(generation.generation)} ownerMatch=${String(rankBinding.ownerStableId === generation.stableId)} phase=${String(generation.phase)}`);
      return;
    }
    DebugLogger.info('[COIN-RANK-UPGRADE]', `экран: тап принят rank=${String(rank)} balance=${String(balance)} → хук upgrade()`);
    const result = await upgrade();
    if (!operationStillCurrent()) return;
    if (result.ok) {
      if (result.status === 'upgraded') return;
      if (result.status === 'already_applied') {
        showToast('info', 'Ранг уже повышен. Баланс повторно не списан.', 'Ранг уже підвищено. Баланс повторно не списано.', 'Rank already upgraded. No second charge was made.', 'El rango ya se subió. No se cobró de nuevo.', 'O rank já foi promovido. Nada foi cobrado de novo.', 'Đã nâng hạng rồi. Không bị trừ lần nữa.', 'Peringkat sudah naik. Tidak ada potongan kedua.', 'Rütbe zaten yükseltildi. Jeton tekrar düşülmedi.', 'Ranga już podniesiona. Nie pobrano drugi raz.');
      }
      return;
    }
    switch (result.reason) {
      case 'insufficient_coins': {
        reconciliationBlockedRef.current = true;
        setBalanceReconciling(true);
        const quality = await forceBalanceReconcile();
        if (!operationStillCurrent()) return;
        if (quality === 'durable') {
          reconciliationBlockedRef.current = false;
          setBalanceReconciling(false);
          showToast('warning', 'Монет недостаточно. Баланс проверен и обновлён.', 'Монет недостатньо. Баланс перевірено й оновлено.', 'Not enough coins. Your balance was verified and refreshed.', 'No tienes suficientes monedas. Revisamos y actualizamos tu saldo.', 'Moedas insuficientes. Seu saldo foi verificado e atualizado.', 'Không đủ xu. Số dư đã được kiểm tra và cập nhật.', 'Koin tidak cukup. Saldo sudah dicek dan diperbarui.', 'Yeterli jeton yok. Bakiyen kontrol edilip güncellendi.', 'Za mało monet. Saldo sprawdzone i odświeżone.');
        } else {
          setBalanceReconciling(false);
          showToast('error', 'Не удалось подтвердить баланс. Повышение заблокировано.', 'Не вдалося підтвердити баланс. Підвищення заблоковано.', 'Could not verify the balance. Upgrading is disabled.', 'No pudimos comprobar tu saldo. La mejora está bloqueada.', 'Não foi possível verificar seu saldo. A promoção está bloqueada.', 'Không kiểm tra được số dư. Tạm khóa nâng hạng.', 'Saldo tidak bisa dicek. Kenaikan peringkat diblokir.', 'Bakiye doğrulanamadı. Yükseltme engellendi.', 'Nie udało się sprawdzić salda. Awans zablokowany.');
        }
        return;
      }
      case 'stale_rank':
        showToast('info', 'Ранг изменился. Данные на экране обновлены.', 'Ранг змінився. Дані на екрані оновлено.', 'Your rank changed. The screen has been refreshed.', 'Tu rango cambió. Actualizamos la pantalla.', 'Seu rank mudou. A tela foi atualizada.', 'Hạng đã thay đổi. Màn hình đã được cập nhật.', 'Peringkatmu berubah. Layar sudah diperbarui.', 'Rütben değişti. Ekran güncellendi.', 'Twoja ranga się zmieniła. Ekran odświeżony.');
        return;
      case 'max_rank':
        showToast('info', 'Максимальный ранг уже достигнут.', 'Максимального рангу вже досягнуто.', 'Maximum rank is already reached.', 'Ya alcanzaste el rango máximo.', 'Você já alcançou o rank máximo.', 'Bạn đã đạt hạng cao nhất.', 'Kamu sudah mencapai peringkat tertinggi.', 'En yüksek rütbeye zaten ulaştın.', 'Masz już najwyższą rangę.');
        return;
      case 'identity_changed':
        showToast('error', 'Аккаунт изменился. Повышение не выполнено.', 'Акаунт змінився. Підвищення не виконано.', 'The account changed. The upgrade was not performed.', 'La cuenta cambió. No se subió de rango.', 'A conta mudou. A promoção não foi feita.', 'Tài khoản đã thay đổi. Chưa nâng hạng.', 'Akun berubah. Peringkat tidak dinaikkan.', 'Hesap değişti. Yükseltme yapılmadı.', 'Konto się zmieniło. Awans nie został wykonany.');
        return;
      case 'invalid_rank':
      case 'state_corrupt':
        showToast('error', 'Данные ранга повреждены. Монеты не списаны.', 'Дані рангу пошкоджено. Монети не списано.', 'Rank data is invalid. No coins were charged.', 'Los datos del rango no son válidos. No se cobraron monedas.', 'Os dados do rank são inválidos. Nenhuma moeda foi cobrada.', 'Dữ liệu hạng không hợp lệ. Chưa trừ xu.', 'Data peringkat tidak valid. Koin tidak dipotong.', 'Rütbe bilgisi geçersiz. Jeton düşülmedi.', 'Dane rangi są błędne. Nie pobrano monet.');
        return;
      case 'failed':
        showToast('error', 'Не удалось повысить ранг. Монеты не списаны.', 'Не вдалося підвищити ранг. Монети не списано.', 'Could not upgrade the rank. No coins were charged.', 'No se pudo subir de rango. No se cobraron monedas.', 'Não foi possível subir de rank. Nenhuma moeda foi cobrada.', 'Không nâng hạng được. Chưa trừ xu.', 'Gagal naik peringkat. Koin tidak dipotong.', 'Rütbe yükseltilemedi. Jeton düşülmedi.', 'Nie udało się awansować. Nie pobrano monet.');
        return;
    }
  }, [balance, balanceReconciling, canUpgrade, forceBalanceReconcile, next, rank, rankBinding, showToast, upgrade, upgrading]);

  const goBack = useCallback(() => safeRouterBack(router), [router]);
  const missing = balance !== null && next ? Math.max(0, next.priceToReach - balance) : null;
  const pending = upgrading || balanceReconciling;
  // зачем: макет PAY-01 «недостаточно монет» — только когда баланс известен и реально меньше цены.
  const short = !pending && missing !== null && missing > 0;
  const ready = !pending && !short && canUpgrade;
  const ctaInFlow = pending || short; // зачем: см. комментарий у кнопки в прокрутке (coins-004)
  const ctaLabel = pending
    ? copy.pendingCta
    : rank === null || balance === null
      ? ' ' // зачем (владелец 01.10): без текста «Загружаем» — резерв высоты
      : isMaxRank
        ? copy.max
        : short
          ? copy.upgrade
          : `${copy.upgradeFor} ${formatCoins(next!.priceToReach, lang)}`;
  const visibleCeremony = isCoinRankCeremonyBindingCurrent(
    ceremony,
    rankBinding,
    captureAccountGeneration(),
  ) ? ceremony : null;
  // зачем (владелец 30.09: «анимация не запускается при изменении ранга») — временная трассировка:
  // церемония есть, но экран её прячет, пока показанный ранг не станет toRank. Печатаем, что решило.
  const ceremonyTraceKey = ceremony
    ? `${ceremony.fromRank}>${ceremony.toRank}|${rankBinding?.rank ?? 'null'}|${visibleCeremony ? 'show' : 'hide'}`
    : null;
  useEffect(() => {
    if (!ceremonyTraceKey || !ceremony) return;
    DebugLogger.info('[RANK-CEREMONY]', `экран: показывать ли ${JSON.stringify({
      ceremonyFrom: ceremony.fromRank,
      ceremonyTo: ceremony.toRank,
      displayedRank: rankBinding?.rank ?? null,
      sameOwner: rankBinding ? rankBinding.ownerStableId === ceremony.ownerStableId : null,
      sameGeneration: rankBinding ? rankBinding.accountGeneration === ceremony.accountGeneration : null,
      visible: visibleCeremony !== null,
    })}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremonyTraceKey]);

  return (
    <View style={[styles.root, { backgroundColor: g.bg }]}>
      {/* зачем (coins-002): общий фон 2.0 — почти чёрный bg с едва светлым верхом и свечениями темы; собственный градиент bgTop→bgBottom давал плоский тёмно-синий без виньетки. */}
      <V2Backdrop />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <V2Pressable
          testID="coin-rank-back"
          accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
          onPress={goBack}
          scaleTo={0.94}
          style={styles.backButton}
        >
          <BackGlyph size={21} color={p.text} />
        </V2Pressable>
      </View>
      {/* зачем (coins.html back()): «назад» голым шевроном, ниже крупный заголовок 34 слева — как кошелёк и профиль. */}
      <Text maxFontSizeMultiplier={1.15} accessibilityRole="header" style={[styles.headerTitle, { color: p.text }]}>{copy.title}</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false} decelerationRate="fast"
      >
        {/* зачем (coins.html PAY-01): две монеты со стрелкой «текущая → следующая», ниже «Лектор → Эксперт» и «Ранг 5 → 6».
            Решение владельца 05.10 (п. 7): сетки «Ранги монеты» на экране нет — каталог рангов открывается по тапу на ранг. */}
        <V2Pressable
          testID="coin-rank-open-catalog"
          accessibilityLabel={coinRankCatalogTitle(lang)}
          onPress={() => router.push('/coin_rank_catalog' as never)}
          scaleTo={0.97}
          style={styles.hero}
        >
          <View style={styles.coinsRow}>
            {current ? (
              <Image
                testID="coin-rank-current-asset"
                source={current.source}
                contentFit="contain"
                style={next ? styles.heroCoinFrom : styles.heroCoinSolo}
                accessible={false}
              />
            ) : (
              <View testID="coin-rank-loading-asset" style={[styles.heroPlaceholder, { backgroundColor: g.opaqueCard }]} />
            )}
            {next && current ? (
              <>
                <Ionicons name="arrow-forward" size={26} color={p.text} />
                <Image source={next.source} contentFit="contain" style={styles.heroCoinTo} accessible={false} />
              </>
            ) : null}
          </View>
          <Text testID="coin-rank-current-title" style={[styles.rankTitle, { color: p.text }]}>
            {current
              ? (next ? `${coinRankTitle(current.rank, lang)} → ${coinRankTitle(next.rank, lang)}` : coinRankTitle(current.rank, lang))
              : '—'}
          </Text>
          <Text style={[styles.rankMeta, { color: p.textSecondary }]}>
            {rank === null ? ' ' : next ? `${copy.rank} ${rank} → ${next.rank}` : `${copy.rank} ${rank}`}
          </Text>
        </V2Pressable>

        {next && current ? (
          <View style={[styles.card, glass]}>
            <V2GlassSheen seed={1} />
            <GlassRim radius={V2.radius.card} />
            <View style={styles.costRow}>
              <View style={styles.costCopy}>
                <Text style={[styles.costTitle, { color: p.text }]}>{copy.cost}</Text>
                <Text style={[styles.costNote, { color: p.textSecondary }]}>{copy.costNote}</Text>
              </View>
              <View style={[styles.pricePill, { backgroundColor: p.control }]}>
                <Image source={current.source} contentFit="contain" style={styles.priceCoin} accessible={false} />
                <Text testID="coin-rank-next-title" style={[styles.priceText, { color: p.text }]}>{formatCoins(next.priceToReach, lang)}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: p.divider }]} />
            <View style={styles.costRow}>
              {/* зачем (сверка coins-005, coins.html `.flex > .grow + .value`): подпись растягивается, значение прижато к правому краю */}
              <Text style={[styles.costTitle, styles.costTitleGrow, { color: p.text }]}>{copy.balance}</Text>
              <Text testID="coin-rank-balance" style={[styles.balanceValue, { color: p.textSecondary }]}>
                {balance === null ? '—' : formatCoins(balance, lang)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.card, glass]}>
            <V2GlassSheen seed={2} />
            <GlassRim radius={V2.radius.card} />
            <View style={styles.maxState}>
              <Ionicons name="checkmark-circle" size={30} color={p.iconTint} />
              <Text style={[styles.maxTitle, { color: p.text }]}>{rank === null ? ' ' : copy.max}</Text>
            </View>
          </View>
        )}

        {/* зачем (вердикты Макетов 7c831a193, coins-004; coins.html `upgrade()`): «Все ранги ›» идёт сразу за карточкой стоимости, плашки «Не хватает» / «Проверяем повышение» — ПОСЛЕ неё. */}
        {/* зачем (владелец 11.10, журнал 35): каталог рангов — отдельный экран, вход ИЗ «Повысить ранг» ссылкой «Все ранги». */}
        <V2Pressable
          testID="coin-rank-all-ranks"
          accessibilityRole="button"
          accessibilityLabel={copy.allRanks}
          onPress={() => router.push('/coin_rank_catalog' as never)}
          scaleTo={0.97}
          style={styles.allRanks}
        >
          <Text style={[styles.allRanksText, { color: p.text }]}>{copy.allRanks}</Text>
          <Ionicons name="chevron-forward" size={18} color={p.textSecondary} />
        </V2Pressable>
        {short ? (
          <View style={[styles.card, styles.statusCard, glass]}>
            <V2GlassSheen seed={3} />
            <GlassRim radius={V2.radius.card} />
            {/* зачем (сверка coins-005): в макете замок маленький серый у первой строки, а не крупный белый по центру */}
            <Ionicons name="lock-closed" size={18} color={p.textSecondary} style={styles.statusIcon} />
            <View style={styles.statusCopy}>
              <Text style={[styles.statusTitle, { color: p.text }]}>{`${copy.shortTitle} ${formatCoins(missing!, lang)} ${missingCoinsWord(lang, missing!)}`}</Text>
              <Text style={[styles.statusNote, { color: p.textSecondary }]}>{copy.shortNote}</Text>
            </View>
          </View>
        ) : null}
        {pending ? (
          <View style={[styles.card, styles.statusCard, glass]}>
            <V2GlassSheen seed={3} />
            <GlassRim radius={V2.radius.card} />
            {/* зачем (65в, coins.html №4): системный спиннер кита `.spin`, а не платформенный ActivityIndicator */}
            <KitSpinner testID="coin-rank-pending-spinner" />
            <View style={styles.statusCopy}>
              <Text style={[styles.statusTitle, { color: p.text }]}>{copy.pendingTitle}</Text>
              <Text style={[styles.statusNote, { color: p.textSecondary }]}>{copy.pendingNote}</Text>
            </View>
          </View>
        ) : null}
        {/* зачем (там же, coins.html: `<button class="cta dis" style="margin-top:16px">` сразу после плашки): в состояниях «не хватает» и «проверяем» кнопка стоит в потоке под плашкой,
            а не прижата к низу экрана; у готового повышения она по-прежнему внизу с подписью про церемонию (`fixed`). 12 — промежуток прокрутки, +4 до образцовых 16. */}
        {ctaInFlow ? (
          <V2Pressable
            testID="coin-rank-upgrade"
            accessibilityLabel={ctaLabel}
            disabled={!canUpgrade}
            onPress={handleUpgrade}
            scaleTo={0.97}
            style={[styles.cta, { marginTop: 4, backgroundColor: canUpgrade ? g.cta : g.buttonFill }]}
          >
            <Text style={[styles.ctaText, { color: canUpgrade ? g.ctaInk : g.mutedText }]}>{ctaLabel}</Text>
          </V2Pressable>
        ) : null}

      </ScrollView>

      {ctaInFlow ? null : (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 18, backgroundColor: g.bgBottom }]}>
          <V2Pressable
            testID="coin-rank-upgrade"
            accessibilityLabel={ctaLabel}
            disabled={!canUpgrade}
            onPress={handleUpgrade}
            scaleTo={0.97}
            style={[
              styles.cta,
              { backgroundColor: canUpgrade ? g.cta : g.buttonFill },
            ]}
          >
            <Text style={[styles.ctaText, { color: canUpgrade ? g.ctaInk : g.mutedText }]}>{ctaLabel}</Text>
          </V2Pressable>
          {ready ? <Text style={[styles.footNote, { color: p.textSecondary }]}>{copy.ceremonyNote}</Text> : null}
        </View>
      )}

      <CoinRankUpgradeCeremony ceremony={visibleCeremony} onDone={dismissCeremony} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // зачем (`.topbar` 44 + `.rb.bare` + `.screen-title`): голый шеврон 48×44, заголовок 34/40 слева на 10 ниже.
  header: { minHeight: 44, paddingHorizontal: V2.screenPad, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: 10, paddingHorizontal: V2.screenPad },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: V2.screenPad, paddingTop: 8, paddingBottom: 24, gap: V2.gap },
  // зачем (coins.html): герой 24 под заголовком (16 + 8 у прокрутки), карточка 28 ниже (16 + промежуток 12).
  hero: { alignItems: 'center', paddingTop: 16, paddingBottom: 16 },
  catalogTitle: { fontSize: 20, lineHeight: 25, fontWeight: '700', marginBottom: 14 },
  coinsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  heroCoinFrom: { width: 88, height: 88 },
  heroCoinTo: { width: 104, height: 104 },
  heroCoinSolo: { width: 112, height: 112 },
  heroPlaceholder: { width: 88, height: 88, borderRadius: 44 },
  rankTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', marginTop: 18, textAlign: 'center' },
  rankMeta: { ...V2_TYPE.body, marginTop: 2, textAlign: 'center' },
  card: { borderRadius: V2.radius.card, padding: 18 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  costCopy: { flex: 1, minWidth: 0 },
  costTitle: { ...V2_TYPE.headline },
  costTitleGrow: { flex: 1, minWidth: 0 },
  costNote: { ...V2_TYPE.subtitle, marginTop: 4 },
  pricePill: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 35, paddingHorizontal: 14, borderRadius: 18 },
  priceCoin: { width: 20, height: 20 },
  priceText: { ...V2_TYPE.headline, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  // `.value`: вторичный тон; макет 14; шкала D145 (16/13) главнее макета.
  balanceValue: { fontSize: 13,
    lineHeight: 18, textAlign: 'right', fontVariant: ['tabular-nums'] },
  // зачем (65в): `.status-card` макета — отступы 14/16, заголовок 15 жирный, текст 14/20 (общий для «Не хватает…» и «Проверяем…»).
  statusCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  statusIcon: { marginTop: 2 },
  statusCopy: { flex: 1, minWidth: 0 },
  statusTitle: { fontSize: 16,
    lineHeight: 20, fontWeight: '700' },
  statusNote: { fontSize: 13,
    lineHeight: 20, marginTop: 2 },
  maxState: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 12 },
  maxTitle: { ...V2_TYPE.headline, textAlign: 'center' },
  footer: { paddingHorizontal: V2.screenPad, paddingTop: 12 },
  allRanks: { minHeight: 48, marginTop: 8, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  allRanksText: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  cta: {
    minHeight: V2.cta.height,
    borderRadius: V2.cta.radius,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: { ...V2_TYPE.headline, textAlign: 'center' },
  footNote: { ...V2_TYPE.subtitle, textAlign: 'center', marginTop: 10 },
});


import BackGlyph from '../components/v2/BackGlyph';