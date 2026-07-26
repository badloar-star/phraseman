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
import { ruKnowledgeShardsAfterNumber, ukKnowledgeShardsAfterNumber } from '../constants/shard_plurals';
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

/** RU-плюрализация «N жемчужин» в строке поздравления.
 * зачем: единая валюта — жемчуг; переиспользуем общий словарь, чтобы формы
 * не разъезжались между экранами (constants/shard_plurals.ts — источник истины). */
const ruShardsWord = ruKnowledgeShardsAfterNumber;

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
    'Осколки становятся Жемчугом — новой, очень ценной валютой Phraseman. Его нельзя нафармить: жемчуг только покупается, поэтому твой баланс особенно ценен.',
    'Уламки стають Перлинами — новою, дуже цінною валютою Phraseman. Їх не можна нафармити: перлини лише купуються, тому твій баланс особливо цінний.',
    'Los fragmentos se convierten en Perlas, la nueva y valiosa moneda de Phraseman. No se puede farmear: solo se compra, así que tu saldo vale mucho.',
    'Os fragmentos viram Pérolas — a nova e valiosa moeda do Phraseman. Não dá para farmar: pérolas só se compra, então seu saldo é muito valioso.',
    'Mảnh trở thành Ngọc trai — loại tiền mới, rất quý giá của Phraseman. Không thể cày được: ngọc trai chỉ mua được, nên số dư của bạn rất đáng quý.',
    'Shard menjadi Mutiara — mata uang baru yang sangat berharga di Phraseman. Tidak bisa difarm: mutiara hanya bisa dibeli, jadi saldomu sangat berharga.',
    'Parçalar, Phraseman\'ın yeni ve çok değerli para birimi İncilere dönüşüyor. Farm yapılamaz: inci yalnızca satın alınır, bu yüzden bakiyen çok değerli.',
    'Odłamki stają się Perłami — nową, bardzo cenną walutą Phraseman. Nie da się ich nafarmić: perły można tylko kupić, więc twoje saldo jest bardzo cenne.',
  );
  // зачем: единая валюта — ЖЕМЧУГ. RU/UK уже перевели, остальные 6 языков остались
  // на «Монеты/Xu/Koin/Jeton», а строка курса на всех 8 обещала «1 монету» —
  // игрок видел валюту, которой в приложении нет. Курс 20:1 не менялся.
  const rateLine = L(
    'Курс обмена: 20 осколков = 1 жемчужина (округляем в твою пользу).',
    'Курс обміну: 20 уламків = 1 перлина (заокруглюємо на твою користь).',
    'Cambio: 20 fragmentos = 1 perla (redondeamos a tu favor).',
    'Câmbio: 20 fragmentos = 1 pérola (arredondamos a seu favor).',
    'Tỷ giá: 20 mảnh = 1 ngọc trai (làm tròn có lợi cho bạn).',
    'Kurs: 20 shard = 1 mutiara (dibulatkan untukmu).',
    'Kur: 20 parça = 1 inci (senin lehine yuvarlanır).',
    'Kurs: 20 odłamków = 1 perła (zaokrąglamy na twoją korzyść).',
  );
  const loadingLine = L(
    'Считаем твой переход на жемчуг…', 'Рахуємо твій перехід на перлини…', 'Calculando tu cambio a perlas…', 'Calculando sua mudança para pérolas…',
    'Đang tính việc chuyển sang ngọc trai…', 'Menghitung konversimu ke mutiara…', 'İnciye geçişin hesaplanıyor…', 'Liczenie twojej wymiany na perły…',
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
    'Забрать жемчуг', 'Забрати перлини', 'Recoger perlas', 'Pegar pérolas',
    'Nhận ngọc trai', 'Ambil mutiara', 'İncileri al', 'Odbierz perły',
  );
  const closeA11y = L(
    'Забрать жемчуг и закрыть', 'Забрати перлини й закрити', 'Recoger perlas y cerrar', 'Pegar pérolas e fechar',
    'Nhận ngọc trai và đóng', 'Ambil mutiara dan tutup', 'İncileri al ve kapat', 'Odbierz perły i zamknij',
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
    // зачем: баланс после обмена — главное число модалки; 6 из 8 языков называли
    // его «монетами/xu/koin/jeton», валютой, которой в приложении нет. Склонения
    // RU/UK берём из общего словаря, чтобы не выходило «1 жемчужин»/«1 перлин».
    const resultLine = L(
      `Твой баланс: ${newBalance} ${ruShardsWord(newBalance)}`,
      `Твій баланс: ${newBalance} ${ukKnowledgeShardsAfterNumber(newBalance)}`,
      `Tu saldo: ${newBalance} perlas`,
      `Seu saldo: ${newBalance} pérolas`,
      `Số dư của bạn: ${newBalance} ngọc trai`,
      `Saldomu: ${newBalance} mutiara`,
      `Bakiyen: ${newBalance} inci`,
      `Twoje saldo: ${newBalance} pereł`,
    );
    const balanceA11y = L(
      `Конверсия завершена. Твой баланс: ${newBalance} ${ruShardsWord(newBalance)}`,
      `Конверсія завершена. Твій баланс: ${newBalance} ${ukKnowledgeShardsAfterNumber(newBalance)}`,
      `Conversión completada. Tu saldo: ${newBalance} perlas`,
      `Conversão concluída. Seu saldo: ${newBalance} pérolas`,
      `Đã chuyển xong. Số dư của bạn: ${newBalance} ngọc trai`,
      `Konversi selesai. Saldomu: ${newBalance} mutiara`,
      `Dönüşüm tamamlandı. Bakiyen: ${newBalance} inci`,
      `Wymiana zakończona. Twoje saldo: ${newBalance} pereł`,
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
              source={coinIconForBalance(newBalance, themeMode)}
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
