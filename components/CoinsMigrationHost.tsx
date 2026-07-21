/**
 * CoinsMigrationHost — одноразовый модал РЕАЛЬНОЙ миграции «Осколки → Монеты».
 *
 * Конверсия серверная: 20 осколков = 1 монета (округление вверх, мин. 1 при
 * балансе > 0). Как только арбитр отдаёт слот, модал сразу вызывает callable
 * claimCoinMigration() — анимация затем играет РЕАЛЬНЫМИ числами ответа
 * (shardsBefore → 0 слева, 0 → coinsGranted справа). Флаг seen ставится только
 * после успешного claim: при офлайне/незадеплоенном callable внутри модала
 * показывается retry-состояние, и модал вернётся при следующем запуске.
 * alreadyMigrated=true (редкий ретрай) трактуем как успех — финальное состояние.
 *
 * Режимы:
 *  - auto  — одноразовый автотриггер (онбординг + unseen + баланс > 0);
 *  - demo  — тестерское превью: анимация на демо-числах (1 250 → 63), БЕЗ сервера
 *            и БЕЗ seen-флага;
 *  - run   — тестерская реальная конвертация «прямо сейчас» (seen ставится).
 *
 * Анимация однократная ~1.8с, Reanimated; reduced-motion → финальное состояние.
 * Модал размонтируется при закрытии — таймеров/циклов в фоне не остаётся.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  useReducedMotion,
  withTiming,
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { useOverlayVisible } from './OverlayArbiter';
import { onAppEvent } from '../app/events';
import { triLang, type Lang } from '../constants/i18n';
import { loadShardsFromCloud } from '../app/shards_system';
import { coinIconForBalance } from '../app/coin_icons';
import { getThemedShardIcon } from '../constants/levelGiftRewardIcons';
import {
  claimCoinMigration,
  demoCoinsForShards,
  markCoinsMigrationModalSeen,
  shouldShowCoinsMigrationModal,
  type CoinMigrationClaimResult,
} from '../app/coins_migration_modal';

const ANIMATION_MS = 1800;
/** Демо-числа для тестерского превью (без сервера): 1 250 осколков → 63 монеты. */
const PREVIEW_DEMO_BALANCE = 1250;

type MigrationMode = 'auto' | 'demo' | 'run';
type MigrationPhase = 'loading' | 'ready' | 'error';

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

/** RU-плюрализация «N осколков» в строке поздравления. */
function ruShardsWord(n: number): string {
  const k = Math.abs(n) % 100;
  const d = Math.abs(n) % 10;
  if (d === 1 && k !== 11) return 'осколок';
  if (d >= 2 && d <= 4 && (k < 12 || k > 14)) return 'осколка';
  return 'осколков';
}

export default function CoinsMigrationHost() {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);
  const reduceMotion = useReducedMotion();

  const [wantShow, setWantShow] = useState(false);
  const [mode, setMode] = useState<MigrationMode>('auto');
  const [phase, setPhase] = useState<MigrationPhase>('loading');
  const [result, setResult] = useState<CoinMigrationClaimResult | null>(null);
  const visible = useOverlayVisible('coinsMigration', wantShow);
  const claimStartedRef = useRef(false);
  const seenMarkedRef = useRef(false);

  // Одноразовый автотриггер при старте приложения.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!(await shouldShowCoinsMigrationModal())) return;
      if (alive) {
        setMode('auto');
        setPhase('loading');
        setWantShow(true);
      }
    })().catch(() => {});
    return () => { alive = false; };
  }, []);

  // Тестерское превью: демо-анимация БЕЗ сервера и БЕЗ seen-флага.
  useEffect(() => {
    const sub = onAppEvent('coins_migration_preview', (payload) => {
      const demo = Math.max(1, Math.floor(
        (payload as { demoBalance?: number } | undefined)?.demoBalance ?? PREVIEW_DEMO_BALANCE,
      ));
      claimStartedRef.current = false;
      setResult({
        alreadyMigrated: false,
        shardsBefore: demo,
        coinsGranted: demoCoinsForShards(demo),
        newBalance: demoCoinsForShards(demo),
      });
      setMode('demo');
      setPhase('ready');
      setWantShow(true);
    });
    return () => sub.remove();
  }, []);

  // Тестерский запуск реальной конверсии (seen-флаг ставится после успеха).
  useEffect(() => {
    const sub = onAppEvent('coins_migration_run', () => {
      claimStartedRef.current = false;
      setResult(null);
      setMode('run');
      setPhase('loading');
      setWantShow(true);
    });
    return () => sub.remove();
  }, []);

  // Серверный claim — как только модал получил слот (auto/run; demo — без сервера).
  const runClaim = useCallback(async () => {
    setPhase('loading');
    const claim = await claimCoinMigration();
    if (claim === null) {
      // Офлайн / callable ещё не задеплоен: retry-состояние, seen НЕ ставим.
      setPhase('error');
      return;
    }
    setResult(claim);
    setPhase('ready');
    // Обновляем локальный баланс из облака — пилюля кошелька покажет newBalance.
    void loadShardsFromCloud().catch(() => {});
    if (!seenMarkedRef.current) {
      seenMarkedRef.current = true;
      void markCoinsMigrationModalSeen();
    }
  }, []);

  useEffect(() => {
    if (!visible || mode === 'demo' || claimStartedRef.current) return;
    claimStartedRef.current = true;
    void runClaim();
  }, [visible, mode, runClaim]);

  // ── Анимация конверсии: один прогон 0→1 за ~1.8с, когда данные готовы. ───────
  const shardsBefore = result?.shardsBefore ?? 0;
  const coinsGranted = result?.coinsGranted ?? 0;
  const skipAnimation = reduceMotion || result?.alreadyMigrated === true;

  const progress = useSharedValue(skipAnimation ? 1 : 0);
  const [leftCount, setLeftCount] = useState(skipAnimation ? 0 : shardsBefore);
  const [rightCount, setRightCount] = useState(skipAnimation ? coinsGranted : 0);

  useEffect(() => {
    if (!visible || phase !== 'ready' || !result) return;
    if (skipAnimation) {
      progress.value = 1;
      setLeftCount(0);
      setRightCount(coinsGranted);
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: ANIMATION_MS, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, phase, shardsBefore, coinsGranted, skipAnimation]);

  useAnimatedReaction(
    () => progress.value,
    (p, prev) => {
      if (p === prev) return;
      runOnJS(setLeftCount)(Math.round(shardsBefore * (1 - p)));
      runOnJS(setRightCount)(Math.round(coinsGranted * p));
    },
    [shardsBefore, coinsGranted],
  );

  const sliderFillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 100)}%`,
  }));

  if (!visible) return null;

  const title = L(
    'Ты молодец!', 'Ти молодець!', '¡Lo lograste!', 'Você arrasou!',
    'Bạn giỏi lắm!', 'Kamu hebat!', 'Harikasın!', 'Świetna robota!',
  );
  const explanation = L(
    'Осколки становятся Монетами — новой, очень ценной валютой Phraseman. Её нельзя нафармить: монеты только покупаются, поэтому твой баланс особенно ценен.',
    'Уламки стають Монетами — новою, дуже цінною валютою Phraseman. Її не можна нафармити: монети лише купуються, тому твій баланс особливо цінний.',
    'Los fragmentos se convierten en Monedas, la nueva y valiosa moneda de Phraseman. No se puede farmear: solo se compra, así que tu saldo vale mucho.',
    'Os fragmentos viram Moedas — a nova e valiosa moeda do Phraseman. Não dá para farmar: moedas só se compra, então seu saldo é muito valioso.',
    'Mảnh trở thành Xu — loại tiền mới, rất quý giá của Phraseman. Không thể cày được: xu chỉ mua được, nên số dư của bạn rất đáng quý.',
    'Shard menjadi Koin — mata uang baru yang sangat berharga di Phraseman. Tidak bisa difarm: koin hanya bisa dibeli, jadi saldomu sangat berharga.',
    'Parçalar, Phraseman\'ın yeni ve çok değerli para birimi Jetonlara dönüşüyor. Farm yapılamaz: jeton yalnızca satın alınır, bu yüzden bakiyen çok değerli.',
    'Odłamki stają się Monetami — nową, bardzo cenną walutą Phraseman. Nie da się ich nafarmić: monety można tylko kupić, więc twoje saldo jest bardzo cenne.',
  );
  const rateLine = L(
    'Курс обмена: 20 осколков = 1 монета (округляем в твою пользу).',
    'Курс обміну: 20 уламків = 1 монета (заокруглюємо на твою користь).',
    'Cambio: 20 fragmentos = 1 moneda (redondeamos a tu favor).',
    'Câmbio: 20 fragmentos = 1 moeda (arredondamos a seu favor).',
    'Tỷ giá: 20 mảnh = 1 xu (làm tròn có lợi cho bạn).',
    'Kurs: 20 shard = 1 koin (dibulatkan untukmu).',
    'Kur: 20 parça = 1 jeton (senin lehine yuvarlanır).',
    'Kurs: 20 odłamków = 1 moneta (zaokrąglamy na twoją korzyść).',
  );
  const loadingLine = L(
    'Считаем твой переход на монеты…', 'Рахуємо твій перехід на монети…', 'Calculando tu cambio a monedas…', 'Calculando sua mudança para moedas…',
    'Đang tính việc chuyển sang xu…', 'Menghitung konversimu ke koin…', 'Jetona geçişin hesaplanıyor…', 'Liczenie twojej wymiany na monety…',
  );
  const errorLine = L(
    'Не получилось выполнить обмен — проверь интернет. Ничего не потерялось: попробуем ещё раз сейчас или при следующем запуске.',
    'Не вдалося виконати обмін — перевір інтернет. Нічого не втрачено: спробуємо ще раз зараз або при наступному запуску.',
    'No se pudo completar el cambio: revisa tu conexión. No se perdió nada: reintenta ahora o en el próximo inicio.',
    'Não foi possível concluir o câmbio — verifique a internet. Nada foi perdido: tente agora ou na próxima abertura.',
    'Không thể đổi — hãy kiểm tra mạng. Không mất gì: thử lại ngay hoặc lần mở sau.',
    'Konversi gagal — periksa internet. Tidak ada yang hilang: coba lagi sekarang atau saat buka berikutnya.',
    'Dönüşüm yapılamadı — interneti kontrol et. Hiçbir şey kaybolmadı: şimdi ya da bir sonraki açılışta tekrar dene.',
    'Nie udało się wymienić — sprawdź internet. Nic nie przepadło: spróbuj teraz albo przy następnym uruchomieniu.',
  );
  const retryCta = L('Повторить', 'Повторити', 'Reintentar', 'Tentar de novo', 'Thử lại', 'Coba lagi', 'Tekrar dene', 'Spróbuj ponownie');
  const cta = L(
    'Забрать монеты', 'Забрати монети', 'Recoger monedas', 'Pegar moedas',
    'Nhận xu', 'Ambil koin', 'Jetonları al', 'Odbierz monety',
  );
  const closeA11y = L(
    'Забрать монеты и закрыть', 'Забрати монети й закрити', 'Recoger monedas y cerrar', 'Pegar moedas e fechar',
    'Nhận xu và đóng', 'Ambil koin dan tutup', 'Jetonları al ve kapat', 'Odbierz monety i zamknij',
  );

  const renderResult = () => {
    if (!result) return null;
    const newBalance = result.newBalance;
    const accumulated = L(
      `Ты накопил ${result.shardsBefore} ${ruShardsWord(result.shardsBefore)}`,
      `Ти накопичив ${result.shardsBefore} уламків`,
      `Acumulaste ${result.shardsBefore} fragmentos`,
      `Você juntou ${result.shardsBefore} fragmentos`,
      `Bạn đã tích lũy ${result.shardsBefore} mảnh`,
      `Kamu mengumpulkan ${result.shardsBefore} shard`,
      `${result.shardsBefore} parça biriktirdin`,
      `Uzbierałeś ${result.shardsBefore} odłamków`,
    );
    const resultLine = L(
      `Твой баланс: ${newBalance} монет`,
      `Твій баланс: ${newBalance} монет`,
      `Tu saldo: ${newBalance} monedas`,
      `Seu saldo: ${newBalance} moedas`,
      `Số dư của bạn: ${newBalance} xu`,
      `Saldomu: ${newBalance} koin`,
      `Bakiyen: ${newBalance} jeton`,
      `Twoje saldo: ${newBalance} monet`,
    );
    const balanceA11y = L(
      `Конверсия завершена. Твой баланс: ${newBalance} монет`,
      `Конверсія завершена. Твій баланс: ${newBalance} монет`,
      `Conversión completada. Tu saldo: ${newBalance} monedas`,
      `Conversão concluída. Seu saldo: ${newBalance} moedas`,
      `Đã chuyển xong. Số dư của bạn: ${newBalance} xu`,
      `Konversi selesai. Saldomu: ${newBalance} koin`,
      `Dönüşüm tamamlandı. Bakiyen: ${newBalance} jeton`,
      `Wymiana zakończona. Twoje saldo: ${newBalance} monet`,
    );
    return (
      <View accessibilityLabel={balanceA11y}>
        <Text style={{ color: t.accent, fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 6 }}>
          {accumulated}
        </Text>
        <Text style={{ color: t.textSecond, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 12 }}>
          {explanation}
        </Text>
        <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 10 }}>
          {rateLine}
        </Text>

        {/* Анимация конверсии: осколок → ползунок → монета (реальные числа сервера) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 }}>
          <View style={{ alignItems: 'center', width: 64 }}>
            <Image
              source={getThemedShardIcon(themeMode)}
              style={{ width: 44, height: 44, opacity: leftCount > 0 ? 1 : 0.35 }}
              contentFit="contain"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={{ color: t.textMuted, fontSize: 15, fontWeight: '800', marginTop: 4 }} accessibilityElementsHidden importantForAccessibility="no">
              {leftCount}
            </Text>
          </View>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: t.bgSurface, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no">
            <Reanimated.View style={[{ height: 8, borderRadius: 4, backgroundColor: t.accent }, sliderFillStyle]} />
          </View>
          <View style={{ alignItems: 'center', width: 64 }}>
            <Image
              source={coinIconForBalance(newBalance)}
              style={{ width: 44, height: 44 }}
              contentFit="contain"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={{ color: t.accent, fontSize: 15, fontWeight: '900', marginTop: 4 }} accessibilityElementsHidden importantForAccessibility="no">
              {rightCount}
            </Text>
          </View>
        </View>

        <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '900', textAlign: 'center', marginTop: 16 }}>
          {resultLine}
        </Text>

        <Pressable
          onPress={() => setWantShow(false)}
          accessibilityRole="button"
          accessibilityLabel={closeA11y}
          style={({ pressed }) => ({
            marginTop: 18,
            borderRadius: 14,
            backgroundColor: t.accent,
            alignItems: 'center',
            paddingVertical: 14,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          {/* Контрастное правило: на лаймовой заливке — тёмный текст, никогда белый. */}
          <Text style={{ color: '#07110A', fontSize: 16, fontWeight: '900' }}>{cta}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setWantShow(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: t.bgCard,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: t.border,
            padding: 22,
          }}
        >
          <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '900', textAlign: 'center' }}>{title}</Text>

          {/* Финальная геометрия карточки сохраняется во всех фазах — без прыжков. */}
          {phase === 'loading' ? (
            <View style={{ minHeight: 150, justifyContent: 'center' }}>
              <Text style={{ color: t.textMuted, fontSize: 14, textAlign: 'center' }} accessibilityLiveRegion="polite">
                {loadingLine}
              </Text>
            </View>
          ) : phase === 'error' ? (
            <View style={{ minHeight: 150, justifyContent: 'center' }}>
              <Text style={{ color: t.textSecond, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
                {errorLine}
              </Text>
              <Pressable
                onPress={() => { void runClaim(); }}
                accessibilityRole="button"
                accessibilityLabel={retryCta}
                style={({ pressed }) => ({
                  marginTop: 16,
                  borderRadius: 14,
                  backgroundColor: t.accent,
                  alignItems: 'center',
                  paddingVertical: 14,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: '#07110A', fontSize: 16, fontWeight: '900' }}>{retryCta}</Text>
              </Pressable>
              <Pressable
                onPress={() => setWantShow(false)}
                accessibilityRole="button"
                style={({ pressed }) => ({ marginTop: 10, alignItems: 'center', paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ color: t.textMuted, fontSize: 14, fontWeight: '700' }}>
                  {L('Позже', 'Пізніше', 'Más tarde', 'Mais tarde', 'Để sau', 'Nanti', 'Sonra', 'Później')}
                </Text>
              </Pressable>
            </View>
          ) : (
            renderResult()
          )}
        </View>
      </View>
    </Modal>
  );
}
